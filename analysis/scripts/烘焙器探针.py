"""烘焙器探针：不用人眼，量出一个配方在「引擎里」会是什么样（4.0 边改边验证用）

用法：
  python3 analysis/scripts/烘焙器探针.py JM4 type:kiku type:kamuro HK9-1 ...   [--out 目录] [--fps 30] [--dist 800,1000,1200]
         [--screen 1080] [--bake] [--shots 0.35,1.2,2.6]

目标写法：
  <条目 id>      迭代 / 正式库条目（烘焙器 REPLICA_BY_ID 里的 id，例如 JM4、HK9-1）
  type:<花型>    花型库模板默认参数（例如 type:kiku）

输出（--out，默认 analysis/probe/<时间>/）：
  探针.json      每个目标的全部数值
  探针.md        一张总表（给人看）
  <目标>_<t>_live.png / _export.png   --shots 时，同一画布、同一时刻的实时模拟 / 导出效果截图

量什么（默认只做取景 + 取帧计划，不烘焙，几秒一个；--bake 时真的烘一次，再量格子、空帧）：
  格子      列 × 行 × 通道、总帧数、单格像素
  帧预算    引擎按 --fps 逐 tick 取整后，实际显示的帧数 / 总帧数、最大一次跳几帧、燃烧段（前 85%）最低有效帧率
  放大      花径占屏幕高 --frac（默认 1/3，用户实测四尺玉在 800–1200 m 时）→ 面片在屏幕上多少像素、单格贴图被放大几倍（>1 = 贴图像素比屏幕像素少）；
            --dist 用同一实测占比换算距离；另附 60° 视角估算作未验证参考
  尺寸下限  3.7 按 σ 最小 0.55 渲染像素计算；4.0 在实际每米像素下渲染两档尺寸，检查线性能量是否响应
  标准      按 协作/标准.md 第 2 节给出 ✅ / ❌（放大、显示帧、尺寸有效）

浏览器：Windows / 有显卡的机器用系统 GPU（默认）；Linux 云端自动用软件渲染（慢，--bake 一次 3–5 分钟）。
"""
import argparse, asyncio, json, math, os, pathlib, platform, sys, time
from browser_runtime import chromium_options, verify_renderer

ROOT = pathlib.Path(__file__).resolve().parents[2]
HTML = ROOT / 'tool' / 'FireworkBaker.html'

