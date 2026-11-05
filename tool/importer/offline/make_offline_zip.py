"""烟花工坊 5.0 离线包：tool/烟花工坊.html + 先读我.txt → outputs/烟花工坊5.0_离线包/（ZIP 不进 Git，现场打包）。

python -X utf8 -B tool/importer/offline/make_offline_zip.py            # 默认用 tool/烟花工坊.html
python -X utf8 -B tool/importer/offline/make_offline_zip.py --html <路径>

只读成品、不改它；打包前核对：成品里嵌着导入模块（window.FWLImporter）、不连 8034、没有本机盘符路径。
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import zipfile
from datetime import datetime

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--html', type=Path, default=REPO / 'tool' / '烟花工坊.html')
    ap.add_argument('--out', type=Path, default=REPO / 'outputs' / '烟花工坊5.0_离线包')
    a = ap.parse_args()
    html = a.html.read_bytes()
    text = html.decode('utf-8')
    problems = []
    if 'window.FWLImporter' not in text: problems.append('成品里没有导入模块（window.FWLImporter）')
    if '__mock' in text and 'engineVersion: \'mock\'' in text: problems.append('成品里嵌的是导入模块替身，不是真模块')
    if '127.0.0.1:8034' in text: problems.append('成品还在连 8034 本地服务')
    drives = sorted(set(re.findall(r"['\"`]([A-Za-z]:[\\/][^'\"`\n]{0,40})", text)))
    if drives: problems.append('成品里有本机盘符路径：' + '；'.join(drives[:5]))
    version = (re.search(r'FireWorksLab 5\.0\.\d+', text) or [None])[0]
    if problems:
        raise SystemExit('不打包：\n- ' + '\n- '.join(problems))
    a.out.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime('%Y%m%d-%H%M')
    name = f'烟花工坊_{(version or "FireWorksLab 5.0").split()[-1]}_{stamp}.zip'
    readme = (HERE / '先读我.txt').read_bytes()
    with zipfile.ZipFile(a.out / name, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('烟花工坊/烟花工坊.html', html)
        z.writestr('烟花工坊/先读我.txt', readme)
    info = {'zip': str(a.out / name), 'version': version, 'htmlBytes': len(html), 'htmlSha256': hashlib.sha256(html).hexdigest(),
            'readmeSha256': hashlib.sha256(readme).hexdigest(), 'createdAt': datetime.now().isoformat(timespec='seconds')}
    (a.out / (name[:-4] + '.json')).write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps(info, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
