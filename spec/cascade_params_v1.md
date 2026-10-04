# Cascade 粒子参数交换格式 v1（`fwl.cascade/1`）

**用途**：云端（烘焙器或任何 AI）按这个格式输出**一段 JSON**，本地导入器读进来，直接在引擎里搭 Cascade 粒子系统：
- 导入贴图；
- 建材质实例；
- 建发射器和模块；
- 写入数值。

**范围**：
- 只写 **UE4 Cascade 的通用参数**：模块、分布、曲线、单位。
- **不写项目内容**：资产路径、目录、材质实例名、材质参数名都不出现在这里，由本地的私有配置按「角色」对应到具体项目。
- **例外：贴图命名**。用户 2026-10-02 定了贴图命名规范，并确认「这些命名不算机密」，可以进仓库：素材包里的贴图已按规范命名，导入器直接用（见 1.1）。

状态标记：
- ✅ 已在引擎里实测：能写入、能读回，查找表能刷新；
- 🟡 格式已定，引擎里的实际播放还没验证；
- ⚪ 建议值，还没测过。

---

## 1. 顶层结构

```jsonc
{
  "format": "fwl.cascade/1",
  "name": "JinMangJu_Fixed",                 // 效果名（英文，和烘焙器导出名一致）
  "platform": "pc",                          // pc / mobile：烘焙器每个素材包出两份，cascade.json（PC）和 cascade_mobile.json（手机）
  "source": { "tool": "烟花母版烘焙器 3.6", "export": "JM2/JinMangJu_Fixed" },
  "textures": {                              // 纯粒子效果可以省略
    "seq":    { "file": "T_JinMangJu_Fixed.png",        "class": "flipbook", "cols": 8, "rows": 8, "channels": 4, "frames": 256 },
    "ramp":   { "file": "T_JinMangJu_Fixed_Ramp.png",   "class": "ramp" },
    "cutout": { "file": "T_JinMangJu_Fixed_Cutout.png", "class": "cutout" }
  },
  "materials": {
    "main": { "role": "flipbook_rgba", "textures": { "main": "seq", "ramp": "ramp" }, "scalars": { "rows": 8, "cols": 8 } }
  },
  "system": { "preview_distance_cm": 30000, "preview_warmup_s": 1.2 },
  "emitters": [
    {
      "name": "Main",
      "material": "main",
      "gpu": false,
      "required": { "screen_alignment": "Rectangle", "duration_s": 4.56, "loops": 1, "delay_s": 0,
                    "cutout": "cutout", "max_draw_count": 1 },
      "spawn": { "rate": { "const": 0 }, "bursts": [[0, 1]] },
      "modules": [
        { "m": "Lifetime",         "Lifetime": { "const": 4.56 } },
        { "m": "InitialSize",      "StartSize": { "const": [22097.8, 22097.8, 1] } },
        { "m": "InitialLocation",  "StartLocation": { "const": [0, 0, -1000.7] } },
        { "m": "DynamicParameter", "params": { "frame": { "curve": [[0, 0], [0.0279, 7.61], [1, 255.99]] } } },
        { "m": "ColorOverLife",    "ColorOverLife": { "curve": [[0, [1.5, 1.307, 1.074]], [1, [1.5, 1.307, 1.074]]] },
                                   "AlphaOverLife": { "const": 1 } }
      ]
    }
  ]
}
```

### 1.1 贴图命名（烘焙器 4.1.1 起，用户 2026-10-02 定）🟡

素材包里的贴图文件名就是 UE 里的资产名，`textures[].asset` 再写一遍（不带扩展名）。**导入器直接用 `asset`，不要再加效果前缀**（2026-10-01 导入时出现过前缀重复）。

| 贴图 | PC | 手机 |
| --- | --- | --- |
| 序列 | `T_EFX_FireWorks_<名称>[_<层>]_<列>x<行>_<序号>_HD` | 同左，不带 `_HD` |
| Cut（外形裁切） | `T_EFX_FireWorks_<名称>[_<层>]_<列>x<行>_<序号>_C` | 和 PC 共用（手机包里不重复放） |
| 溶解图 | `…_<序号>_D`（需要才生成；现在的效果都不需要） | 共用 |
| Ramp | `T_EFX_FireWorks_<名称>[_<层>]_R` | 共用 |

