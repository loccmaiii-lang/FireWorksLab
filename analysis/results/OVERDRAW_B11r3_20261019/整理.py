#!/usr/bin/env python3
"""overdraw 实测整理（烟花编排（22）-本机，2026-10-19）：Shader Complexity 截图分档 + ProfileGPU 日志里的 Translucency 毫秒。

Shader Complexity 截图按引擎默认 9 色色带（BaseEngine.ini ShaderComplexityColors，绿 → 红 → 粉 → 白）把每个像素换成 0–8 档；
档位 = 像素着色开销 ÷ MaxPixelShaderAdditiveComplexityCount 的相对值（项目是否改过这两项配置，按读到的配置写）。
ProfileGPU 只记日志：取每个时刻那一帧的总 GPU 毫秒和带 Translucency 的条目。都是开发机编辑器视口的数，只能做时刻之间的相对比较，不是 GTX960 实测。
用法：python -X utf8 -I analysis/results/OVERDRAW_B11r3_20261019/整理.py <运行目录> <输出目录>
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAMP = np.array([(0.0, 1.0, 0.127), (0.0, 1.0, 0.0), (0.046, 0.52, 0.0), (0.215, 0.215, 0.0), (0.52, 0.046, 0.0),
                 (0.7, 0.0, 0.0), (1.0, 0.0, 0.0), (1.0, 0.0, 0.5), (1.0, 0.9, 0.9)])


def srgb2lin(a):
    a = a / 255.0
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def complexity_index(img):
    """每个像素投影到色带的分段线性路径上，返回 0–8 的连续档位。"""
    x = srgb2lin(np.asarray(img.convert('RGB'), dtype=np.float32)).reshape(-1, 3)
    best_d = np.full(len(x), np.inf, dtype=np.float32)
    best_i = np.zeros(len(x), dtype=np.float32)
    for k in range(len(RAMP) - 1):
        a, b = RAMP[k], RAMP[k + 1]
        ab = b - a
        t = np.clip(((x - a) @ ab) / (ab @ ab), 0, 1)
        p = a + t[:, None] * ab
        d = ((x - p) ** 2).sum(1)
        m = d < best_d
        best_d[m], best_i[m] = d[m], k + t[m]
    return best_i.reshape(img.size[1], img.size[0]), best_d.reshape(img.size[1], img.size[0])


def bands(idx, mask=None):
    v = idx if mask is None else idx[mask]
    if v.size == 0:
        return None
    return dict(p50=round(float(np.percentile(v, 50)), 2), p95=round(float(np.percentile(v, 95)), 2), p99=round(float(np.percentile(v, 99)), 2), max=round(float(v.max()), 2),
                ge4=round(float((v >= 4).mean() * 100), 2), ge6=round(float((v >= 6).mean() * 100), 2), ge7=round(float((v >= 7).mean() * 100), 2), ge8=round(float((v >= 7.8).mean() * 100), 2))


def parse_profile(lines):
    """ProfileGPU 日志：总 GPU 时间 + 所有含 Translucen 的条目（取毫秒）。"""
    total, trans = None, []
    for s in lines:
        m = re.search(r'total GPU time ([\d.]+) ?ms', s)
        if m and total is None:
            total = float(m.group(1))
        if 'ranslucen' in s:
            m = re.search(r'([\d.]+)%\s+([\d.]+)ms\s+(.*)', s)
            if m:
                trans.append(dict(pct=float(m.group(1)), ms=float(m.group(2)), name=m.group(3).strip()[:80]))
    top = max((t['ms'] for t in trans), default=None)
    return dict(totalMs=total, translucencyTopMs=top, translucency=trans[:8])


run_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)
rows = []
for rf in sorted(run_dir.glob('*.json')):
    rep = json.loads(rf.read_text(encoding='utf-8'))
    if rep.get('format') != 'df.director-overdraw-run/1':
        continue
    base = None
    for ev in rep.get('events', []):
        if not ev.get('captured'):
            continue
        sc = Image.open(ev['shotSC'])
        idx, dist = complexity_index(sc)
        H = idx.shape[0]
        sky = np.zeros_like(idx, dtype=bool)
        sky[: int(H * 0.75), :] = True
        prof = parse_profile(ev.get('profile') or [])
        r = dict(run=rep['label'], quality=rep['quality'], moment=ev['moment'], showTime=[round(x, 2) for x in ev['showTimeRange']], late=round(ev['wallLate'], 2),
                 whole=bands(idx), sky=bands(idx, sky), fitError=round(float(np.sqrt(dist).mean()), 3), profile=prof, lit=Path(ev['shot']).name, sc=Path(ev['shotSC']).name)
        if base is None:
            base = r
        r['skyGe4MinusBase'] = round(r['sky']['ge4'] - base['sky']['ge4'], 2) if base else None
        rows.append(r)
(out_dir / '实测.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
print(json.dumps([(r['run'], r['moment'], r['sky']['p99'], r['sky']['ge6'], r['profile']['totalMs'], r['profile']['translucencyTopMs']) for r in rows], ensure_ascii=False))
