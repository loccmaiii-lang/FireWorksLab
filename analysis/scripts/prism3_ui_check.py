"""隔离浏览器内验证新增组件打开/编辑/保存/刷新/导出；不改用户浏览器存档。"""
import json
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'analysis/local/SparkGraph/runtime'))
from playwright.sync_api import sync_playwright
from browser_runtime import chromium_options
OUT=ROOT/'analysis/results/PRISM3_20261016'

with sync_playwright() as p:
    with p.chromium.launch(channel='msedge',headless=True,**chromium_options()) as b:
        pg=b.new_page(viewport={'width':1600,'height':1100},accept_downloads=True)
        errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
        pg.goto((ROOT/'tool/FireworkBaker.html').as_uri()+'?fast',wait_until='domcontentloaded')
        pg.wait_for_function('window.__fw && typeof FW_REVIEW_LIST!=="undefined"')
        for tag in 'ABC':
            pg.evaluate('(id)=>openReview(FW_REVIEW_LIST.find(e=>e.id===id))','PRISM3-'+tag)
            pg.wait_for_function('!state.baking')
            assert pg.evaluate('state.P.v0')==55
            assert pg.evaluate('lib.review.doc.length')>=5
        pg.evaluate('openReview(FW_REVIEW_LIST.find(e=>e.id==="PRISM3-A"))')
        # 调整后保存、恢复；调用当前编辑器的参数入口，保存使用真实按钮。
        pg.evaluate('state.P.seed=12; onParam();')
        pg.locator('#abSave').click()
        pg.locator('#saveNameInput').fill('PRISM3流程检查（隔离）')
        pg.locator('#saveNameSubmit').click()
        pg.wait_for_function('lib.my && !wb.saving')
        saved=pg.evaluate('lib.my.id')
        pg.reload(wait_until='domcontentloaded');pg.wait_for_function('window.__fw')
        pg.evaluate('(id)=>openMyEffect(id)',saved)
        pg.wait_for_function('!state.baking')
        actual=pg.evaluate('state.tab==="combo"?layerEntryOf(state.layers[0]).P.seed:state.P.seed')
        assert actual==12,actual
        pg.wait_for_function('wbIdle()',timeout=120000)
        pg.evaluate("()=>{const s=document.querySelector('#deliveryDestination');s.value='zip';s.dispatchEvent(new Event('change',{bubbles:true}));}")
        # 实际素材包按钮；下载到本轮检查目录，不放入候选交付包。
        with pg.expect_download(timeout=30000) as dl:
            pg.locator('#abExportPack').click()
            pg.wait_for_timeout(1500)
            pg.screenshot(path=str(OUT/'烘焙器组件走查_导出入口.png'))
            print(pg.locator('dialog[open]').all_text_contents(),flush=True)
            print(pg.locator('#toast').all_text_contents(),flush=True)
        download=dl.value;download.save_as(OUT/'组件保存刷新导出.zip')
        pg.screenshot(path=str(OUT/'烘焙器组件走查.png'))
        assert not errors,errors
        (OUT/'组件界面走查.json').write_text(json.dumps({'opened':['PRISM3-A','PRISM3-B','PRISM3-C'],
            'saved_seed':actual,'refresh_preserved':True,'download':download.suggested_filename,
            'page_errors':errors,'scope':'只验证组件；不代表整体CPU事件查看器已接通'},ensure_ascii=False,indent=2),encoding='utf-8')
        print('组件打开、参数编辑、保存、刷新、真实按钮导出通过')
