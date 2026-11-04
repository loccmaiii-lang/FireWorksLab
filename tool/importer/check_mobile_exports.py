"""Read-only mobile texture QA using the repository's replay checker.

The checker accepts cascade.json only. A private hard-linked view selects
cascade_mobile.json without changing either delivered package or shared code.
"""
from pathlib import Path
import hashlib
import importlib
import json
import os
import sys
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parent
REPORT=ROOT/'research'/'calibration-20261002'
sys.path.insert(0,r'F:\FireWorksLab\analysis\scripts')
rc=importlib.import_module('回放检查')
from calibration import diameter, GRADES

def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

manifest=json.loads((REPORT/'exports.json').read_text('utf-8'))
calibration=json.loads((REPORT/'calibration.json').read_text('utf-8'))
selected=set(sys.argv[1:])
previous=REPORT/'mobile-export-checks.json'
records=json.loads(previous.read_text('utf-8')) if selected and previous.exists() else []
for item in manifest['items']:
    if selected and item['entry'] not in selected:
        continue
    source=Path(item['destination'])
    for filename,expected in item['files'].items():
        if digest(source/filename)!=expected:
            raise RuntimeError('Export changed: '+filename)
    spec=json.loads((source/'cascade_mobile.json').read_text('utf-8-sig'))
    view=REPORT/source.name/'mobile-check-source'
    view.mkdir(exist_ok=True)
    (view/'cascade.json').write_text(json.dumps(spec,ensure_ascii=False),encoding='utf-8')
    for texture in spec['textures'].values():
        filename=texture['file']
        if Path(filename).name!=filename:
            raise RuntimeError('Unexpected nested texture filename')
        target=view/filename
        if not target.exists():
            os.link(source/filename,target)
        if digest(target)!=digest(source/filename):
            raise RuntimeError('Mobile QA view differs')
    packs=[]
    for i,e in enumerate(spec['emitters']):
        pack=rc.Pack(str(view),i)
        pack.label=source.name+' 手机 · '+e['name']
        # Match each emitter's own Ramp instead of the checker's global ramp key.
        ramp_key=spec['materials'][e['material']].get('textures',{}).get('ramp')
        if ramp_key:
            image=np.asarray(Image.open(source/spec['textures'][ramp_key]['file']).convert('RGB'),dtype=np.float32)/255
            pack.ramp=rc.srgb_to_lin(image[image.shape[0]//2])
        if min(pack.cw,pack.chh)<256:
            raise RuntimeError('Mobile cell below 256px minimum')
        packs.append(pack)
    report=rc.check(packs,str(REPORT/source.name/'手机回放检查.jpg'),fps=30)
    native_diameter,measurements=diameter(view)
    pc=next(b for b in calibration['bursts'] if b['entry']==item['entry'])
    grade_diameters={grade:grade_data['diameter_m']*native_diameter/pc['native_diameter_m'] for grade,grade_data in GRADES.items()}
    records=[r for r in records if r['entry']!=item['entry']]
    records.append({'entry':item['entry'],'directory':str(source),'platform':'mobile','pass':report['pass'],
        'fails':[{'emitter':layer['pack'],'fails':layer['fails']} for layer in report['layers'] if not layer['pass']],
        'layers':len(report['layers']),'native_diameter_m':native_diameter,'measurements':measurements,
        'grade_diameters_m':grade_diameters,'grade_diameters_in_requested_range':all(GRADES[g]['diameter_range_m'][0]<=value<=GRADES[g]['diameter_range_m'][1] for g,value in grade_diameters.items())})
    print(json.dumps(records[-1],ensure_ascii=False),flush=True)
order={item['entry']:index for index,item in enumerate(manifest['items'])}
records.sort(key=lambda r:order[r['entry']])
(REPORT/'mobile-export-checks.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
print('Mobile replay audit finished; source packages and UE unchanged.',flush=True)
