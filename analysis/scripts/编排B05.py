#!/usr/bin/env python3
"""B05：B04 + ResourceFX 新命名 + 手游 6 种（跨年秀 22；用户 10-14 21:44 / 22:22，派活 C03，看板 n62）。

只换名字和手游种类，不改编排结构——时间、点位、高低、大小、档位、PC 的花型全部照 B04：
  ① 尾缀按用途：坝顶低层（B04 的 trail 'Tiny'）→ Low80 = 用户的 XS「跨年烟花3.0_低位_尾缀」；小平台 → Front62 = 用户的 Tiny「跨年烟花3.0_极小_尾缀」
     （见 协作/编排B01/新尾缀.json；和 B04 时的暂定名正好对调，高度 / 升空时间跟用途走）。
  ② 名字：导演表认 ResourceId，编译加 --resource-map 协作/编排B01/资源名映射.json（OrangeGlitter → Glitter；行名 / 粒子元数据跟 T05 读回）；
     片段标签里坝顶「小银菊」→「银冠菊」（2814 改名；小平台的「小银菊」是新加的 2801，不动）。
  ③ 小平台 PC 的花换成专用资源 2801 小银菊 / 2800 小金花 / 2802 短爆裂（前台小花.json），时刻不变。
  ④ 手游 6 种（手游种类.json）：上手游的片段按「位」换花——大位 → 金芒菊放大，中位 → 银冠菊 / 辉星放大，小位 → 爆裂星 / 点灭星，
     小平台 → 分裂星（2803 原生 30 m，进 90 m 小位要 ×3，超过 1.6）。PC 和手游共用的片段拆成「PC 照旧（只上 PC）」+「手游替身（只上手游，同点、同时、同高低、同档位）」；已有手游替身直接换花。
     同一位同一根尾缀，所以起飞 / 开花都不变，手游发数不变。放大 ≤ ×1.6，超过的不用略大版。
  ⑤ GPU / 发射器按 T05 读回（FXtools/节目/NewYearFireWorks_v01/资源发射器数.json，10-14）算。

用法：python3 -I analysis/scripts/编排B05.py [--base 逻辑方案_B04.json] [--name B05] [--out-dir 协作/编排B01]
      python3 -I analysis/scripts/编排B05.py --verify <导演表-…-一张表.json>     # 编译后核对：手游事件只用 6 种 + 尾缀，所有 ResourceId 在读回里
"""
import argparse
import copy
import importlib.util
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location('b01', ROOT / 'analysis/scripts/编排B01.py')
b = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(b)
b.HEIGHTS = 'v2'
b.register_b05_mobile()
_spec2 = importlib.util.spec_from_file_location('ovl', ROOT / 'analysis/scripts/编排重叠体检.py')
ovl = importlib.util.module_from_spec(_spec2)
_spec2.loader.exec_module(ovl)
ovl.b.register_b05_mobile()
MOBF = b.MOBF
FRONT_M = {x['mobileOf']: x for x in b.FRONTF['flowers'] if x.get('mobileOf')}
MAXS = MOBF['maxScale']
CENSUS = ROOT / 'FXtools/节目/NewYearFireWorks_v01/资源发射器数.json'
RMAP = json.loads((ROOT / '协作/编排B01/资源名映射.json').read_text(encoding='utf-8'))
NATIVE = {'S': 90.0, 'M': 150.0, 'L': 230.0}   # R03 尺寸（资源原生花径按来源花型）


def base_scale(code):
    """这个手游花型（不含大小随机）相对资源原生花径的倍数"""
    t = b.TPL[b.SPECIES[code][0]]
    if code in b.FAMILY or t.get('mobileDerived'):          # 大号 / 手游放大：同一资源放大
        f = t.get('mobileDerived')
        if f and f.get('nativeM'):
            return f['diameter'] / f['nativeM']
        src = b.TPL[b.SPECIES[b.FAMILY[code]][0]]
        return (t['diameter'] or 0) / (src['diameter'] or 1)
    return 1.0


ALLOWED = {'L': {'GRL'}, 'M': {'SCM', 'OGM'}, 'S': {'CR', 'ST'},   # 分裂星 2803 原生 30 m，进不了 90 m 小位（×3 > 1.6），只放小平台
           'X': {x['code'] for x in FRONT_M.values()} | {x['code'] for x in b.FRONTF['flowers'] if not x['flowers']}}


