"""烘焙器回归：同一组配方，新旧两版烘焙器逐像素比较（改渲染底层后必须跑）

用法：
  python3 analysis/scripts/烘焙器回归.py [--ref <git 提交，默认 a707b63 = 4.0 开工前的 3.7 基线>] [--cases 基准] [--times 0.4,1.3,2.2] [--px 160]
         [--out 目录] [--legacy]

- 旧版 = `git show <ref>:tool/FireworkBaker.html`，临时放在 tool/_ref_baker.html（和 tool/data 同目录，读得到数据），跑完删掉。
- 两边都用 `__fw.renderStills(P, M, {times, px})` 出定帧（和对照图同一条路径），算每个时刻的最大像素差、平均差。
- `--legacy`：给新版的每个配方加上兼容开关（`renderVer: 37`），用来证明「已通过的东西逐像素不变」。4.0 加兼容开关后，
  已通过条目（JM4、trail 系列）必须 max diff = 0；不加开关的对比用来看新渲染核改了多少（出对照图）。
- 输出：回归.json、回归.md（每个配方：最大差 / 平均差），差异不为 0 的配方另存「旧 | 新 | 差×8」拼图。

基准配方（协作/标准.md 第 5 节）：花型库 kiku、botan、kamuro、senrin、strobe、crossette；条目 JM4。
V5 尾缀走另一条渲染路径（42_trail.js），定帧不覆盖，用 烘焙器探针.py --shots 或导出任务的回放检查另外比。
"""
import argparse, base64, io, json, os, pathlib, platform, subprocess, time
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
TOOL = ROOT / 'tool'
CASES = {
    '基准': ['type:kiku', 'type:botan', 'type:kamuro', 'type:senrin', 'type:strobe', 'type:crossette', 'JM4'],
}
JS = r"""
(a) => { const { id, times, px, over } = a; let P, M;
  if (id.startsWith('type:')) { const d = defaultsFor(id.slice(5)); P = derive({ ...d.P, ...over }); M = d.M; }
  else { if (typeof REPLICA_BY_ID === 'undefined' || !REPLICA_BY_ID[id]) return null; const r = __fw.replicaPM(id); P = derive({ ...r.P, ...over }); M = r.M; }
  return __fw.renderStills(P, M, { times, px }); }
"""


def render(html, ids, times, px, over):
    from playwright.sync_api import sync_playwright
    args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] if platform.system() == 'Linux' else ['--ignore-gpu-blocklist']
    out = {}
    with sync_playwright() as pw:
        br = pw.chromium.launch(args=args); pg = br.new_page()
        pg.goto(html.resolve().as_uri() + '?fast', timeout=0, wait_until='domcontentloaded')
        pg.wait_for_function('window.__fw && (!window.__fw.idle || window.__fw.idle())', timeout=0)
        for i in ids:
            r = pg.evaluate(JS, {'id': i, 'times': times, 'px': px, 'over': over})
            out[i] = None if r is None else [np.array(Image.open(io.BytesIO(base64.b64decode(x['png'].split(',')[1]))).convert('RGB')) for x in r]
        br.close()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ref', default='a707b63')
    ap.add_argument('--cases', default='基准')
    ap.add_argument('--ids', default='')
    ap.add_argument('--times', default='0.4,1.3,2.2')
    ap.add_argument('--px', type=int, default=160)
    ap.add_argument('--out', default=None)
    ap.add_argument('--legacy', action='store_true')
    a = ap.parse_args()
    ids = a.ids.split(',') if a.ids else CASES[a.cases]
    times = [float(x) for x in a.times.split(',')]
    out = pathlib.Path(a.out) if a.out else ROOT / 'analysis' / 'probe' / ('回归_' + time.strftime('%Y%m%d_%H%M%S'))
    out.mkdir(parents=True, exist_ok=True)
    ref = TOOL / '_ref_baker.html'
    ref.write_bytes(subprocess.run(['git', 'show', f'{a.ref}:tool/FireworkBaker.html'], cwd=ROOT, capture_output=True, check=True).stdout)
    try:
        old = render(ref, ids, times, a.px, {})
    finally:
        ref.unlink(missing_ok=True)
    new = render(TOOL / 'FireworkBaker.html', ids, times, a.px, {'renderVer': 37} if a.legacy else {})
    rep, lines = [], ['| 配方 | 最大像素差 | 平均差 | 结论 |', '|---|---|---|---|']
    for i in ids:
        if old.get(i) is None or new.get(i) is None: rep.append({'id': i, 'error': '某一版没有这个配方'}); lines.append(f'| {i} | — | — | 某一版没有这个配方 |'); continue
        mx = max(int(np.abs(o.astype(int) - n.astype(int)).max()) for o, n in zip(old[i], new[i]))
        mean = float(np.mean([np.abs(o.astype(int) - n.astype(int)).mean() for o, n in zip(old[i], new[i])]))
        rep.append({'id': i, 'max': mx, 'mean': round(mean, 3)}); lines.append(f"| {i} | {mx} | {mean:.3f} | {'相同' if mx == 0 else '有变化'} |")
        if mx:
            rows = [np.concatenate([o, n, np.clip(np.abs(o.astype(int) - n.astype(int)) * 8, 0, 255).astype(np.uint8)], 1) for o, n in zip(old[i], new[i])]
            Image.fromarray(np.concatenate(rows, 0)).save(out / f"{i.replace(':', '_')}_旧_新_差.png")
    (out / '回归.json').write_text(json.dumps({'ref': a.ref, 'legacy': a.legacy, 'times': times, 'px': a.px, 'cases': rep}, ensure_ascii=False, indent=2), encoding='utf-8')
    (out / '回归.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print('\n'.join(lines)); print('→', out)


if __name__ == '__main__':
    main()
