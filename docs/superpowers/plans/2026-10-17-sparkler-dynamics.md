# 仙女棒动力学与分叉控制 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 仙女棒出现快抛慢落与轻气流，并统一控制整体和各代分叉。

**Architecture:** 数据试配复用SparkGraph和SparkFlow；统一倍率在构建有效层时应用一次。新控件等4.9.113释放tool/src后接入，不覆盖其导出规则。

**Tech Stack:** 原生JS、Python参数生成、Node/Edge HTTP检查，现有RGBA序列与Cascade。

## Global Constraints

- 保留13形态、用户原存档、尾焰候选、统一右栏、可选镜头成像、UE既有材质。
- 新倍率默认1；子孙数量不逐级复乘；原值不回写；不改播放速度制造快慢。
- 本机页面先跑HTTP预检，验证实际版本；不把研究数值当用户已确认需求。
- 源码共享单写；当前113认领期间只写独立数据/脚本/研究文档。

### Task 1: 数据运动候选

Files: `analysis/scripts/sparkler_motion_prepare.py`、`sparkler_motion_probe.cjs`、`analysis/results/SparklerMotion/`。

- [x] 保留数量/尺寸/亮度/形态/爆发时刻断言；生成独立P/M副本。
- [x] 主层初速分布拉开，阻力按形态区分，重力产生弧线；保留固定随机流。
- [x] 同取景5时刻、速度分位与动量衰减诊断；不只看一张静帧。
- [x] 正式HTTP入口内部导出PC/手机、回放检查、原生配方文件载入验证。

### Task 2: 源码释放后的八项控制

Files: `46_graph_model.js`、`10_types.js`、`71_panel43.js`、命名表和参数变更记录。

- [ ] 新增整体初速/重力；分叉延展/张角/数量/尺寸/初速/重力。含义按本轮原理文档。
- [ ] 分叉角从原方向相对母粒速度旋转，1快速返回原方向；零母粒速度取配置轴。一级数量改变时，二级只随父数量变化。
- [ ] 纯模型默认1逐位一致、无源参数写入、亲子接续、独立控制及无子粒失效测试。
- [ ] 统一面板保存/撤销/刷新、PC手机包、标准与变更回归；升版本和记录，才合入并释放。

当前执行在本会话内，不委派子代理。Task2受共享源码占用约束，不能拿数据试配冒充已实现。
