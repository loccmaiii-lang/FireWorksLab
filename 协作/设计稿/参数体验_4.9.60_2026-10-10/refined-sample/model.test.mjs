import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createModel,taskOf} from './model.mjs';
const dir=new URL('./',import.meta.url),root=new URL('../../../../',import.meta.url);
const context=vm.createContext({window:{}});
for(const name of ['tool/src/js/10_types.js','tool/src/js/12_tempo.js'])vm.runInContext(fs.readFileSync(new URL(name,root),'utf8'),context);
vm.runInContext(fs.readFileSync(new URL('source-contract.js',dir),'utf8'),context);
const source=context.window.ParameterSource,data=JSON.parse(fs.readFileSync(new URL('data.json',dir),'utf8'));
const fresh=()=>createModel(data,source),field=(m,t,o,k)=>m.rows(t,0,o).find(r=>r.key===k);
test('嵌入真实工作区使用原图层快照，单层不制造对照层，撤销与恢复按快照',()=>{
  const m=createModel(data,source,{singleLayer:true});assert.equal(m.session('senrin').state.layers.length,1);
  assert.equal(m.rows('senrin',0,'效果').some(r=>r.scope==='L'),false);
  const layers=structuredClone(m.session('senrin').state.layers);layers[0].name='实际主层';layers[0].P.subStars=63;
  m.loadSnapshot('senrin',layers);const r=field(m,'senrin','子花','subStars');m.commit('senrin',0,r,78);
  assert.equal(layers[0].P.subStars,63);m.session('senrin').undo();assert.equal(m.layer('senrin',0).P.subStars,63);
  assert.equal(m.layer('senrin',0).name,'实际主层');
  m.commit('senrin',0,r,91);m.restore('senrin',0,[r]);assert.equal(m.layer('senrin',0).P.subStars,63);
  m.loadSnapshot('senrin',layers,{supportsPlacement:true});assert.equal(m.rows('senrin',0,'效果').filter(r=>r.scope==='L').length,4);
});
test('36个花型的实际条件都能求值，对象内存储路径不重复',()=>{
  const m=fresh();
  for(const c of data.cases)for(const o of m.objects(c.id,0)){
    const rows=m.rows(c.id,0,o),keys=rows.map(r=>r.scope+'.'+r.key);
    assert.equal(new Set(keys).size,keys.length,c.id+'/'+o);
    for(const r of rows){assert.ok(taskOf(r,o));m.value(c.id,0,r);}
  }
});
test('同控件复用不合并两层数值与颜色；跨层撤销仍恢复原对象',()=>{
  const m=fresh(),r=field(m,'senrin','子花','subStars'),before=m.layer('senrin',0).P.subStars;
  m.commit('senrin',0,r,71);assert.equal(m.layer('senrin',0).P.subStars,71);assert.equal(m.layer('senrin',1).P.subStars,before);
  const color=field(m,'senrin','效果','stages');m.commit('senrin',1,color,[[0,'#ffffff']]);
  assert.notDeepEqual(m.layer('senrin',0).M.stages,m.layer('senrin',1).M.stages);
  m.session('senrin').undo();assert.deepEqual(m.layer('senrin',0).M.stages,m.layer('senrin',1).M.stages);
  m.session('senrin').undo();assert.equal(m.layer('senrin',0).P.subStars,before);
});
test('子花联动取主层当前值，精确编辑断开，接回与撤销可恢复哨兵',()=>{
  const m=fresh(),r=field(m,'senrin','子花','subGrav'),parent=field(m,'senrin','星','grav');
  assert.ok(m.linked('senrin',0,r).on);m.commit('senrin',0,parent,1.7);assert.equal(m.value('senrin',0,r),1.7);
  m.commit('senrin',0,r,2.3);assert.equal(m.linked('senrin',0,r).on,false);m.commit('senrin',0,r,-1);assert.equal(m.value('senrin',0,r),1.7);
  m.session('senrin').undo();assert.equal(m.value('senrin',0,r),2.3);
});
test('火花线宽米与存储散开速度按源码转换，空值不变为NaN',()=>{
  const m=fresh(),r=field(m,'kiku','火花','sparkSpread');m.commit('kiku',0,r,.72);
  assert.ok(Math.abs(m.value('kiku',0,r)-.72)<.0001);assert.notEqual(m.layer('kiku',0).P.sparkSpread,.72);
  const before=m.layer('kiku',0).P.sparkSpread;assert.equal(m.commit('kiku',0,r,NaN),false);assert.equal(m.layer('kiku',0).P.sparkSpread,before);
});
test('手机没有GPU选项；切单帧后出现对应字段，改回序列时不出现',()=>{
  const m=fresh(),mobile=field(m,'kiku','输出','outMobile');assert.equal(mobile.options.some(([v])=>v==='dots'),false);
  assert.equal(field(m,'kiku','输出','lowSize'),undefined);m.commit('kiku',0,mobile,'frame');assert.ok(field(m,'kiku','输出','lowSize'));
  m.commit('kiku',0,mobile,'seq');assert.equal(field(m,'kiku','输出','lowSize'),undefined);
  const form=field(m,'fountain','输出','form');assert.deepEqual(JSON.parse(JSON.stringify(form.options)),[['loop','地面循环（周期性烘焙，首尾无缝）']]);
});
test('尾缀档位读取实际type，贴图列行禁用遵循PC下限而不是开放假选项',()=>{
  const m=fresh(),tier=field(m,'trailM','效果','_trailTier');assert.equal(m.value('trailM',0,tier),'trailM');
  const cols=field(m,'kiku','输出','cols');assert.ok(cols.disabledOptions.includes(32));
  assert.equal(field(m,'kiku','输出','frameMode').displayValue,'tick30');
  assert.equal(field(m,'kiku','输出','frameMode').readOnly,true);
});
test('节奏复合换算只有一步撤销，同时还原参数与颜色时间',()=>{
  const m=fresh(),r=field(m,'kiku','效果','tempo'),before=m.layer('kiku',0);m.commit('kiku',0,r,2);
  assert.notEqual(m.layer('kiku',0).P.burn,before.P.burn);assert.equal(m.session('kiku').depth,1);
  m.session('kiku').undo();assert.deepEqual(m.layer('kiku',0),before);
});
test('同一对象恢复打开时值，不吞另一个对象改动；效果之间独立撤销',()=>{
  const m=fresh(),child=field(m,'senrin','子花','subStars'),star=field(m,'senrin','星','stars');
  m.commit('senrin',0,child,67);m.commit('senrin',0,star,80);m.restore('senrin',0,[child]);
  assert.equal(m.layer('senrin',0).P.subStars,40);assert.equal(m.layer('senrin',0).P.stars,80);
  const other=field(m,'kiku','星','stars');m.commit('kiku',0,other,50);m.session('kiku').undo();assert.equal(m.layer('senrin',0).P.stars,80);
});
