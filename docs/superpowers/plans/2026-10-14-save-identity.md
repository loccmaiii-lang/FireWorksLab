# 保存与资产身份修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 保存操作绑定当前资产，提供可见结果；显式保存的英文名不自动添加尺寸后缀。
**Architecture:** 保持浏览器存储和烘焙结构。统一正式库打开入口；明确当前清单对象，异步截图切换时取消。名称记录增加最终系统名，自动生成与显式保存分开，所有导出入口使用同一名称。
**Tech Stack:** 现有 JavaScript、Node vm 隔离回归、Python 构建及离线标准入口。

## Global Constraints

- 不改模拟/渲染/参数，不迁移存储，不改用户配方或 UE。
- 不新建目录；公开源码和本机私有导入器边界不变。
- file实页工具禁止读取，不使用替代入口绕行；模型验证不当作实页验收。

### Task 1: 资产身份与保存反馈

**Files:** `72_picker.js`、`79_library.js`、`79_workbench.js`、`19_thumbsvg.js`、`61_naming.js`；回归 `analysis/scripts/保存身份检查.cjs`。

- [x] 先使断言失败：`openType('rep:STROBE')` 后 `wbKey()` 必须是新条目；`setPackNames` 遇到 `store.set===false` 返回 false，原数据不变。
- [x] 正式库打开通过 `openFormal`，清单记录 `stage2.delivKey=wbKey()`；过期表单不能保存到新对象。截图前后对象键必须一致。
- [x] 名称与缩略图按钮附近显示等待/成功/失败；失败保留输入，成功才重绘，提示不被烘焙进度立即覆盖。

### Task 2: 手动名称与导出一致

**Files:** `61_naming.js`、`60_export.js`、`67_fwlcombo.js`、`70_ui.js`、`90_events.js`、`18_multitypes.js`、`79_assetops.js`、`79_repo.js`。

- [x] 先复现：`packSysName('Strobe','strobe',{id:'cls:d:dam:90',picked:true},'Strobe')` 应为 `Strobe`；未手动指定仍按旧派生规则为 `Strobe_D90`。
- [x] `packNamesFor` 返回 `system`；手动保存持久化完整系统名，旧已保存名称依用户新指令作为完整名称，程序初始化用空 system 保留自动命名。
- [x] 单层/组合/单束/批量导出及交付标题使用 `packSysName(...,nm.system)`，继承与仓库读取保留 system。名称区域展示同一最终系统名。
- [x] 将回归接到 `标准检查.py --ui-state-only`；构建95，检查成品与源版本一致，其余源码相对基线不变，写记录并推送。

验证边界：17项本轮回归、仓库读取与既有导出/导航通过；构建4.9.95静态0错误。原离线标准5/7两项base/store缺失仍失败（继承既有证据），本轮未新增。file实页安全限制未绕行，未完成真实GlitterChry点击/视觉/UE验收；不称用户已通过。
