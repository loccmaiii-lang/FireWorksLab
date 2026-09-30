"""把一个多层拟合结果（analysis/results/<任务>/best.json）加上手调改动，存成迭代条目 + 组合条目（正式库形式，烘焙器里能看、能导出）。

用法：
  python3 analysis/scripts/手调组合.py <来源任务> <新编号> --effect <状态清单 key> --name "..." \
      --mods '{"1": {"ignDelay": 0.55, "M.headInt": 2}}' [--note "..."] [--replaces '["QC6"]']
来源也可以是已有的手调组合条目号（例 QC7 → QC8，各层从条目里取）。
写进 analysis/迭代/条目.json：层条目 <新编号>-1..n + 组合条目 <新编号>（combos 里带 id → 迭代区一个效果一条）。
"""
import argparse, copy, json, os, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ITER = os.path.join(ROOT, 'analysis', '迭代', '条目.json')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('new'); ap.add_argument('--effect', required=True); ap.add_argument('--name', required=True)
    ap.add_argument('--mods', default='{}'); ap.add_argument('--note', default=''); ap.add_argument('--replaces', default='[]')
    ap.add_argument('--look', default='[]'); ap.add_argument('--opinion', default='')
    a = ap.parse_args()
    jp = os.path.join(ROOT, 'analysis', 'jobs', a.src + '.json')
    d0 = json.load(open(ITER, encoding='utf-8'))
    src_combo = next((c for c in d0.get('combos', []) if c.get('id') == a.src), None)
    if src_combo and not os.path.exists(os.path.join(ROOT, 'analysis', 'results', a.src, 'best.json')):
        # 来源是已有的手调组合条目（例 QC7 → QC8）：各层从条目里取
        E = {e['id']: e for e in d0['entries']}; job = {k: src_combo.get(k) for k in ('video', 'roi', 't_range', 'burst_t')}
        layers = []
        for L, nm in zip(src_combo['layers'], src_combo.get('layerNames') or []):
            e = E[L['m'][4:]]; layers.append(dict(name=nm, P=dict(copy.deepcopy(e['p']), type=e['base']), M=copy.deepcopy(e.get('m') or {}), scale=L.get('scale', 1), delay=L.get('delay', 0)))
    else:
        job = json.load(open(jp, encoding='utf-8'))
        best = json.load(open(os.path.join(ROOT, 'analysis', 'results', a.src, 'best.json'), encoding='utf-8'))
        layers = copy.deepcopy(best['P']['layers'])
    mods = json.loads(a.mods)
    for li, m in mods.items():
        L = layers[int(li)]
        for k, v in m.items():
            if k.startswith('M.'): L.setdefault('M', {})[k[2:]] = v
            else: L['P'][k] = v
    d = json.load(open(ITER, encoding='utf-8')); d.setdefault('combos', [])
    ids = [f'{a.new}-{i + 1}' for i in range(len(layers))]
    d['entries'] = [e for e in d['entries'] if e['id'] not in ids]; d['combos'] = [c for c in d['combos'] if c.get('id') != a.new]
    now = time.strftime('%Y-%m-%d %H:%M')
    for i, L in enumerate(layers):
        P = {k: v for k, v in L['P'].items() if not k.startswith('_') and k != 'type'}
        d['entries'].append(dict(id=ids[i], date=now, name=f"{a.name} · {L.get('name') or '第 ' + str(i + 1) + ' 层'}", base=L['P'].get('type', 'kiku'),
                                 video=job.get('video'), roi=job.get('roi'), t_range=job.get('t_range'), tags=f'{a.name} {a.new}', p=P, m=L.get('M') or {},
                                 note=f'{a.new} 的第 {i + 1} 层（来源 {a.src} 拟合结果 + 手调）。', look=[], opinion=''))
    d['combos'].append(dict(id=a.new, name=a.name, date=now, video=job.get('video'), roi=job.get('roi'), t_range=job.get('t_range'), tags=f'{a.name} {a.new} 整体',
                            layers=[{'m': 'rep:' + i, 'scale': L.get('scale', 1), 'delay': L.get('delay', 0)} for i, L in zip(ids, layers)],
                            layerNames=[L.get('name') or f'第 {i + 1} 层' for i, L in enumerate(layers)], note=a.note, look=json.loads(a.look), opinion=a.opinion,
                            replaces=json.loads(a.replaces), effect=a.effect, src=a.src, mods=mods, **({'burst_t': job['burst_t']} if job.get('burst_t') is not None else {})))
    json.dump(d, open(ITER, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(a.new, len(layers), '层 →', ITER)


if __name__ == '__main__':
    main()
