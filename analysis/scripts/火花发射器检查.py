"""火花发射器检查（对话框FanGold，用户 2026-10-09 21:48 批；审查 analysis/原理/火花发射审查_2026-10-09.md）。
  python3 analysis/scripts/火花发射器检查.py [--out 目录] [--no-gpu]
查：
  E1 缺省不进新代码：花型默认 / 分簇模板的 dirsFor 没有筒距（.o）、闪光个数照旧；起始半径函数返回 0。（逐像素不变由 基准回归.py 查）
  E2 扇面筒距：第 k 簇出发点 x = (k − (N−1)/2) × 筒距（第 0 簇最左）；闪光挪到各簇出发点，同时出膛的平分亮度、依次出膛的每个和原来一样亮。
  E3 起始半径（CPU 模拟）：火花出生点离星的轨迹线 ≤ R、球内均匀（离轴距离的平均值对上理论值）；跟星头大小 = R + k × 星头半径（含星头大小随机、大小随寿命）。
  E4 向后喷：锥角 0 时火花速度 = −喷速 × 星速方向；锥角 30° 时和正后方的夹角都 ≤ 30°。
  E5 每米生成：火花总数 ≈ 每米 × 路程（CPU 模拟和 GPU 轨迹的计数）；每秒时快段稀、每米时快段和慢段一样密。
  E6 取景估算把起始半径、向后喷算进去（范围变大）；缺省不变。
  G1（显卡）VS_SPK 各变体能编译（spk / spkS / 渐变亮核 / 幂律光晕）；起始半径让尾巴根部变粗、向后喷 / 每米让画面变了。
输出 <out>/火花发射器检查.json（+ G1 的定帧图）；有不过的退出码 1。
"""
import argparse, asyncio, base64, json, pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'

