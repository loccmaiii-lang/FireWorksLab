# 导入名称预览与确认 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 用户填写基础名后能核对每一项真实目标名称，显式确认后才执行导入。

**Architecture:** 保留原有命名计划与 importOne 引擎。只读检查生成计划；预览展示计划中的目标，确认缓存与该计划的输入、内容和目标绑定，执行入口验证所有所选已检查项的确认。确认与检查都不能触发导入。

**Tech Stack:** 单文件 HTML、原生 JavaScript/CSS、Python 生成器、Node.js/jsdom 隔离接口检查。

## Global Constraints

- 正式工具位于 D:\FXTools\DFWorkbench，沿用桌面快捷方式及原 HTML 文件路径。
- 不更改既有 UE 资产、BP、命名规则、原 importOne 代码或公共烘焙器代码。
- 私有源文件、素材路径及映射只留本机；公共仓库仅提交脱敏进度。
- 保留当前深灰/薄荷绿外观、六个模块和旧批次/GPU 待办恢复。
- 改名、换包、重新检查或刷新之后必须重新确认；不能通过直接调用执行函数绕过。
- 本轮所有写入接口检查模拟；不执行实际导入。

---

### Task 1: 保存基线并复现缺失的确认门槛

**Files:**
- Create: `workbench/check-import-name-confirmation.cjs`
- Create: `workbench/backups/2026-10-01-import-name-confirmation/`
- Modify: `workbench/check.cjs`

**Interfaces:** 测试启动生成后的 HTML，模拟 GetPlatformName / ExecutePythonCommandEx / DoesAssetExist；替换 importOne 为只记录计划的函数。`FwImporter.preview(ids?: string[])` 是只读检查，`FwImporter.execute(): Promise<void>` 是执行入口。

- [x] 保存编辑前 HTML、界面/生成器/说明/旧检查，并核对原工具哈希。
- [x] 新检查先覆盖未确认的 ready 项不能执行：

```js
await add(w, 'F:/packs/a | Review_01');
assert.equal(document.getElementById('fwimp-btnExec').disabled, true);
await api(w).execute();
assert.equal(writes.length, 0);
```

- [x] 运行 `node check-import-name-confirmation.cjs`，记录 v2.2 的失败；后续新增明确确认后执行、改名失效、批量混合、取消、刷新、素材变化、目标变化和真实多贴图名称对应的检查。

### Task 2: 命名预览与明确确认

**Files:**
- Modify: `workbench/fireworks-ui.js`
- Modify: `workbench/fireworks.html`
- Modify: `workbench/workbench.css`

**Interfaces:** 新增 `FwImporter.reviewNames(ids?: string[]): void`、`FwImporter.confirmNames(): void`、`FwImporter.closeNameReview(): void`。`checked(r)` 只判断技术检查有效，`canRun(r)` 额外验证会话内确认。`nameReview` 保存批次与各项计划指纹，确认按钮只授权这一页已展示的计划。

- [x] 分离技术检查与名称确认；勾选依赖前者，执行依赖后者：

```js
const confirmations = new Map();
const canRun = r => checked(r) && confirmations.get(r.id) === verified.get(r.id).fingerprint;
function invalidateRecord(r) {
  verified.delete(r.id);
  confirmations.delete(r.id);
  closeNameReview();
  r.state='unchecked'; r.errs=[]; r.assets={};
  delete r.checkedAt; delete r.gpu;
}
```

- [x] 添加三步提示和整页名称预览；表格按素材包列出来源、完整目标名、目标目录，拆解基础名/两位序号，明确类型前缀和后缀会自动补齐。缺少有效检查时禁止确认；可返回修改。
- [x] 保存、改名后生成预览；确认函数核对批次、记录、输入签名与完整计划指纹，确认成功后返回列表并开放执行，绝不自动导入。
- [x] 执行函数检查全部所选 ready 项；其中任一未确认则零写入并提示核对。重新读取素材和目标的既有保护保留；运行、失败、重新检查均清除确认。
- [x] 单项改名立即清掉旧目标显示，保留输入焦点；选择未确认项仍可勾选，状态明确显示「待确认名称」。
- [x] 旧29项检查在应执行的位置显式调用 `reviewNames()` 和 `confirmNames()`，保留原失败/停止/保存/GPU 收尾的验证意义。

### Task 3: 同路径生成、回归与交接

**Files:**
- Modify: `workbench/build.py`、`workbench/shell.html`、`workbench/shell.js`
- Modify: `workbench/README.md`、`workbench/CHANGELOG.md`、`使用说明.txt`
- Create: `workbench/research/import-name-confirmation-report.json`
- Modify public notes only: `对话记录/对话框5.md`、`协作/状态清单.json`、`交接.md`

- [x] 版本升至 v2.3，生成原路径单文件，说明顺序为填写→检查并预览→确认名称→执行。
- [x] 运行全部隔离检查：

```powershell
python build.py
node check-import-name-confirmation.cjs
node check.cjs
node check-multi-textures.cjs
node check-show.cjs
node check-show-export.cjs
```

- [x] 确認原工具哈希和快捷方式目标不变；报告明确所有 UE 写入模拟，未进行真实导入或浏览器视觉验收。
- [x] 复查未确认/混合选择/改名/变化不能绕过，原名称计划和导入引擎逐字未改；说明与按钮一致。
- [x] 在隔离工作树提交脱敏记录，fetch/rebase 后正常推 main，不修改其他负责人内容；归档工作树。

## Self-review

当前需求覆盖填写后预览、明确确认、实际名称/来源对应、改动失效、批量效率和执行函数门槛。所有新增公开接口在 Task 2 定义；计划不要求用户再次批准实现。按用户已授权范围在当前对话内完成。
