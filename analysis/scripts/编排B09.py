#!/usr/bin/env python3
"""编排 B09（跨年秀（22），2026-10-17）：B08 修订7 → 主角金垂柳抬到 400 m、左右疏开、下面补大号花、手游换回金垂柳、名字按 ResourceFX 更正。

用户 10-17 00:47：
- 「我重新用mesh生成了一份新的金垂柳，现在很大，停留时间也变长了，大约为14秒……位置有点太挤了，我希望可以变高点，用之前400m的高度？
   同时左右位置可以疏一些？……抬高之后，可以在下面再补一个大号的？」
- 「手游的金垂柳我也替换上去了，你之前的占位可以换回手游的金垂柳ID了？」
- 「小号这几个前缀带Little的都是小平台的，小型才是90m的小型烟花……看看其它有没有引用错误的吗？」

只在 B08 修订7 的最终逻辑方案（协作/编排B01/逻辑方案_B08.json）上改，别的片段一个不动（扇、低配限峰、小平台、收尾照修订7）：
① 主角两处（108 s P4 一朵、171 s 三朵）：
   - 挂主角尾缀 RiseTrail_Hero（编译带 --hero-trail=P_EFX_FireWorks_RiseTrail_Hero：开花点 × 0.9756 → 约 398 m；升空时间和大尾缀一样 7.37 s，开花时刻不变）；
   - 三朵 P2 / P4 / P6（间距 197 m）→ P0 / P4 / P8（375 m），P4 先开、两边晚 0.1 s 照旧；
   - 缩放 ×1.217（旧垂柳补到 280 m 用的）→ ×0.998（__K82，资源原生大小）——推断：新网格按它自己的尺寸做的，用户说「现在很大」；
   - 寿命按用户说的约 14 s 算（体检、动画、工作台时间轴）。
② 下面补大号：原来主角那一位（+330 m，大型位）同一刻补一朵银彩菊（金上配银）：108 s 把 P4 补进那一排银彩菊（P0 P2 P6 P8 → 五点），
   171 s 把 P4 补进「收边」那排（P0 P8 → P0 P4 P8，正好在三朵主角下面）；手游替身照规则是金芒菊·大。
   174.7 s 那排银彩菊（P0 P8，PC）原来就在两边，现在两边上面挂着垂柳，挪到空出来的 P2 / P6（同一刻、同档位）；手游那份不动（宪章 §8 手游中低配 P0 / P4 / P8）。
③ 手游：两处主角的手游替身（金芒菊·大）去掉，主角片段 PC + 手游共用同一个 ResourceId P_EFX_FireWorks_GoldKamuro
   （读回 10-16 04:06：手游表这一行指向 YonshakuKamuro_M；用户 10-17 说手游金垂柳已替换）。
④ 名字：片段名按实际放的花改（「小银菊」= 2801 小号_B 是小平台的，坝顶 2814 叫银冠菊；金蕊青柠星 → 金蕊柠；种类交替 / 对比色换过花的片段名跟着换）。
   父模板名在编译时 --name-fix 改。ResourceId 一个不改（排查结果：组别没有用错，见 analysis/results/编排资源排查_20261017/）。

用法：python3 -I analysis/scripts/编排B09.py
"""
import argparse
import copy
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'analysis/scripts' / file)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


B08 = _load('b08', '编排B08.py')
B07, B06, B05, b, ovl = B08.B07, B08.B06, B08.B05, B08.b, B08.ovl

HERO_ID = 'P_EFX_FireWorks_RiseTrail_Hero'
HERO_K = 0.9756                    # 尾缀v2开花点.mjs HERO_TRAIL：RiseTrail_Hero_L 410.21 → 400 m（时间不变）
HERO_LIFE = 14.0                   # 用户 10-17 00:47「大约为14秒」
HERO_SIZEK = 0.82                  # R03_GoldKamuro_H280 的 EffectScale 1.217391 × 0.82 = 0.998（原生大小）
TRIO = ('P0', 'P4', 'P8')
TEXT_FIX = [('金蕊青柠星', '金蕊柠'), ('小号花', '小型花'), ('小号', '小型')]