- `<名称>`：礼花英文名（`协作/状态清单.json` 的「英文名」，烘焙器「交付」页可改）；`<层>`：多层时每层英文名（Main / Red …）；`<序号>`：这一层的第几张贴图（01、02）；`<列>x<行>`：格子。
- `cascade.json` 顶层有 `naming`：`{ rule, base, layers, asset_names: "textures[].asset", prefix_included: true }`。
- 包里附 `命名对照.txt`（烘焙器内部名 → 包里的名字）；帧号测试图放 `_检查/`，不导入。
- 手机包（`cascade_mobile.json`）引用的 Cut / Ramp 是 PC 那份：导入时两个平台指向同一个资产，不要各导一份。
- 只有大面片（母版、分段）用这套命名；升空尾缀 V5、单束等照旧（之后再统一时在这里补）。

## 2. 分布的写法（每个带分布的字段都用这一种写法）✅

| 写法 | 含义 | 标量 | 向量 |
| --- | --- | --- | --- |
| `{"const": v}` | 常量 | `3.2` | `[x, y, z]` |
| `{"uniform": [min, max]}` | 随机范围 | `[1.0, 1.4]` | `[[x,y,z], [x,y,z]]` |
| `{"curve": [[t, v], …]}` | 曲线，所有关键点都是 Linear | `[[0, 0], [1, 256]]` | `[[0, [1,1,1]], [1, [2,2,1]]]` |

- **烘不烘查找表按发射器类型决定（导入器自动处理）**：
  - CPU 发射器默认**不烘**：引擎播放时直接按分布计算，精确，导入后不用重启就能打开（✅ 实测）；
  - GPU 发射器（`"gpu": true`）**必须烘**：GPU 粒子的颜色、尺寸、寿命是从查找表采样出来的，不烘就全是 0，粒子在但看不见（✅ 实测）。
    烘了之后导入即可看，不用重启（✅ 2026-09-29 实测）。
  - 个别分布可以用 `"bake": true / false` 强制指定。
- 导入器会按写法**自动换成对应的分布类型**（常量、随机、曲线互换），所以不用关心模板里原来是什么类型。✅
- 曲线的时间 `t`：
  - Over Life 类模块（Size By Life、Color Over Life、默认的 Dynamic Parameter）用**粒子的相对寿命 0–1**；
  - 出生类模块（Initial…、Sphere 等）和 Spawn Rate 用**发射器时间（秒）**。这是 UE4 Cascade 的规则。⚪

## 3. 单位（一律用 Cascade 原生单位）

| 量 | 单位 |
| --- | --- |
| 长度、尺寸、位置 | cm |
| 速度 | cm/s |
| 加速度 | cm/s² |
| 时间 | s |
| Drag | 1/s |
| Initial Rotation | **圈**（1 = 360°） |
| 颜色 | 线性 RGB，可以大于 1（HDR）；Alpha 0–1 |

## 4. 发射器字段

| 字段 | Cascade 对应 | 状态 |
| --- | --- | --- |
| `name` | EmitterName | ✅ |
| `material` | Required.Material（指向本文件 `materials` 里的某个键） | ✅ |
| `gpu` | TypeData = GPU Sprites（true 时）。PC 小粒子优先 GPU，手机版用 CPU | ✅ |
| `required.screen_alignment` | Rectangle / Square / Velocity / FacingCameraPosition | ✅ |
| `required.duration_s / loops / delay_s` | EmitterDuration / EmitterLoops（0 = 无限循环）/ EmitterDelay | ✅ |
| `required.cutout` | Cutout Texture，同时设 Sub Images 1×1、Eight Vertices、Opacity Source = Alpha、Alpha Threshold 0.1 | ✅ |
| `required.sub_images` | `[水平, 竖直]`，只有真的用 SubUV 时才写 | ⚪ |
| `required.max_draw_count` | bUseMaxDrawCount + MaxDrawCount | ✅ |
| `required.pivot_offset` | 素材包写**引擎内部偏移**`[x,y]`，中心是`[-0.5,-0.5]`；Cascade的独立`ParticleModulePivotOffset.PivotOffset`模块以`(0,0)`为中心，导入须转换为`(X=x+0.5,Y=y+0.5)`。例如`[-0.5,-0.0154]`对应面板`(0,0.4846)`。模块必须挂接到LOD.Modules。详见下方「Pivot格式与换算」 | ✅ 本机定义/默认属性确认；⚪ 当前烟花实播对齐未验 |
| `required.local_space` | bUseLocalSpace | ⚪ |
| `spawn.rate` | Spawn Rate（分布） | ✅ |
| `spawn.bursts` | `[[时间秒, 数量], …]` → BurstList | ✅ |

