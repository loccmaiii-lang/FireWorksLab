#!/usr/bin/env python3
"""参数名称表 4.3 修订（对话框15，2026-10-03；依据 analysis/命名/需求重梳_2026-10-03.md + 用户在「烘焙器参数命名」页的审阅意见）

第一版只改「空中礼花」106 行和「烘焙输出」48 行。4.3（对话框15，2026-10-04，用户「直接出 4.3」）：
  · 清理清单 A6 定了（升空尾缀一个入口，RT4 的循环层 + 粒子、物理尾缀、地面的参数节都还在）→ 其余 206 行也按词汇表改词、模块名改词，
    tier 先一律 core（不藏东西；以后按用户意见再分「更多」）；
  · 去掉 3.7 画法的参数行（segAt / expoMode / expoQ / qKernel / qCore，清理清单 C1）；
  · 加「爆裂范围 / 爆裂速度」两行（用户 10-03 审阅页选择题选「加」）；
  · 说明里不再出现「旧名 / 原名 / 旧显示名」（4.3 只剩新名字）。

做了什么：
  1. 模块：按 Cascade 发射器从上到下（模块表.json）；每行加 tier：core = 打开就看得到，more = 模块里「更多」点开才有；
     随机类（××随机）仍挂在本体参数的「随机」按钮下（4.2.19 已做）。
  2. 英文：Cascade 有的用 Cascade；用户审阅定的规则「不随时间变的用 Initial 开头，随寿命变的用 … Over Life」；随机一律「… Random」。
  3. 中文：用词汇表（词汇表.json）里的词，≤ 6 字为宜。
  4. 说明：词汇统一；把用户问过的六处写清楚（终端速度和 Drag、星重力和火花重力、余烬是什么、爆裂有没有范围、前段压暗、火花闪烁的英文）。
可以重复跑：以 git 里的上一版为底，按 OVR 覆盖、按 VOCAB 替换。
用法：python3 analysis/命名/改表_4.3.py   → 改写 参数名称表.json / .csv，生成 词汇表.json、模块表.json
"""
import csv, json, pathlib, re

HERE = pathlib.Path(__file__).resolve().parent
TAB = HERE / '参数名称表.json'

# 模块（stage = 面板里的大段；open = 默认展开）
MODULES = [
    # cn, en, stage, open, 放什么
    ('发射器', 'Emitter', '发射', True, '号数、序列时长、随机种子'),
    ('生成', 'Spawn', '发射', True, '星数（一次爆发）、点火延迟、只让一部分星发光'),
    ('寿命', 'Lifetime', '发射', True, '星的寿命、第二段'),
    ('形状', 'Initial Location', '发射', True, '开花图案、起始半径、倾斜、环上比例、文字、水面倒影'),
    ('初速', 'Initial Velocity', '发射', True, '初速、方向随机、玉体的速度和自旋'),
    ('阻力重力', 'Drag & Gravity', '运动', True, '终端速度（阻力）、重力、燃烧减质量、风、湍流'),
    ('星头', 'Head', '外观', True, '星头大小、亮度、渐隐、开花闪光、熄灭前闪亮、闪烁、前段压暗、泪滴'),
    ('火花', 'Sparkler (Child Emitter)', '外观', True, '星喷出的火花：生成率、寿命、继承速度、阻力、重力、大小、温度、亮度'),
    ('尾迹外形', 'Trail Shape', '外观', False, '火花连成的尾迹：粗细、收尖、亮肩、线间底光、扩散'),
    ('烟花特性', 'Firework FX', '外观', False, '点灭、辉星、爆裂、松叶分叉、飘落、余烬（默认关，开了才展开）'),
    ('子花', 'Sub Burst', '外观', True, '千轮 / 分裂：子弹飞多久、子花多少星、多大、子星寿命和火花'),
    ('蜂', 'Bee Motion', '外观', True, '蜂：旋转、乱飞、推进（只在蜂）'),
    ('入点出点', 'Cut In / Out', '渲染输出', False, '序列从第几秒开始、到第几秒结束、入点之前怎么办'),
    ('帧与贴图', 'Frames & Texture', '渲染输出', False, '贴图尺寸、格子、通道、帧数和帧率、取景、分段'),
    ('曝光光晕', 'Exposure & Halo', '渲染输出', False, '固定曝光、光晕、预览光晕'),
    ('画质', 'Quality', '渲染输出', False, '超采样、快门采样、像素覆盖（烘焙用，不改样子的参数）'),
]

