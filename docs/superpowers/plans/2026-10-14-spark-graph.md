# 窜天猴尾焰与仙女棒重做 Implementation Plan

**Goal:** 两款可调、可烘焙、可回放的候选，仙女棒覆盖工坊V05的13类形态，窜天猴保持定向长火星与循环喷射。

**Architecture:** 在共享源码占用期间，使用固定版本烘焙器加独立通用粒子图模块。解析运动、亲子事件和周期出生共用同一模型；线条沿真实历史路径生成，点与不规则碎片单独画。编辑的是粒子图，不复制一套不同的预览物理；原烘焙器负责RGBA、Ramp、Cutout、PC/手机包及贴图回放。

**Tech Stack:** 原生JavaScript/WebGL2、Python生成配方与构建、Node/Playwright验证。

## Global Constraints
- Cascade、原材质、灰度RGBA接力；不写UE、不改工坊原件。
- 不并写他方认领的tool/src；生产接入须等待释放。
- 稳态循环先预热；亲子事件继承母粒事件时的位置速度；随机流按层和粒子固定。
- 模拟、已导出、自检通过、用户认可分别记录。
- 工坊V05没有完成正式循环/边缘验收，不能照搬其通过结论。

### Task 1: 通用循环图与形态覆盖
**Files:** experiments/spark-graph/model.js、render.js、presets.json；analysis/scripts/spark_graph_prepare.py、spark_graph_test.cjs。
**Interfaces:** buildGraph(recipe)生成周期粒子记录；sample(record,age)给3D位置速度；geometry(graph,t,selection)给线段、点、碎片。
- [x] 从V05完整参数提取13层/亲子UID/分布/尺寸亮度曲线；以来源表逐项验证。
- [x] 实现阻力解析式 s=(1-exp(-k*a))/k，p=p0+v0*s+g*(a-s)/k；k=0走匀加速极限。
- [x] 先检查周期、0阻力、父子出生连续性、改变亮度不改轨迹、不同粒子有不同几何，再渲染。
- [x] 细丝用历史路径锥形线段，碎片用粒子独立多边形和翻转，点用柔核；保留形态与运动相关性。

### Task 2: 可编辑候选与既有导出接线
**Files:** experiments/spark-graph/editor.js、analysis/scripts/spark_graph_prepare.py；analysis/results/SparkGraph/。
**Interfaces:** P.sparkGraph为完整持久化配方；makeGraphRenderer(P)提供draw/dispose/Tp，接入现有makeRenderer；既有bakeLoop/exportFiles照常运行。
- [x] 固定循环取景包含全周期边缘；两款各一个推荐预设，数值注明候选。
- [x] 每层数量、寿命、速度、粗细、亮度、拖线、分叉时刻/数量/继承和开关可调；全部配方可保存刷新。
- [x] 保留现有导出、流转、引擎回放和游戏内大小；真实浏览器操作确认。

### Task 3: 内部产物验收与交接
**Files:** analysis/scripts/spark_graph_bake.cjs、analysis/results/SparkGraph/看法.md、对话记录/对话框窜天猴与仙女棒.md。
- [x] 两款PC/手机真实导出并运行回放检查，观察整体、分层局部、连续循环至少3次。
- [x] 以源图逐项对照13类，检查分叉非悬空、长短粗细明暗变化、主焰非实心光杆。
- [x] 标准/版本指纹及保存刷新证据对应同候选；未过项不进入待我验收。
- [x] 共享占用解除后接入正式入口、参数表、版本和构建回归；未解除则明确记录这一真实阻碍。

## 完成记录

已接入正式源码4.9.83（model/render/editor为46_graph_model.js、46_graph_render.js、79_graph_editor.js）；早期独立实验已被正式实现替代。用户放宽无缝要求后，非均匀短爆发优先。SGR1/SGS1标准及PC/手机回放通过，7个原有基准21帧零差；保存刷新及连续三周期通过。报告、完整参数、可播放实包与13层图见analysis/results/SparkGraph。UE及用户审美验收仍未完成。
