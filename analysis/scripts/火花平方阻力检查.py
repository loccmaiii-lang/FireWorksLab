"""火花平方阻力检查（烘焙器 4.9.71，对话框FanGold，用户 2026-10-12 22:59 批）。
  python3 analysis/scripts/火花平方阻力检查.py [--out 目录] [--no-gpu]
查：
  Q1 缺省关：所有花型默认 / 多层模板的 sparkCqOf = 0（逐像素不变由 基准回归.py 查）。
  Q2 积分器（着色器 motQ 的同一算法，JS 版）对解析解：只有平方阻力时位置 = ln(1 + c v t)/c、速度 = v/(1 + c v t)；只有线性阻力 + 重力时 = mot / motv；
     平方 + 重力时的下落极限速度 = 终端速度 × √下坠倍数。误差 < 1 %。
  Q3 物理意思：同样「跟随星体」= 1，出生速度 300 m/s 和 20 m/s 的火花往前冲的距离只差 ln 倍（线性阻力时差 15 倍）。
  G1（显卡）着色器能编译（spk / spkS / 渐变亮核）；一颗星、固定取景，GPU 画出来的尾迹上下端（像素行）和按模型算出来的火花位置对得上（平方 / 线性各两个时刻，误差 ≤ 3 像素）。
输出 <out>/火花平方阻力检查.json（+ G1 定帧图）；有不过的退出码 1。
"""
import argparse, asyncio, base64, io, json, pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'

JS = r"""() => {
  const out = { fails: [] }, F = m => out.fails.push(m);
  // Q1
  { const Ps = Object.keys(TYPES).filter(t => familyOf(t) === 'aerial').map(t => derive({ ...structuredClone(defaultsFor(t).P), type: t }));
    if (typeof MULTI_TYPES !== 'undefined') for (const m of MULTI_TYPES) for (const L of (m.layers || [])) { try { Ps.push(derive({ ...structuredClone(defaultsFor(L.type || 'kiku').P), ...(L.p || {}), type: L.type || 'kiku' })); } catch (e) {} }
    const bad = Ps.filter(P => sparkCqOf(P) !== 0).length; if (bad) F('Q1 缺省平方阻力不是 0：' + bad + ' 个'); out.Q1 = { 条目: Ps.length }; }
  // 着色器 motQ 的 JS 版（同一算法）
  const add = (a, b, s = 1) => a.map((x, i) => x + b[i] * s), len = a => Math.hypot(...a);
  const linV = (v, U, g, k, h) => k > 1e-4 ? (() => { const vi = add(U, g, 1 / k), e = Math.exp(-k * h); return vi.map((x, i) => x + (v[i] - x) * e); })() : add(v, g, h);
  const motQ = (p0, v0, U, g, k, c, a) => { let p = p0.slice(), v = v0.slice(), t0 = 0;
    for (let i = 1; i <= 24; i++) { const x = i / 24, t1 = a * x * Math.sqrt(x), h = t1 - t0; t0 = t1; v = linV(v, U, g, k, h / 2);
      const w = v.map((q, j) => q - U[j]), sw = len(w); if (sw > 1e-6) { const e = 1 + c * sw * h; p = p.map((q, j) => q + U[j] * h + w[j] / sw * Math.log(e) / c); v = U.map((u, j) => u + w[j] / e); } else p = add(p, v, h);
      v = linV(v, U, g, k, h / 2); } return [p, v]; };
  const rel = (a, b) => Math.abs(a - b) / Math.max(1e-9, Math.abs(b));
  { const c = G / 25; for (const [v0, a] of [[300, 0.05], [300, 1.5], [20, 0.4], [5, 2]]) { const [p, v] = motQ([0, 0, 0], [v0, 0, 0], [0, 0, 0], [0, 0, 0], 0, c, a);
      const px = Math.log(1 + c * v0 * a) / c, vx = v0 / (1 + c * v0 * a); if (rel(p[0], px) > 0.01 || rel(v[0], vx) > 0.01) F(`Q2 纯平方 v0=${v0} t=${a}：${p[0].toFixed(3)} / ${px.toFixed(3)}，${v[0].toFixed(3)} / ${vx.toFixed(3)}`); } }
  { const k = 2.2, g = [0, -G * 0.5, 0], U = [3, 0, 0], v0 = [10, 20, 0], a = 1.3, c = 1e-9; const [p, v] = motQ([0, 0, 0], v0, U, g, k, c, a);
    const vi = add(U, g, 1 / k), e = Math.exp(-k * a), pe = vi.map((q, i) => q * a + (v0[i] - q) * (1 - e) / k), ve = vi.map((q, i) => q + (v0[i] - q) * e);
    if (len(p.map((q, i) => q - pe[i])) > 0.01 * len(pe) || len(v.map((q, i) => q - ve[i])) > 0.01 * len(ve)) F('Q2 线性 + 重力 + 风和解析解对不上'); }
  { const vt = 6, gm = 0.5, c = G / (vt * vt), [, v] = motQ([0, 0, 0], [0, 0, 0], [0, 0, 0], [0, -G * gm, 0], 0, c, 3); const want = vt * Math.sqrt(gm);
    if (rel(-v[1], want) > 0.01) F(`Q2 下落极限速度 ${(-v[1]).toFixed(3)} ≠ ${want.toFixed(3)}`); out.Q2 = { 下落极限: +(-v[1]).toFixed(3), 应为: +want.toFixed(3) }; }
  // Q3
  { const c = G / 25, kL = 1.6, dq = v => motQ([0, 0, 0], [v, 0, 0], [0, 0, 0], [0, 0, 0], 0, c, 1.5)[0][0], dl = v => v / kL * (1 - Math.exp(-kL * 1.5));
    out.Q3 = { 平方_300: +dq(300).toFixed(2), 平方_20: +dq(20).toFixed(2), 线性_300: +dl(300).toFixed(2), 线性_20: +dl(20).toFixed(2) };
    if (!(dq(300) / dq(20) < 3 && dl(300) / dl(20) > 14)) F('Q3 平方阻力冲出距离对速度不敏感这一点没体现'); }
  return out;
}"""

