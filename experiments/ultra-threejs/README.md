# Ultra · Three.js 实验版

基于已上传的 `ultra` 分支（`04fce8f`），重新实现预览与烘焙的绘制管线。独立分支：`codex/ultra-threejs`。原 Ultra 和主线烘焙器保留；截图、生成贴图、HDR 和视频留本地。

## 打开

在这个目录运行 `python serve.py`，自动打开：

[Three.js 烟花实验室](http://127.0.0.1:18767/experiments/ultra-threejs/)

Three.js 已随代码附带，不需要安装依赖或访问 CDN。浏览器用支持 WebGL2 浮点渲染的 Chrome / Edge。ES 模块与 worker 需要本地服务器，不能直接双击 HTML。端口被占用时用 `python serve.py --port 18768`。

## 怎么比较

1. 先选金芒菊、鸿巢四尺玉、片贝四尺玉或三档 V5 尾缀。
2. 尾迹模型保持「原参数」，勾选「同步对比原 Ultra」。两侧使用相同配方、时间、取景、输出像素、曝光和显示曲线；旧引擎使用原来的 WebGL 绘制代码。
3. 暂停后拖动时间，依次看展开、尾迹长度与最后消散。把空间采样设为 1×，先比较绘制引擎；再提高采样观察抗锯齿差别。
4. 对四尺玉可以切换「独立余烬」。这是另一个尾迹模型：粒子从星体轨迹上出生，分别飞行、冷却、变暗和熄灭，寿命由稳定的编号决定。它改变模型，不能用来证明 Three.js 本身更准确。
5. 选择「烘焙当前效果」，完成后自动切换到实际贴图回放；下载贴图和参数。参数或模型改变会使旧烘焙结果失效。

## 本版做了什么

- 绘制由 `THREE.WebGLRenderer`、`RawShaderMaterial`、`InstancedBufferGeometry` 与 `WebGLRenderTarget` 完成。新绘制器不调用旧 WebGL 的绘制函数；旧页面只在对比时运行。
- 保留 Ultra 的 480 Hz 星体物理积分、240 Hz 轨迹历史与 Hermite 插值。CPU worker 生成轨迹，GPU 根据出生时间、速度、阻力、重力和个体寿命计算火花。
- 点状火花改成独立面片，计算像素覆盖率；不受硬件点尺寸上限限制。连续尾丝保留原结构，修正 Three.js 默认背面剔除造成的尾迹丢失。
- 1K / 2K / 4K 实际预览，1× / 2×2 / 4×4 空间采样，像素放大镜、曝光、可关闭光晕、4K PNG 静帧和线性浮点 PFM。
- 基础空中花型、上升、六类地面循环与水面倒影；熟悉的研究效果沿用原参数快照，不冒充已经通过的新配方。
- 灰度烘焙先在线性 RGBA16F 中做时间与空间平均，再编码为 8 位贴图。每张至少 2K，64 / 128 / 256 帧，四通道接力，星头和拖尾可分别输出。
- 原始字节写 PNG，Alpha 是第四组帧的数据，经过下载仍保留完整 RGB；贴图回放用 DataTexture，避免透明度预乘丢掉前三组帧。
- 加载可切换、烘焙可取消。切换效果释放旧轨迹、材质、几何体和贴图；同一绘制器的工作内存预算 1.4 GiB，超出的采样选项不可选。

## 清晰度能提升多少

需要分清预览与最终素材。4K 预览画的是当前粒子，不代表 2K 序列贴图每一帧也有 4K。

| 2K 方形贴图 | 格子 | 单格像素 | 代价 |
| --- | --- | --- | --- |
| 64 帧，RGBA 接力 | 4×4 | 512×512 | 4.56 秒金芒菊约 14 帧/秒 |
| 256 帧，RGBA 接力 | 8×8 | 256×256 | 同一时长约 56 帧/秒 |
| 64 帧，4K 母版 | 4×4 | 1024×1024 | 文件和显存更大 |

第一行相对第二行单帧像素面积增加 4 倍，但时间采样变稀；这来自分配方式，不是 Three.js 自动提高四倍。尾缀使用矩形格子：2K / 64 帧为 16×1，单格 128×2048，保留纵向细节。

空间超采样减少细线锯齿；它不能补回过大的颗粒、错误的寿命或错误的发色。Three.js 更便于管理场景和渲染资源，但物理模型、配方结构和素材每帧像素才决定还原上限。

## 范围与限制

- 这是第一版绘制与烘焙实验，使用正交投影，面向 Cascade 平面素材。尚未迁移原工具全部迭代区、资产管理、组合编排、分段 / Zoom 规划和引擎导入 UI。
- 默认研究配方来自金芒菊与四尺玉第三版。V4 的 CIE / Planck 光谱实验未迁移；没有重新完成实拍化学分析，温度与颜色仍是视觉近似。
- 三档尾缀保留已认可的 V5 参数，但这里烘焙的是完整实验时间线；正式的「循环 + 两档消散 + 弹道」包仍由原工具导出。
- `fwl.three-bake/1` 参数文件记录布局、每帧时刻、颜色与配方，不是已验证的主线 `fwl.cascade/1` 自动导入包。用于 UE 的正式导出仍以主线为准。
- 内部使用半精度 RGBA16F；PFM 输出保存线性浮点 RGB，不是 8 位截图，也不代表模拟已经具有光谱测量精度。
- 复杂四尺玉的首次加载和跳到很晚的时间需要重跑物理，暂停拖动时可能短暂等待。高采样、更大像素或同时运行旧引擎增加开销，本版不声称比原 Ultra 更快。

## 源码与验证

`scripts/sync-ultra.mjs` 从旧 Ultra 生成只读的物理与 shader 模块，附带按 LF 文本计算的源文件 SHA256；不要直接改 `src/generated/`。开发时运行 `npm ci --ignore-scripts`、`npm run sync`。Three.js 固定为 0.186.1，许可证在 `vendor/LICENSE-three.txt`（附带文件只有一处缩进规范化，未改功能）。

- `src/tracks.js` / `worker.js`：纯物理轨迹与地面发射器。
- `src/renderer.js`：Three.js 绘制、覆盖率、线性浮点目标。
- `src/bake.js`：烘焙、RGBA 打包、实际贴图回放。
- `src/export.js`：保留四通道的 PNG、PFM 和参数下载。
- `src/main.js` / `legacy-bridge.js`：独立界面与同步对比桥。

`npm test` 验证轨迹、子花出生、个体寿命、无阻力极限、RGBA 排序和 PNG 原始字节。浏览器验证使用 Playwright 与 Chrome：

```
node tests/browser.cjs
node tests/verify.cjs
node tests/features.cjs
node tests/ui.cjs
```

测试先查找本地 Playwright，也支持 `PLAYWRIGHT_MODULE` 指向已有模块，预览地址可用 `THREE_LAB_URL` 更换。本机 2026-09-30 的结果见 `verification-summary.json`；图片和实际导出文件在被忽略的 `outputs/`，不进入 Git。

参考：[Three.js 颜色管理](https://threejs.org/manual/pages/color-management.html)、[WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)、[BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html)。
