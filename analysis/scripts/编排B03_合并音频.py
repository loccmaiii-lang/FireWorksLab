#!/usr/bin/env python3
"""B03：把修订3 的编排搬到合并音频上（跨年秀 22，用户 10-13 16:28）。

用户：「节奏需要重新调整一下，新增VO段并与汪洋与浩渺融合；VO段总时长为16秒，汪洋与浩渺从VO段01秒开始播放，第16秒敲钟播放，
       VO段前6秒是说闲话，后10秒是vo喊倒计时」
量到（合并音频分析.py → analysis/music/合并音频_VO倒计时.json）：原曲在合并文件 0.792 s 起；VO 喊 10 声；零点默认 = 最后一声之后的
第一个小节重拍（原曲第 10 小节，17.19 s），--zero 可改。演出秒 = 合并音频的秒。

只改时间，不改高度和大小（修订3 的高差 10 m 档、球花 0.92 / 1 / 1.08 都已导进 UE，子模板版本照用）：
  ① 原曲照小节：第 17 小节「密集问答」以后的片段整体平移到新起点（原 +5 s → 合并文件 0.792 s，按 0.1 s 网格取 −4.2 s，离小节线差 8 ms）；
  ② 倒计时 10 发对上 VO 10 声：红彗星单束 4 发（起飞 = 喊数）、小银菊 5 对（开花 = 喊数）、银扇 1 发（起飞 = 最后一声）；
  ③ 开场高潮：零点那一组（整排叠层 + 托底扇）开在零点，后面两组按原来的小节间隔跟着（原第 3 / 5 / 7 小节 → 零点小节 / +2 / +4）；
  ④ 原「连续展开」（第 9–16 小节）和新的开场重叠：开场最后一组之后半小节以内的那几组去掉（金曜菊、小银菊、金蕊青柠星整排和一组小平台），
     之后的照小节留着（第 15 小节的小平台小花）；托底扇跟着它托的那一排走、那一排去掉就一起去掉；手游拆开的偶 / 奇两半、手游替身跟着原排走。
     第 16 小节留空：补金曜菊会和第 17 小节金锦菊整排同点同高压满 3 s（--fill-opening 可试）。
用法：python3 -I analysis/scripts/编排B03_合并音频.py [--base 修订3逻辑方案] [--audio 分析.json] [--zero 秒] [--name B03] [--out-dir 协作/编排B01]
"""
import argparse
import copy
import importlib.util
import json
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location('b01', ROOT / 'analysis/scripts/编排B01.py')
b = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(b)
b.HEIGHTS = 'v2'
OLD_BAR0, BAR = b.BAR0, b.BAR          # 5.18 / 1.6216（原曲 +5 s）
q1 = b.q1


def cue_t(c):
    return min(e['launch'] if c['size'] == 'F' else e['burst'] for e in c['events'])


def shift(c, dt):
    dt = q1(dt)
    for e in c['events']:
        e['launch'] = q1(e['launch'] + dt)
        e['burst'] = round(e['burst'] + dt, 6)
        e['end'] = round(e['end'] + dt, 6)
        if 'H' in e:
            e['H'] = round(e['H'] + dt, 4)
    if 'H0' in c:
        c['H0'] = round(c['H0'] + dt, 4)
    return dt


