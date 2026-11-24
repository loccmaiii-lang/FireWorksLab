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


def inspect(platform, directory, motion, groups):
    spec = json.loads((directory / 'cascade.json').read_text(encoding='utf8'))
    assert spec['source']['motion_sha256'] == hashlib.sha256(motion.read_bytes()).hexdigest()
    for tex in spec['textures'].values():
        assert hashlib.sha256((directory/tex['file']).read_bytes()).hexdigest() == tex['sha256']
    layers = [replay.Pack(str(directory), i) for i in range(len(spec['emitters']))]
    report = replay.check(layers, str(QA / (platform + '.png')), times_s=[.10, .4, .9, 1.7, 2.0])
    if not report['pass']:
        raise ValueError(report['layers'])
    result = []
    for i, layer in enumerate(layers):
        assert [layer.frame_at(t / 30 / layer.life) for t in range(64)] == list(range(64))
        frame = layer.cell(30)
        labels, count = label((maximum_filter(frame, size=3) == frame) & (frame > .3))
        centers = np.asarray(center_of_mass(frame, labels, list(range(1, count+1))))[:, ::-1] + .5
        targets = groups['xy'][30] if platform == 'mobile' else groups['xy'][30, groups['group'] == i]
        targets = targets * layer.cw
        distance, nearest = cKDTree(centers).query(targets)
        # 附件的最紧一对在手机 256 格上合为一峰，PC 每个目标都应单独可辨。
        assert len(np.unique(nearest)) >= len(targets) - (1 if platform == 'mobile' else 0)
        assert np.max(distance) < (2 if platform == 'mobile' else 1)
        result.append({'layer': layer.e['name'], 'frame': 30, 'expected_points': len(targets),
                       'unique_matched_peaks': len(np.unique(nearest)), 'visible_peaks': count,
                       'max_distance_to_peak_px': round(float(np.max(distance)), 2),
                       'tick_start_shown': 64, 'replay_check_shown': report['layers'][i]['shown'],
                       'crop_hits': report['layers'][i]['edge_frames'],
                       'empty_middle': report['layers'][i]['empty_mid'], 'empty_tail': report['layers'][i]['empty_tail']})
    return result


def main():
    QA.mkdir(parents=True, exist_ok=True)
    motion = HERE.parent / 'shared/motion.npz'
    with np.load(motion) as archive:
        groups = {k: archive[k] for k in ('xy', 'group')}
    stats = {'pc': inspect('pc', PACK, motion, groups)}
    # 原检查器读固定文件名 cascade.json。用手机配置及它真正引用的 PNG 作独立输入。
    with tempfile.TemporaryDirectory(prefix='fwl_mobile_replay_') as temp:
        directory = Path(temp)
        shutil.copyfile(PACK/'cascade_mobile.json', directory/'cascade.json')
        config = json.loads((directory/'cascade.json').read_text(encoding='utf8'))
        for tex in config['textures'].values():
            shutil.copyfile(PACK/tex['file'], directory/tex['file'])
        stats['mobile'] = inspect('mobile', directory, motion, groups)
    print(json.dumps(stats, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
