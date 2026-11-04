# -*- coding: utf-8 -*-
"""分享 PPT 第三版：烟花秀 AI 全流程（组内分享，2026-10-30）。

用法（仓库根目录）：python3 "协作/提示词/分享PPT交接_2026-10-29/第三版交付/build_v3.py"
内容依据：../第三版逐页文稿_云端.md（台词、依据从该文件逐页读取，页面文字在本文件各页函数里）。
版式沿用第一版 pptkit（VFX 组模板：#0A0A0A / #0FF796 / #161616 / #F5F5F5，微软雅黑 + Consolas）。
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
SUCAI = os.path.join(PKG, '素材')
V1IMG = os.path.join(PKG, '交付', 'img')
LOCALSRC = os.path.join(PKG, '第三版素材', '原图')
IMG = os.path.join(HERE, 'img')
OUT = os.path.join(HERE, '烟花秀AI全流程_第三版.pptx')
SCRIPT_MD = os.path.join(HERE, '讲稿_第三版.md')
WENGAO = os.path.join(PKG, '第三版逐页文稿_云端.md')
FOOTER = '三角洲行动 VFX · 烟花工具链与工作方法'
os.makedirs(IMG, exist_ok=True)


# ---------------------------------------------------------------- 配图
def _src(name):
    for base in (LOCALSRC, SUCAI, V1IMG, PKG, ROOT):
        p = os.path.join(base, name)
        if os.path.exists(p):
            return p
    raise FileNotFoundError(name)


def has_local(name):
    return os.path.exists(os.path.join(LOCALSRC, name))


def _fix_black(im):
    """近黑底色压到 #0A0A0A，亮部不变，避免黑底小图露出方框。"""
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


def prep(name, out, w, h, mode='cover', focus=(0.5, 0.5), box=None, feather=0, scale=1.5, pad=0.0,
         fix_black=False):
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
    p = os.path.join(IMG, out)
    im.save(p, quality=90, optimize=True)
    return p


def framing_panels():
    """第 8 页三种取景的示意：同一帧扇形（烘焙器导出效果 FC6O 第 35/64 帧），放进三种面片框。"""
    src = Image.open(_src('analysis/results/FC6O_Blender/FC6O_export.png')).convert('RGB')
    fan = _fix_black(src.crop((92, 168, 446, 396)))      # 内容框 + 一点余量；爆点在底边中间
    fw, fh = fan.size
    out = {}
    S = 1.5
    PW, PH = int(552 * S), int(420 * S)
    specs = {
        # 名称: (面片宽, 面片高, 扇形放大倍数, 爆点在面片里的位置 (x, y 占比))
        'fixed': (560, 560, 0.95, (0.5, 0.66)),
        'zoom': (620, 620, 0.95, (0.5, 0.5)),
        'anchor': (400, 290, 1.05, (0.5, 0.94)),
    }
    for k, (bw, bh, fs, (bx, by)) in specs.items():
        canvas = Image.new('RGB', (PW, PH), (10, 10, 10))
        d = ImageDraw.Draw(canvas)
        sc = S * 0.62
        bw2, bh2 = int(bw * sc), int(bh * sc)
        x0, y0 = (PW - bw2) // 2, (PH - bh2) // 2
        d.rectangle((x0, y0, x0 + bw2, y0 + bh2), fill=(22, 22, 22), outline=(120, 120, 120), width=3)
        f2 = fan.resize((int(fw * fs * S * 0.62), int(fh * fs * S * 0.62)), Image.LANCZOS)
        px = x0 + int(bw2 * bx) - f2.width // 2
        py = y0 + int(bh2 * by) - f2.height + int(8 * S)
        region = canvas.crop((px, py, px + f2.width, py + f2.height))
        canvas.paste(ImageChops.lighter(region, f2), (px, py))
        cx, cy = x0 + int(bw2 * bx), y0 + int(bh2 * by)
        r = int(9 * S)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(15, 247, 150))
        p = os.path.join(IMG, f'p08_{k}.jpg')
        canvas.save(p, quality=92)
        out[k] = p
    return out


def build_images():
    I = {}
    I['cover'] = os.path.join(V1IMG, 'p01_cover.jpg')
    I['p02'] = prep('02_UE跨年秀_彩色全景.jpg', 'p02_show.jpg', 672, 742, box=(700, 150, 1600, 900))
    I['p03'] = prep('analysis/results/FC6O_Blender/FC6O_export.png', 'p03_fan.jpg', 640, 640,
                    box=(19, 0, 524, 505))
    # 第 4 页：本机原图到了用原图，否则先用第二版渲染里裁出的两块
    if has_local('tex_left.jpg'):
        I['p04a'] = prep('tex_left.jpg', 'p04_tex.jpg', 742, 440)
    else:
        I['p04a'] = prep('第二版交付/渲染/第02页.png', 'p04_tex.jpg', 742, 440, box=(1248, 214, 1686, 560))
    if has_local('cas_emitters.jpg'):
        I['p04b'] = prep('cas_emitters.jpg', 'p04_cas.jpg', 950, 440)
    else:
        I['p04b'] = prep('第二版交付/渲染/第02页.png', 'p04_cas.jpg', 950, 440, box=(1150, 586, 1772, 860))
    I['p05'] = os.path.join(V1IMG, 'p05_sequencer.jpg')
    for k in ('baker', 'importer', 'workbench', 'ue'):
        I['p06' + k] = os.path.join(V1IMG, f'p06_{k}.jpg')
    I['p07'] = prep('06_烘焙器界面_引擎回放.jpg', 'p07_replay.jpg', 1008, 420, box=(520, 0, 1600, 1000), focus=(0.5, 0.45))
    I.update({'p08' + k: v for k, v in framing_panels().items()})
    I['p09a'] = prep('analysis/results/FC6O_Blender/FC6O_atlas.png', 'p09_fan_atlas.jpg', 571, 354, mode='contain')
    I['p09b'] = prep('analysis/results/CS3_RT6/CS3S_atlas.png', 'p09_trail_atlas.jpg', 571, 354, mode='contain')
    I['p10'], I['p10h'] = importer_shot()
    I['p12'] = workbench_shot()
    I['p13tiles'], I['p13tag'] = effect_tiles()
    I['p14b'] = prep('第三版素材/原图/第2步UE证据.jpg', 'p14_ue_b.jpg', 1008, 566, box=(772, 596, 1480, 994))
    I['demo'] = prep('06_烘焙器界面_引擎回放.jpg', 'demo_bg.jpg', 1200, 675, focus=(0.5, 0.5))
    I['p17'] = prep('15_升空尾缀_实拍模拟导出对照.jpg', 'p17_trail.jpg', 1008, 620, focus=(0.5, 0.5))
    I['p18a'] = prep('17_仙女棒13层_第1至7层.jpg', 'p18_l1.jpg', 1162, 188)
    I['p18b'] = prep('18_仙女棒13层_第8至13层.jpg', 'p18_l2.jpg', 1162, 188)
    I['p18c'] = prep('16_仙女棒_64帧序列贴图.jpg', 'p18_sheet.jpg', 1162, 290)
    lq = 'analysis/results/LOWQ_FIX_20261018/'
    I['p19a'] = prep(lq + '升空_现状对NoMip_低档.jpg', 'p19_sq_now.jpg', 240, 330, box=(1036, 830, 1326, 1212))
    I['p19b'] = prep(lq + '升空_现状对NoMip_低档.jpg', 'p19_sq_fix.jpg', 240, 330, box=(1334, 830, 1624, 1212))
    I['p19c'] = prep(lq + '金芒菊_绽放局部放大_低档.jpg', 'p19_bl_now.jpg', 240, 330, box=(150, 410, 510, 770))
    I['p19d'] = prep(lq + '金芒菊_绽放局部放大_低档.jpg', 'p19_bl_fix.jpg', 240, 330, box=(518, 410, 878, 770))
    I['p20'] = prep('22_bug_最亮处黑块_示意图.png', 'p20_ramp.jpg', 300, 300)
    I['p21'] = prep('05_烘焙器界面_仙女棒.jpg', 'p21_baker.jpg', 1728, 500, focus=(0.5, 0.42))
    return I


