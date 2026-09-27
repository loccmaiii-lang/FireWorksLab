"""按 Cascade 的播放方式预览导出的升空尾缀：只读 samples/RiseTrail_*/ 里的 PNG 和检查 json，
粒子沿「Initial Velocity + Drag + Const Acceleration −981」的轨迹上升，帧号按锯齿曲线取循环贴图，
面片长度按 Size By Life；到顶后换消散贴图从第 0 帧播到最后。颜色 = 渐变图(v) × v（与项目材质相同）。
输出：samples/升空尾缀_预览.mp4（三档并排：左边是整段上升，右边是面片特写）"""
import os, sys, json, math
import numpy as np, cv2
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SAMP = os.path.join(ROOT, 'samples')
COLS, CW, CH = 16, 128, 1024
PW, PH, ZW = 230, 720, 92          # 每档：整段视图宽、高；特写宽


def hexrgb(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float64) / 255


def load(key):
    d = os.path.join(SAMP, f'RiseTrail_{key}')
    m = json.load(open(os.path.join(d, f'RiseTrail_{key}_检查.json'), encoding='utf-8'))
    loop = np.array(Image.open(os.path.join(d, f'T_RiseTrail_{key}_Loop.png'))).astype(np.float32) / 255
    fade = np.array(Image.open(os.path.join(d, f'T_RiseTrail_{key}_Fade.png'))).astype(np.float32) / 255
    ramp = np.array(Image.open(os.path.join(d, f'T_RiseTrail_{key}_Ramp.png')).convert('RGB'))[0].astype(np.float32) / 255
    return m, loop, fade, ramp


def cell(tex, f, m=None):
    cols, cw = (m['cols'], m['cw']) if m and 'cols' in m else (COLS, CW)
    c, k = divmod(int(f), cols)
    return tex[:, k * cw:(k + 1) * cw, c]


def colorize(v, ramp):
    lin = (ramp ** 2.2)[np.clip((v * 255).astype(int), 0, 255)] * v[..., None]
    return lin


def panel(key, t, fonts=None):
    m, loop, fade, ramp = CACHE[key]
    T, Ha, k, v0 = m['rise_T'], m['H_apex'], m['drag'], m['v0_lin']
    img = np.zeros((PH, PW, 3), np.float32); zoom = np.zeros((PH, ZW, 3), np.float32)
    ppm = (PH * 0.86) / Ha; ground = PH - 20
    if t <= T:
        z = (v0 + 9.81 / k) * (1 - math.exp(-k * t)) / k - 9.81 / k * t
        ks = m['size_keys_y']; sy = float(np.interp(t / T, [a for a, _ in ks], [b for _, b in ks]))
        v = cell(loop, math.floor((t % (m['loop_frames'] / m['fps'])) * m['fps']) % m['loop_frames'], m)
    else:
        tau = t - T; f = math.floor(tau * m['fps'])
        if f >= m['fade_frames']: return img, zoom
        z = Ha; sy = m['size_keys_y'][-1][1]; v = cell(fade, f, m)
    col = colorize(v, ramp)
    # 面片：星头（Pivot）在 z 处，向下拉长 H × sy
    Wp = max(2, int(round(m['W'] * ppm))); Hp = max(2, int(round(m['H'] * sy * ppm)))
    spr = cv2.resize(col, (Wp, Hp), interpolation=cv2.INTER_AREA)
    hy = ground - z * ppm; y0 = int(round(hy - (1 - m['hb']) * Hp)); x0 = PW // 2 - Wp // 2
    ya, yb = max(0, y0), min(PH, y0 + Hp); xa, xb = max(0, x0), min(PW, x0 + Wp)
    if yb > ya and xb > xa: img[ya:yb, xa:xb] += spr[ya - y0:yb - y0, xa - x0:xb - x0]
    zoom[:] = cv2.resize(col, (ZW, PH), interpolation=cv2.INTER_AREA)
    return img, zoom


CACHE = {}


def main():
    keys = ['S', 'M', 'L']
    for k in keys: CACHE[k] = load(k)
    Tm = max(CACHE[k][0]['rise_T'] + CACHE[k][0]['fade_frames'] / CACHE[k][0]['fps'] for k in keys) + 0.5
    fps = 30; n = int(Tm * fps)
    W = len(keys) * (PW + ZW + 12); H = PH + 40
    out = os.path.join(SAMP, '升空尾缀_预览.mp4')
    vw = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*'mp4v'), fps, (W, H))
    font = None
    try:
        from PIL import ImageFont, ImageDraw
        for f in ['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc']:
            if os.path.exists(f): font = ImageFont.truetype(f, 16); break
    except Exception: pass
    names = {'S': '小 · 简单礼花', 'M': '中 · 金芒菊级', 'L': '大 · 四尺玉级'}
    for i in range(n):
        t = i / fps; fr = np.zeros((H, W, 3), np.float32); fr[:] = (0.035, 0.04, 0.06)
        for j, k in enumerate(keys):
            a, z = panel(k, t); x = j * (PW + ZW + 12)
            fr[40:, x:x + PW] += a * 1.6; fr[40:, x + PW + 4:x + PW + 4 + ZW] += z * 1.6
        o = (np.clip(fr, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)
        if font:
            from PIL import ImageDraw
            im = Image.fromarray(o); d = ImageDraw.Draw(im)
            for j, k in enumerate(keys):
                m = CACHE[k][0]; x = j * (PW + ZW + 12)
                st = '上升' if t <= m['rise_T'] else ('消散' if t <= m['rise_T'] + m['fade_frames'] / m['fps'] else '')
                d.text((x + 6, 8), f"{names[k]}  {st}", fill=(230, 190, 120), font=font)
            d.text((W - 90, H - 24), f'{t:5.2f} s', fill=(160, 160, 170), font=font)
            o = np.array(im)
        vw.write(cv2.cvtColor(o, cv2.COLOR_RGB2BGR))
    vw.release(); print(out, n, 'frames')


if __name__ == '__main__':
    main()
