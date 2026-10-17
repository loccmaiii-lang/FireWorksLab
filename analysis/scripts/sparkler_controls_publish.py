"""把已审看的本轮仙女棒候选接入既有SGS1入口，保留旧条目快照。"""
from pathlib import Path
import json,re
R=Path(__file__).resolve().parents[2]
p=R/'analysis/原理/条目_窜天猴与仙女棒.json';doc=json.loads(p.read_text(encoding='utf-8'))
entry=next(e for e in doc['entries'] if e['id']=='SGS1')
archive=R/'归档/仙女棒_SGS1_4.9.113/条目.json';archive.parent.mkdir(parents=True,exist_ok=True)
if not archive.exists():archive.write_text(json.dumps(dict(entries=[entry]),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
pm=json.loads((R/'analysis/results/SparklerControls/候选参数.json').read_text(encoding='utf-8'))
entry.update(date='2026-10-18',p=pm['P'],m=pm['M'],why='13层同模拟亲子事件；拉开初速分布、按层减速，减弱下坠主导；弱上升气流只在燃烧点上方渐入。',look=['正常速度看短慢点与快长丝交替，保留不等间隔爆发。','整体调整与分叉调整都默认1；分叉寿命延长飞行，分叉角度另调。','焦内细芯、散焦光斑与一级/延迟/二级分叉保留。'],note='4.9.114运动修订，原SGS1快照在归档；不是物理标定。镜头开关按资源保存，景深烘入贴图；未经UE实播。')
p.write_text(json.dumps(doc,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
p=R/'tool/src/js/17_graph_presets.js';s=p.read_text(encoding='utf-8');m=re.search(r'const GRAPH_PRESETS=(\{[\s\S]*\});\nTYPES',s);assert m
presets=json.loads(m[1]);presets['sparkler']=pm['P']['sparkGraph'];s=s[:m.start(1)]+json.dumps(presets,ensure_ascii=False,indent=2)+s[m.end(1):];p.write_text(s,encoding='utf-8')
print('SGS1统一入口已接入本轮候选；尾焰与用户存档不改，旧条目已归档')
