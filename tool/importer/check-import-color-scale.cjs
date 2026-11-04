const fs=require('node:fs'),vm=require('node:vm');
// Reuse the existing full importer fixture, with its engine requests entirely mocked.
const source=fs.readFileSync(__dirname+'/check-import-life-modules.cjs','utf8').split('(async()=>{')[0];
const ctx={require,__dirname,console,Buffer,process};vm.createContext(ctx);
vm.runInContext(source+'\nglobalThis.probe={fixture,simple,vector,vectorKeys,scalarKeys,rounded,clone};',ctx);
const {fixture,simple}=ctx.probe;
const clone=x=>JSON.parse(JSON.stringify(x));
const vector=x=>clone(ctx.probe.vector(x)),vectorKeys=x=>clone(ctx.probe.vectorKeys(x)),scalarKeys=x=>clone(ctx.probe.scalarKeys(x)),rounded=x=>clone(ctx.probe.rounded(x));
const assert=require('node:assert/strict');let passes=0;
const check=(name,fn)=>{fn();console.log('PASS '+name);passes++;};
const scale=(extra={})=>({m:'ColorScaleOverLife',ColorScaleOverLife:{const:[1,1,1]},AlphaScaleOverLife:{const:1},note:'user-adjustable multiplier',...extra});
const cls='ParticleModuleColorScaleOverLife';
(async()=>{
 const old=fixture(simple([scale()]),__dirname+'/backups/20261007-color-scale-production.html');
 check('v2.20 already knows Scale Color/Life; cloud unknown-module assumption corrected',()=>assert.deepEqual(clone(old.backend.validate(old.item.spec)),[]));
 const oldBad=fixture(simple([scale({AlphaScaleOverLife:{const:[1,1,1]}})]),__dirname+'/backups/20261007-color-scale-production.html');
 check('v2.20 reproduces missing float validation',()=>assert.deepEqual(clone(oldBad.backend.validate(oldBad.item.spec)),[]));
 const current=fixture(simple([scale()]));
 check('vector alpha now rejected before writes',()=>assert(current.backend.validate(simple([scale({AlphaScaleOverLife:{const:[1,1,1]}})])).length>0));
 check('new module accepted at preview',()=>assert.deepEqual(clone(current.backend.validate(current.item.spec)),[]));
 for(const gpu of [false,true])for(const curves of [false,true]){
  const label=(gpu?'GPU':'CPU')+(curves?' curves':' constants');
  const m=curves?scale({ColorScaleOverLife:{curve:[[0,[2,1,.5]],[.3,[.75,1,3]],[1,[1,1,1]]]},AlphaScaleOverLife:{curve:[[0,0],[.1,.7],[.8,1],[1,.2]]},_note:'not a native property'}):scale();
  const alpha=[[0,0],[.1,1],[.15,.03],[.2,1],[.8,.6],[1,0]];
  const spec=simple([{m:'ColorOverLife',ColorOverLife:{const:[4,1,.3]},AlphaOverLife:{curve:alpha}},m],gpu);
  spec.emitters[0].required.pivot_offset=[-.5,-.0154];
  const f=fixture(spec);await f.run();
  const modules=f.modulesOf('Test',cls);check(label+' exactly one native class is created',()=>assert.equal(modules.length,1));
  const vd=f.distOf(modules[0],'ColorScaleOverLife'),ad=f.distOf(modules[0],'AlphaScaleOverLife');
  check(label+' complete source vector and alpha values retained',()=>{
   if(curves){assert.deepEqual(vectorKeys(vd.properties.ConstantCurve),rounded(m.ColorScaleOverLife.curve));assert.deepEqual(scalarKeys(ad.properties.ConstantCurve),rounded(m.AlphaScaleOverLife.curve));}
   else{assert.deepEqual(vector(vd.properties.Constant),[1,1,1]);assert.equal(ad.properties.Constant,1);}
  });
  check(label+' bake follows emitter type for both distributions',()=>{assert.equal(vd.properties.bCanBeBaked,gpu);assert.equal(ad.properties.bCanBeBaked,gpu);});
  check(label+' Scale Color/Life is final after synthesized Pivot',()=>assert(f.lodOf('Test').Modules.at(-1).path.includes(':'+cls+'_')));
  check(label+' existing AlphaOverLife flicker/fade preserved',()=>assert.deepEqual(scalarKeys(f.distOf(f.modulesOf('Test','ParticleModuleColorOverLife')[0],'AlphaOverLife').properties.ConstantCurve),rounded(alpha)));
  check(label+' note metadata never sent as native properties',()=>assert(!f.calls.some(c=>c.route==='/object/set'&&['note','_note'].some(k=>k in c.body.properties))));
  check(label+' particle saved only after modules are complete',()=>{assert(f.item.importProgress.saved.includes(f.item.assets.ps));assert(f.calls.findIndex(c=>c.body.function==='SaveAsset')>f.calls.findLastIndex(c=>c.route==='/object/container'&&c.body.container_path==='Modules'));});
 }
 for(const gpu of [false,true]){
  const f=fixture(simple([scale({ColorScaleOverLife:{const:[2,2,2],bake:!gpu},AlphaScaleOverLife:{const:.5,bake:!gpu}})],gpu));await f.run();
  check('explicit bake overrides default '+gpu,()=>{const m=f.modulesOf('Test',cls)[0];for(const k of ['ColorScaleOverLife','AlphaScaleOverLife'])assert.equal(f.distOf(m,k).properties.bCanBeBaked,!gpu);});
 }
 const invalid=[['missing color',{ColorScaleOverLife:undefined}],['missing alpha',{AlphaScaleOverLife:undefined}],['scalar color',{ColorScaleOverLife:{const:1}}],['vector alpha',{AlphaScaleOverLife:{const:[1,1,1]}}],['non-finite color',{ColorScaleOverLife:{const:[1,Infinity,1]}}],['non-finite alpha',{AlphaScaleOverLife:{const:NaN}}],['empty alpha curve',{AlphaScaleOverLife:{curve:[]}}],['reverse alpha time',{AlphaScaleOverLife:{curve:[[1,0],[0,1]]}}],['outside lifetime',{AlphaScaleOverLife:{curve:[[0,1],[2,0]]}}],['malformed alpha key',{AlphaScaleOverLife:{curve:[[0,1,2]]}}],['two alpha forms',{AlphaScaleOverLife:{const:1,curve:[[0,1]]}}],['bad alpha bake',{AlphaScaleOverLife:{const:1,bake:'false'}}],['bad vector bake',{ColorScaleOverLife:{const:[1,1,1],bake:0}}],['unknown distribution key',{AlphaScaleOverLife:{const:1,unknown:1}}]];
 for(const [name,extra]of invalid){const f=fixture(simple([scale(extra)]));check(name+' rejected at preview',()=>assert(f.backend.validate(f.item.spec).some(e=>e.includes('ColorScaleOverLife'))));await assert.rejects(f.run());check(name+' rejected before any engine request',()=>assert.equal(f.calls.length,0));}
 const bad=fixture(simple([scale({UnexpectedNativeField:1})]));await assert.rejects(bad.run(),/UnexpectedNativeField/);check('real native property error remains fatal and particle unsaved',()=>assert(!bad.item.importProgress.saved.includes(bad.item.assets.ps)));
 const unknown=fixture(simple([{m:'UnknownNewModule'}]));await assert.rejects(unknown.run());check('unknown future modules still block before writes',()=>assert.equal(unknown.calls.length,0));
 const repo='F:/FireWorksLab/analysis/results';let actualCount=0;
 for(const dir of ['RT6SE5','RT6ME4','RT6LE4','RT6SE4'])for(const suffix of ['', '_mobile']){
  const filename=repo+'/'+dir+'/RiseTail'+dir[3]+'_cascade'+suffix+'.json';if(!fs.existsSync(filename))continue;
  const spec=JSON.parse(fs.readFileSync(filename,'utf8'));if(!spec.emitters.some(e=>e.modules.some(m=>m.m==='ColorScaleOverLife')))continue;
  const f=fixture(spec);check(dir+suffix+' actual package validates',()=>assert.deepEqual(clone(f.backend.validate(spec)),[]));await f.run();
  check(dir+suffix+' all actual emitters preserve color/alpha with final multiplier',()=>{for(const e of spec.emitters){const m=e.modules.find(m=>m.m==='ColorScaleOverLife');assert(m);const mods=f.modulesOf(e.name,cls);assert.equal(mods.length,1);assert.equal(f.lodOf(e.name).Modules.at(-1).path,mods[0].path);for(const prop of ['ColorScaleOverLife','AlphaScaleOverLife']){const d=f.distOf(mods[0],prop);if(m[prop].const!==undefined)assert.deepEqual(prop==='ColorScaleOverLife'?vector(d.properties.Constant):d.properties.Constant,m[prop].const);else assert.deepEqual((prop==='ColorScaleOverLife'?vectorKeys:scalarKeys)(d.properties.ConstantCurve),rounded(m[prop].curve));}}});actualCount++;
 }
 check('at least one real Baker4.9.24+ export covered',()=>assert(actualCount>0));
 fs.writeFileSync(__dirname+'/backups/20261007-color-scale-isolated.json',JSON.stringify({passes,actualCount,realUERequests:0},null,2));console.log(passes+' color scale checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
