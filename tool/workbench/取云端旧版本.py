"""从 Git 历史取回「云端最新编排」的旧版本（目录整理，用户 2026-10-22 批「云端最新/ 不再存每版 dfshow」）。

每次 publish-show 都把整份节目写进 tool/workbench/public/data/cloud-latest.json 并随版本提交，所以这个文件的 Git 历史
就是逐字节的版本存档（programmeSha256 核对）。FXtools/节目/云端最新/ 不再给主编排另存一份；--also 对比版照旧存在那里。

用法（仓库根目录）：
  python -X utf8 tool/workbench/取云端旧版本.py --list                 # 列出历史里所有版本
  python -X utf8 tool/workbench/取云端旧版本.py 16.0.48                # 写到 FXtools/节目/云端最新/16.0.48-<编排名>.dfshow
  python -X utf8 tool/workbench/取云端旧版本.py 16.0.48 --out 某处.dfshow
  python -X utf8 tool/workbench/取云端旧版本.py --check FXtools/节目/云端最新   # 目录里哪些 dfshow 能从历史逐字节取回
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

REPO = Path(__file__).resolve().parents[2]
CLOUD = 'tool/workbench/public/data/cloud-latest.json'
ARCHIVE = REPO / 'FXtools' / '节目' / '云端最新'
KEY = ',"project":'


def git(*args, binary=False):
    r = subprocess.run(['git', '-c', 'core.quotepath=off', *args], cwd=REPO, capture_output=True, check=True)
    return r.stdout if binary else r.stdout.decode('utf-8')


def project_text(cloud_text):
    """cloud-latest 是 JSON.stringify(latest)，project 是最后一个键：截出它的原文，不重新序列化（数字写法会变）。"""
    i = cloud_text.find(KEY)
    end = cloud_text.rstrip().rfind('}')
    if i < 0 or end <= i:
        raise ValueError('cloud-latest 里找不到 project')
    return cloud_text[i + len(KEY):end]


def history():
    """[(提交, 版本, 编排名, programmeSha256, 发布时间)]，新的在前；同一版本只留最早提交的那份。"""
    out, seen = [], set()
    for commit in reversed(git('log', '--format=%H', '--', CLOUD).split()):
        try:
            text = git('show', f'{commit}:{CLOUD}', binary=True).decode('utf-8')
        except subprocess.CalledProcessError:
            continue                                   # 这个提交里文件被删了
        head = json.loads(text[:text.find(KEY)] + '}') if KEY in text else json.loads(text)
        if head.get('version') in seen:
            continue
        seen.add(head.get('version'))
        out.append((commit, head.get('version'), head.get('name', ''), head.get('programmeSha256'), head.get('publishedAt', '')))
    return out[::-1]


def fetch(commit, sha):
    text = project_text(git('show', f'{commit}:{CLOUD}', binary=True).decode('utf-8'))
    if hashlib.sha256(text.encode('utf-8')).hexdigest() != sha:
        raise ValueError(f'{commit[:8]} 取出的节目和 programmeSha256 对不上')
    return text


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('version', nargs='?')
    ap.add_argument('--out', type=Path)
    ap.add_argument('--list', action='store_true')
    ap.add_argument('--check', type=Path, help='核对目录里的 dfshow 能不能从历史逐字节取回（输出 JSON）')
    a = ap.parse_args(argv)
    rows = history()
    if a.list:
        for commit, version, name, _, at in rows:
            print(f'{version:10s} {at[:16]:16s} {commit[:8]}  {name}')
        return 0
    if a.check:
        by_sha = {sha: (commit, version) for commit, version, _, sha, _ in rows}
        res = []
        for f in sorted(a.check.glob('*.dfshow')):
            sha = hashlib.sha256(f.read_bytes()).hexdigest()
            hit = by_sha.get(sha)
            res.append({'file': f.name, 'sha256': sha, 'bytes': f.stat().st_size,
                        'commit': hit[0] if hit else None, 'version': hit[1] if hit else None})
        print(json.dumps(res, ensure_ascii=False, indent=1))
        return 0
    if not a.version:
        ap.error('要给版本号，或用 --list / --check')
    hit = [r for r in rows if r[1] == a.version]
    if not hit:
        print(f'历史里没有版本 {a.version}（--list 看有哪些）', file=sys.stderr)
        return 1
    commit, version, name, sha, _ = hit[0]
    out = a.out or ARCHIVE / f'{version}-{name}.dfshow'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(fetch(commit, sha).encode('utf-8'))
    print(f'已取回 {version} · {name}（提交 {commit[:8]}）→ {out}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
