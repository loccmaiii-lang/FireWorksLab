"""把制作中的多层效果迁到 4.0（用户 2026-10-01 同意：效果参数不变，只换 4.0 渲染和形式）

用法：python3 analysis/scripts/迁移到4.0.py <曝光.json> [旧号:新号 ...]
  默认迁：HK9→HK10、FS9→FS10、PK8→PK9、QN10→QN11、QC10→QC11、ZB4→ZB5、QD12→QD13、ZW4→ZW5、QA17→QA19（QA18 是单变量试验）
  曝光.json：{层号: {value: 曝光}}，用 autoExposure40 算（每层各自定，和 3.7 每层各自自动曝光同一口径）

做什么：
  - analysis/迭代/条目.json 加每层的新条目（同 base / p / m，p 里加：renderVer 40、4×4 格、2048 贴图、固定取景、按运动分配先放进一张、曝光）
    和一个组合条目（各层的缩放 / 延迟 / 颜色等原样照抄，层引用换成新层）。实拍取景沿用旧版。
  - 协作/状态清单.json：效果的 主条目 / 工作版 换成新号，旧号写进 历史（「3.7 版，迁到 4.0 前」），下一步写导出检查。
  - analysis/jobs/<新号>E1.json：导出任务（组合导出一个素材包 + 回放检查）。
不改效果参数；4.0 版要导出、回放检查、标准检查都过了，才进「待我验收」。
"""
import json, os, re, sys, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DEFAULT = [('HK9', 'HK10'), ('FS9', 'FS10'), ('PK8', 'PK9'), ('QN10', 'QN11'), ('QC10', 'QC11'), ('ZB4', 'ZB5'), ('QD12', 'QD13'), ('ZW4', 'ZW5'), ('QA17', 'QA19')]
FORM40 = {'renderVer': 40, 'cols': 4, 'rows': 4, 'texW': 2048, 'texH': 2048, 'zoom': 'off', 'frameBudget': 'motion', 'pageTarget': 1, 'maxHold': 4, 'autoGrid': 0}


def load_review():
    s = open(os.path.join(ROOT, 'tool', 'data', 'review.js'), encoding='utf-8').read()
    def var(name):
        m = re.search(r'var ' + name + r' = (.*?);\n(?:var |$)', s, re.S); return json.loads(m.group(1))
    return var('FW_REVIEW')


def main(expo_path, pairs):
    expo = json.load(open(expo_path, encoding='utf-8'))
    ents = {e['id']: e for e in load_review()}
    itf = os.path.join(ROOT, 'analysis', '迭代', '条目.json'); it = json.load(open(itf, encoding='utf-8'))
    it.setdefault('combos', [])
    have = {e['id'] for e in it['entries']} | {c.get('id') for c in it['combos']}
    stf = os.path.join(ROOT, '协作', '状态清单.json'); st = json.load(open(stf, encoding='utf-8'))
    today = time.strftime('%Y-%m-%d %H:%M')
    for old, new in pairs:
        c = ents[old]
        if new in have: print('已存在，跳过', new); continue
        lids = []
        for i, lid in enumerate(c['layerIds']):
            L = ents[lid]; nid = f'{new}-{i + 1}'
            if lid not in expo or not expo[lid].get('value'): raise SystemExit(f'{lid} 还没有算曝光')
            p = dict(L['p']); p.update(FORM40); p['exposure'] = round(expo[lid]['value'], 4 if expo[lid]['value'] < 1 else 3)
            e = dict(id=nid, date=today, name=re.sub(r'（[^）]*）$', '', L['name']) + f'（4.0 · {lid} 参数）', base=L['base'], p=p, m=L.get('m') or {},
                     tags=(L.get('tags') or '') + ' 4.0', note=f'{lid} 的效果参数原样不动，只换 4.0：单格 512、先放进一张（按运动分配）、固定取景、曝光 ×{p["exposure"]}（按最亮一刻自动定）。')
            if L.get('video'): e['video'] = L['video'].replace('../', '', 1)
            it['entries'].append(e); lids.append(nid)
        layers = [dict(L, m='rep:' + nid) for L, nid in zip(c['combo']['layers'], lids)]
        efn = next((ef['名'] for ef in st['effects'] if (ef.get('主条目') or '').replace('rep:', '') in (old, new)), c['name']).split('（')[0]
        ce = dict(id=new, date=today, name=f'{efn} · 4.0（{old} 参数）', replaces=[old], layers=layers, layerNames=c.get('layerNames'),
                  note=f'{old} 原样迁到 4.0：每层效果参数不变；4.0 渲染（512 格、先放进一张、固定取景、每层自动曝光），导出一个素材包（每层一个发射器）。',
                  look=['和 3.7 版（历史里的 ' + old + '）比：各层的颜色、亮度比例、时间有没有变', '游戏内大小下连续播放：有没有抖、层和层对不对得上'],
                  opinion='待导出检查（本机显卡导出 + 回放检查 + 标准检查都过了才进「待我验收」）。', tags=(c.get('tags') or '') + ' 4.0')
        if c.get('video'): ce['video'] = c['video'].replace('../', '', 1)
        if c.get('vmeta'): ce['vmeta'] = c['vmeta']
        it['combos'].append(ce)
        for ef in st['effects']:
            if (ef.get('主条目') or '').replace('rep:', '') == old or ef.get('工作版') == old:
                ef['主条目'] = new; ef['工作版'] = new
                ef.setdefault('历史', []).insert(0, {'id': old, '结论': '3.7 版（迁到 4.0 前）', '反馈': '2026-10-01 用户同意全部迁到 4.0'})
                ef['下一步'] = f'{new} = {old} 原样迁到 4.0；等本机显卡导出 {new}E1（一个素材包 + 回放检查），再跑标准检查，全过才进待我验收'
                ef['负责'] = '对话框2（4.0 迁移）；之前：' + ef.get('负责', '')
                ef.setdefault('导出任务', []).append(new + 'E1')
                key = ef['key']
        job = dict(id=new + 'E1', type='export', effect=key, entry=new, name=re.sub(r'[^A-Za-z0-9]', '', new) and f'{key.title().replace("_", "")}40',
                   priority=7, note=f'{new}（{old} 迁 4.0）组合导出一个素材包 + 回放检查 + 烘焙器同一秒对照。')
        json.dump(job, open(os.path.join(ROOT, 'analysis', 'jobs', new + 'E1.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(old, '→', new, '层', lids)
    json.dump(it, open(itf, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(st, open(stf, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    pairs = [tuple(a.split(':')) for a in sys.argv[2:]] or DEFAULT
    main(sys.argv[1], pairs)
