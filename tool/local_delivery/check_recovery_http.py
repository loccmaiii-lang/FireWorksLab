"""8034真实成品与私有导入界面隔离回归；目录、UE响应全部模拟，不读取个人存档。"""
import asyncio
import hashlib
import http.client
import json
import sys
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tool/local_http'))
from preflight import verify

ORIGIN = 'http://127.0.0.1:8034'
RECEIPT = {
    'format': 'df.firework-resource/1', 'status': 'complete',
    'resourceId': 'fixture-recovery', 'deliveryId': 'fixture-recovery-r1',
    'revisionId': 'fixture-r1', 'name': 'Fixture', 'directory': 'D:/Fixture',
    'files': [], 'thumbnail': {'status': 'missing'},
    'packages': [
        {'platform': 'pc', 'name': 'Fixture', 'directory': 'D:/Fixture/PC', 'configFile': 'cascade.json'},
        {'platform': 'mobile', 'name': 'Fixture_M', 'directory': 'D:/Fixture/Mobile', 'configFile': 'cascade_mobile.json'},
    ],
}
BASIC = {'format': 'fwl.cascade/1', 'name': 'Fixture', 'textures': {},
         'materials': {'m': {'role': 'soft_dot'}}, 'emitters': [
             {'name': 'Spark', 'material': 'm', 'max_alive': 1,
              'required': {'duration_s': 3}, 'modules': []}]}


def get_host():
    connection = http.client.HTTPConnection('127.0.0.1', 8034, timeout=10)
    try:
        connection.request('GET', '/delivery-host')
        response = connection.getresponse()
        data = response.read()
        assert response.status == 200
        return data
    finally:
        connection.close()


