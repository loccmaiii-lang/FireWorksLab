"""存档逐层体检（对话框相机渲染，2026-10-14；用户 13:09「为什么我新创建的金曜菊-B调没有效果？……旧的存好了的文件，都没有接入……有什么办法排查一下」）。
（同目录的 存档参数体检.py 是第一版，取样时刻按序列比例、会漏掉燃烧时间短的层；以这一版为准。）

在用户真实存档上（不是默认花型）逐层逐项实测三件事，对不上的列出来：
  ① 右栏有没有这一行；② 这一行是不是变灰（「现在不起作用」规则，悬停写原因）；③ 改一个值，画面变不变。
  python analysis/scripts/存档逐层体检.py [--out 目录] [--px 256] [--only 名字片段] [--keys k1,k2] [--html 旧版.html]
存档：analysis/我的配方/*/*.json（保存「我的效果」时同时写进仓库的那份）。打开时和界面一样过 migrate37；缺的键按右栏显示的值算。
出图：固定取景（整朵花 + 偏外侧放大 5 倍）× 三个时刻（燃烧期 35 % / 75 %、燃尽后半个火花寿命），改前改后逐像素比；同参数先出两次确认画面可重复。
  对照：每层先改「贴图曝光」，画面不变的层说明取景 / 时刻没抓到东西，这一层不判。
判定：生效 = 显示、没变灰、画面变了；写了原因 = 变灰、画面没变；不显示 = 右栏没这行；
      ❌ 骗人 = 显示、没变灰、画面却不变（接线断了，或被别的参数盖住了却没写原因）；⚠ 灰错 = 变灰了、画面却变了。
开关类（星头光晕 跟层 / 单独）切的时候带一个和层不一样的占比，不然切了等于没切。
升空尾缀（循环层 + 粒子）/ 尾缀序列 / 物理尾缀的定帧画不出来，只列出、不判。退出码 0 = 没有 ❌ / ⚠。
本机显卡跑（Python312 + PYTHONPATH 带 playwright），和 run_jobs.py 共用显卡锁。
"""
import argparse, base64, collections, glob, io, json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'analysis', 'local'))

# 探测的参数：曝光光晕一节（用户这次调的）+ 4.9.50 以后加的星头 / 火花 / 镜头功能。exposure 是对照
KEYS = ['exposure', 'haloFrac', 'haloR', 'haloShape', 'haloBeta', 'coreProfile',
        'headHaloOwn', 'headHaloFrac', 'headHaloR', 'headStretch', 'headSizeJit', 'headHex',
        'sparkShape', 'sparkBrightJit', 'sparkStretch', 'sparkLateWind', 'cameraMotion']

