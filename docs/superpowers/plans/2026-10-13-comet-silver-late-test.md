# Comet / Silver 燃尽后扰动副本测试 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> 按用户本轮授权在当前会话执行测试，不转交云端、不派代理。

**Goal:** 复制已认可的Comet/Silver，验证仅燃尽后尾部受气流影响的收益，保留原件。
**Architecture:** 4.9.80独立实验HTML内嵌两份复制条目；RT6世界坐标火花从燃尽时的原位置/速度继续积分，亮头不变。真实导出PC/手机序列，用原回放检查与同屏回放评估。生产tool/src由导出（23）做Zoom，完全不并写。
**Tech Stack:** 原RT6 JavaScript渲染器、Playwright/Edge GPU、Python/Pillow、既有Cascade输出。

## Global Constraints
- 已认可CS3C/CS3S和源存档保持不变；Comet红头独立、尾巴近远段合并，Silver合并输出。
- 不增加亮度/寿命、不改重力/颜色/种子/取景，不新增UE材质和代码。
- 测试不代表正式功能入库；失败项和可见性不足如实记录，不改门槛。

### Task 1：认领和复制
- [ ] 状态清单认领analysis/scripts/cs_late_*与analysis/results/CS3_LateMotion；记录用户原话并推送。
- [ ] 从真实条目读取完整P/M/组合层和rtBallistic(P).T，保存来源哈希。克隆为CSLTC/CSLTS，名称标“扰动测试副本”；在独立实验页打开。

### Task 2：最小末段测试
- [ ] 只替换rtWorldDraw中的火花位置和速度求值；t<=ball.T保持原表达式，头部绘制不改。燃尽后0.4s渐入，首试气流0.6m/s、空间相位尺度1.5m；不追求夸大差异。
- [ ] 常量空气速度下用原线性阻力解析式逐步积分，在中点更新空间/时间相关场。步长1/60s及1/120s比较；强度0必须原样。
- [ ] 原样/试验各导出Comet组合和Silver两平台包；核对参数相同、前段和Comet红头贴图不变，评估燃尽后0.3–1s。

### Task 3：展示和收尾
- [ ] PC/手机实际贴图回放检查；同时间、同世界取景播放，标清非UE实测，标准若失败不得写通过。
- [ ] 输出一个推荐实验对照页和简短结论：是否值得正式接入、源码认领现状。保存实验版本/哈希，释放认领，安全合入并同步本机。
