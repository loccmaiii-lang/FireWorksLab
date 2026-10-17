#!/usr/bin/env python3
"""编排 B11（跨年秀（22），2026-10-18）：B10 上只改用户 10-18 01:18 授权的三处。

用户 10-18 01:18：
- 「1.可以错开；2.金垂柳大小改回来；3.图片是最新的序号；4.你直接放大，后面如果要提到8分的方案（颜色对比，同大小花型对调）怎么办？后面还能切换吗？……7.从现在开始没有授权的改动就不要改了」

B11 = B10 的逻辑方案，加三处：
① 垂柳大小改回 ×0.998（B09 的值，`__K82`：R03_GoldKamuro_H280 自带 1.217391 × 0.82）。寿命 14.5 s、去掉埋在垂柳里的下托（B10）保持，用户没让动。
② 白墙第二轮（B02_C178 / C178m5，200.6 s）错开第一轮（B02_C174 / C174m5，197.3 s）：原来两轮都是 P2 / P4 / P6、只隔 3.3 s，第一轮 201.7 s 才结束，第二轮在同一位置同一高度又开
   （同点覆盖 100 %）。改成 P0 / P8（两端）：宪章第 8 节「手机 M / L 一排只放偶数点」排除了奇数点；P0 / P8 是偶数点、PC / 手游一样、低配也留（嵌套不破）；
   按真实点位 + 原机位量，对第一轮的覆盖 3 % / 22 %（奇数点 P1 / P3 / P5 是 37–58 %）。3 朵 → 2 朵。
③ 大号金蕊青柠星（CLL）/ 多重菊（MLL）改调 ResourceFX 2828 大型_C_金蕊柠 / 2829 大型_D_多重菊（原来用中型 2823 / 2825 放大 ×1.41 / ×1.53）。
   EffectScale 不变，两个 ID 现在指向同一个粒子，所以画面不变；封板后「只能改特效资源」时，可以单独换 / 调大型，不牵连中型。只有 PC 用（手游表没有这两个 ID，手游不放这两种花）。
   金芒菊·大没有「大型」ID（ResourceFX 只有 2824 中型_B_金芒菊），照旧用 2824 放大。

用法：python3 -I analysis/scripts/编排B11.py
"""
import argparse
import copy
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'analysis/scripts' / file)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


B10 = _load('b10', '编排B10.py')
B09, B08, B07, B06, B05, b, ovl, GW = B10.B09, B10.B08, B10.B07, B10.B06, B10.B05, B10.b, B10.ovl, B10.GW

B10.HERO_SIZEK = 0.82                  # R03_GoldKamuro_H280 的 EffectScale 1.217391 × 0.82 = 0.998（B09 的值）
STAGGER = {'B02_C178': ('P2', 'P6'), 'B02_C178m5': ('P2', 'P6')}   # 第二轮 P2 / P4 / P6 → P0 / P8（P2→P0、P6→P8，时刻沿用两边的）
LARGE_RESOURCE = 'CLL=P_EFX_FireWorks_GoldCoreLime_L,MLL=P_EFX_FireWorks_MultiLayerChry_L'


