"""生成「编排工作台 · E 组件预览」：读 tool/烟花编排工作台.html（只读），把 E主题.css / E主题.js 注入到最后一个 </body> 前，
输出 编排工作台_E组件预览.html（约 11 MB，不进 Git，随时重新生成）。

用法（仓库根目录或任意目录）：
    python -X utf8 analysis/results/20261105_编排工作台_E组件预览/生成预览.py
"""
from pathlib import Path
import hashlib
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SRC = ROOT / 'tool' / '烟花编排工作台.html'
OUT = HERE / '编排工作台_E组件预览.html'
MARK = '<!-- E组件预览 · 注入开始（analysis/results/20261105_编排工作台_E组件预览） -->'


def main() -> int:
    html = SRC.read_text(encoding='utf-8')
    if MARK in html:
        print('源文件里已经有预览注入标记，不重复注入：', SRC)
        return 1
    css = (HERE / 'E主题.css').read_text(encoding='utf-8')
    js = (HERE / 'E主题.js').read_text(encoding='utf-8')
    if '</style' in css or '</script' in js:
        print('主题文件里不能有 </style> 或 </script>')
        return 1
    at = html.rfind('</body>')
    if at < 0:
        print('没找到 </body>：', SRC)
        return 1
    block = f'{MARK}\n<style id="e-preview-theme">\n{css}\n</style>\n<script id="e-preview-script">\n{js}\n</script>\n'
    out = html[:at] + block + html[at:]
    # 标题加「E 组件预览」，免得和正式工作台混
    out = out.replace('<title>', '<title>E 组件预览 · ', 1)
    OUT.write_text(out, encoding='utf-8')
    src_sha = hashlib.sha256(html.encode('utf-8')).hexdigest()[:12]
    print(f'已生成 {OUT}（{OUT.stat().st_size / 1e6:.1f} MB）；原版 sha256 {src_sha}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
