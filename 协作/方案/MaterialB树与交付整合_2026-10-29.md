# Material B 树与贴图交付整合实施计划

**目标：**在独立评审入口完成用户七项修正，保留 4.9.126 成品及默认 V5 入口，等待视觉评审。

**架构：**继续复用完整烘焙器的参数、观察和交付函数。94 负责参数布局，95 负责树内观察，96 负责合并工作区；皮肤全部限于 `body[data-ui="material-b"]`。不改配方、模拟核、渲染核、导入器或 UE。

**技术：**原生 HTML/CSS/JavaScript；现有 FWIcons；原构建与隔离回归脚本。

## 1. 保护与复现

- [x] 核实分支、HTTP 根目录、共享文件认领及未提交归属；同步远端日志时保留脏工作。
- [x] 冻结 `tool/FireworkBaker_MaterialB_4.9.126.html`，原默认入口保留。
- [x] 保存 422 文件保护哈希与 94 原始副本，位于 `analysis/local/20261029_B树与交付整合/`。
- [x] 用当前实页与用户四张图记录树 solo 缺失、RT 首次空列表、颜色及控件差异。

## 2. 树、参数与视觉

**文件：**`tool/src/js/94_focus_review.js`、新增 `95_tree_review.js`、`tool/src/material-b.css`。

- [x] 94 删除预览上方旧观察菜单及移动原 rtLayerBar 的逻辑；95 以真实模型建立树内观察列表，复用原 `rtLayerBarSync()` 的按钮监听。
- [x] 95 暴露 `MaterialBTreeReview.sync()/getState()`，原 recipe eye 保持原义，RT checkbox 仅写原 `rtShow`，solo 复用原 `solo.go`；恢复全部只清观察状态。
- [x] 路径仅在树折叠或当前选中行不可见时显示；任务分组只在“全部参数”出现，独立发射器不叠加无效分类。
- [x] 使用左稿背景、数值框、选中与眼睛资产；绿色滑杆保留。当前标题改成单效果页签，不增加文档系统。
- [x] 隔离检查：新对象 RT 列表无需烘焙；多选/独看/恢复不改变参数指纹；原 eye 确实仍影响配方。

## 3. 贴图与交付工作区

**文件：**新增 `tool/src/js/96_delivery_review.js`；`tool/build.py` 接现有 icons.js；版本及 CHANGELOG。

- [x] 将现有 flow 主按钮命名为“贴图与交付”，保留原 delivery 按钮和回调兼容入口。
- [x] 组合工作区复用 `toggleDeliv(true)` 与 `renderDeliv()`；子视图按钮在 `state.view='export'/'atlas'` 切换，维持 `stage2.deliv=true`。
- [x] `#mbDeliverySplit` 放在 `#viewFrame` 后，8px 分隔；宽度 CSS 变量 `--mb-delivery-width`，鼠标/键盘调整、双击复位、保存 UI 偏好；拖动取消动效。
- [x] 清单可收起且保留预览；离开回原视图及右栏状态。切换只用 130ms 透明度反馈并遵守减少动态效果。
- [x] 贴图整张与当前帧继续使用现有画布，不复制渲染或业务状态。

## 4. 验证与交付

- [x] 构建 `PYTHONUTF8=1 python -X utf8 tool/build.py`，静态错误为零。
- [x] 通过 IAB 在 1920×1080、1366×768 及窄窗口实测；检查树观察、长标题/菜单、参数筛选、工作区切换、清单拖动、主预览。
- [x] 至少一轮截图审看后修正可见问题；关键图不超过三张，过程材料留 local。
- [x] 跑受影响回归及 W14；不调整验收阈值。检查失败则停相关提交并准确记录边界。
- [x] 核对受保护文件与旧稿；仅白名单提交本任务内容。交付入口、旧版对比、七项变化及已验证/未完成部分。

验证补充：标准检查新接 --material-b-ui-only，91项通过；W14原门槛通过；完整合入门禁18种形态/199行和8项状态通过。全量效果标准90通过、MESH-WILLOW-1缺少可检查条目，未改该范围外数据。
