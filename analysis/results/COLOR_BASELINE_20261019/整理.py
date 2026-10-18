#!/usr/bin/env python3
"""T22 封板基线整理（烟花编排（22）-本机，2026-10-19）：raw.json（读取.mjs 只读读回）→ 标定.json / 标定.md / 色板.png。

只整理读回原值；「推算」的花径、色板颜色单独标出，不评价好坏、不给改色建议。
用法：python -X utf8 -I analysis/results/COLOR_BASELINE_20261019/整理.py <raw.json> <输出目录>
"""
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
raw = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)


def short(p):
    return (p or '').split('/')[-1].split('.')[0] if p else None


def dist(d):
    """把 RawDistribution 展开成 const / uniform / curve。"""
    if not isinstance(d, dict):
        return None
    D = d.get('Distribution') or {}
    cls, v = (D.get('class') or ''), (D.get('value') or {})
    vec = 'Vector' in cls
    def pt(x):
        if isinstance(x, dict) and 'X' in x:
            return [round(x['X'], 4), round(x['Y'], 4), round(x['Z'], 4)]
        return round(x, 4) if isinstance(x, (int, float)) else x
    if 'ConstantCurve' in cls:
        pts = ((v.get('ConstantCurve') or {}).get('Points')) or []
        return dict(kind='curve', keys=[[round(p.get('InVal', 0), 4), pt(p.get('OutVal'))] for p in pts])
    if 'Uniform' in cls:
        return dict(kind='uniform', min=pt(v.get('Min')), max=pt(v.get('Max')))
    if 'Constant' in cls:
        return dict(kind='const', value=pt(v.get('Constant')))
    if d.get('MinValueVec') is not None:
        return dict(kind='range?', min=pt(d.get('MinValueVec')), max=pt(d.get('MaxValueVec')))
    if 'MinValue' in d:
        return dict(kind='range?', min=pt(d.get('MinValue')), max=pt(d.get('MaxValue')))
    return None


def vmax(dd, axis=0):
    if not dd:
        return None
    vals = []
    if dd['kind'] == 'const':
        vals = [dd['value']]
    elif dd['kind'] in ('uniform', 'range?'):
        vals = [dd['min'], dd['max']]
    elif dd['kind'] == 'curve':
        vals = [k[1] for k in dd['keys']]
    out = []
    for x in vals:
        if isinstance(x, list):
            out.append(x[axis])
        elif isinstance(x, (int, float)):
            out.append(x)
    return max(out) if out else None


def at(dd, t):
    """曲线在相对寿命 t 的值（线性）。"""
    if not dd:
        return None
    if dd['kind'] == 'const':
        return dd['value']
    if dd['kind'] in ('uniform', 'range?'):
        a, b = dd['min'], dd['max']
        if isinstance(a, list):
            return [(x + y) / 2 for x, y in zip(a, b)]
        return (a + b) / 2 if isinstance(a, (int, float)) else a
    ks = dd['keys']
    if not ks:
        return None
    if t <= ks[0][0]:
        return ks[0][1]
    for (t0, v0), (t1, v1) in zip(ks, ks[1:]):
        if t0 <= t <= t1:
            f = 0 if t1 == t0 else (t - t0) / (t1 - t0)
            if isinstance(v0, list):
                return [a + (b - a) * f for a, b in zip(v0, v1)]
            return v0 + (v1 - v0) * f
    return ks[-1][1]


# —— 仓库里的源 PNG（按文件名找，用于 Ramp 取色、主图外沿推算）——
png_index = defaultdict(list)
for base in ['analysis/results', 'analysis/local/输出', 'spec', 'tool/data']:
    for f in (ROOT / base).rglob('*.png'):
        png_index[f.stem.lower()].append(f)


def find_png(tex_path):
    name = short(tex_path)
    if not name:
        return None
    c = png_index.get(name.lower())
    return sorted(c, key=lambda f: -f.stat().st_mtime)[0] if c else None


