"""Production WebGL regression for opt-in point profiles (POINT17).

Run through 标准检查.py --point-profile-only, with Playwright on PYTHONPATH.
"""
import argparse
import base64
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from point_light_diagnostic import SHOT

ROOT = Path(__file__).resolve().parents[2]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(ROOT / 'analysis/results/POINT17_IMPL'))
    args = ap.parse_args()
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    # Reuse measurement apparatus, but exercise the production shader directly.
    shot = SHOT.replace("cellPad:0,outMode:", "coreProfile:a.profile==='gaussian'?1:0,cellPad:0,outMode:")
    shot = shot.replace("if(a.profile==='gaussian')PR40.pts=window.diagGaussian;", "")
    rows, checks = [], []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True,
                             args=['--use-angle=d3d11', '--ignore-gpu-blocklist'])
        pg = b.new_page(); errors = []; pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.add_init_script('window.requestAnimationFrame=()=>0;')
        pg.goto((ROOT / 'tool/FireworkBaker.html').as_uri()+'?fast', wait_until='load')
        meta = pg.evaluate("""() => {state.playing=false;clearTimeout(bakeTimer);setAutoBake(false);window.diagMat=compile(VS_QUAD,FS_MAT);
          const ext=gl.getExtension('WEBGL_debug_renderer_info');
          return {version:VERSION,renderer:gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
            default:qualityOf({}).coreProfile,enabled:qualityOf({coreProfile:1}).coreProfile};} """)
        checks.append({'name':'production profile defaults compatible and accepts gradient', 'pass':meta.get('default') == 0 and meta.get('enabled') == 1})
        if checks[-1]['pass']:
            contracts=pg.evaluate("""()=>{
              const saved=particleQuality,gauss=PT_GAUSS;
              try {setParticleProfile({});const legacy=particleProgram40('pts')===PR40.pts;
                setParticleProfile({coreProfile:1});PT_GAUSS=1;const flash=particleProgram40('pts')===PR40.pts;PT_GAUSS=0;
                REPLICA_BY_ID.POINT17_TEST={id:'POINT17_TEST',base:'botan',p:{renderVer:40,coreProfile:1}};
                const ver=entryVer({id:'POINT17_TEST',ver:'profile-test',kind:'preset'});
                delete REPLICA_BY_ID.POINT17_TEST;
                return {legacy,flash,versioned:ver.includes('4.3.8-core1')};
              }finally{particleQuality=saved;PT_GAUSS=gauss;}}""")
            checks.append({'name':'default shader, opening flash and opt-in output fingerprint contracts','pass':all(contracts.values()),'data':contracts})
            for halo in [0, .22]:
                for profile in ['disk', 'gaussian']:
                    for phase in [i/8 for i in range(9)]:
                        a = dict(size=.65, I=3, ppm=5.5889385, phase=phase, halo=halo, profile=profile,
                                 exposure=.4, gain=4.2656411)
                        r = pg.evaluate(shot, a)
                        if phase in [0,.5]:
                            (out / f'point_{halo}_{profile}_{phase}.png').write_bytes(base64.b64decode(r['png'].split(',')[1]))
                        for key in ['png','linearR','encodedR']: r.pop(key)
                        rows.append(r)
            for halo in [0,.22]:
                a = [r for r in rows if r['input']['halo']==halo and r['input']['profile']=='gaussian']
                sums=[r['linear']['sum'] for r in a]
                disk=[r['linear']['sum'] for r in rows if r['input']['halo']==halo and r['input']['profile']=='disk']
                checks.append({'name':f'gradient phase energy stable halo={halo}', 'pass':max(sums)/min(sums)-1 < .005})
                checks.append({'name':f'gradient energy matches disk halo={halo}', 'pass':abs(sum(sums)/sum(disk)-1)<.005})
                if halo:
                    hs=[r['hdr']['sum'] for r in a]
                    checks.append({'name':'1024-equivalent gradient encoded phase fluctuation <3%', 'pass':max(hs)/min(hs)-1<.03,'fluctuation':max(hs)/min(hs)-1})
                    checks.append({'name':'highlight is not clipped', 'pass':max(r['encoded']['peak'] for r in a)<250})
            checks.append({'name':'WebGL has no errors', 'pass':all(r['glError']==0 for r in rows) and not errors})
        b.close()
    result=dict(meta=meta,checks=checks,rows=rows,errors=errors,passed=all(c['pass'] for c in checks))
    (out/'point_profile_check.json').write_text(json.dumps(result,ensure_ascii=False,indent=1),encoding='utf-8')
    print(json.dumps(dict(meta=meta,checks=checks,passed=result['passed']),ensure_ascii=False,indent=1))
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
