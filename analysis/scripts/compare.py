"""实拍 vs 模拟 对照：同一套测量、同样按最终半径和燃烧时长归一化，出并排对照图 + 数值表。

用法：
  python3 compare.py <视频路径> <参数JSON> <输出前缀>
参数 JSON 可以是烘焙器导出的 {params, materialDefaults}，也可以是 {P, M}。

模拟画面由烘焙器的 renderStills 在无头浏览器里渲染（没有显卡时走软件渲染，只是慢），
全部火花、不降密度；渲染分辨率按实拍里花的像素半径换算，两边像素尺度一致。
"""
import sys, os, json, base64, io, time, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refkit import read_video, find_burst, measure, crop, gray, streak

HERE = os.path.dirname(os.path.abspath(__file__))
TOOL = pathlib.Path(os.path.join(HERE, '../../tool/FireworkBaker.html')).resolve().as_uri() + '?fast'
U = [0.05, 0.12, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1]
UF = [0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 1.0, 1.1]
SHOW = [0.1, 0.3, 0.5, 0.7, 0.9]
KEYU = [0.1, 0.2, 0.3, 0.5, 0.7, 0.9]
FONT = None
for f in ['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
          'C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/simhei.ttf', '/System/Library/Fonts/PingFang.ttc']:
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


