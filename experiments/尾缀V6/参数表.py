"""把 cascade.json 写成按 Cascade 发射器 / 模块顺序的参数表（Markdown），单位 cm、cm/s、s；曲线只列关键帧数和首尾值（完整曲线在 json）。"""
import os, sys, json
def fmt(v):
    if isinstance(v, dict):
        if 'const' in v: return f"常量 {v['const']}"
        if 'uniform' in v: return f"随机 {v['uniform'][0]} ～ {v['uniform'][1]}"
        if 'curve' in v: c = v['curve']; return f"曲线 {len(c)} 个关键帧：{c[0]} … {c[-1]}"
    return str(v)
def table(cj, plat):
    L = [f"### {cj['name']} · {'PC' if plat == 'pc' else '手机'}", '']
    for e in cj['emitters']:
        L += [f"**{e['name']}**（材质角色 `{cj['materials'][e['material']]['role']}`，{'GPU Sprites' if e['gpu'] else 'CPU'}）", '',
              '| 模块 | 字段 | 值 |', '| --- | --- | --- |']
        for k, v in e['required'].items(): L.append(f"| Required | {k} | {v} |")
        L.append(f"| Spawn | Rate | {fmt(e['spawn']['rate'])} |")
        if e['spawn'].get('bursts'): L.append(f"| Spawn | Bursts | {e['spawn']['bursts']} |")
        for m in e['modules']:
            for k, v in m.items():
                if k == 'm': continue
                if k == 'params': v = {kk: fmt(vv) for kk, vv in v.items()}
                L.append(f"| {m['m']} | {k} | {fmt(v) if isinstance(v, dict) and set(v) & {'const', 'uniform', 'curve'} else v} |")
        L.append('')
    return '\n'.join(L)
if __name__ == '__main__':
    d = sys.argv[1]; out = []
    for f, plat in (('cascade.json', 'pc'), ('cascade_mobile.json', 'mobile')):
        out.append(table(json.load(open(os.path.join(d, f))), plat))
    open(os.path.join(d, '参数表.md'), 'w').write('\n\n'.join(out)); print(os.path.join(d, '参数表.md'))
