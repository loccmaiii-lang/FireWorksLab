"""把模型按考卷的相机（从下往上、交付分辨率）渲成几张图，量考卷指标。
用法：python3 试渲.py <输出目录> '<参数 JSON>' [时刻,...]"""
import sys, os, json, time, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import yinxian as Y, 考卷 as K
def run(out, P, times, expo=None, cam='below', W=900, save=True):
    os.makedirs(out, exist_ok=True)
    ref = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '考卷', '参考指标.json')))
    sh = Y.Shell(P)
    # 比例：模拟 +1.0 s 的考卷半径 = 参考的交付半径
    ppm = P.get('_ppm', 2.9); res = {}
    imgs = {}
    for t in times:
        O, Gm = Y.render(sh, t, cam, W, W, ppm, W / 2, W / 2)
        imgs[t] = (O, Gm)
    if expo is None:   # 曝光：+1.0 s 线像素亮度中位 = 参考（相机曝光的等价物；只用于考卷对照，不进素材）
        O, Gm = imgs[1.0] if 1.0 in imgs else Y.render(sh, 1.0, cam, W, W, ppm, W / 2, W / 2)
        target = ref['时刻']['1.0']['线亮度中位']; lo, hi = 1e-3, 100.0
        for _ in range(14):
            e = (lo * hi) ** 0.5; im = Y.compose(O, Gm, e, 1.0); R = K.radius(im, W / 2, W / 2, W / 2 - 2)
            v = K.measure(im, W / 2, W / 2, R)['线亮度中位'] or 0
            lo, hi = (e, hi) if v < target else (lo, e)
        expo = (lo * hi) ** 0.5
    expo *= P.get('expoMul', 1.0)   # 曝光倍数（实拍相机的曝光不是目标，只是测量条件：允许在 0.3–3 倍里调）
    for t, (O, Gm) in imgs.items():
        im = Y.compose(O, Gm, expo, t)
        R = K.radius(im, W / 2, W / 2, W / 2 - 2)
        m = K.measure(im, W / 2, W / 2, R); m['R'] = R; res[str(t)] = m
        if save: cv2.imwrite(os.path.join(out, f'模拟_{t:.1f}.png'), im)
    return res, expo, sh
if __name__ == '__main__':
    out = sys.argv[1]; P = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    times = [float(x) for x in sys.argv[3].split(',')] if len(sys.argv) > 3 else [0.4, 1.0, 1.6, 2.0]
    t0 = time.time(); res, expo, _ = run(out, P, times)
    ref = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '考卷', '参考指标.json')))['时刻']
    for t, m in res.items():
        r = ref[str(round(float(t), 1))]
        f = lambda c: ' '.join(f"{k}:{v['G/R'] if v else '-'}" for k, v in c.items())
        print(t, 'R', m['R'], '/', r['半径_交付'], '| 连续', m['连续性'], r['连续性'], '| 断', m['断点率'], r['断点率'], '| 线', m['线数_0.6R_扇区'], r['线数_0.6R_扇区'],
              '| 宽', m['峰宽中位'], r['峰宽中位'], '| 亮', m['线亮度中位'], r['线亮度中位'], '| 闪', m['闪点'], r['闪点'], '| 色', f(m['颜色']), '//', f(r['颜色']))
        print('   径向', m['径向分布'][1:10], '\n   参考', r['径向分布'][1:10])
    print('expo', expo, 'sec', round(time.time() - t0, 1))
