"""参数生效审查（对话框FanGold，用户 2026-10-13 12:55「帮我看看参数代码是有没有生效的」）。
  python analysis/scripts/参数生效审查.py --out 目录 [--px 96] [--only key1,key2]
右栏的每一个参数（空中花型在前，再到升空尾缀 / 地面 / 物理尾缀）（数值滑杆、下拉、按寿命曲线）：
  1. 找一个它会显示出来的场景（锦冠默认 → 打开一堆功能的锦冠 → 分叉 / 分簇 / 千轮 / 分裂 / 点灭 / 蜂 / 每米……，按顺序挑第一个让这一行出现的）；
  2. 改一个值（数值：缺省 × 1.5 或范围里的 30 %，超了就 × 0.6；下拉：换一个选项；曲线：填「0:1, 0.5:0.3, 1:0」），
     在固定取景下出两帧（序列 30 % / 70 % 时刻）和改前比，另比取景 / 帧计划（measure + plan）；
  3. 把这个键从参数里删掉（旧存档里没有它），和写缺省比——不一样的，右栏「缺了显示缺省」会骗人。
输出 <out>/参数生效审查.json、参数生效审查.md。画面 / 取景都不变的列为「没看到效果」（可能是真没接上，也可能要别的条件，逐个看）。
"""
import argparse, asyncio, json, pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'

JS_LIST = r"""() => {
  const ctxs = [
    ['kamuro', {}],
    ['kamuro', { emberFrac: 0.3, emberFollow: 0.5, sparkStop: 0.8, sparkRamp: 0.3, tailPinchHead: 0.5, tailPinchTail: 0.3, tailShoulder: 0.3, tailJit: 0.3, headSizeJit: 0.3, headStretch: 0.4, headKnots: 0.5, headLumpy: 0.3, headDouble: 0.3,
      headHex: 0.5, sparkStretch: 0.5, glitter: 0.4, tailDiffuse: 2, tailHaze: 0.01, starBright: 0.3, sparkRise: 0.1, headTear: 0.4, sparkSpawnHead: 0.5, sparkJet: 5, headHaloOwn: 1, sparkQ: 0.3,
      x1On: 1, x1Event: 'trail', x1Kind: 'dot', x2On: 1, x2Event: 'death', x2Kind: 'star', x2Spark: 50, crackle: 30, afterBurn: 0.5, ignDelay: 0.2, keepFrac: 0.8, waterRefl: 0.5, wind: 2, turb: 2, flutter: 0.5, headDim: 0.5, headDimUntil: 0.5 }],
    ['kamuro', { branch: 2 }],
    ['kiku', { pattern: 'cluster', clusterLayout: 'fan', clusterSweep: 0.2, clusterGap: 1, clusterDirJit: 2, clusterStarsJit: 20 }],
    ['kiku', { x1On: 1, x1Event: 'time', x1Kind: 'star', x1Spark: 40, x2On: 1, x2Event: 'birth', x2Kind: 'dot' }],
    ['kiku', { sparkRateBy: 'm' }],
    ['senrin', {}], ['crossette', {}], ['strobe', {}], ['hachi', {}], ['yanagi', {}], ['ochiba', {}], ['palm', {}], ['henka', {}], ['glitter', {}], ['jisa', {}], ['ring', {}], ['saturn', {}], ['kata', {}], ['water', {}], ['matsuba', {}], ['botan', {}],
    ['rise', {}], ['tailM', {}], ['trailM', {}], ['fountain', {}], ['falls', {}], ['wheel', {}], ['fan', {}], ['barrage', {}], ['shikake', {}], ['physM', {}]
  ];
  const mk = ([t, o]) => { const d = defaultsFor(t); return { P: derive({ ...structuredClone(d.P), type: t, ...o }), M: structuredClone(d.M) }; };
  const items = []; const seen = new Set();
  for (const sec of SCHEMA) for (const it of sec.items) {
    const key = Array.isArray(it) ? it[0] : it.sel || it.curve; if (!key || it.info || it.text || seen.has(key)) continue;
    let ci = -1; for (let i = 0; i < ctxs.length; i++) { const { P } = mk(ctxs[i]); try { if ((!sec.show || sec.show(P)) && itemVisible(it, P)) { ci = i; break; } } catch (e) { } }
    if (ci < 0) continue; seen.add(key);
    items.push({ key, sec: sec.sec, kind: Array.isArray(it) ? 'num' : it.sel ? 'sel' : 'curve', ctx: ci, min: Array.isArray(it) ? it[3] : null, max: Array.isArray(it) ? it[4] : null,
      label: Array.isArray(it) ? (typeof it[1] === 'function' ? '(动态)' : it[1]) : it.label, opts: it.sel && Array.isArray(it.options) ? it.options.map(o => o[0]) : null });
  }
  return { defs: ctxs, ctxs: ctxs.map(c => c[0] + (Object.keys(c[1]).length ? '+' + Object.keys(c[1]).length + '项' : '')), items };
}"""

