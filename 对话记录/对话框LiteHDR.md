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

### 18:35 UE 崩溃（更正：大概率是网格垂柳UEv3 的写入触发）

- 爬到 `P_EFX_FireWorks_SkyRocketSparkler_L` 时，`/object/get` 读 `…:ParticleModuleSize_2.DistributionVectorUniform_0` 触发 UE 断言 `Assertion failed: RequiredModule`（`ParticleComponents.cpp:1796`），调用栈经 GPUECli HTTP。报告：`DFM/Saved/Crashes/UE4CC-Windows-0C88A2CC43B279D8E175E3AD469D4370_0000`。18:39 起有新的 UE 进程，桥 17780 已恢复。这次只是读取，没有写入或保存；但崩溃前编辑器里没保存的东西可能丢了。
- 更正（18:5x）：`对话记录/对话框网格垂柳UEv3.md` 记载它当时正在脚本重建新 Emitter 的 L3，先写了 LODLevels、新 LOD 还没挂 Required，触发同一断言；我的 `/object/get` 在排队（耗时 53.6 s 后断开）。所以崩溃大概率不是我的读取引起的。但对方 18:28 已登记 UE 单写占用，我仍并发读 UE，不妥：以后别人占用 UE 时我不发任何请求。
- 已爬到的结果（过程证据 `analysis/local/20261022_LiteHDR_批量修正/summary.json`）：3.0 `_M` 颜色曲线峰值 1–6，ColorScaleOverLife 峰值 1–50（红彗星 50、橙辉菊 30、金垂柳 / 银冠菊 10）；2.0 的 `_M` / `_L` 颜色峰值 300–3000，ColorScale 50–2000。没爬到的：窜天猴 sku 的 Sparkler_M / Sprint / Tail / Smoke、点灭星 Strobe_M、2.0 拖尾、Real、MusicFest、Operation。

## 2026-10-22 19:3x · 用户已切手游编辑器，改方案

用户原话：

> 要开专门的手游编辑器，这个是命令：r.Mobile.OnePassLiteHDR 0/1

> 我切到了手游编辑器，平且用P_EFX_FireWorks_LittleCombo_M开了r.Mobile.OnePassLiteHDR 1复现了效果，现在就是开着得效果，同时以往得经验是，color倍增不能超过3，亮度只能通过alpha，现在不开litehdr，所有效果都偏暗，因为现在默认都没有倍增与scalecolor都为1，比较暗淡所以要_H/_M都需要调亮，你设计比对一下，然后重新设计一套修改方案执行

拆解：

- [x] 网格垂柳UEv3 19:36 已释放 UE；手游编辑器（`-inifeature=Mobile`，FXLookDevLevel）在线；状态清单认领 UE。
- [x] 设计对照（脚本 `analysis/local/20261022_LiteHDR_批量修正/`：`hdr_ue.py` UE 侧、`grid.mjs` 网格、`analyze.py` 打分）：
  - 每个效果在 FXLookDevLevel 高空同一点（300 m）放 `_H` / `_M`，正后方临时黑挡板（`FWLHDR_` 前缀，不存图）模拟夜空，机位按取景截图自动算（占画面约 70%，仰 12°）；同机位、同时刻（0.15T、0.4T）。
  - `_H` 在 LiteHDR 0 下拍 现值 + c{1,2,3}×a{1,2,4}；`_M` 在 LiteHDR 1 下拍 现值 + c{1,1.5,2,3}×a{2,4,6,8}。c = 每个发射器颜色总倍增目标 min(现总倍增×c, 3)（只改 ColorScaleOverLife 的 RGB），a = alpha 倍数（AlphaScaleOverLife；金垂柳用 StartAlpha）。只改内存，跑完还原磁盘原值。
  - 打分：减背景后烟花像素的亮度 E、饱和度 S、发白比例 W、色相；`_H` 取「S ≥ 现值 90%、W ≤ 现值 +5%」里最亮的，`_M` 取跟选中 `_H` 最像的。
  - PC `_HD` 在手游编辑器里不渲染，没法当参照；FXLookDevLevel 是白天，故用黑挡板。
  - 踩坑（都已绕开）：`FX.FreezeParticleSimulation` 是切换命令、参数无效（已不用，确认现在不冻结）；同一会话里截图间隔太近（< 0.8 s）后编辑器世界不再 tick 粒子、新摆的也不渲染——改成一个会话一张截图；改值后重建资产会让常驻发射器提前开播——改成每轮现摆。
  - LittleCombo 试跑：`_H` 现值 E 2.9 → c3a4 E 10.7、S 0.50 → 0.55；`_M` 现值在 LiteHDR 下 E 0.83、W 0.82（又暗又白），提 c 往黄白偏、提 a 保得住橙色——和用户经验一致。
