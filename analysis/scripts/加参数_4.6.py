"""5.0 第 1 步（烘焙器 4.6.0，对话框15 2026-10-05）：一次把新参数加进 4 处——
  tool/src/js/10_types.js 的 BASE（默认值）和 SCHEMA（面板行）、analysis/命名/参数名称表.json / .csv（名字、说明）、analysis/命名/发射器表.json（归哪个发射器 / 模块、短名）。
默认值 = 以前写死在代码里的数（画面逐像素不变）。只加不删；已经加过的键跳过（可以重复跑）。
用法：python3 analysis/scripts/加参数_4.6.py
"""
import csv, io, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[2]
TYPES_JS = ROOT / 'tool' / 'src' / 'js' / '10_types.js'
NAMES_J = ROOT / 'analysis' / '命名' / '参数名称表.json'
NAMES_C = ROOT / 'analysis' / '命名' / '参数名称表.csv'
EMIT_J = ROOT / 'analysis' / '命名' / '发射器表.json'

# 每行：key, SCHEMA 节, 面板旧名（SCHEMA label）, 单位, 下限, 上限, 步长, 默认, 显示条件(JS), 发射器, 模块, 短名, 全名, 英文, 说明, 调大调小, 引擎, 代码
P = []
def add(key, sec, label, unit, lo, hi, step, d, cond, em, mod, short, cn, en, desc, updown, ue='只影响烘焙出的贴图', check='', kind='num', options=None):
    P.append(dict(key=key, sec=sec, label=label, unit=unit, lo=lo, hi=hi, step=step, d=d, cond=cond, em=em, mod=mod, short=short, cn=cn, en=en, desc=desc, updown=updown, ue=ue, check=check, kind=kind, options=options))

CR = 'P => P.crackle > 0'
add('crackleDelayJit', '星效果', '爆裂延迟随机', '%', 0, 100, 1, 70, CR, '爆裂', '生成', '延迟随机', '爆裂延迟随机', 'Crackle Delay Random',
    '每个小闪出现的时刻在「爆裂延迟」的 1 ± 这个百分比之间均匀随机；默认 70% = 以前固定的 0.3–1.7 倍。', '调大：噼啪声拉得更开、一阵一阵；调小：几乎同时炸开', check='20_sim.js crackleBurst：dt = 延迟 × (1 ± j)')
add('crackleRIn', '星效果', '爆裂最近距离（× 范围）', '', 0, 1, 0.01, 1 / 7, CR, '爆裂', '形状', '最近（× 范围）', '爆裂最近距离', 'Crackle Inner Radius',
    '小闪离星最近是「爆裂范围」的多少倍；默认 1/7（0.14）= 以前写死的 0.5 m / 3.5 m。', '调大：小闪都在外圈、中间空；调小：从星身边一直散到范围边上', check='20_sim.js crackleBurst：r = 范围 × (内 + (1 − 内) u)')
add('crackleFollow', '星效果', '爆裂跟随星的速度', '', 0, 1, 0.01, 0.3, CR, '爆裂', '初速', '跟随星', '爆裂跟随星', 'Crackle Inherit Velocity',
    '小闪出现的位置跟着熄灭的星往前带多少（× 星速度 × 延迟）；默认 0.3 = 以前写死的。', '调大：小闪拖在星的去向上；调小：留在星熄灭的地方')
add('crackleLife', '星效果', '爆裂小闪可见时长', 's', 0.01, 1, 0.005, 0.07, CR, '爆裂', '寿命', '寿命', '爆裂小闪寿命', 'Crackle Lifetime',
    '每个小闪最多亮多久（之后直接不画）；默认 0.07 s = 以前写死的。', '调大：小闪留得久、像一颗颗小星；调小：一闪就没')
add('crackleTau', '星效果', '爆裂小闪衰减', 's', 0.002, 0.5, 0.001, 0.012, CR, '爆裂', '亮度', '衰减', '爆裂小闪衰减时间', 'Crackle Decay Time',
    '小闪亮度按 e^(−时间 / 这个数) 变暗；默认 0.012 s = 以前写死的。', '调大：亮得更久、更柔；调小：更脆、更像噼啪一下')
add('crackleBright', '星效果', '爆裂小闪亮度', '×', 0, 10, 0.05, 2.2, CR, '爆裂', '亮度', '亮度', '爆裂小闪亮度', 'Crackle Brightness',
    '每个小闪的亮度（和星头亮度同一口径）；默认 2.2 = 以前写死的。', '调大：小闪更亮更白；调小：更暗，0 = 看不见')
add('crackleBrightJit', '星效果', '爆裂小闪亮度随机', '%', 0, 100, 1, 40, CR, '爆裂', '亮度', '亮度随机', '爆裂小闪亮度随机', 'Crackle Brightness Random',
    '每个小闪的亮度在 1 ± 这个百分比之间均匀随机；默认 40% = 以前的 0.6–1.4 倍。', '调大：有的很亮有的很暗；调小：一样亮')
