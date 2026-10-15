"""检查证据齐全后登记本轮交付；不覆盖其他任务进度。"""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/SparkFlow'
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
for f in ['模型检查.json','界面检查.json','关闭回归.json']:assert read(O/f)['pass'],f
assert all(x['pass'] for x in read(O/'门禁界面.json') if 'pass' in x)
gate=read(O/'合入门禁.json');assert all(x['pass'] for x in gate if x['item'] in ['契约','导出'])
packages=read(R/'analysis/results/SparkGraph/输出检查.json');assert all(x['pass'] for x in packages.values())
text='''# 4.9.104 全局气流 · AI自检

当前推荐SGR1：喷口初速仍锥形，1.5m后渐入、3.5m过渡；响应25/s、下吹45m/s、收束4.5/s、涡流12m/s、尺度10m；粗碎片与长寿火星响应倍率0.45，其余1。数值是候选，不等于用户审美通过。SGS1增加同样可控能力，原配方未启用，画面不变。

## 审看结论
已看原速连续回放、PC/手机八个真实包关键时刻、0.4/0.9/1.75s气流开关对照。首轮收束太紧，改为上述参数后，外侧粗火星保留惯性、中后段细丝向内弯，分叉跟随母粒位置，短促爆发不平均化。手机最细分叉仍有损失；尾端是离散火星而非连续发光气体，不冒充图2/3的连续火箭亮焰。原光斑、曝光和粒子数量没有通过调暗改动来造型。

## 验证
- 模型：恒风解析解、先扩后收、分叉位置/速度、层倍率0、Hermite速度导数、乱序采样、气流周期、步长减半与非法值检查通过。69,888粒子/周期、13层、出生时刻和爆发事件不变；抽样长寿根粒中后段平均径向半径约为关闭时0.616倍。
- 关闭对照：两效果×镜头开/关×三时刻，共12帧与4.9.103逐像素相同；7个其他基准21帧及帧表相同。
- 正式统一右栏：编辑、撤销/重做、保存成我的效果、刷新恢复、独立总开关、连续至少两次周期回绕通过。初期测试脚本提前关自动烘焙导致撤销基线未建立，已修正测试启动时序；另修复新开关需从下拉字符串转数值的问题。
- PC512/手机256单格，64帧/30fps，真实包与标准检查均通过。指纹SGR1 `609bae26·graph4.9.97+loop4.9.83`，SGS1 `7b78d809·graph4.9.97+loop4.9.83`；完整包SHA见SparkGraph/输出检查.json。
- 合入契约15种代表/189行、导出结构通过；界面8/8通过。首轮门禁子进程找不到Playwright，已用本机现有runtime的PYTHONPATH修正，Edge无窗口运行；没有修改检查断言或绕过门禁。

## 用法与成本
统一右栏「分层粒子图 › 全局气流」，三分量可叠加；各层「阻力重力 › 随流倍率」。0倍率不再受该层气流加速度，但子粒仍继承母粒出生速度。旧资源默认关。先关涡流调收束包络，再加扰动；收束率管紧度，响应率管转向快慢，尺度管弯折宽度。场跟随喷口局部坐标，不是世界空间尾迹。

本机RTX5080、Edge/D3D11，同镜头高质量完整PC＋手机PNG/ZIP：关14.677s、开16.626s，单轮约多1.95s（13%），实际随粒子数/寿命/场尺度而变。关闭不创建轨迹缓存。

原理来源和近似边界见 analysis/原理/粒子图全局气流.md。收束场是美术引导，不是质量守恒CFD；静态附件不能确定真实流速。本次实现/AI自检完成，用户验收和UE实播未通过。
'''
(O/'看法.md').write_text(text,encoding='utf-8')
p=R/'analysis/results/SparkGraph/看法.md';old=p.read_text(encoding='utf-8');p.write_text('# 当前交付：4.9.104 全局气流\n\n窜天猴已更新为先扩散、后收束下吹的候选；仙女棒原形态不变。最新同指纹验证、耗时和边界见 [SparkFlow/看法.md](../SparkFlow/看法.md)。以下保留镜头成像历史评审。\n\n'+old,encoding='utf-8')
p=R/'tool/CHANGELOG.md';p.write_text('''## 4.9.104 · 粒子图全局气流（窜天猴与仙女棒，用户10-15）

- 当前粒子图共用定向风、轴向收束、连续涡流；轴向距离平滑渐入、各层随流倍率。原锥形初速保留，有限响应逐渐转弯；不开场不改变原轨迹或增加积分缓存。
- RK4缓存/Hermite连续采样共用于亲子分叉、历史线和镜头快门积分；不按粒子ID伪造独立风，不按图片缩窄造型。统一右栏/撤销/保存/草稿/指纹复用，旧配方缺字段显示关闭。
- SGR1推荐开启，SGS1保留原样。真实PC/手机包、标准、统一入口保存刷新/撤销/回放、12帧关闭对照、7基准21帧通过；模型解析解与收敛检查通过。报告analysis/results/SparkFlow/看法.md。
- 不改其他模拟、材质或UE；不加入CFD/马赫环/世界空间尾迹。OUTPUT_VER不全局升号，新配方字段自身进入指纹；原资源无需因增加关闭能力而重导。

'''+p.read_text(encoding='utf-8'),encoding='utf-8')
p=R/'更新记录.md';s=p.read_text(encoding='utf-8');i=s.index('\n## 2026-');s=s[:i]+'''\n## 2026-10-15 · 烘焙器4.9.104：窜天猴全局气流

待我验收SGR1：先锥形扩散、再向内收束及向下扰动。右栏「分层粒子图 › 全局气流」调定向风/收束/涡流，各层可调随流倍率；沿用统一参数保存与撤销。仙女棒同样可用但原候选未开启。PC/手机真实回放与关闭回归通过；本机高质量完整导出约14.7→16.6秒。审看analysis/results/SparkGraph/实包回放.html；原理/报告analysis/results/SparkFlow/看法.md。用户审美与UE实播待验收。
'''+s[i:];p.write_text(s,encoding='utf-8')
p=R/'协作/状态清单.json';d=read(p)
for e in d['effects']:
 if e['key']=='rocket_graph':
  e['下一步']='4.9.104全局气流：审看SGR1先扩后收与下吹扰动。统一右栏分层粒子图/全局气流，每层阻力重力/随流倍率。PC/手机与保存/回归检查通过，报告analysis/results/SparkFlow/看法.md；UE及用户审美待验收。此前4.9.97镜头修复保留。'
  e['交付说明']['解决了什么']='锥形初速后渐入全局定向风/收束/涡流，有限惯性响应；亲子与快门同轨迹，原13层及不均匀爆发保留。'
  e['交付说明']['仍有差异']='引导式气流近似，非真实可压缩燃烧流场；尾端离散火星，非连续亮焰；场随喷口局部坐标。'
