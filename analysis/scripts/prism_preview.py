"""万彩千轮单元序列：烘焙器预览清单（预览.json）+ Cascade 参数表 + 一张整朵预览图。

烘焙器 →「素材」页 → 打开这个文件夹，就能按引擎的方式播放（帧号曲线、取整、不混合、粒子摆位与参数表一致）。

用法：python analysis/scripts/prism_preview.py --set PW2 [目录]
"""
import json, math, os, sys
import numpy as np, cv2
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prism_unit import SETS, BASE, hex_lin

# ---- 发射器（米、秒；参数表、预览清单、预览图共用）----
EMIT = {
    'PW1': dict(cluster_r=50.0, vel=0.25, drag=2.5, grav=3.0, ball_r=9.0, size_jit=0.15, life_jit=0.1,
                bursts={'01': [0.00, 0.12, 0.24], '02': [0.03, 0.15, 0.27], '03': [0.06, 0.18, 0.30], '04': [0.09, 0.21, 0.33]}, per=2),
    # 实拍：24 颗左右小球在 0.35 s 内陆续开；青绿最多，珊瑚红最少
    'PW2': dict(cluster_r=50.0, vel=0.25, drag=2.5, grav=3.0, ball_r=9.0, size_jit=0.15, life_jit=0.08,
                bursts={'01': [0.00, 0.08, 0.16, 0.26], '02': [0.03, 0.13, 0.24], '03': [0.05, 0.18, 0.30], '04': [0.10, 0.21, 0.33]},
                counts={'01': [2, 2, 2, 1], '02': [2, 2, 2], '03': [2, 2, 2], '04': [2, 2, 1]}),
    # PW3：实拍小球更大（小球半径 ≈ 团半径的 0.26）、更多（约 30 颗）、开得更散（约 0.45 s 内陆续开），颜色比例按实拍星点统计
    'PW3': dict(cluster_r=44.0, vel=0.25, drag=2.5, grav=3.0, ball_r=11.5, size_jit=0.18, life_jit=0.08,
                bursts={'01': [0.00, 0.07, 0.15, 0.24, 0.34, 0.44], '02': [0.03, 0.12, 0.22, 0.33, 0.42], '03': [0.05, 0.17, 0.29, 0.40], '04': [0.09, 0.2, 0.31, 0.43]},
                counts={'01': [2, 2, 2, 2, 1, 1], '02': [2, 2, 2, 1, 1], '03': [2, 2, 2, 1], '04': [2, 1, 1, 1]}),
}


def keys_of(times, life):
    k = [[round(t / life, 5), i] for i, t in enumerate(times)]; k[0][0] = 0.0; return k


def col_keys(cfg, col):
    """B 用：Color Over Life（相对寿命 → 线性 RGB），本色 → 金 → 橙"""
    if 'change' not in cfg: return [[0.0, [1, 1, 1]], [1.0, [1, 1, 1]]]
    L = cfg['life']; c1, g, e = hex_lin(col['hex']), hex_lin(cfg['gold']), hex_lin(cfg['ember'])
    t0, _, w = cfg['change']; td = cfg['die0'] + 0.5 * cfg['die1']
    r = lambda v: [round(float(x), 4) for x in v]
    return [[0.0, r(c1)], [round((t0 - w / 2) / L, 4), r(c1)], [round((t0 + w / 2) / L, 4), r(g)],
            [round((td - 0.2) / L, 4), r(g)], [round(min(td + 0.2, L) / L, 4), r(e)], [1.0, r(e)]]


