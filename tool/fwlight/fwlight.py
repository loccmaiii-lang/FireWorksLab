# -*- coding: utf-8 -*-
"""
fwlight —— 烟花编排(.dfshow) -> UE Level Sequence 灯光曲线 工具（宿主机 Python 3.8+）

常用：
  python fwlight.py check                                   # 环境自检（路径 / 编辑器连接 / 轨道）
  python fwlight.py build  --light SpotLight2               # 计算曲线 -> out/keys_SpotLight2.json
  python fwlight.py report --light SpotLight2               # 生成分析页 -> out/report_SpotLight2.html
  python fwlight.py apply  --light SpotLight2               # 备份 + 写入运行中的编辑器 + 保存
  python fwlight.py verify --light SpotLight2               # 直接解析磁盘 uasset 核对
  python fwlight.py all    --light SpotLight2 --set i_peak=2000 --set gamma=0.8   # 一条龙 + 临时改参
  python fwlight.py all    --light ALL                         # config.lights 里的所有灯（也可写 SpotLight,SpotLight3）
  python fwlight.py apply-pack <交付包目录> [--no-save]          # 写入编排工作台「交付 → 灯光」导出的四盏灯（FireWorksLab 加）

复现核对：
  python fwlight.py diff out/keys_SpotLight2.json baseline/keys_SpotLight2_written_20261015.json

回滚：
  python fwlight.py export-keys --light SpotLight2 --from baseline/inspect_before_20261015.json --out out/rollback_SpotLight2.json
  python fwlight.py apply --light SpotLight2 --keys out/rollback_SpotLight2.json
"""
import argparse
import json
import os
import shutil
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from lib import common                      # noqa: E402
from lib import light_model                 # noqa: E402


# ------------------------------------------------------------------ helpers
def parse_sets(cfg, light, sets):
    """--set key=value 临时覆盖 model 参数（只影响本次运行，不写回 config.json）。"""
    if not sets:
        return
    src = common.light_info(cfg, light)['curve_from'] or light   # 复用曲线的灯，参数改在源灯上
    if src != light:
        print('[参数] %s 复用 %s 的曲线，--set 作用于 %s' % (light, src, src))
    ov = cfg.setdefault('model_overrides', {}).setdefault(src, {}) or {}
    cfg['model_overrides'][src] = ov
    for s in sets:
        if '=' not in s:
            raise SystemExit('--set 格式应为 key=value: %s' % s)
        k, v = s.split('=', 1)
        k = k.strip()
        if k not in cfg['model']:
            raise SystemExit('未知参数 %s，可选: %s' % (k, ', '.join(cfg['model'])))
        base = cfg['model'][k]
        ov[k] = type(base)(float(v)) if isinstance(base, (int, float)) and not isinstance(base, bool) else v
        print('[参数] %s = %s' % (k, ov[k]))


def keys_path(light):
    return os.path.join(common.OUT_DIR, 'keys_%s.json' % light)


def seq_file(cfg):
    return common.asset_to_file(cfg, cfg['ue']['sequence_asset'], exts=('.uasset',))


def default_compare():
    p = os.path.join(HERE, 'baseline', 'inspect_before_20261015.json')
    return p if os.path.exists(p) else None


def tick_resolution(cfg):
    for name in ('inspect_latest.json', 'inspect_check.json'):
        p = os.path.join(common.OUT_DIR, name)
        if os.path.exists(p):
            try:
                return common.read_json(p)['tick'][0]
            except Exception:
                pass
    return cfg['ue'].get('tick_resolution', 24000)