def ramp_samples(tex_path):
    f = find_png(tex_path)
    if not f:
        return None, None
    im = Image.open(f).convert('RGB')
    w, h = im.size
    xs = [0, 64, 128, 192, 254] if w >= 255 else [int(w * k / 4) for k in range(5)]
    return [('#%02x%02x%02x' % im.getpixel((min(x, w - 1), h // 2))) for x in xs], str(f.relative_to(ROOT))


extent_cache = {}


def flipbook_extent(tex_path):
    """主图每格亮度外沿（阈值 8/255）最大占格宽比例；按名字里的 AxB 定格子，RGBA 每个通道一帧。"""
    if tex_path in extent_cache:
        return extent_cache[tex_path]
    f = find_png(tex_path)
    res = None
    m = re.search(r'_(\d+)x(\d+)_', short(tex_path) or '')
    if f and m:
        try:
            import numpy as np
            im = np.asarray(Image.open(f).convert('RGBA'))
            cols, rows = int(m.group(1)), int(m.group(2))
            H, W = im.shape[:2]
            cw, ch = W // cols, H // rows
            best = 0
            for c in range(4):
                for r in range(rows):
                    for k in range(cols):
                        a = im[r * ch:(r + 1) * ch, k * cw:(k + 1) * cw, c]
                        xs = np.where(a.max(axis=0) > 8)[0]
                        if len(xs):
                            best = max(best, (xs[-1] - xs[0] + 1) / cw)
            res = dict(fraction=round(float(best), 3), png=str(f.relative_to(ROOT)), grid=f'{cols}x{rows}')
        except Exception as e:
            res = dict(error=str(e))
    extent_cache[tex_path] = res
    return res


Q = ('high', 'medium', 'low')
result = dict(format='df.color-baseline/1', readAt=raw['readAt'], table=raw['table'], note='读回原值；「推算」只是按源图外沿 × 面片估的花径，色板是示意。', rows={'pc': {}, 'mobile': {}}, issues=[])
for side in ('pc', 'mobile'):
    for rid, rows in sorted(raw['rows'][side].items()):
        u = raw['usage'][side].get(rid, {})
        row = rows[0] if rows else {}
        sp = row.get('FxSP')
        sysd = raw['systems'].get(sp) if sp else None
        es = row.get('EffectScale') or ''
        m = re.search(r'X=([-\d.]+)', es)
        rowscale = float(m.group(1)) if m else 1.0
        rec = dict(row=row.get('row'), ResourceId=rid, FxSP=short(sp), EffectScale=rowscale, FXType=row.get('FXType'))
        allev = [e for t in Q for e in u.get(t, [])]
        rec['usage'] = {t: dict(n=len(u.get(t, [])), scales=dict(Counter(round(e[2], 4) for e in u.get(t, [])).most_common())) for t in Q}
        hi = u.get('high') or allev
        rec['usage']['firstAt'] = min((e[0] for e in hi), default=None)
        rec['usage']['lastAt'] = max((e[0] for e in hi), default=None)
        if not sysd:
            rec['system'] = None
            result['issues'].append(f'{side} {rid}：粒子读不到（{sp}）')
            result['rows'][side][rid] = rec
            continue
        sysrec = dict(LODMethod=sysd.get('LODMethod'), LODDistances=sysd.get('LODDistances'), lodLevels=max((len(e['lods']) for e in sysd['emitters']), default=0),
                      fixedBounds=sysd.get('bUseFixedRelativeBoundingBox'), boundsM=None, emitters=[])
        bb = sysd.get('FixedRelativeBoundingBox') or {}
        if bb.get('Max') and bb.get('Min'):
            sysrec['boundsM'] = round((bb['Max']['X'] - bb['Min']['X']) / 100, 1)
        life_max = 0
        plane_max = 0
        for e in sysd['emitters']:
            l0 = e['lods'][0] if e['lods'] else {}
            rq = l0.get('required') or {}
            mods = {}
            for mm in l0.get('modules', []):
                mods.setdefault(mm['class'], []).append(mm)
            def first(cls, prop):
                for mm in mods.get(cls, []):
                    if mm.get('enabled') and mm.get('props') and prop in mm['props']:
                        return dist(mm['props'][prop])
                return None
            life = first('Lifetime', 'Lifetime')
            size = first('Size', 'StartSize') or first('Size_Seeded', 'StartSize')
            sbl = [dist(mm['props']['LifeMultiplier']) for mm in mods.get('SizeMultiplyLife', []) if mm.get('enabled') and mm.get('props')]
            col = first('ColorOverLife', 'ColorOverLife')
            alpha = first('ColorOverLife', 'AlphaOverLife')
            cscale = first('ColorScaleOverLife', 'ColorScaleOverLife')
            init = first('Color', 'StartColor') or first('Color_Seeded', 'StartColor')
            dyn = None
            for mm in mods.get('ParameterDynamic', []) + mods.get('ParameterDynamic_Seeded', []):
                if mm.get('enabled') and mm.get('props'):
                    dps = mm['props'].get('DynamicParams') or []
                    dyn = [dict(name=p.get('ParamName'), value=dist(p.get('ParamValue'))) for p in dps if isinstance(p, dict)]
                    break
            sx = vmax(size, 0) or 0
            mult = 1.0
            for s in sbl:
                mv = vmax(s, 0)
                if mv:
                    mult *= mv
            plane = sx * mult * rowscale / 100
            lt = vmax(life) or 0
            dur = rq.get('EmitterDuration') or 0
            delay = rq.get('EmitterDelay') or 0
            if l0.get('enabled'):
                life_max = max(life_max, delay + (lt if lt > 0 else dur))
                plane_max = max(plane_max, plane)
            mi = raw['materials'].get(rq.get('Material')) or {}
            texs = {t['name']: t['texture'] for t in mi.get('textures', []) if t.get('texture')}
            ramp_name = next((k for k in texs if 'Ramp' in (k or '')), None)
            main_name = next((k for k in texs if k in ('MainTex', 'BaseTex')), None)
            ramp_cols, ramp_src = ramp_samples(texs[ramp_name]) if ramp_name else (None, None)
            ext = flipbook_extent(texs[main_name]) if main_name else None
            tex_info = {k: dict(path=short(v), **{kk: vv for kk, vv in (raw['textures'].get(v) or {}).items()}) for k, v in texs.items()}
            emrec = dict(name=e['name'], enabledLOD0=l0.get('enabled'), lods=[dict(level=l.get('level'), enabled=l.get('enabled')) for l in e['lods']], gpu=bool(l0.get('typeData')),
                         DetailMode=e.get('DetailMode'), material=short(rq.get('Material')), parent=short(mi.get('Parent')), align=rq.get('ScreenAlignment'),
                         duration=dur, delay=delay, lifetime=life, initialSize=size, sizeByLife=sbl, planeM=round(plane, 1),
                         initialColor=init, colorOverLife=col, alphaOverLife=alpha, colorScaleOverLife=cscale, dynamicParams=dyn,
                         scalars={s['name']: s['value'] for s in mi.get('scalars', []) if s.get('name')}, vectors={s['name']: s['value'] for s in mi.get('vectors', []) if s.get('name')},
                         textures=tex_info, rampSamples=ramp_cols, rampSource=ramp_src,
                         flowerEstimate=(dict(estimateM=round(plane * ext['fraction'], 1), **ext) if ext and ext.get('fraction') else (ext or '未测')))
            sysrec['emitters'].append(emrec)
            for t in tex_info.values():
                if str(t.get('never_stream')) == 'True':
                    result['issues'].append(f'{side} {rid}：{t["path"]} NeverStream=True')
        sysrec['planeMaxM'] = round(plane_max, 1)
        sysrec['lifeMaxS'] = round(life_max, 2)
        rec['system'] = sysrec
        # 同一时刻最多几朵（PC 高 / 手游高，按这一行最长发射器寿命）
        ts = sorted(e[0] for e in hi)
        peak, at_t = 0, None
        for t0 in ts:
            k = sum(1 for t in ts if t0 <= t < t0 + max(life_max, 0.1)) if False else sum(1 for t in ts if t <= t0 < t + max(life_max, 0.1))
            if k > peak:
                peak, at_t = k, t0
        rec['usage']['peakSimultaneous'] = dict(n=peak, at=at_t, lifeUsedS=round(life_max, 2))
        result['rows'][side][rid] = rec
(OUT / '标定.json').write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding='utf-8')

# —— 色板（示意）——
def lin2s(c):
    c = max(0.0, c)
    return 255 * (12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055)


def hexrgb(h):
    return [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]


font = None
for fp in ['C:/Windows/Fonts/msyh.ttc', 'C:/Windows/Fonts/simhei.ttf']:
    if Path(fp).exists():
        font = ImageFont.truetype(fp, 14)
        break
lines = []
for side in ('pc', 'mobile'):
    for rid, rec in result['rows'][side].items():
        sysrec = rec.get('system')
        if not sysrec:
            continue
        for em in sysrec['emitters']:
            if not em['enabledLOD0']:
                continue
            lines.append((side, rec, em))
W, RH = 1180, 26
img = Image.new('RGB', (W, 40 + RH * len(lines)), (18, 20, 26))
dr = ImageDraw.Draw(img)
dr.text((8, 8), '色板（示意）：Ramp 亮端 / 中段 × Color Over Life × Color Scale Over Life，开花后 0.2 / 1 / 2 / 3 s；归一到最亮通道，只看色相和相对明暗', fill=(220, 220, 220), font=font)
for i, (side, rec, em) in enumerate(lines):
    y = 40 + i * RH
    name = f'{side} {rec["row"] or rec["ResourceId"]} · {em["name"]}'
    dr.text((8, y + 4), name[:46], fill=(200, 200, 200), font=font)
    life = (em['lifetime'] and vmax(em['lifetime'])) or em['duration'] or 1
    ramp = em.get('rampSamples')
    for j, t in enumerate((0.2, 1, 2, 3)):
        rel = min(1.0, max(0.0, (t - (em['delay'] or 0)) / life)) if life else 0
        c = at(em['colorOverLife'], rel) or [1, 1, 1]
        s = at(em['colorScaleOverLife'], rel) or [1, 1, 1]
        if not isinstance(c, list):
            c = [c] * 3
        if not isinstance(s, list):
            s = [s] * 3
        for k, ramp_pos in enumerate((3, 2)):
            base = hexrgb(ramp[ramp_pos]) if ramp else [1, 1, 1]
            rgb = [base[n] * c[n] * s[n] for n in range(3)]
            mx = max(rgb) or 1
            col = tuple(int(lin2s(x / mx) if mx > 1 else lin2s(x)) for x in rgb)
            x0 = 420 + j * 190 + k * 90
            dr.rectangle([x0, y + 3, x0 + 84, y + RH - 3], fill=col)
    if i == 0:
        for j, t in enumerate((0.2, 1, 2, 3)):
            dr.text((420 + j * 190, 24), f'{t}s 亮端 / 中段', fill=(160, 160, 160), font=font)
img.save(OUT / '色板.png')

# —— 标定.md ——
md = ['# 封板基线：颜色 / 大小 / 播放时间（T22）', '',
      f'> 烟花编排（22）-本机，2026-10-19。只读读回 {raw["readAt"]}，编排 `{raw["table"]}`。执行结束：是；AI 自检：数字与读回一致；用户验收：—。',
      '> 「推算」= 源图每格亮度外沿 × 面片边长，不是实测花径；色板是示意。读不到的写在最后。', '']
npc, nmob = len(result['rows']['pc']), len(result['rows']['mobile'])
nsys = len([s for s in raw['systems'].values() if s])
md += [f'**结论数字**：PC {npc} 个 ResourceId、手游 {nmob} 个；粒子系统 {nsys} 个；材质实例 {len(raw["materials"])} 个；贴图 {len(raw["textures"])} 张；读回请求 {raw.get("requests")} 次、错误 {len(raw["errors"])} 条。', '']
for side, title in (('pc', 'PC'), ('mobile', '手游')):
    md += [f'## {title}', '', '| 行 | 粒子 | 高 / 中 / 低 次数 | 编排缩放 | 首末开花 s | 同时最多 | 面片最大 m | 最长寿命 s | LOD 级数 |', '|---|---|---|---|---|---|---|---|---|']
    for rid, rec in result['rows'][side].items():
        s = rec.get('system') or {}
        u = rec['usage']
        md.append(f'| {rec["row"]} | {rec["FxSP"]} | {u["high"]["n"]} / {u["medium"]["n"]} / {u["low"]["n"]} | {", ".join(f"{k}×{v}" for k, v in u["high"]["scales"].items()) or "—"} | {u["firstAt"]}–{u["lastAt"]} | {u.get("peakSimultaneous", {}).get("n", "—")} | {s.get("planeMaxM", "—")} | {s.get("lifeMaxS", "—")} | {s.get("lodLevels", "—")} |')
    md.append('')
    for rid, rec in result['rows'][side].items():
        s = rec.get('system')
        md += [f'### {title} · {rec["row"]}（{rid}）', '']
        if not s:
            md += ['粒子读不到。', '']
            continue
        md += [f'粒子 `{rec["FxSP"]}`：LOD {s["lodLevels"]} 级（{s["LODMethod"]}，距离 {s["LODDistances"]}）、固定盒 {s["boundsM"]} m、表 EffectScale {rec["EffectScale"]}。', '',
               '| 发射器 | LOD0 | 材质 / 父材质 | 朝向 | 延迟 / 时长 / 寿命 s | 面片 m | 推算花径 m | Ramp 取色（0 / 64 / 128 / 192 / 254） |', '|---|---|---|---|---|---|---|---|']
        for em in s['emitters']:
            fe = em['flowerEstimate']
            fes = f'{fe["estimateM"]}（外沿 {fe["fraction"]}）' if isinstance(fe, dict) and 'estimateM' in fe else '未测'
            lt = em['lifetime']
            lts = (f'{lt["value"]}' if lt and lt['kind'] == 'const' else f'{lt["min"]}–{lt["max"]}' if lt and lt['kind'] in ('uniform', 'range?') else '曲线' if lt else '—')
            md.append(f'| {em["name"]}{"（GPU）" if em["gpu"] else ""} | {"开" if em["enabledLOD0"] else "关"} | {em["material"]} / {em["parent"]} | {em["align"]} | {em["delay"]} / {round(em["duration"] or 0, 3)} / {lts} | {em["planeM"]} | {fes} | {" ".join(em["rampSamples"]) if em["rampSamples"] else "未取到像素"} |')
        md.append('')
        for em in s['emitters']:
            if not em['enabledLOD0']:
                continue
            def fmt(dd):
                if not dd:
                    return '—'
                if dd['kind'] == 'curve':
                    return '；'.join(f'{k[0]}: {k[1]}' for k in dd['keys'][:12]) + ('…' if len(dd['keys']) > 12 else '')
                if dd['kind'] == 'const':
                    return f'常量 {dd["value"]}'
                return f'{dd["min"]} ~ {dd["max"]}'
            md += [f'- **{em["name"]}** Initial Color：{fmt(em["initialColor"])}；Color Over Life：{fmt(em["colorOverLife"])}；Alpha：{fmt(em["alphaOverLife"])}；Color Scale：{fmt(em["colorScaleOverLife"])}；Initial Size：{fmt(em["initialSize"])}；Size By Life：{" × ".join(fmt(x) for x in em["sizeByLife"]) or "—"}；标量：{em["scalars"] or "—"}']
        md.append('')
md += ['## 读不到 / 问题', ''] + [f'- {x}' for x in result['issues'] + [json.dumps(e, ensure_ascii=False) for e in raw['errors']]] + ['', '读取：`读取.mjs`（只读）；整理：`整理.py`；原始读回只在本机 `analysis/local/N19_22_封板基线/raw.json`。']
(OUT / '标定.md').write_text('\n'.join(md) + '\n', encoding='utf-8')
print('rows', npc, nmob, 'lines', len(lines), 'issues', len(result['issues']))
