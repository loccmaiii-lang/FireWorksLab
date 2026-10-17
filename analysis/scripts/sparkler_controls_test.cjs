/* 整体与分叉控制：默认兼容、原值保护、亲子接续与各项独立作用。 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const R=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(R,p),'utf8');
const core=s=>s.split('// =====================================================================')[0];
const before=p=>execFileSync('git',['show','58ae8755:'+p],{cwd:R,maxBuffer:30e6}).toString('utf8');
function model(source){const c=vm.createContext({});vm.runInContext(read('tool/src/js/45_spark_flow.js')+'\n'+core(source)+'\nglobalThis.G=SparkGraph',c);return c.G;}
const G=model(read('tool/src/js/46_graph_model.js')),B=model(before('tool/src/js/46_graph_model.js'));
const entries=JSON.parse(before('analysis/原理/条目_窜天猴与仙女棒.json')).entries,copy=x=>JSON.parse(JSON.stringify(x));
const keys=['scaleCone','scaleCount','scaleWidth','scaleLife','scaleGain','scaleSpeed','scaleGravity','branchLife','branchAngle','branchCount','branchWidth','branchSpeed','branchGravity'];
for(const k of keys)assert.equal(G.parameterDefault('sparkGraph.'+k),1,k+'缺省1');
const near=(a,b,m)=>assert.ok(Math.abs(a-b)<1e-10,m+`: ${a} / ${b}`);
for(const entry of entries){const r=copy(entry.p.sparkGraph),old=B.build(r),one=copy(r);for(const k of keys)one[k]=1;
 for(const trial of [r,one]){const g=G.build(trial);assert.equal(g.all.length,old.all.length);
  for(const t of [.17,.69,1.7])assert.equal(JSON.stringify(G.flatGeometry(g,t,512)),JSON.stringify(B.flatGeometry(old,t,512)),entry.id+'默认像素输入');
 }
}
let r=copy(entries.find(e=>e.id==='SGS1').p.sparkGraph);r.fieldEnabled=0;
for(const e of r.emitters){e.probability=1;e.noise=0;}
const base=G.build(r),snapshot=JSON.stringify(r),scaled=k=>G.build({...copy(r),[k]:2}),layer=(g,id)=>g.byId.get(id),n=v=>Math.hypot(...v);
let g=scaled('scaleSpeed');for(const q of g.all){const b=layer(base,q.e.id)[q.id];if(!q.parent)near(n(q.v),2*n(b.v),'整体初速');else {const s=G.sample(q.parent,q.eventAge),bs=G.sample(b.parent,b.eventAge);for(let i=0;i<3;i++)near(q.v[i]-s.v[i]*q.e.inherit,2*(b.v[i]-bs.v[i]*b.e.inherit),'继承速度不重复乘');}}
g=scaled('branchSpeed');for(const q of g.all){const b=layer(base,q.e.id)[q.id];if(!q.parent)assert.equal(JSON.stringify(q.v),JSON.stringify(b.v));else {const s=G.sample(q.parent,q.eventAge),bs=G.sample(b.parent,b.eventAge);for(let i=0;i<3;i++)near(q.v[i]-s.v[i]*q.e.inherit,2*(b.v[i]-bs.v[i]*b.e.inherit),'分叉自身初速');}near(q.width,b.width,'速度不改直径');}
for(const k of ['scaleGravity','branchGravity','branchWidth','branchLife']){g=scaled(k);for(const q of g.all){const b=layer(base,q.e.id)[q.id],factor=k.startsWith('scale')||q.parent?2:1;
 if(k.endsWith('Gravity'))for(let i=0;i<3;i++)near(q.e.gravity[i],b.e.gravity[i]*factor,k);
 if(k==='branchWidth')near(q.width,b.width*factor,k);
 if(k==='branchLife')near(q.life,b.life*factor,k);
 if(q.parent){const s=G.sample(q.parent,q.eventAge);assert.equal(JSON.stringify(q.p),JSON.stringify(s.p),'子粒在有效母轨迹出生');}
}}
g=scaled('branchCount');for(const id of ['e06','e07','e08'])assert.equal(layer(g,id).length,layer(base,id).length*2,'分叉数量不逐代复乘 '+id);
g=G.build({...r,branchAngle:0});for(const q of g.all.filter(q=>q.parent)){const s=G.sample(q.parent,q.eventAge),a=n(s.v)>1e-12?s.v:q.e.direction,d=q.v.map((v,i)=>v-s.v[i]*q.e.inherit),cos=d.reduce((x,v,i)=>x+v*a[i],0)/(n(d)*n(a));near(cos,1,'零角沿母粒速度');}
assert.equal(JSON.stringify(r),snapshot,'构建不回写原始参数');
assert.equal(JSON.stringify(G.geometry(G.build(g.recipe),.41)),JSON.stringify(G.geometry(g,.41)),'有效值只应用一次');
for(const k of keys){assert.throws(()=>G.build({...copy(r),[k]:NaN}));assert.throws(()=>G.build({...copy(r),[k]:-1}));}
for(const k of ['scaleLife','branchLife'])assert.throws(()=>G.build({...copy(r),[k]:0}));
assert.throws(()=>G.build({...copy(r),branchLife:100}),/寿命/);
assert.throws(()=>G.build({...copy(r),branchSpeed:Number.MAX_VALUE}),/初速/);
assert.throws(()=>G.build({...copy(r),branchCount:Number.MAX_VALUE}),/数量/);
console.log('通过：缺省1、两候选默认几何、初速/继承/重力/大小/寿命/数量/角度、亲子接续、原值保护与非法值');
