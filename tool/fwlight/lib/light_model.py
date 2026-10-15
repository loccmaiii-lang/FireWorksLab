# -*- coding: utf-8 -*-
"""
烟花编排 (.dfshow) -> 单盏灯的 Intensity / LightColor 曲线。

计算流程（详见交接文档第 4 节）：
  1. 读 .dfshow 的 events / templateLibrary / cues，按平台过滤（pc: 去掉 mobile=only 的手游替身）
  2. 读关卡 umap，取发射点 BP_ShowEffectPoint 与目标灯的 UE 世界坐标
  3. 对每一发烟花按花型生成逐帧(30fps)光量包络，乘以 "尺寸光通量 x 距离权重"，累加到 S[f]，
     同时按颜色累加 RGB[f]
  4. Intensity = i_peak * (S/Smax)^gamma ；颜色 = RGB/S 再按最大通道归一
  5. 关键帧精简：线性插值误差约束 + 强制保留局部峰值
"""
import math
import os
import random
import struct
import time

from . import common
from .uepkg import Pkg


# ---------------------------------------------------------------- 颜色工具
def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin_to_srgb(x):
    x = max(0.0, min(1.0, x))
    return 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055


def hex_lin(h):
    h = h.lstrip('#')
    return [srgb_to_lin(int(h[i:i + 2], 16)) for i in (0, 2, 4)]


def lin_hex(c, k=1.0):
    return '#%02x%02x%02x' % tuple(int(round(255 * lin_to_srgb(v * k))) for v in c)


def boost(c, k):
    """线性空间饱和度增强：以 Rec.709 亮度为轴向外推。"""
    lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    return [max(0.0, lum + (x - lum) * k) for x in c]


WHITE_CRACKLE = hex_lin('#fff1d8')   # 裂星末段噼啪的白光
TRAIL_COL = hex_lin('#ffc47a')       # 升空尾缀
LIFT_COL = hex_lin('#ffd59a')        # 炮口闪光


# ---------------------------------------------------------------- 花型光学档案
# fl   = 开花瞬时闪光强度（相对值）
# body = 星体燃烧段强度
# k    = 燃烧段衰减指数 (1-u)^k，越大熄得越快
# kind = 特殊调制类型（见 burst_value）
PROFILES = [
    ('Kamuro',      dict(fl=0.70, body=0.60, k=0.85, kind='kamuro')),   # 金垂柳：长拖尾
    ('Crackle',     dict(fl=1.00, body=0.35, k=1.6,  kind='crackle')),  # 裂星/爆裂星：末段白色噼啪
    ('_CR_',        dict(fl=1.00, body=0.35, k=1.6,  kind='crackle')),  # 小平台短爆裂
    ('Strobe',      dict(fl=0.80, body=0.50, k=1.0,  kind='strobe')),   # 点灭星：6Hz 闪烁
    ('Glitter',     dict(fl=0.90, body=0.50, k=1.1,  kind='glitter')),  # 辉星：9Hz 微颤
    ('MultiLayer',  dict(fl=1.00, body=0.55, k=1.4,  kind='multi')),    # 多重菊：0.3/0.6s 二三次闪
    ('Prism',       dict(fl=0.60, body=0.35, k=1.3,  kind='prism')),    # 彩千轮：1.0s 二次爆
    ('Spark',       dict(fl=0.90, body=0.60, k=1.1,  kind='std')),      # 金锦菊
    ('_GS_',        dict(fl=0.90, body=0.60, k=1.1,  kind='std')),      # 小平台小金花簇
    ('Peony',       dict(fl=1.00, body=0.50, k=1.5,  kind='std')),      # 牡丹
    ('Lime',        dict(fl=1.00, body=0.50, k=1.5,  kind='std')),      # 青柠
]
DEFAULT_PROFILE = dict(fl=1.00, body=0.55, k=1.3, kind='std')           # 各类菊（默认）


def profile(template_id):
    for key, pr in PROFILES:
        if key in template_id:
            return pr
    return DEFAULT_PROFILE


def fan_beams(template_id):
    for n in (13, 9, 5, 1):
        if 'Red%d' % n in template_id or 'Silver%d' % n in template_id:
            return n
    return 4


# ---------------------------------------------------------------- 输入读取
def load_show(cfg):
    path = common.resolve(cfg, cfg['show']['dfshow'])
    d = common.read_json(path)
    doc = d['payload']['doc']
    return path, d, doc


