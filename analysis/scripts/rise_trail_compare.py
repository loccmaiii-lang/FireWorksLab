"""升空尾缀对照视频：左 = 实拍（跟着星头裁切），右 = 导出的贴图按材质着色（同样的像素尺度、同样的天空底色）。
先播上升循环，再播消散（消散的实拍参考取 青柠星.mp4 开花后的尾迹）。
输出 samples/升空尾缀_实拍对照.mp4 和 samples/升空尾缀_对照.jpg"""
import os, sys, json, math
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rise_trail_video as RV

ROOT = RV.ROOT; SAMP = os.path.join(ROOT, 'samples')
FONT = None
for f in ['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc']:
    if os.path.exists(f): FONT = ImageFont.truetype(f, 18); break
CELL_H = 512
GAIN = 1.2          # 预览亮度（引擎里由 Color Over Life 的亮度倍数决定）


def tex_cells(path, n, m):
    t = np.array(Image.open(path)).astype(np.float32) / 255
    return [t[:, (f % m['cols']) * m['cw']:(f % m['cols'] + 1) * m['cw'], f // m['cols']] for f in range(n)]


def colorize(v, ramp, sky):
    v = v[2:-2, 2:-2]
    lin = (ramp ** 2.2)[np.clip((v * 255).astype(int), 0, 255)] * v[..., None]
    return (np.clip(lin * GAIN, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)      # 黑底（实拍那一侧也扣掉了天空）


def ref_track(key, n_out, fps_out):
    """实拍：按导出时同样的方式跟踪星头、转正、裁切（保留原色），返回 RGB 帧"""
    S = RV.SPEC[key]; fr, bg, fps = RV.read_all(os.path.join(ROOT, S['video']))
    a, b = S['frames']; out = []; prev_h = None
    for i in range(a, min(b, len(fr))):
        sig = RV.K.signal(RV.K.lin(fr[i]), bg); h, sig2 = RV.K.find_head(sig); h = RV.head_subpix(sig2, h)
        st, line = RV.K.straighten(sig2, h); L = RV.K.trail_length(st)
        Hc = L * 1.12 / (1 - RV.TOP); Wc = Hc / 8; s = (CELL_H - 4) / Hc
        rr = np.arange(3, max(8, int(0.6 * L))); ang = -math.atan(np.polyfit(rr, line[rr], 1)[0])
        ca, sa = math.cos(ang), math.sin(ang); cx, cy = 30, RV.TOP * (CELL_H - 4)
        M = np.array([[ca / s, -sa / s, 0], [sa / s, ca / s, 0]]); M[:, 2] = np.array(h) - M[:, :2] @ np.array([cx, cy])
        crop = cv2.warpAffine(sig2, M, (60, CELL_H - 4), flags=cv2.INTER_AREA | cv2.WARP_INVERSE_MAP, borderValue=0)
        out.append(crop[..., ::-1].copy())
    # 按输出帧率重采样（取最近帧）
    g = np.percentile(np.concatenate([o.sum(2).ravel() for o in out]), 99.7) / 3
    out = [(np.clip(o / g * 0.9, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8) for o in out]
    tt = np.arange(n_out) / fps_out; src = np.clip((tt * fps).astype(int), 0, len(out) - 1)
    return [out[k] for k in src], out


def fade_ref(n_out, fps_out):
    """青柠星.mp4：开花后留在空中的尾迹（开花点下方），跟着开花点裁切"""
    path = os.path.join(ROOT, 'vidio/2.0/青柠星.mp4'); cap = cv2.VideoCapture(path); fps = cap.get(5); fr = []
    while True:
        ok, f = cap.read()
        if not ok: break
        fr.append(f)
    # 开花：相邻帧变亮最多的那一帧；开花点 = 变亮区域的亮度重心
    g = np.stack([cv2.cvtColor(cv2.resize(f, None, fx=.5, fy=.5), cv2.COLOR_BGR2GRAY) for f in fr[:60]]).astype(np.float32)
    dif = np.clip(g[1:] - g[:-1], 0, None); k = int(np.argmax(dif.reshape(len(dif), -1).sum(1))) + 1
    dd = cv2.GaussianBlur(dif[k - 1], (0, 0), 4); m = dd > 0.5 * dd.max(); yy, xx = np.nonzero(m); w = dd[m]
    y, x = int((yy * w).sum() / w.sum() * 2), int((xx * w).sum() / w.sum() * 2)
    out = []; bgc = None
    for i in range(k, min(len(fr), k + int(3.2 * fps))):
        c = fr[i][max(0, y - 20):y - 20 + 380, max(0, x - 24):x + 24]
        if bgc is None: bgc = np.median(np.stack([f[max(0, y - 20):y - 20 + 380, max(0, x - 24):x + 24] for f in fr[max(0, k - 8):k - 2]]), 0)
        out.append(cv2.cvtColor(cv2.resize(c, (60, CELL_H - 4)), cv2.COLOR_BGR2RGB))   # 消散参考：原画（开花的星在移动，扣背景会出错）
    tt = np.arange(n_out) / fps_out; src = np.clip((tt * fps).astype(int), 0, len(out) - 1)
    return [out[s] for s in src]


def main():
    keys = ['S', 'M', 'L']; names = {'S': '小（尾缀C）', 'M': '中（尾缀B）', 'L': '大（尾缀A）'}
    fps_out = 30; t_loop, t_fade = 4.0, 3.6; n1, n2 = int(t_loop * fps_out), int(t_fade * fps_out)
    fref = fade_ref(n2, fps_out)
    cols = {}
    for k in keys:
        d = os.path.join(SAMP, f'RiseTrail_{k}'); m = json.load(open(os.path.join(d, f'RiseTrail_{k}_检查.json'), encoding='utf-8'))
        ramp = np.array(Image.open(os.path.join(d, f'T_RiseTrail_{k}_Ramp.png')).convert('RGB'))[0].astype(np.float32) / 255
        loop = tex_cells(os.path.join(d, f'T_RiseTrail_{k}_Loop.png'), m['loop_frames'], m)
        fade = tex_cells(os.path.join(d, f'T_RiseTrail_{k}_Fade.png'), m['fade_frames'], m)
        cache = os.path.join(os.environ.get('TMPDIR', '/tmp'), f'fw_reftrack_{k}.npz')
        if os.path.exists(cache): z = np.load(cache); refs, allref = list(z['refs']), list(z['allref'])
        else:
            refs, allref = ref_track(k, n1, fps_out); np.savez_compressed(cache, refs=np.stack(refs), allref=np.stack(allref))
        sky = (np.median(np.stack(allref)[:, 5:40, :8].reshape(-1, 3), 0) / 255) ** 2.2
        ours = [colorize(loop[int(i / fps_out * m['fps']) % len(loop)], ramp, sky) for i in range(n1)]
        start = m['relay_loop_frame']
        ours += [colorize(fade[min(len(fade) - 1, int(i / fps_out * m['fps']))], ramp, sky) for i in range(n2)]
        cols[k] = dict(ref=refs + fref, ours=ours, m=m)
    W = len(keys) * (2 * 64 + 40) + 20; H = CELL_H + 60
    vw = cv2.VideoWriter(os.path.join(SAMP, '升空尾缀_实拍对照.mp4'), cv2.VideoWriter_fourcc(*'mp4v'), fps_out, (W, H))
    stills = []
    for i in range(n1 + n2):
        fr = np.full((H, W, 3), 45, np.uint8)
        for j, k in enumerate(keys):
            x = 10 + j * (2 * 64 + 40)
            fr[40:40 + CELL_H - 4, x:x + 60] = cols[k]['ref'][i]; fr[40:40 + CELL_H - 4, x + 68:x + 128] = cols[k]['ours'][i]
        im = Image.fromarray(fr); d = ImageDraw.Draw(im)
        for j, k in enumerate(keys):
            x = 10 + j * (2 * 64 + 40)
            d.text((x, 4), names[k], fill=(240, 200, 130), font=FONT)
            d.text((x, 22), '实拍', fill=(180, 180, 190), font=ImageFont.truetype(FONT.path, 13) if FONT else None)
            d.text((x + 68, 22), '贴图', fill=(180, 180, 190), font=ImageFont.truetype(FONT.path, 13) if FONT else None)
        d.text((W - 150, H - 22), ('上升循环 ' if i < n1 else '开花后消散（实拍：青柠星）')[:14], fill=(200, 200, 210), font=ImageFont.truetype(FONT.path, 13) if FONT else None)
        fr = np.array(im); vw.write(cv2.cvtColor(fr, cv2.COLOR_RGB2BGR))
        if i in (10, 45, 80, n1 + 3, n1 + 30, n1 + 60): stills.append(fr)
    vw.release()
    Image.fromarray(np.hstack([np.pad(s, ((0, 0), (0, 8), (0, 0)), constant_values=15) for s in stills])).save(os.path.join(SAMP, '升空尾缀_对照.jpg'), quality=90)
    print('ok')


if __name__ == '__main__':
    main()
