#!/usr/bin/env python3
"""烟花工坊 5.0 外壳检查（对话框9 · S，2026-11-05）

用法：python3 analysis/scripts/烟花工坊_外壳检查.py [--html tool/烟花工坊.html] [--out 截图目录] [--only 1920,1366,missing]

- file:// 打开 tool/烟花工坊.html，外网一律拦截（只放行 file: / data: / blob:）。
- 浏览器的「选文件夹」窗口自动化点不了：页面里换成一个内存里的假文件夹（名字「FWL_Export_测试」），其余都走真代码。
- 成品合的是真导入模块时：真模块查顶栏、空导出文件夹、导入变灰（云端连不上 UE）；列表 → 预检 → 导入的流程拿成品把导入模块那一段换成
  本机替身 tool/importer/dist/fwl-importer.mock.js 另存一份查（同一份烘焙器和外壳），用 __mock.scenario() 切 UE 断开。
- 查：顶栏三项（UE、显卡、变灰的「编排节目」+ 原因）和版本号 / 更新记录；状态栏左端导出、备份两个文件夹；首次导出没选文件夹先问；
  「资源交付」入口（v3.7 = 导出菜单第一项；4.9 界面 = 「导出素材包」旁边）打开资源交付页；替身数据下列表 → 预检 → 覆盖确认 → 导入 → 已导入；
  覆盖前先选备份位置；UE 断开 → 原地「重新连接」、导入变灰写原因 → 重新连上；导出钩子（67_delivery.js deliverResource → shellAfterExport → 导入模块 publish）→ 写进导出文件夹、
  自动打开资源交付并选中刚导出的包；导入模块缺失时的兜底（拿成品去掉导入模块那一段另存一份查）；1920 × 1080、1366 × 768 没有横向溢出、外壳文字不被截断。
- 截图写到 --out（默认 analysis/local/20261105_对话框9_烟花工坊外壳/，不进 Git），要亲眼看。
- 烘焙器的画面循环停掉（requestAnimationFrame 换成空函数，同合入门禁的导出比较）：软件渲染下画面循环一直占着，截图等不到帧；外壳不用它。
退出码：0 全过，1 有不过，2 脚本自己出错。
"""
import argparse, json, re, sys, tempfile, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARGS = ['--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
        '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
FAKE_DIR = r"""(() => {
  const mk = name => { const files = new Map(), dirs = new Map(); return {
    kind: 'directory', name, __files: files,
    async queryPermission() { return 'granted'; }, async requestPermission() { return 'granted'; },
    async getFileHandle(n, o) {
      if (!files.has(n)) { if (!(o && o.create)) throw new DOMException('没有这个文件', 'NotFoundError'); files.set(n, {blob: new Blob([])}); }
      const ent = files.get(n);
      return {kind: 'file', name: n, async createWritable() { const parts = []; return {async write(d) { parts.push(d); }, async close() { ent.blob = new Blob(parts); }}; },
              async getFile() { return new File([ent.blob], n); }};
    },
    async getDirectoryHandle(n, o) { if (!dirs.has(n)) { if (!(o && o.create)) throw new DOMException('没有这个文件夹', 'NotFoundError'); dirs.set(n, mk(n)); } return dirs.get(n); },
    async removeEntry(n) { files.delete(n); dirs.delete(n); }, async isSameEntry(x) { return x === this; },
    async *values() {}, async *entries() {}, async *keys() {}
  }; };
  window.__fakeDir = mk('FWL_Export_测试');
  window.__pickCount = 0;
  window.showDirectoryPicker = async () => { window.__pickCount++; return window.__fakeDir; };
})();"""
# 外壳文字被截断 / 页面横向溢出（只看外壳自己的部件）
OVERFLOW_JS = r"""() => {
  const roots = ['#shell', '#stShell', '#shFbSt', '#wsImport', '.sh-delivb'].map(s => document.querySelector(s)).filter(e => e && e.getClientRects().length);
  const cut = [], ell = [];
  const own = e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  for (const r of roots) for (const e of [r, ...r.querySelectorAll('*')]) {
    if (!e.getClientRects().length) continue;
    const s = getComputedStyle(e);
    if ((own(e) || e.matches('button')) && e.scrollWidth > e.clientWidth + 1 && s.overflowX !== 'visible')
      (s.textOverflow === 'ellipsis' ? ell : cut).push((e.id ? '#' + e.id : e.className || e.tagName) + '「' + e.textContent.trim().slice(0, 24) + '」');
  }
  const sh = document.querySelector('#shell'), r = sh && sh.getBoundingClientRect();
  return {docW: document.documentElement.scrollWidth, vw: innerWidth, docH: document.documentElement.scrollHeight, vh: innerHeight,
          shellOver: sh ? sh.scrollWidth - sh.clientWidth : -1, shellRight: r ? Math.round(r.right) : -1, cut, ell};
}"""


class Run:
    def __init__(self, out):
        self.out = out; self.rows = []; self.notes = []

    def ck(self, cid, ok, detail=''):
        self.rows.append({'id': cid, 'ok': bool(ok), 'detail': detail})
        print(('✅' if ok else '❌'), cid, ('— ' + detail) if detail else '', flush=True)
        return ok

    def note(self, s):
        self.notes.append(s); print('  ·', s, flush=True)


def open_page(b, url, w, h, fake=True):
    pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1, accept_downloads=False)
    pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith(('file:', 'data:', 'blob:')) else r.abort())
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script('window.requestAnimationFrame = () => 0;')
    if fake: pg.add_init_script(FAKE_DIR)
    t = time.time()
    pg.goto(url, wait_until='commit', timeout=0)
    pg.wait_for_function('window.SHELL && window.__fw', timeout=0, polling=500)
    pg.wait_for_timeout(1200)
    print(f'  · 打开 {w}×{h}：{time.time() - t:.0f} s', flush=True)
    return pg, errs


