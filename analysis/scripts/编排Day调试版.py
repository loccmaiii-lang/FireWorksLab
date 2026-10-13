#!/usr/bin/env python3
"""Day 调试版：零点前 NPC 试放，约 30 s（跨年秀 22，用户 10-13 21:29「Day你就做一段30秒的就好了；另排一版NPC试放的，争取一版过，不要有太多重叠」）。
设定（用户 20:38）：0 点演出前 NPC 在调试演出效果，不用很正式；0 点前进地图的玩家都能看到这 30 s；都是夜晚。
做法：一发一发「试」——先中间、再两端、再左右一对看对称，中间穿插试扇、试小平台、试中号；最后试一小排、再在中间补一发。
  - 不剧透：不用金垂柳主角、大号整排、白墙、倒计时那套构图。
  - 少重叠：同一时刻天上最多 2–3 朵，相邻点的花不同时开；同一个点等上一朵灭了再放。
  - 可循环：第一发 0 s 起飞，最后一朵 26.7 s 灭，留 3 s 空（循环时接缝处 3 s 只有上升的尾缀）。
  - 只用 Night（16.0.25）里已有的花型 + 大小 + 高度版本，UE 不用新导资源；手游只用 P 点和白名单、M 只放偶数点。
输出 协作/编排B01/逻辑方案_Day.json、体检_Day.json。
用法：python3 -I analysis/scripts/编排Day调试版.py
"""
import importlib.util
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location('b01', ROOT / 'analysis/scripts/编排B01.py')
b = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(b)
b.HEIGHTS = 'v2'
_spec = importlib.util.spec_from_file_location('audit', ROOT / 'analysis/scripts/编排重叠体检.py')
A = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(A)
OUT = ROOT / '协作/编排B01'
DUR = 30.0
NIGHT = OUT / '逻辑方案_B03r2m.json'

# (开花 / 扇起飞时刻 s, 花型缩写, 花型 id（含大小版本）, 点, 高度 dz, 次序, 间隔 s, 档位, 说明)
SHOTS = [
    (2.95, 'SC', 'R03_SilverChry', ['P4'], 0.0, 'together', 0.0, 'all', '先试中间一发'),
    (4.8, 'SC', 'R03_SilverChry', ['P0'], 0.0, 'together', 0.0, 'all', '试左端'),
    (6.6, 'SC', 'R03_SilverChry', ['P8'], 0.0, 'together', 0.0, 'all', '试右端'),
    (8.0, 'R5', 'R03_Red5', ['B3'], 0.0, 'together', 0.0, 'all', '试一把红彗星扇'),
    (9.6, 'OG', 'R03_OrangeGlitter', ['P2', 'P6'], 10.0, 'together', 0.0, 'all', '左右各一，看对不对称'),
    (11.2, 'XS1A', None, ['F3'], 0.0, 'together', 0.0, 'all', '试小平台'),
    (12.8, 'GR', 'R03_GoldRayChry', ['P4'], 0.0, 'together', 0.0, 'all', '试一发中号'),
    (14.4, 'S5', 'R03_Silver5', ['B5'], 0.0, 'together', 0.0, 'all', '试银扇'),
    (15.8, 'CR', 'R03_Crackle', ['P1'], 0.0, 'together', 0.0, 'all', '试爆裂星（左）'),
    (17.2, 'CR', 'R03_Crackle', ['P7'], 0.0, 'together', 0.0, 'all', '再试右边'),
    (18.8, 'GS', 'R03_GoldSpark__K92', ['P0'], 40.0, 'together', 0.0, 'all', '试金锦菊'),
    (20.6, 'SC', 'R03_SilverChry', ['P2', 'P3', 'P4', 'P5', 'P6'], 0.0, 'out', 0.15, 'trim', '试一小排（中间往两边）'),
    (22.6, 'XV4', None, ['F0', 'F6'], 0.0, 'together', 0.0, 'all', '试小平台两边'),
    (25.2, 'CR', 'R03_Crackle', ['P4'], 0.0, 'together', 0.0, 'all', '中间补一发，收'),
]


def build():
    S = b.Show(1)
    S.section('D_S0', 'NPC 试放', 0, 1, 'SC', 'GR', 'CR', '零点前 NPC 在调试：一发一发试，先中间、再两端、左右一对；穿插试扇、试小平台、试中号；最后试一小排，中间补一发。不放音乐，可循环。')
    S.sections[0].update(start=0.0, end=DUR)
    for H, sp, tid, pts, dz, order, gap, tier, label in SHOTS:
        c = S.cue(sp, pts, H, order, gap, {p: dz for p in pts}, tier=tier, label=label, keep_all=(tier == 'all'), wave='试放')
        if tid and tid != c['templateId']:                          # 大小版本（__K92 等）：同一花型，只换球花大小
            c['templateId'] = tid
            c['sizeK'] = int(tid.split('__K')[1]) / 100 if '__K' in tid else 1.0
        c['id'] = c['id'].replace('B01_C', 'DAY_C')
        size = c['size']
        okm = size in 'SML' and c['group'] == 'P' and sp in b.MOBILE_OK and (size == 'S' or all(int(p[1:]) % 2 == 0 for p in c['points']))
        c['mobile'] = bool(okm)
    return S


