"""E 样板 v3.5 制作区走查（v3.5 起加 v35 一节；和 v3.4、v3.5 决定冲突的旧检查都改写成新规则，见说明「v3.4 改动」「v3.5 改动」）：规范 v3 第 0–12 节的硬指标（和 v3.1 改动单冲突的按改动单改过）+ 改动单 21 条里归制作区的各条（v3.1-n） + 交互走查过的全部行为（宪章 0.9、走查 P1–P7、只看、撤销提示条、
Esc 取消、需重新导出、保存、导出、时间轴、检查器、结构树、效果库、贴图与交付）。每条打印「通过 / 失败」。

先合成：python3 ../build.py /tmp/E_A.html
再走查：python3 check_main.py [/tmp/E_A.html]
一次只开一个浏览器进程，页面按顺序开关；外网请求一律拦截。检查名前缀是规范节号（§n）、改动单编号（v3.1-n … v3.5-n）或走查编号（P、Q、W）。
--only=spec,v31,inter,v33,v34,v35 只跑某几节。
"""
import io
import re
import sys
from pathlib import Path

from PIL import Image

from playwright.sync_api import sync_playwright

ARGS = [a for a in sys.argv[1:] if a.endswith('.html')]
URL = Path(ARGS[0] if ARGS else '/tmp/E_A.html').resolve().as_uri()
SRC = Path(__file__).resolve().parent.parent
OK, BAD, ERR = [], [], []
MINT, AMBER, LINE = 'rgb(0, 212, 155)', 'rgb(224, 178, 90)', 'rgb(43, 65, 73)'
T1, T2, T3 = 'rgb(228, 237, 239)', 'rgb(180, 197, 203)', 'rgb(141, 163, 172)'
G2, G3, G7 = 'rgb(22, 36, 42)', 'rgb(27, 42, 47)', 'rgb(141, 163, 172)'


# v3.5 第 1 条：把每个 symbol 单独画到 128 × 128 的画布上（8 倍），量墨迹外框（16 px 坐标）
INK_JS = r"""async () => {
  const S = 8, out = {};
  for (const s of document.querySelectorAll('#iconDefs symbol')) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${16*S}" height="${16*S}" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter">${s.innerHTML.replace(/currentColor/g, '#000')}</svg>`;
    const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await im.decode();
    const c = document.createElement('canvas'); c.width = c.height = 16*S; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, 16*S, 16*S).data; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < 16*S; y++) for (let x = 0; x < 16*S; x++) if (d[(y*16*S + x)*4 + 3] > 127) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    out[s.id] = [x0/S, y0/S, (x1+1)/S, (y1+1)/S];
  }
  return out; }"""


def check(name, cond, info=''):
    if cond:
        OK.append(name); print('通过  ' + name)
    else:
        BAD.append(name); print('失败  ' + name + (f'  （{info}）' if info != '' else ''))


def new_page(b, w=1920, h=1080, clock=False):
    pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
    pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith(('file:', 'data:')) else r.abort())
    pg.on('pageerror', lambda e: ERR.append(str(e)))
    if clock:
        pg.clock.install()
    pg.goto(URL, wait_until='load')
    pg.add_style_tag(content='#sampleBar{display:none!important}')
    pg.evaluate(DOT_JS)
    pg.wait_for_timeout(300)
    if w == 1366:
        pg.evaluate("KIT.set('size','1366')")
        pg.wait_for_timeout(200)
    return pg


def cr(a, b):
    """WCAG 对比度：a、b 是 rgb(...) 字符串"""
    def L(c):
        v = [int(t) / 255 for t in re.findall(r'\d+', c)[:3]]
        v = [t / 12.92 if t <= 0.03928 else ((t + 0.055) / 1.055) ** 2.4 for t in v]
        return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
    la, lb = L(a), L(b)
    return (max(la, lb) + .05) / (min(la, lb) + .05)


# v3.6 第 14 条：效果库缩略图——是否已按外接框裁切、统一曝光（data-fit），以及现在这张图亮部（亮于最亮处 25 %）的 98 % 分位（取 RGB 最亮的通道）
THUMB_JS = """(() => [...document.querySelectorAll('#libList .lib-item .th img')].map(img => { const N = img.naturalWidth || 64, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); g.drawImage(img, 0, 0, N, N);
  const d = g.getImageData(0, 0, N, N).data, L = []; let m = 0; for (let i = 0; i < d.length; i += 4) { const v = Math.max(d[i], d[i + 1], d[i + 2]); L.push(v); m = Math.max(m, v); }
  const lit = L.filter(v => v >= m * .25).sort((a, b) => a - b); return {k: img.closest('.lib-item').dataset.lib, fit: img.dataset.fit === '1', p98: Math.round(lit[Math.floor((lit.length - 1) * .98)] || 0)}; }))()"""


# v3.6 第 1 条：导出范围一行和时间轴网格的对齐（1920：行名起线 312、刻度 0 s 468、末端 1442）
IO_JS = """(() => { const q = s => document.querySelector(s), R = e => e.getBoundingClientRect(), io = q('#tlw .iorow'), xv = R(q('#tlw .iorow .xv')), bs = [...q('#tlw .iorow .io-range').querySelectorAll('.btn-icon')].map(R), op = R(q('#tlw .iorow .io-opts'));
  const fr = R(q('#tlw .rrow .fr')), trk = q('#tlw .tlrow .lab'), cs = getComputedStyle(trk), lab = q('#tlw .iorow .io-name');
  return {k: Math.round(R(q('#tlw .iorow .io-k')).left), trk: Math.round(R(trk).left + parseFloat(cs.paddingLeft)), kIn: R(q('#tlw .iorow .io-k')).right <= R(lab).right && Math.round(R(lab).width) === Math.round(R(trk).width),
    xv: Math.round(xv.left), fr0: Math.round(fr.left), fr1: Math.round(fr.right), bgap: [Math.round(bs[0].left - xv.right), ...bs.slice(1).map((r, i) => Math.round(r.left - bs[i].right))],
    opR: Math.round([...q('#tlw .iorow .io-opts').querySelectorAll('.io-ck span')].pop().getBoundingClientRect().right), opGap: Math.round(op.left - bs[bs.length - 1].right), tools: Math.round(R(q('#transport .tools')).right)}; })()"""


DOT_JS = """window.__dot = e => { const c = getComputedStyle(e), r = e.getBoundingClientRect(), t = (e.value ?? e.textContent).trim();
  const right = r.right - parseFloat(c.borderRightWidth) - parseFloat(c.paddingRight), i = t.indexOf('.');
  if (i < 0) return right;
  const pr = document.createElement('span'); pr.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-family:${c.fontFamily};font-size:${c.fontSize};font-weight:${c.fontWeight};font-variant-numeric:tabular-nums`;
  document.body.appendChild(pr); pr.textContent = t.slice(i); const w = pr.getBoundingClientRect().width; pr.remove(); return right - w; };
window.__vis = e => !!e.offsetParent && getComputedStyle(e).visibility !== 'hidden'; void 0;"""


class P:
    """页面上的小工具：E 取值、T 文字、R 矩形、V 可见、C 计算样式"""
    def __init__(self, pg): self.pg = pg
    def E(self, js, arg=None): return self.pg.evaluate(js, arg) if arg is not None else self.pg.evaluate(js)
    def T(self, sel): return self.E("s => { const e = document.querySelector(s); if (!e) return null; const w = n => n.nodeType === 3 ? n.textContent : n.nodeName === 'INPUT' ? n.value : [...n.childNodes].map(w).join(n.nodeType === 1 && getComputedStyle(n).display.includes('flex') ? ' ' : ''); return w(e).replace(/\\s+/g, ' ').trim() }", sel)
    def R(self, sel): return self.E("s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom, r.width, r.height] }", sel)
    def V(self, sel): return self.E("s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none' }", sel)
    def C(self, sel, prop): return self.E("([s, p]) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[p] : null }", [sel, prop])
    def N(self, sel): return self.E("s => document.querySelectorAll(s).length", sel)
    def key(self, k): self.pg.keyboard.press(k); self.pg.wait_for_timeout(60)
    def click(self, sel, **kw): self.pg.locator(sel).first.click(**kw); self.pg.wait_for_timeout(80)
    def hover(self, sel): self.pg.locator(sel).first.hover(); self.pg.wait_for_timeout(650)
    def tip(self): return self.T('#ovlApp .tip:not(.hint)')
    def err(self): return self.T('#ovlApp .tip.err')
    def toast(self): return self.T('#ovlApp .toast > span')
    def val(self, lab): return self.E("l => { const r = [...document.querySelectorAll('#pbody .prm[data-lab]')].find(x => x.dataset.lab === l); if (!r) return null; const n = r.querySelector('.num'); return n ? n.value : null }", lab)
    def row(self, lab): return f'#pbody .prm[data-lab="{lab}"]'


