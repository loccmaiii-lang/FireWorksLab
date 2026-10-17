// 真实HTTP页从左栏点三方案；核对运行参数/尺寸/命名、引擎回放和刷新持久入口。
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const out=path.join(root,'analysis/results/GLITTER_TWINKLE_20261017');
const require=createRequire('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright');
execFileSync('python',['-X','utf8','tool/local_http/preflight.py','--tool','baker'],{cwd:'F:/FireWorksLab',stdio:'inherit'});
const man=JSON.parse(fs.readFileSync(path.join(out,'配方清单.json'),'utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1600,height:1100}}),page=await context.newPage();
page.setDefaultTimeout(240000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));const rows=[];
try{
 await page.goto('http://127.0.0.1:8034/baker?fast',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.__fw);
 await page.evaluate(()=>{state.stillBusy=true;state.playing=false;state.autoBake=false;clearTimeout(bakeTimer);});
 await page.locator('#libSearch').fill('金曜菊-B');
 for(const v of man.variants){
  const id='GLB-'+v.id;console.log('UI OPEN',id);
  await page.getByRole('button',{name:new RegExp('^'+v.name.split(' · ')[1].replace(/[()（）]/g,'\\$&')+' '+id+'$')}).click();
  await page.waitForFunction(o=>lib.review?.id===o.id&&state.comboName===o.name&&state.tab==='combo'&&state.layers.length===3&&state.layers.every(L=>{const e=layerEntryOf(L);return e?.bake&&!layerStale(e);})&&!state.baking,{id,name:v.name});
  const actual=await page.evaluate(()=>({snap:mySnap(),size:sizeSpecCombo(state.layers),names:packNamesFor(wbKey(),lib.effect,3,'MyFx'),
   version:VERSION,entry:lib.review.id,rate:state.layers.map(x=>x.rate)}));
  const rec=JSON.parse(fs.readFileSync(path.join(root,v.myRecipe),'utf8'));
  for(let i=0;i<3;i++){assert.deepEqual(actual.snap.layers[i].P,rec.snap.layers[i].P);assert.deepEqual(actual.snap.layers[i].M,rec.snap.layers[i].M);}
  assert.equal(actual.size.target,32);assert.equal(actual.names.base,v.system);assert.deepEqual(actual.rate,[1.5,1.5,1.5]);
  await page.evaluate(()=>{state.stillBusy=false;state.playing=false;state.view='export';state.disp='fit';state.platform='pc';state.t=1.2;});
  const png=await page.evaluate(()=>__fw.thumbNow());fs.writeFileSync(path.join(out,id+'_列表回放.png'),Buffer.from(png.split(',')[1],'base64'));
  await page.screenshot({path:path.join(out,id+'_列表界面.png')});
  rows.push({id,parametersIdentical:true,size:actual.size,names:actual.names,rate:actual.rate,version:actual.version});
 }
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__fw);
 await page.locator('#libSearch').fill('金曜菊-B');
 assert.equal(await page.locator('.tiers .tier').filter({hasText:/GLB-S[123]/}).count(),3);
 fs.writeFileSync(path.join(out,'预览入口检查.json'),JSON.stringify({rows,refreshButtons:3,errors,passed:rows.length===3&&!errors.length},null,2));
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