def _positions_cache_path(cfg):
    name = cfg['ue']['level_asset'].split('/')[-1].split('.')[0]
    return os.path.join(common.ROOT, 'data', 'level_positions_%s.json' % name)


def read_level_positions(cfg):
    """从关卡 umap 读 RelativeLocation（这些 Actor 都无父级，相对坐标即世界坐标，单位 cm）。
    读到后缓存到 data/level_positions_<关卡>.json；找不到 umap（比如机器上没同步工程）时退回读缓存。"""
    umap = common.asset_to_file(cfg, cfg['ue']['level_asset'], exts=('.umap',))
    cache = _positions_cache_path(cfg)
    if not os.path.exists(umap):
        if os.path.exists(cache):
            c = common.read_json(cache)
            print('[提示] 找不到关卡文件 %s，使用坐标缓存 %s（%s）' % (umap, cache, c.get('saved_at')))
            prefix = cfg['ue']['effect_point_prefix']
            pos = {k: tuple(v) for k, v in c['positions'].items()}
            return cache, {k[len(prefix):]: v for k, v in pos.items() if k.startswith(prefix)}, \
                {k: v for k, v in pos.items() if not k.startswith(prefix)}
        raise SystemExit('找不到关卡文件 %s，也没有坐标缓存 %s' % (umap, cache))
    p = Pkg(umap)
    pos = {}
    for i, e in enumerate(p.exports):
        path = p.fullpath(i + 1)
        if not (path.endswith('.SceneRootComponent') or path.endswith('.LightComponent0')):
            continue
        props, _ = p.props(e['offset'], e['offset'] + e['size'])
        for t in props:
            if t['name'] == 'RelativeLocation':
                pos[path.split('.')[-2]] = struct.unpack('<3f', t['raw'][:12])
    try:
        old = common.read_json(cache).get('positions') if os.path.exists(cache) else None
        new = {k: list(v) for k, v in sorted(pos.items())}
        if old != new:
            common.write_json(cache, {'level': cfg['ue']['level_asset'], 'umap': umap,
                                      'saved_at': time.strftime('%Y-%m-%d %H:%M:%S'), 'positions': new}, indent=1)
    except OSError:
        pass
    prefix = cfg['ue']['effect_point_prefix']
    pts = {k[len(prefix):]: v for k, v in pos.items() if k.startswith(prefix)}
    actors = {k: v for k, v in pos.items() if not k.startswith(prefix)}
    return umap, pts, actors


