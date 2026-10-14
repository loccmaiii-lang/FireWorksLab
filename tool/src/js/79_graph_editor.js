/* 独立候选编辑；不会覆盖正式库或工坊工程。 */
let graphSelected=0,graphPreset='rocket',graphSolo=null;
function graphOpen(key,restore=false){
 const entryId=key==='rocket'?'SGR1':'SGS1',entry=(typeof FW_REVIEW_LIST!=='undefined'?FW_REVIEW_LIST:[]).find(x=>x.id===entryId);
 if(entry&&typeof openReview==='function')openReview(entry);
 graphPreset=key;graphSolo=null;const d=defaultsFor('sparkgraph');state.tab='master';state.P=derive({...d.P,type:'sparkgraph',form:'loop',sparkGraph:structuredClone(GRAPH_PRESETS[key]),...GRAPH_TYPE_P,graphSolo:null});
 if(entry){const v=replicaPM(entryId);state.P=v.P;state.M=v.M;}else state.M={...d.M,...structuredClone(GRAPH_TYPE_M)};
 if(restore){const saved=localStorage.getItem('fwl.sparkgraph.'+key);if(saved){try{const v=JSON.parse(saved);SparkGraph.validate(v.P.sparkGraph);state.P=v.P;state.P.type='sparkgraph';state.M=v.M;}catch(err){console.warn('候选存档无效，保留原存档并打开模板：',err.message);}}}
 state.name=key==='rocket'?'RocketTail_Graph':'Sparkler_Graph';state.repId=entry?entryId:null;state.t=0;graphSelected=0;buildMasterPanel();onParam();if(typeof syncStageTabs==='function')syncStageTabs();
 /* 4.9.86：不再关掉并记住「自动烘焙」、不再强切实时模拟、不再取消打开时的烘焙（那样「改过」、撤销、草稿都等不到烘焙稳定，一直不工作） */
}
function graphEdit(mut){const before=structuredClone({P:state.P,M:state.M});try{mut();SparkGraph.validate(state.P.sparkGraph);CameraImaging.validate(state.P);state.P.loopT=state.P.duration=state.P.sparkGraph.period;onParam();document.getElementById('graphStatus').textContent='参数已改；烘焙后检查引擎回放';return true;}catch(e){state.P=before.P;state.M=before.M;buildGraphPanel();document.getElementById('graphStatus').textContent=e.message;return false;} }
function buildGraphPanel(){
 panelSharedHome();panelRows=[];const host=document.getElementById('params');host.replaceChildren();if(!state.P.sparkGraph)return;
 const r=state.P.sparkGraph;graphSelected=Math.min(graphSelected,r.emitters.length-1);const e=r.emitters[graphSelected],wrap=document.createElement('div');wrap.style.cssText='padding:12px;display:grid;gap:9px';host.append(wrap);
 const title=document.createElement('b');title.textContent=r.name;wrap.append(title);
 const status=document.createElement('p');status.id='graphStatus';status.textContent='制作候选 · '+r.emitters.length+'层 · 未经UE验证';status.style.cssText='color:#afc5be;font-size:12px';wrap.append(status);
 const save=document.createElement('button');save.textContent='保存当前候选';save.onclick=()=>{try{const key=state.P.sparkGraph.presetKey||graphPreset;localStorage.setItem('fwl.sparkgraph.'+key,JSON.stringify({P:state.P,M:state.M}));status.textContent='已保存；再次点左上候选入口恢复';localStorage.setItem('fwl.sparkgraph.active',key);}catch(err){status.textContent='保存失败：'+err.message;}};wrap.append(save);
 buildCameraPanel(wrap);
 const sel=document.createElement('select');sel.setAttribute('aria-label','选择粒子层');r.emitters.forEach((x,i)=>{const o=new Option(x.name,i);sel.add(o);});sel.value=graphSelected;sel.onchange=()=>{graphSelected=+sel.value;buildGraphPanel();};wrap.append(sel);
 const row=(label,input)=>{const l=document.createElement('label');l.style.cssText='display:grid;grid-template-columns:1fr 125px;gap:6px;align-items:center;min-height:31px';const t=document.createElement('span');t.textContent=label;l.append(t,input);wrap.append(l);};
 const number=(label,obj,key,min=0,step=.01)=>{const input=document.createElement('input');input.type='number';input.value=Number(obj[key].toFixed?obj[key].toFixed(6):obj[key]);input.min=min;input.step=step;input.setAttribute('aria-label',label);input.onchange=()=>graphEdit(()=>{const v=+input.value;if(!Number.isFinite(v)||v<min)throw Error(label+'数值无效');obj[key]=v;});row(label,input);};
 const check=document.createElement('input');check.type='checkbox';check.checked=e.enabled;check.onchange=()=>graphEdit(()=>e.enabled=check.checked);row('显示这层（子粒仍生成）',check);
 const choice=(label,obj,key,options)=>{const input=document.createElement('select');for(const [v,n]of options)input.add(new Option(n,v));input.value=obj[key];input.setAttribute('aria-label',label);input.onchange=()=>{if(graphEdit(()=>obj[key]=input.value))buildGraphPanel();};row(label,input);};
 choice('粒子形态',e,'shape',[['line','运动拉丝'],['point','柔亮点'],['fragment','不规则碎片']]);
 const solo=document.createElement('button');solo.type='button';solo.textContent=graphSolo?'恢复全部形态':'只看这一层';solo.onclick=()=>{graphSolo=graphSolo?null:e.id;buildGraphPanel();};wrap.append(solo);
 const note=document.createElement('small');note.textContent=e.parent?'母粒：'+r.emitters.find(x=>x.id===e.parent).name+'；位置与速度在分叉瞬间继承。':'独立出生；底量、成簇与偶发爆发叠加。';wrap.append(note);
 if(!e.parent)number('每周期粒子数',e,'count',0,10);number('随机种子',e,'seed',0,1);
 for(const [k,n,u]of [['speed','速度','m/s'],['life','寿命','s'],['size','大小倍率','×'],['power','亮度倍率','×']]){
  number(n+'下限 '+u,e[k],0,0,.001);number(n+'上限 '+u,e[k],1,.001,.001);number(n+'分布偏向',e[k],2,.01,.1);
 }
 number('粒子直径 m',e,'width',.000001,.00001);number('亮度',e,'gain',0,.05);
 if(e.shape==='line'&&!state.P.cameraMotion&&!state.P.cameraDof){number('历史线长时间 s',e,'history',0,.001);number('尾端粗细比例',e,'taper',0,.01);}
 number('线性阻力 1/s',e,'drag',0,.1);for(let i=0;i<3;i++)number(['横向','纵深','竖直'][i]+'加速度 m/s²',e.gravity,i,-100,.1);
 choice('喷射方向',e,'directionMode',[['sphere','球形散射'],['cone','锥形喷射']]);
 if(e.directionMode==='cone'){number('喷射锥角 °',e,'cone',0,1);for(let i=0;i<3;i++)number('方向 '+['X','Y','Z'][i],e.direction,i,-100,.1);}
 if(!e.parent)number('出生半径 m',e,'extent',0,.001);
 if(e.shape!=='line'){number('形态长宽比',e,'aspect',1,.1);number('自转 °/s',e,'spin',-10000,1);}
 if(e.shape==='fragment')number('翻转 °/s',e,'twist',-10000,1);
 number('位移扰动',e,'noise',0,.0001);number('扰动频率 Hz',e,'noiseHz',0,.1);
 if(e.parent){number('每母粒子粒数',e,'children',0,1);number('分叉时刻 ×母粒寿命',e,'event',0,.01);number('额外延迟 s',e,'delay',0,.001);number('速度继承',e,'inherit',0,.01);number('发生概率',e,'probability',0,.01);}
 else{number('每簇候选数量',e,'clusterSize',1,1);number('成簇概率',e,'clusterProbability',0,.05);number('簇内出生时宽 s',e,'clusterWidth',0,.001);number('簇内方向关联',e,'clusterDirection',0,.05);number('爆发段粒子比例',e,'burstShare',0,.05);}
 const details=document.createElement('details');details.innerHTML='<summary>完整参数（曲线、爆发、取景、材质与输出）</summary>';const area=document.createElement('textarea');area.value=JSON.stringify({P:state.P,M:state.M},null,2);area.style.cssText='width:100%;height:250px';area.setAttribute('aria-label','完整参数');details.ontoggle=()=>{if(details.open)area.value=JSON.stringify({P:state.P,M:state.M},null,2);};const apply=document.createElement('button');apply.textContent='应用完整参数';apply.onclick=()=>{if(graphEdit(()=>{const v=JSON.parse(area.value);if(!v.P||!v.M)throw Error('需要P和M两个对象');state.P={...state.P,...v.P,type:'sparkgraph',form:'loop'};state.M={...state.M,...v.M};}))buildGraphPanel();};details.append(area,apply);wrap.append(details);
 const download=document.createElement('button');download.textContent='下载完整参数 JSON';download.onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify({params:state.P,materialDefaults:state.M,name:state.name},null,2)],{type:'application/json'}));a.href=u;a.download=state.name+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};wrap.append(download);
}
function initGraphLibrary(){
const graphNav=document.createElement('div');graphNav.style.cssText='display:flex;gap:6px;padding:8px;flex-wrap:wrap';
for(const [key,label]of [['rocket','窜天猴尾焰'],['sparkler','仙女棒全形态']]){const b=document.createElement('button');b.className='btn';b.textContent=label;b.onclick=()=>graphOpen(key,true);graphNav.append(b);}
document.getElementById('side').prepend(graphNav);
}
function buildCameraPanel(host){
 const d=document.createElement('details');d.open=true;const summary=document.createElement('summary');summary.textContent='镜头成像 · '+(state.P.cameraMotion?'运动模糊':'快门关闭')+' / '+(state.P.cameraDof?'景深':'景深关闭');d.append(summary);host.append(d);const c=CameraImaging.settings(state.P);
 const field=(key,label,options,min,max,step)=>{const row=document.createElement('label');row.style.cssText='display:grid;grid-template-columns:1fr 125px;gap:6px;align-items:center;min-height:32px';const text=document.createElement('span');text.textContent=label;const input=document.createElement(options?'select':'input');input.setAttribute('aria-label',label);if(options){for(const [v,n]of options)input.add(new Option(n,v));}else{input.type='number';input.min=min;input.max=max;input.step=step;}
 input.value=c[key];input.onchange=()=>{if(graphEdit(()=>state.P[key]=options&&typeof options[0][0]==='string'?input.value:+input.value))buildGraphPanel();};row.append(text,input);d.append(row);};
 field('cameraMotion','快门运动模糊',[[0,'关闭'],[1,'开启']]);
 if(c.cameraMotion){field('cameraShutter','曝光时间 s',null,.0001,1,.001);field('cameraPhase','快门位置',[['end','当前帧结束'],['center','当前帧居中'],['start','当前帧开始']]);}
 field('cameraDof','景深与散焦',[[0,'关闭'],[1,'开启']]);
 if(c.cameraDof){field('cameraDistance','镜头距原点 m',null,.001,10000,.01);field('cameraFocus','对焦距离 m',null,.001,10000,.01);field('cameraAperture','光圈直径 m',null,0,100,.001);field('cameraBlades','散焦光斑',[[0,'圆形'],[6,'六边形']]);}
 if(c.cameraMotion||c.cameraDof)field('cameraQuality','输出成像质量',[['fast','快速'],['high','高质量'],['reference','加倍精度（核对）']]);
 const note=document.createElement('small');note.textContent='实时模拟使用快速质量；导出按所选质量。景深烘入贴图，游戏镜头不会重新对焦。';d.append(note);
}
