"""我的效果出「玉型大小 + 造型」变体（对话框新花型，用户 2026-10-07 00:59「我保存了的那几个效果也一起帮我多几个玉型大小变化与更多的造型变化，我都要拿来当素材」）。

读 analysis/我的配方/*/*.json（你在烘焙器里保存、同步到仓库的「我的效果」），每个效果出一组变体，写 analysis/原理/条目_我的效果变体.json：
  · 原样（照你存的，一个数不改）
  · 大小：3 号 / 5 号 / 尺玉 / 2 尺 / 3 尺 / 4 尺（和原来直径差不到 12% 的那档跳过）。按号数表（10_types.js SHELL_NO）从原样缩放，
    和金芒菊规格同一套：半径 × 直径比、燃烧和所有时刻 × 燃烧比、终端速度 × 表里的比、星数 ×（星数比）^0.6、星头 × 星头比、
    火花寿命 × 燃烧比、火花密度 ÷ 燃烧比、火花颗粒 × 直径比^0.6、千轮 / 分裂的子星初速 × 直径比 / 燃烧比、层延迟 × 燃烧比；≥ 2 尺开花闪光 × 0.6。
  · 造型：冠（长尾下坠 + 木炭余烬）、柳（星慢、尾很长、整朵垂下来）、环（倾斜圆环）、土星（球 + 环）、万華鏡（8 簇）、心形（型物）、
    时差（星陆续点亮）、芯入（加一圈对比色芯）。同一模拟拆的几层（同种子）一起变：轨迹类的改动（终端速度、燃烧、排布、点火）每层都改，火花类的只改带火花的层。
多层效果每档是一个组合条目（每层一个条目，组合引用）；状态清单每个效果一项（key myv_<id>，左栏一排分档缩略图）。
曝光先沿用原样；本机 变体对照.py 算出每档自动曝光（× 原样那层的手调 / 自动比）后用 --expo 写回。
用法：python3 analysis/scripts/我的效果变体.py [--expo analysis/results/<任务>/<效果>/曝光.json ...] [--status]
  --status：同时写状态清单（新加 / 更新 myv_* 效果，别的不动）
"""
import argparse, collections, copy, glob, json, math, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = sorted(glob.glob(str(ROOT / 'analysis' / '我的配方' / '*' / '*.json')))
OUT = ROOT / 'analysis' / '原理' / '条目_我的效果变体.json'
STATUS = ROOT / '协作' / '状态清单.json'
G = 9.81
SHELL_NO = [[3, 60, 120, 60, 1.4, 17, 0.6], [4, 130, 160, 85, 1.7, 18, 0.8], [5, 170, 190, 110, 1.9, 19, 0.95],
            [6, 200, 220, 140, 2.1, 20, 1.05], [7, 220, 250, 170, 2.3, 21, 1.15], [8, 250, 280, 200, 2.5, 22, 1.25],
            [10, 320, 330, 280, 2.8, 24, 1.45], [12, 360, 380, 350, 3.1, 26, 1.6], [15, 420, 430, 450, 3.4, 28, 1.8],
            [20, 480, 500, 700, 3.9, 32, 2.1], [30, 550, 600, 1200, 4.5, 36, 2.5], [40, 780, 750, 2000, 5.2, 40, 3.0]]
SIZES = [(3, 'S03', '3 号'), (5, 'S05', '5 号'), (10, 'S10', '尺玉'), (20, 'S20', '2 尺'), (30, 'S30', '3 尺'), (40, 'S40', '4 尺')]
# 每个保存的效果：条目前缀、英文名（素材包名）
META = {'fxmuux2arh': ('MYFL', 'Crossette'), 'fxmuuzfeg7': ('MYCR', 'Crackle'), 'fxmuv6vhrq': ('MYJA', 'GoldRay'),
        'fxmuv7n3ih': ('MYJM', 'GoldChrysanthemum'), 'fxmuw5v7bh': ('MYJC', 'GoldRayRocket'), 'fxmuwols5x': ('MYHK', 'YonshakuKamuro')}
# 每档素材包名字的后缀（状态清单「方案」的 en，烘焙器 4.9.23 起贴图 / 资产名 = <英文名>_<en>，几档导进引擎不重名）；原样不加
EN_SFX = {'S03': '03', 'S05': '05', 'S10': '10', 'S20': '20', 'S30': '30', 'S40': '40', 'K': 'Crown', 'Y': 'Willow', 'R': 'Ring', 'T': 'Saturn', 'M': 'Kaleido', 'H': 'Heart', 'J': 'Jisa', 'C': 'Core'}
SKIP_KEYS = set()     # type 留着（条目的 base 也是它，replicaPM 会用 base 覆盖）
TIME_KEYS = ['sparkLife', 'sparkStop', 'sparkStart', 'headDimUntil', 'ignDelay', 'subDelay', 'subBurn', 'emberLife', 'duration', 'crackleDelay']


