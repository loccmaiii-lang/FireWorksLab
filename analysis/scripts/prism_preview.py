"""万彩千轮单元序列：预览视频 + Cascade 参数表。

读 prism_unit.py 的输出目录，生成：
  PrismWheels_单元对比.mp4：四色 × {A 16 帧自然色, B 64 帧灰度+Ramp}，按引擎方式播放（30 fps、取整、不混合）；
  PrismWheels_整朵预览.mp4：按参数表的发射器设置摆 24 颗小球（正交、平视），用 A 贴图；
  PrismWheels_整朵预览.jpg：整朵预览的 6 个时刻；
  PrismWheels_Cascade参数.txt。

用法：python analysis/scripts/prism_preview.py [目录]
"""
import json, math, os, sys
import numpy as np, cv2
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE = 'T_EFX_FireWorks_PrismWheels'
FPS = 30
# ---- 发射器设置（参数表与预览共用；单位：米、秒）----
CLUSTER_R = 50.0       # 小球分布半径（Sphere Start Radius，只取球面）
VEL_SCALE = 0.25       # Sphere → Velocity Scale（速度 = 位置 × 它）
DRAG = 2.5
GRAV = 3.0             # Const Acceleration Z（向下，m/s²）
BALL_R = 9.0          # 小球完全张开的半径
SIZE_JIT = 0.15
LIFE = (2.0, 2.4)
BURSTS = {'01': [0.00, 0.12, 0.24], '02': [0.03, 0.15, 0.27], '03': [0.06, 0.18, 0.30], '04': [0.09, 0.21, 0.33]}
PER_BURST = 2


def srgb_dec(b):
    x = b / 255.0
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def load(d):
    meta = json.load(open(os.path.join(d, 'PrismWheels_Unit.json'), encoding='utf-8'))
    cells = {}
    for cname, c in meta['colors'].items():
        i = c['index']
        A = srgb_dec(np.array(Image.open(os.path.join(d, f'{BASE}_Unit_4x4_{i}.png'))).astype(np.float32))
        G = np.array(Image.open(os.path.join(d, f'{BASE}_UnitRGBA_4x4_{i}.png'))).astype(np.float32) / 255
        R = srgb_dec(np.array(Image.open(os.path.join(d, f'{BASE}_UnitRGBA_Ramp_{i}.png')))[0].astype(np.float32))  # 256×3
        C = A.shape[0] // 4
        a = [A[r * C:(r + 1) * C, q * C:(q + 1) * C] for r in range(4) for q in range(4)]
        b = []
        for f in range(64):
            ch, cell = divmod(f, 16); r, q = divmod(cell, 4); v = G[r * C:(r + 1) * C, q * C:(q + 1) * C, ch]
            b.append(R[np.clip((v * 255).round().astype(int), 0, 255)] * v[..., None])   # 材质：Ramp(v) × v
        cells[i] = (cname, a, b)
    return meta, cells


def frame_at(times, life, age):
    """帧号曲线：key (t_k/life, k)，线性，材质取整"""
    u = age / life; F = len(times)
    for k in range(F - 1, -1, -1):
        if u >= times[k] / 2.2: return k
    return 0


def to8(lin):
    m = np.clip(lin, 0, 1)
    s = np.where(m <= 0.0031308, m * 12.92, 1.055 * np.power(m, 1 / 2.4) - 0.055)
    return (np.clip(s, 0, 1) * 255).astype(np.uint8)


