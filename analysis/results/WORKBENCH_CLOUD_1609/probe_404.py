import json
from playwright.sync_api import sync_playwright
CHROME = r'C:/Users/locmai/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
log=[]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': 1920, 'height': 1080}); page = ctx.new_page()
    cdp = ctx.new_cdp_session(page); cdp.send('Network.enable')
    cdp.on('Network.responseReceived', lambda e: log.append(f"{e['response']['status']} {e['type']} {e['response']['url'][:120]}") if e['response']['status']>=400 else None)
    cdp.on('Network.loadingFailed', lambda e: log.append(f"FAILED {e.get('type')} {e.get('errorText')} {e.get('requestId')}"))
    page.on('console', lambda m: log.append('console '+m.type+' '+m.text+' '+json.dumps(m.location)) if m.type=='error' else None)
    page.goto('http://127.0.0.1:8025/'); page.wait_for_selector('.app-header .project', timeout=60000); page.wait_for_timeout(1500)
    log.append('--- play')
    page.get_by_role('button', name='播放').first.click(); page.wait_for_timeout(8000)
    b.close()
print('\n'.join(log))
