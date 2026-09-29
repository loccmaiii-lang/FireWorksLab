# 升空尾缀 V5 主线接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 将用户确认喜欢的 TR2 小、中、大三档第五版升空尾缀加入最新 main 的正式库，并推送远端。

**Architecture:** 从 `analysis/results/TR2/RiseTrail_<S|M|L>.json` 保存的完整参数与颜色恢复已烘焙版本；正式库使用固定参数快照，三档基础默认值同步相关尾缀参数。复用现有循环、两档消散与导出流程，保持最新主线的物理实验类型。

**Tech Stack:** Python 3、浏览器 JavaScript/WebGL2、Playwright、Git。

## Global Constraints

- 用户批准的是第五版 TR2 S/M/L；不重新拟合或修改已认可的视觉参数。
- 保留用户已有的工作区修改与独立 `experiments/` 测试目录。
- 2K、16×1、RGBA 接力 64 帧；循环、30 fps 和 20 fps 消散均可导出；保留可选 4K 母版。
- 主线更新后须执行 `python tool/build.py`，验证后 commit、push。

---

### Task 1: 固定认可的三档参数与入口

**Files:**
- Modify: `tool/src/js/10_types.js`（trailS/M/L 名称与默认参数）
- Modify: `tool/src/js/15_replica.js`（TR2S/M/L 正式库固定参数快照）
- Modify: `tool/src/js/16_thumbs.js`（三档默认缩略图）
- Modify: `analysis/replica/尾缀_S_配方.json`、`尾缀_M_配方.json`、`尾缀_L_配方.json`

**Interfaces:**
- Consumes: TR2 的 `params`、`materialDefaults`、历史审阅缩略图。
- Produces: `replicaPM('TR2S'|'TR2M'|'TR2L') -> {P,M}`，状态为 `正式库`。

- [x] 逐档从历史导出 JSON 恢复完整正式配方；同步基础类型的 `tr*`、弹道、快门与贴图布局，精确保留小数。
- [x] 从第五版审阅数据保留两张对照缩略图；拷贝对应校准配方到 `analysis/replica/`。
- [x] 检查 `defaultsFor()` 与 `replicaPM()` 的相关视觉参数、完整 Ramp 都等于 TR2 快照。

### Task 2: 审阅元数据与主线构建

**Files:**
- Modify: `analysis/scripts/review_to_baker.py`（正式尾缀参考视频使用尾缀取景算法）
- Modify: `tool/data/review.js`（生成参考视频元数据）
- Modify: `更新记录.md`、`交接.md`、`PROGRESS.md`
- Modify: `tool/FireworkBaker.html`（构建产物）

**Interfaces:**
- Consumes: 正式库中 `base` 与 `video` 字段。
- Produces: 正式库可打开实拍参考；TR2 不在待审区重复出现。

- [x] 生成正式尾缀视频的跟拍取景信息，保留其他待审条目。
- [x] 记录用户批准版本、打开路径、验证范围；保留既有文档内容。
- [x] 运行 `python analysis/scripts/review_to_baker.py` 与 `python tool/build.py`。

### Task 3: 验证与推送

**Files:**
- Runtime evidence only: `analysis/local/输出/TR2_main_check/`（git 已忽略）

**Interfaces:**
- Consumes: 主线 HTML 的 `__fw.replicaPM`、`__fw.exportFiles` 与现有 UI。
- Produces: 三档预览截图、导出 ZIP、验证记录；远端 main 提交。

- [x] 在 Chrome/WebGL2 中打开三档正式库条目，检查页面错误、实际画面及参考视频路径。
- [x] 三档各导出一次 2K 循环 + 两档消散 + Ramp + Cascade 参数 + JSON，验证尺寸、RGBA 通道与非空帧、消散末帧低于可见阈值（3/255）。
- [x] 以同一渲染器烘焙 TR2 历史参数与正式参数，比较图像一致性。
- [x] 执行 `git diff --check`；仅暂存本次文件，PROGRESS 仅暂存本次行修改。
- [x] commit、push `origin main`，确认本地和远端提交一致；报告提交号与正式库入口。
