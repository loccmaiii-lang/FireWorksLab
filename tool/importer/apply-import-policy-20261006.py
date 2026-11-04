from pathlib import Path
import json,difflib
p=Path('.')
for name in ['fireworks-plan.js','import-backend.cjs','run-show-project-checks.py']:
 (p/'backups'/('20261006-policy-'+name)).write_bytes((p/name).read_bytes())
def edit(name,before,after):
 f=p/name;s=f.read_text(encoding='utf-8');assert s.count(before)==1,(name,before[:100]);f.write_text(s.replace(before,after),encoding='utf-8')
edit('build.py',"VERSION = '2.14'","VERSION = '2.15'")
edit('build.py',"    start=s.index('  function validate(spec){',s.index('const FwImporter'))", "    s=replace_once(s, '  const TEX_KEYS =', (HERE/'fireworks-policy.js').read_text(encoding='utf-8')+'\\n  const TEX_KEYS =')\n    s=replace_once(s, \"const allowed = p => Object.values(MAP.dirs).some(d => p.startsWith(d + '/'));\", \"const allowed = p => directAssetPath(p);\")\n    start=s.index('  function validate(spec){',s.index('const FwImporter'))")
edit('fireworks-plan.js',"assets['tex:'+key]=MAP.dirs[t.class]+'/'+(formal||fmt(pattern,namedBase,textureGrid(spec,key,t)));", "const name=formal||fmt(pattern,namedBase,textureGrid(spec,key,t));\n      assets['tex:'+key]=texturePolicy(name,t.class).directory+'/'+name;")
edit('fireworks-import.js',"    try {\n    if(updating){", "    try {\n    it.importProgress.stage='目录与平台检查';\n    await assertImportDirectories(it);\n    if(updating){")
edit('fireworks-import.js',"        if (Object.keys(diff).length) await setp(dst, diff);", "        if (Object.keys(diff).length) await setp(dst, diff);\n        // Explicit project policy takes precedence over inherited reference limits.\n        want.MaxTextureSize=texturePolicy(dst).maxSize;\n        await applyTexturePolicy(dst);")
edit('fireworks-import.js',"      await py(code + 'L.update_material_instance(mi)\\n', 300000);", "      await py(code + 'L.update_material_instance(mi)\\n', 300000);\n      await applyMaterialPolicy(mo);")
edit('fireworks-ui.js',"            if(item.mode==='update'){item.targets=", "            item.policyVersion=IMPORT_POLICY_VERSION;\n            await assertImportDirectories(item);\n            if(item.mode==='update'){item.targets=")
edit('import-backend.cjs',"    importEmitters:typeof importEmitters", "    texturePolicy:typeof texturePolicy==='function'?texturePolicy:undefined,\n    assertImportDirectories:typeof assertImportDirectories==='function'?assertImportDirectories:undefined,\n    applyTexturePolicy:typeof applyTexturePolicy==='function'?applyTexturePolicy:undefined,\n    applyMaterialPolicy:typeof applyMaterialPolicy==='function'?applyMaterialPolicy:undefined,\n    texturePolicyErrors:typeof texturePolicyErrors==='function'?texturePolicyErrors:undefined,\n    materialPolicyErrors:typeof materialPolicyErrors==='function'?materialPolicyErrors:undefined,\n    guard,\n    importEmitters:typeof importEmitters")
edit('run-show-project-checks.py',"    evidence.mkdir(parents=True,exist_ok=True)","    assert evidence.is_dir(), 'Evidence directory must already exist'")
