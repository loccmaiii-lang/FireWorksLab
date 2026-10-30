# -*- coding: utf-8 -*-
"""分享 PPT 第四版（云端）：烟花秀 AI 全流程（组内分享，2026-10-30）。

用法（仓库根目录）：python3 "协作/提示词/分享PPT交接_2026-10-29/第四版交付_云端/build_v4.py"
结构（用户 10-30 11:07）：01 制作与挑战 → 02 解决思路 → 03 实践成果 → 04 分享与方法 → Thank。
内容底稿：第二版重制（素材、口径）+ 第三版（版式与精简文字）；版式组件沿用第一版 pptkit（VFX 组模板）。
台词与依据写在本文件 NOTES 里，构建时写入每页备注与 讲稿_第四版.md。
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
OUT = os.path.join(HERE, '烟花秀AI全流程_第四版.pptx')
SCRIPT_MD = os.path.join(HERE, '讲稿_第四版.md')
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


def sheet_vertical():
    """64 帧主序列（16×4）重排成 4×16 竖条，便于和回放动图并排。"""
    sheet = Image.open(_src('16_仙女棒_64帧序列贴图.jpg')).convert('L')
    cw, ch = sheet.width // 16, sheet.height // 4
    out = Image.new('L', (cw * 4, ch * 16 // 4 * 4 // 4 * 4 if False else ch * 16 // 4 * 4 // 4), 0)
    cols, rows = 4, 16
    out = Image.new('L', (cw * cols, ch * rows // 1), 0)
    for i in range(64):
        r0, c0 = divmod(i, 16)
        cell = sheet.crop((c0 * cw, r0 * ch, (c0 + 1) * cw, (r0 + 1) * ch))
        r1, c1 = divmod(i, cols)
        out.paste(cell, (c1 * cw, r1 * ch))
    out = out.resize((360, int(360 * out.height / out.width)), Image.LANCZOS).convert('RGB')
    p = os.path.join(IMG, 'p06_sheet.jpg')
    out.save(p, quality=90)
    return p


def thank_scrim(im):
    """结尾页：整体略压暗，保留天空层次，便于居中叠字。"""
    return Image.blend(im, Image.new('RGB', im.size, (10, 10, 10)), 0.18)


def left_fade(im):
    """封面右图：左缘 18% 渐隐到 #0A0A0A，与左侧纯色标题区衔接。"""
    W, H = im.size
    ov = Image.new('RGB', (W, H), (10, 10, 10))
    mask = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(mask)
    edge = int(W * 0.18)
    for x in range(edge):
        a = int(255 * (1 - x / edge) ** 1.6)
        d.line([(x, 0), (x, H)], fill=a)
    return Image.composite(ov, im, mask)


