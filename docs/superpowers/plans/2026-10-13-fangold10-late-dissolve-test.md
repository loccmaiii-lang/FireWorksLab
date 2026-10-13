# FanGold1.0 燃尽后扰动测试 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.
> 本次按用户明确授权在本会话执行参数复制与隔离测试；不派生代理，不新增生产能力。候选方案不等于批准实施。

**Goal:** 复制用户 FanGold1.0 到 FC6O，测试保持前段和亮头、只让燃尽后尾部气流渐入的视觉收益。

**Architecture:** 生产条目只复制现有 P/M。隔离副本读取同一真实渲染器，在主星全部燃尽后对火花施加随时间变化的局部空气速度；先接续原轨迹的末段状态再积分，不重新扰动前段。对照导出使用现有材质与帧号，不改 UE 或共享源码。

**Tech Stack:** JavaScript/WebGL、既有 Python/Playwright 本机 GPU 工具、RGBA 序列/Cascade。

## Global Constraints

- 前段和亮头保持原样，燃尽后的尾巴才逐渐扰动消散。
- FanGold整面合并，不按簇拆开；PC/手机及原材质/帧号/分辨率标准保持。
- 用户原保存项只读；Comet/Silver不改；tool/src归导出（23）。
- 新增控件/物理实现属于候选，隔离试验不能标成生产功能或用户通过。

### Task 1：保存来源与复制基线

Files: `analysis/我的配方/my_fxmv6o6z8x/*.json`（只读）、`analysis/results/FC6O_FanGold10/`、`analysis/原理/FC6O_FanGold参数.json`、`analysis/scripts/扇形彗星条目.py`（条目说明）。

- [x] 存原字节、SHA256、原FC6O参数；在状态清单认领效果测试，不认领tool/src。
- [x] 对完整P/M逐字段复制，生成FC6O数据；只改变说明，不自动改用户速度、寿命、重力。
- [x] 用真实导出入口生成基线PC/手机包，核对其参数与保存项一致。

### Task 2：隔离末段试验

Files: 本机忽略目录 `analysis/local/CS3-FanGold10/`；结果 `analysis/results/FC6O_FanGold10/`。

- [x] 以实际主星最大燃尽时刻为阶段起点，试验空气速度0.6m/s、空间尺度1.5m、0.4秒渐入；零增益作为对照。不增加新粒子、亮度或寿命。
- [x] 同一次烘焙器构建、同P/M、同种子/取景渲染0.5/1/1.5秒与末段关键帧，前段图像哈希必须相同。
- [x] 使用实际非零平方阻力和线性阻力；新气流只对末段存活火花起作用，逐粒接续位置速度。检查积分步长减半后的误差，再决定候选是否有足够证据。
- [x] 在PC/手机实际输出规格下看正常30fps取整回放；若新增动态不可见、变成散点或前段变化，报告失败，不交付为已完成能力。

### Task 3：交付边界

- [x] 提供基线与试验对照页/关键帧、复制差异、实际输出检查及看法；FC6O生产项明确是用户参数基线。
- [x] 给出物理解释及首选控制：强度、开始偏移、渐入；空间尺度先固定为试验值，不默认多加旋钮。
- [x] 记录新能力若入库必须先过参数约定与源码认领；本轮不借测试扩大为整个空气模拟系统。

执行修正：全扇最后燃尽太晚，依据第一轮实测补各自主星燃尽起点。非零方案的整帧前段只在首颗燃尽之前要求相同；仍燃烧的头和所属尾巴不动。测试执行完不等于通过：完整不通过项及正常回放收益有限见看法.md。生产新功能未实施，方案控件仍为候选。
