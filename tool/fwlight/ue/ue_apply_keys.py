# -*- coding: utf-8 -*-
# 在 UE4.24 编辑器内运行（Python 2.7）。
# 把 fwlight.keys/2 格式的关键帧写进 <binding>/LightComponent0 的 Intensity 与 LightColor 轨道。
# 用法（由 fwlight.py 自动调用）:  py "<本文件>" "<job.json>"
#   job = {
#     "sequence_asset": "/Game/...",   "binding": "SpotLight2",   "component": "LightComponent0",
#     "keys": "<keys.json>",
#     "out": "<结果.json>",  "save": true,  "force": false,  "reopen_sequencer": true
#   }
# 行为：
#   1. 若序列包已有未保存修改且 force=false -> 不做任何修改，直接报错退出（避免把别人的半成品一起存盘）
#   2. 在一个 Undo 事务里清空并重写 Intensity / LightColor(R,G,B,A) 关键帧与默认值
#   3. 读回逐键比对；比对失败则不保存
#   4. 若该序列正在 Sequencer 中打开，关闭后重开（刷新曲线显示），保持当前播放头
#   5. save=true 时保存资产
from __future__ import print_function
import io
import json
import sys
import time

import unreal

INTERP = {
    'linear': unreal.MovieSceneKeyInterpolation.LINEAR,
    'auto': unreal.MovieSceneKeyInterpolation.AUTO,
    'cubic': unreal.MovieSceneKeyInterpolation.AUTO,
    'constant': unreal.MovieSceneKeyInterpolation.CONSTANT,
    'user': unreal.MovieSceneKeyInterpolation.USER,
    'break': unreal.MovieSceneKeyInterpolation.BREAK,
}
DR = unreal.SequenceTimeUnit.DISPLAY_RATE
TR = unreal.SequenceTimeUnit.TICK_RESOLUTION
# 注意：UE4.24 的 add_key 在 DISPLAY_RATE 单位下会丢弃 sub_frame（实测 491.9 帧被写成 491 帧），
# 所以统一换算成 tick 后以 TICK_RESOLUTION 写入：tick = round((frame + sub_frame) * tick_per_frame)
TPF = [800.0]   # 运行时按序列实际 tick/display 比值覆盖


def to_tick(row):
    sub = float(row[2]) if len(row) > 2 else 0.0
    return int(round((float(row[0]) + sub) * TPF[0]))


def find_tracks(seq, parent_name, comp_name='LightComponent0'):
    comp = None
    for b in seq.get_bindings():
        p = b.get_parent()
        if b.get_name() == comp_name and p is not None and p.get_name() == parent_name:
            comp = b
    if comp is None:
        raise RuntimeError(u'找不到绑定 %s / %s' % (parent_name, comp_name))
    it = ct = None
    for t in comp.get_tracks():
        pn = str(t.get_property_name())
        if isinstance(t, unreal.MovieSceneFloatTrack) and pn == 'Intensity':
            it = t
        if isinstance(t, unreal.MovieSceneColorTrack) and pn == 'LightColor':
            ct = t
    if it is None or ct is None:
        raise RuntimeError(u'%s/%s 下缺少 Intensity 或 LightColor 轨道（请先在 Sequencer 里手动添加这两条轨道）' % (parent_name, comp_name))
    if not it.get_sections() or not ct.get_sections():
        raise RuntimeError(u'Intensity 或 LightColor 轨道没有 Section')
    if len(it.get_sections()) > 1 or len(ct.get_sections()) > 1:
        print('[warn] 轨道有多个 Section，只写第一个')
    isec = it.get_sections()[0]
    csec = ct.get_sections()[0]
    ich = isec.get_channels()[0]
    cch = dict((c.get_name(), c) for c in csec.get_channels())
    return isec, csec, ich, cch


def write_channel(ch, spec, interp):
    for k in list(ch.get_keys()):
        ch.remove_key(k)
    for row in spec.get('keys', []):
        ch.add_key(unreal.FrameNumber(to_tick(row)), float(row[1]), 0.0, TR, interp)
    d = spec.get('default', None)
    if d is None:
        try:
            ch.remove_default()
        except Exception:
            pass
    else:
        ch.set_default(float(d))


def readback_err(ch, spec):
    ks = ch.get_keys()
    exp = spec.get('keys', [])
    if len(ks) != len(exp):
        return 'COUNT %d != %d' % (len(ks), len(exp))
    err = 0.0
    for k, row in zip(ks, exp):
        tick = k.get_time(TR).frame_number.value
        if tick != to_tick(row):
            return 'TIME tick %d != %d (frame %s)' % (tick, to_tick(row), row[0])
        err = max(err, abs(k.get_value() - row[1]))
    return err


