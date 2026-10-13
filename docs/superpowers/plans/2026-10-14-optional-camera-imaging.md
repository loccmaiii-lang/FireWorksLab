# 可选快门与景深 Implementation Plan

> **For agentic workers:** 按用户已授权范围在本会话逐项执行；不额外派生任务。步骤用复选框记录。

**Goal:** 两个火星候选支持可关闭的摄影运动亮痕、真实深度散焦，并测量质量与耗时。

**Architecture:** 镜头参数与几何模拟分离。通用快门秒数接入共享采样入口；三维粒子图用曝光窗口事件裁剪及逐粒自适应积分，避免重复绘制历史拖尾。景深用正交取景的有限光圈射线偏移，逐粒深度形成圆/六边形散焦光斑，能量按样本权重归一化。关闭时原渲染器逐像素不变。

**Tech Stack:** JavaScript/WebGL2、Python、Playwright/Edge。

## Global Constraints
- PC 单格 ≥512，手机 ≥256；图集规格、Ramp 和 Cascade 格式不变。
- 默认关闭，不改认可配方，不写 UE 或工坊原工程；真实景深只使用现有三维位置，不给二维旧模拟编造深度。
- 用户批准本轮成像烘入素材；只替换旧相机不进素材约定对应部分。

## Task 1 镜头数学与回归
Files: 新增 `tool/src/js/46_camera.js`、`analysis/scripts/spark_camera_test.cjs`；修改 `46_graph_model.js`。
- [ ] 测试关闭几何哈希不变、速度与快门决定长度、死亡事件曝光保留、分叉不得早生、焦平面散焦为零、光圈加倍半径加倍、均匀采样权重和为1。
- [ ] `CameraImaging.window(P,t)` 输出绝对秒窗口；`CameraImaging.coc(P,depth)` 输出世界米散焦半径；`SparkGraph.cameraGeometry(graph,time,P,ppm,only)` 输出同11浮点实例布局。
- [ ] 根据曝光与粒子生存区间相交裁剪，按位移、弯曲、亮度曲线增加采样；每个形态用瞬时形状，再积分。
- [ ] 运行 `node analysis/scripts/spark_camera_test.cjs`，先复现失败再实现通过。

## Task 2 正式渲染与参数
Files: `46_graph_render.js`、`48_render40.js`、`79_graph_editor.js`、`10_types.js`、参数元数据及登记脚本。
- [ ] 图模型使用独立镜头积分渲染核，清楚区分快速实时预览与输出质量；可选开关进入配方/指纹。
- [ ] 瞬时亮点亚像素面积守恒，散焦核总能量守恒，快门时域和光圈域避免锁成对角重影。
- [ ] 模式开时隐藏艺术历史线长；距离、焦平面、光圈和散焦形状可调，保存刷新完整往返。
- [ ] 两候选快门从1/30s END起步；景深保留焦内细丝和焦外粗软火星。重新校准面亮度。

## Task 3 真实产物和交付
Files: `analysis/scripts/spark_camera_probe.cjs`、现有 SparkGraph 检查脚本、版本/记录/标准报告。
- [ ] 固定 seed、时间、取景，比较关闭/快速/高质量/加倍采样；记录实际毫秒与误差。
- [ ] 烘焙实际PC/手机包，运行标准与回放检查，审看整体/局部/连续播放。
- [ ] 执行保存刷新导出交互；默认关闭与旧基准逐像素回归。
- [ ] 升号、构建、检查、白名单提交推送，释放共享源码；仅标AI自检，用户验收保持未通过。
