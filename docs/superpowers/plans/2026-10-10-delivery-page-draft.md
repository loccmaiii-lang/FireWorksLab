# Delivery Page Draft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 当前目录无此辅助技能，沿用用户已授权的当前会话顺序执行；不派子代理。

**Goal:** 给出一版可点击的烘焙器交付/导入草稿，操作常驻、清单局部滚动，并解释时长和演出资源登记。

**Architecture:** 在既有工作树新增独立原生原型，直接引用共享 tokens/组件/图标。使用已核对金芒菊修订的缩略图与精简展示数据；检查、确认、执行均为内存状态演示，原生产源码、原导入执行和节目保持。

**Tech Stack:** HTML/CSS/JavaScript、现有设计基础 v0.1.0、Python 静态服务、CUA 实页检查。

## Global Constraints

- 唯一规则为协作/交互宪章.md；不另建宪章、不改公共 tokens、不占 tool/src。
- 用户只要一版草稿；不把草稿的模拟状态当实际检查/导入/实播。
- 导入按钮始终可见；未检查/未确认必须给出原因。配置和资产选择改变作废确认。
- 保留队列、平台、命名、新建/更新、资产选择、依赖、路径、系统/GPU设置、日志与包间停止的布局位置。
- 5.5s 是制作设定，当前最终 PC/手机配置 4.8333s、delay=0；不回写原生配置，不改变物理/帧曲线。
- 演出资源登记和 UE 导入分别呈现，未验证映射不自动拿其他资源行顶替。

### 1. 时长及映射说明

**Files:** 新 `tool/prototypes/workspace-delivery-v1/README.md`，本对话记录。
**Interfaces:** 说明中区分制作设定、最终产物区间、开花锚点和演出引用；旧索引缺字段不称已经收口。

- [x] 核对 50_bake、66_fwlcascade、67_fwlcombo、bakeTotal 与实际两平台配置/母版 JSON。
- [ ] 写清资源登记的 PC/手机路径、固定修订、尺度、时长与 UE 实播门槛；记录目前编排适配旧回执仍 fallback 到 5.5s。

### 2. 单版原型

**Files:** 新 `tool/prototypes/workspace-delivery-v1/{index.html,draft.css,draft.js,README.md,assets/gold-thumbnail.png}`。
**Interfaces:** 相对引用 `../../design-system/{tokens.css,components.css,icons.js}`；`state` 仅内存保存当前平台包/选择/确认/演示状态；原生 dialog 用于详情并恢复焦点。

```css
.workspace { height: 100dvh; display: grid; grid-template-rows: auto auto minmax(0,1fr) auto auto; }
.panels { min-height: 0; display: grid; grid-template-columns: 232px 280px minmax(0,1fr); }
.panel-body { min-height: 0; overflow: auto; }
```

```js
function invalidate() {
  state.checked = false;
  state.confirmed.clear();
  render();
}
```

- [ ] 单一工具头、紧凑资源上下文、三栏队列/设置/资产、单一常驻动作区；日志折叠。
- [ ] 实现检查→逐包确认→导入的模拟闭环，配置变化确认失效、冲突、UE离线、部分失败/重试、包间停止。
- [ ] 可展开时长和资源登记说明；长名称完整可达。窄屏切窗格不改对象/确认。

### 3. 实页与交接

**Files:** 原型 README、本对话记录、交接.md、仓库梳理.md、共享认领记录；截图仅本机备份。
**Interfaces:** 静态入口 `http://127.0.0.1:8035/tool/prototypes/workspace-delivery-v1/`。服务仅绑定 loopback，无写入 API。

- [ ] `node --check draft.js`、`git diff --check`；CUA 观察实际 viewport、文档高度与动作边界；清单滚动不挤走按钮。
- [ ] 实页检查核心模拟状态、依赖联动、配置失效、详情焦点与窄屏呈现；不编写镜像 CSS 的测试。
- [ ] 保存并审看截图，区分执行/局部AI检查/用户审看，推送并同步主工作区，不改原未提交工作。
