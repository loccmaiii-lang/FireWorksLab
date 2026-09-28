# JM2 评审（WorkBuddy，2026-09-28 23:35）

只是看预览和参数表的意见，不代替用户在引擎里确认。

## 文件检查
- 两套（Zoom / Fixed）都是 2048×2048 RGBA，四个通道都有内容；8×8 格、单格 256、共 256 帧、4.56 s。
- Cutout 512×512，一张；Ramp 256×8。
- 大文件在本机 `analysis/local/输出/JM2/`，这里只有参数表、JSON、曲线和缩小预览（共 1.4 MB）。

## 看预览
- **Zoom 生效**：约第 5 帧起花就占满格子，之后一直满格；Fixed 前几十帧花很小、四周空（JM1 的问题）。
- Size By Life 0.510 → 1.000（相对时间 0 → 0.768），X、Y 同一条、Linear；Initial Size 24957 cm 是开花最大时的尺寸。
- Zoom 的 Cutout 剩约 54% 面积（参数表数字）。
- 最前 4–5 帧仍是中心一个小亮点：这是开花初期本身就小，放大倍数最小只到 0.51，属正常。

## 进引擎要看的
- 用 `T_JinMangJu_Zoom_帧号测试.png` 播一遍：圆应该不动、不胀缩（Zoom 版的圆是按同一条 Size By Life 反向烘焙的，播放时应抵消成固定大小）。
- Size By Life 需勾 Multiply X / Multiply Y，所有关键点 Interp Mode = Linear。
