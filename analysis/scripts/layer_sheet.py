"""分层对照图：同一时刻的「实拍 / 每层单独模拟 / 组合模拟」（大组合返工用，2026-09-30）。

和 compare.py 的区别：
- 时间用**开花后的绝对秒**（不按燃烧进度归一化），这样层与层的点火、熄灭、交接时刻能直接和实拍对上；
- 尺度用**固定的米 / 像素**（配置里给实拍的像素 / 米），不按各自的最终半径缩放，大小、下垂、分布的差别不会被缩放掩盖；
- 每层单独渲染一行，再把各层加起来（加色）出组合行。

用法：python3 layer_sheet.py <配置.json> [输出.jpg] [--only 行号,...]
配置：
{
  "video": "vidio/...mp4", "t0": 4.20,                 # 视频里的开花时刻（秒）
  "center": [362, 310], "half": 400, "pxm": 1.0,       # 实拍：爆点像素坐标（原分辨率）、取景半宽（像素）、每米多少像素
  "cell": 300,                                         # 每格边长
  "view": [0, -180],                                   # 可选：取景中心相对爆点的偏移（像素，y 向下），看局部细节
  "times": [[0.5, "+0.5 s 白球"], ...],                # 开花后秒数 + 列标题
  "entries": "analysis/原理/条目_大组合.json",           # 层的来源（条目 id）；也可以直接写 P / M
  "layers": [{"id": "RK1", "name": "主层", "p": {覆盖}, "m": {覆盖}, "delay": 0}, ...],
  "notes": ["每列下面写的看法", ...]                    # 可选
}
"""
import sys, os, json, base64, io, time, pathlib
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
TOOL = pathlib.Path(os.path.join(ROOT, 'tool/FireworkBaker.html')).resolve().as_uri() + '?fast'
FONT = None
for f in ['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/simhei.ttf']:
    if os.path.exists(f): FONT = ImageFont.truetype(f, 17); FONT_S = ImageFont.truetype(f, 14); break


