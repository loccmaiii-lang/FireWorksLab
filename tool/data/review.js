// 由 analysis/scripts/review_to_baker.py 生成：迭代区（做完、等你看的东西）。不要手改。
var FW_REVIEW = [
{
"id": "YB1F",
"task": "YB1F",
"kind": "preset",
"date": "2026-09-30 02:31",
"name": "球形B · 第 1 发 ② 开花光丝",
"note": "第 1 发开花后球外一圈很淡的细放射光丝（0.1–0.8 s）。花型库「菊」模板：几乎没有星头，只有很淡、很短的细火花；速度是星点的 1.35 倍，所以落在球外一圈。",
"look": [
"开花后 0.1–0.8 s，星点外面一圈很淡的细线",
"够不够淡、够不够细",
"「组合」页和星点层叠起来看"
],
"opinion": "这是 PC 版要做成一张序列帧的那一层。亮度先给得很低，你看着调。",
"tags": "球形B 光丝 两发 YB1F 原理",
"doc": [
[
"结构",
[
"模板：菊（没有星头，只有火花尾）",
"0.75 s 燃完、离散大 → 光丝一根根陆续消失",
"颜色：淡粉白"
]
],
[
"引擎实现（你指定的）",
[
"PC：光丝层用一张序列帧，星点层用 GPU 粒子（纯粒子发射器）",
"手游：两张单帧贴图分开（光丝一张、星点一张），靠 Size By Life / Color Over Life 做开花和变色",
"烘焙器现在两层都烘成序列帧（看效果用）；「导出成纯粒子发射器」「单帧贴图 + 曲线」两种导出排在待办 T11，效果通过后做"
]
]
],
"imagesTitle": null,
"video": "../vidio/球形B.mp4",
"vmeta": {
"v": 7,
"t0": 0.933,
"cx": 0.4854,
"cy": 0.3463,
"half": 0.06,
"aspect": 1.7778
},
"base": "kiku",
"p": {
"duration": 2.0,
"v0": 120.5,
"vt": 12.5,
"grav": 0.5,
"stars": 140,
"burn": 0.75,
"burnJit": 15,
"speedJit": 4,
"fade": 0.3,
"lastFlare": 0,
"flash": 0,
"headSize": 0.2,
"headBright": 0.08,
"flicker": 0.3,
"sparkRate": 260,
"sparkRateEnd": 0.2,
"sparkLife": 0.18,
"sparkSize": 0.2,
"sparkSpread": 0.3,
"sparkInherit": 0.35,
"sparkBright": 0.5,
"T0": 2300,
"cooling": 0.4,
"zoom": "on"
},
"m": {
"stages": [
[
0,
"#fff2f6"
]
],
"xw": 0.08,
"headInt": 0.35,
"ramp0": "#000000",
"ramp1": "#4a4a52",
"ramp2": "#c8c8d0",
"ramp3": "#ffffff"
},
"principle": true,
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "YB1",
"task": "YB1",
"kind": "preset",
"date": "2026-09-30 02:30",
"name": "球形B · 第 1 发 ① 星点（小粉牡丹 → 银）",
"note": "按你 23:10 的核对修正：第 1 发拆两层，这是星点层（花型库「牡丹」，无尾；粉 → 约 0.9 s 转银白 → 约 1.35 s 一起熄灭；大小是第 2 发的 0.45）。第 1 发和第 2 发在画面里重叠（第 1 发转银白时第 2 发正好开花），没法单独自动拟合，数值按第 2 发（QB2 / QB3）的拟合结果按比例换算。",
"look": [
"粉 → 银白的时间",
"和光丝层（YB1F）一起在「组合」页看",
"手游 / PC 的实现方式见审阅卡「引擎实现」"
],
"opinion": "第 2 发 QB3 拟合回来后，我再按它的初速、亮度同步换算这两层。",
"tags": "球形B 原理 牡丹 两发 YB1",
"doc": [
[
"你的核对（23:10）",
[
"1. 两发：是",
"2. 第 2 发开头银白短尾：是尾缀，不做",
"3. 第 1 发外面的淡光丝：要做 → 本条（星点）+ YB1F（光丝）",
"4. 配参数下任务：可以 → 第 2 发任务 QB3；第 1 发和第 2 发重叠，手配"
]
],
[
"引擎实现（你指定的）",
[
"PC：光丝层用一张序列帧，星点层用 GPU 粒子（纯粒子发射器）",
"手游：两张单帧贴图分开（光丝一张、星点一张），靠 Size By Life / Color Over Life 做开花和变色",
"烘焙器现在两层都烘成序列帧（看效果用）；「导出成纯粒子发射器」「单帧贴图 + 曲线」两种导出排在待办 T11，效果通过后做"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/球形B/t1.00.jpg",
"+0.00 s 开花白闪"
],
[
"../analysis/原理/球形B/t1.40.jpg",
"+0.40 s 粉色星点，外圈淡细光丝"
],
[
"../analysis/原理/球形B/t2.00.jpg",
"+1.00 s 已转银白（外面是第 2 发刚开）"
]
],
"video": "../vidio/球形B.mp4",
"vmeta": {
"v": 7,
"t0": 0.933,
"cx": 0.4854,
"cy": 0.3463,
"half": 0.06,
"aspect": 1.7778
},
"base": "botan",
"p": {
"duration": 2.0,
"stars": 260,
"burn": 1.35,
"burnJit": 3,
"speedJit": 2,
"fade": 0.05,
"lastFlare": 0.1,
"flash": 1.6,
"headSize": 0.45,
"flicker": 0.15,
"sparkRate": 0,
"v0": 89.3,
"vt": 10.42
},
"m": {
"stages": [
[
0,
"#ff8ac2"
],
[
0.9,
"#eef2ff"
]
],
"xw": 0.12,
"ramp0": "#000000",
"ramp1": "#4a4a52",
"ramp2": "#c8c8d0",
"ramp3": "#ffffff",
"headInt": 0.5120000000000001
},
"principle": true,
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "YB2",
"task": "YB2",
"kind": "preset",
"date": "2026-09-30 02:29",
"name": "球形B · 第 2 发原理样机（大红牡丹 → 银绿）",
"note": "按你 23:10 的核对修正：开头的银白短尾是尾缀，去掉了，开花就是红色无尾牡丹 → 约 1.05 s 转银绿白 → 1.65 s 一起熄灭。拟合任务 QB3 回来后由它取代本条。",
"look": [
"两发的判断对不对（截图 +1.00 到 +1.30 s 能看到两发重叠）",
"第 2 发的颜色时间线：银白短尾 → 红 → 银绿白",
"右栏参数、导出效果、贴图三页；「组合」页有两发叠起来的「球形B（原理样机）」"
],
"opinion": "QB1 / QB2 把它当成一颗红牡丹，QB2 对照图 30% 里「红球里的银色芯」其实是第 1 发还没灭、第 2 发已经开。按两发拆开，每发都是干净的牡丹。",
"tags": "球形B 原理 牡丹 两发 YB2",
"doc": [
[
"结构：先后两发",
[
"第 1 发（小，约为第 2 发的 0.45）：牡丹，粉 → 约 0.9 s 转银白，约 1.35 s 一起熄灭 → 条目 YB1",
"第 2 发（大，晚约 0.9 s 开）：牡丹，开头 0.3 s 银白放射短尾 → 0.35 s 转红（锶红，亮芯发粉）→ 约 1.05 s 转银绿白（0.15 s 过渡）→ 1.65 s 一起熄灭，离散很小",
"之前以为的「芯」是两发重叠，不是芯入牡丹"
]
],
[
"药剂（按颜色推测）",
[
"粉：锶系红加白光成分调淡",
"红：锶盐 + 氯供体",
"银绿白：镁铝白光，带少量钡偏绿",
"第 2 发开头的银白短尾：星外包的一层点火药 / 铝粉"
]
],
[
"进引擎",
[
"两发各一个大面片母版，Color Over Life 变色",
"可单独用，也可按 0.9 s 延时叠成一组"
]
],
[
"烘焙器还缺",
[
"第 1 发开花后外面一圈很淡的细放射光丝：牡丹模板没有这一层（可不做）"
]
],
[
"请你核对",
[
"1. 是两发（小粉 → 银 + 大红 → 银绿），不是一颗牡丹带芯？",
"2. 第 2 发开头 0.3 s 的银白短尾要保留吗？",
"3. 第 1 发外面那圈淡光丝要不要做？",
"4. 通过后按这个结构配参数，每发单独对视频拟合"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/球形B/t1.00.jpg",
"+0.00 s 第 1 发开花白闪"
],
[
"../analysis/原理/球形B/t1.40.jpg",
"+0.40 s 第 1 发粉色；外圈淡细光丝"
],
[
"../analysis/原理/球形B/t2.00.jpg",
"+1.00 s 第 1 发转银白；第 2 发刚开（银白短尾）"
],
[
"../analysis/原理/球形B/t2.30.jpg",
"+1.30 s 第 2 发转红，里面还有第 1 发"
],
[
"../analysis/原理/球形B/t2.70.jpg",
"+1.70 s 第 2 发满开红色，第 1 发已灭"
],
[
"../analysis/原理/球形B/t3.00.jpg",
"+2.00 s 红 → 银绿白过渡"
],
[
"../analysis/原理/球形B/t3.30.jpg",
"+2.30 s 银绿白"
],
[
"../analysis/原理/球形B/t3.60.jpg",
"+2.60 s 一起熄灭"
]
],
"video": "../vidio/球形B.mp4",
"vmeta": {
"v": 7,
"t0": 1.867,
"cx": 0.4865,
"cy": 0.3426,
"half": 0.1511,
"aspect": 1.7778
},
"base": "botan",
"p": {
"duration": 2.3,
"stars": 340,
"burn": 1.65,
"burnJit": 3,
"speedJit": 2,
"fade": 0.05,
"lastFlare": 0.1,
"flash": 1,
"headSize": 1.3,
"flicker": 0.15,
"sparkRate": 0,
"sparkStop": 0,
"sparkLife": 0.25,
"sparkSpread": 1.5,
"sparkInherit": 0.15,
"T0": 2450,
"cooling": 0.3,
"sparkBright": 1.2
},
"m": {
"stages": [
[
0,
"#ff3c64"
],
[
1.05,
"#e2f7ea"
]
],
"xw": 0.12
},
"principle": true,
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "JM4",
"task": "JM4",
"kind": "preset",
"date": "2026-09-30 01:50",
"name": "金芒菊 · Zoom 版（JM3 参数，准备进正式库）",
"note": "你标了「通过」的 JM3（火花按真实尺寸，比 JM1 清楚）+ Zoom 取景（引擎实测不抖）+ 原来的 8×8 格。高清化等以后用 Ultra 统一升级，这里不再做。",
"look": [
"导出效果：Zoom 放大是否平滑",
"没问题就点「通过」，我搬进正式库替换 JM1，导出素材包（T_<名>.png + cascade.json，PC + 手机）"
],
"opinion": "JM3 和 JM1 的差别只有一条：火花按真实尺寸画（JM1 按实拍镜头模糊拟合，火花偏胖），形状、颜色、时间都一样。之前迭代区 JM2E 显得特别糊，一半原因是预览被缩小了一半，已修。",
"tags": "金芒菊 Zoom JM4 正式库候选",
"doc": [
[
"和 JM1 的区别",
[
"JM1：火花尺寸按实拍镜头模糊拟合，本身偏胖",
"JM3 / 这条：火花按真实尺寸，镜头模糊只在和实拍比时加，不进贴图",
"取景：Zoom（面片中心在爆点，Size By Life 等比放大；紧凑取景已从烘焙器去掉）"
]
],
[
"以后的高清化",
[
"右栏最下面新增「画质（烘焙采样）」（从 Ultra 移植的超采样、快门采样、光点像素积分），默认和原来一样；Ultra 统一升级时再调"
]
]
],
"imagesTitle": null,
"video": "../vidio/2.0/金芒菊A.mp4",
"vmeta": {
"v": 7,
"t0": 0.867,
"cx": 0.707,
"cy": 0.25,
"half": 0.2283,
"aspect": 1.7778
},
"base": "kiku",
"p": {
"duration": 4.56,
"seed": 7,
"stars": 316.0,
"burstR0": 52,
"v0": 35,
"vt": 18,
"grav": 0.391,
"speedJit": 6,
"dirJit": 1.5,
"burn": 2.6851851851851847,
"burnJit": 12,
"fade": 0.38,
"lastFlare": 0,
"flash": 1,
"headSize": 0.45,
"headBright": 0.06090534979423868,
"flicker": 0.25,
"sparkRate": 314.6153846153846,
"sparkRateEnd": 0.35,
"sparkLife": 0.9,
"sparkSize": 0.45,
"sparkSpread": 0.4,
"sparkInherit": 0.05,
"sparkDrag": 2.99,
"sparkGrav": 0.2,
"T0": 2300,
"cooling": 0.3,
"sparkBright": 1.9500000000000002,
"twinkle": 0.6,
"subDelay": 0.9,
"subJit": 10,
"subStars": 36,
"subSpeed": 40,
"subBurn": 0.9,
"subTail": 0,
"carrierTail": 30,
"subPattern": "sphere",
"spin": 14,
"chaos": 0.8,
"beeSpeed": 28,
"shellNo": 0,
"wind": 0,
"turb": 0,
"turbScale": 60,
"massLoss": 0,
"shellVx": 0,
"shellVy": 0,
"shellSpin": 0,
"pattern": "sphere",
"tilt": 0,
"ringFrac": 0.45,
"text": "祭",
"waterRefl": 0,
"ignDelay": 0,
"ignJit": 10,
"strobeHz": 0,
"strobeDuty": 0.35,
"strobeStart": 0.4,
"glitter": 0,
"glitterDelay": 0.25,
"crackle": 0,
"crackleDelay": 0.3,
"branch": 0,
"branchAt": 0.45,
"flutter": 0,
"flutterHz": 0.7,
"riseH": 250,
"vtShell": 55,
"riseStyle": "gold",
"wobble": 0,
"wobbleHz": 1.6,
"kobanaN": 4,
"bunpoN": 3,
"trV": 43.5,
"trFps": 30,
"trInh": 0.1,
"trDrag": 3,
"trGrav": 0.3,
"trCool": 1,
"trFRate": 2600,
"trFLife": 0.6,
"trFSpread": 0.45,
"trFSize": 0.1,
"trFBright": 0.03,
"trMRate": 600,
"trMLife": 0.75,
"trMSpread": 0.8,
"trMSize": 0.14,
"trMBright": 0.05,
"trCRate": 60,
"trCLife": 0.9,
"trCSpread": 1.2,
"trCSize": 0.18,
"trCBright": 0.12,
"trWRate": 0,
"trWLife": 0.12,
"trWSpread": 14,
"trWSize": 0.06,
"trWBright": 0.06,
"trHeadSize": 0.26,
"trHeadBright": 1.2,
"trHalo": 3,
"trHaloBright": 0.15,
"trTwist": 0.35,
"trTwistN": 5,
"trWiggle": 0.08,
"trTwistLag": 0.35,
"trFollow": 0,
"trBright": 1.6,
"trExport4K": 1,
"trIgnite": 0,
"loopT": 1,
"nozzles": 1,
"fanAngle": 70,
"spacing": 6,
"shotRate": 3,
"shotSpeed": 70,
"cometBurn": 1.4,
"burstStars": 0,
"wheelR": 3,
"jetSpeed": 28,
"jetCone": 10,
"jetDir": 90,
"groundH": 0,
"shutter": 0.6,
"fpsFloor": 24,
"texW": 2048,
"texH": 2048,
"cols": 8,
"rows": 8,
"chans": 4,
"outMode": "combined",
"encGamma": 1,
"frameMode": "auto",
"zoom": "on",
"engine": "gpu",
"form": "master",
"segAt": 0,
"unitElev": 0,
"unitFlip": 0,
"cellPad": 2,
"autoGrid": 1
},
"m": {
"stages": [
[
0,
"#fff0dc"
]
],
"xw": 0.08,
"ramp0": "#000000",
"ramp1": "#8a5a30",
"ramp2": "#f2dcb0",
"ramp3": "#fffaf2",
"headInt": 1.875,
"tailInt": 1
},
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "TFS",
"task": "TFS",
"kind": "preset",
"date": "2026-09-30 00:43",
"name": "升空尾缀 · 物理 × V5 形式 小",
"note": "正式库 V5 小档的镜头和产物（弹体坐标、16×1 循环 + 消散、导出）+ 物理尾缀的粒子（对 尾缀C 校准的三层喷出物、降温、风、自转）。",
"look": [
"实时模拟：星头 → 白热段 → 金火星一颗颗散开 → 橙色零星火点",
"导出效果：上升循环接消散（和 V5 一样的播放方式）",
"右栏「尾缀序列 · 形态」第一项切 0 / 1，和 V5 原版对比"
],
"opinion": "物理质感保留，镜头换成游戏素材视角。已知要你判断的：尾迹比 V5 长、颜色偏暖、星头形状不同（见下面）。",
"tags": "尾缀 上升 物理 V5 融合 小 TFS",
"doc": [
[
"这一版改了什么",
[
"镜头和产物完全按正式库 V5：弹体随体坐标，星头固定在面片上端，16×1 格、RGBA 接力 64 帧，上升循环 + 30 / 20 fps 两个消散，Size By Life 跟着上升速度变，导出贴图、参数表和 cascade.json。",
"粒子换成物理尾缀（TPS / TPM / TPL）你认可的物理：火粉连成星头后的白热段；木炭金火星出喷口很白、约 0.3 秒降到空气中的燃烧温度（金 / 橙），快烧完才暗，寿命长短不一（对数正态）；少量落火；星头是泪滴形燃气焰。",
"空气里的运动也按物理：火星向后喷出、被空气拦住停在原地，顺风漂、冻结湍流、弹体自转带出的细碎螺旋和弹体摆动的大波浪；这些都取整数圈 / 循环，第 64 帧和第 0 帧相同（真循环）。",
"在 V5 的尾缀里加了开关「粒子模型」（右栏「尾缀序列 · 形态」第一项：0 = V5 原版，1 = 物理），同一个花型可以来回切换对比。"
]
],
[
"和 V5 正式版的差别（要你判断的）",
[
"尾迹更长：物理火星寿命中位约 2 秒（V5 是 0.5–1.1 秒），按实拍量的；想短一些就调「金火星 · 寿命中位」",
"颜色用物理尾缀按实拍校的渐变图（金橙），比 V5 偏暖；想要 V5 的颜色可以把渐变图换回来",
"星头是泪滴形燃气焰，不是 V5 的圆光点 + 光晕"
]
],
[
"请你看",
[
"1. 镜头和产物形式是不是你要的游戏素材视角（和正式库 V5 一样）",
"2. 物理质感有没有保留住",
"3. 通过后：要替换 V5 正式版，还是作为另一套（比如近景用物理版、远景用 V5）"
]
]
],
"imagesTitle": null,
"base": "trailS",
"p": {
"phWob": 0.3,
"phWobL": [
45.0,
67.0,
97.0
],
"phSpinF": 9.0,
"phSpinA": 4.5061,
"phWind": -2.0,
"phTurb": 0.22,
"phTurbL": [
6.0,
67.0
],
"phJit": 0.062,
"phFlL0": 1.8,
"phFlLv": 0.04,
"phFlW": 0.15,
"phFlI": 1.5,
"phARate": 12000,
"phAPuff": 1,
"phALife": 0.22,
"phALsig": 0.35,
"phAJet": 33,
"phACone": 1.8,
"phAKd": 18,
"phAT0": 2550,
"phATb": 2550,
"phATc": 1000.0,
"phATend": 2000,
"phAPt": 3.0,
"phAPm": 1.0,
"phAI": 0.0047339,
"phATw": 0.0,
"phAR": 0.018,
"phBRate": 2000,
"phBPuff": 2,
"phBLife": 2.2536,
"phBLsig": 1.2665,
"phBJet": 27,
"phBCone": 2.7095,
"phBKd": 12,
"phBT0": 2450,
"phBTb": 1939.4,
"phBTc": 0.29267,
"phBTend": 1350,
"phBPt": 2.0,
"phBPm": 0.446,
"phBI": 0.018517,
"phBTw": 0.35,
"phBR": 0.06,
"phCRate": 14,
"phCPuff": 1,
"phCLife": 2.2,
"phCLsig": 0.25,
"phCJet": 18,
"phCCone": 2.2,
"phCKd": 3.5,
"phCT0": 2150,
"phCTb": 2150,
"phCTc": 1000.0,
"phCTend": 1250,
"phCPt": 3.0,
"phCPm": 1.0,
"phCI": 0.8,
"phCTw": 0.25,
"phCR": 0.075,
"trPhys": 1
},
"m": {
"stages": [
[
0,
"#ffffff"
]
],
"xw": 0.08,
"headInt": 1,
"tailInt": 1,
"ramp0": "#ff821f",
"ramp1": "#ff9f3d",
"ramp2": "#ffb35a",
"ramp3": "#ffc171"
}
},
{
"id": "TFM",
"task": "TFM",
"kind": "preset",
"date": "2026-09-30 00:42",
"name": "升空尾缀 · 物理 × V5 形式 中",
"note": "正式库 V5 中档的镜头和产物（弹体坐标、16×1 循环 + 消散、导出）+ 物理尾缀的粒子（对 尾缀B 校准的三层喷出物、降温、风、自转）。",
"look": [
"实时模拟：星头 → 白热段 → 金火星一颗颗散开 → 橙色零星火点",
"导出效果：上升循环接消散（和 V5 一样的播放方式）",
"右栏「尾缀序列 · 形态」第一项切 0 / 1，和 V5 原版对比"
],
"opinion": "物理质感保留，镜头换成游戏素材视角。已知要你判断的：尾迹比 V5 长、颜色偏暖、星头形状不同（见下面）。",
"tags": "尾缀 上升 物理 V5 融合 中 TFM",
"doc": [
[
"这一版改了什么",
[
"镜头和产物完全按正式库 V5：弹体随体坐标，星头固定在面片上端，16×1 格、RGBA 接力 64 帧，上升循环 + 30 / 20 fps 两个消散，Size By Life 跟着上升速度变，导出贴图、参数表和 cascade.json。",
"粒子换成物理尾缀（TPS / TPM / TPL）你认可的物理：火粉连成星头后的白热段；木炭金火星出喷口很白、约 0.3 秒降到空气中的燃烧温度（金 / 橙），快烧完才暗，寿命长短不一（对数正态）；少量落火；星头是泪滴形燃气焰。",
"空气里的运动也按物理：火星向后喷出、被空气拦住停在原地，顺风漂、冻结湍流、弹体自转带出的细碎螺旋和弹体摆动的大波浪；这些都取整数圈 / 循环，第 64 帧和第 0 帧相同（真循环）。",
"在 V5 的尾缀里加了开关「粒子模型」（右栏「尾缀序列 · 形态」第一项：0 = V5 原版，1 = 物理），同一个花型可以来回切换对比。"
]
],
[
"和 V5 正式版的差别（要你判断的）",
[
"尾迹更长：物理火星寿命中位约 2 秒（V5 是 0.5–1.1 秒），按实拍量的；想短一些就调「金火星 · 寿命中位」",
"颜色用物理尾缀按实拍校的渐变图（金橙），比 V5 偏暖；想要 V5 的颜色可以把渐变图换回来",
"星头是泪滴形燃气焰，不是 V5 的圆光点 + 光晕"
]
],
[
"请你看",
[
"1. 镜头和产物形式是不是你要的游戏素材视角（和正式库 V5 一样）",
"2. 物理质感有没有保留住",
"3. 通过后：要替换 V5 正式版，还是作为另一套（比如近景用物理版、远景用 V5）"
]
]
],
"imagesTitle": null,
"base": "trailM",
"p": {
"phWob": 0.3,
"phWobL": [
45.0,
67.0,
97.0
],
"phSpinF": 9.0,
"phSpinA": 2.9125,
"phWind": -2.5,
"phTurb": 0.22,
"phTurbL": [
6.0,
67.0
],
"phJit": 0.062,
"phFlL0": 1.8,
"phFlLv": 0.04,
"phFlW": 0.15,
"phFlI": 1.5,
"phARate": 12000,
"phAPuff": 1,
"phALife": 0.22,
"phALsig": 0.35,
"phAJet": 33,
"phACone": 1.8,
"phAKd": 18,
"phAT0": 2550,
"phATb": 2550,
"phATc": 1000.0,
"phATend": 2000,
"phAPt": 3.0,
"phAPm": 1.0,
"phAI": 0.0075245,
"phATw": 0.0,
"phAR": 0.018,
"phBRate": 2000,
"phBPuff": 2,
"phBLife": 2.1017,
"phBLsig": 0.35661,
"phBJet": 27,
"phBCone": 1.61,
"phBKd": 12,
"phBT0": 2450,
"phBTb": 2375.4,
"phBTc": 0.43334,
"phBTend": 1350,
"phBPt": 2.0,
"phBPm": 0.446,
"phBI": 0.036333,
"phBTw": 0.35,
"phBR": 0.06,
"phCRate": 14,
"phCPuff": 1,
"phCLife": 2.2,
"phCLsig": 0.25,
"phCJet": 18,
"phCCone": 2.2,
"phCKd": 3.5,
"phCT0": 2150,
"phCTb": 2150,
"phCTc": 1000.0,
"phCTend": 1250,
"phCPt": 3.0,
"phCPm": 1.0,
"phCI": 0.8,
"phCTw": 0.25,
"phCR": 0.075,
"trPhys": 1
},
"m": {
"stages": [
[
0,
"#ffffff"
]
],
"xw": 0.08,
"headInt": 1,
"tailInt": 1,
"ramp0": "#ff821f",
"ramp1": "#ff9f3d",
"ramp2": "#ffb35a",
"ramp3": "#ffc171"
}
},
{
"id": "TFL",
"task": "TFL",
"kind": "preset",
"date": "2026-09-30 00:41",
"name": "升空尾缀 · 物理 × V5 形式 大",
"note": "正式库 V5 大档的镜头和产物（弹体坐标、16×1 循环 + 消散、导出）+ 物理尾缀的粒子（对 尾缀A 校准的三层喷出物、降温、风、自转）。",
"look": [
"实时模拟：星头 → 白热段 → 金火星一颗颗散开 → 橙色零星火点",
"导出效果：上升循环接消散（和 V5 一样的播放方式）",
"右栏「尾缀序列 · 形态」第一项切 0 / 1，和 V5 原版对比"
],
"opinion": "物理质感保留，镜头换成游戏素材视角。已知要你判断的：尾迹比 V5 长、颜色偏暖、星头形状不同（见下面）。",
"tags": "尾缀 上升 物理 V5 融合 大 TFL",
"doc": [
[
"这一版改了什么",
[
"镜头和产物完全按正式库 V5：弹体随体坐标，星头固定在面片上端，16×1 格、RGBA 接力 64 帧，上升循环 + 30 / 20 fps 两个消散，Size By Life 跟着上升速度变，导出贴图、参数表和 cascade.json。",
"粒子换成物理尾缀（TPS / TPM / TPL）你认可的物理：火粉连成星头后的白热段；木炭金火星出喷口很白、约 0.3 秒降到空气中的燃烧温度（金 / 橙），快烧完才暗，寿命长短不一（对数正态）；少量落火；星头是泪滴形燃气焰。",
"空气里的运动也按物理：火星向后喷出、被空气拦住停在原地，顺风漂、冻结湍流、弹体自转带出的细碎螺旋和弹体摆动的大波浪；这些都取整数圈 / 循环，第 64 帧和第 0 帧相同（真循环）。",
"在 V5 的尾缀里加了开关「粒子模型」（右栏「尾缀序列 · 形态」第一项：0 = V5 原版，1 = 物理），同一个花型可以来回切换对比。"
]
],
[
"和 V5 正式版的差别（要你判断的）",
[
"尾迹更长：物理火星寿命中位约 2 秒（V5 是 0.5–1.1 秒），按实拍量的；想短一些就调「金火星 · 寿命中位」",
"颜色用物理尾缀按实拍校的渐变图（金橙），比 V5 偏暖；想要 V5 的颜色可以把渐变图换回来",
"星头是泪滴形燃气焰，不是 V5 的圆光点 + 光晕"
]
],
[
"请你看",
[
"1. 镜头和产物形式是不是你要的游戏素材视角（和正式库 V5 一样）",
"2. 物理质感有没有保留住",
"3. 通过后：要替换 V5 正式版，还是作为另一套（比如近景用物理版、远景用 V5）"
]
]
],
"imagesTitle": null,
"base": "trailL",
"p": {
"phWob": 1.0,
"phWobL": [
45.0,
67.0,
97.0
],
"phSpinF": 9.0,
"phSpinA": 3.2599,
"phWind": -2.15,
"phTurb": 0.22,
"phTurbL": [
6.0,
67.0
],
"phJit": 0.062,
"phFlL0": 1.8,
"phFlLv": 0.04,
"phFlW": 0.15,
"phFlI": 1.5,
"phARate": 12000,
"phAPuff": 1,
"phALife": 0.22,
"phALsig": 0.35,
"phAJet": 33,
"phACone": 1.8,
"phAKd": 18,
"phAT0": 2550,
"phATb": 2550,
"phATc": 1000.0,
"phATend": 2000,
"phAPt": 3.0,
"phAPm": 1.0,
"phAI": 0.0046449,
"phATw": 0.0,
"phAR": 0.018,
"phBRate": 2000,
"phBPuff": 2,
"phBLife": 1.3236,
"phBLsig": 0.9035,
"phBJet": 27,
"phBCone": 3.3227,
"phBKd": 12,
"phBT0": 2450,
"phBTb": 1943.9,
"phBTc": 0.24373,
"phBTend": 1350,
"phBPt": 2.0,
"phBPm": 0.446,
"phBI": 0.048918,
"phBTw": 0.35,
"phBR": 0.06,
"phCRate": 14,
"phCPuff": 1,
"phCLife": 2.2,
"phCLsig": 0.25,
"phCJet": 18,
"phCCone": 2.2,
"phCKd": 3.5,
"phCT0": 2150,
"phCTb": 2150,
"phCTc": 1000.0,
"phCTend": 1250,
"phCPt": 3.0,
"phCPm": 1.0,
"phCI": 0.8,
"phCTw": 0.25,
"phCR": 0.075,
"trPhys": 1
},
"m": {
"stages": [
[
0,
"#ffffff"
]
],
"xw": 0.08,
"headInt": 1,
"tailInt": 1,
"ramp0": "#ff821f",
"ramp1": "#ff9f3d",
"ramp2": "#ffb35a",
"ramp3": "#ffc171"
}
},
{
"id": "YK1",
"task": "YK1",
"kind": "preset",
"date": "2026-09-30 00:40",
"name": "鸿巢四尺玉 · ① 锦冠主层（原理样机）",
"note": "原理解析（数值未拟合）：鸿巢四尺玉主体是锦冠菊（冠菊 + 钛粉）。0–1.5 s 过曝白 → 钛白金长尾，后半下垂成冠，+7.0–7.8 s 收尾。直径约 790 m。全文见 analysis/原理/鸿巢四尺玉.md。",
"look": [
"尾长、下垂的冠形对不对（截图 +4.8 到 +7.6 s）",
"颜色：白 → 白金（不是橙金）",
"「组合」页有「鸿巢四尺玉（原理样机）」：叠上 ② 红点灭"
],
"opinion": "之前计划写的「巨大菊」其实是锦冠菊：星的燃烧时间是普通菊的 2–3 倍，报道里也写的是錦冠菊。先定结构，数值等你核对后拟合（HK1）。",
"tags": "鸿巢 四尺玉 锦冠 原理 大组合 YK1",
"doc": [
[
"结构（一层星）",
[
"模板：锦冠；星数约 1200（可见），初速 260 m/s、终端速度 34 m/s → 直径约 790 m",
"颜色：0–1.5 s 过曝白 → 钛白金；尾暖金、头白",
"燃烧 7.5 s，离散小（+7.0–7.8 s 收尾），后半下垂"
]
],
[
"现实资料",
[
"鸿巢四尺玉：约 120 cm、464.8 kg（2014 吉尼斯），开花约 700 m，报道原文是「錦冠菊」",
"冠菊：氧平衡为负，木炭甩到星后继续烧 → 长尾；加钛粉 = 錦冠，颜色变亮白"
]
],
[
"烘焙器",
[
"锦冠模板现成，不缺结构",
"一朵约 8 s，导出按大礼花分两段贴图，取景固定 / Zoom"
]
],
[
"请你核对",
[
"1. 主体是锦冠菊（钛白金长尾、后段下垂）？",
"2. 末段是红色点灭（约 1/4 的星、3 次/秒），做成粒子不进序列？",
"3. 中心橙红光团当玉皮残骸 / 尾缀残火，不做？",
"4. 通过后放行 HK1 / HK2"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/鸿巢四尺玉/t3.00.jpg",
"−1.2 s 升空：白金曲导"
],
[
"../analysis/原理/鸿巢四尺玉/t4.60.jpg",
"+0.4 s 过曝白球"
],
[
"../analysis/原理/鸿巢四尺玉/t5.60.jpg",
"+1.4 s 白色放射尾满开；中心橙红是残骸"
],
[
"../analysis/原理/鸿巢四尺玉/t7.50.jpg",
"+3.3 s 白金长尾"
],
[
"../analysis/原理/鸿巢四尺玉/t9.00.jpg",
"+4.8 s 下半开始下垂"
],
[
"../analysis/原理/鸿巢四尺玉/t10.50.jpg",
"+6.3 s 冠形"
],
[
"../analysis/原理/鸿巢四尺玉/云端起点对照.jpg",
"云端起点对照（多层组合对照，数值未拟合）：上实拍、下模拟，燃烧 10/30/50/70/90%"
]
],
"video": "../vidio/鸿巢花火大会的四尺玉肉眼看到才知道有多震撼！当四尺玉缓缓升空，巨大的花火在高空炸开的瞬间，光芒从中心向四周层层扩散，一朵巨大绚烂的花，几乎铺.mp4",
"vmeta": {
"v": 7,
"t0": 4.467,
"cx": 0.5056,
"cy": 0.2914,
"half": 0.2803,
"aspect": 0.5625
},
"base": "kamuro",
"p": {
"duration": 11.5,
"stars": 800,
"v0": 260,
"vt": 34,
"burn": 7.5,
"burnJit": 5,
"fade": 0.1,
"lastFlare": 0,
"flash": 0.6,
"headSize": 1.0,
"headBright": 0.45,
"sparkRate": 450,
"sparkLife": 2.6,
"sparkSpread": 1.2,
"sparkInherit": 0.2,
"sparkDrag": 1.3,
"sparkSize": 0.35,
"T0": 2150,
"cooling": 0.33,
"massLoss": 0.3,
"sparkBright": 1.3
},
"m": {
"stages": [
[
0,
"#ffffff"
],
[
1.5,
"#fff6ea"
]
],
"xw": 0.6,
"ramp1": "#8a4a18",
"ramp2": "#ffe6c0",
"ramp3": "#ffffff"
},
"principle": true,
"thumbRef": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCACgAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDyVRTwKAKcBQaAoqQCkAqRRSAQLTwtKBUgWkMaFpwWnqtSBKAIttG2rAjpfLoGVttIVq15dNMdAiqVppFWSlMZaAKxWmEVYZajK0AQkUwipiKYRTEREVE4+U/Q1ORUbj5W+hpgPAqRRTVHNSAUAKBUgFIoqRRSGKq1Kq0ItWETikA1EqVY6kRM1OkOaVykiARmneV7VdjgJIAGSasJZSMcKjE9OlK5VjK8r2prRVv2GjXF/d/ZYEJl2sduOeATj+lQTaXcxRPLJCyohALEYHOcY9ehouKxhtHULJWlJDiqzx0xNFFlqJlq26VC60ySqwqMirDComFMCFhUbj5W+hqZhUUg+VvoaYiQCpFFNWpFFJgOUVMopiCpkHNIZJGtWo0qOJauwJnFIpIfDFxXR6V4bu57jFxbyxxoqyPxglCe34ZP4VqeEPDaXcCXlzEk9s5Kt5b/ADwkHglfQ16PZWUUFpFDFlmhU7NxzuQ9h7e3biklcHJI5aPwlBp7XkDL5rbFuLSfGDlD8y/XmuubTrVpjcRxqpba+QOvX/GmynFsCoLPanzY/Vk6EflkflU9qwFltDbvLVkz6gdD+WKpKzIcmzLfTEj1qW4tYFR1tpACoA5OAo/Q1Lf6NbXECwXCj7NbwquAMlznp+Qx/wACNbSqu8sByQMmopVPmDONifOSe7dvwH+FOwuZnininQLjSromWJUjkOVCHIU9dufUDFc1LH7V7r4h0xNQ0+TzlACgkFlyyj0Uf3if6eleSa1pzWVy0bJsyNyqWyQD2J7moehrF3RzUiVWkWtKZKpSrTEykwqJhVlxUDimSQMKikHyt9DU7CopPuN9DTEPUVKopiipFoAkUVYjFQpViPrSGizEvIrW0y2NzcxQhkQu2NznCj6msyEVu6AqHUrcSJG67xlJDhWHoTUstHqOk2M+kwxm7sREQOLyw5/77XuPwrobdllVW3KQTlJIj8pP/sp9qq2FqqW6Pawz2ox92GUOv5Hj8q0o4AMttXc33mC7SfqO9UkzJsZIgR1mXPyt8wHb1/CqzuLYnYD5TEYI6en+A/Cre08gEowHBqrJG8qSIABuHI9D6j2OKUmESzJcBHwvLE4A984H9T+FKAHwSTt9O5qu6ATGTncxyDjpxj+X8zVqMKgznGfU00waEaAN8zE5AwuOi+49/euC8ZaVC1u72QDIpy5SMsWb1aQ/59q795EPBDMPTsayNdN7Lp80NtE6h0K8bVUD3JNEkEHZnhd3HtJFZsy1uarA0FzJFJjepwcHIrHmFSjWRQkFV3FW5RVZxVEEDVDL9xvoanaoZfuN9DTESLUi9ajWpV60MCVKsRCq6VZjpDLkQrW0x/LuYn+Xhh99cj8R3rJiNXrd8MKllxPcfDuo29zar5UsbleCIomUfgDW0JCeFjc/UYri/BmsvLYKs11HGqcM8zjJPoq9f5V18brIm8Ozr/ebhfwHeqi9DKasx8gB4yv0xmnIB6fpQSBGWJ2DGckdKrLP/pBjwTwTn04pSVxIsSgFcElSeMioxGiclXYn+IjdUKNJJ5qv2bPHUDODj8s1ZAbgggn+dKKG9BPMjCkeYFJ9gp/WsbWokjs5JZ9RuI0x/GAF/MKa2HlBJjIycfdI5/LvWFra20Ns84R0QA73tpvLZfqp4/Oqewo7njuqiNbmRYW3RhvlPt+QrImHNad+ytNIVJKliQSME1mS1KNmU5arvViSq71RJAwqGb7jfQ1O9QTfcb6GmiSQVItMFSCmBIlWI6rpU6VIy1EauwtyKz4zVqJqTKR1Hhq/js9RhllVGQHneucf4fXmvZLK6juIUnLFyVDfdKhQenB6fzrwCCTBrvPDWvy/ZI7Z51BBbax/5ZjGS7epHYev4VKdglHmPRGf7TMUB/dxnk+rf/W/n9KeVCOCuMnA/wA/lWbaXcMaW9snDOQCufujPTPc+vuat3N0qEvkYVmH5YH881ZnboWYiPMf0OGH48H9RUnCEJ0z93/CqQuUSeJXIGUcE+27/wCtVfVtUiit5Iw6C6VdyIWwXI6ge/Bp6JCs7k9/ITEzqm54+WizhuPSvPPF/iCGaIx2cpk81cOSTkD0I7/Xr65qHxF4oW/8qWDzobmM4DK3DL1B9iD+n0rjrmdpXZnOSTkn1NRe5rGFtyCZs5qlKamlaqshpg2QSHmq71NIagamSRPUMv3G+hqZqhl+43+6aaESr1qRelRrUi0xIkSpkqFalWkMnQ1PG1VlNSoaRRejartndNbzJKmCUOQD0rLRqmV6TRSZ2el+JjbzG5lYmUsSFOSFAU4x+OP++a0G8QA2aQvLkJGseQclndWLH8yK4BXp6TMrqQeQeKmw00dprHijzQ8MW75fMQODzgkH+hrB1fV3v7oztkMwXdz1IABP4kZrKuJd00h6fMaiaSnYL2JJJSaru9Iz1C7UyWxrtVdzT3NRMaYiJzUTVI1RNQIjaoZfuN/umpmqGX7jf7pqhEwp4pop4oEPWpBUa1IKTGSKakU1EtPBpATq1SBqrg08GgosBqkhb96mf7wqsGxUsD/vQR2yf0pBcc7kuxPcmmlqjL0hegLis1RM1KzVExoARjUTGnMajNMkaxqJjUjVG1MCM1FL9xvoalNRS/cb6GmJlkCnAUgpwFAhwFPFNAp4FAxRUgpoFOFIY4U4Gm04cUgFFSRHBJ/2TTKBSGBNNJoam0ABNNNLnFBb2pgRtUZqRn9qiY0xDDUbVIaYaBMjNRy/cb6GpSKjk+430NMRbC08LzTgKUCgBAKcBSinCkAgFOApRTh0oGIB61IGA/hFNpaBji4P8I/Kmk0ClxUgMNJin4ppFCAZSHFOIpCKdgGEJ6n8qYQnqfyqQgUbU9aYFdgO1Rmrnlx+tBiiouKxRIzTJIz5bcj7pq+Yoqjmij8p8Z+6e/tRcLH/2Q=="
},
{
"id": "YK2",
"task": "YK2",
"kind": "preset",
"date": "2026-09-30 00:39",
"name": "鸿巢四尺玉 · ② 红点灭（原理样机）",
"note": "原理解析（数值未拟合）：锦冠尾烧完后，约 1/4 的星头变成红色点灭（约 3.3 次/秒、亮 35%），边闪边落，视频到 +10.6 s 还没灭完。用延时点火 7.4 s，初速、阻力与 ① 相同，位置接上。全文见 analysis/原理/鸿巢四尺玉.md。",
"look": [
"点灭的节奏（相邻两帧一亮一灭）",
"红点数量、分布（在冠的末端）",
"游戏里这一层做成粒子，不进序列"
],
"opinion": "点灭 3 Hz 烘进序列要每秒 12 帧以上，放进 ① 的贴图太吃帧；点灭粒子引擎里已经实测过（spec §10B）。这条先作预览，导出时走粒子参数表。",
"tags": "鸿巢 四尺玉 点灭 红 原理 大组合 YK2",
"doc": [
[
"结构",
[
"模板：点灭星 + 延时点火 7.4 s（前 7.4 s 不可见）；和 ① 同样的初速 260、终端速度 34",
"红（锶）点灭：约 3.3 次/秒，亮占空比 35%，每颗星相位随机",
"约 300 颗（每帧可见约 90 颗）；燃烧 3.6 s ± 15% 陆续灭"
]
],
[
"现实资料",
[
"点灭星：镁在暗反应 / 亮反应间循环；红点灭一个周期约 0.3 s（与视频一致）"
]
],
[
"进引擎",
[
"PC：GPU 粒子；手机：CPU 粒子、数量减半",
"不进 ① 的序列贴图"
]
],
[
"请你核对",
[
"见 YK1 的四个问题"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/鸿巢四尺玉/t11.80.jpg",
"+7.6 s 尾将尽，出现红点"
],
[
"../analysis/原理/鸿巢四尺玉/t12.30.jpg",
"+8.1 s 红点灭为主"
],
[
"../analysis/原理/鸿巢四尺玉/t12.90.jpg",
"+8.7 s 只剩红点灭"
],
[
"../analysis/原理/鸿巢四尺玉/t14.60.jpg",
"+10.4 s 视频末尾仍在闪"
]
],
"video": "../vidio/鸿巢花火大会的四尺玉肉眼看到才知道有多震撼！当四尺玉缓缓升空，巨大的花火在高空炸开的瞬间，光芒从中心向四周层层扩散，一朵巨大绚烂的花，几乎铺.mp4",
"vmeta": {
"v": 7,
"t0": 4.467,
"cx": 0.5056,
"cy": 0.2914,
"half": 0.2803,
"aspect": 0.5625
},
"base": "strobe",
"p": {
"duration": 11.5,
"stars": 300,
"v0": 260,
"vt": 34,
"burn": 3.6,
"burnJit": 15,
"ignDelay": 7.4,
"ignJit": 4,
"fade": 0,
"lastFlare": 0,
"flash": 0,
"headSize": 1.2,
"sparkRate": 0,
"strobeHz": 3.3,
"strobeDuty": 0.35,
"strobeStart": 0,
"massLoss": 0.3
},
"m": {
"stages": [
[
0,
"#ff3326"
]
],
"xw": 0.1,
"ramp0": "#000000",
"ramp1": "#4a4a52",
"ramp2": "#c8c8d0",
"ramp3": "#ffffff"
},
"principle": true,
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "YF1",
"task": "YF1",
"kind": "preset",
"date": "2026-09-30 00:38",
"name": "永丰三重蕊 · ① 外层变色菊（原理样机）",
"note": "原理解析（数值未拟合）：名字就是配方——三重蕊 = 三层芯；洋红、青绿、闪 = 外层亲星的变色顺序。外层：橙红拖尾（星头暗）0–2.2 s → 洋红 → 2.9 s 青绿白 → 4.8 s 起白色点灭（约 10 次/秒），长光丝跟着星头变色，5.5–7.8 s 陆续灭。全文见 analysis/原理/永丰三重蕊.md。",
"look": [
"四段颜色和时刻：橙红尾 → 洋红（+2.45 s 截图）→ 青绿 → 白闪",
"长光丝：整条弹道一直亮，颜色跟星头",
"「组合」页「永丰三重蕊（原理样机）」四层叠在一起"
],
"opinion": "旧组合预设「五段变色三重芯（V11）」颜色顺序和层数都不对（蓝 → 红 → 紫 → 银、两层芯）。这里按逐帧重排；外层前 2 s 星头该是暗的，现在模板只能整体压低星头亮度，见审阅卡「烘焙器还缺」。",
"tags": "永丰 三重蕊 变色 洋红 青绿 闪 原理 大组合 YF1",
"doc": [
[
"结构（外层亲星）",
[
"模板：菊 + 分层变色星 + 末段点灭；星数约 320",
"颜色：橙红 0 → 洋红 2.25 s → 青绿白 2.9 s → 白 4.8 s（点灭 10 Hz）",
"尾：0–5.0 s 一直有长光丝（火花寿命 1.6 s、几乎不减速），尾色跟着星头变"
]
],
[
"现实资料",
[
"三重芯 = 亲星 + 3 层芯（一共 4 层），亲星不算芯",
"变色星：除「引き」外再变两次以上；白点灭周期约 0.1 s"
]
],
[
"烘焙器还缺",
[
"星头亮度按段变化（外层前 2 s 星头暗、只有橙红尾）：先用低星头亮度代替",
"白闪 10 Hz 烘进序列要 40 帧/秒 → 游戏里做粒子"
]
],
[
"请你核对",
[
"1. 外层变色菊 + 三层芯（蓝 / 金黄 / 橙），外层「橙红尾 → 洋红 → 青绿 → 白闪」？",
"2. 芯 2（金黄小点）是不是一层？",
"3. 长光丝做进序列、白闪做成粒子？",
"4. 升空扭转金尾用尾缀 V5 哪档（建议中）？",
"5. 通过后放行 FS1"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/永丰三重蕊/t4.00.jpg",
"−1.75 s 升空：螺旋金尾"
],
[
"../analysis/原理/永丰三重蕊/t6.20.jpg",
"+0.45 s 外层橙红尾；芯 1 白点"
],
[
"../analysis/原理/永丰三重蕊/t7.40.jpg",
"+1.65 s 外层橙红尾 + 芯 1 蓝"
],
[
"../analysis/原理/永丰三重蕊/t8.20.jpg",
"+2.45 s 外层洋红 + 光丝"
],
[
"../analysis/原理/永丰三重蕊/t8.80.jpg",
"+3.05 s 青绿白 + 光丝"
],
[
"../analysis/原理/永丰三重蕊/t10.50.jpg",
"+4.75 s 白闪开始"
],
[
"../analysis/原理/永丰三重蕊/t11.50.jpg",
"+5.75 s 白闪陆续灭"
],
[
"../analysis/原理/永丰三重蕊/t13.30.jpg",
"+7.55 s 最后几颗"
],
[
"../analysis/原理/永丰三重蕊/云端起点对照.jpg",
"云端起点对照（多层组合对照，数值未拟合）：上实拍、下模拟，燃烧 10/30/50/70/90%"
]
],
"video": "../vidio/永丰10寸三重蕊洋红青绿闪。用独有的中式浪漫庆中秋！烟花 烟花是中式浪漫天花板吧 烟花最浪漫的一瞬间 中秋节我在小红书放了一场赛博烟花 -.mp4",
"vmeta": {
"v": 7,
"t0": 5.933,
"cx": 0.493,
"cy": 0.4573,
"half": 0.315,
"aspect": 0.5625
},
"base": "kiku",
"p": {
"duration": 9,
"stars": 320,
"v0": 140,
"vt": 20,
"grav": 0.5,
"burn": 7.5,
"burnJit": 10,
"fade": 0.05,
"lastFlare": 0,
"headSize": 0.9,
"sparkRate": 260,
"sparkStop": 5.0,
"sparkLife": 3.0,
"sparkSpread": 0.4,
"sparkInherit": 0.02,
"sparkDrag": 1.0,
"sparkSize": 0.2,
"T0": 2000,
"strobeHz": 10,
"strobeDuty": 0.35,
"strobeStart": 0.64
},
"m": {
"stages": [
[
0,
"#ff6a2a"
],
[
2.2,
"#ff3cb4"
],
[
2.9,
"#b8ffe6"
],
[
4.8,
"#f4fff4"
]
],
"xw": 0.15,
"headInt": 0.8,
"ramp0": "#000000",
"ramp1": "#4a4a52",
"ramp2": "#c8c8d0",
"ramp3": "#ffffff"
},
"principle": true,
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "YF2",
"task": "YF2",
"kind": "preset",
"date": "2026-09-30 00:37",
"name": "永丰三重蕊 · ② 芯 1 蓝（原理样机）",
"note": "原理解析（数值未拟合）：芯 1，无尾牡丹，约为外层半径 0.6。白 +0.45 s → 蓝紫 → +1.85 s 变白变淡 → 约 2.1 s 一起灭。",
"look": [
"蓝点那一圈的大小和时间（+0.85 到 +2.05 s）"
],
"opinion": "这一层最清楚，+0.85 s 截图里那圈蓝点就是它。",
"tags": "永丰 三重蕊 芯 蓝 原理 大组合 YF2",
"doc": [
[
"结构",
[
"模板：牡丹，无尾；星数约 180",
"白 → 蓝紫（0.35 s）→ 变白（1.85 s）→ 约 2.1 s 集中熄灭"
]
],
[
"请你核对",
[
"见 YF1"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/永丰三重蕊/t6.60.jpg",
"+0.85 s 芯 1 蓝"
],
[
"../analysis/原理/永丰三重蕊/t7.40.jpg",
"+1.65 s 约为外层 0.6"
],
[
"../analysis/原理/永丰三重蕊/t7.80.jpg",
"+2.05 s 变白变淡"
]
],
"video": "../vidio/永丰10寸三重蕊洋红青绿闪。用独有的中式浪漫庆中秋！烟花 烟花是中式浪漫天花板吧 烟花最浪漫的一瞬间 中秋节我在小红书放了一场赛博烟花 -.mp4",
"vmeta": {
"v": 7,
"t0": 5.933,
"cx": 0.493,
"cy": 0.4573,
"half": 0.315,
"aspect": 0.5625
},
"base": "botan",
"p": {
"duration": 3,
"stars": 180,
"v0": 90,
"vt": 20,
"grav": 0.7,
"burn": 2.1,
"burnJit": 3,
"fade": 0.05,
"lastFlare": 0,
"flash": 0,
"headSize": 0.9
},
"m": {
"stages": [
[
0,
"#f0f4ff"
],
[
0.35,
"#5a6cff"
],
[
1.85,
"#eef2ff"
]
],
"xw": 0.15,
"ramp0": "#000000",
"ramp1": "#4a4a52",
"ramp2": "#c8c8d0",
"ramp3": "#ffffff"
},
"principle": true,
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "YF3",
"task": "YF3",
"kind": "preset",
"date": "2026-09-30 00:36",
"name": "永丰三重蕊 · ③ 芯 2 金黄小点（原理样机，待核对）",
"note": "原理解析（数值未拟合，最没把握的一层）：外层变青绿时，中间出现很多金黄小点，约 +2.6–4.3 s。用延时点火 2.5 s 的小牡丹表示；也可能只是外层变色的过渡色，请你看 +3.05、+3.85 s 两张。",
"look": [
"+3.05 / +3.85 s 截图中间的金黄小点是不是一层"
],
"opinion": "如果你判断不是一层，这条删掉，FS1 改成三层。",
"tags": "永丰 三重蕊 芯 金 原理 大组合 YF3",
"doc": [
[
"结构",
[
"模板：牡丹 + 延时点火 2.5 s；星小（0.5 m）、约 150 颗",
"金黄，约 1.8 s，陆续灭"
]
],
[
"请你核对",
[
"芯 2 是不是真的一层（YF1 第 2 问）"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/永丰三重蕊/t8.80.jpg",
"+3.05 s 中间的金黄小点"
],
[
"../analysis/原理/永丰三重蕊/t9.60.jpg",
"+3.85 s 金黄小点 + 少量橙点"
]
],
"video": "../vidio/永丰10寸三重蕊洋红青绿闪。用独有的中式浪漫庆中秋！烟花 烟花是中式浪漫天花板吧 烟花最浪漫的一瞬间 中秋节我在小红书放了一场赛博烟花 -.mp4",
"vmeta": {
"v": 7,
"t0": 5.933,
"cx": 0.493,
"cy": 0.4573,
"half": 0.315,
"aspect": 0.5625
},
"base": "botan",
"p": {
"duration": 5,
"stars": 150,
"v0": 60,
"vt": 20,
"grav": 0.7,
"burn": 1.8,
"burnJit": 10,
"ignDelay": 2.5,
"ignJit": 10,
"fade": 0.1,
"lastFlare": 0,
"flash": 0,
"headSize": 0.5
},
"m": {
"stages": [
[
0,
"#ffd35a"
]
],
"xw": 0.1,
"ramp0": "#000000",
"ramp1": "#4a4a52",
"ramp2": "#c8c8d0",
"ramp3": "#ffffff"
},
"principle": true,
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "YF4",
"task": "YF4",
"kind": "preset",
"date": "2026-09-30 00:35",
"name": "永丰三重蕊 · ④ 芯 3 橙 + 银丝（原理样机）",
"note": "原理解析（数值未拟合）：芯 3，最里层，约 +3.8 s 才亮：橙色星、周围有弯曲的银色细丝，最后收成中心一小团，约 +7.6 s 灭。用延时点火 3.8 s + 短尾表示。",
"look": [
"中心橙星和银丝（+4.75、+5.75 s）"
],
"opinion": "外层白闪的时候中心还剩一团橙，就是这一层。",
"tags": "永丰 三重蕊 芯 橙 银丝 原理 大组合 YF4",
"doc": [
[
"结构",
[
"模板：牡丹 + 延时点火 3.8 s + 短银丝（火花寿命 0.8 s、散开大）；约 60 颗",
"橙，3.8 s ± 15% 陆续灭"
]
],
[
"进引擎",
[
"银丝要形状 → 小面片序列；手机单帧"
]
],
[
"请你核对",
[
"见 YF1"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/永丰三重蕊/t10.50.jpg",
"+4.75 s 中间橙星 + 银丝"
],
[
"../analysis/原理/永丰三重蕊/t11.50.jpg",
"+5.75 s"
],
[
"../analysis/原理/永丰三重蕊/t12.40.jpg",
"+6.65 s 收成中心一团"
]
],
"video": "../vidio/永丰10寸三重蕊洋红青绿闪。用独有的中式浪漫庆中秋！烟花 烟花是中式浪漫天花板吧 烟花最浪漫的一瞬间 中秋节我在小红书放了一场赛博烟花 -.mp4",
"vmeta": {
"v": 7,
"t0": 5.933,
"cx": 0.493,
"cy": 0.4573,
"half": 0.315,
"aspect": 0.5625
},
"base": "botan",
"p": {
"duration": 8.5,
"stars": 60,
"v0": 45,
"vt": 20,
"grav": 0.7,
"burn": 3.8,
"burnJit": 15,
"ignDelay": 3.8,
"ignJit": 10,
"fade": 0.1,
"lastFlare": 0,
"flash": 0,
"headSize": 1.1,
"sparkRate": 120,
"sparkLife": 0.8,
"sparkSpread": 2,
"sparkDrag": 1.5
},
"m": {
"stages": [
[
0,
"#ff8a4a"
]
],
"xw": 0.1,
"ramp1": "#5a5a66",
"ramp2": "#c8ccd8",
"ramp3": "#ffffff",
"ramp0": "#000000"
},
"principle": true,
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "YP1",
"task": "YP1",
"kind": "preset",
"date": "2026-09-30 00:34",
"name": "片贝四尺玉 · ① 亲星金菊（原理样机）",
"note": "原理解析（数值未拟合）：片贝四尺玉最先开的是金菊（亲星）：星头白 0–1.2 s → 暖金，放射尾，约 3.6 s 陆续收；直径约 620 m（金色小割会开在它外面）。视频剪辑过（+1.3–1.8 s 拉远），半径只作参考。全文见 analysis/原理/片贝四尺玉.md。",
"look": [
"金菊的颜色和时长（+0.85、+1.85 s）",
"之前以为的「多色芯」其实是 +3.4 s 才开的彩色小割",
"「组合」页「片贝四尺玉（原理样机）」"
],
"opinion": "官方名字「昇天銀竜黄金すだれ小割浮模様」逐字都能在视频里找到：银色升空、黄金菊、小割、彩色浮模様、金色垂帘。",
"tags": "片贝 四尺玉 金菊 原理 大组合 YP1",
"doc": [
[
"结构",
[
"模板：菊；星数约 400；初速 220、终端速度 40 → 直径约 620 m",
"白 → 1.2 s 暖金；燃烧 3.6 s"
]
],
[
"现实资料",
[
"正四尺玉：约 120 cm、420 kg，高约 800 m，开花约 800 m",
"片贝两晚：「昇天銀竜黄金すだれ小割浮模様」「昇天銀竜黄金千輪二段咲き」"
]
],
[
"请你核对",
[
"1. 金菊 → 彩色小割 → 金色小割 → 金色垂帘，一个大玉里三批星，不是「多色芯」？",
"2. 要第 1 天「黄金すだれ小割浮模様」（视频这发）还是第 2 天「黄金千輪二段咲き」？",
"3. 金色小割 + 垂帘整层烘大面片（不走 PW3 单元做法）？",
"4. 通过后放行 PK1"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/片贝四尺玉/t4.50.jpg",
"−1.15 s 昇天銀竜：银白升空尾"
],
[
"../analysis/原理/片贝四尺玉/t6.50.jpg",
"+0.85 s 金菊白头"
],
[
"../analysis/原理/片贝四尺玉/t7.50.jpg",
"+1.85 s 暖金（镜头已拉远）"
],
[
"../analysis/原理/片贝四尺玉/t9.00.jpg",
"+3.35 s 金菊将尽，彩色小割开始"
],
[
"../analysis/原理/片贝四尺玉/云端起点对照.jpg",
"云端起点对照（多层组合对照，数值未拟合）：上实拍、下模拟，燃烧 10/30/50/70/90%"
]
],
"video": "../vidio/片贝祭片贝花火大会四尺玉烟花秀的天花板日本旅游搭子 - 日本小灵通.mp4",
"vmeta": {
"v": 7,
"t0": 6.267,
"cx": 0.4778,
"cy": 0.2977,
"half": 0.2428,
"aspect": 0.5625
},
"base": "kiku",
"p": {
"duration": 6,
"stars": 150,
"v0": 220,
"vt": 40,
"burn": 3.6,
"burnJit": 10,
"headSize": 0.9,
"sparkRate": 320,
"sparkLife": 1.6,
"T0": 2100,
"flash": 1,
"sparkSpread": 0.8
},
"m": {
"stages": [
[
0,
"#fff6e8"
],
[
1.2,
"#ffc466"
]
],
"xw": 0.4,
"ramp1": "#8a3208",
"ramp2": "#ffc266",
"ramp3": "#fff0d2"
},
"principle": true,
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "YP2",
"task": "YP2",
"kind": "preset",
"date": "2026-09-30 00:33",
"name": "片贝四尺玉 · ② 彩色小割 · 浮模様（原理样机）",
"note": "原理解析（数值未拟合）：+3.4 s 在金菊里面开的一批彩色小牡丹（小割玉延时开），洋红、蓝紫、少量绿，每朵约 1.2 s 灭。一层只能一种颜色，组合里同一层叠两次（洋红 + 蓝紫，镜像摆放）。",
"look": [
"彩色小球出现的时刻（+3.4 s）和位置（金菊半径 0.3–0.8）",
"小割玉飞行时本该是暗的，现在是很淡的小点"
],
"opinion": "这批不是芯：芯是开花时就点着的，这批要等 3.4 s，是装在大玉里的小玉。",
"tags": "片贝 四尺玉 小割 浮模様 千轮 彩色 原理 大组合 YP2",
"doc": [
[
"结构",
[
"模板：千轮；小割玉约 40 个，延时 3.4 s（离散 6%）",
"每个开 30 颗无尾子星，子星 1.2 s",
"颜色：洋红 / 蓝紫 / 绿，每色一个发射器（同一张贴图不同 Color Over Life）"
]
],
[
"烘焙器还缺",
[
"载体（小割玉）不发光的开关：现在是 0.4 倍亮度的小点，先压低星头亮度"
]
],
[
"请你核对",
[
"见 YP1"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/片贝四尺玉/t9.40.jpg",
"+3.75 s 彩色小割满开"
],
[
"../analysis/原理/片贝四尺玉/t9.80.jpg",
"+4.15 s 彩色小割 + 第一批金色小花"
]
],
"video": "../vidio/片贝祭片贝花火大会四尺玉烟花秀的天花板日本旅游搭子 - 日本小灵通.mp4",
"vmeta": {
"v": 7,
"t0": 6.267,
"cx": 0.4778,
"cy": 0.2977,
"half": 0.2428,
"aspect": 0.5625
},
"base": "senrin",
"p": {
"duration": 6,
"stars": 40,
"v0": 80,
"vt": 45,
"burn": 1.2,
"subDelay": 3.4,
"subJit": 6,
"subStars": 30,
"subSpeed": 30,
"subBurn": 1.2,
"subTail": 0,
"carrierTail": 0,
"headSize": 0.9,
"headBright": 0.3
},
"m": {
"stages": [
[
0,
"#ff3cb4"
]
],
"xw": 0.1,
"ramp0": "#000000",
"ramp1": "#4a4a52",
"ramp2": "#c8c8d0",
"ramp3": "#ffffff"
},
"principle": true,
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "YP3",
"task": "YP3",
"kind": "preset",
"date": "2026-09-30 00:32",
"name": "片贝四尺玉 · ③ 金色小割 → すだれ垂帘（原理样机）",
"note": "原理解析（数值未拟合）：+4.3–5.9 s 陆续开的一圈金色小花（第二批小割，飞得比金菊远），每朵的星是锦冠药，烧约 5 s、边烧边垂，连成整片金色垂帘，+10–11.5 s 陆续灭。",
"look": [
"金色小花一朵接一朵开（时间差）",
"连成帘、往下垂的样子（+6.85、+8.35 s）"
],
"opinion": "默认整层烘成大面片：小花之间连成帘的形状是它的看点。PW3 的单元 × 粒子做法被否过，这里只作手机备选。",
"tags": "片贝 四尺玉 小割 千轮 すだれ 锦冠 金 原理 大组合 YP3",
"doc": [
[
"结构",
[
"模板：千轮；小割玉约 70 个，延时 5.0 s ± 12%",
"每个开 24 颗锦冠子星：子星燃烧 5 s、火花寿命 2 s、下垂",
"金色（木炭）不变色"
]
],
[
"进引擎",
[
"PC：大面片母版，10 s 分两段贴图",
"手机：单帧 + 大面片缩放，或单元 × CPU 粒子"
]
],
[
"请你核对",
[
"见 YP1"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/片贝四尺玉/t10.20.jpg",
"+4.55 s 金色小花陆续开"
],
[
"../analysis/原理/片贝四尺玉/t10.60.jpg",
"+4.95 s 连成一圈"
],
[
"../analysis/原理/片贝四尺玉/t11.60.jpg",
"+5.95 s 开始下拖"
],
[
"../analysis/原理/片贝四尺玉/t12.50.jpg",
"+6.85 s 整片垂帘"
],
[
"../analysis/原理/片贝四尺玉/t14.00.jpg",
"+8.35 s 最满"
],
[
"../analysis/原理/片贝四尺玉/t16.00.jpg",
"+10.35 s 余火"
]
],
"video": "../vidio/片贝祭片贝花火大会四尺玉烟花秀的天花板日本旅游搭子 - 日本小灵通.mp4",
"vmeta": {
"v": 7,
"t0": 6.267,
"cx": 0.4778,
"cy": 0.2977,
"half": 0.2428,
"aspect": 0.5625
},
"base": "senrin",
"p": {
"duration": 12.5,
"stars": 70,
"v0": 150,
"vt": 45,
"burn": 5,
"subDelay": 4.6,
"subJit": 12,
"subStars": 24,
"subSpeed": 18,
"subBurn": 5.0,
"subTail": 220,
"carrierTail": 0,
"sparkLife": 2.4,
"sparkDrag": 1.1,
"sparkSpread": 1.2,
"sparkInherit": 0.3,
"headSize": 0.8,
"headBright": 0.4,
"T0": 2000,
"cooling": 0.35,
"massLoss": 0.3
},
"m": {
"stages": [
[
0,
"#ffcc70"
]
],
"xw": 0.1,
"ramp1": "#8a3208",
"ramp2": "#ffc266",
"ramp3": "#fff0d2"
},
"principle": true,
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "YQ1",
"task": "YQ1",
"kind": "preset",
"date": "2026-09-29 22:50",
"name": "青柠星 · 原理样机（引菊 → 牡丹 分层星）",
"note": "原理解析（数值未拟合）：花型库「牡丹」模板 + 分层星。外层带橙色木炭尾，0.5 s 烧完；内层青柠无尾，3.1 s 前后集中熄灭；薄球壳。全文见 analysis/原理/青柠星.md。",
"look": [
"结构对不对：前 0.5 s 橙色带尾（像小菊）→ 星头变青柠、尾收掉 → 青柠无尾到熄灭",
"右栏参数、导出效果、贴图三页都能看（数值还没拟合，大小和亮度先别管）",
"下面四个「请你核对」的问题"
],
"opinion": "之前 QN1–QN4 是直接拟合，没把这是一颗分层星讲清楚，所以开头总是一团橙色实心球（火花全程在出）。这条先只定结构，你认可了我再配参数、下任务。",
"tags": "青柠星 原理 分层星 牡丹 YQ1",
"doc": [
[
"结构（一层星，一个发射器）",
[
"模板：牡丹；星是分层星（外层木炭尾 + 内层青柠）",
"开花白闪 → 橙色带长放射尾 0–0.5 s → 0.5–0.75 s 星头从外往里变青柠、橙尾收掉 → 青柠无尾，亮度不衰减",
"熄灭：+2.9 到 +3.5 s 陆续熄灭，大半在 +3.1 s 前后",
"薄球壳：星在一层球面上，投影后外圈更密更亮（之前说的「外圈更亮」就是这个）",
"中心橙红小团 + 下面的竖线是升空尾缀的残火，不算花本身，用尾缀 V5 的消散段表现"
]
],
[
"药剂（按颜色推测）",
[
"外层：木炭 + 钙 / 钠 → 橙色带尾",
"内层：钡（绿）+ 钠（黄）→ 青柠，亮芯过曝发白是相机效果",
"星后淡青绿细线：星的烟被自己的光照亮"
]
],
[
"烘焙器还缺",
[
"星后面的淡细线（烟光迹）：要加「火花停止后保留的淡尾」（比例很低、寿命长、颜色跟星）",
"薄球壳外圈亮：小的初速离散即可，不缺结构"
]
],
[
"请你核对",
[
"1. 是「引菊 → 牡丹」分层星（橙色带尾 0.5 s → 青柠无尾）？",
"2. 中心橙红小团 + 竖线当尾缀残火、不做进花里？",
"3. 星后那条淡青绿细线要不要做？",
"4. 核对通过后我按这个结构配参数、下发拟合任务"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/青柠星/t0.20.jpg",
"+0.00 s 开花白闪"
],
[
"../analysis/原理/青柠星/t0.50.jpg",
"+0.30 s 橙色放射尾（像小菊）"
],
[
"../analysis/原理/青柠星/t0.80.jpg",
"+0.60 s 外圈星头变青柠，橙尾往里收"
],
[
"../analysis/原理/青柠星/t1.00.jpg",
"+0.80 s 基本全青柠，橙尾只剩中心"
],
[
"../analysis/原理/青柠星/t1.60.jpg",
"+1.40 s 青柠星 + 淡青绿细线"
],
[
"../analysis/原理/青柠星/t2.60.jpg",
"+2.40 s 慢慢张开、亮度不变"
],
[
"../analysis/原理/青柠星/t3.20.jpg",
"+3.00 s 开始陆续熄灭"
],
[
"../analysis/原理/青柠星/t3.50.jpg",
"+3.30 s 大半已灭；中心是尾缀残火"
]
],
"video": "../vidio/2.0/青柠星.mp4",
"vmeta": {
"v": 7,
"t0": 0.267,
"cx": 0.6312,
"cy": 0.5222,
"half": 0.1517,
"aspect": 1.7778
},
"base": "botan",
"p": {
"duration": 3.8,
"stars": 300,
"burn": 3.1,
"burnJit": 6,
"speedJit": 1.5,
"fade": 0.03,
"lastFlare": 0,
"flash": 1.3,
"headSize": 1.1,
"flicker": 0.15,
"sparkRate": 320,
"sparkStop": 0.5,
"sparkLife": 0.45,
"sparkSpread": 1.2,
"sparkInherit": 0.2,
"sparkSize": 0.3,
"T0": 2150,
"cooling": 0.35,
"sparkBright": 1.2
},
"m": {
"stages": [
[
0,
"#ff6414"
],
[
0.6,
"#e6ff00"
]
],
"xw": 0.15
},
"principle": true,
"thumbRef": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCACgAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDAIpMUpor1jlExRS0VIhKDRiloAbijFOopDGU4cUUGgBKQ0pFJQAmKSlooAQ0lLRQAlFBooASilNJQBYopaSrEFJinUlSAlApcUuKAEopcUYpDEA4zSGtVtFv1shOLSXYQpLbeOTgY/Kqo0+Y5G6MP5ayKm7LPk4AA/vd8elQqkO4+V9imelNq2bKcWy3G3927lF5+YkDJ46496qmqTT2CzQlIadjikNMQlJS0UAJSUtBoASiiigCzRRjNFWIKSnUEVICUYpyjmrdhZTX1x5cETysFLFUGTgdTUykkrsaVx1hpst1FJOBiCFlEz9dgY4zjqRWuVstJvrUR2puJI5Wy8qkJcIeFwp6d6JksIrG+jsSSu+IoZ8LLjB3DHp/9asu7vLq7VZbm7eSSAhEV2JYDtj2FcfNKq/I3UVFeZbudQuri48rzFgWLJWF2OwFTnbg56nPB9ayrh5Rfsbpz5iMFYq2cY44I9KvTTwjzHlgklkuIM+ZMSCrk8uuOo47+tUJZmAWFH3QxyF03IBycZJ/IcVdKCWyCbJIJWaaAztO8EQZRs6heSQPTrz9aRHlubcWyK20OGO1RgDGM46k802SC6EiQSI6tJhkQ8Z3dCB78VECFR1PyuDwe57YrSy3RN+414v3gWJjJkcYU5/KoSOa17O/XTAzWOWuJIdjSyKP3RPXZ6HHGfrVK6tJrYRmdGTzF3ruUjIPQ1UZtuzJlGxUNJTyKbitCBKSnUhoASkpaKALIpcUtJViACgilFLipYEltE0rhUBZuwHU1040uW20aNoYvIvgxkkd5NjhP4cZxweemc1meHoXa8WRH2mLDjDbS2OcKcH5vStLUlGpzQy/bmuHlJaQMhLQKD3wOcDniuDETbmop6G9KOlygUS61G3jkvWmSTYHlCfMpI6YJ5x064rNk3+ZMoXzSc5cgkgA9a3U/0GZbieG3vbRg0ET7QNwHG7A5zz3rJRZQ80tn5vlqDuI6hTx82O1EJ/caNNshklkniiWTnyUCLx/DycfrTJnWSOJFiRDGpBZRy5JJyfzx+FXtPguJpHFqwRhG2SXCjGOevtnikFj5M4N3DMYwp3eWRluOCPbpVe1jF2LVNyV0itcW8ccVvKLhZXdSZIxnMeDwCfp6UjRrYvbz5gnZlEgi+8EOejj+lSWywEn7S0i8fuwgByffPbGaju/ISdxal3gDHYZANxHviqUnsTKCWoWa2jStJfM8alWZfLQHc3YY6AZqO8u5ryRHuppZAihNz/NgDsPb0pl7cz3dy89xjzHPOFCj8AOBUTYDblwRjJ+XgVqoa3e5i5dCNyNx25254z1xTDVi4MYVI0iAK5JkIIZ8+oPTFQVondGb0Y00lLRTEJSUtBoAtEUYpaKsQlOXk0lOXrUsDp/DAmNnqW1S1v5JMo3FRkfd6A55qKUacsEk0El1FIEVVXzF3Fz94kddtWPCt5aWlrePd20dyCqqI2kAJyecDqfw6VW1L7LcCaeGGKzEYXbA5ZmkyTyM+grzJfxWdMPhRTt7g2IePbbzLPGMk4YoOvB/hamrAscZaWURs8YaMRsG3ZPQ4PHrzTi9lCLUxxidh884YFAT/c69Pf3qWy0+41NpmsoFKoC7AdEX6mtHZa7GkCC4thFK8dvcJOoxh0BAb6A1rXQEOmI3nMZNuDEyHAGOuao2IguJ44XaK1VEIecqfnIyckevatbxA9xNoNhepJB5ZXyNsZIJ4PB9feuOunKpBeZ00anIpWOXEzrHKgIxLgOu0EkZz17c02NWkmjVdmSQAZGCqPqT2pGIcKcIu0bcBevuasSNKbQW5tFXy/3rSiM7ipA6n0/xr0Njm31ILySXUL5pI7eNHb/lnAuFGOOBTZ1gjtUjCyLdbz5hMgK4HAG0dDmm3QgIi+zmQvs/eiQAANntjtjHWg2N1EyFrYsCCwA5BC/e6HoK0VklqYtajpViS0J8+3uJJUByVcvGQfugnjp+lUa0RcWbW8z3EJkun+VACVWMYGG46+mDWaaqnezuRUtcQ0lKaStTMKQ0tJSAt0UtFWAlKOKKKkDc8KvANVi+0yMiNlSwl8vGR3bsKv6ybC48yeB7ppgQrFgXTGcD5jzgADr1rmI22nNdbFdy6vbWNr9nilCRsvk2zlW+Xo0nbAyT781wYiDjNTRvSlpY58yW0V7vjhM9uDwkxxuH/AelLC8zea8KMkecMFztQE8A1oJtufECw2cFoocmJQELRjjG4A8n1zVfTTLEL9YfIK+SwczYzjP8Of4v/r03JOOxotGQLGhtJJQ/zrIqgFhyDnkDqa2ILhZ/Dg82ATC0RlUHoCzcMfXGT+NZIjjbSzPFHKZYpNsrkjYAR8oA654NWVuWHhYxozgiQqc8qynBwPTmsK8W0rfzI3pNXfozGx3zjHBpxaZ2wjSFiu3AJJI9Pp7U99zZ+zllhkX5hIQNxUc+30pts13ApurVpEELqTIhwUY5x/Wu3fU5720GGUyW4SdTiMFYmQAYJOTu4ye9MmtZrXyzMm1ZFDqQQcqe/FSRLHLDOXWVpxhkKYxj+Ld3/KntZywWcV6mx4y+Cytnaf7rL68fSne2hG+o+bUY47S4s7OJlglcHfKQXIHY9uvORiss1c1G8+2zLIYIYSECkQrtBx3x61Uq6cbIznK7G0UppKsgbQaU0lMC5RSkUlUAlLRRUgFaWjakbCdiXlWKVCkvlYDlfQE9KzaKiUVJWY07O6Ol0+3gbR765May3BRTGUJJhG7B3ehPasw2kkNmLqSNWjm3LGd/IIIycfpzUGn6hPYSM9uwBKlTkZHIx0rTj1O3nt2sfJSGJ40VZGQFgy+p7Akkn8K5ZRnBtrVG8ZRaM2LetncYiUq+0FyuSvPY9q0dKijFpKXKSBoyGG0kKSOBnpn2/WrOoyx2NjcadYXiSxbl87piRsnBT2AxmpYrdrCx8tYJkvcK7FvmQg/Mrex4xjvXPXm5U3bqzfD2jPXsc69s7vGqKY4pQXiMzYBx156dQRUmj2kN7K8c95HaKELF3BOfYAdTz0pbmWT+0JZL4MZOZFUIMbjyPl6BT6U65t59E1CCUNC7YWeIqQykHkV2XbjZbvYwdk7sr287JHLaBYHSRs7pEyQQD0PUf/qqGK+uYbWe1jlIgnx5iYBBxyPpTtTmhuL2aa3Eojdt370gtk9cke+aq1pGCau0ZOXQSkpaStCRKSnGkoAQ9KbTqKALhFIadSVVxDaKWikAlFFFABRmkopAO3GtPS9Tv49QFzFK7zKucn5ugwOO+BWSasWMxhuAy5yQVGD61lVjeD0NKTXOr7Db2Tzbh5O7HJ+tQFiepp0pJkbcdxycn1qM1cIpRSFJ3k2BpKKKokSiiigBDSGlooASkpaQ0gL1JS0VQhppKcaTFADaKUikpDEooooAQ06MMzjZnPUY6000+3/1qj5f+BdKT2HFXaFudvmZUADAz9e9QGnsACcUw0LRDk7u4lFFFMkSiiikAlFFFACUhpaQ0AXqKKSmAGmmnU2gBKKKQ0hhSUtJQAGgYyN2ce1ITRmgAbOTnrTTTnIPIHHTPrTKACkpaSgApKKQ0ALSUhpM0ALmkzSZozSA/9k="
},
{
"id": "PW3",
"task": "PW3",
"kind": "asset",
"date": "2026-09-29",
"name": "万彩千轮 · 单元（第 3 版）",
"note": "按 PW2 并排对照改：每颗小球更密（两套点位叠加，约 120 颗星）、星点更亮（×1.25）；小球更大（半径 9 → 11.5 m，约为团半径的 0.26）、更多（24 → 30 颗）、在 0.45 秒内陆续开；颜色比例按实拍（青绿最多、珊瑚红最少）；取景和实拍一样按整团外框。",
"look": [
"和实拍比：小球大小、疏密、互相叠在一起的程度",
"颜色和变金的时间",
"右栏「贴图」切换 A（16 帧）/ B（64 帧）"
],
"opinion": "这是我按 PW2 的并排对照自己改的一版。小球数量和大小是按实拍估的，如果还是偏稀，下一版再加到 36 颗。",
"tags": "千轮 单元 粒子 PW3",
"doc": null,
"imagesTitle": null,
"video": "../vidio/2.0/万彩千轮B.mp4",
"vmeta": {
"v": 7,
"t0": 0.333,
"cx": 0.7156,
"cy": 0.35,
"half": 0.21,
"aspect": 1.7778
},
"src": "../analysis/results/PW3/preview.js",
"thumbSim": "data:image/jpeg;base64,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",
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "QA4",
"task": "QA4",
"kind": "preset",
"date": "2026-09-29",
"name": "球形A：金色带尾菊（第 4 轮，火花寿命收短）",
"note": "分层星：金色木炭尾 → 粉红 → 银白点（无尾），3.2 s 一起熄灭。这一轮把火花寿命收短，末段不再是灰雾。　差距 0.9747 → 0.6399。",
"look": [
"前 1 s 金色放射尾",
"约 50% 星头变粉红",
"70% 以后是一颗颗没有尾的银白小点",
"3.2 s 左右一起熄灭"
],
"opinion": "**画面比 QA3 像，数字反而变大**（0.37 → 0.64，别按数字判断）：70–90% 的灰雾没了，变成一颗颗清楚的银白点，和实拍一致；10–30% 金色放射尾、50% 粉红都保持。\n数字变大主要是「放射一致度 / 亮痕细长度」两项：量法把长寿命火花的连续拖影当成「更放射」，QA3 是靠灰雾凑出来的分。\n还差：燃烧 3.47 s，实拍 3.03 s（星头亮了以后熄灭判定晚了），下一轮 burn 收到 2.8 s 左右；50% 实拍是金头粉尾，模拟整颗粉（要两层发射器，形状通过后再做）。",
"tags": "QA4 菊 金 带尾 变色 球形A C2",
"doc": null,
"imagesTitle": null,
"video": "../vidio/球形A.mp4",
"vmeta": {
"v": 7,
"t0": 0.533,
"cx": 0.5057,
"cy": 0.362,
"half": 0.1722,
"aspect": 1.7778
},
"base": "kiku",
"p": {
"duration": 5.225,
"seed": 7,
"stars": 330,
"burstR0": 0,
"v0": 262.35093749999993,
"vt": 15.0,
"grav": 0.5120000000000001,
"speedJit": 3,
"dirJit": 1.5,
"burn": 3.15,
"burnJit": 2,
"fade": 0,
"lastFlare": 0,
"flash": 1,
"headSize": 0.6,
"headBright": 0.4725,
"flicker": 0.25,
"sparkRate": 965.3618,
"sparkRateEnd": 1,
"sparkLife": 0.8,
"sparkSize": 0.35,
"sparkSpread": 2.5,
"sparkInherit": 0.2,
"sparkDrag": 2.2,
"sparkGrav": 1,
"T0": 2050,
"cooling": 0.42,
"sparkBright": 3,
"twinkle": 0.6,
"subDelay": 0.9,
"subJit": 10,
"subStars": 36,
"subSpeed": 40,
"subBurn": 0.9,
"subTail": 0,
"carrierTail": 30,
"subPattern": "sphere",
"spin": 14,
"chaos": 0.8,
"beeSpeed": 28,
"shellNo": 0,
"wind": 0,
"turb": 0,
"turbScale": 60,
"massLoss": 0,
"shellVx": 0,
"shellVy": 0,
"shellSpin": 0,
"pattern": "sphere",
"tilt": 0,
"ringFrac": 0.45,
"text": "祭",
"waterRefl": 0,
"ignDelay": 0,
"ignJit": 10,
"strobeHz": 0,
"strobeDuty": 0.35,
"strobeStart": 0.4,
"glitter": 0,
"glitterDelay": 0.25,
"crackle": 0,
"crackleDelay": 0.3,
"branch": 0,
"branchAt": 0.45,
"flutter": 0,
"flutterHz": 0.7,
"riseH": 250,
"vtShell": 55,
"riseStyle": "gold",
"wobble": 0,
"wobbleHz": 1.6,
"kobanaN": 4,
"bunpoN": 3,
"trV": 43.5,
"trFps": 30,
"trInh": 0.1,
"trDrag": 3,
"trGrav": 0.3,
"trCool": 1,
"trFRate": 2600,
"trFLife": 0.6,
"trFSpread": 0.45,
"trFSize": 0.1,
"trFBright": 0.03,
"trMRate": 600,
"trMLife": 0.75,
"trMSpread": 0.8,
"trMSize": 0.14,
"trMBright": 0.05,
"trCRate": 60,
"trCLife": 0.9,
"trCSpread": 1.2,
"trCSize": 0.18,
"trCBright": 0.12,
"trWRate": 0,
"trWLife": 0.12,
"trWSpread": 14,
"trWSize": 0.06,
"trWBright": 0.06,
"trHeadSize": 0.26,
"trHeadBright": 1.2,
"trHalo": 3,
"trHaloBright": 0.15,
"trTwist": 0.35,
"trTwistN": 5,
"trWiggle": 0.08,
"trTwistLag": 0.35,
"trFollow": 0,
"trBright": 1.6,
"trExport4K": 1,
"trIgnite": 0,
"loopT": 1,
"nozzles": 1,
"fanAngle": 70,
"spacing": 6,
"shotRate": 3,
"shotSpeed": 70,
"cometBurn": 1.4,
"burstStars": 0,
"wheelR": 3,
"jetSpeed": 28,
"jetCone": 10,
"jetDir": 90,
"groundH": 0,
"shutter": 0.6,
"fpsFloor": 24,
"texW": 2048,
"texH": 2048,
"cols": 8,
"rows": 8,
"chans": 4,
"outMode": "combined",
"encGamma": 1,
"frameMode": "auto",
"zoom": "tight",
"engine": "gpu",
"form": "master",
"segAt": 0,
"unitElev": 0,
"unitFlip": 0,
"cellPad": 2,
"autoGrid": 1,
"sparkStop": 1.6
},
"m": {
"stages": [
[
0,
"#ffc040"
],
[
1.35,
"#ff86b4"
],
[
1.95,
"#fff4e6"
]
],
"xw": 0.2,
"ramp0": "#000000",
"ramp1": "#4a4a52",
"ramp2": "#c8c8d0",
"ramp3": "#ffffff",
"headInt": 3.814697265625,
"tailInt": 1
},
"thumbRef": "data:image/jpeg;base64,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",
"thumbSim": "data:image/jpeg;base64,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"
},
{
"id": "QB2",
"task": "QB2",
"kind": "preset",
"date": "2026-09-29",
"name": "球形B：红牡丹 → 银绿（第 2 轮，按配方分析）",
"note": "红（偏粉）→ 0.95 s 银绿白，1.55 s 一起熄灭，星更多更细。　差距 0.1268 → 0.094。",
"look": [
"红色是不是偏粉 / 洋红",
"约 1 s 变银绿白",
"星点数量、粗细"
],
"opinion": "差距 0.12 → 0.09，这一批最好。深红（偏洋红）→ 1 s 变银绿白、1.55 s 一起熄灭，大小和星点分布都对。\n差异：实拍 10% 中间有一颗小的粉白牡丹（第二个发射器，另做）；实拍星点略密。\n我的判断：单层 C1 牡丹可以审了——请你看一下，通过就进正式库。",
"tags": "牡丹 红 银 球形B C1 QB2",
"doc": null,
"imagesTitle": null,
"video": "../vidio/球形B.mp4",
"vmeta": {
"v": 7,
"t0": 1.867,
"cx": 0.4865,
"cy": 0.3426,
"half": 0.1511,
"aspect": 1.7778
},
"base": "botan",
"p": {
"duration": 2.99,
"seed": 7,
"stars": 337.5,
"burstR0": 0,
"v0": 198.37500000000003,
"vt": 10.416666666666668,
"grav": 0.6400000000000001,
"speedJit": 3,
"dirJit": 1.5,
"burn": 1.55,
"burnJit": 3,
"fade": 0,
"lastFlare": 0,
"flash": 1,
"headSize": 0.47337278106508873,
"headBright": 1.0,
"flicker": 0.2,
"sparkRate": 0,
"sparkRateEnd": 1.2999999999999998,
"sparkLife": 0.3,
"sparkSize": 0.35,
"sparkSpread": 2.5,
"sparkInherit": 0.2,
"sparkDrag": 2.2,
"sparkGrav": 1,
"T0": 2050,
"cooling": 0.42,
"sparkBright": 0.5917159763313609,
"twinkle": 0.6,
"subDelay": 0.9,
"subJit": 10,
"subStars": 36,
"subSpeed": 40,
"subBurn": 0.9,
"subTail": 0,
"carrierTail": 30,
"subPattern": "sphere",
"spin": 14,
"chaos": 0.8,
"beeSpeed": 28,
"shellNo": 0,
"wind": 0,
"turb": 0,
"turbScale": 60,
"massLoss": 0,
"shellVx": 0,
"shellVy": 0,
"shellSpin": 0,
"pattern": "sphere",
"tilt": 0,
"ringFrac": 0.45,
"text": "祭",
"waterRefl": 0,
"ignDelay": 0,
"ignJit": 10,
"strobeHz": 0,
"strobeDuty": 0.35,
"strobeStart": 0.4,
"glitter": 0,
"glitterDelay": 0.25,
"crackle": 0,
"crackleDelay": 0.3,
"branch": 0,
"branchAt": 0.45,
"flutter": 0,
"flutterHz": 0.7,
"riseH": 250,
"vtShell": 55,
"riseStyle": "gold",
"wobble": 0,
"wobbleHz": 1.6,
"kobanaN": 4,
"bunpoN": 3,
"trV": 43.5,
"trFps": 30,
"trInh": 0.1,
"trDrag": 3,
"trGrav": 0.3,
"trCool": 1,
"trFRate": 2600,
"trFLife": 0.6,
"trFSpread": 0.45,
"trFSize": 0.1,
"trFBright": 0.03,
"trMRate": 600,
"trMLife": 0.75,
"trMSpread": 0.8,
"trMSize": 0.14,
"trMBright": 0.05,
"trCRate": 60,
"trCLife": 0.9,
"trCSpread": 1.2,
"trCSize": 0.18,
"trCBright": 0.12,
"trWRate": 0,
"trWLife": 0.12,
"trWSpread": 14,
"trWSize": 0.06,
"trWBright": 0.06,
"trHeadSize": 0.26,
"trHeadBright": 1.2,
"trHalo": 3,
"trHaloBright": 0.15,
"trTwist": 0.35,
"trTwistN": 5,
"trWiggle": 0.08,
"trTwistLag": 0.35,
"trFollow": 0,
"trBright": 1.6,
"trExport4K": 1,
"trIgnite": 0,
"loopT": 1,
"nozzles": 1,
"fanAngle": 70,
"spacing": 6,
"shotRate": 3,
"shotSpeed": 70,
"cometBurn": 1.4,
"burstStars": 0,
"wheelR": 3,
"jetSpeed": 28,
"jetCone": 10,
"jetDir": 90,
"groundH": 0,
"shutter": 0.6,
"fpsFloor": 24,
"texW": 2048,
"texH": 2048,
"cols": 8,
"rows": 8,
"chans": 4,
"outMode": "combined",
"encGamma": 1,
"frameMode": "auto",
"zoom": "tight",
"engine": "gpu",
"form": "master",
"segAt": 0,
"unitElev": 0,
"unitFlip": 0,
"cellPad": 2,
"autoGrid": 1,
"sparkStop": 0
},
"m": {
"stages": [
[
0,
"#ff3c64"
],
[
0.95,
"#eefff0"
]
],
"xw": 0.12,
"ramp0": "#000000",
"ramp1": "#4a4a52",
"ramp2": "#c8c8d0",
"ramp3": "#ffffff",
"headInt": 0.5120000000000001,
"tailInt": 1
},
"thumbRef": "data:image/jpeg;base64,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",
"thumbSim": "data:image/jpeg;base64,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"
},
{
"id": "QC3",
"task": "QC3",
"kind": "preset",
"date": "2026-09-29",
"name": "球形C：外层 金 → 橙红（第 3 轮，燃烧时长和短尾）",
"note": "外层：开头放射短尾，金 → 1.3 s 转橙，陆续熄灭（2–4.5 s）。中间绿芯是第二层，这里没有。　差距 0.3182 → 0.2754。",
"look": [
"开头有没有放射短尾",
"1.3 s 左右转橙",
"星是不是陆续熄灭（不是一起灭）"
],
"opinion": "差距 0.81 → 0.28，燃烧 3.88 s（实拍 4.37）。时长对上以后，10%–90% 的大小、陆续熄灭、金 → 橙的变色都对了。\n还差：实拍 30% 外层是偏银白、带明显放射短尾的星；模拟 30% 是金色短毛刺，尾不够长、颜色偏金。可能是分析测的「金」是过曝芯外的晕色，下一轮试 30% 前段偏白。\n绿芯（第二层）仍未做。",
"tags": "球形C 外层 金 橙 QC3",
"doc": null,
"imagesTitle": null,
"video": "../vidio/球形C.mp4",
"vmeta": {
"v": 7,
"t0": 0.733,
"cx": 0.5266,
"cy": 0.4157,
"half": 0.1211,
"aspect": 1.7778
},
"base": "botan",
"p": {
"duration": 6.54,
"seed": 7,
"stars": 380,
"burstR0": 0,
"v0": 262.35093749999993,
"vt": 31.103999999999996,
"grav": 0.5120000000000001,
"speedJit": 3,
"dirJit": 1.5,
"burn": 3.5,
"burnJit": 20,
"fade": 0.15,
"lastFlare": 0,
"flash": 1,
"headSize": 0.6,
"headBright": 0.6,
"flicker": 0.2,
"sparkRate": 177.51479289940826,
"sparkRateEnd": 1,
"sparkLife": 0.625,
"sparkSize": 0.35,
"sparkSpread": 2.5,
"sparkInherit": 0.2,
"sparkDrag": 2.2,
"sparkGrav": 1,
"T0": 2050,
"cooling": 0.42,
"sparkBright": 0.8875739644970413,
"twinkle": 0.6,
"subDelay": 0.9,
"subJit": 10,
"subStars": 36,
"subSpeed": 40,
"subBurn": 0.9,
"subTail": 0,
"carrierTail": 30,
"subPattern": "sphere",
"spin": 14,
"chaos": 0.8,
"beeSpeed": 28,
"shellNo": 0,
"wind": 0,
"turb": 0,
"turbScale": 60,
"massLoss": 0,
"shellVx": 0,
"shellVy": 0,
"shellSpin": 0,
"pattern": "sphere",
"tilt": 0,
"ringFrac": 0.45,
"text": "祭",
"waterRefl": 0,
"ignDelay": 0,
"ignJit": 10,
"strobeHz": 0,
"strobeDuty": 0.35,
"strobeStart": 0.4,
"glitter": 0,
"glitterDelay": 0.25,
"crackle": 0,
"crackleDelay": 0.3,
"branch": 0,
"branchAt": 0.45,
"flutter": 0,
"flutterHz": 0.7,
"riseH": 250,
"vtShell": 55,
"riseStyle": "gold",
"wobble": 0,
"wobbleHz": 1.6,
"kobanaN": 4,
"bunpoN": 3,
"trV": 43.5,
"trFps": 30,
"trInh": 0.1,
"trDrag": 3,
"trGrav": 0.3,
"trCool": 1,
"trFRate": 2600,
"trFLife": 0.6,
"trFSpread": 0.45,
"trFSize": 0.1,
"trFBright": 0.03,
"trMRate": 600,
"trMLife": 0.75,
"trMSpread": 0.8,
"trMSize": 0.14,
"trMBright": 0.05,
"trCRate": 60,
"trCLife": 0.9,
"trCSpread": 1.2,
"trCSize": 0.18,
"trCBright": 0.12,
"trWRate": 0,
"trWLife": 0.12,
"trWSpread": 14,
"trWSize": 0.06,
"trWBright": 0.06,
"trHeadSize": 0.26,
"trHeadBright": 1.2,
"trHalo": 3,
"trHaloBright": 0.15,
"trTwist": 0.35,
"trTwistN": 5,
"trWiggle": 0.08,
"trTwistLag": 0.35,
"trFollow": 0,
"trBright": 1.6,
"trExport4K": 1,
"trIgnite": 0,
"loopT": 1,
"nozzles": 1,
"fanAngle": 70,
"spacing": 6,
"shotRate": 3,
"shotSpeed": 70,
"cometBurn": 1.4,
"burstStars": 0,
"wheelR": 3,
"jetSpeed": 28,
"jetCone": 10,
"jetDir": 90,
"groundH": 0,
"shutter": 0.6,
"fpsFloor": 24,
"texW": 2048,
"texH": 2048,
"cols": 8,
"rows": 8,
"chans": 4,
"outMode": "combined",
"encGamma": 1,
"frameMode": "auto",
"zoom": "tight",
"engine": "gpu",
"form": "master",
"segAt": 0,
"unitElev": 0,
"unitFlip": 0,
"cellPad": 2,
"autoGrid": 1,
"sparkStop": 1.2
},
"m": {
"stages": [
[
0,
"#ffc040"
],
[
1.3,
"#ff9a20"
]
],
"xw": 0.35,
"ramp0": "#000000",
"ramp1": "#4a4a52",
"ramp2": "#c8c8d0",
"ramp3": "#ffffff",
"headInt": 1.5625000000000002,
"tailInt": 1
},
"thumbRef": "data:image/jpeg;base64,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",
"thumbSim": "data:image/jpeg;base64,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"
},
{
"id": "QD3",
"task": "QD3",
"kind": "preset",
"date": "2026-09-29",
"name": "球形D：橙 → 柠黄 → 绿 → 银白（第 3 轮，QD1 结构 + 分析颜色）",
"note": "外层橙色带尾 → 柠黄 → 绿 → 银白（最亮），最后 1 秒变暗。　差距 0.1869 → 0.1777。",
"look": [
"四段颜色的时间",
"星点数量、粗细",
"最后变暗再熄灭"
],
"opinion": "差距 0.178，QD 做到现在最好（QD1 0.187、QD2 0.370）。橙 → 柠黄 → 绿 → 银白四段颜色、大小、时长（5.31 / 5.37 s）都对。\n还差：实拍星更多更细、后半段每颗是细短线；模拟星少（拟合停在约 180 颗，分析检出约 385）、是圆点。10% 实拍橙色放射尾更长。",
"tags": "球形D 变色 QD3",
"doc": null,
"imagesTitle": null,
"video": "../vidio/球形D.mp4",
"vmeta": {
"v": 7,
"t0": 4.533,
"cx": 0.4807,
"cy": 0.4139,
"half": 0.1767,
"aspect": 1.7778
},
"base": "botan",
"p": {
"duration": 7.85,
"seed": 7,
"stars": 176.0,
"burstR0": 0,
"v0": 172.50000000000003,
"vt": 21.599999999999998,
"grav": 1.5625,
"speedJit": 3,
"dirJit": 1.5,
"burn": 4.833,
"burnJit": 12,
"fade": 0,
"lastFlare": 0.3,
"flash": 1,
"headSize": 0.5,
"headBright": 0.30106822770542724,
"flicker": 0.2,
"sparkRate": 101.4,
"sparkRateEnd": 1.2999999999999998,
"sparkLife": 0.375,
"sparkSize": 0.35,
"sparkSpread": 2.5,
"sparkInherit": 0.2,
"sparkDrag": 2.2,
"sparkGrav": 1,
"T0": 2050,
"cooling": 0.42,
"sparkBright": 1.3,
"twinkle": 0.6,
"subDelay": 0.9,
"subJit": 10,
"subStars": 36,
"subSpeed": 40,
"subBurn": 0.9,
"subTail": 0,
"carrierTail": 30,
"subPattern": "sphere",
"spin": 14,
"chaos": 0.8,
"beeSpeed": 28,
"shellNo": 0,
"wind": 0,
"turb": 0,
"turbScale": 60,
"massLoss": 0,
"shellVx": 0,
"shellVy": 0,
"shellSpin": 0,
"pattern": "sphere",
"tilt": 0,
"ringFrac": 0.45,
"text": "祭",
"waterRefl": 0,
"ignDelay": 0,
"ignJit": 10,
"strobeHz": 0,
"strobeDuty": 0.35,
"strobeStart": 0.4,
"glitter": 0,
"glitterDelay": 0.25,
"crackle": 0,
"crackleDelay": 0.3,
"branch": 0,
"branchAt": 0.45,
"flutter": 0,
"flutterHz": 0.7,
"riseH": 250,
"vtShell": 55,
"riseStyle": "gold",
"wobble": 0,
"wobbleHz": 1.6,
"kobanaN": 4,
"bunpoN": 3,
"trV": 43.5,
"trFps": 30,
"trInh": 0.1,
"trDrag": 3,
"trGrav": 0.3,
"trCool": 1,
"trFRate": 2600,
"trFLife": 0.6,
"trFSpread": 0.45,
"trFSize": 0.1,
"trFBright": 0.03,
"trMRate": 600,
"trMLife": 0.75,
"trMSpread": 0.8,
"trMSize": 0.14,
"trMBright": 0.05,
"trCRate": 60,
"trCLife": 0.9,
"trCSpread": 1.2,
"trCSize": 0.18,
"trCBright": 0.12,
"trWRate": 0,
"trWLife": 0.12,
"trWSpread": 14,
"trWSize": 0.06,
"trWBright": 0.06,
"trHeadSize": 0.26,
"trHeadBright": 1.2,
"trHalo": 3,
"trHaloBright": 0.15,
"trTwist": 0.35,
"trTwistN": 5,
"trWiggle": 0.08,
"trTwistLag": 0.35,
"trFollow": 0,
"trBright": 1.6,
"trExport4K": 1,
"trIgnite": 0,
"loopT": 1,
"nozzles": 1,
"fanAngle": 70,
"spacing": 6,
"shotRate": 3,
"shotSpeed": 70,
"cometBurn": 1.4,
"burstStars": 0,
"wheelR": 3,
"jetSpeed": 28,
"jetCone": 10,
"jetDir": 90,
"groundH": 0,
"shutter": 0.6,
"fpsFloor": 24,
"texW": 2048,
"texH": 2048,
"cols": 8,
"rows": 8,
"chans": 4,
"outMode": "combined",
"encGamma": 1,
"frameMode": "auto",
"zoom": "tight",
"engine": "gpu",
"form": "master",
"segAt": 0,
"unitElev": 0,
"unitFlip": 0,
"cellPad": 2,
"autoGrid": 1
},
"m": {
"stages": [
[
0,
"#ff883b"
],
[
0.9,
"#f1ff93"
],
[
1.6,
"#b3ffa3"
],
[
2.6,
"#fff0ee"
]
],
"xw": 0.25,
"ramp0": "#000000",
"ramp1": "#4a4a52",
"ramp2": "#c8c8d0",
"ramp3": "#ffffff",
"headInt": 0.8000000000000002,
"tailInt": 1
},
"thumbRef": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCACgAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDzGMsTxxU+5wPmPFRMVXpzmk35UAVLJaHk+/FGVB4J+lJGjsCTgCjAJyOtADzuI44pAjZ9aAecnrVi3fByRnHtQ9CSIIQeRUyIetOlcPjA5FCljjtU3AkXCmrMaAjNRwqrEBjzVjazEIowCeTUSYXK/wB5+ATUojOPu1pQWioOlPe3yOBUOYGUVxUTLzV2SEq5BFNNviqTC5nuoqvIoq/KgBqnKpJq0wuVDQKk2YNIVxV3HcjIzSEdql2ZpSnrRcZBEE285J9KcoJPyrikEQVuSTUy7ivAI96AYyaI7c7iD6UsEPy5JG70zRIWIALDIpfKCDccnNHQQ1gc9KkjZu2cU3r90YHvUiHZnBzQwHhQ3I6+lPQEN7UiktjavNWUjdhyOaglsIPlcNV+G5j3jI6VFbWTtzjAqcWLkMVUkKMnA6CodmRc0FuI2UEGlMy9B1qtDbyJGHKnYTgNjqakKkAFlJBPBxWXKg5iOX5mzgVH97ip5cBRjAqozFScVSC5XuI+TVKSMg1fZs9etQSY2n1rSI0yltFIVGelSkcnsKjJyeKosZjFNOT1pSwDU1nA60xkSuqnjle9Suw8klS1UoiVByeDVpSNmF5HeqsMjQtj5RVmLeybXqGNyAQRkVMr7MjdhSO/UU2IcYvIG44Kmm4UkbOfXPamNJvGxB8o7nvU9tbTSsFiRmJ9BU+oiWAbmAXkngVt2NrDGX+2zBWQHMSj5s5wBnp7/hUQi+yNJbNDEVERIlaLLHvnIJx6ZpsU8eSio8cTP+82tk7ew59Kyk7kM3YHaGxcqVRpEClPLzuXP3snpTDMwTy+rtEEVV+YEE5P0NUoUk3yRRzfJjqcgPjoMetWFWZrg28R8othWIOeR/8AXFZMmxYWffbtHGArYEYX+Lnrj1zT7YoYljmRnSElnUj+I8AewrPiwEl837+Mq3OQafGsXzGZ3GRlSozz70gaHtaxTO6bvIKsxJlbt2GMdap3FpjlX3JnqB1q1bTPGWkjbMp+VRt3E57j3qaPa9m/3RzjHcGm20OK11MC5j8tNyDknvVNi2fm79q3bu1BhOwhmI4x61hTIwJGMkdcmtIO5bVmQs+Dg81HJnNIVO7GDmkdvlwRk+1a2GRO/OMUxifSnMTjI4qNskdcD3qrDI41GeakPB+XpSRjnPengL3JBqmMVPm6cU5FBJBGfcmnIhUfLhh61LsVhtAw/wDOpbEFtFG7quQCTjJ4A+tdFFFFbW/lpdlovM3OgXBOB/eHryBVHTIvKQzbSXiySuABjGM89eT0qRp7UKVWCRD0B8zcM/lWUndksgLH95JG5Qj5fLyfmU1blCyzLLggOg2LuzgDj+neklKsRM48x2+98uAPTp7VPHDJLtuHQeXwuVwvA4qG7DSuWFKFzIkUvkA8L1I/GrLwhNw4w2CCew9/ekW7LgLFgJ2RR0/xp6yLMqLHCEJ4Dbs8fQ/nWLky1BIhZDBMFikhkZs89enPH5UlyJX+YnMRw7FRhQasta71jaVwVCkHIGV9qi1CKSSFIwG2hQFT27Uc2oOMSOQboYxabt/UkcknuQewpCZI40LRqTImBkYB7Z+tPjt/Isizk7+eAM1Uje4RxKqOQowSRwBjv+FUnczcbGnJE6xiEuzJjB4wdvp64rmtThe3dgihY3JwR/Kts6lcSzqEKKBgFQudw70arDJPaOkMascgsSPmXGelEG4vUNDk32qBuJII6iq/yng8e9WpI9hw3ORnFQYJYqVI+tdaGRlDg4P0qIqR94c1I6oBnkioGb0BqkMfGQKmLqOqg/hUEfzHGQKsxmMcMhahjY6KZOgAWrHyhxz+PpVfKK3ypz24q5aSHzkcRGRlI4K5B+oqWSzSMkMsUUUqoE2/K4cuUHpj6/zpqz8GPYnlHGUJ6kDHXrUrgqciMQshZfLkQZAP971PNLGqpKptogdgPzMnJz69qxJG267ITHKw253KAmST0xn0rQjjLxiK2VDGnPT73rk9cUlnvR3lbDMVOSABtGMVKLhypW3CkbeSw9MdKyk7s1iNYMgVmZFCjadhwevHHepIDFli2TnoWB496bDIZJFZURmHVT0HHNOa5be0SBEdf7wzn6VDK1LOFaNnk+VcdvSq0t6GUpCHALcn2qKVLtJHQkjcMsu7IPp0qV0kglVpAhQKQBgn+XekkkCQiqrRhjKQdvHyE8k1WlieCSWPzCyhTny2yD7mpmKTMGZmjVudqcdPT/Cmyu0ZEoijBOUJJB3jHXHp/Wqi9QktCssyR2+6NVEhG3ABz/vZ9aZbzXe43EUYdo1+ZyMnJPBPvSRGS4mFqo2hjnBPAwOv5U+3FxLKXt7cbSCg2jqwGcjnr3rUwMK6VlkLSBkkJJ6dPwqvM7tGCxBb1FaesSXMs++93GVsHLggsOxrIm2l84IB6mto6jRCSCOvPp61E2OeKlXALbuoqBzyea1RZIh54B/Cp4xw28fTJqsjbWBqdMZznrQwZchZf4F68bjVm33RyKzbm5yRnGaqRFiCsYChedxq7GMoFD8nkkdTWUiWbBWeNjLcIyi4HmRMx3EntyeopI5CpMu0yAnBGMAk9jTLa3kkML2obYxwpDFjH2OTT2DqY0lIWEdCgBJBPX/9dYskngcwukh2YOcr1x9amAUKm5N3y55bA5zzxVbjzVMS8DHDcg1oRQKQZEBZsDdkfxe341EjSD6EO/5lKhjn0G3H/wBanzhjccAZTIG0ggfj3pzBHRpHmdmZj8pH6n9ajXzCRM5IQcKQOCR2qNGXfsJIH3hVZd2OzYDU8uDa4mjcOjZLZ4HtSysFkVkYENkuQcGhoMwNLJwoG0/Py3akO41EBmglEBEfVTFnJwec+v1qreQW5zKXPmMdwTGM8/pVsTnbGWaRo0bAY9FGeh9apXA8yEzSSKnPEarkj/AVUdyZOyILqK4in85nyzMFDBs84HcexqMw6g7yJEkoEcgJVQcq3T8DQYjlHQliWIAUHpj1/pTjaXpLSRM8hLgM6PwW+ufet0YmdqJu/tLf2h5iS4BxIDn261lvI2GAUAE81duJTn5mZ8Hkms+RiewwfetYopEMv3qhNSPnvUZrUocKkVqiFPFAy9DJ8m1ANx7mrVoVHJbOPvGstXIGB3qwk21Qo/E1nJEs6CwcTSCF5GjhH3VUbmY+w6CrQUxTuXZXCMUCEfrg1i28phjAB+ZiCM1tpPBJavdm3K5O3MfCFvX19eKxkrEtFsBU+aLGARhXGS35U6ESGRxGTuwWbPAGKq24EhWVMF0A3qzcde1T7JHJcbgqAttU7QR/hWbBO2xZDQOGP+2uMN90dzSSoseAc4DnegPXnA4qEAswiWOORpOQUP45p3IuNrI3mcAFgfl9/TFZ8tmXzC3BDzK8GFi3fKGGfrxTZ43VmeTays2d7HHfPQdOKeiMZFiV3KIxO4HpxjOaZqDmVliyHjQZAxwP8TRZ3sDkraBO3nqsNv5zsxywI7kDH/6zVaZbgyM8y5jyULMfvNj+layEWlk0gA3SgFUzk8cGs/8A0s+UUUt54Lhcjnae/p0qovsZuVypDkbI4zIJIyzsQ3Cjjke9UrnzLabzFEiORujcrt3qe4q5OZ5zdXCW2SrAttOVUE9+9Zl5cSS7VdXbYuEDEkIPQe1bR1EjMkbLEgcd+arSL15z6ValY5OeT7dapuc9q3RaImyKYacxphrQoUGnA0wU4GkMeDUimogaepoYi3G+SSTya1LS/eH7kaEbSoDjIGRjP1rFRsDI61ahkHUHLep7VnKImdLatLJDJOWCrJkBIwOAME5HYdMUpjkZS0s4CR8AZB7ZA/z0rEtbghiQzdDuYnjFaltewx2uZkMsjvzk8BewX3rBxaIZfswZg4QjK8lmfH4CpYAGkMQC4I5Y/wAOT+tQ2U8MthL5zRIIQCBg7yM8gEcfnVq3bbbi5gCfOGZUYj92P4efX0qGJjoW+Vl3chcZ69O1MZow3lJHgZB9SPxqKIrIU2kiRfndicKozx+NR+aZZy8cwWY7slyFA6d6VhErfZ5JGMchjQLn5sknHt6+1VyjCNp0mXy1BDrvwy/h361DcXowMxqWDHd83+sb69vpVKe8UyGVUAV8DaD/AFq1FhYW7cyYaCdiFULtYDj24rLldg+OAf8AZp8wwzPDJx3B7fX0qs8u/O8YbpmtYopIjmkJ9fxqu5B6U9zyc81ATWyLSGtTaVutNNUMUGjNNpQaBjwacpqMGlBoAm3VKj8gA4Heq2acDSsI0BL/AAgAKOlT+YWxGDggZJ9Kzkc9fTkVYSTauT1Pf3qGiTRW4BK26jEapkj19qnluiRGoJxuBbHt0rIgkMe525Jq7BGrxOZXxuPB/Cs5RSFYuJeSJanbIwEhAcA43DmomuMvIrHhhwff/wDVVW4byoyh+oNV1l+ZM98Z/KhRCxakk3CRSepyPYioTKGRsj/eA9fWoWk+RvVTg1E0mHDeo5qlEaRI8m3BByDxn1FQO3bt703dgEZ4NRMccVaQ7DnbNRk0hNNJqhgaaTQaKYCUuabS0hi0tJRTAeDTgajBpc0ASqxFSq+/CmqwNKrc0hFstubaB0q1HMWdVJGM1QR8n0NTRH94CByOaloTLV1KQ5XA4GMVTeTk44IPan3koaQHGDjnHeqpPAoitAJWbgn1NMLZUc1Hu7ZpC1VYY4tTSc0hOe1PjXP1oAY3HWm5qZoieahII60wEopKQ0xn/9k=",
"thumbSim": "data:image/jpeg;base64,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"
},
{
"id": "QN4",
"task": "QN4",
"kind": "preset",
"date": "2026-09-29",
"name": "青柠星（第 4 轮，按配方分析重设）",
"note": "按实拍逐帧分析重设：外层橙色带尾（0.6 s）→ 内层青柠无尾，亮度不衰减、3.1 s 集中熄灭，薄球壳。　差距 0.5475 → 0.4627。",
"look": [
"开头 0–0.6 s：是不是一根根橙色放射短尾（不是一团橙色）",
"0.6 s 变青柠、尾巴消失",
"中后段星点亮、边缘一圈更密",
"3.1 s 左右一起熄灭"
],
"opinion": "差距 0.45 → 0.46（和 QN3 口径相同），结构对了：开头橙红带尾的外层 → 0.6 s 后青柠色无尾星点，燃烧 3.44 s（实拍 3.3）。\n还差：实拍球壳外圈一圈更亮更密，模拟分布均匀——现在的参数做不出来（试过星数 250–480、离散 10%，差距都没变好），要在烘焙器加「星在球壳上的分布 / 外圈加亮」这个结构。这一轮先不出 QN5，等云端加参数。",
"tags": "青柠 分层星 变色 QN4",
"doc": null,
"imagesTitle": null,
"video": "../vidio/2.0/青柠星.mp4",
"vmeta": {
"v": 7,
"t0": 0.267,
"cx": 0.6312,
"cy": 0.5222,
"half": 0.1517,
"aspect": 1.7778
},
"base": "botan",
"p": {
"duration": 5.119999999999999,
"seed": 7,
"stars": 360,
"burstR0": 0,
"v0": 161.0,
"vt": 15.500000000000002,
"grav": 0.625,
"speedJit": 2,
"dirJit": 1.5,
"burn": 3.13,
"burnJit": 4,
"fade": 0,
"lastFlare": 0,
"flash": 0.6,
"headSize": 0.8,
"headBright": 3.6905625000000004,
"flicker": 0.1,
"sparkRate": 500.0,
"sparkRateEnd": 1,
"sparkLife": 0.2,
"sparkSize": 0.25,
"sparkSpread": 0.81,
"sparkInherit": 0.6,
"sparkDrag": 4,
"sparkGrav": 1,
"T0": 2050,
"cooling": 0.42,
"sparkBright": 0.3550295857988165,
"twinkle": 0.6,
"subDelay": 0.9,
"subJit": 10,
"subStars": 36,
"subSpeed": 40,
"subBurn": 0.9,
"subTail": 0,
"carrierTail": 30,
"subPattern": "sphere",
"spin": 14,
"chaos": 0.8,
"beeSpeed": 28,
"shellNo": 0,
"wind": 0,
"turb": 0,
"turbScale": 60,
"massLoss": 0,
"shellVx": 0,
"shellVy": 0,
"shellSpin": 0,
"pattern": "sphere",
"tilt": 0,
"ringFrac": 0.45,
"text": "祭",
"waterRefl": 0,
"ignDelay": 0,
"ignJit": 10,
"strobeHz": 0,
"strobeDuty": 0.35,
"strobeStart": 0.4,
"glitter": 0,
"glitterDelay": 0.25,
"crackle": 0,
"crackleDelay": 0.3,
"branch": 0,
"branchAt": 0.45,
"flutter": 0,
"flutterHz": 0.7,
"riseH": 250,
"vtShell": 55,
"riseStyle": "gold",
"wobble": 0,
"wobbleHz": 1.6,
"kobanaN": 4,
"bunpoN": 3,
"loopT": 1,
"nozzles": 1,
"fanAngle": 70,
"spacing": 6,
"shotRate": 3,
"shotSpeed": 70,
"cometBurn": 1.4,
"burstStars": 0,
"wheelR": 3,
"jetSpeed": 28,
"jetCone": 10,
"jetDir": 90,
"groundH": 0,
"shutter": 0.6,
"fpsFloor": 24,
"texW": 2048,
"texH": 2048,
"cols": 8,
"rows": 8,
"chans": 4,
"outMode": "combined",
"encGamma": 1,
"frameMode": "auto",
"zoom": "tight",
"engine": "gpu",
"form": "master",
"segAt": 0,
"unitElev": 0,
"unitFlip": 0,
"cellPad": 2,
"autoGrid": 1,
"sparkStop": 0.6
},
"m": {
"stages": [
[
0,
"#ff6414"
],
[
0.62,
"#f0ff90"
]
],
"xw": 0.15,
"ramp0": "#000000",
"ramp1": "#4a4a52",
"ramp2": "#c8c8d0",
"ramp3": "#ffffff",
"headInt": 0.32768000000000014,
"tailInt": 1
},
"thumbRef": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCACgAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDBopaK9M5BMUlOpKAExSjijFOAA+tJgNoAyetLS44pALG21weeDVq+lWXYSCSB61UUZIpSc9TWbim0ykyNgKbipGptaIQw0lPYelNpgNopTSUCEopaSgBKSlooAs0UtFMAxRRinBc0ANpQpp2PSl29hSYCBR3oIzUirkYHXNPSJnYKik5PHvWbkBEifKx9BUeDW0mi3r+TEsDh5QSNwwO/c9OlVm0u5TyCIw/nY27Du5OcA46HjpUKrHuVysziMqPWmVcubWW0naG4Ta6MVYe9VWGDg1rGSYDCKaRTyKaRTEMopSKKYhuKKWkoASkpaKALeKKWjFMAApcYFFOUc0mAKMEetSKhI470gGPrW1oWmveTn5A4QAlN4UsM8hc96xqTUVdjSu7C6dobzwxTySpHA8hj3dSGx3A55rWhMNldzxQaUS0UIZhK3zRMuMtmi9kWFILeyWSOeKdyqY+ZB2Ge5461kmUzahEVklmec7ZlHBJJ5APfNcF5VLt7G6SiXpL++ngnmiut8jKVdGb5lUc5H1yRxz1rHtrie3QxxNPHdeaNiqcc4x09eatXkpTNs6tGbdm8sKo37s8Bj36VUia7vXn/AHgLnM0hkIBJXnqe/PStIQSW2gNk4vTapbJLG4mjdg5kAIC7hwoPQ5B5qLUdPyklzMWjmdmcRMoPy5x1HfrVZY9sQuDMjMJOI25J75+lWVlto7iW5khllRj+7PCDd1JI6Y9qq3K7xFo9zJntpYNvmxsgYZXcMZHrUDCui1A3er28+pXUmVjIQALwPQD0Fc+wxwa6aU+Za7mbViMim1Iaaa1IY2kpaQ0wEpKdSUAXKMUuKMUwFpyDNNqWMYNSxFiytnurmOCIbndgoHqTXXahbW9tYW9pNOkU0HzPEoyZGP8AtDoccc1keF7dTLLdSEBYF3BjggN2JU9R9KtGS0luRI8QURR5lRpSBK3+zxx16e1ebXk5Tt2N6asrkbJCLm6+0RTRqIz5QlY7oz1GfWs1xcLaecsiCKOY7QGG4Me/rjitNpJYbXz4Gee3kwsySKdu7spOecDmsmaGP7OJUmUuzENFg5UeuenNFPzKZITcwlNQOCRICGLAkt1+tV7N4ZLwy328xFiz7DgnvxV+yt7SSKHM585mOVKZUcDH15qO8jMMH2c/ZsBjIHQfM2e309qftY83J1KVKTjz9CC2W2lbZOHCDcUMaZdmxwPpUkf2u5spJGiDWdvxt6IhPGR78VJev9nha2+xwRu0aNvD5YADqDnvnkVRWC7NnJOofyEcBsZ25PSrS5tSHoOurmCfZHbwi3TaoZnkJGQOT+NU711nKssLIwHzsSSXPr7VKoL/ALg7fnIKuz4VM96sJNdNZtb27eZJMxWQIxZ3UYwCPTjg1qrR2JeqMYimkU9xzTTXSjIYaSnUhFMBtFLSUAXaKXFFMAFSLTBxTlpMR1HhOKR474wxyySeQQEj75I60/Ury4eBo7q2CSuwJcxqvygYGOM1X8NSzYlt7YyJLKOJI9xYAc4wPXip9Rd1SS2dTM+5Ss0qkOuOqjPbNeVUX713OiHwlMxvJdKlvDOsLqGKZySvcj8jRHNab3hW082Ms3llmw/PAyR6elPlGo30rsqtutoQGA+Xag46VWRrVbI48w3m/jpt2/41droZc02zDXsUDJslDEMrnjPp7VX1SLz7z/R9jHLHyY8gIB9am066W3a3iuIEIklV2dwclenX071Dr0Dx3cl0IUjhkkPlqOMgd8dce9ZRi/b3b6GvN+6su5nxRPeXQjhhUs5O1N2APxJpJ5FWBIo/NU8+aC+VY54wKcpgmeWSVhCdu5FReCf7vtVi3kjQXaWdwBG0WMToCz9MgdcHPeupuxj0Gw3dvYBmtJZZJ2UoC0ahQD7HPbNS2ELwQo5sGlmuD/o5SRg3HXgdjVONbMK6XUdwkwU42kYLZ4yD04rT0qG58+c2LNFbtE4Wa4TOxBySCOh9x61E7JDic1OjJIyspUg4IPaoTU85JcktuJPX1qE13R2MGNNIaU0hqhDaSnHrSGgC/RS0lMAFKKSlFJiNLSL6SyuUljwSOoOcEehrqLj7QkEZtb/7RIVWXKEbYVHqTyME1xCNg11Og3aSwyK8avNBETAAABnOSzHvj3rgxVP7SNacraFKe3P2m6867UyqCdwYt5p9Af8AGonggGnJKrjz95V03c47HGOBWhbRy29hPqLLFIkxaHa4yckZ3D0qg7Mul7SYdrTZxj9506/Soi2zQL1X+02cVzE0RVUU4O4kev5HpT/EInn1CSJVd1tYwOf4VHc+nWorx4XFk8AzIEAkUZyWB9fcelTajGXmWR1MZVN8qF8My56c9Tg1O04t+ZpFXhL5GTOsCzIschaPC7mCYI9eParCw2h8kwNJPIzMGhxtOP4cH1PpUUkoaWMCICJMhARyRnPJ71ZuI4l1CJ1hksoJMMuSW2+49RXQ30MkN3FvtEd9aPNdDJaRpCrKAOc569vypLwSrpNq41ESpllFuHOYvw96vLe2VtrE4ugtxZzKQzKhJ5HVd3Oc1z07L5jCMkpk4z6UqcXJik7aEDnJphp5phrtRkxKQ0ppKBCGmkU6kNAF+iloxTASiiihgKDUschXoahpRUNXA6S11RLy0Npet85KiKUnATHHPtireoWC6i6Pp7GZUfySQgUAKODx145JrkQ2Ks2t9PbSB4JXjb1U4rklh2neLNFPSzNi9hiiv7WO23QMoAeUNlSwOC6n0qxeQ/ZpJnvojdywYwd+VK+p74IIrJsdXltrlZnHnMkbIgc5C5B6fTNWbrVUbTogtvEJipQuBxtxjp6981hOnNSiaxmrMiuoZm0+AlXYRguoXBVEY8ZxyDnPWp9SmjvtDtrhrjfdQHynV3wQv8IUdx15rKt9SubWKaKCUqky7JAP4hVJnzXQqLvr0M3MmvbyW6MfnEfu41jXAx8o6VUNKTSGumKSVkRuIaYacaQ1QhpooNFMBKSlNJQBoUUUUxCUlONNpAFFFJQAtFJRmkMM1LnNuecYOfrUBNSM2YV5HBPFS0UiImkopM1RIGkNBpuTQAGkoNJQAhooNFABSGjNNNAzSPWkopCaBWAmkopM0DCjNBppNAhTSZpCaTNAxTRn5TimmlGcE84pAJmkNBppNMBaQ0hpDSAD1oJopKQATTTS0hFACE0maWkpgaWKQ0c0lFxhSUUhoADSE0hppNIBxNNJpNwpC1AC5NISaTdSFqQASaKQmk3UxDqSmk0ZNADqTNNyaTmgBc0hNJSUgHZpKSjNMD//2Q==",
"thumbSim": "data:image/jpeg;base64,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"
},
{
"id": "FS1",
"task": "FS1",
"kind": "queued",
"date": "2026-09-30",
"name": "永丰三重蕊（FS1：外层 + 三层芯）",
"note": "【先不跑：等原理核对：analysis/原理/永丰三重蕊.md 的「请你核对」。你回复「原理 OK」后由云端去掉 hold 放行】四层一起对整段视频。跑完每层一条，组合页有整组。",
"look": [
"外层四段颜色的时刻",
"芯 1 蓝圈的大小（约外层 0.6）",
"末段白闪、中心橙"
],
"opinion": "",
"tags": "永丰 三重蕊 芯 组合 大组合 FS1",
"doc": null,
"imagesTitle": null,
"video": "../vidio/永丰10寸三重蕊洋红青绿闪。用独有的中式浪漫庆中秋！烟花 烟花是中式浪漫天花板吧 烟花最浪漫的一瞬间 中秋节我在小红书放了一场赛博烟花 -.mp4",
"vmeta": {
"v": 7,
"t0": 5.933,
"cx": 0.493,
"cy": 0.4573,
"half": 0.315,
"aspect": 0.5625
}
},
{
"id": "HK1",
"task": "HK1",
"kind": "queued",
"date": "2026-09-30",
"name": "鸿巢四尺玉 · ① 锦冠主层（HK1 拟合）",
"note": "【先不跑：等原理核对：analysis/原理/鸿巢四尺玉.md 的「请你核对」。你回复「原理 OK」后由云端去掉 hold 放行】锦冠主层按实拍拟合：初速、终端速度、重力、星数、星头、火花、亮度、相机模糊 / 曝光。结构按原理 YK1 定死（锦冠、7.5 s、钛白金）。",
"look": [
"尾长、下垂的冠形",
"白 → 白金的颜色",
"燃烧到 +7.5 s 收尾"
],
"opinion": "单层基准；两层叠起来的效果看 HK2。",
"tags": "鸿巢 四尺玉 锦冠 大组合 HK1",
"doc": null,
"imagesTitle": null,
"video": "../vidio/鸿巢花火大会的四尺玉肉眼看到才知道有多震撼！当四尺玉缓缓升空，巨大的花火在高空炸开的瞬间，光芒从中心向四周层层扩散，一朵巨大绚烂的花，几乎铺.mp4",
"vmeta": {
"v": 7,
"t0": 4.467,
"cx": 0.5056,
"cy": 0.2914,
"half": 0.2803,
"aspect": 0.5625
}
},
{
"id": "HK2",
"task": "HK2",
"kind": "queued",
"date": "2026-09-30",
"name": "鸿巢四尺玉（HK2：锦冠 + 红点灭）",
"note": "【先不跑：等原理核对：analysis/原理/鸿巢四尺玉.md 的「请你核对」。你回复「原理 OK」后由云端去掉 hold 放行】两层一起对整段视频（含红点灭）。跑完每层一条，组合页有整组。",
"look": [
"整段节奏：锦冠 7.5 s → 红点灭",
"红点数量、亮度"
],
"opinion": "",
"tags": "鸿巢 四尺玉 锦冠 点灭 组合 大组合 HK2",
"doc": null,
"imagesTitle": null,
"video": "../vidio/鸿巢花火大会的四尺玉肉眼看到才知道有多震撼！当四尺玉缓缓升空，巨大的花火在高空炸开的瞬间，光芒从中心向四周层层扩散，一朵巨大绚烂的花，几乎铺.mp4",
"vmeta": {
"v": 7,
"t0": 4.467,
"cx": 0.5056,
"cy": 0.2914,
"half": 0.2803,
"aspect": 0.5625
}
},
{
"id": "PK1",
"task": "PK1",
"kind": "queued",
"date": "2026-09-30",
"name": "片贝四尺玉（PK1：金菊 + 小割 + 垂帘）",
"note": "【先不跑：等原理核对：analysis/原理/片贝四尺玉.md 的「请你核对」。你回复「原理 OK」后由云端去掉 hold 放行】三层一起对整段视频。跑完每层一条，组合页有整组。",
"look": [
"金菊 → +3.4 s 彩色小割 → +4.3 s 起金色小花 → 垂帘",
"垂帘的长度和持续时间"
],
"opinion": "",
"tags": "片贝 四尺玉 小割 千轮 すだれ 组合 大组合 PK1",
"doc": null,
"imagesTitle": null,
"video": "../vidio/片贝祭片贝花火大会四尺玉烟花秀的天花板日本旅游搭子 - 日本小灵通.mp4",
"vmeta": {
"v": 7,
"t0": 6.267,
"cx": 0.4778,
"cy": 0.2977,
"half": 0.2428,
"aspect": 0.5625
}
},
{
"id": "QB3",
"task": "QB3",
"kind": "queued",
"date": "2026-09-30",
"name": "球形B · 第 2 发（大红牡丹 → 银绿，第 3 轮）",
"note": "合并 YB2（原理）和 QB2（旧结果），开头不再有银白短尾。",
"look": [
"开花就是红色星点（没有银白短尾）",
"约 1.05 s 转银绿白",
"1.65 s 一起熄灭"
],
"opinion": "和 QB4（第 1 发）在「组合」页叠起来就是整个球形B。",
"tags": "球形B 牡丹 两发 QB3",
"doc": null,
"imagesTitle": null,
"video": "../vidio/球形B.mp4",
"vmeta": {
"v": 7,
"t0": 1.867,
"cx": 0.4865,
"cy": 0.3426,
"half": 0.1511,
"aspect": 1.7778
}
},
{
"id": "QN5",
"task": "QN5",
"kind": "queued",
"date": "2026-09-30",
"name": "青柠星（第 5 轮，按核对后的原理）",
"note": "YQ1 原理样机 + QN4 的实测速度，按你核对的结构拟合亮度、大小、星数。",
"look": [
"0–0.5 s：一根根橙色放射尾（不是一团橙色）",
"0.5 s 起星头变青柠、尾巴收掉",
"3.1 s 前后一起熄灭；外圈星更密"
],
"opinion": "合并了 YQ1（原理）和 QN4（旧结果）。",
"tags": "青柠 分层星 QN5 原理",
"doc": null,
"imagesTitle": null,
"video": "../vidio/2.0/青柠星.mp4",
"vmeta": {
"v": 7,
"t0": 0.267,
"cx": 0.6312,
"cy": 0.5222,
"half": 0.1517,
"aspect": 1.7778
}
}
];
var FW_VMETA = {"../vidio/2.0/尾缀A.mp4": {"t0": 0.033, "cx": 0.6406, "cy": 0.5, "half": 0.5, "aspect": 1.7778, "v": 7}, "../vidio/2.0/尾缀B.mp4": {"t0": 0.667, "cx": 0.7393, "cy": 0.5, "half": 0.5, "aspect": 1.7778, "v": 7}, "../vidio/2.0/尾缀C.mp4": {"t0": 0, "cx": 0.6498, "cy": 0.5, "half": 0.5, "aspect": 1.7778, "v": 7}, "../vidio/2.0/金芒菊A.mp4": {"v": 7, "t0": 0.867, "cx": 0.707, "cy": 0.25, "half": 0.2283, "aspect": 1.7778}};
var FW_REVIEW_COMBOS = [{"name": "球形B（两发 + 光丝）", "layers": [{"m": "rep:YB1", "scale": 1}, {"m": "rep:YB1F", "scale": 1}, {"m": "rep:YB2", "scale": 1, "delay": 0.9}]}, {"name": "鸿巢四尺玉（原理样机：锦冠 + 红点灭）", "layers": [{"m": "rep:YK1", "scale": 1}, {"m": "rep:YK2", "scale": 1}]}, {"name": "永丰三重蕊（原理样机：外层 + 三层芯）", "layers": [{"m": "rep:YF1", "scale": 1}, {"m": "rep:YF2", "scale": 1}, {"m": "rep:YF3", "scale": 1}, {"m": "rep:YF4", "scale": 1}]}, {"name": "片贝四尺玉（原理样机：金菊 + 小割 + 垂帘）", "layers": [{"m": "rep:YP1", "scale": 1}, {"m": "rep:YP2", "scale": 1}, {"m": "rep:YP2", "scale": 1, "mirror": true, "stages": [[0, "#7a6cff"]]}, {"m": "rep:YP3", "scale": 1}]}];