# ------------------------------------------------------------------ commands
def cmd_check(cfg, a):
    ok = True

    def line(flag, msg):
        nonlocal ok
        ok = ok and flag
        print(('  [OK]   ' if flag else '  [FAIL] ') + msg)

    print('== 本机环境')
    line(sys.version_info >= (3, 8), 'Python %s（需要 3.8+）' % sys.version.split()[0])
    line(common.is_ascii(common.ROOT), '交接包路径为纯 ASCII: %s' % common.ROOT)
    u = cfg['ue']
    line(os.path.isdir(u['project_root']), 'ue.project_root: %s' % u['project_root'])
    rx = os.path.join(u['engine_root'], 'Plugins/Experimental/PythonScriptPlugin/Content/Python/remote_execution.py')
    line(os.path.exists(rx), 'ue.engine_root -> remote_execution.py: %s' % rx)
    sf = seq_file(cfg)
    line(os.path.exists(sf), '序列文件: %s' % sf)
    if os.path.exists(sf):
        line(os.access(sf, os.W_OK), '序列文件可写（只读通常表示 P4 尚未 checkout）')
    lf = common.asset_to_file(cfg, u['level_asset'], exts=('.umap',))
    line(os.path.exists(lf), '关卡文件: %s' % lf)
    dfs = common.resolve(cfg, cfg['show']['dfshow'])
    line(os.path.exists(dfs), '.dfshow: %s' % dfs)
    if not ok:
        print('\n有检查项失败，请先修正 config.json 后重试。')
        return 1

    print('== 关卡坐标')
    _, pts, actors = light_model.read_level_positions(cfg)
    line(len(pts) > 0, '发射点 %d 个: %s' % (len(pts), ' '.join(sorted(pts))))
    for name in cfg['lights']:
        li = common.light_info(cfg, name)
        if li['curve_from']:
            line(li['curve_from'] in cfg['lights'], '灯 %s 复用 %s 的曲线（强度 x%s + %s）' % (name, li['curve_from'], li['intensity_scale'], li['intensity_offset']))
            continue
        line(li['level_actor'] in actors, '灯 %s -> 关卡 Actor %s %s' % (name, li['level_actor'],
             tuple(round(v) for v in actors.get(li['level_actor'], ())) or ''))

    print('== 编辑器连接 & 序列结构')
    res = run_inspect(cfg, full_keys=False, out=os.path.join(common.OUT_DIR, 'inspect_check.json'))
    line(res.get('ok'), '读取序列 %s' % cfg['ue']['sequence_asset'])
    if res.get('ok'):
        print('         display_rate=%s tick=%s playback=%.2f~%.2fs dirty=%s open_in_sequencer=%s' % (
            res['display_rate'], res['tick'], res['playback'][2], res['playback'][3], res['dirty'], res['open_in_sequencer']))
        for name in cfg['lights']:
            li = common.light_info(cfg, name)
            tr = [t for b in res['bindings'] if b['name'] == li['component'] and b['parent'] == li['binding'] for t in b['tracks']]
            names = {t.get('prop_name') for t in tr}
            line('Intensity' in names and 'LightColor' in names, '绑定 %s/%s 含 Intensity + LightColor 轨道' % (li['binding'], li['component']))
        if abs(res['playback'][3] - cfg['show']['seq_end_s']) > 0.1:
            print('  [提示] 序列播放结束 %.4fs 与 config show.seq_end_s=%.4f 不一致，建议同步' % (res['playback'][3], cfg['show']['seq_end_s']))
    print('\n全部通过。' if ok else '\n有检查项失败。')
    return 0 if ok else 1


def run_inspect(cfg, full_keys=True, out=None):
    from lib import ue_bridge
    out = out or os.path.join(common.OUT_DIR, 'inspect_latest.json')
    job = dict(sequence_asset=cfg['ue']['sequence_asset'], out=os.path.abspath(out).replace('\\', '/'), full_keys=full_keys)
    res = ue_bridge.run_job(cfg, 'ue_inspect_sequence.py', job)
    if not res.get('ok'):
        print(res.get('error'))
    return res


def cmd_inspect(cfg, a):
    out = a.out or os.path.join(common.OUT_DIR, 'inspect_latest.json')
    res = run_inspect(cfg, True, out)
    if res.get('ok'):
        stamp = os.path.join(common.OUT_DIR, 'inspect_%s.json' % time.strftime('%Y%m%d_%H%M%S'))
        if os.path.abspath(out) != os.path.abspath(stamp):
            shutil.copyfile(out, stamp)
        for b in res['bindings']:
            for t in b['tracks']:
                n = [c['nkeys'] for s in t['sections'] for c in s['channels']]
                print('  %-14s %-16s %-18s keys=%s' % (b['parent'] or '-', b['name'], t.get('prop_name', t['type']), n))
        print('-> %s' % out)
    return 0 if res.get('ok') else 1


