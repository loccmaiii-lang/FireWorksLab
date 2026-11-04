const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const entry=process.argv[2]||'df-fireworks-delivery_locmai.html',delivery=entry.includes('delivery'),key=delivery?'fwimp.delivery.v1':'fwimp.workbench.v2';
const basic={format:'fwl.cascade/1',name:'Shared',textures:{ramp:{file:'r.png',class:'ramp',asset:'T_EFX_FireWorks_Shared_R',hash:'0123456789abcdef12'}},materials:{m:{role:'soft_dot'}},emitters:[{name:'Spark',material:'m',modules:[]}]};
const receipt={format:'df.firework-resource/1',status:'complete',resourceId:'shared',revisionId:'r1',deliveryId:'shared-r1',name:'Shared',packages:[{platform:'pc',directory:'F:/fixture',configFile:'cascade.json'},{platform:'mobile',directory:'F:/fixture',configFile:'cascade_mobile.json'}]};
const pause=()=>new Promise(r=>setTimeout(r,10)),api=w=>w.eval('FwImporter');
function boot({different=false}={}){
 let html=fs.readFileSync(path.join(__dirname,'../'+entry),'utf8');
 const start=html.indexOf('  async function readUpdateTargets(it){'),end=html.indexOf('  function validateUpdateTargets(it){',start);
 assert(start>0&&end>start);html=html.slice(0,start)+`  async function readUpdateTargets(it){return Object.entries(it.assets).map(([key,pkg])=>({key,pkg,exists:true,class:key==='ps'?'ParticleSystem':key.startsWith('tex:')?'Texture2D':'MaterialInstanceConstant',editable:true,tag:'',diskHash:'fixture',lodCount:1}));}\n`+html.slice(end);
 let writes=0;const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'http://isolated.invalid/recheck',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.confirm=()=>false;w.fetch=async(url,opt)=>{
   const req=JSON.parse(opt.body);let data;
   if(req.function==='GetPlatformName')data={return_value:'Windows'};
   else if(req.function==='DoesAssetExist')data={return_value:'False'};
   else if(req.function==='ExecutePythonCommandEx'&&require('./mock-import-policy.cjs').simulatePolicy(req.args.PythonCommand))data={return_value:'True'};
   else if(req.function==='ExecutePythonCommandEx'&&req.args.PythonCommand.includes("print('FWLJSON:'")){
    const mobile=req.args.PythonCommand.includes('cascade_mobile.json');
    const spec=JSON.parse(JSON.stringify(basic));if(mobile)spec.name='Shared_Mobile';
    data={return_value:'True',out_LogOutput:'Output='+JSON.stringify('FWLJSON:'+JSON.stringify({spec,exists:{ramp:true},sourceHash:'source-'+mobile,textureHashes:{ramp:(different&&mobile?'b':'a').repeat(64)}}))};
   }else{writes++;throw Error('Native command forbidden: '+req.function);}
   return{ok:true,json:async()=>({success:true,data})};
  };
 }});
 const rows=()=>{const s=JSON.parse(dom.window.localStorage.getItem(key));return s.batches.find(b=>b.id===s.active).rows;};
 return{w:dom.window,rows,errors,get writes(){return writes;},close:()=>dom.window.close()};
}
async function mode(f,id,value){f.w.document.querySelector('#fwimp-list [data-id="'+id+'"] .fw-item-name').click();const select=f.w.document.getElementById('fwimp-mode');select.value=value;select.dispatchEvent(new f.w.Event('change',{bubbles:true}));for(let n=0;n<200&&f.w.eval('Workbench.busy');n++)await pause();await api(f.w).preview([id]);}
(async()=>{
 const f=boot();await pause();await api(f.w).acceptDelivery(receipt);assert(f.rows().every(r=>r.state==='ready'),JSON.stringify(f.rows().map(r=>r.errs)));console.log('PASS initial PC/mobile shared texture checks');
 const [pc,mobile]=f.rows();await mode(f,mobile.id,'update');assert(f.rows().every(r=>r.state==='ready'),JSON.stringify(f.rows().map(r=>r.errs)));assert.equal(f.w.document.querySelector('#fwimp-list .inspect').dataset.id,mobile.id);assert.match(f.w.document.getElementById('fwimp-reviewContent').textContent,/复用本批次贴图/);console.log('PASS editing one platform rebuilds the shared batch plan');
 await mode(f,pc.id,'update');await api(f.w).preview();assert(f.rows().every(r=>r.state==='ready'));console.log('PASS full recheck does not retain prior collision state');
 api(f.w).reviewNames();api(f.w).confirmNames();assert.equal(f.writes,0);assert.equal(f.w.document.getElementById('fwimp-btnExec').disabled,false);console.log('PASS shared update can be confirmed, without native writes');
 api(f.w).selectAll(false);const box=f.w.document.querySelector('#fwimp-list [data-id="'+mobile.id+'"] input[type=checkbox]');box.checked=true;box.dispatchEvent(new f.w.Event('change',{bubbles:true}));await api(f.w).preview();assert.equal(f.rows().find(r=>r.id===mobile.id).state,'ready');assert.equal(f.writes,0);console.log('PASS a lone selected platform owns its textures instead of referencing an unchecked owner');
 f.close();const d=boot({different:true});await pause();await api(d.w).acceptDelivery(receipt);assert(d.rows().some(r=>r.state==='conflict'));assert.equal(d.writes,0);d.close();console.log('PASS different source content targeting one name stays blocked');
 console.log('6 shared recheck contracts passed in '+entry+'; no real UE calls.');
})().catch(e=>{console.error(e);process.exit(1)});