def retime(plan, audio, zero, fill=False):
    new_bar0 = round(audio['musicStartS'] + 0.18, 5)
    Tn = lambda bar: new_bar0 + BAR * bar
    bar_old = lambda t: (t - OLD_BAR0) / BAR
    dm = q1(new_bar0 - OLD_BAR0)                                 # 原曲照小节：−4.2
    zb = (zero - new_bar0) / BAR
    on = audio['countdownOnsetsS']
    cues = copy.deepcopy(plan['cues'])
    by = {c['id']: c for c in cues}
    log = dict(musicShiftS=dm, zeroShowS=zero, zeroBar=round(zb, 3), dropped=[], countdown=[], opening=[])
    parent = lambda c: c.get('splitOf') or c.get('standinOf')
    # ② 倒计时
    for c in cues:
        if c['section'] != 'B01_S0':
            continue
        n = int(''.join(ch for ch in c['label'] if ch.isdigit()) or 0)
        t = on[10 - n]
        rise = 0.0 if c['size'] == 'F' else b.rise_of(c['sp'])
        old = min(e['launch'] for e in c['events'])
        d = shift(c, q1(t - rise) - old)
        log['countdown'].append((c['label'], round(t, 2), d))
    # ③ 开场高潮：按原小节分组，零点组对零点，其余按原间隔排在零点小节之后（零点不在小节线上时，后面的组仍落在整小节上）
    s1 = [c for c in cues if c['section'] == 'B01_S1' and not parent(c) and c.get('wave') != '托底扇']
    zero_cue = min((c for c in s1 if c['size'] in 'SML'), key=cue_t)
    z0 = min(e['burst'] for e in zero_cue['events'])
    zb_int = math.ceil(zb - 0.05)                               # 零点之后的组从零点后的第一个整小节算起（零点在小节线上 = 原来的 round）
    groups = defaultdict(list)
    for c in s1:
        groups[round(bar_old(cue_t(c)) - 0.25)].append(c)        # 托底扇 / 扇组比球花早一点，按小节归组
    zero_bar_old = round(bar_old(z0) - 0.25)
    moved = {}
    for bo, cs in sorted(groups.items()):
        if bo == zero_bar_old:
            d = q1(zero - z0)
        else:
            d = q1(Tn(zb_int + (bo - zero_bar_old)) - (OLD_BAR0 + BAR * bo))
        for c in cs:
            moved[c['id']] = shift(c, d)
        log['opening'].append((bo, zb_int + (bo - zero_bar_old) if bo != zero_bar_old else round(zb, 2), d, [c['id'] for c in cs]))
    last_open = max(cue_t(c) for c in s1)
    # ① 其余照小节；④ 原「连续展开」和开场重叠的去掉
    keep_from = last_open + 0.5 * BAR
    drop = set()
    for c in cues:
        if c['section'] in ('B01_S0', 'B01_S1') or parent(c) or c.get('wave') == '托底扇':
            continue
        moved[c['id']] = shift(c, dm)
        if c['section'] == 'B01_S2' and cue_t(c) < keep_from:
            drop.add(c['id'])
    # 开场高潮按「每 2 小节一组」还空着的格子（零点小节 +2、+4、+6 … 到第 16 小节），用去掉的原「连续展开」主排按原次序补上
    # 默认不补：试过把金曜菊整排补到第 16 小节，和第 17 小节「密集问答」的金锦菊整排同点同高、压满 3 s（体检 0.0），所以留着这一口气
    filled = {zb_int + (bo - zero_bar_old) for bo in groups}
    empty = [zb_int + k for k in range(2, 17 - zb_int, 2) if zb_int + k not in filled and zb_int + k < 17] if fill else []
    s2 = defaultdict(list)
    for c in cues:
        if c['id'] in drop and c['size'] in 'SML' and c['layer'] == 'main':
            s2[round(bar_old(cue_t(c) - dm) - 0.25)].append(c)          # 上面已平移过 dm，按原时刻归小节
    for slot, (bo, cs) in zip(empty, sorted(s2.items())):
        d_total = q1(Tn(slot) - (OLD_BAR0 + BAR * bo))
        for c in cs:
            drop.discard(c['id'])
            shift(c, d_total - dm)                                     # 已经平移过 dm，补上差
            moved[c['id']] = d_total
        log['opening'].append((bo, slot, d_total, [c['id'] for c in cs], '原连续展开补空格'))
    # 跟着原排走：手游偶 / 奇两半、替身、托底扇
    for c in cues:
        p = parent(c) or (c.get('baseOf') or [None])[0] if c.get('wave') == '托底扇' else parent(c)
        if c['id'] in moved:
            continue
        if p and p in moved:
            moved[c['id']] = shift(c, moved[p])
            if p in drop:
                drop.add(c['id'])
        elif c['section'] not in ('B01_S0',):
            moved[c['id']] = shift(c, dm)
    for c in cues:
        if c.get('wave') == '托底扇' and any(x in drop for x in (c.get('baseOf') or [])):
            drop.add(c['id'])
    log['dropped'] = sorted((by[i]['label'], round(cue_t(by[i]), 2), by[i]['section']) for i in drop)
    cues = [c for c in cues if c['id'] not in drop]
    for c in cues:
        if c['section'] == 'B01_S2':                               # 原「连续展开」留下的并进开场高潮
            c['section'] = 'B01_S1'
        if c.get('baseOf'):
            c['baseOf'] = [x for x in c['baseOf'] if x not in drop]
    cues.sort(key=lambda c: (min(e['launch'] for e in c['events']), c['id']))
    # 段落
    secs = []
    for s in copy.deepcopy(plan['sections']):
        if s['id'] == 'B01_S2':
            continue
        if s['id'] == 'B01_S0':
            fire = audio.get('fireS')
            note = (f'0–{on[0]:.1f} s VO 闲话不放；VO 10→1：10–7 红彗星从两端往里（B0+B7 → B3+B4），6–2 小银菊一对对往里到 P4，1 银扇；VO「点火」{fire:.2f} s'
                    + (' = 零点开场' if abs(zero - fire) < 0.05 else f'，零点 {zero:.2f} s 开场')) if fire is not None else \
                   f'0–{on[0]:.1f} s VO 闲话不放；VO 喊 10 声：前 4 声红彗星单束从两端往里（B0+B7 → B3+B4），后 5 声小银菊一对对往里到 P4，最后一声银扇预告；零点 {zero:.2f} s 从 P4 向外开场'
            s.update(bar0=0, bar1=round(zb, 3), start=0.0, end=round(zero, 3), note=note)
        elif s['id'] == 'B01_S1':
            s.update(bar0=round(zb, 3), bar1=17, start=round(zero, 3), end=round(Tn(17), 3),
                     note=f'{zero:.2f} s 零点整排叠层（金芒菊 + 二排小银菊 + 银扇托底）；之后金裂星 + 红彗星追逐、小银菊 / 点灭星 A/B 间隔；原「连续展开」并进来、只留后半的小平台小花；第 17 小节进「密集问答」')
        else:
            s.update(start=round(Tn(s['bar0']), 3), end=round(Tn(s['bar1']), 3))
        secs.append(s)
    return cues, secs, log


