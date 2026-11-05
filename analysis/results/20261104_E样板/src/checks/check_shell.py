#!/usr/bin/env python3
"""E 样板 v3 外壳走查（对话框9，2026-11-05）

覆盖：交互宪章 0.9 的全部入口和状态（含「用户 2026-11-05 改定」第 1–7 条）、交互走查 P4 / P8 / P9、
设计规范 v3 第 3–6、11、12 节里外壳能量的部分（尺寸、线、面、颜色用途、字号字重、浮层位置），
1920 / 1366 下顶栏各状态组合和两页不溢出、不截断，样板挂钩缺失时不报错，以及文案自查表。

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
  const desc = e => (e.id ? '#' + e.id : e.tagName.toLowerCase()) + [...e.classList].slice(0, 3).map(c => '.' + c).join('');
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
def t_bar(p, size):
    """改定 1、2、6；规范第 11 节"""
    S = f'@{size}'
    p.fresh(size)
    logon(p)
    st = p.ev('SHELL.state()')
    ck(f'改定1-默认画面是制作{S}', st['ws'] == 'baker' and p.ev("__T.vis('#wsBaker') && !__T.vis('#wsImport') && !__T.vis('#wsWB')"), st)
    ck(f'改定1-没有工作区切换{S}', p.ev("""(() => { const b = __T.qq('#shell button, #shell [role=tab]').map(x => __T.txt(x));
        return !__T.q('#shell [data-sh="ws"], #shell .sh-ws-tabs, #shell [role=tablist]') && !b.some(t => ['制作', '导入', '编排'].includes(t)); })()"""))
    ck(f'改定6-顶栏没有「更新记录」一项{S}', p.ev("!__T.qq('#shell button, #shell span').some(x => __T.txt(x) === '更新记录' || /^更新记录 ?\\d*$/.test(__T.txt(x)))"))
    # 分组顺序：UE ｜ 导出、备份 ｜ 资源交付、资源编排 ｜ 显卡
    g = p.ev("""__T.qq('#shell .sh-r > .sh-g').map(x => ({c: x.className, x: __T.rect(x).x, r: __T.rect(x).r, t: __T.txt(x)}))""")
    order = [('sh-g-ue', 'UE'), ('sh-g-fold', '导出'), ('sh-g-pg', '资源交付'), ('sh-g-gpu', 'RTX')]
    ok = len(g) == 4 and all(o[0] in gi['c'] and o[1] in gi['t'] for o, gi in zip(order, g)) and all(g[i]['r'] <= g[i + 1]['x'] for i in range(3))
    ck(f'改定2-右侧顺序 UE｜文件夹｜页面｜显卡{S}', ok, [x['t'] for x in g])
    fold = p.ev("__T.qq('#shell .sh-g-fold .sh-fold').map(x => __T.txt(x))")
    ck(f'改定2-文件夹组先导出后备份{S}', len(fold) == 2 and fold[0].startswith('导出') and fold[1].startswith('备份'), fold)
    pgs = p.ev("__T.qq('#shell .sh-pg').map(x => __T.txt(x))")
    ck(f'改定2-页面组「资源交付 2」「资源编排」{S}', pgs == ['资源交付 2', '资源编排'], pgs)
    sh = p.ev("__T.rect('#shell')")
    gpu = p.ev("__T.rect('#shell .sh-gpu')")
    pad = p.ev("parseFloat(__T.cs('#shell', 'paddingRight'))")
    ck(f'改定2-显卡在最右{S}', gpu and near(gpu['r'], sh['r'] - pad, 1.5), (gpu, sh, pad))
    ck(f'①-显卡缩写 + 悬停全名{S}', p.ev("__T.txt('#shell .sh-gpu') === 'RTX 4070' && __T.q('#shell .sh-gpu').dataset.tip === 'NVIDIA GeForce RTX 4070 Laptop GPU'"))
    # 第 11 节：高度、面、底线
    H = 40 if size == 1920 else 36
    ck(f'规范11-顶栏高 {H}{S}', near(sh['h'], H), sh['h'])
    ck(f'规范11-顶栏用栏头面色{S}', p.ev("__T.cs('#shell', 'backgroundColor') === __T.tok('--surf-chrome')"), p.ev("[__T.cs('#shell', 'backgroundColor'), __T.tok('--surf-chrome')]"))
    bl = p.ev("""(() => { const s = getComputedStyle(__T.q('#shell')); return {bw: s.borderBottomWidth, sh: s.boxShadow, line: __T.tok('--line')}; })()""")
    one = (bl['bw'] == '1px') != ('0px -1px 0px' in bl['sh'] and bl['line'] in bl['sh'])
    ck(f'规范11-底边一条 1 px 线（不叠成 2 px）{S}', one and (bl['line'] in bl['sh'] or bl['bw'] == '1px'), bl)
    # 产品名、版本号
    fs = {1920: (12, 13, 15), 1366: (11, 12, 14)}[size]
    b = p.ev("({t: __T.txt('#shell .sh-brand b'), fs: parseFloat(__T.cs('#shell .sh-brand b', 'fontSize')), fw: +__T.cs('#shell .sh-brand b', 'fontWeight'), c: __T.cs('#shell .sh-brand b', 'color'), t1: __T.tok('--t1')})")
    ck(f'规范11-「烟花工坊」大号 600{S}', b['t'] == '烟花工坊' and b['fs'] == fs[2] and b['fw'] == 600 and b['c'] == b['t1'], b)
    v = p.ev("""(() => { const v = __T.q('#shell .sh-ver'); return {t: __T.txt(v), fs: parseFloat(__T.cs(v, 'fontSize')), c: __T.cs(v, 'color'), t3: __T.tok('--t3'), n: v.dataset.n, after: getComputedStyle(v, '::after').content, afs: parseFloat(getComputedStyle(v, '::after').fontSize), h: __T.rect(v).h, tag: v.tagName}; })()""")
    ck(f'规范11-版本号小号弱色{S}', v['t'] == 'FireWorksLab 5.0.3' and v['fs'] == fs[0] and v['c'] == v['t3'], v)
    ck(f'改定6-未读数在版本号右上角（小号）{S}', v['n'] == '2' and v['after'] == '"2"' and v['afs'] == fs[0], v)
    ck(f'规范2-版本号可点区域 ≥ 28{S}', v['tag'] == 'BUTTON' and v['h'] >= 28 - 0.5, v['h'])
    # 分组：组间 20、组内 12、1 px 竖线在组间正中
    gp = p.ev("""(() => { const r = __T.q('#shell .sh-r'), gs = __T.qq('.sh-g', r);
        const seps = gs.slice(1).map(x => { const s = getComputedStyle(x, '::before'); return {w: s.width, h: s.height, bg: s.backgroundColor, left: parseFloat(s.left)}; });
        return {gap: getComputedStyle(r).columnGap, gi: gs.map(x => getComputedStyle(x).columnGap), seps, line: __T.tok('--line'),
                dist: gs.slice(1).map((x, i) => __T.rect(x).x - __T.rect(gs[i]).r)}; })()""")
    ck(f'规范11-组间 20{S}', gp['gap'] == '20px' and all(near(d, 20, 0.6) for d in gp['dist']), gp['dist'])
    ck(f'规范11-组内 12{S}', all(x == '12px' for x in gp['gi']), gp['gi'])
    ck(f'规范11-组间 1 px 竖线（线色）{S}', len(gp['seps']) == 3 and all(s['w'] == '1px' and s['bg'] == gp['line'] and near(s['left'], -10, 0.6) for s in gp['seps']), gp['seps'])
    # UE 已连接：圆点薄荷 + 文字弱色
    ue = p.ev("({t: __T.txt('#shell .sh-ue'), dot: getComputedStyle(__T.q('#shell .sh-ue'), '::before').backgroundColor, p4: __T.tok('--p4'), c: __T.cs('#shell .sh-ue', 'color'), t3: __T.tok('--t3'), fs: parseFloat(__T.cs('#shell .sh-ue', 'fontSize'))})")
    ck(f'规范11-「UE 已连接」圆点 + 文字{S}', ue['t'] == 'UE 已连接' and ue['dot'] == ue['p4'] and ue['c'] == ue['t3'], ue)
    # 文件夹：标签弱色、值次文字色；备份未选 = 弱色字 +「设置」
    f = p.ev("""(() => { const e = __T.q('#shell [data-fk=exp]'), b = __T.q('#shell [data-fk=bak]');
        return {ek: __T.cs(e.querySelector('.sh-fk'), 'color'), ev: __T.cs(e.querySelector('.sh-fv'), 'color'), bk: __T.cs(b.querySelector('.sh-fk'), 'color'), bv: __T.cs(b.querySelector('.sh-fv'), 'color'),
                set: __T.txt(b.parentElement.querySelector('.sh-set')), et: __T.txt(e), bt: __T.txt(b), t2: __T.tok('--t2'), t3: __T.tok('--t3')}; })()""")
    ck(f'规范11-「导出 FWL_Export」标签弱色、值次文字色{S}', f['et'] == '导出 FWL_Export' and f['ek'] == f['t3'] and f['ev'] == f['t2'], f)
    ck(f'规范5-「备份 未选　设置」弱色字 + 命令{S}', f['bt'] == '备份 未选' and f['bv'] == f['t3'] and f['set'] == '设置', f)
    # 页面标签：文字 + 下划线；没打开时没有下划线、400；计数小号弱色
    tb = p.ev("""__T.qq('#shell .sh-pg').map(x => ({t: __T.txt(x), on: x.getAttribute('aria-pressed'), fw: +__T.cs(x, 'fontWeight'), fs: parseFloat(__T.cs(x, 'fontSize')), c: __T.cs(x, 'color'), u: getComputedStyle(x, '::after').content,
        n: x.querySelector('.badge-n') && {fs: parseFloat(__T.cs(x.querySelector('.badge-n'), 'fontSize')), c: __T.cs(x.querySelector('.badge-n'), 'color')}, h: __T.rect(x).h}))""")
    t2, t3 = p.ev("[__T.tok('--t2'), __T.tok('--t3')]")
    ck(f'规范4-页面标签静止：次文字色、400、无下划线{S}', all(x['on'] == 'false' and x['fw'] == 400 and x['fs'] == fs[1] and x['c'] == t2 and x['u'] in ('none', 'normal') for x in tb), tb)
    ck(f'规范11-「资源交付 2」计数小号弱色{S}', tb[0]['n'] and tb[0]['n']['fs'] == fs[0] and tb[0]['n']['c'] == t3, tb[0])
    ck(f'规范2-页面标签可点区域 ≥ 28{S}', all(x['h'] >= 28 for x in tb), [x['h'] for x in tb])
    gp2 = p.ev("({fs: parseFloat(__T.cs('#shell .sh-gpu', 'fontSize')), c: __T.cs('#shell .sh-gpu', 'color'), t3: __T.tok('--t3')})")
    ck(f'规范11-显卡小号弱色{S}', gp2['fs'] == fs[0] and gp2['c'] == gp2['t3'], gp2)
    # 顶栏只有 400 / 600，字号只有三级；不画警示图形
    fo = p.ev("__T.fonts(['#shell'])")
    ck(f'规范1-顶栏字重只有 400 / 600{S}', all(x['fw'] in (400, 600) for x in fo), [x for x in fo if x['fw'] not in (400, 600)])
    ck(f'规范1-顶栏字号只用三级{S}', all(x['fs'] in fs for x in fo), [x for x in fo if x['fs'] not in fs])
    p.shot(f'shell_1_bar_{size}.png', clip={'x': 0, 'y': 0, 'width': size, 'height': H + 8})
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
        ck('改定6-各部分版本号（原「关于」并进来）', all(s in m['dl'] for s in ('制作', '烘焙器 4.9.129', '资源交付', '导入器 v2.31', '资源编排', '编排工作台 16.0.37', '浏览器', '显卡')), m['dl'])
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
    """改定 3、4、5：打开两页、回到制作（两种方式）；只换显示不丢状态；规范第 11 节下划线"""
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
    # 点「资源交付」
    p.click('#shell .sh-pg[data-pg="import"]')
    st = p.ev("""({ws: SHELL.state().ws, imp: __T.vis('#wsImport'), bk: __T.vis('#wsBaker'), dock: __T.q('#wsImport').parentElement === __T.q('#wsBaker').parentElement,
        wbDock: !!__T.q('#app #wsWB'), on: __T.q('#shell .sh-pg[data-pg=import]').getAttribute('aria-pressed'), tip: __T.q('#shell .sh-pg[data-pg=import]').dataset.tip})""")
    ck(f'改定3-点「资源交付」打开那一页{S}', st['ws'] == 'import' and st['imp'] and not st['bk'], st)
    ck(f'改定3-只有打开的那页放进 #app{S}', st['dock'] and not st['wbDock'], st)
    ck(f'改定5-亮着的标签悬停写「返回制作」{S}', st['on'] == 'true' and st['tip'] == '返回制作', st)
    u = p.ev("""(() => { const x = __T.q('#shell .sh-pg[aria-pressed=true]'), a = getComputedStyle(x, '::after'), r = __T.rect(x), sh = __T.rect('#shell');
        return {h: a.height, bg: a.backgroundColor, p4: __T.tok('--p4'), fw: +__T.cs(x, 'fontWeight'), c: __T.cs(x, 'color'), t1: __T.tok('--t1'), bottom: r.b, shb: sh.b, w: parseFloat(a.width), tw: r.w}; })()""")
    ck(f'规范11-当前页标签：薄荷 2 px 下划线压在顶栏底线上{S}', u['h'] == '2px' and u['bg'] == u['p4'] and near(u['bottom'], u['shb'], 0.6) and near(u['w'], u['tw'], 0.6), u)
    ck(f'规范4-当前页标签 600 + 主文字色{S}', u['fw'] == 600 and u['c'] == u['t1'], u)
    w0 = p.ev("__T.rect('#shell .sh-pg[data-pg=import]').w")
    # 「← 返回制作」在页面工具行左端
    bk = p.ev("""(() => { const b = __T.q('#impTool .sh-back'), t = __T.rect('#impTool'), r = __T.rect(b), i = b.querySelector('svg.i use');
        return {t: __T.txt(b), x: r.x - t.x, h: r.h, icon: i && i.getAttribute('href'), iw: __T.rect(b.querySelector('svg.i')).w, first: __T.qq('#impTool button').filter(__T.vis)[0] === b}; })()""")
    ck(f'改定5-工具行左端「← 返回制作」{S}', bk['t'] == '返回制作' and bk['first'] and bk['x'] <= 12 and bk['icon'] == '#i-sh-back', bk)
    ck(f'规范6-返回箭头 16 px、命令点击区 28{S}', near(bk['iw'], 16, 0.5) and bk['h'] >= 28 - 0.5, bk)
    # 再点一次亮着的标签 → 回到制作
    p.click('#shell .sh-pg[data-pg="import"]')
    st = p.ev("({ws: SHELL.state().ws, bk: __T.vis('#wsBaker'), imp: __T.vis('#wsImport'), inApp: !!__T.q('#app #wsImport'), on: __T.qq('#shell .sh-pg[aria-pressed=true]').length})")
    ck(f'改定5-再点亮着的标签回到制作{S}', st['ws'] == 'baker' and st['bk'] and not st['imp'] and not st['inApp'] and st['on'] == 0, st)
    after = p.ev("({sel: KIT.sel(), t: KIT.t(), sc: (__T.q('#pbody') || {}).scrollTop || 0})")
    ck(f'0.4-切页只换显示：选择、时间、滚动都在{S}', after['sel'] == mid['sel'] and after['t'] == mid['t'] and abs(after['sc'] - mid['sc']) <= 1, (mid, after))
    # 资源编排 + 「← 返回制作」
    p.click('#shell .sh-pg[data-pg="wb"]')
    st = p.ev("({ws: SHELL.state().ws, wb: __T.vis('#wsWB'), bk: __T.vis('#wsBaker'), tip: __T.q('#shell .sh-pg[data-pg=wb]').dataset.tip, back: __T.vis('#wbTool .sh-back')})")
    ck(f'改定4-点「资源编排」打开编排工作台入口{S}', st['ws'] == 'wb' and st['wb'] and not st['bk'] and st['back'], st)
    # 两页之间直接换
    p.click('#shell .sh-pg[data-pg="import"]')
    ck(f'改定3-编排页直接点「资源交付」{S}', p.ev("SHELL.state().ws === 'import' && __T.vis('#wsImport') && !__T.vis('#wsWB') && !__T.q('#app #wsWB')"))
    p.click('#shell .sh-pg[data-pg="wb"]')
    p.click('#wbTool .sh-back')
    ck(f'改定5-点「返回制作」回到制作{S}', p.ev("SHELL.state().ws === 'baker' && __T.vis('#wsBaker') && !__T.vis('#wsWB')"))
    ck(f'规范11-标签换 600 不挤动顶栏{S}', near(p.ev("__T.rect('#shell .sh-pg[data-pg=import]').w"), w0, 0.5))
    # 在两页里，制作区的单键快捷键不作用到看不见的画面
    p.click('#shell .sh-pg[data-pg="import"]')
    t0 = p.ev('KIT.t()')
    p.ev("__T.q('#impMain').focus && document.activeElement && document.activeElement.blur && document.activeElement.blur()")
    p.pg.keyboard.press('Space')
    p.pg.wait_for_timeout(350)
    ck(f'0.4-资源交付里按空格不播放制作区{S}', p.ev('KIT.t()') == t0, (t0, p.ev('KIT.t()')))
    grab(p)
    p.ev("SHELL.ws('baker')")


def t_import(p):
    """改定 3、7；②（资源交付工具行）；⑦ 变灰与互锁；P9 覆盖前先问备份；导入进度"""
    p.fresh()
    logon(p)
    p.click('#shell .sh-pg[data-pg="import"]')
    t = p.ev("""(() => { const r = __T.rect('#impTool'), ws = __T.rect('#wsImport');
        return {w: r.w, ww: ws.w, segs: __T.qq('#impSub button').map(__T.txt), cmds: __T.qq('#impTool .tgrp button').map(__T.txt), go1: __T.q('#impGo').classList.contains('btn-1'),
                bg: __T.cs('#impTool', 'backgroundColor'), chrome: __T.tok('--surf-chrome'), sh: __T.cs('#impTool', 'boxShadow'), bw: __T.cs('#impTool', 'borderBottomWidth'), line: __T.tok('--line'),
                h: r.h, top: __T.len('--h-top'), segX: __T.rect('#impTool .sh-hm').x - ws.x, colX: __T.rect('#impMain').x - ws.x}; })()""")
    ck('②-资源交付工具行：「烟花导入 / ResourceFX 配表」→ 刷新 → 导入', t['segs'] == ['烟花导入', 'ResourceFX 配表'] and t['cmds'] == ['刷新', '导入'] and t['go1'], t)
    ck('规范3-工具行占满宽、栏头面色、底边 1 px 线', near(t['w'], t['ww']) and t['bg'] == t['chrome'] and t['line'] in t['sh'] and t['bw'] == '0px', t)
    ck('规范2-工具行分段和下面的栏对齐', near(t['segX'], t['colX'], 1), t)
    L = p.ev("""({folder: __T.txt('#impFolder'), cnt: __T.txt('#impCount'), rows: __T.qq('#impList .lib-item').map(x => ({id: x.dataset.id, n: __T.txt(x.querySelector('.li-n')), st: __T.txt(x.querySelector('.st')), sel: x.getAttribute('aria-selected')})),
        badge: __T.txt('#shell .sh-pg[data-pg=import] .badge-n')})""")
    waits = [r for r in L['rows'] if r['st'] == '待导入']
    ck('改定3-左栏：导出文件夹里的包', L['folder'] == 'FWL_Export' and L['cnt'] == '5 个素材包' and len(L['rows']) == 5, L)
    ck('改定3-待导入的排在前面', [r['st'] for r in L['rows']][:2] == ['待导入', '待导入'], L['rows'])
    ck('改定3-标签上的数字 = 待导入的包数', L['badge'] == str(len(waits)) == '2', (L['badge'], len(waits)))
    # 选一个包 → 逐资产清单
    p.click('#impList .lib-item[data-id="rt6"]')
    h = p.ev("({n: __T.txt('#impMC .sh-mh b'), rows: __T.qq('#impMC .sh-at tbody tr').length, sel: __T.q('#impList [data-id=rt6]').getAttribute('aria-selected'), hd: __T.txt('#impMC .sh-mh')})")
    ck('改定3-选包 → 右边逐资产清单（Ramp + PC 3 + 手机 1 + 材质实例 3 + 粒子系统 2）', h['n'] == '升空尾缀 RT6' and h['rows'] == 10 and h['sel'] == 'true' and '10 个资产：新建 7、覆盖 3' in h['hd'], h)
    p.pg.keyboard.press('ArrowDown')
    ck('改定3-列表 ↓ 换行', p.ev("__T.q('#impList [aria-selected=true]').dataset.id") != 'rt6')
    p.click('#impSub button[data-v="ResourceFX 配表"]')
    ck('②-切到 ResourceFX 配表', p.ev("__T.q('#impSub [data-v=\"ResourceFX 配表\"]').getAttribute('aria-pressed') === 'true' && !__T.q('#impMC .sh-at')"))
    p.click('#impSub button[data-v="烟花导入"]')
    p.click('#impList .lib-item[data-id="cs3c"]')
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
    bad = [h for h in mint if not re.search(r'sh-pg.*::after|sh-ue.*::before|conn\.on.*::before|#impGo', h['el'])]
    ck('规范5-资源交付页薄荷只在：当前页下划线、UE 圆点、本页主操作「导入」', not bad, bad or mint)
    ck('规范5-资源交付页（正常状态）没有琥珀和红色', not [h for h in hits if h['c'] in ('w3', 'e3')], [h for h in hits if h['c'] in ('w3', 'e3')])
    fo = p.ev("__T.fonts(['#wsImport'])")
    ck('规范1-资源交付页字重只有 400 / 600', all(x['fw'] in (400, 600) for x in fo), [x for x in fo if x['fw'] not in (400, 600)][:5])
    ck('规范1-资源交付页字号三级', all(x['fs'] in (12, 13, 15) for x in fo), [x for x in fo if x['fs'] not in (12, 13, 15)][:5])
    ck('规范5-外壳不画警示三角（琥珀三角只表示需重新导出）', p.ev("!__T.qq('#shell use, #wsImport use, #wsWB use').some(u => /alert|stale/.test(u.getAttribute('href')))"))
    p.shot('shell_2_import.png')
    grab(p)

    # ---- P9：备份未选 + 要覆盖 → 先问，一个都不写；取消 → 什么都不写
    p.click('#impGo')
    d = p.ev("""(() => { const d = __T.ovl('.dialog[data-dlg=bak]')[0]; return d && {h: __T.txt(d.querySelector('h2')), p: __T.txt(d.querySelector('p')), acts: __T.qq('.acts button', d).map(__T.txt), imp: SHELL.state().imp, ticks: __T.qq('#impMC .sh-at td:first-child [aria-label]').length}; })()""")
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
    r = p.ev("({imp: SHELL.state().imp, bak: SHELL.state().bak, toast: __T.ovl('.sh-toast > span').map(__T.txt), ticks: __T.qq('#impMC .sh-at td:first-child [aria-label]').length})")
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
    w = p.ev("({ue: __T.txt('#shell .sh-ue'), go: __T.txt('#impGo'), wb: __T.q('#wbTool [data-sh=wbUE]').getAttribute('aria-disabled'), wbTip: __T.q('#wbTool [data-sh=wbUE]').dataset.tip, bak: SHELL.state().bak})")
    ck('P9-允许访问后才开始写', ok and w['bak'] == 'ok', w)
    ck('⑦-导入写 UE：顶栏「UE 写入中 n / N」', bool(re.match(r'^UE 写入中 \d+ / 10$', w['ue'] or '')), w)
    ck('⑦-导入写 UE：编排的写 UE 命令变灰写原因', w['wb'] == 'true' and w['wbTip'] == '导入正在写 UE，写完后可用', w)
    grab(p)
    p.ev("SHELL.ws('baker')")
    p.click('#shell .sh-ue')
    ck('①-写入中点 UE 状态打开资源交付', p.ev("SHELL.state().ws") == 'import')
    ok = p.wait("!SHELL.state().imp && __T.ovl('.sh-toast > span').length", 8000)
    p.ev('SHELL.speed(0.15)')
    t2 = p.ev("""({t: __T.ovl('.sh-toast > span').map(__T.txt), act: __T.ovl('.sh-toast [data-r=act]').map(__T.txt), st: __T.txt('#impList [data-id=cs3c] .st'), badge: __T.txt('#shell .sh-pg[data-pg=import] .badge-n'),
        ticks: __T.qq('#impMC .sh-at td:first-child [aria-label="已写入"]').length})""")
    ck('⑦-写完：每行打勾、包变「已导入」、计数减一', ok and t2['ticks'] == 10 and t2['st'] == '已导入' and t2['badge'] == '1', t2)
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
    ck('⑦-UE 未连接：右边最上面原因条 +「重试」', r['why'] and r['wt'] == 'UE 未连接，GPUECli 启动后自动连上' and r['rt'] == '重试', r)
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
    ck('①-编排写入中点 UE 状态打开资源编排', p.ev('SHELL.state().ws') == 'wb')
    ok = p.wait("!SHELL.S.wb.busy", 3000)
    ck('⑦-编排写完：命令恢复、操作处写结果', ok and p.wait("__T.ovl('.sh-hint').map(__T.txt).includes('已写入 UE：导演表')", 1500))
    # 导出文件夹未选 / 需允许 / 浏览器不支持
    p.ev("SHELL.set('exp', 'none'); SHELL.ws('import')")
    r = p.ev("({e: __T.txt('#impList .empty b'), b: __T.txt('#impList .empty button'), go: __T.q('#impGo').dataset.tip, rf: __T.q('#impRefresh').dataset.tip, badge: !!__T.q('#shell .sh-pg[data-pg=import] .badge-n'), f: __T.txt('#impFolder')})")
    ck('⑦-导出文件夹未选：列表空状态「未选导出文件夹　选择…」', r['e'] == '未选导出文件夹' and r['b'] == '选择…', r)
    ck('⑦-导出文件夹未选：导入、刷新变灰写原因，标签不带数字', r['go'] == '未选导出文件夹' and r['rf'] == '未选导出文件夹' and not r['badge'], r)
    grab(p)
    p.click('#impList .empty button')
    ck('⑤-空状态「选择…」选好文件夹，列表回来', p.ev("SHELL.state().exp === 'ok' && __T.qq('#impList .lib-item').length === 5"))
    p.ev("SHELL.set('exp', 'perm')")
    p.ev("document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))")
    r = p.ev("({e: __T.txt('#impList .empty b'), b: __T.txt('#impList .empty button'), badge: !!__T.q('#shell .sh-pg[data-pg=import] .badge-n')})")
    ck('⑤-导出要重新允许：左栏就地写同一句 +「允许访问」', r['e'] == '浏览器重开后，FWL_Export 需重新允许访问' and r['b'] == '允许访问' and not r['badge'], r)
    grab(p)
    p.click('#impRefresh')
    ck('⑤-导出要重新允许：点「刷新」按钮旁出同一句气泡', p.ev("__T.ovl('.sh-bub').map(b => __T.txt(b.querySelector('span')))") == ['浏览器重开后，FWL_Export 需重新允许访问'])
    p.click('.sh-bub [data-r="allow"]')
    ck('⑤-气泡「允许访问」后恢复', p.ev("SHELL.state().exp === 'ok' && __T.qq('#impList .lib-item').length === 5"))
    grab(p)


def t_folders_ue(p):
    """① 顶栏：UE 四种状态 + 不可用；文件夹三种状态 × 2 + 不可用；「设置」；倒计时与重试"""
    p.fresh()
    logon(p)
    tok = p.ev("({w3: __T.tok('--w3'), t2: __T.tok('--t2'), t3: __T.tok('--t3')})")
    # 导出未选：琥珀 +「设置」；点「设置」选好
    p.ev("SHELL.set('exp', 'none')")
    r = p.ev("""(() => { const e = __T.q('#shell [data-fk=exp]'); return {t: __T.txt(e), k: __T.cs(e.querySelector('.sh-fk'), 'color'), v: __T.cs(e.querySelector('.sh-fv'), 'color'), set: __T.txt(e.parentElement.querySelector('.sh-set')), tip: e.dataset.tip, ic: !!e.querySelector('svg')}; })()""")
    ck('①-导出未选：琥珀字（会挡住导出）+「设置」，不画图形', r['t'] == '导出 未选' and r['k'] == tok['w3'] and r['v'] == tok['w3'] and r['set'] == '设置' and not r['ic'], r)
    ck('①-导出未选：悬停写「导出前需选好」', r['tip'] == '导出文件夹：导出前需选好', r)
    grab(p)
    p.click('#shell .sh-set[data-sk="exp"]')
    ck('①-点「设置」选好导出文件夹，标签旁写结果', p.ev("SHELL.state().exp === 'ok'") and p.ev("__T.ovl('.sh-hint').map(__T.txt)") == ['已选择 FWL_Export'])
    p.ev("SHELL.set('exp', 'none')")
    p.click('#shell [data-fk="exp"]')
    ck('①-导出未选：点标签直接选文件夹', p.ev("SHELL.state().exp") == 'ok')
    # 已选：点开「换文件夹…」
    p.click('#shell [data-fk="exp"]')
    m = p.ev("({h: __T.txt(__T.ovl('.menu .mh')[0]), it: __T.ovl('.menu [data-mi]').map(__T.txt), ex: __T.q('#shell [data-fk=exp]').getAttribute('aria-expanded')})")
    ck('①-导出已选：点开菜单（完整路径 + 换文件夹…）', m['h'] == '导出文件夹 D:\\FireWorksLab\\FWL_Export' and m['it'] == ['换文件夹…'] and m['ex'] == 'true', m)
    grab(p)
    p.click('.menu [data-mi="change"]')
    ck('①-换文件夹后标签跟着变', p.ev("__T.txt('#shell [data-fk=exp]')") == '导出 FWL_Export_2')
    # 需允许访问：琥珀 +「需允许访问」+ 气泡一次
    p.ev("SHELL.set('exp', 'perm')")
    r = p.ev("({t: __T.txt('#shell [data-fk=exp]'), c: __T.cs('#shell [data-fk=exp] .sh-fx', 'color'), bub: __T.ovl('.sh-bub').map(b => __T.txt(b.querySelector('span')))})")
    ck('①-导出需允许访问：琥珀字 + 标签下方一次气泡', r['t'] == '导出 FWL_Export_2 需允许访问' and r['c'] == tok['w3'] and r['bub'] == ['浏览器重开后，FWL_Export_2 需重新允许访问'], r)
    bb = p.ev("""(() => { const b = __T.ovl('.sh-bub')[0], a = __T.rect('#shell [data-fk=exp]'), r = __T.rect(b); return {gap: r.y - a.b, ax: parseFloat(b.style.getPropertyValue('--ax')) + r.x + 4, mid: a.x + a.w / 2, up: b.classList.contains('is-up')}; })()""")
    ck('规范12-标签下方气泡：离 8 px，三角对着标签中线', near(bb['gap'], 8, 1) and near(bb['ax'], bb['mid'], 2) and not bb['up'], bb)
    p.shot('shell_5_perm_bubble.png', clip={'x': 900, 'y': 0, 'width': 1020, 'height': 120})
    grab(p)
    p.click('#shell [data-fk="exp"]')
    ck('①-需允许访问：点标签即允许', p.ev("SHELL.state().exp === 'ok' && __T.ovl('.sh-bub').length === 0"))
    # 备份三态
    p.ev("SHELL.set('bak', 'ok')")
    ck('①-备份已选：标签弱色 + 值次文字色', p.ev("__T.txt('#shell [data-fk=bak]') === '备份 FWL_Backup' && __T.cs('#shell [data-fk=bak] .sh-fv', 'color') === __T.tok('--t2')"))
    p.ev("SHELL.set('bak', 'perm')")
    ck('①-备份需允许访问：琥珀字 + 气泡', p.ev("__T.txt('#shell [data-fk=bak]') === '备份 FWL_Backup 需允许访问' && __T.ovl('.sh-bub').length === 1"))
    p.ev("SHELL.set('bak', 'none')")
    ck('①-备份未选：悬停写「覆盖 UE 资产前需选好」', p.ev("__T.q('#shell [data-fk=bak]').dataset.tip") == '备份文件夹：覆盖 UE 资产前需选好')
    p.click('#shell .sh-set[data-sk="bak"]')
    ck('①-备份「设置」选好', p.ev("SHELL.state().bak") == 'ok')
    # 长名字：省略号 + 悬停全称
    p.ev("SHELL.S.expName = 'FWL_Export_Project03_Fireworks_Long'; SHELL.render()")
    r = p.ev("""(() => { const v = __T.q('#shell [data-fk=exp] .sh-fv'); return {cut: v.scrollWidth > v.clientWidth, ell: __T.cs(v, 'textOverflow'), w: __T.rect(v).w, tip: __T.q('#shell [data-fk=exp]').dataset.tip, over: __T.clip(['#shell']).out}; })()""")
    ck('①-文件夹名过长：省略号 + 悬停全称、不挤出顶栏', r['ell'] == 'ellipsis' and r['tip'].endswith('FWL_Export_Project03_Fireworks_Long') and not r['over'], r)
    p.ev("SHELL.S.expName = 'FWL_Export'; SHELL.render()")
    # UE：已连接 / 连接中 / 未连接（倒计时、重试）
    p.ev("SHELL.set('ue', 'wait')")
    ck('①-UE 连接中：转圈 + 文字', p.ev("__T.txt('#shell .sh-ue') === 'UE 连接中' && !!__T.q('#shell .sh-ue .spin')"))
    grab(p)
    p.ev("SHELL.set('ue', 'off')")
    r = p.ev("({t: __T.txt('#shell .sh-ueg'), tip: __T.q('#shell .sh-ue').dataset.tip, dot: getComputedStyle(__T.q('#shell .sh-ue'), '::before').borderTopStyle})")
    ck('①-UE 未连接：空心圈 +「重试」+「12 秒后自动重试」', r['t'] == 'UE 未连接 重试 12 秒后自动重试' and r['dot'] == 'solid', r)
    ck('①-UE 悬停写地址和上次连上的时间（一行）', bool(re.match(r'^127\.0\.0\.1:17780　上次连上 \d\d:\d\d$', r['tip'])), r['tip'])
    ok = p.wait("/^(1[01]) 秒后自动重试$/.test(__T.txt('#shell .sh-cd'))", 2500)
    ck('①-倒计时真在走', ok, p.ev("__T.txt('#shell .sh-cd')"))
    p.click('#shell .sh-retry')
    ck('①-点「重试」：连接中', p.ev("__T.txt('#shell .sh-ue')") == 'UE 连接中')
    ok = p.wait("__T.txt('#shell .sh-cd') === '12 秒后自动重试'", 3000)
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
    r = p.ev("""({ue: __T.txt('#shell .sh-ue'), f: __T.qq('#shell .sh-fold').map(x => [__T.txt(x), x.getAttribute('aria-disabled'), x.dataset.tip]), badge: !!__T.q('#shell .sh-pg .badge-n'),
        exp: __T.qq('#expBtn .btn').map(b => [b.getAttribute('aria-disabled'), b.dataset.tip])})""")
    ck('⑤-其他浏览器：UE「不可用」', r['ue'] == 'UE 不可用', r)
    ck('⑤-其他浏览器：两个文件夹「不可用」、变灰写原因', all(x[0].endswith('不可用') and x[1] == 'true' and x[2] == '仅 Chrome、Edge 能读写文件夹' for x in r['f']), r)
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
        mh: __T.txt('#impMC .sh-mh b'), toast: __T.ovl('.sh-toast > span').map(__T.txt), act: __T.ovl('.sh-toast [data-r=act]').filter(__T.vis).map(__T.txt), bakerToast: __T.ovl('.toast:not(.sh-toast)').length,
        badge: __T.txt('#shell .sh-pg[data-pg=import] .badge-n')}; })()""")
    ck('改定3-导出完成后自动打开资源交付', r['ws'] == 'import', r)
    ck('改定3-选中刚导出的包（排在最前，副信息「刚导出 hh:mm」）', r['sel'] and r['sel'].startswith('金曜菊-B') and r['first'] and r['sub'].startswith('刚导出') and r['mh'] == r['sel'], r)
    ck('改定3-标签上的数字跟着加', r['badge'] == '3', r['badge'])
    ck('P8-导出的提示条写明来自制作，带「返回制作」', len(r['toast']) == 1 and r['toast'][0].startswith('制作：已导出 ') and r['act'] == ['返回制作'] and r['bakerToast'] == 0, r)
    pos = p.ev("""(() => { const t = __T.ovl('.sh-toast')[0], r = __T.rect(t), a = __T.rect('#app'), tb = __T.rect('#impTool'); return {top: r.y - tb.b, cx: r.x + r.w / 2 - (a.x + a.w / 2)}; })()""")
    ck('P8 / 规范12-提示条在外壳提示区：当前页工具行下方 8 px、居中', near(pos['top'], 8, 1) and near(pos['cx'], 0, 1.5), pos)
    p.shot('shell_8_after_export.png')
    grab(p)
    # 切到资源编排：提示条跟过去；回到制作：「返回制作」收起
    p.click('#shell .sh-pg[data-pg="wb"]')
    pos = p.ev("""(() => { const t = __T.ovl('.sh-toast')[0]; if (!t) return null; const r = __T.rect(t), tb = __T.rect('#wbTool'); return {top: r.y - tb.b, act: __T.vis(t.querySelector('[data-r=act]'))}; })()""")
    ck('P8-切页时提示条跟着挪到当前页顶部', pos and near(pos['top'], 8, 1) and pos['act'], pos)
    p.click('#wbTool .sh-back')
    pos = p.ev("""(() => { const t = __T.ovl('.sh-toast')[0]; if (!t) return null; const r = __T.rect(t), tb = __T.rect('#wsBaker > .topbar'); return {top: r.y - tb.b, act: __T.vis(t.querySelector('[data-r=act]'))}; })()""")
    ck('P8-人已经在制作：「返回制作」收起', pos and not pos['act'] and near(pos['top'], 8, 1), pos)
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
    ck('④-「去编排看」打开资源编排、选中那一行', p.ev("SHELL.state().ws === 'wb' && __T.q('#wbList [aria-selected=true]').dataset.id === 'kiku'"))
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
    ck('④-另存为：名称 + 名称下面一行「放进编排」', d and d['h'] == '另存为' and d['v'] == '金曜菊-B 副本' and d['lab'] == '放进编排' and d['a'] == ['取消', '保存'] and d['focus'], d)
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
    """⑥ 基础模板条目；资源编排页的线、面、颜色；搜索、筛选、空状态"""
    S = f'@{size}'
    p.fresh(size)
    logon(p)
    p.click('#shell .sh-pg[data-pg="wb"]')
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
    bad = [h for h in mint if h not in comp and not re.search(r'sh-pg.*::after|sh-ue.*::before|conn\.on.*::before|tabs-lg.*\.tab.*::after', h['el'])]
    ck(f'规范5-资源编排页薄荷只在：当前页下划线、UE 圆点、「效果 / 模板」下划线{S}', not bad, bad or mint)
    amb = [h for h in hits if h['c'] == 'w3' and 'sh-st' not in h['el']]
    ck(f'规范5-资源编排页琥珀只给「未进 UE」{S}', not amb, amb)
    red = [h for h in hits if h['c'] == 'e3' and not re.search(r'sh-st|sh-err', h['el'])]
    ck(f'规范5-资源编排页红色只给错误{S}', not red, red)
    fs = (12, 13, 15) if size == 1920 else (11, 12, 14)
    fo = p.ev("__T.fonts(['#wsWB'])")
    ck(f'规范1-资源编排页字号三级、字重 400 / 600{S}', all(x['fs'] in fs and x['fw'] in (400, 600) for x in fo), [x for x in fo if x['fs'] not in fs or x['fw'] not in (400, 600)][:5])
    ck(f'⑥-搜索框占位「名称、行名」{S}', p.ev("__T.q('#wbQ input').placeholder") == '名称、行名')
    p.shot(f'shell_3_wb_{size}.png')
    if size != 1920:
        return
    # 搜索、筛选、空状态
    p.pg.fill('#wbQ input', 'RFX_Comet')
    ck('⑥-搜索按名称、行名', p.ev("__T.qq('#wbList .lib-item').map(x => x.dataset.id).join()") == 'cs3c' and p.ev("__T.txt('#wbCount')") == '1 个')
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
    ck('⑥-「效果 / 模板」大号标签切换', p.ev("__T.q('#wbSub').hidden && __T.txt('#wbCount') === ''"))
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
                    r = p.ev("""(() => { const sh = __T.q('#shell'), c = __T.clip(['#shell']); const b = __T.rect('#shell .sh-brand'), g = __T.rect('#shell .sh-r');
                        return {sw: sh.scrollWidth - sh.clientWidth, cut: c.cut, out: c.out, ov: b.r > g.x, min: __T.qq('#shell .sh-fv.is-name').map(v => __T.rect(v).w)}; })()""")
                    combos += 1
                    ell_ok = all(w >= 30 for w in r['min'])
                    if r['sw'] > 0 or r['cut'] or r['out'] or r['ov'] or not ell_ok:
                        bad.append((ue, ex, bk, ws, r))
    ck(f'溢出-顶栏 {combos} 种状态组合不溢出、不截断{S}', not bad, bad[:3])
    p.ev("(() => { const S = SHELL.S; S.imp.writing = null; S.wb.busy = null; S.br = 'chrome'; S.ue = 'on'; S.exp = 'ok'; S.bak = 'none'; S.upd = 2; S.expName = 'FWL_Export'; SHELL.render(); })()")
    for ws, root in (('import', '#wsImport'), ('wb', '#wsWB')):
        p.ev(f"SHELL.ws('{ws}')")
        if ws == 'import':
            p.ev("(() => { SHELL.S.imp.sel = 'mang'; SHELL.render(); })()")
        r = p.ev(f"""(() => {{ const w = __T.q('{root}'), c = __T.clip(['{root} > .topbar', '{root} > .sh-left', '{root} .sh-mh']); return {{sw: w.scrollWidth - w.clientWidth, sh: w.scrollHeight - w.clientHeight, cut: c.cut, ell: c.ell, out: c.out,
            segs: __T.qq('{root} .sh-hs').map(s => s.scrollWidth - s.clientWidth)}}; }})()""")
        ck(f'溢出-{"资源交付" if ws == "import" else "资源编排"}不溢出、不截断{S}', r['sw'] <= 0 and r['sh'] <= 0 and not r['cut'] and not r['out'] and all(x <= 0 for x in r['segs']), r)
    if size == 1366:
        p.ev("SHELL.ws('import')")
        p.shot('shell_10_import_1366.png')
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
    p.ev("KIT.set('view', 'sheet')")
    p.pg.wait_for_timeout(300)
    s = p.ev("""(() => { const s = __T.q('#sheetShell'); return {n: s ? s.children.length : 0, bars: __T.qq('#sheetShell .sh-sbar').length, live: __T.qq('#sheetShell [data-shlive]').map(x => x.dataset.shlive),
        h: __T.qq('#sheetShell h2, #sheetShell h3').slice(0, 3).map(__T.txt), ws: __T.qq('#sheetShell .sh-pg').length}; })()""")
    ck('全表-外壳一节生成', s['n'] > 0 and s['bars'] >= 4 and s['ws'] >= 2, s)
    ck('全表-可操作实例（页面标签、预览、列表）', all(k in s['live'] for k in ('pg',)), s['live'])
    # 全表里点页面标签实例：切换下划线，不切真页面
    p.ev("__T.q('#sheetShell [data-shlive=pg] .sh-pg[data-pg=import]').scrollIntoView({block: 'center'})")
    p.click('#sheetShell [data-shlive="pg"] .sh-pg[data-pg="import"]')
    ck('全表-页面标签实例可点（只换样子）', p.ev("__T.q('#sheetShell [data-shlive=pg] .sh-pg[data-pg=import]').getAttribute('aria-pressed') === 'true' && SHELL.state().ws === 'baker'"))
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
    p.fresh(url=p.url)


