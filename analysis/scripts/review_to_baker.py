"""迭代区数据：把「做完、等用户看」的东西写进 tool/data/review.js，用户 git pull 后刷新烘焙器，左栏「迭代区」就有。

两种条目：
  preset：花型参数类（best.json、尾缀配方）→ 点开后在烘焙器里实时模拟；
  asset ：导出的贴图类（单元序列等）→ 点开后按引擎方式播放，数据在结果目录的 preview.js（prism_preview.py 生成）。
每条都可以带实拍视频（相对 tool/ 的路径）、开花时刻和裁切，右栏「审阅」里写看什么、我的看法。

用户在烘焙器里点「通过」/「要改」+ 意见 → 存在浏览器里，「复制审阅意见」贴给 Claude。
用户通过后：把条目搬到 tool/src/js/15_replica.js 的 REPLICAS（正式库），并从这里删掉。

用法：python analysis/scripts/review_to_baker.py
"""
import base64, io, json, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
RES = os.path.join(ROOT, 'analysis', 'results')
OUT = os.path.join(ROOT, 'tool', 'data', 'review.js')

REVIEW = [
    dict(id='PW2', task='PW2', kind='asset', date='2026-09-28', name='万彩千轮 · 单元（实拍颜色）', src='PW2', video='vidio/2.0/万彩千轮B.mp4', tags='千轮 单元 粒子',
         note='「单元序列 × 粒子」：每颗小球是一段序列，Cascade 摆 24 颗。颜色按实拍测：炸开后约 1 秒本色（青绿、银白、淡黄、珊瑚红），然后变金，熄灭前转橙。',
         look=['颜色和变色时间像不像实拍', '小球大小、疏密、开花先后', '右栏「贴图」切换 A（16 帧）/ B（64 帧），看 A 的张开跳不跳'],
         opinion='并排看得出：实拍的小球更大、更密、互相叠在一起，模拟的小球之间空隙太大（两边画面比例还没按实拍校准）；变金的时间接近。下一轮 PW3 按实拍量小球数量、大小和分布半径。实拍天空是傍晚蓝，右栏「显示」里可打开傍晚天空底色。'),
    dict(id='PW1', task='PW1', kind='asset', date='2026-09-28', name='万彩千轮 · 单元（C/D 颜色）', src='PW1', video='vidio/2.0/万彩千轮B.mp4', tags='千轮 单元 粒子',
         note='和 PW2 同一套运动，颜色用你给的 C/D 包（青碧、玫红、蓝紫、橙金），不变色。留作对比。',
         look=['和 PW2 比，质感是否一致'], opinion=''),
    dict(id='TR2S', task='TR2', kind='preset', date='2026-09-28', name='升空尾缀 · 小（第五版）', size='S', base='trailS', video='vidio/2.0/尾缀C.mp4', tags='尾缀 上升 小',
         note='TR2 小档：造型对尾缀C，质感对尾缀3.0_A。',
         look=['长度（现在约 33 m，目标 20 m）', '火星颗粒大小、白热段是否连续'],
         opinion='偏长；颗粒太细太淡，实拍白热段更连续 → 下一轮 TR3 缩短、加大火星。'),
    dict(id='TR2M', task='TR2', kind='preset', date='2026-09-28', name='升空尾缀 · 中（第五版）', size='M', base='trailM', video='vidio/2.0/尾缀B.mp4', tags='尾缀 上升 中',
         note='TR2 中档：造型对尾缀B，质感对尾缀3.0_A。',
         look=['长度（约 58 m，目标 40 m）', '白热段与金色大火星'],
         opinion='实拍是过曝的白热段加大颗金色火星，模拟是细碎的淡金颗粒。'),
    dict(id='TR2L', task='TR2', kind='preset', date='2026-09-28', name='升空尾缀 · 大（第五版）', size='L', base='trailL', video='vidio/2.0/尾缀A.mp4', tags='尾缀 上升 大 四尺玉',
         note='TR2 大档：造型对尾缀A，质感对尾缀3.0_A。',
         look=['长度（约 129 m，目标 90 m）', '螺旋摆动、火星颗粒'],
         opinion='螺旋有了；火星同样偏细。'),
    dict(id='QN1', task='QN1', kind='preset', date='2026-09-28', name='青柠星（第 1 轮）', video='vidio/2.0/青柠星.mp4', tags='青柠 牡丹 变色',
         note='自动逼近 71 组，差距 0.66 → 0.33。',
         look=['大小、张开速度、颜色', '星尾、球壳边缘亮度'],
         opinion='缺星尾，球壳边缘不够亮 → 下一轮 QN2。'),
    dict(id='WC1', task='WC1', kind='preset', date='2026-09-28', name='万彩千轮（整体模拟，旧做法）', video='vidio/2.0/万彩千轮B.mp4', tags='千轮 子花',
         note='整朵一起模拟的旧做法，开头对，之后散成一片、颜色一起变。引擎做法已改为单元 × 粒子（看 PW2）。',
         look=['只作对比，不用审'], opinion='建议不通过，以 PW2 为准。'),
]


