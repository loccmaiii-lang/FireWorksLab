"""独立读取正式包和原视频；只在本复核目录保存证据。"""
from pathlib import Path
import hashlib
import importlib
import json
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
BASE = OUT.parent
sys.path.insert(0, str(ROOT / 'analysis/scripts'))
rc = importlib.import_module('回放检查')


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def read(p):
    return json.loads(p.read_text(encoding='utf-8-sig'))


font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 17)


def sheet(items, filename, cols=4, size=300):
    result = Image.new('RGB', (cols * size, ((len(items) + cols - 1) // cols) * (size + 30)), '#15171c')
    draw = ImageDraw.Draw(result)
    for i, (label, im) in enumerate(items):
        x, y = (i % cols) * size, (i // cols) * (size + 30)
        im = im.copy()
        im.thumbnail((size, size))
        result.paste(im, (x + (size - im.width) // 2, y + 30 + (size - im.height) // 2))
        draw.text((x + 4, y + 4), label, fill='white', font=font)
    result.save(OUT / filename, quality=95)


result = {'scope': '正式包、源存档及原片只读核查；非UE实播'}
pack = BASE / '正式包/PrismWheels3'
c = read(pack / 'cascade.json')
result['cascade_sha256'] = sha(pack / 'cascade.json')
result['plan_sig'] = c['source']['plan_sig']
result['textures'] = {k: {'exists': (pack / t['file']).is_file(), 'sha_matches': sha(pack / t['file']) == t['sha256']} for k, t in c['textures'].items()}
result['formal_replay'] = []
for i, e in enumerate(c['emitters']):
    if not e['name'].endswith('_Bloom'):
        continue
    p = rc.Pack(str(pack), i)
    # 通用回放检查的静态面片尺寸入口暂不识别uniform；用中值查看贴图，保留范围记录。
    sd = p.mods['InitialSize']['StartSize']
    size_range = sd.get('uniform')
    if size_range:
        sd.clear()
        sd['const'] = np.mean(size_range, axis=0).tolist()
    report = rc.check([p], str(OUT / (e['name'] + '_正式贴图回放.jpg')))
    result['formal_replay'].append({'name': e['name'], 'pass': report['pass'], 'life': p.life, 'frames': p.frames, 'size_range_cm': size_range, 'scope': '仅贴图质量；uniform取中值供静态摆图，不证明UE事件或随机尺寸', 'metrics': {k:v for k,v in report['layers'][0].items() if k in ['shown_frac','edge_max','empty_mid','empty_tail','saturated_max','max_skip','fails']}})

result['video'] = []
for tag, relative, samples, crop in [
    ('原A', 'vidio/2.0/万彩千轮A.mp4', [0,6,13,14,23,26,29,36,54,72,90,104], (1100,80,2300,1280)),
    ('原B', 'vidio/2.0/万彩千轮B.mp4', [0,3,9,15,24,36,45,54,63,72,81,98], (1100,80,2300,1280)),
    ('实际回放', 'analysis/results/PRISM3R2_20261016/整体回放.mp4', list(range(0,100,9)), None),
]:
    path = ROOT / relative
    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS)
    frames = []
    while True:
        ok, bgr = cap.read()
        if not ok:
            break
        frames.append(Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)))
    cap.release()
    result['video'].append({'file': relative, 'sha256': sha(path), 'fps': fps, 'decoded_frames': len(frames), 'size': frames[0].size})
    sheet([(f'{tag} F{j} {j/fps:.3f}s', frames[j].crop(crop) if crop else frames[j]) for j in samples], tag + '_独立抽帧.jpg')
    if tag == '原A':
        sheet([(f'M F{j} {j/fps:.3f}s', frames[j].crop((1965,490,2115,640))) for j in [21,22,23,24,25,26,27,29,36,45,54,63,72,81,90,104]], '原A_M独立逐帧.jpg', size=200)

game = np.asarray(Image.open(BASE / '整体游戏内大小.jpg').convert('RGB'))
result['game_evidence'] = []
for i, dist in enumerate([800,1000,1200]):
    a = game[33:, i*320:(i+1)*320]
    m = a.max(axis=2) > 35
    yy, xx = np.nonzero(m)
    result['game_evidence'].append({'distance': dist, 'bright_threshold': 35, 'bright_pixels': len(xx), 'bbox': [int(xx.min()), int(yy.min()), int(xx.max()), int(yy.max())] if len(xx) else None})

(OUT / '实物核查.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False, indent=2))
