"""隔离新浏览器，只读取最终候选的真实查看器和控件状态。"""
from pathlib import Path
import base64
import io
import json
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'analysis/local/SparkGraph/runtime'))
sys.path.insert(0, str(ROOT / 'analysis/scripts'))
from playwright.sync_api import sync_playwright
from browser_runtime import chromium_options

with sync_playwright() as pw:
    with pw.chromium.launch(channel='msedge', headless=True, **chromium_options()) as browser:
        pg = browser.new_page(viewport={'width':1600,'height':1100})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto((ROOT / 'tool/FireworkBaker.html').as_uri() + '?fast', wait_until='domcontentloaded')
        pg.wait_for_function('window.__fw && typeof FW_REVIEW_LIST!=="undefined"')
        pg.evaluate("openReview(FW_REVIEW_LIST.find(e=>e.id==='PRISM3'));state.playing=false")
        pg.wait_for_function("state.tab==='combo' && state.layers.length===4 && wbIdle()", timeout=90000)
        pg.evaluate("state.view='export';bakeNow({quiet:true})")
        pg.wait_for_function('wbIdle() && !bakesPending()', timeout=90000)
        report = pg.evaluate("""()=>({version:VERSION,entry_ver:entryVer(FW_REVIEW_LIST.find(e=>e.id==='PRISM3')),
            layers:state.layers.map((L,i)=>({index:i,title:L.title,ringFrac:layerEntryOf(L).P.ringFrac,config:EventInstances.config(L)})),
            game_distances:[800,1000,1200].map(d=>({distance:d,pxPerM:gamePixelsPerMeter(layerEntryOf(state.layers[0]).P,1,canvas.height,d)})),
            renderEntry:typeof renderEventInstances, errors:[]})""")
        report['panel_layers'] = []
        for i in range(4):
            pg.evaluate('(i)=>{state.comboSel=i;buildMasterPanel();buildLayerHead(i)}', i)
            controls = pg.locator('#eventInstancePanel input, #eventInstancePanel select').evaluate_all('(xs)=>xs.map(x=>({id:x.id,type:x.type,value:x.value,disabled:x.disabled}))')
            report['panel_layers'].append({'index':i,'controls':controls})
        pg.evaluate("state.comboSel=0;buildMasterPanel();buildLayerHead(0);state.t=1.4;state.disp='fit';ensureTargets();renderEventInstances(false)")
        pg.screenshot(path=str(OUT / '实际查看器入口.png'))
        for d in [800,1000,1200]:
            data = pg.evaluate("""d=>{state.disp='game';state.dist=d;ensureTargets();renderEventInstances(false);return canvas.toDataURL('image/png').split(',')[1]}""", d)
            Image.open(io.BytesIO(base64.b64decode(data))).save(OUT / f'实际游戏内大小_{d}m.png')
        report['errors'] = errs
        (OUT / '查看器只读核查.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps({'version':report['version'],'entry_ver':report['entry_ver'],'layers':len(report['layers']), 'panel_controls':[len(x['controls']) for x in report['panel_layers']], 'game_distances':report['game_distances'],'errors':errs}, ensure_ascii=False, indent=2))
