# 最新4.9.64：单页双工作区

Status: needs_visual_verification（功能/DOM已走查，最终新截图尚缺）

同一任务接续：file/HTTP一个制作文档，原导入页直接承载HTTP host，无第二层iframe；source仍8035原草稿，原色/布局/CLI保持，追加连接重试。旧4.9.63视觉passed报告留在下方作为历史，不能冒充新截图。

修改前截图：backups/20261010-single-page/01-before.png。最终截图03/06未成功，不引用不存在的图片。最终实页DOM：04-final-dom.txt；三档几何：05-bounds.json；源码保护：protected-hashes.json。

最终8037真实导出SinglePageQA_Gold修订e8edfc35（14文件/2平台）自动同页接入，原UE只读检查2通过0需处理；逐包确认2/2、日志展开、制作317/撤销在往返后保持，未点UE执行。前版接线断线后同页retry，恢复服务保留2/2和日志，真实80→撤销78。原测试40与新增38全部通过，私有测试适配器延迟销毁排空postMessage而不改原控制器。workspace/import/plan与早期备份字节一致，fireworks-ui既有差异早于本轮，当前哈希记录，不回退。

最终1280×720/390×844/640×340 DOM内嵌区和常驻动作在界内；这不是视觉审看。浏览器工具React/Electron自身异常（栈尾node:electron/js2c/sandbox_bundle），鼠标/截图失效；改用真实键盘UI与DOM验证，不伪造新截图。最新字体/间距/颜色/图像/细部的新截图审看需补验。file实页仍受协议策略限制；原UE写入/保存/实播/正式根/迁移/时长/登记/用户未验。

---

# 资源交付 4.9.63 · Product Design 走查与呈现 QA

范围：8034 HTTP 烘焙器的实际交付呈现、导航与原生只读检查。延续原8035草稿任务，未全面翻新制作参数页。此报告的 passed 只覆盖此范围，用户认可、file 双击接续及真实 UE 写入/保存/实播仍未验。

**Findings**

本轮发现的 P0/P1/P2 已修复；HTTP 实页当前没有遗留的可执行 P0/P1/P2 呈现问题。具体修复历史见下表。文件版导出代码已补窗口接续契约，但浏览器协议策略阻止自动实测，不能称 file 端到端验收通过。

**视觉真值及实现**

- Source visual truth URL：http://127.0.0.1:8035/tool/prototypes/workspace-delivery-v1/
- Source visual truth path：[07-source-ready-1280.png](backups/20261010-delivery-parity/07-source-ready-1280.png)。较早用户视口原图为01-draft-before.png；07为后续同尺寸同状态捕获。
- Implementation URL：http://127.0.0.1:8034/baker ，右上资源交付，版本4.9.63；公共实现9644e434已推main并快进主F。
- Implementation screenshot path：[14-production-live-8034.png](backups/20261010-delivery-parity/14-production-live-8034.png)。为实际8034页面，最后字体/长名修正后重载并原生检查完成捕获。
- Viewport：1280×720 CSS px；source与implementation PNG均1280×720，工具输出已按CSS尺寸归一，有效1像素/CSS px。未再缩放或编辑图片。主机显示密度不作为默认1.0的假设。其他视口采用CDP显式clip、scale=1，并读取实际CSS宽高；尺寸与截图一致才纳入证据。
- State：原DF暗色、GoldChrysanthemum、同修订3c9894a0、PC、手机两包选中，当前PC、5/5资产、0/2确认、日志收起。源为演示数据，实施为原生只读UE检查结果。实际names/操作/执行guard不以演示数据覆盖。
- Full-view comparison：07与14在同一图像输入中一起审看，确认三栏宽度232/264/剩余、居中四步、平台切换、底部动作与日志层次。最终源顶栏64px与实施保留原制作顶栏48px的差异明确接受，避免切入交付时整页顶栏跳位。
- Focused region comparison：源[12-source-table-detail.png](backups/20261010-delivery-parity/12-source-table-detail.png)，实施[15-production-table-final.png](backups/20261010-delivery-parity/15-production-table-final.png)，均784×345，分别从原图x496/y262与x496/y246捕获，不做图片重绘。同一输入并列审看资产文字、勾选、共同贴图提示及操作列。内容包含同名粒子/材质/轮廓/Ramp；第5贴图在同一可滚动清单中。