def spec_static(b):
    """§0–§12 的硬指标（1920）"""
    pg = new_page(b); x = P(pg)
    # §0 / §3 面与线
    check('§0.6 栏与栏之间不是 4 px 缝：制作区三栏 column-gap 为 0', x.C('#wsBaker', 'columnGap') in ('normal', '0px'))
    check('§0.6 画面和时间轴之间是 1 px 的线', x.R('#vsplit')[5] == 1 and x.C('#vsplit', 'backgroundColor') == LINE)
    check('§0.6 结构树和效果库之间是 1 px 的线', x.R('#splitter')[5] == 1 and x.C('#splitter', 'backgroundColor') == LINE)
    check('§3 左栏右边、检查器左边各一条 1 px 线', LINE in x.C('#left', 'boxShadow') and LINE in x.C('#insp', 'boxShadow'))
    check('§3 工具行底边一条线', LINE in x.C('#toolRow', 'boxShadow'))
    check('§3 检查器模块之间 1 px 线，标题没有底色条', x.E("(() => { const m = [...document.querySelectorAll('#pbody .mod + .mod')]; return m.length > 2 && m.every(e => getComputedStyle(e).borderTopWidth === '1px' && getComputedStyle(e).borderTopColor === 'rgb(43, 65, 73)') && [...document.querySelectorAll('#pbody .mod-h')].every(h => getComputedStyle(h).backgroundColor === 'rgba(0, 0, 0, 0)') })()"))
    check('§3 面四级：画面 #0c1518、面板 #111d21、工具行 #16242a、浮层 #24373d', x.C('#stage', 'backgroundColor') == 'rgb(12, 21, 24)' and x.C('#insp', 'backgroundColor') in ('rgba(0, 0, 0, 0)',) and x.C('#app', 'backgroundColor') == 'rgb(17, 29, 33)' and x.C('#toolRow', 'backgroundColor') == 'rgb(22, 36, 42)')
    check('§3 线和面板对比 ≥ 1.3:1（#2b4149 对 #111d21 为 1.60）', True)
    check('§3 分隔条可拖的热区是透明的 6 px 以上', x.E("(() => { const c = getComputedStyle(document.getElementById('vsplit'), '::before'); return parseFloat(c.height) >= 6 && c.backgroundColor === 'rgba(0, 0, 0, 0)' })()"))
    # §1 字号与字重
    sizes = x.E("(() => { const s = new Set(), w = new Set(); for (const el of document.querySelectorAll('#wsBaker *')) { const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own) continue; const r = el.getBoundingClientRect(); if (!r.width) continue; const c = getComputedStyle(el); if (c.visibility === 'hidden') continue; s.add(c.fontSize); w.add(c.fontWeight) } return [[...s].sort(), [...w].sort()] })()")
    check('§1 制作区字号只有三级 12 / 13 / 15', set(sizes[0]) <= {'12px', '13px', '15px'}, sizes[0])
    check('§1 字重只有 400 和 600', set(sizes[1]) <= {'400', '600'}, sizes[1])
    w600 = x.E("(() => [...document.querySelectorAll('#wsBaker *')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && getComputedStyle(el).fontWeight === '600' && el.getBoundingClientRect().width).map(el => el.className.baseVal ?? el.className))()")
    check('v3.1-9 600 只用在当前位置（面包屑末项、结构树当前行）和模块标题', all(re.search(r'\b(cur|tx|mt)\b', c) for c in w600) and x.E("[...document.querySelectorAll('#tree .trow:not(.is-sel) .tx')].every(t => getComputedStyle(t).fontWeight === '400')"), w600)
    check('v3.1-9 600 的文字：面包屑末项、结构树当前行、模块标题都在', x.C('#path .cur', 'fontWeight') == '600' and x.C('#tree .trow.is-sel .tx', 'fontWeight') == '600' and x.C('#pbody .mod-h .mt', 'fontWeight') == '600')
    check('v3.1-9 选中的分段、标签页、筛选块、时间轴层名都不加粗', all(x.C(s, 'fontWeight') == '400' for s in ['#libTabs .tab[aria-selected="true"]', '#modeTabs button[aria-pressed="true"]', '#viewbar .seg button[aria-pressed="true"]', '#libChips button[aria-pressed="true"]', '#tlw .tlrow.t-layer .lab', '#tlw .tlrow.is-sel .lab']) and x.E("[...document.querySelectorAll('#tlw *')].every(e => getComputedStyle(e).fontWeight === '400')"), [x.C(s, 'fontWeight') for s in ['#libTabs .tab[aria-selected="true"]', '#modeTabs button[aria-pressed="true"]', '#tlw .tlrow.t-layer .lab']])
    check('§1 / v3.4-20 大号 15：面包屑末项、效果名、效果库大号标签（用户定）、当前时间', x.C('#path .cur', 'fontSize') == '15px' and x.C('#tree .trow.t-group .tx', 'fontSize') == '15px' and x.C('#tNow', 'fontSize') == '15px' and x.C('#tNow', 'color') == T1 and x.C('#libTabs .tab', 'fontSize') == '15px')
    check('§1 数值用等宽数字', x.E("[...document.querySelectorAll('#wsBaker .num')].every(n => getComputedStyle(n).fontVariantNumeric.includes('tabular-nums'))"))
    check('§1 数值主文字色，单位弱色且小一级', x.C('#pbody .prm[data-lab="缩放"] .num', 'color') == T1 and x.C('#pbody .prm[data-lab="缩放"] .u', 'color') == T3 and x.C('#pbody .prm[data-lab="缩放"] .u', 'fontSize') == '12px')
    check('§1 参数名、命令是次文字色', x.C('#pbody .prm[data-lab="缩放"] .pl', 'color') == T2 and x.C('[data-act="saveAs"]', 'color') == T2)
    check('§1 停用文字和面板对比 ≥ 3:1（次文字 × 50 %）', x.C('#pbody .prm[data-lab="湍流尺度"] .plw', 'opacity') == '0.5')
    # §2 网格
    check('§2 栏宽 1920：左 300、右 460', x.R('#left')[4] == 300 and x.R('#insp')[4] == 460)
    gc = lambda s: [float(v) for v in re.findall(r'[\d.]+', x.C(s, 'gridTemplateColumns') or '')]
    pcol, mcol = gc('#pbody .prm[data-lab="缩放"]'), gc('#pbody .mod-h')
    check('§2 / v3.3-1 / v3.5-3 检查器五列：参数名 112 ｜ 控件 ｜ 数值 ｜ 单位 ｜ 操作 24；参数行整体缩进 12（控件列少 12），数值、单位、操作三列和标题行对齐', len(pcol) == 5 and pcol[0] == 112 and pcol[4] == 24 and x.C('#pbody .prm[data-lab="缩放"]', 'gridTemplateColumns') == x.C('#pbody .prm[data-lab="湍流尺度"]', 'gridTemplateColumns') and pcol[2:] == mcol[2:] and mcol[0] == 112 and abs(mcol[1] - pcol[1] - 12) < .1, [pcol, mcol])
    check('v3.3-1 数值格到滑杆末端至少 8 px', x.R('#pbody .prm[data-lab="缩放"] .vu')[0] - x.R('#pbody .prm[data-lab="缩放"] .sl')[2] == 8)
    check('v3.3-1 小数位最多的数，数字到单位 4 px（单位在固定宽度的单位列里）', all(abs(g - 4) <= 1 for g in x.E("[...document.querySelectorAll('#pbody .prm[data-kind=num]:not(.is-dis):not(.sub)')].filter(r => r.offsetParent && r.querySelector('.u').textContent && /\\.\\d\\d$/.test(r.querySelector('.num').value)).map(r => { const n = r.querySelector('.num'), c = getComputedStyle(n); return r.querySelector('.u').getBoundingClientRect().left - (n.getBoundingClientRect().right - parseFloat(c.borderRightWidth) - parseFloat(c.paddingRight)) })")))
    check('§2 / v3.4-10 行高：结构树、时间轴 28，检查器参数行 30；模块标题行 20 + 32 + 8 = 60', x.R('#tree .trow')[5] == 28 and x.R('#tlw .tlrow')[5] == 28 and x.R('#pbody .prm[data-lab="缩放"]')[5] == 30 and x.R('#pbody .mod-h')[5] == 60, [x.R('#pbody .prm[data-lab="缩放"]')[5], x.R('#pbody .mod-h')[5]])
    check('§2 可点区域 ≥ 28（命令、图标命令；加框的两组按框量，v3.4 第 6 条）', all(r[5] >= 28 for r in x.E("[...document.querySelectorAll('#toolRow .btn, #transport .btn')].filter(b => b.offsetParent).map(b => { const r = (b.closest('.bx') || b).getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom, r.width, r.height] })")))
    check('§2 / v3.2-2 所有滑杆（单值、停用）结束在同一条线上', len(set(round(r) for r in x.E("[...document.querySelectorAll('#pbody .prm:not(.sub) .ctl1 .sl')].filter(s => s.offsetParent).map(s => s.getBoundingClientRect().right)"))) == 1 and x.N('#pbody .prm.is-dis .ctl1 .sl') >= 1)
    check('§2 面板内边距 12：检查器、结构树文字左缘', x.R('#pbody .mod-h .mt')[0] - x.R('#insp')[0] in (12, 13) and abs(x.E("(() => { const e = document.querySelector('#path > :first-child'); return e.getBoundingClientRect().left + parseFloat(getComputedStyle(e).paddingLeft) })()") - x.R('#pbody .mod-h .mt')[0]) <= 1)
    check('§2 时间轴行名和结构树同一套缩进（每级 16）', x.E("(() => { const a = [...document.querySelectorAll('#tlw .tlrow .lab')].map(l => parseFloat(getComputedStyle(l).paddingLeft)); return a[1] === a[0] && a[2] - a[1] === 16 })()"))
    check('§2 结构树每级缩进 16', x.E("(() => { const r = [...document.querySelectorAll('#tree .trow[data-id]')], p = i => parseFloat(getComputedStyle(r[i]).paddingLeft); return p(1) - p(0) === 16 && p(3) - p(2) === 16 && p(1) === p(2) })()"))
    check('§2 组间 20：工作模式和缩放分段之间', 18 <= x.R('#viewbar .seg[data-ui="view3"]')[0] - x.R('#modeTabs')[2] <= 22)
    check('§2 / v3.5-8 右段左右两组之间靠空白分开（至少 12）', x.E("(() => { const g = document.querySelectorAll('#toolRow .tcol-r .bx'); return g[1].getBoundingClientRect().left - document.getElementById('bNote').getBoundingClientRect().right })()") >= 12)
    # §4 控件语法
    check('§4 / v3.5-4 只有一种分段控件：工作模式、画面大小、花型筛选都是 .seg.m，外面 1 px 框', x.E("(() => { const a = document.querySelector('#modeTabs'), b = document.querySelector('#viewbar .seg'), c = document.querySelector('#libChips'); return [a, b, c].every(e => e.classList.contains('seg') && e.classList.contains('m') && getComputedStyle(e).borderTopWidth === '1px') })()"))
    check('§4 / v3.1-9 分段选中段只填选中底色，不加粗', x.C('#viewbar .seg button[aria-pressed="true"]', 'backgroundColor') == LINE and x.C('#viewbar .seg button[aria-pressed="true"]', 'fontWeight') == '400')
    sg = x.E("['#modeTabs', '#viewbar .seg[data-ui=view3]'].map(s => { const e = document.querySelector(s), b = e.querySelector('button'), c = getComputedStyle(b); return [e.getBoundingClientRect().height, c.paddingLeft, c.paddingRight, c.fontSize] })")
    check('§4 / v3.5-4 「实时模拟 / 引擎回放 / 序列贴图」和「适应窗口 / 1:1 / 实机窗口」同一个大小：高 28、内边距、字号都一样', sg[0] == sg[1] and sg[0][0] == 28, sg)
    check('§4 「保存」不填底色', x.C('[data-act="save"]', 'backgroundColor') == 'rgba(0, 0, 0, 0)')
    check('§4 主操作只有一个：薄荷实底的按钮只有导出 ▾（v3.4 第 11 条的开关轨道、勾选、滑杆、未保存点不是按钮）', x.E("[...document.querySelectorAll('#wsBaker *')].filter(e => getComputedStyle(e).backgroundColor === 'rgb(0, 212, 155)').every(e => e.closest('#expBtn') || e.closest('.ph') || e.matches('.sl-f, .sw:checked, .chk:checked, .btn .dot'))") and x.E("[...document.querySelectorAll('#wsBaker .btn')].filter(e => getComputedStyle(e).backgroundColor === 'rgb(0, 212, 155)').every(e => e.closest('#expBtn'))"))
    check('§4 命令静止无底，悬停出浮层底色', x.C('[data-act="saveAs"]', 'backgroundColor') == 'rgba(0, 0, 0, 0)' and (x.hover('[data-act="saveAs"]') or x.C('[data-act="saveAs"]', 'backgroundColor') == 'rgb(36, 55, 61)'))
    check('§4 图标命令必须有悬停说明', x.E("[...document.querySelectorAll('#wsBaker .btn-icon')].filter(b => b.offsetParent && !b.closest('.trow')).every(b => b.dataset.tip || b.getAttribute('aria-label'))"))
    check('§4 图标开关开着时填选中底色（循环）', x.C('#transport [data-act="loop"]', 'backgroundColor') == LINE)
    check('§4 页面标签：文字 + 2 px 薄荷下划线', x.E("(() => { const c = getComputedStyle(document.querySelector('#libTabs .tab[aria-selected=\"true\"]'), '::after'); return c.height === '2px' && c.backgroundColor === 'rgb(0, 212, 155)' })()"))
    check('§4 开关轨道 28×16；关只画 1 px 框、方块在左', x.R('#pbody .prm[data-lab="水平镜像"] .sw')[4:] == [28, 16] and x.C('#pbody .prm[data-lab="水平镜像"] .sw', 'backgroundColor') == 'rgba(0, 0, 0, 0)')
    check('v3.1-17 开关关着：轨道只有线框，方块在左、弱色', x.E("(() => { const s = document.querySelector('#pbody .prm[data-lab=\"水平镜像\"] .sw'), a = getComputedStyle(s, '::after'); return getComputedStyle(s).backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(s).borderTopWidth === '1px' && parseFloat(a.left) < 6 && a.backgroundColor !== 'rgb(228, 237, 239)' })()"))
    check('§4 勾选 14 px 方框', x.C('#pbody .prm[data-lab="联动的层"] .chk', 'width') == '14px' and x.C('#pbody .prm[data-lab="联动的层"] .chk', 'height') == '14px')
    check('§4 数值框静止时没有框，数值就是文字', x.C('#pbody .prm[data-lab="缩放"] .num', 'borderTopColor') == 'rgba(0, 0, 0, 0)')
    check('§4 停用一律降透明度（滑杆照样变暗），悬停写全句原因', x.C('#pbody .prm[data-lab="湍流尺度"] .ctl1', 'opacity') == '0.5' and x.E("document.querySelector('#pbody .prm[data-lab=\"湍流尺度\"]').dataset.tip") == '湍流强度为 0 时无效')
    check('v3.1-6 停用行不用悬停也看得到原因：数值列弱色小字「强度为 0 时无效」，不进控件列', x.T('#pbody .prm[data-lab="湍流尺度"] .vu') == '强度为 0 时无效' and x.C('#pbody .prm[data-lab="湍流尺度"] .dis-why', 'color') == T3 and x.C('#pbody .prm[data-lab="湍流尺度"] .dis-why', 'fontSize') == '12px' and x.N('#pbody .prm[data-lab="湍流尺度"] .ctl1 .dis-why') == 0 and x.R('#pbody .prm[data-lab="湍流尺度"] .dis-why')[0] >= x.R('#pbody .prm[data-lab="湍流尺度"] .sl')[2] + 8)
    # §5 颜色
    mint = x.E("[...document.querySelectorAll('#wsBaker *')].filter(e => { const c = getComputedStyle(e); return e.getBoundingClientRect().width && [c.color, c.backgroundColor, c.borderTopColor, c.boxShadow].some(v => v && v.includes('0, 212, 155')) }).map(e => e.closest('#expBtn') ? '导出' : e.matches('#tree .trow.is-sel') ? '结构树当前行' : e.matches('#tlw .ph > i') ? '播放头的头' : e.matches('#tlw .ph') ? '播放头' : e.closest('.btn.pnl[aria-pressed=true]') ? '栏开关' : e.matches('.sl-f') ? '滑杆已填' : e.matches('.sw:checked') ? '开关开着' : e.matches('.chk:checked') ? '勾选' : e.matches('.btn .dot') ? '未保存点' : e.closest('.btn-icon[aria-pressed=true]') ? '图标开关开着' : (e.id || String(e.className.baseVal ?? e.className) || e.tagName))")
    MINT_OK = {'导出', '结构树当前行', '播放头的头', '播放头', '栏开关', '滑杆已填', '开关开着', '勾选', '未保存点', '图标开关开着'}
    check('v3.4-11 / v3.5-1 薄荷只在导出、播放头、标签下划线（已有），结构树当前行竖线、栏开关、开关轨道、滑杆已填、勾选、未保存点（v3.4），和开着的图标开关（v3.5 第 1 条，如循环）', set(mint) <= MINT_OK and {'导出', '结构树当前行', '播放头的头', '播放头', '栏开关', '滑杆已填', '开关开着', '图标开关开着'} <= set(mint), sorted(set(mint)))
    amber = x.E("[...document.querySelectorAll('#wsBaker *')].filter(e => { const c = getComputedStyle(e); return e.getBoundingClientRect().width && [c.color, c.backgroundColor].some(v => v && v.includes('224, 178, 90')) }).map(e => e.id || String(e.className.baseVal ?? e.className))")
    check('§5 / v3.3-2 / v3.6-2 琥珀只在结构树层行三角、导出按钮里的「▲1」（和外壳状态栏的「备份 ● 未选」）', all(re.search(r'stl|exb|st-warn|^i$|sh-sv is-warn', a) or a == '' for a in amber) and 'exb' in amber, amber)
    check('v3.3-2 效果库状态词：「待验收」主文字色，制作中、新、已通过弱色', x.E("(() => { const m = {}; document.querySelectorAll('#libList .st').forEach(s => m[s.textContent] = getComputedStyle(s).color); return m['待验收'] === 'rgb(228, 237, 239)' && m['新'] === 'rgb(141, 163, 172)' && m['制作中'] === 'rgb(141, 163, 172)' && m['已通过'] === 'rgb(141, 163, 172)' })()"))
    # v3.6 第 14 条改写：原来是给 img 加 brightness 滤镜；现在按花的外接框裁切、统一曝光以后直接换图（data-fit），亮部 98 % 分位提到 235 上下
    fit = x.E(THUMB_JS)
    check('v3.2-10 / v3.6-14 效果库缩略图都按外接框裁切、统一曝光（千轮、柳这类暗图也提亮：亮部 98 % 分位 ≥ 200）', fit and all(f['fit'] for f in fit) and all(f['p98'] >= 200 for f in fit), fit)
    # v3.6 第 2 条改写：单独的「⚠ 1 层」去掉，并进导出按钮——主段「导出 ▲1」，三角 + 数字琥珀，垫深色小块（p1）
    eb = x.E("(() => { const b = document.querySelector('#expBtn .exb'); if (!b) return null; const c = getComputedStyle(b); return {t: b.textContent.trim(), ic: !!b.querySelector('use[href=\"#i-stale\"]'), col: c.color, bg: c.backgroundColor, inMain: !!b.closest('[data-act=export]'), old: !!document.getElementById('expSt'), lab: b.closest('button').getAttribute('aria-label')}; })()")
    check('§5 / v3.1-5 / v3.6-2 「⚠ 1 层」并进导出按钮：主段「导出 ▲1」，三角 + 数字（形状 + 数字，不只靠颜色），没有单独的「⚠ 1 层」按钮', bool(eb) and eb['t'] == '1' and eb['ic'] and eb['inMain'] and not eb['old'] and eb['lab'] == '导出，1 层需重新导出', eb)
    check('v3.6-2 「▲1」琥珀垫在深色小块上：琥珀对小块 ≥ 4.5 : 1，小块对薄荷 ≥ 4.5 : 1（琥珀直接放薄荷上只有 1.02 : 1）', bool(eb) and eb['col'] == AMBER and eb['bg'] == 'rgb(6, 42, 35)' and cr(eb['col'], eb['bg']) >= 4.5 and cr(eb['bg'], MINT) >= 4.5, eb)
    x.hover('#expBtn [data-act="export"]')
    check('§5 / v3.6-2 悬停导出：第一行「重新导出 1 层」，下面一行写原因「金锦层：缩放 1.00 倍 → 1.10 倍」', (x.T('#ovlApp .tip.why b') or '') == '重新导出 1 层' and (x.T('#ovlApp .tip.why .hint2') or '').startswith('金锦层：缩放'), x.tip())
    # §6 图标
    ids = x.E("[...document.querySelectorAll('#iconDefs symbol')].map(s => s.id)")
    need = ['i-in', 'i-outp', 'i-auto', 'i-layer', 'i-star', 'i-spark', 'i-ember', 'i-tail', 'i-trail', 'i-sub', 'i-eye', 'i-solo', 'i-soloon', 'i-more', 'i-undo', 'i-redo', 'i-history', 'i-reset', 'i-loop', 'i-play', 'i-restart', 'i-camera', 'i-timer', 'i-grid', 'i-note', 'i-compact', 'i-pl', 'i-pr', 'i-folder', 'i-settings', 'i-search', 'i-filter', 'i-cd', 'i-cu', 'i-stale']
    check('§6 第 6 节要画的图标都在 symbol 定义里', all(i in ids for i in need), [i for i in need if i not in ids])
    check('§6 图标 16 px 画布、1.5 px 线宽、方头、只画线框', x.E("[...document.querySelectorAll('#iconDefs symbol')].every(s => s.getAttribute('viewBox') === '0 0 16 16')") and x.C('#toolRow svg.i', 'strokeWidth') == '1.5px' and x.C('#toolRow svg.i', 'strokeLinecap') == 'square' and x.C('#toolRow svg.i', 'fill') == 'none')
    check('§6 页面上用到的图标都有定义', x.E("[...document.querySelectorAll('use')].every(u => document.querySelector(u.getAttribute('href')))"))
    # v3.6 第 11 条改写：版本记录不再是「三张纸」（看着像复制），改成时钟加逆时针箭头——大弧 + 左侧向下的箭头 + 指针；恢复只有大弧和箭头、没有指针
    check('§6 / v3.6-11 一种形状一个意思：版本记录是时钟加逆时针箭头（有指针），恢复是一个圆弧箭头（没有指针），循环是矩形环；画大弧的只有这两个', x.E("(() => { const h = document.querySelector('#i-history').innerHTML, r = document.querySelector('#i-reset').innerHTML; return document.querySelector('#i-history').querySelectorAll('path').length === 2 && /a4\\.5 4\\.5 0 1 1/.test(h) && h.includes('V8h2') && !/V8h2|h2\\b/.test(r) && !/ a|A/.test(document.querySelector('#i-loop').innerHTML) && [...document.querySelectorAll('#iconDefs symbol')].filter(s => /a[\\d.]+ [\\d.]+ 0 1 /.test(s.innerHTML)).map(s => s.id).join() === 'i-history,i-reset'; })()"))
    check('§6 「需重新导出」图标是琥珀三角加感叹号（和「警告」同形，颜色分开）', x.C('#tree .stl', 'color') == AMBER and 'M8 4.3 12.7 12.44H3.3z' in x.E("document.querySelector('#i-stale').innerHTML") and x.E("document.querySelector('#i-stale').innerHTML === document.querySelector('#i-alert').innerHTML"))
    # §7 一个信息只出现一次
    check('§7 / v3.4-17 画面读数左下一行：平台、fps、「帧 50 / 75」（帧数从播放条挪到这里）', re.fullmatch(r'PC 30 fps 帧 \d+ / \d+', x.T('#ciBL') or '') is not None, x.T('#ciBL'))
    check('§7 画面读数不再写单格、张数、帧数（「帧 50」是当前帧号，v3.3 第 9 条）', not re.search(r'单格|张|1024|\d+ 帧', x.T('#cell') or ''), x.T('#cell'))
    check('v3.1-3 画面右下常驻「距离 1000 m　预览曝光 1.00 倍」，弱色', x.T('#ciView') == '距离 1000 m 预览曝光 1.00 倍' and x.C('#ciView .vi .lbl', 'color') == T3 and x.C('#ciView .vi .num', 'color') == T2, x.T('#ciView'))
    check('v3.1-3 读数是数值框（可拖、可单击输入），不是只读文字', x.N('#ciView .vi input.num') == 2 and x.C('#ciView .vi .num', 'cursor') == 'ew-resize')
    bl = x.E("(() => { const g = id => [...document.getElementById(id).querySelectorAll('*')].filter(x => x.firstChild && x.firstChild.nodeType === 3 && x.firstChild.textContent.trim()).map(t => { const r = document.createRange(); r.selectNodeContents(t.firstChild); return r.getBoundingClientRect().bottom }); return [...g('ciBL'), ...g('ciView')] })()")
    check('v3.1-3 / v3.2-6 左下「PC　30 fps　tick 60」和右下读数在同一条基线上', max(bl) - min(bl) <= 1, bl)
    gp = x.E("(() => { const gap = (a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().right; const v = [...document.querySelectorAll('#ciView .vi')], c = [...document.querySelectorAll('#ciBL .cg')]; return {inner: v.flatMap(e => { const k = [...e.children]; return [gap(k[0], k[1]) + 3, gap(k[1], k[2]) + 3] }), outer: [gap(v[0], v[1]), gap(c[0], c[1]), gap(c[1], c[2])]} })()")
    check('v3.2-6 标签、数值、单位紧贴成一组（字和字 4–6 px），组和组之间 16 px', all(3 <= g <= 6 for g in gp['inner']) and all(abs(g - 16) <= 1 for g in gp['outer']) and x.R('#ciView')[2] <= x.R('#stage')[2] - 8, gp)
    check('§7 播放条不写层名', '金锦层' not in (x.T('#transport') or ''))
    check('v3.1-2 面包屑恢复：「金曜菊-B › 金锦层」，末项大号 600、前面的项是次文字色命令', x.T('#path') == '金曜菊-B › 金锦层' and x.C('#path .cur', 'fontSize') == '15px' and x.C('#path button', 'fontSize') == '13px' and x.C('#path button', 'color') == T2 and x.C('#path .sep', 'color') == T3, x.T('#path'))
    check('§7 效果名在结构树第一行和面包屑第一项，时间轴不写', x.T('#tree .trow.t-group .tx') == '金曜菊-B 稀簇辉闪' and '金曜菊' not in (x.T('#tlw') or '') and x.N('#tlw .tlrow.t-group') == 0)
    check('§7 结构树第一行不写层数', x.T('#tree .trow.t-group') == '金曜菊-B 稀簇辉闪')
    check('§7 单格、张数只在检查器「输出」模块', '1024' in (x.T('#pbody .mod[data-mod="输出"] .ms') or ''))
    # §8 时间轴
    g = x.E("[...document.querySelectorAll('#transport .tpg')].map(e => { const r = e.getBoundingClientRect(); return [r.left, r.right] })")
    check('§8 / v3.4-17 播放条一行三组，组间至少 24，最后一组靠最右', len(g) == 3 and all(g[i + 1][0] - g[i][1] >= 24 for i in range(2)) and abs(g[2][1] - (x.R('#transport')[2] - 12)) <= 1, g)
    check('§8 第 1 组：▶ ⏮ 1× 循环', x.E("[...document.querySelectorAll('#transport .tpg')[0].children].map(c => c.dataset.act || c.id).join()") == 'play,restart,speed,loop')
    check('§8 / v3.5-7 中间一组：「2.00」大号主文字色、「/ 5.24 s」次文字色，只有时间（秒表挪到最右）；帧数不在播放条里', x.E("document.querySelector('#tNow').value") == '2.00' and (x.T('#transport .time .tot') or '') == '/ 5.24 s' and x.C('#transport .time .tot', 'color') == T2 and x.N('#transport .time .btn') == 0 and x.N('#transport .fbk, #transport .fno') == 0 and '帧' not in (x.T('#transport') or ''), x.T('#transport .time'))
    tg = x.E("(() => { const b = [...document.querySelectorAll('#transport .tpg')[2].querySelectorAll('[data-act]')]; return {a: b.map(c => c.dataset.act).join(), t: b.map(c => c.textContent.trim()).join(''), gap: b.length === 2 ? b[1].getBoundingClientRect().left - b[0].getBoundingClientRect().right : null, opt: document.querySelectorAll('[data-act=tlOpts]').length} })()")
    check('§8 / v3.5-7 最右一组：秒表、相机两个图标并排，间隔 8；没有「选项 ▾」', tg['a'] == 'timeTools,thumb' and tg['t'] == '' and tg['gap'] == 8 and tg['opt'] == 0 and x.E("document.querySelector('#transport [data-act=thumb]').dataset.tip").startswith('生成缩略图'), tg)
    check('§8 导出范围画在刻度尺上：一段浅底，两端把手', x.N('#tlw .rrow .xrange') == 1 and x.N('#tlw .rrow .xrange .xh') == 2)
    check('v3.1-12 / v3.5-5 「0.35 – 2.85 s」不在刻度尺上，写在刻度尺上面「导出范围」一行（原胶片行的位置）', re.sub(r'\s', '', x.E("[...document.querySelectorAll('#tlw .iorow .xv > *')].map(e => e.value || e.textContent).join('')")) == '0.35–2.85s' and x.N('#tlw .rrow .tnum, #tlw .rrow .btn') == 0 and abs(x.R('#tlw .iorow')[3] - x.R('#tlw .rrow')[1]) <= 1 and x.T('#tlw .iorow .io-k') == '导出范围')
    check('v3.1-1 / v3.5-5 导出范围读数右边三个图标命令：设为入点、设为出点、恢复', x.E("[...document.querySelectorAll('#tlw .iorow .io-range .btn-icon')].map(b => b.dataset.act + ':' + b.querySelector('use').getAttribute('href')).join()") == 'setIn:#i-in,setOut:#i-outp,clearIO:#i-reset' and x.R('#tlw .iorow [data-act="setIn"]')[0] > x.R('#tlw .iorow .xv')[2])
    check('v3.1-12 播放头的头部画在刻度数字上方，不盖住数字', x.R('#tlw .rrow')[1] - 1 <= x.R('#tlw .ph i')[1] and x.R('#tlw .ph i')[3] <= min(r[1] for r in x.E("[...document.querySelectorAll('#tlw .rrow .tlab')].map(t => { const r = t.getBoundingClientRect(); return [r.left, r.top] })")) + 1 and x.C('#tlw .ph i', 'backgroundColor') == MINT)
    check('v3.1-12 时间刻度的数字给播放头让位：播放头 ±7 px 内的刻度数字藏起来，其余照常', x.E("(() => { const p = document.querySelector('#tlw .ph').getBoundingClientRect().left; return [...document.querySelectorAll('#tlw .rrow .tlab')].every(t => { const r = t.getBoundingClientRect(), near = p > r.left - 7 && p < r.right + 7; return near === (getComputedStyle(t).visibility === 'hidden') }) })()") and x.N('#tlw .rrow .tlab.is-hid') == 1)
    check('§8 / v3.5-5 胶片行去掉：刻度尺上面是「导出范围」一行，1920 下高 32，紧贴刻度尺', x.R('#tlw .iorow')[5] == 32 and abs(x.R('#tlw .iorow')[3] - x.R('#tlw .rrow')[1]) <= 1 and x.N('#tlw .frow, #tlw .film-u') == 0)
    check('§8 / v3.5-5 时间轴上看不到胶片格（烘焙进度看画面左下「帧 50 / 75」）', x.E("[...document.querySelectorAll('#tlw .film-c')].every(c => !c.getBoundingClientRect().width)") and re.search(r'帧 \d+ / \d+', x.T('#ciBL') or '') is not None)
    check('§8 / v3.5-5 外壳取烘焙帧用的隐藏帧还在（#tlw .film-src .film-c img，不显示、不占位）', x.N('#tlw .film-src .film-c img') >= 2 and x.C('#tlw .film-src', 'display') == 'none')
    # v3.6 第 1 条改写：按时间轴的网格排——「导出范围」在行名列（起线和轨道名一样），数值从刻度「0 s」开始，图标跟在数值后 12、之间 4，勾选框右对齐到刻度尺末端
    io = x.E(IO_JS)
    check('v3.5-5 / v3.6-1 「导出范围」在行名列，起线和轨道行名一样（x312）', io['k'] == io['trk'] and io['k'] == 312 and io['kIn'], io)
    check('v3.6-1 数值从刻度「0 s」那条线开始（x468），三个图标跟在数值后 12、图标之间 4', io['xv'] == io['fr0'] == 468 and io['bgap'][0] == 12 and io['bgap'][1:] == [4, 4], io)
    check('v3.6-1 两个勾选框右对齐到刻度尺末端（x1442），和播放条右组的图标笔画同一条线；和左边至少 24', io['opR'] == io['fr1'] == 1442 and io['tools'] - 6 == 1442 and io['opGap'] >= 24, io)
    check('v3.5-5 / v3.6-1 「选项 ▾」里的两个偏好露在这一行，改成勾选框（勾上薄荷）：「一并移动」「同刻联动」，勾着；不用开关', x.E("[...document.querySelectorAll('#tlw .iorow .io-ck')].map(l => l.textContent.trim() + ':' + l.querySelector('input.chk').checked).join()") == '一并移动:true,同刻联动:true' and x.N('#tlw .iorow .sw') == 0 and x.C('#tlw .iorow .io-ck .chk', 'backgroundColor') == MINT)
    check('v3.6-1 范围和打开时一样时「恢复」停用（仍然显示）', x.E("(() => { const b = document.querySelector('#tlw .iorow [data-act=clearIO]'); return b.disabled && b.getBoundingClientRect().width > 0 })()"))
    check('v3.6-9 播放条和导出范围一行之间不画线（同一个底色）', x.C('#tlw', 'borderTopWidth') == '0px' and x.C('#tlw .iorow', 'borderTopWidth') == '0px' and x.C('#transport', 'borderBottomWidth') == '0px' and x.C('#transport', 'backgroundColor') == x.C('#tlw .tl .fixed', 'backgroundColor'))
    check('v3.5-5 刻度尺的行名格空着（读数挪到上面一行），行名列和下面的轨道行同宽', x.T('#tlw .rrow .lab') == '' and x.R('#tlw .rrow .lab')[4] == x.R('#tlw .tlrow .lab')[4])
    check('§8 层行 6 px 实心条，发射器行 2 px 细条', x.R('#tlw .tlrow.t-layer .bar-e')[5] == 6 and x.R('#tlw .tlrow.t-emitter .bar-e')[5] == 2)
    check('§8 超出导出范围的那一段降到 40 %', x.N('#tlw .tlrow.is-sel .bar-e .xo') >= 1 and abs(float(x.C('#tlw .tlrow.is-sel .bar-e .xo', 'opacity')) - .6) < .01)
    check('§8 当前行底色亮一级、条更亮', x.C('#tlw .tlrow.is-sel', 'backgroundColor') == 'rgb(22, 36, 42)' and x.C('#tlw .tlrow.is-sel .bar-e', 'backgroundColor') == T2)
    check('§8 关键帧菱形只画在当前行', x.E("[...document.querySelectorAll('#tlw .kf')].filter(k => getComputedStyle(k).display !== 'none').every(k => k.closest('.tlrow.is-sel'))"))
    check('§8 不用小旗、方括号、斜线', x.N('#tlw .stmk, #tlw .edge, #tlw .hatch, #tlw .xr') == 0)
    check('v3.2-1 只展开当前编辑的层：金锦层展开，橙引线层、点灭星折成一行（结构树、时间轴一样）', x.E("[...document.querySelectorAll('#tree .trow[data-id]')].slice(1).map(r => r.querySelector('.tx').textContent).join()") == '橙引线层,金锦层,星,火花,余烬,点灭星' and x.E("[...document.querySelectorAll('#tlw .tlrow[data-id]')].map(r => r.dataset.id).join()") == x.E("[...document.querySelectorAll('#tree .trow[data-id]')].slice(1).map(r => r.dataset.id).join()"))
    check('v3.2-1 1920 下 6 行都放得下，不出「还有 N 行」', x.E("(() => { const t = document.querySelector('#tlw .tl').getBoundingClientRect(); return [...document.querySelectorAll('#tlw .tlrow[data-id]')].every(r => r.getBoundingClientRect().bottom <= t.bottom + 1) })()") and not x.V('#tlw .tl-more'))
    check('v3.2-1 时间轴（播放条 + 胶片 + 刻度尺 + 行）最多占中栏的 1/3，省下的高度给画面', (x.R('#mid')[3] - x.R('#transport')[1]) <= x.R('#mid')[5] / 3 + 1, [x.R('#mid')[3] - x.R('#transport')[1], x.R('#mid')[5]])
    check('v3.1-20 时间轴高度按内容定：最后一行下面不留大块空白（≤ 1 行）', x.E("(() => { const t = document.querySelector('#tlw .tl').getBoundingClientRect(), r = [...document.querySelectorAll('#tlw .tlrow[data-id]')].pop().getBoundingClientRect(); return t.bottom - r.bottom })()") <= 28, x.E("(() => { const t = document.querySelector('#tlw .tl').getBoundingClientRect(), r = [...document.querySelectorAll('#tlw .tlrow[data-id]')].pop().getBoundingClientRect(); return t.bottom - r.bottom })()"))
    # §9 检查器
    check('§9 顶部面包屑；下一行搜索、「筛选 ▾」「全部折叠」', x.E("[...document.querySelector('.insp-tools').children].map(c => c.id).join()") == 'pq,viewOpt,foldAll')
    check('§9 / v3.5-3 模块标题 600、主文字色、左边缘贴检查器内边距；参数行比标题向右缩进 12', x.R('#pbody .mod-h')[5] == 60 and x.C('#pbody .mod-h .mt', 'color') == T1 and x.C('#pbody .mod-h .mt', 'fontWeight') == '600' and abs(x.R('#pbody .prm[data-lab="缩放"] .pl')[0] - x.R('#pbody .mod-h .mt')[0] - 12) <= 1)
    cv = x.E("[...document.querySelectorAll('#pbody .mod')].filter(m => m.offsetParent).map(m => { const h = m.querySelector('.mod-h'), c = h.querySelector('.chev'), r = c.getBoundingClientRect(), H = h.getBoundingClientRect(); return [m.classList.contains('is-closed'), getComputedStyle(c).visibility, getComputedStyle(c).rotate, getComputedStyle(c).color, Math.round(H.right - r.right)] })")
    check('v3.5-3 每个模块标题行最右（操作列）常驻一个弱色折叠箭头：展开朝下、折叠朝右', len(cv) >= 4 and all(c[1] == 'visible' and c[3] == T3 and 2 <= c[4] <= 6 and c[2] == ('none' if c[0] else '90deg') for c in cv) and any(c[0] for c in cv) and any(not c[0] for c in cv), cv)
    sm = x.E("(() => { const m = document.querySelector('#pbody .mod[data-mod=\"输出\"]'); if (!m || !m.classList.contains('is-closed')) return null; const g = [...m.querySelectorAll('.ms .msg')], z = document.querySelector('#pbody .prm[data-lab=\"缩放\"] .vu'), wv = parseFloat(getComputedStyle(document.getElementById('pbody')).getPropertyValue('--w-val')); return {t: g.map(e => e.textContent), c: getComputedStyle(m.querySelector('.ms')).color, gap: g.length > 1 ? g[1].getBoundingClientRect().left - g[0].getBoundingClientRect().right : null, r: m.querySelector('.ms').getBoundingClientRect().right, r0: z.getBoundingClientRect().left + wv, v: m.querySelectorAll('.ms .num, .ms-v, .ms-u').length} })()")
    check('§9 / v3.4-21 折叠的模块摘要弱色、连贯的短语「1024 px　5 张」；组间 16，整体右对齐到数值列末端，不拆进列', sm and sm['t'] == ['1024 px', '5 张'] and sm['c'] == T3 and abs(sm['gap'] - 16) <= 1 and abs(sm['r'] - sm['r0']) <= 1 and sm['v'] == 0, sm)
    check('§9 只有一个数值参数的模块不做成模块（曝光并进「颜色」）；「轨迹联动」（勾选列表）保留成模块', x.N('#pbody .mod[data-mod="曝光"]') == 0 and x.N('#pbody .mod[data-mod="颜色"] .prm[data-lab="曝光"]') == 1 and x.N('#pbody .mod[data-mod="轨迹联动"] .prm[data-lab="联动的层"]') == 1 and x.E("[...document.querySelectorAll('#pbody .mod')].every(m => m.querySelectorAll('.mod-b > .prm:not(.sub)').length >= 2 || m.dataset.mod === '轨迹联动')"))
    check('v3.4-16 不是默认值：不画别的记号，数值主文字色；恢复按钮静止时不出', x.C('#pbody .prm[data-lab="缩放"] .mk', 'boxShadow') == 'none' and x.C('#pbody .prm[data-lab="缩放"] .mk', 'backgroundColor') == 'rgba(0, 0, 0, 0)' and x.C('#pbody .prm[data-lab="缩放"] .num', 'color') == T1 and x.C('#pbody .prm[data-lab="缩放"] .rst', 'visibility') == 'hidden')
    x.hover('#pbody .prm[data-lab="缩放"] .pl')
    check('v3.4-16 悬停不是默认值的那一行，操作列才出恢复', x.C('#pbody .prm[data-lab="缩放"] .rst', 'visibility') == 'visible')
    check('v3.4-16 默认值：数值次文字色，悬停也不出恢复', x.C('#pbody .prm[data-lab="开始时间"] .num', 'color') == T2 and x.C('#pbody .prm[data-lab="开始时间"] .rst', 'visibility') == 'hidden' and (x.hover('#pbody .prm[data-lab="开始时间"] .pl') or True) and x.C('#pbody .prm[data-lab="开始时间"] .rst', 'visibility') == 'hidden')
    pg.close()
    # §9 区间、曲线：仙女棒
    pg = new_page(b); x = P(pg); x.E("KIT.set('scene','spk')"); pg.wait_for_timeout(150)
    if x.E("document.querySelector('#pbody .mod[data-mod=\"大小与亮度\"]').classList.contains('is-closed')"): x.click('#pbody .mod[data-mod="大小与亮度"] .mod-h .mt')   # v3.4 第 10 条行变高以后，1920 下这个模块放不下、默认折叠
    check('§9 / v3.4-19 区间数值格写「0.30 – 1.65」', re.sub(r'\s', '', x.E("[...document.querySelectorAll('#pbody .prm[data-lab=\"大小\"] .vv > *')].map(e => e.value || e.textContent).join('')")) == '0.30–1.65')
    check('§9 「分布」改成数值格右边的展开箭头（不在参数名后面）', x.N('#pbody .prm[data-lab="大小"] .plw .exn') == 0 and x.R('#pbody .prm[data-lab="大小"] .exn')[0] >= x.R('#pbody .prm[data-lab="大小"] .vv .num:not(.lo)')[2] - 1)
    x.hover('#pbody .prm[data-lab="大小"] .pl'); x.click('#pbody .prm[data-lab="大小"] .exn')   # v3.4 第 15 条：分布箭头悬停这一行才出
    check('§9 点开展开箭头，下一行出分布滑杆', x.E("(() => { const r = document.querySelector('#pbody .prm[data-lab=\"大小\"]'); const n = r.nextElementSibling; return !!n && n.dataset.part === 'ex' && !!n.querySelector('.sl') })()"))
    check('v3.2-2 区间滑杆和单值滑杆结束在同一条线上（同一个数值格）', len(set(round(r) for r in x.E("[...document.querySelectorAll('#pbody .prm:not(.sub) .ctl1 .sl')].filter(s => s.offsetParent).map(s => s.getBoundingClientRect().right)"))) == 1 and x.C('#pbody .prm[data-lab="大小"]', 'gridTemplateColumns') == x.C('#pbody .prm[data-lab="亮度增益"]', 'gridTemplateColumns'))
    rg = x.E("[...document.querySelectorAll('#pbody .prm.range')].filter(r => r.offsetParent).map(r => Math.round(r.querySelector('.vv').getBoundingClientRect().left - r.querySelector('.sl').getBoundingClientRect().right))")
    check('v3.2-2 区间读数也从滑杆末端 + 8 px 起；最长的「0.012–0.032 s ⌄」放得进数值格', all(g == 8 for g in rg) and x.E("(() => { const v = document.querySelector('#pbody .prm[data-lab=\"寿命\"] .vu'); return Math.max(...[...v.children].map(c => c.getBoundingClientRect().right)) <= v.getBoundingClientRect().right + 0.5 })()"), rg)
    check('§9 最长的区间「0.012–0.032」不压到滑杆', x.R('#pbody .prm[data-lab="寿命"] .vv')[0] >= x.R('#pbody .prm[data-lab="寿命"] .sl')[2] + 2, [x.R('#pbody .prm[data-lab="寿命"] .vv')[0], x.R('#pbody .prm[data-lab="寿命"] .sl')[2]])
    check('§9 曲线高 96，横跨控件、数值、单位三列', x.R('#pbody .prm[data-lab="大小曲线"] .crv')[5] == 96 and abs(x.R('#pbody .prm[data-lab="大小曲线"] .crv')[2] - x.R('#pbody .prm[data-lab="亮度增益"] .vu')[2]) <= 1)
    check('v3.2-8 曲线有纵轴刻度（0 和最大值）；图里不再写「寿命 0–100 %」', x.T('#pbody .prm[data-lab="大小曲线"] .crv-yl') == '1.0 0' and x.N('#pbody .crv-xl') == 0 and '0–100' not in (x.T('#pbody .prm[data-lab="大小曲线"] .crv-w') or ''))
    check('v3.2-8 读数写成一行「关键点 2/5　寿命 15 %　大小 0.90 倍」，从曲线左缘起', re.sub(r'\s', '', x.E("[...document.querySelectorAll('#pbody .prm[data-lab=\"大小曲线\"] .cx *')].filter(e => !e.children.length).map(e => e.value || e.textContent).join('')")) == '关键点2/5寿命15%大小0.90倍' and x.R('#pbody .prm[data-lab="大小曲线"] .cx')[5] <= 28 and abs(x.R('#pbody .prm[data-lab="大小曲线"] .cx .cp')[0] - x.R('#pbody .prm[data-lab="大小曲线"] .crv')[0]) <= 1)
    check('v3.2-8 横轴说明只写一次：悬停读数里的「寿命」写「横轴：寿命 0–100 %」', x.E("document.querySelector('#pbody .prm[data-lab=\"大小曲线\"] .cx .cg .lbl').dataset.tip") == '横轴：寿命 0–100 %')
    check('§9 寿命并进「运动」（单参数模块）', x.N('#pbody .mod[data-mod="寿命"]') == 0 and x.N('#pbody .mod[data-mod="运动"] .prm[data-lab="寿命"]') == 1)
    check('§10 仙女棒子发射器用子发射器图标', x.E("document.querySelector('#tree .trow.is-sel .ty use').getAttribute('href')") == '#i-sub')
    check('§8 仙女棒导出范围是整个效果（0.00–2.13 s）', re.sub(r'\s', '', x.E("[...document.querySelectorAll('#tlw .iorow .xv > *')].map(e => e.value || e.textContent).join('')")) == '0.00–2.13s')
    check('v3.2-1 / v3.3-4 仙女棒 13 行：时间轴最多占中栏 1/3，放不下的写「下面还有 N 行」', x.N('#tlw .tlrow[data-id]') == 13 and x.V('#tlw .tl-edge.dn .tl-more') and (x.R('#mid')[3] - x.R('#transport')[1]) <= x.R('#mid')[5] / 3 + 1, [x.R('#mid')[3] - x.R('#transport')[1], x.R('#mid')[5]])
    check('v3.3-4 默认滚到顶时，当前行（08 二级碎火星）也在可见范围里', x.E("(() => { const t = document.querySelector('#tlw .tl').getBoundingClientRect(), r = document.querySelector('#tlw .tlrow.is-sel').getBoundingClientRect(); return r.top >= t.top - 1 && r.bottom <= t.bottom + 1 })()"))
    pg.close()
    # §8 放不下时才出「还有 N 行」：1366 下仙女棒
    pg = new_page(b, 1366, 768); x = P(pg); x.E("KIT.set('scene','spk')"); pg.wait_for_timeout(150)
    check('§8 / v3.3-4 放不下时才出「下面还有 N 行」，贴在时间轴下边缘', x.V('#tlw .tl-edge.dn .tl-more') and re.fullmatch(r'下面还有 \d+ 行', x.T('#tlw .tl-edge.dn .tl-more') or '') is not None and abs(x.R('#tlw .tl-edge.dn .tl-more')[3] - x.R('#tlw .tl')[3]) <= 1, x.T('#tlw .tl-edge.dn .tl-more'))
    x.click('#tlw .tl-edge.dn .tl-more'); pg.wait_for_timeout(200)
    check('§8 / v3.3-4 点「下面还有 N 行」滚到底', x.E("(() => { const t = document.querySelector('#tlw .tl'); return Math.abs(t.scrollTop - (t.scrollHeight - t.clientHeight)) <= 1 })()") and not x.V('#tlw .tl-edge.dn .tl-more'))
    pg.close()
    # §10 左栏
    pg = new_page(b); x = P(pg)
    check('v3.1-19 层行去掉叠层图标（有层号），根行、发射器行保留类型图标', x.N('#tree .trow.t-layer .ty') == 0 and x.N('#tree .trow.t-layer .no') == 3 and x.N('#tree .trow.t-group .ty') == 1 and x.E("[...document.querySelectorAll('#tree .trow.t-emitter')].every(r => r.querySelector('.ty'))"))
    check('§10 显示 / 只看 / ⋯ 只在悬停、当前行或者不是默认状态时出现', x.C('#tree .trow[data-id]:not(.is-sel):not(.t-group) .eye', 'visibility') == 'hidden' and x.C('#tree .trow.is-sel .eye', 'visibility') == 'visible')
    check('v3.1-7 / v3.4-15 效果库大号标签等宽两半（40 px 高，字号 15，用户定）；「模板」右边静止时不画折叠箭头，收起图标在标签行最右、悬停才出', abs(x.R('#libTabs .tab:first-child')[4] - x.R('#libTabs .tab:last-child')[4]) <= 1 and x.C('#libTabs .tab', 'fontSize') in ('15px', '14px') and x.R('#libTabs .tab')[5] == 40 and x.R('#libToggle')[0] >= x.R('#libTabs .tab:last-child')[2] - 1 and x.R('#left')[2] - x.R('#libToggle')[2] <= 8 and x.R('#libTabs')[0] == x.R('#left')[0] and x.C('#libToggle', 'visibility') == 'hidden' and (x.hover('#libTabs .tab:last-child') or True) and x.C('#libToggle', 'visibility') == 'visible')
    check('v3.1-7 下划线横跨整个标签', x.E("(() => { const t = document.querySelector('#libTabs .tab[aria-selected=\"true\"]'), c = getComputedStyle(t, '::after'); return Math.abs(parseFloat(c.width) - t.getBoundingClientRect().width) <= 1 })()"))
    check('v3.1-8 搜索框静止时画 1 px 线框（效果库、检查器）', all(x.C(s, 'borderTopWidth') == '1px' and x.C(s, 'borderTopColor') == LINE for s in ['#libQ', '#pq']), [x.C('#libQ', 'borderTopColor'), x.C('#pq', 'borderTopColor')])
    lb = x.E("(() => { const R = s => document.querySelector(s).getBoundingClientRect(), P = R('#libPane'), t = R('.lib-head'), c = R('#libChips'), q = R('#libQ'), n = R('#libPane [data-act=libNew]'), th = R('#libList .lib-item .th'), bw = [...document.querySelectorAll('#libChips button')].map(b => Math.round(b.getBoundingClientRect().width)); return {order: t.bottom <= c.top && c.bottom <= q.top, h: c.height, full: Math.round(P.right - 12 - c.right), bw, row: Math.abs(n.top - q.top) < 3 && n.left > q.right, g12: Math.round(c.top - t.bottom), g23: Math.round(q.top - c.bottom), gin: Math.round(n.left - q.right), left: [c.left, q.left, th.left].map(v => Math.round(v - P.left)), cnt: document.querySelectorAll('#libCount').length, txt: document.querySelector('#libPane [data-act=libNew]').textContent.trim()} })()")
    check('§10 / v3.5-2 效果库层级：大号标签 → 花型筛选（整行等宽分段，高 28）→ 搜索 + 新建（同一行）→ 列表', lb['order'] and lb['h'] == 28 and abs(lb['full']) <= 1 and max(lb['bw']) - min(lb['bw']) <= 1 and lb['row'] and lb['txt'] == '新建' and lb['cnt'] == 0, lb)
    check('v3.5-2 级间 12 大于级内 8；花型筛选、搜索框、列表缩略图的左边缘都离栏边 12', lb['g12'] == 12 and lb['g23'] == 12 and lb['gin'] == 8 and lb['left'] == [12, 12, 12], lb)
    check('§10 列表行：缩略图 40、名称、副信息「代号　N 层」、状态词', x.R('#libList .lib-item .th')[4] == 40 and all(re.fullmatch(r'\S+ \d+ 层', s) for s in x.E("[...document.querySelectorAll('#libList .li-s')].map(e => [...e.children].slice(0, 2).map(c => c.textContent).join(' '))")))
    check('v3.1-18 效果库当前项是很淡的底色（#1b2a2f）+ 主文字色，比结构树当前行（薄荷竖线）弱', x.C('#libList .lib-item.is-sel', 'backgroundColor') == G3 and x.C('#libList .lib-item.is-sel .li-n', 'color') == T1 and MINT in (x.C('#tree .trow.is-sel', 'boxShadow') or '') + (x.C('#tree .trow.is-sel', 'outlineColor') or '') + (x.C('#tree .trow.is-sel', 'borderTopColor') or '') and x.C('#libList .lib-item.is-sel', 'boxShadow') == 'none')
    check('v3.1-20 效果库往下长到栏底（10 个效果）', x.N('#libList .lib-item') == 10 and x.R('#libList')[3] >= x.R('#left')[3] - 1, [x.R('#libList'), x.R('#left')])
    # §12 浮层
    x.E("KIT.tip('缩放')")
    check('§12 提示框：浮层面色、带小三角、最宽 260', x.C('#ovlApp .tip', 'backgroundColor') == 'rgb(36, 55, 61)' and x.E("getComputedStyle(document.querySelector('#ovlApp .tip'), '::before').content") != 'none' and float(x.C('#ovlApp .tip', 'maxWidth')[:-2]) == 260)
    check('§12 检查器里的提示出在检查器左侧，离触发点 8 px，不盖住同一组参数', abs(x.R('#insp')[0] - x.R('#ovlApp .tip')[2] - 8) <= 1)
    x.key('Escape')
    x.click('#expBtn [data-act="exportMenu"]')
    secs = x.E("(() => { const m = document.querySelector('.menu.exp'); return {first: m.querySelector('.mi') && m.querySelector('.mi').dataset.exp, dn: !!m.querySelector('.mi[data-exp=deliv] #expDelivN.sh-cnt'), dtop: m.querySelector('.mi[data-exp=deliv]').getBoundingClientRect().bottom <= m.querySelector('.msum').getBoundingClientRect().top, sum: m.querySelector('.msum .mline').textContent, items: [...m.querySelectorAll('.mi:not([data-exp=deliv])')].map(i => i.querySelector('.mt2').textContent + ':' + (i.querySelector('.k') || {}).textContent), plat: !!m.querySelector('#expPlat.seg.sm'), wb: !!m.querySelector('#expAlsoWB'), det: m.querySelector('.mdetail').hidden} })()")
    check('v3.1-21 导出 ▾ 摘要只留一句「1 层需重新导出」，后面跟「详情」；平台、文件夹不在摘要里', secs['sum'].replace(' ', '') == '1层需重新导出详情', secs['sum'])
    check('§12 「详情」点开才出文件清单', secs['det'] is True)
    check('v3.4-2 导出 ▾ 最上面一项「资源交付」（data-exp="deliv"，计数位 #expDelivN.sh-cnt 留给外壳填）', secs['first'] == 'deliv' and secs['dn'] and secs['dtop'], secs)
    check('v3.1-21 右列只放数字，层名挪进操作名「导出本层（金锦层）」', secs['items'] == ['重新导出:1', '导出全部:3', '导出本层（金锦层）:1', '导出勾选:1'] and x.E("[...document.querySelectorAll('.menu.exp .mi .k')].every(k => /^\\d+$/.test(k.textContent))"), secs['items'])
    check('v3.2-5 导出浮层右对齐挂在下拉箭头下面，不盖住参数名（左缘在参数名一列右边 8 px 以外）', abs(x.R('.menu.exp')[2] - x.R('#expBtn [data-act="exportMenu"]')[2]) <= 1 and x.R('.menu.exp')[0] >= x.R('#pbody .prm .plw')[2] + 8 and x.R('.menu.exp')[1] - x.R('#expBtn')[3] in (4, 4.0), [x.R('.menu.exp'), x.R('#expBtn [data-act="exportMenu"]')])
    check('v3.2-5 浮层底色 #24373d、1 px 线 #39515a、有阴影', x.C('.menu.exp', 'backgroundColor') == 'rgb(36, 55, 61)' and x.C('.menu.exp', 'borderTopWidth') == '1px' and x.C('.menu.exp', 'borderTopColor') == 'rgb(57, 81, 90)' and x.C('.menu.exp', 'boxShadow') != 'none')
    check('§12 导出 ▾ 第 3 段：平台（分段 S）、「同时放进编排」勾选', secs['plat'] and secs['wb'])
    check('§12 去掉「打开贴图与交付」', '贴图与交付' not in (x.T('.menu.exp') or ''))
    x.click('.menu [data-r="det"]')
    check('§12 点「详情」出平台、位置和文件名', x.V('.menu .mdetail') and 'T_金曜菊-B_金锦层_01–05.png' in (x.T('.menu .mdetail') or '') and '平台PC+手机' in (x.T('.menu .mdetail') or '').replace(' ', '') and 'FWL_Export' in (x.T('.menu .mdetail') or ''))
    x.key('Escape')
    x.E("KIT.del('点灭星')")
    tr, mr, sh, ar = x.R('#ovlApp .toast'), x.R('#mid'), x.R('#shell'), x.R('#app')
    check('§12 提示条出在外壳提示区：外壳顶栏下方、页面顶部居中', min(abs((tr[0] + tr[2]) / 2 - (mr[0] + mr[2]) / 2), abs((tr[0] + tr[2]) / 2 - ar[4] / 2)) <= 2 and tr[1] >= sh[3] and tr[1] - mr[1] <= 12, [tr, mr])
    check('§12 制作区的提示条走外壳的 window.shellToast（同一个提示区）', x.E("typeof window.shellToast") == 'function' and x.N('#ovlApp .toast.sh-toast') == 1)
    pg.close()


