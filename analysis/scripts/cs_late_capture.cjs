// 调用烘焙器真实贴图回放函数；手机红头沿用原 CPU 光点实现。
const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'analysis/results/CS3_LateMotion'),local=path.join(root,'analysis/local/CS3-LateMotion');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});try{
 const errors=[],record={};
 for(const variant of ['baseline','trial']){
  const p=await b.newPage({viewport:{width:1400,height:900}});p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.join(out,variant+'.html')).href+'?fast');await p.waitForFunction(()=>window.__fw&&__fw.idle(),null,{timeout:180000});
  for(const id of ['CSLTC','CSLTS']){
   await p.evaluate(async id=>{await openReview(FW_REVIEW_LIST.find(e=>e.id===id));state.playing=false;},id);
   await p.waitForFunction(()=>__fw.idle(),null,{timeout:180000});
   await p.evaluate(async()=>{state.stillBusy=true;state.view='export';state.disp='fit';state.expo=1;state.ref.mode=0;
    if(state.tab==='combo')await ensureComboMobile();else if(!state.bake.mobile)state.bake.mobile=await bakeMobileFor(state.bake);
    canvas.width=480;canvas.height=480;hdrT&&hdrT.dispose();hdrT=new Target(480,480,gl.RGBA16F,true);
   });
   for(const plat of ['PC','Mobile'])for(const viewName of ['whole','detail']){
    const key=[variant,id,plat,viewName].join('-'),dir=path.join(local,key);fs.mkdirSync(dir,{recursive:true});
    const data=await p.evaluate(({plat,viewName})=>{
     state.platform=plat==='Mobile'?'mobile':'pc';const view=viewName==='whole'?[0,45,50,50]:[0,78,16,16],frames=[];
     // 仅固定观察镜头，渲染/贴图/颜色/头部函数保持原实现。
     const rtViewOriginal=rtView;rtView=()=>view;
     try{for(let tick=0;tick<=210;tick++){
      state.t=tick/30;hdrT.clear();hdrT.bind();additive(true);
      if(state.tab==='combo'){
       for(const L of state.layers){const e=state.lib.find(e=>e.name===L.lib),bb=previewBake(e.bake);if(!bb)throw Error('缺少平台烘焙结果');drawLayer(bb,L,state.t,view);}
       additive(false);post();
      }else renderExport();
      frames.push(canvas.toDataURL('image/png').split(',')[1]);
     }}finally{rtView=rtViewOriginal;}
     return {frames,view,exposure:state.expo};
    },{plat,viewName});
    data.frames.forEach((v,i)=>fs.writeFileSync(path.join(dir,i+'.png'),Buffer.from(v,'base64')));record[key]={frames:data.frames.length,view:data.view,exposure:data.exposure};console.log('capture',key);
   }
  }
  await p.close();
 }
 fs.writeFileSync(path.join(out,'浏览器回放检查.json'),JSON.stringify({errors,record},null,2));if(errors.length)throw Error(errors.join('\n'));
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
