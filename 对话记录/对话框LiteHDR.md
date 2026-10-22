# 移动端 LiteHDR：_M / _H 分别校准

## 2026-10-22 · 用户反馈与讨论确认

用户原话：

> 你知道移动端的LiteHDR吗？现在手机端的烟花，中低端机型会默认开LiteHDR,特效就会变白，就没有着色了，所以_M和_H要分开调整

随后补充第二张截图：

> 这是没开liteHDR的效果

本轮完成标准：确认两张截图的开关含义、核对项目已有证据、记住 `_M` / `_H` 分开调色和亮度的要求；本轮为讨论与只读调查，不把参数建议写成已验证修复。

- [x] 完整阅读 CLAUDE.md、协作/标准.md，运行同步体检、开工包，核对远端与冻结；保留已有未跟踪文件。
- [x] 对照用户两张截图：第一张（用户说明开启 LiteHDR）烟花主体偏灰白，第二张（用户说明未开启）保留明显金黄。两图机位、距离、时刻不同，只作现象依据，不据此推算统一补偿倍数。
- [x] 只读核对 2026-10-15 材质快照，区分通用材质的 LiteHDR 调节能力与烟花实际父材质。
- [x] 确认后续 `_M`、`_H` 分别校准亮度与颜色；每档按实际使用的渲染路径验收，不能只改粒子后缀或直接照搬另一档参数。

### 已核实与边界

- `spec/烟花特效资产规范.md` 第 28 / 30 行旧约定为 `_M` / `_H` 共用手游材质实例与序列贴图，第 64 / 65 行分别映射 FxSP_Low / FxSP_High。独立粒子颜色曲线可在共用材质、贴图的情况下分别调整；只有需改材质实例参数或 Ramp 像素时才评估拆分，不能把“分开调整”直接扩大为复制整套资源。
- `spec/cascade_params_v1.md` 第 130 行、`tool/src/js/66_fwlcascade.js` 第 145 行表明当前烘焙器手机导出为 M，H 格式预留而未出；未发现已有 M/H 独立色彩导出能力。用户本次要求已记录，未把旧实现说成已支持。
- 证据：`analysis/results/UE_READBACK_20261015/黑块排查.json`。这是旧快照，不能代替 10-22 当前 UE 现场读回。
- 通用父材质 `M_EFX_MainTex`、`M_EFX_DissolveOutline_Soft` 有 `MaterialExpressionLiteHDREnableColorAdjust`、`AdjustLiteHDR`、`MultiColor_LiteHDR`；MainTex 的静态开关默认关闭，启用时可根据自定义节点值选择普通 / LiteHDR 颜色。仅凭节点名及接线不能确定引擎实现和机型触发条件。
- 同一快照中，烟花序列父材质 `M_EFX_FlipBookSuperPack_FireBase_Unlit` 的直属节点及直接参数未发现上述 LiteHDR 命名项。不能声称当前烟花已接入通用材质的补偿分支。
- 发白可能涉及高亮压缩、通道饱和或混合阶段的差异；截图不足以在这些机制中定因，不能说 LiteHDR 本身必然没有颜色。

### 后续执行依据（本轮未实施）

先核对目标烟花 `_M` / `_H` 的实际资产、材质实例共享关系和运行路径，再以同机位、同一爆开时刻的 LiteHDR 开 / 关对照测试亮度及颜色。优先验证降低自发光是否能恢复颜色层次，再调整颜色曲线 / Ramp；需独立改值时避免修改共享实例或共享 Ramp 而串改另一档。保留可共用的灰度运动贴图，不凭两张截图增加贴图或层数。

本轮没有修改 UE、P4、烘焙器、导入器、正式效果、默认值或规范；未做 LiteHDR 实机修复与验收。记录提交号见本文件 Git 历史。

## 2026-10-22 18:20 · 批量修正开了 LiteHDR 的资产

用户原话：

> /F:/FireWorksLab/对话记录/对话框LiteHDR.md  这里面有记录，我的目标是让你批量帮我把开了litehdr的资产修正

完成标准：查清哪些手游烟花资产跑在 LiteHDR 档、LiteHDR 发白的机制和可用的修正路线；范围和路线经用户定后，按 dry → 备份 → 写入 → 读回的护栏批量改 UE，记录改了什么、哪些未经实机验证。

