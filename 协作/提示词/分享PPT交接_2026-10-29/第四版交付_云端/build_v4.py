# -*- coding: utf-8 -*-
"""分享 PPT 第四版（云端）：烟花秀 AI 全流程（组内分享，2026-10-30）。

用法（仓库根目录）：python3 "协作/提示词/分享PPT交接_2026-10-29/第四版交付_云端/build_v4.py"
结构（用户 10-30 11:07）：01 制作与挑战 → 02 解决思路 → 03 实践成果 → 04 分享与方法 → Thank。
内容底稿：第二版重制（素材、口径）+ 第三版（版式与精简文字）；版式组件沿用第一版 pptkit（VFX 组模板）。
v2（用户 10-30 13:29）：以 11:41 版为底，第 2 页横幅、第 8/9 页沿用 12:21 改动、用户录屏做成动图。
口播与依据写在本文件 NOTES 里，构建时写入每页备注与 口播稿_第四版v2.md。
"""
import os
import re
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from pptkit import *  # noqa: E402,F401,F403

PKG = os.path.abspath(os.path.join(HERE, '..'))
ROOT = os.path.abspath(os.path.join(PKG, '..', '..', '..'))
SRC = os.path.join(HERE, 'src')
SUCAI = os.path.join(PKG, '素材')
V1IMG = os.path.join(PKG, '交付', 'img')
LOCAL3 = os.path.join(PKG, '第三版素材', '原图')
IMG = os.path.join(HERE, 'img')
OUT = os.path.join(HERE, '烟花秀AI全流程_第四版v2.pptx')
SCRIPT_MD = os.path.join(HERE, '口播稿_第四版v2.md')
FOOTER = '三角洲行动 VFX · 烟花工具链与工作方法'
os.makedirs(IMG, exist_ok=True)


# ---------------------------------------------------------------- 配图
def _src(name):
    for base in (SRC, LOCAL3, SUCAI, V1IMG, PKG, ROOT):
        p = os.path.join(base, name)
        if os.path.exists(p):
            return p
    raise FileNotFoundError(name)


def _fix_black(im):
    px = im.load()
    W, H = im.size
    edge = [px[x, y] for x in range(0, W, 3) for y in (0, 1, H - 2, H - 1)] + \
           [px[x, y] for y in range(0, H, 3) for x in (0, 1, W - 2, W - 1)]
    bg = [sorted(c[i] for c in edge)[int(len(edge) * 0.8)] for i in range(3)]
    lut = []
    for i in range(3):
        b = bg[i]
        k = 245.0 / max(1.0, 255.0 - b)
        lut += [int(min(255, max(0, round(10 + (v - b) * k)))) if v > b else 10 for v in range(256)]
    return im.point(lut)