JS_GPU = r"""async () => {
  const out = { fails: [], imgs: {}, pred: {} }, F = m => out.fails.push(m);
  for (const k of ['spk', 'spkS']) { try { particleProgram40(k); } catch (e) { F('G1 编译 ' + k + '：' + e.message); } }
  const base = derive({ ...structuredClone(defaultsFor('kamuro').P), type: 'kamuro', pattern: 'cluster', clusterLayout: 'fan', clusterN: 1, stars: 1, clusterCone: 0, clusterDirJit: 0, dirJit: 0, speedJit: 0, burnJit: 0,
    v0: 90, vt: 30, grav: 1, burn: 1.0, duration: 1.8, headBright: 0, flash: 0, sparkRate: 3000, sparkRateEnd: 1, sparkLife: 1.2, sparkLifeJit: 0, sparkLifeEnd: 1, sparkSpread: 0, sparkInherit: 1, sparkInhJit: 0, sparkDrag: 0.3, sparkGrav: 0.3,
    cooling: 0, T0: 2400, T0Jit: 0, sparkRise: 0, tailHaze: 0, wind: 0, turb: 0, exposure: 2, tailJit: 0, twinkle: 0, shutter: 0.002, sparkSize: 0.2 });
  const M = structuredClone(defaultsFor('kamuro').M);
  // 和着色器同一算法的 JS 版，算出每颗火花的位置（星轨迹取 CPU 模拟的星）
  const add = (a, b, s = 1) => a.map((x, i) => x + b[i] * s);
  const linV = (v, U, g, k, h) => k > 1e-4 ? (() => { const vi = add(U, g, 1 / k), e = Math.exp(-k * h); return vi.map((x, i) => x + (v[i] - x) * e); })() : add(v, g, h);
  const motQ = (p0, v0, g, k, c, a) => { let p = p0.slice(), v = v0.slice(), t0 = 0; for (let i = 1; i <= 24; i++) { const x = i / 24, t1 = a * x * Math.sqrt(x), h = t1 - t0; t0 = t1; v = linV(v, [0, 0, 0], g, k, h / 2);
      const sw = Math.hypot(...v); if (sw > 1e-6) { const e = 1 + c * sw * h; p = p.map((q, j) => q + v[j] / sw * Math.log(e) / c); v = v.map(q => q / e); } v = linV(v, [0, 0, 0], g, k, h / 2); } return p; };
  const mot = (p0, v0, g, k, a) => { const vi = add([0, 0, 0], g, 1 / k), e = 1 - Math.exp(-k * a); return p0.map((q, i) => q + vi[i] * a + (v0[i] - vi[i]) * e / k); };
  const predict = (P, t) => { const s = new Sim(P), st = s.stars[0], ys = []; const c = sparkCqOf(P), g = [0, -G * P.sparkGrav, 0];
    while (s.t < t - 1e-9) { s.step(H_STEP); if (!st.alive) break; const a = t - s.t, p0 = [st.x, st.y, st.z], v0 = [st.vx, st.vy, st.vz];
      const p = c > 0 ? motQ(p0, v0, g, P.sparkDrag, c, a) : mot(p0, v0, g, P.sparkDrag, a); ys.push(p[1]); }
    return [Math.min(...ys), Math.max(...ys)]; };
  const CY = 45, HALF = 55, PX = 256;
  for (const [nm, o] of [['quad', { sparkVt: 5 }], ['lin', { sparkVt: 0 }]]) for (const t of [0.6, 0.95]) {
    const P = derive({ ...base, ...o }); const st = await renderStills40(P, M, { times: [t], px: PX, cx: 0, cy: CY, half: HALF });
    out.imgs[nm + '_' + t] = st[0].png; const [y0, y1] = predict(P, t); out.pred[nm + '_' + t] = { 下: +y0.toFixed(2), 上: +y1.toFixed(2), 行上: +((CY + HALF - y1) / (2 * HALF) * PX).toFixed(1), 行下: +((CY + HALF - y0) / (2 * HALF) * PX).toFixed(1) }; }
  try { await renderStills40(derive({ ...base, sparkVt: 5, sparkStretch: 1 }), M, { times: [0.6], px: 128 }); await renderStills40(derive({ ...base, sparkVt: 5, coreProfile: 1 }), M, { times: [0.6], px: 128 }); } catch (e) { F('G1 变体：' + e.message); }
  return out;
}"""


