#!/usr/bin/env python3
"""B04：B03 修订2 + 新尾缀 + 前台小花 + Comet / Silver 3.0（跨年秀 22，用户 10-14 01:27「先按照这个理解去做，我改完了资源上传和你同步」）。

底稿 = B03 修订2（逻辑方案_B03r2m.json，用户 10-13 22:55 认）。只做下面三件事，开花时刻、点位、高差 dz、大小、档位一律不动：
  ① 坝顶低层（B 点上的小号球花：低位 8 点、叠层二排、A/B 间隔）换尾缀 Tiny：开花 150 → 80 m（+ 原 dz），升空 2.9544 → 1.9171 s；
     开花时刻不变（起飞 = 开花 − 1.9171，取 0.1 s 网格，同 B01 的取法），宪章 §3「S +150（低 +80）」。
  ② 小平台小花束尾 → 「前台小花 + XS」（看板 i12）：同点位、第一朵花开花时刻不变；变体一一对应（协作/编排B01/前台小花.json）。
     小平台片段上手游（执行方案 2026-10-12 §2.2「手机只放有手游版的」：小银菊 / 金锦菊 / 爆裂星都在 7 种白名单里，XS 有 _M）；
     --platform-pc-only 可以退回只上 PC。
  ③ Comet / Silver 3.0 原位替换红彗星扇、银扇（ResourceFX 行名不变，编排不改调用）：GPU 按 0 算；体检另算一份「3.0 还没导入」的旧扇 GPU。
XS / Tiny 的 ResourceFX 行名是占位（协作/编排B01/新尾缀.json），用户导入、加行后只改那一处重编。

用法：python3 -I analysis/scripts/编排B04.py [--base 逻辑方案_B03r2m.json] [--name B04] [--out-dir 协作/编排B01] [--platform-pc-only]
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
_spec2 = importlib.util.spec_from_file_location('ovl', ROOT / 'analysis/scripts/编排重叠体检.py')
ovl = importlib.util.module_from_spec(_spec2)
_spec2.loader.exec_module(ovl)
q1 = b.q1
TINY, XS = b.NEWT['trails']['Tiny'], b.NEWT['trails']['XS']
FROM = {x['from']: x for x in b.FRONTF['flowers']}
FAN_REACH = {'R': b.BEAM_EST['beamReachM']['P_EFX_FireWorks_FanComet_01'], 'S': b.BEAM_EST['beamReachM']['P_EFX_FireWorks_FanSilver_01']}


def low_layer(cues):
    """① B 点小号球花 → Tiny（开花时刻不变）"""
    out = []
    for c in cues:
        if c['size'] != 'S' or c['group'] != 'B' or c.get('mobile') == 'only':
            continue
        life = b.life_of(c['sp'])
        c['trail'] = 'Tiny'
        moved = []
        for e in c['events']:
            H = e.get('H', e['burst'])
            old = e['launch']
            e['launch'] = q1(H - TINY['riseS'])
            e['burst'] = round(e['launch'] + TINY['riseS'], 6)
            e['end'] = round(e['burst'] + life, 6)
            moved.append(round(e['launch'] - old, 2))
        out.append(dict(cue=c['id'], label=c['label'], wave=c['wave'], t=round(min(e['burst'] for e in c['events']), 2), points=len(c['events']),
                        launchShiftS=sorted(set(moved)), dz=sorted({e['dz'] for e in c['events']})))
    return out


def platform(cues, mobile=True):
    """② 小花束尾 → 前台小花 + XS（同点位、第一朵花开花时刻不变）"""
    out = []
    for c in cues:
        if c['size'] != 'X':
            continue
        new = FROM[c['sp']]
        old_zh, tpl = b.SPECIES[c['sp']][1], b.TPL[new['id']]
        old_sp = c['sp']
        c.update(sp=new['code'], templateId=new['id'], label=new['zh'], name=c['name'].replace(old_zh, new['zh']), wave='小平台·前台小花')
        c['mobile'] = True if mobile else False
        for e in c['events']:
            H = e.get('H', e['burst'])
            e['launch'] = q1(H - tpl['rise'])
            e['burst'] = round(e['launch'] + tpl['rise'], 6)
            e['end'] = round(e['launch'] + tpl['recipeDuration'], 6)
        out.append(dict(cue=c['id'], fromSp=old_sp, toSp=new['code'], t=round(min(e['burst'] for e in c['events']), 2), points=[e['point'] for e in c['events']],
                        medium=c['profiles']['medium'], low=c['profiles']['low'], mobile=c['mobile']))
    return out


def fan_under_low(cues):
    """Tiny 低层花亮着时，同一 B 点有扇在出束（扇顶 65 / 75 m 会伸进 80 m 花的下半）：列出来，不自动改"""
    fans = [(c, e) for c in cues if c['size'] == 'F' for e in c['events']]
    out = []
    for c in cues:
        if c.get('trail') != 'Tiny':
            continue
        d = (b.TPL[c['templateId'].split('__K')[0]]['diameter'] or 90) * c.get('sizeK', 1.0)
        for e in c['events']:
            lit0, lit1 = e['burst'] + ovl.LIT0, e['burst'] + ovl.LIT1 * (e['end'] - e['burst'])
            bottom = TINY['burstM'] + e['dz'] - d / 2
            for f, fe in fans:
                if fe['point'] != e['point']:
                    continue
                reach = FAN_REACH['R' if f['sp'].startswith('R') else 'S']
                f0, f1 = fe['launch'], fe['launch'] + b.life_of(f['sp'])
                if min(lit1, f1) - max(lit0, f0) > 0.3 and reach > bottom:
                    out.append(dict(t=round(max(lit0, f0), 2), point=e['point'], flower=c['id'], fan=f['id'], fanSp=f['sp'], overlapS=round(min(lit1, f1) - max(lit0, f0), 2),
                                    intoFlowerM=round(reach - bottom, 1)))
    return sorted(out, key=lambda x: x['t'])


def mobile_audit(cues):
    """③ 标手游：上手机的片段只用 7 种白名单 + 有 _M 的尾缀"""
    ok_sp = set(b.MOBILE_OK) | {x['code'] for x in b.FRONTF['flowers'] if all(f['src'] in b.MOBILE_OK for f in x['flowers'])}
    bad, by = [], defaultdict(int)
    for c in cues:
        if c.get('mobile') is False:
            continue
        if c['sp'] not in ok_sp:
            bad.append(dict(cue=c['id'], sp=c['sp'], name=b.SPECIES[c['sp']][1]))
        by[b.SPECIES[c['sp']][1]] += len(c['events'])
    trails = sorted({'XS' if c['size'] == 'X' else c.get('trail') or {'S': 'S', 'M': 'M', 'L': 'L'}[c['size']] for c in cues if c.get('mobile') is not False})
    return dict(whitelist=sorted(ok_sp), notWhitelisted=bad, eventsBySpecies=dict(sorted(by.items(), key=lambda kv: -kv[1])), trailsNeedingM=trails,
                cues=dict(shared=sum(1 for c in cues if c.get('mobile') is True), pcOnly=sum(1 for c in cues if c.get('mobile') is False),
                          mobileOnly=sum(1 for c in cues if c.get('mobile') == 'only')))


def run_checks(out, cues):
    b.BAR0, b.OFFSET = out['bar0S'], out['musicOffsetS']
    b.QUIET = [(b.T(k), b.T(k + 1) - 0.1) for k in (41, 65, 96)]
    S = b.Show(2)
    S.cues, S.sections = cues, out['sections']
    S.b02 = dict(split=None, beamFlowerCues=sum(1 for c in cues if c['size'] == 'X'))
    S.baseGroups = sum(1 for c in cues if c.get('wave') == '托底扇')
    return S, b.checks(S)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default=str(ROOT / '协作/编排B01/逻辑方案_B03r2m.json'))
    ap.add_argument('--name', default='B04')
    ap.add_argument('--out-dir', default=str(ROOT / '协作/编排B01'))
    ap.add_argument('--platform-pc-only', action='store_true', help='小平台前台小花只上 PC（默认也上手游）')
    a = ap.parse_args()
    plan = json.loads(Path(a.base).read_text(encoding='utf-8'))
    cues = copy.deepcopy(plan['cues'])
    log = dict(lowLayerTiny=low_layer(cues), platform=platform(cues, not a.platform_pc_only))
    cues.sort(key=lambda c: (min(e['launch'] for e in c['events']), c['id']))
    log['mobile'] = mobile_audit(cues)
    log['fanUnderLowLayer'] = fan_under_low(cues)
    log['placeholders'] = {k: dict(resourceId=v['resourceId'], confirmed=v['confirmed']) for k, v in b.NEWT['trails'].items()}
    base_rel = Path(a.base).resolve()
    out = dict(plan, revision=f"{a.name}_tiny_lowlayer_frontflowers_xs_fans30_from_{plan['revision']}", cues=cues, b04=log,
               base=str(base_rel.relative_to(ROOT)) if base_rel.is_relative_to(ROOT) else base_rel.name)
    od = Path(a.out_dir)
    od.mkdir(parents=True, exist_ok=True)
    lp = od / f'逻辑方案_{a.name}.json'
    lp.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')

    # 体检：B01 的 checks（PC / 手机三档、GPU、对拍、嵌套）；GPU 先按 3.0（扇 0）算，再按旧扇算一份
    fan_gpu = dict(b.BEAM_GPU)
    b.BEAM_GPU = {'R': 0, 'S': 0}
    S, ck = run_checks(out, cues)
    b.BEAM_GPU = fan_gpu
    _, ck_old = run_checks(out, cues)
    ck['gpuBefore30'] = dict(note='Comet / Silver 3.0 还没在 UE 里换掉旧扇时（红彗星 1 / 束、银扇 3 / 束）', peak=ck_old['gpu']['peak'], peakAt=ck_old['gpu']['peakAt'],
                             softOver=ck_old['gpu']['softOver'], hardOver=ck_old['gpu']['hardOver'], tiers={k: v['gpuPeakPerS'] for k, v in ck_old['tiers'].items()})
    ck['b04'] = log
    # 重叠体检（同一把尺：PC / 手游六档），和底稿比
    ck['overlap'] = {k: v for k, v in ovl.report(lp).items() if k != 'pc'}
    ck['overlap']['pcList'] = ovl.report(lp)['pc']
    base_ovl = ovl.report(Path(a.base))
    ck['overlapBase'] = dict(file=base_ovl['file'], pcIncidents=base_ovl['pcIncidents'], byKind=base_ovl['byKind'],
                             mobile={k: dict(incidents=v['incidents'], totalGapS=v['totalGapS']) for k, v in base_ovl['mobile'].items()})
    (od / f'体检_{a.name}.json').write_text(json.dumps(ck, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps(dict(revision=out['revision'], cues=len(cues), tiny=dict(cues=len(log['lowLayerTiny']), events=sum(x['points'] for x in log['lowLayerTiny'])),
                          platform=dict(cues=len(log['platform']), events=sum(len(x['points']) for x in log['platform'])),
                          tiers={k: v['events'] for k, v in ck['tiers'].items()}, gpu30=ck['gpu']['peak'], gpuBefore30=ck['gpuBefore30']['peak'],
                          beatLock=ck['beatLock'], tierNesting=ck['tierNesting']['ok'], mobile={k: v['events'] for k, v in ck['b02']['mobileTiers'].items()},
                          overlap=dict(pc=ck['overlap']['pcIncidents'], byKind=ck['overlap']['byKind'], mobile={k: v['incidents'] for k, v in ck['overlap']['mobile'].items()},
                                       mobileGapS={k: v['totalGapS'] for k, v in ck['overlap']['mobile'].items()}),
                          overlapBase=dict(pc=ck['overlapBase']['pcIncidents'], byKind=ck['overlapBase']['byKind']),
                          fanUnderLow=len(log['fanUnderLowLayer']), mobileBad=log['mobile']['notWhitelisted']), ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
