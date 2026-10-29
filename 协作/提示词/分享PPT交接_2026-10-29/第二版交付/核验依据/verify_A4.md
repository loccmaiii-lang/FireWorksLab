# A4 技术考证复核与实际输出恢复

本报告只读核查，无 UE 连接、无源项目修改。仓库起点 fffafe28。下面的“已实现”“AI检查”“用户确认”分别说明，不视作用户最终验收。

## 1. A4 实际输出已找到

`analysis/local/_tmp/ppt2/reports/` 没有 A4.md，但 Claude 子任务最终回复不是空白。已从本机授权相关会话恢复三份完整文字：

- 仙女棒：`C:/Users/locmai/.tclaude/projects/F--FireWorksLab/16e183c7-ad3a-4f70-bd01-ba81a2910d6a/subagents/agent-a453917cd8d9097cc.jsonl`。
- 模糊方头：同目录 `agent-a6de1781716244627.jsonl`。
- 黑点黑块：同目录 `agent-ac9f86c36bb16add8.jsonl`。
- A4 主任务 `agent-a0f3363081e232293.jsonl` 未找到最终文字；它的子任务已输出上述报告。原文件保留，只将相关最终回复附于本报告文末。

## 2. 可直接合稿的关键事实与修正

### 升空尾缀：不要写“全部只用1个发射器1层”

- 近段/远段是**同一粒子系统内的不同内容表示**，不是根据相机距离切换的 LOD。近段循环面片随弹体；远段把年老火星的世界运动烘成一次性序列。原 RT6 导出另带 GPU 火花（`analysis/原理/升空尾缀.md:313–370`）。
- 实际 UE 读回文件 `FXtools/节目/NewYearFireWorks_v01/资源发射器数.json`，readAt 为 `2026-10-15T18:17:11.673Z`：PC S/M/L/Hero 总槽10个，**启用2个 RiseLoop+TrailFar**；GPU槽在这份快照停用。PC Tiny/XS启用1个 TrailFull；手游对应尾缀每资源1个 TrailFull。**这是历史快照，不能冒充今天实时读回。**
- `tool/CHANGELOG.md:853–866` 与 `tool/src/js/31_plan40.js:366–392`：在 1080p、800m、四尺玉约1/3屏高的参考条件下，用90分位星速积分得到屏幕位移：`Δp = ∫v90(t)dt × pixelsPerMeter`。
- 金芒菊4.56s/64帧是用户看过流畅的校准样本；其22/21/11/10帧分别停1/2/3/4个30fps tick。停≥2 tick的帧最大位移0.77px被用作**本项目经验标定线**，不是通用视觉阈值。
- RT6远段旧L上升段最慢1.9fps，在800m每帧跳5–6px。4.9.26改整数tick与位移预算，L/M/S为253/126/102帧；4.9.31再次分配为256/128/96帧，上升段203/109/71帧，最慢30/15/30fps（`CHANGELOG.md:794–800`）。不要混成同一版本的一组数字。
- 代价：L单格从128×2048变为128×512；记录按800m约0.58px/m、300m约1.5px/m解释远处不显软、近处更易显软。**不应说“根据距离计算火花寿命与闪烁”**；距离用于屏幕分辨率与帧预算，寿命是模拟参数。也不能称远近都完全流畅。

推荐正文：“先按游戏视距算每帧的屏幕位移，再把有限帧数放到运动最快的阶段；近段保留循环，远段用一次性序列表现老火星。”

### 仙女棒：13模拟层 → 每平台1张序列+1CPU发射器

- 13层和1/30s快门来自用户 Blender V05（`analysis/原理/窜天猴与仙女棒.md:7–44`、`analysis/results/SparkGraph/来源.json`）。AI做的是迁移到通用亲子粒子图、重建关联运动、增加可调控制与按文献调整快抛慢落。不要说全由AI从参考独立推导。
- 模糊/清晰来自粒子深度、快门积分和景深近似，不是简单多放一层模糊图；子粒继承母粒事件时位置与部分速度。研究针对线香花火，不能泛化成所有手持仙女棒化学定律（`analysis/原理/仙女棒动力学与分叉_20261017.md`）。
- 本次直接只读检查 `analysis/results/GraphFraming/SGS1/candidate/Sparkler_Graph.zip` 内 `cascade.json` 和 `cascade_mobile.json`：4.9.118，PC/手机均1个CPU `Main`、64帧4×4×RGBA、2.1333秒，PC主图与手机主图各1张，此外仍有Ramp/Cutout，不能说“整个包只有1张图”。
- 同包明确备注“未经UE验证”；状态清单是待验收。可展示烘焙器/实包回放，不能标UE实机。
- 可用图：`analysis/results/SparkGraph/13层形态对照.jpg`；`SparkGraph/镜头-sparkler-off-1.png`与`镜头-sparkler-high-1.png`（成像功能对照，不应混成同一新版修bug对照）；`SparklerControls/基线-2.png`与`候选-2.png`（4.9.113→4.9.114运动修订）；`GraphFraming/SGS1/candidate/PC-回放.jpg`（实际包回放）。

推荐正文：“把13类火星的模拟与成像合进一张64帧序列；UE侧每平台只需一个CPU面片发射器。当前展示为导出包回放，仍待实机观感验收。”

### 模糊/方头：真实UE对比可复用，结论必须区分测试条件与平台

- 一轮把问题主归因半透明50%不完整；二/三轮及独立复核才隔离出长条格子各向异性与主图mip、Ramp mip的不同作用。不要省成“关AA就好了”。
- 最贴近用户实际PerfGear低档的是 `analysis/results/LOWQ_FIX_20261018/方案与对比.md`：该档AF1、半透明100%、MipBias0；与前轮DefaultScalability@0的AF0/半透明50%/Bias16不同。
- 长条格子128×2048，只缩Y到15%时按压扁方向选mip导致星头宽平；主序列NoMip去除此退化。金芒菊是首次激活时主图仅128²、约0.4秒后清晰，NoMip保留完整分辨率。该0.4秒只适用本机RTX5080+SSD记录，不能写成所有设备性能结论。
- 真对比首选：`analysis/results/LOWQ_FIX_20261018/升空_现状对NoMip_低档.jpg`、`升空_800m连续帧_低档.jpg`、`金芒菊_绽放流送对NoMip_低档.jpg`、`金芒菊_绽放局部放大_低档.jpg`。这些是UE SceneCapture同机位同时播放，只裁切与整倍最近邻放大。
- 次选：`analysis/results/QUALITY_REVIEW_20261017/RiseTrail_L_正式资产回归对照.png`、`RiseTrail_L_低高档同机位对照.png`。注意这是另一套低档条件。
- 现行规范已变：PC主序列NoMip；手游因内存反馈已回常规FromTextureGroup，≤1024；Ramp均Clamp+NoMip；NeverStream=false；贴图组DistantVFX。依据根CLAUDE.md引擎硬约束及10-28规则。**不能把10-18“PC+手游全NoMip”写成当前规则。**
- 没有GTX960客户端、完整演出帧时间或手机实测，禁止写“性能已无问题”。

推荐正文：“先用同机位、同档位的受控对比区分形状采样和流送模糊，再将PC与手游的取舍写入导入规范。”

### 黑点与Ramp末格黑块：两件事，不混因

