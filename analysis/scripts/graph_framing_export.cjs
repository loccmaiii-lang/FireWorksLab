/* 固定取景实包：同一完整参数只替换bounds，正式HTTP导出两平台；不发布到UE或用户资源目录。 */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),{chromium}=require('playwright');
const R=path.resolve(__dirname,'../..'),O=path.join(R,'analysis/results/GraphFraming'),stage=process.argv.includes('--candidate')?'candidate':'before';
(async()=>{
 cp.execFileSync('python',['-X','utf8','tool/local_http/preflight.py','--tool','baker','--start'],{cwd:R,stdio:'inherit'});fs.mkdirSync(O,{recursive:true});
 const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});
 try{const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript('window.requestAnimationFrame=()=>0');await p.goto('http://127.0.0.1:8034/baker?fast');await p.waitForFunction(()=>window.__fw);
  await p.evaluate(()=>{state.autoBake=false;clearTimeout(bakeTimer);state.playing=false;state.stillBusy=true;});
  let cases;
  if(stage==='before'){cases=await p.evaluate(()=>['SGR1','SGS1','SGRS1'].map(id=>({id,...replicaPM(id),name:{SGR1:'RocketTail_Graph',SGS1:'Sparkler_Graph',SGRS1:'RocketTail_Soft'}[id]})));fs.writeFileSync(path.join(O,'原取景参数.json'),JSON.stringify(cases,null,2)+'\n');}
  else cases=JSON.parse(fs.readFileSync(path.join(O,'收紧取景参数.json'),'utf8'));
  const only=process.argv.find(x=>x.startsWith('--only='))?.slice(7);
  for(const c of cases.filter(c=>!only||c.id===only)){const dir=path.join(O,c.id,stage);fs.mkdirSync(dir,{recursive:true});
   const data=await p.evaluate(async c=>{const start=performance.now(),bytes=await __fw.exportFiles(c.P,c.M,'EFX_FireWorks_'+c.name,{naming:false,size:'none'});let raw='';for(let i=0;i<bytes.length;i+=32768)raw+=String.fromCharCode(...bytes.subarray(i,i+32768));return{base64:btoa(raw),version:VERSION,plan:graphPlan(c.P),ms:performance.now()-start};},c);
   fs.writeFileSync(path.join(dir,c.name+'.zip'),Buffer.from(data.base64,'base64'));delete data.base64;fs.writeFileSync(path.join(dir,'导出核对.json'),JSON.stringify({...data,P:c.P,M:c.M},null,2)+'\n');
   fs.writeFileSync(path.join(dir,c.name+'.recipe.json'),JSON.stringify({format:'fwl.recipe/1',key:'rv:'+c.id,name:c.name,base:c.id,baker:data.version,snap:{kind:'single',repId:c.id,P:c.P,M:c.M}},null,2)+'\n');console.log(c.id+' '+stage+' 已实际导出 '+data.version+' '+Math.round(data.ms)+'ms');
  }
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
