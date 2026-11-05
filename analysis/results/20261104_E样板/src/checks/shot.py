"""E 样板 v3.4 制作区：截图 + 溢出探针（规范 v3 第 13 节：1920 / 1366、金曜菊-B / 仙女棒、序列贴图、导出浮层都要截图逐张看）。

先合成：python3 ../build.py /tmp/E_A.html
再截图：python3 shot.py [/tmp/E_A.html] [编号…] [--hide-sample]      截图写到 /tmp/E_A_shots/（不进仓库）；编号 1–7，不给就全截
7（v3.4）：悬停态合成一张——结构树层行、参数行、模块标题、导出范围行、效果库标签行用 .is-hover 强制出悬停样子，检查器加 .is-scrolling 出滚动条
--hide-sample：把样板控制条（左下角那个「样板」小按钮）藏起来——给评委用的截图都加这个（v3.3 第 15 条）。
不加时截图里留着收起的小按钮，探针另外核对它不盖检查器、不盖任何产品控件。
探针：文字被截断（overflow 隐藏且放不下、又没有 title 全名）、字号小于下限（1920 下 12 px、1366 下 11 px）、
     超出主屏、条带里的控件被裁掉、文档宽高不等于视口；另外打印页面错误和控制台报错。外网请求一律拦截。
一次只开一个浏览器进程。
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ARGS = [a for a in sys.argv[1:] if a.endswith('.html')]
NAMES = [a for a in sys.argv[1:] if not a.endswith('.html') and not a.startswith('--')]
HIDE = '--hide-sample' in sys.argv[1:]
URL = Path(ARGS[0] if ARGS else '/tmp/E_A.html').resolve().as_uri()
OUT = Path('/tmp/E_A_shots')
OUT.mkdir(parents=True, exist_ok=True)

PROBE = """(minFs) => {
  const app = document.getElementById('app'), A = app.getBoundingClientRect();
  const over = [], small = new Set(), out = [], clipped = [];
  for (const el of document.querySelectorAll('#wsBaker *, #ovlApp *')) {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (own) {
      const fs = parseFloat(cs.fontSize); if (fs < minFs) small.add(String(el.className.baseVal ?? el.className) + ' ' + fs + ' ' + el.textContent.trim().slice(0, 12));
      if (el.scrollWidth > el.clientWidth + 1 && ['hidden', 'clip'].includes(cs.overflowX) && !el.hasAttribute('title')) over.push(String(el.className.baseVal ?? el.className) + ' | ' + el.textContent.trim().slice(0, 30));
      if (!el.closest('.ovl') && (r.right > A.right + 1 || r.bottom > A.bottom + 1) && !el.closest('.tl,.pbody,.tree,.lib-list,.tpl-grid,.stage')) out.push(String(el.className.baseVal ?? el.className) + ' | ' + el.textContent.trim().slice(0, 20));
    }
  }
  for (const bar of document.querySelectorAll('#wsBaker .topbar .tcol, #wsBaker .transport, #wsBaker .insp-h, #wsBaker .insp-tools, #wsBaker .lib-meta, #wsBaker .status, #wsBaker .tree-foot')) {
    const B = bar.getBoundingClientRect();
    for (const c of bar.querySelectorAll('button, .seg, select, span, label')) {
      const r = c.getBoundingClientRect(); if (!r.width || getComputedStyle(c).visibility === 'hidden') continue;
      if (r.right > B.right + 1 || r.left < B.left - 1) clipped.push((bar.id || bar.className) + ' > ' + String(c.className.baseVal ?? c.className) + ' ' + c.textContent.trim().slice(0, 12));
    }
  }
  /* 样板控制条（收起时）：只许是一个小按钮，不盖检查器、不盖任何产品控件 */
  const kit = [], kb = document.getElementById('sampleBar'), kt = document.getElementById('kitTog');
  if (kb && getComputedStyle(kb).display !== 'none' && getComputedStyle(kb).visibility !== 'hidden' && !kb.classList.contains('is-open')) {
    const K = kt.getBoundingClientRect(), hit = r => !(r.right <= K.left || r.left >= K.right || r.bottom <= K.top || r.top >= K.bottom);
    if (K.width > 64 || K.height > 24) kit.push('按钮太大 ' + Math.round(K.width) + '×' + Math.round(K.height));
    if (hit(document.getElementById('insp').getBoundingClientRect())) kit.push('盖住检查器');
    for (const c of document.querySelectorAll('#wsBaker button, #wsBaker input, #wsBaker select, #wsBaker .seg, #shell button')) { const r = c.getBoundingClientRect(); if (r.width && hit(r)) kit.push('盖住 ' + (c.id || c.dataset.act || c.textContent.trim().slice(0, 8))); }
  }
  return {app: [A.width, A.height], doc: [document.documentElement.scrollWidth, document.documentElement.scrollHeight], over: over.slice(0, 20), small: [...small].slice(0, 20), out: out.slice(0, 20), clipped: clipped.slice(0, 20), kit};
}"""
MSGS = []


def page_for(b, w, h):
    pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
    pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith(('file:', 'data:')) else r.abort())
    pg.on('pageerror', lambda e: MSGS.append(f'pageerror: {e}'))
    pg.on('console', lambda m: m.type == 'error' and 'net::ERR_FAILED' not in m.text and MSGS.append('console: ' + m.text))
    pg.goto(URL, wait_until='load')
    if HIDE:
        pg.add_style_tag(content='#sampleBar{display:none!important}')
    pg.wait_for_timeout(300)
    if w == 1366:
        pg.evaluate("KIT.set('size','1366')")
        pg.wait_for_timeout(200)
    return pg


def clip(pg, w, h, name, probe=True):
    pg.wait_for_timeout(200)
    pg.screenshot(path=str(OUT / name), clip={'x': 0, 'y': 0, 'width': w, 'height': h})
    if probe:
        info = pg.evaluate(PROBE, 11 if w == 1366 else 12)
        bad = {k: v for k, v in info.items() if k in ('over', 'small', 'out', 'clipped', 'kit') and v}
        ok = info['doc'] == [w, h] and not bad
        print(name, '探针通过' if ok else '探针：' + json.dumps({**bad, 'doc': info['doc']}, ensure_ascii=False))
    else:
        print(name)


def main():
    want = lambda n: not NAMES or n in NAMES
    with sync_playwright() as p:
        b = p.chromium.launch()
        if want('1'):
            pg = page_for(b, 1920, 1080); clip(pg, 1920, 1080, 'shot_1_main.png'); pg.close()
        if want('2'):
            pg = page_for(b, 1920, 1080); pg.evaluate("KIT.set('scene','spk')"); clip(pg, 1920, 1080, 'shot_2_sparkler.png'); pg.close()
        if want('3'):
            pg = page_for(b, 1920, 1080); pg.evaluate("KIT.mode('序列贴图')"); clip(pg, 1920, 1080, 'shot_3_delivery.png')
            pg.evaluate("KIT.set('scene','spk'); KIT.mode('序列贴图')"); clip(pg, 1920, 1080, 'shot_3b_delivery_spk.png'); pg.close()
        if want('4'):
            pg = page_for(b, 1366, 768); clip(pg, 1366, 768, 'shot_4_1366.png')
            pg.evaluate("KIT.set('scene','spk')"); clip(pg, 1366, 768, 'shot_4b_1366_spk.png')
            pg.evaluate("KIT.set('scene','kiku'); KIT.mode('序列贴图')"); clip(pg, 1366, 768, 'shot_4c_1366_delivery.png'); pg.close()
        if want('5'):
            pg = page_for(b, 1920, 1080); pg.evaluate("KIT.openExport()"); clip(pg, 1920, 1080, 'shot_5_export.png', probe=False)
            pg.locator('.menu [data-r="det"]').click(); clip(pg, 1920, 1080, 'shot_5a_export_detail.png', probe=False); pg.close()
            pg = page_for(b, 1920, 1080); pg.evaluate("KIT.tip('缩放')"); clip(pg, 1920, 1080, 'shot_5b_tip.png', probe=False); pg.close()
            pg = page_for(b, 1920, 1080); pg.locator('#stage .vp').click(button='right', position={'x': 700, 'y': 300}); clip(pg, 1920, 1080, 'shot_5c_stage_menu.png', probe=False); pg.close()   # v3.4 第 5 条：背景、安全框在画面右键菜单里
            pg = page_for(b, 1920, 1080); pg.evaluate("KIT.del('点灭星')"); pg.evaluate("KIT.askDeleteEffect()"); clip(pg, 1920, 1080, 'shot_5d_dialog_toast.png', probe=False); pg.close()
            pg = page_for(b, 1366, 768); pg.evaluate("KIT.openExport()"); clip(pg, 1366, 768, 'shot_5e_1366_export.png', probe=False); pg.close()
        if want('7'):
            for scene, nm in (('kiku', 'shot_7_hover.png'), ('spk', 'shot_7b_hover_spk.png')):
                pg = page_for(b, 1920, 1080); pg.evaluate(f"KIT.set('scene','{scene}')"); pg.wait_for_timeout(200)
                pg.evaluate("""() => { const q = s => document.querySelector(s);
                  const L = [...document.querySelectorAll('#tree .trow.t-layer, #tree .trow[aria-expanded]')].find(r => !r.classList.contains('is-sel') && !r.classList.contains('t-group')); if (L) L.classList.add('is-hover');
                  const nd = q('#pbody .prm.is-nd') || q('#pbody .prm[data-kind=range]'); if (nd) nd.classList.add('is-hover');
                  const mh = q('#pbody .mod.is-closed .mod-h') || q('#pbody .mod-h'); if (mh) mh.classList.add('is-hover');
                  const rr = q('#tlw .rrow'); if (rr) rr.classList.add('is-hover'); const lh = q('.lib-head'); if (lh) lh.classList.add('is-hover');
                  const pb = q('#pbody'); pb.scrollTop = 40; pb.classList.add('is-scrolling'); const tr = q('#tree'); tr.classList.add('is-scrolling'); }""")
                clip(pg, 1920, 1080, nm, probe=False); pg.close()
        if want('6'):
            pg = page_for(b, 1920, 1080); pg.evaluate("KIT.set('view','sheet')"); pg.wait_for_timeout(500)
            pg.screenshot(path=str(OUT / 'shot_6_sheet.png'), full_page=True)
            print('shot_6_sheet.png', pg.evaluate("document.documentElement.scrollHeight")); pg.close()
        b.close()
    print('\n'.join(MSGS) if MSGS else '没有页面错误和控制台报错')


if __name__ == '__main__':
    main()
