# 工作台云端往返与离线恢复 Implementation Plan

> **For agentic workers:** 按本清单在当前会话逐步执行；不调用未安装技能，不派生代理。

**Goal:** 验证云端构建回传、本机固定入口同步，明确真实离线覆盖恢复的完成边界。

**Architecture:** 手动 GitHub Actions 从仓库拉取唯一源码，在 Linux 隔离环境补构建环境信息并跑发布检查。回传两处源码及固定成品，经本机审查后提交 Git、本机拉取和同步。离线 file 浏览器操作受安全策略阻止，另做数据文件往返和覆盖保护检查，保留真实 file 待验。

**Tech Stack:** Git、GitHub Actions、Node 20、Python 3.12、现有 React/Vite 与发布脚本。

## Global Constraints

- 不改烘焙器 tool/src，不写 UE，不覆盖用户节目、音乐或其他会话修改。
- 不以 HTTP 或模型测试冒称真实 file 浏览器验收，不绕过 file URL 拒绝。
- 云端任务只读仓库，手动触发；无公开托管、凭据上传或定时任务。
- 8025 / 固定离线 HTML 共用 tool/workbench；8034 直接读 tool/FireworkBaker.html。

### Task 1: 云端往返与入口来源

**Files:** `.github/workflows/workbench-roundtrip.yml`、`tool/offline-workbench/build.mjs`、`tool/offline-workbench/tests/package.test.mjs`、`FXtools/README.md`。

- [x] 添加 workflow_dispatch：检出 tool，安装锁定依赖，在云端给构建清单增加 platform/node/arch，并追加结构检查；跑 `npm run release -- --no-deploy`。
- [x] 下载只包含源码和4个工具成品的 artifact；检查 Linux 回执、源码差异、原 HTML 指纹和 ZIP 内容；提交回传内容。
- [x] 主工作区安全拉取后运行 `python -X utf8 tool/workbench/release.py --deploy-only`；核对 F/D 固定文件和 `8025/release/` 同字节。
- [x] 8034 实际进程为 F:/FireWorksLab/tool/local_delivery/service.py；HTTP 与 tool/FireworkBaker.html SHA256 同为 cfc2b5245043d6d1d5bd8595e2c7ad6e13ab4f5c47374e9bc143d3ac10e032b8。

### Task 2: 覆盖和节目文件恢复

**Files:** `analysis/results/WORKBENCH_ROUNDTRIP/`、`FXtools/工作台checklist.md`、`对话记录/对话框24.md`。

- [x] 使用隔离副本验证同名工具覆盖只动4个文件，个人节目文件和音乐字节不变。
- [x] 用真实格式、个人自建库及内嵌音乐测试 packProject / preflightProject / programme-save 保存恢复；不把内存适配器当真实浏览器数据库。
- [x] 记录 file 浏览器被安全审查阻止：当前工具只允许 HTTP/HTTPS，不勾选真实 file 覆盖恢复和 D→F 浏览器迁移。
- [x] 更新真实结果与剩余项并推送，不混称执行完成、限定自检和用户验收。
