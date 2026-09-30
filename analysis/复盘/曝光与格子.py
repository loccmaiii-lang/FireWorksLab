import json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    br = p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    for tag,url in (('v10','file:///tmp/ab/v10.html'),('head','file:///tmp/ab/head.html')):
        pg = br.new_page(viewport={'width':1500,'height':950}); pg.goto(url)
        pg.wait_for_function("state && state.bake && state.bake.meta", timeout=900000)
        m=pg.evaluate("(()=>{const m=state.bake.meta; const o={}; for(const k of Object.keys(m)){ const v=m[k]; if(typeof v==='number'||typeof v==='string') o[k]=v; } o.P={headBright:state.P.headBright, headSize:state.P.headSize, sparkBright:state.P.sparkBright, sparkSize:state.P.sparkSize, sparkRate:state.P.sparkRate, sparkLife:state.P.sparkLife, lastFlare:state.P.lastFlare, flash:state.P.flash}; return o;})()")
        print(tag, json.dumps(m,ensure_ascii=False)); pg.close()
    br.close()
