const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/check-import-life-modules.cjs','utf8').split('(async()=>{')[0];
const ctx={require,__dirname,console,Buffer,process};vm.createContext(ctx);vm.runInContext(source+'\nglobalThis.probe={fixture,simple};',ctx);
const {fixture,simple}=ctx.probe;
const clone=x=>JSON.parse(JSON.stringify(x));let passes=0;
const ENTRY=process.env.FWL_IMPORTER_HTML||__dirname+'/../df-fireworks-delivery_locmai.html';
const check=(n,f)=>{f();console.log('PASS '+n);passes++;};
const make=()=>{const s=clone(simple([{m:'Lifetime',Lifetime:{uniform:[.5,2]}}],true));s.emitters[0].spawn={rate:{const:100},bursts:[[0,10]]};s.emitters[0].required={duration_s:3,loops:1};return s;};
(async()=>{
 const f=fixture(make(),ENTRY);assert.equal(typeof f.backend.particleSystemPolicy,'function','system policy is missing on old production');
 const p=f.backend.particleSystemPolicy();
 check('system policy includes fixed 10FPS, explicit delta, 1200m culling and generous fixed box',()=>{
  assert.equal(p.UpdateTime_FPS,10);assert.equal(p.UpdateTime_Delta,.1);assert.equal(p.SystemUpdateMode,'EPSUM_FixedTime');assert.equal(p.CullingDistance,120000);assert.equal(p.bUseFixedRelativeBoundingBox,true);assert.match(p.FixedRelativeBoundingBox,/-100000/);assert.match(p.FixedRelativeBoundingBox,/100000/);
 });
 check('all screenshot system fields explicit',()=>{for(const k of ['WarmupTime','WarmupTickRate','SecondsBeforeInactive'])assert.equal(p[k],0);assert.equal(p.ThumbnailWarmup,1);assert.equal(p.bUseRealtimeThumbnail,false);assert.equal(p.LODDistanceCheckTime,1);assert.equal(p.LODDistances,'(0.000000)');assert.equal(p.LODMethod,'PARTICLESYSTEMLODMETHOD_ActivateAutomatic');assert.equal(p.MaxVRSShadingRate,'VRS_2X2');assert.equal(p.ForceVRSShadingRate,'VRS_None');});
 // v2.30 LODMethod：一次性 → ActivateAutomatic；有启用的无限循环发射器 → Automatic；关掉的循环发射器不算
 const loopSpec=()=>{const s=make();s.emitters.push({...clone(s.emitters[0]),name:'Loop',required:{duration_s:1,loops:0}});return s;};
 check('one-shot pack gets ActivateAutomatic',()=>assert.equal(f.backend.particleSystemPolicy(null,make()).LODMethod,'PARTICLESYSTEMLODMETHOD_ActivateAutomatic'));
 check('pack with an enabled infinite-loop emitter gets Automatic',()=>assert.equal(f.backend.particleSystemPolicy(null,loopSpec()).LODMethod,'PARTICLESYSTEMLODMETHOD_Automatic'));
 check('disabled looping emitter does not make the pack looping',()=>{const s=loopSpec();s.emitters[1].enabled=false;assert.equal(f.backend.particleSystemPolicy(null,s).LODMethod,'PARTICLESYSTEMLODMETHOD_ActivateAutomatic');});
 check('finite loops (2) stay one-shot',()=>{const s=make();s.emitters[0].required.loops=2;assert.equal(f.backend.particleSystemPolicy(null,s).LODMethod,'PARTICLESYSTEMLODMETHOD_ActivateAutomatic');});
 const calc=(s,o)=>clone(f.backend.gpuDrawLimits({spec:s,gpuMeasuredPeaks:o}));
 check('rate/life/burst calculates distinct conservative count with tick margin',()=>assert.equal(calc(make())[0].limit,221));
 const loop=make();loop.emitters[0].required={duration_s:.5,loops:0};loop.emitters[0].spawn={rate:{uniform:[0,10]},bursts:[[0,20]]};
 check('infinite loop burst overlap is bounded using lifetime and cycle duration',()=>assert.equal(calc(loop)[0].limit,142));
 loop.emitters[0].required.loops=2;
 check('finite loops cap total emission',()=>assert.equal(calc(loop)[0].limit,52));
 const curve=make();curve.emitters[0].spawn.rate={curve:[[0,10],[5,200]]};
 check('emitter-seconds curve keys beyond1 allowed',()=>assert.equal(calc(curve)[0].limit,431));
 const identity=f.backend.gpuEmitterKey(make().emitters[0],0);
 check('measured peak explicitly overrides calculated value',()=>{const v=calc(make(),{[identity]:123})[0];assert.equal(v.limit,123);assert.equal(v.calculated,221);assert.equal(v.source,'measured');});
 check('stale identity does not apply to changed emitter source',()=>{const s=make();s.emitters[0].spawn.rate.const=20;assert.equal(calc(s,{[identity]:123})[0].source,'calculated');});
 for(const bad of [0,-1,1.5,'12x',Infinity,2147483648])check('invalid measured peak rejected '+bad,()=>assert.throws(()=>calc(make(),{[identity]:bad})));
 for(const change of [s=>{s.emitters[0].modules=[];s.emitters[0].required.loops=0;},s=>s.emitters[0].spawn.rate={const:Infinity},s=>s.emitters[0].spawn.bursts=[[0,-5]],s=>s.emitters[0].required.duration_s=0,s=>s.emitters[0].required.loops=-1])check('invalid calculation data stops before writes',()=>{const s=make();change(s);assert.throws(()=>calc(s));});
 check('skipped particle does not require GPU data',()=>{const s=make();s.emitters[0].modules=[];assert.deepEqual(clone(f.backend.gpuDrawLimits({spec:s,selectedAssetKeys:[]})),[]);});
 await f.run();
 check('new particle writes explicit policy and its own draw count',()=>{assert.equal(f.nodes.get(f.psPath).CullingDistance,120000);const req=f.nodes.get(f.lodOf('Test').RequiredModule.path);assert.equal(req.bUseMaxDrawCount,true);assert.equal(req.MaxDrawCount,221);});
 check('real import writes and reads back one-shot LODMethod',()=>assert.equal(f.nodes.get(f.psPath).LODMethod,'PARTICLESYSTEMLODMETHOD_ActivateAutomatic'));
 const looped=fixture(loopSpec(),ENTRY);await looped.run();check('real import of a looping pack writes Automatic',()=>assert.equal(looped.nodes.get(looped.psPath).LODMethod,'PARTICLESYSTEMLODMETHOD_Automatic'));
 const wrong=fixture(make(),ENTRY);await wrong.run();wrong.nodes.set(wrong.psPath,{...wrong.nodes.get(wrong.psPath),LODMethod:'PARTICLESYSTEMLODMETHOD_Automatic'});await assert.rejects(wrong.backend.verifyParticleSystemPolicy(wrong.psPath,null,make()),/LODMethod/);check('wrong LODMethod readback is fatal',()=>assert.ok(true));
 const cpu=fixture(clone(simple([{m:'Lifetime',Lifetime:{const:1}}],false)));await cpu.run();
 check('CPU emitter does not receive automatic GPU limits',()=>assert(!Object.hasOwn(cpu.nodes.get(cpu.lodOf('Test').RequiredModule.path),'MaxDrawCount')));
 const skip=fixture(make());skip.item.selectedAssetKeys=[];await assert.rejects(skip.run(),/未选择任何资产/);check('empty selection means no system/emitter writes',()=>assert(!skip.calls.some(c=>c.route==='/object/set'&&(c.body.properties.CullingDistance||c.body.properties.MaxDrawCount))));
 const measured=fixture(make());measured.item.gpuMeasuredPeaks={[identity]:111};await measured.run();check('measured limit is actually written',()=>assert.equal(measured.nodes.get(measured.lodOf('Test').RequiredModule.path).MaxDrawCount,111));
 const {fixture:updateFixture}=require('./check-import-update-backend.cjs');
 const updated=updateFixture();await updated.run();check('same-name rebuild applies system policy',()=>assert.equal(updated.get(updated.ps).CullingDistance,120000));
 const failed=updateFixture({saveFail:true}),old={...clone(f.backend.particleSystemPolicy()),CullingDistance:90000,UpdateTime_FPS:60,UpdateTime_Delta:1/60,SystemUpdateMode:'EPSUM_RealTime',FixedRelativeBoundingBox:'(Min=(X=-40000,Y=-40000,Z=-40000),Max=(X=40000,Y=40000,Z=40000),IsValid=1)',LODDistances:[77]};
 failed.nodes.set(failed.ps,{...failed.get(failed.ps),...old});await assert.rejects(failed.run(),/保存失败/);
 check('failed update restores old system policy and emitter references',()=>{for(const k of ['CullingDistance','UpdateTime_FPS','UpdateTime_Delta','SystemUpdateMode','FixedRelativeBoundingBox'])assert.deepEqual(failed.get(failed.ps)[k],old[k]);assert.deepEqual(failed.get(failed.ps).Emitters.map(e=>e.path),failed.oldPaths);});
 check('failed update restores previous LOD distance instead of keeping zero',()=>assert.deepEqual(failed.get(failed.ps).LODDistances,[77]));
 const struct=updateFixture({saveFail:true});struct.nodes.set(struct.ps,{...struct.get(struct.ps),FixedRelativeBoundingBox:{_struct:'Box',Min:{X:-33,Y:-44,Z:-55},Max:{X:33,Y:44,Z:55},IsValid:1}});await assert.rejects(struct.run());
 check('native returned Box struct is converted to valid rollback text',()=>assert.match(struct.get(struct.ps).FixedRelativeBoundingBox,/Min=\(X=-33\.000000,Y=-44\.000000,Z=-55\.000000\)/));
 f.nodes.set(f.psPath,{...f.nodes.get(f.psPath),CullingDistance:0});await assert.rejects(f.backend.verifyParticleSystemPolicy(f.psPath),/CullingDistance/);check('wrong native policy readback is fatal',()=>assert.equal(f.nodes.get(f.psPath).CullingDistance,0));
 const partial=updateFixture();partial.it.selectedAssetKeys=['tex:main'];await partial.run();check('texture-only import never modifies particle policy',()=>assert(!partial.calls.some(c=>c.route==='/object/set'&&Object.hasOwn(c.body.properties,'CullingDistance'))));
 for(const [dir,size]of [['RT6SE5','S'],['RT6ME4','M'],['RT6LE4','L']]){
  const s=JSON.parse(fs.readFileSync('F:/FireWorksLab/analysis/results/'+dir+'/RiseTail'+size+'_cascade.json','utf8'));const limits=calc(s);check(dir+' actual GPU emitters all have positive calculated limits',()=>{assert(limits.length>=6);assert(limits.every(v=>Number.isInteger(v.limit)&&v.limit>0));assert(new Set(limits.map(v=>v.limit)).size>2);});
 }
 fs.writeFileSync(__dirname+'/backups/20261007-system-policy-isolated.json',JSON.stringify({passes,realUERequests:0},null,2));console.log(passes+' system policy checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
