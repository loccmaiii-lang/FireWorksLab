"""Exercise the actual in-app old/new baked playback showcase and capture key times."""
import argparse
import base64
import json
import io
from pathlib import Path
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright
from browser_runtime import chromium_options,verify_renderer
ROOT=Path(__file__).resolve().parents[2]
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--out',required=True);ap.add_argument('--cases',default='kiku,botan,kamuro,senrin,strobe,JM4,TR2S,TR2M,TR2L');ap.add_argument('--platform',choices=['pc','mobile'],default='pc');a=ap.parse_args()
    out=Path(a.out);out.mkdir(parents=True,exist_ok=True);report={'cases':[]}
    with sync_playwright() as pw:
        with pw.chromium.launch(**chromium_options()) as b:
            p=b.new_page(viewport={'width':1920,'height':1080});errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
            p.goto((ROOT/'tool/FireworkBaker.html').as_uri()+'?fast');p.wait_for_function('window.__fw && __fw.idle()')
            report['renderer']=verify_renderer(p.evaluate("document.querySelector('#gpu').title"))
            p.locator('#showcaseOpen').click();p.wait_for_function('showcase.left && !showcase.loading',timeout=240000)
            if a.platform=='mobile':
                p.locator('#platformSeg [data-platform="mobile"]').click();p.wait_for_function('showcase.left && showcase.left.mobile && !showcase.loading',timeout=240000)
            p.keyboard.press('f')
            for key in a.cases.split(','):
                if p.evaluate('showcase.key')!=key:
                    p.locator('#showcaseType').select_option(key)
                    p.wait_for_function('showcase.left && !showcase.loading',timeout=240000)
                row=p.evaluate("""() => ({key:showcase.key,left:showcase.left.P.renderVer,right:showcase.right.P.renderVer,
                  cells:[previewBake(showcase.left).cw,previewBake(showcase.right).cw],exposure:showcase.right.P.exposure,duration:showcase.left.P.duration,frames:[previewBake(showcase.left).meta.L.F,previewBake(showcase.right).meta.L.F],maxClip:previewBake(showcase.right).meta.check.maxClip,darkTail:previewBake(showcase.right).meta.darkTail})""")
                assert row['left']==37 and row['right']==(37 if key.startswith('TR2') else 40),row
                for t in [.05,.5,1.2,round(row['duration']*.7,2)]:
                    shot=p.evaluate("""t => {state.stillBusy=true;state.t=t;state.playing=false;ensureTargets();renderShowcase();return {png:canvas.toDataURL(),error:gl.getError()};}""",t)
                    png=base64.b64decode(shot['png'].split(',')[1]);(out/f'{key}_{t}.png').write_bytes(png);assert shot['error']==0,shot['error']
                    if key.startswith('TR2'):
                        im=Image.open(io.BytesIO(png)).convert('RGB');w,h=im.size
                        delta=max(hi for lo,hi in ImageChops.difference(im.crop((0,0,w//2,h)),im.crop((w//2,0,w,h))).getextrema())
                        row['paneMaxDelta']=max(row.get('paneMaxDelta',0),delta)
                        # 不同 viewport 的浮点采样/8 位显示容许 1 级舍入；原始 RGBA 兼容回归仍要求零差。
                        assert delta<=1,(key,t,'兼容左右画面超出一档显示量化差',delta)
                row['nonempty']=p.evaluate('readRGBA8(previewBake(showcase.left).head).some(v=>v>0)&&readRGBA8(previewBake(showcase.right).head).some(v=>v>0)')
                assert row['nonempty'];report['cases'].append(row);print(json.dumps(row),flush=True)
                p.evaluate('state.stillBusy=false')
            p.evaluate('state.t=.1;state.playing=true;')
            p.wait_for_function('state.t>.5');report['continuousPlayback']=True
            assert '渲染出错' not in p.locator('#hud').inner_text()
            p.evaluate('state.playing=false;')
            p.screenshot(path=str(out/'橱窗界面.png'))
            p.locator('#showcaseClose').click();p.wait_for_function('!showcase.active && !state.showcase')
            report['closed']=True;report['pageErrors']=errors;assert not errors,errors
    report['pass']=True;(out/'橱窗检查.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
if __name__=='__main__':main()
