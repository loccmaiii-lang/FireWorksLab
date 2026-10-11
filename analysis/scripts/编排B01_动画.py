#!/usr/bin/env python3
"""编排 B01 动画预览页（对话框22，2026-10-11）：把 B01 逻辑方案做成可播放的正面比例动画。

输入  协作/编排B01/逻辑方案.json、体检.json（analysis/scripts/编排B01.py 生成）
      analysis/music/汪洋与浩渺_分析.json（逐秒响度，只用来画能量条）
      analysis/templates/choreography-b01.html（页面模板；由原「候选A动画」页改来，布局和画法沿用）
输出  协作/编排B01/B01动画.html（单文件，数据内嵌；可直接用浏览器打开，也可发布成 Artifact）
用法  python3 -I analysis/scripts/编排B01_动画.py

画法：圆画在每条的开花时刻，径 = 大小（S 90 / M 150 / L 230）；开花前的竖线 = 升空尾缀，按这条在 B01 里的
起飞 → 开花时刻画；炸点高 = 固定子模板原生 +190 / +265 / +410 m 再加这条的高低错落 dz；扇形的扇角与出筒节奏是示意。
不是 UE 回放。
"""
import importlib.util
import json
import statistics
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('b01', ROOT / 'analysis/scripts/编排B01.py')
b01 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b01)

OUT = ROOT / '协作/编排B01'
LOGIC = json.loads((OUT / '逻辑方案.json').read_text(encoding='utf-8'))
CHECK = json.loads((OUT / '体检.json').read_text(encoding='utf-8'))
MUSIC = json.loads((ROOT / 'analysis/music/汪洋与浩渺_分析.json').read_text(encoding='utf-8'))
TEMPLATE = ROOT / 'analysis/templates/choreography-b01.html'

OFFSET = LOGIC['musicOffsetS']
DUR = LOGIC['duration']
BEAMS = {'R1': 1, 'R5': 5, 'R9': 9, 'R9R': 9, 'S5': 5, 'S9': 9, 'S13': 13}
TAIL_GPU = {'S': 6, 'M': 2, 'L': 6}
ROLE = {'倒计时': '铺垫', '开场高潮': '释放', '第一次抬升': '释放', '高潮 II': '释放', '终章': '释放', '低位密奏': '留白', '白色收束': '收束'}

RISKS = [
    'B 点上的球花（536 个事件）没在 UE 验证过；二排小银菊整排和高潮 II 的铺低层靠它。',
    '起爆高度用原资产，实际 +190 / +265 / +410 m，比宪章目标 +150 / +210 / +330 m 高约 25%。',
    '金垂柳用了 56 个（主角 5 + 终章金墙 51），同屏最多 32 个、每个 6 个 CPU 发射器，可能糊成一片金；主角是 230 m 原版，不是 280 m。',
    'GPU 预算是暂定模型；峰值 198 落在 162.5 s（全曲最响的一小节），最容易被截断。',
    '扇只有 B 点、只有银 / 红，金墙时刻没有扇铺底。',
    '可能偏满：129 个小节里只有 3 个空小节（41 / 65 / 96）。',
    '段落入口来自小节网格和响度分析，没试听；终章是不是主高潮要你听。',
    '手机档是机械规则（中档去最外两点、低档隔点留），没按手机画面单独设计。',
    '倒计时前 4 秒的红彗星单束是我加的预热，不喜欢就删。',
    '体检只能证明规则被遵守；像不像长冈要你用眼睛判断。',
]


def rgb(hexs):
    h = hexs.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def fmt_rgb(c):
    return ','.join(str(int(round(v))) for v in c)


def tail_rgb(c):
    return tuple(v + (a - v) * .55 for v, a in zip(c, (255, 244, 225)))


