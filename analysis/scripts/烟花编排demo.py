"""210秒游戏烟花编排设计数据。仅为目标包络，不代表UE实测或素材导出。"""
import csv
import json
import random
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '协作' / '编排demo'


def build_show():
    phases = [
        (0, 12, '低位起势', '前台7点先起：F4彗星→F3/F5彗星→外扩→内收→单4→反向追→0:10.4光带；坝顶6/9秒两遍九点小花。'),
        (12, 38, '连续展开', '坝顶每4秒九点中花；前台在两波之间单4/双3/外扩/内收轮换，36.5秒光带。'),
        (38, 65, '密集问答', '坝顶每4秒五点；前台晚2秒用单4/双3回答，64秒七点追。'),
        (65, 90, '往返扫射', '坝顶四遍九点往返扫（每点0.28秒）；前台每遍晚2.5秒反向扫（每点0.2秒），86秒彗星内收。'),
        (90, 110, '第一次抬升', '四轮九点中花+两轮三点大花；前台单4/双3/外扩，106秒金色光带，108秒上层全灭。'),
        (110, 132, '低位密奏', '坝顶完全退出；前台7点独奏：单发→成对外扩→光带→左右追→单双涟漪→彗星内收→金色光带。'),
        (132, 165, '第二次递进', '六轮九点中花+两轮三点大花；前台每3秒一句，单4/双3/外扩/内收轮换，162秒光带。'),
        (165, 188, '金色终章', '九点金花三轮+五点金裂星+两波九点金垂柳；前台金色光带开头和收尾，178.3秒前退场。'),
        (188, 200, '白色收束', '坝顶188秒起每1.5秒一波，八轮九点白墙；前台全停。'),
        (200, 210, '自然余韵', '白墙余火持续到206.5秒，最后3.5秒静场。'),
    ]
    templates = {}

    def template(key, name, zone, kind, diameter, z, rise, life, hue, extra=0):
        templates[key] = dict(name=name, zone=zone, kind=kind,
                              shape='sphere' if kind in ('small','medium','large') else kind,
                              diameter=diameter, z=z, rise=rise, life=life,
                              hue=hue, margin=extra, top=z + diameter / 2 + extra)

    # margin同时预留3m垂直变化与5m光晕；不靠裁切隐藏越界。
    # 前台升空1.6–1.8 s（对话框22 10-07，原1.1–1.3 s阻力过大），阻力约2，与坝顶低层小花同一手感。
    template('F_COMET', '前台·短彗星', 'front', 'comet', 8, 130, 1.8, 0.6, 'gold', 8)
    template('F_SILVER', '前台·小银菊', 'front', 'small', 32, 112, 1.7, 2.3, 'silver', 8)
    template('F_LIME', '前台·小青柠', 'front', 'small', 30, 105, 1.6, 2.3, 'lime', 8)
    template('F_GOLD', '前台·小金花', 'front', 'small', 40, 115, 1.8, 2.8, 'gold', 8)
    template('F_CRACKLE', '前台·短爆裂', 'front', 'small', 24, 112, 1.7, 1.8, 'gold', 8)
    template('P_SILVER', '坝顶·低层小银菊', 'dam', 'small', 90, 230, 2, 3, 'silver')
    template('P_LIME', '坝顶·小青柠', 'dam', 'small', 90, 300, 3.5, 3, 'lime')
    template('P_SPLIT', '坝顶·金裂星', 'dam', 'small', 90, 300, 3.5, 3, 'gold')
    template('P_MS', '坝顶·银白金芒菊', 'dam', 'medium', 150, 360, 5, 4, 'silver')
    template('P_MG', '坝顶·金芒菊', 'dam', 'medium', 150, 360, 5, 4, 'gold')
    template('P_GREEN', '坝顶·金蕊青柠', 'dam', 'medium', 150, 360, 5, 4, 'lime')
    template('P_MULTI', '坝顶·多重菊', 'dam', 'medium', 150, 360, 5, 4, 'silver')
    template('P_LS', '坝顶·银彩菊', 'dam', 'large', 230, 480, 8, 6, 'silver')
    template('P_LG', '坝顶·金垂柳', 'dam', 'large', 230, 480, 8, 7, 'gold')
    template('P_WALL', '坝顶·银白墙', 'dam', 'large', 230, 360, 5, 8, 'silver')
    # 扇形三种（对话框22 10-07用户：金色参考图型、红彗星5束、银灰13束；10-08按实拍规律重做）。
    # 一个事件 = 一个扇点打一排：一排的筒串联引线，从一侧到另一侧逐筒出膛（FanGold实拍0.035 s/筒、
    # 11筒约0.38 s扫完）；diameter=2×星飞行长度，half=半张角，life=单颗星从出膛到熄灭。
    # 金锦冠：计划书扇宽约100 m、燃烧3 s（±45°、70 m → 宽≈99 m）；红彗星、银灰为设计值，待用户定。
    template('G_GOLD', '坝顶·金锦冠扇形', 'dam', 'fan', 140, 150, 0, 3.0, 'gold')
    template('G_RED5', '坝顶·红彗星扇形', 'dam', 'fan', 150, 150, 0, 2.2, 'red')
    template('G_SILVER13', '坝顶·银灰扇形', 'dam', 'fan', 130, 150, 0, 2.6, 'gray')
    for k, half, beams in (('G_GOLD', 45, [9, 11, 13, 15, 17]), ('G_RED5', 35, [3, 5, 7, 9]),
                           ('G_SILVER13', 50, [9, 11, 13, 15, 19])):
        templates[k].update(half=half, beams=beams, gap=0.035)
    points = {}
    xs = [-374.79, -288.19, -196.59, -100, 0, 100, 196.59, 288.19, 374.79]
    ys = [113.82, 63.82, 25.88, 0, 0, 0, 25.88, 63.82, 113.82]
    for i, (x, y) in enumerate(zip(xs, ys), 1):
        points[f'P{i}'] = dict(x=x, y=y, z=150, zone='dam')
    for i in range(1, 9):
        a, b = points[f'P{i}'], points[f'P{i+1}']
        points[f'B{i}'] = dict(x=round((a['x']+b['x'])/2, 2),
                                 y=round((a['y']+b['y'])/2, 2), z=150, zone='dam')
    # B2/B7正好在弧长150 m的转角上；弦中点会落到舞台外约6.5 m（对话框22 10-07修）。
    for name, sx in (('B2', -1), ('B7', 1)):
        points[name].update(x=round(sx * 244.89, 2), y=38.82)
    # 前台7点（对话框22，用户10-07「小平台可以多加几个点」）：间距23 m，
    # 最大花径40 m时外缘69+20+8=97 m，仍在平台±100 m内。
    for i, x in enumerate((-69, -46, -23, 0, 23, 46, 69), 1):
        points[f'F{i}'] = dict(x=x, y=45, z=50, zone='front')
    allp = [f'P{i}' for i in range(1, 10)]
    fanline = allp + [f'B{i}' for i in range(1, 9)]
    events = []

    def fire(burst, pts, key, step=0):
        t = templates[key]
        for j, point in enumerate(pts):
            b = round(burst + j * step, 2)
            events.append(dict(point=point, template=key, zone=t['zone'],
                               launch=round(b-t['rise'], 2), burst=b,
                               end=round(b+t['life'], 2)))

    # ---- 扇形句型（10-08重做，参考 analysis/原理/FanGold.md 实拍：逐筒扫、排间方向交替、
    #      排间隔1.6–2.1 s、尾声三排0.33 s连发）。一句同色同束数，不随机。 ----
    LINE = sorted(allp + [f'B{i}' for i in range(1, 9)], key=lambda n: points[n]['x'])
    PL = sorted(allp, key=lambda n: points[n]['x'])
    TILT = {'P1': -15, 'P9': 15}   # 计划书：两端外左/外右，扇面朝外张开

    def row(t0, point, key, n, d):
        t = templates[key]
        b = round(t0, 2)
        sweep = (n - 1) * t['gap']
        events.append(dict(point=point, template=key, zone='dam', launch=b, burst=b,
                           end=round(b + sweep + t['life'], 2), beams=n, dir=d,
                           tilt=TILT.get(point, 0)))

    def side(point):
        return -1 if points[point]['x'] < -1 else 1 if points[point]['x'] > 1 else 0

    def fan_wall(t0, pts, key, n, mode):
        # 齐扫：同一时刻；'out' 左半往左扫、右半往右扫（镜像外张），'in' 反过来，'L'/'R' 全线同向
        for q in pts:
            sd = side(q)
            if mode in ('L', 'R'):
                d = mode
            elif sd == 0:
                d = 'L' if mode == 'out' else 'R'
            else:
                d = ('R' if sd < 0 else 'L') if mode == 'out' else ('L' if sd < 0 else 'R')
            row(t0, q, key, n, d)

    def fan_chase(t0, pts, key, n, step, d):
        # 追逐：一个点接一个点，扫的方向和追的方向一致（d='L' 左→右）
        order = pts if d == 'L' else list(reversed(pts))
        for i, q in enumerate(order):
            row(t0 + i * step, q, key, n, d)

    def fan_vee(t0, pts, key, n, step, mode):
        # V 型：'out' 从中间往两边点（中心先），'in' 从两端往中间；扫向跟着走
        ranks = sorted({abs(points[q]['x']) for q in pts}, reverse=(mode == 'in'))
        for i, ax in enumerate(ranks):
            for q in pts:
                if abs(points[q]['x']) == ax:
                    sd = side(q)
                    d = ('R' if sd < 0 else 'L') if mode == 'out' else ('L' if sd < 0 else 'R')
                    if sd == 0:
                        d = 'L'
                    row(t0 + i * step, q, key, n, d)

    def fan_zrows(times, pts, key, n, first='L'):
        # Z 字连排：同一批点连打几排，每排方向翻转（实拍引线走 Z 字）
        d = first
        for t0 in times:
            for q in pts:
                row(t0, q, key, n, d)
            d = 'R' if d == 'L' else 'L'

    def fan_alt(t0, groups, key, n, gap, rows):
        # 奇偶交替：两组点轮流打，镜像外张
        for i in range(rows):
            fan_wall(t0 + i * gap, groups[i % 2], key, n, 'out')

    five = ['P1', 'P3', 'P5', 'P7', 'P9']

    # ---- 前台7点句型（对话框22 10-07）：只放F_专属小花，坝顶组不绑F点 ----
    FR = [f'F{i}' for i in range(1, 8)]
    ODD, EVEN = ['F1', 'F3', 'F5', 'F7'], ['F2', 'F4', 'F6']
    RINGS = [['F4'], ['F3', 'F5'], ['F2', 'F6'], ['F1', 'F7']]

    def spread(b, key, step=.22):      # 中心向两端
        for k, ring in enumerate(RINGS):
            fire(round(b + k*step, 2), ring, key)

    def gather(b, key, step=.22):      # 两端向中心
        for k, ring in enumerate(reversed(RINGS)):
            fire(round(b + k*step, 2), ring, key)

    def band(b, key):                  # 7点齐开，连成低位光带
        fire(b, FR, key)

    def chase(b, key, rev=False, step=.15):
        fire(b, list(reversed(FR)) if rev else FR, key, step)

    # 低位起势 0–12：前台单独开场，由中心一发长成7点光带
    fire(1.8, ['F4'], 'F_COMET')
    fire(2.6, ['F3', 'F5'], 'F_COMET')
    spread(3.4, 'F_SILVER')
    gather(5.2, 'F_LIME')
    fire(7, ODD, 'F_GOLD', .25)
    chase(8.8, 'F_CRACKLE', rev=True)
    band(10.4, 'F_SILVER')
    # 连续展开 12–38：坝顶九点中花之间，前台单双点交替回应
    for b, kind, key in ((14, 'odd', 'F_SILVER'), (18, 'even', 'F_LIME'), (22, 'spread', 'F_GOLD'),
                         (26, 'odd', 'F_LIME'), (30, 'even', 'F_SILVER'), (34, 'gather', 'F_CRACKLE')):
        {'odd': lambda: fire(b, ODD, key), 'even': lambda: fire(b, EVEN, key),
         'spread': lambda: spread(b, key), 'gather': lambda: gather(b, key)}[kind]()
    band(36.5, 'F_SILVER')
    # 密集问答 38–65：坝顶五点，前台晚2秒以单4/双3回答，最后一句7点追逐
    for i, b in enumerate((40, 44, 48, 52, 56, 60)):
        fire(b, ODD if i % 2 == 0 else EVEN, 'F_LIME' if i % 2 == 0 else 'F_SILVER')
    chase(64, 'F_SILVER')
    # 往返扫射 65–90：前台与坝顶反向扫，末尾彗星由外向内收
    for i, b in enumerate((68.5, 73.5, 78.5, 83.5)):
        chase(b, 'F_CRACKLE' if i % 2 == 0 else 'F_SILVER', rev=(i % 2 == 0), step=.2)
    gather(86, 'F_COMET', .25)
    # 第一次抬升 90–110
    fire(91, ODD, 'F_GOLD')
    fire(94, EVEN, 'F_SILVER')
    spread(97, 'F_CRACKLE')
    fire(100, ODD, 'F_GOLD')
    fire(103, EVEN, 'F_SILVER')
    band(106, 'F_GOLD')
    # 低位密奏 110–132：坝顶全停，7点前台独奏（单发→成对外扩→光带→追逐→单双涟漪→彗星收→光带收束）
    fire(111, ['F4'], 'F_GOLD')
    fire(112.5, ['F3', 'F5'], 'F_SILVER')
    fire(114, ['F2', 'F6'], 'F_LIME')
    fire(115.5, ['F1', 'F7'], 'F_CRACKLE')
    band(117, 'F_SILVER')
    chase(119, 'F_LIME', step=.18)
    chase(121, 'F_CRACKLE', rev=True, step=.18)
    for b, pts, key in ((123, ODD, 'F_SILVER'), (124, EVEN, 'F_GOLD'), (125, ODD, 'F_SILVER'), (126, EVEN, 'F_GOLD')):
        fire(b, pts, key)
    gather(127.5, 'F_COMET', .25)
    band(129, 'F_GOLD')
    # 第二次递进 132–165：每3秒一句，四种句型轮换，最后一句光带
    cyc = (('odd', 'F_LIME'), ('even', 'F_SILVER'), ('spread', 'F_CRACKLE'), ('gather', 'F_GOLD'))
    for i, b in enumerate(range(135, 163, 3)):
        kind, key = cyc[i % 4]
        if b == 162:
            band(b, 'F_SILVER')
        elif kind == 'odd':
            fire(b, ODD, key)
        elif kind == 'even':
            fire(b, EVEN, key)
        elif kind == 'spread':
            spread(b, key)
        else:
            gather(b, key)
    # 金色终章 165–188：金色光带开头和收尾，177.7秒前全部熄灭退场
    band(165.5, 'F_GOLD')
    fire(168, ODD, 'F_CRACKLE')
    fire(170.5, EVEN, 'F_SILVER')
    spread(173, 'F_GOLD')
    band(175.5, 'F_GOLD')

    fire(6, allp, 'P_SILVER', .12)
    fire(9, allp, 'P_LIME', .12)
    for i, b in enumerate((12, 16, 20, 24, 28, 32)):
        fire(b, allp, 'P_MS' if i % 2 == 0 else 'P_MG')

    for i, b in enumerate((38, 42, 46, 50, 54, 58, 62)):
        fire(b, five, 'P_GREEN' if i % 2 == 0 else 'P_MS')
    for i, b in enumerate((66, 71, 76, 81)):
        fire(b, allp if i % 2 == 0 else list(reversed(allp)),
             'P_SILVER' if i % 2 == 0 else 'P_SPLIT', .28)
    fire(88, allp, 'P_MG')

    for i, b in enumerate((92, 96, 100, 104)):
        fire(b, allp, 'P_GREEN' if i % 2 == 0 else 'P_MULTI')
    for b in (95, 101):
        fire(b, ['P1', 'P5', 'P9'], 'P_LS')
    # 108秒上层全灭，110–132秒内连坝顶预发也停。
    for i, b in enumerate((137, 142, 147, 152, 157, 162)):
        fire(b, allp, ('P_MG', 'P_MULTI', 'P_GREEN')[i % 3])
    for b in (146, 156):
        fire(b, ['P2', 'P5', 'P8'], 'P_LS')

    for b in (166, 170, 174):
        fire(b, allp, 'P_MG')
    fire(172, five, 'P_SPLIT')
    for b in (179, 182):
        fire(b, allp, 'P_LG')
    # ---- 扇形编排（10-08）----
    GOLD, RED, SILV = 'G_GOLD', 'G_RED5', 'G_SILVER13'
    PODD, PEVEN = ['P1', 'P3', 'P5', 'P7', 'P9'], ['P2', 'P4', 'P6', 'P8']
    # 起势：0:10.4 中心先起往外扩、0:11.4 反向收回，金网迎接0:12九点齐射（计划书开场参考图）
    fan_vee(10.4, LINE, GOLD, 11, .06, 'out')
    fan_wall(11.4, LINE, GOLD, 11, 'in')
    # 连续展开：两波开花之间各一句，每句换句型
    fan_chase(14.4, PL, GOLD, 11, .15, 'L')
    fan_chase(18.4, PL, GOLD, 11, .15, 'R')
    fan_vee(22.4, LINE, SILV, 13, .08, 'out')
    fan_vee(26.4, LINE, SILV, 13, .08, 'in')
    fan_alt(30.4, (PODD, PEVEN), RED, 5, .5, 4)
    fan_zrows((34.0, 35.8, 37.4), PL, GOLD, 13)
    # 往返扫射：开花左右扫，扇形每次反着追回来；末尾Z字连排+尾声三连发
    fan_chase(67.0, LINE, SILV, 13, .14, 'R')
    fan_chase(72.0, LINE, RED, 5, .14, 'L')
    fan_chase(77.0, LINE, GOLD, 11, .14, 'R')
    fan_chase(82.0, LINE, SILV, 15, .14, 'L')
    fan_zrows((84.5, 86.3, 87.9, 88.23, 88.56), PL, GOLD, 11)
    # 第一次抬升：镜像齐扫做底
    fan_wall(93.0, LINE, GOLD, 15, 'out')
    fan_vee(97.6, LINE, RED, 7, .07, 'in')
    fan_wall(103.0, LINE, SILV, 19, 'out')
    # 第二次递进
    fan_chase(139.0, PL, RED, 5, .12, 'L')
    fan_chase(140.4, PL, RED, 5, .12, 'R')
    fan_alt(144.0, (PODD, PEVEN), SILV, 13, .45, 4)
    fan_vee(149.0, LINE, GOLD, 13, .07, 'out')
    fan_chase(153.5, LINE, SILV, 13, .10, 'R')
    fan_vee(159.0, LINE, GOLD, 15, .07, 'in')
    fan_vee(160.4, LINE, GOLD, 15, .07, 'out')
    # 金色终章：全金
    fan_wall(167.0, LINE, GOLD, 13, 'out')
    fan_wall(168.8, LINE, GOLD, 13, 'in')
    fan_chase(173.0, LINE, GOLD, 15, .08, 'L')
    fan_chase(174.6, LINE, GOLD, 15, .08, 'R')
    fan_zrows((178.0, 179.8, 181.4, 182.4, 182.73, 183.06), PL, GOLD, 17)
    # 八波白墙，每1.5秒一波；最后一波198.5开、206.5自然灭完。
    for b in (188, 189.5, 191, 192.5, 194, 195.5, 197, 198.5):
        fire(b, allp, 'P_WALL')
    events.sort(key=lambda e: (e['launch'], e['point'], e['template']))
    for i, e in enumerate(events, 1):
        e['id'] = f'C{i:03}'
        e['phase'] = next(j for j, (a, b, _, _) in enumerate(phases)
                          if a <= e['burst'] < b)
    # 错落（用户10-07「不要每一个都完全一起播放」）：时间表本身不动，另记每发的
    # 开花延迟dt、高度偏移dz、大小比例scale；回放时叠加。前台只往低、往小错，不超145 m。
    srng = random.Random(20261008)
    for e in events:
        t = templates[e['template']]
        if t['kind'] == 'fan':
            e.update(dt=0, dz=0, scale=1)  # 扇形按句型精确对齐，不加随机
        elif t['zone'] == 'front':
            e.update(dt=round(srng.uniform(0, .2), 2), dz=-round(srng.uniform(0, 5), 1),
                     scale=round(srng.uniform(.9, 1.0), 2))
        elif t['kind'] == 'large':
            e.update(dt=round(srng.uniform(0, .45), 2), dz=-round(srng.uniform(0, 22), 1),
                     scale=round(srng.uniform(.9, 1.0), 2))
        else:
            e.update(dt=round(srng.uniform(0, .45), 2), dz=round(srng.uniform(-14, 10), 1),
                     scale=round(srng.uniform(.88, 1.12), 2))
    return dict(version='front-low-v3-7pt', duration=210,
                boundary=dict(dam=150, platform=50, frontCeiling=145,
                              platformWidth=200, platformDepth=50),
                assumptions=dict(bendDegrees=15, frontY=45,
                                 dimensions='设计目标，未UE标定；前台余量含3m变化+5m光晕'),
                phases=[dict(start=a, end=b, name=n, detail=d) for a,b,n,d in phases],
                points=points, templates=templates, events=events)


