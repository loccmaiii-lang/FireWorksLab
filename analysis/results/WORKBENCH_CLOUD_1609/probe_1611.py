# 16.0.11 发布核对：全新浏览器打开 8025 / file 页 → 载入修订1，播放过 5 s 音乐起播；交付页低配点数
import json
from playwright.sync_api import sync_playwright
CHROME = r'C:/Users/locmai/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
FILE = 'file:///F:/FireWorksLab/FXtools/%E7%83%9F%E8%8A%B1%E7%BC%96%E6%8E%92%E5%B7%A5%E4%BD%9C%E5%8F%B0/%E7%83%9F%E8%8A%B1%E7%BC%96%E6%8E%92%E5%B7%A5%E4%BD%9C%E5%8F%B0.html'
res=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME,args=['--allow-file-access-from-files'])
    for tag,url in (('dev','http://127.0.0.1:8025/'),('file',FILE)):
        ctx=b.new_context(viewport={'width':1920,'height':1080});pg=ctx.new_page();errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(url);pg.wait_for_selector('.app-header .project',timeout=60000);pg.wait_for_timeout(2000)
        foot=pg.locator('footer').first.inner_text().replace('\n',' ');snack=pg.locator('.snackbar').inner_text() if pg.locator('.snackbar').count() else ''
        if pg.locator('.snackbar button[aria-label="关闭操作提示"]').count(): pg.locator('.snackbar button[aria-label="关闭操作提示"]').click()
        pg.get_by_role('button',name='播放').first.click();pg.wait_for_timeout(8000)
        a=pg.evaluate("()=>{const a=document.querySelector('audio');return {t:+a.currentTime.toFixed(2),paused:a.paused,err:a.error&&a.error.code}}")
        clock=pg.locator('.main-time strong').inner_text()
        ok='16.0.11' in foot and 'B01长冈式-修订1' in foot and a['t']>2 and not a['paused'] and not errs
        res.append(dict(entry=tag,ok=ok,footer=foot[:90],snack=snack[:120],audio=a,clock=clock,errors=errs))
        pg.screenshot(path=f'probe_1611_{tag}.png');ctx.close()
    b.close()
print(json.dumps(res,ensure_ascii=False,indent=1))
open('probe_1611.json','w',encoding='utf-8').write(json.dumps(res,ensure_ascii=False,indent=1))
