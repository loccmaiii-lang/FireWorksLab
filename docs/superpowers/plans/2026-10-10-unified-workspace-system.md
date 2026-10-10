# Unified Workspace Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> 本会话按用户已有授权直接顺序执行第一阶段；不额外派子代理。上述执行技能不在当前技能目录中，使用现有文件/检查工具逐项落实，不因缺少辅助技能停止已授权任务。

**Goal:** 同一交互宪章覆盖三个工具，提供可运行的共用设计基础与状态样板，并明确指定目录导出、既有导入器复用及编排资源消费的实施边界。

**Architecture:** 共享基础使用离线 JSON tokens → CSS 生成与前缀化原生组件；生产工具分区消费。资源联动采用独立本机文件适配器，接收现有最终 ZIP 内部传输并发布完整目录/索引回执；导入器保留现有私有执行链路与交互，编排读取资源索引并固定版本引用。

**Tech Stack:** Python 标准库生成/文件适配、HTML/CSS/原生 JavaScript；既有烘焙器单文件构建、私有导入器 GPUECli、本机编排 React/Vite 通过薄适配消费共用基础。

## Global Constraints

- 共用规则直接合并 `协作/交互宪章.md`，不新建第二份宪章。
- 烘焙器：效果制作、输出资源、资源导入；导入交互直接沿用现有导入器。
- 指定资源导出目录，一键导出展开文件，无额外下载/解压/复制路径；完成后自动识别/检查，用户点导入才写 UE。
- 编排台只消费资源并编排节奏/点位/音乐；由烘焙器提供缩略图与资源数据。
- 前两个工具完整迁移并验收后，才从特效工作台移除烟花导入与编排功能。
- 物理/参数/默认值/材质角色/正式库保持；UE 4.24 Cascade、现有材质、帧号取整、不混帧。
- 本轮新增公共内容仅通用规范/基础代码/样板证据；本机执行配置与凭据不因迁移公开。工程命名/节目/素材按现行明确授权与资料清单处理，不撤销已授权共享，也不强制全部脱敏。
- 现有共享 `tool/src` 需独立认领后再实装；第一阶段只认领宪章、新设计基础与本记录。

---

### Task 1: 合并唯一宪章

**Files:** Modify `协作/交互宪章.md`、`仓库梳理.md`、本对话记录。

**Interfaces:** Consumes 用户已确立职责及现有对象/动作规则；Produces 同一路径第0节共用规则、第1–8节保留业务行为。

- [x] 写三工具职责、tokens唯一来源、密度/组件/状态、目录导出到导入清单、索引/缩略图、固定版本引用、迟延移除门槛。
- [x] 更新 ZIP 单一措辞为目录主交付/ZIP便携；检查既有专项行为与新职责的优先级，不删除历史数据规则。
- [x] 对照用户原话逐项定位，校验所有文件引用，`git diff --check`，提交规范阶段（主交付057e1d96已推main）。

### Task 2: 可执行设计基础和组件样板（本轮交付）

**Files:** Create `tool/design-system/tokens.json`、`build.py`、`tokens.css`、`components.css`、`components.js`、`icons.js`、`index.html`、`sample.css`、`sample.js`、`README.md`；Test `analysis/scripts/workspace_design_check.mjs`。

**Interfaces:** `window.FWDesign.setFieldError(input,message)` 关联并清除字段错误；`FWDesign.notify(host,message,action?)` 提示及真实撤销回调；`FWDesign.openDialog(dialog,trigger)` 焦点进入/恢复；components CSS 只影响 `.fw-*`。

- [x] JSON 提供表面/颜色角色、五级字阶、4/8间距、形状、紧凑32/舒适40/粗指针48px目标和统一动效；Python输出带来源头的CSS，生成可复现。
- [x] 原生组件覆盖焦点/选中/禁用/只读/忙/错误；不写全局业务快捷键、不使用CDN。
- [x] 样板密度切换、字段校验、可撤销列表操作、对话框焦点、模块摘要与滑杆联动实际可用；业务状态矩阵明确示例，无UE接口/文件写入。
- [x] 检查对比度、生成一致、脚本语法；真实新样板在1366/1920/窄屏查看，Tab/Esc/错误/撤销核对；记录实际证据边界。
- [x] 提交并打开样板供用户查看；生产工具接入另记版本（主交付057e1d96已推main，样板本机8033已打开）。

### Task 3: 本机目录交接（生产下一阶段）

**Files:** Create `tool/local_delivery/service.py`、`tool/local_delivery/store.py`、`tool/local_delivery/test_store.py`；Modify `tool/src/js/60_export.js`、`70_ui.js`、`body.html`、`tool/build.py`、CHANGELOG。

**Interfaces:**
- `POST /api/output-root` 设置用户指定的绝对根目录，返回本机配置ID与可写检查结果。
- `POST /api/deliveries?name=<正式英文名>` 接收现有 `makeZip()` 的最终 Blob（内部传输，不触发下载），返回 `{deliveryId,directory,resourceId,revisionId,files,configFiles}`。
- `GET /api/resources` 返回仅完成且核验的资源索引；`GET /api/deliveries/<id>` 返回不可变回执。

实现骨架：
```python
def checked_member(root, name):
    from pathlib import Path
    if not name or '\\' in name or ':' in name:
        raise ValueError('资源文件名无效')
    target = (Path(root) / name).resolve()
    target.relative_to(Path(root).resolve())
    if target == Path(root).resolve():
        raise ValueError('资源文件名为空')
    return target
```