def checks(S, night):
    res = {}
    # 档位 / 平台计数
    cnt = lambda plat, tier: sum(1 for c in S.cues if (c['mobile'] if plat == 'mobile' else c.get('mobile') != 'only')
                                 for e in c['events'] if tier == 'high' or e['point'] in c['profiles'][tier])
    res['tiers'] = {t: dict(events=cnt('pc', t)) for t in ('high', 'medium', 'low')}
    mob = {}
    for t in ('high', 'medium', 'low'):
        by = defaultdict(int)
        for c in S.cues:
            if c['mobile']:
                for e in c['events']:
                    if t == 'high' or e['point'] in c['profiles'][t]:
                        by[b.SPECIES[c['sp']][1]] += 1
        mob[t] = dict(events=cnt('mobile', t), bySpecies=dict(by))
    res['b02'] = dict(mobileTiers=mob)
    # GPU
    gp = b.gpu_points(S, 'high')
    peak, at, _ = b.window_max(gp)
    res['gpu'] = dict(peak=peak, peakAt=round(at, 2), soft=b.GPU_BUDGET)
    # 重叠 / 断档（和 Night 同一把尺：编排重叠体检.py）
    ov = {}
    for plat in ('pc', 'mobile'):
        for t in ('high', 'medium', 'low'):
            fl = A.flowers(S.cues, t, plat)
            inc = A.incidents(fl)
            ov[f'{plat}-{t}'] = dict(incidents=[dict(t=round(x['t'], 2), until=round(x['until'], 2), kind=x.get('kind')) for x in inc],
                                     gaps=[(round(a, 2), round(z, 2)) for a, z in A.gaps(fl, t_to=DUR)])
    res['overlap'] = ov
    # 同屏朵数（球花，开花到熄灭）
    balls = sorted((e['burst'], e['end']) for c in S.cues if c['size'] in 'SML' for e in c['events'])
    res['maxAliveBalls'] = max(sum(1 for a, z in balls if a <= t < z) for t in [x / 10 for x in range(int(DUR * 10))])
    # 时长 / 尾巴
    ends = [e['end'] for c in S.cues for e in c['events']]
    res['lastEndS'] = round(max(ends), 2)
    res['quietTailS'] = round(DUR - max(ends), 2)
    # 子模板版本都在 Night 里（花型 id + 高度）
    have = {(c['templateId'], e['dz']) for c in night['cues'] for e in c['events']}
    res['newVersions'] = sorted({f"{c['templateId']}@dz{e['dz']:g}" for c in S.cues for e in c['events'] if (c['templateId'], e['dz']) not in have})
    # 手游规则
    res['mobileRuleBreaks'] = [c['id'] for c in S.cues if c['mobile'] and (c['group'] != 'P' or c['sp'] not in b.MOBILE_OK or (c['size'] != 'S' and any(int(p[1:]) % 2 for p in c['points'])))]
    res['noSpoiler'] = [c['id'] for c in S.cues if c['sp'] in ('GK', 'GKH') or c['size'] == 'L']
    # 给动画用的占位（Night 体检里有的键）
    res['aliveBySpecies'], res['baseFans'], res['fanSummary'] = {}, dict(groups=0, skipped=[]), dict(aliveGpuPeak=peak)
    return res


def main():
    S = build()
    night = json.loads(NIGHT.read_text(encoding='utf-8'))
    ck = checks(S, night)
    logic = dict(format='df.nagaoka-logic/1', revision='Day_npc_test_fire_v1', rhythm=None, status='draft', generator='analysis/scripts/编排Day调试版.py',
                 density=1, musicOffsetS=0.0, barS=None, bar0S=None, duration=DUR, sections=S.sections, musicMarkers=[], cues=S.cues,
                 noMusic=True, loop=True, note='零点前 NPC 试放（Day 导演）；不放音乐；可循环', base=str(NIGHT.relative_to(ROOT)))
    (OUT / '逻辑方案_Day.json').write_text(json.dumps(logic, ensure_ascii=False, indent=1), encoding='utf-8')
    (OUT / '体检_Day.json').write_text(json.dumps(ck, ensure_ascii=False, indent=1), encoding='utf-8')
    ov = {k: (len(v['incidents']), v['gaps']) for k, v in ck['overlap'].items()}
    print(json.dumps(dict(cues=len(S.cues), pc={t: v['events'] for t, v in ck['tiers'].items()}, mobile={t: v['events'] for t, v in ck['b02']['mobileTiers'].items()},
                          gpu=ck['gpu']['peak'], maxAliveBalls=ck['maxAliveBalls'], lastEnd=ck['lastEndS'], tail=ck['quietTailS'], newVersions=ck['newVersions'],
                          mobileRuleBreaks=ck['mobileRuleBreaks'], noSpoiler=ck['noSpoiler'], overlap=ov), ensure_ascii=False))


if __name__ == '__main__':
    main()