def countdown_v2(cues, audio, zero_s=None):
    """用户 10-13 20:38「从喊10的时候我希望就有效果…扇形或者别的都可以」：
    PC 10–7 红彗星单束（75 m 一根细线）换同资源的五束齐开（R03_Red5，dz 0 的子模板 16.0.25 里就有）；
    手游没有扇形（白名单外），10–7 加只上手游的小银菊替身：照抄 6–3 那四对（同点、同大小、同高度 → 同子模板），开花对上 10–7。"""
    on = audio['countdownOnsetsS']
    s0 = [c for c in cues if c['section'] == 'B01_S0']
    num = lambda c: int(''.join(ch for ch in c['label'] if ch.isdigit()) or 0)
    red = {num(c): c for c in s0 if c['templateId'] == 'R03_Red1'}
    silver = {num(c): c for c in s0 if c['templateId'].startswith('R03_SilverChry')}
    log = []
    for n in (10, 9, 8, 7):
        r = red[n]
        r.update(templateId='R03_Red5', sp='R5', label=r['label'].replace('红彗星', '红彗星·五束'), name=r['name'].replace('红彗星', '红彗星·五束'))
        src = silver[n - 4]
        c = copy.deepcopy(src)
        c.update(id=f'B03_CD{n:02d}', label=f'倒计时小银菊 {n}（手游替身）', name=f'倒计时 · 倒计时小银菊 {n}（手游替身）', mobile='only', standinOf=r['id'])
        d = shift(c, q1(on[10 - n] - b.rise_of(c['sp'])) - min(e['launch'] for e in c['events']))
        cues.append(c)
        log.append(dict(n=n, pc=r['id'] + ' → R03_Red5', mobileStandin=c['id'], copyOf=src['id'], shift=d, burst=round(min(e['burst'] for e in c['events']), 2)))
    log += basefan_to_fire(cues, audio['zeroShowS'] if zero_s is None else zero_s)
    cues.sort(key=lambda c: (min(e['launch'] for e in c['events']), c['id']))
    return log


