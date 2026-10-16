# -*- coding: utf-8 -*-
# 资源规范统一（26）：在 UE 编辑器当前地图里做临时测试（不存地图、不存资产）。
#   start(cfg)  ：放临时发射器（标签 RSU26_tmp_*），注册每帧回调，按 cfg['runs'] 逐轮激活、取动态包围盒、到点冻结粒子换机位截图。
#   status()    ：回进度和测量结果。
#   cleanup()   ：注销回调、解冻、删掉 RSU26_tmp_* 发射器、清调试线、机位还原。
# 本文件由 写入/rep_test.mjs、measure.mjs 读出来整段发给 UE 执行，末尾拼一行调用。
import unreal, json, math, sys, types

PREFIX = 'RSU26_tmp_'


def _st():
    m = sys.modules.get('rsu26_state')
    if m is None:
        m = types.ModuleType('rsu26_state')
        m.d = {}
        sys.modules['rsu26_state'] = m
    return m.d


def _world():
    return unreal.EditorLevelLibrary.get_editor_world()


def _console(c):
    unreal.SystemLibrary.execute_console_command(_world(), c)


def _vec(a):
    return unreal.Vector(float(a[0]), float(a[1]), float(a[2]))


def _rot(p, y, r):
    return unreal.Rotator(roll=float(r), pitch=float(p), yaw=float(y))


def _flat(x):
    if isinstance(x, (tuple, list)):
        out = []
        for i in x:
            out += _flat(i)
        return out
    return [x]


def _cam_now():
    r = _flat(unreal.EditorLevelLibrary.get_level_viewport_camera_info())
    loc = [v for v in r if isinstance(v, unreal.Vector)]
    rot = [v for v in r if isinstance(v, unreal.Rotator)]
    if not loc or not rot:
        return None
    return [[loc[0].x, loc[0].y, loc[0].z], [rot[0].pitch, rot[0].yaw, rot[0].roll]]


def _set_cam(loc, prr):
    unreal.EditorLevelLibrary.set_level_viewport_camera_info(_vec(loc), _rot(prr[0], prr[1], prr[2]))


def _tmp_actors():
    return [a for a in unreal.EditorLevelLibrary.get_all_level_actors() if a.get_actor_label().startswith(PREFIX)]


def _bounds(comp):
    r = _flat(unreal.SystemLibrary.get_component_bounds(comp))
    vs = [v for v in r if isinstance(v, unreal.Vector)]
    return vs[0], vs[1]


def start(cfg):
    st = _st()
    if st.get('running'):
        raise RuntimeError('previous run still running, cleanup() first')
    if _tmp_actors():
        raise RuntimeError('RSU26_tmp_ actors still in level, cleanup() first')
    st.clear()
    st.update({'cfg': cfg, 'cam0': _cam_now(), 'running': False, 'done': False, 'error': None, 'frames': 0, 'wall': 0.0,
               'ri': 0, 't': 0.0, 'frozen': False, 'fwait': 0, 'queue': [], 'shots': [], 'actors': {}, 'meas': {}, 'notes': []})
    for a in cfg['actors']:
        ps = unreal.load_asset(a['system'].split('.')[0])
        if ps is None:
            raise RuntimeError('cannot load ' + a['system'])
        act = unreal.EditorLevelLibrary.spawn_actor_from_object(ps, _vec(a['loc']), _rot(a.get('pitch', 0), 0, a.get('roll', 0)))
        act.set_actor_label(PREFIX + a['key'])
        act.set_actor_scale3d(_vec([a['s']] * 3))
        comp = act.get_component_by_class(unreal.ParticleSystemComponent)
        try:
            comp.set_editor_property('override_lod_method', True)
            comp.set_editor_property('lod_method', unreal.ParticleSystemLODMethod.PARTICLESYSTEMLODMETHOD_DIRECT_SET)
        except Exception as e:
            st['notes'].append('LOD fix failed %s: %r' % (str(a['key']), e))
        comp.deactivate()
        st['actors'][a['key']] = {'actor': act, 'comp': comp, 'loc': a['loc'], 's': a['s']}
        st['meas'][a['key']] = {'min': None, 'max': None, 'n': 0, 'activeN': 0, 'series': [], 'lastT': -1.0}
    runs = []
    for r in cfg['runs']:
        r = dict(r)
        r['shots'] = sorted([dict(x) for x in r.get('shots', [])], key=lambda x: x['t'])
        r['_started'] = False
        runs.append(r)
    st['runs'] = runs
    _console('FX.FreezeParticleSimulation 0')
    st['handle'] = unreal.register_slate_post_tick_callback(_tick)
    st['running'] = True
    return {'actors': len(st['actors']), 'runs': len(runs), 'cam0': st['cam0'], 'notes': st['notes']}


def _tick(dt):
    st = _st()
    if not st.get('running'):
        return
    try:
        _step(dt)
    except Exception as e:
        st['error'] = repr(e)
        st['running'] = False
        try:
            _console('FX.FreezeParticleSimulation 0')
        except Exception:
            pass