VOCAB = [   # 用, 不用, 英文, 说明
    ('星 / 星头', '炭头、光点（画面里的点）', 'Star / Head', '开花抛出去的每一颗叫「星」，星正在燃烧的那个亮点叫「星头」'),
    ('火花', '火星、火粉、尾巴', 'Sparkler', '星烧的时候不断喷出、留在身后的小颗粒；一串火花连起来就是尾迹'),
    ('尾迹', '尾巴、尾缀（「升空尾缀」这个品类名除外）', 'Trail', '火花在星身后连成的那条线的样子'),
    ('余烬', '光丝、长尾', 'Ember', '另一批更暗、留得更久的火花（锦冠的木炭暗线、被照亮的烟迹）。不是烟雾粒子'),
    ('子花 / 子星 / 子弹', '小割、小花、小割玉', 'Sub Burst / Sub Star / Carrier', '千轮 / 分裂：主花抛出「子弹」，子弹飞一段开成「子花」，子花里的每颗叫「子星」'),
    ('寿命', '燃烧时间', 'Burning Lifetime（星）/ Sparkler Lifetime（火花）', '从点着到熄灭的秒数'),
    ('随机', '离散、抖动、Jit', 'Random', '每颗（或每粒）各自偏多少；都折叠在本体参数的「随机」按钮下'),
    ('开花', '爆开、炸开', 'Burst', '割药把星抛出去的那一下'),
    ('点火', '延时、引き', 'Ignition', '星什么时候开始烧（可以比开花晚）'),
    ('光点（只指导出方案）', '—', 'GPU Dots', '「PC 用 GPU 光点代替序列」这个导出方案的名字；画面里的点一律叫星头 / 火花'),
]

RULES = [
    '英文：Cascade 有的用 Cascade 的叫法（Spawn Burst、Initial Lifetime、Initial Velocity、Drag、Inherit Parent Velocity、Flare）；Cascade 没有、Niagara 有的用 Niagara（Curl Noise 的 Noise Strength、Gravity Scale）；都没有的（烟花特有）自己起，说明里写「烟花特有」。',
    '你的规则：不随时间变的用 Initial 开头（Initial Size、Initial Brightness）；随寿命变的用 … Over Life（Fade Out Over Life、Cooling Over Life）。',
    '随机一律「… Random」，中文「××随机」，都折叠在本体参数旁的「随机」里。',
    '星头、火花两个模块的英文带前缀，一眼分得开（用户 10-03 23:30）：星头 Head …（Head Size、Head Flicker），火花 Sparkler …（Sparkler Lifetime、Sparkler Delay）；星本身的寿命叫 Burning Lifetime。中文名带「星头 / 火花」前缀。',
    '中文 ≤ 6 字，只用词汇表里的词。说明三句：现实里是什么 / 调大调小画面怎样 / UE 里对应什么。',
]

