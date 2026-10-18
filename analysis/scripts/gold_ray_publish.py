"""将唯一金芒菊候选接入统一查看器；不修改原金芒菊。"""
from pathlib import Path
import json,copy
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/GoldRayBurst'
pm=json.loads((O/'候选参数.json').read_text(encoding='utf-8'))
entry=dict(id='JMB1',date='2026-10-18',name='金芒菊 · 小起势与轻扰动',base='kiku',p=pm['P'],m=pm['M'],video='vidio/2.0/金芒菊A.mp4',tags='金芒菊 小起势 快引 爆后扰动 JMB1',thumb='analysis/results/GoldRayBurst/候选-4.png',why='从0.5m起势，同一批星快速展开并减速为金芒；爆后统一弱气流，旧版保持。',note='新候选。保留原星数、燃烧与冷却；为快速展开增加前段采样，两张分段主序列同刻仅一张面片。气流烘入贴图，UE没有运行时场。',look=['开头是否从小花心自然展开，快速引线与金芒是否连续。','爆后各束轻微弯曲，仍保持菊形与细芒，不像逐帧抖动。','引擎回放、PC/手机、800–1200m与适应窗口：首段和2.267s接力是否流畅。'],images=[['analysis/results/GoldRayBurst/起势对比.png','旧版与新候选，同秒模拟对照；最终验收看实包引擎回放。']])
(R/'analysis/原理/条目_金芒菊小起势.json').write_text(json.dumps({'entries':[entry]},ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
f=R/'协作/状态清单.json';d=json.loads(f.read_text(encoding='utf-8'));key='jinmangju_burst'
if not any(e['key']==key for e in d['effects']):
    d['effects'].append(dict(key=key,名=entry['name'],英文名='GoldRay_Burst',负责='金芒菊新效果（Codex）',阶段='制作中',主条目='JMB1',工作版='JMB1',参考=['vidio/2.0/金芒菊A.mp4'],进度=dict(计算=True,AI自检=False,素材导出=True,用户验收=False),缺=['标准/统一入口/回归待检查；用户审美与UE实播未验。'],下一步='完成PC手机回放、真实入口保存刷新、基准回归与门禁后再进待我验收。'))
f.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
ident='fxgoldrayburst20261018';folder=R/'analysis/我的配方'/('my_'+ident);folder.mkdir(parents=True,exist_ok=True)
mine=dict(format='fwl.myrecipe/1',key='my:'+ident,id=ident,name='金芒菊-小起势与轻扰动',tool='4.9.116',savedFrom='FireWorksLab/tool/FireworkBaker.html',at='2026-10-18',base='我的效果',snap={'kind':'single','repId':'JMB1','P':pm['P'],'M':pm['M']},links=[],ue={'base':'GoldRay_Burst','system':'GoldRay_Burst','custom':True,'layers':['']},sizeSource={'key':key,'entry':'JMB1'},sizePick='')
(folder/(mine['name']+'__'+ident+'.json')).write_text(json.dumps(mine,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
portable=dict(format='fwl.recipe/1',key='rv:JMB1',name=entry['name'],base='JMB1',baker='4.9.116',at='2026-10-18',snap=copy.deepcopy(mine['snap']))
(O/'金芒菊_小起势.recipe.json').write_text(json.dumps(portable,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('JMB1已接入制作中；独立我的配方与便携配方已生成，原件不写')
