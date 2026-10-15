#!/usr/bin/env python3
"""编排 B01 动画预览页（对话框22，2026-10-11）：把 B01 逻辑方案做成可播放的正面比例动画。

输入  协作/编排B01/逻辑方案.json、体检.json（analysis/scripts/编排B01.py 生成）
      analysis/music/汪洋与浩渺_分析.json（逐秒响度，只用来画能量条）
      analysis/templates/choreography-b01.html（页面模板；由原「候选A动画」页改来，布局和画法沿用）
输出  协作/编排B01/B01动画.html（单文件，数据内嵌；可直接用浏览器打开，也可发布成 Artifact）
用法  python3 -I analysis/scripts/编排B01_动画.py [--b02]
      --b02（22，10-12）：读 逻辑方案_B02 / 体检_B02，按尾缀 v2 高度画，加 PC / 手游切换和小平台小花束尾，输出 协作/编排B01/B02动画.html

画法：圆画在每条的开花时刻，径 = 大小（S 90 / M 150 / L 230）；开花前的竖线 = 升空尾缀，按这条在 B01 里的
起飞 → 开花时刻画；炸点高 = 固定子模板原生 +190 / +265 / +410 m 再加这条的高低错落 dz；扇形的扇角与出筒节奏是示意。
不是 UE 回放。
"""
import base64
import hashlib
import importlib.util
import json
import math
import sys
import statistics
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('b01', ROOT / 'analysis/scripts/编排B01.py')
b01 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b01)

OUT = ROOT / '协作/编排B01'
R1M = '--b02r1m' in sys.argv          # B02 修订1（22，10-12 23:13）：错层 + 主角让位 + 手游替身；仍输出到 B02动画.html（同一个网页链接）
DAY = '--day' in sys.argv             # Day 调试版（22，10-13 21:29）：零点前 NPC 试放 30 s，不放音乐，可循环，输出 Day动画.html
B03 = '--b03' in sys.argv             # B03（22，10-13 16:28）：合并音频（VO 闲话 + 倒计时 + 汪洋与浩渺），修订3 高度 + 手游替身，输出 B03动画.html
B04 = '--b04' in sys.argv             # B04（22，10-14 01:27）：B03 修订2 + 坝顶低层 Tiny + 小平台前台小花 XS + 扇 3.0，输出 B04动画.html（可切 B03 修订2 对比）
B05 = '--b05' in sys.argv             # B05（22，10-14 22:22）：B04 + ResourceFX 新命名 + 手游 6 种，输出 B05动画.html（可切 B04 对比）
B06 = '--b06' in sys.argv             # B06（22，10-15 01:04）：低层回 150 m、扇重排（不叠、跟拍、不重复）、P2 / P4 / P6 三朵等大，输出 B06动画.html（可切 B05 对比）
B08 = '--b08' in sys.argv             # B08（22，10-15 22:02）：低配限峰、小平台降高放大、同时同高两层、种类大小、时间错开，输出 B08动画.html（可切 B07 修订1 对比）
B07 = '--b07' in sys.argv or B08     # B07（22，10-15 11:14）：尾缀从地上出来、档位隔点、小平台加密、方向 / 大小 / 颜色，输出 B07动画.html（可切 B06 对比）
B4P = B04 or B05 or B06 or B07 or DAY  # B04 起的小平台前台小花 / 新尾缀画法（Day v4 起也是）
if B05 or B06 or B07 or DAY:
    b01.register_b05_mobile()
B02 = DAY or B03 or B4P or R1M or '--b02' in sys.argv
SFX, TABLE, NAME = ('_Day', 'Day', 'Day') if DAY else ('_B08', 'B08', 'B08') if B08 else ('_B07', 'B07', 'B07') if B07 else ('_B06', 'B06', 'B06') if B06 else ('_B05', 'B05', 'B05') if B05 else ('_B04', 'B04', 'B04') if B04 else ('_B03r2m', 'B03r2m', 'B03') if B03 else ('_B02r1m', 'B02r1m', 'B02') if R1M else ('_B02', 'B02', 'B02') if B02 else ('', 'B01', 'B01')
if B02:
    b01.HEIGHTS = 'v2'
LOGIC = json.loads((OUT / f'逻辑方案{SFX}.json').read_text(encoding='utf-8'))
CHECK = json.loads((OUT / f'体检{SFX}.json').read_text(encoding='utf-8'))
MUSIC = json.loads((ROOT / 'analysis/music/汪洋与浩渺_分析.json').read_text(encoding='utf-8'))
_cp = ROOT / f'FXtools/节目/NewYearFireWorks_v01/{TABLE}编排检查.json'
if B03:                               # 10-13 21:29 B03 修订2（倒计时重新构图）；编译后读它的编排检查，没编译就用体检凑
    _cp = ROOT / 'FXtools/节目/NewYearFireWorks_v01/B03修订2-倒计时重排-点火开场-手游补位编排检查.json'
if DAY:
    _cp = ROOT / 'FXtools/节目/NewYearFireWorks_Day/Day调试版-NPC试放编排检查.json'
if B04:
    _cp = ROOT / 'FXtools/节目/NewYearFireWorks_v01/B04-低层Tiny-小平台前台小花XS-扇3.0编排检查.json'
if B05:
    _cp = ROOT / 'FXtools/节目/NewYearFireWorks_v01/B05-ResourceFX新命名-手游6种编排检查.json'
if B06:
    _cp = ROOT / 'FXtools/节目/NewYearFireWorks_v01/B06-低层150-扇重排跟拍-P2P4P6等大编排检查.json'
if B07:
    _cp = ROOT / 'FXtools/节目/NewYearFireWorks_v01/B07修订1-球花竖直-扇不叠编排检查.json'
if B08:
    _cp = ROOT / 'FXtools/节目/NewYearFireWorks_v01/B08修订3-低配放宽约0.8ms编排检查.json'   # B08 修订3（10-16，16.0.38）；16.0.37 / 16.0.36 / 16.0.35 见 B08修订2-… / B08修订1-… / B08-…编排检查.json
if _cp.exists():
    COMPILE = json.loads(_cp.read_text(encoding='utf-8'))
else:                                 # 还没编译（B03 先出动画）：用体检里的数凑
    _t, _m = CHECK['tiers'], CHECK['b02']['mobileTiers']
    COMPILE = dict(tiers={k: dict(events=v['events'], templates='—', scheduleSlots='—') for k, v in _t.items()},
                   oneTable=dict(pc={k: v['events'] for k, v in _t.items()}, mobile={k: v['events'] for k, v in _m.items()},
                                 flags2=sum(len(c['events']) for c in LOGIC['cues'] if c.get('mobile') == 'only')))
CHECK['_compile'] = COMPILE['tiers']
TEMPLATE = ROOT / 'analysis/templates/choreography-b01.html'

OFFSET = LOGIC['musicOffsetS']
DUR = LOGIC['duration']
BEAMS = {'R1': 1, 'R5': 5, 'R9': 9, 'R9R': 9, 'S5': 5, 'S9': 9, 'S13': 13}
TAIL_GPU = {'S': 6, 'M': 2, 'L': 6}
DIR_CN = b01.DIR_CN
ROLE = {'倒计时': '铺垫', '开场高潮': '释放', '第一次抬升': '释放', '高潮 II': '释放', '终章': '释放', '低位密奏': '留白', '白色收束': '收束'}