def shot(R, pg, name):
    pg.wait_for_timeout(300)
    try:
        pg.screenshot(path=str(R.out / f'{name}.png'), timeout=60000)
    except Exception as e:
        R.note(f'截图 {name} 没成：{str(e).splitlines()[0]}')


def wait(pg, js, ms=15000):
    try:
        pg.wait_for_function(js, timeout=ms, polling=150); return True
    except Exception:
        return False


def tip(pg, sel):
    return pg.evaluate(f"() => {{ const e = document.querySelector({json.dumps(sel)}); return e ? (e.dataset.tip || e.title || '') : null; }}")


def click(pg, sel, force=False):
    pg.locator(sel).first.click(timeout=8000, force=force)


def t_bar(R, pg, kind, sz):
    S = f'[{sz}] '
    b = pg.evaluate("""() => { const q = s => document.querySelector(s), r = e => e && e.getBoundingClientRect();
      const ue = q('#shell .sh-ue'), gpu = q('#shell .sh-gpu'), wb = q('#shell .sh-pg[data-pg="wb"]'), ver = q('#shell .sh-ver');
      return {brand: (q('#shell .sh-brand b') || {}).textContent, ver: ver && ver.textContent, ue: ue && ue.textContent.replace(/\\s+/g, ' ').trim(), ueTip: ue && (ue.dataset.tip || ''),
        gpu: gpu && gpu.textContent.replace(/\\s+/g, ' ').trim(), wb: wb && wb.textContent.trim(), wbDis: wb && wb.getAttribute('aria-disabled'), wbTip: wb && wb.dataset.tip,
        x: [ue, gpu, wb].map(e => e ? Math.round(r(e).left) : -1), top: q('#shell') ? Math.round(r(q('#shell')).top) : -1, h: q('#shell') ? Math.round(r(q('#shell')).height) : -1}; }""")
    R.ck(S + '顶栏：产品名和版本号', b['brand'] == '烟花工坊' and (b['ver'] or '').startswith('FireWorksLab 5.0.0'), f"{b['brand']}｜{b['ver']}｜顶 {b['top']}、高 {b['h']}")
    R.ck(S + '顶栏：UE 状态', bool(b['ue']) and b['ue'].startswith('UE'), b['ue'] or '没有')
    if kind in ('mock', 'shim'):
        R.ck(S + '顶栏：替身时 UE 悬停写「导入模块：替身」', '导入模块：替身' in (b['ueTip'] or ''), b['ueTip'])
    R.ck(S + '顶栏：显卡（真实型号，取不到写「未知」）', bool(b['gpu']) and b['gpu'].startswith('显卡'), b['gpu'] or '没有')
    R.ck(S + '顶栏：「编排节目」变灰、悬停写原因', b['wbDis'] == 'true' and b['wbTip'] == '编排节目下一版接入', f"{b['wb']}｜{b['wbDis']}｜{b['wbTip']}")
    vw = pg.evaluate('innerWidth')
    R.ck(S + '顶栏：右侧顺序 UE ｜ 显卡 ｜ 编排节目，靠右', b['x'][0] < b['x'][1] < b['x'][2] and min(b['x']) >= vw * 0.5, str(b['x']))


