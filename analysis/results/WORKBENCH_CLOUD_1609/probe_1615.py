# 16.0.12：刷新载入 D2；节目 → 打开节目 打开 D1 / D3 对比版；三版都能播过 5 s 音乐起播
import json
from playwright.sync_api import sync_playwright
CHROME = r'C:/Users/locmai/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
DIR = 'F:/FireWorksLab/FXtools/节目/云端最新/'
FILE = 'file:///F:/FireWorksLab/FXtools/%E7%83%9F%E8%8A%B1%E7%BC%96%E6%8E%92%E5%B7%A5%E4%BD%9C%E5%8F%B0/%E7%83%9F%E8%8A%B1%E7%BC%96%E6%8E%92%E5%B7%A5%E4%BD%9C%E5%8F%B0.html'
res=[]
def play(pg):
    if pg.locator('.snackbar button[aria-label="关闭操作提示"]').count(): pg.locator('.snackbar button[aria-label="关闭操作提示"]').click()
    pg.get_by_role('button',name='播放').first.click();pg.wait_for_timeout(8000)
    a=pg.evaluate("()=>{const a=document.querySelector('audio');return {t:+a.currentTime.toFixed(2),paused:a.paused,err:a.error&&a.error.code}}")
    pg.get_by_role('button',name='暂停').first.click() if pg.get_by_role('button',name='暂停').count() else None
    return a
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=CHROME,args=['--allow-file-access-from-files'])
    for tag,url in (('dev','http://127.0.0.1:8025/'),('file',FILE)):
        ctx=b.new_context(viewport={'width':1920,'height':1080});pg=ctx.new_page();errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(url);pg.wait_for_selector('.app-header .project',timeout=60000);pg.wait_for_timeout(2000)
        foot=pg.locator('footer').first.inner_text().replace('\n',' ')
        a=play(pg); res.append(dict(entry=tag,show='节奏D高低大小(刷新自动)',footer=foot[:80],audio=a,errors=list(errs)))
        if tag=='dev': pg.screenshot(path='probe_1615_D2.png')
        for lab in ('B01节奏A-高低大小','B01节奏C-高低大小','B01节奏B-高低大小'):
            pg.locator('button[data-panel="programme"]').click()
            pg.get_by_role('button', name='打开节目').click()
            pg.set_input_files('input[aria-label="打开节目文件"]', DIR+f'16.0.15-{lab}.dfshow')
            pg.wait_for_timeout(6000)
            foot=pg.locator('footer').first.inner_text().replace('\n',' ')
            a=play(pg); res.append(dict(entry=tag,show=lab,footer=foot[:80],audio=a,errors=list(errs)))
            if tag=='dev': pg.screenshot(path=f'probe_1615_{lab}.png')
        ctx.close()
    b.close()
print(json.dumps(res,ensure_ascii=False,indent=1))
open('probe_1615.json','w',encoding='utf-8').write(json.dumps(res,ensure_ascii=False,indent=1))
