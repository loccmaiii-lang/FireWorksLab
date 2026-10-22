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
  7. 推送前的合入门禁钩子（.githooks/pre-push，导出排查 G2）有没有在这个工作副本启用
  8. 本机卫生（2026-10-22 烟花编排（22）-本机，用户批协作提效方案；只提醒、不影响结论）：analysis/local 过程证据到期（14 天）、
     没删的 git worktree 副本（最后提交超过 24 小时）、.git 松散对象超过 2 GiB、根目录出现白名单外的新文件 / 目录
"""
import os, re, subprocess, sys, json, datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LOG = os.path.join(ROOT, 'analysis', 'local', 'monitor_state', 'launcher.log')
bad, warn = [], []


def git(*a, check=False):
    r = subprocess.run(['git', '-C', ROOT, *a], capture_output=True, text=True, encoding='utf-8', errors='replace')
    if check and r.returncode: raise RuntimeError(r.stderr.strip())
    return r.stdout.strip()


# 根目录白名单（2026-10-22 现状；design-qa.md、research/ 已挪进 docs/）：跟踪的 + 已知本机未跟踪的。新加根目录项先想清楚放哪（见 仓库梳理.md），确需放根目录再加到这里。
ROOT_OK = {'.claude', '.git', '.gitattributes', '.githooks', '.github', '.gitignore', 'AGENTS.md', 'CLAUDE.md', 'FXtools', 'README.md',
           'analysis', 'docs', 'experiments', 'samples', 'spec', 'tool', 'vidio', '交接.md', '仓库梳理.md',
           '协作', '对话记录', '归档', '更新记录.md',
           'TClaude.bat', 'local_notes_ue_interface.md', '点灭星_Cascade参数.txt', 'outputs', 'MyTepelate', '.workbuddy', 'node_modules',
           '.vscode', '.idea', 'Thumbs.db', 'desktop.ini'}
LONG_LIVED = ('gpu-monitor',)      # 长期在用的副本（本机显卡后台，交接.md 第 4 节），不提醒


def housekeeping():
    """第 8 项：只往 warn 里加提醒；任何一步出错只记一条，不影响结论。"""
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import importlib
        clean = importlib.import_module('本机清理')
        rows = clean.scan_local(sizes=False, refs=False)
        due = [r for r in rows if r['cat'] in ('到期', '可删')]
        if due:
            mb = sum(r['size'] or 0 for r in due) / 1e6
            warn.append(f'analysis/local 有 {len(due)} 个过程证据到期（超过 14 天，约 {mb:.0f} MB）：python -X utf8 analysis/scripts/本机清理.py 看清单，确认后加 --apply')
        stale = [w for w in clean.worktrees() if not any(k in w['path'] for k in LONG_LIVED)
                 and os.path.normcase(os.path.abspath(w['path'])) != os.path.normcase(ROOT)
                 and (w['missing'] or not w['when'] or (datetime.datetime.now() - w['when']).total_seconds() > 86400)]
        if stale:
            warn.append(f'有 {len(stale)} 个 git worktree 副本最后提交超过 24 小时（做完要 git worktree remove）：' + '；'.join(f"{w['path']}（{w['branch']}，{w['date']}）" for w in stale[:4]))
    except Exception as e:
        warn.append('本机卫生检查出错（不影响结论）：' + str(e)[:100])
    try:
        kv = dict(l.split(': ', 1) for l in git('count-objects', '-v').splitlines() if ': ' in l)
        loose = int(kv.get('size', 0)) * 1024 + int(kv.get('size-garbage', 0)) * 1024
        if loose > 2 * 1024 ** 3:
            warn.append(f'.git 松散对象 + 残留 {loose / 1024 ** 3:.1f} GiB（> 2 GiB）：没有其他 git 在跑时执行一次 git gc（不丢提交）')
    except Exception as e:
        warn.append('读 git count-objects 出错：' + str(e)[:80])
    try:
        extra = sorted(n for n in os.listdir(ROOT) if n not in ROOT_OK)
        if extra:
            warn.append('根目录有白名单外的新文件 / 目录：' + '、'.join(extra[:8]) + '（按 仓库梳理.md 放进对应目录；确需放根目录再加进 同步体检.py 的 ROOT_OK）')
    except OSError as e:
        warn.append('读根目录出错：' + str(e)[:80])


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

    dirty = [l for l in subprocess.run(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace').stdout.splitlines() if l.strip()]   # 不 strip：porcelain 第一行开头的空格是状态位（10-22 修：以前显示成「nalysis」）
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

    if os.path.isfile(os.path.join(ROOT, '.githooks', 'pre-push')):     # 2026-10-15 导出（23）G2：钩子目录在仓库里，但每个工作副本要自己启用一次
        hp = git('config', '--get', 'core.hooksPath').replace('\\', '/').rstrip('/')
        if hp not in ('.githooks', os.path.join(ROOT, '.githooks').replace('\\', '/')):
            warn.append('推送前的合入门禁钩子没启用（' + (f'core.hooksPath = {hp}' if hp else '没设 core.hooksPath') + '）：在这个工作副本跑一次 git config core.hooksPath .githooks')

    housekeeping()
    for w in warn: print('⚠ ' + w)
    for b in bad: print('❌ ' + b)
    print('结论：' + ('先处理 ❌ 再干活' if bad else '可以干活（⚠ 只是提醒）'))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
