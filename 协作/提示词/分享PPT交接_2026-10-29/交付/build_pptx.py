# -*- coding: utf-8 -*-
"""生成分享 PPT：烟花秀 AI 全流程（组内分享，2026-10-30）。

用法（仓库根目录）：python -X utf8 "协作/提示词/分享PPT交接_2026-10-29/交付/build_pptx.py"
输出：同目录 烟花秀AI全流程_组内分享.pptx、讲稿.md；配图处理结果在 img/。
页面文字、数字在 p01–p15 各函数里改，台词在 台词.py；数字出处见 采访记录与需求梳理.md 第四节。
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from pptkit import *  # noqa: E402,F401,F403

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
SUCAI = os.path.join(HERE, '..', '素材')
UECAP = os.path.join(ROOT, 'analysis', 'local', '20261029_分享PPT-本机_UE截图')
LOCAL = os.path.join(ROOT, 'analysis', 'local')
IMG = os.path.join(HERE, 'img')
OUT = os.path.join(HERE, '烟花秀AI全流程_组内分享.pptx')
SCRIPT_MD = os.path.join(HERE, '讲稿.md')
FOOTER = '三角洲行动 VFX · 烟花工具链与工作方法'
os.makedirs(IMG, exist_ok=True)


# ---------------------------------------------------------------- 配图处理
def _src(name):
    for base in (SUCAI, UECAP, LOCAL):
        p = os.path.join(base, name)
        if os.path.exists(p):
            return p
    raise FileNotFoundError(name)


def prep(name, out, w, h, mode='cover', focus=(0.5, 0.5), box=None, feather=0, scale=1.5, pad=0.0,
         recolor_yellow=False, darken=None, fix_black=False):
    """把原图处理成 w×h（设计像素）的成图。cover：按焦点裁满；contain：等比放进黑底并可羽化边缘。
    box=(l,t,r,b) 先按像素框裁一刀。输出 1.5 倍像素，JPEG。"""
    im = Image.open(_src(name)).convert('RGB')
    if box:
        im = im.crop(box)
    if recolor_yellow:
        px = im.load()
        for yy in range(im.height):
            for xx in range(im.width):
                r, g, b = px[xx, yy]
                if r > 200 and g > 170 and b < 90 and (r - b) > 140 and abs(r - g) < 70:
                    px[xx, yy] = (15, 247, 150)
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
        ox, oy = (W - im2.width) // 2, (H - im2.height) // 2
        if feather:
            f = int(feather * scale)
            mask = Image.new('L', im2.size, 0)
            ImageDraw.Draw(mask).rectangle((f, f, im2.width - f, im2.height - f), fill=255)
            mask = mask.filter(ImageFilter.GaussianBlur(f / 2))
            canvas.paste(im2, (ox, oy), mask)
        else:
            canvas.paste(im2, (ox, oy))
        im = canvas
    if darken:
        im = darken(im)
    p = os.path.join(IMG, out)
    im.save(p, quality=90, optimize=True)
    return p


def _fix_black(im):
    """把近黑底色（取四边中位数）压到 #0A0A0A，亮部不变，避免小图在黑底上露出方框。"""
    import statistics
    px = im.load()
    W, H = im.size
    edge = [px[x, y] for x in range(0, W, 3) for y in (0, 1, H - 2, H - 1)] +            [px[x, y] for y in range(0, H, 3) for x in (0, 1, W - 2, W - 1)]
    bg = [sorted(c[i] for c in edge)[int(len(edge) * 0.8)] for i in range(3)]
    lut = []
    for i in range(3):
        b = bg[i]
        k = 245.0 / max(1.0, 255.0 - b)
        lut += [int(min(255, max(0, round(10 + (v - b) * k)))) if v > b else 10 for v in range(256)]
    return im.point(lut)


def left_scrim(start=0.94, end_x=0.62, bottom=0.0):
    """封面：左侧压暗到接近 #0A0A0A，便于叠字。"""
    def f(im):
        W, H = im.size
        ov = Image.new('RGB', (W, H), (10, 10, 10))
        mask = Image.new('L', (W, H), 0)
        px = mask.load()
        x0 = W * 0.30
        for x in range(W):
            if x <= x0:
                a = start
            elif x < W * end_x:
                t = (x - x0) / (W * end_x - x0)
                a = start * (1 - (3 * t * t - 2 * t * t * t))
            else:
                a = 0.0
            for y in range(H):
                b = 0.0
                if bottom and x < W * 0.75:
                    ty = (y - H * 0.66) / (H * 0.34)
                    b = bottom * min(max(ty, 0), 1) * min(1.0, (W * 0.75 - x) / (W * 0.25))
                px[x, y] = int(255 * min(1.0, max(a, b)))
        return Image.composite(ov, im, mask)
    return f