### Pivot格式与换算（2026-10-04，对话框5同步给Claude）

用户明确：Cascade默认`(0,0)`是中心。本机默认模块属性读取也为`X=0,Y=0`；实际模块编译将两个字段各减`0.5`，CPU/GPU着色器都以`UV + 内部Pivot`计算顶点偏移。因此确定的转换是**加0.5**，不采用取反或加1的猜测。原JSON保持引擎内部口径，在导入边界换算。

JSON里的局部配置：

```json
"required": {
  "pivot_offset": [-0.5, -0.0154]
}
```

创建独立`ParticleModulePivotOffset`模块，原生写入：

```json
{
  "LODValidity": 1,
  "PivotOffset": "(X=0.000000,Y=0.484600)"
}
```

随后追加到该发射器LOD的`Modules`。通用计算：`moduleX=internalX+0.5`、`moduleY=internalY+0.5`；中心包`[-0.5,-0.5]`应得到面板`(0,0)`。该包循环层与消散层同值，均用`X=0,Y=0.4846`。旧导入器缺节点，v2.6/v2.7能创建但未换算，私有工作台v2.8已修正。历史保留的手调发射器不会随网页升级自动改写；补节点应只新增/校正Pivot，保护其它手调参数。定义依据和验证边界见`spec/UE实测.md`。

## 5. 模块表（`m` 的取值）

| `m` | Cascade 模块 | 字段（分布除非另注明） | 状态 |
| --- | --- | --- | --- |
| `Lifetime` | Lifetime | `Lifetime` | ✅ |
| `InitialSize` | Initial Size | `StartSize`（向量，X、Y 分开生效需要 Rectangle 对齐） | ✅ |
| `SizeByLife` | Size By Life | `LifeMultiplier`（向量）；`MultiplyX/Y/Z`（布尔） | ✅ 写入 🟡 播放 |
| `InitialLocation` | Initial Location | `StartLocation`（向量） | ✅ |
| `SphereLocation` | Sphere | `StartRadius`、`VelocityScale`、`StartLocation`；`Velocity`、`SurfaceOnly`（布尔） | ✅ |
| `InitialVelocity` | Initial Velocity | `StartVelocity`（向量）、`StartVelocityRadial` | ✅ 写入 |
| `Drag` | Drag | `DragCoefficientRaw` | ✅ 写入 |
| `ConstAcceleration` | Const Acceleration | `Acceleration`（**普通向量，不是分布**：直接写 `[x, y, z]`） | ✅ 写入 |
| `Acceleration` | Acceleration | `Acceleration`（向量分布） | ❌ GPU Sprites 不支持（2026-10-04 UE 4.24 实测标红）；CPU ⚪ |
| `InitialRotation` | Initial Rotation | `StartRotation`（圈） | ⚪ |
| `RotationRate` | Initial Rotation Rate | `StartRotationRate`（圈/秒） | ⚪ |
| `InitialColor` | Initial Color | `StartColor`（向量）、`StartAlpha` | ⚪ |
| `ColorOverLife` | Color Over Life | `ColorOverLife`（向量）、`AlphaOverLife` | ✅ |
| `ColorScaleOverLife` | Scale Color / Life | `ColorScaleOverLife`（向量）、`AlphaScaleOverLife` | ⚪ |
| `DynamicParameter` | Dynamic Parameter | `params`：按**角色**写，见第 6 节 | ✅ 写入 🟡 播放 |
| `VelocityOverLife` | Velocity/Life | `VelOverLife`（向量分布，按相对寿命，cm/s）；`Absolute`（布尔，true = 速度直接取曲线值，不累加） | ⚪ 导入器待支持（烘焙器 4.4.5 起，升空尾缀物理弹道的 RiseLoop / HeadGlow 用；Cascade 的 Drag 只有线性） |