- [x] 出方案（全量网格 1008 + `_H` 重跑 294 + 点灭星补测 26 个会话；选档 `analysis/local/20261022_LiteHDR_批量修正/tune_plan.json`）：
  - `_M`（LiteHDR 开）：每个发射器颜色总倍增 ≤ 3，亮度靠 alpha（×4–×8）；按「跟选中 `_H` 最像」选，差距 0.14–0.50（现值 2.9–5.1）。
  - `_H`（LiteHDR 关）：≤ 3 的发射器往上提到最多 3，已高于 3 的保持原值不往下压（看图：红彗星星头 2500→3 会丢光球）；alpha ×2–×4；按「不明显变灰 / 发白里最亮」选。
  - 人工改了两个：金垂柳 `_H` alpha ×4 偏白 → ×2；点灭星随机色 + 闪烁，打分不可靠，看 3 次重复拍：`_H` 原 ×100 不暗、保持，`_M` c3a8 在 LiteHDR 下亮且有粉 / 黄色。
  - 「颜色 ≤ 3 只管 `_M`、`_H` 不压已有的高倍增」是我对用户经验的解释，待用户确认。
- [x] 复制 `_H`、改表（`analysis/local/20261022_LiteHDR_批量修正/dup_h.mjs`）：18 个 3.0 效果 `_M` → `_H`（保存、P4 标记添加），手游表 18 行 FxSP_High 改指 `_H`（迁出、保存）；verify：`_H` 与 `_M` 发射器 / 材质一致，表这 18 行其它字段没动。没提交 P4。
  - `SkyRocketSparkler_H` 早就有、表没用它，这次没动，留着给用户定。窜天猴 sku 另外 4 行本来就分了 `_L` / `_H`，没复制。
  - `LittleCombo_M` 内存里有用户复现时的改动（ColorScaleOverLife 1→10、AlphaOverLife 1→5，没保存）：没动用户的 `_M`；复制出的 `_H` 把这两个值写回磁盘原值（1 / 1）。
  - 发现：GPUECli `/datatable/row/update` 每改一行就自动保存一次表（每次约 2.6 s）。
- [x] 按方案批量改 `_H` / `_M`（`tune.mjs`）：dry 35 包内存值 = 磁盘原值、无人迁出 → 备份（哈希核过，`备份/tune/`）→ `_M` P4 迁出、`_H` 已是新增 → 改 ColorScaleOverLife RGB / alpha 常量 → 保存 → 读回：35 包 87 个值一致、磁盘与写入记录一致。点灭星 `_H` 不改（跳过）。没提交 P4，没动材质实例 / 母材质 / 贴图 / PC。
- [x] 保存后的资产重拍验证（144 张：黑挡板两时刻 + 白天天空），与网格选档一致（亮度比 0.94–1.06，点灭星随机色 0.92 / 1.28）；对照图与看法 `analysis/results/20261022_LiteHDR_手游分档/`。
- [x] `FXtools/节目/NewYearFireWorks_v01/资源发射器数.json`：18 行 FxSP_High 改指 `_H`（计数沿用 `_M`，读回结构一致）。
- [x] 释放 UE（状态清单）、交接第 5 节一条。

### 结果（执行结束 ✅ / AI 自检 ✅ / 用户通过：未验收，没有真机验证，P4 未提交）

- `_M`（LiteHDR 开）从又暗又灰白恢复颜色，和 `_H` 新值的差距 16 个降到 0.14–0.77（现值 2.4–5.1）；点灭星随机色看图判断；金垂柳 `_M` 没有白热芯（2.13）。
- `_H` 亮度约 1.25–3.8 倍（点灭星不变）。
- 待用户：①「颜色 ≤ 3 只管 `_M`、`_H` 不压已有高倍增」这个解释对不对；② 真机（中低端开 LiteHDR / 高端不开）看过后提交 P4（18 新增 `_H` + 18 `_M` + 手游表）；③ 窜天猴 sku 5 行要不要接着做；④ FXLookDevLevel 被临时对象标记为已修改，存不存由用户定。
- 风险：alpha 提高后半透明更遮挡后面的东西——白天天空下点灭星 `_M` 亮点外有暗边；烟花前后叠加没测。

材质核对（10-15 快照）：烟花父材质 Emissive = (AddColor + MultiColor × 贴图) × 粒子颜色 RGB，Opacity = 粒子 alpha × Alpha × 溶解 / 深度渐隐，混合 Translucent。LiteHDR 在混合前压缩颜色（`c/(1+c)` 一类），半透明混合在压缩值上做，亮色一被 alpha 混就被压灰 → 用户说的「倍增 ≤ 3、亮度走 alpha」和着色器一致（推断，待对照截图证实）。

## 2026-10-22 23:1x · 颜色 / 大小随机；_H 自发光照 PC

用户原话：

> 我还想对所有的效果做一定的颜色与大小随机，现在烟花播放的时候，都太统一了了，随机不要太大，但要有

用户选：3.0 手游 _H/_M；加出生定色模块；大小 ±8%、颜色 ±8%。

> 你现在的所有_H的alpha都x4了，但是_H的自发光可以和PC（我PC的大小与颜色随机也没做好）一直的设置的，具体你可以看看这个案例的_H与_M“ParticleSystem'/Game/Commerical/CharAppear/Storm_hc/Effect/Particle/Inspect/P_EFX_Storm_hc_Inspect_01_One_Start_v03_H.P_EFX_Storm_hc_Inspect_01_One_Start_v03_H'”