def build_images():
    I = {}
    I['cover'] = prep('03_UE跨年秀_金色扇面.jpg', 'cover.jpg', 1100, 1080, scale=1.0, focus=(0.62, 0.5), darken=left_fade)
    I['p02'] = prep('ingame_show.jpg', 'p02_show.jpg', 1008, 742, box=(1420, 110, 3060, 1318))
    I['p04'] = os.path.join(V1IMG, 'p05_sequencer.jpg')
    I['p05a'] = prep('analysis/results/NF4/缩略图/总表_花型模板.jpg', 'p05_tpl.jpg', 571, 330)
    I['p05b'] = prep('analysis/results/NF4/缩略图/总表_多层模板.jpg', 'p05_multi.jpg', 571, 330)
    I['p05c'] = prep('analysis/results/NF4/缩略图/总表_效果条目.jpg', 'p05_fx.jpg', 571, 330)
    I.update({'p06' + k: v for k, v in framing_panels().items()})
    I['p06sheet'] = prep('16_仙女棒_64帧序列贴图.jpg', 'p06_sheet.jpg', 556, 139)
    I['p06gif'] = os.path.join(IMG, 'gif_sparkler.gif')
    I['p07'] = prep('IMPORT5_THEME_20261024_after_1920.png', 'p07_importer.jpg', 1008, 567)
    I['p08'] = prep('极限帧推演_设计图.png', 'p08_frame.jpg', 1000, 605, mode='contain')
    I['p09a'] = prep('wb_基础模板.png', 'p09_base.jpg', 370, 300, box=(250, 115, 790, 553))
    I['p09b'] = prep('wb_花型模板.png', 'p09_flower.jpg', 370, 300, box=(0, 95, 640, 614))
    I['p09gif'] = os.path.join(IMG, 'gif_stage_play.gif')
    I['p09d'] = prep('wb_deliv_list.jpg', 'p09_deliv.jpg', 370, 300, box=(3180, 180, 3840, 715))
    for k in ('baker', 'importer', 'workbench'):
        I['p10' + k] = os.path.join(V1IMG, f'p06_{k}.jpg')
    I['p10ue'] = prep('01_封面_UE跨年秀.jpg', 'p10_ue.jpg', 358, 202, box=(1180, 0, 1920, 760), focus=(0.5, 0.35))
    I['p11'] = [(prep(f's09_{n:02d}.jpg', f'p11_{n}.jpg', 240, 240), name) for n, name in
                ((4, '金蕊柠'), (6, '金锦菊'), (8, '小青柠'), (10, '小金花'))]
    I['p11strip'] = prep('02_UE跨年秀_彩色全景.jpg', 'p11_strip.jpg', 1008, 360, box=(0, 420, 1600, 900))
    I['p13a'] = prep('wb_PC高配.png', 'p13_pc_high.jpg', 1728, 306, box=(0, 660, 1920, 1000))
    I['p13b'] = prep('wb_手游低配.png', 'p13_m_low.jpg', 1728, 306, box=(0, 660, 1920, 1000))
    I['p14a'] = prep('17_仙女棒13层_第1至7层.jpg', 'p14_l1.jpg', 1162, 188)
    I['p14b'] = prep('18_仙女棒13层_第8至13层.jpg', 'p14_l2.jpg', 1162, 188)
    I['p14c'] = prep('16_仙女棒_64帧序列贴图.jpg', 'p14_sheet.jpg', 1162, 290)
    I['p14gif'] = os.path.join(IMG, 'gif_sparkler.gif')
    I['p15ue'] = prep('s13_04.jpg', 'p15_ue.jpg', 692, 462, focus=(0.6, 0.5))
    I['p15near'] = os.path.join(IMG, 'gif_rise_loop.gif')
    I['p15far'] = os.path.join(IMG, 'gif_trail_far.gif')
    lq = 'analysis/results/LOWQ_FIX_20261018/'
    I['p16a'] = prep(lq + '升空_现状对NoMip_低档.jpg', 'p16_sq_now.jpg', 264, 470, box=(1036, 836, 1326, 1210),
                     mode='contain')
    I['p16b'] = prep(lq + '升空_现状对NoMip_低档.jpg', 'p16_sq_fix.jpg', 264, 470, box=(1334, 836, 1624, 1210),
                     mode='contain')
    I['p16ramp'] = prep('第三版素材/原图/Ramp末格_复现.png', 'p16_ramp.jpg', 1064, 450, box=(0, 0, 1042, 556), mode='contain')
    I['demo'] = prep('06_烘焙器界面_引擎回放.jpg', 'demo_bg.jpg', 1200, 675, focus=(0.5, 0.5))
    I['thank'] = prep('01_封面_UE跨年秀.jpg', 'thank.jpg', 1920, 1080, scale=1.0, darken=thank_scrim)
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
    s = d.slide(footer=False, transition=True)
    image(s, I['cover'], 820, 0, 1100, 1080)
    source_tag(s, 820, 0, 1100, 1080, 'UE 实机', pos='br')
    text(s, L, 200, 700, 36, 'VFX 组内分享 · 2026.10.30', size=S_LABEL, color=ACC, bold=True, spc=4, lh=1.3)
    text(s, L, 256, 720, 270, ['烟花秀', 'AI 全流程'], size=116, bold=True, lh=1.12)
    text(s, L, 540, 700, 50, '烟花烘焙器 · 导入器 · 烟花编排工作台', size=30, alpha=0.86, lh=1.3)
    end_bar(s, L, 616, 72)
    text(s, L, 650, 600, 40, '分享人：____', size=26, alpha=A_SUB, lh=1.4)
    items = [('01', '制作与挑战'), ('02', '解决思路'), ('03', '实践成果'), ('04', '分享与方法')]
    for i, (num, name) in enumerate(items):
        y = 774 + i * 44
        text(s, L, y, 44, 40, num, size=24, color=ACC, bold=True, lh=1.3)
        text(s, L + 50, y, 300, 40, name, size=24, alpha=A_SUB, lh=1.3)
    page_footer(s, d.footer)
    return s


