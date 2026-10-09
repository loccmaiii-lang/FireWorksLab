"""星头取景（相机渲染，2026-10-09）：打开一个条目，在烘焙器里按「引擎回放 / 实时模拟」×「1 纹素 = 1 像素 / 适应窗口 / 游戏内大小」截几个时刻。
截的是烘焙器画布（#gl）本身，和用户在烘焙器里看到的是同一张画面；给 analysis/probe/星头光晕诊断_2026-10-09/星头剖面.py 量星头剖面用。

  python analysis/scripts/星头取景.py --entry FC8R --out <目录> [--times 1.0,1.6] [--disp px,fit,game] [--view export,live] [--size 1600x1000]
输出：<目录>/<entry>_<view>_<disp>_<t>.png，以及 取景.json（每张图的时刻、显示方式、画布每米像素）。
本机显卡跑（和 run_jobs.py 共用显卡锁）。
"""
import argparse, json, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'analysis', 'local'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--entry', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--times', default='1.0,1.6'); ap.add_argument('--disp', default='px,fit,game'); ap.add_argument('--view', default='export,live')
    ap.add_argument('--size', default='1600x1000')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    W, H = (int(x) for x in a.size.split('x'))
    from compare import SimSession
    try:
        from job_lock import ProcessLock, gpu_lock_path
        lock = ProcessLock(gpu_lock_path(ROOT))
    except Exception:
        lock = None
    meta = []
    ctx = lock if lock else open(os.devnull)
    with ctx:
        s = SimSession()
        try:
            pg = s.pg; pg.set_viewport_size({'width': W, 'height': H})
            pg.evaluate("state.layers = []; state.comboName = ''")
            pg.evaluate(f"openReview(FW_REVIEW_LIST.find(e => e.id === {json.dumps(a.entry)}))")
            pg.wait_for_function("window.__fw && window.__fw.idle() && (state.tab !== 'combo' || (state.layers.length > 0 && state.layers.every(L => { const e = state.lib.find(x => x.name === L.lib); return e && e.bake; })))", timeout=0)
            pg.wait_for_timeout(1200)
            pg.evaluate("state.view = 'live'; state.t = 0; state.playing = true"); pg.wait_for_timeout(2500); pg.evaluate("state.playing = false")
            for view in a.view.split(','):
                for disp in a.disp.split(','):
                    for t in (float(x) for x in a.times.split(',')):
                        pg.evaluate(f"state.view = {json.dumps(view)}; state.disp = {json.dumps(disp)}; state.playing = false; state.t = {t}")
                        pg.wait_for_timeout(900)
                        fn = f"{a.entry}_{view}_{disp}_{t:.2f}.png"
                        pg.locator('#gl').screenshot(path=os.path.join(a.out, fn))
                        hud = pg.evaluate("typeof hudText === 'string' ? hudText : ''")
                        meta.append(dict(file=fn, entry=a.entry, view=view, disp=disp, t=t, hud=hud))
                        print(fn, '·', hud[:120], flush=True)
        finally:
            s.close()
    json.dump(meta, open(os.path.join(a.out, '取景.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
