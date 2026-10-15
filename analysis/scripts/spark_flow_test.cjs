const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'analysis/results/SparkFlow'),ctx=vm.createContext({console});
const model=fs.readFileSync(path.join(root,'tool/src/js/46_graph_model.js'),'utf8').split('// =====================================================================')[0];
vm.runInContext(fs.readFileSync(path.join(root,'tool/src/js/45_spark_flow.js'),'utf8')+model+';globalThis.G=SparkGraph;globalThis.F=SparkFlow;',ctx);
const {G,F}=ctx,recipe=JSON.parse(fs.readFileSync(path.join(out,'修订前参数.json'),'utf8')).entries[0].p.sparkGraph;
const r=structuredClone(recipe);r.emitters=r.emitters.slice(0,1);r.emitters[0].count=8;
const off=G.build(r),explicit=G.build({...r,fieldEnabled:0});
for(let i=0;i<8;i++)assert.deepEqual(G.sample(off.all[i],.1),G.sample(explicit.all[i],.1));
const base={...r,fieldEnabled:1,fieldResponse:10,fieldStart:0,fieldRamp:.01,fieldWindX:2,fieldWindZ:0,fieldConverge:0,fieldTurbulence:0};
function particle(f,dt=1/240){const q={e:{drag:0,gravity:[0,0,0],noise:0,noiseHz:0},p:[0,0,-1],v:[0,0,0],phase:0,birth:0,life:1};F.attach(q,F.prepare(f,dt));return q;}
const q=particle(base),s=F.sample(q,.4),v=2*(1-Math.exp(-4)),x=2*(.4-(1-Math.exp(-4))/10);assert(Math.abs(s.v[0]-v)<1e-6);assert(Math.abs(s.p[0]-x)<1e-6);
const before=JSON.stringify(F.sample(q,.4));F.sample(q,.8);F.sample(q,.05);assert.equal(JSON.stringify(F.sample(q,.4)),before);
const bend={...base,fieldWindX:0,fieldWindZ:-10,fieldResponse:35,fieldStart:1,fieldRamp:1,fieldConverge:8};
const b=particle(bend);b.p=[0,0,0];b.v=[5,0,-10];b.flow=null;F.attach(b,F.prepare(bend));const near=G.sample(b,.05),mid=G.sample(b,.2),far=G.sample(b,.5);assert(Math.abs(near.p[0]-.25)<1e-8);assert(mid.p[0]>near.p[0]&&far.p[0]<mid.p[0]);
const field=F.prepare({...bend,fieldTurbulence:8}),p=[.2,1,-3];const a=F.velocity(field,p,.7),z=F.velocity(field,p,.7+field.period);assert(Math.max(...a.map((v,i)=>Math.abs(v-z[i])))<1e-12);
const fine=particle({...bend,fieldStart:0,fieldTurbulence:8},1/480),coarse=particle({...bend,fieldStart:0,fieldTurbulence:8});const ca=F.sample(coarse,.6),fi=F.sample(fine,.6),error=Math.hypot(...ca.p.map((v,i)=>v-fi.p[i]));assert(error<1e-4);
const childRecipe=structuredClone(recipe);childRecipe.emitters=childRecipe.emitters.slice(0,6);childRecipe.emitters.forEach(e=>{e.count=8;e.children=Math.min(e.children,2)});Object.assign(childRecipe,bend,{emitters:childRecipe.emitters});const cg=G.build(childRecipe);let children=0;
for(const c of cg.all.filter(q=>q.parent)){const p=G.sample(c.parent,c.eventAge);assert.deepEqual(c.p,p.p);const dir=G.direction(c.e,c.id),speed=G.dist(c.e.speed,G.hash(c.e.seed,c.id,3));assert(c.v.every((v,i)=>Math.abs(v-(dir[i]*speed+p.v[i]*c.e.inherit))<1e-10));children++;}assert(children>0);
assert.throws(()=>F.prepare({...base,fieldScale:0}));assert.throws(()=>F.prepare({...base,fieldAxisZ:0}));assert.throws(()=>F.prepare({...base,fieldCycles:1.5}));
const excluded=particle(base);excluded.e.fieldCoupling=0;delete excluded.flow;F.attach(excluded,F.prepare(base));assert.equal(excluded.flow,undefined);
const ds=1e-5,t=.377,L=F.sample(coarse,t-ds),C=F.sample(coarse,t),H=F.sample(coarse,t+ds);assert(Math.hypot(...C.v.map((v,i)=>v-(H.p[i]-L.p[i])/(2*ds)))<1e-4);
const current=JSON.parse(fs.readFileSync(path.join(root,'analysis/原理/条目_窜天猴与仙女棒.json'),'utf8')).entries[0].p.sparkGraph;
const onGraph=G.build(current),oldGraph=G.build(recipe);assert.equal(onGraph.all.length,oldGraph.all.length);assert.deepEqual(onGraph.all.map(q=>q.birth),oldGraph.all.map(q=>q.birth));
let oldRadius=0,newRadius=0,inward=0,measured=0;
for(let i=0;i<onGraph.all.length;i+=131){const q=onGraph.all[i],o=oldGraph.all[i];if(q.parent||q.life<.15)continue;const a=q.life*.8,p=G.sample(q,a),p0=G.sample(o,a);oldRadius+=Math.hypot(p0.p[0],p0.p[1]);newRadius+=Math.hypot(p.p[0],p.p[1]);if(p.p[0]*p.v[0]+p.p[1]*p.v[1]<0)inward++;measured++;}
assert(newRadius<oldRadius&&inward>0);
const report={pass:true,disabledExact:true,windAnalyticError:Math.abs(s.p[0]-x),near:near.p,mid:mid.p,far:far.p,halfStepPositionError:error,childChecks:children,randomSeekExact:true,periodicField:true,layerExclusion:true,velocityDerivative:true,particleCount:onGraph.all.length,birthScheduleUnchanged:true,radialRatio:newRadius/oldRadius,inward,measured};fs.writeFileSync(path.join(out,'模型检查.json'),JSON.stringify(report,null,2));console.log(report);
