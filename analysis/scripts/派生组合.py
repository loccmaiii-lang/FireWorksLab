"""从烘焙器里任意一个条目（单层或组合，不管来自原理条目、拟合结果还是手调条目）派生一个新版本，写进 analysis/迭代/条目.json。

和 手调组合.py 的区别：各层参数从烘焙器页面里取（replicaPM，和烘焙器里看到的完全一样），所以来源可以是任何条目。
用法：
  python3 analysis/scripts/派生组合.py <来源条目号> <新编号> --effect <状态清单 key> --name "..." \
      --mods '{"0": {"flash": 0.3, "M.headInt": 1.0}}' [--note "..."] [--replaces '["ZB"]'] [--look '[...]'] [--opinion "..."] [--burst-t 1.0]
层号按来源组合的层顺序（单层条目只有 0）。
"""
import argparse, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ITER = os.path.join(ROOT, 'analysis', '迭代', '条目.json')
sys.path.insert(0, HERE)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('new'); ap.add_argument('--effect', required=True); ap.add_argument('--name', required=True)
    ap.add_argument('--mods', default='{}'); ap.add_argument('--note', default=''); ap.add_argument('--replaces', default='[]')
    ap.add_argument('--look', default='[]'); ap.add_argument('--opinion', default=''); ap.add_argument('--burst-t', type=float, default=None)
    ap.add_argument('--dup', default='', help='复制这几层追加到最后（同一模拟拆成尾巴层 + 星头层时用），例 "0"')
    a = ap.parse_args()
    from compare import SimSession
    s = SimSession()
    info = s.pg.evaluate(f"""(() => {{ const e = FW_REVIEW_LIST.find(x => x.id === {json.dumps(a.src)}); if (!e) return null;
        const L = e.kind === 'combo' ? e.combo.layers.map((l, i) => ({{ id: l.m.slice(4), delay: l.delay || 0, scale: l.scale || 1, name: (e.layerNames || [])[i] }})) : [{{ id: e.id, delay: 0, scale: 1, name: e.name }}];
        return {{ layers: L.map(l => {{ const r = replicaPM(l.id); return {{ ...l, P: r.P, M: r.M }}; }}), video: e.video, roi: e.roi || null, t_range: e.t_range || null, vmeta: e.vmeta || null }}; }})()""")
    s.close()
    if not info: raise SystemExit('找不到条目 ' + a.src)
    if not info.get('roi') or not info.get('t_range'):     # 烘焙器的条目记录里不带 roi / t_range：回到定义它的条目文件里找
        import glob
        for f in [ITER] + sorted(glob.glob(os.path.join(ROOT, 'analysis', '原理', '条目*.json'))) + sorted(glob.glob(os.path.join(ROOT, 'analysis', 'jobs', '*.json'))):
            try: j = json.load(open(f, encoding='utf-8'))
            except Exception: continue
            for x in (j.get('entries', []) + j.get('combos', []) if isinstance(j, dict) and ('entries' in j or 'combos' in j) else [j]):
                if isinstance(x, dict) and x.get('id') == a.src:
                    info['roi'] = info.get('roi') or x.get('roi'); info['t_range'] = info.get('t_range') or x.get('t_range')
    import copy
    for li in [int(x) for x in a.dup.split(',') if x.strip()]:
        L2 = copy.deepcopy(info['layers'][li]); L2['name'] = (L2.get('name') or '') + '（复制）'; info['layers'].append(L2)
    mods = json.loads(a.mods)
    for li, m in mods.items():
        L = info['layers'][int(li)]
        for k, v in m.items():
            if k.startswith('M.'): L['M'][k[2:]] = v
            else: L['P'][k] = v
    video = (info['video'] or '').replace('../', '', 1) if (info['video'] or '').startswith('../') else info['video']
    d = json.load(open(ITER, encoding='utf-8')); d.setdefault('combos', [])
    ids = [f'{a.new}-{i + 1}' for i in range(len(info['layers']))]
    d['entries'] = [e for e in d['entries'] if e['id'] not in ids]; d['combos'] = [c for c in d['combos'] if c.get('id') != a.new]
    now = time.strftime('%Y-%m-%d %H:%M'); bt = a.burst_t if a.burst_t is not None else (info['vmeta'] or {}).get('t0')
    for i, L in enumerate(info['layers']):
        P = {k: v for k, v in L['P'].items() if not k.startswith('_') and k != 'type'}
        d['entries'].append(dict(id=ids[i], date=now, name=f"{a.name} · {L.get('name') or '第 ' + str(i + 1) + ' 层'}", base=L['P'].get('type', 'kiku'),
                                 video=video, roi=info['roi'], t_range=info['t_range'], tags=f'{a.name} {a.new}', p=P, m=L['M'],
                                 note=f'{a.new} 的第 {i + 1} 层（来源 {a.src} 的 {L["id"]} + 改动）。', look=[], opinion=''))
    c = dict(id=a.new, name=a.name, date=now, video=video, roi=info['roi'], t_range=info['t_range'], tags=f'{a.name} {a.new} 整体',
             layers=[{'m': 'rep:' + i, 'scale': L['scale'], 'delay': L['delay']} for i, L in zip(ids, info['layers'])],
             layerNames=[L.get('name') or f'第 {i + 1} 层' for i, L in enumerate(info['layers'])], note=a.note, look=json.loads(a.look), opinion=a.opinion,
             replaces=json.loads(a.replaces), effect=a.effect, src=a.src, mods=mods)
    if bt is not None: c['burst_t'] = bt
    d['combos'].append(c)
    json.dump(d, open(ITER, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(a.new, len(ids), '层 →', ITER)


if __name__ == '__main__':
    main()
