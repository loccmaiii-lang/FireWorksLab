"""左栏 / 资产栏的效果缩略图：按当前配方在烘焙器里渲染（用户 2026-10-02 14:46：「所有效果缩略图不要用实拍，用渲染的」）

两步：
  1. 生成本机显卡任务（type "ui"，只取画布、不截整页）：
       python3 analysis/scripts/渲染缩略图.py --job UI8T [--effects hongchao,jinmangju]
     每个效果：打开（和用户点左栏一样，显示默认版本）→ 实时模拟 → 「适应窗口」→ 展开时刻 → 取画布按内容裁成 160 方图。
  2. 结果回来后收进仓库：
       python3 analysis/scripts/渲染缩略图.py --ingest analysis/results/UI8T
     写 tool/data/render_thumbs.json（{ef:<效果> / 条目 id: {src, ver, at}}），再跑 review_to_baker.py，左栏就换成渲染图。
没有渲染图的条目用对照图里模拟的那一半，再没有就用花型模板的渲染图；实拍缩略图不再显示。
"""
import argparse, base64, json, os, sys, time
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
STATUS = os.path.join(ROOT, '协作', '状态清单.json')
OUT = os.path.join(ROOT, 'tool', 'data', 'render_thumbs.json')


def make_job(jid, only):
    st = json.load(open(STATUS, encoding='utf-8'))
    shots = [{'name': '窗口', 'viewport': [1440, 900], 'shot': False}]
    for e in st['effects']:
        k = e['key']
        if only and k not in only: continue
        if not (e.get('主条目') or e.get('待验收版') or e.get('已通过版')): continue
        shots.append({'name': '缩略图_' + k, 'thumb': 'ef:' + k, 'shot': False, 'view': 'live', 't': 'full', 'sleep': 4000,
                      'js': f"Promise.resolve(openEffect(EFFS().find(e => e.key === {json.dumps(k)}))).then(() => {{ state.disp = 'fit'; state.playing = false; state.layerView = {{ solo: -1, mute: [] }}; }})"})
        # 多层：每层独看一张（观察图层卡片、历史里的层条目用），键 = 这一层的条目号
        for i in range(len(e.get('层英文名') or [])):
            # 时刻：这一层看得见的范围的 40% 处（红点层这种后出现的层，整朵的「展开」时刻还没亮）
            shots.append({'name': f'缩略图_{k}_第{i + 1}层', 'shot': False, 'sleep': 1500,
                          'js': f"(() => {{ if (state.tab !== 'combo' || state.layers.length <= {i}) return; state.layerView = {{ solo: {i}, mute: [] }}; state.playing = false; const sp = layerSpans(curLayerBakes().find(x => x.i === {i})); if (sp) state.t = sp.at(sp.vis[0] + 0.4 * (sp.vis[1] - sp.vis[0])); }})()",
                          'thumb': f"js:(() => {{ if (state.tab !== 'combo' || !state.layers[{i}]) return null; const e = layerEntryOf(state.layers[{i}]); return e && (e.rep || null); }})()"})
        if e.get('层英文名'): shots.append({'name': f'缩略图_{k}_恢复整体', 'shot': False, 'js': "state.layerView = { solo: -1, mute: [] }"})
    n = sum(1 for x in shots if x.get('thumb'))
    job = {'id': jid, 'type': 'ui', 'name': f'渲染缩略图（{n} 张：效果整朵 + 多层每层，按当前配方）', 'priority': 12,
           'note': '只取画布做缩略图，不改东西。结果用 analysis/scripts/渲染缩略图.py --ingest 收进 tool/data/render_thumbs.json。', 'shots': shots}
    p = os.path.join(ROOT, 'analysis', 'jobs', jid + '.json')
    json.dump(job, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('任务', p, n, '张')


def ingest(res):
    rec = json.load(open(os.path.join(res, 'ui.json'), encoding='utf-8'))
    db = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}
    at = time.strftime('%Y-%m-%d %H:%M', time.localtime(os.path.getmtime(os.path.join(res, 'ui.json'))))
    n = 0
    for r in rec:
        if not r.get('thumb') or not r.get('thumb_file'): continue
        f = os.path.join(res, '缩略图', r['thumb_file'])
        if not os.path.exists(f): print('缺', f); continue
        src = 'data:image/jpeg;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
        db[r['thumb']] = {'src': src, 'ver': r.get('thumb_ver') or '', 'at': at, 'job': os.path.basename(res.rstrip('/\\'))}; n += 1
    json.dump(db, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('收进', n, '张 →', OUT)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--job'); ap.add_argument('--effects', default=''); ap.add_argument('--ingest')
    a = ap.parse_args()
    if a.job: make_job(a.job, set(x for x in a.effects.split(',') if x))
    if a.ingest: ingest(a.ingest)
    if not a.job and not a.ingest: ap.print_help()