def cmd_build(cfg, a):
    parse_sets(cfg, a.light, a.set)
    t0 = time.time()
    R, keys = light_model.build_keys(cfg, a.light)
    common.write_json(keys_path(a.light), keys)
    common.write_json(os.path.join(common.OUT_DIR, 'frames_%s.json' % a.light),
                      dict(fps=R['params']['fps'], I=[round(x, 2) for x in R['I']], cols=[[round(x, 4) for x in c] for c in R['cols']]))
    print('[build] %s%s  事件 %d  Intensity 键 %d  Color 键 %d  (%.1fs)' % (
        a.light, ('（复用 %s 的曲线，强度 x%s + %s）' % (keys['meta']['curve_from'], keys['meta']['intensity_scale'], keys['meta']['intensity_offset'])
                  if keys['meta'].get('curve_from') else ''),
        len(R['events']), len(keys['intensity']['keys']), len(keys['color']['R']['keys']), time.time() - t0))
    sc = keys['meta'].get('intensity_scale', 1.0)
    of = keys['meta'].get('intensity_offset', 0.0)
    FPS = R['params']['fps']
    for s in R['doc']['sections']:
        seg = R['I'][int(s['start'] * FPS):int(s['end'] * FPS)] or [0]
        print('   %-14s %6.1f-%6.1fs  mean=%8.2f  peak=%8.2f' % (s['name'].split('｜')[-1], s['start'], s['end'],
              sum(seg) / len(seg) * sc + of, max(seg) * sc + of))
    print('-> %s' % keys_path(a.light))
    return R, keys


def cmd_report(cfg, a, R=None, keys=None):
    from lib import report
    if R is None:
        parse_sets(cfg, a.light, a.set)
        R, keys = light_model.build_keys(cfg, a.light)
    cmp_ = a.compare
    if cmp_ in (None, 'baseline'):
        cmp_ = default_compare()
        label = '10-15 写入前的原曲线'
    elif cmp_ == 'latest':
        cmp_ = os.path.join(common.OUT_DIR, 'inspect_latest.json')
        label = '编辑器当前曲线'
    elif cmp_ == 'none':
        cmp_, label = None, ''
    else:
        label = os.path.basename(cmp_)
    out = os.path.join(common.OUT_DIR, 'report_%s.html' % a.light)
    report.build_report(R, keys, cfg, out, compare_json=cmp_, compare_label=label)
    print('-> %s' % out)
    return 0


def cmd_backup(cfg, a=None):
    common.ensure_dirs()
    sf = seq_file(cfg)
    name = os.path.basename(sf)
    dst = os.path.join(common.BACKUP_DIR, '%s.%s.bak' % (name, time.strftime('%Y%m%d_%H%M%S')))
    shutil.copy2(sf, dst)
    h = common.sha256(dst)
    with open(os.path.join(common.BACKUP_DIR, 'backup_log.txt'), 'a', encoding='utf-8') as f:
        f.write('%s\t%s\t%s\t%s\n' % (time.strftime('%Y-%m-%d %H:%M:%S'), sf, dst, h))
    print('[backup] %s\n         sha256 %s' % (dst, h))
    return dst


