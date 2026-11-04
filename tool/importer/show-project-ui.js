const ShowProjectUI=(()=>{
  let controller=null;
  function init(){if(controller)return;
    const root=document.getElementById('sp-root');if(!root)return;
    const by=id=>document.getElementById('sp-'+id),old=document.getElementById('df-pattern-study'),store=ShowProjectStore.create(localStorage);
    let tab='timeline',selected={},projectMode=false,active=false,time=0,range=[0,210],view='front',speed=1,playing=false,frame=0,lastClock=null,compiled=null,output=null,outputItems=[],incoming=null,receipt=null,lastFocus=null,copying=false;
    const labels={resources:['01 / RESOURCE','资源与标定','添加资源'],shots:['02 / SINGLE','完整单发','添加单发'],formations:['03 / FORMATION','场地与阵型','添加阵型'],timeline:['04 / TIME','整场时间轴','添加事件']};
    const listName=()=>tab==='timeline'?'cues':tab;
    function node(tag,attrs={},text){const e=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==='class')e.className=v;else e.setAttribute(k,String(v));}if(text!==undefined)e.textContent=text;return e;}
    function button(text,fn,cls=''){const e=node('button',{type:'button',class:cls},text);e.addEventListener('click',fn);return e;}
    function notice(message){by('notice').textContent=String(message);}
    function action(fn){try{return fn();}catch(e){notice(e.message||e);return null;}}
    function saveView(){try{localStorage.setItem('df.workbench.show.project.view.v1',JSON.stringify({projectMode,tab,selected,time,range:by('range').value,view,speed}));}catch{}}
    function halt(){playing=false;lastClock=null;if(frame)cancelAnimationFrame(frame);frame=0;by('play').textContent='播放';}
    function change(label,fn){halt();action(()=>store.change(label,fn));render();}
    function edit(list,id,fn){change('修改'+({resources:'资源',shots:'单发',formations:'阵型',cues:'事件',segments:'段落'}[list]||'数据'),d=>{const item=d[list].find(x=>x.id===id);if(!item)throw Error('条目已被移除。');fn(item,d);if(item.version)item.version++;return d;});}
    function field(label,value,onChange,options={}){
      const wrap=node('label',{class:options.full?'sp-full':''}),name=node('span',{},label),input=node(options.options?'select':'input');wrap.append(name,input);
      if(options.options){const choices=options.options;for(const choice of choices){const [v,n]=Array.isArray(choice)?choice:[choice.id,choice.name];input.append(node('option',{value:v},n));}if(value!==null&&value!==undefined&&!choices.some(x=>(Array.isArray(x)?x[0]:x.id)===String(value)))input.append(node('option',{value:String(value)},'引用缺失：'+value));input.value=value??'';}
      else {input.type=options.type||'text';if(input.type==='checkbox'){wrap.className+=' sp-checkbox';input.checked=value===true;}else input.value=value??'';for(const k of ['min','max','step','placeholder','maxlength'])if(options[k]!==undefined)input.setAttribute(k,options[k]);}
      if(options.id)input.id='sp-'+options.id;input.addEventListener('change',()=>{const value=options.type==='checkbox'?input.checked:options.type==='number'?(input.value===''?null:Number(input.value)):input.value;action(()=>onChange(value));});
      if(options.help)wrap.append(node('small',{class:'sp-note'},options.help));return wrap;
    }
    const num=(label,value,fn,opts={})=>field(label,value,fn,{type:'number',step:'0.1',...opts});
    const emptyOption=text=>[['',text]];
    function options(list){return [...emptyOption('请选择'),...store.doc[list].map(x=>[x.id,x.name||'未命名'])];}
    function selectedItem(){const key=listName();return store.doc[key].find(x=>x.id===selected[tab]);}
    function setTab(next){tab=next;render();saveView();}
    function renderList(){
      const list=by('list');list.replaceChildren();if(tab==='formations'){const b=button('五段场地 / 发射点',()=>{selected[tab]='site';render();saveView();});b.setAttribute('aria-pressed',String(selected[tab]==='site'));list.append(b);}
      const values=store.doc[listName()];if(!values.length)list.append(node('div',{class:'sp-empty'},'当前为空。可新建条目，或导入开场＋白墙小样。'));
      for(const item of values){const b=button(item.name||'未命名',()=>{selected[tab]=item.id;render();saveView();});b.setAttribute('aria-pressed',String(selected[tab]===item.id));b.dataset.itemId=item.id;
        const small=tab==='resources'?(item.resourceId?ShowResources.hint(item.resourceId).split('；')[0]:'待绑定 ResourceId'):tab==='shots'?('v'+item.version+' · '+({burst:'尾缀 / 开花',fan:'扇形单簇',raw:'完整资源段'}[item.kind]||item.kind)):tab==='formations'?('v'+item.version+' · '+item.members.length+' 条成员'):(item.enabled===false?'已停用':(item.clock==='burst'?'起爆 ':'发射 ')+(item.timeS??'未填')+' s');b.append(node('small',{},small));list.append(b);}
    }
    function formActions(item,list){const box=node('div',{class:'sp-form-actions'});box.append(button('复制一份',()=>change('复制条目',d=>{const src=d[list].find(x=>x.id===item.id),copy=ShowProject.clone(src);copy.id=ShowProject.uid(list);let i=2,name=src.name+'_Copy';while(d[list].some(x=>x.name.toLowerCase()===name.toLowerCase()))name=src.name+'_Copy'+i++;copy.name=name;if(copy.version)copy.version=1;if(copy.members)copy.members.forEach(m=>m.id=ShowProject.uid('member'));d[list].push(copy);selected[tab]=copy.id;return d;})));
      box.append(button('移除此项',()=>change('移除条目',d=>{d[list]=d[list].filter(x=>x.id!==item.id);selected[tab]='';return d;}),'sp-danger'));return box;
    }
    function resourcesForm(item){
      const host=by('editor-form'),grid=node('div',{class:'sp-form-grid'}),put=(label,k,opt={})=>grid.append(field(label,item[k],value=>edit('resources',item.id,r=>r[k]=value),opt));
      put('资源名称','name',{full:true});put('用途','role',{options:[['burst','开花'],['trail','尾缀升空'],['fan','单簇扇形'],['other','其它']]});
      const preset=node('label',{class:'sp-full'});preset.append(node('span',{},'ID 预设 · 只替换 ID'));const sel=node('select',{id:'sp-resource-preset'});ShowResources.fillSelect(sel,item.resourceId,item.role==='trail'?'launch':item.role);preset.append(sel);sel.addEventListener('change',()=>change('选择ID',d=>{ShowProject.setResourceId(d,item.id,sel.value);return d;}));grid.append(preset);
      grid.append(field('ResourceId · 可手填',item.resourceId,value=>change('填写ID',d=>{ShowProject.setResourceId(d,item.id,value);return d;}),{full:true,id:'resource-id',maxlength:256}));
      grid.append(node('p',{class:'sp-full sp-note'},ShowResources.hint(item.resourceId)));
      put('源版本 / 产物版本','sourceVersion');put('源指纹','sourceFingerprint');
      grid.append(node('h4',{class:'sp-form-divider'},'真实素材标定（可选）'));
      grid.append(num('原始花径 m',item.baseDiameterM,value=>edit('resources',item.id,r=>r.baseDiameterM=value),{min:.001,max:5000,id:'base-diameter'}));
      grid.append(num('原始升高 m',item.baseRiseM,value=>edit('resources',item.id,r=>r.baseRiseM=value),{min:.001,max:10000}));
      grid.append(field('已在 UE 验证当前ID与源版本的组件缩放',ShowProject.calibrationValid(item),value=>edit('resources',item.id,r=>{r.scaleVerified=value;r.calibrationSignature=value?ShowProject.calibrationSignature(r):'';}),{type:'checkbox',full:true,help:'先填写标定记录再确认。换ID或源版本会保留数值，标定需要重新确认。'}));put('标定记录 / 依据','scaleEvidence',{full:true,placeholder:'资源版本、倍率和实测结果'});put('备注','notes',{full:true});host.append(grid,formActions(item,'resources'));
    }
    function shotsForm(item){
      const host=by('editor-form'),grid=node('div',{class:'sp-form-grid'}),put=(label,k,opt={})=>grid.append(field(label,item[k],value=>edit('shots',item.id,s=>s[k]=value),opt)),number=(label,k,opt={})=>grid.append(num(label,item[k],value=>edit('shots',item.id,s=>s[k]=value),opt));
      put('子模板名称','name',{full:true,id:'shot-name'});put('单发类型','kind',{options:[['burst','升空 / 开花'],['fan','单簇扇形'],['raw','完整资源段配方']],full:true});
      function binding(label,k,role){const list=store.doc.resources,all=[...emptyOption('空白 / 不使用'),...list.filter(x=>x.role===role).map(x=>[x.id,x.name]),...list.filter(x=>x.role!==role).map(x=>[x.id,x.name+' · '+x.role])];grid.append(field(label,item[k]?.id||'',value=>edit('shots',item.id,s=>s[k]=ShowProject.ref(list.find(x=>x.id===value))),{options:all,full:true,id:k}));}
      if(item.kind==='burst'){binding('尾缀 ResourceId','trailRef','trail');binding('开花 ResourceId','burstRef','burst');}
      if(item.kind==='fan')binding('单簇 ResourceId','fanRef','fan');
      if(item.kind==='raw'){grid.append(node('p',{class:'sp-full sp-note'},'当前完整配方保留原段数值。起爆锚点需要按真实内部延迟填写；修改资源段请返回子模板制作，再显式接收。'));put('已核对起爆锚点与内部延迟','burstAnchorConfirmed',{type:'checkbox',full:true,id:'raw-anchor',help:'未确认时仅可按发射时刻编排，不能将触发默认为起爆。'});grid.append(button('查看原资源段',()=>{const p=node('pre',{class:'sp-full'},JSON.stringify(item.source,null,2));p.style.whiteSpace='pre-wrap';p.style.fontSize='12px';grid.append(p);}));}
      grid.append(node('h4',{class:'sp-form-divider'},'飞行与构图目标'));
      put('飞行档（标签）','flightTier',{options:[['custom','自定义'],['small','小档'],['medium','中档'],['large','大档']],help:'仅作分类，不改变其它参数。'});put('花径档（标签）','sizeTier',{options:[['custom','自定义'],['small','小花径'],['medium','中花径'],['large','大花径']]});
      number(item.kind==='fan'?'达到齐亮的延迟 s':'从触发到起爆 s','flightS',{min:0,max:3600,id:'shot-flight'});number('相对发射面升高 m','riseM',{min:0,max:10000,id:'shot-rise'});number('目标花径 m','diameterM',{min:0,max:5000,id:'shot-diameter'});number('开花 / 单簇可见时长 s','burstLifeS',{min:.01,max:3600});
      if(item.trailRef)number('尾缀可见时长 s（可留空）','trailLifeS',{min:.01,max:3600});put('预览颜色','color',{type:'color'});
      if(item.kind==='fan'){grid.append(node('h4',{class:'sp-form-divider'},'扇形展开'));
        number('簇数','fanCount',{min:1,max:256,step:1});number('总展开角度 °','fanSpreadDeg',{min:0,max:170});put('出现顺序','fanOrder',{options:[['together','同时'],['lr','左 → 右'],['rl','右 → 左'],['out','里 → 外'],['in','外 → 里']]});number('每步间隔 s','fanIntervalS',{min:0,max:10});}
      grid.append(node('h4',{class:'sp-form-divider'},'输出倍率与固定随机'));
      if(item.kind==='burst'){put('花径输出方式','scaleMode',{options:[['manual','手填组件倍率'],['calibrated','按已标定原花径换算']],full:true});number('开花组件倍率 ×','burstScale',{min:.001,max:100});put('尾缀高度输出方式','heightMode',{options:[['original','保持手填倍率'],['calibrated','按已标定原升高换算Z']],full:true});for(const axis of ['X','Y','Z'])grid.append(num('尾缀 '+axis+' 倍率',item.trailScale[axis],value=>edit('shots',item.id,s=>s.trailScale[axis]=value),{min:.001,max:100}));}
      for(const [k,label,max] of [['sizePct','大小轻微随机 ±%',50],['heightPct','升高轻微随机 ±%',50],['angleDeg','角度轻微随机 ±°',45]])grid.append(num(label,item.random[k],value=>edit('shots',item.id,s=>s.random[k]=value),{min:0,max}));
      put('备注','notes',{full:true});host.append(grid,formActions(item,'shots'));
    }
    function siteForm(){
      const host=by('editor-form'),d=store.doc,grid=node('div',{class:'sp-form-grid'});grid.append(node('p',{class:'sp-full sp-note'},'五段场地均分九个主排点；当前转角'+d.site.cornerDeg+'°、前移'+d.site.frontOffsetM+'m'+(d.site.estimated?'为估值':'已由你取消估值标记')+'。修改后自动点位与世界炸高同步更新；自定义点位请逐点修改。'));
      d.site.lengthsM.forEach((length,i)=>grid.append(num('第'+(i+1)+'段长度 m',length,value=>change('场地段长',d=>{d.site.lengthsM[i]=value;return d;}),{min:1,max:5000})));
      for(const [k,label,min,max] of [['mainHeightM','坝顶高度 m',0,10000],['frontHeightM','前台高度 m',0,10000],['cornerDeg','每段转角 °',0,60],['frontOffsetM','前台前移 m',-5000,5000],['frontWidthM','前台宽度 m',1,5000],['yawDeg','整场朝向 Yaw °',-360,360]])grid.append(num(label,d.site[k],value=>change('修改场地',d=>{d.site[k]=value;return d;}),{min,max,id:'site-'+k}));
      grid.append(field('场地仍是估值',d.site.estimated,value=>change('场地估值标记',d=>{d.site.estimated=value;return d;}),{type:'checkbox',full:true}));
      const manual=node('details',{class:'sp-full'});manual.append(node('summary',{},'自定义点位 / 查看坐标'));
      if(!d.points.length)manual.append(button('转成可编辑点位',()=>change('固定点位',d=>{d.points=ShowProject.pointLayout(d.site);return d;})));
      else manual.append(button('恢复自动生成点位',()=>change('恢复场地点位',d=>{d.points=[];return d;})));
      const points=d.points.length?d.points:compiled.points;for(const p of points){const row=node('div',{class:'sp-form-grid',style:'margin:12px 0;border-top:1px solid #35454a;padding-top:10px'});row.append(node('strong',{class:'sp-full'},p.id+' · '+p.group));
        if(d.points.length)for(const [k,label] of [['xM','X m'],['yM','Y m'],['zM','Z m'],['yawDeg','Yaw °']])row.append(num(label,p[k],value=>edit('points',p.id,x=>x[k]=value),{min:k==='zM'?0:-10000,max:10000}));else row.append(node('p',{class:'sp-full sp-note'},'X '+p.xM+' · Y '+p.yM+' · Z '+p.zM+' m · Yaw '+p.yawDeg+'°'));manual.append(row);}
      grid.append(manual);host.append(grid);
    }
    function formationsForm(item){
      const host=by('editor-form'),grid=node('div',{class:'sp-form-grid'});grid.append(field('阵型名称',item.name,value=>edit('formations',item.id,f=>f.name=value),{full:true}));host.append(grid);
      const bulk=node('details');bulk.open=!item.members.length;bulk.append(node('summary',{},'添加一组发射点'));
      let group='main',shotId='';bulk.append(field('点位组',group,v=>group=v,{options:[['main','九点主排 P1–P9'],['between','点间 B1–B8'],['all','主排＋点间 17点'],['front','前台 F1–F3']],id:'bulk-group'}),field('使用完整单发',shotId,v=>shotId=v,{options:options('shots'),id:'bulk-shot'}));
      bulk.append(button('添加这些点',()=>{if(!shotId){notice('先选择一个完整单发。');return;}edit('formations',item.id,(f,d)=>{const s=d.shots.find(s=>s.id===shotId);const pts=compiled.points.filter(p=>group==='all'?p.group!=='前台':p.group===({main:'主排',between:'点间',front:'前台'}[group]));for(const p of pts)f.members.push({id:ShowProject.uid('member'),pointId:p.id,shotId:s.id,shotVersion:s.version,offsetS:0,angleDeg:0,scale:1,riseM:null});});}));host.append(bulk);
      if(!item.members.length)host.append(node('p',{class:'sp-note'},'阵型里还没有成员。可同一点放多个单发，重复点不增加槽位数。'));
      const rows=node('div',{style:'max-height:680px;overflow:auto'});
      for(const m of item.members){const row=node('div',{class:'sp-member-row'}),update=fn=>edit('formations',item.id,f=>fn(f.members.find(x=>x.id===m.id)));
        row.append(field('发射点',m.pointId,value=>update(x=>x.pointId=value),{options:compiled.points.map(p=>[p.id,p.id])}),field('完整单发',m.shotId,value=>update(x=>{const s=store.doc.shots.find(s=>s.id===value);x.shotId=value;x.shotVersion=s?.version??1;}),{options:options('shots')}),num('时差 s',m.offsetS,value=>update(x=>x.offsetS=value),{min:-3600,max:3600}),button('×',()=>edit('formations',item.id,f=>f.members=f.members.filter(x=>x.id!==m.id)),'sp-tiny sp-danger'));
        const details=node('details',{style:'margin-top:4px;padding-top:5px'});details.append(node('summary',{},m.pointId+' · 角度、倍率、高度覆盖'));const extra=node('div',{class:'sp-form-grid'});extra.append(num('Roll偏移 °',m.angleDeg,v=>update(x=>x.angleDeg=v),{min:-180,max:180}),num('大小倍率 ×',m.scale,v=>update(x=>x.scale=v),{min:.001,max:100}),num('覆盖相对升高 m（空=单发）',m.riseM,v=>update(x=>x.riseM=v),{min:0,max:10000}));details.append(extra);rows.append(row,details);
      }
      host.append(rows,formActions(item,'formations'));
    }
    function segmentsEditor(host){
      const details=node('details');details.append(node('summary',{},'段落起止与跨段预发'));
      for(const s of store.doc.segments){const row=node('div',{class:'sp-segment-row'});row.append(field('名称',s.name,v=>edit('segments',s.id,x=>x.name=v)),num('开始 s',s.startS,v=>edit('segments',s.id,x=>x.startS=v),{min:0,max:86400}),num('结束 s',s.endS,v=>edit('segments',s.id,x=>x.endS=v),{min:0,max:86400}),button('×',()=>change('移除段落',d=>{d.segments=d.segments.filter(x=>x.id!==s.id);return d;}),'sp-tiny sp-danger'));details.append(row);}
      details.append(button('＋ 添加段落',()=>change('添加段落',d=>{const start=Math.max(0,...d.segments.map(x=>Number(x.endS)||0));d.segments.push({id:ShowProject.uid('segment'),name:'段落 '+(d.segments.length+1),startS:start,endS:start+15});return d;})));host.append(details);
    }
    function timelineForm(item){
      const host=by('editor-form');if(item){const grid=node('div',{class:'sp-form-grid'}),put=(label,k,opt={})=>grid.append(field(label,item[k],v=>edit('cues',item.id,c=>c[k]=v),opt));
        put('事件名称','name',{full:true});grid.append(field('使用阵型',item.formationId,v=>edit('cues',item.id,c=>{c.formationId=v;c.formationVersion=store.doc.formations.find(x=>x.id===v)?.version??1;}),{options:options('formations'),full:true,id:'cue-formation'}));put('所属段落','segmentId',{options:options('segments'),full:true,id:'cue-segment'});
        put('计时基准','clock',{options:[['burst','希望哪一秒起爆 / 齐亮'],['launch','希望哪一秒开始发射']],full:true});grid.append(num(item.clock==='burst'?'目标起爆时刻 s':'发射时刻 s',item.timeS,v=>edit('cues',item.id,c=>c.timeS=v),{min:0,max:86400,id:'cue-time'}));put('严格齐爆','strictBurst',{type:'checkbox',id:'cue-strict'});
        grid.append(num('逐发时间随机 ±s',item.timeJitterS,v=>edit('cues',item.id,c=>c.timeJitterS=v),{min:0,max:30,id:'cue-jitter'}));put('启用此事件','enabled',{type:'checkbox'});
        const rows=compiled.shots.filter(s=>s.cueId===item.id),start=rows.length?Math.min(...rows.map(s=>s.launchS)):null;grid.append(node('p',{class:'sp-full sp-note'},start===null?'选择阵型与段落后计算。':'最早发射 '+start.toFixed(3)+' s · '+rows.length+' 发'+(rows.some(s=>s.preFire)?' · 含跨段预发':'')));
        grid.append(node('p',{class:'sp-full sp-note'},'齐爆模式：发射 = 目标起爆 − 单发内部延迟。成员时差与时间随机须为0；提前发射不会被截到段落起点。'));host.append(grid,formActions(item,'cues'));}
      else host.append(node('p',{class:'sp-note'},'整场尚未建立事件。先准备资源、完整单发和阵型，再添加时间轴事件。'));
      segmentsEditor(host);
    }
    function renderForm(){
      const host=by('editor-form');host.replaceChildren();if(tab==='formations'&&selected[tab]==='site'){siteForm();return;}const item=selectedItem();if(!item){if(tab==='timeline')timelineForm(null);else host.append(node('p',{class:'sp-note'},'选择一个条目，或点击右上角添加。'));return;}
      ({resources:resourcesForm,shots:shotsForm,formations:formationsForm,timeline:timelineForm}[tab])(item);
    }
    function renderChecks(){
      const errors=compiled.errors,warnings=compiled.warnings,host=by('checks');host.replaceChildren();by('checks-summary').textContent=errors.length?'有 '+errors.length+' 项需处理 · 可看示意，暂不能输出原生数据':warnings.length?'时间计算通过 · '+warnings.length+' 项待核对':'当前工程检查通过';
      const list=node('ul');for(const e of errors.slice(0,8))list.append(node('li',{class:'sp-error'},e));for(const e of warnings.slice(0,5))list.append(node('li',{class:'sp-warning'},e));if(errors.length>8||warnings.length>5)list.append(node('li',{class:'sp-note'},'其余提示可在整包TXT与对应编辑页查看。'));if(!errors.length&&!warnings.length)list.append(node('li',{class:'sp-good'},compiled.shots.length?'数据计算一致，原生粘贴与粒子实播仍待验证。':'新建为空白，可自行添加或导入计划。'));host.append(list);by('rebind').hidden=!errors.some(e=>e.includes('版本'));
    }
    function renderStats(){const s=compiled.stats,host=by('stats');host.replaceChildren();for(const [label,value] of [['完整单发总数',s.totalShots??0],['开花',s.bursts??0],['小 / 中 / 大花径',(s.small??0)+' / '+(s.medium??0)+' / '+(s.large??0)],['尾缀',s.trails??0],['扇形组 / 簇',(s.fanGroups??0)+' / '+(s.fanMembers??0)],['白墙',s.wallShots??0],['跨段预发',s.preFire??0],['系统峰值估算',s.peakSystems??0]]){const div=node('div',{class:'sp-stat'});div.append(node('strong',{},value),node('span',{},label));host.append(div);}}
    function outputSelection(){const index=Number(by('output-select').value)||0,item=outputItems[index];by('output-text').value=item?.text||'';by('output-hint').textContent=item?.hint||'补齐ID和关联版本后，生成分项参数。';by('copy').disabled=!item||copying;}
    function renderOutput(){
      output=null;outputItems=[];let exportError='';try{if(!compiled.errors.length&&compiled.shots.length)output=ShowProjectExport.make(store.doc,compiled);}catch(e){exportError=e.message;}
      if(output){for(const item of output.children)outputItems.push({label:'单发 · '+item.name,text:item.text,hint:'粘贴到 EffectSubTemplates 的一个新增数组项。'});for(const item of output.parents)outputItems.push({label:'阵型 · '+item.name+' · 触发 '+item.triggerS+'s',text:item.text,hint:'粘贴到该阵型BP的 EffectTemplate；发射点槽位顺序见整包TXT。'});by('output-status').textContent='当前数据已生成；粒子高度、花径和槽位变换仍需UE实播核验。';}
      else by('output-status').textContent=exportError?'原生参数未生成：'+exportError:compiled.errors.length?'当前有未处理项，复制入口暂停；右侧构图可先看计划目标。':'空白工程尚无输出。';
      const select=by('output-select'),previous=select.selectedOptions[0]?.textContent;select.replaceChildren();outputItems.forEach((item,i)=>select.append(node('option',{value:i},item.label)));const index=outputItems.findIndex(x=>x.label===previous);if(index>=0)select.value=index;outputSelection();by('copy-all').disabled=by('export-txt').disabled=!output||copying;
      const rows=by('rows');rows.replaceChildren();for(const r of compiled.shots.slice(0,2048)){const tr=node('tr');for(const text of [r.cueName+' / '+r.pointId,r.shotName,r.launchS.toFixed(3)+(r.preFire?' · 预发':''),r.burstS.toFixed(3),r.riseM.toFixed(2),(r.worldBurst.Z/100).toFixed(2),r.diameterM.toFixed(2)])tr.append(node('td',{class:r.preFire?'sp-prefire':''},text));rows.append(tr);}
    }
    function limits(){if(by('range').value==='opening')return [0,15];if(by('range').value==='wall')return [180,Math.max(210,compiled.stats.durationS||0)];return [0,Math.max(1,compiled.stats.durationS||210)];}
    function paint(){range=limits();time=Math.max(range[0],Math.min(range[1],time));by('time').min=range[0];by('time').max=range[1];by('time').value=time;by('time-label').textContent=time.toFixed(2)+' s';by('time-end').textContent=range[1].toFixed(1)+' s';ShowProjectScene.draw({scene:by('scene'),timeline:by('timeline'),compiled,doc:store.doc,time,view,range});}
    function render(){
      const doc=store.doc;compiled=ShowProject.compile(doc);by('project-title').textContent=doc.name||'空白编排工程';by('project-subtitle').textContent=doc.cues.length?doc.resources.length+' 个资源 · '+doc.shots.length+' 个完整单发 · '+doc.formations.length+' 个阵型 · '+doc.cues.length+' 个时间轴事件':'先建立完整单发，或导入开场与白墙小样。';
      by('name').value=doc.name;by('seed').value=doc.seed;by('preroll').value=doc.preRollS;by('save-status').textContent=store.status;by('undo').disabled=!store.canUndo;by('redo').disabled=!store.canRedo;
      by('editor-step').textContent=labels[tab][0];by('editor-title').textContent=labels[tab][1];by('add').textContent='＋ '+labels[tab][2];root.querySelectorAll('.sp-tabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===tab)));
      const values=doc[listName()];if(!values.some(x=>x.id===selected[tab])&&!(tab==='formations'&&selected[tab]==='site'))selected[tab]=values[0]?.id||'';
      renderList();renderForm();renderChecks();renderStats();renderOutput();paint();saveView();
    }
    function setMode(value){projectMode=value;root.hidden=!value;old.style.display=value?'none':'';by('mode-project').setAttribute('aria-pressed',String(value));by('mode-classic').setAttribute('aria-pressed',String(!value));if(value){ShowComposer.setActive(false);render();}else {halt();ShowComposer.setActive(active);}saveView();}
    function step(clock){if(!playing||!active||!projectMode||document.hidden){halt();return;}if(lastClock!==null)time+=(clock-lastClock)/1000*speed;lastClock=clock;if(time>=range[1]){time=range[1];halt();paint();saveView();return;}paint();frame=requestAnimationFrame(step);}
    function download(name,text,type='text/plain;charset=utf-8'){if(typeof URL.createObjectURL!=='function')throw Error('浏览器不支持文件下载；请使用文本复制。');const href=URL.createObjectURL(new Blob([text],{type})),a=node('a',{href,download:name});a.style.display='none';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),1000);}
    async function copy(all=false){if(copying)return;const data=output;if(!data||data.fingerprint!==ShowProject.fingerprint(store.doc)){notice('当前参数无效或已改变，请处理工程检查。');return;}
      const text=all?data.allText:outputItems[Number(by('output-select').value)||0]?.text;if(!text)return;copying=true;by('copy').disabled=by('copy-all').disabled=true;
      try{if(!navigator.clipboard?.writeText)throw Error('浏览器未开放剪贴板');await navigator.clipboard.writeText(text);by('output-status').textContent=data.fingerprint===ShowProject.fingerprint(store.doc)?'已复制当前'+(all?'整包清单':'参数')+'。':'已复制先前版本；工程已改变，请重新复制。';}
      catch{if(data.fingerprint!==ShowProject.fingerprint(store.doc)){by('output-status').textContent='复制期间工程已改变；请处理当前参数后重新复制。';}else {by('output-text').value=text;by('output-text').focus();by('output-text').select();by('output-status').textContent='自动复制未完成，文本已选中，请按 Ctrl+C。';}}
      finally{copying=false;by('copy').disabled=!outputItems.length;by('copy-all').disabled=!output;}
    }
    function openImport(doc){halt();incoming=doc;receipt=null;lastFocus=document.activeElement;by('dialog').hidden=false;by('import-mode').value=store.doc.cues.length||store.doc.shots.length?'merge':'replace';previewImport();by('dialog-close').focus();}
    function previewImport(){
      receipt=null;by('import-confirm').disabled=true;const host=by('import-rows');host.replaceChildren();action(()=>{receipt=ShowProjectImport.preview(store.doc,incoming,by('import-mode').value);by('import-summary').textContent=incoming.name+' · '+incoming.shots.length+' 个完整单发 / '+incoming.formations.length+' 个阵型 / '+incoming.cues.length+' 个事件；'+receipt.conflicts+' 项冲突。确认前不会改当前工程。';
        for(const row of receipt.rows){const div=node('div',{class:'sp-import-row'});div.append(node('small',{},({resources:'资源',shots:'单发',formations:'阵型',cues:'事件',segments:'段落',points:'点位'}[row.list])),node('span',{},row.name+(row.nextName!==row.name?' → '+row.nextName:'')),node('span',{class:row.conflict?'sp-warning':''},row.action));host.append(div);}
        by('import-check').textContent=receipt.errors.length?'导入后有 '+receipt.errors.length+' 项待补齐（如缺少 ResourceId）。可先看示意，填好才能复制。':receipt.warnings.length+' 项标定或实播提示；原生输出不会自动写入UE。';by('import-confirm').textContent=receipt.mode==='replace'?'确认替换当前工程（可撤销）':'确认合并并改名冲突项';by('import-confirm').disabled=false;
      });
    }
    function closeImport(){by('dialog').hidden=true;receipt=null;incoming=null;if(lastFocus?.isConnected)lastFocus.focus();}
    function adopt(){action(()=>{
      const copyButton=document.getElementById('df-pattern-copy'),text=document.getElementById('df-pattern-export-text').value;if(copyButton.disabled||!text)throw Error('先在子模板制作里完成有效参数和命名。');
      const source=ShowText.subtemplate(ShowText.parse(text)),d=ShowProject.blank();d.site=ShowProject.clone(store.doc.site);d.points=ShowProject.clone(store.doc.points);d.name='接收子模板 '+source.TemplateName;const s=ShowProject.shot(source.TemplateName,'raw');s.source=source;s.notes='显式从现有子模板制作接收，原数值保留；飞行锚点及目标尺寸待填写。';d.shots.push(s);setMode(true);openImport(d);
    });}
    by('mode-project').addEventListener('click',()=>setMode(true));by('mode-classic').addEventListener('click',()=>setMode(false));root.querySelectorAll('.sp-tabs button').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
    by('new').addEventListener('click',()=>{closeImport();change('新建空白',()=>ShowProject.blank());selected={};time=0;setTab('timeline');});
    by('sample').addEventListener('click',()=>openImport(ShowProjectSample.create()));by('import').addEventListener('click',()=>by('file').click());
    by('file').addEventListener('change',async()=>{const file=by('file').files?.[0];if(!file)return;try{if(file.size>2e6)throw Error('文件超过2MB。');openImport(ShowProjectImport.parse(await file.text()));}catch(e){notice(e.message);}finally{by('file').value='';}});
    by('import-mode').addEventListener('change',previewImport);by('dialog-close').addEventListener('click',closeImport);by('import-confirm').addEventListener('click',()=>{if(!receipt)return;const ready=receipt;action(()=>{const next=ShowProjectImport.apply(store.doc,ready);if(store.locked){if(!store.replaceDamaged(next))throw Error(store.status);}else store.change('导入工程',()=>next);closeImport();selected={};time=0;render();notice('已导入工程；时间与构图可预览，请在资源页补齐待绑定ID。');});});
    by('dialog').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeImport();}if(e.key==='Tab'){const focusable=[...by('dialog').querySelectorAll('button:not(:disabled),select')];const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
    by('name').addEventListener('change',()=>change('工程名称',d=>{d.name=by('name').value;return d;}));by('seed').addEventListener('change',()=>change('固定随机码',d=>{d.seed=Number(by('seed').value);return d;}));by('preroll').addEventListener('change',()=>change('整场预卷',d=>{d.preRollS=Number(by('preroll').value);return d;}));
    by('undo').addEventListener('click',()=>{halt();store.undo();render();notice('已撤销上一步。');});by('redo').addEventListener('click',()=>{halt();store.redo();render();notice('已重做。');});by('save').addEventListener('click',()=>{store.save();by('save-status').textContent=store.status;});
    by('backup').addEventListener('click',()=>action(()=>{download((store.doc.name||'DF_Show')+'.json',JSON.stringify(store.doc,null,2),'application/json;charset=utf-8');notice('已生成工程JSON备份；恢复时通过导入工程预览确认。');}));by('reload').addEventListener('click',()=>{halt();store.reload();render();notice(store.status);});
    by('rebind').addEventListener('click',()=>change('重新绑定版本',d=>{ShowProject.rebind(d);return d;}));by('add').addEventListener('click',()=>change(labels[tab][2],d=>{const list=listName(),n=d[list].length+1,item=tab==='resources'?ShowProject.resource('资源 '+n):tab==='shots'?ShowProject.shot('Single_'+n):tab==='formations'?ShowProject.formation('Formation_'+n):ShowProject.cue('事件 '+n);let i=n;while(d[list].some(x=>x.name.toLowerCase()===item.name.toLowerCase()))item.name=(tab==='resources'?'资源 ':tab==='timeline'?'事件 ':tab==='shots'?'Single_':'Formation_')+(++i);d[list].push(item);selected[tab]=item.id;return d;}));
    by('play').addEventListener('click',()=>{if(playing){halt();saveView();return;}if(!compiled.shots.length){notice('先添加有效事件或导入小样。');return;}range=limits();if(time>=range[1])time=range[0];playing=true;lastClock=null;by('play').textContent='暂停';frame=requestAnimationFrame(step);});
    by('reset').addEventListener('click',()=>{halt();time=limits()[0];paint();saveView();});by('time').addEventListener('input',()=>{halt();time=Number(by('time').value);paint();saveView();});by('speed').addEventListener('change',()=>{const next=Number(by('speed').value);speed=[.5,1,2].includes(next)?next:1;by('speed').value=speed;lastClock=null;saveView();});by('range').addEventListener('change',()=>{halt();time=limits()[0];paint();saveView();});by('view').addEventListener('change',()=>{view=by('view').value;paint();saveView();});
    by('copy').addEventListener('click',()=>copy());by('copy-all').addEventListener('click',()=>copy(true));by('export-txt').addEventListener('click',()=>action(()=>{if(!output)throw Error('工程还有未处理项。');download((store.doc.name||'DF_Show')+'_UE.txt',output.allText);notice('已生成整包TXT，按其中三部分分别粘贴。');}));by('output-select').addEventListener('change',outputSelection);
    const oldActions=document.getElementById('df-pattern-save-template')?.parentElement;if(oldActions)oldActions.append(button('接收到整场工程',adopt,'sp-bridge'));
    try{const p=JSON.parse(localStorage.getItem('df.workbench.show.project.view.v1')||'{}');tab=Object.hasOwn(labels,p.tab)?p.tab:'timeline';selected=p.selected&&typeof p.selected==='object'?p.selected:{};time=ShowProject.finite(p.time,0,86400)?p.time:0;by('range').value=['all','opening','wall'].includes(p.range)?p.range:'all';view=p.view==='top'?'top':'front';by('view').value=view;speed=[.5,1,2].includes(p.speed)?p.speed:1;by('speed').value=speed;projectMode=p.projectMode===true;}catch{}
    document.addEventListener('visibilitychange',()=>{if(document.hidden){halt();saveView();}});window.addEventListener('storage',e=>{if(e.key===ShowProjectStore.KEY){halt();notice('另一标签页更新了工程。请先备份当前修改，再读取本机版本。');}});
    render();setMode(projectMode);
    controller={setActive(value){active=value;if(!value){halt();saveView();}else if(projectMode){ShowComposer.setActive(false);paint();}}};
  }
  function setActive(value){init();controller?.setActive(value);}
  return {init,setActive};
})();