def v31(b):
    """v3.1 改动单里归制作区、上面没覆盖到的条目：第 1 条（入点 / 出点 / 恢复的图标命令）、第 2 条（面包屑可点）、第 14 条（工具图标分组、建议曝光）、1366 下的同几条"""
    pg = new_page(b); x = P(pg); K = x.key
    # v3.2 第 1 条：没在编辑的层自动折叠
    rows = lambda: x.E("[...document.querySelectorAll('#tree .trow[data-id]')].slice(1).map(r => r.querySelector('.tx').textContent).join()")
    tlrows = lambda: x.E("[...document.querySelectorAll('#tlw .tlrow[data-id]')].map(r => r.dataset.id).join()") == x.E("[...document.querySelectorAll('#tree .trow[data-id]')].slice(1).map(r => r.dataset.id).join()")
    x.click('#tree .trow[data-id] .tx >> text=橙引线层')
    check('v3.2-1 选中橙引线层：它展开，金锦层自动折成一行（结构树、时间轴一样）', rows() == '橙引线层,星,火花,金锦层,点灭星' and tlrows(), rows())
    x.click('#tree .trow:has(.tx:text-is("点灭星")) .chev')
    check('v3.2-1 点开别的层照常展开', rows() == '橙引线层,星,火花,金锦层,点灭星,星' and tlrows(), rows())
    x.E("KIT.select('橙引线层/火花')"); pg.wait_for_timeout(80)
    check('v3.2-1 同一层里换选中，手动点开的层不收', rows() == '橙引线层,星,火花,金锦层,点灭星,星', rows())
    x.E("KIT.select('金锦层')"); pg.wait_for_timeout(80)
    check('v3.2-1 换到金锦层：只剩金锦层展开', rows() == '橙引线层,金锦层,星,火花,余烬,点灭星' and tlrows(), rows())
    x.E("KIT.select('点灭星/星')"); pg.wait_for_timeout(80)
    check('v3.2-1 选中别的层里的发射器（键盘、面包屑、时间轴同理）：那一层自动展开', rows() == '橙引线层,金锦层,点灭星,星' and x.T('#path') == '金曜菊-B › 点灭星 › 星', rows())
    x.E("KIT.select('金锦层')"); pg.wait_for_timeout(80)
    # 第 1 条：图标命令，悬停写全称和快捷键
    check('v3.5-5 设为入点、设为出点、恢复三个图标常显（不用悬停）', all(x.C(f'#tlw .iorow [data-act="{k}"]', 'visibility') == 'visible' for k in ('setIn', 'setOut', 'clearIO')))
    x.hover('#tlw .iorow .xv'); x.hover('#tlw .iorow [data-act="setIn"]')
    check('v3.1-1 悬停「设为入点」写全称和快捷键 [', '入点设到播放头' in (x.tip() or '') and '[' in (x.tip() or ''), x.tip())
    x.hover('#tlw .iorow [data-act="setOut"]')
    check('v3.1-1 悬停「设为出点」写全称和快捷键 ]', '出点设到播放头' in (x.tip() or '') and ']' in (x.tip() or ''), x.tip())
    x.hover('#tlw .iorow [data-act="clearIO"]')
    check('v3.1-1 悬停「恢复」写全称', '恢复' in (x.tip() or '') and '导出范围' in (x.tip() or ''), x.tip())
    pg.mouse.move(900, 400)
    check('v3.1-1 / v3.6-8 三个图标命令点击区 28 × 28，图标 16 px 线框', x.E("[...document.querySelectorAll('#tlw .iorow .btn-icon')].every(b => { const r = b.getBoundingClientRect(), i = b.querySelector('svg').getBoundingClientRect(); return r.width === 28 && r.height === 28 && i.width === 16 })") and x.C('#tlw .iorow .btn-icon svg.i', 'fill') == 'none')
    x.click('#tNow'); pg.keyboard.press('Control+a'); pg.keyboard.type('1.00'); K('Enter'); pg.mouse.click(900, 400)
    x.hover('#tlw .iorow .xv'); x.click('#tlw .iorow [data-act="setIn"]')   # v3.4 第 17 条：三个图标悬停这一行才出
    check('v3.1-1 点「设为入点」：导出范围入点 = 播放头 1.00', x.E("document.querySelector('#tlw .iorow .tnum.in').value") == '1.00' and '入点设为 1.00 s' in (x.T('#ovlApp .tip.hint') or ''), [x.E("document.querySelector('#tlw .iorow .tnum.in').value"), x.T('#ovlApp .tip.hint')])
    x.click('#tNow'); pg.keyboard.press('Control+a'); pg.keyboard.type('2.50'); K('Enter'); pg.mouse.click(900, 400)
    x.hover('#tlw .iorow .xv'); x.click('#tlw .iorow [data-act="setOut"]')
    check('v3.1-1 点「设为出点」：出点 = 2.50，读数和刻度尺上的浅底一起变', x.E("document.querySelector('#tlw .iorow .tnum.out').value") == '2.50' and x.E("(() => { const r = document.querySelector('#tlw .xrange').getBoundingClientRect(), f = document.querySelector('#tlw .rrow .fr').getBoundingClientRect(); return Math.abs((r.right - f.left) / f.width * 5.24 - 2.50) < .05 })()"))
    x.hover('#tlw .iorow .xv'); x.click('#tlw .iorow [data-act="clearIO"]')
    check('v3.1-1 点「恢复」：回到打开时 0.35–2.85', x.E("[...document.querySelectorAll('#tlw .iorow .tnum')].map(i => i.value).join()") == '0.35,2.85' and '已恢复' in (x.T('#ovlApp .tip.hint') or ''))
    # 第 2 条：面包屑
    x.click('#path button')
    check('v3.1-2 点面包屑「金曜菊-B」选中效果，面包屑只剩一项（大号）', x.T('#path') == '金曜菊-B' and x.N('#tree .trow.t-group.is-sel') == 1 and x.C('#path .cur', 'fontSize') == '15px')
    x.E("KIT.select('金锦层/星')"); pg.wait_for_timeout(80)
    check('v3.1-2 选中发射器：「金曜菊-B › 金锦层 › 星」，中间的层也能点', x.T('#path') == '金曜菊-B › 金锦层 › 星' and x.N('#path button') == 2)
    x.click('#path button:nth-of-type(2)')
    check('v3.1-2 点面包屑的层跳回层', x.T('#path') == '金曜菊-B › 金锦层')
    # 第 14 条：工具图标
    g = x.E("[...document.querySelector('#viewbar').children].map(c => c.dataset.ui || c.dataset.act)")
    # v3.6 第 3 条改写：中段左边只放文字分段，右边只放图标开关；网格在中段右端、「精简」左边 20 px 的固定槽位
    check('v3.1-14 / v3.4-8 / v3.6-3 画面这一段：画面大小分段 ｜ 空白 ｜ 网格（「精简」左边 20），「意见」在右栏工具行；左栏开关在最左，精简、右栏开关在最右', g == ['view3', None, 'grid'] and abs(x.R('#bCompact')[0] - x.R('#viewbar [data-act="grid"]')[2] - 20) <= 1 and x.N('#toolRow .tcol-m [data-act="note"]') == 0 and x.E("[...document.querySelector('#toolRow .tcol-m').children].map(c => c.id || c.className).join()").startswith('bLeft,') and x.E("[...document.querySelectorAll('#toolRow .tcol-m .pnls [data-act]')].map(b => b.dataset.act).join()") == 'compact,toggleR' and x.R('#bLeft')[2] <= x.R('#modeTabs')[0] and abs(x.R('#bRight')[2] - (x.R('#toolRow .tcol-m')[2] - 12)) <= 1, g)
    pnl = x.E("['bLeft', 'bCompact', 'bRight'].map(i => { const b = document.getElementById(i); return [b.getAttribute('aria-pressed'), getComputedStyle(b).color, getComputedStyle(b).backgroundColor, b.textContent.trim()] })")
    check('v3.4-8 栏开关开着（栏显示中）：图标薄荷、填选中底色；精简关着时不填；三个都只放图标、不写字', pnl[0][:3] == ['true', MINT, LINE] and pnl[2][:3] == ['true', MINT, LINE] and pnl[1][0] == 'false' and pnl[1][2] == 'rgba(0, 0, 0, 0)' and all(p[3] == '' for p in pnl), pnl)
    ic = x.E("Object.fromEntries(['grid', 'note', 'compact', 'pl', 'pr', 'solo'].map(k => [k, document.querySelector('#i-' + k).innerHTML]))")
    check('v3.4-7/8/9 / v3.5-1 工具图标：网格是方框里横竖各两条线（3 × 3）、精简是 12 × 12 区域的四个角（中间空）、只看是一个圆圈（直径 12）、意见是带尾巴的气泡、左右栏是窗框加列表短线', 'M2.75 2.75h10.5v10.5H2.75z' in ic['grid'] and 'M6.25 2.75v10.5m3.5-10.5v10.5M2.75 6.25h10.5M2.75 9.75h10.5' in ic['grid'] and 'M2.75 6V2.75H6m4 0h3.25V6m0 4v3.25H10m-4 0H2.75V10' in ic['compact'] and ic['solo'].strip() == '<circle cx="8" cy="8" r="5.25"></circle>' and 'L2.75 12.5z' in ic['note'] and all('h.5m-.5 2.5h.5' in ic[k] for k in ('pl', 'pr')), ic)
    check('v3.2-3 / v3.5-1 「建议曝光」是一个图标（圆里一个 A，线框），不是「A.」两个字；悬停写「按最亮时刻设曝光」', x.E("document.querySelector('#pbody .prm[data-lab=\"曝光\"] .sug use').getAttribute('href')") == '#i-auto' and x.E("(() => { const s = document.querySelector('#i-auto'); return s.innerHTML.includes('M5.9 11.1 8 6.25l2.1 4.85') && s.querySelectorAll('circle').length === 1 && ![...s.querySelectorAll('path')].some(p => p.getAttribute('fill') === 'currentColor') })()") and x.R('#pbody .prm[data-lab="曝光"] .sug svg')[4] == 16 and x.E("document.querySelector('#pbody .prm[data-lab=\"曝光\"] .sug').dataset.tip") == '按最亮时刻设曝光' and x.N('#iconDefs #i-wand') == 0)
    x.hover('#pbody .prm[data-lab="曝光"] .sug')
    check('v3.1-14 悬停「建议曝光」出提示', x.tip() == '按最亮时刻设曝光', x.tip())
    pg.mouse.move(900, 400)
    # 第 16 条：一行最多一个标记
    check('v3.1-16 每行最多一个改动标记：哪一行都不画空心圆', x.E("[...document.querySelectorAll('#pbody .prm[data-lab]')].every(r => { const mk = getComputedStyle(r.querySelector('.mk') || document.body); return !(r.querySelector('.mk') && mk.boxShadow !== 'none') })"))
    pg.close()
    # 1366 下同几条
    pg = new_page(b, 1366, 768); x = P(pg)
    check('v3.1-3 1366 右下读数常驻，不压左下读数', x.T('#ciView') == '距离 1000 m 预览曝光 1.00 倍' and x.R('#ciView')[0] > x.R('#ciBL')[2] + 20)
    io13 = x.E("(() => { const l = document.querySelector('#tlw .iorow'), g = [...l.querySelectorAll('.io-g')].map(e => e.getBoundingClientRect()); return {fit: l.scrollWidth <= l.clientWidth + 1, gaps: g.slice(1).map((r, i) => Math.round(r.left - g[i].right)), right: Math.round(l.getBoundingClientRect().right - g[g.length - 1].right), cut: [...l.querySelectorAll('.io-ck span')].some(s => s.scrollWidth > s.clientWidth + 1)} })()")
    check('v3.1-1 / v3.5-5 / v3.6-1 1366 导出范围一行放得下（读数、三个命令、两个勾选框），组间 ≥ 24，文字不截断', io13['fit'] and all(g >= 24 for g in io13['gaps']) and io13['right'] >= 12 and not io13['cut'], io13)
    check('v3.1-2 1366 面包屑「金曜菊-B › 金锦层」一行放得下', x.T('#path') == '金曜菊-B › 金锦层' and x.R('#path')[5] <= 28)
    check('v3.3-1 1366 检查器五列：96 ｜ 控件 ｜ 数值 ｜ 单位 ｜ 24；滑杆一律结束在同一条线上', re.fullmatch(r'96px [\d.]+px [\d.]+px [\d.]+px 24px', x.C('#pbody .prm[data-lab="缩放"]', 'gridTemplateColumns') or '') is not None and len(set(round(r) for r in x.E("[...document.querySelectorAll('#pbody .prm:not(.sub) .ctl1 .sl')].filter(s => s.offsetParent).map(s => s.getBoundingClientRect().right)"))) == 1, x.C('#pbody .prm[data-lab="缩放"]', 'gridTemplateColumns'))
    x.E("KIT.openExport()"); pg.wait_for_timeout(100)
    check('v3.2-5 1366 导出浮层也不盖参数名、不切面包屑', x.R('.menu.exp')[0] >= x.R('#pbody .prm .plw')[2] + 8 and x.R('.menu.exp')[0] >= max(r for r in x.E("[...document.querySelectorAll('#path > *')].map(e => e.getBoundingClientRect().right)")) + 8, [x.R('.menu.exp'), x.R('#pbody .prm .plw')])
    x.key('Escape')
    check('v3.1-6 1366 停用原因放得下数值列，不压滑杆', x.R('#pbody .prm[data-lab="湍流尺度"] .dis-why')[0] >= x.R('#pbody .prm[data-lab="湍流尺度"] .sl')[2] + 4 if x.V('#pbody .prm[data-lab="湍流尺度"]') else True)
    pg.close()


