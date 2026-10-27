#!/usr/bin/env python3
"""对外版的案例：用户「我的效果 → 导出全部」的文件里挑「正式」开头的 → tool/team/cases_bundle.json（fwl.mybundle/1）+ tool/data/team_cases.js。

格式和烘焙器「我的效果 → 导出全部」一样（tool/src/js/79_myfx.js myBundle）：每个效果一份 fwl.myrecipe/1。
对外版（tool/build.py --team）加载 data/team_cases.js（window.FW_CASES）；首次打开用页面自带的导入函数（myImportDocs）放进「我的效果」，
左栏最上面一组「案例」（tool/src/js/79_cases.js）。cases_bundle.json 原样放进对外包的「案例」文件夹，换浏览器时也能手动「导入…」。

用法：
  python3 tool/team/build_cases.py                      # 来源 = tool/team/案例/ 里最新的「我的效果导出_*.json」
  python3 tool/team/build_cases.py --src a.json --extra b.json   # 换来源 / 再合并几个导出文件（同名取最新）
  python3 tool/team/build_cases.py --extra-all          # extra 里的效果全部收（不只「正式」开头的）
  python3 tool/team/build_cases.py --add 萤柠星 银辉芯   # 名字里含这些字的也收（用户勾选后加）
  python3 tool/team/build_cases.py --keep-names         # 名字保留「正式资产-」「正式资源-」前缀
规则：
  · 只收真正的我的效果（key = my:<id>）；同名去重取最新（at），同编号也只留最新；我的模板不收
  · 默认收名字以「正式」开头的（用户 10-27：含仙女棒、窜天猴尾焰三个版本）；没收的列出来给用户勾
  · 默认去掉名字前缀「正式资产-」「正式资源-」（同事看到的是「银菊」「仙女棒」）；编号、参数、英文名不动
  · 去掉 savedFrom（内部路径）；不烘缩略图（左栏用页面按参数画的示意图）
"""
import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUT = HERE / 'cases_bundle.json'
OUT_JS = ROOT / 'tool' / 'data' / 'team_cases.js'
BASE_TOOL = '5.0.0-a1'
PREFIX = re.compile(r'^正式(资产|资源)[-－·\s]*')
FORBID = ['F:/', 'E:/', 'F:\\', 'E:\\', 'loc_ma5', 'LOCMAI', '对话框']
# 同事先看到的顺序：仙女棒、窜天猴，再礼花，升空尾缀最后
ORDER = ['仙女棒', '窜天猴尾焰', '窜天猴', '金芒', '多重菊', '银菊', '小银菊', '金辉星', '小辉星', '小金花', '青柠', '分裂', '爆裂', 'Strobe', '升空尾缀']


def load(p):
    try:
        return json.loads(Path(p).read_text(encoding='utf-8'))
    except Exception as e:  # noqa: BLE001
        print(f'  跳过 {p}：读不了（{e}）', file=sys.stderr)
        return None


def docs_of(j):
    if not isinstance(j, dict):
        return []
    if j.get('format') == 'fwl.mybundle/1':
        return [d for d in (j.get('effects') or []) if isinstance(d, dict)]
    if j.get('format') == 'fwl.myrecipe/1':
        return [j]
    return []


def is_my(d):
    i = d.get('id')
    return d.get('format') == 'fwl.myrecipe/1' and isinstance(i, str) and re.fullmatch(r'fx[a-z0-9_]+', i, re.I) and d.get('key') == 'my:' + i \
        and isinstance(d.get('name'), str) and isinstance(d.get('snap'), dict)


def wanted(name, also):
    return name.startswith('正式') or any(a in name for a in also)


