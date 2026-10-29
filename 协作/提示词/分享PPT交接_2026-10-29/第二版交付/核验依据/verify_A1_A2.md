# A1 / A2 复核报告

复核基线：FireWorksLab `fffafe28b0ebb3e4f11a416964eb538f30aac061`；Blender 项目 `eeb7bca`。只读源项目，未打开 UE / Blender，未修改源文件或旧考证中间数据。本报告未提交。

## 1. 可直接采用的关键结论

- 跨年烟花 3.0 的 PC 表：46 行对应44个粒子系统资产。按作品而非尺寸、分段、平台档位去重，为26种开花花型、30个开花规格、6档升空尾缀，另有1套窜天猴（PC表7个组件行）。
- 手游不是51种烟花：正式表24行，由12种开花、6档尾缀、6行窜天猴组件组成。12种开花为小金花、小银菊、短爆裂、小分裂、红彗星、银星扇、银冠菊、爆裂星、橙辉星、点灭星、金芒菊、金垂柳。51是有实际效果内容的粒子系统资产数，包含高低档和组件差异。
- 212张是跨年3.0整批粒子资产引用贴图的去重快照：PC专用133、手游专用33、共用46；其中主序列MainTex84、通用BaseTex18、Ramp31、Cutout57、其他辅助22。不是212张独立烟花，也不是全由烘焙器生成。
- `analysis/results`下有466份导出清单，其中308份路径含NFE；清单记录累计4177次PNG文件输出，其中主序列1971（PC952+手游1019）、Ramp852、Cutout1196、单帧3、检查图155。仅排除检查图后为4022次素材PNG输出；这些是各次版本的累计输出记录，包含同名重复，不是4177张最终独立资产。
- 交付工作区索引可直接复核78个不可变交付修订、46个资源ID；86条导出记录按deliveryId去重仍为78，74个receipts是检查回执，不能说导入UE成功74次。不同出口存在重叠，不能相加成总导出次数。
- 工作量可写约2200次仓库提交、烘焙器约200个版本记录。当前HEAD有2216个祖先提交，352条主题以gpu:开头、80条以user:开头。剩余提交不能一概称人工完成，亦不能把提交次数等同有效功能数。
- Blender确有24条素材资产线/165个一级版本目录（剔除assets内两个AI沙龙PPT目录）；88次仓库提交。建议PPT主线无需堆这些数，以起点与教训为重。

## 2. 数字来源与口径细节

### 引擎库存

原始文件：`analysis/local/20261028_LiteHDR_手游贴图Mip/inventory.json`，`at=2026-10-28T10:06:23.137Z`。
生成逻辑：同目录`tex_inventory.mjs:1`说明统计范围；`:7`指定PC/手游ResourceFXTable；`:20-26`以RowDescription包含“跨年烟花3.0”搜索，PC读取FxSP，手游读取FxSP/FxSP_High/FxSP_Low；`:29-30`额外纳入一个未入表金垂柳V3。

文件原始包含97个粒子对象（PC44/手游53）。手游53需要剔除：
1. `P_EFX_FireWorks_GoldKamuro_V3_M`，rows为“（金垂柳 v3，待合入）”、cols为“未入表”；
2. `P_Destructible_Empty`，在窜天猴拖尾烟雾的Low列作为空占位。
剔除后为51个真实效果资产。18行（12开花+6尾缀）各有M/H两档=36；窜天猴真实组件15资产，合计51。正式表仍是24行，空占位不应改变行数。

26种花型的计算规则：PC46行减尾缀6行、窜天猴7行，剩33开花行；金锦冠中心/中间/左右外侧4行合并为1规格，得30规格；金芒菊、金蕊柠、多重菊、银彩菊分别跨尺寸/同名重复再各减1，得26花型。此为按表名推导的美术花型口径，并非运行时系统自动分类。银彩菊两个行内的美术差异若需要细分，应保留“按名称及尺寸合并”的限定。

贴图复算依据：`analysis/local/_tmp/ppt2/a1/tex_classified.json`，原215条，排除3个引擎默认辅助图(DefaultTexture/T_Default_Material_Grid_M/Gray)，得212。分类规则见`tex_classify.py`，其中排除金垂柳V3与空占位独占引用。所有LOD（包括关闭LOD）的引用都在原始盘点范围内，因此212并非当帧显存用量。

