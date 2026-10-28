# 统一组件候选v3 · 待用户验收

[审阅入口](http://127.0.0.1:8034/design-system/drafts/v3-unified/index.html) · [可操作Demo](http://127.0.0.1:8034/design-system/drafts/v3-unified/demo.html) · [控件状态样板](http://127.0.0.1:8034/design-system/drafts/v3-unified/components.html) · [前后对照](http://127.0.0.1:8034/design-system/drafts/v3-unified/compare.html)。复用已核实F任务副本8034，不另开服务。

本轮交付：29类映射（Material8/桌面14/领域7）、按四轴定义的适用状态、八类基础控件共享样式与行为样板、编辑/交付/导入三个代表页和新旧同视口截图。14模式和8模板保留规格，不宣称全部生产实现。

审阅顺序：先状态样板，再操作三个代表页，最后查看前后对照和取舍说明。重点验同类一致、信息主次、密度可读、状态可理解。常规/紧凑40/32是项目候选，主题、直角感、细边框与已选结构布局不变。

候选基础在candidate-tokens.css / candidate-components.css / component-kit.js；components.html消费它们，workspace-adapter.js将业务Demo控件绑定同一类，旧控制器仍管理值/历史。结构视觉引用已选v2-structure，原v1/v2文件不改。build-prototype.py从保留的v1单文件生成候选demo.html，并隔离storage键；它不是生产构建器。候选Demo需同目录资源，沿HTTP入口操作，不将它称为无依赖单HTML。

只读写fwl.ui-demo.v3-unified，重置仅清本键；图像静态，下载为demoOnly JSON，未接真实烘焙、素材包、资产或UE。旧v1示例存档不迁移或覆盖。额外RT6/粒子图/编排页保留作补充参考，本轮主验收仍是三个代表页和基础样板。

运行与视觉证据见verification.json、design-qa.md；正式共享tokens/组件/宪章、生产、配方、私有导入器、节目、UE均未修改。用户确认本轮视觉之后，再进行正式组件登记与三工具迁移。