def unit_video(meta, cells, out):
    S = 360; W, H = S * 4, S * 2 + 40
    vw = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*'mp4v'), FPS, (W, H))
    tA, tB = meta['A']['times'], meta['B']['times']
    for loop in range(3):
        for n in range(int(2.2 * FPS) + 8):
            age = n / FPS; img = np.zeros((H, W, 3), np.uint8)
            for j, (i, (cname, a, b)) in enumerate(sorted(cells.items())):
                for row, (seq, ts) in enumerate(((a, tA), (b, tB))):
                    if age >= 2.2: continue
                    fr = seq[frame_at(ts, 2.2, age)]
                    img[40 + row * S:40 + (row + 1) * S, j * S:(j + 1) * S] = cv2.resize(to8(fr), (S, S), interpolation=cv2.INTER_AREA)[..., ::-1]
            cv2.putText(img, 'top: A 16f RGB   bottom: B 64f RGBA+Ramp   (30fps, no blend)', (10, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 1, cv2.LINE_AA)
            vw.write(img)
    vw.release()


def shell_video(meta, cells, out_mp4, out_jpg, seed=3):
    rng = np.random.default_rng(seed)
    balls = []
    for i, ts in BURSTS.items():
        rf = meta['colors'][cells[i][0]]['radiusFrac']
        for t0 in ts:
            for _ in range(PER_BURST):
                p = rng.normal(size=3); p *= CLUSTER_R / np.linalg.norm(p)   # Surface Only
                size = 2 * BALL_R / rf * rng.uniform(1 - SIZE_JIT, 1 + SIZE_JIT)
                balls.append(dict(i=i, t0=t0, p=p, v=p * VEL_SCALE, size=size, rot=rng.uniform(0, 360), life=rng.uniform(*LIFE)))
    Wm = 150.0; N = 900; px_m = N / Wm
    vw = cv2.VideoWriter(out_mp4, cv2.VideoWriter_fourcc(*'mp4v'), FPS, (N, N))
    tA = meta['A']['times']; snaps = []
    T = 3.2
    for n in range(int(T * FPS)):
        t = n / FPS; acc = np.zeros((N, N, 3), np.float32)
        for b in balls:
            age = t - b['t0']
            if age < 0 or age >= b['life']: continue
            e = (1 - math.exp(-DRAG * age)) / DRAG
            x = b['p'][0] + b['v'][0] * e
            z = b['p'][2] + b['v'][2] * e - GRAV / DRAG * (age - e)
            fr = cells[b['i']][1][frame_at(tA, b['life'], age)]
            s = max(4, int(b['size'] * px_m))
            spr = cv2.resize(fr, (s, s), interpolation=cv2.INTER_AREA)
            M = cv2.getRotationMatrix2D((s / 2, s / 2), b['rot'], 1.0)
            spr = cv2.warpAffine(spr, M, (s, s))
            cx, cy = int(N / 2 + x * px_m - s / 2), int(N / 2 - z * px_m - s / 2)
            x0, y0, x1, y1 = max(cx, 0), max(cy, 0), min(cx + s, N), min(cy + s, N)
            if x0 < x1 and y0 < y1: acc[y0:y1, x0:x1] += spr[y0 - cy:y1 - cy, x0 - cx:x1 - cx]
        img = to8(acc)[..., ::-1].copy()
        cv2.putText(img, f'{t:.2f}s', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 1, cv2.LINE_AA)
        vw.write(img)
        if n in (6, 12, 21, 36, 54, 75): snaps.append(img)
    vw.release()
    sheet = np.hstack([cv2.resize(x, (450, 450), interpolation=cv2.INTER_AREA) for x in snaps])
    cv2.imwrite(out_jpg, sheet, [cv2.IMWRITE_JPEG_QUALITY, 88])


def ue_pts(keys):
    return '(' + ','.join(f'(InVal={u:.6f},OutVal={v:.6f},ArriveTangent=0.000000,LeaveTangent=0.000000,InterpMode=CIM_Linear)' for u, v in keys) + ')'


def params_txt(meta, out):
    tA, tB = meta['A']['times'], meta['B']['times']
    kA = [[round(t / 2.2, 5), k] for k, t in enumerate(tA)]; kA[0][0] = 0.0
    kB = [[round(t / 2.2, 5), k] for k, t in enumerate(tB)]; kB[0][0] = 0.0
    rf = np.mean([c['radiusFrac'] for c in meta['colors'].values()])
    size = 2 * BALL_R / rf * 100
    cl = lambda keys: '\n'.join(f'  {u:.4f}    {v}' for u, v in keys)
    names = '\n'.join(f"  _{c['index']} {n}：{BASE}_Unit_4x4_{c['index']}（A）、{BASE}_UnitRGBA_4x4_{c['index']} + {BASE}_UnitRGBA_Ramp_{c['index']}（B）、{BASE}_Unit_Cutout_{c['index']}"
                      for n, c in meta['colors'].items())
    bursts = '\n'.join(f"  _{i}：" + '，'.join(f'(Count {PER_BURST}, Count Low -1, Time {t:.2f})' for t in ts) for i, ts in BURSTS.items())
    txt = f"""万彩千轮 PrismWheels · 单元序列 × 粒子（试验版 PW1）
色光：用户认可的 C/D 色光 V11 D_Soft（analysis/replica/万彩千轮_色光CD/复现说明.md），点位不变，加上张开、拖影、先后熄灭。

【要对比的两套贴图】（每套 4 种颜色，一色一个发射器，其余参数完全相同）
A 自然色：2048×2048 RGB，4 列 × 4 行 = 16 帧，单格 512；颜色就在贴图里。导入 sRGB 勾选，BC7。
  材质：现有的 RGB 序列帧材质（不走 Ramp）。
B 灰度 + Ramp：2048×2048 RGBA 接力，每通道 4 × 4、共 64 帧（R 0–15、G 16–31、B 32–47、A 48–63），单格 512。导入 sRGB 关闭，BC7。
  材质：现有 RGBA 序列帧材质；列 = 4，行 = 4；Ramp = 对应颜色的 _UnitRGBA_Ramp（256×8，sRGB）。
  编码：v = 亮度^(1/2.2)，Ramp 按「Ramp(v) × v = A 的颜色」反推，材质按 Ramp(v) × v 出色时 B 与 A 同色。
  如果你们的 RGBA 材质不是 Ramp(v) × v（比如只输出 Ramp(v)），告诉我实际公式，我重出 Ramp。
每种颜色的文件：
{names}
Cutout：_Unit_Cutout_xx（512×512，所有帧叠加的轮廓，A、B 共用）；Required → Cutout Texture，Sub Images 1×1，Bounding Mode = Eight Vertices，Opacity Source Mode = Alpha，Alpha Threshold = 0.1。

【看什么】
1. 帧数够不够：A 的张开只有 4–5 帧（每帧位移最大约 {max(meta['A']['maxDisp']):.0f} 像素），B 每帧 ≤ {max(meta['B']['maxDisp']):.0f} 像素。
   在实际观看距离下 A 看不出跳，就用 A（省贴图、颜色自然）；看得出，就用 B。
2. 小球大小、分布、先后是否像万彩千轮B.mp4；下面的数值都可以直接改。
3. 预览：PrismWheels_单元对比.mp4（上 A、下 B，按 30 fps 取整播放）、PrismWheels_整朵预览.mp4 / .jpg（按下面的发射器设置摆 24 颗小球）。

【Cascade：4 个发射器（每种颜色一个），CPU 粒子】
Required
  Material = 该颜色的材质实例；Screen Alignment = Square；Use Local Space 不勾选
  Emitter Duration = 1.0 s，Emitter Loops = 1（小球在 1 秒内全部生成完，之后粒子自己活到寿命结束）
  A 用 SubUV 模块播放时：Sub Images Horizontal = 4，Vertical = 4，Interpolation Method = Linear（Linear 是按序号取帧、不混合；不要选 Linear_Blend）
  B（RGBA 材质用 Dynamic Parameter 取帧）：Sub Images 1 × 1，Interpolation Method = None
Spawn
  Rate = 0；Burst List（Emitter Duration = 1 s，所以 Time 就是秒；4 色错开，共 {PER_BURST * 3 * 4} 颗小球在 0–0.33 s 内陆续开）：
{bursts}
Lifetime：Distribution Float Uniform，Min {LIFE[0]}，Max {LIFE[1]}（帧号按相对寿命播放，寿命长短只让整颗球快慢 ±9%）
Initial Size：Distribution Vector Uniform，Min = {size * (1 - SIZE_JIT):.0f}，Max = {size * (1 + SIZE_JIT):.0f}（X、Y、Z 相同）；勾选 Lock Axes，Locked Axes = XYZ
  （完全张开时小球半径约 {BALL_R:.0f} m；贴图里星点外缘在格子半宽的 {rf * 100:.0f}% 处）
Sphere（Location）：Start Radius = {CLUSTER_R * 100:.0f}；Positive / Negative X、Y、Z 全勾；Surface Only 勾选；Velocity 勾选，Velocity Scale = {VEL_SCALE}
  （小球出生在半径 {CLUSTER_R:.0f} m 的球面上，平视时周边密、中间疏，和实拍一样；带一点向外的速度，炸开后继续外飘一小段）
Drag：Drag Coefficient = {DRAG}
Const Acceleration：Z = {-GRAV * 100:.0f}（整颗小球慢慢下坠；下坠没有烘进贴图，所以可以随机旋转）
Initial Rotation：Distribution Float Uniform，Min 0，Max 1（0–360°）
Color Over Life：(1, 1, 1)，Alpha 1；亮度倍数按项目曝光调（颜色在贴图 / Ramp 里，这里只乘亮度）

帧号曲线（相对寿命 → 帧号，线性，材质取整；烘焙时每帧就取这些时刻）
A（16 帧）：Dynamic Parameter 第三通道，或 SubUV → Sub Image Index，二选一
{cl(kA)}
B（64 帧）：Dynamic Parameter 第三通道
{cl(kB)}

【可直接粘贴】（先把 Distribution 类型选成 Float Constant Curve，右键 Points → 粘贴）
▸ A：Dynamic Parameter 第三参数 / SubUV Sub Image Index → Constant Curve → Points
{ue_pts(kA)}
▸ B：Dynamic Parameter 第三参数 → Constant Curve → Points
{ue_pts(kB)}

【可选】母星：主爆后先有 {PER_BURST * 3 * 4} 颗橙色小亮点从中心飞出约 0.3 s 再开成小球。可以另加一个发射器（任意软圆点材质，Lifetime 0.3 s，
  Sphere Start Radius 1 m + Velocity，Initial Velocity 让 0.3 s 飞到约 {CLUSTER_R:.0f} m），并把 4 个颜色发射器的 Emitter Delay 设为 0.3 s。先不加也能判断单元效果。
"""
    open(out, 'w', encoding='utf-8').write(txt)


def run(d):
    meta, cells = load(d)
    params_txt(meta, os.path.join(d, 'PrismWheels_Cascade参数.txt'))
    unit_video(meta, cells, os.path.join(d, 'PrismWheels_单元对比.mp4'))
    shell_video(meta, cells, os.path.join(d, 'PrismWheels_整朵预览.mp4'), os.path.join(d, 'PrismWheels_整朵预览.jpg'))


if __name__ == '__main__':
    run(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'analysis', 'results', 'PW1'))
