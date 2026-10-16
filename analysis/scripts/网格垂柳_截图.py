# 网格垂柳仿真预览截图自检（无头 Chrome，只读本地页面）
# 用法：PYTHONPATH=analysis/local/monitor_state/deps python analysis/scripts/网格垂柳_截图.py [--out 目录] [--N N400]
import argparse, pathlib, time
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont

root = pathlib.Path(__file__).resolve().parents[2]
ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(root / 'analysis/local/MESH_WILLOW_20261016/预览截图_png'))
ap.add_argument('--sheets', default=str(root / 'analysis/results/MESH_WILLOW_20261016/预览截图'))
ap.add_argument('--N', default='N400')
a = ap.parse_args()
out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
page_url = (root / 'tool/prototypes/mesh-willow-v1/index.html').as_uri()
TIMES = [1.0, 2.4, 3.3, 5.3, 7.0, 8.3, 9.3]
# 机位：游戏内大小（1000 m、仰角 20°）/ 侧面转 90°（看世界固定、不转）/ 正下方 / 放大看细节
# 游戏视角 = 地面 1000 m 外仰看 400 m 高的开花点（仰角约 22°）
VIEWS = [('game', dict(dist=1000, elev=-22, azim=0, zoom=1)), ('azim90', dict(dist=1000, elev=-22, azim=90, zoom=1)),
         ('below', dict(dist=400, elev=-88, azim=0, zoom=1)), ('zoom3', dict(dist=1000, elev=-22, azim=0, zoom=3))]
try:
    font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 22)
except Exception:
    font = ImageFont.load_default()
shots = {}
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', headless=True, args=['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 960, 'height': 540})
    for N in sorted({a.N, 'N200', 'N300', 'N400'}):
        for vname, v in VIEWS:
            if N != a.N and vname != 'game':
                continue
            for t in TIMES:
                q = '&'.join(f'{k}={val}' for k, val in v.items())
                pg.goto(f'{page_url}?N={N}&t={t}&{q}&ui=0')
                pg.wait_for_function('window.__ready && window.__ready()', timeout=20000)
                time.sleep(0.35)
                f = out / f'{N}_{vname}_{t:.1f}.png'
                pg.screenshot(path=str(f))
                shots[(N, vname, t)] = f
    b.close()

def sheet(rows, name, title):
    w, h = 480, 270
    img = Image.new('RGB', (w * len(TIMES), (h + 34) * len(rows) + 44), (8, 10, 14))
    d = ImageDraw.Draw(img); d.text((10, 8), title, fill=(220, 225, 235), font=font)
    for r, (key, label) in enumerate(rows):
        for c, t in enumerate(TIMES):
            im = Image.open(shots[key + (t,)]).convert('RGB').resize((w, h), Image.LANCZOS)
            y = 44 + r * (h + 34); img.paste(im, (c * w, y + 30))
            d.text((c * w + 8, y + 2), f'{label}  +{t:.1f} s', fill=(200, 205, 215), font=font)
    sd = pathlib.Path(a.sheets); sd.mkdir(parents=True, exist_ok=True)
    img.save(sd / name, quality=88)
    return sd / name

s1 = sheet([((a.N, 'game'), '游戏视角 1000 m 仰看'), ((a.N, 'azim90'), '方位转 90°'), ((a.N, 'below'), '正下方 400 m 仰看'), ((a.N, 'zoom3'), '游戏视角放大 ×3')],
           f'{a.N}_机位对照.jpg', f'网格垂柳 · 鸿巢四尺玉主层 · {a.N[1:]} 束 · Cascade 仿真预览（未经 UE 验证）')
s2 = sheet([(('N200', 'game'), '200 束'), (('N300', 'game'), '300 束'), (('N400', 'game'), '400 束')],
           '束数对照_游戏内大小.jpg', '网格垂柳 · 200 / 300 / 400 束 · 游戏内大小 1000 m（仿真预览，未经 UE 验证）')
print(s1); print(s2)