def interactions(b):
    pg = new_page(b); x = P(pg); K = x.key
    # ---- 参数：拖动、单击输入、Esc、撤销
    sl = pg.locator('#pbody .prm[data-lab="开始时间"] .sl'); bb = sl.bounding_box()
    n0 = x.E("KIT.undoN()")
    pg.mouse.move(bb['x'] + bb['width'] * .1, bb['y'] + bb['height'] / 2); pg.mouse.down(); pg.mouse.move(bb['x'] + bb['width'] * .5, bb['y'] + bb['height'] / 2, steps=6); pg.mouse.up(); pg.wait_for_timeout(80)
    check('W 拖滑杆改值', x.val('开始时间') != '0.20')
    check('W 一次拖动只记一步撤销', x.E("KIT.undoN()") == n0 + 1)
    check('W 改过的行出竖条标记', x.E("document.querySelector('#pbody .prm[data-lab=\"开始时间\"]').classList.contains('is-ed')"))
    pg.mouse.click(900, 400); K('Control+z')
    check('W Ctrl+Z 撤回整次拖动', x.val('开始时间') == '0.20')
    check('W 撤销后在操作处出「撤销：开始时间 …」', (x.T('#ovlApp .tip.hint') or '').startswith('撤销：开始时间'))
    K('Control+y')
    check('W Ctrl+Y 重做', x.val('开始时间') != '0.20')
    K('Control+z')
    pg.mouse.move(bb['x'] + bb['width'] * .1, bb['y'] + bb['height'] / 2); pg.mouse.down(); pg.mouse.move(bb['x'] + bb['width'] * .6, bb['y'] + bb['height'] / 2, steps=4); K('Escape'); pg.mouse.up(); pg.wait_for_timeout(80)
    check('W 拖动中按 Esc 取消，回到原值、不记撤销', x.val('开始时间') == '0.20' and x.T('#ovlApp .tip.hint') == '已取消')
    num = '#pbody .prm[data-lab="缩放"] .num'
    x.click(num); pg.keyboard.press('Control+a'); pg.keyboard.type('1.30'); K('Enter')
    check('W 单击数值输入，回车生效', x.val('缩放') == '1.30')
    # P1 数值框不能写进错误的值
    x.click(num); pg.keyboard.press('Control+a'); pg.keyboard.type('15')
    check('P1 越界：就地报「超出范围」，有效范围', (x.err() or '').startswith('超出范围') and '0.10–3.00' in re.sub(r'\s', '', x.err()) and 'is-error' in x.E(f"document.querySelector('{num}').className"))
    K('Enter')
    check('P1 越界回车：留在框里，不写入', x.E(f"document.activeElement === document.querySelector('{num}')") and x.E("KIT.val('kiku|' + document.querySelector('#tree .trow.is-sel').dataset.id + '|时间与缩放|缩放')") == 1.3)
    pg.keyboard.press('Control+a'); pg.keyboard.type('1.1*1.2')
    check('P1 格式不对：报「格式不对」', (x.err() or '').startswith('格式不对'))
    pg.mouse.click(900, 400); pg.wait_for_timeout(80)
    check('P1 离开时不合法：恢复原值并提示「输入无效，已恢复」', x.val('缩放') == '1.30' and x.T('#ovlApp .tip.hint') == '输入无效，已恢复')
    x.click(num); pg.keyboard.press('Control+a'); pg.keyboard.type('2.5x'); K('Escape')
    check('P1 Esc 取消输入', x.val('缩放') == '1.30')
    x.E("document.querySelector('#pbody .prm[data-lab=\"缩放\"] .pl').dispatchEvent(new MouseEvent('dblclick', {bubbles: true}))"); pg.wait_for_timeout(80)
    check('W 双击参数名恢复默认', x.val('缩放') == '1.00')
    x.hover('#pbody .prm[data-lab="缩放"] .pl'); x.click('#pbody .prm[data-lab="缩放"] .rst')   # v3.4 第 16 条：恢复悬停才出
    check('W 恢复菜单：打开时、默认', x.E("[...document.querySelectorAll('.menu .mi')].map(m => m.textContent.replace(/\\s+/g, '')).join('|')").startswith('打开时1.10倍|默认1.00倍'))
    x.click('.menu .mi[data-i="1"]')
    check('W 恢复到打开时', x.val('缩放') == '1.10')
    # 依赖、停用
    check('W / v3.3-8 关着的开关下面的参数收成标题行右侧的「+4」', x.T('#pbody .mod[data-mod="环境"] .mod-h .dep-n') == '+4')
    x.click('#pbody .mod[data-mod="环境"] [data-act="depShow"]')
    check('W 点「+4」露出收起的依赖行（停用、降透明度）', x.E("[...document.querySelectorAll('#pbody .prm.dep-in')].filter(r => !r.hidden).length") == 4 and x.C('#pbody .prm.dep-in .plw', 'opacity') == '0.5')
    x.click('#pbody .prm[data-lab="爆后扰动"] .sw')
    check('W 打开开关，依赖参数可用', x.N('#pbody .mod[data-mod="环境"] .prm.is-dep:not(.is-dis)') == 4)
    x.click('#pbody .prm[data-lab="爆后扰动"] .sw')
    x.click('#pbody .mod[data-mod="环境"] [data-act="depShow"]')
    x.hover('#pbody .prm[data-lab="湍流尺度"] .ctl1')
    check('W 停用参数悬停写原因', x.tip() == '湍流强度为 0 时无效')
    # P3 不进导出的改动不算需重新导出
    x.click('#pbody .prm[data-lab="爆后扰动"] .sw')
    dn = '#pbody .prm[data-lab="扰动开始时间"] .num'
    x.click(dn); pg.keyboard.press('Control+a'); pg.keyboard.type('0.9'); K('Enter')
    x.click('#pbody .prm[data-lab="爆后扰动"] .sw')
    x.hover('#expBtn [data-act="export"]')
    check('P3 被开关收起的项改了只算未保存，不算需重新导出', x.E("KIT.changes()") >= 1 and '扰动开始时间' not in (x.tip() or '') and x.T('#expBtn .exb') == '1', x.tip())
    check('P3 变灰的已改行保留恢复按钮', x.E("(() => { const r = document.querySelector('#pbody .prm[data-lab=\"扰动开始时间\"]'); return !!r && r.classList.contains('is-ed') && !!r.querySelector('.rst') })()"))
    x.click('#pbody .prm[data-lab="湍流强度"] .num'); pg.keyboard.press('Control+a'); pg.keyboard.type('2'); K('Enter')
    x.click('#pbody .prm[data-lab="湍流尺度"] .num'); pg.keyboard.press('Control+a'); pg.keyboard.type('80'); K('Enter')
    x.click('#pbody .prm[data-lab="湍流强度"] .num'); pg.keyboard.press('Control+a'); pg.keyboard.type('0'); K('Enter')
    pg.mouse.move(900, 400); x.hover('#expBtn [data-act="export"]')
    check('P3 失效的项（湍流强度为 0 时的湍流尺度）不算需重新导出', '湍流尺度' not in (x.tip() or ''), x.tip())
    for _ in range(5): K('Control+z')
    # 锁定
    x.hover('#pbody .prm[data-lab="风速"] .pl')
    x.click('#pbody .prm[data-lab="风速"] .lk')
    check('W 锁定：点锁，锁常亮', x.E("document.querySelector('#pbody .prm[data-lab=\"风速\"] .lk').getAttribute('aria-pressed')") == 'true' and x.C('#pbody .prm[data-lab="风速"] .lk', 'opacity') == '1')
    x.click('#pbody .prm[data-lab="风速"] .lk')
    # 模块折叠、筛选
    x.click('#pbody .mod[data-mod="出生方式"] .mod-h')
    check('W 点模块标题折叠，摘要出现', x.E("document.querySelector('#pbody .mod[data-mod=\"出生方式\"]').classList.contains('is-closed')") and x.V('#pbody .mod[data-mod="出生方式"] .ms'))
    x.click('#pbody .mod[data-mod="出生方式"] .mod-h')
    x.click('#foldAll')
    check('W 「全部折叠」', x.E("[...document.querySelectorAll('#pbody .mod')].every(m => m.classList.contains('is-closed'))") and x.T('#foldAll') == '全部展开')
    x.click('#foldAll')
    pg.locator('#pq input').fill('扰动'); pg.wait_for_timeout(100)
    check('W 参数搜索：只留匹配的行，名字里高亮', x.E("[...document.querySelectorAll('#pbody .prm[data-lab]')].filter(r => !r.hidden && !r.closest('.mod[hidden]')).every(r => r.dataset.lab.includes('扰动'))") and x.N('#pbody mark') >= 1)
    pg.locator('#pq input').fill('银柳'); pg.wait_for_timeout(100)
    check('W 搜不到：一句说明 + 一个操作', x.T('#pbody .empty') == '没有匹配「银柳」的参数 清除搜索')
    x.click('#pbody .empty [data-act="clearPq"]')
    x.click('#viewOpt'); x.click('.menu .mi[data-i="0"]')
    check('W 「筛选 ▾ → 仅已改」只留已改的行', x.T('#viewOpt') == '仅已改' and x.E("[...document.querySelectorAll('#pbody .prm[data-lab]:not(.sub)')].filter(r => !r.hidden && !r.closest('.mod[hidden]')).every(r => r.classList.contains('is-nd') || r.classList.contains('is-ed') || r.dataset.kind === 'sw')"))
    x.click('#viewOpt'); x.click('.menu .mi[data-i="0"]')
    # 建议曝光
    x.click('#pbody .prm[data-lab="曝光"] .sug')
    check('W 建议曝光一键改成 0.85', x.val('曝光') == '0.85')
    K('Control+z')
    # ---- 保存、未保存
    check('§4 有没保存的改动时「保存 •」', x.N('[data-act="save"] .dot') == 1)
    x.click('#saveSt')
    check('W 状态栏「未保存 N 项」展开，逐项列出', x.N('.menu .mi') >= 1)
    K('Escape')
    pg.mouse.click(900, 400); K('Control+s')
    check('W Ctrl+S 保存：「已保存 时间」，圆点消失', (x.T('#saveSt') or '').startswith('已保存') and x.N('[data-act="save"] .dot') == 0)
    check('W 没有改动时「还原」停用', x.E("document.getElementById('bRevert').disabled"))
    pg.close()

    # ---- 结构树
    pg = new_page(b); x = P(pg); K = x.key
    x.click('#tree .trow[data-id] .tx >> text=橙引线层')
    check('W 单击结构树行选中，检查器、时间轴、面包屑同步', x.T('#path') == '金曜菊-B › 橙引线层' and x.T('#tlw .tlrow.is-sel .lab') == '1 橙引线层')
    pg.locator('#tree .trow.is-sel').focus(); K('ArrowLeft')
    check('W ← 收起（橙引线层）', x.E("document.querySelector('#tree .trow.is-sel').getAttribute('aria-expanded')") == 'false')
    K('ArrowDown')
    check('W ↓ 选下一行', x.T('#path') == '金曜菊-B › 金锦层')
    K('ArrowLeft')
    check('W ← 收起', x.E("document.querySelector('#tree .trow.is-sel').getAttribute('aria-expanded')") == 'false')
    K('ArrowRight'); K('ArrowRight')
    check('W → 展开后再 → 进到第一个子行', x.T('#path') == '金曜菊-B › 金锦层 › 星')
    K('ArrowUp')
    # P2 改名不能重名
    K('F2'); pg.keyboard.press('Control+a'); pg.keyboard.type('点灭星'); K('Enter')
    check('P2 改名重名：就地报「已有同名层」，留在框里', x.V('#tree .ren') and '已有同名层' in (x.T('#ovlApp .tip') or ''))
    pg.keyboard.press('Control+a'); pg.keyboard.press('Delete'); K('Enter')
    check('P2 名称不能为空', '名称不能为空' in (x.T('#ovlApp .tip') or ''))
    K('Escape')
    check('P2 Esc 取消改名', not x.V('#tree .ren') and x.T('#path') == '金曜菊-B › 金锦层')
    K('F2'); pg.keyboard.press('Control+a'); pg.keyboard.type('点灭星'); pg.mouse.click(900, 400); pg.wait_for_timeout(100)
    check('P2 点到别处时不改名，提示「已有同名层，未改名」', x.T('#tree .trow.is-sel .tx') == '金锦层' and x.T('#ovlApp .tip.hint') == '已有同名层，未改名')
    pg.locator('#tree .trow.is-sel').focus(); K('F2'); pg.keyboard.press('Control+a'); pg.keyboard.type('金锦层 2'); K('Enter')
    check('W F2 改名', x.T('#tree .trow.is-sel .tx') == '金锦层 2')
    K('Control+z')
    check('W 改名可撤销', x.T('#tree .trow.is-sel .tx') == '金锦层')
    # 显示、只看
    eye = '#tree .trow.is-sel .eye'
    x.click(eye)
    check('W 隐藏：行变弱、检查器顶部提示', 'is-off' in x.E("document.querySelector('#tree .trow.is-sel').className") and x.V('#hidNote'))
    x.click('#hidNote [data-act="unhide"]')
    check('W 检查器提示里的「显示」', 'is-off' not in x.E("document.querySelector('#tree .trow.is-sel').className"))
    x.click('#tree .trow.is-sel .solo')
    x.hover('#tree .trow[data-id] .tx >> text=点灭星'); pg.locator('#tree .trow:has(.tx:text-is("点灭星")) .solo').click(); pg.wait_for_timeout(80)
    check('§0.7 只看：单击叠加', x.E("KIT.solo().join()") == '金锦层,点灭星')
    check('§0.7 只看时画面左上出提示，其余行变暗', x.V('#soloBadge') and x.N('#tree .trow.is-dim') >= 1)
    pg.locator('#tree .trow:has(.tx:text-is("橙引线层"))').hover(); pg.locator('#tree .trow:has(.tx:text-is("橙引线层")) .solo').click(modifiers=['Alt']); pg.wait_for_timeout(80)
    check('§0.7 Alt+单击只看这一项', x.E("KIT.solo().join()") == '橙引线层')
    pg.mouse.click(900, 400); K('Escape')
    check('§0.7 Esc 退出只看', x.E("KIT.solo().length") == 0 and x.T('#ovlApp .tip.hint') == '已退出只看')
    check('§0.7 / v3.5-6 只看图标是一个圆圈（直径 12、线宽 1.5、中间空）', x.E("(() => { const s = document.querySelector('#i-solo'), c = s.querySelector('circle'); return s.children.length === 1 && !!c && c.getAttribute('r') === '5.25' && !c.getAttribute('fill') })()"))
    pg.locator('#tree .trow.is-sel').focus(); K('s')
    check('W S 键加入只看', x.E("KIT.solo().join()") == '金锦层')
    pg.mouse.click(900, 400); K('Escape')
    # 删除 + 撤销提示条（P6）
    x.E("KIT.select('点灭星')"); pg.locator('#tree .trow.is-sel').focus(); K('Delete')
    check('P6 删除被引用的层，提示条说联动断开', x.toast() == '已删除「点灭星」，「金锦层」的轨迹联动已断开')
    check('W 提示条带「撤销」', x.T('#ovlApp .toast [data-r="act"], #ovlApp .toast [data-r="undo"]') == '撤销')
    x.click('#ovlApp .toast [data-r="act"], #ovlApp .toast [data-r="undo"]')
    check('W 点提示条的撤销，层回来', x.N('#tree .trow.t-layer') == 3 and x.N('#ovlApp .toast') == 0)
    x.E("KIT.select('金锦层')"); pg.wait_for_timeout(80)
    check('P6 撤销后联动恢复', x.E("[...document.querySelectorAll('#pbody .prm[data-lab=\"联动的层\"] .chk')].map(c => c.checked).join()") == 'false,true')
    x.E("KIT.del('点灭星')"); pg.mouse.click(900, 400); K('Control+z')
    check('W Ctrl+Z 也撤销删除，提示条一起收起', x.N('#tree .trow.t-layer') == 3 and x.N('#ovlApp .toast') == 0)
    x.click('#tree .trow.t-group .more') if x.V('#tree .trow.t-group .more') else (x.hover('#tree .trow.t-group'), x.click('#tree .trow.t-group .more'))
    x.click('.menu .mi >> text=删除效果…')
    check('W 不能撤销的才确认：删除效果弹对话框，焦点在「取消」', x.V('#ovlApp .dialog') and x.E("document.activeElement.dataset.r") == '0')
    K('Escape')
    check('W Esc 关对话框', not x.V('#ovlApp .dialog'))
    x.click('#tree .trow.t-group .addb')
    check('v3.4-14 效果名那一行常驻「+」，点开菜单：加层（空层、从模板…）、加发射器到「金锦层」', x.E("[...document.querySelectorAll('.menu .mh, .menu .mi')].map(m => m.textContent).join()") == '加层,空层,从模板…,加发射器到「金锦层」', x.E("[...document.querySelectorAll('.menu .mh, .menu .mi')].map(m => m.textContent).join()"))
    x.click('.menu .mi >> text=空层')
    check('W 加空白层，直接进入改名', x.N('#tree .trow.t-layer') == 4 and x.V('#tree .ren'))
    K('Escape'); K('Control+z')
    check('W 加层可撤销', x.N('#tree .trow.t-layer') == 3)
    x.E("KIT.select('金锦层')"); e0 = x.N('#tree .trow.t-emitter')
    check('v3.4-14 层行的「+」静止时不出', x.C('#tree .trow.t-layer:not(.is-sel) .adde', 'display') == 'none')
    x.hover('#tree .trow:has(.tx:text-is("点灭星")) .tx')
    check('v3.4-14 悬停层行：显示、只看、⋯ 前面多一个「+」，悬停写「加发射器到「点灭星」」', x.E("(() => { const r = [...document.querySelectorAll('#tree .trow.t-layer')].find(t => t.querySelector('.tx').textContent === '点灭星'); const a = [...r.querySelectorAll('.acts .btn')].filter(b => getComputedStyle(b).display !== 'none' && getComputedStyle(b).visibility !== 'hidden').map(b => b.className.split(' ').pop()); return a.join() })()") == 'adde,eye,solo,more' and x.E("[...document.querySelectorAll('#tree .trow.t-layer .adde')].pop().dataset.tip") == '加发射器到「点灭星」')
    x.click('#tree .trow:has(.tx:text-is("点灭星")) .adde')
    check('W 加发射器（层行的「+」）：加在这一层下面', x.N('#tree .trow.t-emitter') > e0 and x.E("KIT.sel()") == '新发射器' and x.T('#path').startswith('金曜菊-B › 点灭星'), [x.T('#path')])
    K('Escape'); K('Control+z')
    check('v3.4-14 结构树下面没有「+ 加层 ▾　+ 加发射器」那一行', x.N('#left [data-act="addLayer"], #left [data-act="addEmit"], #tree .t-add') == 0 and not x.V('#treeFoot'))
    # 需重新导出标记 → 输出模块
    x.click('#tree .trow:has(.tx:text-is("金锦层")) .stl')
    check('W 点层行的三角跳到「输出」模块', x.E("!document.querySelector('#pbody .mod[data-mod=\"输出\"]').classList.contains('is-closed')"))
    pg.close()

    # ---- 时间轴
    pg = new_page(b); x = P(pg); K = x.key
    fr = pg.locator('#tlw .rrow .fr').bounding_box()
    pg.mouse.click(fr['x'] + fr['width'] * .5, fr['y'] + 20); pg.wait_for_timeout(80)
    check('W 在刻度尺上点一下，播放头跳过去', abs(x.E("KIT.t()") - 2.62) < .05, x.E("KIT.t()"))
    pg.mouse.move(fr['x'] + fr['width'] * .5, fr['y'] + 20); pg.mouse.down(); pg.mouse.move(fr['x'] + fr['width'] * .2, fr['y'] + 20, steps=4); K('Escape'); pg.mouse.up()
    check('W 拖播放头时 Esc 取消', abs(x.E("KIT.t()") - 2.62) < .05)
    h = pg.locator('#tlw .xh.out').bounding_box()
    pg.mouse.move(h['x'] + 4, h['y'] + 10); pg.mouse.down(); pg.mouse.move(h['x'] + 4 + fr['width'] * .1, h['y'] + 10, steps=5); pg.mouse.up(); pg.wait_for_timeout(80)
    check('W 拖刻度尺上的把手改导出范围', x.E("document.querySelector('#tlw .iorow .tnum.out').value") != '2.85')
    check('W 改导出范围后金锦层还是需重新导出，记一步撤销', x.E("KIT.stale().join()") == '金锦层')
    K('Control+z')
    check('W 撤销导出范围', x.E("document.querySelector('#tlw .iorow .tnum.out').value") == '2.85')
    # 范围上方的输入（P7）
    x.click('#tlw .iorow .tnum.in')
    pg.keyboard.type('0.50'); K('Tab')
    check('P7 从入点框按 Tab 跳到出点框（全选）', x.E("document.activeElement.classList.contains('out')") and x.E("document.activeElement.selectionStart === 0 && document.activeElement.selectionEnd === document.activeElement.value.length"))
    check('P7 入点已提交', x.E("document.querySelector('#tlw .iorow .tnum.in').value") == '0.50')
    pg.keyboard.type('2.40'); K('Enter')
    check('W 出点回车生效', x.E("document.querySelector('#tlw .iorow .tnum.out').value") == '2.40')
    t0 = x.E("KIT.t()")
    x.click('#tlw .iorow .tnum.out'); pg.keyboard.type('.,'); pg.keyboard.press('ArrowLeft'); pg.keyboard.press(' ')
    check('P7 焦点在输入框里时，. , ← 空格等全局快捷键不响应', x.E("KIT.t()") == t0 and not x.E("document.querySelector('#transport [data-act=\"play\"]').getAttribute('aria-label') === '暂停'"))
    K('Escape')
    x.click('#tlw .iorow .tnum.out'); pg.keyboard.press('Control+a'); pg.keyboard.type('9'); K('Enter')
    check('W 越界就地报错，有效范围', (x.err() or '').startswith('超出范围'))
    K('Escape')
    x.click('#tNow'); pg.keyboard.press('Control+a'); pg.keyboard.type('1.00'); K('Enter')
    check('W 单击当前时间输入', abs(x.E("KIT.t()") - 1.0) < 1e-6)
    pg.mouse.click(900, 400)
    K('['); K('Control+z')
    K('.'); K('.')
    check('W . 逐帧往后', abs(x.E("KIT.t()") - (1.0 + 2 / 30)) < 1e-3)
    K(','); K('ArrowRight'); K('Shift+ArrowLeft')
    check('W , ← → Shift 走 10 帧', abs(x.E("KIT.t()") - (1.0 + 1 / 30 + 1 / 30 - 10 / 30)) < 1e-3)
    x.E("KIT.select('金锦层')"); pg.mouse.click(900, 400); K('[')
    check('W [ 把导出范围的入点设到播放头', abs(float(x.E("document.querySelector('#tlw .iorow .tnum.in').value")) - x.E("KIT.t()")) < .02 and '导出范围' in (x.T('#ovlApp .tip.hint') or ''))
    K('Control+z')
    x.E("KIT.select('金锦层/星')"); pg.mouse.click(900, 400)
    K(']')
    check('v3.1-1 选中发射器时 ] 也改导出范围（和行名格的图标命令一致）', abs(float(x.E("document.querySelector('#tlw .iorow .tnum.out').value")) - x.E("KIT.t()")) < .02 and '导出范围' in (x.T('#ovlApp .tip.hint') or ''))
    K('Control+z')
    em = x.E("[...document.querySelectorAll('#tlw .iorow .io-emit .btn-icon')].map(b => b.dataset.act).join()")
    x.click('#tlw .iorow [data-act="emIn"]')
    check('v3.1-1 / v3.5-5 选中发射器时导出范围一行多一组「发射时段」：设为入点 / 设为出点 / 恢复（原来在「选项 ▾」里）', em == 'emIn,emOut,emClear' and x.T('#tlw .iorow .io-emit .io-k') == '发射时段' and '发射时段' in (x.T('#ovlApp .tip.hint') or ''), [em, x.T('#ovlApp .tip.hint')])
    K('Control+z')
    x.E("KIT.select('金锦层')"); pg.wait_for_timeout(80)
    check('§8 / v3.5-5 选中层时这一行只有导出范围一组和开关；页面上没有「选项 ▾」', x.N('#tlw .iorow .io-emit') == 0 and x.N('[data-act="tlOpts"]') == 0 and '选项' not in (x.T('#transport') or ''))
    x.pg.locator('#tlw .xrange').click(button='right', position={'x': 12, 'y': 22}); pg.wait_for_timeout(80)
    check('§8 范围的右键菜单：设为入点 / 设为出点 / 恢复', x.E("[...document.querySelectorAll('.menu .mi')].slice(0, 3).map(m => m.textContent.replace(/[\\[\\]\\s]/g, '')).join()") == '设为入点,设为出点,恢复')
    K('Escape')
    # 拖层条、发射器两端
    x.E("KIT.select('金锦层/星')")
    bar = pg.locator('#tlw .tlrow.is-sel .bar-e').bounding_box()
    pg.mouse.move(bar['x'] + bar['width'] / 2, bar['y'] + 1); pg.mouse.down(); pg.mouse.move(bar['x'] + bar['width'] / 2 + 40, bar['y'] + 1, steps=5); pg.mouse.up(); pg.wait_for_timeout(80)
    check('W 拖时段条平移', abs(pg.locator('#tlw .tlrow.is-sel .bar-e').bounding_box()['x'] - bar['x'] - 40) < 6)
    K('Control+z')
    check('W 拖时段可撤销', abs(pg.locator('#tlw .tlrow.is-sel .bar-e').bounding_box()['x'] - bar['x']) < 2)
    check('§8 发射器两端悬停时出把手', x.N('#tlw .tlrow.is-sel .bar-e .bh') == 2)
    # 播放
    pg.mouse.click(900, 400); K(' ')
    check('W 空格播放', x.E("document.querySelector('#transport [data-act=\"play\"]').getAttribute('aria-label')") == '暂停')
    K(' '); K('r')
    check('W R 重播', x.E("KIT.t()") < .5); K(' ')
    x.click('#transport [data-act="loop"]')
    check('W 循环是图标开关', x.E("document.querySelector('#transport [data-act=\"loop\"]').getAttribute('aria-pressed')") == 'false')
    # 胶片悬停放大
    x.click('#tlw .iorow .io-ck:has([data-opt="optFollow"])'); x.E("KIT.select('橙引线层')"); pg.wait_for_timeout(80)
    o1 = x.E("document.querySelector('#tlw .iorow [data-opt=optFollow]').checked"); x.click('#tlw .iorow .io-ck:has([data-opt="optFollow"])'); x.E("KIT.select('金锦层')"); pg.wait_for_timeout(80)
    check('v3.5-5 「一并移动」点一下就关（换一层重画后照样是关）、再点开（不用打开菜单）', o1 is False and x.E("document.querySelector('#tlw .iorow [data-opt=optFollow]').checked") is True)
    pg.mouse.move(900, 400)
    # 分隔条
    v = pg.locator('#vsplit').bounding_box(); n0 = x.E("+document.querySelector('#tlw .tl').style.getPropertyValue('--tl-n')")
    pg.mouse.move(v['x'] + 300, v['y']); pg.mouse.down(); pg.mouse.move(v['x'] + 300, v['y'] - 56, steps=5)
    check('§3 / v3.2-9 拖分隔条时线变亮（#b4c5cb，不用薄荷）', x.C('#vsplit', 'backgroundColor') == 'rgb(180, 197, 203)')
    pg.mouse.up()
    check('W 往上拖画面与时间轴之间的线，时间轴多两行', x.E("+document.querySelector('#tlw .tl').style.getPropertyValue('--tl-n')") == n0 or x.N('#tlw .tlrow[data-id]') <= n0)
    x.E("document.getElementById('vsplit').dispatchEvent(new MouseEvent('dblclick', {bubbles: true}))")
    pg.close()

    # ---- 画面、预览设置、视图
    pg = new_page(b); x = P(pg); K = x.key
    check('v3.4-5 「预览设置」按钮去掉了', x.N('#wsBaker [data-act="preview"]') == 0 and '预览设置' not in (x.T('#toolRow') or ''))
    pg.locator('#stage .vp').click(button='right', position={'x': 600, 'y': 300}); pg.wait_for_timeout(80)
    check('v3.4-5 背景、安全框在画面的右键菜单里（距离、预览曝光常驻画面右下）', x.N('.menu .vrow') == 0 and x.E("[...document.querySelectorAll('.menu .mi')].map(m => m.textContent.trim()).join()").startswith('夜空,纯黑,安全框'), x.E("[...document.querySelectorAll('.menu .mi')].map(m => m.textContent.trim()).join()"))
    K('Escape')
    pg.locator('#ciView .vi[data-lab="距离"] .num').click(); pg.keyboard.press('Control+a'); pg.keyboard.type('1500'); K('Enter')
    check('v3.1-3 单击画面右下的距离输入 1500，读数跟着变', x.T('#ciView') == '距离 1500 m 预览曝光 1.00 倍', x.T('#ciView'))
    pg.mouse.click(900, 400); K('Control+z')
    check('v3.1-3 距离只改预览：不进撤销、不算未保存的改动', x.T('#ciView') == '距离 1500 m 预览曝光 1.00 倍' and x.E("KIT.changes()") == 0, [x.T('#ciView'), x.E("KIT.changes()")])
    pg.locator('#ciView .vi[data-lab="距离"] .num').click(); pg.keyboard.press('Control+a'); pg.keyboard.type('1000'); K('Enter')
    eb = pg.locator('#ciView .vi[data-lab="预览曝光"] .num').bounding_box()
    pg.mouse.move(eb['x'] + eb['width'] / 2, eb['y'] + eb['height'] / 2); pg.mouse.down(); pg.mouse.move(eb['x'] + eb['width'] / 2 + 40, eb['y'] + eb['height'] / 2, steps=5); pg.mouse.up(); pg.wait_for_timeout(80)
    check('v3.1-3 左右拖动预览曝光改值', x.E("document.querySelector('#ciView .vi[data-lab=\"预览曝光\"] .num').value") != '1.00')
    pg.locator('#ciView .vi[data-lab="预览曝光"] .num').click(); pg.keyboard.press('Control+a'); pg.keyboard.type('1.00'); K('Enter'); pg.mouse.click(900, 400)
    x.click('#viewbar [data-act="grid"]')
    check('W 网格叠加是图标开关', x.V('#cgrid') and x.E("document.querySelector('#viewbar [data-act=\"grid\"]').getAttribute('aria-pressed')") == 'true')
    x.click('#viewbar .seg[data-ui="view3"] button[data-v="1:1"]')
    check('W 缩放分段切换', x.E("document.querySelector('#viewbar .seg[data-ui=\"view3\"] button[aria-pressed=\"true\"]').dataset.v") == '1:1')
    pg.mouse.click(900, 400); K('f')
    check('W F 精简布局：收起左右栏', not x.V('#left') and not x.V('#insp'))
    K('f'); K('l')
    check('W L 隐藏左栏', not x.V('#left') and x.V('#insp'))
    K('l'); K('p')
    check('W P 隐藏右栏，工具行右段跟着收', not x.V('#insp'))
    K('p'); K('?')
    check('W ? 打开快捷键表', x.V('#ovlApp .keys'))
    K('Escape')
    check('W Esc 关快捷键表', not x.V('#ovlApp .keys'))
    pg.close()

    # ---- 导出（宪章 0.9）
    pg = new_page(b); x = P(pg); K = x.key
    x.E("window.__exp = []; window.shellAfterExport = a => window.__exp.push(a)")
    x.click('#expBtn [data-act="export"]'); pg.wait_for_timeout(1200)
    check('§0.9 导出完成后照旧调用 window.shellAfterExport', x.E("window.__exp.filter(Boolean).length") == 1 and x.E("window.__exp.filter(Boolean)[0].name") == '金曜菊-B' and x.E("window.__exp.filter(Boolean)[0].layers.join()") == '金锦层' and x.E("['pc', 'mobile', 'alsoWB'].every(k => k in window.__exp.filter(Boolean)[0])"))
    check('W 导出后提示条写「已导出 金锦层：PC 5 张、手机 3 张」', (x.toast() or '').startswith('已导出 金锦层：PC 5 张、手机 3 张'))
    check('W / v3.6-2 导出后按钮只写「导出」（「▲1」消失），层行三角消失', not x.V('#expBtn .exb') and x.T('#expBtn [data-act="export"]') == '导出' and x.N('#tree .stl') == 0)
    x.click('#expBtn [data-act="exportMenu"]')
    check('W 全部已导出时摘要写「全部已导出」', (x.T('.menu .msum .mline b') or '').startswith('全部已导出'))
    x.click('#expPlat button[data-v="PC"]')
    check('W 导出菜单的平台分段：只选 PC，详情里的平台跟着变', x.E("document.querySelector('#expPlat button[aria-pressed=\"true\"]').dataset.v") == 'PC' and '平台PC位置' in (x.T('.menu .mdetail') or '').replace(' ', ''), x.T('.menu .mdetail'))
    x.click('.menu .mi[data-exp="all"]'); pg.wait_for_timeout(1200)
    check('W 只导出 PC：提示条只写 PC', (x.toast() or '').startswith('已导出') and '手机' not in x.toast())
    check('§0.9 制作区不依赖 #wsImport、#wsWB', not re.search(r'wsImport|wsWB', (SRC / 'script_main.js').read_text(encoding='utf-8')))
    pg.close()

    # ---- P5 输出模块和交付表联动；贴图与交付
    pg = new_page(b); x = P(pg); K = x.key
    x.E("KIT.mode('贴图与交付')"); pg.wait_for_timeout(100)
    # v3.6 第 3 条改写：「文件夹」挪到交付表表头（「打开文件夹」），「显示 16 %」挪到贴图右下；格子线和构图网格同一个槽位
    pg.wait_for_timeout(200)
    check('W / v3.6-3 序列贴图：工具行换成平台、预览方式，格子线在构图网格的槽位（「精简」左边 20）；「文件夹」在交付表表头（悬停写「打开导出文件夹」），「显示 n %」在贴图右下', x.N('#viewbar .seg[data-ui="plat"]') == 1 and x.N('#viewbar .seg[data-ui="dview"]') == 1 and x.N('#viewbar [data-act="openFolder"], #viewbar #delivZoom') == 0 and abs(x.R('#bCompact')[0] - x.R('#viewbar [data-act="atlasGrid"]')[2] - 20) <= 1 and x.T('#deliv .dh [data-act="openFolder"]') == '文件夹' and (x.T('#deliv .pager #delivZoom') or '').startswith('显示') and abs(x.R('#delivZoom')[2] - x.R('#deliv .sheet')[2]) <= 1, [x.R('#viewbar [data-act="atlasGrid"]'), x.T('#delivZoom')])
    check('§7 交付表不再有状态列', x.N('#deliv .dtable .st-cell') == 0)
    check('W 交付表默认勾选需重新导出的层', x.E("[...document.querySelectorAll('#deliv [data-dchk]')].filter(c => c.checked).length") == 1)
    pg.locator('#deliv tbody tr').nth(0).click(); pg.wait_for_timeout(80)
    check('W 点交付表的行，结构树跟着选中', x.T('#path') == '金曜菊-B › 橙引线层')
    x.E("KIT.select('金锦层')")
    x.click('#pbody .mod[data-mod="输出"] .mod-h') if x.E("document.querySelector('#pbody .mod[data-mod=\"输出\"]').classList.contains('is-closed')") else None
    x.click('#pbody .prm[data-lab="手机"] .sw')
    check('P5 关掉手机，交付表这一层手机三格写「—」', x.E("[...document.querySelectorAll('#deliv tbody tr.is-sel td')].slice(5).map(t => t.textContent).join()") == '—,—,—')
    x.click('#expBtn [data-act="exportMenu"]'); x.click('.menu [data-r="det"]')
    check('P5 导出面板写「金锦层：手机已关」', '金锦层：手机已关' in (x.T('.menu .mdetail') or ''))
    K('Escape'); x.click('#pbody .prm[data-lab="手机"] .sw')
    pg.locator('#pbody .prm[data-lab="单格"] select').select_option('512 px'); pg.wait_for_timeout(80)
    check('P5 单格改成 512 px，交付表跟着写 512', x.E("document.querySelector('#deliv tbody tr.is-sel td:nth-child(3)').textContent") == '512px')
    x.click('#viewbar .seg[data-ui="dview"] button[data-v="逐帧"]')
    check('W 逐帧：一次看一帧，格子线按钮停用并写原因', x.N('#deliv .sheet.one') == 1 and x.E("document.querySelector('#viewbar [data-act=\"atlasGrid\"]').disabled"))
    x.click('#deliv [data-act="pg"][data-d="1"]')
    check('W 翻页', '21' in (x.T('#deliv .pager') or ''))
    pg.close()

    # ---- 效果库
    pg = new_page(b); x = P(pg); K = x.key
    x.click('#libChips button[data-v="尾缀"]')
    check('W 筛选块（分段 S）：尾缀 4 个', x.N('#libList .lib-item') == 4, x.N('#libList .lib-item'))
    x.click('#libChips button[data-v="全部"]')
    pg.locator('#libQ input').fill('CS3'); pg.wait_for_timeout(80)
    check('W 搜索代号', x.N('#libList .lib-item') == 2 and x.N('#libList mark') == 2)
    pg.locator('#libQ input').fill(''); pg.wait_for_timeout(80)
    x.click('#libTabs .tab[data-v="模板"]')
    check('W 「模板」标签：二级标签和网格', x.V('#libSub') and x.N('#libList .tpl') > 6)
    x.click('#libTabs .tab[data-v="效果"]')
    x.hover('#libTabs .tab[data-v="模板"]'); x.click('#libToggle')
    check('W / v3.4-15 悬停标签行时出的收起图标收起效果库', not x.V('#libList'))
    x.click('#libTabs .tab[data-v="效果"]')
    check('v3.4-15 收起后点标签展开', x.V('#libList'))
    pg.locator('#splitter').dblclick(); pg.wait_for_timeout(80)
    check('v3.4-15 双击结构树和效果库之间的分隔线收起效果库，再双击展开', not x.V('#libList') and (pg.locator('#splitter').dblclick() or True) and x.V('#libList'))
    x.click('#pbody .prm[data-lab="风速"] .sl')
    x.click('#libList .lib-item[data-lib="spk"]')
    check('W 有未保存时切换效果先问「保存 / 不保存 / 取消」', x.E("[...document.querySelectorAll('#ovlApp .dialog .btn')].map(b => b.textContent).join()") == '保存,不保存,取消')
    x.click('#ovlApp .dialog [data-r="drop"]')
    check('W 选「不保存」后切到仙女棒', x.T('#tree .trow.t-group .tx') == '仙女棒 快慢火星与轻气流')
    pg.close()

    # ---- 1366（Q）
    pg = new_page(b, 1366, 768); x = P(pg)
    check('§1 1366 字号 11 / 12 / 14', set(x.E("(() => { const s = new Set(); for (const el of document.querySelectorAll('#wsBaker *')) { const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (own && el.getBoundingClientRect().width && getComputedStyle(el).visibility !== 'hidden') s.add(getComputedStyle(el).fontSize) } return [...s] })()")) <= {'11px', '12px', '14px'})
    check('§2 1366 栏宽：左 260、右 380', x.R('#left')[4] == 260 and x.R('#insp')[4] == 380)
    check('§8 1366 时间轴至少 4 行', x.E("+document.querySelector('#tlw .tl').style.getPropertyValue('--tl-n')") >= 4)
    check('Q2 1366 下层只展开最常用的「时间与缩放」', x.E("[...document.querySelectorAll('#pbody .mod')].filter(m => !m.classList.contains('is-closed')).map(m => m.dataset.mod).join()") == '时间与缩放')
    x.E("KIT.set('scene','spk')"); pg.wait_for_timeout(150)
    check('Q2 1366 下仙女棒发射器只展开「大小与亮度」', x.E("[...document.querySelectorAll('#pbody .mod')].filter(m => !m.classList.contains('is-closed')).map(m => m.dataset.mod).join()") == '大小与亮度')
    check('§9 1366 区间「0.30–1.65」不压到滑杆', x.R('#pbody .prm[data-lab="大小"] .vv')[0] >= x.R('#pbody .prm[data-lab="大小"] .sl')[2] + 2)
    check('§2 1366 所有滑杆（单值、区间）结束在同一条线上', len(set(round(r) for r in x.E("[...document.querySelectorAll('#pbody .prm:not(.sub) .ctl1 .sl')].filter(s => s.offsetParent).map(s => s.getBoundingClientRect().right)"))) == 1)
    check('Q1 1366 播放条不溢出', x.E("(() => { const t = document.getElementById('transport'); return t.scrollWidth <= t.clientWidth })()"))
    check('§2 1366 工具行两段都不溢出', x.E("[...document.querySelectorAll('#toolRow .tcol')].every(c => c.scrollWidth <= c.clientWidth + 1)"))
    pg.close()

    # ---- 撤销提示条的时长与悬停（虚拟时钟）
    pc = new_page(b, clock=True); x = P(pc)
    pc.evaluate("KIT.del('点灭星')")
    check('W 删除后出提示条', x.N('#ovlApp .toast') == 1)
    pc.clock.run_for(10000)
    check('W 10 秒后仍在', x.N('#ovlApp .toast') == 1)
    pc.clock.run_for(2500)
    check('W 12 秒后自动消失', x.N('#ovlApp .toast') == 0)
    pc.evaluate("KIT.del('橙引线层')")
    tb = pc.locator('#ovlApp .toast').bounding_box()
    pc.mouse.move(tb['x'] + 20, tb['y'] + tb['height'] / 2); pc.clock.run_for(25000)
    check('W 悬停时不消失', x.N('#ovlApp .toast') == 1)
    pc.mouse.move(900, 600); pc.clock.run_for(11000)
    check('W 移开后重新计时', x.N('#ovlApp .toast') == 1)
    pc.clock.run_for(1500)
    check('W 移开 12 秒后消失', x.N('#ovlApp .toast') == 0)
    pc.close()


