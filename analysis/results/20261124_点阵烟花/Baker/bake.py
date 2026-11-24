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


def gray_frame(xy, radii, intensities, side):
    """对两个高斯光瓣按实际像素面积积分，移动时保留亚像素光量。"""
    out = np.zeros((side, side), np.float32)
    for (u, v), radius, peak in zip(xy, radii, intensities):
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
        for width, gain in ((.43, .95), (1.05, .05)):
            a = np.sqrt(np.log(2)) / (width * r)
            norm = np.sqrt(np.pi) / (2*a)
            gx = norm * np.diff(erf(a * dx))
            gy = norm * np.diff(erf(a * dy))
            out[y0:y1, x0:x1] += (2.0*float(peak)*gain) * np.outer(gy, gx)
    return np.minimum(np.rint(out*255), 253).astype(np.uint8)


def layer_atlas(data, mask, cell_size):
    nframes = len(data['xy'])
    if nframes != 64:
        raise ValueError(f'本演示的 4×4 RGBA 图集需要 64 帧，当前 {nframes}')
    atlas = np.zeros((cell_size*4, cell_size*4, 4), np.uint8)
    xy, radius, intensity = (data[key][:, mask] for key in ('xy', 'radius', 'intensity'))
    for frame in range(nframes):
        tile = gray_frame(xy[frame], radius[frame], intensity[frame], cell_size)
        channel, tile_index = divmod(frame, 16)
        row, col = divmod(tile_index, 4)
        atlas[row*cell_size:(row+1)*cell_size, col*cell_size:(col+1)*cell_size, channel] = tile
    # 仓库 PNG / Cutout 导出函数都接收 OpenGL 自下而上的行。
    return atlas[::-1].copy()


def hex_color(arr):
    return '#' + ''.join(f'{int(c):02x}' for c in arr)


def render():
    with np.load(MOTION) as archive:
        data = dict(archive)
    group = data['group']
    metadata = json.loads((MOTION.parent/'metadata.json').read_text(encoding='utf8'))
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
            layer_atlas(data, mask, cell_size).tofile(scratch / (name + '.rgba'))
            conf['layers'].append(dict(name=name, mobile=mobile, cell_size=cell_size, **colors))
        (scratch / 'layers.json').write_text(json.dumps(conf), encoding='utf-8')
        subprocess.run(['node', str(HERE/'pack.cjs'), str(scratch), str(HERE/'DotRabbitDemo')], check=True)


if __name__ == '__main__':
    render()