async def main():
    print(verify('baker', ROOT))
    original = get_host()
    host = original.decode('utf-8')
    assert '--proofs-stdin' in host, '实际入口仍缺少Error 87修复，停止测试'
    start = host.index('  async function importOne(it){')
    end = host.index('  async function execute(){', start)
    # 只替换本次隔离页面内的原生资产写入；生产文件、服务和资源目录原样保留。
    native = """  async function importOne(it){window.__fixtureWrites=(window.__fixtureWrites||0)+1;
    const saved=[...new Set(Object.values(it.assets))];it.importProgress={stage:'粒子系统',saved,added:saved,edited:[]};}
"""
    fixture_host = host[:start] + native + host[end:]
    results = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome', headless=True)
        for width, height in [(1440, 900), (739, 470)]:
            context = await browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
            page = await context.new_page()
            errors, rejected = [], []
            available = {'resources': []}
            page.on('pageerror', lambda error: errors.append(str(error)))
            await page.add_init_script('window.requestAnimationFrame=()=>0')

            async def route(request):
                url = request.request.url
                if url.startswith(ORIGIN + '/delivery-host#') or url == ORIGIN + '/delivery-host':
                    await request.fulfill(body=fixture_host, content_type='text/html')
                    return
                if '/object/' in url:
                    body = request.request.post_data_json or {}
                    code = body.get('args', {}).get('PythonCommand', '')
                    fn = body.get('function')

                    def tagged(tag, value):
                        return {'return_value': 'True', 'out_LogOutput': 'Output=' + json.dumps(tag + json.dumps(value))}

                    if fn == 'GetPlatformName':
                        data = {'return_value': 'Windows'}
                    elif fn == 'DoesAssetExist':
                        data = {'return_value': 'False'}
                    elif '# FWL_DELIVERY_GATE' in code:
                        data = tagged('FWLDELIVERYGATE:', {'ok': True, 'registry': {}})
                    elif '# FWL_POLICY_DIRS' in code:
                        data = {'return_value': 'True'}
                    elif "print('FWLJSON:'" in code:
                        spec = json.loads(json.dumps(BASIC))
                        if 'cascade_mobile.json' in code:
                            spec.update(name='Fixture_M', platform='mobile', tier='M')
                        data = tagged('FWLJSON:', {'spec': spec, 'exists': {}, 'sourceHash': 'fixture', 'textureHashes': {}})
                    else:
                        rejected.append('未声明的UE请求：' + str(fn))
                        await request.abort()
                        return
                    await request.fulfill(json={'success': True, 'data': data})
                    return
                if url == ORIGIN + '/api/session':
                    # 更新前仍运行的8034服务：没有importerSource，不要求关闭现有进程。
                    await request.fulfill(json={'token': 'fixture', 'outputRoot': 'D:/Fixture', 'importerAvailable': True})
                elif url == ORIGIN + '/api/resources':
                    await request.fulfill(json=available)
                elif url.startswith(ORIGIN + '/api/import-receipts/'):
                    await request.fulfill(json={})
                elif request.request.method != 'GET' or not url.startswith(ORIGIN + '/'):
                    rejected.append('未声明的请求')
                    await request.abort()
                else:
                    await request.continue_()

            await page.route('**/*', route)
            await page.goto(ORIGIN + '/baker?fast', wait_until='domcontentloaded')
            await page.wait_for_function("typeof DeliveryWorkspace!=='undefined'", polling=100)
            await page.evaluate("DeliveryWorkspace.beginExport('directory','SkyRocketSparkler')")
            reason = '模拟目录连接失败，请重试' + (''.join('\n错误项' + str(i) + '：D:/Fixture/长路径/待检查资产' for i in range(40)) if width < 1000 else '')
            await page.evaluate("reason=>{DeliveryWorkspace.exportFailed(Error(reason));DeliveryWorkspace.finishExport()}", reason)
            await page.locator('#deliveryReturn').click()
            await page.locator('#deliveryOpen').click()
            await page.wait_for_function("document.querySelector('#deliveryStatus').dataset.error==='true'", polling=100)
            assert await page.locator('#deliveryBlocked').is_visible()
            assert '模拟目录连接失败' in await page.locator('#deliveryBlockedReason').inner_text()
            assert await page.locator('#deliveryFrame').is_hidden()
            rect = await page.locator('#deliveryReturn').bounding_box()
            assert rect and rect['y'] + rect['height'] <= height, '恢复按钮必须在可见区域内'
            if width == 1440:
                await page.screenshot(path=str(ROOT / 'analysis/local/IMPORT5_120_recovery.png'))
            else:
                await page.screenshot(path=str(ROOT / 'analysis/local/IMPORT5_120_long_error.png'))
            available['resources'] = [RECEIPT]
            await page.locator('#deliveryHistory').click()
            await page.locator('.delivery-resource').click()
            await page.wait_for_function("!document.querySelector('#deliveryFrame').hidden", polling=100)
            assert await page.locator('#deliveryBlocked').is_hidden()
            frame = page.frame_locator('#deliveryFrame')
            child = next(f for f in page.frames if '/delivery-host' in f.url)
            await frame.locator('#fwimp-primary[data-action="confirm"]').click()
            await frame.locator('#fwimp-primary[data-action="confirm"]').click()
            await frame.locator('#fwimp-btnExec').click()
            await child.wait_for_function("FwImporter.deliveryState()['fixture-recovery-r1'].rows.every(r=>r.state==='done')", polling=100)
            state = await child.evaluate("({writes:window.__fixtureWrites,platforms:FwImporter.deliveryState()['fixture-recovery-r1'].rows.map(r=>r.configFile)})")
            assert state['writes'] == 2
            assert set(state['platforms']) == {'cascade.json', 'cascade_mobile.json'}
            assert not errors, errors
            assert not rejected, rejected
            if width == 1440:
                await page.screenshot(path=str(ROOT / 'analysis/local/IMPORT5_120_recovered.png'))
            results.append({'viewport': [width, height], 'reentryReasonVisible': True,
                            'explicitHistoryRecovery': True, 'pcMobileFixtureWrites': state['writes'],
                            'actualUEOrDirectoryWrites': 0, 'pageErrors': errors})
            await context.close()
        await browser.close()
    report = {'entry': ORIGIN + '/baker', 'sourceVerified': True,
              'servedHostSHA256': hashlib.sha256(original).hexdigest(), 'results': results}
    (ROOT / 'analysis/local/IMPORT5_120_http.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(results, ensure_ascii=False))


if __name__ == '__main__':
    asyncio.run(main())
