# -*- coding: utf-8 -*-
# 在 UE4.24 编辑器内运行（Python 2.7）。只读：导出 Level Sequence 的绑定/轨道/关键帧到 JSON。
# 用法（由 fwlight.py 自动调用）:  py "<本文件>" "<job.json>"
#   job = {"sequence_asset": "/Game/...", "out": "<结果.json>", "full_keys": true}
from __future__ import print_function
import io
import json
import sys

import unreal


def u(x):
    """Py2 安全转字符串（FText/FName 可能含中文）。"""
    try:
        return unicode(x)
    except Exception:
        try:
            return str(x).decode('utf-8', 'replace')
        except Exception:
            return repr(x)


def main(job_path):
    job = json.load(io.open(job_path, encoding='utf-8'))
    res = {'ok': False, 'job': job}
    try:
        seq = unreal.load_asset(job['sequence_asset'])
        if seq is None:
            raise RuntimeError('load_asset 失败: %s' % job['sequence_asset'])
        res['engine'] = unreal.SystemLibrary.get_engine_version()
        dr = seq.get_display_rate()
        tr = seq.get_tick_resolution()
        res['display_rate'] = [dr.numerator, dr.denominator]
        res['tick'] = [tr.numerator, tr.denominator]
        res['playback'] = [seq.get_playback_start(), seq.get_playback_end(),
                           seq.get_playback_start_seconds(), seq.get_playback_end_seconds()]
        pkg = seq.get_outermost().get_name()
        try:
            dirty = [p.get_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages()]
            res['dirty'] = pkg in dirty
        except Exception as e:
            res['dirty'] = 'unknown: %s' % e
        try:
            cur = unreal.LevelSequenceEditorBlueprintLibrary.get_current_level_sequence()
            res['open_in_sequencer'] = bool(cur is not None and cur.get_path_name() == seq.get_path_name())
        except Exception:
            res['open_in_sequencer'] = 'unknown'

        def dump_track(t):
            d = {'type': type(t).__name__, 'name': u(t.get_display_name())}
            for fn, key in (('get_property_name', 'prop_name'), ('get_property_path', 'prop_path')):
                try:
                    d[key] = u(getattr(t, fn)())
                except Exception:
                    pass
            d['sections'] = []
            for s in t.get_sections():
                sd = {'type': type(s).__name__, 'channels': []}
                for c in s.get_channels():
                    cd = {'name': c.get_name(), 'type': type(c).__name__}
                    try:
                        cd['default'] = c.get_default() if c.has_default() else None
                    except Exception:
                        cd['default'] = None
                    ks = c.get_keys()
                    cd['nkeys'] = len(ks)
                    if job.get('full_keys', True):
                        kl = []
                        for k in ks:
                            tm = k.get_time()
                            kd = {'t': [tm.frame_number.value, tm.sub_frame], 'v': k.get_value()}
                            for fn in ('get_interpolation_mode', 'get_tangent_mode', 'get_arrive_tangent', 'get_leave_tangent'):
                                try:
                                    kd[fn] = u(getattr(k, fn)())
                                except Exception:
                                    pass
                            kl.append(kd)
                        cd['keys'] = kl
                    sd['channels'].append(cd)
                d['sections'].append(sd)
            return d

        res['master'] = [dump_track(t) for t in seq.get_master_tracks()]
        res['bindings'] = []
        for b in seq.get_bindings():
            p = b.get_parent()
            bd = {'name': b.get_name(), 'id': u(b.get_id()), 'parent': p.get_name() if p else '',
                  'tracks': [dump_track(t) for t in b.get_tracks()]}
            try:
                bd['class'] = b.get_possessed_object_class().get_name()
            except Exception:
                pass
            res['bindings'].append(bd)
        res['ok'] = True
    except Exception as e:
        import traceback
        res['error'] = traceback.format_exc()
    with io.open(job['out'], 'w', encoding='utf-8') as f:
        f.write(unicode(json.dumps(res, indent=1, ensure_ascii=True)))
    print('inspect ok=%s bindings=%d' % (res['ok'], len(res.get('bindings', []))))


main(sys.argv[1])
