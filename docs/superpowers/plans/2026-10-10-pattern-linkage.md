# 编排模板与引用片段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 接通新建、固定版本保存、节目引用、双向定位和显式版本更新，让编排模板成为可复用来源。

**Architecture:** 在原 choreography 模型上增加纯函数应用层，保存及放置先在克隆状态中全部校验，再一次进入原撤销/保存管线。来源引用保持固定版本；新版本不自动改旧片段。库与检查器使用同一引用信息，无第二份节目数据。

**Tech Stack:** React 19、原 Vite 6 项目、Node 原生测试、DF v0.1.1 语义色、Phosphor 现有图标。

## Global Constraints

- 正式源 D:/FXTools/DFWorkbench/workbench/research/timeline-design-20261008；先8025、验证后同源单HTML。
- 覆盖 deliveries/烟花编排工作台/2026-10-10-v12/烟花编排工作台.html 和原ZIP；内容v14，不新建用户版本目录。
- 原252片段/1689事件/18花型原件、音乐、三档、ID、物理与tool/src不改；旧独立片段明确标来源缺失，不伪造252个模板。
- IndexedDB与离线v1键不改；演出保存/撤销/节目文件往返保留固定引用。
- 无UE写入、保存或实播。Product Design先实际截图；IAB连接不可用后使用已安装Chrome隔离qa节目。
- 当前没有两个superpowers执行技能；按用户明确“走查并修复”授权在本会话逐步执行，不派遣子代理。

### Task 1: 固定版本应用与互通

**Files:** 私有src/pattern-linkage.mjs、src/choreography-model.mjs、src/editing-model.mjs、tests/pattern-linkage.test.mjs。

**Interfaces:** `saveAndPlacePattern(state,draft,options)` 返回完整state、patternKey、savedTemplate；`patternInstances(doc,patternId)` 返回引用组；`patternLink(doc,cueId)` 返回固定版本、最新版、所在组；`updatePatternInstance(state,instanceId,key)` 显式整组替换。

- [ ] 写失败检查并执行 `node --test tests/pattern-linkage.test.mjs`。要求新草稿先保存再引用；失败不改变输入；相同固定版重复放置不增版本；新版本不自动改实例；整组升级及文件往返；复制片段不继承原实例分组。

```js
const placed=saveAndPlacePattern(state,draft,{anchorShowS:80});
assert.equal(placed.doc.cues.at(-1).choreographyRef,placed.patternKey);
assert(placed.doc.choreographyLibrary.some(p=>p.key===placed.patternKey));
assert.deepEqual(state.doc,before);
```

- [ ] 实现克隆事务：按规范化模板内容判断需否saveChoreography，再placeChoreography；保持callId、对齐索引、固定引用。升级先完整校验、保留节目时刻/段落/音乐绑定，同ID调用保留片段身份；拒绝缺失/不完整/独立修改的实例，不静默丢编辑。
- [ ] 用原模型验证文档/三档/引用；复制linked cue新instanceId，去除不可适用整组升级元数据。
- [ ] 测试通过后记录RED/GREEN和源文件修改前指纹。

### Task 2: 库、模板与片段导航

**Files:** 私有src/App.jsx、src/LaunchWorkspace.jsx、src/TemplateLibraryCompact.jsx、src/df-theme.css。

**Interfaces:** 原onSave/onPlace调用同一纯函数；模板检查器接收onRevealInstance，片段检查器用patternLink打开确切固定版本；版本选择保持库id选中。

- [ ] 新建按钮独占一行紧凑DF primary，完整“新建编排模板”，原hover/pressed/focus反馈与禁用原因。
- [ ] 区分未入库草稿/已保存vN，草稿保存及创建合并显式“保存模板并创建片段”；放弃新草稿返回原库，引用按钮使用真实保存版。
- [ ] 片段显示来源、版本、同组数量、返回模板；模板显示引用组/节目时刻/定位，固定旧版可查看/另存新版。显式升级只影响当前完整未独立调整实例，可撤销。
- [ ] 库保存新条目清筛选并露出选中；三档限制、原紧凑选择footer、全景布局保持。

### Task 3: 实页与固定交付

**Files:** 私有pattern-linkage-20261010、connection.mjs、原README/说明；公开tool/offline-workbench、稳定HTML/ZIP、本轮协作记录。

- [ ] Chrome隔离qa：新建→名称/点位→保存并创建→时间轴来源→返回模板→v2→显式升级→撤销→保存/刷新；旧独立片段显示真实未关联状态。
- [ ] 1366×768 /1920×1080验证新建和底部动作可达、焦点与窄栏中文布局；保存并亲眼检查每步截图。
- [ ] 执行 `npm run build` 生产核心和包装检查；维护旧文件before备份后覆盖原HTML及ZIP。校验原件、固定存储键与版本引用节目文件往返。
- [ ] 同产物在允许的8025静态HTTP验证；不重试已被审查拒绝file页，不将HTTP当双击验收。
- [ ] 只提交自己的稳定交付、通用模块和指纹/说明/协作；fetch/rebase安全推main，核对远端blob。释放认领，不覆盖主F或他方tool/src。

## Self-review

需求均落在上述三项；没有新增物理参数、另一套库或隐式全量升级。旧库三个是预置框架，不是模板数量上限；修复的是保存和引用闭环，新建实际入库后计数增加。
