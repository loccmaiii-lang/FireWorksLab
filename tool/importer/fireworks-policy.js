  // Local project policy. Platform follows the full destination texture name,
  // as explicitly confirmed by the user; source keys never choose the platform.
  const IMPORT_POLICY_VERSION = 'hd-mobile-2.18';
  const MOBILE_TEXTURE_DIR = MAP.dirs.flipbook;
  const MOBILE_RAMP_DIR = MAP.dirs.ramp;
  const HD_TEXTURE_DIR = '/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD';
  Object.assign(MAP.dirs, {flipbook:HD_TEXTURE_DIR,cutout:HD_TEXTURE_DIR,ramp:HD_TEXTURE_DIR,
    mobile_texture:MOBILE_TEXTURE_DIR,mobile_ramp:MOBILE_RAMP_DIR});
  function texturePolicy(pkg,textureClass){
    const name=String(pkg).split('/').pop().split('.')[0];
    const hd=/_HD$/i.test(name);
    return {platform:hd?'HD / PC':'手游',maxSize:hd?2048:1024,
      directory:hd?HD_TEXTURE_DIR:textureClass==='ramp'?MOBILE_RAMP_DIR:MOBILE_TEXTURE_DIR};
  }
  function directAssetPath(p){
    if(typeof p!=='string'||p.includes('\\')||p.includes('..'))return false;
    const root=p.split(':')[0];
    return Object.values(MAP.dirs).some(d=>root.startsWith(d+'/')&&
      /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)?$/.test(root.slice(d.length+1)));
  }
  function policyOrder(value){
    if(Array.isArray(value))return value.map(policyOrder);
    if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,policyOrder(value[k])]));
    return value;
  }
  async function assertImportDirectories(it){
    const expected=makePlan(it.spec,it.as,it.naming);
    for(const [key,entry]of Object.entries(it.textureReuse||{})){if(expected[key]!==entry.original||it.assets[key]!==entry.pkg||textureReuseIdentity(it,key)!==entry.id)throw Error('复用计划已失效');expected[key]=entry.pkg;}
    for(const entry of Object.values(it.textureReuse||{}))for(const key of Object.keys(expected))if(expected[key]===entry.original)expected[key]=entry.pkg;
    if(JSON.stringify(policyOrder(expected))!==JSON.stringify(policyOrder(it.assets)))
      throw Error('目标目录或平台规则已变化，请重新预览；旧目录资产不会自动迁移。');
    const dirs=[...new Set(writeAssetEntries(it).map(([,pkg])=>{
      guard(pkg);return pkg.slice(0,pkg.lastIndexOf('/'));
    }))];
    await py(`# FWL_POLICY_DIRS\ndirectories = ${JSON.stringify(dirs)}
content = os.path.abspath(unreal.Paths.project_content_dir())
for directory in directories:
 assert directory.startswith('/Game/') and '..' not in directory
 folder = os.path.abspath(os.path.join(content,directory[6:]))
 assert folder.startswith(content + os.sep)
 assert os.path.isdir(folder), 'Destination directory does not exist; creation is forbidden: ' + directory
`);
  }
  function texturePolicyErrors(p,limit){
    const errors=[];
    if(p.MaxTextureSize!==limit)errors.push('MaxTextureSize（应为 '+limit+'）');
    const map=new Map((p.ForcePlatformSettings||[]).map(row=>[row.key,row.value?.PixelFormat]));
    for(const platform of ['Android','OpenHarmony','IOS'])if(map.get(platform)!=='PF_ASTC_6x6')errors.push(platform+' PF_ASTC_6x6');
    return errors;
  }
  async function applyTexturePolicy(dst){
    guard(dst);const limit=texturePolicy(dst).maxSize;
    // PixelFormat is read-only to Python in this project. Native property text
    // imports the whole map; preserve other platforms and reject unknown fields.
    const before=await api('/object/get',{path:dst,properties:['MaxTextureSize','ForcePlatformSettings']});
    if(before?.__error||!before?.data?.properties||!Array.isArray(before.data.properties.ForcePlatformSettings))throw Error('无法读取贴图平台设置，停止写入：'+dst);
    const settings=new Map();
    for(const row of before.data.properties.ForcePlatformSettings){
      if(typeof row.key!=='string'||!row.value||Object.keys(row.value).some(k=>!['_struct','PixelFormat'].includes(k))||!/^PF_[A-Za-z0-9_]+$/.test(row.value.PixelFormat))throw Error('贴图平台设置结构未知，不能覆盖：'+dst);
      settings.set(row.key,row.value.PixelFormat);
    }
    for(const platform of ['Android','OpenHarmony','IOS'])settings.set(platform,'PF_ASTC_6x6');
    const value='('+[...settings].map(([key,format])=>'('+JSON.stringify(key)+',(PixelFormat='+format+'))').join(',')+')';
    await setp(dst,{MaxTextureSize:limit,ForcePlatformSettings:value});
    const response=await api('/object/get',{path:dst,properties:['MaxTextureSize','ForcePlatformSettings']});
    if(response?.__error)throw Error(response.__error);
    const errors=texturePolicyErrors(response?.data?.properties||{},limit);
    if(errors.length)throw Error('贴图平台策略读回失败：'+dst+'：'+errors.join(', '));
  }
  const NEUTRAL_DISSOLVE = {TexDissolveSpeed:0,TexDissolveOffset:1,TexDissolvePower:1,DissolveProgress:0,UseParticleAlphaDissolve:0};
  function materialPolicyErrors(p){
    const errors=[];
    if(p.BasePropertyOverrides?.bOverride_TwoSided!==true||p.BasePropertyOverrides?.TwoSided!==false)errors.push('单面覆盖');
    if((p.TextureParameterValues||[]).some(v=>v.ParameterInfo?.Name==='Dissolve'))errors.push('Dissolve 贴图覆盖');
    const values=new Map((p.ScalarParameterValues||[]).map(v=>[v.ParameterInfo?.Name,v.ParameterValue]));
    for(const [name,value]of Object.entries(NEUTRAL_DISSOLVE))if(values.get(name)!==value)errors.push(name);
    return errors;
  }
  async function applyMaterialPolicy(mo,bindingCode=''){
    guard(mo);
    const scalars=Object.entries(NEUTRAL_DISSOLVE).map(([name,value])=>`L.set_material_instance_scalar_parameter_value(mi, '${name}', ${value})\n`).join('');
    await py(`# FWL_POLICY_MATERIAL\nmaterial_path = ${pyStr(mo)}
${bindingCode||'mi = unreal.load_object(None,material_path)\nassert mi is not None\nL = unreal.MaterialEditingLibrary\n'}overrides = mi.get_editor_property('base_property_overrides')
overrides.set_editor_property('override_two_sided',True)
overrides.set_editor_property('two_sided',False)
mi.set_editor_property('base_property_overrides',overrides)
textures = mi.get_editor_property('texture_parameter_values')
mi.set_editor_property('texture_parameter_values',[row for row in textures if str(row.get_editor_property('parameter_info').get_editor_property('name')) != 'Dissolve'])
${scalars}L.update_material_instance(mi)
`);
    const response=await api('/object/get',{path:mo,properties:['BasePropertyOverrides','TextureParameterValues','ScalarParameterValues']});
    if(response?.__error)throw Error(response.__error);
    const errors=materialPolicyErrors(response?.data?.properties||{});
    if(errors.length)throw Error('材质策略读回失败：'+mo+'：'+errors.join(', '));
  }