- 黑点：旧RT6软粒子把明暗写RGB、Alpha恒1；半透明RGB降零仍遮挡成黑。改为RGB恒定色相与亮度、淡出/闪烁写Alpha，加Scale Color/Life。`analysis/results/RT6LE3/RiseTailL_cascade.json`与`RT6LE4/RiseTailL_cascade.json`可做真实数据修前修后；`spec/UE实测.md:72`仍写新写法UE未看。**没有UE黑点修前修后图**，加色回放本来就看不出黑点。
- Ramp末格黑块：末格黑+序列封顶253是为外缘细线加的护栏；最亮值若采到末格可变黑。**旧序列255+新黑末格是候选机制，8张疑似资源没有核实UE字节，不得写成确证8张错配。** `analysis/results/UE_READBACK_20261015/看法.md`第3条明确“很可能/候选、不是确证”，15:40又撤回Clamp根治猜测。
- BC7冒顶也是曾试假设，用户RGBA8无效，不能当最终根因。Clamp无效的实际读回见`spec/UE实测.md:45–66`。
- 用户确认的修法：EmissiveDissolve=0.98，使q=pow(v*s,2-s)，最大q约0.980；黑末格护栏仍保留。`对话记录/对话框23.md:507,511,515`有用户“问题直接解决”；`对话框26.md:128,173,182`有67材质实例保存和导出/导入契约。
- 现实现`tool/src/js/62_resource_rules.js:15,193`、`spec/cascade_params_v1.md:148`统一写0.98。只影响Ramp查色发光，不直接当透明度/溶解淡出。
- 可用机制图：`analysis/probe/BC7护栏黑块_2026-10-15/Ramp末格_复现.png`（**云端模拟**，左旧序列255+黑末格、右封顶253，是诊断机制对比，**不是0.98实际修法前后**）；`黑块示意.png`是已被排除为主因的BC7假设，**不建议正文用它说明最终修法**。
- `analysis/results/资源规范统一_20261016/第2步UE证据.jpg`为0.98修后UE实播图，但没有配套同镜头修前图。建议正文用“模拟机制图 + 用户确认文字”，附录说明欠缺UE成对截图；不要伪造修后图。
- SoftToe8暗端色环是另一件事，可用`analysis/results/GLITTER_RAMP_20261020/回放_original_0.png`与`回放_soft_0.png`作真实引擎回放对比，不能冒充Ramp末格黑块修复。

推荐正文：“把一次修复变成导出规则：黑点用Alpha表达明暗；末格黑块则保留原护栏，并统一写入0.98的查色余量。”

## 3. 审稿必须保留的边界

1. 仙女棒、黑点新写法：不要标UE验证通过。
2. 近远段不是相机距离LOD；0.77px是本项目经验线。
3. 主图NoMip只写当前PC规则，手游按最新规范。
4. 黑块现象与0.98修法有用户确认；细线漏色路径及封顶序列冒顶的GPU根因没有闭环。
5. 黑点/末格黑块没有UE成对截图；有的是数据对比/云端模拟/单侧修后实播，标注不能省。
6. 未读取或修改Blender、UE资产、未提交内容；本报告仅写入本次指定reports目录。

---

# 恢复的Claude A4子任务最终报告（原文，待按上述复核纠正）

以下原文是既有成果的恢复，不自动将其推断升级为事实；特别是黑块报告把“8张很可能旧序列”写实，应以本报告第2节纠正。


## 来源 agent-a453917cd8d9097cc.jsonl

主题 2「仙女棒」（条目 SGS1）已考证完。结论有两条最要紧：13 层结构和 1/30 s 快门都来自用户自己的 Blender 工坊 V05，不是 AI 从参考推出来的；这个效果还没有用户审美验收，也没有 UE 实播。

## 主题 2 · 仙女棒

### 1. 考证结论

**来源与结构**
- **13 层结构的来源**：照搬用户的 Blender 工坊 V05（`D:/Blender/Firework_FX_Lab/assets/Sparkler/V05/parameters.json`，只读）。文档原话是「13 层来自原工坊，不按两个效果复制两套物理」（analysis/原理/窜天猴与仙女棒.md:7,14；analysis/results/SparkGraph/来源.json:1-6，shape_count 13）。AI 做的是把它移进烘焙器，做成通用的「分层粒子图」（tool/CHANGELOG.md:303-305，4.9.83）。
- **13 层层名核对无误**（tool/src/js/46_graph_templates.js:15-27，e01–e13）：
  - 01 燃烧核心、02 细长暗丝、03 中等金丝、04 粗亮短火星、05 分裂母粒；
  - 06 一级分叉：母粒 05，在母粒寿命 65% 时每颗出 16 个，继承 20% 速度；
  - 07 延迟分叉：母粒 05，在寿命 90% 时出 9 个，概率 0.34；
  - 08 二级碎火星：母粒 06，在寿命 78% 时，概率 0.25；
  - 09 不规则粗碎片（自转、翻转）、10 暗红余烬、11 圆形余烬、12 近远景粗火星、13 燃烧头炽热点。
  - 子粒从母粒事件那一刻的位置出生，带走一部分母粒速度（窜天猴与仙女棒.md:16-29）。

**物理推导与文献**
- **多级分叉**：依据 Inoue 等《Direct Self-Sustained Fragmentation Cascade of Reactive Droplets》，PRL 118, 074502（2017）（仙女棒动力学与分叉_20261017.md:7）。
  - 文档用它支持「母粒逐级碎裂、亲子轨迹相连」，并写明它不支持用全局涡流制造分叉。
  - 文档同时写明这项研究针对线香花火，不能推广到所有铁粉仙女棒。
- **其他文献**：
  - 《Heat balance of senko-hanabi and iron sparks》（2019）：说明发光大小不能当真实粒径去驱动阻力（同文件:10）。
  - NASA 阻力方程页：说明烘焙器的线性阻力只是近似（:12）。
  - NASA 燃烧页：热气会上升，不等于金属火星会上浮（:15）。
  - Photron／九州大学高速摄影页：只用来判断母粒上会发生多级分叉（窜天猴与仙女棒.md:8）。
- **「快抛慢落」的诊断和修订**：
  - 诊断：几层主粒共用 1.7/s 阻力，寿命只有 0.05–0.2 s，重力只有 0.184 m/s²，所以看起来匀速（动力学文档:20）。
  - 10-17 第一版试配用了 −9.81 m/s²。用户 10-18 说「火花变得下坠了」（对话框窜天猴与仙女棒.md:84）。
  - 4.9.114 改为：重力 −2.5 m/s²；初速上限 +30%；加上方弱气流（响应 12 1/s、上升 0.3 m/s、扰动 0.3 m/s、收束 0）（SparklerControls/看法.md:12；46_graph_templates.js:28；CHANGELOG:89）。
  - 结果：细丝初速 P10/中位/P90 从 0.56/1.11/1.71 变为 0.22/0.93/3.16 m/s。这是固定种子的模型诊断，不是实拍拟合。
- **气流**：燃烧点上方弱热羽流加微风和涡动，是引导式近似，不是 CFD（动力学文档:26；CHANGELOG:157-162）。
- **一处刻意夸张**：分叉速度放大 1.5 倍，为了在低分辨率下认得出来（窜天猴与仙女棒.md:33）。

**相机模型（4.9.84 加入，默认关闭，按资源开关）**
- **起因**：用户 10-14 原话「不是镜头拍摄那种拉伸动态迷糊的感觉……头亮尾暗」，并要求「把景深与散焦光斑……一起实现了吧」（对话框窜天猴与仙女棒.md:31-34）。旧做法是「头尾 22%→100% 渐变 + 快门 0」（:36）。
- **各参数**（默认值 tool/src/js/46_camera.js:3，界面行 tool/src/js/10_types.js:1071-1081）：
  - `cameraMotion`：快门运动模糊开关。
  - `cameraShutter`：曝光时间，默认 1/30 s，取自 V05 的 globals（窜天猴与仙女棒.md:44）。
  - `cameraPhase`：快门位置，end 表示窗口为 [t−曝光, t]（46_camera.js:9）。
  - `cameraQuality`：快速 1.2 px/240 Hz，高质量 0.35 px/960 Hz，加倍 0.175 px/1920 Hz（:12）。
  - `cameraDof` / `cameraDistance` / `cameraFocus` / `cameraAperture`：散焦半径 = 光圈/2 × |(距离 + 粒子 Y 深度 − 对焦)/对焦|（:11）。SGS1 取光圈 0.018 m，距离和对焦都是 1 m。
  - `cameraBlades`：0 为圆形、6 为六边形保能量软边核（46_camera_render.js:20-29）。
- **成像方式**：每颗粒子在曝光窗口内积分，窗口裁到它的出生和死亡时刻，采样数按屏幕速度自适应，权重保证光量不变（46_graph_model.js:143-171）。
- **镜头核 σ 下限 0.28 → 0.55 像素**（4.9.97，CHANGELOG:210；常量在 46_camera_render.js:37）：
  - 原因：σ 太小时，亚像素粒子落在像素中心还是边上，总光量差很多，变异系数 CV 0.44（方案原文写 0.43，协作/方案_导出排查_2026-10-14.md:126）。
  - 修后：CV 0.007，1–3 像素拉丝 ≤ 0.007，「串珠」指标从 0.25 升到 0.95，平均光量不变。
  - 代价：最细的火星更柔（NFR-SG-G97/看法.md）。
  - 同一版还让「镜头关」也走同一个核，关/开总光量比从 34 变为 0.994（CHANGELOG:211）。
