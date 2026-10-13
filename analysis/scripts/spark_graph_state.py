"""仅更新本任务两个效果的状态，保留共享清单的其他记录。"""
import json,sys
from pathlib import Path
R=Path(__file__).resolve().parents[2];p=R/'协作/状态清单.json';d=json.loads(p.read_text(encoding='utf-8'))
for key,id,name,en in [('rocket_graph','SGR1','窜天猴尾焰 · 分层喷射','RocketTail_Graph'),('sparkler_graph','SGS1','仙女棒 · 全形态','Sparkler_Graph')]:
 if not any(x['key']==key for x in d['effects']):d['effects'].append({'key':key,'名':name,'英文名':en,'负责':'窜天猴与仙女棒（Codex）','阶段':'制作中','主条目':id,'工作版':id,'进度':{'计算':True,'素材导出':True,'AI自检':False,'用户验收':False},'缺':['标准检查、基准回归与最终回放审看进行中；未经UE验证'],'下一步':'完成两套候选统一验收；本轮不改此前通过效果。'})
 if '--ready' in sys.argv:
  ui=json.loads((R/'analysis/results/SparkGraph/界面检查.json').read_text(encoding='utf-8'));assert ui['pass']
  report=json.loads((R/'analysis/results/SparkGraph/输出检查.json').read_text(encoding='utf-8'));assert all(x['pass'] for x in report.values())
  standard=json.loads((R/'analysis/probe/标准检查/标准检查.json').read_text(encoding='utf-8'));assert standard['items'][id]['pass']
  e=next(x for x in d['effects'] if x['key']==key);e.update({'阶段':'待验收','待验收版':id,'导出任务':[id+'E1'],'进度':{'计算':True,'素材导出':True,'AI自检':True,'用户验收':False},'缺':['用户审美验收；UE跟随朝向、Bloom、压缩和实际米数未经实机验证'],'下一步':'刷新正式烘焙器，在待我验收打开；原速看短促爆发，慢放看长丝与分叉，切PC/手机。','交付说明':{'解决了什么':'13层父子火星、运动路径拉伸与不等间隔短爆发；每层可调并保存；PC/手机素材完整。','素材在哪':'analysis/results/SparkGraph/（本机ZIP及实包回放），解包目录analysis/local/SparkGraph/','仍有差异':'固定周期内非均匀节奏；尾焰跟随喷口，不包含弹体弹道；世界尺寸为候选。','未经 UE 验证':'朝向锁、跟随喷口、Bloom、压缩和世界尺度。'}})
if '--ready' in sys.argv:
 q=d['共享文件']['窜天猴与仙女棒（Codex） · 形态图循环烘焙重做（2026-10-14）'];q.update({'状态':'已完成4.9.83并自检，tool/src释放交回导出（23）','待接入':'已接入正式入口、参数表、版本、构建与回归。','结果':'SGR1/SGS1待用户验收；标准/真实PC手机回放/保存刷新/7基准通过。报告analysis/results/SparkGraph/看法.md。'})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