模块可以新增、删除、开关，分布类型可以互换。导入器是从空的粒子系统开始逐个建出来的，不依赖模板。✅

### 模块元数据与原生字段（2026-10-04）

`m` 选择模块类型；`note` / `_note` 是说明文本，都不写入UE属性。`SizeByLife` 还可带布尔标记 `preRoll`：表示导出器已把入点前放大展开到真实缩放曲线与相关时间参数中，供回放检查识别。它不是 `ParticleModuleSizeMultiplyLife` 的原生属性，导入器必须过滤这个标记，继续创建并挂接整个缩放模块，按源值填写 `LifeMultiplier`、`MultiplyX/Y/Z`；不得因为标记而跳过模块、重算曲线或额外叠加一段延迟。

示意格式（曲线及时间仍以当前包实际导出为准）：

```json
{
  "m": "SizeByLife",
  "preRoll": true,
  "LifeMultiplier": {"curve": [[0, [0.02, 0.02, 1]], [0.1, [1, 1, 1]], [1, [1, 1, 1]]]},
  "MultiplyX": true,
  "MultiplyY": true,
  "MultiplyZ": false
}
```

`preRoll` 为false或省略时仍照常导入模块。只允许该标记出现在 `SizeByLife` 且值为布尔；其它不认识的原生字段不应统一忽略，必须报错，以免参数丢失。私有导入器v2.10已经按此处理；真实失败包在生成网页的严格模拟接口中复现并修复，缩放/帧曲线、时长、Pivot及GPU结构检查通过。这是格式兼容的隔离验证，没有将本次粒子实播标为通过。

## 6. 材质角色与动态参数角色

材质只写**角色**，由本地配置对应到项目里具体的材质实例和参数名：

| 角色 | 用途 | 需要的贴图和参数 |
| --- | --- | --- |
| `flipbook_rgba` | RGBA 接力的序列帧大面片（母版、单元序列） | `textures.main`（序列帧）、`textures.ramp`（渐变图）；`scalars.rows / cols` = **每个通道**的行数、列数 |
| `beam_flipbook` | 单束（一行多列的细长序列），Velocity 对齐 | 同上 |
| `soft_dot` | 纯粒子的软圆点（点灭星、火花） | 不需要贴图 |
| `glow` | 光晕、闪光 | 不需要贴图 |

序列帧的解码约定（和烘焙器一致）✅：
- R→G→B→A 接力；每个通道内按行排，左上角是第 0 帧；
- 帧号取整，不做帧间混合；
- **帧号超过总帧数（行 × 列 × 4）会从头循环**，所以帧号曲线的最后一个值要写成「总帧数 − 0.01」。

动态参数按角色写（第几个参数、参数叫什么，由本地配置决定）：

| 角色 | 含义 | 不写时 |
| --- | --- | --- |
| `frame` | 帧号 | 0 |
| `speed` | 材质自动播放速度（我们一律不用，保持 0） | 0 |
| `dissolve` | 溶解进度 | 0 |
| `emissive` | 在材质实例的亮度之上**额外加**的亮度 | 0 |

## 7. 贴图类别

| `class` | 用途 | 导入设置（由本地按项目示例贴图照抄） |
| --- | --- | --- |
| `flipbook` | 序列帧（灰度、RGBA 接力） | 线性（sRGB 关）、BC7、2048 |
| `ramp` | 渐变图 256×8 | sRGB 开 |
| `cutout` | 轮廓图 512×512 | 线性，最大 512 |

建议（渲染基础问题 D5，⚪ 待 UE 实测包 4 确认后再改上表）：`ramp` 用 X/Y Tiling = Clamp、Mip Gen = NoMipmaps（默认 Wrap + mip 时 v = 1 的白热色会和最暗色混，星芯发暗）；`flipbook` 用 NoMipmaps（或 TextureGroup 不流送），mip 会把相邻格子串进来。实测前导入设置仍按项目示例贴图照抄。

`cutout` 可以写 `"generate_from": "seq"`，表示导出里没有轮廓图，由本地按烘焙器同样的算法生成：所有帧叠加，编码值 ≥ 3/255 算有内容，再向外扩 3 像素。✅

## 8. 引擎里的通用规则（踩过的坑）

