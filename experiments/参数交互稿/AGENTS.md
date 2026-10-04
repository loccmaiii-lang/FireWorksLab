# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

## 已确认的用户偏好（2026-10-04，对话框16）

- 原深灰与青绿配色、现有整体布局、真实烟花预览保留；产品名为「烟花烘培器」。
- 参数、模块、外层分组名称全部沿用 `analysis/命名/参数名称表.json`、`模块表.json` 和 `P43_GROUPS`，不得擅自翻译或改名。
- 先提供可以操作的隔离交互稿；不得以交互稿覆盖生产 `tool/src`，不得修改模拟、贴图、时间联动、导出规则。
- 频繁移动鼠标时不得自动弹参数说明；主动点 `?` / F1 后打开固定说明区，关闭 / Esc 收起。
- 展开与收起文案必须跟随实际状态；随机的本体关系保持不变。
- 图层管理默认展开、入口清晰，统一文字和控制尺寸；窄屏保持可操作。
- 显卡、更新记录继续位于右上角；保存、另存为、单束、查看交付沿用当前行为。

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
