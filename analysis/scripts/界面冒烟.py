"""烘焙器界面冒烟检查（改完 tool/src、推送前跑）：真的打开页面，按用户的路径点一遍，抓页面报错和「烘焙失败」横幅

用法：python3 analysis/scripts/界面冒烟.py [--out 目录] [--full]
  默认把每次烘焙降成小规格（1024 贴图、≤40 颗星、火花 ×0.2），云端软件渲染几分钟跑完；--full 用原参数（本机显卡用）。
  走的路径：花型库模板（菊 / 柳 / 点灭）、待验收条目（JM4-40）、多层效果（鸿巢）、尾缀（V5）、左栏各分组、新建配方；
  每处切 实时模拟 / 引擎回放 / 贴图 / 流转动画。
输出：<out>/冒烟.json（每步的报错、横幅文字、HUD）+ 每步截图；有报错时退出码 1。
2026-10-01 加：4.0.2 的统计行读了空的 budget.fps，烘焙结果出不来，离线检查没发现——这类错误只有在页面里才看得到。
"""
import argparse, asyncio, json, os, pathlib, platform, sys, time
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from browser_runtime import chromium_options, launch_async
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'

SMALL = r"""(() => { if (window.__smoke) return; window.__smoke = 1; const _b = bake;
  bake = (P, ...a) => _b({ ...P, texW: Math.min(P.texW || 2048, 1024), texH: Math.min(P.texH || 2048, 1024), stars: Math.min(P.stars || 40, 40),
    sparkRate: (P.sparkRate || 0) * 0.2, qMaxSub: Math.min(P.qMaxSub || 4, 2), subStars: Math.min(P.subStars || 0, 12) }, ...a); })()"""

STEPS = [
    ('左栏_待我验收', "lib.seg='review';renderLib()", None),
    ('左栏_制作中', "lib.seg='wip';renderLib()", None),
    ('左栏_已通过', "lib.seg='passed';renderLib()", None),
    ('左栏_历史', "lib.seg='hist';renderLib()", None),
    ('新建配方', "pkOpen()", None),
    ('左栏_工具', "pkClose();lib.open.tools=true;renderLib()", None),
    ('模板_菊', "setType('kiku')", 'views'),
    ('模板_柳', "setType('yanagi')", 'views'),
    ('模板_点灭', "setType('strobe')", 'views'),
    ('待验收_JM4-40', "openReview(FW_REVIEW_LIST.find(e=>e.id==='JM4-40'))", 'views'),
    ('多层_鸿巢', "openEffect(EFFS().find(e=>e.key==='hongchao'))", 'views'),
    ('多层_鸿巢_调第1层', "selectComboLayer(0)", 'views'),
    ('多层_鸿巢_审阅页', "lib.pane='review';syncPtabs()", None),
    ('多层_鸿巢_记录当前帧', "noteFrame()", None),
    ('多层_鸿巢_查看交付', "lib.pane='params';syncPtabs();toggleDeliv(true)", None),
    ('多层_鸿巢_返回画面', "toggleDeliv(false);document.querySelector('.jumps [data-jump=full]').click()", None),
    ('多层_鸿巢_回整体', "lib.pane='params';syncPtabs();selectComboLayer(-1)", None),
    ('尾缀_V5', "openEffect(EFFS().find(e=>e.key==='trail_v5'))", 'views'),
]
VIEWS = [('实时', 'live', None, 1.0), ('引擎回放', 'export', None, 1.0), ('贴图', 'atlas', '0', 1.0), ('流转', 'atlas', '1', 1.5)]


async def main(out, full, limit):
    from playwright.async_api import async_playwright
    out.mkdir(parents=True, exist_ok=True); rep = []; errs = []
    async with async_playwright() as p:
        b = await launch_async(p)
        pg = await b.new_page(viewport={'width': 1280, 'height': 760} if not full else {'width': 1600, 'height': 960})
        if not full:   # 云端软件渲染：每秒只画 3 帧，不然实时画面把主线程占满，点一下要等几分钟
            await pg.add_init_script("window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 330);")
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
        await pg.goto(HTML.resolve().as_uri() + '?fast', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
        if not full: await pg.evaluate(SMALL)
        await pg.evaluate('state.playing=false')

        async def settle():
            t0 = time.time()
            while time.time() - t0 < limit:
                st = await pg.evaluate("({idle: window.__fw.idle(), err: !$('#bakeError').hidden ? $('#bakeErrorText').textContent : '', failed: state.failedGen === state.gen})")
                if st['err'] or st['failed']: return st['err'] or '烘焙失败'
                if st['idle']: return ''
                await pg.wait_for_timeout(1000)
            return f'超过 {limit} 秒没烘完'

        async def snap(name):
            n = len(rep) + 1; await pg.evaluate('state.playing=false'); await pg.screenshot(path=str(out / f'{n:02d}_{name}.jpg'), type='jpeg', quality=70, timeout=240000)
            hud = await pg.evaluate("(document.querySelector('#hud')||{}).textContent || ''")
            rep.append({'step': name, 'errors': errs[:], 'hud': hud}); errs.clear()

        for name, js, views in STEPS:
            t0 = time.time()
            try:
                await pg.evaluate(js); await pg.wait_for_timeout(500)
                if views:
                    msg = await settle()
                    if msg: errs.append('横幅 / 烘焙：' + msg)
                    for vn, v, flow, t in VIEWS:
                        await pg.click(f"#viewSeg button[data-view='{v}']")
                        if flow is not None and await pg.is_visible(f"#flowSeg button[data-flow='{flow}']"): await pg.click(f"#flowSeg button[data-flow='{flow}']")
                        msg = await settle()
                        if msg: errs.append(f'{vn}：' + msg)
                        await pg.evaluate(f"state.playing=false; state.t={t}"); await pg.wait_for_timeout(700)
                        await snap(f'{name}_{vn}')
                else:
                    await snap(name)
            except Exception as e:
                errs.append('脚本：' + str(e).splitlines()[0]); await snap(name + '_出错')
            print(f'{name}：{time.time() - t0:.0f} s', '；'.join(e for r in rep[-4:] for e in r['errors'])[:300], flush=True)
        await b.close()
    bad = [r for r in rep if r['errors']]
    (out / '冒烟.json').write_text(json.dumps({'ok': not bad, 'steps': rep}, ensure_ascii=False, indent=1), encoding='utf-8')
    print('✅ 没有报错' if not bad else f'❌ {len(bad)} 步有报错：' + '；'.join(f"{r['step']}：{r['errors'][0][:120]}" for r in bad))
    return not bad


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--out', default=str(ROOT / 'analysis' / 'probe' / '界面冒烟'))
    ap.add_argument('--full', action='store_true'); ap.add_argument('--limit', type=int, default=900)
    a = ap.parse_args()
    sys.exit(0 if asyncio.run(main(pathlib.Path(a.out), a.full, a.limit)) else 1)
