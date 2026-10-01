"""生成 UE 实测包（4.0-d，问题清单 C3 / D4 / D5 / D6）：spec/UE实测包/<测试>/ 每个一套 cascade.json + 贴图，用户用本机导入工具导进 UE 跑一次。

用法：python3 analysis/scripts/UE实测包.py   （重新生成全部；文件名固定，重跑覆盖）

四个测试（每个一个目录，一个粒子系统，几个发射器横着排开）：
  FWLTest_Frames      帧号：64 帧 RGBA 接力，每格写帧号 + 进度条。三种帧号曲线：均匀 30 fps、4.0 三档持帧、3.7 式陡峭开头。
                      附 预期帧号.csv（每个 30 fps tick 应该显示第几帧），录屏逐帧对照：有没有跳帧、回跳、查找表抹平（D6）。
  FWLTest_Crosstalk   BC7 / 手机压缩串扰：R / G / B / A 四个通道放完全不同的图案，四个发射器各定在一个通道上。
                      看某个通道里有没有出现别的通道的影子（D4）。手机：同一张图按 ETC2 / ASTC 预览再看一遍。
  FWLTest_Exposure    曝光标定：灰阶 v = 0.02…1.0 十块，白色 Ramp。引擎截图和 预期_曝光卡.png（烘焙器假设：自发光 ×4 + 烘焙器色调）对比（C3）。
  FWLTest_Ramp        Ramp 导入设置：同一张暗底 Ramp 存两份，一份按默认导入（Wrap + Mipmap），一份 Clamp + NoMipmaps；
                      星点贴图中心 v≈1，Wrap 时可能采到 Ramp 的另一头（黑） → 星芯黑圈（D5）。
"""
import json, math, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / 'spec' / 'UE实测包'
N, COLS, ROWS = 2048, 4, 4
CW = N // COLS


def font(sz):
    for fp in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyhbd.ttc', 'C:/Windows/Fonts/arial.ttf'):
        if pathlib.Path(fp).exists(): return ImageFont.truetype(fp, sz)
    return ImageFont.load_default()


def r4(x): return round(x, 4)


