# 导演三表花型命名实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> 本任务已授权执行，直接在当前对话落实；未安装上述技能，不另开对话或改动工具设计。

**Goal:** 子模板用真实花型名，父模板及全部时序引用使用花型名开头，让 UE 搜 Lime 能找到调度名称。

**Architecture:** 在唯一三表编译器完成去重后，原子替换子模板、父模板和所有引用名称。独立纯函数保留数组顺序及全部原生数值，命名映射进入交付审计；固定配方内部版本键保留，避免破坏节目历史。

**Tech Stack:** Node.js、ES modules、node:test、现有 React/Vite 工作台及本机 UE gpcli。

## Global Constraints

- 本对话只做编排业务，不改交互设计、布局、画布、样式。
- 当前节目 R03、音乐偏移10秒、点位从0开始；本次只改名字和引用，不改变发射时刻、资源ID、角度、高度、缩放、延迟或点集。
- 子模板示例 `GoldChry`、`Lime`；父模板格式 `GoldChry_P_C001_01`，依次为花型、区域、片段编号、同类序号。
- 不合并不同固定版本；扇形束数和扫射方向体现在花型名中。名称在 UE FName 忽略大小写规则下唯一。
- 已长期授权直接提交推送；只提交本任务文件，保留其他对话和用户改动。

### Task 1: 原子命名和可搜索引用

**Files:**
- Create: `tool/workbench/src/director-naming.mjs`
- Modify: `tool/workbench/src/director-model.mjs`
- Test: `tool/workbench/tests/director-naming.test.mjs`
- Modify: `tool/workbench/tests/director-source.test.mjs`

**Interfaces:**
- Consumes: `{EffectSubTemplates, EffectTemplates, EffectScheduleGroups}`，原生条目使用 `FXResourceId`、`SubTemplateName`、`TemplateName`。
- Produces: `nameDirectorArrays(input) -> {arrays, audit}`；`audit.subTemplates`、`audit.templates` 每项为 `{from,to}`。`audit.scheme='effect_group_cue_variant/1'`。

- [ ] 写引用闭包及完整播放展开等价测试，再运行确认缺实现失败。

```js
const before = resolveCalls(input);
const {arrays,audit} = nameDirectorArrays(input);
assert.deepEqual(resolveCalls(arrays), before);
assert.equal(arrays.EffectSubTemplates.find(s => s.Entries.some(e => e.FXResourceId.endsWith('_Lime'))).TemplateName,'Lime');
assert.ok(arrays.EffectScheduleGroups.flatMap(g=>g.Slots).some(s=>/^Lime_P_C018_\d+$/.test(s.TemplateName)));
assert.deepEqual(nameDirectorArrays(arrays).arrays,arrays);
```

- [ ] 实现命名：从资源ID去掉 `P_EFX_FireWorks_` 前缀和数字后缀；球花尾缀不参与主花型名；纯尾缀使用 TrailSmall/Medium/Large；扇形按束数与有序条目时间识别 Left/Right/Center。重名保留独立子模板，以 V02/V03 后缀区分。父模板从引用花型、实际分组、原 C 编号、01 起序号组成；混合父模板连接完整花型名。
- [ ] 编译器去重后在无阻断问题时统一应用；更新 mappingAudit.exportName 和 templateNaming。缺映射仍返回既有阻断结果，不能变为异常或假交付。

```js
const named = issues.length ? null : nameDirectorArrays(arrays);
if (named) Object.assign(arrays,named.arrays);
const exportedNames = new Map(named?.audit.subTemplates.map(x=>[x.from,x.to]) || []);
```

- [ ] 运行 `node --test tests/director-naming.test.mjs tests/director-source.test.mjs tests/fixed-director.test.mjs`，覆盖不同版本、大小写冲突、混合模板、R03三档展开完全等价。

### Task 2: 发布、实际交付、记录

**Files:**
- Modify: `tool/workbench/src/connection.mjs`、`tool/CHANGELOG.md`
- Modify: `FXtools/节目/NewYearFireWorks_v01/三表-R03-{high,medium,low}.json`
- Modify: `协作/编排工作台最新规范与Claude接续_2026-10-09.md`、`协作/状态清单.json`、`对话记录/对话框24.md`、`交接.md`
- Create: `tool/offline-workbench/director-naming-audit.md/json/png`
- Generate: `npm run release` 管理的 HTML/ZIP/发布清单。

**Interfaces:**
- Consumes: Task1唯一编译器的语义命名三表；现有 `自动导入 UE` 双目标导入器。
- Produces: v16.0.8，本机8025当前节目生成、复制、下载和自动导入相同命名；正确导演_2蓝图默认值和对应场景实例读回完全一致。

- [ ] 更新规范和版本；旧三表本机备份后，仅替换三档名称及审计映射。
- [ ] 运行 `npm run release` 完成核心/包装/Python发布检查，核对稳定离线文件相同SHA。
- [ ] 在8025刷新当前节目，打开交付的完整JSON确认22子模板/62父模板/149时序及全部新名称；可读DOM获取三表，不读取隐藏应用状态。
- [ ] 备份导演_2 CDO及所属场景实例；从实际交付按钮导入，保存蓝图；读回完整三表比对本轮输出，其他配置不变。场景关卡含用户其他改动，不替用户保存整个子关卡。
- [ ] 保存真实入口截图、名称映射和读回证据，区分已导入/已保存与尚未UE实播。
- [ ] 检查范围，`git fetch origin` 后仅加入本任务文件，提交推送并核对远端SHA。

自评：所有本轮要求均由以上两任务覆盖；不另编音乐、不改UI、不改原生配方。性能、UE实播和艺术验收仍属原有待验事项。
