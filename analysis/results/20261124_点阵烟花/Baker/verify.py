"""以最终包回放 PC / 手机，检查全部帧的引用与成形时每一颗光点。"""
import hashlib
import importlib.util
import json
import shutil
import tempfile
from pathlib import Path

import numpy as np
from scipy.ndimage import label, maximum_filter, center_of_mass
from scipy.spatial import cKDTree


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
PACK = HERE / 'DotRabbitDemo'
QA = ROOT / 'analysis/local/20261124_点阵烟花/Baker'
module = importlib.util.spec_from_file_location('replay', ROOT / 'analysis/scripts/回放检查.py')
replay = importlib.util.module_from_spec(module)
module.loader.exec_module(replay)


def inspect(platform, directory, motion, groups, meta):
    spec = json.loads((directory / 'cascade.json').read_text(encoding='utf8'))
    assert spec['source']['motion_sha256'] == hashlib.sha256(motion.read_bytes()).hexdigest()
    for tex in spec['textures'].values():
        assert hashlib.sha256((directory/tex['file']).read_bytes()).hexdigest() == tex['sha256']
    layers = [replay.Pack(str(directory), i) for i in range(len(spec['emitters']))]
    fps = meta['fps']
    hold_tick = sum(meta['hold_frames_inclusive'])//2
    # 从实际包取格，逐段看星簇、轮廓浮现、径向减速与余火。
    times = [0, .2, .5, .7, .9, hold_tick/fps, meta['decay_start_frame']/fps, (meta['zero_frame']-1)/fps]
    report = replay.check(layers, str(QA / (platform + '.png')), times_s=times)
    if not report['pass']:
        raise ValueError(report['layers'])
    result = []
    for i, layer in enumerate(layers):
        start_tick = round(layer.delay*fps)
        frames = [layer.frame_at((t/fps-layer.delay)/layer.life) for t in range(start_tick, meta['frame_count'])]
        assert sorted(set(frames)) == list(range(layer.frames)) and frames == sorted(frames)
        opening = frames[:meta['formation_frame']-start_tick+1]
        switch_ticks = np.r_[0, np.flatnonzero(np.diff(opening)) + 1, len(opening)]
        max_gap = int(np.max(np.diff(switch_ticks)))
        assert max_gap <= fps//10, (layer.e['name'], max_gap)
        end = (meta['zero_frame']/fps-layer.delay)/layer.life
        assert np.max(np.abs(layer.color(end))) < 1e-8
        tail, energy = [], []
        for t in range(meta['added_tail_start_frame']-1, meta['zero_frame']+1):
            u = (t/fps-layer.delay)/layer.life
            rgb = layer.rgb(layer.cell(layer.frame_at(u)),u)
            tail.append(round(float((1-np.exp(-rgb.max()))**(1/2.2)*255), 2))
            energy.append(float(rgb.sum()))
        # 下落的亚像素光点穿过像素中心时，单点峰值会有微小波动，整层光量须持续衰减。
        assert tail[-1] == 0 and 0 < tail[-2] < 25 and np.all(np.diff(energy) < 0), (tail,energy)
        frame = layer.cell(frames[hold_tick-start_tick])
        labels, count = label((maximum_filter(frame, size=3) == frame) & (frame > .3))
        centers = np.asarray(center_of_mass(frame, labels, list(range(1, count+1))))[:, ::-1] + .5
        visible = groups['intensity'][hold_tick] > 0
        if platform != 'mobile':
            visible &= groups['group'] == i
        view_scale = layer.size(0)[0]/(meta['canvas_metres']*100)
        targets = (.5+(groups['xy'][hold_tick,visible]-.5)/view_scale) * layer.cw
        distance, nearest = cKDTree(centers).query(targets)
        assert len(np.unique(nearest)) == count == len(targets)
        assert np.max(distance) < 1
        result.append({'layer': layer.e['name'], 'frame': hold_tick, 'expected_points': len(targets),
                       'unique_matched_peaks': len(np.unique(nearest)), 'visible_peaks': count,
                       'max_distance_to_peak_px': round(float(np.max(distance)), 2),
                       'tick_start_shown': len(set(frames)), 'replay_check_shown': report['layers'][i]['shown'],
                       'max_opening_ticks_per_tile': max_gap,
                       'final_display_peak': tail[-6:],
                       'crop_hits': report['layers'][i]['edge_frames'],
                       'empty_middle': report['layers'][i]['empty_mid'], 'empty_tail': report['layers'][i]['empty_tail']})
    return result


def main():
    QA.mkdir(parents=True, exist_ok=True)
    motion = HERE.parent / 'shared/motion.npz'
    with np.load(motion) as archive:
        groups = {k: archive[k] for k in ('xy', 'group', 'intensity')}
    meta = json.loads((motion.parent/'metadata.json').read_text(encoding='utf8'))
    stats = {'pc': inspect('pc', PACK, motion, groups, meta)}
    # 原检查器读固定文件名 cascade.json。用手机配置及它真正引用的 PNG 作独立输入。
    with tempfile.TemporaryDirectory(prefix='fwl_mobile_replay_') as temp:
        directory = Path(temp)
        shutil.copyfile(PACK/'cascade_mobile.json', directory/'cascade.json')
        config = json.loads((directory/'cascade.json').read_text(encoding='utf8'))
        for tex in config['textures'].values():
            shutil.copyfile(PACK/tex['file'], directory/tex['file'])
        stats['mobile'] = inspect('mobile', directory, motion, groups, meta)
    print(json.dumps(stats, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
