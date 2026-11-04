# DF 工作台草稿比例修正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有六页工作台还原已选草稿的可读性与主区域比例，解决用户看到新版却仍觉得像旧版的问题。

**Architecture:** 只改独立 presentation.css / presentation.js、公共shell.html呈现顺序和构建版本。所有业务模块及控件保持原节点、事件、值和执行锁；CSS使用每页流式分栏与统一文字尺寸，步骤状态来自现有源输入、有效计划显示与执行状态。

**Tech Stack:** 原生 HTML / CSS / JavaScript，Python单文件构建，Node jsdom隔离检查。

## Global Constraints

- 同路径生成 df-fx-workbench_v2_locmai.html，版本由2.10升为2.11。
- 六页名称、输入ID、默认值、事件、localStorage键与原执行门槛保留。
- fireworks-import.js / fireworks-plan.js（含最新SizeByLife.preRoll）及全部业务控制器字节不变。
- 草稿里的示例路径/表行不写进用户字段，不伪造UE连接或成功结果。
- 只写本机私有工具；共享仅脱敏协作记录，不动tool/src及其它负责人任务。
- 此前file协议安全拒绝继续遵守，不用其它浏览器、localhost或间接执行绕过。
- DOM/CSS声明检查不能替代真实宽窄屏视觉验收；没有修后实页截图时design-qa.md保留final result: blocked。

---

### Task 1: 复现与保护当前实现

**Files:**
- Create: backups/2026-10-05-visual-fidelity/baseline.json（63份快照含当前单文件）。
- Create: check-design-layout.cjs（样式声明与实际DOM交互，不模拟浏览器几何）。
- Test: research/design-20261005/layout-before.json。

**Interfaces:** 使用当前单文件、jsdom样式表规则、原Workbench.busy、原源输入/预览表。报告包含passed/failed、隔离网络与visualVerification边界。

- [x] 保存v2.10及所有当前顶层维护文件，记录SHA256，不取旧备份恢复源码。
- [x] 编写并运行复现检查：宽屏body>=16px、content无限宽/取消居中留白、桌面两列均为fr且依各页草稿分配、资产四步/材质五步、预览刷新与标题同排、一键手游优化在折叠状态可达。v2.10初版10项失败，本轮扩展14项通过。

```js
assert.equal(declaration('.content', 'max-width', 2560), 'none');
assert.equal(declaration('.content', 'margin', 2560), '0');
assert.equal(document.querySelectorAll('#panel-asset .wb-flow li').length, 4);
```

### Task 2: 修正尺寸、区域和真实步骤反馈

**Files:**
- Modify: presentation.css（公共尺寸、复制/材质列、步骤、设置与预览空状态、现有断点）。
- Modify: presentation.js（原刷新节点就地移位、原优化按钮保留可见、四步只读状态）。
- Modify: build.py（VERSION='2.11'）。
- Modify: check-import-iteration.cjs（版本断言从构建定义读取，仍查页头/标题一致）。

**Interfaces:** flow(field, labels, name)消费原fieldset，内部update只读输入/有效计划/Workbench.busy并更新aria-current；setupCopyLayout(name)移动原刷新按钮；setupMaterialPreview()保持原表与输入，showResourcePath(row)展示当前原FxSP。均不增删业务字段。

- [x] CSS设置fluid grid与字号层级，保留原色token；900px以下纵排，720px以下原菜单。

```css
.content { max-width:none; margin:0; }
.tool-layout { grid-template-columns:minmax(330px,2fr) minmax(0,3fr); align-items:start; }
body { font-size:var(--wb-text); }
:root { --wb-text:16px; --wb-small:14px; --wb-title:30px; --wb-control:44px; }
```

- [x] 资产四步源资产/目标设置/预览/执行，材质五步加方向；源输入进入设置、当前有效计划进入预览、真实执行指示执行；解析/连接的busy不误报执行，不解锁按钮。
- [x] 刷新按钮移到预览标题右侧，移动原一键优化按钮到details外；常用checkbox紧凑排版，原低频字段完整保留。
- [x] 设置v2.11，构建单文件；运行新增14组和原14组界面检查，全部通过。

### Task 3: 回归、记录与交接

**Files:**
- Modify: run-design-checks.cjs（可选本轮输出目录，加入新检查）。
- Modify: README.md / CHANGELOG.md / design-qa.md。
- Create: research/design-20261005/verification.json / regressions.json。
- Modify: 对话记录/对话框16.md / 协作/状态清单.json / 交接.md（只脱敏记录）。

**Interfaces:** runner使用spawnSync运行全隔离脚本；verification比较baseline.sha256和当前文件，业务模块/原始v1.0.1必须一致。

- [x] 运行一次全隔离回归（17脚本通过），无真实UE访问；已有授权夹具不删除真实授权。最后纯呈现/侧栏顺序修改后两组界面检查再次通过。

```powershell
node run-design-checks.cjs research/design-20261005
python -X utf8 analysis/scripts/标准检查.py --ui-state-only --no-write
```

- [x] 逐个核对63份快照哈希（52未变、11允许变更）；7段业务原文、最新preRoll源不变；记录输出版本/哈希以及公共检查结果（共享检查6/7，一项store未定义，不能写全通过）。
- [x] 更新QA：用户截图为修前证据，和源稿状态/尺寸不同，不能精确像素比较；本轮修后捕获缺失，视觉仍blocked。
- [x] 仅提交脱敏日志/状态/交接；安全fetch/快进保留8e27ba8及本地材料，a6efd68推送main并验证远端同SHA，释放私有呈现认领。私有源码/图片/数据不上传；视觉复核仍blocked。