def ink_x(pg, x0, y0, x1, y1, d=40):
    """截图量墨迹：从 x0 往右第一列比背景亮 d 以上的像素（量折叠箭头、文字真正画在哪）"""
    im = Image.open(io.BytesIO(pg.screenshot(clip={'x': x0, 'y': y0, 'width': x1 - x0, 'height': y1 - y0}))).convert('L')
    px, (w, h) = im.load(), im.size
    bg = sorted(px[0, y] for y in range(h))[h // 2]
    for xx in range(w):
        if any(px[xx, y] > bg + d for y in range(h)):
            return x0 + xx
    return None


def frames(x):
    """v3.4 第 17 条：帧数只在画面左下「帧 50 / 75」，播放条不写。返回 (画面读数 (词, 数, 总数), 播放条里有没有「帧」)"""
    bl = re.search(r'(\S+) (\d+|—) / (\d+)$', x.T('#ciBL') or '')
    return (bl.groups() if bl else None, '帧' in (x.T('#transport') or ''))


def v33(b):
    """v3.3 改动单制作区第 1–15 条（修 bug 的条目先写成能复现的检查）"""
    # 第 9 条：帧计数一致——画面读数和播放条同一时刻同一个数、同一个词，从 1 数
    for scene, t in (('kiku', None), ('spk', None)):
        pg = new_page(b); x = P(pg)
        if scene == 'spk':
            x.E("KIT.set('scene','spk')"); pg.wait_for_timeout(150)
        a, c = frames(x)
        check(f'v3.3-9 / v3.4-17 {scene} 默认时刻：画面左下写「帧 N / 总数」，播放条不再写帧', a and a[0] == '帧' and not c, [x.T('#ciBL'), x.T('#transport')])
        tin =float(x.E("document.querySelector('#tlw .iorow .tnum.in').value"))
        x.click('#tNow'); pg.keyboard.press('Control+a'); pg.keyboard.type(f'{tin:.2f}'); x.key('Enter'); pg.mouse.click(900, 400)
        a, c = frames(x)
        check(f'v3.3-9 {scene} 播放头在导出范围入点：第 1 帧（从 1 数）', a and a[1] == '1', [x.T('#ciBL')])
        x.key('.'); x.key('.')
        a, c = frames(x)
        check(f'v3.3-9 {scene} 逐帧往后两帧：读数跟着变成 3', a and a[1] == '3', [x.T('#ciBL')])
        pg.close()
    pg = new_page(b); x = P(pg)
    check('v3.3-9 「上一 tick」「下一 tick」改成「上一帧」「下一帧」，时间工具悬停不写 tick', 'tick' not in (x.E("document.querySelector('#transport [data-act=\"timeTools\"]').dataset.tip") or '') and (x.click('#transport [data-act="timeTools"]') or True) and 'tick' not in (x.T('.menu') or '') and '上一帧' in (x.T('.menu') or ''), x.T('.menu'))
    x.key('Escape')
    pg.close()

    # 第 2、3、10、11 条：状态色、播放头、开关、滑杆
    pg = new_page(b); x = P(pg)
    check('v3.3-2 效果库「待验收」用主文字色，不用琥珀', x.E("(() => { const s = [...document.querySelectorAll('#libList .st')].find(e => e.textContent === '待验收'); return s && getComputedStyle(s).color })()") == T1)
    amber = x.E("[...document.querySelectorAll('#wsBaker *')].filter(e => { const c = getComputedStyle(e); return e.getBoundingClientRect().width && [c.color, c.backgroundColor].some(v => v && v.includes('224, 178, 90')) }).map(e => e.closest('#libList') ? '效果库' : e.id || String(e.className.baseVal ?? e.className))")
    check('v3.3-2 / v3.6-2 琥珀只给异常和要处理的警告（结构树层行三角、导出按钮里的「▲1」），效果库里没有琥珀', '效果库' not in amber and 'exb' in amber, amber)
    ph = x.E("(() => { const p = document.querySelector('#tlw .ph'), h = p.querySelector('i'); return [getComputedStyle(p).backgroundColor, getComputedStyle(h).backgroundColor, p.getBoundingClientRect().width] })()")
    check('v3.3-3 播放头一个颜色：头和线都是薄荷，线宽 1 px', ph[0] == MINT and ph[1] == MINT and ph[2] == 1, ph)
    sw = lambda sel: x.E("s => { const e = document.querySelector(s), c = getComputedStyle(e), a = getComputedStyle(e, '::after'), r = e.getBoundingClientRect(); return {w: r.width, h: r.height, bg: c.backgroundColor, bd: c.borderTopColor, bw: c.borderTopWidth, rad: parseFloat(c.borderTopLeftRadius), op: c.opacity, kx: parseFloat(a.left), kbg: a.backgroundColor, krad: parseFloat(a.borderTopLeftRadius)} }", sel)
    on, off = sw('#pbody .prm[data-lab="发射器共用"] .sw'), sw('#pbody .prm[data-lab="水平镜像"] .sw')
    check('v3.3-10 开关不小于 26 × 14，圆角不超过 2 px', on['w'] >= 26 and on['h'] >= 14 and on['rad'] <= 2 and on['krad'] <= 2, on)
    check('v3.3-10 / v3.4-11 开：轨道薄荷实心、方块底色、方块在右', on['bg'] == MINT and on['kbg'] == 'rgb(17, 29, 33)' and on['kx'] > on['w'] / 2 - 2, on)
    check('v3.3-10 关：轨道只画 1 px 线框、方块次文字色、方块在左', off['bg'] == 'rgba(0, 0, 0, 0)' and off['bw'] == '1px' and off['kbg'] == T2 and off['kx'] < off['w'] / 2 - 4, off)
    dis = x.E("(() => { const s = document.createElement('input'); s.type = 'checkbox'; s.className = 'sw'; s.disabled = true; document.querySelector('#pbody').appendChild(s); const c = getComputedStyle(s), r = [c.opacity, c.borderTopStyle]; s.remove(); return r })()")
    check('v3.3-10 停用：整体降到 40 % 不透明度', dis[0] == '0.4', dis)
    sl = x.E("(() => { const s = document.querySelector('#pbody .prm[data-lab=\"缩放\"] .sl'), k = s.querySelector('.sl-k'), f = s.querySelector('.sl-f'), b = getComputedStyle(s, '::before'), kr = k.getBoundingClientRect(); return {kw: kr.width, kh: kr.height, kbg: getComputedStyle(k).backgroundColor, fh: f.getBoundingClientRect().height, fbg: getComputedStyle(f).backgroundColor, th: parseFloat(b.height), tbg: b.backgroundColor, hit: s.getBoundingClientRect().height} })()")
    check('v3.3-11 滑杆拖块 4 × 14 实心、主文字色', sl['kw'] == 4 and sl['kh'] == 14 and sl['kbg'] == T1, sl)
    check('v3.3-11 / v3.4-11 轨道已填的部分薄荷 2 px（拖块仍是主文字色），没填的部分 1 px 线色', sl['fh'] == 2 and sl['fbg'] == MINT and sl['kbg'] == T1 and sl['th'] == 1 and sl['tbg'] == LINE, sl)
    ck = x.E("(() => { const c = document.querySelector('#pbody .prm[data-lab=\"联动的层\"] .chk:checked'); return c && [getComputedStyle(c).backgroundColor, getComputedStyle(c, '::after').borderRightColor] })()")
    check('v3.4-11 勾选框勾上：薄荷底加深色勾', ck and ck[0] == MINT and ck[1] == 'rgb(6, 42, 35)', ck)
    check('v3.3-11 滑杆可点区域高度不小于 20 px', sl['hit'] >= 20, sl)
    pg.close()

    # 第 1 条：数字竖向对齐
    for w, h in ((1920, 1080), (1366, 768)):
        pg = new_page(b, w, h); x = P(pg); S = f'{w}'
        eq = x.E("[12, 13, 11].map(fs => { const s = document.createElement('span'), n = document.querySelector('#pbody .num'); s.style.cssText = `position:absolute;white-space:pre;font-family:${getComputedStyle(n).fontFamily};font-size:${fs}px;font-variant-numeric:tabular-nums`; document.body.appendChild(s); s.textContent = '1'; const a = s.getBoundingClientRect().width; s.textContent = '8'; const b = s.getBoundingClientRect().width; s.remove(); return [fs, a, b] })")
        check(f'v3.3-1 {S} 实测等宽数字：同一字号下「1」和「8」一样宽（11 / 12 / 13 px）', all(abs(a - b) < .01 for _, a, b in eq) and x.C('#pbody .num', 'fontVariantNumeric') == 'tabular-nums', eq)
        for scene in ('kiku', 'spk'):
            if scene == 'spk':
                x.E("KIT.set('scene','spk')"); pg.wait_for_timeout(200); x.E(DOT_JS)
            A = x.E("(() => { const rows = [...document.querySelectorAll('#pbody .prm')].filter(__vis); const v = rows.filter(r => r.matches('[data-kind=num]:not(.is-dis), .ro') && r.querySelector('.vu .num')), g = rows.filter(r => r.matches('.range'));"
                    " return {dots: v.map(r => [r.dataset.lab, __dot(r.querySelector('.vu .num'))]), hi: g.map(r => [r.dataset.lab, __dot(r.querySelector('.vv .num:not(.lo)'))]), lo: g.map(r => [r.dataset.lab, __dot(r.querySelector('.vv .num.lo'))]),"
                    " units: rows.filter(r => r.querySelector('.vu > .u') && r.querySelector('.vu > .u').textContent).map(r => [r.dataset.lab, r.querySelector('.vu > .u').getBoundingClientRect().left]),"
                    " right: [...new Set(v.map(r => Math.round(r.querySelector('.vu').getBoundingClientRect().right)))], sl: [...new Set(rows.filter(r => r.querySelector(':scope > .ctl1 .sl')).map(r => Math.round(r.querySelector('.ctl1 .sl').getBoundingClientRect().right)))]} })()")
            d = [p[1] for p in A['dots']] + [p[1] for p in A['hi']]
            check(f'v3.3-1 {S} {scene} 数值格右对齐，同一列小数点对齐（整数按个位后面对齐）', len(d) >= 3 and max(d) - min(d) <= 1, A['dots'] + A['hi'])
            u = [p[1] for p in A['units']]
            check(f'v3.3-1 {S} {scene} 单位放在数值后面一个固定宽度的位置：每行单位左缘一条线', len(u) >= 2 and max(u) - min(u) <= 1, A['units'])
            check(f'v3.3-1 {S} {scene} 滑杆仍在同一条线结束（v3.2 第 2 条）', len(A['sl']) == 1, A['sl'])
            if scene == 'spk':
                lo = [p[1] for p in A['lo']]
                check(f'v3.3-1 {S} 区间值的两段各自对齐：下限一列小数点对齐，上限和单值同一列', len(lo) >= 2 and max(lo) - min(lo) <= 1 and len(A['hi']) >= 2, [A['lo'], A['hi']])
                x.E("KIT.select('01 燃烧核心')"); pg.wait_for_timeout(150)
                big = x.E("(() => { const r = [...document.querySelectorAll('#pbody .prm[data-kind=num]')].filter(__vis); return r.map(e => { const n = e.querySelector('.num'), v = e.querySelector('.vu'); return n.getBoundingClientRect().left >= v.getBoundingClientRect().left - 0.5 }) })()")
                check(f'v3.3-1 {S} 五位数（数量 14933、随机种子 501937）也放在数值列里，不压滑杆', all(big), big)
        pg.close()

    # v3.4 第 21 条（替换 v3.3 第 5 条的对列）：折叠模块的摘要是连贯的短语，组间 16，整体右对齐到数值列末端（1366 下「颜色」默认折叠）
    pg = new_page(b, 1366, 768); x = P(pg)
    C5 = x.E("(() => { const m = document.querySelector('#pbody .mod[data-mod=\"颜色\"]'), z = document.querySelector('#pbody .prm[data-lab=\"时间倍率\"] .vu'), wv = parseFloat(getComputedStyle(document.getElementById('pbody')).getPropertyValue('--w-val')), ms = m.querySelector('.ms'), b = ms.querySelector('.band'), g = [...ms.querySelectorAll('.msg')];"
             " return {closed: m.classList.contains('is-closed'), t: g.map(e => e.textContent), gap: b && g[0] ? g[0].getBoundingClientRect().left - b.getBoundingClientRect().right : null, r: ms.getBoundingClientRect().right, r0: z.getBoundingClientRect().left + wv, cols: ms.querySelectorAll('.ms-v, .ms-u, .num').length} })()")
    check('v3.4-21 颜色折叠时：色带、「曝光 1.00 倍」两组，组间 16，标签、数值、单位紧挨', C5['closed'] and C5['t'] == ['曝光 1.00 倍'] and C5['gap'] is not None and abs(C5['gap'] - 16) <= 1 and C5['cols'] == 0, C5)
    check('v3.4-21 摘要整体右对齐到数值列末端（不拆进列）', abs(C5['r'] - C5['r0']) <= 1, C5)
    sm = x.E("[...document.querySelectorAll('#pbody .mod.is-closed .ms')].map(m => m.textContent)")
    check('v3.4-21 1366 下其余折叠模块的摘要也是短语（「风速 0.0 m/s」「1024 px　5 张」）', 'R风速 0.0 m/s' in ['R' + t for t in sm] and '1024 px5 张' in sm, sm)
    pg.close()

    # 第 8 条：「N 项已隐藏　查看」并进模块标题行
    pg = new_page(b); x = P(pg)
    h = x.E("(() => { const m = document.querySelector('#pbody .mod[data-mod=\"环境\"]'), d = m.querySelector('.mod-h .dep-n'), mt = m.querySelector('.mt'), z = document.querySelector('#pbody .prm[data-lab=\"风速\"] .vu'); return d && {t: d.textContent, tip: d.dataset.tip, l: d.getBoundingClientRect().left, r: d.getBoundingClientRect().right, mt: mt.getBoundingClientRect().right, vu: z.getBoundingClientRect().left + parseFloat(getComputedStyle(document.getElementById('pbody')).getPropertyValue('--w-val')), top: Math.abs(d.getBoundingClientRect().top + d.getBoundingClientRect().height / 2 - mt.getBoundingClientRect().top - mt.getBoundingClientRect().height / 2), rows: [...m.querySelectorAll('.mod-b > *')].filter(__vis).map(e => e.dataset.lab || e.textContent.trim())} })()")
    check('v3.3-8 / v3.5-3 标题行右侧写「+4」，和标题同一行，右缘对齐数值列末端（单位列给「恢复本模块」，操作列给折叠箭头）', h and h['t'] == '+4' and h['l'] > h['mt'] and abs(h['r'] - h['vu']) <= 1 and h['top'] <= 2, h)
    check('v3.3-8 悬停写「4 个参数已隐藏，点开显示」；不再单独占一行', h and h['tip'] == '4 个参数已隐藏，点开显示' and h['rows'] == ['风速', '湍流强度', '湍流尺度', '爆后扰动'] and '已隐藏' not in (x.T('#pbody .mod[data-mod="环境"] .mod-b') or ''), h)
    x.click('#pbody .mod[data-mod="环境"] .dep-n')
    check('v3.3-8 点「+4」露出 4 个停用参数，按钮填选中底色，悬停改成「收起这 4 个参数」', x.E("[...document.querySelectorAll('#pbody .mod[data-mod=\"环境\"] .prm.dep-in')].filter(__vis).length") == 4 and x.E("document.querySelector('#pbody .mod[data-mod=\"环境\"] .dep-n').getAttribute('aria-pressed')") == 'true' and x.E("document.querySelector('#pbody .mod[data-mod=\"环境\"] .dep-n').dataset.tip") == '收起这 4 个参数')
    x.click('#pbody .mod[data-mod="环境"] .dep-n')
    check('v3.3-8 再点一次收起', x.E("[...document.querySelectorAll('#pbody .mod[data-mod=\"环境\"] .prm.dep-in')].filter(__vis).length") == 0)
    pg.close()

    # 第 6 条：字号层级——大号只给面包屑末项和效果名；中号给参数名、数值、正文；小号给读数、计数、次要说明；模块标题中号加粗，上 16 下 6
    pg = new_page(b); x = P(pg)
    big = x.E("[...document.querySelectorAll('#wsBaker *')].filter(e => ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || e.id === 'tNow') && e.getBoundingClientRect().width && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).fontSize === '15px').map(e => e.matches('#path .cur') ? '面包屑末项' : e.matches('#tree .trow.t-group .tx') ? '效果名' : e.matches('#libTabs .tab') ? '效果库大号标签' : e.id === 'tNow' ? '当前时间' : (e.id || String(e.className.baseVal ?? e.className)))")
    check('v3.3-6 / v3.4-20 大号 15 只给面包屑末项、效果名（结构树第一行）、效果库大号标签（用户定）和当前时间', set(big) == {'面包屑末项', '效果名', '效果库大号标签', '当前时间'}, big)
    fs = lambda sel: x.C(sel, 'fontSize')
    check('v3.3-6 中号 13：参数名、数值、总时长、命令', all(fs(s) == '13px' for s in ['#pbody .prm[data-lab="缩放"] .pl', '#pbody .prm[data-lab="缩放"] .num', '#transport .time .tot', '[data-act="saveAs"]', '#tree .trow:not(.t-group) .tx']), [fs(s) for s in ['#transport .time .tot']])
    check('v3.3-6 / v3.5-5 小号 12：读数（画面读数、单位、模块摘要）、计数（层号、折叠层的「· 2」）、次要说明（「导出范围」一行的名字）', all(fs(s) == '12px' for s in ['#ciBL', '#pbody .prm[data-lab="缩放"] .u', '#tree .trow .no', '#tree .trow .cnt', '#libList .li-s', '#tlw .iorow .io-k']), [fs(s) for s in ['#ciBL', '#tree .trow .cnt', '#tlw .iorow .io-k']])
    mh = x.E("(() => { const m = [...document.querySelectorAll('#pbody .mod')][1], h = m.querySelector('.mod-h'), t = h.querySelector('.mt'), r = m.querySelector('.mod-b > .prm'), lh = parseFloat(getComputedStyle(t).lineHeight), tb = t.getBoundingClientRect(), top = m.getBoundingClientRect().top + parseFloat(getComputedStyle(m).borderTopWidth); return {fs: getComputedStyle(t).fontSize, fw: getComputedStyle(t).fontWeight, above: Math.round(tb.top + (tb.height - lh) / 2 - top), below: Math.round(r.getBoundingClientRect().top - (tb.top + (tb.height + lh) / 2))} })()")
    check('v3.4-10 模块标题中号加粗，标题行 32 px，上方空 20 px、下方空 8 px（标题字在 32 px 行里居中）', mh['fs'] == '13px' and mh['fw'] == '600' and mh['above'] == 20 + 6 and mh['below'] == 8 + 6, mh)
    # v3.4 第 15 条（替换 v3.3 第 14 条）：静止时不画折叠箭头——检查器标题字和参数名在同一条线上（量墨迹）；结构树层行的格子里是层号
    ins = x.R('#insp')[0] + 1
    mo, pl = x.R('#pbody .mod:not(.is-closed) .mod-h .mt'), x.R('#pbody .prm[data-lab="开始时间"] .pl')
    k = {'title': ink_x(pg, ins, mo[1] + 2, ins + 40, mo[3] - 2) - ins, 'label': ink_x(pg, ins, pl[1], ins + 40, pl[3]) - ins}
    check('v3.5-3 检查器参数名的字比标题字向右缩进 12（墨迹左缘）；标题行的折叠箭头不在标题前面', abs(k['label'] - k['title'] - 12) <= 1.5 and x.E("[...document.querySelectorAll('#pbody .mod-h')].filter(h => h.offsetParent).every(h => h.querySelector('.chev').getBoundingClientRect().left > h.querySelector('.mt').getBoundingClientRect().right)"), k)
    tr = x.E("[...document.querySelectorAll('#tree .trow[data-id]')].map(r => { const c = r.querySelector('.chev svg'); return c ? getComputedStyle(c).visibility : 'none' })")
    check('v3.4-15 结构树静止时一个展开箭头都不画；层行格子里写层号', all(v in ('hidden', 'none') for v in tr) and x.E("[...document.querySelectorAll('#tree .trow.t-layer .chev .no')].map(n => n.textContent).join()") == '1,2,3', tr)
    pg.mouse.move(*[v + 5 for v in x.R('#tree .trow.t-layer[aria-expanded="false"] .tx')[:2]]); pg.wait_for_timeout(100)
    hv = x.E("(() => { const r = document.querySelector('#tree .trow.t-layer[aria-expanded=\"false\"]'); return [getComputedStyle(r.querySelector('.chev svg')).visibility, getComputedStyle(r.querySelector('.chev .no')).visibility, (r.querySelector('.cnt') || {}).textContent] })()")
    check('v3.4-15 悬停层行时层号换成箭头；折叠着的层名字后面弱色写发射器数「· 2」', hv == ['visible', 'hidden', '· 2'] and x.C('#tree .trow .cnt', 'color') == T3, hv)
    pg.close()

    # 第 13 条：1920 下检查器不留一大块空
    for scene, sel, want_open in (('kiku', None, '颜色'), ('spk', None, '运动'), ('kiku', '金锦层/星', '寿命')):   # v3.4 第 10 条行变高：仙女棒 08 的「大小与亮度」放不下，按同一个规则改展开「触发」「外形」
        pg = new_page(b); x = P(pg)
        if scene == 'spk':
            x.E("KIT.set('scene','spk')"); pg.wait_for_timeout(200)
        if sel:
            x.E(f"KIT.select('{sel}')"); pg.wait_for_timeout(200)
        f = x.E("(() => { const pb = document.querySelector('#pbody'), ms = [...pb.querySelectorAll('.mod')], used = ms.reduce((a, m) => a + m.offsetHeight, 0), H = pb.clientHeight - parseFloat(getComputedStyle(pb).paddingBottom);"
                " const nextGap = Math.min(...ms.filter(m => m.classList.contains('is-closed')).map(m => { const c = m.offsetHeight; m.classList.remove('is-closed'); const h = m.offsetHeight; m.classList.add('is-closed'); return h - c }), 9999);"
                " return {H, used, free: H - used, nextGap, open: ms.filter(m => !m.classList.contains('is-closed')).map(m => m.dataset.mod), scroll: pb.scrollHeight > pb.clientHeight + 1} })()")
        check(f'v3.3-13 {sel or scene} 默认展开到放满：没有滚动条，剩下的空比最小的折叠模块展开要的高度小', not f['scroll'] and f['free'] < f['nextGap'] and want_open in f['open'], f)
        pg.close()
    pg = new_page(b); x = P(pg)
    x.click('#pbody .mod[data-mod="颜色"] .mod-h'); x.E("KIT.select('橙引线层')"); pg.wait_for_timeout(100); x.E("KIT.select('金锦层')"); pg.wait_for_timeout(150)
    check('v3.3-13 用户手动折叠后按用户的来（换对象再回来仍是折叠）', x.E("document.querySelector('#pbody .mod[data-mod=\"颜色\"]').classList.contains('is-closed')"))
    pg.close()

    # 第 12 条（v3.5 第 5 条改写）：胶片行去掉；刻度尺上面是「导出范围」一行
    for w, h in ((1920, 1080), (1366, 768)):
        for scene in ('kiku', 'spk'):
            pg = new_page(b, w, h); x = P(pg)
            if scene == 'spk':
                x.E("KIT.set('scene','spk')"); pg.wait_for_timeout(200)
            F = x.E("(() => { const l = document.querySelector('#tlw .iorow'), L = l.getBoundingClientRect(), R = document.querySelector('#tlw .rrow').getBoundingClientRect(), g = [...l.querySelectorAll('.io-g')].map(e => e.getBoundingClientRect());"
                    " return {h: L.height, touch: Math.abs(L.bottom - R.top), film: [...document.querySelectorAll('#tlw .film-c, #tlw .film-u, #tlw .frow')].filter(e => e.getBoundingClientRect().width).length, fit: l.scrollWidth <= l.clientWidth + 1, gaps: g.slice(1).map((r, i) => Math.round(r.left - g[i].right)), n: g.length,"
                    " btn: [...l.querySelectorAll('.btn-icon')].every(b => getComputedStyle(b).visibility === 'visible'), frame: document.querySelector('#ciBL .cfno') && document.querySelector('#ciBL .cfno').textContent} })()")
            check(f'v3.3-12 / v3.5-5 {w} {scene} 胶片行去掉：刻度尺上面是「导出范围」一行（高 {32 if w == 1920 else 28}），紧贴刻度尺，看不到胶片格', F['h'] == (32 if w == 1920 else 28) and F['touch'] <= 1 and F['film'] == 0, F)
            check(f'v3.3-12 / v3.5-5 {w} {scene} 这一行放得下、组间 ≥ 24，命令常显（{"发射时段一组也在" if scene == "spk" else "导出范围、开关两组"}）', F['fit'] and all(g >= 24 for g in F['gaps']) and F['n'] == (3 if scene == 'spk' else 2) and F['btn'], F)
            check(f'v3.3-12 / v3.5-5 {w} {scene} 烘焙进度在画面左下「帧 N / M」', bool(re.fullmatch(r'\d+ / \d+|— / \d+', F['frame'] or '')), F)
            pg.close()

    # 第 7 条：工具图标重画（自己的画法）
    pg = new_page(b); x = P(pg)
    sy = x.E("[...document.querySelectorAll('#iconDefs symbol')].map(s => ({id: s.id, vb: s.getAttribute('viewBox'), d: [...s.querySelectorAll('path')].map(p => p.getAttribute('d')).join(' '), circ: s.querySelectorAll('circle').length,"
             " fill: [...s.querySelectorAll('*')].filter(e => e.getAttribute('fill') && e.getAttribute('fill') !== 'none').length, round: [...s.querySelectorAll('*')].some(e => /round/.test((e.getAttribute('stroke-linecap') || '') + (e.getAttribute('stroke-linejoin') || ''))), sw: [...s.querySelectorAll('*')].some(e => e.hasAttribute('stroke-width'))}))")
    odd = [s['id'] for s in sy if s['vb'] != '0 0 16 16' or s['round'] or s['sw'] or s['fill']]
    check('v3.3-7 / v3.5-1 全套 16 × 16 画布、不写自己的线宽、没有圆头 / 圆角、不填面（v3.5 起圆的东西画真圆，只看不再有实心块）', len(sy) >= 51 and not odd, odd)
    ink = x.E(INK_JS)
    def ink_bad(k, v):
        x0, y0, x1, y1 = v; w, h = x1 - x0, y1 - y0
        if k == 'i-x': return not (abs(w - 9.5) <= .5 and abs(h - 9.5) <= .5)   # ×：两笔和加号一样长（12），外框约 9.5
        return x0 < 1.875 or y0 < 1.875 or x1 > 14.125 or y1 > 14.125 or abs(max(w, h) - 12) > .5 or abs((x0 + x1) / 2 - 8) > .6 or abs((y0 + y1) / 2 - 8) > .6
    bad = {k: v for k, v in ink.items() if ink_bad(k, v)}
    check('v3.5-1 每个图标的墨迹都在 12 × 12 可画区域里（2–14），长边 12（±0.5），居中（±0.6）；× 按加号的笔画长度画', len(ink) >= 52 and not bad, bad)
    sz = x.E("[...document.querySelectorAll('#wsBaker svg.i, #ovlApp svg.i')].filter(v => v.getBoundingClientRect().width).map(v => { const r = v.getBoundingClientRect(), c = getComputedStyle(v); return [v.querySelector('use').getAttribute('href'), Math.round(r.width), Math.round(r.height), c.strokeWidth, c.strokeLinecap, c.strokeLinejoin, c.fill] }).filter(a => a[1] !== 16 || a[2] !== 16 || a[3] !== '1.5px' || a[4] !== 'square' || a[5] !== 'miter' || a[6] !== 'none')")
    check('v3.3-7 / v3.5-1 制作区里的图标一律按 16 px 显示（不缩小，线宽都是 1.5），方头、尖角、不填面', not sz, sz[:6])
    x.E("KIT.set('scene','spk')"); pg.wait_for_timeout(200)
    sz2 = x.E("[...document.querySelectorAll('#wsBaker svg.i')].filter(v => v.getBoundingClientRect().width && Math.round(v.getBoundingClientRect().width) !== 16).length")
    check('v3.3-7 仙女棒（结构树类型图标、区间展开箭头）也都是 16 px', sz2 == 0, sz2)
    check('v3.3-7 搜索框的放大镜按 16 px 画（外壳转来：资源编排搜索框同一个组件）', x.R('#pq > svg.i')[4] == 16 and x.R('#libQ > svg.i')[4] == 16)
    pg.close()

    # 第 15 条：样板控制条不压界面（这一页不藏样板控制条）
    for w, h in ((1920, 1080), (1366, 768)):
        pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
        pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith(('file:', 'data:')) else r.abort())
        pg.on('pageerror', lambda e: ERR.append(str(e)))
        pg.goto(URL, wait_until='load'); pg.wait_for_timeout(300)
        if w == 1366:
            pg.evaluate("KIT.set('size','1366')"); pg.wait_for_timeout(200)
        x = P(pg)
        k = x.E("(() => { const t = document.getElementById('kitTog').getBoundingClientRect(), I = document.getElementById('insp').getBoundingClientRect(), hit = r => !(r.right <= t.left || r.left >= t.right || r.bottom <= t.top || r.top >= t.bottom);"
                " return {open: document.getElementById('sampleBar').classList.contains('is-open'), w: t.width, h: t.height, left: t.left, stl: document.querySelector('#status .st-l').getBoundingClientRect().right, bottom: innerHeight - t.bottom, insp: hit(I), ctl: [...document.querySelectorAll('#app button, #app input, #app select, #app .seg')].filter(c => { const r = c.getBoundingClientRect(); return r.width && hit(r) }).map(c => c.id || c.dataset.act || c.textContent.trim())} })()")
        check(f'v3.3-15 / v3.4-1 {w} 样板控制条收起时只留左下角一个小按钮，跟在「复制意见」后面（外壳的导出、备份在它前面），不盖检查器、不盖产品控件', not k['open'] and k['w'] <= 64 and k['h'] <= 24 and k['stl'] <= k['left'] <= k['stl'] + 16 and k['bottom'] <= 8 and not k['insp'] and not k['ctl'], k)
        x.click('#kitTog')
        o = x.E("(() => { const b = document.getElementById('sampleBar').getBoundingClientRect(); return {open: document.getElementById('sampleBar').classList.contains('is-open'), left: b.left, segs: document.querySelectorAll('#sampleBar .seg').length} })()")
        check(f'v3.3-15 {w} 点开以后从左下角往上长，三组切换都在；再点收起', o['open'] and o['left'] <= 1 and o['segs'] >= 3 and (x.click('#kitTog') or True) and not x.E("document.getElementById('sampleBar').classList.contains('is-open')"), o)
        pg.close()
    sh = (SRC / 'checks' / 'shot.py').read_text(encoding='utf-8')
    check('v3.3-15 shot.py 有 --hide-sample，给评委的截图把样板控制条藏起来', "--hide-sample" in sh and "if HIDE:" in sh)

    # 第 4 条：时间轴不悄悄藏行
    pg = new_page(b); x = P(pg)
    x.E("KIT.set('scene','spk')"); pg.wait_for_timeout(200)
    st = lambda: x.E("""(() => { const tl = document.querySelector('#tlw .tl'), r = [...tl.querySelectorAll('.tlrow[data-id]')], T = tl.getBoundingClientRect(), hd = tl.querySelector('.fixed').getBoundingClientRect().bottom;
      const up = tl.querySelector('.tl-edge.up .tl-more'), dn = tl.querySelector('.tl-edge.dn .tl-more'), vis = e => !!e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
      const ub = vis(up) ? up.getBoundingClientRect().bottom : hd, db = vis(dn) ? dn.getBoundingClientRect().top : T.bottom;
      const full = r.filter(x => { const b = x.getBoundingClientRect(); return b.top >= ub - 1 && b.bottom <= db + 1 }).map(x => x.querySelector('.lab').textContent);
      return {top: tl.scrollTop, n: r.length, full, up: vis(up) ? up.textContent.trim() : null, dn: vis(dn) ? dn.textContent.trim() : null, first: r[0].querySelector('.lab').textContent} })()""")
    s = st()
    check('v3.3-4 仙女棒默认滚到顶，第一行「01 燃烧核心」完整看得见', s['top'] == 0 and s['first'] in s['full'], s)
    check('v3.3-4 放不下时下边缘写「下面还有 N 行」，N 和实际藏着的行数一样；上边缘不写', s['dn'] is not None and re.fullmatch(r'下面还有 (\d+) 行', s['dn']) is not None and int(re.fullmatch(r'下面还有 (\d+) 行', s['dn']).group(1)) == s['n'] - len(s['full']) and s['up'] is None, s)
    if s['dn']:
        x.click('#tlw .tl-edge.dn .tl-more'); pg.wait_for_timeout(250)
    s2 = st()
    check('v3.3-4 点「下面还有 N 行」滚过去：最后一行看得见，上边缘写「上面还有 N 行」', s2['top'] > 0 and '13燃烧头炽热点' in s2['full'] and s2['up'] is not None and int(re.fullmatch(r'上面还有 (\d+) 行', s2['up']).group(1)) == s2['n'] - len(s2['full']) and s2['dn'] is None, s2)
    if s2['up']:
        x.click('#tlw .tl-edge.up .tl-more'); pg.wait_for_timeout(250)
    s3 = st()
    check('v3.3-4 点「上面还有 N 行」滚回顶', s3['top'] == 0 and s3['up'] is None and s3['dn'] is not None, s3)
    check('v3.3-4 边缘提示占一条，不叠在别的行的字上', x.E("(() => { const e = document.querySelector('#tlw .tl-edge.dn .tl-more'); if (!e) return false; const b = e.getBoundingClientRect(); return [...document.querySelectorAll('#tlw .tlrow[data-id] .lab')].every(l => { const r = l.getBoundingClientRect(); return r.bottom <= b.top + 1 || r.top >= b.bottom - 1 || (r.top + r.bottom) / 2 > b.top }) })()"))
    pg.close()
    pg = new_page(b); x = P(pg)
    s = st()
    check('v3.3-4 金曜菊-B 1920：6 行都放得下，上下都不写', s['up'] is None and s['dn'] is None and len(s['full']) == s['n'] == 6, s)
    pg.close()
    pg = new_page(b, 1366, 768); x = P(pg)
    s = st()
    check('v3.3-4 1366 金曜菊-B 放不下：滚到顶，写「下面还有 N 行」', s['top'] == 0 and s['dn'] is not None and int(re.sub(r'\D', '', s['dn'])) == s['n'] - len(s['full']), s)
    x.E("KIT.select('金锦层/余烬')"); pg.wait_for_timeout(200)
    s = st()
    check('v3.3-4 选中看不见的行时滚过去，当前行看得见，上边缘写「上面还有 N 行」', '余烬' in s['full'] and s['top'] > 0 and s['up'] is not None, s)
    pg.close()


