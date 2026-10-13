# FanGold模板分层与四素材比较 Implementation Plan

> **For agentic workers:** Inline execution，按已有授权逐项执行；不新增对话或派代理。

**Goal:** 使用用户FanGold1.0模板核对并补齐末段粒群表现，给出实际四素材与整面Zoom2K的空间采样及开销比较。

**Architecture:** 原版只读；配方唯一入口FC6O_FanGold参数.json；保留整面输出和源模板。原生已有头/细尾/余烬三类，不为凑数新增粒群。普通火花尚未支持按主星燃尽后渐入曲线/气流，若确需底层，排在现有源码认领之后；不得改成另一个模拟冒充模板。

**Tech Stack:** Python/Pillow/NumPy、现有WebGL2烘焙器、Edge/Playwright。

## Global Constraints

- 前段和亮头保持，燃尽后尾部才逐渐变化；源模板原件不改。
- 整面候选不拆簇导出；四模板只是比较。
- PC引擎贴图最大2048；手机按现有导出规则1024。
- 不写UE、不改已有材质，未实机数据不称GPU实测。

### Task 1：来源与采样比较

Files: analysis/scripts/fg_layers_measure.py、analysis/results/FG_Layers/来源与测量.json、看法.md。
- [x] 从V04_96_2x12_2K导入布局读四个2048²贴图，独立RGBA取格；记录96帧/12×2、各卡片世界宽高。
- [x] 从正式FC6O导出记录每帧Zoom尺寸，以512/世界宽计算纹素/m；用相同世界单位比较，不把不同卡片高度当细节倍率。
- [x] 比较相同64帧预算的4×4方格与8×2长格：每格256×1024、同形态边界；说明仅算空间预算，未实现单簇导出器。

### Task 2：模板与缺口

Files: FC6O_FanGold参数.json、当前对话记录、共享状态。
- [x] 逐字段核对模板P/M；原本已相同则不重复改写。
- [x] 原版head/front/scatter与现有star/spark/ember逐项映射；新增能力只针对剩余末段控制。
- [x] 源码占用期间不写tool/src；记录准确待接入字段/执行边界，现有参数不能冒充新物理。

### Task 3：实际结果与交接

- [x] 用正式__fw.exportFiles对FC6O实际导出，运行回放检查与标准检查，不覆盖旧报告。
- [x] 亲眼查看真实图集解码同秒对比；与显示比例/实际800–1200m收益分开。
- [x] 检查差异白名单、fetch/rebase、同步体检后提交推送；状态写明剩余源码依赖，不冒称分层功能完成。

执行说明：当前取景候选检查完成；新增末段门控/气流仍依赖现有源码任务释放，保持未完成。不由排队记录推定实现。