def manifest(set_id, meta):
    cfg, em = SETS[set_id], EMIT[set_id]
    tA, tB, L = meta['A']['times'], meta['B']['times'], cfg['life']
    rf = np.mean([c['radiusFrac'] for c in meta['colors'].values()]); size = 2 * em['ball_r'] / rf
    ems = []
    for col in cfg['colors']:
        i = col['index']; bt = em['bursts'][i]; cn = em.get('counts', {}).get(i, [em.get('per', 2)] * len(bt))
        ems.append({
            'name': col['name'], 'index': i,
            'tex': {'A': {'file': f'{BASE}_Unit_4x4_{i}.png', 'mode': 'rgb', 'cols': 4, 'rows': 4, 'chans': 1, 'frames': 16, 'keys': keys_of(tA, L)},
                    'B': {'file': f'{BASE}_UnitRGBA_4x4_{i}.png', 'mode': 'gray', 'ramp': f'{BASE}_UnitRGBA_Ramp_{i}.png', 'cols': 4, 'rows': 4, 'chans': 4, 'frames': 64,
                          'keys': keys_of(tB, L), 'col': col_keys(cfg, col)}},
            'cutout': f'{BASE}_Unit_Cutout_{i}.png',
            'life': [round(L * (1 - em['life_jit']), 3), round(L * (1 + em['life_jit']), 3)],
            'bursts': [[t, n] for t, n in zip(bt, cn)],
            'sphere': {'r': em['cluster_r'], 'surface': True, 'vel': em['vel']}, 'drag': em['drag'], 'accel': [0, 0, -em['grav']],
            'size': [round(size * (1 - em['size_jit']), 2), round(size * (1 + em['size_jit']), 2)], 'rot': True, 'seed': int(i)})
    # 取景和实拍对照一样：小球分布外框（团半径 × 1.1 含外飘 + 小球半径 × 0.8）× 1.2
    view = 160 if set_id in ('PW1', 'PW2') else round(2 * 1.2 * (1.1 * em['cluster_r'] + 0.8 * em['ball_r']), 1)
    return {'title': f'万彩千轮 {set_id}', 'set': set_id, 'duration': round(L * 1.12 + 0.4, 2), 'view': view,
            'variants': {'A': 'A：16 帧自然色 RGB', 'B': 'B：64 帧灰度 + Ramp'}, 'emitters': ems}


def ue_pts(keys):
    return '(' + ','.join(f'(InVal={u:.6f},OutVal={v:.6f},ArriveTangent=0.000000,LeaveTangent=0.000000,InterpMode=CIM_Linear)' for u, v in keys) + ')'


def ue_vec_pts(keys):
    return '(' + ','.join(f'(InVal={u:.6f},OutVal=(X={c[0]:.6f},Y={c[1]:.6f},Z={c[2]:.6f}),ArriveTangent=(X=0.000000,Y=0.000000,Z=0.000000),LeaveTangent=(X=0.000000,Y=0.000000,Z=0.000000),InterpMode=CIM_Linear)' for u, c in keys) + ')'