C, M = 'core', 'more'
# key → (模块, tier, 英文, 中文)；None = 不改这一项
OVR = {
    # 发射器 Required
    'shellNo': ('发射器', C, 'Shell Size', '号数'), 'duration': ('发射器', C, 'Emitter Duration', '序列时长'), 'seed': ('发射器', C, 'Random Seed', '随机种子'),
    # 生成 Spawn
    'stars': ('生成', C, 'Spawn Burst', '星数'), 'ignDelay': ('生成', C, 'Ignition Delay', '点火延迟'),
    'ignJit': ('生成', M, 'Ignition Delay Random', '点火延迟随机'), 'ignSeed': ('生成', M, 'Ignition Random Seed', '点火随机种子'),
    'keepFrac': ('生成', M, 'Lit Star Fraction', '发光星比例'),
    # 寿命 Lifetime
    'burn': ('寿命', C, 'Burning Lifetime', '寿命'), 'burnJit': ('寿命', M, 'Burning Lifetime Random', '寿命随机'),
    'afterBurn': ('寿命', M, 'Second Stage Lifetime', '第二段寿命'), 'afterJit': ('寿命', M, 'Second Stage Lifetime Random', '第二段随机'),
    # 形状 Initial Location
    'pattern': ('形状', C, 'Location Shape', '开花图案'), 'burstR0': ('形状', C, 'Start Radius', '起始半径'),
    'ringFrac': ('形状', C, 'Ring Fraction', '环上星比例'), 'text': ('形状', C, 'Pattern Text', '文字'),
    'tilt': ('形状', M, 'Shape Rotation', '倾斜'), 'waterRefl': ('形状', M, 'Water Reflection', '水面倒影'),
    # 初速 Initial Velocity
    'v0': ('初速', C, 'Initial Velocity', '初速'), 'speedJit': ('初速', M, 'Initial Velocity Random', '初速随机'),
    'dirJit': ('初速', M, 'Direction Random', '方向随机'), 'shellVx': ('初速', M, 'Inherit Shell Velocity X', '玉体水平速度'),
    'shellVy': ('初速', M, 'Inherit Shell Velocity Z', '玉体竖直速度'), 'shellSpin': ('初速', M, 'Shell Spin', '玉体自旋'),
    # 阻力重力 Drag & Gravity
    'vt': ('阻力重力', C, 'Terminal Velocity (Drag)', '终端速度'), 'grav': ('阻力重力', C, 'Gravity Scale', '重力倍率'),
    'massLoss': ('阻力重力', M, 'Burn Mass Loss', '燃烧减质量'), 'wind': ('阻力重力', M, 'Wind', '风速'),
    'turb': ('阻力重力', M, 'Noise Strength', '湍流强度'), 'turbScale': ('阻力重力', M, 'Noise Scale', '湍流尺度'),
    # 星头 Head
    'headSize': ('星头', C, 'Head Size', '星头大小'), 'headBright': ('星头', C, 'Head Brightness', '星头亮度'),
    'fade': ('星头', C, 'Head Fade Out Over Life', '渐隐比例'), 'flash': ('星头', C, 'Flare', '开花闪光'),
    'flicker': ('星头', M, 'Head Flicker', '星头闪烁'), 'lastFlare': ('星头', M, 'Burnout Flare', '熄灭前闪亮'),
    'headDim': ('星头', M, 'Head Early Brightness', '前段亮度'), 'headDimUntil': ('星头', M, 'Head Early Stage End', '前段结束'),
    'headTear': ('星头', M, 'Head Teardrop', '泪滴星头'),
    # 火花 Spark (Child Emitter)
    'sparkRate': ('火花', C, 'Sparkler Spawn Rate', '火花生成率'), 'sparkLife': ('火花', C, 'Sparkler Lifetime', '火花寿命'),
    'sparkInherit': ('火花', C, 'Sparkler Inherit Velocity', '继承速度'), 'sparkSize': ('火花', C, 'Sparkler Size', '火花大小'),
    'sparkBright': ('火花', C, 'Sparkler Brightness', '火花亮度'), 'sparkDrag': ('火花', C, 'Sparkler Drag', '火花阻力'),
    'sparkGrav': ('火花', M, 'Sparkler Gravity Scale', '火花重力'), 'sparkRateEnd': ('火花', M, 'Sparkler Spawn Rate Over Life', '末段生成率'),
    'sparkLifeEnd': ('火花', M, 'Sparkler Lifetime Over Life', '末段火花寿命'), 'sparkStart': ('火花', M, 'Sparkler Delay', '火花开始时刻'),
    'sparkStop': ('火花', M, 'Sparkler Stop Time', '火花停止时刻'), 'sparkRamp': ('火花', M, 'Sparkler Ramp-In', '火花起势'),
    'sparkRampJit': ('火花', M, 'Sparkler Ramp-In Random', '起势随机'), 'sparkLifeJit': ('火花', M, 'Sparkler Lifetime Random', '火花寿命随机'),
    'sparkSpread': ('火花', M, 'Sparkler Velocity Random', '火花速度随机'), 'tailJit': ('火花', M, 'Sparkler Size Random', '火花大小随机'),
    'starBright': ('火花', M, 'Sparkler Brightness Random (Per Star)', '每星亮度随机'), 'twinkle': ('火花', M, 'Sparkler Flicker', '火花闪烁'),
    'T0': ('火花', M, 'Sparkler Temperature', '火花温度'), 'cooling': ('火花', M, 'Sparkler Cooling Over Life', '火花冷却'),
    'sparkRise': ('火花', M, 'Sparkler Fade In Over Life', '火花烧旺'),
    # 尾迹外形 Trail Shape
    'tailWidth': ('尾迹外形', M, 'Trail Width Scale', '尾迹粗细'), 'tailPinchHead': ('尾迹外形', M, 'Head Taper', '星头端收尖'),
    'tailPinchTail': ('尾迹外形', M, 'Tail Taper', '尾端收尖'), 'tailBellyAt': ('尾迹外形', M, 'Widest Point', '最粗处位置'),
    'tailShoulder': ('尾迹外形', M, 'Shoulder', '尾迹亮肩'), 'tailHaze': ('尾迹外形', M, 'Trail Haze', '线间底光'),
    'tailHazeR': ('尾迹外形', M, 'Trail Haze Radius', '底光半径'), 'tailDiffuse': ('尾迹外形', M, 'Trail Diffusion', '尾迹扩散'),
    'tailDiffuseScale': ('尾迹外形', M, 'Diffusion Scale', '扩散尺度'),
    # 烟花特性 Firework FX
    'strobeHz': ('烟花特性', M, 'Strobe Frequency', '点灭频率'), 'strobeDuty': ('烟花特性', M, 'Strobe Duty', '点灭亮占比'),
    'strobeStart': ('烟花特性', M, 'Strobe Start', '点灭开始'), 'glitter': ('烟花特性', M, 'Glitter', '辉星强度'),
    'glitterDelay': ('烟花特性', M, 'Glitter Delay', '辉星延迟'), 'crackle': ('烟花特性', M, 'Crackle Count', '爆裂数量'),
    'crackleDelay': ('烟花特性', M, 'Crackle Delay', '爆裂延迟'),
    'crackleR': ('烟花特性', M, 'Crackle Radius', '爆裂范围'), 'crackleV': ('烟花特性', M, 'Crackle Velocity', '爆裂速度'), 'branch': ('烟花特性', M, 'Branch Count', '松叶分叉数'),
    'branchAt': ('烟花特性', M, 'Branch Time', '分叉时刻'), 'flutter': ('烟花特性', M, 'Flutter', '飘落摆动'),
    'flutterHz': ('烟花特性', M, 'Flutter Frequency', '摆动频率'),
    'emberFrac': ('烟花特性', M, 'Ember Fraction', '余烬比例'), 'emberLife': ('烟花特性', M, 'Ember Lifetime', '余烬寿命'),
    'emberBright': ('烟花特性', M, 'Ember Brightness', '余烬亮度'), 'emberSize': ('烟花特性', M, 'Ember Size Scale', '余烬大小'),
    'emberFollow': ('烟花特性', M, 'Ember Fade With Star', '余烬随星淡出'), 'emberEnd': ('烟花特性', M, 'Ember End Time', '余烬熄灭时刻'),
    'emberAll': ('烟花特性', M, 'Ember Full Burn', '余烬贯穿全程'),
    # 子花 Sub Burst
    'subPattern': ('子花', C, 'Sub Burst Shape', '子星排布'), 'subDelay': ('子花', C, 'Sub Burst Time', '子花开花时刻'),
    'subJit': ('子花', M, 'Sub Burst Time Random', '开花时刻随机'), 'subStars': ('子花', C, 'Sub Spawn Burst', '子花星数'),
    'subSpeed': ('子花', C, 'Sub Initial Velocity', '子花初速'), 'subSpeedJit': ('子花', M, 'Sub Initial Velocity Random', '子星初速随机'),
    'subScaleJit': ('子花', M, 'Sub Burst Size Random', '子花大小随机'), 'subBurn': ('子花', C, 'Sub Initial Lifetime', '子星寿命'),
    'subTail': ('子花', C, 'Sub Spark Spawn Rate', '子星火花率'), 'carrierTail': ('子花', M, 'Carrier Spark Spawn Rate', '子弹火花率'),
    'carrierHead': ('子花', M, 'Carrier Brightness', '子弹亮度'), 'subKeep': ('子花', M, 'Sub Inherit Velocity', '继承子弹速度'),
    'subVt': ('子花', M, 'Sub Terminal Velocity', '子星终端速度'), 'subGrav': ('子花', M, 'Sub Gravity Scale', '子星重力'),
    'subFlash': ('子花', M, 'Sub Flare', '子花开花闪光'),
    # 蜂
    'spin': ('蜂', C, 'Spin Rate', '旋转速度'), 'chaos': ('蜂', C, 'Spin Axis Noise', '乱飞程度'), 'beeSpeed': ('蜂', C, 'Thrust Speed', '推进速度'),
    # 输出：入点出点
    'cutIn': ('入点出点', M, 'Cut In', '入点'), 'cutOut': ('入点出点', M, 'Cut Out', '出点'),
    'preRoll': ('入点出点', M, 'Pre-Roll Mode', '入点前处理'), 'preScale0': ('入点出点', M, 'Pre-Roll Start Scale', '放大起始大小'),
    'prePivot': ('入点出点', M, 'Pre-Roll Pivot', '放大中心'), 'trimLead': ('入点出点', M, 'Trim Leading Black', '裁掉开头空白'),
    # 输出：帧与贴图
    'info:outSummary': ('帧与贴图', M, 'Bake Summary', '输出概况'), 'info:specBox': ('帧与贴图', M, 'Texture Settings', '贴图规格'),
    'texW': ('帧与贴图', M, 'Texture Size X', '贴图宽度'), 'texH': ('帧与贴图', M, 'Texture Size Y', '贴图高度'),
    'cols': ('帧与贴图', M, 'Sub Images Horizontal', '列数'), 'rows': ('帧与贴图', M, 'Sub Images Vertical', '行数'),
    'chans': ('帧与贴图', M, 'Channel Packing', '通道接力'), 'outMode': ('帧与贴图', M, 'Head / Spark Output', '星头火花输出'),
    'encGamma': ('帧与贴图', M, 'Encoding Gamma', '灰度编码'), 'frameMode': ('帧与贴图', M, 'Frame Distribution', '取帧方式'),
    'engine': ('帧与贴图', M, 'Sim Target', '模拟内核'), 'zoom': ('帧与贴图', M, 'Framing Mode', '面片取景'),
    'fpsFloor': ('帧与贴图', M, 'Min Frame Rate', '最低帧率'), 'frameBudget': ('帧与贴图', M, 'Frame Budget Mode', '帧数分配'),
    'frameCount': ('帧与贴图', M, 'Frame Count', '总帧数'), 'outPack': ('帧与贴图', M, 'Atlas Packing', '格子装法'),
    'outCell': ('帧与贴图', M, 'Frame Size', '单格尺寸'), 'pageTarget': ('帧与贴图', M, 'Target Texture Count', '初始贴图张数'),
    'maxHoldBurn': ('帧与贴图', M, 'Burn Min Frame Rate', '燃烧最低帧率'), 'maxHold': ('帧与贴图', M, 'Fade Min Frame Rate', '淡出最低帧率'),
    'fpsBurst': ('帧与贴图', M, 'Burst Frame Rate', '开花段帧率'), 'burstSec': ('帧与贴图', M, 'Burst Duration', '开花段时长'),
    'fpsActive': ('帧与贴图', M, 'Burn Frame Rate', '燃烧段帧率'), 'fpsFade': ('帧与贴图', M, 'Fade Frame Rate', '淡出段帧率'),
    'fadeAt': ('帧与贴图', M, 'Fade Start Time', '淡出起点'), 'maxPages': ('帧与贴图', M, 'Max Texture Count', '贴图张数上限'),
    'segAt': ('帧与贴图', M, 'Segment Split Time', '分段时刻'), 'unitElev': ('帧与贴图', M, 'Unit Star Elevation', '代表星仰角'),
    'cellPad': ('帧与贴图', M, 'Frame Padding', '格子留边'),
    # 输出：曝光光晕
    'exposure': ('曝光光晕', M, 'Fixed Exposure', '固定曝光'), 'exposureLock': ('曝光光晕', M, 'Lock Exposure', '锁定曝光'),
    'expoMode': ('曝光光晕', M, 'Auto Exposure Mode', '曝光方式'), 'expoQ': ('曝光光晕', M, 'Exposure Reference Percentile', '曝光基准分位'),
    'haloFrac': ('曝光光晕', M, 'Halo Energy Fraction', '光晕占比'), 'haloR': ('曝光光晕', M, 'Halo Radius Scale', '光晕半径倍数'),
    'previewBloom': ('曝光光晕', M, 'Preview Bloom', '预览光晕'),
    # 输出：画质
    'shutter': ('画质', M, 'Motion Blur Amount', '运动模糊'), 'qSS': ('画质', M, 'Spatial Supersampling', '空间超采样'),
    'qHz': ('画质', M, 'Temporal Sample Rate', '快门采样率'), 'qMaxSub': ('画质', M, 'Max Temporal Samples', '子样本上限'),
}
DROP = {'segAt', 'expoMode', 'expoQ', 'qKernel', 'qCore'}     # 4.3：3.7 画法的参数（清理清单 C1）
# 说明里提到旧名字的几条：改成正面描述（4.3 只剩新名字）
NOTE_FIX = {
    '035-ignSeed': '点火延迟 > 0 才显示；点火延迟随机 = 0 时不起作用；设 0 也不会打乱星位（每颗星的点火随机按自己的编号算）。',
    '061-subKeep': '任何负数都按默认：小球（千轮）0.35、十字（分裂）0.25。',
    '121-trTwist': '主波（× 1）、半频波（× 0.45）、高频波（× 0.12）叠加，最大偏移约 1.5 倍幅度。只是画面平面里的左右波浪，不是三维螺旋。',
    '188-phBPm': '温度下降（熄灭温度）会另外再压暗末段。数值越小越是烧到最后才暗。',
    '289-rtDotGain': '不作用在星头光晕、发射口闪光、烟带和贴图火花上。',
}