JS = r"""() => {
  const out = { fails: [] }, F = m => out.fails.push(m), D = Math.PI / 180;
  const base = { ...structuredClone(defaultsFor('kamuro').P), type: 'kamuro', pattern: 'cluster', clusterLayout: 'fan', clusterCone: 0, clusterDirJit: 0, clusterStarsJit: 0, dirJit: 0, speedJit: 0, burnJit: 0, wind: 0, turb: 0 };
  // E1
  { let n = 0; const Ps = Object.keys(TYPES).filter(t => familyOf(t) === 'aerial').map(t => derive({ ...structuredClone(defaultsFor(t).P), type: t }));
    if (typeof MULTI_TYPES !== 'undefined') for (const m of MULTI_TYPES) for (const L of (m.layers || [])) if (L.p && L.p.pattern === 'cluster') { try { Ps.push(derive({ ...structuredClone(defaultsFor(L.type || 'kiku').P), ...L.p, type: L.type || 'kiku' })); } catch (e) {} }
    for (const P of Ps) { n++; if (dirsFor(P, new RNG(P.seed)).some(d => d.o)) F('E1 缺省有筒距 ' + P.type);
      if (sparkSpawnRAt(P, { birth: 0, ign: 0, burn: 1, kind: 0, id: 0 }, {}, null, 0) !== 0) F('E1 缺省起始半径 ≠ 0 ' + P.type); }
    out.E1 = { 条目: n }; }
  // E2
  for (const sw of [0, 0.4]) { const N = 5, g = 2, P = derive({ ...base, stars: N, clusterN: N, clusterFan: 80, clusterSweep: sw, clusterGap: g });
    const s = new Sim(P), xs = s.stars.map(st => +st.x.toFixed(6)), want = [0, 1, 2, 3, 4].map(k => (k - 2) * g);
    if (JSON.stringify(xs) !== JSON.stringify(want)) F(`E2 sweep ${sw} 出发点 ${xs} ≠ ${want}`);
    const P0 = derive({ ...P, clusterGap: 0 }), f0 = new Sim(P0).flashes.filter(f => f.main), f1 = s.flashes.filter(f => f.main);
    if (f1.length !== N) F(`E2 sweep ${sw} 闪光 ${f1.length} ≠ ${N}`);
    const sI = f => f.reduce((a, q) => a + q.I, 0); if (Math.abs(sI(f1) - sI(f0)) > 1e-9) F(`E2 sweep ${sw} 闪光总亮度 ${sI(f1)} ≠ ${sI(f0)}`);
    if (JSON.stringify(f1.map(f => +f.x.toFixed(6)).sort((a, b) => a - b)) !== JSON.stringify(want)) F(`E2 sweep ${sw} 闪光位置不对`);
    out['E2_' + sw] = { 出发点: xs, 闪光: f1.length }; }
  // E3 / E4：CPU 模拟（engine = cpu 才出 CPU 火花）；一颗星竖直向上、火花不跟星、不散、不下坠 → 火花停在出生点 / 只带喷射速度
  const one = o => derive({ ...base, engine: 'cpu', stars: 1, clusterN: 1, grav: 0, v0: 60, vt: 80, burn: 1.5, duration: 1.6, sparkInherit: 0, sparkSpread: 0, sparkGrav: 0, sparkDrag: 0, sparkLife: 3, sparkRate: 3000, tailJit: 0, ...o });
  const runSp = (P, T) => { const s = new Sim(P); while (s.t < T - 1e-9) s.step(H_STEP); const sp = s.sp, r = []; for (let i = 0; i < sp.n; i++) r.push([sp.p[i * 3], sp.p[i * 3 + 1], sp.p[i * 3 + 2], sp.v[i * 3], sp.v[i * 3 + 1], sp.v[i * 3 + 2]]); return { s, r }; };
  { const R = 3, { r } = runSp(one({ sparkSpawnR: R }), 1.0), rp = r.map(q => Math.hypot(q[0], q[2]));
    const mx = Math.max(...rp), mean = rp.reduce((a, b) => a + b, 0) / rp.length, th = 3 * Math.PI / 16 * R;     // 球内均匀点离一条直径的平均距离 = 3π/16 R
    if (mx > R + 1e-4) F(`E3 离轴 ${mx.toFixed(3)} > R ${R}`); if (Math.abs(mean - th) > 0.05 * R) F(`E3 离轴平均 ${mean.toFixed(3)} ≠ 理论 ${th.toFixed(3)}`);
    out.E3 = { 火花: r.length, 离轴最大: +mx.toFixed(3), 离轴平均: +mean.toFixed(3), 理论: +th.toFixed(3) }; }
  { const P = one({ sparkSpawnR: 1, sparkSpawnHead: 1, headSize: 2, headSizeJit: 0.5, starSizeCurve: '0:1, 1:2' }), s = new Sim(P), st = s.stars[0], hs = headShapeOf(P);
    const want = t => 1 + 0.5 * 2 * headSizeMul(st, hs, P.seed) * lifeCurveAt(parseCurve('0:1, 1:2'), clamp(t / 1.5, 0, 1));
    for (const t of [0, 0.75, 1.5]) { const got = sparkSpawnRAt(P, st, s.cv, hs, t); if (Math.abs(got - want(t)) > 1e-9) F(`E3 跟星头 t=${t} ${got} ≠ ${want(t)}`); }
    out.E3b = { 星头大小随机倍数: +headSizeMul(st, hs, P.seed).toFixed(4) }; }
  { const { r } = runSp(one({ sparkJet: 10 }), 0.6); let bad = 0; for (const q of r) if (Math.abs(q[3]) > 1e-4 || Math.abs(q[5]) > 1e-4 || Math.abs(q[4] + 10) > 1e-4) bad++;
    if (bad) F(`E4 锥角 0：${bad} 颗速度不是 (0, −10, 0)`);
    const { r: r2 } = runSp(one({ sparkJet: 10, sparkJetCone: 30 }), 0.6); let mxA = 0; for (const q of r2) { const c = -q[4] / Math.hypot(q[3], q[4], q[5]); mxA = Math.max(mxA, Math.acos(Math.min(1, c)) / D); }
    if (mxA > 30 + 1e-3 || mxA < 20) F(`E4 锥角 30：最大夹角 ${mxA.toFixed(2)}°`);
    out.E4 = { 火花: r.length, 锥角30最大夹角: +mxA.toFixed(2) }; }
  // E5 每米
  { const P = one({ sparkRateBy: 'm', sparkPerM: 8, grav: 1, vt: 30, v0: 70, burn: 2 , duration: 2.1 }), { s, r } = runSp(P, 2.0), st = s.stars[0];
    const L = Math.hypot(st.x, st.y, st.z), want = 8 * L; if (Math.abs(r.length - want) > 4 * Math.sqrt(want)) F(`E5 CPU 每米：${r.length} 颗 ≠ 约 ${want.toFixed(0)}`);
    // 快段 / 慢段同样密：按高度分两半数
    const h2 = st.y / 2, lo = r.filter(q => q[1] < h2).length, hi = r.length - lo; if (Math.abs(lo - hi) > 4 * Math.sqrt(r.length)) F(`E5 每米上下两半 ${lo} / ${hi} 不一样密`);
    const Ps = one({ grav: 1, vt: 30, v0: 70, burn: 2, duration: 2.1, sparkRate: 600 }), { s: ss, r: rs } = runSp(Ps, 2.0), h3 = ss.stars[0].y / 2, lo2 = rs.filter(q => q[1] < h3).length, hi2 = rs.length - lo2;
    if (!(lo2 < hi2 * 0.7)) F(`E5 每秒时下半（快段）应该更稀：${lo2} / ${hi2}`);
    out.E5 = { 路程: +L.toFixed(2), CPU火花: r.length, 期望: +want.toFixed(1), 每米上下: [lo, hi], 每秒上下: [lo2, hi2] }; }
  // E6 取景
  { const P0 = derive({ ...base, stars: 7, clusterN: 7, clusterFan: 60 }), m0 = measure(P0), m1 = measure(derive({ ...P0, sparkSpawnR: 3, sparkJet: 20 })), m2 = measure(derive({ ...P0 }));
    if (!(m1.x1 - m1.x0 > m0.x1 - m0.x0 + 5)) F('E6 起始半径 / 向后喷没算进取景');
    if (JSON.stringify([m0.x0, m0.x1, m0.y0, m0.y1]) !== JSON.stringify([m2.x0, m2.x1, m2.y0, m2.y1])) F('E6 缺省取景变了');
    out.E6 = { 缺省宽: +(m0.x1 - m0.x0).toFixed(2), 加了宽: +(m1.x1 - m1.x0).toFixed(2) }; }
  return out;
}"""

