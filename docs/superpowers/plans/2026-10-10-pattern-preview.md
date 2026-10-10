# 复制模板调用范围与预览修复

目标：8调用复制后只修改1条，不再把其余7条当残留；替换花型不继承旧片段变换。8025源先验证，再覆盖稳定离线文件。模板旧版与用户节目不迁移。

- [x] 1. 新增 tests/pattern-preview.test.mjs 的混合8调用夹具。buildPatternPreview(doc, pattern, {scope, callId, tier}) 只读取指定模板，当前模式1条、全体8条；中低保留共同时间，不受无效其它调用阻塞当前模式。先运行失败。
- [x] 2. 新增 src/pattern-preview.mjs。replaceCallTemplate(doc, call, templateId) 深拷贝当前调用，换花型清 eventAdjustments，过滤兼容点，保留时刻/随机；同花型不清微调。buildPatternPreview 用空 cues/events/profiles 构建 placeChoreography，固定0秒相对起点且对齐 launch，再 previewSubTemplates/qualityEvents；零参演点返回空预览。
- [x] 3. LaunchWorkspace 接单一模型，独立完整保存校验与当前预览校验。右栏调用选择、数量/编辑范围；列表显示真实花型版本；全体/当前分段与事件数；切换/编辑清预览时钟。当前模式不中断全体保存校验。复制 toast 说明整套保留。
- [x] 4. 实页走查复制8条，替换1条，当前仅3点、全部仍10发；选其它旧调用显示其真实花型；保存旧版/新版、三档、空档、保留/恢复调用、放弃不损坏，1366/1920检查。
- [x] 5. npm run build 全核心与包装测试通过，内容v15稳定同路径；保留存储键/原节目媒体，ZIP三文件与HTML同字节。静态HTTP验证同产物，file限制说明。
- [x] 6. 记录源diff/指纹/报告/检查范围，公共纯模型/编译产物更新；fetch/rebase非force推main；安全同步主F并释放认领。

函数边界：preview 纯计算不写doc、programme或UE；replace仅返回call；UI change持有草稿。当前与全部只改变观察范围，不改交付。

实际补充：空节目mock高档确定局部begin/end，支持负/晚相对时刻；仅保留/恢复和旧捕获微调显式重置。走查发现放弃区域残留，修后复测dam。1366截图、1920控件限定检查；报告pattern-preview-audit.md。108+37与公共17通过，稳定v15HTML/ZIP已覆盖，上传核实待收尾。

产物7364ae16已推origin/main；HTML/ZIP远端blob与本机一致，publication已记录。主F安全同步及认领释放记录见收尾提交。
