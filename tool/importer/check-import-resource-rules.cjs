// v2.28 资源规范四项（FireWorksLab 4.9.113 cascade 字段）：包里有就写并读回，旧包「更新」保留 UE 现值。全部 UE 调用模拟，不写真资产。
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
// 测烘焙器交付后用的独立交付入口（不是特效工作台 v2）；两种夹具都显式传入口
const ENTRY=process.env.FWL_IMPORTER_HTML||__dirname+'/../df-fireworks-delivery_locmai.html';
const source=fs.readFileSync(__dirname+'/check-import-life-modules.cjs','utf8').split('(async()=>{')[0];
const ctx={require,__dirname,console,Buffer,process};vm.createContext(ctx);vm.runInContext(source+'\nglobalThis.probe={fixture,simple};',ctx);
const {fixture,simple}=ctx.probe;
const clone=x=>JSON.parse(JSON.stringify(x));let passes=0;const fails=[];
const check=async(n,f)=>{try{await f();console.log('PASS '+n);passes++;}catch(e){fails.push(n);console.log('FAIL '+n+' — '+String(e.message).split('\n')[0]);}};
const BOX={min:[-30350,-30350,-35850],max:[30350,30350,30610]};
const fresh=(extra={})=>{const s=clone(simple([{m:'Lifetime',Lifetime:{const:2}}],false));s.system={preview_distance_cm:30000,fixed_bounds:clone(BOX)};
  s.emitters[0].required.uv_flip='RandomFlipUOnly';s.resource_rules={format:'fwl.resource-rules/1'};return Object.assign(s,extra);};
