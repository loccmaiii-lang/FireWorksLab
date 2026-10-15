#!/usr/bin/env python3
"""编排数量对比（用户 10-16 01:13「后续每个版本都给我出一个数量对比，B05为标定」）。

把一张表按 平台 × 档位 展开，数每类条目：坝顶球花（朵）、扇（束）、小平台花（朵）、尾缀（根），和 B05 并排，输出 Markdown 表。
另给：GPU 同秒峰值（按 资源发射器数.json；扇按用户 10-16 01:13 说的「扇单束基本没 GPU」记 0）、扇粒子同时活着峰值（银扇一束约 55、彗星一束 45，用户 10-16 01:13）。

用法：python3 -I analysis/scripts/编排数量对比.py <一张表.json> [--base <B05 一张表>]
"""
import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
D = ROOT / 'FXtools/节目/NewYearFireWorks_v01'
B05 = D / '导演表-B05-ResourceFX新命名-手游6种-一张表.json'
Q = {'EQuality_VeryLow': 0, 'EQuality_Low': 1, 'EQuality_Medium': 2, 'EQuality_High': 3, 'EQuality_Epic': 4}
TIERS = (('高', 3), ('中', 2), ('低', 0))
PLATS = (('PC', 12), ('手游', 2))
PPB = {'FanSilver': 55, 'FanComet': 45}          # 每束粒子数（用户 10-16 01:13）
LIFE = {'FanSilver': 2.6, 'FanComet': 3.7}       # 束寿命 s（dfshow templateLibrary 量级）


def ok(f, plat, tier):
    if not f:
        return True
    pf, mq = f.get('PlatformFlags'), f.get('MinQualityLevel')
    if pf is not None and not (pf & plat):
        return False
    return not (mq is not None and Q.get(mq, 0) > tier)


def kind(r):
    if 'Fan' in r or 'Comet_Layers' in r or 'Silver_Layers' in r:
        return '扇（束）'
    if 'Trail' in r:
        return '尾缀（根）'
    if 'Little' in r:
        return '小平台花（朵）'
    return '坝顶球花（朵）'


def expand(path, plat, tier):
    d = json.loads(Path(path).read_text(encoding='utf-8'))
    subs = {s['TemplateName']: s for s in d['EffectSubTemplates']}
    tpls = {t['TemplateName']: t for t in d['EffectTemplates']}
    for g in d['EffectScheduleGroups']:
        for s in g['Slots']:
            if not ok(s.get('Filter'), plat, tier):
                continue
            t = tpls[s['TemplateName']]
            if not ok(t.get('Filter'), plat, tier):
                continue
            for e in t['Entries']:
                if not ok(e.get('Filter'), plat, tier) or not e.get('SubTemplateName'):
                    continue
                for x in subs[e['SubTemplateName']]['Entries']:
                    if ok(x.get('Filter'), plat, tier) and x.get('FXResourceId'):
                        yield x['FXResourceId'], s['StartTime'] + e['LocalTimeOffset'] + x['LocalTimeOffset']


def stats(path, plat, tier, gpu):
    c, g, alive = Counter(), defaultdict(int), defaultdict(int)
    for r, t in expand(path, plat, tier):
        c[kind(r)] += 1
        if 'Fan' in r:
            k = 'FanSilver' if 'Silver' in r else 'FanComet'
            for i in range(int(t * 10), int((t + LIFE[k]) * 10)):
                alive[i] += PPB[k]
        else:
            g[int(t)] += gpu.get(r, 0)
    c['合计'] = sum(v for k, v in c.items() if k != '合计')
    c['GPU 同秒峰值（扇按 0）'] = max(g.values(), default=0)
    c['扇粒子同时活着峰值'] = max(alive.values(), default=0)
    return c


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('table')
    ap.add_argument('--base', default=str(B05))
    a = ap.parse_args()
    cen = json.loads((D / '资源发射器数.json').read_text(encoding='utf-8'))
    gpu = {r['id']: (r.get('FxSP') or {}).get('gpu', 0) for r in cen['pc']}
    rows = ('坝顶球花（朵）', '扇（束）', '小平台花（朵）', '尾缀（根）', '合计', 'GPU 同秒峰值（扇按 0）', '扇粒子同时活着峰值')
    print(f"对比：`{Path(a.table).name}` vs B05 `{Path(a.base).name}`（高 / 中 / 低）\n")
    for pn, pf in PLATS:
        S = {tn: stats(a.table, pf, tq, gpu) for tn, tq in TIERS}
        B = {tn: stats(a.base, pf, tq, gpu) for tn, tq in TIERS}
        print(f"| {pn} | B05 | 这版 | 差 |\n|---|---|---|---|")
        for r in rows:
            if pn == '手游' and r in ('扇（束）', '扇粒子同时活着峰值') and not any(S[t][r] or B[t][r] for t in S):
                continue
            bs = ' / '.join(str(B[t][r]) for t in S)
            ss = ' / '.join(str(S[t][r]) for t in S)
            ds = ' / '.join(f"{S[t][r] - B[t][r]:+d}" for t in S)
            print(f"| {r} | {bs} | {ss} | {ds} |")
        print()


if __name__ == '__main__':
    main()
