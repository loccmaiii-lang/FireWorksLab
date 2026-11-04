# DF工作台六页界面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 把用户选定的六张图落地到原私有工作台同路径单文件，保留真实功能。

**Architecture:** 复用已有六页、所有原控件及控制器。新增独立的 presentation.css 和 presentation.js；只移动已有DOM节点、补说明/导航/视图组件，不复制业务引擎。build.py在已有源文件基础上注入界面层，版本升为2.10，存储键和旧记录不迁移。

**Tech Stack:** 原生HTML/CSS/JS、现有Python生成器、jsdom隔离回归。无新服务、无新依赖。

## Global Constraints

- 不改变六个工具原名、原参数名称、默认值、复制/命名/检查/确认/执行/导出逻辑、UE接口或本地存储键。
- private source/files stay local；公共仓库仅脱敏会话/认领/交接。
- 修改前备份已在workbench/backups/2026-10-04-design-implementation/，原v1.0.1源文件不改。
- 六页已选图位于design-drafts/2026-10-04-workbench/；以深灰青绿、正文14–16、标题24、侧栏208、底部主要动作构建。
- file协议浏览器拒绝继续遵守；测试fetch全部模拟。不把DOM隔离检查说成真实浏览器、自适应几何或UE验收。
- 不改共享烘培器4.4.0、tool/src、默认配方、用户艺术验收、RT5/22:00安排。

### Task 1: 共用壳与界面不变性检查

**Files:** Create presentation.js、presentation.css、check-design-ui.cjs；Modify build.py、shell.html。

**Interfaces:** 原Workbench.init/run/busy、switchPanel、六个panel-*和全部既有控件ID；新增WorkbenchPresentation.init/openHelp/closeHelp/toggleTools/setPlatform，均只操作界面DOM。

- [x] 在check-design-ui.cjs启动已生成HTML，fetch仅返回模拟连接；与备份控制器及默认控件比较。
- [x] 先运行node check-design-ui.cjs，预期缺少主动说明入口失败；原node check.cjs作为基线通过。
- [x] 在build.py追加源文件：`s = replace_once(s, '</style>', '\\n' + (HERE/'presentation.css').read_text(encoding='utf-8') + '\\n</style>')`；脚本注入置于Workbench之后、FwImporter之前，`Workbench.init();`之后调用`WorkbenchPresentation.init();`。
- [x] 实现公共页面标题/只读步骤、说明对话框和窄屏工具菜单；原switchPanel执行后从实际active页同步，busy不能切页。
- [x] 生成并检查无重复ID、原控件全部保留、默认值与原事件相同、四引擎及导入/编排源码不变。

### Task 2: 四个复制及配表页

**Files:** presentation.js、presentation.css、check-design-ui.cjs。

**Interfaces:** asset/mat原fieldsets、previewTable/Body/btnExec/execHint；weapon-plan/hint/btnDry/btnExec；resfx-plan/hint/cnfill/btnParse/btnExec；按钮/输入节点仍由原控制器管理。

- [x] 把执行节点移动到原fieldset底部footer，不越出fieldset；源设置与目标预览分别在左右栏，动作以原disabled为准。
- [x] 材质方向移至fieldset内整行；低频复制后处理折叠保留所有原节点，不改启用项。
- [x] 为weapon-plan的原七个plan-tbl生成页内tablist，隐藏未选组但保留全部原计划节点；执行仍写全部七表。
- [x] ResourceFX按原行平台PC/MB显示全部/PC/手游，不删除隐藏行或原resfx-edit属性/事件。常用五字段置前，路径/平台保持可展开，所有编辑仍由readPlanEdits读取。
- [x] 测试切表不删行、切平台不丢值或输入焦点、未预览不被界面层解锁。

### Task 3: 烟花导入与编排

**Files:** presentation.js、presentation.css、check-design-ui.cjs；不改fireworks-ui.js和show-*业务源码。

**Interfaces:** fwimp原batch/editor/main/detail/nameReview/actions/selectAll/steps；ShowComposer原控件与SVG，df-pattern-export/rows/scene/timeline等。

- [x] 导入页将既有fw-steps移至工具栏之前，列表与详情各自占位，固定原actions；原半选、名称确认、更新模式和GPU待办原样保留。
- [x] 编排页按scene→播放→时间条→逐发数值→输出的顺序移动既有节点；把输出按钮移至原fieldset中的底部footer。
- [x] 将原扇形轮廓section包装成同名details，子节点全部保留；原参数错误和警告留在输出附近。
- [x] 运行node check-import-naming.cjs、check-import-name-confirmation.cjs和全部check-show*.cjs，检查命名、恢复、固定随机和输出一致性。

### Task 4: 排布、可访问性与回归

**Files:** presentation.css、presentation.js、check-design-ui.cjs；研究报告放research/design-20261004/。

- [x] 大于1240px使用左右对照；900–1240缩小侧栏及输入列；900以下上下排列；720以下收起工具导航；480以下表单与底部动作换行。表格在自身滚动区滚动，正文不整体缩放。
- [x] 所有页说明点击打开，Esc关闭并恢复焦点；移动鼠标不触发说明。页内表导航支持方向键、Home/End。
- [x] 新隔离检查覆盖导航、busy保护、help键盘、默认值、节点/引擎完整性、表与平台切换和编排入口。禁止测试调用真实UE。
- [x] 运行原check.cjs、check-multi-textures.cjs、全部check-show*.cjs、check-import-{recovery,iteration,naming,calibration,name-confirmation,update-backend}.cjs和check-native-{persistence,approval}.cjs；只运行确认fetch被隔离的脚本。
- [x] design-qa.md记录visual gate blocked，因为没有被允许捕获的真实file页面；不能伪写passed或用localhost绕过。

### Task 5: 版本交付与协作

**Files:** build.py、README.md、CHANGELOG.md、design-qa.md、research/design-20261004/verification.json；公共仓库仅自己的三份脱敏协作文件。

- [x] build.py VERSION='2.10'生成原交付路径；复读标题、源码注入、重复ID与业务完整性。
- [x] 文档写清界面改动、备份位置、已测隔离范围、未测浏览器视觉/UE实机范围。
- [x] 保存最终检查汇总、确认原v1.0.1及业务文件不变，再更新自己的协作记录并释放本轮私有界面认领。
- [x] 推前fetch安全同步，保留其他会话的staged/unstaged及新提交；只提交自身脱敏文档，不上传私有工作台。