def risks_b02():
    g, ob, b2 = CHECK['gpu'], COMPILE.get('oneTable', {}), CHECK['b02']
    v = CHECK['vary']
    return [
        '没在 UE 里放过：UE 里的导演还是修订1（旧高度）；PC 尾缀今晚由你重导（150 / 210 / 330 m），B02 的开花点按这个高度算。',
        f"高度按尾缀 v2 重挑：同一套高低规则，几何换成新高度后重新挑组高度（种子 {v['seed']}）。层间距变小，深度重叠 {v['after']['heavyOverlapSamples']} 次取样（旧高度时 1465），主角被压 {v['after']['heroOverlapSamples']} 次；主角尾缀 Hero 行加上后主角升到 400 m 会再少。",
        '主角现在挂大尾缀，开花约 330 m，和大号花一样高；Hero 行加好、资源同步进基础库后编译带 --hero-trail 即换 400 m。',
        f"手游只是「放哪几发」：手游表里还没有这些花的手游资源（执行方案周二周三出），白名单是执行方案 §2.1 的周三清单；手游高 / 中 / 低 {ob.get('mobile', {}).get('high')} / {ob.get('mobile', {}).get('medium')} / {ob.get('mobile', {}).get('low')} 发，中间有几段长空档（见 B02 表）。",
        '手游中低配只能是 P2 / P4 / P6（宪章写 P0 / P4 / P8）：一张表里手游和 PC 共用同一条事件的画质，P0 / P8 在 PC 中配就被去掉了；要 P0 / P4 / P8 得加「只上手游」的片段（PlatformFlags 2），工作台现在只有片段级 14 / 12。',
        '小平台小花束尾的束长（银扇 65 m、红彗星 75 m 的预览值）和挂花时刻（出束 1.0 s、0.85 倍长）都是估的，UE 里花可能不在束顶；量到后改 小花束尾.json 三个数重编。左右方向按 Roll 正 → 局部 Y 负推的。',
        '小平台用的是银扇 / 红彗星（手游白名单外），只上 PC；19 个片段放在节奏 D 的空小节里，高潮段不放。',
        f"GPU 预算仍按暂定 ≤ 200 / 秒排（实测上限 250），高档峰值 {g['peak']}；小平台加的每秒最多十来个。",
        '工作台版本号没升：云端会话装不了工作台依赖，16.0.19 的自动载入由本机同步（8）发布；现在请手动打开 B02 节目文件。',
        '像不像、乱不乱要你看；体检只能证明规则被遵守。',
    ]


def risks_b03():
    g, ob, au = CHECK['gpu'], COMPILE.get('oneTable', {}), LOGIC['audio']
    on = au['countdownOnsetsS']
    return [
        f"倒计时重新构图（修订2）：去掉扇形，PC 和手游同一套。10–6 小银菊从两端往中间收到 P4，5–2 橙辉星再收一遍，1 爆裂星 P4，「点火」{au['zeroShowS']:.2f} s 金芒菊从 P4 往外开。颜色银 → 橙 → 金。",
        f"VO 对位同修订1：10 在 {on[0]:.2f} s … 1 在 {on[-1]:.2f} s，「点火」16.20 s。没有逐字转写。小号球花要提前 2.95 s 起飞，所以 10 的尾缀从 1.3 s 起升空（闲话尾巴上就看得到）。",
        "点火时 1 号爆裂星（1.5 s 就灭）和金芒菊不打架；5–2 用橙辉星（3.2 s 灭）也是为了不压点火那排。",
        f"PC 挤成一团 9 处（都是修订3 原有的余烬），主角 0；手游三档 {ob.get('mobile', {}).get('high')} / {ob.get('mobile', {}).get('medium')} / {ob.get('mobile', {}).get('low')} 发，低位密奏仍有 5 s 断档。",
        f"代价：零点不压在原曲 17.19 s 那下重拍上（早 1 s）。GPU 同秒峰值 {g['peak']}；子模板内容都在 16.0.25 里。页面上方可切「修订1」对比。没在 UE 里放过。",
    ]


def risks_b04():
    g, ob, b4 = CHECK['gpu'], COMPILE.get('oneTable', {}), CHECK['b04']
    ov, ob0 = CHECK['overlap'], CHECK['overlapBase']
    fu = b4['fanUnderLowLayer']
    return [
        f"坝顶低层换 Tiny：B 点上 {len(b4['lowLayerTiny'])} 排小号球花（低位 8 点、叠层二排、A/B 间隔）开花 150 → 80 m（再加原 dz 0–30），升空 2.95 → 1.92 s，开花时刻不变、起飞晚约 1 s。三层更分明：扇 0–75 m、低层 80–110 m、P 排 150 m 起。",
        f"代价：低层 {len({x['flower'] for x in fu})} 排开的时候，同一个 B 点上都有扇在出束（{len({(x['flower'], x['fan']) for x in fu})} 对、{len(fu)} 个点次，多是托底扇和扇组），扇顶（估 65 / 75 m）会伸进 80 m 那朵花的下半；B03 时低层在 150 m，碰不到。真实花径 / 束长没量过（花径可能偏大），要在 UE 里看。",
        f"小平台：小花束尾 {len(b4['platform'])} 个片段换「前台小花 + XS」，同点位、第一朵花同一时刻（起飞提前 0.7 s）；花还是小银菊 / 金锦菊 / 爆裂星 22–28 m，挂在 XS 终点 62 m；V 形四根换四根 XS 不开花。倾斜 XS（±4–16°）在 UE 里没测过。",
        f"手游：小平台也上手游（三种小花都在 7 种白名单、XS 有 _M），手游高 / 中 / 低 {ob.get('mobile', {}).get('high')} / {ob.get('mobile', {}).get('medium')} / {ob.get('mobile', {}).get('low')} 发（B03 220 / 178 / 164）；低位密奏那 5 s 手游空档现在高中配有小平台补上。",
        f"Comet / Silver 3.0 原位替换（行名不变）：GPU 同秒峰值 {g['peak']}（3.0 没导进 UE 之前按旧扇算是 {CHECK['gpuBefore30']['peak']}）。",
        f"重叠体检同一把尺：PC {ov['pcIncidents']} 处（B03 {ob0['pcIncidents']}，都是原有的后压前余烬），手游三档各 {ov['mobile']['high']['incidents']}。XS / Tiny 的 ResourceFX 行名先占位叫 XS / Tiny；你加行时用这两个名字就不用改，名字不同告诉我改一处重编。页面上方可切「B03 修订2」对比。没在 UE 里放过。",
    ]


