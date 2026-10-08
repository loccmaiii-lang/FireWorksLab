// Compare full baked RGBA bytes for baseline templates and all approved/review candidates.
const fs=require('fs'),path=require('path');
const {pathToFileURL}=require('url');
const {chromium}=require('playwright');
const [before,after,out,only='']=process.argv.slice(2);
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
 const sets=[];
 try {
  for(const file of [before,after]) {
   const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript('window.requestAnimationFrame=()=>0');
   await page.goto(pathToFileURL(path.resolve(file)).href+'?fast');
   const gpu=await page.locator('#gpu').getAttribute('title');
   if(/SwiftShader|software/i.test(gpu))throw Error('Expected GPU: '+gpu);
   let cases=await page.evaluate(()=>{
    const ids=new Set();
    for(const ef of EFFS()) for(const id of [ef.待验收版,ef.已通过版,['已通过','待验收'].includes(ef.阶段)?ef.主条目:null].filter(Boolean)) {
     const e=entryById(id);
     if(e?.kind==='combo') e.layerIds.forEach(x=>ids.add(x));
     else if(REPLICA_BY_ID[String(id).replace(/^rep:/,'')])ids.add(String(id).replace(/^rep:/,''));
    }
    return ['kiku','botan','kamuro','senrin','strobe','crackle'].map(type=>({type})).concat([...ids].sort().map(id=>({id})));
   });
   if(only) cases=cases.filter(x=>only.split(',').includes(x.id||x.type));
   const result={gpu,cases:[]};
   for(const entry of cases) {
    const r=await page.evaluate(async entry=>{
     const {P}=entry.type?defaultsFor(entry.type,40):replicaPM(entry.id);
     const b=await bake(P,1,null),textures=[];
     const capture=async(s,part)=>{
      for(const k of ['head','tail'])if(s[k]) {
       const bytes=readRGBA8(s[k]);
       const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
       textures.push({part:part+'/'+k,W:s.N,H:s.NH,F:s.meta.L.F,hash});
      }
     };
     try{for(let s=b,i=0;s;s=s.next,i++)await capture(s,'segment'+i);for(const f of b.fades||[])await capture(f,'fade'+f.fps);return {entry,textures};}
     finally{disposeBake(b);}
    },entry);
    result.cases.push(r);console.log(sets.length?'after':'before',JSON.stringify(entry),r.textures.length);
   }
   if(errors.length)throw Error(errors.join('\n'));
   sets.push(result);await page.close();
  }
  const pass=JSON.stringify(sets[0].cases)===JSON.stringify(sets[1].cases);
  fs.writeFileSync(out,JSON.stringify({pass,before:sets[0],after:sets[1]},null,2));
  console.log(pass?'PASS: all RGBA texture hashes identical':'FAIL');if(!pass)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
