"""4.9.16 默认缩略图 = 本机显卡按「生成缩略图」同一套裁法渲染（对话框新花型；用户 10-06 17:57「你之前做的缩略图太丑了，重新按照生成缩略图的方式重新替换一遍吧，
不要在云端看，你可以写一个任务给我本机GPU去跑」）。

和 4.9.6「生成缩略图」一样：一帧画面 → thCrop（框住亮的部分、正方形、留边）→ 160 px JPEG。区别只是帧由脚本挑：
  · 画面 = 烘焙同一个渲染核出的定帧（单层 renderStills40；多层 mtRenderLayers，几层画进同一画面）
  · 每项 8 个候选时刻（时长的 10%–76%），挑「整体还够亮（≥ 最亮那帧 50%）里亮的面积最大」的一帧
覆盖：花型模板（type:）、多层花型模板（mt:）、效果条目（rv:）、正式库（rep:），效果（ef:）跟它在左栏显示的那个条目用同一张。
「我的效果 / 我的模板」存在你自己的浏览器里，本机任务看不到，照旧是示意图（你自己点「生成缩略图」）。

两步：
  1. 本机任务（run_jobs.py 的 script 类型）跑：
       python analysis/scripts/渲染缩略图_截图法.py --out analysis/results/<任务>/缩略图 [--only mt:a,type:kiku] [--expo-from 曝光.json]
     出：缩略图.json（每项候选时刻、亮度、面积、挑中的）、选中/<键>.jpg、候选/<键>.jpg（8 张一排，挑中的框黄）、总表_<组>.jpg
  2. 云端看过总表后收进仓库：
       python3 analysis/scripts/渲染缩略图_截图法.py --ingest analysis/results/<任务>/缩略图 [--pick mt:a=3,type:kiku=5]
     写 tool/data/thumbs.js（window.FW_THUMBS），烘焙器没自己截过的项就用它（19_thumbsvg.js thUser），再没有才是示意图。
     --pick 改挑第几张（从 0 数，按候选图从左数）；--drop 键,键 = 这几项不用渲染图（留示意图）。
"""
import argparse, asyncio, base64, io, json, pathlib, re, sys, time
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'
OUT_JS = ROOT / 'tool' / 'data' / 'thumbs.js'
FR = [0.1, 0.17, 0.24, 0.32, 0.4, 0.5, 0.62, 0.76]

