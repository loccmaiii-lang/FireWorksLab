// N23-02: controllable async pauses through real export entry points; CPU only.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=__dirname+'/../src/js/';
const clone=x=>structuredClone(x);
async function flush(){for(let i=0;i<100;i++)await Promise.resolve();}
function deferred(){let yes,no;const promise=new Promise((a,b)=>{yes=a;no=b});return {promise,yes,no};}
function extract(src,name){const start=src.indexOf('function '+name+'(');assert(start>=0,name);let open=src.indexOf('{',start),n=1,i=open+1;for(;n&&i<src.length;i++){if(src[i]==='{')n++;else if(src[i]==='}')n--;}return (src.slice(start-6,start)==='async '?'async ':'')+src.slice(start,i);}
function fixture({form='master',pause='begin',fail=false,combo=false,actual=false,scheme='seq',variants=false}={}){
 const waits=[],events=[],released=[],history=[],renders=[],errors=[],deliveries=[];let didPause=false,current='my:alpha',named='Alpha',dest='directory',scale=.8,spec='small',version='revA';
 const P={type:'kiku',form,texW:16,texH:16,duration:2,seed:11,outPC:scheme,outMobile:scheme,nested:{curve:[[0,1],[1,2]]},sparkGraph:{layers:[{gain:3}]},exportScale:.8};
 const M={ramp0:'#111111',ramp1:'#222222',ramp2:'#333333',ramp3:'#444444',stages:[[0,'#abcdef']],headInt:1,tailInt:1};
 const oldBake={P,form,scale:1,meta:{duration:2,Ww:10,Wh:20,L:{cols:1,rows:1}},head:{gpu:true,bind(){}}};
 const L={lib:'layerA',scale:1,rate:1,delay:0,...clone(M)};
 const state={tab:combo?'combo':'master',P,M,bake:oldBake,dirty:false,platform:'pc',gen:1,name:'Alpha',comboName:'AlphaCombo',layers:[L],lib:[{name:'layerA',type:'kiku',P:clone(P),M:clone(M),bake:oldBake}],layerView:{solo:-1,mute:[]},view:'live',t:1,disp:'game',stillBusy:false};
 const busyState={on:false,req:false},nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,style:{}});return nodes.get(id)};
 const lib={effect:{key:'alpha'},review:{id:'a',ver:'revA'}};
 const wait=async kind=>{events.push(kind);if(kind===pause&&!didPause){didPause=true;const d=deferred();waits.push(d);await d.promise;}if(fail&&kind===pause)throw Error('test cancellation/failure');};
 const bakeP=async q=>{const b={P:clone(q),form:q.form,scale:1,meta:{duration:2,Ww:10,Wh:20,L:{cols:1,rows:1}},head:{gpu:true,bind(){}}};await wait('bake');return b;};
 const ctx=vm.createContext({structuredClone,Blob,TextEncoder,TextDecoder,Uint8Array,Uint32Array,DataView,Date,Map,Set,WeakMap,Object,URL,Math,console:{log(){},warn(){},error:e=>errors.push(e.message)},state,lib,VERSION:'test',
  FW_TEX_PREFIX:'T_EFX_FireWorks_',DeliveryWorkspace:{destination:()=>dest,beginExport:()=>wait('begin'),exportFailed:e=>errors.push(e.message),finishExport(){}},
  busyJob:busyState,$:node,exportClockMark(){},exportClockReport:()=>'',busyCan:on=>{busyState.on=on;busyState.req=false;return true},busy(){},flash(){},safeName:()=>named,effEnCustom:()=>named,delivName:()=>named,
  wbKey:()=>current,wbBaseId:()=>current,OUT_SIG:()=>version,wbSnap:()=>({kind:state.tab==='combo'?'combo':'single',P:clone(state.P),M:clone(state.M),layers:clone(state.layers),name:state.comboName}),curDuration:()=>state.P.duration,
  sizeSpecOf:()=>({kind:spec}),exportScalePlan:()=>({k:scale,keep:false,spec:{id:spec},sfx:''}),sizeSpecCombo:()=>({k:scale,id:spec}),
  packNamesFor:()=>({base:named,layers:['One'],system:named}),packSysName:(base,type,sp,sys)=>sys||base,
  bakeFinal:bakeP,bake:bakeP,bakeVariants:async q=>[await bakeP(q)],
  refineBake:async()=>null,disposeBake:b=>released.push(b),showStats(){},rtFxStale:()=>false,rtFxOn:()=>true,rtFxSnap:clone,emitFullOut:()=>true,
  libP:p=>clone(p),layerEntryOf:l=>state.lib.find(e=>e.name===l.lib),comboLayerM:l=>clone(l),
  singleOut:p=>({pc:p.outPC||'seq',mobile:p.outMobile||'seq'}),productNoPack:()=>'',bakeKind:p=>p.form,
  namingApplies:()=>true,PF_AIR:{},productFormOf:()=>null,
  applyPackNaming:files=>files,scaleCascadeFiles:(files,k,keep,sp)=>{events.push({scale:k,spec:sp?.id});return files;},packTidyNote:()=>'',
  bakeTotal:b=>b.meta.duration,comboContentEnd:()=>2,deliveryClassification:()=>({category:'firework',size:spec}),
  ensureTargets(){},renderExport(){renders.push({P:clone(state.P),M:clone(state.M),platform:state.platform});},renderCombo(){renders.push({layers:clone(state.layers),entries:state.lib.map(e=>clone(e.P))});},engineTick:t=>t,
  document:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},drawImage(){}}),toDataURL:()=> 'data:image/png;base64,fixture'})},canvas:{width:320,height:240},
  soundEvents:()=>[],singleSchemeNote:()=>'',curvesCSV:(b,m)=>JSON.stringify({P:b.P,M:m}),cascadeText:(n,b,m)=>JSON.stringify({P:b.P,M:m}),
  singleSchemeFiles:async(n,b,m)=>({files:[[n+'.scheme',new TextEncoder().encode(JSON.stringify({P:b.P,M:m}))]],ln:n,mn:n+'_Mobile'}),
  wbAutoExport:(name,job)=>history.push({current,name,job:job?clone(job):{key:current,snap:{P:clone(state.P)}}})
 });
 vm.runInContext(fs.readFileSync(dir+'60_export.js','utf8'),ctx);
 vm.runInContext(extract(fs.readFileSync(dir+'67_delivery.js','utf8'),'deliveryMetadata'),ctx);
 vm.runInContext(extract(fs.readFileSync(dir+'70_ui.js','utf8'),'exportCombo'),ctx);
 vm.runInContext(extract(fs.readFileSync(dir+'70_ui.js','utf8'),'busy'),ctx);
 if(actual)vm.runInContext(fs.readFileSync(dir+'67_fwlcombo.js','utf8'),ctx);
 Object.assign(ctx,{
  unitBlockReason:()=>'',clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),singleSchemeOn:()=>true,unitAllowed:()=>true,unitDuration:()=>2,
  bakeMobileFor:async b=>{await wait('mobile');return bakeP(b.P)},bakeUnitSet:async p=>bakeP(p),
  fwlCombo:(n,x,m)=>({name:n,platform:m?'mobile':'pc',textures:{},emitters:x.map(y=>({P:y.b.P,L:y.L,unit:y.unit?.P})),notes:[]}),
  fwlCascade:(n,b,m,mob)=>({name:n,textures:{},emitters:[{P:b.P,M:m}],platform:mob?'mobile':'pc'}),
  texFiles:async(b,n)=>{await wait('encode');return [[n+'.seq',new TextEncoder().encode(JSON.stringify(b.P))]];},
  rampPixels:m=>clone(m),encodePNG:async rgba=>{await wait('ramp');return new Blob([JSON.stringify(rgba)]);},
  masterJSON:(b,n,m)=>({name:n,params:b.P,materialDefaults:m}),curvesCSV:(b,m)=>JSON.stringify({P:b.P,M:m}),colorKeys:m=>clone(m.stages),
  platformFiles:async(n,b,m)=>[[n+'.platform',new TextEncoder().encode(JSON.stringify({P:b.P,M:m}))]],
  makeZip:async(files,job)=>{await wait('zip');return {files,job};},
  deliverResource:async(blob,name,metadata,destination)=>{await wait('deliver');deliveries.push({blob,name,metadata,destination});},
  ...(actual?{}:{comboPackFiles:async(n,l,prog,job,onBaked)=>{await wait('combo');const lb=l.map((L,i)=>({L,b:{P:job?.entries[i]?.P||state.lib[i].P,meta:{duration:2,Ww:10,Wh:10}},e:{}}));onBaked?.(lb);return [[n+'.combo',new TextEncoder().encode(JSON.stringify(lb.map(x=>({L:x.L,P:x.b.P}))))]];}})
 });
 return {state,oldBake,ctx,waits,events,released,history,renders,errors,deliveries,
  run:()=>vm.runInContext(combo?'exportCombo()':variants?'exportVariants()':'exportMaster()',ctx),
  async reach(){await flush();assert(waits.length,'paused at '+pause);},
  release(){for(const d of waits.splice(0))d.yes();},cancel(){busyState.req=true;},
  mutate(){state.P.nested.curve[0][1]=99;state.P.sparkGraph.layers[0].gain=99;state.P.outMobile='off';state.M.ramp3='#ffffff';state.M.stages[0][1]='#000000';state.platform='mobile';state.layers[0].scale=9;state.lib[0].P.seed=99;current='my:beta';named='Beta';dest='zip';scale=.5;spec='large';version='revB';lib.review={id:'b',ver:'revB'};lib.effect={key:'beta'};},
 };
}
(async()=>{
 for(const pause of ['begin','bake','encode','ramp','zip','deliver']){
  const f=fixture({pause});const p=f.run();await f.reach();f.mutate();f.release();await p;
  assert.equal(f.deliveries.length,1,JSON.stringify(f.errors));const d=f.deliveries[0];
  const seq=d.blob.files.find(([n])=>n.endsWith('.seq'));assert(seq,'initiating sequence policy changed after await at '+pause);const data=JSON.parse(new TextDecoder().decode(seq[1]));
  assert.equal(data.nested.curve[0][1],1,'nested parameters belong to export start at '+pause);
  assert.equal(data.sparkGraph.layers[0].gain,3);assert.equal(data.outMobile,'seq');
  assert.equal(d.name,'Alpha.zip');assert.equal(d.destination,'directory');assert.equal(d.metadata.sourceKey,'my:alpha');
  assert.equal(d.metadata.recipe.M.ramp3,'#444444');assert.equal(d.metadata.sizePlan.k,.8);assert.equal(d.blob.job.key,'my:alpha');assert.equal(d.blob.job.platform,'pc');assert(Object.isFrozen(d.blob.job.P.nested.curve));assert.equal(f.renders[0].P.nested.curve[0][1],1);assert.equal(f.renders[0].M.ramp3,'#444444');assert.equal(f.state.platform,'mobile');assert(!Object.hasOwn(f.state,'exportUnitHolder'));
  assert.equal(f.history[0].job.key,'my:alpha');assert.equal(f.history[0].job.snap.P.nested.curve[0][1],1);
  assert.equal(f.state.P.nested.curve[0][1],99,'editing remains available');assert(!f.released.includes(f.oldBake),'shared UI bake is never released');
  assert(f.released.length>0,'export-owned bake is cleaned');
 }
 console.log('PASS single export start snapshot survives six async pause positions');
 for(const form of ['loop','emitset','trail']){
  const f=fixture({form,pause:'begin'});const p=f.run();await f.reach();f.mutate();f.release();await p;
  assert.equal(f.deliveries[0].metadata.recipe.P.form,form);assert.equal(f.oldBake.P.outMobile,'off');
  assert.equal(f.deliveries[0].name,'Alpha.zip');assert(!f.released.includes(f.oldBake));
 }
 console.log('PASS non-air products keep their snapshot and never mutate shared bake policy');
 for(const pause of ['begin','combo','zip']){
  const f=fixture({combo:true,pause});const p=f.run();await f.reach();f.mutate();f.release();await p;
  const d=f.deliveries[0];assert(d,JSON.stringify(f.errors));assert.equal(d.name,'Alpha.zip');
  assert.equal(d.metadata.sourceKey,'my:alpha');assert.equal(d.metadata.recipe.layers[0].scale,1);assert.equal(f.history[0].job.key,'my:alpha');
  const row=JSON.parse(new TextDecoder().decode(d.blob.files.find(([n])=>n.endsWith('.combo'))[1]))[0];
  assert.equal(row.L.scale,1);assert.equal(row.P.seed,11);assert.equal(f.state.layers[0].scale,9);
 }
 console.log('PASS combo layers, entries, metadata and names use the initiating snapshot');
 for(const pause of ['begin','encode']){
  const f=fixture({pause,fail:true});const p=f.run();await f.reach();f.release();await p;
  assert.equal(f.deliveries.length,0);assert.equal(f.history.length,0);assert(!f.released.includes(f.oldBake));
  if(pause==='encode')assert(f.released.length>0,'failure disposes export-owned bake');
 }
 console.log('PASS cancelled/failed export has no delivery or history and releases only owned bake');
 for(const pause of ['bake','encode','mobile']){
  const f=fixture({combo:true,actual:true,pause});f.state.layers.push({...clone(f.state.layers[0]),lib:'layerB',delay:3});f.state.lib.push({...f.state.lib[0],name:'layerB',P:{...clone(f.state.lib[0].P),seed:12}});
  const p=f.run();await f.reach();f.mutate();f.state.lib[1].P.seed=88;f.release();await p;
  const d=f.deliveries[0];assert(d,JSON.stringify(f.errors));
  const cfg=JSON.parse(new TextDecoder().decode(d.blob.files.find(([n])=>n.endsWith('/cascade.json'))[1]));
  assert.equal(cfg.emitters[0].P.seed,11);assert.equal(cfg.emitters[1].P.seed,12);assert.equal(cfg.emitters[0].L.scale,1);
  assert.equal(cfg.emitters[0].P._fxM.ramp3,'#444444');assert.equal(f.state.lib[0].bake,f.oldBake);
  assert.equal(new Set(f.released).size,f.released.length,'private roots are released exactly once');assert(f.released.length>=4);
 }
 console.log('PASS real combo packing uses private captured layer parameters across bake/encode/mobile waits');
 {
  const f=fixture({actual:true,scheme:'unit',pause:'bake'});const p=f.run();await f.reach();f.mutate();f.release();await p;
  assert(f.deliveries[0],JSON.stringify(f.errors));assert.equal(vm.runInContext('singleUnitEntry.unitBake',f.ctx),null,'export never writes shared unit cache');
  assert.equal(new Set(f.released).size,f.released.length);assert(f.released.length>=2);assert.equal(f.state.P.outMobile,'off');
 }
 console.log('PASS real single-unit scheme keeps its job policy and disposes its private cache');
 {
  const f=fixture({variants:true,pause:'begin'});const p=f.run();await f.reach();f.mutate();f.release();await p;
  const d=f.deliveries[0];assert(d,JSON.stringify(f.errors));assert.equal(d.name,'Alpha_V1-V3.zip');assert.equal(d.metadata.sourceKey,'my:alpha');assert.equal(f.history[0].job.key,'my:alpha');
 }
 console.log('PASS seed-variant export keeps the same initiating identity and policy');
 {
  const f=fixture(),job=vm.runInContext('captureExportJob()',f.ctx).history,all={'my:alpha':[{id:'manual',name:'保留人工版本'}],'my:beta':[{id:'untouched'}]};let sync=0;
  Object.assign(f.ctx,{wb:{key:'my:beta'},WB_AUTO_MAX:3,wbAll:()=>all,store:{set:(k,v)=>{assert.equal(k,'mySaves');assert.equal(v,all);return true}},wbNow:()=> 'now',wbSync:()=>sync++});
  vm.runInContext(extract(fs.readFileSync(dir+'79_workbench.js','utf8'),'wbAutoExport'),f.ctx);f.mutate();
  for(let i=0;i<4;i++)f.ctx.wbAutoExport('Alpha'+i,job);
  assert.equal(all['my:beta'].length,1);assert.equal(all['my:alpha'][0].id,'manual');assert.equal(all['my:alpha'].length,4);assert.equal(sync,0);
  const last=all['my:alpha'].at(-1);assert.equal(last.snap.P.nested.curve[0][1],1);assert.equal(last.baseVer,'revA');assert.equal(last.ov,'revA');
 }
 console.log('PASS actual history writer appends to the initiating key, retains manual records and limits only that key');
 for(const unit of [false,true]){
  const f=fixture({combo:true,actual:true,pause:unit?'ramp':'mobile',fail:true});
  if(unit)f.state.layers[0].out={pc:'unit',mobile:'off',mobileManual:true};
  const p=f.run();await f.reach();f.release();await p;assert.equal(f.deliveries.length,0);assert.equal(f.history.length,0);
  assert(!f.released.includes(f.oldBake));assert.equal(new Set(f.released).size,f.released.length);assert(f.released.length>=(unit?2:1));assert(!f.state.lib[0].unitBake);
 }
 console.log('PASS real combo cancellation releases private sequence/unit caches without touching UI cache');
 for(const combo of [false,true]){
  const f=fixture({combo,actual:combo,pause:'zip'});const p=f.run();await f.reach();f.cancel();f.release();await p;
  assert.equal(f.deliveries.length,0,'cancel during ZIP must stop before publication');assert.equal(f.history.length,0);assert(!f.released.includes(f.oldBake));assert(f.released.length>0);
 }
 console.log('PASS actual cancellation flag during ZIP is checked before publication');
})().catch(e=>{console.error(e);process.exitCode=1;});
