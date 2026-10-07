"""fwl.cascade/1 素材包 → 烘焙器素材页的 preview.js（按引擎方式播放导出的真实素材包）。

和 export_preview.py 的区别：那个只认烘焙器自己导出的单张母版（<名>.json）；这个直接读素材包里的 cascade.json，
所以实验目录（experiments/…）里手写导出的包、多发射器、粒子发射器（soft_dot）都能看。

对应关系（Cascade 模块 → 素材页发射器字段，单位换成米、秒）：
  Required.delay_s / Spawn.Bursts / Spawn.Rate（常量或曲线） → bursts / spawn.curve（时间都加上 delay）
  Lifetime → life；InitialSize → size（软圆点）或 tex.wh（序列面片）；SphereLocation → sphere
  InitialLocation（常量或按发射器时间的曲线） → locCurve；InitialVelocity：常量 / 曲线 → velCurve，均匀随机 → velAdd
  Drag → drag / dragRange；ConstAcceleration → accel；SizeByLife → sizeLife（软圆点）或 tex.sizeKeys / tex.whKeys
  DynamicParameter.frame → tex.keys；ColorOverLife → col（软圆点）或 tex.col
  材质 flipbook_rgba → 灰度 RGBA 接力贴图 + Ramp（贴图线性，sRGB 关）；soft_dot → dot（不需要贴图）
有软圆点发射器时清单开 hdr（线性累加后统一曝光，和引擎的加色混合一样）。
贴图按每格 256 像素存（素材页播放时本来就把每格缩到 256），preview.js 不会太大。

用法：python3 analysis/scripts/fwl_preview.py <素材包目录> <输出 preview.js> [--title 标题] [--note 说明] [--view 米] [--diameter 米] [--center x,z]
"""
import argparse, base64, io, json, os
from PIL import Image

CELL = 256


def _enc(im, fmt='PNG'):
    b = io.BytesIO(); im.save(b, fmt, optimize=True)
    return f'data:image/{fmt.lower()};base64,' + base64.b64encode(b.getvalue()).decode()


def _lerp(keys, u):
    if u <= keys[0][0]: return keys[0][1]
    for (a, va), (b, vb) in zip(keys, keys[1:]):
        if u <= b:
            k = (u - a) / max(1e-9, b - a)
            return [x + (y - x) * k for x, y in zip(va, vb)] if isinstance(va, list) else va + (vb - va) * k
    return keys[-1][1]


def _keys(d, one):
    """Distribution（const / curve）→ 关键点；uniform 取中值"""
    if d is None: return [[0, one], [1, one]]
    if 'curve' in d: return d['curve']
    if 'const' in d: return [[0, d['const']], [1, d['const']]]
    if 'uniform' in d:
        a, b = d['uniform']; m = [(x + y) / 2 for x, y in zip(a, b)] if isinstance(a, list) else (a + b) / 2
        return [[0, m], [1, m]]
    return [[0, one], [1, one]]


def _colorKeys(M):
    """4.9.24：黑底上看到的颜色 = Color Over Life 的 RGB × Alpha × Scale Color/Life 的 RGB × Alpha（半透明材质，淡出 / 闪烁在 Alpha）。
    几条曲线所有关键点的时刻合在一起，逐点相乘（素材页按线性插值播放）"""
    c = M['ColorOverLife'][0] if 'ColorOverLife' in M else {}
    s = M['ColorScaleOverLife'][0] if 'ColorScaleOverLife' in M else {}
    ks = [_keys(c.get('ColorOverLife'), [1, 1, 1]), _keys(c.get('AlphaOverLife'), 1), _keys(s.get('ColorScaleOverLife'), [1, 1, 1]), _keys(s.get('AlphaScaleOverLife'), 1)]
    us = sorted({k[0] for kk in ks for k in kk})
    out = []
    for u in us:
        rgb, a, srgb, sa = (_lerp(kk, u) for kk in ks)
        out.append([u, [x * y * a * sa for x, y in zip(rgb, srgb)]])
    return out


def _dist(d, scale=1.0):
    """Distribution → (lo, hi) 或 ('curve', keys)"""
    if 'const' in d:
        v = d['const']; v = [x * scale for x in v] if isinstance(v, list) else v * scale; return v, v
    if 'uniform' in d:
        a, b = d['uniform']
        f = (lambda v: [x * scale for x in v] if isinstance(v, list) else v * scale); return f(a), f(b)
    if 'curve' in d:
        return 'curve', [[t, [x * scale for x in v] if isinstance(v, list) else v * scale] for t, v in d['curve']]
    raise ValueError(d)


