#!/usr/bin/env python3
"""开花闪光检查（4.3.3，用户 10-04 11:56「开花闪光改柔和的光」）

开花那一瞬间的闪光（割药爆炸的一团光，0.25 s 内消失）以前按 4.0 的星头核画成「实心亮核」——一块硬边圆饼，
外面一圈光晕伸出格子被切成方框（引菊 → 锦引擎回放开头那个橙色圆饼 + 暗红方框）。应该是一团柔和的光。

按真实烘焙的同一条路（plan → renderCell40 → 格子里的线性值，星头通道），在开花后几个时刻量：
  软：闪光里亮度在 15%–85% 之间的像素占「亮于 5%」的比例 ≥ 0.5（硬边圆饼几乎全是平顶，< 0.3）
  不出格：格子留边（cellPad，打包时清零）里面那 2 像素一圈的闪光，乘上曝光写进贴图 < 0.5 / 255（光晕被格子切掉就会超；引擎回放和 UE 里自发光 × 4 + Gamma 后 1–2 / 255 就看得见方框）
  能调：开花闪光 × 2 时，闪光的光量跟着 × 2（± 5%）
闪光单独量：同一配方开花闪光 0 / ×1 / ×2 各画一遍相减（星头、火花逐像素相同，减掉只剩闪光）。

  python3 analysis/scripts/开花闪光检查.py [--html 其它版本.html]
退出码 0 = 全过。云端软件渲染能跑（只画开花后 0.1 s 以内，几十秒一个）。
"""
import argparse, asyncio, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from browser_runtime import launch_async

ROOT = pathlib.Path(__file__).resolve().parents[2]
CASES = [('菊模板', 'kiku'), ('牡丹模板', 'botan'), ('锦冠模板', 'kamuro'), ('引菊 → 锦 · 引菊层', 'rv:HN2-O')]
TIMES = [0.004, 0.02, 0.05]

JS = r"""async ([src, times]) => {
  // 同一配方画三遍：开花闪光 0 / ×1 / ×2，相减得到「只有闪光」的画面（星头、火花逐像素相同，减掉就没了）
  let P0;
  if (src.startsWith('rv:')) P0 = replicaPM(src.slice(3)).P; else { const d = defaultsFor(src, 40, true); P0 = derive({ ...structuredClone(d.P), type: src }); }
  const f = +P0.flash || 0, pd = Math.ceil(+P0.cellPad || 0), pl = displayPlan40(P0), q = qualityOf(P0), w = pl.L.cellW, h = pl.L.cellH;
  const samples = new Target(w * q.ss, h * q.ss, gl.RGBA16F), cell = new Target(w, h, gl.RGBA16F), out = [];
  const shot = (mul, t) => { const P = { ...P0, flash: f * mul }, R = makeRenderer(P, 'burst'), a = new Float32Array(w * h * 4);
    try { renderCell40(P, pl, R, (pl.t0 || 0) + t, samples, cell); cell.bind(); gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, a); } finally { R.dispose(); } return a; };
  try {
    for (const t of times) {
      const a0 = shot(0, t), a1 = shot(1, t), a2 = shot(2, t);
      let m = 0, border = 0, mi = 0, s1 = 0, s2 = 0, sm = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, v = a1[i] - a0[i]; if (v > m) { m = v; mi = i; } if (x < pd + 2 || y < pd + 2 || x >= w - pd - 2 || y >= h - pd - 2) border = Math.max(border, v); s1 += v; s2 += a2[i] - a0[i]; if (a1[i] > sm) sm = a1[i]; }
      let s = 0, mid = 0; for (let i = 0; i < a1.length; i += 4) { const v = a1[i] - a0[i]; if (v > 0.05 * m) { s++; if (v > 0.15 * m && v < 0.85 * m) mid++; } }
      out.push({ t, flashMax: +m.toFixed(5), sceneMax: +sm.toFixed(5), midFrac: s ? +(mid / s).toFixed(3) : null, border: m > 0 ? +(border / m).toFixed(5) : 0, borderTex: +(border * fixedExposure(P0) * 255).toFixed(3),
                 x2: s1 > 0 ? +(s2 / s1).toFixed(3) : null, cell: [w, h] });
    }
  } finally { samples.dispose(); cell.dispose(); }
  return { flash: f, out };
}"""


async def main(html):
    from playwright.async_api import async_playwright
    bad, rep = [], []
    async with async_playwright() as p:
        b = await launch_async(p); pg = await b.new_page(viewport={'width': 800, 'height': 600})
        await pg.add_init_script("window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 500);")
        await pg.goto(html, wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
        await pg.evaluate('state.playing = false; typeof setAutoBake === "function" && setAutoBake(false)')
        for name, src in CASES:
            r1 = await pg.evaluate(JS, [src, TIMES])
            rep.append({'name': name, 'r': r1}); f0 = r1['out'][0]
            line = f"{name}：开花后 {f0['t']} s 软 {f0['midFrac']}、格子边上 {max(o['borderTex'] for o in r1['out'])} / 255"
            if r1['flash'] > 0:
                if f0['midFrac'] is None or f0['midFrac'] < 0.5: bad.append(f'{name} 闪光是硬边（15–85% 亮度的像素只占 {f0["midFrac"]}）')
                for o in r1['out']:     # 贴图里格子边上的闪光 ≥ 0.5 / 255：引擎回放 / UE 里经过自发光 × 4 和 Gamma 会看得见方框
                    if o['borderTex'] >= 0.5: bad.append(f"{name} {o['t']} s 光晕出了格子（边上贴图值 {o['borderTex']} / 255）")
                k = f0['x2'] or 0
                line += f"、开花闪光 ×2 → 闪光光量 ×{k:.2f}"
                if not 1.9 <= k <= 2.1: bad.append(f'{name} 开花闪光 ×2，闪光光量 ×{k:.2f}')
            print(line, flush=True)
        await b.close()
    out = ROOT / 'analysis' / 'probe' / '开花闪光'; out.mkdir(parents=True, exist_ok=True)
    (out / '开花闪光检查.json').write_text(json.dumps({'ok': not bad, 'bad': bad, 'cases': rep}, ensure_ascii=False, indent=1), encoding='utf-8')
    print('✅ 全过' if not bad else '❌ ' + '；'.join(bad))
    return not bad


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--html', default=str(ROOT / 'tool' / 'FireworkBaker.html')); ap.add_argument('--only', default='')
    a = ap.parse_args()
    if a.only: CASES[:] = [c for c in CASES if a.only in c[0] or a.only == c[1]]
    sys.exit(0 if asyncio.run(main(pathlib.Path(a.html).resolve().as_uri() + '?fast')) else 1)
