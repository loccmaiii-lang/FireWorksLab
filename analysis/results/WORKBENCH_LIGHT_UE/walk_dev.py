# 16.0.41 走查：交付 → 导演表 → 自动导入 UE 里的「同时写入灯光」。连真 UE，只等自动检查（只读），不勾确认、不点导入。
import json, os, sys
from playwright.sync_api import sync_playwright
OUT = os.path.dirname(os.path.abspath(__file__))
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8025/?qa=lightue1641'
TAG = sys.argv[2] if len(sys.argv) > 2 else 'dev'
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', headless=True)
    pg = b.new_page(viewport={'width': 1440, 'height': 1400})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL, wait_until='domcontentloaded')
    pg.wait_for_selector('button[data-panel="delivery"]', timeout=90000)
    pg.wait_for_timeout(2000)
    res['header'] = pg.locator('.app-header .version').inner_text()
    pg.click('button[data-panel="delivery"]')
    pg.wait_for_selector('.offline-engine-panel', timeout=30000)
    try:
        pg.wait_for_function("()=>/灯光检查通过|灯光检查未通过|灯光不能写|读不到灯光/.test(document.querySelector('.offline-engine-panel')?.innerText||'')", timeout=150000)
    except Exception as e:
        res['wait_error'] = str(e)[:200]
    pg.wait_for_timeout(500)
    panel = pg.locator('.offline-engine-panel')
    res['panel_text'] = panel.inner_text()
    res['import_button'] = pg.locator('.offline-engine-panel button.primary-action').inner_text()
    res['import_enabled_before_confirm'] = pg.locator('.offline-engine-panel button.primary-action').is_enabled()
    res['confirm_label'] = pg.locator('.offline-engine-panel label.panel-check').nth(1).inner_text()
    panel.screenshot(path=os.path.join(OUT, TAG + '-自动导入-灯光开.png'))
    # 关掉「同时写入灯光」看按钮和确认文字（不勾确认、不点导入）
    pg.get_by_label('同时写入灯光').uncheck()
    pg.wait_for_timeout(1500)
    res['off_button'] = pg.locator('.offline-engine-panel button.primary-action').inner_text()
    res['off_confirm_label'] = pg.locator('.offline-engine-panel label.panel-check').nth(1).inner_text()
    pg.get_by_label('同时写入灯光').check()
    pg.wait_for_timeout(500)
    pg.get_by_role('button', name='看灯光曲线').click()
    pg.wait_for_selector('.light-table', timeout=30000)
    res['light_tab_rows'] = pg.locator('.light-table tbody tr').all_inner_texts()
    res['light_tab_ue'] = pg.locator('.delivery-body section').nth(3).inner_text()
    pg.locator('.inspector').screenshot(path=os.path.join(OUT, TAG + '-灯光页.png'))
    res['page_errors'] = errs
    b.close()
json.dump(res, open(os.path.join(OUT, TAG + '-walk.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1))
