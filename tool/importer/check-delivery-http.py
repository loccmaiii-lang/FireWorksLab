"""8034真实入口的隔离浏览器流程；全部UE请求拦截，不使用用户配置或存档。"""
import asyncio,hashlib,http.client,json,re
from pathlib import Path
from playwright.async_api import async_playwright

URL='http://127.0.0.1:8034/importer'
OUTPUT=Path('F:/FireWorksLab/analysis/local/IMPORT5_20261019_http.json')
receipt={'format':'df.firework-resource/1','status':'complete','resourceId':'test-stdio','revisionId':'fixture-r1','deliveryId':'test-stdio-r1','name':'Fixture','packages':[{'platform':'pc','name':'Fixture','directory':'D:/Fixture/PC','configFile':'cascade.json'},{'platform':'mobile','name':'Fixture_M','directory':'D:/Fixture/Mobile','configFile':'cascade_mobile.json'}]}
basic={'format':'fwl.cascade/1','name':'Fixture','textures':{},'materials':{'m':{'role':'soft_dot'}},'emitters':[{'name':'Spark','material':'m','max_alive':1,'required':{'duration_s':3},'modules':[]}]}

async def main():
    conn=http.client.HTTPConnection('127.0.0.1',8034,timeout=10);conn.request('GET','/importer');response=conn.getresponse();original=response.read();conn.close()
    assert response.status==200 and original==Path(__file__).parents[1].joinpath('df-fireworks-delivery_locmai.html').read_bytes()
    html=original.decode('utf-8');start=html.index('  async function importOne(it){');end=html.index('  async function execute(){',start)
    # 只在隔离页面内换成计数器；生产成品仍逐字节原样保留。
    native="""  async function importOne(it){window.__testWrites=(window.__testWrites||0)+1;const saved=[...new Set(Object.values(it.assets))];it.importProgress={stage:'粒子系统',saved,added:saved,edited:[]};log('资产写入完成，待交付登记','ok');}\n"""
    html=html[:start]+native+html[end:]
    results=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(channel='chrome',headless=True)
        for fail in [True,False]:
            ctx=await browser.new_context(viewport={'width':1440,'height':900})
            page=await ctx.new_page();errors=[];blocked=[];gate_calls=[]
            fail_register={'value':fail}
            page.on('pageerror',lambda e:errors.append(str(e)))
            async def route(req):
                if req.request.url==URL:
                    await req.fulfill(status=200,body=html,content_type='text/html');return
                if '/object/' not in req.request.url:
                    blocked.append(req.request.url);await req.abort();return
                b=req.request.post_data_json or {};code=b.get('args',{}).get('PythonCommand','');fn=b.get('function')
                def tagged(tag,value):return {'return_value':'True','out_LogOutput':'Output='+json.dumps(tag+json.dumps(value))}
                if fn=='GetPlatformName':data={'return_value':'Windows'}
                elif fn=='DoesAssetExist':data={'return_value':'False'}
                elif '# FWL_DELIVERY_GATE' in code:
                    register='u"--register"' in code;gate_calls.append(register)
                    data={'return_value':'False','out_CommandResult':'模拟登记进程不可用'} if fail_register['value'] and register else tagged('FWLDELIVERYGATE:',{'ok':True,'registry':{}})
                elif "print('FWLJSON:'" in code:
                    spec=json.loads(json.dumps(basic))
                    if 'cascade_mobile.json' in code:spec.update(name='Fixture_M',platform='mobile',tier='M')
                    data=tagged('FWLJSON:',{'spec':spec,'exists':{},'sourceHash':'fixture','textureHashes':{}})
                elif '# FWL_POLICY_DIRS' in code:data={'return_value':'True'}
                elif '# FWL_DELIVERY_REGISTER_VERIFY' in code:
                    assert not re.search(r'save_asset|set_editor_property|import_asset_tasks|check_out|create_asset',code)
                    data={'return_value':'True','out_LogOutput':'Output='+json.dumps('FWLDELIVERYSAVED:ok')}
                else:raise AssertionError('未声明的UE请求被拦截：'+str(fn))
                await req.fulfill(status=200,json={'success':True,'data':data})
            await page.route('**/*',route)
            await page.goto(URL,wait_until='domcontentloaded')
            await page.evaluate('(receipt)=>FwImporter.acceptDelivery(receipt)',receipt)
            await page.evaluate('FwImporter.confirmCurrent();FwImporter.confirmCurrent()')
            assert await page.locator('#fwimp-btnExec').is_enabled()
            await page.evaluate('FwImporter.execute()')
            data=await page.evaluate("({writes:window.__testWrites,rows:FwImporter.deliveryState()['test-stdio-r1'].rows,log:document.getElementById('log').textContent})")
            if fail:
                assert data['writes']==1
                row=data['rows'][0];assert row['state']=='failed' and row['importProgress']['stage']=='交付登记' and len(row['importProgress']['saved'])==len(set(row['assets'].values()))
                assert '交付登记中止' in data['log'] and '未完成的是交付登记' in ' '.join(row['errs'])
                assert not any('未完成的粒子系统' in e for e in row['errs'])
                assert await page.evaluate("FwImporter.deliveryView().current.platform")=='pc'
                assert await page.locator('#fwimp-reviewContent').inner_text()
                assert '交付登记失败' in await page.locator('#fwimp-reviewContent').inner_text()
                await page.screenshot(path='F:/FireWorksLab/analysis/local/IMPORT5_20261019_HTTP_fixture.png')
                legacy=json.loads(await page.evaluate("localStorage.getItem('fwimp.delivery.v1')"))
                assert await page.locator('#fwimp-primary').get_attribute('data-action')=='registration'
                fail_register['value']=False
                await page.locator('#fwimp-primary').click()
                await page.wait_for_function("FwImporter.deliveryState()['test-stdio-r1'].rows[0].state==='done'",polling=100)
                assert await page.evaluate('window.__testWrites')==1
                results.append({'scenario':'registration_retry','newUEWrites':0,'recoveredPC':True})
                old=next(b for b in legacy['batches'] if b['id']==legacy['active'])['rows'][0];old['importProgress']['stage']='粒子系统';old['errs']=['UE Python出错：WindowsError: [Error 87]']
                await page.evaluate('(state)=>localStorage.setItem("fwimp.delivery.v1",JSON.stringify(state))',legacy)
                await page.reload(wait_until='domcontentloaded')
                assert await page.locator('#fwimp-primary').get_attribute('data-action')=='registration'
                await page.locator('#fwimp-primary').click()
                await page.wait_for_function("FwImporter.deliveryState()['test-stdio-r1'].rows[0].state==='done'",polling=100)
                assert await page.evaluate('window.__testWrites||0')==0
                results.append({'scenario':'old_error87_refresh_retry','newUEWrites':0,'recoveredPC':True})
            else:
                assert data['writes']==2 and all(x['state']=='done' for x in data['rows'])
                assert data['log'].count('交付登记完成')==2
            assert not errors,errors
            results.append({'scenario':'registration_failure' if fail else 'success','native_fixture_calls':data['writes'],'registrations':sum(gate_calls),'states':[r['state'] for r in data['rows']],'pageErrors':errors,'actualUERequests':0})
            await ctx.close()
        await browser.close()
    OUTPUT.write_text(json.dumps({'url':URL,'productionSHA256':hashlib.sha256(original).hexdigest(),'productionSourceVerified':True,'nativeWritesMocked':True,'results':results},ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(results,ensure_ascii=False))

if __name__=='__main__':asyncio.run(main())
