"""火花形状 / 亮度随机 / 光晕形状 通用性检查（对话框相机渲染，4.9.59；用户 10-10 01:37「后面别的效果也能通用吗？走查一遍」）。
本机显卡跑：python analysis/scripts/火花形状检查.py [--out 目录] [--html 旧版.html]
检查（每项 ✅ / ❌，退出码 0 = 全过）：
  S1 编译：火花多边形程序 礼花火花 / 拉长火花 / 地面循环火花 × 均匀 / 渐变亮核 × 光晕形状 高斯 / 幂律 / 多层柔光，全部能编译
  S2 不变：亮度随机 = 1e-9（走新程序但几乎不改亮度）和 0（老程序）出同一张图（每像素差 ≤ 1/255）——礼花 × 渐变亮核开 / 关 × 光晕形状 0 / 1 / 2、地面花型 各一组
     （4.9.57 的 bug：开亮度随机时渐变亮核被丢成圆盘；这一项在 4.9.58 上会失败）
  S3 起作用：火花形状 = 多边形 时，礼花和地面花型的图都变了（3 倍颗粒、512 px；亮核半径 < 0.6 px 时按设计退回圆盘，默认颗粒在 256 px 下测不出）
  S4 起作用：亮度随机 = 1 时图变了
  S5 面板：礼花（GPU）、地面花型显示「火花形状」；物理尾缀 / 升空尾缀 RT6 不显示
"""
import argparse, base64, io, json, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'analysis', 'local'))

JS = r"""async (a) => {
  const out = { compile: [], img: {}, panel: {} };
  const save = { ...particleQuality };
  for (const kind of ['spk', 'spkS', 'emit']) for (const cp of [0, 1]) for (const hs of [0, 1, 2]) {
    setParticleProfile({ coreProfile: cp, haloShape: hs, haloFrac: hs ? .3 : .22 });
    try { const pr = spkPolyProgram40(kind); out.compile.push([kind, cp, hs, !!(pr && pr.p)]); } catch (e) { out.compile.push([kind, cp, hs, false, String(e.message || e).slice(0, 300)]); }
  }
  setParticleProfile({});
  const ground = Object.keys(TYPE_NAMES).find(t => familyOf(t) === 'ground' && t !== 'phys');
  const cases = [];
  for (const cp of [0, 1]) for (const hs of [0, 1, 2]) cases.push(['kiku', { coreProfile: cp, haloShape: hs, haloFrac: .3 }]);
  cases.push([ground, {}]);
  const shot = async (type, extra, px = 256) => { const d = defaultsFor(type, 40); const P = { ...structuredClone(d.P), type, ...extra }; const M = structuredClone(d.M);
    const pl = displayPlan40(derive({ ...fxP(P) })), T = familyOf(type) === 'ground' ? (P.loopT || P.duration) : P.duration;
    const st = await renderStills40(P, M, { times: [+(0.35 * T).toFixed(3)], px, plan: pl }); return st[0].png; };
  for (const [type, ex] of cases) {
    const k = type + JSON.stringify(ex);
    // 多边形在亮核半径 < 0.6 px 时按设计退回圆盘（礼花默认火花在 256 px 定帧下就小于这个值），S3 用 3 倍颗粒 + 512 px 测
    const big = { ...ex, sparkSize: 3 * (+defaultsFor(type, 40).P.sparkSize || 1) };
    out.img[k] = { base: await shot(type, ex), tiny: await shot(type, { ...ex, sparkBrightJit: 1e-9 }), jit: await shot(type, { ...ex, sparkBrightJit: 1 }),
      bigBase: await shot(type, big, 512), poly: await shot(type, { ...big, sparkShape: 1 }, 512) };
  }
  const air = defaultsFor('kiku', 40).P, gp = defaultsFor(ground, 40).P;
  const show = P => { const sec = SCHEMA.flatMap(g => g.items || []).find(it => (it.sel || it[0]) === 'sparkShape'); const f = sec.show; return f ? !!f(P) : true; };
  out.panel = { kiku: show({ ...air, type: 'kiku' }), [ground]: show({ ...gp, type: ground }), tailS: show({ ...defaultsFor('tailS', 40).P, type: 'tailS' }) };
  const phys = Object.keys(TYPE_NAMES).find(t => { try { return isPhys({ type: t, ...defaultsFor(t, 40).P }); } catch (e) { return false; } });
  if (phys) out.panel[phys] = show({ ...defaultsFor(phys, 40).P, type: phys });
  out.ground = ground; out.ver = VERSION; return out;
}"""


def img(u): return np.asarray(Image.open(io.BytesIO(base64.b64decode(u.split(',', 1)[1]))).convert('RGB'), dtype=np.int16)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default=os.path.join(ROOT, 'analysis', 'probe', '火花形状检查'))
    ap.add_argument('--html', default='', help='换一个烘焙器（如旧版，放在 tool/ 下），缺省 tool/FireworkBaker.html')
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
    import compare
    if a.html: import pathlib; compare.TOOL = pathlib.Path(a.html).resolve().as_uri() + '?fast'
    from compare import SimSession
    s = SimSession()
    try: r = s.pg.evaluate(JS, {})
    finally: s.close()
    rows, ok = [], True
    def rec(k, good, note):
        nonlocal ok; ok &= bool(good); rows.append((k, '✅' if good else '❌', note)); print(('✅' if good else '❌'), k, note)
    bad = [c for c in r['compile'] if not c[3]]
    rec('S1 编译', not bad, f"{len(r['compile']) - len(bad)}/{len(r['compile'])} 个程序" + (f"；失败 {bad[:2]}" if bad else ''))
    for k, v in r['img'].items():
        b, t, j, bb, p = (img(v[x]) for x in ('base', 'tiny', 'jit', 'bigBase', 'poly'))
        d_t, d_p, d_j = int(np.abs(b - t).max()), float(np.abs(bb - p).mean()), float(np.abs(b - j).mean())
        rec(f'S2 不变 {k}', d_t <= 1, f'亮度随机 1e-9 vs 0 最大差 {d_t}/255')
        rec(f'S3 多边形起作用 {k}', d_p > 0.05, f'平均差 {d_p:.3f}')
        rec(f'S4 亮度随机起作用 {k}', d_j > 0.05, f'平均差 {d_j:.3f}')
        ex = json.loads(k[k.index('{'):]); tag = k.split('{')[0] + (f"_亮核{ex['coreProfile']}_光晕{ex['haloShape']}" if ex else '')
        Image.fromarray(np.hstack([b, j]).astype(np.uint8)).save(os.path.join(a.out, f"{tag}_基本-亮度随机.png"))
        Image.fromarray(np.hstack([bb, p]).astype(np.uint8)).save(os.path.join(a.out, f"{tag}_3倍颗粒_圆-多边形.png"))
    pn = r['panel']; g = r['ground']
    rec('S5 面板', pn.get('kiku') and pn.get(g) and not pn.get('tailS') and all(not v for kk, v in pn.items() if kk not in ('kiku', g)), json.dumps(pn, ensure_ascii=False))
    json.dump(dict(ver=r['ver'], ok=ok, rows=rows), open(os.path.join(a.out, '火花形状检查.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('全部通过' if ok else '有不过的项', '·', r['ver'])
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
