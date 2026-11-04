const fixture=require('./fixtures/show-fixture.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync('../df-fx-workbench_v2_locmai.html','utf8');
const KEY='df.workbench.show.v1';
const near=(a,b,t=1e-6)=>assert(Math.abs(a-b)<t,`${a} != ${b}`);
let passed=0;function check(name,fn){fn();passed++;console.log('PASS '+name);}
function boot(options={}){
 const errors=[],calls=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'http://isolated-test.invalid/fan#show',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  if(!options.fresh)w.localStorage.setItem(KEY,JSON.stringify(fixture.state(options.state)));
  w.fetch=async(url,opt)=>{calls.push(JSON.parse(opt.body));return{ok:true,json:async()=>({success:false,data:{}})};};
  w.SVGElement.prototype.getBoundingClientRect=()=>({width:options.width||700,height:options.height||400});w.ResizeObserver=class{observe(){}};
  w.matchMedia=()=>({matches:false});w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
 }});
 const w=dom.window,$=id=>w.document.getElementById('df-pattern-'+id);
 const set=(id,value)=>{const e=$(id);if(e.type==='checkbox')e.checked=value;else e.value=String(value);e.dispatchEvent(new w.Event(e.type==='number'||e.type==='checkbox'?'change':'input'));};
 const guides=()=>[...w.document.querySelectorAll('.df-guide')].map(e=>({x1:+e.getAttribute('x1'),y1:+e.getAttribute('y1'),x2:+e.getAttribute('x2'),y2:+e.getAttribute('y2')}));
 const lengths=()=>guides().map(g=>Math.hypot(g.x2-g.x1,g.y2-g.y1));
 const exported=()=>JSON.parse(w.eval('JSON.stringify(ShowText.parse('+JSON.stringify($('export-text').value)+'))'));
 return{w,$,set,guides,lengths,exported,errors,calls,state:()=>JSON.parse(w.localStorage.getItem(KEY)),close:()=>setTimeout(()=>w.close(),0)};
}
(async()=>{
 const t=boot();t.set('profile','silver');t.set('count',13);t.set('angle',0);t.set('size',0);t.set('height',0);t.set('spread',100);
 check('Silver原配比预览线长对应实际导出Z，修复旧版等长草稿',()=>{near(t.lengths()[0]/t.lengths()[6],.76/1.10);const data=t.exported();near(data.Entries[0].EffectScale.Z/data.Entries[6].EffectScale.Z,t.lengths()[0]/t.lengths()[6]);assert.deepEqual(t.errors,[]);});
 const importState=t.w.localStorage.getItem('fwimp.workbench.v2'),beforeCalls=t.calls.length;t.$('fan-clean').click();
 check('规整预设为统一大小、圆弧、均匀角度、零随机和齐发',()=>{assert.equal(t.$('sizeLayout').value,'uniform');assert.equal(t.$('outline').value,'arc');assert.equal(t.$('order').value,'together');assert.equal(t.$('size').value,'0');assert.equal(t.$('height').value,'0');assert.equal(t.$('angle').value,'0');const p=t.lengths();p.forEach(n=>near(n,p[0]));assert(!t.$('copy').disabled);t.exported().Entries.forEach(e=>{near(e.EffectScale.Z,1);near(e.EffectScale.X,1);assert.equal(e.LocalTimeOffset,0);assert.equal(e.RandomScaleRatio,0);});});
 check('灰线与外轮廓端点一致，图例区分完成端点和当前时刻',()=>{const points=t.w.document.querySelector('.df-envelope').getAttribute('points').split(' ').map(p=>p.split(',').map(Number)),g=t.guides();assert.equal(points.length,g.length);points.forEach(([x,y],i)=>{near(x,g[i].x2);near(y,g[i].y2);});assert.match(t.$('legend').textContent,/完整端点/);assert.match(t.$('legend').textContent,/当前时刻/);});
 t.set('outline','level');
 check('需要改变长度的轮廓未应用时禁复制，不能按原高度绕过',()=>{assert(t.$('copy').disabled);assert.match(t.$('export-status').textContent,/Z.*缩放|长度.*应用/);t.set('export-original-height',true);assert(t.$('copy').disabled);});
 t.set('applyLengthScale',true);t.set('export-original-height',false);
 check('平顶按角度补偿纵向长度，完成端点等高且输出对应Z',()=>{const g=t.guides(),data=t.exported();g.forEach(e=>near(e.y2,g[0].y2));near(data.Entries[0].EffectScale.Z,1/Math.cos(50*Math.PI/180));near(data.Entries[6].EffectScale.Z,1);assert.equal(data.Entries[0].PositionOffset.Z,10);});
 t.set('outline','dome');t.set('edgeLength',.8);
 check('圆顶两侧与中心长度比例可调，XY大小不被纵向变化改写',()=>{const l=t.lengths(),data=t.exported();near(l[0]/l[6],.8);near(l.at(-1)/l[6],.8);data.Entries.forEach(e=>near(e.EffectScale.X,1));assert(!t.$('edgeLength').disabled);});
 t.set('sizeLayout','symmetric');t.set('outline','native');t.set('applyLengthScale',false);
 check('左右对称配比保留整体层次，不再左右各用不对称原尺度',()=>{const data=t.exported();data.Entries.forEach((e,i)=>near(e.EffectScale.X,data.Entries[data.Entries.length-1-i].EffectScale.X));const p=t.lengths();p.forEach((n,i)=>near(n,p[p.length-1-i]));});
 t.set('sizeLayout','custom');t.set('applyLengthScale',true);t.set('height',6);
 check('长度随机明确写入Z，XY随机仍独立，复制和预览一致',()=>{const before=t.exported(),g=t.lengths();before.Entries.forEach((e,i)=>near(g[i]/g[0],e.EffectScale.Z/before.Entries[0].EffectScale.Z));assert(!t.$('copy').disabled);t.set('size',9);const after=t.exported();assert.notEqual(after.Entries[0].EffectScale.X,before.Entries[0].EffectScale.X);});
 t.set('outline','arc');t.set('sizeLayout','uniform');const fixed=t.exported();t.set('order','rl');
 check('顺序只改时间，不重抽造型或长度',()=>{const after=t.exported();after.Entries.forEach((e,i)=>assert.deepEqual(e.EffectScale,fixed.Entries[i].EffectScale));});
 t.set('height',0);t.set('size',0);t.set('outline','arc');
 const calibration=t.$('fan-calibration').querySelector('input');calibration.value='1.25';calibration.dispatchEvent(new t.w.Event('change'));
 check('同一ResourceId共享长度校准，输出反算Z以保持目标轮廓',()=>{const data=t.exported();data.Entries.forEach(e=>near(e.EffectScale.Z,.8));t.lengths().forEach(n=>near(n,t.lengths()[0]));assert.match(t.$('fan-length-note').textContent,/校准/);});
 const snapshot=t.state(),restored=boot({state:snapshot});
 check('新轮廓、大小配比、长度输出及校准刷新恢复',()=>{assert.equal(restored.$('outline').value,'arc');assert.equal(restored.$('sizeLayout').value,'uniform');assert(restored.$('applyLengthScale').checked);assert.equal(restored.$('fan-calibration').querySelector('input').value,'1.25');assert.deepEqual(restored.exported().Entries,t.exported().Entries);});restored.close();
 check('新功能离线工作，不改变导入记录也不调用UE',()=>{assert.equal(t.calls.length,beforeCalls);assert.equal(t.w.localStorage.getItem('fwimp.workbench.v2'),importState);});
 const legacy=boot({state:{version:1,mode:'resource',configs:{resource:{profile:'silver',count:13,spread:100,sizeJitter:0,heightJitter:0,angleJitter:0},template:{}},view:{}}});
 check('旧配置单独存档并从空白开始，不重新加载旧配比',()=>{assert.equal(legacy.$('profile').value,'blank');assert.equal(legacy.$('sizeLayout').value,'uniform');assert.equal(legacy.$('angle-ratios').value,'');assert(legacy.$('copy').disabled);assert(legacy.w.localStorage.getItem('df.workbench.show.legacy.v1'));});legacy.close();
 t.$('template-mode').click();check('父编排隐藏扇形长度控制，仍导出完整子模板引用',()=>{assert(t.$('fan-contour').hidden);t.set('height',0);const data=t.exported();assert(data.Entries.every(e=>e.EntryType==='SubTemplate'));});t.$('resource-mode').click();t.set('shape','sequence');t.set('export-name','Sequence_Checked');
 check('资源段升空爆炸仍走原固定时长和高度输出路径',()=>{assert(t.$('fan-fields').hidden);assert(t.$('sequence-fields').hidden===false);assert(t.exported().Entries.length>=2);});t.set('shape','fan');
 t.$('fan-clean').click();t.set('count',1);check('单簇居中，边缘配比不造成零除或丢失导出',()=>{near(t.exported().Entries[0].RotationOffset.Roll,0);assert.equal(t.lengths().length,1);assert(Number.isFinite(t.lengths()[0]));});
 t.set('count',15);t.set('outline','level');t.set('applyLengthScale',true);t.set('spread',140);t.set('lengthScale',2);
 const small=t.$('fan-calibration').querySelector('input');small.value='.05';small.dispatchEvent(new t.w.Event('change'));
 check('计算超出原生缩放范围时禁止复制并显示原因',()=>{assert(t.$('copy').disabled);assert.match(t.$('export-status').textContent,/缩放.*100/);assert.deepEqual(t.errors,[]);});t.close();
 for(const profile of ['gold','comet']){const all=boot();all.set('profile',profile);all.$('fan-clean').click();all.set('count',23);check(profile+'支持同一规整与非固定数量逻辑',()=>{assert.equal(all.exported().Entries.length,23);const lengths=all.lengths();lengths.forEach(l=>near(l,lengths[0]));assert.deepEqual(all.errors,[]);});all.close();}
 console.log('\n'+passed+' fan contour checks passed; isolated DOM, no real UE writes or particle playback.');
})().catch(e=>{console.error(e);process.exitCode=1;});