JS_METRICS = r"""
(a) => {
  const { id, fps, dists, screenH, frac } = a;
  let P, M, name = id;
  if (id.startsWith('type:')) { const t = id.slice(5); if (!TYPES[t]) return { id, error: '没有这个花型：' + t }; const d = defaultsFor(t); P = derive({ ...d.P }); M = d.M; }
  else { if (!REPLICA_BY_ID[id]) return { id, error: '没有这个条目：' + id }; const r = __fw.replicaPM(id); P = r.P; M = r.M; name = REPLICA_BY_ID[id].name; }
  const out = { id, name, type: P.type, form: P.form, duration: P.duration, zoom: P.zoom, frameMode: P.frameMode, autoGrid: P.autoGrid,
                renderVer:P.renderVer||37, qSS: P.qSS || 2, qKernel: P.qKernel || 0, headSize: P.headSize, sparkSize: P.sparkSize, emberSize: P.emberSize, texW: P.texW, texH: P.texH };
  if (P.form !== 'master' && P.form !== 'segments') { out.note = '只量大面片（master / segments）；这个产物是 ' + P.form; return out; }
  const fm = __fw.measure(P), pl = __fw.plan(P, fm), L = pl.L, D = pl.duration;
  out.grid = { cols: L.cols, rows: L.rows, chans: L.chans, frames: L.F, cellW: L.cellW, cellH: L.cellH };
  out.spriteM = +pl.Ww.toFixed(1);
  // 帧号曲线逐 tick 取整（和材质一样：floor，不混合）
  const fAt = t => Math.min(L.F - 1, Math.floor(evalKeys(pl.keys, Math.min(1, t / D))));
  const n = Math.floor(D * fps); let seen = new Set(), maxJump = 0, prev = null;
  for (let i = 0; i <= n && i/fps<D; i++) { const f = fAt(i / fps); seen.add(f); if (prev !== null) maxJump = Math.max(maxJump, f - prev); prev = f; }
  out.frames30 = { shown: seen.size, total: L.F, ratio: +(seen.size / L.F).toFixed(3), maxJump };
  // 燃烧段（前 85%）每 0.5 s 窗口内换了几帧 → 最低有效帧率
  let minFps = 1e9; for (let t0 = 0; t0 + 0.5 <= D * 0.85; t0 += 0.25) { const s = new Set(); for (let t = t0; t < t0 + 0.5; t += 1 / fps) s.add(fAt(t)); minFps = Math.min(minFps, s.size / 0.5); }
  out.minFpsActive = +(minFps === 1e9 ? 0 : minFps).toFixed(1);
  out.avgFps = +(L.F / D).toFixed(1);
  // 屏幕上的大小（主判据，用户 2026-10-01 实测：最佳观察距离 800–1200 m，四尺玉约占屏幕高的 1/3）
  //   花径 = 燃烧期最大半径 × 2；面片比花径大（留边、拖尾、下垂）：面片屏幕像素 = 花径屏幕像素 × 面片 / 花径
  const sMax = pl.zoom ? Math.max(...pl.sizeKeys.map(k => k[1])) : 1;
  let R = 1; for (const q of fm.prof) R = Math.max(R, q[2]); out.flowerM = +(2 * R).toFixed(1);
  const diameter=typeof gameDiameter==='function'?gameDiameter({P,fm},2*R):2*R, fraction=P.screenFrac||frac;
  out.flowerM=+diameter.toFixed(1);
  const flowerPx = fraction * screenH, spritePx = flowerPx * pl.Ww * sMax / diameter;
  out.screen = { frac:fraction, flowerPx: Math.round(flowerPx), spritePx: Math.round(spritePx), mag: +(spritePx / L.cellW).toFixed(2), magMobile256: +(spritePx / 256).toFixed(2),
                 mag512: +(spritePx / 512).toFixed(2), mag1024: +(spritePx / 1024).toFixed(2),
                 suggestPC: spritePx <= 512 ? 512 : spritePx <= 1024 ? 1024 : 2048 };   // 建议的 PC 单格（能做到不放大的最小格子）；只是建议，效果可以选更大
  // 参考：按真实米数 + 竖直视角 60°（烘焙器「游戏内大小」的假设，未经 UE 验证，和用户实测不一致时以上面为准）
  out.perspectiveReference = dists.map(dist => { const ppmS = screenH / (2 * dist * Math.tan(Math.PI / 6)), onScreen = pl.Ww * sMax * ppmS; return { dist, spritePx: Math.round(onScreen), mag: +(onScreen / L.cellW).toFixed(2) }; });
  out.game = dists.map(dist=>({dist,spritePx:Math.round(spritePx*1000/dist),mag:+(spritePx*1000/dist/L.cellW).toFixed(2)}));
  // 尺寸下限：σ = max(size·0.5·ppm, 0.55)（渲染像素，渲染缓冲是单格的 qSS 倍）
  const ss = Math.max(1, Math.round(P.qSS || 2)), ppmEnd = L.cellW * ss / (pl.Ww * sMax), ppmStart = pl.zoom ? L.cellW * ss / (pl.Ww * Math.min(...pl.sizeKeys.map(k => k[1]))) : ppmEnd;
  out.deadSize = { atFull: +(1.1 / ppmEnd).toFixed(2), atStart: +(1.1 / ppmStart).toFixed(2) };
  out.sizeDead = { head: P.headSize <= out.deadSize.atFull, spark: P.sparkSize <= out.deadSize.atFull };
  if(P.renderVer>=40){
    // 实测而非仅按版本赋通过：同一物理光点在导出采样分辨率下放大 10%。
    const savedQuality=particleQuality, savedPPMY=PPMY;
    const energy=size=>{
      const N=Math.min(2048,Math.max(64,Math.ceil(size*ppmEnd*(1+8*(P.haloR||3)))));
      gl.activeTexture(gl.TEXTURE0);const target=new Target(N,N,gl.RGBA16F);
      try{
        setParticleProfile(P);PPMY=0;target.clear();target.bind();additive(true);
        drawPoints(new Float32Array([0,0,1,size]),1,[0,0,N/(2*ppmEnd),N/(2*ppmEnd)],ppmEnd,[1,0,0,0],1);
        additive(false);const a=new Float32Array(N*N*4);gl.readPixels(0,0,N,N,gl.RGBA,gl.FLOAT,a);
        let total=0;for(let i=0;i<a.length;i+=4)total+=a[i];return total;
      }finally{target.dispose();additive(false);}
    };
    try{
      out.sizeResponse={};
      for(const [name,size] of [['head',P.headSize],['spark',P.sparkSize]]){
        const a=energy(size),b=energy(size*1.1);out.sizeResponse[name]={size,energy:a,enlarged:b,ratio:a?b/a:0};
        out.sizeDead[name]=!(a>0 && b/a>1.1);
      }
      out.deadSize={atFull:0,atStart:0,note:'无固定像素钳位；尺寸响应由实际 GPU 线性能量测得，8 位编码仍可能有量化损失'};
    }finally{particleQuality=savedQuality;PPMY=savedPPMY;}
  }
  return out;
}
"""

