"""球形 A 实际回放的几何辅助核验。读取 baker_strip 的采样记录，不读取配方猜测是否像。

用法：python analysis/scripts/球形A_核验.py <烘焙回放_采样.json> <输出目录>
输出原片/实时/导出对照、同区局部和测量。整段仅在最后一个时刻统一一次尺寸；
不逐帧缩放，不调曝光，不给输出加模糊。数值通过不代表艺术通过，人工条件仍须逐条看图。
"""
import argparse
import json
import pathlib
import importlib

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from refkit import gray, measure, streak


def inspect(metadata, out):
    meta_path = pathlib.Path(metadata)
    meta = json.loads(meta_path.read_text('utf-8'))
    stem = meta_path.stem.removesuffix('_采样')
    source = meta_path.with_name(stem + '_原尺寸.jpg')
    image = Image.open(source).convert('RGB')
    n, side = len(meta['times_s']), meta['square_px']
    assert image.size == (meta['label_px'] + n * side, meta['header_px'] + len(meta['rows']) * side), '采样记录与图片不一致'
    assert meta['projection'], '缺少实际回放视野记录，不能猜测中心'
    px = 450
    rc = importlib.import_module('回放检查')
    ref = meta['reference']
    if not pathlib.Path(ref['video']).exists():
        # 上传的本机采样记录含 F: 路径，云端按同一份仓库中的球形 A 原片读取。
        name = ref['video'].replace('\\', '/').split('/')[-1]
        assert name == '球形A.mp4', '这个核验只适用于球形 A'
        ref['video'] = str(pathlib.Path(__file__).resolve().parents[2] / 'vidio' / name)
    refs = rc.ref_frames(ref, meta['times_s'], px)
    bg = gray(rc.ref_frames(ref, [-0.2], px)[0])
    flash = gray(rc.ref_frames(ref, [1 / 30], px)[0]) - bg
    local = flash[175:275, 175:275]
    ys, xs = np.nonzero(local > local.max() * 0.9)
    assert len(xs), '找不到原片爆点'
    origin = (float(xs.mean() + 175), float(ys.mean() + 175))
    ref_m = [measure(im, bg, origin) for im in refs]
    anchor = ref_m[-1]['r98']
    assert anchor > 20
    rows = [('原片', refs)]
    report = dict(entry=meta['entry'], ver=meta.get('ver'), times_s=meta['times_s'], source=str(source),
                  registration='仅按末帧半径校准一次整段尺度，保持爆点；所有时刻复用同一变换，无亮度或模糊改动',
                  limits='线条连通长度受交叠、相机和 256px 格子影响。局部亮峰数不能判独立点头；数值只作辅助。',
                  reference_origin_px=origin, reference=[], views={}, artistic_pass=False)
    for t, im, m in zip(meta['times_s'], refs, ref_m):
        s = streak(im, bg, origin, m['r98'])
        report['reference'].append(dict(t=t, radius=m['r98'], radius_over_anchor=m['r98'] / anchor,
                                        tail75=m['tail75'], coherence=s['coh']))
    for label, key in [('实时模拟', 'live'), ('导出效果', 'export')]:
        row = meta['rows'].index(label)
        raw = []
        for i in range(n):
            x, y = meta['label_px'] + i * side, meta['header_px'] + row * side
            raw.append(np.array(image.crop((x, y, x + side, y + side)).resize((px, px), Image.Resampling.BILINEAR)))
        v = meta['projection'][key]
        center = ((0.5 - v[0] / (2 * v[2])) * px, (0.5 + v[1] / (2 * v[3])) * px)
        sky = np.median(raw[0].reshape(-1, 3), axis=0).astype(np.uint8)
        raw_bg = np.full((px, px), float(gray(sky[None, None, :])[0, 0]), np.float32)
        last = measure(raw[-1], raw_bg, center)['r98']
        assert last > 20, '末帧没有可校准的星点'
        scale = anchor / last
        matrix = np.float32([[scale, 0, origin[0] - center[0] * scale], [0, scale, origin[1] - center[1] * scale]])
        ims = [cv2.warpAffine(im, matrix, (px, px), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT,
                             borderValue=tuple(float(x) for x in sky)) for im in raw]
        view = dict(constant_scale=scale, source_origin_px=center, measurements=[], numeric_checks=[])
        for i, (t, im) in enumerate(zip(meta['times_s'], ims)):
            m = measure(im, raw_bg, origin)
            # 同一时刻用参考的半径/平滑尺度检查，不能各自换一套指标口径。
            s = streak(im, raw_bg, origin, ref_m[i]['r98'])
            view['measurements'].append(dict(t=t, radius=m['r98'], radius_over_anchor=m['r98'] / anchor,
                                            tail75=m['tail75'], coherence=s['coh']))
        early = min(range(n), key=lambda i: abs(meta['times_s'][i] - 1.1333))
        assert abs(meta['times_s'][early] - 1.1333) < 0.02, '缺少用户指出的 +1.13 s'
        a, b = view['measurements'][early], report['reference'][early]
        view['numeric_checks'] = [
            dict(feature='金线连续性', passed=a['coherence'] >= b['coherence'] - 0.04,
                 actual=a['coherence'], reference=b['coherence'], tolerance=0.04),
            dict(feature='可分辨长线占半径（连通线 75 分位，辅助）', passed=abs(a['tail75'] - b['tail75']) <= b['tail75'] * 0.15,
                 actual=a['tail75'], reference=b['tail75'], relative_tolerance=0.15),
            dict(feature='早段展开比例', passed=abs(view['measurements'][0]['radius_over_anchor'] - report['reference'][0]['radius_over_anchor']) <= 0.04,
                 actual=view['measurements'][0]['radius_over_anchor'], reference=report['reference'][0]['radius_over_anchor'], tolerance=0.04),
        ]
        view['numeric_pass'] = all(x['passed'] for x in view['numeric_checks'])
        view['visual_required'] = {k: None for k in ['1.13秒没有独立点头', '中心空隙与单条可见尾长', '1.87秒粉点挂在金线末端',
                                                    '2.63秒少量残迹', '早段橙红转金时机', '点头尺寸和能量', '连续回放']}
        report['views'][key] = view
        rows.append((label + ' · 一次尺度校准', ims))
    report['numeric_pass'] = all(v['numeric_pass'] for v in report['views'].values())
    font = ImageFont.load_default()
    for path in ['C:/Windows/Fonts/msyh.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc']:
        if pathlib.Path(path).exists(): font = ImageFont.truetype(path, 14); break
    sheet = Image.new('RGB', (100 + px * n, 30 + px * len(rows)), (14, 15, 20))
    draw = ImageDraw.Draw(sheet)
    for row, (label, ims) in enumerate(rows):
        draw.text((4, 30 + row * px + 215), label[:7], font=font, fill=(220, 210, 180))
        for i, im in enumerate(ims): sheet.paste(Image.fromarray(im), (100 + i * px, 30 + row * px))
    for i, t in enumerate(meta['times_s']): draw.text((105 + i * px, 5), f'开花后 {t:.3f}s', font=font, fill=(240, 200, 120))
    out = pathlib.Path(out); out.mkdir(parents=True, exist_ok=True)
    sheet.save(out / '固定尺度对照.jpg', quality=95, subsampling=0)
    # 同一角区看金线、端头和空隙；不把每张图中的亮物另找框裁切。
    radius = ref_m[early]['r98']
    box = tuple(int(x) for x in (origin[0] + radius * .10, origin[1] - radius * .23,
                                origin[0] + radius * 1.12, origin[1] + radius * .26))
    width, height = box[2] - box[0], box[3] - box[1]
    detail = Image.new('RGB', (150 + width, (height + 28) * len(rows)), (14, 15, 20)); dr = ImageDraw.Draw(detail)
    for row, (label, ims) in enumerate(rows):
        dr.text((4, row * (height + 28) + 8), label[:7] + ' +1.133s', font=font, fill=(220, 210, 180))
        detail.paste(Image.fromarray(ims[early]).crop(box), (150, row * (height + 28) + 28))
    detail.save(out / '同区头尾局部.png')
    (out / '辅助核验.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(json.dumps({k: report[k] for k in ['entry', 'numeric_pass', 'artistic_pass']}, ensure_ascii=False))
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('metadata'); parser.add_argument('out')
    args = parser.parse_args()
    inspect(args.metadata, args.out)
