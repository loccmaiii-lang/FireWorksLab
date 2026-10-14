# 派生规格首次导入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 派生规格首次导入允许创建原名称共享贴图，后续复用有保存证明的相同内容，禁止覆盖无法核验的同名目标。

**Architecture:** 仅改本机独立交付适配器及其构建注入。复用现有内容指纹、保存证明、逐资产范围和批次所有者；失败计划不参与可执行批次的碰撞检查。私有源码与素材仅留本机。

**Tech Stack:** JavaScript、Python、本机隔离 Node/JSDOM 回归。

## Global Constraints

- 不新建目录，不写入或删除 UE 资产，不自动确认或执行导入。
- 原工作台和原源 HTML 保持哈希不变；不改 tool/src、艺术参数、正式库、平台命名、压缩、版本管理政策。
- 未保存、错误类型、文件存在但无法加载、证明缺失或已变更的同名目标均拦截；选中源缺失不靠改序号规避。

### Task 1: 首次创建与复用

**Files:** 本机 delivery-contract.js、build-delivery.py；新隔离 check-delivery-derived-first.cjs；公开只提交本计划及脱敏记录。

**Interfaces:** `planTextureReuse(item, planned)` 保留现有 `item.textureReuse`；只读探针返回 `{key,pkg,exists,saved,class}`，候选需完整对应请求。

- [x] 先运行失败测试：派生且目标完全不存在应通过，而原实现抛缺指纹；本批次第二包复用第一包。
- [x] 仅选中及必须依赖的贴图参与检查：`new Set([...selectedAssetEntries(item).map(([k])=>k), ...selectionDependencies(item).map(d=>d.key)])`。
- [x] 缺复用证明的目标只读核对对象和磁盘：`if (target.exists || target.saved) throw Error(...)`；两者均不存在且选中时保留现有创建流程。
- [x] 原生执行前再次核对这些首次创建目标，防止检查后出现同名文件。
- [x] 失败计划排除批次写入碰撞：`proposals.has(r.id) && !proposals.get(r.id).errors.length`，真实可执行计划冲突保持。

### Task 2: 部署与验收

- [x] 运行缺失/已存在/磁盘残留/类型错误/证明正确/证明失效/范围取消/批次复用/真实内容冲突/执行前变化的隔离检查。
- [x] 构建独立入口并部署现有 runtime；原 HTML 哈希保持不变。
- [x] 对用户包做只读真实预检，核对两平台就绪、共用贴图单写、粒子目标区分；不替用户确认或导入。
- [x] 白名单提交脱敏记录及交接，私有源码不上传。

执行与限定预检完成；完整UE导入、实际播放和用户验收尚未进行。
