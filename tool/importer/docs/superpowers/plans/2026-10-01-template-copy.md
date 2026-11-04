# 素材库与模板参数复制 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 在 D 盘现有单文件工作台补齐 FanGold / FanComet / FanSilver，可扩展素材库，并复制当前预览对应的 UE 子模板或父模板参数。

**新增用户要求（同一工作段）：** 制作子模板同时支持非扇形的升空＋爆炸资源段；可新建子模板、填写 ResourceId、控制各段时间/尺度/旋转/随机，并在延迟后显示爆炸。编辑器以输出数据为主要目的。

**Architecture:** `show-catalog.js` 管理来自只读 BP 快照和用户粘贴文本的素材；`show-text.js` 解析和输出 UE 属性元组；`show-plan.js` 消费素材配比；`show-ui.js` 接上新增、同步、命名、复制与下载。继续由 `build.py` 合并成同一路径的单文件 HTML，保留既有工具引擎。

**Tech Stack:** 原生 HTML/CSS/JavaScript、SVG、Python 生成器、Node/jsdom 隔离检查、现有 GPUECli 只读接口。

## Global Constraints

- 维护与交付位于 `D:\FXTools\DFWorkbench`；原始工具与 BP 资产不修改。
- 用户已要求一次性实装，继续当前会话执行；执行子技能本机未安装，沿用逐项实现和自审，不停下再次询问，不派子代理。
- 单点扇形支持可变数量、五种顺序、固定随机码；高度随机没有确认的原生字段，不能冒充 `PositionOffset.Z`。
- 用户的 FanGold 示例含 10 条 Entries 和 4 种资源角色；新增选项必须保留该对应关系。
- 复制的是预览已生成的时间、Roll 和尺度；对应原生运行时随机清零，避免再次随机。
- 素材新增只解析数据；从 BP 同步只调用 `/object/get`，不创建、修改、保存或触发 UE 资产。
- 项目私有源代码、资源名称、路径、BP 数值不发布到公共仓库；仓库只保留脱敏工作记录。
- 已有浏览器访问限制不绕过；隔离 DOM 检查不称为视觉验收。

---

### Task 1: 素材库与 UE 文本

**Files:** Create `show-bp-data.js`, `show-text.js`, `show-catalog.js`, `check-show-export.cjs`; Modify `show-plan.js`, `build.py`.

**Interfaces:** `ShowText.parse(text)` 返回纯数据元组；`ShowCatalog.profiles` 是可扩展字典；`ShowCatalog.add(subtemplate)` 返回新增键；`ShowCatalog.sync(subtemplates)` 返回新增与跳过数量；`ShowText.generate({mode,settings,events,profile,name,allowOriginalHeight,parentFilter})` 返回 `{text,record,heightOmitted}`。

- [x] 写隔离检查，先确认现有版本缺 FanGold 和复制按钮。

```js
assert([...profile.options].some(x => x.textContent === 'FanGold'));
assert(document.getElementById('df-pattern-copy'));
```

- [x] 从当前只读快照提取三套素材和父模板 Filter；检查所有 17 组的时间、资源、旋转、尺度、Filter 字段。结构元数据与 `_struct` 不进入复制字符串。
- [x] 实现受限 UE 文本元组解析器，拒绝重复属性、超长文本、非法数字、空资源、重复角度和多段时间；新增素材接受一个子模板，保持明确的单点单段使用范围。
- [x] 素材配比使用数组；排序后的源 Entry 为每个生成方向选择对应角色。FanGold 原 10 个角度与左右/中央角色按实际记录复现。

```js
const sourceIndex = count === 1 ? Math.floor(source.Entries.length / 2)
  : Math.round(index / (count - 1) * (source.Entries.length - 1));
```

- [x] 生成子模板 9 个字段和父模板 12 个字段，浮点 6 位；保留源位置、Pitch/Yaw、Filter 和轴比例；零运行时随机。父模板用 SubTemplate 引用、SlotIndex 0、RequiredPointCount 1。
- [x] 执行纯函数检查，核对原始示例、不同数量与顺序、字符串转义、父引用、高度不写入位置、错误输入不污染素材库。

### Task 2: 界面与保存

**Files:** Modify `show.html`, `show.css`, `show-ui.js`, `shell.html`; Test `check-show-export.cjs`.

**Interfaces:** 保持 `ShowComposer.init()/setActive(active)`；保持 `df.workbench.show.v1` 旧设置兼容，新增素材快照和命名设置；复制调用 `navigator.clipboard.writeText(text)`，失败才尝试 `document.execCommand('copy')`，再失败显示手动 Ctrl+C。

