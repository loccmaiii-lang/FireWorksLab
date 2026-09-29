"""把升空尾缀物理配方（analysis/replica/尾缀物理_<S|M|L>_配方.json，trail_phys.py 拟合的结果）
转成烘焙器花型「升空尾缀 · 物理 小 / 中 / 大」（physS / physM / physL）的默认参数，写到 tool/src/js/44_physrecipes.js。
烘焙器里实时模拟用的是 43_phystrail.js（trail_phys.py 的移植），参数名一一对应（见 FLAT）。

用法：python analysis/scripts/phys_to_baker.py   （改了配方后重跑，再 python tool/build.py）
"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import trail_phys as T

OUT = os.path.join(ROOT, 'tool', 'src', 'js', '44_physrecipes.js')
POP_KEYS = [('Rate', 'rate'), ('Puff', 'puff'), ('Life', 'life'), ('Lsig', 'lsig'), ('Jet', 'jet'), ('Cone', 'cone'), ('Kd', 'kd'),
            ('T0', 'T0'), ('Tb', 'Tb'), ('Tc', 'tc'), ('Tend', 'Tend'), ('Pt', 'pt'), ('Pm', 'pm'), ('I', 'I'), ('Tw', 'tw'), ('R', 'r')]
VIEW = {'S': 110, 'M': 120, 'L': 140}      # 默认视野高度（m）：看得清火星，又能看到大半条尾迹


def r5(x):
    if isinstance(x, (list, tuple)): return [r5(v) for v in x]
    if isinstance(x, float): return float(f'{x:.5g}')
    return x


def flat(P, key):
    p = dict(form='phys', phV0=P['v0'], phK=P['k'], phT=P['T'], phLeanA=P['lean'][0], phLeanB=P['lean'][1],
             phWob=P['wob'], phWobL=list(P['wob_lam']), phSpinF=P['spin']['f'], phSpinA=P['spin']['amp'],
             phWind=P['wind'], phTurb=P['turb'], phTurbL=list(P['turb_lam']), phJit=P['jit'],
             phFlL0=P['flame']['l0'], phFlLv=P['flame']['lv'], phFlW=P['flame']['w'], phFlI=P['flame']['I'],
             phE=P.get('E', T.BASE['E']), phExpo=1.0, phView=VIEW[key], phHead=0.2, seed=P.get('seed', 7),
             outMode='combined', encGamma=1, cols=1, rows=1, chans=1)
    for c, q in zip('ABC', P['pops']):
        for k, src in POP_KEYS:
            v = q.get(src)
            if v is None: v = {'Tb': q['T0'], 'tc': 1000.0, 'pm': 1.0}.get(src, {'Tc': 1000.0, 'Pm': 1.0}.get(k, 0))
            p[f'ph{c}{k}'] = v
    return {k: r5(v) for k, v in p.items()}


def lin2hex(c):
    c = [min(1.0, max(0.0, float(x))) for x in c]
    s = [round((12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055) * 255) for x in c]
    return '#%02x%02x%02x' % tuple(s)


def baker_m():
    """渐变图 4 个色标：黑体 1350 / 1750 / 2150 / 2500 K（暗红 → 橙 → 金 → 黄白），编码值越高越白（与 trail_phys_bake 一致）"""
    out = {'stages': [[0, '#ffffff']], 'xw': 0.08, 'headInt': 1, 'tailInt': 1}
    for i, Tk in enumerate([1350, 1750, 2150, 2500]):
        c = T.bb_rgb(Tk); c = c / c.max(); out[f'ramp{i}'] = lin2hex(c)
    return out


def follow(key):
    """实拍跟拍取景：视频里出膛点（像素）、比例、出膛时刻（烘焙器实拍面板按星头逐帧取景用）"""
    R = T.REFS[key]
    import cv2
    cap = cv2.VideoCapture(os.path.join(ROOT, R['video'])); W, H = int(cap.get(3)), int(cap.get(4)); cap.release()
    return dict(t0=R['t0'], launch=[R['launch'][0] / H, R['launch'][1] / H], mpp=1.0 / R['ppm'], H=H, aspect=round(W / H, 4))


def main():
    types = {}; refs = {}
    for key in 'SML':
        P = T.preset(key)
        types['phys' + key] = {'p': flat(P, key), 'm': baker_m()}
        refs['phys' + key] = dict(video=T.REFS[key]['video'], **follow(key))
    js = ('// 由 analysis/scripts/phys_to_baker.py 从 analysis/replica/尾缀物理_<S|M|L>_配方.json 生成，别手改\n'
          'Object.assign(TYPES, ' + json.dumps(types, ensure_ascii=False) + ');\n'
          'const PHYS_REFS = ' + json.dumps(refs, ensure_ascii=False) + ';\n')
    open(OUT, 'w', encoding='utf-8', newline='\n').write(js)
    print('写入', OUT, len(js), '字节')
    for k, v in refs.items(): print(' ', k, v)


if __name__ == '__main__':
    main()