- **「贴图曝光 exposure」是另一个参数**：它管贴图编码，不是相机曝光。4.9.123 的花型模板把它从 1 降到 0.27、显示强度升到 2.6，用来避免过曝（46_graph_templates.js:6-8,13）。条目 SGS1 自己仍是曝光 1。
- **耗时**：在 RTX 5080 上出完整 PC + 手机包，镜头关 1.6 s，快速 2.6 s，高质量 5.6 s（SparkGraph/看法.md:17-20）。

**导出**
- **你点名的 NFE-SGS1-G106**（烘焙器 4.9.106）：
  - PC 和手机各 1 个发射器 Main：CPU、Rectangle、Local Space；每 2.1333 s 发 1 颗；帧号曲线 0.02→63.99。
  - 贴图 4×4×RGBA = 64 帧，30 fps 循环；PC 2048²（单格 512），手机 1024²（单格 256）。
- **G106 不是当前候选**，它是运动修订之前的版本（指纹 7b78d809）。当前候选是 SGS1E118（4.9.118，指纹 c6f38fb9）：结构相同，取景收紧 26.5%，Initial Size 94.9×80.6 cm。

**验收状态**
- 状态清单写的是「待验收」，用户验收 false（协作/状态清单.json:2244-2259）。缺项是用户审美验收，以及 UE 里的朝向、Bloom、压缩和真实米数。
- 用户 10-19 试过导入 UE：PC 资产保存成功，但登记阶段报 Error 87（导入器把命令行拼得过长，是工具 bug）；手机包导入失败（对话记录/对话框5.md:42；对话框23.md:525）。所以只做过导入尝试，没有实播验收。

### 2. 讲者说法里不成立或要改的地方
1. **「AI 根据参考做物理推导」不准确。** 13 层结构和 1/30 s 快门都来自用户的 V05。AI 做的是移植、做成通用的亲子分叉，再按文献调运动。这些文献主要研究线香花火，只能作造型依据，期间也没有对实拍逐帧拟合。
2. **「自己写相机参数做运动模糊」要加限定。** 项目通用规则是相机模糊只用于对照、不进素材（CLAUDE.md:42）。仙女棒把快门拖影和景深烘进贴图，是用户 10-14 明确批准的按资源例外，默认关闭。散焦是近似模型，不模拟像差和色差（SparkGraph/看法.md:31）。σ 0.55 是渲染器的防闪常量，不是相机参数。
3. **「模糊的、清晰的」不是独立的层。** 那是 13 层粒子按各自深度过景深后的结果。分叉层只有 06、07、08 三层。
4. **「一层」要讲清楚。** 准确说法：烘焙器里 13 个模拟层，导出到 UE 是每个平台 1 个 CPU 发射器 + 1 张 64 帧序列。
5. **「传统要拆多个素材拼」只有间接证据。** 项目里已有的窜天猴拖尾 P_EFX_MusicFest_FireWork_Skyrocket_Trail_HD，UE 实读有 10 个发射器（8 CPU + 2 GPU），用了多张 Sparkler / Streak 贴图（FXtools/节目/NewYearFireWorks_v01/资源发射器数.json:3287 起）。建议讲成「以项目已有的窜天猴拖尾为例」。
6. **「较高写实度」目前只有 AI 自检。** 要注明「待用户验收、未经 UE 实机验证」。

### 3. 附录正文草稿（约 95 字）
仙女棒沿用 Blender 工坊 V05 的 13 类火星，在烘焙器中重建为亲子粒子图：母粒按寿命触发一级、延迟和二级分叉，子粒继承母粒位置与部分速度。运动按快抛慢落与弱热羽流调整，经用户批准可将 1/30 秒快门与景深烘入贴图。导出为每平台 1 个发射器、1 张 64 帧序列，尚未经 UE 实机验证。

### 4. 推荐配图
所有图都来自烘焙器渲染或浏览器里的引擎回放，仓库里没有仙女棒的 UE 实机图。
- F:/FireWorksLab/analysis/results/SparkGraph/13层形态对照.jpg：不分修前修后，烘焙器单层独看。
- F:/FireWorksLab/analysis/results/SparkGraph/镜头-sparkler-off-1.png 是修前，F:/FireWorksLab/analysis/results/SparkGraph/镜头-sparkler-high-1.png 是修后，都是烘焙器渲染。
- F:/FireWorksLab/analysis/results/SparklerControls/基线-2.png 是运动修订前，F:/FireWorksLab/analysis/results/SparklerControls/候选-2.png 是修订后，都是烘焙器渲染。
- F:/FireWorksLab/analysis/results/GraphFraming/SGS1/candidate/PC-回放.jpg：当前候选，引擎回放（按导出包播放）。
- F:/FireWorksLab/analysis/results/SparkGraph/镜头参数入口.png：界面截图，配合讲相机参数。

### 5. 联系表
F:/FireWorksLab/analysis/local/_tmp/ppt2/a4/contact_仙女棒.jpg（2400×1563，4 列 × 3 行）
1. F:/FireWorksLab/analysis/results/SparkGraph/13层形态对照.jpg：13 层逐层单独形态（4.9.84）。
2. F:/FireWorksLab/analysis/results/SparkGraph/镜头-sparkler-off-1.png：修前，4.9.84 的「镜头关」旧核，头亮尾暗、整体过亮。
3. F:/FireWorksLab/analysis/results/SparkGraph/镜头-sparkler-high-1.png：修后，快门 1/30 s END + 景深，高质量。
4. F:/FireWorksLab/analysis/results/SparkGraph/镜头参数入口.png：4.9.84 镜头成像参数界面。
5. F:/FireWorksLab/analysis/results/SparklerControls/基线-2.png：运动修订前（4.9.113）。
6. F:/FireWorksLab/analysis/results/SparklerControls/候选-2.png：运动修订后（4.9.114）。
7. F:/FireWorksLab/analysis/results/GraphFraming/SGS1/candidate/Sparkler_Graph.zip 内的 T_EFX_FireWorks_Sparkler_Graph.png：当前 PC 主图，R/G/B/A 各 16 帧拼成 2×2，显示时提亮过。这个 ZIP 只在本机、不进 Git，在内存里读取，没有解压到盘上。
8. F:/FireWorksLab/analysis/results/GraphFraming/SGS1/candidate/PC-回放.jpg（裁了前 3 个时刻）：4.9.118 PC，上排烘焙器组合回放，下排按导出包回放。
9. F:/FireWorksLab/analysis/results/GraphFraming/SGS1/candidate/手机-回放.jpg（裁了前 3 个时刻）：4.9.118 手机，单格 256。
10. F:/FireWorksLab/analysis/results/SparklerControls/原生入口-引擎回放.png：4.9.114 引擎回放和 13 项倍率界面。
11. F:/FireWorksLab/analysis/results/GraphFraming/SGS1-PC-前后对照.jpg：4.9.118 取景收紧前后，面片减少 26.5%。
12. F:/FireWorksLab/analysis/results/NFE-SGS1-G106/回放检查.jpg（裁了前 3 个时刻）：4.9.106 导出包回放检查，属于运动修订前的版本。

σ 0.28 → 0.55 这次修复没有受控的前后对照图，只有 CHANGELOG:210 的数字；静态图本身也看不出逐帧闪，PPT 里要讲的话建议画示意图。另外 G106 包里的 Cascade参数.txt 写的是 Square，和 JSON 里的 Rectangle 不一致，4.9.118 已更正（CHANGELOG:63），和本主题关系不大。

## 来源 agent-a6de1781716244627.jsonl

主题 3（模糊与方头 bug）考证已完成。只读，只生成了两张联系表，没有改动任何其它文件。

## 3. 模糊与方头

