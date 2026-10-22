#!/usr/bin/env python3
"""开工包（只读）：开工 / 接续时先跑这一个，代替「完整读交接和状态清单」。

用户 2026-10-22 批的协作提效方案（协作/方案_协作提效与目录梳理_2026-10-22.md 第 2.3 节）：一页里给出和本对话框有关的全部开工信息。
  python -X utf8 analysis/scripts/开工包.py --对话框 22          # 编号或名字片段（例：烟花编排、导出、22、23）
  python -X utf8 analysis/scripts/开工包.py --对话框 22 --no-fetch
  python -X utf8 analysis/scripts/开工包.py                      # 不带：同步一行 + 待你决定 + 待处理.py 的全体概要
内容：同步体检结论 · 冻结 · 共享文件里还在做 / 排队的认领（★ 和本对话框有关）· 本对话框负责的效果 · 派活队列里交给本对话框没做完的 ·
更新记录「需要你决定 / 操作」· 交接第 5 节最近 3 天提到本对话框的标题 · 本对话框记录里没勾的步骤。任何一块读失败只写「读不到」，不整体失败。
"""
import argparse
import datetime
import glob
import json
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
HERE = os.path.dirname(os.path.abspath(__file__))
DONE = ('完成并释放', '已完成并释放', '已释放', '（归档）', '取消', '不做了')
ACTIVE = ('在做', '排队', '认领', '进行', '待派', '等前置', '等用户', '卡住', '待推送', '本地提交')


def rd(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8-sig') as f:
        return f.read()


def section(title, body):
    return [f'\n## {title}'] + (body or ['（无）'])


def safe(title, fn):
    try:
        return section(title, fn())
    except Exception as e:                       # noqa: BLE001  任何一块失败都只写一行
        return section(title, [f'读不到：{type(e).__name__} {str(e)[:120]}'])


def aliases(who):
    """编号或名字片段 → 匹配用的别名集合。数字 N：（N）、对话框N、(N)；名字片段：本身 + 名册 / 状态清单里「名字（N）」的编号。"""
    if not who:
        return set()
    if who.isdigit():                             # 只认带括号 / 前缀的写法，裸数字会撞日期和版本号（2026-10-22、16.0.22）
        return {f'（{who}）', f'对话框{who}', f'({who})'}
    names = {who}
    text = ''
    for rel in ('协作/全局看板.md', '协作/状态清单.json'):
        try:
            text += rd(rel)
        except OSError:
            pass
    for m in re.finditer(re.escape(who) + r'[^（\s，、；]{0,8}（(\d{1,3})）', text):    # 名字片段 → 名册里的编号
        names |= {f'（{m.group(1)}）', f'对话框{m.group(1)}'}
    return names


def hit(s, names):
    return any(n in (s or '') for n in names)


def sync_line(fetch):
    args = [sys.executable, '-X', 'utf8', os.path.join(HERE, '同步体检.py')] + ([] if fetch else ['--no-fetch'])
    r = subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=ROOT)
    lines = r.stdout.splitlines()
    bad = [l for l in lines if l.startswith('❌')]
    warn = [l for l in lines if l.startswith('⚠')]
    concl = next((l for l in lines if l.startswith('结论')), '结论：读不到（同步体检没输出）')
    out = [f'{concl}（❌ {len(bad)} · ⚠ {len(warn)}；完整看 python -X utf8 analysis/scripts/同步体检.py）']
    out += bad
    out += [w[:160] for w in warn[:6]]
    return out


def freeze_and_shared(names):
    st = json.loads(rd('协作/状态清单.json'))
    out = [f'冻结：{str(st.get("冻结", ""))[:200]}']
    rel, other = [], []
    for k, v in (st.get('共享文件') or {}).items():
        vs = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)
        head = k + ' ' + vs[:120]
        if any(d in k for d in DONE) or (not any(a in head for a in ACTIVE)):
            continue
        if '释放' in vs[:120] and '未释放' not in vs[:120] and not any(a in k for a in ('在做', '排队')):
            continue                                  # 「……已完成并释放……认领」这种是做完的
        (rel if hit(k + vs, names) else other).append(k)
    out += ['★ ' + k[:110] for k in rel]
    out += ['· ' + k[:110] for k in other[:10]]
    if len(other) > 10:
        out.append(f'… 另有 {len(other) - 10} 条别人的在做 / 排队认领（看 协作/状态清单.json「共享文件」）')
    return out


