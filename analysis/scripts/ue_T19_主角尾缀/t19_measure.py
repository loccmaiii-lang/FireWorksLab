# T19 补测：从侧视抓帧量每根尾缀的星头高度（相对发射器原点，m）。
# 几何：相机水平（pitch 0）、看向 -Y，发射器竖直线在深度 D 处，横向 FOV 已知 → 每像素 s cm（精确线性，无透视误差：
# 竖直线上所有点深度都是 D）。高度 = (camZ - baseZ) + (H/2 - row - 0.5) * s。
# 星头定义（都报，不挑一个好看的）：
#   peak  = 该根亮度剖面最上面那个局部最大（星头亮核）；
#   top50 / top25 / top10 = 从上往下第一个亮度 ≥ 本帧该根最大值 50% / 25% / 10% 的行（亮核上沿 / 光晕上沿）。
# 用法：python t19_measure.py <run目录> [<run目录>...] > 结果.json
import json, sys, os
import numpy as np
from PIL import Image

def load(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(np.float32)

def lum(a):
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]

def measure_run(folder):
    tr = json.load(open(os.path.join(folder, 'trace.json'), encoding='utf-8'))
    cfg = tr['cfg']
    W, H, s = cfg['w'], cfg['h'], cfg['cmPerPx']
    camX, camZ = cfg['camera'][0][0], cfg['camera'][0][2]
    bg = lum(load(os.path.join(folder, 'bg')))
    out = {'run': cfg['name'], 'cmPerPx': s, 'D': cfg['D'], 'items': {}}
    for k, it in enumerate(cfg['items']):
        x, _, bz = it['location']
        col = int(round(W / 2 + (x - camX) / s))   # 相机看 -Y：世界 +X 在画面右侧
        c0, c1 = max(0, col - 80), min(W, col + 81)
        rows = []
        for sh in tr['shots']:
            img = lum(load(os.path.join(folder, sh['file'])))
            d = np.clip(img - bg, 0, None)[:, c0:c1]
            prof = d.max(axis=1)
            pk = float(prof.max())
            rec = {'age': sh['age'], 'file': sh['file'], 'count': sh['count'][k] if k < len(sh['count']) else None, 'max': pk}
            if pk < 6:  # 低于 6/255 视为不可见
                rec['visible'] = False
                rows.append(rec)
                continue
            rec['visible'] = True
            def h_of(r):
                return round((camZ - bz) / 100 + (H / 2 - r - 0.5) * s / 100, 2)
            for frac in (0.5, 0.25, 0.1):
                idx = np.nonzero(prof >= frac * pk)[0]
                rec['top%d' % int(frac * 100)] = h_of(int(idx[0]))
            # 最上面的局部亮核：从顶往下找第一个 ≥50% 的连通段里亮度最大的行
            idx = np.nonzero(prof >= 0.5 * pk)[0]
            r0 = int(idx[0]); r1 = r0
            while r1 + 1 < H and prof[r1 + 1] >= 0.5 * pk:
                r1 += 1
            rp = r0 + int(np.argmax(prof[r0:r1 + 1]))
            rec['peak'] = h_of(rp)
            # 整根亮区下沿（10%）便于看尾巴长度
            rec['bottom10'] = h_of(int(np.nonzero(prof >= 0.1 * pk)[0][-1]))
            # 横向中心（检查列带没串到别的尾缀）
            colprof = d.max(axis=0)
            rec['colCenterPx'] = int(c0 + np.argmax(colprof))
            rows.append(rec)
        out['items'][it.get('tag', str(k))] = {'source': it['source'], 'bandCols': [c0, c1], 'rows': rows}
    return out

if __name__ == '__main__':
    res = [measure_run(f) for f in sys.argv[1:]]
    json.dump(res, sys.stdout, ensure_ascii=False, indent=1)