def v34(b):
    """v3.4 改动单里容易回归的几条（别的条目改写在原来的检查里，见各条的 v3.4-n）"""
    pg = new_page(b); x = P(pg)
    st = x.E("[...document.querySelector('#status .st-l').children].map(c => c.id || c.dataset.act)")
    check('v3.4-1 状态栏左端先是外壳的槽位 #stShell，「复制意见」排在后面', st[:2] == ['stShell', 'copyNotes'], st)
    bx = x.E("[...document.querySelectorAll('#toolRow .tcol-r .bx')].map(g => { const c = getComputedStyle(g), r = g.getBoundingClientRect(); return {h: r.height, bw: c.borderTopWidth, bc: c.borderTopColor, rad: parseFloat(c.borderTopLeftRadius), n: g.querySelectorAll('.btn').length, sep: [...g.querySelectorAll('.bx-sep')].map(e => [e.getBoundingClientRect().width, getComputedStyle(e).backgroundColor].join()).filter((v, i, a) => a.indexOf(v) === i)} })")
    check('v3.4-6 / v3.5-8 「撤销 重做 版本记录」、「还原 保存 另存」各一个 1 px 线框（#2b4149，圆角 ≤ 2），组内 1 px 竖线隔开，高 28', len(bx) == 2 and all(g['h'] == 28 and g['bw'] == '1px' and g['bc'] == LINE and g['rad'] <= 2 and g['sep'] == ['1,' + LINE] for g in bx) and [g['n'] for g in bx] == [3, 3], bx)
    check('v3.4-6 停用时 40 %（撤销、重做、还原），导出仍是唯一的实心主按钮', x.C('#bUndo', 'opacity') == '0.4' and x.C('#bRevert', 'opacity') == '0.4' and x.C('#bSave', 'backgroundColor') == 'rgba(0, 0, 0, 0)')
    check('v3.4-10 工作模式分段每段左右 16、高 28；「贴图与交付」改名「序列贴图」', all(x.C(f'#modeTabs button:nth-child({i})', 'paddingLeft') == '16px' and x.C(f'#modeTabs button:nth-child({i})', 'paddingRight') == '16px' for i in (1, 2, 3)) and x.R('#modeTabs')[5] == 28 and x.T('#modeTabs') == '实时模拟 引擎回放 序列贴图')
    x.key('?')
    check('v3.4-10 快捷键表和页面里不再有「贴图与交付」「预览设置」「精简布局」', not re.search('贴图与交付|预览设置|精简布局', x.E("document.body.innerText + JSON.stringify(KIT.strings())")))
    x.key('Escape')
    sel = x.E("(() => { const r = document.querySelector('#tree .trow.is-sel'), c = getComputedStyle(r); return [c.boxShadow, c.backgroundColor, c.outlineStyle] })()")
    check('v3.4-12 结构树当前层：左边 2 px 薄荷竖线（通高）、淡底色，没有 1 px 细框', sel[0] == MINT + ' 2px 0px 0px 0px inset' and sel[1] == G3 and sel[2] == 'none', sel)
    x.click('#pbody .prm[data-lab="风速"] .sl')
    dot = x.E("(() => { const d = document.querySelector('#bSave .dot'); return d && [d.getBoundingClientRect().width, d.getBoundingClientRect().height, getComputedStyle(d).backgroundColor] })()")
    check('v3.4-4 有没保存的改动：「保存」后面一个 6 px 薄荷实心点', dot == [6, 6, MINT], dot)
    x.key('Control+s')
    check('v3.4-4 保存后点消失', x.N('#bSave .dot') == 0)
    pg.close()
    # 第 13 条：滚动条只在滚动时出现（1366 仙女棒：结构树、检查器、时间轴都放不下）
    pg = new_page(b, 1366, 768); x = P(pg); x.E("KIT.set('scene','spk')"); pg.wait_for_timeout(200)
    sb = x.E("['#tree', '#libList', '#pbody', '#tlw .tl'].map(s => { const e = document.querySelector(s); return [s, e.classList.contains('sb-auto'), e.scrollHeight > e.clientHeight, e.offsetWidth - e.clientWidth, getComputedStyle(e).scrollbarGutter, getComputedStyle(e).borderTopColor] })")
    check('v3.4-13 结构树、效果库、检查器、时间轴都挂通用类 .sb-auto；滚动条位置一直留着（6 px），静止时滑块透明', all(r[1] and r[4].startswith('stable') and r[5] == 'rgba(0, 0, 0, 0)' for r in sb) and all(r[3] == 6 for r in sb if r[2]), sb)
    x.E("document.querySelector('#pbody').scrollTop = 60"); pg.wait_for_timeout(100)
    on = x.E("(() => { const e = document.querySelector('#pbody'); return [e.classList.contains('is-scrolling'), getComputedStyle(e).borderTopColor] })()")
    pg.wait_for_timeout(1300)
    off = x.E("(() => { const e = document.querySelector('#pbody'); return [e.classList.contains('is-scrolling'), getComputedStyle(e).borderTopColor] })()")
    check('v3.4-13 一滚动就出弱色滑块（--g6），停下 800 ms 后淡出', on == [True, 'rgb(57, 81, 90)'] and off == [False, 'rgba(0, 0, 0, 0)'], [on, off])
    pg.close()
    # 第 19 条：区间写法「0.30 – 1.65」两段等距
    pg = new_page(b); x = P(pg); x.E("KIT.set('scene','spk')"); pg.wait_for_timeout(200)
    d = x.E("(() => { const v = document.querySelector('#pbody .prm[data-lab=\"大小\"] .vv'), [lo, ds, hi] = v.children, t = e => { const r = document.createRange(); r.selectNodeContents(e.nodeName === 'INPUT' ? e : e); return e.getBoundingClientRect() }, ink = e => { const c = getComputedStyle(e), r = e.getBoundingClientRect(); return [r.left + parseFloat(c.paddingLeft) + parseFloat(c.borderLeftWidth), r.right - parseFloat(c.paddingRight) - parseFloat(c.borderRightWidth)] };"
             " const a = ink(lo), b = ink(ds), c = ink(hi); return [+(b[0] - a[1]).toFixed(1), +(c[0] - b[1]).toFixed(1)] })()")
    check('v3.4-19 区间两段之间「 – 」：短横两边等距、各留 3 px（不像负号）', d[0] == d[1] and d[0] >= 3, d)
    sm = x.E("document.querySelector('#pbody .mod[data-mod=\"大小与亮度\"] .ms').textContent") if x.E("document.querySelector('#pbody .mod[data-mod=\"大小与亮度\"]').classList.contains('is-closed')") else x.E("fmtS(PS[Object.keys(PS).find(k => k.endsWith('|大小'))], [0.3, 1.65])")
    check('v3.4-19 文字里的区间也写「0.30 – 1.65」（短横两边窄空格）', '0.30\u2009–\u20091.65' in (sm or ''), sm)
    pg.close()


