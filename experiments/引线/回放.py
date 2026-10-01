"""素材包的引擎式回放 + 官方回放检查。

1) 引擎式合成（和 analysis/scripts/回放检查.py 同一套材质公式 ramp(v)·v·ColorOverLife，但每层用自己的 Ramp）：
   按 30 fps tick 取帧（帧号 = floor(曲线)），各发射器按 delay / 面片大小（Size By Life）叠加，侧面平视。
2) 官方检查：把一个包按层拆成临时子包（每个子包只有这一层的发射器和它的 Ramp），逐个交给
   analysis/scripts/回放检查.py（及格线照抄 协作/标准.md 2.3），汇总 pass。
用法：python3 回放.py <素材包目录> <输出目录> [pc|mobile]
"""
import sys, os, json, shutil, subprocess, numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'analysis', 'scripts'))
import importlib; RC = importlib.import_module('回放检查')


def load(pack, plat):
    c = json.load(open(os.path.join(pack, 'cascade.json' if plat == 'pc' else 'cascade_mobile.json'), encoding='utf-8'))
    em = []
    for e in c['emitters']:
        mat = c['materials'][e['material']]; seq = c['textures'][mat['textures']['main']]; rp = c['textures'][mat['textures']['ramp']]
        tex = np.array(Image.open(os.path.join(pack, seq['file'])).convert('RGBA'), np.float32) / 255
        r = np.array(Image.open(os.path.join(pack, rp['file'])).convert('RGB'), np.float32) / 255; ramp = RC.srgb_to_lin(r[r.shape[0] // 2])
        mods = {m['m']: m for m in e['modules']}
        em.append(dict(name=e['name'], delay=e['required']['delay_s'], dur=e['required']['duration_s'], tex=tex, ramp=ramp,
                       cols=seq['cols'], rows=seq['rows'], frames=seq['frames'], size=mods['InitialSize']['StartSize']['const'][0] / 100,
                       sbl=mods['SizeByLife']['LifeMultiplier'], fcur=mods['DynamicParameter']['params']['frame'], col=mods['ColorOverLife']['ColorOverLife']))
    return c, em


def compose(em, t, px=480, view_m=None):
    """t 秒（开花后）的引擎画面：线性 RGB，视野 view_m 米（默认 = 最大面片）。"""
    view_m = view_m or max(e['size'] for e in em)
    out = np.zeros((px, px, 3), np.float32)
    for e in em:
        u = (t - e['delay']) / e['dur']
        if u < 0 or u >= 1: continue
        tick = np.floor((t - e['delay']) * 30) / 30; u = tick / e['dur']           # 30 fps tick
        f = int(np.floor(RC.curve(e['fcur'], u))); f = min(f, e['frames'] - 1)
        per = e['cols'] * e['rows']; ch, k = divmod(f, per); r, cc = divmod(k, e['cols'])
        H, W = e['tex'].shape[:2]; ch_h, ch_w = H // e['rows'], W // e['cols']
        v = e['tex'][r * ch_h:(r + 1) * ch_h, cc * ch_w:(cc + 1) * ch_w, ch]
        idx = np.clip((v * (len(e['ramp']) - 1)).astype(int), 0, len(e['ramp']) - 1)
        rgb = e['ramp'][idx] * v[..., None] * np.array(RC.curve(e['col'], u))[:3]
        side = e['size'] * float(np.array(RC.curve(e['sbl'], u))[0])               # 当前面片边长（米）
        sp = max(1, int(round(px * side / view_m)))
        chans = [np.array(Image.fromarray(rgb[..., i].astype(np.float32)).resize((sp, sp), Image.BILINEAR)) for i in range(3)]
        rgb2 = np.stack(chans, -1)
        o = (px - sp) // 2
        a0, b0 = max(0, o), min(px, o + sp); s0 = a0 - o
        out[a0:b0, a0:b0] += rgb2[s0:s0 + (b0 - a0), s0:s0 + (b0 - a0)]
    return out


def tone(a): return (np.clip(1 - np.exp(-a * 4.0), 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)   # 烘焙器引擎约定 ×4（yinxian.DISP_K）


def split_and_check(pack, outdir, plat='pc'):
    c = json.load(open(os.path.join(pack, 'cascade.json' if plat == 'pc' else 'cascade_mobile.json'), encoding='utf-8'))
    groups = {}
    for e in c['emitters']: groups.setdefault(e['name'].rsplit('_', 1)[0], []).append(e)
    results = {}
    for g, ems in groups.items():
        sub = os.path.join(outdir, f'_拆层_{plat}_{g}'); shutil.rmtree(sub, ignore_errors=True); os.makedirs(sub)
        tex = {}; mats = {}
        for e in ems:
            m = c['materials'][e['material']]; mats[e['material']] = {**m, 'textures': {'main': m['textures']['main'], 'ramp': 'ramp'}}
            for k in (m['textures']['main'], e['required']['cutout']): tex[k] = c['textures'][k]
            tex['ramp'] = c['textures'][m['textures']['ramp']]
        for k, v in tex.items(): shutil.copy(os.path.join(pack, v['file']), sub)
        cj = {**c, 'textures': tex, 'materials': mats, 'emitters': ems}
        json.dump(cj, open(os.path.join(sub, 'cascade.json'), 'w'), ensure_ascii=False, indent=1)
        img = os.path.join(outdir, f'官方回放检查_{plat}_{g}.jpg')
        r = subprocess.run([sys.executable, os.path.join(ROOT, 'analysis', 'scripts', '回放检查.py'), img, sub], capture_output=True, text=True)
        js = json.load(open(img.rsplit('.', 1)[0] + '.json', encoding='utf-8'))
        results[g] = {'pass': js.get('pass'), '退出码': r.returncode, '各发射器': [{k: L.get(k) for k in ('pack', 'pass', 'fails', 'frames', 'cell_px', 'shown_frac', 'edge_frames', 'saturated_max', 'empty_mid', 'empty_tail', 'center_jump_max_px512') if k in L} for L in js.get('layers', [])]}
        shutil.rmtree(sub, ignore_errors=True)
    return results


if __name__ == '__main__':
    pack, out = sys.argv[1], sys.argv[2]; plat = sys.argv[3] if len(sys.argv) > 3 else 'pc'
    os.makedirs(out, exist_ok=True)
    c, em = load(pack, plat)
    ts = [0.2, 0.5, 0.8, 1.1, 1.4, 1.7, 2.0, 2.4, 3.0, 3.6, 4.2, 5.0]
    view = max(e['size'] for e in em)
    tiles = [tone(compose(em, t, 360, view)) for t in ts]
    rows = [np.hstack(tiles[i:i + 6]) for i in range(0, len(tiles), 6)]
    Image.fromarray(np.vstack(rows)).save(os.path.join(out, f'引擎回放_{plat}.jpg'), quality=90)
    res = split_and_check(pack, out, plat)
    json.dump(res, open(os.path.join(out, f'官方回放检查_{plat}.json'), 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(res, ensure_ascii=False, indent=1))
