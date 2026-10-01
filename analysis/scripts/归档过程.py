"""把被取代的版本的过程文件搬进归档（用户 2026-10-01 同意：每个效果只留当前版和已通过版，旧版本搬进归档，不删文件）

用法：python3 analysis/scripts/归档过程.py [--dry]
- 「被取代」以烘焙器数据为准：tool/data/review.js 里 superseded 的条目（review_to_baker.py 按 replaces / 状态清单 算出来的）。
- 搬：analysis/results/<任务>/、analysis/results/<任务>E*/（它的导出）、analysis/jobs/<任务>.json、<任务>E*.json
  → 归档/过程/<效果>/results/…、归档/过程/<效果>/jobs/…（用 git mv，历史不丢）
- 不搬：状态清单里任何效果的 主条目 / 工作版 / 待验收版 / 已通过版 / 方案 / 导出任务 引用到的；还在算的任务；正式库的任务（TR2 等）。
- review_to_baker.py 两处都找，烘焙器「历史」里照常能打开这些版本。
"""
import argparse, json, os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from review_to_baker import job_effect   # 任务号 → 效果（前缀表 + 任务里的 effect 字段）

RES = os.path.join(ROOT, 'analysis', 'results'); JOBS = os.path.join(ROOT, 'analysis', 'jobs'); ARCH = os.path.join(ROOT, '归档', '过程')
KEEP_ALWAYS = {'TR1', 'TR2', 'TR3S', 'TR3M', 'TR3L'}     # 正式库 V5 的来源


def load_review():
    s = open(os.path.join(ROOT, 'tool', 'data', 'review.js'), encoding='utf-8').read()
    def var(name):
        m = re.search(r'var ' + name + r' = (.*?);\n(?:var |$)', s, re.S); return json.loads(m.group(1))
    return var('FW_REVIEW'), var('FW_EFFECTS')


def main(dry):
    ents, effs = load_review()
    st = json.load(open(os.path.join(ROOT, '协作', '状态清单.json'), encoding='utf-8'))
    keep = set(KEEP_ALWAYS)
    for e in st['effects']:
        for k in ('主条目', '工作版', '待验收版', '已通过版'):
            if e.get(k): keep.add(e[k].replace('rep:', ''))
        for v in e.get('方案') or []: keep.add(v['id'].replace('rep:', ''))
    by = {e['id']: e for e in ents}
    base = lambda d: re.sub(r'E\d*$', '', d)
    for e in st['effects']:     # 导出任务：只留当前版 / 已通过版的导出
        for j in e.get('导出任务') or []:
            if base(j) in keep: keep.add(j)
    for i in list(keep):      # 组合引用的层、层所在的任务
        e = by.get(i)
        if e and e.get('layerIds'): keep |= set(e['layerIds'])
        if e and e.get('task'): keep.add(e['task'])
    old = {(e.get('task') or e['id']) for e in ents if e.get('superseded')} - keep
    moves = []
    for d in sorted(os.listdir(RES)):
        if not os.path.isdir(os.path.join(RES, d)) or d in keep or base(d) in keep: continue
        if d in old or base(d) in old:
            jf = os.path.join(JOBS, d + '.json'); j = json.load(open(jf, encoding='utf-8')) if os.path.exists(jf) else {'id': d}
            k = job_effect(j) or job_effect({'id': base(d)}) or '其他'
            if os.path.exists(os.path.join(RES, d, '_claim.json')) and not os.path.exists(os.path.join(RES, d, 'done.json')): continue   # 还在算
            moves.append((os.path.join(RES, d), os.path.join(ARCH, k, 'results', d)))
            if os.path.exists(jf): moves.append((jf, os.path.join(ARCH, k, 'jobs', d + '.json')))
    for f in sorted(os.listdir(JOBS)):      # 没有结果目录的旧任务文件
        d = f[:-5]
        if f.endswith('.json') and (d in old or base(d) in old) and d not in keep and base(d) not in keep and not any(m[0].endswith(os.sep + f) for m in moves):
            j = json.load(open(os.path.join(JOBS, f), encoding='utf-8')); k = job_effect(j) or '其他'
            moves.append((os.path.join(JOBS, f), os.path.join(ARCH, k, 'jobs', f)))
    print(f'保留（当前 / 已通过 / 正式库来源）{len(keep)} 个号；搬进归档 {len(moves)} 项')
    for a, b in moves:
        print(('  ' if dry else '  → ') + os.path.relpath(a, ROOT) + '  →  ' + os.path.relpath(b, ROOT))
        if not dry:
            os.makedirs(os.path.dirname(b), exist_ok=True)
            subprocess.run(['git', 'mv', a, b], cwd=ROOT, check=True)
    if not dry:
        os.makedirs(ARCH, exist_ok=True)
        open(os.path.join(ARCH, 'README.md'), 'w', encoding='utf-8').write(
            '# 归档 · 过程文件\n\n被取代的版本的结果目录和任务文件（2026-10-01 用户同意搬进归档，不删）。按效果分目录：`<效果>/results/<任务号>/`、`<效果>/jobs/<任务号>.json`。\n\n'
            '烘焙器「历史」里照常能打开这些版本（`review_to_baker.py` 两处都找）。本机任务运行器只读 `analysis/jobs/`，归档里的任务不会再跑。\n\n'
            '重新整理：`python3 analysis/scripts/归档过程.py`（`--dry` 先看会搬什么）。\n')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--dry', action='store_true'); a = ap.parse_args(); main(a.dry)
