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
- [ ] 对8034打开/层选择/播放/时间轴/交付状态检查，不保存或覆盖正式效果；截图记录。
- [ ] 对8025/release隔离qa节目导入、保存刷新、文件下载往返、三档/时间轴/模板状态及窄屏/键盘检查。
- [ ] 以用户最新要求替换file免测事项，保留真实未完成的浏览器导入和旧数据迁移边界。

### Task 2: 原导演受控验证

**Files:** 仅新增验证脚本/结果/记录；不改现有UE资产源码或资源。

- [ ] 用现有`readDirector`读真实原导演和PointId，完整DefaultConfig备份落盘；检查bShowActive与实际世界状态。
- [ ] 用现有`compileDirector` / `ueText` / `executeImport`检查实际节目与三档；仅在原导演测试，按现有确认UI导入并读回。
- [ ] 根据已有导演公开调用能力与现场状态检查实播；不猜函数、不启动可能影响正式世界的播放。
- [ ] 不论测试结果，核对已知变更后恢复原DefaultConfig并读回；记录实测/未测及待验原因。
- [ ] 推送checklist和交接，保护个人节目和其他对话的文件。
