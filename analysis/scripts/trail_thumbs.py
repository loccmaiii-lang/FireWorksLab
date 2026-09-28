"""花型库缩略图：从导出的尾缀贴图生成 trailS / trailM / trailL 的 160px 缩略图，写进 tool/src/js/16_thumbs.js
  python trail_thumbs.py <导出目录>
"""
import os, sys, re, json, io, base64
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import trail_video as TV

ROOT = TV.ROOT; P_THUMBS = os.path.join(ROOT, 'tool', 'src', 'js', '16_thumbs.js')


def main(d):
    s = open(P_THUMBS, encoding='utf-8').read()
    for k in 'SML':
        t = TV.Trail(os.path.join(d, f'RiseTrail_{k}'), k); lin = t.color(t.cell(t.loop, 0))
        h = 150; w = max(2, int(lin.shape[1] * h / lin.shape[0])); spr = cv2.resize(lin, (w, h), interpolation=cv2.INTER_AREA)
        # 细长条太窄：横向放宽 3 倍显示（缩略图只看感觉）
        spr = cv2.resize(spr, (w * 3, h), interpolation=cv2.INTER_LINEAR)
        img = TV.night(160, 160); x0 = 80 - spr.shape[1] // 2; img[5:5 + h, x0:x0 + spr.shape[1]] += spr * 1.4
        im = Image.fromarray(TV.tone(img)); b = io.BytesIO(); im.save(b, 'JPEG', quality=82)
        url = 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
        key = f'trail{k}'
        if f'"{key}":' in s: s = re.sub(rf'"{key}": "[^"]*"', f'"{key}": "{url}"', s)
        else: s = s.replace('const THUMBS = {', f'const THUMBS = {{"{key}": "{url}", ', 1)
    open(P_THUMBS, 'w', encoding='utf-8').write(s); print('ok')


if __name__ == '__main__':
    main(sys.argv[1])
