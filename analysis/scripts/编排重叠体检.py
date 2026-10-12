"""编排重叠 / 断档体检（跨年秀 22，用户 10-12 23:13：「重叠的太厉害了……还有其它类似的问题可以找到的吗」「手游中低配中间不要断开那么多」）。

按正面投影（和网页动画同一套几何：点位 x、坝顶 150 m + 尾缀 v2 开花高度 + dz、花型直径 × 大小版本）找三类挤在一起的花：
  同排太挤  —— 同一排（含手机拆开的偶 / 奇两半）相邻点的大花，圆心距 < 0.5 × 平均直径（图 3：大号金芒菊 P3 / P4 / P5）
  两排同高  —— 前后 1 s 内开的两排（P 排 + B 排、城垛、叠层），圆心距 < 0.55 × 平均直径（图 1：小银菊 P 排 + 小青柠 B 排）
  后压前    —— 后开的花开在前一排还亮着的花上（同点同高），圆心距 < 0.55 × 平均直径（图 2：多重菊开在还亮的金锦菊上）
「还亮着」= 开花后 0.3 s 到寿命的 75%（最后四分之一是散落的余烬，不算）。0.55 是图 1 / 图 3 那种「混成一团」的程度；
整排 9 点的中号花（圆心距 ≈ 0.65 × 直径，设计上的相切成排）不算。主角（金垂柳）另列。

手游断档：按档位（高 / 中 / 低）算天上一朵球花都没有的时段（开花到熄灭之间算有花），列出 ≥ 4 s 的。

用法：python3 -I analysis/scripts/编排重叠体检.py 协作/编排B01/逻辑方案_B02.json [更多逻辑方案…] [--json 输出.json]
"""
import argparse
import importlib.util
import json
import math
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location('b01', HERE / '编排B01.py')
b = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(b)
b.HEIGHTS = 'v2'

HEAVY = 0.55          # 圆心距 / 平均直径 < 0.55：混成一团
HEAVY_ROW = 0.5       # 同一排相邻点：中号整排 9 点本来就相切（≈ 0.53–0.65），< 0.5 才算挤
LIT0, LIT1 = 0.3, 0.75
SIM = 1.0             # 两排开花相差 ≤ 1 s 算「同时」
GAP_MIN = 4.0
HERO = {'GK', 'GKH'}


def flowers(cues, tier='high', platform='pc'):
    out = []
    for c in cues:
        if c['size'] not in 'SML':
            continue
        if platform == 'mobile' and c.get('mobile', True) is False:   # B01 没拆手机，全上
            continue
        if platform == 'pc' and c.get('mobile') == 'only':            # 修订1 手游替身只上手游
            continue
        pts = None if tier == 'high' else set(c['profiles'][tier])
        tpl = b.TPL[c['templateId'].split('__K')[0]]
        k = c.get('sizeK') or (int(c['templateId'].split('__K')[1]) / 100 if '__K' in c['templateId'] else 1.0)
        for e in c['events']:
            if pts is not None and e['point'] not in pts:
                continue
            life = e['end'] - e['burst']
            out.append(dict(cue=c['id'], row=c.get('splitOf') or c['id'], sp=c['sp'], size=c['size'], wave=c.get('wave') or '',
                            section=c['section'], point=e['point'], x=b.PT[e['point']]['x'],
                            z=b.PT[e['point']]['z'] + b.bloom_h(c) + e['dz'], d=(tpl['diameter'] or b.DIA[c['size']]) * k,
                            burst=e['burst'], end=e['end'], lit0=e['burst'] + LIT0, lit1=e['burst'] + LIT1 * life))
    return out


def sep(f, g):
    return math.hypot(f['x'] - g['x'], f['z'] - g['z']) / ((f['d'] + g['d']) / 2)