1. **对齐方式用 Rectangle，不要用 Square**：Square 只认 X，横竖尺寸不同的面片会变形、抖动。
2. **所有曲线关键点都用 Linear**：CurveAuto 会在关键点之间冲过头，尺寸来回抖、帧号倒退。
3. **查找表**：Cascade 播放时读的是预先算好的查找表。脚本改完数值后，查找表不会自己更新，保存也不会。粒子被实例化一次（比如打开 Cascade）才会重算。导入器会自动做这一步，并核对误差。✅
4. 查找表是简化过的近似：曲线关键点多、拐点密的时候（比如紧凑取景的尺寸曲线），和原曲线会有偏差。要精确就写 `"bake": false`。🟡
5. 帧号曲线的最后一个值必须小于总帧数，见第 6 节。✅
6. Initial Rotation 的单位是圈；面片中心在移动、或者横竖缩放不一样的效果，不要加旋转，否则下垂方向会转歪。
7. Size By Life 是乘在 Initial Size 上的，所以 Initial Size 写**最大尺寸**，曲线写 0–1 的倍数。
8. 用脚本从空白新建粒子系统时（UE4.24 Cascade）：✅
   - 粒子系统的 `LODDistances`、`LODSettings` 默认是空的，要各补一项，否则打开 Cascade 取 LOD 下标越界崩溃；
   - 脚本新建的分布如果保留查找表，同一次编辑器会话里打开 Cascade 会越界崩溃；
     CPU 发射器全部不烘（`bCanBeBaked = False`）时，同一会话里直接打开正常（多个资产实测）；
     GPU 发射器必须烘；实测导入后在内容浏览器刷新、直接打开也正常。

## 9. 放大、缩小与快慢（换一个尺寸的同款效果时用）

**空间缩放 × s**（整朵花放大 s 倍，快慢不变）：
- Initial Size、Initial Location、Initial Velocity、Const Acceleration、Acceleration、Sphere 半径和速度：都 × s；
- Drag、Lifetime、Duration、所有 Over Life 曲线、帧号曲线：都不变。

**时间缩放 × k**（整体放慢 k 倍，大小不变）：
- Lifetime、Duration、Delay、Burst 时间：× k；
- 速度：÷ k；加速度：÷ k²；Drag：÷ k；Spawn Rate：÷ k；
- 用相对寿命的曲线不变；用发射器时间（秒）的曲线，时间轴 × k。

## 10. 配方（按效果类型；数值来自烘焙器导出，这里只定结构）

### A. 大面片母版（整朵花一张序列帧）
- **固定取景** ✅ 导入跑通：`InitialSize` 常量 + `InitialLocation` 常量（把爆点对齐到精灵中心的偏移）+ 帧号曲线 + 颜色。
- **随开花放大（Zoom）** ✅ 引擎实测不抖（推荐）：`InitialSize` 写最大尺寸 + `SizeByLife` 曲线（X、Y 相同），`InitialLocation` = 0。烘焙器 3.6 的 Zoom 版就是这种。
- ~~紧凑取景~~ ❌ **禁用**（2026-09-29 引擎实测仍然抖动，查找表误差已排除）：面片中心靠 Velocity + Drag + ConstAcceleration 移动、X/Y 分开缩放，引擎里对不齐。大面片只用固定取景或 Zoom。

### B. 点灭星（纯粒子，不需要贴图）✅ GPU / CPU 都已在引擎里看到闪烁点
- **平台约定**：PC 版小粒子能用 GPU 就用 GPU（`"gpu": true`）；手机版一律用 CPU（`"gpu": false`）。两种导入后都能直接看（✅ 实测）。
- 数值起点：点 3–5 m、寿命 0.15–0.3 s；40–80 cm、0.05–0.1 s 在 300 m 外只有一两个像素，看不清。
```jsonc
{ "name": "Strobe", "material": "dot", "gpu": true,
  "required": { "screen_alignment": "Square", "duration_s": 3.0, "loops": 1 },
  "spawn": { "rate": { "curve": [[0, 0], [0.8, 0], [0.9, 1500], [2.6, 1500], [3.0, 0]] } },   // 发射器时间（秒）：主花开到一定程度才开始闪
  "modules": [
    { "m": "Lifetime", "Lifetime": { "uniform": [0.15, 0.3] } },                           // 一闪即灭（和 examples/Strobe_example 一致）
    { "m": "SphereLocation", "StartRadius": { "curve": [[0, 0], [3.0, 9000]] },            // 半径跟着主花长大（发射器时间）
      "SurfaceOnly": true, "Velocity": false },
    { "m": "InitialSize", "StartSize": { "uniform": [[300, 300, 300], [500, 500, 500]] } },   // 3–5 m：300 m 外才看得清
    { "m": "ColorOverLife", "ColorOverLife": { "const": [30, 30, 28] }, "AlphaOverLife": { "curve": [[0, 1], [1, 0]] } }
  ] }
```
`materials.dot = { "role": "soft_dot" }`。半径曲线要和主花的开花半径一致：取烘焙器同一发的半径随时间的数据。

