# Ultra Three.js Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 在独立分支提供可以操作、烘焙和同步对比的 Three.js Ultra 实验版。

**Architecture:** 从现有 Ultra 源码生成只读物理与 shader 模块；Three.js 自己管理几何体、材质、浮点目标和绘制，不调用旧 WebGL 绘制器。用同参数的旧 Ultra 作为同步对照，单独提供逐粒子余烬实验模式；烘焙先在线性光中平均，再编码并打包 RGBA。

**Tech Stack:** Three.js 0.186.1 / WebGL2 / ES modules / Node.js / Python 静态服务器 / Playwright。

## Global Constraints

- 分支 `codex/ultra-threejs`，目录 `experiments/ultra-threejs`；原 Ultra 和主线效果保持可用。
- 上传代码、配置、文档；截图、纹理和大素材留在本地输出目录。
- 物理积分沿用 1/480 s；Three.js 和高分辨率本身不代表化学或造型更准确。
- 灰度引擎输出至少 2048 px，RGBA 四通道接力，帧号取整，无帧间混合。
- 4K 静帧与线性 HDR 读回、2K/4K 母版、实际烘焙贴图回放必须可验证。

### Task 1: 可复用的源数据与轨迹

**Files:** `experiments/ultra-threejs/package.json`, `scripts/sync-ultra.mjs`, `src/generated/core.js`, `src/generated/shaders.js`, `presets.json`, `src/tracks.js`。

**Interfaces:** `buildTrack(P, maxTextureSize) -> {positions, velocities, info, Ns, dt, M, nStars, total}`；轨迹只包含星体，火花在 GPU 根据编号和出生时刻解析求解。

- [x] 生成源模块；记录源文件与 SHA256，输出不包含缩略图或实拍二进制。
- [x] Node 测试同一 seed 的轨迹、1/480 s 积分、子花出生时刻、独立火花寿命；固定测试点校验原 Sim 的位置。
- [x] 使用 worker 生成长轨迹，明确显示加载状态，重复切换销毁旧数据和 GPU 资源。

### Task 2: Three.js 高精度预览与同期比较

**Files:** `src/renderer.js`, `src/main.js`, `index.html`, `style.css`, `src/legacy-bridge.js`。

**Interfaces:** `Renderer.load(recipe)`, `Renderer.render(time, options)`, `Renderer.dispose()`；所有参数与时间由一个 UI 控制。

- [x] 将高斯点、GPU 火花、连续尾丝及三档升空尾缀移植到 RawShaderMaterial 和 BufferGeometry / InstancedBufferGeometry。
- [x] 以 RGBA16F 目标保存线性光，独立设置实际像素分辨率、超采样、快门、光晕与曝光；界面显示实际分辨率。
- [x] 接通金芒菊、鸿巢 V14、片贝 V13、V5 三档尾缀和基础空中花型；切换到旧 Ultra 用相同时间、取景、参数，区分引擎对比和模型实验。
- [x] 独立余烬模式每粒子拥有稳定出生时刻和寿命，不按整根尾丝销毁；标注为模型实验，不称化学配方已验证。
- [x] Playwright 在多个固定时刻检查无浏览器 / shader / GL 错误；截图观察星头、尾迹与末段消散。

### Task 3: 真正的烘焙和交付

**Files:** `src/bake.js`, `src/export.js`, `tests/browser.cjs`, `README.md`, `交接.md`, `仓库梳理.md`, `更新记录.md`, `PROGRESS.md`。

**Interfaces:** `bake(renderer, settings, onProgress, signal) -> {pixels, metadata}`；下载 PNG 原始 RGBA 数据，PNG 的 Alpha 通道就是第 4 组帧，不能经过 Canvas 预乘。

- [x] 烘焙 64/128/256 帧；选择合适矩形格子，线性空间时空平均后编码，R 全格→G→B→A。
- [x] 实際导出贴图通过 Three.js DataTexture 回放；烘焙可取消，参数更改后标为过期。
- [x] 导出参数和帧号时间表、4K PNG 静帧、线性浮点 HDR 文件；记录粒子数、实际像素、资源规模与限制。
- [x] 自动验证四通道非空、帧顺序、PNG Alpha 原始字节、资源释放、取消、静帧 4096 px 与烘焙回放。
- [x] 更新独立实验交接，提交并推送新分支；打开预览给用户查看。

计划在当前会话内执行；用户已授权新分支实现，无需再次询问执行方式。

## Execution result

2026-09-30：实现与自动验证完成，7 项单元测试、6 个研究效果关键帧、11 个基础 / 地面 / 倒影效果、实际 UI 下载、4K 与 HDR 均通过。尾迹背面剔除已修复；视觉截图本地复核。范围与正式 UE 导出限制记录在实验 README。
