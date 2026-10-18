# 多层手机导出冲突提前定位 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 手动三层手机序列冲突在进入资源交付和重烘前说明并定位，保留用户选择，合法方案仍可导出。

**Architecture:** 复用comboMobilePlan/layerMobileUse计算当前有效选择，只读识别已烘好且未过期的大序列层重叠；产物表显示同一结果。exportCombo先检查，冲突时打开交付清单并聚焦手机下拉，不进入资源交付。最终packGateJSON继续作为权威检查，不改阈值，不改图像或配方。

**Tech Stack:** 原生JavaScript、Node VM回归、Python标准/门禁、现有HTTP8034和浏览器。

## Global Constraints

- 手动选择保持，不能为过检查自动删除金锦/星头；自动仍走原方案。
- 手游同时一张大序列、M包最多3发射器、最大1024；不放宽现有规范。
- PC/寿命/速度/入出点/网格/颜色及UE资产保持。
- 只读预检不拿过期缓存作结论；精确分页数量仍以最终包检查为准。
- 沿用交付清单和手机下拉，不增入口，不改私有导入器。
- 主F盘仅有他方未跟踪文件，按白名单提交；在现有授权下直接执行，不等待额外计划审批。

### Task 1: 可复现回归与只读冲突判定

**Files:** 新增analysis/scripts/mobile_export_preflight_check.cjs；修改tool/src/js/67_fwlcombo.js；接入analysis/scripts/标准检查.py。

**Interfaces:** comboMobileConflicts(xs)输入现有[{L,b,e}]，输出重叠层号列表；comboMobileConflictText(xs)返回中文说明或空串。

- [x] VM加载实际67_fwlcombo与exportCombo：构造三层master分页1+2+2、rate1.5，全部手动seq，记录期望在beginExport/bake/pack之前阻止。
- [x] 跑新增检查，确认旧版缺少预检且已进入资源交付。
- [x] 只对master/segments、有效kind=seq、无过期缓存的层取layerMobileUse时窗，两层重叠超过1ms就合并层号；返回说明，不写L/P/b。
- [x] 覆盖自动/手动混合、明确off、不重叠、接缝舍入、过期/缺缓存、单层分页及不变性；不按PC分页数提前拒绝手机。

### Task 2: 真实入口与产物表反馈

**Files:** 修改tool/src/js/70_ui.js仅exportCombo；tool/src/js/79_workbench.js的renderDeliv/prodTableHTML。

**Interfaces:** 共用comboMobileConflictText；curLayerBakes提供现有缓存，toggleDeliv打开原产物表。

- [x] exportCombo在busyCan和captureExportJob之前计算冲突；有冲突打开原交付清单、flash原因、聚焦涉及的手机select并return。
- [x] 产物表用role=alert显示具体层、规范原因、自动可能省层的取舍；导出按钮灰显相同原因。
- [x] 改现有手机下拉即可重算并恢复；不要写mobileManual或替用户改层。
- [x] 原HTTP页真实点击三层手动序列→提前阻止，保存刷新保持手动选择；改为原自动后真实导出PC/手机、检查规范与文件。

### Task 3: 发布与回执

**Files:** tool/src/js/10_types.js、tool/CHANGELOG.md、协作/交互宪章.md、构建产物和自身记录。

- [x] 版本4.9.117，记录只改校验/反馈、不会合并手机三层。
- [x] 原模板与试配PC贴图/参数不变证据、默认六模板及必要回归；标准新增检查、构建和完整合入门禁通过。
- [x] 保留实际失败/成功证据到analysis/results/MOBILE_EXPORT_PREFLIGHT_20261019，记录未做UE写入。
- [ ] 正常pre-push通过后释放源码占用并补推回执；当前F盘真实入口已是117。
