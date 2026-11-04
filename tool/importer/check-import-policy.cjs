const assert=require('node:assert/strict');
const {loadBackend}=require('./import-backend.cjs');
const b=loadBackend(async()=>{throw Error('No UE calls permitted');});
const spec={format:'fwl.cascade/1',name:'Policy',textures:{hd:{class:'flipbook',file:'hd.png',asset:'T_Policy_HD',cols:1,rows:1},mobile:{class:'flipbook',file:'mobile.png',asset:'T_Policy_01',cols:1,rows:1}},materials:{},emitters:[]};
const a=b.makePlan(spec,'Policy');
assert.equal(a['tex:hd'],'/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD/T_Policy_HD','HD texture must not land in mobile directory');
assert.equal(a['tex:mobile'],'/Game/Effects/Common/Texture/Fireworks/T_Policy_01');
console.log('PASS platform destination regression');

const fs=require('node:fs');
const {simulatePolicy}=require('./mock-import-policy.cjs');
const {fixture}=require('./check-import-update-backend.cjs');
const plain=v=>JSON.parse(JSON.stringify(v));
const objectPath=p=>p+'.'+p.split('/').pop();
let passed=1;
async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
function policyFixture(options={}){
 const nodes=new Map(),calls=[];
 const reply=line=>({data:{return_value:'True',out_LogOutput:'Output='+JSON.stringify(line)}});
 const api=async(route,body)=>{
  calls.push({route,body});
  if(route==='/object/get'){
   const p=plain(nodes.get(body.path)||{ForcePlatformSettings:[]});
   if(options.missingASTC)p.ForcePlatformSettings=[];
   if(options.wrongSide&&p.BasePropertyOverrides)p.BasePropertyOverrides.TwoSided=true;
   return{data:{properties:p}};
  }
  if(route==='/object/set'){
   if(options.reject)throw Error('Native write rejected');
   if(!require('./mock-import-policy.cjs').simulateTexturePolicyWrite(body,nodes))throw Error('Unexpected property write');
   return {data:{failed_properties:[]}};
  }
  if(body.function==='ExecutePythonCommandEx'){
   const code=body.args.PythonCommand;
   if(options.reject)throw Error('Native write rejected');
   if(!simulatePolicy(code,nodes))throw Error('Unexpected script');
   return reply('');
  }
  throw Error('Unexpected operation');
 };
 return{b:loadBackend(api),nodes,calls};
}
(async()=>{
 await check('HD及手游Flipbook/Cutout/Ramp逐一正确分流',()=>{
  for(const cls of ['flipbook','cutout','ramp'])for(const hd of [true,false]){
   const asset='T_Policy_'+cls+(hd?'_HD':'_01');
   const s={...spec,textures:{t:{class:cls,file:'test.png',asset,cols:1,rows:1}}};
   const plan=b.makePlan(s,'Policy'),policy=b.texturePolicy(asset,cls);
   assert.equal(plan['tex:t'],policy.directory+'/'+asset);
   assert.equal(policy.maxSize,hd?2048:1024);
   assert.equal(policy.directory,hd?'/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD':cls==='ramp'?'/Game/Effects/Common/Texture/Ramp':'/Game/Effects/Common/Texture/Fireworks');
  }
 });
 await check('平台依据完整名称而非源键或包含HD字样',()=>{
  assert.equal(b.texturePolicy('T_HD_inside_01').maxSize,1024);
  assert.equal(b.texturePolicy('T_Policy_hd').maxSize,2048);
  const s={...spec,textures:{HD_key:{class:'flipbook',file:'a.png',asset:'T_Mobile_01',cols:1,rows:1}}};
  assert(b.makePlan(s,'Policy')['tex:HD_key'].startsWith('/Game/Effects/Common/Texture/Fireworks/'));
 });
 await check('白名单允许合法子对象但拒绝新增子目录/路径绕过',()=>{
  const root='/Game/Effects_HD/Props_HD/FireWorks_HD/P_Test_HD.P_Test_HD';
  assert.equal(b.guard(root+':Emitter.LOD0'),root+':Emitter.LOD0');
  for(const path of ['/Game/Effects_HD/Props_HD/FireWorks_HD/WorkbenchChecks/P_Test_HD','/Game/Effects_HD/Props_HD/FireWorks_HD/../P_Test_HD','/Game/Other/P_Test_HD','/Game/Effects_HD/Props_HD/FireWorks_HD/P_Test_HD/Extra'])assert.throws(()=>b.guard(path),/越界/);
 });
 await check('HD与手游均显式写三个ASTC平台并保留其它平台设置',async()=>{
  for(const hd of [true,false]){
   const t=policyFixture(),pkg=hd?a['tex:hd']:a['tex:mobile'],dst=objectPath(pkg);
   t.nodes.set(dst,{MaxTextureSize:4096,CompressionSettings:'TC_BC7',ForcePlatformSettings:[{key:'Windows',value:{PixelFormat:'PF_BC7'}},{key:'Android',value:{PixelFormat:'PF_Unknown'}}]});
   await t.b.applyTexturePolicy(dst);const p=t.nodes.get(dst);
   assert.equal(p.MaxTextureSize,hd?2048:1024);assert.equal(p.CompressionSettings,'TC_BC7');
   assert.equal(p.ForcePlatformSettings.find(x=>x.key==='Windows').value.PixelFormat,'PF_BC7');
   assert.deepEqual(plain(t.b.texturePolicyErrors(p,hd?2048:1024)),[]);
   const read=t.calls.find(c=>c.route==='/object/get');assert.deepEqual(plain(read.body.properties),['MaxTextureSize','ForcePlatformSettings']);
  }
 });
 await check('遗漏任一格式或尺寸字段不会误报成功',()=>{
  const valid={MaxTextureSize:1024,ForcePlatformSettings:['Android','OpenHarmony','IOS'].map(key=>({key,value:{PixelFormat:'PF_ASTC_6x6'}}))};
  for(const index of [0,1,2]){const p=plain(valid);p.ForcePlatformSettings.splice(index,1);assert.equal(b.texturePolicyErrors(p,1024).length,1);}
  assert(b.texturePolicyErrors({...valid,MaxTextureSize:2048},1024).length);
  assert(b.texturePolicyErrors({},1024).length);
 });
 await check('读回失败/原生拒绝写入时终止，不保存',async()=>{
  for(const options of [{missingASTC:true},{reject:true}]){const t=policyFixture(options);await assert.rejects(t.b.applyTexturePolicy(objectPath(a['tex:mobile'])),/读回失败|rejected/);assert(!t.calls.some(c=>c.body.function==='SaveAsset'));}
 });
 await check('材质移除旧Dissolve覆盖、单面，并保持帧参数/Ramp/亮度',async()=>{
  const t=policyFixture(),dst='/Game/Effects_HD/Common_HD/MaterialInstance_HD/FireWorks_HD/MI_Policy_HD.MI_Policy_HD';
  const texture=(name,path)=>({ParameterInfo:{Name:name},ParameterValue:{path}});
  t.nodes.set(dst,{Parent:{path:'ExistingParent'},BasePropertyOverrides:{bOverride_TwoSided:true,TwoSided:true,OtherSetting:7},TextureParameterValues:[texture('MainTex','Main'),texture('EmissiveRampTex','Ramp'),texture('Dissolve','OldMask')],ScalarParameterValues:[{ParameterInfo:{Name:'Rows'},ParameterValue:4},{ParameterInfo:{Name:'EmissiveIntensity'},ParameterValue:5},{ParameterInfo:{Name:'EmissiveDissolve'},ParameterValue:1}]});
  await t.b.applyMaterialPolicy(dst);const p=t.nodes.get(dst);
  assert.deepEqual(p.TextureParameterValues.map(x=>x.ParameterInfo.Name),['MainTex','EmissiveRampTex']);
  assert.equal(p.Parent.path,'ExistingParent');assert.equal(p.BasePropertyOverrides.OtherSetting,7);
  assert.equal(p.ScalarParameterValues.find(x=>x.ParameterInfo.Name==='EmissiveDissolve').ParameterValue,1);
  assert.equal(p.ScalarParameterValues.find(x=>x.ParameterInfo.Name==='EmissiveIntensity').ParameterValue,5);
  assert.equal(p.ScalarParameterValues.find(x=>x.ParameterInfo.Name==='Rows').ParameterValue,4);
  assert.deepEqual(plain(t.b.materialPolicyErrors(p)),[]);
 });
 await check('材质策略遗漏或仍然双面必须失败',async()=>{
  assert(b.materialPolicyErrors({}).length);
  const t=policyFixture({wrongSide:true}),dst='/Game/Effects_HD/Common_HD/MaterialInstance_HD/FireWorks_HD/MI_Policy_HD.MI_Policy_HD';
  await assert.rejects(t.b.applyMaterialPolicy(dst),/单面/);
 });
 await check('目录检查是纯读取且在任何导入/备份/保存之前',async()=>{
  const t=fixture({missingDir:true});await assert.rejects(t.run(),/creation is forbidden/);
  assert(!t.calls.some(c=>c.body.function==='SaveAsset'||c.body.function==='DuplicateAsset'||/import_asset_tasks|FWLBACKUP/.test(c.body.args?.PythonCommand||'')));
  assert.deepEqual(t.get(t.ps).Emitters.map(e=>e.path),t.oldPaths);
 });
 await check('直接执行不能绕过规划路径检查',async()=>{
  const t=fixture();t.it.assets['tex:main']='/Game/Effects/Common/Texture/Fireworks/NewFolder/T_Bad';
  await assert.rejects(t.run(),/规则已变化/);assert.equal(t.calls.length,0);
 });
 await check('新建与同名更新实际流水线均应用1024/ASTC/单面/无溶解',async()=>{
  for(const mode of ['create','update']){
   const t=fixture();t.it.mode=mode;await t.run();
   const tex=t.get(objectPath(t.it.assets['tex:main'])),mat=t.get(objectPath(t.it.assets['mat:m']));
   assert.equal(tex.MaxTextureSize,1024);assert.deepEqual(plain(t.b.texturePolicyErrors(tex,1024)),[]);assert.deepEqual(plain(t.b.materialPolicyErrors(mat)),[]);
   const scripts=t.calls.filter(c=>c.body.function==='ExecutePythonCommandEx').map(c=>c.body.args.PythonCommand);
   assert(scripts[0].includes('# FWL_POLICY_DIRS'));
   assert.equal(t.get(t.ps).Emitters.length,2);
  }
 });
 await check('平台/材质读回失败不会继续构建或保存粒子系统',async()=>{
  for(const options of [{badTextureReadback:true},{badMaterialReadback:true}]){
   const t=fixture(options);await assert.rejects(t.run(),/策略读回失败/);
   assert(!t.calls.some(c=>c.body.function==='SpawnObject'));
   assert.deepEqual(t.get(t.ps).Emitters.map(e=>e.path),t.oldPaths);
   assert(!t.calls.some(c=>c.body.function==='SaveAsset'&&c.body.args.AssetToSave===t.it.assets.ps&&t.it.importProgress.stage==='粒子系统'));
  }
 });
 await check('完整HD新建流水线使用2048及正确目录',async()=>{
  const t=fixture();t.it.mode='create';t.it.spec.textures.main.asset='T_Policy_Main_HD';t.it.assets=t.b.makePlan(t.it.spec,t.it.as);
  await t.run();assert(t.it.assets['tex:main'].startsWith('/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD/'));assert.equal(t.get(objectPath(t.it.assets['tex:main'])).MaxTextureSize,2048);
 });
 await check('更新备份脚本没有创建目录且原盘与内存快照分别留存',async()=>{
  const t=fixture();await t.run();const scripts=t.calls.map(c=>c.body.args?.PythonCommand||'');
  const backup=scripts.find(s=>s.includes("print('FWLBACKUP:'")),snapshot=scripts.find(s=>s.includes("'ready-to-update'"));
  assert(backup.includes('assert os.path.isdir(root)'));assert(backup.includes("'_original_'"));assert(backup.includes("'_before-update_'"));assert(backup.includes("'manifest':manifest_path"));
  assert(snapshot.includes("dest = row['before_update']"));assert(snapshot.includes('assert not os.path.exists(dest)'));
  assert(!scripts.some(s=>/os\.makedirs|os\.mkdir/.test(s)));
 });
 await check('页面预览明确平台上限且只有一个生产版本号',()=>{
  const html=fs.readFileSync(__dirname+'/../df-fx-workbench_v2_locmai.html','utf8');
  assert(html.includes('工作台 v'+fs.readFileSync(__dirname+'/build.py','utf8').match(/^VERSION = '([^']+)'/m)[1]));assert(html.includes('完整贴图名以 _HD 结尾'));assert(html.includes('最大尺寸 1024'));assert(html.includes('t.policy.maxSize'));assert(html.includes('await assertImportDirectories(item)'));
 });
 fs.writeFileSync(__dirname+'/backups/20261006-policy-verification.json',JSON.stringify({passed,actualUEWrites:0,browserVisualQA:false,time:new Date().toISOString()},null,2));
 console.log(passed+' importer policy checks passed; zero UE writes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