def hero_m():
    """主角开花高度（相对发射点，m）：原生大尾缀 410.21 × 0.9756（和编译里 applyTrailV2 同一算法，花型自带的开花点按同一倍数）"""
    t = b.TPL['R03_GoldKamuro_H280']
    return round((t.get('flightHeight') or b.REL_H['L']) * HERO_K, 2)


def patch_models():
    """体检用的几何（两个 b 实例：B05 链上的和重叠体检自己的）：主角挂 400 m 尾缀、寿命 14 s；手游 L 位允许金垂柳"""
    for m in (b, ovl.b):
        orig = m.bloom_h
        hm = round((m.TPL['R03_GoldKamuro_H280'].get('flightHeight') or m.REL_H['L']) * HERO_K, 2)
        m.bloom_h = (lambda o, h: (lambda c: h if c.get('heroTrail') else o(c)))(orig, hm)
        m.TPL['R03_GoldKamuro_H280']['life'] = HERO_LIFE
    B05.ALLOWED['L'] = set(B05.ALLOWED['L']) | {'GKH'}
    B06.clash = B08.clash_same_point                 # 扇的尺子和 B08 修订6 起一样（只禁同点同刻）
    B06.FIG.update(B08.NEW_FIGS)


def heroes(cues):
    by = {c['id']: c for c in cues}
    log = []
    drop = {'B02_C086m5', 'B02_C146m5'}
    for i in sorted(drop):
        x = by[i]
        log.append(dict(cue=i, action='去掉手游替身', was=x['templateId'], points=[e['point'] for e in x['events']]))
    cues[:] = [c for c in cues if c['id'] not in drop]
    by = {c['id']: c for c in cues}
    # 三朵：P2 / P4 / P6 → P0 / P4 / P8（P4 原时刻；两边用原来 P2 / P6 的时刻）
    c = by['B02_C146']
    ev = {e['point']: e for e in c['events']}
    side = ev['P2']
    c['events'] = [dict(side, point='P0'), dict(ev['P4']), dict(side, point='P8')]
    c['points'] = list(TRIO)
    c['profiles'] = dict(c['profiles'], medium=list(TRIO), low=list(TRIO))
    c['label'] = '三主角 金垂柳 400（P0 P4 P8）'
    c['name'] = c['name'].split(' · ')[0] + ' · ' + c['label']
    for c in (by['B02_C086'], by['B02_C146']):
        c['templateId'] = 'R03_GoldKamuro_H280__K%d' % round(HERO_SIZEK * 100)
        c['sizeK'] = HERO_SIZEK
        c['heroTrail'] = True
        c['mobile'] = True
        c.pop('standinOf', None)
        for e in c['events']:
            e['end'] = round(e['burst'] + HERO_LIFE, 6)
        if c['id'] == 'B02_C086':
            c['label'] = '主角 金垂柳 400（P4）'
            c['name'] = c['name'].split(' · ')[0] + ' · ' + c['label']
        log.append(dict(cue=c['id'], action='主角 400 m（RiseTrail_Hero）· ×0.998 · 寿命 14 s · PC + 手游共用', points=[e['point'] for e in c['events']],
                        burst=[e['burst'] for e in c['events']]))
    # 下面补大号（同一刻、原来主角那一位 +330 m）
    for cid, at, ref in (('B02_C087', 'P4', 'P2'), ('B02_C087m5', 'P4', 'P2'), ('B02_C147', 'P4', 'P0'), ('B02_C147m5', 'P4', 'P0')):
        c = by[cid]
        hero = by['B02_C086' if cid.startswith('B02_C087') else 'B02_C146']
        hp = next(e for e in hero['events'] if e['point'] == 'P4')
        r = next(e for e in c['events'] if e['point'] == ref)
        assert not any(e['point'] == at for e in c['events']), cid
        c['events'].append(dict(r, point=at, launch=hp['launch'], burst=hp['burst'], end=round(hp['burst'] + (r['end'] - r['burst']), 6)))
        c['events'].sort(key=lambda e: b.PT[e['point']]['x'])
        c['points'] = [e['point'] for e in c['events']]
        for t in ('medium', 'low'):
            if ref in c['profiles'][t] and at not in c['profiles'][t]:
                c['profiles'][t] = sorted(c['profiles'][t] + [at], key=lambda p: b.PT[p]['x'])
        if cid == 'B02_C147':
            c['label'] = '主角下托 银彩菊（P0 P4 P8）'
            c['name'] = c['name'].split(' · ')[0] + ' · ' + c['label']
        log.append(dict(cue=cid, action='主角下面补一朵（+330 m 大型位）', point=at, burst=hp['burst'], sp=c['sp'], mobile=c.get('mobile')))
    # 174.7 s 银彩菊（PC）：两边上面挂着垂柳 → 挪到空出来的 P2 / P6
    c = by['B02_C150']
    old = [e['point'] for e in c['events']]
    mv = {'P0': 'P2', 'P8': 'P6'}
    for e in c['events']:
        e['point'] = mv[e['point']]
    c['events'].sort(key=lambda e: b.PT[e['point']]['x'])
    c['points'] = [e['point'] for e in c['events']]
    c['profiles'] = {t: sorted({mv.get(p, p) for p in v}, key=lambda p: b.PT[p]['x']) for t, v in c['profiles'].items()}
    log.append(dict(cue='B02_C150', action='挪到两朵主角中间（PC）', points=f"{old} → {c['points']}"))
    return log


