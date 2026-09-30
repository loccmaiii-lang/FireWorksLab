"""Real browser checks for recipe compatibility and F0/F1 preview state."""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_runtime import chromium_options, verify_renderer

ROOT = Path(__file__).resolve().parents[2]


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    report = {}
    with sync_playwright() as pw:
        with pw.chromium.launch(**chromium_options()) as browser:
            page = browser.new_page(viewport={'width': 1440, 'height': 960})
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto((ROOT / 'tool/FireworkBaker.html').as_uri(), wait_until='domcontentloaded')
            page.wait_for_function('window.__fw', timeout=30000)
            report['startup'] = page.evaluate("() => ({gpu:document.getElementById('gpu').title, version:VERSION, baking:state.baking, form:state.P.form})")
            print(json.dumps(report['startup'], ensure_ascii=False), flush=True)
            verify_renderer(report['startup']['gpu'])
            page.evaluate("setReplica('JM4'); state.playing = false;")
            page.wait_for_function('state.bake && !state.baking && !state.dirty', timeout=240000)
            report['F0'] = page.evaluate("() => ({recipe:state.repId, cols:state.P.cols, rows:state.P.rows, frames:state.bake.meta.L.F, renderVer:state.P.renderVer})")
            assert report['F0'] == {'recipe': 'JM4', 'cols': 8, 'rows': 8, 'frames': 256, 'renderVer': 37}, report['F0']
            print('F0 passed', flush=True)
            report['versions'] = page.evaluate("""() => {
              const old = __fw.resolve({params:{type:'kiku',engine:'gpu'}}).P.renderVer;
              const modern = __fw.resolve({params:{type:'kiku',engine:'gpu',renderVer:40}}).P.renderVer;
              return {old, modern, template:defaultsFor('kiku').P.renderVer};
            }""")
            assert report['versions'] == {'old': 37, 'modern': 40, 'template': 40}
            page.evaluate("""() => {
              window.originalBake = bake; window.failedCalls = 0;
              bake = async () => { failedCalls++; await new Promise(r=>setTimeout(r, 10)); throw new Error('检查用：显卡帧缓冲失败'); };
              state.P.headBright += 0.01; onParam();
            }""")
            page.wait_for_function('state.failedGen === state.gen && !state.baking', timeout=30000)
            page.wait_for_timeout(800)
            report['F1'] = {'calls': page.evaluate('failedCalls'), 'views': {}}
            assert report['F1']['calls'] == 1
            for view in ['live', 'export', 'atlas']:
                page.locator(f'#viewSeg [data-view="{view}"]').click()
                assert page.locator('#bakeError').is_visible()
                report['F1']['views'][view] = page.locator('#bakeErrorText').inner_text()
            page.screenshot(path=str(out / '失败提示.png'))
            page.evaluate('() => { bake = originalBake; }')
            page.locator('#bakeRetry').click()
            page.wait_for_function('state.bake && !state.baking && !state.dirty', timeout=240000)
            assert not page.locator('#bakeError').is_visible()
            report['F1']['recovered'] = True
            report['pageErrors'] = errors
            assert not errors, errors
            report['pass'] = True
    (out / '浏览器检查.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('PASS', out, flush=True)


if __name__ == '__main__':
    main()