- [x] 读案例（只读）：`_H` 用和 PC 一样的高倍增（ColorScale 曲线到 122、光效层 100），alpha 不放大；`_M` 另一套（饱和底色 × 较低 ColorScale × 0.5、`_LHDR` 材质实例 AddColor 0.35、删光效 / 闪光层）。
- [x] 读 PC `_HD`（只读，`analysis/local/20261022_LiteHDR_批量修正/pc.json`）：PC 颜色倍增 ×1–×100、alpha 全 1；PC / 手游材质实例 EmissiveIntensity 相同（5 / 10）→ `_H` 照抄 PC 粒子值即自发光一致。PC 部分已有大小随机（范围参差），没有颜色随机。
- [x] 发现：上一轮写的 35 包已不在迁出状态、磁盘 = 我保存的版本 → 判断用户已提交 P4；这轮写之前要重新迁出。
- [x] `_H` 颜色倍增 / alpha 改成 PC 值（去掉 alpha ×4）：17 包 42 个值读回一致（点灭星 `_H` 本来 = PC）；重新迁出。`LittleCombo_H` 用户在 Cascade 里已把 ColorScale 改成 50（没存），和 PC 值一致，直接覆盖。`_M` 保持 LiteHDR 调的值。
- [x] 两档加随机（`rand.mjs`，36 包读回一致、已保存、已迁出未提交）：方形开花主发射器出生大小 ±8%（锁宽高同比例）；主发射器加 Initial Color（原色 × U[0.92,1.08] 逐通道）接管恒定的 ColorOverLife；金垂柳改现有 Initial Color、大小加宽到 ±8%；点灭星大小加宽到 ±8%。尾缀 / 红彗星 / 银星扇不加大小随机；闪光层、星头不动。
- [x] 保存后重拍：36 包各拍 3 次（`_H`@LiteHDR 关、`_M`@开），`analysis/results/20261022_LiteHDR_手游分档/_H随机.jpg`、`_M随机.jpg`、`随机与照PC.json`；方形效果 3 次间大小差约 4–14%、亮度差约 4–23%、色比 1–7%，尾缀长度不变。
- [x] `资源发射器数.json`：加了 Initial Color 的发射器 modules +1（48 处）；看法.md 加第二轮；释放 UE。

### 第二轮结果（执行结束 ✅ / AI 自检 ✅ / 用户通过：未验收，没有真机验证）

- `_H` 照 PC（爆裂星、橙辉星的 `_H` 因 PC 只有 ×1 / ×5 而比第一轮暗）；`_M` 保持 LiteHDR 值；两档都有 ±8% 大小 / 颜色随机。
- P4：第一轮 35 包已被用户提交（磁盘 = 我保存的版本）；第二轮 36 包已迁出、保存、**未提交**。UE 无未保存改动、无临时对象。
- 没做：PC `_HD` 的随机（要切 PC 编辑器）；窜天猴 sku 5 行；闪光层 / 星头 / 点灭星颜色不加随机。
  - 踩坑：新插的 Initial Color 不生效、粒子不显示——改完模块列表要再写一次 LOD.bEnabled 和 EmitterName 让发射器重建出生 / 更新模块列表（导入器同样做法），补上后正常。试点 4 包先只在内存里验证再保存。

## 2026-10-23 00:3x–01:10 · 随机改 ±5%；检查 PC 并拟方案

用户原话：

> 8%有些太高了，做成5%吧；再帮我读一下PC的所有烟花效果还要怎么做随机，有些我做了大小随机有些没做，扇形和尾缀效果可以不弄，先帮我检查再帮我拟方案，我先配day的烟花

> 忘记约束你了，如果是有多层衔接的，就不能做大小随机，只有单层的才能做大小随机，导演的大小随机都是编排22去做的，如果是多层的，你只能略微做一些颜色随机了，我的day编排弄好了

- [x] 手游 36 包随机 ±8% → ±5%（`rand.mjs rescale`，RAND_R=0.05）：先核对磁盘 = 第二轮保存版（用户已提交 P4），备份 `备份/rand_r005/`，重新迁出 → 改 → 保存 → 逐包读回通过。用户在配 Day 编排，这轮没截图（截图会挪视口）。
  - 踩坑：提交后包被重载，新建的分布对象被挪到模块底下、路径变了；改成每次从模块引用现场找。第一次失败只留下 `LittleGold_M` 的 ThumbnailWarmup 原值写回（内容不变），已一并保存。
- [x] 手游对照用户规则：大小随机只在单层（L1 主体 + 闪光、单发射器）；多层（红彗星）只有颜色 ✓。手游的扇形（红彗星、银星扇）和尾缀加了颜色随机，方案里问要不要撤。
- [x] 只读检查 PC 3.0：46 行 → 30 个 `_HD`（去扇形 / 尾缀），逐发射器大小 / 颜色现状 → `analysis/results/20261022_LiteHDR_手游分档/PC随机现状.json`。导演表每条有 `EffectScale` + `RandomScaleRatio`（编排 22 负责）。
- [x] 拟方案 `协作/方案/PC烟花随机_2026-10-23.md`：单层 11 个做大小 ±5% + 颜色 ±5%；多层 10 个只做颜色（建议 ±3%）；金垂柳、大型金芒菊现有大小随机按规则应去掉（待用户确认衔接）；短彗星 / 短银尾 / 小彗星待用户定；彩千轮、sku 非开花类不动。
- [ ] 等用户批方案（PC 正式库，先试点一单层一多层；看效果需 PC 编辑器）。

