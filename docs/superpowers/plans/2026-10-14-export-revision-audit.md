# 导出修订与同名迭代 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 同一交付资源另存为个人配方后可正常迭代；失败旧修订不可误执行，成功清单仅来自本次完整修订。
**Architecture:** 保留编辑器sourceKey追踪，同时以交付资源名为稳定归属；只有同一交付资源可替换内容，其他资源碰撞仍拦。导入保存证明与显式更新配合；旧回执保留，不伪装当前产物。
**Tech Stack:** JavaScript控制器、Python门禁、隔离模型/配置回归。

## Global Constraints

- 不删除用户素材/UE资产，不代确认或导入，不改艺术参数、模拟和渲染。
- 不新建持久目录，既有修订不可变；不同交付资源同名不同内容仍拦。
- 只临时借用63_gate.js、67_delivery.js、10_types.js版本行，其他tool/src保留23认领。

### Task 1: 归属与同名更新

- [ ] 用同一交付名、不同sourceKey复现误判：`packGateClash(png, known, 'my:new', 'Existing')`应无错误；资源名不同仍有错误。
- [ ] `packFinalize`从配置`naming.system`识别交付名；`knownTextures`记录资源名且以最新修订优先。服务器门禁用资源名与旧登记对应的修订索引核准归属。
- [ ] 私有派生更新仅显式`mode==='update'`且旧目标有有效保存证明时允许内容更新；缺失/脏/变化目标仍拦，执行前再核查。

### Task 2: 当前修订与删除结构

- [ ] 失败显示`本次未导出；下方为旧修订`并屏蔽旧清单操作；重试成功后解除，保留旧历史。
- [ ] 当前layers去掉对象时，`fwlCombo(name, currentLayers)`不能输出旧层；`namingSheets`从两页减一页后不能有02。
- [ ] 分张02与图层序号说明根据来源字段呈现，不能声称用户当前草稿已核验。
- [ ] Node/Python相关回归、受保护源码逐字节不变、构建4.9.94及现有入口部署；记录尚未实页/UE导入验收。
