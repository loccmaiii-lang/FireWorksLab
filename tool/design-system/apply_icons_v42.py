# 把 icons_v42.py 的图标写进烘焙器源码（tool/src）：#iconDefs 53 个 symbol + svg.i 的线头 / 拐角 + 样式表里的 data-URI 小图标。
# 用法：python tool/design-system/apply_icons_v42.py && python tool/build.py
import os, re, sys, urllib.parse
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
from icons_v42 import ICONS, CSS_CHEVRON, CSS_SEARCH, VB
src = os.path.join(here, '..', 'src')

def rw(path, fn):
    p = os.path.join(src, path); s = open(p, encoding='utf-8').read(); t = fn(s)
    if t != s: open(p, 'w', encoding='utf-8').write(t)
    return t != s

# 1) sprite
def sprite(s):
    n = 0
    def sub(m):
        nonlocal n
        k = m.group(1)
        if k not in ICONS: raise SystemExit(f'没画：i-{k}')
        n += 1
        return f'<symbol id="i-{k}" viewBox="{VB}">{ICONS[k]}</symbol>'
    t = re.sub(r'<symbol id="i-([^"]+)" viewBox="[^"]+">.*?</symbol>', sub, s, flags=re.S)
    print('symbols', n)
    return t
rw('body.html', sprite)

# 2) svg.i 线头和拐角
CSS_OLD = 'stroke-width:1.5;stroke-linecap:square;stroke-linejoin:miter'
CSS_NEW = 'stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round'
def svgi(s):
    return s.replace('svg.i{width:var(--ico);height:var(--ico);flex:none;fill:none;stroke:currentColor;' + CSS_OLD,
                     'svg.i{width:var(--ico);height:var(--ico);flex:none;fill:none;stroke:currentColor;' + CSS_NEW)
for f in ('style.css', 'shell/shell_fb.css'): print(f, 'svg.i', rw(f, svgi))

# 3) data-URI：下拉箭头、搜索放大镜
def enc(inner, stroke):
    svg = (f"<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='{VB}' fill='none' stroke='{stroke}' "
           f"stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'>{inner.replace(chr(34), chr(39))}</svg>")
    return 'data:image/svg+xml,' + svg.replace('<', '%3C').replace('>', '%3E').replace('#', '%23')
def datauri(s):
    pat = re.compile(r"data:image/svg\+xml,%3Csvg xmlns='http://www\.w3\.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='([^']+)' stroke-width='1\.5' stroke-linecap='square'%3E(.*?)%3C/svg%3E")
    def sub(m):
        stroke, inner = m.group(1).replace('%23', '#'), m.group(2)
        if 'circle' in inner: return enc(CSS_SEARCH, stroke)
        return enc(CSS_CHEVRON, stroke)
    t, n = pat.subn(sub, s); print('data-uri', n)
    # 参数搜索框那个 14 px 的放大镜
    t = t.replace("stroke-width='1.4'/%3E%3Cpath d='M9.4 9.4 13 13' stroke='%238da3ac' stroke-width='1.4' stroke-linecap='round'/%3E",
                  "stroke-width='1.4'/%3E%3Cpath d='M9.4 9.4 12.4 12.4' stroke='%238da3ac' stroke-width='1.4' stroke-linecap='round'/%3E")
    return t
rw('style.css', datauri)

# 4) 外壳自带的 sh-i-*（back / x / check，和 i-* 同一套）
def shell(s):
    t, n = re.subn(r'<symbol id="sh-i-([^"]+)" viewBox="[^"]+">.*?</symbol>',
                   lambda m: f'<symbol id="sh-i-{m.group(1)}" viewBox="{VB}">{ICONS[m.group(1)]}</symbol>', s, flags=re.S)
    print('shell symbols', n); return t
rw('shell/shell.html', shell)
