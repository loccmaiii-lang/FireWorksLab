// 正式发布入口与适用范围；不另改生产配方。
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});try{
 const p=await b.newPage();await p.goto(pathToFileURL(path.join(root,'tool/FireworkBaker.html')).href+'?fast');await p.waitForFunction(()=>window.__fw&&__fw.idle(),null,{timeout:180000});
 const r=await p.evaluate(async()=>{
  const rows=['CSLRC','CSLRS'].map(id=>{const e=FW_REVIEW_LIST.find(x=>x.id===id),ef=FW_EFFECTS.find(x=>x.主条目===id),s=FW_STANDARD.items[id];return{id,stage:ef.阶段,standardPass:s.pass,sameVersion:s.ver===entryVer(e)};});
  const original=['CS3C','CS3S'].map(id=>({id,stage:FW_EFFECTS.find(x=>x.主条目===id).阶段}));
  const unsupported=[];
  for(const key of ['rtLateWind','rtETex','rtTailAfterBurn']){try{await bakeEmitSet({...BASE,rtLateWind:0,rtETex:0,rtTailAfterBurn:0,[key]:1},1,null);unsupported.push({key,blocked:false});}catch(e){unsupported.push({key,blocked:e.message.includes('合并全程'),message:e.message});}}
  return{version:VERSION,rows,original,unsupported};
 });
 assert.equal(r.version,'4.9.82');assert(r.rows.every(x=>x.stage==='待验收'&&x.standardPass&&x.sameVersion));assert(r.original.every(x=>x.stage==='已通过'));assert(r.unsupported.every(x=>x.blocked));
 fs.writeFileSync(path.join(root,'analysis/results/CS3_Layers/正式入口检查.json'),JSON.stringify({pass:true,...r},null,2));console.log('PASS 正式待验收入口、检查指纹、原件状态、三项不支持输出均明确拦截');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