JS = r"""async (a) => {
  const find = k => { for (const s of SCHEMA) for (const it of s.items || []) { const kk = Array.isArray(it) ? it[0] : it.sel || it.curve; if (kk === k) return [s, it]; } return null; };
  const drawable = P => familyOf(P.type) !== 'rise' || (!isEmit(P) && !isTrail(P) && !isPhys(P));
  const out = [];
  for (const L of a.layers) {
    const row = { name: L.name, li: L.li, title: L.title, type: L.type, res: [] };
    const P0 = migrate37(structuredClone(L.P)), M = structuredClone(L.M || defaultsFor(L.type).M), D = defaultsFor(P0.type).P;
    if (!drawable(P0) || !isSeq(P0)) { row.skip = '升空尾缀 / 尾缀序列 / 物理尾缀：定帧画不出来，没判'; out.push(row); continue; }
    const Pd = derive({ ...fxP(P0) }), fm = measure(Pd), T = familyOf(P0.type) === 'ground' ? (P0.loopT || P0.duration) : P0.duration;
    const tb = familyOf(P0.type) === 'aerial' ? (isCarrierType(P0) ? +P0.subDelay + (+P0.subBurn || 1) : +P0.burn + (+P0.ignDelay || 0)) : T;
    const times = [...new Set([0.35 * Math.min(tb, T), 0.75 * Math.min(tb, T), Math.min(0.97 * T, tb + 0.5 * (+P0.sparkLife || 0.5))].map(x => +x.toFixed(3)))];
    const w = Math.max(fm.x1 - fm.x0, fm.y1 - fm.y0) / 2 * 1.05, cx = (fm.x0 + fm.x1) / 2, cy = (fm.y0 + fm.y1) / 2;
    const views = [{ cx, cy, half: Math.max(5, w) }, { cx: cx + 0.55 * w, cy, half: Math.max(1, w * 0.2) }];
    const shot = async P => { const r = []; for (const v of views) for (const s of await renderStills40(P, M, { times, px: a.px, cx: v.cx, cy: v.cy, half: v.half })) r.push(s.png); return r; };
    const base = await shot(P0), again = await shot(P0); row.noisy = base.some((u, i) => u !== again[i]); row.base = base; row.times = times;
    for (const k of a.keys) {
      const f = find(k); const r = { key: k };
      if (!f) { r.v = 'none'; row.res.push(r); continue; }
      const [sec, it] = f; let vis = false; try { vis = (!sec.show || !!sec.show(P0)) && itemVisible(it, P0); } catch (e) { }
      const cur = shownParam(P0, k, D), iw = inertWhy(k, P0);
      let nv;
      if (Array.isArray(it)) { const lo = +it[3], hi = +it[4], c = +cur; nv = !isFinite(c) || c === 0 ? lo + 0.4 * (hi - lo) : (c * 2 <= hi ? c * 2 : c / 2); if (k === 'exposure') nv = c * 1.6; nv = +nv.toFixed(4); }
      else if (it.sel && Array.isArray(it.options)) { const o = it.options.map(x => x[0]); nv = o.find(x => String(x) !== String(cur)); }
      Object.assign(r, { sec: sec.sec, label: Array.isArray(it) ? (typeof it[1] === 'function' ? '' : it[1]) : it.label, vis, inert: iw, from: cur === undefined ? null : cur, to: nv });
      if (nv === undefined) { r.v = 'skip'; row.res.push(r); continue; }
      const extra = k === 'headHaloOwn' && +nv === 1 ? { headHaloFrac: (+P0.haloFrac || .22) < .4 ? .6 : .1 } : {};
      if (extra.headHaloFrac != null) r.to = nv + '（占比 ' + extra.headHaloFrac + '）';
      // 路径参数也按真实面板写入；浅拷贝会污染原配方或把路径误写成普通键。
      const changed=structuredClone(P0);pSet(changed,k,nv);Object.assign(changed,extra);
      if(changed.sparkGraph){try{SparkGraph.validate(changed.sparkGraph);}catch(e){nv=+(+cur*.5).toFixed(4);pSet(changed,k,nv);r.to=nv;SparkGraph.validate(changed.sparkGraph);}}
      r.mod = await shot(changed);
      row.res.push(r);
    }
    out.push(row);
  }
  return { out, ver: VERSION };
}"""


def img(u): return np.asarray(Image.open(io.BytesIO(base64.b64decode(u.split(',', 1)[1]))).convert('RGB'), dtype=np.int16)


