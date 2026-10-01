"""同一秒对照图：上 = 实拍，下 = 模拟（考卷相机：仰拍、交付分辨率、引擎颜色公式），每个时刻两格：整体 + 中心放大。
用法：python3 对照图.py <参数.json> <输出.jpg> [时刻,...]"""
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import 试渲 as T, 考卷 as K
HERE = os.path.dirname(os.path.abspath(__file__))


def sheet(P, out, times=(0.3, 0.6, 1.0, 1.4, 1.8, 2.1), tile=300):
    tmp = os.path.join('/tmp', 'dz_' + str(os.getpid()))
    res, expo, _ = T.run(tmp, P, list(times))
    d = json.load(open(os.path.join(HERE, '考卷', '参考指标.json'))); sc = d['到交付分辨率缩放']
    fr = K.ref_frames(list(times)); top, bot = [], []
    for t in times:
        im, _ = fr[t]; cx, cy = d['放射中心_1080'][str(t)]
        small = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA); x, y = int(cx * sc), int(cy * sc)
        s = cv2.imread(os.path.join(tmp, f'模拟_{t:.1f}.png'))
        R = d['时刻'][str(t)]['半径_交付']; h = int(R * 1.1); hc = int(R * 0.45)
        pad = lambda a, hh, xx, yy: cv2.copyMakeBorder(a, hh, hh, hh, hh, cv2.BORDER_CONSTANT)[yy:yy + 2 * hh, xx:xx + 2 * hh]
        r_full = pad(small, h, x, y); r_cen = pad(small, hc, x, y)
        s_full = pad(s, h, 450, 450); s_cen = pad(s, hc, 450, 450)
        for a, b in ((r_full, r_cen), (s_full, s_cen)):
            pass
        rt = [cv2.resize(r_full, (tile, tile), interpolation=cv2.INTER_AREA), cv2.resize(r_cen, (tile, tile), interpolation=cv2.INTER_AREA)]
        st = [cv2.resize(s_full, (tile, tile), interpolation=cv2.INTER_AREA), cv2.resize(s_cen, (tile, tile), interpolation=cv2.INTER_AREA)]
        for a in rt + st: cv2.putText(a, f'+{t:.1f}s', (6, 24), 0, 0.7, (255, 255, 0), 2)
        cv2.putText(rt[1], 'center x2.4', (6, tile - 10), 0, 0.5, (255, 255, 0), 1); cv2.putText(st[1], 'center x2.4', (6, tile - 10), 0, 0.5, (255, 255, 0), 1)
        top += rt; bot += st
    n = len(top); half = n // 2
    rows = [np.hstack(top[:half]), np.hstack(bot[:half]), np.hstack(top[half:]), np.hstack(bot[half:])]
    img = np.vstack(rows)
    lab = np.zeros((img.shape[0], 70, 3), np.uint8)
    for i, txt in enumerate(['REF', 'SIM', 'REF', 'SIM']): cv2.putText(lab, txt, (8, i * tile + tile // 2), 0, 0.7, (200, 200, 200), 2)
    cv2.imwrite(out, np.hstack([lab, img]), [cv2.IMWRITE_JPEG_QUALITY, 90])
    return out


if __name__ == '__main__':
    P = json.load(open(sys.argv[1])); P = P.get('最好', P)
    ts = tuple(float(x) for x in sys.argv[3].split(',')) if len(sys.argv) > 3 else (0.3, 0.6, 1.0, 1.4, 1.8, 2.1)
    print(sheet(P, sys.argv[2], ts))
