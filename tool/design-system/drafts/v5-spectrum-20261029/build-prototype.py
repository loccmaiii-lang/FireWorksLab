"""从保留的v3生成Spectrum视觉变体；不写原稿和生产文件。"""
from pathlib import Path
import hashlib
import json
import re

HERE = Path(__file__).resolve().parent
BASE = HERE.parent / 'v3-unified'

def write(name, text):
    (HERE / name).write_bytes(text.replace('\r\n', '\n').encode('utf-8'))

html = (BASE / 'components.html').read_text(encoding='utf-8')
for f in ['candidate-tokens.css', 'candidate-components.css', 'catalog.css', 'component-kit.js', 'catalog.js']:
    html = html.replace(f'="{f}"', f'="../v3-unified/{f}"')
html = html.replace('data-density="regular"', 'data-density="regular" data-design="spectrum"', 1)
html = html.replace('</head>', '<link rel="stylesheet" href="spectrum-tokens.css"><link rel="stylesheet" href="spectrum-components.css"></head>')
html = html.replace('统一候选 v3 · 待审', 'Spectrum取向 · 待审')
html = html.replace('统一控件状态样板', 'Spectrum取向 · 八类组件样板')
html = html.replace('Material参考角色、层级和通用交互，具体尺寸为项目候选。', 'Spectrum取向调整动作强调、输入层级和面板选中语言；不是官方组件包。')
html = html.replace('主要动作以深绿底和青绿边强调；不靠放大或装饰阴影。', '薄荷主动作与中性工具动作分层；不靠放大或装饰阴影。')
html = html.replace('黄色左边线表达已修改', '黄色细内标记表达已修改')
html = html.replace('虚线边框表示只读，值可选择与复制。', '只读使用较弱边界，值仍可聚焦、选择与复制。')
html = html.replace('常规40px、紧凑32px，同时继承字阶、行高、间距。', '常规40px、紧凑32px；两档保留14px正文和13px字段标签，只收紧间距。')
html = html.replace('href="../v1/demo.html">查看上一版 Demo', 'href="../v3-unified/components.html">保留的 Material 样板')
html = html.replace('</nav>\n    <div class="catalog-density"', '<a href="../v3-unified/components.html">Material原版</a></nav>\n    <div class="catalog-density"', 1)
write('components.html', html)

demo = (BASE / 'demo.html').read_text(encoding='utf-8')
for f in ['candidate-tokens.css', 'candidate-components.css', 'workspace.css', 'component-kit.js', 'workspace-adapter.js']:
    demo = demo.replace(f'="{f}"', f'="../v3-unified/{f}"')
demo = demo.replace('fwl.ui-demo.v3-unified', 'fwl.ui-demo.v5-spectrum')
# 重置示例值保留当前页，避免标签/标题回到初始页但URL仍指向当前页。
demo = demo.replace('demoApply(demo.initial,true);', 'const resetPage=state.page;demoApply(demo.initial,true);state.page=resetPage;', 1)
# 新稿修正：改变导入设置后同步重绘核对摘要，避免旧“检查结束”与失效提示并存。
demo = demo.replace(
    "setTimeout(()=>{demoCommit();demoRefresh();});}\n    if(el.dataset.linked",
    "setTimeout(()=>{demoCommit();demoRefresh();if(state.page==='importer')render();});}\n    if(el.dataset.linked",
    1,
)
demo = demo.replace('data-density="regular"', 'data-density="regular" data-design="spectrum"', 1)
demo = re.sub(r'<title>.*?</title>', '<title>FireWorksLab · Spectrum取向组件Demo</title>', demo, count=1)
demo = demo.replace('href="index.html">统一候选 v3', 'href="index.html">Spectrum候选')
demo = demo.replace('规范适配 · 独立示例', 'Spectrum取向 · 独立示例')
demo = demo.replace('</head>', '<link rel="stylesheet" href="spectrum-tokens.css"><link rel="stylesheet" href="spectrum-components.css"></head>')
demo = demo.replace('<span class="demo-description">', '<a class="spectrum-material-peer" href="../v3-unified/demo.html">Material原版</a><span class="demo-description">', 1)
write('demo.html', demo)

manifest = {
    'base': 'v3-unified, Material/WAI project-adapted candidate',
    'variant': 'Spectrum-oriented FireWorksLab candidate, not official Spectrum package',
    'sameBehaviourFiles': ['../v3-unified/component-kit.js', '../v3-unified/workspace-adapter.js', '../v3-unified/catalog.js'],
    'storage': 'fwl.ui-demo.v5-spectrum',
    'productionCalls': False,
    'preview': 'v3 static example imagery; not the v4 real-kernel workflow',
    'variantBehaviourFixes': ['Importer setting change refreshes stale review summary; confirmation invalidation semantics unchanged', 'Reset example values preserves current page and URL agreement'],
    'baseHashes': {name: hashlib.sha256((BASE / name).read_bytes()).hexdigest() for name in ['components.html', 'demo.html', 'candidate-tokens.css', 'candidate-components.css', 'component-kit.js', 'workspace-adapter.js', 'catalog.js']},
    'generatedHashes': {name: hashlib.sha256((HERE / name).read_bytes()).hexdigest() for name in ['components.html', 'demo.html']}
}
write('build-manifest.json', json.dumps(manifest, ensure_ascii=False, indent=2))
print('generated components.html and demo.html; Material source unchanged')
