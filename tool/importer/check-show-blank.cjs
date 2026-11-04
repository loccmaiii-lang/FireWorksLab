const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync('../df-fx-workbench_v2_locmai.html','utf8'),KEY='df.workbench.show.v1';
function boot(options={}){
 const errors=[],requests=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'http://isolated-test.invalid/blank#show',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  if(options.state)w.localStorage.setItem(KEY,JSON.stringify(options.state));
  if(options.archive)w.localStorage.setItem('df.workbench.show.legacy.v1',JSON.stringify(options.archive));
  if(options.failBackup){const set=w.Storage.prototype.setItem;w.Storage.prototype.setItem=function(key,value){if(key.startsWith('df.workbench.show.legacy'))throw Error('quota');return set.call(this,key,value);};}
  w.fetch=async(url,opt)=>{requests.push({url,body:JSON.parse(opt.body)});return{json:async()=>({success:false})};};
  w.matchMedia=()=>({matches:false});w.ResizeObserver=class{observe(){}};w.SVGElement.prototype.getBoundingClientRect=()=>({width:640,height:380});
  w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
 }});
 const w=dom.window,$=id=>w.document.getElementById('df-pattern-'+id);
 const set=(id,value)=>{const e=$(id);assert(e,'missing '+id);if(e.type==='checkbox')e.checked=value;else e.value=String(value);e.dispatchEvent(new w.Event(e.type==='number'||e.type==='checkbox'?'change':'input'));if(e.type==='text')e.dispatchEvent(new w.Event('change'));};
 const record=()=>JSON.parse(w.eval('JSON.stringify(ShowText.parse('+JSON.stringify($('export-text').value)+'))'));
 return {w,$,set,record,errors,requests,state:()=>JSON.parse(w.localStorage.getItem(KEY)),close:()=>setTimeout(()=>w.close(),0)};
}
let passed=0;const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function check(name,fn){fn();passed++;console.log('PASS '+name);}
(async()=>{
const t=boot();await new Promise(r=>setTimeout(r,20));
check('活跃HTML只有ID元数据、没有旧BP配比，素材库默认为空',()=>{assert.equal(t.w.eval('ShowCatalog.all().length'),0);assert.equal(t.w.eval('ShowResourceData.records.every(r=>Object.keys(r).every(k=>["id","group","platforms"].includes(k)))'),true);assert.equal(t.w.eval('Object.hasOwn(ShowBlueprintData,"subtemplates")'),false);});
check('新建ID、模板名和配比均留空，预览和复制等待输入',()=>{for(const id of ['resource-id','angle-ratios','size-ratios','export-name'])assert.equal(t.$(id).value,'');assert(t.$('copy').disabled);assert(t.$('play').disabled);assert.equal(t.w.document.querySelectorAll('.df-head').length,0);assert(!t.$('meta').textContent.includes('Infinity'));});
check('三种素材保留为ID选项，不带角度、大小和随机预设',()=>{const ids=[...t.$('resource-preset').options].map(o=>o.value);for(const id of ['P_EFX_FireWorks_FanGold_Central_01','P_EFX_FireWorks_FanSilver_01','P_EFX_FireWorks_FanComet_01'])assert(ids.includes(id));for(const id of ['angle-ratios','size-ratios'])assert.equal(t.$(id).value,'');for(const id of ['angle','size','height'])assert.equal(t.$(id).value,'0');assert.equal(t.$('profile').options.length,1);assert(t.$('copy').disabled);});
t.set('resource-id','P_Manual');t.set('export-name','ManualFan');t.set('spread',100);t.set('count',5);
check('空配比用中性均匀角度和统一大小生成，位置不继承旧值',()=>{const data=t.record();data.Entries.forEach((e,i)=>{near(e.RotationOffset.Roll,-50+i*25);assert.deepEqual(e.EffectScale,{X:1,Y:1,Z:1});assert.deepEqual(e.PositionOffset,{X:0,Y:0,Z:0});assert.equal(e.FXResourceId,'P_Manual');});assert(!t.$('play').disabled);});
t.set('angle-ratios','-1, -0.25, 1');t.set('size-ratios','0.8, 1.2, 0.7');
check('未应用的编辑不能复制上一组数据',()=>{assert(t.$('copy').disabled);assert.match(t.$('export-status').textContent,/尚未应用/);});
t.$('ratios-apply').click();
check('手填关键点按簇数插值，预览与复制使用同一组',()=>{const data=t.record(),angles=[-50,-31.25,-12.5,18.75,50],sizes=[.8,1,1.2,.95,.7];data.Entries.forEach((e,i)=>{near(e.RotationOffset.Roll,angles[i]);near(e.EffectScale.X,sizes[i]);const head=t.w.document.querySelector('.df-head[data-index="'+(i+1)+'"]');near(+head.dataset.scaleZ,e.EffectScale.Z);});assert.equal(t.$('layout').value,'custom');assert.equal(t.$('sizeLayout').value,'custom');});
t.set('count',37);
check('手填配比可继续扩展数量，角度有序并保留两侧端点',()=>{const data=t.record();assert.equal(data.Entries.length,37);near(data.Entries[0].RotationOffset.Roll,-50);near(data.Entries.at(-1).RotationOffset.Roll,50);data.Entries.slice(1).forEach((e,i)=>assert(e.RotationOffset.Roll>data.Entries[i].RotationOffset.Roll));});
t.set('sizeLayout','symmetric');
check('手填大小可按左右对称计算，不引用原预设',()=>{const data=t.record();data.Entries.forEach((e,i)=>near(e.EffectScale.X,data.Entries.at(-1-i).EffectScale.X));});
const fresh=boot({state:t.state()});
check('用户新填的配比、ID与模板名刷新恢复',()=>{assert.equal(fresh.$('resource-id').value,'P_Manual');assert.equal(fresh.$('angle-ratios').value,'-1, -0.25, 1');assert.equal(fresh.$('export-name').value,'ManualFan');assert.deepEqual(fresh.record().Entries,t.record().Entries);assert.equal(fresh.state().version,2);});fresh.close();
const before=t.record();t.set('angle-ratios','1,0,-1');t.$('ratios-apply').click();
check('无序或越界配比阻止应用，保留上一组预览并禁复制',()=>{assert(t.$('copy').disabled);assert.match(t.$('ratios-status').textContent,/递增/);assert.equal(t.w.document.querySelectorAll('.df-head').length,before.Entries.length);t.set('angle-ratios','-2,0,1');t.$('ratios-apply').click();assert.match(t.$('ratios-status').textContent,/-1–1/);});
t.set('angle-ratios','-1，0，1');t.set('size-ratios','1 1.1 1');t.$('ratios-apply').click();
check('中文逗号和空格可输入有效配比',()=>{assert(!t.$('copy').disabled);near(t.record().Entries[18].RotationOffset.Roll,0);near(t.record().Entries[18].EffectScale.X,1.1);});
t.set('size-ratios','0,1');t.$('ratios-apply').click();
check('零大小、非数字和代码文本不会执行或导出',()=>{assert(t.$('copy').disabled);t.set('size-ratios','alert(1)');t.$('ratios-apply').click();assert(t.$('copy').disabled);assert.equal(t.w.alerted,undefined);});
t.$('ratios-clear').click();
check('清空配比后回到均匀角度和统一大小，两个输入保持空',()=>{assert.equal(t.$('angle-ratios').value,'');assert.equal(t.$('size-ratios').value,'');assert.equal(t.$('layout').value,'uniform');assert.equal(t.$('sizeLayout').value,'uniform');assert(!t.$('copy').disabled);t.record().Entries.forEach(e=>near(e.EffectScale.Z,1));});
t.set('count',1);t.$('fan-clean').click();
check('单簇与规整扇形不重新填入旧配比',()=>{near(t.record().Entries[0].RotationOffset.Roll,0);assert.equal(t.$('angle-ratios').value,'');assert.equal(t.$('size-ratios').value,'');});
t.set('resource-id','');
check('清掉ResourceId后清空动画和导出，旧数据不可复制',()=>{assert(t.$('copy').disabled);assert.equal(t.$('export-text').value,'');assert.equal(t.w.document.querySelectorAll('.df-head').length,0);});
t.set('shape','sequence');
check('升空爆炸组合默认空ID、未填高度、零随机，无旧资源组合',()=>{assert.equal(t.$('sequence-profile').options.length,1);assert.equal(t.$('stage-0-resource').value,'');assert.equal(t.$('stage-1-resource').value,'');assert.equal(t.$('sequence-maximumHeight').value,'');assert.equal(t.$('sequence-baseHeight').value,'');assert.equal(t.$('sequence-sizeJitter').value,'0');assert.equal(t.$('sequence-angleJitter').value,'0');assert.equal(t.$('export-name').value,'');assert(t.$('copy').disabled);});
t.set('stage-0-resource','P_Trail');t.set('stage-1-resource','P_Burst');t.set('sequence-category','small');t.set('sequence-maximumHeight',120);t.set('export-name','Small_Custom');
check('用户填写资源段后，已确认的3.5秒规格仍可用',()=>{assert(!t.$('copy').disabled);const data=t.record();assert.equal(data.Entries[1].LocalTimeOffset,3.5);assert.equal(data.Entries[1].PositionOffset.Z,12000);});
t.$('template-mode').click();
check('父编排初始不预选旧子模板，需要用户添加',()=>{assert.equal(t.$('profile').value,'blank-template');assert(t.$('copy').disabled);});
const old={version:1,mode:'resource',configs:{resource:{profile:'silver',count:13,layout:'native'},template:{}},catalog:[{source:{TemplateName:'Old',Entries:[{FXResourceId:'P_Old'}]}}],sequence:{profile:'goldspark'},view:{}};
const legacy=boot({state:old});
check('旧草稿单独保留，默认与素材库都从空白开始',()=>{assert.deepEqual(JSON.parse(legacy.w.localStorage.getItem('df.workbench.show.legacy.v1')),old);assert.equal(legacy.state().version,2);assert.equal(legacy.$('profile').value,'blank');assert.equal(legacy.w.eval('ShowCatalog.all().length'),0);assert(!legacy.$('migration-note').hidden);});legacy.close();
const older={version:1,note:'earlier draft'},again=boot({state:old,archive:older});
check('已有旧稿存档时分别保存，不覆盖任一旧稿',()=>{const storage=again.w.localStorage,keys=Object.keys(storage).filter(key=>key.startsWith('df.workbench.show.legacy.v1.'));assert.deepEqual(JSON.parse(storage.getItem('df.workbench.show.legacy.v1')),older);assert.equal(keys.length,1);assert.deepEqual(JSON.parse(storage.getItem(keys[0])),old);assert.equal(again.state().version,2);});again.close();
const failed=boot({state:old,failBackup:true});failed.set('resource-id','P_New');
check('旧草稿备份失败时不覆盖旧记录，仍能在本页填写',()=>{assert.equal(failed.state().version,1);assert.equal(failed.$('resource-id').value,'P_New');assert.match(failed.$('migration-note').textContent,/不会覆盖/);});failed.close();
check('全部新操作未增加UE调用，隔离页面没有脚本异常',()=>{assert(t.requests.every(r=>r.body.function==='GetPlatformName'));assert.deepEqual(t.errors,[]);});t.close();
console.log(passed+' blank/manual-ratio checks passed; no real UE writes or browser visual acceptance.');
})().catch(e=>{console.error(e);process.exitCode=1;});
