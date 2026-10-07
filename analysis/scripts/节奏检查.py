"""节奏检查（烘焙器 4.9.30「效果 › 整体调整 › 节奏」，对话框新花型，用户 2026-10-07 13:31）。
  python3 analysis/scripts/节奏检查.py [--out 目录] [--stills]
查：
  T1 节奏 1 = 原样：retimeP(P, 1) 一个数不变；没有 tempo 键的参数按 1 算。
  T2 来回换算：k 再 1/k，所有数相对差 < 1e-5（花型默认 + 几个条目）。
  T3 物理等价（真模拟 Sim）：节奏 k 下 t 时刻每颗星的位置 = 原样 k·t 时刻的位置（误差 / 花半径：按编号配对中位 < 0.5%；按最近的星配对 95% < 2%——子星编号按生成先后，两边步长不同会换顺序），在烧的星一样。
  T4 界面：单层（变色菊，5 段变色）和多层模板（芯入牡丹，2 层）用 applyTempo 换到 1.25 再回 1——所有层一起变、开始时间 / 变色时刻跟着、
     回到 1 后参数和颜色和打开时一样；右栏「效果 › 整体调整」有「节奏」一行和结果行。
  T5（--stills，慢，本机跑）：定帧画面——节奏 1.5 在 t 的画面 vs 原样在 1.5·t 的画面，平均差 / 平均亮度 < 8%。
输出 <out>/节奏检查.json；有不过的退出码 1，脚本出错退出码 2。
"""
import argparse, asyncio, json, pathlib, sys, base64, io
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'