def p_scale(d, I):
    s = d.slide('01 · 制作与挑战 · 规模', '制作规模：开花 26 种、尾缀 6 档、时长约 220 秒')
    image(s, I['p02'], L, 214, COL60_W, 742, tag='游戏内实机 · 今年节目')
    x = COL40_X
    label_text(s, x, 214, COL40_W, '去年 → 今年')
    rows = [('开花种类（含扇形）', '3', '26', '种', True), ('升空尾缀', '1', '6', '档', False),
            ('节目时长', '约 70', '约 220', '秒', False), ('输出平台', '', '2', '套 · PC 与手游', False)]
    y = 270
    for head, a, b, unit, hot in rows:
        rect(s, x, y, COL40_W, 1, fill=TXT, fill_alpha=0.12)
        text(s, x, y + 18, COL40_W, 34, head, size=S_SMALL, alpha=A_SUB, lh=1.3)
        runs = []
        if a:
            runs += [{'t': a, 'size': 48, 'alpha': 0.45, 'bold': True}, {'t': ' → ', 'size': 36, 'alpha': 0.45}]
        runs += [{'t': b, 'size': 88 if hot else 60, 'bold': True, 'color': ACC if hot else TXT},
                 {'t': ' ' + unit, 'size': S_SMALL + 2, 'alpha': A_SUB}]
        text(s, x, y + 56, COL40_W, 100, [runs], lh=1.05)
        y += 168
    text(s, x, 930, COL40_W, 30, '花型按花名计；去年数据为讲者统计', size=S_SMALL - 4, alpha=A_FOOT, lh=1.2)
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
        rect(s, bx, 266, cw, 64, fill=CARD, line='F5F5F5', line_alpha=A_STROKE)
        text(s, bx + 4, 266, cw - 8, 64, t, size=S_SMALL, align='c', anchor='m', lh=1.2)
        if i < 8:
            line(s, bx + cw + 3, 298, bx + cw + gap - 3, 298, color=TXT, alpha=0.45, w=2, arrow=True)
    lw = 600
    text(s, L, 392, lw, 44, '导出 · 每种烟花需确定的规格', size=S_CARD - 2, bold=True, lh=1.3)
    grid_cells(s, L, 452, lw, 2, EXPORT_ITEMS, cell_h=76)
    rx = L + lw + 48
    rw = R - rx
    text(s, rx, 392, rw, 44, '导入 · 每个资源需完成的设置', size=S_CARD - 2, bold=True, lh=1.3)
    grid_cells(s, rx, 452, rw, 3, IMPORT_ITEMS, cell_h=76, size=S_SMALL - 1)
    rect(s, L, 836, W_CONTENT, 1, fill=TXT, fill_alpha=0.12)
    text(s, L, 858, W_CONTENT, 44, '原有方式：以上步骤逐个资源手工完成，效果一调整就需重做', size=S_BODY - 2, lh=1.4)
    text(s, L, 906, W_CONTENT, 40, '漏设一项即出现问题：贴图常驻内存、星头方块、最亮处黑块', size=S_SMALL + 1, alpha=A_SUB,
         lh=1.4)
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
    caption(s, rx, 552, 571, '单层花型模板 · 27 种（4.9.18 统计）', size=S_SMALL - 2)
    caption(s, rx + 591, 552, 571, '多层模板 · 30 种（4.9.18 统计）', size=S_SMALL - 2)
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
    caption(s, L, 548, 1128, '取景示意：扇形开满时刻，绿点为爆点；数字为扇形测试中内容占面片的比例（中位数）')
    rect(s, 1248, 214, 576, 357, fill=BG, line='F5F5F5', line_alpha=A_STROKE)
    image(s, I['p06sheet'], 1258, 224, 556, 139)
    line(s, 1340, 372, 1340, 410, color=TXT, alpha=0.5, w=2, arrow=True)
    text(s, 1258, 420, 200, 120, ['按导出贴图', '逐帧回放'], size=S_SMALL - 2, alpha=A_SUB, lh=1.5)
    gif(s, I['p06gif'], 1560, 372, 192, 192)
    caption(s, 1248, 580, 576, '导出的 64 帧贴图 → 回放复核 · 仙女棒')
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


