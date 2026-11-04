# 同名迭代、勾选与素材目录修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 在同一 D 盘 HTML 中区分新建与同名更新，全部重建更新目标的发射器，允许取消任意未完成项，清楚指出错误目录。

**Architecture:** 保留既有灰黑绿界面、资产命名和其它四个工具。将目标快照、文件备份及更新保护封装在 fireworks-update.js；fireworks-import.js 仍是网页与维护脚本共同调用的唯一导入实现。

**Tech Stack:** 单文件 HTML、原生 JavaScript、UE 4.24 原生属性接口及 Python 2.7、Node/jsdom 隔离检查。

## Global Constraints

- 私有源码与真实路径只保存在 D:/FXTools/DFWorkbench；不触碰共享 tool/src。
- 保持原粒子系统对象与路径；发射器全换，原手动模块在明确更新预览中说明会被替换。
- 当前用户资产只读；真实写入验证仅针对独立临时测试资产。
- 创建全部有效新发射器后一次替换 Emitters 引用；不让有效系统经历空发射器数组，保留非空 LOD。
- 覆盖前备份原物理文件，保存及版本管理添加/编辑均需读回；锁定、离线、类别不符、确认失效时先停止。
- 浏览器 file: 访问被安全策略拒绝；不绕过，不声称已完成真实浏览器视觉审查。

### Task 1: 选择、错误提示和版本

**Files:** fireworks-ui.js、fireworks.html、shell.html、build.py；检查 check-import-iteration.cjs。

- [x] 添加真实失败检查：`assert.equal(errorRowCheckbox.disabled, false); errorRowCheckbox.click(); assert.equal(errorRow.selected, false)`，并验证旧版失败。
- [x] 取消勾选与能否执行分开：`if(locked()) return; r.selected=e.target.checked`；执行使用所有已选未完成项，任何未检查项阻止整次执行。
- [x] 添加取消全部勾选、详情编辑目录、已完成直接准备更新；`prepareUpdate(id)` 原行转换为 mode=update，名称不改、确认作废。
- [x] readPack 返回目录是否存在、cascade 是否存在及一级候选目录；错误提示给路径按钮，不自动选错误效果。
- [x] 标题和页头版本统一从 `VERSION` 生成，检查两处同为 v2.7；生成后确认原工具哈希不变。

### Task 2: 更新计划和确认

**Files:** 新建 fireworks-update.js；修改 build.py、fireworks-ui.js、import-backend.cjs；检查 check-import-iteration.cjs。

- [x] 实现 `readUpdateTargets(item)` 返回 key/pkg/class/tag/磁盘哈希/发射器引用及参数指纹；`validateUpdateTargets(item)` 返回具体冲突，既有类必须匹配，粒子系统必须存在。
- [x] 计划指纹加入 mode 与目标快照；名称预览逐项显示新增、更新或全部重建及旧→新发射器数量。
- [x] 执行前重新读取源参数、源图片哈希与目标快照，任何差异要求重新预览，不使用旧确认。
- [x] 模拟检查包含已完成重新更新、同名新建拦截、混合未检查勾选拦截、切模式失效、目标变化和并发重名。

### Task 3: 唯一导入器中的更新

**Files:** fireworks-update.js、fireworks-import.js；检查 check-import-update-backend.cjs、既有 recovery 检查。

- [x] `prepareAssetUpdate(item)` 先复制原磁盘文件，再保存目标当前状态并备份到 D 盘唯一任务目录，记录 manifest；为已存在资产迁出/编辑，不强制解除他人锁。
- [x] 贴图 replace_existing=True；已有 MI 对象清空旧覆盖参数并从已有示例复制基础覆盖值，再写当前素材参数；不新增母材质。
- [x] `importEmitters(item, PS, matObj, startIndex=0, attach=true)` 返回完整 emitterPaths；attach=false 时不写 live Emitters。
- [x] `swapEmitters(PS, newPaths)` 核对有效非空 LOD、Required、Spawn 后一次赋值，读回数量和路径；失败在可恢复的连接下换回旧引用，并提示文件备份。
- [x] 阶段保存支持 added / checked-out 两种状态，失败区分依赖更新与粒子替换，给出备份路径。
- [x] 在独立 native 测试系统验证两轮导入同路径、贴图替换、MI 参数清理、发射器不会重复和失败保留旧结构；当前用户系统指纹前后相同。

### Task 4: 集成交付

**Files:** README.md、CHANGELOG.md、使用说明.txt；公有脱敏记录和交接。

- [x] 运行当前所有隔离检查及新更新检查，保存结果；不触发用户资源的实际更新。
- [x] 同路径生成 v2.7 并确认桌面快捷方式，保留修改前备份。
- [x] 记录 UI 证据限于用户截图与隔离 DOM；原生结构验证不当作画质或长期稳定性验收。
- [x] 私有文件仅存本机，公有记录安全 rebase/push；回答三个问题及新报错的明确修正步骤。

## 2026-10-04 原生验证补充

- 初始结构测试2→3及失败保留通过，打开Cascade时仍崩溃；未把结构成功当作可打开证明，暂停更新入口并请求用户处理重启/恢复。
- 用户明确已重新打开并处理恢复提示。真实DLL导出符号定位TurnOffSoloing；显式读取隐藏SoloTracking，确认独奏缓存需随发射器及LOD同步。Python常规属性和默认原生属性列表都不展示这个字段。
- 回归先复现缓存长度仍2而新发射器已1的失败。整块文本/JSON写入会返回成功但内部字段为空；改用已验证的嵌套容器操作，先追加有效设置再移除旧值，替换前缓存覆盖全部活跃索引，替换后缩减余项并读回。失败和回滚同样维护缓存。
- 修复后原生1→3（含GPU）、3→1、新建2个发射器以及故意模块失败保留旧列表，均在当前会话成功打开/关闭Cascade。同名贴图16×16→32×16与旧MI标量9恢复示例16已核对；当前用户烟花每轮前后文件与参数一致，不声称其他未保存内容未受崩溃影响。
- 当前仅支持完整单级LOD，多级/缺失LOD在备份和依赖写入前阻止。4个自建测试资产归档到私有研究目录并移入单独的未提交测试清单；未提交P4，不混进默认清单。
- 实际中型包只读核对：10个发射器、5张贴图存在。目录选择按钮可从总目录定位具体效果，不自动执行。
- 最终209组隔离检查通过。浏览器安全策略仍不允许file页面访问，未做实际浏览器视觉验收；当前任务是工具写入与交互修复，不是烟花画质验收。

完成交接：2026-10-04，脱敏记录已推送main，提交42a77c8；私有源码/证据只在D盘。
