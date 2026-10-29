"""构建唯一的离线HTML选型交付；所有原稿/生产来源只读。"""
from pathlib import Path
import hashlib
import json
import sys

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
sys.path.insert(0, str(HERE))
from bundle_sources import build_workspaces
from catalog_samples import build_catalog


def main():
    catalog = json.loads((HERE / 'catalog.json').read_text(encoding='utf-8'))
    workspaces = build_workspaces(ROOT, HERE / '128-right.snapshot.html')
    samples = build_catalog(ROOT, catalog['items'])
    if set(samples) != {item['id'] for item in catalog['items']}:
        raise RuntimeError('组件目录与样本数量不一致，停止交付')
    manifest = {
        'format': 'fwl.component-picker.sources/1',
        'baseline': '4.9.128',
        'workspaces': workspaces['manifest'],
        'catalog': catalog.get('source_head'),
        'componentCount': len(samples),
        'baker128Sha256': hashlib.sha256((ROOT / 'tool/FireworkBaker_MaterialB.html').read_bytes()).hexdigest(),
        'thirdPartyNotices': [{'name': 'Tabler Icons 3.46.0', 'license': 'MIT',
                               'text': (ROOT / 'tool/src/material-b-icons/LICENSE').read_text(encoding='utf-8')}],
        'boundary': '组件选型副本；左静态参考+原参数交互，右原DOM控件样本；不执行正式保存/烘焙/素材导出/UE',
    }
    payload = {'catalog': catalog, 'samples': samples,
               'workspaces': {'b': workspaces['b'], 'mb128': workspaces['mb128']},
               'manifest': manifest, 'initialRecord': None}
    template = (HERE / 'shell.html').read_text(encoding='utf-8')
    output = template.replace('__STYLE__', (HERE / 'picker.css').read_text(encoding='utf-8'))
    output = output.replace('__DATA__', json.dumps(payload, ensure_ascii=False, separators=(',', ':')).replace('<', r'\u003c'))
    output = output.replace('__SCRIPT__', (HERE / 'picker.js').read_text(encoding='utf-8'))
    (HERE / 'index.html').write_text(output, encoding='utf-8', newline='\n')
    (HERE / 'source-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
    print(json.dumps({'file': str(HERE / 'index.html'), 'bytes': len(output.encode()),
                      'sha256': hashlib.sha256(output.encode()).hexdigest(), 'families': len(samples)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
