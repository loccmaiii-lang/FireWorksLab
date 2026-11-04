const fixture=require('./fixtures/show-fixture.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync('../df-fx-workbench_v2_locmai.html','utf8');
assert(html.includes('id="df-pattern-copy"'),'模板参数复制入口尚未实现');
assert(html.includes('id="df-pattern-shape"'),'非扇形资源段编辑入口尚未实现');
const context=vm.createContext({});
for(const name of ['show-bp-data.js','show-text.js','show-catalog.js','show-fan.js','show-plan.js','show-sequence.js'])vm.runInContext(fs.readFileSync(name,'utf8'),context,{filename:name});
vm.runInContext('var SampleSubtemplates='+JSON.stringify(fixture.samples.subtemplates)+'; for(const n of '+JSON.stringify(Object.keys(fixture.keys))+')ShowCatalog.add(SampleSubtemplates[n],{localOnly:false});',context);
const evaluate=code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',context));
assert.deepEqual(evaluate('Object.values(ShowCatalog.profiles).filter(p=>p.kind==="resource"&&!p.isBlank).map(p=>p.name).sort()'),['FanComet','FanGold','FanSilver']);
console.log('基础入口与三套素材通过');
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS '+name);}
const near=(a,b,tolerance=1e-6)=>assert(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
function run(code){return vm.runInContext(code,context);}
check('FanGold10方向、四资源角色和当前固定组导出',()=>{
  const result=evaluate('ShowText.generate({mode:"resource",settings:{heightJitter:0},events:ShowPlan.make({profile:"gold",count:10,spread:98,layout:"native",sizeLayout:"native",angleJitter:0,sizeJitter:0,heightJitter:0,order:"together"}).events,profile:ShowCatalog.profiles.gold,name:"FanGold_New"})');
  result.record.Entries.forEach((e,i)=>near(e.RotationOffset.Roll,[-48,-37,-27,-16.5,-5,5.5,17,28,39,49][i]));
  const roles=result.record.Entries.map(e=>e.FXResourceId.split('FanGold_')[1]);assert.deepEqual(roles,['OuterLeft','OuterLeft','Middle_01','Middle_01','Central_01','Central_01','Middle_01','Middle_01','OuterRight','OuterRight']);
  assert(result.text.startsWith('(TemplateName="FanGold_New",Entries=(('));assert(result.text.includes('Roll=-16.500000'));result.record.Entries.forEach(e=>{assert.equal(e.LocalTimeOffset,0);assert.deepEqual(e.RandomRotationRange,{Pitch:0,Yaw:0,Roll:0});assert.equal(e.Filter.PlatformFlags,14);});
});
check('Silver尺度与固定位置、不同数量和顺序完整写入',()=>{
  run('var silverSettings=ShowPlan.valid({profile:"silver",count:16,spread:100,order:"rl",start:1.25,interval:.12,angleJitter:2,sizeJitter:5,heightJitter:0});var silverPlan=ShowPlan.make(silverSettings);var silverExport=ShowText.generate({mode:"resource",settings:silverSettings,events:silverPlan.events,profile:ShowCatalog.profiles.silver,name:"Silver_New"});');
  const record=evaluate('silverExport.record'),events=evaluate('silverPlan.events');assert.equal(record.Entries.length,16);
  record.Entries.forEach((e,i)=>{near(e.LocalTimeOffset,events[i].fire);near(e.RotationOffset.Roll,events[i].angle);near(e.EffectScale.X,events[i].size);assert.equal(e.PositionOffset.Z,10);assert.equal(e.RandomPositionRange.Z,0);assert.equal(e.RandomScaleRatio,0);});
  const restored=evaluate('ShowText.parse(silverExport.text)');restored.Entries.forEach((e,i)=>near(e.EffectScale.X,record.Entries[i].EffectScale.X));
});
check('父模板仅复用完整子模板，单发射点和内部时长保留',()=>{
  const out=evaluate('ShowText.generate({mode:"template",settings:{heightJitter:0},events:ShowPlan.make({profile:"goldspark",count:3,order:"rl",start:1,heightJitter:0},"template").events,profile:ShowCatalog.profiles.goldspark,name:"Show_Test"})');
  assert.equal(out.record.RequiredPointCount,1);const parsed=JSON.parse(run('JSON.stringify(ShowText.parse('+JSON.stringify(out.text)+'))'));assert.equal(parsed.Entries.length,3);parsed.Entries.forEach(e=>{assert.equal(e.EntryType,'SubTemplate');assert.equal(e.SubTemplateName,'GoldSpark');assert.equal(e.SlotIndex,0);assert.equal(e.FXResourceId,'None');assert(!Object.hasOwn(e,'BurstTime'));});assert.equal(out.record.Filter.PlatformFlags,14);
});
check('高度不冒充发射位置；须明确按原高度导出',()=>{
  assert.throws(()=>run('ShowText.generate({mode:"resource",settings:{heightJitter:4},events:ShowPlan.make({profile:"silver",count:1}).events,profile:ShowCatalog.profiles.silver,name:"H"})'),/升空高度/);
  const out=evaluate('ShowText.generate({mode:"resource",settings:{heightJitter:4},events:ShowPlan.make({profile:"silver",count:1}).events,profile:ShowCatalog.profiles.silver,name:"H",allowOriginalHeight:true})');assert.equal(out.record.Entries[0].PositionOffset.Z,10);assert(out.heightOmitted);
});
check('受限解析器支持稀疏BP格式与转义，拒绝畸形或注入',()=>{
  const text='(TemplateName="FanNew",Entries=((FXResourceId="P_Test",RotationOffset=(Roll=12.500000),RandomRotationRange=(Pitch=5,Yaw=5,Roll=0))))';const sub=JSON.parse(run('JSON.stringify(ShowText.subtemplate(ShowText.parse('+JSON.stringify(text)+')))'));assert.equal(sub.Entries[0].EffectScale.Z,1);assert.equal(sub.Entries[0].Filter.PlatformFlags,14);
  run('var escaped=ShowText.stringify({...silverExport.record,TemplateName:'+JSON.stringify('新模板 "A" \\ B')+'});');assert.equal(evaluate('ShowText.parse(escaped).TemplateName'),'新模板 "A" \\ B');
  for(const invalid of ['(TemplateName="A",TemplateName="B",Entries=())','(constructor=1)','(TemplateName="A",Entries=()) trailing','(TemplateName="A",Entries=((FXResourceId="P"))) + alert(1)'])assert.throws(()=>run('ShowText.parse('+JSON.stringify(invalid)+')'));
});
check('新造型由数据生成；同步和恢复不写死两个选项',()=>{
  run('var added=ShowCatalog.add({TemplateName:"NewShape",Entries:[{FXResourceId:"P_New",RotationOffset:{Roll:-20}},{FXResourceId:"P_New",RotationOffset:{Roll:0}},{FXResourceId:"P_New",RotationOffset:{Roll:20}}]});');assert.equal(evaluate('ShowPlan.make({profile:added,count:20,heightJitter:0}).events.length'),20);
  const before=evaluate('Object.keys(ShowCatalog.profiles).length');assert.throws(()=>run('ShowCatalog.add({TemplateName:"Broken",Entries:[{FXResourceId:""}]})'));assert.equal(evaluate('Object.keys(ShowCatalog.profiles).length'),before);
  assert.throws(()=>run('ShowCatalog.sync([{TemplateName:"Same",Entries:[{FXResourceId:"P_A"}]},{TemplateName:"same",Entries:[{FXResourceId:"P_B"}]}])'),/同名/);
  run('var catalogState=ShowCatalog.snapshot();ShowCatalog.restore(catalogState);');assert.equal(evaluate('ShowCatalog.profiles[added].name'),'NewShape');
});
check('固定Cascade时长3.5/5/8秒，与大小高度随机无关',()=>{
  for(const [tier,seconds] of [['small',3.5],['medium',5],['large',8]]){
    run('var seq=ShowSequence.preset("goldspark");seq.category='+JSON.stringify(tier)+';seq.flight=ShowSequence.sizes[seq.category].flight;seq.maximumHeight=200;seq.baseHeight=200;seq.sizeJitter=20;seq.heightJitter=15;var result=ShowSequence.make(seq,"Sequence_Test");');
    const out=evaluate('result');assert.equal(out.record.Entries[1].LocalTimeOffset,seconds);near(out.events[0].life,seconds);assert(out.chosenHeight>=170&&out.chosenHeight<=200);
  }
});
check('爆炸额外延迟、开始时间和真实厘米位置正确',()=>{
  run('var seq=ShowSequence.preset("goldspark");seq.start=1.5;seq.flight=8;seq.maximumHeight=400;seq.heightJitter=0;seq.angleJitter=0;seq.stages.forEach(s=>{s.entry.RandomRotationRange={Pitch:0,Yaw:0,Roll:0};s.entry.RandomPositionRange={X:0,Y:0,Z:0};});seq.roll=30;seq.stages[1].extraDelay=1.2;var result=ShowSequence.make(seq,"Sequence_Test");');const out=evaluate('result');near(out.record.Entries[0].LocalTimeOffset,1.5);near(out.record.Entries[1].LocalTimeOffset,10.7);near(out.record.Entries[1].PositionOffset.Y,20000);near(out.record.Entries[1].PositionOffset.Z,40000*Math.cos(Math.PI/6));assert.equal(out.record.Entries[0].PositionOffset.Z,0);
});
check('尾缀Z缩放明确选择；高度与大小通道独立，最高高度是上限',()=>{
  run('var seq=ShowSequence.preset("goldspark");seq.maximumHeight=400;seq.baseHeight=400;seq.heightJitter=12;seq.applyHeightScale=true;var first=ShowSequence.make(seq,"Z_Test");seq.sizeJitter=40;var second=ShowSequence.make(seq,"Z_Test");');const a=evaluate('first'),b=evaluate('second');near(a.chosenHeight,b.chosenHeight);assert(a.chosenHeight<=400&&a.chosenHeight>=352);near(a.record.Entries[0].EffectScale.Z,a.chosenHeight/400);near(b.record.Entries[0].EffectScale.Z,a.record.Entries[0].EffectScale.Z);assert.equal(a.record.Entries[0].LocalTimeOffset,b.record.Entries[0].LocalTimeOffset);
});
check('逐段随机取样固定、导出没有二次随机，资源输入无静默成功',()=>{
  run('var seq=ShowSequence.preset("goldspark");seq.stages[0].entry.RandomRotationRange.Pitch=5;seq.stages[0].entry.RandomPositionRange.X=50;seq.stages[0].entry.RandomScaleRatio=.1;var a=ShowSequence.make(seq,"A");var b=ShowSequence.make(seq,"A");');assert.deepEqual(evaluate('a.record'),evaluate('b.record'));const e=evaluate('a.record.Entries[0]');assert(e.RotationOffset.Pitch!==0);assert(e.PositionOffset.X!==0);assert.equal(e.RandomScaleRatio,0);assert.deepEqual(e.RandomPositionRange,{X:0,Y:0,Z:0});
  run('seq.stages[0].entry.FXResourceId="";var bad=ShowSequence.make(seq,"A");');assert(evaluate('bad.errors.length')>0);
});
check('参数重新载入编辑器不叠加开始时间或丢失额外资源时间',()=>{
  run('var seq=ShowSequence.preset("goldspark");seq.start=1.5;seq.stages[1].extraDelay=1.2;seq.stages.push({role:"other",entry:{...seq.stages[0].entry,FXResourceId:"P_Extra",LocalTimeOffset:3},extraDelay:0});var original=ShowSequence.make(seq,"Reload");var imported=ShowSequence.make(ShowSequence.fromRecord(original.record),"Reload");');
  const a=evaluate('original.record'),b=evaluate('imported.record');a.Entries.forEach((e,i)=>{near(e.LocalTimeOffset,b.Entries[i].LocalTimeOffset);for(const axis of ['X','Y','Z'])near(e.PositionOffset[axis],b.Entries[i].PositionOffset[axis]);});
});
check('未填写资源段也能刷新恢复草稿，不变成默认已填模板',()=>{
  const state=evaluate('ShowSequence.restore({...ShowSequence.blank(),stages:[{role:"launch",entry:{...ShowSequence.preset("goldspark").stages[0].entry,FXResourceId:""},extraDelay:0}]})');assert.equal(state.stages.length,1);assert.equal(state.stages[0].entry.FXResourceId,'');
});
check('实际BP17组全部可读，多轮扇形保留为完整子模板而非展平',()=>{
  const result=evaluate('ShowCatalog.sync(Object.values(SampleSubtemplates))');assert.equal(result.skipped,0);
  assert.equal(evaluate('ShowCatalog.profiles[ShowCatalog.find("FanComet_B1")].kind'),'template');
  assert.deepEqual(evaluate('ShowCatalog.profiles[ShowCatalog.find("FanComet_A1")].source.Entries.map(e=>e.LocalTimeOffset)'),[0,.2,.3,.4,.5]);
  for(const key of ['FanGold','FanSilver','FanComet'])assert.equal(evaluate('ShowCatalog.profiles[ShowCatalog.find('+JSON.stringify(key)+')].kind'),'resource');
});
function boot(options={}){
  const errors=[],requests=[],clipboard=[],downloads=[],frames=new Map();let id=0;
  const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(html,{url:'http://isolated-test.invalid/workbench.html#show',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    if(!options.fresh)w.localStorage.setItem('df.workbench.show.v1',JSON.stringify(fixture.state(options.state)));
    w.fetch=async(url,opt)=>{requests.push({url,body:JSON.parse(opt.body)});return {json:async()=>url.endsWith('/object/get')?(options.syncReply||{success:false,message:'offline'}):{success:false}};};
    w.matchMedia=()=>({matches:false});w.ResizeObserver=class{observe(){}};w.SVGElement.prototype.getBoundingClientRect=()=>({width:options.width||600,height:300});
    w.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};w.cancelAnimationFrame=id=>frames.delete(id);
    Object.defineProperty(w.navigator,'clipboard',{value:options.clipboard===false?undefined:{writeText:async text=>{if(options.clipboardReject)throw Error('denied');clipboard.push(text);}}});
    w.document.execCommand=()=>options.fallback===true;
    w.URL.createObjectURL=blob=>{downloads.push({blob});return 'blob:isolated';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){downloads.at(-1).name=this.download;};
  }});
  const w=dom.window,$=id=>w.document.getElementById('df-pattern-'+id);
  const set=(id,value)=>{const e=$(id);e.value=String(value);e.dispatchEvent(new w.Event('input'));e.dispatchEvent(new w.Event('change'));};
  const checkBox=(id,value)=>{$(id).checked=value;$(id).dispatchEvent(new w.Event('change'));};
  const tick=t=>{const f=[...frames.values()];frames.clear();f.forEach(fn=>fn(t));};
  return {w,$,set,checkBox,tick,errors,requests,clipboard,downloads,state:()=>JSON.parse(w.localStorage.getItem('df.workbench.show.v1')),record:()=>JSON.parse(JSON.stringify(w.eval('ShowText.parse(document.getElementById("df-pattern-export-text").value)'))),close:()=>setTimeout(()=>w.close(),0)};
}
const pause=()=>new Promise(r=>setTimeout(r,25));
(async()=>{
const t=boot();await pause();
check('真实生成HTML三素材、导出高度边界和表单错误可恢复',()=>{
  assert.deepEqual(t.errors,[]);assert.deepEqual([...t.$('profile').options].filter(e=>e.value!=='blank').map(e=>e.textContent).sort(),['FanComet','FanGold','FanSilver']);assert(t.$('copy').disabled);t.checkBox('export-original-height',true);assert(!t.$('copy').disabled);t.set('export-name','新模板');assert.equal(t.record().TemplateName,'新模板');
  t.set('count',0);assert(t.$('copy').disabled);t.set('count',10);assert(!t.$('copy').disabled);t.set('export-name','');assert(t.$('copy').disabled);t.set('export-name','Test_01');
});
t.$('copy').click();await pause();check('复制使用当前生成字符串，成功提示准确',()=>{assert.equal(t.clipboard.length,1);assert.equal(t.clipboard[0],t.$('export-text').value);assert(t.$('export-status').textContent.includes('已复制 Test_01'));});
check('TXT下载与复制同源，未产生UE写入',()=>{t.$('download').click();assert.equal(t.downloads[0].name,'Test_01.txt');assert(t.requests.every(r=>!r.url.endsWith('/object/set')));});
check('升空爆炸模式、8秒固定、额外延迟及动画拖动',()=>{
  t.set('shape','sequence');t.set('export-name','Sequence_Checked');assert(!t.$('sequence-fields').hidden);assert(t.$('fan-fields').hidden);assert.equal(t.$('sequence-flight').value,'8');assert.equal(t.record().Entries[1].LocalTimeOffset,8);
  t.set('stage-1-time',1.25);assert.equal(t.record().Entries[1].LocalTimeOffset,9.25);t.set('time',9.3);const burst=t.w.document.querySelector('[data-sequence-index="2"]');assert.equal(burst.getAttribute('visibility'),'visible');
  t.set('sequence-category','medium');assert.equal(t.$('sequence-flight').value,'5');assert.equal(t.$('sequence-maximumHeight').value,'250');assert.equal(t.record().Entries[1].LocalTimeOffset,6.25);t.set('sequence-category','small');assert.equal(t.$('sequence-flight').value,'3.5');assert.equal(t.$('sequence-maximumHeight').value,'');assert(t.$('copy').disabled);t.set('sequence-maximumHeight',120);assert(!t.$('copy').disabled);
});
check('添加资源段和ResourceId、时间/变换均进入复制记录',()=>{
  t.$('sequence-add').click();assert(t.$('copy').disabled);t.set('stage-2-resource','P_Extra');t.set('stage-2-time',2.1);t.set('stage-2-RotationOffset-Pitch',15);assert(t.$('export-text').value,t.$('export-status').textContent+' '+JSON.stringify([...t.$('sequence-fields').querySelectorAll('input')].filter(e=>e.type==='number'&&!e.checkValidity()).map(e=>[e.id,e.value,e.min,e.step])));const out=t.record();assert.equal(out.Entries.length,3);assert.equal(out.Entries[2].FXResourceId,'P_Extra');near(out.Entries[2].LocalTimeOffset,2.1);near(out.Entries[2].RotationOffset.Pitch,15);
});
check('新建空白不使用伪造资源，填写后恢复导出',()=>{
  t.$('sequence-new').click();assert.equal(t.$('stage-0-resource').value,'');assert(t.$('copy').disabled);t.set('stage-0-resource','P_MyTrail');t.set('stage-1-resource','P_MyBurst');t.set('sequence-maximumHeight',120);t.set('export-name','MyChain');assert(!t.$('copy').disabled);t.$('save-template').click();assert(t.$('library-status').textContent.includes('本地素材库'));
  t.$('template-mode').click();const option=[...t.$('profile').options].find(e=>e.textContent==='MyChain');assert(option);t.set('profile',option.value);t.set('height',0);assert.equal(t.record().Entries[0].SubTemplateName,'MyChain');assert(t.$('export-note').textContent.includes('先粘贴'));
});
check('三种模式设置、素材库与名字刷新恢复，不影响导入器',()=>{
  const s=boot({state:t.state()});assert.equal(s.$('profile').value,t.$('profile').value);s.$('resource-mode').click();assert.equal(s.$('shape').value,'sequence');assert.equal(s.$('stage-0-resource').value,'P_MyTrail');assert.equal(s.$('export-name').value,'MyChain');s.set('shape','fan');assert.equal(s.$('count').value,'10');s.close();
});
check('本地子模板复用仍保持8秒升空，不把爆炸额外等待算成升空',()=>{
  t.$('resource-mode').click();t.set('shape','sequence');t.set('sequence-flight',8);t.set('stage-1-time',1.5);t.set('export-name','Chain_WithWait');t.$('save-template').click();t.$('template-mode').click();t.set('profile',[...t.$('profile').options].find(e=>e.textContent==='Chain_WithWait').value);t.set('count',1);t.set('start',0);t.set('time',8.2);const head=t.w.document.querySelector('.df-head'),burst=t.w.document.querySelector('.df-burst');assert.equal(head.getAttribute('visibility'),'hidden');assert.equal(burst.getAttribute('visibility'),'hidden');t.set('time',9.6);assert.equal(burst.getAttribute('visibility'),'visible');
  const s=boot({state:t.state()});assert(s.$('source-info').textContent.includes('Cascade 8.00'));s.close();
});
check('用户粘贴参数新增素材，格式失败不破坏已有库',()=>{
  t.$('resource-mode').click();t.set('shape','fan');t.$('library-text').value='(TemplateName="MyFan",Entries=((FXResourceId="P_Fan",RotationOffset=(Roll=-20)),(FXResourceId="P_Fan",RotationOffset=(Roll=20))))';t.$('library-add').click();assert([...t.$('profile').options].some(e=>e.textContent==='MyFan'));
  const count=t.$('profile').options.length;t.$('library-text').value='(Entries=())';t.$('library-add').click();assert.equal(t.$('profile').options.length,count);assert(t.$('library-status').textContent.length>0);
});
const fallback=boot({clipboardReject:true,fallback:true});await pause();fallback.set('height',0);fallback.$('copy').click();await pause();check('剪贴板权限拒绝时可降级复制',()=>{assert(fallback.$('export-status').textContent.includes('已复制'));});fallback.close();
const manual=boot({clipboard:false});await pause();manual.set('height',0);manual.$('copy').click();await pause();check('自动复制失败时打开并选中文本，不显示虚假成功',()=>{assert(manual.$('export-details').open);assert(manual.$('export-status').textContent.includes('Ctrl+C'));assert.equal(manual.$('export-text').selectionEnd,manual.$('export-text').value.length);});manual.close();
const sync=boot({fresh:true,syncReply:{success:true,data:{properties:{EffectSubTemplates:[{TemplateName:'NewBPResource',Entries:[{FXResourceId:'P_FromBP'}]}]}}}});await pause();sync.$('library-sync').click();await pause();check('显式从BP同步是只读，新增内容自动进入选择器',()=>{const call=sync.requests.find(r=>r.url.endsWith('/object/get'));assert(call);assert.deepEqual(call.body.properties,['EffectSubTemplates']);assert([...sync.$('profile').options].some(e=>e.textContent==='NewBPResource'));assert(sync.$('library-status').textContent.includes('新增 1'));assert(!sync.$('library-sync').disabled);});sync.close();
const offline=boot({fresh:true});await pause();offline.$('library-sync').click();await pause();check('同步失败保留空白配方、ID库及已有输入',()=>{assert.equal(offline.$('profile').options.length,1);assert(offline.$('resource-preset').options.length>3);assert.equal(offline.$('count').value,'5');assert(offline.$('library-status').textContent.includes('保留'));});offline.close();
assert.deepEqual(t.errors,[]);t.close();console.log(`${passed} template export/library/sequence checks passed; isolated DOM, no real UE writes.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
