"""冻结最新独立 Demo，并仅注入视觉层和草稿专属存储键。"""
from pathlib import Path
import hashlib
import json
import re

here = Path(__file__).resolve().parent
source = here.parent / 'v1' / 'demo.html'
raw = source.read_bytes()
html = raw.decode('utf-8')
assert html.count('</style>') == 1
assert html.count("const DEMO_KEY='fwl.ui-demo.v1';") == 1
html = html.replace("const DEMO_KEY='fwl.ui-demo.v1';", "const DEMO_KEY='fwl.ui-demo.visual-exploration.20261029';")
injection = '\n'.join([
    '<link rel="stylesheet" href="common.css">',
    '<link rel="stylesheet" href="graphite.css">',
    '<link rel="stylesheet" href="porcelain.css">',
    '<link rel="stylesheet" href="indigo.css">',
    '<script src="visual.js" defer></script>',
])
html = html.replace('</style>', '</style>\n' + injection, 1)
html = html.replace('<body class="fw-scope demo-shell" data-density="regular">', '<body class="fw-scope demo-shell" data-density="regular"><script src="visual-init.js"></script>', 1)
(here / 'preview.html').write_text(html, encoding='utf-8', newline='\n')
files = ['demo.html', 'draft.js', 'draft.css', 'screen.html', 'guide.html', 'specifications.json']
manifest = {
    'source': '独立工作树 tool/design-system/drafts/v1；组件候选提交3034f812，最新demo.html为用户本机后续草稿',
    'demo_sha256': hashlib.sha256(raw).hexdigest(),
    'source_files': {name: hashlib.sha256((source.parent/name).read_bytes()).hexdigest() for name in files},
    'changes': ['插入4个独立CSS和视觉适配/首帧初始化脚本', '仅替换Demo专属浏览器存储key，避免触碰原Demo存档'],
    'unchanged': ['内嵌图像', '原始控制器全部业务交互', '七页布局、密度尺寸及响应式断点'],
}
(here / 'source-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
print('已生成独立预览，源 SHA256：' + manifest['demo_sha256'])