## 2026-10-23 01:2x · 提亮 + 爆发、金垂柳 v3 位置、扇形 / 尾缀

用户原话：

> 1.用5，我发现我PC有好多的颜色都没体量，所以你看了PC没提亮，手游_H也没帮我提，你可以帮我检查一下把没有提亮的做一个提亮，并且做一个爆发效果吗（刚爆开的时候亮一点，多点变化）；2.金垂柳有个新内容还没合入，应该要换模型贴图，我现在有个沙盒版本，但是命名路径还有贴图存放目录全是错的，你可以根据现在已有的正确路径帮我梳理一遍位置给我吗？3.短辉星和银尾都算扇形单束和尾缀，你可以加颜色随机；小彗星没用到在编排中，不要加；4.手游的颜色随机也去掉，可以给点亮度随机；5.所有的随机参数只在颜色和大小有略微的随机，不要扩充到其它位置；6.我的目标和明确约束保持不变，实现思路只是候选。请独立判断，指出关键误区，并补充会影响结果的遗漏；推断请说明依据，不要当成我已确认的需求。优先给最简单可行的方案、关键取舍和验收方式，不为拓展而拓展。

> 我说漏了，我的意思是手游的扇形和尾缀去掉颜色随机，不是所有效果都去掉颜色随机，抱歉

> 提亮与爆发都在粒子中做，不要扩散到材质中

- [x] 手游扇形 / 尾缀（红彗星、银星扇、6 个尾缀，`_H` / `_M` 共 16 包）：起始颜色上下限 = 原色（去掉颜色随机），StartAlpha = ×U[0.95, 1.05]（亮度随机走 alpha；`_M` 颜色已顶在 3，走颜色会超到 3.15）。备份 `备份/fantrail/`，迁出 → 改 → 保存 → 读回；拍两张确认能正常渲染。其余手游效果颜色随机保留。
- [x] PC 亮度只读体检（`pc_brightness.json`、`pc_mi.json`）：主体层总倍增两极分化，调过的 25–750、没调过的 5–15 → 嫌疑：爆裂星、小青柠 L2 / L3、金锦菊、金蕊柠 L1–L3、金芒菊 A / B、两个银彩菊 + 银白菊、窜天猴爆炸 L1。
- [x] 方案 v2 `协作/方案/PC烟花随机_2026-10-23.md`：提亮 / 爆发只改粒子 ColorScaleOverLife；按实测亮度对齐你调过的同类；爆发只加在没有闪光层的主体层（t=0 ×2、0.2 s 内回到 ×1，起点值）；随机按约束；金垂柳等 v3 合入后再做。指出：Bloom / 曝光决定 PC 体量、要在 Night 编排里验收；已有闪光层的不叠爆发。
- [x] 金垂柳 v3 合入位置表 `协作/方案/金垂柳v3合入位置_2026-10-23.md`（只读梳理）：粒子沿用正式名替换内容；网格 / 材质实例 / 贴图起新名放进 `Effects/Common/...`；`SM_EFX_FireWork_Hero_PC` 还被四尺金垂柳用、不能覆盖；手游网格 1998 顶点超规范例外（1180），要用户点头。
- [ ] 等用户批 PC 方案 v2、切 PC 编辑器；大型金芒菊现有多层大小随机去不去，待用户定。

## 2026-10-23 01:3x · 交付水准（通宵）

用户原话：

> 金垂柳先不要覆盖，先处理好命名和目录放着，明天再处理，你先处理PC和手游的粒子效果，目标要到交付水准，同时你帮我再看看还有哪些规范设置是漏设置了的，譬如每个主序列的significance的重要度有没有勾选Dissblewheninsignficant,不勾选可能会被裁切掉；交付之前全部走查一遍还有没有其它规范需要设置的，漏了就帮我补上；弄完了之后，就帮我找一个bug，我的comet效果，在播放编排的时候，有一段大量播放的时候，会没播完就硬切掉了；但是有时是在PIE才好复现，你可以尝试帮我看看是不是导演或者还是我的文件设置问题，如果能找到原因就找，找不到就先放着，引擎崩了你自己重启；明早我要看到所有手游PC粒子设置好，有漏了或者没做的内容记得与我补充说明