def main():
    cues, events = [], []
    per_sp = defaultdict(lambda: {'cues': 0, 'events': 0, 'rise': []})
    sec_ix = {s['id']: i for i, s in enumerate(LOGIC['sections'])}
    sec_cnt = defaultdict(lambda: {'cues': 0, 'events': 0})
    for c in LOGIC['cues']:
        med, low = set(c['profiles']['medium']), set(c['profiles']['low'])
        kind = 'fan' if c['size'] == 'F' else 'ball'
        tm = []
        for e in c['events']:
            m = 1 | (2 if e['point'] in med else 0) | (4 if e['point'] in low else 0)
            tm.append(m)
            events.append(dict(l=e['launch'], b=e['burst'], e=e['end'], g=e['point'][0], p=int(e['point'][1:]), sp=c['sp'], k=kind,
                               sz=c['size'], n=BEAMS.get(c['sp'], 0) if kind == 'fan' else 0, dz=e['dz'], tier=m, cue=c['id']))
            per_sp[c['sp']]['events'] += 1
            if kind == 'ball':
                per_sp[c['sp']]['rise'].append(e['burst'] - e['launch'])
        per_sp[c['sp']]['cues'] += 1
        sec_cnt[c['section']]['cues'] += 1
        sec_cnt[c['section']]['events'] += len(c['events'])
        bursts = [e['burst'] for e in c['events']]
        cues.append(dict(id=c['id'], t=round(min(bursts), 3), span=round(max(bursts) - min(bursts), 3), sp=c['sp'], sz=c['size'], k=kind,
                         label=c['label'], wave=c['wave'], layer=c['layer'], sec=sec_ix[c['section']],
                         pts=[e['point'] for e in c['events']], tm=tm))
    events.sort(key=lambda e: (e['l'], e['b']))
    cues.sort(key=lambda c: (c['t'], c['id']))

    species = {}
    for k, (tid, name, size, hexc, body_gpu) in b01.SPECIES.items():
        c = rgb(hexc)
        d = per_sp[k]
        alive = CHECK['aliveBySpecies'].get(k, {})
        species[k] = dict(name=name, sz=size, rgb=fmt_rgb(c), tail=fmt_rgb(tail_rgb(c)), cues=d['cues'], events=d['events'],
                          rise=round(statistics.median(d['rise']), 2) if d['rise'] else 0,
                          beams=BEAMS.get(k, 0),
                          gpu=(f"尾缀 {TAIL_GPU[size]} + 本体 {body_gpu}" if size != 'F' else ('银星 3 / 束' if k[0] == 'S' else '红彗星 1 / 束')),
                          peak=alive.get('peak'), peakAt=alive.get('peakAt'))

    secs = []
    for i, s in enumerate(LOGIC['sections']):
        start = 0.0 if i == 0 else s['start']
        end = LOGIC['sections'][i + 1]['start'] if i + 1 < len(LOGIC['sections']) else DUR
        secs.append(dict(id=s['id'], name=s['name'], role=ROLE.get(s['name'], '推进'), bar0=s['bar0'], bar1=s['bar1'], showStartS=round(start, 3), showEndS=round(end, 3),
                         musicStartS=round(start - OFFSET, 3), musicEndS=round(end - OFFSET, 3), lead=s['lead'], relay=s['relay'], accent=s['accent'], note=s['note'],
                         cues=sec_cnt[s['id']]['cues'], events=sec_cnt[s['id']]['events']))

    anchors = {}
    user = {10.0: ('0 点 · 开场高潮', '用户给定', '倒计时归零；音乐第 3 小节强拍'), 112.2: ('高潮 II 回归（用户 1:47）', '用户给定 + 检测', '静默一小节后回归的点，不是响度最高点')}
    for t, (label, src, note) in user.items():
        anchors[t] = dict(showS=t, musicS=round(t - OFFSET, 3), label=label, source=src, note=note)
    for t, label in ((110.6, '静默一小节'), (175.4, '⑧ 三主角垂柳墙'), (196.5, '终和弦 · 白墙')):
        anchors[t] = dict(showS=t, musicS=round(t - OFFSET, 3), label=label, source='小节网格 + 响度，待试听', note='')
    for s in secs[1:]:
        t = round(s['showStartS'], 1)
        if all(abs(t - k) > .35 for k in anchors):
            anchors[t] = dict(showS=t, musicS=round(t - OFFSET, 3), label=f"{s['name']}入口", source='小节网格 + 响度，待试听', note='')
    anchors = [anchors[k] for k in sorted(anchors)]

    energy = [dict(m=p['musicS'], db=p['rmsDb']) for p in MUSIC['perSecond']]
    pts = {'P': [dict(id=f'P{i}', x=b01.PT[f'P{i}']['x']) for i in range(9)], 'B': [dict(id=f'B{i}', x=b01.PT[f'B{i}']['x']) for i in range(8)]}
    data = dict(version='B01', offsetS=OFFSET, showDurationS=DUR, native=b01.REL_H, points=pts, sections=secs, anchors=anchors, energy=energy,
                species=species, cues=cues, events=events, risks=RISKS)
    html = TEMPLATE.read_text(encoding='utf-8').replace('__PREVIEW_DATA__', json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    assert '</script>' not in json.dumps(data, ensure_ascii=False)
    (OUT / 'B01动画.html').write_text(html, encoding='utf-8')
    print(f'B01动画.html  {len(html) / 1024:.0f} KB · {len(cues)} cue · {len(events)} 事件 · {len(secs)} 段 · {len(anchors)} 锚点')


if __name__ == '__main__':
    main()
