#!/usr/bin/env python3
"""编排资源引用排查（跨年秀（22），用户 10-17 00:47「小号这几个前缀带Little的都是小平台的，小型才是90m的小型烟花，能排查一下是否属实并且看看其它有没有引用错误的吗」）。

查一张导演表 + 同版 .dfshow：
1. 按组（P / B 坝顶、F 小平台）列每个 FXResourceId 和 ResourceFX 行名（2800–2835，用户 10-14 截图转录）；
   规则：F 组只许「小号」（2800–2805，Little* / *_Layers_S）和 Tiny / XS 尾缀；P / B 组不许「小号」。
2. 手游（PlatformFlags 含 2）用到的 ResourceId 都要在手游 ResourceFX 表里（读回 10-17 13:01）。
3. 每个 ResourceId 在 PC / 手游表里指向哪个粒子；两行指向同一个粒子的列出来（例：超大_尾缀 和 大型_尾缀）。
4. 工作台里看到的名字（父模板名、片段名）和它实际放的花对不上的。

用法：python3 -I analysis/scripts/编排资源排查.py <一张表.json> <.dfshow> [--out <目录>]
"""
import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ROWS = ROOT / '协作/ResourceFX_3.0_行名_2026-10-14.json'
READ = ROOT / 'analysis/results/资源规范统一_20261016/复核_20261017/现状_202610170501Z.json'   # 10-17 13:01 HK（本机 resourcefx 回读）；旧：采集/resourcefx_30.json（10-16 04:06，2830 还指 330 m 粒子）
# 旧叫法（不是 ResourceFX 行名）→ 现在的行名花名
LEGACY = {'金芯柠': '金蕊柠', '金蕊青柠星': '金蕊柠', '辉星': '橙辉星', '小金花簇': '小金花', '分裂星': '小分裂'}


def rows():
    r = json.loads(ROWS.read_text(encoding='utf-8'))['rows']
    out = {}
    for x in r:
        parts = x['name'].split('_')
        out[x['id3']] = dict(no=int(x['id']), row=x['name'], cls=parts[1].replace('小形', '小型'), zh=parts[-1])
    return out


