"""从完整128成品和用户已确认的129组件规则构建独立完整入口。

运行：python -X utf8 tool/design-system/selected129/build.py
旧入口、tool/src和共享设计令牌不写入。内嵌数据，成品可独立复制。
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
DEMO = ROOT / 'tool/design-system/drafts/v8-combo-129-20261029'
BASE = ROOT / 'tool/FireworkBaker_MaterialB.html'
OUTPUT = HERE / 'FireworkBaker_129.html'
FILE_ENTRY = ROOT / 'tool/FireworkBaker_129.html'
VERSION = '4.9.129'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def build():
    spec = importlib.util.spec_from_file_location('selected129_catalog', DEMO / 'catalog_samples.py')
    catalog = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(catalog)
    profile = json.loads((DEMO / 'appearance-profile.json').read_text(encoding='utf-8'))
    selected = {c['id']: c['selected'] for c in profile['record']['components']}
    expected = dict.fromkeys(['C01', 'C05', 'C06', 'C07', 'C08', 'C09'], 'material')
    expected.update(dict.fromkeys(['C02', 'C03', 'C04', 'C11', 'C12', 'C16', 'TREE', 'COLOR'], 'adobe'))
    assert selected == expected, '选型改变须重新核对，不静默构建另一套外观'
    assert profile['accentOverrides'] == {'C03': 'theme', 'C04': 'theme', 'C11': 'theme'}
    html = BASE.read_text(encoding='utf-8')
    base_version = re.findall(r"const VERSION = '([^']+)';", html)
    assert base_version == ['4.9.128'], '只对已核验完整128构建，升级基底前应重新审查'
    # 相同选择单源：不复制Demo控制器，不把候选样板或只读参数接入真实工具。
    theme = catalog.build_combo_theme(ROOT).replace('body[data-ui="material-b"]', 'body[data-ui="material-b"][data-component-profile="129"]')
    # 原Demo仅包含参数分组；完整工具的预览/平台/贴图分段也消费C08同一规则。
    theme = theme.replace('.mb-tabs,#mbInspectModes', '.mb-tabs,#mbInspectModes,.seg')
    # 整体页的每层颜色与单层编辑页复用同一个stageEditor。
    theme = theme.replace('#colorControls .stage-row', '#right .stage-row')
    theme += '\n' + (HERE / 'real-controls.css').read_text(encoding='utf-8')
    assert 'border-radius:0' in theme and '/* TREE · adobe */' in theme
    html = html.replace('</head>', '<style id="selected129-theme">\n' + theme + '\n</style>\n</head>', 1)
    # HTTP镜像在已授权design-system路由下。相对视频/素材路径仍按旧tool根解析；
    # 本地正式文件放在旧入口旁边，location.href解析的本机导入器路径也保持原样。
    base_script = """<script id="selected129-base">
if (/\\/design-system\\/selected129\\//.test(location.pathname)) {
  const entryBase = document.createElement('base'); entryBase.href = '../../'; document.head.appendChild(entryBase);
}
</script>
"""
    html = html.replace('</head>', base_script + '</head>', 1)
    html = html.replace('<body data-ui="material-b">', '<body data-ui="material-b" data-component-profile="129">', 1)
    html = re.sub(r'<title>[^<]+</title>', '<title>烟花烘焙器 4.9.129 · 我的组件组合</title>', html, count=1)
    html = html.replace("const VERSION = '4.9.128';", "const VERSION = '4.9.129';", 1)
    # 现有lint按外链data声明识别全局名；在内嵌前检查同一主脚本。
    # 数据是含历史字段的归档，不把其字段当成已经删除的运行时代码。
    with tempfile.TemporaryDirectory(prefix='fwl129-lint-') as tmp:
        check_html = Path(tmp) / 'full129.html'
        check_html.write_text(html, encoding='utf-8')
        result = subprocess.run(['node', '--expose-internals', str(ROOT / 'tool/lint/js_lint.mjs'), str(check_html)],
                                cwd=ROOT, capture_output=True, encoding='utf-8')
        print(result.stdout)
        if result.returncode:
            print(result.stderr)
            raise SystemExit(result.returncode)
    checked_main = re.search(r"<script>\n'use strict';\n([\s\S]*)</script>\s*</body>", html).group(1)
    # 全部数据保留独立script边界及原执行顺序，成品不再请求data目录。
    sources = {}
    for name in ['review', 'standard', 'thumbs', 'size_spec']:
        rel = 'data/' + name + '.js'
        marker = '<script src="' + rel + '"></script>'
        assert html.count(marker) == 1, '128数据入口变化：' + rel
        path = ROOT / 'tool' / rel
        data = path.read_text(encoding='utf-8')
        assert '</script' not in data.lower(), '数据需要安全转义：' + rel
        subprocess.run(['node', '--check', str(path)], check=True, capture_output=True)
        html = html.replace(marker, '<script data-embedded="' + rel + '">\n' + data + '\n</script>', 1)
        sources['tool/' + rel] = sha(path.read_bytes())
    summary = {'version': VERSION, 'baseVersion': base_version[0], 'components': profile['record']['components'],
               'accentOverrides': profile['accentOverrides'], 'treeSelection': 'straight', 'runtime': 'full-baker'}
    summary_json = json.dumps(summary, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    adapter = (HERE / 'real-controls.js').read_text(encoding='utf-8')
    subprocess.run(['node', '--check', str(HERE/'real-controls.js')], check=True, capture_output=True)
    html = html.replace("<script>\n'use strict';", '<script id="selected129-profile" type="application/json">' + summary_json + '</script>\n<script id="selected129-controls">\n' + adapter + "\n</script>\n<script>\n'use strict';", 1)
    assert re.search(r"<script>\n'use strict';\n([\s\S]*)</script>\s*</body>", html).group(1) == checked_main
    OUTPUT.write_text(html, encoding='utf-8', newline='\n')
    FILE_ENTRY.write_text(html, encoding='utf-8', newline='\n')
    sources.update({str(p.relative_to(ROOT)).replace('\\', '/'): sha(p.read_bytes()) for p in
                    [BASE, DEMO / 'appearance-profile.json', DEMO / 'catalog_samples.py', HERE / 'real-controls.css', HERE / 'real-controls.js']})
    manifest = {'version': VERSION, 'baseVersion': base_version[0], 'sourceFiles': sources,
                'components': selected, 'accentOverrides': profile['accentOverrides'], 'treeSelection': 'straight',
                'output': str(FILE_ENTRY.relative_to(ROOT)), 'httpMirror': str(OUTPUT.relative_to(ROOT)),
                'sha256': sha(OUTPUT.read_bytes()), 'bytes': OUTPUT.stat().st_size}
    (HERE / 'build-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'完整 {VERSION}: {OUTPUT} ({manifest["bytes"]} bytes; 14类/3绿色/纯直线)')


if __name__ == '__main__':
    build()
