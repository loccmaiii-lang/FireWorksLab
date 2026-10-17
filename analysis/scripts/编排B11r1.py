#!/usr/bin/env python3
"""编排 B11 修订1（跨年秀（22），2026-10-18）：B11 上只改用户 10-18 01:52 授权的两处。

用户 10-18 01:52：
「1.白墙第二轮你理解错了，我说的错开是第一轮P2/P4/P6，第二轮P1/P3/P5/P7这样错开；
  2.金芒菊大你用银彩菊的ID就可以了，银彩菊现在用的就是金芒菊放大版，还是你想表达什么？
  3.我没额度了，你直接把我上面说的做了，提交B11修订版，下周一再说」

B11 修订1 = B11 的逻辑方案，加两处：
① PC 白墙第二轮（B02_C178，200.6 s）改 P1 / P3 / P5 / P7（B11 是 P0 / P8，我把「错开」读成了换到两端）。第一轮 P2 / P4 / P6（197.3 s）不动。
   时刻沿用原来的：中间两朵（P3 / P5）跟原来的 P4（193.1 发射、200.4651 开花），外侧两朵（P1 / P7）跟原来的 P2 / P6（193.3、200.6651），中间先外侧后。
   手游替身（B02_C178m5）不动，仍 P0 / P8：宪章第 8 节「手机 M / L 一排只放偶数点」手游放不了奇数点，只有 PC 能照你说的放。
② PC 的「金芒菊·大」（mobile === false 的 GRL 大号，B02_C081 / C082 / C109 / C109k100 / C140 / C140k100 / C161 / C181）改用 ResourceFX 2827 大型_B_银彩菊
   （P_EFX_FireWorks_SilverStrobeChry，原生 230 m），EffectScale = 直径 ÷ 230（原来用 2824 中型金芒菊 ×1.53 / ×1.41）。画面是你说的「金芒菊放大版」，我没能在云端核实 2827 的粒子内容（推断，依据你的话）。
   手游替身（mobile 'only'）不动：手游表没有 2827，仍用 2824 放大。逻辑方案里这些 cue 的 templateId 在编译时由 `--pc-large` 改写，所以这一份逻辑方案只改白墙。

用法：python3 -I analysis/scripts/编排B11r1.py
"""
import argparse
import copy
import json
from pathlib import Path

import importlib.util

ROOT = Path(__file__).resolve().parents[2]


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'analysis/scripts' / file)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


B11 = _load('b11', '编排B11.py')
B10, B09, B08, B07, B06, B05, b, ovl, GW = B11.B10, B11.B09, B11.B08, B11.B07, B11.B06, B11.B05, B11.b, B11.ovl, B11.GW

PC_LARGE = 'GRL=P_EFX_FireWorks_SilverStrobeChry@230'
ODD = ('P1', 'P3', 'P5', 'P7')