def verdict(r):
    if r.get('v') in ('none', 'skip'): return r['v'], ''
    ch = r.get('max', 0) > 1
    if not r['vis']: return '不显示', ''
    if r['inert']: return ('⚠ 灰错' if ch else '写了原因'), r['inert']
    return ('生效' if ch else '❌ 骗人'), ''


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default=os.path.join(ROOT, 'analysis', 'probe', '存档逐层体检'))
    ap.add_argument('--px', type=int, default=256); ap.add_argument('--only', default=''); ap.add_argument('--keys', default='')
    ap.add_argument('--html', default='', help='换一个烘焙器（如修之前的版本，放在 tool/ 下），缺省 tool/FireworkBaker.html')
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
    keys = a.keys.split(',') if a.keys else KEYS
    layers = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'analysis', '我的配方', '*', '*.json'))):
        d = json.load(open(f, encoding='utf-8')); s = d.get('snap') or {}
        if a.only and a.only not in d.get('name', ''): continue
        for i, l in enumerate(s.get('layers') or []):
            P = l.get('P') or {}
            layers.append(dict(name=d.get('name'), saved=d.get('tool'), li=i + 1, title=(l.get('L') or {}).get('title') or '', type=l.get('type') or P.get('type'), P=P, M=l.get('M')))
    import compare
    if a.html:
        import pathlib; compare.TOOL = pathlib.Path(a.html).resolve().as_uri() + '?fast'
    try:
        from job_lock import ProcessLock, gpu_lock_path
        lock = ProcessLock(gpu_lock_path(ROOT))
    except Exception:
        lock = None
    rows, ver = [], ''
    with (lock if lock else open(os.devnull)):
        s = compare.SimSession()
        try:
            for k in range(0, len(layers), 3):
                part = layers[k:k + 3]
                r = s.pg.evaluate(JS, dict(layers=part, keys=keys, px=a.px)); ver = r['ver']
                for row, src in zip(r['out'], part):
                    row['saved'] = src['saved']; base = [img(u) for u in row.pop('base', [])]
                    for x in row['res']:
                        mod = x.pop('mod', None)
                        if mod: x['max'] = int(max(int(np.abs(img(m) - b).max()) for m, b in zip(mod, base)))
                        x['verdict'], x['why'] = verdict(x)
                    ex = next((x for x in row['res'] if x['key'] == 'exposure'), None)
                    if not row.get('skip') and ex and ex.get('max', 0) <= 1: row['blind'] = '改「贴图曝光」画面也不变：取景 / 时刻没抓到东西，这一层不判'
                    rows.append(row)
                print(f'{min(k + 3, len(layers))}/{len(layers)} 层', flush=True)
        finally:
            s.close()
    judged = [r for r in rows if not r.get('skip') and not r.get('blind')]
    bad = [(r, x) for r in judged for x in r['res'] if x['verdict'] in ('❌ 骗人', '⚠ 灰错')]
    json.dump(dict(ver=ver, keys=keys, rows=rows), open(os.path.join(a.out, '存档逐层体检.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    src = {(l['name'], l['li']): l['P'] for l in layers}
    def ctx(r):
        P = src[(r['name'], r['li'])]
        return f"星头亮度 {P.get('headBright')}、火花生成率 {P.get('sparkRate')}、火花大小 {P.get('sparkSize')}、星头光晕 {P.get('headHaloOwn', '(无)')} / 占比 {P.get('headHaloFrac', '(无)')}"
    md = [f'# 存档逐层体检（烘焙器 {ver}，{len(rows)} 层，判了 {len(judged)} 层，{len(keys)} 个参数）', '',
          '判定：生效 = 显示、没变灰、画面变了；写了原因 = 变灰、画面没变；不显示 = 右栏没这行；**❌ 骗人** = 显示、没变灰、画面不变；**⚠ 灰错** = 变灰了画面却变。', '',
          f'## 要修的（{len(bad)} 处）', '', '| 效果 | 层 | 参数 | 判定 | 改值 | 这一层的情况 |', '|---|---|---|---|---|---|']
    md += [f"| {r['name']} | {r['li']} {r['title']}（{r['type']}） | {x.get('label') or x['key']}（{x['key']}） | {x['verdict']} | {x.get('from')} → {x.get('to')} | {ctx(r)} |" for r, x in bad]
    c = collections.defaultdict(collections.Counter)
    for r in judged:
        for x in r['res']: c[x['key']][x['verdict']] += 1
    md += ['', '## 按参数汇总（判了的层）', '', '| 参数 | ' + ' | '.join(['生效', '写了原因', '不显示', '❌ 骗人', '⚠ 灰错']) + ' |', '|---|---|---|---|---|---|']
    md += [f"| {k} | " + ' | '.join(str(c[k][v]) for v in ['生效', '写了原因', '不显示', '❌ 骗人', '⚠ 灰错']) + ' |' for k in keys]
    md += ['', '## 每层', '']
    for r in rows:
        head = f"### {r['name']} · 第 {r['li']} 层 {r['title']}（{r['type']}，存于 {r['saved']}）"
        if r.get('skip') or r.get('blind'): md += [head, '', r.get('skip') or r.get('blind'), '']; continue
        md += [head, '', f"时刻 {r.get('times')}" + ('；⚠ 同参数出两次画面不一样，结果不可信' if r.get('noisy') else ''), '', '| 参数 | 判定 | 改值 | 最大差 | 原因 |', '|---|---|---|---|---|']
        md += [f"| {x.get('label') or x['key']}（{x['key']}） | {x['verdict']} | {x.get('from')} → {x.get('to')} | {x.get('max', '')} | {x.get('why', '')} |" for x in r['res'] if x['verdict'] != 'none']
        md.append('')
    open(os.path.join(a.out, '存档逐层体检.md'), 'w', encoding='utf-8').write('\n'.join(md) + '\n')
    tot = collections.Counter(x['verdict'] for r in judged for x in r['res'])
    print('烘焙器', ver, '· 判了', len(judged), '层 ·', dict(tot)); print('没判：', [(r['name'], r['li'], r.get('skip') or r.get('blind')) for r in rows if r.get('skip') or r.get('blind')])
    print('要修', len(bad))
    for r, x in bad: print('  ', r['name'], r['li'], r['type'], x['key'], x['verdict'], x.get('from'), '→', x.get('to'))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
