"""火花平方阻力演示（4.9.71，对话框FanGold，用户 10-12 22:49 / 22:59）：金曜菊-A 节奏快版（我的配方 my_fxmuxvrom6）的金锦层，燃尽前后五个时刻，
原样（跟随 0.03、只有线性阻力）对比 跟随 1 + 火花终端速度 3 m/s + 线性阻力 0.5。只出对比图，不改效果。
  python analysis/scripts/火花平方阻力演示.py --out 目录
"""
import argparse, asyncio, json, sys, pathlib, glob, base64, io
HERE = pathlib.Path(__file__).resolve().parent; sys.path.insert(0, str(HERE)); ROOT = HERE.parents[1]
from browser_runtime import launch_async
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont
rec = json.load(open(glob.glob(str(ROOT/'analysis/我的配方/my_fxmuxvrom6/*.json'))[0], encoding='utf-8'))
L = rec['snap']['layers'][1]
TIMES=[1.6,1.8,1.95,2.1,2.4]     # 金锦层点火晚 0.33 s（±11 %）、烧 1.5 s（±5 %）→ 约 1.7–1.95 s 陆续燃尽
VARS={'原样（跟随 0.03，只有线性阻力）':{}, '跟随 1 + 终端速度 3 m/s + 线性阻力 0.5':{'sparkInherit':1,'sparkInhJit':0,'sparkVt':3,'sparkDrag':0.5}}
async def main():
    async with async_playwright() as p:
        b = await launch_async(p); pg = await b.new_page()
        await pg.goto((ROOT/'tool/FireworkBaker.html').as_uri()+'?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof renderStills40 === "function"', timeout=0)
        rows=[]
        for name,o in VARS.items():
            r = await pg.evaluate("""async (a)=>{ const P=derive({...structuredClone(defaultsFor(a.P.type).P), ...a.P, ...a.o}); const M={...structuredClone(defaultsFor(a.P.type).M), stages:a.L.stages, ramp0:a.L.ramp0, ramp1:a.L.ramp1, ramp2:a.L.ramp2, ramp3:a.L.ramp3};
              return (await renderStills40(P, M, {times:a.t, px:300, cx:60, cy:60, half:75})).map(x=>x.png); }""", {'P':L['P'],'L':L['L'],'o':o,'t':TIMES})
            rows.append((name,[Image.open(io.BytesIO(base64.b64decode(x.split(',',1)[1]))).convert('RGB') for x in r]))
        await b.close()
    F=ImageFont.load_default()
    for fp in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','C:/Windows/Fonts/msyh.ttc'):
        if pathlib.Path(fp).exists(): F=ImageFont.truetype(fp,15); break
    W=300; S=Image.new('RGB',(W*len(TIMES), 30+(W+24)*len(rows)),(12,13,18)); d=ImageDraw.Draw(S)
    for c,t in enumerate(TIMES): d.text((c*W+6,6),f'开花后 {t:.2f} s'+('（约 1.7–1.95 s 陆续燃尽）' if c==1 else ''),fill=(255,220,150),font=F)
    for r,(name,ims) in enumerate(rows):
        y=30+r*(W+24); d.text((6,y),name,fill=(220,220,220),font=F)
        for c,im in enumerate(ims): S.paste(im,(c*W,y+22))
    out=pathlib.Path(A.out); out.mkdir(parents=True,exist_ok=True); S.save(str(out/'金曜菊金锦层_末段对比.jpg'),quality=90); print('写好', out)
ap=argparse.ArgumentParser(); ap.add_argument('--out',required=True); A=ap.parse_args()
asyncio.run(main())
