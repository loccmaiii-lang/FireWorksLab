# 烟花母版烘焙器

离线模拟写实日式烟花（菊、牡丹、锦冠、柳、千轮、蜂），烘焙成 UE 4.24 Cascade 可直接使用的通道打包序列帧，并导出 Cascade 参数表。

## 使用

用电脑版 Chrome 或 Edge 直接打开 `tool/FireworkBaker.html`，不需要安装。右上角会显示当前使用的显卡；如果提示「软件渲染」，请开启浏览器硬件加速，笔记本需把浏览器设为高性能显卡。

## 目录

| 路径 | 内容 |
| --- | --- |
| `tool/FireworkBaker.html` | 烘焙器（单文件） |
| `samples/Kiku_01/` | 菊的样例导出：2K 贴图、渐变图、Cascade 参数表、曲线 CSV、参数 JSON |
| `research/python/` | 早期的 Python 离线渲染与轨迹时间图实验，仅供参考 |
| `PROGRESS.md` | 未完成事项与进度 |

## 导出格式（与项目材质约定）

- 一张贴图、灰度、BC7、只导出 2K（1K 在引擎内复制后设最大尺寸）
- 帧号由 Dynamic Parameter 第三通道给出，材质取整、不做帧间混合
- RGBA 接力：先填满 R 的全部格子再接 G、B、A；格子行优先，左上为第 0 帧
- 颜色：渐变图按灰度取色，随时间变色用 Color Over Life
- 面片可随开花放大（Size By Life），爆点在精灵中心

## 版本

- 2.0：火花模拟改到 GPU；保留 CPU 内核，导入旧版参数 JSON 时自动用 CPU 以完全复现
- 1.1：对齐项目材质（Dynamic Parameter 帧号、任意 N×M、渐变图、Cascade 参数表、Size By Life）
- 1.0：首个可视化烘焙器
