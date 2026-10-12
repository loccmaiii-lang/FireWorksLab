"""16.0.19（只换编排）file 页无头走查：自动载入云端编排、刷新不重复载入、PC / 手游 × 高中低计数。
用法：python3 check_file_page.py <烟花编排工作台.html> <输出目录>（需要 Playwright + Chromium）。"""
import json, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

html, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2])
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
    result['tiers'] = tiers
    result['pageErrors'] = errors
    browser.close()
expected = {'PC高配': '182 片段 / 982 次播放', 'PC中配': '182 片段 / 826 次播放', 'PC低配': '182 片段 / 324 次播放',
            '手游高配': '182 片段 / 149 次播放（PC 982）', '手游中配': '182 片段 / 135 次播放（PC 826）', '手游低配': '182 片段 / 119 次播放（PC 324）'}
result['pass'] = (result['tiers'] == expected and not result['reloadNotice'] and not errors
                  and '云端编排 16.0.19' in result['header'] and len(result['notice']) == 1)
(out / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(json.dumps(result, ensure_ascii=False, indent=1))
