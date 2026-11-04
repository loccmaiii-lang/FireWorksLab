const fixture=require('./fixtures/show-fixture.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync('../df-fx-workbench_v2_locmai.html','utf8');
assert(html.includes('id="panel-show"'),'new show panel missing');
assert(html.includes('data-panel="show"'),'new show navigation missing');
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
const KEY='df.workbench.show.v1';
function boot(options={}){
  const errors=[],calls=[],frames=new Map();let next=0,width=options.width||600;
  const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(html,{url:'http://isolated-test.invalid/workbench.html'+(options.hash||'#show'),runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    if(!options.fresh)w.localStorage.setItem(KEY,JSON.stringify(fixture.state(options.state)));
    w.fetch=async(url,opt)=>{calls.push(JSON.parse(opt.body));return{ok:true,json:async()=>({success:false,data:{}})};};
    w.matchMedia=()=>({matches:!!options.reduced});w.ResizeObserver=class{observe(){}};
    w.SVGElement.prototype.getBoundingClientRect=()=>({width,height:options.height||420,left:0,top:0,right:width,bottom:options.height||420});
    w.requestAnimationFrame=fn=>{const id=++next;frames.set(id,fn);return id;};w.cancelAnimationFrame=id=>frames.delete(id);
  }});
  const w=dom.window,$=id=>w.document.getElementById('df-pattern-'+id);
  const set=(id,value)=>{const e=$(id);e.value=String(value);e.dispatchEvent(new w.Event(e.type==='number'?'change':'input'));};
  const plan=()=>[...w.document.querySelectorAll('.df-head')].map(e=>({angle:Number(e.dataset.angle),base:Number(e.dataset.baseAngle),fire:Number(e.dataset.fire),size:Number(e.dataset.size),height:Number(e.dataset.height),burst:e.dataset.burst===''?null:Number(e.dataset.burst),limit:Number(e.dataset.jitterLimit),origin:Number(e.dataset.originY)}));
  const tick=t=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(t));};
  return {w,$,set,plan,tick,frames,errors,calls,state:()=>JSON.parse(w.localStorage.getItem(KEY)),resize(v){width=v;w.dispatchEvent(new w.Event('resize'));w.eval('ShowComposer.setActive(true)');},close:()=>setTimeout(()=>w.close(),0)};
}
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`),pause=()=>new Promise(r=>setTimeout(r,25));
let passed=0;function check(name,fn){fn();passed++;console.log('PASS '+name);}
(async()=>{
const t=boot();await pause();const initialImportState=t.w.localStorage.getItem('fwimp.workbench.v2');
check('六个模块可导航，UE离线仍有完整本地编排预览',()=>{
  assert.deepEqual(t.errors,[]);assert.equal(t.plan().length,5);assert.equal(t.$('profile').value,'comet');assert.equal(t.$('spread').value,'68');
  assert.equal(t.$('play').textContent,'播放一遍');assert.equal(t.w.document.querySelector('.sidebar .active').dataset.panel,'show');
  for(const name of ['asset','material','weapon','resfx','fwimp','show']){t.w.eval(`switchPanel('${name}')`);assert.notEqual(t.w.document.getElementById('panel-'+name).style.display,'none');assert.equal(t.w.document.querySelector('.sidebar .active').dataset.panel,name);}
  assert.equal(t.w.document.getElementById('wb-title').textContent,'烟花编排');assert.equal(t.w.document.getElementById('conn').textContent,'未连接 UE');
  const ids=[...t.w.document.querySelectorAll('[id]')].map(e=>e.id);assert.equal(ids.length,new Set(ids).size);
});
check('Silver13簇样本复现，数量可扩至64簇',()=>{
  t.set('profile','silver');t.set('count',13);t.set('spread',100);t.set('angle',0);t.set('size',0);t.set('height',0);
  const p=t.plan(),angles=[-50,-41,-32,-24,-16,-8,0,8,17,26,35,43,50],sizes=[.76,.88,.97,1.08,.95,1.15,1.10,1.17,.99,1.09,.91,.83,.75];
  p.forEach((e,i)=>{near(e.angle,angles[i]);near(e.size,sizes[i]);near(e.height,1);});
  t.set('count',64);assert.equal(t.plan().length,64);near(t.plan()[0].angle,-50);near(t.plan().at(-1).angle,50);
});
check('密集配比的随机角度不交叉，1簇居中',()=>{
  t.set('count',256);t.set('spread',10);t.set('angle',8);
  for(const layout of ['custom','uniform','center','edge']){t.set('layout',layout);const p=t.plan();assert(p.every(e=>e.angle>=-5&&e.angle<=5));p.slice(1).forEach((e,i)=>assert(e.angle>p[i].angle));}
  t.set('count',1);near(t.plan()[0].angle,0);assert(t.$('interval').disabled);assert(t.$('spread').disabled);assert(t.$('angle').disabled);
});
check('左右和里外顺序只改时间，奇偶成对，齐发禁用间隔',()=>{
  t.set('count',10);t.set('spread',100);t.set('layout','uniform');t.set('interval',.1);t.set('start',.5);t.set('order','lr');const before=t.plan();
  t.set('order','rl');let p=t.plan();assert.deepEqual(p.map(e=>[e.angle,e.size,e.height]),before.map(e=>[e.angle,e.size,e.height]));near(p[0].fire,1.4);near(p[9].fire,.5);
  t.set('order','out');p=t.plan();near(p[4].fire,.5);near(p[5].fire,.5);near(p[0].fire,.9);
  t.set('count',9);p=t.plan();near(p[4].fire,.5);near(p[3].fire,.6);near(p[5].fire,.6);
  t.set('order','in');near(t.plan()[0].fire,.5);near(t.plan()[4].fire,.9);
  t.set('order','together');assert(t.plan().every(e=>e.fire===.5));assert(t.$('interval').disabled);
});
check('大小、高度、角度独立固定随机，地面起点不变',()=>{
  t.set('angle',2);t.set('size',5);t.set('height',5);const before=t.plan();
  t.set('size',12);assert.deepEqual(t.plan().map(e=>[e.angle,e.height]),before.map(e=>[e.angle,e.height]));
  const bigger=t.plan();t.set('height',9);assert.deepEqual(t.plan().map(e=>[e.angle,e.size]),bigger.map(e=>[e.angle,e.size]));assert(t.plan().every(e=>e.height>=.91&&e.height<=1.09));assert.equal(new Set(t.plan().map(e=>e.origin)).size,1);
  const stable=t.plan();t.$('play').click();t.tick(0);t.tick(500);t.$('play').click();assert.deepEqual(t.plan(),stable);t.$('reroll').click();assert.notDeepEqual(t.plan().map(e=>e.angle),stable.map(e=>e.angle));
});
check('完整子模板保留2/4秒的内部关系、升空端点与爆花位置一致',()=>{
  t.$('template-mode').click();t.set('count',12);t.set('order','rl');t.set('start',1.5);let p=t.plan();p.forEach(e=>near(e.burst-e.fire,4));assert(!t.$('burst-header').hidden);
  t.set('time',5.5);const last=t.w.document.querySelector('.df-burst[data-index="12"]');assert.equal(last.getAttribute('visibility'),'visible');
  const guide=t.w.document.querySelector('.df-guide[data-index="12"]'),[x,y]=last.getAttribute('transform').match(/translate\(([^ ]+) ([^)]+)\)/).slice(1).map(Number);near(x,Number(guide.getAttribute('x2')));near(y,Number(guide.getAttribute('y2')));
  t.set('profile','goldcrackle');t.plan().forEach(e=>near(e.burst-e.fire,2));t.set('profile','greenpeony');t.plan().forEach(e=>near(e.burst-e.fire,2));
  const row=t.$('rows').lastElementChild;near(Number(row.children[1].textContent),1.5);near(Number(row.children[5].textContent),3.5);
});
check('两层输入分别记住，刷新恢复且不影响导入器数据',()=>{
  t.$('resource-mode').click();assert.equal(t.$('count').value,'9');assert.equal(t.$('profile').value,'silver');t.$('template-mode').click();assert.equal(t.$('count').value,'12');assert.equal(t.$('profile').value,'greenpeony');
  const s=boot({state:t.state()});assert.equal(s.$('count').value,'12');assert.equal(s.$('profile').value,'greenpeony');s.$('resource-mode').click();assert.equal(s.$('count').value,'9');s.close();
  assert.equal(t.w.localStorage.getItem('fwimp.workbench.v2'),initialImportState);
});
check('慢放只改预览时钟，暂停和拖动定位正确，末尾可重播',()=>{
  t.$('resource-mode').click();t.set('count',10);t.set('start',0);t.set('interval',.1);t.set('order','lr');t.set('speed',.5);const p=t.plan();
  t.$('play').click();t.tick(0);t.tick(900);assert(t.$('time-value').value.startsWith('0.45'));assert.equal(t.w.document.querySelectorAll('.df-head[visibility="visible"]').length,5);
  t.$('play').click();const paused=t.$('time-value').value;t.tick(1400);assert.equal(t.$('time-value').value,paused);t.set('time',.8);assert(t.$('status').textContent.includes('9 / 10'));
  t.set('speed',2);t.$('play').click();t.tick(1500);t.tick(2200);assert.equal(t.$('play').textContent,'重播');assert.equal(t.frames.size,0);assert.deepEqual(t.plan(),p);
});
check('循环需主动勾选，离开模块或页面后台即暂停',()=>{
  t.$('loop').checked=true;t.$('loop').dispatchEvent(new t.w.Event('change'));t.$('play').click();t.tick(0);t.tick(1400);assert.equal(t.$('play').textContent,'暂停');assert(t.frames.size>0);
  t.w.eval("switchPanel('fwimp')");const before=t.$('time-value').value;t.tick(2000);assert.equal(t.frames.size,0);assert.equal(t.$('time-value').value,before);
  t.w.eval("switchPanel('show')");t.$('play').click();Object.defineProperty(t.w.document,'hidden',{configurable:true,value:true});t.w.document.dispatchEvent(new t.w.Event('visibilitychange'));assert.equal(t.frames.size,0);assert.notEqual(t.$('play').textContent,'暂停');
  t.$('loop').checked=false;t.$('loop').dispatchEvent(new t.w.Event('change'));
});
check('非法数值保留最后合法计划；本地存储失败仍可调参预览',()=>{
  const count=t.plan().length;t.set('count',0);assert.equal(t.plan().length,count);assert(t.$('error').textContent.includes('1'));t.set('count',999);assert.equal(t.plan().length,count);t.set('count',16);assert.equal(t.$('error').textContent,'');
  const old=t.w.Storage.prototype.setItem;t.w.Storage.prototype.setItem=()=>{throw Error('quota');};t.set('count',20);assert.equal(t.plan().length,20);assert(t.$('status').textContent.includes('记住'));t.w.Storage.prototype.setItem=old;
});
check('本地调参和动画不发出UE调用',()=>{
  const before=t.calls.length;t.set('profile','comet');t.set('count',24);t.set('order','lr');t.$('play').click();t.tick(0);t.tick(300);t.$('play').click();assert.equal(t.calls.length,before);
  assert(t.calls.every(c=>c.function==='GetPlatformName'));
});
check('窄屏与极端参数下包括爆花半径均在画布内，编号不覆盖',()=>{
  const n=boot({width:232,height:250});n.$('template-mode').click();
  for(const width of [232,600])for(const count of [1,16,64])for(const spread of [10,140]){
    n.resize(width);n.set('count',count);n.set('spread',spread);n.set('size',20);n.set('height',12);n.set('scale',1.5);n.set('angle',8);n.set('time',4.3);
    const view=n.$('scene').getAttribute('viewBox').split(' ').map(Number),height=view[3],heads=[...n.w.document.querySelectorAll('.df-head')];
    for(const e of n.w.document.querySelectorAll('.df-head,.df-guide')){for(const a of ['cx','x1','x2'])if(e.hasAttribute(a))assert(Number(e.getAttribute(a))>=0&&Number(e.getAttribute(a))<=width);for(const a of ['cy','y1','y2'])if(e.hasAttribute(a))assert(Number(e.getAttribute(a))>=0&&Number(e.getAttribute(a))<=height);}
    for(const e of n.w.document.querySelectorAll('.df-burst')){const [x,y]=e.getAttribute('transform').match(/translate\(([^ ]+) ([^)]+)\)/).slice(1).map(Number),radius=Number(heads[Number(e.dataset.index)-1].dataset.size)*14;assert(x-radius>=0&&x+radius<=width);assert(y-radius>=0&&y+radius<=height);}
    const labels=[...n.w.document.querySelectorAll('.df-number')].map(e=>({x:Number(e.getAttribute('x')),y:Number(e.getAttribute('y')),half:e.textContent.length*4+3}));for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)assert(Math.abs(labels[i].x-labels[j].x)>=labels[i].half+labels[j].half||Math.abs(labels[i].y-labels[j].y)>=16);
  }
  assert.deepEqual(n.errors,[]);n.close();
});
check('减少动态设置下保留布局与时间定位',()=>{const r=boot({reduced:true});r.$('play').click();assert(r.$('status').textContent.includes('减少动态'));assert.equal(r.frames.size,0);r.set('time',.4);assert(r.$('time-value').value.startsWith('0.40'));r.close();});
assert.deepEqual(t.errors,[]);t.close();console.log(`${passed} integrated show checks passed; connection mocked, no real UE writes or particle playback.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