def risks_b05():
    g, ob, b5 = CHECK['gpu'], COMPILE.get('oneTable', {}), CHECK['b05']
    ov, ob0, gm = CHECK['overlap'], CHECK['overlapBase'], CHECK['gpuModel']
    sc = b5['mobileScale']
    return [
        '只换名字和手游种类，编排结构（时间、点位、高低、大小、档位、PC 的花）和 B04 一样。上方可切「B04」对比，PC 两版只有小平台的花换了资源。',
        '两根尾缀按用途接上你的新名字：坝顶低层（+80 m）= XS「跨年烟花3.0_低位_尾缀」，小平台（+62 m）= Tiny「跨年烟花3.0_极小_尾缀」——和 B04 的暂定名正好对调。导演表认 ResourceId，全部 26 个都在 T05 读回的表里；橙辉星 ID 改成 Glitter。',
        f"手游 6 种：大位金芒菊（×1.41–1.53）、中位辉星 / 银冠菊（×1.47–1.6）、小位点灭星 / 爆裂星、小平台分裂星（原生 30 m，×0.73–0.93）。共用片段 {len(b5['mobileSplit'])} 个拆成 PC 照旧 + 手游替身，原有替身 {len(b5['mobileStandinSwap'])} 个换花，手游 {ob.get('mobile', {}).get('high')} / {ob.get('mobile', {}).get('medium')} / {ob.get('mobile', {}).get('low')} 发不变。",
        '手游上看得出的变化：倒计时 10–2 从银冠菊 / 橙辉星都变成点灭星（橙辉星换点灭星是因为寿命一样 3.2 s，换爆裂星手游会多出两段空档），1 还是爆裂星；点火那排金芒菊（中位）变放大的辉星；银彩菊白墙和主角都变成大号金芒菊（主角 230 m，比 PC 的 280 m 小）。',
        f"小平台花按前台尺寸算倍数（小银菊 32 / 小金花 40 / 短爆裂 24 / 分裂星 30 m）；2800 / 2802 / 2803 现在还指向旧 90 m 小银菊粒子 LittleChry_HD，真资源接上前会显得大约 3 倍。GPU 按 10-14 读回：中号尾缀 6、银扇每束 1，PC 同秒峰值 {g['peak']}（B04 按同一份读回也是 {CHECK['gpuBase']['peak']}）。",
        f"重叠体检同一把尺：PC {ov['pcIncidents']} 处、手游各 {ov['mobile']['high']['incidents']} 处，和 B04 一样。没在 UE 里放过。",
    ]


def risks_b06():
    g, ob, b6, fa = CHECK['gpu'], COMPILE.get('oneTable', {}), CHECK['b06'], CHECK['fanAudit']
    ov, ob0 = CHECK['overlap'], CHECK['overlapBase']
    f6, f5 = fa['B06'], fa['B05']
    tr = b6['trio'][0] if b6['trio'] else None
    sh = CHECK['shares']['pc-high']
    return [
        '坝顶低层不用 80 m：B 点小号球花回到 B03 修订2 的 150 m（S 尾缀 + 原高差），和你 10-13 认的修订2 一样；Low80（XS「低位_尾缀」）这一版不用。上方可切「B05」对比。',
        f"扇整套重排：旧扇的时刻（大中号起飞 = 托底）当扇位，挤在一起的并掉，{fa['slots']} 个扇位放了 {fa['slots'] - len(fa['slotsDropped'])} 个、{len(fa['slotsDropped'])} 个让出来留空；每个扇位从 {fa['figureLibrary']} 种扇形里挑（隔点宽扇、两翼合拢 / 展开、隔点追、中心外扩、外→里压阵、逐点走、单束红雨……），前两个扇位用过的不用，银红换着来，方向跟这一波球花。",
        f"不叠：同时亮着的两把扇横向留够空（半宽 = 束长 × sin 最大倾角 + 12 m）——宽扇只隔点放，相邻点只放五束银扇或单束红。同一把尺量：B05 有 {f5['clashPairs']} 对叠（{f5['clashSamePoint']} 对在同一个点上），B06 {f6['clashPairs']}。束长是预览值（银 65 / 红 75 m），UE 没量；Comet 3.0 真比这长的话还会碰。",
        f"跟拍：每步落在曲子的起音 / 底鼓上（八分音符网格，±70 ms），踩上的比例 B05 {f5['onBeatOrOnset']:.0%} → B06 {f6['onBeatOrOnset']:.0%}；B05 的 8 点 0.1 s 扫（{f5['eightPointSweeps']} 次）没了，连续两个扇位同一扇形 {f6['consecutiveSameShape']} 次。扇的发数 {f5['fanEvents']} → {f6['fanEvents']}（少了一半，地面更干净；要更满说一声）。",
        (f"蓄势收窄的「3」（{tr['t']:.1f} s）：P4 大 + P3 / P5 中号 → P2 / P4 / P6 三朵同一种大号金芒菊、同样大；两侧比中间低 20 m，晚 0.1 s。手游也放这三朵（偶数点）。" if tr else '蓄势收窄的「3」没找到。'),
        f"占比（PC 高配，球花 {sh['balls']} 发）：小号 {sh['bySize'].get('小号', {}).get('pctOfBalls')}%、中号 {sh['bySize'].get('中号', {}).get('pctOfBalls')}%、大号 {sh['bySize'].get('大号', {}).get('pctOfBalls')}%、主角 {sh['bySize'].get('主角', {}).get('pctOfBalls')}%；另有扇 {sh['fans']}、小平台 {sh['platformEvents']}。",
        f"PC 高 / 中 / 低 {ob.get('pc', {}).get('high')} / {ob.get('pc', {}).get('medium')} / {ob.get('pc', {}).get('low')}，手游 {ob.get('mobile', {}).get('high')} / {ob.get('mobile', {}).get('medium')} / {ob.get('mobile', {}).get('low')}；GPU 同秒峰值 {g['peak']}；球花重叠 PC {ov['pcIncidents']} 处、手游各 {ov['mobile']['high']['incidents']}（同 B05 {ob0['pcIncidents']} / {ob0['mobile']['high']['incidents']}）。没在 UE 里放过。",
    ]


def risks_b07():
    g, ob, l7, sc = CHECK['gpu'], COMPILE.get('oneTable', {}), CHECK['b07'], CHECK['score']
    s6, s7 = sc['B06'], sc['B07']
    ov, ob0 = CHECK['overlap'], CHECK['overlapBase']
    ar, up = CHECK['area'], COMPILE.get('upright') or []
    fa = CHECK['fanAudit']
    return [
        f"修订1（用户 12:14 实机手游点灭星和尾缀开花位置对不上）：{len(up)} 个球花子模板倾角归 0，花放在尾缀正上方（原来花按「Roll 正 → 往 −Y」挪到斜尾缀顶端，UE 没实测过，按 UE4 公式方向相反，点灭星差 9.8 m）。现在不管引擎往哪边转都对得上。小平台 V 形（有意斜的）还按原约定，等你看一眼方向。",
        f"尾缀从地上出来：高差全部归 0（B06 有 {s6['trailsLifted']:.0%} 的球花尾缀从坝顶上方 10–70 m 才出现）。9 点大号整排改城垛（奇数点中号）{len(l7['castle'])} 排，P 排 / B 排同时开的之字 B 排缩小 {len(l7['zigzagSmall'])} 排，B 排接 B 排改成两半交替 {len(l7['bRows'])} 对。球花重叠 PC {ov['pcIncidents']} 处（B06 {ob0['pcIncidents']}）。",
        f"中低配隔点：一排（含按大小拆开的子片段）两端都留、中间隔一个去；天上很空的那几排中配不减。手游共用片段也按手游自己那一排隔，手游中配球花很满时小平台那一刻不放（{len(l7.get('mobileBusy', []))} 组）。同屏面积峰值 PC 中 / 低 {ar['B07-pc-medium'][0]} / {ar['B07-pc-low'][0]}（B06 {ar['B06-pc-medium'][0]}），手游中 / 低 {ar['B07-mobile-medium'][0]} / {ar['B07-mobile-low'][0]}（B06 {ar['B06-mobile-medium'][0]} / {ar['B06-mobile-low'][0]}）。PC 高 / 中 / 低 {ob.get('pc', {}).get('high')} / {ob.get('pc', {}).get('medium')} / {ob.get('pc', {}).get('low')}，手游 {ob.get('mobile', {}).get('high')} / {ob.get('mobile', {}).get('medium')} / {ob.get('mobile', {}).get('low')}。",
        f"小平台 {s6['platformCues']} → {s7['platformCues']} 组，起飞最长空档 {s6['platformMaxGapS']} → {s7['platformMaxGapS']} s；高度还是 62 m（不拉伸尾缀就只能等一根更短的尾缀资源）。",
        f"张力：终章 4 秒峰值 {s7['peak4s']['finale']} 朵（和 B06 一样），高潮 II 降到 {s7['peak4s']['climaxII']}（B06 {s6['peak4s']['climaxII']}）；白色收束收成 9 → 3 → 2 → 主角（大号每秒 {s6['codaLperS']} → {s7['codaLperS']}），这段的扇只用轻的。",
        f"扇：两把扇同时亮着多短都算叠，修订1 重排后 0 对（B06 用同一把尺 {fa['B06']['clashPairs']} 对）；GPU 同秒峰值 {g['peak']}。没在 UE 里放过。",
    ]


