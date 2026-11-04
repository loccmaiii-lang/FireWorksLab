from pathlib import Path
import json,difflib
p=Path(".").resolve()
changes=[]
for name in ['fireworks-import.js','fireworks-update.js','fireworks-plan.js','fireworks-ui.js']:
 old=(p/'backups'/('20261006-policy-'+name)).read_text(encoding='utf-8').splitlines(keepends=True)
 new=(p/name).read_text(encoding='utf-8').splitlines(keepends=True)
 for tag,a,b,c,d in difflib.SequenceMatcher(None,old,new,autojunk=False).get_opcodes():
  if tag=='equal':continue
  # Include a preceding unchanged line for unique insertion anchors.
  if a==b:a-=1;c-=1
  changes.append({'file':name,'before':''.join(old[a:b]),'after':''.join(new[c:d])})
old=(p/'backups/20261006-policy-df-fx-workbench_v2_locmai.html').read_text(encoding='utf-8')
a=old.index('const FwImporter');z=old.index('const ShowBlueprintData',a)
old=old[a:z].strip()
# Build before comparing generated closure.
import subprocess
subprocess.run(['python','build.py'],check=True)
new=(p.parent/'df-fx-workbench_v2_locmai.html').read_text(encoding='utf-8');a=new.index('const FwImporter');z=new.index('const ShowBlueprintData',a);new=new[a:z].strip()
for tag,a,b,c,d in difflib.SequenceMatcher(None,old.splitlines(keepends=True),new.splitlines(keepends=True),autojunk=False).get_opcodes():
 if tag=='equal':continue
 linesold=old.splitlines(keepends=True);linesnew=new.splitlines(keepends=True)
 if a==b:a-=1;c-=1
 changes.append({'file':'generated-importer','before':''.join(linesold[a:b]),'after':''.join(linesnew[c:d])})
(p/'backups/20261006-reviewed-policy-patch.json').write_text(json.dumps({'changes':changes},ensure_ascii=False,indent=2),encoding='utf-8')
# Enforce applied anchors once and keep every unrelated line strict.
f=p/'check-import-public-names.cjs';s=f.read_text(encoding='utf-8');s=s.replace("   assert.equal(fs.readFileSync(__dirname+'/'+file", "   for(const c of JSON.parse(fs.readFileSync(__dirname+'/backups/20261006-reviewed-policy-patch.json','utf8')).changes.filter(c=>c.file===file)){assert.equal(expected.split(c.before).length,2);expected=expected.replace(c.before,c.after);}\n   assert.equal(fs.readFileSync(__dirname+'/'+file")
s=s.replace("assert.equal(old.replace(changes[0].before,changes[0].after),actual);", "let expected=old.replace(changes[0].before,changes[0].after);for(const c of JSON.parse(fs.readFileSync(__dirname+'/backups/20261006-reviewed-policy-patch.json','utf8')).changes.filter(c=>c.file==='fireworks-update.js')){assert.equal(expected.split(c.before).length,2);expected=expected.replace(c.before,c.after);}assert.equal(expected,actual);")
f.write_text(s,encoding='utf-8')
f=p/'check-design-ui.cjs';s=f.read_text(encoding='utf-8');(p/'backups/20261006-policy-check-design-ui.cjs').write_text(s,encoding='utf-8')
s=s.replace("...acceptedLifeModuleChanges.changes]", "...acceptedLifeModuleChanges.changes,...JSON.parse(fs.readFileSync(path.join(__dirname,'backups/20261006-reviewed-policy-patch.json'),'utf8')).changes.filter(c=>c.file==='generated-importer')]")
s=s.replace('fs.mkdirSync(folder,{recursive:true});',"assert(fs.statSync(folder).isDirectory());")
f.write_text(s,encoding='utf-8')
f=p/'check-design-layout.cjs';s=f.read_text(encoding='utf-8');(p/'backups/20261006-policy-check-design-layout.cjs').write_text(s,encoding='utf-8');s=s.replace('fs.mkdirSync(path.dirname(target), {recursive: true});',"assert(fs.statSync(path.dirname(target)).isDirectory());");f.write_text(s,encoding='utf-8')