### C. 锦冠 · 金垂柳（大面片，长时间下垂）⚪
- 结构和 A 一样，区别在参数：
  - 格子竖长，比如 8 列 × 16 行（取决于烘焙器自动选格）；
  - 时长 5–8 s；
  - 帧号曲线开头密、后段疏（下垂段变化慢）。
- 取景用「随开花放大」：Size By Life 的 **Y 要比 X 长得多**（下垂把画面往下拉长），所以 `SizeByLife` 的 X、Y 分开写，Rectangle 对齐。
- 近景可以再叠一个 B 类的闪烁颗粒发射器。
- 换大小、换快慢，按第 9 节缩放。

### E. 升空尾缀 V5（两个速度朝向单粒子接力）🟡 烘焙器 2026-09-30 起输出
- `RiseLoop`：Screen Alignment = Velocity，`pivot_offset` 把星头放在粒子位置；`InitialVelocity` + `Drag` + `ConstAcceleration`（−981）拟合弹道；`SizeByLife` 只改 Y（尾迹随上升速度变短）；帧号是锯齿曲线（真循环）。
- `Fade30`：`delay_s` = 上升时长，在开花点 `InitialLocation` 出生，`InitialVelocity` = (0, 0, 1) 只定方向；帧号 0 → 总帧数 − 0.01。
- 材质角色 `beam_flipbook`（16×1 格，RGBA 接力 64 帧）。另有 20 fps 消散贴图 `T_<名>_Fade20.png`，换贴图并把消散时长改成 64 ÷ 20 = 3.2 s。
- 示例：[`examples/RiseTrailM.cascade.json`](examples/RiseTrailM.cascade.json)。

### E2. 升空尾缀 · 循环层 + 粒子（RT，烘焙器 4.1 起；RT5 的选项 4.4.5）⚪
- `RiseLoop`（CPU 1 颗，Velocity 对齐，Pivot Offset 星头在上端）+ `RiseFade`（开花点出生）+ 软圆点粒子发射器（GPU：火花 / 末段爆亮 / 落火；CPU：星头光晕 / 发射口闪光）。
- 弹道两种：线性（`InitialVelocity` + `Drag` + `ConstAcceleration`）；物理（平方阻力，`InitialVelocity` + `VelocityOverLife` Absolute，**不写** Drag / Const Acceleration）。粒子发射器的出生位置 / 初速是按发射器时间的曲线，两种都一样。
- 循环层长度两种：全程不变（4.4，出场淡入）；跟真实尾迹（`SizeByLife` 只改 Y、`"bake": false`，起步从短长出来、减速变短；`RiseFade` 用自己的 Initial Size / Pivot Offset，真实大小）。
- **GPU 发射器不写 `Acceleration`**（2026-10-04 UE 4.24 实测 GPU Sprites 标红）；每个发射器最多 2 个 `InitialVelocity`。烘焙器选项「GPU 兼容」= UE 4.24 实测时照这条导出。
- 一条尾缀 PC 上 GPU 粒子同时活着 ≤ 800（用户 2026-10-04）：细 / 中火花烘进循环层贴图，GPU 只留粗火花等少量。

### D. 千轮单元 × 粒子（一张小花单元序列，多粒子摆位）⚪
- `SphereLocation`：只在表面出生，勾 Velocity，`VelocityScale` 给向外的速度，配合 `Drag` 让小球飞出去后停住；
- Spawn Rate 集中在 0–0.3 s，让小花开得有先后；
- `InitialRotation` 随机，Size ±15%；
- 帧号曲线按每个粒子自己的寿命走，每种颜色一个发射器。

