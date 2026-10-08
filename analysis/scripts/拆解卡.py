"""拆解卡：把 打点.py 量出来的逐帧数据汇成一页（层、节点、各项范围），给用户一眼看完（对话框新花型，用户 2026-10-08 08:58）。

  python3 analysis/scripts/拆解卡.py <配置.json> --out <目录>

配置（每个效果一份，AI 看过叠图后写）：
  { "名": "金蕊青柠星", "参考": {"B": {"打点": "…/打点.json", "叠图目录": "…", "mpp": 0.4545}, "A": {...}},
    "叠图时刻": [0.4, 1.53, 2.07, 3.0],
    "层": [ {"名": "橙引尾", "类": "线", "源": "暖色线", "区": "全部|里|外", "时段": [0, 1.0], "说明": "…"},
            {"名": "柠点星", "类": "点", "区": "外", "时段": [0.3, 4.0]}, ... ] }
输出：<目录>/拆解卡.jpg（曲线 + 叠图）、<目录>/拆解卡.md（每层的范围、节点）。
"""
import argparse, json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
FONT = next((f for f in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc') if os.path.exists(f)), None)


def load(p): return json.load(open(p if os.path.isabs(p) else os.path.join(ROOT, p), encoding='utf-8'))


def pts_of(fr, region):
    P = fr['points']
    if region == '外': return P.get('外（亲星）') or (P.get('全部') if not fr.get('split') else None)
    if region == '里': return P.get('里（芯）')
    return P.get('全部') or P.get('外（亲星）')


def lines_of(fr, src, region):
    L = fr['lines']
    if region in ('里', '外') and fr.get('split'): return L.get(f'{src}·{region}')
    if region == '里': return None
    return L.get(src)


def series(frames, layer, key, idx=1):
    out = []
    for fr in frames:
        t = fr['t']
        if not (layer['时段'][0] <= t <= layer['时段'][1]): continue
        if layer['类'] == '点': d = pts_of(fr, layer['区'])
        elif layer['类'] == '线纹理': d = (fr.get('texture') or {}).get(layer['源'])
        else: d = lines_of(fr, layer['源'], layer['区'])
        if not d: continue
        if key == '_rad':      # 放射中心相对外壳中心（2026-10-08）
            v = None if d.get('rad_dy') is None or fr.get('shell_dy') is None else d['rad_dy'] - fr['shell_dy']
        elif key == '_cext': v = ((fr.get('core_ext') or {}).get('r') or [None] * 3)[2]
        elif key.startswith('_g:'):      # 某个颜色组：_g:淡紫:r90 / n
            _, gname, k2 = key.split(':'); x = (fr.get('by_color') or {}).get(gname) or {}
            v = x.get('n') if k2 == 'n' else (x.get('r') or [None] * 3)[1 if k2 == 'r50' else 2]
        else: v = d.get(key)
        if isinstance(v, list): v = v[idx] if len(v) > idx else None
        if isinstance(v, dict): continue
        if v is not None: out.append((t, float(v)))
    return out


def rng(vals):
    v = [x for _, x in vals if x is not None]
    if not v: return None
    return [round(float(np.percentile(v, 10)), 3), round(float(np.median(v)), 3), round(float(np.percentile(v, 90)), 3)]


def node_on_off(s, frac=0.3):
    if not s: return None, None
    m = max(v for _, v in s); on = next((t for t, v in s if v >= frac * m), None); off = next((t for t, v in reversed(s) if v >= frac * m), None)
    return on, off


def card(cfg, out):
    os.makedirs(out, exist_ok=True)
    import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
    from matplotlib import font_manager
    if FONT: font_manager.fontManager.addfont(FONT); plt.rcParams['font.family'] = font_manager.FontProperties(fname=FONT).get_name()
    plt.rcParams['axes.unicode_minus'] = False
    refs = {k: dict(v, data=load(v['打点'])) for k, v in cfg['参考'].items()}
    md = [f"# {cfg['名']} · 拆解卡（打点.py 实测；对话框新花型 {cfg.get('日期', '')}）", '',
          '每个量都是同一把尺子（`analysis/scripts/打点.py`）量的；范围 = 这一层活着的那段时间里各帧中位数的 p10 / 中位 / p90。R = 外层半径（像素，横向跨度的一半）。', '']
    # ---- 层表 ----
    KP = [('n', '个数'), ('flux_spread', '星与星亮度差 p90/p10'), ('fwhm', '大小 FWHM（px，中位）'), ('halo_ratio', '光晕能量占比（中位）'), ('elong', '拉长比（中位）'),
          ('streak_frac', '拉长（拖影）的比例'), ('core_sat', '核心饱和度'), ('halo_sat', '光晕饱和度'), ('_cext', '芯区点最远 r / R（p90，不算柠绿）')]
    KT = [('thick', '线长 ≈ 线带厚度 / R'), ('r_in', '线带里端 r / R'), ('r_out', '线带外端 r / R'), ('width_px', '线宽 px'), ('n', '一圈多少条（同一把尺子的相对数）'),
          ('bead', '成串程度（沿线起伏）'), ('grad', '外段 / 内段亮度'), ('coh_in', '沿半径连贯长度 / R（往里）'), ('contrast', '线的对比度（角向起伏 / 平均）'), ('level', '线带亮度（平均）'),
          ('bend0', '线弯曲°（外半 − 里半，往下为正）'), ('_rad', '放射中心相对外壳（/ R，往下为正；≈ 0 = 从外壳中心直直放射）')]
    KL = [('n_long', '长线条数（≥ 0.15 R）'), ('len', '线长 / R（中位）'), ('width_px', '线宽 px（中位）'), ('cont', '连续性（中位）'), ('bead', '成串程度（沿线起伏，中位）'),
          ('grad', '外段 / 内段亮度（中位）'), ('sag', '下垂 / 线长（中位）'), ('r0', '里端 r / R（中位）'), ('r1', '外端 r / R（中位）')]
    md += ['## 每层', '']
    nodes = []
    for L in cfg['层']:
        md += [f"### {L['名']}（{L['类']} · {L.get('源', '')}{'·' + L['区'] if L['区'] != '全部' else ''} · {L['时段'][0]}–{L['时段'][1]} s）", '', L.get('说明', ''), '', '| 量 | ' + ' | '.join(refs) + ' |', '| --- |' + ' --- |' * len(refs)]
        KG = [(f"_g:{L['色']}:n", f"{L['色']}点个数"), (f"_g:{L['色']}:r50", f"{L['色']}点离中心 r / R（中位）"), (f"_g:{L['色']}:r90", f"{L['色']}点最远 r / R（p90）")] if L.get('色') else []
        for key, label in ((KP + KG) if L['类'] == '点' else KT if L['类'] == '线纹理' else KL):
            row = [label]
            for k, r in refs.items(): row.append(str(rng(series(r['data']['frames'], L, key)) or '—'))
            md.append('| ' + ' | '.join(row) + ' |')
        if L['类'] == '线纹理':     # 颜色（里段 / 外段）
            for k, r in refs.items():
                cs = [(fr['t'], (fr.get('texture') or {}).get(L['源'])) for fr in r['data']['frames'] if L['时段'][0] <= fr['t'] <= L['时段'][1]]
                cs = [(t, d) for t, d in cs if d and d.get('c_in')]
                if cs:
                    md.append(f'\n颜色（{k}，里段 → 外段，色相°）：' + '；'.join(f"+{cs[min(len(cs) - 1, int(f * len(cs)))][0]:.2f}s {cs[min(len(cs) - 1, int(f * len(cs)))][1]['c_in']} → {cs[min(len(cs) - 1, int(f * len(cs)))][1]['c_out']}" for f in (0.1, 0.5, 0.9)))
        if L['类'] == '点':     # 颜色
            for k, r in refs.items():
                cs = [(fr['t'], pts_of(fr, L['区'])) for fr in r['data']['frames'] if L['时段'][0] <= fr['t'] <= L['时段'][1] and pts_of(fr, L['区'])]
                cs = [(t, d) for t, d in cs if d.get('halo_rgb')]
                if cs:
                    seg = []
                    for frac in (0.1, 0.3, 0.5, 0.7, 0.9):
                        t, d = cs[min(len(cs) - 1, int(frac * len(cs)))]; seg.append(f"+{t:.2f}s 核 {d.get('core_cls')}（{d['core_rgb']}）晕 {d.get('halo_cls')}（{d['halo_rgb']}）")
                    md.append(f'\n颜色（{k}）：' + '；'.join(seg))
        on, off = node_on_off(series(refs[list(refs)[0]]['data']['frames'], L, 'n' if L['类'] == '点' else 'level' if L['类'] == '线纹理' else 'n_long', 0))
        nodes.append((L['名'], on, off)); md.append('')
    md += ['## 节点（主参考：个数 / 长线条数到峰值 30% 的起止）', '', '| 层 | 出现 | 消失 |', '| --- | --- | --- |'] + [f'| {n} | {a} | {b} |' for n, a, b in nodes] + ['']
    # 跟踪（闪烁、出现 / 消失）
    md += ['## 跟踪（编号点逐帧）', '']
    for k, r in refs.items():
        for w, tr in r['data'].get('tracks', {}).items():
            st = tr['stats']; md.append(f"- {k} {w} s（{tr['frames']} 帧，分界 {tr.get('split')}）：" + '；'.join(f"{reg} {s.get('n')} 条，帧间起伏 {s.get('flicker_amp')}%，明显闪（> 8%）的占 {s.get('flicker_frac')}，频率 {s.get('flicker_hz')} Hz，灭的比例 {s.get('off_frac')}" for reg, s in st.items() if s.get('n')) + f"；中途出现 {tr.get('born')}、中途消失 {tr.get('died')}")
            if tr.get('kin'):      # 运动：相对外层往外跑多快（r / R 每秒）、往下坠的加速度（R / s²）
                md.append('  - 运动（按点的颜色）：' + '；'.join(f"{g} {x['n']} 条 往外 {x['vr']} /s、下坠 {x['ay']} R/s²" for g, x in tr['kin'].items() if x.get('n', 0) >= 5))
    md.append('')
    # 半径 → 初速 / 终端速度
    for k, r in refs.items():
        F = r['data']['frames']; mpp = r.get('mpp')
        if mpp:
            T = np.array([f['t'] for f in F]); R = np.array([f['R_px'] for f in F]) * mpp
            try:
                from scipy.optimize import least_squares
                ok = (T > 0.5) & (T < 3.0)
                fit = least_squares(lambda p: np.log1p(9.81 / p[1] ** 2 * p[0] * T[ok]) / (9.81 / p[1] ** 2) - R[ok], [150, 20], bounds=([5, 3], [600, 200]))
                md.append(f"- {k} 外层半径：+1 s {np.interp(1.0, T, R):.0f} m、+2 s {np.interp(2.0, T, R):.0f} m、+3 s {np.interp(3.0, T, R):.0f} m（{mpp} m/px）；二次阻力拟合（+0.5–3 s）初速 {fit.x[0]:.0f} m/s、终端速度 {fit.x[1]:.1f} m/s")
            except Exception as e: md.append(f'- {k} 半径拟合失败：{e}')
    open(os.path.join(out, '拆解卡.md'), 'w', encoding='utf-8').write('\n'.join(md) + '\n')
    # ---- 图：每层几条曲线 + 叠图 ----
    rows = len(cfg['层']); fig = plt.figure(figsize=(18, 3.0 * rows + 6.5), dpi=90, facecolor='#101218')
    gs = fig.add_gridspec(rows + 2, 4, height_ratios=[1] * rows + [0.15, 2.4], hspace=0.55, wspace=0.28)
    cols = {'B': '#ffcf6a', 'A': '#7ad7ff'}
    for i, L in enumerate(cfg['层']):
        keys = ([('n', '个数'), ('flux_spread', '亮度差 p90/p10'), ('fwhm', 'FWHM px'), ('halo_ratio', '光晕占比')] if L['类'] == '点' else
                [('level', '线带亮度'), ('thick', '线长 ≈ 线带厚 / R'), ('width_px', '线宽 px'), ('bead', '成串程度')] if L['类'] == '线纹理' else
                [('n_long', '长线条数'), ('len', '线长 / R'), ('bead', '成串程度'), ('grad', '外段/内段亮度')])
        for j, (key, label) in enumerate(keys):
            ax = fig.add_subplot(gs[i, j]); ax.set_facecolor('#181b22')
            for k, r in refs.items():
                s = series(r['data']['frames'], L, key)
                if s: ax.plot([t for t, _ in s], [v for _, v in s], '-', color=cols.get(k, '#ddd'), lw=1.4, label=k)
            ax.set_title(f"{L['名']} · {label}", color='#eee', fontsize=10); ax.tick_params(colors='#aaa', labelsize=8)
            for sp in ax.spines.values(): sp.set_color('#444')
            ax.set_xlim(0, 4.1)
            if i == 0 and j == 0: ax.legend(fontsize=8, facecolor='#222', labelcolor='#ddd')
    ax = fig.add_subplot(gs[rows + 1, :]); ax.axis('off')
    k0 = list(refs)[0]; od = refs[k0].get('叠图目录')
    if od:
        from PIL import Image
        ims = []
        for t in cfg.get('叠图时刻', []):
            fs = [f for f in os.listdir(od) if f.startswith('叠图_')]
            if not fs: break
            f = min(fs, key=lambda x: abs(float(x[3:-4]) - t)); ims.append(Image.open(os.path.join(od, f)).resize((520, 520)))
        if ims:
            W = Image.new('RGB', (530 * len(ims), 520), (16, 18, 24))
            for n, im in enumerate(ims): W.paste(im, (n * 530, 0))
            ax.imshow(np.array(W))
    fig.suptitle(f"{cfg['名']} · 拆解卡（实测；黄 = B，蓝 = A；下面是 {k0} 的打点叠图：圈 = 点，按颜色类；线 = 量到的放射线）", color='#ffd27a', fontsize=14)
    fig.savefig(os.path.join(out, '拆解卡.jpg'), facecolor=fig.get_facecolor(), bbox_inches='tight'); print('→', os.path.join(out, '拆解卡.jpg'), os.path.join(out, '拆解卡.md'))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('cfg'); ap.add_argument('--out', required=True); a = ap.parse_args()
    card(load(a.cfg), a.out)
