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
v3（22:24「从5~35秒你就做满，后面7秒不要空，整齐阶段可以留一个高光时刻」「就播放一次，入局三分钟会播放一次」）：
  - 只放一次（进图 3 分钟触发），不考虑循环接缝；5–35 s 一直有东西在天上（尾缀也算），尾巴不再留空。
  - 整齐（5–22 s）：两端银扇往外展开 → 银菊左到右（偶数点）→ 橙辉星右到左（奇数点）→ 停一口气 → 高光「试一次齐放」：
    9 点小银菊从中间往外 + 4 把银扇 + 小平台三朵一齐出。
  - 变乱（22–35 s）：先只出低处的扇和小平台（高光还没灭），26 s 起球花乱：一对差半拍、突然一发中号、连发、断点、扫错方向，
    一直乱到 35 s，最后一发 34.9 s。
v2（22:07，前 5 s 空、先整齐后变乱、尾巴留空给 VO）、v1（21:29，一发一发「试」）见 git 历史。
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
DUR = 39.0          # 烟花 5–35 s，最后几朵余烬到约 38.8 s
NIGHT = OUT / '逻辑方案_B03r2m.json'

BLANK = 5.0          # 前 5 s 闲聊 VO：天上全空
TURN = 22.0          # 整齐 → 变乱
FILL_TO = 35.0       # 用户 22:24：5–35 s 做满
# (开花 / 扇起飞时刻 s, 花型缩写, 花型 id（含大小版本）, 点, 高度 dz, 段, 说明[, 次序, 间隔, 档位])
SHOTS = [
    # —— 整齐：对称、等间隔、同花同高 ——
    (5.0, 'S5', 'R03_Silver5', ['B3', 'B4'], 0.0, 0, '整齐 · 中间两把银扇'),
    (6.2, 'S5', 'R03_Silver5', ['B1', 'B6'], 0.0, 0, '整齐 · 银扇往外'),
    (7.4, 'S5', 'R03_Silver5', ['B0', 'B7'], 0.0, 0, '整齐 · 银扇到两端'),
    (7.95, 'SC', 'R03_SilverChry', ['P0'], 0.0, 0, '整齐 · 银菊左到右 1'),
    (9.15, 'SC', 'R03_SilverChry', ['P2'], 0.0, 0, '整齐 · 银菊左到右 2'),
    (10.35, 'SC', 'R03_SilverChry', ['P4'], 0.0, 0, '整齐 · 银菊左到右 3'),
    (11.55, 'SC', 'R03_SilverChry', ['P6'], 0.0, 0, '整齐 · 银菊左到右 4'),
    (12.75, 'SC', 'R03_SilverChry', ['P8'], 0.0, 0, '整齐 · 银菊左到右 5'),
    (13.95, 'OG', 'R03_OrangeGlitter', ['P7'], 10.0, 0, '整齐 · 橙辉星右到左 1'),
    (15.15, 'OG', 'R03_OrangeGlitter', ['P5'], 10.0, 0, '整齐 · 橙辉星右到左 2'),
    (16.35, 'OG', 'R03_OrangeGlitter', ['P3'], 10.0, 0, '整齐 · 橙辉星右到左 3'),
    (17.55, 'OG', 'R03_OrangeGlitter', ['P1'], 10.0, 0, '整齐 · 橙辉星右到左 4'),
    (19.5, 'S5', 'R03_Silver5', ['B0', 'B7'], 0.0, 0, '整齐 · 两端银扇（预备）'),
    # 高光：试一次齐放
    (21.0, 'SC', 'R03_SilverChry__K92', [f'P{i}' for i in range(9)], 20.0, 0, '高光 · 九点齐放（中间往外）', 'out', 0.1, 'trim'),
    (21.0, 'S5', 'R03_Silver5', ['B1', 'B3', 'B4', 'B6'], 0.0, 0, '高光 · 四把银扇', 'together', 0.0, 'trim'),
    (21.0, 'XS1A', None, ['F1', 'F3', 'F5'], 0.0, 0, '高光 · 小平台三朵', 'together', 0.0, 'trim'),
    # —— 变乱：先低处（高光还亮着），再球花，一直乱到 35 s ——
    (22.4, 'R5', 'R03_Red5', ['B6'], 0.0, 1, '乱 · 扇只出了一边'),
    (23.5, 'R5', 'R03_Red5', ['B1'], 0.0, 1, '乱 · 另一边晚了 1 s'),
    (24.3, 'XV4', None, ['F2'], 0.0, 1, '乱 · 小平台乱入'),
    (25.1, 'S5', 'R03_Silver5', ['B5'], 0.0, 1, '乱 · 银扇单出一把'),
    (26.1, 'OG', 'R03_OrangeGlitter', ['P5'], 20.0, 1, '乱 · 一对先出了右边'),
    (26.6, 'OG', 'R03_OrangeGlitter', ['P3'], 0.0, 1, '乱 · 左边晚了半拍、还低'),
    (27.3, 'CR', 'R03_Crackle', ['P8'], 30.0, 1, '乱 · 冒出一发爆裂星'),
    (27.9, 'GR', 'R03_GoldRayChry', ['P0'], 0.0, 1, '乱 · 突然一发中号'),
    (28.6, 'SC', 'R03_SilverChry__K92', ['P6'], 20.0, 1, '乱 · 连发（高）'),
    (28.9, 'SC', 'R03_SilverChry__K92', ['P7'], 0.0, 1, '乱 · 连发（低）'),
    (29.6, 'CR', 'R03_Crackle', ['P4'], 10.0, 1, '乱 · 中间一声'),
    (30.4, 'SC', 'R03_SilverChry', ['P2'], 0.0, 1, '乱 · 一小排…'),
    (30.55, 'SC', 'R03_SilverChry', ['P3'], 10.0, 1, '乱 · …断了一个点…'),
    (31.2, 'XV4', None, ['F0', 'F6'], 0.0, 1, '乱 · 小平台两边'),
    (31.6, 'SC', 'R03_SilverChry', ['P5'], 0.0, 1, '乱 · …才接上'),
    (32.3, 'R9R', 'R03_Red9R', ['B4'], 0.0, 1, '乱 · 扇扫错了方向'),
    (32.8, 'OG', 'R03_OrangeGlitter', ['P8'], 0.0, 1, '乱 · 右端补一发'),
    (33.5, 'CR', 'R03_Crackle', ['P1'], 20.0, 1, '乱 · 左边又一声'),
    (34.2, 'SC', 'R03_SilverChry__K108', ['P4'], 30.0, 1, '乱 · 中间一发偏大偏高'),
    (34.9, 'CR', 'R03_Crackle', ['P7'], 10.0, 1, '乱 · 最后一发晚了'),
]


