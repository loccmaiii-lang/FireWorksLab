# 分层粒子图整体倍率 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 当前粒子图统一调半锥角、数量、直径、寿命和亮度，默认1保留原画面。

**Architecture:** 在 SparkGraph.build 内从原配方得到有效发射器副本，共用模拟、成像及导出。数量只乘根粒，子代按原结构生成；原配方不回写。五个路径参数复用统一右栏和保存撤销。

**Tech Stack:** 原生 JavaScript、Python登记构建、Node assert、Edge Playwright。

## Global Constraints

- 用户点名的五项为本轮范围；默认1，不新增速度/时间/气流倍率，不改用户存档或候选调参。
- 不改UE、Cascade、材质；PC单格≥512，手机≥256，原导出格式不变。
- 模拟与导出共享有效值；无效寿命/角度/数量明确报错，不静默吞参数。
- 当前会话内执行，无子代理；项目CLAUDE.md的记录位置优先。

### Task 1: 模型及参数接线

**Files:** `tool/src/js/46_graph_model.js`、`10_types.js`、`71_panel43.js`，两份命名表。

**Interfaces:** `SparkGraph.parameterDefault(key)`返回五项缺省1；`SparkGraph.build(recipe)`返回原recipe及有效粒子（q.e为有效发射器），不改变输入。

- [x] 在 `analysis/scripts/spark_graph_scales_test.cjs` 检查默认缺省和显式1一致、输入不变、重复build不叠乘、根/子/孙数量约线性、子粒接母轨迹、球形不受锥角影响、寿命事件联动、无效值拦截。核心断言：`assert.deepEqual(G.build(r).all.map(q=>q.p), G.build({...r,scaleCone:1}).all.map(q=>q.p))`。
- [x] 实现根数 `Math.round(e.count*scaleCount)`；宽度 `e.width*scaleWidth`；寿命 `[lo*scaleLife,hi*scaleLife,bias]`；亮度 `e.gain*scaleGain`；仅锥形 `e.cone*scaleCone`。有效半锥角>180或有效寿命>=period明确拒绝。
- [x] 登记五项到分层粒子图/整体调整，缺省读取1，半锥角无可作用层时变灰说明。参数帮助写明数量/寿命联动和固定取景可能裁切。

### Task 2: 入口和产物验证

**Files:** `analysis/scripts/spark_graph_scales_verify.cjs`，`analysis/results/SparkScales/`。

**Interfaces:** 读真实已保存尾焰副本；修改倍率、保存到隔离浏览器、刷新读取；`__fw.exportFiles`内部导出PC/手机，实际回放按原检查器验证。

- [x] 默认1与4.9.104相同帧逐像素比较（镜头开/关、气流开/关）；拨动五项分别出图确认有效，其他模拟基准保持。
- [x] 原统一面板编辑、撤销/重做、还原、保存刷新；检查源存档SHA不变。
- [x] 非1样例完整导出PC/手机包、回放检查、连续播放及局部审看；报告记录版本/配方/指纹。
- [x] 构建、标准和推送门禁，按白名单提交，更新本对话/交接/看法并释放源码。