def risks_b08():
    g, ob, l8 = CHECK['gpu'], COMPILE.get('oneTable', {}), CHECK['b08']
    hv, ar, ov = CHECK['heavy'], CHECK['area'], CHECK['overlap']
    cap = [x for x in l8['capLow'] if not x.get('stuck')]
    return [
        f"低配限峰（用户 22:02，960 低配 Translucency 到 1 ms 会降分辨率；修订3 放宽到约 0.8 ms）：PC 低配亮着的浓密金菊面积 A ≤ 4.0；64 s 那个峰同时开花面积压到 B05 的 75 %。B05 实测的三个峰（64 / 183 / 189 s）附近：B05 A {hv['atB05Peaks']['B05']['64.3']['dense']} / {hv['atB05Peaks']['B05']['182.6']['dense']} / {hv['atB05Peaks']['B05']['189.0']['dense']}、S {hv['atB05Peaks']['B05']['64.3']['burst']} / {hv['atB05Peaks']['B05']['182.6']['burst']} / {hv['atB05Peaks']['B05']['189.0']['burst']}；B08 A {hv['atB05Peaks']['B08']['64.3']['dense']} / {hv['atB05Peaks']['B08']['182.6']['dense']} / {hv['atB05Peaks']['B08']['189.0']['dense']}、S {hv['atB05Peaks']['B08']['64.3']['burst']} / {hv['atB05Peaks']['B08']['182.6']['burst']} / {hv['atB05Peaks']['B08']['189.0']['burst']}。低配里 {len(cap)} 处再隔一次，{len(l8.get('destackLow', []))} 排低配换点避开同心叠；点火和主角那一刻不动。上限是从一张截图拟的，要 B08 实机测量确认。",
        f"小平台：Tiny 尾缀条目缩放 ×0.65，到顶约 40 m（时间不变）；花放大到 36–44 m，对称一对 ±15–22°。没出新尾缀。",
        f"同时同高的 P 排 / B 排小号（{len(l8['zigzagTiers'])} 处）：P 排挂现有中尾缀开到 +210 m，B 排 ×0.8 留在 +150 m，上下两层，不再被盖住。",
        f"种类大小：单独开的小号排按种类定基准（爆裂星 / 金裂星 100、点灭星 / 小银菊 95、橙辉星 / 小青柠 90 m），再叠每点 ×0.92 / 1 / 1.08；B 排小号同一刻上面有中大号的不放大（放大了会和上面那排同高叠）。中号、大号不放大（和 B07 修订1 同范围）。",
        f"更随机：{len(l8['mix'])} 排两种花交替（奇数位换不同色系）；齐发排每点错开 0–0.2 s，一半里→外放慢到 0.15 s / 步。",
        f"PC 高 / 中 / 低 {ob.get('pc', {}).get('high')} / {ob.get('pc', {}).get('medium')} / {ob.get('pc', {}).get('low')}，手游 {ob.get('mobile', {}).get('high')} / {ob.get('mobile', {}).get('medium')} / {ob.get('mobile', {}).get('low')}；球花重叠 PC {ov['pcIncidents']} 处；GPU 同秒峰值 {g['peak']}。没在 UE 里放过。",
    ]


def risks_day():
    ck, ob = CHECK, COMPILE.get('oneTable', {})
    iv = ck.get('intervals', {})
    return [
        "v4（10-15，跟 Night B06 一起改）：排法和 v3 一样；橙辉星 ID 换 Glitter、小平台换前台小花（Tiny 尾缀 + 小银菊）、手游只用 6 种（小银菊 / 橙辉星 → 点灭星，中号金芒菊 → 放大辉星，小平台分裂星）；「乱」的两把扇挪到最外 B7 / B0（原来 B6 那把压在高光银扇还亮着的同一点上）。",
        f"v3（用户 22:24）：进图 3 分钟放一次、不循环。0–5 s 闲聊 VO，天上全空，第一发 {ck.get('firstLaunchS', 5):.1f} s 起飞；5–35 s 做满（尾缀也算，PC / 手游都没有空着的时刻），最后一发 {ck.get('lastHitS', 0):.1f} s。",
        "整齐（5–22 s）：银扇从中间往外 → 银菊左到右 → 橙辉星右到左，每 1.2 s 一发；停一口气，21 s 高光「试一次齐放」：九点小银菊从中间往外 + 四把银扇 + 小平台三朵（PC）。",
        f"变乱（22–35 s）：高光还亮着时先只出低处的扇和小平台，26 s 起球花乱——一对差半拍、突然一发中号、连发、一小排断点、扇扫错方向——一直乱到结尾。间隔 {min(iv.get('messy', [0]) or [0]):.1f}–{max(iv.get('messy', [0]) or [0]):.1f} s 不等。",
        f"不挤：除了高光那一下 {ck['maxAliveBalls']} 朵并排，其余时刻都很稀；重叠体检 PC / 手游六档都是 0。GPU 同秒峰值 {ck['gpu']['peak']}。",
        f"PC 高 / 中 / 低 {ob.get('pc', {}).get('high')} / {ob.get('pc', {}).get('medium')} / {ob.get('pc', {}).get('low')} 发，手游 {ob.get('mobile', {}).get('high')} / {ob.get('mobile', {}).get('medium')} / {ob.get('mobile', {}).get('low')} 发；花型、大小、高度都是 Night 里已有的版本。单独节目（NewYearFireWorks_Day），交付选 Day 导演。没在 UE 里放过。",
    ]


def risks_r1():
    g, ob, r = CHECK['gpu'], COMPILE.get('oneTable', {}), CHECK['r1']
    st = r.get('standins') or []
    return [
        '没在 UE 里放过；体检是正面投影算的圆，没算景深，花的真实大小也要 UE 量（宪章 §3）。',
        f"错层后 PC「混成一团」35 → 11 处（编排重叠体检.py）：剩下 10 处是后一排开在前一排快熄的余烬上（重叠 0.3–1.3 s），1 处是终章白墙（墙按设计连成一片，没拆）。",
        f"大号整排拆成城垛（偶数点大号、奇数点回中号）{len(r['castle'])} 排：大花份额 31.6% → 25.1%（宪章目标 25–30%，刚好在下沿），中花 29.3% → 35.6%；想保留更多大花，可以改成大号整排只做高低错开（但还会挤，圆心距约 0.5 倍直径）。",
        '收窄3 现在是「P4 大号在上、P3 P5 中号在下」（发射点没挪，靠高低拉开）；如果你更想把三朵大号拉开发射点（P2 / P4 / P6），收窄的感觉会变成「一样宽、变稀」，说一声我改。',
        f"主角让位：主角亮着时，城垛大号在主角点上的那朵去掉（{'、'.join(f'{a} {b} {"/".join(c)}' for a, b, c in r['heroRoom'])}）；三主角本身仍在 P2 / P4 / P6（主角之间圆心距约 0.72 倍直径，设计成垂柳墙）。",
        f"逐排高低在原来的 −60…+25 m 里挪（平均挪 {r['heights']['meanMoveM']} m，最多 {r['heights']['maxMoveM']} m），超过 +25 m 尾缀会从半空出现，所以没放宽。",
        f"手游替身 {len(st)} 排（{ob.get('flags2', 0)} 发）是「只上手游」片段（PlatformFlags 2）：这个网页能看，编排工作台 16.0.18 还不支持，会被当成 PC + 手游；工作台加「只上手游」后（排给本机同步 8）再发到工作台。替身花型手机资源还没有。",
        f"手游三档 {ob.get('mobile', {}).get('high')} / {ob.get('mobile', {}).get('medium')} / {ob.get('mobile', {}).get('low')} 发；剩一段 73–78 s（低位密奏，PC 那里只有 B 点低排和小平台）手游空 5 s，B01 起就有。",
        f"GPU 预算仍按暂定 ≤ 200 / 秒排，PC 高档峰值 {g['peak']}（B02 是 200；城垛把一部分大号换回中号，尾缀 GPU 变少）。",
        '像不像、乱不乱要你看；体检只能证明规则被遵守。',
    ]


