# analysis/scripts 工具说明

> 这里只讲工具怎么用。做事的规则在根目录 `CLAUDE.md`，完成的标准在 `协作/标准.md`。
> 工具已知的缺陷在 `协作/渲染基础问题清单.md`，用之前先看一眼，别把工具的偏差当成效果的问题。

## 1. 看结果、自检

| 工具 | 用途 | 注意 |
| --- | --- | --- |
| `待处理.py [负责人]` | 列出各负责人名下：结果回来还没看的、出错的、在算的、导出过期的 | 开工第一件事跑它 |
| `时刻对照.py <条目> <图>` | 按「开花后同一秒」对照实拍和模拟，云端约 20 秒一张。用来看造型、时间线、颜色 | 每层按探针定曝光，**层间亮度不准**；分辨率和快门也和导出不同（问题清单 A3、A5） |
| `layer_sheet.py <配置>` | 同一时刻「实拍 / 每层单独 / 组合」对照；固定米 / 像素；可局部放大；实拍可逐时刻偏移（手机抬头） | 同上 |
| `export_job.py` | 导出任务：`{type: export, effect, entry}`，出素材包、`导出清单.json`（版本指纹）、`烘焙回放.jpg`（实拍 / 实时 / 导出，另有 `_原尺寸`）、`回放检查.jpg / .json` | 云端也能跑：先 `window.FW_LIB_TEX = 512`，再调 `export_job.baker_strip`，约 4 分钟 |
| `回放检查.py` | 按 `cascade.json` 播放导出贴图，查空帧、跳变、过曝、裁切 | 目前**没有及格线**，裁切检查读的是被清零的边（问题清单 G1、G2） |
| `球形A_核验.py <烘焙回放_采样.json> <输出目录>` | 读取实际回放视野和绝对秒，整段只校准一次尺度，保存同区局部、展开/连通线辅助量 | 球形 A 的诊断工具；阈值仅为试验条件，**不是标准检查/艺术验收**。局部亮峰不代表独立点头，连通线不是单颗星真实尾长 |
| `review_to_baker.py` | 生成 `tool/data/review.js`、`协作/状态清单.md` | 改了条目、任务、状态清单后都要跑，然后跑 `tool/build.py` |

## 2. 条目从哪来（review_to_baker 读这些）

- **拟合任务**：`analysis/jobs/<id>.json` 里的 `review` 字段。多层写在 `start.layers`，跑完自动变成组合条目。
- **手配 / 原理条目**：`analysis/原理/条目*.json`、`analysis/迭代/条目.json`。
  - `entries` 是层；
  - `combos` 里带 `id` 的是组合条目（各层会隐藏）。
- **实拍取景**：花型按整个燃烧期星点外框居中，尾缀按运动亮点的横向重心，缓存在 `tool/data/video_meta.json`。改了取景算法要升 `META_VER`。开花时刻自动找不准时，在条目里填 `burst_t`。
- 远景视频里有观众、地面火、别的烟花时，任务里写 `roi`（画面比例 `[x0, y0, x1, y1]`）和 `t_range`（秒）。

## 3. 派生新版本

| 工具 | 用法 |
| --- | --- |
| `手调组合.py` | 来源是拟合任务或手调组合 |
| `派生组合.py` | 任何条目都行；`--dup` 复制层，做「尾巴层 + 星头层」 |
| `variants.py` / 任务里写 `variants` | 一次试几组改动，不拟合。多层的键：`0.x`（第 0 层）、`0+1.x`（第 0、1 层）、`*.x`（所有层） |

## 4. 测量与拟合

| 工具 | 用途 |
| --- | --- |
| `refkit.py` | 测量 |
| `star_analysis.py` | 星数、半径、外圈占比、火花尾、颜色、熄灭分布、下坠 |
| `star_colors.py` | 线性光颜色 |
| `compare.py` | 实拍和模拟对照图 + 数值。Linux 上用软件渲染，一次 1–2 分钟 |
| `fit.py` | 自动逼近 |

**拟合任务的设置**

- 起点放在 `analysis/jobs/起点/<任务号>_起点.json`。
- `fit.camera`：给模拟加相机模糊 `_psf` 和曝光 `_gain`，只用于对照、不进贴图。**不能靠它「调得像」**：尺寸在失效区时，看起来的「改进」其实是噪声（问题清单 A1、A5）。
- `fit.caps` 可以改尺寸上下限。尾缀任务另有 `len_w`（长度偏离权重）、`caps`。
- 多层拟合时，亮度类参数不要放进 `params`，否则次要层会被调没。

## 5. 烘焙器里的几个开关

| 开关 | 什么时候用 |
| --- | --- |
| `expoMode: 'frames'`（按帧定曝光） | 一层里亮度随时间变化很大（开花很亮、后面只剩点）时用；整张一起定曝光会让中后段看不见 |
| `trimLead`（默认开） | 延时出现的层，不把开头的空白烘进贴图 |
| 颜色段 | 最多 5 段，第 6 段起被丢掉 |

## 6. 视频

- 默认不录视频（任务里不写 `video`）。
- 用户要看时，单独录一段 1K 的实拍对照：`trail_video.py <输出目录> --compare`。

## 7. 4.0 兼容与预览检查

- `python analysis/scripts/playback_check.py --out <报告.json>`：30 Hz 取时、五类产物距离倍率及 1/3 屏高校准。
- `python analysis/scripts/mobile_playback_check.py --out <报告.json>`：独立手机烘焙、PC/手机时间计划、实际导出纹理引用、UI 平台切换及同 tick 的像素稳定性。

- `python analysis/scripts/render_kernel_check.py --out <目录>`：在浮点缓冲检查恒定面亮度、亚像素能量、移动跨像素边界、大光点与亮度倍率。
- `python analysis/scripts/render_paths_check.py --out <目录>`：整朵菊在 512/1024 单格下扫描四档星头尺寸；比较实际实时/烘焙/定帧采样缓冲；解码实际导出贴图量亮度倍率。PNG 是尺寸诊断，不是审美交付。

- `node analysis/scripts/bake_state_check.mjs`：直接执行界面控制器，复现旧任务串格子、失败重试、过期失败以及旧配方/保存版本问题。失败返回非零退出码。
- `python analysis/scripts/bake_browser_check.py --out <目录>`：真实页面启动后立即切 JM4，检查 8×8×4；注入失败，检查三个视图错误条和重试恢复。
- `python analysis/scripts/烘焙贴图回归.py --out analysis/local/输出/贴图回归 --report <报告.json>`：与 `a707b63` 比较 JM4、V5 小/中/大的完整导出分辨率 RGBA，包括两个消散序列；全部像素相同且不是空图才通过。完整像素数组仅留本机，提交小报告。
- `烘焙器回归.py --legacy` 有差异时返回非零。`烘焙器探针.py --html <旧版HTML>` 可测指定基线；首次切条目前等待初始烘焙完成，避免旧版 F0 污染截图。
- 上述浏览器脚本共用 `browser_runtime.py`。Windows 默认 D3D11；Linux 默认软件渲染；`FW_RENDER=soft` 可明确选择软件。`FW_BROWSER_EXECUTABLE` 可指定已有 Chromium，不必重复下载。要求 GPU 时若实际是 SwiftShader，会报错；报告记录的设备才是实际渲染设备。
- `review_to_baker.py` 需要 numpy、Pillow、OpenCV；缺依赖会提前退出，不能把缺条目的文件作为新库发布。
