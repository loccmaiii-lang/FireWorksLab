# 16.0.16：交付页文案与导入内容（只读，不点导入）；默认一张表，切「只导高配」后文案跟着变
import json
from playwright.sync_api import sync_playwright
CHROME = r'C:/Users/locmai/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
FILE = 'file:///F:/FireWorksLab/FXtools/%E7%83%9F%E8%8A%B1%E7%BC%96%E6%8E%92%E5%B7%A5%E4%BD%9C%E5%8F%B0/%E7%83%9F%E8%8A%B1%E7%BC%96%E6%8E%92%E5%B7%A5%E4%BD%9C%E5%8F%B0.html'
out={}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME,args=['--allow-file-access-from-files'])
    for tag,url in (('dev','http://127.0.0.1:8025/'),('file',FILE)):
        ctx=b.new_context(viewport={'width':1920,'height':1080});pg=ctx.new_page();errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(url);pg.wait_for_selector('.app-header .project',timeout=60000);pg.wait_for_timeout(1500)
        if pg.locator('.snackbar button[aria-label="关闭操作提示"]').count(): pg.locator('.snackbar button[aria-label="关闭操作提示"]').click()
        pg.get_by_role('button',name='交付').first.click();pg.wait_for_timeout(5000)
        aside=pg.locator('aside.inspector').first
        t1=aside.inner_text()
        if tag=='dev': pg.screenshot(path='probe_1616_交付_一张表.png')
        pg.select_option('select[aria-label="导演交付档位"]','high');pg.wait_for_timeout(2500)
        t2=aside.inner_text()
        pg.select_option('select[aria-label="导演交付档位"]','nested');pg.wait_for_timeout(1500)
        pick=lambda t:[l for l in t.split('\n') if any(k in l for k in ('导入内容','确认替换','导演表','三表','交付档位','一张表','次点位播放','检查'))]
        out[tag]=dict(nested=pick(t1),high=pick(t2),errors=errs)
        ctx.close()
    b.close()
print(json.dumps(out,ensure_ascii=False,indent=1))
