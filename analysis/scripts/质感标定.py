"""质感标定：一个参数扫几档，渲染出来用打点（同一把尺子）量，得到「参数 → 画面上量到的数」的表（对话框新花型，用户 2026-10-08 08:58 的方法第 5 步要的正向标定）。

  python3 analysis/scripts/质感标定.py --mt kinzuiLime --layer 2 --set "headSize=1.0,1.7,2.6" --set "haloFrac=0,0.4,0.8" \
      --times 1.2,2.0 --ref <实拍的 打点.json> --out <目录> [--px 1024] [--all-layers]

- 底：多层模板 mt:<id> 的各层参数（mtLayers），只改 --layer 那一层（层号从 1 起）；--set 每个一组扫描，其它参数不动。
  参数名前加 "M." 改颜色那边（M.headInt、M.ramp2……）；一档里改几个参数用 ";"：--set "coreProfile=1;haloFrac=0.6"（整个当一档）。
- 渲染：烘焙器 mtRenderLayers（和实时模拟同一套渲染 + 色调映射），默认只画这一层（--all-layers 画全部层）。
- 量：按实拍同一时刻的外层半径（--ref 的 R_px）把渲染图缩放到同一像素尺度，再用 打点.py 的点 / 线 / 纹理量。
- 出：<目录>/标定.json、标定.md（每组扫描一张表）、每档的渲染图（png，放大局部看）。
本机显卡跑（云端软件渲染一张要几十秒）。
"""
import argparse, asyncio, base64, io, json, os, sys
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import importlib
D = importlib.import_module('打点')
HTML = os.path.join(ROOT, 'tool', 'FireworkBaker.html')


def parse_sets(sets):
    out = []
    for s in sets:
        if s == 'base': out.append(('base', [])); continue      # 只画底（不扫）：量现在的样子
        if ';' in s:     # 一档改几个参数
            kv = dict(x.split('=', 1) for x in s.split(';')); out.append(('+'.join(kv), [{k: num(v) for k, v in kv.items()}]))
        else:
            k, vs = s.split('=', 1); out.append((k, [{k: num(v)} for v in vs.split(',')]))
    return out


def num(v):
    try: return float(v)
    except ValueError: return v


async def render_all(a, sweeps):
    from playwright.async_api import async_playwright
    from browser_runtime import launch_async, verify_renderer
    res = {}
    async with async_playwright() as p:
        b = await launch_async(p); pg = await b.new_page(viewport={'width': 1200, 'height': 900})
        await pg.goto('file://' + os.path.abspath(HTML).replace('\\', '/') + '?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof mtLayers === "function" && typeof mtRenderLayers === "function"', timeout=0)
        ren = await pg.evaluate("(()=>{const g=document.createElement('canvas').getContext('webgl2');const x=g&&g.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):'?'})()")
        try: verify_renderer(ren)
        except Exception as e: print('渲染器：', ren, e, flush=True)
        res['_renderer'] = ren
        js = r"""async (o) => {
          const L = mtLayers(o.id).map(x => ({ P: { ...x.P }, M: { ...x.M }, delay: x.delay || 0, headInt: x.headInt }));
          const i = o.layer - 1, mod = o.mod || {};
          for (const [k, v] of Object.entries(mod)) { if (k.startsWith('M.')) { if (k === 'M.headInt') L[i].headInt = v; else L[i].M[k.slice(2)] = v; } else L[i].P[k] = v; }
          L[i].P = derive(L[i].P);
          const use = o.all ? L : [L[i]];
          // 取景：按外层（第 1 层）最终到达半径（和缩略图同一口径），所有档同一个取景，像素尺度不随参数变
          const P0 = L[0].P, R0 = reachOf(P0.v0, P0.vt, P0.burn);
          const out = await mtRenderLayers(use, { times: o.times, px: o.px, half: R0 * 1.3, cy: 0 });
          return { R0, half: R0 * 1.3, shots: out.map(s => ({ t: s.t, png: s.png })) };
        }"""
        for name, variants in sweeps:
            res[name] = []
            for v in [None] + variants:
                r = await pg.evaluate(js, dict(id=a.mt, layer=a.layer, mod=v or {}, times=a.times, px=a.px, all=a.all_layers))
                res[name].append(dict(mod=v, R0=r['R0'], half=r['half'], shots=r['shots']))
                print(name, v, '→', len(r['shots']), '张', flush=True)
        await b.close()
    return res


