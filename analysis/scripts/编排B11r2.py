#!/usr/bin/env python3
"""编排 B11 修订2（跨年秀（22）-本机，2026-10-18）：B11 修订1 上只做用户 10-18 22:05 授权的「大型拆四行」。

用户 10-18 22:05：
「1.选拆行，2个银彩菊花，1个新的金芒菊，并且大号金芒菊加一个入芯……5.新行我在2829下加，[截图]，我创建好了示例，你去把ID给我重新梳理……」

用户在 PC ResourceFX 的 大型_D_多重菊 下面加了 大型_E_银彩菊 / 大型_F_金芒菊 / 大型_G_银白菊 三行。修订1 里 PC 的 大型_B_银彩菊（P_EFX_FireWorks_SilverStrobeChry）一行放了 90 朵
（银彩菊 55 + 白墙 16 + 金芒菊·大 19），修订2 按角色拆成四行（只改 PC，mobile === false 的片段；手游替身 m5 / m 一律不动）：
- 大型_B_银彩菊（不变，P_EFX_FireWorks_SilverStrobeChry）：银彩菊第一组 31 朵
- 大型_E_银彩菊（P_EFX_FireWorks_SilverStrobeChry_B）：银彩菊第二组 24 朵，和第一组按时间交替（61.1 / 108 / 116.2 / 132.4 / 158.3 s）
- 大型_G_银白菊（P_EFX_FireWorks_SilverWhiteChry）：白墙 16 朵（194.0 / 197.2 / 200.5 / 204.8 s）
- 大型_F_金芒菊（P_EFX_FireWorks_GoldRayChry_L）：金芒菊·大 19 朵，原生 150 m（= 复制 中型_B_金芒菊 的粒子），EffectScale = 直径 ÷ 150（1.410666 / 1.533333），
  也就是回到 B09 的直径和缩放，只是换成自己的一行（修订1 是 2827 ÷ 230）
三个新 ResourceId 是我的建议（10-18 22:00 只读读回时三行 ResourceId 都照抄成 SilverStrobeChry，要用户改）；编排里只认 ResourceId。
逻辑方案的片段与修订1 完全相同，换行在编译时做（`--pc-large` + 新开关 `--cue-resource`），所以这一份逻辑方案只多一段 b11r2 记录。

用法：
  python3 -I analysis/scripts/编排B11r2.py                      # 生成 逻辑方案_B11r2.json + 体检_B11r2.json，打印编译命令用的两个开关
  python3 -I analysis/scripts/编排B11r2.py --verify <修订2 一张表> [--ref <修订1 一张表>]   # 编译后：事件级对比修订1、每行 PC 高中低朵数
"""
import argparse
import copy
import importlib.util
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
D = ROOT / 'FXtools/节目/NewYearFireWorks_v01'
REF = D / '导演表-B11修订1-白墙奇数点-金芒菊大用2827-一张表.json'


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'analysis/scripts' / file)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


ROWS = {   # ResourceId → ResourceFX 中文行名
    'P_EFX_FireWorks_SilverStrobeChry': '大型_B_银彩菊',
    'P_EFX_FireWorks_SilverStrobeChry_B': '大型_E_银彩菊',
    'P_EFX_FireWorks_GoldRayChry_L': '大型_F_金芒菊',
    'P_EFX_FireWorks_SilverWhiteChry': '大型_G_银白菊',
    'P_EFX_FireWorks_GoldCoreLime_L': '大型_C_金蕊柠',
    'P_EFX_FireWorks_MultiLayerChry_L': '大型_D_多重菊',
    'P_EFX_FireWorks_GoldKamuro': '大型_A_金垂柳',
}
SPLIT = {
    'P_EFX_FireWorks_SilverStrobeChry_B': ['B02_C051', 'B02_C051k100', 'B02_C087', 'B02_C096', 'B02_C113', 'B02_C133'],
    'P_EFX_FireWorks_SilverWhiteChry': ['B02_C171', 'B02_C174', 'B02_C178', 'B08_C990'],
}
PC_LARGE = 'GRL=P_EFX_FireWorks_GoldRayChry_L@150'
CUE_RESOURCE = ';'.join(f'{r}:{ROWS[r]}={"+".join(ids)}' for r, ids in SPLIT.items())
EXPECT = {'大型_B_银彩菊': (31, 25, 23), '大型_E_银彩菊': (24, 22, 22), '大型_F_金芒菊': (19, 19, 13), '大型_G_银白菊': (16, 16, 16)}
Q = {'EQuality_VeryLow': 0, 'EQuality_Low': 1, 'EQuality_Medium': 2, 'EQuality_High': 3, 'EQuality_Epic': 4}
TIERS = (('高', 3), ('中', 2), ('低', 0))