def mobile_target(c, by):
    """这个上手游的片段该换成哪种（code）：本来就合位的不动；否则按位 + PC 那朵的色系（手游种类.json slots）"""
    size = c['size']
    if c['sp'] in ALLOWED.get(size, ()):
        return c['sp']
    if size == 'X':
        return FRONT_M[c['sp']]['code'] if c['sp'] in FRONT_M else c['sp']
    if size == 'F':
        return None
    pc = by[c['standinOf']] if c.get('mobile') == 'only' and c.get('standinOf') in by else c
    table = MOBF['slots'][size]
    if '*' in table:
        return table['*']
    for sp in (b.fam(pc['sp']), b.fam(c['sp'])):
        if sp in table:
            return table[sp]
    raise SystemExit(f'手游种类.json 没给 {size} 位的 {pc["sp"]} 配花：{c["id"]}')


def target_template(code, k):
    """手游花型 + 大小随机；放大顶破 1.6 的不用略大版"""
    base = b.SPECIES[code][0]
    if b.SPECIES[code][2] == 'X':
        return base, 1.0
    if k and abs(k - 1) > 1e-9 and base_scale(code) * k <= MAXS + 1e-9:
        return f'{base}__K{round(k * 100)}', k
    return base, 1.0


def relabel(text, old, new):
    return text.replace(old, new) if old and old in text else text


def build(plan):
    cues = copy.deepcopy(plan['cues'])
    by = {c['id']: c for c in cues}
    log = dict(lowLayer=[], labels=0, mobileSplit=[], mobileStandinSwap=[], mobileKept=[], platform=[])
    # ① 尾缀按用途
    for c in cues:
        if c.get('trail') == 'Tiny':
            c['trail'] = 'Low80'
            log['lowLayer'].append(c['id'])
    # ② 标签：坝顶小银菊 → 银冠菊（2814 改名）；小平台标签跟新名字（XS → Tiny）
    for c in cues:
        before = (c.get('label'), c.get('name'))
        if c['size'] == 'X':
            new = b.SPECIES[c['sp']][1]
            for a in (c['label'], c['label'].replace('Tiny', 'XS')):
                c['name'] = relabel(c['name'], a, new)
            c['label'] = new
            log['platform'].append(c['id'])
        elif b.fam(c['sp']) == 'SC' or '小银菊' in (c.get('label') or ''):
            c['label'] = relabel(c['label'], '小银菊', '银冠菊')
            c['name'] = relabel(c['name'], '小银菊', '银冠菊')
        log['labels'] += before != (c.get('label'), c.get('name'))
    # ④ 手游 6 种
    out = []
    for c in cues:
        out.append(c)
        if c.get('mobile') is False:
            continue
        code = mobile_target(c, by)
        if code is None:
            continue
        tid, k = target_template(code, c.get('sizeK') or 1.0)
        if code == c['sp'] and tid == c['templateId']:
            log['mobileKept'].append(dict(cue=c['id'], sp=code))
            continue
        tpl = b.TPL[tid.split('__K')[0]]
        if c.get('mobile') == 'only':
            m, old = c, (c['sp'], c['templateId'])
        else:
            m = copy.deepcopy(c)
            m.update(id=c['id'] + 'm5', mobile='only', standinOf=c['id'])
            c['mobile'] = False
            out.append(m)
            old = (c['sp'], c['templateId'])
        old_label = m['label']
        m.update(sp=code, templateId=tid, sizeK=k, label=b.SPECIES[code][1])
        m['name'] = relabel(m['name'], old_label, m['label']) if old_label in m['name'] else f"{m['name']}（手游·{m['label']}）"
        for e in m['events']:
            if c['size'] == 'X':
                assert abs((e['burst'] - e['launch']) - tpl['rise']) < 1e-3 or not tpl['rise'], (m['id'], e)
                e['end'] = round(e['launch'] + tpl['recipeDuration'], 6)
            else:
                assert abs((e['burst'] - e['launch']) - tpl['rise']) < 1e-3, (m['id'], tid, e['burst'] - e['launch'], tpl['rise'])
                e['end'] = round(e['burst'] + tpl['life'], 6)
        (log['mobileStandinSwap'] if m is c else log['mobileSplit']).append(dict(cue=m['id'], of=m.get('standinOf'), size=c['size'], fromSp=old[0], fromTpl=old[1], toSp=code, toTpl=tid,
                                                                                    scale=round(base_scale(code) * k, 3), events=len(m['events'])))
    out.sort(key=lambda c: (min(e['launch'] for e in c['events']), c['id']))
    return out, log


def census_gpu():
    """T05 读回（10-14）的 GPU 发射器数，按 ResourceId"""
    cz = json.loads(CENSUS.read_text(encoding='utf-8'))
    return {x['id']: (x['FxSP'] or {}).get('gpu', 0) for x in cz['pc']}, cz['readAt']


