# Ultra 分支上传与本地清理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 上传独立 Ultra 分支，并按用户确认删除首次安装脚本、移除 PROGRESS 本地参数格式段落。

**Architecture:** 先在最新 main 清理已指定文件与失效说明，再用独立工作树创建 ultra 分支，保留原工作区的完整实验素材。用户已选择仅上传代码、配置、文档约 20.8 MiB；不上传生成素材，不启用 Git LFS。

**Tech Stack:** Git、Git LFS、Python、PowerShell、Chrome/WebGL2。

## Global Constraints

- 用户已明确要求删除 `analysis/local/首次安装.bat` 文件。
- PROGRESS 参数格式段落只在本地、未提交；删除该段后保留最新远端进度。
- 原 `experiments/ultra-baker-3.6` 及其生成素材保留，不删除其他实验版本。
- 原工作区保持 main；Ultra 使用独立工作树和 `ultra` 分支。
- 不上传 `.deps` 本地下载的 ffmpeg、Python 缓存和本机运行库。
- 上传范围已由用户确认：代码、配置、文档；不上传 PNG、EXR、视频、ZIP、浮点素材和本机依赖。

---

### Task 1: 用户指定的清理

**Files:**
- Delete: `analysis/local/首次安装.bat`
- Modify: `analysis/local/使用说明.md`（直接给依赖安装与显卡检查命令）
- Modify: `交接.md`、`仓库梳理.md`、`更新记录.md`
- Local cleanup: `PROGRESS.md`（移除未提交段落；已恢复并同步远端）
- Build: `tool/FireworkBaker.html`

**Interfaces:**
- Consumes: 用户确认删除脚本；原命令 `pip install -r analysis/local/requirements.txt`、`python analysis/local/run_jobs.py --check`。
- Produces: 最新 main 不再包含首次安装脚本；安装流程无失效入口。

- [x] 读取本地 diff，恢复仅本地新增的 PROGRESS 格式段落，快进到远端 `01f1378`。
- [x] 删除脚本，把使用说明改为从仓库根目录执行两条原命令。
- [ ] 更新当前交接和目录说明，构建主线 HTML，检查只删除指定文件并提交、推送 main。

### Task 2: 独立上传 Ultra

**Files:**
- Create: Ultra 目录的分支上传说明与 `.gitignore`。
- Upload: `experiments/ultra-baker-3.6/` 的代码、网页、配方、配置、文档。

**Interfaces:**
- Consumes: 最新 main 的清理提交；用户确认的代码、配置、文档范围。
- Produces: `origin/ultra`，原工作区保持 main 与全部本地资源。

- [ ] 从已同步的 main 创建独立工作树和 `ultra` 分支，复制已选择的文件。
- [ ] 将实际上传范围、未上传素材与打开方法写到 Ultra README。
- [ ] 检查工作树无本机依赖、缓存或敏感配置；构建实验 HTML、打开网页并检查控制台。
- [ ] 提交，推送 `origin/ultra`；核对远端提交及上传文件范围。

### Task 3: 完成记录

**Files:**
- Modify: `交接.md`、`仓库梳理.md` 与本计划的完成状态。

**Interfaces:**
- Consumes: 远端已确认的 Ultra 提交号。
- Produces: 明确分支链接、上传体积、本地素材保留位置，以及清理完成状态。

- [ ] 主线记录 Ultra 分支已上传、入口与素材处理方式，并推送这份记录。
- [ ] 确认原工作区 main、原实验目录完整、指定脚本不存在、PROGRESS 不再含新增参数格式段落。