**五项必检表面**

| 表面 | 审看与结果 |
| --- | --- |
| 字体与字阶 | 实施正文Segoe UI → Microsoft YaHei → sans-serif，14/22；字段13/20、提示12/18，标题600。资产名Consolas → Cascadia Mono → monospace，13/20、600，与源field字阶对齐；letter-spacing normal。截图同浏览器审看平滑与细字，未人为指定不同抗锯齿。长真实英文名在队列省略、原title与顶栏保留全名；资产名允许换行，不裁掉最终名称。原Maker品牌/版本使用原字阶。少量原生helper光学差异为P3，未用换字体假装逐像素相等。 |
| 间距与布局 | 三栏、54px栏头、68px流程区域、720px居中步骤；16/20px常用内距、原控制8px圆角，栏面平直无新浮层影子。CLI零圆角，底部8px带1px边框进度；动作常驻。资产第一列对齐与码字大小最后再次对照修正。原生状态行/清日志能力保留，故底部比演示多一行真实状态。 |
| 颜色与tokens | 直接消费原DF v0.1.1：surface #111d21、container #1b2a2f、primary #00d49b、primary-container #173d39、on-surface #e4edef、muted #b4c5cb、warning #e4bb7c。没有荧光绿的第二套进度色，没有新渐变。选中/查看/确认有独立真实语义；禁用执行维持原guard。focus沿用#36e4b0。静态可读性与实际焦点检查完成，不冒称完整WCAG/读屏通过。 |
| 图像与图标 | 实际同修订回放缩略图，使用原图片，没有手绘替身；轮廓、比例、深底裁切一致，无新压缩/透明光边。刷新引用与草稿相同的离线Tabler icons.js资源，不以文字图形重画图标。原Maker DF排版标识与原Material原生控件图标继续保留。 |
| 文案与真实数据 | PC/手机、4步与导入术语对齐。源“新建”在原执行器中实际为“新增”；共用图只在实际同目标路径时标注。当前英文身份来自真实回执，未杜撰中文名。配置4.833s只叫配置播放时长，循环/GPU等未知显示待核验；登记始终尚未登记。源0确认仍亮主按钮是演示缺口，生产必须禁用。 |

**比较与迭代历史（所有P0/P1/P2）**