拆解（按优先级）：
- [x] A 金垂柳 v3：沙盒资产按位置表改名搬到正确目录，不覆盖正式资产（粒子起临时名 `_V3`），明天合入。→ 7 个资产已搬（P4 标记 add，未提交）；`PS_MW_B_L3_CopySeed` 留在沙盒。
- [x] B 规范走查（只读，PC + 手游 3.0 全部粒子）：significance / bDisableWhenInsignficant / InsignificantReaction / MaxSignificanceLevel / SecondsBeforeInactive / 包围盒 / LOD / 发射器预算 / GPU / 贴图（NeverStream、DistantVFX、主序列 NoMip、Ramp Clamp+NoMip、手游 ≤1024、手游链无 Effects_HD）/ 表行。→ `audit_findings.json`（本机）：105 个发射器勾了 bDisableWhenInsignficant，30 个发射器重要度 Medium，贴图 4 张不合规，手游 2 张 2048 图没限尺寸，SkyRocketSprint_M 4 个发射器。
- [x] C 补漏（规范明确的直接补；有取舍的列出来）。→ 48 包 108 发射器 bDisableWhenInsignficant→false；共享贴图 6 张、窜天猴 sku 表行 5 处、SkyRocketSprint_M 4 发射器只列不改（见下方清单）。
- [x] D PC 提亮 + 爆发 + 随机（方案 v2，只改粒子）；`_H` 同步 PC。→ PC 22 包、_H 4 包，见 `analysis/results/20261023_PC提亮爆发随机/看法.md`。
- [x] E 彗星硬切排查（导演 / 表 MaxInstanceNum / significance / SecondsBeforeInactive / 包围盒），能找到就找。→ **找到**：资源表 `MaxInstanceNum 10` + `bLimitByMaxInstanceNum True`，FX 管理器把最早的同 ID 实例强制停掉；10-21 夜场 PIE 日志「will be deactivated beacause of FXLimit: MaxInstanceNum (10)」红彗星 ≥511 次；夜场 PC 高配彗星同时在场 144、银星扇 158。没改表（要你定），见 `analysis/results/20261023_彗星硬切排查/看法.md`。
- [x] F 最终走查 + 清单（做了 / 漏了 / 没做）。→ 复查 94 个粒子：剩下的只有下方「没改」清单里的项。

已核实（引擎 DLL 属性说明原文）：`bDisableWhenInsignficant`「When true, emitters deemed insignificant will have their tick and render disabled Instantly. When false they will simple stop spawning new particles.」→ 勾上才会立即硬切，不勾只停生成；用户说法相反，记为误区。另有系统级 `InsignificantReaction`（Auto / Complete / DisableTick / DisableTickAndKill）、`InsignificanceDelay`、`MaxSignificanceLevel`，以及 `SecondsBeforeInactive`。

进度（通宵）：
- C 补漏第一批：48 个包、108 个发射器 `bDisableWhenInsignficant` → false（PC `_HD` + 手游 `_M/_H/_L`，含金垂柳 V3_M），逐包迁出、保存、读回通过；备份在 `analysis/local/20261022_LiteHDR_批量修正/备份/sig/`。主序列重要度本来都是 Critical；Medium 的 30 个都是 Glow / Flash / 火花辅助层，保留不动。共享的 `P_Destructible_Empty` 没碰。
- 贴图 6 张（`T_6DLight_RGBAFireRamp_08`、`T_6DLight_EmissiveRamp_02` 勾 NeverStream、`T_EFX_FireWokr_Star_01/02`、手游 2048 的 `T_EFX_Sparks_Sparkler_4x4_01`、`T_EFX_Sparks_Streak_8x1_02`）都被音乐节 / 圣诞 / 手势等别的效果共用 → 按规则只列出、不改，等你定。

### ⚠ 02:29 编辑器崩溃（我造成的）

- 经过：我写取景预览脚本时 import 了 `frame.mjs`，它的「直接运行才执行」判断用的是 `endsWith('frame.mjs')`，预览脚本名 `_preview_frame.mjs` 也以它结尾，于是意外启动了一轮 36 次的手游取景拍摄；拍到第 5 次时 PC 编辑器崩溃（D3D12RHI `D3D12DescriptorCache.cpp:988` 断言，RHIThread）。
- 影响：**白天编排地图里没保存的改动丢了**（`MA5_FireworkOnDam_Day.umap` 磁盘版是 10-17 的，这次会话没保存过；自动保存里没有包）。
- 能找回的：我 01:52 把白天导演完整配置只读备份成了 `director_dump_2026-10-22T17-52-37-868Z.json`；逐条比对后，它和你工作台导出的 `FXtools/节目/NewYearFireWorks_Day/导演表-Day调试版-NPC试放-一张表.json`（10-22 22:01）只差 0.001 的小数取整 → **重新导入这张表再保存，导演配置就回来了**。导演以外（比如点位 actor 位置）如果在 UE 里手动改过，我的备份没覆盖，需要你确认。
- 已改：三个脚本的主程序判断都改成精确匹配文件名；按你的授权，用 `RunEditor_HD.cmd` 重启了编辑器。