def cmd_apply(cfg, a):
    from lib import ue_bridge
    kp = a.keys or keys_path(a.light)
    if not os.path.exists(kp):
        raise SystemExit('找不到 keys 文件 %s，请先运行 build' % kp)
    keys = common.read_json(kp)
    li = common.light_info(cfg, a.light)
    if keys.get('binding') and keys['binding'] != li['binding']:
        print('[提示] keys 文件来自 %s，将写入 %s' % (keys['binding'], li['binding']))
    cap = li.get('max_intensity')
    if cap is not None:      # FireWorksLab 2026-10-15：写入前硬上限（SkyLight ≤ 10）
        top = max([v[1] for v in keys['intensity']['keys']] + [keys['intensity'].get('default') or 0.0])
        if top > float(cap) + 1e-9:
            raise SystemExit('%s 强度最大 %.4f 超过上限 %s（config.lights.%s.max_intensity），拒绝写入' % (a.light, top, cap, a.light))
    if not common.is_ascii(os.path.abspath(kp)):
        # UE 内 Python 2.7 读不了非 ASCII 路径：先复制到 out/ 再交给编辑器
        dst = os.path.join(common.OUT_DIR, 'apply_input_%s.json' % a.light)
        shutil.copyfile(kp, dst)
        kp = dst
    sf = seq_file(cfg)
    if not a.no_save and not os.access(sf, os.W_OK):
        raise SystemExit('序列文件只读: %s\n请先在 P4 中 checkout（或去掉只读属性）后重试' % sf)
    do_backup = (lambda: cmd_backup(cfg)) if (not a.no_backup and not a.no_save) else None
    out = os.path.join(common.OUT_DIR, 'apply_%s.json' % a.light)
    job = dict(sequence_asset=cfg['ue']['sequence_asset'], binding=li['binding'], component=li['component'],
               keys=os.path.abspath(kp).replace('\\', '/'), out=os.path.abspath(out).replace('\\', '/'),
               save=not a.no_save, force=bool(a.force), reopen_sequencer=not a.no_reopen)
    for attempt in range(18):          # AssetRegistry 加载中：最多等 3 分钟
        res = ue_bridge.run_job(cfg, 'ue_apply_keys.py', job, after_connect=do_backup)
        do_backup = None                # 只备份一次
        if res.get('code') != 'ASSET_REGISTRY_LOADING':
            break
        print('[apply] 编辑器 AssetRegistry 正在加载，10 秒后重试 (%d/18)...' % (attempt + 1))
        time.sleep(10)
    if res.get('code') == 'SAVE_FAILED':
        print('[apply] 关键帧已写进编辑器但保存失败，稍后执行:  python fwlight.py save')
    if not res.get('ok'):
        print('[apply] 失败:\n%s' % res.get('error'))
        return 1
    print('[apply] 旧键 %s -> 新键 %s，读回误差 %s，saved=%s' % (res.get('old'), res.get('new'), res.get('readback_err'), res.get('saved')))
    return 0


def cmd_save(cfg, a):
    """只保存序列（apply 写入成功但保存失败时用）。"""
    from lib import ue_bridge
    out = os.path.join(common.OUT_DIR, 'save_result.json')
    job = dict(sequence_asset=cfg['ue']['sequence_asset'], out=os.path.abspath(out).replace('\\', '/'),
               only_if_dirty=not a.always)
    for attempt in range(18):
        res = ue_bridge.run_job(cfg, 'ue_save_sequence.py', job)
        if res.get('code') != 'ASSET_REGISTRY_LOADING':
            break
        print('[save] AssetRegistry 正在加载，10 秒后重试 (%d/18)...' % (attempt + 1))
        time.sleep(10)
    if res.get('ok'):
        print('[save] %s' % ('已保存' if res.get('saved') else '序列没有未保存修改，无需保存'))
        return 0
    print('[save] 失败: %s' % res.get('error'))
    return 1


def cmd_verify(cfg, a):
    from lib import disk_verify
    kp = a.keys or keys_path(a.light)
    if os.path.exists(kp):
        keys = common.read_json(kp)
    elif a.keys:
        raise SystemExit('找不到 keys 文件: %s' % kp)
    else:
        print('[verify] 没有 %s，按当前 config 现算一份用于比对' % kp)
        _, keys = light_model.build_keys(cfg, a.light)
    sf = seq_file(cfg)
    li = common.light_info(cfg, a.light)
    rep = disk_verify.verify(sf, keys, tick_resolution(cfg), li['binding'], li['component'])
    allok = True
    print('[verify] %s/%s  <- %s (mtime %s)' % (li['binding'], li['component'], sf,
          time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(sf)))))
    for r in rep:
        allok = allok and r['ok']
        if r.get('disk_keys') is None:
            print('   %-10s %s  FAIL' % (r['channel'], r['note']))
            continue
        print('   %-10s 期望 %-5d 磁盘 %-5d 时间一致=%-5s 最大误差=%.3g  %s' % (
            r['channel'], r['keys'], r['disk_keys'], r['times_equal'], r['max_err'], 'OK' if r['ok'] else 'FAIL'))
    print('磁盘数据与 keys 文件一致。' if allok else '存在不一致：可能尚未保存，或保存的是别的版本。')
    return 0 if allok else 1


