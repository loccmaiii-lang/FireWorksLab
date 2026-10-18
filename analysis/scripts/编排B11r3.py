#!/usr/bin/env python3
"""编排 B11 修订3（烟花编排（22）-本机，2026-10-19）：B11 修订2 上只做用户 10-19 00:3x 授权的一处。

用户 10-19 00:3x：「B12最后那个金芒菊帮我换成金垂柳可以嘛？时间是不是要挪一下？」（B12 = B11修订2，工作台 16.0.48）

- 全场最后一朵金芒菊 = B02_C181「白色收束 · 收尾金芒菊大」P4（204.67 s 开）。PC 这一朵改成主角金垂柳（大型_A_金垂柳，P_EFX_FireWorks_GoldKamuro，
  同 108 s / 171 s 主角：花型 R03_GoldKamuro_H280__K82，×0.998，挂超大_尾缀 RiseTrail_Hero，开在 398 m，寿命 14.5 s）。
- 时间不挪：大尾缀和主角尾缀升空都是 7.3651 s（主角尾缀只拉长度、不改时间，T19 实测），所以起飞 197.3 s、开花 204.67 s 都不变，
  只是花开得更高（330 → 398 m）、拖到约 219.2 s 才灭（原来 209.2 s）。节目长度跟着延到最后一朵灭，让工作台和灯光看得到这一段。
- 手游不动：C181m5（手游替身 中型_B_金芒菊 ×1.41）照旧；手游也换要用户另说。

用法：
  python3 -I analysis/scripts/编排B11r3.py                       # 生成 逻辑方案_B11r3.json + 体检_B11r3.json
  python3 -I analysis/scripts/编排B11r3.py --verify <修订3 一张表>   # 编译后：和修订2 逐条目对比
"""
import argparse
import copy
import importlib.util
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
D = ROOT / 'FXtools/节目/NewYearFireWorks_v01'
REF = D / '导演表-B11修订2-大型拆四行-金芒菊大用新行-一张表.json'
CUE = 'B02_C181'
HERO = dict(sp='GKH', templateId='R03_GoldKamuro_H280__K82', sizeK=0.82, heroTrail=True,
            label='收尾 金垂柳 400（P4·只上 PC）', name='白色收束 · 收尾金垂柳 400（P4）', wave='收尾')


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'analysis/scripts' / file)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def verify(table, ref):
    """和修订2 比：PC 每档只有收尾 P4 那一朵（花 + 尾缀）换掉，手游 0 变化。"""
    r2 = _load('r2', '编排B11r2.py')
    rep = dict(table=str(Path(table).resolve().relative_to(ROOT)), ref=str(Path(ref).resolve().relative_to(ROOT)), tiers={}, ok=True)
    short = lambda k: dict(t=k[0], point=k[2], res=k[5].replace('P_EFX_FireWorks_', ''), scale=k[6], z=round(k[3][2] + k[3][5], 1))
    for pname, plat in (('PC', 12), ('手游', 2)):
        for tname, tier in r2.TIERS:
            a, b = r2.events(ref, plat, tier), r2.events(table, plat, tier)
            key = lambda e: (e['t'], e['group'], e['point'], e['pos'], e['rot'], e['res'], e['scale'])
            ca, cb = Counter(key(e) for e in a), Counter(key(e) for e in b)
            rep['tiers'][f'{pname}{tname}'] = dict(events=len(b), ref=len(a), gone=[short(k) for k in sorted((ca - cb).elements())],
                                                  new=[short(k) for k in sorted((cb - ca).elements())])
    for t, _ in r2.TIERS:
        x = rep['tiers'][f'PC{t}']
        x['ok'] = len(x['gone']) == len(x['new']) == 2 and {g['res'] for g in x['gone']} == {'GoldRayChry_L', 'NY_Trail_Large'} \
            and {n['res'] for n in x['new']} == {'GoldKamuro', 'RiseTrail_Hero'}
        m = rep['tiers'][f'手游{t}']
        rep['ok'] = rep['ok'] and x['ok'] and not m['gone'] and not m['new']
    return rep


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default=str(ROOT / '协作/编排B01/逻辑方案_B11r2.json'))
    ap.add_argument('--name', default='B11r3')
    ap.add_argument('--out-dir', default=str(ROOT / '协作/编排B01'))
    ap.add_argument('--verify')
    ap.add_argument('--ref', default=str(REF))
    a = ap.parse_args()
    if a.verify:
        rep = verify(a.verify, a.ref)
        print(json.dumps(rep, ensure_ascii=False, indent=1))
        raise SystemExit(0 if rep['ok'] else 1)
    B11 = _load('b11', '编排B11.py')
    B10, B08, B07, B06, B05, b, ovl, GW = B11.B10, B11.B08, B11.B07, B11.B06, B11.B05, B11.b, B11.ovl, B11.GW
    plan = json.loads(Path(a.base).read_text(encoding='utf-8'))
    b.BAR0, b.OFFSET = plan['bar0S'], plan['musicOffsetS']
    b.QUIET = [(b.T(k), b.T(k + 1) - 0.1) for k in (41, 65, 96)]
    B10.patch_models()
    cues = copy.deepcopy(plan['cues'])
    by = {c['id']: c for c in cues}
    c = by[CUE]
    if c['sp'] != 'GRL' or c.get('mobile') is not False or c['points'] != ['P4']:
        raise SystemExit(f'{CUE} 不是预期的 PC 收尾金芒菊·大 P4')
    hero = by['B02_C086']['events'][0]
    life = round(hero['end'] - hero['burst'], 4)
    was = dict(sp=c['sp'], templateId=c['templateId'], sizeK=c['sizeK'], events=copy.deepcopy(c['events']))
    c.update(HERO)
    for e in c['events']:
        e['end'] = round(e['burst'] + life, 4)
    end = max(e['end'] for x in cues for e in x.get('events', []))
    duration = max(plan['duration'], round(end + 0.3, 1))
    log = dict(base=str(Path(a.base).resolve().relative_to(ROOT)), cue=CUE, was=was,
               now={k: c[k] for k in ('sp', 'templateId', 'sizeK', 'heroTrail', 'events')},
               heroLife=life, durationWas=plan['duration'], duration=duration, mobile='C181m5 手游替身不动',
               note='起飞 / 开花时刻不变（大尾缀与主角尾缀升空同为 7.3651 s）；开花 330 → 398 m；寿命 4.56 → 14.5 s；节目长度延到最后一朵灭。')
    log['mobileRule'] = B05.mobile_rule(cues)
    out = dict(plan, revision=f"{a.name}_finaleKamuro_from_{plan['revision']}", generator='analysis/scripts/编排B11r3.py',
               cues=cues, duration=duration, b11r3=log, base=log['base'])
    od = Path(a.out_dir)
    lp = od / f'逻辑方案_{a.name}.json'
    lp.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    gpu, read_at = B05.census_gpu()
    model = B05.apply_census(gpu)
    ck = B05.run_checks(out, cues)
    ck['gpuModel'] = dict(source=str(B05.CENSUS.relative_to(ROOT)), readAt=read_at, **model)
    ck['b11r3'] = {k: v for k, v in log.items() if k != 'mobileRule'}
    rep = ovl.report(lp)
    ck['overlap'] = {k: v for k, v in rep.items() if k != 'pc'}
    ck['overlap']['pcList'] = rep['pc']
    ck['fanAudit'] = dict(B11r3=B06.audit(cues, out, 'B11r3'))
    ck['tierEnds'] = B07.tier_ends(cues)
    ck['shares'] = {f'{p}-{t}': B06.shares(cues, p, t) for p in ('pc', 'mobile') for t in ('high', 'medium', 'low')}
    ck['heavy'] = dict(rule='同 B08：PC 低配亮着的浓密金菊面积 A ≤ 4.0（推断，没实测）',
                       **{f'B11r3-{t}': dict(dense=B08.peaks(B08.load_series(cues, 'dense', 'pc', t)), burst=B08.peaks(B08.load_series(cues, 'burst', 'pc', t)))
                          for t in ('high', 'medium', 'low')})
    ck['willowOverlap'] = {k: v for k, v in GW.audit(out).items() if k != 'rows'}
    ck['wallRounds'] = B11.wall_rounds(out)
    (od / f'体检_{a.name}.json').write_text(json.dumps(ck, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps(dict(revision=out['revision'], cues=len(cues), duration=duration, heroLife=life,
                          tiers={k: v['events'] for k, v in ck['tiers'].items()}, mobile={k: v['events'] for k, v in ck['b02']['mobileTiers'].items()},
                          gpu=ck['gpu']['peak'], tierNesting=ck['tierNesting']['ok'], mobileRuleViolations=len(log['mobileRule']['violations']),
                          overlap=dict(pc=ck['overlap']['pcIncidents'], mobile={k: v['incidents'] for k, v in ck['overlap']['mobile'].items()}),
                          fanClash=ck['fanAudit']['B11r3']['clashPairs'], tierEnds=ck['tierEnds']['violations'],
                          heavyLow=ck['heavy']['B11r3-low']['dense']), ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
