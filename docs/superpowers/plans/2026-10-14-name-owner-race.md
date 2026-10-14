# 命名归属与异步切换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打开加载中的GlitterChry再切Tiny，所有名字与配置都属于Tiny；旧任务无法重新提交身份、图层或参数。
**Architecture:** 一个打开代次和来源键组成有效性闭包，传到组合的异步构建，检查每个await后的发布；当前私有对象键优先。名称读取以对象存储/配方为准，保存与恢复默认同步记录，显示更新不依赖旧烘焙参数。
**Tech Stack:** JavaScript现有控制器、Node vm、Python既有构建/离线标准。

## Global Constraints

- 不改模拟、渲染、烘焙数学、艺术参数、UE和私有导入器；不新建目录，不清空浏览器存档。
- 手动英文名即最终名，不能按花型猜名称是否错误；原参数与其他效果保存名保留。
- 101本轮占用，23其它功能从102接并保留97/100/101。file实页限制不绕行。

### Task 1: 异步打开归属

**Files:** 79_library.js、70_ui.js的三个组合装载函数、79_myfx.js、18_multitypes.js、79_workbench.js版本打开。

- [ ] 新检查analysis/scripts/命名归属切换检查.cjs先执行真实openComboEntry和wbKey，旧任务延迟完成后断言当前my:Tiny不变；再覆盖真实applyCombo与图层加载不提交旧参数。
- [ ] 定义libOpenGuard()，捕获lib打开代次和key；beforeOpen/keep打开/版本切换递增代次。每个await后及设置review/列表/参数前校验；applyCombo(c,{current})只在有效时发布，过期自有烘焙释放，已存在共享烘焙保留。
- [ ] 检查多层模板、我的多层、单层、正式库、版本、延迟保存及同键重开；旧任务结束不能刷新当前旧身份提示。

### Task 2: 命名一致性与落地

**Files:** 61_naming.js、79_workbench.js、79_myfx.js；测试与离线标准。

- [ ] 真实renderDeliv/保存名称/恢复默认/packNamesFor/实际配置生成在同一隔离上下文核对；包括保存名不加尺寸、默认重开不复活旧名、旧烘焙不能改变名称来源。
- [ ] 当前my/tpl身份先于旧review；单层默认名称由当前对象参数/配方求取，列表/右栏/交付同源。手动名称保存和恢复默认同步配方记录，读取/另存不复活已重置名字；显示更新失败不留下另一对象清单。
- [ ] 新回归接标准离线入口，保留21单层/17身份/仓库读取；构建101和保护源哈希、记录白名单提交推送。旧检查桩失败与真实点击/UE未验如实记录。
