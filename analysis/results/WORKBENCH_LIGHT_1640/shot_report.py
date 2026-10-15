import os
from playwright.sync_api import sync_playwright
OUT=os.path.dirname(os.path.abspath(__file__))
src=r'F:/FireWorksLab/tool/fwlight/deliveries/fwlight-16.0.40-20261016-0013/report_SkyLight.html'
with sync_playwright() as p:
    b=p.chromium.launch(channel='chrome',headless=True); pg=b.new_page(viewport={'width':1400,'height':1000})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///'+src.replace('\\','/')); pg.wait_for_timeout(1500)
    pg.screenshot(path=os.path.join(OUT,'报告-SkyLight.png'),full_page=False); print('errors',errs); b.close()
