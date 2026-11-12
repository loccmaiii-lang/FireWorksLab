"""E 4.1 合入验收：真实入口的样式、共享曲线编辑、撤销与持久化；全程离线，不连 UE。"""
import argparse
import asyncio
import json
import re
from pathlib import Path
from playwright.async_api import async_playwright
from browser_runtime import launch_async

ROOT = Path(__file__).resolve().parents[2]


async def idle(pg):
    await pg.wait_for_function('!state.baking && !state.dirty && state.layers.every(l => {const e=layerEntryOf(l);return !e || (!e.baking && !e.timer)})', timeout=120000)


async def curve_row(pg, key):
    row = pg.locator(f'#params [data-curve-key="{key}"]')
    await row.evaluate("r => {const d=r.closest('details'); if(d) {modSetOpen(d,true);pview.mopen[d._key]=true;} }")
    await row.scroll_into_view_if_needed()
    return row


async def curve_value(pg, key):
    return await pg.evaluate('k => parseCurve(pGet(state.P,k)) || []', key)


async def add_point(pg, row, x=.5, y=.5):
    box = await row.locator('.fw-curve-plot').bounding_box()
    await pg.mouse.dblclick(box['x'] + box['width'] * x, box['y'] + box['height'] * y)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--html', type=Path, default=ROOT / 'tool/烟花工坊.html')
    ap.add_argument('--out', type=Path, default=ROOT / 'analysis/local/20261112_E4.1返工')
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    results = []
    async with async_playwright() as p:
        b = await launch_async(p)
        ctx = await b.new_context(viewport={'width': 1920, 'height': 1080})
        await ctx.route('http://**/*', lambda route: route.abort())
        await ctx.route('https://**/*', lambda route: route.abort())
        pg = await ctx.new_page()
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        await pg.goto(a.html.resolve().as_uri())
        await pg.wait_for_function('window.__fw && typeof EFFS === "function"')
        await pg.evaluate("window.askSaveName = async () => 'E41曲线验收'; window.askConfirm = async () => true")
        await pg.evaluate("myCreate('kiku')")
        await idle(pg)
        await pg.evaluate("selectComboLayer(0); selectEmitTab('星')")
        # 旧页面没有任何可编辑曲线点；此项必须先失败，不能再用只读图冒充合入。
        count = await pg.locator('#params .fw-curve').count()
        results.append({'item': '正式参数面板使用共享曲线编辑器', 'pass': count > 0, 'count': count})
        assert count > 0, '旧只读曲线尚未替换'
        try:
            async def check(name, passed, detail=None):
                results.append({'item': name, 'pass': bool(passed), 'detail': detail})
                print(('PASS ' if passed else 'FAIL ') + name, flush=True)
                assert passed, f'{name}: {detail}'

            source = (ROOT/'tool/src/js/95_shell.js').read_text(encoding='utf-8')
            version = re.search(r"const SHELL_VER = '([^']+)'", source).group(1)
            await check('顶栏与本版更新说明一致', version in await pg.locator('.sh-ver').inner_text() and await pg.evaluate('v=>UPDATES[0].title.startsWith(v)', version), version)
            key = 'starSizeCurve'
            row = await curve_row(pg, key)
            await check('打开空曲线不改原配方', await curve_value(pg, key) == [])
            await add_point(pg, row)
            v = await curve_value(pg, key)
            await check('双击加点写入真实参数', len(v) == 3 and abs(v[1][1] - .5) < .02, v)
            # 一次拖动中停顿，仍然只记一次撤销。
            await pg.wait_for_timeout(50)
            n = await pg.evaluate('undo.back.length')
            dot = row.locator('.fw-curve-point').nth(1)
            bb = await dot.bounding_box()
            box = await row.locator('.fw-curve-plot').bounding_box()
            await pg.mouse.move(bb['x'] + bb['width']/2, bb['y'] + bb['height']/2)
            await pg.mouse.down()
            await pg.mouse.move(box['x'] + box['width']*.6, box['y'] + box['height']*.6, steps=5)
            await pg.wait_for_timeout(650)
            await pg.mouse.move(box['x'] + box['width']*.65, box['y'] + box['height']*.75, steps=5)
            await pg.mouse.up()
            await pg.wait_for_timeout(80)
            dragged = await curve_value(pg, key)
            await check('拖点和单次撤销边界', abs(dragged[1][0]-.65)<.02 and abs(dragged[1][1]-.25)<.02 and await pg.evaluate('undo.back.length') == n+1, dragged)
            await pg.locator('#abUndo').click()
            await idle(pg)
            await check('撤销还原曲线', await curve_value(pg, key) == v)
            await pg.locator('#abRedo').click()
            await idle(pg)
            await check('重做恢复曲线', await curve_value(pg, key) == dragged)
            row = await curve_row(pg, key)
            await row.locator('.fw-curve-point').nth(1).click()
            yinput = row.locator('[data-axis="1"]')
            await yinput.fill('2.5')
            await yinput.press('Enter')
            await check('精确输入支持大于 1 的倍率', (await curve_value(pg, key))[1][1] == 2.5)
            box = await yinput.bounding_box()
            await pg.mouse.move(box['x']+10, box['y']+10)
            await pg.mouse.down()
            await pg.mouse.move(box['x']+30, box['y']+10, steps=5)
            await pg.mouse.up()
            await check('数值框拖动也使用共享曲线提交', (await curve_value(pg, key))[1][1] == 2.7)
            await pg.locator('#abUndo').click()
            await idle(pg)
            row = await curve_row(pg, key)
            await row.locator('.fw-curve-point').nth(1).click()
            yinput = row.locator('[data-axis="1"]')
            await yinput.fill('2abc')
            await yinput.press('Enter')
            await check('非法数字不改参数', await yinput.get_attribute('aria-invalid') == 'true' and (await curve_value(pg, key))[1][1] == 2.5)
            await yinput.press('Escape')
            before = await curve_value(pg, key)
            await row.locator('.fw-curve-point').nth(1).press('ArrowDown')
            await check('方向键微调关键点', (await curve_value(pg, key))[1][1] == 2.49)
            before = await curve_value(pg, key)
            dot = row.locator('.fw-curve-point').nth(1)
            bb = await dot.bounding_box()
            await pg.mouse.move(bb['x']+7, bb['y']+7)
            await pg.mouse.down()
            await pg.mouse.move(bb['x']+30, bb['y']+40, steps=4)
            await pg.keyboard.press('Escape')
            await pg.mouse.up()
            await check('Esc 取消拖动不写参数', await curve_value(pg, key) == before)
            await row.locator('.fw-curve-point').nth(1).press('Delete')
            await check('Delete 删除中间点', len(await curve_value(pg, key)) == 2)
            await row.locator('.fw-curve-point').first.press('Delete')
            await check('保留边界点', len(await curve_value(pg, key)) == 2)
            await add_point(pg, row, .35, .4)
            saved = await curve_value(pg, key)
            await check('曲线显示改动及行尾还原', 'chg' in (await row.get_attribute('class')) and await row.locator('.rrst').is_visible())
            await row.locator('.rrst').click()
            await check('行尾还原回到打开时', await curve_value(pg, key) == [])
            await pg.locator('#abUndo').click()
            await idle(pg)
            await check('还原操作也可以撤销', await curve_value(pg, key) == saved)
            row = await curve_row(pg, key)
            await row.locator('.fk').dblclick()
            await check('双击曲线名恢复模板默认', await curve_value(pg, key) == [])
            await pg.locator('#abUndo').click()
            await idle(pg)
            mid = await pg.evaluate('lib.my.id')
            await pg.locator('#abSave').click()
            await pg.wait_for_function('id => !!myAll()[id] && myAll()[id].snap.layers[0].P.starSizeCurve === state.P.starSizeCurve', arg=mid)
            await pg.reload()
            await pg.wait_for_function('window.__fw')
            await pg.evaluate('id => openMyEffect(id)', mid)
            await idle(pg)
            await check('保存刷新重开保留曲线', await curve_value(pg, key) == saved)
            await pg.evaluate("selectEmitTab('星');state.playing=false;state.t=1.1")
            row = await curve_row(pg, key)
            await pg.screenshot(path=str(a.out / '共享曲线1920.png'))
            for width, height in [(1920, 1080), (1366, 768)]:
                await pg.set_viewport_size({'width': width, 'height': height})
                await pg.wait_for_timeout(250)
                await row.scroll_into_view_if_needed()
                metrics = await pg.evaluate("""() => {
                  const r=s=>document.querySelector(s).getBoundingClientRect(), cs=s=>getComputedStyle(document.querySelector(s));
                  const curve=document.querySelector('[data-curve-key=starSizeCurve] .fw-curve');
                  return {toolbar:r('#viewbar').height,thumb:r('#libBody .li .th').width,
                    mode:cs('#viewSeg [aria-pressed=true]').boxShadow,
                    filterFirst:r('#e51LibCats').top<r('#libSearch').top,
                    curveFits:curve.scrollWidth<=curve.clientWidth+1,
                    pageFits:document.documentElement.scrollWidth<=innerWidth,
                    stageRead:!!document.querySelector('.viewframe #vfRead')};
                }""")
                await check(f'{width} 完整工具行、紧凑库与曲线布局', metrics['toolbar'] <= 44 and metrics['thumb'] <= 40 and metrics['mode'] != 'none' and metrics['filterFirst'] and metrics['curveFits'] and metrics['pageFits'] and metrics['stageRead'], metrics)
                await pg.screenshot(path=str(a.out / f'布局{width}.png'))
            await pg.set_viewport_size({'width': 1920, 'height': 1080})
            await pg.locator('#viewSeg [data-view="export"]').click()
            await idle(pg)
            await pg.locator('#dispSeg [data-disp="fit"]').click()
            await pg.wait_for_timeout(450)
            await check('真实烘焙可以回放', await pg.evaluate("state.view==='export' && state.layers.some(l=>!!layerEntryOf(l).bake)"))
            await pg.screenshot(path=str(a.out/'真实回放1920.png'))
            await pg.locator('#viewSeg [data-view="flow"]').click()
            await pg.wait_for_function("document.querySelector('.canvas-wrap').classList.contains('e51-atlas')")
            await check('序列贴图入口可用', await pg.evaluate("state.view==='atlas' && document.querySelector('#viewSeg [data-view=flow]').getAttribute('aria-pressed')==='true'"))
            await pg.screenshot(path=str(a.out/'序列贴图1920.png'))
            await pg.set_viewport_size({'width':1366,'height':768})
            await pg.screenshot(path=str(a.out/'序列贴图1366.png'))
            await pg.set_viewport_size({'width':1920,'height':1080})
            await pg.locator('#viewSeg [data-view="export"]').click()
            await pg.wait_for_function("!document.querySelector('.canvas-wrap').classList.contains('e51-atlas')")
            await pg.locator('#expBtn .exp-dd').click()
            await check('导出菜单可见且不被截断', await pg.locator('#expMenu').is_visible() and await pg.locator('#expMenu').evaluate('e=>e.getBoundingClientRect().right<=innerWidth'))
            await pg.screenshot(path=str(a.out/'导出菜单1920.png'))
            await pg.set_viewport_size({'width':1366,'height':768})
            await pg.screenshot(path=str(a.out/'导出菜单1366.png'))
            await pg.keyboard.press('Escape')
            # 分层粒子图：走真实模板和相同编辑器，存储仍为数组，不借普通参数字符串。
            await pg.set_viewport_size({'width': 1920, 'height': 1080})
            await pg.evaluate("window.askSaveName=async()=> 'E41粒子图验收';window.askConfirm=async()=>true;myCreate('sparkgraph')")
            await pg.wait_for_function('!!state.P.sparkGraph', timeout=30000)
            await idle(pg)
            gkey = await pg.evaluate("panelRows.find(([r,it])=>it.curve && isPathKey(it.curve))[1].curve")
            await pg.evaluate("k=>{const r=panelRows.find(([r,it])=>it.curve===k);selectEmitTab(r[3]._g)}", gkey)
            grow = await curve_row(pg, gkey)
            original = await curve_value(pg, gkey)
            await add_point(pg, grow, .42, .45)
            gv = await curve_value(pg, gkey)
            await check('粒子图共享曲线写入数组', gv != original and await pg.evaluate('k=>Array.isArray(pGet(state.P,k))', gkey), gv)
            await pg.locator('#abUndo').click()
            await idle(pg)
            await check('粒子图曲线撤销', await curve_value(pg, gkey) == original)
            await pg.evaluate('state.playing=false;state.t=.9')
            await pg.locator('#dispSeg [data-disp="fit"]').click()
            await pg.wait_for_timeout(450)
            await pg.screenshot(path=str(a.out/'粒子图1920.png'))
            await pg.set_viewport_size({'width':1366,'height':768})
            grow = await curve_row(pg, gkey)
            await pg.screenshot(path=str(a.out/'粒子图1366.png'))
            # 独立样例和正式页面加载同一个组件文件。
            demo = await ctx.new_page()
            await demo.goto((ROOT/'tool/design-system/index.html').as_uri())
            await demo.locator('#curve-example').scroll_into_view_if_needed()
            await demo.locator('#curve-example .fw-curve-point').nth(1).press('ArrowDown')
            await check('组件库样例调用相同编辑器', '0.79' in await demo.locator('#curve-value').text_content())
            await demo.close()
        except Exception:
            await pg.screenshot(path=str(a.out / '失败现场.png'))
            (a.out / '检查结果.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
            raise
        results.append({'item': '页面无脚本错误', 'pass': not errors, 'errors': errors})
        await b.close()
    (a.out / '检查结果.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(results, ensure_ascii=False, indent=2))
    if any(not r['pass'] for r in results):
        raise SystemExit(1)


if __name__ == '__main__':
    asyncio.run(main())
