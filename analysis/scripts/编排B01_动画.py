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
B03 = '--b03' in sys.argv             # B03（22，10-13 16:28）：合并音频（VO 闲话 + 倒计时 + 汪洋与浩渺），修订3 高度 + 手游替身，输出 B03动画.html
B02 = B03 or R1M or '--b02' in sys.argv
SFX, TABLE, NAME = ('_B03m', 'B03m', 'B03') if B03 else ('_B02r1m', 'B02r1m', 'B02') if R1M else ('_B02', 'B02', 'B02') if B02 else ('', 'B01', 'B01')
if B02:
    b01.HEIGHTS = 'v2'
LOGIC = json.loads((OUT / f'逻辑方案{SFX}.json').read_text(encoding='utf-8'))
CHECK = json.loads((OUT / f'体检{SFX}.json').read_text(encoding='utf-8'))
MUSIC = json.loads((ROOT / 'analysis/music/汪洋与浩渺_分析.json').read_text(encoding='utf-8'))
_cp = ROOT / f'FXtools/节目/NewYearFireWorks_v01/{TABLE}编排检查.json'
if B03:                               # 10-13 17:06 编译成 B03-VO倒计时合并音频-手游补位（工作台 16.0.25）
    _cp = ROOT / 'FXtools/节目/NewYearFireWorks_v01/B03-VO倒计时合并音频-手游补位编排检查.json'
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
    g, ob, r = CHECK['gpu'], COMPILE.get('oneTable', {}), LOGIC['retime']
    au = LOGIC['audio']
    on = au['countdownOnsetsS']
    return [
        f"演出秒 = 合并音频的秒：原曲在 {au['musicStartS']:.2f} s 起（实测），VO 喊 10 声 {on[0]:.1f}–{on[-1]:.1f} s，零点 {au['zeroShowS']:.2f} s（最后一声之后的原曲第 10 小节重拍；你说的 16 s 那时 VO 还在喊最后两声）。零点要改，给一个数整场跟着平移。",
        '0–6.5 s VO 闲话时天上不放；倒计时 10 发对上 VO 10 声（红彗星 4 发 → 小银菊 5 对 → 银扇 1 发），最后两声只隔 0.24 s，两发挨得很近。',
        f"第 17 小节以后的片段照原曲小节整体提前 {abs(r['musicShiftS']):.1f} s（0.1 s 网格，离小节线差 8 ms），高度和大小都是修订3 的（已导入 UE 的子模板照用）。",
        '原「连续展开」和新的开场叠在一起：金曜菊、小银菊、金蕊青柠星整排和一组小平台去掉了，第 16 小节留空喘口气（补金曜菊会和第 17 小节金锦菊整排同点同高压满 3 s）。',
        f"PC 挤成一团 10 处：9 处是修订3 原有的余烬重叠，1 处新的很轻（倒计时最后一对小银菊和零点二排小银菊，0.7 s）。主角相关 0。",
        f"手游三档 {ob.get('mobile', {}).get('high')} / {ob.get('mobile', {}).get('medium')} / {ob.get('mobile', {}).get('low')} 发（含只上手游的替身 {ob.get('flags2', 0)} 发）；剩一段 5 s 断档在低位密奏。",
        '声音：这个网页和工作台 16.0.25 都放合并音频（VO + 汪洋与浩渺，0 s 起播），跟着播放 / 拖动 / 倍速走；2× / 4× 会变快变调。浏览器回放不等于 UE 实播。',
        f"GPU 仍按暂定 ≤ 200 / 秒，PC 高档峰值 {g['peak']}。没在 UE 里放过。",
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
        rows.append(dict(name=x['name'].replace('小平台 · ', ''), beams=len(x['beams']), flowers=len(x['flowers']), h=round(b01.TPL[x['id']]['flightHeight']), n=n))
    ob = COMPILE.get('oneTable', {})
    mob = CHECK['b02']['mobileTiers']
    sp = '；'.join(f"{t}：" + '、'.join(f'{k} {v}' for k, v in mob[t]['bySpecies'].items()) for t in ('high', 'medium', 'low')).replace('high', '高').replace('medium', '中').replace('low', '低')
    mb = sorted(e['burst'] for c in LOGIC['cues'] if c.get('mobile') is not False for e in c['events'])
    gaps = [(a, b) for a, b in zip(mb, mb[1:]) if b - a > 8]
    sec = lambda t: [s['name'] for s in LOGIC['sections'] if s['start'] <= t][-1]   # 空小节（不属于任何段）算前一段
    span = lambda a, b: sec(a + 0.5) if sec(a + 0.5) == sec(b - 0.5) else f'{sec(a + 0.5)} → {sec(b - 0.5)}'
    gtxt = '；'.join(f"{a:.0f}–{b:.0f} s（{b - a:.0f} s，{span(a, b)}）" for a, b in gaps) or '无'
    b02 = dict(pc=ob.get('pc'), mobile=ob.get('mobile'), mobileSpecies=sp,
               mobileRule='只用 P 点；只放执行方案 §2.1 周三白名单（小银菊、橙辉星、金芒菊含大号、银彩菊、主角，可选爆裂星、金锦菊）的主排；M / L 一排只放偶数点 P0 / 2 / 4 / 6 / 8（奇数点只上 PC，免得花叠花）；二排、托底扇、扇组、小平台都不上手游。'
               + ('修订1 加「手游替身」（只上手游，PlatformFlags 2，PC 不放）：PC 放白名单外的花、手游又空着的那一拍，手游放白名单里同色系的花，高配偶数点、中低配 P0 / P4 / P8；挤着还亮的手游花就挪高度或大号退中号。' if R1M else 'PC 三档一个不变。'),
               mobileGaps=gtxt, combos=rows,
               comboNote='现成银扇 / 红彗星单束缩小当尾缀（每个变体一组固化随机角，甲 / 乙两组），现成小银菊 / 金锦菊 / 爆裂星缩到 22–28 m 挂在束顶；V 形细束不开花、每次放随机 ±6°。束长和挂花时刻是估的，见纰漏。')
    return combos, b02


def main():
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
        if size == 'X':
            species[k]['gpu'] = '束 ' + ' + '.join(f"{b01.BEAMF['beamSources'][b['res']]['gpuPerBeam']}" for b in b01.TPL[tid]['beamFlower']['beams'])

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
    user = {} if LOGIC.get('musicMarkers') else {10.0: ('0 点 · 开场高潮', '用户给定', '倒计时归零；音乐第 3 小节强拍'), 112.2: ('高潮 II 回归（用户 1:47）', '用户给定 + 检测', '静默一小节后回归的点，不是响度最高点')}
    for t, (label, src, note) in user.items():
        anchors[t] = dict(showS=t, musicS=round(t - OFFSET, 3), label=label, source=src, note=note)
    for t, label in (() if LOGIC.get('musicMarkers') else ((110.6, '静默一小节'), (175.4, '⑧ 三主角垂柳墙'), (196.5, '终和弦 · 白墙'))):
        anchors[t] = dict(showS=t, musicS=round(t - OFFSET, 3), label=label, source='小节网格 + 响度，待试听', note='')
    for s in secs[1:]:
        t = round(s['showStartS'], 1)
        if all(abs(t - k) > .35 for k in anchors):
            anchors[t] = dict(showS=t, musicS=round(t - OFFSET, 3), label=f"{s['name']}入口", source='小节网格 + 响度，待试听', note='')
    anchors = [anchors[k] for k in sorted(anchors)]

    energy = [dict(m=p['musicS'], db=p['rmsDb']) for p in MUSIC['perSecond']]
    pts = {'P': [dict(id=f'P{i}', x=b01.PT[f'P{i}']['x']) for i in range(9)], 'B': [dict(id=f'B{i}', x=b01.PT[f'B{i}']['x']) for i in range(8)]}
    native = b01.REL_H
    data = dict(version=NAME, offsetS=OFFSET, showDurationS=DUR, native=native, points=pts, sections=secs, anchors=anchors, energy=energy,
                species=species, cues=cues, events=events, risks=risks_b03() if B03 else risks_r1() if R1M else risks_b02() if B02 else risks(), fanStats=fan_stats())
    if B02:
        data['native'] = {k: round(v * b01.TRAIL_K[k]) for k, v in b01.REL_H.items()}
        pts['F'] = [dict(id=f'F{i}', x=b01.PT[f'F{i}']['x']) for i in range(7)]
        data['combos'], data['b02'] = b02_data(species)
    b64 = ''
    if B03:                           # 10-13 17:06「这个动画能同步让我听到音乐vo吗」：合并音频原字节内嵌，0 s 起播
        mix = ROOT / '协作/编排工作台资料/2026-10-13/music/VO倒计时+汪洋与浩渺.mp3'
        raw = mix.read_bytes()
        assert hashlib.sha256(raw).hexdigest() == LOGIC['audio']['mix']['sha256'], '合并音频和逻辑方案的指纹对不上'
        data['audio'] = dict(name=mix.name, sha256=LOGIC['audio']['mix']['sha256'], offsetS=0, durationS=LOGIC['audio']['mix']['durationS'])
        data['startS'] = 0.0
        b64 = base64.b64encode(raw).decode('ascii')
    html = TEMPLATE.read_text(encoding='utf-8').replace('__PREVIEW_DATA__', json.dumps(data, ensure_ascii=False, separators=(',', ':'))).replace('__AUDIO_B64__', b64, 1)
    if B02:
        html = html.replace('<title>汪洋与浩渺编排B01</title>', f'<title>汪洋与浩渺编排{NAME}</title>', 1).replace('跨年烟花秀 B01 正面比例动画', f'跨年烟花秀 {NAME} 正面比例动画' + (' 修订1' if R1M else ''), 1)
    assert '</script>' not in json.dumps(data, ensure_ascii=False)
    (OUT / f'{NAME}动画.html').write_text(html, encoding='utf-8')
    print(f'{NAME}动画.html  {len(html) / 1024:.0f} KB · {len(cues)} cue · {len(events)} 事件 · {len(secs)} 段 · {len(anchors)} 锚点')


if __name__ == '__main__':
    main()
