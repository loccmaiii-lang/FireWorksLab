"""UI save/reload, production GPU path, exposure and dual-platform export smoke."""
import base64
import hashlib
import io
import json
import zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from point_profile_regression import standard

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'analysis/results/POINT17_IMPL'
PACK=ROOT/'analysis/local/POINT17_IMPL/export'

def main():
    checks=[];errors=[]
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True,args=['--use-angle=d3d11','--ignore-gpu-blocklist'])
        pg=b.new_page(viewport={'width':1680,'height':1000});pg.on('pageerror',lambda e:errors.append(str(e)))
        pg.add_init_script('window.requestAnimationFrame=()=>0;')
        url=(ROOT/'tool/FireworkBaker.html').as_uri()+'?fast';pg.goto(url,wait_until='load')
        pg.evaluate("""()=>{setAutoBake(false);openType('botan');clearTimeout(bakeTimer);state.dirty=false;
          focusParameterSection('m:曝光光晕');
          const row=panelRows.find(x=>x[1].sel==='coreProfile')[0];row.querySelector('select').id='testCoreProfile';} """)
        pg.locator('#testCoreProfile').select_option('1')
        pg.locator('input[id^="p-exposureTarget-"][type=range]').fill('0.8')
        pg.evaluate("""()=>{clearTimeout(bakeTimer);Object.assign(state.P,{headSize:.65,headBright:3,exposure:.4,outCell:1024,cols:2,rows:2,autoGrid:0});
          state.M.headInt=4.2656411;buildMasterPanel();state.dirty=false;state.t=.8;ensureTargets();renderLive40();focusParameterSection('m:曝光光晕');} """)
        pg.screenshot(path=str(OUT/'UI_曝光与亮核.png'))
        pg.locator('#colorControls').scroll_into_view_if_needed()
        pg.screenshot(path=str(OUT/'UI_显示强度.png'))
        pg.locator('#abSave').click();pg.locator('#saveNameInput').fill('POINT17 渐变亮核验证');pg.locator('#saveNameSubmit').click()
        pg.wait_for_function("wb.src.kind==='mine'", polling=100)
        sv=pg.evaluate('({key:wb.key,id:wb.src.id,snap:wbSnap()})')
        pg.reload(wait_until='load')
        pg.evaluate("""async a=>{setAutoBake(false);openType('botan');await wbLoad(a.id);clearTimeout(bakeTimer);state.dirty=false;}""",sv)
        cur=pg.evaluate('({P:state.P,M:state.M})')
        checks.append(dict(name='UI select and save/reload retain profile, highlight target and material intensity',passed=cur['P']['coreProfile']==1 and cur['P']['exposureTarget']==.8 and cur['M']['headInt']==4.2656411))
        recipe=dict(name='PointProfile_Botan',params=cur['P'],materialDefaults=cur['M'])
        (OUT/'验证配方.json').write_text(json.dumps(recipe,ensure_ascii=False,indent=1),encoding='utf-8')
        pg.evaluate("REPLICA_BY_ID.POINT17_TEST={id:'POINT17_TEST',base:'botan',p:state.P,m:state.M}")
        # Probe this exact edited recipe, without replicaPM's legacy duration extension.
        probe_js=standard.probe.JS_METRICS.replace('const r = __fw.replicaPM(id);','const r = {P:derive({...state.P}),M:state.M};')
        metrics=pg.evaluate(probe_js,dict(id='POINT17_TEST',fps=30,dists=[800,1000,1200],screenH=1080,frac=1/3))
        verdict=standard.probe.verdict(metrics,standard.STD)
        features=standard.features(dict(kind='preset',form='master',video=False))
        checks.append(dict(name='fixture standard checks',passed=metrics['duration']==cur['P']['duration'] and all(verdict.values()) and all(x[0] for x in features.values()),metrics=metrics,verdict=verdict,features=features))
        expo=pg.evaluate("""async()=>{const P={...state.P};const a=await autoExposure40({...P,exposureTarget:.96}),b=await autoExposure40({...P,exposureTarget:.8});return {a,b,ratio:b.value/a.value,expected:Math.log(.2)/Math.log(.04)};}""")
        checks.append(dict(name='highlight target affects suggested exposure predictably',passed=abs(expo['ratio']-expo['expected'])<1e-6,data=expo))
        # GPU sparks and heads share the production uniforms; check pixels, not just source text.
        gpu=pg.evaluate("""async()=>{const d=defaultsFor('kiku'),P={...d.P,headBright:0,coreProfile:0,shutter:0};
          const a=await renderStills(P,d.M,{times:[1],px:512});P.coreProfile=1;
          const c=await renderStills(P,d.M,{times:[1],px:512});return {changed:a[0].png!==c[0].png,gradientProgram:particleProgram40('spk')!==PR40.spk};}""")
        checks.append(dict(name='GPU-only sparks use gradient profile',passed=gpu['changed'] and gpu['gradientProgram'],data=gpu))
        # Keep a baked product briefly to inspect every engine tick through the actual playback renderer.
        frames=pg.evaluate("""async()=>{state.bake=await __fw.bake(state.P,1);state.bake.mobile=await bakeMobileFor(state.bake);state.bakeGen=state.gen;state.disp='fit';ensureTargets();
          const rows=[];for(const platform of ['pc','mobile']){state.platform=platform;
            if(!previewBake())throw Error('Missing '+platform+' playback product');
            for(let i=0;i<Math.floor(state.P.duration*30);i++){state.t=i/30;renderExport();if(i%3===0)rows.push({platform,t:state.t,png:canvas.toDataURL('image/png')});}}
          const profile=state.bake.meta.quality?.coreProfile;disposeBake(state.bake);state.bake=null;return {profile,rows};}""")
        for fr in frames['rows']:
            name=f"playback_{fr['platform']}_{round(fr['t']*30):03}.png"
            (OUT/name).write_bytes(base64.b64decode(fr.pop('png').split(',')[1]));fr['file']=name
        (OUT/'playback_frames.json').write_text(json.dumps(frames,ensure_ascii=False,indent=1),encoding='utf-8')
        encoded=pg.evaluate('async j=>__fw.exportZipB64(j,j.name)',recipe)
        data=base64.b64decode(encoded);PACK.mkdir(parents=True,exist_ok=True)
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            z.extractall(PACK)
            files=z.namelist()
        checks.append(dict(name='PC and mobile Cascade manifests exported',passed=any(f.endswith('cascade.json') for f in files) and any(f.endswith('cascade_mobile.json') for f in files)))
        checks.append(dict(name='no browser errors',passed=not errors,errors=errors))
        doc=dict(checks=checks,passed=all(c['passed'] for c in checks),files=files,zip_sha256=hashlib.sha256(data).hexdigest(),pack=str(PACK))
        (OUT/'delivery_check.json').write_text(json.dumps(doc,ensure_ascii=False,indent=1),encoding='utf-8');print(json.dumps(doc,ensure_ascii=False,indent=1));b.close()
    return 0 if doc['passed'] else 1

if __name__=='__main__':raise SystemExit(main())