JS_CORE = r"""() => {
  const out = { fails: [], notes: [] };
  const types = ['kiku', 'botan', 'kamuro', 'yanagi', 'senrin', 'henka', 'strobe', 'glitter', 'crackle', 'crossette', 'jisa', 'palm', 'ring'];
  const Ps = types.map(t => ({ name: t, P: derive({ ...structuredClone(defaultsFor(t).P), type: t }) }));
  for (const id of ['JMG03', 'JMG10', 'MYJA-S10-1', 'MYJC-O-2', 'MYHK-O-1']) { try { const { P } = replicaPM(id); Ps.push({ name: id, P: structuredClone(P) }); } catch (e) { out.notes.push('没有条目 ' + id); } }
  const num = P => Object.fromEntries(Object.entries(P).filter(([k, v]) => typeof v === 'number'));
  // T1
  for (const { name, P } of Ps) { const a = JSON.stringify(P), b = JSON.stringify(retimeP(structuredClone(P), 1)); if (a !== b) out.fails.push(`T1 ${name}：节奏 1 改了数`); if (tempoOf({}) !== 1) out.fails.push('T1 没有 tempo 键不是 1'); }
  // T2
  let worst = 0;
  for (const { name, P } of Ps) for (const k of [1.37, 0.71, 2.2]) {
    const a = num(P), b = num(retimeP(retimeP(structuredClone(P), k), 1 / k));
    for (const q in a) { const d = Math.abs(a[q] - b[q]) / Math.max(1e-9, Math.abs(a[q])); if (d > worst) worst = d; if (d > 1e-5) out.fails.push(`T2 ${name} ×${k}：${q} ${a[q]} → ${b[q]}`); }
  }
  out.T2_worst = worst;
  // T3：真模拟
  const simAt = (P, times) => { const s = new Sim(P), res = []; s.noSparks = true;     // 只比星（火花是星甩出来的，星对了火花就对；火花几十万颗，云端跑不动）
    for (const T of times) { while (s.t < T - 1e-9) s.step(H_STEP); const m = new Map(); for (const st of s.stars) if (st.alive) m.set(st.id, [st.x, st.y, st.z || 0, s.headI(st) > 0]); res.push(m); } return res; };
  out.T3 = [];
  for (const { name, P } of Ps.filter(x => ['kiku', 'yanagi', 'senrin', 'henka', 'strobe', 'crossette', 'jisa', 'JMG03'].includes(x.name))) for (const k of [1.333, 0.8]) {
    const Q = derive(retimeP(structuredClone(P), k)), end = Math.min(+P.duration, 6), ts = [0.15, 0.3, 0.5, 0.7, 0.9].map(f => f * end / k);
    const A = simAt(P, ts.map(t => t * k)), B = simAt(Q, ts);
    let R = 1; for (const m of A) for (const v of m.values()) R = Math.max(R, Math.hypot(v[0], v[1], v[2]));
    const errs = [], cham = []; let onMis = 0, n = 0, miss = 0;
    A.forEach((ma, i) => { const mb = B[i]; for (const [id, va] of ma) { const vb = mb.get(id); if (!vb) { miss++; continue; } n++; errs.push(Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]) / R); if (va[3] !== vb[3]) onMis++; } });
    // 按最近的星配对（倒角距离）：分裂 / 子花的子星编号按生成先后排，两边步长不同、同一步里生成的先后会换，按编号配会配错人
    A.forEach((ma, i) => { const pb = [...B[i].values()]; for (const va of ma.values()) { let d = Infinity; for (const vb of pb) { const q = Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]); if (q < d) d = q; } cham.push(d / R); } });
    errs.sort((a, b) => a - b); cham.sort((a, b) => a - b); const med = errs.length ? errs[errs.length >> 1] : 1, p95 = cham.length ? cham[Math.floor(cham.length * 0.95)] : 1, p95id = errs.length ? errs[Math.floor(errs.length * 0.95)] : 1;
    const r = { name, k, n, miss, med: +med.toFixed(5), p95: +p95.toFixed(5), p95id: +p95id.toFixed(5), onMis: n ? +(onMis / n).toFixed(4) : 1 };
    out.T3.push(r);
    if (med > 0.005 || p95 > 0.02) out.fails.push(`T3 ${name} ×${k}：位置误差 中位 ${(med * 100).toFixed(2)}% / 95%（最近配对）${(p95 * 100).toFixed(2)}%`);
    if (r.onMis > 0.03) out.fails.push(`T3 ${name} ×${k}：在烧的星对不上 ${(r.onMis * 100).toFixed(1)}%`);
    if (miss > Math.max(3, 0.03 * (n + miss))) out.fails.push(`T3 ${name} ×${k}：一边有一边没有的星 ${miss}`);
  }
  return out; }"""

JS_UI_SINGLE = r"""async () => { const fails = [];
  openType('henka'); await new Promise(r => setTimeout(r, 300));
  const P0 = JSON.stringify(state.P), M0 = JSON.stringify(state.M), b0 = +state.P.burn, s0 = state.M.stages.map(s => s[0]);
  applyTempo(1.25);
  if (Math.abs(state.P.tempo - 1.25) > 1e-9) fails.push('单层：tempo 没记成 1.25');
  if (Math.abs(+state.P.burn - b0 / 1.25) > 1e-4) fails.push(`单层：燃烧 ${b0} → ${state.P.burn}（应 ÷1.25）`);
  if (state.M.stages.some((s, i) => Math.abs(s[0] - s0[i] / 1.25) > 1e-4)) fails.push('单层：变色时刻没跟着 ÷1.25');
  const row = document.querySelector('#params [data-info=tempoInfo]'); if (!row || !/节奏/.test(row.textContent)) fails.push('单层：右栏没有节奏结果行');
  const sl = document.querySelector('#params [id^="p-tempo-"]'); if (!sl) fails.push('单层：右栏没有「节奏」滑杆');
  applyTempo(1);
  const P1 = JSON.parse(JSON.stringify(state.P)), Pa = JSON.parse(P0);
  for (const k in Pa) if (typeof Pa[k] === 'number' && Math.abs(Pa[k] - P1[k]) > 1e-5 * Math.max(1, Math.abs(Pa[k])) && k !== 'tempo') fails.push(`单层回到 1：${k} ${Pa[k]} → ${P1[k]}`);
  if (JSON.stringify(state.M.stages.map(s => +s[0].toFixed(5))) !== JSON.stringify(JSON.parse(M0).stages.map(s => +s[0].toFixed(5)))) fails.push('单层回到 1：变色时刻没回来');
  // T6 号数带默认节奏（游戏紧凑）：菊选 10 号 → 整段 ≈ 1.4 × 号数表燃烧（只快不慢）
  openType('kiku'); await new Promise(r => setTimeout(r, 300));
  applyShellLocked(10); const want = tempoCompactEnd(state.P, 10), end = tempoLayerEnd(state.P);
  if (!(state.P.tempo > 1)) fails.push(`T6 菊 10 号：节奏没加快（tempo = ${state.P.tempo}）`);
  if (Math.abs(end - want) > 0.02 * want) fails.push(`T6 菊 10 号：整段 ${end.toFixed(3)} s，游戏紧凑目标 ${want.toFixed(3)} s`);
  const t6 = { tempo: state.P.tempo, end, want, burn: state.P.burn };
  applyTempo(1); const real = tempoLayerEnd(state.P);
  return { fails, row: row ? row.textContent.slice(0, 200) : null, t6: { ...t6, real } }; }"""

