# ID选择与参数独立 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将资源表里的烟花ResourceId加入共用预设选择，选择只改ID，保留空白/自定义与用户手填参数，减少切换和导出的逻辑漏洞。

**Architecture:** 新增ShowResourceData只存ID、分类和平台；ShowResources规范化和去重、渲染带分类的原生选择器并原子替换只读同步结果。扇形和资源段共用ID组件，参数计划/导出沿用现有模块。模板库与ID库分开，旧草稿继续兼容。

**Tech Stack:** 原生HTML/CSS/JS、SVG、Python构建、Node/jsdom隔离检查、GPUECli只读datatable/search。

## Global Constraints

- 正式工具与私有源码在D:\FXTools\DFWorkbench，公共仅脱敏记录；不改共享烘焙器。
- 不改UE/BP/资源表，不执行写接口，不新增材质或引擎代码。
- ID选项仅来自本轮只读PC/手机ResourceFX表的ResourceId字段；数字行号和资产路径不能当ID。
- 预设无高度、大小、时间、随机或旧角度配比；选择ID只替换ID。
- 初始ID仍为空，手填保留，ID库离线可用，主动更新失败不损坏旧库或当前草稿。
- 浏览器file策略曾拒绝本文件，继续遵守，不通过别的通道绕过；隔离DOM体验与实际视觉验收分开。

### Task 1: 数据与失败检查

**Files:** Create `show-resource-data.js`、`show-resources.js`、`check-show-resource-ids.cjs`；私有原始只读结果在`research/resource-table-id-readout.json`。
**Interfaces:** `ShowResources.normalize(records)`仅接受{id,group,platforms}；`fromReads(reads)`从{platform,field,reply}提取data.matches[].ResourceId并验证PC/手机四路唯一结果；`replace(records)`原子更新；`get(id)`查存在性；`fillSelect(select,id,role)`分类并保留自定义；`snapshot()`序列化ID元数据。

- [x] 只读核对真实表、四路查询（ResourceId/FxSP × PC/手机）、备份编辑前HTML和源文件。
- [x] 先写新检查，运行旧版失败，再实现纯ID模块与共用选择器。

```js
assert.equal(document.querySelector('#df-pattern-resource-preset').value,'');
const before=JSON.stringify(state.configs.resource);
set('resource-preset',knownId);
assert.equal(state.configs.resource.resourceId,knownId);
// Compare every setting except resourceId/profile; no hidden scale/time imports.
```

### Task 2: 独立选择与交互漏洞

**Files:** Modify `show-ui.js`、`show.html`、`show.css`、`show-catalog.js`、`show-plan.js`、`show-text.js`。
**Interfaces:** `resourcePicker(stage,index)`组件由ShowResources.fillSelect构建。扇形切换更新configs.resource.resourceId并切回空白源；各段仅更新entry.FXResourceId，保留role/entry其余字段。`refreshResourceOptions()`只刷新选择器和提示，不重建设置，不改输入。

- [x] 扇形使用分类ID预设和可编辑实际ID；已保存的配方藏在独立模板选择，去掉三种只有名称的无效空选项。
- [x] 每个资源段同样可选预设或自定义；空白选择清ID、保留参数，改变用途不自动换ID；切换ID不套时长或高度。
- [x] 文本ID输入即时更新并清掉旧导出；自定义、未知、删除的ID保留原文，提示平台/表快照边界。
- [x] 显式更新ID列表四路只读查询，按钮防重入，全部成功才替换；同步只改ID元数据，失败保留；新素材追加时可选。
- [x] 模板参数同步明确独立，不把ID预设混成完整配方。修复体验复核实际发现的焦点、未应用配比、切换隐藏字段与空预览问题；补充v2.4空名称入口和无效ID草稿恢复。

```js
const reads=await Promise.all(requests.map(async r=>({platform:r.platform,field:r.field,reply:await rawApi('/datatable/search',r.body,15000)})));
const next=ShowResources.fromReads(reads); // throws before mutation on any failed/malformed reply
ShowResources.replace(next);
```

### Task 3: 交付

**Files:** Modify `build.py`、`shell.html`、`README.md`、`CHANGELOG.md`、`使用说明.txt`；Create `research/resource-ids-report.json`。

- [x] 升v2.5并同路径生成，保持原工具、命名引擎和快捷方式。
- [x] 从使用者角度在隔离DOM中走新建扇形、尾缀/爆炸两段、切换/清空ID、手填配比与未应用、刷新、已存模板、更新ID、失败和重新复制全流程；完整配方显示独立选中状态，空白选项可直接清掉组合ID。38组新检查和139组回归，共177组通过。未作真实浏览器视觉或粒子验收。

```powershell
python build.py
node check-show-resource-ids.cjs
node check-show-blank.cjs
node check-show-fan.cjs
node check-show.cjs
node check-show-export.cjs
node check.cjs
node check-multi-textures.cjs
node check-import-name-confirmation.cjs
```

- [x] 私有报告记录ID读取时间/覆盖、检查与边界；正常fetch/rebase/push脱敏记录（首版a36213c，最终76ced7b），保留其它对话更新并请求归档工作树。

## Self-review

覆盖真实ID预设、三类用途和额外烟花资源、空白/自定义、预设与参数分离、旧草稿恢复、独立只读更新、预览和复制一致以及非真实浏览器验收限制。本对话内继续实施，用户已明确要求改工作台。
