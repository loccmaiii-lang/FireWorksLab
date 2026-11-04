// 真实 UE 只读预检；统一阻止写入、保存和导入函数。
const fs=require('node:fs');
const {loadBackend}=require('./import-backend.cjs');
const {setTimeout:delay}=require('node:timers/promises');
const base=__dirname+'/backups/20261012-codex-4969-local/prepared';
let calls=0;const counts={};
async function api(route,body){
 if(!['/object/get','/object/call'].includes(route))throw Error('预检禁止写入接口：'+route);
 if(route==='/object/call'&&!['ExecutePythonCommandEx','DoesAssetExist','GetPlatformName','GetMetadataTag'].includes(body.function))throw Error('预检禁止引擎函数：'+body.function);
 if(body.function==='ExecutePythonCommandEx'&&/\b(?:create_asset|save_asset|set_editor_property|duplicate_asset|delete_asset|check_out_or_add_file|rename)\s*\(/.test(body.args.PythonCommand))throw Error('预检禁止原生写入代码');
 calls++;counts[body.function||route]=(counts[body.function||route]||0)+1;
 const {request}=await import('file:///F:/FireWorksLab/analysis/local/MOBILE_TEST_20261011/ue.mjs');
 const value=await request(route,body,120000);return {success:true,data:value};
}
const backend=loadBackend(api,()=>{}, {htmlFile:__dirname+'/../df-fireworks-delivery_locmai.html'});
(async()=>{
 const live=process.argv.includes('--live');
 const receipts=JSON.parse(fs.readFileSync(base+(live?'/live-receipts.json':'/receipts.json'),'utf8')),plans=[],planned=new Map();
 for(const receipt of receipts)for(const p of receipt.packages){
  const source=await backend.readPack(p.directory,p.configFile),spec=source.spec;
  const baseName=p.platform==='mobile'?p.name:receipt.name;
  const naming={baseName,assetIndex:'01',particleNumbered:false,assetNaming:'formal'};
  const item={...source,dir:p.directory,configFile:p.configFile,as:baseName+'_01',naming,mode:p.platform==='pc'?'update':'create',spec,assets:backend.makePlan(spec,baseName+'_01',naming)};
  const errors=backend.validate(spec,p.configFile);
  await backend.planTextureReuse(item,planned);await backend.assertImportDirectories(item);
  if(item.mode==='update'){item.targets=await backend.readUpdateTargets(item);errors.push(...backend.validateUpdateTargets(item));}
  else for(const [key,target]of backend.writeAssetEntries(item)){const r=await api('/object/call',{path:'/Script/EditorScriptingUtilities.Default__EditorAssetLibrary',function:'DoesAssetExist',args:{AssetPath:target}});if(![false,'False'].includes(r.data?.return_value))errors.push('新建目标已存在或未知：'+target);}
  if(!errors.length)backend.collectPlannedTextures(item,planned,baseName);
  const plan={name:baseName,platform:p.platform,mode:item.mode,revisionId:receipt.revisionId,directory:p.directory,assets:item.assets,reuse:item.textureReuse,errors};plans.push(plan);
  console.log(baseName+' '+item.mode+' '+(errors.length?'拦下 '+errors.join('；'):'通过'));
 }
 fs.writeFileSync(base+(live?'/ue-preflight-live.json':'/ue-preflight.json'),JSON.stringify({createdAt:new Date().toISOString(),calls,counts,plans},null,2));if(plans.some(p=>p.errors.length))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
