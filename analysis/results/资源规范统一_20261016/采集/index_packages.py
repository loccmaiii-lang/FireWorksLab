# 只读索引本机导出根目录里的烘焙器素材包（cascade.json / cascade_mobile.json），用来认「哪些粒子系统是烘焙器出的」。
import json, glob, os

ROOT = 'D:/ProjectTextures/FireWorksLab'
out = []
for f in glob.glob(ROOT + '/**/cascade*.json', recursive=True):
    try:
        d = json.load(open(f, encoding='utf-8'))
    except Exception:
        continue
    if d.get('format') != 'fwl.cascade/1':
        continue
    nm = d.get('naming') or {}
    out.append({'file': f.replace('\\', '/')[len(ROOT) + 1:], 'name': d.get('name'), 'system': nm.get('system'),
                'base': nm.get('base'), 'platform': d.get('platform'), 'tier': d.get('tier'),
                'tool': (d.get('source') or {}).get('tool'), 'mtime': os.path.getmtime(f),
                'emitters': [{'name': e.get('name'), 'align': (e.get('required') or {}).get('screen_alignment'),
                              'gpu': e.get('gpu'), 'material': e.get('material')} for e in d.get('emitters', [])]})
json.dump({'root': ROOT, 'count': len(out), 'packages': out}, open('baker_packages.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(out))