def prof(png):
    import numpy as np
    from PIL import Image
    a = np.asarray(Image.open(io.BytesIO(base64.b64decode(png.split(',', 1)[1]))).convert('L'), dtype=float)
    rows = np.nonzero((a > np.median(a) + 12).any(axis=1))[0]
    return {'行上': int(rows.min()), '行下': int(rows.max())} if len(rows) else {}


async def main(a):
    from browser_runtime import launch_async
    from playwright.async_api import async_playwright
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b = await launch_async(p); pg = await b.new_page()
        await pg.goto(HTML.resolve().as_uri() + '?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof sparkCqOf === "function"', timeout=0)
        r = await pg.evaluate(JS)
        if not a.no_gpu:
            g = await pg.evaluate(JS_GPU); r['fails'] += g['fails']; pr = {}
            for k, png in g['imgs'].items(): (out / f'G1_{k}.png').write_bytes(base64.b64decode(png.split(',', 1)[1])); pr[k] = prof(png)
            r['G1'] = pr
            r['pred'] = g['pred']
            for k, pv in g['pred'].items():
                im = pr.get(k, {})
                if not im: r['fails'].append(f'G1 {k} 没画出东西'); continue
                if abs(im['行上'] - pv['行上']) > 3 or abs(im['行下'] - pv['行下']) > 3: r['fails'].append(f'G1 {k} 画出来的尾迹上下 {im} 和算的 {pv} 对不上')
        await b.close()
    (out / '火花平方阻力检查.json').write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps({k: v for k, v in r.items() if k != 'fails'}, ensure_ascii=False))
    for f in r['fails']: print('❌', f)
    print('全过 ✅' if not r['fails'] else f'{len(r["fails"])} 项没过')
    return 1 if r['fails'] else 0


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default=str(ROOT / 'analysis' / 'probe' / '火花平方阻力'))
    ap.add_argument('--no-gpu', action='store_true')
    sys.exit(asyncio.run(main(ap.parse_args())))