def _shift(keys, dt):
    return [[round(t + dt, 5), v] for t, v in keys]


def convert(pack, out, title=None, note='', view=None, diameter=None, center=None, cascade='cascade.json'):
    cj = json.load(open(os.path.join(pack, cascade), encoding='utf-8'))
    texs, mats = cj.get('textures', {}), cj.get('materials', {})
    images, ems, hdr, ext = {}, [], False, [0.0, 0.0, 0.0, 0.0]   # ext：粒子出生位置的大致范围（米），给 view 用
    dur = 0.0
    for e in cj['emitters']:
        req = e['required']; delay = float(req.get('delay_s', 0)); D = float(req['duration_s'])
        dur = max(dur, delay + D)
        M = {}
        for m in e['modules']: M.setdefault(m['m'], []).append(m)
        mat = mats.get(e['material'], {}); role = mat.get('role', 'soft_dot')
        d = {'name': e['name'], 'index': str(len(ems) + 1).zfill(2), 'seed': len(ems) + 1, 'rot': False}
        sp = e.get('spawn', {})
        d['bursts'] = [[round(delay + float(t), 5), int(n)] for t, n in sp.get('bursts', [])]
        r = sp.get('rate', {'const': 0})
        if 'curve' in r: d['spawn'] = {'curve': _shift(r['curve'], delay)}
        elif r.get('const', 0) > 0: d['spawn'] = {'curve': [[delay, r['const']], [delay + D, r['const']], [delay + D + 1e-3, 0]]}
        lo, hi = _dist(M['Lifetime'][0]['Lifetime']); d['life'] = [lo, hi]
        if 'InitialLocation' in M:
            x = _dist(M['InitialLocation'][0]['StartLocation'], 0.01)
            if x[0] == 'curve': d['locCurve'] = _shift(x[1], delay)
            elif any(abs(v) > 1e-9 for v in x[0]): d['locCurve'] = [[0, x[0]]]
        if 'SphereLocation' in M:
            s = M['SphereLocation'][0]; rr = _dist(s['StartRadius'], 0.01)[0]
            d['sphere'] = {'r': rr, 'vel': 0, 'surface': bool(s.get('SurfaceOnly'))}
        vadd = None
        for m in M.get('InitialVelocity', []):
            x = _dist(m['StartVelocity'], 0.01)
            if x[0] == 'curve': d['velCurve'] = _shift(x[1], delay)
            elif x[0] == x[1] and 'velCurve' not in d: d['velCurve'] = [[0, x[0]]]
            else:
                a, b = x; vadd = [list(a), list(b)] if vadd is None else [[p + q for p, q in zip(vadd[0], a)], [p + q for p, q in zip(vadd[1], b)]]
        if vadd: d['velAdd'] = vadd
        if 'Drag' in M:
            a, b = _dist(M['Drag'][0]['DragCoefficientRaw'])
            if a == b: d['drag'] = a
            else: d['dragRange'] = [a, b]
        if 'ConstAcceleration' in M: d['accel'] = [x * 0.01 for x in M['ConstAcceleration'][0]['Acceleration']]
        sz = _dist(M['InitialSize'][0]['StartSize'], 0.01) if 'InitialSize' in M else ([1, 1, 1], [1, 1, 1])
        sbl = M['SizeByLife'][0] if 'SizeByLife' in M else None
        colk = _colorKeys(M)
        if role == 'soft_dot':
            hdr = True; d['dot'] = True; d['size'] = [sz[0][0], sz[1][0]]; d['col'] = colk
            if sbl: d['sizeLife'] = [[u, v[0]] for u, v in sbl['LifeMultiplier']['curve']]
        elif role == 'flipbook_rgba':
            tx = texs[mat['textures']['main']]; rp = texs.get(mat['textures'].get('ramp'), {}).get('file')
            cut = texs.get(req.get('cutout'), {}).get('file') if req.get('cutout') else None
            im = Image.open(os.path.join(pack, tx['file'])).convert('RGBA'); cols, rows = tx['cols'], tx['rows']
            cw, ch = im.width // cols, im.height // rows; s = min(1.0, CELL / max(cw, ch))
            if s < 1: im = im.resize((round(im.width * s), round(im.height * s)), Image.BOX)
            key = e['name'] + '/' + tx['file']
            for c, band in zip('RGBA', im.split()):
                if c in 'RGBA'[:tx.get('channels', 4)]: images[key + '#' + c] = _enc(band)
            if rp and e['name'] + '/' + rp not in images: images[e['name'] + '/' + rp] = _enc(Image.open(os.path.join(pack, rp)).convert('RGB'))
            if cut: images[e['name'] + '/' + cut] = _enc(Image.open(os.path.join(pack, cut)).convert('L').resize((256, 256), Image.BOX))
            fr = M['DynamicParameter'][0]['params']['frame']; fk = fr['curve'] if 'curve' in fr else [[0, fr['const']], [1, fr['const']]]
            t = {'file': key, 'mode': 'gray', 'ramp': e['name'] + '/' + rp if rp else None, 'cols': cols, 'rows': rows, 'chans': tx.get('channels', 4),
                 'frames': tx['frames'], 'keys': fk, 'col': colk, 'tone': 'baker', 'gamma': 1, 'cutout': e['name'] + '/' + cut if cut else None,
                 'wh': [sz[0][0], sz[0][1]]}
            if sbl:
                k = sbl['LifeMultiplier']['curve'] if 'curve' in sbl['LifeMultiplier'] else [[0, sbl['LifeMultiplier']['const']], [1, sbl['LifeMultiplier']['const']]]
                mx, my = sbl.get('MultiplyX', True), sbl.get('MultiplyY', True)
                if mx and my and all(abs(v[0] - v[1]) < 1e-9 for _, v in k): t['sizeKeys'] = [[u, v[0]] for u, v in k]
                else: t['whKeys'] = [[u, [v[0] if mx else 1, v[1] if my else 1]] for u, v in k]
            d['tex'] = {'A': t}
            if req.get('screen_alignment') == 'Velocity': d['align'] = 'velocity'
        else:
            raise ValueError(f'{e["name"]}: 素材页还不支持材质角色 {role}')
        # 粗估范围：出生位置曲线 + 面片尺寸
        pts = [v for _, v in d.get('locCurve', [[0, [0, 0, 0]]])]
        for v in pts: ext = [min(ext[0], v[0]), max(ext[1], v[0]), min(ext[2], v[2]), max(ext[3], v[2])]
        if 'tex' in d: w2 = max(d['tex']['A']['wh']) / 2; ext = [min(ext[0], -w2), max(ext[1], w2), min(ext[2], -w2), max(ext[3], w2)]
        ems.append(d)
    if center is None: center = [(ext[0] + ext[1]) / 2, (ext[2] + ext[3]) / 2]
    if view is None: view = round(max(ext[1] - ext[0], ext[3] - ext[2]) * 1.1 + 10, 1)
    man = {'title': title or cj.get('name', os.path.basename(pack)), 'duration': round(dur + 0.3, 2), 'view': view, 'center': center,
           'variants': {'A': 'PC' if cj.get('platform', 'pc') == 'pc' else '手机'}, 'emitters': ems, 'note': note, 'hdr': hdr}
    if diameter: man['diameter'] = diameter
    jid = os.path.basename(os.path.dirname(os.path.abspath(out)))
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    open(out, 'w', encoding='utf-8').write('FW_ASSET_LOADED(' + json.dumps(jid) + ', ' + json.dumps({'manifest': man, 'images': images}, ensure_ascii=False) + ');\n')
    return os.path.getsize(out), man


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('pack'); ap.add_argument('out'); ap.add_argument('--title'); ap.add_argument('--note', default='')
    ap.add_argument('--view', type=float); ap.add_argument('--diameter', type=float); ap.add_argument('--center'); ap.add_argument('--mobile', action='store_true')
    a = ap.parse_args()
    n, man = convert(a.pack, a.out, a.title, a.note, a.view, a.diameter, [float(x) for x in a.center.split(',')] if a.center else None,
                     'cascade_mobile.json' if a.mobile else 'cascade.json')
    print(a.out, f'{n / 1024:.0f} KB', 'hdr' if man['hdr'] else '', [e['name'] for e in man['emitters']], 'view', man['view'], 'center', man['center'])
