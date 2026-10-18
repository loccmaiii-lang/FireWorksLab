"""检查独立金芒菊PC/手机实包；保留原参数、分段回放与资源预算证据。"""
from pathlib import Path
import json, zipfile, shutil, sys, importlib, hashlib
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/GoldRayBurst';B=R/'analysis/local/GoldRayBurst/pack'
sys.path.insert(0,str(R/'analysis/scripts'));rc=importlib.import_module('回放检查')
B.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(O/'GoldRay_Burst.zip') as z:
    for name in z.namelist(): assert (B/name).resolve().is_relative_to(B.resolve())
    z.extractall(B)
report={'sha256':hashlib.sha256((O/'GoldRay_Burst.zip').read_bytes()).hexdigest(),'platforms':{}}
for platform,cfg in [('PC','cascade.json'),('手机','cascade_mobile.json')]:
    d=json.loads((B/cfg).read_text(encoding='utf-8'));view=B
    if platform=='手机':
        view=B/'mobile';view.mkdir(exist_ok=True);shutil.copy2(B/cfg,view/'cascade.json')
        for t in d['textures'].values(): shutil.copy2(B/t['file'],view/t['file'])
    packs=[rc.Pack(str(view),i) for i in range(len(d['emitters']))]
    result=rc.check(packs,str(O/(platform+'-实包回放.jpg')),times_s=[.0333,.1,.25,.5,1,1.7,2.23,2.2667,2.3,2.5,3.3,4.2,4.6])
    main={d['textures'][m['textures']['main']]['file'] for m in d['materials'].values() if 'main' in m.get('textures',{})}
    events=[]
    for e,p in zip(d['emitters'],packs):
        assert min(p.cw,p.chh)>=(512 if platform=='PC' else 256)
        delay=p.delay;events.extend([(delay,1),(delay+p.life,-1)])
    # 同刻交接先结束前段，再开始后段；不把顺序的两段算成重叠。
    alive=peak=0
    for _,delta in sorted(events): alive+=delta;peak=max(peak,alive)
    assert peak==1,events
    assert len(main)==2,main
    for t in d['textures'].values(): assert not t.get('never_stream') and not t.get('NeverStream')
    if platform=='手机':
        from PIL import Image
        for f in main: assert max(Image.open(view/f).size)<=1024
    report['platforms'][platform]={'pass':result['pass'],'mainTextures':sorted(main),'sequenceEmitters':len(packs),'peakVisibleQuads':peak,'cells':[[p.cw,p.chh] for p in packs],'frames':[p.frames for p in packs],'checks':result}
(O/'实包检查.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:{q:v for q,v in p.items() if q!='checks'} for k,p in report['platforms'].items()},ensure_ascii=False,indent=2))
raise SystemExit(0 if all(p['pass'] for p in report['platforms'].values()) else 1)
