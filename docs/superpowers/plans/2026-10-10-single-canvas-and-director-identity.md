# 单画布草稿补全与导演身份校正 Implementation Plan

**Goal:** 恢复10月9日 authoring-proposal 已认可的单画布基础模板交互；明确场景名称与内部路径，解释子关卡更新。

**Architecture:** 基础预览只从当前固定花型推导只读对照，不改节目。导演发现读取 ActorLabel，内部路径继续用于精确寻址；蓝图检查提示其不自动更新关卡实例。

**Tech Stack:** React / Canvas / Node test / GPUECli（本轮只读）。本轮在当前会话逐项执行，不委派，不提交推送。

## 约束与验收
- 不改 tool/src、公共主题、当前音乐、R03节目或三表；不重置/重载关卡、不写UE。
- 保留后续已认可的紧凑模板列表；只恢复原稿遗漏的单画布、两模式、关联规格、全尺寸选择、高亮、网格与大坝参照。
- 未标定说明保留；花型尺寸不是基础资源固有尺寸，旧前台示例不冒充本节目已交付资源。

## 步骤
- [x] 在 `tests/basic-template.test.mjs` 补同一资源用于90m/30m花型、固定引用、原数据不变的回归；`tests/connection-identity.test.mjs` 复现 `_2` 标签/`_7` 路径错误。
- [x] `basic-template-model.mjs` 添加 `baseComparisonSpecs(doc)` 返回当前花型的尺寸、高度、资源ID；不读取历史未引用版本，不写数据。
- [x] `BasicTemplatePreview.jsx` 改一个canvas，`view`切换比例/原始；关联规格和全尺寸按钮只更新本地选择。独立 `basic-preview-renderer.mjs` 按统一米尺绘制。
- [x] `connection.mjs` 使用 `ActorLabel` 作为实例显示名称；`DirectorTargetPicker.jsx` 保留完整路径及内部名说明；`EnginePanel.jsx` 明确蓝图/实例作用范围。
- [x] 8025检查实际入口、两模式与选中、原生资源信息、花型层/扇形/编排/节目/交付功能；记录原稿对照矩阵。必要模型测试后 `npm run release`，保存截图、核对R03文件哈希。

## 回归要点
`assert.equal(target.name,'BP_Failed_NewYearFireworks_ShowDirector_2')` 且 `target.path` 仍以 `_7` 结束；两个花型共用资源ID时对照中保留两个不同直径；比较选择不得改变源文档。错误资源尺寸不得生成推测圆圈。成品与开发版一致，实例导入仍需用户确认及UE保存关卡。