def t_folders(R, pg, sz):
    f = pg.evaluate("""() => [...document.querySelectorAll('#stShell .sh-fold')].map(e => { const r = e.getBoundingClientRect(); return {k: e.dataset.fk, st: e.dataset.st, t: e.textContent.replace(/\\s+/g, ' ').trim(), left: Math.round(r.left), bottom: Math.round(r.bottom)}; })""")
    vh = pg.evaluate('innerHeight')
    ok = [x['k'] for x in f] == ['exp', 'bak'] and all(x['left'] < 400 and x['bottom'] >= vh - 40 for x in f)
    R.ck(f'[{sz}] 状态栏左端：导出、备份两个文件夹', ok, '；'.join(f"{x['t']}（{x['st']}）@{x['left']},{x['bottom']}" for x in f) or '没有')


def t_overflow(R, pg, sz):
    o = pg.evaluate(OVERFLOW_JS)
    R.ck(f'[{sz}] 没有横向溢出', o['docW'] <= o['vw'] and o['shellOver'] <= 0 and o['shellRight'] <= o['vw'], f"页面宽 {o['docW']} / 窗口 {o['vw']}，顶栏多出 {o['shellOver']}")
    R.ck(f'[{sz}] 外壳文字没有被截断（省略号的除外）', not o['cut'], '；'.join(o['cut'][:6]) + (f"（省略号 {len(o['ell'])} 处）" if o['ell'] else ''))


def find_deliv_entry(R, pg):
    """v3.7：「导出 ▾」菜单第一项；4.9 界面：「导出素材包」旁边的按钮（导出按钮在资产栏里，要先打开一个效果才出来）"""
    vis = "(() => { const b = document.querySelector('#abExportPack'); return !!(b && b.getClientRects().length); })()"
    if not pg.evaluate(vis):
        pg.evaluate("() => { try { openType(Object.keys(TYPES)[0]); } catch (e) { } }")
        wait(pg, vis, 20000)
    if pg.evaluate("() => !!document.querySelector('#expBtn')"):
        click(pg, '#expMenuBtn' if pg.evaluate("!!document.querySelector('#expMenuBtn')") else '#expBtn .btn:last-child')
        ok = wait(pg, "(() => { const m = document.querySelector('.menu .mi[data-exp]'); return !!(m && m.getClientRects().length); })()", 4000)
        first = pg.evaluate("() => { const m = document.querySelector('.menu'); const it = m && m.querySelector('.mi'); return it ? it.dataset.exp || it.textContent.trim() : ''; }")
        R.ck('「导出 ▾」菜单第一项是「资源交付」', ok and first == 'deliv', first)
        return '.menu .mi[data-exp="deliv"]'
    if not pg.evaluate("() => { const b = document.querySelector('[data-exp=\"deliv\"]'); return !!(b && b.getClientRects().length); }"):
        pg.evaluate("() => { try { openType(Object.keys(TYPES)[0]); } catch (e) { } }")
        wait(pg, "(() => { const b = document.querySelector('[data-exp=\"deliv\"]'); return !!(b && b.getClientRects().length); })()", 20000)
    pos = pg.evaluate("""() => { const b = document.querySelector('[data-exp="deliv"]'), x = document.querySelector('#abExportPack');
        return {vis: !!(b && b.getClientRects().length), after: !!(b && x && x.nextElementSibling === b), t: b ? b.textContent.trim() : ''}; }""")
    R.ck('4.9 界面：「资源交付」插在「导出素材包」旁边', pos['vis'] and pos['after'], json.dumps(pos, ensure_ascii=False))
    return '[data-exp="deliv"]' if pos['vis'] else None


