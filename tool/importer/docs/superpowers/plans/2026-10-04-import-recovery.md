# 导入中止与版本管理状态修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 修复模块说明文字误写为UE属性，完整保存和添加新资产，并核对本次尾缀导入中止的实际状态。

**Architecture:** 私有工作台新增独立的导入实现文件，由现有build.py注入同名HTML。网页和本机验证脚本执行相同实现；分阶段保存，只在保存及磁盘核对成功后调用当前SourceControl提供者标记添加，读回真实状态。

**Tech Stack:** 单文件HTML、JavaScript、Python构建、UE 4.24原生反射及Python 2.7、现有Node隔离检查。

## Global Constraints

- 私有源码、工程目录、原生资产清单和日志只留D盘，公共仓库只记录脱敏结果。
- 原始copier HTML不改；其它复制器、配表与编排功能不改；快捷方式保持同一路径。
- 保留名称预览和显式确认、禁止覆盖已有目标、现有母材质和动态参数通道映射。
- 不改tool/src、不排效果重算、不重启编辑器、不代用户验收画质。
- 对本次部分生成的资产仅在来源、目标、实际进度一致时继续；不删除已有资产或覆盖其它工作。

---

### Task 1: 复现真实失败并修复模块映射

**Files:** Create `fireworks-import.js`, `check-import-recovery.cjs`; modify `build.py`, `import-backend.cjs`, `check.cjs`, `fireworks-plan.js`.

**Interfaces:** `loadBackend(api, log, {htmlFile})`提供`importOne(it)`、`importEmitters(it, PS, materialObjects, startIndex)`以及`saveCreatedAssets(it, entries, stage)`；网页只导出原有公共入口。

- [x] 把本次配置送入隔离反射模拟；当写入不存在的`note`属性时返回`failed_properties:['note']`，确认第三个发射器停止。
- [x] 模块循环只跳过格式定义的元数据，不吞掉其它未知字段：
  ```js
  if (prop === 'm' || prop === 'note' || prop === '_note') continue;
  ```
- [x] 使用实际反射字段`bUseInLocalSpace`，把`required.pivot_offset`转换成`ParticleModulePivotOffset`并加入Modules。
- [x] 检查真实生成的HTML，而非另一个隐藏修补的导入版本；覆盖完整10发射器、两条尾缀Pivot、局部空间以及未知真属性仍失败。

### Task 2: 分阶段保存、添加与真实反馈

**Files:** `fireworks-import.js`, `fireworks-ui.js`, `check-import-recovery.cjs`.

**Interfaces:** `it.importProgress={stage,saved:[],added:[]}`保留已确认的实际进度；错误携带同名进度，网页失败记录显示阶段及已保存数量。

- [x] 每组贴图设置读回后保存；每个材质设置读回后保存；粒子全部链接及数量核对后保存。
- [x] `SaveAsset`强制保存后用`os.path.isfile`及文件大小确认目标.uasset存在，再调用原生版本管理入口：
  ```python
  ok = unreal.SourceControl.mark_file_for_add(pkg)
  state = unreal.SourceControl.query_file_state(pkg)
  added = bool(state.is_valid and state.is_added)
  ```
- [x] 禁用版本管理时明确显示只保存；启用但不可用、添加失败、添加读回不一致或文件缺失时不得显示完整成功。
- [x] 加入失败检查：中途模块失败不保存半成品粒子、保存返回成功却缺文件仍失败、P4拒绝添加仍失败、没有说明文字的旧包继续工作。

### Task 3: 本次恢复与交付

**Files:** Create `research/import-failure-20261004/`诊断和恢复脚本；modify `README.md`, `CHANGELOG.md`, `../使用说明.txt`及公共脱敏对话记录/交接。

- [x] 保存源配置哈希、两个材质磁盘备份、内存中纹理/前两个发射器/失败第三个模块的完整属性快照，记录P4实际action。
- [x] 在修复后的同一实现上完成隔离检查后，仅当当前目标确认为这次任务的未完成资产时保留用户当前两个发射器的全部调整，仅补后8个；新导入仍完整转换Pivot；若前置核对不符则停止该恢复并报告。
- [x] 核对10发射器、GPU类型、Pivot、关键分布及材质引用，保存本次8个资产，逐个验证磁盘和P4添加状态。
- [x] 重建同名HTML至v2.6，运行导入、名称确认、多贴图和原工作台回归；记录真实核对范围，不把参数核对当作实际播放验收。
- [x] 更新说明并以脱敏记录交接，保留备份与旧任务状态。
