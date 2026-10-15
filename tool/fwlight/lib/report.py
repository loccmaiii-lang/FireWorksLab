# -*- coding: utf-8 -*-
"""生成单灯光照分析 HTML（离线单文件，可直接发给美术/策划看）。"""
import math
import os
import time
from collections import Counter

from . import common
from .light_model import lin_hex


def _short(name):
    parts = [p.strip() for p in name.split('·')]
    return parts[1] if len(parts) > 1 else name


def compare_curve(inspect_json, binding, component='LightComponent0'):
    """从 inspect 结果里取某盏灯的 Intensity 关键帧，作为对比曲线。"""
    if not inspect_json or not os.path.exists(inspect_json):
        return []
    insp = common.read_json(inspect_json)
    for b in insp.get('bindings', []):
        if b['name'] == component and b['parent'] == binding:
            for t in b['tracks']:
                if t.get('prop_name') == 'Intensity':
                    ch = t['sections'][0]['channels'][0]
                    fps = insp.get('display_rate', [30, 1])[0]
                    return [[round((k['t'][0] + k['t'][1]) / fps, 2), round(k['v'], 1)] for k in ch.get('keys', [])]
    return []


def build_report(R, keys, cfg, out_path, compare_json=None, compare_label=''):
    m = R['params']
    FPS = m['fps']
    I, cols, nF, S = R['I'], R['cols'], R['nF'], R['S']
    doc, tpl = R['doc'], R['tpl']
    # curve_from 的灯（如 SkyLight）：强度按 keys 里记录的线性变换显示
    sc = keys.get('meta', {}).get('intensity_scale', 1.0)
    of = keys.get('meta', {}).get('intensity_offset', 0.0)
    if sc != 1.0 or of != 0.0:
        I = [v * sc + of for v in I]
    nd = 1 if max(I) > 50 else 4

    samples = [[round(f / FPS, 2), round(max(I[f:f + 3]), nd), lin_hex(cols[f])] for f in range(0, nF, 3)]

    secs = []
    for s in doc['sections']:
        a, e = int(s['start'] * FPS), min(nF, int(s['end'] * FPS))
        seg = I[a:e] or [0.0]
        wsum = sum(S[a:e]) or 1
        c = [sum(S[f] * cols[f][k] for f in range(a, e)) / wsum for k in range(3)]
        mx = max(c) or 1
        c = [x / mx for x in c]
        evs = [ev for ev in R['events'] if s['start'] <= ev['effectiveBurst'] < s['end']]
        cnt = Counter(_short(tpl[ev['templateId']]['name']) for ev in evs)
        secs.append(dict(name=s['name'].split('｜')[-1], start=s['start'], end=s['end'],
                         mean=round(sum(seg) / len(seg), nd if nd > 1 else None), peak=round(max(seg), nd if nd > 1 else None),
                         dark=round(100.0 * sum(1 for v in seg if v < 60 * sc) / len(seg)),
                         color=lin_hex(c), n=len(evs),
                         large=sum(1 for ev in evs if tpl[ev['templateId']]['kind'] == 'large'),
                         top='、'.join('%s×%d' % kv for kv in cnt.most_common(3)), detail=s.get('detail', '')))

    peaks, used = [], []
    for f in sorted(range(nF), key=lambda f: -I[f]):
        if all(abs(f - u) > FPS * 4 for u in used):
            used.append(f)
            t = f / FPS
            near = [ev for ev in R['events'] if abs(ev['effectiveBurst'] - t) < 0.35]
            cc = Counter(_short(tpl[ev['templateId']]['name']) for ev in near)
            peaks.append(dict(t=round(t, 2), v=round(I[f], nd if nd > 1 else None), color=lin_hex(cols[f]), shells=len(near),
                              what='、'.join('%s×%d' % kv for kv in cc.most_common(3))))
        if len(peaks) >= 8:
            break
    peaks.sort(key=lambda p: p['t'])

    L = R['light_pos']
    pw = []
    for pid in sorted([p for p in R['pts'] if p.startswith('P')], key=lambda x: int(x[1:]) if x[1:].isdigit() else 99):
        x, y, z = R['pts'][pid]
        dx, dy, dz = (x - L[0]) / 100, (y - L[1]) / 100, (z + 21000 - L[2]) / 100
        rr = math.sqrt(dx * dx + dy * dy + dz * dz)
        pw.append([pid, round(rr), m['r0_m'] ** 2 / (m['r0_m'] ** 2 + rr * rr)])
    wmax = max(p[2] for p in pw) if pw else 1
    for p in pw:
        p.append(round(p[2] / wmax, 2))
        p[2] = round(p[2], 3)

    old = compare_curve(compare_json, keys['binding'], keys.get('component', 'LightComponent0')) if compare_json else []
    data = dict(samples=samples, old=old, secs=secs, peaks=peaks, pw=pw,
                nI=len(keys['intensity']['keys']), nC=len(keys['color']['R']['keys']),
                events=len(R['events']), dur=doc['meta'].get('duration', nF / FPS),
                ipeak=m['i_peak'], gamma=m['gamma'], r0=m['r0_m'], sizeexp=m['size_exp'],
                light_pos=[round(v) for v in L], params=m)

    import json
    tpl_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'report_template.html')
    html = open(tpl_path, encoding='utf-8').read()
    rep = {
        '__DATA__': json.dumps(data, ensure_ascii=False),
        '__LIGHT__': keys.get('light', R['light']),
        '__SHOW__': doc['meta'].get('name', ''),
        '__SEQ__': cfg['ue']['sequence_asset'].split('/')[-1],
        '__TIME__': time.strftime('%Y-%m-%d %H:%M'),
        '__CMP__': compare_label or (os.path.basename(compare_json) if compare_json else ''),
        '__PLATFORM__': 'PC（排除 mobile=only）' if cfg['show'].get('platform', 'pc') == 'pc' else '手游（排除 mobile=False）',
        '__OFFSET__': str(cfg['show'].get('time_offset_s', 0.0)),
        '__ITOL__': '%.1f%%' % (m['int_tol'] * 100),
        '__CTOL__': str(m['col_tol']),
    }
    for k, v in rep.items():
        html = html.replace(k, v)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html)
    return dict(secs=secs, peaks=peaks, pw=pw)