def basefan_to_fire(cues, zero):
    """零点组的托底扇原来跟尾缀同时起（零点前 4.4 s，正夹在 VO 4 和 3 之间，8 个点一齐出、像已经开场），挪到「点火」那一刻和开花一起出"""
    log = []
    for c in cues:
        if c.get('wave') == '托底扇' and c['section'] == 'B01_S1':
            t0 = min(e['launch'] for e in c['events'])
            if zero - 5.0 < t0 < zero:
                d = shift(c, q1(zero) - t0)
                log.append(dict(baseFanToFire=c['id'], shift=d, launch=q1(zero)))
    return log


# 倒计时构图 v3（用户 10-13 21:29「前面的几个扇形构图不是很好看，你可以重新设置个倒计时构图」）：
# 两遍「从两端往中间收」，每个数一发、PC 和手游同一套（全是白名单里的小号球花、只用 P 点，不要替身，不要扇）：
#   10–6 小银菊略小、最低（K92 dz 0）：P0+P8 → P1+P7 → P2+P6 → P3+P5 → P4
#   5–2 橙辉星（dz 10，寿命 3.2 s，比小银菊收得快，不压「点火」那排）：P0+P8 → … → P3+P5
#   1   爆裂星 P4（寿命 1.5 s，一声脆响就收）→ 「点火」金芒菊从 P4 往外开
# 颜色银 → 橙 → 金，一路往上抬；子模板（花型 + 大小 + 高度）全是 16.0.25 里已有的版本。
CD_V3 = [(10, 'SC', 'R03_SilverChry__K92', 0.92, ['P0', 'P8'], 0.0), (9, 'SC', 'R03_SilverChry__K92', 0.92, ['P1', 'P7'], 0.0),
         (8, 'SC', 'R03_SilverChry__K92', 0.92, ['P2', 'P6'], 0.0), (7, 'SC', 'R03_SilverChry__K92', 0.92, ['P3', 'P5'], 0.0),
         (6, 'SC', 'R03_SilverChry__K92', 0.92, ['P4'], 0.0),
         (5, 'OG', 'R03_OrangeGlitter', 1.0, ['P0', 'P8'], 10.0), (4, 'OG', 'R03_OrangeGlitter', 1.0, ['P1', 'P7'], 10.0),
         (3, 'OG', 'R03_OrangeGlitter', 1.0, ['P2', 'P6'], 10.0), (2, 'OG', 'R03_OrangeGlitter', 1.0, ['P3', 'P5'], 10.0),
         (1, 'CR', 'R03_Crackle', 1.0, ['P4'], 0.0)]


def countdown_v3(cues, audio, zero):
    on = audio['countdownOnsetsS']
    old = [c['id'] for c in cues if c['section'] == 'B01_S0' and c.get('wave') == '倒计时']
    cues[:] = [c for c in cues if c['id'] not in old]
    log = [dict(removed=old)]
    for n, sp, tid, k, pts, dz in CD_V3:
        t, rise, life = on[10 - n], b.rise_of(sp), b.life_of(sp)
        launch = q1(t - rise)
        burst = round(launch + rise, 6)
        ev = [dict(point=p, launch=launch, burst=burst, end=round(burst + life, 6), dz=dz, H=round(t, 4)) for p in pts]
        name = b.SPECIES[sp][1]
        cues.append(dict(id=f'B03_CD{n:02d}', section='B01_S0', sp=sp, templateId=tid, size='S', group='P', points=pts, order='together', gap=0.0,
                         layer='main', tier='all', label=f'倒计时{name} {n}', name=f'倒计时 · 倒计时{name} {n}', wave='倒计时', events=ev, H0=round(t, 4),
                         profiles={'medium': pts[:], 'low': pts[:]}, sizeK=k, mobile=True))
        log.append(dict(n=n, sp=sp, tid=tid, pts=pts, dz=dz, burst=round(burst, 2), onset=t))
    log += basefan_to_fire(cues, zero)
    cues.sort(key=lambda c: (min(e['launch'] for e in c['events']), c['id']))
    return log