# 烟花编排工作台的设计令牌与舞台预览配色（tool/design-system/tokens.json、basic-preview-renderer.mjs）
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
    text(s, X0 + W - 380, Y0 + 10, 370, 24, '大坝宽 800 m · 同一米尺 · 设计参照', size=14, color=WB['grid_txt'], align='r',
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
    rx, rw = 662, 1162
    gif(s, I['p09gif'], rx, 214, rw, rw * 313 / 1112)
    caption(s, rx, 214 + rw * 313 / 1112 + 8, rw, '03 编排片段 · 时间轴播放时的舞台预览（PC 高配，B11 修订 3）', size=S_SMALL - 2)
    tw, gap = 370, 26
    y2 = 600
    for i, (k, c) in enumerate([('p09a', '01 基础模板 · 33 个'), ('p09b', '02 花型模板 · 97 个'), ('p09d', '04 交付 · 导演表与节目清单')]):
        x = rx + i * (tw + gap)
        image(s, I[k], x, y2, tw, 300)
        caption(s, x, y2 + 308, tw, c, size=S_SMALL - 2)
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
    text(s, L + 40, 800, 920, 130, ['目标、审美与引擎约束由我确定；工具由 AI 开发，关键结果在 UE 验收', '一人对接 AI；仓库约 2200 次提交（含后台自动回传）'],
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
    tw, gx = 240, 16
    for i, (img, name) in enumerate(tiles):
        x = L + i * (tw + gx)
        image(s, img, x, 214, tw, tw)
        text(s, x, 462, tw, 32, name, size=S_SMALL - 2, alpha=A_SUB, align='c', lh=1.3)
    caption(s, L, 500, COL60_W, '球花 · UE 资产试放')
    image(s, I['p11strip'], L, 552, COL60_W, 360)
    caption(s, L, 920, COL60_W, '扇形与升空尾缀 · UE 实机（今年节目）')
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
    text(s, x, y + 116, COL40_W, 70, ['去重共 212 张；20 种开花有烘焙器导出材料，', '其中 19 种有配方与导出记录'], size=S_SMALL - 2,
         alpha=A_NOTE, lh=1.5)
    return s


def p_import_result(d, I):
    s = d.slide('03 · 实践成果 · 资源交付', '接入成果：两轮批量修正，读回一致')
    # 左：贴图规范（10-18）
    lw = 780
    label_text(s, L, 214, lw, '贴图规范确定后')
    text(s, L, 258, lw, 130, [[{'t': '149', 'size': 112, 'color': ACC, 'bold': True},
                               {'t': ' / 149', 'size': 56, 'color': ACC, 'bold': True},
                               {'t': '  张贴图读回一致', 'size': S_BODY - 2, 'alpha': A_SUB}]], lh=1.0)
    heads = [(0, '类别'), (190, '数量'), (280, 'NeverStream'), (450, '贴图组'), (610, '寻址 / Mip')]
    for dx, h in heads:
        text(s, L + dx, 420, 220, 30, h, size=S_SMALL - 4, alpha=A_FOOT, bold=True, lh=1.2)
    rows = [('手游主序列', '86', '关闭', 'DistantVFX', 'Wrap'), ('PC 主序列', '40', '关闭', 'DistantVFX', 'Wrap'),
            ('Ramp', '23', '关闭', 'DistantVFX', 'Clamp · NoMip')]
    y = 456
    for r in rows:
        rect(s, L, y, lw, 1, fill=TXT, fill_alpha=0.10)
        for (dx, _), v in zip(heads, r):
            text(s, L + dx, y + 12, 200, 40, v, size=S_SMALL, bold=(dx == 0), alpha=A_BODY if dx == 0 else A_SUB, lh=1.3)
        y += 60
    rect(s, L, y, lw, 1, fill=TXT, fill_alpha=0.10)
    caption(s, L, y + 10, lw, 'UE 读回 · 共用贴图单独列出，不随之修改')
    # 右：资源设置（10-16）
    rx = L + lw + 120
    rw = R - rx
    label_text(s, rx, 214, rw, '更早一轮 · 粒子与材质')
    text(s, rx, 258, rw, 130, [[{'t': '115', 'size': 112, 'bold': True},
                                {'t': '  个包读回无错误', 'size': S_BODY - 2, 'alpha': A_SUB}]], lh=1.0)
    heads2 = [(0, '设置项'), (400, '数量')]
    for dx, h in heads2:
        text(s, rx + dx, 420, 300, 30, h, size=S_SMALL - 4, alpha=A_FOOT, bold=True, lh=1.2)
    rows2 = [('EmissiveDissolve 0.98', '67 个材质实例'), ('固定包围盒', '47 个粒子系统'), ('FacingCameraPosition', '12 个发射器'),
             ('UV 随机翻转', '28 个发射器')]
    y = 456
    for a, b in rows2:
        rect(s, rx, y, rw, 1, fill=TXT, fill_alpha=0.10)
        text(s, rx, y + 12, 400, 40, a, size=S_SMALL, bold=True, lh=1.3)
        text(s, rx + 400, y + 12, rw - 400, 40, b, size=S_SMALL, alpha=A_SUB, lh=1.3)
        y += 60
    rect(s, rx, y, rw, 1, fill=TXT, fill_alpha=0.10)
    card(s, L, 820, W_CONTENT, 136, key=True)
    text(s, L + 40, 820, W_CONTENT - 80, 136, '以上规则已内置于导入器：新资源导入时按平台自动设置，并读回核对',
         size=S_BODY, anchor='m', lh=1.4)
    return s


def p_choreo_result(d, I):
    s = d.slide('03 · 实践成果 · 编排', '编排成果：同一编排按平台与画质分档输出')
    card(s, L, 214, W_CONTENT, 470)
    text(s, L + 40, 240, 1200, 40, '各档一场的播放次数', size=S_BODY, bold=True, lh=1.3)
    data = [('PC', [('高', 1145), ('中', 852), ('低', 438)]), ('手游', [('高', 448), ('中', 349), ('低', 181)])]
    base, top, vmax = 600, 330, 1145
    bw, gap_in, gap_grp = 150, 40, 200
    x = L + 160
    for gi, (g, bars) in enumerate(data):
        gx0 = x
        for name, v in bars:
            h = (base - top) * v / vmax
            hot = gi == 0 and name == '高'
            rect(s, x, base - h, bw, h, fill=ACC if hot else TXT, fill_alpha=None if hot else 0.32)
            text(s, x - 20, base - h - 42, bw + 40, 36, str(v), size=S_SMALL + 1, bold=True, align='c', lh=1.2)
            text(s, x, base + 8, bw, 32, name, size=S_SMALL - 2, alpha=A_SUB, align='c', lh=1.2)
            x += bw + gap_in
        text(s, gx0, base + 40, x - gap_in - gx0, 34, g, size=S_BODY - 2, bold=True, align='c', lh=1.2)
        x += gap_grp - gap_in
    rect(s, L + 120, base, W_CONTENT - 240, 1, fill=TXT, fill_alpha=0.25)
    card(s, L, 714, COL60_W, 242, key=True)
    text(s, L + 40, 740, 900, 80, [[{'t': '11', 'size': 72, 'color': ACC, 'bold': True},
                                     {'t': ' 个大版本', 'size': S_CARD, 'bold': True}]], lh=1.05)
    text(s, L + 40, 846, 920, 80, '每版自动检查；调整节奏只需在工作台改完重新出表', size=S_SMALL + 2, alpha=A_SUB, lh=1.6)
    card(s, COL40_X, 714, COL40_W, 242)
    label_text(s, COL40_X + 40, 740, 600, '待改进')
    text(s, COL40_X + 40, 790, 600, 120, ['节拍对齐指标', '尚未达到宪章目标'], size=S_BODY - 2, alpha=A_SUB, lh=1.6)
    return s


def p_sparkler(d, I):
    s = d.slide('03 · 实践成果 · 技术案例', '仙女棒：13 类火星合成一张序列')
    card(s, L, 214, 518, 742, key=True)
    text(s, 140, 244, 450, 130, '13→1', size=112, color=ACC, bold=True, lh=1.0)
    text(s, 140, 372, 430, 80, ['每平台 1 张 64 帧主序列', '+ 1 个发射器'], size=S_SMALL + 2, alpha=A_SUB, lh=1.5)
    placeholder(s, 140, 470, 432, 243, 'UE 实录位', '讲者补充；来不及可删除')
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
    text(s, gx + 4, 604, cell - 8, 30, '13 合 1 · 示意', size=S_SMALL - 4, color=ACC, bold=True, align='c', lh=1.2)
    text(s, rx, 662, rw, 36, '合成后的 64 帧主序列（按帧展开）· 导出贴图，UE 观感待验收', size=S_SMALL, alpha=A_SUB, bold=True, lh=1.3)
    image(s, I['p14c'], rx, 704, rw, 252)
    return s


def p_trail(d, I):
    s = d.slide('03 · 实践成果 · 技术案例', '升空尾缀：近段与远段拆分，按屏幕位移分配帧数')
    card(s, L, 214, 518, 742, key=True)
    y = 244
    for h, b in [('近段', '循环面片随弹体移动，\v表现新喷出的火星'), ('远段', '一次性序列，表现留在\v空中的老火星')]:
        text(s, 140, y, 420, 44, h, size=S_CARD + 2, color=ACC, bold=True, lh=1.3)
        text(s, 140, y + 48, 430, 80, b, size=S_SMALL + 1, alpha=A_SUB, lh=1.5)
        y += 150
    text(s, 140, 548, 430, 30, '按火星年龄拆分，非相机远近', size=S_SMALL - 2, alpha=A_NOTE, lh=1.3)
    rect(s, 140, 600, 420, 1, fill=TXT, fill_alpha=0.12)
    text(s, 140, 628, 430, 40, 'Δp = ∫ v(t) dt × 每米像素', size=S_BODY, bold=True, lh=1.3)
    text(s, 140, 676, 430, 70, ['按 800 m、1080p 换算每帧屏幕位移，', '快的阶段多给帧'], size=S_SMALL, alpha=A_SUB, lh=1.5)
    text(s, 140, 770, 430, 90, [[{'t': '1.9 → 30', 'size': 64, 'bold': True, 'color': ACC}, {'t': ' fps', 'size': S_SMALL, 'alpha': A_SUB}]], lh=1.0)
    text(s, 140, 856, 430, 70, ['L 档远段上升段最慢帧率；', '代价：近看略软'], size=S_SMALL - 2, alpha=A_NOTE, lh=1.5)
    rx = 662
    gw, gh = 220, 462
    for i, (k, c) in enumerate([('p15near', '近段 · 循环'), ('p15far', '远段 · 一次性')]):
        x = rx + i * (gw + 24)
        rect(s, x, 214, gw, gh, fill=BG, line='F5F5F5', line_alpha=A_STROKE)
        gif(s, I[k], x, 214, gw, gh)
        text(s, x, 684, gw, 32, c, size=S_SMALL, bold=True, align='c', lh=1.3)
    caption(s, rx, 724, 2 * gw + 24, '导出贴图回放 · 历史包分段', size=S_SMALL - 4)
    ux = rx + 2 * (gw + 24) + 12
    uw = R - ux
    image(s, I['p15ue'], ux, 214, uw, gh, tag='UE 实机')
    caption(s, ux, 684, uw, '近段与远段在 UE 中合成的完整尾缀', size=S_SMALL - 2)
    text(s, rx, 780, R - rx, 120, ['PC 主档：近段 + 远段 2 个发射器；小档与手游：1 个全段发射器', '尾缀按开花高度分 6 档（S、M、L、Hero 及两档小尾缀）'],
         size=S_SMALL, alpha=A_SUB, lh=1.7)
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
    caption(s, x, 740, w, '机制复现（模拟，非 UE）：左 末格为黑的 Ramp 出现黑点；右 末格不黑则没有')
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
    s = d.slide(footer=False, transition=True)
    image(s, I['thank'], 0, 0, 1920, 1080)
    source_tag(s, 0, 0, 1920, 1080, 'UE 实机', pos='br')
    text(s, 0, 500, 1920, 150, 'THANK YOU', size=150, bold=True, align='c', lh=1.0)
    rect(s, 912, 668, 96, 6, fill=ACC)
    page_footer(s, d.footer)
    return s


PAGES = [p_cover, p_scale, p_delivery_problem, p_choreo_problem, p_baker, p_export, p_import, p_choreo_rules,
         p_workbench, p_summary, p_resources, p_import_result, p_choreo_result, p_sparkler, p_trail, p_bugs, p_demo,
         p_method, p_thanks]

# ---------------------------------------------------------------- 台词与依据
NOTES = {
    'p_cover': ('封面', '大家好，我是____。今天分享这一个多月制作跨年烟花秀的过程。效果制作、资源交付和节目编排三个环节，我都借助 AI 开发了工具。内容分为制作与挑战、解决思路、实践成果、分享与方法四部分。', ''),
    'p_scale': ('制作规模', '先看规模。图中是今年节目的 UE 实机画面。去年只有 3 种烟花、1 条升空尾缀，节目约 70 秒；今年开花种类增加到 26 种，扇形也在其中，升空尾缀按开花高度分为 6 档，节目约 220 秒，约为去年的 3 倍。PC 与手游还要分别输出，各分画质档位。',
                '去年 3 种、1 条尾缀、约 70 秒 = 讲者口述（10-30 01:42、11:07）；编排工作台资源快照（tool/workbench/public/data/resource-catalogue.json，10-09）中「新年烟花2.0」有 1 行拖尾、开花为小/中/大 × 红/黄/白 9 行另加大金。今年 26 种、6 档、219.5 秒：第二版核验 verify_A1_A2 §1、B11 修订 3。'),
    'p_delivery_problem': ('资源交付的重复工作', '规模扩大后，最先暴露的是资源交付中的重复工作。导出时，每种烟花都要确定取景、帧数、格子、打包、Ramp 与 Cutout，并分别输出两个平台；导入时，每个资源又有十余项引擎设置。原来这些都靠人工逐个完成，效果一调整就要重做；漏设一项，就会出现贴图常驻内存、星头方块或最亮处黑块等问题。',
                           '12 项设置沿用第一版第 3 页（烟花贴图规范与性能组约定、烟花特效资产规范）；项目规则 §2。'),
    'p_choreo_problem': ('编排的挑战', '第三个挑战是编排。去年在定序器中手工拼接，共 12 条子序列、两千七百多条轨道，调整一处节奏需要逐条对齐，也无法直观预览整体构图，各画质档还要分别维护；性能组也反馈内存占用偏高。今年节目约 220 秒、24 个发射点位，PC 与手游各分 3 档画质，节奏还要随音乐反复调整，手工排轨的修改成本过高。',
                         '12 子序列、2726 轨道：UE 只读统计（10-29，第二版核验 A3）；内存偏高 = 性能组口述反馈，无数字。'),
    'p_baker': ('烟花烘焙器', '针对制作规模，我让 AI 开发了烟花烘焙器。此前用 AI 脚本驱动 Blender 出图，可以输出，但每轮都要等待渲染，预览也与输出不一致。烘焙器只输出游戏视角所需的序列，内置单层花型模板和多层模板：选择模板、调整参数，就能得到新效果，保存后进入效果库，继续派生和复用。',
                '模板数量来自 analysis/results/NF4/缩略图/缩略图.json（4.9.18 统计：花型模板 27、多层模板 30、效果条目 36），之后版本有增减。'),
    'p_export': ('导出规范', '资源交付的问题分导出和导入两步解决。右上角是导出贴图与它的回放。导出规范首先是取景：固定框为默认，随开花放大让开花初期获得更多像素，锚在爆点适合单侧花型；扇形测试中，内容占面片的比例由约两成提高到约四成。之后自动排格打包，一张贴图容纳 64 帧，灰度存储、Ramp 查色，按收益生成 Cutout，PC 与手游同时导出，交付前在引擎回放中复核。',
                 'tool/CHANGELOG.md 4.9.33、4.9.81（FC6O 取景计划估算 0.20 / 0.21 / 0.41）；spec/cascade_params_v1.md §7、§10；本机 T26 统计正式资源 17 组：固定 10、随开花放大 5、锚点 2。'),
    'p_import': ('导入规范', '导入由导入器完成，设计参考了原有特效工作台的配表入口。导入器读取素材包，先检查命名、尺寸与规范项，再按平台创建贴图、材质实例和发射器，确认后写入 UE 并读回核对。与性能组确定的贴图规范，以及包围盒、朝向、EmissiveDissolve 等设置，都内置于工具，不再依赖人工记忆。',
                 '项目规则 §2 烟花贴图规范（v2.31）；spec/workspace_resource_v1.md（检查不写 UE，确认后写入）；截图为特效工作台烟花素材导入页（10-24）。'),
    'p_choreo_rules': ('编排推演', '编排先推演规则。舞台为宽约 800 米、高约 150 米的坝体，按约 100 米点距布置主发射点，共 24 个点位。花径约为点距 1.5 倍时可以分辨单花，2 倍以上形成花墙，3 倍左右容易糊成一片。据此把花型分为 S、M、L 和主角四档，确定开花高度，再用极限帧检查同一时刻各档最大展开时的重叠。这些规则写入编排宪章，每版编排自动检查；设计值与实机不同时，以实机校正。',
                       '对话框22；协作/跨年秀编排宪章.md；第二版重制第 7 页；极限帧示意按用户 11:07 提供的设计图、以编排宪章设计值重绘，配色取自烟花编排工作台设计令牌。「极限帧」在仓库中无同名记录，此处按设计图含义理解为同一时刻各档最大展开。'),
    'p_workbench': ('烟花编排工作台', '规则通过编排工作台落地。上方是时间轴播放时的舞台预览。资源表中的效果是基础模板；组合尺寸、高度和尾缀后成为花型模板；花型模板放上时间轴形成编排片段，常用组合可以存为编排模板。片段按音乐划分段落，可以按段调整节奏和构图，最后一键生成导演表并导入 UE。编排过程可视化，检查和输出程序化，修改节奏只需重新出表。',
                    '截图为云端打开 tool/烟花编排工作台.html（16.0.42，节目 B11 修订 3）：基础模板 33、花型模板 97、编排片段 492。'),
    'p_summary': ('解决思路汇总', '汇总起来，三个问题对应三个工具：烘焙器解决制作规模，导入器解决资源交付，编排工作台解决编排，工具之间以固定格式衔接。目标、审美与引擎约束由我确定，工具由 AI 开发，关键结果在 UE 中验收；导演蓝图与程序共同设计，贴图规范与性能组共同确定。',
                  '约 2200 次提交：第二版核验 verify_A1_A2 §1（含约 350 次显卡后台自动回传）。'),
    'p_resources': ('资源成果', '下面看成果。资源方面，进入跨年 3.0 资源表的有球花与扇形共 26 种、升空尾缀 6 档、窜天猴一套；手游覆盖其中 12 种开花、全部尾缀和窜天猴。引用贴图去重共 212 张，其中 PC 专用 133 张、手游专用 33 张、两端共用 46 张。26 种开花中，19 种保留了烘焙器配方与导出记录，可以调参后重新导出。',
                    'verify_A1_A2 §1、§6；第三版素材/资源分类.md。20 种为找到烘焙器导出材料（19 种有配方与导出记录）。'),
    'p_import_result': ('接入成果', '接入方面进行过两轮批量修正。贴图规范确定后，149 张贴图批量重设：手游主序列 86 张、PC 主序列 40 张、Ramp 23 张，NeverStream 全部关闭、贴图组统一为 DistantVFX，读回一致。更早一轮修正了 115 个包，包括 67 个材质实例的 EmissiveDissolve、47 个粒子系统的固定包围盒，以及发射器的朝向与 UV 翻转，读回无错误。这些规则已经内置于导入器，新资源导入时自动执行。',
                        'analysis/results/TEX_SPEC_20261018/verify.json（149 行读回，按路径分类：手游 86、PC 40、Ramp 23）；资源规范统一_20261016/说明.md（115 包 = 48 粒子系统 + 67 材质实例）。PC 主序列 NoMip 规则在 10-18 下午另行确定，不在这批读回内。'),
    'p_choreo_result': ('编排成果', '编排方面，共迭代 11 个大版本，每版都有自动检查记录。同一编排按平台和画质分档输出：PC 高配一场 1145 次播放、中配 852、低配 438；手游 448、349、181，无需逐档编排。目前节拍对齐指标尚未达到宪章目标，仍在优化。',
                        'B11 修订 3 编排检查（PC 1145 / 852 / 438，手游 448 / 349 / 181）；截图为云端打开离线工作台切换档位。节拍对齐尚未达到宪章目标。'),
    'p_sparkler': ('仙女棒', '接下来是两个技术案例。第一个是仙女棒，火星有一级、二级分叉，也有清晰与模糊的层次。以往类似效果，比如现有的窜天猴拖尾，用了 10 个发射器拼合。这次 13 类火星的结构来自我之前的 Blender 工程，AI 将其移植为通用的母子分叉，在烘焙时合成为一张 64 帧序列，每个平台只需一个发射器。',
                   'verify_A4；动图由导出的 64 帧主序列按顺序播放，Ramp 着色为示意；UE 实录由讲者补。'),
    'p_trail': ('升空尾缀', '第二个是升空尾缀。左边两段动图是导出贴图的回放：近段为循环面片，随弹体移动；远段为一次性序列，表现留在空中的老火星；右边是两段在 UE 中合成后的完整尾缀。帧数按观看距离换算每帧屏幕位移后分配，快的阶段多给帧、慢的阶段少给，L 档远段上升段的最慢帧率由约 1.9 提高到 30。代价是单格高度降低，近看略软。',
                 '第二版重制第 13、19 页；tool/src/js/31_plan40.js；tool/CHANGELOG.md 4.9.26、4.9.31；0.77 像素为本项目经验线。'),
    'p_bugs': ('方头与黑点', '排查方面，方头和最亮处黑块是两个典型问题。方头只在低配出现：长条格压扁后采样到低 Mip，星头变方；固定机位与档位对比后定位，PC 主序列改为不使用 Mip。黑块出现在最亮处，看上去是一个个黑点：亮度采样落到 Ramp 末格的黑色，设置 EmissiveDissolve 为 0.98 后解决。两项规则都已写入导出与导入流程。',
               'analysis/results/LOWQ_FIX_20261018；analysis/probe/BC7护栏黑块_2026-10-15（机制复现为模拟）；0.98 修法有用户确认（对话框23）。'),
    'p_demo': ('流程演示', '最后用一段录屏演示完整流程：选择模板调参，在引擎回放中复核，同时导出 PC 与手游，经导入器写入 UE，再在编排工作台中排入节目。（播放录屏，约 2 分钟）录屏经过剪辑，实际用时 ×× 分钟。', '录屏由讲者提供。'),
    'p_method': ('工作方法', '最后是这一个多月的心得：批量需求可以分三个阶段与 AI 协作。第一，明确需求：定义目标、约束和验收标准，由 AI 梳理所需技术，选择最简可行方案。第二，建立规范：按效果、工具和编排拆分任务，把参数、交互和编排规则写成宪章，每次执行前先读规范与交接。第三，结果把关：先自动检查，再在 UE 验收，执行、自检与验收分开记录，通过的版本锁定复用。工具包我会放在 xx 处，建议从一项重复性工作开始尝试。', ''),
    'p_thanks': ('Thank You', '谢谢大家。', ''),
}


def main():
    I = build_images()
    d = Deck(FOOTER)
    md = ['# 讲稿：烟花秀 AI 全流程 · 第四版（组内分享 2026-10-30）', '',
          '> 由 build_v4.py 生成，与 PPT 每页备注一致。时长按每分钟约 250 字估。', '']
    total = 0
    for i, fn in enumerate(PAGES, 1):
        s = fn(d, I)
        name, nar, basis = NOTES[fn.__name__]
        st = [sh for sh in s.shapes if sh.name == 'title']
        stitle = st[0].text_frame.text if st else name
        sec = max(5, int(round(len(nar) / 250 * 60 / 5.0) * 5)) + (120 if fn.__name__ == 'p_demo' else 0)
        head = f'第 {i} 页 · {stitle}（约 {sec} 秒）'
        notes(s, head + '\n\n' + nar + ('\n\n依据：' + basis if basis else ''))
        total += len(nar)
        md += [f'## {head}', '', nar, '', f'（{len(nar)} 字）' + (f'　依据：{basis}' if basis else ''), '']
    md.insert(3, f'全文约 {total} 字，按每分钟 250 字约 {total / 250:.1f} 分钟，另加录屏约 2 分钟；以试讲为准。')
    d.save(OUT, title='烟花秀 AI 全流程', subject='VFX 组内分享 · 2026-10-30')
    with open(SCRIPT_MD, 'w', encoding='utf-8') as f:
        f.write('\n'.join(md))
    print('saved', OUT, 'chars', total)


if __name__ == '__main__':
    main()
