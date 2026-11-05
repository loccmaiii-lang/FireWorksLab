#!/usr/bin/env python3
"""E 样板 v3 外壳走查（对话框9，2026-11-05；v3.3 外壳第 16–19 条；v3.4 外壳第 1–3 条和第 13 条）

覆盖：交互宪章 0.9 的全部入口和状态（含「用户 2026-11-05 改定」第 1–7 条）、交互走查 P4 / P8 / P9、
设计规范 v3 第 3–6、11、12 节里外壳能量的部分（尺寸、线、面、颜色用途、字号字重、浮层位置），
v3.1 / v3.2 / v3.3 改动单的外壳条目（v3.3：「设置」并进状态项、资源交付主区、「待验收」主文字色、图标画法与字号分用途），
1920 / 1366 下顶栏各状态组合和两页不溢出、不截断，样板挂钩缺失时不报错，以及文案自查表。
v3.4（宪章 0.9「15:50 再改」）：顶栏右侧只放「UE」｜显卡全名｜「编排工作台 →」；导出、备份在状态栏左端（制作区槽位 #stShell）；
「资源交付」是「导出 ▾」菜单第一项（制作区画 [data-exp=deliv] 和计数位 #expDelivN）。和这次决定冲突的旧检查（顶栏里的资源交付、
设置、显卡在最右、文件夹在顶栏、顶栏不画图标）改写成新规则，没有删。
制作区还没合入这两处时，走查在合成出来的临时文件里补上（只改 /tmp 的合成结果，不改制作区源码），并在结果里写一行「注意」；--no-shim 不补。

用法（在 src/ 下）：
  python3 checks/check_shell.py                    # 先跑 build.py 合成 /tmp/E_B.html，再走查
  python3 checks/check_shell.py --main-rev HEAD    # 制作区三份文件取 git 的 HEAD 版（A 改到一半时用），外壳取工作区
  python3 checks/check_shell.py --no-build --html /tmp/E_B.html
  --shots DIR（默认 /tmp/E_B_shots，不进仓库）  --no-shots  --no-table（不改写 说明_v3_外壳.md 的文案自查表）
浏览器只开一个（一个 Chromium、一个页面，换状态靠重新载入）。退出码：全部通过 0，否则 1。
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
MAIN_FILES = ['body_main.html', 'script_main.js']   # --main-rev 只换这两份；样式（token）仍用工作区的 style_main.css
NOTE = os.path.join(SRC, '说明_v3_外壳.md')

ap = argparse.ArgumentParser()
ap.add_argument('--html', default='/tmp/E_B.html')
ap.add_argument('--no-build', action='store_true')
ap.add_argument('--main-rev', default='')
ap.add_argument('--shots', default='/tmp/E_B_shots')
ap.add_argument('--no-shots', action='store_true')
ap.add_argument('--no-table', action='store_true')
ap.add_argument('--no-shim', action='store_true')
ap.add_argument('-v', '--verbose', action='store_true')
A = ap.parse_args()


# ---------------------------------------------------------------- 合成
def build():
    if A.no_build:
        return
    src = SRC
    if A.main_rev:
        tmp = tempfile.mkdtemp(prefix='E_B_src_')
        for f in os.listdir(SRC):
            p = os.path.join(SRC, f)
            if os.path.isfile(p):
                shutil.copy(p, tmp)
        os.symlink(os.path.join(SRC, 'assets'), os.path.join(tmp, 'assets'))
        rel = os.path.relpath(SRC, subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], cwd=SRC, text=True).strip())
        for f in MAIN_FILES:
            data = subprocess.check_output(['git', 'show', f'{A.main_rev}:{rel}/{f}'], cwd=SRC)
            open(os.path.join(tmp, f), 'wb').write(data)
        src = tmp
    r = subprocess.run([sys.executable, os.path.join(src, 'build.py'), A.html], capture_output=True, text=True)
    if r.returncode:
        print(r.stdout, r.stderr)
        sys.exit('build.py 失败')


SHIM = []   # 走查在合成结果里临时补上的制作区槽位


def shim():
    """制作区 v3.4 的两处接口还没合入时，在合成出来的文件里补上（槽位在时什么都不做）：
    状态栏左端 <span id="stShell"></span>；「导出 ▾」菜单第一项 <button data-exp="deliv">资源交付<span class="sh-cnt" id="expDelivN" hidden></span></button>"""
    if A.no_shim or not os.path.exists(A.html):
        return
    html = h0 = open(A.html, encoding='utf-8').read()
    if 'id="stShell"' not in html:
        a = '<div class="st-l"><button class="btn tbtn" data-act="copyNotes">'
        if a in html:
            html = html.replace(a, '<div class="st-l"><span id="stShell"></span><button class="btn tbtn" data-act="copyNotes">', 1)
            SHIM.append('状态栏槽位 #stShell')
    if 'id="expDelivN"' not in html:
        b = "  const items = [\n    {t: '重新导出'"
        if b in html:
            html = html.replace(b, "  const items = [\n    {t: '资源交付', html: '资源交付<span class=\"sh-cnt\" id=\"expDelivN\" hidden></span>', exp: 'deliv'},\n    {t: '重新导出'", 1)
            SHIM.append('「导出 ▾」菜单第一项「资源交付」')
    if html != h0:
        open(A.html, 'w', encoding='utf-8').write(html)


# ---------------------------------------------------------------- 结果
RES = []
INFO = []   # 样板组件（制作区 A 的类）上看到的、和规范对不上的地方：不算外壳失败，单独列出来转给 A


def info(s):
    if s not in INFO:
        INFO.append(s)


def ck(cid, cond, detail=''):
    RES.append((cid, bool(cond), str(detail)[:300]))
    if A.verbose or not cond:
        print(('  ok  ' if cond else 'FAIL  ') + cid + ('　' + str(detail)[:300] if detail and not cond else ''))
    return bool(cond)


def near(a, b, tol=1.0):
    return a is not None and b is not None and abs(a - b) <= tol


# ---------------------------------------------------------------- 页面里的小工具
JS_HELP = r"""
window.__T = (() => {
  const q = (s, r = document) => r.querySelector(s), qq = (s, r = document) => [...r.querySelectorAll(s)];
  const el = e => typeof e === 'string' ? q(e) : e;
  const vis = e => { e = el(e); return !!(e && e.isConnected && e.getClientRects().length && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden'); };
  const probe = () => { let p = q('#__probe'); if (!p) { p = document.createElement('i'); p.id = '__probe'; p.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none'; (q('#app') || document.body).appendChild(p); } return p; };
  const col = v => { const p = probe(); p.style.color = ''; p.style.color = v; return getComputedStyle(p).color; };
  const tok = n => col(`var(${n})`);
  const len = n => { const p = probe(); p.style.width = `var(${n})`; const w = parseFloat(getComputedStyle(p).width); p.style.width = '0'; return w; };
  const rect = e => { e = el(e); if (!e) return null; const r = e.getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom}; };
  const cs = (e, p, ps) => { e = el(e); return e ? getComputedStyle(e, ps || null)[p] : null; };
  /* 看得见的文字：各段文字之间按排版补一个空格（「资源交付 2」「导出 FWL_Export」），标点前后不补；藏起来的子元素不算 */
  const txt = e => { e = el(e); if (!e) return null; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let out = '', n;
    while ((n = w.nextNode())) { const h = n.parentElement && n.parentElement.closest('[hidden], svg'); if (h && h !== e && e.contains(h)) continue;
      const s = n.textContent.replace(/\s+/g, ' ').trim(); if (!s) continue;
      if (out && !/[（「：，、]$/.test(out) && !/^[，。：、）」]/.test(s)) out += ' '; out += s; }
    return out; };
  const desc = e => (e.id ? '#' + e.id : e.tagName.toLowerCase()) + [...e.classList].slice(0, 6).map(c => '.' + c).join('');
  const path = e => { const a = []; for (let x = e; x && x.id !== 'app' && x.id !== 'ovlApp' && a.length < 3; x = x.parentElement) a.unshift(desc(x)); return a.join(' > '); };
  const ownText = e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  /* 颜色用途扫描：roots 里所有看得见的元素（含 ::before / ::after），文字色、底色、边框、阴影、描边里出现了哪些指定颜色 */
  function scan(roots, colors) {
    const want = Object.entries(colors), hits = [];
    const match = v => { const f = want.find(([, c]) => c === v); return f && f[0]; };
    roots.forEach(r => {
      const root = el(r); if (!vis(root)) return;
      [root, ...qq('*', root)].forEach(e => {
        if (!vis(e) || e.closest('.sh-ph') || e.id === '__probe') return;
        for (const ps of [null, '::before', '::after']) {
          const s = getComputedStyle(e, ps);
          if (ps && (s.content === 'none' || s.content === 'normal' || s.display === 'none')) continue;
          const props = [];
          const txtLike = ps ? /^".+"$|^attr/.test(s.content) : (ownText(e) || e.matches('svg.i, .spin'));
          if (txtLike) props.push(['color', s.color]);
          if (s.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor)) props.push(['background', s.backgroundColor]);
          ['Top', 'Right', 'Bottom', 'Left'].forEach(sd => { if (parseFloat(s[`border${sd}Width`]) > 0 && s[`border${sd}Style`] !== 'none' && !/rgba\(0, 0, 0, 0\)/.test(s[`border${sd}Color`])) props.push(['border-' + sd.toLowerCase(), s[`border${sd}Color`]]); });
          if (s.boxShadow && s.boxShadow !== 'none') (s.boxShadow.match(/rgba?\([^)]*\)/g) || []).forEach(c => props.push(['shadow', c]));
          if (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) props.push(['outline', s.outlineColor]);
          props.forEach(([p, v]) => { const m = match(v); if (m) hits.push({c: m, el: path(e) + (ps || ''), p}); });
        }
      });
    });
    return hits;
  }
  /* 字号、字重：有自己文字的元素 */
  function fonts(roots) {
    const out = [];
    roots.forEach(r => { const root = el(r); if (!vis(root)) return; [root, ...qq('*', root)].forEach(e => { if (!vis(e) || !ownText(e) || e.closest('.sh-ph, svg')) return; const s = getComputedStyle(e); out.push({el: path(e), fs: parseFloat(s.fontSize), fw: +s.fontWeight, t: txt(e).slice(0, 20)}); }); });
    return out;
  }
  /* 截断 / 溢出：文字比自己的框宽（省略号的单独列出），子元素出了根的左右边 */
  function clip(roots) {
    const cut = [], ell = [], out = [];
    roots.forEach(r => {
      const root = el(r); if (!vis(root)) return; const R = root.getBoundingClientRect();
      [root, ...qq('*', root)].forEach(e => {
        if (!vis(e) || e.closest('.sh-ph, svg, .lib-list, .sh-tblw') && !e.matches('.lib-list .li-n, .lib-list .li-s span, .lib-list .sh-st')) return;
        const s = getComputedStyle(e);
        if ((ownText(e) || e.matches('button')) && e.scrollWidth > e.clientWidth + 1 && s.overflowX !== 'visible') (s.textOverflow === 'ellipsis' ? ell : cut).push(path(e) + '「' + txt(e).slice(0, 16) + '」');
        const b = e.getBoundingClientRect();
        if (e !== root && b.width && (b.right > R.right + 0.5 || b.left < R.left - 0.5) && !e.closest('.sh-tblw')) out.push(path(e));
      });
    });
    return {cut, ell, out};
  }
  const tipText = () => { const t = qq('.ovl > .tip:not(.hint)').find(vis); return t ? txt(t) : null; };
  const ovl = s => qq(s).filter(vis);
  return {q, qq, vis, col, tok, len, rect, cs, txt, scan, fonts, clip, tipText, ovl, path};
})();
"""


class P:
    """一个浏览器、一个页面；fresh() 重新载入并把样板控制条藏起来（它是固定在右上角的样板开关，会盖住顶栏右端）"""

    def __init__(self, browser):
        self.errs = []
        self.pg = browser.new_page(viewport={'width': 1920, 'height': 1080}, device_scale_factor=1)
        self.pg.on('pageerror', lambda e: self.errs.append(f'pageerror: {e}'))
        self.pg.on('console', lambda m: m.type == 'error' and 'ERR_' not in m.text and 'net::' not in m.text and self.errs.append(f'console: {m.text}'))
        self.pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith(('file:', 'data:')) else r.abort())
        self.size = 1920
        self.url = 'file://' + os.path.abspath(A.html)

    def fresh(self, size=1920, url=None, kit=False):
        pg = self.pg
        if size != self.size or url:
            pg.set_viewport_size({'width': 1920 if size == 1920 else 1366, 'height': 1080 if size == 1920 else 768})
        pg.goto(url or self.url)
        pg.wait_for_function('window.SHELL && window.KIT', timeout=15000)
        pg.evaluate(JS_HELP)
        pg.evaluate('SHELL.speed(0.15)')
        if size == 1366:
            pg.evaluate("KIT.set('size', '1366')")
        if not kit:
            pg.add_style_tag(content='#sampleBar{visibility:hidden!important}')
        pg.mouse.move(5, 1000 if size == 1920 else 700)
        self.size = size
        pg.wait_for_timeout(120)

    def ev(self, js, arg=None):
        return self.pg.evaluate(js, arg) if arg is not None else self.pg.evaluate(js)

    def click(self, sel, **kw):
        self.pg.click(sel, timeout=4000, **kw)
        self.pg.wait_for_timeout(60)

    def wait(self, js, timeout=4000):
        try:
            self.pg.wait_for_function(js, timeout=timeout)
            return True
        except Exception:
            return False

    def shot(self, name, clip=None, full=False):
        if A.no_shots:
            return
        os.makedirs(A.shots, exist_ok=True)
        self.pg.mouse.move(2, 1070 if self.size == 1920 else 760)
        self.pg.wait_for_timeout(80)
        kw = {'path': os.path.join(A.shots, name)}
        if clip:
            kw['clip'] = clip
        if full:
            kw['full_page'] = True
        self.pg.screenshot(**kw)


# ---------------------------------------------------------------- 文案收集
COPY = []


def grab(p, where_hint=''):
    try:
        for w, c, s in p.ev('SHELL.copy()'):
            COPY.append((w, c, s))
        for kind, c, s in p.ev('(window.__shCopyLog || []).splice(0)'):
            COPY.append((AREA_OF_KIND.get(kind, where_hint or '浮层'), c, s))
    except Exception as e:
        ck('文案-收集', False, e)


AREA_OF_KIND = {'菜单': '浮层', '对话框': '对话框', '提示条': '提示条', '气泡': '浮层', '操作处提示': '浮层', '就地报错': '对话框'}


def logon(p):
    p.ev('window.__shCopyLog = []')


# ================================================================= 走查
def deliv_menu(p):
    """打开「导出 ▾」菜单，读第一项「资源交付」和它的计数（菜单留着开）"""
    p.ev('KIT.openExport()')
    p.pg.wait_for_selector('.menu [data-exp="deliv"]', timeout=3000)
    p.pg.wait_for_timeout(30)
    return p.ev("""(() => { const m = __T.ovl('.menu')[0], b = m.querySelector('[data-exp=deliv]'), c = b.querySelector('#expDelivN'), cs = c && getComputedStyle(c);
        return {first: m.querySelector('.mi, button[data-exp]') === b, t: __T.txt(b), n: c && !c.hidden && __T.vis(c) ? __T.txt(c) : '', bw: cs && cs.borderTopWidth, bs: cs && cs.borderTopStyle,
                r: cs && cs.borderTopLeftRadius, fs: cs && parseFloat(cs.fontSize), label: b.getAttribute('aria-label') || ''}; })()""")


def close_menus(p):
    p.ev("document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))")
    p.pg.wait_for_timeout(40)


def deliv_n(p):
    """待导入的包数，按用户看到的读：回到制作、打开「导出 ▾」看「资源交付」后面的计数，再回原来那一页（只换显示）"""
    ws = p.ev('SHELL.state().ws')
    if ws != 'baker':
        p.ev("SHELL.ws('baker')")
    d = deliv_menu(p)
    close_menus(p)
    if ws != 'baker':
        p.ev(f"SHELL.ws('{ws}')")
    return d['n']


def open_deliv(p):
    """用户的路径：「导出 ▾」→「资源交付」"""
    if p.ev('SHELL.state().ws') != 'baker':
        p.ev("SHELL.ws('baker')")
    deliv_menu(p)
    p.click('.menu [data-exp="deliv"]')
    p.wait("SHELL.state().ws === 'import'", 2000)


def t_bar(p, size):
    """改定 1、6；宪章 0.9「用户 2026-11-05 15:50 再改」；v3.4 第 1–3 条；规范第 11 节"""
    S = f'@{size}'
    p.fresh(size)
    logon(p)
    st = p.ev('SHELL.state()')
    ck(f'改定1-默认画面是制作{S}', st['ws'] == 'baker' and p.ev("__T.vis('#wsBaker') && !__T.vis('#wsImport') && !__T.vis('#wsWB')"), st)
    ck(f'改定1-没有工作区切换{S}', p.ev("""(() => { const b = __T.qq('#shell button, #shell [role=tab]').map(x => __T.txt(x));
        return !__T.q('#shell [data-sh="ws"], #shell .sh-ws-tabs, #shell [role=tablist]') && !b.some(t => ['制作', '导入', '编排'].includes(t)); })()"""))
    ck(f'改定6-顶栏没有「更新记录」一项{S}', p.ev("!__T.qq('#shell button, #shell span').some(x => __T.txt(x) === '更新记录' || /^更新记录 ?\\d*$/.test(__T.txt(x)))"))
    # v3.4 第 3 条：右侧只放三项「UE 已连接」｜「GeForce RTX 5080」｜「编排工作台 →」（原来的规则「状态｜页面入口｜显卡在最右」改写成这条）
    g = p.ev("""__T.qq('#shell .sh-r > .sh-g').map(x => ({c: x.className, x: __T.rect(x).x, r: __T.rect(x).r, t: __T.txt(x)}))""")
    ok = len(g) == 3 and [x['t'] for x in g] == ['UE 已连接', 'GeForce RTX 5080', '编排工作台'] and all(g[i]['r'] <= g[i + 1]['x'] for i in range(2))
    ck(f'v3.4-3 顶栏右侧只放三项：UE 已连接｜GeForce RTX 5080｜编排工作台 →{S}', ok, [x['t'] for x in g])
    nf = p.ev("""({fold: __T.qq('#shell [data-sh=fold], #shell .sh-fold, #shell [data-fk]').length, deliv: __T.qq('#shell button, #shell span').filter(x => /^资源交付/.test(__T.txt(x))).length,
        set: __T.qq('#shell .sh-set, #shell [data-sh=foldSet]').length + __T.qq('#shell button, #shell span, #status button, #status span').filter(__T.vis).filter(x => __T.txt(x) === '设置').length})""")
    ck(f'v3.4-1 顶栏没有导出、备份文件夹（搬到状态栏左端）{S}', nf['fold'] == 0, nf)
    ck(f'v3.4-2 顶栏没有「资源交付」（改由「导出 ▾」菜单第一项打开）{S}', nf['deliv'] == 0, nf)
    ck(f'v3.3-16 顶栏和状态栏都没有单独的「设置」{S}', nf['set'] == 0, nf)
    sh = p.ev("__T.rect('#shell')")
    pos = p.ev("({ue: __T.rect('#shell .sh-g-st'), gpu: __T.rect('#shell .sh-gpu'), ent: __T.rect('#shell .sh-go'), pad: parseFloat(__T.cs('#shell', 'paddingRight'))})")
    ck(f'v3.4-3「编排工作台 →」在最右，显卡在 UE 和它之间（原「显卡在最右」改写）{S}', near(pos['ent']['r'], sh['r'] - pos['pad'], 1.5) and pos['ue']['r'] < pos['gpu']['x'] < pos['gpu']['r'] < pos['ent']['x'], pos)
    gt = p.ev("({t: __T.txt('#shell .sh-gpu'), tip: __T.q('#shell .sh-gpu').dataset.tip || ''})")
    ck(f'v3.4-3 显卡写全名「GeForce RTX 5080」（v1 的样板数据，不缩写）{S}', gt['t'] == 'GeForce RTX 5080', gt)
    # 第 11 节：高度、面、底线
    H = 40 if size == 1920 else 36
    ck(f'规范11-顶栏高 {H}{S}', near(sh['h'], H), sh['h'])
    ck(f'规范11-顶栏用栏头面色{S}', p.ev("__T.cs('#shell', 'backgroundColor') === __T.tok('--surf-chrome')"), p.ev("[__T.cs('#shell', 'backgroundColor'), __T.tok('--surf-chrome')]"))
    bl = p.ev("""(() => { const s = getComputedStyle(__T.q('#shell')); return {bw: s.borderBottomWidth, sh: s.boxShadow, line: __T.tok('--line')}; })()""")
    one = (bl['bw'] == '1px') != ('0px -1px 0px' in bl['sh'] and bl['line'] in bl['sh'])
    ck(f'规范11-底边一条 1 px 线（不叠成 2 px）{S}', one and (bl['line'] in bl['sh'] or bl['bw'] == '1px'), bl)
    # 产品名、版本号（版本号照旧在最左边，点开更新记录）
    fs = {1920: (12, 13, 15), 1366: (11, 12, 14)}[size]
    b = p.ev("({t: __T.txt('#shell .sh-brand b'), fs: parseFloat(__T.cs('#shell .sh-brand b', 'fontSize')), fw: +__T.cs('#shell .sh-brand b', 'fontWeight'), c: __T.cs('#shell .sh-brand b', 'color'), t1: __T.tok('--t1')})")
    ck(f'规范11-「烟花工坊」大号 600{S}', b['t'] == '烟花工坊' and b['fs'] == fs[2] and b['fw'] == 600 and b['c'] == b['t1'], b)
    v = p.ev("""(() => { const v = __T.q('#shell .sh-ver'), c = v.querySelector('.sh-cnt'), cs = c && getComputedStyle(c);
        return {t: __T.txt(v), fs: parseFloat(__T.cs(v, 'fontSize')), c: __T.cs(v, 'color'), t3: __T.tok('--t3'), after: getComputedStyle(v, '::after').content, h: __T.rect(v).h, tag: v.tagName, x: __T.rect(v).x - __T.rect('#shell').x,
                n: c && {t: __T.txt(c), bw: cs.borderTopWidth, bs: cs.borderTopStyle, r: cs.borderTopLeftRadius, fs: parseFloat(cs.fontSize), fw: +cs.fontWeight, after: __T.rect(c).x >= __T.rect(v).x + 40}}; })()""")
    ck(f'规范11 / v3.4-3 版本号小号弱色，照旧在最左边（紧跟产品名）{S}', v['t'] == 'FireWorksLab 5.0.3 2' and v['fs'] == fs[0] and v['c'] == v['t3'] and v['x'] < 120, v)
    ck(f'v3.1-11 未读数：跟在版本号后面的计数框（1 px 方框、小号），没有右上角的「²」{S}', v['n'] and v['n']['t'] == '2' and v['n']['bw'] == '1px' and v['n']['bs'] == 'solid' and v['n']['r'] == '0px' and v['n']['fs'] == fs[0] and v['n']['after'] and v['after'] in ('none', 'normal'), v)
    ck(f'规范2-版本号可点区域 ≥ 28{S}', v['tag'] == 'BUTTON' and v['h'] >= 28 - 0.5, v['h'])
    p.pg.hover('#shell .sh-ver .sh-cnt')
    ck(f'v3.2-13 版本号后的计数悬停写「2 条未读更新」{S}', p.wait("__T.tipText() === '2 条未读更新'", 2500), p.ev('__T.tipText()'))
    p.pg.mouse.move(5, 600)
    kb = p.ev("""(() => { const b = __T.q('#status [data-act=keys]'); return b && {t: __T.txt(b), kbd: [...b.querySelectorAll('kbd')].filter(__T.vis).length}; })()""")
    ck(f'v3.2-13 状态栏「快捷键」后面不加方框{S}', kb and kb['t'].startswith('快捷键') and kb['kbd'] == 0, kb)
    boxes = p.ev("""__T.qq('#app .sh-cnt, #app kbd').filter(__T.vis).map(x => __T.txt(x))""")
    ck(f'v3.2-13 方框里只有数字{S}', all(re.fullmatch(r'\d+', x or '') for x in boxes), boxes)
    # 分组：组间 24 px、正中一条 1 px 竖线（高 16，v3.4 第 3 条）；组内 12
    gp = p.ev("""(() => { const r = __T.q('#shell .sh-r'), gs = __T.qq('.sh-g', r);
        return {gap: getComputedStyle(r).columnGap, gi: gs.filter(x => !x.classList.contains('sh-g-pg')).map(x => getComputedStyle(x).columnGap),
                seps: gs.slice(1).map(x => { const s = getComputedStyle(x, '::before'); return {w: s.width, h: s.height, bg: s.backgroundColor, left: parseFloat(s.left)}; }), line: __T.tok('--line'),
                dist: gs.slice(1).map((x, i) => __T.rect(x).x - __T.rect(gs[i]).r)}; })()""")
    ck(f'v3.1-10 组间 24{S}', gp['gap'] == '24px' and all(near(d, 24, 0.6) for d in gp['dist']), gp['dist'])
    ck(f'v3.4-3 三项之间各一条 1 px 竖线，高 16，在组间正中{S}', len(gp['seps']) == 2 and all(x['w'] == '1px' and x['h'] == '16px' and x['bg'] == gp['line'] and near(x['left'], -12, 0.6) for x in gp['seps']), gp['seps'])
    ck(f'规范11-组内 12{S}', all(x == '12px' for x in gp['gi']), gp['gi'])
    # 状态：正常的不画圆点、弱色字；要处理的那个词前面一个琥珀圆点、那个词琥珀（v3.4 第 1 条写法「备份 ● 未选」）
    one_st = """e => { const w = e.querySelector('.sh-sv.is-warn'), b = w && getComputedStyle(w, '::before'), k = e.querySelector('.sh-fk');
        return {t: __T.txt(e), c: __T.cs(e, 'color'), k: k ? __T.cs(k, 'color') : null, before: getComputedStyle(e, '::before').content, v: [...e.querySelectorAll('.sh-sv')].map(x => [__T.txt(x), __T.cs(x, 'color')]),
                dot: b && {bg: b.backgroundColor, w: b.width, r: b.borderTopLeftRadius}, dx: w && k ? __T.rect(w).x - __T.rect(k).r : null}; }"""
    st = p.ev(f"""(() => {{ const one = {one_st};
        return {{ue: one(__T.q('#shell .sh-ue')), slot: !!__T.q('#stShell'), exp: __T.q('#stShell [data-fk=exp]') && one(__T.q('#stShell [data-fk=exp]')), bak: __T.q('#stShell [data-fk=bak]') && one(__T.q('#stShell [data-fk=bak]')),
                w3: __T.tok('--w3'), t2: __T.tok('--t2'), t3: __T.tok('--t3')}}; }})()""")
    ck(f'v3.2-11「UE 已连接」：正常，不画圆点，弱色字{S}', st['ue']['t'] == 'UE 已连接' and not st['ue']['dot'] and st['ue']['before'] in ('none', 'normal') and st['ue']['c'] == st['t3'] and all(c == st['t3'] for _, c in st['ue']['v']), st['ue'])
    # v3.4 第 1 条：状态栏左端（制作区留的槽位 #stShell）：「导出 FWL_Export」「备份 ● 未选」，「复制意见」排在后面
    sb = p.ev("""(() => { const s = __T.q('#stShell'); if (!s) return null; const l = __T.q('#status .st-l'), cp = __T.q('#status [data-act=copyNotes]'), e = __T.q('#stShell [data-fk=exp]'), k = __T.q('#stShell [data-fk=bak]');
        return {first: l.firstElementChild === s, x: __T.rect(e).x - __T.rect('#status').x, order: [...s.querySelectorAll('[data-fk]')].map(x => x.dataset.fk), cpAfter: cp ? __T.rect(cp).x > __T.rect(k).r : null,
                gap: __T.rect(k).x - __T.rect(e).r, cpGap: cp ? __T.rect(cp).x - __T.rect(k).r : null, h: __T.rect(e).h, ch: cp ? __T.rect(cp).h : null, role: s.getAttribute('role')}; })()""")
    ck(f'v3.4-1 状态栏最左边是「导出」「备份」两项，「复制意见」排在后面（隔 12）{S}', sb and sb['first'] and sb['order'] == ['exp', 'bak'] and sb['cpAfter'] and near(sb['cpGap'], 12, 0.6) and sb['x'] <= 16, sb)
    ck(f'v3.4-1 导出、备份之间组内 12{S}', sb and near(sb['gap'], 12, 0.6), sb)
    ck(f'v3.2-11「导出 FWL_Export」：正常，不画圆点，标签和值都是弱色{S}', st['exp'] and st['exp']['t'] == '导出 FWL_Export' and not st['exp']['dot'] and st['exp']['k'] == st['t3'] and all(c == st['t3'] for _, c in st['exp']['v']), st['exp'])
    ck(f'v3.4-1「备份 ● 未选」：琥珀圆点（7 px）在「备份」和「未选」之间，「未选」琥珀，「备份」弱色{S}', st['bak'] and st['bak']['t'] == '备份 未选' and st['bak']['dot'] and st['bak']['dot']['bg'] == st['w3'] and st['bak']['dot']['w'] == '7px' and st['bak']['dot']['r'] == '50%'
       and st['bak']['dx'] is not None and st['bak']['dx'] > 0 and st['bak']['k'] == st['t3'] and st['bak']['v'] == [['未选', st['w3']]], st['bak'])
    # v3.3 第 16 条的点法沿用：整项是命令，静止无底，悬停出底色、字亮一级，悬停写点了做什么；「UE 已连接」不能点，悬停不变
    one = """k => { const e = k === 'ue' ? __T.q('#shell .sh-ue') : __T.q(`#stShell [data-fk=${k}]`), f = e.querySelector('.sh-fk');
        return {tag: e.tagName, bg: __T.cs(e, 'backgroundColor'), k: f ? __T.cs(f, 'color') : __T.cs(e, 'color'), h: __T.rect(e).h, tip: e.dataset.tip, cur: __T.cs(e, 'cursor')}; }"""
    TR = ('rgba(0, 0, 0, 0)', 'transparent')
    hv = {}
    for k in ('exp', 'bak', 'ue'):
        rest = p.ev(f'({one})', k)
        p.pg.hover('#shell .sh-ue' if k == 'ue' else f'#stShell [data-fk="{k}"]')
        p.pg.wait_for_timeout(60)
        want = json.dumps(re.sub(r'[\s\u3000]+', ' ', rest['tip']))   # 提示框里的文字按排版取，全角空格算空白
        hv[k] = {'rest': rest, 'hov': p.ev(f'({one})', k), 'tipShown': p.wait(f"__T.tipText() === {want}", 2500)}
        p.pg.mouse.move(5, 600)
    tk = p.ev("({hov: __T.tok('--hov'), t2: __T.tok('--t2'), t3: __T.tok('--t3')})")
    for k, nm, tip in (('exp', '「导出 FWL_Export」', '更换导出文件夹　D:\\FireWorksLab\\FWL_Export'), ('bak', '「备份 ● 未选」', '选择备份文件夹')):
        x = hv[k]
        ck(f'v3.3-16 / v3.4-1 {nm}整项可点：按钮、静止无底、点击区同状态栏的「复制意见」{S}', x['rest']['tag'] == 'BUTTON' and x['rest']['bg'] in TR and sb and near(x['rest']['h'], sb['ch'], 0.6) and x['rest']['cur'] == 'pointer', (x['rest'], sb and sb['ch']))
        ck(f'v3.3-16 {nm}悬停出底色、标签亮一级{S}', x['hov']['bg'] == tk['hov'] and x['hov']['k'] == tk['t2'] and x['rest']['k'] == tk['t3'], x)
        ck(f'v3.3-16 {nm}悬停写「{tip.split("　")[0]}」{S}', x['rest']['tip'] == tip and x['tipShown'], x['rest']['tip'])
    ck(f'v3.3-16「UE 已连接」不能点：悬停不出底色，和能点的分得开{S}', hv['ue']['rest']['tag'] != 'BUTTON' and hv['ue']['hov']['bg'] in TR and hv['ue']['rest']['cur'] != 'pointer', hv['ue'])
    # v3.4 第 3 条：「编排工作台 →」
    ent = """() => { const x = __T.q('#shell .sh-go'), s = x.querySelector('svg.sh-arr'), u = s && s.querySelector('use'), cs = s && getComputedStyle(s), t = x.querySelector('span');
        return {t: __T.txt(x), on: x.getAttribute('aria-pressed'), fw: +__T.cs(x, 'fontWeight'), fs: parseFloat(__T.cs(x, 'fontSize')), c: __T.cs(x, 'color'), u: getComputedStyle(x, '::after').content, bg: __T.cs(x, 'backgroundColor'), h: __T.rect(x).h, tip: x.dataset.tip,
                svg: s && {href: u && u.getAttribute('href'), w: __T.rect(s).w, h: __T.rect(s).h, tf: cs.transform, sw: cs.strokeWidth, cap: cs.strokeLinecap, join: cs.strokeLinejoin, fill: cs.fill, c: cs.color, tr: cs.translate, after: __T.rect(s).x - __T.rect(t).r}}; }"""
    e0 = p.ev(f'({ent})()')
    tk = p.ev("({hov: __T.tok('--hov'), t1: __T.tok('--t1'), t2: __T.tok('--t2'), p4: __T.tok('--p4')})")
    ck(f'v3.4-3「资源编排」改名「编排工作台」，静止：次文字色、正文字号、400、无下划线、无底{S}', e0['t'] == '编排工作台' and e0['on'] == 'false' and e0['fw'] == 400 and e0['fs'] == fs[1] and e0['c'] == tk['t2'] and e0['u'] in ('none', 'normal') and e0['bg'] in TR, e0)
    sv = e0['svg'] or {}
    ck(f'v3.4-3 名称后面向右的箭头：样板 #i-back 左右翻转，16 × 16，线宽 1.5，方头尖角，不填面{S}', sv.get('href') == '#i-back' and near(sv['w'], 16, 0.3) and near(sv['h'], 16, 0.3) and sv['tf'] == 'matrix(-1, 0, 0, 1, 0, 0)'
       and sv['sw'] == '1.5px' and sv['cap'] == 'square' and sv['join'] == 'miter' and sv['fill'] == 'none' and 0 <= sv['after'] <= 8, sv)
    ck(f'规范2-「编排工作台 →」可点区域 ≥ 28，悬停写「打开编排工作台」{S}', e0['h'] >= 28 and e0['tip'] == '打开编排工作台', e0)
    p.pg.hover('#shell .sh-go')
    p.pg.wait_for_timeout(220)
    e1 = p.ev(f'({ent})()')
    ck(f'v3.4-3「编排工作台 →」悬停：出底色、主文字色，箭头右移 2 px、变薄荷{S}', e1['bg'] == tk['hov'] and e1['c'] == tk['t1'] and e1['svg']['tr'] == '2px' and e1['svg']['c'] == tk['p4'] and sv.get('tr') in ('none', '0px'), (e1, sv.get('tr')))
    p.pg.mouse.move(5, 600)
    # 粗体只给当前位置和标题（v3.1 第 9 条）：顶栏里 600 只有产品名（打开着编排工作台时在 t_pages 里查）
    bold = p.ev("__T.fonts(['#shell']).filter(x => x.fw >= 600).map(x => x.t)")
    ck(f'v3.1-9 顶栏粗体只有产品名{S}', bold == ['烟花工坊'], bold)
    gp2 = p.ev("({fs: parseFloat(__T.cs('#shell .sh-gpu', 'fontSize')), c: __T.cs('#shell .sh-gpu', 'color'), t3: __T.tok('--t3')})")
    ck(f'规范11-显卡小号弱色{S}', gp2['fs'] == fs[0] and gp2['c'] == gp2['t3'], gp2)
    fo = p.ev("__T.fonts(['#shell', '#stShell'])")
    ck(f'规范1-顶栏、状态栏左端字重只有 400 / 600{S}', all(x['fw'] in (400, 600) for x in fo), [x for x in fo if x['fw'] not in (400, 600)])
    ck(f'规范1-顶栏、状态栏左端字号只用三级{S}', all(x['fs'] in fs for x in fo), [x for x in fo if x['fs'] not in fs])
    # v3.3 第 19 条（按第 6 条分用途）：大号只给产品名；中号给命令（编排工作台入口）；小号给读数和计数（版本号、UE、显卡、计数，状态栏的导出、备份）
    use = p.ev("""(() => { const f = s => __T.qq(s).filter(__T.vis).map(e => parseFloat(__T.cs(e, 'fontSize')));
        return {big: __T.fonts(['#shell']).filter(x => x.fs === %d).map(x => x.t), mid: f('#shell .sh-pg'), small: f('#shell .sh-ver, #shell .sh-ue, #shell .sh-cnt, #shell .sh-gpu, #stShell .sh-fold')}; })()""" % fs[2])
    ck(f'v3.3-19 字号分用途：大号只给产品名、入口中号、状态读数和计数小号{S}', use['big'] == ['烟花工坊'] and use['mid'] and all(x == fs[1] for x in use['mid']) and use['small'] and all(x == fs[0] for x in use['small']), use)
    ic = p.ev("__T.qq('#shell svg').filter(__T.vis).map(s => s.getAttribute('class'))")
    ck(f'v3.4-3 顶栏只有一个图标：「编排工作台」后面的箭头（状态只用文字、圆点、转圈；原「顶栏不画图标」改写）{S}', ic == ['i sh-arr'], ic)
    p.shot(f'shell_1_bar_{size}.png', clip={'x': 0, 'y': 0, 'width': size, 'height': H + 8})
    if not A.no_shots:
        p.pg.hover('#shell .sh-go')
        p.pg.wait_for_timeout(220)
        p.pg.screenshot(path=os.path.join(A.shots, f'shell_1h_entry_hover_{size}.png'), clip={'x': size - 420, 'y': 0, 'width': 420, 'height': H + 8})
        p.pg.mouse.move(5, 600)
        hs = p.ev("__T.rect('#status')")
        p.shot(f'shell_1s_status_{size}.png', clip={'x': 0, 'y': hs['y'] - 8, 'width': 640, 'height': hs['h'] + 8})
    # 悬停：版本号 → 「更新记录」（样板的提示框）
    p.pg.hover('#shell .sh-ver')
    ok = p.wait("__T.tipText() === '更新记录'", 2500)
    ck(f'改定6-版本号悬停写「更新记录」{S}', ok, p.ev('__T.tipText()'))
    p.pg.mouse.move(5, 600)


def t_version(p):
    """改定 6：点版本号打开更新记录；未读数；看过就不再显示；各部分版本号；复制版本"""
    p.fresh()
    logon(p)
    p.click('#shell .sh-ver')
    m = p.ev("""(() => { const m = __T.ovl('.menu.sh-about')[0]; if (!m) return null; const a = __T.rect('#shell .sh-ver'), r = __T.rect(m), s = getComputedStyle(m);
        return {role: m.getAttribute('role'), head: __T.txt(m.querySelector('.mh')), log: __T.qq('.sh-log li', m).map(__T.txt), dl: __T.txt(m.querySelector('.sh-vers')),
                items: __T.qq('[data-mi]', m).map(__T.txt), top: r.y - a.b, left: r.x - a.x, bg: s.backgroundColor, ov: __T.tok('--ov'), bw: s.borderTopWidth, sh: s.boxShadow,
                exp: __T.q('#shell .sh-ver').getAttribute('aria-expanded')}; })()""")
    ck('改定6-点版本号打开更新记录', m is not None and m['role'] == 'dialog' and m['exp'] == 'true', m)
    if m:
        ck('改定6-标题写新内容条数', m['head'] == '5.0.3 新内容 2 条', m['head'])
        ck('改定6-列出新内容', m['log'] == ['合并为烟花工坊', '保存时可放进编排'], m['log'])
        ck('改定6 / v3.4-3 各部分版本号（原「关于」并进来）；编排工作台改名、显卡写全名', all(s in m['dl'] for s in ('制作', '烘焙器 4.9.129', '资源交付', '导入器 v2.31', '编排工作台', '16.0.37', '浏览器', '显卡', 'GeForce RTX 5080')) and '资源编排' not in m['dl'], m['dl'])
        ck('改定6-「全部记录」「复制版本」', m['items'] == ['全部记录', '复制版本'], m['items'])
        ck('规范12-更新记录浮层：浮层面色 + 1 px 线 + 阴影，在版本号下方', m['bg'] == m['ov'] and m['bw'] == '1px' and m['sh'] != 'none' and 0 <= m['top'] <= 9, m)
    p.shot('shell_7_version_menu.png', clip={'x': 0, 'y': 0, 'width': 700, 'height': 360})
    p.pg.keyboard.press('Escape')
    p.pg.wait_for_timeout(80)
    v = p.ev("({n: __T.q('#shell .sh-ver').dataset.n || '', m: __T.ovl('.menu.sh-about').length, f: document.activeElement === __T.q('#shell .sh-ver')})")
    ck('改定6-Esc 关闭、焦点回到版本号', v['m'] == 0 and v['f'], v)
    ck('改定6-看过后未读数消失', v['n'] == '', v)
    p.click('#shell .sh-ver')
    ck('改定6-再打开标题写「更新记录」', p.ev("__T.txt(__T.ovl('.menu.sh-about .mh')[0])") == '5.0.3 更新记录')
    p.click('#shell .sh-ver')
    ck('改定6-再点一次版本号收起', p.ev("__T.ovl('.menu.sh-about').length") == 0)
    p.click('#shell .sh-ver')
    p.click('.menu.sh-about [data-mi="copy"]')
    ck('改定6-复制版本', p.ev("__T.ovl('.sh-hint').map(__T.txt).includes('已复制版本')"), p.ev("__T.ovl('.sh-hint').map(__T.txt)"))
    grab(p, '浮层')


def t_pages(p, size):
    """改定 3、4、5 + v3.4 第 2、3 条：「导出 ▾」第一项打开资源交付、「编排工作台 →」打开编排、回到制作（两种方式）；只换显示不丢状态；规范第 11 节下划线"""
    S = f'@{size}'
    p.fresh(size)
    logon(p)
    before = p.ev("({sel: KIT.sel(), t: KIT.t(), tree: KIT.tree()})")
    # 制作区里做点改动：选另一层、滚动检查器
    other = p.ev("""(() => { const s = KIT.sel(); const c = __T.qq('#tree [role=treeitem]:not(.is-sel)').map(r => __T.txt(r.querySelector('.tx') || r)).filter(x => x && x !== s); return c[1] || c[0] || null; })()""")
    if other:
        p.ev('n => KIT.select(n)', other)
    ck(f'0.4-（准备）制作区换了当前层{S}', bool(other) and p.ev('KIT.sel()') != before['sel'], (other, before['sel'], p.ev('KIT.sel()')))
    p.ev("(() => { const b = __T.q('#pbody'); if (b) b.scrollTop = 120; })()")
    mid = p.ev("({sel: KIT.sel(), t: KIT.t(), sc: (__T.q('#pbody') || {}).scrollTop || 0})")
    # v3.4 第 2 条：「导出 ▾」菜单第一项「资源交付」+ 待导入的包数（计数框同版本号后面的）
    d = deliv_menu(p)
    fs = {1920: (12, 13, 15), 1366: (11, 12, 14)}[size]
    ck(f'v3.4-2「导出 ▾」菜单第一项「资源交付 2」：计数 = 待导入的包数{S}', d['first'] and d['t'] == '资源交付 2' and d['n'] == '2' and d['label'] == '资源交付，2 个素材包待导入', d)
    ck(f'v3.1-11 / v3.4-2 计数框：1 px 方框、直角、小号（同版本号后面的）{S}', d['bw'] == '1px' and d['bs'] == 'solid' and d['r'] == '0px' and d['fs'] == fs[0], d)
    p.shot(f'shell_3_export_menu_{size}.png', clip=p.ev("(() => { const r = __T.rect(__T.ovl('.menu')[0]); return {x: Math.max(0, r.x - 16), y: Math.max(0, r.y - 48), width: Math.min(r.w + 32, 700), height: Math.min(r.h + 64, 700)}; })()"))
    p.click('.menu [data-exp="deliv"]')
    st = p.ev("""({ws: SHELL.state().ws, imp: __T.vis('#wsImport'), bk: __T.vis('#wsBaker'), dock: __T.q('#wsImport').parentElement === __T.q('#wsBaker').parentElement,
        wbDock: !!__T.q('#app #wsWB'), menu: __T.ovl('.menu').length, sel: (__T.q('#impList [aria-selected=true]') || {dataset: {}}).dataset.id || null, on: __T.qq('#shell .sh-pg[aria-pressed=true]').length})""")
    ck(f'v3.4-2 点「资源交付」打开那一页，菜单收起{S}', st['ws'] == 'import' and st['imp'] and not st['bk'] and st['menu'] == 0 and st['sel'], st)
    ck(f'改定3-只有打开的那页放进 #app{S}', st['dock'] and not st['wbDock'], st)
    ck(f'v3.4-2 资源交付不在顶栏：打开着时顶栏没有亮着的入口{S}', st['on'] == 0, st)
    bold = p.ev("__T.fonts(['#shell']).filter(x => x.fw >= 600).map(x => x.t)")
    ck(f'v3.1-9 打开资源交付时顶栏粗体只有产品名{S}', bold == ['烟花工坊'], bold)
    # 「← 返回制作」在页面工具行左端
    bk = p.ev("""(() => { const b = __T.q('#impTool .sh-back'), t = __T.rect('#impTool'), r = __T.rect(b), i = b.querySelector('svg.i use');
        return {t: __T.txt(b), x: r.x - t.x, h: r.h, icon: i && i.getAttribute('href'), iw: __T.rect(b.querySelector('svg.i')).w, first: __T.qq('#impTool button').filter(__T.vis)[0] === b}; })()""")
    ck(f'改定5 / v3.4-2 工具行左端「← 返回制作」保留{S}', bk['t'] == '返回制作' and bk['first'] and bk['x'] <= 12 and bk['icon'] == '#i-back', bk)
    ck(f'规范6-返回箭头 16 px、命令点击区 28{S}', near(bk['iw'], 16, 0.5) and bk['h'] >= 28 - 0.5, bk)
    # 状态栏左端也有导出、备份（三页一样）
    sf = p.ev("""(() => { const s = __T.q('#wsImport .status .st-l .sh-stf'); return s && {t: __T.qq('[data-fk]', s).map(__T.txt), first: s.parentElement.firstElementChild === s, x: __T.rect(s).x - __T.rect('#wsImport .status').x}; })()""")
    ck(f'v3.4-1 资源交付页状态栏最左边也是「导出」「备份」{S}', sf and sf['t'] == ['导出 FWL_Export', '备份 未选'] and sf['first'] and sf['x'] <= 16, sf)
    p.click('#impTool .sh-back')
    st = p.ev("({ws: SHELL.state().ws, bk: __T.vis('#wsBaker'), imp: __T.vis('#wsImport'), inApp: !!__T.q('#app #wsImport')})")
    ck(f'改定5-点「← 返回制作」回到制作{S}', st['ws'] == 'baker' and st['bk'] and not st['imp'] and not st['inApp'], st)
    after = p.ev("({sel: KIT.sel(), t: KIT.t(), sc: (__T.q('#pbody') || {}).scrollTop || 0})")
    ck(f'0.4-切页只换显示：选择、时间、滚动都在{S}', after['sel'] == mid['sel'] and after['t'] == mid['t'] and abs(after['sc'] - mid['sc']) <= 1, (mid, after))
    # 编排工作台 + 「← 返回制作」
    w0 = p.ev("__T.rect('#shell .sh-go').w")
    p.click('#shell .sh-go')
    st = p.ev("({ws: SHELL.state().ws, wb: __T.vis('#wsWB'), bk: __T.vis('#wsBaker'), on: __T.q('#shell .sh-go').getAttribute('aria-pressed'), tip: __T.q('#shell .sh-go').dataset.tip, back: __T.vis('#wbTool .sh-back')})")
    ck(f'v3.4-3 点「编排工作台 →」打开编排工作台，页面左上「← 返回制作」保留{S}', st['ws'] == 'wb' and st['wb'] and not st['bk'] and st['back'], st)
    ck(f'改定5-亮着的入口悬停写「返回制作」{S}', st['on'] == 'true' and st['tip'] == '返回制作', st)
    u = p.ev("""(() => { const x = __T.q('#shell .sh-go[aria-pressed=true]'), a = getComputedStyle(x, '::after'), r = __T.rect(x), sh = __T.rect('#shell');
        return {h: a.height, bg: a.backgroundColor, p4: __T.tok('--p4'), fw: +__T.cs(x, 'fontWeight'), c: __T.cs(x, 'color'), t1: __T.tok('--t1'), bottom: r.b, shb: sh.b, w: parseFloat(a.width), tw: r.w}; })()""")
    ck(f'v3.4-3 在编排工作台时入口加薄荷下划线（2 px，压在顶栏底线上）{S}', u['h'] == '2px' and u['bg'] == u['p4'] and near(u['bottom'], u['shb'], 0.6) and near(u['w'], u['tw'], 0.6), u)
    ck(f'规范4-当前页入口 600 + 主文字色{S}', u['fw'] == 600 and u['c'] == u['t1'], u)
    bold = p.ev("__T.fonts(['#shell']).filter(x => x.fw >= 600).map(x => x.t)")
    ck(f'v3.1-9 打开编排工作台时顶栏粗体只有产品名和当前页入口{S}', bold == ['烟花工坊', '编排工作台'], bold)
    ck(f'规范11-入口换 600 不挤动顶栏{S}', near(p.ev("__T.rect('#shell .sh-go').w"), w0, 0.5))
    sf = p.ev("""(() => { const s = __T.q('#wsWB .status .st-l .sh-stf'); return s && __T.qq('[data-fk]', s).map(__T.txt); })()""")
    ck(f'v3.4-1 编排工作台状态栏最左边也是「导出」「备份」{S}', sf == ['导出 FWL_Export', '备份 未选'], sf)
    p.shot(f'shell_4_wb_on_{size}.png', clip={'x': size - 520, 'y': 0, 'width': 520, 'height': (40 if size == 1920 else 36) + 8})
    # 再点一次亮着的入口 → 回到制作
    p.click('#shell .sh-go')
    st = p.ev("({ws: SHELL.state().ws, bk: __T.vis('#wsBaker'), wb: __T.vis('#wsWB'), inApp: !!__T.q('#app #wsWB'), on: __T.qq('#shell .sh-pg[aria-pressed=true]').length})")
    ck(f'改定5-再点亮着的「编排工作台」回到制作{S}', st['ws'] == 'baker' and st['bk'] and not st['wb'] and not st['inApp'] and st['on'] == 0, st)
    # 资源交付页上直接点「编排工作台 →」
    open_deliv(p)
    p.click('#shell .sh-go')
    ck(f'v3.4-3 资源交付页直接点「编排工作台 →」换过去{S}', p.ev("SHELL.state().ws === 'wb' && __T.vis('#wsWB') && !__T.vis('#wsImport') && !__T.q('#app #wsImport')"))
    p.click('#wbTool .sh-back')
    ck(f'改定5-编排工作台点「← 返回制作」回到制作{S}', p.ev("SHELL.state().ws === 'baker' && __T.vis('#wsBaker') && !__T.vis('#wsWB')"))
    # 键盘：菜单里 Enter 也能打开资源交付
    p.ev('KIT.openExport()')
    p.pg.wait_for_selector('.menu [data-exp="deliv"]', timeout=3000)
    p.ev("__T.q('.menu [data-exp=deliv]').focus()")
    p.pg.keyboard.press('Enter')
    ck(f'v3.4-2 键盘：菜单里「资源交付」按 Enter 也打开{S}', p.wait("SHELL.state().ws === 'import'", 2000))
    # 在两页里，制作区的单键快捷键不作用到看不见的画面
    t0 = p.ev('KIT.t()')
    p.ev("__T.q('#impMain').focus && document.activeElement && document.activeElement.blur && document.activeElement.blur()")
    p.pg.keyboard.press('Space')
    p.pg.wait_for_timeout(350)
    ck(f'0.4-资源交付里按空格不播放制作区{S}', p.ev('KIT.t()') == t0, (t0, p.ev('KIT.t()')))
    grab(p)
    p.ev("SHELL.ws('baker')")
    # 没有待导入的包：计数隐藏；没选导出文件夹也能打开（不弹选文件夹，那一页左栏写原因）
    p.ev("SHELL.set('exp', 'none')")
    d = deliv_menu(p)
    ck(f'v3.4-2 待导入 0 个（读不到导出文件夹）：「资源交付」不带计数{S}', d['t'] == '资源交付' and d['n'] == '' and d['label'] == '', d)
    p.click('.menu [data-exp="deliv"]')
    ck(f'v3.4-2 没选导出文件夹：「资源交付」不按导出拦，直接打开、左栏写原因{S}', p.ev("SHELL.state().ws === 'import' && __T.ovl('.dialog').length === 0 && __T.txt('#impList .empty b') === '未选导出文件夹'"))
    p.ev("SHELL.set('exp', 'ok'); SHELL.ws('baker')")


def t_import_main(p, size=1920):
    """v3.3 第 17 条：资源交付主区放大显示选中的包（回放缩略图、修订、检查摘要），没选中写一行「选一个包查看」；
    第 18 条：外壳里要你处理的状态词用主文字色、不用琥珀；第 19 条：图标按 16 px 网格画、字号分用途（模块标题中号 600，上 16 下 6）"""
    S = f'@{size}'
    pv = {1920: 288, 1366: 216}[size]
    fs = (12, 13, 15) if size == 1920 else (11, 12, 14)
    r = p.ev("""(() => { const m = __T.rect('#impMain'), f = __T.q('#impMC .sh-pvw'), i = __T.q('#impMC .sh-pvi'), im = i && i.querySelector('img'), t = __T.q('#impMC .sh-assets');
        const mod = n => { const e = __T.q(`#impMC .sh-mod[aria-label=${n}]`); return e && {dt: __T.qq('dt', e).map(__T.txt), dd: __T.qq('dd', e).map(__T.txt), x: __T.rect(e).x, y: __T.rect(e.querySelector('.sh-mt')).y}; };
        return {img: !!(im && im.complete && im.naturalWidth), w: i && __T.rect(i).w, h: i && __T.rect(i).h, ix: i && __T.rect(i).x - m.x, iy: i && __T.rect(i).y, ib: i && __T.rect(i).b, cap: __T.txt('#impMC .sh-cap'),
                rev: mod('修订'), chk: mod('检查'), tableY: t && __T.rect(t).y, inMain: i && __T.rect(i).x >= m.x && __T.rect(i).r <= m.r,
                ph: __T.qq('#impMC .sh-ph').filter(x => !x.closest('.sh-path')).length, mh: __T.txt('#impMC .sh-mh')}; })()""")
    ck(f'v3.3-17 选中的包：回放缩略图放大（{pv} px 方形，在主区里、清单上面）{S}', r['img'] and near(r['w'], pv, 0.6) and near(r['h'], pv, 0.6) and r['inMain'] and r['tableY'] and r['tableY'] > r['ib'], r)
    ck(f'v3.3-17 缩略图下写取的是引擎回放哪一刻{S}', bool(re.fullmatch(r'引擎回放 \d\.\d\d s', r['cap'] or '')), r['cap'])
    ck(f'v3.3-17「修订」摘要：编号、导出、烘焙器、平台{S}', r['rev'] and r['rev']['dt'] == ['编号', '导出', '烘焙器', '平台'] and re.fullmatch(r'[0-9a-f]{10}', r['rev']['dd'][0]) and re.fullmatch(r'4\.9\.\d+', r['rev']['dd'][2]) and r['rev']['dd'][3].startswith('PC '), r['rev'])
    ck(f'v3.3-17「检查」摘要：预检、新建、覆盖{S}', r['chk'] and r['chk']['dt'] == ['预检', '新建', '覆盖'] and re.fullmatch(r'通过 (\d+) / \1', r['chk']['dd'][0]), r['chk'])
    ck(f'v3.3-17 摘要和缩略图并排、顶端对齐，主区不再有占位块{S}', r['rev'] and r['chk'] and r['rev']['x'] > r['ix'] and r['chk']['x'] > r['rev']['x'] and near(r['rev']['y'], r['iy'], 1) and near(r['chk']['y'], r['iy'], 1) and r['ph'] == 0, r)
    # 模块标题：中号 600 主文字色，上空 16、下空 6（第 6 条）
    mt = p.ev("""__T.qq('#impMC .sh-mt').map(e => { const c = getComputedStyle(e); return {t: __T.txt(e).split(' ')[0], fs: parseFloat(c.fontSize), fw: +c.fontWeight, c: c.color, mt: c.marginTop, mb: c.marginBottom}; })""")
    t1 = p.ev("__T.tok('--t1')")
    ck(f'v3.3-6 / 19 模块标题「修订」「检查」「资产」：中号 600，上空 16、下空 6{S}', [x['t'] for x in mt] == ['修订', '检查', '资产'] and all(x['fs'] == fs[1] and x['fw'] == 600 and x['c'] == t1 and x['mt'] == '16px' and x['mb'] == '6px' for x in mt), mt)
    # 字号分用途：大号只给包名；600 只给包名和模块标题；摘要的名称、数值中号；读数（缩略图说明、状态、表头、计数）小号
    fo = p.ev("""(() => { const f = s => __T.qq(s).filter(__T.vis).map(e => parseFloat(__T.cs(e, 'fontSize')));
        return {big: __T.fonts(['#impMC']).filter(x => x.fs === %d).map(x => x.t), bold: __T.fonts(['#impMC']).filter(x => x.fw >= 600).map(x => x.t),
                mid: f('#impMC .sh-dl dt, #impMC .sh-dl dd, #impMC .sh-at td'), small: f('#impMC .sh-cap, #impMC .sh-mh .st, #impMC .sh-at th, #impMC .sh-mt .cnt')}; })()""" % fs[2])
    ck(f'v3.3-19 资源交付主区字号分用途：大号只给包名，摘要和清单中号，读数和计数小号{S}', fo['big'] == [r['mh'].split(' 待导入')[0].split(' 已导入')[0]] and [x.split(' ')[0] for x in fo['bold'][1:]] == ['修订', '检查', '资产'] and all(x == fs[1] for x in fo['mid']) and all(x == fs[0] for x in fo['small']), fo)
    # 第 18 条：外壳里要你处理的状态词（待导入、有新版本）主文字色，不用琥珀；外壳没有「待验收」
    st = p.ev("""(() => { const t1 = __T.tok('--t1'), w3 = __T.tok('--w3'), roots = ['#shell', '#wsImport', '#wsWB'].map(s => __T.q(s)).filter(Boolean);
        const words = []; roots.forEach(r => __T.qq('.st, .sh-st', r).filter(__T.vis).forEach(e => { const t = __T.txt(e); if (/^(待导入|有新版本|待验收)/.test(t)) words.push([t.split(' ')[0], __T.cs(e, 'color') === t1, __T.cs(e, 'color') === w3]); }));
        return {words, due: roots.some(r => /待验收/.test(r.textContent))}; })()""")
    ck(f'v3.3-18 外壳里要处理的状态词（待导入）主文字色、不用琥珀；外壳没有「待验收」{S}', st['words'] and all(x[1] and not x[2] for x in st['words']) and not st['due'], st)
    # 第 19 条：图标一律用 #iconDefs 的符号，16 px 画布按 16 px 画，线宽 1.5、方头、尖角、不填面
    icons_check(p, ['#wsImport'], S)
    # 没选中：一行「选一个包查看」，在主区正中；不出清单和缩略图
    p.ev("SHELL.S.imp.sel = null; SHELL.render()")
    n = p.ev("""(() => { const e = __T.q('#impMC .empty'), m = __T.rect('#impMain'), r = e && __T.rect(e);
        return {t: __T.txt('#impMC'), cx: r && r.x + r.w / 2 - (m.x + m.w / 2), cy: r && r.y + r.h / 2 - (m.y + m.h / 2), tbl: !!__T.q('#impMC .sh-at'), pv: !!__T.q('#impMC .sh-pvi'), go: __T.q('#impGo').dataset.tip}; })()""")
    ck(f'v3.3-17 没选中：主区正中一行「选一个包查看」，不出清单{S}', n['t'] == '选一个包查看' and near(n['cx'], 0, 2) and near(n['cy'], 0, 2) and not n['tbl'] and not n['pv'], n)
    ck(f'v3.3-17 没选中：「导入」变灰写「未选素材包」{S}', n['go'] == '未选素材包', n)
    p.shot(f'shell_2c_import_none_{size}.png')
    grab(p)
    p.ev("SHELL.S.imp.sel = 'cs3c'; SHELL.render()")


def icons_check(p, roots, S=''):
    """v3.3 第 19 条：外壳里的图标都用样板 #iconDefs 的 16 px 符号；外壳自己定尺寸的（返回制作、写入列）按 16 px 画；
    全部线宽 1.5、方头、尖角、不填面。样板组件里缩小的图标（搜索框 14、清除 12）只记下来转给制作区"""
    r = p.ev("""roots => { const out = []; roots.forEach(s => __T.qq(`${s} svg.i`).filter(__T.vis).forEach(v => { const u = v.querySelector('use'), id = u && u.getAttribute('href'), sym = id && document.querySelector(id), c = getComputedStyle(v);
        const own = !!v.closest('.sh-back, .sh-at, .sh-mh, .sh-det, .sh-bub, .sh-hd .sh-hs:not(.sh-hm)');
        out.push({id, sym: !!(sym && sym.closest('#iconDefs')), vb: sym && sym.getAttribute('viewBox'), w: __T.rect(v).w, h: __T.rect(v).h, sw: c.strokeWidth, cap: c.strokeLinecap, join: c.strokeLinejoin, fill: c.fill, own,
            symFill: sym ? [...sym.querySelectorAll('*')].some(x => { const f = x.getAttribute('fill'); return f && f !== 'none'; }) : false,
            round: sym ? [...sym.querySelectorAll('*')].some(x => /round/.test((x.getAttribute('stroke-linecap') || '') + (x.getAttribute('stroke-linejoin') || ''))) : false}); })); return out; }""", roots)
    bad = [x for x in r if not x['sym'] or x['vb'] != '0 0 16 16' or x['sw'] != '1.5px' or x['cap'] != 'square' or x['join'] != 'miter' or x['fill'] != 'none']
    ck(f'v3.3-19 图标画法：#iconDefs 的 16 × 16 符号，线宽 1.5、方头、尖角、不填面{S}', r and not bad, bad[:4] or len(r))
    own_bad = [x for x in r if x['own'] and not (near(x['w'], 16, 0.5) and near(x['h'], 16, 0.5))]
    ck(f'v3.3-19 外壳自己定尺寸的图标按 16 px 画（光学大小一致）{S}', not own_bad, own_bad[:4])
    for x in r:
        if not x['own'] and not near(x['w'], 16, 0.5):
            info(f'v3.3 第 19 条：样板组件里的图标 {x["id"]} 画成 {x["w"]:.0f} px（16 px 网格缩小后线宽不一致），在 {", ".join(roots)}')
        if x['symFill'] or x['round']:
            info(f'v3.3 第 7 条：符号 {x["id"]} 里有填充或圆头 / 圆角属性')


def t_import(p):
    """改定 3、7；②（资源交付工具行）；⑦ 变灰与互锁；P9 覆盖前先问备份；导入进度"""
    p.fresh()
    logon(p)
    open_deliv(p)
    t = p.ev("""(() => { const r = __T.rect('#impTool'), ws = __T.rect('#wsImport');
        return {w: r.w, ww: ws.w, segs: __T.qq('#impSub button').map(__T.txt), cmds: __T.qq('#impTool .tgrp button').map(__T.txt), go1: __T.q('#impGo').classList.contains('btn-1'),
                bg: __T.cs('#impTool', 'backgroundColor'), chrome: __T.tok('--surf-chrome'), sh: __T.cs('#impTool', 'boxShadow'), bw: __T.cs('#impTool', 'borderBottomWidth'), line: __T.tok('--line'),
                h: r.h, top: __T.len('--h-top'), segX: __T.rect('#impTool .sh-hm').x - ws.x, colX: __T.rect('#impMain').x - ws.x}; })()""")
    ck('②-资源交付工具行：「烟花导入 / ResourceFX 配表」→ 刷新 → 导入', t['segs'] == ['烟花导入', 'ResourceFX 配表'] and t['cmds'] == ['刷新', '导入'] and t['go1'], t)
    ck('规范3-工具行占满宽、栏头面色、底边 1 px 线', near(t['w'], t['ww']) and t['bg'] == t['chrome'] and t['line'] in t['sh'] and t['bw'] == '0px', t)
    ck('规范2-工具行分段和下面的栏对齐', near(t['segX'], t['colX'], 1), t)
    L = p.ev("""({folder: __T.txt('#impFolder'), cnt: __T.txt('#impCount'), rows: __T.qq('#impList .lib-item').map(x => ({id: x.dataset.id, n: __T.txt(x.querySelector('.li-n')), st: __T.txt(x.querySelector('.st')), sel: x.getAttribute('aria-selected')}))})""")
    L['badge'] = deliv_n(p)
    waits = [r for r in L['rows'] if r['st'] == '待导入']
    ck('改定3-左栏：导出文件夹里的包', L['folder'] == 'FWL_Export' and L['cnt'] == '5 个素材包' and len(L['rows']) == 5, L)
    ck('改定3-待导入的排在前面', [r['st'] for r in L['rows']][:2] == ['待导入', '待导入'], L['rows'])
    ck('v3.4-2「导出 ▾」里「资源交付」后面的数字 = 待导入的包数', L['badge'] == str(len(waits)) == '2', (L['badge'], len(waits)))
    # 选一个包 → 逐资产清单
    p.click('#impList .lib-item[data-id="rt6"]')
    h = p.ev("({n: __T.txt('#impMC .sh-mh b'), rows: __T.qq('#impMC .sh-at tbody tr').length, sel: __T.q('#impList [data-id=rt6]').getAttribute('aria-selected'), hd: __T.txt('#impMC .sh-mh'), chk: __T.txt('#impMC .sh-mod[aria-label=检查] dl')})")
    ck('改定3-选包 → 右边逐资产清单（Ramp + PC 3 + 手机 1 + 材质实例 3 + 粒子系统 2）', h['n'] == '升空尾缀 RT6' and h['rows'] == 10 and h['sel'] == 'true' and h['hd'] == '升空尾缀 RT6 待导入' and h['chk'] == '预检 通过 10 / 10 新建 7 个 覆盖 3 个', h)
    p.pg.keyboard.press('ArrowDown')
    ck('改定3-列表 ↓ 换行', p.ev("__T.q('#impList [aria-selected=true]').dataset.id") != 'rt6')
    p.click('#impSub button[data-v="ResourceFX 配表"]')
    ck('②-切到 ResourceFX 配表', p.ev("__T.q('#impSub [data-v=\"ResourceFX 配表\"]').getAttribute('aria-pressed') === 'true' && !__T.q('#impMC .sh-at')"))
    p.click('#impSub button[data-v="烟花导入"]')
    p.click('#impList .lib-item[data-id="cs3c"]')
    t_import_main(p)
    # 刷新
    p.click('#impRefresh')
    ok = p.wait("__T.ovl('.sh-hint').some(x => __T.txt(x) === '已刷新：5 个素材包')", 3000)
    ck('②-刷新：读导出文件夹，按钮旁写结果', ok)
    # 规范：线、面、颜色用途
    ln = p.ev("""({l: __T.cs('#wsImport .sh-left', 'borderRightWidth') + ' ' + __T.cs('#wsImport .sh-left', 'borderRightColor'), line: __T.tok('--line'),
        why: __T.cs('#impWhy', 'backgroundColor'), mh: __T.cs('#impMC .sh-mh', 'backgroundColor'), lh: __T.cs('#wsImport .sh-lh', 'backgroundColor')})""")
    ck('规范3-左栏和右边之间 1 px 线', ln['l'] == '1px ' + ln['line'], ln)
    ck('规范3-标题行、原因条不填底色', all(x in ('rgba(0, 0, 0, 0)', 'transparent') for x in (ln['why'], ln['mh'], ln['lh'])), ln)
    colors = p.ev("({p4: __T.tok('--p4'), p5: __T.tok('--p5'), w3: __T.tok('--w3'), e3: __T.tok('--e3')})")
    hits = p.ev("c => __T.scan(['#shell', '#wsImport'], c)", colors)
    mint = [h for h in hits if h['c'] in ('p4', 'p5')]
    bad = [h for h in mint if not re.search(r'sh-pg.*::after|sh-stat.*::before|#impGo', h['el'])]
    ck('规范5-资源交付页薄荷只在：当前页下划线、UE 圆点、本页主操作「导入」', not bad, bad or mint)
    shell_warn = lambda h: re.search(r'sh-stat.*::before|sh-sv\.is-warn', h['el'])   # 顶栏要处理的状态（备份 未选）：琥珀点 + 琥珀词
    ck('规范5-资源交付页（正常状态）没有琥珀和红色（顶栏要处理的状态除外）', not [h for h in hits if h['c'] in ('w3', 'e3') and not (h['c'] == 'w3' and shell_warn(h))], [h for h in hits if h['c'] in ('w3', 'e3')])
    fo = p.ev("__T.fonts(['#wsImport'])")
    ck('规范1-资源交付页字重只有 400 / 600', all(x['fw'] in (400, 600) for x in fo), [x for x in fo if x['fw'] not in (400, 600)][:5])
    ck('规范1-资源交付页字号三级', all(x['fs'] in (12, 13, 15) for x in fo), [x for x in fo if x['fs'] not in (12, 13, 15)][:5])
    ck('规范5-外壳不画警示三角（琥珀三角只表示需重新导出）', p.ev("!__T.qq('#shell use, #wsImport use, #wsWB use').some(u => /alert|stale/.test(u.getAttribute('href')))"))
    p.shot('shell_2_import.png')
    grab(p)

    # ---- P9：备份未选 + 要覆盖 → 先问，一个都不写；取消 → 什么都不写
    p.click('#impGo')
    d = p.ev("""(() => { const d = __T.ovl('.dialog[data-dlg=bak]')[0]; return d && {h: __T.txt(d.querySelector('h2')), p: __T.txt(d.querySelector('p')), acts: __T.qq('.acts button', d).map(__T.txt), imp: SHELL.state().imp, ticks: __T.qq('#impMC .sh-at td.sh-wr [aria-label]').length}; })()""")
    ck('P9-点「导入」先弹「覆盖前选择备份位置」', d and d['h'] == '覆盖前选择备份位置' and '3 个资产' in d['p'], d)
    ck('P9-弹出时一个资产都没写', d and d['imp'] is None and d['ticks'] == 0, d)
    ck('⑤-备份对话框：取消导入 / 选择…', d and d['acts'][-2:] == ['取消导入', '选择…'], d)
    p.shot('shell_4_backup_dialog.png')
    p.click('.dialog[data-dlg=bak] [data-r="kit"]')
    e = p.ev("({t: __T.txt(__T.ovl('.dialog[data-dlg=bak] .sh-dmsg')[0]), c: __T.cs(__T.ovl('.dialog[data-dlg=bak] .sh-dmsg span')[0], 'color'), e3: __T.tok('--e3'), open: __T.ovl('.dialog[data-dlg=bak]').length, ic: !!__T.q('.dialog[data-dlg=bak] .sh-dmsg svg')})")
    ck('⑤-选到 UE 工程里：就地报错（红字、不画图形），对话框不关', e['t'] == 'FX_Backup 在 UE 工程里，不能用' and e['c'] == e['e3'] and e['open'] == 1 and not e['ic'], e)
    p.shot('shell_4b_backup_dialog_error.png')
    grab(p, '对话框')
    p.click('.dialog[data-dlg=bak] [data-r="0"]')
    r = p.ev("({imp: SHELL.state().imp, bak: SHELL.state().bak, toast: __T.ovl('.sh-toast > span').map(__T.txt), ticks: __T.qq('#impMC .sh-at td.sh-wr [aria-label]').length})")
    ck('P9-取消：什么都不写，备份仍未选', r['imp'] is None and r['bak'] == 'none' and r['ticks'] == 0, r)
    ck('P8-取消的提示条写明来自导入', r['toast'] == ['导入：已取消，没有写入任何资产'], r['toast'])
    # 备份「需允许访问」→ 按钮旁气泡（不写）；× 关掉 = 取消
    p.ev("SHELL.set('bak', 'perm')")
    p.pg.wait_for_timeout(80)
    p.ev("document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))")
    p.click('#impGo')
    b = p.ev("""(() => { const b = __T.ovl('.sh-bub')[0]; if (!b) return null; const a = __T.rect('#impGo'), r = __T.rect(b), s = getComputedStyle(b, '::before');
        return {t: __T.txt(b.querySelector('span')), up: b.classList.contains('is-up'), gap: r.y - a.b, gapUp: a.y - r.b, ax: parseFloat(b.style.getPropertyValue('--ax')) + r.x + 4, mid: a.x + a.w / 2, tri: s.width,
                bg: getComputedStyle(b).backgroundColor, ov: __T.tok('--ov'), imp: SHELL.state().imp}; })()""")
    ck('P9-备份要重新允许：按钮旁气泡，不写', b and b['t'] == '浏览器重开后，FWL_Backup 需重新允许访问' and b['imp'] is None, b)
    if b:
        ck('规范12-气泡离触发点 8 px、三角对着中线、浮层面色', (near(b['gap'], 8, 1) or near(b['gapUp'], 8, 1)) and near(b['ax'], b['mid'], 2) and b['tri'] == '8px' and b['bg'] == b['ov'], b)
    p.click('.sh-bub [data-r="x"]')
    r = p.ev("({imp: SHELL.state().imp, toast: __T.ovl('.sh-toast > span').map(__T.txt)})")
    ck('P9-气泡 × = 取消，不写', r['imp'] is None and r['toast'] == ['导入：已取消，没有写入任何资产'], r)
    p.click('#impGo')
    p.ev('SHELL.speed(1)')   # 写入按真实节奏走（约 3 秒），好在写的过程中看顶栏、点 UE 状态
    p.click('.sh-bub [data-r="allow"]')
    ok = p.wait("SHELL.state().imp && SHELL.state().imp.i >= 1", 3000)
    w = p.ev("({ue: __T.txt('#shell .sh-ue'), go: __T.txt('#impGo'), wb: __T.q('#wbTool [data-sh=wbUE]').getAttribute('aria-disabled'), wbTip: __T.q('#wbTool [data-sh=wbUE]').dataset.tip, bak: SHELL.state().bak, st: __T.txt('#impMC .sh-mh .st'), spin: !!__T.q('#impMC .sh-at td.sh-wr .spin')})")
    ck('P9-允许访问后才开始写', ok and w['bak'] == 'ok', w)
    ck('⑦-导入写 UE：顶栏「UE 写入中 n / N」', bool(re.match(r'^UE 写入中 \d+ / 10$', w['ue'] or '')), w)
    ck('v3.3-17 写入中：标题行写「写入中 n / N」，「写入」列正在写的那行转圈', bool(re.match(r'^写入中 \d+ / 10$', w['st'] or '')) and w['spin'], w)
    ck('⑦-导入写 UE：编排的写 UE 命令变灰写原因', w['wb'] == 'true' and w['wbTip'] == '导入正在写 UE，写完后可用', w)
    grab(p)
    p.ev("SHELL.ws('baker')")
    p.click('#shell .sh-ue')
    ck('①-写入中点 UE 状态打开资源交付', p.ev("SHELL.state().ws") == 'import')
    ok = p.wait("!SHELL.state().imp && __T.ovl('.sh-toast > span').length", 8000)
    p.ev('SHELL.speed(0.15)')
    t2 = p.ev("""({t: __T.ovl('.sh-toast > span').map(__T.txt), act: __T.ovl('.sh-toast [data-r=act]').map(__T.txt), st: __T.txt('#impList [data-id=cs3c] .st'),
        ticks: __T.qq('#impMC .sh-at td.sh-wr [aria-label="已写入"]').length, hd: __T.txt('#impMC .sh-mh')})""")
    t2['badge'] = deliv_n(p)
    ck('⑦-写完：「写入」列每行打勾、包变「已导入」、「资源交付」的计数减一', ok and t2['ticks'] == 10 and t2['st'] == '已导入' and t2['badge'] == '1' and bool(re.fullmatch(r'Comet 3\.0 红头金尾 已导入 \d\d:\d\d', t2['hd'] or '')), t2)
    ck('P8-写完的提示条写明来自导入；人在资源交付时不出「查看」', t2['t'] == ['导入：已写入 10 个资产，覆盖的 3 个已备份'] and t2['act'] == [], t2)
    grab(p)
    # 备份已选 → 直接写（不再问）
    p.click('#impList .lib-item[data-id="rt6"]')
    p.click('#impGo')
    ck('P9-备份已选：点「导入」直接写', p.wait("SHELL.state().imp && SHELL.state().imp.i >= 1", 3000) and p.ev("__T.ovl('.dialog').length") == 0)
    p.ev("SHELL.ws('wb')")
    ok = p.wait("!SHELL.state().imp && __T.ovl('.sh-toast [data-r=act]').length", 6000)
    ck('P8-人在编排时，导入写完的提示条出「查看」', ok and p.ev("__T.ovl('.sh-toast [data-r=act]').map(__T.txt)") == ['查看'])
    p.click('.sh-toast [data-r="act"]')
    ck('P8-「查看」打开资源交付并选中那个包', p.ev("SHELL.state().ws === 'import' && __T.q('#impList [aria-selected=true]').dataset.id === 'rt6'"))


def t_interlock(p):
    """⑦ 变灰与互锁（改定 7：搬进两页后不变）"""
    p.fresh()
    logon(p)
    p.ev("SHELL.ws('import')")
    p.ev("SHELL.set('ue', 'off')")
    p.pg.wait_for_timeout(60)
    r = p.ev("""({why: __T.vis('#impWhy'), wt: __T.txt('#impWhy > span'), rt: __T.txt('#impWhy [data-sh=retry]'), go: __T.q('#impGo').getAttribute('aria-disabled'), cls: __T.q('#impGo').classList.contains('is-disabled'),
        tip: __T.q('#impGo').dataset.tip, list: __T.qq('#impList .lib-item').length, table: !!__T.q('#impMC .sh-at'), c: __T.cs('#impWhy > span', 'color'), t1: __T.tok('--t1'), bg: __T.cs('#impWhy', 'backgroundColor'),
        op: __T.cs('#impGo', 'opacity'), bgc: __T.cs('#impGo', 'backgroundColor'), p4: __T.tok('--p4'), dis: __T.q('#impGo').disabled})""")
    ck('⑦ / v3.4-3 UE 未连接：右边最上面原因条 +「重新连接」（和顶栏同一个词）', r['why'] and r['wt'] == 'UE 未连接，GPUECli 启动后自动连上' and r['rt'] == '重新连接', r)
    ck('⑦-UE 未连接：清单和预检照常', r['list'] == 5 and r['table'], r)
    ck('⑦-UE 未连接：「导入」变灰，悬停同一原因', r['go'] == 'true' and r['cls'] and r['tip'] == 'UE 未连接，GPUECli 启动后自动连上', r)
    ck('规范4-变灰用样板的停用样子（主按钮不再是薄荷）+ 悬停写原因（不用 disabled 属性）', (float(r['op']) < 1 or r['bgc'] != r['p4']) and not r['dis'], r)
    ck('规范5-原因条不填底色、不用琥珀', r['bg'] in ('rgba(0, 0, 0, 0)', 'transparent') and r['c'] == r['t1'], r)
    p.click('#impGo', force=True)
    ck('⑦-点变灰的「导入」不做任何事', p.ev("SHELL.state().imp === null && __T.ovl('.dialog').length === 0"))
    p.pg.hover('#impGo')
    ck('⑦-悬停变灰的「导入」写原因', p.wait("__T.tipText() === 'UE 未连接，GPUECli 启动后自动连上'", 2500), p.ev('__T.tipText()'))
    p.pg.mouse.move(5, 1000)
    p.shot('shell_2b_import_offline.png')
    grab(p)
    p.ev("SHELL.ws('wb')")
    r = p.ev("__T.qq('#wbTool [data-sh=wbUE]').map(b => [__T.txt(b), b.getAttribute('aria-disabled'), b.dataset.tip])")
    ck('⑦-UE 未连接：编排里三个写 UE 的命令变灰写原因', len(r) == 3 and all(x[1] == 'true' and x[2] == 'UE 未连接，GPUECli 启动后自动连上' for x in r), r)
    p.ev("SHELL.set('ue', 'wait')")
    r = p.ev("({go: __T.q('#impGo').dataset.tip, wb: __T.q('#wbTool [data-sh=wbUE]').dataset.tip, why: __T.vis('#impWhy'), ue: __T.txt('#shell .sh-ue')})")
    ck('⑦-UE 连接中：导入、编排都写「UE 连接中」', r['go'] == 'UE 连接中' and r['wb'] == 'UE 连接中' and r['ue'] == 'UE 连接中', r)
    grab(p)
    p.ev("SHELL.set('ue', 'on')")
    # 编排写 UE → 导入变灰（双向）
    p.click('#wbTool [data-sh=wbUE][data-v="导演表"]')
    r = p.ev("""({ue: __T.txt('#shell .sh-ue'), go: __T.q('#impGo').getAttribute('aria-disabled'), tip: __T.q('#impGo').dataset.tip, others: __T.qq('#wbTool [data-sh=wbUE]').filter(b => b.dataset.v !== '导演表').map(b => b.dataset.tip),
        busy: __T.q('#wbTool [data-v="导演表"]').classList.contains('is-loading')})""")
    ck('⑦-编排写 UE：顶栏「UE 写入中」', r['ue'] == 'UE 写入中' and r['busy'], r)
    ck('⑦-编排写 UE：导入变灰写原因（双向）', r['go'] == 'true' and r['tip'] == '编排正在写 UE，写完后可用', r)
    ck('⑦-编排写 UE：编排其余写 UE 命令也等着', all(t == '编排正在写 UE，写完后可用' for t in r['others']), r)
    grab(p)
    p.ev("SHELL.ws('import')")
    grab(p)
    p.ev("SHELL.ws('wb')")
    p.ev("SHELL.ws('baker')")
    p.click('#shell .sh-ue')
    ck('①-编排写入中点 UE 状态打开编排工作台', p.ev('SHELL.state().ws') == 'wb')
    ok = p.wait("!SHELL.S.wb.busy", 3000)
    ck('⑦-编排写完：命令恢复、操作处写结果', ok and p.wait("__T.ovl('.sh-hint').map(__T.txt).includes('已写入 UE：导演表')", 1500))
    # 导出文件夹未选 / 需允许 / 浏览器不支持
    p.ev("SHELL.set('exp', 'none'); SHELL.ws('import')")
    r = p.ev("({e: __T.txt('#impList .empty b'), b: __T.txt('#impList .empty button'), go: __T.q('#impGo').dataset.tip, rf: __T.q('#impRefresh').dataset.tip, f: __T.txt('#impFolder')})")
    r['badge'] = deliv_n(p)
    ck('⑦-导出文件夹未选：列表空状态「未选导出文件夹　选择…」', r['e'] == '未选导出文件夹' and r['b'] == '选择…', r)
    ck('⑦-导出文件夹未选：导入、刷新变灰写原因，「资源交付」不带数字', r['go'] == '未选导出文件夹' and r['rf'] == '未选导出文件夹' and not r['badge'], r)
    grab(p)
    p.click('#impList .empty button')
    ck('⑤-空状态「选择…」选好文件夹，列表回来', p.ev("SHELL.state().exp === 'ok' && __T.qq('#impList .lib-item').length === 5"))
    p.ev("SHELL.set('exp', 'perm')")
    p.ev("document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))")
    r = p.ev("({e: __T.txt('#impList .empty b'), b: __T.txt('#impList .empty button')})")
    r['badge'] = deliv_n(p)
    ck('⑤-导出要重新允许：左栏就地写同一句 +「允许访问」', r['e'] == '浏览器重开后，FWL_Export 需重新允许访问' and r['b'] == '允许访问' and not r['badge'], r)
    grab(p)
    p.click('#impRefresh')
    ck('⑤-导出要重新允许：点「刷新」按钮旁出同一句气泡', p.ev("__T.ovl('.sh-bub').map(b => __T.txt(b.querySelector('span')))") == ['浏览器重开后，FWL_Export 需重新允许访问'])
    p.click('.sh-bub [data-r="allow"]')
    ck('⑤-气泡「允许访问」后恢复', p.ev("SHELL.state().exp === 'ok' && __T.qq('#impList .lib-item').length === 5"))
    grab(p)


def t_folders_ue(p):
    """① UE 四种状态 + 不可用（v3.4 第 3 条：未连接时原地「重新连接」）；文件夹三种状态 × 2 + 不可用（v3.3 第 16 条的点法，v3.4 第 1 条放在状态栏左端）；自动重试"""
    p.fresh()
    logon(p)
    tok = p.ev("({w3: __T.tok('--w3'), t2: __T.tok('--t2'), t3: __T.tok('--t3')})")
    F = lambda k: f'#stShell [data-fk={k}]'
    # 导出、备份都没选：两项都是琥珀点 + 琥珀词，没有「设置」；点哪一项就选哪个文件夹（v3.3 第 16 条）
    p.ev("SHELL.set('exp', 'none')")
    r = p.ev("""(() => { const e = __T.q('#stShell [data-fk=exp]'), w = e.querySelector('.sh-sv.is-warn'); return {t: __T.txt(e), k: w && getComputedStyle(w, '::before').backgroundColor, v: __T.cs(e.querySelector('.sh-sv'), 'color'), tip: e.dataset.tip, ic: !!e.querySelector('svg'),
        set: __T.qq('#stShell .sh-set, #shell .sh-set').length, btip: __T.q('#stShell [data-fk=bak]').dataset.tip}; })()""")
    ck('①-导出未选：「导出 ● 未选」琥珀圆点 + 琥珀词（会挡住导出），不画图形', r['t'] == '导出 未选' and r['k'] == tok['w3'] and r['v'] == tok['w3'] and not r['ic'], r)
    ck('v3.3-16 导出、备份都没选：没有「设置」，两项悬停各写「选择导出文件夹」「选择备份文件夹」', r['set'] == 0 and r['tip'] == '选择导出文件夹' and r['btip'] == '选择备份文件夹', r)
    hs = p.ev("__T.rect('#status')")
    p.shot('shell_1c_status_none_1920.png', clip={'x': 0, 'y': hs['y'] - 8, 'width': 640, 'height': hs['h'] + 8})
    grab(p)
    p.click('#stShell [data-fk="exp"]')
    ck('v3.3-16 导出未选：点这一项直接选文件夹，那一项旁写结果', p.ev("SHELL.state().exp === 'ok'") and p.ev("__T.ovl('.sh-hint').map(__T.txt)") == ['已选择 FWL_Export'] and p.ev("SHELL.state().bak") == 'none')
    # 已选：点开「换文件夹…」
    p.click('#stShell [data-fk="exp"]')
    m = p.ev("({h: __T.txt(__T.ovl('.menu .mh')[0]), it: __T.ovl('.menu [data-mi]').map(__T.txt), ex: __T.q('#stShell [data-fk=exp]').getAttribute('aria-expanded'), sb: __T.ovl('.menu')[0].classList.contains('sb-auto')})")
    ck('①-导出已选：点开菜单（完整路径 + 换文件夹…）', m['h'] == '导出文件夹 D:\\FireWorksLab\\FWL_Export' and m['it'] == ['换文件夹…'] and m['ex'] == 'true', m)
    ck('v3.4-13 外壳的浮层也用通用类 .sb-auto', m['sb'], m)
    grab(p)
    p.click('.menu [data-mi="change"]')
    ck('①-换文件夹后那一项跟着变', p.ev("__T.txt('#stShell [data-fk=exp]')") == '导出 FWL_Export_2')
    # 需允许访问：琥珀 +「需允许访问」+ 气泡一次
    p.ev("SHELL.set('exp', 'perm')")
    r = p.ev("({t: __T.txt('#stShell [data-fk=exp]'), c: __T.cs('#stShell [data-fk=exp] .sh-sv.is-warn', 'color'), bub: __T.ovl('.sh-bub').map(b => __T.txt(b.querySelector('span')))})")
    ck('①-导出需允许访问：琥珀词 + 一次气泡', r['t'] == '导出 FWL_Export_2 需允许访问' and r['c'] == tok['w3'] and r['bub'] == ['浏览器重开后，FWL_Export_2 需重新允许访问'], r)
    ck('v3.3-16 需允许访问：悬停写「允许访问导出文件夹」+ 完整路径（点一下即允许）', p.ev("__T.q('#stShell [data-fk=exp]').dataset.tip") == '允许访问导出文件夹　D:\\FireWorksLab\\FWL_Export_2', p.ev("__T.q('#stShell [data-fk=exp]').dataset.tip"))
    bb = p.ev("""(() => { const b = __T.ovl('.sh-bub')[0], a = __T.rect('#stShell [data-fk=exp]'), r = __T.rect(b), up = b.classList.contains('is-up');
        return {gap: up ? a.y - r.b : r.y - a.b, ax: parseFloat(b.style.getPropertyValue('--ax')) + r.x + 4, mid: a.x + a.w / 2, up, inApp: r.y >= __T.rect('#app').y && r.b <= __T.rect('#app').b}; })()""")
    ck('规范12 / v3.4-1 气泡离那一项 8 px（状态栏在底部，下面放不下放上面），三角对着那一项中线', near(bb['gap'], 8, 1) and near(bb['ax'], bb['mid'], 2) and bb['up'] and bb['inApp'], bb)
    p.shot('shell_5_perm_bubble.png', clip={'x': 0, 'y': hs['y'] - 72, 'width': 720, 'height': hs['h'] + 72})
    grab(p)
    p.click('#stShell [data-fk="exp"]')
    ck('①-需允许访问：点那一项即允许', p.ev("SHELL.state().exp === 'ok' && __T.ovl('.sh-bub').length === 0"))
    # 备份三态
    p.ev("SHELL.set('bak', 'ok')")
    ck('①-备份已选：不画圆点 + 弱色字；悬停写「更换备份文件夹」+ 完整路径', p.ev("__T.txt('#stShell [data-fk=bak]') === '备份 FWL_Backup' && __T.cs('#stShell [data-fk=bak] .sh-sv', 'color') === __T.tok('--t3') && !__T.q('#stShell [data-fk=bak] .sh-sv.is-warn') && ['none', 'normal'].includes(getComputedStyle(__T.q('#stShell [data-fk=bak]'), '::before').content) && __T.q('#stShell [data-fk=bak]').dataset.tip === '更换备份文件夹　D:\\\\FireWorksLab\\\\FWL_Backup'"), p.ev("__T.q('#stShell [data-fk=bak]').dataset.tip"))
    p.ev("SHELL.set('bak', 'perm')")
    ck('①-备份需允许访问：琥珀词 + 气泡', p.ev("__T.txt('#stShell [data-fk=bak]') === '备份 FWL_Backup 需允许访问' && __T.ovl('.sh-bub').length === 1"))
    p.ev("SHELL.set('bak', 'none')")
    ck('v3.3-16 备份未选：悬停写「选择备份文件夹」', p.ev("__T.q('#stShell [data-fk=bak]').dataset.tip") == '选择备份文件夹')
    p.click('#stShell [data-fk="bak"]')
    ck('v3.3-16 备份未选：点这一项直接选好', p.ev("SHELL.state().bak") == 'ok' and p.ev("__T.ovl('.sh-hint').map(__T.txt)") == ['已选择 FWL_Backup'])
    # 长名字：省略号 + 悬停全称
    p.ev("SHELL.S.expName = 'FWL_Export_Project03_Fireworks_Long'; SHELL.render()")
    r = p.ev("""(() => { const v = __T.q('#stShell [data-fk=exp] .sh-sv.is-name'); return {cut: v.scrollWidth > v.clientWidth, ell: __T.cs(v, 'textOverflow'), w: __T.rect(v).w, tip: __T.q('#stShell [data-fk=exp]').dataset.tip, over: __T.clip(['#status']).out,
        stR: __T.rect('#status .st-l').r <= __T.rect('#status .st-r').x}; })()""")
    ck('①-文件夹名过长：省略号 + 悬停全称、不挤出状态栏', r['ell'] == 'ellipsis' and r['cut'] and r['tip'].endswith('FWL_Export_Project03_Fireworks_Long') and not r['over'] and r['stR'], r)
    p.ev("SHELL.S.expName = 'FWL_Export'; SHELL.render()")
    # 「导出 ▾」面板里「换文件夹」：同点状态栏那一项
    p.ev("SHELL.set('exp', 'none')")
    p.ev("window.shellPickExportFolder()")
    ck('①-导出面板「换文件夹」：未选时直接选，结果写在状态栏那一项旁', p.ev("SHELL.state().exp === 'ok' && __T.ovl('.sh-hint').map(__T.txt).includes('已选择 FWL_Export')"))
    # UE：已连接 / 连接中 / 未连接（原地「重新连接」，自动重试的倒计时在它的悬停提示里）
    p.ev("SHELL.set('ue', 'wait')")
    ck('①-UE 连接中：转圈 + 文字', p.ev("__T.txt('#shell .sh-ue') === 'UE 连接中' && !!__T.q('#shell .sh-ue .spin')"))
    grab(p)
    x0 = p.ev("__T.rect('#shell .sh-g-st').x")
    p.ev("SHELL.set('ue', 'off')")
    r = p.ev("""(() => { const w = __T.q('#shell .sh-ue .sh-sv.is-warn'), rb = __T.q('#shell .sh-retry');
        return {t: __T.txt('#shell .sh-ueg'), g: __T.txt('#shell .sh-g-st'), tip: __T.q('#shell .sh-ue').dataset.tip, dot: w && getComputedStyle(w, '::before').backgroundColor, w3: __T.tok('--w3'), v: __T.cs('#shell .sh-ue .sh-sv', 'color'),
                rc: __T.cs(rb, 'color'), t2: __T.tok('--t2'), tag: rb.tagName, h: __T.rect(rb).h, rtip: rb.dataset.tip, x: __T.rect('#shell .sh-g-st').x, after: __T.rect(rb).x - __T.rect('#shell .sh-ue').r, inShell: __T.q('#shell').contains(rb)}; })()""")
    ck('v3.4-3 UE 未连接：原地「UE ● 未连接」+ 紧跟命令「重新连接」，不挪到别处', r['t'] == 'UE 未连接 重新连接' and r['g'] == r['t'] and r['inShell'] and r['tag'] == 'BUTTON' and 0 <= r['after'] <= 16 and r['dot'] == r['w3'] and r['v'] == r['w3'] and r['rc'] == r['t2'], r)
    ck('v3.4-3「重新连接」：命令点击区 ≥ 28；悬停写自动重试的倒计时', r['h'] >= 27.5 and r['rtip'] == '12 秒后自动重新连接', r)
    ck('①-UE 悬停写地址和上次连上的时间（一行）', bool(re.match(r'^127\.0\.0\.1:17780　上次连上 \d\d:\d\d$', r['tip'])), r['tip'])
    p.pg.hover('#shell .sh-retry')
    p.pg.wait_for_timeout(60)
    hv = p.ev("({bg: __T.cs('#shell .sh-retry', 'backgroundColor'), hov: __T.tok('--hov')})")
    ck('v3.4-3「重新连接」悬停出底色', hv['bg'] == hv['hov'], hv)
    p.shot('shell_6_ue_off_1920.png', clip={'x': 1240, 'y': 0, 'width': 680, 'height': 48})
    p.pg.mouse.move(5, 600)
    ok = p.wait("/^(1[01]) 秒后自动重新连接$/.test(__T.q('#shell .sh-retry').dataset.tip)", 2500)
    ck('①-自动重试的倒计时真在走', ok, p.ev("__T.q('#shell .sh-retry').dataset.tip"))
    p.click('#shell .sh-retry')
    ck('v3.4-3 点「重新连接」：原地变「UE 连接中」', p.ev("__T.txt('#shell .sh-ue')") == 'UE 连接中' and not p.ev("!!__T.q('#shell .sh-retry')"))
    ok = p.wait("!!__T.q('#shell .sh-retry') && __T.q('#shell .sh-retry').dataset.tip === '12 秒后自动重新连接'", 3000)
    ck('①-没连上：回到未连接，倒计时重来', ok)
    grab(p)
    p.ev("SHELL.set('ue', 'on')")


def t_browser(p):
    """⑤ 其他浏览器：弹一次；之后文件夹、UE 不可用，用到的按钮变灰写原因"""
    p.fresh()
    logon(p)
    p.ev("SHELL.set('br', 'other')")
    d = p.ev("(() => { const d = __T.ovl('.dialog[data-dlg=br]')[0]; return d && {h: __T.txt(d.querySelector('h2')), p: __T.txt(d.querySelector('p')), a: __T.qq('.acts button', d).map(__T.txt)}; })()")
    ck('⑤-其他浏览器：弹「仅支持 Chrome、Edge」', d and d['h'] == '仅支持 Chrome、Edge' and d['a'] == ['继续查看', '复制地址'], d)
    grab(p, '对话框')
    p.click('.dialog[data-dlg=br] [data-r="0"]')
    r = p.ev("""({ue: __T.txt('#shell .sh-ue'), f: __T.qq('#stShell .sh-fold').map(x => [__T.txt(x), x.getAttribute('aria-disabled'), x.dataset.tip]),
        exp: __T.qq('#expBtn .btn').map(b => [b.getAttribute('aria-disabled'), b.dataset.tip])})""")
    ck('⑤-其他浏览器：UE「不可用」', r['ue'] == 'UE 不可用', r)
    ck('⑤-其他浏览器：状态栏两个文件夹「不可用」、变灰写原因', len(r['f']) == 2 and all(x[0].endswith('不可用') and x[1] == 'true' and x[2] == '仅 Chrome、Edge 能读写文件夹' for x in r['f']), r)
    ck('⑤-其他浏览器：导出按钮变灰写原因', r['exp'] and all(x[0] == 'true' and x[1] == '仅 Chrome、Edge 能读写文件夹' for x in r['exp']), r['exp'])
    p.ev("SHELL.ws('import')")
    r = p.ev("({e: __T.txt('#impList .empty b'), b: __T.txt('#impList .empty button'), go: __T.q('#impGo').dataset.tip, rf: __T.q('#impRefresh').dataset.tip, f: __T.txt('#impFolder')})")
    ck('⑤-其他浏览器：资源交付空状态 + 复制地址；导入、刷新变灰写原因', r['e'] == '仅 Chrome、Edge 能读写文件夹' and r['b'] == '复制地址' and r['go'] == '仅 Chrome、Edge 能导入' and r['rf'] == '仅 Chrome、Edge 能读写文件夹', r)
    grab(p)
    p.ev("SHELL.ws('wb')")
    ck('⑤-其他浏览器：编排写 UE 命令变灰写原因', p.ev("__T.qq('#wbTool [data-sh=wbUE]').every(b => b.dataset.tip === '仅 Chrome、Edge 能连 UE' && b.getAttribute('aria-disabled') === 'true')"))
    grab(p)
    p.ev("SHELL.ws('baker')")
    p.click('#expBtn [data-act="export"]', force=True)
    ck('⑤-其他浏览器：点导出不导出，按钮旁写原因', p.ev("SHELL.state().ws === 'baker' && __T.ovl('.sh-hint').map(__T.txt).includes('仅 Chrome、Edge 能读写文件夹')"))
    grab(p)
    p.ev("SHELL.set('br', 'chrome')")
    ck('⑤-换回 Chrome：恢复', p.ev("__T.txt('#shell .sh-ue') === 'UE 已连接' && !__T.q('#expBtn .btn.is-disabled')"))


def export_all(p, also_wb=None):
    """用样板的导出菜单「导出全部」导出当前效果；also_wb 不为 None 时先设「放进编排」勾选"""
    p.ev('KIT.openExport()')
    p.pg.wait_for_selector('.menu #expAlsoWB', timeout=3000)
    if also_wb is not None:
        cur = p.ev("__T.q('.menu #expAlsoWB').checked")
        if cur != also_wb:
            p.click('.menu #expAlsoWB')
    p.click('.menu .mi[data-exp="all"]')


def t_export(p):
    """③ 导出后自动打开资源交付并选中刚导出的包；⑤ 第一次导出先选文件夹；P8 提示条跟着页面；P4 导出时放进编排"""
    p.fresh()
    logon(p)
    # 第一次导出、没选导出文件夹：先弹对话框；取消 → 不导出
    p.ev("SHELL.set('exp', 'none')")
    p.click('#expBtn [data-act="export"]')
    d = p.ev("(() => { const d = __T.ovl('.dialog[data-dlg=exp]')[0]; return d && {h: __T.txt(d.querySelector('h2')), a: __T.qq('.acts button', d).map(__T.txt), ld: !!__T.q('#expBtn .is-loading')}; })()")
    ck('⑤-第一次导出：导出前先弹「选择导出文件夹」', d and d['h'] == '选择导出文件夹' and d['a'] == ['取消', '选择…'] and not d['ld'], d)
    grab(p, '对话框')
    p.click('.dialog[data-dlg=exp] [data-r="0"]')
    p.pg.wait_for_timeout(1200)
    ck('⑤-取消：不导出，按钮旁写「未导出：未选导出文件夹」', p.ev("SHELL.state().ws === 'baker' && __T.ovl('.sh-hint').map(__T.txt).includes('未导出：未选导出文件夹')"))
    # 菜单项也拦
    p.ev('KIT.openExport()')
    p.pg.wait_for_selector('.menu .mi[data-exp="all"]', timeout=3000)
    p.click('.menu .mi[data-exp="all"]')
    ck('⑤-导出菜单里的项也先问文件夹', p.ev("__T.ovl('.dialog[data-dlg=exp]').length") == 1)
    p.click('.dialog[data-dlg=exp] [data-r="1"]')
    ok = p.wait("SHELL.state().ws === 'import'", 5000)
    ck('⑤-选好接着按原来那一项导出', ok and p.ev("SHELL.state().exp") == 'ok')
    # ③：打开资源交付、选中刚导出的包，提示条在外壳提示区
    r = p.ev("""(() => { const s = __T.q('#impList [aria-selected=true]'); return {ws: SHELL.state().ws, sel: s && __T.txt(s.querySelector('.li-n')), sub: s && __T.txt(s.querySelector('.li-s')), first: __T.qq('#impList .lib-item')[0] === s,
        mh: __T.txt('#impMC .sh-mh b'), toast: __T.ovl('.sh-toast > span').map(__T.txt), act: __T.ovl('.sh-toast [data-r=act]').filter(__T.vis).map(__T.txt), bakerToast: __T.ovl('.toast:not(.sh-toast)').length}; })()""")
    ck('改定3-导出完成后自动打开资源交付', r['ws'] == 'import', r)
    ck('改定3-选中刚导出的包（排在最前，副信息「刚导出 hh:mm」）', r['sel'] and r['sel'].startswith('金曜菊-B') and r['first'] and r['sub'].startswith('刚导出') and r['mh'] == r['sel'], r)
    ck('P8-导出的提示条写明来自制作，带「返回制作」', len(r['toast']) == 1 and r['toast'][0].startswith('制作：已导出 ') and r['act'] == ['返回制作'] and r['bakerToast'] == 0, r)
    pos = p.ev("""(() => { const t = __T.ovl('.sh-toast')[0], r = __T.rect(t), a = __T.rect('#app'), tb = __T.rect('#impTool'); return {top: r.y - tb.b, cx: r.x + r.w / 2 - (a.x + a.w / 2)}; })()""")
    ck('P8 / 规范12-提示条在外壳提示区：当前页工具行下方 8 px、居中', near(pos['top'], 8, 1) and near(pos['cx'], 0, 1.5), pos)
    p.shot('shell_8_after_export.png')
    grab(p)
    # 切到编排工作台：提示条跟过去；回到制作：「返回制作」收起
    p.click('#shell .sh-go')
    pos = p.ev("""(() => { const t = __T.ovl('.sh-toast')[0]; if (!t) return null; const r = __T.rect(t), tb = __T.rect('#wbTool'); return {top: r.y - tb.b, act: __T.vis(t.querySelector('[data-r=act]'))}; })()""")
    ck('P8-切页时提示条跟着挪到当前页顶部', pos and near(pos['top'], 8, 1) and pos['act'], pos)
    p.click('#wbTool .sh-back')
    pos = p.ev("""(() => { const t = __T.ovl('.sh-toast')[0]; if (!t) return null; const r = __T.rect(t), tb = __T.rect('#wsBaker > .topbar'); return {top: r.y - tb.b, act: __T.vis(t.querySelector('[data-r=act]'))}; })()""")
    ck('P8-人已经在制作：「返回制作」收起', pos and not pos['act'] and near(pos['top'], 8, 1), pos)
    # 导出一次：挂钩只调一次（样板调，外壳不另调）、只切一次页面、最后只留一条提示条（样板的「已导出」经 shellToast 进来后被外壳这一条换掉）
    p.ev("""(() => { const o = window.shellAfterExport; window.__sae = []; window.shellAfterExport = a => { window.__sae.push(a === undefined ? 'undefined' : a && a.name); return o(a); };
        window.__sw = 0; window.__mo = new MutationObserver(() => { const on = !__T.q('#wsImport').hidden; if (on && !window.__on) window.__sw++; window.__on = on; });
        window.__on = !__T.q('#wsImport').hidden; window.__mo.observe(__T.q('#wsImport'), {attributes: true, attributeFilter: ['hidden']}); })()""")
    export_all(p)
    p.wait("SHELL.state().ws === 'import'", 4000)
    p.pg.wait_for_timeout(600)
    r = p.ev("""(() => { window.__mo.disconnect(); return {calls: window.__sae, sw: window.__sw, toasts: __T.ovl('.toast').map(__T.txt)}; })()""")
    ck('③-导出一次：shellAfterExport 只调一次（样板调，外壳不另调）', r['calls'] == ['金曜菊-B'], r)
    ck('③-导出一次：只切一次页面、只留一条提示条', r['sw'] == 1 and len(r['toasts']) == 1 and r['toasts'][0].startswith('制作：已导出 '), r)
    n = deliv_n(p)
    ck('v3.4-2 导出后「导出 ▾」里「资源交付」的数字跟着加', n == '3', n)
    p.ev("SHELL.ws('baker')")
    # P4：导出时勾了「放进编排」，金曜菊-B 已在编排里 → 直接更新，不标「有新版本」
    p.ev("SHELL.speed(0.4)")
    export_all(p, also_wb=True)
    ok = p.wait("SHELL.state().job !== null", 4000)
    pv = p.ev("({imp: __T.txt('#wsImport [data-pvm]'), ws: SHELL.state().ws})")
    ck('④-导出后编排预览进度显示在当前页状态栏', ok and pv['ws'] == 'import' and bool(re.match(r'^生成编排预览 \d+% 取消$', pv['imp'] or '')), pv)
    ok = p.wait("SHELL.state().job === null && __T.ovl('.sh-toast > span').some(x => __T.txt(x).startsWith('已更新编排'))", 8000)
    r = p.ev("({t: __T.ovl('.sh-toast > span').map(__T.txt), act: __T.ovl('.sh-toast [data-r=act]').map(__T.txt), nv: SHELL.BT.find(r => r.name === '金曜菊-B').newVer || false})")
    ck('P4-勾了、已在编排里：「已更新编排：金曜菊-B」，不标「有新版本」', ok and r['t'] == ['已更新编排：金曜菊-B'] and r['act'] == ['去编排看'] and not r['nv'], r)
    p.click('.sh-toast [data-r="act"]')
    ck('④-「去编排看」打开编排工作台、选中那一行', p.ev("SHELL.state().ws === 'wb' && __T.q('#wbList [aria-selected=true]').dataset.id === 'kiku'"))
    # P4：没勾、已在编排里 → 编排那一项「有新版本　更新」
    p.ev("SHELL.ws('baker')")
    p.ev("SHELL.speed(0.15)")
    export_all(p, also_wb=False)
    p.wait("SHELL.state().ws === 'import'", 5000)
    p.ev("SHELL.ws('wb')")
    r = p.ev("({st: __T.txt('#wbList [data-id=kiku] .sh-btst'), job: SHELL.state().job})")
    ck('P4-没勾、已在编排里：那一项「有新版本　更新」', r['st'] == '有新版本 更新' and r['job'] is None, r)
    p.click('#wbList [data-id="kiku"] [data-sh="btUpd"]')
    ok = p.wait("!__T.q('#wbList [data-id=kiku] [data-sh=btUpd]')", 3000)
    ck('⑥-点「更新」换新预览，「有新版本」消失', ok and p.ev("__T.ovl('.sh-hint').map(__T.txt)") == ['已换新预览：金曜菊-B'])
    grab(p)
    # 挂钩：直接调 shellAfterExport（只导出手机、一层）
    p.ev("SHELL.ws('baker')")
    p.ev("window.shellAfterExport({name: '金曜菊-B', pc: 0, mobile: 3, alsoWB: false, layers: ['金锦层']})")
    ck('③-一两层写层名、没导出的平台不写', p.ev("__T.ovl('.sh-toast > span').map(__T.txt)") == ['制作：已导出 金锦层，手机 3 张'])


def t_save(p):
    """④ 另存对话框「放进编排」；进度、成功、失败、取消；P4 第一次新增、之后更新；直接保存按记住的勾选"""
    p.fresh()
    logon(p)
    p.ev('window.openSaveDialog()')
    d = p.ev("""(() => { const d = __T.ovl('.dialog[data-dlg=save]')[0]; return d && {h: __T.txt(d.querySelector('h2')), v: d.querySelector('input[type=text]').value, chk: d.querySelector('[data-sh=saveWB]').checked,
        lab: __T.txt(d.querySelector('.sh-opt')), note: __T.txt(d.querySelector('.sh-optd')), a: __T.qq('.acts button', d).map(__T.txt), focus: document.activeElement === d.querySelector('input[type=text]')}; })()""")
    ck('④-另存：名称 + 名称下面一行「同时放进编排」（同导出菜单的词）', d and d['h'] == '另存' and d['v'] == '金曜菊-B 副本' and d['lab'] == '同时放进编排' and d['a'] == ['取消', '保存'] and d['focus'], d)
    ck('④-第一次不勾', d and not d['chk'], d)
    ck('④-下一行小字写约 10 秒和「未进 UE」', d and '约 10 秒' in d['note'] and '未进 UE' in d['note'], d)
    p.shot('shell_9_save_dialog.png')
    grab(p, '对话框')
    # 空名、同名：就地报错
    p.pg.fill('.dialog[data-dlg=save] input[type=text]', '')
    p.click('.dialog[data-dlg=save] [data-r="1"]')
    ck('④-空名：就地报错，不关', p.ev("__T.txt(__T.ovl('.dialog[data-dlg=save] .sh-dmsg')[0]) === '名称为空' && __T.q('.dialog[data-dlg=save] .field').classList.contains('is-error')"))
    dup = p.ev("__T.txt(__T.q('#libList .lib-item .li-n'))")
    p.pg.fill('.dialog[data-dlg=save] input[type=text]', dup)
    p.pg.keyboard.press('Enter')
    ck('④-同名：就地报错「已有同名效果」', p.ev("__T.txt(__T.ovl('.dialog[data-dlg=save] .sh-dmsg')[0])") == '已有同名效果')
    grab(p, '对话框')
    p.pg.fill('.dialog[data-dlg=save] input[type=text]', '金曜菊-B 副本')
    p.click('.dialog[data-dlg=save] [data-sh="saveWB"]')
    p.ev("SHELL.speed(0.4)")
    p.click('.dialog[data-dlg=save] [data-r="1"]')
    r = p.ev("({pv: __T.txt('#sbPreview'), row: __T.txt('#wbList .lib-item:first-child .sh-btst'), dlg: __T.ovl('.dialog').length})")
    ck('④-对话框关掉后不挡操作：状态栏「生成编排预览 n%　取消」', r['dlg'] == 0 and bool(re.match(r'^生成编排预览 \d+% 取消$', r['pv'] or '')), r)
    ck('④-编排里新增这一行：「未进 UE」（没配 ResourceFX 行）+「生成预览中」', r['row'] == '未进 UE 生成预览中', r)
    p.ev("SHELL.ws('import')")
    ck('④-资源交付页状态栏显示同一条', bool(re.match(r'^生成编排预览 \d+% 取消$', p.ev("__T.txt('#wsImport [data-pvm]')") or '')))
    p.ev("SHELL.ws('baker')")
    grab(p)
    p.ev("SHELL.ws('wb')")
    grab(p)
    p.ev("SHELL.ws('baker')")
    ok = p.wait("SHELL.state().job === null && __T.ovl('.sh-toast').length", 8000)
    r = p.ev("({t: __T.ovl('.sh-toast > span').map(__T.txt), a: __T.ovl('.sh-toast [data-r=act]').map(__T.txt), row: SHELL.BT[0].name, img: !!SHELL.BT[0].img, nv: !!SHELL.BT[0].newVer})")
    ck('P4-勾了、第一次：「已放进编排：金曜菊-B 副本　去编排看」，新增一项', ok and r['t'] == ['已放进编排：金曜菊-B 副本'] and r['a'] == ['去编排看'] and r['row'] == '金曜菊-B 副本' and r['img'] and not r['nv'], r)
    grab(p)
    # 第二次另存同名：已放进编排 → 默认勾上；保存 → 已更新编排
    p.ev("SHELL.speed(0.15)")
    p.ev('window.openSaveDialog()')
    ck('④-已放进编排的效果默认勾上（按效果记住）', p.ev("__T.q('.dialog[data-dlg=save] [data-sh=saveWB]').checked") is True)
    p.click('.dialog[data-dlg=save] [data-r="1"]')
    ok = p.wait("SHELL.state().job === null && __T.ovl('.sh-toast > span').map(__T.txt).join() === '已更新编排：金曜菊-B 副本'", 6000)
    r = p.ev("({n: SHELL.BT.filter(r => r.name === '金曜菊-B 副本').length, nv: !!SHELL.BT[0].newVer})")
    ck('P4-之后直接更新那一项：「已更新编排」，不新增、不标「有新版本」', ok and r['n'] == 1 and not r['nv'], r)
    # 去编排看：人已在编排时不出按钮
    p.ev("SHELL.ws('wb')")
    ck('P8-人已在编排：「去编排看」收起', p.ev("__T.ovl('.sh-toast [data-r=act]').filter(__T.vis).length") == 0)
    p.ev("SHELL.ws('baker')")
    # 取消预览
    p.ev("SHELL.speed(1)")
    p.ev('window.openSaveDialog()')
    p.click('.dialog[data-dlg=save] [data-r="1"]')
    p.wait("SHELL.state().job !== null", 2000)
    p.click('#sbPreview [data-sh="pvCancel"]')
    r = p.ev("({job: SHELL.state().job, h: __T.ovl('.sh-hint').map(__T.txt), gen: !!SHELL.BT.find(r => r.name === '金曜菊-B 副本').gen})")
    ck('④-取消预览：按钮旁写「已取消编排预览，效果已保存」', r['job'] is None and r['h'] == ['已取消编排预览，效果已保存'] and not r['gen'], r)
    # 失败：同一位置错误样式，一直留着；详情；重试成功后消失
    p.ev("SHELL.speed(0.15); SHELL.set('pv', 'fail')")
    p.ev('window.openSaveDialog()')
    p.click('.dialog[data-dlg=save] [data-r="1"]')
    ok = p.wait("SHELL.state().err", 5000)
    r = p.ev("""(() => { const e = __T.q('#sbPreview .sh-pv'); return e && {t: __T.txt(e), c: __T.cs(e.querySelector('span'), 'color'), e3: __T.tok('--e3'), bg: __T.cs(e, 'backgroundColor'), ic: !!e.querySelector('use[href="#i-alert"]'), role: e.getAttribute('role'),
        row: __T.txt('#wbList [data-id] .sh-st.err') || __T.txt(__T.qq('#wbList .lib-item').find(x => __T.txt(x).includes('金曜菊-B 副本')))}; })()""")
    ck('④-失败：同一位置变错误样式（红字、不填底色、不画图形）', ok and r and r['t'] == '编排预览没生成：存储空间不足 效果已保存 重试 详情' and r['c'] == r['e3'] and r['bg'] in ('rgba(0, 0, 0, 0)', 'transparent') and not r['ic'] and r['role'] == 'alert', r)
    p.shot('shell_6_preview_fail.png', clip={'x': 0, 'y': 1080 - 140, 'width': 1920, 'height': 140})
    p.pg.wait_for_timeout(500)
    ck('④-失败一直留着', p.ev("!!__T.q('#sbPreview .sh-pv.is-err')"))
    p.click('#sbPreview [data-sh="pvMore"]')
    m = p.ev("({b: __T.txt(__T.ovl('.menu .msum b')[0]), it: __T.ovl('.menu [data-mi]').map(__T.txt)})")
    ck('④-「详情」：原因、效果已保存、重试、去编排看', m['b'] == '编排预览没生成：金曜菊-B 副本' and '重试' in m['it'], m)
    grab(p)
    p.pg.keyboard.press('Escape')
    p.ev("SHELL.set('pv', 'ok')")
    p.click('#sbPreview [data-sh="pvRetry"]')
    ok = p.wait("!SHELL.state().err && SHELL.state().job === null && __T.ovl('.sh-toast').length", 6000)
    ck('④-重试成功：错误消失、出成功提示', ok and p.ev("!__T.q('#sbPreview .sh-pv')"))
    # 直接保存：按记住的勾选（这个效果没勾过 → 不生成预览，只标「有新版本」）
    p.ev("SHELL.BT.find(r => r.name === '金曜菊-B').newVer = false; SHELL.render()")
    p.click('#toolRow [data-act="save"]')
    p.pg.wait_for_timeout(200)
    ck('④-直接保存：按这个效果记住的勾选（没勾 → 只标「有新版本」）', p.ev("SHELL.state().job === null && SHELL.BT.find(r => r.name === '金曜菊-B').newVer === true"))
    p.ev("SHELL.S.remember['金曜菊-B'] = true")
    p.click('#toolRow [data-act="save"]')
    ck('④-直接保存：记住勾了 → 生成预览', p.wait("SHELL.state().job !== null", 2000))
    p.wait("SHELL.state().job === null", 6000)


def t_wb(p, size):
    """⑥ 基础模板条目；编排工作台页的线、面、颜色；搜索、筛选、空状态"""
    S = f'@{size}'
    p.fresh(size)
    logon(p)
    p.click('#shell .sh-go')
    p.pg.mouse.move(5, 600)   # 离开入口：悬停时箭头是薄荷（v3.4 第 3 条），颜色用途按静止时查
    p.pg.wait_for_timeout(200)
    rows = p.ev("""__T.qq('#wbList .lib-item').map(x => ({id: x.dataset.id, n: __T.txt(x.querySelector('.li-n')), s: __T.txt(x.querySelector('.li-s')), st: __T.qq('.sh-btst > .sh-st', x).map(__T.txt),
        img: !!x.querySelector('.th img'), film: !!x.querySelector('.th[data-film]'), fail: !!x.querySelector('.th.is-fail'), gen: !!x.querySelector('.th .spin')}))""")
    by = {r['id']: r for r in rows}
    ck(f'⑥-7 行基础模板{S}', len(rows) == 7, [r['id'] for r in rows])
    ck(f'⑥-正常：缩略图 + 名称 + ResourceFX 行名{S}', by.get('kiku', {}).get('s') == 'RFX_KinyoKiku_B' and by['kiku']['img'] and by['kiku']['film'] and by['kiku']['st'] == [], by.get('kiku'))
    ck(f'⑥-未进 UE：副信息写英文名、右侧「未进 UE」{S}', by.get('cs3s', {}).get('s') == 'Silver30_LongTail' and by['cs3s']['st'] == ['未进 UE'], by.get('cs3s'))
    ck(f'⑥-有新版本　更新{S}', by.get('mang', {}).get('st') == ['有新版本 更新'], by.get('mang'))
    ck(f'⑥-生成预览中{S}', by.get('rt6', {}).get('st') == ['生成预览中'] and by['rt6']['gen'], by.get('rt6'))
    ck(f'⑥-预览没生成：缩略图位占位、副信息写原因、可重试{S}', by.get('spk', {}).get('st') == ['预览没生成 重试'] and by['spk']['fail'] and by['spk']['s'] == '存储空间不足', by.get('spk'))
    ck(f'⑥-未进 UE + 有新版本：「未进 UE」在上{S}', by.get('copy', {}).get('st') == ['未进 UE', '有新版本 更新'], by.get('copy'))
    c = p.ev("""({w: __T.cs('#wbList [data-id=cs3s] .sh-st.warn', 'color'), e: __T.cs('#wbList [data-id=spk] .sh-st.err', 'color'), n: __T.cs('#wbList [data-id=mang] .sh-st', 'color'), g: __T.cs('#wbList [data-id=rt6] .sh-st', 'color'),
        w3: __T.tok('--w3'), e3: __T.tok('--e3'), t1: __T.tok('--t1'), t3: __T.tok('--t3'), lnk: __T.rect('#wbList [data-id=mang] [data-sh=btUpd]').h, row: __T.rect('#wbList [data-id=mang]').h, row0: __T.rect('#wbList [data-id=kiku]').h})""")
    ck(f'规范5-状态色：未进 UE 琥珀（挡住导演表）、没生成红、有新版本主文字、生成中弱色{S}', c['w'] == c['w3'] and c['e'] == c['e3'] and c['n'] == c['t1'] and c['g'] == c['t3'], c)
    ck(f'规范2-条目里「更新」点击区 28、不撑高这一行{S}', c['lnk'] >= 28 - 0.5 and near(c['row'], c['row0'], 0.5), c)
    # 名称、副信息、状态不截断
    cl = p.ev("__T.clip(['#wbList'])")
    ck(f'⑥-名称、副信息、状态并排不截断{S}', not cl['cut'] and not cl['ell'] and not cl['out'], cl)
    ln = p.ev("""({l: __T.cs('#wsWB .sh-left', 'borderRightWidth') + ' ' + __T.cs('#wsWB .sh-left', 'borderRightColor'), r: __T.cs('#wsWB .sh-wbright', 'borderLeftWidth') + ' ' + __T.cs('#wsWB .sh-wbright', 'borderLeftColor'),
        t: __T.cs('#wsWB .sh-tlph', 'borderTopWidth') + ' ' + __T.cs('#wsWB .sh-tlph', 'borderTopColor'), line: __T.tok('--line'), lw: __T.rect('#wsWB .sh-left').w, rw: __T.rect('#wsWB .sh-wbright').w, wl: __T.len('--w-left'), wr: __T.len('--w-right'),
        hr: __T.rect('#wbTool .sh-hr').x, rx: __T.rect('#wsWB .sh-wbright').x, hl: __T.rect('#wbTool .sh-hl').r, lr: __T.rect('#wsWB .sh-left').r})""")
    ck(f'规范3-三栏之间、画面和时间轴之间 1 px 线{S}', ln['l'] == ln['r'] == ln['t'] == '1px ' + ln['line'], ln)
    ck(f'规范2-右栏同制作区宽；左栏 = 左栏宽 + 72{S}', near(ln['rw'], ln['wr'], 1) and near(ln['lw'], ln['wl'] + 72, 1), ln)
    ck(f'规范2-工具行分段和下面三栏对齐{S}', near(ln['hr'], ln['rx'], 1) and near(ln['hl'], ln['lr'], 1), ln)
    colors = p.ev("({p4: __T.tok('--p4'), p5: __T.tok('--p5'), w3: __T.tok('--w3'), e3: __T.tok('--e3')})")
    hits = p.ev("c => __T.scan(['#shell', '#wsWB'], c)", colors)
    mint = [h for h in hits if h['c'] in ('p4', 'p5')]
    comp = [h for h in mint if 'tabs-sub' in h['el']]
    for h in comp:
        info(f'规范5：样板 .tabs-sub 当前项下划线是薄荷（{h["el"]}），薄荷五处里没有二级标签')
    bad = [h for h in mint if h not in comp and not re.search(r'sh-pg.*::after|sh-stat.*::before|tabs-lg.*\.tab.*::after', h['el'])]
    ck(f'规范5-资源编排页薄荷只在：当前页下划线、UE 圆点、「效果 / 模板」下划线{S}', not bad, bad or mint)
    amb = [h for h in hits if h['c'] == 'w3' and not re.search(r'sh-st\.warn|sh-stat.*::before|sh-sv\.is-warn', h['el'])]
    ck(f'规范5-资源编排页琥珀只给「未进 UE」和顶栏要处理的状态{S}', not amb, amb)
    red = [h for h in hits if h['c'] == 'e3' and not re.search(r'sh-st|sh-err', h['el'])]
    ck(f'规范5-资源编排页红色只给错误{S}', not red, red)
    fs = (12, 13, 15) if size == 1920 else (11, 12, 14)
    fo = p.ev("__T.fonts(['#wsWB'])")
    ck(f'规范1-资源编排页字号三级、字重 400 / 600{S}', all(x['fs'] in fs and x['fw'] in (400, 600) for x in fo), [x for x in fo if x['fs'] not in fs or x['fw'] not in (400, 600)][:5])
    ck(f'⑥-搜索框占位「名称、行名」{S}', p.ev("__T.q('#wbQ input').placeholder") == '名称、行名')
    icons_check(p, ['#wsWB'], S)
    p.shot(f'shell_3_wb_{size}.png')
    if size != 1920:
        return
    # 搜索、筛选、空状态
    p.pg.fill('#wbQ input', 'RFX_Comet')
    ck('⑥-搜索按名称、行名', p.ev("__T.qq('#wbList .lib-item').map(x => x.dataset.id).join()") == 'cs3c')
    p.pg.fill('#wbQ input', '不存在的')
    e = p.ev("({b: __T.txt('#wbList .empty b'), a: __T.txt('#wbList .empty button')})")
    ck('⑥-搜不到：空状态一句 + 一个操作', e == {'b': '没有找到「不存在的」', 'a': '清除搜索'}, e)
    grab(p)
    p.click('#wbList .empty button')
    p.click('#wbChips button[data-v="扇形"]')
    e = p.ev("({b: __T.txt('#wbList .empty b'), a: __T.txt('#wbList .empty button')})")
    ck('⑥-筛选为空：「没有「扇形」基础模板　显示全部」', e == {'b': '没有「扇形」基础模板', 'a': '显示全部'}, e)
    grab(p)
    p.click('#wbList .empty button')
    p.click('#wbBig .tab[data-v="效果"]')
    ck('⑥-「效果 / 模板」大号标签切换', p.ev("__T.q('#wbSub').hidden"))
    p.click('#wbBig .tab[data-v="模板"]')
    # 预览没生成 → 重试
    p.ev("SHELL.set('pv', 'ok')")
    p.click('#wbList [data-id="spk"] [data-sh="btRetry"]')
    ck('⑥-「重试」→ 生成预览中', p.ev("__T.txt('#wbList [data-id=spk] .sh-btst')") == '生成预览中')
    ok = p.wait("!!__T.q('#wbList [data-id=spk] .th img')", 4000)
    ck('⑥-重试成功：缩略图出来', ok)
    # 列表键盘
    p.click('#wbList [data-id="kiku"]')
    p.pg.keyboard.press('ArrowDown')
    ck('⑥-列表 ↓ 换行、焦点跟着', p.ev("document.activeElement.dataset.id === __T.q('#wbList [aria-selected=true]').dataset.id && __T.q('#wbList [aria-selected=true]').dataset.id !== 'kiku'"))
    # 缩略图悬停播放（只有金曜菊-B 有帧）
    src0 = p.ev("__T.q('#wbList [data-id=kiku] .th img').src.slice(-40)")
    p.pg.hover('#wbList [data-id="kiku"] .th')
    p.pg.wait_for_timeout(300)
    ck('⑥-缩略图悬停播放', p.ev("__T.q('#wbList [data-id=kiku] .th img').src.slice(-40)") != src0)
    p.pg.mouse.move(5, 1000)
    # 写 UE 命令
    p.click('#wbTool [data-sh=wbUE][data-v="UE 里预览"]')
    ok = p.wait("__T.ovl('.sh-hint').map(__T.txt).includes('已在 UE 里播放')", 3000)
    ck('⑥-「UE 里预览」写完按钮旁写结果', ok)
    grab(p)


def t_sweep(p, size):
    """1920 / 1366：顶栏各状态组合不溢出、不截断；两页不溢出"""
    S = f'@{size}'
    p.fresh(size)
    bad = []
    combos = 0
    for ue in ('wait', 'on', 'off', 'write', 'wbw', 'na'):
        for ex in ('none', 'ok', 'perm'):
            for bk in ('none', 'ok', 'perm'):
                for ws in ('baker', 'import'):
                    p.ev("""([ue, ex, bk, ws]) => { const S = SHELL.S; S.imp.writing = null; S.wb.busy = null; S.retrying = false; S.br = ue === 'na' ? 'other' : 'chrome';
                        S.ue = ue === 'write' || ue === 'wbw' || ue === 'na' ? 'on' : ue; if (ue === 'write') S.imp.writing = {pkg: 'cs3c', i: 12, tot: 14, nOv: 3, held: true};
                        if (ue === 'wbw') S.wb.busy = 'UE 里预览'; S.exp = ex; S.bak = bk; S.upd = 12; S.expName = 'FWL_Export_Project03'; SHELL.render(); SHELL.ws(ws); }""", [ue, ex, bk, ws])
                    r = p.ev("""(() => { const sh = __T.q('#shell'), st = __T.qq('#status, #wsImport > .status').find(__T.vis), c = __T.clip(['#shell', st]); const b = __T.rect('#shell .sh-brand'), g = __T.rect('#shell .sh-r');
                        const l = st.querySelector('.st-l'), rr = st.querySelector('.st-r');
                        return {sw: sh.scrollWidth - sh.clientWidth + st.scrollWidth - st.clientWidth, cut: c.cut, out: c.out, ov: b.r > g.x || (rr && __T.rect(l).r > __T.rect(rr).x + 0.5), min: __T.qq('.sh-sv.is-name', st).map(v => __T.rect(v).w)}; })()""")
                    combos += 1
                    ell_ok = all(w >= 30 for w in r['min'])
                    if r['sw'] > 0 or r['cut'] or r['out'] or r['ov'] or not ell_ok:
                        bad.append((ue, ex, bk, ws, r))
    ck(f'溢出-顶栏和状态栏左端 {combos} 种状态组合不溢出、不截断{S}', not bad, bad[:3])
    p.ev("(() => { const S = SHELL.S; S.imp.writing = null; S.wb.busy = null; S.br = 'chrome'; S.ue = 'on'; S.exp = 'ok'; S.bak = 'none'; S.upd = 2; S.expName = 'FWL_Export'; SHELL.render(); })()")
    for ws, root in (('import', '#wsImport'), ('wb', '#wsWB')):
        p.ev(f"SHELL.ws('{ws}')")
        if ws == 'import':
            p.ev("(() => { SHELL.S.imp.sel = 'mang'; SHELL.render(); })()")
        r = p.ev(f"""(() => {{ const w = __T.q('{root}'), c = __T.clip(['{root} > .topbar', '{root} > .sh-left', '{root} .sh-mh', '{root} .sh-hero']); return {{sw: w.scrollWidth - w.clientWidth, sh: w.scrollHeight - w.clientHeight, cut: c.cut, ell: c.ell, out: c.out,
            segs: __T.qq('{root} .sh-hs').map(s => s.scrollWidth - s.clientWidth)}}; }})()""")
        ck(f'溢出-{"资源交付" if ws == "import" else "编排工作台"}不溢出、不截断{S}', r['sw'] <= 0 and r['sh'] <= 0 and not r['cut'] and not r['out'] and all(x <= 0 for x in r['segs']), r)
    if size == 1366:
        p.ev("SHELL.ws('import')")
        p.shot('shell_10_import_1366.png')
        p.ev("SHELL.S.imp.sel = 'cs3c'; SHELL.render()")
        t_import_main(p, 1366)
        p.ev("SHELL.ws('baker')")
        p.shot('shell_1b_bar_1366_full.png', clip={'x': 0, 'y': 0, 'width': 1366, 'height': 80})


def t_kit_sheet(p):
    """样板开关（#shKit 进 #sbarShell）；组件全表「外壳与 5.0 入口」一节"""
    p.fresh(kit=True)
    logon(p)
    k = p.ev("({inBar: !!__T.q('#sbarShell #shKit'), sel: __T.qq('#shKit select[data-shk]').map(s => s.dataset.shk), parts: !__T.q('#shParts') || __T.q('#shParts').hidden})")
    ck('样板-外壳开关放进样板控制条', k['inBar'] and k['sel'] == ['ue', 'exp', 'bak', 'br', 'pv'], k)
    p.click('#kitTog')
    p.pg.select_option('#shKit select[data-shk="ue"]', 'off')
    ck('样板-开关改 UE 状态', p.ev("__T.txt('#shell .sh-ue')") == 'UE 未连接')
    p.pg.select_option('#shKit select[data-shk="ue"]', 'write')
    ck('样板-开关「写入中」：停在第 3 个覆盖前', p.ev("SHELL.state().imp && SHELL.state().imp.paused === false && /^UE 写入中 \\d+ \\/ \\d+$/.test(__T.txt('#shell .sh-ue'))"))
    p.pg.select_option('#shKit select[data-shk="ue"]', 'on')
    p.click('#kitTog')   # 收起样板控制条，别盖住全表
    p.ev("KIT.set('view', 'sheet')")
    p.pg.wait_for_timeout(300)
    s = p.ev("""(() => { const s = __T.q('#sheetShell'); return {n: s ? s.children.length : 0, bars: __T.qq('#sheetShell .sh-sbar').length, live: __T.qq('#sheetShell [data-shlive]').map(x => x.dataset.shlive),
        h: __T.qq('#sheetShell h2, #sheetShell h3').slice(0, 3).map(__T.txt), ws: __T.qq('#sheetShell .sh-pg').length, st: __T.qq('#shSheetSt .status').length,
        pg: __T.qq('#sheetShell .sh-sbar .sh-pg').map(__T.txt).every(t => t === '编排工作台'), old: /资源编排|RTX 4070/.test(s.textContent)}; })()""")
    ck('全表-外壳一节生成（顶栏、状态栏左端、编排工作台入口）', s['n'] > 0 and s['bars'] >= 4 and s['ws'] >= 2 and s['st'] == 5 and s['pg'] and not s['old'], s)
    ck('全表-可操作实例（页面标签、预览、列表）', all(k in s['live'] for k in ('pg',)), s['live'])
    # 全表里点页面标签实例：切换下划线，不切真页面
    p.ev("__T.q('#sheetShell [data-shlive=pg] .sh-pg[data-pg=wb]').scrollIntoView({block: 'center'})")
    p.click('#sheetShell [data-shlive="pg"] .sh-pg[data-pg="wb"]')
    ck('全表-「编排工作台 →」实例可点（只换样子）', p.ev("__T.q('#sheetShell [data-shlive=pg] .sh-pg[data-pg=wb]').getAttribute('aria-pressed') === 'true' && SHELL.state().ws === 'baker'"))
    if not A.no_shots:
        top = p.ev("__T.q('#sheetShell').getBoundingClientRect().top + scrollY")
        p.ev(f"scrollTo(0, {top})")
        p.pg.wait_for_timeout(200)
        p.shot('shell_11_sheet.png')
    p.ev("scrollTo(0, 0); KIT.set('view', 'main')")


def t_hooks(p):
    """挂钩：样板的槽位缺了（#sbarShell、#sheetShell、#ovlApp），外壳不报错，顶栏照常；样板没有挂钩时外壳的挂钩不被调用也不报错"""
    html = open(A.html, encoding='utf-8').read()
    var = html.replace('id="sbarShell"', 'id="sbarShellX"').replace('<section id="sheetShell"></section>', '')
    path = os.path.join(tempfile.gettempdir(), 'E_B_hooks_variant.html')
    open(path, 'w', encoding='utf-8').write(var)
    n0 = len(p.errs)
    p.fresh(url='file://' + path)
    r = p.ev("({ue: __T.txt('#shell .sh-ue'), kitHidden: !__T.vis('#shKit')})")
    p.ev("SHELL.ws('import'); SHELL.ws('wb'); SHELL.ws('baker'); KIT.set('view', 'sheet'); KIT.set('view', 'main')")
    p.pg.wait_for_timeout(200)
    ck('挂钩-样板没有 #sbarShell、#sheetShell 时不报错、顶栏照常', r['ue'] == 'UE 已连接' and r['kitHidden'] and len(p.errs) == n0, (r, p.errs[n0:]))
    # v3.4：制作区的状态栏槽位 #stShell、「导出 ▾」里的「资源交付」还没有时，安静跳过；两页自己的状态栏照常画
    v1 = html.replace('<span id="stShell"></span>', '')
    var = v1.replace("{t: '资源交付', html: '资源交付<span class=\"sh-cnt\" id=\"expDelivN\" hidden></span>', exp: 'deliv'},\n", '')
    open(path, 'w', encoding='utf-8').write(var)
    n0 = len(p.errs)
    p.fresh(url='file://' + path)
    p.ev("SHELL.set('exp', 'perm'); SHELL.set('exp', 'none'); SHELL.set('ue', 'off'); window.shellPickExportFolder(); SHELL.set('bak', 'perm'); SHELL.render()")
    p.ev("SHELL.ws('import')")
    r = p.ev("({slot: !!__T.q('#stShell'), deliv: !!__T.q('[data-exp=deliv]'), f: __T.qq('#wsImport .sh-stf [data-fk]').map(__T.txt), ue: __T.txt('#shell .sh-ueg'), exp: SHELL.state().exp})")
    p.ev("SHELL.ws('baker')")
    p.ev('KIT.openExport()')
    p.pg.wait_for_timeout(120)
    r['menu'] = p.ev("__T.ovl('.menu .mi').map(__T.txt)[0] || ''")
    close_menus(p)
    gone = var != v1   # 「资源交付」菜单项是走查补的才拿得掉；制作区自己画的留着，只查不报错
    ck('挂钩-v3.4 制作区还没有 #stShell、「资源交付」菜单项时不报错，两页的状态栏照常', not r['slot'] and (not gone or (not r['deliv'] and r['menu'] != '资源交付')) and r['f'] == ['导出 FWL_Export', '备份 FWL_Backup 需允许访问'] and r['ue'] == 'UE 未连接 重新连接' and r['exp'] == 'ok'
       and len(p.errs) == n0, (r, gone, p.errs[n0:]))
    p.fresh(url=p.url)


def t_scroll(p):
    """v3.4 第 13 条：外壳的滚动区（资源交付的包列表和主区、编排工作台的列表、外壳的浮层）加制作区的通用类 .sb-auto；外壳不再自己写 scrollbar-*"""
    p.fresh()
    css = open(os.path.join(SRC, 'style_shell.css'), encoding='utf-8').read()
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    ck('v3.4-13 外壳样式里不再自己写 scrollbar-*（交给 .sb-auto）', 'scrollbar-' not in css, re.findall(r'[^{}]*scrollbar-[^;}]*', css)[:3])
    p.ev("SHELL.ws('import'); SHELL.S.imp.sel = 'mang'; SHELL.render()")
    r = p.ev("""({imp: ['#impList', '#impMC .sh-det'].map(s => !!__T.q(s) && __T.q(s).classList.contains('sb-auto')),
        sc: ['#impList', '#impMC .sh-det'].map(s => __T.q(s) && __T.cs(s, 'overflowY'))})""")
    p.ev("SHELL.ws('wb')")
    r['wb'] = p.ev("__T.q('#wbList').classList.contains('sb-auto')")
    p.click('#shell .sh-ver')
    r['menu'] = p.ev("__T.ovl('.menu.sh-about')[0].classList.contains('sb-auto')")
    close_menus(p)
    ck('v3.4-13 外壳的滚动区都加了 .sb-auto：包列表、资源交付主区、基础模板列表、外壳浮层', all(r['imp']) and r['wb'] and r['menu'], r)
    has = p.ev("""[...document.styleSheets].some(ss => { try { return [...ss.cssRules].some(x => (x.selectorText || '').includes('sb-auto')); } catch (e) { return false; } })""")
    if not has:
        info('v3.4-13：合成里还没有 .sb-auto 的样式和脚本（制作区第 13 条），外壳的滚动区已经加了这个类，制作区合入后自动生效')
    else:
        # 制作区合入后：静止时滚动条完全透明。制作区的 .sb-auto 用 ::-webkit-scrollbar 画 6 px，滑块颜色继承元素的 border-color，
        # 所以读 borderTopColor，并确认静止时没有 .is-scrolling（对话框9 合成时按制作区说明「交给外壳」改）
        p.ev("SHELL.ws('import')")
        p.pg.wait_for_timeout(900)
        sc = p.ev("['#impList', '#impMC .sh-det'].map(s => { const e = document.querySelector(s); return e && [getComputedStyle(e).borderTopColor, e.classList.contains('is-scrolling')]; })")
        ck('v3.4-13 资源交付页的滚动区静止时滚动条透明', all(x and ('rgba(0, 0, 0, 0)' in x[0] or 'transparent' in x[0]) and not x[1] for x in sc), sc)
    p.ev("SHELL.ws('baker')")


# ================================================================= 文案自查表
HAN = re.compile(r'[\u4e00-\u9fff]')
WORD = re.compile(r'[A-Za-z0-9_][A-Za-z0-9_.:\\/\-]*')
PROPER = ['烟花工坊', '编排工作台', 'FireWorksLab', 'ResourceFX', 'GPUECli', 'Chrome', 'Edge', 'UE', 'RTX', 'NVIDIA', 'GeForce']
# 「编排工作台」是工作台的名字（v3.4 第 3 条用户定的入口名，同「烟花工坊」），按专有名词不计字数
LIM = {'按钮': ('≤ 4（汉字）', 4, 'han'), '菜单项': ('≤ 6（汉字）', 6, 'han'), '标签': ('≤ 6（汉字）', 6, 'han'),   # 菜单项、标签同制作区 text_audit.py '表头': ('≤ 4（汉字）', 4, 'han'),
       '悬停': ('≤ 16', 16, 'all'), '悬停（第二行）': ('≤ 16', 16, 'all'), '原因': ('≤ 16', 16, 'all'), '提示条': ('≤ 20', 20, 'all'), '状态': ('≤ 8', 8, 'all'),
       '空状态': ('≤ 16', 16, 'all'), '菜单标题': ('≤ 16', 16, 'all'), '对话框标题': ('≤ 16', 16, 'all'), '占位文字': ('≤ 16', 16, 'all'), '信息': ('≤ 16', 16, 'all')}
NAMES = ['金曜菊-B 副本', '金曜菊-B 稀簇辉闪', '金曜菊-A 密簇', '金曜菊-B', 'Comet 3.0 红头金尾', 'Silver 3.0 银白长尾', '升空尾缀 RT6', '金芒菊 规格', '仙女棒', '金锦层']


def norm(s):
    s = re.sub(r'\b\d\d:\d\d\b', 'hh:mm', s)
    s = re.sub(r'^\d+ 秒后', 'n 秒后', s)
    s = re.sub(r'^(资源交付) \d+$', r'\1 n', s)
    s = re.sub(r'写入中 \d+ / \d+', '写入中 n / N', s)
    s = re.sub(r'生成编排预览 \d+%', '生成编排预览 n%', s)
    s = re.sub(r'FWL_(Export|Backup)_2\b', r'FWL_\1', s)
    s = re.sub(r'\b\d\d-\d\d hh:mm', 'MM-DD hh:mm', s)
    for n in NAMES:
        s = s.replace(n, '名称')
    return s


def count(s, mode):
    t = s
    for w in PROPER:
        t = t.replace(w, ' ')
    if mode == 'han':
        return len(HAN.findall(t))
    return len(HAN.findall(t)) + len(WORD.findall(re.sub(r'[\u4e00-\u9fff]', ' ', t)))


BAN = re.compile(r'你可以|会帮你|请|哦|[？?！!（(]')
ALLOW = {'打开文件夹'}   # 文案规则.md 字数上限表里自己举的按钮例子（样板的「已导出」提示条经 shellToast 进外壳提示区，按钮是它）


def copy_table():
    seen, rows = set(), []
    for w, c, s in COPY:
        s = norm(s.strip())
        if not s or (w, c, s) in seen or (c in ('信息', '悬停', '文字') and re.fullmatch(r'[A-Za-z0-9_.\-]+', s)):   # 行名、英文名这类数据不算文案
            continue
        seen.add((w, c, s))
        if c == '对话框正文':
            sents = [x for x in re.split(r'[。]', s) if x.strip()]
            n = max((count(x, 'all') for x in sents), default=0)
            ok = len(sents) <= 3 and n <= 25 and not BAN.search(s)
            rows.append((w, c, s, f'{len(sents)} 句，最长 {n}', '≤ 3 句 × 25', ok))
            continue
        lim = LIM.get(c)
        n = count(s, lim[2] if lim else 'all')
        ok = (not lim or n <= lim[1] or s in ALLOW) and not BAN.search(s) and not (c != '对话框正文' and s.endswith('。'))
        rows.append((w, c, s, str(n), lim[0] if lim else '—', ok))
    rows.sort(key=lambda r: (r[0], r[1], r[2]))
    return rows


def put(doc, tag, text):
    a, b = f'<!-- {tag}:start -->', f'<!-- {tag}:end -->'
    if a not in doc or b not in doc:
        return doc
    return doc[:doc.index(a) + len(a)] + text + doc[doc.index(b):]


def write_result(n, bad, rows, rev):
    if A.no_table or not os.path.exists(NOTE):
        return
    doc = open(NOTE, encoding='utf-8').read()
    over = sum(1 for r in rows if not r[5])
    head = f"\n- 最近一次：{time.strftime('%Y-%m-%d %H:%M')}，{n} 项，{'全部通过' if not bad else f'失败 {len(bad)}'}，控制台无报错{'' if not [b for b in bad if b[0].startswith('控制台')] else '（有报错，见失败项）'}；文案 {len(rows)} 条，超出 {over}。制作区：{('git ' + rev) if rev else '工作区'}。\n"
    head += ''.join(f'  - 失败：{b[0]}　{b[2]}\n' for b in bad[:20])
    head += ''.join(f'  - 注意（样板组件）：{s}\n' for s in INFO)
    open(NOTE, 'w', encoding='utf-8').write(put(doc, 'check-result', head))


def write_table(rows):
    if A.no_table or not os.path.exists(NOTE):
        return
    doc = open(NOTE, encoding='utf-8').read()
    a, b = '<!-- copy-table:start -->', '<!-- copy-table:end -->'
    if a not in doc or b not in doc:
        return
    body = [f'\n共 {len(rows)} 条（同一位置、类别下相同文字只列一次；「名称」「hh:mm」是变量）。字数：一个汉字算 1，一个英文词、数字、路径算 1，标点和空格不算；按钮、菜单项、标签、表头只数汉字，专有名词不算。\n',
            '| 位置 | 类别 | 文字 | 字数 | 上限 | 结果 |', '| --- | --- | --- | --- | --- | --- |']
    for w, c, s, n, lim, ok in rows:
        body.append(f"| {w} | {c} | {s.replace('|', '｜')} | {n} | {lim} | {'通过' if ok else '超出'} |")
    doc = doc[:doc.index(a) + len(a)] + '\n'.join(body) + '\n\n' + doc[doc.index(b):]
    open(NOTE, 'w', encoding='utf-8').write(doc)


# ================================================================= 主程序
def main():
    build()
    shim()
    if SHIM:
        info('制作区 v3.4 还没合入：' + '、'.join(SHIM) + ' 由走查在合成出来的临时文件里补上（没改制作区源码），制作区推上来后这一行消失')
    t0 = time.time()
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        p = P(br)
        steps = [('顶栏 1920', lambda: t_bar(p, 1920)), ('顶栏 1366', lambda: t_bar(p, 1366)), ('更新记录', lambda: t_version(p)),
                 ('两页 1920', lambda: t_pages(p, 1920)), ('两页 1366', lambda: t_pages(p, 1366)), ('资源交付', lambda: t_import(p)),
                 ('变灰与互锁', lambda: t_interlock(p)), ('文件夹与 UE', lambda: t_folders_ue(p)), ('其他浏览器', lambda: t_browser(p)),
                 ('导出', lambda: t_export(p)), ('另存与预览', lambda: t_save(p)), ('编排工作台 1920', lambda: t_wb(p, 1920)), ('编排工作台 1366', lambda: t_wb(p, 1366)), ('滚动条', lambda: t_scroll(p)),
                 ('溢出 1920', lambda: t_sweep(p, 1920)), ('溢出 1366', lambda: t_sweep(p, 1366)), ('样板开关与全表', lambda: t_kit_sheet(p)), ('挂钩', lambda: t_hooks(p))]
        for name, fn in steps:
            n0 = len(p.errs)
            try:
                fn()
            except Exception as e:
                ck(f'走查出错-{name}', False, f'{type(e).__name__}: {e}'.split('\n')[0])
            ck(f'控制台-{name}', len(p.errs) == n0, p.errs[n0:][:3])
        br.close()
    rows = copy_table()
    bad_copy = [r for r in rows if not r[5]]
    ck('文案-自查表全部在上限内、无禁用写法', not bad_copy, bad_copy[:6])
    write_table(rows)
    ok = [r for r in RES if r[1]]
    bad = [r for r in RES if not r[1]]
    write_result(len(RES), bad, rows, A.main_rev)
    print(f'\ncheck_shell：{len(RES)} 项，通过 {len(ok)}，失败 {len(bad)}；文案 {len(rows)} 条；{time.time() - t0:.0f} 秒' + ('' if A.no_shots else f'；截图在 {A.shots}'))
    for r in bad:
        print('  FAIL', r[0], '　', r[2])
    for s in INFO:
        print('  注意（样板组件）', s)
    json.dump({'n': len(RES), 'fail': [r[0] for r in bad]}, open(os.path.join(tempfile.gettempdir(), 'check_shell_last.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
