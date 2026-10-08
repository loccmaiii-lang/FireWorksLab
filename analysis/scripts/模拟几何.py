"""模拟几何：只跑星头的模拟（不出火花、不渲染，云端几秒），量每层星头在各时刻的位置分布、往下坠多少、轨迹弯多少——
调初速 / 终端速度 / 重力 / 燃烧减质量时先在这里对上实拍的几何，再去渲染（对话框新花型，2026-10-08，用户 14:25「白芯还是有重力」）。

  python3 analysis/scripts/模拟几何.py --mt kinzuiLime --layer 3 [--ref-layer 2] [--set "grav=0;massLoss=0.6;v0=140"] [--times 0.5,0.8,1.2,1.5,1.8,2.3]

- 每个时刻：这一层星头投影到画面上离爆点的距离（p50 / p90，/ 参考层的外层半径——默认第 1 层，和打点.py 的 R 同口径：横向跨度 3–97% 的一半）、
  星头整体往下偏多少（重心 y，/ R，往下为正）、横着飞的星的速度方向往下歪多少（°，往下为正：火花尾巴顺着轨迹拖，就是尾巴弯的角度）。
- --set 改的参数只作用在 --layer 那一层（多个用 ;）；--ref-layer 的层不改（同一模拟的两层要一起改时两层都 --set）。
"""
import argparse, asyncio, json, pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent; ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
JS = r"""(o) => {
  const L = mtLayers(o.mt); const num = v => (v !== '' && !isNaN(+v)) ? +v : v;
  const geo = (P0, mods) => {
    const P = derive({ ...P0, ...mods, engine: 'gpu' }); const sim = new Sim(P); const out = []; let k = 0; const ts = o.times.slice().sort((a, b) => a - b);
    const hist = new Map(); let n = 0;
    while (k < ts.length && sim.t < 12) {
      sim.step(1 / 120); n++;
      if (n % 12 === 0) for (const s of sim.all) { if (!hist.has(s)) hist.set(s, []); hist.get(s).push([sim.t, s.y]); }
      if (sim.t + 1e-9 >= ts[k]) {
        const S = sim.all.filter(s => s.alive && s.kind !== 5 && s.age >= (s.ign || 0)), xs = S.map(s => s.x), ys = S.map(s => s.y);
        const pct = (a, p) => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p / 100 * b.length))]; };
        const cy0 = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0;
        const d = S.map(s => Math.hypot(s.x, s.y));
        const hor = S.filter(s => Math.abs(s.vy) < 3 * Math.abs(s.vx) && Math.hypot(s.x, s.y) > 1);      // 大致横着飞的
        const tilt = hor.length ? hor.map(s => Math.atan2(-s.vy, Math.abs(s.vx)) * 180 / Math.PI).reduce((a, b) => a + b, 0) / hor.length : null;
        // 竖直加速度（往下为正）：同一批星往前 / 往后各走 0.1 s 的 y 二阶差分，取中位（上飞的被阻力减速、下飞的被阻力减速，两边抵掉，剩下的是重力的份）
        S.forEach(s => { s._y0 = s.y; });
        out.push({ t: ts[k], n: S.length, span: xs.length ? (pct(xs, 97) - pct(xs, 3)) / 2 : null, r50: pct(d, 50), r90: pct(d, 90), cy: cy0, tilt, ids: S });
        k++;
      }
    }
    for (const o2 of out) {      // ay：每颗星在 [t − 0.3, t + 0.3] 里 y(t) 二次拟合 → 2a（往下为正）
      const acc = [];
      for (const s of o2.ids) { const h = (hist.get(s) || []).filter(p => Math.abs(p[0] - o2.t) <= 0.3 + 1e-6); if (h.length < 5) continue;
        const tm = h.reduce((a, p) => a + p[0], 0) / h.length; let S0 = 0, S1 = 0, S2 = 0, S3 = 0, S4 = 0, Y0 = 0, Y1 = 0, Y2 = 0;
        for (const [t, y] of h) { const u = t - tm; S0++; S1 += u; S2 += u * u; S3 += u * u * u; S4 += u * u * u * u; Y0 += y; Y1 += u * y; Y2 += u * u * y; }
        const M = [[S4, S3, S2], [S3, S2, S1], [S2, S1, S0]], V = [Y2, Y1, Y0];
        const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
        const D0 = det(M); if (Math.abs(D0) < 1e-12) continue; const Ma = [[V[0], M[0][1], M[0][2]], [V[1], M[1][1], M[1][2]], [V[2], M[2][1], M[2][2]]];
        acc.push(-2 * det(Ma) / D0); }
      acc.sort((a, b) => a - b); o2.ay = acc.length ? acc[Math.floor(acc.length / 2)] : null; delete o2.ids;
    }
    return out;
  };
  const mods = {}; for (const [k, v] of Object.entries(o.mods || {})) mods[k] = num(v);
  return { layer: geo(L[o.layer - 1].P, mods), ref: geo(L[o.ref - 1].P, o.refmods || {}) };
}"""


async def run(a, mods, refmods):
    from browser_runtime import launch_async
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await launch_async(p); pg = await b.new_page()
        await pg.goto((ROOT / 'tool' / 'FireworkBaker.html').resolve().as_uri() + '?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof mtLayers === "function" && typeof Sim === "function"', timeout=0)
        r = await pg.evaluate(JS, dict(mt=a.mt, layer=a.layer, ref=a.ref_layer, times=a.times, mods=mods, refmods=refmods)); await b.close(); return r


def parse(s): return dict(x.split('=', 1) for x in s.split(';') if x.strip()) if s else {}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--mt', required=True); ap.add_argument('--layer', type=int, required=True); ap.add_argument('--ref-layer', type=int, default=1)
    ap.add_argument('--set', default=''); ap.add_argument('--ref-set', default=''); ap.add_argument('--times', default='0.5,0.8,1.2,1.5,1.8,2.3'); ap.add_argument('--json')
    a = ap.parse_args(); a.times = [float(x) for x in a.times.split(',')]
    r = asyncio.run(run(a, parse(a.set), parse(a.ref_set)))
    print(f'mt:{a.mt} 第 {a.layer} 层 {a.set or "（模板）"}；R = 第 {a.ref_layer} 层横向跨度一半')
    print('时刻 | 星头数 | 离爆点 p50 / p90（/R） | 相对参考层往下偏（/R） | 横飞的星往下歪（°） | 竖直加速度 ay（R/s²，往下为正；打点.py 跟踪的 ay 同口径）')
    for x, y in zip(r['layer'], r['ref']):
        R = y['span'] or 1
        print(f"+{x['t']:.2f} | {x['n']} | {x['r50'] / R:.3f} / {x['r90'] / R:.3f} | {-(x['cy'] - y['cy']) / R:+.3f} | {x['tilt']:+.1f} | {(x['ay'] or 0) / R:+.3f}" if x['r50'] else f"+{x['t']:.2f} | 0")
    if a.json: json.dump(r, open(a.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
