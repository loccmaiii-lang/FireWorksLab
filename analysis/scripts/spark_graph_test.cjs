const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..'),G=require('vm').runInNewContext(fs.readFileSync(path.join(root,'tool/src/js/46_graph_model.js'),'utf8')+';SparkGraph'),presets=JSON.parse(fs.readFileSync(path.join(root,'experiments/spark-graph/presets.json'),'utf8'));
const results={};
for(const [key,recipe]of Object.entries(presets)){
 const g=G.build(recipe);assert.equal(recipe.emitters.length,13);
 const x=G.geometry(g,.377),y=G.geometry(g,.377+recipe.period);assert.equal(x.data.length,y.data.length);
 let max=0;for(let i=0;i<x.data.length;i++)max=Math.max(max,Math.abs(x.data[i]-y.data[i]));assert(max<1e-5);
 let parentError=0;for(const q of g.all)if(q.parent){const p=G.sample(q.parent,q.eventAge).p,s=G.sample(q,0).p;parentError=Math.max(parentError,...p.map((v,i)=>Math.abs(v-s[i])));}assert(parentError<1e-10);
 const q=g.all.find(q=>q.e.id==='e02'),z=structuredClone(q);z.e.drag=0;const a=.03,s=G.sample(z,a);assert(Math.abs(s.p[2]-(z.p[2]+z.v[2]*a+z.e.gravity[2]*a*a/2+z.e.noise*(Math.sin(2*Math.PI*z.e.noiseHz*a+z.phase+4.34)-Math.sin(z.phase+4.34))*a))<1e-9);
 const r2=structuredClone(recipe);r2.emitters[1].gain*=2;const g2=G.build(r2);assert.deepEqual(g.all.map(q=>[q.birth,q.life,q.p,q.v]),g2.all.map(q=>[q.birth,q.life,q.p,q.v]));
 const invalid=structuredClone(recipe);invalid.emitters[0].probability=1.1;assert.throws(()=>G.build(invalid));invalid.emitters[0].probability=1;invalid.emitters[0].sizeCurve=[[.7,1],[.2,.5]];assert.throws(()=>G.build(invalid));
 const still=structuredClone(q);still.e.noiseHz=0;const without=structuredClone(still);without.e.noise=0;assert.deepEqual(G.sample(still,.1),G.sample(without,.1));
 const bins=Array(64).fill(0);for(const q of g.all)if(!q.parent)bins[Math.floor(G.mod(q.birth,recipe.period)/recipe.period*64)]++;
 const ratio=Math.max(...bins)/(bins.reduce((a,b)=>a+b,0)/bins.length);assert(ratio>2,'需有显著短爆发');
 const coverage={};for(let tick=0;tick<64;tick++){const s=G.geometry(g,tick/30);for(const id of Object.keys(s.counts))coverage[id]=true;}assert.equal(Object.keys(coverage).length,13);
 results[key]={particles:g.all.length,shapeCoverage:Object.keys(coverage).length,periodError:max,parentPositionError:parentError,birthPeakToMean:ratio,bins};
}
fs.writeFileSync(path.join(root,'analysis/results/SparkGraph/模拟检查.json'),JSON.stringify(results,null,2));console.log(results);