def thumb(path, box, size=160):
    im = Image.open(path).convert('RGB').crop(box).resize((size, size), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=72)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()


def trail_meta(rel):
    """尾缀：只看「动的亮点」（和中位数背景的差，去掉城市灯光这类固定亮点），取它们的横向重心做中心；
    竖向用整个画面高度（尾迹从下到上穿过画面），t0 = 亮痕第一次出现"""
    import cv2, numpy as np
    cap = cv2.VideoCapture(os.path.join(ROOT, rel)); fps = cap.get(5) or 30; frames = []
    while True:
        ok, f = cap.read()
        if not ok: break
        frames.append(cv2.resize(f, None, fx=0.5, fy=0.5).max(2).astype(np.float32))
    bg = np.median(np.stack(frames[::max(1, len(frames) // 40)]), 0)
    H, W = bg.shape; acc = np.zeros((H, W), np.float32); first = None
    for i, g in enumerate(frames):
        d = np.clip(g - bg - 25, 0, None)
        if d.sum() > 2000 and first is None: first = i / fps
        acc += d
    ys, xs = np.nonzero(acc > acc.max() * 0.05); w = acc[ys, xs]
    cx, cy = float((xs * w).sum() / w.sum()), float((ys * w).sum() / w.sum())
    return {'t0': round(first or 0, 3), 'cx': round(cx / W, 4), 'cy': round(min(max(cy / H, 0.5), 0.5), 4), 'half': 0.5, 'aspect': round(W / H, 4)}


META_VER = 7


def burst_meta(rel):
    """花型：开花时刻 = refkit.find_burst；取景中心 = 整个燃烧期亮部的加权重心（千轮这类多团的也居中），
    半宽 = 亮部到中心距离的 97 分位 × 1.15（整朵都在框里、四周留一点空）"""
    import numpy as np
    from refkit import read_video, find_burst, star_mask
    fr, fps = read_video(os.path.join(ROOT, rel), 0.5)
    b = find_burst(fr); H, W = fr[0][1].shape[:2]
    # 只数星点（亮部里的局部极大值，烟和被照亮的天空不算），整个燃烧期都算；取景框 = 星点横竖各 3–97 分位的外框
    import cv2
    px, py = [], []
    for i in range(b['i0'], b['ie'] + 1):
        d, m, thr = star_mask(fr[i][1], b['bg'])
        mx = cv2.dilate(d, np.ones((5, 5), np.uint8)); ys, xs = np.nonzero((d >= mx) & (d > 2 * thr))
        px.append(xs); py.append(ys)
    xs, ys = np.concatenate(px).astype(np.float32), np.concatenate(py).astype(np.float32)
    x0, x1, y0, y1 = np.percentile(xs, 3), np.percentile(xs, 97), np.percentile(ys, 3), np.percentile(ys, 97)
    cx, cy = float(x0 + x1) / 2, float(y0 + y1) / 2; r97 = float(max(x1 - x0, y1 - y0)) / 2 * 1.2
    return {'v': META_VER, 't0': round(b['t0'], 3), 'cx': round(cx / W, 4), 'cy': round(cy / H, 4), 'half': round(min(0.5, r97 / H), 4), 'aspect': round(W / H, 4)}


def video_meta(rel, trail=False):
    """实拍对照的开花时刻和取景（中心、半宽，都按画面高度归一化），缓存在 tool/data/video_meta.json"""
    cache = os.path.join(ROOT, 'tool', 'data', 'video_meta.json')
    db = json.load(open(cache, encoding='utf-8')) if os.path.exists(cache) else {}
    if rel not in db or db[rel].get('v') != META_VER:
        db[rel] = trail_meta(rel) if trail else burst_meta(rel); db[rel]['v'] = META_VER
        json.dump(db, open(cache, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return db[rel]


def main():
    out = []
    for e in REVIEW:
        e = dict(e); d = os.path.join(RES, e['task']); rec = {k: e[k] for k in ('id', 'task', 'kind', 'date', 'name', 'note', 'look', 'opinion', 'tags')}
        rec['video'] = '../' + e['video']
        if e['kind'] == 'asset':
            rec['src'] = f"../analysis/results/{e['src']}/preview.js"
            jp = os.path.join(RES, e['src'], 'PrismWheels_整朵预览.jpg'); w, h = Image.open(jp).size
            rec['thumbSim'] = thumb(jp, (int(h * 1.0), 0, int(h * 2.0), h))
            rec['vmeta'] = video_meta(e['video'])
            tr = thumb_from_video(e['video'], rec['vmeta'], 0.9)
            if tr: rec['thumbRef'] = tr
        elif 'size' in e:
            j = json.load(open(os.path.join(d, f"尾缀_{e['size']}_配方.json"), encoding='utf-8'))
            rec['base'] = e['base']; rec['m'] = j.get('_ramp', {}); rec['p'] = {k: v for k, v in j.items() if not k.startswith('_')}
            sp = os.path.join(d, f"尾缀_{e['size']}_对照.jpg"); w, h = Image.open(sp).size; s0 = min(h, int(w * 0.36))
            rec['thumbRef'], rec['thumbSim'] = thumb(sp, (0, 0, s0, s0)), thumb(sp, (int(w * 0.52), 0, int(w * 0.52) + s0, s0))
            rec['vmeta'] = video_meta(e['video'], trail=True)
        else:
            j = json.load(open(os.path.join(d, 'best.json'), encoding='utf-8')); P = j['P']
            rec['base'] = P.get('type', 'kiku'); rec['p'] = {k: v for k, v in P.items() if k != 'type'}; rec['m'] = j['M']
            sheet = os.path.join(d, '对照.jpg')
            rec['thumbRef'], rec['thumbSim'] = thumb(sheet, (390, 30, 690, 330)), thumb(sheet, (390, 330, 690, 630))
            rec['vmeta'] = video_meta(e['video'])
        out.append(rec)
    # 正式库里带参考视频的，也算好取景（烘焙器里点正式库条目同样能并排看实拍）
    import re
    vm = {}
    for v in sorted(set(re.findall(r"video: '(vidio/[^']+\.mp4)'", open(os.path.join(ROOT, 'tool', 'src', 'js', '15_replica.js'), encoding='utf-8').read()))):
        if os.path.exists(os.path.join(ROOT, v)): vm['../' + v] = video_meta(v)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8').write('// 由 analysis/scripts/review_to_baker.py 生成：迭代区（做完、等你看的东西）。不要手改。\n'
                                          'var FW_REVIEW = ' + json.dumps(out, ensure_ascii=False, indent=0) + ';\n'
                                          'var FW_VMETA = ' + json.dumps(vm, ensure_ascii=False) + ';\n')
    print('迭代区', len(out), '项 →', OUT, f'{os.path.getsize(OUT) / 1024:.0f} KB')


def thumb_from_video(rel, vm, dt):
    import cv2
    cap = cv2.VideoCapture(os.path.join(ROOT, rel)); fps = cap.get(5) or 30
    cap.set(cv2.CAP_PROP_POS_FRAMES, int((vm['t0'] + dt) * fps)); ok, f = cap.read()
    if not ok: return None
    H, W = f.shape[:2]; cx, cy, hf = vm['cx'] * W, vm['cy'] * H, vm['half'] * H
    box = (int(cx - hf), int(cy - hf), int(cx + hf), int(cy + hf))
    im = Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB)).crop(box).resize((160, 160), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=72)
    return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()


if __name__ == '__main__':
    main()