def ok(f, plat, tier):
    if not f:
        return True
    pf, mq = f.get('PlatformFlags'), f.get('MinQualityLevel')
    if pf is not None and not (pf & plat):
        return False
    return not (mq is not None and Q.get(mq, 0) > tier)


def events(path, plat, tier):
    """一张表按 平台 × 档位 展开成球花 / 尾缀条目：(开花时刻, 组, 点 SlotIndex, 位置, 旋转, ResourceId, 缩放)。花型名不进 key（修订2 只换行，花型另存了新名字）。"""
    d = json.loads(Path(path).read_text(encoding='utf-8'))
    subs = {s['TemplateName']: s for s in d['EffectSubTemplates']}
    tpls = {t['TemplateName']: t for t in d['EffectTemplates']}
    out = []
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
                    if not ok(x.get('Filter'), plat, tier) or not x.get('FXResourceId'):
                        continue
                    r = lambda v: round(v, 4)
                    p, o, sc = x.get('PositionOffset') or {}, x.get('RotationOffset') or {}, x.get('EffectScale') or {}
                    ep, eo, es = e.get('PositionOffset') or {}, e.get('RotationOffset') or {}, e.get('EffectScale') or {}
                    out.append(dict(t=r(s['StartTime'] + e['LocalTimeOffset'] + x['LocalTimeOffset']), group=g['GroupName'], point=e.get('SlotIndex'),
                                    pos=tuple(r(ep.get(k, 0)) for k in 'XYZ') + tuple(r(p.get(k, 0)) for k in 'XYZ'),
                                    rot=tuple(r(eo.get(k, 0)) for k in ('Pitch', 'Yaw', 'Roll')) + tuple(r(o.get(k, 0)) for k in ('Pitch', 'Yaw', 'Roll')),
                                    res=x['FXResourceId'], scale=round(sc.get('X', 1) * es.get('X', 1), 6)))
    return out