JS_RUN = r"""async (a) => {
  const ctxs = a.ctxDefs;
  const mk = ([t, o], mod) => { const d = defaultsFor(t); let P = { ...structuredClone(d.P), type: t, ...o }; if (mod) mod(P); return { P: derive(P), M: structuredClone(d.M) }; };
  const out = [], base = {}, ctxDefs = a.ctxDefs;
  const planSig = P => { try { const fm = measure(P), pl = plan(P, fm); return JSON.stringify({ F: pl.L.F, c: pl.L.cols, r: pl.L.rows, t: pl.times.map(x => +x.toFixed(4)), HX: +pl.HX.toFixed(3), HY: +pl.HY.toFixed(3), fm: [fm.x0, fm.x1, fm.y0, fm.y1].map(x => +x.toFixed(3)) }); } catch (e) { return 'ERR ' + e.message; } };
  const shot = async (P, M, v) => (await renderStills40(P, M, { times: v.times, px: a.px, cx: v.cx, cy: v.cy, half: v.half })).map(s => s.png).join('|');
  for (const it of a.items) {
    const cd = ctxDefs[it.ctx];
    if (!base[it.ctx]) { const { P, M } = mk(cd); const fm = measure(P), T = P.duration, w = Math.max(fm.x1 - fm.x0, fm.y1 - fm.y0) / 2 * 1.05;
      const v = { times: [+(0.3 * T).toFixed(3), +(0.7 * T).toFixed(3)], cx: (fm.x0 + fm.x1) / 2, cy: (fm.y0 + fm.y1) / 2, half: Math.max(5, w) };
      const img = await shot(P, M, v); base[it.ctx] = { v, img, plan: planSig(P), P, noisy: (await shot(P, M, v)) !== img }; }
    const B = base[it.ctx], cur = B.P[it.key]; let nv;
    if (it.kind === 'num') { const lo = it.min, hi = it.max, d = +cur; if (!isFinite(d)) nv = (lo + hi) / 2; else { nv = d === 0 ? lo + (hi - lo) * 0.3 : d * 1.5; if (nv > hi || nv < lo) nv = d * 0.6; if (nv < lo || nv > hi || nv === d) nv = (lo + hi) / 2 === d ? lo + (hi - lo) * 0.8 : (lo + hi) / 2; } }
    else if (it.kind === 'sel') { nv = (it.opts || []).find(o => String(o) !== String(cur)); }
    else nv = '0:1, 0.5:0.3, 1:0';
    const r = { key: it.key, sec: it.sec, label: it.label, ctx: it.ctx, from: cur === undefined ? '(缺)' : cur, to: nv, noisy: B.noisy };
    try {
      if (nv === undefined) { r.skip = '没有别的选项'; out.push(r); continue; }
      const { P, M } = mk(cd, P => { P[it.key] = nv; });
      r.img = (await shot(P, M, B.v)) !== B.img; r.plan = planSig(P) !== B.plan;
      const m2 = mk(cd, P => { delete P[it.key]; }); r.missImg = (await shot(m2.P, m2.M, B.v)) !== B.img; r.missPlan = planSig(m2.P) !== B.plan;
    } catch (e) { r.err = String(e && e.message || e); }
    out.push(r);
  }
  return out;
}"""

CTX_DEFS = None