def _paint(im, box, at):
    """用 at 点的底色盖住 box（截图里会误导的计数、测试弹窗）。"""
    c = im.getpixel(at)
    ImageDraw.Draw(im).rectangle(box, fill=c)
    return im


def importer_shot():
    """导入器截图：本机给了真实效果的原图就用原图；否则用第一版的 Fixture 图，盖掉左下角的测试弹窗。"""
    for n in sorted(os.listdir(LOCALSRC)) if os.path.isdir(LOCALSRC) else []:
        if n.startswith('导入器'):
            return prep(n, 'p10_importer.jpg', 1008, 567), 567
    im = Image.open(os.path.join(V1IMG, 'p09_importer.jpg')).convert('RGB')
    im = _paint(im, (10, 400, 240, 456), (60, 470))
    p = os.path.join(IMG, 'p10_importer.jpg')
    im.save(p, quality=92)
    return p, 630


def workbench_shot():
    """编排工作台截图：盖掉左栏「97 种花型」计数（那是工作台模板库计数，与全篇 26 种口径不同）。"""
    im = Image.open(_src('04_编排工作台界面.jpg')).convert('RGB')
    im = _paint(im, (200, 266, 272, 294), (150, 300))
    tmp = os.path.join(IMG, '_wb_src.jpg')
    im.save(tmp, quality=95)
    return prep(tmp, 'p12_workbench.jpg', 1728, 396, box=(0, 560, 1920, 1000))


EFFECT_TILES = [('25_', '金蕊柠'), ('28_', '金琉菊'), ('32_', '小青柠'), ('35_', '小金花'), ('40_', '银白菊')]


def effect_tiles():
    """成果页一排效果图：本机拷来 UE 实机原图（T28）就用；否则先用已有的 UE 实机与引擎回放图。"""
    have = []
    if os.path.isdir(LOCALSRC):
        files = sorted(os.listdir(LOCALSRC))
        for pre, name in EFFECT_TILES:
            m = [f for f in files if f.startswith(pre)]
            if m:
                have.append((m[0], name))
    if len(have) >= 4:
        tw = (1162 - (len(have) - 1) * 12) / len(have)
        out = [(prep(f, f'p13_{i}.jpg', tw, 280, focus=TILE_FOCUS.get(name, (0.5, 0.42))), name)
               for i, (f, name) in enumerate(have)]
        return [(p, n + ' · UE 实机') for p, n in out], 'UE 实机'
    srcs = [('03_UE跨年秀_金色扇面.jpg', '整场扇面 · UE 实机', dict(box=(560, 120, 1060, 640))),
            ('02_UE跨年秀_彩色全景.jpg', '彩色组合 · UE 实机', dict(box=(80, 80, 600, 600))),
            ('19_金芒爆裂菊.jpg', '金芒爆裂菊 · 引擎回放', dict(fix_black=True)),
            ('20_小青柠.jpg', '小青柠 · 引擎回放', dict(fix_black=True))]
    tw = (1162 - 3 * 12) / 4
    out = [(prep(n, f'p13_{i}.jpg', tw, 280, **kw), name) for i, (n, name, kw) in enumerate(srcs)]
    return out, 'UE 实机 / 引擎回放'


TILE_FOCUS = {}


# ---------------------------------------------------------------- 小组件
def label_text(s, x, y, w, t):
    text(s, x, y, w, 36, t, size=S_LABEL, color=ACC, bold=True, spc=4, lh=1.3)


def green_sq(s, x, y, size=12):
    rect(s, x, y, size, size, fill=ACC)


def item(s, x, y, w, head, body, head_size=S_CARD, body_size=S_SMALL + 2, gap=50, body_h=80, mark=True):
    """绿色小方块 + 粗标题 + 灰色说明。返回下一项的 y。"""
    if mark:
        green_sq(s, x, y + 14)
        x2, w2 = x + 30, w - 30
    else:
        x2, w2 = x, w
    text(s, x2, y, w2, 46, head, size=head_size, bold=True, lh=1.3)
    text(s, x2, y + gap, w2, body_h, body, size=body_size, alpha=A_SUB, lh=1.55)
    return y + gap + body_h


def numbered(s, x, y, w, num, head, body, num_size=40, head_size=S_CARD, body_size=S_SMALL + 2):
    text(s, x, y - 4, 80, 56, num, size=num_size, color=ACC, bold=True, lh=1.1)
    text(s, x + 84, y, w - 84, 44, head, size=head_size, bold=True, lh=1.3)
    text(s, x + 84, y + 48, w - 84, 70, body, size=body_size, alpha=A_SUB, lh=1.5)


def arrow_r(s, x1, y, x2, alpha=0.8):
    line(s, x1, y, x2, y, alpha=alpha, w=2, dash=True, arrow=True)


# ---------------------------------------------------------------- 页面
def p01(d, I):
    s = d.slide(transition=True)
    image(s, I['cover'], 0, 0, 1920, 1080)
    source_tag(s, 0, 0, 1920, 1080, '示意图', pos='br')
    page_footer(s, d.footer)
    text(s, L, 176, 1100, 36, 'VFX 组内分享 · 2026.10.30', size=S_LABEL, color=ACC, bold=True, spc=4, lh=1.3)
    text(s, L, 226, 1300, 140, '烟花秀 AI 全流程', size=112, bold=True, lh=1.15)
    text(s, L, 386, 1100, 56, '烟花烘焙器 · 导入器 · 烟花编排工作台', size=36, alpha=0.86, lh=1.3)
    end_bar(s, L, 476, 72)
    text(s, L, 512, 600, 40, '分享人：____', size=26, alpha=A_SUB, lh=1.4)
    rect(s, L, 716, 320, 1, fill=TXT, fill_alpha=0.14)
    items = [('01', '问题'), ('02', '解决思路'), ('03', '实践成果'), ('04', '经验与方法'), ('05', '分享')]
    for i, (num, name) in enumerate(items):
        y = 736 + i * 46
        text(s, L, y, 44, 40, num, size=26, color=ACC, bold=True, lh=1.3)
        text(s, L + 52, y, 300, 40, name, size=26, alpha=A_SUB, lh=1.3)
    return s


def p02(d, I):
    s = d.slide('01 · 问题 · 规模', '规模：花型由 3 种增至 26 种，时长约为去年 3 倍')
    text(s, L, 214, 1008, 230, [[{'t': '3', 'size': 200, 'alpha': 0.45, 'bold': True},
                                  {'t': ' → ', 'size': 120, 'alpha': 0.45, 'bold': True},
                                  {'t': '26', 'size': 200, 'color': ACC, 'bold': True}]], lh=1.0)
    text(s, L, 444, 1008, 50, '去年 3 种烟花 → 今年 26 种开花花型', size=S_CARD + 6, bold=True, lh=1.3)
    rect(s, L, 530, 1008, 1, fill=TXT, fill_alpha=0.12)
    rows = [('约 3 倍', '节目时长', '今年约 220 秒'),
            ('6 档', '升空尾缀', '另有 1 套窜天猴'),
            ('2 套', 'PC 与手游', '各自分画质档位')]
    y = 570
    for num, head, body in rows:
        text(s, L, y, 260, 70, num, size=56, color=TXT, bold=True, lh=1.1)
        text(s, L + 290, y + 2, 700, 40, head, size=S_BODY, bold=True, lh=1.3)
        text(s, L + 290, y + 42, 700, 36, body, size=S_SMALL, alpha=A_SUB, lh=1.4)
        y += 126
    image(s, I['p02'], COL40_X, 214, COL40_W, 742, tag='UE 实机')
    return s


