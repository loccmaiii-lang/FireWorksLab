"""扇面簇检查（烘焙器 4.9.34「扇面 N 簇」+「簇依次出膛」，对话框FanGold，用户 2026-10-07 18:40 批）。
  python3 analysis/scripts/扇面簇检查.py [--out 目录]
查（只跑模拟，不渲染，云端几十秒）：
  F1 缺省不进新代码：所有分簇模板 / 花型默认的 dirsFor 每项只有 4 个数（没有出发时刻），Sim 里星的 birth 全是 0。
  F2 扇面方向：扇面 N 簇、总张角 f，各簇中心方位 = 90° + f/2 − i·f/(N−1)（第 0 簇最左），1 簇朝正上。
  F3 依次出膛：clusterSweep = s 时第 k 簇的出发时刻 = k/(N−1)·s（负数倒序）；出发前星停在原点、星头不亮；出发后才动。
  F4 闪光 / 「开花时」自定义发射器跟着各簇出发时刻。
  F5 依次出膛 = 0 和不写这个键逐位相同（同一组星的位置、速度）。
输出 <out>/扇面簇检查.json；有不过的退出码 1。
"""
import argparse, asyncio, json, pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'

JS = r"""() => {
  const out = { fails: [], notes: [] }, D = 180 / Math.PI;
  // F1：分簇模板（多层模板里的分簇层）+ 花型默认
  const Ps = Object.keys(TYPES).filter(t => familyOf(t) === 'aerial').map(t => ({ name: t, P: derive({ ...structuredClone(defaultsFor(t).P), type: t }) }));
  if (typeof MULTI_TYPES !== 'undefined') for (const m of MULTI_TYPES) for (const L of (m.layers || [])) if (L.p && L.p.pattern === 'cluster') { try { Ps.push({ name: m.id + '/' + L.en, P: derive({ ...structuredClone(defaultsFor(L.type || 'kiku').P), ...L.p, type: L.type || 'kiku' }) }); } catch (e) {} }
  let nClu = 0;
  for (const { name, P } of Ps) {
    if (P.pattern === 'cluster') nClu++;
    const d = dirsFor(P, new RNG(P.seed)); if (d.some(x => x.length !== 4)) out.fails.push(`F1 ${name}：dirsFor 多了出发时刻`);
    const s = new Sim(P); if (s.stars.some(st => st.birth !== 0)) out.fails.push(`F1 ${name}：有星 birth ≠ 0`);
  }
  out.F1 = { 条目: Ps.length, 分簇: nClu };
  // F2
  const base = { ...structuredClone(defaultsFor('kamuro').P), type: 'kamuro', pattern: 'cluster', clusterLayout: 'fan', clusterCone: 0, dirJit: 0, speedJit: 0 };
  for (const [N, f] of [[11, 90], [4, 60], [1, 90]]) {
    const P = derive({ ...base, clusterN: N, clusterFan: f, stars: N });
    const C = clusterCenters(P, null, null);
    C.forEach((c, i) => { const want = 90 + (N > 1 ? f / 2 - i * f / (N - 1) : 0), got = Math.atan2(c[1], c[0]) * D; if (Math.abs(got - want) > 1e-6) out.fails.push(`F2 N=${N} f=${f} 第 ${i} 簇 ${got.toFixed(3)} ≠ ${want}`); });
  }
  // F3
  for (const sw of [0.38, -0.38]) {
    const N = 11, P = derive({ ...base, clusterN: N, clusterFan: 90, stars: N * 3, clusterSweep: sw });
    const d = dirsFor(P, new RNG(P.seed));
    d.forEach((x, i) => { const ci = i % N, want = (sw > 0 ? ci : N - 1 - ci) / (N - 1) * Math.abs(sw); if (Math.abs((x[4] || 0) - want) > 1e-9) out.fails.push(`F3 sweep ${sw} 星 ${i} 出发 ${x[4]} ≠ ${want}`); });
    const s = new Sim(P); s.noSparks = true;
    while (s.t < 0.2 - 1e-9) s.step(H_STEP);
    let movedEarly = 0, litEarly = 0, waitedOk = 0, launched = 0;
    for (const st of s.stars) { if (st.birth > s.t) { if (Math.hypot(st.x, st.y, st.z) > 1e-9) movedEarly++; if (s.headI(st) > 0) litEarly++; waitedOk++; } else if (Math.hypot(st.x, st.y) > 0) launched++; }
    if (movedEarly || litEarly) out.fails.push(`F3 sweep ${sw}：没出发的星动了 ${movedEarly} / 亮了 ${litEarly}`);
    if (!waitedOk || !launched) out.fails.push(`F3 sweep ${sw}：0.2 s 时应该有的出发、有的没出发（等 ${waitedOk}、出发 ${launched}）`);
    const fl = s.flashes.filter(f => f.main).map(f => +f.t0.toFixed(4)); if (fl.length !== N) out.fails.push(`F4 sweep ${sw}：开花闪光 ${fl.length} 个 ≠ ${N}`);
    out['F3_' + sw] = { 等: waitedOk, 已出发: launched, 闪光: fl.length };
  }
  // F4：「开花时」光点
  { const N = 5, P = derive({ ...base, clusterN: N, clusterFan: 60, stars: N, clusterSweep: 0.4, x1On: 1, x1Event: 'birth', x1Kind: 'dot', x1N: 2, x1Delay: 0 });
    const s = new Sim(P), t0s = [...new Set(s.exDots.map(q => +q.t0.toFixed(4)))].sort((a, b) => a - b), want = [0, 0.1, 0.2, 0.3, 0.4];
    if (JSON.stringify(t0s) !== JSON.stringify(want)) out.fails.push(`F4 开花时光点出现时刻 ${t0s} ≠ ${want}`); }
  // F5
  { const P0 = derive({ ...base, clusterN: 7, clusterFan: 80, stars: 21, clusterCone: 5, dirJit: 1.5, speedJit: 5 }), P1 = derive({ ...P0, clusterSweep: 0 });
    const run = P => { const s = new Sim(P); s.noSparks = true; while (s.t < 1 - 1e-9) s.step(H_STEP); return JSON.stringify(s.stars.map(st => [st.x, st.y, st.z, st.vx, st.vy])); };
    if (run(P0) !== run(P1)) out.fails.push('F5 依次出膛 = 0 和不写这个键不一样'); }
  return out;
}"""


async def main(a):
    from browser_runtime import launch_async
    from playwright.async_api import async_playwright
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b = await launch_async(p); pg = await b.new_page()
        await pg.goto(HTML.resolve().as_uri() + '?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof dirsFor === "function"', timeout=0)
        r = await pg.evaluate(JS); await b.close()
    (out / '扇面簇检查.json').write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps({k: v for k, v in r.items() if k != 'fails'}, ensure_ascii=False))
    for f in r['fails']: print('❌', f)
    print('全过 ✅' if not r['fails'] else f'{len(r["fails"])} 项没过')
    return 1 if r['fails'] else 0


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default=str(ROOT / 'analysis' / 'probe' / '扇面簇'))
    sys.exit(asyncio.run(main(ap.parse_args())))