def res_of_code(code):
    """花型 code → 球花的 ResourceId（改名后）"""
    t = b.TPL[b.SPECIES[code][0]]
    f = t.get('mobileDerived')
    if f and f.get('resource'):
        return f['resource']
    src = b.TPL[b.SPECIES[b.FAMILY.get(code, code)][0]]
    res = next(e['res'] for e in b.SUB[src['subTemplateRef']]['entries'] if e['res'] and 'Trail' not in e['res'])
    return RMAP['renames'].get(res, res)


def apply_census(gpu):
    """把 GPU 模型换成读回值（只在本进程里改）"""
    tr = {'S': 'P_EFX_FireWorks_NY_Trail_Small', 'M': 'P_EFX_FireWorks_NY_Trail_Medium', 'L': 'P_EFX_FireWorks_NY_Trail_Large'}
    b.TAIL_GPU = {k: gpu[v] for k, v in tr.items()}
    b.BEAM_GPU = {'R': gpu['P_EFX_FireWorks_FanComet_01'], 'S': gpu['P_EFX_FireWorks_FanSilver_01']}
    for t in b.NEWT['trails'].values():
        t['gpu'] = gpu.get(t['resourceId'], t['gpu'])
    for code, v in list(b.SPECIES.items()):
        if v[2] in 'SML':
            b.SPECIES[code] = v[:4] + (gpu.get(res_of_code(code), v[4]),)
    return dict(trail=b.TAIL_GPU, fanPerBeam=b.BEAM_GPU, lowLayerTrail=b.NEWT['trails']['Low80']['gpu'], platformTrail=b.NEWT['trails']['Front62']['gpu'],
                bodies={b.SPECIES[k][1]: b.SPECIES[k][4] for k in b.SPECIES if b.SPECIES[k][2] in 'SML' and b.SPECIES[k][4]})


def run_checks(out, cues):
    b.BAR0, b.OFFSET = out['bar0S'], out['musicOffsetS']
    b.QUIET = [(b.T(k), b.T(k + 1) - 0.1) for k in (41, 65, 96)]
    S = b.Show(2)
    S.cues, S.sections = cues, out['sections']
    S.b02 = dict(split=None, beamFlowerCues=sum(1 for c in cues if c['size'] == 'X'))
    S.baseGroups = sum(1 for c in cues if c.get('wave') == '托底扇')
    return b.checks(S)


def mobile_rule(cues):
    """手游片段只用 6 种，且按位：大 → 金芒菊；中 → 银冠菊 / 辉星；小 → 爆裂星 / 点灭星 / 分裂星；小平台 → 分裂星（或不开花的 V 形）"""
    allowed = ALLOWED
    bad, by = [], defaultdict(int)
    for c in cues:
        if c.get('mobile') is False:
            continue
        if c['sp'] not in allowed.get(c['size'], set()):
            bad.append(dict(cue=c['id'], size=c['size'], sp=c['sp'], name=b.SPECIES[c['sp']][1]))
        by[b.SPECIES[c['sp']][1]] += len(c['events'])
    return dict(violations=bad, eventsBySpecies=dict(sorted(by.items(), key=lambda kv: -kv[1])))


def scale_table(cues):
    rows = defaultdict(lambda: dict(cues=0, events=0, scales=set()))
    for c in cues:
        if c.get('mobile') is False or c['size'] not in 'SMLX':
            continue
        if c['size'] == 'X':
            x = next(x for x in b.FRONTF['flowers'] if x['code'] == c['sp'])
            sc = {round(f['diameter'] / b.FRONTF['flowerSources'][f['src']]['nativeM'], 3) for f in x['flowers']}
        else:
            sc = {round(base_scale(c['sp']) * (c.get('sizeK') or 1.0), 3)}
        r = rows[c['sp']]
        r['cues'] += 1
        r['events'] += len(c['events'])
        r['scales'] |= sc
    return {b.SPECIES[k][1]: dict(cues=v['cues'], events=v['events'], scales=sorted(v['scales']), max=max(v['scales']) if v['scales'] else None) for k, v in rows.items()}