async def main(a):
    from browser_runtime import launch_async
    from playwright.async_api import async_playwright
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b = await launch_async(p); pg = await b.new_page(viewport={'width': 1200, 'height': 900})
        await pg.goto(HTML.resolve().as_uri() + '?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof renderStills40 === "function" && typeof SCHEMA !== "undefined"', timeout=0)
        L = await pg.evaluate(JS_LIST)
        ctx_defs = L['defs']
        items = L['items']
        if a.only: items = [i for i in items if i['key'] in a.only.split(',')]
        print('参数', len(items), '场景', L['ctxs'], flush=True)
        res = []
        for k in range(0, len(items), 20):
            part = await pg.evaluate(JS_RUN, {'items': items[k:k + 20], 'ctxDefs': ctx_defs, 'px': a.px})
            res += part; print(f'{min(k + 20, len(items))}/{len(items)}', flush=True)
        await b.close()
    names = {r['key']: r for r in json.loads((ROOT / 'analysis' / '命名' / '发射器表.json').read_text(encoding='utf-8'))['参数']}
    for r in res:
        n = names.get(r['key'], {}); r['发射器'] = n.get('发射器', ''); r['模块'] = n.get('模块', ''); r['名'] = n.get('名', ''); r['类别'] = n.get('类别', '')
    (out / '参数生效审查.json').write_text(json.dumps({'ctxs': L['ctxs'], 'res': res}, ensure_ascii=False, indent=1), encoding='utf-8')
    dead = [r for r in res if not r.get('skip') and not r.get('err') and not r.get('img') and not r.get('plan')]
    planonly = [r for r in res if not r.get('img') and r.get('plan')]
    miss = [r for r in res if r.get('missImg') or r.get('missPlan')]
    errs = [r for r in res if r.get('err')]
    noisy = sorted({L['ctxs'][r['ctx']] for r in res if r.get('noisy')})
    def row(r): return f"| {r['key']} | {r.get('发射器','')} › {r.get('模块','')} · {r.get('名','') or r['label']} | {r.get('类别','')} | {L['ctxs'][r['ctx']]} | {r['from']} → {r['to']} |"
    md = [f'# 参数生效审查（{len(res)} 个参数）', '', f"场景：{'、'.join(f'{i} {c}' for i, c in enumerate(L['ctxs']))}", '',
          (f"⚠ 这些场景同参数出两次画面不一样（随机没固定），它们的「画面变了」不可信：{'、'.join(noisy)}" if noisy else '同参数出两次画面一致（结果可信）。'), '',
          f'## 改了画面、取景都不变（{len(dead)} 个，候选「没生效」，逐个看）', '', '| 键 | 位置 | 类别 | 场景 | 改值 |', '|---|---|---|---|---|'] + [row(r) for r in dead] + \
         ['', f'## 只改了取景 / 帧计划、两帧画面不变（{len(planonly)} 个）', '', '| 键 | 位置 | 类别 | 场景 | 改值 |', '|---|---|---|---|---|'] + [row(r) for r in planonly] + \
         ['', f'## 缺了（旧存档没有这个键）和写缺省画面 / 取景不一样（{len(miss)} 个）', '', '| 键 | 位置 | 类别 | 场景 | 缺省 | 画面 | 取景 |', '|---|---|---|---|---|---|---|'] + \
         [f"| {r['key']} | {r.get('发射器','')} › {r.get('模块','')} · {r.get('名','')} | {r.get('类别','')} | {L['ctxs'][r['ctx']]} | {r['from']} | {'变' if r.get('missImg') else ''} | {'变' if r.get('missPlan') else ''} |" for r in miss] + \
         ['', f'## 出错 / 跳过（{len(errs) + sum(1 for r in res if r.get("skip"))} 个）', ''] + [f"- {r['key']}：{r.get('err') or r.get('skip')}" for r in res if r.get('err') or r.get('skip')]
    (out / '参数生效审查.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
    print(f'参数 {len(res)}：没看到效果 {len(dead)}、只改取景 {len(planonly)}、缺了≠缺省 {len(miss)}、出错 {len(errs)}')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--out', required=True); ap.add_argument('--px', type=int, default=96); ap.add_argument('--only', default='')
    asyncio.run(main(ap.parse_args()))