### 联系表（已打开核对过）
- `F:/FireWorksLab/analysis/local/_tmp/ppt2/a4/contact_模糊方头.jpg`（2400×2060，16 张：修前修后成对的图和关键机制图）
- `F:/FireWorksLab/analysis/local/_tmp/ppt2/a4/contact_模糊方头_2.jpg`（2400×2060，16 张：二轮机制图、修后全景、五图同屏）
- 编号对照见文末第 5 部分，表 1 = 第一张联系表，表 2 = 第二张。

### 1. 考证结论

**现象**
- 10-16 用户报告：高、低配显示不一致，低配有奇怪的模糊。图 1–4 是编辑器，图 5–7 是实机，图 8–9 是超高配置（对话记录/对话框画质排查.md:7）。
- 用户确认图 5–7 是 PC 低配（GTX 960），素材和高配是同一版。素材版本不同这一项因此排除（对话框画质排查.md:26）。
- 用户二轮补充了三个症状（对话框画质排查.md:59）：
  - RiseTrail_L 近段循环的星头变方；
  - 远段有灰白噪点；
  - Comet / Silver 在消散末期很糊。
- 10-18 新贴图规范上线后，用户反馈两件事（对话记录/对话框本机同步检测.md:112）：
  - L 和中型尾缀仍是方头；
  - 金芒菊开花那一下明显发糊。

**排查经过（按时间）**

1. **10-16 首轮（Codex）**
   - 把半透明分辨率从 100% 降到 50%，能复现粗糊（QUALITY_BLUR_20261016/诊断.md:13）。
   - 50% 下关掉 AA 仍然粗糊，所以排除「关 AA 能修」（诊断.md:13）。
   - 全局 mip bias −8 只找回部分细节，三类效果收益不一致（诊断.md:14）。
   - 给实例开局部全分辨率，对升空尾缀有效（诊断.md:15）。
   - 后来补注：这一轮没有复现用户截图上的症状（诊断.md:1）。

2. **10-16 二轮（Codex）**
   - 近段和远段一起播放复现。
   - 找到之前漏掉的一点：近段的 Size By Life 只缩 Y，从 1.41% 到 82.67% 再到 15%，X 不缩。近段两轴密度比约 8:1，远段约 4.5:1（二轮复核.md:27）。
   - 抽查烘焙出的循环帧，星头是圆弧或尖头，不是烘成了平头（二轮复核.md:27）。
   - 「循环本身出错」没有证据；即使开了全分辨率，AF0 仍然明显糊（二轮复核.md:29）。
   - 以下做法排除：只关 AA；只给 Ramp 关 mip（AF0 下仍糊）；全局负 bias（会放大灰白噪点）；把灰白点全部归因于 BC7（二轮复核.md:49）。
   - 当时的候选是「4 个实例局部全分辨率 + 全局 AF8」（二轮复核.md:9）。

3. **10-17 三轮（Codex）**
   - 用原生移动播放复现了症状。
   - 保存了 8 个资产：4 张主图改 NoMip，4 个材质实例开局部全分辨率（QUALITY_BLUR_20261017/修复与影响.md:5，:47-53）。
   - 近段与远段的纹素比例失配分别约 7.9 倍和 4.5 倍（修复与影响.md:29）。
   - 灰白点被归因为 Ramp 的 Wrap 寻址（修复与影响.md:33-37）。

4. **10-17 复核（WorkBuddy）**
   - 结论是两个独立的采样问题，都由低档 TextureQuality@0 触发（QUALITY_REVIEW_20261017/复核结论.md:7-12）。
   - 纠正了 Codex 的三处判断（复核结论.md:46-48）：
     - 二轮「50%·AF0」那一格其实已经复现了方头，而「50%·AF8」已经恢复，说明主因是 AF 和 mip，不是半透明 50%；
     - 灰白点的主因是 Ramp 带 mip，只改 Clamp 解决不了；
     - 新增 Ramp 副本违反「只用已有贴图」的约束。
   - 五方案量化：只修 Ramp 时方头还在；只做主图 NoMip 时火花在低档发白（复核结论.md:28-36）。
   - 扫了 237 张贴图（复核结论.md:86-88）：
     - 28 张 Ramp 全部有 mip、会流送；
     - 45 张 HD 序列有 mip；
     - Ramp 应为 Clamp + NoMip 的约定（spec D5）一直没有落实到导入设置。

5. **10-17 18:32 五图同屏（WorkBuddy）**
   - SilverChry 的收益一部分来自全分辨率，消散末期整体变暗变稀，不能默认算通过（QUALITY_COMPARE5_20261017/实测与修复方案.md:17-21）。
   - 撤回了此前「高档逐像素不变」「没有闪烁风险」的说法（实测与修复方案.md:28）。

6. **10-18 的转折**
   - 溯源 NeverStream：旧导入器照抄项目示例贴图的设置，HD 主序列示例本来就勾着 NeverStream（对话记录/对话框画质复核.md:60-62）。
   - 用户与性能组确认：NeverStream 全部关，NoMip 可以开（对话框本机同步检测.md:83）。
   - 用户把画质测试的 8 项改动全部还原（对话框本机同步检测.md:95，:104）。
   - 按新规范改了 149 张贴图：NeverStream 关、组改 DistantVFX、23 张 Ramp 改 Clamp + NoMip，主序列和 Cut 暂不改 NoMip（对话框本机同步检测.md:101，:105）。

7. **10-18 15:0x 定因（本机同步检测，用户实际的 PerfGear 低档）**
   - PerfGear 低档与 DefaultScalability@0 不是一回事（LOWQ_FIX_20261018/方案与对比.md:18-26）：
     - PerfGear 低档：AF 1、半透明 100%、MipBias 0；
     - Scalability@0：AF 0、半透明 50%、MipBias 16；
     - 所以在 PerfGear 低档里，局部全分辨率起不了作用。
   - 方头与流送无关：0.5 s 起正式图已经是 2048 驻留，仍是方头（方案与对比.md:30）。
   - 金芒菊发糊是流送：图没出现时只留 128²（每格 32²），激活后约 0.4 s 才到 2048，正好赶上开花（方案与对比.md:12）。

8. **10-18 落地**
   - 16:2x 先改 3 张主图为 NoMip（方案与对比.md:97）。
   - 用户测后原话：「PC手游主序列都改nomip吧，交付入口默认写nomip……没有方头了，并且金芒菊偶尔有偶尔没有，大多数时候都没有」（对话框本机同步检测.md:135）。
   - 又改 70 张：PC 37 张、手游 33 张。连同先改的 3 张共 73 张；交付入口对主序列默认写 NoMip（方案与对比.md:114；对话框本机同步检测.md:142）。

9. **10-28 手游改回**
   - 性能组反馈手游 NoMip 内存过高（对话记录/对话框LiteHDR.md:341-343）。
   - 用户定：只改手游，24 张改回 FromTextureGroup；保留 DistantVFX，Ramp 不动；两张 2048 共用图把最大尺寸设成 1024（对话框LiteHDR.md:358）。
   - 已执行：26 张读回一致；导入器 v2.31 主序列按平台写（对话框LiteHDR.md:374-375）。
   - 状态：未测试，P4 未提交（analysis/results/20261028_手游贴图Mip梳理/看法.md:3）。

**根因**

- **方头（主要是 Rise L / M 近段）**
  - 近段 RiseLoop 用 16×1 格，每格 128×2048。
  - Size By Life 只把 Y 缩到 15%，X 不缩，贴图沿长度方向被压扁：L 约 7.9 倍，M 约 6.0 倍，S 约 2.9 倍。
  - 低档关了各向异性过滤，GPU 按压扁方向挑 mip。128 像素宽的格子被糊成 4–8 像素宽，就成了平头宽块（方案与对比.md:11；复核结论.md:11）。
  - 远段每格 128×512，没有「只缩 Y」，所以轻得多（修复与影响.md:27）。
  - 与「近段远段有没有分开」无关（方案与对比.md:14）。

- **灰白点**
  - Ramp 带 mip、Wrap、可流送。
  - 「末格黑」护栏只在 mip 0 成立：
    - mip ≥ 1 时，最热一格和黑格被平均成灰白；
    - mip ≥ 3 时，Wrap 又把这种灰白卷到暗端（复核结论.md:12，:40）。

