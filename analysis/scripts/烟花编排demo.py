"""210秒游戏烟花编排设计数据。仅为目标包络，不代表UE实测或素材导出。"""
import csv
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '协作' / '编排demo'


def build_show():
    phases = [
        (0, 12, '低位引子', '前台三点缓慢点亮，坝顶只在末尾预告。'),
        (12, 38, '坝顶展开', '银白、暖金两次展开；前台在两波之间轻答。'),
        (38, 65, '上下问答', '坝顶每六秒一对，前台晚2.7秒回应，花型保持疏朗。'),
        (65, 90, '双向流动', '坝顶左右扫两遍；前台只在扫完后补中心短句。'),
        (90, 110, '第一次抬升', '五点到九点，三发大花抬高；前台三次短促回应。'),
        (110, 132, '低位间奏', '上层余火先退，前台单发、对开、三点收句，随后全场留白。'),
        (132, 165, '第二次递进', '坝顶三点、五点、九点递增；前台节奏由稀到密。'),
        (165, 188, '金色终章', '坝顶暖金铺满，再下垂成金帘；前台最后一句后彻底退出。'),
        (188, 200, '白色收束', '坝顶190/192/194/196秒四波九点齐爆，前台全停。'),
        (200, 210, '自然余韵', '只让白墙自然熄灭，最后六秒静场。'),
    ]
    templates = {}

    def template(key, name, zone, kind, diameter, z, rise, life, hue, extra=0):
        templates[key] = dict(name=name, zone=zone, kind=kind,
                              diameter=diameter, z=z, rise=rise, life=life,
                              hue=hue, margin=extra, top=z + diameter / 2 + extra)

    # margin同时预留3m垂直变化与5m光晕；不靠裁切隐藏越界。
    template('F_COMET', '前台·短彗星', 'front', 'comet', 8, 130, 1.2, 0.6, 'gold', 8)
    template('F_SILVER', '前台·小银菊', 'front', 'small', 32, 112, 1.2, 2.3, 'silver', 8)
    template('F_LIME', '前台·小青柠', 'front', 'small', 30, 105, 1.1, 2.3, 'lime', 8)
    template('F_GOLD', '前台·小金花', 'front', 'small', 40, 115, 1.3, 2.8, 'gold', 8)
    template('F_CRACKLE', '前台·短爆裂', 'front', 'small', 24, 112, 1.1, 1.8, 'gold', 8)
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
    for i, x in enumerate((-70, 0, 70), 1):
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

    fire(1.2, ['F1', 'F2', 'F3'], 'F_COMET', 1.4)
    fire(5.8, ['F1', 'F3'], 'F_SILVER')
    fire(9.0, ['F2'], 'F_GOLD')
    fire(11, fanline, 'G_GOLD')
    fire(12, allp, 'P_MS')
    fire(19, fanline, 'G_GOLD')
    fire(20, allp, 'P_MG')
    fire(25, ['F2'], 'F_LIME')
    fire(29, ['P2', 'P8'], 'P_LIME')
    fire(32, ['F1', 'F3'], 'F_SILVER')
    fire(34, ['P3', 'P7'], 'P_SILVER')

    for i, b in enumerate((38, 44, 50, 56)):
        fire(b, ['P2', 'P8'] if i % 2 == 0 else ['P3', 'P7'],
             'P_GREEN' if i % 2 == 0 else 'P_MS')
        fire(b+2.7, ['F2'] if i % 2 == 0 else ['F1', 'F3'],
             'F_LIME' if i % 2 == 0 else 'F_SILVER')
    fire(62, ['P5'], 'P_MG')
    fire(66, allp, 'P_SILVER', 0.45)
    fire(72, ['F2'], 'F_COMET')
    fire(76, list(reversed(allp)), 'P_SPLIT', 0.45)
    fire(82, ['F2'], 'F_CRACKLE')
    fire(87, fanline, 'G_GOLD')
    fire(88, allp, 'P_MG')

    fire(91, ['F1', 'F3'], 'F_GOLD')
    fire(92, ['P1', 'P3', 'P5', 'P7', 'P9'], 'P_GREEN')
    fire(94, ['F2'], 'F_SILVER')
    fire(96, ['P1', 'P5', 'P9'], 'P_LS')
    fire(99, ['F1', 'F2', 'F3'], 'F_CRACKLE', 0.35)
    fire(103, allp, 'P_MULTI')
    # 最后一朵上层到107秒结束；110秒起确实只剩前台。
    fire(113, ['F2'], 'F_SILVER')
    fire(118, ['F1', 'F3'], 'F_LIME')
    fire(123, ['F2'], 'F_GOLD')
    fire(127, ['F1', 'F2', 'F3'], 'F_SILVER', 0.3)
    # 最后一朵130秒灭，132秒重启上层。
    fire(137, ['P3', 'P5', 'P7'], 'P_MG')
    fire(135, ['F2'], 'F_LIME')
    fire(140, ['P1', 'P3', 'P5', 'P7', 'P9'], 'P_MULTI')
    fire(143, ['F1', 'F3'], 'F_SILVER')
    fire(148, allp, 'P_GREEN')
    fire(150, ['F1', 'F2', 'F3'], 'F_CRACKLE', 0.35)
    fire(154, ['P2', 'P5', 'P8'], 'P_LS')
    fire(157, ['F1', 'F2', 'F3'], 'F_GOLD', 0.3)
    fire(160, allp, 'P_MG')
    fire(163, ['F1', 'F2', 'F3'], 'F_CRACKLE', 0.25)

    fire(166, allp, 'P_MG')
    fire(168, ['F1', 'F2', 'F3'], 'F_GOLD', 0.3)
    fire(172, ['P1', 'P3', 'P5', 'P7', 'P9'], 'P_SPLIT')
    fire(175, ['F1', 'F2', 'F3'], 'F_CRACKLE', 0.3)
    fire(179, fanline, 'G_GOLD')
    fire(180, allp, 'P_LG')
    # 金帘187秒结束，白墙185秒已预发、190秒才开。
    for b in (190, 192, 194, 196):
        fire(b, allp, 'P_WALL')
    events.sort(key=lambda e: (e['launch'], e['point'], e['template']))
    for i, e in enumerate(events, 1):
        e['id'] = f'C{i:03}'
        e['phase'] = next(j for j, (a, b, _, _) in enumerate(phases)
                          if a <= e['burst'] < b)
    return dict(version='front-low-v1', duration=210,
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
        assert e['zone'] == t['zone'] == p['zone'], e
        assert 0 <= e['launch'] <= e['burst'] < e['end'] <= 210, e
        assert round(e['burst']-e['launch'], 2) == t['rise'], e
        if e['zone'] == 'front':
            assert e['template'].startswith('F_') and t['kind'] in ('small', 'comet'), e
            assert t['diameter'] <= 40 and t['top'] <= 145, e
            assert abs(p['x'])+t['diameter']/2+8 <= 100, e
            assert t['z']-t['diameter']/2-8 >= 50, e
            assert e['end'] < 179, e
    wall = [e for e in events if e['template']=='P_WALL']
    assert len(wall) == 36
    assert Counter(e['burst'] for e in wall) == {190:9, 192:9, 194:9, 196:9}
    assert not any(e['zone']=='dam' and e['launch'] < 132 and e['end'] > 110 for e in events)
    assert max(e['end'] for e in events) == 204
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
        w.writerow(['ID','段落','发射秒','开花秒','结束秒','点位','区域','子模板','花型','X_cm','Y_cm','发射Z_cm','开花Z_cm','直径_cm','包络顶部_cm'])
        for e in show['events']:
            t, p = show['templates'][e['template']], show['points'][e['point']]
            w.writerow([e['id'],show['phases'][e['phase']]['name'],e['launch'],e['burst'],e['end'],
                        e['point'],e['zone'],e['template'],t['name'],round(p['x']*100),round(p['y']*100),
                        p['z']*100,t['z']*100,t['diameter']*100,t['top']*100])
    print('PASS: 所有前台包络、区域白名单、时间、低位间奏、白墙36发及204秒熄灭检查通过')
    print('TOTAL',len(show['events']),dict(Counter(e['zone'] for e in show['events'])))
    for i, p in enumerate(show['phases']):
        es = [e for e in show['events'] if e['phase']==i]
        print(p['name'],dict(Counter(show['templates'][e['template']]['kind'] for e in es)),
              '前台',sum(e['zone']=='front' for e in es))


if __name__ == '__main__':
    main()
