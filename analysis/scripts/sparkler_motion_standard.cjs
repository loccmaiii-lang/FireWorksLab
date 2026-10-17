// 复用标准探针计算本轮P/M；只替换参数输入，不替换测量算法。
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.resolve(root,process.env.SPARKLER_RESULT_DIR||'analysis/results/SparklerMotion');
const source=fs.readFileSync(path.join(root,'analysis/scripts/烘焙器探针.py'),'utf8'),match=/JS_METRICS = r"""([\s\S]*?)"""/.exec(source);
assert(match&&match[1].includes('const r = __fw.replicaPM(id);'));const fn=match[1].replace('const r = __fw.replicaPM(id);','const r = window.__motionCandidate;');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});try{const p=await b.newPage();await p.addInitScript('window.requestAnimationFrame=()=>0');await p.goto('http://127.0.0.1:8034/baker?fast');await p.waitForFunction(()=>window.__fw);
 await p.evaluate(v=>{state.autoBake=false;clearTimeout(bakeTimer);state.playing=false;state.stillBusy=true;window.__motionCandidate=v;},JSON.parse(fs.readFileSync(path.join(out,'候选参数.json'),'utf8')));
 const metrics=await p.evaluate(({fn,args})=>eval('('+fn+')')(args),{fn,args:{id:'SGS1',fps:30,dists:[800,1000,1200],screenH:1080,frac:1/3}});assert(metrics?.grid&&Object.keys(metrics.sizeResponse).length===13);fs.writeFileSync(path.join(out,'标准探针.json'),JSON.stringify({version:await p.evaluate(()=>VERSION),metrics},null,2));console.log('同一标准探针已测候选13层尺寸响应、格子、帧率与观看尺度');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
