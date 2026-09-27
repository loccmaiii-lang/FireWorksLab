"""实拍 vs 模拟 对照：同一套测量、同样按最终半径和燃烧时长归一化，出并排对照图 + 数值表。

用法：
  python3 compare.py <视频路径> <参数JSON> <输出前缀>
参数 JSON 可以是烘焙器导出的 {params, materialDefaults}，也可以是 {P, M}。

模拟画面由烘焙器的 renderStills 在无头浏览器里渲染（没有显卡时走软件渲染，只是慢），
全部火花、不降密度；渲染分辨率按实拍里花的像素半径换算，两边像素尺度一致。
"""
import sys, os, json, base64, io, time
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refkit import read_video, find_burst, measure, crop, gray, streak

HERE = os.path.dirname(os.path.abspath(__file__))
TOOL = 'file://' + os.path.abspath(os.path.join(HERE, '../../tool/FireworkBaker.html')) + '?fast'
U = [0.05, 0.12, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1]
SHOW = [0.1, 0.3, 0.5, 0.7, 0.9]
KEYU = [0.1, 0.2, 0.3, 0.5, 0.7, 0.9]
FONT = None
for f in ['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc']:
    if os.path.exists(f):
        FONT = ImageFont.truetype(f, 18); break


def series(frames, bg, center, Tb, t0):
    return [((t - t0) / Tb, measure(f, bg, center)) for t, f in frames]


def add_streak(side, bg):
    """最终半径定下来之后再算尾缀的自相关度量"""
    for (u, m), (t, f) in zip(side['rows'], side['frames']):
        m.update(streak(f, bg, side['center'], side['R']))


def final_radius(rows):
    sel = [m['r98'] for u, m in rows if 0.6 < u < 0.9 and m['r98'] > 0]
    return float(np.median(sel)) if sel else max(m['r98'] for u, m in rows)


def curves(side):
    """归一化曲线：半径 r/R、尾缀中位与 75 分位（占 R）、亮部像素数（占峰值）、星点密度（每 R² 的星点数）"""
    R = side['R']; out = {k: [] for k in ['r', 'tail', 'tail75', 'n', 'heads', 'coh', 'align', 'conc']}
    for u, m in side['rows']:
        f = m['r98'] / R if m['r98'] else 0
        out['r'].append((u, f)); out['tail'].append((u, m['tail'] * f)); out['tail75'].append((u, m.get('tail75', 0) * f))
        out['n'].append((u, m['n'] / (R * R))); out['heads'].append((u, m['heads'] / (R * R)))
        for k in ['coh', 'align', 'conc']: out[k].append((u, m.get(k, 0)))
    return out


def at(c, u):
    return float(np.interp(u, [a for a, _ in c], [b for _, b in c]))


def video_side(path, scale=0.5):
    fr, fps = read_video(path, scale)
    b = find_burst(fr)
    Tb = b['te'] - b['t0']
    fr2 = fr[b['i0']:]
    rows = series(fr2, b['bg'], b['center'], Tb, b['t0'])
    side = dict(frames=fr2, center=b['center'], Tb=Tb, R=final_radius(rows), rows=rows)
    add_streak(side, b['bg']); return side


class SimSession:
    def __init__(self):
        from playwright.sync_api import sync_playwright
        self.pw = sync_playwright().start()
        self.br = self.pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        self.pg = self.br.new_page(viewport={'width': 1200, 'height': 900})
        self.pg.goto(TOOL)
        self.pg.wait_for_function("window.__fw && window.__fw.idle()", timeout=0)

    def close(self):
        self.br.close(); self.pw.stop()

    def side(self, P, M, Rpx):
        """Rpx：实拍里花的最终像素半径；模拟按同样的像素半径渲染"""
        ph = self.pg.evaluate(f"(()=>{{ const P={json.dumps(P)}; const fm=__fw.measure(P); const m=__fw.metricsOf(P,fm); return {{ R: m.diameter/2, burn: m.burn, cy: (fm.y0+fm.y1)/2 }}; }})()")
        Tb0, R0, cy = ph['burn'], ph['R'], min(0, ph['cy'])
        half = R0 * 1.7
        px = int(round(2 * half / R0 * Rpx / 4)) * 4
        times = [-0.05] + [u * Tb0 for u in U]
        t_start = time.time()
        res = self.pg.evaluate(f"__fw.renderStills({json.dumps(P)}, {json.dumps(M)}, {{ times: {json.dumps(times)}, px: {px}, half: {half}, cy: {cy}, shutter: 1/40 }})")
        imgs = [(r['t'], np.array(Image.open(io.BytesIO(base64.b64decode(r['png'].split(',')[1]))).convert('RGB'))) for r in res]
        bg = gray(imgs[0][1]); frames = imgs[1:]
        center = (px / 2, px / 2 + cy * px / (2 * half))
        cnt = np.array([measure(f, bg, center)['n'] for t, f in frames], np.float32); ip = int(np.argmax(cnt))
        ie = next((i for i in range(ip, len(cnt)) if cnt[i] < 0.15 * cnt[ip]), None)
        Tb = frames[ie][0] if ie is not None else Tb0 * 1.1
        rows = series(frames, bg, center, Tb, 0.0)
        side = dict(frames=frames, center=center, Tb=Tb, R=final_radius(rows), rows=rows, render_s=round(time.time() - t_start, 1), px=px)
        add_streak(side, bg); return side


