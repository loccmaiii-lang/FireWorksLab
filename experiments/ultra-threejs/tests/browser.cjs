const fs=require('node:fs');
const path=require('node:path');
let chromium;
try { ({chromium}=require('playwright')); }
catch { ({chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const root=path.resolve(__dirname,'..'),out=path.join(root,'outputs');
fs.mkdirSync(out,{recursive:true});
const url=process.env.THREE_LAB_URL||'http://127.0.0.1:18767/experiments/ultra-threejs/';
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11']});
  const page=await browser.newPage({viewport:{width:1500,height:1050}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(url);
  await page.waitForFunction(()=>window.THREE_LAB&&!THREE_LAB.state.loading,{},{timeout:60000});
  const initial=await page.evaluate(()=>{
    const l=THREE_LAB;l.renderAt(1.6,{width:1024,ss:1,output:'bytes'});
    const p=l.engine.readOutput();let sum=0,nonzero=0;
    for(let i=0;i<p.length;i+=4){sum+=p[i]+p[i+1]+p[i+2];if(p[i]+p[i+1]+p[i+2]>20)nonzero++;}
    return {sum,nonzero,error:l.state.error,gl:l.engine.renderer.getContext().getError(),info:l.engine.renderer.info.memory};
  });
  await page.screenshot({path:path.join(out,'JM-page.png')});
  fs.writeFileSync(path.join(out,'smoke.json'),JSON.stringify({initial,errors},null,2));
  console.log(JSON.stringify({initial,errors}));
  await browser.close();
  if(errors.length||initial.gl||initial.nonzero<100)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