JS_LIST = r"""
() => {
  const items = [], seen = new Set(), add = (key, name, group) => { if (seen.has(key)) return; seen.add(key); items.push({ key, name, group }); };
  for (const [g, ts] of TYPE_GROUPS) for (const t of ts) add('type:' + t, TYPE_NAMES[t], '花型模板 · ' + g);
  for (const r of MULTI_TYPES) add('mt:' + r.id, r.name, '多层模板 · ' + MT_GROUPS[r.group]);
  const RV = typeof FW_REVIEW_LIST !== 'undefined' ? FW_REVIEW_LIST : [];
  for (const e of RV) add('rv:' + e.id, e.name || e.id, '效果条目');
  for (const r of REPLICAS) if (!r.fromReview) add('rep:' + r.id, r.name || r.id, '正式库');
  const alias = {};
  for (const ef of (typeof FW_EFFECTS !== 'undefined' ? FW_EFFECTS : [])) {
    const me = typeof effMainEntry === 'function' ? effMainEntry(ef) : null, fm = String(ef.主条目 || '').startsWith('rep:') ? REPLICA_BY_ID[ef.主条目.slice(4)] : null;
    alias['ef:' + ef.key] = fm ? 'rep:' + fm.id : me ? 'rv:' + me.id : null;
  }
  return { items, alias, ver: VERSION };
}
"""
JS_ONE = r"""
async (a) => {
  const k = a.key, i = k.indexOf(':'), kind = k.slice(0, i), ref = k.slice(i + 1);
  let single = null, layers = null;
  const comboOf = e => e.combo.layers.map(l => { const id = String(l.m || '').replace(/^rep:/, ''); if (!REPLICA_BY_ID[id]) return null;
    const { P, M } = replicaPM(id), M2 = normalizeM({ ...M, ...(l.stages ? { stages: l.stages } : {}) }, P.type);
    return { P, M: M2, delay: +l.delay || 0, rate: +l.rate > 0 ? +l.rate : 1, scale: +l.scale > 0 ? +l.scale : 1, headInt: l.headInt != null ? +l.headInt : (M2.headInt != null ? M2.headInt : 1) }; }).filter(Boolean);
  if (kind === 'type') { const d = defaultsFor(ref, 40); single = { P: derive({ ...structuredClone(d.P), type: ref }), M: structuredClone(d.M) }; }
  else if (kind === 'mt') layers = mtLayers(ref);
  else if (kind === 'rep') single = replicaPM(ref);
  else if (kind === 'rv') {
    const e = FW_REVIEW_LIST.find(x => x.id === ref);
    if (e && e.kind === 'combo' && e.combo && e.combo.layers) layers = comboOf(e);
    else if (REPLICA_BY_ID[ref]) single = replicaPM(ref);
    else if (e && TYPES[e.base]) { const d = defaultsFor(e.base, 40); single = { P: derive({ ...structuredClone(d.P), type: e.base, ...(e.p || {}) }), M: normalizeM({ ...d.M, ...(e.m || {}) }, e.base) }; }
  }
  if (layers && layers.length === 1) single = { P: layers[0].P, M: { ...layers[0].M, headInt: layers[0].headInt } }, layers = null;
  if (!single && !(layers && layers.length)) return { error: '没找到参数' };
  const reach = P => ['senrin', 'crossette'].includes(P.type) ? reachOf(P.v0, P.vt, P.subDelay) + reachOf(P.subSpeed, +P.subVt > 0 ? +P.subVt : P.vt, P.subBurn) : reachOf(P.v0, P.vt, P.burn);
  let T, st;
  const t0 = performance.now();
  if (single) {
    T = +single.P.duration || 3; const times = a.fr.map(f => +(f * T).toFixed(3));
    st = await renderStills40(single.P, single.M, { times, px: a.px });
  } else {
    T = Math.max(...layers.map(l => (l.delay || 0) + (+l.P.duration || 3) / (l.rate || 1))); const times = a.fr.map(f => +(f * T).toFixed(3));
    const R = Math.max(...layers.map(l => (familyOf(l.P.type) === 'aerial' ? reach(l.P) : 60) * (l.scale || 1)));
    st = await mtRenderLayers(layers, { times, px: a.px, half: R * 1.3, cy: -R * 0.12 });
  }
  const ms = performance.now() - t0, out = [];
  for (const s of st) {
    const im = new Image(); im.src = s.png; await im.decode();
    const c = thCrop(im);
    const q = document.createElement('canvas'); q.width = q.height = 96; const qx = q.getContext('2d', { willReadFrequently: true }); qx.drawImage(im, 0, 0, 96, 96);
    const d = qx.getImageData(0, 0, 96, 96).data; let E = 0; for (let j = 0; j < d.length; j += 4) E += Math.max(d[j], d[j + 1], d[j + 2]); E /= 96 * 96 * 255;
    out.push({ t: +s.t.toFixed(3), img: c ? c.img : null, lit: c ? c.lit : 0, E: +E.toFixed(5) });
  }
  return { T: +T.toFixed(3), n: layers ? layers.length : 1, ms: Math.round(ms), cands: out };
}
"""


def font(sz):
    from PIL import ImageFont
    for fp in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc'):
        if pathlib.Path(fp).exists(): return ImageFont.truetype(fp, sz)
    return ImageFont.load_default()


def safe(key): return re.sub(r'[\\/:*?"<>|]', '_', key)


def pick(cands):
    """整体还够亮（≥ 最亮那帧 50%）里，亮的面积最大的一帧"""
    ok = [i for i, c in enumerate(cands) if c.get('img')]
    if not ok: return None
    mx = max(cands[i]['E'] for i in ok)
    el = [i for i in ok if cands[i]['E'] >= 0.5 * mx] or ok
    return max(el, key=lambda i: (cands[i]['lit'], -i))


def img_of(durl):
    from PIL import Image
    return Image.open(io.BytesIO(base64.b64decode(durl.split(',', 1)[1]))).convert('RGB')


