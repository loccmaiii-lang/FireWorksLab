"""金芒菊规格（对话框新花型，用户 2026-10-07 00:33「玉尺寸不同也会有区分吧？……譬如2尺玉到4尺的区分，或者把一个效果多做几个不同规格给我导出」）。

从 JM4-40（金芒菊 · 4.0，开花直径约 193 m ≈ 5.8 号）按号数表（tool/src/js/10_types.js SHELL_NO）缩放出 6 档：
3 号 / 5 号 / 10 号（尺玉）/ 20 号（2 尺）/ 30 号（3 尺）/ 40 号（4 尺），写 analysis/原理/条目_金芒菊规格.json。

缩放（和烘焙器 applyShellNo 同一思路，基准换成 JM4-40 自己）：
  · 开花半径 × 直径比 kR（起始半径 burstR0 也 × kR），燃烧 × 燃烧比 kT，终端速度 × 表里的比，初速按「燃烧结束时到这个半径」反推（二次阻力）
  · 星数 ×（表里星数比）^0.6：大玉星多，但贴图分辨率固定，按表线性加会糊成一片（4 尺 4700 颗）
  · 星头 × 表里星头比；火花颗粒 × kR^0.6（米数变大、像素里略细，大玉细节更细）
  · 火花寿命 × kT（芒占花径的比例不变），火花密度 ÷ kT（每颗星同时活着的火花数不变 → 贴图里每像素的密度不变）
  · 时长 × kT；开花高度按表；≥ 2 尺开花闪光 × 0.6（和 applyShellNo 一样，大玉头几帧不过曝）
曝光先沿用 JM4-40 的；本机任务算出每档的自动曝光后用 --expo 写回。
用法：python3 analysis/scripts/金芒菊规格.py [--expo analysis/results/<任务>/曝光.json]
"""
import argparse, json, math, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'analysis' / '迭代' / '条目.json'
OUT = ROOT / 'analysis' / '原理' / '条目_金芒菊规格.json'
G = 9.81
SHELL_NO = [  # 号, 直径 m, 高度 m, 星数, 燃烧 s, 终端速度 m/s, 星头 m（同 10_types.js）
    [3, 60, 120, 60, 1.4, 17, 0.6], [4, 130, 160, 85, 1.7, 18, 0.8], [5, 170, 190, 110, 1.9, 19, 0.95],
    [6, 200, 220, 140, 2.1, 20, 1.05], [7, 220, 250, 170, 2.3, 21, 1.15], [8, 250, 280, 200, 2.5, 22, 1.25],
    [10, 320, 330, 280, 2.8, 24, 1.45], [12, 360, 380, 350, 3.1, 26, 1.6], [15, 420, 430, 450, 3.4, 28, 1.8],
    [20, 480, 500, 700, 3.9, 32, 2.1], [30, 550, 600, 1200, 4.5, 36, 2.5], [40, 780, 750, 2000, 5.2, 40, 3.0]]
TIERS = [(3, '3 号', '03'), (5, '5 号', '05'), (10, '尺玉（10 号）', '10'), (20, '2 尺（20 号）', '20'), (30, '3 尺（30 号）', '30'), (40, '4 尺（40 号）', '40')]


def row(n):
    for a, b in zip(SHELL_NO, SHELL_NO[1:]):
        if a[0] <= n <= b[0]:
            k = (n - a[0]) / (b[0] - a[0]); return [x + (y - x) * k for x, y in zip(a, b)]
    return SHELL_NO[0] if n < 3 else SHELL_NO[-1]


def reach(v0, vt, T): c = G / vt ** 2; return math.log(1 + c * v0 * T) / c
def v0for(R, vt, T): c = G / vt ** 2; return (math.exp(c * R) - 1) / (c * T)


