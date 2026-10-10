# 恢复基础模板原视图 Implementation Plan

**Goal:** 按用户截图恢复基础模板原五组规格示意与之前的交互呈现；本对话此后仅做编排。
**Architecture:** BasicTemplatePreview.jsx恢复本轮修改前的Git HEAD原组件；保留独立数据层的当前ResourceFX引用与R03节目。节目备份入口恢复原文案和完整内容，仅保留按展开生成的性能修复。
**Tech Stack:** React、现有发布脚本、8025实际页面。

## Global Constraints
- 不改节目、资源表、三表与UE；不撤销音频播放修复；不改其他对话的工作。
- 用户要求恢复原交互，本轮不做新设计、不增加新界面文案。
- 本对话后续只做编排，未经用户明确要求不改视图或交互；提交前确认。

## 恢复与验证
- [x] 备份本对话修改前组件，BasicTemplatePreview.jsx用git show HEAD:tool/workbench/src/BasicTemplatePreview.jsx恢复原文；去掉programmeScaleExamples及对应已撤销需求的测试，保留基础库来源测试。
- [x] ProgramPanel.jsx恢复“查看完整备份内容”和“完整节目备份”、makeBackup(state,seed)；保留showBackup条件，避免折叠时生成音乐大文本。
- [x] 工作台16.0.3，记录恢复范围，npm run release跑现有检查并更新固定F/D入口。
- [x] 8025打开基础模板，确认上下两区、五组规格与原布局；R03仍149片段/410次，节目文件及三表哈希不变，保存截图。
- [x] 对话记录记下本轮结果与长期范围；不提交、不写UE。

本轮直接按用户授权执行，执行技能不可用，不派子代理。
