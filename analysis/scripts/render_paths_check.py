"""4.0 whole-firework size scan, shared sampling, and encoded export radiance."""
import argparse
import base64
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_runtime import chromium_options, verify_renderer

ROOT = Path(__file__).resolve().parents[2]
SCAN = r"""async ({px,size}) => {
  state.stillBusy=true; clearTimeout(bakeTimer);
  const {P,M}=defaultsFor('kiku');
  Object.assign(P,{headSize:size,haloFrac:0,flash:0,subFlash:0,sparkRate:0,
    headBright:.25,exposure:1,zoom:'off',texW:2048,texH:2048,cols:2048/px,rows:2048/px});
  const frames=await renderStills(P,M,{times:[.8],px,metrics:true});
  return {px,size,...frames[0]};
}"""
PATHS = r"""async () => {
  state.stillBusy=true; clearTimeout(bakeTimer);
  const {P,M}=defaultsFor('kiku');
  Object.assign(P,{texW:1024,texH:1024,cols:2,rows:2,flash:0,subFlash:0,zoom:'off',
    headSize:2.4,headBright:.1,exposure:1,encGamma:1,haloFrac:0,outMode:'separate'});
  const pl=displayPlan40(P), t=pl.times[5]+pl.t0, captures={}; let route='bake';
  const original=drawFrameSamples40;
  drawFrameSamples40=function(P,pl,R,time,view,ppm,ppmY){
    const w=original(P,pl,R,time,view,ppm,ppmY);
    if(Math.abs(time-t)<1e-7){
      const vp=gl.getParameter(gl.VIEWPORT), a=new Float32Array(vp[2]*vp[3]*4);
      gl.readPixels(0,0,vp[2],vp[3],gl.RGBA,gl.FLOAT,a);
      let sumH=0,sumT=0,peak=0,hash=2166136261;
      const bytes=new Uint8Array(a.buffer); for(const v of bytes)hash=Math.imul(hash^v,16777619);
      for(let i=0;i<a.length;i+=4){sumH+=a[i];sumT+=a[i+1];peak=Math.max(peak,a[i]);}
      captures[route]={window:w,view,ppm,ppmY:ppmY||ppm,width:vp[2],height:vp[3],sumH,sumT,peak,hash:hash>>>0};
    }
    return w;
  };
  let b=null;
  try {
    b=await bake(P,1,null); route='live';
    Object.assign(state,{P,M,bake:b,bakeGen:state.gen,t,exportResolution:true});
    ensureTargets();renderLive40(); route='stills';
    await renderStills(P,M,{times:[t],px:512,plan:pl});
  } finally {drawFrameSamples40=original;state.bake=null;if(b)disposeBake(b);}
  const brightness=[];
  for(const gain of [1,2]){
    const Q={...P,headBright:P.headBright*gain,sparkRate:0};const b=await bake(Q,1,null);
    try{
      const a=readRGBA8(b.head);let sum=0,clipped=0;
      for(const v of a){if(v>=254)clipped++;sum+=-Math.log(1-Math.min(v/255,.999999));}
      brightness.push({gain,sum,clipped,exposure:b.meta.expoH});
    }finally{disposeBake(b);}
  }
  return {t,captures,brightness};
}"""


def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--out',required=True);args=ap.parse_args()
    out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
    report={'scan':[]};checks={}
    with sync_playwright() as pw:
        with pw.chromium.launch(**chromium_options()) as browser:
            p=browser.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
            p.goto((ROOT/'tool/FireworkBaker.html').as_uri()+'?fast')
            p.wait_for_function('window.__fw && __fw.idle()',timeout=180000)
            report['renderer']=verify_renderer(p.evaluate("document.querySelector('#gpu').title"))
            for px in [512,1024]:
                rows=[]
                for size in [.3,.6,1.2,2.4]:
                    row=p.evaluate(SCAN,{'px':px,'size':size})
                    (out/f'{px}_{size}.png').write_bytes(base64.b64decode(row.pop('png').split(',')[1]))
                    rows.append(row);print(px,size,row['linear'],flush=True)
                report['scan']+=rows
                checks[f'{px}: half-peak pixels strictly increase']=all(b['linear']['headHalfPixels']>a['linear']['headHalfPixels'] for a,b in zip(rows,rows[1:]))
                checks[f'{px}: peak never falls by over 10%']=all(b['linear']['headPeak']>=a['linear']['headPeak']*.9 for a,b in zip(rows,rows[1:]))
                checks[f'{px}: energy responds to every size']=all(b['linear']['headSum']>a['linear']['headSum']*3.5 for a,b in zip(rows,rows[1:]))
            report['paths']=p.evaluate(PATHS)
            c=report['paths']['captures'];checks['all three routes sampled']=set(c)=={'bake','live','stills'}
            checks['same shutter and sample pixels (stronger than 10% trail length)']=len({json.dumps(v,sort_keys=True) for v in c.values()})==1
            a,b=report['paths']['brightness'];ratio=b['sum']/a['sum']
            report['decodedBrightnessRatio']=ratio
            checks['head brightness x2 gives decoded export energy x2 ±10%']=1.8<ratio<2.2 and not a['clipped'] and not b['clipped']
            checks['fixed export exposure']=a['exposure']==b['exposure']==1
            report['pageErrors']=errors;checks['no page errors']=not errors
    report.update(checks=checks,passed=all(checks.values()))
    (out/'整花与三路径.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(checks,ensure_ascii=False,indent=2),flush=True)
    if not report['passed']:raise SystemExit(1)


if __name__=='__main__':main()