def t_main(R, b, url, kind):
    pg, errs = open_page(b, url, 1920, 1080)
    t_bar(R, pg, kind, 1920)
    t_folders(R, pg, 1920)
    shot(R, pg, '01_制作_1920')
    # 版本号 → 更新记录
    click(pg, '#shell .sh-ver')
    ok = wait(pg, "document.querySelector('.menu.sh-about')", 4000)
    m = pg.evaluate("() => { const m = document.querySelector('.menu.sh-about'); return m ? m.innerText : ''; }")
    R.ck('版本号打开更新记录（新内容、各部分版本号）', ok and '制作' in m and '烘焙器' in m and '资源交付' in m, m.replace('\n', ' ')[:120])
    shot(R, pg, '02_更新记录')
    pg.locator('.menu.sh-about [data-mi="all"]').click()
    R.ck('「全部记录」对话框', wait(pg, "document.querySelector('.dialog[data-dlg=\"upd\"] .sh-updl h3')", 4000))
    pg.keyboard.press('Escape')
    # 「编排节目」点了不换页，只出原因
    click(pg, '#shell .sh-pg[data-pg="wb"]', force=True)
    R.ck('点变灰的「编排节目」只出原因', pg.evaluate("SHELL.state().ws") == 'baker' and wait(pg, "[...document.querySelectorAll('.sh-hint')].some(h => h.textContent.includes('下一版'))", 3000))
    # 首次导出：没选导出文件夹先问；取消就不导出
    ent = find_deliv_entry(R, pg)
    exp_btn = '#expBtn [data-act="export"]' if pg.evaluate("() => !!document.querySelector('#expBtn [data-act=\"export\"]')") else '#abExportPack'
    if pg.evaluate(f"() => {{ const b = document.querySelector({json.dumps(exp_btn)}); return !!(b && b.getClientRects().length && !b.disabled); }}"):
        click(pg, exp_btn)
        ok = wait(pg, "document.querySelector('.dialog[data-dlg=\"exp\"]')", 4000)
        shot(R, pg, '03_首次导出选文件夹')
        pg.locator('.dialog[data-dlg="exp"] [data-r="0"]').click()
        R.ck('首次导出没选文件夹：先问「选择导出文件夹」，取消就不导出', ok and wait(pg, "[...document.querySelectorAll('.sh-hint')].some(h => h.textContent.includes('未导出'))", 3000))
    else:
        R.note(f'{exp_btn} 不可点（没打开效果或在烘焙），首次导出对话框没查')
    # 状态栏点「导出 未选」→ 选文件夹（假文件夹）
    click(pg, '#stShell [data-fk="exp"]')
    R.ck('状态栏「导出 未选」点了选文件夹', wait(pg, "SHELL.state().exp === 'ok' && document.querySelector('#stShell [data-fk=\"exp\"]').textContent.includes('FWL_Export_测试')", 5000),
         pg.evaluate("document.querySelector('#stShell [data-fk=\"exp\"]').textContent"))
    # 资源交付：入口 → 页面 → 列表
    if ent:
        if ent.startswith('.menu') and not pg.evaluate(f"() => {{ const b = document.querySelector({json.dumps(ent)}); return !!(b && b.getClientRects().length); }}"):
            click(pg, '#expMenuBtn' if pg.evaluate("!!document.querySelector('#expMenuBtn')") else '#expBtn .btn:last-child')
            wait(pg, f"(() => {{ const b = document.querySelector({json.dumps(ent)}); return !!(b && b.getClientRects().length); }})()", 4000)
        pg.locator(ent).first.click()
    else:
        R.note('入口不可见，改从状态栏导出文件夹菜单「资源交付」打开')
        click(pg, '#stShell [data-fk="exp"]'); pg.locator('.menu [data-mi="deliv"]').click()
    R.ck('入口打开资源交付页', wait(pg, "SHELL.state().ws === 'import' && !document.querySelector('#wsImport').hidden", 5000))
    R.ck('资源交付：替身数据列出素材包', wait(pg, "document.querySelectorAll('#impList .sh-pkg').length >= 1", 10000),
         pg.evaluate("[...document.querySelectorAll('#impList .sh-pkg .li-n')].map(e => e.textContent).join('、')"))
    n = pg.evaluate("document.querySelector('#expDelivN') ? document.querySelector('#expDelivN').textContent : ''")
    R.ck('「资源交付」计数 = 待导入的包数', n == str(pg.evaluate("SHELL.S.imp.pkgs.filter(p => p.state !== '已导入').length")), n)
    # 选一个要覆盖的包：预检 → 导入
    pid = pg.evaluate("(SHELL.S.imp.pkgs.find(p => p.state === '有新版本') || SHELL.S.imp.pkgs.find(p => p.state !== '已导入') || SHELL.S.imp.pkgs[0]).id")
    pg.locator(f'#impList [data-id="{pid}"]').click()
    ok = wait(pg, f"(() => {{ const r = SHELL.S.imp.pre[{json.dumps(pid)}]; return r && !r.loading; }})()", 8000)
    det = pg.evaluate("() => { const m = document.querySelector('#impMC'); return {t: m.innerText.slice(0, 400), rows: m.querySelectorAll('.sh-at tbody tr').length, img: !!m.querySelector('.sh-pvi')}; }")
    R.ck('资源交付：选中包显示回放缩略图位、修订、检查、资产清单', ok and det['img'] and '修订' in det['t'] and '检查' in det['t'] and det['rows'] > 0, f"{det['rows']} 行资产")
    go_tip = tip(pg, '#impGo')
    R.ck('预检通过后「导入」可点', not pg.evaluate("document.querySelector('#impGo').getAttribute('aria-disabled') === 'true'"), go_tip or '')
    shot(R, pg, '04_资源交付_选中包_1920')
    t_overflow(R, pg, 1920)
    pg.evaluate("""() => { window.__toasts = []; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('toast')) window.__toasts.push(n.textContent); }))).observe(document.body, {childList: true, subtree: true}); }""")
    click(pg, '#impGo')
    ov = wait(pg, "document.querySelector('.dialog[data-dlg=\"ov\"]')", 3000)
    if ov:
        shot(R, pg, '05_覆盖确认')
        pg.locator('.dialog[data-dlg="ov"] [data-r="1"]').click()
        bk = wait(pg, "document.querySelector('.dialog[data-dlg=\"bak\"]')", 3000)
        if bk: shot(R, pg, '05b_选备份位置')
        R.ck('有覆盖：先确认，再选备份位置（不能在 UE 工程里）', bk and '不能在 UE 工程里' in pg.evaluate("document.querySelector('.dialog[data-dlg=\"bak\"]').innerText"))
        if bk: pg.locator('.dialog[data-dlg="bak"] [data-r="1"]').click()
    else:
        R.note('选中的包没有要覆盖的资产，覆盖确认和备份位置没查')
    saw = wait(pg, "SHELL.state().ue.k === 'write'", 4000)
    if saw: shot(R, pg, '06_导入中')
    done = wait(pg, "!SHELL.S.imp.writing && window.__toasts.some(t => t.includes('已写入'))", 30000)   # 提示条 12 秒后自己收起，按出现过的记
    st = pg.evaluate(f"(SHELL.S.imp.pkgs.find(p => p.id === {json.dumps(pid)}) || {{}}).state")
    R.ck('导入：写入中进度 → 「已写入 N 个资产」→ 包变「已导入」', saw and done and st == '已导入', f'写入中 {saw}，完成 {done}，状态 {st}')
    # UE 断开 → 原地重新连接；导入变灰写原因
    if kind != 'mock':
        R.note('不是替身：UE 断开 / 重新连接、导出钩子两项要替身，跳过'); pg.close(); return
    pg.evaluate("FWLImporter.__mock.scenario('ue-down')")
    ok = wait(pg, "!!document.querySelector('#shell .sh-retry') && document.querySelector('#shell .sh-ue').textContent.includes('未连接')", 6000)
    pg.wait_for_timeout(400)
    why = tip(pg, '#impGo')
    R.ck('UE 断开：顶栏原地「UE 未连接」+「重新连接」，导入变灰写原因', ok and 'UE 未连接' in (why or '') and pg.evaluate("!document.querySelector('#impWhy').hidden"), why or '')
    shot(R, pg, '07_UE断开')
    click(pg, '#shell .sh-retry')
    tried = wait(pg, "SHELL.state().ue.k === 'wait'", 3000)
    pg.evaluate("FWLImporter.__mock.scenario('default')")
    R.ck('「重新连接」先试一次（连接中），UE 回来后自动变「已连接」', tried and wait(pg, "SHELL.state().ue.k === 'on' && document.querySelector('#shell .sh-ue').textContent.includes('已连接')", 6000))
    # 钩子不改导出内容（4.9.132 起改了去向）：选好导出文件夹（shellWillPublish）时 ZIP 方式不再下载，同一个 blob 交给外壳写进文件夹；
    #   没选 / 外壳不在时照旧 download 同一个 blob、同名；目录方式照旧交给 DeliveryWorkspace.publish，返回值照旧
    eq = pg.evaluate("""async () => {
      const blob = new Blob(['PK-eq']), meta = {a: 1}, d0 = window.download, p0 = DeliveryWorkspace.publish, h0 = window.shellAfterExport, w0 = window.shellWillPublish;
      let z = null, d = null, hi = null; const rc = {receipt: 1}, tick = () => new Promise(r => setTimeout(r, 0));
      window.shellAfterExport = i => { hi = {downloaded: i.downloaded, same: i.blob === blob, name: i.name}; };
      window.download = (b, n) => { z = [b === blob, n]; return 'dl'; };
      DeliveryWorkspace.publish = async (b, n, m) => { d = [b === blob, n, m === meta]; return rc; };
      try {
        window.shellWillPublish = () => true; const r0 = await deliverResource(blob, 'eq0.zip', meta, 'zip'); await tick(); const via = {dl: z, hook: hi, ret: r0 === undefined};
        z = null; hi = null; window.shellWillPublish = () => false; const r1 = await deliverResource(blob, 'eq.zip', meta, 'zip'); await tick(); const plain = {dl: z, hook: hi, ret: r1};
        const r2 = await deliverResource(blob, 'eq2.zip', meta, 'directory');
        return {via, plain, dir: d, dirRet: r2 === rc};
      } finally { window.download = d0; DeliveryWorkspace.publish = p0; window.shellAfterExport = h0; window.shellWillPublish = w0; } }""")
    R.ck('选了导出文件夹：不再多下载一份 ZIP，同一个 blob 交给外壳写进文件夹', eq['via']['dl'] is None and eq['via']['hook'] == {'downloaded': False, 'same': True, 'name': 'eq0.zip'} and eq['via']['ret'], json.dumps(eq['via'], ensure_ascii=False))
    R.ck('没选导出文件夹：照旧下载同一个 ZIP；目录方式照旧，返回值照旧', eq['plain']['dl'] == [True, 'eq.zip'] and eq['plain']['ret'] == 'dl' and eq['plain']['hook']['downloaded'] is True and eq['dir'] == [True, 'eq2.zip', True] and eq['dirRet'], json.dumps({k: eq[k] for k in ('plain', 'dir', 'dirRet')}, ensure_ascii=False))
    # 导出钩子：deliverResource（67_delivery.js）→ shellAfterExport → 导入模块 publish → 打开资源交付、选中刚导出的包
    pg.evaluate("SHELL.ws('baker')")
    pg.evaluate("deliverResource(new Blob(['PK-shell-test']), '外壳检查导出_PC.zip', {}, 'zip')")
    ok = wait(pg, "SHELL.state().ws === 'import' && (SHELL.S.imp.pkgs || []).some(p => p.name === '外壳检查导出_PC') && SHELL.S.imp.sel === (SHELL.S.imp.pkgs.find(p => p.name === '外壳检查导出_PC') || {}).id", 10000)
    just = pg.evaluate("document.querySelector('#impList .sh-pkg.is-sel .li-s') ? document.querySelector('#impList .sh-pkg.is-sel .li-s').textContent : ''")
    to = pg.evaluate("[...document.querySelectorAll('.toast')].map(t => t.textContent).join('｜')")
    R.ck('导出钩子：交给导入模块 publish 写进导出文件夹，自动打开资源交付并选中刚导出的包', ok and '刚导出' in just and '写进 FWL_Export_测试' in to, f'{just}；{to}')
    shot(R, pg, '08_导出后自动打开资源交付')
    # 返回制作
    click(pg, '#wsImport [data-sh="back"]')
    R.ck('「返回制作」回到制作区', wait(pg, "SHELL.state().ws === 'baker' && document.querySelector('#wsImport').hidden", 3000))
    R.ck('页面没有脚本错误（1920）', not errs, '；'.join(errs[:3]))
    pg.close()


