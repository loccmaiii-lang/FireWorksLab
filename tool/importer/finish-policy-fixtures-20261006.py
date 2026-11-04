from pathlib import Path
import json
p=Path('.').resolve();changes=[]
for name in ['fireworks-import.js','fireworks-update.js','fireworks-plan.js','fireworks-ui.js']:
 changes.append({'file':name,'before':(p/'backups'/('20261006-policy-'+name)).read_text(encoding='utf-8'),'after':(p/name).read_text(encoding='utf-8')})
def closure(s):
 a=s.index('const FwImporter');z=s.index('const ShowBlueprintData',a);return s[a:z].strip()
changes.append({'file':'generated-importer','before':closure((p/'backups/20261006-policy-df-fx-workbench_v2_locmai.html').read_text(encoding='utf-8')),'after':closure((p.parent/'df-fx-workbench_v2_locmai.html').read_text(encoding='utf-8'))})
(p/'backups/20261006-reviewed-policy-patch.json').write_text(json.dumps({'changes':changes},ensure_ascii=False,indent=2),encoding='utf-8')
f=p/'check-multi-textures.cjs';s=f.read_text(encoding='utf-8');(p/'backups/20261006-policy-check-multi-textures.cjs').write_text(s,encoding='utf-8')
s=s.replace('const python=[],calls=[];','const python=[],calls=[],nodes=new Map();')
s=s.replace("python.push(code);return code.includes('import_asset_tasks')", "python.push(code);if(require('./mock-import-policy.cjs').simulatePolicy(code,nodes))return[];return code.includes('import_asset_tasks')")
s=s.replace("__props:async p=>{", "__props:async p=>{\n if(nodes.has(p))return nodes.get(p);")
s=s.replace("const sandbox={performance,", "const sandbox={performance,api:async(route,body)=>({data:{properties:nodes.get(body.path)||{}}}),")
s=s.replace("const materialCode=python.filter(s=>s.includes('set_material_instance_texture_parameter_value'));", "const materialCode=python.filter(s=>s.includes('set_material_instance_texture_parameter_value')&&!s.includes('# FWL_POLICY_MATERIAL'));")
# Stateful material mock supplies prior binding values before policy merge.
s=s.replace("__call:async(...args)=>{calls.push(args);return{success:true};}", "__call:async(...args)=>{calls.push(args);if(args[1]==='DuplicateAsset'){const p=args[2].DestinationAssetPath+'.'+args[2].DestinationAssetPath.split('/').pop();nodes.set(p,await sandbox.__props(p));}return{success:true};}")
f.write_text(s,encoding='utf-8')
f=p/'check-import-update-backend.cjs';s=f.read_text(encoding='utf-8')
s=s.replace("   if(require('./mock-import-policy.cjs').simulatePolicy(code,nodes))return reply('');", "   if(code.includes('# FWL_POLICY_DIRS')&&options.missingDir)throw Error('Destination directory does not exist; creation is forbidden');\n   if(require('./mock-import-policy.cjs').simulatePolicy(code,nodes))return reply('');")
s=s.replace("   const properties=get(body.path);", "   const properties=get(body.path);\n   if(options.badTextureReadback&&properties.ForcePlatformSettings)properties.ForcePlatformSettings=[];\n   if(options.badMaterialReadback&&properties.BasePropertyOverrides)properties.BasePropertyOverrides.TwoSided=true;")
s=s.replace('(async()=>{',"module.exports={fixture};\nif(require.main===module)(async()=>{",1)
f.write_text(s,encoding='utf-8')