### F. 多层效果里某一层 PC 出「光点」（烘焙器 4.2.12 起）⚪ 未经 UE 验证
- 用户 2026-10-02 20:04：PC 可以「序列 + 粒子」，手机只能纯图片。烘焙器每层可选导出方案：PC = 序列 / GPU 光点 / 不出，手机 = 序列 / 不出。
- 光点层：一个 `gpu: true` 发射器，材质角色 `soft_dot`（和 B 同一个材质），没有贴图。数值都按模拟里每颗星定（烘焙器 4.2.15 起）：
  - `spawn.bursts`：模拟里会亮的星（不发光的星不出），按亮起时刻分 ≤ 5 批（第二段、延时点火的层不在开花时出生）；`delay_s` = 层延迟 + 第一批亮起时刻；
  - `SphereLocation`（`SurfaceOnly`、`Velocity`）：`StartRadius` 是随机范围（亮起时相对整体中心的半径，均值 ± √3σ），`VelocityScale` 随机范围（速度 = 出生位置 × VelocityScale）；
  - `InitialLocation` / `InitialVelocity`：整体中心亮起时的下坠和下坠速度（开花就亮的层接近 0）；
  - `Drag` + `ConstAcceleration`：亮起后的平均半径、中心高度拟合成线性阻力 + 等效重力（模拟里是平方阻力）；
  - `Lifetime` = 每颗星亮着的时长（10%–90% 分位）；颜色 = 层颜色 × Ramp 亮端 × 炭头亮度 × 光点亮度，亮度曲线（点火、渐隐、第二段、点灭的亮灭平均）直接压进 `ColorOverLife`（加色，等于 Alpha）；
  - `InitialSize` = 炭头大小 × 光点大小（层页头可调，默认 1）± 15%。
- 只出星头光点：尾巴、点灭的闪烁不在里面（有尾巴的层烘焙器会提示）。手机版这一层仍是序列。
- 发射器名 `L<层号>_Dots`；`cascade_mobile.json` 里没有 GPU 发射器。

### G. 多层效果里某一层 PC 出「单束」（烘焙器 4.2.13 起）⚪ 未经 UE 验证
- 结构同 D（单元序列）：一颗代表星的序列（`beam_flipbook`，16 × 2 格，RGBA 接力），`screen_alignment: Velocity`，`pivot_offset` 把星头放在粒子位置；
  `spawn.bursts = [[0, 星数]]`，`SphereLocation`（表面、Velocity，`VelocityScale` = 初速 ÷ 半径）+ `Drag` + `ConstAcceleration`；`SizeByLife` X / Y 分开；帧号曲线；CPU 发射器。
- 发射器名 `L<层号>_Unit`；手机版这一层是普通序列（`cascade_mobile.json` 里没有单束）。

## 11. 给云端 AI 的输出约定

- 要引擎参数时，**只输出一段** ` ```json ` 代码块，`format` 固定为 `fwl.cascade/1`。
- 材质写角色，动态参数写角色。**不要写任何资产路径、目录、材质实例名、材质参数名**。
- 数值用 Cascade 原生单位（第 3 节），曲线只给关键点，插值默认 Linear。
- 有贴图时，`textures.*.file` 写烘焙器导出的文件名，本地会在素材包目录里找。
- 效果名用英文。贴图名已按 1.1 的规范给好（`textures[].asset`），名称、层名在烘焙器「交付」页可以改；导入时不再另起名、不再加前缀。

## 12. 本地导入器做什么（概述）

1. 校验 JSON，打印计划（先预览，不写入）。
2. 导入贴图：按项目示例贴图照抄导入设置，读回核对。
3. 按材质角色复制项目的材质实例模板，填贴图、行列等参数。
4. 从空的粒子系统开始，逐个建发射器和模块，写入数值；需要时换分布类型。
5. 刷新查找表，核对误差。
6. 保存，并生成导入报告。

项目相关的目录、模板、参数名，只放在本机私有配置里，不进这个仓库。贴图命名规范（1.1）例外：用户 2026-10-02 确认可以进仓库。