def main(job_path):
    job = json.load(io.open(job_path, encoding='utf-8'))
    log = {'ok': False, 'steps': [], 'job': job}

    def step(msg):
        log['steps'].append(msg)
        print(msg)

    try:
        data = json.load(io.open(job['keys'], encoding='utf-8'))
        if data.get('format') != 'fwlight.keys/2':
            raise RuntimeError('keys 文件格式不是 fwlight.keys/2')
        interp = INTERP[data.get('interp', 'linear')]
        seq = unreal.load_asset(job['sequence_asset'])
        if seq is None:
            raise RuntimeError('load_asset 失败: %s' % job['sequence_asset'])
        dr = seq.get_display_rate()
        tr = seq.get_tick_resolution()
        if [dr.numerator, dr.denominator] != [int(data.get('fps', 30)), 1]:
            raise RuntimeError('序列显示帧率 %d/%d 与 keys 文件 fps=%s 不一致' % (dr.numerator, dr.denominator, data.get('fps')))
        TPF[0] = (float(tr.numerator) / tr.denominator) / (float(dr.numerator) / dr.denominator)
        log['tick_per_frame'] = TPF[0]

        if job.get('save', True):
            try:
                loading = bool(unreal.AssetRegistryHelpers.get_asset_registry().is_loading_assets())
            except Exception:
                loading = False
            if loading:
                log['code'] = 'ASSET_REGISTRY_LOADING'
                raise RuntimeError('AssetRegistry 正在加载（刚启动编辑器/刚打开大地图），此时无法保存；未做任何修改')

        pkg = seq.get_outermost().get_name()
        dirty = [p.get_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages()]
        log['was_dirty'] = pkg in dirty
        if log['was_dirty'] and not job.get('force'):
            raise RuntimeError(u'序列 %s 在编辑器中有未保存的修改。请先保存或撤销，或用 --force 强制（会把这些修改一起存盘）' % pkg)

        isec, csec, ich, cch = find_tracks(seq, job['binding'], job.get('component', 'LightComponent0'))
        log['old'] = dict(I=ich.get_num_keys(), R=cch['Color.R'].get_num_keys(), G=cch['Color.G'].get_num_keys(),
                          B=cch['Color.B'].get_num_keys(), A=cch['Color.A'].get_num_keys())
        step('old keys %s' % log['old'])

        t0 = time.time()
        with unreal.ScopedEditorTransaction('fwlight: %s Intensity/LightColor' % job['binding']):
            seq.modify()
            isec.modify()
            csec.modify()
            write_channel(ich, data['intensity'], interp)
            for nm in ('R', 'G', 'B', 'A'):
                write_channel(cch['Color.' + nm], data['color'][nm], interp)
        step('written in %.2fs' % (time.time() - t0))

        rb = {'I': readback_err(ich, data['intensity'])}
        for nm in ('R', 'G', 'B', 'A'):
            rb[nm] = readback_err(cch['Color.' + nm], data['color'][nm])
        log['readback_err'] = rb
        log['new'] = dict(I=ich.get_num_keys(), R=cch['Color.R'].get_num_keys(), G=cch['Color.G'].get_num_keys(),
                          B=cch['Color.B'].get_num_keys(), A=cch['Color.A'].get_num_keys())
        step('readback err %s, new keys %s' % (rb, log['new']))
        bad = [k for k, v in rb.items() if isinstance(v, basestring) or v > 1e-3]
        if bad:
            raise RuntimeError('读回校验失败: %s（未保存，可在编辑器 Ctrl+Z 撤销）' % bad)

        if job.get('reopen_sequencer', True):
            try:
                lib = unreal.LevelSequenceEditorBlueprintLibrary
                cur = lib.get_current_level_sequence()
                if cur is not None and cur.get_path_name() == seq.get_path_name():
                    now = lib.get_current_time()
                    lib.close_level_sequence()
                    lib.open_level_sequence(seq)
                    lib.set_current_time(now)
                    step('sequencer reopened at frame %s' % now)
            except Exception as e:
                step('sequencer refresh skipped: %s' % e)

        if job.get('save', True):
            ok = unreal.EditorAssetLibrary.save_loaded_asset(seq, False)
            log['saved'] = bool(ok)
            step('saved=%s' % ok)
            if not ok:
                log['code'] = 'SAVE_FAILED'
                raise RuntimeError(u'关键帧已写入编辑器内存，但保存失败。常见原因：AssetRegistry 仍在加载 / 文件只读(P4 未 checkout)。'
                                   u'稍后运行 fwlight.py save 即可，无需重新 apply')
        else:
            log['saved'] = False
            step('save skipped (--no-save)，修改只在编辑器内存中')
        log['ok'] = True
    except Exception:
        import traceback
        log['error'] = traceback.format_exc()
        print(log['error'])
    with io.open(job['out'], 'w', encoding='utf-8') as f:
        f.write(unicode(json.dumps(log, indent=1, ensure_ascii=True)))


main(sys.argv[1])