def t_1366(R, b, url, kind):
    pg, errs = open_page(b, url, 1366, 768)
    t_bar(R, pg, kind, 1366)
    t_folders(R, pg, 1366)
    t_overflow(R, pg, 1366)
    shot(R, pg, '11_制作_1366')
    click(pg, '#stShell [data-fk="exp"]')
    wait(pg, "SHELL.state().exp === 'ok'", 5000)
    pg.evaluate('SHELL.openDeliv()')
    wait(pg, "document.querySelectorAll('#impList .sh-pkg').length >= 1 && SHELL.S.imp.sel && SHELL.S.imp.pre[SHELL.S.imp.sel] && !SHELL.S.imp.pre[SHELL.S.imp.sel].loading", 10000)
    t_overflow(R, pg, '1366 资源交付')
    shot(R, pg, '12_资源交付_1366')
    R.ck('页面没有脚本错误（1366）', not errs, '；'.join(errs[:3]))
    pg.close()


def t_real(R, b, url):
    """真导入模块：云端连不上 UE。查顶栏不写「替身」、空的新导出文件夹列 0 个包、导入变灰写原因"""
    pg, errs = open_page(b, url, 1920, 1080)
    ue = pg.evaluate("() => { const e = document.querySelector('#shell .sh-ue'); return e ? [e.textContent.replace(/\\s+/g, ' ').trim(), e.dataset.tip || ''] : null; }")
    R.ck('真模块：顶栏 UE 状态来自导入模块，悬停不写「替身」', bool(ue) and ue[0].startswith('UE') and '替身' not in ue[1], json.dumps(ue, ensure_ascii=False))
    click(pg, '#stShell [data-fk="exp"]'); wait(pg, "SHELL.state().exp === 'ok'", 5000)
    pg.evaluate('SHELL.openDeliv()')
    ok = wait(pg, "!SHELL.S.imp.loading && (Array.isArray(SHELL.S.imp.pkgs) || SHELL.S.imp.err)", 15000)
    st = pg.evaluate("({n: (SHELL.S.imp.pkgs || []).length, err: SHELL.S.imp.err, list: document.querySelector('#impList').innerText, go: document.querySelector('#impGo').dataset.tip || ''})")
    R.ck('真模块：新导出文件夹读出 0 个包，导入变灰写原因', ok and st['n'] == 0 and not st['err'] and '还没有素材包' in st['list'] and bool(st['go']), json.dumps(st, ensure_ascii=False))
    shot(R, pg, '31_真模块_空导出文件夹')
    R.ck('页面没有脚本错误（真模块）', not errs, '；'.join(errs[:3]))
    pg.close()


