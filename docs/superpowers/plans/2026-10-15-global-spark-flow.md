# 粒子图全局气流 Implementation Plan

**Goal:** 锥形喷射后逐渐受风、收束和连续涡流影响，所有粒子层共用场且逐层可调。
**Architecture:** 新增纯数学 SparkFlow；轨迹用固定步长积分和 Hermite 连续采样。原解析轨迹在总开关关闭时完全保留。亲子出生、即时预览、快门积分和导出共用 SparkGraph.sample。
**Tech Stack:** 原生 JavaScript / WebGL2、Node 检查、Edge Playwright、Python现有导出检查。

本会话直接执行；无需另起任务。优先本项目现有流程与用户最小范围要求。

## Global Constraints
- 不改认可资源或用户存档；无UE写入/新材质；PC单格≥512、手机≥256。
- 统一右栏、按资源保存、默认关闭；仅窜天猴推荐候选启用。
- 本次必须：三场叠加、平滑渐入、每层响应、亲子连续、保存与烘焙验证。
- 可后做：空间可视化编辑；暂不建议：CFD、马赫环、燃烧求解器。

### 1. 共用轨迹
- [x] 新建 `tool/src/js/45_spark_flow.js`；接口 `prepare(recipe)`、`attach(q, field)`、`sample(q, age)`、`parameterDefault(key)`。
- [x] `46_graph_model.js` build一次prepare，每粒创建后attach，sample优先使用轨迹缓存；关闭走原函数。子粒出生调用同一sample。
- [x] 新建 `analysis/scripts/spark_flow_test.cjs`：关闭轨迹相等、恒定风解析解、先扩后收、子粒位置/速度连续、乱序查询一致、步长减半收敛、场周期一致、非法值拦截。
```js
assert.deepEqual(offSample, baselineSample);
assert(Math.abs(windSample.v[0] - U*(1-Math.exp(-rate*t))) < 1e-3);
assert.deepEqual(sample(child,0).p, sample(child.parent,child.eventAge).p);
```

### 2. 参数与候选
- [x] `46_graph_model.js` 原SCHEMA增全局模块和逐层倍率，`10_types.js` pGet缺失气流字段只读默认，不写旧配方；元数据两张表登记。
- [x] `analysis/原理/条目_窜天猴与仙女棒.json`只给SGR1启用，经原粒子速度/寿命选择渐入距离和响应时间；不变粒子数量、亮度和13层形态。
- [x] 原理文档记来源、物理区别和近似；升版本4.9.104（若并行变更占用则顺延）。

### 3. 真入口与交付
- [x] 新浏览器检查验证实际统一行/修改/撤销/保存刷新与帧变化；回归关闭与旧构建像素一致。
- [x] 原 `spark_graph_bake.cjs` 导出，`spark_graph_check.py` / 标准检查审查两套真实包，审看关键帧和连续回放。
- [x] `python tool/build.py`、合入门禁、更新记录/状态/交接；白名单提交，安全同步推送。