# ================================================================= 文案自查表
HAN = re.compile(r'[\u4e00-\u9fff]')
WORD = re.compile(r'[A-Za-z0-9_][A-Za-z0-9_.:\\/\-]*')
PROPER = ['烟花工坊', 'FireWorksLab', 'ResourceFX', 'GPUECli', 'Chrome', 'Edge', 'UE', 'RTX', 'NVIDIA', 'GeForce']
LIM = {'按钮': ('≤ 4（汉字）', 4, 'han'), '菜单项': ('≤ 4（汉字）', 4, 'han'), '标签': ('≤ 4（汉字）', 4, 'han'), '表头': ('≤ 4（汉字）', 4, 'han'),
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
        ok = (not lim or n <= lim[1]) and not BAN.search(s) and not (c != '对话框正文' and s.endswith('。'))
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
    t0 = time.time()
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        p = P(br)
        steps = [('顶栏 1920', lambda: t_bar(p, 1920)), ('顶栏 1366', lambda: t_bar(p, 1366)), ('更新记录', lambda: t_version(p)),
                 ('两页 1920', lambda: t_pages(p, 1920)), ('两页 1366', lambda: t_pages(p, 1366)), ('资源交付', lambda: t_import(p)),
                 ('变灰与互锁', lambda: t_interlock(p)), ('文件夹与 UE', lambda: t_folders_ue(p)), ('其他浏览器', lambda: t_browser(p)),
                 ('导出', lambda: t_export(p)), ('另存与预览', lambda: t_save(p)), ('资源编排 1920', lambda: t_wb(p, 1920)), ('资源编排 1366', lambda: t_wb(p, 1366)),
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
