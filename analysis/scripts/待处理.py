"""接续：列出每个负责人名下要接着做的事（用户 2026-09-30 14:46：结果回来后由负责该效果的 AI 接着评审和迭代，不默认转交用户）。

后台 GPU 脚本只负责取任务、计算、上传，没有视觉判断；它推上来的结果由负责的 AI 看。
每个对话 / 定时接续会话开工第一件事：git pull，然后

    python3 analysis/scripts/待处理.py            # 全部
    python3 analysis/scripts/待处理.py 对话框1     # 只看某个负责人

列出：① 结果回来了但还没写 看法.md 的任务（最该先做）② 出错的任务 ③ 在算 / 挂起的任务 ④ 导出缺失或过期（阶段是待验收 / 已通过的）⑤ 状态清单里的下一步。
"""
import json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from review_to_baker import job_effect  # noqa: E402

RES = os.path.join(ROOT, 'analysis', 'results')
LEGACY = {'JM0', 'JM1', 'JM2', 'TR1', 'TR2', 'WC1', 'QN1', 'QN2', 'QN3', 'QA1', 'QA2', 'QA3', 'QB1', 'QB2', 'QC1', 'QC2', 'QD1', 'QD2'}   # 旧流程（09-29 以前）的结果，没有看法.md 也不用补


def main(who=None):
    st = json.load(open(os.path.join(ROOT, '协作', '状态清单.json'), encoding='utf-8'))
    effs = {e['key']: e for e in st['effects']}
    jd = os.path.join(ROOT, 'analysis', 'jobs'); per = {}
    for f in sorted(os.listdir(jd)):
        if not f.endswith('.json'): continue
        j = json.load(open(os.path.join(jd, f), encoding='utf-8')); k = job_effect(j)
        if k: per.setdefault(k, []).append(j)
    out = []
    for k, e in effs.items():
        owner = e.get('负责', '')
        if who and who not in owner: continue
        items = []
        for j in per.get(k, []):
            d = os.path.join(RES, j['id'])
            if os.path.exists(os.path.join(d, 'error.json')): items.append(f"❗ {j['id']} 出错：看 {os.path.relpath(d, ROOT)}/error.json、log.txt，修好后用新编号或改输入重跑")
            elif os.path.exists(os.path.join(d, 'done.json')):
                if not os.path.exists(os.path.join(d, '看法.md')) and j['id'] not in LEGACY and j.get('type') != 'export':
                    items.append(f"👀 {j['id']} 结果回来了，还没看：读 对照.jpg / 数值.json / best.json，写 看法.md，决定下一步")
            elif j.get('ready') is False: items.append(f"⏸ {j['id']} 挂起：{j.get('hold', '')}")
            else: items.append(f"⏳ {j['id']} 在算（本机 GPU，半小时内取走）")
        if e.get('阶段') in ('待验收', '已通过') and not (e.get('进度') or {}).get('素材导出'):
            items.append('📦 还没有和当前版本一致的素材包：下导出任务（type: export）并做贴图回放检查')
        if e.get('下一步') and e.get('阶段') not in ('已通过', '未开始'): items.append('➡ 下一步：' + e['下一步'])
        if items: out.append((owner, e['名'], e.get('阶段', ''), items))
    if not out: print('没有待处理的事。'); return
    for owner in sorted({o for o, *_ in out}):
        print(f'\n## {owner or "未分配"}')
        for o, name, stage, items in out:
            if o != owner: continue
            print(f'\n### {name}（{stage}）')
            for x in items: print('- ' + x)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else None)