### 导出清单

中间汇总：`analysis/local/_tmp/ppt2/a1/exp/manrows.json`，469条唯一清单路径，其中466条在analysis/results、3条在analysis/local。三个local记录没有files数组；4177次PNG实际全部来自results中459份带PNG清单，另7份results清单没有文件列表。以“现存清单可核对的累计PNG输出”表述，不能宣称覆盖所有历史导出。

原始导出清单举例：`analysis/results/20261027_地面循环火焰/导出清单.json`（无files列表，不计PNG）；`analysis/results/FCE-FC10R/导出清单.json`（典型具名效果导出）。本轮对全部466个results路径读取JSON成功；所有已有manrows路径仍存在。

本机交付索引：`D:/ProjectTextures/FireWorksLab/workspace-resources.json`的resources数组78项、46个resourceId/46个name；`.workspace/exports/*.json`46个文件合计86条记录、78个唯一deliveryId；`.workspace/receipts/*.json`74个文件。交付修订详见各资源`revisions/<revisionId>/workspace-resource.json`。本轮直接读取索引和exports复核，并非只沿用A1摘要。

### A1草稿需要修正或限定

| 草稿说法 | 复核处理 |
|---|---|
| NFE309份 | 当前现存清单为308；主页面可以不展示此子数 |
| 193个包名/94花型族 | 现有packages.json是204键；其包名解析算法会把目录、版本后缀、平台变体混在一起，不能直接作为独立效果数。建议删除这组数字 |
| 4177张图 | 改为“累计4177次PNG输出记录（含155检查图与版本重复）”；更简明可用“1971次主序列PNG输出” |
| 38/39效果导出过 | effect字段去重仅37种（含None，且相同花型有多个效果ID），无法用这份导出清单直接复核。建议不上主页面 |
| 烘焙器贡献20/26花型、150/212贴图 | 名称匹配可以支持“已匹配到导出记录”，不能单凭名字证明作者/源工程归属。若主任务用此结论，应进一步逐项核验配方、正式命名与素材来源；本报告不将其升格为最终确认 |
| 人工约1783提交 | 不采用；非gpu/user前缀不等于纯手工劳动 |
| 196版本 | a1/work/baker_versions.txt确有196行；当前CHANGELOG可提取200个唯一数字版本标签（201个标题），包含早期与非正式段落。推荐“约200个版本记录”，精确数字需明确标题筛选规则 |

## 3. Blender起点与2D转向：可证实的叙事

1. `D:/Blender/Firework_FX_Lab/README.md:7`锁定Blender5.2.1 LTS；项目内确有原生工程、素材版本、配方及S0–S6平台阶段资料。
2. `work/material_library/18_雏形FireWorksLab对照与根因.md:101`自述Blender一轮2–28分钟；`:133`说已从28分钟降到2–3分钟但没有实时预览。这是当时特定工作流的项目记录，不是对Blender软件普遍性能的结论。
3. 同文件`:116`明确HTML雏形只有面向相机2D精灵，缺少真3D机位/视差；因此可以说明它主动缩小输出问题的范围。用户“按本次游戏舞台和制作规范定制2D烘焙器”是本次明确口述，资料为其提供合理技术背景，不要写成所有粒子只需2D。
4. `assets/Sparkler/V05/本版说明.md:17`明确视口为交互预览，不能代替F12采样质量；`:19`明确一秒预览不等于完整两秒循环验收，且当版没有生成正式64帧序列。用于说明“看到的预览不等于最终交付”很合适。
5. `work/kiku_bridge_20260927/融合判断.md:53,59`记录77帧512平方小样约30.5–32.7秒，正式导出器仍固定Cycles CPU2线程；隔离小样用OPTIX，时间不含启动/保存/后处理。不可把这组小样计时与网页完整导出作倍数对比；也不可写“GPU没有改善”这一泛化结论。
6. 网页烘焙器依据当前项目的实际观看条件约束制作：`F:/FireWorksLab/协作/标准.md:32-34`的800–1200m、四尺玉约1/3屏高、按真实尺寸预览；原始用户记录见`对话记录/对话框2.md:62`。

