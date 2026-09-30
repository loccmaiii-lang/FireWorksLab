"""把一个组合条目（analysis/原理/条目*.json 或 analysis/迭代/条目.json 里带 id 的 combos）写成多层拟合任务。

用法：
  python3 analysis/scripts/combo_job.py <组合id> <任务号> --effect <状态清单 key> --params '["*.stars","0.sparkLife",...]' \
      [--caps '{"*.stars":[900,1600]}'] [--rounds 2] [--name "..."] [--note "..."] [--replaces '["HK2"]']

- 起点写到 analysis/jobs/起点/<任务号>_起点.json（各层 P / M 用烘焙器的 defaultsFor + derive + normalizeM 补全）
- 参数写法："0.xxx" 只改第 0 层；"*.xxx" 所有层一起改（同一批星的几层共用初速 / 星数 / 燃烧时长，必须这样写）
- 亮度类参数不要放进 params（多层拟合会把次要层调没；CLAUDE.md「内部迭代闭环」）
"""
import argparse, glob, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def find_combo(cid):
    files = sorted(glob.glob(os.path.join(ROOT, 'analysis', '原理', '条目*.json'))) + [os.path.join(ROOT, 'analysis', '迭代', '条目.json')]
    ents = {}
    for f in files:
        if not os.path.exists(f): continue
        j = json.load(open(f, encoding='utf-8'))
        for e in j.get('entries', []): ents[e['id']] = e
    for f in files:
        if not os.path.exists(f): continue
        for c in json.load(open(f, encoding='utf-8')).get('combos', []):
            if c.get('id') == cid: return c, ents
    raise SystemExit('找不到组合 ' + cid)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('combo'); ap.add_argument('job')
    ap.add_argument('--effect', required=True); ap.add_argument('--params', required=True)
    ap.add_argument('--caps', default='{}'); ap.add_argument('--rounds', type=int, default=2)
    ap.add_argument('--name', default=''); ap.add_argument('--note', default=''); ap.add_argument('--replaces', default='[]')
    ap.add_argument('--look', default='[]'); ap.add_argument('--priority', type=int, default=6)
    a = ap.parse_args()
    c, ents = find_combo(a.combo)
    from compare import SimSession
    s = SimSession()
    layers = []
    try:
        for L, nm in zip(c['layers'], c.get('layerNames') or [None] * len(c['layers'])):
            e = ents[L['m'][4:]]
            f = s.pg.evaluate(f"""(() => {{ const b = {json.dumps(e['base'])}, d = defaultsFor(b); const P = derive({{ ...d.P, ...{json.dumps(e.get('p', {}))}, type: b }});
                const M = normalizeM({{ ...d.M, ...{json.dumps(e.get('m', {}))} }}, b); return {{ P, M }}; }})()""")
            layers.append(dict(name=nm or e['name'].split('·')[-1].strip(), **{'from': e['id']}, P=f['P'], M=f['M'], scale=L.get('scale') or 1, delay=L.get('delay') or 0))
    finally: s.close()
    start = f'analysis/jobs/起点/{a.job}_起点.json'
    json.dump({'layers': layers}, open(os.path.join(ROOT, start), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    e0 = ents[c['layers'][0]['m'][4:]]
    name = a.name or c['name']
    job = dict(id=a.job, effect=a.effect, name=name, priority=a.priority, video=c.get('video') or e0.get('video'),
               roi=c.get('roi') or e0.get('roi'), t_range=c.get('t_range') or e0.get('t_range'), start=start,
               fit=dict(params=json.loads(a.params), rounds=a.rounds, camera=True, caps={'_psf': [0, 0.4], **json.loads(a.caps)}), note=a.note,
               review=dict(date=__import__('time').strftime('%Y-%m-%d %H:%M'), name=name, tags=f"{name} {a.job}", replaces=json.loads(a.replaces),
                           note=a.note, look=json.loads(a.look), opinion=''))
    job = {k: v for k, v in job.items() if v is not None}
    json.dump(job, open(os.path.join(ROOT, 'analysis', 'jobs', a.job + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(a.job, len(layers), '层 →', start)


if __name__ == '__main__':
    main()
