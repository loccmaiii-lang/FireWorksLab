# 分层粒子图固定取景修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让窜天猴和仙女棒能在输出中直接调整固定取景，减少留白，同时保持运动、米制尺寸及喷口锚点正确。

**Architecture:** 复用已有 `sparkGraph.bounds=[左,右,下,上]`，不新增另一套裁切参数。仅SparkGraph计划支持横向偏心，中心透传现有渲染/回放，Cascade Pivot同步；旧对称框默认逐像素不变。现有候选只修改取景，用户存档不覆盖。

**Tech Stack:** 现有原生JavaScript/WebGL、Python条目与标准、Node/Edge正式HTTP自动检查。

## Global Constraints

- 主工作区F:/FireWorksLab，当前4.9.117；认领4.9.118，源码只有本任务主代理编辑。保留他方overdraw_run.mjs等所有改动。
- 不改粒子出生、寿命、运动、随机、快门、亮度、颜色或周期；不写UE、材质、私有导入器。
- PC单格≥512、手机≥256，各64帧30fps；永远不勾NeverStream，沿用主序列NoMip与DistantVFX规范。
- 固定全周期矩形，不做逐帧紧裁；不新增自动收紧、拖拽裁框或可视化编辑器。

### Task 1: 修复已有四边控制与输出锚点

**Files:** `46_graph_model.js`的SCHEMA、`46_graph_render.js`的graphPlan、`40_gl.js`的centerAt/bakeView/squareView、`66_fwlcascade.js`的fwlMaster/计划签名、`65_cascade.js`的文字说明、`60_export.js`的诊断元数据，参数命名表/发射器表及必要生成文件。

**Interfaces:** 输入完整P/M，沿用bounds数组；输出计划cx/HX/Ww/px与现有cy/HY/Wh/py；世界重建 `x=cx+(u-.5)*Ww`，Cascade `pivotX=-.5+cx/Ww`、`pivotY=-.5-cy/Wh`，InitialLocation保持0。

- [ ] 建失败回归：`[-2,6,-4,1]`应是8.16m宽、cx=2，不是12.24m宽；两边独立调整真实生效；默认对称框计划/像素保持。
- [ ] 四边归到统一「输出→取景」，保留键、数值/滑杆、还原/撤销/保存；说明全周期固定取景、不是改变运动或整体缩放。
- [ ] graphPlan只对SparkGraph按`cx=(左+右)/2`与`HX=(右-左)*.51`计算。centerAt按`[(cx||0)*sx,cy*sy]`；缺省cx=0不变，普通loopPlan不动。
- [ ] fwlMaster Pivot同时认cx/cy；补实际手填/诊断X字段。核对只换图的计划签名守卫，将影响尺寸/Pivot的取景变化确实识别为需要更新发射器参数，不放宽旧守卫。
- [ ] 版本118、参数变更记录/交互宪章/CHANGELOG与构建；针对缺省、非对称、组合、保存刷新、两平台配置通过。

### Task 2: 核对更紧候选与交付

**Files:** 原SGR1/SGS1条目数据（只改bounds）、`analysis/results/GraphFraming/`的完整参数/实包/对照/报告；必要状态、生成入口及记录。

**Interfaces:** 已修复的同一P/M→实际RGBA素材包与cascade.json；测完整64帧低亮和标准阈值的二维包围范围，记录米制面积/两方向利用率与像素密度，既有裁切/过曝规则不变。

- [ ] 对照用户主尾焰、粒子版、柔层及SGS1；从整段像素并集确定可收范围，不删除弱火星/柔光，不按三张静帧猜边界。
- [ ] SGR1/SGS1仅调整可证明安全的边界；如果某方向已经需要所有空间就保留，不为减少黑底裁掉有效火星。用户存档原文件SHA保持。
- [ ] 原始/收紧各实际PC/手机包与世界比例对照；运动抽样一致；喷口/轨迹按各自尺寸和Pivot还原对齐，不强制三层使用同尺寸。
- [ ] 真实统一入口打开、改四边、撤销、保存刷新、导出及连续三周期；标准/实包回放通过。UE实播明确未验。
- [ ] 必要默认/六模板/已通过和当前候选回归、正常合入门禁；白名单提交推送、记录结果并释放源码。

执行在当前授权内继续；只读审查与专属测试可并行，生产源码不委派多人同时编辑。
