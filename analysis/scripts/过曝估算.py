"""过曝估算：某一层在几个曝光下，烘焙序列里「到顶」（编码 ≥ 253/255）的像素占比（和回放检查「过曝像素」同一口径的估算），挑一个既不过曝、又不推翻观感的曝光用
（对话框新花型，2026-10-08：金蕊柠 JQ6E1 回放检查 金菊蕊过曝 6.6% > 2%）。

  python3 analysis/scripts/过曝估算.py --mt kinzuiLime --layer 3 --E 0.1423,0.1,0.07,0.05 [--times 0.3,0.6,0.9,1.2,1.5,1.8] --out <目录>
  python3 analysis/scripts/过曝估算.py --entry JQ6-3 --E ... --out <目录>

- 线性亮度 = 单格里星头 + 尾两个通道之和（和 autoExposure40 一样，开花闪光不算）；到顶阈值 = −ln(1 − (253/255)^encGamma) / E。
- 出：<目录>/过曝估算.json、过曝估算.md（每个时刻 × 每个曝光的到顶占比；最后一行 = 各时刻最大值，回放检查上限 2%）。
- 本机显卡跑（云端软件渲染一层要十几分钟）。
"""
import argparse, asyncio, json, os, pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent; ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
HTML = ROOT / 'tool' / 'FireworkBaker.html'
JS = r"""async (o) => {
  const P0 = o.entry ? replicaPM(o.entry).P : mtLayers(o.mt)[o.layer - 1].P;
  const P={...derive({...fxP(P0)}),flash:0,subFlash:0}, pl=displayPlan40(P), q=qualityOf(P), w=pl.L.cellW, h=pl.L.cellH;
  const span = Math.min(P.duration, pl.duration || P.duration), times = o.times || AUTO_EXPO40.fracs.map(f => f * span);
  const R=makeRenderer(P,familyOf(P.type)==='ground'?'loop':'burst'); gl.activeTexture(gl.TEXTURE0);
  const samples=new Target(w*q.ss,h*q.ss,gl.RGBA16F), cell=new Target(w,h,gl.RGBA16F), a=new Float32Array(w*h*4), out=[], G=P.encGamma||1;
  try {
    for (const t of times) {
      renderCell40(P,pl,R,(pl.t0||0)+t,samples,cell); cell.bind(); gl.readPixels(0,0,w,h,gl.RGBA,gl.FLOAT,a);
      const r = { t: +t.toFixed(3) };
      for (const E of o.E) { const thr=-Math.log(1-Math.pow(253/255,G))/E; let c=0; for (let i=0;i<a.length;i+=4) if(a[i]+a[i+1]>=thr) c++; r[E]=+(c/(w*h)).toFixed(4); }
      out.push(r); await nextTick();
    }
  } finally { samples.dispose(); cell.dispose(); R.dispose(); }
  return { cell: [w, h], exposure: +P.exposure, encGamma: G, rows: out };
}"""


async def run(a):
    from browser_runtime import launch_async, verify_renderer
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await launch_async(p); pg = await b.new_page(viewport={'width': 1000, 'height': 800})
        await pg.goto(HTML.resolve().as_uri() + '?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof renderCell40 === "function" && typeof mtLayers === "function" && typeof replicaPM === "function"', timeout=0)
        ren = await pg.evaluate("(()=>{const g=document.createElement('canvas').getContext('webgl2');const x=g&&g.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):'?'})()")
        try: verify_renderer(ren)
        except Exception as e: print('渲染器：', ren, e, flush=True)
        await pg.evaluate('state.stillBusy = true')
        r = await pg.evaluate(JS, dict(mt=a.mt, layer=a.layer, entry=a.entry, E=a.E, times=a.times))
        r['renderer'] = ren; await b.close(); return r


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--mt'); ap.add_argument('--layer', type=int, default=1); ap.add_argument('--entry')
    ap.add_argument('--E', required=True); ap.add_argument('--times'); ap.add_argument('--out', required=True)
    a = ap.parse_args(); a.E = [float(x) for x in a.E.split(',')]; a.times = [float(x) for x in a.times.split(',')] if a.times else None
    os.makedirs(a.out, exist_ok=True); r = asyncio.run(run(a))
    name = a.entry or f'mt:{a.mt} 第 {a.layer} 层'
    md = [f'# 过曝估算：{name}（单格 {r["cell"][0]}×{r["cell"][1]}，现在曝光 {r["exposure"]}，渲染器 {r["renderer"][:40]}）', '',
          '到顶（编码 ≥ 253/255）的像素占全格的比例；回放检查上限 2%。', '',
          '| 时刻 | ' + ' | '.join(f'E={e}' for e in a.E) + ' |', '| --- |' + ' --- |' * len(a.E)]
    for row in r['rows']: md.append(f"| +{row['t']:.2f} | " + ' | '.join(f"{row[str(e)] * 100:.2f}%" if str(e) in row else f"{row[e] * 100:.2f}%" for e in a.E) + ' |')
    mx = {e: max(row.get(str(e), row.get(e, 0)) for row in r['rows']) for e in a.E}
    md.append('| **最大** | ' + ' | '.join(f"**{mx[e] * 100:.2f}%**" for e in a.E) + ' |')
    json.dump(r, open(os.path.join(a.out, '过曝估算.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(os.path.join(a.out, '过曝估算.md'), 'w', encoding='utf-8').write('\n'.join(md) + '\n'); print('\n'.join(md))


if __name__ == '__main__':
    main()