def markers(audio, zero):
    old = audio['musicStartS'] - 5.0
    m = [dict(id='B03_VO_CHAT', name='B03｜VO 闲话（不放）', time=0.0, kind='hit', confidence='合并音频实测')]
    for i, t in enumerate(audio['countdownOnsetsS']):
        m.append(dict(id=f'B03_VO_{10 - i}', name=f'B03｜VO 喊 {10 - i}', time=round(t, 1), kind='hit', confidence='合并音频实测（VO 起音）'))
    if audio.get('fireS') is not None:
        m.append(dict(id='B03_VO_FIRE', name='B03｜VO 喊「点火」', time=round(audio['fireS'], 1), kind='hit', confidence='合并音频实测（VO 起音）'))
        rule = '「点火」起音' if abs(zero - audio['fireS']) < 0.05 else '「点火」后的原曲重拍' if abs(zero - audio.get('downbeatAfterFireS', -1)) < 0.05 else '用户指定'
    else:
        rule = 'VO 最后一声之后的第一个小节重拍' if abs(zero - audio['zeroShowS']) < 1e-6 else '用户指定'
    m.append(dict(id='B03_ZERO', name='B03｜零点 · 开场', time=round(zero, 1), kind='peak', confidence=rule))
    for t, name, kind in ((112.2, 'B03｜高潮 II 回归（用户 1:47）', 'peak'), (175.4, 'B03｜⑧ 三主角垂柳墙', 'peak'), (196.5, 'B03｜终和弦 白墙', 'peak'), (110.6, 'B03｜静默一小节', 'hit')):
        m.append(dict(id=f'B03_M{round((t + old) * 10)}', name=name, time=round(t + old, 1), kind=kind, confidence='原曲时刻（+5 s）换算到合并音频'))
    return sorted(m, key=lambda x: x['time'])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default=str(ROOT / '协作/编排B01/逻辑方案_B02r2_up70_s10.json'))
    ap.add_argument('--audio', default=str(ROOT / 'analysis/music/合并音频_VO倒计时.json'))
    ap.add_argument('--zero', type=float, default=None)
    ap.add_argument('--name', default='B03')
    ap.add_argument('--out-dir', default=str(ROOT / '协作/编排B01'))
    ap.add_argument('--fill-opening', action='store_true', help='开场每 2 小节的空格用去掉的原「连续展开」主排补（默认不补）')
    ap.add_argument('--countdown-v2', action='store_true', help='10–7：PC 红彗星单束 → 五束；手游加小银菊替身（用户 10-13 20:38）')
    ap.add_argument('--countdown-v3', action='store_true', help='倒计时重新构图：两遍从两端往中间收，银 → 橙 → 爆裂星，PC / 手游同一套（用户 10-13 21:29）')
    a = ap.parse_args()
    plan = json.loads(Path(a.base).read_text(encoding='utf-8'))
    audio = json.loads(Path(a.audio).read_text(encoding='utf-8'))
    zero = a.zero if a.zero is not None else audio['zeroShowS']
    cues, secs, log = retime(plan, audio, zero, a.fill_opening)
    if a.countdown_v3:
        log['countdownV3'] = countdown_v3(cues, audio, zero)
        on, ch = audio['countdownOnsetsS'], audio.get('voChat') or [{}]
        secs[0]['note'] = (f"VO 闲话 {ch[0].get('start', 0):.1f}–{ch[-1].get('end', 0):.1f} s；VO 10→1 在 {on[0]:.2f}–{on[-1]:.2f} s，每个数一发，PC / 手游同一套："
                           f"10–6 小银菊从两端往中间收到 P4，5–2 橙辉星再收一遍，1 爆裂星 P4；VO「点火」{audio.get('fireS', zero):.2f} s = 零点，金芒菊从 P4 往外开 + 银扇托底")
    elif a.countdown_v2:
        log['countdownV2'] = countdown_v2(cues, audio, zero)
        on, ch = audio['countdownOnsetsS'], audio.get('voChat') or [{}]
        secs[0]['note'] = (f"VO 闲话 {ch[0].get('start', 0):.1f}–{ch[-1].get('end', 0):.1f} s；VO 10→1 在 {on[0]:.2f}–{on[-1]:.2f} s，每一声都有一发：PC 10–7 红彗星五束从两端往里（B0+B7 → B3+B4，起飞 = 喊数），"
                           f"手游 10–7 小银菊替身（开花 = 喊数，尾缀 {on[0] - b.rise_of('SC'):.1f} s 起升空）；6–2 小银菊一对对往里到 P4；1 银扇；VO「点火」{audio.get('fireS', zero):.2f} s = 零点，金芒菊开花 + 银扇托底一齐出")
    dur = max(math.ceil((audio['musicStartS'] + audio['music']['durationS']) * 10) / 10,
              math.ceil(max(e['end'] for c in cues for e in c['events']) * 10) / 10)
    out = dict(plan, revision=f"{a.name}_vo_countdown_zero{zero:.2f}_from_{plan['revision']}", musicOffsetS=audio['musicStartS'],
               bar0S=round(audio['musicStartS'] + 0.18, 5), duration=dur, sections=secs, cues=cues, musicMarkers=markers(audio, zero),
               audio=dict(mix=audio['mix'], music=audio['music'], musicStartS=audio['musicStartS'], zeroShowS=zero, countdownOnsetsS=audio['countdownOnsetsS'],
                          fireS=audio.get('fireS'), voFire=audio.get('voFire'), downbeatAfterFireS=audio.get('downbeatAfterFireS'),
                          note='演出秒 = 合并音频的秒；工作台用仓库原曲播放时音乐偏移 = musicStartS（听不到 VO）'),
               retime=log, base=str(Path(a.base).resolve().relative_to(ROOT)) if Path(a.base).resolve().is_relative_to(ROOT) else Path(a.base).name)
    od = Path(a.out_dir)
    od.mkdir(parents=True, exist_ok=True)
    (od / f'逻辑方案_{a.name}.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    # 体检：用编排B01 的 checks（PC 和手机三档、GPU、对拍、嵌套），新起点
    b.BAR0, b.OFFSET = out['bar0S'], out['musicOffsetS']
    b.QUIET = [(b.T(k), b.T(k + 1) - 0.1) for k in (41, 65, 96)]
    S = b.Show(2)
    S.cues, S.sections = cues, secs
    S.b02 = dict(split=None, beamFlowerCues=sum(1 for c in cues if c['size'] == 'X'))
    S.baseGroups = sum(1 for c in cues if c.get('wave') == '托底扇')
    ck = b.checks(S)
    ck['retime'] = log
    (od / f'体检_{a.name}.json').write_text(json.dumps(ck, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps(dict(revision=out['revision'], cues=len(cues), dropped=len(log['dropped']), musicShiftS=log['musicShiftS'], zero=zero,
                          tiers={k: v['events'] for k, v in ck['tiers'].items()}, gpu=ck['gpu']['peak'], beatLock=ck['beatLock'],
                          tierNesting=ck['tierNesting']['ok'], mobile={k: v['events'] for k, v in ck['b02']['mobileTiers'].items()}), ensure_ascii=False))


if __name__ == '__main__':
    main()