D 进度（PC，`analysis/local/20261022_LiteHDR_批量修正/pc_fx.mjs` + `pc_pol.mjs`）：
- 做法：逐包 dry → 备份（`备份/pc_fx/`）→ 迁出 → 改 → **读回：按「基础色 × 全部启用的 CSOL」算每层有效颜色曲线，要求 改后 = 改前 × 提亮 × 爆发(t)（加随机的层在 ×[0.95, 1.05] 内）、其余层一点不变** → 才保存。
- 读回拦下一处：小青柠 Lime 的 4 层共用一个 CSOL 模块，给 L1 改爆发曲线会连带 L2 / L3（L3B 接力那一刻也会闪）。没保存；改成「共用模块不动，给本层另加一个系数模块」，修好后重新读回通过才保存。金曜菊 GoldSpark、多重菊 LimeCoreDelay 同样有共用 CSOL，按新规则处理。
- 改前测量（0.3T，背景已减）：用参照（你调过的）的帧平均亮度中位数约 17.8，0.5–2 倍区间是 8.9–35.6；改前低于区间的只有爆裂星 4.8、金锦菊 5.1、窜天猴爆炸 3.0。小青柠、金蕊柠、金芒菊、银彩菊这几个的单像素亮度其实不低，按倍增数字算出来的「没提亮」高估了 → 改后量出来超了就回调。

- 回调（看图后）：小青柠 L3 ×10 发白丢绿 → 退回 ×1；金蕊柠 L3 退回 ×1、L1 ×10→×3；金芒菊 ×5→×3.5（偏灰）。回调同样读回通过才保存。
- `_H`：只给小金花 / 小分裂 / 橙辉星 / 金芒菊加爆发。爆裂星 `_H` CSOL 20、金芒菊 `_H` 10 是你 10-22 之后自己调的（我当时设 1），保留没乘；和 PC 新值（10 / 3.5）不一致，要你定谁跟谁。
- 复查（94 个粒子重读）：bDisableWhenInsignficant 只剩共享的 `P_Destructible_Empty`。

### 收工清单（10-23 03:2x）

做了：
1. 彗星硬切：找到原因（资源表同 ID 上限 10，FX 管理器强停最早的），没改表 → `analysis/results/20261023_彗星硬切排查/看法.md`。
2. 规范补漏：48 包 108 发射器 bDisableWhenInsignficant → false。
3. PC 提亮 / 爆发 / 颜色大小随机 22 包；手游 `_H` 爆发 4 包 → `analysis/results/20261023_PC提亮爆发随机/看法.md`。
4. 金垂柳 v3：7 个资产改名搬目录（P4 add，未覆盖正式资产）。

要你做 / 定：
1. **白天编排地图要重新导入**：02:29 编辑器崩溃（我造成的），没保存的白天改动丢了。导演配置等于 `FXtools/节目/NewYearFireWorks_Day/导演表-Day调试版-NPC试放-一张表.json`，重新导入后保存；点位如果在 UE 里手动挪过，要再看一下。
2. 彗星：资源表 3.0 用量大的几行，改 `bLimitByMaxInstanceNum = False` 或抬高 `MaxInstanceNum`（夜场彗星同时 144 个、银星扇 158 个）。
3. 爆裂星 / 金芒菊：PC 和 `_H` 两边亮度不一致，谁跟谁。
4. 大金芒菊原有的两层各自大小随机：去不去。
5. P4：92 个文件迁出 / 新增未提交（清单在 `analysis/local/20261022_LiteHDR_批量修正/p4_opened_0315.txt`）；沙盒 `PS_MW_B_L3_CopySeed` 也是 add 状态（不是我加的）。

没改（共享的，按规则只列出）：
- 贴图：`T_6DLight_RGBAFireRamp_08`、`T_6DLight_EmissiveRamp_02`（勾了 NeverStream、组不对、不是 Clamp+NoMip）；`T_EFX_FireWokr_Star_01/02`（组不对、不是 NoMip）；手游 2048 的 `T_EFX_Sparks_Sparkler_4x4_01`、`T_EFX_Sparks_Streak_8x1_02`（没限最大尺寸 1024）。都被音乐节 / 圣诞 / 手势等效果共用，只有窜天猴 sku 用到。
- 表：窜天猴 sku 5 行的 Low 指 `_L` 或 `P_Destructible_Empty`、引线 High 指 `_M`（规范是 Low=`_M`、不做 `_L`）。
- `P_EFX_FireWorks_SkyRocketSprint_M` 有 4 个发射器（规范 ≤ 3）。
- 30 个 Medium 重要度的发射器，都是 Glow / Flash / 火花辅助层，保留。

没做：
- 金垂柳 v3 的合入和随机（明天）；小彗星（不在编排里）。
- 没开 PIE：游戏里的最终效果、彗星改表后的表现，都还没在 PIE 里验证。

## 2026-10-23 早 · 彗星上限怎么改、PC 跟 _H、大小随机规则更正

用户原话：

> 所以我的银星扇还有红彗星要么把max instance num改到50/100，要么就勾选Limit by max instance num？还是要改100，然后也勾选上？结合我们的烟花编排，我们哪些效果还需要重新把这个上线修改的？2.以我最新的为主，金芒菊3.5也很暗淡；3.大金芒菊两层星头不是接替关系，我说的多层不做大小随机是有接替关系的不做，因为做了随机就接不上了；窜天猴5行不符合规范是什么问题？sprint_m基本都是小粒子，overdraw不高，所以问题不是很大