def canon(sp, mobile_only=False):
    """片段该叫什么：ResourceFX 行名（坝顶 SC = 2814 银冠菊；小平台 2801 才叫小银菊）；手游放大版（银冠菊·中 / 辉星·中）只上 PC 时不写「（手游）」"""
    zh = b.SPECIES[sp][1]
    if not mobile_only:
        zh = zh.replace('（手游）', '')
    zh = zh.replace('辉星·中', '橙辉星·中').replace('橙橙', '橙')
    if b.SPECIES[sp][2] != 'X':
        zh = zh.replace('小银菊', '银冠菊')
    for o, n in TEXT_FIX:
        zh = zh.replace(o, n)
    return zh


def fix_names(cues):
    """片段名 = 「段 · 花名（备注）」：花名按实际放的花；手游替身括号里写的是 PC 原来那朵，不动"""
    words = sorted({canon(k) for k in b.SPECIES} | {b.SPECIES[k][1] for k in b.SPECIES} | {'小银菊', '金蕊青柠星', '辉星'}, key=len, reverse=True)
    log = []
    for c in cues:
        before = (c['name'], c.get('label'))
        want = canon(c['sp'], c.get('mobile') == 'only')
        parts = c['name'].split(' · ')
        last = parts[-1].split('→')[-1].strip() if '→' in parts[-1] else parts[-1]   # B08 收尾：「余韵 金垂柳 280（P4） → 收尾金芒菊大」只留现在放的
        head, sep, tail = last.partition('（')
        if c['size'] != 'X':
            head = head.replace('小银菊', '银冠菊')
            tail = tail.replace('小银菊', '银冠菊')
        for o, n in TEXT_FIX:
            head, tail = head.replace(o, n), tail.replace(o, n)
        said = next((w for w in words if w in head), None)
        if c.get('mobile') == 'only':                # 手游替身：名字前半是 PC 那朵（对照用），括号里写手游实际放的
            if '手游' not in sep + tail and said and said != want and not (said in want or want in said):
                tail = (tail + '（' if sep else '') + f'手游·{want}）'
                sep = sep or '（'
                if tail.startswith('（'):
                    tail = tail[1:]
        elif said and said != want and not (said in want or want in said):
            head = head.replace(said + '大', want, 1) if said + '大' in head else head.replace(said, want, 1)
        parts[-1] = head + sep + tail
        c['name'] = ' · '.join(parts)
        if c.get('label'):
            lab = c['label'].replace('小银菊', '银冠菊') if c['size'] != 'X' else c['label']
            for o, n in TEXT_FIX:
                lab = lab.replace(o, n)
            ls = next((w for w in words if w in lab), None)
            if ls and ls != want and not (ls in want or want in ls) and c.get('mobile') != 'only' and '→' not in lab:
                lab = lab.replace(ls, want, 1)
            c['label'] = lab
        if (c['name'], c.get('label')) != before:
            log.append(dict(cue=c['id'], sp=c['sp'], before=before[0], after=c['name']))
    return log


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default=str(ROOT / '协作/编排B01/逻辑方案_B08.json'))
    ap.add_argument('--name', default='B09')
    ap.add_argument('--out-dir', default=str(ROOT / '协作/编排B01'))
    a = ap.parse_args()
    plan = json.loads(Path(a.base).read_text(encoding='utf-8'))
    b.BAR0, b.OFFSET = plan['bar0S'], plan['musicOffsetS']
    b.QUIET = [(b.T(k), b.T(k + 1) - 0.1) for k in (41, 65, 96)]
    patch_models()
    cues = copy.deepcopy(plan['cues'])
    log = dict(base=str(Path(a.base).resolve().relative_to(ROOT)), heroM=hero_m(), heroLife=HERO_LIFE, heroSizeK=HERO_SIZEK, heroTrail=HERO_ID)
    log['heroes'] = heroes(cues)
    log['names'] = fix_names(cues)
    cues.sort(key=lambda c: (min(e['launch'] for e in c['events']), c['id']))
    log['mobileRule'] = B05.mobile_rule(cues)
    out = dict(plan, revision=f"{a.name}_hero400_trio_P0P4P8_under_SS_mobile_kamuro_names_from_{plan['revision']}", generator='analysis/scripts/编排B09.py',
               cues=cues, b09=log, base=log['base'])
    od = Path(a.out_dir)
    lp = od / f'逻辑方案_{a.name}.json'
    lp.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    # —— 体检（和 B08 同一套）——
    gpu, read_at = B05.census_gpu()
    model = B05.apply_census(gpu)
    ck = B05.run_checks(out, cues)
    ck['gpuModel'] = dict(source=str(B05.CENSUS.relative_to(ROOT)), readAt=read_at, **model)
    ck['b09'] = log
    rep = ovl.report(lp)
    ck['overlap'] = {k: v for k, v in rep.items() if k != 'pc'}
    ck['overlap']['pcList'] = rep['pc']
    prev = json.loads((od / '逻辑方案_B08.json').read_text(encoding='utf-8'))
    ck['fanAudit'] = dict(B09=B06.audit(cues, out, 'B09'))
    ck['tierEnds'] = B07.tier_ends(cues)
    ck['shares'] = {f'{p}-{t}': B06.shares(cues, p, t) for p in ('pc', 'mobile') for t in ('high', 'medium', 'low')}
    vs = (('B09', cues), ('B08修订7', prev['cues']))
    ck['heavy'] = dict(rule='同 B08：PC 低配亮着的浓密金菊面积 A（金曜菊 / 金蕊柠 / 金芒菊 / 金锦菊，含大号）≤ 4.0；金垂柳、银彩菊不在 A 里（推断，没实测）',
                       **{f'{v}-{t}': dict(dense=B08.peaks(B08.load_series(cs, 'dense', 'pc', t)), burst=B08.peaks(B08.load_series(cs, 'burst', 'pc', t))) for v, cs in vs for t in ('high', 'medium', 'low')},
                       atB05Peaks={v: B08.at_peaks(cs) for v, cs in vs})
    hero = [c for c in cues if c['sp'] == 'GKH']
    ck['heroWindow'] = {f'{c["id"]}': dict(points=[e['point'] for e in c['events']], burst=[e['burst'] for e in c['events']], end=[e['end'] for e in c['events']],
                                            spacingM=sorted({round(abs(b.PT[x['point']]['x'] - b.PT[y['point']]['x']), 1) for x in c['events'] for y in c['events'] if x is not y}))
                        for c in hero}
    ck['score'] = B07.scorecard(out, cues, prev)
    (od / f'体检_{a.name}.json').write_text(json.dumps(ck, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps(dict(revision=out['revision'], cues=len(cues), heroes=log['heroes'], names=len(log['names']),
                          tiers={k: v['events'] for k, v in ck['tiers'].items()}, mobile={k: v['events'] for k, v in ck['b02']['mobileTiers'].items()},
                          gpu=ck['gpu']['peak'], tierNesting=ck['tierNesting']['ok'], mobileRuleViolations=len(log['mobileRule']['violations']),
                          overlap=dict(pc=ck['overlap']['pcIncidents'], mobile={k: v['incidents'] for k, v in ck['overlap']['mobile'].items()}),
                          fanClash=ck['fanAudit']['B09']['clashPairs'], tierEnds=ck['tierEnds']['violations'], heroWindow=ck['heroWindow'],
                          atB05Peaks=ck['heavy']['atB05Peaks']), ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
