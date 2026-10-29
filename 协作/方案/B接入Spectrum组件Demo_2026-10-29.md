# B接入Spectrum组件Demo Implementation Plan

> **For agentic workers:** 按下面任务逐项执行；用独立子任务核查组件映射和样式，保留已有运行时与技术栈。

**Goal:** 新增Adobe取向统一组件接入B的可操作Demo，保留B真实40参数及隔离原核预览，原B/Material保留。

**Architecture:** 原B的parameters.json、focus-panel.js和engine-bridge.js以原路径逐字节复用。studio.js由原件生成薄变体，仅替换独立存档键及必要呈现标识；新增适配器把适用B控件接到u-*类和Spectrum作用域，不加载会改变B数值语义的通用滑杆控制器。

**Tech Stack:** 既有HTML/CSS/JavaScript，Python确定性生成，8034本机HTTP；无依赖新增。

## Global Constraints

- 只写`tool/design-system/drafts/v6-b-spectrum-20261029/`及本轮计划/对话记录/状态条目/结果；旧稿与其他未提交成果逐文件哈希保护。
- 用户仍偏好Material，不将本轮试验当作新默认方向；正式源码、共享基础、配方、导入器、节目、UE不改。
- B字段常用滑杆范围不是手输硬边界；保留有限值/整数校验、条件原因、锁定、真实只读层、一次手势事务、原配方与保存快照差异。
- 按真实用途接入组件，不为凑齐八类增加业务无关的开关或单选。
- 原B与新B存档分离，原B键不写；内部540²、1000m观察与单层核不变；整朵静态参考、未烘焙/导出/UE边界继续标清。
- 默认紧凑32与原B密度比较，提供常规40选项；均保持14px值/13px标签。

## Task 1 · 保护和基线

- [x] 读规则、实际打开原B、核对组件与参数语义；安全合并main的4项无关更新，不重写已发布分支。
- [ ] 哈希保护旧稿/正式源码；认领并推送后再写新Demo。

## Task 2 · 同一真实B的视觉适配

Create: `tool/design-system/drafts/v6-b-spectrum-20261029/{b.html,studio.js,build-prototype.py,build-manifest.json,b-adapter.js,b-adapter.css,index.html}`。

- [ ] 生成入口和独立storage薄变体，以base原路径复用所有数据、图标与桥接；只写新目录。
- [ ] 适配器映射按钮/字段/滑杆/下拉/checkbox/分组与视图状态；排除树、库、splitter等领域控件，保持原角色与键盘控制器。
- [ ] 接入既有Spectrum tokens/components，解决原B高特异性样式冲突；保留四组和主工作区布局，加入轻量密度入口和旧B链接。

## Task 3 · 浏览器与交付

- [ ] 原B/新B同视口同参数同时间截图比较，检查整体和参数细节，修P0/P1/P2再复核。
- [ ] 原生交互验证：改值/箭头步进/整数错误与最后有效预览/超常用区间/条件灰化/撤销保存刷新/只读锁定/观察与眼睛/交付和窄窗滚动。
- [ ] 通过只读DemoStudio探针核实40参数、桥接540²真实帧、参数变化实际进入原核；不靠静态图冒充。
- [ ] README、design-qa、verification与结果短说明；保护哈希、语法、引用、推送门禁；只提交本轮白名单，止于Demo评审。