def build():
    S = b.Show(1)
    S.section('D_S0', '整齐', 0, 1, 'S5', 'SC', 'OG', f'0–{BLANK:.0f} s 闲聊 VO，天上全空；{BLANK:.0f} s 起：银扇从中间往外 → 银菊左到右 → 橙辉星右到左 → 21 s 高光「试一次齐放」（九点小银菊 + 四把银扇 + 小平台三朵）')
    S.sections[0].update(start=0.0, end=TURN)
    S.section('D_S1', '变乱', 0, 1, 'OG', 'SC', 'CR', '次序、时间、大小、高度都乱了，但不挤：先低处的扇和小平台（高光还亮着），26 s 起球花乱——一对差半拍、突然一发中号、连发、一小排断点、扫错方向——一直乱到 35 s')
    S.sections[1].update(start=TURN, end=DUR)
    for shot in SHOTS:
        H, sp, tid, pts, dz, seg, label = shot[:7]
        order, gap, tier = (shot[7:] + ('together', 0.0, 'all')[len(shot) - 7:]) if len(shot) > 7 else ('together', 0.0, 'all')
        S.cur = S.sections[seg]
        c = S.cue(sp, pts, H, order, gap, {p: dz for p in pts}, label=label, tier=tier, keep_all=(tier == 'all'), wave='试放·' + S.cur['name'])
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
    # 做满：5–35 s 天上一直有东西（尾缀也算，launch → end），PC / 手游各算
    def holes(plat):
        iv = sorted((e['launch'], e['end']) for c in S.cues if (c['mobile'] if plat == 'mobile' else c.get('mobile') != 'only') for e in c['events'])
        out, cur = [], BLANK
        for a, z in iv:
            if a > cur + 0.05 and a < FILL_TO:
                out.append((round(cur, 2), round(min(a, FILL_TO), 2)))
            cur = max(cur, z)
        if cur < FILL_TO:
            out.append((round(cur, 2), FILL_TO))
        return out
    res['fillHoles'] = {plat: holes(plat) for plat in ('pc', 'mobile')}
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
    logic = dict(format='df.nagaoka-logic/1', revision='Day_npc_test_fire_v3_fill5to35_highlight_once', rhythm=None, status='draft', generator='analysis/scripts/编排Day调试版.py',
                 density=1, musicOffsetS=0.0, barS=None, bar0S=None, duration=DUR, sections=S.sections, musicMarkers=[], cues=S.cues,
                 noMusic=True, loop=False, note='零点前 NPC 试放（Day 导演）；进图 3 分钟放一次、不循环；不放音乐，有 VO：前 5 s 闲聊（全空）；5–35 s 做满：先整齐（中间一次高光），后变乱到底', base=str(NIGHT.relative_to(ROOT)))
    (OUT / '逻辑方案_Day.json').write_text(json.dumps(logic, ensure_ascii=False, indent=1), encoding='utf-8')
    (OUT / '体检_Day.json').write_text(json.dumps(ck, ensure_ascii=False, indent=1), encoding='utf-8')
    ov = {k: (len(v['incidents']), v['gaps']) for k, v in ck['overlap'].items()}
    print(json.dumps(dict(fillHoles=ck['fillHoles'], firstLaunch=ck['firstLaunchS'], lastHit=ck['lastHitS'], intervals=ck['intervals'], cues=len(S.cues), pc={t: v['events'] for t, v in ck['tiers'].items()}, mobile={t: v['events'] for t, v in ck['b02']['mobileTiers'].items()},
                          gpu=ck['gpu']['peak'], maxAliveBalls=ck['maxAliveBalls'], lastEnd=ck['lastEndS'], tail=ck['quietTailS'], newVersions=ck['newVersions'],
                          mobileRuleBreaks=ck['mobileRuleBreaks'], noSpoiler=ck['noSpoiler'], overlap=ov), ensure_ascii=False))


if __name__ == '__main__':
    main()