def params_txt(set_id, meta, man):
    cfg, em = SETS[set_id], EMIT[set_id]
    e0 = man['emitters'][0]; kA, kB = e0['tex']['A']['keys'], e0['tex']['B']['keys']
    cl = lambda keys: '\n'.join(f'  {u:.4f}    {v}' for u, v in keys)
    per = '\n'.join(f"  _{e['index']} {e['name']}：Burst " + '，'.join(f'(Count {n}, Count Low -1, Time {t:.2f})' for t, n in e['bursts'])
                    + f"；贴图 {e['tex']['A']['file']}（A）/ {e['tex']['B']['file']} + {e['tex']['B']['ramp']}（B）；Cutout {e['cutout']}" for e in man['emitters'])
    total = sum(n for e in man['emitters'] for _, n in e['bursts'])
    colpart = ''
    if 'change' in cfg:
        colpart = '\nB 的 Color Over Life（每个颜色一条；本色 → 约 1.0 s 变金 → 熄灭前转橙；A 不用，颜色已在贴图里）\n' + '\n'.join(
            f"▸ _{e['index']} {e['name']}：Color Over Life → Constant Curve → Points\n{ue_vec_pts(e['tex']['B']['col'])}" for e in man['emitters'])
    head = '颜色按实拍 万彩千轮A/B 测得：炸开后约 1 秒是本色（青绿 / 银白 / 淡黄 / 珊瑚红），然后整颗球变金，熄灭前转橙。' if 'change' in cfg else '颜色用 C/D 包里的颜色，不变色。'
    txt = f"""万彩千轮 PrismWheels · 单元序列 × 粒子（{set_id}）
{head}
先在烘焙器里看：打开 tool/FireworkBaker.html →「素材」→ 打开文件夹，选这个目录（analysis/results/{set_id}）。

【两套贴图】每个颜色一个发射器，其余参数相同
A 自然色：2048×2048 RGB，4 × 4 = 16 帧，单格 512。导入 sRGB 勾选，BC7。用 RGB 序列帧材质（不走 Ramp）。{'变色已烘在贴图里。' if 'change' in cfg else ''}
B 灰度 + Ramp：2048×2048 RGBA 接力，每通道 4 × 4、共 64 帧（R 0–15、G 16–31、B 32–47、A 48–63），单格 512。导入 sRGB 关闭，BC7。
  用现有 RGBA 序列帧材质；列 = 4，行 = 4；Ramp = 对应的 _UnitRGBA_Ramp。{'Ramp 是中性白，颜色和变色靠 Color Over Life（下面）。' if 'change' in cfg else ''}
Cutout：_Unit_Cutout_xx（512×512）；Required → Cutout Texture，Sub Images 1 × 1，Bounding Mode = Eight Vertices，Opacity Source Mode = Alpha，Alpha Threshold = 0.1。

【看什么】
1. 帧数：A 张开阶段每帧最多跳约 {max(meta['A']['maxDisp']):.0f} 像素，B ≤ {max(meta['B']['maxDisp']):.0f} 像素。实际距离看不出跳就用 A。
2. 大小、分布、先后、颜色是否像 万彩千轮B.mp4。

【Cascade：{len(man['emitters'])} 个发射器（每个颜色一个），CPU 粒子】
Required：Material = 该颜色的材质实例；Screen Alignment = Square；Use Local Space 不勾选；Emitter Duration = 1.0 s；Emitter Loops = 1
  A 用 SubUV 播放时：Sub Images Horizontal = 4，Vertical = 4，Interpolation Method = Linear（不要选 Linear_Blend）
  B 用 Dynamic Parameter 取帧：Sub Images 1 × 1，Interpolation Method = None
Spawn：Rate = 0；Burst List（Emitter Duration = 1 s，Time 就是秒；共 {total} 颗小球）
{per}
Lifetime：Distribution Float Uniform，Min {e0['life'][0]}，Max {e0['life'][1]}
Initial Size：Distribution Vector Uniform，Min = {e0['size'][0] * 100:.0f}，Max = {e0['size'][1] * 100:.0f}；勾选 Lock Axes，Locked Axes = XYZ（完全张开时小球半径约 {em['ball_r']:.0f} m）
Sphere（Location）：Start Radius = {em['cluster_r'] * 100:.0f}；Positive / Negative X、Y、Z 全勾；Surface Only 勾选；Velocity 勾选，Velocity Scale = {em['vel']}
Drag：Drag Coefficient = {em['drag']}
Const Acceleration：Z = {-em['grav'] * 100:.0f}
Initial Rotation：Distribution Float Uniform，Min 0，Max 1
Color Over Life：A 用 (1, 1, 1)、Alpha 1；B 见下面；亮度倍数按项目曝光再乘

帧号曲线（相对寿命 → 帧号，线性，材质取整）
A（16 帧）：Dynamic Parameter 帧号通道，或 SubUV → Sub Image Index，二选一
{cl(kA)}
B（64 帧）：Dynamic Parameter 帧号通道
{cl(kB)}

【可直接粘贴】（Distribution 选 Constant Curve，右键 Points → 粘贴）
▸ A：Dynamic Parameter 第三参数 / SubUV Sub Image Index
{ue_pts(kA)}
▸ B：Dynamic Parameter 第三参数
{ue_pts(kB)}
{colpart}
"""
    return txt


