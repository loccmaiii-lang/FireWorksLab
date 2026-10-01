"""标准检查（协作/标准.md 第 4 节，4.0-d）：每个条目按标准逐项给 ✅ / ❌，结果给烘焙器左栏和审阅卡显示

用法：
  python3 analysis/scripts/标准检查.py                # 当前条目（状态清单里各效果的主条目 / 待验收版）+ 正式库 + 花型库模板（4.0）
  python3 analysis/scripts/标准检查.py JM4 HK9 type40:kiku ...   # 只查这几个
  选项：--all（迭代区全部非历史条目）  --no-write（不写 tool/data/standard.js）

查什么（都在导出口径上量，不看实时模拟）：
  条目 6 样东西（标准第 1 节）：实时模拟 / 引擎回放 + 游戏内大小 / 贴图 + 流转 / 完整参数 / 导出素材包 / 实拍对照（有参考时）
    —— 按条目类型和产物判断（大面片、分段、尾缀、多层组合有；素材条目没有参数、单元 / 循环产物还没有 cascade.json）
  画质（标准第 2 节，探针 烘焙器探针.py 的同一套算法）：单格 ≥ 下限、屏幕放大 ≤ 1、30 fps 显示帧 ≥ 90%、燃烧段帧率 ≥ 下限、尺寸参数有效
    多层组合：每一层都要过。
  版本：renderVer 37（3.7 渲染、还没迁移到 4.0）单独标出来，画质项预计不过。

输出：tool/data/standard.js（FW_STANDARD）、analysis/probe/标准检查/标准检查.json + .md
"""
import argparse, asyncio, importlib.util, json, pathlib, sys, time

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
spec = importlib.util.spec_from_file_location('probe', HERE / '烘焙器探针.py')
probe = importlib.util.module_from_spec(spec); spec.loader.exec_module(probe)
from browser_runtime import chromium_options, verify_renderer

STD = {'pcCell': 512, 'minFps': 12, 'maxMag': 1.0}
LIB_TYPES = ['kiku', 'botan', 'kamuro', 'yanagi', 'senrin', 'hachi', 'palm', 'henka', 'strobe', 'glitter', 'crackle', 'matsuba', 'crossette', 'ochiba', 'jisa', 'ring', 'saturn', 'kata', 'water']

JS_ENTRY = r"""
(id) => {
  const L = (window.FW_REVIEW_LIST || (typeof FW_REVIEW !== 'undefined' ? FW_REVIEW : [])), e = L.find(x => x.id === id);
  const r = typeof REPLICA_BY_ID !== 'undefined' ? REPLICA_BY_ID[id] : null;
  if (!e && !r) return null;
  const P = r ? __fw.replicaPM(id).P : null;
  return { id, kind: e ? e.kind : 'preset', name: (e || r).name, video: !!(e ? e.video : (r && r.video)), layers: e && e.layerIds ? e.layerIds : null,
           form: P ? P.form : null, type: P ? P.type : null, renderVer: P ? (P.renderVer || 37) : null, superseded: !!(e && e.superseded) };
}
"""


def features(info):
    """条目 6 样东西：按类型判断（这些能力是代码统一提供的，不按效果手做）"""
    k, form = info['kind'], info.get('form')
    seq = form in ('master', 'segments', 'trail')
    f = {}
    f['实时模拟'] = (k != 'asset', '素材条目只有贴图播放' if k == 'asset' else '')
    f['引擎回放 + 游戏内大小'] = (k == 'combo' or seq or form in ('unit', 'loop'), '')
    f['贴图 + 流转动画'] = (k != 'queued', '多层：每层在层条目里看' if k == 'combo' else '')
    f['完整参数'] = (k not in ('asset', 'queued'), '素材条目右栏没有参数' if k == 'asset' else ('多层：在层条目里调，回到整体会用调过的参数' if k == 'combo' else ''))
    f['导出素材包（cascade.json PC + 手机）'] = (k == 'combo' or seq, '' if (k == 'combo' or seq) else f'产物「{form}」还没有 cascade.json')
    f['实拍对照'] = (True, '有参考视频' if info.get('video') else '无参考（不适用）')
    return f