def measure_shot(png_b64, t, Rref, half_m, px):
    img = cv2.imdecode(np.frombuffer(base64.b64decode(png_b64.split(',')[1]), np.uint8), cv2.IMREAD_COLOR)
    H, W = img.shape[:2]; cx, cy = W / 2, H / 2
    v = img.max(2).astype(np.float32); Rr = D.radius_of(v, cx, cy, 20)
    if not Rr: return None, img
    k = Rref / Rr if Rref else 1.0     # 缩放到实拍同一像素尺度
    if abs(k - 1) > 0.02:
        img = cv2.resize(img, (int(round(W * k)), int(round(H * k))), interpolation=cv2.INTER_AREA if k < 1 else cv2.INTER_LINEAR); cx, cy = img.shape[1] / 2, img.shape[0] / 2
    R = Rref or Rr; sig = img.astype(np.float32); lin = D.to_lin(img)
    pts, lines, prof, tex = D.measure(img, sig, cx, cy, R, noise=1.0, lin=lin)
    st = D.point_stats(pts)
    out = dict(R_render_px=round(Rr, 1), scale=round(k, 3), m_per_px=round(2 * half_m / px / k, 4),
               pts={kk: st.get(kk) for kk in ('n', 'flux', 'flux_spread', 'fwhm', 'halo_ratio', 'elong', 'streak_frac', 'core_rgb', 'halo_rgb', 'core_cls', 'halo_cls', 'core_sat', 'halo_sat')},
               tex={kk: {x: vv.get(x) for x in ('thick', 'r_in', 'r_out', 'width_px', 'n', 'bead', 'grad', 'coh_in', 'contrast', 'level', 'c_in', 'c_out')} for kk, vv in tex.items()})
    return out, img


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--mt', required=True); ap.add_argument('--layer', type=int, required=True); ap.add_argument('--set', action='append', required=True)
    ap.add_argument('--times', required=True); ap.add_argument('--ref'); ap.add_argument('--out', required=True); ap.add_argument('--px', type=int, default=1024); ap.add_argument('--all-layers', action='store_true')
    a = ap.parse_args(); a.times = [float(x) for x in a.times.split(',')]; a.all_layers = bool(a.all_layers)
    os.makedirs(a.out, exist_ok=True); sweeps = parse_sets(a.set)
    ref = json.load(open(a.ref, encoding='utf-8')) if a.ref else None
    Rref = lambda t: min(ref['frames'], key=lambda f: abs(f['t'] - t))['R_px'] if ref else None
    raw = asyncio.run(render_all(a, sweeps))
    table = dict(mt=a.mt, layer=a.layer, times=a.times, renderer=raw.pop('_renderer', '?'), sweeps={})
    md = [f'# 质感标定：mt:{a.mt} 第 {a.layer} 层（{"全部层一起画" if a.all_layers else "只画这一层"}）', '', f'渲染器：{table["renderer"]}；按实拍同一时刻外层半径缩放到同一像素尺度后量（打点.py）。', '']
    for name, rows in raw.items():
        table['sweeps'][name] = []
        md += [f'## {name}', '']
        hdr = None
        for r in rows:
            for s in r['shots']:
                m, img = measure_shot(s['png'], s['t'], Rref(s['t']), r['half'], a.px)
                tag = 'base' if not r['mod'] else ','.join(f'{k}={v}' for k, v in r['mod'].items())
                cv2.imwrite(os.path.join(a.out, f'{name}_{tag}_{s["t"]:.2f}.png'.replace('/', '_').replace(':', '_')), img)
                table['sweeps'][name].append(dict(mod=r['mod'], t=s['t'], m=m))
                if not m: continue
                p, tw, tb = m['pts'], m['tex'].get('暖色线', {}), m['tex'].get('亮线', {})
                row = [tag, f"+{s['t']:.2f}s", p.get('n'), p.get('flux_spread'), (p.get('fwhm') or [None] * 3)[1], (p.get('halo_ratio') or [None] * 3)[1], (p.get('elong') or [None] * 3)[1],
                       p.get('halo_cls'), p.get('halo_sat'), tw.get('thick'), tw.get('width_px'), tw.get('bead'), tw.get('grad'), tw.get('level'), tb.get('contrast')]
                if hdr is None:
                    hdr = ['档', '时刻', '点数', '亮度差', 'FWHM', '光晕占比', '拉长', '晕色', '晕饱和', '暖线带厚', '暖线宽', '暖线成串', '暖线外/内', '暖线亮度', '亮线对比']
                    md += ['| ' + ' | '.join(hdr) + ' |', '|' + ' --- |' * len(hdr)]
                md.append('| ' + ' | '.join(str(x) for x in row) + ' |')
        md.append('')
    json.dump(table, open(os.path.join(a.out, '标定.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    open(os.path.join(a.out, '标定.md'), 'w', encoding='utf-8').write('\n'.join(md) + '\n'); print('→', os.path.join(a.out, '标定.md'))


if __name__ == '__main__':
    main()
