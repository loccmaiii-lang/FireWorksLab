"""构建129完整组合Demo；保留128来源与用户原始选择，不写生产。"""
from pathlib import Path
import hashlib
import json
import sys

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
sys.path.insert(0, str(HERE))
from bundle_sources import build_workspaces
from catalog_samples import build_catalog, build_combo_theme


def main():
    catalog = json.loads((HERE / 'catalog.json').read_text(encoding='utf-8'))
    profile = json.loads((HERE / 'appearance-profile.json').read_text(encoding='utf-8'))
    original = ROOT / 'analysis/results/20261029_组件风格选择/FWL-组件选择-128.json'
    if hashlib.sha256(original.read_bytes()).hexdigest() != profile['selectionSha256']:
        raise RuntimeError('用户原始选择已变化，停止构建，不覆盖决定')
    if profile['record'] != json.loads(original.read_text(encoding='utf-8')):
        raise RuntimeError('129 profile与原始选择不同')
    (HERE / 'combo-theme.css').write_text(build_combo_theme(ROOT), encoding='utf-8', newline='\n')
    workspaces = build_workspaces(ROOT, HERE / '128-right.snapshot.html')
    samples = build_catalog(ROOT, catalog['items'])
    if set(samples) != {item['id'] for item in catalog['items']}:
        raise RuntimeError('组件目录与样本数量不一致，停止交付')
    if any(not sample.get('sceneApplicable') or not all(sample.get('overrideCSS', {}).values()) for sample in samples.values()):
        raise RuntimeError('129仍有缺失映射；不能用完成计数代替实现')
    manifest = {
        'format': 'fwl.component-picker.sources/1',
        'baseline': '4.9.128',
        'comboVersion': '129',
        'workspaces': workspaces['manifest'],
        'catalog': catalog.get('source_head'),
        'componentCount': len(samples),
        'selectionSha256': profile['selectionSha256'],
        'accentOverrides': profile['accentOverrides'],
        'comboSources': {name: hashlib.sha256((HERE / name).read_bytes()).hexdigest()
                         for name in ['appearance-profile.json', 'combo-theme.css', 'combo-adapter.js', 'catalog_samples.py', 'bundle_sources.py', 'picker.js']},
        'baker128Sha256': hashlib.sha256((ROOT / 'tool/FireworkBaker_MaterialB.html').read_bytes()).hexdigest(),
        'thirdPartyNotices': [{'name': 'Tabler Icons 3.46.0', 'license': 'MIT',
                               'text': (ROOT / 'tool/src/material-b-icons/LICENSE').read_text(encoding='utf-8')}],
        'boundary': '129组件组合Demo；14族真实控件映射，左原B/右128来源；不执行正式保存/烘焙/素材导出/UE',
    }
    payload = {'catalog': catalog, 'samples': samples,
               'workspaces': {'b': workspaces['b'], 'mb128': workspaces['mb128']},
               'manifest': manifest, 'profile': profile,
               'initialRecord': profile['record'], 'preferEmbeddedRecord': False}
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
