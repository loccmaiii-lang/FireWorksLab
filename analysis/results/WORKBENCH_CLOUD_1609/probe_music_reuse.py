# 复现用户路径：先「打开节目」B01 原件（内嵌音乐）→ 清掉云端载入记录 → 刷新（云端编排沿用同一首音乐）→ 播放跨过 5 s 音乐起播
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).parent
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8025/'
TAG = sys.argv[2] if len(sys.argv) > 2 else 'dev'
DB = 'df-offline-director-workbench' if 'release' in URL or URL.startswith('file') else 'df-director-workbench'
KEY = 'df-offline-workbench-v1-draft' if DB.startswith('df-offline') else 'df-timeline-design-v2-draft'
SRC = r'F:/FireWorksLab/FXtools/节目/NewYearFireWorks_v01/NewYearFireWorks_v01-B01长冈式.dfshow'
CHROME = r'C:/Users/locmai/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
IDB = """async ([db, op, key]) => new Promise((resolve, reject) => { const r = indexedDB.open(db, 1);
 r.onsuccess = () => { const tx = r.result.transaction('drafts', op === 'get' ? 'readonly' : 'readwrite'), st = tx.objectStore('drafts');
  const q = op === 'get' ? st.get(key) : st.delete(key); tx.oncomplete = () => { r.result.close(); resolve(op === 'get' ? (q.result ? String(q.result).slice(0, 0) + (q.result.length) : null) : true) } };
 r.onerror = () => reject(r.error) })"""
STATE = "()=>{const a=document.querySelector('audio');return {audio:a?{t:+a.currentTime.toFixed(2),paused:a.paused,ready:a.readyState,err:a.error&&(a.error.code+' '+a.error.message),src:(a.currentSrc||'').slice(0,40)}:null,snack:document.querySelector('.snackbar')?.innerText||'',play:!!document.querySelector('button[aria-label=\"暂停\"]')}}"
log = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'])
    ctx = b.new_context(viewport={'width': 1920, 'height': 1080})
    page = ctx.new_page()
    page.on('pageerror', lambda e: log.append(f'pageerror: {e}'))
    page.on('console', lambda m: log.append(f'console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    page.goto(URL); page.wait_for_selector('.app-header .project', timeout=60000); page.wait_for_timeout(1500)
    page.locator('button[data-panel="programme"]').click()
    page.get_by_role('button', name='打开节目').click()
    page.set_input_files('input[aria-label="打开节目文件"]', SRC)
    page.wait_for_timeout(20000)
    log.append('after open: ' + json.dumps(page.evaluate(STATE), ensure_ascii=False))
    log.append('draft length: ' + str(page.evaluate(IDB, [DB, 'get', KEY])))
    page.evaluate(IDB, [DB, 'del', KEY + '-cloud-latest'])
    page.reload(); page.wait_for_selector('.app-header .project', timeout=120000); page.wait_for_timeout(4000)
    log.append('after reload: ' + json.dumps(page.evaluate(STATE), ensure_ascii=False))
    if page.locator('.snackbar button[aria-label="关闭操作提示"]').count():
        page.locator('.snackbar button[aria-label="关闭操作提示"]').click()
    page.get_by_role('button', name='播放').first.click()
    for t in (1500, 2500, 2000, 2000):
        page.wait_for_timeout(t)
        log.append('play: ' + json.dumps(page.evaluate(STATE), ensure_ascii=False))
    page.screenshot(path=str(OUT / f'probe_reuse_{TAG}.png'))
    b.close()
(OUT / f'probe_reuse_{TAG}_log.txt').write_text('\n'.join(log), encoding='utf-8')
print('\n'.join(log)[:5000])