def main(a):
    src = next(e for e in json.loads(SRC.read_text(encoding='utf-8'))['entries'] if e['id'] == 'JM4-40')
    p0, m0 = src['p'], src['m']
    R0 = p0['burstR0'] + reach(p0['v0'], p0['vt'], p0['burn'])
    # JM4-40 相当于几号：按开花直径在表里插值
    n0 = next(x for x in [n / 10 for n in range(30, 401)] if row(x)[1] >= 2 * R0)
    r0 = row(n0)
    expo = json.loads(pathlib.Path(a.expo).read_text(encoding='utf-8')) if a.expo else {}
    old = {e['id']: e for e in json.loads(OUT.read_text(encoding='utf-8'))['entries']} if OUT.exists() else {}
    ents = []
    for n, label, tag in TIERS:
        r = row(n); kR, kT = r[1] / r0[1], r[4] / r0[4]
        p = dict(p0)
        p['vt'] = round(p0['vt'] * r[5] / r0[5], 1)
        p['burn'] = round(p0['burn'] * kT, 3)
        p['burstR0'] = round(p0['burstR0'] * kR, 1)
        Rt = R0 * kR
        p['v0'] = round(v0for(Rt - p['burstR0'], p['vt'], p['burn']), 1)
        p['stars'] = int(round(p0['stars'] * (r[3] / r0[3]) ** 0.6))
        p['headSize'] = round(p0['headSize'] * r[6] / r0[6], 3)
        p['sparkSize'] = round(p0['sparkSize'] * kR ** 0.6, 3)
        p['sparkLife'] = round(p0['sparkLife'] * kT, 3)
        p['sparkRate'] = round(p0['sparkRate'] / kT, 1)
        p['duration'] = round(p0['duration'] * kT, 2)
        p['riseH'] = round(r[2])
        if n >= 20: p['flash'] = round(p0.get('flash', 1) * 0.6, 2)
        eid = f'JMG{tag}'
        if eid in expo and expo[eid]: p['exposure'] = expo[eid]
        elif eid in old and 'exposure' in old[eid]['p']: p['exposure'] = old[eid]['p']['exposure']
        alive = p['stars'] * p['sparkRate'] * p['sparkLife']
        ents.append({'id': eid, 'date': '2026-10-07', 'name': f'金芒菊 · {label}', 'base': 'kiku', 'video': src.get('video'),
                     'tags': f'金芒菊 规格 号数 {label} {eid}', 'p': p, 'm': dict(m0),
                     'note': (f'JM4-40（开花直径 {2 * R0:.0f} m ≈ {n0:.1f} 号）按号数表缩放到 {label}：开花直径 {2 * Rt:.0f} m、开花高度 {p["riseH"]} m，'
                              f'星 {p["stars"]} 颗、星燃烧 {p["burn"]:.2f} s、星头 {p["headSize"]:.2f} m、终端速度 {p["vt"]} m/s，'
                              f'芒（火花）寿命 {p["sparkLife"]:.2f} s、每颗星每秒 {p["sparkRate"]:.0f} 粒（同时活着约 {alive / 1000:.0f} k 粒），整段 {p["duration"]:.1f} s。'
                              '颜色、芒的粗细比例、下坠和 JM4-40 一样；号数越大越密、越慢、星头越大。缩放规则见 analysis/scripts/金芒菊规格.py。'),
                     'look': ['六档放在一起（左栏这个效果下面一排缩略图）：大小、疏密、快慢是不是一档一档拉开', '引擎回放 + 游戏内大小：大玉（2–4 尺）芒是不是还清楚、没糊成一片',
                              '觉得哪一档太密 / 太稀 / 太快，直接说哪档']})
        print(eid, label, f'直径 {2 * Rt:.0f} m', {k: p[k] for k in ('v0', 'vt', 'burn', 'stars', 'headSize', 'sparkSize', 'sparkLife', 'sparkRate', 'duration', 'burstR0')}, f'活着 {alive / 1000:.0f}k')
    doc = {'说明': '金芒菊规格（对话框新花型，用户 2026-10-07 00:33）：JM4-40 按号数表缩放出 3 号 / 5 号 / 尺玉 / 2 尺 / 3 尺 / 4 尺六档，'
                   '状态清单效果 jinmangju_sizes。由 analysis/scripts/金芒菊规格.py 生成，不要手改（改脚本重跑）。', 'entries': ents}
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding='utf-8')
    print('→', OUT, f'（JM4-40 ≈ {n0:.1f} 号，直径 {2 * R0:.0f} m）')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--expo')
    main(ap.parse_args())