def order_key(name):
    for i, k in enumerate(ORDER):
        if k in name:
            return (i, name)
    return (len(ORDER) - 1.5, name)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--src', default='', help='来源（fwl.mybundle/1）；默认 tool/team/案例/ 里最新的「我的效果导出_*.json」')
    ap.add_argument('--extra', nargs='*', default=[], help='再合并的 fwl.mybundle/1（导出全部）或 fwl.myrecipe/1 文件')
    ap.add_argument('--extra-all', action='store_true', help='--extra 里的效果全部收，不只「正式」开头的')
    ap.add_argument('--add', nargs='*', default=[], help='名字里含这些字的也收（用户勾选的）')
    ap.add_argument('--keep-names', action='store_true', help='名字保留「正式资产-」「正式资源-」前缀')
    ap.add_argument('--out', default=str(OUT))
    a = ap.parse_args()
    a.also = a.add
    src = Path(a.src) if a.src else max((HERE / '案例').glob('我的效果导出_*.json'), default=None)
    if not src or not src.exists():
        print('❌ 没有来源：把「我的效果 → 导出全部」的文件放进 tool/team/案例/，或用 --src 指定', file=sys.stderr)
        return 1
    print('来源：', src.relative_to(ROOT).as_posix() if src.is_relative_to(ROOT) else src)

    cand = []   # (doc, source, from_extra)
    for d in docs_of(load(src)):
        cand.append((d, src.name, False))
    for x in a.extra:
        p = Path(x)
        for d in docs_of(load(p)):
            cand.append((d, p.name, True))

    pick_name, skipped = {}, []
    for d, src, extra in cand:
        if not is_my(d):
            if wanted(str(d.get('name', '')), a.also):
                skipped.append(f"{d.get('name')}（{src}：不是我的效果记录，key={d.get('key')}）")
            continue
        if not (wanted(d['name'], a.also) or (extra and a.extra_all)):
            continue
        k = d['name']
        old = pick_name.get(k)
        # 同名取最新；同一时间 extra（用户新发来的）优先
        if old is None or (str(d.get('at') or ''), extra) >= (str(old[0].get('at') or ''), old[2]):
            pick_name[k] = (d, src, extra)
    # 同编号只留最新
    by_id = {}
    for d, src, extra in pick_name.values():
        old = by_id.get(d['id'])
        if old is None or str(d.get('at') or '') >= str(old[0].get('at') or ''):
            by_id[d['id']] = (d, src, extra)

    effects, rows = [], []
    for d, src, extra in sorted(by_id.values(), key=lambda t: order_key(PREFIX.sub('', t[0]['name']))):
        e = json.loads(json.dumps(d, ensure_ascii=False))
        e.pop('savedFrom', None)
        orig = e['name']
        if not a.keep_names:
            nm = PREFIX.sub('', orig).strip() or orig
            e['name'] = nm
            if isinstance(e.get('snap'), dict) and e['snap'].get('kind') == 'combo':
                e['snap']['name'] = nm
        e.setdefault('created', e.get('at') or '')
        effects.append(e)
        sn = e['snap']
        layers = 1 if sn.get('kind') == 'single' else len(sn.get('layers') or [])
        rows.append({'id': e['id'], 'name': e['name'], 'orig': orig, 'en': (e.get('ue') or {}).get('base') or '（没设，导出前要填）',
                     'layers': layers, 'kind': '原生单层' if sn.get('kind') == 'single' else f'{layers} 层', 'at': e.get('at') or '', 'source': src})

    names = [r['name'] for r in rows]
    if len(set(names)) != len(names):
        print('❌ 去掉前缀后有重名，改用 --keep-names 或先在烘焙器里改名：', [n for n in names if names.count(n) > 1], file=sys.stderr)
        return 1
    bundle = {'format': 'fwl.mybundle/1', 'tool': BASE_TOOL, 'at': dt.datetime.now().strftime('%Y-%m-%d %H:%M'),
              'note': '烟花烘焙器对外版的案例（tool/team/build_cases.py 生成）：首次打开对外版时放进「我的效果」，左栏「案例」。',
              'effects': effects, 'templates': []}
    text = json.dumps(bundle, ensure_ascii=False, indent=1)
    hits = [t for t in FORBID if t in text]
    if hits:
        print('❌ 案例里有本机路径 / 内部字样，没写文件：', hits, file=sys.stderr)
        return 1
    Path(a.out).write_text(text + '\n', encoding='utf-8')
    OUT_JS.write_text('// 由 tool/team/build_cases.py 生成：对外版（tool/build.py --team）随包的案例（fwl.mybundle/1），首次打开放进「我的效果」。不要手改。\n'
                      'window.FW_CASES = ' + json.dumps(bundle, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')

    print(f'案例 {len(rows)} 个 → {Path(a.out).relative_to(ROOT) if Path(a.out).is_relative_to(ROOT) else a.out}（{len(text.encode("utf-8")) // 1024} KB）')
    for i, r in enumerate(rows, 1):
        print(f"  {i:2d}. {r['name']:<14}\t英文名 {r['en']:<22}\t{r['kind']:<5}\t{r['at']}\t{r['source']}")
    en = [r['en'] for r in rows]
    dup = sorted({x for x in en if en.count(x) > 1})
    if dup:
        print('⚠ 英文名重复（导出后导入 UE 会互相覆盖，要不要改由用户定）：')
        for x in dup:
            print('   ', x, '←', '、'.join(r['name'] for r in rows if r['en'] == x))
    if skipped:
        print('ℹ 同名的版本记录没收（不是我的效果）：', '；'.join(skipped))
    picked = {r['id'] for r in rows}
    rest = sorted({d['id']: (d['name'], str(d.get('at') or ''), len((d.get('snap') or {}).get('layers') or []) or 1) for d, s, x in cand if is_my(d) and d['id'] not in picked}.values(), key=lambda t: t[1])
    if rest:
        print(f'没放进案例的 {len(rest)} 个（要哪个告诉我，或 --add <名字里的字>）：')
        for n, at, nl in rest:
            print(f'   · {n}（{nl} 层，{at}）')
    print('✅ 案例里没有本机路径 / 内部字样（' + '、'.join(FORBID) + '）；已写 ' + OUT_JS.relative_to(ROOT).as_posix())
    return 0


if __name__ == '__main__':
    sys.exit(main())