def real_frames(cfg, px):
    cap = cv2.VideoCapture(os.path.join(ROOT, cfg['video'])); fps = cap.get(5) or 30
    cx, cy = cfg['center']; h = cfg['half']; out = []
    ox, oy = cfg.get('view', [0, 0]); cx += ox; cy += oy      # 取景中心相对爆点的偏移（像素，y 向下），看局部细节用
    for tt in cfg['times']:
        t = tt[0]; dy = tt[2] if len(tt) > 2 else 0      # 第三项：该时刻实拍取景的竖直偏移（像素，手机跟拍 / 抬头时爆点在画面里漂移）
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(round((cfg['t0'] + t) * fps))); ok, f = cap.read()
        if not ok: out.append(np.zeros((px, px, 3), np.uint8)); continue
        H, W = f.shape[:2]; pad = int(h + abs(dy)) + 2
        fp = cv2.copyMakeBorder(f, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
        c = fp[int(cy + dy - h) + pad:int(cy + dy + h) + pad, int(cx - h) + pad:int(cx + h) + pad]
        out.append(cv2.cvtColor(cv2.resize(c, (px, px), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB))
    return out


def layer_pm(pg, cfg, L):
    if 'P' in L: return L['P'], L.get('M', {})
    ent = {}
    if cfg.get('entries'):
        for e in json.load(open(os.path.join(ROOT, cfg['entries']), encoding='utf-8'))['entries']: ent[e['id']] = e
    e = dict(ent[L['id']]) if L.get('id') else {'base': L['base'], 'p': {}, 'm': {}}
    p = {**e.get('p', {}), **L.get('p', {})}; m = {**e.get('m', {}), **L.get('m', {})}
    return pg.evaluate("(a)=>{ const d=defaultsFor(a.base); const P={...d.P, ...a.p, type: a.base}; const M=normalizeM({...d.M, ...a.m}, a.base); return {P, M}; }",
                       {'base': e['base'], 'p': p, 'm': m}).values()


def _view_x(cfg):
    return cfg.get('view', [0, 0])[0] / cfg['pxm']


def render_layers(cfg, px, only=None):
    from playwright.sync_api import sync_playwright
    half_m = cfg['half'] / cfg['pxm']
    rows = []
    with sync_playwright() as pw:
        mode = os.environ.get('FW_RENDER') or ('soft' if sys.platform.startswith('linux') else 'gpu')
        args = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] if mode == 'soft' else ["--ignore-gpu-blocklist"]
        br = pw.chromium.launch(args=args, headless=(mode == 'soft'))
        pg = br.new_page(); pg.goto(TOOL, timeout=0, wait_until='domcontentloaded'); pg.wait_for_function("window.__fw && window.__fw.idle()", timeout=0)
        for i, L in enumerate(cfg['layers']):
            if only is not None and i not in only: rows.append(None); continue
            P, M = layer_pm(pg, cfg, L)
            dl = float(L.get('delay', 0) or 0)
            times = [-0.05] + [max(0.0, tt[0] - dl) for tt in cfg['times']]
            t1 = time.time()
            # 定曝光：默认在这一层发光的整段里取 8 个时刻合在一起（和烘焙对整张贴图定曝光同口径）；层里写 probe / probes 可覆盖
            st = float(P.get('ignDelay') or 0) + (float(P.get('burn', 1)) if (P.get('afterBurn') or 0) > 0 else 0)
            if P.get('type') in ('senrin', 'crossette'): st = float(P.get('subDelay', 1))
            dur = float(P.get('afterBurn') or 0) if (P.get('afterBurn') or 0) > 0 else float(P.get('subBurn', 1) if P.get('type') in ('senrin', 'crossette') else P.get('burn', 3))
            en = min(float(P.get('duration', 5)), st + dur)
            probes = [round(st + (en - st) * (k + 0.5) / 8, 3) for k in range(8)]
            res = pg.evaluate(f"__fw.renderStills({json.dumps(P)}, {json.dumps(M)}, {{ times: {json.dumps(times)}, px: {px}, half: {half_m}, cy: {-cfg.get('view', [0, 0])[1] / cfg['pxm']}, shutter: 1/40, sub: {int(cfg.get('sub', 4))}, probes: {json.dumps(L['probes'] if L.get('probes') else ([L['probe']] if L.get('probe') is not None else probes))} }})")
            got = sorted(((r['t'], np.array(Image.open(io.BytesIO(base64.b64decode(r['png'].split(',')[1]))).convert('RGB'), np.float32)) for r in res), key=lambda x: x[0])
            # 天空底色：t≈0 那一帧含开花闪光，不能整张当背景；只取四角的中位数当天空色
            f0 = got[0][1]; e = max(4, px // 16)
            sky = np.median(np.concatenate([f0[:e, :e].reshape(-1, 3), f0[:e, -e:].reshape(-1, 3), f0[-e:, :e].reshape(-1, 3), f0[-e:, -e:].reshape(-1, 3)]), 0)
            bg = np.broadcast_to(sky, f0.shape).astype(np.float32); imgs = []
            k = 1
            for tt in cfg['times']:
                t = tt[0]; a = got[k][1] if k < len(got) else bg; k += 1
                imgs.append(np.clip(a - bg, 0, None) if t >= dl else np.zeros_like(bg))
            rows.append((L.get('name', L.get('id', f'层{i+1}')), imgs, bg))
            print(f"  {L.get('name', L.get('id'))}: {time.time() - t1:.0f}s", flush=True)
        br.close()
    return rows


def sheet(cfg, real, rows, path):
    px = cfg.get('cell', 300); nT = len(cfg['times']); lab = 118
    lay = [r for r in rows if r is not None]
    nR = 1 + len(lay) + (1 if len(lay) > 1 else 0)
    notes = cfg.get('notes') or []
    nh = 64 if notes else 0
    W = Image.new('RGB', (lab + nT * px, 34 + nR * px + nh), (14, 15, 20)); d = ImageDraw.Draw(W)
    for j, tt in enumerate(cfg['times']):
        name = tt[1]
        d.text((lab + j * px + 6, 7), name, fill=(233, 180, 95), font=FONT)
    def put(r, imgs, title):
        d.text((6, 34 + r * px + px // 2 - 10), title, fill=(220, 220, 220), font=FONT_S)
        for j, im in enumerate(imgs): W.paste(Image.fromarray(np.clip(im, 0, 255).astype(np.uint8)), (lab + j * px, 34 + r * px))
    put(0, real, '实拍')
    bg0 = lay[0][2] if lay else None
    for i, (name, imgs, bg) in enumerate(lay): put(1 + i, [im + bg0 for im in imgs], name)
    if len(lay) > 1:
        comb = [bg0 + sum(r[1][j] for r in lay) for j in range(nT)]
        put(1 + len(lay), comb, '组合')
    for j, n in enumerate(notes[:nT]):
        y = 34 + nR * px + 4; x = lab + j * px + 4
        # 简单换行
        line, lines = '', []
        for ch in n:
            if d.textlength(line + ch, font=FONT_S) > px - 8: lines.append(line); line = ''
            line += ch
        lines.append(line)
        for k, ln in enumerate(lines[:3]): d.text((x, y + k * 18), ln, fill=(170, 200, 170), font=FONT_S)
    W.save(path, quality=88)
    return W


def main():
    cfg = json.load(open(sys.argv[1], encoding='utf-8'))
    out = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else os.path.splitext(sys.argv[1])[0] + '.jpg'
    only = None
    if '--only' in sys.argv: only = {int(x) for x in sys.argv[sys.argv.index('--only') + 1].split(',')}
    px = cfg.get('cell', 300)
    real = real_frames(cfg, px)
    rows = render_layers(cfg, px, only)
    sheet(cfg, real, rows, out)
    print('→', out)


if __name__ == '__main__':
    try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
    main()
