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
        I['p04a'] = prep('tex_left.jpg', 'p04_tex.jpg', 552, 420)
    else:
        I['p04a'] = prep('第二版交付/渲染/第02页.png', 'p04_tex.jpg', 552, 420, box=(1248, 214, 1686, 560))
    if has_local('cas_emitters.jpg'):
        I['p04b'] = prep('cas_emitters.jpg', 'p04_cas.jpg', 552, 420)
    else:
        I['p04b'] = prep('第二版交付/渲染/第02页.png', 'p04_cas.jpg', 552, 420, box=(1150, 586, 1772, 860))
    I['p05'] = os.path.join(V1IMG, 'p05_sequencer.jpg')
    for k in ('baker', 'importer', 'workbench', 'ue'):
        I['p06' + k] = os.path.join(V1IMG, f'p06_{k}.jpg')
    I['p07'] = prep('06_烘焙器界面_引擎回放.jpg', 'p07_replay.jpg', 1008, 446, focus=(0.5, 0.5))
    I.update({'p08' + k: v for k, v in framing_panels().items()})
    I['p09a'] = prep('analysis/results/FC6O_Blender/FC6O_atlas.png', 'p09_fan_atlas.jpg', 571, 354, mode='contain')
    I['p09b'] = prep('analysis/results/CS3_RT6/CS3S_atlas.png', 'p09_trail_atlas.jpg', 571, 354, mode='contain')
    I['p10'] = os.path.join(V1IMG, 'p09_importer.jpg')
    I['p12'] = os.path.join(V1IMG, 'p10_workbench.jpg')
    I['p13'] = prep('03_UE跨年秀_金色扇面.jpg', 'p13_ue.jpg', 1162, 372, focus=(0.5, 0.42))
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
    I['demo'] = prep('06_烘焙器界面_引擎回放.jpg', 'demo_bg.jpg', 1200, 675, focus=(0.5, 0.5))
    I['p21'] = prep('05_烘焙器界面_仙女棒.jpg', 'p21_baker.jpg', 1728, 500, focus=(0.5, 0.42))
    return I


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
    text(s, L, 444, 1100, 44, '一个多月，从做效果、进引擎到排节目', size=28, alpha=A_NOTE, lh=1.4)
    end_bar(s, L, 524, 72)
    rect(s, L, 716, 320, 1, fill=TXT, fill_alpha=0.14)
    items = [('01', '问题'), ('02', '解决思路'), ('03', '实践成果'), ('04', '经验与方法'), ('05', '分享')]
    for i, (num, name) in enumerate(items):
        y = 736 + i * 46
        text(s, L, y, 44, 40, num, size=26, color=ACC, bold=True, lh=1.3)
        text(s, L + 52, y, 300, 40, name, size=26, alpha=A_SUB, lh=1.3)
    return s


def p02(d, I):
    s = d.slide('01 · 问题 · 规模', '今年的烟花秀，种类和时长都比去年大得多')
    text(s, L, 214, 1008, 230, [[{'t': '3', 'size': 200, 'alpha': 0.45, 'bold': True},
                                  {'t': ' → ', 'size': 120, 'alpha': 0.45, 'bold': True},
                                  {'t': '26', 'size': 200, 'color': ACC, 'bold': True}]], lh=1.0)
    text(s, L, 444, 1008, 50, '去年 3 种烟花 → 今年 26 种开花花型', size=S_CARD + 6, bold=True, lh=1.3)
    rect(s, L, 530, 1008, 1, fill=TXT, fill_alpha=0.12)
    rows = [('约 3 倍', '节目时长', '约 70 秒 → 约 220 秒'),
            ('6 档', '升空尾缀', '按开花高度分档，另有一套窜天猴'),
            ('2 套', '两个平台', 'PC、手游各一套，手游再分高配与中低配')]
    y = 562
    for num, head, body in rows:
        text(s, L, y, 260, 70, num, size=56, color=TXT, bold=True, lh=1.1)
        text(s, L + 290, y + 2, 700, 40, head, size=S_BODY, bold=True, lh=1.3)
        text(s, L + 290, y + 42, 700, 36, body, size=S_SMALL, alpha=A_SUB, lh=1.4)
        y += 120
    text(s, L, 930, 1008, 36, '花型按 UE 资源表「跨年烟花 3.0」统计，同名不同尺寸、同一花的分段合并计；去年为口述',
         size=S_SMALL - 2, alpha=A_FOOT, lh=1.4)
    image(s, I['p02'], COL40_X, 214, COL40_W, 742, tag='UE 实机 · 今年')
    return s