add('crackleSize', '星效果', '爆裂小闪大小', 'm', 0.05, 5, 0.01, 0.5, CR, '爆裂', '大小', '大小', '爆裂小闪大小', 'Crackle Size',
    '每个小闪的光斑尺度（σ，米；画出来直径约 2 倍）；默认 0.5 m = 以前写死的 0.35–0.65 m 的中间值。', '调大：小闪一团一团更大；调小：更细更尖')
add('crackleSizeJit', '星效果', '爆裂小闪大小随机', '%', 0, 100, 1, 30, CR, '爆裂', '大小', '大小随机', '爆裂小闪大小随机', 'Crackle Size Random',
    '每个小闪的大小在 1 ± 这个百分比之间均匀随机；默认 30% = 以前的 0.35–0.65 m。', '调大：大小不一；调小：一样大')

ST = 'P => P.strobeHz > 0'
add('strobeOn', '星效果', '点灭亮相亮度', '×', 0, 5, 0.05, 1.6, ST, '星', '点灭', '亮相亮度', '点灭亮相亮度', 'Strobe On Brightness',
    '点灭「亮」的那一下是平时星头亮度的几倍；默认 1.6 = 以前写死的。', '调大：闪得更刺眼；调小：亮相不那么突出')
add('strobeOff', '星效果', '点灭暗相亮度', '×', 0, 1, 0.01, 0.03, ST, '星', '点灭', '暗相亮度', '点灭暗相亮度', 'Strobe Off Brightness',
    '点灭「灭」的时候还剩平时亮度的几倍；默认 0.03 = 以前写死的（几乎全灭）。', '调大：灭的时候还看得见一点；调小：灭得更干净')
add('strobeHzJit', '星效果', '点灭频率随机', '%', 0, 100, 1, 15, ST, '星', '点灭', '频率随机', '点灭频率随机', 'Strobe Rate Random',
    '每颗星的点灭频率在 1 ± 这个百分比之间均匀随机；默认 15% = 以前写死的。', '调大：各闪各的、乱闪；调小：整齐地一起闪')

GL = 'P => P.glitter > 0'
add('glitterDelayJit', '星效果', '辉星延迟随机', '%', 0, 100, 1, 50, GL, '火花', '辉星', '延迟随机', '辉星闪光延迟随机', 'Glitter Delay Random',
    '每粒火花闪光的时刻在「辉星闪光延迟」的 1 ± 这个百分比之间均匀随机；默认 50% = 以前的 0.5–1.5 倍。', '调大：闪光散得更开；调小：一起闪')
add('glitterW', '星效果', '辉星闪光宽度', 's', 0.005, 0.3, 0.005, 0.03, GL, '火花', '辉星', '闪光宽度', '辉星闪光宽度', 'Glitter Flash Width',
    '每粒火花那一下闪光持续多久（高斯宽度）；默认 0.03 s = 以前写死的。', '调大：闪光更柔、更长；调小：更尖、更短')
add('glitterPeak', '星效果', '辉星闪光亮度', '×', 0, 20, 0.1, 6, GL, '火花', '辉星', '闪光亮度', '辉星闪光亮度', 'Glitter Flash Brightness',
    '闪光那一下是火花平时亮度的几倍（再乘「辉星」强度）；默认 6 = 以前写死的。', '调大：闪光更亮；调小：更暗')
add('glitterDim', '星效果', '辉星闪前压暗', '', 0, 1, 0.01, 0.85, GL, '火花', '辉星', '闪前压暗', '辉星闪前压暗', 'Glitter Pre-Flash Dimming',
    '闪光以外的时间，火花亮度压掉多少（× 辉星强度）；默认 0.85 = 以前写死的。', '调大：平时更暗、闪光更突出；调小：平时也亮')

BR = 'P => P.branch > 0'
add('branchLife', '星效果', '分叉火花寿命', 's', 0.02, 2, 0.01, 0.16, BR, '分叉火花', '寿命', '寿命', '分叉火花寿命', 'Branch Spark Lifetime',
    '火花分叉出来的小火花亮多久；默认 0.16 s = 以前写死的。', '调大：分叉的枝更长；调小：分出来一下就灭')
add('branchLifeJit', '星效果', '分叉火花寿命随机', '%', 0, 100, 1, 40, BR, '分叉火花', '寿命', '寿命随机', '分叉火花寿命随机', 'Branch Spark Lifetime Random',
    '分叉小火花的寿命在 1 ± 这个百分比之间均匀随机；默认 40% = 以前的 0.6–1.4 倍。', '调大：枝长短不一；调小：一样长')