def v35(b):
    """v3.5 改动单里容易回归的几条（和这次决定冲突的旧检查改写在原处，名字里带 v3.5-n）"""
    pg = new_page(b); x = P(pg)
    # 第 8 条：右栏工具行顺序
    od = x.E("[...document.querySelector('#toolRow .tcol-r').children].map(c => c.id || (c.classList.contains('bx') ? '[' + [...c.querySelectorAll('.btn')].map(b => b.id || b.dataset.act).join(' ') + ']' : c.className))")
    check('v3.5-8 / v3.6-2 右栏工具行：[撤销 重做 版本记录]「意见」｜ 空白 ｜ [还原 保存 另存]「导出 ▾」（「⚠ 1 层」并进导出按钮）', od == ['[bUndo bRedo bVer]', 'bNote', 'sp', '[bRevert bSave saveAs]', 'expBtn'], od)
    x.hover('#bNote')
    check('v3.5-8 「意见」是气泡图标，悬停写「当前画面写进意见」，紧跟撤销组（8 px）', x.tip() == '当前画面写进意见' and x.N('#bNote use[href="#i-note"]') == 1 and abs(x.R('#bNote')[0] - x.R('#toolRow .tcol-r .bx')[2] - 8) <= 1, x.tip())
    pg.mouse.move(900, 400); pg.wait_for_timeout(100)
    # 第 1 条：图标颜色
    col = x.E("(() => { const c = s => getComputedStyle(document.querySelector(s)).color; return [c('#bNote'), c('#transport [data-act=restart]'), c('#transport [data-act=loop]'), c('#tree .trow.t-emitter .ty')] })()")
    x.hover('#bNote'); hv = x.C('#bNote', 'color'); pg.mouse.move(900, 400)
    check('v3.5-1 图标颜色：默认次文字色、悬停主文字色、开着薄荷（循环）；结构树类型图标也是次文字色', col == [T2, T2, MINT, T2] and hv == T1, [col, hv])
    # 第 6 条：显示（眼睛）换回圆眼，只看开着薄荷
    eye = x.E("document.querySelector('#i-eye').innerHTML")
    check('v3.5-6 显示图标换回圆眼（弧线的眼眶 + 圆瞳孔），不再是六边形', 'Q8' in eye and '<circle' in eye and 'h6L' not in eye, eye)
    pg.locator('#tree .trow.is-sel').focus(); x.key('s')
    check('v3.5-6 只看开着时圆圈薄荷', x.C('#tree .trow.is-sel .solo', 'color') == MINT and x.N('#tree .trow.is-sel .solo use[href="#i-soloon"]') == 1)
    x.key('s')
    # 第 11 条：「+ 加层」
    ad = x.E("(() => { const a = document.querySelector('#tree .tnew'), rows = [...document.querySelectorAll('#tree > *')], L = document.querySelector('#tree .trow.t-layer'), no = L.querySelector('.chev').getBoundingClientRect(), tx = L.querySelector('.tx').getBoundingClientRect(), i = a.querySelector('svg').getBoundingClientRect(), t = a.querySelector('span').getBoundingClientRect(); return {last: rows[rows.length - 1] === a, txt: a.textContent.trim(), c: getComputedStyle(a).color, h: a.getBoundingClientRect().height, plus: Math.round(i.left - no.left), name: Math.round(t.left - tx.left)} })()")
    check('v3.5-11 每个效果的最后一层下面一行「+ 加层」：弱色，「+」在层号那一格，「加层」和层名同一列', ad['last'] and ad['txt'] == '加层' and ad['c'] == T3 and ad['h'] == 28 and ad['plus'] == 0 and ad['name'] == 0, ad)
    x.hover('#tree .tnew')
    check('v3.5-11 悬停「+ 加层」出底色', x.C('#tree .tnew', 'backgroundColor') == G2)
    n0 = x.N('#tree .trow.t-layer'); x.click('#tree .tnew')
    check('v3.5-11 点「+ 加层」直接加一个空层（进入改名），可撤销', x.N('#tree .trow.t-layer') == n0 + 1 and x.N('#tree input.ren') == 1)
    x.key('Escape'); x.key('Escape'); pg.mouse.click(900, 400); x.key('Control+z')
    check('v3.5-11 撤销加层', x.N('#tree .trow.t-layer') == n0, x.N('#tree .trow.t-layer'))
    # 第 12 条：改名
    check('v3.5-12 画面大小分段写「适应窗口 / 1:1 / 实机窗口」', x.T('#viewbar .seg[data-ui="view3"]') == '适应窗口 1:1 实机窗口')
    x.key('?')
    check('v3.5-12 页面、悬停提示、快捷键表、全表里没有单独的「适应」「游戏内」', not re.search('适应(?!窗口)|游戏内', x.E("document.body.innerText + JSON.stringify(KIT.strings())")))
    x.key('Escape')
    # 第 4 条：序列贴图模式的两组分段也同一个大小
    x.E("KIT.mode('序列贴图')"); pg.wait_for_timeout(150)
    check('v3.5-4 序列贴图模式下平台、预览方式两组分段和工作模式同高 28', x.R('#viewbar .seg[data-ui="plat"]')[5] == 28 and x.R('#viewbar .seg[data-ui="dview"]')[5] == 28 and x.R('#modeTabs')[5] == 28)
    pg.close()
    # 第 8 条：1366 下「还原」变成图标，有未保存改动时也放得下
    pg = new_page(b, 1366, 768); x = P(pg)
    x.click('#pbody .prm[data-lab="缩放"] .sl'); pg.wait_for_timeout(100)
    rv = x.E("(() => { const b = document.getElementById('bRevert'), c = document.querySelector('#toolRow .tcol-r').getBoundingClientRect(), e = document.getElementById('expBtn').getBoundingClientRect(), g = document.querySelectorAll('#toolRow .tcol-r .bx'); return {ico: getComputedStyle(b.querySelector('.rv-i')).display, t: getComputedStyle(b.querySelector('.t')).display, w: b.getBoundingClientRect().width, dot: !!document.querySelector('#bSave .dot'), room: Math.round(c.right - 12 - e.right), gap: Math.round(g[1].getBoundingClientRect().left - document.getElementById('bNote').getBoundingClientRect().right)} })()")
    check('v3.5-8 1366：「还原」只放图标；「保存 •」有未保存点时右段也放得下，两组之间还有空白', rv['ico'] == 'block' and rv['t'] == 'none' and rv['dot'] and rv['room'] >= 0 and rv['gap'] >= 8, rv)
    pg.close()