q=d['共享文件']['窜天猴与仙女棒（Codex） · 全局速度场（2026-10-15）'];q['状态']='实现与AI自检完成4.9.104，tool/src已释放';q['结果']='报告analysis/results/SparkFlow/看法.md；SGR1待审，SGS1形态不变。默认关闭回归、统一参数保存/撤销/回放、PC/手机输出、标准和合入契约/界面子集通过。'
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=R/'对话记录/对话框窜天猴与仙女棒.md';s=p.read_text(encoding='utf-8');i=s.index('## 2026-10-15 全局速度场');s=s[:i]+s[i:].replace('- [ ]','- [x]');p.write_text(s+'\n4.9.104实现与AI自检完成；审看和证据见SparkFlow/看法.md，推送提交号在收尾记录补充。\n',encoding='utf-8')
p=R/'docs/superpowers/plans/2026-10-15-global-spark-flow.md';p.write_text(p.read_text(encoding='utf-8').replace('- [ ]','- [x]'),encoding='utf-8')
p=R/'交接.md';s=p.read_text(encoding='utf-8');needle='## 5. 会话日志（新的在上；每条写：做了什么、结果在哪、没做完的）';s=s.replace(needle,needle+'\n\n### 2026-10-15 · 窜天猴与仙女棒：4.9.104全局气流\n用户授权多个全局场；定向风/收束/连续涡流+逐层随流倍率，统一右栏，默认关。SGR1推荐启用、SGS1未改形态，亲子/快门同轨迹，保存/撤销/实包/标准/回归通过。报告SparkFlow/看法.md，原理analysis/原理/粒子图全局气流.md。共享源码已释放；未改UE，待用户审美。门禁首次子进程缺Playwright；本机PYTHONPATH接现有runtime、无窗口Edge后界面8/8通过，没有绕过检查。\n',1);p.write_text(s,encoding='utf-8')
# 旧检查页写死4.9.83；展示实际这次导出的版本，不改变回放数据。
p=R/'analysis/scripts/spark_graph_check.py';s=p.read_text(encoding='utf-8').replace('4.9.83 实际素材包回放',"'''+entry['version']+''' 实际素材包回放");p.write_text(s,encoding='utf-8')
p=R/'analysis/results/SparkGraph/实包回放.html';p.write_text(p.read_text(encoding='utf-8').replace('4.9.83 实际素材包回放','4.9.104 实际素材包回放'),encoding='utf-8')
print('气流交付与记录登记完成')