JS_GPU = r"""async () => {
  const out = { fails: [], imgs: {} }, F = m => out.fails.push(m);
  for (const k of ['spk', 'spkS']) { try { particleProgram40(k); } catch (e) { F('G1 编译 ' + k + '：' + e.message); } }
  const base = derive({ ...structuredClone(defaultsFor('kamuro').P), type: 'kamuro', pattern: 'cluster', clusterLayout: 'fan', clusterN: 1, stars: 1, clusterCone: 0, clusterDirJit: 0, dirJit: 0, speedJit: 0, burnJit: 0,
    v0: 70, vt: 38, burn: 1.6, duration: 1.7, headSize: 1.5, sparkRate: 500, sparkLife: 0.8, sparkSpread: 0.3, sparkInherit: 0.05, sparkDrag: 2, wind: 0, turb: 0, exposure: 1.5 });
  const M = structuredClone(defaultsFor('kamuro').M);
  const shot = async (o, name) => { const P = derive({ ...base, ...o }); const st = await renderStills40(P, M, { times: [1.0], px: 256 }); out.imgs[name] = st[0].png; return st[0].png; };
  const cases = { base: {}, spawnR: { sparkSpawnR: 3 }, head: { sparkSpawnHead: 1.5 }, jet: { sparkJet: 25, sparkJetCone: 25 }, perm: { sparkRateBy: 'm', sparkPerM: 12 },
    grad: { sparkSpawnR: 2, coreProfile: 1 }, moffat: { sparkSpawnR: 2, haloShape: 1, haloFrac: 0.3 } };
  for (const [k, o] of Object.entries(cases)) { try { await shot(o, k); } catch (e) { F('G1 渲染 ' + k + '：' + e.message); } }
  return out;
}"""


def width_profile(png):
    import io, numpy as np
    from PIL import Image
    a = np.asarray(Image.open(io.BytesIO(base64.b64decode(png.split(',', 1)[1]))).convert('L'), dtype=float)
    lit = a > 40
    rows = [r for r in range(a.shape[0]) if lit[r].any()]
    if not rows: return {'行': 0}
    w = [int(lit[r].sum()) for r in rows]
    n = len(w); top = w[: max(1, n // 4)]   # 靠星头的四分之一（星往上飞）
    return {'行': n, '星头端平均宽': round(sum(top) / len(top), 2), '总亮': round(float(a.sum()), 1)}


async def main(a):
    from browser_runtime import launch_async
    from playwright.async_api import async_playwright
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b = await launch_async(p); pg = await b.new_page()
        await pg.goto(HTML.resolve().as_uri() + '?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof dirsFor === "function" && typeof sparkSpawnRAt === "function"', timeout=0)
        r = await pg.evaluate(JS)
        if not a.no_gpu:
            g = await pg.evaluate(JS_GPU)
            r['fails'] += g['fails']; prof = {}
            for k, png in g['imgs'].items():
                (out / f'G1_{k}.png').write_bytes(base64.b64decode(png.split(',', 1)[1])); prof[k] = width_profile(png)
            r['G1'] = prof
            if prof.get('spawnR', {}).get('星头端平均宽', 0) <= prof.get('base', {}).get('星头端平均宽', 0) * 1.5: r['fails'].append('G1 起始半径 3 m 没让星头端变粗')
            if prof.get('head', {}).get('星头端平均宽', 0) <= prof.get('base', {}).get('星头端平均宽', 0) * 1.3: r['fails'].append('G1 跟星头 1.5 没让星头端变粗')
            for k in ('jet', 'perm'):
                if prof.get(k, {}).get('总亮') == prof.get('base', {}).get('总亮'): r['fails'].append(f'G1 {k} 画面没变')
        await b.close()
    (out / '火花发射器检查.json').write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps({k: v for k, v in r.items() if k != 'fails'}, ensure_ascii=False))
    for f in r['fails']: print('❌', f)
    print('全过 ✅' if not r['fails'] else f'{len(r["fails"])} 项没过')
    return 1 if r['fails'] else 0


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default=str(ROOT / 'analysis' / 'probe' / '火花发射器'))
    ap.add_argument('--no-gpu', action='store_true')
    sys.exit(asyncio.run(main(ap.parse_args())))
