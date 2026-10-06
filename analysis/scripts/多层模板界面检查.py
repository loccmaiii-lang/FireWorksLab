"""多层花型模板的界面走一遍（4.5.5，对话框新花型）：左栏一组 → 打开 → 多层查看器（每层参数、引擎回放）→ 资产栏 → 新建效果选多层模板 → 导出一个包

用法：python3 analysis/scripts/多层模板界面检查.py [--id shinBotan] [--out 目录]
  --tex：每层贴图边长（默认 0 = 各层自己的 2048；设小了取帧计划凑不出 ≥ 512 的单格会卡住，别用）。云端软件渲染一层要几分钟
退出码 0 = 全过。结果写 <out>/多层模板界面检查.json，引擎回放截图 <out>/<id>_引擎回放.png。
"""
import argparse, asyncio, base64, json, pathlib, sys, time, zipfile, io
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from browser_runtime import launch_async
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'


async def wait_idle(pg, idle):
    """等烘完；每 30 s 打一行进度（云端软件渲染很慢，看得出没卡死）"""
    t0 = time.time()
    while not await pg.evaluate(idle):
        st = await pg.evaluate('() => ({ baking: state.baking, q: state.layerQueue ? state.layerQueue.size : 0, refine: state.layerRefine ? state.layerRefine.size : 0, due: !!state.refineDue, busy: !$("#busy").hidden, busyText: $("#busy").textContent.slice(0, 60), baked: state.layers.filter(L => { const e = layerEntryOf(L); return e && e.bake; }).length })')
        print(f'  …{time.time() - t0:.0f}s', json.dumps(st, ensure_ascii=False), flush=True)
        await asyncio.sleep(30)