async def run(targets, write):
    from playwright.async_api import async_playwright
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(**chromium_options())
        pg = await b.new_page(viewport={'width': 1400, 'height': 900})
        await pg.goto(probe.HTML.resolve().as_uri(), wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof REPLICA_BY_ID !== "undefined"', timeout=0)
        renderer = verify_renderer(await pg.evaluate("(()=>{const g=document.createElement('canvas').getContext('webgl2');const x=g&&g.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):'?'})()"))
        if targets is None:
            targets = await pg.evaluate("""() => { const ids = new Set();
              const S = typeof FW_EFFECTS !== 'undefined' ? FW_EFFECTS : [];
              for (const ef of S) for (const k of ['待验收版', '主条目', '工作版']) if (ef[k] && !String(ef[k]).startsWith('rep:')) ids.add(ef[k]);
              for (const r of (typeof REPLICAS !== 'undefined' ? REPLICAS : [])) if (!r.fromReview) ids.add(r.id);
              return [...ids]; }""")
            targets += ['type40:' + t for t in LIB_TYPES]
        for t in targets:
            t0 = time.time()
            if t.startswith('type'):
                info = {'id': t, 'kind': 'preset', 'name': t, 'form': 'master', 'renderVer': 40 if t.startswith('type40:') else 37}
            else:
                info = await pg.evaluate(JS_ENTRY, t)
                if not info: out[t] = {'id': t, 'error': '找不到条目'}; continue
            res = {'id': t, 'name': info['name'], 'kind': info['kind'], 'renderVer': info.get('renderVer'), 'checks': []}
            for name, (ok, note) in features(info).items(): res['checks'].append([name, bool(ok), note])
            ids = info['layers'] if info.get('layers') else [t]
            q = {}
            for lid in ids:
                m = await pg.evaluate(probe.JS_METRICS, {'id': lid, 'fps': 30, 'dists': [800, 1000, 1200], 'screenH': 1080, 'frac': 1 / 3})
                if 'grid' not in m: continue
                v = probe.verdict(m, STD)
                for k2, ok in v.items(): q.setdefault(k2, []).append((lid, ok, m))
                if m.get('renderVer', 37) < 40: res['renderVer'] = 37
            for k2, rows in q.items():
                bad = [lid for lid, ok, _ in rows if not ok]
                m0 = rows[0][2]
                detail = {'单格 ≥ PC 下限': f"单格 {m0['grid']['cellW']:.0f} px", '屏幕放大 ≤ 1': f"放大 {m0['screen']['mag']}",
                          '30fps 显示帧 ≥ 90%': f"{m0['frames30']['shown']}/{m0['frames30']['total']}", '燃烧段有效帧率 ≥ 下限': f"{m0['minFpsActive']} fps",
                          '尺寸参数有效': ''}.get(k2, '')
                if len(rows) > 1: detail = (f'{len(rows) - len(bad)}/{len(rows)} 层通过' + (f'；不过：{", ".join(bad)}' if bad else ''))
                res['checks'].append([k2, not bad, detail])
            if res.get('renderVer') == 37: res['note'] = '3.7 渲染（还没迁移到 4.0），画质项预计不过'
            res['pass'] = all(ok for _, ok, _ in res['checks'])
            res['seconds'] = round(time.time() - t0, 1)
            out[t] = res
            print(t, '✅' if res['pass'] else '❌', '；'.join(n for n, ok, _ in res['checks'] if not ok), flush=True)
        await b.close()
    doc = {'generated': time.strftime('%Y-%m-%d %H:%M'), 'renderer': renderer, 'std': STD, 'items': out}
    d = ROOT / 'analysis' / 'probe' / '标准检查'; d.mkdir(parents=True, exist_ok=True)
    (d / '标准检查.json').write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding='utf-8')
    lines = ['| 条目 | 结果 | 没过的项 |', '|---|---|---|'] + [
        f"| {k} {v.get('name', '')} | {'✅' if v.get('pass') else '❌'} | {'；'.join(f'{n}（{d2}）' if d2 else n for n, ok, d2 in v.get('checks', []) if not ok) or v.get('error', '')} |" for k, v in out.items()]
    (d / '标准检查.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    if write:
        (ROOT / 'tool' / 'data' / 'standard.js').write_text('var FW_STANDARD = ' + json.dumps(doc, ensure_ascii=False) + ';\n', encoding='utf-8')
    print('→', d)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('targets', nargs='*')
    ap.add_argument('--no-write', action='store_true')
    a = ap.parse_args()
    asyncio.run(run(a.targets or None, not a.no_write))