def risks():
    bf, fs, g = CHECK['baseFans'], CHECK['fanSummary'], CHECK['gpu']
    placed = bf['groups'] - len(bf['skipped'])
    return [
        'B 点上的球花（536 个事件）没在 UE 验证过；二排小银菊整排和高潮 II 的铺低层靠它。',
        '起爆高度用原资产，实际 +190 / +265 / +410 m，比宪章目标 +150 / +210 / +330 m 高约 25%。',
        '金垂柳用了 56 个（主角 5 + 终章金墙 51），同屏最多 32 个、每个 6 个 CPU 发射器，可能糊成一片金；主角是 230 m 原版，不是 280 m。',
        f"GPU 预算是暂定模型；高档峰值 {g['peak']}（{g['peakAt']} s）贴着软线 200，同时在场的扇束 GPU 发射器峰值 {fs['aliveGpuPeak']} 贴着 24 实测一次放干净的上限 234；托底扇把预算用满了，高档有 {g['nearBudget']} 处贴着 190–199，模型一旦偏乐观这些地方最先被截断。",
        f"托底扇是我逐波按预算从重往轻降级排的：M / L 波 {bf['groups']} 组，{placed} 组有托底，{len(bf['skipped'])} 组没放（空小节 / 预算）；预算紧的地方只剩几把红扇，银扇多半放不下（银扇每束 3 个 GPU，红彗星 1 个）。",
        '扇只有红彗星 / 银扇两种颜色，没有金扇（金扇不在 20 个基础资源里）；「外→里」只做到点序（外侧先点、往中间收），单把扇内部的外→里束型没有现成子模板。',
        '托底扇的方向：这一波自己定向（左→右 / 右→左 / 外→里）的扇跟着走，其余按 里→外、左→右、外→里、右→左 轮换，所以扇的次序有时与尾缀的次序不同；换方向的扇从第一支尾缀起飞时开始、0.1 s 一把，最晚一把比对应尾缀晚 0.7 s。',
        f"节目规模变大：父模板 {CHECK['_compile']['high']['templates']}（原 102）、槽位 {CHECK['_compile']['high']['scheduleSlots']}（原 238）；编译与展开检查通过，但导入器和 UE 对这个量没测过。",
        '可能偏满：129 个小节里只有 3 个空小节（41 / 65 / 96），现在地面还多了托底扇；留白感要你看。',
        '段落入口来自小节网格和响度分析，没试听；终章是不是主高潮要你听。',
        '手机档是机械规则（中档去最外两点、低档隔点留，托底扇低档不出）；没按手机画面单独设计。',
        '倒计时前 4 秒的红彗星单束是我加的预热，不喜欢就删。',
        '体检只能证明规则被遵守；像不像长冈要你用眼睛判断。',
    ]


def rgb(hexs):
    h = hexs.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def fmt_rgb(c):
    return ','.join(str(int(round(v))) for v in c)


def tail_rgb(c):
    return tuple(v + (a - v) * .55 for v, a in zip(c, (255, 244, 225)))


def fan_stats():
    """扇形编排统计：托底扇 方向 × 束型；单独放的扇组（按名字归并）的时刻"""
    base = [c for c in LOGIC['cues'] if c['wave'] == '托底扇']
    grid = defaultdict(lambda: defaultdict(int))
    for c in base:
        grid[c['sp']][DIR_CN.get(c.get('dir'), '齐发')] += len(c['events'])
    ph = defaultdict(lambda: {'events': 0, 'times': set()})
    for c in LOGIC['cues']:
        if c['size'] == 'F' and c['wave'] != '托底扇':
            name = c['wave'] if c['wave'] != '扇形' else '扇（' + c['label'] + '）'
            ph[name]['events'] += len(c['events'])
            ph[name]['times'].add(round(min(e['launch'] for e in c['events']), 1))
    phrases = [dict(name=k, events=v['events'], times=sorted(v['times'])) for k, v in sorted(ph.items(), key=lambda kv: min(kv[1]['times']))]
    bf = CHECK['baseFans']
    return dict(baseGrid={k: dict(v) for k, v in grid.items()}, baseCues=len(base), baseEvents=sum(len(c['events']) for c in base), groups=bf['groups'],
                baseCovered=bf['groups'] - len(bf['skipped']), baseSkipped=len(bf['skipped']), phrases=phrases, aliveGpuPeak=CHECK['fanSummary']['aliveGpuPeak'])