async def run(a):
    from browser_runtime import launch_async, verify_renderer
    from playwright.async_api import async_playwright
    from PIL import Image, ImageDraw
    out = pathlib.Path(a.out); (out / '选中').mkdir(parents=True, exist_ok=True); (out / '候选').mkdir(exist_ok=True)
    only = set(x for x in (a.only or '').split(',') if x)
    rec = {'说明': '4.9.16 渲染缩略图（截图法）：每项 8 个候选时刻，pick = 挑中的（从 0 数）', 'items': {}}
    async with async_playwright() as p:
        b = await launch_async(p)
        pg = await b.new_page(viewport={'width': 1200, 'height': 900})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(HTML.resolve().as_uri() + '?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof MULTI_TYPES !== "undefined" && typeof mtRenderLayers === "function"', timeout=0)
        rec['renderer'] = verify_renderer(await pg.evaluate("(()=>{const g=document.createElement('canvas').getContext('webgl2');const x=g&&g.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):'?'})()"))
        if a.expo_from and pathlib.Path(a.expo_from).exists():     # 同一任务里刚算出的多层模板曝光（源码里还没有）
            await pg.evaluate('''(ex) => { for (const [k, v] of Object.entries(ex)) { const old = MT_EXPOSURE[k] || []; MT_EXPOSURE[k] = v.map((x, j) => x != null ? x : (old[j] != null ? old[j] : 1)); } }''',
                              json.loads(pathlib.Path(a.expo_from).read_text(encoding='utf-8')))
            rec['expo_from'] = str(a.expo_from)
        L = await pg.evaluate(JS_LIST)
        rec['ver'] = L['ver']; rec['alias'] = L['alias']
        items = [x for x in L['items'] if not only or x['key'] in only]
        print(f"烘焙器 {L['ver']} · {rec['renderer']} · {len(items)} 项", flush=True)
        for n, it in enumerate(items):
            t0 = time.time()
            try:
                r = await pg.evaluate(JS_ONE, {'key': it['key'], 'fr': [float(x) for x in a.fr.split(',')] if a.fr else FR, 'px': a.px})
            except Exception as e:
                r = {'error': str(e).splitlines()[0][:300]}
            if r.get('error'):
                rec['items'][it['key']] = {**it, 'error': r['error']}; print(f"[{n + 1}/{len(items)}] {it['key']} {it['name']} ❌ {r['error']}", flush=True); continue
            c = r['cands']; k = pick(c); f = safe(it['key'])
            if k is None:
                rec['items'][it['key']] = {**it, 'error': '每一帧都是黑的', 'T': r['T']}; print(f"[{n + 1}/{len(items)}] {it['key']} 全黑", flush=True); continue
            (out / '选中' / (f + '.jpg')).write_bytes(base64.b64decode(c[k]['img'].split(',', 1)[1]))
            strip = Image.new('RGB', (160 * len(c), 160 + 22), (10, 11, 15)); g = ImageDraw.Draw(strip); ft = font(13)
            for j, x in enumerate(c):
                if x.get('img'): strip.paste(img_of(x['img']), (160 * j, 22))
                g.text((160 * j + 4, 3), f"{j} · {x['t']:.2f}s · 面积 {x['lit']:.3f}", fill=(233, 180, 95) if j == k else (150, 150, 150), font=ft)
                if j == k: g.rectangle([160 * j, 22, 160 * j + 159, 181], outline=(255, 210, 60), width=3)
            strip.save(out / '候选' / (f + '.jpg'), quality=80)
            rec['items'][it['key']] = {**it, 'T': r['T'], 'layers': r['n'], 'pick': k, 'file': f + '.jpg', 'cands': [{x2: x[x2] for x2 in ('t', 'lit', 'E')} for x in c]}
            print(f"[{n + 1}/{len(items)}] {it['key']} {it['name']} · {r['n']} 层 · 挑 {k}（{c[k]['t']:.2f}s）· {time.time() - t0:.1f}s", flush=True)
        rec['errors'] = errs[:20]
        await b.close()
    (out / '缩略图.json').write_text(json.dumps(rec, ensure_ascii=False, indent=1), encoding='utf-8')
    sheets(out, rec)
    bad = [k for k, v in rec['items'].items() if v.get('error')]
    print(f"完成：{len(rec['items']) - len(bad)} 张，没出 {len(bad)} 项" + (f"（{'、'.join(bad[:12])}）" if bad else ''), flush=True)
    return 0


