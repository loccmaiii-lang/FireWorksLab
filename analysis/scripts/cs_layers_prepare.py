"""从已认可参数生成独立候选及可重复检查入口；不改认可原件。"""
from pathlib import Path
import json,subprocess
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/CS3_Layers';O.mkdir(exist_ok=True)
d=json.loads((R/'analysis/原理/条目_CometSilver3.json').read_text(encoding='utf-8'))
d=json.loads(json.dumps(d).replace('CS3C','CSLRC').replace('CS3S','CSLRS'))
d['说明']='4.9.82 正式功能候选；保留前段与独立红头，只在燃尽后渐入曲线、余烬和弱气流。'
for e in d['entries']:
 e['date']='2026-10-14';e['name']=e['name'].replace('3.0','3.1 · 末段分层')
 e['note']='新功能候选，非原件替换；燃尽后逐渐生效，自动测量仍按完整新效果计算。'
 e['look']=['前段和亮头的模拟不变；燃尽后细尾略收、稀疏余烬继续消散。','检查正常速度和手机远景，不只看放大细节。']
 if e['id'].endswith('-H'): continue
 e['p'].update(rtLateWind=.6,rtLateScale=1.5,rtLateFade=.4,rtTailAfterBurn=1,rtETex=1,
  rtERate=8,rtELife=3.2,rtESize=.21,rtEI=3,rtEKd=3,
  rtFSizeCurve='0:1,0.6:1,1:0.65',rtFBrightCurve='0:1,0.6:1,1:0.55',
  rtMSizeCurve='0:1,0.7:1,1:0.8',rtMBrightCurve='0:1,0.7:1,1:0.75',
  rtESizeCurve='0:1,0.7:1,1:0.5',rtEBrightCurve='0:0.65,0.55:1,1:0')
for e in d['combos']:
 e['date']='2026-10-14';e['name']='Comet 3.1 · 燃尽后分层与扰动';e['note']='独立候选，沿用原红头；金尾合并输出。';e['look']=['燃尽前外观保持；燃尽后尾部有稀疏余烬与轻微弯散。']
(R/'analysis/原理/条目_CometSilverLayers.json').write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
sf=R/'协作/状态清单.json';st=json.loads(sf.read_text(encoding='utf-8'))
for id,name,en in [('CSLRC','Comet 3.1 · 燃尽后分层与扰动','Comet3_Layers'),('CSLRS','Silver 3.1 · 燃尽后分层与扰动','Silver3_Layers')]:
 if any(e.get('主条目')==id for e in st['effects']):continue
 st['effects'].append({'key':en.lower(),'名':name,'负责':'comet&silver3.0（xx）','阶段':'制作中','主条目':id,'工作版':id,'待验收版':None,'英文名':en,'进度':{'计算':False,'AI自检':False,'素材导出':False,'用户验收':False},'下一步':'正式功能联调，PC/手机导出及检查完成后进入待验收。'})
sf.write_text(json.dumps(st,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# 基线保持旧内核，用相同新条目 ID 装入认可原配方。
source=subprocess.check_output(['git','show','5ea4762d:tool/FireworkBaker.html'],cwd=R).decode('utf-8')
raw=subprocess.check_output(['git','show','5ea4762d:tool/data/review.js'],cwd=R).decode('utf-8');entries=json.JSONDecoder().raw_decode(raw.split('var FW_REVIEW = ',1)[1])[0]
orig=[e for e in entries if e['id'] in ['CS3C','CS3C-T','CS3C-H','CS3S']]
orig=json.loads(json.dumps(orig).replace('CS3C','CSLRC').replace('CS3S','CSLRS'))
data='var FW_REVIEW='+json.dumps(orig,ensure_ascii=False)+';var FW_VMETA={};var FW_REVIEW_COMBOS=[];var FW_EFFECTS=[];'
source=source.replace('<script src="data/review.js"></script>','<script>'+data+'</script>',1).replace('<head>','<head><base href="../../../tool/">',1)
# 基线 HTML 是检查用临时产物；提交参数/检查结果，不重复提交工具副本。
local=R/'analysis/local/CS3-Layers';local.mkdir(exist_ok=True);(local/'baseline.html').write_text(source,encoding='utf-8')
print('生成两款候选及 4.9.81 原参数基线')