JS_UI_COMBO = r"""async () => { const fails = [];
  await openMultiType('shinBotan'); await new Promise(r => setTimeout(r, 500));
  if (state.tab !== 'combo') return { fails: ['多层：没打开成多层（state.tab = ' + state.tab + '）'] };
  if (state.layers.length > 1) state.layers[1].delay = 0.4;     // 模板两层都从 0 开始：给第 2 层一个开始时间，查它跟着 ÷k
  const snap = () => state.layers.map(L => { const e = layerEntryOf(L); return { delay: +L.delay || 0, stages: (L.stages || []).map(s => s[0]), P: JSON.parse(JSON.stringify(e.P)) }; });
  const a = snap();
  if (state.comboSel == null || state.comboSel < 0) { try { selectLayer && selectLayer(1); } catch (e) { } }
  applyTempo(1.25);
  const b = snap();
  b.forEach((x, i) => { if (Math.abs(x.P.tempo - 1.25) > 1e-9) fails.push(`多层第 ${i + 1} 层 tempo = ${x.P.tempo}`);
    if (Math.abs(x.P.burn - a[i].P.burn / 1.25) > 1e-4) fails.push(`多层第 ${i + 1} 层燃烧没跟着`);
    if (x.stages.some((t, j) => Math.abs(t - a[i].stages[j] / 1.25) > 1e-4)) fails.push(`多层第 ${i + 1} 层变色时刻没跟着`); });
  const d0 = Math.min(...a.map(x => x.delay)); b.forEach((x, i) => { const want = d0 + (a[i].delay - d0) / 1.25; if (Math.abs(x.delay - want) > 1e-4) fails.push(`多层第 ${i + 1} 层开始时间 ${a[i].delay} → ${x.delay}（应 ${want.toFixed(4)}）`); });
  applyTempo(1);
  const c = snap();
  c.forEach((x, i) => { for (const k in a[i].P) if (typeof a[i].P[k] === 'number' && k !== 'tempo' && Math.abs(a[i].P[k] - x.P[k]) > 1e-5 * Math.max(1, Math.abs(a[i].P[k]))) fails.push(`多层回到 1 第 ${i + 1} 层 ${k}：${a[i].P[k]} → ${x.P[k]}`);
    if (Math.abs(x.delay - a[i].delay) > 1e-5) fails.push(`多层回到 1 第 ${i + 1} 层开始时间没回来`); });
  return { fails, layers: a.length, delays: a.map(x => x.delay) }; }"""