def p03(d, I):
    s = d.slide('01 · 问题 · 出图', '出图：每种烟花的规格需单独处理')
    X, Y, W = L, 214, 640
    image(s, I['p03'], X, Y, W, W)
    rect(s, X, Y, W, W, line='F5F5F5', line_alpha=0.35, line_w=2)
    sc = W / 505.0
    bx0, by0, bx1, by1 = (100 - 19) * sc, 176 * sc, (437 - 19) * sc, 366 * sc
    rect(s, X + bx0 - 6, Y + by0 - 6, bx1 - bx0 + 12, by1 - by0 + 12, line=ACC, line_alpha=0.9, line_w=2, dash=True)
    bpx, bpy = X + (272 - 19) * sc, Y + 388 * sc
    rect(s, bpx - 9, bpy - 9, 18, 18, fill=ACC, shape=MSO_SHAPE.OVAL)
    text(s, bpx + 18, bpy - 4, 200, 34, '爆点', size=S_SMALL, color=ACC, bold=True, lh=1.2)
    text(s, X + bx0 - 6, Y + by0 - 46, 300, 34, '实际内容', size=S_SMALL, color=ACC, bold=True, lh=1.2)
    text(s, X + 20, Y + 16, 400, 34, '面片', size=S_SMALL, alpha=A_SUB, bold=True, lh=1.2)
    text(s, X, Y + W + 18, W, 40, '空白区域同样占用分辨率', size=S_SMALL, alpha=A_SUB, lh=1.4)
    rx, rw = 784, 1040
    text(s, rx, 214, rw, 44, '出图前需确定的规格', size=S_CARD + 2, bold=True, lh=1.3)
    things = [('取景', '面片尺寸、爆点位置'), ('帧数', '各阶段帧数分配'),
              ('格子', '按形态排布'), ('打包', '多帧合入一张贴图'),
              ('颜色与裁剪', 'Ramp、Cutout'), ('双平台', 'PC 与手游分别输出')]
    cw, ch, gx, gy = 510, 118, 20, 18
    for i, (h, b) in enumerate(things):
        cx = rx + (i % 2) * (cw + gx)
        cy = 280 + (i // 2) * (ch + gy)
        card(s, cx, cy, cw, ch)
        text(s, cx + 24, cy + 10, 60, 50, f'{i + 1:02d}', size=30, color=ACC, bold=True, lh=1.3)
        text(s, cx + 84, cy + 14, cw - 100, 40, h, size=S_BODY, bold=True, lh=1.3)
        text(s, cx + 84, cy + 62, cw - 100, 40, b, size=S_SMALL, alpha=A_SUB, lh=1.3)
    card(s, rx, 714, rw, 242, key=True)
    text(s, rx + 40, 738, rw - 80, 36, '原有方式', size=S_LABEL, color=ACC, bold=True, spc=4, lh=1.3)
    text(s, rx + 40, 788, rw - 80, 140, ['手工：裁切、排格、合通道，再计算尺寸与曲线；效果调整即重做',
                                          '脚本：AI 驱动 Blender 出图；需等待渲染，无法实时预览'],
         size=S_SMALL + 1, alpha=A_SUB, lh=1.6, space_after=12)
    return s


def p04(d, I):
    s = d.slide('01 · 问题 · 进引擎', '引擎接入：贴图与实例需逐项设置')
    w1, w2 = 742, W_CONTENT - 36 - 742
    image(s, I['p04a'], L, 214, w1, 460, tag='UE 编辑器')
    image(s, I['p04b'], L + w1 + 36, 214, w2, 460, tag='UE 编辑器')
    rows = [('贴图', '流送、贴图组、Mip\v按用途与平台设置'),
            ('材质实例与发射器', '参数、包围盒、朝向'),
            ('版本更新', '重新创建与设置\v漏项难以及时发现')]
    bw = (W_CONTENT - 2 * 40) / 3
    for i, (h, b) in enumerate(rows):
        x = L + i * (bw + 40)
        rect(s, x, 730, bw, 1, fill=TXT, fill_alpha=0.12)
        green_sq(s, x, 770)
        text(s, x + 28, 756, bw - 28, 44, h, size=S_CARD, bold=True, lh=1.3)
        text(s, x + 28, 808, bw - 40, 90, b, size=S_SMALL + 1, alpha=A_SUB, lh=1.55)
    text(s, L, 924, W_CONTENT, 36, '跨年烟花 3.0 共引用 212 张贴图', size=S_SMALL - 2, alpha=A_FOOT, lh=1.3)
    return s


def p05(d, I):
    s = d.slide('01 · 问题 · 排节目', '编排：定序器手工排轨难以支撑今年规模')
    image(s, I['p05'], L, 214, COL60_W, 742, tag='UE 编辑器 · 去年的定序器')
    x = COL40_X
    label_text(s, x, 214, COL40_W, '去年')
    text(s, x, 256, COL40_W, 170, ['定序器手工拼接', '12 条子序列、两千余条轨道', '调整节奏需逐条对齐', '内存占用偏高（性能组反馈）'],
         size=S_BODY - 2, alpha=A_SUB, lh=1.55)
    rect(s, x, 520, COL40_W, 1, fill=TXT, fill_alpha=0.12)
    label_text(s, x, 548, COL40_W, '今年')
    rows = [('约 220', '秒节目时长'), ('24', '个发射点位'), ('2 × 3', 'PC 与手游各 3 档画质')]
    y = 596
    for n, c in rows:
        text(s, x, y, COL40_W, 70, [[{'t': n, 'size': 56, 'bold': True, 'color': TXT},
                                      {'t': '  ' + c, 'size': S_BODY - 2, 'alpha': A_SUB}]], lh=1.1)
        y += 82
    text(s, x, 870, COL40_W, 80, ['新导演蓝图已与程序共同设计，', '手工匹配音乐节奏仍然困难'], size=S_SMALL, alpha=A_NOTE, lh=1.5)
    return s


def p06(d, I):
    s = d.slide('02 · 解决思路', '解决思路：三个环节，三个工具')
    nodes = [(I['p06baker'], '出图', '烟花烘焙器', ['模拟、取景、打包，', '导出 PC 与手游两套']),
             (I['p06importer'], '进引擎', '导入器', ['检查素材包，', '按规范写入 UE']),
             (I['p06workbench'], '排节目', '烟花编排工作台', ['按音乐编排，', '生成导演表']),
             (I['p06ue'], '播放', 'UE 导演蓝图', ['按三张表', '播放'])]
    tags = ['工具界面', '工具界面', '工具界面', 'UE 实机']
    links = ['素材包', 'UE 资源', '导演表']
    cw, gap = 360, 96
    for i, (img, step, name, desc) in enumerate(nodes):
        x = L + i * (cw + gap)
        card(s, x, 214, cw, 476, key=(i < 3))
        image(s, img, x + 1, 215, cw - 2, 202, tag=tags[i])
        text(s, x + 32, 444, cw - 50, 36, (f'问题{"一二三"[i]} · ' if i < 3 else '') + step, size=S_LABEL,
             color=ACC, bold=True, spc=2, lh=1.3)
        text(s, x + 32, 486, cw - 40, 50, name, size=32, bold=True, lh=1.3)
        text(s, x + 32, 548, cw - 44, 120, desc, size=S_SMALL, alpha=A_SUB, lh=1.6)
        if i < 3:
            x1 = x + cw + 10
            arrow_r(s, x1, 316, x1 + gap - 20)
            text(s, x + cw, 328, gap, 34, links[i], size=S_SMALL, alpha=A_NOTE, align='c', lh=1.2)
    card(s, L, 730, COL60_W, 226, key=True)
    label_text(s, L + 40, 756, 600, '分工')
    text(s, L + 40, 800, 920, 130, ['目标、审美与引擎约束由我确定；', '工具由 AI 开发；关键结果在 UE 验收'],
         size=S_BODY, lh=1.6)
    card(s, COL40_X, 730, COL40_W, 226)
    label_text(s, COL40_X + 40, 756, 600, '跨组协作')
    text(s, COL40_X + 40, 800, 600, 130, ['导演蓝图：与程序共同设计', '贴图规范：与性能组共同确定'], size=S_BODY - 2,
         alpha=A_SUB, lh=1.6)
    return s


def p07(d, I):
    s = d.slide('02 · 解决思路 · 出图', '烟花烘焙器：可视化、快速出图、按项目定制')
    card(s, L, 214, 672, 742)
    label_text(s, L + 40, 246, 600, '原有方式')
    text(s, L + 40, 290, 600, 50, 'AI 脚本驱动 Blender', size=S_CARD + 4, bold=True, lh=1.35)
    pts = [('可以出图', True), ('每轮等待离线渲染', False), ('预览与输出不一致', False), ('规格导出后才能确认', False)]
    y = 380
    for t_, ok in pts:
        rect(s, L + 40, y + 13, 14, 14, fill=TXT, fill_alpha=0.85 if ok else 0.35)
        text(s, L + 70, y, 560, 44, t_, size=S_BODY, alpha=A_BODY if ok else A_SUB, lh=1.4)
        y += 62
    rect(s, L + 40, 680, 592, 1, fill=TXT, fill_alpha=0.12)
    label_text(s, L + 40, 708, 600, '烘焙器的取舍')
    text(s, L + 40, 752, 592, 160, ['只输出游戏视角所需的 2D 序列，', '不构建完整三维场景'], size=S_BODY - 2, lh=1.6)
    rx, rw = 816, 1008
    image(s, I['p07'], rx, 214, rw, 446, tag='工具界面 · 引擎回放')
    cols = [('可视化', ['实时调参，', '导出后回放复核']),
            ('快速输出', ['即改即看，', '直接输出引擎格式']),
            ('项目定制', ['按本项目舞台、', '视距与规范设计'])]
    cw = (rw - 2 * 36) / 3
    for i, (h, b) in enumerate(cols):
        x = rx + i * (cw + 36)
        text(s, x, 706, cw, 40, f'0{i + 1}', size=30, color=ACC, bold=True, lh=1.2)
        text(s, x, 750, cw, 46, h, size=S_CARD + 2, bold=True, lh=1.3)
        text(s, x, 806, cw, 90, b, size=S_SMALL + 1, alpha=A_SUB, lh=1.55)
    return s


def p08(d, I):
    s = d.slide('02 · 解决思路 · 出图', '取景规范：提高贴图像素利用率')
    pw, gap = 552, 36
    panels = [('p08fixed', '固定框（默认）', '取整段最大范围'),
              ('p08zoom', '随开花放大', '以爆点为中心放大'),
              ('p08anchor', '锚在爆点', '只向内容方向放大')]
    ratios = ['约 2 成', '约 2 成', '约 4 成']
    for i, (k, h, b) in enumerate(panels):
        x = L + i * (pw + gap)
        image(s, I[k], x, 214, pw, 420)
        text(s, x + 20, 228, 300, 34, f'0{i + 1}', size=S_SMALL, color=ACC, bold=True, lh=1.2)
        text(s, x, 648, pw, 44, h, size=S_CARD, bold=True, lh=1.3)
        text(s, x, 700, pw, 40, b, size=S_SMALL, alpha=A_SUB, lh=1.4)
        text(s, x + pw - 200, 648, 200, 48, ratios[i], size=36, color=ACC if i == 2 else TXT, bold=True,
             align='r', lh=1.2)
    text(s, L, 750, W_CONTENT, 34, '示意图；数字为扇形测试中内容占面片的比例（中位数）', size=S_SMALL - 4, alpha=A_FOOT, lh=1.3)
    rect(s, L, 800, W_CONTENT, 1, fill=TXT, fill_alpha=0.12)
    steps = [('烘焙后收紧', '按每帧实际内容二次收紧'), ('曲线精简', '面片尺寸最多分 12 级'), ('帧数分配', '运动快的阶段分配更多帧')]
    sw = (W_CONTENT - 2 * 40) / 3
    for i, (h, b) in enumerate(steps):
        x = L + i * (sw + 40)
        text(s, x, 828, sw, 44, h, size=S_BODY, bold=True, color=ACC, lh=1.3)
        text(s, x, 878, sw, 50, b, size=S_SMALL + 1, alpha=A_SUB, lh=1.5)
    return s


def p09(d, I):
    s = d.slide('02 · 解决思路 · 出图', '打包规范：单张贴图 64 帧，双平台同时导出')
    card(s, L, 214, 518, 742, key=True)
    text(s, 140, 252, 440, 170, '64', size=170, color=ACC, bold=True, lh=1.0)
    text(s, 140, 436, 440, 50, '帧 / 张贴图', size=34, bold=True, lh=1.3)
    text(s, 140, 500, 420, 60, '4×4 格 × RGBA 四通道', size=S_BODY - 2, alpha=A_SUB, lh=1.6)
    rect(s, 140, 600, 420, 1, fill=TXT, fill_alpha=0.12)
    text(s, 140, 628, 420, 120, ['灰度存储，Ramp 查色；', '换色无需重新烘焙'], size=S_SMALL + 2, alpha=A_SUB, lh=1.6)
    rx, rw = 662, 1162
    image(s, I['p09a'], rx, 214, 571, 354)
    image(s, I['p09b'], rx + 591, 214, 571, 354)
    text(s, rx, 578, 571, 36, '扇形 · 4×4', size=S_SMALL - 2, alpha=A_NOTE, align='c', lh=1.3)
    text(s, rx + 591, 578, 571, 36, '升空尾缀 · 16×1', size=S_SMALL - 2, alpha=A_NOTE, align='c', lh=1.3)
    items = [('格子随形状', '方格、竖长格、16×1 长条'),
             ('Cutout', '8 顶点轮廓；收益不足一成不输出'),
             ('双平台导出', '手游贴图不超过 1024'),
             ('回放复核', '交付前在引擎回放中检查')]
    cw = (rw - 40) / 2
    for i, (h, b) in enumerate(items):
        x = rx + (i % 2) * (cw + 40)
        y = 660 + (i // 2) * 150
        green_sq(s, x, y + 14)
        text(s, x + 30, y, cw - 30, 44, h, size=S_BODY, bold=True, lh=1.3)
        text(s, x + 30, y + 48, cw - 30, 60, b, size=S_SMALL + 1, alpha=A_SUB, lh=1.5)
    return s


def p10(d, I):
    s = d.slide('02 · 解决思路 · 进引擎', '导入器：规范内置于工具，确认后写入 UE')
    image(s, I['p10'], L, 214, COL60_W, I.get('p10h', 630), tag='工具界面 · 测试数据')
    text(s, L, 214 + I.get('p10h', 630) + 16, COL60_W, 40, '入口在特效工作台；烘焙器交付页可直接进入导入清单',
         size=S_SMALL - 2, alpha=A_NOTE, lh=1.4)
    x = COL40_X
    steps = [('01', '配置素材', '检查命名、尺寸与规范项'),
             ('02', '核对清单', '列出待创建的资源与设置'),
             ('03', '执行导入', '写入 UE，并读回核对')]
    y = 220
    for n, h, b in steps:
        numbered(s, x, y, COL40_W, n, h, b)
        y += 150
    card(s, x, 720, COL40_W, 236, key=True)
    text(s, x + 40, 746, 600, 44, '确认后才写入 UE', size=S_CARD, bold=True, lh=1.3)
    text(s, x + 40, 802, 600, 120, ['检查阶段不修改工程；', '与性能组确定的规范由工具执行'], size=S_SMALL + 1, alpha=A_SUB,
         lh=1.6)
    return s


def p11(d, I):
    s = d.slide('02 · 解决思路 · 排节目', '编排规则：由舞台尺度推导分档与构图')
    X0, X1, Yt = L + 40, L + 1048, 470
    label_text(s, L, 214, 600, '舞台与点位')
    step = (X1 - X0) / 8
    rect(s, X0, Yt, X1 - X0, 110, fill=TXT, fill_alpha=0.06, line=TXT, line_alpha=0.25, line_w=1)
    text(s, X0 + 16, Yt + 14, 600, 34, '坝体 · 宽约 800 m、高约 150 m', size=S_SMALL - 2, alpha=A_NOTE, lh=1.2)
    for i in range(9):
        cx = X0 + i * step
        rect(s, cx - 11, Yt - 26, 22, 22, fill=ACC, shape=MSO_SHAPE.OVAL)
        if i < 8:
            rect(s, cx + step / 2 - 7, Yt - 22, 14, 14, fill=TXT, fill_alpha=0.75, shape=MSO_SHAPE.OVAL)
    fx0 = X0 + step * 2.2
    fstep = step * 3.6 / 6
    rect(s, fx0 - 30, Yt + 74, fstep * 6 + 60, 36, fill=TXT, fill_alpha=0.10)
    for i in range(7):
        cx = fx0 + i * fstep
        rect(s, cx - 6, Yt + 62, 12, 12, fill=TXT, fill_alpha=0.45, shape=MSO_SHAPE.OVAL)
    leg = [(ACC, None, '主点 9（点距约 100 m）'), (TXT, 0.75, '中间点 8'), (TXT, 0.45, '前台点 7')]
    lx = X0
    for c, a, t_ in leg:
        rect(s, lx, 632, 16, 16, fill=c, fill_alpha=a, shape=MSO_SHAPE.OVAL)
        text(s, lx + 28, 620, 380, 40, t_, size=S_SMALL, alpha=A_SUB, lh=1.4)
        lx += 330 if c == ACC else 200
    text(s, X0 + 760, 620, 300, 40, '共 24 个点位', size=S_SMALL + 2, bold=True, lh=1.4)
    x = 1200
    w = 1824 - x
    label_text(s, x, 214, w, '分档')
    text(s, x, 256, w, 80, '花径约为点距 1.5 倍可分辨，2 倍以上形成花墙', size=S_SMALL + 1, alpha=A_SUB, lh=1.55)
    heads = ['档', '花径', '开花高度', '尾缀']
    rows = [('S', '90 m', '+150 m', 'S'), ('M', '150 m', '+210 m', 'M'), ('L', '230 m', '+330 m', 'L'),
            ('主角', '280 m', '+400 m', 'Hero')]
    cx = [x, x + 110, x + 280, x + 470]
    for j, hh in enumerate(heads):
        text(s, cx[j], 360, 200, 34, hh, size=S_SMALL - 2, alpha=A_FOOT, bold=True, lh=1.2)
    y = 400
    for r in rows:
        rect(s, x, y, w, 1, fill=TXT, fill_alpha=0.10)
        for j, v in enumerate(r):
            text(s, cx[j], y + 12, 200, 40, v, size=S_BODY - 2 if j else S_BODY, bold=(j == 0),
                 color=ACC if j == 0 else TXT, alpha=A_BODY if j == 0 else A_SUB, lh=1.3)
        y += 60
    rect(s, x, y, w, 1, fill=TXT, fill_alpha=0.10)
    chain = ['舞台与点位', '分档与高度', '重叠检查', '编排宪章', '每版自动检查']
    cw, gap = 300, 57
    for i, t_ in enumerate(chain):
        bx = L + i * (cw + gap)
        if i == 3:
            rect(s, bx, 790, cw, 72, fill=CARD, line=ACC, line_alpha=0.8, line_w=2)
        else:
            rect(s, bx, 790, cw, 72, fill=CARD, line='F5F5F5', line_alpha=A_STROKE)
        text(s, bx, 790, cw, 72, t_, size=S_SMALL + 2, bold=(i == 3), align='c', anchor='m', lh=1.2)
        if i < 4:
            line(s, bx + cw + 8, 826, bx + cw + gap - 8, 826, color=TXT, alpha=0.45, w=2, arrow=True)
    text(s, L, 890, W_CONTENT, 40, '以上为设计值，实机机位不同时以实机校正', size=S_SMALL - 2, alpha=A_NOTE, lh=1.4)
    return s


def p12(d, I):
    s = d.slide('02 · 解决思路 · 排节目', '烟花编排工作台：时间轴编排，输出导演表')
    image(s, I['p12'], L, 214, W_CONTENT, 396, tag='工具界面')
    card(s, L, 650, COL60_W, 306, key=True)
    label_text(s, L + 40, 680, 600, '可视化')
    text(s, L + 40, 726, 920, 50, '音乐、点位、模板在同一时间轴', size=S_CARD + 2, bold=True, lh=1.3)
    text(s, L + 40, 790, 920, 60, '按音乐调整节奏与模板，即时预览', size=S_BODY - 2, alpha=A_SUB, lh=1.6)
    card(s, COL40_X, 650, COL40_W, 306)
    label_text(s, COL40_X + 40, 680, 600, '程序化')
    text(s, COL40_X + 40, 726, 600, 50, '按宪章检查，一键出表', size=S_CARD + 2, bold=True, lh=1.3)
    text(s, COL40_X + 40, 790, 600, 60, '输出导演蓝图所需的三张表', size=S_BODY - 2, alpha=A_SUB, lh=1.6)
    return s


def p13(d, I):
    s = d.slide('03 · 实践成果 · 出图', '资源成果：26 种开花、6 档尾缀、1 套窜天猴')
    card(s, L, 214, 518, 742, key=True)
    text(s, 140, 252, 440, 110, '26', size=104, color=ACC, bold=True, lh=1.0)
    text(s, 140, 372, 440, 50, '种开花花型', size=34, bold=True, lh=1.3)
    text(s, 140, 428, 420, 40, '按尺寸共 30 个规格', size=S_BODY - 2, alpha=A_SUB, lh=1.5)
    rect(s, 140, 510, 420, 1, fill=TXT, fill_alpha=0.12)
    text(s, 140, 538, 420, 80, [[{'t': '20', 'size': 64, 'bold': True}, {'t': ' / 26', 'size': 34, 'alpha': A_SUB,
                                                                          'bold': True}]], lh=1.05)
    text(s, 140, 626, 420, 80, ['有烘焙器导出材料，', '可调参后重新导出'], size=S_SMALL + 1, alpha=A_SUB, lh=1.6)
    rect(s, 140, 760, 420, 1, fill=TXT, fill_alpha=0.12)
    text(s, 140, 788, 420, 80, ['手游覆盖其中 12 种开花', '与全部尾缀'], size=S_SMALL + 1, alpha=A_SUB, lh=1.6)
    rx, rw = 662, 1162
    tiles = I['p13tiles']
    tw = (rw - (len(tiles) - 1) * 12) / len(tiles)
    for i, (img, name) in enumerate(tiles):
        x = rx + i * (tw + 12)
        image(s, img, x, 214, tw, 280)
        text(s, x, 500, tw, 34, name, size=S_SMALL - 2, alpha=A_SUB, align='c', lh=1.3)
    rows = CATEGORY_ROWS
    heads = [(rx, '形态'), (rx + 600, 'PC'), (rx + 900, '手游')]
    for x, tt in heads:
        text(s, x, 556, 300, 30, tt, size=S_SMALL - 4, alpha=A_FOOT, bold=True, lh=1.2)
    y = 588
    rh = 41
    for name, pc, mb in rows:
        rect(s, rx, y, rw, 1, fill=TXT, fill_alpha=0.10)
        text(s, rx, y, 600, rh, name, size=S_SMALL, bold=True, anchor='m', lh=1.2)
        text(s, rx + 600, y, 300, rh, pc, size=S_SMALL, alpha=A_SUB, anchor='m', lh=1.2)
        text(s, rx + 900, y, 262, rh, mb, size=S_SMALL, alpha=A_SUB, anchor='m', lh=1.2)
        y += rh
    rect(s, rx, y, rw, 1, fill=TXT, fill_alpha=0.10)
    text(s, rx, y + 8, rw, 30, '另有 1 种形态未定；共引用 212 张贴图', size=S_SMALL - 4, alpha=A_FOOT, lh=1.2)
    return s


CATEGORY_ROWS = [('球形开花', '9 种', '1 种'),
                 ('冠', '3 种', '3 种'),
                 ('柳', '1 种', '1 种'),
                 ('扇形', '1 种（金锦冠）', '—'),
                 ('彗星', '5 种', '2 种'),
                 ('特殊星效', '6 种', '5 种'),
                 ('升空尾缀', '6 档', '6 档'),
                 ('窜天猴', '7 个组件', '6 个组件')]


def p14(d, I):
    s = d.slide('03 · 实践成果 · 进引擎', '接入成果：两轮批量修正，读回一致')
    image(s, I['p14b'], L, 214, COL60_W, 566, tag='UE 实机 · 修正后')
    text(s, L, 810, COL60_W, 50, '规则已内置于导入器，新资源导入时自动执行', size=S_BODY - 2, color=ACC, lh=1.5)
    x = COL40_X
    text(s, x, 214, COL40_W, 36, '贴图规范确定后', size=S_LABEL, color=ACC, bold=True, spc=2, lh=1.3)
    text(s, x, 262, COL40_W, 140, [[{'t': '149', 'size': 120, 'color': ACC, 'bold': True},
                                     {'t': '/149', 'size': 76, 'color': ACC, 'bold': True}]], lh=1.0)
    text(s, x, 400, COL40_W, 40, '张贴图批量重设，读回一致', size=S_SMALL + 2, alpha=A_SUB, lh=1.5)
    rect(s, x, 480, COL40_W, 1, fill=TXT, fill_alpha=0.12)
    text(s, x, 508, COL40_W, 36, '更早一轮', size=S_LABEL, color=ACC, bold=True, spc=2, lh=1.3)
    text(s, x, 556, COL40_W, 90, [[{'t': '115', 'size': 72, 'bold': True}, {'t': ' 个包', 'size': 30, 'bold': True}]],
         lh=1.0)
    text(s, x, 648, COL40_W, 80, ['粒子系统 48 个、材质实例 67 个，', '读回无错误'], size=S_SMALL + 2, alpha=A_SUB, lh=1.6)
    return s


def p15(d, I):
    s = d.slide('03 · 实践成果 · 排节目', '编排成果：同一编排按平台与画质分档输出')
    card(s, L, 214, W_CONTENT, 470)
    text(s, L + 40, 240, 1200, 40, '各档一场的播放次数', size=S_BODY, bold=True, lh=1.3)
    data = [('PC', [('高', 1145, '约 1100'), ('中', 852, '约 850'), ('低', 438, '约 440')]),
            ('手游', [('高', 448, '约 450'), ('中', 349, '约 350'), ('低', 181, '约 180')])]
    base, top = 600, 330
    vmax = 1145
    bw, gap_in, gap_grp = 150, 40, 200
    x = L + 160
    for gi, (g, bars) in enumerate(data):
        gx0 = x
        for name, v, lab in bars:
            h = (base - top) * v / vmax
            hot = gi == 0 and name == '高'
            rect(s, x, base - h, bw, h, fill=ACC if hot else TXT, fill_alpha=None if hot else 0.32)
            text(s, x - 20, base - h - 42, bw + 40, 36, lab, size=S_SMALL, bold=True, align='c', lh=1.2)
            text(s, x, base + 8, bw, 32, name, size=S_SMALL - 2, alpha=A_SUB, align='c', lh=1.2)
            x += bw + gap_in
        text(s, gx0, base + 40, x - gap_in - gx0, 34, g, size=S_BODY - 2, bold=True, align='c', lh=1.2)
        x += gap_grp - gap_in
    rect(s, L + 120, base, W_CONTENT - 240, 1, fill=TXT, fill_alpha=0.25)
    card(s, L, 714, COL60_W, 242, key=True)
    text(s, L + 40, 740, 900, 80, [[{'t': '11', 'size': 72, 'color': ACC, 'bold': True},
                                     {'t': ' 个大版本', 'size': S_CARD, 'bold': True}]], lh=1.05)
    text(s, L + 40, 846, 920, 80, '每版自动检查；调整节奏只需重新出表', size=S_SMALL + 2, alpha=A_SUB, lh=1.6)
    card(s, COL40_X, 714, COL40_W, 242)
    label_text(s, COL40_X + 40, 740, 600, '待改进')
    text(s, COL40_X + 40, 790, 600, 120, ['节拍对齐指标', '尚未达到宪章目标'], size=S_BODY - 2, alpha=A_SUB, lh=1.6)
    return s


DAILY = [13, 26, 29, 99, 101, 156, 98, 93, 96, 116, 240, 173, 58, 121, 37, 47, 109, 115, 78, 104, 59, 44, 40, 12, 1,
         46, 21, 9, 31, 0, 9, 12, 15]


def p16(d, I):
    s = d.slide('03 · 实践成果 · 投入', '个人投入：一人对接 AI，贯穿全流程')
    cards = [('方向制定', '需求、目标、编排设计'),
             ('质量判断', '美术把关、UE 验收'),
             ('规则与交接', '规则成文、交接留存')]
    for i, (h, b) in enumerate(cards):
        x = L + i * (544 + 48)
        card(s, x, 214, 544, 230, key=(i == 0))
        text(s, x + 40, 238, 120, 60, f'0{i + 1}', size=44, color=ACC, bold=True, lh=1.1)
        text(s, x + 40, 306, 470, 50, h, size=S_CARD + 4, bold=True, lh=1.3)
        text(s, x + 40, 366, 470, 50, b, size=S_SMALL + 2, alpha=A_SUB, lh=1.5)
    text(s, L, 500, 900, 40, '每日提交量', size=S_BODY - 2, bold=True, lh=1.3)
    text(s, L + 900, 500, 828, 40, '约 2200 次提交 · 烘焙器近 200 个版本', size=S_BODY - 2, alpha=A_SUB, align='r', lh=1.3)
    cx0, cw0, base, hh = L, W_CONTENT, 900, 320
    n = len(DAILY)
    slot = cw0 / n
    bw = slot * 0.56
    peak = max(DAILY)
    rect(s, cx0, base, cw0, 1, fill=TXT, fill_alpha=0.15)
    for i, v in enumerate(DAILY):
        if v == 0:
            continue
        bh = max(2, hh * v / peak)
        rect(s, cx0 + i * slot + (slot - bw) / 2, base - bh, bw, bh, fill=TXT, fill_alpha=0.30)
    text(s, L, 916, W_CONTENT, 34, '含约 350 次显卡后台自动回传', size=S_SMALL - 2, alpha=A_FOOT, lh=1.3)
    return s


def p17(d, I):
    s = d.slide('04 · 经验与方法 · 技术', '升空尾缀：近段与远段对应不同年龄的火星')
    image(s, I['p17'], L, 214, COL60_W, 620)
    text(s, L, 850, COL60_W, 40, '上：实拍　中：模拟　下：导出回放', size=S_SMALL - 2, alpha=A_NOTE, lh=1.4)
    x = COL40_X
    y = 214
    for h, b in [('近段', '循环面片，随弹体移动'), ('远段', '一次性序列，表现下落的老火星')]:
        y = item(s, x, y, COL40_W, h, b, head_size=S_CARD + 2, body_h=50) + 30
    text(s, x, y, COL40_W, 40, '并非按相机距离切换', size=S_SMALL + 1, color=ACC, lh=1.4)
    card(s, x, 600, COL40_W, 356, key=True)
    label_text(s, x + 40, 628, 600, '帧数分配')
    text(s, x + 40, 676, 600, 140, ['按观看距离换算每帧屏幕位移，', '再按 30 帧节拍分配'], size=S_SMALL + 2, alpha=A_SUB,
         lh=1.6)
    text(s, x + 40, 850, 600, 60, '远景流畅，近景略软', size=S_BODY, lh=1.5)
    return s


def p18(d, I):
    s = d.slide('04 · 经验与方法 · 技术', '仙女棒：13 类火星合成一张序列')
    card(s, L, 214, 518, 742, key=True)
    text(s, 140, 262, 450, 140, '13→1', size=124, color=ACC, bold=True, lh=1.0)
    text(s, 140, 420, 430, 100, ['每平台 1 张 64 帧主序列', '+ 1 个发射器'], size=S_BODY - 2, alpha=A_SUB, lh=1.55)
    rect(s, 140, 556, 420, 1, fill=TXT, fill_alpha=0.12)
    y = 584
    for h, b in [('以往', '窜天猴拖尾用 10 个发射器拼合'), ('本次', '通用母子分叉，烘焙时合成')]:
        text(s, 140, y, 420, 40, h, size=S_BODY - 2, color=ACC, bold=True, lh=1.3)
        text(s, 140, y + 44, 430, 50, b, size=S_SMALL + 1, alpha=A_SUB, lh=1.5)
        y += 130
    rx, rw = 662, 1162
    text(s, rx, 214, rw, 36, '13 类火星（源自 Blender 工程）', size=S_SMALL, alpha=A_SUB, bold=True, lh=1.3)
    image(s, I['p18a'], rx, 256, rw, 188)
    image(s, I['p18b'], rx, 452, rw, 188)
    text(s, rx, 662, rw, 36, '合成后的 64 帧主序列 · UE 观感待验收', size=S_SMALL, alpha=A_SUB, bold=True, lh=1.3)
    image(s, I['p18c'], rx, 704, rw, 252)
    return s


def p19(d, I):
    s = d.slide('04 · 经验与方法 · 排查', '模糊与方头：控制变量，分别定位')
    pairs = [(I['p19a'], I['p19b'], '方头 · 升空尾缀'), (I['p19c'], I['p19d'], '先糊后清 · 金芒菊')]
    for i, (a, b, cap) in enumerate(pairs):
        x = L + i * (492 + 24)
        before_after(s, x, 214, 492, 660, a, b, tag_before='修前', tag_after='修后')
        text(s, x, 884, 492, 40, cap, size=S_SMALL, alpha=A_SUB, align='c', lh=1.3)
    text(s, L, 926, 1008, 34, 'UE 实机 · PC 低档同机位', size=S_SMALL - 4, alpha=A_FOOT, lh=1.3)
    x = COL40_X
    y = 214
    for h, b in [('方头', '长条格采样到低 Mip，仅低配出现'), ('先糊后清', '贴图首次出现时未流送到位'),
                 ('规则', 'PC 不用 Mip；手游保留，最大 1024')]:
        y = item(s, x, y, COL40_W, h, b, head_size=S_CARD, body_h=50) + 34
    card(s, x, 756, COL40_W, 200, key=True)
    label_text(s, x + 40, 778, 600, '方法')
    text(s, x + 40, 826, 600, 100, ['固定机位、档位与时刻，', '单变量对比'], size=S_BODY - 2, alpha=A_SUB, lh=1.6)
    return s


def p20(d, I):
    s = d.slide('04 · 经验与方法 · 排查', '黑点与末格黑块：定位原因，写入规则')
    card(s, L, 214, 518, 742, key=True)
    text(s, 140, 262, 430, 60, '定位原因', size=56, bold=True, lh=1.2)
    line(s, 160, 350, 160, 410, alpha=0.8, w=3, arrow=True)
    text(s, 140, 424, 430, 60, '写入规则', size=56, color=ACC, bold=True, lh=1.2)
    line(s, 160, 512, 160, 572, alpha=0.8, w=3, arrow=True)
    text(s, 140, 586, 430, 60, '新资源默认执行', size=48, bold=True, lh=1.25)
    rx, rw = 662, 1162
    label_text(s, rx, 214, 400, '黑点')
    text(s, rx, 256, rw, 40, '颜色变黑但不透明，遮挡后方画面', size=S_SMALL + 1, alpha=A_SUB, lh=1.4)
    bw = 520
    card(s, rx, 314, bw, 150)
    text(s, rx + 30, 330, 200, 34, '修前', size=S_SMALL, alpha=A_NOTE, bold=True, lh=1.2)
    text(s, rx + 30, 372, bw - 60, 80, ['淡出写在 RGB，', 'Alpha 恒为 1'], size=S_SMALL + 2, lh=1.5)
    line(s, rx + bw + 16, 389, rx + rw - bw - 16, 389, alpha=0.9, w=3, arrow=True)
    card(s, rx + rw - bw, 314, bw, 150, key=True)
    text(s, rx + rw - bw + 30, 330, 200, 34, '修后', size=S_SMALL, color=ACC, bold=True, lh=1.2)
    text(s, rx + rw - bw + 30, 372, bw - 60, 80, ['颜色不变，', '淡出写入 Alpha'], size=S_SMALL + 2, lh=1.5)
    text(s, rx, 474, rw, 34, '导出参数对比；尚无 UE 成对截图', size=S_SMALL - 2, alpha=A_FOOT, lh=1.3)
    rect(s, rx, 530, rw, 1, fill=TXT, fill_alpha=0.12)
    label_text(s, rx, 556, 400, '末格黑块')
    image(s, I['p20'], rx, 606, 330, 330, tag='示意图')
    text(s, rx + 370, 606, rw - 370, 330, ['最亮处采到 Ramp 末格的黑色', '末格保留（用于去除光晕灰线）',
                                            'EmissiveDissolve 设为 0.98'],
         size=S_SMALL + 2, alpha=A_SUB, lh=1.6, space_after=14)
    return s


def p21(d, I):
    s = d.slide('04 · 经验与方法 · 规则', '参数与界面规范：宪章与设计令牌')
    image(s, I['p21'], L, 214, W_CONTENT, 500, tag='工具界面 · 烟花烘焙器')
    blocks = [('参数宪章', '明确每个参数的类型；\v不生效即置灰并说明原因'),
              ('交互宪章与设计令牌', '统一入口、状态与反馈；\v颜色等取值源自 DF 特效工作台'),
              ('现状', '配色已统一；\v组件与形状逐步统一')]
    bw = (W_CONTENT - 2 * 40) / 3
    for i, (h, b) in enumerate(blocks):
        x = L + i * (bw + 40)
        if i < 2:
            green_sq(s, x, 784)
        else:
            rect(s, x, 784, 12, 12, fill=TXT, fill_alpha=0.4)
        text(s, x + 28, 770, bw - 28, 46, h, size=S_CARD + 2, bold=True, lh=1.3)
        text(s, x + 28, 826, bw - 38, 130, b, size=S_SMALL + 1, alpha=A_SUB, lh=1.6)
    return s


def p22(d, I):
    s = d.slide('05 · 分享 · 方法', '工作方法：批量需求的三阶段协作')
    phases = [('01', '明确需求', [('需求定义', '目标、约束、验收标准'), ('技术选型', 'AI 梳理技术，取最简方案'),
                               ('原理先行', '先拆结构，再调参数')]),
              ('02', '建立规范', [('任务拆分', '按效果、工具、编排分配 AI 负责人'), ('宪章规范', '规则成文'),
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
    yy = 350
    for t_, body in tips:
        green_sq(s, COL40_X + 44, yy + 14)
        text(s, COL40_X + 72, yy, 560, 44, t_, size=S_BODY, bold=True, lh=1.4)
        text(s, COL40_X + 72, yy + 46, 560, 44, body, size=S_SMALL + 1, alpha=A_SUB, lh=1.4)
        yy += 130
    text(s, COL40_X + 44, 780, 600, 60, '从一项重复性工作开始', size=S_BODY, color=ACC, lh=1.5)
    end_bar(s, COL40_X + 44, 900)
    return s


def p23(d, I):
    s = d.slide('05 · 分享 · 工具', '工具获取')
    heads = [(L, '工具'), (560, '功能'), (1150, '使用方式')]
    for x, t_ in heads:
        text(s, x, 214, 500, 36, t_, size=S_SMALL, alpha=A_FOOT, bold=True, lh=1.3)
    rows = [('烟花烘焙器', '模拟、取景、打包、导出', ['基于案例调参', 'Chrome 或 Edge 打开']),
            ('导入器', '检查并写入 UE', ['需 UE 插件与本机服务', '首次请在测试工程使用']),
            ('烟花编排工作台', '生成导演表', ['离线页面', ''])]
    y = 258
    for name, what, how in rows:
        rect(s, L, y, W_CONTENT, 1, fill=TXT, fill_alpha=0.10)
        text(s, L, y + 24, 440, 50, name, size=S_CARD + 2, bold=True, lh=1.3)
        text(s, 560, y + 24, 560, 60, what, size=S_SMALL + 2, alpha=A_SUB, lh=1.55)
        text(s, 1150, y + 24, 674, 100, [how[0], {'t': how[1], 'alpha': A_NOTE}], size=S_SMALL + 2, alpha=A_SUB,
             lh=1.55)
        y += 150
    rect(s, L, y, W_CONTENT, 1, fill=TXT, fill_alpha=0.10)
    text(s, L, 780, 1100, 56, '工具包存放位置：xx', size=40, bold=True, lh=1.3)
    text(s, L, 846, 1100, 40, '首批：烘焙器与案例；导入器与编排工作台后续补充', size=S_SMALL + 1, alpha=A_SUB, lh=1.4)
    text(s, L, 900, 1200, 40, '案例是载体，重点是工作方式', size=S_SMALL + 1, color=ACC, lh=1.4)
    text(s, 1300, 760, 524, 150, '谢谢', size=120, bold=True, align='r', lh=1.1)
    end_bar(s, 1824 - 72, 916, 72)
    return s


def p_demo(d, I):
    s = d.slide('02 · 解决思路 · 演示', '流程演示：从调参到 UE 播放')
    placeholder(s, L, 214, 1200, 675, '录屏位：完整操作（约 2 分钟）',
                '调参 → 回放 → 导出 → 导入 → UE 播放', bg_image=I['demo'],
                bg_alpha=0.88)
    x = 1344
    steps = [('01', '选择案例、调参', '烘焙器实时模拟'),
             ('02', '引擎回放复核', '按导出的贴图播放'),
             ('03', '双平台导出', 'PC 与手游两套素材包'),
             ('04', '检查并导入', '确认后写入 UE'),
             ('05', 'UE 中播放', '粒子系统、贴图、材质实例')]
    y = 214
    for num, tt, sub in steps:
        text(s, x, y, 60, 40, num, size=28, color=ACC, bold=True, lh=1.3)
        text(s, x + 64, y, 420, 40, tt, size=S_BODY, bold=True, lh=1.3)
        text(s, x + 64, y + 42, 420, 36, sub, size=S_SMALL, alpha=A_NOTE, lh=1.4)
        y += 108
    card(s, x, 770, 480, 120, key=True)
    text(s, x + 36, 770, 430, 120, [[{'t': '实际用时 ', 'size': S_BODY, 'alpha': A_SUB},
                                      {'t': '__ 分 __ 秒', 'size': 34, 'bold': True, 'color': ACC}]],
         anchor='m', lh=1.3)
    return s


DEMO_NOTES = ('第 13 页 · 完整操作演示（建议 150 秒，含录屏）',
              '下面用一段录屏演示完整流程：调参、回放复核、双平台导出、导入，最后在 UE 中播放。（播放录屏，约 2 分钟）录屏经过剪辑，实际用时 ×× 分钟。',
              '用户 10-30 02:08「录屏我会出」；步骤同第一版第 11 页；实际用时由用户录完填写')


# 每页：(页面函数, 文稿页号)；录屏页的台词在 DEMO_NOTES（文稿 23 页之外，用户 02:08 说录屏自己出）
PAGES = [(p01, 1), (p02, 2), (p03, 3), (p04, 4), (p05, 5), (p06, 6), (p07, 7), (p08, 8), (p09, 9), (p10, 10),
         (p11, 11), (p12, 12), (p_demo, None), (p13, 13), (p14, 14), (p15, 15), (p16, 16), (p17, 17), (p18, 18),
         (p19, 19), (p20, 20), (p21, 21), (p22, 22), (p23, 23)]


# ---------------------------------------------------------------- 台词（从第三版文稿读取）
def load_notes():
    t = open(WENGAO, encoding='utf-8').read()
    parts = re.split(r'\n### 第 (\d+) 页 · ([^\n（]+)（[^\n]*?；(\d+) 秒）', t)
    out = {}
    for i in range(1, len(parts), 4):
        n, title, sec, body = int(parts[i]), parts[i + 1].strip(), parts[i + 2], parts[i + 3]
        body = body.split('\n### ')[0]
        nar = ''.join(re.findall(r'^> (.+)$', body, re.M))
        m = re.search(r'\*\*依据\*\*：(.+)', body)
        out[n] = (f'第 {n} 页 · {title}（建议 {sec} 秒）', nar, m.group(1).strip() if m else '')
    return out


def main():
    I = build_images()
    N = load_notes()
    d = Deck(FOOTER)
    md = ['# 讲稿：烟花秀 AI 全流程 · 第三版（组内分享 2026-10-30）', '',
          '> 由 build_v3.py 从 ../第三版逐页文稿_云端.md 生成，与 PPT 每页备注一致。时长按每分钟约 250 字估。', '']
    total = 0
    for i, (fn, wp) in enumerate(PAGES, 1):
        s = fn(d, I)
        head, nar, basis = N[wp] if wp else DEMO_NOTES
        head = re.sub(r'^第 \d+ 页', f'第 {i} 页', head)
        st = [sh for sh in s.shapes if sh.name == 'title']
        stitle = st[0].text_frame.text if st else '封面'
        head = re.sub(r'^(第 \d+ 页) · [^（]+', lambda m: f'{m.group(1)} · {stitle}', head)
        if wp:
            sec = int(round(len(nar) / 250 * 60 / 5.0) * 5)
            head = re.sub(r'（建议 \d+ 秒）', f'（约 {sec} 秒）', head)
        notes(s, head + '\n\n' + nar + ('\n\n依据：' + basis if basis else ''))
        n = len(nar)
        total += n
        md += [f'## {head}', '', nar, '', f'（{n} 字）' + (f'　依据：{basis}' if basis else ''), '']
    md.insert(3, f'全文约 {total} 字，按每分钟 250 字约 {total / 250:.1f} 分钟，另加录屏约 2 分钟；以试讲为准。')
    d.save(OUT, title='烟花秀 AI 全流程', subject='VFX 组内分享 · 2026-10-30')
    with open(SCRIPT_MD, 'w', encoding='utf-8') as f:
        f.write('\n'.join(md))
    print('saved', OUT, 'notes chars', total)


if __name__ == '__main__':
    main()