- [x] 选择器完整显示 FanGold、FanComet、FanSilver；旁边提供「素材库」折叠管理，支持粘贴 BP 子模板参数新增，并提供显式「从 BP 同步」。同步失败保留所有本地设置。
- [x] 在预览底部加「模板参数」区域，模板名、新增数组项/父模板粘贴位置说明、复制和下载 TXT；长文本折叠可手动选择。
- [x] 高度非零时显示「按素材原高度导出」选择，默认未选阻止导出；选择后明确仅复制时间/角度/大小。高度恢复零后自动恢复普通复制。
- [x] 命名和自定义素材分别保存；重启兼容已有两种模式设置。更改数量/方向/随机码立即更新字符串，不重新抽取预览随机。
- [x] 检查空白名称、非法表单、剪贴板成功/失败/降级、同名导出提示、素材持久化、同步只读与失败恢复。

### 新增 Task 2B: 非扇形资源段编辑

**Files:** Create `show-sequence.js`, `show-sequence-scene.js`; Modify `show.html`, `show-ui.js`, `show.css`, `build.py`; Test `check-show-export.cjs`.

**Interfaces:** `ShowSequence.make(config)` 返回 `{record,events,duration}`；`ShowSequenceScene.draw({scene,timeline,events,duration,byId})` 返回 `paint(time)`。`shape` 在制作子模板下选择 fan 或 sequence；现有 resource/template 设置兼容，另记 sequence 设置。

- [x] 写检查：默认升空在 0 秒、爆炸在 4 秒；改第二段时间立即反映在预览和 `LocalTimeOffset`。
- [x] 以现有完整子模板的资源段作初始值；支持「新建空白」、新增与删除段、每段 ResourceId/出现时间/大小，以及折叠的位置、旋转、纵向缩放与三类随机范围。
- [x] 大小和角度随机由固定码生成，角度作用到各段位置和朝向；爆炸高度随机只改变爆炸位置，绝不称为原生尾缀飞行高度控制。
- [x] 默认按当前固定组导出；每段随机位置、角度、尺度先取样后写实值，运行时随机为零。逐段展示原生对应字段，未知 ResourceId 不伪称已在 UE 验证。

```js
const sampled = { ...entry, LocalTimeOffset: config.start + entry.LocalTimeOffset };
sampled.RandomPositionRange = {X:0,Y:0,Z:0};
sampled.RandomRotationRange = {Pitch:0,Yaw:0,Roll:0};
sampled.RandomScaleRatio = 0;
```

- [x] 多段视图用简笔画表现升空、爆炸与时间点；改变爆炸延迟不暗改资源寿命。尾缀纵向缩放明确写入 `EffectScale.Z`，资源是否随之变高仍需 UE 验证。
- [x] 资源段可复制为新子模板，保存进本地素材库后可供父模板引用；提示先将子模板粘贴到 BP，再使用父引用。
- [x] 检查任意新增段、资源空白、删除、随机取样稳定、刷新保存、复制映射、只读同步与两个旧模式回归。

### Task 3: 生成与交付记录

**Files:** Modify `README.md`, `CHANGELOG.md`, `../使用说明.txt`, version markers; Create private `research/show-export-report.json`; sanitized repository progress only.

- [x] 运行 `python build.py` 生成同路径 v2.2；原文件 SHA-256 保持 `17bc3503c307a02200c5f48cf171d02ad582703f73078c8c673a29d8c7ae685b`。
- [x] 执行 `node check-show-export.cjs`、`node check-show.cjs`、`node check.cjs`、`node check-multi-textures.cjs`，失败修复后只重跑相关检查。
- [x] 可用时用 UE 只读反射核对字段，不为验证粘贴而改写 BP；记录原生文本解析接口不可用和没有真实粒子视觉验证的边界。
- [x] 更新 D 盘说明、备份位置和版本；核对桌面快捷方式仍指向同一 HTML，保存私有报告。
- [x] 在隔离工作树更新脱敏对话记录、交接与在线时间，fetch/rebase 后推送 main；归档本次工作树。

## 自审

用户三种现有素材、未来新增、复制 BP 格式、角色对应和当前预览一致均有对应步骤。前后接口名统一；无未知占位步骤。没有把高度变成发射位置，没有对真实 UE 视觉匹配作未经验证的承诺。

## 执行结果

26组新增检查、13组既有编排、29组工具、9组多贴图均通过。已生成同路径v2.2；原工具哈希未变，BP仍64760字节、修改时间2026-09-29 16:21:46。真实浏览器视觉/帧率、原生粘贴和粒子轨迹不属于已验证项；只读原生GetUpVector核实Roll正方向。结构没有独立的飞行高度或随机码字段，没有虚构这些字段。文件说明和本机报告已更新；公共仓库只推脱敏工作记录。

本地新增子模板额外记住编辑器中的Cascade时长，父复用保持原固定升空时长，把爆炸前等待单独显示。原生复制格式不含这份编辑器元数据，因此仅从BP文本重新解析时需由用户核实资源升空时长。
