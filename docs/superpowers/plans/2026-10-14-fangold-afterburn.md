# FanGold燃尽后控制 Implementation Plan

> **For agentic workers:** Inline execution；沿用用户已授权任务，不额外委派。缺失executing-plans子技能时按本计划直接执行。

**Goal:** 将FanGold1.0普通火花和余烬的末段曲线、弱气流接入正式烘焙器并交付FC6O。

**Architecture:** 普通火花保留原出生/寿命/运动；每颗母星可见燃尽时刻另存轨迹info第三格，不复用被sparkStop截短的发射终点。曲线以燃尽后的剩余寿命为时间轴，渐入乘数；气流从原运动燃尽状态继续积分。关闭保留原分支，亮头不读新参数。

**Tech Stack:** JavaScript/WebGL2、Python、Edge/Playwright，现有实际导出和规范检查。

## Global Constraints
- 用户FanGold1.0原件不改，FC6O整面合并，PC≤2048、手机≤1024；不写UE、不加材质。
- 前段和亮头保持；不延寿、不增亮掩盖收益。只针对普通火花/余烬；不扩展分叉子火花。

### Task 1: 核心和参数
Files: tool/src/js/19_spark_late.js（阶段/气流/积分公共数学）、20_sim.js（CPU火花）、40_gl.js（GPU/母星终点）、41_particles40.js（使用新速度拉长）、30_plan.js（气流边界）、10_types.js、12_tempo.js、analysis/命名两表。
- [ ] 先在analysis/scripts/fg_afterburn_test.cjs验证缺失功能失败：阶段在burn前为0、sparkStop不能提前启动、零风不改变旧渲染。
- [ ] 新增sparkLateWind/Scale/Fade和sparkTailAfterBurn默认0；sparkLateAir(P,x,y,t,burn)返回二维附加风速；sparkLateStep(P,p,v,U,g,k,c,t,h,burn)返回一步位置速度。中点取场，Strang线性/平方阻力积分；步长≤1/60。
- [ ] GPU第三格保存birth+(vis??burn)；原运动算到燃尽，再积分剩余时间；普通火花拉長使用同次积分的末速度。
- [ ] 两类既有曲线：mix(1,curve((t-burn)/(tb+life-burn)),smoothstep(0,fade,t-burn))；空曲线倍率1；CPU只在新阶段启用时接入，保留旧输出。
- [ ] 受力提示和参数表含单位、范围、关闭行为；节奏变换气流速度和渐入时间。保守取景补风速×寿命，不固定旧取景掩盖裁切。

### Task 2: 验证并设唯一候选
Files: analysis/scripts/fg_afterburn_*、analysis/results/FG_Afterburn/、analysis/原理/FC6O_FanGold参数.json、扇形彗星条目.py、条目_扇形彗星.json、tool/data/review.js。
- [ ] CPU阶段/中点积分收敛与GPU数学结果核对；同种子零强度/关闭逐像素回归、燃尽前采样/头部不变；早停发射测试不误当燃尽。
- [ ] 原模板候选只加0.6m/s弱气流、1.5m尺度、0.4s渐入、末段火花与余烬独立曲线；实际看图后只调新增参数，不改原亮度/寿命。
- [ ] 执行动态六模板+认可/待验收基准逐像素回归；实际PC/手机ZIP标准、回放、fx_gate；实际打开/调参/保存/刷新/导出，审看连续回放。

### Task 3: 交付
- [ ] 4.9.85版本/CHANGELOG/看法/状态/交接/更新记录一致，build静态检查通过。所有证据对应当前指纹。
- [ ] 只提交任务白名单，fetch/安全rebase/推送，主目录安全快进；保留他方内容；tool/src交回23，未UE实测明确。