def row(n):
    for a, b in zip(SHELL_NO, SHELL_NO[1:]):
        if a[0] <= n <= b[0]:
            k = (n - a[0]) / (b[0] - a[0]); return [x + (y - x) * k for x, y in zip(a, b)]
    return SHELL_NO[0] if n < 3 else SHELL_NO[-1]


def reach(v0, vt, T): c = G / vt ** 2; return math.log(1 + c * v0 * T) / c
def v0for(R, vt, T): c = G / vt ** 2; return (math.exp(min(c * R, 30)) - 1) / (c * T)
def carrier(P): return P['type'] in ('senrin', 'crossette')


def radius(P):
    """开花半径（米）：星到燃烧结束（千轮 / 分裂 = 子弹到开花 + 子星）"""
    R = (P.get('burstR0') or 0) + reach(P['v0'], P['vt'], P['subDelay'] if carrier(P) else P['burn'])
    if carrier(P): R += reach(P.get('subSpeed', 40), P['subVt'] if (P.get('subVt') or 0) > 0 else P['vt'], P.get('subBurn', 0.9))
    return R


def size_of(R):
    """直径 → 号数（表里插值）"""
    for n in [x / 10 for x in range(30, 401)]:
        if row(n)[1] >= 2 * R: return n
    return 40.0


def scale_layer(P, M, L, n0, n):
    r0, r = row(n0), row(n); kR, kT = r[1] / r0[1], r[4] / r0[4]
    P = dict(P); M = copy.deepcopy(M); L = dict(L)
    T0 = P['subDelay'] if carrier(P) else P['burn']; R0 = (P.get('burstR0') or 0) + reach(P['v0'], P['vt'], T0)
    P['vt'] = round(P['vt'] * r[5] / r0[5], 2)
    P['burn'] = round(P['burn'] * kT, 3)
    for k in TIME_KEYS:
        if (P.get(k) or 0) > 0: P[k] = round(P[k] * kT, 3)
    if (P.get('burstR0') or 0) > 0: P['burstR0'] = round(P['burstR0'] * kR, 1)
    T = P['subDelay'] if carrier(P) else P['burn']
    P['v0'] = round(max(5, min(600, v0for(R0 * kR - (P.get('burstR0') or 0), P['vt'], T))), 1)
    if (P.get('sparkRate') or 0) > 0: P['sparkRate'] = round(P['sparkRate'] / kT, 1)
    P['stars'] = max(4, int(round(P['stars'] * (r[3] / r0[3]) ** 0.6)))
    P['headSize'] = round(P['headSize'] * r[6] / r0[6], 3)
    if (P.get('subSize') or 0) > 0: P['subSize'] = round(P['subSize'] * r[6] / r0[6], 3)
    if (P.get('sparkSize') or 0) > 0: P['sparkSize'] = round(P['sparkSize'] * kR ** 0.6, 3)
    if (P.get('subSpeed') or 0) > 0: P['subSpeed'] = round(P['subSpeed'] * kR / kT, 1)
    if (P.get('subVt') or 0) > 0: P['subVt'] = round(P['subVt'] * r[5] / r0[5], 1)
    P['riseH'] = round(r[2])
    if n >= 20 and n0 < 20: P['flash'] = round((P.get('flash') or 1) * 0.6, 2)
    if M.get('stages'): M['stages'] = [[round(t * kT, 3), c] for t, c in M['stages']]
    if L.get('delay'): L['delay'] = round(L['delay'] * kT, 3)
    return P, M, L


# ---------------- 造型 ----------------
def ext_duration(P, extra):
    P['duration'] = round(max(P.get('duration') or 0, P['burn'] + extra), 2)