def incidents(fl):
    """两两比对还亮着的花，按（类型, 两排）归并成一件事。"""
    fl = sorted(fl, key=lambda f: f['lit0'])
    ev = defaultdict(lambda: dict(pairs=0, minSep=9.0, t0=1e9, t1=0.0, points=set(), heroInvolved=False))
    for i, f in enumerate(fl):
        for g in fl[i + 1:]:
            if g['lit0'] >= f['lit1']:
                break
            if min(f['lit1'], g['lit1']) - max(f['lit0'], g['lit0']) < 0.3:
                continue
            s = sep(f, g)
            if s >= (HEAVY_ROW if f['row'] == g['row'] else HEAVY):
                continue
            if f['row'] == g['row']:
                kind = '同排太挤'
            elif abs(f['burst'] - g['burst']) <= SIM:
                kind = '两排同高'
            else:
                kind = '后压前'
            a, c = sorted((f['row'], g['row']))
            key = (kind, a, c)
            x = ev[key]
            x['pairs'] += 1
            x['minSep'] = min(x['minSep'], s)
            x['t0'] = min(x['t0'], max(f['lit0'], g['lit0']))
            x['t1'] = max(x['t1'], min(f['lit1'], g['lit1']))
            x['points'].update((f['point'], g['point']))
            x['heroInvolved'] |= f['sp'] in HERO or g['sp'] in HERO
            x.setdefault('what', (f['sp'], f['size'], f['wave'], g['sp'], g['size'], g['wave'], f['section']))
    out = []
    for (kind, a, c), x in ev.items():
        fsp, fsz, fw, gsp, gsz, gw, sec = x['what']
        out.append(dict(kind=kind, rows=[a, c], t=round(x['t0'], 2), until=round(x['t1'], 2), pairs=x['pairs'],
                        minSep=round(x['minSep'], 2), points=sorted(x['points'], key=lambda p: (p[0], int(p[1:]))),
                        hero=x['heroInvolved'], section=sec,
                        desc=f"{b.SPECIES[fsp][1]}（{fsz}·{fw}）× {b.SPECIES[gsp][1]}（{gsz}·{gw}）"))
    out.sort(key=lambda x: x['t'])
    return out


def gaps(fl, t_from=10.0, t_to=None):
    if not fl:
        return []
    iv = sorted((f['burst'], f['end']) for f in fl)
    t_to = t_to or max(e for _, e in iv)
    out, cur = [], t_from
    for s, e in iv:
        if s > cur and s - cur >= GAP_MIN and cur < t_to:
            out.append((round(cur, 1), round(min(s, t_to), 1)))
        cur = max(cur, e)
    return out


def section_of(sections, t):
    best = None
    for s in sections:
        if s['start'] <= t:
            best = s
    return best['name'] if best else ''


def report(path):
    d = json.loads(Path(path).read_text(encoding='utf-8'))
    cues, sections = d['cues'], d['sections']
    pc = incidents(flowers(cues))
    by = defaultdict(int)
    for x in pc:
        by[x['kind']] += 1
    mob = {}
    for tier in ('high', 'medium', 'low'):
        g = gaps(flowers(cues, tier, 'mobile'), t_to=211.0)
        mob[tier] = dict(gaps=[dict(start=s, end=e, len=round(e - s, 1), section=section_of(sections, s)) for s, e in g],
                         totalGapS=round(sum(e - s for s, e in g), 1),
                         incidents=len(incidents(flowers(cues, tier, 'mobile'))))
    return dict(file=str(path), pcIncidents=len(pc), byKind=dict(by), heroIncidents=sum(x['hero'] for x in pc),
                pc=pc, mobile=mob)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('plans', nargs='+')
    ap.add_argument('--json')
    ap.add_argument('--list', action='store_true')
    a = ap.parse_args()
    reps = [report(p) for p in a.plans]
    for r in reps:
        print(Path(r['file']).name, 'PC 挤在一起', r['pcIncidents'], r['byKind'], '主角相关', r['heroIncidents'])
        for tier, m in r['mobile'].items():
            print(f"  手游{tier}: 断档 ≥{GAP_MIN:g}s {len(m['gaps'])} 段 共 {m['totalGapS']} s；挤在一起 {m['incidents']}", [(x['start'], x['end']) for x in m['gaps']])
        if a.list:
            for x in r['pc']:
                print(f"   {x['t']:7.2f}–{x['until']:6.2f} {x['kind']} {x['section']} {x['desc']} 点 {','.join(x['points'])} 最近 {x['minSep']}{' 主角' if x['hero'] else ''}")
    if a.json:
        Path(a.json).write_text(json.dumps(reps, ensure_ascii=False, indent=1), encoding='utf-8')
