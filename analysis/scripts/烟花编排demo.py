"""210秒游戏烟花编排设计数据。仅为目标包络，不代表UE实测或素材导出。"""
import csv
import json
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
    template('G_GOLD', '坝顶·金锦冠扇形', 'dam', 'fan', 100, 180, 0, 3, 'gold')
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
    for b in (11, 15, 19, 23, 27, 31, 35):
        fire(b, fanline, 'G_GOLD')
    for i, b in enumerate((12, 16, 20, 24, 28, 32)):
        fire(b, allp, 'P_MS' if i % 2 == 0 else 'P_MG')

    for i, b in enumerate((38, 42, 46, 50, 54, 58, 62)):
        fire(b, five, 'P_GREEN' if i % 2 == 0 else 'P_MS')
    for i, b in enumerate((66, 71, 76, 81)):
        fire(b, allp if i % 2 == 0 else list(reversed(allp)),
             'P_SILVER' if i % 2 == 0 else 'P_SPLIT', .28)
    for b in (67, 77, 87):
        fire(b, fanline, 'G_GOLD')
    fire(88, allp, 'P_MG')

    for i, b in enumerate((92, 96, 100, 104)):
        fire(b, allp, 'P_GREEN' if i % 2 == 0 else 'P_MULTI')
    for b in (95, 101):
        fire(b, ['P1', 'P5', 'P9'], 'P_LS')
    for b in (93, 103):
        fire(b, fanline, 'G_GOLD')
    # 108秒上层全灭，110–132秒内连坝顶预发也停。
    for i, b in enumerate((137, 142, 147, 152, 157, 162)):
        fire(b, allp, ('P_MG', 'P_MULTI', 'P_GREEN')[i % 3])
    for b in (146, 156):
        fire(b, ['P2', 'P5', 'P8'], 'P_LS')
    for b in (139, 149, 159):
        fire(b, fanline, 'G_GOLD')

    for b in (166, 170, 174):
        fire(b, allp, 'P_MG')
    fire(172, five, 'P_SPLIT')
    for b in (167, 173, 179):
        fire(b, fanline, 'G_GOLD')
    for b in (179, 182):
        fire(b, allp, 'P_LG')
    # 八波白墙，每1.5秒一波；最后一波198.5开、206.5自然灭完。
    for b in (188, 189.5, 191, 192.5, 194, 195.5, 197, 198.5):
        fire(b, allp, 'P_WALL')
    events.sort(key=lambda e: (e['launch'], e['point'], e['template']))
    for i, e in enumerate(events, 1):
        e['id'] = f'C{i:03}'
        e['phase'] = next(j for j, (a, b, _, _) in enumerate(phases)
                          if a <= e['burst'] < b)
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
        w.writerow(['ID','段落','发射秒','开花秒','结束秒','点位','区域','子模板','花型','造型','X_cm','Y_cm','发射Z_cm','开花Z_cm','直径_cm','包络顶部_cm'])
        for e in show['events']:
            t, p = show['templates'][e['template']], show['points'][e['point']]
            w.writerow([e['id'],show['phases'][e['phase']]['name'],e['launch'],e['burst'],e['end'],
                        e['point'],e['zone'],e['template'],t['name'],t['shape'],round(p['x']*100),round(p['y']*100),
                        p['z']*100,t['z']*100,t['diameter']*100,t['top']*100])
    print('PASS: 前台包络/区域/时间/低位密奏/白墙72发/206.5秒结束/数量至少3倍/无重复事件')
    print('TOTAL',len(show['events']),dict(Counter(e['zone'] for e in show['events'])))
    for i, p in enumerate(show['phases']):
        es = [e for e in show['events'] if e['phase']==i]
        print(p['name'],dict(Counter(show['templates'][e['template']]['kind'] for e in es)),
              '前台',sum(e['zone']=='front' for e in es))


if __name__ == '__main__':
    main()
