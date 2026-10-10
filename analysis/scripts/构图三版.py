#!/usr/bin/env python3
"""构图三版（对话框22，10-11）：按计划书的画法（正面正投影、横竖同一比例、浅底描边圆、100 m 比例尺）
画同一批「时刻」的三种构图：甲 = 计划书分层行（基线，主角只换种类不放大）；
乙 = 山形，中心大、两翼递减；丙 = 锯齿，一高一低交替。
尺寸 / 高度（相对坝顶）沿计划书与用户 10-08：S 90 m +150（低层 +80）、M 150 m +210、L 230 m +330；
主角 = 金垂柳，三版里先画 280 m（用户 10-11 01:52：280–300 m 都行、同屏 1 个或 3 个可试；420 m 太大已撤回），+400，出现很少；1 个 / 3 个的比较见 hero_options()。
输出 协作/跨年秀编排宪章_图/构图_甲|乙|丙.png。示意，不是 UE 回放。"""
import math
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle, Polygon

plt.rcParams['font.sans-serif'] = ['Noto Sans CJK SC', 'WenQuanYi Zen Hei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False
OUT = Path(__file__).resolve().parents[2] / '协作/跨年秀编排宪章_图'
X = lambda i: (i - 4) * 100          # P0..P8，弧长间距 100 m（计划书正面画法）
DIA = {'S': 90, 'M': 150, 'L': 230, 'H': 230, 'H280': 280, 'H300': 300}
COL = {'S': '#2fae85', 'M': '#3a7bd5', 'L': '#e8643a', 'H': '#c99700', 'H280': '#c99700', 'H300': '#c99700'}
FILL = {'S': '#eaf8f2', 'M': '#eaf1fb', 'L': '#fdeee8', 'H': '#fbf0c8', 'H280': '#fbf0c8', 'H300': '#fbf0c8'}
NAME = {'S': '小', 'M': '中', 'L': '大', 'H': '主角', 'H280': '主角', 'H300': '主角'}


def panel(ax, title, items, fan=True, note=''):
    ax.set_facecolor('white')
    ax.add_patch(Rectangle((-450, -150), 900, 150, fc='#ececea', ec='#bdbdb0', lw=1))
    for i in range(9):
        ax.plot(X(i), 0, marker='^', color='k', ms=4)
    for i in range(8):
        ax.plot(X(i) + 50, 0, marker='.', color='#999', ms=4)
    if fan:
        for k in range(17):
            x0 = -400 + k * 50
            for a in (-26, -13, 0, 13, 26):
                ax.plot([x0, x0 + 38 * math.sin(math.radians(a))], [2, 2 + 42 * math.cos(math.radians(a))], color='#c9c9bd', lw=0.7)
    # 先画大的再画小的，小的在上面
    order = {'H': 0, 'H280': 0, 'H300': 0, 'L': 1, 'M': 2, 'S': 3}
    for (xi, c, h) in sorted(items, key=lambda t: order[t[1]]):
        x, d = X(xi), DIA[c]
        if c.startswith('H'):
            ax.add_patch(Polygon([(x - d / 2, h), (x + d / 2, h), (x + d * .32, h - d * .62), (x - d * .32, h - d * .62)], fc='#f6e3a1', ec='none', alpha=.45))
        ax.add_patch(Circle((x, h), d / 2, fc=FILL[c], ec=COL[c], lw=1.4, alpha=.85))
        ax.plot([x, x], [0, h], color='#bbb', lw=.6, ls=':')
    ax.set_xlim(-530, 530); ax.set_ylim(-150, 600); ax.set_aspect('equal'); ax.axis('off')
    n = {k: sum(1 for t in items if t[1] == k) for k in 'SML'}
    n['H'] = sum(1 for t in items if t[1].startswith('H'))
    tails = {'小': n['S'], '中': n['M'], '大': n['L'] + n['H']}
    ax.set_title(title, fontsize=10.5, loc='left', fontweight='bold', x=0.0)
    s = f"球花 {sum(n.values())}：小{n['S']} 中{n['M']} 大{n['L']} 主角{n['H']}　尾缀同时 小{tails['小']} 中{tails['中']} 大{tails['大']}（每级上限 20）"
    ax.text(-525, -158, s + ('\n' + note if note else ''), fontsize=7.6, va='top', color='#333')
    ax.plot([400, 500], [560, 560], color='k', lw=1); ax.text(450, 570, '100 m', ha='center', fontsize=7)


def row(c, h, idx=range(9), alt=0):
    return [(i, c, h + (alt if i % 2 else -alt)) for i in idx]


def version(name, sub, panels):
    fig, axs = plt.subplots(3, 2, figsize=(12.6, 15.4))
    fig.suptitle(f'构图 {name}　{sub}', fontsize=14, fontweight='bold', x=0.04, ha='left')
    for ax, (t, it, fan, note) in zip(axs.flat, panels):
        panel(ax, t, it, fan, note)
    plt.tight_layout(rect=(0, 0, 1, .97))
    fig.savefig(OUT / f'构图_{name}.png', dpi=100, facecolor='white'); plt.close(fig)


# 甲：计划书分层行（基线）
A = [
 ('① 开场 · M 九点 1.5×，高低交替 ±15；S 低层四点', row('M', 210, alt=15) + [(i, 'S', 80) for i in (1, 3, 5, 7)], True, '计划书「开场三层」：中号一排 + 低层小银菊 + 全宽扇形'),
 ('② 连续展开 · M 九点一排，扇形铺底', row('M', 210), True, '每 4 秒一波，银白 / 金交替'),
 ('③ 第一次抬升 · M 九点 + L 三点压顶（P1/P4/P7）', row('M', 210) + [(i, 'L', 330) for i in (1, 4, 7)], True, '计划书 ⑦：大号在上、中号在下，各自成排'),
 ('④ 主高潮 · M 九点 + L 压顶，中心换主角（+400）+ S 低层', row('M', 210) + [(0, 'L', 330), (8, 'L', 330), (4, 'H280', 400)] + [(i, 'S', 80) for i in (0, 2, 4, 6, 8)], True, '主角 280 m（用户 10-11 01:52：280–300 都行），放高、居中、金色垂裙'),
 ('⑤ 金色终章 · M 九点（金）+ S 五点金裂星（+150）', row('M', 210) + [(i, 'S', 150) for i in (0, 2, 4, 6, 8)], True, '计划书 ⑧'),
 ('⑥ 收束 · L 九点一排 2.3×（一波）', row('L', 330), False, '一波 9 点；下一波 ≥ 6.0 s（现成大号只有银彩菊一种，同种上限 10），见并发预算'),
]
# 乙：山形，中心大、两翼递减
def mountain(c_mid, mids, outs, smalls, top=340):
    pass
B = [
 ('① 开场 · 拱形：M 九点，中心最高 +270、两端 +170', [(i, 'M', 170 + 100 * math.cos(math.pi / 2 * abs(i - 4) / 4)) for i in range(9)], True, '高度顺滑过渡，轮廓是一道拱；直径 / 间距仍 1.5×'),
 ('② 推进 · 斜阶：M 九点自左向右升 +150 → +270', [(i, 'M', 150 + 15 * i) for i in range(9)], True, '下一小节镜像成右低左高，一句「扫」'),
 ('③ 第一次抬升 · 山形：L +340 → M +270 → M +220 → S +160 → S +110', [(4, 'L', 340), (3, 'M', 270), (5, 'M', 270), (2, 'M', 220), (6, 'M', 220), (1, 'S', 160), (7, 'S', 160), (0, 'S', 110), (8, 'S', 110)], True, '大小跟位置走：看一眼就分得出三级'),
 ('④ 主高潮 · 主角居顶 +400，L 两侧 +330，M 递减，S 收边', [(4, 'H280', 400), (2, 'L', 330), (6, 'L', 330), (3, 'M', 260), (5, 'M', 260), (1, 'M', 210), (7, 'M', 210), (0, 'S', 150), (8, 'S', 150)], True, '主角在山顶，两侧 L 呼应'),
 ('⑤ 金色终章 · 双峰：L P2/P6，M 四点，S 三点', [(2, 'L', 330), (6, 'L', 330)] + [(i, 'M', 240) for i in (1, 3, 5, 7)] + [(i, 'S', 150) for i in (0, 4, 8)], True, '中心留谷，给下一发主角留位'),
 ('⑥ 收束 · 弧形墙：L 九点，中心 +340、两端 +290', [(i, 'L', 290 + 50 * math.cos(math.pi / 2 * abs(i - 4) / 4)) for i in range(9)], False, '同一波、9 点；下一波 ≥ 6.0 s（同种上限 10）'),
]
# 丙：锯齿，一高一低
C = [
 ('① 开场 · 高低交替：M 五点 +230，S 四点 +150', [(i, 'M', 230) for i in (0, 2, 4, 6, 8)] + [(i, 'S', 150) for i in (1, 3, 5, 7)], True, '大小隔点交替，中号间距 2×，不相碰，小号嵌在中间'),
 ('② 推进 · 锯齿：M 九点 +190 / +250 交替', [(i, 'M', 250 if i % 2 == 0 else 190) for i in range(9)], True, '计划书的 A / B 高低版本，高低差拉到 60 m'),
 ('③ 第一次抬升 · 城垛：L 五点 +330 相切，M 四点 +210 嵌谷', [(i, 'L', 330) for i in (0, 2, 4, 6, 8)] + [(i, 'M', 210) for i in (1, 3, 5, 7)], True, 'L 间距 200 m = 1.15×，一朵朵排开'),
 ('④ 主高潮 · 城垛 + 主角：L +330，主角 P4 +400，M +210，S +100', [(i, 'L', 330) for i in (0, 2, 6, 8)] + [(4, 'H280', 400)] + [(i, 'M', 210) for i in (1, 3, 5, 7)] + [(i, 'S', 100) for i in (0, 2, 4, 6, 8)], True, '三层：高 L 与主角 / 中 M / 低 S，分柱不分排'),
 ('⑤ 金色终章 · 交错双排：L 五点（偶）+340 与 L 四点（奇）+280', [(i, 'L', 340) for i in (0, 2, 4, 6, 8)] + [(i, 'L', 280) for i in (1, 3, 5, 7)], False, '一次 9 点，但上下错开 60 m，墙有纹理；晚半拍的奇数点'),
 ('⑥ 收束 · 下一波反过来：奇数点 +340，偶数点 +280', [(i, 'L', 280) for i in (0, 2, 4, 6, 8)] + [(i, 'L', 340) for i in (1, 3, 5, 7)], False, '⑤ 的反相版，同样 9 点；与 ⑤ 隔 ≥ 6.0 s（每小节约 2.4 朵，低于大号持续上限 2.7）'),
]
# 主角方案（用户 10-11 01:52：280–300 m 都行，同屏 1 个或 3 个都可以试）
def hero_options():
    base = row('M', 210) + [(i, 'S', 80) for i in (0, 2, 4, 6, 8)]
    P = [
     ('① 一个主角 300 m · P4 +420（M 九点 + S 低层）', base + [(4, 'H300', 420)], True, '最稳妥：一个面片，位置居中；300 m = 3 格间距，两侧各留 1 个 L 位'),
     ('② 三个主角 280 m · P1 / P4 / P7 相切 +400 / +430 / +400', base + [(1, 'H280', 400), (4, 'H280', 430), (7, 'H280', 400)], True, '间距 300 m = 1.07×，刚好相切，三个互不压；中间高 30 m 成「品」字'),
     ('③ 三个主角 280 m · P2 / P4 / P6 重叠 +380 / +440 / +380', base + [(2, 'H280', 380), (4, 'H280', 440), (6, 'H280', 380)], True, '间距 200 m = 1.4×，叠 30%；半透明大面片 3 层叠，PC 可以，手机只留中间 1 个'),
     ('④ 主角 + L 压两翼 · 主角 280 m P4 +420，L 230 P0 / P2 / P6 / P8 +330', base + [(4, 'H280', 420)] + [(i, 'L', 330) for i in (0, 2, 6, 8)], True, '一个主角 + 四个 L：主角靠高度和位置，不靠孤零零一个大面片'),
    ]
    fig, axs = plt.subplots(2, 2, figsize=(12.6, 10.4))
    fig.suptitle('主角方案 · 280–300 m、1 个或 3 个（示意，正面正投影，100 m 比例尺）', fontsize=14, fontweight='bold', x=0.04, ha='left')
    for ax, (t, it, fan, note) in zip(axs.flat, P):
        panel(ax, t, it, fan, note)
    plt.tight_layout(rect=(0, 0, 1, .96))
    fig.savefig(OUT / '主角方案.png', dpi=100, facecolor='white'); plt.close(fig)


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    version('甲', '计划书分层行（基线，主角不放大）', A)
    version('乙', '山形：中心大、两翼递减（新）', B)
    version('丙', '锯齿：一高一低交替（新）', C)
    hero_options()
    print('ok')
