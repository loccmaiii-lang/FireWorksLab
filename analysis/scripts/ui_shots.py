"""烘焙器界面截图（本机显卡跑，给云端 AI 看用户实际看到的界面）：任务 type "ui"

任务文件：
  { "id": "UI1", "type": "ui", "name": "...", "shots": [ <步骤>, ... ] }
步骤（按顺序执行，每步之后截图，除非 "shot": false）：
  {"name": "首页"}                                    打开烘焙器（和用户一样，不带 ?fast，自动打开「新」的条目）后截整页
  {"name": "...", "js": "<表达式>"}                    执行一段 JS（例：lib.seg='passed';renderLib()），再等烘焙器空闲
  {"name": "...", "review": "<条目号>"}                打开迭代区 / 待验收条目
  {"name": "...", "type": "<花型>"}                    花型库模板（setType）
  {"name": "...", "viewport": [1440, 900]}             换窗口大小（之后的步骤都用这个大小）
  {"name": "...", "view": "live|export|atlas", "flow": true|false, "t": 1.2}   切视图 / 流转 / 时间
  {"name": "...", "seq": [0, 1.0, 2], "view": "atlas", "flow": true}            连续帧：从 0 到 1.0 s，每 2 个 tick 截一次画布，拼成一张
  {"name": "...", "thumb": "<条目 id 或 ef:效果>", "t": "full", "shot": false}  渲染缩略图：取画布本身按内容裁成 160 方图，存 缩略图/（渲染缩略图.py 生成这种任务、收结果）
  {"name": "...", "eval": "<表达式>"}                  最后再算一个值，记进 ui.json 的 eval（例：播放时的帧间隔统计）
输出：analysis/results/<id>/<序号>_<name>.jpg（整页 1920×1080）、seq 拼图、ui.json（每步的 HUD 文字和状态）
"""
import io, json, os, time
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
TOOL = 'file:///' + os.path.abspath(os.path.join(HERE, '..', '..', 'tool', 'FireworkBaker.html')).replace('\\', '/')


def thumb_from_png(data_url, size=160):
    """画布截图 → 按亮的内容裁成方图（留一点边）→ size×size"""
    import base64, numpy as np
    im = Image.open(io.BytesIO(base64.b64decode(data_url.split(',', 1)[1]))).convert('RGB')
    a = np.asarray(im, np.float32); a = np.abs(a - np.median(a.reshape(-1, 3), axis=0)).max(axis=2)   # 减掉画布底色
    H, W = a.shape; m = float(a.max())
    ys, xs = np.nonzero(a > max(10.0, m * 0.05)) if m > 0 else (np.array([]), np.array([]))
    if len(xs) < 20: side = min(W, H); cx, cy = W / 2, H / 2
    else:
        x0, x1, y0, y1 = np.percentile(xs, 0.5), np.percentile(xs, 99.5), np.percentile(ys, 0.5), np.percentile(ys, 99.5)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; side = max(x1 - x0, y1 - y0, 24) * 1.12
    box = tuple(int(round(v)) for v in (cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2))
    sq = Image.new('RGB', (box[2] - box[0], box[3] - box[1]), (0, 0, 0)); sq.paste(im.crop((max(0, box[0]), max(0, box[1]), min(W, box[2]), min(H, box[3]))), (max(0, -box[0]), max(0, -box[1])))
    return sq.resize((size, size), Image.LANCZOS)


def thumb_score(data_url):
    """亮的内容有多少：减掉画布底色后的亮度总和"""
    import base64, numpy as np
    a = np.asarray(Image.open(io.BytesIO(base64.b64decode(data_url.split(',', 1)[1]))).convert('RGB'), np.float32)
    a = np.clip(a - np.median(a.reshape(-1, 3), axis=0), 0, None).max(axis=2)
    return float((a * (a > 12)).sum())


