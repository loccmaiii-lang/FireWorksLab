# v3、B 分组聚焦与 Adobe Spectrum 取向候选的关系

本轮以 v3 统一候选为底，保留原 Material/WAI 项目适配稿，再增加一个 Adobe Spectrum 取向的视觉变体。B 分组聚焦继续作为独立的参数工作流草稿；它不是这次 Adobe 版本的前身，也不因新增变体而改名。

这里的“取向”表示参考官方原则后作项目适配。正式库、候选稿、实际运行验证和用户认可分别记录；这份说明不把它们合并为“设计系统已经完成”。

| 层次 | 它回答什么问题 | 项目目前有什么 | 本轮增加什么，以及成熟度边界 |
| --- | --- | --- | --- |
| 组件 | 一个按钮、输入或选择器怎样显示、操作和表达状态？ | v3 的八类基础控件样板，以及菜单、对话框等补充样板；B 另有数值、滑杆、枚举、颜色的共用参数生成器 | 在同一套 v3 控件语义上比较外观。单个控件可操作，不等于真实制作流程已接通 |
| 设计令牌 | 颜色、文字、尺寸、边界等共用值从哪里来？ | 正式 `fw-*` 令牌；v3 用 `u-*` 别名继承正式颜色，并提出候选尺寸和密度 | 视觉差异限于本轮作用域，保留蓝灰/青绿、直角感与细边框；候选值不会自动成为正式共享标准 |
| 组件库 | 一批组件怎样复用、组合和维护？ | 正式基础库与 v3 候选库并存；v3 有样式、行为 kit、页面 adapter 和状态样板 | Adobe 变体沿用 v3 的 `u-*`、kit 和 adapter 基础，避免为八类控件另写一套行为；尚未完成正式登记与三工具迁移 |
| 设计语言 | 整页的信息主次、选中、动作、密度和轮廓怎样保持一致？ | 既定蓝灰/青绿主题；v3 强调同类控件一致；B 将参数按任务重组，并明确编辑、观察、输出的区别 | 比较中性选中与薄荷色主动作的层级。它是项目中的 Adobe 取向候选，不等于采用 Adobe 全套品牌外观 |
| 设计系统 | 令牌、组件、模式、页面、业务规则、验证和版本如何成为共同标准？ | 已有设计基础、交互宪章、组件规格、模式与页面候选；领域组件仍需业务适配 | 仍属于设计系统基础与候选规范。参数全集、各领域流程、完整读屏和三工具迁移不能由这一轮推定完成 |

成熟度依据见 [v4 设计语言说明](../v4-workflows-20261029/design-language.md) 第 21–31 行。正式基础库的 [README](../../README.md) 第 42–48 行已记录烘焙器 4.9.125 起接入，但第 3 行仍保留早期“尚未接入三个正式工具”的概述；应分别看待局部接入和三工具迁移。

“八类基础控件”和“Material 参考八类”是两种统计口径。

| 统计口径 | 实际内容 | 证据 |
| --- | --- | --- |
| 八类基础控件样板 | C01 按钮/图标按钮、C02 字段、C03 滑杆与数值、C04 下拉、C05 勾选与混选、C06 单选、C07 开关、C08 分段选择 | [components.html](../v3-unified/components.html) 第 25 行及各节 |
| 29 类规格中的 Material 参考八类 | C01 按钮、C04 下拉、C05 勾选、C06 单选、C07 开关、C11 菜单、C12 对话框、C16 进度 | [standards-map.json](../v3-unified/standards-map.json) 第 225、310、338、366、394、508、536、648 行的分类 |
| 规格总量 | Material 参考 8 类、桌面适配 14 类、领域自定义 7 类；另有 14 个模式和 8 个页面模板 | [standards-map.json](../v3-unified/standards-map.json) 第 18–29 行；[v3 README](../v3-unified/README.md) 第 5 行 |

因此，字段、滑杆与数值、分段选择虽然属于八类基础样板，在 29 类映射里却归为“桌面适配”。反过来，菜单、对话框、进度属于 Material 参考分类，却不在前八类基础控件之内。规格数也不等于完整生产组件数；v3 明确只对八类样板及编辑、交付、导入三个代表页作本轮实现声明。

| 对比点 | v3 统一候选 | v4 的 B 分组聚焦 | 对理解这次 Adobe 版本的意义 |
| --- | --- | --- | --- |
| 主要问题 | 同类控件、状态和代表页面怎样一致 | 外形、运动、光色、输出四组怎样帮助找参数与连续调整 | v3 是本轮控件视觉对比的基底；B 是另一条工作流探索 |
| CSS 与行为入口 | `candidate-tokens.css`、`candidate-components.css`、`component-kit.js`、`workspace-adapter.js` | `b.html` 加载 v3 两份候选 CSS，再加载 `studio.css`、`focus-panel.css` 和自己的 JS；没有加载 v3 kit/adapter | B 复用了颜色与部分样式，不能称为完整沿用八类统一控件 |
| 真实生成的控件类 | adapter 把按钮、输入、滑杆、勾选、单选、下拉绑定到 `u-*` | `studio.js` 的字段使用 `param-number`、`param-slider`、`param-choice`；恢复按钮和交付复选等局部使用 `u-*` | Adobe 变体回到 v3 同一套 `u-*` 控件基础，不把 B 的局部类当作新的共享库 |
| 密度和形状 | 根工作区切换 regular/compact，控件高度 40/32px；字阶、行高、间距共同继承 | B 局部写定输入 32px、字体 14px、滑杆 20px、恢复按钮 28px 且直角 | B 的局部密度提案不是 v3 统一密度接口；本轮另按约定保持 40/32px，紧凑字号不缩小 |
| 值、校验和历史 | 基础样板使用 kit；业务 Demo 保留原控制器拥有值、历史和保存 | `studio.js` 拥有三稿共用状态、校验、条件、撤销与保存，B 面板调用 `ctx.renderField` | 本轮保留 v3 原生数字输入的步进、校验和事务行为，不移植 B 控制器 |
| 数据与预览 | 静态图像与隔离 Demo，下载为示例 JSON | 金锦层 40 个真实代表字段可编辑，另外两层真实只读；预览连接原实时渲染核的单层 | 本轮不移植 B 的 40 参数模型或真实核，也不以它们扩大交付能力 |