def shape_K(P, has_tail):     # 冠：长尾下坠 + 木炭余烬；星变重一点点（终端速度 × 0.8 → 后段下垂）
    P['vt'] = round(P['vt'] * 0.8, 2); P['grav'] = max(P.get('grav') or 1, 1)
    if has_tail:
        P['sparkLife'] = round(P['sparkLife'] * 2.2, 3); P['cooling'] = round((P.get('cooling') or 0.4) * 0.6, 3)
        P['emberFrac'] = max(P.get('emberFrac') or 0, 0.3); P['emberLife'] = max(P.get('emberLife') or 3, 3)
        P['sparkGrav'] = max(P.get('sparkGrav') or 0, 0.6); P['sparkInherit'] = min(P.get('sparkInherit') or 0.2, 0.2)
        ext_duration(P, P['sparkLife'] * 1.6 + 1.0)
    return '冠：尾寿命 × 2.2、冷却 × 0.6、加木炭余烬（0.3）、火花下坠 ≥ 0.6、星终端速度 × 0.8 → 后段下垂成冠'


def shape_Y(P, has_tail):     # 柳：星慢（终端速度 × 0.45）、烧得久（× 1.5）、尾很长、几乎不继承星速 → 整朵垂下来
    P['vt'] = round(P['vt'] * 0.45, 2); P['burn'] = round(P['burn'] * 1.5, 3); P['grav'] = max(P.get('grav') or 1, 1.2)
    if has_tail:
        P['sparkLife'] = round(max(P['sparkLife'] * 2.5, 1.6), 3); P['cooling'] = round((P.get('cooling') or 0.4) * 0.5, 3)
        P['sparkInherit'] = 0.15; P['sparkGrav'] = 0.35; P['sparkDrag'] = 2.5
        ext_duration(P, P['sparkLife'] * 1.5 + 0.8)
    else: ext_duration(P, 0.6)
    return '柳：星终端速度 × 0.45、燃烧 × 1.5、尾寿命 × 2.5、冷却 × 0.5、火花几乎不继承星速 → 星飞不远、整朵垂下来'


def shape_pattern(name, **kw):
    def f(P, has_tail):
        for k, v in kw.items(): P[k] = v
        return name
    return f


def shape_J(P, has_tail):     # 时差：星陆续点亮
    P['ignDelay'] = round(max(P.get('ignDelay') or 0, 0.35 * P['burn'] / 3), 3); P['ignJit'] = 90; P['burnJit'] = max(P.get('burnJit') or 0, 12)
    return '时差：点火延迟约燃烧的 12%、离散 90%（每颗星先后点亮）、燃烧离散 ≥ 12%（陆续熄灭）'


SHAPES = [('K', '冠', shape_K), ('Y', '柳', shape_Y),
          ('R', '环', shape_pattern('环：星排成一个倾斜 62° 的圆环（环的转角每个种子不同）', pattern='ring', tilt=62)),
          ('T', '土星', shape_pattern('土星：球 + 倾斜 70° 的环（环占星数 40%）', pattern='saturn', tilt=70, ringFrac=0.4)),
          ('M', '万華鏡', shape_pattern('万華鏡：星分 8 簇排在画面里（每簇张角 9°、初速离散 12% → 一瓣一瓣）', pattern='cluster', clusterLayout='ring', clusterN=8, clusterCone=9, clusterRoll=0, speedJit=12)),
          ('H', '心形', shape_pattern('心形（型物）：星排成正对镜头的心形', pattern='heart', tilt=0)),
          ('J', '时差', shape_J), ('C', '芯入', None)]
WARM = lambda hexs: any(int(h[1:3], 16) > int(h[5:7], 16) + 40 for h in hexs)


def core_layer(P0, M0, R0):
    """芯入：加一圈无尾牡丹芯（半径 0.5、对比色：暖色效果配青，冷色配金）、和亲星同时开同时灭"""
    cols = [c for _, c in (M0.get('stages') or [[0, '#ffffff']])]
    col = '#4f7bff' if WARM(cols) or cols == ['#ffffff'] else '#ffd29a'
    vt = 16.5; burn = P0['burn']
    P = {'stars': int(round(min(500, max(160, P0['stars'] * 0.8)))), 'v0': round(max(10, min(600, v0for(R0 * 0.5, vt, burn))), 1), 'vt': vt, 'burn': burn, 'burnJit': 4,
         'headSize': round(max(0.6, P0['headSize'] * 1.1), 3), 'sparkRate': 0, 'flicker': 0.15, 'flash': 0, 'fade': 0.14, 'lastFlare': 0, 'seed': (P0.get('seed') or 7) + 11,
         'duration': round(burn + 0.55, 2), 'exposure': 2.5, 'renderVer': 40, 'riseH': P0.get('riseH', 250), 'speedJit': 3, 'dirJit': 1.2}
    M = {'stages': [[0, col]], 'xw': 0.1, 'ramp0': '#000000', 'ramp1': '#4a4f5c', 'ramp2': '#c9ced9', 'ramp3': '#ffffff', 'headInt': 1.3, 'tailInt': 1}
    return P, M, '芯入：加一圈无尾牡丹芯（半径约亲星 0.5、' + ('青' if col == '#4f7bff' else '金') + '色、和亲星同开同灭）'


