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
    # 升空尾缀（物理 v1）：烘焙器里实时模拟（花型 physS / physM / physL，43_phystrail.js），镜头跟着星头；实拍面板按同一比例逐帧跟拍
    dict(id='TPS', task='TPS', kind='preset', phys='S', date='2026-09-29', name='升空尾缀 · 物理 小（对照 尾缀C）', video='vidio/2.0/尾缀C.mp4', tags='尾缀 上升 物理 小 TPS',
         note='烘焙器里实时模拟（和花型模板一样，右栏滑杆可调）。物理模型按 尾缀C 校准：出膛 97 m/s、约 6 s 开花、偏向右上。尾缀C 开拍时弹已经飞了 2.2 秒，所以实拍前 2.2 秒是空的。',
         look=['左右两边同一比例、镜头都跟着星头：星头后面白热段有多长、多粗', '白热段 → 金色火星 → 橙色零星火点 的过渡和疏密', '尾迹上的小波纹、随风偏移'],
         opinion='09-29 下午改成烘焙器实时模拟（之前是远景播放引擎贴图，看不清，星头还是一根会甩的长条——已去掉，星头改成跟着弹道走的泪滴形火焰）。尾缀C 的火星更橙、更散，是三档里最「一颗颗」的。'),
    dict(id='TPM', task='TPM', kind='preset', phys='M', date='2026-09-29', name='升空尾缀 · 物理 中（对照 尾缀B）', video='vidio/2.0/尾缀B.mp4', tags='尾缀 上升 物理 中 TPM',
         note='烘焙器里实时模拟（右栏滑杆可调）。物理模型按 尾缀B 校准：出膛 122 m/s、4.4 s 开花。尾迹是停在空中的火星：弹体越慢，尾迹越短越密。',
         look=['和实拍并排：尾迹长度随时间怎么变（出膛长 → 到顶短）', '白热段 → 金色火星 → 零星火点 的过渡', '视野高度（右栏「物理尾缀 · 镜头」）拉近看火星颗粒'],
         opinion='结构对：星头 → 白热段 → 金色火星一颗颗散开。还差：星头后面的连续白热段比实拍短、细（实拍是一大段过曝白柱，模拟很快散成颗粒）；后半程可见尾迹偏长（到顶前实拍约 92 m，模拟约 147 m）。实拍是暮色亮蓝天空、模拟是黑底，比颜色时注意。'),
    dict(id='TPL', task='TPL', kind='preset', phys='L', date='2026-09-29', name='升空尾缀 · 物理 大（对照 尾缀A）', video='vidio/2.0/尾缀A.mp4', tags='尾缀 上升 物理 大 TPL',
         note='烘焙器里实时模拟（右栏滑杆可调）。物理模型按 尾缀A 校准：出膛 119 m/s、升得最久（约 6.4 s），弹体摆动最大（约 1 m），尾迹波浪最明显。',
         look=['尾迹的大波浪、整体随风偏移', '白热段长度、下半段橙色火星的疏密', '和小、中两档一起比'],
         opinion='大波浪和火星团块的疏密接近实拍。还差：过曝白热段偏短（模拟更早变成橙色火星）。视频在开花前就结束了，开花时刻是按弹道估的。'),
    dict(id='PW3', task='PW3', kind='asset', date='2026-09-29', name='万彩千轮 · 单元（第 3 版）', src='PW3', video='vidio/2.0/万彩千轮B.mp4', tags='千轮 单元 粒子 PW3',
         note='按 PW2 并排对照改：每颗小球更密（两套点位叠加，约 120 颗星）、星点更亮（×1.25）；小球更大（半径 9 → 11.5 m，约为团半径的 0.26）、更多（24 → 30 颗）、在 0.45 秒内陆续开；颜色比例按实拍（青绿最多、珊瑚红最少）；取景和实拍一样按整团外框。',
         look=['和实拍比：小球大小、疏密、互相叠在一起的程度', '颜色和变金的时间', '右栏「贴图」切换 A（16 帧）/ B（64 帧）'],
         opinion='这是我按 PW2 的并排对照自己改的一版。小球数量和大小是按实拍估的，如果还是偏稀，下一版再加到 36 颗。'),
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