def validate(show):
    points, templates, events = show['points'], show['templates'], show['events']
    for e in events:
        t, p = templates[e['template']], points[e['point']]
        if t['kind'] in ('small', 'medium', 'large'):
            assert t['shape'] == 'sphere', e
        assert e['zone'] == t['zone'] == p['zone'], e
        assert 0 <= e['launch'] <= e['burst'] < e['end'] <= 210, e
        assert round(e['burst']-e['launch'], 2) == t['rise'], e
        if e['zone'] == 'front':
            assert e['template'].startswith('F_') and t['kind'] in ('small', 'comet'), e
            assert t['diameter'] <= 40 and t['top'] <= 145, e
            assert abs(p['x'])+t['diameter']/2+8 <= 100, e
            assert p['z'] == 50, e
            assert t['z']-t['diameter']/2-8 >= 50, e
            assert e['end'] < 179, e
    wall = [e for e in events if e['template']=='P_WALL']
    assert len(wall) == 72
    assert Counter(e['burst'] for e in wall) == {b:9 for b in (188, 189.5, 191, 192.5, 194, 195.5, 197, 198.5)}
    assert not any(e['zone']=='dam' and e['launch'] < 132 and e['end'] > 110 for e in events)
    assert max(e['end'] for e in events) == 206.5
    assert len({(e['point'], e['template'], e['burst']) for e in events}) == len(events)
    assert len(events) >= 279 * 3
    assert sum(e['zone']=='front' for e in events) >= 48 * 3
    assert show['phases'][0]['start'] == 0 and show['phases'][-1]['end'] == 210
    assert all(a['end']==b['start'] for a,b in zip(show['phases'],show['phases'][1:]))


