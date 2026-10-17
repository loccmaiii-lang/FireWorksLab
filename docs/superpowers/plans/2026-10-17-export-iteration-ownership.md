# 同名导出迭代与旧交付状态修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. 本轮用户已要求执行；在当前会话逐项完成，不分派代理。

**Goal:** 明确处理 GlitterChry 与旧 GlitterChry_D150 的同名资产，导出失败不再让旧 RiseTrail_Hero 冒充本次目标。

**Architecture:** 源 ID 相同仍是正常更新；源 ID 不同而同名不同内容时，不能按名字猜血缘，由现有应用对话框明确选择本次迭代。授权绑定当次目标、原来源、旧/新内容指纹；保存在交付回执，导入只认匹配证据。仅检查 Cascade 真正引用的资产，检查图不参与 UE 冲突。

**Tech Stack:** 原生 JavaScript、Node VM 回归、Python 交付契约检查、现有单文件构建。

## Global Constraints

- 保留手动英文名，不添加尺寸或 02 后缀；不改配方、模拟和像素。
- 不删除历史交付，不自动覆盖 UE，用户仍在导入器核对/确认/执行。
- 不新增目录；不读取被禁止的 file:// 页面或浏览器私有存储。
- 保留本机 27 项未提交改动，尤其彩千轮 EventInstances 4.9.111；只提交本轮增量，版本使用 4.9.112。

---

### Task 1: 导出/导入归属契约

**Files:** `tool/src/js/63_gate.js`、`60_export.js`、`67_delivery.js`，`tool/local_delivery/fx_gate.py` 与相邻测试。

**Interfaces:** `packFinalize(files, options)` 保持原返回值，冲突错误携带结构化指纹；`makeZip(files, job)` 在纯归属冲突时调用现有 `askConfirm`；迭代证据跟 ZIP/回执传递，不写当前编辑器状态。

- [x] 编写失败检查：跨来源同名未确认仍拒绝、明确确认后可导出、取消不发布；标准错误不能通过确认绕过。
- [x] 验证原实现失败：`node tool/local_delivery/test_export_iteration.cjs`。
- [x] 实现最小规则：`approved.some(x => x.file === file && x.before === oldSHA && x.after === newSHA && x.sourceKey === oldSource && x.resource === oldName)`；来源相同可直接更新。
- [x] 检查图不作资产冲突；授权后历史/来源变化必须重新拒绝；授权不能跨导出复用；Python 入口验证相同旧/新指纹。
- [x] 运行新增检查、既有导出快照/命名/失败状态回归、Python gate 回归；用真实旧回执与金曜菊-B存档验证来源判断，不发布包。

### Task 2: 清楚呈现与发布

**Files:** `tool/src/js/67_delivery.js`、`10_types.js`、`tool/CHANGELOG.md`、`协作/交互宪章.md`、`更新记录.md`、`tool/FireworkBaker.html`、本对话与交接记录。

**Interfaces:** `beginExport(destination, targetName)` 保存当前导出目标；失败状态明确当前失败名与上一次成功名/修订，旧清单继续不可执行。

- [x] 失败状态回归同时断言本次 GlitterChry、旧 RiseTrail_Hero 和旧修订，重连不能恢复旧清单执行权限。
- [x] 提示只在真实跨来源冲突时出现，使用现有对话框和固定主动作；不自动替用户认领旧资源。
- [x] 构建原 F 盘入口：`python -B -X utf8 tool/build.py`，记录静态检查和版本。
- [x] 白名单暂存本轮增量；成品与源码一致，8034完整门禁和8025加载检查通过；保留其他本地工作。最终推送以对话框5/Git为准。
- [x] 写明完成与未验证边界：CPU/契约验证不冒充用户实页点击或 UE 实测；释放认领。

### 2026-10-17 HTTP验证与推送接续

用户重申8025/8034测试授权，沿用本计划执行；此前未推送是误扩大file访问限制。合入门禁与界面子入口修正HTTP地址解析，Windows默认8034，HTTP内容须匹配待测构建；6项入口回归通过。完整门禁18类/195行、界面8/8通过，生产迭代确认取消/继续均通过；未真实发布或写UE。待正常pre-push执行后记录远端提交。
