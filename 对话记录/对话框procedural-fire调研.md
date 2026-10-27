# procedural-fire 调研（Codex）

## 2026-10-27：开源项目原理与烘焙器结合评估

用户原话：
> procedural-fire 帮我搜一下一下giT的这个开源项目，帮我说一下原理，并且如果放到本地渲染的话，可以和我们的烟花烘培器有什么结合提升

范围：检索、读取上游源码、对照本仓库现有能力，给出本地离线渲染与贴图烘焙的结合建议。本轮不安装或运行上游项目，不改烘焙器、参数、UE 资产及用户数据。

- [x] 完整读取 CLAUDE.md、协作/标准.md；同步体检通过，fetch 后无落后提交；开工包无本对话未完事项。
- [x] 定位同名仓库 Leonxlnx/procedural-fire，读取 README、模拟、渲染、最终渲染脚本及 LICENSE。
- [x] 核对现有粒子、温度、拖尾、快门与导出能力，区分可复用能力和新增收益。
- [x] 完成原理、结合优先级、落地边界与验证建议；文档检查与提交结果见本文件 Git 历史。

来源：https://github.com/Leonxlnx/procedural-fire

### 源码核实

- 上游为 WebGPU 三维营火演示，不是现成烟花烘焙插件。`src/sim.js` 在规则体素中保存速度、温度、燃料、燃烧产物、烟炱、气体年龄及有机烟。每步执行 MacCormack 平流、旋度、燃烧及外力、散度、多重网格压力求解、速度投影。属于低马赫数近似并带燃烧膨胀源，不适合直接承担烟花爆炸冲击波。
- 燃烧按燃料与空气的局部混合量、点火温度近似；烟炱延迟生成并氧化，热气浮升，叠加旋度约束和 curl 扰动，形成火舌、分叉和破碎。它是物理启发的图形模拟，不能把 README 的 physically based 当成工业燃烧验证。
- `src/renderer.js` 沿视线积分发光、吸收和烟的单次散射；内部体积输出 RGB 辐亮度 L 与透射率 Tr。`src/blackbody.js` 用普朗克谱与 CIE 1931 积分建黑体及烟炱查表；蓝焰另由热释放驱动的经验项生成，不是黑体自动变蓝。
- `src/sparks.js` 的火星随流体速度场运动，叠加惯性、重力、燃烧及冷却；拖影按投影面积和线长归一化能量。不是火焰与火星双向反馈的完整耦合。
- `src/main.js` 的 hero 档为 160×240×160 = 6,144,000 体素，域大小 1.2×1.8×1.2 m，体素边长 7.5 mm；cine 档 224×336×224，约 5.4 mm，作者注明外观尚未验证。原燃料源与木柴/炭床的几何绑定，移动喷口或烟花星体需要源项适配。
- `tools/render_final.mjs` 的最终片为 20 s、1080×1920、30 fps，hero 模拟步长 1/240 s；README 报 RTX 4090 约 15–25 分钟。这是作者营火视频场景的估算，不是本机或烟花贴图的测试成绩。
- 根 LICENSE 为 MIT；package.json 的 license 字段仍写 ISC，复用时需核对并保留上游声明，不应只按 package.json 判断。

### 本仓库已有能力与新增收益

阅读基线：本地 HEAD f6d842fa，2026-10-27 fetch 后无落后提交。

- `tool/src/js/45_spark_flow.js` 已有共享解析气流场、随流响应、RK4 轨迹缓存及任意时刻采样；这不是温度/烟/压力共同演化的三维燃烧求解器。新增收益应放在火焰、烟、火星共享同一模拟速度场。
- `48_render40.js` 已有快门时间窗和子帧积分；`46_camera_render.js` 已有亚像素面积归一化、拖影与散焦；不能把这些宣传成接上游后才有的新能力。
- `40_gl.js` 已有温度冷却和 glowOf 近似，当前亮度函数为 max((T−900)/1150,0) 的三次方；上游可作为更完整辐射/冷却模型的参考，不能直接替换后改变已通过效果。
- 最有希望：升空尾焰、彗星燃烧头的局部火舌与烟卷；喷花/喷泉的气柱与大小火星随流差异；余烬冷却。空中菊/柳的花型、弹道、节奏仍由现有粒子结构负责，收益须在 800–1200 m 游戏尺度衡量。