add('branchV', '星效果', '分叉甩出速度', 'm/s', 0, 40, 0.5, 4, BR, '分叉火花', '初速', '甩出速度', '分叉火花甩出速度', 'Branch Spark Speed',
    '分叉小火花往外甩的基础速度（再加 1.5 × 火花速度随机）；默认 4 m/s = 以前写死的。', '调大：枝张得更开；调小：贴着原来的火花')
add('branchVJit', '星效果', '分叉速度随机', '%', 0, 100, 1, 40, BR, '分叉火花', '初速', '速度随机', '分叉火花速度随机', 'Branch Spark Speed Random',
    '甩出速度在 1 ± 这个百分比之间均匀随机；默认 40% = 以前的 0.6–1.4 倍。', '调大：枝长短不一；调小：一样长')
add('branchInh', '星效果', '分叉继承火花速度', '', 0, 1, 0.01, 0.5, BR, '分叉火花', '初速', '继承速度', '分叉火花继承速度', 'Branch Inherit Velocity',
    '分叉那一刻，小火花带走原来火花速度的多少；默认 0.5 = 以前写死的。', '调大：枝顺着原来的方向飞；调小：原地散开')
add('branchKd', '星效果', '分叉火花阻力（× 火花）', '×', 0, 5, 0.05, 1.5, BR, '分叉火花', '受力', '阻力（× 火花）', '分叉火花阻力倍数', 'Branch Drag Multiplier',
    '分叉小火花的阻力是火花阻力的几倍；默认 1.5 = 以前写死的。', '调大：枝很快停住、短；调小：飞得远')
add('branchT', '星效果', '分叉火花温度（× 火花）', '×', 0.5, 1.5, 0.01, 1.08, BR, '分叉火花', '颜色', '温度（× 火花）', '分叉火花温度倍数', 'Branch Temperature Multiplier',
    '分叉那一刻小火花的温度是原来火花的几倍（越热越白越亮）；默认 1.08 = 以前写死的。', '调大：分叉处更白更亮；调小：更红更暗')
add('branchBright', '星效果', '分叉火花亮度', '×', 0, 6, 0.05, 1.8, BR, '分叉火花', '亮度', '亮度', '分叉火花亮度', 'Branch Spark Brightness',
    '分叉小火花的亮度倍数；默认 1.8 = 以前写死的。', '调大：分叉的枝更亮；调小：更暗')
add('branchFade', '星效果', '分叉火花变暗快慢', '', 0.2, 6, 0.1, 2, BR, '分叉火花', '亮度', '变暗（指数）', '分叉火花变暗指数', 'Branch Fade Exponent',
    '亮度按 (1 − 寿命比例)^这个数 变暗；默认 2 = 以前写死的。', '调大：一出来很快就暗；调小：亮到最后才灭')
add('branchSize', '星效果', '分叉火花大小（× 火花）', '×', 0.1, 3, 0.01, 0.7, BR, '分叉火花', '大小', '大小（× 火花）', '分叉火花大小倍数', 'Branch Spark Size Multiplier',
    '分叉小火花的大小是火花的几倍；默认 0.7 = 以前写死的。', '调大：枝更粗；调小：更细')

add('flashR', '开花与燃烧', '开花闪光半径（-1 = 跟初速）', 'm', -1, 60, 0.5, -1, '', '开花闪光', '大小', '半径', '开花闪光半径', 'Burst Flash Radius',
    '开花那团闪光的半径（σ，米）；勾「用默认」= 跟初速：max(2 m, 0.045 × 初速)（以前写死的联动，存成 -1），再乘「大小」倍数。', '调大：闪光那团更大；调小：更小更集中')
add('flashTau', '开花与燃烧', '开花闪光衰减', 's', 0.005, 0.5, 0.005, 0.035, '', '开花闪光', '亮度', '衰减', '开花闪光衰减时间', 'Burst Flash Decay Time',
    '开花闪光亮度按 e^(−时间 / 这个数) 变暗；默认 0.035 s = 以前写死的。', '调大：闪光亮得更久；调小：一闪就没')
add('flashLife', '开花与燃烧', '开花闪光可见时长', 's', 0.05, 2, 0.01, 0.25, '', '开花闪光', '寿命', '寿命', '开花闪光寿命', 'Burst Flash Lifetime',
    '开花闪光最多画多久；默认 0.25 s = 以前写死的。', '调大：闪光尾巴留得久；调小：截得早')

SB = ''
add('subSize', '千轮 / 分裂', '子星大小（-1 = 同星）', 'm', -1, 6, 0.05, -1, SB, '子花', '大小', '大小', '子星大小', 'Sub Star Size',
    '子花每颗子星的星头大小；勾「用默认」= 和主星「大小」一样（存成 -1）。', '调大：子星更大；调小：更细')
