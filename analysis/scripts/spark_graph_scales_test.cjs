// 整体倍率的行为检查：亲子结构、默认兼容及原始配方保护。
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),ctx=vm.createContext({console});
vm.runInContext(fs.readFileSync(path.join(root,'tool/src/js/45_spark_flow.js'),'utf8')+fs.readFileSync(path.join(root,'tool/src/js/46_graph_model.js'),'utf8').split('// =====================================================================')[0]+';globalThis.G=SparkGraph;',ctx);
const G=ctx.G,keys=['scaleCone','scaleCount','scaleWidth','scaleLife','scaleGain'];
for(const k of keys)assert.equal(G.parameterDefault('sparkGraph.'+k),1);
const source=JSON.parse(fs.readFileSync(path.join(root,'analysis/原理/条目_窜天猴与仙女棒.json'),'utf8')).entries[0].p.sparkGraph;
const r=structuredClone(source);r.fieldEnabled=0;r.emitters=r.emitters.filter(e=>['e05','e06','e08'].includes(e.id));r.emitters.forEach(e=>{e.count=20;e.children=3;e.probability=1;e.delay=e.parent?.007:0;});
const snap=g=>JSON.stringify(g.all.map(q=>({id:q.id,birth:q.birth,life:q.life,width:q.width,power:q.power,p:q.p,v:q.v})));
const raw=JSON.stringify(r),base=G.build(r),ones=G.build({...r,...Object.fromEntries(keys.map(k=>[k,1]))});assert.equal(snap(base),snap(ones));
const scaled=G.build({...r,scaleCount:2});for(const e of r.emitters)assert.equal(scaled.byId.get(e.id).length,2*base.byId.get(e.id).length);
assert.equal(G.build({...r,scaleCount:0}).all.length,0);
const changed={...r,scaleWidth:1.6,scaleGain:1.2,scaleLife:1.4,scaleCone:.5};
const next=G.build(changed);assert.equal(snap(next),snap(G.build(changed)));assert.equal(snap(next),snap(G.build(next.recipe)));
for(let i=0;i<base.all.length;i++){const a=base.all[i],b=next.all[i];assert(Math.abs(b.width-a.width*1.6)<1e-10);assert(Math.abs(b.power-a.power*1.2)<1e-10);assert(Math.abs(b.life-a.life*1.4)<1e-10);if(b.parent){assert.deepEqual(b.p,G.sample(b.parent,b.eventAge).p);assert(Math.abs(b.eventAge-(b.parent.life*b.e.event+b.e.delay))<1e-10);}}
const sphere=structuredClone(r);sphere.emitters.forEach(e=>e.directionMode='sphere');assert.equal(snap(G.build(sphere)),snap(G.build({...sphere,scaleCone:2})));
assert.equal(JSON.stringify(r),raw);
for(const k of keys){assert.throws(()=>G.build({...r,[k]:-1}));assert.throws(()=>G.build({...r,[k]:Infinity}));}
assert.throws(()=>G.build({...r,scaleLife:0}));assert.throws(()=>G.build({...r,scaleLife:100}));assert.throws(()=>G.build({...r,scaleCone:100}));assert.throws(()=>G.build({...r,scaleCount:100000}));
const flow=G.build({...changed,fieldEnabled:1});for(const q of flow.all.filter(q=>q.parent))assert.deepEqual(q.p,G.sample(q.parent,q.eventAge).p);
console.log('整体倍率：默认1、线性数量、子孙结构、原值保护、重复构建、寿命联动、气流亲子接续及错误拦截通过');