def track_frames(fr, b):
    """手机跟着抬头 / 平移时（例：永丰三重蕊，花在画面里上移 300 多像素）：按每帧亮部外框的中心把画面平移回开花时的爆点，
    不然会把镜头移动当成造型差异。只在任务写了 "track": true 时用。"""
    from refkit import star_mask
    cx0, cy0 = b['center']; out = []; cs = []
    for t, f in fr:
        d, m, _ = star_mask(f, b['bg']); ys, xs = np.nonzero(m)
        cs.append(((xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2) if len(xs) > 50 else None)
    # 平滑（外框中心逐帧抖动）；开花前和没亮部的帧用最近的值
    last = (cx0, cy0); cs2 = []
    for i, c in enumerate(cs): last = c if (c is not None and i >= b['i0'] + 3) else last if i >= b['i0'] + 3 else (cx0, cy0); cs2.append(last)
    k = 5; sm = [tuple(np.mean([cs2[j][q] for j in range(max(0, i - k), min(len(cs2), i + k + 1))]) for q in (0, 1)) for i in range(len(cs2))]
    import cv2
    for (t, f), (cx, cy) in zip(fr, sm):
        M = np.float32([[1, 0, cx0 - cx], [0, 1, cy0 - cy]])
        out.append((t, cv2.warpAffine(f, M, (f.shape[1], f.shape[0]), borderMode=cv2.BORDER_REPLICATE)))
    return out


def video_side(path, scale=0.5, roi=None, t_range=None, track=False):
    """roi：[x0, y0, x1, y1]（占画面的比例）只看这一块——远景视频里有观众、地面火、月亮、别的烟花时用；
    t_range：[t0, t1] 秒，只看这一段（一段视频里有几发时，挑要对的那一发）；track：镜头在动时按亮部外框中心稳住画面"""
    t0, t1 = (t_range or (0.0, 1e9))
    fr, fps = read_video(path, scale, t0, t1)
    if roi:
        H, W = fr[0][1].shape[:2]; x0, y0, x1, y1 = int(roi[0] * W), int(roi[1] * H), int(roi[2] * W), int(roi[3] * H)
        fr = [(t, np.ascontiguousarray(f[y0:y1, x0:x1])) for t, f in fr]
    b = find_burst(fr)
    if track: fr = track_frames(fr, b)
    Tb = b['te'] - b['t0']
    fr2 = fr[b['i0']:]
    rows = series(fr2, b['bg'], b['center'], Tb, b['t0'])
    side = dict(frames=fr2, center=b['center'], Tb=Tb, R=final_radius(rows), rows=rows)
    add_streak(side, b['bg']); return side


def render_mode():
    """FW_RENDER=gpu 用本机显卡（弹出一个浏览器窗口，别最小化也没关系）；soft 用软件渲染（云端没有显卡时）。
    不设时：Linux 用 soft，Windows / Mac 用 gpu。"""
    return os.environ.get('FW_RENDER') or ('soft' if sys.platform.startswith('linux') else 'gpu')


class SimSession:
    def __init__(self):
        from playwright.sync_api import sync_playwright
        self.pw = sync_playwright().start()
        self.mode = render_mode()
        if self.mode == 'soft':
            self.br = self.pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        else:
            # 用本机装好的 Chrome / Edge（不用另外下载浏览器），有窗口才走显卡；关掉后台节流，窗口被挡住也照常跑
            args = ["--ignore-gpu-blocklist", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"]
            self.br, err = None, []
            for ch in ('chrome', 'msedge', None):
                try:
                    self.br = self.pw.chromium.launch(channel=ch, headless=False, args=args) if ch else self.pw.chromium.launch(headless=False, args=args)
                    break
                except Exception as e:
                    err.append(f'{ch}: {str(e).splitlines()[0]}')
            if self.br is None:
                raise RuntimeError('找不到可用的浏览器（Chrome / Edge / playwright 自带）：' + ' | '.join(err))
        self.pg = self.br.new_page(viewport={'width': 1200, 'height': 900})
        self.pg.goto(TOOL)
        self.pg.wait_for_function("window.__fw && window.__fw.idle()", timeout=0)
        self.renderer = self.pg.evaluate("(document.querySelector('#gpu')||{}).title || ''")
        self.soft = any(k in self.renderer.lower() for k in ('swiftshader', 'llvmpipe', 'software', 'basic render'))
        if self.mode == 'gpu' and self.soft:
            print('注意：浏览器没有用上显卡（' + self.renderer + '），会很慢。检查显卡驱动或浏览器的硬件加速设置。', flush=True)

    def close(self):
        self.br.close(); self.pw.stop()

    def side(self, P, M, Rpx, fast=False):
        """Rpx：实拍里花的最终像素半径；模拟按同样的像素半径渲染。
        fast：拟合时用，少渲几个时刻、快门内子帧减到 4（星在 1/40 秒里只走零点几米，拖影差别可以忽略）
        P 里以 _ 开头的是「相机」参数，只在和实拍比较时加，不进烘焙器、不进贴图：
          _psf  相机模糊（实拍像素，高斯 σ）；_gain 相机曝光倍数（乘完截到 255，模拟过曝）"""
        cam = (float(P.get('_psf', 0) or 0), float(P.get('_gain', 1) or 1))
        if P.get('layers'): return self.side_layers(P['layers'], Rpx, fast, cam)
        P = {k: v for k, v in P.items() if not k.startswith('_')}
        ph = self.pg.evaluate(f"(()=>{{ const P={json.dumps(P)}; const fm=__fw.measure(P); const m=__fw.metricsOf(P,fm); return {{ R: m.diameter/2, burn: m.burn, cy: (fm.y0+fm.y1)/2 }}; }})()")
        Tb0, R0, cy = ph['burn'], ph['R'], min(0, ph['cy'])
        half = R0 * 1.7
        px = int(round(2 * half / R0 * Rpx / 4)) * 4
        times = [-0.05] + [u * Tb0 for u in (UF if fast else U)]
        t_start = time.time()
        sub = ', sub: 4' if fast else ''
        res = self.pg.evaluate(f"__fw.renderStills({json.dumps(P)}, {json.dumps(M)}, {{ times: {json.dumps(times)}, px: {px}, half: {half}, cy: {cy}, shutter: 1/40{sub} }})")
        imgs = [(r['t'], camera(np.array(Image.open(io.BytesIO(base64.b64decode(r['png'].split(',')[1]))).convert('RGB')), *cam)) for r in res]
        bg = gray(imgs[0][1]); frames = imgs[1:]
        center = (px / 2, px / 2 + cy * px / (2 * half))
        cnt = np.array([measure(f, bg, center)['n'] for t, f in frames], np.float32); ip = int(np.argmax(cnt))
        ie = next((i for i in range(ip, len(cnt)) if cnt[i] < 0.15 * cnt[ip]), None)
        Tb = frames[ie][0] if ie is not None else Tb0 * 1.1
        rows = series(frames, bg, center, Tb, 0.0)
        side = dict(frames=frames, center=center, Tb=Tb, R=final_radius(rows), rows=rows, render_s=round(time.time() - t_start, 1), px=px)
        add_streak(side, bg); return side

    def side_layers(self, layers, Rpx, fast=False, cam=(0.0, 1.0)):
        """多层组合（大组合：外层 + 芯、亲星 + 小割…）：layers = [{name, P, M, scale=1, delay=0}]。
        每层按自己的物理单独渲染，放到同一个取景（同一爆点、同一米 / 像素），按 delay 错开时间，
        亮度相加（加色）后再截到 255、再加相机模糊 / 曝光。每层各自定曝光（与单层对照同口径），
        层与层的相对亮度用各层的 M.headInt 调（拟合参数写 "1.M.headInt"）。取景的中心高度按第 0 层（主层）。"""
        info = []
        for L in layers:
            P = {k: v for k, v in L['P'].items() if not k.startswith('_')}
            # 取景用的几何量：星头不发光的层（光丝层、只画尾巴的层）按同参数「星头可见」量；还量不出就沿用上一层（同轨迹）
            PM = dict(P, headBright=max(float(P.get('headBright', 1) or 0), 1.0))
            ph = self.pg.evaluate(f"(()=>{{ const P={json.dumps(PM)}; const fm=__fw.measure(P); const m=fm && __fw.metricsOf(P,fm); return m ? {{ R: m.diameter/2, burn: m.burn, cy: (fm.y0+fm.y1)/2 }} : null; }})()")
            if ph is None:
                if not info: raise RuntimeError('第 0 层量不出大小（主层没有可见的星）')
                prev = info[-1][4]; ph = dict(prev, burn=float(P.get('ignDelay') or 0) + float(P.get('burn', prev['burn'])))
            info.append((P, L.get('M') or {}, float(L.get('scale', 1) or 1), float(L.get('delay', 0) or 0), ph))
        R0 = max(ph['R'] * sc for P, M, sc, dl, ph in info)
        Tb0 = max(dl + ph['burn'] for P, M, sc, dl, ph in info)
        cy = min(0, info[0][4]['cy'] * info[0][2])
        half = R0 * 1.7
        px = int(round(2 * half / R0 * Rpx / 4)) * 4
        times = [-0.05] + [u * Tb0 for u in (UF if fast else U)]
        t_start = time.time()
        sub = ', sub: 4' if fast else ''
        acc = [np.zeros((px, px, 3), np.float32) for _ in times]
        for lay_i, (P, M, sc, dl, ph) in enumerate(info):
            loc = sorted({round(t - dl, 4) for t in times if t - dl >= 0} | {-0.05})
            # 定曝光：在这一层发光的整段里取 8 个时刻合在一起（和烘焙对整张贴图定曝光同口径；
            # 延时点火、主段后才亮的第二段、千轮子花都不会按一片黑定曝光）
            st = float(P.get('ignDelay') or 0) + (float(P.get('burn', 1)) if (P.get('afterBurn') or 0) > 0 else 0)
            if P.get('type') in ('senrin', 'crossette'): st = float(P.get('subDelay', 1))
            dur = float(P.get('afterBurn') or 0) if (P.get('afterBurn') or 0) > 0 else float(P.get('subBurn', 1) if P.get('type') in ('senrin', 'crossette') else P.get('burn', 3))
            en = min(float(P.get('duration', 5)), st + dur)
            probe = ', probes: ' + json.dumps([round(st + (en - st) * (k + 0.5) / 8, 3) for k in range(8)])
            res = self.pg.evaluate(f"__fw.renderStills({json.dumps(P)}, {json.dumps(M)}, {{ times: {json.dumps(loc)}, px: {px}, half: {half / sc}, cy: {cy / sc}, shutter: 1/40{sub}{probe} }})")
            got = {round(r['t'], 4): np.array(Image.open(io.BytesIO(base64.b64decode(r['png'].split(',')[1]))).convert('RGB'), np.float32) for r in res}
            # 天空底色只算一次（第 0 层的）：其余层先减掉自己的底色再加，否则几层底色叠成一片灰
            base = got.get(-0.05, 0) if lay_i else 0
            for i, t in enumerate(times):
                k = -0.05 if i == 0 else round(t - dl, 4)
                if k in got: acc[i] += np.clip(got[k] - base, 0, None) if lay_i else got[k]
                elif i and not lay_i and -0.05 in got: acc[i] += got[-0.05]      # 主层还没开时也要有底色
        imgs = [(t, camera(np.clip(a, 0, 255).astype(np.uint8), *cam)) for t, a in zip(times, acc)]
        bg = gray(imgs[0][1]); frames = imgs[1:]
        center = (px / 2, px / 2 + cy * px / (2 * half))
        cnt = np.array([measure(f, bg, center)['n'] for t, f in frames], np.float32); ip = int(np.argmax(cnt))
        ie = next((i for i in range(ip, len(cnt)) if cnt[i] < 0.15 * cnt[ip]), None)
        Tb = frames[ie][0] if ie is not None else Tb0 * 1.1
        rows = series(frames, bg, center, Tb, 0.0)
        side = dict(frames=frames, center=center, Tb=Tb, R=final_radius(rows), rows=rows, render_s=round(time.time() - t_start, 1), px=px)
        add_streak(side, bg); return side


def camera(img, psf=0.0, gain=1.0):
    """实拍相机：镜头 / 压缩模糊 + 曝光（过曝截断）。火花按真实尺寸烘焙（贴图清晰），这两样只在对照时加"""
    if psf <= 0.05 and abs(gain - 1) < 1e-3: return img
    import cv2
    f = img.astype(np.float32)
    if psf > 0.05: f = cv2.GaussianBlur(f, (0, 0), psf)
    return np.clip(f * gain, 0, 255).astype(np.uint8)


def score(V, S, w=None):
    """差距：半径曲线、尾缀长度、亮部面积、星点密度、燃烧时长（越小越像）"""
    w = {**dict(r=3, tail=2, tail75=2, n=1, heads=1, burn=2, coh=10, align=6, conc=4), **(w or {})}     # 任务里 fit.weights 可只改几项
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
    j = json.load(open(pjson, encoding='utf-8'))
    P = j.get('P') or j.get('params'); M = j.get('M') or j.get('materialDefaults') or {}
    V = video_side(video)
    s = SimSession()
    try: S = s.side(P, M, V['R'])
    finally: s.close()
    sheet(V, S, prefix + '_对照.jpg')
    L, parts = score(V, S)
    out = dict(video=os.path.basename(video), 实拍燃烧秒=round(V['Tb'], 2), 模拟燃烧秒=round(S['Tb'], 2), 差距=round(float(L), 4),
               分项={k: round(float(v), 4) for k, v in parts.items()}, 渲染耗时秒=S['render_s'], 表=table(V, S))
    json.dump(out, open(prefix + '_数值.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
    main(*sys.argv[1:4])