add('subBright', '千轮 / 分裂', '子星亮度（-1 = 同星）', '×', -1, 3, 0.05, -1, SB, '子花', '亮度', '亮度', '子星亮度', 'Sub Star Brightness',
    '子花每颗子星的星头亮度；勾「用默认」= 和主星「亮度」一样（存成 -1）。', '调大：子花更亮；调小：更暗')
add('subFlashR', '千轮 / 分裂', '子花闪光半径（-1 = 跟子花初速）', 'm', -1, 30, 0.1, -1, SB, '子花', '闪光', '闪光半径', '子花闪光半径', 'Sub Flare Radius',
    '每朵子花开花那团闪光的半径（σ，米）；勾「用默认」= 跟子花初速：max(1 m, 0.05 × 子花初速)（存成 -1）。', '调大：闪光更大；调小：更小')

SK = ''
add('sparkInhJit', '尾缀（炭火火花）', '跟随星体随机', '%', 0, 100, 1, 70, SK, '火花', '初速', '跟随随机', '跟随星体随机', 'Sparkler Inherit Random',
    '每粒火花「跟随星体」的比例在 1 ± 这个百分比之间均匀随机；默认 70% = 以前的 0.3–1.7 倍。', '调大：有的火花跟着星飞、有的原地停；调小：都一样跟')
add('T0Jit', '尾缀（炭火火花）', '初始温度随机', 'K', 0, 400, 5, 120, SK, '火花', '颜色', '温度随机', '火花初始温度随机', 'Sparkler Temperature Random',
    '每粒火花初始温度的正态随机（标准差，开尔文）；默认 120 K = 以前写死的。', '调大：火花亮暗、黄白差别更大；调小：一样亮一样色')
EM = 'P => isAir(P) && P.emberFrac > 0'
add('emberLifeJit', '尾缀（炭火火花）', '余烬寿命随机', '', 0, 1, 0.01, 0.2, EM, '余烬', '寿命', '寿命随机', '余烬寿命随机', 'Ember Lifetime Random',
    '余烬寿命的对数标准差；默认 0.2 = 以前写死的。', '调大：长短不一；调小：一样长')
add('emberDecay', '尾缀（炭火火花）', '余烬变暗快慢', '', 0, 8, 0.1, 2, EM, '余烬', '亮度', '变暗快慢', '余烬变暗快慢', 'Ember Decay Rate',
    '余烬亮度按 e^(−这个数 × 寿命比例) 变暗；默认 2 = 以前写死的。', '调大：很快变暗；调小：亮到最后')
add('emberFadeAt', '尾缀（炭火火花）', '余烬最后淡出开始（× 寿命）', '×', 0.3, 1, 0.01, 0.75, EM, '余烬', '亮度', '淡出开始', '余烬淡出开始', 'Ember Fade Start',
    '余烬到寿命的这个比例开始淡出到 0；默认 0.75 = 以前写死的。', '调大：最后才淡出；调小：早早开始淡')

