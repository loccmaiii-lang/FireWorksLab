#!/usr/bin/env python3
"""Day 调试版：零点前 NPC 试放，约 30 s（跨年秀 22）。
用户：
  20:38「设定是0点演出前Npc在调试演出效果，不用很正式，这段调试效果约为30s，0点演出前，玩家进入地图都能看到这30s的演示，都是夜晚」
  21:29「Day你就做一段30秒的就好了；另排一版NPC试放的，争取一版过，不要有太多重叠」
  22:07「Day不放音乐，但会有几段VO，前5秒是闲聊，所以前面5秒需要是空白的，节奏我的想法是先整齐，然后变乱？因为最后会给一个VO（大概说：还需要调整）」
v2（22:07）：
  - 0–5 s 全空：天上什么都没有，第一发 5.0 s 才起飞（尾缀也算看得见）。
  - 整齐（5–15 s）：同一种小银菊、同一高度，P0 → P2 → P4 → P6 → P8 每 1.2 s 一发；然后 P1+P7 一对 + PC 两端银扇同时出。
  - 变乱（15–24 s）：乱在次序和时间，不在多——左右一对差半拍、扇一边先出另一边晚 1 s、突然冒一发中号、相邻两点连发、
    一小排中间断一个点、最后一发晚了；高度也不再一样。天上同时最多 6 朵、分散在全宽上，重叠体检要 0。
  - 收尾：最后一发 23.6 s，之后不再开花，给最后那句 VO（「还需要调整」）留空；25 s 后只剩余烬。
  - 只用 Night（16.0.26）里已有的花型 + 大小 + 高度版本；手游只用 P 点和白名单、中号只放偶数点；不放音乐。
v1（21:29，一发一发「试」、没有整齐 → 乱）见 git 历史。
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

BLANK = 5.0          # 前 5 s 闲聊 VO：天上全空
TURN = 15.3          # 整齐 → 变乱
LAST_VO_FROM = 24.5  # 推断：最后一句 VO 大约在这之后（没拿到 Day 的 VO 音频，按「最后」放在尾巴上）
# (开花 / 扇起飞时刻 s, 花型缩写, 花型 id（含大小版本）, 点, 高度 dz, 段, 说明)
SHOTS = [
    # —— 整齐：同花、同高、等间隔、从左到右 ——
    (7.95, 'SC', 'R03_SilverChry', ['P0'], 0.0, 0, '整齐 · 左到右 1'),
    (9.15, 'SC', 'R03_SilverChry', ['P2'], 0.0, 0, '整齐 · 左到右 2'),
    (10.35, 'SC', 'R03_SilverChry', ['P4'], 0.0, 0, '整齐 · 左到右 3'),
    (11.55, 'SC', 'R03_SilverChry', ['P6'], 0.0, 0, '整齐 · 左到右 4'),
    (12.75, 'SC', 'R03_SilverChry', ['P8'], 0.0, 0, '整齐 · 左到右 5'),
    (14.2, 'OG', 'R03_OrangeGlitter', ['P1', 'P7'], 10.0, 0, '整齐 · 两边一对'),
    (14.2, 'S5', 'R03_Silver5', ['B0', 'B7'], 0.0, 0, '整齐 · 两端银扇同时'),
    # —— 变乱：次序、时间、大小、高度都不齐了 ——
    (15.5, 'OG', 'R03_OrangeGlitter', ['P5'], 20.0, 1, '乱 · 一对先出了右边'),
    (16.0, 'OG', 'R03_OrangeGlitter', ['P3'], 0.0, 1, '乱 · 左边晚了半拍、还低'),
    (16.9, 'R5', 'R03_Red5', ['B6'], 0.0, 1, '乱 · 扇只出了一边'),
    (17.6, 'CR', 'R03_Crackle', ['P8'], 30.0, 1, '乱 · 冒出一发爆裂星'),
    (18.0, 'R5', 'R03_Red5', ['B1'], 0.0, 1, '乱 · 另一边的扇晚了 1 s'),
    (18.6, 'GR', 'R03_GoldRayChry', ['P0'], 0.0, 1, '乱 · 突然一发中号'),
    (19.4, 'SC', 'R03_SilverChry__K92', ['P6'], 20.0, 1, '乱 · 连发（高）'),
    (19.7, 'SC', 'R03_SilverChry__K92', ['P7'], 0.0, 1, '乱 · 连发（低）'),
    (20.5, 'CR', 'R03_Crackle', ['P4'], 10.0, 1, '乱 · 中间一声'),
    (21.4, 'SC', 'R03_SilverChry', ['P2'], 0.0, 1, '乱 · 一小排…'),
    (21.55, 'SC', 'R03_SilverChry', ['P3'], 10.0, 1, '乱 · …断了一个点…'),
    (22.2, 'XV4', None, ['F0', 'F6'], 0.0, 1, '乱 · 小平台两边'),
    (22.6, 'SC', 'R03_SilverChry', ['P5'], 0.0, 1, '乱 · …才接上'),
    (23.6, 'CR', 'R03_Crackle', ['P8'], 0.0, 1, '乱 · 最后一发晚了'),
]


def build():
    S = b.Show(1)
    S.section('D_S0', '整齐', 0, 1, 'SC', 'OG', 'S5', f'0–{BLANK:.0f} s 闲聊 VO，天上全空；{BLANK:.0f} s 起飞，小银菊同高、每 1.2 s 一发从左到右，再一对 + 两端银扇同时出')
    S.sections[0].update(start=0.0, end=TURN)
    S.section('D_S1', '变乱', 0, 1, 'OG', 'SC', 'CR', f'次序、时间、大小、高度都乱了，但不挤：一对差半拍、扇一边晚 1 s、突然一发中号、连发、一小排断点、最后一发晚了；{LAST_VO_FROM:.1f} s 后不再开花，给最后那句 VO 留空')
    S.sections[1].update(start=TURN, end=DUR)
    for H, sp, tid, pts, dz, seg, label in SHOTS:
        S.cur = S.sections[seg]
        c = S.cue(sp, pts, H, 'together', 0.0, {p: dz for p in pts}, label=label, keep_all=True, wave='试放·' + S.cur['name'])
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
    # 前 5 s 全空、整齐 / 变乱的间隔、给最后 VO 的空
    launches = [e['launch'] for c in S.cues for e in c['events']]
    hits = sorted({round(e['burst'] if c['size'] in 'SML' else e['launch'], 2) for c in S.cues for e in c['events']})
    res['firstLaunchS'] = round(min(launches), 2)
    res['lastHitS'] = hits[-1]
    seg = lambda a, z: [round(y - x, 2) for x, y in zip([h for h in hits if a <= h < z], [h for h in hits if a <= h < z][1:])]
    res['intervals'] = dict(tidy=seg(0, TURN), messy=seg(TURN, DUR))
    for plat in ('pc', 'mobile'):
        for t in ('high', 'medium', 'low'):
            fl = A.flowers(S.cues, t, plat)
            res['overlap'][f'{plat}-{t}']['gaps'] = [(round(a, 2), round(z, 2)) for a, z in A.gaps(fl, t_from=min(f['burst'] for f in fl), t_to=res['lastHitS'])]
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
    logic = dict(format='df.nagaoka-logic/1', revision='Day_npc_test_fire_v2_tidy_then_messy', rhythm=None, status='draft', generator='analysis/scripts/编排Day调试版.py',
                 density=1, musicOffsetS=0.0, barS=None, bar0S=None, duration=DUR, sections=S.sections, musicMarkers=[], cues=S.cues,
                 noMusic=True, loop=True, note='零点前 NPC 试放（Day 导演）；不放音乐，有 VO：前 5 s 闲聊（全空），最后一句「还需要调整」前留空；先整齐后变乱；可循环', base=str(NIGHT.relative_to(ROOT)))
    (OUT / '逻辑方案_Day.json').write_text(json.dumps(logic, ensure_ascii=False, indent=1), encoding='utf-8')
    (OUT / '体检_Day.json').write_text(json.dumps(ck, ensure_ascii=False, indent=1), encoding='utf-8')
    ov = {k: (len(v['incidents']), v['gaps']) for k, v in ck['overlap'].items()}
    print(json.dumps(dict(firstLaunch=ck['firstLaunchS'], lastHit=ck['lastHitS'], intervals=ck['intervals'], cues=len(S.cues), pc={t: v['events'] for t, v in ck['tiers'].items()}, mobile={t: v['events'] for t, v in ck['b02']['mobileTiers'].items()},
                          gpu=ck['gpu']['peak'], maxAliveBalls=ck['maxAliveBalls'], lastEnd=ck['lastEndS'], tail=ck['quietTailS'], newVersions=ck['newVersions'],
                          mobileRuleBreaks=ck['mobileRuleBreaks'], noSpoiler=ck['noSpoiler'], overlap=ov), ensure_ascii=False))


if __name__ == '__main__':
    main()
