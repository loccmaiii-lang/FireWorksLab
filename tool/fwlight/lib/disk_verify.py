# -*- coding: utf-8 -*-
"""
不经过编辑器，直接解析磁盘上的 .uasset，确认 keys 文件里的曲线已经落盘到「指定那盏灯」。

引用链（本项目定制 UE4.24 的保存格式，均为带标签属性）：
  MovieScene
    ├─ Possessables[]   : Guid / Name / ParentGuid       -> 组件绑定 LightComponent0 的 ParentGuid 指向灯 Actor 绑定
    └─ ObjectBindings[] : ObjectGuid / Tracks[](导出索引)
  MovieSceneFloatTrack / MovieSceneColorTrack : PropertyName, Sections[](导出索引)
  MovieSceneFloatSection.FloatCurve / MovieSceneColorSection.Red|Green|Blue|AlphaCurve  (StructProperty MovieSceneFloatChannel)
    ├─ Times  : ArrayProperty<FrameNumber>            int32 tick
    ├─ Values : ArrayProperty<MovieSceneFloatValue>   每元素首 4 字节为 float Value
    └─ DefaultValue / bHasDefaultValue / TickResolution
"""
import struct

from .uepkg import Pkg, R


def _channel(p, t):
    sub, _ = p.props(t['val_off'], t['val_off'] + t['size'])
    d = {x['name']: x for x in sub}
    times, vals = [], []
    if 'Times' in d:
        r = R(p.b, d['Times']['val_off'])
        n = r.i32()
        p.read_tag(r)
        times = list(struct.unpack_from('<%di' % n, p.b, r.p))
    if 'Values' in d:
        r = R(p.b, d['Values']['val_off'])
        n = r.i32()
        it = p.read_tag(r)
        per = it['size'] // max(n, 1)
        vals = [struct.unpack_from('<f', p.b, r.p + q * per)[0] for q in range(n)]
    has_def = bool(d['bHasDefaultValue']['bool']) if 'bHasDefaultValue' in d else None
    return dict(times=times, values=vals, has_default=has_def,
                default=p.decode(d['DefaultValue']) if 'DefaultValue' in d else None)


def _array_structs(p, t):
    r = R(p.b, t['val_off'])
    n = r.i32()
    p.read_tag(r)
    pos, end, out = r.p, t['val_off'] + t['size'], []
    for _ in range(n):
        sub, pos2 = p.props(pos, end)
        out.append({x['name']: x for x in sub})
        pos = pos2
    return out


def _obj_array(p, t):
    r = R(p.b, t['val_off'])
    n = r.i32()
    return [r.i32() for _ in range(n)]


def read_bound_channels(path):
    """返回 {(灯绑定名, 组件绑定名): {'Intensity': {'FloatCurve': ch}, 'LightColor': {'RedCurve': ch, ...}}}"""
    p = Pkg(path)
    ms = [i for i, e in enumerate(p.exports) if p.classname(e) == 'MovieScene']
    if not ms:
        raise RuntimeError('文件中没有 MovieScene 导出: %s' % path)
    e = p.exports[ms[0]]
    props = {t['name']: t for t in p.props(e['offset'], e['offset'] + e['size'])[0]}
    poss = {}
    for d in _array_structs(p, props['Possessables']):
        name = R(p.b, d['Name']['val_off']).fstr()
        poss[d['Guid']['raw'][:16]] = dict(name=name, parent=d['ParentGuid']['raw'][:16] if 'ParentGuid' in d else b'\0' * 16)
    out = {}
    for d in _array_structs(p, props['ObjectBindings']):
        g = d['ObjectGuid']['raw'][:16]
        me = poss.get(g)
        if me is None:
            continue
        parent = poss.get(me['parent'], {}).get('name', '')
        tracks = {}
        for ti in (_obj_array(p, d['Tracks']) if 'Tracks' in d else []):
            if ti <= 0:
                continue
            te = p.exports[ti - 1]
            tp = {t['name']: t for t in p.props(te['offset'], te['offset'] + te['size'])[0]}
            pname = p.decode(tp['PropertyName']) if 'PropertyName' in tp else p.classname(te)
            secs = _obj_array(p, tp['Sections']) if 'Sections' in tp else []
            if not secs:
                continue
            se = p.exports[secs[0] - 1]
            chans = {}
            for t in p.props(se['offset'], se['offset'] + se['size'])[0]:
                if t.get('struct') == 'MovieSceneFloatChannel':
                    chans[t['name']] = _channel(p, t)
            tracks[pname] = chans
        out[(parent, me['name'])] = tracks
    return out


def verify(path, keys, tick_resolution, binding, component='LightComponent0'):
    tick_per_frame = tick_resolution / float(keys.get('fps', 30))
    bound = read_bound_channels(path)
    tracks = bound.get((binding, component))
    if tracks is None:
        raise RuntimeError('磁盘文件中找不到绑定 %s/%s（现有: %s）' % (binding, component, sorted(bound)))
    want = [('Intensity', 'Intensity', 'FloatCurve', keys['intensity'])]
    for nm, curve in (('R', 'RedCurve'), ('G', 'GreenCurve'), ('B', 'BlueCurve'), ('A', 'AlphaCurve')):
        want.append(('Color.' + nm, 'LightColor', curve, keys['color'][nm]))
    report = []
    for label, track, curve, spec in want:
        ch = tracks.get(track, {}).get(curve)
        exp_t = [int(round((row[0] + (row[2] if len(row) > 2 else 0.0)) * tick_per_frame)) for row in spec['keys']]
        exp_v = [row[1] for row in spec['keys']]
        if ch is None:
            report.append(dict(channel=label, keys=len(exp_t), disk_keys=None, ok=False, note='磁盘中没有该轨道/通道'))
            continue
        same_t = ch['times'] == exp_t
        err = max([abs(a - b) for a, b in zip(ch['values'], exp_v)] or [0.0]) if len(ch['values']) == len(exp_v) else float('inf')
        tol = max(1e-3, 1e-6 * max([abs(v) for v in exp_v] or [0.0]))
        report.append(dict(channel=label, keys=len(exp_t), disk_keys=len(ch['times']), times_equal=same_t,
                           max_err=err, ok=same_t and err <= tol))
    return report