# ---------------------------------------------------------------- 主计算
def compute(cfg, light):
    m = common.model_params(cfg, light)
    li = common.light_info(cfg, light)
    show_path, raw, doc = load_show(cfg)
    umap, pts, actors = read_level_positions(cfg)
    if not li['level_actor'] or li['level_actor'] not in actors:
        raise SystemExit('关卡 %s 中找不到灯光 Actor "%s"（可选: %s）' % (umap, li['level_actor'], ', '.join(sorted(actors))))
    L = actors[li['level_actor']]

    FPS = m['fps']
    R0 = m['r0_m']
    TAU = m['flash_tau_s']
    sat = m['sat_boost']
    offset = cfg['show'].get('time_offset_s', 0.0)
    platform = cfg['show'].get('platform', 'pc')
    tpl = {t['id']: t for t in doc['templateLibrary']}
    cues = {c['id']: c for c in doc['cues']}
    rnd = random.Random(m['seed'])

    def wdist(x, y, z):
        dx, dy, dz = (x - L[0]) / 100.0, (y - L[1]) / 100.0, (z - L[2]) / 100.0
        r2 = dx * dx + dy * dy + dz * dz
        return R0 * R0 / (R0 * R0 + r2), math.sqrt(r2)

    def keep(c):
        mob = c.get('mobile')
        return (mob != 'only') if platform == 'pc' else (mob is not False)

    excl_zones = set(cfg['show'].get('exclude_zones', []) or [])
    excl_tpl = set(cfg['show'].get('exclude_templates', []) or [])
    events = [e for e in doc['events'] if keep(cues[e['cueId']])
              and e.get('zone') not in excl_zones and e['templateId'] not in excl_tpl]
    missing = sorted({e['pointId'] for e in events if e['pointId'] not in pts})
    if missing:
        raise SystemExit('关卡中缺少发射点: %s' % missing)

    nF = int(math.ceil(cfg['show']['seq_end_s'] * FPS)) + 1
    S = [0.0] * nF
    RGB = [[0.0, 0.0, 0.0] for _ in range(nF)]

    def add(f, v, col):
        if 0 <= f < nF and v > 0:
            S[f] += v
            RGB[f][0] += v * col[0]
            RGB[f][1] += v * col[1]
            RGB[f][2] += v * col[2]

    for e in events:
        t = tpl[e['templateId']]
        px, py, pz = pts[e['pointId']]
        col = boost(hex_lin(t['color']), sat)
        tl = e['effectiveLaunch'] + offset
        tb = e['effectiveBurst'] + offset
        te = e['effectiveEnd'] + offset
        life = max(0.3, te - tb)
        fb = int(round(tb * FPS))
        fl_ = int(round(tl * FPS))

        # ---- 扇形 / 彗星：持续型，按束数计光 ----
        if t['kind'] in ('fan', 'comet'):
            P = m['fan_power_per_beam'] * fan_beams(e['templateId']) if t['kind'] == 'fan' else m['comet_power']
            w, _ = wdist(px, py, pz + m['fan_height_m'] * 100.0)
            amp = P * w
            for i in range(int(life * FPS) + 2):
                tt = i / FPS
                u = tt / life
                env = min(1.0, tt / 0.15) * (1.0 if u < 0.6 else max(0.0, 1 - (u - 0.6) / 0.4))
                add(fb + i, amp * env, col)
            continue

        # ---- 球花 ----
        P = (t['diameter'] / 150.0) ** m['size_exp']
        hb = pz + t['flightHeight'] * 100.0
        w, _ = wdist(px, py, hb)
        amp = P * w
        pr = profile(e['templateId'])
        # 发射：炮口闪(2帧) + 升空尾缀
        wl, _ = wdist(px, py, pz)
        add(fl_, m['launch_flash'] * P * wl, LIFT_COL)
        add(fl_ + 1, 0.4 * m['launch_flash'] * P * wl, LIFT_COL)
        rise_n = max(1, fb - fl_)
        for i in range(1, rise_n):
            u = i / rise_n
            wm, _ = wdist(px, py, pz + (hb - pz) * u)
            add(fl_ + i, m['rise_glow'] * P * wm * min(1.0, u * 4) * (1 - 0.5 * u), TRAIL_COL)
        # 开花
        phase = rnd.random() * 6.283
        for i in range(int(life * FPS) + 2):
            tt = i / FPS
            u = min(1.0, tt / life)
            flash = math.exp(-tt / TAU)
            body = min(1.0, tt / 0.12) * (1 - u) ** pr['k']
            v = pr['fl'] * flash + pr['body'] * body
            kind = pr['kind']
            if kind == 'strobe':
                v = pr['fl'] * flash + pr['body'] * body * (0.65 + 0.35 * (0.5 + 0.5 * math.sin(2 * math.pi * 6.0 * tt + phase)))
            elif kind == 'glitter':
                v = pr['fl'] * flash + pr['body'] * body * (0.88 + 0.12 * math.sin(2 * math.pi * 9.0 * tt + phase))
            elif kind == 'multi':
                v += 0.55 * (math.exp(-(tt - 0.30) / TAU) if tt >= 0.30 else 0) + 0.35 * (math.exp(-(tt - 0.60) / TAU) if tt >= 0.60 else 0)
            elif kind == 'prism':
                if tt >= 1.0:
                    v += 0.9 * math.exp(-(tt - 1.0) / 0.45) * min(1.0, (tt - 1.0) / 0.06)
            elif kind == 'kamuro':
                body = min(1.0, tt / 0.15) * (math.exp(-tt / (0.42 * life)) * (1 - u) ** 0.5)
                v = pr['fl'] * flash + pr['body'] * body
            if kind == 'crackle':
                ck = 0.0
                for cu in (0.62, 0.72, 0.82):
                    ck += 0.35 * math.exp(-((u - cu) * life) ** 2 / (2 * 0.045 ** 2))
                if ck > 0.01:
                    add(fb + i, amp * ck, WHITE_CRACKLE)
            add(fb + i, amp * v, col)

    # ---- 动态范围压缩 ----
    smax = max(S)
    I = [m['i_peak'] * (s / smax) ** m['gamma'] if s > 0 else 0.0 for s in S]

    # ---- 颜色：加权平均 -> 最大通道归一；暗场保持上一颜色 ----
    last = boost(hex_lin(m['start_color']), sat)
    m0 = max(last)
    last = [x / m0 for x in last]
    thr = smax * 0.004
    hold = m['dark_color_hold']
    cols = []
    for f in range(nF):
        if S[f] > thr:
            c = [RGB[f][k] / S[f] for k in range(3)]
            mx = max(c)
            c = [x / mx for x in c] if mx > 0 else last
            a = min(1.0, S[f] / (smax * hold))
            c = [last[k] + (c[k] - last[k]) * a for k in range(3)]
            last = c
        cols.append(list(last))

    return dict(light=light, params=m, light_pos=L, pts=pts, actors=actors, umap=umap,
                show_path=show_path, doc=doc, tpl=tpl, cues=cues, events=events,
                S=S, I=I, cols=cols, nF=nF, smax=smax)


