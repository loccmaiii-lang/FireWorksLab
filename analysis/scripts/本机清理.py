#!/usr/bin/env python3
"""本机清理（只列不删；加 --apply 才删）：过程证据到期、临时文件、没删的副本。

用户 2026-10-22 定（协作/方案_协作提效与目录梳理_2026-10-22.md 第 4 节）：过程证据（原始截图、读回原始 json、日志）
放 analysis/local/，不进 Git，默认留 14 天；交付证据（看法.md + 关键图）在 analysis/results/ 进 Git，这里不管。

查的东西：
  1. analysis/local/ 下一级目录：日期先从目录名取（YYYYMMDD / YYYY-MM-DD），取不到用目录里最新文件的修改时间；
     超过 --days（默认 14）天 = 「到期」。被 .md 报告提到的标「有报告引用」，到期一样可删（原图只在本机，报告里的小图和结论在 Git）。
  2. 永不自动删（「保留」/「问负责人」）：输出/（交付素材与 UE 资产备份）、monitor_state/（本机显卡后台在用）、归档_*、恢复点、
     含 .git 的（git worktree，用 git worktree remove）、名字含「保留」或里面有 保留.txt 的、_tmp 以外以 _ 开头的、
     被跟踪脚本写死路径（analysis/local/<目录>）的。
  3. analysis/local/_tmp/ 里超过 1 天的文件；analysis/local/__pycache__ 直接可删。
  4. 根目录 outputs/（没跟踪，别的 AI 的本机备份）、系统 TEMP 下 fwl* / fwlab-* 目录（超过 7 天）、git worktree 副本：只列，不删。

用法：
  python -X utf8 analysis/scripts/本机清理.py              # 只列
  python -X utf8 analysis/scripts/本机清理.py --days 7     # 换期限
  python -X utf8 analysis/scripts/本机清理.py --apply      # 删「到期」、_tmp 超期文件、__pycache__（删前打印清单，删后核对）
同步体检.py 调 scan_local(sizes=False) 只数到期目录，不算全部大小（要快）。
"""
import argparse
import datetime
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LOCAL = os.path.join(ROOT, 'analysis', 'local')
DAYS = 14
KEEP = {'输出': '交付素材包与 UE 资产修改前备份（P4 提交 / 用户验收前别删）',
        'monitor_state': '本机显卡后台（GPU Queue）在用的状态和日志',
        '恢复点': '旧恢复点备份'}
DATE_RE = re.compile(r'(?<!\d)(20\d\d)-?(0[1-9]|1[0-2])-?([0-3]\d)(?!\d)')


def _walk(path):
    """scandir 递归：Windows 上 DirEntry.stat() 不额外系统调用，比 os.walk + getsize 快。返回 (总字节, 最新修改时间, 文件数)。"""
    total, newest, n = 0, 0.0, 0
    stack = [path]
    while stack:
        p = stack.pop()
        try:
            with os.scandir(p) as it:
                for e in it:
                    try:
                        if e.is_dir(follow_symlinks=False):
                            stack.append(e.path)
                        else:
                            st = e.stat(follow_symlinks=False)
                            total += st.st_size
                            newest = max(newest, st.st_mtime)
                            n += 1
                    except OSError:
                        pass
        except OSError:
            pass
    return total, newest, n


def _name_date(name):
    m = DATE_RE.search(name)
    if not m:
        return None
    try:
        return datetime.datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    except ValueError:
        return None


def _keep_reason(name, path):
    if name in KEEP:
        return KEEP[name], '保留'
    if name.startswith('归档'):
        return '归档 / 备份', '保留'
    if os.path.exists(os.path.join(path, '.git')):
        return 'git worktree 副本：用 git worktree remove 删，别直接删目录', '问负责人'
    if '保留' in name or os.path.exists(os.path.join(path, '保留.txt')):
        return '标了保留', '保留'
    if name.startswith('_') and name not in ('_tmp', '__pycache__'):
        return '以 _ 开头（备份 / 草稿），问负责人', '问负责人'
    return None, None


def _referenced(names):
    """一次 git grep 找哪些目录名在 .md 里出现过（报告里写“原图在本机 analysis/local/<目录>”）。"""
    if not names:
        return set()
    args = ['git', '-C', ROOT, 'grep', '-o', '-h', '-F']
    for n in names:
        args += ['-e', 'local/' + n]                   # 只认路径写法（analysis/local/<目录>），不认同名的功能词
    r = subprocess.run(args + ['--', '*.md'], capture_output=True, text=True, encoding='utf-8', errors='replace')
    return {line.strip()[len('local/'):] for line in r.stdout.splitlines() if line.strip().startswith('local/')}