# 同一个键有两行时按 id 区分（形状里的 pattern：空中「开花图案」和仕掛け「灯芯图案」）
OVR_ID = {'016-pattern': ('形状', C, 'Lance Pattern', '灯芯图案')}

# 说明里的词（只改空中礼花 / 烘焙输出这两族；按顺序替换）
SUBS = [
    ('「炭头」节的「闪烁强度」', '「星头」模块的「星头闪烁」'), ('「炭头亮度」', '「星头亮度」'), ('炭头', '星头'),
    ('延时点火', '点火延迟'), ('「子花燃烧时间」', '「子星寿命」'), ('子花燃烧时间', '子星寿命'), ('即子弹的燃烧时间', '即子弹的寿命'),
    ('普通燃烧时间', '普通寿命'), ('燃烧时间', '寿命'),
    ('子星初速离散', '子星初速随机'), ('开花时刻离散', '开花时刻随机'), ('离散', '随机'),
    ('余烬长尾', '余烬'), ('光丝', '余烬'), ('长尾', '余烬'),
    ('（小割玉）', ''), ('（千轮 / 分裂飞行中的小割玉）', '（千轮 / 分裂里还在飞的子弹）'), ('（小割玉：', '（'), ('小割玉', '子弹'), ('小割', '子花'), ('小花', '子花'),
    ('炸开的小星颗数（0 = 不炸）', '开出的子星颗数（0 = 不开花）'), ('小星只有亮点、不带火花尾', '子星只有星头、不带火花'), ('末端小星炸开的速度', '末端子星开花的速度'),
    ('末端炸开的子花', '末端开出的子花'), ('那一刻炸开', '那一刻开花'),
    ('割药炸开时', '开花时割药'), ('从一点炸开', '从一点开花'), ('从子弹炸开时', '子弹开花时'), ('多久炸开', '多久爆裂'),
    ('引き（分层星外层）：', '分层星外层：'), ('外层的引き尾巴先停', '外层的尾迹先停'), ('引き', '外层'),
    ('「尾缀（炭火火花）」节', '「火花」模块'), ('尾缀循环层', '升空尾缀循环层'),
    ('尾巴', '尾迹'), ('火星', '火花'), ('火粉', '火花'),
    ('「开花与燃烧」里的「重力倍率」', '「阻力重力」模块的「重力倍率」'),
    # 说明里引用的参数名跟着改成新名字
    ('「火花起势时间」', '「火花起势」'), ('「火花开始延迟」', '「火花开始时刻」'), ('「火花冷却比例」', '「火花冷却」'), ('「子星下坠」', '「子星重力」'),
    ('「光点与曝光」', '「曝光光晕」'), ('点火时刻随机', '点火延迟随机'), ('「压暗结束时刻」', '「前段结束」'), ('前段星头亮度 < 1', '「前段亮度」< 1'),
    ('「火花只在前几秒」', '「火花停止时刻」'), ('「子花开花随机」', '「开花时刻随机」'), ('「子弹尾迹密度」', '「子弹火花率」'), ('「子花火花密度」', '「子星火花率」'),
    ('「只让一部分星发光」', '「发光星比例」'), ('「火花起势随机」', '「起势随机」'), ('「火花开始」', '「火花开始时刻」'), ('「火花停止」', '「火花停止时刻」'),
    ('「最粗处」', '「最粗处位置」'), ('「淡出段最低帧率」', '「淡出最低帧率」'), ('火花生成速率', '火花生成率'), ('（星总寿命 = 延时 + 寿命）', '（星总寿命 = 点火延迟 + 寿命）'),
]
DOT = re.compile(r'(?<!GPU )(?<!「)(?<!PC )光点(?!」|导出|与曝光|方案|大小（层)')

