# 16.0.39 交付 → 灯光 走查（本机同步 8，10-15）：8025/release/ 原成品字节，?qa= 隔离草稿，不连 UE、不写 UE。
import json, sys, zipfile, io, os
from playwright.sync_api import sync_playwright
OUT = os.path.dirname(os.path.abspath(__file__))
URL = 'http://127.0.0.1:8025/release/?qa=light1640'
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', headless=True)
    pg = b.new_page(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL, wait_until='domcontentloaded')
    pg.wait_for_selector('button[data-panel="delivery"]', timeout=60000)
    pg.wait_for_timeout(1500)
    res['header'] = pg.locator('.project').inner_text()
    pg.click('button[data-panel="delivery"]')
    pg.get_by_role('button', name='灯光', exact=True).click()
    pg.wait_for_selector('.light-table', timeout=30000)
    pg.wait_for_timeout(500)
    res['rows'] = pg.locator('.light-table tbody tr').all_inner_texts()
    res['summary'] = pg.locator('.delivery-summary').first.inner_text()
    pg.locator('.inspector').screenshot(path=os.path.join(OUT, '灯光页-默认.png'))
    res['download_enabled_default'] = pg.get_by_role('button', name='下载灯光交付包').is_enabled()
    with pg.expect_download() as dl:
        pg.get_by_role('button', name='下载灯光交付包').click()
    d = dl.value
    zpath = os.path.join(OUT, d.suggested_filename)
    d.save_as(zpath)
    res['zip'] = d.suggested_filename
    inp = pg.get_by_label('天光峰值')
    inp.fill('12')
    pg.wait_for_timeout(400)
    res['alert_12'] = pg.locator('.delivery-body [role=alert]').all_inner_texts()
    res['download_enabled_12'] = pg.get_by_role('button', name='下载灯光交付包').is_enabled()
    pg.locator('.inspector').screenshot(path=os.path.join(OUT, '灯光页-峰值12被拦.png'))
    inp.fill('10')
    pg.wait_for_timeout(400)
    res['rows_10'] = pg.locator('.light-table tbody tr').all_inner_texts()[-1]
    res['download_enabled_10'] = pg.get_by_role('button', name='下载灯光交付包').is_enabled()
    pg.get_by_role('button', name='导演表', exact=True).click()
    pg.wait_for_timeout(300)
    res['director_tab_ok'] = pg.get_by_role('button', name='导演表', exact=True).get_attribute('aria-pressed')
    res['page_errors'] = errs
    b.close()
z = zipfile.ZipFile(zpath)
res['zip_files'] = z.namelist()
res['zip_test'] = z.testzip()
json.dump(res, open(os.path.join(OUT, 'walk.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1))
