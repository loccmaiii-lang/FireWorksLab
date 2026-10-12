"""同步体检（只读）：开工 / 推送前跑一次，看本工作副本能不能安全干活。

用法：python analysis/scripts/同步体检.py [--no-fetch]
退出码：0 = 可以干活；1 = 有必须先处理的问题（看 ❌ 行）。不改任何文件、不拉取合并，只 fetch。

查的东西（2026-10-13 手游编排，用户「杜绝本地落后多个提交导致版本错乱」）：
  1. 本地落后 / 领先 origin/main 多少提交；正在 rebase / merge 没收尾
  2. 已跟踪文件有没有本地改动（有就会让本机 10 分钟自动同步一直跳过）
  3. 已跟踪文件里有没有冲突标记（10-12 aeaa86ac 事故）
  4. 本机自动同步（GPU Queue 计划任务）最近一次成功是什么时候、连续跳过了多少次
  5. 生成文件 tool/FireworkBaker.html 是否落后于 更新记录.md（成品里嵌了待办，改了没重建会弄脏别人的工作树）
  6. 排队等合并的远端分支（状态清单里写着要合、但还没进 main 的）
"""
import os, re, subprocess, sys, json, datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LOG = os.path.join(ROOT, 'analysis', 'local', 'monitor_state', 'launcher.log')
bad, warn = [], []


def git(*a, check=False):
    r = subprocess.run(['git', '-C', ROOT, *a], capture_output=True, text=True, encoding='utf-8', errors='replace')
    if check and r.returncode: raise RuntimeError(r.stderr.strip())
    return r.stdout.strip()


def main():
    if '--no-fetch' not in sys.argv:
        r = subprocess.run(['git', '-C', ROOT, 'fetch', '--quiet', 'origin'], capture_output=True, text=True)
        if r.returncode: warn.append('fetch 失败（离线？）：结果按上次 fetch 的远端算 · ' + r.stderr.strip()[:120])
    branch = git('branch', '--show-current')
    ahead, behind = (int(x) for x in git('rev-list', '--left-right', '--count', 'HEAD...origin/main').split())
    gd = git('rev-parse', '--git-dir'); gd = gd if os.path.isabs(gd) else os.path.join(ROOT, gd)
    print(f'工作副本 {ROOT} · 分支 {branch or "(detached)"} · HEAD {git("rev-parse", "--short", "HEAD")} · origin/main {git("rev-parse", "--short", "origin/main")}')
    if branch != 'main': warn.append(f'不在 main（{branch or "detached"}）：本机自动同步只管 main')
    if any(os.path.exists(os.path.join(gd, d)) for d in ('rebase-merge', 'rebase-apply', 'MERGE_HEAD')):
        bad.append('有没收尾的 rebase / merge：先 git status 处理完，不要在这种状态下提交、推送')
    if behind: (bad if behind >= 5 else warn).append(f'落后 origin/main {behind} 个提交' + ('（≥5，先同步再干活）' if behind >= 5 else ''))
    if ahead: warn.append(f'领先 origin/main {ahead} 个提交（没推）：' + git('log', '--format=%h %s', 'origin/main..HEAD')[:300])

    dirty = [l for l in git('status', '--porcelain', '--untracked-files=no').splitlines() if l.strip()]
    if dirty: warn.append(f'已跟踪文件有本地改动 {len(dirty)} 个（本机自动同步会因此跳过）：' + '；'.join(l[3:][:70] for l in dirty[:5]))
    skipped = [l for l in git('ls-files', '-v').splitlines() if l[:1] in ('S', 's')]
    if skipped: print(f'ℹ skip-worktree 文件 {len(skipped)} 个（本机刻意不跟踪的改动）：' + '；'.join(l[2:][:60] for l in skipped[:3]))

    marks = git('grep', '-n', '-I', '-E', '^(<<<<<<< |>>>>>>> [0-9a-f]{7,}|>>>>>>> origin/)', 'HEAD', '--', '.', ':!*.md', ':!归档/**')
    if marks: bad.append('提交里有冲突标记：' + marks.splitlines()[0][:160])

    if os.path.exists(LOG):
        lines = open(LOG, encoding='utf-8', errors='replace').read().splitlines()
        ok = [l for l in lines if 'User checkout sync (' in l and 'exit 0' in l]
        tail = [l for l in lines if 'User checkout sync' in l][-12:]
        n_skip = 0
        for l in reversed([l for l in lines if 'User checkout sync' in l]):
            if 'skipped' in l or 'exit 0' not in l: n_skip += 1
            else: break
        last = ok[-1][:19] if ok else '从未'
        msg = f'本机自动同步：最近一次成功 {last}；之后连续跳过 / 失败 {n_skip} 次'
        if n_skip >= 6: (bad if behind else warn).append(msg + ('；最后原因：' + tail[-1][36:140] if tail else ''))
        else: print('✅ ' + msg)

    if git('log', '-1', '--format=%ct', '--', '更新记录.md') > git('log', '-1', '--format=%ct', '--', 'tool/FireworkBaker.html'):
        warn.append('更新记录.md 比 tool/FireworkBaker.html 新：谁跑 tool/build.py 都会改出成品差异、弄脏工作树。改更新记录的人应一起重建成品提交')

    try:
        st = json.load(open(os.path.join(ROOT, '协作', '状态清单.json'), encoding='utf-8'))
        text = json.dumps(st.get('共享文件', {}), ensure_ascii=False)
        for b in git('branch', '-r', '--no-merged', 'origin/main').split():
            name = b.replace('origin/', '')
            if name in text:
                n = git('rev-list', '--count', f'origin/main..{b}')
                warn.append(f'状态清单里排队要合并的分支 {name} 还没进 main（{n} 个提交）')
    except Exception as e:
        warn.append('读状态清单失败：' + str(e)[:80])

    for w in warn: print('⚠ ' + w)
    for b in bad: print('❌ ' + b)
    print('结论：' + ('先处理 ❌ 再干活' if bad else '可以干活（⚠ 只是提醒）'))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