# 用户问过的几处：直接写清楚（覆盖 desc / note 的开头）
TEXT = {
    'sparkGrav': {'note': '和「阻力重力」模块的「重力倍率」不重复：星和火花是两个发射器（像 Cascade 里母发射器、子发射器各有自己的 Const Acceleration）——星的重力管星飞出的弧线，火花的重力管火花离开星以后往下垂多少。下垂幅度还取决于「火花阻力」。'},
    'crackle': {'note': '每个小闪直径约 0.7–1.3 m、0.07 秒内灭，亮度 × 0.6–1.4 随机，在「爆裂延迟」的 0.3–1.7 倍时刻随机出现；离星多远看「爆裂范围」，往外飞多快看「爆裂速度」。子弹不爆，千轮 / 分裂的子星会爆；落水的星不爆；有第二段时在第二段结束才爆。'},
    'crackleR': {'desc': '爆裂小闪离星最远多少米（最近是它的 1/7）；默认 3.5 m = 以前固定的 0.5–3.5 m。', 'updown': '调大：噼啪点散得更开、像一团云；调小：贴着星炸成一小簇', 'note': '爆裂数量 > 0 才显示。'},
    'crackleV': {'desc': '爆裂小闪往外飞的速度：越晚炸的离星越远（米/秒）；默认 0 = 以前那样不动。', 'updown': '调大：一串噼啪往外胀开；0：每个小闪就在出现的地方', 'note': '爆裂数量 > 0 才显示；和「爆裂范围」叠加。'},
    'twinkle': {'note': '一帧的快门时间内会采好几次再平均，贴图里的闪烁比数值看起来小，快门越长越平。星头的闪烁是「星头」模块的「星头闪烁」（Head Flicker）。'},
    'flicker': {'note': '只管星头。火花的闪烁是「火花」模块的「火花闪烁」（Sparkler Flicker）。'},
    'v0': {'desc': '开花时割药把星抛出去的速度（米/秒）；之后受平方阻力很快减速。'},
    'burn': {'desc': '每颗星从点燃到熄灭的秒数；这期间星头发光、喷火花。'},
    'subSpeed': {'desc': '子弹开花时子星的初速，决定每朵子花开多大。'},
    'carrierTail': {'desc': '子弹（主花开花时抛出、飞一段再开成子花）飞行时每秒喷出的火花数。'},
    'emberAll': {'desc': '开关：1 = 「火花停止时刻」只停普通火花，余烬一直喷到星烧完、一直跟到星头。'},
    'vt': {'desc': '星的空气阻力，用「终端速度」表示大小：星最后匀速下落的速度（米/秒）。越小阻力越大。',
           'note_pre': '和 Cascade 的 Drag 区别：Drag 是线性阻力（每秒按固定比例减速）；这里是真实的平方阻力——飞得快时减速猛、慢下来以后减得少，开花「先猛冲、再飘」的样子靠它。序列贴图里已经烘好，引擎里不用再设；导出 GPU 光点 / 单束时会拟合成 Cascade 的 Drag。'},
    'grav': {'desc': '星受的重力是真实重力（9.81 m/s²）的几倍；只管星，火花有自己的「火花重力」。'},
    'emberFrac': {'desc': '余烬不是烟雾：是另一批更暗、留得更久的火花（锦冠木炭的暗橙长线、被照亮的烟迹），画法和火花一样。这里定喷出的火花里多少比例变成余烬。'},
    'headDim': {'desc': '分层星：外层先烧，那段时间星头暗、主要看到火花尾迹；到「前段结束」以后才亮成正常的星头。这里是前段星头亮度的倍数（1 = 不压暗）。'},
    'headDimUntil': {'desc': '前段（星头暗的那段）到第几秒结束（从点火算），之后 0.25 秒内亮到正常的「星头亮度」。'},
}


