# 16.0.18 预览平台 PC / 手游：浏览器验收（本机同步 8）
import json, hashlib, pathlib, sys
from playwright.sync_api import sync_playwright

OUT = pathlib.Path(__file__).parent
CHROME = r'C:/Users/locmai/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
BASE = 'http://127.0.0.1:8025/release/'
FILE = pathlib.Path(r'F:/FireWorksLab/FXtools/烟花编排工作台/烟花编排工作台.html').as_uri()
CLOUD = pathlib.Path(r'F:/FireWorksLab/tool/workbench/public/data/cloud-latest.json')
report = {}


def footer(page):
    return page.locator('.app-footer').inner_text()


def pressed(page):
    return {b.inner_text().strip(): b.get_attribute('aria-pressed') for b in page.locator('.platform-switch button').all()}


def toast(page):
    loc = page.locator('.snackbar [role=status], .snackbar [role=alert]')
    return loc.first.inner_text() if loc.count() else ''


def open_page(ctx, url, errors):
    page = ctx.new_page()
    page.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('response', lambda r: r.status >= 400 and errors.append(f'{r.status} {r.url}'))
    page.goto(url)
    page.wait_for_selector('.platform-switch button', timeout=30000)
    page.wait_for_function("document.querySelector('.app-footer') && /片段/.test(document.querySelector('.app-footer').innerText)", timeout=30000)
    page.wait_for_timeout(800)
    return page


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME)

    # 1) 真实云端节目（B01，当前没有片段标「不上手机」）
    errors = []
    ctx = browser.new_context(viewport={'width': 1600, 'height': 960})
    page = open_page(ctx, BASE + '?qa=plat1618a', errors)
    r = {'initial': {'pressed': pressed(page), 'footer': footer(page)}}
    icons = page.locator('.platform-switch svg.material-symbol')
    r['iconCount'] = icons.count()
    r['iconSize'] = page.evaluate("[...document.querySelectorAll('.platform-switch svg')].map(s=>s.getBoundingClientRect().width)")
    page.locator('.editor-context-bar').screenshot(path=str(OUT / '顶栏-PC.png'))
    page.get_by_role('button', name='手游').click()
    page.wait_for_timeout(500)
    r['mobile'] = {'pressed': pressed(page), 'footer': footer(page), 'toast': toast(page)}
    page.locator('.editor-context-bar').screenshot(path=str(OUT / '顶栏-手游.png'))
    tiers = {}
    for t in ['中配', '低配', '高配']:
        page.locator('.quality-switch button', has_text=t).click()
        page.wait_for_timeout(400)
        tiers[t] = footer(page)
    r['mobileTiers'] = tiers
    page.reload()
    page.wait_for_selector('.platform-switch button')
    page.wait_for_timeout(1200)
    r['afterReload'] = {'pressed': pressed(page), 'footer': footer(page)}
    page.screenshot(path=str(OUT / '整页-手游.png'))
    page.get_by_role('button', name='PC').click()
    page.wait_for_timeout(400)
    r['backToPc'] = {'pressed': pressed(page), 'footer': footer(page), 'toast': toast(page)}
    r['errors'] = errors
    report['real'] = r
    ctx.close()

    # 2) 模拟：把每第 3 个片段标成不上手机，确认手游预览真的少放
    data = json.loads(CLOUD.read_text(encoding='utf8'))
    cues = data['project']['payload']['doc']['cues']
    off = [c['id'] for i, c in enumerate(cues) if i % 3 == 0]
    for c in cues:
        if c['id'] in off:
            c['mobile'] = False
    data['programmeSha256'] = hashlib.sha256(b'platform-preview-test').hexdigest()
    body = json.dumps(data, ensure_ascii=False)
    errors = []
    ctx = browser.new_context(viewport={'width': 1600, 'height': 960})
    ctx.route('**/data/cloud-latest.json*', lambda route: route.fulfill(status=200, content_type='application/json', body=body))
    page = open_page(ctx, 'http://127.0.0.1:8025/?qa=plat1618b', errors)
    r = {'offCues': len(off), 'pc': footer(page)}
    page.get_by_role('button', name='手游').click()
    page.wait_for_timeout(500)
    r['mobile'] = {'footer': footer(page), 'toast': toast(page)}
    page.screenshot(path=str(OUT / '模拟-手游少放.png'))
    for t in ['中配', '低配']:
        page.locator('.quality-switch button', has_text=t).click()
        page.wait_for_timeout(400)
        r['mobile' + t] = footer(page)
    r['errors'] = errors
    report['simulated'] = r
    ctx.close()

    # 3) 离线入口（file://）
    errors = []
    ctx = browser.new_context(viewport={'width': 1600, 'height': 960})
    page = open_page(ctx, FILE, errors)
    r = {'pressed': pressed(page), 'footer': footer(page)}
    page.get_by_role('button', name='手游').click()
    page.wait_for_timeout(500)
    r['mobile'] = {'pressed': pressed(page), 'footer': footer(page), 'toast': toast(page)}
    r['errors'] = [e for e in errors if 'music.wav' not in e]
    report['offline'] = r
    ctx.close()

    # 4) 窄屏（1100）顶栏不折行
    ctx = browser.new_context(viewport={'width': 1100, 'height': 800})
    page = open_page(ctx, BASE + '?qa=plat1618a', [])
    report['narrow'] = page.evaluate("(()=>{const b=document.querySelector('.editor-context-bar').getBoundingClientRect();return {barHeight:b.height}})()")
    page.locator('.editor-context-bar').screenshot(path=str(OUT / '顶栏-1100宽.png'))
    ctx.close()
    browser.close()

(OUT / 'result.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf8')
print(json.dumps(report, ensure_ascii=False, indent=1))