- [x] 开工：同步体检、开工包；UE 桥 17780 在线（`Dam_Iris_Long3`，非 PIE）。
- [x] 只读查引擎着色器：LiteHDR 机制（见下）。
- [x] 只读列手游 ResourceFX 表烟花行（53 行）与 `/Game/Effects/Props/FireWorks` 资产（137 个）。
- [x] 只读爬 `_M` / `_H` / `_L` 粒子颜色模块（爬到 81 / 129 个时 UE 崩溃，见下；材质实例参数未读）。
- [x] 向用户确认范围与路线（18:5x 用户选：**只改 3.0 烟花**；**复制出 _H，再调 _M**）。
- [ ] 等网格垂柳UEv3 释放 UE，再在状态清单认领 UE 写入。
- [ ] 补读没读到的 3.0 资产（窜天猴 sku、点灭星）和 3.0 材质实例参数；读 LiteHDR 控制台变量当前值。
- [ ] 定 `_M` 的 LiteHDR 亮度：先找能看 LiteHDR 的预览办法，不能凭空定倍数。
- [ ] 复制 `_M` → `_H`（三格同指 `_M` 的行），手游表 FxSP_High 改指 `_H`；dry / 备份 / 写入 / 读回。
- [ ] 调 `_M`（窜天猴 sku 行连 `_L` 一起，它们也在 LiteHDR 档）；dry / 备份 / 写入 / 读回。

### 已核实（只读，本机引擎 `E:/loc_ma5/DFMEditor/Engine/Shaders`）

- `Mobile/J3BasePassOutColorCompose.ush` 第 56 行：每次绘制输出先压成 `c·k.x / (1 + c·k.z)`（`HDRLiteAdjustment`）。加色混合在压缩后的值上相加；`MobileLiteHDRTonemap.usf` 的 `DecodeHDRSceneColor` 是 `1/(1/saturate(C) − 1)`，叠加和到 1 就解成无穷大 → 三通道全满 → 白。单张面片颜色不丢，**多张加色叠加**才发白；越亮、叠得越多越早发白。
- 门槛 `Common.ush` `IsLiteHDRShaderStage()`：ES3.1 且材质质量档 ≤ 3。控制台变量（Renderer.dll 字符串）：`r.Mobile.OnePassLiteHDR`、`r.HDRLite.Adjustment(Inside/Outside)`、`r.LiteHDRWhenPossible`。项目 Config 未见改这些值。
- 引擎有材质节点 `LiteHDR Shader Stage Switch`（`IsLiteHDRShaderStage() ? A : B`）和 `LiteHDREnableColorAdjust`；通用父材质 `M_EFX_MainTex` 用法：静态开关 `AdjustLiteHDR` 打开后，LiteHDR 下改用 `MultiColor_LiteHDR`。烟花父材质 `M_EFX_FlipBookSuperPack_FireBase_Unlit`（10-15 快照）没有这套，只有 `MultiColor` / `AddColor` / `EmissiveIntensity` / `EmissiveRampTex`。
- 手游表现状（10-22 读）：**3.0 烟花各行 FxSP / FxSP_Low / FxSP_High 三格都指同一个 `_M`**（窜天猴 sku 几行例外，有 `_L` / `_H`）；2.0 各行是 `_M` / `_L` / `_H` 三份。所以 3.0 现在没有能单独调的 `_H`，直接改 `_M` 高端机也跟着变。

### 18:35 UE 崩溃（我的只读爬取引起）

- 爬到 `P_EFX_FireWorks_SkyRocketSparkler_L` 时，`/object/get` 读 `…:ParticleModuleSize_2.DistributionVectorUniform_0` 触发 UE 断言 `Assertion failed: RequiredModule`（`ParticleComponents.cpp:1796`），调用栈经 GPUECli HTTP。报告：`DFM/Saved/Crashes/UE4CC-Windows-0C88A2CC43B279D8E175E3AD469D4370_0000`。18:39 起有新的 UE 进程，桥 17780 已恢复。这次只是读取，没有写入或保存；但崩溃前编辑器里没保存的东西可能丢了。
- 以后不在这个资产上逐对象爬取；要读的话只读颜色模块，并且先读上层对象确认 `RequiredModule` 不为空。
- 已爬到的结果（过程证据 `analysis/local/20261022_LiteHDR_批量修正/summary.json`）：3.0 `_M` 颜色曲线峰值 1–6，ColorScaleOverLife 峰值 1–50（红彗星 50、橙辉菊 30、金垂柳 / 银冠菊 10）；2.0 的 `_M` / `_L` 颜色峰值 300–3000，ColorScale 50–2000。没爬到的：窜天猴 sku 的 Sparkler_M / Sprint / Tail / Smoke、点灭星 Strobe_M、2.0 拖尾、Real、MusicFest、Operation。
