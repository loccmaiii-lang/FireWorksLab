"""条目（单层或组合）和实拍在「开花后同一秒」的对照（不是按燃烧百分比）：云端软件渲染也能跑，用来自检时间线。

和烘焙器里看到的一样：参数取自烘焙器的条目（replicaPM），每层按自己整段发光期定曝光（和烘焙同口径），加色叠加。
用法：
  python3 analysis/scripts/时刻对照.py <条目号> <输出.jpg> [--times 0.5,1.5,2.5,3.5,4.5] [--px 300]
    [--mods '{"<层条目号>": {"burn": 3.6, "M.headInt": 2}}']    临时改参数试效果（不写回条目）
输出：上一行实拍、下一行模拟（组合各层叠加）；同名 .json 记下参数改动。
"""
import sys, os, json, io, base64
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)


def main():
    args = sys.argv[1:]; times = [0.5, 1.5, 2.5, 3.5, 4.5]; px = 300; mods = {}
    if '--times' in args: i = args.index('--times'); times = [float(x) for x in args[i + 1].split(',')]; del args[i:i + 2]
    if '--px' in args: i = args.index('--px'); px = int(args[i + 1]); del args[i:i + 2]
    if '--mods' in args: i = args.index('--mods'); mods = json.loads(args[i + 1]); del args[i:i + 2]
    eid, out = args[0], args[1]
    from compare import SimSession
    import importlib; rc = importlib.import_module('回放检查')
    s = SimSession()
    info = s.pg.evaluate(f"""(() => {{ const e = FW_REVIEW_LIST.find(x => x.id === {json.dumps(eid)}); if (!e) return null;
        const L = e.kind === 'combo' ? e.combo.layers.map(l => ({{ id: l.m.slice(4), delay: l.delay || 0, scale: l.scale || 1 }})) : [{{ id: e.id, delay: 0, scale: 1 }}];
        return {{ layers: L, video: e.video || null, vmeta: e.vmeta || null, name: e.name }}; }})()""")
    if not info: raise SystemExit('找不到条目 ' + eid)
    lays = []
    for L in info['layers']:
        pm = s.pg.evaluate(f"(() => {{ const r = replicaPM({json.dumps(L['id'])}); return {{ P: r.P, M: r.M }}; }})()")
        for k, v in (mods.get(L['id']) or {}).items():
            if k.startswith('M.'): pm['M'][k[2:]] = v
            else: pm['P'][k] = v
        g = s.pg.evaluate(f"(() => {{ const P = {json.dumps(pm['P'])}; const fm = __fw.measure(derive({{...P, headBright: Math.max(P.headBright || 0, 1)}})); return fm ? [fm.x0, fm.x1, fm.y0, fm.y1] : null; }})()")
        lays.append(dict(L, P=pm['P'], M=pm['M'], box=g))
    boxes = [(np.array(l['box']) * l['scale']) for l in lays if l['box']]
    x0 = min(b[0] for b in boxes); x1 = max(b[1] for b in boxes); y0 = min(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    half = max(x1 - x0, y1 - y0) / 2 * 1.08; cy = (y0 + y1) / 2
    acc = [np.zeros((px, px, 3), np.float32) for _ in times]; base = None
    for li, L in enumerate(lays):
        P = L['P']; dl = L['delay']; sc = L['scale']
        st = float(P.get('ignDelay') or 0) + (float(P.get('burn', 1)) if (P.get('afterBurn') or 0) > 0 else 0)
        if P.get('type') in ('senrin', 'crossette'): st = float(P.get('subDelay', 1))
        dur = float(P.get('afterBurn') or 0) if (P.get('afterBurn') or 0) > 0 else float(P.get('subBurn', 1) if P.get('type') in ('senrin', 'crossette') else P.get('burn', 3))
        en = min(float(P.get('duration', 5)), st + dur); probes = [round(st + (en - st) * (k + 0.5) / 8, 3) for k in range(8)]
        loc = sorted({round(t - dl, 4) for t in times if t - dl >= 0} | {-0.05})
        res = s.pg.evaluate(f"__fw.renderStills({json.dumps(P)}, {json.dumps(L['M'])}, {{ times: {json.dumps(loc)}, px: {px}, half: {half / sc}, cy: {cy / sc}, shutter: 1/40, sub: 4, probes: {json.dumps(probes)} }})")
        got = {round(r['t'], 4): np.array(Image.open(io.BytesIO(base64.b64decode(r['png'].split(',')[1]))).convert('RGB'), np.float32) for r in res}
        # 天空底色：取开花前一帧的中位色（整张一个颜色）；不直接减那一帧（开花前一刻画面中间可能有弹体 / 闪光，会被当成底色叠进每一张）
        g0 = got.get(-0.05); sky = np.median(g0.reshape(-1, 3), axis=0)[None, None, :] if g0 is not None else 0
        if base is None: base = sky
        for i, t in enumerate(times):
            k = round(t - dl, 4)
            if k in got: acc[i] += np.clip(got[k] - sky, 0, None)
        print(f"{L['id']}：出图 {len(got)} 张", flush=True)
    sims = [np.clip(a + base, 0, 255).astype(np.uint8) for a in acc]
    refs = None
    if info.get('vmeta') and info.get('video'):
        refs = rc.ref_frames(dict(info['vmeta'], video=os.path.join(ROOT, 'tool', info['video'])), times, px)
    rows = ([refs] if refs else []) + [sims]
    sheet = Image.new('RGB', (80 + px * len(times), 22 + px * len(rows)), (14, 15, 20)); dr = ImageDraw.Draw(sheet)
    names = (['实拍'] if refs else []) + ['模拟']
    font = None
    from PIL import ImageFont
    for fp in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc'):
        if os.path.exists(fp): font = ImageFont.truetype(fp, 13); break
    for r, row in enumerate(rows):
        dr.text((4, 22 + r * px + px // 2), names[r], fill=(220, 210, 180), font=font)
        for c, im in enumerate(row): sheet.paste(Image.fromarray(im), (80 + c * px, 22 + r * px))
    for c, t in enumerate(times): dr.text((80 + c * px + 4, 4), f'开花后 {t:.2f} s', fill=(233, 180, 95), font=font)
    sheet.save(out, quality=88)
    json.dump(dict(entry=eid, times=times, mods=mods), open(os.path.splitext(out)[0] + '.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    s.close()


if __name__ == '__main__':
    main()