def sheets(out, rec):
    """每组一张总表：挑中的缩略图 + 名字（云端只看这个，不再渲染）"""
    from PIL import Image, ImageDraw
    groups = {}
    for k, v in rec['items'].items():
        if v.get('file'): groups.setdefault(v['group'].split(' · ')[0], []).append((k, v))
    ft = font(13)
    for g, xs in groups.items():
        cols = 8; rows = (len(xs) + cols - 1) // cols; W, H = 168, 200
        sh = Image.new('RGB', (cols * W, rows * H), (10, 11, 15)); d = ImageDraw.Draw(sh)
        for i, (k, v) in enumerate(xs):
            x, y = (i % cols) * W, (i // cols) * H
            sh.paste(Image.open(out / '选中' / v['file']).convert('RGB'), (x + 4, y + 4))
            d.text((x + 4, y + 166), v['name'][:12], fill=(230, 220, 200), font=ft); d.text((x + 4, y + 182), f"{k[:18]} · {v['cands'][v['pick']]['t']:.2f}s", fill=(140, 140, 140), font=ft)
        sh.save(out / f'总表_{g}.jpg', quality=88)


def ingest(a):
    src = pathlib.Path(a.ingest); rec = json.loads((src / '缩略图.json').read_text(encoding='utf-8'))
    picks = dict(x.split('=') for x in (a.pick or '').split(',') if '=' in x); drop = set(x for x in (a.drop or '').split(',') if x)
    from PIL import Image
    db, at = {}, time.strftime('%Y-%m-%d %H:%M', time.localtime((src / '缩略图.json').stat().st_mtime))
    job = src.parent.name if src.name == '缩略图' else src.name
    for k, v in rec['items'].items():
        if v.get('error') or not v.get('file') or k in drop: continue
        j = int(picks.get(k, v['pick']))
        if j == v['pick']: b = (src / '选中' / v['file']).read_bytes()
        else:     # 改挑：从候选那一排裁出来
            im = Image.open(src / '候选' / v['file']).convert('RGB').crop((160 * j, 22, 160 * j + 160, 182)); bb = io.BytesIO(); im.save(bb, 'JPEG', quality=85); b = bb.getvalue()
        db[k] = {'img': 'data:image/jpeg;base64,' + base64.b64encode(b).decode(), 't': v['cands'][j]['t'], 'at': at, 'ver': rec.get('ver', ''), 'job': job}
    for ek, k in (rec.get('alias') or {}).items():     # 效果 = 它在左栏显示的那个条目
        if k and k in db and ek not in drop: db[ek] = {**db[k], 'of': k}
    # 只换这次渲染了的项：以前收进来、这次没渲染的留着（--only 跑一部分时）
    old = {}
    if OUT_JS.exists():
        m = re.search(r'window\.FW_THUMBS = (\{.*\});', OUT_JS.read_text(encoding='utf-8'), re.S)
        if m: old = json.loads(m.group(1))
    for k in drop: old.pop(k, None)
    old.update(db)
    OUT_JS.write_text('// 由 analysis/scripts/渲染缩略图_截图法.py --ingest 生成：本机显卡按「生成缩略图」同一套裁法渲染的默认缩略图（4.9.16）。不要手改。\n'
                      '// 烘焙器里你自己点「生成缩略图」截的优先；这里没有的项用示意图。\n'
                      'window.FW_THUMBS = ' + json.dumps(old, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(f'收进 {len(db)} 张（共 {len(old)}）→ {OUT_JS}')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out'); ap.add_argument('--only'); ap.add_argument('--px', type=int, default=512); ap.add_argument('--expo-from'); ap.add_argument('--fr', help='候选时刻（时长的比例，逗号分开；只在试脚本时改）')
    ap.add_argument('--ingest'); ap.add_argument('--pick'); ap.add_argument('--drop')
    a = ap.parse_args()
    if a.ingest: ingest(a)
    elif a.out: raise SystemExit(asyncio.run(run(a)))
    else: ap.print_help()
