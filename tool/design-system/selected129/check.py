"""完整129的构建契约与既有组件回归；真烘焙/下载另由实页验证。

python -X utf8 tool/design-system/selected129/check.py [--runtime]
运行时沿用仓库隔离上下文，不连接用户浏览器，不动个人存档。
"""
from pathlib import Path
import argparse
import asyncio
import hashlib
import importlib.util
import json
import re
import subprocess
import sys

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / 'analysis/scripts'))
from browser_runtime import launch_async, validation_url, verify_validation_source

URL = 'http://127.0.0.1:8034/design-system/selected129/FireworkBaker_129.html?autobake=0'
OUT = ROOT / 'analysis/local/20261104_完整129/自动检查.json'


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def static_checks():
    base = (ROOT / 'tool/FireworkBaker_MaterialB.html').read_text(encoding='utf-8')
    html = (HERE / 'FireworkBaker_129.html').read_text(encoding='utf-8')
    assert (HERE/'FireworkBaker_129.html').read_bytes() == (ROOT/'tool/FireworkBaker_129.html').read_bytes(), '本地入口与HTTP镜像不一致'
    main = lambda text: re.search(r"<script>\n'use strict';\n([\s\S]*)</script>\s*</body>", text).group(1)
    assert main(html).replace("const VERSION = '4.9.129';", "const VERSION = '4.9.128';", 1) == main(base), '业务代码不一致'
    original = json.loads((ROOT / 'analysis/results/20261029_组件风格选择/FWL-组件选择-128.json').read_text(encoding='utf-8'))
    profile = json.loads(re.search(r'<script id="selected129-profile" type="application/json">(.*?)</script>', html).group(1))
    assert profile['components'] == original['components'], '未精确保留用户选择与备注'
    assert profile['accentOverrides'] == dict.fromkeys(['C03','C04','C11'], 'theme')
    assert len(profile['components']) == 14
    for name in ['review','standard','thumbs','size_spec']:
        content = re.search(r'<script data-embedded="data/' + name + r'\.js">\n([\s\S]*?)\n</script>',html).group(1)
        assert content == (ROOT / 'tool/data' / (name+'.js')).read_text(encoding='utf-8')
    assert not re.search(r'<script[^>]+src=',html), '成品还依赖外部脚本'
    assert '<div id="combo-lab"' not in html and 'combo-adapter.js' not in html
    protected_file = ROOT / 'analysis/local/20261104_完整129/保护起点.json'
    protection = {'checked': False}
    if protected_file.exists():
        protected = json.loads(protected_file.read_text(encoding='utf-8'))
        changed = [p for p,h in protected.items() if not (ROOT/p).exists() or sha(ROOT/p)!=h]
        assert not changed, '旧入口/源文件/他方文件改变：'+str(changed)
        protection = {'checked': True, 'files': len(protected), 'changed': changed}
    return {'pass': True, 'version': profile['version'], 'families': len(profile['components']),
            'businessIdenticalExceptVersion': True, 'fourDataScriptsExact': True, 'externalScripts': 0,
            'selectionAndNotesExact': True, 'protection': protection, 'sha256': sha(HERE/'FireworkBaker_129.html')}


async def runtime():
    subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tool/local_http/preflight.py'),'--tool','baker'],cwd=ROOT,check=True)
    spec = importlib.util.spec_from_file_location('original_component_checks', ROOT / 'analysis/scripts/MaterialB组件检查.py')
    checks = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(checks)
    checks.base.HTML = validation_url(URL)
    verify_validation_source(checks.base.HTML, HERE/'FireworkBaker_129.html')
    from playwright.async_api import async_playwright
    cases = []
    async with async_playwright() as p:
        browser = await launch_async(p)
        try:
            for kind in ['普通Schema','层头出生联动','RT6','SGR1','SGS1','跨区域外壳']:
                try:
                    result = await checks.run_case(p,browser,kind,'4.9.129')
                except Exception as error:
                    result = {'case':kind,'pass':False,'exception':str(error)}
                cases.append(result)
                print(json.dumps({'case':kind,'pass':result['pass'],'failed':[c['name'] for c in result.get('checks',[]) if not c['pass']], 'exception':result.get('exception')},ensure_ascii=False),flush=True)
        finally:
            await browser.close()
    return {'pass':all(c['pass'] for c in cases), 'cases':cases,
            'boundary':'既有隔离FAKE/停RAF的真实DOM分类/几何；不用于证明真烘焙。真业务由实页操作与下载验证。'}


if __name__ == '__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--runtime',action='store_true');args=ap.parse_args()
    result={'static':static_checks()}
    if args.runtime: result['runtime']=asyncio.run(runtime())
    result['pass']=all(v['pass'] for v in result.values())
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'pass':result['pass'],'out':str(OUT)},ensure_ascii=False))
    sys.exit(0 if result['pass'] else 1)
