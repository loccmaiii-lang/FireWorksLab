# Material 保留版与 Spectrum 取向候选

本轮从 v3 的八类统一控件建立 Adobe Spectrum 取向视觉变体，供同组件、同状态、同密度对照。保留 FireWorksLab 蓝灰/青绿主题、直角感与细边框；这是项目适配候选，不是 Adobe 官方组件包。

沿已预检且确认对应当前 F 盘副本的 HTTP 服务打开 [审阅入口](http://127.0.0.1:8034/design-system/drafts/v5-spectrum-20261029/index.html)。

| 入口 | 用途 |
| --- | --- |
| [index.html](index.html) | 说明范围，进入两个视觉候选与原 B 工作流 |
| [compare.html](compare.html) | 并排操作两版相同组件，切换常规/紧凑密度 |
| [components.html](components.html) | 操作新候选的八类控件及菜单、对话框补充样板 |
| [demo.html](demo.html) | 查看编辑、交付、导入代表页中的新控件语言 |

[v3 Material/WAI 原样板](../v3-unified/components.html)、[原 Demo](../v3-unified/demo.html)和 [B 分组聚焦原稿](../v4-workflows-20261029/b.html)继续保留。B 的任务分组、40 个真实代表参数和单层原核预览不移植到本轮，也不改名为 Spectrum 版。

新稿继续消费 v3 的 `u-*`、`component-kit.js`、`workspace-adapter.js` 和样板控制器。组件视觉增量在 [spectrum-tokens.css](spectrum-tokens.css) 与 [spectrum-components.css](spectrum-components.css)，以 `.u-scope[data-design="spectrum"]` 限定；正式 `fw-*` 共享文件不因本轮改变。新 Demo 存档键为 `fwl.ui-demo.v5-spectrum`，不迁移、覆盖或清理 v3 存档。

| 视觉适配 | 在页面上的表达 |
| --- | --- |
| 主动作与等权工具动作 | 主要动作使用既有薄荷色实底，普通动作保持中性；不把每个工具按钮都提高到同一强调级别 |
| 中性选中 | 等权短选项分段及视图切换按钮使用中性表面和可辨边界；树/效果库领域选中保留原稿。选中、焦点、改动、错误分别表达，选中不代表保存成功 |
| 输入与只读 | 输入值用常规字重，标签与帮助形成层级；`readonly` 改为较弱实线边界，值仍可聚焦、选择和复制，区别于禁用 |
| 细轨滑杆 | 轨道 2px、把手 14px；控件操作区域仍随 40/32px 密度，焦点落在把手；保留原范围、步长和键盘行为 |
| 连续分段 | 去掉选项间空隙，以共同轨道承载中性选中；保留 v3 的互斥值、焦点与键盘语义，不把它改造成命令按钮 |
| 两档密度 | 常规 40px、紧凑 32px；两档都保持正文/输入值 14px、字段标签 13px、帮助 12px。紧凑只收紧高度与空间，不缩字 |
| 项目画风 | 继续使用项目既有颜色和本机中文字体栈；不安装 Adobe Clean，也不采用官方包的品牌色、胶囊轮廓或默认动效 |

数字输入继续使用 v3 原生步进和既有 `min/max/step`、有效性检查、提交与 Esc 恢复。官方 Number Field 的格式化、夹值或吸附规则不移入本项目。

新 Demo 另修正两处显示接续：**导入设置变化后重绘核对摘要**，避免旧“检查结束”摘要与确认已失效提示并存；**重置示例值时保留当前页**，保持标题/页面/URL一致。修正只在新生成的 Demo 中生效，保留原控制器的事务、确认失效规则与参数语义；Material 原稿未改。生成来源及基础指纹见 [build-prototype.py](build-prototype.py) 和 [build-manifest.json](build-manifest.json)。

“组件、设计令牌、组件库、设计语言、设计系统”的五层关系，以及 v3 与 B 的代码真实差异，见 [architecture-comparison.md](architecture-comparison.md)。其中还区分了两种“八类”：本轮八类基础样板是 C01–C08；29 类规格中的“Material 参考 8 类”包含菜单、对话框、进度等，是另一种分类口径。当前成果仍是设计系统基础与候选，不代表正式库登记、生产参数全集或三工具迁移已完成。

官方依据核对日期为 2026-10-29。下列资料用于理解原则；颜色、40/32px、14/13px、直角细边框和原生输入行为是本项目适配决定。

| 官方资料 | 本轮采用与保留的边界 |
| --- | --- |
| [Spectrum Button](https://spectrum.adobe.com/web/rsp/components/button) | 参考不同动作的强调层级与清楚标签；用项目薄荷色表达最高主动作，不冒称官方按钮配色 |
| [Typography system](https://spectrum.adobe.com/foundations/typography/typography-system) | 参考字号、字重、文字颜色共同建立层级；本机中文字体和 14/13px 为项目选择 |
| [Border width](https://spectrum.adobe.com/foundations/styles/object-styles/border-width) | 参考必要边界、分隔和一致性；保留项目 1px 细边，不照搬官方所有默认宽度 |
| [States](https://spectrum.adobe.com/foundations/behavior/states) | 参考等权面板控件采用较低强调的选中；焦点与选中独立，不用按下缩放改变布局 |
| [Slider](https://spectrum.adobe.com/web/rsp/components/slider) | 参考标签、实际值、轨道与把手关系；2px/14px 为本轮实现选择，数字规则继续归 v3 |
| [Segmented control](https://spectrum.adobe.com/web/rsp/components/segmented-control) | 参考共同轨道与清楚选中；官方主要用于视图切换，本项目只作视觉借鉴，原互斥参数语义保留 |
| [Number Field](https://opensource.adobe.com/spectrum-web-components/components/number-field/) | 参考数值、可选步进、标签、帮助和只读的区分；不安装其组件包，不复制夹值与格式化行为 |

Demo 继续使用 v3 静态示例图，仅保存独立示例、下载 `demoOnly` JSON；没有真实烘焙、素材包导出、目录交付或 UE 写入。实际检查范围与结果以 [design-qa.md](design-qa.md) 和 [verification.json](verification.json) 为准，不由官方文档推定本页达到整套 AA，也不把 AI 自检视为用户认可。