def sheet(cell_fn, frames=64):
    """RGBA 接力：帧 f → 通道 f // 16，格子 f % 16（左上起，横着排）"""
    ch = [Image.new('L', (N, N), 0) for _ in range(4)]
    for f in range(frames):
        c, k = divmod(f, COLS * ROWS); x, y = (k % COLS) * CW, (k // COLS) * CW
        ch[c].paste(cell_fn(f), (x, y))
    return Image.merge('RGBA', ch)


def white_ramp(path):
    Image.new('RGB', (256, 8), (255, 255, 255)).save(path)


def emitter(name, mat, life, frame_curve, x_cm, size_cm, loops=0, cutout=None):
    req = {'screen_alignment': 'Rectangle', 'duration_s': r4(life), 'loops': loops, 'delay_s': 0, 'max_draw_count': 1}
    if cutout: req['cutout'] = cutout
    return {'name': name, 'material': mat, 'gpu': False, 'required': req, 'spawn': {'rate': {'const': 0}, 'bursts': [[0, 1]]},
            'modules': [
                {'m': 'Lifetime', 'Lifetime': {'const': r4(life)}},
                {'m': 'InitialSize', 'StartSize': {'const': [size_cm, size_cm, 1]}},
                {'m': 'InitialLocation', 'StartLocation': {'const': [x_cm, 0, 0]}},
                {'m': 'DynamicParameter', 'params': {'frame': frame_curve}},
                {'m': 'ColorOverLife', 'ColorOverLife': {'const': [1, 1, 1]}, 'AlphaOverLife': {'const': 1}}]}


def pack(name, textures, materials, emitters, notes, mobile=False):
    return {'format': 'fwl.cascade/1', 'name': name + ('_Mobile' if mobile else ''), 'platform': 'mobile' if mobile else 'pc',
            'source': {'tool': 'UE实测包.py（4.0-d 引擎实测，不是效果素材）'}, 'textures': textures, 'materials': materials,
            'system': {'preview_distance_cm': 20000, 'preview_warmup_s': 0}, 'emitters': emitters, 'notes': notes}


def write(d, name, textures, materials, emitters, notes):
    for mobile in (False, True):
        (d / ('cascade_mobile.json' if mobile else 'cascade.json')).write_text(
            json.dumps(pack(name, textures, materials, emitters, notes, mobile), ensure_ascii=False, indent=1), encoding='utf-8')


def keys_from_ticks(ticks, n):
    """和烘焙器 keysFromTicks40 同一算法：每帧的起始 tick → 帧号曲线关键点（持帧变了才加点）"""
    F = len(ticks); hold = lambda f: (ticks[f + 1] if f + 1 < F else n) - ticks[f]; keys = [[0, .01]]
    for f in range(1, F - 1):
        if hold(f) != hold(f - 1): keys.append([ticks[f] / n, f + .01])
    keys.append([ticks[F - 1] / n, F - 1 + .01]); keys.append([1, F - .01])
    out = []
    for k in keys:
        if not out or k[0] > out[-1][0] + 1e-9: out.append([r4(k[0]), round(k[1], 2)])
    return out


def frame_at(keys, u):
    for i in range(1, len(keys)):
        if u <= keys[i][0]:
            a = (u - keys[i - 1][0]) / max(1e-9, keys[i][0] - keys[i - 1][0]); return int(math.floor(keys[i - 1][1] + (keys[i][1] - keys[i - 1][1]) * a))
    return int(math.floor(keys[-1][1]))


# ---------------------------------------------------------------- 1. 帧号
def test_frames():
    d = OUT / '1_帧号'; d.mkdir(parents=True, exist_ok=True)
    big, small = font(200), font(44)

    def cell(f):
        im = Image.new('L', (CW, CW), 0); g = ImageDraw.Draw(im)
        g.rectangle([6, 6, CW - 7, CW - 7], outline=90, width=4)
        g.text((CW // 2, CW // 2 - 40), str(f), fill=255, font=big, anchor='mm')
        g.text((CW // 2, CW - 120), 'RGBA'[f // 16] + f'  cell {f % 16}', fill=160, font=small, anchor='mm')
        x = 24 + (CW - 48) * f / 63; g.rectangle([24, CW - 60, CW - 24, CW - 36], outline=120, width=2); g.rectangle([24, CW - 60, int(x), CW - 36], fill=230)
        return im
    sheet(cell).save(d / 'T_FWLTest_Frames.png', optimize=True)
    white_ramp(d / 'T_FWLTest_Frames_Ramp.png')
    # 三种帧号曲线
    lin = {'curve': [[0, .01], [1, 63.99]]}; life_lin = 64 / 30
    holds = [1] * 15 + [2] * 25 + [3] * 24; ticks = np.concatenate([[0], np.cumsum(holds)[:-1]]).astype(int).tolist(); n = sum(holds)
    held = {'curve': keys_from_ticks(ticks, n)}; life_held = n / 30
    steep = {'curve': [[0, .01], [.01, 22.01], [1, 63.99]]}; life_steep = 6.0
    ems = [emitter('Uniform30', 'frames', life_lin, lin, -6000, 5000), emitter('Held3Tier', 'frames', life_held, held, 0, 5000),
           emitter('Steep37', 'frames', life_steep, steep, 6000, 5000)]
    tex = {'seq': {'file': 'T_FWLTest_Frames.png', 'class': 'flipbook', 'cols': COLS, 'rows': ROWS, 'channels': 4, 'frames': 64},
           'ramp': {'file': 'T_FWLTest_Frames_Ramp.png', 'class': 'ramp'}}
    mats = {'frames': {'role': 'flipbook_rgba', 'textures': {'main': 'seq', 'ramp': 'ramp'}, 'scalars': {'rows': ROWS, 'cols': COLS}}}
    write(d, 'FWLTest_Frames', tex, mats, ems, [
        '三个发射器从左到右：Uniform30（每 tick 一帧）、Held3Tier（4.0 三档：0–14 每帧 1 tick，15–39 每帧 2 tick，40–63 每帧 3 tick）、Steep37（3.7 式：开头 1% 寿命里走 22 帧）。',
        '循环播放（loops 0）。按 30 fps 录屏，逐帧读格子里的大号帧号，和 预期帧号.csv 对照。'])
    rows = ['tick,time_s,Uniform30,Held3Tier,Steep37']
    for k in range(int(max(life_lin, life_held, life_steep) * 30) + 1):
        t = k / 30; cols = []
        for life, c in ((life_lin, lin), (life_held, held), (life_steep, steep)):
            cols.append(str(frame_at(c['curve'], t / life)) if t < life - 1e-9 else '')
        rows.append(f'{k},{t:.4f},' + ','.join(cols))
    (d / '预期帧号.csv').write_text('\n'.join(rows) + '\n', encoding='utf-8')


# ---------------------------------------------------------------- 2. 串扰
def test_crosstalk():
    d = OUT / '2_串扰'; d.mkdir(parents=True, exist_ok=True)
    big = font(150); yy, xx = np.mgrid[0:CW, 0:CW]

    def pat(c, f):
        if c == 0: a = ((yy // 16) % 2) * 255                                  # R：横条纹 16 px
        elif c == 1: a = ((xx // 16) % 2) * 255                                # G：竖条纹 16 px
        elif c == 2: a = (((xx + yy) // 23) % 2) * 255                         # B：斜条纹
        else: a = ((np.hypot(xx - CW / 2, yy - CW / 2) // 20) % 2) * 255      # A：同心圆
        a = a.astype(np.float32) * 0.55
        a[CW - 90:CW - 30, 30:CW - 30] = np.linspace(0, 255, CW - 60)[None, :]  # 底部灰阶条（看色带 / 块状）
        a[30:34, 30:CW - 30] = 255; a[40:41, 30:CW - 30] = 255                  # 4 px 和 1 px 细线
        im = Image.fromarray(a.astype(np.uint8)); g = ImageDraw.Draw(im)
        g.text((CW // 2, CW // 2), 'RGBA'[c] + str(f % 16), fill=255, font=big, anchor='mm', stroke_width=6, stroke_fill=0)
        return im
    sheet(lambda f: pat(f // 16, f)).save(d / 'T_FWLTest_Crosstalk.png', optimize=True)
    white_ramp(d / 'T_FWLTest_Crosstalk_Ramp.png')
    ems = [emitter(f'Ch{"RGBA"[c]}', 'xt', 4.0, {'const': c * 16 + .01}, -9000 + c * 6000, 5000) for c in range(4)]
    tex = {'seq': {'file': 'T_FWLTest_Crosstalk.png', 'class': 'flipbook', 'cols': COLS, 'rows': ROWS, 'channels': 4, 'frames': 64},
           'ramp': {'file': 'T_FWLTest_Crosstalk_Ramp.png', 'class': 'ramp'}}
    mats = {'xt': {'role': 'flipbook_rgba', 'textures': {'main': 'seq', 'ramp': 'ramp'}, 'scalars': {'rows': ROWS, 'cols': COLS}}}
    write(d, 'FWLTest_Crosstalk', tex, mats, ems, [
        '四个发射器从左到右固定显示 R / G / B / A 通道的第 0 格：R 横条纹、G 竖条纹、B 斜条纹、A 同心圆，中间写通道字母。',
        '某一格里看到别的通道的条纹 = 压缩串扰。底部灰阶条看色带，顶部 4 px / 1 px 细线看块状模糊。',
        'PC：BC7 导入后看；手机：同一贴图在编辑器里切 ETC2 / ASTC 预览（或真机）再看一遍。'])


# ---------------------------------------------------------------- 3. 曝光
STEPS = [0.02, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.6, 0.8, 1.0]     # 烘焙器假设下 v ≥ 0.4 已接近饱和，低段多放几块才分得出差别


def tone_baker(a):
    """烘焙器 / 回放检查.py 的显示假设：材质 = ramp · v · 颜色 · 4（自发光倍数），色调 1 − exp(−1.5 a)，再 1/2.2"""
    return (np.clip(1 - np.exp(-a * 1.5), 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)


def test_exposure():
    d = OUT / '3_曝光'; d.mkdir(parents=True, exist_ok=True)
    lab = font(38)

    def card(vals_fn):
        im = Image.new('L', (CW, CW), 0); g = ImageDraw.Draw(im); w = (CW - 40) // 5
        for i, v in enumerate(STEPS):
            x0, y0 = 20 + (i % 5) * w, 40 + (i // 5) * 230
            g.rectangle([x0 + 6, y0, x0 + w - 6, y0 + 160], fill=vals_fn(v))
            g.text((x0 + w // 2, y0 + 195), f'{v:g}', fill=200, font=lab, anchor='mm')
        return im
    lin = card(lambda v: int(round(v * 255)))
    sheet(lambda f: lin if f == 0 else Image.new('L', (CW, CW), 0), 1 * 16 * 4).save(d / 'T_FWLTest_Exposure.png', optimize=True)
    white_ramp(d / 'T_FWLTest_Exposure_Ramp.png')
    # 预期：烘焙器假设下的样子（灰阶块 → 显示值），左边 Ramp 白 × 颜色 1
    a = np.array(lin, np.float32) / 255; rgb = tone_baker(a * 4.0)   # 白 Ramp：ramp(v) = 1；材质 = ramp(v) · v · 颜色 · 4（回放检查.py 同一公式），v 线性存储（encGamma 1，贴图不勾 sRGB）
    Image.fromarray(np.repeat(rgb[..., None], 3, -1)).save(d / '预期_曝光卡.png')
    table = ['灰阶 v,材质输出 v·4（线性）,烘焙器预期显示值 0–255'] + [f'{v:g},{v * 4:.2f},{int(tone_baker(np.array([v * 4]))[0])}' for v in STEPS]
    (d / '预期显示值.csv').write_text('\n'.join(table) + '\n', encoding='utf-8')
    ems = [emitter('Card', 'expo', 4.0, {'const': .01}, 0, 6000)]
    tex = {'seq': {'file': 'T_FWLTest_Exposure.png', 'class': 'flipbook', 'cols': COLS, 'rows': ROWS, 'channels': 4, 'frames': 64},
           'ramp': {'file': 'T_FWLTest_Exposure_Ramp.png', 'class': 'ramp'}}
    mats = {'expo': {'role': 'flipbook_rgba', 'textures': {'main': 'seq', 'ramp': 'ramp'}, 'scalars': {'rows': ROWS, 'cols': COLS}}}
    write(d, 'FWLTest_Exposure', tex, mats, ems, [
        '一个面片，十块灰阶（0.02–1.0，线性存储，低段密）。关掉自动曝光（或固定 EV），在游戏常用的后期设置下截图。',
        '对照 预期_曝光卡.png / 预期显示值.csv：差得多说明材质自发光倍数或色调映射和烘焙器假设（×4 + 1−exp(−1.5a)）不同，烘焙器要按实测改。'])


# ---------------------------------------------------------------- 4. Ramp 导入
def test_ramp():
    d = OUT / '4_Ramp'; d.mkdir(parents=True, exist_ok=True)
    yy, xx = np.mgrid[0:CW, 0:CW]; r = np.hypot(xx - CW / 2, yy - CW / 2)
    dot = np.exp(-(r / 70.0) ** 2); dot = np.clip(dot * 1.15, 0, 1)            # 中心到顶（v = 1），测 Ramp 末端
    dot_im = Image.fromarray((dot * 255).astype(np.uint8))
    sheet(lambda f: dot_im if f == 0 else Image.new('L', (CW, CW), 0)).save(d / 'T_FWLTest_Dot.png', optimize=True)
    # 暗底 Ramp：0 黑 → 0.3 深红 → 0.7 橙 → 1 白（和烟花 Ramp 一样两头差别大）
    xs = np.linspace(0, 1, 256); stops = [(0, (0, 0, 0)), (.3, (120, 10, 0)), (.7, (255, 150, 40)), (1, (255, 255, 255))]
    ramp = np.zeros((8, 256, 3), np.uint8)
    for i, x in enumerate(xs):
        for (a, ca), (b, cb) in zip(stops, stops[1:]):
            if a <= x <= b: k = (x - a) / (b - a); ramp[:, i] = [int(ca[j] + (cb[j] - ca[j]) * k) for j in range(3)]; break
    Image.fromarray(ramp).save(d / 'T_FWLTest_Ramp_Default.png'); Image.fromarray(ramp).save(d / 'T_FWLTest_Ramp_Clamp.png')
    ems = [emitter('RampDefault', 'rd', 4.0, {'const': .01}, -3000, 4000), emitter('RampClamp', 'rc', 4.0, {'const': .01}, 3000, 4000)]
    tex = {'seq': {'file': 'T_FWLTest_Dot.png', 'class': 'flipbook', 'cols': COLS, 'rows': ROWS, 'channels': 4, 'frames': 64},
           'rampD': {'file': 'T_FWLTest_Ramp_Default.png', 'class': 'ramp', 'import_hint': '按项目默认 Ramp 设置导入（不改）'},
           'rampC': {'file': 'T_FWLTest_Ramp_Clamp.png', 'class': 'ramp', 'import_hint': 'X/Y Tiling = Clamp，Mip Gen = NoMipmaps，Filter 保持默认'}}
    mats = {'rd': {'role': 'flipbook_rgba', 'textures': {'main': 'seq', 'ramp': 'rampD'}, 'scalars': {'rows': ROWS, 'cols': COLS}},
            'rc': {'role': 'flipbook_rgba', 'textures': {'main': 'seq', 'ramp': 'rampC'}, 'scalars': {'rows': ROWS, 'cols': COLS}}}
    write(d, 'FWLTest_Ramp', tex, mats, ems, [
        '左：Ramp 按项目默认设置导入；右：同一张 Ramp 改成 Clamp + NoMipmaps。星点中心灰度到顶（v = 1）。',
        '左边星芯出现黑圈 / 暗点 = Wrap 采到了 Ramp 另一头，Ramp 必须 Clamp；两边一样 = 默认设置没问题。远近拉一拉看 Mip 的影响。'])


if __name__ == '__main__':
    test_frames(); test_crosstalk(); test_exposure(); test_ramp()
    for p in sorted(OUT.rglob('*')):
        if p.is_file(): print(p.relative_to(ROOT), f'{p.stat().st_size / 1024:.0f} KB')
