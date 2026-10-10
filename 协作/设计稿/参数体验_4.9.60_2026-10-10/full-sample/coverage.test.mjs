import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const data=JSON.parse(fs.readFileSync(new URL('sample-data.json',import.meta.url),'utf8'));
test('完整映射无丢项、A/B同出现ID，别名与内部键不充作参数',()=>{
 const ids=[...data.rows,...data.extras].map(r=>r.occurrenceId||r.fieldId).sort();assert.equal(ids.length,626);assert.equal(new Set(ids).size,626);
 assert.deepEqual(data.coverage.A,ids);assert.deepEqual(data.coverage.B,ids);assert.equal(data.coverage.oldEqual,true);assert.equal(data.coverage.objects,26);assert.equal(data.coverage.sourceSections,44);
 assert.equal(data.registryOnly.length,9);assert.equal(data.internal.length,13);
});
test('千轮完整18字段及8联动、输出105项、动态交付入口均保留',()=>{
 assert.equal(data.rows.filter(r=>r.emitter==='子花'&&r.sourceSection==='千轮 / 分裂').length,18);assert.equal(Object.keys(data.links).length,8);
 assert.equal([...data.rows,...data.extras].filter(r=>r.emitter==='输出'||/SPEC-|LAYER-|NAME-|SIZE-|DELIVERY-/.test(r.fieldId)).length,105);
 for(const id of ['dvExport','dvBack','dvSaveNames','dvResetNames'])assert.ok(data.actions.some(r=>r.id===id));
 const mapping=JSON.parse(fs.readFileSync(new URL('字段映射.json',import.meta.url),'utf8'));
 assert.deepEqual(mapping.extras.find(r=>r.fieldId==='DELIVERY-root'),data.extras.find(r=>r.fieldId==='DELIVERY-root'));
 const rootRow=fs.readFileSync(new URL('字段映射.csv',import.meta.url),'utf8').split('\n').find(s=>s.includes('"DELIVERY-root"'));
 assert.ok(rootRow.includes('config.outputRoot / session.outputRoot'));assert.ok(rootRow.includes('D:/ProjectTextures/FireWorksLab'));
});
test('与生产解析器逐项比对，保持已有空/排序/重复时刻及插值语义',async()=>{
 const {parseCurve,at}=await import('./curve-model.mjs');const src=fs.readFileSync(new URL('../../../../tool/src/js/20_sim.js',import.meta.url),'utf8');
 const code=src.slice(src.indexOf('function parseCurve('),src.indexOf('// 自定义发射器',src.indexOf('function parseCurve(')));
 const ctx=vm.createContext({clamp:(v,a,b)=>Math.min(b,Math.max(a,v))});vm.runInContext(code,ctx);
 for(const text of ['', '0:1, .7:1, 1:0','0:1, 0:2, 1:0','-2:-1;2:8','0:1，0.25:0.123456789\n1:4','bad']){
  assert.equal(JSON.stringify(parseCurve(text)),JSON.stringify(ctx.parseCurve(text)));
  for(const x of [0,.1,.6,1])assert.equal(at(parseCurve(text),x),ctx.lifeCurveAt(ctx.parseCurve(text),x));
 }
});