def _sample(run, t):
    st = _st()
    for k in run['actors']:
        a = st['actors'][k]
        m = st['meas'][k]
        comp = a['comp']
        if not comp.is_active():
            continue
        o, e = _bounds(comp)
        lo = [o.x - e.x - a['loc'][0], o.y - e.y - a['loc'][1], o.z - e.z - a['loc'][2]]
        hi = [o.x + e.x - a['loc'][0], o.y + e.y - a['loc'][1], o.z + e.z - a['loc'][2]]
        m['activeN'] += 1
        if max(e.x, e.y, e.z) < 2.0:
            continue
        m['n'] += 1
        m['min'] = lo if m['min'] is None else [min(m['min'][i], lo[i]) for i in range(3)]
        m['max'] = hi if m['max'] is None else [max(m['max'][i], hi[i]) for i in range(3)]
        if t - m['lastT'] >= 0.25:
            m['lastT'] = t
            m['series'].append([round(t, 2)] + [round(x) for x in lo + hi])


def _step(dt):
    st = _st()
    st['frames'] += 1
    st['wall'] += dt
    if st['frozen']:
        st['fwait'] -= 1
        if st['fwait'] > 0:
            return
        if st['queue']:
            act = st['queue'].pop(0)
            if act[0] == 'cam':
                _set_cam(act[1], act[2])
                st['fwait'] = 3
            else:
                _console('HighResShot %s filename=%s' % (st['cfg'].get('res', '1280x720'), act[1]))
                st['shots'].append({'file': act[1], 'run': st['runs'][st['ri']]['id'], 't': round(st['t'], 2), 'cam': act[2]})
                st['fwait'] = 5
            return
        _console('FX.FreezeParticleSimulation 0')
        st['frozen'] = False
        return
    if st['ri'] >= len(st['runs']):
        st['running'] = False
        st['done'] = True
        return
    run = st['runs'][st['ri']]
    if not run['_started']:
        unreal.SystemLibrary.flush_persistent_debug_lines(_world())
        for b in run.get('boxes', []):
            unreal.SystemLibrary.draw_debug_box(_world(), _vec(b['center']), _vec(b['extent']), unreal.LinearColor(*b.get('color', [0, 1, 0, 1])),
                                                _rot(b.get('pitch', 0), 0, b.get('roll', 0)), 9999.0, float(b.get('thickness', 0)))
        if run.get('cam'):
            _set_cam(run['cam'][0], run['cam'][1])
        for k in run['actors']:
            st['actors'][k]['comp'].activate(True)
        run['_started'] = True
        st['t'] = 0.0
        return
    st['t'] += dt
    t = st['t']
    _sample(run, t)
    if run['shots'] and t >= run['shots'][0]['t']:
        sh = run['shots'].pop(0)
        _console('FX.FreezeParticleSimulation 1')
        st['frozen'] = True
        st['fwait'] = 2
        for c in sh['cams']:
            st['queue'].append(('cam', c['loc'], c['rot']))
            st['queue'].append(('shot', sh['dir'] + '/' + run['id'] + '_t%04.1f_' % sh['t'] + c['name'] + '.png', c['name']))
        return
    if t >= run['dur'] and not run['shots']:
        for k in run['actors']:
            try:
                st['actors'][k]['comp'].deactivate()
            except Exception:
                pass
        st['ri'] += 1


def status(full=False):
    st = _st()
    out = {k: st.get(k) for k in ('running', 'done', 'error', 'frames', 'ri', 'notes')}
    out['wall'] = round(st.get('wall', 0.0), 2)
    out['t'] = round(st.get('t', 0.0), 2)
    out['shots'] = len(st.get('shots', []))
    out['runs'] = len(st.get('runs', []))
    if full:
        out['shotList'] = st.get('shots', [])
        out['meas'] = st.get('meas', {})
    return out


def dump(path):
    st = _st()
    out = status(True)
    out['cam0'] = st.get('cam0')
    with open(path, 'w') as f:
        json.dump(out, f)
    return {'written': path, 'running': out['running'], 'done': out['done'], 'error': out['error'], 'shots': out['shots']}


def cleanup():
    st = _st()
    out = {'removed': 0}
    h = st.get('handle')
    if h is not None:
        try:
            unreal.unregister_slate_post_tick_callback(h)
        except Exception as e:
            out['unregisterError'] = repr(e)
        st['handle'] = None
    st['running'] = False
    _console('FX.FreezeParticleSimulation 0')
    for a in _tmp_actors():
        unreal.EditorLevelLibrary.destroy_actor(a)
        out['removed'] += 1
    unreal.SystemLibrary.flush_persistent_debug_lines(_world())
    if st.get('cam0'):
        _set_cam(st['cam0'][0], st['cam0'][1])
        out['camRestored'] = st['cam0']
    out['left'] = len(_tmp_actors())
    return out
