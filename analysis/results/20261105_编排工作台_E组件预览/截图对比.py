"""原版 / E 组件预览 同状态截图 + 布局核对 + 对比页（对话框9，2026-11-05）。

先跑 生成预览.py，再跑本脚本（需要 Playwright + Chrome；file:// 打开，外网请求一律拦截）：
    python -X utf8 analysis/results/20261105_编排工作台_E组件预览/截图对比.py [--chrome /usr/bin/google-chrome]
输出：
    _shots/            原始截图（PNG，过程证据，不进 Git）
    对比_原版_预览.html  左右并排、图片内嵌（≤ 6 MB）
    对比_*.jpg          关键对比图（≤ 400 KB）
    布局核对.json        每个状态：面板外框差、按钮外框差、新增截断
"""
from pathlib import Path
import argparse, base64, io, json, sys
from playwright.sync_api import sync_playwright
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
ORIG = (ROOT / 'tool' / '烟花编排工作台.html').as_uri()
PREV = (HERE / '编排工作台_E组件预览.html').as_uri()
SHOTS = HERE / '_shots'

PANELS = ['.app-header', '.editor-context-bar', '.workspace', '.library', '.stage-panel', '.inspector', '.transport',
          '.timeline-panel', '.app-footer', '.library-list', '.inspector-body', '.inspector-foot', '.point-deck',
          '.timeline-content', '.header-right', '.panel-heading', '.tabs']


def close_snack(pg):
    pg.evaluate("()=>{const s=document.querySelector('.snackbar .icon-button'); if(s) s.click();}")
    pg.wait_for_timeout(300)


def click(pg, sel, text):
    pg.locator(sel, has_text=text).first.click()
    pg.wait_for_timeout(800)


def st_main(pg):
    pass


def st_tpl(pg):
    close_snack(pg); click(pg, '.library .tabs button', '模板库')


def st_ship(pg):
    close_snack(pg); click(pg, '.header-right button', '交付')


def st_menu(pg):
    close_snack(pg); click(pg, '.display-wrap button', '显示')


def st_dd(pg):
    close_snack(pg)
    pg.locator('.inspector select').first.click()
    pg.wait_for_timeout(600)


STATES = [('main', '编排主界面（含载入提示条）', st_main), ('tpl', '模板库 · 花型模板', st_tpl),
          ('ship', '交付面板（导演表）', st_ship), ('menu', '「显示」浮层', st_menu), ('dd', '下拉打开（归属编排段落）', st_dd)]

MEASURE = """(panels)=>{
  const R=e=>{const r=e.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]};
  const p={}; for(const s of panels){const e=document.querySelector(s); if(e) p[s]=R(e);}
  const b=[...document.querySelectorAll('.app button')].filter(e=>e.getBoundingClientRect().width>0).slice(0,400).map(e=>[R(e),(e.innerText||e.getAttribute('aria-label')||e.title||'').trim().slice(0,16)]);
  const cut=[...document.querySelectorAll('.app *')].filter(e=>{const r=e.getBoundingClientRect(); if(r.width<1||r.y>innerHeight||r.x>innerWidth) return false; const cs=getComputedStyle(e); return (cs.overflow!=='visible'||cs.textOverflow==='ellipsis') && e.scrollWidth>e.clientWidth+1 && e.childElementCount===0 && e.textContent.trim();}).map(e=>e.textContent.trim().slice(0,20));
  return {p,b,cut};
}"""