JS_STILLS = r"""async (a) => { const P = derive({ ...structuredClone(defaultsFor(a.type).P), type: a.type }), M = normalizeM(structuredClone(defaultsFor(a.type).M), a.type);
  const Q = derive(retimeP(structuredClone(P), a.k)), N = retimeM(structuredClone(M), a.k);
  const half = 1.15 * Math.max(60, (+P.burstR0 || 0) + reachOf(P.v0, P.vt, P.burn));
  const A = await mtRenderLayers([{ P, M, delay: 0, scale: 1, headInt: 1 }], { times: a.ts.map(t => t * a.k), px: a.px, half });
  const B = await mtRenderLayers([{ P: Q, M: N, delay: 0, scale: 1, headInt: 1 }], { times: a.ts, px: a.px, half });
  return { A: A.map(x => x.png), B: B.map(x => x.png) }; }"""


async def run(a):
    from browser_runtime import launch_async
    from playwright.async_api import async_playwright
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    res = {'fails': []}
    async with async_playwright() as p:
        b = await launch_async(p)
        # 和 界面状态检查.py 一样：真页面 + 假烘焙（按真的取景 + 取帧计划造烘焙结果，不碰显卡），云端几十秒
        import importlib; ui = importlib.import_module('界面状态检查')
        ctx, pg, errs = await ui.fresh(p, b)
        await pg.wait_for_function('typeof applyTempo === "function" && typeof replicaPM === "function"', timeout=0)
        res['version'] = await pg.evaluate('VERSION')
        core = await pg.evaluate(JS_CORE); res['core'] = core; res['fails'] += core['fails']; print('T1–T3', len(core['fails']), '个不过', flush=True)
        (out / '节奏检查.json').write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding='utf-8')     # 先存一份（多层那步在云端要烘好几层，慢）
        for nm, js in ((('单层', JS_UI_SINGLE), ('多层', JS_UI_COMBO)) if not a.core else ()):
            try: r = await pg.evaluate(js)
            except Exception as e: r = {'fails': [f'{nm}：脚本出错 {e}']}
            res['ui_' + nm] = r; res['fails'] += r['fails']; print('T4', nm, len(r['fails']), '个不过', flush=True)
        if a.stills:
            import numpy as np
            from PIL import Image
            dec = lambda s: np.asarray(Image.open(io.BytesIO(base64.b64decode(s.split(',', 1)[1]))).convert('RGB'), dtype=np.float32)
            res['T5'] = []
            for ty in ('henka', 'kiku', 'strobe'):
                r = await pg.evaluate(JS_STILLS, {'type': ty, 'k': 1.5, 'ts': [0.3, 0.8, 1.4, 2.0], 'px': 160})
                for i, (x, y) in enumerate(zip(r['A'], r['B'])):
                    A, B = dec(x), dec(y); rel = float(np.abs(A - B).mean() / max(1e-3, (A.mean() + B.mean()) / 2))
                    res['T5'].append({'type': ty, 'i': i, 'rel': round(rel, 4)})
                    if rel > 0.08: res['fails'].append(f'T5 {ty} 第 {i + 1} 张：画面差 {rel:.1%}')
                    if i == 1: Image.fromarray(np.concatenate([A, B], 1).astype(np.uint8)).save(out / f'T5_{ty}.png')
                print('T5', ty, flush=True)
        if errs: res['fails'] += ['页面报错：' + e for e in errs[:5]]
        await b.close()
    (out / '节奏检查.json').write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding='utf-8')
    print('✅ 节奏检查全过' if not res['fails'] else '❌ ' + '\n  '.join(res['fails'][:30]))
    return 0 if not res['fails'] else 1


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default=str(ROOT / 'analysis' / 'probe' / '节奏')); ap.add_argument('--stills', action='store_true'); ap.add_argument('--core', action='store_true', help='只跑 T1–T3')
    try: code = asyncio.run(run(ap.parse_args()))
    except Exception:
        import traceback; traceback.print_exc(); code = 2
    raise SystemExit(code)