def srgb_dec(b):
    x = b / 255.0
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def still(d, man, out_jpg):
    """按清单摆粒子，出 6 个时刻的整朵图（A 贴图，正交平视）"""
    N, W = 900, man['view']; px_m = N / W; snaps = []
    cells = {}
    for e in man['emitters']:
        A = srgb_dec(np.array(Image.open(os.path.join(d, e['tex']['A']['file']))).astype(np.float32)); C = A.shape[0] // 4
        cells[e['index']] = [A[r * C:(r + 1) * C, q * C:(q + 1) * C] for r in range(4) for q in range(4)]
    parts = []
    for e in man['emitters']:
        rng = np.random.default_rng(e['seed'])
        for t0, n in e['bursts']:
            for _ in range(n):
                p = rng.normal(size=3); p *= e['sphere']['r'] / np.linalg.norm(p)
                parts.append(dict(e=e, t0=t0, p=p, v=p * e['sphere']['vel'], size=rng.uniform(*e['size']), rot=rng.uniform(0, 360), life=rng.uniform(*e['life'])))
    for t in (0.2, 0.45, 0.8, 1.3, 1.9, 2.5):
        acc = np.zeros((N, N, 3), np.float32)
        for b in parts:
            age = t - b['t0']; e = b['e']
            if age < 0 or age >= b['life']: continue
            k = e['drag']; s1 = (1 - math.exp(-k * age)) / k
            x = b['p'][0] + b['v'][0] * s1; z = b['p'][2] + b['v'][2] * s1 + e['accel'][2] / k * (age - s1)
            u = age / b['life']; f = max(i for i, (kk, _) in enumerate(e['tex']['A']['keys']) if kk <= u)
            s = max(4, int(b['size'] * px_m))
            spr = cv2.warpAffine(cv2.resize(cells[e['index']][f], (s, s), interpolation=cv2.INTER_AREA), cv2.getRotationMatrix2D((s / 2, s / 2), b['rot'], 1.0), (s, s))
            cx, cy = int(N / 2 + x * px_m - s / 2), int(N / 2 - z * px_m - s / 2)
            x0, y0, x1, y1 = max(cx, 0), max(cy, 0), min(cx + s, N), min(cy + s, N)
            if x0 < x1 and y0 < y1: acc[y0:y1, x0:x1] += spr[y0 - cy:y1 - cy, x0 - cx:x1 - cx]
        m = np.clip(acc, 0, 1); img = (np.where(m <= 0.0031308, m * 12.92, 1.055 * np.power(m, 1 / 2.4) - 0.055) * 255).astype(np.uint8)[..., ::-1].copy()
        cv2.putText(img, f'{t:.2f}s', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (200, 200, 200), 1, cv2.LINE_AA)
        snaps.append(cv2.resize(img, (450, 450), interpolation=cv2.INTER_AREA))
    cv2.imwrite(out_jpg, np.hstack(snaps), [cv2.IMWRITE_JPEG_QUALITY, 88])


def preview_js(set_id, d, man):
    """烘焙器迭代区用：清单 + 缩小的贴图（每格 256）打成一个 js，file:// 下也能直接读"""
    import base64, io
    imgs = {}
    def enc(im, fmt='PNG'):
        b = io.BytesIO(); im.save(b, fmt, optimize=True); return f'data:image/{fmt.lower()};base64,' + base64.b64encode(b.getvalue()).decode()
    for e in man['emitters']:
        for v, t in e['tex'].items():
            im = Image.open(os.path.join(d, t['file'])); W = im.width // 2
            if im.mode == 'RGBA':   # RGBA 接力：每个通道单独一张灰度图（浏览器解带透明度的 PNG 会把 A = 0 处的 RGB 清零）
                for c, band in zip('RGBA', im.split()): imgs[t['file'] + '#' + c] = enc(band.resize((W, W), Image.BOX))
            else:
                imgs[t['file']] = enc(im.convert('RGB').resize((W, W), Image.BOX))
            if t.get('ramp'): imgs[t['ramp']] = enc(Image.open(os.path.join(d, t['ramp'])))
        imgs[e['cutout']] = enc(Image.open(os.path.join(d, e['cutout'])).resize((256, 256), Image.BOX))
    js = 'FW_ASSET_LOADED(' + json.dumps(set_id) + ', ' + json.dumps({'manifest': man, 'images': imgs}, ensure_ascii=False) + ');\n'
    open(os.path.join(d, 'preview.js'), 'w', encoding='utf-8').write(js)


def run(set_id, d):
    meta = json.load(open(os.path.join(d, 'PrismWheels_Unit.json'), encoding='utf-8'))
    man = manifest(set_id, meta)
    json.dump(man, open(os.path.join(d, '预览.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(os.path.join(d, 'PrismWheels_Cascade参数.txt'), 'w', encoding='utf-8').write(params_txt(set_id, meta, man))
    still(d, man, os.path.join(d, 'PrismWheels_整朵预览.jpg'))
    preview_js(set_id, d, man)


if __name__ == '__main__':
    a = sys.argv[1:]; sid = 'PW2'
    if '--set' in a: i = a.index('--set'); sid = a[i + 1]; del a[i:i + 2]
    run(sid, a[0] if a else os.path.join(ROOT, 'analysis', 'results', sid))
