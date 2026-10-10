# 编排工作台单一源码与离线交付 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. 本会话未提供这两项技能，按用户“执行落地”在当前会话逐项执行，不另派任务。

**Goal:** 日常使用固定离线 HTML；完整源码进 Git；8025 开发、离线交付和云端修改消费同一份源码。

**Architecture:** 将当前 v16 完整源码、必要测试与数据移入 `tool/workbench/`，保留既有业务代码和存储标识。现有 `tool/offline-workbench/` 负责单文件构建；8025 的 `/release/` 直接返回产物原字节。固定更新脚本只覆盖工具文件，不读取、迁移或覆盖个人节目。

**Tech Stack:** React 19、Vite 6、Node.js、Python 标准库、单文件 HTML、Git。

## Global Constraints

- 用户日常固定路径和离线 IndexedDB 名称、v1 草稿键不变。
- 不建设在线预览；不部署已有 Site；不自动向 UE 写入。
- 云端 GUI 未知：可运行源码和本地 HTTP，自检不能声称真实云端或 file 协议已验证。
- Git 同步程序/显式提交的节目文件；浏览器个人草稿不随 Git 自动同步。
- 不修改烘焙器、导入器业务或他人未提交文件；提交遵循本轮用户授权规则。

### Task 1: 完整可移植源码

Files: 新建 `tool/workbench/{src,public/data,server,tests,package.json,package-lock.json,vite.config.js,index.html}`。

- [x] 复制当前 v16 实际入口与全部依赖，历史对照模型移到 `tests/fixtures/legacy/`，移除测试写入旧草稿目录的副作用。
- [x] 用 `npm ci` 在仓库路径安装；`node --test tests/*.test.mjs` 验证三档、版本、节目往返、复制编排等已有检查。
- [x] `npm run build:app` 只生成本地构建，不调用 `prepare-sites-build.mjs`。

### Task 2: 单次离线构建、固定发布与原字节走查

Files: 修改 `tool/offline-workbench/release.mjs`；新建 `tool/workbench/server/release-preview.mjs`、`tool/workbench/release.py`、配套测试及命令入口。

- [x] 测试 `/release/` 返回产物的完整字节，禁止缓存和写请求；检查失败不得覆盖旧产物。
- [x] `npm run release` 执行核心测试、构建、离线检查，再制作固定名字 ZIP；默认使用仓库示例，不打包音乐。
- [x] `python tool/workbench/release.py --deploy-only` 校验构建指纹后复制固定 HTML/清单/说明/ZIP，个人 `.dfshow` 和音乐不纳入覆盖列表。
- [x] 本机目标目录配置写到用户目录，不写死进可移植源码；开发启动默认指向仓库源码。

### Task 3: 切换真实入口与记录

Files: 修改 `tool/local_http/service.py`、相关说明；更新协作流程、对话24、交接5节、状态清单、仓库梳理。

- [x] 确认旧8025进程身份后切换至仓库源码，保留原D盘源码作为历史备份。
- [x] 浏览器检查8025与 `/release/`、节目/模板入口；核对HTTP产物与固定D盘HTML的SHA256相同。
- [x] 记录完整源码路径、云端命令、拉取后更新命令、草稿隔离和未验证项。
- [x] 仅提交本任务文件；用户最新明确项目已授权范围内改动无需再次确认。实现与限定自检不等于用户验收。

### 用户最新调整：工作区 FXtools 统一入口

- [x] 以 F:/FireWorksLab/tool/workbench 为唯一源码；FXtools 提供固定离线包和操作入口，不复制第二套源码。
- [x] release.py 默认发布到仓库 FXtools/烟花编排工作台；本机原 D 盘交付目录作为兼容镜像继续同名覆盖。
- [x] 切换8025/8036回F盘，验证HTTP产物、F/D离线文件一致；不移动浏览器数据。
- [x] 更新所有当前维护说明，D盘独立克隆只作备份，不再使用。