def cmd_export_keys(cfg, a):
    """把 inspect 结果中某盏灯的现有曲线导出为 keys 文件（用于回滚 / 拷贝到其他灯）。"""
    insp = common.read_json(a.src)
    li = common.light_info(cfg, a.light)
    b = [b for b in insp['bindings'] if b['name'] == li['component'] and b['parent'] == li['binding']]
    if not b:
        raise SystemExit('%s 中没有 %s/%s' % (a.src, li['binding'], li['component']))
    tr = {t.get('prop_name'): t for t in b[0]['tracks']}
    if 'Intensity' not in tr or 'LightColor' not in tr:
        raise SystemExit('%s 中 %s 缺少 Intensity 或 LightColor 轨道' % (a.src, li['binding']))
    for t in (tr['Intensity'], tr['LightColor']):
        for c in t['sections'][0]['channels']:
            if c.get('nkeys', 0) and 'keys' not in c:
                raise SystemExit('%s 不含关键帧明细（可能是 check 生成的简表）。请先运行: python fwlight.py inspect' % a.src)

    def spec(ch):
        return {'default': ch.get('default'),
                'keys': [[k['t'][0], k['v'], k['t'][1]] if k['t'][1] else [k['t'][0], k['v']] for k in ch.get('keys', [])]}

    modes = set()
    for t in (tr['Intensity'], tr['LightColor']):
        for c in t['sections'][0]['channels']:
            modes |= {k.get('get_interpolation_mode', '') for k in c.get('keys', [])}
    interp = a.interp or ('linear' if modes and all('LINEAR' in m for m in modes) else
                          'constant' if modes and all('CONSTANT' in m for m in modes) else 'auto')
    cch = {c['name']: c for c in tr['LightColor']['sections'][0]['channels']}
    keys = {
        'format': 'fwlight.keys/2', 'light': a.light, 'binding': li['binding'], 'component': li['component'],
        'fps': insp.get('display_rate', [30, 1])[0], 'interp': interp,
        'intensity': spec(tr['Intensity']['sections'][0]['channels'][0]),
        'color': {nm: spec(cch['Color.' + nm]) for nm in ('R', 'G', 'B', 'A')},
        'meta': {'exported_from': os.path.abspath(a.src), 'exported_at': time.strftime('%Y-%m-%d %H:%M:%S'),
                 'source_interp_modes': sorted(modes)},
    }
    out = a.out or os.path.join(common.OUT_DIR, 'exported_%s.json' % a.light)
    common.write_json(out, keys)
    print('[export] Intensity %d 键, R/G/B/A %d/%d/%d/%d 键, interp=%s -> %s' % (
        len(keys['intensity']['keys']), *[len(keys['color'][n]['keys']) for n in 'RGBA'], interp, out))
    return 0


def _recon(keys_list, n):
    """把 [[f, v(, sub)], ...] 线性重建为逐帧序列（与 Linear 插值一致；首键前/末键后取常值）。"""
    out = [0.0] * n
    if not keys_list:
        return out
    pts = [(r[0] + (r[2] if len(r) > 2 else 0.0), r[1]) for r in keys_list]
    j = 0
    for f in range(n):
        while j + 1 < len(pts) and pts[j + 1][0] <= f:
            j += 1
        if f <= pts[0][0]:
            out[f] = pts[0][1]
        elif j + 1 >= len(pts):
            out[f] = pts[-1][1]
        else:
            (x0, y0), (x1, y1) = pts[j], pts[j + 1]
            out[f] = y0 + (y1 - y0) * (f - x0) / (x1 - x0)
    return out


