# -*- coding: utf-8 -*-
# 网格垂柳 · UE 端脚本（由 run.mjs 整段经 GPUECli ExecutePythonCommandEx 发给 UE，末尾拼一行调用）。
# 只在沙盒目录建资产，不保存任何资产 / 地图；临时发射器标签 MESHWILLOW_tmp_*，cleanup 删掉。
# 截图流程照资源规范统一（26）的 rsu26_ue.py（已在本机 UE 跑通）：每帧回调、到点冻结粒子、换机位 HighResShot。
import unreal, json, sys, types

PREFIX = 'MESHWILLOW_tmp_'


def _st():
    m = sys.modules.get('meshwillow_state')
    if m is None:
        m = types.ModuleType('meshwillow_state'); m.d = {}; sys.modules['meshwillow_state'] = m
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


# ---------- 资产 ----------
def _mesh_task(fn, dst, name):
    t = unreal.AssetImportTask()
    t.set_editor_property('filename', fn); t.set_editor_property('destination_path', dst); t.set_editor_property('destination_name', name)
    t.set_editor_property('automated', True); t.set_editor_property('replace_existing', True); t.set_editor_property('save', False)
    ui = unreal.FbxImportUI()
    ui.set_editor_property('import_mesh', True); ui.set_editor_property('import_as_skeletal', False)
    ui.set_editor_property('import_materials', False); ui.set_editor_property('import_textures', False); ui.set_editor_property('import_animations', False)
    ui.set_editor_property('mesh_type_to_import', unreal.FBXImportType.FBXIT_STATIC_MESH)
    d = ui.get_editor_property('static_mesh_import_data')
    for k, v in (('combine_meshes', True), ('auto_generate_collision', False), ('generate_lightmap_u_vs', False), ('remove_degenerates', True),
                 ('import_uniform_scale', 1.0), ('convert_scene', True), ('force_front_x_axis', False), ('convert_scene_unit', False)):
        try:
            d.set_editor_property(k, v)
        except Exception:
            pass
    t.set_editor_property('options', ui)
    return t


def import_all(cfg):
    """cfg: {sandbox, meshes:[[file,name]], strip:[file,name]}；返回每个资产的路径、顶点数、包围盒。不保存。"""
    dst = cfg['sandbox']
    tasks = [_mesh_task(f, dst, n) for f, n in cfg['meshes']]
    tt = unreal.AssetImportTask()
    tt.set_editor_property('filename', cfg['strip'][0]); tt.set_editor_property('destination_path', dst); tt.set_editor_property('destination_name', cfg['strip'][1])
    tt.set_editor_property('automated', True); tt.set_editor_property('replace_existing', True); tt.set_editor_property('save', False)
    tasks.append(tt)
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks(tasks)
    out = {'meshes': {}, 'notes': []}
    for f, n in cfg['meshes']:
        p = dst + '/' + n
        m = unreal.load_asset(p)
        if not isinstance(m, unreal.StaticMesh):
            out['meshes'][n] = None; continue
        bb = m.get_bounding_box()
        out['meshes'][n] = {'path': p, 'verts': unreal.EditorStaticMeshLibrary.get_number_verts(m, 0),
                            'min': [bb.min.x, bb.min.y, bb.min.z], 'max': [bb.max.x, bb.max.y, bb.max.z]}
        try:
            unreal.EditorStaticMeshLibrary.set_generate_lightmap_uv(m, False)
        except Exception as e:
            out['notes'].append('lightmapUV %s: %r' % (n, e))
    tex = unreal.load_asset(dst + '/' + cfg['strip'][1])
    if isinstance(tex, unreal.Texture2D):
        for k, v in (('compression_settings', unreal.TextureCompressionSettings.TC_BC7), ('srgb', True),
                     ('address_x', unreal.TextureAddress.TA_CLAMP), ('address_y', unreal.TextureAddress.TA_CLAMP),
                     ('lod_group', unreal.TextureGroup.TEXTUREGROUP_EFFECTS)):
            tex.set_editor_property(k, v)
        out['strip'] = {'path': dst + '/' + cfg['strip'][1], 'w': tex.blueprint_get_size_x(), 'h': tex.blueprint_get_size_y(), 'srgb': tex.get_editor_property('srgb')}
    else:
        out['strip'] = None
    return out