def verify(table_path):
    """编译后核对一张表：所有 ResourceId 在 T05 读回里；手游（PlatformFlags 含 2）只用 6 种 + 尾缀"""
    m = json.loads(Path(table_path).read_text(encoding='utf-8'))
    rb = json.loads((ROOT / RMAP['readback']).read_text(encoding='utf-8'))
    rows = {r['ResourceId']: r['_row_name'] for r in rb['pc']}
    subs = {s['TemplateName']: s for s in m['EffectSubTemplates']}
    ok6 = {x['resource'] for x in MOBF['species6']} | set(MOBF['trailsMobile'])
    used, mob, bad = set(), defaultdict(int), []
    for t in m['EffectTemplates']:
        for e in t['Entries']:
            flags = (e.get('Filter') or {}).get('PlatformFlags', 14)
            for se in subs[e['SubTemplateName']]['Entries']:
                used.add(se['FXResourceId'])
                if flags & 2:
                    mob[se['FXResourceId']] += 1
                    if se['FXResourceId'] not in ok6:
                        bad.append((t['TemplateName'], e['SubTemplateName'], se['FXResourceId'], flags))
    return dict(table=str(table_path), readAt=rb['readAt'], resources={r: rows.get(r) for r in sorted(used)}, missing=sorted(r for r in used if r not in rows),
                mobileResources=dict(sorted(mob.items())), mobileNotIn6=sorted(set(bad))[:20], mobileNotIn6Count=len(bad))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default=str(ROOT / '协作/编排B01/逻辑方案_B04.json'))
    ap.add_argument('--name', default='B05')
    ap.add_argument('--out-dir', default=str(ROOT / '协作/编排B01'))
    ap.add_argument('--verify', help='编译后核对一张表')
    a = ap.parse_args()
    if a.verify:
        print(json.dumps(verify(a.verify), ensure_ascii=False, indent=1))
        return
    plan = json.loads(Path(a.base).read_text(encoding='utf-8'))
    cues, log = build(plan)
    log['mobileRule'] = mobile_rule(cues)
    log['mobileScale'] = scale_table(cues)
    base_rel = Path(a.base).resolve()
    out = dict(plan, revision=f"{a.name}_resourcefx20261014_mobile6_from_{plan['revision']}", cues=cues, b05=log,
               base=str(base_rel.relative_to(ROOT)) if base_rel.is_relative_to(ROOT) else base_rel.name)
    od = Path(a.out_dir)
    od.mkdir(parents=True, exist_ok=True)
    lp = od / f'逻辑方案_{a.name}.json'
    lp.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    # 体检：GPU 按 T05 读回；底稿 B04 也按读回算一份，看出 GPU 变化是读回带来的还是编排带来的
    gpu, read_at = census_gpu()
    model = apply_census(gpu)
    ck = run_checks(out, cues)
    ck_base = run_checks(plan, copy.deepcopy(plan['cues']))
    ck['gpuModel'] = dict(source=str(CENSUS.relative_to(ROOT)), readAt=read_at, **model)
    ck['gpuBase'] = dict(file=out['base'], peak=ck_base['gpu']['peak'], peakAt=ck_base['gpu']['peakAt'], tiers={k: v['gpuPeakPerS'] for k, v in ck_base['tiers'].items()},
                         mobile={k: v['gpuPeakPerS'] for k, v in ck_base['b02']['mobileTiers'].items()})
    ck['b05'] = log
    rep = ovl.report(lp)
    ck['overlap'] = {k: v for k, v in rep.items() if k != 'pc'}
    ck['overlap']['pcList'] = rep['pc']
    rb = ovl.report(Path(a.base))
    ck['overlapBase'] = dict(file=out['base'], pcIncidents=rb['pcIncidents'], byKind=rb['byKind'],
                             mobile={k: dict(incidents=v['incidents'], totalGapS=v['totalGapS']) for k, v in rb['mobile'].items()})
    (od / f'体检_{a.name}.json').write_text(json.dumps(ck, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps(dict(revision=out['revision'], cues=len(cues), lowLayer=len(log['lowLayer']), labels=log['labels'],
                          mobileSplit=len(log['mobileSplit']), mobileStandinSwap=len(log['mobileStandinSwap']), mobileKept=len(log['mobileKept']),
                          mobileRuleViolations=len(log['mobileRule']['violations']), mobileSpecies=log['mobileRule']['eventsBySpecies'], mobileScale=log['mobileScale'],
                          tiers={k: v['events'] for k, v in ck['tiers'].items()}, mobile={k: v['events'] for k, v in ck['b02']['mobileTiers'].items()},
                          gpu=ck['gpu']['peak'], gpuB04SameModel=ck['gpuBase']['peak'], mobileGpu={k: v['gpuPeakPerS'] for k, v in ck['b02']['mobileTiers'].items()},
                          beatLock=ck['beatLock'], tierNesting=ck['tierNesting']['ok'],
                          overlap=dict(pc=ck['overlap']['pcIncidents'], mobile={k: v['incidents'] for k, v in ck['overlap']['mobile'].items()},
                                       mobileGapS={k: v['totalGapS'] for k, v in ck['overlap']['mobile'].items()}),
                          overlapBase=dict(pc=ck['overlapBase']['pcIncidents'], mobile={k: v['incidents'] for k, v in ck['overlapBase']['mobile'].items()})),
                     ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
