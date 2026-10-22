#!/usr/bin/env python3
"""交接.md 第 5 节滚动（用户 2026-10-22 同意「交接只留最近 7 天，旧的按月归档」）。

把第 5 节里日期早于截止日的条目原样挪到 归档/交接_日志_<YYYY-MM>.md（按条目所在月份），交接.md 里只留最近的。
条目 = 以「### 」开头的小节，或以「- **YYYY-MM-DD」/「- YYYY-MM-DD」开头的一条（到下一个条目开头为止）；
取不到日期的条目、第 5 节以外的内容都不动。挪之前核对：留下的 + 挪走的 拼回去和原文逐行一致（不丢一行），否则不写。

用法：
  python -X utf8 analysis/scripts/交接滚动.py              # 只列：会挪哪些
  python -X utf8 analysis/scripts/交接滚动.py --apply      # 真挪
  --days 7（默认）  --today YYYY-MM-DD（默认今天）
"""
import argparse
import datetime as dt
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / '交接.md'
START = re.compile(r'^(### |- (\*\*)?20\d\d-\d\d-\d\d)')
DATE = re.compile(r'(20\d\d)-(\d\d)-(\d\d)')


def split(lines):
    """返回 (第 5 节之前, 第 5 节标题到第一条之前, 条目列表[(日期 or None, 行)], 第 5 节之后)。"""
    i5 = next(i for i, s in enumerate(lines) if s.startswith('## 5.'))
    end = next((i for i in range(i5 + 1, len(lines)) if lines[i].startswith('## ')), len(lines))
    body = lines[i5 + 1:end]
    first = next((i for i, s in enumerate(body) if START.match(s)), len(body))
    head, items, cur = lines[:i5 + 1] + body[:first], [], None
    for s in body[first:]:
        if START.match(s):
            cur = [s]
            items.append(cur)
        else:
            cur.append(s)
    dated = []
    for it in items:
        m = DATE.search(it[0])
        dated.append((dt.date(int(m.group(1)), int(m.group(2)), int(m.group(3))) if m else None, it))
    return head, dated, lines[end:]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--days', type=int, default=7)
    ap.add_argument('--today')
    a = ap.parse_args()
    today = dt.date.fromisoformat(a.today) if a.today else dt.date.today()
    cut = today - dt.timedelta(days=a.days)
    text = SRC.read_text(encoding='utf-8')
    lines = text.split('\n')
    head, items, tail = split(lines)
    keep, move = [], []
    for d, it in items:
        (move if d and d < cut else keep).append((d, it))
    # 无损核对：按原顺序拼回
    if head + [s for _, it in items for s in it] + tail != lines:
        raise SystemExit('切分后拼不回原文，停止')
    print(f'截止 {cut}（今天 {today} 往前 {a.days} 天）：第 5 节共 {len(items)} 条，留 {len(keep)}，挪 {len(move)}')
    by_month = {}
    for d, it in move:
        by_month.setdefault(f'{d:%Y-%m}', []).append(it)
    for m, its in sorted(by_month.items()):
        print(f'  → 归档/交接_日志_{m}.md：{len(its)} 条，{sum(len(x) for x in its)} 行')
    if not a.apply or not move:
        return
    for m, its in sorted(by_month.items()):
        dst = ROOT / '归档' / f'交接_日志_{m}.md'
        old = dst.read_text(encoding='utf-8') if dst.exists() else f'# 交接日志 · {m}（从 交接.md 第 5 节滚动过来，新的在上；规则见 analysis/scripts/交接滚动.py）\n\n'
        hdr, _, rest = old.partition('\n\n')
        block = '\n'.join(s for it in its for s in it).rstrip('\n') + '\n'
        dst.write_text(hdr + '\n\n' + block + ('\n' + rest if rest.strip() else ''), encoding='utf-8', newline='\n')
    new = head + [s for _, it in keep for s in it]
    if new and new[-1].strip():
        new.append('')
    new += [f'（{cut} 以前的日志已按月挪到 `归档/交接_日志_<年-月>.md`，用 `analysis/scripts/交接滚动.py`。）', ''] if tail else [f'（{cut} 以前的日志已按月挪到 `归档/交接_日志_<年-月>.md`，用 `analysis/scripts/交接滚动.py`。）']
    SRC.write_text('\n'.join(new + tail), encoding='utf-8', newline='\n')
    # 复核：挪走的每一行都能在归档里找到
    arch = ''.join((ROOT / '归档' / f'交接_日志_{m}.md').read_text(encoding='utf-8') for m in by_month)
    lost = [s for _, it in move for s in it if s.strip() and s not in arch]
    if lost:
        raise SystemExit(f'归档里缺 {len(lost)} 行，请检查（交接.md 已改写，原文在 git 里）')
    print('已滚动；挪走的行在归档里逐行核对过')


if __name__ == '__main__':
    main()