def build_images():
    codex = [n for n in ('00_封面_A.jpg', '00_封面_A.png') if os.path.exists(os.path.join(SUCAI, n))]
    cover_src = codex[0] if codex else '01_封面_UE跨年秀.jpg'
    I = {'cover_is_codex': bool(codex)}
    I['cover'] = prep(cover_src, 'p01_cover.jpg', 1920, 1080, focus=(0.5, 0.5), scale=1.0,
                      darken=None if codex else left_scrim(0.93, 0.66, bottom=0.62))
    I['p02'] = prep('02_UE跨年秀_彩色全景.jpg', 'p02_show.jpg', 672, 770, box=(700, 150, 1600, 900),
                    focus=(0.5, 0.5))
    I['p04a'] = prep('07_分叉_仙女棒局部.jpg', 'p04_fork.jpg', 542, 458, mode='contain', feather=24, pad=0.02,
                     fix_black=True)
    I['p04b'] = prep('08_成簇_尾焰局部.jpg', 'p04_cluster.jpg', 542, 458, mode='contain', feather=14, pad=0.02,
                     fix_black=True)
    I['p04c'] = prep('09_爆发_尾焰0.23秒与0.40秒.jpg', 'p04_burst.jpg', 542, 458, mode='contain', feather=20,
                     pad=0.02, fix_black=True)
    I['p05'] = prep('ue_sequencer_S1_open.png', 'p05_sequencer.jpg', 1008, 740, box=(0, 96, 2560, 1975),
                    focus=(0.5, 0.5))
    I['p06a'] = prep('05_烘焙器界面_仙女棒.jpg', 'p06_baker.jpg', 358, 202, focus=(0.5, 0.45))
    I['p06b'] = prep('IMPORT5_THEME_20261024_after_1920.png', 'p06_importer.jpg', 358, 202, focus=(0.5, 0.42))
    I['p06c'] = prep('04_编排工作台界面.jpg', 'p06_workbench.jpg', 358, 202, focus=(0.5, 0.55))
    I['p06d'] = prep('03_UE跨年秀_金色扇面.jpg', 'p06_ue.jpg', 358, 202, focus=(0.55, 0.4))
    I['p08a'] = prep('03_UE跨年秀_金色扇面.jpg', 'p08_ue.jpg', 1008, 430, focus=(0.5, 0.42))
    I['p08row'] = tile_row(['19_金芒爆裂菊.jpg', '10_仙女棒_引擎回放.jpg', '12_窜天猴尾焰_引擎回放全身.jpg',
                            '20_小青柠.jpg'], 'p08_row.jpg')
    I['p09'] = prep('IMPORT5_120_recovered.png', 'p09_importer.jpg', 672, 420, focus=(0.5, 0.42))
    I['p10'] = prep('04_编排工作台界面.jpg', 'p10_workbench.jpg', 1728, 440, focus=(0.5, 0.46))
    I['p11'] = prep('06_烘焙器界面_引擎回放.jpg', 'p11_replay.jpg', 1200, 675, focus=(0.5, 0.5))
    I['p12a'] = prep('21_bug_星头方块_UE实机.jpg', 'p12_square.jpg', 324, 324, focus=(0.45, 0.45),
                     recolor_yellow=True)
    I['p12b'] = prep('22_bug_最亮处黑块_示意图.png', 'p12_black.jpg', 324, 324)
    I['p13a'] = prep('10_仙女棒_引擎回放.jpg', 'p13_sparkler.jpg', 300, 300, mode='contain', feather=12,
                     fix_black=True)
    I['p13b'] = prep('15_升空尾缀_实拍模拟导出对照.jpg', 'p13_trail.jpg', 480, 296, focus=(0.5, 0.5))
    return I


