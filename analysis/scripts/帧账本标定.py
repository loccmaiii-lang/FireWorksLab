"""帧账本标定（烘焙器 4.9.26，对话框23；用户 10-07 09:20「2.可以，你标定完，我可以多测试几个」）
「卡不卡」的口径 = 相邻两帧之间，跑得快的星（90 分位星速）在游戏画面上跳了多少像素（1080p、四尺玉占 1/3 屏高、800 m）。
标定线 = 金芒菊 4.56 s 放一张 64 帧（用户 2026-10-01「在游戏中很流畅」；4.0.2 的分法 22 / 21 / 11 / 10 帧各停 1 / 2 / 3 / 4 tick）里，
停 2 tick 以上的帧最多跳了多少像素。打印这个数，写进 tool/src/js/31_plan40.js 的 STEP_REF_PX。
同时列几个效果按现在的帧计划算出来的账（最慢 fps、最大跳动、超线帧数），给用户挑着在 UE 里试。
用法：python3 analysis/scripts/帧账本标定.py [--html 别的版本的 FireworkBaker.html]
"""
import argparse, asyncio, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from browser_runtime import launch_async
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
JS = r"""async () => {
  const pick = ids => { for (const id of ids) { const e = entryById(id); if (e && e.p) return { id, P: derive({ ...structuredClone(defaultsFor(e.base).P), ...structuredClone(e.p) }) }; } return null; };
  const jm = pick(['JM3', 'JM1', 'JM4-40']); if (!jm) return { err: '找不到金芒菊条目' };
  const P = { ...jm.P, duration: 4.56 }, fm = measure(P);
  // 4.0.2 的分法：22 / 21 / 11 / 10 帧各停 1 / 2 / 3 / 4 tick，从开花开始
  const times = [], dur = []; let t = 0; for (const [n, k] of [[22, 1], [21, 2], [11, 3], [10, 4]]) for (let i = 0; i < n; i++) { times.push(t / 30); dur.push(k / 30); t += k; }
  const ref = frameLedger(P, fm, { times, dur });
  const out = { jm: jm.id, ticks: t, ref: { maxHeld: ref.maxHeld, maxBurst: ref.maxBurst, holds: ref.holds }, ppm: +gamePixelsPerMeter(P, 0, STEP_REF_H, STEP_REF_DIST).toFixed(4) };
  STEP_REF_PX = ref.maxHeld;
  // 几个效果按现在的帧计划
  out.now = {};
  for (const [nm, P1] of [['金芒菊（现在）', jm.P], ...['kiku', 'botan', 'kamuro', 'senrin', 'strobe', 'crackle'].map(t => [t, derive({ ...structuredClone(defaultsFor(t, 40).P), type: t })])]) {
    const fm1 = measure(P1), pl = plan(P1, fm1), L = frameLedger(P1, fm1, pl);
    out.now[nm] = { F: L.F, minFps: +L.minFps.toFixed(1), maxHeld: L.maxHeld, over: L.over, holds: L.holds, dur: +P1.duration.toFixed(2) };
  }
  return out;
}"""


async def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--html', default=str(ROOT / 'tool' / 'FireworkBaker.html')); a = ap.parse_args()
    async with async_playwright() as p:
        b = await launch_async(p); pg = await b.new_page()
        await pg.goto(pathlib.Path(a.html).resolve().as_uri() + '?fast'); await pg.wait_for_function('window.__fw && window.__fw.idle && window.__fw.idle()', timeout=180000)
        r = await pg.evaluate(JS); print(json.dumps(r, ensure_ascii=False, indent=1)); await b.close()

asyncio.run(main())