def main():
    show = build_show()
    validate(show)
    OUT.mkdir(exist_ok=True)
    (OUT/'时间线.json').write_text(json.dumps(show, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    fragment = (ROOT/'analysis/templates/fireworks-rhythm.html').read_text(encoding='utf-8')
    (OUT/'fireworks-rhythm.html').write_text(fragment.replace('__SHOW_DATA__', json.dumps(show, ensure_ascii=False)), encoding='utf-8')
    with (OUT/'逐发时间表.csv').open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f)
        w.writerow(['ID','段落','发射秒','开花秒','结束秒','点位','区域','子模板','花型','造型','束数','扫法','偏移秒','高度偏移_m','大小比例','X_cm','Y_cm','发射Z_cm','开花Z_cm','直径_cm','包络顶部_cm'])
        for e in show['events']:
            t, p = show['templates'][e['template']], show['points'][e['point']]
            w.writerow([e['id'],show['phases'][e['phase']]['name'],e['launch'],e['burst'],e['end'],
                        e['point'],e['zone'],e['template'],t['name'],t['shape'],e.get('beams',''),e.get('dir',''),e['dt'],e['dz'],e['scale'],round(p['x']*100),round(p['y']*100),
                        p['z']*100,t['z']*100,t['diameter']*100,t['top']*100])
    print('PASS: 前台包络/区域/时间/低位密奏/白墙72发/206.5秒结束/数量至少3倍/无重复事件')
    print('TOTAL',len(show['events']),dict(Counter(e['zone'] for e in show['events'])))
    for i, p in enumerate(show['phases']):
        es = [e for e in show['events'] if e['phase']==i]
        print(p['name'],dict(Counter(show['templates'][e['template']]['kind'] for e in es)),
              '前台',sum(e['zone']=='front' for e in es))


if __name__ == '__main__':
    main()
