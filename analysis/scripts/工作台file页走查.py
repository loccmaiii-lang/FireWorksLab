"""编排工作台成品 file 页无头走查（跨年秀 22）：自动载入云端编排、刷新不重复载入、PC / 手游 × 高中低计数和编译报告一致。
用法：python3 analysis/scripts/工作台file页走查.py <烟花编排工作台.html> <输出目录> <云端编排版本> <编排检查.json（编排B01_编译.mjs 输出，含 oneTable）>
需要 Playwright + Chromium。结果写 <输出目录>/result.json 和首次打开截图。"""
import json
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

html, out, version, report = Path(sys.argv[1]).resolve(), Path(sys.argv[2]), sys.argv[3], json.loads(Path(sys.argv[4]).read_text(encoding='utf-8'))
out.mkdir(parents=True, exist_ok=True)
ot, cues = report['oneTable'], report['doc']['cues']
expected = {}
for tier, cn in (('high', '高配'), ('medium', '中配'), ('low', '低配')):
    expected['PC' + cn] = f"{cues} 片段 / {ot['pc'][tier]} 次播放"
    expected['手游' + cn] = f"{cues} 片段 / {ot['mobile'][tier]} 次播放" + (f"（PC {ot['pc'][tier]}）" if ot['mobile'][tier] != ot['pc'][tier] else '')
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1600, 'height': 900})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(html.as_uri()); page.wait_for_timeout(6000)
    result = {'header': page.locator('.app-header .version').inner_text(),
              'notice': [l for l in page.locator('body').inner_text().splitlines() if l.startswith('已载入云端编排')]}
    page.screenshot(path=str(out / 'file页_首次打开.png'))
    page.reload(); page.wait_for_timeout(5000)
    result['reloadNotice'] = [l for l in page.locator('body').inner_text().splitlines() if l.startswith('已载入云端编排')]
    tiers = {}
    for platform in ['PC', '手游']:
        page.get_by_role('button', name=platform, exact=True).first.click(); page.wait_for_timeout(400)
        for tier in ['高配', '中配', '低配']:
            page.get_by_role('button', name=tier, exact=True).first.click(); page.wait_for_timeout(400)
            footer = page.locator('.app-footer').inner_text()
            tiers[platform + tier] = re.search(r'\d+ 片段 / \d+ 次播放(（PC \d+）)?', footer).group(0)
    result['footer'] = page.locator('.app-footer').inner_text().split('\n')[1]
    result['tiers'], result['expected'], result['pageErrors'] = tiers, expected, errors
    browser.close()
result['pass'] = (tiers == expected and not result['reloadNotice'] and not errors and f'云端编排 {version}' in result['header'] and len(result['notice']) == 1)
(out / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(json.dumps(result, ensure_ascii=False, indent=1))