def b02_data(species):
    est = b01.BEAM_EST
    combos, rows = {}, []
    for x in b01.BEAMF['flowers']:
        beams = [dict(roll=b['roll'], reach=round(est['beamReachM'][b['res']] * b['scale'], 1), off=b['off'], dur=b01.BEAM_DUR[b['res']],
                      rgb=fmt_rgb(rgb(b01.BEAMF['beamSources'][b['res']]['color']))) for b in x['beams']]
        fl = []
        for f in x['flowers']:
            b = x['beams'][f['beam']]
            src = b01.BEAMF['flowerSources'][f['src']]
            fl.append(dict(beam=f['beam'], t=round(b['off'] + est['tipTimeS'], 2), dia=f['diameter'], r=round(est['beamReachM'][b['res']] * b['scale'] * est['tipFrac'], 1),
                           life=b01.TPL[src['template']]['life'], rgb=fmt_rgb(rgb(src['color']))))
        combos[x['code']] = dict(beams=beams, flowers=fl)
        n = sum(len(c['events']) for c in LOGIC['cues'] if c['sp'] == x['code'])
        if n or not B4P:
            rows.append(dict(name=x['name'].replace('小平台 · ', ''), beams=len(x['beams']), flowers=len(x['flowers']), h=round(b01.TPL[x['id']]['flightHeight']), n=n))
    tr = b01.NEWT['trails'][b01.FRONTF['trail']]
    for x in b01.FRONTF['flowers'] if B4P else ():   # B04 前台小花：XS 尾缀（不缩放，到顶 62 m）+ 小花挂在 XS 终点
        R = tr['burstM'] * b01.FRONTF.get('trailScale', 1.0)   # B08：Tiny 条目缩放后的到顶高度
        beams = [dict(roll=t['roll'], reach=R, off=t['off'], dur=tr['durationS'], rgb=fmt_rgb(rgb(tr['color']))) for t in x['trails']]
        fl = [dict(beam=f['trail'], t=round(x['trails'][f['trail']]['off'] + tr['riseS'], 4), dia=f['diameter'], r=R,
                   life=b01.TPL[b01.FRONTF['flowerSources'][f['src']]['template']]['life'], rgb=fmt_rgb(rgb(b01.FRONTF['flowerSources'][f['src']]['color']))) for f in x['flowers']]
        combos[x['code']] = dict(beams=beams, flowers=fl)
        n = sum(len(c['events']) for c in LOGIC['cues'] if c['sp'] == x['code'])
        rows.append(dict(name=x['name'].replace('小平台 · ', ''), beams=len(x['trails']), flowers=len(x['flowers']), h=round(b01.TPL[x['id']]['flightHeight']), n=n))
    ob = COMPILE.get('oneTable', {})
    mob = CHECK['b02']['mobileTiers']
    sp = '；'.join(f"{t}：" + '、'.join(f'{k} {v}' for k, v in mob[t]['bySpecies'].items()) for t in ('high', 'medium', 'low')).replace('high', '高').replace('medium', '中').replace('low', '低')
    mb = sorted(e['burst'] for c in LOGIC['cues'] if c.get('mobile') is not False for e in c['events'])
    gaps = [(a, b) for a, b in zip(mb, mb[1:]) if b - a > 8]
    sec = lambda t: [s['name'] for s in LOGIC['sections'] if s['start'] <= t][-1]   # 空小节（不属于任何段）算前一段
    span = lambda a, b: sec(a + 0.5) if sec(a + 0.5) == sec(b - 0.5) else f'{sec(a + 0.5)} → {sec(b - 0.5)}'
    gtxt = '；'.join(f"{a:.0f}–{b:.0f} s（{b - a:.0f} s，{span(a, b)}）" for a, b in gaps) or '无'
    b02 = dict(pc=ob.get('pc'), mobile=ob.get('mobile'), mobileSpecies=sp,
               mobileRule=('手游只用 6 种（用户 10-14 21:44）：大位（含主角）金芒菊放大 ×1.53；中位银冠菊 / 辉星放大 ×1.47–1.6；小位点灭星 / 爆裂星；小平台分裂星（2803 原生 30 m，进不了 90 m 小位）。PC 和手游共用的片段拆成 PC 照旧 + 手游替身（同点、同时、同高低、同档位），手游发数不变。坝顶低层（B 点）、托底扇、扇组不上手游。' if (B05 or B06 or B07 or DAY) else None) or ('只用 P 点 + 小平台；只放 7 种白名单（小银菊、银彩菊、金芒菊含大号、金锦菊、橙辉星、爆裂星、金垂柳）；M / L 一排只放偶数点；坝顶低层（B 点）、托底扇、扇组不上手游。B04 起小平台前台小花上手游（执行方案 §2.2「手机只放有手游版的」：三种小花都在白名单、XS 有 _M），手游中配跟 PC 中配同点、低配不放。替身照旧（只上手游，中低配 P0 / P4 / P8）。' if B04 else None) or '只用 P 点；只放执行方案 §2.1 周三白名单（小银菊、橙辉星、金芒菊含大号、银彩菊、主角，可选爆裂星、金锦菊）的主排；M / L 一排只放偶数点 P0 / 2 / 4 / 6 / 8（奇数点只上 PC，免得花叠花）；二排、托底扇、扇组、小平台都不上手游。'
               + ('修订1 加「手游替身」（只上手游，PlatformFlags 2，PC 不放）：PC 放白名单外的花、手游又空着的那一拍，手游放白名单里同色系的花，高配偶数点、中低配 P0 / P4 / P8；挤着还亮的手游花就挪高度或大号退中号。' if R1M else 'PC 三档一个不变。'),
               mobileGaps=gtxt, combos=rows,
               comboNote=('小平台尾缀 Tiny「极小_尾缀」（不缩放，62 m、升空 1.69 s）每根一组固化倾角（甲 / 乙两组），花换成小平台专用资源 2801 小银菊 / 2800 小金花 / 2802 短爆裂，缩到 22–28 m 挂在尾缀终点；手游版同一组尾缀、花换分裂星（2803）。V 形四根不开花。和 B04 同点位、同时刻。' if (B05 or B06 or B07 or DAY) else None) or ('通用尾缀 XS（不缩放，62 m、升空 1.69 s，行名占位）每根一组固化倾角（甲 / 乙两组），现成小银菊 / 金锦菊 / 爆裂星缩到 22–28 m 挂在 XS 终点、到顶就开；V 形四根不开花、每次放随机 ±6°。和 B03 的小花束尾同点位、第一朵花同一时刻。' if B04 else None) or '现成银扇 / 红彗星单束缩小当尾缀（每个变体一组固化随机角，甲 / 乙两组），现成小银菊 / 金锦菊 / 爆裂星缩到 22–28 m 挂在束顶；V 形细束不开花、每次放随机 ±6°。束长和挂花时刻是估的，见纰漏。')
    return combos, b02


def build(LOGIC):
    """一份逻辑方案 → 动画用的 cue / 事件 / 段落 / 锚点（B03 修订1 起要同时给试版和现版）"""
    cues, events = [], []
    per_sp = defaultdict(lambda: {'cues': 0, 'events': 0, 'rise': []})
    sec_ix = {s['id']: i for i, s in enumerate(LOGIC['sections'])}
    sec_cnt = defaultdict(lambda: {'cues': 0, 'events': 0})
    for c in LOGIC['cues']:
        med, low = set(c['profiles']['medium']), set(c['profiles']['low'])
        kind = 'fan' if c['size'] == 'F' else 'combo' if c['size'] == 'X' else 'ball'
        mb = 0 if c.get('mobile') is False else 2 if c.get('mobile') == 'only' else 1
        if B02 and kind == 'ball':
            tpl = b01.TPL[c['templateId'].split('__K')[0]]
            bh, bd = round(b01.bloom_h(c), 1), round((tpl['diameter'] or b01.DIA[c['size']]) * c.get('sizeK', 1.0), 1)
        tm = []
        for e in c['events']:
            m = 1 | (2 if e['point'] in med else 0) | (4 if e['point'] in low else 0)
            tm.append(m)
            ev = dict(l=e['launch'], b=e['burst'], e=e['end'], g=e['point'][0], p=int(e['point'][1:]), sp=c['sp'], k=kind,
                      sz=c['size'], n=BEAMS.get(c['sp'], 0) if kind == 'fan' else 0, dz=e['dz'], tier=m, cue=c['id'], bs=1 if c['wave'] == '托底扇' else 0)
            if B02:
                ev['mb'] = mb
                if kind == 'ball':
                    ev['h'], ev['d'] = bh, bd
            events.append(ev)
            per_sp[c['sp']]['events'] += 1
            if kind == 'ball':
                per_sp[c['sp']]['rise'].append(e['burst'] - e['launch'])
        per_sp[c['sp']]['cues'] += 1
        sec_cnt[c['section']]['cues'] += 1
        sec_cnt[c['section']]['events'] += len(c['events'])
        bursts = [e['burst'] for e in c['events']]
        cues.append(dict(id=c['id'], t=round(min(bursts), 3), span=round(max(bursts) - min(bursts), 3), sp=c['sp'], sz=c['size'], k=kind,
                         label=c['label'], wave=c['wave'], layer=c['layer'], sec=sec_ix[c['section']], dir=DIR_CN.get(c.get('dir'), ''),
                         pts=[e['point'] for e in c['events']], tm=tm, mb=mb))
    events.sort(key=lambda e: (e['l'], e['b']))
    cues.sort(key=lambda c: (c['t'], c['id']))
    secs = []
    for i, s in enumerate(LOGIC['sections']):
        start = 0.0 if i == 0 else s['start']
        end = LOGIC['sections'][i + 1]['start'] if i + 1 < len(LOGIC['sections']) else DUR
        secs.append(dict(id=s['id'], name=s['name'], role=ROLE.get(s['name'], '推进'), bar0=s['bar0'], bar1=s['bar1'], showStartS=round(start, 3), showEndS=round(end, 3),
                         musicStartS=round(start - OFFSET, 3), musicEndS=round(end - OFFSET, 3), lead=s['lead'], relay=s['relay'], accent=s['accent'], note=s['note'],
                         cues=sec_cnt[s['id']]['cues'], events=sec_cnt[s['id']]['events']))

    anchors = {}
    if LOGIC.get('musicMarkers'):        # B03：合并音频实测的 VO / 零点 + 换算过的用户时刻
        for m in LOGIC['musicMarkers']:
            anchors[m['time']] = dict(showS=m['time'], musicS=round(m['time'] - OFFSET, 3), label=m['name'].split('｜')[-1], source=m['confidence'], note='')
    user = {} if LOGIC.get('musicMarkers') or LOGIC.get('noMusic') else {10.0: ('0 点 · 开场高潮', '用户给定', '倒计时归零；音乐第 3 小节强拍'), 112.2: ('高潮 II 回归（用户 1:47）', '用户给定 + 检测', '静默一小节后回归的点，不是响度最高点')}
    for t, (label, src, note) in user.items():
        anchors[t] = dict(showS=t, musicS=round(t - OFFSET, 3), label=label, source=src, note=note)
    for t, label in (() if LOGIC.get('musicMarkers') or LOGIC.get('noMusic') else ((110.6, '静默一小节'), (175.4, '⑧ 三主角垂柳墙'), (196.5, '终和弦 · 白墙'))):
        anchors[t] = dict(showS=t, musicS=round(t - OFFSET, 3), label=label, source='小节网格 + 响度，待试听', note='')
    for s in secs[1:]:
        t = round(s['showStartS'], 1)
        if all(abs(t - k) > .35 for k in anchors):
            anchors[t] = dict(showS=t, musicS=round(t - OFFSET, 3), label=f"{s['name']}入口", source='小节网格 + 响度，待试听', note='')
    anchors = [anchors[k] for k in sorted(anchors)]
    return cues, events, per_sp, secs, anchors