- **Comet / Silver 消散粗糊**
  - 在 Scalability@0 下，是采样退化和半透明 50% 叠加造成的（修复与影响.md:25）。
  - PerfGear 低档的半透明本来就是 100%，这一条在那里不成立。

- **金芒菊开花先糊后清**
  - 10-18 关掉 NeverStream 以后，主图变成可流送，开花头 0.4 s 只有 128²（方案与对比.md:12）。
  - 这是关 NeverStream 带出的新症状，不是 10-16 原有的。

**最终方案**
- PC 主序列一律 NoMip：
  - 不流送，始终是全分辨率；
  - 没有更低的 mip 可选，两个症状一起消失。
- 手游主序列 10-28 改回 FromTextureGroup。
- Ramp 一律 Clamp + NoMip。
- 局部全分辨率默认不开。

**变成的规则**
- CLAUDE.md:31「烟花贴图规范」五条：
  - ① 永不勾 NeverStream；
  - ② 贴图组用 DistantVFX；
  - ③ Ramp 用 Clamp + NoMip；
  - ④ 主序列分平台：PC 一律 NoMip，手游 FromTextureGroup 且 ≤ 1024，交付入口 v2.31 按平台写；辅助图、Cutout 不跟着改；
  - ⑤ 半透明局部全分辨率默认不开。
- spec/烟花特效资产规范.md:51-61 有对应的 PC / 手游表。
- 协作/渲染基础问题清单.md:17 第 I2 条。
- 协作/标准.md 里没有对应条目。
- 导入器 v2.31 是私有源码，只在对话记录里可查（对话框LiteHDR.md:375）。

### 2. 讲者说法里要改的地方

- **「一个 bug」不准确。** 至少是四个独立原因：
  - 方头：低档关各向异性过滤 + 近段只缩 Y，导致 mip 选错；
  - 灰白点：Ramp 的 mip + Wrap + 末格黑；
  - 消散粗糊：Scalability@0 的半透明 50% 叠加采样退化；
  - 开花先糊后清：关 NeverStream 后的流送。
- **「长条格在流送或 mip 降到很小时变方头」的机理说错了。** 方头时贴图已经全分辨率驻留（方案与对比.md:30），原因是压扁加上 AF 关闭导致 GPU 挑错了 mip 级。流送造成的是金芒菊那种「整体先糊」。CLAUDE.md:31 把两件事写在了同一句里，讲的时候要分开。
- **「PC NoMip」的范围要说清：**
  - 只限 3.0 在用、非共享的主序列（材质参数 MainTex / BaseTex）；
  - Ramp 是另一条规则，Clamp + NoMip 早就单独定了；
  - 噪声、遮罩、溶解等辅助图和 Cutout 不改；
  - 和别的项目共用的贴图不改（方案与对比.md:116）。
- **「手游改回带 mip」要说清：**
  - 只改了 24 张，不是 10-18 改的全部 33 张；
  - 金垂柳端手共用的 2 张、音乐节共用的 2 张仍是 NoMip，后两张最大尺寸设成了 1024；
  - 至今未测试，P4 未提交；
  - 爆开先糊后清如果回来，按用户定的，交客户端在节目时段对这批图做精细化管理，不改回 NoMip（CLAUDE.md:31；对话框LiteHDR.md:358）。
- **数字要带口径：**
  - 160 MB 是按 BC7 每像素 1 字节估算的，没在 UE 里量过（方案与对比.md:99，:115）；
  - 10-18 前勾着 NeverStream 时约 213 MB（stats.json）。所以讲「NoMip 比原来更省」是对的，讲「几乎不花内存」不对。
  - 0.4 s 是在 RTX 5080 + 固态盘上测的，低配机会更久（方案与对比.md:12）。
- **验收状态：**
  - 用户 10-18 在编辑器里口头确认 3 张图「没有方头了」，金芒菊「偶尔有偶尔没有，大多数时候都没有」；
  - GTX 960 和打包客户端都没测，高档的远处闪烁也没测（方案与对比.md:72-73）；
  - 10-18 的 UE 改动在记录里都是「未提交 P4」（交接.md:183-186）。
- **不宜讲成「AI 一次定位准确」。** Codex 三轮把重点放在半透明降采样和 Wrap 上，是 WorkBuddy 纠正的；最终根因是在用户实际的 PerfGear 低档下才定下来的。这段曲折本身可以作为经验来讲。
- **10-17 那 8 个资产修复（4 张主图 NoMip + 4 个实例局部全分辨率）和 Rise_L Ramp 副本，10-18 已被用户全部还原。** 现行方案不包含局部全分辨率。

### 3. 附录正文草稿（92 字）

> 低档关了各向异性过滤，尾缀近段面片又只沿长度压缩，星头取到过低的 mip 成了方块；金芒菊主图可流送，开花头 0.4 秒只有 128²。PC 主序列改为 NoMip 后两者消失，手游因内存仍带 mip。

### 4. 推荐配图

全部是 UE 4.24 实机截图，没有引擎回放或示意图。

1. `F:/FireWorksLab/analysis/results/LOWQ_FIX_20261018/升空_现状对NoMip_低档.jpg`
   - 修前 / 修后同屏，PerfGear 低档，271 m，L / M 两档。
   - 建议裁 6.0 s 和 6.8 s 两行的「L 现状 | L NoMip」。
   - 这是最贴合最终方案的主图。
2. `F:/FireWorksLab/analysis/results/QUALITY_REVIEW_20261017/方头_原图与复现.png`
   - 修前：左边是用户的编辑器低配截图，右边是 UE 低档复现。用于讲现象。
3. `F:/FireWorksLab/analysis/results/LOWQ_FIX_20261018/金芒菊_绽放局部放大_低档.jpg`
   - 修前 / 修后，0.29 s 和 0.37 s 那两行最直观：一圈糊光环对清楚的芒线。
4. `F:/FireWorksLab/analysis/results/QUALITY_REVIEW_20261017/RiseTrail_L_低高档同机位对照.png`
   - 600 m，7 列方案对比，用于讲排查和排除了什么：
     - 只修 Ramp，方头还在；
     - 只做 NoMip，火花发白；
     - 去掉全分辨率，火花成块。
   - 注意它的条件是 Scalability@0，不是 PerfGear。
5. `F:/FireWorksLab/analysis/results/QUALITY_BLUR_20261016/二轮/RiseTrail_L_HD_过滤保底.png`
   - 机制图：同一冻结帧下 AF0 出方头、AF8 恢复。可选。

### 5. 全部对比图清单

所有图都来自 UE 4.24 本机编辑器，没有示意图。

**QUALITY_BLUR_20261016**（Codex 10-16）
- 条件：冻结组件后只改 CVar，约 495 m，不是完整低配预设。
- 图都是修前机制或临时候选，不是正式修复。

| 路径（相对 analysis/results/） | 修前 / 修后 | 效果 | 画质条件 | 联系表 |
|---|---|---|---|---|
| QUALITY_BLUR_20261016/半透明分辨率对照.png | 修前（原资产）机制 | 升空尾缀、银色束尾、银色球花 | 半透明 100 / 50（AA4、AA0）/ 恢复 | 表 1 #13 |
| QUALITY_BLUR_20261016/mip采样对照.png | 修前机制 | 同上三类 | 100% / 50% / 50% + mip bias −8 | 表 1 #14 |
| QUALITY_BLUR_20261016/局部全分辨率覆盖.png | 临时候选 | 升空尾缀 | 覆盖开，100 / 50 / 100 | 表 1 #15 |
| QUALITY_BLUR_20261016/二轮/近远段合播拆分.png | 定位 | RiseTrail_L 3.02 s、6.82 s，近 + 远 / 仅近 / 仅远 | 100% 与 50% | 表 1 #16 |
| QUALITY_BLUR_20261016/二轮/近远完整寿命.png | 定位 | RiseTrail_L 0.5–11.5 s | 默认（高档） | 表 2 #1 |
| QUALITY_BLUR_20261016/二轮/RiseTrail_L_HD_过滤保底.png | 机制（50%·AF0 那格就是方头复现） | RiseTrail_L 3.00 / 6.82 / 9.50 s | 100%·AF8，50%·AF0/2/4/8，局部覆盖全开 | 表 1 #9 |
| QUALITY_BLUR_20261016/二轮/消散末期对照.png | 修前机制 | Comet 2.60 s、Silver 2.81 s | 半透明 100 / 50 / 100，AF8 | 表 2 #2 |
| QUALITY_BLUR_20261016/二轮/消散直到耗尽.png | 定位 | Comet / Silver 到 0 粒子 | 100%、AF8 | 表 2 #3 |
| QUALITY_BLUR_20261016/二轮/Comet_Layers_HD_过滤保底.png | 机制 + 候选 | Comet 末期 | AF 各档，局部覆盖开 | 表 2 #4 |
| QUALITY_BLUR_20261016/二轮/FanSilver_01_HD_过滤保底.png | 机制 + 候选 | Silver 末期 | 同上 | 表 2 #5 |
| QUALITY_BLUR_20261016/二轮/Comet_Layers_HD_default-scene.png | 修前 | Comet 消散 2.01–2.60 s | 半透明 100 / 50 / 100 | 表 2 #6 |
| QUALITY_BLUR_20261016/二轮/Comet_Layers_HD_forced-scene.png | 临时候选 | Comet 消散 | 瞬态实例全分辨率 | 表 2 #7 |
| QUALITY_BLUR_20261016/二轮/FanSilver_01_HD_default-scene.png | 修前 | Silver 消散 | 半透明 100 / 50 / 100 | 表 2 #8 |
| QUALITY_BLUR_20261016/二轮/FanSilver_01_HD_forced-scene.png | 临时候选 | Silver 消散 | 全分辨率覆盖 | 表 2 #9 |

