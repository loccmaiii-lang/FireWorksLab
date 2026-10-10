# 烟花编排工作台离线 HTML Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. 本轮在同一会话执行，不派发子代理。

**Goal:** 交付可双击打开、无公网依赖的单文件 HTML，保留最新8025功能和原测试节目音乐，沿用原导入器 GPUECli 连接 UE。

**Architecture:** 从现有8025源码构建内联IIFE/CSS，以构建适配注入静态JSON和完整dfshow，不改正式8025源码与存储。右栏增加本机导演三表检查/明确确认/执行/读回和备份；复用既有ueText与三表编译。连接只使用原导入器17780/gpcli，纯编排和文件交付不依赖连接。

**Tech Stack:** React19、现有esbuild、单文件HTML、IndexedDB、GPUECli现有HTTP端点、Node原生测试。

## Global Constraints

- 8025主开发入口和灰色平面坝体/全景100%/三栏/点位/时间轴/音乐/固定版本/三档保持。
- 程序执行不新增引擎代码/材质/资产，不代用户覆盖导演；真实UE只读检查，写入由用户点击执行。
- HTML不依赖CDN、在线字体、本机Vite/8017服务或外置数据文件；文件存储与8025来源分开。
- HTML含已授权原测试节目和音乐；新建空白仍是真空白，已有离线草稿优先恢复，不自动覆盖。
- UE确认绑定目标、当前三表/档位/时长和检查基线；改动失效，播放中或并发改动阻止。
- 真实写入、读回、保存、艺术实播分别记录；不将模拟测试/只读等同实际UE导入。

---

### Task 1: 原理核查和认领

**Files:** `对话记录/对话框24.md`、`协作/状态清单.json`、`协作/交互宪章.md`。

- [x] 原导入器`rawApi`核实POST/text/plain，避免服务不支持OPTIONS造成file跨域失败；源端点17780/gpcli。
- [x] 核对`server/director-read.mjs`及既有导演原生写入/读回结构；认领仅本轮离线包装/适配，推送。

### Task 2: 单文件包装与回归

**Files:** Create `tool/offline-workbench/build.mjs`、`tool/offline-workbench/bootstrap.js`、`tool/offline-workbench/tests/package.test.mjs`。Output `tool/烟花编排工作台.html`。

**Interfaces:** `build.mjs --source <8025绝对目录> --programme <完整dfshow> --output <html>`；bootstrap读取`df-offline-data`/`df-offline-project`JSON脚本，仅拦截六份静态JSON和bundled音乐。

- [x] 先写测试，断言不存在外置script/link或相对fetch依赖、完整节目片段/音乐/原生固定版本不变，原始源码指纹不变。
- [x] 用已有esbuild打包React/图标/所有样式为内联IIFE，关闭拆包和模块脚本；JSON所有`<`转义，脚本结束符保护。
- [x] 构建适配App从内嵌完整dfshow初始化、独立离线存储键、音乐直接内嵌引用；原源代码不写回。
- [x] 运行包装检查和原核心回归；实际完整节目文件往返/新空白/保存刷新/三档/时间轴及编辑入口检查。

### Task 3: 原导入方式的导演适配

**Files:** Create `tool/offline-workbench/engine.mjs`、`tool/offline-workbench/EnginePanel.jsx`、`tool/offline-workbench/tests/engine.test.mjs`。

**Interfaces:** `engineRequest(route,payload,options)`；`readDirector(path,options)`；`prepareImport(target,arrays,duration)`；`executeImport(plan,options)`。传输可注入fake用于不写UE的隔离测试，真实实现与导入器相同POST/text/plain。

- [x] 测试覆盖连接失败、错误目标、播放中、确认失效、并发配置变化、非烟花字段保留、写入/读回失败和回退、保存失败分别回执。
- [x] 实现目标Blueprint→CDO解析和点位绑定读取；未选择目标不扫描/写入，实际点位不足不执行。
- [x] 右栏检查→备份→确认→执行，仅更新EffectSubTemplates/EffectTemplates/EffectScheduleGroups/TotalDuration。执行前重读；读回后才允许保存，保存失败保留真实回执。
- [x] 保存仅选定Blueprint资产；关卡Actor写入明确当前编辑器会话、关卡另由用户保存，不替用户保存整张关卡。
- [x] 本机已开UE时只读连接/目标/点位验证，禁止在测试中触发真实写入或播放。

### Task 4: 交付与交接

**Files:** Create `tool/offline-workbench/README.md`、更新`仓库梳理.md`及既有发布流程/交接/对话记录。

- [x] 浏览器尝试直接file打开；若工具策略禁止，记录准确限制，不绕行、不冒称file实页通过。可测试的本机HTTP预览保留离线同一个HTML文件。
- [x] 交付HTML和必要使用说明/真实检查结果，明确接收者也需要既有GPUECli服务；互联网可断，UE本机服务不可省。
- [x] 文件SHA和原节目/音乐校验，提交推送远端核实；释放认领，保持现有网站和正式8025不变。

## 本轮真实结果

执行：单文件与右栏导演适配已完成，产物83913964字节。AI自检：24项新增检查/原核心91项通过；同一HTML的HTTP开发预览实际检查与UE只读证据见tool/offline-workbench/verification.json、ue-readonly.json。实际文件模型往返通过；未冒称最终包经浏览器下载再导入全流程。file://直接打开被自动安全审查禁止，未绕过；因此该实页未验。真实UE写入/保存/实播、用户验收未执行。原源码/节目/8025存储/Site未改。

追加：内嵌脚本读取后移出DOM，原曲仍保存在完整节目，实时音频用可释放Blob URL，避免将80MB音频字符串挂在实时页面属性；字节测试与浏览器解码通过。改目标/档位后清空确认并显示检查失效。

产物提交8b1b0524已推送，重新fetch确认origin/main包含该提交；HTML远端/本机Git blob同为eeb41404d5ffabb2bb800ae44874ea85e3038938，稳定D区文件SHA与构建记录一致。已释放本轮认领，未归档正在用的其他工作树。
