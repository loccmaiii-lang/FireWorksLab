"""渲染考卷所有时刻（0.3–2.1 s，每 0.1 s）并按 考卷.RULES 打分。用法：python3 评分.py '<参数 JSON>' [输出目录]"""
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import 试渲 as T, 考卷 as K
HERE = os.path.dirname(os.path.abspath(__file__))
TIMES = [round(0.1 * k, 1) for k in range(3, 22)]
def score(P, out='/tmp/评分', save=False):
    ref = json.load(open(os.path.join(HERE, '考卷', '参考指标.json')))['时刻']
    res, expo, sh = T.run(out, P, TIMES, save=save)
    for t in res: res[t]['_Rratio'] = res[t]['R'] / res['1.0']['R']
    ok, rows, info = K.grade(res, ref)
    return ok, rows, info, res, expo
if __name__ == '__main__':
    P = json.loads(sys.argv[1]); out = sys.argv[2] if len(sys.argv) > 2 else '/tmp/评分'
    ok, rows, info, res, expo = score(P, out, save=len(sys.argv) > 2)
    for r in rows: print(('✅' if r['通过'] else '❌'), r['编号'], r['项目'], '' if r['通过'] else r['不过的时刻 (模拟, 参考)'])
    print('全过' if ok else '未全过', 'expo', round(expo, 4))
