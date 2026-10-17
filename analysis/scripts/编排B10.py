#!/usr/bin/env python3
"""编排 B10（跨年秀（22），2026-10-18）：B09 → 垂柳按 UE 实测重排：去掉埋在垂柳里的「下托」、垂柳 ×0.85、寿命按 14.5 s。

用户 10-18 00:23：
- 「升空尾缀hero的PC与手游我已经上传了，400秒总生命到了11.1s(不代表飞行时长，具体可以看看烘培器的导出配方有没有延长)，同时金垂柳本机测量了大小与时长」
- 「金垂柳大小跟你理解的可能会有些偏差，以及垂柳出现的时候，玩家在下方看，基本和其它大型的重叠在一起了，看看有没有更好的处理意见」
- 「下周二就要全量测试，并且就无法修改增加内容了，只能改特效资源」

本机回传（T19，`analysis/results/UE_READBACK_20261017/`）和编排实放 B09（`analysis/results/B09_DIRECTOR_20261017/`）给出的事实：
- Hero 尾缀：2830 现在指 RiseTrail_Hero_HD / _M；星头到顶 400.4 m @ 7.1 s，7.37 s 在 399.5 m（开花点 397.92 m 不用改）；整段 11.1 s = 升空 + 拖尾（和 L 一样 0.6 + 10.5），配方没有延长升空。
- 新垂柳：寿命 14–14.5 s（末粒子上界 14.5 s）；网格局部盒宽 400–440 m、向下 194–213 m（是包围盒，不是花盘）；同机位实放截图里花盘约 340 m（×0.998 时，开花后约 4 s）。
- 真实点位（UE 里量的）：P0–P4 361 m、P4–P8 318 m，不是设计表的 375 m。
- 编排实放建议下一次发布采用主角缩放 0.85（同机位 A/B，保留 400 m、点位、时序）。

B10 在 B09 的最终逻辑方案上只改垂柳这两处（108 s P4 一朵、171 s 三朵）和直接埋在垂柳里的花，别的片段一个不动：
① 缩放 ×0.998 → ×0.852（`__K70`：R03_GoldKamuro_H280 自带 1.217391 × 0.70）。编排实放 0.85 的同机位 A/B 看过；一个数，封板后也能在 ResourceFX / 粒子里再改。
② 去掉「下托」：垂柳升到 400 m 以后，原来 330 m 那个位置已经在垂柳花盘里（垂柳花盘 ~290–340 m 宽、中心 398 m，下托大花中心只低 68 m），
   算下来下托被盖住约 99 %，等于白放，还加重叠。108 s：那排银彩菊（PC）/ 金芒菊·大（手游）去掉 P4；171 s：「收边」银彩菊 / 金芒菊·大（P0 P4 P8，正好在三朵垂柳下面）整条去掉。
③ 去掉手游 174.7 s 那排金芒菊·大（P0 P8）：手游中低配只有 P0 / P4 / P8，三个点上都挂着垂柳，这两朵整朵在垂柳里（盖住约 88 %）；PC 那排银彩菊在 P2 / P6（两朵垂柳中间）照旧。
④ 寿命 14 s → 14.5 s（T19 读回的末粒子上界）；系统周期 16.1 s 另记。

用法：python3 -I analysis/scripts/编排B10.py
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


B09 = _load('b09', '编排B09.py')
B08, B07, B06, B05, b, ovl = B09.B08, B09.B07, B09.B06, B09.B05, B09.b, B09.ovl
GW = _load('gw', '垂柳重叠.py')

HERO_LIFE = 14.5                   # T19：末粒子上界 14.5 s（系统周期 16.1 s）
HERO_SIZEK = 0.70                  # R03_GoldKamuro_H280 的 EffectScale 1.217391 × 0.70 = 0.852
HERO_VISIBLE_DIA = 340.0           # ×0.998 时花盘 ≈ 340 m（编排实放 175 s 同机位截图换算，推断）
UNDER = {'B02_C087': 'P4', 'B02_C087m5': 'P4'}               # 108 s 那排银彩菊 / 金芒菊·大：去掉 P4
DROP = ('B02_C147', 'B02_C147m5', 'B02_C150m5')              # 171 s 收边（P0 P4 P8）整条；手游 174.7 s 金芒菊·大（P0 P8）


def patch_models():
    """体检 / 动画用的几何：垂柳寿命 14.5 s、花盘直径按实测（TPL 直径 × sizeK = 340 × 0.852 ÷ 0.998 ≈ 290 m）"""
    B09.HERO_LIFE = HERO_LIFE
    B09.patch_models()
    dia = HERO_VISIBLE_DIA * (1.217391 * HERO_SIZEK) / 0.998261 / HERO_SIZEK
    for m in (b, ovl.b):
        m.TPL['R03_GoldKamuro_H280']['diameter'] = round(dia, 2)
        m.TPL['R03_GoldKamuro_H280']['life'] = HERO_LIFE
    return round(dia * HERO_SIZEK, 1)


def edit(cues):
    by = {c['id']: c for c in cues}
    log = []
    tid = f'R03_GoldKamuro_H280__K{round(HERO_SIZEK * 100)}'
    for cid in ('B02_C086', 'B02_C146'):
        c = by[cid]
        was = (c['templateId'], c['sizeK'])
        c['templateId'], c['sizeK'] = tid, HERO_SIZEK
        for e in c['events']:
            e['end'] = round(e['burst'] + HERO_LIFE, 6)
        log.append(dict(cue=cid, action='垂柳 ×0.852、寿命 14.5 s', was=was, now=(tid, HERO_SIZEK), points=[e['point'] for e in c['events']]))
    for cid, pt in UNDER.items():
        c = by[cid]
        assert any(e['point'] == pt for e in c['events']), cid
        c['events'] = [e for e in c['events'] if e['point'] != pt]
        c['points'] = [e['point'] for e in c['events']]
        c['profiles'] = {t: [p for p in v if p != pt] for t, v in c['profiles'].items()}
        log.append(dict(cue=cid, action=f'去掉埋在垂柳里的下托 {pt}', left=c['points']))
    for cid in DROP:
        c = by[cid]
        log.append(dict(cue=cid, action='整条去掉（整朵在垂柳花盘里）', was=[e['point'] for e in c['events']], at=[e['burst'] for e in c['events']], sp=c['sp'], mobile=c.get('mobile')))
    cues[:] = [c for c in cues if c['id'] not in DROP]
    return log


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default=str(ROOT / '协作/编排B01/逻辑方案_B09.json'))
    ap.add_argument('--name', default='B10')
    ap.add_argument('--out-dir', default=str(ROOT / '协作/编排B01'))
    a = ap.parse_args()
    plan = json.loads(Path(a.base).read_text(encoding='utf-8'))
    b.BAR0, b.OFFSET = plan['bar0S'], plan['musicOffsetS']
    b.QUIET = [(b.T(k), b.T(k + 1) - 0.1) for k in (41, 65, 96)]
    visible = patch_models()
    cues = copy.deepcopy(plan['cues'])
    log = dict(base=str(Path(a.base).resolve().relative_to(ROOT)), heroLife=HERO_LIFE, heroSizeK=HERO_SIZEK, heroEffectScale=round(1.217391 * HERO_SIZEK, 4), willowVisibleDiaM=visible,
               heroTrail=B09.HERO_ID, heroM=B09.hero_m())
    log['edits'] = edit(cues)
    cues.sort(key=lambda c: (min(e['launch'] for e in c['events']), c['id']))
    log['mobileRule'] = B05.mobile_rule(cues)
    out = dict(plan, revision=f"{a.name}_kamuro_k70_life14.5_noBuriedUnder_from_{plan['revision']}", generator='analysis/scripts/编排B10.py', cues=cues, b10=log, base=log['base'])
    od = Path(a.out_dir)
    lp = od / f'逻辑方案_{a.name}.json'
    lp.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    # —— 体检（和 B09 同一套）——
    gpu, read_at = B05.census_gpu()
    model = B05.apply_census(gpu)
    ck = B05.run_checks(out, cues)
    ck['gpuModel'] = dict(source=str(B05.CENSUS.relative_to(ROOT)), readAt=read_at, **model)
    ck['b10'] = log
    rep = ovl.report(lp)
    ck['overlap'] = {k: v for k, v in rep.items() if k != 'pc'}
    ck['overlap']['pcList'] = rep['pc']
    prev = json.loads((od / '逻辑方案_B09.json').read_text(encoding='utf-8'))
    # B09 按同一把尺子（垂柳花盘按实测）重算一遍重叠，对比才公平
    prev_lp = od / f'逻辑方案_{a.name}_B09同尺.json'
    prev_lp.write_text(json.dumps(prev, ensure_ascii=False, indent=1), encoding='utf-8')
    prep = ovl.report(prev_lp)
    prev_lp.unlink()
    ck['overlapB09SameRuler'] = {k: v for k, v in prep.items() if k != 'pc'}
    ck['fanAudit'] = dict(B10=B06.audit(cues, out, 'B10'))
    ck['tierEnds'] = B07.tier_ends(cues)
    ck['shares'] = {f'{p}-{t}': B06.shares(cues, p, t) for p in ('pc', 'mobile') for t in ('high', 'medium', 'low')}
    vs = (('B10', cues), ('B09', prev['cues']))
    ck['heavy'] = dict(rule='同 B08：PC 低配亮着的浓密金菊面积 A（金曜菊 / 金蕊柠 / 金芒菊 / 金锦菊，含大号）≤ 4.0；金垂柳、银彩菊不在 A 里（推断，没实测）',
                       **{f'{v}-{t}': dict(dense=B08.peaks(B08.load_series(cs, 'dense', 'pc', t)), burst=B08.peaks(B08.load_series(cs, 'burst', 'pc', t))) for v, cs in vs for t in ('high', 'medium', 'low')},
                       atB05Peaks={v: B08.at_peaks(cs) for v, cs in vs})
    hero = [c for c in cues if c['sp'] == 'GKH']
    ck['heroWindow'] = {c['id']: dict(points=[e['point'] for e in c['events']], burst=[e['burst'] for e in c['events']], end=[e['end'] for e in c['events']],
                                       spacingM=sorted({round(abs(b.PT[x['point']]['x'] - b.PT[y['point']]['x']), 1) for x in c['events'] for y in c['events'] if x is not y}))
                        for c in hero}
    ck['willowOverlap'] = dict(note='analysis/scripts/垂柳重叠.py：真实点位 + 原机位，开花后 0–5 s；花盘 340 m × (EffectScale ÷ 0.998)（推断）',
                               B10={k: v for k, v in GW.audit(out).items() if k != 'rows'}, B09={k: v for k, v in GW.audit(prev).items() if k != 'rows'})
    ck['score'] = B07.scorecard(out, cues, prev)
    (od / f'体检_{a.name}.json').write_text(json.dumps(ck, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps(dict(revision=out['revision'], cues=len(cues), edits=log['edits'],
                          tiers={k: v['events'] for k, v in ck['tiers'].items()}, mobile={k: v['events'] for k, v in ck['b02']['mobileTiers'].items()},
                          gpu=ck['gpu']['peak'], tierNesting=ck['tierNesting']['ok'], mobileRuleViolations=len(log['mobileRule']['violations']),
                          overlap=dict(pc=ck['overlap']['pcIncidents'], mobile={k: v['incidents'] for k, v in ck['overlap']['mobile'].items()}),
                          overlapB09SameRuler=dict(pc=ck['overlapB09SameRuler']['pcIncidents'], mobile={k: v['incidents'] for k, v in ck['overlapB09SameRuler']['mobile'].items()}),
                          fanClash=ck['fanAudit']['B10']['clashPairs'], tierEnds=ck['tierEnds']['violations'], heroWindow=ck['heroWindow'], willowOverlap=ck['willowOverlap'],
                          atB05Peaks=ck['heavy']['atB05Peaks']), ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
