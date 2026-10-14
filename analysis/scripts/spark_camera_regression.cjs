// 默认关闭时使用完全相同的配方，在旧/新正式渲染核逐像素比较。
const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'analysis/results/SparkGraph');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});try{
 const old=path.join(root,'analysis/local/SparkGraph/baseline-4.9.83.html');let html=fs.readFileSync(old,'utf8');if(!html.includes('<base href'))fs.writeFileSync(old,html.replace('<head>','<head><base href="../../../tool/">'));
 const pages=[];for(const file of [old,path.join(root,'tool/FireworkBaker.html')]){const p=await b.newPage();await p.addInitScript('window.requestAnimationFrame=()=>0');await p.goto(pathToFileURL(file).href+'?fast');await p.waitForFunction(()=>window.__fw);await p.evaluate(()=>{clearTimeout(bakeTimer);state.autoBake=false;state.playing=false;state.stillBusy=true;});pages.push(p);}
 const saved=JSON.parse(fs.readFileSync(path.join(out,'镜头修订前参数.json'),'utf8')).entries,rows=[];
 for(const e of saved){const result=[];for(const p of pages)result.push(await p.evaluate(async e=>{const frames=await renderStills40(e.p,e.m,{px:512,times:[.4,.9,1.75]});return frames.map(f=>f.png);},e));assert.deepEqual(result[0],result[1]);rows.push({id:e.id,frames:3,identical:true});}
 fs.writeFileSync(path.join(out,'镜头关闭回归.json'),JSON.stringify({pass:true,rows},null,2));console.log(rows);
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
