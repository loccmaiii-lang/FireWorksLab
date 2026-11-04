  async function saveCreatedAssets(it, entries, stage){
    const progress = it.importProgress || (it.importProgress = {stage, saved:[], added:[], edited:[]});
    progress.edited ||= [];
    progress.stage = stage;
    const tagV = `fwl.cascade/1 ${it.spec.name} -> ${it.as}`;
    for (const [key, pkg] of entries) {
      guard(pkg);
      await call(ASSET_LIB, 'SetMetadataTag', {Object:objPath(pkg), Tag:MAP.tag, Value:tagV});
      if (!await save(pkg)) throw Error(stage + '保存失败：' + key);
    }
    const code = `entries = ${JSON.stringify(entries)}
records = []
sc = getattr(unreal, 'SourceControl', None)
enabled = bool(sc and sc.is_enabled())
# SourceControl.last_error_msg() is FText, not a JSON string. Preserve Unicode
# under the engine's Python 2.7 without hiding unrelated serialization failures.
try:
 text_type = unicode
except NameError:
 text_type = str
def sc_error_text():
 return text_type(sc.last_error_msg()) or 'Source control operation failed'
for key, pkg in entries:
 assert pkg.startswith('/Game/')
 filename = os.path.abspath(os.path.join(unreal.Paths.project_content_dir(), pkg[6:] + '.uasset'))
 info = {'key':key, 'pkg':pkg, 'saved':os.path.isfile(filename) and os.path.getsize(filename) > 0, 'sc':'missing', 'reason':''}
 if info['saved']:
  if not enabled:
   info['sc'] = 'disabled'
  elif not sc.is_available():
   info['sc'] = 'offline'
   info['reason'] = sc_error_text()
  else:
   try:
    state = sc.query_file_state(pkg)
    ok = bool(state.is_valid and (state.is_added or state.is_checked_out)) or sc.check_out_or_add_file(pkg,True)
    state = sc.query_file_state(pkg)
    info['sc'] = ('added' if state.is_added else 'edited' if state.is_checked_out else 'failed') if ok and state.is_valid else 'failed'
    if info['sc'] == 'failed': info['reason'] = sc_error_text()
   except Exception as error:
    info['sc'] = 'failed'
    info['reason'] = text_type(error)
 records.append(info)
print('FWLSAVE:' + json.dumps(records))
`;
    const records = JSON.parse(tagged(await py(code), 'FWLSAVE:'));
    if (records.length !== entries.length || entries.some(([key,pkg], i) => records[i]?.key !== key || records[i]?.pkg !== pkg)) throw Error(stage + '保存核对结果不完整');
    for (const record of records) {
      if (record.saved && !progress.saved.includes(record.pkg)) progress.saved.push(record.pkg);
      if (record.sc === 'added' && !progress.added.includes(record.pkg)) progress.added.push(record.pkg);
      if (record.sc === 'edited' && !progress.edited.includes(record.pkg)) progress.edited.push(record.pkg);
    }
    const missing = records.filter(r => !r.saved);
    if (missing.length) throw Error(stage + '磁盘文件未保存：' + missing.map(r=>r.key).join(','));
    const failed = records.filter(r => !['added','edited','disabled'].includes(r.sc));
    if (failed.length) throw Error(stage + '已保存，但版本管理添加或迁出未完成：' + failed.map(r=>r.key + (r.reason ? '（'+r.reason+'）' : '')).join(','));
    log(stage + '：已保存 ' + records.length + ' 项' + (records.some(r=>r.sc==='disabled') ? '（版本管理未启用）' : '，版本管理已核对（添加 '+records.filter(r=>r.sc==='added').length+' / 编辑 '+records.filter(r=>r.sc==='edited').length+'）'), records.some(r=>r.sc==='disabled') ? 'warn' : 'ok');
    return records;
  }

  async function importEmitters(it, PS, matObj, startIndex = 0, attach = true){
    const spec = it.spec, A = it.assets, s0 = t0();
    const emitterPaths=[];
    const gpuLimits=new Map(gpuDrawLimits(it).map(v=>[v.index,v]));
    const dyn = MAP.dynamic_params;
    for (const es of spec.emitters.slice(startIndex)) {
      const bakeDef = !!es.gpu;
      const em = await spawn('ParticleSpriteEmitter', PS), lodTmp = await spawn('ParticleLODLevel', PS);
      const req = await spawn('ParticleModuleRequired', PS), spn = await spawn('ParticleModuleSpawn', PS);
      const mods = []; for (const md of es.modules) mods.push([md, await spawn(MOD[md.m], PS)]);
      await keep([em, lodTmp, req, spn, ...mods.map(x => x[1])]);
      const lod = tagged(await py(`em = unreal.find_object(None, '${em}')\nlod = unreal.find_object(None, '${lodTmp}')\nlod.rename('ParticleLODLevel_0', em)\nprint('FWLP:' + lod.get_path_name())\n`), 'FWLP:');
      guard(lod);
      // Required
      const rq = es.required || {}, rd = { Material: matObj[es.material], LODValidity: 1 };
      if (rq.screen_alignment) rd.ScreenAlignment = ALIGN[rq.screen_alignment];
      [['duration_s', 'EmitterDuration'], ['loops', 'EmitterLoops'], ['delay_s', 'EmitterDelay']].forEach(([a, b]) => { if (a in rq) rd[b] = rq[a]; });
      if (rq.cutout&&cutoutEnabled(it,'tex:'+rq.cutout)) Object.assign(rd, { CutoutTexture: objPath(A['tex:' + rq.cutout]), SubImages_Horizontal: 1, SubImages_Vertical: 1, BoundingMode: 'BVC_EightVertices', OpacitySourceMode: 'OSM_Alpha', AlphaThreshold: 0.1 });
      if (rq.sub_images) Object.assign(rd, { SubImages_Horizontal: rq.sub_images[0], SubImages_Vertical: rq.sub_images[1] });
      if ('max_draw_count' in rq) Object.assign(rd, { bUseMaxDrawCount: true, MaxDrawCount: rq.max_draw_count });
      const gpuLimit=gpuLimits.get(spec.emitters.indexOf(es));
      if(gpuLimit)Object.assign(rd,{bUseMaxDrawCount:true,MaxDrawCount:gpuLimit.limit});
      if ('local_space' in rq) rd.bUseInLocalSpace = !!rq.local_space;
      Object.assign(rd, resourceRequiredFields(spec, es, rd, it.resourcePrevious && it.resourcePrevious.get(es.name)));     // v2.28 UV 翻转 / 旧包更新保留 FCP
      await setp(req, rd);
      if (rd.UVFlippingMode || rd.ScreenAlignment === 'PSA_FacingCameraPosition') { const actual = await props(req); if ((rd.UVFlippingMode && actual.UVFlippingMode !== rd.UVFlippingMode) || (rd.ScreenAlignment && actual.ScreenAlignment !== rd.ScreenAlignment)) throw Error('发射器 ' + es.name + ' 朝向 / UV 翻转读回不一致'); }
      if(gpuLimit){const actual=await props(req);if(actual.bUseMaxDrawCount!==true||actual.MaxDrawCount!==gpuLimit.limit)throw Error('GPU '+es.name+' Max Draw Count 读回不一致');log('  GPU '+es.name+' Max Draw Count：'+gpuLimit.limit+'（'+(gpuLimit.source==='measured'?'实机峰值':'计算保守上限')+'）');}
      // Spawn
      const sps = es.spawn || {};
      await setp(spn, { LODValidity: 1, BurstList: '(' + (sps.bursts || []).map(([t, c]) => `(Count=${c | 0},CountLow=-1,Time=${f6(t)})`).join(',') + ')' });
      if (sps.rate) await applyDist(PS, spn, 'Rate', sps.rate, bakeDef);
      // 模块
      for (const [md, mp] of mods) {
        await setp(mp, { LODValidity: 1 });
        // 事件数组是原生结构体数组，不能按普通向量写入。
        if (md.m === 'EventGenerator') {
          await setp(mp, {Events:cascadeEventText(md.Events)});
          continue;
        }
        if (md.m === 'DynamicParameter') {
          const prm = md.params || {}, items = [];
          for (let i = 0; i < dyn.names.length; i++) {
            const role = Object.keys(dyn.roles).find(r => dyn.roles[r] === i);
            const e = dynamicInput(es,prm,role,i);
            const dp = await spawn(distClass(e), PS);
            await setp(dp, distValues(e));
            if (!(e.bake !== undefined ? e.bake : bakeDef)) await setp(dp, { bCanBeBaked: false });
            items.push(`(ParamName="${dyn.names[i]}",bUseEmitterTime=False,bSpawnTimeOnly=False,ValueMethod=EDPV_UserSet,bScaleVelocityByParamValue=False,ParamValue=(Distribution=${distClass(e)}'${dp}'))`);
          }
          await setp(mp, { DynamicParams: '(' + items.join(',') + ')' });
          continue;
        }
        for (const [prop, val] of Object.entries(md)) {
          // preRoll identifies the exported growth curve; it is not a native module property.
          if (prop === 'm' || prop === 'note' || prop === '_note' || (md.m === 'SizeByLife' && prop === 'preRoll')) continue;
          if (kind(val)) await applyDist(PS, mp, prop, val, bakeDef);
          else await setp(mp, { [prop]: Array.isArray(val) ? vtxt(val) : val });
        }
      }
      if (rq.pivot_offset) {
        const pivot = await spawn('ParticleModulePivotOffset', PS);
        await keep([pivot]);
        // The package stores the shader offset; native CompileModule subtracts 0.5 from the module value.
        await setp(pivot, { LODValidity: 1, PivotOffset: '(X=' + f6(rq.pivot_offset[0] + 0.5) + ',Y=' + f6(rq.pivot_offset[1] + 0.5) + ')' });
        mods.push([{m:'PivotOffset'}, pivot]);
      }
      if (es.gpu) { const td = await spawn('ParticleModuleTypeDataGpu', PS); await keep([td]); await setp(td, { LODValidity: 1 }); await setp(lod, { TypeDataModule: td }); }
      // 连起来：模块 → LOD → 发射器 → 系统
      await setp(lod, { Level: 0, bEnabled: true, RequiredModule: req, SpawnModule: spn });
      // Overall color/alpha multipliers remain the final editable module,
      // including when Pivot was synthesized outside the source modules array.
      const orderedMods=[...mods.filter(([md])=>md.m!=='ColorScaleOverLife'),...mods.filter(([md])=>md.m==='ColorScaleOverLife')];
      for (const [, mp] of orderedMods) await cont(lod, 'Modules', 'array_append', mp);
      // Cascade 的 LOD 同时保存事件生成器专用引用；不只挂 Modules。
      const generator=mods.find(([md])=>md.m==='EventGenerator');
      if(generator)await setp(lod,{EventGenerator:generator[1]});
      await setp(em, { EmitterName: es.name, ConvertedModules: true });
      await cont(em, 'LODLevels', 'array_append', lod);
      if(attach)await cont(PS, 'Emitters', 'array_append', em);
      emitterPaths.push(em);
      await setp(lod, { bEnabled: true }); await setp(em, { EmitterName: es.name });
      if(attach)await syncEmitterEditorCache(PS);
      log(`  发射器 ${es.name}${es.gpu ? '（GPU）' : ''}：${mods.length} 个模块 ✓（${secs(s0)}）`, 'ok');
    }
    return emitterPaths;
  }

  async function importOne(it){
    const s0 = t0(), spec = it.spec, A = it.assets, updating=it.mode==='update';
    const validationErrors=[...validate(spec,it.configFile||'cascade.json'),...particlePolicyErrors(it),...await validateAssetSelection(it)];
    if(validationErrors.length)throw Error('素材配置检查失败：'+validationErrors.join('；'));
    let previousPS=null,swapAttempted=false;
    log(`==== ${it.as}（${spec.name}）开始`);
    it.importProgress = {stage:'贴图', imported:[], saved:[], added:[], edited:[]};
    try {
    it.importProgress.stage='目录与平台检查';
    await assertImportDirectories(it);
    await verifyTextureReuse(it);
    if(updating){
      const freshTargets=await readUpdateTargets(it);
      if(it.targets&&JSON.stringify(stableValue(selectedUpdateTargets(it,freshTargets)))!==JSON.stringify(stableValue(selectedUpdateTargets(it))))throw Error('更新目标在预览后发生变化，请重新检查并确认');
      it.targets=freshTargets;await prepareAssetUpdate(it);
    }
    it.importProgress.stage = '贴图';
    // 1) 贴图
    const tex = writeAssetEntries(it).filter(([k])=>k.startsWith('tex:')).map(([key])=>[key.slice(4),spec.textures[key.slice(4)]]);
    if (tex.length) {
      // 更新已有贴图：先记下 UE 里现在的采样 / 压缩设置（NoMip、Clamp 等手调值），导入后写回，只换像素（用户 10-18「原有我修改过的参数，需要保留」）
      const keepTex = {};
      if (updating) for (const [k] of tex) { const tg = (it.targets || []).find(x => x.key === 'tex:' + k); if (tg && tg.exists) keepTex[k] = await props(objPath(A['tex:' + k])); }
      let code = 'tasks = []\n';
      for (const [k, t] of tex) {
        const pkg = A['tex:' + k], dd = pkg.slice(0, pkg.lastIndexOf('/')), nm = pkg.split('/').pop();
        code += `t = unreal.AssetImportTask()\nt.set_editor_property('filename', ${pyStr(it.dir + '/' + t.file)})\nt.set_editor_property('destination_path', '${dd}')\n` +
          `t.set_editor_property('destination_name', '${nm}')\nt.set_editor_property('automated', True)\nt.set_editor_property('replace_existing', ${updating?'True':'False'})\nt.set_editor_property('save', False)\ntasks.append(t)\n`;
      }
      code += "unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks(tasks)\nprint('FWLJSON:' + json.dumps([list(t.get_editor_property('imported_object_paths')) for t in tasks]))\n";
      const got = JSON.parse(tagged(await py(code), 'FWLJSON:'));
      if (got.length!==tex.length||got.some((x,i) => x.length!==1||x[0]!==objPath(A['tex:'+tex[i][0]]))) throw new Error('贴图导入路径不符：' + JSON.stringify(got));
      it.importProgress.imported.push(...tex.map(([k])=>A['tex:'+k]));
      for (const [k, t] of tex) {
        const dst = objPath(A['tex:' + k]), exP = await props(MAP.texture_examples[t.class]), cur = await props(dst);
        const want = {}; TEX_KEYS.forEach(kk => { if (kk in exP) want[kk] = exP[kk]; });
        if (keepTex[k]) TEX_KEYS.forEach(kk => { if (kk in keepTex[k]) want[kk] = keepTex[k][kk]; });
        want.NeverStream = false;     // 用户 10-18 永远的禁忌：导入导出都不勾 NeverStream（贴图常驻、不能流送，浪费内存）
        want.LODGroup = 'TEXTUREGROUP_Project03';     // 用户 10-18 新规范：烟花贴图一律 DistantVFX 组（项目 DefaultEngine.ini 的 Project03）
        if (t.class === 'ramp') Object.assign(want, { AddressX: 'TA_Clamp', AddressY: 'TA_Clamp', MipGenSettings: 'TMGS_NoMipmaps' });     // 查色表：两端不串色、不做 mip
        // 主序列：PC 一律 NoMip（用户 10-18 16:4x：可流送的图爆开时只有 128²、约 0.4 s 才清楚，长条格还会方头）；
        // 手游一律常规 FromTextureGroup（v2.31，用户 10-28：性能组反馈手游 NoMip 内存过高，改回可流送）。新建、更新同名都写
        if (t.class === 'flipbook') want.MipGenSettings = texturePolicy(dst).platform === '手游' ? 'TMGS_FromTextureGroup' : 'TMGS_NoMipmaps';
        want.MaxTextureSize=texturePolicy(dst).maxSize;
        if(t.class==='dissolve')want.SRGB=false;
        const diff = {}; Object.entries(want).forEach(([kk, v]) => { if (JSON.stringify(cur[kk]) !== JSON.stringify(v)) diff[kk] = v; });
        if (Object.keys(diff).length) await setp(dst, diff);
        // Explicit project policy takes precedence over inherited reference limits.
        await applyTexturePolicy(dst);
        const now = await props(dst), bad = Object.keys(want).filter(kk => JSON.stringify(now[kk]) !== JSON.stringify(want[kk]));
        if (bad.length) throw new Error(`贴图 ${k} 设置没对上：${bad.join(',')}`);
      }
      await saveCreatedAssets(it, tex.map(([k]) => ['tex:' + k, A['tex:' + k]]), '贴图');
      await registerTextureFingerprints(it,tex.map(([k])=>['tex:'+k,A['tex:'+k]]));
      log(`  贴图 ${tex.length} 张，示例基础设置 + 平台格式与尺寸策略已核对 ✓（${secs(s0)}）`, 'ok');
    }
    it.importProgress.stage = '材质实例';
    // 2) 材质
    const matObj = {};
    for (const [k, m] of Object.entries(spec.materials || {})) {
      const role = MAP.material_roles[m.role];
      if (role.use) { matObj[k] = role.use; continue; }
      const pkg = A['mat:' + k], mo = objPath(pkg);
      if(!assetSelected(it,'mat:'+k)){matObj[k]=mo;continue;}
      const exists=updating&&it.targets.some(t=>t.key==='mat:'+k&&t.exists);
      if(!exists)await call(ASSET_LIB, 'DuplicateAsset', { SourceAssetPath: role.template, DestinationAssetPath: pkg }, 120000);
      let code = `mi = unreal.load_object(None, '${mo}')\nassert mi is not None\nL = unreal.MaterialEditingLibrary\n`;
      const dissolve = resourceDissolveValue(spec, m, exists && !resourceNewPackage(spec) && typeof m.emissive_dissolve !== 'number' ? await props(mo) : null);     // v2.28：先读旧值，下面会清覆盖
      if(exists){
        const template=await props(role.template.includes('.')?role.template:objPath(role.template));
        if(!template.Parent?.path)throw Error('材质实例示例缺少有效母材质：'+k);
        code+=`L.set_material_instance_parent(mi,unreal.load_object(None,${pyStr(template.Parent.path)}))\nL.clear_all_material_instance_parameters(mi)\n`;
        for(const value of template.TextureParameterValues||[])if(value.ParameterValue?.path)code+=`L.set_material_instance_texture_parameter_value(mi,${pyStr(value.ParameterInfo.Name)},unreal.load_object(None,${pyStr(value.ParameterValue.path)}))\n`;
        for(const value of template.ScalarParameterValues||[])code+=`L.set_material_instance_scalar_parameter_value(mi,${pyStr(value.ParameterInfo.Name)},${Number(value.ParameterValue)})\n`;
        for(const value of template.VectorParameterValues||[]){const v=value.ParameterValue;code+=`L.set_material_instance_vector_parameter_value(mi,${pyStr(value.ParameterInfo.Name)},unreal.LinearColor(${Number(v.R)},${Number(v.G)},${Number(v.B)},${Number(v.A)}))\n`;}
      }
      for (const [tk, tv] of Object.entries(m.textures || {})) code += `L.set_material_instance_texture_parameter_value(mi, '${role.textures[tk]}', unreal.load_object(None, '${objPath(A['tex:' + tv])}'))\n`;
      for (const [sk, sv] of Object.entries(m.scalars || {})) code += `L.set_material_instance_scalar_parameter_value(mi, '${role.scalars[sk]}', ${Number(sv)})\n`;
      if (dissolve !== null) code += `L.set_material_instance_scalar_parameter_value(mi, '${RESOURCE_DISSOLVE_PARAM}', ${Number(dissolve)})\n`;
      if(dissolveForMaterial(spec,k))await applyDissolveMaterialPolicy(mo,code,A['tex:'+m.textures.dissolve]);else await applyMaterialPolicy(mo,code);
      const p = await props(mo);
      const texs = {}; (p.TextureParameterValues || []).forEach(t => { texs[t.ParameterInfo.Name] = ((t.ParameterValue || {}).path || '').split('.').pop(); });
      const sc = {}; (p.ScalarParameterValues || []).forEach(s => { sc[s.ParameterInfo.Name] = s.ParameterValue; });
      const ok = Object.entries(m.textures || {}).every(([tk, tv]) => texs[role.textures[tk]] === A['tex:' + tv].split('/').pop())
        && Object.entries(m.scalars || {}).every(([sk, sv]) => Math.abs(Number(sc[role.scalars[sk]]) - sv) < 1e-4)
        && (dissolve === null || Math.abs(Number(sc[RESOURCE_DISSOLVE_PARAM]) - dissolve) < 1e-4);
      if (!ok) throw new Error('材质实例参数读回不对：' + pkg.split('/').pop());
      await saveCreatedAssets(it, [['mat:' + k, pkg]], '材质实例');
      matObj[k] = mo;
      log(`  材质实例 ${pkg.split('/').pop()} ✓（${secs(s0)}）`, 'ok');
    }
    it.importProgress.stage = '粒子系统';
    // 3) 粒子系统
    if(assetSelected(it,'ps')){
    const psPkg = A.ps, PS = objPath(psPkg);
    const existingParticle=updating&&it.targets.some(t=>t.key==='ps'&&t.exists);
    if(!existingParticle)await py(`at = unreal.AssetToolsHelpers.get_asset_tools()\nps = at.create_asset('${psPkg.split('/').pop()}', '${psPkg.slice(0, psPkg.lastIndexOf('/'))}', unreal.ParticleSystem, unreal.ParticleSystemFactoryNew())\nassert ps is not None\n`);
    const ref = await props(MAP.system_reference), cur = await props(PS), sysd = {};
    if(existingParticle){previousPS=cur;await keep((cur.Emitters||[]).map(e=>e.path));}
    MAP.system_keys.forEach(k => { if (k in ref && JSON.stringify(cur[k]) !== JSON.stringify(ref[k])) sysd[k] = ref[k]; });
    const sy = spec.system || {};
    if (sy.preview_distance_cm) sysd.ThumbnailDistance = Number(sy.preview_distance_cm);
    if (sy.preview_warmup_s) sysd.ThumbnailWarmup = Number(sy.preview_warmup_s);
    const targetBounds = resourceTargetBounds(spec, existingParticle ? cur : null);     // v2.28 包里的固定盒；旧包更新保留手调盒
    Object.assign(sysd,particleSystemPolicy(targetBounds,spec));     // v2.30 LODMethod 按包里是否有无限循环
    if (!existingParticle&&Object.keys(sysd).length) await setp(PS, sysd);
    if (!(cur.LODDistances || []).length) await cont(PS, 'LODDistances', 'array_append', 0.0);
    if (!(cur.LODSettings || []).length) await cont(PS, 'LODSettings', 'array_append', '()', true);
    const chk = await props(PS);
    if (!(chk.LODDistances || []).length || !(chk.LODSettings || []).length) throw new Error('LOD 数组补不上，停止（空着打开 Cascade 会崩）');
    it.resourcePrevious = existingParticle && !resourceNewPackage(spec) ? await resourcePreviousRequired(cur) : null;     // v2.28 旧包更新：先记下 UE 里的朝向 / 翻转
    const built=await importEmitters(it, PS, matObj,0,false);
    if(existingParticle){
      swapAttempted=true;
      if(Object.keys(sysd).length)await setp(PS,sysd);
    }
    await swapEmitters(PS,built);
    await verifyParticleSystemPolicy(PS, targetBounds, spec);
    if(updating)it.importProgress.emittersRebuilt=built.length;
    const linked = (await props(PS)).Emitters || [];
    if (linked.length !== spec.emitters.length) throw Error('粒子发射器数量读回不一致，停止保存');
    await saveCreatedAssets(it, [['ps', psPkg]], '粒子系统');
    if(updating){const stored=loadLS();if((stored.pending||[]).includes(PS)){stored.pending=stored.pending.filter(path=>path!==PS);saveLS(stored);}}
    }
    await py('sys.fwl_keep = []\n');
    log(`==== ${it.as} ${updating?'同名更新':'导入'}完成（${secs(s0)}）：已保存 ${it.importProgress.saved.length} 项，添加 ${it.importProgress.added.length} 项，编辑 ${it.importProgress.edited.length} 项${updating?(assetSelected(it,'ps')?'；全部重建 '+spec.emitters.length+' 个发射器':'；粒子系统未勾选，保持原状')+'；备份 '+(it.backup.manifest||it.backup.directory):''}`, 'ok');
    } catch (error) {
      if(updating&&previousPS&&swapAttempted){
        try{
          const previousPaths=(previousPS.Emitters||[]).map(e=>e.path);
          if(previousPaths.length){
            await swapEmitters(objPath(A.ps),previousPaths);
            const rollback={};[...new Set([...MAP.system_keys,...Object.keys(particleSystemPolicy()),'ThumbnailDistance'])].forEach(k=>{
              if(!(k in previousPS)||['Emitters','LODSettings'].includes(k))return;
              const v=previousPS[k];
              rollback[k]=k==='LODDistances'?'('+v.join(',')+')':k==='FixedRelativeBoundingBox'&&typeof v==='object'?'(Min='+vtxt([v.Min.X,v.Min.Y,v.Min.Z])+',Max='+vtxt([v.Max.X,v.Max.Y,v.Max.Z])+',IsValid='+(v.IsValid?1:0)+')':v;
            });
            if(Object.keys(rollback).length)await setp(objPath(A.ps),rollback);
            if(!await save(A.ps))throw Error('恢复旧发射器后保存失败');
            it.importProgress.particleRestored=true;
          }
        }catch(restoreError){error.message+='；旧发射器恢复未确认：'+restoreError.message;}
      }
      error.importProgress = it.importProgress;
      error.message += '；当前阶段：' + it.importProgress.stage + '；本次已载入贴图 ' + (it.importProgress.imported||[]).length + ' 项，已保存 ' + it.importProgress.saved.length + ' 项，已标记添加 ' + it.importProgress.added.length + ' 项、迁出 ' + it.importProgress.edited.length + ' 项。'+(it.importProgress.particleRestored?'旧发射器已恢复；依赖资产可能已更新，请核对备份。':previousPS&&!swapAttempted?'旧发射器列表尚未替换；依赖资产可能已更新。':'未完成的粒子系统不能作为成品使用。')+(it.backup?'备份：'+(it.backup.manifest||it.backup.directory):'');
      throw error;
    }
  }
