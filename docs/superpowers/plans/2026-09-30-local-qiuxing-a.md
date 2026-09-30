# 球形 A 本地接续 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> 本会话按用户授权在本机逐步执行现有脚本；不再等待逐轮确认。

**Goal:** 依据云端《给其他 AI 的执行说明》，接续 QA12，修正银白星点过早变暗，并完成同版本的 2K 导出和自检。

**Architecture:** 沿用现有两层组合、GPU 执行脚本、素材导出及版本指纹。只接手球形 A；先用同一时刻对照选择燃烧与渐暗参数，再通过实际导出回放验证，保留历版证据。

**Tech Stack:** Python 3.12、Playwright、WebGL、现有 FireworkBaker 和 Cascade 导出脚本。

## Global Constraints

- UE 4.24 Cascade；不新增引擎材质，不写引擎代码。
- Dynamic Parameter 第 3 通道；不做帧间混合。
- 灰度 RGBA 接力，2048×2048，四通道全部使用，BC7；颜色通过 Ramp + Color Over Life。
- 大面片使用固定或 Zoom 取景，保留 QA12 的 Zoom。
- 金尾与星头共用 seed、stars、v0、vt、grav、speedJit、dirJit、wind、turb；不分层拟合运动，不调整取景降低误差。
- 不改已通过效果、正式库及 V5 默认值，不将 AI 自检写成用户通过，不录视频。
- 多方推 main；开工和推送前 fetch，必要时保留双方内容 rebase，绝不 force push。

---

### Task 1: 接手与基线检查

**Files:** 修改 `协作/状态清单.json`、`交接.md`；新增 `对话记录/对话框3.md`、本计划。

**Interfaces:** 读取 QA12E 的烘焙回放、回放检查及导出清单；输出明确的球形 A 本机负责人，不变更其他效果负责人。

- [x] 读取云端说明、当前状态、用户核对过的球形 A 原理及最新结果。
- [ ] 将球形 A 负责人写为 `对话框3（Codex 本机）`，记录原始用户请求并提交、推送接手记录。
- [ ] 基线按开花后 0.1、0.4、1.1、1.9、2.6、3.1、3.4、3.6、3.8 秒核对，重点检查银白点的数量与渐暗时机。

### Task 2: 本地迭代

**Files:** 修改 `analysis/迭代/条目.json`；新增 `analysis/迭代/QA13/` 的对照证据和 `analysis/results/QA12E/看法.md`。

**Interfaces:** `时刻对照.py QA12 <图> --times ... --mods <JSON>` 用于参数预演；`派生组合.py QA12 QA13 --effect qiuxing_a` 用于生成完整组合。下一任务消费 QA13 条目号。

- [ ] 对比星头候选 `{burn: 3.75, fade: 0.10}` 与 `{burn: 3.8, fade: 0.12}`；只修改星头燃烧和渐暗，其他层参数保持基线。
- [ ] 根据同一秒画面选一个候选；若尾巴的残留或头尾关系仍不符合原理，记录实际差异再修改，禁止为分数调暗图层。
- [ ] 通过既有派生脚本保存 QA13，并将 QA12 归入历史；逐字段核对两层共同运动参数。

### Task 3: 导出与完整检查

**Files:** 新增 `analysis/jobs/QA13E.json`、`analysis/results/QA13E/`；大文件保留在 `analysis/local/输出/素材包/QiuXingA_QA13_1`、`_2`。

**Interfaces:** 导出任务 `{id: QA13E, type: export, effect: qiuxing_a, entry: QA13, name: QiuXingA_QA13, ready: false}`；本机显卡锁保证不与后台重复跑；结果包含版本指纹、PC/手机参数、贴图、Ramp、Cutout、实际回放。

- [ ] 更新迭代数据并重新构建烘焙器，确认 QA13 能完整打开。
- [ ] 完成本轮本机导出；检查真实贴图与实时模拟在同一秒的颜色、造型、头尾对齐和渐暗，以及连续播放和局部。
- [ ] 检查 2K、8×8×4、无裁切、无中间空帧、无异常曝光和突变；核对导出清单版本指纹与条目一致。
- [ ] 自检不足时继续内部修改并导出；满足条件才进待验收，用户验收保持 false。未经 UE 实机验证如实记录。

### Task 4: 收尾同步

**Files:** 修改 `协作/状态清单.json`、`交接.md`、`更新记录.md`、`对话记录/对话框3.md`；通过现有脚本生成 `协作/状态清单.md`、`tool/data/review.js`、`tool/FireworkBaker.html`。

**Interfaces:** 用户刷新烘焙器后能看到一个完整的当前候选和当前版本的素材包；云端根据负责人和日志继续协作。

- [ ] 写自检结论与交付位置，更新任务勾选及共享状态。
- [ ] 重新生成数据与页面，检查实际结果和版本对应，fetch 后提交、推送，不混入已有的 experiments/ 和个人参数文本。
- [ ] 告知用户本轮实际完成内容、入口和剩余限制。