def p03(d, I):
    s = d.slide('01 · 问题 · 出图', '每种烟花都要单独处理出图规格，手工做不过来')
    # 左：一格导出贴图，标出面片、爆点、内容
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
    text(s, X + 20, Y + 16, 400, 34, '面片（贴图里的一格）', size=S_SMALL, alpha=A_SUB, bold=True, lh=1.2)
    text(s, X, Y + W + 18, W, 70, ['四周的黑也占着分辨率', {'t': '烘焙器导出效果 · 扇形 · 一格 512×512', 'alpha': A_FOOT}],
         size=S_SMALL, alpha=A_SUB, lh=1.5)
    # 右：6 件事
    rx, rw = 784, 1040
    text(s, rx, 214, rw, 44, '出图前，每种烟花要定 6 件事', size=S_CARD + 2, bold=True, lh=1.3)
    things = [('取景', '面片取多大，爆点放在哪'), ('帧数', '几十帧分给开花、下垂、熄灭'),
              ('格子', '圆形、下垂、细长，排法不同'), ('打包', '几十帧装进一张贴图'),
              ('颜色与裁剪', 'Ramp 查色，Cutout 去透明区'), ('两个平台', 'PC、手游分辨率与发射器不同')]
    cw, ch, gx, gy = 510, 118, 20, 18
    for i, (h, b) in enumerate(things):
        cx = rx + (i % 2) * (cw + gx)
        cy = 280 + (i // 2) * (ch + gy)
        card(s, cx, cy, cw, ch)
        text(s, cx + 24, cy + 10, 60, 50, f'{i + 1:02d}', size=30, color=ACC, bold=True, lh=1.3)
        text(s, cx + 84, cy + 14, cw - 100, 40, h, size=S_BODY, bold=True, lh=1.3)
        text(s, cx + 84, cy + 62, cw - 100, 40, b, size=S_SMALL, alpha=A_SUB, lh=1.3)
    card(s, rx, 714, rw, 242, key=True)
    text(s, rx + 40, 738, rw - 80, 36, '之前的做法', size=S_LABEL, color=ACC, bold=True, spc=4, lh=1.3)
    text(s, rx + 40, 784, rw - 80, 140, ['手工：渲染后在软件里裁、排、合通道，再回 Cascade 手算尺寸和曲线，效果一改就重来。',
                                          '试过让 AI 写脚本驱动 Blender 出图：能出，但每轮要等渲染，调参看不到最终效果。'],
         size=S_SMALL + 1, alpha=A_SUB, lh=1.55, space_after=10)
    return s


def p04(d, I):
    s = d.slide('01 · 问题 · 进引擎', '进引擎时，每张贴图、每个实例都要按规范设置')
    card(s, L, 214, 518, 742, key=True)
    text(s, 140, 252, 440, 150, '212', size=150, color=ACC, bold=True, lh=1.0)
    text(s, 140, 418, 440, 50, '张引用贴图', size=34, bold=True, lh=1.3)
    text(s, 140, 500, 440, 120, '115', size=104, bold=True, lh=1.0)
    text(s, 140, 616, 440, 50, '个材质实例', size=34, bold=True, lh=1.3)
    text(s, 140, 860, 430, 70, ['跨年烟花 3.0 资源，两个平台合计'], size=S_SMALL, alpha=A_FOOT, lh=1.5)
    rx, rw = 662, 1162
    rows = [('贴图', '流送、贴图组、Mip 等，按用途和平台各不相同'),
            ('材质实例与发射器', '参数、包围盒、朝向都要设'),
            ('每改一版', '重新创建、重新设置一遍；漏一项往往到实机才发现')]
    y = 214
    for h, b in rows:
        green_sq(s, rx, y + 15)
        text(s, rx + 30, y, 380, 44, h, size=S_CARD, bold=True, lh=1.3)
        text(s, rx + 30 + 300, y + 3, rw - 330, 44, b, size=S_SMALL + 2, alpha=A_SUB, lh=1.4)
        y += 70
    image(s, I['p04a'], rx, 450, 571, 420, tag='UE 编辑器 · 贴图')
    image(s, I['p04b'], rx + 591, 450, 571, 420, tag='UE 编辑器 · 发射器')
    text(s, rx, 890, rw, 40, '一张张点开、一项项设置，资源一多就容易漏', size=S_SMALL, alpha=A_NOTE, lh=1.4)
    return s


def p05(d, I):
    s = d.slide('01 · 问题 · 排节目', '去年在定序器里手工排，今年这样排已经改不动')
    image(s, I['p05'], L, 214, COL60_W, 742, tag='UE 编辑器 · 去年的定序器')
    x = COL40_X
    label_text(s, x, 214, COL40_W, '去年')
    text(s, x, 256, COL40_W, 140, ['定序器里手工拼：12 条子序列、', '两千多条轨道', '改一处节奏要重新对很多条',
                                    '性能组反馈内存占用偏高'], size=S_BODY - 2, alpha=A_SUB, lh=1.55)
    rect(s, x, 520, COL40_W, 1, fill=TXT, fill_alpha=0.12)
    label_text(s, x, 548, COL40_W, '今年')
    rows = [('约 3 倍', '时长'), ('24', '个发射点位'), ('6 档', 'PC、手游按画质分档')]
    y = 596
    for n, c in rows:
        text(s, x, y, COL40_W, 70, [[{'t': n, 'size': 56, 'bold': True, 'color': TXT},
                                      {'t': '  ' + c, 'size': S_BODY - 2, 'alpha': A_SUB}]], lh=1.1)
        y += 82
    text(s, x, 858, COL40_W, 100, ['版本时间紧；新做了导演蓝图（与程序共同设计），', '但对着表格手工对音乐节奏，仍然很难改'],
         size=S_SMALL, alpha=A_NOTE, lh=1.5)
    return s


def p06(d, I):
    s = d.slide('02 · 解决思路', '三个问题对应三个工具，用固定格式首尾衔接')
    nodes = [(I['p06baker'], '出图', '烟花烘焙器', ['模拟、取景、打包，', '一次导出 PC 与手游两套']),
             (I['p06importer'], '进引擎', '导入器', ['检查素材包，', '按规范创建与设置']),
             (I['p06workbench'], '排节目', '烟花编排工作台', ['音乐、点位、模板', '生成导演表']),
             (I['p06ue'], '播放', 'UE 导演蓝图', ['按子模板、模板、', '时序三张表播放'])]
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
    text(s, L + 40, 758, 920, 44, '分工：我定方向，AI 写工具，结果回 UE 验收', size=S_CARD, bold=True, lh=1.3)
    text(s, L + 40, 814, 920, 90, '目标、审美和引擎限制由我来定；工具由 AI 来写；每一轮的结果都回到 UE 里看。',
         size=S_BODY - 2, alpha=A_SUB, lh=1.6)
    end_bar(s, L + 40, 920)
    card(s, COL40_X, 730, COL40_W, 226)
    text(s, COL40_X + 40, 758, 600, 44, '和其他组一起定的部分', size=S_CARD, bold=True, lh=1.3)
    text(s, COL40_X + 40, 814, 600, 120, ['导演蓝图：与程序共同设计', '贴图规范：与性能组共同确定'], size=S_BODY - 2,
         alpha=A_SUB, lh=1.6)
    return s


def p07(d, I):
    s = d.slide('02 · 解决思路 · 出图', '烘焙器：让出图看得见、出得快、按项目定制')
    card(s, L, 214, 672, 742)
    label_text(s, L + 40, 246, 600, '之前')
    text(s, L + 40, 290, 600, 100, ['AI 写脚本驱动 Blender', '输出贴图'], size=S_CARD + 4, bold=True, lh=1.35)
    pts = [('能出图', True), ('每轮要等离线渲染', False), ('调参时看到的不是最终输出', False), ('规格要等出完才能确认', False)]
    y = 430
    for t, ok in pts:
        rect(s, L + 40, y + 13, 14, 14, fill=TXT, fill_alpha=0.85 if ok else 0.35)
        text(s, L + 70, y, 560, 44, t, size=S_BODY, alpha=A_BODY if ok else A_SUB, lh=1.4)
        y += 62
    rect(s, L + 40, 700, 592, 1, fill=TXT, fill_alpha=0.12)
    text(s, L + 40, 724, 592, 200, ['烟花在游戏里是朝向镜头的面片，', '播的是粒子运动。', '所以只做游戏视角的 2D 烘焙器，',
                                     '不追求完整三维场景。'], size=S_SMALL + 2, alpha=A_SUB, lh=1.6)
    rx, rw = 816, 1008
    image(s, I['p07'], rx, 214, rw, 446, tag='工具界面 · 引擎回放')
    cols = [('看得见', ['实时模拟调参；', '导出后按导出贴图回放']),
            ('出得快', ['改完参数当场看；', '直接导出引擎要的格式']),
            ('按项目定制', ['按这次的舞台、视距', '和 Cascade 规范设计'])]
    cw = (rw - 2 * 36) / 3
    for i, (h, b) in enumerate(cols):
        x = rx + i * (cw + 36)
        text(s, x, 690, cw, 40, f'0{i + 1}', size=30, color=ACC, bold=True, lh=1.2)
        text(s, x, 732, cw, 46, h, size=S_CARD + 2, bold=True, lh=1.3)
        text(s, x, 786, cw, 90, b, size=S_SMALL, alpha=A_SUB, lh=1.55)
    text(s, rx, 906, rw, 44, '重点不是换软件，而是让预览、输出和引擎里的效果对得上', size=S_BODY - 2, color=ACC, lh=1.4)
    return s


def p08(d, I):
    s = d.slide('02 · 解决思路 · 出图', '取景流程化：让贴图的像素尽量用在烟花上')
    pw, gap = 552, 36
    panels = [('p08fixed', '固定框（默认）', '整段的最大范围一个框'),
              ('p08zoom', '随开花放大', '以爆点为中心长大；扇形开满反而更空'),
              ('p08anchor', '锚在爆点', '偏一侧的花，只朝有内容的方向放大')]
    ratios = ['0.20', '0.21', '0.41']
    for i, (k, h, b) in enumerate(panels):
        x = L + i * (pw + gap)
        image(s, I[k], x, 214, pw, 420)
        text(s, x + 20, 228, 300, 34, f'0{i + 1}', size=S_SMALL, color=ACC, bold=True, lh=1.2)
        text(s, x, 648, pw, 44, h, size=S_CARD, bold=True, lh=1.3)
        text(s, x, 700, pw, 40, b, size=S_SMALL, alpha=A_SUB, lh=1.4)
        text(s, x + pw - 150, 646, 150, 52, ratios[i], size=44, color=ACC if i == 2 else TXT, bold=True,
             align='r', lh=1.1)
    text(s, L, 740, W_CONTENT, 34, '示意图：同一帧扇形放进三种面片框，绿点为爆点；数字为扇形测试中各帧「内容占面片」比例的中位数',
         size=S_SMALL - 2, alpha=A_FOOT, lh=1.3)
    rect(s, L, 786, W_CONTENT, 1, fill=TXT, fill_alpha=0.12)
    steps = [('烘完收紧', '按每帧实际内容再收一次；\v几乎全黑的帧不收'),
             ('曲线精简', '面片大小最多分 12 级；\v曲线点从近百个减到二十几个'),
             ('帧数分配', '动得快的阶段帧给得密，\v慢的阶段少给'),
             ('停用紧凑取景', '逐帧紧裁、面片跟着跑，\v在引擎里会抖')]
    sw = (W_CONTENT - 3 * 40) / 4
    for i, (h, b) in enumerate(steps):
        x = L + i * (sw + 40)
        text(s, x, 806, sw, 44, h, size=S_BODY, bold=True, color=ACC if i < 3 else TXT, lh=1.3)
        text(s, x, 854, sw, 110, b, size=S_SMALL, alpha=A_SUB, lh=1.55)
    return s


def p09(d, I):
    s = d.slide('02 · 解决思路 · 出图', '打包流程化：一张图装 64 帧，PC 和手游一次导出')
    card(s, L, 214, 518, 742, key=True)
    text(s, 140, 252, 440, 170, '64', size=170, color=ACC, bold=True, lh=1.0)
    text(s, 140, 436, 440, 50, '帧装进一张贴图', size=34, bold=True, lh=1.3)
    text(s, 140, 500, 420, 110, ['4×4 格 × RGBA 四个通道', 'R 填满再 G、B、A'], size=S_BODY - 2, alpha=A_SUB, lh=1.6)
    rect(s, 140, 640, 420, 1, fill=TXT, fill_alpha=0.12)
    text(s, 140, 668, 420, 200, ['贴图只存灰度，颜色交给 Ramp 查色：', '同一套序列换颜色不用重烘'], size=S_SMALL + 1,
         alpha=A_SUB, lh=1.6)
    rx, rw = 662, 1162
    image(s, I['p09a'], rx, 214, 571, 354, tag='工具界面')
    image(s, I['p09b'], rx + 591, 214, 571, 354, tag='工具界面')
    text(s, rx, 578, 571, 36, '扇形 · 4×4×RGBA · 64 帧', size=S_SMALL, alpha=A_SUB, align='c', lh=1.3)
    text(s, rx + 591, 578, 571, 36, '升空尾缀 · 16×1 长条 × RGBA · 64 帧', size=S_SMALL, alpha=A_SUB, align='c', lh=1.3)
    items = [('格子跟形状走', '圆形用方格，下垂的柳用竖长格，细长尾缀用 16×1 长条'),
             ('Cutout 减透明区', '所有帧叠出轮廓，裁成 8 顶点；省不到一成就不出，重复的只留一张'),
             ('两个平台一次导出', 'PC 与手游各一套，手游贴图不超过 1024'),
             ('出包前先回放', '「引擎回放」按导出的贴图放一遍，再交给导入器')]
    cw = (rw - 40) / 2
    for i, (h, b) in enumerate(items):
        x = rx + (i % 2) * (cw + 40)
        y = 650 + (i // 2) * 160
        green_sq(s, x, y + 14)
        text(s, x + 30, y, cw - 30, 44, h, size=S_BODY, bold=True, lh=1.3)
        text(s, x + 30, y + 48, cw - 30, 90, b, size=S_SMALL, alpha=A_SUB, lh=1.5)
    return s


def p10(d, I):
    s = d.slide('02 · 解决思路 · 进引擎', '导入器：把引擎设置规范写进工具，确认后才写入 UE')
    image(s, I['p10'], L, 214, COL60_W, 630, tag='工具界面 · 烘焙器「资源交付」页')
    text(s, L, 866, COL60_W, 80, ['灵感来自原特效工作台的配表入口；导入器嵌在烘焙器里，导出后直接进导入清单'], size=S_SMALL,
         alpha=A_NOTE, lh=1.5)
    x = COL40_X
    steps = [('01', '读包检查', '命名、尺寸、平台和规范项；\v不合格的先拦下'),
             ('02', '按平台创建与设置', '贴图、材质实例、发射器\v按规范设好'),
             ('03', '读回核对', '写完再读一遍，和规范对照')]
    y = 220
    for n, h, b in steps:
        numbered(s, x, y, COL40_W, n, h, b)
        y += 160
    card(s, x, 720, COL40_W, 236, key=True)
    text(s, x + 40, 746, 600, 44, '我点「导入」才写进 UE', size=S_CARD, bold=True, lh=1.3)
    text(s, x + 40, 800, 600, 120, ['自动检查不改工程；', '和性能组定的规范写在工具里，', '不用每次靠人记'], size=S_SMALL + 1,
         alpha=A_SUB, lh=1.55)
    return s


def p11(d, I):
    s = d.slide('02 · 解决思路 · 排节目', '编排先从舞台推出规则，再按规则排')
    # 舞台与点位示意
    X0, X1, Yb = L + 40, L + 1048, 470
    label_text(s, L, 214, 600, '舞台与点位 · 设计值')
    rect(s, X0, Yb - 196, X1 - X0, 196, fill=ACC, fill_alpha=0.04, line=ACC, line_alpha=0.25, line_w=1, dash=True)
    rect(s, X0, Yb, X1 - X0, 4, fill=TXT, fill_alpha=0.35)
    text(s, X0 + 10, Yb - 200, 200, 34, '高约 150 m', size=S_SMALL - 2, alpha=A_NOTE, lh=1.2)
    step = (X1 - X0) / 8
    for i in range(9):
        cx = X0 + i * step
        rect(s, cx - 11, Yb - 30, 22, 22, fill=ACC, shape=MSO_SHAPE.OVAL)
        if i < 8:
            rect(s, cx + step / 2 - 7, Yb - 26, 14, 14, fill=TXT, fill_alpha=0.75, shape=MSO_SHAPE.OVAL)
    fx0 = X0 + step * 2.2
    fstep = step * 3.6 / 6
    for i in range(7):
        cx = fx0 + i * fstep
        rect(s, cx - 6, Yb + 24, 12, 12, fill=TXT, fill_alpha=0.45, shape=MSO_SHAPE.OVAL)
    line(s, X0, Yb + 74, X1, Yb + 74, color=TXT, alpha=0.35, w=2)
    text(s, X0, Yb + 82, X1 - X0, 34, '宽约 800 m · 点距约 100 m', size=S_SMALL, alpha=A_SUB, align='c', lh=1.2)
    leg = [(ACC, None, '主点 P0–P8 · 9 个'), (TXT, 0.75, '中间点 B0–B7 · 8 个'), (TXT, 0.45, '前台点 F0–F6 · 7 个')]
    for i, (c, a, t) in enumerate(leg):
        lx = L + 40 + i * 340
        rect(s, lx, 640, 16, 16, fill=c, fill_alpha=a, shape=MSO_SHAPE.OVAL)
        text(s, lx + 28, 628, 300, 40, t, size=S_SMALL, alpha=A_SUB, lh=1.4)
    text(s, L + 40, 690, 1000, 40, '合计 24 个发射点位', size=S_BODY - 2, bold=True, lh=1.4)
    # 右：分档
    x = 1200
    w = 1824 - x
    label_text(s, x, 214, w, '花径与点距之比 → 分档')
    text(s, x, 256, w, 100, ['约 1.5 倍还分得清；', '两倍多连成花墙；再大就糊'], size=S_SMALL + 1, alpha=A_SUB, lh=1.55)
    heads = ['档', '花径', '开花高度', '尾缀']
    rows = [('S', '90 m', '+150 m', 'S'), ('M', '150 m', '+210 m', 'M'), ('L', '230 m', '+330 m', 'L'),
            ('主角', '280 m', '+400 m', 'Hero')]
    cx = [x, x + 120, x + 280, x + 470]
    for j, hh in enumerate(heads):
        text(s, cx[j], 380, 200, 34, hh, size=S_SMALL - 2, alpha=A_FOOT, bold=True, lh=1.2)
    y = 420
    for r in rows:
        rect(s, x, y, w, 1, fill=TXT, fill_alpha=0.10)
        for j, v in enumerate(r):
            text(s, cx[j], y + 12, 200, 40, v, size=S_BODY - 2 if j else S_BODY, bold=(j == 0),
                 color=ACC if j == 0 else TXT, alpha=A_BODY if j == 0 else A_SUB, lh=1.3)
        y += 64
    rect(s, x, y, w, 1, fill=TXT, fill_alpha=0.10)
    text(s, x, y + 14, w, 40, '花径为构图目标；高度相对坝顶', size=S_SMALL - 2, alpha=A_FOOT, lh=1.3)
    # 下：推导链
    chain = ['舞台与点位', '花径与点距之比', '分档定高度', '重叠与同刻检查', '编排宪章', '每版自动检查']
    cw, gap = 250, 45.6
    for i, t in enumerate(chain):
        bx = L + i * (cw + gap)
        rect(s, bx, 812, cw, 72, fill=ACC, fill_alpha=0.08 if i != 4 else 0.16, line=ACC, line_alpha=A_GREEN_LINE)
        text(s, bx, 812, cw, 72, t, size=S_SMALL + 1, bold=(i == 4), align='c', anchor='m', lh=1.2)
        if i < 5:
            line(s, bx + cw + 6, 848, bx + cw + gap - 6, 848, alpha=0.7, w=2, arrow=True)
    text(s, L, 906, W_CONTENT, 40, '以上是设计值；实机机位和点距与设计有出入时，以实机校正', size=S_SMALL, alpha=A_NOTE, lh=1.4)
    return s


def p12(d, I):
    s = d.slide('02 · 解决思路 · 排节目', '编排工作台：在时间轴上排，导出导演蓝图要的三张表')
    image(s, I['p12'], L, 214, W_CONTENT, 440, tag='工具界面 · 烟花编排工作台')
    card(s, L, 684, COL60_W, 272, key=True)
    label_text(s, L + 40, 708, 600, '可视化')
    text(s, L + 40, 752, 920, 50, '音乐波形、点位、烟花模板在同一条时间轴上', size=S_CARD, bold=True, lh=1.3)
    text(s, L + 40, 810, 920, 100, '对着音乐改节奏、换模板；改完就能看', size=S_BODY - 2, alpha=A_SUB, lh=1.6)
    end_bar(s, L + 40, 916)
    card(s, COL40_X, 684, COL40_W, 272)
    label_text(s, COL40_X + 40, 708, 600, '程序化')
    text(s, COL40_X + 40, 752, 600, 50, '按宪章检查，一键出三张表', size=S_CARD, bold=True, lh=1.3)
    text(s, COL40_X + 40, 810, 600, 120, ['重叠、档位、预算每次都查；', '子模板、模板、时序三张表给导演蓝图'], size=S_SMALL + 1,
         alpha=A_SUB, lh=1.55)
    return s


def p13(d, I):
    s = d.slide('03 · 实践成果 · 出图', '资源成果：26 种开花、6 档尾缀和一套窜天猴进了资源表')
    card(s, L, 214, 518, 742, key=True)
    text(s, 140, 252, 440, 170, '26', size=170, color=ACC, bold=True, lh=1.0)
    text(s, 140, 436, 440, 50, '种开花花型', size=34, bold=True, lh=1.3)
    text(s, 140, 496, 420, 60, '按尺寸共 30 个规格', size=S_BODY - 2, alpha=A_SUB, lh=1.5)
    rect(s, 140, 590, 420, 1, fill=TXT, fill_alpha=0.12)
    text(s, 140, 616, 420, 70, [[{'t': '20', 'size': 64, 'bold': True}, {'t': ' / 26', 'size': 36, 'alpha': A_SUB,
                                                                          'bold': True}]], lh=1.05)
    text(s, 140, 696, 420, 120, ['保留烘焙器配方和导出记录，', '要调整时改参数重新导出'], size=S_SMALL + 1, alpha=A_SUB, lh=1.55)
    text(s, 140, 860, 420, 80, ['按资源表花型统计，含素材复用，', '不等于 26 套独立模拟'], size=S_SMALL - 2, alpha=A_FOOT, lh=1.5)
    rx, rw = 662, 1162
    image(s, I['p13'], rx, 214, rw, 372, tag='UE 实机')
    rows = CATEGORY_ROWS
    heads = [(rx, '分类'), (rx + 520, 'PC'), (rx + 840, '手游')]
    for x, t in heads:
        text(s, x, 610, 300, 34, t, size=S_SMALL - 2, alpha=A_FOOT, bold=True, lh=1.2)
    y = 648
    rh = (956 - 648) / len(rows)
    for name, pc, mb in rows:
        rect(s, rx, y, rw, 1, fill=TXT, fill_alpha=0.10)
        text(s, rx, y, 500, rh, name, size=S_SMALL + 2, bold=True, anchor='m', lh=1.3)
        text(s, rx + 520, y, 310, rh, pc, size=S_SMALL + 1, alpha=A_SUB, anchor='m', lh=1.3)
        text(s, rx + 840, y, 322, rh, mb, size=S_SMALL + 1, alpha=A_SUB, anchor='m', lh=1.3)
        y += rh
    return s


CATEGORY_ROWS = [('开花花型', '26 种 · 30 个规格', '12 种'),
                 ('升空尾缀', '6 档', '6 档'),
                 ('窜天猴', '1 套 · 7 个组件', '1 套 · 6 个组件'),
                 ('引用贴图 · 材质实例', '212 张 · 115 个', '（两平台合计）')]


def p14(d, I):
    s = d.slide('03 · 实践成果 · 进引擎', '接入成果：整批按规范重设，读回全部一致')
    text(s, L, 214, 1000, 170, [[{'t': '149', 'size': 150, 'color': ACC, 'bold': True},
                                  {'t': '/149', 'size': 96, 'color': ACC, 'bold': True}]], lh=1.0)
    text(s, L, 392, 1000, 50, '张贴图按规范重设，读回全部一致', size=S_CARD + 2, bold=True, lh=1.3)
    text(s, L, 448, 1000, 80, '别的项目也在用的共享贴图单独列出核对，不跟着改', size=S_BODY - 2, alpha=A_SUB, lh=1.6)
    text(s, L, 556, 1000, 140, [[{'t': '115', 'size': 120, 'bold': True}, {'t': ' 个包', 'size': 32, 'bold': True}]],
         lh=1.0)
    text(s, L, 698, 1000, 80, '48 个粒子系统、67 个材质实例，修正后读回无错误', size=S_BODY - 2, alpha=A_SUB, lh=1.6)
    rect(s, L, 800, 1008, 1, fill=TXT, fill_alpha=0.12)
    text(s, L, 826, 1008, 110, ['和性能组定下贴图规范后，已经导入的资源整批补齐；', '规范同时写进导入器，新资源导入时自动按规范设置'],
         size=S_SMALL, alpha=A_NOTE, lh=1.6)
    x = COL40_X
    card(s, x, 214, COL40_W, 742, key=True)
    text(s, x + 44, 250, 600, 50, '之后每改一版，都走同一条流程', size=S_CARD, bold=True, lh=1.3)
    flow = ['烘焙器导出两套', '导入器读包检查', '按平台创建与设置', '读回核对', 'UE 里看实际画面']
    y = 340
    for i, t in enumerate(flow):
        rect(s, x + 44, y, 584, 76, fill=ACC, fill_alpha=0.08, line=ACC, line_alpha=A_GREEN_LINE)
        text(s, x + 64, y, 60, 76, f'0{i + 1}', size=S_SMALL + 2, color=ACC, bold=True, anchor='m', lh=1.2)
        text(s, x + 124, y, 480, 76, t, size=S_BODY - 2, anchor='m', lh=1.2)
        if i < len(flow) - 1:
            line(s, x + 336, y + 80, x + 336, y + 112, alpha=0.7, w=2, arrow=True)
        y += 116
    return s


def p15(d, I):
    s = d.slide('03 · 实践成果 · 排节目', '编排成果：同一份节目，按平台和画质分档出表')
    card(s, L, 214, COL60_W, 742)
    text(s, L + 40, 244, 900, 40, '同一份编排 · 各档播放次数', size=S_BODY, bold=True, lh=1.3)
    data = [('PC', [('高', 1145), ('中', 852), ('低', 438)]), ('手游', [('高', 448), ('中', 349), ('低', 181)])]
    base, top = 860, 340
    vmax = 1145
    bw, gap_in, gap_grp = 104, 28, 96
    x = L + 80
    for gi, (g, bars) in enumerate(data):
        gx0 = x
        for name, v in bars:
            h = (base - top) * v / vmax
            rect(s, x, base - h, bw, h, fill=ACC if (gi == 0 and name == '高') else TXT,
                 fill_alpha=None if (gi == 0 and name == '高') else 0.32)
            text(s, x - 20, base - h - 44, bw + 40, 36, str(v), size=S_SMALL + 2, bold=True, align='c', lh=1.2)
            text(s, x, base + 10, bw, 34, name, size=S_SMALL, alpha=A_SUB, align='c', lh=1.2)
            x += bw + gap_in
        text(s, gx0, base + 48, x - gap_in - gx0, 36, g, size=S_BODY - 2, bold=True, align='c', lh=1.2)
        x += gap_grp - gap_in
    rect(s, L + 60, base, COL60_W - 120, 1, fill=TXT, fill_alpha=0.25)
    xr = COL40_X
    text(s, xr, 214, COL40_W, 130, [[{'t': '11', 'size': 120, 'color': ACC, 'bold': True},
                                      {'t': ' 个大版本', 'size': 32, 'bold': True}]], lh=1.0)
    text(s, xr, 354, COL40_W, 40, '每一版都有自动检查记录', size=S_BODY - 2, alpha=A_SUB, lh=1.4)
    rect(s, xr, 420, COL40_W, 1, fill=TXT, fill_alpha=0.12)
    y = 450
    for h, b in [('不用每档单独排', '同一份编排按平台和画质筛选出表'),
                 ('改节奏回工作台', '改完重新出表，UE 只按表播放')]:
        y = item(s, xr, y, COL40_W, h, b, head_size=S_BODY, body_h=60) + 24
    card(s, xr, 800, COL40_W, 156, key=True)
    text(s, xr + 40, 820, 600, 120, ['如实说明：节拍对齐指标', '还没达到宪章目标，仍在调'], size=S_SMALL + 1, alpha=A_SUB, lh=1.6)
    return s


def p16(d, I):
    s = d.slide('03 · 实践成果 · 投入', '一个人对接 AI，贯穿需求、制作、验收和编排')
    cards = [('定方向', ['需求、目标与限制', '舞台与编排设计']),
             ('做判断', ['美术把关、UE 验收', '规范取舍']),
             ('管协作', ['拆分任务、维护规则', '让工作能一段段接续'])]
    for i, (h, b) in enumerate(cards):
        x = L + i * (544 + 48)
        card(s, x, 214, 544, 440)
        text(s, x + 44, 246, 200, 80, f'0{i + 1}', size=64, color=ACC, bold=True, lh=1.0)
        text(s, x + 44, 346, 460, 56, h, size=40, bold=True, lh=1.3)
        text(s, x + 44, 420, 460, 120, b, size=S_BODY - 2, alpha=A_SUB, lh=1.7)
        end_bar(s, x + 44, 600)
    rect(s, L, 700, W_CONTENT, 1, fill=TXT, fill_alpha=0.12)
    stats = [('约 2200', '次项目提交', '其中约 350 次是显卡后台自动回传'),
             ('近 200', '个烘焙器版本号', '功能、配方与修复都算在内')]
    for i, (n, c, note) in enumerate(stats):
        x = L + i * (544 + 48)
        text(s, x, 736, 540, 100, n, size=84, bold=True, lh=1.05)
        text(s, x, 842, 540, 40, c, size=S_BODY - 2, bold=True, lh=1.3)
        text(s, x, 886, 540, 40, note, size=S_SMALL - 2, alpha=A_FOOT, lh=1.3)
    x = L + 2 * (544 + 48)
    text(s, x, 742, 544, 200, ['导演蓝图：与程序共同设计', '贴图规范：与性能组共同确定'], size=S_SMALL + 1, alpha=A_SUB, lh=1.7)
    return s


def p17(d, I):
    s = d.slide('04 · 经验与方法 · 技术', '尾缀：近段和远段分别表现不同年龄的火星')
    image(s, I['p17'], L, 214, COL60_W, 620, tag='实拍 / 模拟 / 导出 对照')
    text(s, L, 850, COL60_W, 80, ['上：实拍参考；中：实时模拟；下：导出贴图回放（开花后 0.66–5.96 秒）'], size=S_SMALL - 2,
         alpha=A_FOOT, lh=1.4)
    x = COL40_X
    y = 214
    for h, b in [('近段', '循环面片跟着弹体，\v表现刚喷出的火星'),
                 ('远段', '一次性序列，表现留在空中\v慢慢落下的老火星')]:
        y = item(s, x, y, COL40_W, h, b, head_size=S_CARD + 2, body_h=84) + 30
    card(s, x, 560, COL40_W, 396, key=True)
    text(s, x + 40, 588, 600, 36, '帧数怎么分', size=S_LABEL, color=ACC, bold=True, spc=4, lh=1.3)
    text(s, x + 40, 636, 600, 200, ['按游戏里的观看距离，把火星运动换算成屏幕上每帧移动多少像素，再按 30 帧的节拍分配帧数。'],
         size=S_SMALL + 2, alpha=A_SUB, lh=1.6)
    text(s, x + 40, 820, 600, 110, ['远看流畅，近看略软：', '这是有意做的取舍'], size=S_BODY - 2, lh=1.5)
    return s


def p18(d, I):
    s = d.slide('04 · 经验与方法 · 技术', '仙女棒：13 类火星在烘焙时合成，一个发射器播放')
    card(s, L, 214, 518, 742, key=True)
    text(s, 140, 262, 450, 140, '13→1', size=124, color=ACC, bold=True, lh=1.0)
    text(s, 140, 420, 430, 100, ['13 类火星', '合成每平台 1 张 64 帧主序列'], size=S_BODY - 2, alpha=A_SUB, lh=1.55)
    rect(s, 140, 560, 420, 1, fill=TXT, fill_alpha=0.12)
    y = 588
    for h, b in [('以往', '一级、二级分叉，清晰与模糊\v要拆成多套素材在 Cascade 里拼'),
                 ('这次', '子火星在母火星破裂处出生、\v继承部分速度；快门与景深出层次')]:
        text(s, 140, y, 420, 40, h, size=S_BODY - 2, color=ACC, bold=True, lh=1.3)
        text(s, 140, y + 42, 430, 90, b, size=S_SMALL, alpha=A_SUB, lh=1.5)
        y += 150
    rx, rw = 662, 1162
    text(s, rx, 214, rw, 36, '13 类火星（基础来自之前 Blender 工程里的版本）', size=S_SMALL, alpha=A_SUB, bold=True, lh=1.3)
    image(s, I['p18a'], rx, 256, rw, 188)
    image(s, I['p18b'], rx, 452, rw, 188, tag='分层')
    text(s, rx, 662, rw, 36, '合成后的一张 64 帧主序列', size=S_SMALL, alpha=A_SUB, bold=True, lh=1.3)
    image(s, I['p18c'], rx, 704, rw, 252, tag='导出贴图 · UE 观感待验收')
    return s


def p19(d, I):
    s = d.slide('04 · 经验与方法 · 排查', '模糊与方头：固定条件对比后，分开定位')
    pairs = [(I['p19a'], I['p19b'], '方头 · 升空尾缀 3.8 秒'), (I['p19c'], I['p19d'], '先糊后清 · 金芒菊 0.29 秒')]
    for i, (a, b, cap) in enumerate(pairs):
        x = L + i * (492 + 24)
        before_after(s, x, 214, 492, 676, a, b, tag_before='现状', tag_after='NoMip')
        text(s, x, 902, 492, 40, cap, size=S_SMALL, alpha=A_SUB, align='c', lh=1.3)
    source_tag(s, L, 214, 1008, 676, 'UE 实机 · 低档同机位', pos='br')
    x = COL40_X
    y = 214
    for h, b in [('方头', '长条格被压扁后取了较低的 Mip；\v高配看不出，低配才出现'),
                 ('先糊后清', '贴图第一次出现时\v还没流送到位'),
                 ('规则按平台分', 'PC 主序列不用 Mip；手游按内存反馈\v保留 Mip 与流送，最大 1024')]:
        y = item(s, x, y, COL40_W, h, b, head_size=S_CARD, body_h=84) + 26
    card(s, x, 756, COL40_W, 200, key=True)
    text(s, x + 40, 778, 600, 44, '方法', size=S_LABEL, color=ACC, bold=True, spc=4, lh=1.3)
    text(s, x + 40, 822, 600, 110, ['固定机位、画质档位和播放时刻，', '一次只改一个变量，再下结论'], size=S_SMALL + 1, alpha=A_SUB,
         lh=1.6)
    return s


def p20(d, I):
    s = d.slide('04 · 经验与方法 · 排查', '黑点与末格黑块：修好一次，写进导出和导入规则')
    card(s, L, 214, 518, 742, key=True)
    text(s, 140, 262, 430, 60, '修一次', size=56, bold=True, lh=1.2)
    line(s, 160, 350, 160, 410, alpha=0.8, w=3, arrow=True)
    text(s, 140, 424, 430, 60, '写成规则', size=56, color=ACC, bold=True, lh=1.2)
    line(s, 160, 512, 160, 572, alpha=0.8, w=3, arrow=True)
    text(s, 140, 586, 430, 60, '以后不再犯', size=56, bold=True, lh=1.2)
    text(s, 140, 800, 420, 120, ['导出时自动写对；', '导入时见到就拦'], size=S_SMALL + 1, alpha=A_SUB, lh=1.6)
    rx, rw = 662, 1162
    label_text(s, rx, 214, 400, '黑点')
    text(s, rx, 256, rw, 40, '颜色变黑了，透明度还是 1，挡住了后面的画面', size=S_SMALL + 1, alpha=A_SUB, lh=1.4)
    bw = 520
    card(s, rx, 314, bw, 150)
    text(s, rx + 30, 330, 200, 34, '修前', size=S_SMALL, alpha=A_NOTE, bold=True, lh=1.2)
    text(s, rx + 30, 372, bw - 60, 80, ['淡出写在 RGB，', 'Alpha 始终为 1'], size=S_SMALL + 2, lh=1.5)
    line(s, rx + bw + 16, 389, rx + rw - bw - 16, 389, alpha=0.9, w=3, arrow=True)
    card(s, rx + rw - bw, 314, bw, 150, key=True)
    text(s, rx + rw - bw + 30, 330, 200, 34, '修后', size=S_SMALL, color=ACC, bold=True, lh=1.2)
    text(s, rx + rw - bw + 30, 372, bw - 60, 80, ['颜色保持不变，', '淡出写进 Alpha'], size=S_SMALL + 2, lh=1.5)
    text(s, rx, 474, rw, 34, '两版真实导出参数对比；新写法尚无 UE 成对截图', size=S_SMALL - 2, alpha=A_FOOT, lh=1.3)
    rect(s, rx, 530, rw, 1, fill=TXT, fill_alpha=0.12)
    label_text(s, rx, 556, 400, '末格黑块')
    image(s, I['p20'], rx, 606, 330, 330, tag='示意图')
    text(s, rx + 370, 606, rw - 370, 200, ['最亮的地方采样碰到 Ramp 最后一格的黑色。',
                                            'EmissiveDissolve 设为 0.98 后解决，确认有效后写进导出与导入规则。'],
         size=S_SMALL + 2, alpha=A_SUB, lh=1.6, space_after=12)
    return s


def p21(d, I):
    s = d.slide('04 · 经验与方法 · 规则', '参数和界面也立规则：宪章加令牌，统一成 DF 特效工作台风格')
    image(s, I['p21'], L, 214, W_CONTENT, 500, tag='工具界面 · 烟花烘焙器')
    blocks = [('参数宪章', '每个参数先说清是物理量、引擎字段还是预览设置；调了不生效的要变灰并写原因'),
              ('交互宪章 + 设计令牌', '入口、状态、反馈统一写法；颜色等基础值从现有 DF 特效工作台反推，三个工具共用'),
              ('现状', '配色已经共用；组件和形状还在逐步统一')]
    bw = (W_CONTENT - 2 * 40) / 3
    for i, (h, b) in enumerate(blocks):
        x = L + i * (bw + 40)
        green_sq(s, x, 764) if i < 2 else rect(s, x, 764, 12, 12, fill=TXT, fill_alpha=0.4)
        text(s, x + 28, 750, bw - 28, 46, h, size=S_CARD + 2, bold=True, lh=1.3)
        text(s, x + 28, 806, bw - 38, 150, b, size=S_SMALL + 1, alpha=A_SUB, lh=1.6)
    return s


def p22(d, I):
    s = d.slide('05 · 分享 · 方法', '遇到批量需求，我会分三步和 AI 一起做')
    phases = [('01', '想清楚', [('需求说清', '目标、引擎限制、怎样算做完'),
                               ('摸清技术栈', '让 AI 讲清要用哪些技术，选最简单可行的路线'),
                               ('原理先行', '先拆清结构，再调参数')]),
              ('02', '定规矩', [('拆分', '按效果、工具、编排分负责人；共享文件先认领'),
                               ('写成宪章与规范', '标准、参数、交互、编排、贴图各一份'),
                               ('每次执行先读', '先读规范和上次交接，对话中断也能接上')]),
              ('03', '守结果', [('机器先检查', '标准检查、回放检查、合入门禁'),
                               ('状态分开记', '执行结束、AI 自检通过、我验收通过是三件事'),
                               ('锁版本复用', '通过的版本锁定，在同一套规则上派生')])]
    cw, gap = 544, 48
    for i, (n, name, rows) in enumerate(phases):
        x = L + i * (cw + gap)
        cx = x + 60
        rect(s, cx - 50, 214, 100, 100, fill=ACC, fill_alpha=0.06, line=ACC, line_w=3, shape=MSO_SHAPE.OVAL)
        text(s, cx - 50, 214, 100, 100, n, size=36, color=ACC, bold=True, align='c', anchor='m', lh=1.1)
        text(s, x + 136, 232, cw - 140, 64, name, size=44, bold=True, anchor='m', lh=1.2)
        if i < 2:
            arrow_r(s, x + cw - 40, 264, x + cw + gap + 4)
        y = 350
        for h, b in rows:
            rect(s, x, y, cw, 1, fill=TXT, fill_alpha=0.10)
            text(s, x, y + 18, cw, 40, h, size=S_BODY, bold=True, lh=1.3)
            text(s, x, y + 62, cw - 10, 90, b, size=S_SMALL, alpha=A_SUB, lh=1.5)
            y += 172
    rect(s, L, 866, W_CONTENT, 1, fill=TXT, fill_alpha=0.12)
    green_sq(s, L, 906)
    text(s, L + 30, 890, W_CONTENT - 30, 44, '先从一件重复的小事开始：把输入、标准和检查方法写清楚。不是每件事都值得做成工具。',
         size=S_BODY - 2, color=ACC, lh=1.4)
    return s


def p23(d, I):
    s = d.slide('05 · 分享 · 工具', '三个工具和案例，会按同一套流程继续复用')
    heads = [(L, '工具'), (560, '做什么'), (1150, '怎么用')]
    for x, t in heads:
        text(s, x, 214, 500, 36, t, size=S_SMALL, alpha=A_FOOT, bold=True, lh=1.3)
    rows = [('烟花烘焙器', '模拟、取景、打包，引擎回放，一次导出 PC 与手游两套', ['从案例开始改参数', '双击 HTML，Chrome 或 Edge']),
            ('导入器', '检查素材包，按规范创建与设置，确认后写入 UE', ['需要 UE 插件和本机交付服务', '第一次请在测试工程里导入']),
            ('烟花编排工作台', '音乐、点位、模板生成导演表', ['离线页面，打开节目文件即可编辑', '导入器、编排工作台补齐后一起放'])]
    y = 258
    for name, what, how in rows:
        rect(s, L, y, W_CONTENT, 1, fill=TXT, fill_alpha=0.10)
        text(s, L, y + 24, 440, 50, name, size=S_CARD + 2, bold=True, lh=1.3)
        text(s, 560, y + 24, 540, 110, what, size=S_SMALL + 1, alpha=A_SUB, lh=1.55)
        text(s, 1150, y + 24, 674, 120, [how[0], {'t': how[1], 'alpha': A_NOTE}], size=S_SMALL + 1, alpha=A_SUB,
             lh=1.55)
        y += 160
    rect(s, L, y, W_CONTENT, 1, fill=TXT, fill_alpha=0.10)
    text(s, L, 780, 1100, 56, '工具包我会放在 xx 处', size=40, bold=True, lh=1.3)
    text(s, L, 846, 1100, 90, ['案例只是载体，想分享的是一种工作方式：', '从具体问题出发，让 AI 参与实现，把可检查、可复用的结果留下来。'],
         size=S_SMALL + 1, alpha=A_SUB, lh=1.55)
    text(s, 1300, 760, 524, 150, '谢谢', size=120, bold=True, align='r', lh=1.1)
    end_bar(s, 1824 - 72, 916, 72)
    return s


def p_demo(d, I):
    s = d.slide('02 · 解决思路 · 演示', '三个工具串起来：从调参到 UE 里播放')
    placeholder(s, L, 214, 1200, 675, '录屏位：完整操作（约 2 分钟）',
                '选案例调参 → 引擎回放 → 导出 PC 与手游 → 导入器检查写入 → UE 中播放', bg_image=I['demo'],
                bg_alpha=0.88)
    source_tag(s, L, 214, 1200, 675, '底图：工具界面')
    x = 1344
    steps = [('01', '选案例、调参', '烘焙器实时模拟'),
             ('02', '看引擎回放', '按导出的贴图播放'),
             ('03', '一次导出', 'PC 与手游两套素材包'),
             ('04', '检查并导入', '点「导入」才写 UE'),
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
              '三个工具介绍完，看一段完整操作：选一个案例调参，在引擎回放里确认，一次导出 PC 和手游两套，导入器检查后写进 UE，最后在 UE 里播放。（播放录屏，约 2 分钟）录屏经过剪辑，实际用时 ×× 分钟。',
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
        notes(s, head + '\n\n' + nar + ('\n\n依据：' + basis if basis else ''))
        n = len(nar)
        total += n
        md += [f'## {head}', '', nar, '', f'（{n} 字）' + (f'　依据：{basis}' if basis else ''), '']
    md.insert(3, f'全文约 {total} 字，约 {total / 250:.1f} 分钟。')
    d.save(OUT, title='烟花秀 AI 全流程', subject='VFX 组内分享 · 2026-10-30')
    with open(SCRIPT_MD, 'w', encoding='utf-8') as f:
        f.write('\n'.join(md))
    print('saved', OUT, 'notes chars', total)


if __name__ == '__main__':
    main()