# 自定义发射器（＋ 加发射器）：两个槽，同一套模块
EV = [['death', '星熄灭时'], ['birth', '开花时（星出生）'], ['time', '开花后某个时刻'], ['trail', '星燃烧时沿路']]
KD = [['dot', '光点（小闪、碎光、落火）'], ['star', '星（会烧、带火花，像子花）']]
for i in (1, 2):
    x = f'x{i}'; em = f'自定义 {i}'; sec = f'自定义发射器 {i}'; on = f"P => +P.{x}On > 0"
    add(f'{x}Event', sec, '什么时候生成', '', 0, 0, 0, 'death', '', em, '生成', '什么时候', f'{em} · 什么时候生成', f'Custom {i} Spawn Event',
        '挂在星的哪个时刻：星熄灭时（像爆裂、落火）/ 开花时（每颗星出生）/ 开花后某个时刻 / 星燃烧时沿路（像火花）。', '—', ue='Cascade 里对应 Event Generator（星熄灭 = Death）+ EventReceiver Spawn；先烘进贴图', kind='sel', options=EV)
    add(f'{x}T', sec, '开花后第几秒', 's', 0, 10, 0.05, 1, f"P => P.{x}Event === 'time'", em, '生成', '时刻', f'{em} · 时刻', f'Custom {i} Spawn Time',
        '选「开花后某个时刻」时，第几秒在每颗还亮着的星上生成。', '调大：晚一点出；调小：早一点')
    add(f'{x}Kind', sec, '生成什么', '', 0, 0, 0, 'dot', '', em, '生成', '生成什么', f'{em} · 生成什么', f'Custom {i} Particle Kind',
        '光点：一个亮点，按下面的大小、亮度、寿命曲线画（小闪、碎光、落火）。星：一颗会烧的星，带火花（用「火花」那一页的火花参数），像子花。', '—', kind='sel', options=KD)
    add(f'{x}N', sec, '每颗星生成几个', '个', 0, 200, 1, 8, f"P => P.{x}Event !== 'trail'", em, '生成', '数量', f'{em} · 数量', f'Custom {i} Spawn Count',
        '每颗星在那个时刻生成几个。', '调大：更多更密；调小：更少')
    add(f'{x}Rate', sec, '每颗星每秒生成', '个/秒', 0, 500, 1, 20, f"P => P.{x}Event === 'trail'", em, '生成', '每秒', f'{em} · 每秒生成', f'Custom {i} Spawn Rate',
        '选「星燃烧时沿路」时，每颗星每秒生成几个（泊松随机）。', '调大：沿路更密；调小：更稀')
    add(f'{x}Prob', sec, '触发比例', '', 0, 1, 0.01, 1, '', em, '生成', '触发比例', f'{em} · 触发比例', f'Custom {i} Spawn Probability',
        '每个要生成的粒子以这个概率真的生成（1 = 全部，0.3 = 三成）。', '调大：更多；调小：零零星星')
    add(f'{x}Delay', sec, '延迟', 's', 0, 3, 0.01, 0, '', em, '生成', '延迟', f'{em} · 延迟', f'Custom {i} Spawn Delay',
        '事件发生后过几秒才出现。', '调大：晚一拍；调小：马上')
    add(f'{x}DelayJit', sec, '延迟随机', '%', 0, 100, 1, 0, '', em, '生成', '延迟随机', f'{em} · 延迟随机', f'Custom {i} Spawn Delay Random',
        '延迟在 1 ± 这个百分比之间均匀随机。', '调大：先后不一；调小：一起出')
    add(f'{x}Spark', sec, '火花密度（生成的是星时）', '个/秒', 0, 2000, 1, 0, f"P => P.{x}Kind === 'star'", em, '生成', '火花密度', f'{em} · 火花密度', f'Custom {i} Spark Rate',
        '生成的是「星」时，每颗星每秒喷多少火花（火花的寿命、颜色、阻力用「火花」那一页）。0 = 不带火花。', '调大：尾巴更密；调小：更稀')
    add(f'{x}R', sec, '起始半径', 'm', 0, 30, 0.1, 0, '', em, '形状', '起始半径', f'{em} · 起始半径', f'Custom {i} Spawn Radius',
        '从星的位置往外多少米的球面上出生（0 = 就在星上）。', '调大：一出来就散开；调小：从一点出来')
    add(f'{x}V', sec, '初速', 'm/s', 0, 200, 0.5, 8, '', em, '初速', '初速', f'{em} · 初速', f'Custom {i} Speed',
        '往四周随机方向飞出的速度。', '调大：散得更开更快；调小：贴着星')
    add(f'{x}VJit', sec, '初速随机', '%', 0, 100, 1, 30, '', em, '初速', '初速随机', f'{em} · 初速随机', f'Custom {i} Speed Random',
        '初速的正态随机（标准差，百分比）。', '调大：快慢不一；调小：一样快')
    add(f'{x}Inh', sec, '继承星的速度', '', 0, 1, 0.01, 0.3, '', em, '初速', '继承速度', f'{em} · 继承速度', f'Custom {i} Inherit Velocity',
        '出生时带走星速度的多少（0 = 原地，1 = 跟着星飞）。', '调大：顺着星的方向；调小：原地散开')
    add(f'{x}Grav', sec, '重力倍率', '×', -1, 3, 0.05, 1, '', em, '受力', '重力', f'{em} · 重力倍率', f'Custom {i} Gravity Scale',
        '× 9.8 m/s²（负数 = 往上飘）。', '调大：掉得快；调小：飘着')
    add(f'{x}Drag', sec, '阻力', '1/s', 0, 20, 0.05, 1.5, '', em, '受力', '阻力', f'{em} · 阻力', f'Custom {i} Drag',
        '线性阻力（和 Cascade Drag 一样）：越大越快停下。', '调大：很快停住；调小：飞得远')
    add(f'{x}Life', sec, '寿命', 's', 0.01, 10, 0.01, 0.5, '', em, '寿命', '寿命', f'{em} · 寿命', f'Custom {i} Lifetime',
        '每个粒子亮多久（生成的是星时 = 燃烧时间）。', '调大：留得久；调小：一下就灭')
    add(f'{x}LifeJit', sec, '寿命随机', '%', 0, 100, 1, 20, '', em, '寿命', '寿命随机', f'{em} · 寿命随机', f'Custom {i} Lifetime Random',
        '寿命的正态随机（标准差，百分比）。', '调大：长短不一；调小：一样长')
    add(f'{x}Size', sec, '大小', 'm', 0.01, 10, 0.01, 0.6, '', em, '大小', '大小', f'{em} · 大小', f'Custom {i} Size',
        '亮核直径（米，和星头大小同一口径）。', '调大：更大；调小：更细')
    add(f'{x}SizeJit', sec, '大小随机', '%', 0, 100, 1, 20, '', em, '大小', '大小随机', f'{em} · 大小随机', f'Custom {i} Size Random',
        '大小的正态随机（标准差，百分比）。', '调大：大小不一；调小：一样大')
    add(f'{x}SizeCurve', sec, '大小随寿命', '', 0, 0, 0, '', '', em, '大小', '随寿命', f'{em} · 大小随寿命', f'Custom {i} Size Over Life',
        '几行「时刻:倍数」，时刻是寿命的比例 0–1，例「0:1, 1:0.3」= 越烧越小；空 = 不变。', '—', ue='Cascade Size By Life（几行关键帧）', kind='curve')
    add(f'{x}Bright', sec, '亮度', '×', 0, 10, 0.05, 1, '', em, '亮度', '亮度', f'{em} · 亮度', f'Custom {i} Brightness',
        '亮度（和星头亮度同一口径）。', '调大：更亮；调小：更暗')
    add(f'{x}BrightJit', sec, '亮度随机', '%', 0, 100, 1, 20, '', em, '亮度', '亮度随机', f'{em} · 亮度随机', f'Custom {i} Brightness Random',
        '亮度的正态随机（标准差，百分比）。', '调大：亮暗不一；调小：一样亮')
    add(f'{x}BrightCurve', sec, '亮度随寿命', '', 0, 0, 0, '0:1, 0.7:1, 1:0', '', em, '亮度', '随寿命', f'{em} · 亮度随寿命', f'Custom {i} Brightness Over Life',
        '几行「时刻:倍数」，时刻是寿命的比例 0–1；默认「0:1, 0.7:1, 1:0」= 最后三成寿命淡出。', '—', ue='Cascade Color Over Life 的亮度（几行关键帧）', kind='curve')
    add(f'{x}Flick', sec, '闪烁幅度', '', 0, 1, 0.01, 0, '', em, '闪烁', '幅度', f'{em} · 闪烁幅度', f'Custom {i} Flicker Amplitude',
        '亮度按正弦起伏的幅度（0 = 不闪，1 = 亮灭）。', '调大：闪得厉害；调小：稳定')
    add(f'{x}FlickHz', sec, '闪烁频率', 'Hz', 0, 40, 0.5, 8, f"P => +P.{x}Flick > 0", em, '闪烁', '频率', f'{em} · 闪烁频率', f'Custom {i} Flicker Rate',
        '每秒闪几次（每个粒子相位随机）。', '调大：闪得快；调小：慢')