def prep(name, out, w, h, mode='cover', focus=(0.5, 0.5), box=None, scale=1.5, pad=0.0, fix_black=False,
         darken=None):
    im = Image.open(_src(name)).convert('RGB')
    if box:
        im = im.crop(box)
    if fix_black:
        im = _fix_black(im)
    W, H = int(w * scale), int(h * scale)
    if mode == 'cover':
        ar = W / H
        if im.width / im.height > ar:
            cw, ch = int(im.height * ar), im.height
        else:
            cw, ch = im.width, int(im.width / ar)
        cx = min(max(int(focus[0] * im.width - cw / 2), 0), im.width - cw)
        cy = min(max(int(focus[1] * im.height - ch / 2), 0), im.height - ch)
        im = im.crop((cx, cy, cx + cw, cy + ch)).resize((W, H), Image.LANCZOS)
    else:
        canvas = Image.new('RGB', (W, H), (10, 10, 10))
        iw, ih = int(W * (1 - 2 * pad)), int(H * (1 - 2 * pad))
        r = min(iw / im.width, ih / im.height)
        im2 = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
        canvas.paste(im2, ((W - im2.width) // 2, (H - im2.height) // 2))
        im = canvas
    if darken:
        im = darken(im)
    p = os.path.join(IMG, out)
    im.save(p, quality=90, optimize=True)
    return p


def framing_panels():
    """取景示意：同一帧扇形（烘焙器导出效果 FC6O）放进三种面片框；绿点为爆点。"""
    src = Image.open(_src('analysis/results/FC6O_Blender/FC6O_export.png')).convert('RGB')
    fan = _fix_black(src.crop((92, 168, 446, 396)))
    fw, fh = fan.size
    out = {}
    S = 1.5
    PW, PH = int(360 * S), int(274 * S)
    specs = {'fixed': (560, 560, 0.95, (0.5, 0.66)), 'zoom': (620, 620, 0.95, (0.5, 0.5)),
             'anchor': (400, 290, 1.05, (0.5, 0.94))}
    for k, (bw, bh, fs, (bx, by)) in specs.items():
        canvas = Image.new('RGB', (PW, PH), (10, 10, 10))
        d = ImageDraw.Draw(canvas)
        sc = S * 0.40
        bw2, bh2 = int(bw * sc), int(bh * sc)
        x0, y0 = (PW - bw2) // 2, (PH - bh2) // 2
        d.rectangle((x0, y0, x0 + bw2, y0 + bh2), fill=(22, 22, 22), outline=(120, 120, 120), width=2)
        f2 = fan.resize((int(fw * fs * sc), int(fh * fs * sc)), Image.LANCZOS)
        px = x0 + int(bw2 * bx) - f2.width // 2
        py = y0 + int(bh2 * by) - f2.height + int(6 * S)
        region = canvas.crop((px, py, px + f2.width, py + f2.height))
        canvas.paste(ImageChops.lighter(region, f2), (px, py))
        cx, cy = x0 + int(bw2 * bx), y0 + int(bh2 * by)
        r = int(7 * S)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(15, 247, 150))
        p = os.path.join(IMG, f'p06_{k}.jpg')
        canvas.save(p, quality=92)
        out[k] = p
    return out


def _ramp(v):
    """灰度 → 暖色（白热芯 → 金 → 橙 → 暗），只用于动图示意。"""
    stops = [(0, (0, 0, 0)), (40, (60, 18, 4)), (110, (190, 90, 20)), (170, (255, 170, 70)),
             (220, (255, 225, 170)), (255, (255, 250, 235))]
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        if v <= b:
            t = (v - a) / max(1, b - a)
            return tuple(int(ca[i] + (cb[i] - ca[i]) * t) for i in range(3))
    return stops[-1][1]


def sparkler_gif():
    """13 合 1 动图：导出的 64 帧主序列（16 × 4 格）按顺序循环播放，灰度按暖色 Ramp 上色（示意）。"""
    sheet = Image.open(_src('16_仙女棒_64帧序列贴图.jpg')).convert('L')
    cw = sheet.width // 16
    ch = sheet.height // 4
    lut = [_ramp(v) for v in range(256)]
    frames = []
    for r in range(4):
        for c in range(16):
            m = int(cw * 0.16)
            g = sheet.crop((c * cw + m, r * ch + m, (c + 1) * cw - m, (r + 1) * ch - m)).resize((240, 240), Image.LANCZOS)
            rgb = Image.merge('RGB', [g.point([lut[v][i] for v in range(256)]) for i in range(3)])
            canvas = Image.new('RGB', (240, 240), (10, 10, 10))
            canvas.paste(ImageChops.lighter(canvas, rgb))
            frames.append(canvas.convert('P', palette=Image.ADAPTIVE, colors=128))
    p = os.path.join(IMG, 'p14_sparkler_13to1.gif')
    frames[0].save(p, save_all=True, append_images=frames[1:], duration=50, loop=0, disposal=2)
    return p


def trail_gif():
    """尾缀动图：实拍 / 实时模拟 / 导出回放 三行，按五个时刻逐帧切换（已有对照图拆帧）。"""
    im = Image.open(_src('15_升空尾缀_实拍模拟导出对照.jpg')).convert('RGB')
    rows = [(22, 312), (322, 610), (615, 905)]
    frames = []
    for c in range(5):
        canvas = Image.new('RGB', (300, 3 * 290 + 20), (10, 10, 10))
        for i, (y0, y1) in enumerate(rows):
            cell = im.crop((c * 300, y0, c * 300 + 300, y1)).resize((300, 290))
            canvas.paste(cell, (0, i * 300))
        frames.append(canvas.convert('P', palette=Image.ADAPTIVE, colors=200))
    p = os.path.join(IMG, 'p15_trail_5t.gif')
    frames[0].save(p, save_all=True, append_images=frames[1:], duration=700, loop=0)
    return p


def cover_fade(im):
    """封面：左侧压暗放标题与目录，右侧保留实机画面。"""
    import numpy as np
    W, H = im.size
    x = np.linspace(0, 1, W)[None, :]
    y = np.linspace(0, 1, H)[:, None]
    a = np.clip(0.92 - (x - 0.28) / 0.44 * 0.74, 0.18, 0.92)
    a = np.clip(a + np.clip((y - 0.70) / 0.30, 0, 1) * 0.35, 0, 0.95)
    arr = np.asarray(im.convert('RGB')).astype(float)
    out = arr * (1 - a[..., None]) + np.array([10, 10, 10]) * a[..., None]
    return Image.fromarray(out.astype('uint8'))


def thank_scrim(im):
    W, H = im.size
    ov = Image.new('RGB', (W, H), (10, 10, 10))
    mask = Image.new('L', (W, H), 0)
    px = mask.load()
    for y in range(H):
        a = int(255 * min(1.0, max(0.0, (y - H * 0.40) / (H * 0.45))) * 0.92)
        for x in range(W):
            px[x, y] = a
    return Image.composite(ov, im, mask)


def build_images():
    I = {}
    I['cover'] = prep('UE_实机_今年节目_游戏内.jpg', 'cover.jpg', 1920, 1080, box=(643, 96, 2763, 1288), scale=1.0,
                      darken=cover_fade)
    I['p02'] = prep('02_UE跨年秀_彩色全景.jpg', 'p02_show.jpg', 1728, 420, focus=(0.5, 0.66))
    I['p04'] = os.path.join(V1IMG, 'p05_sequencer.jpg')
    I['p05a'] = prep('analysis/results/NF4/缩略图/总表_花型模板.jpg', 'p05_tpl.jpg', 571, 330)
    I['p05b'] = prep('analysis/results/NF4/缩略图/总表_多层模板.jpg', 'p05_multi.jpg', 571, 330)
    I['p05c'] = prep('analysis/results/NF4/缩略图/总表_效果条目.jpg', 'p05_fx.jpg', 571, 330)
    I.update({'p06' + k: v for k, v in framing_panels().items()})
    I['p06gif'] = os.path.join(IMG, 'gif_review.gif')
    I['p07'] = prep('IMPORT5_THEME_20261024_after_1920.png', 'p07_importer.jpg', 1008, 567)
    I['p08'] = prep('极限帧推演_设计图.png', 'p08_frame.jpg', 1000, 605, mode='contain')
    I['p09a'] = prep('wb_基础模板.png', 'p09_base.jpg', 370, 300, box=(250, 115, 790, 553))
    I['p09b'] = prep('wb_花型模板.png', 'p09_flower.jpg', 370, 300, box=(0, 95, 640, 614))
    I['p09gif'] = os.path.join(IMG, 'gif_stage_play.gif')
    I['p09d'] = prep('wb_deliv_list.jpg', 'p09_deliv.jpg', 370, 300, box=(3180, 180, 3840, 715))
    for k in ('baker', 'importer', 'workbench', 'ue'):
        I['p10' + k] = os.path.join(V1IMG, f'p06_{k}.jpg')
    I['p11'] = [(prep(f's09_{n:02d}.jpg', f'p11_{n}.jpg', 300, 300), name) for n, name in
                ((4, '金蕊柠'), (6, '金锦菊'), (8, '小青柠'), (10, '小金花'))]
    I['p11'] += [(prep('UE_扇形_用户截图.png', 'p11_fan.jpg', 300, 300, box=(170, 0, 670, 438)), '扇形 · UE 实机'),
                 (os.path.join(IMG, 'gif_rise_ue1.gif'), '升空尾缀 · UE 实录')]
    I['p12od'] = prep('UE_overdraw_Dam_Iris_Long3.png', 'p12_overdraw.jpg', 1008, 480, box=(0, 40, 1999, 992))
    I['p09full'] = prep('wb_peak_PC_高配.png', 'p09_full.jpg', 1162, 654, scale=1.5)
    I['p14a'] = prep('17_仙女棒13层_第1至7层.jpg', 'p14_l1.jpg', 1162, 188)
    I['p14b'] = prep('18_仙女棒13层_第8至13层.jpg', 'p14_l2.jpg', 1162, 188)
    I['p14c'] = prep('16_仙女棒_64帧序列贴图.jpg', 'p14_sheet.jpg', 1162, 290)
    I['p14gif'] = os.path.join(IMG, 'gif_sparkler_replay.gif')
    I['p14ue'] = os.path.join(IMG, 'gif_sparkler_ue.gif')
    I['p15ue'] = os.path.join(IMG, 'gif_rise_ue4.gif')
    I['p15sim'] = os.path.join(IMG, 'gif_rise_sim.gif')
    lq = 'analysis/results/LOWQ_FIX_20261018/'
    I['p16a'] = prep(lq + '升空_现状对NoMip_低档.jpg', 'p16_sq_now.jpg', 264, 470, box=(1036, 836, 1326, 1210),
                     mode='contain')
    I['p16b'] = prep(lq + '升空_现状对NoMip_低档.jpg', 'p16_sq_fix.jpg', 264, 470, box=(1334, 836, 1624, 1210),
                     mode='contain')
    I['p16ramp'] = prep('第三版素材/原图/Ramp末格_复现.png', 'p16_ramp.jpg', 1064, 450, box=(0, 0, 1042, 556), mode='contain')
    I['demo'] = prep('06_烘焙器界面_引擎回放.jpg', 'demo_bg.jpg', 1200, 675, focus=(0.5, 0.5))
    I['thank'] = prep('UE_实机_今年节目_游戏内.jpg', 'thank.jpg', 1920, 1080, box=(1382, 96, 3775, 1442), scale=1.0,
                      darken=thank_scrim)
    return I


# ---------------------------------------------------------------- 小组件
def label_text(s, x, y, w, t):
    text(s, x, y, w, 36, t, size=S_LABEL, color=ACC, bold=True, spc=4, lh=1.3)


def green_sq(s, x, y, size=12):
    rect(s, x, y, size, size, fill=ACC)


def caption(s, x, y, w, t, size=S_SMALL - 4):
    text(s, x, y, w, 30, t, size=size, alpha=A_NOTE, lh=1.25)


def grid_cells(s, x, y, w, cols, items, start=1, cell_h=64, gap=14, size=S_SMALL + 1):
    cw = (w - (cols - 1) * gap) / cols
    for i, t in enumerate(items):
        cx = x + (i % cols) * (cw + gap)
        cy = y + (i // cols) * (cell_h + gap)
        rect(s, cx, cy, cw, cell_h, fill=CARD, line='F5F5F5', line_alpha=A_STROKE)
        text(s, cx + 18, cy, 50, cell_h, f'{start + i:02d}', size=S_SMALL, color=ACC, bold=True, anchor='m', lh=1.2)
        text(s, cx + 62, cy, cw - 70, cell_h, t, size=size, anchor='m', lh=1.25)
    rows = (len(items) + cols - 1) // cols
    return y + rows * (cell_h + gap)


def chain(s, x, y, w, items, h=64, gap=40, hot=None, size=S_SMALL + 1):
    n = len(items)
    cw = (w - (n - 1) * gap) / n
    for i, t in enumerate(items):
        bx = x + i * (cw + gap)
        if hot is not None and i == hot:
            rect(s, bx, y, cw, h, fill=CARD, line=ACC, line_alpha=0.8, line_w=2)
        else:
            rect(s, bx, y, cw, h, fill=CARD, line='F5F5F5', line_alpha=A_STROKE)
        text(s, bx + 6, y, cw - 12, h, t, size=size, bold=(i == hot), align='c', anchor='m', lh=1.2)
        if i < n - 1:
            line(s, bx + cw + 6, y + h / 2, bx + cw + gap - 6, y + h / 2, color=TXT, alpha=0.45, w=2, arrow=True)
    return cw


def numbered(s, x, y, w, num, head, body, num_size=40, head_size=S_CARD, body_size=S_SMALL + 2):
    text(s, x, y - 4, 80, 56, num, size=num_size, color=ACC, bold=True, lh=1.1)
    text(s, x + 84, y, w - 84, 44, head, size=head_size, bold=True, lh=1.3)
    text(s, x + 84, y + 48, w - 84, 70, body, size=body_size, alpha=A_SUB, lh=1.5)


def gif(s, path, x, y, w, h):
    return s.shapes.add_picture(path, E(x), E(y), E(w), E(h))


# ---------------------------------------------------------------- 封面与 01 制作与挑战
def p_cover(d, I):
    s = d.slide(transition=True)
    image(s, I['cover'], 0, 0, 1920, 1080)
    source_tag(s, 0, 0, 1920, 1080, 'UE 实机', pos='br')
    page_footer(s, d.footer)
    text(s, L, 176, 1100, 36, 'VFX 组内分享 · 2026.10.30', size=S_LABEL, color=ACC, bold=True, spc=4, lh=1.3)
    text(s, L, 226, 1300, 140, '烟花秀 AI 全流程', size=112, bold=True, lh=1.15)
    text(s, L, 386, 1100, 56, '烟花烘焙器 · 导入器 · 烟花编排工作台', size=36, alpha=0.86, lh=1.3)
    end_bar(s, L, 476, 72)
    text(s, L, 512, 600, 40, '分享人：____', size=26, alpha=A_SUB, lh=1.4)
    rect(s, L, 734, 320, 1, fill=TXT, fill_alpha=0.14)
    items = [('01', '制作与挑战'), ('02', '解决思路'), ('03', '实践成果'), ('04', '分享与方法')]
    for i, (num, name) in enumerate(items):
        y = 754 + i * 46
        text(s, L, y, 44, 40, num, size=26, color=ACC, bold=True, lh=1.3)
        text(s, L + 52, y, 300, 40, name, size=26, alpha=A_SUB, lh=1.3)
    return s


def p_scale(d, I):
    s = d.slide('01 · 制作与挑战 · 规模', '制作规模：开花 26 种、尾缀 6 档、时长约 220 秒')
    image(s, I['p02'], L, 214, W_CONTENT, 420, tag='UE 实机 · 今年节目')
    cols = [('开花种类（含扇形）', '3', '26', '种'), ('升空尾缀', '1', '6', '档'), ('节目时长', '约 70', '约 220', '秒'),
            ('输出平台', '', '2', '套 · PC 与手游')]
    cw = (W_CONTENT - 3 * 40) / 4
    for i, (head, a, b, unit) in enumerate(cols):
        x = L + i * (cw + 40)
        rect(s, x, 670, cw, 1, fill=TXT, fill_alpha=0.14)
        text(s, x, 690, cw, 36, head, size=S_SMALL, alpha=A_SUB, bold=True, lh=1.3)
        runs = []
        if a:
            runs += [{'t': a, 'size': 44, 'alpha': 0.45, 'bold': True}, {'t': ' → ', 'size': 32, 'alpha': 0.45}]
        runs += [{'t': b, 'size': 72 if i == 0 else 56, 'bold': True, 'color': ACC if i == 0 else TXT},
                 {'t': ' ' + unit, 'size': S_SMALL, 'alpha': A_SUB}]
        text(s, x, 736, cw, 100, [runs], lh=1.1)
    return s


EXPORT_ITEMS = ['取景与爆点', '帧数分配', '格子排布', '多帧打包', 'Ramp 与 Cutout', 'PC 与手游两套']
IMPORT_ITEMS = ['NeverStream 关闭', 'DistantVFX 贴图组', 'PC 主序列 NoMip', '手游主序列带 Mip', '手游最大 1024',
                '手游压缩 ASTC', 'Ramp Clamp、NoMip', '固定包围盒', '面片朝向', 'UV 翻转方式',
                'EmissiveDissolve 0.98', 'LOD 方式']


def p_delivery_problem(d, I):
    s = d.slide('01 · 制作与挑战 · 资源交付', '资源交付：出图规格与引擎设置需逐项重复')
    # 交付流程：导出 5 步 + 导入 4 步
    steps = ['渲染出图', '取景裁切', '排格打包', 'Ramp / Cutout', '双平台导出', '合入工程', 'UE 创建', '逐项设置', '检查']
    gap = 18
    cw = (W_CONTENT - 8 * gap) / 9
    text(s, L, 214, 900, 34, '导出', size=S_SMALL, color=ACC, bold=True, spc=4, lh=1.3)
    text(s, L + 5 * (cw + gap), 214, 600, 34, '导入', size=S_SMALL, color=ACC, bold=True, spc=4, lh=1.3)
    rect(s, L, 250, 5 * cw + 4 * gap, 2, fill=ACC, fill_alpha=0.6)
    rect(s, L + 5 * (cw + gap), 250, 4 * cw + 3 * gap, 2, fill=ACC, fill_alpha=0.6)
    for i, t in enumerate(steps):
        bx = L + i * (cw + gap)
        hot = t == '逐项设置'
        rect(s, bx, 266, cw, 64, fill=ACC if hot else CARD, fill_alpha=A_GREEN_BG if hot else None,
             line=ACC if hot else 'F5F5F5', line_alpha=0.9 if hot else A_STROKE, line_w=2 if hot else 1)
        text(s, bx + 4, 266, cw - 8, 64, t, size=S_SMALL, align='c', anchor='m', lh=1.2, bold=hot,
             color=ACC if hot else TXT)
        if i < 8:
            line(s, bx + cw + 3, 298, bx + cw + gap - 3, 298, color=TXT, alpha=0.45, w=2, arrow=True)
    lw = 600
    text(s, L, 392, lw, 44, '导出 · 每种烟花需确定的规格', size=S_CARD - 2, bold=True, lh=1.3)
    grid_cells(s, L, 452, lw, 2, EXPORT_ITEMS, cell_h=76)
    rx = L + lw + 48
    rw = R - rx
    text(s, rx, 392, rw, 44, '导入 · 每个资源需完成的设置', size=S_CARD - 2, bold=True, lh=1.3)
    grid_cells(s, rx, 452, rw, 3, IMPORT_ITEMS, cell_h=76, size=S_SMALL - 1)
    icw = (rw - 2 * 14) / 3
    for i in (0, 2, 10):   # 漏设后果最重的三项，对应底部一行
        hx = rx + (i % 3) * (icw + 14)
        hy = 452 + (i // 3) * (76 + 14)
        rect(s, hx, hy, icw, 76, fill=ACC, fill_alpha=A_GREEN_BG, line=ACC, line_alpha=0.9, line_w=2)
    rect(s, L, 836, W_CONTENT, 1, fill=TXT, fill_alpha=0.12)
    text(s, L, 858, W_CONTENT, 44, '原有方式：以上步骤逐个资源手工完成，效果一调整就需重做', size=S_BODY - 2, lh=1.4)
    text(s, L, 906, W_CONTENT, 40, [[{'t': '漏设一项即出现问题：', 'alpha': A_SUB},
                                      {'t': '贴图常驻内存（01）', 'color': ACC, 'bold': True}, {'t': '、', 'alpha': A_SUB},
                                      {'t': '星头方块（03）', 'color': ACC, 'bold': True}, {'t': '、', 'alpha': A_SUB},
                                      {'t': '最亮处黑块（11）', 'color': ACC, 'bold': True}]],
         size=S_SMALL + 1, lh=1.4)
    return s


def p_choreo_problem(d, I):
    s = d.slide('01 · 制作与挑战 · 编排', '编排：定序器手工排轨难以支撑今年规模')
    image(s, I['p04'], L, 214, COL60_W, 742, tag='UE 编辑器 · 去年的定序器')
    x = COL40_X
    label_text(s, x, 214, COL40_W, '去年')
    text(s, x, 256, COL40_W, 60, [[{'t': '2726', 'size': 64, 'bold': True},
                                    {'t': '  条轨道 · 12 条子序列', 'size': S_BODY - 2, 'alpha': A_SUB}]], lh=1.1)
    rows = ['调整节奏需逐条对齐轨道', '无法直观预览整体构图', '各画质档需分别维护', '内存占用偏高（性能组反馈）']
    y = 346
    for t_ in rows:
        green_sq(s, x, y + 13, 10)
        text(s, x + 26, y, COL40_W - 26, 40, t_, size=S_SMALL + 2, alpha=A_SUB, lh=1.4)
        y += 46
    rect(s, x, 556, COL40_W, 1, fill=TXT, fill_alpha=0.12)
    label_text(s, x, 584, COL40_W, '今年')
    rows2 = [('约 220', '秒节目时长'), ('24', '个发射点位'), ('2 × 3', 'PC 与手游各 3 档画质')]
    y = 630
    for n, c in rows2:
        text(s, x, y, COL40_W, 70, [[{'t': n, 'size': 52, 'bold': True},
                                      {'t': '  ' + c, 'size': S_BODY - 2, 'alpha': A_SUB}]], lh=1.1)
        y += 76
    text(s, x, 870, COL40_W, 80, ['节奏需随音乐反复调整，', '手工排轨的修改成本过高'], size=S_SMALL, alpha=A_NOTE, lh=1.5)
    return s


# ---------------------------------------------------------------- 02 解决思路
def p_baker(d, I):
    s = d.slide('02 · 解决思路 · 制作规模', '烟花烘焙器：从模板快速生成效果')
    card(s, L, 214, 518, 742)
    label_text(s, L + 40, 246, 440, '此前尝试')
    text(s, L + 40, 290, 440, 50, 'AI 脚本驱动 Blender', size=S_CARD + 2, bold=True, lh=1.35)
    for i, t_ in enumerate(['每轮等待离线渲染', '预览与输出不一致']):
        rect(s, L + 40, 366 + i * 52 + 13, 14, 14, fill=TXT, fill_alpha=0.35)
        text(s, L + 70, 366 + i * 52, 420, 44, t_, size=S_BODY - 2, alpha=A_SUB, lh=1.4)
    rect(s, L + 40, 490, 438, 1, fill=TXT, fill_alpha=0.12)
    label_text(s, L + 40, 516, 440, '烘焙器')
    pros = [('可视化', '实时调参；导出后在烘焙器内回放'), ('快速输出', '即改即看，直接输出引擎格式'), ('项目定制', '按本项目舞台、视距与规范')]
    y = 562
    for h, b in pros:
        text(s, L + 40, y, 440, 40, h, size=S_BODY, bold=True, lh=1.3)
        text(s, L + 40, y + 40, 440, 36, b, size=S_SMALL, alpha=A_SUB, lh=1.4)
        y += 120
    rx = 662
    image(s, I['p05a'], rx, 214, 571, 330)
    image(s, I['p05b'], rx + 591, 214, 571, 330)
    caption(s, rx, 552, 571, '单层花型模板 · 27 种', size=S_SMALL - 2)
    caption(s, rx + 591, 552, 571, '多层模板 · 30 种', size=S_SMALL - 2)
    image(s, I['p05c'], rx, 600, 571, 330)
    caption(s, rx, 938, 571, '效果库 · 基于模板调出的效果', size=S_SMALL - 2)
    bx = rx + 591
    label_text(s, bx, 600, 571, '制作流程')
    flow = ['选择模板', '调整参数', '保存为效果', '派生与复用']
    y = 650
    for i, t_ in enumerate(flow):
        rect(s, bx, y, 571, 56, fill=CARD, line='F5F5F5', line_alpha=A_STROKE)
        text(s, bx + 20, y, 60, 56, f'0{i + 1}', size=S_SMALL, color=ACC, bold=True, anchor='m', lh=1.2)
        text(s, bx + 80, y, 480, 56, t_, size=S_BODY - 2, anchor='m', lh=1.2)
        if i < 3:
            line(s, bx + 285, y + 58, bx + 285, y + 70, color=TXT, alpha=0.45, w=2)
        y += 72
    return s


def p_export(d, I):
    s = d.slide('02 · 解决思路 · 资源交付', '导出规范：取景、打包与双平台输出自动完成')
    pw, gap = 360, 24
    panels = [('p06fixed', '固定框（默认）', '约 2 成'), ('p06zoom', '随开花放大', '约 2 成'), ('p06anchor', '锚在爆点', '约 4 成')]
    for i, (k, h, r) in enumerate(panels):
        x = L + i * (pw + gap)
        image(s, I[k], x, 214, pw, 274)
        text(s, x, 498, pw, 40, [[{'t': h, 'bold': True}, {'t': '  · ' + r, 'color': ACC if i == 2 else TXT, 'bold': True}]],
             size=S_BODY - 2, lh=1.3)
    caption(s, L, 548, 1128, '绿点为爆点；比例为扇形开满时内容占面片的比例')
    rect(s, 1248, 214, 576, 357, fill=BG, line='F5F5F5', line_alpha=A_STROKE)
    gif(s, I['p06gif'], 1248, 238, 576, 309)
    source_tag(s, 1248, 238, 576, 309, '工具录屏', pos='tr')
    caption(s, 1248, 580, 576, '回放复核：按导出的 64 帧贴图逐格回放，高亮当前格')
    steps = [('取景', '三种方式\v按花型选择'), ('烘焙后收紧', '按每帧内容\v二次收紧'), ('排格打包', '按形状排格\v每张 64 帧'),
             ('Ramp 与 Cutout', '灰度查色\v按收益生成 Cutout'), ('双平台导出', 'PC 与手游\v同时输出'),
             ('回放复核', '在烘焙器内\v按导出贴图回放')]
    cw = (W_CONTENT - 5 * 16) / 6
    for i, (h, b) in enumerate(steps):
        x = L + i * (cw + 16)
        card(s, x, 650, cw, 210, key=(i == 0))
        text(s, x + 24, 670, 60, 40, f'0{i + 1}', size=26, color=ACC, bold=True, lh=1.2)
        text(s, x + 24, 716, cw - 40, 40, h, size=S_BODY - 2, bold=True, lh=1.3)
        text(s, x + 24, 762, cw - 40, 90, b, size=S_SMALL, alpha=A_SUB, lh=1.5)
    text(s, L, 890, W_CONTENT, 40, '原本手工完成的取景、排格与合通道，现在每次导出自动执行', size=S_BODY - 2, color=ACC, lh=1.4)
    return s


def p_import(d, I):
    s = d.slide('02 · 解决思路 · 资源交付', '导入规范：检查、创建、设置与读回由工具完成')
    image(s, I['p07'], L, 214, COL60_W, 567, tag='工具界面 · 烟花素材导入')
    x = COL40_X
    steps = [('01', '读取素材包', '烘焙器导出后直接进入导入清单'), ('02', '检查规范项', '命名、尺寸、平台，不合格先拦截'),
             ('03', '创建与设置', '按平台创建贴图、材质实例、发射器'), ('04', '确认写入，读回核对', '检查阶段不修改工程')]
    y = 214
    for n, h, b in steps:
        numbered(s, x, y, COL40_W, n, h, b, num_size=36, head_size=S_BODY, body_size=S_SMALL + 1)
        y += 142
    text(s, L, 806, W_CONTENT, 36, '内置于工具的引擎规范', size=S_SMALL, color=ACC, bold=True, spc=4, lh=1.3)
    chips = ['NeverStream 关闭', '贴图组 DistantVFX', 'PC 主序列 NoMip', '手游 Mip ≤ 1024', 'Ramp Clamp',
             'EmissiveDissolve 0.98', '固定包围盒', '面片朝向', 'UV 翻转', 'LOD 方式']
    cw = (W_CONTENT - 4 * 14) / 5
    for i, t_ in enumerate(chips):
        cx = L + (i % 5) * (cw + 14)
        cy = 850 + (i // 5) * 58
        rect(s, cx, cy, cw, 46, fill=CARD, line='F5F5F5', line_alpha=A_STROKE)
        text(s, cx, cy, cw, 46, t_, size=S_SMALL - 2, alpha=A_SUB, align='c', anchor='m', lh=1.2)
    return s


WB = dict(surface='111D21', container='1B2A2F', stage='101A1B', grid='263D42', grid_txt='8FA7AA', dam='1E3036',
          dam_line='829297', point='B6C7CB', front='A4D2E8', stem='526367', text='E4EDEF', muted='B4C5CB',
          divider='2B4149', primary='00D49B', sel='83DFC0', s='829297', m='9EB6BC', l='B6C7CB')


def draw_stage(s, X0, Y0, W, H):
    """按编排宪章设计值重绘的极限帧示意（同一米尺）：S/M/L/主角四档同时展开时的重叠关系。"""
    rect(s, X0, Y0, W, H, fill=WB['stage'])
    unit = min((W - 120) / 1000, (H - 70) / 720)
    ox = X0 + 70 + 100 * unit
    oy = Y0 + H - 34
    X = lambda m: ox + m * unit
    Z = lambda m: oy - m * unit
    for z in (0, 150, 300, 450, 600):
        line(s, X0 + 56, Z(z), X0 + W - 16, Z(z), color=WB['grid'], w=1)
        text(s, X0 + 8, Z(z) - 14, 48, 24, f'{z} m', size=14, color=WB['grid_txt'], lh=1.0)
    rect(s, X(0), Z(150), 800 * unit, 150 * unit, fill=WB['dam'], line=WB['dam_line'], line_w=1.5)
    for xm in (150, 300, 500, 650):
        line(s, X(xm), Z(150), X(xm), Z(0), color=WB['dam_line'], w=1)
    rect(s, X(300), Z(50), 200 * unit, 50 * unit, line=WB['dam_line'], line_w=1.2)
    text(s, X(800) + 8, Z(150) + 2, 120, 24, '坝顶 150 m', size=14, color=WB['grid_txt'], lh=1.0)
    text(s, X(500) + 6, Z(50) - 24, 120, 24, '前台 50 m', size=14, color=WB['grid_txt'], lh=1.0)
    bursts = ([(x, 90, 300, WB['s']) for x in range(50, 800, 100)] +
              [(x, 150, 360, WB['m']) for x in (100, 300, 500, 700)] +
              [(x, 230, 480, WB['l']) for x in (0, 200, 600, 800)] + [(400, 280, 550, WB['sel'])])
    for xm, dia, zc, col in bursts:
        line(s, X(xm), Z(150), X(xm), Z(zc), color=WB['stem'], w=1)
    for xm, dia, zc, col in bursts:
        r = dia / 2 * unit
        hero = col == WB['sel']
        rect(s, X(xm) - r, Z(zc) - r, 2 * r, 2 * r, fill=col, fill_alpha=0.12 if hero else 0.05, line=col,
             line_w=2.4 if hero else 1.4, shape=MSO_SHAPE.OVAL)
    for xm in (150, 350, 450, 650):
        for a in (-50, -25, 0, 25, 50):
            import math
            rr = 46 * unit
            line(s, X(xm), Z(150), X(xm) + rr * math.sin(math.radians(a)), Z(150) - rr * math.cos(math.radians(a)),
                 color=WB['front'], w=1)
    for k in range(9):
        rect(s, X(k * 100) - 5, Z(150) - 10, 10, 10, fill=WB['point'], shape=MSO_SHAPE.ISOSCELES_TRIANGLE)
    for k in range(8):
        rect(s, X(50 + k * 100) - 3, Z(150) - 6, 6, 6, fill=WB['point'], fill_alpha=0.6, shape=MSO_SHAPE.OVAL)
    for k in range(7):
        rect(s, X(310 + k * 30) - 3, Z(50) - 6, 6, 6, fill=WB['front'], shape=MSO_SHAPE.OVAL)
    for name, zc, col in (('S +150', 300, WB['s']), ('M +210', 360, WB['m']), ('L +330', 480, WB['l']),
                          ('主角 +400', 550, WB['sel'])):
        text(s, X0 + W - 130, Z(zc) - 12, 120, 24, name, size=14, color=col, align='r', lh=1.0)
    line(s, X0 + 20, Y0 + H - 14, X0 + 20 + 100 * unit, Y0 + H - 14, color=WB['grid_txt'], w=1.5)
    text(s, X0 + 26 + 100 * unit, Y0 + H - 26, 80, 24, '100 m', size=14, color=WB['grid_txt'], lh=1.0)
    text(s, X0 + W - 380, Y0 + 10, 370, 24, '大坝宽 800 m', size=14, color=WB['grid_txt'], align='r',
         lh=1.0)


def p_choreo_rules(d, I):
    s = d.slide('02 · 解决思路 · 编排', '编排推演：由舞台、花径与点距推导分档和极限帧')
    rect(s, L, 214, W_CONTENT, 640, fill=WB['surface'], line=WB['divider'], line_w=1)
    draw_stage(s, L + 16, 230, 1010, 608)
    x = L + 1060
    w = R - x - 24
    text(s, x, 236, w, 30, '分档', size=S_SMALL, color=WB['sel'], bold=True, spc=4, lh=1.3)
    heads = ['档', '花径', '开花高度', '尾缀']
    cx = [x, x + 110, x + 260, x + 450]
    for j, hh in enumerate(heads):
        text(s, cx[j], 276, 200, 28, hh, size=S_SMALL - 4, color=WB['muted'], bold=True, lh=1.2)
    rows = [('S', '90 m', '+150 m', 'S'), ('M', '150 m', '+210 m', 'M'), ('L', '230 m', '+330 m', 'L'),
            ('主角', '280 m', '+400 m', 'Hero')]
    y = 308
    for r in rows:
        rect(s, x, y, w, 1, fill=WB['divider'])
        for j, v in enumerate(r):
            text(s, cx[j], y + 9, 200, 36, v, size=S_BODY - 4, bold=(j == 0), color=WB['sel'] if j == 0 else WB['text'],
                 alpha=A_BODY if j == 0 else 0.85, lh=1.3)
        y += 52
    rect(s, x, y, w, 1, fill=WB['divider'])
    text(s, x, 548, w, 30, '花径与点距之比', size=S_SMALL, color=WB['sel'], bold=True, spc=4, lh=1.3)
    ratios = [(1.5, '可分辨单花'), (2.3, '形成花墙'), (3.0, '容易糊成一片')]
    cw = w / 3
    for i, (rt, t_) in enumerate(ratios):
        bx = x + i * cw
        r0 = 30 * (rt / 1.5) ** 0.6
        cxm = bx + cw / 2
        off = 2 * r0 / rt
        for k in (-1, 1):
            rect(s, cxm + k * off / 2 - r0, 640 - r0, 2 * r0, 2 * r0, line=WB['l'], line_alpha=0.8, line_w=1.6,
                 shape=MSO_SHAPE.OVAL)
        text(s, bx, 700, cw, 36, f'{rt}', size=S_CARD - 2, color=WB['sel'] if i == 0 else WB['text'], bold=True,
             align='c', lh=1.2)
        text(s, bx, 740, cw, 30, t_, size=S_SMALL - 4, color=WB['muted'], align='c', lh=1.3)
    items = ['舞台与点位', '分档与高度', '极限帧检查', '编排宪章', '每版自动检查']
    n = len(items)
    gap = 40
    cwid = (W_CONTENT - (n - 1) * gap) / n
    for i, t_ in enumerate(items):
        bx = L + i * (cwid + gap)
        hot = i == 3
        rect(s, bx, 884, cwid, 60, fill=WB['container'], line=WB['primary'] if hot else WB['divider'], line_w=2 if hot else 1)
        text(s, bx, 884, cwid, 60, t_, size=S_SMALL + 1, color=WB['sel'] if hot else WB['text'], bold=hot, align='c',
             anchor='m', lh=1.2)
        if i < n - 1:
            line(s, bx + cwid + 6, 914, bx + cwid + gap - 6, 914, color=WB['dam_line'], w=2, arrow=True)
    return s


def p_workbench(d, I):
    s = d.slide('02 · 解决思路 · 编排', '烟花编排工作台：模板、片段到导演表')
    steps = [('01', '基础模板', '资源表中的效果，统一比例参照'), ('02', '花型模板', '组合尺寸、高度与尾缀'),
             ('03', '编排片段', '模板放上时间轴，按音乐分段调整'), ('04', '导演表', '一键生成三张表，导入 UE')]
    y = 214
    for n, h, b in steps:
        numbered(s, L, y, 520, n, h, b, num_size=36, head_size=S_CARD, body_size=S_SMALL + 1)
        if n != '04':
            line(s, L + 18, y + 64, L + 18, y + 150, color=TXT, alpha=0.3, w=2)
        y += 168
    text(s, L, 896, 520, 60, '可视化编排，程序化检查与输出', size=S_BODY - 2, color=ACC, lh=1.4)
    rx, ry, rw, rh = 662, 214, 1162, 654
    image(s, I['p09full'], rx, ry, rw, rh)
    k = rw / 3840
    marks = [('01 · 02', '模板库', (0, 236, 545, 1185), 'in'), ('03', '编排片段', (340, 1610, 3840, 2005), 'in'),
             ('04', '导演表', (3600, 22, 3840, 102), 'below')]
    for num, lab, (x0, y0, x1, y1), where in marks:
        bx, by, bw, bh = rx + x0 * k, ry + y0 * k, (x1 - x0) * k, (y1 - y0) * k
        rect(s, bx, by, bw, bh, line=ACC, line_alpha=0.8, line_w=1.5)
        tw = sum(20 if ord(ch) > 0x2E80 else (6 if ch == ' ' else 11.5) for ch in num + '  ' + lab) + 32
        th = 36
        tx, ty = (bx + 8, by + 8) if where == 'in' else (bx + bw - tw, by + bh + 8)
        rect(s, tx, ty, tw, th, fill=BG, fill_alpha=0.85)
        text(s, tx, ty, tw, th, [[{'t': num, 'color': ACC, 'bold': True}, {'t': '  ' + lab, 'alpha': 0.9}]],
             size=S_SMALL - 4, align='c', anchor='m', lh=1.1)
    return s


def p_summary(d, I):
    s = d.slide('02 · 解决思路 · 汇总', '解决思路：三个问题，三个工具，一条交付链')
    nodes = [(I['p10baker'], '问题一 · 制作规模', '烟花烘焙器', ['模板生成效果，', '按规范导出两套']),
             (I['p10importer'], '问题二 · 资源交付', '导入器', ['检查、创建、设置，', '读回核对']),
             (I['p10workbench'], '问题三 · 编排', '烟花编排工作台', ['推演规则，', '生成导演表']),
             (I['p10ue'], '播放', 'UE 导演蓝图', ['按三张表', '播放'])]
    tags = ['工具界面', '工具界面', '工具界面', 'UE 实机']
    links = ['素材包', 'UE 资源', '导演表']
    cw, gap = 360, 96
    for i, (img, step, name, desc) in enumerate(nodes):
        x = L + i * (cw + gap)
        card(s, x, 214, cw, 476, key=(i < 3))
        image(s, img, x + 1, 215, cw - 2, 202, tag=tags[i])
        text(s, x + 32, 444, cw - 50, 36, step, size=S_LABEL - 2, color=ACC, bold=True, spc=2, lh=1.3)
        text(s, x + 32, 486, cw - 40, 50, name, size=32, bold=True, lh=1.3)
        text(s, x + 32, 548, cw - 44, 120, desc, size=S_SMALL, alpha=A_SUB, lh=1.6)
        if i < 3:
            x1 = x + cw + 10
            line(s, x1, 316, x1 + gap - 20, 316, alpha=0.8, w=2, dash=True, arrow=True)
            text(s, x + cw, 328, gap, 34, links[i], size=S_SMALL, alpha=A_NOTE, align='c', lh=1.2)
    card(s, L, 730, COL60_W, 226, key=True)
    label_text(s, L + 40, 756, 600, '分工')
    text(s, L + 40, 800, 920, 130, ['目标、审美与引擎约束由我确定；工具由 AI 开发，关键结果在 UE 验收', '一人对接 AI；仓库约 2200 次提交'],
         size=S_BODY - 2, lh=1.6)
    card(s, COL40_X, 730, COL40_W, 226)
    label_text(s, COL40_X + 40, 756, 600, '跨组协作')
    text(s, COL40_X + 40, 800, 600, 130, ['导演蓝图：与程序共同设计', '贴图规范：与性能组共同确定'], size=S_BODY - 2,
         alpha=A_SUB, lh=1.6)
    return s


# ---------------------------------------------------------------- 03 实践成果
def p_resources(d, I):
    s = d.slide('03 · 实践成果 · 制作规模', '资源成果：球花、扇形、尾缀与窜天猴全部入表')
    tiles = I['p11']
    tw, th, gx, gy = 320, 320, 24, 52
    for i, (img, name) in enumerate(tiles):
        x = L + (i % 3) * (tw + gx)
        y = 214 + (i // 3) * (th + gy)
        if img.endswith('.gif'):
            rect(s, x, y, tw, th, fill=BG)
            gif(s, img, x, y, tw, th)
            source_tag(s, x, y, tw, th, 'UE 实录', pos='bl')
        else:
            image(s, img, x, y, tw, th)
        text(s, x, y + th + 6, tw, 34, name, size=S_SMALL, alpha=A_SUB, align='c', lh=1.3)
    x = COL40_X
    blocks = [('PC', [('26', '种开花（球花与扇形）'), ('6', '档升空尾缀'), ('1', '套窜天猴')]),
              ('手游', [('12', '种开花'), ('6', '档升空尾缀'), ('1', '套窜天猴')])]
    y = 214
    for head, rows in blocks:
        label_text(s, x, y, COL40_W, head)
        y += 46
        for n, t_ in rows:
            text(s, x, y, COL40_W, 56, [[{'t': n, 'size': 44, 'bold': True, 'color': ACC if n == '26' else TXT},
                                          {'t': '  ' + t_, 'size': S_BODY - 2, 'alpha': A_SUB}]], lh=1.15)
            y += 58
        y += 26
    rect(s, x, y, COL40_W, 1, fill=TXT, fill_alpha=0.12)
    label_text(s, x, y + 24, COL40_W, '引用贴图')
    text(s, x, y + 68, COL40_W, 50, 'PC 专用 133 · 手游专用 33 · 共用 46', size=S_BODY, bold=True, lh=1.3)
    text(s, x, y + 116, COL40_W, 70, ['去重共 212 张；19 种开花保留配方，', '调参后可重新导出'], size=S_SMALL - 2, alpha=A_NOTE, lh=1.5)
    return s


def p_import_result(d, I):
    s = d.slide('03 · 实践成果 · 资源交付', '接入成果：批量修正读回一致，叠加开销可查')
    x = L
    text(s, x, 214, 640, 36, '贴图规范确定后', size=S_LABEL, color=ACC, bold=True, spc=2, lh=1.3)
    text(s, x, 262, 640, 140, [[{'t': '149', 'size': 120, 'color': ACC, 'bold': True},
                                {'t': '/149', 'size': 76, 'color': ACC, 'bold': True}]], lh=1.0)
    text(s, x, 400, 640, 40, '张贴图批量重设，读回一致', size=S_SMALL + 2, alpha=A_SUB, lh=1.5)
    rect(s, x, 480, 640, 1, fill=TXT, fill_alpha=0.12)
    text(s, x, 508, 640, 36, '更早一轮', size=S_LABEL, color=ACC, bold=True, spc=2, lh=1.3)
    text(s, x, 556, 640, 90, [[{'t': '115', 'size': 72, 'bold': True}, {'t': ' 个包', 'size': 30, 'bold': True}]], lh=1.0)
    text(s, x, 648, 640, 80, ['粒子系统 48 个、材质实例 67 个，', '读回无错误'], size=S_SMALL + 2, alpha=A_SUB, lh=1.6)
    text(s, x, 840, 640, 90, ['规则已内置于导入器，', '新资源导入时自动执行'], size=S_BODY - 2, color=ACC, lh=1.5)
    rx, rw = 816, 1008
    image(s, I['p12od'], rx, 214, rw, 480, tag='UE 实机 · Overdraw 视图')
    caption(s, rx, 702, rw, '颜色越暖，叠加层数越多')
    card(s, rx, 760, rw, 196)
    label_text(s, rx + 40, 782, 700, '开发机实测 · PC 高配')
    text(s, rx + 40, 826, rw - 80, 70, [[{'t': '0.08 → 0.50', 'size': 52, 'bold': True, 'color': ACC},
                                         {'t': '  ms · 烟花半透明耗时（7 个时刻）', 'size': S_SMALL, 'alpha': A_SUB}]], lh=1.1)
    return s


PEAK = os.path.join(SRC, 'b11r1_peak185.json')
# 档：颜色、描边透明度、线宽（主角 = 金垂柳）
PEAK_STYLE = {'S': (TXT, 0.5, 1.3), 'M': (TXT, 0.8, 1.4), 'L': (ACC, 0.85, 1.6), 'H': (ACC, 1.0, 2.6)}


def draw_peak(s, X0, Y0, W, H, data, head, sub):
    """同一时刻的舞台：球花按满径画（同点叠放的两发合成一圈，底色更亮），扇形、升空尾缀、小平台小花按此刻状态画。"""
    rect(s, X0, Y0, W, H, fill=CARD, line='F5F5F5', line_alpha=A_STROKE)
    padl, padr, padt, padb = 70, 30, 66, 30
    zmax, xhalf = 725, 560
    sc = min((W - padl - padr) / (2 * xhalf), (H - padt - padb) / zmax)
    ox = X0 + padl + (W - padl - padr) / 2
    oy = Y0 + H - padb
    X = lambda m: ox + m * sc
    Z = lambda m: oy - m * sc
    for z in (300, 450, 600):
        line(s, X0 + 60, Z(z), X0 + W - 20, Z(z), color=TXT, alpha=0.07, w=1)
        text(s, X0 + 14, Z(z) - 12, 60, 24, f'{z} m', size=14, alpha=A_FOOT, lh=1.0)
    rect(s, X(-400), Z(150), 800 * sc, 150 * sc, fill=TXT, fill_alpha=0.035, line='F5F5F5', line_alpha=0.22)
    for xm in (-250, -100, 100, 250):
        line(s, X(xm), Z(150), X(xm), Z(0), color=TXT, alpha=0.12, w=1)
    rect(s, X(-100), Z(50), 200 * sc, 50 * sc, fill=TXT, fill_alpha=0.05, line='F5F5F5', line_alpha=0.18)
    text(s, X0 + 14, Z(150) - 12, 60, 24, '150 m', size=14, alpha=A_FOOT, lh=1.0)
    for xm in (-375, -288, -197, -100, 0, 100, 197, 288, 375):
        rect(s, X(xm) - 5, Z(150) - 9, 10, 9, fill=TXT, fill_alpha=0.85, shape=MSO_SHAPE.ISOSCELES_TRIANGLE)
    for xm in (-331, -245, -148, -50, 50, 148, 245, 331):
        rect(s, X(xm) - 3, Z(150) - 6, 6, 6, line='F5F5F5', line_alpha=0.6, shape=MSO_SHAPE.OVAL)
    for xm in (-69, -46, -23, 0, 23, 46, 69):
        rect(s, X(xm) - 3, Z(50) - 6, 6, 6, fill=TXT, fill_alpha=0.6, shape=MSO_SHAPE.DIAMOND)
    # 地面：扇形与小平台小花的束
    for g in data['segs']:
        if g['a'] <= 0.02:
            continue
        al = {'fan': 0.45, 'red': 0.8, 'combo': 0.55}[g['k']] * min(1.0, g['a'] / 0.7)
        line(s, X(g['x1']), Z(g['z1']), X(g['x2']), Z(g['z2']), color=TXT, alpha=al, w=1)
    for dt in data['dots']:
        if dt['a'] > 0.05:
            rect(s, X(dt['x']) - 2, Z(dt['z']) - 2, 4, 4, fill=TXT, fill_alpha=0.85 * dt['a'], shape=MSO_SHAPE.OVAL)
    for c in data['cflowers']:
        r = c['d'] / 2 * sc
        rect(s, X(c['x']) - r, Z(c['z']) - r, 2 * r, 2 * r, fill=TXT, fill_alpha=0.05, line='F5F5F5', line_alpha=0.5,
             line_w=1, shape=MSO_SHAPE.OVAL)
    # 升空尾缀
    for tl in data['tails']:
        line(s, X(tl['x']), Z(tl['z1']), X(tl['x']), Z(tl['z2']), color=TXT, alpha=0.6, w=1.6)
        rect(s, X(tl['x']) - 3, Z(tl['z2']) - 3, 6, 6, fill=TXT, shape=MSO_SHAPE.OVAL)
    # 球花：同点同高的叠放合成一圈
    groups = {}
    for b in data['flowers']:
        key = (round(b['x']), round(b['top']))
        g = groups.setdefault(key, {'x': b['x'], 'top': b['top'], 'd': 0, 'n': 0, 'k': 'S'})
        g['n'] += 1
        k_ = 'H' if b['sp'] == 'GKH' else b['sz']
        if b['d'] > g['d']:
            g['d'], g['k'] = b['d'], k_
    for g in sorted(groups.values(), key=lambda g: -g['d']):
        r = g['d'] / 2 * sc
        col, la, lw = PEAK_STYLE[g['k']]
        rect(s, X(g['x']) - r, Z(g['top']) - r, 2 * r, 2 * r, fill=col, fill_alpha=0.06 * g['n'], line=col,
             line_alpha=la, line_w=lw, shape=MSO_SHAPE.OVAL)
    text(s, X0 + 24, Y0 + 16, W - 48, 36, [[{'t': head, 'bold': True}, {'t': '  ' + sub, 'alpha': A_SUB}]],
         size=S_SMALL, lh=1.3)


def p_choreo_result(d, I):
    import json
    s = d.slide('03 · 实践成果 · 编排', '编排成果：同一编排分档输出，最满时刻重叠可查')
    pk = json.load(open(PEAK, encoding='utf-8'))
    label_text(s, L, 214, 900, '同一时刻 3:05 · 各档开到最大')
    lx = R - 712
    for i, (sz, lab) in enumerate((('S', '小 ⌀90 m'), ('M', '中 ⌀150 m'), ('L', '大 ⌀230 m'), ('H', '主角 ⌀340 m'))):
        x = lx + i * 178
        col, la, lw = PEAK_STYLE[sz]
        rect(s, x, 222, 20, 20, line=col, line_alpha=la, line_w=lw, shape=MSO_SHAPE.OVAL)
        text(s, x + 28, 214, 150, 36, lab, size=S_SMALL - 4, alpha=A_SUB, lh=1.3)
    pw, gap, py, ph = 852, 24, 258, 500
    pc, mb = pk['pc'], pk['mobile']
    draw_peak(s, L, py, pw, ph, pc, 'PC 高配', f"球花 {len(pc['flowers'])} 发 · 扇形 14 点 · 升空 {len(pc['tails'])} 发")
    draw_peak(s, L + pw + gap, py, pw, ph, mb, '手游高配', f"球花 {len(mb['flowers'])} 发 · 升空 {len(mb['tails'])} 发")
    # 辅助：播放次数、版本、待改进
    y0, h0 = 784, 172
    cw = 1000
    card(s, L, y0, cw, h0)
    text(s, L + 32, y0 + 22, 240, 80, ['各档一场的', '播放次数'], size=S_SMALL, bold=True, lh=1.35)
    text(s, L + 32, y0 + 100, 240, 40, '同一编排自动分档', size=S_SMALL - 4, alpha=A_SUB, lh=1.3)
    data = [('PC', [('高', 1145, '约 1150'), ('中', 852, '约 850'), ('低', 438, '约 440')]),
            ('手游', [('高', 448, '约 450'), ('中', 349, '约 350'), ('低', 181, '约 180')])]
    base, hmax, vmax = y0 + 112, 72, 1145
    bw, gi, gg = 72, 22, 84
    x = L + 300
    for g, bars in data:
        gx0 = x
        for name, v, lab in bars:
            h = hmax * v / vmax
            hot = g == 'PC' and name == '高'
            rect(s, x, base - h, bw, h, fill=ACC if hot else TXT, fill_alpha=None if hot else 0.32)
            text(s, x - 24, base - h - 28, bw + 48, 26, lab, size=S_SMALL - 6, bold=True, align='c', lh=1.1)
            text(s, x, base + 6, bw, 22, name, size=S_SMALL - 8, alpha=A_SUB, align='c', lh=1.1)
            x += bw + gi
        text(s, gx0, base + 32, x - gi - gx0, 24, g, size=S_SMALL - 6, bold=True, align='c', lh=1.1)
        x += gg - gi
    rect(s, L + 290, base, x - gg + gi - L - 280, 1, fill=TXT, fill_alpha=0.25)
    bx = L + cw + 24
    bw2 = (R - bx - 24) / 2
    card(s, bx, y0, bw2, h0, key=True)
    text(s, bx + 32, y0 + 22, bw2 - 50, 70, [[{'t': '11', 'size': 60, 'color': ACC, 'bold': True},
                                             {'t': ' 个大版本', 'size': S_SMALL, 'bold': True}]], lh=1.05)
    text(s, bx + 32, y0 + 104, bw2 - 50, 40, '每版自动检查', size=S_SMALL - 2, alpha=A_SUB, lh=1.3)
    cx = bx + bw2 + 24
    card(s, cx, y0, bw2, h0)
    label_text(s, cx + 32, y0 + 24, bw2 - 50, '待改进')
    text(s, cx + 32, y0 + 70, bw2 - 50, 80, ['节拍对齐指标', '尚未达到宪章目标'], size=S_SMALL - 2, alpha=A_SUB, lh=1.5)
    return s


def p_sparkler(d, I):
    s = d.slide('03 · 实践成果 · 技术案例', '仙女棒：13 类火星合成一张序列')
    card(s, L, 214, 518, 742, key=True)
    text(s, 140, 244, 450, 130, '13→1', size=112, color=ACC, bold=True, lh=1.0)
    text(s, 140, 372, 430, 80, ['每平台 1 张 64 帧主序列', '+ 1 个发射器'], size=S_SMALL + 2, alpha=A_SUB, lh=1.5)
    rect(s, 140, 470, 432, 243, fill=BG)
    gif(s, I['p14ue'], 140, 470, 432, 243)
    source_tag(s, 140, 470, 432, 243, 'UE 实录', pos='bl')
    text(s, 140, 740, 420, 36, '以往', size=S_SMALL + 1, color=ACC, bold=True, lh=1.3)
    text(s, 140, 776, 430, 36, '窜天猴拖尾用 10 个发射器拼合', size=S_SMALL, alpha=A_SUB, lh=1.4)
    text(s, 140, 830, 420, 36, '本次', size=S_SMALL + 1, color=ACC, bold=True, lh=1.3)
    text(s, 140, 866, 430, 36, '通用母子分叉，烘焙时合成', size=S_SMALL, alpha=A_SUB, lh=1.4)
    rx, rw = 662, 1162
    text(s, rx, 214, rw, 36, '13 类火星（源自 Blender 工程）', size=S_SMALL, alpha=A_SUB, bold=True, lh=1.3)
    image(s, I['p14a'], rx, 256, rw, 188)
    image(s, I['p14b'], rx, 452, rw, 188)
    cell = rw / 7
    gx = rx + 6 * cell
    rect(s, gx + 4, 456, cell - 8, 180, fill=BG, line=ACC, line_alpha=0.8, line_w=2)
    gif(s, I['p14gif'], gx + 14, 462, cell - 28, cell - 28)
    text(s, gx + 4, 604, cell - 8, 30, '13 合 1 · 回放', size=S_SMALL - 4, color=ACC, bold=True, align='c', lh=1.2)
    text(s, rx, 662, rw, 36, '合成后的 64 帧主序列（按帧展开）', size=S_SMALL, alpha=A_SUB, bold=True, lh=1.3)
    image(s, I['p14c'], rx, 704, rw, 252)
    return s


def p_trail(d, I):
    s = d.slide('03 · 实践成果 · 技术案例', '升空尾缀：按屏幕位移分配帧数')
    rect(s, L, 214, 600, 563, fill=BG)
    gif(s, I['p15ue'], L, 214, 600, 563)
    source_tag(s, L, 214, 600, 563, 'UE 实录', pos='bl')
    caption(s, L, 786, 600, 'UE 实录 · 四发升空尾缀')
    gx = L + 628
    rect(s, gx, 214, 210, 563, fill='0E0E14')
    gif(s, I['p15sim'], gx, 214, 210, 563)
    caption(s, gx, 786, 210, '烘焙器 · 实时模拟')
    x = 980
    w = R - x
    label_text(s, x, 214, w, '帧数分配')
    text(s, x, 262, w, 50, 'Δp = ∫ v(t) dt × 每米像素', size=S_CARD + 2, bold=True, lh=1.3)
    text(s, x, 326, w, 80, ['按 800 m、1080p 观看条件换算每帧屏幕位移，', '移动快的阶段多给帧，慢的阶段少给'], size=S_SMALL + 1,
         alpha=A_SUB, lh=1.55)
    card(s, x, 450, w, 230, key=True)
    text(s, x + 36, 478, w - 60, 90, '1.9 → 30', size=84, color=ACC, bold=True, lh=1.0)
    text(s, x + 36, 580, w - 60, 40, 'fps · L 档上升段最慢处帧率', size=S_BODY - 2, lh=1.3)
    text(s, x + 36, 626, w - 60, 40, '代价：单格高度降低，近看略软', size=S_SMALL, alpha=A_SUB, lh=1.4)
    text(s, x, 720, w, 80, ['6 档尾缀按开花高度生成，', 'PC 与手游使用同一套规则'], size=S_SMALL, alpha=A_NOTE, lh=1.6)
    return s


def p_bugs(d, I):
    s = d.slide('03 · 实践成果 · 问题排查', '方头与黑块：定位原因，写入导出与导入规则')
    label_text(s, L, 214, 700, '方头 · 低配出现')
    before_after(s, L, 260, 540, 470, I['p16a'], I['p16b'], tag_before='修前', tag_after='修后')
    caption(s, L, 740, 540, 'UE 实机 · PC 低档同机位 · 升空尾缀')
    y = 800
    for h, b in [('原因', '长条格压扁后采样到低 Mip，星头变方'), ('修法', 'PC 主序列不使用 Mip；手游保留 Mip')]:
        text(s, L, y, 100, 40, h, size=S_BODY - 2, color=ACC, bold=True, lh=1.3)
        text(s, L + 100, y, 520, 40, b, size=S_SMALL + 1, alpha=A_SUB, lh=1.4)
        y += 54
    x = 760
    w = R - x
    label_text(s, x, 214, w, '黑块 · 最亮处出现黑点')
    image(s, I['p16ramp'], x, 260, w, 450)
    caption(s, x, 740, w, '左：Ramp 末格为黑，出现黑点；右：末格不黑，没有黑点')
    y = 800
    for h, b in [('原因', '最亮处采样落到 Ramp 末格的黑色（末格涂黑用于去除光晕灰线）'),
                 ('修法', 'EmissiveDissolve 设为 0.98，确认有效后写入导出与导入规则')]:
        text(s, x, y, 100, 40, h, size=S_BODY - 2, color=ACC, bold=True, lh=1.3)
        text(s, x + 100, y, w - 100, 40, b, size=S_SMALL + 1, alpha=A_SUB, lh=1.4)
        y += 54
    return s


def p_demo(d, I):
    s = d.slide('03 · 实践成果 · 流程演示', '流程演示：从模板到 UE 播放')
    placeholder(s, L, 214, 1200, 675, '录屏位：完整操作（约 2 分钟）', '模板调参 → 回放 → 导出 → 导入 → 编排 → UE 播放',
                bg_image=I['demo'], bg_alpha=0.88)
    x = 1344
    steps = [('01', '选择模板、调参', '烘焙器实时模拟'), ('02', '引擎回放复核', '按导出的贴图播放'),
             ('03', '双平台导出', 'PC 与手游素材包'), ('04', '检查并导入', '确认后写入 UE'), ('05', '编排与播放', '生成导演表，UE 中播放')]
    y = 214
    for num, tt, sub in steps:
        text(s, x, y, 60, 40, num, size=28, color=ACC, bold=True, lh=1.3)
        text(s, x + 64, y, 420, 40, tt, size=S_BODY, bold=True, lh=1.3)
        text(s, x + 64, y + 42, 420, 36, sub, size=S_SMALL, alpha=A_NOTE, lh=1.4)
        y += 108
    card(s, x, 770, 480, 120, key=True)
    text(s, x + 36, 770, 430, 120, [[{'t': '实际用时 ', 'size': S_BODY, 'alpha': A_SUB},
                                      {'t': '__ 分 __ 秒', 'size': 34, 'bold': True, 'color': ACC}]], anchor='m', lh=1.3)
    return s


# ---------------------------------------------------------------- 04 分享与方法 / Thank
def p_method(d, I):
    s = d.slide('04 · 分享与方法', '工作方法：批量需求的三阶段协作')
    phases = [('01', '明确需求', [('需求定义', '目标、约束、验收标准'), ('技术选型', 'AI 梳理技术，取最简方案'),
                               ('原理先行', '先拆结构，再调参数')]),
              ('02', '建立规范', [('任务拆分', '按效果、工具、编排分配 AI 负责人'), ('宪章规范', '参数、交互、编排规则成文'),
                               ('执行前读取', '先读规范与交接')]),
              ('03', '结果把关', [('自动检查', '标准检查、回放检查、合入门禁'), ('状态分离', '执行、自检、验收分开记录'),
                               ('版本锁定', '通过后锁定，复用派生')])]
    y = 214
    for n, name, rows in phases:
        rect(s, L, y, 88, 88, fill=ACC, fill_alpha=0.06, line=ACC, line_w=3, shape=MSO_SHAPE.OVAL)
        text(s, L, y, 88, 88, n, size=32, color=ACC, bold=True, align='c', anchor='m', lh=1.1)
        text(s, L, y + 100, 180, 50, name, size=32, bold=True, lh=1.2)
        ry = y + 4
        for head, body in rows:
            text(s, L + 220, ry, 788, 40, [[{'t': head, 'bold': True, 'size': S_BODY - 2},
                                             {'t': '　' + body, 'size': S_SMALL + 1, 'alpha': A_SUB}]], lh=1.35)
            ry += 62
        y += 250
        if y < 900:
            rect(s, L + 220, y - 34, 788, 1, fill=TXT, fill_alpha=0.10)
    card(s, COL40_X, 214, COL40_W, 742, key=True)
    text(s, COL40_X + 44, 250, 600, 50, '适用场景', size=S_CARD + 4, bold=True, lh=1.3)
    tips = [('重复性设置', 'AI 开发工具，批量处理'), ('复杂效果', '拆结构后模拟、烘焙'), ('大规模编排', '以表驱动')]
    yy = 340
    for t_, body in tips:
        green_sq(s, COL40_X + 44, yy + 14)
        text(s, COL40_X + 72, yy, 560, 44, t_, size=S_BODY, bold=True, lh=1.4)
        text(s, COL40_X + 72, yy + 46, 560, 44, body, size=S_SMALL + 1, alpha=A_SUB, lh=1.4)
        yy += 120
    rect(s, COL40_X + 44, 720, 584, 1, fill=TXT, fill_alpha=0.12)
    text(s, COL40_X + 44, 744, 584, 40, '工具包存放位置：xx', size=S_BODY - 2, bold=True, lh=1.4)
    text(s, COL40_X + 44, 792, 584, 40, '首批：烘焙器与案例', size=S_SMALL, alpha=A_SUB, lh=1.4)
    text(s, COL40_X + 44, 860, 584, 40, '从一项重复性工作开始', size=S_BODY, color=ACC, lh=1.5)
    return s


def p_thanks(d, I):
    s = d.slide(transition=True)
    image(s, I['thank'], 0, 0, 1920, 1080)
    source_tag(s, 0, 0, 1920, 1080, 'UE 实机', pos='tr')
    text(s, L, 690, 1728, 200, 'THANK YOU', size=176, bold=True, lh=1.0)
    end_bar(s, L, 900, 96)
    text(s, L + 120, 880, 900, 50, '谢谢 · 欢迎交流', size=34, alpha=0.86, lh=1.3)
    page_footer(s, d.footer)
    return s


PAGES = [p_cover, p_scale, p_delivery_problem, p_choreo_problem, p_baker, p_export, p_import, p_choreo_rules,
         p_workbench, p_summary, p_resources, p_choreo_result, p_import_result, p_sparkler, p_trail, p_bugs, p_demo,
         p_method, p_thanks]

# ---------------------------------------------------------------- 台词与依据
NOTES = {
    # 键：(页名, 提词, 口播, 依据)
    'p_cover': ('封面', '三块工作都做了工具 · 分四部分讲',
                '大家好，我是____。今天和大家分享跨年烟花秀的制作过程。这一个多月里，效果制作、资源交付和节目编排这三块工作，我都借助 AI 做了工具。'
                '我分四部分来讲：先说遇到的挑战，再说解决思路，然后看实践成果，最后分享一点工作方法。',
                ''),
    'p_scale': ('制作规模', '3 → 26 种 · 1 → 6 档 · 70 → 220 秒 · 两套',
                '先说挑战，第一个是规模。去年是 3 种烟花、1 条升空尾缀，节目大约 70 秒；今年开花有 26 种，扇形也算在里面，尾缀分了 6 档，节目大约 220 秒，'
                '而且 PC 和手游要各做一套。规模一大，重复的工作也跟着变多，最明显的就是资源交付。',
                '去年 3 种、1 条尾缀、约 70 秒为讲者口述；今年 26 种、6 档、219.5 秒：第二版核验 verify_A1_A2 §1、B11 修订 3。'),
    'p_delivery_problem': ('资源交付', '导出一串规格 · 导入十几项设置 · 绿框三项最要命',
                           '资源交付分导出和导入两段。导出时，每种烟花都要定取景、帧数、排格和打包，还要做 Ramp 和 Cutout，两个平台各出一份；'
                           '导入时，每个资源还有十几项引擎设置。以前这些全靠手工一个个做，效果一改就要重来。'
                           '漏掉一项就会出问题，比如标绿的三项：NeverStream 没关，贴图会常驻内存；PC 主序列带了 Mip，星头会变方；'
                           'EmissiveDissolve 没设好，最亮的地方会出黑块。除了资源，第三个挑战在编排。',
                           '12 项设置：烟花贴图规范（与性能组约定）与烟花特效资产规范；三项后果见第 16 页与 LOWQ_FIX_20261018。'),
    'p_choreo_problem': ('编排', '去年 12 条子序列、2726 条轨道 · 今年 220 秒、24 点位、两平台各 3 档',
                         '去年的编排是在定序器里手工拼的，一共 12 条子序列、两千七百多条轨道。改一处节奏要逐条对齐，整体构图也很难直接看到，每个画质档还要分别维护。'
                         '今年节目更长，有 24 个发射点位，PC 和手游各分三档画质，节奏还要跟着音乐反复改，再靠手工排轨就改不过来了。'
                         '规模、资源交付、编排，这就是三个挑战。下面一个一个说解决思路。',
                         '12 子序列、2726 轨道：UE 只读统计（10-29，第二版核验 A3）。'),
    'p_baker': ('烟花烘焙器', '之前 Blender 出图慢、预览对不上 · 选模板 → 调参 → 存效果 → 派生',
                '先说规模。我让 AI 开发了烟花烘焙器。之前也试过用 AI 脚本驱动 Blender 出图，能出，但每一轮都要等渲染，预览和最终输出也对不上。'
                '烘焙器只算游戏视角需要的序列，内置了花型模板和多层模板：选一个模板、调一调参数，就是一个新效果，存进效果库以后还能继续派生。'
                '效果做得快了，接下来要解决的是怎么把它规范地交出去。',
                '模板数量：analysis/results/NF4/缩略图/缩略图.json（4.9.18：花型模板 27、多层模板 30）。'),
    'p_export': ('导出规范', '三种取景 · 两成提到四成 · 其余自动 · 右边回放复核',
                 '交付分两步，先看导出。第一步是取景：默认用固定框；随开花放大，能让刚开花时拿到更多像素；锚在爆点，适合单侧的花型。'
                 '扇形测试里，内容占面片的比例从大约两成提到了四成。后面的排格、打包、Ramp、Cutout 和两个平台的导出都是自动完成的。'
                 '右边是回放复核：按导出的 64 帧贴图一格一格回放，确认交出去的和我们看到的一致。导出之后就是导入。',
                 'tool/CHANGELOG.md 4.9.33、4.9.81（FC6O 取景估算 0.20 / 0.21 / 0.41）；动图为用户 10-30 录屏。'),
    'p_import': ('导入规范', '检查 → 创建 → 确认写入 → 读回 · 规范写进工具',
                 '导入交给导入器。它读取素材包，先检查命名、尺寸和各项规范，再按平台创建贴图、材质实例和发射器，确认以后写入 UE，并读回核对。'
                 '和性能组定下的贴图规范，还有包围盒、朝向、EmissiveDissolve 这些设置，都写进了工具，不用再靠人记。'
                 '资源能顺利进引擎了，剩下的是编排。',
                 '项目规则 §2 烟花贴图规范（v2.31）；spec/workspace_resource_v1.md。'),
    'p_choreo_rules': ('编排推演', '800 米大坝 · 点距 100 米 · 1.5 倍 / 2 倍 / 3 倍 · 四档 · 极限帧',
                       '编排我先做推演。舞台是一座宽约 800 米、高 150 米的大坝，按约 100 米的点距布置发射点，一共 24 个。'
                       '花径大约是点距的 1.5 倍时，还能分清单朵；到 2 倍以上会连成花墙；3 倍左右就容易糊成一片。'
                       '按这个关系，把花型分成 S、M、L 和主角四档，定好各自的开花高度，再检查极限帧，也就是同一时刻各档都开到最大时，会不会叠得太满。'
                       '这些规则写进了编排宪章，每一版都自动检查。规则有了，还需要一个工具把它落地。',
                       '协作/跨年秀编排宪章.md；第二版重制第 7 页；舞台图按编排工作台设计令牌配色重画（设计值）。'),
    'p_workbench': ('烟花编排工作台', '基础模板 → 花型模板 → 编排片段 → 导演表 · 改节奏只要重新出表',
                    '这个工具就是烟花编排工作台。资源表里的效果是基础模板；配上尺寸、高度和尾缀，就成了花型模板；把花型模板放上时间轴，就是编排片段。'
                    '右边是工作台的整页：左边是模板库，中间是舞台预览，下面是时间轴上的编排片段，右上角的交付按钮生成导演表。片段按音乐分段，可以一段一段调节奏和构图，最后一键生成导演表，导入 UE。改节奏只要重新出一次表。'
                    '把三个问题和三个工具放在一起，就是下面这张图。',
                    '云端打开 tool/烟花编排工作台.html（B11 修订 3，2:45.5，PC 高配）：基础模板 33、花型模板 97、编排片段 492。'),
    'p_summary': ('解决思路汇总', '三个问题 → 三个工具 → UE · 分工与跨组协作',
                  '三个问题对应三个工具：烘焙器解决规模，导入器解决资源交付，编排工作台解决编排，工具之间用固定格式衔接，最后在 UE 里播放。'
                  '分工上，目标、审美和引擎约束由我来定，工具由 AI 开发，关键结果在 UE 里验收；导演蓝图和程序一起设计，贴图规范和性能组一起定。'
                  '接下来看这些工具实际做出了什么。',
                  '约 2200 次提交：第二版核验 verify_A1_A2 §1（含后台自动回传）。'),
    'p_resources': ('资源成果', 'PC 26 种 · 6 档尾缀 · 窜天猴 1 套 · 手游 12 种 · 贴图 212 张',
                    '先看资源。进入跨年 3.0 资源表的，有球花和扇形 26 种、升空尾缀 6 档、窜天猴一套；手游覆盖 12 种开花，尾缀和窜天猴也都有。'
                    '引用的贴图去重以后一共 212 张。其中 19 种开花保留了配方和导出记录，以后调参可以直接重新导出。资源之后，看编排。',
                    'verify_A1_A2 §1、§6；第三版素材/资源分类.md；尾缀格为用户 10-30 UE 录屏。'),
    'p_import_result': ('接入成果', '149 / 149 读回一致 · 115 个包无错误 · Overdraw 看叠加',
                        '再看资源接入。接入这边做过两轮批量修正：贴图规范定下来以后，149 张贴图一次批量重设，读回全部一致；更早一轮修了 115 个包，也没有报错。'
                        '这些规则现在都在导入器里，新资源进来会自动执行。右边是 UE 里的 Overdraw 视图，颜色越暖叠得越多，哪里需要减层一眼就能看出来。'
                        '在开发机上实测，PC 高配烟花半透明的耗时在 0.08 到 0.5 毫秒之间。下面讲两个技术案例。',
                        'TEX_SPEC_20261018/verify.json；资源规范统一_20261016/改后读回.json；实测见 OVERDRAW_B11r3_20261019/看法.md（RTX 5080 编辑器视口，非目标机）；截图为用户提供。'),
    'p_choreo_result': ('编排成果', '3:05 同一时刻：PC 31 发、手游 13 发 · 自动分档 · 11 个大版本',
                        '编排成果先看重叠检查。'
                        '上面这两张是整场球花最满的时刻，3 分 05 秒：球花按开到最大来画，地面的扇形和升空尾缀是这一刻的状态。PC 高配同时有 31 发球花，手游 13 发，圈和圈重叠的地方，就是推演时要控制的。'
                        '下面是辅助数据：同一份编排按平台和画质自动分档，PC 一场从大约 1150 次到 440 次播放，手游从 450 次到 180 次，不用每档单独排；一共迭代了 11 个大版本，每版都自动检查。目前节拍对齐的指标还没达到宪章目标，还在继续调。',
                        'B11 修订 3 编排检查（PC 1145 / 852 / 438，手游 448 / 349 / 181）；重叠图取编排方案 B11 修订 1 页逐 0.5 s 扫描球花面积最大的 185.0 s（PC 小 10 · 中 8 · 大 13；手游同刻大 13），球花按满径、扇形 / 尾缀 / 小平台小花按此刻状态原生绘制；同点同高叠放的两发合成一圈（底色加深）。'),
    'p_sparkler': ('仙女棒', '一级二级分叉 · 以往 10 个发射器 · 13 类合成 1 张 64 帧 · 左 UE 实录',
                   '第一个是仙女棒。它的火星有一级、二级分叉，也有清楚和模糊的层次。以往类似的效果，比如窜天猴的拖尾，要用 10 个发射器拼。'
                   '这次我把之前 Blender 工程里的 13 类火星交给 AI，改成通用的母子分叉，烘焙时合成一张 64 帧序列，每个平台只要一个发射器。'
                   '左边是 UE 里的实录，右边绿框里是烘焙器的引擎回放。第二个案例是升空尾缀。',
                   'verify_A4；UE 实录与引擎回放为用户 10-30 录屏。'),
    'p_trail': ('升空尾缀', '上升段走得快 · 按屏幕位移分帧 · 1.9 → 30 fps · 代价近看略软',
                '尾缀的难点在帧数。上升的时候它在屏幕上走得很快，如果按时间平均分帧，这一段每帧跳得太远，看起来一顿一顿的。'
                '所以我按观看距离，算出每一帧在屏幕上的位移：走得快的阶段多给帧，慢的阶段少给。L 档上升段最慢处的帧率，从大约 1.9 提到了 30。'
                '代价是单格高度变小，近看稍微软一点。左边是 UE 实录，中间是烘焙器里的实时模拟。除了做新效果，排查问题也花了不少时间。',
                '第二版重制第 13、19 页；tool/CHANGELOG.md 4.9.26、4.9.31；录屏为用户 10-30 提供。'),
    'p_bugs': ('方头与黑块', '方头：低配低 Mip → PC 主序列不用 Mip · 黑块：Ramp 末格 → 0.98',
               '排查里有两个典型问题。一个是方头，只在低配出现：长条格被压扁后采样到了低 Mip，星头就变方了；固定机位逐档对比后定位，PC 主序列改成不用 Mip。'
               '另一个是最亮处的黑块，看上去是一个个黑点：亮度采样落到了 Ramp 最后一格的黑色，把 EmissiveDissolve 设成 0.98 就解决了。'
               '这两条都写进了导出和导入规则，后面不会再犯。最后用一段录屏把整个流程串一遍。',
               'analysis/results/LOWQ_FIX_20261018；analysis/probe/BC7护栏黑块_2026-10-15（机制复现为模拟）。'),
    'p_demo': ('流程演示', '模板调参 → 回放复核 → 双平台导出 → 导入 UE → 编排',
               '这段录屏从选模板、调参数开始，在引擎回放里复核，同时导出 PC 和手游，用导入器写进 UE，再到编排工作台排进节目。'
               '（播放录屏，约 2 分钟）录屏剪辑过，完整走一遍实际大约 ×× 分钟。最后分享一点工作方法。',
               '录屏由讲者提供。'),
    'p_method': ('工作方法', '明确需求 · 建立规范 · 结果把关 · 从一项重复工作开始',
                 '这一个多月下来，我的体会是：批量需求可以分三个阶段和 AI 协作。第一，明确需求：先定目标、约束和验收标准，让 AI 梳理需要的技术，选最简单可行的方案。'
                 '第二，建立规范：按效果、工具、编排拆分任务，把参数、交互、编排规则写成宪章，每次开工前先读规范和交接。'
                 '第三，结果把关：先自动检查，再到 UE 里验收，执行、自检和验收分开记录，通过的版本锁定复用。'
                 '工具包我会放在 xx 处，建议大家从手边一项重复性工作开始试。',
                 ''),
    'p_thanks': ('Thank You', '谢谢 · 欢迎交流', '以上就是我的分享，谢谢大家，欢迎交流。', ''),
}


def main():
    I = build_images()
    d = Deck(FOOTER)
    md = ['# 口播稿：烟花秀 AI 全流程（第四版 v2 · 组内分享 2026-10-30）', '',
          '> 每页先看 **提词**，说出第一句就能接下去；每段最后一句是过渡，照读就能接到下一页。',
          '> 数字记不住就看屏幕，页面上都有；忘词时停一下、看提词，没关系。', '']
    total = 0
    appendix = []
    for i, fn in enumerate(PAGES, 1):
        s = fn(d, I)
        name, cue, nar, basis = NOTES[fn.__name__]
        sec = max(5, int(round(len(nar) / 250 * 60 / 5.0) * 5)) + (120 if fn.__name__ == 'p_demo' else 0)
        head = f'第 {i} 页 · {name}（约 {sec} 秒）'
        notes(s, head + '\n提词：' + cue + '\n\n' + nar + ('\n\n依据：' + basis if basis else ''))
        total += len(nar)
        md += [f'## {head}', '', f'**提词**：{cue}', '', nar, '']
        if basis:
            appendix.append(f'- 第 {i} 页 {name}：{basis}')
    md.insert(5, f'全文约 {total} 字，按每分钟 250 字约 {total / 250:.1f} 分钟，加录屏约 2 分钟；以试讲为准。')
    md.insert(6, '')
    md += ['---', '', '## 附：数字依据（讲的时候不用看）', ''] + appendix + ['']
    d.save(OUT, title='烟花秀 AI 全流程', subject='VFX 组内分享 · 2026-10-30')
    with open(SCRIPT_MD, 'w', encoding='utf-8') as f:
        f.write('\n'.join(md))
    print('saved', OUT, 'chars', total)


if __name__ == '__main__':
    main()
