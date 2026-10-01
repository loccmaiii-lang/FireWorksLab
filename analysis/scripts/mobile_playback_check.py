"""Verify separately baked PC/mobile targets and the actual exported asset references."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_runtime import chromium_options,verify_renderer
ROOT=Path(__file__).resolve().parents[2]
JS=r"""async () => {
  state.stillBusy=true;clearTimeout(bakeTimer);
  const {P,M}=defaultsFor('kiku');Object.assign(P,{renderVer:40,texW:2048,texH:2048,cols:4,rows:4});
  const b=await bake(P,1,null);let mobile=null;
  try {
    const available=typeof bakeMobileFor==='function';
    if(!available)return {checks:{'independent mobile bake exists':false}};
    mobile=await bakeMobileFor(b); b.mobile=mobile;
    const files=await platformFiles('Check',b,M), names=files.map(x=>x[0]);
    const decode=name=>JSON.parse(new TextDecoder().decode(files.find(f=>f[0]===name)[1]));
    const pc=decode('cascade.json'),phone=decode('cascade_mobile.json');
    const referenced=JSON.stringify(phone.textures);
    const pcBytes=readRGBA8(b.head), mobBytes=readRGBA8(mobile.head);
    const checks={
      'independent GPU target':b.head!==mobile.head,
      'PC actual cell 512':b.cw===512&&b.N===2048,
      'mobile actual cell 256':mobile.cw===256&&mobile.N===1024,
      'same frame count':b.meta.L.F===mobile.meta.L.F,
      'same frame times':JSON.stringify(b.meta.times)===JSON.stringify(mobile.meta.times),
      'mobile texture assets present':names.some(x=>x.includes('_Mobile')&&x.endsWith('.png')),
      'mobile manifest references mobile textures':referenced.includes('_Mobile'),
      'correct platform labels':pc.platform==='pc'&&phone.platform==='mobile',
      'both textures nonempty':pcBytes.some(v=>v>0)&&mobBytes.some(v=>v>0),
    };
    state.bake=b;state.platform='mobile';checks['viewer selects real mobile target']=previewBake()===mobile;
    state.platform='pc';checks['PC selection retains original target']=previewBake()===b;
    return {checks,pc:{size:b.N,cell:b.cw,frames:b.meta.L.F},mobile:{size:mobile.N,cell:mobile.cw,frames:mobile.meta.L.F},files:names,phoneTextures:phone.textures};
  }finally{state.bake=null;disposeBake(b);}
}"""
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--out',required=True);ap.add_argument('--html',default='tool/FireworkBaker.html');a=ap.parse_args()
    with sync_playwright() as pw:
        with pw.chromium.launch(**chromium_options()) as b:
            p=b.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
            p.goto((ROOT/a.html).as_uri()+'?fast');p.wait_for_function('window.__fw && __fw.idle()')
            gpu=verify_renderer(p.evaluate("document.querySelector('#gpu').title"));r=p.evaluate(JS);r['renderer']=gpu
            if r['checks'].get('independent GPU target'):
                p.evaluate("() => {state.stillBusy=false;setType('kiku');state.playing=false;state.view='export';}")
                p.wait_for_function('state.bake && !state.dirty && !state.baking',timeout=180000)
                p.locator('#platformSeg [data-platform="mobile"]').click()
                p.wait_for_function('state.bake.mobile && !state.dirty && !state.baking',timeout=180000)
                r['checks']['UI switches to 256 px mobile cell']=p.evaluate('previewBake().cw===256')
                r['checks']['game distance control visible']=p.locator('#distBox').is_visible()
                r['checks']['real framebuffer stays fixed within a tick']=p.evaluate("""() => {
                  state.stillBusy=true;state.t=.801;ensureTargets();renderExport();const a=canvas.toDataURL();
                  state.t=.832;renderExport();return a===canvas.toDataURL();
                }""")
                r['checks']['WebGL reports no error']=p.evaluate('gl.getError()===gl.NO_ERROR')
                p.screenshot(path=str(Path(a.out).with_suffix('.png')))
            r['pageErrors']=errors;r['checks']['no page errors']=not errors
    r['pass']=all(r['checks'].values());out=Path(a.out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(r['checks'],ensure_ascii=False,indent=2))
    if not r['pass']:raise SystemExit(1)
if __name__=='__main__':main()
