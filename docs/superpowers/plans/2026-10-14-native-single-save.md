# 原生单层保存 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全套/物理/V5尾缀保存或另存后出现在我的效果；原生形态、参数及已有版本保留。
**Architecture:** myEffects支持现有single快照，原生单层通过原单层查看器打开，不转换为多层烘焙。旧人工单层版本按来源+名称+参数稳定标识恢复独立副本，同内容重复保存只恢复一次。名称和尺寸来源随副本记录，所有写入反馈区分浏览器、仓库和打开结果。
**Tech Stack:** JavaScript控制器、Node vm、现有Python构建/离线标准。

## Global Constraints

- 禁止强制修改outPC、form、模拟/渲染或艺术参数；不写UE、不删除旧记录、不新建目录。
- tool/src限定借用；100预留，23的97–99保留。file实页限制不绕行。
- 保存过程不改变当前输入；旧版本恢复不会自动写仓库或引擎。

### Task 1: single我的效果闭环

**Files:** `79_myfx.js`、`79_assetops.js`、`79_workbench.js`、`79_repo.js`、`79_library.js`。

- [x] 回归先失败：`wbSave(true)`对RT6S全套必须返回my效果，而不是往mySaves写版本；`openMyEffect(id)`保持master/emitset/seq；再次另存后原记录不变。
- [x] 使用`wbSnap()`已有single结构保存；`myApplySnap`按kind打开，`mySnap`只对combo遍历layers。列表按真实结构计算层数，repoRecipe接受校验后的single。
- [x] 保存中锁定重复点击；写入失败不声称成功，已经持久化而打开/仓库失败分别反馈。禁止多层的单层尾缀仍不允许加层。

### Task 2: 历史恢复与保存偏好

**Files:** 同上，`66_fwlcascade.js`的尺寸选择元数据函数。

- [x] 人工single版本稳定去重恢复，跳过draft/export；原mySaves/磁盘记录保留。repo读取旧非my源版本通过同一转换，不能把自动导出记录恢复成效果。
- [x] 保留`packNames.system`及尺寸来源/独立选择；副本尺寸选择不回写来源。参数快照逐字比较，重复刷新不生成重复副本。
- [x] 新回归`analysis/scripts/原生单层保存检查.cjs`接离线标准；实际Tiny快照只读验证、新旧保存/列表/读取回归，构建100、保护源及私有组件哈希核对并提交。

验证：21项本轮回归、17项保存身份及仓库读取通过；7修改JS语法/构建100静态0错误。旧标准离线5/7两项base/store桩缺失保留，不称全通过。实际两份Tiny快照保持；file实页/UE未验，原浏览器刷新后执行恢复。安全快进a0a45889，52其它JS及66数学保持，5私有源保护SHA保持。认领释放，23从101接续。