def load():
    out = []
    for f in SRC:
        d = json.loads(pathlib.Path(f).read_text(encoding='utf-8'))
        rid = d['id']; pre, en = META.get(rid, ('MY' + rid[-4:].upper(), re.sub(r'[^A-Za-z0-9]', '', d.get('ue', {}).get('base') or rid)))
        layers = []
        for x in d['snap']['layers']:
            P = {k: v for k, v in x['P'].items() if k not in SKIP_KEYS}
            L = x['L']; M = {k: L[k] for k in ('stages', 'xw', 'ramp0', 'ramp1', 'ramp2', 'ramp3', 'headInt', 'tailInt') if k in L}
            if not M.get('stages'): M['stages'] = (x.get('M') or {}).get('stages') or [[0, '#fff0dc']]
            layers.append({'type': x['type'], 'P': P, 'M': M, 'L': {'delay': L.get('delay', 0), 'scale': L.get('scale', 1), 'title': L.get('title') or x['type'], 'out': L.get('out')}})
        ln = [re.sub(r'[^A-Za-z0-9]', '', x or '') for x in (d.get('ue') or {}).get('layers') or []]
        ln = [x or ('Main' if len(layers) == 1 else f'L{i + 1}') for i, x in enumerate((ln + [''] * len(layers))[:len(layers)])]
        out.append({'rid': rid, 'name': d['name'], 'pre': pre, 'en': en, 'file': str(pathlib.Path(f).relative_to(ROOT)), 'layers': layers, 'layer_en': ln + ['Core']})
    return out


DEFAULTS = ROOT / 'analysis' / '原理' / '我的效果变体_默认参数.json'     # 烘焙器 defaultsFor(type, null, true).P 的快照：条目只存和它不一样的键（replicaPM 先铺默认值）


def slim(P, typ, D):
    d = D.get(typ) or {}
    return {k: v for k, v in P.items() if k == 'renderVer' or k == 'exposure' or k not in d or d[k] != v}