def burst_meta(rel, roi=None, t_range=None):
    """花型：开花时刻 = refkit.find_burst；取景中心 = 整个燃烧期亮部的加权重心（千轮这类多团的也居中），
    半宽 = 亮部到中心距离的 97 分位 × 1.15（整朵都在框里、四周留一点空）"""
    import numpy as np
    from refkit import read_video, find_burst, star_mask
    t0, t1 = t_range or (0.0, 1e9)
    fr, fps = read_video(os.path.join(ROOT, rel), 0.5, t0, t1)
    H, W = fr[0][1].shape[:2]; ox = oy = 0
    if roi:   # 只看这一块（远景里有观众、地面火、别的烟花时）；算完再换回整幅画面的坐标
        ox, oy = int(roi[0] * W), int(roi[1] * H)
        fr = [(t, np.ascontiguousarray(f[oy:int(roi[3] * H), ox:int(roi[2] * W)])) for t, f in fr]
    b = find_burst(fr)
    # 只数星点（亮部里的局部极大值，烟和被照亮的天空不算），整个燃烧期都算；取景框 = 星点横竖各 3–97 分位的外框
    import cv2
    px, py = [], []
    for i in range(b['i0'], b['ie'] + 1):
        d, m, thr = star_mask(fr[i][1], b['bg'])
        mx = cv2.dilate(d, np.ones((5, 5), np.uint8)); ys, xs = np.nonzero((d >= mx) & (d > 2 * thr))
        px.append(xs); py.append(ys)
    xs, ys = np.concatenate(px).astype(np.float32), np.concatenate(py).astype(np.float32)
    x0, x1, y0, y1 = np.percentile(xs, 3), np.percentile(xs, 97), np.percentile(ys, 3), np.percentile(ys, 97)
    cx, cy = float(x0 + x1) / 2 + ox, float(y0 + y1) / 2 + oy; r97 = float(max(x1 - x0, y1 - y0)) / 2 * 1.2
    return {'v': META_VER, 't0': round(b['t0'], 3), 'cx': round(cx / W, 4), 'cy': round(cy / H, 4), 'half': round(min(0.5, r97 / H), 4), 'aspect': round(W / H, 4)}