**QUALITY_BLUR_20261017**（Codex 三轮）
- 条件：原生移动帧；低档 = Scalability@0 的 60 项 + 半透明 50%。
- 这里的修后版本 10-18 已被用户还原。

| 路径（相对 analysis/results/） | 修前 / 修后 | 效果 | 画质条件 | 联系表 |
|---|---|---|---|---|
| QUALITY_BLUR_20261017/evidence/low-source-before-after.png | 左修前 / 右修后（NoMip + 全分辨率） | Rise_L 6.8 s、Comet、Silver | 低档 | 表 1 #10 |
| QUALITY_BLUR_20261017/evidence/saved-last-embers.png | 修前 / 修后 | Comet / Silver 最后余烬 | 低档 | 表 1 #11 |
| QUALITY_BLUR_20261017/evidence/far-ramp-reversal.png | 机制 | Rise 远段 9.455 s，Ramp Wrap → Clamp → Wrap | 关曝光 / Bloom / AA | 表 1 #12 |
| QUALITY_BLUR_20261017/evidence/formal-rise-high-1000m.png | 修后 | Rise_L 1000 m 全景 | 高档 | 表 2 #10 |
| QUALITY_BLUR_20261017/evidence/formal-scene-high.png | 修后 | Rise_L 在 Dam 原机位 | 高档 | 表 2 #11 |

**QUALITY_COMPARE5_20261017**（WorkBuddy 五图，原 outputs/ 下的成品）
- Git 目录里没有图。五张图 10-22 已挪到 `analysis/local/20261017_outputs_旧备份/画质五图_20261017/`（outputs/搬走说明.txt:1），不进 Git。
- 每张四列：
  - B0：修前采样设置复建；
  - S0：当前资源（Comet / Silver 已部分修过）；
  - C2：临时候选（NoMip + Ramp Clamp）；
  - R1：Rise_L 参考。
- 条件：500 m，AF0，Bias16，半透明 50%（下排是 100% 对照）。

| 文件 | 效果 / 时刻 | 联系表 |
|---|---|---|
| 01_Comet_Layers_HD_亮段_同屏对比.png | Comet 亮段 1.156 s | 表 2 #12 |
| 02_Comet_Layers_HD_主头已灭_同屏对比.png | Comet 主头已灭 2.471 s | 表 2 #13 |
| 03_FanSilver_01_HD_银束消散段_同屏对比.png | Silver 消散 1.470 s | 表 2 #14 |
| 04_SilverChry_HD_展开亮段_同屏对比.png | SilverChry 展开 0.903 s | 表 2 #15 |
| 05_SilverChry_HD_散落消散段_同屏对比.png | SilverChry 末期 2.172 s | 表 2 #16 |

**QUALITY_REVIEW_20261017**（WorkBuddy）
- 条件：Scalability@0 低档 vs 高档，SceneCapture 移动帧。

| 路径（相对 analysis/results/） | 修前 / 修后 | 效果 | 画质条件 | 联系表 |
|---|---|---|---|---|
| QUALITY_REVIEW_20261017/方头_原图与复现.png | 修前（左：用户截图；右：UE 复现 6.8 s） | RiseTrail_L 近段 | 编辑器低配 / 低档 | 表 1 #1 |
| QUALITY_REVIEW_20261017/RiseTrail_L_低高档同机位对照.png | 修前 / 各方案 / 修后，7 列 | RiseTrail_L 600 m，4.0 s、6.8 s | 低档 + 高档 | 表 1 #6 |
| QUALITY_REVIEW_20261017/RiseTrail_L_近机位低高档对照.png | 修前 / 修后（Transient 副本） | RiseTrail_L 270 m，4.5–7.5 s | 低档 + 高档 | 表 1 #8 |
| QUALITY_REVIEW_20261017/RiseTrail_L_正式资产回归对照.png | 修前 / 修后（正式资产，带灰白计数） | RiseTrail_L 270 m | 低档 + 高档 | 表 1 #7 |

**LOWQ_FIX_20261018**（本机同步检测）
- 条件：用户的 PerfGear 低档原样不动；SceneCapture，同时播放。
- 「现状」= 10-18 新规范之后（NeverStream 关、带 mip），即修前；「NoMip」= 修后。

| 路径（相对 analysis/results/） | 修前 / 修后 | 效果 | 画质条件 | 联系表 |
|---|---|---|---|---|
| LOWQ_FIX_20261018/升空_现状对NoMip_低档.jpg | 修前 / 修后 / NoMip + 1024 | Rise L / M 271 m，1.0–7.3 s | PerfGear 低档 | 表 1 #2 |
| LOWQ_FIX_20261018/升空_800m连续帧_低档.jpg | 修前 / 修后 | Rise L / M 800 m 连续帧，看闪烁 | PerfGear 低档 | 表 1 #3 |
| LOWQ_FIX_20261018/金芒菊_绽放流送对NoMip_低档.jpg | 修前（流送）/ 修后 | 金芒菊 800 m，0.07–2.01 s | PerfGear 低档 | 表 1 #4 |
| LOWQ_FIX_20261018/金芒菊_绽放局部放大_低档.jpg | 修前 / 修后，局部放大 | 金芒菊 0.07–0.45 s | PerfGear 低档 | 表 1 #5 |

**范围外：** GlitterChry 的三张同屏图在 `analysis/local/20261017_outputs_旧备份/GlitterChry对比_20261017/`，属于 GLITTER_AB_20261017，没有列入本主题。

## 来源 agent-ac9f86c36bb16add8.jsonl

## 主题 4：黑点（RT6，4.9.24）与 Ramp 末格黑块（EmissiveDissolve 0.98）

本节只做主题 4。全程只读，只生成了一张联系表：`F:/FireWorksLab/analysis/local/_tmp/ppt2/a4/contact_黑点黑块.jpg`（2400×2557，18 格），没有写其它文件，没有提交。

两个 bug 的结论：
- **黑点**：讲者说的原因和修法都对，但这个修法没在 UE 里看过，而且节目里的尾缀已经不用会出黑点的那些 GPU 发射器了。
- **黑块**：修好是用户在 UE 里确认过的。要改的是「规则」的说法：0.98 是加在原来护栏上面的，护栏没有撤掉。
- 两件事都没有 UE 实机的修前 / 修后对照图，仓库里只有模拟图和数据。

### A. RT6 黑点（烘焙器 4.9.24）