const legacy=()=>clone(simple([{m:'Lifetime',Lifetime:{const:2}}],false));
const boxOf=v=>{const m=/Min=\(X=([-\d.]+),Y=([-\d.]+),Z=([-\d.]+)\),Max=\(X=([-\d.]+),Y=([-\d.]+),Z=([-\d.]+)\)/.exec(v);return m?{min:m.slice(1,4).map(Number),max:m.slice(4,7).map(Number)}:null;};
(async()=>{
 const f0=fixture(fresh(),ENTRY),B=f0.backend;
 await check('校验：合法的新字段不报错',()=>assert.deepEqual(clone(B.validate(fresh())).filter(e=>/fixed_bounds|uv_flip|emissive_dissolve/.test(e)),[]));
 for(const [why,mut,re] of [
  ['盒 min ≥ max',s=>{s.system.fixed_bounds.min[0]=40000;},/fixed_bounds/],
  ['盒不是三维',s=>{s.system.fixed_bounds.max=[1,2];},/fixed_bounds/],
  ['盒非有限数',s=>{s.system.fixed_bounds.max[2]=Infinity;},/fixed_bounds/],
  ['不支持的翻转',s=>{s.emitters[0].required.uv_flip='FlipUV';},/uv_flip/],
  ['借用材质写 0.98',s=>{s.materials.m.emissive_dissolve=0.98;},/emissive_dissolve/],
  ['0.98 超出范围',s=>{s.materials.m={role:'flipbook_rgba',emissive_dissolve:1.5};},/emissive_dissolve/]])
  await check('校验：'+why+' → 拦下（不写 UE）',()=>{const s=fresh();mut(s);assert(clone(B.validate(s)).some(e=>re.test(e)));});
 await check('旧包（没有新字段）校验结果和 v2.27 一样，不多报',()=>assert.deepEqual(clone(B.validate(legacy())).filter(e=>/fixed_bounds|uv_flip|emissive_dissolve/.test(e)),[]));
 await f0.run();
 await check('新建粒子：固定盒按包写（读回一致），不是 ±100000',()=>{const ps=f0.nodes.get(f0.psPath);assert.equal(ps.bUseFixedRelativeBoundingBox,true);assert.deepEqual(boxOf(ps.FixedRelativeBoundingBox),BOX);});
 await check('新建粒子：Required 写 UVFlippingMode = RandomFlipUOnly',()=>assert.equal(f0.nodes.get(f0.lodOf('Test').RequiredModule.path).UVFlippingMode,'RandomFlipUOnly'));
 await check('新建粒子：其余系统规范照旧（10FPS / 1200 m 剔除）',()=>{const ps=f0.nodes.get(f0.psPath);assert.equal(ps.UpdateTime_FPS,10);assert.equal(ps.CullingDistance,120000);});
 const f1=fixture(legacy(),ENTRY);await f1.run();
 await check('旧包新建：盒照旧 ±100000、不写翻转（和 v2.27 相同）',()=>{assert.deepEqual(boxOf(f1.nodes.get(f1.psPath).FixedRelativeBoundingBox),{min:[-100000,-100000,-100000],max:[100000,100000,100000]});assert(!Object.hasOwn(f1.nodes.get(f1.lodOf('Test').RequiredModule.path),'UVFlippingMode'));});
 const fcp=fresh();fcp.emitters[0].required.screen_alignment='FacingCameraPosition';const f2=fixture(fcp,ENTRY);await f2.run();
 await check('FacingCameraPosition 照包写（旧导入器已支持，这里读回）',()=>assert.equal(f2.nodes.get(f2.lodOf('Test').RequiredModule.path).ScreenAlignment,'PSA_FacingCameraPosition'));
 // 读回不一致必须拦下：模拟 UE 把翻转改不进去
 const f3=fixture(fresh(),ENTRY);
 await check('读回不一致（UE 没写进翻转）→ 报错，不当成功',async()=>{const orig=f3.nodes.set.bind(f3.nodes);f3.nodes.set=(k,v)=>orig(k,v&&v.UVFlippingMode?{...v,UVFlippingMode:'None'}:v);await assert.rejects(f3.run(),/朝向 \/ UV 翻转读回不一致/);});
 // 同名更新：用更新夹具（已有 PS / 发射器），比较旧包与新包
 const {fixture:updateFixture}=require('./check-import-update-backend.cjs');
 const handBox='(Min=(X=-24560,Y=-24560,Z=-24560),Max=(X=24560,Y=24560,Z=24560),IsValid=1)';
 const u1=updateFixture({htmlFile:ENTRY});u1.nodes.set(u1.ps,{...u1.get(u1.ps),bUseFixedRelativeBoundingBox:true,FixedRelativeBoundingBox:handBox});await u1.run();
 await check('旧包同名更新：UE 里手调的盒保留，不改回 ±100000',()=>assert.deepEqual(boxOf(u1.get(u1.ps).FixedRelativeBoundingBox),{min:[-24560,-24560,-24560],max:[24560,24560,24560]}));
 const u2=updateFixture({htmlFile:ENTRY});u2.nodes.set(u2.ps,{...u2.get(u2.ps),bUseFixedRelativeBoundingBox:true,FixedRelativeBoundingBox:'(Min=(X=-100000,Y=-100000,Z=-100000),Max=(X=100000,Y=100000,Z=100000),IsValid=1)'});await u2.run();
 await check('旧包同名更新：原来就是 ±100000 的照旧',()=>assert.deepEqual(boxOf(u2.get(u2.ps).FixedRelativeBoundingBox),{min:[-100000,-100000,-100000],max:[100000,100000,100000]}));
 // 材质 0.98 与 Required 朝向 / 翻转：更新会清材质覆盖、重建发射器
 const miOf=t=>t.get(Object.entries(t.it.assets).filter(([k])=>k.startsWith('mat:')).map(([,p])=>p+'.'+p.split('/').pop())[0]);
 const dis=t=>(miOf(t).ScalarParameterValues||[]).find(s=>s.ParameterInfo.Name==='EmissiveDissolve')?.ParameterValue;
 const reqOf=(t,name)=>{for(const e of t.get(t.ps).Emitters||[]){const n=t.get(e.path);if(n.EmitterName===name){const lod=t.get(n.LODLevels[0].path);return t.get(lod.RequiredModule.path);}}throw Error('发射器 '+name+' 不在');};
 const seed=(t,{mi=0.98,align='PSA_FacingCameraPosition',flip='RandomFlipUOnly'}={})=>{
  const mp=Object.entries(t.it.assets).filter(([k])=>k.startsWith('mat:')).map(([,p])=>p+'.'+p.split('/').pop())[0];
  t.nodes.set(mp,{...t.get(mp),ScalarParameterValues:[{ParameterInfo:{Name:'EmissiveDissolve'},ParameterValue:mi}]});
  t.nodes.set(t.oldPaths[0],{...t.get(t.oldPaths[0]),EmitterName:'NewA'});t.nodes.set(t.oldPaths[0]+':Required',{ScreenAlignment:align,UVFlippingMode:flip});
  for(const e of t.it.spec.emitters)e.required={screen_alignment:'Rectangle',duration_s:1,loops:1,delay_s:0};};
 const u3=updateFixture({htmlFile:ENTRY});seed(u3);await u3.run();
 await check('旧包同名更新：材质实例里手调的 EmissiveDissolve 0.98 清覆盖后写回',()=>assert.equal(dis(u3),0.98));
 await check('旧包同名更新：同名发射器 UE 里的 FacingCameraPosition / RandomFlipUOnly 保留',()=>{const r=reqOf(u3,'NewA');assert.equal(r.ScreenAlignment,'PSA_FacingCameraPosition');assert.equal(r.UVFlippingMode,'RandomFlipUOnly');});
 await check('旧包同名更新：没有旧值的发射器照包（Rectangle、不写翻转）',()=>{const r=reqOf(u3,'NewB');assert.equal(r.ScreenAlignment,'PSA_Rectangle');assert(!r.UVFlippingMode);});
 const u4=updateFixture({htmlFile:ENTRY});seed(u4,{mi:1});u4.it.spec.resource_rules={format:'fwl.resource-rules/1'};u4.it.spec.materials.m.emissive_dissolve=0.98;u4.it.spec.emitters.forEach(e=>{e.required.uv_flip='None';});
 u4.it.spec.system={fixed_bounds:clone(BOX)};await u4.run();
 await check('新包同名更新：以包为准（0.98、翻转 None、包里的盒），不沿用 UE 旧值',()=>{assert.equal(dis(u4),0.98);const r=reqOf(u4,'NewA');assert.equal(r.UVFlippingMode,'None');assert.equal(r.ScreenAlignment,'PSA_Rectangle');assert.deepEqual(boxOf(u4.get(u4.ps).FixedRelativeBoundingBox),BOX);});
 const u5=updateFixture({htmlFile:ENTRY});await u5.run();
 await check('没有手调值的旧包更新：和 v2.27 一样（不多写 0.98 / 翻转）',()=>{assert.equal(dis(u5),undefined);for(const e of u5.get(u5.ps).Emitters){const n=u5.get(e.path);const r=u5.get(u5.get(n.LODLevels[0].path).RequiredModule.path);assert(!r.UVFlippingMode);}});
 // 用户 10-18：NeverStream 永远不勾；更新贴图保留原采样设置；只换贴图不动粒子 / 材质
 await check('包里要求 NeverStream → 校验拦下',()=>{const s=fresh();s.textures={main:{class:'flipbook',file:'a.png',cols:1,rows:1,never_stream:true}};assert(clone(B.validate(s)).some(e=>/NeverStream/.test(e)));});
 const texOf=t=>{const p=Object.entries(t.it.assets).find(([k])=>k.startsWith('tex:'))[1];return p+'.'+p.split('/').pop();};
 const u6=updateFixture({htmlFile:ENTRY});const tp=texOf(u6);u6.nodes.set(tp,{...u6.get(tp),MipGenSettings:'TMGS_NoMipmaps',AddressX:'TA_Clamp',AddressY:'TA_Clamp',NeverStream:true,LODGroup:'TEXTUREGROUP_Effects'});await u6.run();
 await check('更新已有贴图：手调的 Clamp 保留，只换像素；贴图组按新规范改成 DistantVFX（Project03）；手游主序列的 mip 按 v2.31 写回 FromTextureGroup',()=>{const n=u6.get(tp);assert.doesNotMatch(tp,/_HD\./);assert.equal(n.MipGenSettings,'TMGS_FromTextureGroup');assert.equal(n.AddressX,'TA_Clamp');assert.equal(n.AddressY,'TA_Clamp');assert.equal(n.LODGroup,'TEXTUREGROUP_Project03');});
 await check('更新已有贴图：原来勾了 NeverStream 也改成 false（永远不勾）',()=>assert.equal(u6.get(tp).NeverStream,false));
 const rs=fresh();rs.textures={r:{class:'ramp',file:'T_EFX_FireWorks_X_R.png'}};const u8=fixture(rs,ENTRY);await u8.run();
 const rp=Object.entries(u8.item.assets).find(([k])=>k==='tex:r')[1],rn=u8.nodes.get(rp+'.'+rp.split('/').pop())||{};
 await check('新导入 Ramp（查色表）：Clamp + NoMip + DistantVFX + NeverStream 关',()=>{assert.equal(rn.AddressX,'TA_Clamp');assert.equal(rn.AddressY,'TA_Clamp');assert.equal(rn.MipGenSettings,'TMGS_NoMipmaps');assert.equal(rn.LODGroup,'TEXTUREGROUP_Project03');assert.equal(rn.NeverStream,false);});
 // 用户 10-18 16:4x：主序列一律 NoMip（新建、更新同名都写）→ 10-28 改：只有 PC 主序列 NoMip；手游主序列常规（FromTextureGroup，可流送）
 const sq=fresh();sq.textures={f:{class:'flipbook',file:'T_EFX_FireWorks_X_4x4_01.png',cols:4,rows:4,asset:'T_EFX_FireWorks_X_4x4_01_HD'}};const u10=fixture(sq,ENTRY);await u10.run();
 const fp=Object.entries(u10.item.assets).find(([k])=>k==='tex:f')[1],fn=u10.nodes.get(fp+'.'+fp.split('/').pop())||{};
 await check('新导入 PC 主序列：NoMip + DistantVFX + NeverStream 关',()=>{assert.match(fp,/_HD$/,'这条测的是 PC（_HD）主序列');assert.equal(fn.MipGenSettings,'TMGS_NoMipmaps');assert.equal(fn.LODGroup,'TEXTUREGROUP_Project03');assert.equal(fn.NeverStream,false);});
 const u9=updateFixture({htmlFile:ENTRY});const tp9=texOf(u9);u9.nodes.set(tp9,{...u9.get(tp9),MipGenSettings:'TMGS_FromTextureGroup'});await u9.run();
 await check('更新同名手游主序列：UE 里原来有 mip 的保持 FromTextureGroup',()=>{assert.doesNotMatch(tp9,/_HD\./);assert.equal(u9.get(tp9).MipGenSettings,'TMGS_FromTextureGroup');});
 const u9b=updateFixture({htmlFile:ENTRY});const tp9b=texOf(u9b);u9b.nodes.set(tp9b,{...u9b.get(tp9b),MipGenSettings:'TMGS_NoMipmaps'});await u9b.run();
 await check('更新同名手游主序列：10-18 写成 NoMip 的改回 FromTextureGroup',()=>assert.equal(u9b.get(tp9b).MipGenSettings,'TMGS_FromTextureGroup'));
 const pq=fresh();pq.textures={f:{class:'flipbook',file:'T_EFX_FireWorks_X_4x4_01.png',cols:4,rows:4,asset:'T_EFX_FireWorks_PcX_4x4_01_HD'}};const u14=fixture(pq,ENTRY);const pp=Object.entries(u14.item.assets).find(([k])=>k==='tex:f')[1]+'';const ppo=pp+'.'+pp.split('/').pop();u14.nodes.set(ppo,{...(u14.nodes.get(ppo)||{}),MipGenSettings:'TMGS_FromTextureGroup'});await u14.run();
 await check('PC 主序列原来有 mip 的重新导入：仍写 NoMip',()=>{assert.match(pp,/_HD$/);assert.equal((u14.nodes.get(ppo)||{}).MipGenSettings,'TMGS_NoMipmaps');});
 // v2.31（用户 10-28，性能组：手游 NoMip 内存过高）：手游主序列新建、更新同名都写 FromTextureGroup；PC 仍 NoMip；Ramp 两边仍 NoMip
 const mq=fresh();mq.textures={f:{class:'flipbook',file:'T_EFX_FireWorks_X_4x4_01.png',cols:4,rows:4,asset:'T_EFX_FireWorks_MobX_4x4_01'}};const u11=fixture(mq,ENTRY);await u11.run();
 const mp=Object.entries(u11.item.assets).find(([k])=>k==='tex:f')[1],mn=u11.nodes.get(mp+'.'+mp.split('/').pop())||{};
 await check('新导入手游主序列：FromTextureGroup（带 mip）+ DistantVFX + NeverStream 关',()=>{assert.doesNotMatch(mp,/_HD$/);assert.equal(mn.MipGenSettings,'TMGS_FromTextureGroup');assert.equal(mn.LODGroup,'TEXTUREGROUP_Project03');assert.equal(mn.NeverStream,false);});
 const u12=fixture(mq,ENTRY);u12.nodes.set(mp+'.'+mp.split('/').pop(),{...(u12.nodes.get(mp+'.'+mp.split('/').pop())||{}),MipGenSettings:'TMGS_NoMipmaps'});await u12.run();
 await check('手游主序列已是 NoMip 时重新导入：改回 FromTextureGroup',()=>assert.equal((u12.nodes.get(mp+'.'+mp.split('/').pop())||{}).MipGenSettings,'TMGS_FromTextureGroup'));
 const mr=fresh();mr.textures={r:{class:'ramp',file:'T_EFX_FireWorks_MobX_R.png',asset:'T_EFX_FireWorks_MobX_R'}};const u13=fixture(mr,ENTRY);await u13.run();
 const mrp=Object.entries(u13.item.assets).find(([k])=>k==='tex:r')[1],mrn=u13.nodes.get(mrp+'.'+mrp.split('/').pop())||{};
 await check('手游 Ramp 仍是 Clamp + NoMip',()=>{assert.doesNotMatch(mrp,/_HD$/);assert.equal(mrn.MipGenSettings,'TMGS_NoMipmaps');assert.equal(mrn.AddressX,'TA_Clamp');});
 const u7=updateFixture({htmlFile:ENTRY});const before=clone(u7.get(u7.ps)),miPath=Object.entries(u7.it.assets).filter(([k])=>k.startsWith('mat:')).map(([,p])=>p+'.'+p.split('/').pop())[0],miBefore=clone(u7.get(miPath));
 u7.it.selectedAssetKeys=Object.keys(u7.it.assets).filter(k=>k.startsWith('tex:'));await u7.run();
 await check('只换贴图（只选贴图）：粒子系统发射器、材质实例参数都不动',()=>{assert.deepEqual(u7.get(u7.ps).Emitters.map(e=>e.path),before.Emitters.map(e=>e.path));assert.deepEqual(u7.get(miPath),miBefore);});
 await check('只换贴图：贴图本身照样换（导入了）',()=>assert(u7.calls.some(c=>c.body?.args?.PythonCommand?.includes('import_asset_tasks'))));
 const html=fs.readFileSync(ENTRY,'utf8');
 await check('交付入口界面有「替换范围」：只换贴图会切更新同名、排除粒子 / 材质、核帧计划指纹',()=>{assert(/id="fwimp-scope"/.test(html));assert(/只换贴图：帧计划指纹变了/.test(html));assert(/if\(texturesOnly\(r\)\)for\(const key of Object\.keys\(r\.assets\)\)if\(!key\.startsWith\('tex:'\)\)excluded\.add\(key\)/.test(html));assert(/r\.planSig=plan\.item\.spec\?\.source\?\.plan_sig/.test(html));});
 // 烘焙器 4.9.115 交付清单「导入范围」→ 回执 metadata.importScope → 新行预设
 await check('回执写了只换 PC 贴图：PC 行预设只换贴图 + 更新同名，手机行不勾；没写就不动',()=>{
  assert(/deliveryApplyScope\(r,receipt\);return r;/.test(html),'交付入口建行时没调用 deliveryApplyScope');
  const src=html.match(/function deliveryApplyScope\(r,receipt\)\{[\s\S]*?\n  \}/)[0],apply=new Function(src+';return deliveryApplyScope;')();
  const rc={metadata:{importScope:{kind:'textures',platforms:['pc']}}},pc={platform:'pc',selected:true,mode:'create',scope:'all'},mb={platform:'mobile',selected:true,mode:'create'};apply(pc,rc);apply(mb,rc);
  assert.equal(pc.scope,'textures');assert.equal(pc.mode,'update');assert.equal(pc.selected,true);assert.equal(mb.selected,false);assert.match(mb.scopeNote,/只换 PC/);
  const both={platform:'mobile',selected:true};apply(both,{metadata:{importScope:{kind:'textures',platforms:['pc','mobile']}}});assert.equal(both.selected,true);assert.equal(both.scope,'textures');
  const none={platform:'pc',selected:true,scope:'textures'};apply(none,{metadata:{}});assert.equal(none.scope,'textures','回执没写范围时沿用上一修订的设置');});
 // 用户 10-18 NeverStream 全关：UE 里同内容的旧贴图勾着 NeverStream 就不复用（改为重导、写 false）
 const proofWith=async never=>{const {loadBackend}=require('./import-backend.cjs');const pkg='/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD/T_EFX_FireWorks_X_R';
  const api=async(route,body)=>{if(route==='/object/get')return{data:{properties:{MaxTextureSize:1024,ForcePlatformSettings:['Android','OpenHarmony','IOS'].map(key=>({key,value:{PixelFormat:'PF_ASTC_6x6'}})),...(never===undefined?{}:{NeverStream:never})}}};
   if(body?.function==='ExecutePythonCommandEx'&&body.args.PythonCommand.includes('# FWL_TEXTURE_FINGERPRINT'))return{data:{return_value:'True',out_LogOutput:'Output='+JSON.stringify('FWLFINGERPRINT:'+JSON.stringify({pkg,exists:true,class:'Texture2D',dirty:false,diskHash:'a'.repeat(64)}))}};
   throw Error('unexpected '+route);};
  const b=loadBackend(api,()=>{},{htmlFile:ENTRY});return b.readTextureProof(pkg);};
 await check('复用核查：UE 里同内容的旧贴图勾着 NeverStream → 不复用（重导写 false）；没勾 / 读不到这个字段照旧可复用',async()=>{assert.equal(await proofWith(true),null);assert.ok(await proofWith(false));assert.ok(await proofWith(undefined));});
 console.log(`\n${passes} resource-rule checks passed, ${fails.length} failed${fails.length?'：'+fails.join('；'):''}; all UE traffic simulated, no native writes.`);
 process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
