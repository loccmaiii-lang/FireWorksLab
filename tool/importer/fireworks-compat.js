  // Main-pack compatibility. Nothing in extras is an import request.
  MAP.naming.dissolve='T_EFX_FireWorks_{base}_D_1x1_{idx}';
  MAP.texture_examples.dissolve=MAP.texture_examples.flipbook;
  for(const name of ['flipbook_rgba','beam_flipbook'])if(MAP.material_roles[name]?.template)MAP.material_roles[name].textures.dissolve='Dissolve';
  function dissolveEnabled(em){return em.dissolve?.enable===true;}
  function dissolveForMaterial(spec,key){return (spec.emitters||[]).some(e=>e.material===key&&dissolveEnabled(e));}
  function dissolveValidationErrors(spec){
    const errors=[],tex=spec.textures||{},mats=spec.materials||{};
    if(spec.platform==='mobile'&&(spec.emitters||[]).some(e=>e.gpu))errors.push('手游配置不支持 GPU 发射器');
    if(spec.platform&&!['pc','mobile'].includes(spec.platform))errors.push('仅支持 PC / 手机主包，不支持第三套低端配置');
    for(const [key,m]of Object.entries(mats)){
      const used=(spec.emitters||[]).filter(e=>e.material===key),active=used.filter(dissolveEnabled);
      if(active.length&&active.length!==used.length)errors.push('材质 '+key+' 被开启和关闭溶解的发射器共用，请拆分材质标识后重导');
      if(m.textures?.dissolve&&!active.length)errors.push('材质 '+key+' 指定溶解图但没有显式开启的发射器');
      if(active.length&&!MAP.material_roles[m.role]?.template)errors.push('材质 '+key+' 不能修改借用材质的溶解设置');
    }
    for(const em of spec.emitters||[]){
      if(em.dissolve&&typeof em.dissolve.enable!=='boolean')errors.push('发射器 '+em.name+' 的 dissolve.enable 必须为布尔值');
      if(!dissolveEnabled(em))continue;
      const d=em.dissolve,m=mats[em.material],main=tex[m?.textures?.main],dynamic=(em.modules||[]).filter(m=>m.m==='DynamicParameter');
      if(!['flipbook_rgba','beam_flipbook'].includes(m?.role)||main?.cols!==1||main?.rows!==1||m?.scalars?.cols!==1||m?.scalars?.rows!==1)errors.push('发射器 '+em.name+' 溶解仅支持已核对的 1×1 单帧材质');
      if(d.channel!=='R'||d.param!=='dissolve'||MAP.dynamic_params.roles.dissolve!==2)errors.push('发射器 '+em.name+' 溶解需 R 通道及动态参数 dissolve（index 2）');
      if(tex[d.texture]?.class!=='dissolve'||m?.textures?.dissolve!==d.texture)errors.push('发射器 '+em.name+' 的溶解图与材质绑定不一致');
      if(dynamic.length!==1||JSON.stringify(dynamic[0]?.params?.dissolve?.curve)!=='[[0,0],[1,1]]'||dynamic[0]?.params?.frame?.const!==0)errors.push('发射器 '+em.name+' 需唯一 DynamicParameter、frame const 0、dissolve 曲线 [[0,0],[1,1]]');
    }
    return errors;
  }
  function dynamicInput(em,params,role,index){
    if(role==='dissolve'&&!dissolveEnabled(em))return {const:0};
    return (role&&params[role])||{const:MAP.dynamic_params.defaults[index]};
  }
  async function applyDissolveMaterialPolicy(mo,bindingCode,texturePkg){
    guard(mo);guard(texturePkg);
    await py(`# FWL_POLICY_DISSOLVE
material_path = ${pyStr(mo)}
${bindingCode}
overrides = mi.get_editor_property('base_property_overrides')
overrides.set_editor_property('override_two_sided',True)
overrides.set_editor_property('two_sided',False)
mi.set_editor_property('base_property_overrides',overrides)
L.set_material_instance_texture_parameter_value(mi, 'Dissolve', unreal.load_object(None, ${pyStr(objPath(texturePkg))}))
L.set_material_instance_vector_parameter_value(mi, 'TexDissolveChannel', unreal.LinearColor(1,0,0,0))
L.set_material_instance_vector_parameter_value(mi, 'DissolveUVParam', unreal.LinearColor(1,1,0,0))
L.set_material_instance_scalar_parameter_value(mi, 'TexDissolveSpeed', 1)
L.set_material_instance_scalar_parameter_value(mi, 'TexDissolveOffset', 0)
L.set_material_instance_scalar_parameter_value(mi, 'TexDissolvePower', 1)
L.set_material_instance_scalar_parameter_value(mi, 'DissolveProgress', 0)
L.set_material_instance_scalar_parameter_value(mi, 'UseParticleAlphaDissolve', 0)
L.update_material_instance(mi)
`);
    const p=await props(mo),sc=new Map((p.ScalarParameterValues||[]).map(v=>[v.ParameterInfo.Name,v.ParameterValue])),vectors=new Map((p.VectorParameterValues||[]).map(v=>[v.ParameterInfo.Name,v.ParameterValue]));
    const texture=(p.TextureParameterValues||[]).find(v=>v.ParameterInfo.Name==='Dissolve')?.ParameterValue?.path;
    const channel=vectors.get('TexDissolveChannel'),uv=vectors.get('DissolveUVParam');
    if(p.BasePropertyOverrides?.bOverride_TwoSided!==true||p.BasePropertyOverrides?.TwoSided!==false||texture!==objPath(texturePkg)||sc.get('TexDissolveSpeed')!==1||sc.get('TexDissolveOffset')!==0||sc.get('TexDissolvePower')!==1||sc.get('DissolveProgress')!==0||sc.get('UseParticleAlphaDissolve')!==0||!channel||[channel.R,channel.G,channel.B,channel.A].join(',')!=='1,0,0,0'||!uv||[uv.R,uv.G,uv.B,uv.A].join(',')!=='1,1,0,0')throw Error('单帧溶解材质设置读回不一致：'+mo);
  }
  function canonicalTexturePlan(spec,input){
    const assets={...input},seen=new Map();
    for(const [key,t]of Object.entries(spec.textures||{})){
      if(!['ramp','cutout'].includes(t.class))continue;
      const pkg=assets['tex:'+key],id=JSON.stringify([t.class,t.file,texturePolicy(pkg,t.class).maxSize]);
      if(seen.has(id))assets['tex:'+key]=seen.get(id);else seen.set(id,pkg);
    }
    return assets;
  }
  function textureReuseIdentity(it,key){
    const t=it.spec.textures?.[key.slice(4)],sha=it.textureHashes?.[key.slice(4)];
    if(!key.startsWith('tex:')||!['ramp','cutout'].includes(t?.class)||!t.hash)return '';
    if(!/^[a-f0-9]{17,32}$/.test(t.hash)||! /^[a-f0-9]{64}$/.test(sha||''))throw Error('贴图指纹无效或源文件未核验：'+key);
    return [t.class,t.hash,sha,texturePolicy(it.assets[key],t.class).maxSize].join('|');
  }
  function writeAssetEntries(it){
    const seen=new Set();return selectedAssetEntries(it).filter(([key,pkg])=>{if(it.textureReuse?.[key])return false;const p=pkg.toLowerCase();if(seen.has(p))return false;seen.add(p);return true;});
  }
  async function readTextureProof(pkg){
    guard(pkg);
    const code=`# FWL_TEXTURE_FINGERPRINT
pkg = ${pyStr(pkg)}
obj = unreal.load_asset(pkg)
filename = os.path.abspath(os.path.join(unreal.Paths.project_content_dir(),pkg[6:] + '.uasset'))
dirty = set(unicode(x.get_name()) for x in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages())
result = {'pkg':pkg,'exists':obj is not None,'class':obj.get_class().get_name() if obj else '', 'dirty':pkg in dirty,'diskHash':''}
if os.path.isfile(filename):
 import hashlib
 with open(filename,'rb') as saved: result['diskHash'] = hashlib.sha256(saved.read()).hexdigest()
print('FWLFINGERPRINT:' + json.dumps(result))
`;
    const result=JSON.parse(tagged(await py(code),'FWLFINGERPRINT:'));
    if(result.pkg!==pkg||result.class!=='Texture2D'||!result.exists||result.dirty||!/^[a-f0-9]{64}$/.test(result.diskHash))return null;
    const p=await props(objPath(pkg));
    if(p.NeverStream===true)return null;     // 用户 10-18 永远不勾 NeverStream：勾着的旧贴图不复用，改为重导（导入时写 false）
    if(texturePolicyErrors(p,texturePolicy(pkg).maxSize).length)return null;
    return result;
  }
  async function planTextureReuse(it,planned=new Map()){
    const registry=loadLS().textureFingerprints||{},selected=new Set(selectedAssetEntries(it).map(([k])=>k));
    it.textureReuse={};
    for(const [key]of Object.entries(it.assets)){
      const id=textureReuseIdentity(it,key);if(!id||!selected.has(key))continue;
      const entry=registry[id];
      const usePlanned=()=>{
        const candidate=planned.get(id);
        if(candidate){const original=it.assets[key];it.assets[key]=candidate.pkg;it.textureReuse[key]={id,pkg:candidate.pkg,original,plannedOwner:candidate.owner,ownerKey:candidate.key};}
      };
      if(!entry){usePlanned();continue;}
      if(!entry.pkg||texturePolicy(entry.pkg).maxSize!==texturePolicy(it.assets[key]).maxSize)continue;
      let proof=null;try{proof=await readTextureProof(entry.pkg);}catch(error){throw Error('复用资产核查失败，请检查 UE 连接：'+error.message);}
      if(!proof||proof.diskHash!==entry.diskHash){usePlanned();continue;}
      const original=it.assets[key];it.assets[key]=entry.pkg;it.textureReuse[key]={id,pkg:entry.pkg,original,diskHash:proof.diskHash};
    }
    // Keep all source aliases pointing at the selected canonical target.
    for(const reuse of Object.values(it.textureReuse))for(const [key,pkg]of Object.entries(it.assets))if(pkg===reuse.original){it.assets[key]=reuse.pkg;if(selected.has(key))it.textureReuse[key]={...reuse};}
  }
  function collectPlannedTextures(it,planned,owner){
    for(const [key,pkg]of writeAssetEntries(it)){const id=textureReuseIdentity(it,key);if(id&&!planned.has(id))planned.set(id,{pkg,owner,key});}
  }
  async function verifyTextureReuse(it){
    const required=new Set([...selectedAssetEntries(it).map(([k])=>k),...selectionDependencies(it).map(d=>d.key)]);
    for(const [key,entry]of Object.entries(it.textureReuse||{})){
      if(!required.has(key))continue;
      if(entry.pkg!==it.assets[key]||textureReuseIdentity(it,key)!==entry.id)throw Error('复用绑定已变化，请重新检查');
      const expected=entry.plannedOwner?loadLS().textureFingerprints?.[entry.id]:entry;
      const proof=await readTextureProof(entry.pkg);if(!expected||expected.pkg!==entry.pkg||!proof||proof.diskHash!==expected.diskHash)throw Error('复用资产已丢失或改变，请重新检查：'+entry.pkg);
    }
  }
  async function registerTextureFingerprints(it,entries){
    const eligible=entries.filter(([key])=>textureReuseIdentity(it,key));if(!eligible.length)return;
    const updates={};
    for(const [key,pkg]of eligible){const proof=await readTextureProof(pkg);if(!proof)throw Error('贴图已保存但指纹登记核对失败：'+pkg);updates[textureReuseIdentity(it,key)]={pkg,diskHash:proof.diskHash};}
    const state=loadLS();state.textureFingerprints={...(state.textureFingerprints||{}),...updates};saveLS(state);
  }