**考证结论**
- **用户原话（10-07 00:41）**：「现在你做rt6粒子导入很黑，可能是你的颜色曲线设为了0……如果你要做闪应该做alpha或者大小岁生命缩放」（对话记录/对话框23.md:95）。
- **用户定的修法（10-07 09:20）**：「是Translucent,透明度有接a通道，color over life就可以控制alpha曲线，颜色倍增给我都加上去吧，Scale Color/Life这个」（对话框23.md:105）。
- **原因**：RT6 各层火花和 GPU 光点这些软圆点，把淡出、闪烁、冷却都乘在 Color Over Life 的 RGB 上，Alpha 一直是 1。半透明材质里「RGB 到 0 + Alpha 1」就显示成黑点。黑的部分有两段：普通火花冷却段的最后约 20% 寿命，以及 SparkPops 爆亮前的整段（出生后 85% 寿命）。烘焙器预览按加色画，所以自检看不出来（tool/CHANGELOG.md:875、878）。
- **修法**（esColorAlpha，46_emitset.js）：
  - RGB = 色相 × 恒定亮度 M，M = max(峰值, 4)；Alpha = 亮度 ÷ M；点灭的方波也放进 Alpha。
  - 每个发射器最后加一个 ColorScaleOverLife（RGB 1、Alpha 1），在 UE 里调整体亮度。
  - 出处：tool/CHANGELOG.md:879–880；导入器那边见 协作/备忘_导入器.md:16–17。
- **数据实证**（同一个 RT6L 包，修前修后各一份）：
  - 修前 analysis/results/RT6LE3/RiseTailL_cascade.json（10-05 导出）：SparksCoarse 的 RGB 最大通道从 1.99 降到 0，Alpha 常数 1；SparkPops 在 0–0.849 寿命内 RGB = 0。
  - 修后 analysis/results/RT6LE4/RiseTailL_cascade.json（10-07，4.9.26）：RGB 恒为 4，Alpha 从 0.498 降到 0，并带 ColorScaleOverLife。
- **验证状态**：
  - 没经 UE 验证。spec/UE实测.md:72 写的是「⚪ 新写法在 UE 里还没看」，之后没找到更新。
  - 引擎回放上修前、修后看起来一样（联系表 1、2），因为黑点在加色预览里本来就看不出。
  - 同一写法也用在鸿巢 GPU 红闪光点上，本机回放检查通过（对话记录/对话框新花型.md:184），这也不是 UE 验证。

**讲者说法要改的地方**
1. 「火星熄灭处出现黑点」不够准。准确说法是「GPU 火花冷却段、以及末段爆亮粒子在爆亮前整段都是黑的」（CHANGELOG:878）。用户当时的原话是「导入很黑」。
2. 不能说「改了以后 UE 里正常了」，只能说「改了写法，UE 待验」（spec/UE实测.md:72）。
3. 节目里实际用的尾缀，PC 版里这些 GPU 发射器（SparksFine、SparksTwinkle、SparksCoarse、Embers、SparkPops、LaunchSparks 等）在 UE 读回里都是 enabledLOD0 = false，只开 RiseLoop + TrailFar；Tiny / XS 只有一个 TrailFull；手游不出 GPU。出处：FXtools/节目/NewYearFireWorks_v01/资源发射器数.json（readAt 2026-10-15，changesVs20261014 里 gpu 6 → 0）。所以不要暗示节目里尾缀好看是靠这个修复。谁、为什么关掉这些发射器，没查到记录。
4. 「AI 自检通过、进 UE 才发现」这句对 A 成立，原因就是预览按加色画（CHANGELOG:878）。

**附录草稿（约 95 字）**
> 尾缀 GPU 火花的淡出与冷却原写在 RGB，Alpha 恒为 1；在半透明材质中，RGB 降到 0 即显示为黑点，而烘焙器按加色预览，自检未能发现。4.9.24 起 RGB 只保留色相与恒定亮度，明暗改由 Alpha 表达，并为每个发射器加 Scale Color/Life。

**推荐配图**
- 仓库里没有这个问题的 UE 截图，修前、修后都缺。用户 10-07 那次反馈是文字，截图不在仓库里。
- 能用的是数据对比：F:/FireWorksLab/analysis/results/RT6LE3/RiseTailL_cascade.json（修前）和 F:/FireWorksLab/analysis/results/RT6LE4/RiseTailL_cascade.json（修后）。这是 cascade.json 数据，适合做成「曲线示意图」，就是联系表 3、4 那种。
- 如果要说明「预览看不出」，可以用 F:/FireWorksLab/analysis/results/RT6LE3/烘焙回放.jpg 和 F:/FireWorksLab/analysis/results/RT6LE4/烘焙回放.jpg 两张引擎回放，修前修后看起来一样。

### B. Ramp 末格黑块（EmissiveDissolve 0.98）

**考证结论**
- **起因：10-07 的「护栏」**
  - 用户把分裂星的 Color Over Life 调到 ×30 后，光晕外缘出现灰白细线。改 Clamp + NoMip 没用；Ramp 加宽到 4096、或把末格涂黑后，细线消失（spec/UE实测.md:46–55）。
  - 用户 14:34 说：「可以做了，做的很好，太好了，后面所有导出都这样做」（spec/UE实测.md:55）。
  - 于是 4.9.31 起：所有 Ramp 256×8 的第 255 格（最右一列）涂黑，所有序列编码封顶 253（CHANGELOG:794、800；spec/cascade_params_v1.md:303–304）。
  - 细线从哪条路漏进来始终没查清（spec/UE实测.md:56、66）。
- **出现黑块（10-15）**
  - 用户 01:40：「我好多贴图，导入UE之后，会有这些黑色马赛克在闪」（对话框23.md:470–472）。
  - 用户 11:00：序列改成 RGBA8（不压缩）也没用，BC7 压缩冒顶不是主因（对话框23.md:477–481；analysis/probe/BC7护栏黑块_2026-10-15/README.md 的「更正」一节）。
  - 用户 11:25：「换了一张之前的旧图255的旧没有黑块了」（对话框23.md:486–488）。
- **机制**：最亮的像素查到了 Ramp 的黑末格。
  - 本机只读读回（T06，analysis/results/UE_READBACK_20261015/看法.md 第 1–3 条）：
    - 材质查色坐标 q = pow(v·s, 2−s)，s = EmissiveDissolve^Pow；45 个实例都是 1，所以 q = v。
    - 有 8 张旧序列（没封顶，最亮到 255）配上了被同名覆盖的新 Ramp（末格黑），其中包括尾缀 L / M / S 的近段 Loop 和远段 Far。
  - 截图里那张 4.9.100 的封顶序列也会黑，推断是 UE 里有东西把 253 推上去了，没证实（同一文件的「更正」一节）。
- **修法（10-15 15:06 提出）**
  - 材质实例参数 EmissiveDissolve 从 1 改成 0.98。v = 255 时 q = 0.980（落在第 250–251 格），253 时 0.972，中间调 0.5 → 0.483。末格黑永远碰不到，暗端照旧混到末格黑，所以细线护栏不受影响（对话框23.md:507；UE_READBACK 看法.md「更正」一节）。
  - 这个参数只进 Ramp 查色 → 发光，不进透明度或溶解（对话框26.md:58）。
  - 我按公式复算过三个数，都对得上。
- **UE 实机确认**：用户 10-15 20:53：「把EmissiveDissolve 改成 0.98有用，问题直接解决了」（对话框23.md:513–515）。
- **变成了规则**
  - 用户 10-16 01:38 要求「把现有全部材质的 EmissiveDissolve 统一改成 0.98」（对话框26.md:13）。
  - UE 里批量写了 67 个材质实例（对话框26.md:128）；实播证据见 analysis/results/资源规范统一_20261016/第2步UE证据.jpg。
  - 烘焙器 4.9.113 起，所有导出出包前给序列 / 单束材质写 `materials[k].emissive_dissolve: 0.98`（CHANGELOG:93–102；spec/cascade_params_v1.md:148；tool/src/js/62_resource_rules.js:12）。
  - 私有导入器 v2.28 按包写入并读回，「更新」时不改回 1（spec/cascade_params_v1.md:141）。

**讲者说法要改的地方**
1. 「为去光晕灰线改 Ramp 导致最亮处黑块」基本对，补两点：
   - 护栏有两半，「末格黑」和「序列封顶 253」，正常情况下最亮只到 253，碰不到末格。
   - 黑块出现，是因为有像素超过了 253。主要是旧序列（255）配了同名覆盖的新 Ramp；另有一例是 UE 里数值冒顶（推断）。光说「末格改黑后被最亮像素采到」，会让人以为护栏本身设计错了。
