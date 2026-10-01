import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import 评分 as S, 考卷 as K
ref = json.load(open('考卷/参考指标.json'))['时刻']
best = json.load(open('考卷/搜索结果.json'))['最好']
def show(P, label):
    ok, rows, info, res, expo = S.score({**best, **P})
    ts = [t for t in res if 0.4 <= float(t) <= 2.0]
    print(label, 'loss-items', [r['编号'] for r in rows if not r['通过']])
    print('  内/中 sim', [res[t]['内中比'] for t in ts])
    print('  内/中 ref', [ref[t]['内中比'] for t in ts])
    print('  线数 sim', [res[t]['线数_0.6R_扇区'] for t in ts]); print('  线数 ref', [ref[t]['线数_0.6R_扇区'] for t in ts])
if __name__ == '__main__':
    for a in sys.argv[1:]: show(json.loads(a), a)
