"""星头 + 白热段的无缝循环序列（只含燃气焰 + 火粉柱）。随弹体坐标、匀速 v_ref 下是稳态，火粉按周期复制 → 无缝循环。
面片中心 = 星头（贴图上半空、下半是火粉柱），不依赖导入器还不支持的 pivot_offset。
输出：T_<名>_Head.png（16×1 格 × RGBA = 64 帧，2048×512；手机 1024×256）、_Head_Ramp.png、_Head_Cutout.png。"""
import os, sys, json, math, numpy as np, cv2
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import v6
TP = v6.TP
SPIN_K = 0.3
FR = 64; COLS = 16; CW, CH = 128, 512; V_REF = 50.0


def bake(key, out_dir, expo=None):
    P, pops = v6.recipe(key); o = v6.OPTS[key]
    P = json.loads(json.dumps(P)); P['const_v'] = V_REF; P['turb'] = 0.0; P['wob'] = 0.0
    Pd = FR / v6.FPS; P['spin']['f'] = round(P['spin']['f'] * Pd) / Pd          # 自转转数取整 → 周期内整圈
    P['spin']['amp'] *= SPIN_K                                                 # 火粉柱里的自转波纹压小（窄面片上会变成一串珠子）
    P['pops'] = [q for q in P['pops'] if q['name'] == '火粉']
    P['T'] = 10 * Pd
    S0 = TP.emit(P, t_range=(0.0, Pd))
    S = {k: [] for k in S0}
    for kk in (-1, 0, 1, 2):                                                   # 周期复制（火粉最长寿命 < 一个周期）
        for k, v in S0.items():
            if k == 'tb': S[k].append(v + kk * Pd)
            elif k == 'p0': S[k].append(v + np.array([0, 0, V_REF * kk * Pd]))
            else: S[k].append(v)
    S = {k: np.concatenate(v) for k, v in S.items()}
    life_max = float(np.percentile(S0['life'], 99)); L = 1.8 + 0.04 * V_REF + V_REF * life_max * 0.85   # 白热柱可见长度（m）
    ppm = (CH / 2) / L; wpx = max(8, int(round(o['head_w'] * ppm)))
    cam = TP.Cam('shell', wpx, CH, wpx / 2, CH / 2, ppm=ppm, shutter=1 / 60, nsub=4, psf=0.6)
    frames = [TP.render(P, S, 2 * Pd + f / v6.FPS, cam, rgb=False)[..., 0] for f in range(FR)]
    if expo is None: expo = -math.log(0.05) / max(np.percentile(np.max(frames, 0), 99.7), 1e-9)
    gray = [cv2.resize(1 - np.exp(-f * expo), (CW, CH), interpolation=cv2.INTER_AREA) for f in frames]
    tex = np.zeros((CH, COLS * CW, 4), np.uint8)
    for i, g in enumerate(gray):
        ch, c = divmod(i, COLS); q = (np.clip(g, 0, 1) * 255 + 0.5).astype(np.uint8); q[:, :1] = 0; q[:, -1:] = 0; q[:1] = 0; q[-1:] = 0
        tex[:, c * CW:(c + 1) * CW, ch] = q
    name = v6.NAMES[key]; os.makedirs(out_dir, exist_ok=True)
    Image.fromarray(tex, 'RGBA').save(os.path.join(out_dir, f'T_{name}_Head.png'))
    Image.fromarray(cv2.resize(tex, (COLS * CW // 2, CH // 2), interpolation=cv2.INTER_AREA), 'RGBA').save(os.path.join(out_dir, f'T_{name}_Head_M.png'))
    cut = (np.max(gray, 0) >= 3 / 255).astype(np.uint8) * 255; cut = cv2.dilate(cv2.resize(cut, (64, 256), interpolation=cv2.INTER_AREA), np.ones((5, 5), np.uint8))
    Image.fromarray(cut).save(os.path.join(out_dir, f'T_{name}_Head_Cutout.png'))
    # Ramp：灰度 → 黑体颜色（暗 2000 K 金橙 → 亮 2700 K 白），只管色相（最亮通道 = 1）
    Ts = np.linspace(2200, 3300, 256); rgb = np.array([v6.bb(T) for T in Ts])
    srgb = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * np.power(np.clip(rgb, 0, 1), 1 / 2.4) - 0.055)
    Image.fromarray(np.repeat((np.clip(srgb, 0, 1) * 255 + 0.5).astype(np.uint8)[None], 8, 0)).save(os.path.join(out_dir, f'T_{name}_Head_Ramp.png'))
    info = {'v_ref': V_REF, 'len_m': round(float(L), 2), 'expo': float(expo), 'ramp': f'T_{name}_Head_Ramp.png', 'col': 2.0,
            'pc': {'file': f'T_{name}_Head.png', 'cols': COLS, 'rows': 1, 'frames': FR, 'cutout': f'T_{name}_Head_Cutout.png'},
            'mobile': {'file': f'T_{name}_Head_M.png', 'cols': COLS, 'rows': 1, 'frames': FR, 'cutout': f'T_{name}_Head_Cutout.png'}}
    json.dump(info, open(os.path.join(out_dir, f'{name}_head.json'), 'w'), ensure_ascii=False, indent=1)
    return info


def cell_reader(out_dir, key, plat='pc'):
    """预览用：按帧号取格子，返回线性 RGB（Ramp(v)·v）"""
    name = v6.NAMES[key]; f = f'T_{name}_Head.png' if plat == 'pc' else f'T_{name}_Head_M.png'
    tex = np.array(Image.open(os.path.join(out_dir, f)).convert('RGBA'), np.float32) / 255
    r = np.array(Image.open(os.path.join(out_dir, f'T_{name}_Head_Ramp.png')).convert('RGB'), np.float32)[4] / 255
    rl = np.where(r <= 0.04045, r / 12.92, ((r + 0.055) / 1.055) ** 2.4)
    cw = tex.shape[1] // COLS
    def get(f):
        ch, c = divmod(int(f) % FR, COLS); v = tex[:, c * cw:(c + 1) * cw, ch]
        return rl[np.clip((v * 255).astype(int), 0, 255)] * v[..., None]
    return get


if __name__ == '__main__':
    for k in sys.argv[1:] or ['S', 'M', 'L']:
        print(k, bake(k, os.path.join(HERE, '素材包', v6.NAMES[k])))