def video_meta(rel, trail=False, roi=None, t_range=None):
    """实拍对照的开花时刻和取景（中心、半宽，都按画面高度归一化），缓存在 tool/data/video_meta.json。
    同一段视频里有几发时，用 roi / t_range 指定是哪一发（缓存按「视频 + 区域 + 时间段」分开记）"""
    cache = os.path.join(ROOT, 'tool', 'data', 'video_meta.json')
    db = json.load(open(cache, encoding='utf-8')) if os.path.exists(cache) else {}
    key = rel + ('' if not (roi or t_range) else '#' + json.dumps([roi, t_range]))
    if key not in db or db[key].get('v') != META_VER:
        db[key] = trail_meta(rel) if trail else burst_meta(rel, roi, t_range); db[key]['v'] = META_VER
        json.dump(db, open(cache, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return db[key]


ARCHIVE = {'TP1', 'WC1', 'PW1', 'PW2', 'TR2S', 'TR2M', 'TR2L', 'QN1'}   # TR2 S/M/L：用户认可 V5，已进入正式库；其余条目由新版取代


def job_entries():
    """analysis/jobs/<id>.json 里带 "review" 的任务：没跑完 → 「排队」条目；跑完 → 自动变成可看的条目"""
    out = []
    jd = os.path.join(ROOT, 'analysis', 'jobs')
    for f in sorted(os.listdir(jd)):
        if not f.endswith('.json'): continue
        j = json.load(open(os.path.join(jd, f), encoding='utf-8')); r = j.get('review')
        if not r: continue
        d = os.path.join(RES, j['id']); done = os.path.exists(os.path.join(d, 'done.json'))
        e = dict(id=j['id'], task=j['id'], date=r.get('date', ''), name=r['name'], note=r.get('note', j.get('note', '')), look=r.get('look', []),
                 tags=r.get('tags', ''), video=r.get('video', j.get('video')), replaces=r.get('replaces', []), size=r.get('size'), base=r.get('base'),
                 roi=r.get('roi', j.get('roi')), t_range=r.get('t_range', j.get('t_range')))
        op = os.path.join(d, '看法.md')
        e['opinion'] = open(op, encoding='utf-8').read().strip() if os.path.exists(op) else (r.get('opinion') or ('' if not done else 'Claude 还没看这一版（你本地刚跑完就自动出现在这里）。看完有意见直接写。'))
        if not done:
            e['kind'] = 'queued'; e['opinion'] = r.get('opinion', '')
            if j.get('hold') or j.get('ready') is False: e['note'] = '【先不跑：' + (j.get('hold') or '还没放行') + '】' + e['note']
            out.append(e); continue
        if os.path.exists(os.path.join(d, 'error.json')): e['kind'] = 'queued'; e['note'] = '跑的时候出错了，Claude 会看日志修。' + e['note']; out.append(e); continue
        e['kind'] = 'asset' if os.path.exists(os.path.join(d, 'preview.js')) else 'preset'
        if e['kind'] == 'asset': e['src'] = j['id']
        try:
            nv = json.load(open(os.path.join(d, '数值.json'), encoding='utf-8'))
            lg = open(os.path.join(d, 'log.txt'), encoding='utf-8').read()
            import re
            m0 = re.search(r'起点 差距 ([0-9.]+)', lg)
            e['note'] += f"　差距 {m0.group(1) + ' → ' if m0 else ''}{nv.get('差距')}。"
        except Exception: pass
        # 多层组合（大组合）的结果：每层一条正式库形式的条目（<任务号>-<层号>），再加一个组合页预设
        try: bj = json.load(open(os.path.join(d, 'best.json'), encoding='utf-8'))
        except Exception: bj = {}
        if (bj.get('P') or {}).get('layers'):
            # 用户 2026-09-30：分层条目审起来不方便、看不出整体 → 迭代区只放一条「组合条目」（整体效果，点开进组合页实时模拟 + 实拍），
            # 各层作为隐藏条目（组合引用它们；审阅卡里可以单独打开某一层调参数）
            lays, lids = [], []
            for i, L in enumerate(bj['P']['layers']):
                le = dict(e, id=f"{j['id']}-{i + 1}", layer=i, name=f"{r['name']} · {L.get('name') or ('第 ' + str(i + 1) + ' 层')}",
                          note=f"组合任务 {j['id']} 的第 {i + 1} 层（组合页有整组叠起来的效果）。" + e['note'], replaces=[], hidden=True, layerOf=j['id'])
                out.append(le); lids.append(le['id']); lays.append({'m': 'rep:' + le['id'], 'scale': L.get('scale', 1), 'delay': L.get('delay', 0)})
            cname = r['name'] + f"（{j['id']}）"
            JOB_COMBOS.append({'name': cname, 'layers': lays})
            out.append(dict(e, kind='combo', combo={'name': cname, 'layers': lays}, layerIds=lids, layerNames=[L.get('name') or f'第 {i + 1} 层' for i, L in enumerate(bj['P']['layers'])]))
            continue
        out.append(e)
    return out


JOB_COMBOS = []      # job_entries() 顺带收集：多层组合任务跑完后的组合页预设


PRINCIPLE = os.path.join(ROOT, 'analysis', '原理', '条目.json')
ITER = os.path.join(ROOT, 'analysis', '迭代', '条目.json')


def principle_entries():
    """正式库形式的条目（花型库模板 + p/m 参数：右栏参数、实时 / 导出效果 / 贴图、导出都有）：
    analysis/原理/条目.json —— 效果原理解析（审阅卡带「原理解析 · 待你核对」徽标）；另有 条目_<名>.json（大组合等，
    分文件是为了两个对话框各改各的）；
    analysis/迭代/条目.json —— 其余迭代（比如金芒菊去糊的格子方案）"""
    import glob
    out, combos = [], []
    extra = sorted(f for f in glob.glob(os.path.join(os.path.dirname(PRINCIPLE), '条目_*.json')))
    for f, principle in [(PRINCIPLE, True)] + [(x, True) for x in extra] + [(ITER, False)]:
        if not os.path.exists(f): continue
        j = json.load(open(f, encoding='utf-8'))
        for e in j.get('entries', []):
            e = dict(e); e.setdefault('task', e['id']); e['kind'] = 'preset'; e['explicit'] = True; e['principle'] = principle; out.append(e)
        for c in j.get('combos', []):
            combos.append({k: c[k] for k in ('name', 'layers')})
            if c.get('id'):      # 组合条目：一个效果一条（用户 2026-09-30）；引用到的层在迭代区里隐藏
                lids = [L['m'][4:] for L in c['layers'] if L['m'].startswith('rep:')]
                ce = dict(c, kind='combo', task=c['id'], combo={'name': c['name'], 'layers': c['layers']}, layerIds=lids, principle=principle)
                ce.setdefault('layerNames', [next((x['name'] for x in j.get('entries', []) if x['id'] == i), i) for i in lids])
                out.append(ce)
                for x in out:
                    if x['id'] in lids: x['hidden'] = True; x['layerOf'] = c['id']
    return out, combos


def build(e):
    d = os.path.join(RES, e['task']); rec = {k: e.get(k) for k in ('id', 'task', 'kind', 'date', 'name', 'note', 'look', 'opinion', 'tags', 'doc', 'imagesTitle', 'principle')}
    if e.get('images'): rec['images'] = [['../' + a, b] for a, b in e['images']]
    if e.get('video'): rec['video'] = '../' + e['video']
    trail = bool(e.get('size'))
    vmf = os.path.join(RES, e.get('src') or e['task'], 'vmeta.json')      # 结果目录自带取景（按模拟的世界坐标算好的，实拍和模拟同比例）
    if e.get('video') and not e.get('phys'): rec['vmeta'] = json.load(open(vmf, encoding='utf-8')) if os.path.exists(vmf) else video_meta(e['video'], trail=trail, roi=e.get('roi'), t_range=e.get('t_range'))
    if rec.get('vmeta') and e.get('burst_t') is not None: rec['vmeta'] = dict(rec['vmeta'], t0=e['burst_t'])   # 自动找的开花时刻不对时手填（例：千轮主玉闪光太弱，自动找到的是子花）
    if e.get('hidden'): rec['hidden'] = True; rec['layerOf'] = e.get('layerOf')
    if e['kind'] == 'queued': return rec      # 排队中：只有实拍（烘焙器里显示「要对的目标」）
    if e['kind'] == 'combo':
        rec['combo'] = e['combo']; rec['layerIds'] = e.get('layerIds', []); rec['layerNames'] = e.get('layerNames', [])
        sheet = os.path.join(d, '对照.jpg')
        if os.path.exists(sheet): rec['thumbRef'], rec['thumbSim'] = thumb(sheet, (390, 30, 690, 330)), thumb(sheet, (390, 330, 690, 630))
        elif e.get('video'):
            tr = thumb_from_video(e['video'], rec['vmeta'], e.get('thumb_dt', 1.0))
            if tr: rec['thumbRef'] = tr
        return rec
    if e['kind'] == 'asset':
        rec['src'] = f"../analysis/results/{e['src']}/preview.js"
        jp = next((os.path.join(RES, e['src'], x) for x in ('PrismWheels_整朵预览.jpg', '预览.jpg') if os.path.exists(os.path.join(RES, e['src'], x))), None)
        if jp: w, h = Image.open(jp).size; rec['thumbSim'] = thumb(jp, (min(w - h, h), 0, min(w - h, h) + h, h))
        if e.get('video'):
            tr = thumb_from_video(e['video'], rec['vmeta'], e.get('thumb_dt', 0.9))
            if tr: rec['thumbRef'] = tr
    elif e.get('explicit'):
        rec['base'] = e['base']; rec['p'] = e.get('p', {}); rec['m'] = e.get('m', {})
        if e.get('principle'): rec['principle'] = True
        if e.get('video'):
            tr = thumb_from_video(e['video'], rec['vmeta'], e.get('thumb_dt', 0.8))
            if tr: rec['thumbRef'] = tr
    elif e.get('phys'):
        import phys_to_baker as PB
        k = e['phys']; rec['base'] = 'phys' + k; rec['p'] = {}; rec['m'] = PB.baker_m()
        if e.get('video'): rec['vmeta'] = dict(PB.follow(k), cx=0.5, cy=0.5, half=0.5); rec['vmeta']['follow'] = PB.follow(k)
        jp = os.path.join(RES, e['task'], '预览.jpg')
        if os.path.exists(jp): w, h = Image.open(jp).size; rec['thumbSim'] = thumb(jp, (min(w - h, h), 0, min(w - h, h) + h, h))
        if e.get('video'):
            tr = thumb_from_video(e['video'], dict(t0=PB.follow(k)['t0'], cx=PB.follow(k)['launch'][0] / PB.follow(k)['aspect'], cy=PB.follow(k)['launch'][1] - 0.3, half=0.3), 3.0)
            if tr: rec['thumbRef'] = tr
    elif trail:
        j = json.load(open(os.path.join(d, f"尾缀_{e['size']}_配方.json"), encoding='utf-8'))
        rec['base'] = e.get('base') or 'trail' + e['size']; rec['m'] = j.get('_ramp', {}); rec['p'] = {k: v for k, v in j.items() if not k.startswith('_')}
        sp = os.path.join(d, f"尾缀_{e['size']}_对照.jpg"); w, h = Image.open(sp).size; s0 = min(h, int(w * 0.36))
        rec['thumbRef'], rec['thumbSim'] = thumb(sp, (0, 0, s0, s0)), thumb(sp, (int(w * 0.52), 0, int(w * 0.52) + s0, s0))
    elif e.get('layer') is not None:
        j = json.load(open(os.path.join(d, 'best.json'), encoding='utf-8')); L = j['P']['layers'][e['layer']]; P = L['P']
        rec['base'] = P.get('type', 'kiku'); rec['p'] = {k: v for k, v in P.items() if k != 'type' and not k.startswith('_')}; rec['m'] = L.get('M') or {}
        sheet = os.path.join(d, '对照.jpg')
        rec['thumbRef'], rec['thumbSim'] = thumb(sheet, (390, 30, 690, 330)), thumb(sheet, (390, 330, 690, 630))
    else:
        j = json.load(open(os.path.join(d, 'best.json'), encoding='utf-8')); P = j['P']
        rec['base'] = P.get('type', 'kiku'); rec['p'] = {k: v for k, v in P.items() if k != 'type' and not k.startswith('_')}; rec['m'] = j['M']
        sheet = os.path.join(d, '对照.jpg')
        rec['thumbRef'], rec['thumbSim'] = thumb(sheet, (390, 30, 690, 330)), thumb(sheet, (390, 330, 690, 630))
    return rec


def main():
    ents = []
    for e in REVIEW:
        e = dict(e); e.setdefault('task', e['id'])
        if e['kind'] == 'asset': e['src'] = e.get('src', e['task'])
        ents.append(e)
    pe, combos = principle_entries(); ents += pe
    auto = job_entries(); ids = {e['id'] for e in ents}; combos += JOB_COMBOS
    ents += [e for e in auto if e['id'] not in ids]
    gone = set(ARCHIVE)
    for e in ents:
        if e['kind'] != 'queued': gone |= set(e.get('replaces') or [])
    # 被取代 / 否决的版本不删：标成历史（用户 2026-09-30 14:46：失败版和被替代版归入历史，保留文件、参数、对照和反馈）
    for e in ents:
        if e['id'] in gone and e['kind'] != 'queued': e['superseded'] = True
    ents = [e for e in ents if not (e['id'] in gone and (e['kind'] == 'queued' or e['id'] in ('TR2S', 'TR2M', 'TR2L')))]
    # 顺序：能看的在前（新的在前），排队的在后
    ents.sort(key=lambda e: (e['kind'] == 'queued', '' if e['kind'] == 'queued' else '~' + (e.get('date') or '')), reverse=False)
    ready = sorted([e for e in ents if e['kind'] != 'queued'], key=lambda e: e.get('date') or '', reverse=True)
    ents = ready + [e for e in ents if e['kind'] == 'queued']
    out = []
    for e in ents:
        try:
            rec = build(e)
            if e.get('superseded'): rec['superseded'] = True
            out.append(rec)
        except Exception as ex: print('跳过', e['id'], ex)
    fingerprint(out)
    effects = effects_from_status(out)
    # 正式库里带参考视频的，也算好取景（烘焙器里点正式库条目同样能并排看实拍）
    import re
    vm = {}
    replicas = open(os.path.join(ROOT, 'tool', 'src', 'js', '15_replica.js'), encoding='utf-8').read()
    trail_videos = set(re.findall(r"base: 'trail[SML]', video: '(vidio/[^']+\.mp4)'", replicas))
    for v in sorted(set(re.findall(r"video: '(vidio/[^']+\.mp4)'", replicas))):
        if os.path.exists(os.path.join(ROOT, v)): vm['../' + v] = video_meta(v, trail=v in trail_videos)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8').write('// 由 analysis/scripts/review_to_baker.py 生成：迭代区（做完、等你看的东西）。不要手改。\n'
                                          'var FW_REVIEW = ' + json.dumps(out, ensure_ascii=False, indent=0) + ';\n'
                                          'var FW_VMETA = ' + json.dumps(vm, ensure_ascii=False) + ';\n'
                                          'var FW_REVIEW_COMBOS = ' + json.dumps(combos, ensure_ascii=False) + ';\n'
                                          'var FW_EFFECTS = ' + json.dumps(effects, ensure_ascii=False, indent=0) + ';\n')
    write_status_md(effects)
    print('迭代区', len(out), '项（排队', sum(1 for e in out if e['kind'] == 'queued'), '）→', OUT, f'{os.path.getsize(OUT) / 1024:.0f} KB')


def fingerprint(out):
    """版本指纹：条目的参数（p / m / 组合各层）变了，指纹就变 → 审阅标记按「条目 + 指纹」记，导出按指纹判断是否过期"""
    import hashlib
    h = lambda o: hashlib.sha1(json.dumps(o, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:8]
    by = {}
    for r in out:
        if r.get('kind') in ('preset',) or r.get('base'): r['ver'] = h([r.get('base'), r.get('p'), r.get('m')])
        elif r.get('kind') == 'asset': r['ver'] = h([r.get('src'), r.get('date')])
        by[r['id']] = r
    for r in out:
        if r.get('kind') == 'combo': r['ver'] = h([r.get('combo'), [by.get(i, {}).get('ver') for i in r.get('layerIds', [])]])
        r.setdefault('ver', h([r.get('id'), r.get('date')]))


STATUS = os.path.join(ROOT, '协作', '状态清单.json')
JOB_EFFECT = [('QA', 'qiuxing_a'), ('QB', 'qiuxing_b'), ('QC', 'qiuxing_c'), ('QD', 'qiuxing_d'), ('QN', 'qingning'), ('JM', 'jinmangju'),
              ('HK', 'hongchao'), ('FS', 'yongfeng'), ('PK', 'pianbei'), ('TR', 'trail_v5'), ('PW', 'wancai'), ('WC', 'wancai'), ('TF', 'trail_phys')]


def job_effect(j):
    if j.get('effect'): return j['effect']
    return next((k for p, k in JOB_EFFECT if j['id'].startswith(p)), None)


def effects_from_status(out):
    """协作/状态清单.json → 烘焙器左栏「待我验收 / 制作中 / 已通过」的数据；顺带算 在算的任务、导出是否过期、效果缩略图"""
    if not os.path.exists(STATUS): return []
    st = json.load(open(STATUS, encoding='utf-8')); by = {r['id']: r for r in out}
    jd = os.path.join(ROOT, 'analysis', 'jobs'); jobs = {}
    for f in sorted(os.listdir(jd)):
        if not f.endswith('.json'): continue
        j = json.load(open(os.path.join(jd, f), encoding='utf-8')); k = job_effect(j)
        if not k: continue
        d = os.path.join(RES, j['id']); state = ('出错' if os.path.exists(os.path.join(d, 'error.json')) else '已回来') if os.path.exists(os.path.join(d, 'done.json')) or os.path.exists(os.path.join(d, 'error.json')) else ('挂起' if j.get('ready') is False else '在算')
        seen = os.path.exists(os.path.join(d, '看法.md'))
        jobs.setdefault(k, []).append(dict(id=j['id'], type=j.get('type', 'fit'), state=state, seen=seen))
    res = []
    for e in st['effects']:
        r = dict(e); k = e['key']
        main = (e.get('主条目') or '').replace('rep:', '')
        me = by.get(main) or by.get(e.get('主条目'))
        r['ver'] = me.get('ver') if me else None
        r['jobs'] = jobs.get(k, [])
        # 导出：analysis/results/<任务>/导出清单.json（export_job.py 写）；旧导出任务没有清单 → 「旧导出，版本未知」
        ex = []
        for jid in set([x['id'] for x in r['jobs'] if x['type'] == 'export' and x['state'] == '已回来'] + (e.get('导出任务') or [])):
            mf = os.path.join(RES, jid, '导出清单.json')
            if os.path.exists(mf):
                m = json.load(open(mf, encoding='utf-8'))
                ex.append(dict(job=jid, entry=m.get('entry'), ver=m.get('ver'), time=m.get('time'), packages=m.get('packages', []),
                               stale=bool(m.get('entry') and by.get(m['entry']) and by[m['entry']].get('ver') != m.get('ver'))))
            elif os.path.exists(os.path.join(RES, jid, 'done.json')): ex.append(dict(job=jid, legacy=True))
        r['exports'] = ex
        # 缩略图：参考视频里最亮的一刻（认得出是什么效果），没有就用主条目的
        src = me or {}
        r['thumb'] = peak_thumb(e['参考'][0], src.get('vmeta')) if e.get('参考') and src.get('vmeta') else (src.get('thumbRef') or src.get('thumbSim'))
        r['thumbSim'] = src.get('thumbSim')
        res.append(r)
    return res


def peak_thumb(rel, vm, span=5.0):
    """在开花后 span 秒里找画面最亮的一帧（亮点最多），按取景裁成方图"""
    import cv2, numpy as np
    cache = os.path.join(ROOT, 'tool', 'data', 'effect_thumbs.json')
    db = json.load(open(cache, encoding='utf-8')) if os.path.exists(cache) else {}
    key = rel + '#' + json.dumps([round(vm.get('t0', 0), 3), vm.get('cx'), vm.get('cy'), vm.get('half')])
    if key in db: return db[key]
    cap = cv2.VideoCapture(os.path.join(ROOT, rel)); fps = cap.get(5) or 30; n = int(cap.get(7) or 0)
    best, bi = -1, None
    for k in range(26):
        t = vm.get('t0', 0) + span * k / 25; fi = int(t * fps)
        if n and fi >= n: break
        cap.set(cv2.CAP_PROP_POS_FRAMES, fi); ok, f = cap.read()
        if not ok: break
        H, W = f.shape[:2]; cx, cy, hf = vm['cx'] * W, vm['cy'] * H, vm['half'] * H
        c = f[max(0, int(cy - hf)):int(cy + hf), max(0, int(cx - hf)):int(cx + hf)]
        g = cv2.cvtColor(c, cv2.COLOR_BGR2GRAY); sc = float((g > 170).sum())
        if sc > best: best, bi = sc, (f, (int(cx - hf), int(cy - hf), int(cx + hf), int(cy + hf)))
    if not bi: return None
    f, box = bi
    im = Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB)).crop(box).resize((160, 160), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=74)
    v = 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
    db[key] = v; json.dump(db, open(cache, 'w', encoding='utf-8'))
    return v


