"""烟花工坊 5.0 导出比较（真烘焙，含贴图像素）：同一批效果在两个烘焙器成品里各导出一次，逐文件比。

  python -X utf8 analysis/scripts/烟花工坊5.0_导出比较.py export --html tool/FireworkBaker.html --out <目录>   # 导出（每个效果一个 ZIP + 解开的目录）
  python -X utf8 analysis/scripts/烟花工坊5.0_导出比较.py compare <基线目录> <新目录>                       # 逐文件比；版本号、时间戳以外必须一样

走界面同一条路：打开效果（openEffect）→ 等预览烘焙完 → 导出（单层 exportMaster / 多层 exportCombo，导出方式 ZIP）→ 截下 ZIP 字节。
真烘焙：用装好的 Chrome（有窗口，走显卡），不替换任何烘焙 / 编码函数。用 file:// 打开成品（不起网页服务；本机 8034 属于别的工作树）。
"""
import argparse, asyncio, base64, hashlib, io, json, os, re, sys, zipfile
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from browser_runtime import launch_async, validation_url  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
EFFECTS = ['金芒菊', '金蕊柠', '扇形彗星', '引菊 → 锦（橙色直线菊转金锦，尾缀3.0_A 主层）', '金樱菊（球形A）', '升空尾缀 · 循环层 + 粒子 小 / 中 / 大']
safe = lambda n: re.sub(r'[\/:*?"<>|]+', '_', n).strip()

PREP = r"""(() => {
  const G = window.__xp = { zip: null, name: '', log: [] };
  download = (blob, name) => { G.zip = blob; G.name = name; };
  if (typeof DeliveryWorkspace !== 'undefined') { DeliveryWorkspace.beginExport = async () => 'zip'; const f = DeliveryWorkspace.exportFailed; DeliveryWorkspace.exportFailed = e => { G.log.push('导出失败：' + (e && e.message)); }; }
  { const d = document.getElementById('deliveryDestination'); if (d) d.value = 'zip'; }
  if (typeof window.shellAfterExport === 'function') window.shellAfterExport = async () => {};
  const ofl = flash; flash = (m, err, ms) => { if (err) G.log.push(String(m).slice(0, 300)); return ofl(m, err, ms); };
  window.askSaveName = async (t, n, init) => init; window.askConfirm = async () => true; window.askText = async (t, h, init) => init;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const idleNow = () => window.__fw.idle() && !state.baking && !(state.layerQueue && state.layerQueue.size) && document.getElementById('busy').hidden && !window.__opening;
  window.__idle = async (ms = 600000) => { const t0 = performance.now(); await wait(50); while (performance.now() - t0 < ms) { if (idleNow()) { await wait(300); if (idleNow()) return true; } await wait(100); } return false; };
  return true;
})()"""

OPEN = r"""(async name => {
  const ef = EFFS().find(e => e.名 === name) || EFFS().find(e => (e.名 || '').includes(name));
  if (!ef) return { err: '找不到效果 ' + name, names: EFFS().map(e => e.名).slice(0, 400) };
  window.__opening = true; try { await openEffect(ef); } finally { window.__opening = false; }
  const ok = await window.__idle();
  return { key: ef.key, name: ef.名, tab: state.tab, layers: state.tab === 'combo' ? state.layers.length : 1, idle: ok };
})"""

EXPORT = r"""(async () => {
  const G = window.__xp; G.zip = null; G.name = ''; G.log = [];
  try { if (state.tab === 'combo') await exportCombo(); else await exportMaster(); } catch (e) { G.log.push('异常：' + e.message); }
  await window.__idle();
  if (!G.zip) return { err: G.log.join('；') || '没有拿到 ZIP' };
  const u8 = new Uint8Array(await G.zip.arrayBuffer()); let s = ''; for (let i = 0; i < u8.length; i += 32766) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32766));
  return { name: G.name, b64: btoa(s), log: G.log, version: VERSION };
})()"""


