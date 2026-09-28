import sys, json, base64, io, zipfile, os, time
from playwright.sync_api import sync_playwright
"""升空尾缀批量导出：python trail_export.py <输出目录> S,M,L [是否4K 1/0] [参数覆盖json {S:{...}}]"""
outdir = sys.argv[1]; keys = sys.argv[2].split(','); k4 = int(sys.argv[3]) if len(sys.argv) > 3 else 1
over = json.load(open(sys.argv[4], encoding='utf-8')) if len(sys.argv) > 4 else {}
with sync_playwright() as pw:
    br = pw.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    pg = br.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(__import__('pathlib').Path(__file__).resolve().parents[2].joinpath('tool/FireworkBaker.html').as_uri() + '?fast'); pg.wait_for_function("window.__fw && window.__fw.idle()", timeout=0)
    for k in keys:
        t=time.time(); o = dict(over.get(k, {})); o['trExport4K'] = k4
        b64 = pg.evaluate(f"__fw.trailExport('trail{k}', {json.dumps(o)}, 'RiseTrail_{k}')")
        d = os.path.join(outdir, f'RiseTrail_{k}'); os.makedirs(d, exist_ok=True)
        zipfile.ZipFile(io.BytesIO(base64.b64decode(b64))).extractall(d)
        print(k, round(time.time()-t,1), 's', sorted(os.listdir(d)), flush=True)
    print(errs); br.close()
