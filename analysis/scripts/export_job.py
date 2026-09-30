"""本地导出任务（显卡）：按复刻配方 + 参数改动导出一套完整素材。
任务文件：
  { "id": "JM1", "type": "export", "name": "...",
    "replica": "JM",                 # tool/src/js/15_replica.js 里的复刻 id（或者用 "params": 参数 JSON 路径）
    "exports": { "导出名": {参数改动}, ... } }   # 每一项导出一套（贴图、帧号测试图、渐变图、参数表、曲线、JSON）
  2026-09-30 起推荐的写法（按条目导出，自动记版本，烘焙器据此判断素材包是否和当前版本一致）：
  { "id": "XE1", "type": "export", "effect": "<状态清单 key>", "entry": "<条目号，可以是组合条目>", "name": "效果名（素材包目录名）" }
    组合条目：每一层导出一套，目录名 <name>_<层号>；单条目：一套，目录名 <name>。
    导出项里写 "_replica": "<条目号>" 可以单独指定某一项用哪个条目。
  结果目录多一个 导出清单.json：{effect, entry, ver, time, packages:[{name, replica, files}]}
素材包（spec/pipeline_v1.md：一个效果一个固定目录，cascade.json + 贴图，文件名固定）留在本机 analysis/local/输出/素材包/<导出名>/，
重新导出覆盖同一目录；上传到 analysis/results/<id>/ 的只有参数表、JSON、cascade.json 和贴图的缩略预览。
"""
import os, sys, json, io, base64, zipfile, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cvcompat  # noqa: F401
import cv2
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def preview(png_path, out_path, max_side=1024):
    """RGBA 接力贴图的缩略预览：四个通道横排，每个缩到 max_side/2"""
    im = np.array(Image.open(png_path))
    if im.ndim == 2: im = im[..., None]
    ch = [im[..., c] for c in range(min(4, im.shape[2]))]
    h = max_side // 2; tiles = [cv2.resize(c, (h, h), interpolation=cv2.INTER_AREA) for c in ch]
    cv2.imwrite(out_path, np.hstack(tiles), [cv2.IMWRITE_JPEG_QUALITY, 85])


