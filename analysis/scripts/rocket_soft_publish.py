"""登记独立柔光候选及用户配方副本，复用统一查看器；不改原资产。"""
from pathlib import Path
import json,copy,datetime,re
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/RocketSoft'
version=re.search(r"const VERSION = '([^']+)'",(R/'tool/src/js/10_types.js').read_text(encoding='utf-8'))[1]
pm=json.loads((O/'候选参数.json').read_text(encoding='utf-8'));source=json.loads((O/'来源与设置.json').read_text(encoding='utf-8'))
entry=dict(id='SGRS1',date='2026-10-18',name='窜天猴尾焰 · 柔光暗底',base='sparkgraph',p=pm['P'],m=pm['M'],tags='窜天猴 尾焰 柔光 暗底 虚化 分层',why='复制用户主体的同一轨迹和相位，软化发光核并补偿能量；原主体/粒子版不动。',look=['柔层单独看只有暖色软光，主体叠加后保留亮芯与细丝。','与主体共用起播时刻、播放速率、位置和轴锁；不要分别随机循环相位。','整体粒子大小/亮度和本层颜色可独立调节；增大核后注意同步降低亮度。'],note='光晕散射近似；暗底为低能量加法，不遮光。来源正式资产-窜天猴尾焰；PC/手机及叠加内部核对，UE三层未实播。',thumb='analysis/results/RocketSoft/柔层-2.png')
entry.update(images=[['analysis/results/RocketSoft/PC-叠加对照.png','主体 / 柔光暗底 / 两层叠加（真实PC素材包）']],imagesTitle='同相位、同面片尺寸的叠加对照')
(R/'analysis/原理/条目_窜天猴柔光暗底.json').write_text(json.dumps({'entries':[entry]},ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
p=R/'协作/状态清单.json';d=json.loads(p.read_text(encoding='utf-8'));key='rocket_soft'
if not any(e['key']==key for e in d['effects']):d['effects'].append(dict(key=key,名=entry['name'],英文名='RocketTail_Soft',负责='窜天猴与仙女棒（Codex）',阶段='制作中',主条目='SGRS1',工作版='SGRS1',进度=dict(计算=True,素材导出=True,AI自检=False,用户验收=False),缺=['统一入口保存刷新与标准待检查；用户审美/UE实播未验'],下一步='同轨迹柔光暗底，软层单独与主体叠加已审看，PC/手机实包通过；继续完成统一入口与标准。',交付说明={'解决了什么':'用户主体复制的独立柔光暗底，空间软核与面积能量补偿；同取景/轨迹/相位。','素材在哪':'analysis/results/RocketSoft','仍有差异':'加法柔光不能遮光或代表黑烟；三层最终UE合成未实播。','未经 UE 验证':'Bloom叠加、实际压缩/米数与GPU扰动层配合。'}))
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# 原生“我的效果”独立副本：全新的资产与层ID，独立英文名，不覆盖原UE名称。
raw=json.loads((R/source['source']).read_text(encoding='utf-8'));mine=copy.deepcopy(raw);ident='fxrockettailsoft20261018'
mine.update(id=ident,key='my:'+ident,name='正式资产-窜天猴尾焰-柔光暗底',tool=version,at=datetime.datetime.now().strftime('%Y-%m-%d %H:%M'),links=[],sizeSource={'key':key,'entry':'SGRS1'},sizePick='')
standard_path=R/'analysis/probe/标准检查/标准检查.json'
items=json.loads(standard_path.read_text(encoding='utf-8')).get('items',{}) if standard_path.exists() else {}
current=items.get('SGRS1',{}) if isinstance(items,dict) else next((x for x in items if x.get('id')=='SGRS1'),{})
mine['from']={'key':'ef:'+key,'name':entry['name'],'base':'SGRS1','ver':current.get('ver','')}
mine['ue'].update(base='RocketTail_Soft',system='RocketTail_Soft',layers=[''],custom=True)
# 来源只有一层，变换为恒等；用现有原生单层保存，避免额外的单层组合容器。
mine['snap']={'kind':'single','repId':'SGRS1','P':pm['P'],'M':pm['M']}
folder=R/'analysis/我的配方'/('my_'+ident);folder.mkdir(parents=True,exist_ok=True)
(folder/('正式资产-窜天猴尾焰-柔光暗底__'+ident+'.json')).write_text(json.dumps(mine,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('SGRS1入口与独立我的配方副本已登记；旧文件不写')