def score(V, S, w=None):
    """差距：半径曲线、尾缀长度、亮部面积、星点密度、燃烧时长（越小越像）"""
    w = w or dict(r=3, tail=2, tail75=2, n=1, heads=1, burn=2, coh=10, align=6, conc=4)
    cv, cs = curves(V), curves(S); L = 0; parts = {}
    for k in ['r', 'tail', 'tail75', 'coh', 'align', 'conc']:
        e = sum((at(cv[k], u) - at(cs[k], u)) ** 2 for u in KEYU) / len(KEYU); parts[k] = e; L += w[k] * e
    for k in ['n', 'heads']:
        e = sum((np.log((at(cv[k], u) + 1e-3) / (at(cs[k], u) + 1e-3))) ** 2 for u in KEYU) / len(KEYU) * 0.1; parts[k] = e; L += w[k] * e
    e = np.log(S['Tb'] / V['Tb']) ** 2; parts['burn'] = e; L += w['burn'] * e
    return L, parts


def sheet(V, S, path, title=''):
    cell = 300
    W = Image.new('RGB', (cell * len(SHOW) + 90, cell * 2 + 40), (14, 15, 20))
    d = ImageDraw.Draw(W)
    for k, u in enumerate(SHOW):
        iv = int(np.argmin([abs(r[0] - u) for r in V['rows']])); isim = int(np.argmin([abs(r[0] - u) for r in S['rows']]))
        W.paste(Image.fromarray(crop(V['frames'][iv][1], V['center'], 1.35 * V['R'], cell)), (90 + k * cell, 30))
        W.paste(Image.fromarray(crop(S['frames'][isim][1], S['center'], 1.35 * S['R'], cell)), (90 + k * cell, 30 + cell))
        d.text((90 + k * cell + 6, 6), f'燃烧 {int(u * 100)}%', fill=(233, 180, 95), font=FONT)
    d.text((6, 30 + cell // 2), '实拍', fill=(220, 220, 220), font=FONT); d.text((6, 30 + cell + cell // 2), '模拟', fill=(220, 220, 220), font=FONT)
    if title: d.text((cell * len(SHOW) - 200, 6), title, fill=(160, 160, 170), font=FONT)
    W.save(path, quality=88)


def table(V, S):
    cv, cs = curves(V), curves(S); rows = []
    for u in KEYU:
        r = dict(燃烧=f'{int(u*100)}%')
        for k, nm in [('r', '半径'), ('coh', '亮痕细长度'), ('align', '放射一致度'), ('conc', '亮度集中度'), ('tail', '尾缀中位')]:
            r['实拍' + nm] = round(at(cv[k], u), 3); r['模拟' + nm] = round(at(cs[k], u), 3)
        rows.append(r)
    return rows


def main(video, pjson, prefix):
    j = json.load(open(pjson))
    P = j.get('P') or j.get('params'); M = j.get('M') or j.get('materialDefaults') or {}
    V = video_side(video)
    s = SimSession()
    try: S = s.side(P, M, V['R'])
    finally: s.close()
    sheet(V, S, prefix + '_对照.jpg')
    L, parts = score(V, S)
    out = dict(video=os.path.basename(video), 实拍燃烧秒=round(V['Tb'], 2), 模拟燃烧秒=round(S['Tb'], 2), 差距=round(float(L), 4),
               分项={k: round(float(v), 4) for k, v in parts.items()}, 渲染耗时秒=S['render_s'], 表=table(V, S))
    json.dump(out, open(prefix + '_数值.json', 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main(*sys.argv[1:4])