def write_status_md(effects):
    """协作/状态清单.md：给人看的版本（由 状态清单.json + 任务 / 导出情况生成，不要手改）"""
    L = ['# 效果状态清单（生成的，改 `协作/状态清单.json`）', '',
         '阶段：**待验收** = AI 已自检 + 导出回放检查、等用户看整体；**制作中** = AI 在做，用户不用看；**已通过** = 用户点过通过。', '',
         '| 效果 | 负责 | 阶段 | 主条目 | 计算 / AI自检 / 导出 / 用户验收 | 任务 | 导出 | 下一步 |', '| --- | --- | --- | --- | --- | --- | --- | --- |']
    ok = lambda b: '✅' if b else '—'
    for e in effects:
        g = e.get('进度') or {}
        jobs = '、'.join(f"{j['id']}{'（' + j['state'] + ('，未看' if j['state'] == '已回来' and not j['seen'] else '') + '）' if j['state'] != '已回来' or not j['seen'] else ''}" for j in e['jobs'][-4:]) or '—'
        ex = '、'.join(('旧导出 ' + x['job']) if x.get('legacy') else (x['job'] + ('（已过期）' if x['stale'] else '（当前版本）')) for x in e['exports']) or '未生成'
        L.append(f"| {e['名']} | {e.get('负责', '')} | {e.get('阶段', '')} | {e.get('主条目') or '—'} | {ok(g.get('计算'))} {ok(g.get('AI自检'))} {ok(g.get('素材导出'))} {ok(g.get('用户验收'))} | {jobs} | {ex} | {e.get('下一步', '')} |")
    L += ['', '各效果的历史版本（否决 / 被取代）和用户反馈见 `状态清单.json` 的「历史」；烘焙器左栏「历史」页能打开。']
    open(os.path.join(ROOT, '协作', '状态清单.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')


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
