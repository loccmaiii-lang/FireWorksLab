"""Energy and size checks in the actual floating-point particle render target."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_runtime import chromium_options, verify_renderer

ROOT = Path(__file__).resolve().parents[2]
JS = r"""() => {
  state.stillBusy = true; clearTimeout(bakeTimer);
  const q = [];
  function sample(size, ppm=4, N=128, x=.125, brightness=0.1) {
    const P={...defaultsFor('kiku').P, renderVer:40, haloFrac:0, haloR:3};
    setParticleProfile(P); PPMY=0; gl.activeTexture(gl.TEXTURE0);
    const target=new Target(N,N,gl.RGBA16F); target.clear(); target.bind(); additive(true);
    drawPoints(new Float32Array([x,.125,brightness,size]),1,[0,0,N/(2*ppm),N/(2*ppm)],ppm,[1,0,0,0],1);
    additive(false); const data=new Float32Array(N*N*4);
    gl.readPixels(0,0,N,N,gl.RGBA,gl.FLOAT,data); target.dispose();
    let sum=0,peak=0,half=0; for(let i=0;i<data.length;i+=4){sum+=data[i];peak=Math.max(peak,data[i]);}
    for(let i=0;i<data.length;i+=4)if(data[i]>peak*.5)half++;
    return {size,ppm,N,x,brightness,sum,peak,half,expected:Math.PI*(size*.5*ppm)**2*brightness};
  }
  for(const size of [.3,.6,1.2,2.4])q.push(sample(size));
  const tiny=[0,.03125,.0625,.09375,.125].map(x=>sample(.04,4,128,x));
  const large=sample(12,100,1536);
  const bright=[sample(1.2,4,128,0,.1),sample(1.2,4,128,0,.2)];
  return {q,tiny,large,bright,pointLimit:PT_MAX};
}"""


def main():
    ap=argparse.ArgumentParser(description=__doc__); ap.add_argument('--out',required=True); a=ap.parse_args()
    out=Path(a.out); out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        with pw.chromium.launch(**chromium_options()) as b:
            p=b.new_page(); p.goto((ROOT/'tool/FireworkBaker.html').as_uri()+'?fast')
            p.wait_for_function('window.__fw && __fw.idle()')
            renderer=verify_renderer(p.evaluate("document.querySelector('#gpu').title"))
            result=p.evaluate(JS); result['renderer']=renderer
    checks={
        'surface energy proportional to core area':all(abs(x['sum']/x['expected']-1)<.025 for x in result['q']),
        'half-peak area strictly increases':all(b['half']>a['half'] for a,b in zip(result['q'],result['q'][1:])),
        'peak never decreases by over 10%':all(b['peak']>=a['peak']*.9 for a,b in zip(result['q'],result['q'][1:])),
        'subpixel energy changes under 2% across pixel boundary':max(x['sum'] for x in result['tiny'])/min(x['sum'] for x in result['tiny'])<1.02,
        'oversized core is not clipped by point-size limit':abs(result['large']['sum']/result['large']['expected']-1)<.025,
        'doubling radiance doubles linear energy':abs(result['bright'][1]['sum']/result['bright'][0]['sum']-2)<.02,
    }
    result['checks']=checks; result['pass']=all(checks.values())
    (out/'光点检查.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(checks,ensure_ascii=False,indent=2),flush=True)
    if not result['pass']:raise SystemExit(1)


if __name__=='__main__':main()
