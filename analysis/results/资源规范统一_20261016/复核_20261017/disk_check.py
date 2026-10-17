# 只读：26 备份过的 117 个 uasset 现在磁盘上什么样（哈希 / 修改时间 / 只读位），和备份前、26 保存后比。
# 不写 UE、不碰 P4，只读文件。用法：python disk_check.py → 磁盘核对_<时间>.json
import json, hashlib, os, time, pathlib
here = pathlib.Path(__file__).resolve().parent
w = here.parent / '写入'
bk = json.load(open(w / '备份清单.json', encoding='utf8'))
saved = {x['name']: x['hash'] for x in json.load(open(w / '保存后磁盘哈希核对.json', encoding='utf8'))}
root = pathlib.Path(bk['contentRoot'])
out = {'at': time.strftime('%Y-%m-%d %H:%M:%S'), 'contentRoot': str(root), 'files': []}
for f in bk['files']:
    p = root / f['file']
    name = pathlib.Path(f['file']).stem
    rec = {'name': name, 'file': f['file']}
    if not p.exists():
        rec['exists'] = False
    else:
        b = p.read_bytes()
        st = p.stat()
        rec.update(exists=True, sha256=hashlib.sha256(b).hexdigest(), bytes=len(b),
                   mtime=time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(st.st_mtime)),
                   readonly=not os.access(p, os.W_OK))
        rec['vsBackup'] = 'same' if rec['sha256'] == f['sha256'] else 'changed'
        if name in saved:
            rec['vs26Saved'] = 'same' if rec['sha256'] == saved[name] else 'changed'
        else:
            rec['vs26Saved'] = '26未保存'
    out['files'].append(rec)
fn = here / ('磁盘核对_' + time.strftime('%Y%m%d%H%M') + '.json')
json.dump(out, open(fn, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
from collections import Counter
print(fn.name, len(out['files']))
print('vs26Saved', Counter(r.get('vs26Saved') for r in out['files']))
print('readonly', Counter(r.get('readonly') for r in out['files']))
for r in out['files']:
    if r.get('vs26Saved') not in ('same',):
        print(' ', r['name'], r.get('vsBackup'), r.get('vs26Saved'), r.get('mtime'), 'ro' if r.get('readonly') else 'rw')
