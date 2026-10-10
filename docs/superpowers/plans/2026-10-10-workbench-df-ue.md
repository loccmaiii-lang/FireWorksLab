# 8025 自动连接、DF主题与轻量离线交付 Implementation Plan

> 本轮按任务内联执行，不委派子代理；勾选只记录实际完成的实现与检查，不代表用户艺术验收。

**Goal:** 先在正式8025完成连接状态、默认接口与导演、首屏自动导入动作和原DF颜色，再由通过检查的同一源码自动生成无音乐HTML及使用说明。

**Architecture:** 原17780/gpcli协议与可靠写入/读回/备份继续共用。连接Context只探测/读取，不自动写入；交付挂载自动检查当前档位，按钮显式确认后执行。包装只内联资源，剥离音频但保留编排/版本/标记/段落及音乐关联元数据，后续由使用者导入音乐。

**Tech Stack:** React19 / Vite6 / esbuild / Node test runner / 单文件HTML。

## Global Constraints

- 用户最新授权覆盖此前“私有8025源码不改/必须内嵌音乐”的交付限制；原节目、IndexedDB、资源和艺术参数不改。
- 不占其他方tool/src/共享tokens认领；DF唯一颜色源tool/design-system/tokens.json v0.1.1，当前烘焙器已使用同一颜色。
- 执行前重读UE配置、失效检查、备份、读回和仅目标保存；开网页/重连/检查不触发UE写入。
- 原file协议工具拒绝仍有效；只核验允许的HTTP实页，不绕过、不冒称file或UE实导实播通过。
- 本轮内联执行，不派发子代理、不新增自动部署Site或定时自动推送。

### Task 1: 共用连接与首屏交付

**Files:** tool/offline-workbench/connection.mjs、ConnectionProvider.jsx、EnginePanel.jsx；私有src相同文件、main.jsx、App.jsx、FixedDirectorPanel.jsx。

**Interfaces:** probeConnection(options)返回默认导演目标；useEngineConnection()返回state/reconnect/busy/setBusy；EnginePanel(doc,events,tier,notify)沿用compileDirector/executeImport。

- [x] 添加默认目标/连接失败/无自动写入测试：`assert.equal((await probeConnection({request})).target.assetPath, DEFAULT_DIRECTOR.split('.')[0])`。
- [x] 核对旧代码缺少接口并新增get-only探测/重连，运行新增回归；本轮未单独记录新增测试先失败的执行。
- [x] 正式8025接Provider与顶栏状态；交付第一项放按钮，固定接口不设输入，检查/确认随档位和目标失效。
- [x] 模拟失败/并发/超时回归；实际UE只读和实际首屏点击核对，无写入。

### Task 2: 原DF颜色与轻量包

**Files:** tool/offline-workbench/theme.mjs、df-theme.css、build.mjs、tests/package.test.mjs；私有主题末尾适配和原导入器末尾样式。

**Interfaces:** renderTheme(tokens)仅生成UI角色映射；omitAudio(project)返回不含audioRef/dataUrl的副本且保持doc/profiles等完全一致。

- [x] 加无音频但编排/版本不变检查：`assert.deepEqual(light.payload.doc, full.payload.doc)`，并断言无data:audio。
- [x] 从唯一tokens复制生成颜色映射，主色#00d49b；不改模拟/粒子/Ramp/画布颜色。
- [x] 正式8025与原导入器只替换UI颜色；已同源烘焙器保持负责人原修改。
- [x] 包装从正式新版模块消费连接，不再对旧固定面板做字符串注入；音频默认为待导入、旧关联元数据保留。

### Task 3: 通过后生成与交付

**Files:** tool/offline-workbench/release.mjs、README.md、发布流程文档；私有package.json/scripts离线发布入口；使用说明HTML/Markdown。

**Interfaces:** release --source --programme --output按顺序跑源回归/生产构建/包装检查，失败保持旧HTML，检查通过后替换产物与指纹；preview验收记录后使用npm run release:offline。

- [x] 新检查验证源检查/包装检查失败不替换旧文件，成功只生成一次；不把普通保存/音乐文件下载当更新HTML。
- [x] 完整源回归/构建、无音乐包检查及三档/版本一致；实际8025与同一HTML交付首屏、重连、刷新恢复、失效和音乐导入核对。
- [x] 写使用说明：编辑/音乐/段落/三档/版本/保存/导入/备份/UE状态及离线限制；本机固定交付路径提供轻量HTML/ZIP。
- [x] 记录实际验证、指纹及未实导实播范围，安全推main并核对远端，释放认领。

实际：87核心 + 33包装/引擎模拟检查通过；npm run build钩子生成一次2.42MiB无音频HTML；8025/同产物HTTP/原曲重新导入/三档/36点只读核对完成，file/真实UE写入实播及用户验收未执行。