def verify(table, ref):
    rep = dict(table=str(Path(table).resolve().relative_to(ROOT)), ref=str(Path(ref).resolve().relative_to(ROOT)), tiers={}, rows={}, ok=True)
    for pname, plat in (('PC', 12), ('手游', 2)):
        for tname, tier in TIERS:
            a, b = events(ref, plat, tier), events(table, plat, tier)
            key = lambda e: (e['t'], e['group'], e['point'], e['pos'], e['rot'])
            ca, cb = Counter((key(e), e['res'], e['scale']) for e in a), Counter((key(e), e['res'], e['scale']) for e in b)
            gone, new = ca - cb, cb - ca
            changed = Counter()
            ga = {k: (r, s) for (k, r, s) in gone.elements()}
            unmatched = 0
            for (k, r, s) in new.elements():
                if k not in ga:
                    unmatched += 1
                    continue
                r0, s0 = ga[k]
                changed[(r0.replace('P_EFX_FireWorks_', ''), r.replace('P_EFX_FireWorks_', ''), 'scale' if s0 != s else 'same', s0, s)] += 1
            rep['tiers'][f'{pname}{tname}'] = dict(events=len(b), ref=len(a), changedEvents=sum(new.values()), unmatched=unmatched,
                                                   changes=[dict(fromRes=f, toRes=t, scale=k, fromScale=s0, toScale=s1, n=n) for (f, t, k, s0, s1), n in sorted(changed.items())])
            if len(a) != len(b) or unmatched:
                rep['ok'] = False
    for tname, tier in TIERS:
        c = Counter(ROWS.get(e['res']) for e in events(table, 12, tier) if e['res'] in ROWS)
        rep['rows'][f'PC{tname}'] = dict(c)
    got = {row: tuple(rep['rows'][f'PC{t}'].get(row, 0) for t, _ in TIERS) for row in EXPECT}
    rep['rowsExpect'] = dict(expect={k: list(v) for k, v in EXPECT.items()}, got={k: list(v) for k, v in got.items()}, ok=got == EXPECT)
    pc_high = rep['tiers']['PC高']
    rep['changedExpect'] = dict(expect=59, got=pc_high['changedEvents'], scaleChanged=sum(x['n'] for x in pc_high['changes'] if x['scale'] == 'scale'))
    mob = [rep['tiers'][f'手游{t}']['changedEvents'] for t, _ in TIERS]
    rep['mobileUnchanged'] = all(x == 0 for x in mob)
    rep['ok'] = rep['ok'] and rep['rowsExpect']['ok'] and pc_high['changedEvents'] == 59 and rep['changedExpect']['scaleChanged'] == 19 and rep['mobileUnchanged']
    return rep


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default=str(ROOT / '协作/编排B01/逻辑方案_B11r1.json'))
    ap.add_argument('--name', default='B11r2')
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
    visible = B10.patch_models()
    cues = copy.deepcopy(plan['cues'])
    by = {c['id']: c for c in cues}
    for ids in SPLIT.values():
        for i in ids:
            if by[i].get('mobile') is not False:
                raise SystemExit(f'{i} 不是只上 PC 的片段')
    log = dict(base=str(Path(a.base).resolve().relative_to(ROOT)), heroLife=B10.HERO_LIFE, heroSizeK=B10.HERO_SIZEK, willowVisibleDiaM=visible,
               pcLarge=PC_LARGE, cueResource=CUE_RESOURCE, rows=ROWS,
               pcLargeCues=[c['id'] for c in cues if c['sp'] == 'GRL' and c['size'] == 'L' and c.get('mobile') is False],
               split={ROWS[r]: ids for r, ids in SPLIT.items()},
               note='片段与修订1 完全相同；换行在编译时做（--pc-large / --cue-resource）。三个新 ResourceId 是计划值，UE 里改好后要只读读回核对。')
    log['mobileRule'] = B05.mobile_rule(cues)
    out = dict(plan, revision=f"{a.name}_splitLarge4rows_from_{plan['revision']}", generator='analysis/scripts/编排B11r2.py', cues=cues, b11r2=log, base=log['base'])
    od = Path(a.out_dir)
    lp = od / f'逻辑方案_{a.name}.json'
    lp.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    gpu, read_at = B05.census_gpu()
    model = B05.apply_census(gpu)
    ck = B05.run_checks(out, cues)
    ck['gpuModel'] = dict(source=str(B05.CENSUS.relative_to(ROOT)), readAt=read_at, **model)
    ck['b11r2'] = {k: v for k, v in log.items() if k != 'mobileRule'}
    rep = ovl.report(lp)
    ck['overlap'] = {k: v for k, v in rep.items() if k != 'pc'}
    ck['overlap']['pcList'] = rep['pc']
    ck['fanAudit'] = dict(B11r2=B06.audit(cues, out, 'B11r2'))
    ck['tierEnds'] = B07.tier_ends(cues)
    ck['shares'] = {f'{p}-{t}': B06.shares(cues, p, t) for p in ('pc', 'mobile') for t in ('high', 'medium', 'low')}
    ck['heavy'] = dict(rule='同 B08：PC 低配亮着的浓密金菊面积 A ≤ 4.0（推断，没实测）',
                       **{f'B11r2-{t}': dict(dense=B08.peaks(B08.load_series(cues, 'dense', 'pc', t)), burst=B08.peaks(B08.load_series(cues, 'burst', 'pc', t))) for t in ('high', 'medium', 'low')})
    ck['willowOverlap'] = {k: v for k, v in GW.audit(out).items() if k != 'rows'}
    ck['wallRounds'] = B11.wall_rounds(out)
    (od / f'体检_{a.name}.json').write_text(json.dumps(ck, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps(dict(revision=out['revision'], cues=len(cues), pcLarge=PC_LARGE, cueResource=CUE_RESOURCE,
                          tiers={k: v['events'] for k, v in ck['tiers'].items()}, mobile={k: v['events'] for k, v in ck['b02']['mobileTiers'].items()},
                          gpu=ck['gpu']['peak'], tierNesting=ck['tierNesting']['ok'], mobileRuleViolations=len(log['mobileRule']['violations']),
                          overlap=dict(pc=ck['overlap']['pcIncidents'], mobile={k: v['incidents'] for k, v in ck['overlap']['mobile'].items()}),
                          fanClash=ck['fanAudit']['B11r2']['clashPairs'], tierEnds=ck['tierEnds']['violations']), ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