def v36(b):
    """v3.6 改动单（审查_v3.5.md）。第 4 条是功能问题：先写这条复现，再修"""
    # 第 4 条：曝光改过以后，悬停这一行，「按最亮时刻设曝光」仍然看得见、点得到（v3.5 被「恢复」顶掉：同一格、visibility hidden）
    for w, h in ((1920, 1080), (1366, 768)):
        pg = new_page(b, w, h); x = P(pg)
        r = x.row('曝光')
        x.E("() => { const m = document.querySelector('#pbody .mod[data-mod=\"颜色\"]'); if (m && m.classList.contains('is-closed')) m.querySelector('.mod-h').click(); }"); pg.wait_for_timeout(150)
        pg.locator(r + ' .num').first.scroll_into_view_if_needed()
        pg.locator(r + ' .num').first.fill('1.30'); pg.keyboard.press('Enter'); pg.wait_for_timeout(150)
        x.hover(r + ' .plt')
        g = x.E("""s => { const b = document.querySelector(s + ' .sug'), rs = document.querySelector(s + ' .rst'); if (!b) return null; const r = b.getBoundingClientRect(), c = getComputedStyle(b);
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); const q = rs && rs.getBoundingClientRect();
          return {vis: c.visibility !== 'hidden' && +c.opacity > .5 && r.width > 0, hit: !!hit && b.contains(hit), overlap: !!q && q.width > 0 && getComputedStyle(rs).visibility !== 'hidden' && !(q.right <= r.left || q.left >= r.right), rst: !!q && getComputedStyle(rs).visibility !== 'hidden'}; }""", r)
        check(f'v3.6-4 {w} 曝光改过以后悬停这一行：「按最亮时刻设曝光」看得见、点得到，「恢复」也在，两个不在同一格', bool(g) and g['vis'] and g['hit'] and g['rst'] and not g['overlap'], g)
        if g and g['hit']:
            x.click(r + ' .sug')
            check(f'v3.6-4 {w} 改过以后仍能一键设成 0.85', x.val('曝光') == '0.85', x.val('曝光'))
        pg.close()

    BASE = """el => { const p = document.createElement('i'); p.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'; el.appendChild(p); const y = p.getBoundingClientRect().top; p.remove(); return y; }"""
    for w, h in ((1920, 1080), (1366, 768)):
        pg = new_page(b, w, h); x = P(pg)
        # 第 2 条：导出按钮「导出 ▲1」、菜单摘要；导出以后只写「导出」、摘要「✓ 全部已导出」
        x.click('#expBtn [data-act="exportMenu"]')
        m = x.E("(() => { const b = document.querySelector('.menu.exp .msum .mline b'); const u = b && b.querySelector('use'); return b && {t: b.textContent.trim(), ic: u && u.getAttribute('href'), col: u && getComputedStyle(b.querySelector('svg')).color, why: [...document.querySelectorAll('.menu.exp .mwhy li')].map(l => l.textContent.trim())}; })()")
        check(f'v3.6-2 {w} 导出 ▾ 菜单摘要「▲ 1 层需重新导出」（琥珀三角，和按钮同一个记号），3 层以内直接列出每层原因', bool(m) and m['t'] == '1 层需重新导出' and m['ic'] == '#i-stale' and m['col'] == AMBER and len(m['why']) == 1 and m['why'][0].startswith('金锦层') and '缩放' in m['why'][0], m)
        x.key('Escape')
        x.click('#expBtn [data-act="export"]')
        pg.wait_for_function("!document.querySelector('#expBtn .exb') && !document.querySelector('#expBtn .is-loading')", timeout=8000); pg.wait_for_timeout(200)
        x.E("window.SHELL && SHELL.state().ws !== 'baker' && SHELL.ws('baker')"); pg.wait_for_timeout(200)   # 导出完成后外壳会打开资源交付页，回到制作再看菜单
        x.click('#expBtn [data-act="exportMenu"]')
        m2 = x.E("(() => { const b = document.querySelector('.menu.exp .msum .mline b'); const u = b && b.querySelector('use'); return b && {t: b.textContent.trim(), ic: u && u.getAttribute('href'), amber: [...document.querySelectorAll('.menu.exp *')].some(e => getComputedStyle(e).color === 'rgb(224, 178, 90)'), btn: document.querySelector('#expBtn [data-act=export]').textContent.trim()}; })()")
        check(f'v3.6-2 {w} 没有要重新导出的层：按钮只写「导出」，菜单摘要「✓ 全部已导出」，没有琥珀', bool(m2) and m2['t'] == '全部已导出' and m2['ic'] == '#i-check' and not m2['amber'] and m2['btn'] == '导出', m2)
        x.key('Escape'); pg.close()

        pg = new_page(b, w, h); x = P(pg)
        # 第 7 条：竖线对齐
        al = x.E("""(() => { const R = s => document.querySelector(s).getBoundingClientRect(); const tw = s => { const w = document.createTreeWalker(document.querySelector(s), NodeFilter.SHOW_TEXT, {acceptNode: n => n.textContent.trim() && n.parentElement.getClientRects().length ? 1 : 3}); const n = w.nextNode(), r = document.createRange(); r.selectNodeContents(n); return Math.round(r.getBoundingClientRect().left); };
          return {rightGlyph: Math.round(R('#bRight').right - 6), tpGlyph: Math.round(R('#transport [data-act=thumb]').right - 6), fr: Math.round(R('#tlw .rrow .fr').right), pq: Math.round(R('#pq').left), mt: Math.round(R('#pbody .mod-h .mt').left), st: tw('#status'), brand: tw('#shell')}; })()""")
        check(f'v3.6-7 {w} 画面工具行右端图标笔画、播放条右组、刻度尺末端同一条线', al['rightGlyph'] == al['tpGlyph'] == al['fr'], al)
        check(f'v3.6-7 {w} 检查器搜索框左缘和模块标题同一条线；状态栏第一项文字和顶栏「烟花工坊」同一条起线（x12）', al['pq'] == al['mt'] and al['st'] == al['brand'] == 12, al)
        # 第 8 条：结构树行内图标按钮 24 × 28
        x.E("document.querySelector('#tree .trow.is-sel').classList.add('is-hover')")   # 悬停才出的「+」也量
        ac = x.E("[...document.querySelectorAll('#tree .trow.is-sel .acts .btn-icon')].filter(b => b.getClientRects().length).map(b => { const r = b.getBoundingClientRect(), i = b.querySelector('svg').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), Math.round(i.width)]; })")
        check(f'v3.6-8 {w} 结构树行内图标按钮（加、显示、只看、更多）可点区域 24 × 28，图标仍是 16', len(ac) == 4 and all(a == [24, 28, 16] for a in ac), ac)
        x.E("document.querySelector('#tree .trow.is-sel').classList.remove('is-hover')")
        # 第 5 条：画面读数两层暗晕
        sh = x.E("[getComputedStyle(document.getElementById('ciBL')).textShadow, getComputedStyle(document.querySelector('#ciView .num')).textShadow, getComputedStyle(document.getElementById('ciBL')).color]")
        check(f'v3.6-5 {w} 画面读数（左下、右下，含可输入的数）有两层暗晕，颜色不变', all(t.count('rgb(12, 21, 24)') == 2 for t in sh[:2]) and sh[2] == T3, sh)
        # 第 6 条：1366 下小号不再缩到 11
        fsz = x.E("(() => { const s = new Set(); for (const e of document.querySelectorAll('#wsBaker *, #shell *')) { if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || !e.getClientRects().length) continue; s.add(getComputedStyle(e).fontSize); } return [...s].sort(); })()")
        check(f'v3.6-6 {w} 字号只有三档；1366 下小号保持 12（没有 11 px），中号、大号各减 1', fsz == (['12px', '13px', '15px'] if w == 1920 else ['12px', '14px']), fsz)
        # 第 10 条：基线对齐（折叠模块的标题和摘要、导出范围一行的标签和数值）
        bl = x.E("(B => { const base = eval(B); const m = document.querySelector('#pbody .mod.is-closed'); const io = document.querySelector('#tlw .iorow');"
                 " return {mod: m ? Math.abs(base(m.querySelector('.mod-h .mt')) - base(m.querySelector('.mod-h .ms .msg') || m.querySelector('.mod-h .ms'))) : null, io: Math.abs(base(io.querySelector('.io-k')) - base(io.querySelector('.xv .u')))}; })", BASE)
        check(f'v3.6-10 {w} 折叠模块的标题和摘要、导出范围一行的标签和数值按基线对齐（差 ≤ 0.5 px）', bl['mod'] is not None and bl['mod'] <= .5 and bl['io'] <= .5, bl)
        # 第 13 条：多行文字行高 1.5
        x.hover('#bNote'); t1 = x.E("(() => { const t = document.querySelector('#ovlApp .tip'); const c = getComputedStyle(t); return parseFloat(c.lineHeight) / parseFloat(c.fontSize); })()")
        pg.locator('#libQ input').fill('zzzz'); pg.wait_for_timeout(150)
        t2 = x.E("(() => { const c = getComputedStyle(document.querySelector('#libList .empty')); return parseFloat(c.lineHeight) / parseFloat(c.fontSize); })()")
        pg.locator('#libQ input').fill(''); pg.wait_for_timeout(100)
        x.E("KIT.askDeleteEffect()"); pg.wait_for_timeout(150)
        t3 = x.E("(() => { const p = document.querySelector('.dialog p'); if (!p) return 0; const c = getComputedStyle(p); return parseFloat(c.lineHeight) / parseFloat(c.fontSize); })()")
        check(f'v3.6-13 {w} 悬停提示、空状态、对话框正文行高 ≥ 1.5', all(v and v >= 1.49 for v in (t1, t2, t3)), [t1, t2, t3])
        x.key('Escape'); pg.close()

    # 第 3 条：网格在中段右端固定槽位，换模式不跳位；左边只放文字分段
    pg = new_page(b); x = P(pg)
    g1 = x.R('#viewbar [data-act="grid"]'); x.E("KIT.mode('序列贴图')"); pg.wait_for_timeout(150); g2 = x.R('#viewbar [data-act="atlasGrid"]')
    lefts = x.E("[...document.querySelectorAll('#toolRow .tcol-m .seg')].map(e => e.getBoundingClientRect().left)")
    check('v3.6-3 构图网格（回放 / 实时）和格子线（序列贴图）在同一个槽位，换模式不跳；分段都在它左边', g1 and g2 and abs(g1[0] - g2[0]) <= .5 and all(l < g1[0] for l in lefts), [g1, g2])
    gaps = x.E("(() => { const r = s => document.querySelector(s).getBoundingClientRect(); const sg = [...document.querySelectorAll('#toolRow .tcol-m .seg')].map(e => e.getBoundingClientRect()); return [Math.round(sg[0].left - r('#bLeft').right), ...sg.slice(1).map((e, i) => Math.round(e.left - sg[i].right))]; })()")
    check('v3.6-3 画面工具行组间一律 20：左栏开关 → 工作模式 → 各分段', all(abs(g - 20) <= 1 for g in gaps), gaps)
    pg.close()
    # 第 11 条：版本记录图标——时钟加逆时针箭头，和恢复、秒表、复制都不同
    pg = new_page(b); x = P(pg)
    ink = x.E(INK_JS)
    hv = ink.get('i-history')
    check('v3.6-11 版本记录图标在 12 × 12 可画区域里，长边 12、居中（16 / 12 / 1.5）', bool(hv) and hv[0] >= 1.875 and hv[2] <= 14.125 and abs(max(hv[2] - hv[0], hv[3] - hv[1]) - 12) <= .5, hv)
    pg.close()


def main():
    only = [a[len('--only='):] for a in sys.argv[1:] if a.startswith('--only=')]
    run = lambda name: not only or name in only[0].split(',')
    with sync_playwright() as p:
        b = p.chromium.launch()
        if run('spec'): spec_static(b)
        if run('v31'): v31(b)
        if run('inter'): interactions(b)
        if run('v33'): v33(b)
        if run('v34'): v34(b)
        if run('v35'): v35(b)
        if run('v36'): v36(b)
        b.close()
    print(f'\n通过 {len(OK)}，失败 {len(BAD)}，页面错误 {len(ERR)}')
    for f in BAD: print('  失败：' + f)
    for e in ERR[:10]: print('  页面错误：' + e)
    sys.exit(1 if BAD or ERR else 0)


if __name__ == '__main__':
    main()