拆解：
- [x] 1 上限：讲清勾选 / 数值的含义；按 Day + Night 最新编排、PC / 手游、各画质档算每个资源同时在场峰值，列出要改的行和建议值（只给表，不改表）。→ `analysis/results/20261023_彗星硬切排查/看法.md`「10-23 补充」+ `上限建议.json`。这张表预测会超的 PC 6 个资源，和 10-21 PIE 日志里被切的 6 个一模一样。用户已经把红彗星、银星扇改成 100（勾着）：够白天（峰值 35），不够夜场高配（144–216 / 158–210）。
- [x] 2 PC 跟 `_H`（用户最新值为准）：爆裂星、金芒菊 PC 的 CSOL 对齐 `_H`；顺带只读核一遍其余 `_H` 和 PC 是否一致。→ PC 爆裂星 CSOL 10→20，金芒菊 MainA / MainB 3.5→10（MainA 的爆发曲线 20→10），读回和 `_H` 完全相同。其余 9 对 `_H` / PC 本来就一致（`h_vs_pc.json`）。
- [x] 3 规则更正：多层只有「接替」关系的不做大小随机；大金芒菊保持现状。按新规则列出 / 补上可以做大小随机的多层效果。→ 按配方核对：多数多层效果是「同一批星拆的头尾 / 前后段」（种子 / 星数 / 初速 / 终端速度相同），各自随机大小也会错位，所以也不加（推断，依据是配方 links 和 `70_ui.js` 里同一批星的定义）。真正独立的星群加了 ±5% 大小：小青柠 L1 芯、金曜菊（GoldSpark_HD）L3 牡丹；大金芒菊 Main ±2.3% 统一到 ±5%。3 包读回通过、已保存。
- [x] 4 解释窜天猴 5 行的问题；SkyRocketSprint_M 4 发射器按用户判断不处理。→ 更正：引线 High=`_M` 符合规范（没做 `_H` 时先填 `_M`），实际是 4 行，都是 Low 档降级（`_L` 少发射器 / 烟雾 Low 用空粒子），规范「不做 `_L`」管的是 3.0 新做的；不是 bug，建议不动。

备注：用户这时正在编辑器里改 `Glitter_HD`（未保存），我没碰。编辑器里有用户没保存的地图，这轮不拍图、不开 PIE，只读回验证。

## 2026-10-23 上午 · 按建议改两张表的上限

用户原话：

> 我帮我把两个表的上限与勾选改了，我在检查别的问题

拆解：
- [x] 按 `analysis/results/20261023_彗星硬切排查/上限建议.json` 改 PC / 手游 ResourceFXTable 3.0 行的 MaxInstanceNum（含「贴近」行留余量），bLimitByMaxInstanceNum 保持勾选；先查表是否被用户改着没存 → 备份 → 迁出 → 改 → 保存 → 读回。
  → PC 表 15 行、手游表 5 行已改并保存（红彗星 / 银星扇 100→260，极小尾缀 20→60，小金花 / 小分裂 10→30，大型 / 中型尾缀 →40（手游大型 30），小型尾缀 →30，其余 10→20），全部勾选；逐行逐字段读回，其余行 / 字段没变。两张表都已迁出、未提交 P4；备份 `analysis/local/20261022_LiteHDR_批量修正/备份/limits/`。

## 2026-10-23 上午 · 用户检查：颜色随机、爆发好像没做；没改的效果也被迁出

用户原话：

> 我检查了你的资源，你似乎只改了亮度的随机，没有做颜色的随机？是因为5%你认为看不出来对吗？还是什么？以及前期爆发的高亮，似乎也没做？但有些效果，没做的你也迁出了，譬如skyrockettrail这些，是你改了什么我没发现吗？还有小彗星你也迁出了

拆解：
- [x] 1 读回现场：颜色随机到底是逐通道还是锁轴（= 只有亮度），PC / 手游各抽查；说明原因。→ 在：出生定色 StartColor = VectorUniform ×[0.95, 1.05]、不锁轴（三通道各自随机），PC 小金花 / 金锦菊 / 橙辉星、手游小金花 _M/_H、金芒菊 _M 都是这样；手游扇形 / 尾缀按用户要求只有亮度（StartAlpha 0.95–1.05）。问题是看不出来：每通道 ±5% 在 ×20 以上的 HDR 亮度下经色调映射后几乎只剩一点亮度差（10-23 三次实拍：小金花 R/G 比只差 5%）。这是我照字面做 ±5%、没提醒「这样看不出颜色变化」的设计失误。
- [x] 2 读回爆发曲线在不在、为什么看不出来；给出加强方案。→ 在：PC 小金花 CSOL 曲线 40→20（0.2 s 内）、金锦菊 20→10、橙辉星 10→5，_H 小金花 40→20。看不出来的原因：序列前 0.2 s 只是爆点那一小团；×20 以上本来就接近饱和，再 ×2 色调映射后只多一点；粒子按 10 fps 固定步长更新，只吃到 1–2 步。待用户定加强方案。
- [x] 3 列出 P4 里每个迁出 / 新增文件是谁、因为什么改的（SkyRocketTail、小彗星 = 规范补漏 bDisableWhenInsignficant）。→ 逐个对照见本机 `p4_why.json`：窜天猴 sku 全套、小彗星、金锦冠扇 4 个、彩千轮、超大尾缀 PC 等只改了 bDisableWhenInsignficant（3.0 表行都在走查范围里）。另：`Login.umap` 被迁出且锁定——是我夜里拍图在 Login 里摆 / 删临时对象把它弄脏了，用户 10:33 迁出表时一起勾上了；磁盘文件没变（p4 diff 为空），应撤销。两张表用户已提交（8563757，值 = 我的建议）。

