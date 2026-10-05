"""多层花型模板的界面走一遍（4.5.5，对话框新花型）：左栏一组 → 打开 → 多层查看器（每层参数、引擎回放）→ 资产栏 → 新建效果选多层模板 → 导出一个包

用法：python3 analysis/scripts/多层模板界面检查.py [--id yaeshin] [--tex 512] [--out 目录]
  --tex：每层贴图边长（云端软件渲染用小贴图省时间，只验证流程；画质看 多层模板.py 和标准检查）
退出码 0 = 全过。结果写 <out>/多层模板界面检查.json，引擎回放截图 <out>/<id>_引擎回放.png。
"""
import argparse, asyncio, base64, json, pathlib, sys, time, zipfile, io
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from browser_runtime import launch_async
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'


async def main(a):
    from playwright.async_api import async_playwright
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    res, errs = [], []
    def ok(name, cond, note=''): res.append({'name': name, 'pass': bool(cond), 'note': note}); print('✅' if cond else '❌', name, note, flush=True)
    async with async_playwright() as p:
        b = await launch_async(p)
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
        await ctx.add_init_script(f'window.FW_LIB_TEX = {a.tex};')
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept('多层模板检查')))
        await pg.goto(HTML.resolve().as_uri() + '?fast&autobake=1', wait_until='domcontentloaded', timeout=0)     # fast：不自动打开待验收的效果（不然先烘别的）
        await pg.wait_for_function('window.__fw && typeof MULTI_TYPES !== "undefined" && document.querySelector("#libBody .li, #libBody .tile")', timeout=0)
        idle = 'window.__fw.idle() && document.querySelector("#busy").hidden'
        n = await pg.evaluate('MULTI_TYPES.length')
        tiles = await pg.evaluate('[...document.querySelectorAll(\'#libBody .lg-mtypes .tile\')].map(t => t.dataset.key)')
        ok('左栏有「多层花型模板」一组，每个模板一个缩略图', len(tiles) == n and n > 0, f'{len(tiles)}/{n}')
        # 打开
        t0 = time.time()
        await pg.evaluate(f'document.querySelector(\'#libBody .lg-mtypes .tile[data-key="mt:{a.id}"]\').click()')
        await pg.wait_for_function(f'state.tab === "combo" && state.layers.length === MULTI_BY_ID["{a.id}"].layers.length', timeout=0)
        await pg.wait_for_function(idle, timeout=0, polling=500)
        info = await pg.evaluate('''(id) => ({ n: state.layers.length, key: lib.key, sel: state.comboSel, name: $('#abName').textContent, sub: $('#abSub').textContent, bar: !$('#assetBar').hidden,
          titles: state.layers.map(L => L.title), delays: state.layers.map(L => L.delay), outs: state.layers.map(L => layerOut(L).pc),
          baked: state.layers.every(L => { const e = layerEntryOf(L); return e && e.bake; }), panel: !$('#pMaster').hidden && document.querySelectorAll('#pMaster input, #pMaster select').length,
          crumb: $('#crumb').textContent, pack: packNamesFor(wbKey(), null, state.layers.length, 'X') })''', a.id)
        ok('打开 = 多层查看器，层数 / 层名 / 延迟按模板', info['n'] == len(info['titles']) and all(d == 0 for d in info['delays']) and info['key'] == 'mt:' + a.id, json.dumps(info['titles'], ensure_ascii=False))
        ok('打开就选第 1 层，右栏是这一层的完整参数', info['sel'] == 0 and info['panel'] and info['panel'] > 20, f"控件 {info['panel']}")
        ok('每层都烘好（引擎回放有贴图）', info['baked'], f'{time.time() - t0:.0f}s')
        ok('资产栏显示模板名、多层花型模板', info['bar'] and '多层花型模板' in info['sub'], f"{info['name']} · {info['sub']}")
        ok('导出名默认是模板英文名 + 层英文名', info['pack']['base'] != 'X' and all(info['pack']['layers']), json.dumps(info['pack'], ensure_ascii=False))
        # 切到第 2 层改一个参数，只重烘这一层，回到整体
        ch = await pg.evaluate('''async () => { selectComboLayer(1); const e = layerEntryOf(state.layers[1]), e0 = layerEntryOf(state.layers[0]); const r0 = e0.bakeRev || 0;
          state.P.stars = Math.round(state.P.stars * 0.9); onParam(); return { r0, stars: state.P.stars, lib: e.name }; }''')
        await pg.wait_for_function(idle, timeout=0, polling=500)
        ch2 = await pg.evaluate('() => ({ stars: layerEntryOf(state.layers[1]).P.stars, r0: layerEntryOf(state.layers[0]).bakeRev || 0, changed: !!wb.changed })')
        ok('改第 2 层参数：只改这一层，资产栏标「已变」', ch2['stars'] == ch['stars'] and ch2['r0'] == ch['r0'] and ch2['changed'], json.dumps(ch2))
        # 引擎回放截图（整体）
        await pg.evaluate('() => { selectComboLayer(-1); setViewSeg("export"); state.playing = false; state.t = 1.2; }')
        await pg.wait_for_timeout(1500)
        shot = await pg.evaluate('() => window.__fw.thumbNow()')
        (out / f'{a.id}_引擎回放.png').write_bytes(base64.b64decode(shot.split(',')[1]))
        hud = await pg.evaluate('() => (typeof hudText !== "undefined" ? hudText : "")')
        ok('引擎回放画整体（按导出贴图）', bool(shot) and len(shot) > 5000, hud[:80])
        # 导出一个包（多层 → 一个 zip，每层一个发射器）
        async with pg.expect_download(timeout=0) as dl:
            await pg.evaluate('() => exportCombo()')
        d = await dl.value; zb = pathlib.Path(await d.path()).read_bytes(); z = zipfile.ZipFile(io.BytesIO(zb)); names = z.namelist()
        cj = [n2 for n2 in names if n2.endswith('/cascade.json')]
        em = json.loads(z.read(cj[0]).decode('utf-8')) if cj else {}
        nem = len(em.get('emitters') or em.get('layers') or [])
        ok('导出：一个包，cascade.json（PC）+ cascade_mobile.json，每层有贴图 / Ramp', bool(cj) and any(n2.endswith('cascade_mobile.json') for n2 in names) and sum(n2.endswith('_R.png') for n2 in names) >= info['n'], f"{d.suggested_filename} · {len(names)} 个文件 · 发射器 {nem}")
        # 「＋ 新建效果」选多层模板 → 存成我的效果（整套层）
        before = await pg.evaluate('Object.keys(myAll()).length')
        await pg.evaluate('() => myNew()')
        await pg.evaluate('() => [...document.querySelectorAll("#pkCats button")].find(b => b.textContent.startsWith("多层模板")).click()')
        await pg.evaluate('() => [...document.querySelectorAll("#pkGrid .pk-card")].find(c => c.querySelector(".nm").textContent === "芯入菊").click()')
        await pg.wait_for_function(f'Object.keys(myAll()).length === {before + 1} && lib.my', timeout=0)
        await pg.wait_for_function(idle, timeout=0, polling=500)
        my = await pg.evaluate('() => ({ n: state.layers.length, from: lib.my.from && lib.my.from.key, name: lib.my.name })')
        ok('新建效果选多层模板 = 整套层存成我的效果', my['n'] == 2 and my['from'] == 'mt:shinKiku', json.dumps(my, ensure_ascii=False))
        await pg.evaluate('() => removeMyFx(lib.my.id)')
        ok('页面没有脚本错误', not errs, '；'.join(errs)[:300])
        await b.close()
    (out / '多层模板界面检查.json').write_text(json.dumps({'checks': res, 'errors': errs}, ensure_ascii=False, indent=1), encoding='utf-8')
    bad = [r for r in res if not r['pass']]
    print('全过' if not bad else f'{len(bad)} 项没过')
    return 0 if not bad else 1


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--id', default='yaeshin'); ap.add_argument('--tex', type=int, default=512)
    ap.add_argument('--out', default=str(ROOT / 'analysis' / 'probe' / '多层模板'))
    raise SystemExit(asyncio.run(main(ap.parse_args())))
