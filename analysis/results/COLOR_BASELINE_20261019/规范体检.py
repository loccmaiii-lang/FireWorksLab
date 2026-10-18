#!/usr/bin/env python3
"""T20 要点体检（烟花编排（22）-本机，2026-10-19）：用 T22 同一份只读读回（raw.json），查封板编排实际用到的资源是否合规范。

只看规范里写死的几项（CLAUDE.md 第 2 节「烟花贴图规范」、spec/cascade_params_v1.md §1.3）：NeverStream、贴图组、主序列 NoMip、Ramp Clamp + NoMip、
EmissiveDissolve 0.98、固定包围盒 ±100000；共享贴图（/Game/Effects/Common/ 下、非 FireWorks 目录）只列出来，不算违规。
用法：python -X utf8 -I analysis/results/COLOR_BASELINE_20261019/规范体检.py <raw.json> <输出 md>
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

raw = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
short = lambda p: (p or '').split('/')[-1].split('.')[0]
used_by = defaultdict(set)      # 贴图 → 哪些行用
role = {}                       # 贴图 → 参数名
mi_rows = defaultdict(set)
for side in ('pc', 'mobile'):
    for rid, rows in raw['rows'][side].items():
        for r in rows:
            s = raw['systems'].get(r.get('FxSP'))
            if not s:
                continue
            for e in s['emitters']:
                for l in e['lods']:
                    mp = (l.get('required') or {}).get('Material')
                    if not mp:
                        continue
                    mi_rows[mp].add(f'{side}:{r["row"]}')
                    for t in (raw['materials'].get(mp) or {}).get('textures', []):
                        if t.get('texture'):
                            used_by[t['texture']].add(f'{side}:{r["row"]}')
                            role.setdefault(t['texture'], t['name'])
shared = lambda p: not short(p).startswith('T_EFX_FireWorks')   # 名字不是烟花自己的（T_6DLight_*、T_EFX_ColorRamp_*、T_EFX_Glow_* …）按共享贴图处理
out = defaultdict(list)
for tp, info in raw['textures'].items():
    if 'error' in info:
        out['读不到'].append(f'{short(tp)}：{info["error"]}')
        continue
    rows = '、'.join(sorted(used_by.get(tp, [])))[:160]
    tag = '（共享贴图，按规范只列出来问）' if shared(tp) else ''
    if info.get('never_stream') == 'True':
        out['NeverStream=True（规范：永远不勾）'].append(f'{short(tp)}{tag} ← {rows}')
    if 'PROJECT03' not in (info.get('lod_group') or '').upper() and not shared(tp):
        out['贴图组不是 DistantVFX（Project03）'].append(f'{short(tp)}：{info.get("lod_group")} ← {rows}')
    r = role.get(tp)
    if r in ('MainTex', 'BaseTex') and 'NO_MIPMAPS' not in (info.get('mip_gen_settings') or '').upper() and not shared(tp):
        out['主序列不是 NoMip'].append(f'{short(tp)}：{info.get("mip_gen_settings")} ← {rows}')
    if r == 'EmissiveRampTex':
        bad = [k for k in ('address_x', 'address_y') if 'CLAMP' not in (info.get(k) or '').upper()]
        if bad or 'NO_MIPMAPS' not in (info.get('mip_gen_settings') or '').upper():
            out['Ramp 不是 Clamp + NoMip'].append(f'{short(tp)}{tag}：X {info.get("address_x")} / Y {info.get("address_y")} / {info.get("mip_gen_settings")} ← {rows}')
for mp, m in raw['materials'].items():
    sc = {s['name']: s['value'] for s in (m or {}).get('scalars', [])}
    if 'EmissiveDissolve' in sc and abs(float(sc['EmissiveDissolve']) - 0.98) > 1e-3:
        out['EmissiveDissolve 不是 0.98'].append(f'{short(mp)}：{sc["EmissiveDissolve"]} ← {"、".join(sorted(mi_rows[mp]))[:120]}')
    elif 'EmissiveDissolve' not in sc and '/FireWorks' in mp:
        out['EmissiveDissolve 没有单独覆盖（按父材质默认）'].append(f'{short(mp)} ← {"、".join(sorted(mi_rows[mp]))[:120]}')
for sp, s in raw['systems'].items():
    if not s:
        continue
    bb = s.get('FixedRelativeBoundingBox') or {}
    w = (bb.get('Max', {}).get('X', 0) - bb.get('Min', {}).get('X', 0)) / 100 if bb else None
    if not s.get('bUseFixedRelativeBoundingBox'):
        out['没开固定包围盒'].append(short(sp))
    elif w and w >= 1999:
        out['包围盒是 ±100000（2000 m）'].append(short(sp))
md = ['# 规范体检要点（T20 精简版，封板编排实际用到的资源）', '',
      f'> 烟花编排（22）-本机，2026-10-19。和 T22 同一次只读读回（{raw["readAt"]}），只看编排 `{raw["table"]}` 实际用到的行（PC {len(raw["rows"]["pc"])}、手游 {len(raw["rows"]["mobile"])}），不是 ResourceFX 3.0 全部行；磁盘是否已提交 P4 没查。', '',
      '| 项 | 条数 |', '|---|---|'] + [f'| {k} | {len(v)} |' for k, v in out.items()] + ['']
for k, v in out.items():
    md += [f'## {k}', ''] + [f'- {x}' for x in sorted(v)] + ['']
if not out:
    md += ['全部项都合规范。', '']
Path(sys.argv[2]).write_text('\n'.join(md) + '\n', encoding='utf-8')
print({k: len(v) for k, v in out.items()})
