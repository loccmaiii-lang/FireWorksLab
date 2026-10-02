"""升空尾缀：火星颗数 / 大小 / 散开的无量纲量法（对话框11，2026-10-02）。

参考图和烘焙器画面用同一套量法：先把图缩放到「可见尾迹 = 1115 像素」（用户 14:35 参考图的长度），再量
  · 白热段（连续过曝 ≥ 6 px）占尾迹的比例、宽度；
  · 白热段以下能分辨的火星峰（局部极大、比背景亮 30/255 以上）总数、每 10% 段颗数、亮 / 中 / 暗；
  · 每段火星横向 5–95% 分布宽度（÷ 白热段宽）；
  · 第 3 版加（10-02 16:41 用户：白 / 黄对比、线状火星、边缘太硬）：
      边缘软硬 = 横向 5–95% 宽 ÷ 25–75% 宽（均匀分布 1.8 = 一刀切，高斯 2.4 = 软）；
      火星颜色 = 峰值像素：白（三通道都 ≥ 200）/ 黄（R ≥ 160、B < 0.6 R）/ 其它；
      线状 = 孤立火星半高连通块的长短轴比（≥ 1.8 算线状）。
用法：python3 analysis/scripts/尾缀粒子对照.py 图1 [图2 …] [--crop x0,y0,x1,y1]
"""
import sys, json, argparse
import numpy as np, cv2

LREF = 1115


def run_len(r):
    best = cur = 0
    for v in r:
        cur = cur + 1 if v else 0; best = max(best, cur)
    return best


def measure(path, crop=None):
    im = cv2.imread(path)
    if crop: x0, y0, x1, y1 = crop; im = im[y0:y1, x0:x1]
    g = im.astype(np.float32).max(2)
    d = np.clip(g - cv2.GaussianBlur(g, (0, 0), 25), 0, None)
    rows = np.nonzero((d > 40).sum(1) > 0)[0]
    top, bot = rows.min(), rows.max(); s = LREF / max(1, bot - top)
    im = cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_LINEAR)
    g = im.astype(np.float32).max(2); H, W = g.shape
    d = np.clip(g - cv2.GaussianBlur(g, (0, 0), 25), 0, None)
    rows = np.nonzero((d > 40).sum(1) > 0)[0]; top, bot = rows.min(), rows.max(); L = bot - top
    sat = im.min(2) > 225
    core = np.array([run_len(sat[y]) for y in range(H)])
    cand = [y for y in range(top, bot) if core[y] >= 6]
    ce = max(cand) if cand else top
    cw = float(np.median(core[top + 10:max(top + 11, ce - 10)])) if ce > top + 20 else 0.0
    dd = cv2.GaussianBlur(d, (0, 0), 0.6); mx = cv2.dilate(dd, np.ones((5, 5), np.uint8))
    ys, xs = np.nonzero((dd >= mx) & (dd > 30)); v = dd[ys, xs]; m = ys > ce; ys, xs, v = ys[m], xs[m], v[m]
    seg = []
    for a in range(10):
        y0, y1 = top + L * a / 10, top + L * (a + 1) / 10; k = (ys >= y0) & (ys < y1)
        seg.append(dict(n=int(k.sum()), wide=round(float(np.percentile(xs[k], 95) - np.percentile(xs[k], 5)), 1) if k.sum() > 4 else None,
                        bright=int((v[k] > 160).sum()), mid=int(((v[k] > 80) & (v[k] <= 160)).sum()), dim=int((v[k] <= 80).sum())))
    # 单颗大小：孤立峰（5 px 内没有别的峰）在半高处的连通块
    pts = np.stack([ys, xs], 1); sizes = []; elong = []
    for i, (y, x) in enumerate(pts):
        if len(pts) > 1 and np.sort(np.hypot(*(pts - [y, x]).T))[1] < 6: continue
        win = dd[max(0, y - 8):y + 9, max(0, x - 8):x + 9]; mk = (win > 0.5 * v[i]).astype(np.uint8)
        nn, l2, s2, _ = cv2.connectedComponentsWithStats(mk); c = l2[min(8, y), min(8, x)]
        if c > 0:
            sizes.append(np.sqrt(s2[c, 4])); yy, xx = np.nonzero(l2 == c)
            if len(yy) >= 4:
                ev = np.linalg.eigvalsh(np.cov(np.stack([xx, yy]).astype(float)) + np.eye(2) * 1 / 12); elong.append(float(np.sqrt(ev[1] / ev[0])))
    pk = im[ys, xs].astype(int)          # BGR
    white = (pk.min(1) >= 200); yellow = ~white & (pk[:, 2] >= 160) & (pk[:, 0] < 0.6 * pk[:, 2])
    edge = []
    for a in range(10):
        y0, y1 = top + L * a / 10, top + L * (a + 1) / 10; k = (ys >= y0) & (ys < y1)
        if k.sum() > 12: q = np.percentile(xs[k], [5, 25, 75, 95]); edge.append(round(float((q[3] - q[0]) / max(1, q[2] - q[1])), 2))
        else: edge.append(None)
    ev = [e for e in edge if e]
    return dict(file=path, white_n=int(white.sum()), yellow_n=int(yellow.sum()), edge=edge, edge_mean=round(float(np.mean(ev)), 2) if ev else None,
                streak_frac=round(float(np.mean(np.array(elong) >= 1.8)), 3) if elong else None, elong_median=round(float(np.median(elong)), 2) if elong else None, scale=round(s, 3), L=int(L), white_frac=round((ce - top) / L, 3), white_w=cw, sparks=int(len(ys)),
                bright=int((v > 160).sum()), mid=int(((v > 80) & (v <= 160)).sum()), dim=int((v <= 80).sum()),
                spark_px_isolated_median=round(float(np.median(sizes)), 2) if sizes else None, n_isolated=len(sizes), seg=seg)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('imgs', nargs='+'); ap.add_argument('--crop', default=None)
    a = ap.parse_args(); crop = [int(x) for x in a.crop.split(',')] if a.crop else None
    for p in a.imgs:
        r = measure(p, crop)
        print(f"{p.split('/')[-1]}：缩放 ×{r['scale']} · 白热段 {r['white_frac']} × 尾迹、宽 {r['white_w']} px · 火星 {r['sparks']} 颗（亮 {r['bright']} / 中 {r['mid']} / 暗 {r['dim']}）· 孤立火星半高直径中位 {r['spark_px_isolated_median']} px（{r['n_isolated']} 颗）")
        print('   每 10% 段颗数：', [s['n'] for s in r['seg']], ' 横向宽 px：', [s['wide'] for s in r['seg']])
        print(f"   白 {r['white_n']} / 黄 {r['yellow_n']} 颗 · 线状（长短轴 ≥ 1.8）{r['streak_frac']}（长短轴中位 {r['elong_median']}）· 边缘软硬（5–95 ÷ 25–75，1.8 硬 / 2.4 软）均 {r['edge_mean']}：{r['edge']}")