def _script_used(names):
    """被跟踪脚本写死路径（analysis/local/<目录>）的目录 → {目录: 第一个脚本}。这类到期也不删（10-22 目录整理：
    POINT17_IMPL 被 point_profile_regression.py 当基准读，按到期删了脚本就坏）。"""
    if not names:
        return {}
    args = ['git', '-C', ROOT, 'grep', '-o', '-F']
    for n in names:
        args += ['-e', 'local/' + n]
    r = subprocess.run(args + ['--', '*.py', '*.mjs', '*.cjs', '*.js', '*.ps1', '*.cmd', '*.bat', '*.sh', ':!归档'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    out = {}
    for line in r.stdout.splitlines():
        f, _, m = line.rpartition(':')
        n = m.strip()[len('local/'):]
        if n in names: out.setdefault(n, f)
    return out


def scan_local(days=DAYS, sizes=True, refs=True, now=None):
    """analysis/local 一级目录分类。sizes=False 时只给到期目录算大小（同步体检用，要快）。"""
    now = now or datetime.datetime.now()
    cut = now - datetime.timedelta(days=days)
    rows = []
    if not os.path.isdir(LOCAL):
        return rows
    for e in sorted(os.scandir(LOCAL), key=lambda x: x.name):
        if not e.is_dir(follow_symlinks=False):
            continue
        name, path = e.name, e.path
        reason, cat = _keep_reason(name, path)
        if name == '_tmp':
            continue                                   # _tmp 按文件单独算（scan_tmp）
        d = _name_date(name)
        src = '目录名'
        size = newest = files = None
        if cat is None and name != '__pycache__' and d is None:
            size, newest, files = _walk(path)
            d = datetime.datetime.fromtimestamp(newest) if newest else None
            src = '最新文件'
        if name == '__pycache__':
            cat, reason = '可删', 'Python 缓存'
        elif cat is None:
            if d is None:
                cat, reason = '问负责人', '空目录或读不到日期'
            elif d < cut:
                cat, reason = '到期', f'超过 {days} 天（按{src}日期）'
            else:
                cat, reason = '未到期', f'{(d + datetime.timedelta(days=days)).strftime("%m-%d")} 到期（按{src}日期）'
        if size is None and (sizes or cat in ('到期', '可删')):
            size, newest, files = _walk(path)
        rows.append(dict(cat=cat, path=os.path.relpath(path, ROOT).replace('\\', '/'), name=name,
                         date=d.strftime('%Y-%m-%d') if d else '', size=size, files=files, reason=reason, ref=False))
    used = _script_used([r['name'] for r in rows if r['cat'] in ('到期', '未到期')])
    for r in rows:
        if r['name'] in used:
            r['cat'], r['reason'] = '问负责人', f'被脚本写死路径（{used[r["name"]]}），到期也不删；脚本不用了再删'
    if refs:
        hit = _referenced([r['name'] for r in rows if r['cat'] in ('到期', '未到期') and len(r['name']) >= 6])
        for r in rows:
            r['ref'] = r['name'] in hit
    return rows


def scan_tmp(now=None):
    now = now or datetime.datetime.now()
    out = []
    p = os.path.join(LOCAL, '_tmp')
    if not os.path.isdir(p):
        return out
    for e in os.scandir(p):
        try:
            st = e.stat(follow_symlinks=False)
        except OSError:
            continue
        if now.timestamp() - st.st_mtime > 86400:
            size = st.st_size if not e.is_dir() else _walk(e.path)[0]
            out.append(dict(cat='可删', path=os.path.relpath(e.path, ROOT).replace('\\', '/'), name=e.name, isdir=e.is_dir(),
                            date=datetime.datetime.fromtimestamp(st.st_mtime).strftime('%Y-%m-%d'), size=size, reason='_tmp 里超过 1 天'))
    return out


def scan_outputs():
    p = os.path.join(ROOT, 'outputs')
    if not os.path.isdir(p):
        return []
    size, newest, files = _walk(p)
    subs = '、'.join(sorted(x.name for x in os.scandir(p) if x.is_dir()))[:200]
    return [dict(cat='问负责人', path='outputs/', date=datetime.datetime.fromtimestamp(newest).strftime('%Y-%m-%d') if newest else '',
                 size=size, reason=f'根目录未跟踪（别的 AI 的本机备份）：{subs}')]


def scan_temp(days=7, now=None):
    now = now or datetime.datetime.now()
    t = tempfile.gettempdir()
    out = []
    try:
        entries = list(os.scandir(t))
    except OSError:
        return out
    for e in entries:
        if not (e.name.startswith('fwl') or e.name.startswith('fwlab-')) or not e.is_dir(follow_symlinks=False):
            continue
        size, newest, files = _walk(e.path)
        if newest and now.timestamp() - newest > days * 86400:
            out.append(dict(cat='临时', path=e.path.replace('\\', '/'), date=datetime.datetime.fromtimestamp(newest).strftime('%Y-%m-%d'),
                            size=size, reason=f'系统 TEMP 超过 {days} 天' + ('（可能是本机显卡后台依赖，先问）' if 'gpu' in e.name else '')))
    return out


def worktrees():
    """git worktree list：除主树外的副本（路径、分支、最后提交时间）。"""
    r = subprocess.run(['git', '-C', ROOT, 'worktree', 'list', '--porcelain'], capture_output=True, text=True, encoding='utf-8', errors='replace')
    items, cur = [], {}
    for line in r.stdout.splitlines() + ['']:
        if not line.strip():
            if cur:
                items.append(cur)
            cur = {}
            continue
        k, _, v = line.partition(' ')
        cur[k] = v or True
    out = []
    for i, w in enumerate(items):
        if i == 0:
            continue                                   # 第一项永远是主工作树
        path = w.get('worktree', '')
        ts = subprocess.run(['git', '-C', ROOT, 'log', '-1', '--format=%ct', w.get('HEAD', 'HEAD')], capture_output=True, text=True).stdout.strip()
        when = datetime.datetime.fromtimestamp(int(ts)) if ts.isdigit() else None
        out.append(dict(cat='副本', path=path, branch=str(w.get('branch', '(detached)')).replace('refs/heads/', ''), head=str(w.get('HEAD', ''))[:8],
                        date=when.strftime('%Y-%m-%d %H:%M') if when else '', when=when, missing=not os.path.isdir(path), prunable='prunable' in w))
    return out


def human(n):
    if n is None:
        return '—'
    for unit, k in (('GB', 1e9), ('MB', 1e6), ('KB', 1e3)):
        if n >= k:
            return f'{n / k:.1f} {unit}'
    return f'{n} B'


def _rm(path):
    def onerror(func, p, _):
        os.chmod(p, stat.S_IWRITE)
        func(p)
    if os.path.isdir(path):
        shutil.rmtree(path, onerror=onerror)
    elif os.path.exists(path):
        os.chmod(path, stat.S_IWRITE)
        os.remove(path)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--days', type=int, default=DAYS, help='过程证据保留天数（默认 14）')
    ap.add_argument('--apply', action='store_true', help='真的删：到期目录、_tmp 超期文件、__pycache__')
    a = ap.parse_args()
    local = scan_local(a.days)
    tmp = scan_tmp()
    other = scan_outputs() + scan_temp()
    wts = worktrees()
    print(f'# 本机清理（{"删除" if a.apply else "只列"}）· {datetime.datetime.now():%Y-%m-%d %H:%M} · 过程证据留 {a.days} 天\n')
    print('| 类别 | 路径 | 日期 | 大小 | 建议 |\n|---|---|---|---|---|')
    order = {'到期': 0, '可删': 1, '问负责人': 2, '保留': 3, '未到期': 4}
    for r in sorted(local + tmp, key=lambda r: (order.get(r['cat'], 9), r['path'])):
        note = r['reason'] + ('；有报告引用（原图只在本机）' if r.get('ref') else '')
        print(f"| {r['cat']} | {r['path']} | {r['date']} | {human(r['size'])} | {note} |")
    for r in other:
        print(f"| {r['cat']} | {r['path']} | {r['date']} | {human(r['size'])} | {r['reason']}；只列不删 |")
    if not any(r['cat'] == '临时' for r in other):
        print(f'| 临时 | 系统 TEMP 下 fwl* / fwlab-* | — | — | 没有超过 7 天的目录 |')
    for w in wts:
        flag = '目录已不在（git worktree prune）' if w['missing'] else '做完后 git worktree remove'
        print(f"| 副本 | {w['path']} | 最后提交 {w['date']} | — | 分支 {w['branch']} @ {w['head']}；{flag}；只列不删 |")
    groups = {}
    for r in local + tmp + other:
        g = groups.setdefault(r['cat'], [0, 0])
        g[0] += 1
        g[1] += r['size'] or 0
    print('\n汇总：' + '；'.join(f'{k} {v[0]} 项 {human(v[1])}' for k, v in sorted(groups.items(), key=lambda kv: order.get(kv[0], 9))) + f'；副本 {len(wts)} 个')
    targets = [r for r in local if r['cat'] in ('到期', '可删')] + tmp
    print(f'--apply 会删：{len(targets)} 项，约 {human(sum(r["size"] or 0 for r in targets))}')
    if not a.apply:
        return 0
    print('\n删除清单：')
    for r in targets:
        print('  - ' + r['path'])
    failed = []
    for r in targets:
        p = os.path.join(ROOT, r['path'])
        try:
            _rm(p)
        except OSError as e:
            failed.append(f"{r['path']}：{e}")
        if os.path.exists(p):
            failed.append(r['path'] + '：删后还在')
    print('删除完成' if not failed else '有没删掉的：\n  ' + '\n  '.join(failed))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
