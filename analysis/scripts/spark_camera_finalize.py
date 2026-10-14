"""仅在本轮产物及界面检查一致后登记待验收；记录近似和未实测边界。"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/SparkGraph'
def read(p):return json.loads(p.read_text(encoding='utf-8'))
ui=read(O/'界面检查.json');assert ui['pass']
packages=read(O/'输出检查.json');assert all(v['pass'] for v in packages.values())
standard=read(R/'analysis/probe/标准检查/标准检查.json')
assert read(O/'镜头GPU与保存检查.json')['pass']
convergence=[]
for key in ['rocket','sparkler']:
 params=read(O/(key+'-导出参数.json'));id=params['entry'];assert standard['items'][id]['pass']
 row=next(x for x in ui['results'] if x['key']==key);assert row['ver']==params['ver'];assert row['wraps']>=2
 for i in range(3):
  a=np.asarray(Image.open(O/f'镜头-{key}-high-{i}.png').convert('RGB'),dtype=float);b=np.asarray(Image.open(O/f'镜头-{key}-reference-{i}.png').convert('RGB'),dtype=float)
  diff=np.abs(a-b);mask=np.maximum(a.max(2),b.max(2))>40
  convergence.append(dict(key=key,frame=i,mean=float(diff.mean()),lit_mean=float(diff[mask].mean()),maximum=float(diff.max())))
assert max(x['lit_mean'] for x in convergence)<.15
(O/'镜头收敛检查.json').write_text(json.dumps({'pass':True,'high_vs_double_samples':convergence},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
timing=read(O/'镜头完整导出计时.json')['rows'];table='\n'.join('| '+key+' | '+' | '.join(f"{next(x['ms'] for x in timing if x['key']==key and x['mode']==mode)/1000:.1f} s" for mode in ['off','fast','high'])+' |' for key in ['rocket','sparkler'])
(O/'看法.md').write_text('''# 4.9.84 · 可选镜头成像自检

SGR1 / SGS1各一个推荐候选，启用1/30s END快门、轻度景深、圆形散焦。曝光时间内逐粒积分，按屏幕速度自适应采样；出生/死亡裁剪，不沿历史线强制头亮尾暗。细丝和分叉亮度重新校准。全部13形态及短促爆发保留。

已审看真实PC/手机输出关键帧、13层单独形态及正式入口连续播放。焦内细芯、较粗运动亮痕、焦外软火星并存，分叉较前候选清晰；手机细丝仍有损失。构图、分布与原V05并非逐像素一致，不宣称用户已认可。

## 使用
正式入口待我验收打开窜天猴/仙女棒，右栏「镜头成像」。运动模糊、景深分别开关，参数跟资源保存；实时固定快速，导出按输出质量。旧资源无开关字段时关闭、原画面不变；用户旧候选存档不会被覆盖。历史线长/尾尖仅两镜头开关都关闭时使用。景深关闭且快门开启时仍保留运动模糊。

## 本机完整包耗时
RTX5080、Edge/D3D11；包含PC512/手机256单格、64帧、PNG与ZIP。单次实测会有波动，不是其他机器保证。

| 资源 | 关闭 | 快速 | 高质量 |
|---|---:|---:|---:|
'''+table+'''

## 检查证据
- `镜头GPU与保存检查.json`：焦内与等距离近/远离焦、圆/六边形、速度拉伸、保存刷新；圆形离焦前后光量差约0.04%。
- `镜头收敛检查.json`：高质量与加倍时间采样的亮部误差；未用黑背景平均值代替亮部比较。
- `镜头关闭回归.json`：旧两候选6帧逐像素相同；`镜头基准回归/基准回归.json`：7基准21帧和帧表全同。
- `界面检查.json`：打开、调参、保存、刷新、独看/恢复、烘焙、原速连续3周期，与导出候选指纹一致。
- 修复快捷入口误读window上的词法常量而回退旧模板；正式条目入口兼容粒子图没有旧type控件，审阅说明按列表登记。检查直接断言实际打开的镜头参数及粒子图等于推荐配方。
- `输出检查.json`及两个E1报告：PC/手机真实包全部通过；标准检查通过。预览图写入曾瞬时失败，重试完整检查成功，最终以报告SHA为准。

## 实现边界
散焦使用正交取景、真实Y深度及有限光圈核近似，保留光量；不是完整薄透镜路径追踪，不模拟透镜像差、遮挡散焦或色差。景深固化在贴图，UE相机不会重新对焦。二维旧模拟没有逐粒深度，只提供通用独立秒数快门；未虚构随机景深。快门按曝光平均保持现有亮度控制口径，延长曝光不会额外乘整体亮度。

未改工坊、已认可效果或UE。尾焰跟随喷口，不含弹体弹道。朝向锁、Bloom/压缩和实际米数仍未UE实机验证。状态：实现与AI自检完成，待用户审美验收。
''',encoding='utf-8')
s=read(R/'协作/状态清单.json')
for e in s['effects']:
 if e['key'] in ['rocket_graph','sparkler_graph']:
  e['阶段']='待验收';e['待验收版']=e['主条目'];e['进度']['AI自检']=True
  e['下一步']='审看4.9.84可选快门与景深：右栏镜头成像可独立关闭；实包回放见SparkGraph；旧画法用户已指出不符，本版待审美验收。'
  e['交付说明']['解决了什么']='可选曝光积分、真实深度景深、圆/六边形散焦；快速预览/高质量输出，13层与非均匀爆发保留。'
  e['交付说明']['仍有差异']='有限光圈核近似，景深固化到贴图；非V05逐像素复制，未含弹体弹道。'
q=s['共享文件']['窜天猴与仙女棒（Codex） · 可选镜头成像（2026-10-14）'];q['状态']='实现及AI自检完成，4.9.84；tool/src释放交回导出（23）';q['结果']='两推荐候选同指纹PC/手机标准与真实回放、镜头数学/GPU/保存刷新、7基准21帧及关闭6帧通过。看analysis/results/SparkGraph/看法.md；待用户验收。'
(R/'协作/状态清单.json').write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=R/'docs/superpowers/plans/2026-10-14-optional-camera-imaging.md';p.write_text(p.read_text(encoding='utf-8').replace('- [ ]','- [x]'),encoding='utf-8')
p=R/'对话记录/对话框窜天猴与仙女棒.md';text=p.read_text(encoding='utf-8');i=text.index('## 2026-10-14 可选镜头成像修订');text=text[:i]+text[i:].replace('- [ ]','- [x]');p.write_text(text+'\n4.9.84：已实现并自检。圆/六边形散焦、曝光时间与快门位置、高质量/快速/加倍核对；完整报告与耗时见SparkGraph/看法.md。默认关闭回归27帧无差。用户验收保持未通过；未UE实播。\n',encoding='utf-8')
p=R/'analysis/原理/窜天猴与仙女棒.md';p.write_text(p.read_text(encoding='utf-8')+'''\n## 4.9.84 镜头修订
用户否定固定头亮尾暗，明确批准按资源开关的快门、景深与散焦。当前1/30s END来自工坊V05 globals；新版以真实生存区间裁剪曝光，逐粒瞬时形态积分，快慢自然拉长缩短。默认关闭仍走原核。景深用原三维Y深度、正交有限光圈，散焦半径=光圈直径/2×abs((镜头距离+Y−焦距)/焦距)；焦距此处指对焦距离，不是镜头焦长。核为保能量的圆/六边形软边近似，非全屏模糊。能力通用，不按rocket/sparkler名写分支；其他二维模拟不编造深度。源图作为质感和结构参考，非像素匹配承诺；结果和限制统一见SparkGraph/看法.md。
''',encoding='utf-8')
p=R/'更新记录.md';text=p.read_text(encoding='utf-8');pos=text.index('\n## 2026-');text=text[:pos]+'''\n## 2026-10-14 · 烘焙器4.9.84：窜天猴/仙女棒可选镜头成像

待我验收两候选：快门按速度自动拉伸，真实深度景深与圆/六边形散焦；右栏「镜头成像」独立开关，按资源保存，其他资源默认关闭。实时快速，导出可选高质量。PC/手机实际回放和关闭回归通过；本机完整包耗时与边界见 analysis/results/SparkGraph/看法.md。景深固定到贴图，未经UE实播，待你判断质感。
'''+text[pos:];p.write_text(text,encoding='utf-8')
p=R/'交接.md';text=p.read_text(encoding='utf-8');needle='## 5. 会话日志（新的在上；每条写：做了什么、结果在哪、没做完的）';text=text.replace(needle,needle+'''\n
### 2026-10-14 · 窜天猴与仙女棒：4.9.84可选镜头成像
用户明确批准快门、景深和散焦烘入本轮素材；按资源独立开关，默认关闭。两候选重新导出并过标准/真实PC手机/保存刷新/连续播放；7基准21帧+关闭6帧相同。圆形离焦光量差约0.04%，高质量加倍采样收敛。报告SparkGraph/看法.md包含完整包耗时。通用镜头数学与三维图使用真实Y深度；旧二维模型不造景深。共享tool/src释放交回23；未改UE或工坊，用户画质与UE实播未通过。
''',1);p.write_text(text,encoding='utf-8')
print('镜头候选、收敛报告、交付记录已登记')
