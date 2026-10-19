/* 4.9.118取景真实入口集成：隔离Edge、编辑/撤销/保存刷新、原生配方、引擎回放和ZIP下载；不写UE。 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const R=path.resolve(__dirname,'../..'),O=path.join(R,'analysis/results/GraphFraming'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sources=[
 'analysis/我的配方/my_fxmv96inysff36h/正式资产-窜天猴尾焰__fxmv96inysff36h.json',
 'analysis/我的配方/my_fxmv9h8webs6bnz/正式资产-窜天猴尾焰-粒子__fxmv9h8webs6bnz.json',
 'analysis/我的配方/my_fxrockettailsoft20261018/正式资产-窜天猴尾焰-柔光暗底__fxrockettailsoft20261018.json'
];
const report={pass:false,phase:'初始化',rows:[],errors:[],consoleErrors:[],sourceSHA256:Object.fromEntries(sources.map(f=>[f,sha(fs.readFileSync(path.join(R,f)))]))};
let browser,page;
const save=()=>fs.writeFileSync(path.join(O,'UI集成检查.json'),JSON.stringify(report,null,2)+'\n');
async function phase(name){report.phase=name;save();console.log(name);}
async function outputControls(){
 const tab=page.locator('#params .etabs [data-e="输出"]');
 if(await tab.isVisible())await tab.click();else await page.getByLabel('更多发射器与输出',{exact:true}).selectOption('输出');
 const details=page.locator('#params section.egrp[data-g="输出"] details').filter({has:page.locator('summary').filter({hasText:/^取景/})});
 if(!await details.count())throw Error('输出页缺少取景模块');
 if(!await details.first().evaluate(e=>e.open))await details.first().locator('summary').first().click();
 for(const name of ['左边界','右边界','下边界','上边界'])assert(await page.getByRole('spinbutton',{name:name+'（m） 数值',exact:true}).isVisible(),name+'未可见');
}
async function tailExportOnly(){
 execFileSync('python',['-X','utf8','tool/local_http/preflight.py','--tool','baker','--start'],{cwd:R,stdio:'inherit'});
 const r={pass:false,phase:'尾焰主按钮导出',errors:[]},write=()=>fs.writeFileSync(path.join(O,'UI尾焰导出检查.json'),JSON.stringify(r,null,2)+'\n');
 const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});
 try{const p=await b.newPage({viewport:{width:1600,height:1000},acceptDownloads:true});p.on('pageerror',e=>r.errors.push(e.message));await p.goto('http://127.0.0.1:8034/baker?fast');await p.waitForFunction(()=>window.__fw);
  await p.evaluate(()=>{state.autoBake=false;clearTimeout(bakeTimer);openReview(entryById('SGR1'));state.playing=false;});await p.waitForFunction(()=>wbIdle()&&!!state.P.sparkGraph,null,{timeout:300000});
  const recipe=path.join(O,'SGR1/candidate/RocketTail_Graph.recipe.json'),doc=JSON.parse(fs.readFileSync(recipe,'utf8'));assert.equal(doc.snap.kind,'single');await p.locator('#abFile').setInputFiles(recipe);await p.waitForFunction(g=>JSON.stringify(state.P.sparkGraph)===JSON.stringify(g),doc.snap.P.sparkGraph);
  await p.locator('[data-view="export"]').click();await p.waitForFunction(()=>!state.baking&&wbIdle()&&state.bake&&!state.dirty&&state.bakeGen===state.gen,null,{timeout:300000});await p.locator('[data-disp="fit"]').click();
  r.preview=await p.evaluate(()=>{const b=state.bake,m=b.meta,e=gl.getExtension('WEBGL_debug_renderer_info');return{version:VERSION,renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),scale:b.scale,N:b.N,NH:b.NH,cw:b.cw,chh:b.chh,planCell:[m.L.cellW,m.L.cellH],quality:m.quality,inputQuality:{ss:b.P.qSS,hz:b.P.qHz,maxSub:b.P.qMaxSub},frames:m.L.F,check:m.check,bounds:b.P.sparkGraph.bounds,cx:m.cx,cy:m.cy};});write();await p.screenshot({path:path.join(O,'UI-SGR1-预览自检证据.png')});
  await p.locator('#deliveryOpen').click();const options=p.locator('#deliveryOptions');if(!await options.evaluate(e=>e.open))await options.locator('summary').click();await p.locator('#deliveryDestination').selectOption('zip');await p.locator('#deliveryMake').click();
  const pending=p.waitForEvent('download',{timeout:300000});await p.locator('#abExportPack').click();const download=await pending,zip=path.join(O,'UI-SGR1-'+download.suggestedFilename());await download.saveAs(zip);assert.equal(await download.failure(),null);r.download={file:path.relative(R,zip),bytes:fs.statSync(zip).size,sha256:sha(fs.readFileSync(zip))};write();
  const py=String.raw`from pathlib import Path
import sys,json,zipfile,tempfile,shutil,importlib
R=Path.cwd();O=R/'analysis/results/GraphFraming';z=Path(sys.argv[1]);sys.path.insert(0,str(R/'analysis/scripts'));rc=importlib.import_module('回放检查')
native=json.loads((O/'SGR1/candidate/RocketTail_Graph.recipe.json').read_text(encoding='utf-8'))['snap']
report={'platforms':{},'candidateRecipeSame':False}
with tempfile.TemporaryDirectory(prefix='UI-尾焰RC-',dir=O) as temp:
 t=Path(temp).resolve();assert t.is_relative_to(O.resolve())
 with zipfile.ZipFile(z) as a:
  for f in a.namelist():assert (t/f).resolve().is_relative_to(t)
  a.extractall(t)
 root=next(t.rglob('cascade.json')).parent
 meta=[json.loads(p.read_text(encoding='utf-8')) for p in root.glob('*.json') if p.name not in ['cascade.json','cascade_mobile.json']]
 main=next(d for d in meta if isinstance(d,dict) and 'params' in d and d.get('texture',{}).get('width',0)>=2048)
 assert main['params']['sparkGraph']==native['P']['sparkGraph'];assert main['materialDefaults']==native['M'];report['candidateRecipeSame']=True
 report['tool']=main['tool'];report['exportSelfCheck']=main['selfCheck']
 for platform,cfg in [('PC','cascade.json'),('手机','cascade_mobile.json')]:
  spec=json.loads((root/cfg).read_text(encoding='utf-8'));view=root
  if platform=='手机':
   view=t/'mobile-view';view.mkdir();shutil.copy2(root/cfg,view/'cascade.json')
   for tex in spec['textures'].values():shutil.copy2(root/tex['file'],view/tex['file'])
  pack=rc.Pack(str(view),0);result=rc.check([pack],str(O/f'UI-SGR1-{platform}-RC.jpg'),times_s=[.1,.4,.89,1.3,1.73,1.95]);report['platforms'][platform]=result;assert result['pass'],result['layers'][0]['fails']
  with zipfile.ZipFile(O/'SGR1/candidate/RocketTail_Graph.zip') as old:
   name=next(n for n in old.namelist() if n.endswith('/'+cfg) or n==cfg);prior=json.loads(old.read(name));a=prior['emitters'][0];b=spec['emitters'][0]
   keys=['Lifetime','InitialSize','InitialLocation','DynamicParameter'];assert [m for m in a['modules'] if m['m'] in keys]==[m for m in b['modules'] if m['m'] in keys]
   assert a['required'].get('pivot_offset')==b['required'].get('pivot_offset')
  report['platforms'][platform]['candidateFrameSizePivotSame']=True
 report['pass']=all(v['pass'] for v in report['platforms'].values())
(O/'UI尾焰ZIP实包RC.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:{'pass':v['pass'],'cell':v['layers'][0]['cell_px'],'saturated_max':v['layers'][0]['saturated_max'],'edge_max':v['layers'][0]['edge_max']} for k,v in report['platforms'].items()},ensure_ascii=False))`;
  console.log(execFileSync('python',['-X','utf8','-',zip],{cwd:R,input:py,encoding:'utf8',maxBuffer:4e6}));r.rc=JSON.parse(fs.readFileSync(path.join(O,'UI尾焰ZIP实包RC.json'),'utf8'));assert(r.rc.pass);r.sourcesUnchanged=sources.every(f=>sha(fs.readFileSync(path.join(R,f)))===report.sourceSHA256[f]);assert(r.sourcesUnchanged);assert.deepEqual(r.errors,[]);r.pass=true;r.phase='主按钮尾焰ZIP及PC手机实包通过';write();
 }catch(e){r.failure={message:e.message,stack:e.stack};write();throw e;}finally{await b.close();r.browserClosed=true;write();}
}
async function main(){
 execFileSync('python',['-X','utf8','tool/local_http/preflight.py','--tool','baker','--start'],{cwd:R,stdio:'inherit'});
 browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});
 try{page=await browser.newPage({viewport:{width:1600,height:1000},acceptDownloads:true});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
  await page.goto('http://127.0.0.1:8034/baker?fast');await page.waitForFunction(()=>window.__fw);report.version=await page.evaluate(()=>VERSION);assert.equal(report.version,'4.9.118');
  await page.evaluate(()=>{state.autoBake=false;clearTimeout(bakeTimer);state.playing=false;});
  for(const [id,base]of [['SGR1','RocketTail_Graph'],['SGS1','Sparkler_Graph'],['SGRS1','RocketTail_Soft']]){
   await phase(id+'：打开候选及输出取景');
   const recipe=path.join(O,id,'candidate',base+'.recipe.json'),doc=JSON.parse(fs.readFileSync(recipe,'utf8'));assert.equal(doc.snap.kind,'single');
   await page.evaluate(id=>{state.autoBake=false;clearTimeout(bakeTimer);setViewSeg('live');openReview(entryById(id));state.playing=false;},id);
   await page.waitForFunction(()=>!!state.P.sparkGraph&&wbIdle()&&!!undo.last,null,{timeout:300000});
   assert(await page.evaluate(g=>JSON.stringify(state.P.sparkGraph)===JSON.stringify(g),doc.snap.P.sparkGraph),'候选入口参数与原生文件不一致：'+id);
   await outputControls();
   const row={id,recipe:path.relative(R,recipe),recipeSHA256:sha(fs.readFileSync(recipe)),candidateOpened:true,fourBoundsVisible:true,bounds:doc.snap.P.sparkGraph.bounds};report.rows.push(row);save();
   if(id==='SGR1'){
    await phase(id+'：右边界编辑、撤销、重做、另存及刷新');
    const input=page.getByRole('spinbutton',{name:'右边界（m） 数值',exact:true}),old=Number(await input.inputValue()),next=+(old+.1).toFixed(2);
    await input.fill(String(next));await input.press('Tab');await page.waitForFunction(v=>state.P.sparkGraph.bounds[1]===v,next);await page.waitForTimeout(500);
    await page.locator('#abUndo').click();await page.waitForFunction(v=>state.P.sparkGraph.bounds[1]===v,old);
    await page.locator('#abRedo').click();await page.waitForFunction(v=>state.P.sparkGraph.bounds[1]===v,next);
    await page.locator('#abSaveAs').click();await page.locator('#saveNameInput').fill('UI临时检查-尾焰取景-'+Date.now());const tempName=await page.locator('#saveNameInput').inputValue();await page.locator('#saveNameSubmit').click();await page.waitForFunction(name=>lib.my?.name===name,tempName);
    const tempId=await page.evaluate(()=>lib.my.id);await page.reload();await page.waitForFunction(()=>window.__fw);await page.evaluate(async id=>{state.autoBake=false;clearTimeout(bakeTimer);await openMyEffect(id);state.playing=false;},tempId);
    assert.equal(await page.evaluate(()=>state.P.sparkGraph.bounds[1]),next);await outputControls();assert.equal(Number(await page.getByRole('spinbutton',{name:'右边界（m） 数值',exact:true}).inputValue()),next);
    Object.assign(row,{edit:true,undo:true,redo:true,saveAsNew:true,saveReload:true,tempId,editedRight:next});save();
   }
   await phase(id+'：原生单层配方导入与实际烘焙回放');
   // 「另存为我的效果」按现有规则可能派生成一个单层组合；单层配方须回到同类型候选入口导入。
   if(await page.evaluate(()=>state.tab==='combo')){await page.evaluate(id=>{state.autoBake=false;clearTimeout(bakeTimer);setViewSeg('live');openReview(entryById(id));state.playing=false;},id);await page.waitForFunction(()=>state.tab!=='combo'&&!!state.P.sparkGraph);}
   await page.locator('#abFile').setInputFiles(recipe);
   await page.waitForFunction(g=>JSON.stringify(state.P.sparkGraph)===JSON.stringify(g),doc.snap.P.sparkGraph,{timeout:30000});
   for(const key of ['ramp0','ramp1','ramp2','ramp3'])assert.equal(await page.evaluate(k=>state.M[k],key),doc.snap.M[key]);
   row.nativeRecipeImport=true;await page.locator('[data-view="export"]').click();
   await page.waitForFunction(()=>!state.baking&&wbIdle()&&!!state.bake&&!state.dirty&&state.bakeGen===state.gen,null,{timeout:300000});
   await page.locator('[data-disp="fit"]').click();await outputControls();
   row.bake=await page.evaluate(()=>({form:state.bake.form,frames:state.bake.meta.L.F,Ww:state.bake.meta.Ww,Wh:state.bake.meta.Wh,cx:state.bake.meta.cx,cy:state.bake.meta.cy,view:state.view,dirty:state.dirty}));
   assert.equal(row.bake.view,'export');assert.equal(row.bake.frames,64);assert.equal(row.bake.dirty,false);
   await page.locator('#loopChk').check();await page.locator('#speed').selectOption('1');await page.locator('#replay').click();
   const ticks=[];for(let i=0;i<32;i++){await page.waitForTimeout(250);ticks.push(await page.evaluate(()=>state.t));}
   const wraps=ticks.filter((v,i)=>i&&v<ticks[i-1]).length;assert(wraps>=3,'正常回放不足三个循环：'+id+' '+wraps);if(await page.evaluate(()=>state.playing))await page.locator('#play').click();
   Object.assign(row,{playbackSeconds:8,wraps,ticks,continuousThreeCycles:true});
   await page.evaluate(()=>{state.t=.89;});await page.waitForTimeout(100);await page.screenshot({path:path.join(O,'UI-'+id+'-输出取景与引擎回放.png')});save();
  }
  await phase('SGRS1：通过真实按钮下载ZIP');
  await page.locator('#deliveryOpen').click();const options=page.locator('#deliveryOptions');if(!await options.evaluate(e=>e.open))await options.locator('summary').click();await page.locator('#deliveryDestination').selectOption('zip');await page.locator('#deliveryMake').click();
  const pending=page.waitForEvent('download',{timeout:300000});await page.locator('#abExportPack').click();const download=await pending,zip=path.join(O,'UI-'+download.suggestedFilename());await download.saveAs(zip);assert.equal(await download.failure(),null);assert(fs.statSync(zip).size>0);
  report.download={file:path.relative(R,zip),bytes:fs.statSync(zip).size,sha256:sha(fs.readFileSync(zip)),via:'真实导出素材包按钮；导出方式=下载ZIP'};
  await page.waitForFunction(()=>!state.baking&&!busyJob.on,null,{timeout:300000});await page.screenshot({path:path.join(O,'UI-ZIP导出完成.png')});
  report.sourcesUnchanged=sources.every(f=>sha(fs.readFileSync(path.join(R,f)))===report.sourceSHA256[f]);assert(report.sourcesUnchanged,'原用户存档发生变化');assert.deepEqual(report.errors,[]);
  report.pass=true;await phase('完成：三个候选真实入口/三周期回放、保存刷新、原生文件及ZIP下载通过');
 }catch(e){report.failure={message:e.message,stack:e.stack};if(page&&!page.isClosed()){report.pageState=await page.evaluate(()=>({status:document.querySelector('#status')?.textContent,view:state.view,baking:state.baking,dirty:state.dirty,phase:document.querySelector('#busyText')?.textContent})).catch(x=>({readError:x.message}));await page.screenshot({path:path.join(O,'UI-失败.png')}).catch(()=>{});}save();throw e;
 }finally{if(browser)await browser.close();report.browserClosed=true;save();}
}
(process.argv.includes('--tail-export-only')?tailExportOnly():main()).catch(e=>{console.error(e);process.exitCode=1});