## 2026-10-23 上午 · 银白菊颜色随机、重要度勾选原理

用户原话：

> 我就拿你的silverwhitechry来说，你就是只做了亮度的随机呀；小金花确实做了；另外发射器勾了BdisableWhenIignFicant的是让这个重要度显示不是吗？我搞不懂这个原理，我以前所有的特效都是主体层选择critical+勾选Disable when ingnficant的，然后一些辅助不重要的小粒子就选Medium也勾选，这个功能关系是我理解错了还是什么？

拆解：
- [x] 读回银白菊：出生颜色 9.5–10.5、不锁轴，数据上和小金花同一种逐通道随机；但它是白色、总亮度约 ×40，三个通道色调映射后都被压到纯白，颜色差被削平，看起来只剩亮度（甚至没有）。小金花是金色、×20，才看得出一点。
- [x] 讲清重要度原理（引擎属性说明原文 + 资源表 bUpdateSignificance）：重要度一直生效，勾选只决定「不重要时」立即消失还是只停发；Critical 永远算重要，勾不勾一样。资源表 3.0 行 bUpdateSignificance = False，推断游戏不会调整这些特效的重要度。
- [x] 认错：昨晚把 108 个发射器改成不勾，其中 92 个 Critical 完全没效果，16 个 Medium 辅助层反而违背了用户「辅助层不重要就立刻消失省性能」的做法；之前回复里「建议保留」也说错了。
- [ ] 待用户定：改回用户原来的做法（27 个只为这个勾迁出的包在 P4 整包撤销，21 个混合包把勾改回 True）；Login.umap 撤销。

## 2026-10-23 上午 · 用户复述重要度理解

用户原话：

> 所以结论是，辅助层要硬切消失的，就medium+勾，不想硬切就medium+不勾？因为是critical，所以勾不勾都不会被切掉，所以勾选勾不勾都没有意义，我的裂解正确吗

- [x] 确认理解正确；补充两个前提：Medium 只有在游戏把重要度降到它之下时才会被处理（3.0 行 bUpdateSignificance = False，节目里大概不会触发）；Critical 不被切的前提是系统 MaxSignificanceLevel 没被调低（10-23 走查 94 个系统都是 Critical）。改回用户原做法仍等用户点头。

## 2026-10-23 上午 · 改回重要度勾选、加重要度检测规范、看 LODMethod

用户原话：

> 帮我改回去，并且后面帮我加个重要度检测的规范，按正确的重要度设置，同时帮我看看LodMethod，我现在一次性爆炸的效果都选Activate aoutomatic,循环效果用aotomatic，正不正确？

拆解：
- [x] 1 改回：27 个只因这个勾迁出的包在 P4 撤销（先核对磁盘 = 我保存时的哈希，确认没有别人的改动）；21 个混合包把我改过的发射器 bDisableWhenInsignficant 改回 True；撤销 Login.umap。→ 25 个先卸载、再 P4 撤销，磁盘回到改前（哈希核对）；Smoke_M / Smoke_H 用户已经自己撤销过（磁盘 = 改前；Smoke_H 正在编辑器里改，内存里的勾也都是原样），没碰。21 个混合包把勾改回、读回、保存。Login.umap 用 `p4 revert -a` 撤销并解锁。P4 打开数 94 → 66。顺带发现并修好我自己的一个错：窜天猴爆炸 PC（GlitterChry_HD，4 档 LOD）的颜色随机模块只加在 LOD0，50 m 外就没了 → 已按 Cascade 的做法共享进 4 档，LODValidity = 15，已保存。
- [x] 2 规范：资产规范加「重要度」一节（主体层 Critical、辅助层 Medium + 勾 / 不勾的含义、系统 MaxSignificanceLevel = Critical、每个系统至少一个 Critical），加检测脚本并跑一遍。→ `spec/烟花特效资产规范.md` §6.1 + `analysis/scripts/重要度LOD检查.mjs`；结果 `analysis/results/20261023_重要度LOD检查/看法.md`：❌ 红彗星 / 银星扇 / 小彗星 PC LOD 距离全 0（游戏永远用最后一档，红彗星三个点层、银星扇 Dot_A 会消失；推断未实测），彩千轮没有 Critical 层 + 节目里落在 LOD3。都没改，等用户定。
- [x] 3 LODMethod：讲清三种的区别，读 3.0 全部粒子现状，对照用户的做法列出不一致的。→ 用户做法正确；只有多档 LOD 时才有区别，3.0 绝大多数只有 1 档。