2. 「EmissiveDissolve 0.98 解决」成立，有用户 UE 原话。但「规则」不只是「出包补 0.98」：「末格黑 + 封顶 253」护栏至今仍在（spec/cascade_params_v1.md:303–304），后来的 SoftToe Ramp 也保留末列黑（GLITTER_RAMP_20261020/检查.json 里 lastColumnBlack: true）。准确说法：护栏保留，再加 0.98，让最亮处查色坐标离开末格。
3. 10-07 细线和 10-15 黑块的根因（UE 里从哪条路漏进来、什么把 253 推上去）都没在 UE 里确证，只能说「现象和修法已确认」。0.98 也管不了低档 Ramp 的 mip 灰白（对话框26.md:158）。
4. 任务里提到的 analysis/results/GLITTER_RAMP_20261020/ 不是这个 bug：
   - 它处理的是金曜菊 S1 开花闪光的「暗端色环」：8 位线性暗部台阶 × Ramp 低端 #FF5423（GLITTER_EDGE_20261020/看法.md）。
   - 修法是 SoftToe8，把最暗 8 列柔化到黑，末列仍黑。只在引擎回放（RTX 5080 浏览器）里看过，不是 UE（GLITTER_RAMP_20261020/看法.md、使用说明.md）。
   - 未跟踪的 T_EFX_FireWorks_GlitterChry_Lead_Soft_R.png 我逐像素比过，和 S1_Lead_SoftToe_R.png 完全一样，是一份重复拷贝。
5. 状态文档没跟上：协作/渲染基础问题清单.md:16 的 I1 还写着「没修 · 等用户 UE 一测」，和 10-15 20:53 用户确认不一致。我只记下，没改。

**附录草稿（约 100 字）**
> 为去除光晕外缘细线，Ramp 末格改为黑色，序列编码封顶 253；此后若最亮像素高于 253（如旧序列未封顶），就会查到黑格，形成闪烁黑块。改法是把材质实例 EmissiveDissolve 设为 0.98，查色坐标最高约 0.98，不再到达末格；4.9.113 起由导出器自动写入。

**推荐配图**
- F:/FireWorksLab/analysis/probe/BC7护栏黑块_2026-10-15/Ramp末格_复现.png，云端模拟（不是 UE）。上排三格正好是一组对照：左「旧序列 + 末格黑 Ramp」出黑块（修前），中「换末格不黑的 Ramp」、右「封顶 253 的序列」都没有黑块。
- F:/FireWorksLab/协作/提示词/分享PPT交接_2026-10-29/素材/22_bug_最亮处黑块_示意图.png，PPT 已在用，是上面那张左上格的裁切。图下要标「云端模拟」，不能当 UE 截图。
- F:/FireWorksLab/analysis/probe/Ramp线框_2026-10-07/试用_256/T_EFX_FireWorks_Crossette_R.png，护栏 Ramp 贴图本身，末列黑，放大用。
- F:/FireWorksLab/analysis/probe/Ramp线框_2026-10-07/Ramp线框_模拟.png，起因：×30 时光晕外缘细线，云端模拟。
- F:/FireWorksLab/analysis/results/资源规范统一_20261016/第2步UE证据.jpg，修后 UE 4.24 实播，爆裂星和金垂柳都开了 0.98，画面正常。它不是黑块的修前修后对照。
- **缺的图**：UE 实机里的黑块截图（用户 10-15 01:40 / 11:00 发的截图只在聊天里，仓库没有）；UE 里同一镜头的 0.98 修后截图。

### 联系表各格
文件：`F:/FireWorksLab/analysis/local/_tmp/ppt2/a4/contact_黑点黑块.jpg`（A = 黑点，B = 末格黑块，C = 相关但不同的暗端色环）

| 编号 | 完整路径 | 内容 |
|---|---|---|
| 1 | F:/FireWorksLab/analysis/results/RT6LE3/烘焙回放.jpg | A 修前，RT6L 10-05 导出，引擎回放（实拍 / 实时 / 导出三行），加色预览看不出黑点 |
| 2 | F:/FireWorksLab/analysis/results/RT6LE4/烘焙回放.jpg | A 修后，RT6L 4.9.26，引擎回放，和 1 看起来一样 |
| 3 | F:/FireWorksLab/analysis/results/RT6LE3/RiseTailL_cascade.json | A 修前数据卡：SparksCoarse / SparkPops 的 RGB 降到 0、Alpha 恒 1 |
| 4 | F:/FireWorksLab/analysis/results/RT6LE4/RiseTailL_cascade.json | A 修后数据卡：RGB 恒定、淡出在 Alpha、带 ColorScaleOverLife |
| 5 | F:/FireWorksLab/analysis/probe/Ramp线框_2026-10-07/Ramp线框_模拟.png | B 起因，×30 光晕外缘细线（Clamp / Wrap / Wrap + Mip），模拟 |
| 6 | F:/FireWorksLab/analysis/probe/Ramp线框_2026-10-07/线框形状_模拟.png | B 起因，细线沿纹素网格走，4 种 Ramp 对比，模拟 |
| 7 | F:/FireWorksLab/analysis/probe/Ramp线框_2026-10-07/分裂星_换图前后_模拟.png | B 护栏前后：分裂星 ×30，原 Ramp 有线框、末格黑 Ramp + 封顶无线框，模拟 |
| 8 | F:/FireWorksLab/analysis/probe/Ramp线框_2026-10-07/加宽Ramp_对比.png | B 试验，256 宽对 4096 宽 Ramp（×30 / ×100），模拟 |
| 9 | F:/FireWorksLab/analysis/probe/Ramp线框_2026-10-07/试用_256/T_EFX_FireWorks_Crossette_R.png | B 护栏 Ramp 256×8，整张 + 最右 16 列（末列黑）+ 最左 16 列放大 |
| 10 | F:/FireWorksLab/analysis/probe/BC7护栏黑块_2026-10-15/黑块示意.png | B 假设一：BC7 冒顶造成台阶黑块，模拟；后被用户 RGBA8 试验排除为主因 |
| 11 | F:/FireWorksLab/analysis/probe/BC7护栏黑块_2026-10-15/Ramp末格_复现.png | B 复现：旧序列 255 + 末格黑出黑块，换 Ramp 或用封顶序列不黑；下排是 ×30 细线，模拟 |
| 12 | F:/FireWorksLab/协作/提示词/分享PPT交接_2026-10-29/素材/22_bug_最亮处黑块_示意图.png | B PPT 已用图，等于 11 的左上裁切，模拟 |
| 13 | F:/FireWorksLab/analysis/results/资源规范统一_20261016/第2步UE证据.jpg | B 修后，UE 4.24 实播，爆裂星 / 金垂柳带 0.98，不是黑块对照 |
| 14 | F:/FireWorksLab/analysis/results/GLITTER_EDGE_20261020/原暗端.png | C 另一问题，S1 开花闪光暗端红环，修前，引擎回放 |
| 15 | F:/FireWorksLab/analysis/results/GLITTER_EDGE_20261020/黑暗端试算.png | C 试算：暗端整段改纯黑，环消失但暗尾一起变暗，引擎回放 |
| 16 | F:/FireWorksLab/analysis/results/GLITTER_RAMP_20261020/回放_original_0.png | C 修前，金曜菊 S1 橙引线 0 s 闪光，引擎回放 |
| 17 | F:/FireWorksLab/analysis/results/GLITTER_RAMP_20261020/回放_soft_0.png | C 修后，SoftToe8 Ramp，0 s，引擎回放 |
| 18 | F:/FireWorksLab/analysis/results/GLITTER_RAMP_20261020/T_EFX_FireWorks_GlitterChry_S1_Lead_SoftToe_R.png | C SoftToe Ramp：暗端 8 列柔化，末列仍黑（放大） |

范围外顺带看到一条：升空尾缀（主题 1）的「几个发射器」可以直接用 资源发射器数.json 里的 UE 读回。PC 的 S / M / L / Hero 有 10 个发射器，只开 2 个（RiseLoop + TrailFar），手游 1 个（TrailFull）；Tiny / XS 在 PC 和手游都是 1 个。