def stagger(cues):
    by = {c['id']: c for c in cues}
    log = []
    for cid, (left, right) in STAGGER.items():
        c = by[cid]
        ev = {e['point']: e for e in c['events']}
        was = [e['point'] for e in c['events']]
        c['events'] = [dict(ev[left], point='P0'), dict(ev[right], point='P8')]
        c['points'] = ['P0', 'P8']
        c['profiles'] = {t: ['P0', 'P8'] for t in c['profiles']}
        c['label'] = '白墙第二轮（两端 P0 P8·错开第一轮）' if c['sp'] == 'SS' else '金芒菊·大（两端 P0 P8）'
        c['name'] = '白色收束 · 白墙第二轮（两端）'
        log.append(dict(cue=cid, action='第二轮错开第一轮：P2 / P4 / P6 → P0 / P8', was=was, now=c['points'], at=[e['burst'] for e in c['events']], sp=c['sp'], mobile=c.get('mobile')))
    return log


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default=str(ROOT / '协作/编排B01/逻辑方案_B09.json'))
    ap.add_argument('--prev', default=str(ROOT / '协作/编排B01/逻辑方案_B10.json'))
    ap.add_argument('--name', default='B11')
    ap.add_argument('--out-dir', default=str(ROOT / '协作/编排B01'))
    a = ap.parse_args()
    plan = json.loads(Path(a.base).read_text(encoding='utf-8'))
    b.BAR0, b.OFFSET = plan['bar0S'], plan['musicOffsetS']
    b.QUIET = [(b.T(k), b.T(k + 1) - 0.1) for k in (41, 65, 96)]
    visible = B10.patch_models()
    cues = copy.deepcopy(plan['cues'])
    log = dict(base=str(Path(a.base).resolve().relative_to(ROOT)), prev=str(Path(a.prev).resolve().relative_to(ROOT)), heroLife=B10.HERO_LIFE, heroSizeK=B10.HERO_SIZEK,
               heroEffectScale=round(1.217391 * B10.HERO_SIZEK, 4), willowVisibleDiaM=visible, heroTrail=B09.HERO_ID, heroM=B09.hero_m(), largeResource=LARGE_RESOURCE)
    log['edits'] = B10.edit(cues) + stagger(cues)
    cues.sort(key=lambda c: (min(e['launch'] for e in c['events']), c['id']))
    log['mobileRule'] = B05.mobile_rule(cues)
    out = dict(plan, revision=f"{a.name}_kamuro_k82_life14.5_noBuriedUnder_wall2_P0P8_largeIds_from_{plan['revision']}", generator='analysis/scripts/编排B11.py', cues=cues, b11=log, base=log['base'])
    od = Path(a.out_dir)
    lp = od / f'逻辑方案_{a.name}.json'
    lp.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    gpu, read_at = B05.census_gpu()
    model = B05.apply_census(gpu)
    ck = B05.run_checks(out, cues)
    ck['gpuModel'] = dict(source=str(B05.CENSUS.relative_to(ROOT)), readAt=read_at, **model)
    ck['b11'] = log
    rep = ovl.report(lp)
    ck['overlap'] = {k: v for k, v in rep.items() if k != 'pc'}
    ck['overlap']['pcList'] = rep['pc']
    prev = json.loads(Path(a.prev).read_text(encoding='utf-8'))
    prev_lp = od / f'逻辑方案_{a.name}_B10同尺.json'
    prev_lp.write_text(json.dumps(prev, ensure_ascii=False, indent=1), encoding='utf-8')
    prep = ovl.report(prev_lp)
    prev_lp.unlink()
    ck['overlapB10SameRuler'] = {k: v for k, v in prep.items() if k != 'pc'}
    ck['fanAudit'] = dict(B11=B06.audit(cues, out, 'B11'))
    ck['tierEnds'] = B07.tier_ends(cues)
    ck['shares'] = {f'{p}-{t}': B06.shares(cues, p, t) for p in ('pc', 'mobile') for t in ('high', 'medium', 'low')}
    vs = (('B11', cues), ('B10', prev['cues']))
    ck['heavy'] = dict(rule='同 B08：PC 低配亮着的浓密金菊面积 A ≤ 4.0；金垂柳、银彩菊不在 A 里（推断，没实测）',
                       **{f'{v}-{t}': dict(dense=B08.peaks(B08.load_series(cs, 'dense', 'pc', t)), burst=B08.peaks(B08.load_series(cs, 'burst', 'pc', t))) for v, cs in vs for t in ('high', 'medium', 'low')},
                       atB05Peaks={v: B08.at_peaks(cs) for v, cs in vs})
    hero = [c for c in cues if c['sp'] == 'GKH']
    ck['heroWindow'] = {c['id']: dict(points=[e['point'] for e in c['events']], burst=[e['burst'] for e in c['events']], end=[e['end'] for e in c['events']]) for c in hero}
    ck['willowOverlap'] = dict(note='analysis/scripts/垂柳重叠.py：真实点位 + 原机位，开花后 0–5 s；花盘 340 m × (EffectScale ÷ 0.998)（推断）',
                               B11={k: v for k, v in GW.audit(out).items() if k != 'rows'}, B10={k: v for k, v in GW.audit(prev).items() if k != 'rows'})
    ck['wallRounds'] = wall_rounds(out)
    ck['score'] = B07.scorecard(out, cues, prev)
    (od / f'体检_{a.name}.json').write_text(json.dumps(ck, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps(dict(revision=out['revision'], cues=len(cues), edits=log['edits'],
                          tiers={k: v['events'] for k, v in ck['tiers'].items()}, mobile={k: v['events'] for k, v in ck['b02']['mobileTiers'].items()},
                          gpu=ck['gpu']['peak'], tierNesting=ck['tierNesting']['ok'], mobileRuleViolations=len(log['mobileRule']['violations']),
                          overlap=dict(pc=ck['overlap']['pcIncidents'], mobile={k: v['incidents'] for k, v in ck['overlap']['mobile'].items()}),
                          overlapB10SameRuler=dict(pc=ck['overlapB10SameRuler']['pcIncidents'], mobile={k: v['incidents'] for k, v in ck['overlapB10SameRuler']['mobile'].items()}),
                          fanClash=ck['fanAudit']['B11']['clashPairs'], tierEnds=ck['tierEnds']['violations'], heroWindow=ck['heroWindow'], willowOverlap=ck['willowOverlap'],
                          wallRounds=ck['wallRounds'], atB05Peaks=ck['heavy']['atB05Peaks']), ensure_ascii=False, indent=1))


def wall_rounds(plan):
    """白墙两轮（197.3 / 200.6 s）按真实点位 + 原机位：第二轮每朵被第一轮同刻盖住的最大比例（230 m × 0.92 @ +330 m 的圆盘，同垂柳重叠.py 口径）"""
    dia = 230 * 0.92
    r = {}
    for rid, first, second in (('PC', 'B02_C174', 'B02_C178'), ('手游替身', 'B02_C174m5', 'B02_C178m5')):
        c1 = next(c for c in plan['cues'] if c['id'] == first)
        c2 = next(c for c in plan['cues'] if c['id'] == second)
        rows = []
        for e2 in c2['events']:
            d2 = GW.disc(e2['point'], 330.0, dia)
            cov = [GW.covered(GW.disc(e1['point'], 330.0, dia), d2) for e1 in c1['events'] if e1['burst'] + 4.5 > e2['burst']]
            rows.append(dict(point=e2['point'], burst=e2['burst'], maxCoveredByRound1=round(max(cov or [0]), 2)))
        r[rid] = dict(round1=[(e['point'], e['burst']) for e in c1['events']], round1End=max(e['end'] for e in c1['events']), round2=rows)
    return r


if __name__ == '__main__':
    main()
