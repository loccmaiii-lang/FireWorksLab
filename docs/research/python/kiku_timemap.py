"""
轨迹时间图（Trajectory Time Map）烘焙 + 材质还原验证

思路：每颗星在空间里的轨迹是固定的，拖尾只是轨迹上"最近一段时间"的窗口，星头是窗口的最前端。
所以把全部轨迹画进一张静态图，再用一个通道记录"星体到达该像素的时间"，
材质只要拿当前时间和这个值比较，就能还原开花、拖尾、变色、消え口。

输出贴图（线性，非 sRGB）：
  R  外层星轨迹（≈1 的细线）+ 炭火火花雾（≤0.62）
  G  外层到达时间 / 火花剥落时间，0..1 对应 0..T_MAX 秒
  B  芯层星轨迹
  A  芯层到达时间
"""
import os, sys, math, subprocess
import numpy as np
from scipy.ndimage import gaussian_filter, distance_transform_edt
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kiku_render import Sim, Cam, SHELL, blackbody_rgb, encode, bloom_preview

T_MAX = 2.6                     # 时间通道满量程（秒），8bit 精度约 10ms
LIFE = SHELL["life"]
CHG_OUTER = SHELL["layers"][0]["chg"] * LIFE
CHG_CORE = SHELL["layers"][1]["chg"] * LIFE
OUT = "kiku_out/timemap"
CY = 0.43                       # 爆点在贴图中的纵向位置（紧凑取景）


