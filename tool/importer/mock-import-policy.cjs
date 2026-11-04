// Test-only evaluator for the policy scripts; never loaded by the workbench.
const assert=require('node:assert/strict');
const clone=value=>JSON.parse(JSON.stringify(value));
const literal=(code,name)=>JSON.parse(code.match(new RegExp('^'+name+' = u(".*")$','m'))[1]);
function simulatePolicy(code,nodes){
 if(code.includes('# FWL_POLICY_DIRS')){
  assert(code.includes('assert os.path.isdir(folder)'));
  assert(!/makedirs|mkdir|create_asset|import_asset_tasks/.test(code));return true;
 }
 if(code.includes('# FWL_POLICY_TEXTURE')){
  assert(nodes,'Texture fixture requires state');
  const path=literal(code,'texture_path'),limit=Number(code.match(/^texture_limit = (\d+)$/m)[1]);
  assert(code.includes("t.set_editor_property('max_texture_size',texture_limit)"));
  assert(code.includes('unreal.PixelFormat.PF_ASTC_6X6'));
  assert(code.includes("t.set_editor_property('force_platform_settings',settings)"));
  const p=clone(nodes.get(path)||{}),platforms=[...code.match(/for platform in \(([^)]+)\)/)[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
  const map=new Map((p.ForcePlatformSettings||[]).map(x=>[x.key,x.value]));
  for(const key of platforms)map.set(key,{PixelFormat:'PF_ASTC_6x6'});
  nodes.set(path,{...p,MaxTextureSize:limit,ForcePlatformSettings:[...map].map(([key,value])=>({key,value}))});return true;
 }
 if(code.includes('# FWL_POLICY_MATERIAL')){
  assert(nodes,'Material fixture requires state');
  const path=literal(code,'material_path'),p=clone(nodes.get(path)||{});
  if(code.includes('clear_all_material_instance_parameters')){p.TextureParameterValues=[];p.ScalarParameterValues=[];p.ObsoleteParameter=false;}
  const boundTextures=[...code.matchAll(/texture_parameter_value\(mi, '([^']+)', unreal.load_object\(None, '([^']+)'/g)].map(m=>({ParameterInfo:{Name:m[1]},ParameterValue:{path:m[2]}}));
  if(boundTextures.length)p.TextureParameterValues=boundTextures;
  assert(code.includes("overrides.set_editor_property('override_two_sided',True)"));
  assert(code.includes("overrides.set_editor_property('two_sided',False)"));
  assert(code.includes(" != 'Dissolve'"));
  const params=new Map((p.ScalarParameterValues||[]).map(x=>[x.ParameterInfo.Name,x]));
  for(const m of code.matchAll(/scalar_parameter_value\(mi, '([^']+)', ([\d.e+-]+)\)/g))params.set(m[1],{ParameterInfo:{Name:m[1]},ParameterValue:Number(m[2])});
  nodes.set(path,{...p,BasePropertyOverrides:{...p.BasePropertyOverrides,bOverride_TwoSided:true,TwoSided:false},
   TextureParameterValues:(p.TextureParameterValues||[]).filter(x=>x.ParameterInfo.Name!=='Dissolve'),ScalarParameterValues:[...params.values()]});return true;
 }
 return false;
}
function simulateTexturePolicyWrite(body,nodes){
 const text=body.properties?.ForcePlatformSettings;if(text===undefined)return false;
 assert.equal(typeof text,'string');
 const rows=[...text.matchAll(/\(("(?:[^"\\]|\\.)*"),\(PixelFormat=(PF_[A-Za-z0-9_]+)\)\)/g)].map(m=>({key:JSON.parse(m[1]),value:{PixelFormat:m[2]}}));
 assert.equal(text,'('+rows.map(r=>'('+JSON.stringify(r.key)+',(PixelFormat='+r.value.PixelFormat+'))').join(',')+')','Map must use native key-value pairs, not array struct keys');
 const p=clone(nodes.get(body.path)||{});nodes.set(body.path,{...p,MaxTextureSize:body.properties.MaxTextureSize,ForcePlatformSettings:rows});return true;
}
module.exports={simulatePolicy,simulateTexturePolicyWrite};
