# 16.0.9 刷新自动载入云端最新编排：真实浏览器走查（全新临时浏览器配置，不碰用户自己的浏览器数据）
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).parent
BASE = 'http://127.0.0.1:8025'
FILE = 'file:///F:/FireWorksLab/FXtools/%E7%83%9F%E8%8A%B1%E7%BC%96%E6%8E%92%E5%B7%A5%E4%BD%9C%E5%8F%B0/%E7%83%9F%E8%8A%B1%E7%BC%96%E6%8E%92%E5%B7%A5%E4%BD%9C%E5%8F%B0.html'
results = []


def check(name, ok, detail=''):
    results.append({'check': name, 'pass': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + name + (' | ' + detail if detail else ''), flush=True)


def wait_ready(page):
    page.wait_for_selector('.app-header .project', timeout=60000)
    page.wait_for_timeout(1500)


def header(page):
    return page.locator('.app-header .project').inner_text()


def snackbar(page):
    loc = page.locator('.snackbar')
    return loc.inner_text() if loc.count() else ''


def footer(page):
    loc = page.locator('footer')
    return loc.first.inner_text() if loc.count() else ''


IDB = """async ([db, op, key, value]) => new Promise((resolve, reject) => {
  const r = indexedDB.open(db, 1);
  r.onsuccess = () => { const tx = r.result.transaction('drafts', op === 'get' ? 'readonly' : 'readwrite'), st = tx.objectStore('drafts');
    let q = op === 'get' ? st.get(key) : op === 'del' ? st.delete(key) : st.put(value, key);
    tx.oncomplete = () => { r.result.close(); resolve(op === 'get' ? q.result ?? null : true) }; tx.onerror = () => reject(tx.error) };
  r.onerror = () => reject(r.error) })"""

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=r'C:/Users/locmai/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', args=['--allow-file-access-from-files'])
    errors = []

    # A. 8025 开发页，全新浏览器：第一次打开就是 B01
    ctx = browser.new_context(viewport={'width': 1366, 'height': 768})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(BASE + '/')
    wait_ready(page)
    h, s, f = header(page), snackbar(page), footer(page)
    check('A1 8025 全新打开（1366 宽，顶栏版本按原设计隐藏）：底栏写 16.0.10 · 云端 16.0.9 B01长冈式', '导演编排 16.0.10 · 云端 16.0.9 B01长冈式' in f, f.replace(chr(10),' ')[:90])
    check('A2 常驻提示写明载入了哪一版', '已载入云端编排 16.0.9 · B01长冈式' in s and '329 片段' in s, s)
    check('A3 底栏 329 片段', '329 片段' in f)
    page.screenshot(path=str(OUT / 'A_8025_首次打开_1366.png'))
    page.wait_for_timeout(10000)
    check('A4 提示不自动消失（要点关闭）', '已载入云端编排' in snackbar(page))
    mark = page.evaluate(IDB, ['df-director-workbench', 'get', 'df-timeline-design-v2-draft-cloud-latest', None])
    check('A5 记下已载入的版本', mark and json.loads(mark)['version'] == '16.0.9', str(mark)[:120])
    page.reload()
    wait_ready(page)
    check('A6 再刷新：仍是 B01，不再重复载入/提示', 'B01长冈式' in footer(page) and '已载入云端编排' not in snackbar(page))

    # B. 已有自己的节目（模拟：改名为「我的节目」且没有载入记录）→ 刷新载入 B01，原节目可恢复
    draft = page.evaluate(IDB, ['df-director-workbench', 'get', 'df-timeline-design-v2-draft', None])
    mine = json.loads(draft)
    mine['doc']['meta']['programName'] = '我的节目'
    mine['doc']['meta'].pop('cloudVersion', None)
    mine['doc']['meta'].pop('cloudName', None)
    page.evaluate(IDB, ['df-director-workbench', 'put', 'df-timeline-design-v2-draft', json.dumps(mine, ensure_ascii=False)])
    page.evaluate(IDB, ['df-director-workbench', 'del', 'df-timeline-design-v2-draft-cloud-latest', None])
    page.reload()
    wait_ready(page)
    check('B1 自己的节目在，云端出新版：刷新后换成 B01', 'B01长冈式' in footer(page) and '我的节目' not in header(page), header(page))
    check('B2 提示说明原节目已备份、在哪找回', '恢复切换前节目' in snackbar(page), snackbar(page))
    rec = page.evaluate(IDB, ['df-director-workbench', 'get', 'df-timeline-design-v2-draft-recovery', None])
    ver = page.evaluate(IDB, ['df-director-workbench', 'get', 'df-timeline-design-v2-draft-before-cloud-16.0.9', None])
    check('B3 备份里是「我的节目」（恢复槽 + 按版本的槽）', rec and '我的节目' in rec and ver and '我的节目' in ver)
    page.screenshot(path=str(OUT / 'B_8025_已有节目_刷新载入.png'))
    page.locator('button[data-panel="programme"]').click()
    page.get_by_role('button', name='备份与恢复').click()
    page.get_by_role('button', name='恢复切换前节目 · 可撤销').click()
    page.wait_for_timeout(1500)
    check('B4 节目 → 备份与恢复 → 恢复切换前节目：回到「我的节目」', '我的节目' in header(page), header(page))
    page.screenshot(path=str(OUT / 'B_8025_恢复切换前节目.png'))
    page.wait_for_timeout(1500)
    page.reload()
    wait_ready(page)
    check('B5 恢复后再刷新：不会又被换回 B01（同一版只载入一次）', '我的节目' in header(page) and 'B01长冈式' not in footer(page), header(page))
    ctx.close()

    # C. 8025/release/ 最终离线 HTML（HTTP）与 D. file 页：全新浏览器打开就是 B01
    for tag, url in (('C 8025/release/', BASE + '/release/'), ('D file 离线页', FILE)):
        ctx = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(url)
        wait_ready(page)
        h, s = header(page), snackbar(page)
        check(tag + '（1920 宽）：顶栏与底栏都写 16.0.9 · B01长冈式', '云端编排 16.0.9 · B01长冈式' in h and '导演编排 16.0.10 · 云端 16.0.9 B01长冈式' in footer(page), h.replace(chr(10),' '))
        check(tag + '：提示写明音乐要在节目里导入', '导入《汪洋与浩渺》' in s, s)
        page.screenshot(path=str(OUT / (tag.split(' ')[0] + '_离线_1920.png')))
        ctx.close()
    check('页面脚本无报错', not errors, '; '.join(errors)[:300])
    browser.close()

(OUT / 'browser_check.json').write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding='utf-8')
fails = [r for r in results if not r['pass']]
print(f'{len(results) - len(fails)}/{len(results)} PASS')
sys.exit(1 if fails else 0)