def make_assets(cfg):
    """复制材质实例和粒子系统到沙盒（不保存），材质实例换贴图 / 透明通道。"""
    out = {'notes': []}
    eal, mel = unreal.EditorAssetLibrary, unreal.MaterialEditingLibrary
    mi_dst = cfg['sandbox'] + '/' + cfg['mi']
    if not eal.does_asset_exist(mi_dst):
        eal.duplicate_asset(cfg['mi_src'], mi_dst)
    mi = unreal.load_asset(mi_dst)
    tex = unreal.load_asset(cfg['sandbox'] + '/' + cfg['strip'])
    mel.set_material_instance_texture_parameter_value(mi, 'MainTex', tex)
    mel.set_material_instance_vector_parameter_value(mi, 'AlphaChannel', unreal.LinearColor(0, 0, 0, 1))
    mel.set_material_instance_vector_parameter_value(mi, 'UVParam', unreal.LinearColor(1, 1, 0, 0))
    mel.set_material_instance_vector_parameter_value(mi, 'UVIncrementChannel', unreal.LinearColor(0, 1, 0, 0))
    mel.set_material_instance_vector_parameter_value(mi, 'MultiColor', unreal.LinearColor(1, 1, 1, 1))
    mel.update_material_instance(mi)
    out['mi'] = {'path': mi_dst, 'MainTex': str(mel.get_material_instance_texture_parameter_value(mi, 'MainTex').get_path_name()),
                 'AlphaChannel': str(mel.get_material_instance_vector_parameter_value(mi, 'AlphaChannel'))}
    out['ps'] = {}
    for name in cfg['ps']:
        dst = cfg['sandbox'] + '/' + name
        if not eal.does_asset_exist(dst):
            eal.duplicate_asset(cfg['ps_src'], dst)
        out['ps'][name] = dst + '.' + name
    return out


def remove_assets(cfg):
    """删掉沙盒里本次建的资产（都没保存过）。"""
    out = []
    for n in cfg['names']:
        p = cfg['sandbox'] + '/' + n
        if unreal.EditorAssetLibrary.does_asset_exist(p):
            out.append([n, bool(unreal.EditorAssetLibrary.delete_asset(p))])
    return out


# ---------- 临时测试（照 rsu26_ue.py） ----------
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


def start(cfg):
    st = _st()
    if st.get('running'):
        raise RuntimeError('previous run still running, cleanup() first')
    if _tmp_actors():
        raise RuntimeError('MESHWILLOW_tmp_ actors still in level, cleanup() first')
    st.clear()
    st.update({'cfg': cfg, 'cam0': _cam_now(), 'running': False, 'done': False, 'error': None, 'frames': 0, 'wall': 0.0,
               'ri': 0, 't': 0.0, 'frozen': False, 'fwait': 0, 'queue': [], 'shots': [], 'actors': {}, 'notes': []})
    for a in cfg['actors']:
        ps = unreal.load_asset(a['system'].split('.')[0])
        if ps is None:
            raise RuntimeError('cannot load ' + a['system'])
        act = unreal.EditorLevelLibrary.spawn_actor_from_object(ps, _vec(a['loc']), _rot(0, a.get('yaw', 0), 0))
        act.set_actor_label(PREFIX + a['key'])
        comp = act.get_component_by_class(unreal.ParticleSystemComponent)
        try:
            comp.set_editor_property('override_lod_method', True)
            comp.set_editor_property('lod_method', unreal.ParticleSystemLODMethod.PARTICLESYSTEMLODMETHOD_DIRECT_SET)
        except Exception as e:
            st['notes'].append('LOD fix failed %s: %r' % (a['key'], e))
        comp.deactivate()
        st['actors'][a['key']] = {'actor': act, 'comp': comp}
    runs = []
    for r in cfg['runs']:
        r = dict(r); r['shots'] = sorted([dict(x) for x in r.get('shots', [])], key=lambda x: x['t']); r['_started'] = False; runs.append(r)
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
        st['error'] = repr(e); st['running'] = False
        try:
            _console('FX.FreezeParticleSimulation 0')
        except Exception:
            pass


def _step(dt):
    st = _st()
    st['frames'] += 1; st['wall'] += dt
    if st['frozen']:
        st['fwait'] -= 1
        if st['fwait'] > 0:
            return
        if st['queue']:
            act = st['queue'].pop(0)
            if act[0] == 'cam':
                _set_cam(act[1], act[2]); st['fwait'] = 3
            else:
                _console('HighResShot %s filename=%s' % (st['cfg'].get('res', '1280x720'), act[1]))
                st['shots'].append({'file': act[1], 'run': st['runs'][st['ri']]['id'], 't': round(st['t'], 2), 'cam': act[2]}); st['fwait'] = 5
            return
        _console('FX.FreezeParticleSimulation 0'); st['frozen'] = False
        return
    if st['ri'] >= len(st['runs']):
        st['running'] = False; st['done'] = True
        return
    run = st['runs'][st['ri']]
    if not run['_started']:
        if run.get('cam'):
            _set_cam(run['cam'][0], run['cam'][1])
        for k in run['actors']:
            st['actors'][k]['comp'].activate(True)
        run['_started'] = True; st['t'] = 0.0
        return
    st['t'] += dt
    t = st['t']
    if run['shots'] and t >= run['shots'][0]['t']:
        sh = run['shots'].pop(0)
        _console('FX.FreezeParticleSimulation 1'); st['frozen'] = True; st['fwait'] = 2
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
    out['wall'] = round(st.get('wall', 0.0), 2); out['t'] = round(st.get('t', 0.0), 2)
    out['shots'] = len(st.get('shots', [])); out['runs'] = len(st.get('runs', []))
    if full:
        out['shotList'] = st.get('shots', [])
    return out


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
        unreal.EditorLevelLibrary.destroy_actor(a); out['removed'] += 1
    if st.get('cam0'):
        _set_cam(st['cam0'][0], st['cam0'][1]); out['camRestored'] = st['cam0']
    out['left'] = len(_tmp_actors())
    return out