# 4.8.0（5.0 第 3 步一部分）：每个发射器的大小 / 亮度都有「按寿命曲线」（几行 时刻:倍数，空 = 不乘，画面不变）
CV = '几行「时刻:倍数」，时刻是寿命的比例 0–1，在原来的变化上再乘这条曲线；空 = 不乘（和以前一样）。例「0:0.3, 0.2:1, 1:1」= 刚出来小、很快长到正常。'
def curve(key, sec, em, mod, cn, en, what, cond=''):
    add(key, sec, cn, '', 0, 0, 0, '', cond, em, mod, '随寿命', cn, en, what + CV, '—', ue='Cascade：Size By Life / Color Over Life 的关键帧（几行）', kind='curve')
curve('starSizeCurve', '炭头（星头）', '星', '大小', '星头大小随寿命', 'Star Size Over Life', '星头大小随燃烧进度变化（寿命 = 燃烧时间）。')
curve('starBrightCurve', '炭头（星头）', '星', '亮度', '星头亮度随寿命', 'Star Brightness Over Life', '星头亮度随燃烧进度变化（在渐隐、熄灭前闪亮之上再乘）。')
curve('sparkSizeCurve', '尾缀（炭火火花）', '火花', '大小', '火花大小随寿命', 'Sparkler Size Over Life', '每粒火花的大小随它的寿命变化（梭形 / 尾迹粗细用这一条做：用户 10-05 20:45 定）。')
curve('sparkBrightCurve', '尾缀（炭火火花）', '火花', '亮度', '火花亮度随寿命', 'Sparkler Brightness Over Life', '每粒火花的亮度随它的寿命变化（在温度冷却之上再乘）。')
curve('emberBrightCurve', '尾缀（炭火火花）', '余烬', '亮度', '余烬亮度随寿命', 'Ember Brightness Over Life', '余烬亮度随它的寿命变化（在变暗快慢之上再乘）。', 'P => isAir(P) && P.emberFrac > 0')
curve('branchBrightCurve', '星效果', '分叉火花', '亮度', '分叉火花亮度随寿命', 'Branch Brightness Over Life', '分叉小火花的亮度随它的寿命变化（在变暗指数之上再乘）。', 'P => P.branch > 0')
curve('crackleSizeCurve', '星效果', '爆裂', '大小', '爆裂小闪大小随寿命', 'Crackle Size Over Life', '每个小闪的大小随它的寿命变化。', 'P => P.crackle > 0')
curve('crackleBrightCurve', '星效果', '爆裂', '亮度', '爆裂小闪亮度随寿命', 'Crackle Brightness Over Life', '每个小闪的亮度随它的寿命变化（在衰减之上再乘）。', 'P => P.crackle > 0')
curve('flashBrightCurve', '开花与燃烧', '开花闪光', '亮度', '开花闪光亮度随寿命', 'Burst Flash Brightness Over Life', '开花闪光的亮度随它的寿命变化（在衰减之上再乘）。')
curve('subSizeCurve', '千轮 / 分裂', '子花', '大小', '子星大小随寿命', 'Sub Star Size Over Life', '子花每颗子星的大小随燃烧进度变化。')
curve('subBrightCurve', '千轮 / 分裂', '子花', '亮度', '子星亮度随寿命', 'Sub Star Brightness Over Life', '子花每颗子星的亮度随燃烧进度变化。')