### 建议的结合方式（建议，未实施）

配方与既有粒子轨迹 → 本地 WebGPU 离线燃烧后端 → 无背景的发光/透射分量 → 现有取景、曝光与灰度 RGBA 接力打包 → Ramp、cascade.json / cascade_mobile.json → 引擎回放与 UE 验证。

1. 优先单个局部尾焰，不对数百米花径铺毫米级体素，也不为所有星体各跑一套完整流体。移动域/喷口源需要改造，不能把营火画面拉长当尾焰。
2. 上游默认是有场景、有镜头后期的不透明视频输出；需新增干净的分量读回与适配接口，保留可重复的种子、固定步长、预热及模拟状态缓存。状态性流体不能直接复用现有解析粒子的随意时间跳转；需预计算或检查点。
3. 原始场景、Bloom、景深、颗粒、色差、暗角和背景热扰动不进入素材。模拟步频与输出帧频分开，按既有 30 fps 引擎的帧计划采样，不导出用不到的 240 fps 帧。
4. 单份灰度加 Ramp 可表达与亮度相关的颜色，不能独立保存每像素温度、发光与透射。多色区域可评估按温度分少数发光层；同时增加层数/overdraw，不能宣称免费保真。烟的消光和背景折射必须核实已有材质是否支持；现规则不新增材质，不承诺完整烟遮挡或热扭曲。
5. 营火向空气取氧的源项并非烟花药剂燃烧，彩色烟花还包含原子/分子发射；黑体不能代替全部红绿蓝配色。参考 ACS 作者讲座 PDF 的 Light Processes 与 Colors 页。保留本项目 Ramp / Color Over Life 控制及既有批准结果。
6. 第一项验证建议：一个 1–2 s 升空尾焰样片，与现方案同取景、同单格分辨率、同输出帧预算、同曝光对比；测烘焙耗时、明暗层次、裁切、连续播放和循环接缝（需要循环时），按 PC≥512 / 手机≥256 的现有下限出片，最终在游戏尺度与 UE 检查。纹理张数和面片面积也相同时，游戏无需运行流体；实际成本仍看纹理内存、透明叠层与屏幕覆盖面积。

本机只读检测到 Intel Graphics 与 NVIDIA GeForce RTX 5080。具备试跑条件，但本轮没有验证 WebGPU 适配器选择、显存峰值、实际速度、画质、透明导出或 UE 表现；没有导出新候选、没有用户验收。

### 可复查来源

- README：https://github.com/Leonxlnx/procedural-fire/blob/main/README.md
- 模拟核：https://github.com/Leonxlnx/procedural-fire/blob/main/src/sim.js （本轮内容 blob c1ce4728c82e644ea2814d87c01efb02463d5302）
- 渲染核：https://github.com/Leonxlnx/procedural-fire/blob/main/src/renderer.js （本轮内容 blob b5472c853dc8f96c61498729ab3b5df178dc7c7c）
- 光谱：https://github.com/Leonxlnx/procedural-fire/blob/main/src/blackbody.js
- 火星：https://github.com/Leonxlnx/procedural-fire/blob/main/src/sparks.js
- 离线入口：https://github.com/Leonxlnx/procedural-fire/blob/main/tools/render_final.mjs
- 许可：https://github.com/Leonxlnx/procedural-fire/blob/main/LICENSE
- 烟花发光机制（ACS 主讲 Chris Mocella，第 13–15 页）：https://www.acs.org/content/dam/acsorg/events/popular-chemistry/Slides/2011-12-08-chemistry-fireworks.pdf
