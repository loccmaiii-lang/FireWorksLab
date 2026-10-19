# 导入登记 Error 87 修复计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. 本轮按用户授权在当前会话内执行，不派发子代理。

**Goal:** 消除累计贴图证明导致的 Windows 命令超长，并让资产写入和交付登记的结果准确可辨。

**Architecture:** 保留现有 UE 导入、命名、选择、版本管理和登记协议。私有桥接启动固定长度的 Python312 命令，证明 JSON 走 stdin；Python2.7 使用 communicate 同时写入和读取，避免管道阻塞。登记故障保留原始保存回执和明确阶段，不伪报粒子未完成。

**Tech Stack:** 私有 JS → UE Python2.7 → Python3.12；Node VM 隔离接口测试、Python unittest、现有 HTTP 8034。

## Global Constraints

- 不创建新目录，不写 UE、P4、用户浏览器存档或真实资源登记。
- 原资产、未跟踪文件及 overdraw_run.mjs 他方改动保留；私有源码和原始日志不进公共 Git。
- 不改烘焙器渲染/命名/素材和贴图规范，不因数据增长清理历史证明。
- 本机浏览器先用 HTTP 预检核对 8034 根目录，禁止用别的入口绕过拒绝。

## Task 1: 固定复现与输入传输

**Files:** 私有 `delivery-contract.js`、`delivery-preflight.py`、`check-delivery-preflight.py`；新增平铺 `check-delivery-transport.cjs`。

- [x] 从真实日志确认启动命令长度；生成大于 64 KiB 的模拟证明。
- [x] 隔离执行实际桥接 JS，断言 `command` 不含证明正文、包含 `--proofs-stdin`、UTF8 输入逐字节一致；先运行确认旧代码失败。
- [x] Python CLI 加互斥 `--proofs-stdin` / 旧 `--proofs`，先解析并验证对象，再调用登记；无效 JSON 和非对象不得写文件。
- [x] JS 改为 `stdin=subprocess.PIPE` 与 `process.communicate(payload)`；payload 以 base64 解码成 UTF8 字节，避开旧路径字符串转义函数。
- [x] 引擎 Python2.7 独立进程实际启动 Python3.12，传入超长和中文证明；不加载 Unreal。

## Task 2: 收尾阶段与反馈

**Files:** 私有 `delivery-contract.js`、`build-delivery.py`；隔离 `check-delivery-transport.cjs`。

- [x] 独立交付产物内，把原生完成日志改为“资产写入完成，待交付登记”；登记返回 ok 后才记录交付完成。
- [x] 登记失败挂接 `importProgress.stage = 交付登记`、`assetsCommitted = true`、真实 saved/added/edited 计数，错误说明不删除或重编号；不将已保存的粒子说成未完成。
- [x] 测试预检/原生写入失败不进入登记、登记失败不重导、成功顺序唯一，原始工作台的编译 importOne 不变。

## Task 3: 部署与交付

**Files:** 私有 `build.py` 交付构建版本 2.29、CHANGELOG；旧工作台成品原样保留。本仓库对话框5、交接与脱敏检查记录。

- [x] 仅构建并部署独立交付；旧工作台保持改前原字节。跑邻近选择、更新、版本管理、归属与交付回归。
- [x] 8034预检通过后核对 /importer 内容与实际产物哈希；用隔离浏览器存储和模拟UE响应验证页面失败反馈，不调用真实导入。
- [x] 提交本任务脱敏记录/可复用回归入口，正常门禁推送；私有改动只留本机备份与部署。
- [x] 记录未做真实UE整包导入/实播，不把隔离验证当用户验收。

## 执行补充

- [x] 后续阶段补齐可恢复入口：`deliveryRegistrationOnly`严格区分全量保存与部分写入；`retryDeliveryRegistration`只复核后登记，不调用importOne，不迁出/保存/重建资产。
- [x] 浏览器刷新兼容旧Error87的完整保存回执；任何名称/源/目标/贴图保存哈希变化继续拦下。缺少确证的部分任务沿用原检查恢复，不猜测完成。
- [x] 只读复核脚本在真实引擎Python2.7下用隔离UE/文件桩执行；脏包/缺失/来源错误均在登记前阻止。

初次旧呈现检查在2.28与2.29均失败：旧夹具缺少现在必需的手机name与交付门响应，不是本轮产品回归。补齐明确的手机配置/原生保存回执，并新增登记失败断言后15项通过。一次真实Windows旧错误复现夹具含中文触发独立Python2.7 ASCII编码限制，改用与实案相同ASCII旧命令；新stdin中文/转义检查保留。恢复HTTP夹具最初指向空白初始批次，改为按active定位；不是生产逻辑变更。