推荐页面表述：
> 从可调整的Blender工程起步，我发现这次交付真正需要的是游戏镜头下可控的粒子运动与序列贴图。于是按舞台尺度、观看距离和Cascade制作规范，把模拟、取帧、回放、导出集中到一个2D烘焙器中。
> 重点不在更换软件，而在让预览条件、输出规格与引擎最终使用保持一致。

不要上台：Blender“界面卡”的精确归因、不同软件固定提速倍数、GPU必然更慢/更快、游戏全景无性能问题。本轮未找到A2摘要所称完整摘录L193/L669/L866/L965的同一源文件与相同行号，不能将这些原话标成已复核直接引语；上面已有足够的一手项目说明可取代。

## 4. 一个人承担的角色与协作归属

`协作/提示词/分享PPT交接_2026-10-29/交付/采访记录与需求梳理.md:43-48`已有用户采访确认：导入器由这段项目期内AI开发；导演蓝图与程序一起设计；性能组测试过PC/手游内存过高，但没有数字。`:165-166`再次确认与程序共同设计导演蓝图。

可写“我一个人对接AI，承担需求定义、美术判断、技术规则协调、资产验证、编排与交付整合”。不能写“一个人独立完成所有技术与引擎规范”；导演蓝图、性能组及客户端协作保留归属。当前项目的负责人制、总管、派活、脚本显卡后台和证据留存机制见`CLAUDE.md:9,43,65,80,87`；脚本后台不是AI代理，不要在组织图中混成有自主判断的制作人。

## 5. 建议PPT只选这些数，避免口径互相打架

- 资源结果：26种开花花型；手游覆盖12种；另6档尾缀与窜天猴组件（表内范围）。
- 量产证据：466份导出清单，累计1971次主序列PNG输出（覆盖多个版本，非独立贴图）。
- 可复用沉淀：78个正式交付修订/46个资源（交付工作区，不能与466相加）。
- 个人投入：约2200次项目提交、烘焙器约200个版本记录；口头补充角色分工即可。

页面可以省去日期；证据备注和本报告必须保留库存快照、提交号与统计范围。所有数字均为现存记录统计，不宣称历史全过程无遗漏。


## 6. 补查：烘焙器实际贡献的20组逐项映射（本轮追加）

**结论可以升级为：跨年3.0的26种资源花型中，20种找到烘焙器实际导出材料，其中19种有导出清单或带完整配方的不可变交付清单；另1种（金裂星）只有保留的旧导出包，未找到独立回执。** 这项统计按当前库存引用的主图名称反查，并结合真实配置/图像文件、配方与记录，不代表原创作者归属，也未做像素哈希一致性审计。

其中17组直接取得D盘`workspace-resource.json`中的`metadata.recipe`（完整参数）、`sourceFiles/files`（素材名单）、`metadata.bakerVersion`，并读取同修订的`cascade.json`中`source.tool`及`textures`。绿牡丹和金蕊柠另从仓库配方、导出任务和导出清单串起；金裂星保留旧包完整材料但证据级别单列。

页面推荐简写：**“20种资源花型找到烘焙器导出材料”**；在讲稿/脚注补充“19种带回执或交付修订，1种为旧导出包；按库存引用主图核对”。如页面坚持“都有导出记录”，只能写19种。