def particle(path):
    return (path or '').split('/')[-1].split('.')[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('table')
    ap.add_argument('dfshow')
    ap.add_argument('--out', default=str(ROOT / 'analysis/results/编排资源排查_20261017'))
    a = ap.parse_args()
    R = rows()
    rb = json.loads(READ.read_text(encoding='utf-8'))
    rb_rows = rb.get('rows') or rb                  # 新格式 rows.pc / rows.mobile；旧格式 pc / mobile
    rb.setdefault('readAt', rb.get('at'))
    pc = {x['ResourceId']: x for x in rb_rows['pc']}
    mob = {x['ResourceId']: x for x in rb_rows['mobile']}
    m = json.loads(Path(a.table).read_text(encoding='utf-8'))
    subs = {s['TemplateName']: s for s in m['EffectSubTemplates']}
    tpls = {t['TemplateName']: t for t in m['EffectTemplates']}
    use = defaultdict(Counter)
    mobile_use = Counter()
    for g in m['EffectScheduleGroups']:
        for s in g['Slots']:
            t = tpls[s['TemplateName']]
            for e in t['Entries']:
                if not e.get('SubTemplateName'):
                    continue
                f = (e.get('Filter') or {}).get('PlatformFlags', (t.get('Filter') or {}).get('PlatformFlags', 14))
                for x in subs[e['SubTemplateName']]['Entries']:
                    rid = x.get('FXResourceId')
                    if not rid:
                        continue
                    use[g['GroupName']][rid] += 1
                    if f & 2:
                        mobile_use[rid] += 1
    rep = dict(table=str(Path(a.table).resolve().relative_to(ROOT)), dfshow=str(Path(a.dfshow).resolve().relative_to(ROOT)), rowsSource=str(ROWS.relative_to(ROOT)),
               readback=str(READ.relative_to(ROOT)), readAt=rb['readAt'], groups={}, wrongGroup=[], unknown=[], mobileMissing=[], sameParticle=[], names=[])
    for gname, c in use.items():
        rep['groups'][gname] = [dict(id=rid, no=R.get(rid, {}).get('no'), row=R.get(rid, {}).get('row'), n=n,
                                     pc=particle(pc.get(rid, {}).get('FxSP')), mobile=particle(mob.get(rid, {}).get('FxSP')) or None)
                                for rid, n in sorted(c.items(), key=lambda kv: R.get(kv[0], {}).get('no', 9999))]
        for rid in c:
            info = R.get(rid)
            if not info:
                rep['unknown'].append(dict(group=gname, id=rid))
                continue
            small_pf = info['cls'] == '小号' or 'Tiny' in rid or 'RiseTrail_XS' in rid
            if gname == 'F' and not small_pf:
                rep['wrongGroup'].append(dict(group=gname, id=rid, row=info['row'], why='小平台用了不是「小号」的资源'))
            if gname in ('P', 'B') and info['cls'] == '小号':
                rep['wrongGroup'].append(dict(group=gname, id=rid, row=info['row'], why='坝顶用了「小号」（小平台）资源'))
    rep['mobileMissing'] = [dict(id=rid, n=n, row=R.get(rid, {}).get('row')) for rid, n in sorted(mobile_use.items()) if rid not in mob]
    rep['mobileUsed'] = [dict(id=rid, n=n, row=R.get(rid, {}).get('row'), particle=particle(mob.get(rid, {}).get('FxSP'))) for rid, n in sorted(mobile_use.items())]
    for side, tab in (('pc', pc), ('mobile', mob)):
        by = defaultdict(list)
        for rid, x in tab.items():
            if rid in R:
                by[particle(x['FxSP'])].append(rid)
        for p, ids in by.items():
            if len(ids) > 1:
                rep['sameParticle'].append(dict(side=side, particle=p, ids=ids, rows=[R[i]['row'] for i in ids]))
    # 工作台名字
    doc = json.loads(Path(a.dfshow).read_text(encoding='utf-8'))['payload']['doc']
    dsubs = {s['key']: s for s in doc['subTemplateLibrary']}
    dt = {t['id']: t for t in doc['templateLibrary']}
    words = sorted({v['zh'] for v in R.values()} | set(LEGACY), key=len, reverse=True)

    def said(text):
        found, t = [], text
        for w in words:
            if w in t:
                found.append(w)
                t = t.replace(w, ' ')
        return found

    def actual(tpl):
        s = dsubs.get(tpl.get('subTemplateRef'))
        ids = [e['native'].get('FXResourceId') for e in (s or {}).get('entries', []) if e.get('role') != 'trail' and e['native'].get('FXResourceId')]
        return ids, sorted({R[i]['zh'] for i in ids if i in R})

    def claimed(text):
        """名字说的是哪种花：带「（手游·X）」的按 X（手游替身的名字自己写明了换成什么）"""
        mm = re.findall(r'手游·([^（）·]+)', text)
        return said(mm[-1]) if mm else said(re.sub(r'（.*?）', '', text))

    def wrong(names, real, ids):
        if not names or not real:
            return False
        if '小银菊' in names and 'P_EFX_FireWorks_SilverChry' in ids:      # 2814 是银冠菊，「小银菊」是 2801 小号_B（小平台）
            return True
        return not ({LEGACY.get(w, w) for w in names} & set(real))

    used_t = {c['templateId'] for c in doc['cues']}
    for t in doc['templateLibrary']:
        ids, real = actual(t)
        if wrong(claimed(t['name']), real, ids):
            rep['names'].append(dict(kind='父模板', name=t['name'], plays=real, ids=ids, used=t['id'] in used_t))
    cn = Counter()
    for c in doc['cues']:
        ids, real = actual(dt[c['templateId']])
        if wrong(claimed(c['name'].split(' · ')[-1]), real, ids):
            cn[(c['name'].split(' · ')[-1], tuple(real))] += 1
    rep['names'] += [dict(kind='片段', name=k[0], plays=list(k[1]), count=v) for k, v in sorted(cn.items())]
    od = Path(a.out)
    od.mkdir(parents=True, exist_ok=True)
    stem = Path(a.table).stem.replace('导演表-', '').replace('-一张表', '')
    (od / f'{stem}.json').write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding='utf-8')
    L = [f'# 资源引用排查：{stem}', '',
         f'> 表：`{rep["table"]}`；行名：用户 10-14 截图转录 `{rep["rowsSource"]}`；粒子指向：读回 {rep["readAt"]}（`{rep["readback"]}`）。', '',
         f'- 组别错用（小平台用了非小号 / 坝顶用了小号）：**{len(rep["wrongGroup"])}** 处',
         f'- 表里没有的 ResourceId：**{len(rep["unknown"])}** 个；手游用了但手游表里没有：**{len(rep["mobileMissing"])}** 个',
         f'- 两行指向同一个粒子：{len(rep["sameParticle"])} 组；名字和实际放的花对不上：{len(rep["names"])} 条', '']
    for g, xs in rep['groups'].items():
        L += [f'## {g} 组', '', '| 编号 | 行名 | ResourceId | 次数 | PC 粒子 | 手游粒子 |', '|---|---|---|---|---|---|']
        L += [f"| {x['no']} | {x['row']} | `{x['id'].replace('P_EFX_FireWorks_', '')}` | {x['n']} | {x['pc']} | {x['mobile'] or '—'} |" for x in xs]
        L.append('')
    for k, title in (('wrongGroup', '组别错用'), ('unknown', '表里没有'), ('mobileMissing', '手游表里没有'), ('sameParticle', '两行同一个粒子'), ('names', '名字对不上')):
        L += [f'## {title}', '']
        L += [f'- {json.dumps(x, ensure_ascii=False)}' for x in rep[k]] or ['- 无']
        L.append('')
    (od / f'{stem}.md').write_text('\n'.join(L), encoding='utf-8')
    print(json.dumps(dict(wrongGroup=rep['wrongGroup'], unknown=rep['unknown'], mobileMissing=rep['mobileMissing'], sameParticle=rep['sameParticle'],
                          names=len(rep['names']), namesUsed=sum(1 for x in rep['names'] if x.get('used', True))), ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
