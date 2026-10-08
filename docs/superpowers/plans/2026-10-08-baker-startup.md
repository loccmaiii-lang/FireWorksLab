# 烘焙器启动效率 Implementation Plan

> 本轮由当前会话直接执行；用户已要求测试并优化。共享源码以状态清单登记范围为准。

**Goal:** 缩短初次打开等待，保留现有参数、输出与存档行为。

**Architecture:** 先用隔离浏览器资料测主线程初始化、显卡编译、烘焙和存储。将未使用的显卡程序延迟到首次使用，同一程序仅初始化一次；不改 shader 文本与计算。

**Tech Stack:** JavaScript / WebGL2、Node、Playwright、Python 构建器。

## Global Constraints

- 不动个人浏览器资料、配方默认值、OUTPUT_VER 或验收状态。
- 不改对话框23正在编辑的光点核与参数逻辑；40_gl.js 只改 compile 调度入口，合并保留对方源码。
- 所有测试先在 analysis/local/输出/startup-perf 副本执行。

### Task 1: 基线与回归检查

- [x] 保存 4.9.47 HTML / data 副本，使用隔离 Chromium / RTX 5080 分别跑正常启动和 ?fast。
- [x] 添加 `analysis/scripts/startup_check.mjs`，验证未使用程序不创建、p/u 任一入口首次使用只创建一次、失败可以重试。
- [x] 让检查在缺少 lazyProgram 时失败。

### Task 2: 最小优化与验证

- [x] 新增 `tool/src/js/39_programs.js` 的 `lazyProgram(create)`；首次读取 p 或 u 时调用 create 并固化结果。
- [x] `40_gl.js` 将现有 compile 原样移为 compileNow，compile 返回 `lazyProgram(() => compileNow(vs, fs))`。
- [x] 对比正常启动、纯界面启动、多层打开，统计多次测量；检查像素与帧计划不变。
- [x] 构建并运行静态、启动回归、相关界面检查、标准检查；写明已有失败。
- [x] 按现存版本顺延版本号，写 CHANGELOG、对话记录和交接；安全提交推送（随实现提交）。