async def main(a):
    from playwright.async_api import async_playwright
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    res, errs = [], []
    def ok(name, cond, note=''): res.append({'name': name, 'pass': bool(cond), 'note': note}); print('✅' if cond else '❌', name, note, flush=True)
    async with async_playwright() as p:
        b = await launch_async(p)
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
        if a.tex: await ctx.add_init_script(f'window.FW_LIB_TEX = {a.tex};')     # 只在要试小贴图时设；4.2.6 起单格 ≥ 512 由取帧计划保证，贴图小于 2048 时计划会一直找不到格子（卡住），默认不设
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept('多层模板检查')))
        await pg.goto(HTML.resolve().as_uri() + '?fast&autobake=1', wait_until='domcontentloaded', timeout=0)     # fast：不自动打开待验收的效果（不然先烘别的）
        await pg.wait_for_function('window.__fw && typeof MULTI_TYPES !== "undefined" && document.querySelector("#libBody .li, #libBody .tile")', timeout=0)
        # 4.9.6（对话框15）：新建效果起名换成应用内对话框，这里直接替它回答（原生 dialog 监听留着兜底）
        await pg.evaluate("window.askSaveName = async () => '多层模板检查'; window.askConfirm = async () => true; 0")
        idle = 'window.__fw.idle() && document.querySelector("#busy").hidden'
        n = await pg.evaluate('MULTI_TYPES.length')
        tiles = await pg.evaluate('[...document.querySelectorAll(\'#libBody .lg-mtypes .tile\')].map(t => t.dataset.key)')
        ok('左栏有「多层花型模板」一组，每个模板一个缩略图', len(tiles) == n and n > 0, f'{len(tiles)}/{n}')
        # 打开
        t0 = time.time()
        await pg.evaluate(f'document.querySelector(\'#libBody .lg-mtypes .tile[data-key="mt:{a.id}"]\').click()')
        await pg.wait_for_function(f'state.tab === "combo" && state.layers.length === MULTI_BY_ID["{a.id}"].layers.length', timeout=0)
        await wait_idle(pg, idle)
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
        await wait_idle(pg, idle)
        ch2 = await pg.evaluate('() => ({ stars: layerEntryOf(state.layers[1]).P.stars, r0: layerEntryOf(state.layers[0]).bakeRev || 0, changed: !!wb.changed })')
        ok('改第 2 层参数：只改这一层，资产栏标「已变」', ch2['stars'] == ch['stars'] and ch2['r0'] == ch['r0'] and ch2['changed'], json.dumps(ch2))
        # 引擎回放截图（整体）
        await pg.evaluate('() => { selectComboLayer(-1); setViewSeg("export"); state.playing = false; state.t = 1.2; }')
        await pg.wait_for_timeout(1500)
        shot = await pg.evaluate('() => window.__fw.thumbNow()')
        (out / f'{a.id}_引擎回放.png').write_bytes(base64.b64decode(shot.split(',')[1]))
        hud = await pg.evaluate('() => (typeof hudText !== "undefined" ? hudText : "")')
        ok('引擎回放画整体（按导出贴图）', bool(shot) and len(shot) > 5000, hud[:80])
        # 4.9.6「生成缩略图」：停在这一帧截成缩略图（左栏、资产栏 / 版本记录都换），再截 = 覆盖，⋯「恢复示意图」= 回到示意图
        th = await pg.evaluate('''async (id) => { const tile = () => (document.querySelector(`#libBody .lg-mtypes .tile[data-key="mt:${id}"] .im`) || { getAttribute: () => '' }).getAttribute('style') || '';
          const b0 = !$('#thGrab').hidden, s0 = tile().slice(0, 40);
          const ok1 = await thCapture(); const u1 = thUserGet('mt:' + id), s1 = tile().slice(0, 40), ab1 = ($('#abThumb .th') || { getAttribute: () => '' }).getAttribute('style').slice(0, 40), r1 = !$('#thRestore').hidden;
          state.t = 0.6; const ok2 = await thCapture(); const u2 = thUserGet('mt:' + id), n2 = Object.keys(thUserAll()).filter(k => k === 'mt:' + id).length;
          const ok3 = thRestore(); const s3 = tile().slice(0, 40), left = !!thUserGet('mt:' + id);
          return { b0, s0, ok1, t1: u1 && u1.t, len1: u1 && u1.img.length, s1, ab1, r1, ok2, t2: u2 && u2.t, n2, ok3, s3, left, img: u2 && u2.img }; }''', a.id)
        if th.get('img'): (out / f'{a.id}_截的缩略图.jpg').write_bytes(base64.b64decode(th.pop('img').split(',')[1]))
        ok('生成缩略图：时间轴上有按钮；截了左栏 / 资产栏换成截图，再截覆盖（只留一张），恢复回示意图',
           th['b0'] and th['ok1'] and 'image/jpeg' in th['s1'] and 'image/jpeg' in th['ab1'] and th['r1'] and th['ok2'] and th['t2'] == 0.6 and th['n2'] == 1 and th['ok3'] and 'svg' in th['s3'] and not th['left'],
           json.dumps(th, ensure_ascii=False)[:300])
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
        await pg.wait_for_function(f'Object.keys(myAll()).length === {before + 1}', timeout=0)
        # 只核对存下来的记录（整套层、来源）；打开以后各层要重新烘（云端软件渲染一层菊要四十分钟），不等
        my = await pg.evaluate('() => { const r = Object.values(myAll()).sort((a, b) => String(b.id).localeCompare(String(a.id)))[0]; return { n: r.snap.layers.length, from: r.from && r.from.key, name: r.name, titles: r.snap.layers.map(x => x.L.title), pack: packNamesFor("my:" + r.id, null, r.snap.layers.length, "X") }; }')
        ok('新建效果选多层模板 = 整套层存成我的效果（层名、来源、导出名）', my['n'] == 2 and my['from'] == 'mt:shinKiku' and my['pack']['base'] == 'ShinKiku', json.dumps(my, ensure_ascii=False))
        ok('页面没有脚本错误', not errs, '；'.join(errs)[:300])
        await b.close()
    (out / '多层模板界面检查.json').write_text(json.dumps({'checks': res, 'errors': errs}, ensure_ascii=False, indent=1), encoding='utf-8')
    bad = [r for r in res if not r['pass']]
    print('全过' if not bad else f'{len(bad)} 项没过')
    return 0 if not bad else 1


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--id', default='yaeshin'); ap.add_argument('--tex', type=int, default=0)
    ap.add_argument('--out', default=str(ROOT / 'analysis' / 'probe' / '多层模板'))
    raise SystemExit(asyncio.run(main(ap.parse_args())))