- [ ] 写真实临时目录测试：当前单层/多层 ZIP、中文文件、缺cascade、重复条目、CRC错、../与绝对路径、写入失败、同名更新与正在导入快照。
- [ ] 本机服务限制loopback与允许来源并绑定本次本机会话，不暴露任意执行接口；资源目录只来自用户配置。写临时区并逐文件SHA256/完整包校验，最后发布完成回执；失败保留上次完整目录，不能以部分新文件继续导入。
- [ ] 按`<root>/<effectName>/revisions/<revisionId>/`发布不可变修订，保留原生文件名；仅原子更新最新索引。回执、正在导入快照与演出都绑定修订目录，同名导出不能覆盖历史。修订指纹由规范化原生产物文件清单/内容计算，资源索引不能把自身哈希纳入自身。
- [ ] 提取 `makeZip` 内的整理为可复用出口或保持最终ZIP读取原样；单层、单束、多层路径都调用同一个交付函数。ZIP作为单独便携动作，不静默回退。
- [ ] 服务返回实际目录并自动交接；制作/导出不依赖UE在线。真实写入测试只用仓库测试临时目录，正式资源目录由用户配置，不猜路径。
- [ ] 按规定认领/升版本/构建/标准与产物回归；确认导出贴图与cascade字节未因交付方式改变。

### Task 4: 原导入器交互原样迁入独立工作区

**Files:** 私有 `workbench/fireworks.html`、`fireworks-ui.js`、`fireworks-workspace.js`、`fireworks-pack.js`、`fireworks-plan.js`、`fireworks-import.js`、`fireworks-update.js`、`build.py`；公共只维护通用交接协议与烘焙器入口，不上传私有段落。

**Interfaces:** `acceptDelivery({deliveryId,directory,revisionId,displayName,configFiles})` 创建或刷新原批次行，调用当前 `readPack(dir,configFile)` 与既有检查；`getImportReceipt(deliveryId)` 返回逐项保存/版本管理/失败状态。

- [ ] 先固定受保护导入执行函数和原行为检查基线，抽离呈现入口；队列/设置/逐资产预览、命名/重名检查、确认/执行、停止和日志沿用。
- [ ] 接收完整回执即自动检查并展示清单；名称/目标不明确时仍停在原核对环节。检查与导出不会触发 importOne。
- [ ] 用户点导入时按现有流程复核源指纹、选择、平台、目标；冻结任务快照，修改其它草稿不改正在执行任务。
- [ ] 真实同名更新覆盖提示、部分失败恢复、UE离线/超时、保存成功但版本管理失败均保留；仅在用户点击动作后写UE。
- [ ] 分别记录隔离检查、原生写入回执与实际效果播放，不能混为通过。

### Task 5: 资源索引与编排消费

**Files:** 新通用 `spec/workspace_resource_v1.md`；Modify 私有编排 `src` 中资源读入/资源库/固定版本引用适配；公共烘焙出口增加 `workspace-resource.json`、`preview.png`，不改 `fwl.cascade/1`。

**Interfaces:** 资源索引格式 `df.firework-resource/1`；原生配置相对路径、每文件sha256、稳定resourceId、修订revisionId、缩略图source/timeS、时长/尺度/标定状态；演出仅存resourceId+revisionId及编排属性。

- [ ] 缩略图从当前完成产物按同一引擎回放核产生；索引与缩略图绑定同一修订。缺失图显示缺失，不拿旧图或示意图冒充。
- [ ] 编排读取只完成索引，核对文件/来源/修订，识别库条目与可用平台；资源有新版本时提示主动应用，旧演出不自动替换。
- [ ] 区分资源制作参数与演出角度/时间/点位/音乐/相对编排模板；旧花型草稿逐项迁移保留，重新导向烘焙器编辑。
- [ ] 真实导出→索引→缩略图→资源引用→演出保存/刷新/缺失资源恢复往返验证；本机映射不默认上传共享版本。

### Task 6: 逐步翻新与迟延移除

**Files:** 各工具对应视图、当前迁移清单、交互宪章实现状态、CHANGELOG与交接。

**Interfaces:** 每工作区消费统一tokens/基础状态，自定义组件保留领域行为；旧存储到新来源显式迁移并保留恢复点。

- [ ] 先烘焙主任务，再导入与编排资源库/任务；每块有真实任务/分辨率/键盘/错误证据，保持可运行版本。
- [ ] 核对前两工具覆盖旧烟花功能、旧数据恢复、资源映射、实际导入和编排交付与用户认可。
- [ ] 门槛满足后才从特效工作台移除烟花两入口及重复实现，备份和回退仍可用；其他工具保持。

## 本轮验收边界

Task 1–2 是本轮先行交付；Task 3–6 是用户确立的后续分阶段生产迭代，有明确文件/接口/验收与认领门槛，不称本轮已实现。正式目录导出、本机UE导入联动、编排资源识别均须实际任务另验。

本轮新增检查与浏览器证据见 `analysis/results/WORKSPACE_DESIGN/README.md`；生产页、读屏、200%真实缩放和真机触控未验。既有离线UI检查5/7两项失败保留，不作为设计基础检查通过的反例或全库通过声明。


## Task3–6 实施更新（2026-10-10，烘焙器4.9.60）

详细执行与逐项状态移至同目录2026-10-10-workspace-delivery-checklist.md；原计划上述复合验收项不因局部接线自动打勾。目录服务/原最终ZIP统一出口/旁路索引workspace-thumbnail.png/私有独立导入自动原检查/8025固定资源引用已接。实导实播、严格像素标准、旧数据迁移、整体统一表现仍未完成；特效工作台两入口保持。证据与后续提示词见analysis/results/WORKSPACE_DELIVERY/README.md、协作/统一工作区_翻新评估与提示词.md。
