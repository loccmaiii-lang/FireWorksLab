"""Run an explicit set of isolated checks; never discover native tests by glob."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json, re, subprocess

root=Path(__file__).resolve().parent
evidence=root/'research/show-link-20261006'
names=[
 'check.cjs','check-multi-textures.cjs','check-show.cjs','check-show-export.cjs',
 'check-show-fan.cjs','check-show-blank.cjs','check-show-resource-ids.cjs',
 'check-import-name-confirmation.cjs','check-import-recovery.cjs',
 'check-import-calibration.cjs','check-import-iteration.cjs',
 'check-import-update-backend.cjs','check-import-naming.cjs','check-import-preroll.cjs',
 'check-design-ui.cjs','check-design-layout.cjs','check-import-public-names.cjs',
 'check-import-life-modules.cjs','check-import-color-scale.cjs','check-import-system-policy.cjs','check-import-system-ui.cjs','check-show-project.cjs',
 'check-show-project-boundaries.cjs','check-show-project-ui.cjs','check-import-policy.cjs','check-import-selection.cjs','check-workbench-log.cjs','check-workbench-scroll.cjs','check-import-interrupted.cjs','check-import-cutout-selection.cjs','check-import-workspace.cjs','check-import-compat.cjs','check-import-reuse-compat.cjs','check-import-compat-ui.cjs','check-import-pack-compat.cjs',
]

def execute(name):
    try:
        result=subprocess.run(['node',name],cwd=root,capture_output=True,text=True,encoding='utf-8',timeout=90)
        item={'name':name,'exitCode':result.returncode,'stdout':result.stdout,'stderr':result.stderr,
              'passLines':len(re.findall(r'^PASS\b',result.stdout,re.M)),
              'skipped':bool(re.search('SKIP|skipped|跳过',result.stdout))}
    except Exception as error:
        item={'name':name,'exitCode':-1,'error':str(error),'passLines':0}
    assert evidence.is_dir(), 'Evidence directory must already exist'
    (evidence/(name+'.result.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2),encoding='utf-8')
    return item

with ThreadPoolExecutor(max_workers=3) as pool:
    results=list(pool.map(execute,names))
report={'kind':'isolated-data-and-DOM-checks','actualBrowserVerified':False,
        'actualUENativeWrites':0,'results':results,'scriptsPassed':sum(x['exitCode']==0 for x in results),
        'passLines':sum(x['passLines'] for x in results)}
(evidence/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
for item in results:
    print(('PASS' if item['exitCode']==0 else 'FAIL')+' '+item['name']+' ('+str(item['passLines'])+' assertions)')
    if item['exitCode']:print(item.get('stderr') or item.get('error',''))
print(str(report['scriptsPassed'])+'/'+str(len(names))+' scripts; '+str(report['passLines'])+' PASS lines')
raise SystemExit(0 if report['scriptsPassed']==len(names) else 1)
