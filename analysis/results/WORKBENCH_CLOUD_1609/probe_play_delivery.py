# 复现：①播放到音乐起播（5 s）是否报错 ②交付页显示什么、现场点位报什么错。只读，不点导入。
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).parent
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8025/'
TAG = sys.argv[2] if len(sys.argv) > 2 else 'dev'
CHROME = r'C:/Users/locmai/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
log = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': 1920, 'height': 1080})
    page = ctx.new_page()
    page.on('console', lambda m: log.append(f'console.{m.type}: {m.text}'))
    page.on('pageerror', lambda e: log.append(f'pageerror: {e}'))
    page.on('requestfailed', lambda r: log.append(f'requestfailed: {r.url} {r.failure}'))
    page.on('response', lambda r: log.append(f'response {r.status}: {r.url}') if r.status >= 400 else None)
    page.goto(URL)
    page.wait_for_selector('.app-header .project', timeout=60000)
    page.wait_for_timeout(1500)
    if page.locator('.snackbar button[aria-label="关闭操作提示"]').count():
        page.locator('.snackbar button[aria-label="关闭操作提示"]').click()
    audio = page.evaluate("()=>{const a=document.querySelector('audio');return a?{src:(a.currentSrc||a.src||'').slice(0,80),ready:a.readyState,err:a.error&&a.error.code}:null}")
    log.append('audio before play: ' + json.dumps(audio))
    page.get_by_role('button', name='播放').first.click()
    for t in (2000, 4000, 3000):
        page.wait_for_timeout(t)
        snap = page.evaluate("()=>{const a=document.querySelector('audio');return {clock:document.querySelector('.timecode, .clock, [class*=time]')?.textContent?.slice(0,30),audio:a?{t:a.currentTime,paused:a.paused,ready:a.readyState,err:a.error&&(a.error.code+' '+a.error.message),src:(a.currentSrc||'').slice(0,60)}:null,snack:document.querySelector('.snackbar')?.innerText||''}}")
        log.append('during play: ' + json.dumps(snap, ensure_ascii=False))
    page.screenshot(path=str(OUT / f'probe_{TAG}_play.png'))
    page.get_by_role('button', name='播放').first.click() if page.get_by_role('button', name='播放').count() else None
    # 交付页
    page.get_by_role('button', name='交付').first.click()
    page.wait_for_timeout(6000)
    page.screenshot(path=str(OUT / f'probe_{TAG}_delivery.png'), full_page=False)
    text = page.locator('aside.inspector').first.inner_text() if page.locator('aside.inspector').count() else page.inner_text('body')
    (OUT / f'probe_{TAG}_delivery.txt').write_text(text, encoding='utf-8')
    b.close()
(OUT / f'probe_{TAG}_log.txt').write_text('\n'.join(log), encoding='utf-8')
print('\n'.join(l for l in log if not l.startswith('console.debug'))[:6000])