# ---------------------------------------------------------------- 关键帧精简
def simplify(channels, tols, forced=()):
    """多通道共享帧序号的贪心精简：保证线性重建误差 <= tol；forced 中的帧必保留。"""
    n = len(channels[0])
    keep = [0]
    forced = set(forced)
    a, b = 0, 1
    while b < n:
        ok = True
        if b - a > 1:
            for ch, tol in zip(channels, tols):
                va, vb = ch[a], ch[b]
                for k in range(a + 1, b):
                    if abs(ch[k] - (va + (vb - va) * (k - a) / (b - a))) > tol:
                        ok = False
                        break
                if not ok:
                    break
        if not ok or ((b - 1) in forced and (b - 1) != a):
            keep.append(b - 1)
            a = b - 1
            continue
        b += 1
    if keep[-1] != n - 1:
        keep.append(n - 1)
    return sorted(set(keep))


def build_keys(cfg, light):
    """按 config.lights[light] 生成 keys。
    - 普通灯：按自身坐标计算
    - curve_from=X：直接用灯 X 的计算结果，再对 Intensity 做 v*intensity_scale+intensity_offset
    返回 (R, keys)，R 为实际参与计算的那盏灯的结果（报告用）。"""
    li = common.light_info(cfg, light)
    src = li['curve_from'] or light
    R = compute(cfg, src)
    keys = make_keys(R, cfg)
    keys['light'] = light
    keys['binding'] = li['binding']
    keys['component'] = li['component']
    if li['curve_from']:
        s, o = float(li['intensity_scale']), float(li['intensity_offset'])
        keys['intensity']['keys'] = [[f, round(v * s + o, 6)] for f, v in keys['intensity']['keys']]
        keys['intensity']['default'] = round(keys['intensity']['default'] * s + o, 6)
        keys['meta']['curve_from'] = src
        keys['meta']['intensity_scale'] = s
        keys['meta']['intensity_offset'] = o
    return R, keys


def make_keys(R, cfg):
    """生成 fwlight.keys/2 格式（ue/ue_apply_keys.py 读取）。"""
    m = R['params']
    I, cols, nF = R['I'], R['cols'], R['nF']
    peaks = [f for f in range(1, nF - 1) if I[f] > I[f - 1] and I[f] >= I[f + 1] and I[f] > m['i_peak'] * 0.02]
    ik = simplify([I], [m['i_peak'] * m['int_tol']], forced=peaks)
    ck = simplify([[c[0] for c in cols], [c[1] for c in cols], [c[2] for c in cols]], [m['col_tol']] * 3)
    c0 = cols[ck[0]]
    return {
        'format': 'fwlight.keys/2',
        'light': R['light'],
        'binding': common.light_info(cfg, R['light'])['binding'],
        'component': common.light_info(cfg, R['light'])['component'],
        'fps': m['fps'],
        'interp': 'linear',
        'intensity': {'default': 0.0, 'keys': [[f, round(I[f], 3)] for f in ik]},
        'color': {
            'R': {'default': round(c0[0], 4), 'keys': [[f, round(cols[f][0], 4)] for f in ck]},
            'G': {'default': round(c0[1], 4), 'keys': [[f, round(cols[f][1], 4)] for f in ck]},
            'B': {'default': round(c0[2], 4), 'keys': [[f, round(cols[f][2], 4)] for f in ck]},
            'A': {'default': 1.0, 'keys': []},
        },
        'meta': {
            'generated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'dfshow': R['show_path'],
            'dfshow_sha256': common.sha256(R['show_path']),
            'level': R['umap'],   # 关卡 umap 或坐标缓存文件
            'light_pos_cm': [round(v, 2) for v in R['light_pos']],
            'platform': cfg['show'].get('platform', 'pc'),
            'time_offset_s': cfg['show'].get('time_offset_s', 0.0),
            'events': len(R['events']),
            'params': m,
            'n_intensity': len(ik), 'n_color': len(ck), 'n_forced_peaks': len(peaks),
        },
    }
