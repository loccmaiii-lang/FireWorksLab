# 不加自动播放放行参数，按真实点击播放，跨过 5 s 音乐起播，看三个入口各报什么
import json
from playwright.sync_api import sync_playwright
CHROME = r'C:/Users/locmai/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
FILE = 'file:///F:/FireWorksLab/FXtools/%E7%83%9F%E8%8A%B1%E7%BC%96%E6%8E%92%E5%B7%A5%E4%BD%9C%E5%8F%B0/%E7%83%9F%E8%8A%B1%E7%BC%96%E6%8E%92%E5%B7%A5%E4%BD%9C%E5%8F%B0.html'
STATE = "()=>{const a=document.querySelector('audio');return {audio:a?{t:+a.currentTime.toFixed(2),paused:a.paused,ready:a.readyState,net:a.networkState,err:a.error&&(a.error.code+' '+a.error.message),src:(a.currentSrc||a.getAttribute('src')||'').slice(0,60)}:null,snack:document.querySelector('.snackbar')?.innerText||'',clock:document.querySelector('.main-time strong')?.innerText||'',attr:document.querySelector('audio')?.getAttribute('src')}}"
out={}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--allow-file-access-from-files'])
    for tag,url in (('dev','http://127.0.0.1:8025/'),('release','http://127.0.0.1:8025/release/'),('file',FILE),('zip_no_music','file:///'+r'C:/Users/locmai/AppData/Local/Temp/zipuser/wb.html')):
        log=[]; ctx=b.new_context(viewport={'width':1920,'height':1080}); page=ctx.new_page()
        page.on('pageerror', lambda e: log.append(f'pageerror: {e}'))
        page.on('console', lambda m: log.append('console '+m.type+' '+m.text) if m.type=='error' and 'favicon' not in m.text else None)
        page.goto(url); page.wait_for_selector('.app-header .project', timeout=60000); page.wait_for_timeout(2000)
        if page.locator('.snackbar button[aria-label="关闭操作提示"]').count(): page.locator('.snackbar button[aria-label="关闭操作提示"]').click()
        log.append('before: '+json.dumps(page.evaluate(STATE),ensure_ascii=False))
        page.get_by_role('button', name='播放').first.click()
        for t in (3000,3500,3500):
            page.wait_for_timeout(t); log.append('play: '+json.dumps(page.evaluate(STATE),ensure_ascii=False))
        page.screenshot(path=f'probe_entry_{tag}.png'); ctx.close(); out[tag]=log
    b.close()
for k,v in out.items(): print('=====',k); print('\n'.join(v))
