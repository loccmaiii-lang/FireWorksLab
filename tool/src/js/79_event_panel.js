// 4.9.111 图层「这一层在整朵里」的CPU事件实例参数。沿用现有滑杆/撤销/保存。
function eventInstancePanel(host,L,i){
  const box=document.createElement('details');box.className='sec';box.id='eventInstancePanel';
  box.innerHTML='<summary>出生方式 · '+(EventInstances.on(L)?'飞行结束后绽放':'单次序列')+'</summary>';host.appendChild(box);
  const label=document.createElement('label');label.className='check';label.innerHTML='<input type="checkbox" data-event-enable> 先飞行，结束后生成本层序列';box.appendChild(label);
  const cb=label.querySelector('input');cb.checked=EventInstances.on(L);
  cb.addEventListener('change',()=>{if(cb.checked){L.eventSpawn=EventInstances.defaults();L.out={pc:'seq',mobile:'off',mobileManual:true};}else delete L.eventSpawn;buildLayerHead(i);wbSync();});
  if(!EventInstances.on(L))return;
  const c=L.eventSpawn,rows=document.createElement('div');box.appendChild(rows);
  const n=(k,t,u,min,max,step)=>slider(rows,'ev'+i+'-'+k,t,u,min,max,step,()=>EventInstances.config(L)[k],v=>{c[k]=v;wbSync();},EventInstances.defaults()[k]);
  const range=(k,t,u,min,max,step)=>[0,1].forEach(j=>slider(rows,'ev'+i+'-'+k+j,t+(j?'上限':'下限'),u,min,max,step,()=>EventInstances.config(L)[k][j],v=>{const a=EventInstances.config(L)[k].slice();a[j]=v;if(a[1]<a[0])a[1-j]=v;c[k]=a;wbSync();},EventInstances.defaults()[k][j]));
  n('count','星头数量','颗',1,40,1);n('seed','预览随机种子','',1,9999,1);
  range('flight','飞行时长','s',.05,3,.01);range('speed','星头初速','m/s',1,300,1);
  range('headSize','星头直径','m',.05,4,.01);n('drag','飞行阻力','1/s',0,12,.1);n('gravity','飞行重力','×',0,2,.05);
  n('inherit','小割继承速度','×',0,1,.05);n('childDrag','小割中心阻力','1/s',0,8,.1);n('childGravity','小割中心重力','×',0,2,.05);
  n('sizeJit','小割尺寸随机','±比例',0,.5,.01);n('rotation','小割旋转随机','圈',0,1,.05);
  const mode=document.createElement('label');mode.className='field';mode.innerHTML='<span class="fk">小割颜色</span><select data-event-color><option value="fixed">使用本层颜色曲线</option><option value="random">每颗随机初始色</option></select>';box.appendChild(mode);
  const sel=mode.querySelector('select');sel.value=EventInstances.config(L).color;sel.addEventListener('change',()=>{c.color=sel.value;buildMasterPanel();buildLayerHead(i);wbSync();});
  if(sel.value==='random')for(const k of ['colorMin','colorMax'])for(let j=0;j<3;j++)slider(box,'ev'+i+'-'+k+j,(k==='colorMin'?'颜色下限 ':'颜色上限 ')+['R','G','B'][j],'线性',0,1,.01,()=>EventInstances.config(L)[k][j],v=>{const a=EventInstances.config(L)[k].slice();a[j]=v;c[k]=a;wbSync();},EventInstances.defaults()[k][j]);
  const flashLabel=document.createElement('label');flashLabel.className='check';flashLabel.innerHTML='<input type="checkbox" data-event-flash> 同时生成主闪光（整发仅启用一组）';box.appendChild(flashLabel);
  const fl=flashLabel.querySelector('input');fl.checked=EventInstances.config(L).flash;fl.addEventListener('change',()=>{c.flash=fl.checked;buildLayerHead(i);wbSync();});
  if(fl.checked){n('flashLife','主闪光寿命','s',.03,.4,.01);n('flashSize','主闪光直径','m',1,40,.5);n('flashAlpha','主闪光亮度','×',0,2,.05);}
  const p=document.createElement('p');p.className='hint';p.textContent='PC · 单段合并序列。每颗星头结束时只生成一朵；随机色替代本层颜色曲线，灰度贴图与Ramp仍参与乘色。预览种子用于复核，UE按同一范围重新抽样。';box.appendChild(p);
  const ch=document.createElement('label');ch.className='field';ch.innerHTML='<span class="fk">星头/主闪光颜色</span><input type="color" data-event-head-color>';box.appendChild(ch);ch.querySelector('input').value=EventInstances.config(L).headColor;
  ch.querySelector('input').addEventListener('change',e=>{c.headColor=e.target.value;wbSync();});
}