def my_effects(names):
    st = json.loads(rd('协作/状态清单.json'))
    out, passed = [], 0
    for e in st.get('effects', []):
        if not isinstance(e, dict) or not hit(str(e.get('负责', '')), names):
            continue
        if e.get('阶段') == '已通过':
            passed += 1
            continue
        out.append(f"- **{e.get('名', e.get('key'))}**（{e.get('阶段', '')}，主条目 {e.get('主条目', '—')}）下一步：{str(e.get('下一步', ''))[:200]}")
    if passed:
        out.append(f'（另有 {passed} 个已通过的不列）')
    return out


def my_tasks(names):
    q = json.loads(rd('协作/派活队列.json'))
    return [f"- {t.get('编号')}（{t.get('状态')}）{str(t.get('标题', ''))[:120]}" for t in q.get('任务', [])
            if isinstance(t, dict) and hit(str(t.get('交给', '')), names) and t.get('状态') not in ('完成', '取消')]


def decide():
    text = rd('更新记录.md')
    m = re.search(r'^## 需要你决定.*?$(.*?)(?=^## )', text, re.S | re.M)
    if not m:
        return ['读不到：更新记录.md 没有「需要你决定 / 操作」一节']
    return [l for l in m.group(1).strip().splitlines() if l.strip()]


DATE = re.compile(r'(20\d\d)-(\d\d)-(\d\d)')


def handoff(names, days=3):
    text = rd('交接.md')
    i = text.find('\n## 5.')
    body = text[i:] if i >= 0 else text
    cut = datetime.datetime.now() - datetime.timedelta(days=days)
    out = []
    for line in body.splitlines():
        if not (line.startswith('- **20') or line.startswith('### 20')):
            continue
        m = DATE.search(line)
        if not m:
            continue
        try:
            d = datetime.datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            continue
        if d < cut.replace(hour=0, minute=0, second=0, microsecond=0):
            continue
        title = line[4:].split('**', 1)[0] if line.startswith('- **') else line[4:]
        if hit(line, names):
            out.append('- ' + title[:150])
    return out


def unchecked(who, names):
    pats = [f'对话记录/对话框{who}*.md'] if who else []
    files = [f for p in pats for f in glob.glob(os.path.join(ROOT, p))]
    if not files:                                 # 名字片段：对话框<名字>.md
        files = [f for f in glob.glob(os.path.join(ROOT, '对话记录', '*.md')) if who and who in os.path.basename(f)]
    files = sorted(files, key=os.path.getmtime, reverse=True)[:2]
    out = []
    for f in files:
        sec, items = '', []
        with open(f, encoding='utf-8-sig') as fh:
            for line in fh:
                if line.startswith('#'):
                    sec = line.strip('# \n')[:60]
                elif line.lstrip().startswith('- [ ]'):
                    items.append(f'- [{sec}] {line.strip()[6:][:140]}')
        rel = os.path.relpath(f, ROOT).replace('\\', '/')
        out.append(f'`{rel}`：没勾 {len(items)} 条' + ('（只列最后 10 条，越后越新）' if len(items) > 10 else ''))
        out += items[-10:]
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--对话框', dest='who', default='', help='对话框编号（22）或名字片段（烟花编排）')
    ap.add_argument('--no-fetch', action='store_true')
    a = ap.parse_args()
    who = a.who.strip()
    names = aliases(who)
    lines = [f'# 开工包 · {who or "全体"} · {datetime.datetime.now():%Y-%m-%d %H:%M}']
    if names:
        lines.append('匹配：' + '、'.join(sorted(names))[:200])
    lines += safe('同步', lambda: sync_line(not a.no_fetch))
    lines += safe('需要用户决定 / 操作（更新记录.md 顶部）', decide)
    if not who:
        r = subprocess.run([sys.executable, '-X', 'utf8', os.path.join(HERE, '待处理.py')], capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=ROOT)
        lines += section('全体待处理（待处理.py）', (r.stdout or r.stderr).splitlines())
    else:
        lines += safe('冻结与共享文件认领（★ 和你有关）', lambda: freeze_and_shared(names))
        lines += safe('你负责的效果', lambda: my_effects(names))
        lines += safe('派活队列里交给你、没做完的', lambda: my_tasks(names))
        lines += safe('交接第 5 节最近 3 天提到你的', lambda: handoff(names))
        lines += safe('你的对话记录里没勾的步骤', lambda: unchecked(who, names))
    lines.append('\n改参数先读 协作/参数宪章.md · 改界面先读 协作/交互宪章.md · 做完与否看 协作/标准.md · 目录看 仓库梳理.md')
    print('\n'.join(lines))
    return 0


if __name__ == '__main__':
    sys.exit(main())