JS_BAKE = r"""
async (id) => {
  let P, M; if (id.startsWith('type:')) { const d = defaultsFor(id.slice(5)); P = derive({ ...d.P }); M = d.M; } else { const r = __fw.replicaPM(id); P = r.P; M = r.M; }
  const b = await __fw.bake(P, 1, null); const L = b.meta.L;
  const r = { grid: { cols: L.cols, rows: L.rows, chans: L.chans, frames: L.F, cellW: L.cellW, cellH: L.cellH }, t0: b.meta.t0 || 0, darkTail: b.meta.darkTail, edgeFrames: b.meta.check?.edgeFrames };
  disposeBake(b); return r;
}
"""


def verdict(m, std):
    if 'grid' not in m: return {}
    g = m['grid']; v = {}
    v['单格 ≥ PC 下限'] = g['cellW'] >= std['pcCell']
    v['屏幕放大 ≤ 1'] = m['screen']['mag'] <= std['maxMag']
    v['30fps 显示帧 ≥ 90%'] = m['frames30']['ratio'] >= 0.9
    v['燃烧段有效帧率 ≥ 下限'] = m['minFpsActive'] >= std['minFps']
    v['尺寸参数有效'] = not (m['sizeDead']['head'] or m['sizeDead']['spark'])
    return v


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('targets', nargs='+')
    ap.add_argument('--out', default=None)
    ap.add_argument('--html', type=pathlib.Path, default=HTML, help='用于基线检查的烘焙器 HTML')
    ap.add_argument('--fps', type=float, default=30)
    ap.add_argument('--dist', default='800,1000,1200')
    ap.add_argument('--screen', type=int, default=1080)
    ap.add_argument('--frac', type=float, default=1/3, help='花径占屏幕高的比例（用户实测：四尺玉约 1/3）')
    ap.add_argument('--bake', action='store_true')
    ap.add_argument('--shots', default='')
    ap.add_argument('--pc-cell', type=int, default=512)
    ap.add_argument('--min-fps', type=float, default=12)
    ap.add_argument('--max-mag', type=float, default=1.0)
    a = ap.parse_args()
    out = pathlib.Path(a.out) if a.out else ROOT / 'analysis' / 'probe' / time.strftime('%Y%m%d_%H%M%S')
    out.mkdir(parents=True, exist_ok=True)
    std = {'pcCell': a.pc_cell, 'minFps': a.min_fps, 'maxMag': a.max_mag}
    from playwright.async_api import async_playwright
    res = []
    async with async_playwright() as p:
        b = await p.chromium.launch(**chromium_options())
        pg = await b.new_page(viewport={'width': 1500, 'height': 950})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(a.html.resolve().as_uri(), wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof REPLICA_BY_ID !== "undefined"', timeout=0)
        await pg.wait_for_function('state.bake && !state.baking && !state.dirty', timeout=240000)
        renderer = verify_renderer(await pg.evaluate("document.querySelector('#gpu').title"))
        print('Renderer:', renderer, flush=True)
        for t in a.targets:
            m = await pg.evaluate(JS_METRICS, {'id': t, 'fps': a.fps, 'dists': [float(x) for x in a.dist.split(',')], 'screenH': a.screen, 'frac': a.frac})
            m['renderer'] = renderer
            if a.bake and 'error' not in m:
                t0 = time.time(); m['bake'] = await pg.evaluate(JS_BAKE, t); m['bake']['seconds'] = round(time.time() - t0)
                if m['bake']['grid'] != m.get('grid'): m['bake']['⚠'] = '实际烘焙的格子和计划不同（自动选格子 / 分段 / 串格子）'
            m['标准'] = verdict(m, std)
            if a.shots and 'error' not in m:
                m['shots'] = await shots(pg, t, [float(x) for x in a.shots.split(',')], out)
            m['pageErrors'] = errs[:]; errs.clear()
            res.append(m); print(json.dumps(m, ensure_ascii=False), flush=True)
        await b.close()
    (out / '探针.json').write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding='utf-8')
    lines = ['| 目标 | 格子 | 单格 | 帧 | 30fps 显示 | 最大跳帧 | 燃烧段最低帧率 | 花径 / 面片 m | 面片屏幕 px（花径 = 屏高 × ' + f'{a.frac:.2f}' + '） | 放大 PC / 手机 256 | 尺寸下限 m | 标准 |', '|' + '---|' * 12]
    for m in res:
        if 'grid' not in m: lines.append(f"| {m['id']} | {m.get('error') or m.get('note')} |" + ' |' * 9); continue
        g = m['grid']; bad = [k for k, ok in m['标准'].items() if not ok]
        lines.append(f"| {m['id']} {m['name']} | {g['cols']}×{g['rows']}×{g['chans']} | {g['cellW']:.0f} | {g['frames']} | {m['frames30']['shown']} ({m['frames30']['ratio']:.0%}) | {m['frames30']['maxJump']} | {m['minFpsActive']} | {m['flowerM']} / {m['spriteM']} | {m['screen']['spritePx']} | {m['screen']['mag']} / {m['screen']['magMobile256']} | {m['deadSize']['atFull']} | {'✅' if not bad else '❌ ' + '、'.join(bad)} |")
    (out / '探针.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print('\n'.join(lines)); print('→', out)


async def shots(pg, id, times, out):
    """同一画布、同一时刻：实时模拟 vs 导出效果（适应窗口）"""
    await pg.evaluate("id => { const e = (window.FW_REVIEW_LIST || []).find(x => x.id === id); if (e) openReview(e); else if (id.startsWith('type:')) openType(id.slice(5)); else setReplica(id); state.playing = false; try { refToggle(false) } catch (e) {} }", id)
    # 切换后 onParam 已同步置 dirty，等待真正完成而不是固定睡眠。
    await pg.wait_for_function('state.bake && !state.baking && !state.dirty', timeout=240000)
    cv = pg.locator('#gl'); files = []
    for t in times:
        for v in ('live', 'export'):
            await pg.evaluate("async ([t, v]) => { state.playing = false; state.t = t; state.view = v; state.disp = 'fit'; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }", [t, v])
            f = out / f"{id.replace(':', '_')}_{t}_{v}.png"; await pg.screenshot(path=str(f), clip=await cv.bounding_box()); files.append(f.name)
    return files


if __name__ == '__main__':
    asyncio.run(main())