def js(v):
    if isinstance(v, str): return "'" + v.replace("'", "\\'") + "'"
    if isinstance(v, float) and abs(v - 1 / 7) < 1e-12: return '1 / 7'
    return repr(v) if not isinstance(v, bool) else ('1' if v else '0')

def main():
    src = TYPES_JS.read_text(encoding='utf-8')
    base_add = [p for p in P if re.search(r'\b' + p['key'] + r':', src.split('const BASE = {', 1)[1].split('\n};', 1)[0]) is None]
    on_keys = [f'x{i}On' for i in (1, 2) if f'x{i}On:' not in src]
    if base_add or on_keys:
        line = '  // 4.6.0 / 4.8.0（5.0 第 1、3 步，用户 10-05 20:22「每一个子发射器拥有的参数都是全的」）：以前写死的数变成参数、各发射器的按寿命曲线，默认 = 原来（逐像素不变）\n  '
        items = [f"{p['key']}: {js(p['d'])}" for p in base_add] + [f'{k}: 0' for k in on_keys]
        chunks, cur = [], []
        for it in items:
            cur.append(it)
            if len(', '.join(cur)) > 150: chunks.append(', '.join(cur)); cur = []
        if cur: chunks.append(', '.join(cur))
        line += ',\n  '.join(chunks) + ',\n'
        a, b = src.split('const BASE = {', 1); body, rest = b.split('\n};', 1)
        body = body.rstrip(); body += '' if body.endswith(',') else ','
        src = a + 'const BASE = {' + body + '\n' + line.rstrip('\n').rstrip(',') + '\n};' + rest
    # SCHEMA：加进已有的节（节末尾）或新节
    def item_js(p):
        c = (', ' + p['cond']) if p['cond'] else ''
        if p['kind'] == 'sel': return "{ sel: '%s', label: '%s', options: %s%s }" % (p['key'], p['label'], json.dumps(p['options'], ensure_ascii=False).replace('"', "'"), (", show: " + p['cond']) if p['cond'] else '')
        if p['kind'] == 'curve': return "{ curve: '%s', label: '%s'%s }" % (p['key'], p['label'], (", show: " + p['cond']) if p['cond'] else '')
        return "['%s', '%s', '%s', %s, %s, %s%s]" % (p['key'], p['label'], p['unit'], js(p['lo']), js(p['hi']), js(p['step']), c)
    secs = {}
    for p in P: secs.setdefault(p['sec'], []).append(p)
    for sec, ps in secs.items():
        ps = [p for p in ps if ("'%s'" % p['key']) not in src.split('const SCHEMA = [', 1)[1]]
        if not ps: continue
        head = "  { sec: '%s'" % sec
        if head in src.split('const SCHEMA = [', 1)[1]:
            i0 = src.index(head, src.index('const SCHEMA = ['))
            i1 = src.index('\n  ] }', i0)
            ls = src.rfind('\n', 0, i1) + 1; last = src[ls:i1]; cm = re.search(r'\s*//.*$', last)      # 节里最后一行可能带注释：逗号要加在注释前面
            if cm: src = src[:ls] + last[:cm.start()] + ',' + last[cm.start():] + src[i1:]; i1 = src.index('\n  ] }', ls)
            ins = (',' if not cm else '') + '\n' + ',\n'.join('    ' + item_js(p) for p in ps) + '     // 4.6.0+（5.0）'
            src = src[:i1] + ins + src[i1:]
        else:
            n = sec.split()[-1]
            new = "  { sec: '%s', show: P => isAir(P) && +P.x%sOn > 0, hint: '自定义发射器（4.6.0，＋ 加发射器）：挂在星的事件上，生成光点或星；每个模块都在：生成 / 形状 / 初速 / 受力 / 寿命 / 大小 / 颜色 / 亮度 / 闪烁。颜色跟这一层（灰度贴图 + Ramp），要别的颜色就拆成另一层。', items: [\n" % (sec, n)
            new += ',\n'.join('    ' + item_js(p) for p in ps) + ",\n    { info: 'exColor%s' }\n  ] },\n" % n
            anchor = "  { sec: '蜂', show: P => P.type === 'hachi', items: ["
            src = src.replace(anchor, new + anchor, 1)
    TYPES_JS.write_text(src, encoding='utf-8')

    # 参数名称表（json + csv，csv 是 BOM + CRLF + 末尾无换行）
    rows = json.loads(NAMES_J.read_text(encoding='utf-8')); have = {(r['sec'], r['key']) for r in rows}
    eml = json.loads(EMIT_J.read_text(encoding='utf-8')); haveE = {r['id'] for r in eml['参数']}
    new_rows = []
    for n, p in enumerate(P):
        if (p['sec'], p['key']) in have: continue
        rid = f"460-{n:02d}-{p['key']}"
        rng = '' if p['kind'] in ('sel', 'curve') else f"{p['lo']:g}–{p['hi']:g}"
        dflt = (str(p['d']) if not isinstance(p['d'], float) else f"{p['d']:.4g}") if p['kind'] != 'sel' else dict(p['options'])[p['d']]
        new_rows.append({'sec': p['sec'], 'key': p['key'], 'old': p['label'], 'module_cn': p['em'], 'module_en': '', 'en': p['en'], 'en_niagara': False, 'cn': p['cn'],
                         'desc': p['desc'], 'updown': p['updown'], 'unit': p['unit'], 'range': rng, 'default': dflt, 'random': '', 'ue': p['ue'], 'tag': '烟花特性',
                         'note': '4.6.0（5.0 第 1 步）加：以前写死在代码里，默认 = 原来的数。' if not p['key'].startswith('x') else '4.6.0（5.0 第 1 步）自定义发射器：资产栏下面发射器标签行「＋ 加发射器」打开。',
                         'check': p['check'], 'family': '空中礼花', 'id': rid, 'tier': 'more'})
        if rid not in haveE: eml['参数'].append({'id': rid, 'sec': p['sec'], 'key': p['key'], '全名': p['cn'], '发射器': p['em'], '模块': p['mod'], '名': p['short']})
    if new_rows:
        rows += new_rows
        NAMES_J.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
        raw = NAMES_C.read_bytes().decode('utf-8-sig'); hdr = next(csv.reader(io.StringIO(raw)))
        buf = io.StringIO(); w = csv.writer(buf, lineterminator='\r\n')
        for r in new_rows: w.writerow([('True' if r[h] is True else 'False' if r[h] is False else r[h]) for h in hdr])
        NAMES_C.write_bytes(('﻿' + raw.rstrip('\r\n') + '\r\n' + buf.getvalue().rstrip('\r\n')).encode('utf-8'))
    # 发射器表：新发射器 + 已有发射器补模块；松叶分叉两行搬到「分叉火花 › 生成」
    E = {e['名']: e for e in eml['发射器']}
    def ens(name, en, lv, what, mods, after):
        if name not in E:
            e = {'名': name, 'en': en, '级': lv, '说明': what, '模块': mods}; idx = [x['名'] for x in eml['发射器']].index(after) + 1
            eml['发射器'].insert(idx, e); E[name] = e
    ens('分叉火花', 'Branch Sparks', '子级 · 火花分叉时', '松叶：一粒火花烧到一半分叉成几粒小火花（寿命短、往外甩）', ['生成', '形状', '初速', '受力', '寿命', '大小', '颜色', '亮度', '闪烁'], '余烬')
    ens('自定义 1', 'Custom 1', '子级 · 挂在星的事件上', '你自己加的发射器（＋ 加发射器）：星熄灭时 / 开花时 / 某个时刻 / 沿路，生成光点或星', ['生成', '形状', '初速', '受力', '寿命', '大小', '颜色', '亮度', '闪烁'], '开花闪光')
    ens('自定义 2', 'Custom 2', '子级 · 挂在星的事件上', '你自己加的第二个发射器（＋ 加发射器）', ['生成', '形状', '初速', '受力', '寿命', '大小', '颜色', '亮度', '闪烁'], '自定义 1')
    STD = ['生成', '形状', '初速', '受力', '寿命', '大小', '颜色', '亮度', '闪烁']
    for nm in ('星', '火花', '余烬', '爆裂', '子花', '开花闪光'):
        e = E.get(nm)
        if not e: continue
        extra = [m for m in e['模块'] if m not in STD]; e['模块'] = STD + extra
    for r in eml['参数']:
        if r['key'] in ('branch', 'branchAt') and r['发射器'] == '火花': r['发射器'] = '分叉火花'; r['模块'] = '生成'
    EMIT_J.write_text(json.dumps(eml, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'BASE +{len(base_add) + len(on_keys)}，名称表 +{len(new_rows)}')

main()
