# HTTP验收与原导演测试 Implementation Plan

> **For agentic workers:** 当前会话按步骤执行；不派生代理。

**Goal:** 接续剩余checklist，以HTTP完成浏览器检查，原导演受控导入并恢复配置。

**Architecture:** 8034读取tool/FireworkBaker.html及同目录data；编排检查使用8025/release的隔离qa键。UE沿用已有GPUECli与导入器，先备份当前导演，在停止状态执行实际三表导入/读回，最后恢复原配置。没有file浏览器测试要求。

**Tech Stack:** 现有Python/Node/React/Vite、Browser Use、GPUECli。

## Global Constraints

- 用户最新明确：不用file测试；原导演测试，不复制新导演，UE资产不上传。
- 不占用tool/src、不改正式艺术/配方；只在HTTP界面限定检查。任何原生实播条件不成立时准确记录。
- 先备份原DefaultConfig，确认未运行再写；逐档读回，保留其他字段；结束恢复、读回原配置。
- 浏览器个人数据按origin隔离，不能把HTTP保存成功说成file历史已迁移。

### Task 1: 信息文件与HTTP保存恢复

**Files:** FXtools/README.md、FXtools/工作台checklist.md、analysis/results/HTTP_ACCEPTANCE_20261010。

- [x] 对8034 HTML及4个实际data/*.js请求逐字比较磁盘文件，确认共享同一产物和信息文件。
- [x] 对8034打开/层选择/播放/时间轴/交付状态检查，不保存或覆盖正式效果；截图记录。
- [x] 对8025/release隔离qa节目实际导入、改名保存刷新、音乐重导入、三档/时间轴/模板状态和1024/局部键盘检查。
- [ ] 本轮下载文件往返未取得下载路径；完整只读备份已落盘，既有磁盘往返证据保留，不能冒称下载事件通过。
- [x] 以用户最新要求替换file免测事项，保留真实未完成的旧数据迁移及完整200%/键盘读屏边界。

### Task 2: 原导演受控验证

**Files:** 仅新增验证脚本/结果/记录；不改现有UE资产源码或资源。

- [x] 用现有`readDirector`读真实原导演和PointId，完整DefaultConfig备份落盘；检查bShowActive与实际世界状态。
- [x] 用现有`compileDirector` / `ueText` / `executeImport`检查实际节目与三档；仅在原导演测试，按现有确认UI导入并读回保存。
- [x] 旧Typing函数不可调用，改用已观察的原生预览/停止按钮，记录高配3尾缀+3球花实际触发。未做真实花高/直径视觉标定。
- [x] 恢复原Blueprint并保存，恢复原关卡实例但不保存测试关卡；完整DefaultConfig读回一致，精简证据公开，完整备份留本机。
- [x] 提交推送checklist和交接，保护个人节目和其他对话的文件；远端状态核实后报告。
