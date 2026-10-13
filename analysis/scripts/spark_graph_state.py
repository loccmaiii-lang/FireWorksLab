"""仅更新本任务两个效果的状态，保留共享清单的其他记录。"""
import json
from pathlib import Path
R=Path(__file__).resolve().parents[2];p=R/'协作/状态清单.json';d=json.loads(p.read_text(encoding='utf-8'))
for key,id,name,en in [('rocket_graph','SGR1','窜天猴尾焰 · 分层喷射','RocketTail_Graph'),('sparkler_graph','SGS1','仙女棒 · 全形态','Sparkler_Graph')]:
 if not any(x['key']==key for x in d['effects']):d['effects'].append({'key':key,'名':name,'英文名':en,'负责':'窜天猴与仙女棒（Codex）','阶段':'制作中','主条目':id,'工作版':id,'进度':{'计算':True,'素材导出':True,'AI自检':False,'用户验收':False},'缺':['标准检查、基准回归与最终回放审看进行中；未经UE验证'],'下一步':'完成两套候选统一验收；本轮不改此前通过效果。'})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
