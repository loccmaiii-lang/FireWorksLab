import os
from playwright.sync_api import sync_playwright
OUT=os.path.dirname(os.path.abspath(__file__))
with sync_playwright() as p:
    b=p.chromium.launch(channel='chrome',headless=True); pg=b.new_page(viewport={'width':1440,'height':1500})
    pg.goto('http://127.0.0.1:8025/release/?qa=light1640b',wait_until='domcontentloaded')
    pg.wait_for_selector('button[data-panel="delivery"]',timeout=60000); pg.wait_for_timeout(1500)
    pg.click('button[data-panel="delivery"]'); pg.get_by_role('button',name='灯光',exact=True).click()
    pg.wait_for_selector('.light-table',timeout=30000); pg.wait_for_timeout(500)
    pg.locator('.inspector').screenshot(path=os.path.join(OUT,'灯光页-完整.png'))
    pg.screenshot(path=os.path.join(OUT,'整页-灯光tab.png'))
    pg.evaluate("document.querySelector('.delivery-body').scrollTop=99999"); pg.wait_for_timeout(300)
    pg.locator('.inspector').screenshot(path=os.path.join(OUT,'灯光页-下半.png'))
    b.close()