def main():
    cues, events, per_sp, secs, anchors = build(LOGIC)

    species = {}
    for k, (tid, name, size, hexc, body_gpu) in b01.SPECIES.items():
        c = rgb(hexc)
        d = per_sp[k]
        alive = CHECK['aliveBySpecies'].get(k, {})
        species[k] = dict(name=name, sz=size, rgb=fmt_rgb(c), tail=fmt_rgb(tail_rgb(c)), cues=d['cues'], events=d['events'],
                          rise=round(statistics.median(d['rise']), 2) if d['rise'] else 0,
                          beams=BEAMS.get(k, 0),
                          gpu=(f"尾缀 {TAIL_GPU[size]} + 本体 {body_gpu}" if size in TAIL_GPU else ('银星 3 / 束' if k[0] == 'S' else '红彗星 1 / 束')),
                          peak=alive.get('peak'), peakAt=alive.get('peakAt'))
        if B02 and size in 'SML':
            species[k]['dia'] = b01.TPL[tid]['diameter'] or b01.DIA[size]
            species[k]['h'] = round(b01.bloom_h(dict(templateId=tid, size=size)))
        if B4P and size == 'F':
            species[k]['gpu'] = ('10-14 读回：' + ('银扇 1 / 束' if k[0] == 'S' else '红彗星 3.0 0')) if (B06 or B07 or DAY) else '3.0：0（旧扇 ' + ('银星 3 / 束）' if k[0] == 'S' else '红彗星 1 / 束）')
        if B4P and size == 'S' and any(c['sp'] == k and c.get('trail') in ('Tiny', 'Low80') for c in LOGIC['cues']):
            species[k]['gpu'] += '；坝顶低层换 Tiny 尾缀 0'
        if size == 'X' and 'frontFlower' in b01.TPL[tid]:
            species[k]['gpu'] = '尾缀 XS 0 + 花 0'
        elif size == 'X':
            species[k]['gpu'] = '束 ' + ' + '.join(f"{b01.BEAMF['beamSources'][b['res']]['gpuPerBeam']}" for b in b01.TPL[tid]['beamFlower']['beams'])


    energy = [dict(m=p['musicS'], db=p['rmsDb']) for p in MUSIC['perSecond']]
    pts = {'P': [dict(id=f'P{i}', x=b01.PT[f'P{i}']['x']) for i in range(9)], 'B': [dict(id=f'B{i}', x=b01.PT[f'B{i}']['x']) for i in range(8)]}
    native = b01.REL_H
    data = dict(version=NAME, offsetS=OFFSET, showDurationS=DUR, native=native, points=pts, sections=secs, anchors=anchors, energy=energy,
                species=species, cues=cues, events=events, risks=risks_day() if DAY else risks_b08() if B08 else risks_b07() if B07 else risks_b06() if B06 else risks_b05() if B05 else risks_b04() if B04 else risks_b03() if B03 else risks_r1() if R1M else risks_b02() if B02 else risks(), fanStats=fan_stats())
    if B02:
        data['native'] = {k: round(v * b01.TRAIL_K[k]) for k, v in b01.REL_H.items()}
        pts['F'] = [dict(id=f'F{i}', x=b01.PT[f'F{i}']['x']) for i in range(7)]
        data['combos'], data['b02'] = b02_data(species)
    if B07:                           # B07 / B06 一页对比（B08：B08 / B07 修订1）；大号数字跟 VO
        old = json.loads((OUT / ('逻辑方案_B07.json' if B08 else '逻辑方案_B06.json')).read_text(encoding='utf-8'))
        oc, oe, _, osecs, oanch = build(old)
        au, mix = LOGIC['audio'], json.loads((ROOT / 'analysis/music/合并音频_VO倒计时.json').read_text(encoding='utf-8'))
        data['variants'] = ([dict(label='B08修订3', note='低配限峰放宽到约 0.8 ms（浓密金菊面积 ≤ 4.0）· 低配避开同心叠· 小平台 40 m 放大 · 同时同高两层 · 种类大小 · 时间错开', cues=cues, events=events, sections=secs, anchors=anchors),
                             dict(label='B07修订1', note='球花尾缀竖直 · 扇不叠', cues=oc, events=oe, sections=osecs, anchors=oanch)] if B08 else
                            [dict(label='B07修订1', note='球花尾缀竖直 · 扇不叠 · 手游中配隔点', cues=cues, events=events, sections=secs, anchors=anchors),
                             dict(label='B06', note='尾缀从坝顶 + 高差出来', cues=oc, events=oe, sections=osecs, anchors=oanch)])
        data['vo'] = dict(chat=[mix['voChat'][0]['start'], mix['voChat'][-1]['end']], nums=[[t, 10 - i] for i, t in enumerate(au['countdownOnsetsS'])],
                          fire=dict(start=au['voFire']['start'], end=au['voFire']['end']), zero=au['zeroShowS'])
    if B06:                           # B06 / B05 一页对比；大号数字跟 VO
        old = json.loads((OUT / '逻辑方案_B05.json').read_text(encoding='utf-8'))
        oc, oe, _, osecs, oanch = build(old)
        au, mix = LOGIC['audio'], json.loads((ROOT / 'analysis/music/合并音频_VO倒计时.json').read_text(encoding='utf-8'))
        data['variants'] = [dict(label='B06', note='低层 150 m · 扇重排跟拍不叠 · P2 / P4 / P6 等大', cues=cues, events=events, sections=secs, anchors=anchors),
                            dict(label='B05', note='低层 80 m · 旧扇', cues=oc, events=oe, sections=osecs, anchors=oanch)]
        data['vo'] = dict(chat=[mix['voChat'][0]['start'], mix['voChat'][-1]['end']], nums=[[t, 10 - i] for i, t in enumerate(au['countdownOnsetsS'])],
                          fire=dict(start=au['voFire']['start'], end=au['voFire']['end']), zero=au['zeroShowS'])
    if B05:                           # B05 / B04 一页对比；大号数字跟 VO
        old = json.loads((OUT / '逻辑方案_B04.json').read_text(encoding='utf-8'))
        oc, oe, _, osecs, oanch = build(old)
        au, mix = LOGIC['audio'], json.loads((ROOT / 'analysis/music/合并音频_VO倒计时.json').read_text(encoding='utf-8'))
        data['variants'] = [dict(label='B05', note='ResourceFX 新命名 · 手游 6 种', cues=cues, events=events, sections=secs, anchors=anchors),
                            dict(label='B04', note='手游 7 种 · 尾缀占位名', cues=oc, events=oe, sections=osecs, anchors=oanch)]
        data['vo'] = dict(chat=[mix['voChat'][0]['start'], mix['voChat'][-1]['end']], nums=[[t, 10 - i] for i, t in enumerate(au['countdownOnsetsS'])],
                          fire=dict(start=au['voFire']['start'], end=au['voFire']['end']), zero=au['zeroShowS'])
    if B04:                           # B04 / B03 修订2 一页对比；大号数字跟 VO
        old = json.loads((OUT / '逻辑方案_B03r2m.json').read_text(encoding='utf-8'))
        oc, oe, _, osecs, oanch = build(old)
        au, mix = LOGIC['audio'], json.loads((ROOT / 'analysis/music/合并音频_VO倒计时.json').read_text(encoding='utf-8'))
        data['variants'] = [dict(label='B04', note='坝顶低层 Tiny 80 m · 小平台前台小花 XS · 扇 3.0', cues=cues, events=events, sections=secs, anchors=anchors),
                            dict(label='B03 修订2', note='低层 150 m · 小平台小花束尾', cues=oc, events=oe, sections=osecs, anchors=oanch)]
        data['vo'] = dict(chat=[mix['voChat'][0]['start'], mix['voChat'][-1]['end']], nums=[[t, 10 - i] for i, t in enumerate(au['countdownOnsetsS'])],
                          fire=dict(start=au['voFire']['start'], end=au['voFire']['end']), zero=au['zeroShowS'])
    if B03:                           # 试版 / 现版一页对比；大号数字跟 VO
        old = json.loads((OUT / '逻辑方案_B03r1m.json').read_text(encoding='utf-8'))
        oc, oe, _, osecs, oanch = build(old)
        au, mix = LOGIC['audio'], json.loads((ROOT / 'analysis/music/合并音频_VO倒计时.json').read_text(encoding='utf-8'))
        data['variants'] = [dict(label='修订2 · 新倒计时', note='两遍从两端往中间收：银 → 橙 → 爆裂星 → 点火', cues=cues, events=events, sections=secs, anchors=anchors),
                            dict(label='修订1 · 扇形', note='10–7 红彗星五束 + 手游替身', cues=oc, events=oe, sections=osecs, anchors=oanch)]
        data['vo'] = dict(chat=[mix['voChat'][0]['start'], mix['voChat'][-1]['end']], nums=[[t, 10 - i] for i, t in enumerate(au['countdownOnsetsS'])],
                          fire=dict(start=au['voFire']['start'], end=au['voFire']['end']), zero=au['zeroShowS'])
    if DAY:
        data.update(countdown=False, noMusic=True, energy=[dict(m=0, db=-4), dict(m=DUR, db=-4)],
                    captions=[[0, 5.0, 'VO 闲聊 · 天上全空']],
                    anchors=[dict(showS=0.0, musicS=0.0, label='VO 闲聊（前 5 s 全空）', source='用户给定', note=''),
                             dict(showS=21.0, musicS=21.0, label='高光 · 试一次齐放', source='编排', note=''),
                             dict(showS=22.0, musicS=22.0, label='整齐 → 变乱', source='编排', note=''),
                             dict(showS=35.0, musicS=35.0, label='做满到 35 s', source='用户给定', note='')])
    b64 = ''
    if (B03 or B4P) and not DAY:      # 10-13 17:06「这个动画能同步让我听到音乐vo吗」：合并音频原字节内嵌，0 s 起播
        mix = ROOT / '协作/编排工作台资料/2026-10-13/music/VO倒计时+汪洋与浩渺.mp3'
        raw = mix.read_bytes()
        assert hashlib.sha256(raw).hexdigest() == LOGIC['audio']['mix']['sha256'], '合并音频和逻辑方案的指纹对不上'
        data['audio'] = dict(name=mix.name, sha256=LOGIC['audio']['mix']['sha256'], offsetS=0, durationS=LOGIC['audio']['mix']['durationS'])
        data['startS'] = 0.0
        b64 = base64.b64encode(raw).decode('ascii')
    html = TEMPLATE.read_text(encoding='utf-8').replace('__PREVIEW_DATA__', json.dumps(data, ensure_ascii=False, separators=(',', ':'))).replace('__AUDIO_B64__', b64, 1)
    if DAY:
        html = html.replace('<title>汪洋与浩渺编排B01</title>', '<title>跨年秀 Day 试放</title>', 1).replace('跨年烟花秀 B01 正面比例动画', '零点前 NPC 试放（进图 3 分钟放一次）正面比例动画', 1)
        html = (html.replace('<th>小平台小花束尾</th><th>束 / 花</th><th>挂花高</th>', '<th>小平台前台小花（Tiny）</th><th>尾缀 / 花</th><th>开花高</th>', 1)
                .replace('<td>${x.beams} 束 / ${x.flowers} 朵</td>', '<td>${x.beams} 根 / ${x.flowers} 朵</td>', 1).replace('>小平台小花束尾</i>', '>小平台前台小花</i>', 1))
    elif B02:
        if B4P:
            html = (html.replace('<th>小平台小花束尾</th><th>束 / 花</th><th>挂花高</th>', ('<th>小平台前台小花（Tiny）</th><th>尾缀 / 花</th><th>开花高</th>' if (B05 or B06 or B07) else '<th>小平台前台小花（XS）</th><th>尾缀 / 花</th><th>开花高</th>'), 1)
                    .replace('<td>${x.beams} 束 / ${x.flowers} 朵</td>', '<td>${x.beams} 根 / ${x.flowers} 朵</td>', 1).replace('>小平台小花束尾</i>', '>小平台前台小花</i>', 1))
        html = html.replace('<title>汪洋与浩渺编排B01</title>', f'<title>汪洋与浩渺编排{NAME}</title>', 1).replace('跨年烟花秀 B01 正面比例动画', f'跨年烟花秀 {NAME} 正面比例动画' + (' 修订1' if R1M else ''), 1)
    assert '</script>' not in json.dumps(data, ensure_ascii=False)
    (OUT / f'{NAME}动画.html').write_text(html, encoding='utf-8')
    print(f'{NAME}动画.html  {len(html) / 1024:.0f} KB · {len(cues)} cue · {len(events)} 事件 · {len(secs)} 段 · {len(anchors)} 锚点')


if __name__ == '__main__':
    main()
