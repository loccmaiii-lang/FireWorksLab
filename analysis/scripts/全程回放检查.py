"""全程回放检查（对话框新花型，2026-10-07）：对本机素材包目录直接跑 回放检查.py 的 check，不带参考视频，所以能采到整段（大玉后半段）。

和 export_job.py 导出后那次回放检查同一个选法：只查一个面片放序列的发射器（GPU 光点没有贴图、单束每颗星一个面片，回放检查不适用）；
回放检查.py 的命令行版会把包里每个发射器都当序列读，遇到光点层（鸿巢四尺玉的红闪 = GPU 光点）就出错。
  python3 analysis/scripts/全程回放检查.py <输出图.jpg> <素材包目录> [--times 0.04,0.12,...]
输出：<输出图.jpg> + 同名 .json（回放检查.py 的格式，另记 skipped = 跳过的纯粒子发射器）；有不过的项退出码 1，脚本出错退出码 2。
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main(argv):
    times = (0.04, 0.12, 0.22, 0.35, 0.5, 0.65, 0.8, 0.95)
    if '--times' in argv: i = argv.index('--times'); times = tuple(float(x) for x in argv[i + 1].split(',')); del argv[i:i + 2]
    out, d = argv[0], argv[1]
    import importlib; rc = importlib.import_module('回放检查')
    cj = json.load(open(os.path.join(d, 'cascade.json'), encoding='utf-8'))
    mats = cj.get('materials') or {}
    # 和 export_job.run_combo_pack 同一条：只查「一个面片放序列」的发射器（有 main 贴图、只发 1 个）；光点（没有贴图）、单束（每颗星一个面片）不适用
    seqi = [i for i, e in enumerate(cj['emitters']) if (not mats or 'main' in ((mats.get(e.get('material')) or {}).get('textures') or {}))
            and sum(n for _, n in (e.get('spawn') or {}).get('bursts') or [[0, 1]]) == 1]
    skipped = [e['name'] for i, e in enumerate(cj['emitters']) if i not in seqi]
    r = rc.check([rc.Pack(d, i) for i in seqi], out, None, times)
    r['skipped'] = skipped
    json.dump(r, open(os.path.splitext(out)[0] + '.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(('✅' if r['pass'] else '❌'), os.path.basename(d), '跳过纯粒子发射器：' + '、'.join(skipped) if skipped else '')
    for L in r['layers']:
        if L.get('fails'): print('  ', L['pack'], '；'.join(L['fails']))
    return 0 if r['pass'] else 1


if __name__ == '__main__':
    try: code = main(sys.argv[1:])
    except Exception:     # 出错退出码 2（1 = 检查没过，任务里当正常结果记下）；脚本任务只在出错时存 stderr
        import traceback; traceback.print_exc(); code = 2
    raise SystemExit(code)