代码可直接核对：

- v3 统一绑定：[workspace-adapter.js](../v3-unified/workspace-adapter.js) 第 11、23、25 行；[candidate-tokens.css](../v3-unified/candidate-tokens.css) 第 3–25、41–48 行。
- v3 数字样板的原生 `type="number"`、`min/max/step`：[components.html](../v3-unified/components.html) 第 49 行；有效性检查、拖动结束提交与 Esc 恢复：[component-kit.js](../v3-unified/component-kit.js) 第 37–69 行。
- B 加载入口：[b.html](../v4-workflows-20261029/b.html) 第 1 行；字段生成：[studio.js](../v4-workflows-20261029/studio.js) 第 28–30 行；B 消费共用字段：[focus-panel.js](../v4-workflows-20261029/focus-panel.js) 第 59–61 行。
- B 固定几何：[focus-panel.css](../v4-workflows-20261029/focus-panel.css) 第 65、69、72 行；共用状态与原配方/保存快照区分：[studio.js](../v4-workflows-20261029/studio.js) 第 14–19 行。
- B 四组是任务投影，原“层 → 发射器 → 模块/节”可追溯：[design-language.md](../v4-workflows-20261029/design-language.md) 第 37–46 行。40 项和单层预览不代表生产参数全集或整朵同步，第 74–78 行说明了输出边界。

本轮 Adobe 取向候选按下面范围建立：

| 决定 | 本轮约定 |
| --- | --- |
| 基底 | 从 v3 的八类控件、状态样板、kit/adapter 和代表页面建立同基础变体；原 Material/WAI 项目适配稿保留，便于同任务对照 |
| 视觉组织 | 普通选中使用中性层级，主动作使用项目既有薄荷色；选中不承担“保存成功”语义；焦点、错误和不可用仍各有表达 |
| 项目画风 | 项目主色、蓝灰表面、接近直角的轮廓、细边框继续有效；不引入 Adobe 品牌色或用大圆角重新定义现有画风 |
| 密度 | 保留常规 40px / 紧凑 32px。紧凑通过高度与间距控制密度，保持同一套可读字号，不沿用 v3 旧紧凑档的缩字方式 |
| 数字输入 | 保留 v3 原生数字步进、现有 `min/max/step`、有效性检查、提交和 Esc 恢复；视觉取向不会改写合法值规则或新增静默截断 |
| 依赖与能力 | 不安装官方 Spectrum 组件包；不把 B 改名；不接入 B 的 40 参数真实核，不因此新增真实烘焙、导出、导入或 UE 能力 |
| 验证 | 检查同一批控件及代表页的状态、密度、键盘和显示结果；运行检查、视觉自检与用户认可仍是三个事实 |

“中性选中、薄荷主动作、40/32px、紧凑不缩字、保留原生输入行为”均是本轮项目适配决定，不宣称是 Spectrum 强制规范。

官方参考按用途使用：

| 官方资料 | 本轮参考什么 | 仍由项目决定什么 |
| --- | --- | --- |
| [Material 3 Foundations](https://m3.material.io/foundations)；本地 [standards-map.json](../v3-unified/standards-map.json) 第 95 行起保留逐项来源 | 原 v3 的基础、角色与组件规范映射 | 原稿是 Material/WAI 的项目适配，不是官方 Material 组件包或默认外观 |
| [Spectrum Slider](https://spectrum.adobe.com/web/rsp/components/slider) 与[使用指南](https://spectrum.adobe.com/fragments/components/slider/usage-guidelines) | 标签、值、轨道和把手的清楚关系；标签与单位提供上下文 | 保留既有中文标签、独立单位和精确输入，不增添热区拖字等新手势 |
| [Spectrum Number Field](https://opensource.adobe.com/spectrum-web-components/components/number-field/) | 数字输入与可选步进的结构，标签、帮助、错误、只读的区别 | 官方包有自身格式化、夹值与步进规则；本轮不安装该包、不复制这些行为，继续沿用 v3 的输入语义 |

官方资料核对日期：2026-10-29。v4 的 [设计语言说明](../v4-workflows-20261029/design-language.md) 第 82–90 行同时引用 Spectrum、Fluent、Carbon，并明确三个来源共同用于 A/B/C；因此，当前 B 应继续称为“分组聚焦工作流草稿”。本轮新增候选则称“以 v3 为底的 Adobe Spectrum 取向视觉变体”。