def wall_odd(cues):
    c = next(c for c in cues if c['id'] == 'B02_C178')
    was = [e['point'] for e in c['events']]
    ref = {'P1': 'P2', 'P7': 'P6', 'P3': 'P4', 'P5': 'P4'}   # 时刻借原来的 P2 / P4 / P6
    src = json.loads((ROOT / '协作/编排B01/逻辑方案_B09.json').read_text(encoding='utf-8'))
    orig = {e['point']: e for e in next(x for x in src['cues'] if x['id'] == 'B02_C178')['events']}
    c['events'] = [dict(orig[ref[p]], point=p) for p in ('P3', 'P5', 'P1', 'P7')]   # center-out：中间两朵先
    c['points'] = list(ODD)
    c['profiles'] = {t: list(ODD) for t in c['profiles']}
    c['label'] = '白墙第二轮（奇数点 P1 P3 P5 P7·错开第一轮 P2 P4 P6）'
    c['name'] = '白色收束 · 白墙第二轮（奇数点）'
    return dict(cue='B02_C178', action='PC 第二轮错开第一轮：P2 / P4 / P6 → P1 / P3 / P5 / P7（手游替身 C178m5 仍 P0 / P8）', was=was, now=c['points'],
                at=[(e['point'], e['launch'], e['burst']) for e in c['events']])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default=str(ROOT / '协作/编排B01/逻辑方案_B11.json'))
    ap.add_argument('--name', default='B11r1')
    ap.add_argument('--out-dir', default=str(ROOT / '协作/编排B01'))
    a = ap.parse_args()
    plan = json.loads(Path(a.base).read_text(encoding='utf-8'))
    b.BAR0, b.OFFSET = plan['bar0S'], plan['musicOffsetS']
    b.QUIET = [(b.T(k), b.T(k + 1) - 0.1) for k in (41, 65, 96)]
    visible = B10.patch_models()
    cues = copy.deepcopy(plan['cues'])
    log = dict(base=str(Path(a.base).resolve().relative_to(ROOT)), heroLife=B10.HERO_LIFE, heroSizeK=B10.HERO_SIZEK, willowVisibleDiaM=visible, pcLarge=PC_LARGE,
               pcLargeCues=[c['id'] for c in cues if c['sp'] == 'GRL' and c['size'] == 'L' and c.get('mobile') is False],
               mobileStandinsUnchanged=[c['id'] for c in cues if c['sp'] == 'GRL' and c.get('mobile') == 'only'][:3] + ['…'])
    log['edits'] = [wall_odd(cues)]
    cues.sort(key=lambda c: (min(e['launch'] for e in c['events']), c['id']))
    log['mobileRule'] = B05.mobile_rule(cues)
    out = dict(plan, revision=f"{a.name}_wall2_oddPoints_pcLarge2827_from_{plan['revision']}", generator='analysis/scripts/编排B11r1.py', cues=cues, b11r1=log, base=log['base'])
    od = Path(a.out_dir)
    lp = od / f'逻辑方案_{a.name}.json'
    lp.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    gpu, read_at = B05.census_gpu()
    model = B05.apply_census(gpu)
    ck = B05.run_checks(out, cues)
    ck['gpuModel'] = dict(source=str(B05.CENSUS.relative_to(ROOT)), readAt=read_at, **model)
    ck['b11r1'] = log
    rep = ovl.report(lp)
    ck['overlap'] = {k: v for k, v in rep.items() if k != 'pc'}
    ck['overlap']['pcList'] = rep['pc']
    prev = json.loads(Path(a.base).read_text(encoding='utf-8'))
    prev_lp = od / f'逻辑方案_{a.name}_B11同尺.json'
    prev_lp.write_text(json.dumps(prev, ensure_ascii=False, indent=1), encoding='utf-8')
    prep = ovl.report(prev_lp)
    prev_lp.unlink()
    ck['overlapB11SameRuler'] = {k: v for k, v in prep.items() if k != 'pc'}
    ck['fanAudit'] = dict(B11r1=B06.audit(cues, out, 'B11r1'))
    ck['tierEnds'] = B07.tier_ends(cues)
    ck['shares'] = {f'{p}-{t}': B06.shares(cues, p, t) for p in ('pc', 'mobile') for t in ('high', 'medium', 'low')}
    vs = (('B11r1', cues), ('B11', prev['cues']))
    ck['heavy'] = dict(rule='同 B08：PC 低配亮着的浓密金菊面积 A ≤ 4.0；金垂柳、银彩菊不在 A 里（推断，没实测）',
                       **{f'{v}-{t}': dict(dense=B08.peaks(B08.load_series(cs, 'dense', 'pc', t)), burst=B08.peaks(B08.load_series(cs, 'burst', 'pc', t))) for v, cs in vs for t in ('high', 'medium', 'low')},
                       atB05Peaks={v: B08.at_peaks(cs) for v, cs in vs})
    ck['willowOverlap'] = dict(note='同 B11', B11r1={k: v for k, v in GW.audit(out).items() if k != 'rows'}, B11={k: v for k, v in GW.audit(prev).items() if k != 'rows'})
    ck['wallRounds'] = B11.wall_rounds(out)
    ck['wallRoundsB11'] = B11.wall_rounds(prev)
    ck['score'] = B07.scorecard(out, cues, prev)
    (od / f'体检_{a.name}.json').write_text(json.dumps(ck, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps(dict(revision=out['revision'], cues=len(cues), edits=log['edits'], pcLargeCues=log['pcLargeCues'],
                          tiers={k: v['events'] for k, v in ck['tiers'].items()}, mobile={k: v['events'] for k, v in ck['b02']['mobileTiers'].items()},
                          gpu=ck['gpu']['peak'], tierNesting=ck['tierNesting']['ok'], mobileRuleViolations=len(log['mobileRule']['violations']),
                          overlap=dict(pc=ck['overlap']['pcIncidents'], mobile={k: v['incidents'] for k, v in ck['overlap']['mobile'].items()}),
                          overlapB11SameRuler=dict(pc=ck['overlapB11SameRuler']['pcIncidents'], mobile={k: v['incidents'] for k, v in ck['overlapB11SameRuler']['mobile'].items()}),
                          fanClash=ck['fanAudit']['B11r1']['clashPairs'], tierEnds=ck['tierEnds']['violations'], willowOverlap=ck['willowOverlap'],
                          wallRounds=ck['wallRounds'], atB05Peaks=ck['heavy']['atB05Peaks']), ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