class Acc:
    """双线性溅射累加器：先攒索引和权重，批量 bincount，避免每步分配整张图"""
    def __init__(self, res):
        self.res = res; self.buf = np.zeros(res * res); self.idx = []; self.w = []; self.n = 0
    def add(self, x, y, w):
        W = self.res
        x0 = np.floor(x - 0.5).astype(np.int64); y0 = np.floor(y - 0.5).astype(np.int64)
        fx = (x - 0.5) - x0; fy = (y - 0.5) - y0
        for dx, dy, ww in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)),
                           (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
            xi = x0 + dx; yi = y0 + dy
            ok = (xi >= 0) & (xi < W) & (yi >= 0) & (yi < W)
            self.idx.append(yi[ok] * W + xi[ok]); self.w.append((w * ww)[ok]); self.n += ok.sum()
        if self.n > 4_000_000: self.flush()
    def flush(self):
        if self.idx:
            self.buf += np.bincount(np.concatenate(self.idx), weights=np.concatenate(self.w), minlength=self.res ** 2)
        self.idx = []; self.w = []; self.n = 0
    def get(self):
        self.flush(); return self.buf.reshape(self.res, self.res)


def fill_nearest(val, valid):
    """把时间值向空白区域扩展：避免双线性过滤/压缩/mip 时和 0 混合，产生"提前出现"的假星头"""
    if valid.all():
        return val
    _, (iy, ix) = distance_transform_edt(~valid, return_indices=True)
    return val[iy, ix]


def bake(res):
    sim = Sim()
    cam = Cam(res, width_m=176.0, cy=CY)
    h = 1 / 1500                # 早期星速 150m/s，细步长保证轨迹连续
    Lo, LTo, Lc, LTc, S, ST = (Acc(res) for _ in range(6))
    radius = []                 # 记录屏幕上可见范围随时间的变化，用于动态缩放面片
    step = 0
    while sim.t < LIFE + 0.7:
        sim.step(h); step += 1
        alive = sim.t < sim.life
        if alive.any():
            x, y = cam.project(sim.p[alive])
            tail = sim.tail[alive]
            w = np.full(len(x), h)
            Lo.add(x[tail], y[tail], w[tail]); LTo.add(x[tail], y[tail], (w * sim.t)[tail])
            Lc.add(x[~tail], y[~tail], w[~tail]); LTc.add(x[~tail], y[~tail], (w * sim.t)[~tail])
        if step % 4 == 0 and len(sim.sp_p):
            u = sim.sp_age / sim.sp_life
            T = sim.sp_T0 * (1 - 0.42 * u)
            g = ((T - 900) / 1150).clip(0, None) ** 3
            te = sim.t - sim.sp_age
            x, y = cam.project(sim.sp_p)
            S.add(x, y, g * 4 * h); ST.add(x, y, g * 4 * h * te)
        if step % 15 == 0:
            pts = sim.p[alive] if alive.any() else np.zeros((0, 3))
            if len(sim.sp_p): pts = np.concatenate([pts, sim.sp_p])
            if len(pts):
                x, y = cam.project(pts)
                d = np.hypot(x - res * 0.5, y - res * CY).max() / res
            else:
                d = 0
            radius.append((sim.t, d))

    Lo, LTo, Lc, LTc, S, ST = (a.get() for a in (Lo, LTo, Lc, LTc, S, ST))
    eps = 1e-12
    px = res / 512
    # 分子分母一起模糊，保证时间值和覆盖范围严格对应
    bl = lambda a, s: gaussian_filter(a, s * px)
    Lo_b, Lc_b = bl(Lo, 0.35), bl(Lc, 0.35)
    To = bl(LTo, 0.35) / np.maximum(Lo_b, eps); Tc = bl(LTc, 0.35) / np.maximum(Lc_b, eps)
    kline = h * 0.9 / px
    line_o = 1 - np.exp(-Lo_b / kline)
    line_c = 1 - np.exp(-Lc_b / kline)
    Sb = bl(S, 0.5)
    Ts = bl(ST, 0.5) / np.maximum(Sb, eps)
    ks = np.percentile(Sb[Sb > 0], 97) / 1.6
    haze = 1 - np.exp(-Sb / ks)

    R = np.maximum(line_o, 0.62 * haze)
    wl = line_o ** 2 * 30; wh = haze
    G = (wl * To + wh * Ts) / np.maximum(wl + wh, eps)
    G = fill_nearest(G, (wl + wh) > 1e-4)
    B = line_c
    A = fill_nearest(Tc, Lc_b > 1e-3 * Lc_b.max())

    tex = np.stack([R, G / T_MAX, B, A / T_MAX], -1).clip(0, 1)
    return (tex * 255 + 0.5).astype(np.uint8), np.array(radius)


# ---------------- 材质逻辑（与 HLSL 版本一一对应） ----------------
def hash11(x):
    return np.modf(np.sin(x * 12.9898 + 4.1414) * 43758.5453)[0] % 1.0

def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

RED = np.array([1.0, 0.045, 0.02]); GREEN = np.array([0.30, 1.0, 0.20])
GOLD = np.array([1.0, 0.72, 0.30]); SILVER = np.array([0.85, 0.90, 1.0])

def material(tex8, t, frame_seed=0):
    tex = tex8.astype(np.float32) / 255.0
    res = tex.shape[0]
    R, G, B, A = tex[..., 0], tex[..., 1] * T_MAX, tex[..., 2], tex[..., 3] * T_MAX
    yy, xx = np.mgrid[0:res, 0:res].astype(np.float32)
    u = (xx + 0.5) / res - 0.5; v = (yy + 0.5) / res - CY
    ang = np.arctan2(v, u)
    starRnd = hash11(np.floor((ang + np.pi) * 90.0))          # 沿方位角的伪"星 ID"
    alive = t < LIFE * (1 + (starRnd - 0.5) * 0.024)
    flick = 0.82 + 0.3 * hash11(starRnd * 97.0 + np.floor(t * 30.0))
    last = 1 + 0.35 * np.exp(-((LIFE - t) / 0.05) ** 2)

    # 外层星头：轨迹线上、到达时间≈当前时间的一小段
    dto = t - G
    head_o = smoothstep(0.64, 0.95, R) * np.exp(-(dto / 0.02) ** 2) * alive
    k = smoothstep(CHG_OUTER - 0.035, CHG_OUTER + 0.035, t + (starRnd - 0.5) * 0.05)
    col_o = RED * (1 - k[..., None]) + GREEN * k[..., None]
    hdr = (head_o * flick * last)[..., None] * col_o * 16.0

    # 炭火拖尾：剥落后按黑体冷却，并随机闪烁
    age = np.maximum(dto, 0)
    Tk = 2050 * (1 - 0.42 * np.clip(age / 0.9, 0, 1))
    glow = ((Tk - 900) / 1150).clip(0, None) ** 3 * (dto > -0.004) * np.exp(-age / 0.5)
    tw = 0.55 + 0.9 * hash11(xx * 0.137 + yy * 0.731 + frame_seed * 7.13)
    hdr += (R * glow * tw)[..., None] * blackbody_rgb(Tk) * 1.1

    # 芯
    dtc = t - A
    head_c = B * np.exp(-(dtc / 0.014) ** 2) * alive
    kc = smoothstep(CHG_CORE - 0.035, CHG_CORE + 0.035, t)
    col_c = GOLD * (1 - kc) + SILVER * kc
    hdr += (head_c * flick * last)[..., None] * col_c * 6.0

    # 开花闪光（材质内按 UV 距离生成）
    if t < 0.25:
        d2 = (u * 512) ** 2 + (v * 512) ** 2
        hdr += (3.2 * math.exp(-t / 0.045) * np.exp(-d2 / (2 * 17 ** 2)))[..., None] * np.array([1.0, 0.92, 0.8])
    return hdr


def area_down(img, f):
    h, w, c = img.shape
    return img.reshape(h // f, f, w // f, f, c).mean((1, 3))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    maps = {}
    for res, tag in ((2048, "PC_2K"), (1024, "Mobile_1K")):
        tex, radius = bake(res)
        Image.fromarray(tex, "RGBA").save(f"{OUT}/T_Kiku_Yaeshin_TimeMap_{tag}.png", optimize=True)
        maps[tag] = tex
        print("baked", tag, flush=True)
    # 可见半径曲线（UV 单位，相对面片中心），供动态缩放面片减少 overdraw
    np.savetxt(f"{OUT}/Kiku_Yaeshin_RadiusCurve.csv", radius, delimiter=",", header="time_s,radius_uv", comments="", fmt="%.4f")

    # 通道可视化
    for tag, tex in maps.items():
        if tag != "PC_2K": continue
        t = tex.astype(np.float32) / 255
        W = 1024
        panels = []
        for ch, name in ((0, "R 外层轨迹+火花"), (1, "G 外层到达时间"), (2, "B 芯轨迹"), (3, "A 芯到达时间")):
            im = t[..., ch]
            if ch in (1, 3):
                mask = t[..., 0] if ch == 1 else t[..., 2]
                im = im * np.clip(mask * 3, 0, 1)
            panels.append((Image.fromarray((np.clip(im, 0, 1) * 255).astype(np.uint8)).resize((W, W), Image.LANCZOS), name))
        sheet = Image.new("RGB", (W * 2, W * 2))
        try:
            font = ImageFont.truetype("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 40)
        except Exception:
            font = ImageFont.load_default()
        for i, (im, name) in enumerate(panels):
            sheet.paste(im.convert("RGB"), ((i % 2) * W, (i // 2) * W))
            ImageDraw.Draw(sheet).text(((i % 2) * W + 28, (i // 2) * W + 24), name, fill=(230, 223, 207), font=font)
        sheet.save(f"{OUT}/Channels_Preview.png")

    # 只用贴图还原动画：左 PC 2K，右 手游 1K
    fps, N, lead = 60, 204, 12
    tmp = f"{OUT}/_rv"; os.makedirs(tmp, exist_ok=True)
    D = 1024
    yy = np.linspace(0, 1, D)[:, None, None]
    sky = np.broadcast_to(np.array([0.0015, 0.0018, 0.0045]) * (1 - yy) + np.array([0.004, 0.005, 0.012]) * yy, (D, D, 3))
    try:
        font = ImageFont.truetype("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 28)
    except Exception:
        font = ImageFont.load_default()
    for f in range(N):
        t = (f - lead) / fps
        halves = []
        for tag in ("PC_2K", "Mobile_1K"):
            if t < 0:
                hdr = np.zeros((D, D, 3))
            else:
                hdr = material(maps[tag], t, f)
                if hdr.shape[0] != D:
                    hdr = area_down(hdr, hdr.shape[0] // D)
                # 以 512 为基准的亮度归一（2K 线更细）
            halves.append(encode(bloom_preview(hdr) + sky, 1.0))
        frame = Image.fromarray(np.concatenate(halves, 1))
        d = ImageDraw.Draw(frame)
        d.text((24, 20), "PC 2K · 单张 RGBA", fill=(200, 196, 186), font=font)
        d.text((D + 24, 20), "手游 1K · 单张 RGBA", fill=(200, 196, 186), font=font)
        frame.save(f"{tmp}/{f:04d}.png")
        if f % 30 == 0: print("recon", f, flush=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", f"{tmp}/%04d.png",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-movflags", "+faststart",
                    f"{OUT}/Kiku_TimeMap_Reconstruction_2K_vs_1K.mp4"], check=True)
    print("done")
