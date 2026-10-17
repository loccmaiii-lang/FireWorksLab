# 窜天猴柔光暗底 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从用户主体配方复制一份低亮度暖色虚化底层，可独立导出并与主体同步叠加。

**Architecture:** 复用现有SparkGraph/镜头高斯核和统一素材输出；只改副本的发光核、能量和Ramp。原种子、出生、速度场、亲子关系、寿命、周期与取景逐项保持。无新模拟或材质，无tool/src修改。

**Tech Stack:** Python数据生成、现有JS/WebGL渲染与RGBA/Cascade，Node/Edge HTTP检查。

## Global Constraints

- 保留主体及粒子版原文件；只新增一份推荐副本；不写UE、不加GPU层或材质。
- 源是my_fxmv96inysff36h，图像同一随机流；PC单格≥512、手机≥256；不设置NeverStream，不使用file://自动测试。
- 暗底按弱暖色加法解释，不能遮挡/压暗背景；空间软化沿用发光核，避免靠延长曝光拖抹或假造焦平面。

### Task 1: 数据候选与审看

**Files:** analysis/scripts/rocket_soft_prepare.py、rocket_soft_probe.cjs；analysis/原理/窜天猴柔光暗底_20261018.md；analysis/results/RocketSoft/。

**Interfaces:** 输入原生存档snap.layers[0].P/M/L；输出主体参数.json、候选参数.json和fwl.recipe/1文件。

- [ ] 生成副本：`width2=sqrt(width1**2+0.32**2)`；`gain2=gain1*0.12*(width1/width2)**2`，保留固定随机数。光学轮廓采用柔高斯点核和原运动曝光；Ramp去白峰，改暖橙。
- [ ] 断言运动字段、周期/种子/取景完全相同；用`SparkGraph.sample`比较每层抽样位置与速度。
- [ ] 正式HTTP渲染5时刻，审看主体/柔层/相加。测线性能量、边缘高频、峰值与质心；只在视觉或检查失败时继续改。

### Task 2: 交付与接入

**Files:** analysis/原理/条目_窜天猴柔光暗底.json、协作/状态清单.json、结果与更新记录；生成tool/data/review.js与FireworkBaker.html。

**Interfaces:** 新条目SGRS1、效果rocket_soft，英文RocketTail_Soft；输出一份PC/手机ZIP与完整参数/原生recipe。

- [ ] `__fw.exportFiles(P,M,'EFX_FireWorks_RocketTail_Soft',{naming:false,size:'none'})`实际导出；复用回放检查与标准探针，30fps完整64帧、两平台边缘/空帧/过曝通过。
- [ ] 注册既有统一入口，真实点击/原生文件载入、保存/刷新和连续播放；复制件可独立调大小/亮度/颜色。
- [ ] 标准通过、记录当前版本/指纹/源SHA；构建、白名单提交并正常推送。不修改他方CLAUDE/fx_gate/问题清单。

当前会话内顺序执行，不委派，不因计划额外询问。
