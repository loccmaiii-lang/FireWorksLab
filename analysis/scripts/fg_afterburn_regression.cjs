// 六模板和动态认可/待验收清单；后续仅改 RT6 时可复用其它花型已完成的像素证据。
const fs=require('fs'),path=require('path'),cp=require('child_process'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),ref=path.join(root,'tool/_fg_afterburn_ref.html'),out=path.join(root,'analysis/results/FG_Afterburn/逐像素回归.json');
(async()=>{
 const frozen=path=>cp.execFileSync('git',['show','6902b0f2:'+path],{cwd:root,maxBuffer:20e6,windowsHide:true}).toString('utf8');
 fs.writeFileSync(ref,frozen('tool/FireworkBaker.html').replace('<script src="data/review.js"></script>','<script>'+frozen('tool/data/review.js')+'</script>'));
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
 try{
  const pages=[];
  for(const f of [ref,path.join(root,'tool/FireworkBaker.html')]){
   const p=await browser.newPage();await p.goto(pathToFileURL(f).href+'?fast');await p.waitForFunction(()=>window.__fw&&__fw.idle(),null,{timeout:180000});
   await p.evaluate(()=>{state.stillBusy=true;state.playing=false;clearTimeout(bakeTimer);});pages.push(p);
  }
  let ids=await pages[1].evaluate(()=>{
   const a=new Set(['type:kiku','type:botan','type:kamuro','type:senrin','type:strobe','type:crackle']);
   const add=id=>{if(!id)return;id=id.replace(/^rep:/,'');const e=FW_REVIEW_LIST.find(x=>x.id===id);if(e&&e.layerIds)e.layerIds.forEach(add);else if(REPLICA_BY_ID[id])a.add(id);};
   FW_EFFECTS.filter(e=>['已通过','待验收'].includes(e.阶段)).forEach(e=>{add(e.主条目);add(e.待验收版);});return [...a];
  });
  const referenceIds=await pages[0].evaluate(()=>Object.keys(REPLICA_BY_ID));
  const introduced=ids.filter(id=>!id.startsWith('type:')&&!referenceIds.includes(id));
  ids=ids.filter(id=>!introduced.includes(id));
  const prior=process.argv.includes('--emitset-only')?JSON.parse(fs.readFileSync(out,'utf8')).rows:[],rows=[];
  for(const id of ids){
   const emit=await pages[1].evaluate(id=>(id.startsWith('type:')?derive({...defaultsFor(id.slice(5)).P}):replicaPM(id).P).form==='emitset',id);
   const saved=prior.find(x=>x.id===id&&x.pass);
   if(!emit&&saved){rows.push({...saved,reused:true});continue;}
   const both=[];
   for(const p of pages){await p.bringToFront();both.push(await p.evaluate(async id=>{
    const P=id.startsWith('type:')?derive({...defaultsFor(id.slice(5)).P}):replicaPM(id).P;if(id==='FC6O'){P.sparkLateWind=0;P.sparkTailAfterBurn=0;P.sparkBrightCurve='';P.emberBrightCurve='';P.emberSizeCurve='';}
    const b=await bakeFinal(P,1,null),a=[];
    const put=async(q,label)=>{for(const k of ['head','tail'])if(q[k]){const bytes=readRGBA8(q[k]),h=await crypto.subtle.digest('SHA-256',bytes);a.push({label:label+'/'+k,shape:[q.N,q.NH,q.meta.L.cols,q.meta.L.rows,q.meta.L.F],hash:[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')});}};
    try{for(let s=b,i=0;s;s=s.next,i++)await put(s,'part'+i);for(const f of b.fades||[])await put(f,'fade'+f.fps);if(b.far)await put(b.far,'far');return a;}finally{disposeBake(b);}
   },id));}
   const pass=JSON.stringify(both[0])===JSON.stringify(both[1]);rows.push({id,pass,before:both[0],after:both[1]});
   fs.writeFileSync(out,JSON.stringify({pass:rows.every(x=>x.pass),completed:rows.length,total:ids.length,reference:'6902b0f2 (4.9.84)',rows},null,2));
   console.log(pass?'PASS':'FAIL',id,rows.length+'/'+ids.length);
  }
  fs.writeFileSync(out,JSON.stringify({pass:rows.every(x=>x.pass),completed:rows.length,total:ids.length,reference:'6902b0f2 (4.9.84)',introduced_candidates_checked_separately:introduced,reuse:prior.length?'RT6 最终内核重跑；其余花型渲染源码未变，复用首次全量像素检查。':null,rows},null,2));
  if(rows.some(x=>!x.pass))process.exitCode=1;
 }finally{await browser.close();fs.unlinkSync(ref);}
})().catch(e=>{console.error(e);process.exitCode=1;});