def run(job, s, out, log=print):
    big = os.path.join(ROOT, 'analysis', 'local', '输出', '素材包')
    ver = None
    if job.get('entry'):     # 按条目导出：组合条目每层一套；版本指纹从烘焙器的条目数据里取
        info = s.pg.evaluate(f"""(() => {{ const e = FW_REVIEW_LIST.find(x => x.id === {json.dumps(job['entry'])}); if (!e) return null;
            return {{ ver: e.ver || null, layers: e.kind === 'combo' ? e.layerIds : [e.id], delays: e.kind === 'combo' ? e.combo.layers.map(L => L.delay || 0) : [0], video: e.video || null, vmeta: e.vmeta || null }}; }})()""")
        if not info: raise RuntimeError('找不到条目 ' + job['entry'])
        ver = info['ver']; base = job.get('name') or job['entry']; job['_delays'] = info.get('delays'); job['_ref'] = dict(info['vmeta'], video=os.path.join(ROOT, 'tool', info['video'])) if info.get('vmeta') and info.get('video') else None
        job['exports'] = job.get('exports') or {(base if len(info['layers']) == 1 else f'{base}_{i + 1}'): {'_replica': lid} for i, lid in enumerate(info['layers'])}
    packages = []
    for name, over in job['exports'].items():
        t = time.time(); over = dict(over); rep = over.pop('_replica', None) or job.get('replica')
        if rep:
            src = f"replicaPM({json.dumps(rep)})"
        else:
            src = f"__fw.resolve({json.dumps(json.load(open(os.path.join(ROOT, job['params']), encoding='utf-8')))}, 'x')"
        b64 = s.pg.evaluate(f"""(async () => {{ const r = {src}; const P = r.P, M = r.M; Object.assign(P, {json.dumps(over)});
            const u8 = await __fw.exportFiles(P, M, {json.dumps(name)}); let t = '';
            for (let i = 0; i < u8.length; i += 0x8000) t += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(t); }})()""")
        d = os.path.join(big, name); os.makedirs(d, exist_ok=True)
        for old in os.listdir(d):   # 固定目录：重新导出前清掉上一版的文件（引擎里右键「重新导入」读的就是这里）
            if os.path.isfile(os.path.join(d, old)): os.remove(os.path.join(d, old))
        zipfile.ZipFile(io.BytesIO(base64.b64decode(b64))).extractall(d)
        files = sorted(os.listdir(d)); log(f'{name} 导出 {time.time() - t:.0f} 秒：' + '、'.join(files))
        for f in files:
            p = os.path.join(d, f)
            if f.endswith(('.txt', '.json', '.csv')) and not f.startswith('cascade'):
                import shutil; shutil.copy(p, os.path.join(out, f))
            elif f.startswith('cascade') and f.endswith('.json'):   # 几套导出各有一个 cascade.json：上传时加上导出名
                import shutil; shutil.copy(p, os.path.join(out, f'{name}_{f}'))
            elif f.endswith('.png') and not any(k in f for k in ('_Ramp', '_Cutout', '_FrameTest')):
                preview(p, os.path.join(out, f[:-4] + '_预览.jpg'))
        packages.append(dict(name=name, replica=rep, files=files))
    json.dump(dict(effect=job.get('effect'), entry=job.get('entry'), ver=ver, time=time.strftime('%Y-%m-%d %H:%M'), dir='analysis/local/输出/素材包/', packages=packages),
              open(os.path.join(out, '导出清单.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # 贴图回放检查（按 cascade.json 的播法合成，自动查裁切 / 曝光 / 空帧 / 跳变 / 组合错位）：结果图和数值上传，负责的 AI 据此判断
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import importlib; rc = importlib.import_module('回放检查')
        dirs = [os.path.join(big, n) for n in job['exports']]; packs = []
        for d in dirs:
            n = len(json.load(open(os.path.join(d, 'cascade.json'), encoding='utf-8'))['emitters'])
            packs.append([rc.Pack(d, i) for i in range(n)])
        if all(len(pp) == 1 for pp in packs):
            r = rc.check([pp[0] for pp in packs], os.path.join(out, '回放检查.jpg'), job.get('_delays') if len(packs) > 1 else None, ref=job.get('_ref'), times_s=job.get('check_times_s'))
        else:   # 尾缀这类一个包里几个发射器（上升循环、消散）：各自一张
            r = [rc.check([p], os.path.join(out, f'回放检查_{i + 1}_{j + 1}.jpg'), None) for i, pp in enumerate(packs) for j, p in enumerate(pp)]
        json.dump(r, open(os.path.join(out, '回放检查.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        log('回放检查：' + os.path.join(out, '回放检查.jpg'))
    except Exception as e:
        log(f'回放检查没做成（不影响导出）：{e}')
    if job.get('entry'):
        try: baker_strip(s, job['entry'], os.path.join(out, '烘焙回放.jpg'), job.get('_ref'), log=log, times_s=job.get('check_times_s'))
        except Exception as e: log(f'烘焙回放对照没做成（不影响导出）：{e}')
    # 烘焙器迭代区的预览（真实导出贴图原尺寸，按引擎方式播放）
    try:
        import export_preview
        kb = export_preview.build(out, big, list(job['exports']), title=job.get('name'), note=job.get('note', '')) / 1024
        log(f'烘焙器预览 preview.js：{kb:.0f} KB')
    except Exception as e:
        log(f'烘焙器预览没做成（不影响导出）：{e}')
    log(f'大文件（贴图）在 {big}，不上传')


def baker_strip(s, entry, out, ref=None, fracs=(0.1, 0.3, 0.5, 0.7, 0.9), log=print, times_s=None):
    """烘焙器里的「实际烘焙回放」：打开条目，按「导出效果」（烘焙出的贴图 + 材质，和引擎同播法）和「实时模拟」各截几个时刻，
    和实拍（开花后同一秒）排成一张图。这是给负责的 AI 看的自检证据（进「待我验收」前必须看过）。"""
    import numpy as np
    vp = s.pg.viewport_size; s.pg.set_viewport_size({'width': 1920, 'height': 1200})     # 和用户桌面上看到的大小相近（小画布里细线会被缩没）
    s.pg.evaluate(f"openReview(FW_REVIEW_LIST.find(e => e.id === {json.dumps(entry)}))")
    s.pg.wait_for_function("window.__fw && window.__fw.idle() && (state.tab !== 'combo' || (state.layers.length > 0 && state.lib.length >= state.layers.length))", timeout=0)
    s.pg.wait_for_timeout(1500)
    T = s.pg.evaluate("state.tab === 'combo' ? Math.min(comboDuration(), Math.max(...state.layers.map(L => { const e = state.lib.find(x => x.name === L.lib); return (L.delay || 0) + (e ? e.P.duration : 0); }))) : (state.P && state.P.duration) || 3")
    if ref:     # 不超过实拍视频剩下的长度（不然后几张实拍是黑的）
        try:
            import cv2; cap = cv2.VideoCapture(ref['video']); vd = cap.get(cv2.CAP_PROP_FRAME_COUNT) / (cap.get(cv2.CAP_PROP_FPS) or 30); cap.release()
            if vd > 0: T = min(T, max(1.0, vd - ref.get('t0', 0) - 0.05))
        except Exception: pass
    times = list(times_s) if times_s is not None else [round(f * T, 2) for f in fracs]
    if any(t < 0 or t > T + 1e-6 for t in times): raise ValueError('烘焙对照采样超出素材或参考有效时间')
    rows = {'实时模拟': [], '导出效果': []}
    # 先播一小段再暂停：实时模拟的粒子是逐帧推进的，刚打开就跳到某一秒，第一张会是没推进完的画面
    s.pg.evaluate("state.view = 'live'; state.t = 0; state.playing = true"); s.pg.wait_for_timeout(2500); s.pg.evaluate("state.playing = false")
    geometry = s.pg.evaluate("""(() => {
        if (state.tab !== 'combo') return null;
        const items = state.layers.map(L => [L, state.lib.find(e => e.name === L.lib)]).filter(x => x[1] && x[1].bake);
        let liveView = null;
        items.forEach(([L,e],i) => { const v = sceneView(e.P,e.bake.meta,liveSlot('combo'+i)), sc = L.scale || 1;
            const q = v.map(x => x*sc); liveView = liveView ? unionView(liveView,q) : q; });
        let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
        for (const [L,e] of items) for (let b=e.bake;b;b=b.next) for(let i=0;i<=8;i++) {
            const q=layerRectAt(b.meta,L,i/8*b.meta.duration); x0=Math.min(x0,q[0]); x1=Math.max(x1,q[2]); y0=Math.min(y0,q[1]); y1=Math.max(y1,q[3]); }
        const h=Math.max(x1-x0,y1-y0)*.52;
        return {live:liveView,export:[(x0+x1)/2,(y0+y1)/2,h,h]};
    })()""")
    for view in ('live', 'export'):
        for t in times:
            s.pg.evaluate(f"state.view = {json.dumps(view)}; state.playing = false; state.t = {t}"); s.pg.wait_for_timeout(900)
            png = s.pg.locator('#gl').screenshot()
            rows['实时模拟' if view == 'live' else '导出效果'].append(Image.open(io.BytesIO(png)).convert('RGB'))
    px = 300; lines = []; rc = None
    if ref:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import importlib; rc = importlib.import_module('回放检查')
        lines.append(('实拍', [Image.fromarray(a) for a in rc.ref_frames(ref, times, px)]))
    for k in ('实时模拟', '导出效果'):
        sq = []
        for im in rows[k]:
            w, h = im.size; c = min(w, h); sq.append(im.crop(((w - c) // 2, (h - c) // 2, (w - c) // 2 + c, (h - c) // 2 + c)).resize((px, px)))
        lines.append((k, sq))
    from PIL import ImageDraw, ImageFont
    sheet = Image.new('RGB', (90 + px * len(times), 22 + px * len(lines)), (14, 15, 20)); dr = ImageDraw.Draw(sheet); font = None
    for fp in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc'):
        if os.path.exists(fp): font = ImageFont.truetype(fp, 13); break
    for r, (nm, ims) in enumerate(lines):
        dr.text((4, 22 + r * px + px // 2), nm, fill=(220, 210, 180), font=font)
        for c, im in enumerate(ims): sheet.paste(im, (90 + c * px, 22 + r * px))
    for c, t in enumerate(times): dr.text((90 + c * px + 4, 4), f'开花后 {t:.2f} s', fill=(233, 180, 95), font=font)
    sheet.save(out, quality=88); log('烘焙回放对照：' + out)
    # 原尺寸（不缩小）：细线、小光点缩小后会变暗变没，判断「线条 / 颗粒清不清楚」看这张
    c0 = min(rows['实时模拟'][0].size); big = []
    if ref: big.append(('实拍', [Image.fromarray(a) for a in rc.ref_frames(ref, times, c0)]))
    for k in ('实时模拟', '导出效果'):
        big.append((k, [im.crop(((im.size[0] - c0) // 2, (im.size[1] - c0) // 2, (im.size[0] - c0) // 2 + c0, (im.size[1] - c0) // 2 + c0)) for im in rows[k]]))
    sh2 = Image.new('RGB', (90 + c0 * len(times), 22 + c0 * len(big)), (14, 15, 20)); d2 = ImageDraw.Draw(sh2)
    for r, (nm, ims) in enumerate(big):
        d2.text((4, 22 + r * c0 + c0 // 2), nm, fill=(220, 210, 180), font=font)
        for c, im in enumerate(ims): sh2.paste(im, (90 + c * c0, 22 + r * c0))
    for c, t in enumerate(times): d2.text((90 + c * c0 + 4, 4), f'开花后 {t:.2f} s', fill=(233, 180, 95), font=font)
    o2 = os.path.splitext(out)[0] + '_原尺寸.jpg'; sh2.save(o2, quality=85); log('烘焙回放（原尺寸）：' + o2)
    entry_ver = s.pg.evaluate("id => (FW_REVIEW_LIST.find(e => e.id === id) || {}).ver || null", entry)
    metadata = dict(entry=entry, ver=entry_ver, times_s=times, square_px=c0, header_px=22, label_px=90,
                    rows=[k for k, _ in big], projection=geometry, reference=ref,
                    note='每行整段固定取景；实时和导出各自的视野不同，比较几何时须记录整段统一换算，不能逐帧放大。')
    json.dump(metadata, open(os.path.splitext(out)[0] + '_采样.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if vp: s.pg.set_viewport_size(vp)