def swap_importer(html, code, kind):
    src = html.read_text(encoding='utf-8')
    rpl = f"<script>window.__FWL_IMPORTER_KIND = '{kind}';</script>" + (('<script>(function () {\n' + code.replace('</script', '<\\/script') + '\n}).call(window);</script>') if code else '')
    return re.subn(r'<!-- FWL-IMPORTER-BEGIN [\s\S]*?<!-- FWL-IMPORTER-END -->', lambda m: rpl, src)


def t_missing(R, b, html):
    new, n = swap_importer(html, '', 'none')
    if not n:
        R.ck('导入模块缺失：成品里找得到导入模块那一段', False); return
    with tempfile.TemporaryDirectory() as td:
        p = Path(td) / '烟花工坊_无导入模块.html'; p.write_text(new, encoding='utf-8')
        pg, errs = open_page(b, p.as_uri() + '?fast', 1920, 1080)
        ue = pg.evaluate("() => { const e = document.querySelector('#shell .sh-ue'); return e ? [e.textContent.replace(/\\s+/g, ' ').trim(), e.dataset.tip] : null; }")
        R.ck('导入模块缺失：顶栏「UE 不可用」，悬停写「导入模块未加载」', bool(ue) and '不可用' in ue[0] and '导入模块未加载' in (ue[1] or ''), json.dumps(ue, ensure_ascii=False))
        click(pg, '#stShell [data-fk="exp"]'); wait(pg, "SHELL.state().exp === 'ok'", 5000)
        pg.evaluate('SHELL.openDeliv()'); pg.wait_for_timeout(600)
        mc = pg.evaluate("document.querySelector('#impMC').innerText")
        R.ck('导入模块缺失：资源交付写明「导入模块未加载」，「导入」变灰写原因', '导入模块未加载' in mc and tip(pg, '#impGo') == '导入模块未加载'
             and pg.evaluate("document.querySelector('#impGo').getAttribute('aria-disabled') === 'true'"), mc.replace('\n', ' ')[:80])
        shot(R, pg, '21_导入模块缺失')
        pg.evaluate("SHELL.ws('baker')")
        dis = pg.evaluate("() => { const b = document.querySelector('#expBtn [data-act=\"export\"]') || document.querySelector('#abExportPack'); return b ? [b.getAttribute('aria-disabled'), b.classList.contains('is-disabled')] : null; }")
        R.ck('导入模块缺失：导出不受影响（外壳不把导出变灰）', not dis or (dis[0] != 'true' and not dis[1]), json.dumps(dis))
        R.ck('页面没有脚本错误（导入模块缺失）', not errs, '；'.join(errs[:3]))
        pg.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--html', default=str(ROOT / 'tool' / '烟花工坊.html'))
    ap.add_argument('--out', default=str(ROOT / 'analysis' / 'local' / '20261105_对话框9_烟花工坊外壳'))
    ap.add_argument('--only', default='real,1920,1366,missing')
    a = ap.parse_args()
    html = Path(a.html).resolve(); out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    if not html.exists():
        print('没有成品：', html, '（先跑 python3 tool/build.py）'); return 2
    kind = (re.search(r'FWL-IMPORTER-BEGIN (\w+)', html.read_text(encoding='utf-8')) or [None, '?'])[1]
    print(f'烟花工坊外壳检查：{html.relative_to(ROOT) if ROOT in html.parents else html}；导入模块 {kind}；截图 {out}', flush=True)
    R = Run(out)
    from playwright.sync_api import sync_playwright
    only = set(a.only.split(','))
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        td = tempfile.TemporaryDirectory()
        try:
            url, fk = html.as_uri() + '?fast', kind
            mock = ROOT / 'tool' / 'importer' / 'dist' / 'fwl-importer.mock.js'
            if kind == 'real':
                if 'real' in only: t_real(R, b, url)
                if mock.exists():
                    new, n = swap_importer(html, mock.read_text(encoding='utf-8'), 'mock')
                    mp = Path(td.name) / '烟花工坊_替身.html'; mp.write_text(new, encoding='utf-8')
                    url, fk = mp.as_uri() + '?fast', 'mock'
                    R.note('流程项用替身：成品里的真导入模块换成 fwl-importer.mock.js 另存一份')
            if '1920' in only: t_main(R, b, url, fk)
            if '1366' in only: t_1366(R, b, url, fk)
            if 'missing' in only: t_missing(R, b, html)
        finally:
            b.close(); td.cleanup()
    bad = [r for r in R.rows if not r['ok']]
    (out / '结果.json').write_text(json.dumps({'html': str(html), 'importer': kind, 'rows': R.rows, 'notes': R.notes}, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"\n{len(R.rows) - len(bad)} / {len(R.rows)} 通过" + (f"；不过：{'、'.join(r['id'] for r in bad)}" if bad else ''))
    return 1 if bad else 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except SystemExit:
        raise
    except Exception as e:
        import traceback; traceback.print_exc(); sys.exit(2)