def tile_row(names, out, w=1008, h=240, scale=1.5):
    """几张黑底效果图拼成一张：每格等宽，椭圆羽化融进 #0A0A0A，一张图只需一个来源标注。"""
    W, H = int(w * scale), int(h * scale)
    canvas = Image.new('RGB', (W, H), (10, 10, 10))
    cw = W // len(names)
    for i, n in enumerate(names):
        im = _fix_black(Image.open(_src(n)).convert('RGB'))
        r = min((cw * 0.96) / im.width, (H * 0.96) / im.height)
        im = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
        mask = Image.new('L', im.size, 0)
        mx, my = im.width * 0.10, im.height * 0.10
        ImageDraw.Draw(mask).ellipse((mx, my, im.width - mx, im.height - my), fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(min(im.size) * 0.08))
        canvas.paste(im, (i * cw + (cw - im.width) // 2, (H - im.height) // 2), mask)
    p = os.path.join(IMG, out)
    canvas.save(p, quality=90, optimize=True)
    return p


# ---------------------------------------------------------------- 每日提交（P07 小图）
DAILY = [('09-27', 13), ('09-28', 26), ('09-29', 29), ('09-30', 99), ('10-01', 101), ('10-02', 156),
         ('10-03', 98), ('10-04', 93), ('10-05', 96), ('10-06', 116), ('10-07', 240), ('10-08', 173),
         ('10-09', 58), ('10-10', 121), ('10-11', 37), ('10-12', 47), ('10-13', 109), ('10-14', 115),
         ('10-15', 78), ('10-16', 104), ('10-17', 59), ('10-18', 44), ('10-19', 40), ('10-20', 12),
         ('10-21', 1), ('10-22', 46), ('10-23', 21), ('10-24', 9), ('10-25', 31), ('10-26', 0),
         ('10-27', 9), ('10-28', 12), ('10-29', 15)]


def daily_bars(s, x, y, w, h):
    """单系列柱条：灰白柱，峰值一天用强调色；只标峰值和首末日期。"""
    n = len(DAILY)
    slot = w / n
    bw = min(24, slot * 0.56)
    peak = max(v for _, v in DAILY)
    base = y + h
    rect(s, x, base, w, 1, fill=TXT, fill_alpha=0.15)
    for i, (d, v) in enumerate(DAILY):
        if v == 0:
            continue
        bh = max(2, h * v / peak)
        bx = x + i * slot + (slot - bw) / 2
        hot = v == peak
        rect(s, bx, base - bh, bw, bh, fill=ACC if hot else TXT, fill_alpha=None if hot else 0.30)
        if hot:
            text(s, bx + bw / 2 - 130, base - bh - 40, 260, 34, f'{v} 次 · {d}', size=S_SMALL, alpha=A_SUB,
                 align='c', lh=1.2)
    for i in (0, n - 1):
        d = DAILY[i][0]
        cx = x + i * slot + slot / 2
        text(s, cx - 60, base + 8, 120, 32, d, size=S_SMALL, alpha=A_NOTE, align='c', lh=1.2)


# ---------------------------------------------------------------- 页面
def p01(d, I):
    s = d.slide(transition=True)
    image(s, I['cover'], 0, 0, 1920, 1080)
    source_tag(s, 0, 0, 1920, 1080, '示意图' if I['cover_is_codex'] else 'UE 实机', pos='br')
    page_footer(s, d.footer)
    text(s, L, 300, 1100, 36, 'VFX 组内分享 · 2026.10.30', size=S_LABEL, color=ACC, bold=True, spc=4, lh=1.3)
    text(s, L, 352, 1300, 140, '烟花秀 AI 全流程', size=112, bold=True, lh=1.15)
    text(s, L, 510, 1100, 56, '烟花烘焙器 · 导入器 · 烟花编排工作台', size=36, alpha=0.86, lh=1.3)
    text(s, L, 568, 1100, 44, '一个多月，从做效果、进引擎到排节目', size=28, alpha=A_NOTE, lh=1.4)
    end_bar(s, L, 650, 72)
    rect(s, L, 812, 860, 1, fill=TXT, fill_alpha=0.12)
    items = [('01', '问题'), ('02', '解决思路'), ('03', '解决了什么'), ('04', '学到的'), ('05', '分享')]
    x = L
    for num, name in items:
        wname = 28 * len(name)
        text(s, x, 838, 40, 40, num, size=28, color=ACC, bold=True, lh=1.3)
        text(s, x + 46, 838, wname + 10, 40, name, size=28, alpha=A_SUB, lh=1.3)
        x += 46 + wname + 48
    return s


def p02(d, I):
    s = d.slide('01 · 问题', '资产量：44 个效果，PC 与手游两套')
    rows = [('95', '粒子系统', 'PC 44 · 手游 51'),
            ('212', '贴图', 'PC 133 · 手游 33 · 两端共用 46'),
            ('115', '材质实例', '只用项目已有的母材质')]
    y = 214
    for num, name, sub in rows:
        text(s, L, y, 330, 150, num, size=128, color=ACC, bold=True, lh=1.0)
        text(s, 380, y + 26, 700, 50, name, size=S_CARD + 2, bold=True, lh=1.3)
        text(s, 380, y + 80, 700, 40, sub, size=S_BODY - 2, alpha=A_SUB, lh=1.4)
        y += 178
    text(s, L, 760, 1000, 100, '每个效果 PC 与手游各做一套，制作、导出、导入、设置都要逐个完成。',
         size=S_BODY, alpha=0.86, lh=1.6)
    text(s, L, 868, 1000, 40, '统计范围：ResourcesFX 表「烟花 3.0」各行，UE 读取，10-28', size=S_SMALL,
         alpha=A_FOOT, lh=1.4)
    image(s, I['p02'], COL40_X, 210, COL40_W, 770, tag='UE 实机')
    return s


def p03(d, I):
    s = d.slide('01 · 问题', '设置：每个资产按规范逐项设置')
    card(s, L, 210, 518, 770, key=True)
    text(s, 140, 240, 440, 220, '12', size=200, color=ACC, bold=True, lh=1.0)
    text(s, 140, 490, 440, 50, '项关键设置', size=36, bold=True, lh=1.3)
    text(s, 140, 560, 420, 120, ['贴图 7 项', '粒子系统、发射器、材质实例 5 项'], size=S_BODY - 2, alpha=A_SUB,
         lh=1.6)
    text(s, 140, 860, 420, 100, ['依据：烟花贴图规范（与性能组约定）、', '烟花特效资产规范'], size=S_SMALL,
         alpha=A_FOOT, lh=1.5)
    rx, rw = 662, 1162
    colw = (rw - 2 * 20) / 3

    def grid(items, y0, start):
        for i, t in enumerate(items):
            cx = rx + (i % 3) * (colw + 20)
            cy = y0 + (i // 3) * 76
            rect(s, cx, cy, colw, 64, fill=CARD, line='F5F5F5', line_alpha=A_STROKE)
            text(s, cx + 20, cy, 50, 64, f'{start + i:02d}', size=S_SMALL, color=ACC, bold=True, anchor='m',
                 lh=1.2)
            text(s, cx + 62, cy, colw - 70, 64, t, size=S_SMALL if len(t) > 16 else S_SMALL + 2, anchor='m',
                 lh=1.25)

    text(s, rx, 214, rw, 44, '贴图 · 7 项', size=S_CARD - 2, bold=True, lh=1.3)
    grid(['不勾 NeverStream', '贴图组 DistantVFX', 'PC 主序列不要 Mip', '手游主序列带 Mip', '手游最大 1024',
          '手游压缩 ASTC', 'Ramp：Clamp、不要 Mip'], 270, 1)
    text(s, rx, 520, rw, 44, '粒子系统 · 发射器 · 材质实例 · 5 项', size=S_CARD - 2, bold=True, lh=1.3)
    grid(['固定包围盒', '面片朝向', 'UV 翻转方式', 'EmissiveDissolve 0.98', 'LOD 方式'], 576, 8)
    text(s, rx, 770, rw, 40, '以前每个资产都要手动走一遍', size=S_SMALL, alpha=A_NOTE, lh=1.4)
    steps = ['导出 PC、手游', '合入', 'UE 里创建', '逐项设置', '检查']
    sw, gap = 196, 46
    x = rx
    for i, t in enumerate(steps):
        rect(s, x, 820, sw, 64, fill=ACC, fill_alpha=0.08, line=ACC, line_alpha=A_GREEN_LINE)
        text(s, x, 820, sw, 64, t, size=S_SMALL, color=TXT, align='c', anchor='m', lh=1.2)
        if i < len(steps) - 1:
            line(s, x + sw + 6, 852, x + sw + gap - 6, 852, alpha=0.7, w=2, arrow=True)
        x += sw + gap
    text(s, rx, 904, rw, 40, '漏设一项：贴图常驻内存、星头方块、最亮处黑块', size=S_SMALL, alpha=A_NOTE,
         lh=1.4)
    return s


def p04(d, I):
    s = d.slide('01 · 问题', '复杂火星：Cascade 原生难以实现')
    cards = [(I['p04a'], '分叉', ['火星在飞行中逐级碎裂，', 'Cascade 只能靠事件逐颗生成子粒子。']),
             (I['p04b'], '成簇', ['每束火星的张角和数量都不同，', 'Cascade 只有球、锥、盒子出生分布。']),
             (I['p04c'], '爆发', ['零点几秒内喷出后急减速，', 'Cascade 只有线性阻力，弧线对不上。'])]
    for i, (img, t, desc) in enumerate(cards):
        x = L + i * (544 + 48)
        card(s, x, 214, 544, 742)
        image(s, img, x + 1, 215, 542, 458, tag='引擎回放', tag_pos='tl' if i == 2 else 'bl')
        if i == 2:
            text(s, x + 40, 626, 220, 34, '0.23 秒', size=S_SMALL, alpha=A_SUB, align='c', lh=1.2)
            text(s, x + 284, 626, 220, 34, '0.40 秒', size=S_SMALL, alpha=A_SUB, align='c', lh=1.2)
        text(s, x + 40, 700, 470, 50, t, size=34, bold=True, lh=1.3)
        text(s, x + 40, 764, 480, 100, desc, size=S_BODY - 2, alpha=A_SUB, lh=1.6)
        end_bar(s, x + 40, 900)
    return s


def p05(d, I):
    s = d.slide('01 · 问题', '编排：靠定序器逐条拼，轨道太多')
    image(s, I['p05'], L, 214, COL60_W, 740, tag='UE 编辑器 · 旧方案定序器')
    x = COL40_X
    text(s, x, 214, COL40_W, 36, '旧方案 · 定序器', size=S_LABEL, color=ACC, bold=True, spc=4, lh=1.3)
    text(s, x, 252, COL40_W, 130, [[{'t': '2726', 'size': 112, 'color': ACC, 'bold': True},
                                     {'t': ' 条轨道', 'size': 30, 'bold': True}]], lh=1.05)
    text(s, x, 384, COL40_W, 140, ['A、B、S 三条主序列，各约 70 秒', '共 12 条子序列、1080 个绑定',
                                    '性能组测试：PC 与手游内存占用都过高'], size=S_BODY - 2, alpha=A_SUB, lh=1.6)
    text(s, x, 520, COL40_W, 36, 'UE 只读统计 · 10-29', size=S_SMALL, alpha=A_FOOT, lh=1.4)
    rect(s, x, 578, COL40_W, 1, fill=TXT, fill_alpha=0.12)
    text(s, x, 604, COL40_W, 36, '这次的节目', size=S_LABEL, color=ACC, bold=True, spc=4, lh=1.3)
    text(s, x, 642, COL40_W, 130, [[{'t': '1570', 'size': 112, 'bold': True},
                                     {'t': ' 次播放', 'size': 30, 'bold': True}]], lh=1.05)
    text(s, x, 774, COL40_W, 100, ['219.5 秒：492 段、24 个点位', '照旧方案拼：人工编排困难，性能也过不了'],
         size=S_BODY - 2, alpha=A_SUB, lh=1.6)
    text(s, x, 870, COL40_W, 36, '编排 B11 修订 3', size=S_SMALL, alpha=A_FOOT, lh=1.4)
    return s


def p06(d, I):
    s = d.slide('02 · 解决思路', '思路：拆成三段，每段一个工具')
    nodes = [(I['p06a'], '01 做效果', '烟花烘焙器', ['模拟火星，烘焙序列贴图，', '一次导出 PC 与手游两套']),
             (I['p06b'], '02 进引擎', '导入器', ['读取素材包，按规范设置，', '检查后写入 UE']),
             (I['p06c'], '03 排节目', '烟花编排工作台', ['按音乐时间线排布烟花，', '生成导演表']),
             (I['p06d'], '04 播放', 'UE 导演蓝图', ['一个蓝图按子模板、模板、', '时序三张表播放'])]
    tags = ['工具界面', '工具界面', '工具界面', 'UE 实机']
    links = ['素材包', 'UE 资产', '导演表']
    cw, gap = 360, 96
    for i, (img, step, name, desc) in enumerate(nodes):
        x = L + i * (cw + gap)
        card(s, x, 214, cw, 476, key=(i < 3))
        image(s, img, x + 1, 215, cw - 2, 202, tag=tags[i])
        text(s, x + 32, 444, cw - 50, 36, step, size=S_LABEL, color=ACC, bold=True, spc=2, lh=1.3)
        text(s, x + 32, 486, cw - 40, 50, name, size=32, bold=True, lh=1.3)
        text(s, x + 32, 548, cw - 44, 120, desc, size=S_SMALL, alpha=A_SUB, lh=1.6)
        if i < 3:
            x1 = x + cw + 10
            line(s, x1, 316, x1 + gap - 20, 316, alpha=0.8, w=2, dash=True, arrow=True)
            text(s, x + cw, 328, gap, 34, links[i], size=S_SMALL, alpha=A_NOTE, align='c', lh=1.2)
    card(s, L, 730, COL60_W, 226, key=True)
    text(s, L + 40, 758, 920, 44, '三段之间用固定格式衔接', size=S_CARD, bold=True, lh=1.3)
    text(s, L + 40, 814, 920, 90, '素材包、导入记录、导演表都有固定格式；改了其中一处，可以整条链重跑。',
         size=S_BODY - 2, alpha=A_SUB, lh=1.6)
    end_bar(s, L + 40, 920)
    card(s, COL40_X, 730, COL40_W, 226)
    text(s, COL40_X + 40, 758, 600, 44, '导演蓝图与程序共同设计', size=S_CARD, bold=True, lh=1.3)
    text(s, COL40_X + 40, 814, 600, 90, '不再逐个 actor 排轨道；定序器只留给 4 盏灯。', size=S_BODY - 2,
         alpha=A_SUB, lh=1.6)
    return s


def p07(d, I):
    s = d.slide('02 · 解决思路', '协作：规则写成文档，每轮 UE 验收')
    nodes = [('01', '我', '定规则', ['目标、审美、引擎限制、', '验收标准写成文档']),
             ('02', 'AI', '实现', ['物理推导、写代码、出素材']),
             ('03', 'AI', '自检', ['标准检查 13 项、', '回放检查、合入门禁']),
             ('04', '工具', '引擎回放', ['按导出的贴图和', 'cascade.json 播放']),
             ('05', '我', 'UE 验收', ['发现的问题写回规则'])]
    step = W_CONTENT / 5
    cy = 300
    for i, (num, who, what, detail) in enumerate(nodes):
        cx = L + step * i + step / 2
        rect(s, cx - 60, cy - 60, 120, 120, fill=ACC, fill_alpha=0.06, line=ACC, line_w=3, shape=MSO_SHAPE.OVAL)
        text(s, cx - 60, cy - 60, 120, 120, num, size=40, color=ACC, bold=True, align='c', anchor='m', lh=1.1)
        text(s, cx - 160, cy + 80, 320, 34, who, size=S_SMALL, alpha=A_NOTE, align='c', lh=1.3)
        text(s, cx - 160, cy + 116, 320, 46, what, size=S_CARD, bold=True, align='c', lh=1.3)
        text(s, cx - 160, cy + 168, 320, 100, detail, size=S_SMALL, alpha=A_SUB, align='c', lh=1.5)
        if i < 4:
            line(s, cx + 72, cy, cx + step - 72, cy, alpha=0.8, w=2, dash=True, arrow=True)
    y_back = cy + 300
    x_first = L + step / 2
    x_last = L + step * 4 + step / 2
    line(s, x_last, cy + 270, x_last, y_back, alpha=0.5, w=2, dash=True)
    line(s, x_last, y_back, x_first, y_back, alpha=0.5, w=2, dash=True)
    line(s, x_first, y_back, x_first, cy + 272, alpha=0.5, w=2, dash=True, arrow=True)
    text(s, (x_first + x_last) / 2 - 200, y_back - 40, 400, 34, '进入下一轮', size=S_SMALL, alpha=A_NOTE,
         align='c', lh=1.2)
    text(s, L, 668, 900, 40, '每日提交 · 09-27 至 10-29', size=S_SMALL, alpha=A_SUB, bold=True, lh=1.4)
    text(s, 880, 668, 944, 40, '共约 2200 次 · 32 天有提交 · 本机显卡后台回传 352 次', size=S_SMALL,
         alpha=A_NOTE, align='r', lh=1.4)
    daily_bars(s, L, 740, W_CONTENT, 190)
    return s


def p08(d, I):
    s = d.slide('03 · 解决了什么', '效果：批量导出，铺进整场节目')
    image(s, I['p08a'], L, 214, COL60_W, 430, tag='UE 实机')
    image(s, I['p08row'], L, 670, COL60_W, 240, tag='引擎回放')
    for i, name in enumerate(['金芒爆裂菊', '仙女棒', '窜天猴尾焰', '小青柠']):
        text(s, L + i * COL60_W / 4, 918, COL60_W / 4, 36, name, size=S_SMALL, alpha=A_SUB, align='c', lh=1.3)
    x = COL40_X
    blocks = [('30/44', '3.0 表的效果里，序列贴图由烘焙器导出', '按主序列贴图名对照导出记录 · 10-28', ACC),
              ('24/29', '节目用到的效果里，出自烘焙器', '编排 B11 修订 3', TXT),
              ('38', '个效果导出过素材包，导出记录 454 份', '截至 10-29', TXT)]
    y = 214
    for num, cap, note, col in blocks:
        text(s, x, y, COL40_W, 100, num, size=84, color=col, bold=True, lh=1.05)
        text(s, x, y + 100, COL40_W, 44, cap, size=S_BODY - 2, lh=1.4)
        text(s, x, y + 144, COL40_W, 36, note, size=S_SMALL, alpha=A_FOOT, lh=1.4)
        y += 248
    return s


def p09(d, I):
    s = d.slide('03 · 解决了什么', '规范：写进工具，导入时自动设置')
    text(s, L, 214, 1000, 170, [[{'t': '149', 'size': 150, 'color': ACC, 'bold': True},
                                  {'t': '/149', 'size': 96, 'color': ACC, 'bold': True}]], lh=1.0)
    text(s, L, 392, 1000, 50, '张贴图按规范重设，读回全部一致', size=S_CARD + 2, bold=True, lh=1.3)
    text(s, L, 448, 1000, 80, '10-18 · 与其他项目共用的 19 张没有改，单独列出来确认', size=S_BODY - 2, alpha=A_SUB,
         lh=1.6)
    text(s, L, 556, 1000, 140, [[{'t': '115', 'size': 120, 'bold': True},
                                  {'t': ' 个包', 'size': 32, 'bold': True}]], lh=1.0)
    text(s, L, 698, 1000, 80, '10-16 批量修正：48 个粒子系统、67 个材质实例，读回无错误', size=S_BODY - 2,
         alpha=A_SUB, lh=1.6)
    rect(s, L, 790, 1008, 1, fill=TXT, fill_alpha=0.12)
    text(s, L, 816, 1008, 90, ['导入器 v2.3（10-01）→ v2.31（10-28）：手游目录与 ASTC、固定包围盒、',
                                'EmissiveDissolve、LOD 方式、按平台的 Mip，规范一条条加进去'], size=S_SMALL,
         alpha=A_NOTE, lh=1.6)
    image(s, I['p09'], COL40_X, 214, COL40_W, 420, tag='工具界面')
    card(s, COL40_X, 664, COL40_W, 290, key=True)
    text(s, COL40_X + 40, 692, 600, 44, '同一套规则，每次导入都执行', size=S_CARD, bold=True, lh=1.3)
    text(s, COL40_X + 40, 746, 600, 140, '嵌在烘焙器里的导入器按规范写入，见到 NeverStream 等违规直接拦下。',
         size=S_BODY - 2, alpha=A_SUB, lh=1.6)
    end_bar(s, COL40_X + 40, 914)
    return s


def p10(d, I):
    s = d.slide('03 · 解决了什么', '编排：按表驱动，迭代 11 个大版本')
    image(s, I['p10'], L, 214, W_CONTENT, 440, tag='工具界面')
    card(s, L, 684, COL60_W, 272, key=True)
    text(s, L + 40, 704, 600, 36, '节目迭代', size=S_LABEL, color=ACC, bold=True, spc=4, lh=1.3)
    stats = [('11', '个大版本'), ('38', '份存档'), ('37', '次云端发布')]
    for i, (n, c) in enumerate(stats):
        x = L + 40 + i * 310
        text(s, x, 744, 300, 90, [[{'t': n, 'size': 76, 'bold': True, 'color': ACC if i == 0 else TXT},
                                    {'t': ' ' + c, 'size': S_BODY - 2, 'alpha': A_SUB}]], lh=1.05)
    text(s, L + 40, 846, 940, 90, ['B01 → B11；云端发布 10-11 至 10-19（16.0.9 → 16.0.49）',
                                    '编排工作台本身 10-10 至 10-16：16 → 16.0.42'], size=S_SMALL, alpha=A_NOTE,
         lh=1.5)
    card(s, COL40_X, 684, COL40_W, 272)
    text(s, COL40_X + 40, 704, 600, 36, '同一份编排出三档', size=S_LABEL, color=ACC, bold=True, spc=4, lh=1.3)
    text(s, COL40_X + 40, 752, 600, 60, [[{'t': 'PC  ', 'size': 26, 'alpha': A_SUB},
                                          {'t': '1145 / 852 / 438', 'size': 40, 'bold': True}]], lh=1.3)
    text(s, COL40_X + 40, 818, 600, 60, [[{'t': '手游  ', 'size': 26, 'alpha': A_SUB},
                                          {'t': '448 / 349 / 181', 'size': 40, 'bold': True}]], lh=1.3)
    text(s, COL40_X + 40, 888, 600, 40, '高 / 中 / 低档的播放次数', size=S_SMALL, alpha=A_NOTE, lh=1.4)
    return s


def p11(d, I):
    s = d.slide('03 · 解决了什么', '完整操作：从调参到 UE 播放')
    placeholder(s, L, 214, 1200, 675, '截图位：完整操作录屏（约 2 分钟）',
                '选案例调参 → 引擎回放 → 导出 PC 与手游 → 导入器检查写入 → UE 中播放', bg_image=I['p11'],
                bg_alpha=0.88)
    source_tag(s, L, 214, 1200, 675, '底图：工具界面')
    x = 1344
    steps = [('01', '选案例、调参', '烘焙器实时模拟'),
             ('02', '看引擎回放', '按导出的贴图播放'),
             ('03', '一次导出', 'PC 与手游两套素材包'),
             ('04', '检查并导入', '点「导入」才写 UE'),
             ('05', 'UE 中播放', '粒子系统、贴图、材质实例')]
    y = 214
    for num, t, sub in steps:
        text(s, x, y, 60, 40, num, size=28, color=ACC, bold=True, lh=1.3)
        text(s, x + 64, y, 420, 40, t, size=S_BODY, bold=True, lh=1.3)
        text(s, x + 64, y + 42, 420, 36, sub, size=S_SMALL, alpha=A_NOTE, lh=1.4)
        y += 108
    card(s, x, 770, 480, 120, key=True)
    text(s, x + 36, 770, 430, 120, [[{'t': '实际用时 ', 'size': S_BODY, 'alpha': A_SUB},
                                      {'t': '__ 分 __ 秒', 'size': 34, 'bold': True, 'color': ACC}]],
         anchor='m', lh=1.3)
    return s


def p12(d, I):
    s = d.slide('04 · 学到的', 'Bug：修完写进规则和工具')
    c1, c2, c3 = L, L + 290, L + 660
    for x, t in ((c1, '现象'), (c2, '原因'), (c3, '写进哪里')):
        text(s, x + 24, 214, 300, 40, t, size=S_SMALL, alpha=A_NOTE, bold=True, lh=1.3)
    rows = [('火星熄灭处有黑点', '自检全过，进 UE 才发现', '淡出写在 RGB，Alpha 一直是 1',
             '淡出改写 Alpha，每个发射器加 Scale Color/Life'),
            ('星头呈方块', '高配通过，低配才出现', '主序列带 Mip，低画质下压扁的面片取到低 Mip',
             'PC 主序列一律不要 Mip'),
            ('最亮处出现黑块', '', '为去光晕灰线把 Ramp 末格改黑，最亮像素采到它', '出包前补\vEmissiveDissolve 0.98'),
            ('贴图常驻内存', '', '旧导入照抄示例设置，勾着 NeverStream', '导入器总写 false；\v导出、导入见到即拦'),
            ('冲突标记推上主干', '', '变基、提交、推送串成一条命令', '同步体检；每一步看退出码')]
    y = 262
    rh = 128
    for i, (a, tag, b, c) in enumerate(rows):
        rect(s, L, y, COL60_W, 1, fill=TXT, fill_alpha=0.10)
        if tag:
            rect(s, L, y + 12, 6, rh - 24, fill=ACC)
            text(s, c1 + 24, y + 24, 266, 40, a, size=S_SMALL + 2, bold=True, lh=1.4)
            text(s, c1 + 24, y + 66, 266, 36, tag, size=S_SMALL, color=ACC, lh=1.3)
        else:
            text(s, c1 + 24, y, 266, rh, a, size=S_SMALL + 2, bold=True, anchor='m', lh=1.4)
        text(s, c2 + 24, y, 346, rh, b, size=S_SMALL, alpha=A_SUB, anchor='m', lh=1.5)
        text(s, c3 + 24, y, 324, rh, c, size=S_SMALL, alpha=A_SUB, anchor='m', lh=1.5)
        y += rh
    rect(s, L, y, COL60_W, 1, fill=TXT, fill_alpha=0.10)
    image(s, I['p12a'], COL40_X, 214, 324, 324, tag='UE 实机')
    image(s, I['p12b'], COL40_X + 348, 214, 324, 324, tag='示意图')
    text(s, COL40_X, 546, 324, 34, '星头方块', size=S_SMALL, alpha=A_SUB, align='c', lh=1.3)
    text(s, COL40_X + 348, 546, 324, 34, '最亮处黑块', size=S_SMALL, alpha=A_SUB, align='c', lh=1.3)
    card(s, COL40_X, 616, COL40_W, 340, key=True)
    text(s, COL40_X + 40, 646, 600, 44, '以 UE 里的结果为准', size=S_CARD, bold=True, lh=1.3)
    text(s, COL40_X + 40, 702, 600, 190, ['执行结束、AI 自检通过、我验收通过，三种状态分开记录；验收要覆盖各档画质。',
                                           '渲染相关问题已修 34 项，修完都进了检查。'], size=S_BODY - 2, alpha=A_SUB,
         lh=1.6, space_after=8)
    end_bar(s, COL40_X + 40, 916)
    return s


def p13(d, I):
    s = d.slide('04 · 学到的', '方法：先拆解，再量化，进引擎验证')
    card(s, L, 214, 518, 742, key=True)
    text(s, 140, 262, 450, 130, '13→1', size=118, color=ACC, bold=True, lh=1.0)
    text(s, 140, 404, 440, 90, ['仙女棒：13 层火星', '合成 1 个发射器'], size=S_BODY - 2, alpha=A_SUB, lh=1.5)
    rect(s, 140, 560, 430, 1, fill=TXT, fill_alpha=0.12)
    text(s, 140, 604, 450, 130, '1.9→30', size=104, bold=True, lh=1.0)
    text(s, 140, 740, 440, 90, ['升空尾缀：卡顿段', '每秒帧数'], size=S_BODY - 2, alpha=A_SUB, lh=1.5)
    rx, rw = 662, 1162
    card(s, rx, 214, rw, 360)
    image(s, I['p13a'], rx + 30, 244, 300, 300, tag='引擎回放')
    text(s, rx + 366, 244, 760, 46, '仙女棒：分层调，再合成一张', size=S_CARD, bold=True, lh=1.3)
    text(s, rx + 366, 302, 766, 250, ['沿用烟花工坊原件分 13 层，每层单独调粗细、亮度和分叉；\v导出时合成一张 64 帧序列。',
                                       '远处火星逐帧闪烁：镜头核下限 0.28 → 0.55 像素，\v光量波动 0.44 → 0.007。'],
         size=S_SMALL + 1, alpha=A_SUB, lh=1.6, space_after=12)
    card(s, rx, 596, rw, 360)
    image(s, I['p13b'], rx + 30, 628, 480, 296, tag='实拍 / 模拟 / 导出')
    text(s, rx + 546, 626, 590, 46, '升空尾缀：按观察距离定帧率', size=S_CARD, bold=True, lh=1.3)
    text(s, rx + 546, 684, 590, 260, ['按 800 米、1080p 换算每帧位移，以金芒菊为基准，\v小于约 0.77 像素的阶段才减帧。',
                                       '近端随弹体、远端单独一段；\vGPU 火花每条按 800 预算。'],
         size=S_SMALL + 1, alpha=A_SUB, lh=1.6, space_after=12)
    return s


def p14(d, I):
    s = d.slide('05 · 分享', '心得：先写清标准，再让 AI 动手')
    pts = [('01', '标准先写成文档', '目标、限制、验收写清楚，每次对话 AI 都先读它。'),
           ('02', '以引擎里的结果为准', 'AI 自检通过不等于完成，最后看 UE。'),
           ('03', '问题落到工具里', '修过的 bug 进检查和规范，不靠人记。')]
    y = 236
    for num, t, body in pts:
        text(s, L, y, 120, 80, num, size=64, color=ACC, bold=True, lh=1.0)
        text(s, L + 140, y + 2, 860, 50, t, size=S_CARD + 4, bold=True, lh=1.3)
        text(s, L + 140, y + 62, 860, 50, body, size=S_BODY - 2, alpha=A_SUB, lh=1.5)
        y += 240
    card(s, COL40_X, 214, COL40_W, 742, key=True)
    text(s, COL40_X + 44, 250, 600, 50, '你们也可以这样用 AI', size=S_CARD + 4, bold=True, lh=1.3)
    tips = [('重复的设置', '让 AI 写成工具，按规范批量做'),
            ('难做的效果', '先拆层，再模拟、烘焙成序列'),
            ('大规模编排', '用表来驱动，改表比改轨道快')]
    y = 350
    for t, body in tips:
        rect(s, COL40_X + 44, y + 14, 12, 12, fill=ACC)
        text(s, COL40_X + 72, y, 560, 44, t, size=S_BODY, bold=True, lh=1.4)
        text(s, COL40_X + 72, y + 46, 560, 44, body, size=S_SMALL + 1, alpha=A_SUB, lh=1.4)
        y += 130
    text(s, COL40_X + 44, 780, 600, 80, '从一件重复的小事开始', size=S_BODY, color=ACC, lh=1.4)
    end_bar(s, COL40_X + 44, 900)
    return s


def p15(d, I):
    s = d.slide('05 · 分享', '工具包：三个工具和 18 个案例')
    heads = [(L, '工具'), (560, '做什么'), (1150, '怎么用 · 需要什么')]
    for x, t in heads:
        text(s, x, 214, 500, 36, t, size=S_SMALL, alpha=A_FOOT, bold=True, lh=1.3)
    rows = [('烟花烘焙器', '模拟火星、烘焙序列贴图、引擎回放，一次导出 PC 与手游两套',
             ['双击 HTML，从 18 个案例开始改', 'Chrome 或 Edge，独立显卡']),
            ('导入器', '检查素材包，按规范设置，写入 UE；在烘焙器的「资源交付」页',
             ['导出后进导入清单，点「导入」才写 UE', 'UE 开 GPUECli，本机交付服务（Python 3.10+）；没有就导出 ZIP 再导入']),
            ('烟花编排工作台', '按音乐时间线编排烟花，生成导演表',
             ['双击离线 HTML', '浏览器即可'])]
    y = 258
    for name, what, how in rows:
        rect(s, L, y, W_CONTENT, 1, fill=TXT, fill_alpha=0.10)
        text(s, L, y + 24, 440, 50, name, size=S_CARD + 2, bold=True, lh=1.3)
        text(s, 560, y + 24, 540, 110, what, size=S_SMALL + 1, alpha=A_SUB, lh=1.55)
        text(s, 1150, y + 24, 674, 120, [how[0], {'t': how[1], 'alpha': A_NOTE}], size=S_SMALL + 1, alpha=A_SUB,
             lh=1.55)
        y += 160
    rect(s, L, y, W_CONTENT, 1, fill=TXT, fill_alpha=0.10)
    text(s, L, 780, 1100, 56, '工具包将放在 xx 处', size=40, bold=True, lh=1.3)
    text(s, L, 846, 1100, 90, ['内含烘焙器（含导入器）、18 个案例、编排工作台和《先读我》。', '首次导入请在测试工程中进行。'],
         size=S_SMALL + 1, alpha=A_SUB, lh=1.55)
    text(s, 1300, 760, 524, 150, '谢谢', size=120, bold=True, align='r', lh=1.1)
    end_bar(s, 1824 - 72, 916, 72)
    return s


# ---------------------------------------------------------------- 台词
from 台词 import NOTES  # noqa: E402

PAGES = [p01, p02, p03, p04, p05, p06, p07, p08, p09, p10, p11, p12, p13, p14, p15]


def main():
    I = build_images()
    d = Deck(FOOTER)
    md = ['# 讲稿：烟花秀 AI 全流程（组内分享 2026-10-30）', '',
          '> 由 build_pptx.py 从 台词.py 生成，与 PPT 每页备注一致。时长按每分钟约 250 字估。', '']
    total = 0
    for i, fn in enumerate(PAGES, 1):
        s = fn(d, I)
        head, body = NOTES[i - 1]
        notes(s, head + '\n\n' + body)
        n = len(body.replace('\n', ''))
        total += n
        md += [f'## {head}', '', body, '', f'（{n} 字）', '']
    md.insert(3, f'全文约 {total} 字。')
    d.save(OUT)
    with open(SCRIPT_MD, 'w', encoding='utf-8') as f:
        f.write('\n'.join(md))
    print('saved', OUT, 'notes chars', total)


if __name__ == '__main__':
    main()