def cmd_diff(cfg, a):
    """比较两个 keys 文件：键是否逐个相同 + 逐帧(线性重建)最大差值。"""
    A, B = common.read_json(a.a), common.read_json(a.b)
    n = int(cfg['show']['seq_end_s'] * cfg['model']['fps']) + 2
    same_all = True
    for label, ka, kb in [('Intensity', A['intensity'], B['intensity'])] + \
            [('Color.' + c, A['color'][c], B['color'][c]) for c in 'RGBA']:
        same = ka['keys'] == kb['keys'] and ka.get('default') == kb.get('default')
        same_all = same_all and same
        ra, rb = _recon(ka['keys'], n), _recon(kb['keys'], n)
        md = max(abs(x - y) for x, y in zip(ra, rb))
        fmax = max(range(n), key=lambda f: abs(ra[f] - rb[f]))
        print('  %-10s 键数 %5d / %-5d 逐键相同=%-5s 逐帧最大差 %.4g（@%.2fs）' % (
            label, len(ka['keys']), len(kb['keys']), same, md, fmax / float(cfg['model']['fps'])))
    print('两个文件完全一致。' if same_all else '存在差异。')
    return 0 if same_all else 2


def cmd_apply_pack(cfg, a):
    """FireWorksLab 2026-10-15：写入编排工作台「交付 → 灯光」导出的交付包（manifest.json + keys_<灯>.json）。
    逐盏灯：上限检查 → apply（默认先备份再保存）→ verify（磁盘核对）。--no-save 只写编辑器内存。"""
    pack = os.path.abspath(a.pack)
    man_p = os.path.join(pack, 'manifest.json')
    if not os.path.exists(man_p):
        raise SystemExit('交付包里没有 manifest.json: %s' % pack)
    man = common.read_json(man_p)
    if man.get('format') != 'fwlight.pack/1':
        raise SystemExit('manifest.json 格式不是 fwlight.pack/1: %s' % man.get('format'))
    want = [x.strip() for x in (a.lights or '').split(',') if x.strip()] or [l['light'] for l in man['lights']]
    rows = {l['light']: l for l in man['lights']}
    miss = [x for x in want if x not in rows or x not in cfg['lights']]
    if miss:
        raise SystemExit('交付包或 config.lights 里没有: %s' % ', '.join(miss))
    print('[pack] %s · %s · 事件 %s · 灯 %s' % (man.get('programme', {}).get('name'), man.get('programme', {}).get('version'),
                                           man.get('events'), ', '.join(want)))
    for i, name in enumerate(want):
        kp = os.path.join(pack, rows[name]['file'])
        keys = common.read_json(kp)
        if keys.get('format') != 'fwlight.keys/2' or keys.get('light') != name:
            raise SystemExit('%s 不是 %s 的 fwlight.keys/2' % (kp, name))
        # 同一次 --no-save：第 2 盏起序列已是本命令自己写的“未保存”状态，自动带 --force
        sub = argparse.Namespace(light=name, keys=kp, no_save=a.no_save, no_backup=a.no_backup,
                                 no_reopen=a.no_reopen or i < len(want) - 1, force=a.force or (a.no_save and i > 0))
        print('\n========== %s ==========' % name)
        if cmd_apply(cfg, sub) != 0:
            return 1
        if not a.no_save and cmd_verify(cfg, argparse.Namespace(light=name, keys=kp)) != 0:
            return 1
    print('\n[pack] 完成%s。' % ('（只写进编辑器内存，满意后 python fwlight.py save）' if a.no_save else '，已保存并逐键核对'))
    return 0