def main():
    d = json.loads(TAB.read_text(encoding='utf-8'))
    d = [r for r in d if r['key'] not in DROP]
    # 爆裂范围 / 速度：照爆裂延迟那一行抄一份（只第一次加）
    if not any(r['key'] == 'crackleR' for r in d):
        i = next(k for k, r in enumerate(d) if r['key'] == 'crackleDelay'); base = d[i]
        for j, (key, old, unit, rng, dft) in enumerate([('crackleR', '爆裂范围', 'm', '0.5–20', '3.5'), ('crackleV', '爆裂速度', 'm/s', '0–30', '0')]):
            d.insert(i + 1 + j, dict(base, key=key, old=old, unit=unit, range=rng, default=dft, id=base['id'].split('-')[0] + '-' + key, check='20_sim.js crackleBurst：r = (0.5 + 3u) × crackleR / 3.5 + crackleV × dt'))
    # 升空尾缀的档位（4.3 清理清单 A6：小中大合成一个入口，档位是一个选择框）
    if not any(r['key'] == '_trailTier' for r in d):
        i = next(k for k, r in enumerate(d) if r['sec'] == '尾缀序列 · 形态'); base = d[i]
        d.insert(i, dict(base, key='_trailTier', old='档位', module_cn='发射器', module_en='Emitter', en='Trail Size', cn='尾缀档位', unit='', range='小 / 中 / 大', default='中',
                         desc='升空尾缀的小、中、大三档（对照尾缀 C / B / A）：开花高度、弹速、火花密度不同。', updown='选大：弹道更高、火花更密更亮；选小：反过来',
                         random='', ue='UE 里没有对应：换档 = 换成那一档的整套参数，导出的是那一档的贴图和 cascade.json', note='换档会换掉这一档的全部参数（改过的不保留）。',
                         id=base['id'].split('-')[0] + '-_trailTier', check='70_ui.js：_trailTier → openType(trailS / trailM / trailL)', tier='core'))
    for r in d:
        if r['id'] in NOTE_FIX: r['note'] = NOTE_FIX[r['id']]
    mods = {m[0]: m for m in MODULES}
    n = 0
    for r in d:
        if r.get('family') not in ('空中礼花', '烘焙输出'):
            # 4.3：尾缀 / 物理尾缀 / 地面：词汇统一（名字、模块名、说明），tier 先都 core
            for f in ('cn', 'module_cn', 'desc', 'updown', 'note', 'random', 'ue'):
                t = r.get(f) or ''
                for a, b in SUBS: t = re.sub(r'(?<!升空)尾缀循环层', b, t) if a == '尾缀循环层' else t.replace(a, b)
                if f not in ('ue', 'module_cn'): t = DOT.sub('颗粒', t)
                r[f] = t
            # 4.3：尾缀那几族原来的「外观 / 尾迹 / 受力」模块并到和空中礼花同名的模块（一个东西一个词：尾迹只指火花连成的线）
            mm = r.get('module_cn')
            if mm == '尾迹': mm = '火花'
            elif mm == '受力': mm = '阻力重力'
            elif mm == '外观': mm = '星头' if '星头' in r['sec'] else '火花' if '火星' in r['sec'] or '火花' in r['sec'] else '曝光光晕'
            if mm != r.get('module_cn'): r['module_cn'], r['module_en'] = mm, mods[mm][1]
            r.setdefault('tier', C)
            if not r.get('tier'): r['tier'] = C
            continue
        o = OVR_ID.get(r['id']) or OVR.get(r['key'])
        if o is None: raise SystemExit('没覆盖到：' + r['key'])
        mod, tier, en, cn = o
        r['module_cn'], r['module_en'], r['tier'] = mod, mods[mod][1], tier
        r['en'], r['cn'] = en, cn
        for f in ('desc', 'updown', 'note', 'random', 'ue'):
            t = r.get(f) or ''
            for a, b in SUBS: t = re.sub(r'(?<!升空)尾缀循环层', b, t) if a == '尾缀循环层' else t.replace(a, b)
            if f != 'ue': t = DOT.sub('颗粒', t)       # ue 里的「光点」都是导出方案的名字，不改
            r[f] = t
        tx = TEXT.get(r['key'], {})
        if 'desc' in tx: r['desc'] = tx['desc']
        if 'updown' in tx: r['updown'] = tx['updown']
        if 'note' in tx: r['note'] = tx['note']
        if 'note_pre' in tx and tx['note_pre'] not in r['note']: r['note'] = (tx['note_pre'] + ' ' + r['note']).strip()
        n += 1
    TAB.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    keys = list(d[0].keys()) + [k for k in ('tier',) if k not in d[0]]
    with open(HERE / '参数名称表.csv', 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=keys, extrasaction='ignore'); w.writeheader(); [w.writerow(r) for r in d]
    (HERE / '模块表.json').write_text(json.dumps([{'cn': a, 'en': b, 'stage': c, 'open': e, 'what': g} for a, b, c, e, g in MODULES], ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    (HERE / '词汇表.json').write_text(json.dumps({'vocab': [{'use': a, 'not': b, 'en': c, 'what': e} for a, b, c, e in VOCAB], 'rules': RULES}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('改了', n, '行')


if __name__ == '__main__':
    main()
