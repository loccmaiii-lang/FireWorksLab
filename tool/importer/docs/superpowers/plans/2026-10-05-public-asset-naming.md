# 正式资产命名修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 实际HTML的命名规划使用包内正式asset而非内部键，保留历史更新目标和源键绑定。

**Architecture:** fireworks-plan.js是唯一目标规划器。新任务采用formal命名策略，旧完成/失败/更新任务保留legacy策略；策略与名称共同参与确认签名。贴图优先使用显式asset，MI由关联主贴图正式名去除网格生成（也支持显式material.asset）；无asset的旧包继续既有规则。原生importOne只消费确认过的assets，不增加第二套命名。

**Tech Stack:** 单文件HTML、原生JavaScript、Node vm/jsdom隔离检查、Python构建。

## Global Constraints

- 私有代码、项目路径、原始包与截图只留 D:/FXTools/DFWorkbench/workbench，不提交公共仓库。
- 保留最新v2.11呈现和原生导入、Pivot、preRoll、暂存替换、SoloTracking及阶段保存源码。
- 新命名不自动重命名/迁移/导入任何现有UE资产；完整名称与操作重新确认后才可执行。
- 正式texture.asset必须是单独合法资产名，不添加内部键或重复前缀；分段序号由导出包决定。
- asset缺失仅在未声明正式asset约定的旧包回退；非法值、重复目标、缺失引用明确中止。
- 不派子代理；现有对话内逐任务实施、自审与检查。执行子技能本会话不可用，按已授权范围直接执行本计划。

---

### Task 1: 失败复现与正式规划

**Files:**
- Create: check-import-public-names.cjs
- Modify: fireworks-plan.js
- Evidence: research/naming-20261005/cascade-before.json, backups/2026-10-05-public-asset-naming/

**Interfaces:**
- Consumes: makePlan(spec, asName, options), validate(spec), MAP.dirs, MAP.naming。
- Produces: resolveImportNaming返回baseName/assetIndex/particleNumbered/assetNaming；makePlan仍返回源键到目标包路径的对象。assetNaming取formal或legacy。

- [x] 写真实包失败检查并执行，期望旧HTML忽略asset导致断言失败。
```js
for (const [key,texture] of Object.entries(spec.textures)) {
  assert.equal(plan['tex:'+key].split('/').pop(), texture.asset);
}
assert.equal(plan['mat:L1_mainA'].split('/').pop(), 'MI_EFX_FireWorks_YonshakuKamuro_Main_01_HD');
assert.equal(plan['mat:L1_mainB'].split('/').pop(), 'MI_EFX_FireWorks_YonshakuKamuro_Main_02_HD');
```
- [x] 最小修正规划并验证正式名称、段/层、大小写冲突、非法asset、明确缺失asset、显式MI名、共享贴图引用、源文件不变。
```js
const assetNaming=fields.assetNaming??'formal';
if(!['formal','legacy'].includes(assetNaming))throw Error('资产命名规则无效');
const formal = naming.assetNaming==='formal' ? publicAssetName(t,'贴图 '+key) : '';
assets['tex:'+key] = MAP.dirs[t.class]+'/'+(formal || legacyTextureName);
const main = tex[m.textures?.main];
const materialName = main?.asset?.startsWith('T_')
  ? main.asset.replace(/^T_/,'MI_').replace(/_\d+x\d+(?=_\d+(?:_HD)?$)/,'').replace(/_HD$/,'')+'_HD'
  : legacyMaterialName;
```
- [x] 将legacy策略与备份HTML的规划逐项比较，主键和源包内容保持。
Run: `node check-import-public-names.cjs`

### Task 2: 策略持久化和预览一致性

**Files:**
- Modify: fireworks-ui.js, fireworks-update.js, fireworks.html
- Test: check-import-public-names.cjs

**Interfaces:**
- Consumes: resolveImportNaming/makePlan以及formal/legacy策略。
- Produces: 命名选择器editAssetNaming/assetNaming；所有新任务默认formal，历史已执行、失败、更新任务默认legacy；previousSuccess带策略，签名含策略。

- [x] 新字段加入namingFields、signature、fresh及restoreNaming；完成项prepareUpdate与cancelUpdate保持策略和原路径，失败/中断记录不自动切换。
```js
const namingFields=r=>({baseName:r.baseName,assetIndex:r.assetIndex,particleNumbered:r.particleNumbered,assetNaming:r.assetNaming??'formal'});
if(!Object.hasOwn(r,'assetNaming'))r.assetNaming=(finished(r)||r.state==='failed'||r.importProgress||r.mode==='update'||r.previousSuccess)?'legacy':'formal';
```
- [x] 显式策略更改调用namingChanged撤销计划/确认；运行及已完成时锁定；批量原样往返保留旧策略。旧fwimp.v1清单明确legacy。
- [x] 详情/列表/预览说明：正式包依赖名按包内asset/分段，基础名用于粒子；编号仅用于旧格式回退及粒子编号兼容。目标冲突给出包内重导或只选一项的正确处理方向。
- [x] jsdom覆盖新建formal、历史done/failed/pending、取消及刷新、修改策略重新确认、最终执行相同assets；所有UE请求用模拟器。
Run: `node check-import-public-names.cjs` and `node check-import-naming.cjs`

### Task 3: 构建、回归和交付

**Files:**
- Modify: build.py (VERSION 2.12), README.md, check-import-preroll.cjs
- Generate: ../df-fx-workbench_v2_locmai.html
- Report: research/naming-20261005/verification.json

**Interfaces:**
- Consumes: 最新呈现源码、原生importOne、正式命名及兼容UI。
- Produces: 同路径v2.12及真实包准确名称清单、隔离检查报告、脱敏共享交接。

- [x] preRoll检查固定为既有research/preroll-20261004/cascade-before.json（旧失败原始包），不把用户当前反复更新的导出当固定夹具。
- [x] 构建最新HTML，原工具与所有无关源码对照备份hash，桌面快捷方式保持同路径。
Run: `python -X utf8 build.py`
- [x] 明确逐一运行原16个无原生调用的隔离脚本+新正式命名检查（17脚本共341组），不运行原生写入/授权/恢复脚本。新增完整导入模拟检查验证texture destination、MI绑定、Required引用、保存键及源未变。
- [x] 执行共享离线标准检查并如实记录已有store未定义失败，不改别的负责人的源码或记全通过。
Run: `python -X utf8 analysis/scripts/标准检查.py --ui-state-only`
- [x] README首节记录正式/历史规则及实际验证边界；私有报告记录全部检查、备份hash、未执行原生写入/实播。更新自己共享日志/状态/交接，安全fetch/rebase/push main，释放认领。

Self-review: 本计划覆盖新旧名字、历史引用、分段区分、确认门槛、真实写入目标一致、源不变、同路径新版本与交付边界；不扩展到烘焙器或实际资产迁移。

## Execution record

真实包/v2.11命名失败与正式固定依赖回退编号误判均已先复现后修复。52新检查、原261核心、28呈现共341组通过；精确命名变更记录在research/naming-20261005/reviewed-naming-patch.json，其它引擎与原生模块/备份/缓存/保存/最新呈现保持。正式依赖来源比对仅同基础名且目标与formalDependencyName一致时允许不同回退编号，旧包和跨名仍拒绝。64备份哈希验证、55原文件不变；用户源包、原工具、桌面路径保持。共享既有store未定义检查仍6/7；未做UE写入、资源迁移或真实浏览器/粒子实播。脱敏完成交接已推main，本轮认领释放。