def cmd_all(cfg, a):
    R, keys = cmd_build(cfg, a)
    a.set = None   # 已应用
    cmd_report(cfg, a, R, keys)
    if cmd_apply(cfg, a) != 0:
        return 1
    if a.no_save:
        return 0
    return cmd_verify(cfg, a)


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser(description='烟花编排 -> UE 灯光曲线', formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    ap.add_argument('--config', default=os.path.join(HERE, 'config.json'))
    sub = ap.add_subparsers(dest='cmd', required=True)

    sub.add_parser('check', help='环境自检')
    p = sub.add_parser('inspect', help='导出序列现状到 out/inspect_latest.json')
    p.add_argument('--out')
    for name, hlp in (('build', '计算曲线'), ('report', '生成 HTML 分析页'), ('all', 'build+report+apply+verify')):
        p = sub.add_parser(name, help=hlp)
        p.add_argument('--light', required=True)
        p.add_argument('--set', action='append', help='临时覆盖模型参数，如 --set i_peak=2000')
        if name in ('report', 'all'):
            p.add_argument('--compare', help='对比曲线: baseline(默认) / latest / none / inspect json 路径')
        if name == 'all':
            p.add_argument('--keys')
            p.add_argument('--no-save', action='store_true')
            p.add_argument('--no-backup', action='store_true')
            p.add_argument('--no-reopen', action='store_true')
            p.add_argument('--force', action='store_true')
    sub.add_parser('backup', help='备份序列 uasset 到 backup/')
    p = sub.add_parser('apply', help='写入运行中的编辑器并保存')
    p.add_argument('--light', required=True)
    p.add_argument('--keys', help='默认 out/keys_<light>.json')
    p.add_argument('--no-save', action='store_true', help='只写内存不保存（在编辑器里看效果后手动保存或 Ctrl+Z）')
    p.add_argument('--no-backup', action='store_true')
    p.add_argument('--no-reopen', action='store_true', help='不重开 Sequencer 窗口')
    p.add_argument('--force', action='store_true', help='序列已有未保存修改时仍然写入并保存')
    p = sub.add_parser('apply-pack', help='写入编排工作台「交付 → 灯光」导出的交付包（多盏灯）')
    p.add_argument('pack', help='交付包目录（含 manifest.json）')
    p.add_argument('--lights', help='只写其中几盏，逗号分隔；默认包内全部')
    p.add_argument('--no-save', action='store_true')
    p.add_argument('--no-backup', action='store_true')
    p.add_argument('--no-reopen', action='store_true')
    p.add_argument('--force', action='store_true')
    p = sub.add_parser('save', help='只保存序列（apply 已写入但保存失败时用）')
    p.add_argument('--always', action='store_true', help='即使没有未保存修改也强制保存')
    p = sub.add_parser('verify', help='解析磁盘 uasset 核对')
    p.add_argument('--light', required=True)
    p.add_argument('--keys')
    p = sub.add_parser('diff', help='比较两个 keys 文件')
    p.add_argument('a')
    p.add_argument('b')
    p = sub.add_parser('export-keys', help='把 inspect 结果中的曲线导出为 keys 文件（回滚用）')
    p.add_argument('--light', required=True)
    p.add_argument('--from', dest='src', required=True)
    p.add_argument('--out')
    p.add_argument('--interp', choices=['linear', 'auto', 'constant'])

    a = ap.parse_args()
    cfg = common.load_config(a.config)
    common.ensure_dirs()
    fn = {'check': cmd_check, 'inspect': cmd_inspect, 'build': cmd_build, 'report': cmd_report, 'backup': cmd_backup,
          'apply': cmd_apply, 'verify': cmd_verify, 'export-keys': cmd_export_keys, 'all': cmd_all,
          'diff': cmd_diff, 'save': cmd_save, 'apply-pack': cmd_apply_pack}[a.cmd]
    lights = [x.strip() for x in getattr(a, 'light', '').split(',') if x.strip()] if getattr(a, 'light', None) else [None]
    if lights == ['ALL']:
        lights = list(cfg['lights'])
    code = 0
    sets = getattr(a, 'set', None)
    for lt in lights:
        if lt is not None:
            a.light = lt
            if len(lights) > 1:
                print('\n========== %s ==========' % lt)
        if hasattr(a, 'set'):
            a.set = sets
        cfg_i = common.load_config(a.config)      # 每盏灯重新读配置，避免 --set 互相污染
        r = fn(cfg_i, a)
        if isinstance(r, int) and r != 0:
            code = r
    sys.exit(code)


if __name__ == '__main__':
    main()