| 花型（库存名） | 当前主图示例 | 实际导出/交付记录与配方 | 证据级别 |
|---|---|---|---|
|小金花|`T_EFX_FireWorks_LittleGold_4x4_01_HD`|`D:/ProjectTextures/FireWorksLab/烟花/小/LittleGold/revisions/39b4a60d9feac1cd4b4c/workspace-resource.json`：`metadata.recipe`、`sourceFiles`，烘焙器4.9.100；同修订`PC/LittleGold/cascade.json`为实导配置。|完整配方+交付清单+素材文件|
|小银菊|`T_EFX_FireWorks_LittleSilver_GinKamuro_4x4_01_HD`|`D:/ProjectTextures/FireWorksLab/烟花/小/LittleSilver/revisions/9e45a97f443b12089b19/workspace-resource.json`：`metadata.recipe`、`sourceFiles`，烘焙器4.9.100；同修订`PC/LittleSilver/cascade.json`为实导配置。|完整配方+交付清单+素材文件|
|短爆裂|`T_EFX_FireWorks_LittleCrackle_Main_4x4_01_HD`|`D:/ProjectTextures/FireWorksLab/烟花/小/LittleCrackle/revisions/fc5a1c4f192c576415fd/workspace-resource.json`：`metadata.recipe`、`sourceFiles`，烘焙器4.9.100；同修订`PC/LittleCrackle/cascade.json`为实导配置。|完整配方+交付清单+素材文件|
|小分裂|`T_EFX_FireWorks_LittleCombo_4x4_01_HD`|`D:/ProjectTextures/FireWorksLab/烟花/小/LittleCombo/revisions/a1e1a3a5d4416a279157/workspace-resource.json`：`metadata.recipe`、`sourceFiles`，烘焙器4.9.100；同修订`PC/LittleCombo/cascade.json`为实导配置。|完整配方+交付清单+素材文件|
|短彗星|`T_EFX_FireWorks_Comet_Layers_L1_Full_16x1_01_HD`|`D:/ProjectTextures/FireWorksLab/尾缀/小/Comet_Layers/revisions/c325a9e8d33d5ff2c4e8/workspace-resource.json`：`metadata.recipe`、`sourceFiles`，烘焙器4.9.84；同修订`PC/Comet_Layers/cascade.json`为实导配置。|完整配方+交付清单+素材文件|
|短银尾|`T_EFX_FireWorks_Silver3_Layers_S_Full_16x1_01_HD`|`D:/ProjectTextures/FireWorksLab/尾缀/小/Silver3_Layers_S/revisions/603ece17457ef20d0905/workspace-resource.json`：`metadata.recipe`、`sourceFiles`，烘焙器4.9.84；同修订`PC/cascade.json`为实导配置。|完整配方+交付清单+素材文件|
|红彗星|`T_EFX_FireWorks_Comet3_GoldTail_Full_16x1_01_HD`|`D:/ProjectTextures/FireWorksLab/尾缀/小/Comet3/revisions/c35b5e54c22c90f13e93/workspace-resource.json`：`metadata.recipe`、`sourceFiles`，烘焙器4.9.111；同修订`PC/Comet3/cascade.json`为实导配置。|完整配方+交付清单+素材文件|
|银星扇|`T_EFX_FireWorks_Silver3_Layers_S_Full_16x1_01_HD`|`D:/ProjectTextures/FireWorksLab/尾缀/小/Silver3_Layers_S/revisions/603ece17457ef20d0905/workspace-resource.json`：`metadata.recipe`、`sourceFiles`，烘焙器4.9.84；同修订`PC/cascade.json`为实导配置。|完整配方+交付清单+素材文件|
|金裂星|`T_EFX_FireWorks_Combo_4x4_01`|`D:/ProjectTextures/FireWorksLab/Combo/`含PC/手游序列PNG、Ramp、Cutout、`cascade.json`（source.tool=烟花母版烘焙器4.5.0）及`Combo_组合说明.json`（name=分裂星、masterType=crossette）；同族完整存档`analysis/我的配方/my_fxmuux2arh/分裂星__fxmuux2arh.json`。未证明该存档正是旧包当次参数，未找到独立导出清单。|旧导出包；参数版本不完全闭合|
|银冠菊|`T_EFX_FireWorks_SilverChry_GinKamuro_4x4_01_HD`|`D:/ProjectTextures/FireWorksLab/烟花/小/SilverChry/revisions/d114e23e14681ce74079/workspace-resource.json`：`metadata.recipe`、`sourceFiles`，烘焙器4.9.100；同修订`PC/SilverChry/cascade.json`为实导配置。|完整配方+交付清单+素材文件|
|爆裂星|`T_EFX_FireWorks_Crackle_Main_4x4_01_HD`|`D:/ProjectTextures/FireWorksLab/烟花/小/Crackle/revisions/28daf4753656cc9ddce9/workspace-resource.json`：`metadata.recipe`、`sourceFiles`，烘焙器4.9.100；同修订`PC/Crackle/cascade.json`为实导配置。|完整配方+交付清单+素材文件|
|小青柠|`T_EFX_FireWorks_Lime_Core_4x4_01_HD`|`D:/ProjectTextures/FireWorksLab/烟花/小/Lime/revisions/e6fee84bc5f26c210e09/workspace-resource.json`：`metadata.recipe`、`sourceFiles`，烘焙器4.9.100；同修订`PC/Lime/cascade.json`为实导配置。|完整配方+交付清单+素材文件|
|橙辉星|`T_EFX_FireWorks_Glitter_4x4_01_HD`|`D:/ProjectTextures/FireWorksLab/烟花/小/Glitter/revisions/3dcf49db4b577f8c0922/workspace-resource.json`：`metadata.recipe`、`sourceFiles`，烘焙器4.9.100；同修订`PC/Glitter/cascade.json`为实导配置。|完整配方+交付清单+素材文件|
|点灭星|`T_EFX_FireWorks_Strobe_Strobe_4x4_01_HD`|`D:/ProjectTextures/FireWorksLab/烟花/小/Strobe_D90/revisions/afe5eaf200fefe56279e/workspace-resource.json`：`metadata.recipe`、`sourceFiles`，烘焙器4.9.94；同修订`PC/Strobe_D90/cascade.json`为实导配置。|完整配方+交付清单+素材文件|
|绿牡丹|`T_EFX_FireWorks_LimeStar_Head_4x4_01_HD`|`analysis/迭代/条目.json`组合QN11及QN11-1/-2完整参数；`analysis/jobs/QN11E10.json`；`analysis/results/QN11E10/导出清单.json`与`Qingning40_cascade.json`。|配方+任务+导出清单|
|金锦菊|`T_EFX_FireWorks_GoldRay_A_4x4_01_HD`|`D:/ProjectTextures/FireWorksLab/烟花/未分类/GoldRay/revisions/959ffda279a5bfca1236/workspace-resource.json`：`metadata.recipe`、`sourceFiles`，烘焙器4.9.68；同修订`PC/GoldRay/cascade.json`为实导配置。|完整配方+交付清单+素材文件|
|金曜菊|`T_EFX_FireWorks_GoldSpark_Main_4x4_01_HD`|`D:/ProjectTextures/FireWorksLab/烟花/中/GoldSpark/revisions/17d959903d5595452746/workspace-resource.json`：`metadata.recipe`、`sourceFiles`，烘焙器4.9.100；同修订`PC/GoldSpark/cascade.json`为实导配置。|完整配方+交付清单+素材文件|
|金蕊柠|`T_EFX_FireWorks_GoldCoreLime_LeadTail_4x4_01_HD`|历史配方`git show 69dc789f:analysis/原理/条目_金蕊柠.json`中的JQ2及各层；`analysis/jobs/JQ2E1.json`；`analysis/results/JQ2E1/导出清单.json`与`GoldCoreLime_cascade.json`。|历史配方+任务+导出清单|
|金芒菊|`T_EFX_FireWorks_GoldRayChry_4x4_01_HD`|`D:/ProjectTextures/FireWorksLab/烟花/大/GoldRayChry/revisions/1c2bffc44943faa251e6/workspace-resource.json`：`metadata.recipe`、`sourceFiles`，烘焙器4.9.100；同修订`PC/cascade.json`为实导配置。|完整配方+交付清单+素材文件|
|多重菊|`T_EFX_FireWorks_LimeCoreDelay_Lead_2x2_01_HD`|`D:/ProjectTextures/FireWorksLab/烟花/小/LimeCoreDelay/revisions/8110a43aa4ed204025d0/workspace-resource.json`：`metadata.recipe`、`sourceFiles`，烘焙器4.9.100；同修订`PC/LimeCoreDelay/cascade.json`为实导配置。|完整配方+交付清单+素材文件|

复核计数：20组。金芒菊、金蕊柠、多重菊的中/大型复用合为各1组；银星扇和短银尾虽然复用同一主图，按库存行所代表的美术资源分别计为2组。因此“20”是接入本次资源花型的覆盖数，不是20套完全互异的模拟核或20套全新原创素材。

未匹配的6组：金锦冠、小彗星、彩千轮、金垂柳、银彩菊、银白菊。这里“未匹配”只表示本轮没有闭合证据，不能反推必然不是烘焙器产物；其中小彗星是通用BaseTex粒子搭建，不能因其复用若干已有纹理就算入烘焙器贡献。A1草稿未匹配列表把银彩菊×2写开而漏掉小彗星，已在本次按26种名称去重口径纠正。

本轮只做证据核对，无新导出；所有D盘源项目和历史资料保持原样。