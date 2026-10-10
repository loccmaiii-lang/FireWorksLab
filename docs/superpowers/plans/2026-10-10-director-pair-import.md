# 导演蓝图与实例交付一致性 Implementation Plan

**Goal:** 修复当前导演蓝图17项旧库与场景22项新库分裂，并让既有交付检查及回执覆盖实际涉及的两个对象。

**Architecture:** 用引擎返回的完整class路径确定实例所属蓝图，不按ActorLabel猜。选择实例时检查其CDO；选择蓝图时只接受零个或一个同类同DirectorId正式场景实例，多实例要求利用现有选择入口指定实例。沿用原确认、备份、读回和保护其他配置，不新增布局。

**Tech Stack:** JavaScript纯引擎适配模块、Node test、React既有交付右栏、本机GPUECli。

## Global Constraints

- 当前8025/R03节目为修复来源；不打开R04、不修改粒子、点位、平台准入或用户节目。
- 仅默认导演_2与它的正式场景实例；Engine/Transient、REINST、SKEL对象排除。
- 所有待写对象先备份并重读，不在播放中写；并发变化阻止写。完整核对原生FXResourceId和三表，不以名称或数量代替。
- 无UI布局/样式修改；项目长期免询问提交授权持续适用。本对话直接执行，不派子代理。

### Task 1: 目标识别与双目标导入

**Files:** 修改tool/workbench/src/engine.mjs、EnginePanel.jsx、DirectorTargetPicker.jsx、connection.mjs；新增tool/workbench/tests/engine-pair.test.mjs。

**Interfaces:** `readDirector(value,options)`附带`relatedTargets:[{target,config,active}]`；`prepareImport`附带同节目`relatedPlans`；`executeImport(plan,options)`回执附带逐对象路径、核对与保存状态。

- [x] 新增反例：选场景时其CDO仍旧；选蓝图时场景仍旧；只写一个不能满足双目标一致。测试先失败。
- [x] 依据实例class完整路径读取CDO，依据GeneratedClass筛正式场景；同DirectorId校验，歧义阻止。
- [x] 全对象预检后依次写；已有正确对象跳过写。写后完整核对两端，只保存蓝图，场景标需保存子关卡。非超时失败只恢复能确认由本次导致的变更。
- [x] 现有确认/备份/状态文案显示范围及逐对象结果；不增加页面或控件。更新版本与CHANGELOG。

### Task 2: 真实修复与交付

- [x] 实读确认：导演CDO17/43/252且原生资源缺三项；场景22/62/149含三项。独立模板BP另17项。
- [x] 保存两端原配置到本机恢复点；从R03三表准备，复核当前场景与R03完整一致后更新旧CDO并保存；两端读回及资源集合逐项相同。
- [x] 发布必要测试，8025真实入口检查，保留截图与双目标JSON证据。
- [x] 纠正旧报告检查对象边界；更新记录/状态/交接，精准提交推送，核对远端SHA。UE视觉实播不冒称已验收。

实际结果：CDO由17/43/252变为22/62/149，场景已正确未重写。第一次写请求15秒超时后只读确认已执行，补写入/保存120秒等待与超时恢复回归；8025重新检查跳过两端配置，只保存蓝图，真实回执与最终原生读回通过。137核心/38包装/5Python通过。报告tool/offline-workbench/director-pair-import-audit.md，UE实播及用户验收未做。
