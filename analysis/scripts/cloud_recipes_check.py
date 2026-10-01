"""Exercise every runnable cloud recipe through the actual baked preview UI."""
import argparse,base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_runtime import chromium_options,verify_renderer
ROOT=Path(__file__).resolve().parents[2]
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);ap.add_argument('--cases');ap.add_argument('--mobile',action='store_true');a=ap.parse_args()
    out=Path(a.out);out.mkdir(parents=True,exist_ok=True);report={'cases':[]}
    with sync_playwright() as pw:
        with pw.chromium.launch(**chromium_options()) as b:
            p=b.new_page(viewport={'width':1680,'height':1000});errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
            p.goto((ROOT/'tool/FireworkBaker.html').as_uri()+'?fast');p.wait_for_function('window.__fw && __fw.idle()')
            report['renderer']=verify_renderer(p.evaluate("document.querySelector('#gpu').title"))
            assert p.evaluate("typeof CLOUD_RECIPES!=='undefined'"),'cloud recipe catalog missing'
            keys=a.cases.split(',') if a.cases else p.evaluate('CLOUD_RECIPES.filter(r=>r.layers).map(r=>r.id)')
            report['pending']=p.evaluate('CLOUD_RECIPES.filter(r=>r.missing).map(r=>({name:r.name,missing:r.missing}))')
            p.locator('#cloudRecipesOpen').click();p.wait_for_function('showcase.recipe && !showcase.loading',timeout=240000)
            if a.mobile:
                p.locator('#platformSeg [data-platform="mobile"]').click();p.wait_for_function('showcase.recipe && !showcase.loading && showcase.layers.every(l=>l.b.mobile)',timeout=240000)
            for key in keys:
                p.locator('#showcaseType').select_option('cloud:'+key);p.wait_for_function('showcase.recipe && !showcase.loading',timeout=240000)
                row=p.evaluate("""() => ({id:showcase.recipe.id,duration:curDuration(),layers:showcase.layers.map(l=>{const b=previewBake(l.b);return {name:l.name,version:b.P.renderVer,cell:b.cw,frames:b.meta.L.F,delay:l.delay,origin:l.origin,nonempty:readRGBA8(b.head).some(x=>x>0),clip:b.meta.check.maxClip,darkTail:b.meta.darkTail};})})""")
                assert row['id']==key,row
                assert p.evaluate('Math.abs(canvas.getBoundingClientRect().width/canvas.getBoundingClientRect().height-canvas.width/canvas.height)<.01'),'canvas stretched by layout'
                assert all(l['version']==40 and l['cell']>=(256 if a.mobile else 512) and l['nonempty'] for l in row['layers']),row
                for t in [0.8,1.6,round(row['duration']*.7,2)]:
                    shot=p.evaluate("""t=>{state.stillBusy=true;state.playing=false;state.t=t;ensureTargets();renderShowcase();const png=canvas.toDataURL();return {png,error:gl.getError()};}""",t)
                    (out/f'{key}_{t}.png').write_bytes(base64.b64decode(shot['png'].split(',')[1]));assert shot['error']==0
                p.evaluate('state.stillBusy=false');report['cases'].append(row);print(key,len(row['layers']),flush=True)
            p.evaluate("async()=>{const a=loadShowcase('cloud:core4'),b=loadShowcase('cloud:four_colors');await Promise.all([a,b]);}")
            assert p.evaluate("showcase.recipe.id==='four_colors' && showcase.layers.length===4")
            p.locator('#cloudLayer').select_option('1');assert p.evaluate('showcase.solo===1')
            p.locator('#cloudLayer').select_option('-1');report['rapidSwitchAndSolo']=True
            with p.expect_download() as dl:p.locator('#showcaseParams').click()
            saved=json.loads(Path(dl.value.path()).read_text(encoding='utf-8'))
            assert saved['id']=='four_colors' and len(saved['layers'])==4 and all(l['P']['renderVer']==40 for l in saved['layers'])
            report['download']=True
            p.evaluate("async()=>{const original=bake;try{bake=async()=>{throw Error('intentional cloud failure')};await loadShowcase('cloud:core1');}finally{bake=original;}}")
            assert p.evaluate('!showcase.loading && !state.stillBusy && !showcase.layers.length')
            assert 'intentional cloud failure' in p.locator('#showcaseNote').inner_text()
            p.evaluate("()=>loadShowcase('cloud:core2')");assert p.evaluate("showcase.recipe.id==='core2'");report['failureRecovery']=True
            p.evaluate('state.t=.1;state.playing=true');p.wait_for_function('state.t>.5');p.evaluate('state.playing=false')
            p.screenshot(path=str(out/'界面.png'));report['playback']=True
            p.locator('#showcaseType').select_option('kiku');p.wait_for_function('showcase.left && !showcase.loading',timeout=240000)
            assert p.evaluate('!showcase.recipe && showcase.layers.length===0')
            p.locator('#showcaseClose').click();p.wait_for_function('!showcase.active');report['restore']=True
            report['errors']=errors;assert not errors,errors
    report['pass']=True;(out/'配方检查.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
if __name__=='__main__':main()
