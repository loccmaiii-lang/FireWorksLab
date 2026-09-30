import sys, json
from playwright.sync_api import sync_playwright
tag=sys.argv[1]; times=[0.8,1.5]
with sync_playwright() as p:
    br = p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    pg = br.new_page(viewport={'width':1500,'height':950}); pg.goto(f'file:///tmp/ab/{tag}.html')
    pg.wait_for_function("state && state.bake && state.bake.meta", timeout=1200000)
    pg.evaluate("state.playing=false")
    info=pg.evaluate("(()=>{const m=state.bake.meta,P=state.P; return {cols:P.cols||4,rows:P.rows||4,chans:P.chans||4,texW:P.texW||state.res,expoH:m.expoH,expoT:m.expoT,S:m.S||m.Ww,gpu:(document.querySelector('#gpu')||{}).title||''}})()")
    print(tag,json.dumps(info),flush=True)
    for t in times:
        pg.evaluate(f"(()=>{{ state.t={t}; const s=document.querySelector('#scrub'); if(s){{ s.value=Math.round({t}/state.P.duration*1000); s.dispatchEvent(new Event('input',{{bubbles:true}})); }} state.t={t}; }})()")
        pg.wait_for_timeout(2500)
        el=pg.query_selector('#box') or pg.query_selector('#gl'); bb=el.bounding_box()
        pg.screenshot(path=f'/tmp/ab/{tag}_live_{t}.png', clip=bb, timeout=120000)
    br.close()
