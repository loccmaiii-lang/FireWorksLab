# 统一工作区设计基础 v0.1.1

执行依据是唯一的 [交互宪章](../../协作/交互宪章.md) 第0节。这里提供可复用基础及可运行样板，尚未接入三个正式工具；目录交付、UE导入和编排资源识别见 [实施计划](../../docs/superpowers/plans/2026-10-10-unified-workspace-system.md)。

## 使用

直接打开 `index.html` 即可离线试用；所有 CSS、脚本和图标均为本地文件。也可在此目录运行 `python -m http.server 8033 --bind 127.0.0.1`，访问 `http://127.0.0.1:8033/`。样板不会读写交付目录，不连接UE；任务状态与资源标明示例。

生产页面按 `tokens.css` → `components.css` → `components.js` / `icons.js` 顺序加载，在工作区根节点加 `fw-scope`，可用 `data-density="compact"` 或 `comfortable`。原生HTML或React薄适配都使用同一基础；不引入 `sample.css` / `sample.js`，不重新定义一份tokens。

- `tokens.json` 是界面颜色、字阶、间距、形状、密度和动效的唯一来源。当前为深色主题的轻量格式，未声明完整DTCG格式兼容。
- `build.py` 生成 `tokens.css`，并从现有 `tool/src/js/69_icons.js` 生成语义名称的离线图标子集 `icons.js`，保留 Tabler MIT 许可。修改后运行 `python build.py`；`python build.py --check` 检查生成一致。
- `.fw-*` 类作用于控件；变量只挂在 `.fw-scope`。无需更改业务物理参数、时间轴、渲染曝光或快捷键。
- 按钮/图标按钮、输入/只读/错误、选择框、复选框、滑杆、分段选择、模块折叠、状态、进度、提示、对话框、列表/表格为基础。未覆盖复杂菜单、虚拟列表、时间轴或领域面板，后续按真实任务扩展。
- `FWDesign.setFieldError(input, message)` 保留已有 `aria-describedby`，添加/清除错误；调用方负责校验规则和失败时定位。
- `FWDesign.notify(host, message, {label, run})` 提示队列，动作执行真实回调；有撤销时不会自动消失或被新提示覆盖。调用方保留原对象和顺序；不可把提示撤销当UE回滚。
- `FWDesign.openDialog(dialog, trigger)` 使用原生 `dialog.showModal()`，关闭后恢复触发焦点。确认按钮仍由调用方负责执行；样板确认只显示提示。
- 标签必须完整，禁用必须附理由，状态使用文字与颜色；只读不要伪装为禁用。应用不得只凭样板配色声称已符合无障碍标准。

## 检查

`node analysis/scripts/workspace_design_check.mjs`（从仓库根目录）检查实际tokens的角色对比度、图标名称与离线引用、基础选择器作用域；`node --check tool/design-system/{components,sample,icons}.js` 逐文件检查语法。键盘焦点、Esc返回、校验、参数单次撤销、资源撤销、密度及窄屏由真实浏览器核对，证据写本对话记录。

基础版本独立于烘焙器版本。把这些文件接入正式工具前，应先认领对应源码、按仓库规则升版本与构建，并验证原任务和历史数据。

## v0.1.1：用户批准恢复原DF界面色值

2026-10-10用户看过草稿后明确要求恢复原色。颜色以当前生产`tool/src/style.css:1410–1412`最终生效值为准，Material调研单源维护；字阶、间距、圆角、控件尺寸、动效和组件行为保持。导入v1与参数静态设计册直接消费，无各自主题覆盖。

| 角色 | 恢复色值 | 原变量 |
| --- | --- | --- |
| 工作区底色 | #111d21 | bg |
| 输入/低表面 | #121f24 | low |
| 面板 | #1b2a2f | panel |
| 高表面 | #24373d | panel2 |
| 主强调 / 主色文字 | #00d49b / #062a23 | acc / accInk |
| 正文 / 辅助 | #e4edef / #b4c5cb | text / dim |
| 选中容器 / 文字 | #173d39 / #a1ded0 | hover / gold2 |

分隔线用原line #2b4149，必要控件轮廓用原faint #8da3ac，保持用途区分；焦点用acc2 #36e4b0。错误e7735a、警告e4bb7c、成功81d8b6取原语义色；错误容器#3f2525为角色对比度适配。13组文本≥4.5及必要边框/焦点≥3检查通过，不替代各正式工具完整无障碍验收。基础版本与生产4.9.60独立。
