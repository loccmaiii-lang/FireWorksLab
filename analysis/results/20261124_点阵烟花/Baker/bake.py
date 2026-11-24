"""从共享逐点运动烘焙 PC / 手机版。运行本文件即可重建 DotRabbitDemo。"""
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from scipy.special import erf


HERE = Path(__file__).resolve().parent
MOTION = HERE.parent / 'shared' / 'motion.npz'
GROUP_NAMES = ('White', 'Gold', 'Cyan')


def gray_frame(xy, radii, intensities, side, flash):
    """对两个高斯光瓣按实际像素面积积分，移动时保留亚像素光量。"""
    out = np.zeros((side, side), np.float32)
    for (u, v), radius, peak, is_flash in zip(xy, radii, intensities, flash):
        if peak <= 0 or radius <= 0:
            continue
        x, y, r = float(u * side), float(v * side), float(radius * side)
        reach = max(1.0, 4.0 * r)
        x0, y0 = max(0, int(np.floor(x-reach))), max(0, int(np.floor(y-reach)))
        x1, y1 = min(side, int(np.ceil(x+reach))), min(side, int(np.ceil(y+reach)))
        if x1 <= x0 or y1 <= y0:
            continue
        dx = np.arange(x0, x1+1, dtype=float) - x
        dy = np.arange(y0, y1+1, dtype=float) - y
        # r 来自参考图显示亮度的半高宽。经材质 ×4 自发光、显示曲线反推线性光瓣。
        profile = ((1., 1.5),) if is_flash else ((.43, 1.9), (1.05, .1))
        for width, gain in profile:
            a = np.sqrt(np.log(2)) / (width * r)
            norm = np.sqrt(np.pi) / (2*a)
            gx = norm * np.diff(erf(a * dx))
            gy = norm * np.diff(erf(a * dy))
            out[y0:y1, x0:x1] += (float(peak)*gain) * np.outer(gy, gx)
    return np.minimum(np.rint(out*255), 253).astype(np.uint8)


def sample_ticks(data, meta, capacity=64):
    """固定图集容量。合并同形停留，优先保留快速位移、亮度突变和原消散采样。"""
    xy, radii, energy = (data[key] for key in ('xy', 'radius', 'intensity'))
    step = np.linalg.norm(np.diff(xy, axis=0), axis=2)*512
    weight = np.maximum(energy[1:], energy[:-1])**.5
    change = (step + abs(np.diff(radii, axis=0))*512)*weight + 6*abs(np.diff(energy, axis=0))
    cost = np.r_[0., np.cumsum(change.max(axis=1))]
    last_lit = meta['last_lit_source_frame']
    candidates = [0] + [i for i in range(1, last_lit+1) if cost[i] > cost[i-1]]
    tail = meta['added_tail_start_frame']
    protected = {0, meta['hold_frames_inclusive'][0], last_lit,
                 *range(meta['decay_start_frame'], tail), *range(tail-1, last_lit, 4)}
    while len(candidates) > capacity:
        # 删一个样本时，左侧画面多停多久、累计多错过多少运动。
        choices = [(max(cost[b]-cost[a], .02)*(c-b), k)
                   for k, (a,b,c) in enumerate(zip(candidates, candidates[1:], candidates[2:]), 1)
                   if b not in protected]
        if not choices:
            raise ValueError('单页容量不足以保留指定的阶段')
        candidates.pop(min(choices)[1])
    return candidates


def layer_atlas(data, mask, cell_size, ticks, gain, flash_id, view_scale):
    atlas = np.zeros((cell_size*4, cell_size*4, 4), np.uint8)
    xy, radius, intensity = (data[key][:, mask] for key in ('xy', 'radius', 'intensity'))
    xy = .5 + (xy-.5)/view_scale
    radius = radius/view_scale
    flash = data['point_id'][mask] == flash_id
    kept = []
    for frame in ticks:
        tile = gray_frame(xy[frame], radius[frame], intensity[frame]/gain[frame], cell_size, flash)
        if not kept and tile.max() < 2:
            continue  # 起始只见爆心时，金、青色层延迟出生。
        channel, tile_index = divmod(len(kept), 16)
        kept.append(frame)
        row, col = divmod(tile_index, 4)
        atlas[row*cell_size:(row+1)*cell_size, col*cell_size:(col+1)*cell_size, channel] = tile
    # 仓库 PNG / Cutout 导出函数都接收 OpenGL 自下而上的行。
    return atlas[::-1].copy(), kept


def hex_color(arr):
    return '#' + ''.join(f'{int(c):02x}' for c in arr)


def render():
    with np.load(MOTION) as archive:
        data = dict(archive)
    group = data['group']
    metadata = json.loads((MOTION.parent/'metadata.json').read_text(encoding='utf8'))
    ticks = sample_ticks(data, metadata)
    frames = len(data['xy'])
    zero, tail_start = metadata['zero_frame'], metadata['added_tail_start_frame']
    gain = np.ones(frames)
    gain[tail_start:] = (np.maximum(zero-np.arange(tail_start, frames), 0)/(zero-tail_start+1))**2
    if not np.allclose(data['intensity'][tail_start:], gain[tail_start:, None]*data['intensity'][tail_start-1], atol=1e-6):
        raise ValueError('余火亮度与 ColorOverLife 共用的尾段曲线不一致')
    conf = {'frames': len(data['xy']), 'fps': int(data['fps']), 'widthM': metadata['canvas_metres'],
            'motion_sha256': hashlib.sha256(MOTION.read_bytes()).hexdigest(), 'layers': []}
    with tempfile.TemporaryDirectory(prefix='fwl_dotrabbit_') as tmp:
        scratch = Path(tmp)
        for i, name in enumerate((*GROUP_NAMES, 'Mono')):
            mobile = name == 'Mono'
            mask = np.ones(len(group), bool) if mobile else group == i
            cell_size = 256 if mobile else 512
            colors = {}
            for key in ('core_rgb', 'halo_rgb'):
                if mobile:
                    colors[key] = '#ffffff'
                else:
                    a = data[key]
                    vals = a[mask] if len(a) == len(group) else a[i:i+1]
                    if not np.all(vals == vals[0]):
                        raise ValueError(f'{name} 颜色层有多种 {key}')
                    colors[key] = hex_color(vals[0])
            # 手机固定取景两边各扩约 9 个格内像素。此范围同时保留停形独立峰和续落末端。
            view_scale = 1.075 if mobile else 1.
            atlas, kept = layer_atlas(data, mask, cell_size, ticks, gain, metadata['flash_point_id'], view_scale)
            atlas.tofile(scratch / (name + '.rgba'))
            gain_keys = [[tail_start-1, 1.], *[[i, gain[i]] for i in range(tail_start, frames)], [frames, 0.]]
            conf['layers'].append(dict(name=name, mobile=mobile, cell_size=cell_size,
                                       ticks=kept, gain_keys=gain_keys, view_scale=view_scale, **colors))
        (scratch / 'layers.json').write_text(json.dumps(conf), encoding='utf-8')
        subprocess.run(['node', str(HERE/'pack.cjs'), str(scratch), str(HERE/'DotRabbitDemo')], check=True)


if __name__ == '__main__':
    render()
