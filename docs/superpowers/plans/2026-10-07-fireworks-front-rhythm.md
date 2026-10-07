# 烟花编排demo Implementation Plan

> **For agentic workers:** Execute this plan inline, task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. 用户已授权完成重设计，不再请求执行选择。

**Goal:** 将前台改为完整效果不越过150 m坝顶的小烟花区域，交付210秒新编排与可审阅节奏示意。

**Architecture:** 一个确定性生成器维护花型尺寸包络、发射点和逐发时间，生成JSON/CSV供计划和示意使用。主排仍用旧点位与尺寸；前台使用独立模板白名单。示意只表达比例与节奏，不调用烘焙器或UE。

**Tech Stack:** Python标准库、内嵌数据的HTML/SVG/JavaScript。

## Global Constraints

- 坝顶150 m；五段150/150/200/150/150 m；前台50 m高、200 m宽、50 m深。
- 前台完整设计包络≤145 m；直径24–40 m（彗星宽8 m），只用专属小烟花。
- 保留tool/src、私有导入器、已有配方及用户全部未提交文件。
- 开花时刻与发射时刻分别记录；发射秒=开花秒−升空秒。持续效果按结束时刻核对转段。
- 只声称设计/示意自检；UE真实包络、材质光晕、性能与用户审美验收未验证。

### Task 1: 编排数据与边界

**Files:** Create `analysis/scripts/烟花编排demo.py`; generate `协作/编排demo/时间线.json` and `逐发时间表.csv`.

**Interfaces:** `build_show() -> dict` produces `phases`, `points`, `templates`, `events`; event fields include `launch`, `burst`, `end`, `point`, `template`, `zone`.

- [x] 定义前台五个专属小花模板、主排原尺寸模板与独立发射点。
- [x] 按十段逐发排程；前三点交替/两翼对打/中心到两端/密度递增，白墙四波九点。
- [x] 用断言核对前台白名单、完整顶部≤145、横向包络在200 m平台宽内、全部时间0–210、白墙36发；输出确定性数据和汇总。

### Task 2: 替换旧编排方案

**Files:** Modify `协作/跨年烟花秀编排计划书.md`; create archived prior plan `归档/跨年烟花秀编排计划书_2026-10-05.md`.

**Interfaces:** Consumes Task 1 data; writes ten phase counts, asset/group roles and explicit assumptions.

- [x] 保留旧方案为历史参考，将当前文件完整改为新方案，避免旧前台大花/同参数/旧总数混用。
- [x] 写清F1–F3横排、前台子模板、禁止坝顶组绑定前台、随机与光晕包络和UE校准方法。
- [x] 各段明确开花秒、扫射间隔、留白、发射预卷、衔接与结束；数量直接来自数据。

### Task 3: 审阅与交接

**Files:** Inline `fireworks-rhythm.html` in thread visualization root; modify `对话记录/对话框24.md`, `交接.md`, `协作/状态清单.json`, `仓库梳理.md`.

**Interfaces:** Consumes identical Task 1 JSON embedded in fragment; slider selects time and animation computes all positions from absolute time.

- [x] 使用同一米制比例展示坝顶/平台/前台花冠；时间拖动与播放覆盖210秒，支持段落跳转与前台近看。
- [x] 浏览器检查320/736宽、拖动、播放暂停、各段截图与完整210秒轨迹；修复实际发现的问题。
- [x] 运行数据检查和仓库标准的离线检查，报告适用范围；新增目录补地图，提交前fetch安全同步，提交并推送。

完成：实施与检查结论见 `对话记录/对话框24.md` 及 `协作/编排demo/检查报告.json`。UI检查不等于UE或艺术验收。

## 后续加密与圆形爆开（2026-10-07用户追加）

- [x] 把实际逐发总数增加到850、前台168，白墙八波/72发/1.5秒间隔；验证尺寸高度不变、无重复事件。
- [x] 球花改成圆冠外壳、球面投影内部星点和径向短尾，JSON/CSV写明sphere；不修改真实UE素材。
- [x] 同步原计划/数据/示意/检查；初版计划与JSON归档，浏览器四宽度、全时间轴与实际关键图审看。
- [x] 状态/交接/对话记录同步并推送，UE/用户验收独立保留。