async def export(html, out, effects):
    from playwright.async_api import async_playwright
    out.mkdir(parents=True, exist_ok=True)
    url = validation_url(str(Path(html).resolve()))
    old = out / '导出清单.json'
    summary = json.loads(old.read_text(encoding='utf-8')) if old.is_file() else {'effects': {}}
    summary.update({'html': str(html), 'url': url})
    async with async_playwright() as p:
        b = await launch_async(p)
        for name in effects:
            ctx = await b.new_context(viewport={'width': 1920, 'height': 1080}); pg = await ctx.new_page()
            errors = []; pg.on('pageerror', lambda e: errors.append(str(e)[:200]))
            await pg.goto(url, wait_until='load', timeout=0)
            await pg.wait_for_function('window.__fw && typeof EFFS === "function" && typeof openEffect === "function"', timeout=0)
            renderer = await pg.evaluate("(() => { try { const g = document.createElement('canvas').getContext('webgl2'); const d = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(d.UNMASKED_RENDERER_WEBGL); } catch (e) { return String(e); } })()")
            await pg.evaluate(PREP)
            info = await pg.evaluate(OPEN + '(' + json.dumps(name) + ')')
            if info.get('err'):
                summary['effects'][name] = info; print(name, info['err'], flush=True); await ctx.close(); continue
            r = await pg.evaluate(EXPORT)
            if r.get('err'):
                summary['effects'][name] = {**info, 'err': r['err'], 'pageErrors': errors}; print(name, '导出失败', r['err'], flush=True); await ctx.close(); continue
            raw = base64.b64decode(r['b64'])
            (out / (safe(name) + '.zip')).write_bytes(raw)
            d = out / safe(name); d.mkdir(exist_ok=True)
            with zipfile.ZipFile(io.BytesIO(raw)) as z:
                files = {i.filename: z.read(i) for i in z.infolist() if not i.is_dir()}
            for f, data in files.items():
                t = d / f; t.parent.mkdir(parents=True, exist_ok=True); t.write_bytes(data)
            summary['effects'][name] = {**info, 'zip': r['name'], 'files': len(files), 'bytes': len(raw), 'version': r['version'], 'renderer': renderer, 'log': r['log'], 'pageErrors': errors}
            print(f"{name}：{r['name']} {len(files)} 个文件 {len(raw) / 1048576:.1f} MB（{info['layers']} 层，{renderer[:40]}）", flush=True)
            await ctx.close()
        await b.close()
    (out / '导出清单.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding='utf-8')
    return summary


TEXT = ('.json', '.txt', '.csv', '.md')
VER = re.compile(r'4\.9\.\d+|5\.0\.\d+')
STAMP = re.compile(r'\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?')


SHA = re.compile(r'"sha256": "[0-9a-f]{64}"')
# 同一版本连续两次真烘焙也不是逐位一样：显卡累加顺序带来极少数像素差 1（11-05 实测金芒菊 2048² 里 7 个）。
# 所以贴图按像素比：最大差 ≤ 1 且不同的像素 ≤ 0.01 % 算一样；cascade.json 里贴图的 sha256 跟着贴图变，单独由像素比较把关。
PIX_MAX, PIX_FRAC = 1, 1e-4


def norm(name, data):
    if not name.lower().endswith(TEXT):
        return data
    t = data.decode('utf-8', 'replace')
    t = STAMP.sub('<时间>', VER.sub('<版本>', t))
    if name.lower().endswith('.json'): t = SHA.sub('"sha256": "<哈希>"', t)
    return t.encode('utf-8')


def pixels_close(x, y):
    import numpy as np
    from PIL import Image
    A, B = np.asarray(Image.open(io.BytesIO(x))), np.asarray(Image.open(io.BytesIO(y)))
    if A.shape != B.shape: return False, f'尺寸 {A.shape} → {B.shape}'
    d = np.abs(A.astype(np.int16) - B.astype(np.int16)); n = int((d.reshape(d.shape[0], d.shape[1], -1).max(axis=2) > 0).sum()); frac = n / (A.shape[0] * A.shape[1])
    return int(d.max()) <= PIX_MAX and frac <= PIX_FRAC, f'像素最大差 {int(d.max())}，{n} 个像素不同（{frac:.5%}）'


def compare(a, b):
    a, b = Path(a), Path(b); bad = 0; rows = []
    for zipf in sorted(a.glob('*.zip')):
        name = zipf.stem; da, db = a / name, b / name
        if not db.is_dir():
            rows.append(f'✗ {name}：新目录没有'); bad += 1; continue
        fa = {p.relative_to(da).as_posix(): p for p in da.rglob('*') if p.is_file()}
        fb = {p.relative_to(db).as_posix(): p for p in db.rglob('*') if p.is_file()}
        diff, noise = [], []
        for f in sorted(set(fa) | set(fb)):
            if f not in fa or f not in fb: diff.append(f'{f}：{"只在新的" if f not in fa else "新的没有"}'); continue
            x, y = fa[f].read_bytes(), fb[f].read_bytes()
            if x == y: continue
            if norm(f, x) == norm(f, y): continue
            if f.lower().endswith('.png'):
                ok, why = pixels_close(x, y)
                if ok: noise.append(f'{f}：{why}'); continue
                diff.append(f'{f}：{why}'); continue
            diff.append(f'{f}：不同（{len(x)} → {len(y)} 字节）')
        rows.append(('✓ ' if not diff else '✗ ') + f'{name}：{len(fa)} 个文件' + ('一致（版本号、时间戳以外）' if not diff else '，' + '；'.join(diff[:6]))
                    + (f'；显卡噪声内 {len(noise)} 张：' + '；'.join(noise[:3]) if noise else ''))
        bad += bool(diff)
    print('\n'.join(rows)); print('结论：' + ('全部一致' if not bad else f'{bad} 个效果有不同'))
    return bad


def main():
    ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest='cmd', required=True)
    e = sub.add_parser('export'); e.add_argument('--html', default=str(ROOT / 'tool' / 'FireworkBaker.html')); e.add_argument('--out', required=True); e.add_argument('--effects', nargs='*', default=EFFECTS)
    c = sub.add_parser('compare'); c.add_argument('a'); c.add_argument('b')
    a = ap.parse_args()
    if a.cmd == 'export':
        s = asyncio.run(export(a.html, Path(a.out), a.effects))
        sys.exit(1 if any(v.get('err') for v in s['effects'].values()) else 0)
    sys.exit(1 if compare(a.a, a.b) else 0)


if __name__ == '__main__':
    main()
