"""彩千轮3.0组件的可重复内部导出；调用现有烘焙器真实出口，不写UE。"""
import base64
import io
import json
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'analysis/local/SparkGraph/runtime'))
sys.path.insert(0, str(ROOT / 'analysis/scripts'))
from playwright.sync_api import sync_playwright
from browser_runtime import chromium_options, verify_renderer

OUT = ROOT / 'analysis/results/PRISM3_20261016'


def recipes():
    """造型是不同点位/径向层次的小牡丹，不改变参考的花型语汇。"""
    common = dict(type='botan', form='master', renderVer=40, duration=2.98,
                  stars=80, v0=55, vt=8, grav=0, burn=2.15, burnJit=8,
                  speedJit=4, dirJit=1.5, sparkRate=0, flash=0,
                  lastFlare=0, headSize=.65, headBright=1, fade=.32,
                  flicker=.08, strobeHz=0, shellNo=0, burstR0=0,
                  zoom='off', texW=2048, texH=2048, cols=4, rows=4,
                  chans=4, frameBudget='motion', frameMode='auto', autoGrid=0,
                  outMode='combined', pageTarget=1, maxHold=4,
                  expoMode='frames', expoQ=.7, exposure=1, trimLead=1,
                  shutter=.6, qSS=2, qMaxSub=16, outPC='seq', outMobile='off')
    variants = [('A', '圆整小牡丹', 11, 80, 4, {}),
                ('B', '疏枝小割', 37, 62, 18,
                 dict(pattern='cluster',clusterLayout='sphere',clusterN=7,
                      clusterCone=55,clusterStarsJit=18,clusterDirJit=5)),
                ('C', '内外错落小牡丹', 83, 96, 55, {})]
    return [dict(id='PRISM3-'+tag, name=label,
                 params={**common, 'seed':seed, 'stars':n, 'speedJit':spread, **extra},
                 materialDefaults=dict(stages=[[0,'#ffffff']], xw=.1, ramp0='#000000',
                            ramp1='#4a4a52', ramp2='#c8c8d0', ramp3='#ffffff',
                            headInt=1, tailInt=1)) for tag,label,seed,n,spread,extra in variants]


def main():
    OUT.mkdir(exist_ok=True)
    rs = recipes()
    (OUT/'组件配方.json').write_text(json.dumps(rs,ensure_ascii=False,indent=2),encoding='utf-8')
    with sync_playwright() as p:
        with p.chromium.launch(channel='msedge',headless=True,**chromium_options()) as b:
            pg=b.new_page(viewport={'width':1440,'height':1000})
            pg.goto((ROOT/'tool/FireworkBaker.html').as_uri()+'?fast',wait_until='domcontentloaded')
            pg.wait_for_function('window.__fw')
            renderer=verify_renderer(pg.evaluate("() => {const g=document.createElement('canvas').getContext('webgl2');return g.getParameter(g.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL)}"))
            print(renderer,flush=True)
            resolved=[]
            for r in rs:
                package=OUT/'组件'/r['id']
                package.mkdir(parents=True,exist_ok=True)
                pm=pg.evaluate('(id)=>__fw.replicaPM(id)',r['id'])
                ev=pg.evaluate('(id)=>entryVer(FW_REVIEW_LIST.find(e=>e.id===id))',r['id'])
                resolved.append(dict(id=r['id'],entry_ver=ev,**pm))
                z=pg.evaluate("""async r=>{const x=__fw.replicaPM(r.id);
                  const bytes=await __fw.exportFiles(x.P,x.M,'PrismWheels3_'+r.id.slice(-1),{size:'none'});
                  let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));
                  return btoa(s);} """,r)
                zipfile.ZipFile(io.BytesIO(base64.b64decode(z))).extractall(package)
                print('EXPORTED',r['id'],flush=True)
            (OUT/'已展开配方.json').write_text(json.dumps(resolved,ensure_ascii=False,indent=2),encoding='utf-8')
            (OUT/'导出环境.json').write_text(json.dumps({'renderer':renderer,'version':pg.evaluate('VERSION')},ensure_ascii=False,indent=2),encoding='utf-8')


if __name__=='__main__':
    main()