def main(a):
    recs = load(); expo = {}
    for f in a.expo or []:     # 本机 变体对照.py 每个效果一份 曝光.json（_auto / _k 这些不是条目，不管）
        expo.update({k: v for k, v in json.loads(pathlib.Path(f).read_text(encoding='utf-8')).items() if not k.startswith('_')})
    D = json.loads(DEFAULTS.read_text(encoding='utf-8'))['types'] if DEFAULTS.exists() else {}
    old = {e['id']: e for e in json.loads(OUT.read_text(encoding='utf-8')).get('entries', [])} if OUT.exists() else {}
    entries, combos, effects = [], [], []
    for rc in recs:
        R0 = max(radius(l['P']) for l in rc['layers']); n0 = size_of(R0)
        tiers = [('O', '原样', None)]
        tiers += [(tag, label, ('size', n)) for n, tag, label in SIZES if abs(row(n)[1] - 2 * R0) / (2 * R0) > 0.12]
        for tag, label, fn in SHAPES:
            if tag == 'K' and any(l['type'] == 'kamuro' for l in rc['layers']): continue     # 已经是冠
            tiers.append((tag, label, ('shape', tag)))
        fx_tiers = []
        for tag, label, how in tiers:
            lays, note = [], ''
            for i, l in enumerate(rc['layers']):
                P, M, L = dict(l['P']), copy.deepcopy(l['M']), dict(l['L'])
                if how and how[0] == 'size':
                    P, M, L = scale_layer(P, M, L, n0, how[1]); note = f'按号数表从原样（直径 {2 * R0:.0f} m ≈ {n0:.1f} 号）缩放到 {label}（直径约 {row(how[1])[1]:.0f} m）'
                elif how and how[1] != 'C':
                    fn = next(s for s in SHAPES if s[0] == how[1])[2]; note = fn(P, (P.get('sparkRate') or 0) > 0)
                lays.append((P, M, L, l['type']))
            if how and how[1] == 'C':
                Pc, Mc, note = core_layer(rc['layers'][0]['P'], rc['layers'][0]['M'], R0)
                lays.append((Pc, Mc, {'delay': 0, 'scale': 1, 'title': '芯'}, 'botan'))
            tid = f"{rc['pre']}-{tag}"; multi = len(lays) > 1
            ids = []
            for i, (P, M, L, typ) in enumerate(lays):
                eid = f'{tid}-{i + 1}' if multi else tid
                if eid in expo and expo[eid]: P['exposure'] = expo[eid]
                elif eid in old and 'exposure' in old[eid]['p'] and how is not None: P['exposure'] = old[eid]['p']['exposure']
                e = {'id': eid, 'date': '2026-10-07', 'name': f"{rc['name']} · {label}" + (f" · {L['title']}" if multi else ''), 'base': typ, 'tags': f"我的效果 变体 {rc['name']} {label} {eid}",
                     'p': slim(P, typ, D), 'm': M, 'note': (note or '照你保存的原样，一个数没改。') + f"（来源：{rc['file']}）",
                     'look': ['这一排变体放在一起看：大小、造型是不是拉开了', '引擎回放 + 游戏内大小', '哪个不要、哪个再调，直接说']}
                if multi: e['hidden'] = True
                entries.append(e); ids.append((eid, L))
            if multi:
                combos.append({'id': tid, 'date': '2026-10-07', 'name': f"{rc['name']} · {label}",
                               'layers': [dict({'m': 'rep:' + eid, 'scale': L.get('scale', 1), 'delay': L.get('delay', 0)}, **({'out': L['out']} if L.get('out') else {})) for eid, L in ids],
                               'layerNames': [L.get('title') for _, L in ids], 'tags': f"我的效果 变体 {rc['name']} {label} {tid}", 'note': note or '照你保存的原样。'})
            fx_tiers.append(dict({'id': tid, 'label': label}, **({'en': EN_SFX[tag]} if tag in EN_SFX else {})))
        effects.append({'key': 'myv_' + rc['rid'], 'name': rc['name'], 'en': rc['en'], 'layer_en': rc['layer_en'], 'tiers': fx_tiers, 'n0': n0, 'R0': R0})
        print(rc['name'], f'直径 {2 * R0:.0f} m ≈ {n0:.1f} 号', '→', ' '.join(t['label'] for t in fx_tiers))
    doc = {'说明': '我的效果变体（对话框新花型，用户 2026-10-07 00:59「我保存了的那几个效果也一起帮我多几个玉型大小变化与更多的造型变化，我都要拿来当素材」）：'
                   'analysis/我的配方/ 下每个效果出原样 + 大小（按号数表）+ 造型（冠 / 柳 / 环 / 土星 / 万華鏡 / 心形 / 时差 / 芯入）。由 analysis/scripts/我的效果变体.py 生成，不要手改（改脚本重跑）。',
           'entries': entries, 'combos': combos}
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding='utf-8')
    (ROOT / 'analysis' / '原理' / '我的效果变体_清单.json').write_text(json.dumps(effects, ensure_ascii=False, indent=1), encoding='utf-8')
    print('→', OUT, len(entries), '条目', len(combos), '组合')
    if a.status: write_status(effects)


def write_status(effects):
    d = json.loads(STATUS.read_text(encoding='utf-8'), object_pairs_hook=collections.OrderedDict)
    have = {e['key']: e for e in d['effects']}
    for fx in effects:
        e = have.get(fx['key'])
        if e is None:
            e = collections.OrderedDict([('key', fx['key']), ('名', f"{fx['name']} · 大小与造型"), ('负责', '对话框新花型'), ('阶段', '制作中'), ('参考', []),
                                         ('主条目', fx['tiers'][0]['id']), ('工作版', fx['tiers'][0]['id']), ('方案', fx['tiers']),
                                         ('进度', {'计算': False, 'AI自检': False, '素材导出': False, '用户验收': False}), ('缺', ['每档自动曝光（本机）', '导出 + 回放检查 + 标准检查（本机）', 'UE 4.24 实机导入未验证']),
                                         ('下一步', ''), ('说明', f"你保存的「{fx['name']}」（analysis/我的配方/）出的一组素材变体：原样 + 大小 + 造型。原样一个数没改。"), ('英文名', fx['en'])])
            d['effects'].append(e)
        else: e['方案'] = fx['tiers']
        e['层英文名'] = fx['layer_en']     # 多层的组合包每层名字（你保存时起的层名；芯入多出来的一层叫 Core）
    STATUS.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('状态清单：', ', '.join(fx['key'] for fx in effects))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--expo', nargs='*'); ap.add_argument('--status', action='store_true')
    main(ap.parse_args())