| 严重度/位置 | 早期证据与问题 | 修复 | 修后证据 |
| --- | --- | --- | --- |
| P0 文件版目录导出 | 用户file截图和隔离RED：异步导出调用HTTP专用发布，报需要打开8034，制作资源不能接续 | 在原导出点击预留固定本机窗口，Blob在准备后发送；精确窗口/opener/来源校验，去重job，准备及执行分别超时；token由HTTP页持有，不放开CORS、不迁移file存储 | 4窗口契约PASS，含子页加载竞态与伪造消息拒绝。HTTP隔离实际生成c40c8545并自动接入2包。file真浏览器未验，见范围限制 |
| P1 制作↔交付 | 02-production-before、05-choreography-library：直接hidden切换、首次白/空等待、反复prepare | 160ms淡入/6px轻位移、取消旧动画、复用已准备内容、加载区与焦点恢复、减少动态效果直切 | 8导航契约；实际快速往返993输入值完全相同，2包确认保留；14实际正常进入 |
| P1 三栏/资产/原设置 | 02旧批次与长表单布局仍在，和8035原真值不一致 | 移动原DOM字段与原处理器；简洁当前队列/平台/常用设置，旧批次、筛选、GPU、完整设置仍可访问。保留原确认/执行两步 | 07+11全页同输入审看，最终07+14再审；10呈现原生mock测试；平台切换实页零误勾 |
| P2 底部动作与日志 | 06/早期viewport文件：旧CSS隐藏重新检查、日志面板过高、窄屏footer row变grid导致动作超出 | 作用域覆盖，日志单标题/一条实际包进度，关闭与失败重开保持；footer明确flex，手机换行，极矮视口紧凑 | final-1366x768/1920x1080/390x844/640x340，viewports-final.json实际按钮矩形均在动作栏内；mock失败/停止/进度通过 |
| P2 原资源切换异步返回 | 原prepare次数RED：反复切换重复准备，旧对象状态会抢新回执 | session单次prepare、desiredDeliveryId防旧状态覆盖；对象140ms可取消短淡入 | 导航RED→GREEN，实际新导出c40c8545自动接入；原3c修订可回看 |
| P2 最后确认焦点 | 16-confirm-focus-8034.png及只读DOM：隐藏primary后activeElement落body；原JSDOM未模拟hidden时失焦，故初测误过 | 在隐藏原primary之前捕获焦点，再转移到真实可见btnExec；补模拟浏览器hidden失焦的RED→GREEN | 实8034逐包确认后focus=fwimp-btnExec、executeEnabled=true；未执行。确认仅改UI工作区，0实际UE写入 |
| P2 英文长名/表格对齐 | 14早期同修订捕获：队列GoldChrysanthemum把最后um独立换行；清单小字与左边线偏移 | 列表省略+完整title；顶部全名；最终名对齐原13px token，第一列去冗余padding | 最终14+15与07+12同输入审看，无孤字断行；5真实最终名仍完整可读 |

早期03与部分viewport截图因主机密度/clip导致图像裁切，已排除，不用于通过判定。不是先看到截图就宣称通过：先阻塞、修改、同状态重新捕获对比。

**实际流程和限制**

- 隔离8037服务在既有QA根真实导出资源，修订c40c8545，自动切交付并完成2包/0需处理；正式资源根未替用户选定。
- 主F已安全快进9644e434。8034重载实际v4.9.63，自动连接/恢复2包、0需处理、控制台0错误/警告；最后确认焦点修复又在真实8034复核。
- 平台/逐包确认/完整原设置、快速往返保留993参数及2确认；真实Execute未点击。CLI执行/失败/停止使用隔离原生控制器mock验证，不能算实际UE成功回执。
- 五视口动作/横向溢出通过；640×340内容仍需局部滚动，只保证动作可达，不能据此宣称参数寻找效率已提升。
- 68限定测试、4.9.63构建无静态错误；最后真实focus修复增强原10呈现检查，重新通过。原四控制器hash/原HTML SOURCE/OUTPUT保护不变。
- 未验：file双击浏览器链路、完整历史批次迁移、真实UE写入/保存/实播、分平台裁帧时长/ResourceFX登记、200%缩放/读屏/粗指针真机。它们保留独立清单，不阻塞本轮隔离设计探索，也不算已完成。

**Open Questions**

用户审看自然切页与原DF方向尚未批准。参数方案A/B、默认展开、小圆角/共享形状仍按既有待决事项，没有据此修改宪章或tokens。

**Implementation Checklist**

- [x] 原位导航、草稿三栏与实际身份/清单对齐。
- [x] 原字段/处理器/确认执行保护、CLI实际包进度、异常/焦点回归。
- [x] 同状态全页与聚焦清单两组同输入对照、五视口实际矩形。
- [x] 公共代码提交9644e434推main、主F安全快进，私有代码/证据仅本机。
- [ ] 用户审看，正式资源根指定及原生/file独立验收。

**Follow-up Polish**

P3：原生状态行、清除日志与品牌/真实英文身份造成的细节差异有实际能力依据，保留；后续在用户确认共用规则后渐进适配。此页不会代替尚待批准的参数分类样板。

final result: passed