def run(job, s, out, log=print):
    # 用会话自己的页面（只开一个 WebGL 上下文）；带 ?fast 打开，首页那一步再按用户打开时的逻辑手动打开「新」的效果
    pg = s.pg; pg.set_viewport_size({'width': 1920, 'height': 1080})
    rec = []
    idle = "window.__fw && window.__fw.idle && window.__fw.idle()"
    def wait_idle(limit=240000):
        try: pg.wait_for_function(idle, timeout=limit)
        except Exception as e: log(f'等烘焙器空闲超时（{limit // 1000} 秒），照常截图：{str(e).splitlines()[0]}')
    try:
        pg.goto(TOOL + '?fast', timeout=0)
        wait_idle(); pg.wait_for_timeout(2500)
        pg.evaluate("(() => { const fresh = EFFS().find(effIsNew); if (fresh) { lib.seg = 'review'; renderLib(); openEffect(fresh); } })()")
        for i, st in enumerate(job['shots']):
            t0 = time.time(); name = st.get('name', f'步骤{i + 1}')
            if st.get('viewport'): w, h = st['viewport']; pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(800)
            if st.get('review'): pg.evaluate(f"openReview(FW_REVIEW_LIST.find(e => e.id === {json.dumps(st['review'])}))")
            if st.get('effect'): pg.evaluate(f"openEffect(EFFS().find(e => e.key === {json.dumps(st['effect'])}))")
            if st.get('type'): pg.evaluate(f"setType({json.dumps(st['type'])})")
            if st.get('js'): pg.evaluate(st['js'])
            if st.get('view'): pg.click(f"#viewSeg button[data-view='{st['view']}']")
            if 'flow' in st and pg.is_visible(f"#flowSeg button[data-flow='{1 if st['flow'] else 0}']"): pg.click(f"#flowSeg button[data-flow='{1 if st['flow'] else 0}']")
            wait_idle(); pg.wait_for_timeout(st.get('sleep', 1500))
            if st.get('seq'):
                a, b, step = st['seq']; ims = []
                k = int(round(a * 30))
                while k <= int(round(b * 30)):
                    pg.evaluate(f"state.playing = false; state.t = {k / 30}"); pg.wait_for_timeout(250)
                    ims.append(Image.open(io.BytesIO(pg.locator('#gl').screenshot())).convert('RGB')); k += step
                w = 360; ims = [im.resize((w, int(im.height * w / im.width))) for im in ims]
                cols = 6; rows = (len(ims) + cols - 1) // cols; H = ims[0].height
                sheet = Image.new('RGB', (cols * w, rows * H), (10, 10, 14))
                for j, im in enumerate(ims): sheet.paste(im, ((j % cols) * w, (j // cols) * H))
                sheet.save(os.path.join(out, f'{i + 1:02d}_{name}_连续.jpg'), quality=85)
            if st.get('t') is not None:
                # 't': 'full' = 展开时刻（主层花开到最大，和时间轴「展开」按钮同一个时刻）
                pg.evaluate("state.playing = false; state.t = jumpTimes().full" if st['t'] == 'full' else f"state.playing = false; state.t = {st['t']}"); pg.wait_for_timeout(900)
            if st.get('thumb') and str(st['thumb']).startswith('js:'):   # 键要在页面里算（例：多层的第 i 层是哪个条目）；算出空值就跳过
                st = dict(st, thumb=pg.evaluate(st['thumb'][3:]) or None)
            if st.get('thumb'):
                # 渲染缩略图：取画布本身（不含界面叠层），按内容裁成方图、缩到 160，存 缩略图/<序号>.jpg；条目 id 和版本记进 ui.json
                # thumb_times：几个候选时刻（页面里算），每个都取一张，留亮的内容最多的那张（有的层在「展开」时刻还没亮）
                if st.get('thumb_times'):
                    best = None
                    for tt in pg.evaluate(st['thumb_times']) or []:
                        pg.evaluate(f"state.playing = false; state.t = {float(tt)}"); pg.wait_for_timeout(700)
                        u = pg.evaluate("window.__fw.thumbNow()"); sc = thumb_score(u)
                        if best is None or sc > best[0]: best = (sc, u)
                    th = thumb_from_png(best[1]) if best else thumb_from_png(pg.evaluate("window.__fw.thumbNow()"))
                else: th = thumb_from_png(pg.evaluate("window.__fw.thumbNow()"))
                os.makedirs(os.path.join(out, '缩略图'), exist_ok=True)
                tf = f'{i + 1:02d}.jpg'; th.save(os.path.join(out, '缩略图', tf), quality=82)
                st = dict(st, thumb_file=tf, thumb_ver=pg.evaluate("(typeof lib !== 'undefined' && lib.review && lib.review.ver) || ''"))
            if st.get('shot', True):
                pg.screenshot(path=os.path.join(out, f'{i + 1:02d}_{name}.jpg'), type='jpeg', quality=80)
            info = pg.evaluate("({hud: (document.querySelector('#hud')||{}).textContent || (typeof hudText!=='undefined'?hudText:''), seg: typeof lib!=='undefined'?lib.seg:null, view: state.view, flow: state.atlasFlow, t: state.t, P: state.P ? {type: state.P.type, renderVer: state.P.renderVer, cols: state.P.cols, duration: state.P.duration} : null})")
            if st.get('thumb'): info.update(thumb=st['thumb'], thumb_file=st.get('thumb_file'), thumb_ver=st.get('thumb_ver'))
            if st.get('eval'): info['eval'] = pg.evaluate(st['eval'])     # 取一个值记进 ui.json（例：播放时的帧间隔统计）
            rec.append(dict(name=name, seconds=round(time.time() - t0, 1), **info)); log(f'界面截图 {i + 1}：{name}（{time.time() - t0:.0f} 秒）')
    finally:
        json.dump(rec, open(os.path.join(out, 'ui.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        try: pg.set_viewport_size({'width': 1200, 'height': 900})
        except Exception: pass