def shoot(pw, chrome, url, w, h, fn, png):
    br = pw.chromium.launch(executable_path=chrome, args=['--no-sandbox'])
    try:
        pg = br.new_page(viewport={'width': w, 'height': h})
        pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith(('file:', 'data:', 'blob:')) else r.abort())
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto(url)
        pg.wait_for_timeout(3500)
        fn(pg)
        pg.mouse.move(w - 2, h // 2)   # 鼠标移开，不留悬停态
        pg.wait_for_timeout(200)
        pg.screenshot(path=str(png))
        m = pg.evaluate(MEASURE, PANELS)
        m['errors'] = errs
        return m
    finally:
        br.close()   # 一次只开一个浏览器进程


def diff(a, b):
    out = {'panels': {}, 'buttons_moved': [], 'new_cut': []}
    for k, ra in a['p'].items():
        rb = b['p'].get(k)
        if rb is None:
            out['panels'][k] = 'missing'
        elif max(abs(x - y) for x, y in zip(ra, rb)) > 1:
            out['panels'][k] = {'orig': ra, 'prev': rb}
    if len(a['b']) != len(b['b']):
        out['button_count'] = [len(a['b']), len(b['b'])]
    for (ra, ta), (rb, tb) in zip(a['b'], b['b']):
        d = max(abs(x - y) for x, y in zip(ra, rb))
        if d > 2:
            out['buttons_moved'].append({'t': ta, 'orig': ra, 'prev': rb})
    oc = set(a['cut'])
    out['new_cut'] = sorted({c for c in b['cut'] if c not in oc})[:40]
    out['errors'] = b.get('errors', [])
    return out


def jpg_bytes(img, q, maxw=None):
    if maxw and img.width > maxw:
        img = img.resize((maxw, round(img.height * maxw / img.width)), Image.LANCZOS)
    buf = io.BytesIO(); img.convert('RGB').save(buf, 'JPEG', quality=q, optimize=True, progressive=True)
    return buf.getvalue()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--chrome', default='/usr/bin/google-chrome')
    ap.add_argument('--only', default='')
    args = ap.parse_args()
    SHOTS.mkdir(exist_ok=True)
    rp = HERE / '布局核对.json'
    report = json.loads(rp.read_text(encoding='utf-8')) if rp.exists() else {}   # 只重跑部分状态时保留其余结果
    sizes = [(1920, 1080), (1366, 768)]
    with sync_playwright() as pw:
        for key, label, fn in STATES:
            if args.only and key not in args.only.split(','):
                continue
            for w, h in sizes:
                ma = shoot(pw, args.chrome, ORIG, w, h, fn, SHOTS / f'o_{key}_{w}.png')
                mb = shoot(pw, args.chrome, PREV, w, h, fn, SHOTS / f'e_{key}_{w}.png')
                report[f'{key}_{w}'] = diff(ma, mb)
                d = report[f'{key}_{w}']
                print(f'{key}_{w}: 面板差 {len(d["panels"])}，按钮外框差>2px {len(d["buttons_moved"])}，新增截断 {len(d["new_cut"])}，脚本错误 {len(d["errors"])}')
    (HERE / '布局核对.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
    build_page()
    key_images()


KEYS = [('main', 1920, '对比_主界面_1920.jpg'), ('tpl', 1366, '对比_模板库_1366.jpg'), ('ship', 1920, '对比_交付栏_1920.jpg')]


def key_images():
    """关键对比图：上原版、下预览，各缩到 1280 宽，JPG ≤ 400 KB"""
    for key, w, name in KEYS:
        o, e = SHOTS / f'o_{key}_{w}.png', SHOTS / f'e_{key}_{w}.png'
        if not (o.exists() and e.exists()):
            continue
        a, b = Image.open(o).convert('RGB'), Image.open(e).convert('RGB')
        tw = 1280
        a = a.resize((tw, round(a.height * tw / a.width)), Image.LANCZOS)
        b = b.resize((tw, round(b.height * tw / b.width)), Image.LANCZOS)
        sheet = Image.new('RGB', (tw, a.height + b.height + 8), (43, 65, 73))
        sheet.paste(a, (0, 0)); sheet.paste(b, (0, a.height + 8))
        for q in (82, 74, 66, 58, 50):
            buf = io.BytesIO(); sheet.save(buf, 'JPEG', quality=q, optimize=True, progressive=True)
            if buf.tell() <= 400_000:
                break
        (HERE / name).write_bytes(buf.getvalue())
        print(f'{name}：{buf.tell() / 1e3:.0f} KB（上原版、下预览）')


def build_page():
    rows = []
    total = 0
    for key, label, _ in STATES:
        for w in (1920, 1366):
            o, e = SHOTS / f'o_{key}_{w}.png', SHOTS / f'e_{key}_{w}.png'
            if not (o.exists() and e.exists()):
                continue
            q, mw = (62, 1600) if w == 1920 else (66, None)
            bo, be = jpg_bytes(Image.open(o), q, mw), jpg_bytes(Image.open(e), q, mw)
            total += len(bo) + len(be)
            rows.append(f'<section><h2>{label} · {w}</h2><div class="pair"><figure><figcaption>原版</figcaption>'
                        f'<img src="data:image/jpeg;base64,{base64.b64encode(bo).decode()}" alt="原版 {label} {w}"></figure>'
                        f'<figure><figcaption>E 组件预览</figcaption><img src="data:image/jpeg;base64,{base64.b64encode(be).decode()}" alt="预览 {label} {w}"></figure></div></section>')
    css = (':root{--g1:#111d21;--g2:#16242a;--g5:#2b4149;--t1:#e4edef;--t2:#b4c5cb;--t3:#8da3ac}'
           'body{margin:0;background:var(--g1);color:var(--t1);font:13px/1.5 Inter,"Segoe UI","Noto Sans SC","Microsoft YaHei",sans-serif}'
           'header{padding:16px 16px 8px;border-bottom:1px solid var(--g5)}h1{margin:0;font-size:15px;font-weight:600}header p{margin:4px 0 0;color:var(--t2)}'
           'section{padding:12px 16px 20px;border-bottom:1px solid var(--g5)}h2{margin:0 0 8px;font-size:13px;font-weight:600;color:var(--t2)}'
           '.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0;min-width:0}figcaption{font-size:12px;color:var(--t3);margin-bottom:4px}'
           'img{display:block;width:100%;height:auto;border:1px solid var(--g5);cursor:zoom-in}img.big{position:fixed;inset:0;z-index:9;width:100vw;height:100vh;object-fit:contain;background:#000d;cursor:zoom-out;border:0}'
           '@media (max-width:900px){.pair{grid-template-columns:1fr}}')
    page = ('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>编排工作台 E 组件对比</title><style>{css}</style></head><body><header><h1>编排工作台 · 原版 / E 组件预览</h1>'
            '<p>布局不动，只换组件外观（E 样板 v3.6）。左原版，右预览；点图放大，再点还原。原版的下拉是系统原生弹层，截图里看不到。</p></header>'
            + ''.join(rows) +
            '<script>document.addEventListener("click",e=>{if(e.target.tagName==="IMG")e.target.classList.toggle("big")})</script></body></html>')
    out = HERE / '对比_原版_预览.html'
    out.write_text(page, encoding='utf-8')
    print(f'对比页 {out}（{out.stat().st_size / 1e6:.2f} MB，图片 {total / 1e6:.2f} MB）')


if __name__ == '__main__':
    sys.exit(main())
