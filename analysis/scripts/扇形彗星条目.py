"""扇形彗星（红彗星 / 橙扇）单条母版条目生成（对话框FanGold；用户 2026-10-08 01:22）。
  python3 analysis/scripts/扇形彗星条目.py   → analysis/原理/条目_扇形彗星.json
用户原话：「请参考之前升空尾缀rt6的分层方式（近段/远段/白热/细火花等分层与导出模式，为我制作参考图1中的两个红圈内的扇形烟花
（红彗星与橙扇）母版，先找现实参考配方时长，然后再落地复现,我只需要其中一条，快速升起消散，需要做到cascade发射器中，但需要你在烘培器拼好给我看」
做法：RT6S（升空尾缀 小）同一套 emitset（近段循环层 + 远段 TrailFar + 白热火粉 + 细 / 闪烁 / 粗火花 GPU + 星头光晕），只改数值，不加参数：
  - 弹道换成彗星：50 mm 彗星星体（终端速度 ≈ 38–40 m/s），一条竖直向上，烧完时还在往上走（开花 = 燃尽，不爆）；
  - 不自转（彗星不是带喷口的弹）、横甩很小；
  - 红彗星：星头大、亮，火粉 + 火花全进贴图（Ramp 粉红），GPU 火花 / 落火 / 爆亮 / 光晕关（这些软圆点只有黑体色，出不了粉红）；
  - 橙扇：辉星金尾，火粉更密、火花更多，GPU 按 RT6 预算，星头弱。
原理：analysis/原理/扇形彗星.md
"""
import json, pathlib, copy
ROOT = pathlib.Path(__file__).resolve().parents[1].parent
SRC = ROOT / 'analysis' / '原理' / '条目_升空尾缀.json'
OUT = ROOT / 'analysis' / '原理' / '条目_扇形彗星.json'

RT6S = next(e for e in json.load(open(SRC, encoding='utf-8'))['entries'] if e['id'] == 'RT6S')

COMMON = dict(
    rtBall=1, rtLean=0, rtD=0.05, rtSpin=0, rtSpinPh=0, rtFling=0.5, rtPulse=0.1, rtBurstD=110,
)

RED = dict(COMMON,
    rtH=90, rtVt=38, rtVb=22,                       # 出膛 ≈ 72 m/s、≈ 2.2 s 烧完（还在以 22 m/s 往上走）
    rtHeadSize=0.7, rtHeadI=5, rtHeadFl=1.2, rtHeadFlI=0.8,
    rtARate=9000, rtALife=0.8, rtAI=1.3,
    rtFRate=2400, rtFLife=0.9, rtMRate=700, rtMLife=1.2, rtCRate=40, rtCLife=1.6, rtTw=0.1,
    rtGpuF=0, rtGpuM=0, rtGpuC=0, rtERate=0, rtPopRate=0, rtGlow=0, rtLaunch=0.6, rtLaunchN=30,
)
RED_M = dict(RT6S['m'], ramp1='#4a0814', ramp2='#ff2f62', ramp3='#ffe0ea')

ORANGE = dict(COMMON,
    rtH=100, rtVt=40, rtVb=20,                      # 出膛 ≈ 73 m/s、≈ 2.4 s 烧完
    rtFling=0.8, rtHeadSize=0.35, rtHeadI=2,
    rtARate=12000, rtALife=0.7, rtAI=1.3,
    rtFRate=3200, rtFLife=0.8, rtMRate=1100, rtMLife=1.2, rtCRate=220, rtCLife=1.8,
    rtGlow=0.25, rtLaunch=1.0,
)
ORANGE_M = dict(RT6S['m'], ramp1='#7a2a06', ramp2='#ffa040', ramp3='#fff2dc')

# 第 2 版（FC1 本机回来：近段白热段 = 速度 × 火粉寿命 ≈ 50 m 一整根白棒、星头看不出来；近段过曝 6.5 / 7.7 %、红远段 2.8 %）
#   火粉寿命缩短、变暗 → 白热段 ≈ 15 m、粉 / 橙色多出来、星头突出；红彗星细火花更多更久（尾巴连起来）；
#   近段贴图曝光 × 0.8 → 0.55（RiseLoop Color Over Life 补回，引擎里亮度不变）；红彗星整体曝光 0.45 → 0.4。
RED2 = dict(RED, rtALife=0.3, rtAI=0.8, rtHeadSize=0.6, rtFRate=3000, rtFLife=1.2, rtFI=4, rtMLife=1.4, rtNearExpo=0.55, exposure=0.4)
ORANGE2 = dict(ORANGE, rtALife=0.35, rtAI=1.0, rtNearExpo=0.55)
# 第 3 版（橙扇 FC2O 回来：近段过曝 2.1 %（上限 2 %）；GPU 软圆点远看直径 1.5 m 在 100 m 的一条上像一串泡泡）
#   近段贴图曝光 0.55 → 0.48（引擎里补回）；GPU 远看直径 1.5 → 1.0 m（光量不变，点更小更亮）。
ORANGE3 = dict(ORANGE2, rtNearExpo=0.48, rtGpuDisp=1.0)

LOOK = ['引擎回放：一条从下往上快速冲上去（出膛最快、越往上越慢），到顶前烧完，星头直接熄、尾巴（远段）自己在空中慢慢暗下去、漂开',
        '近段（星头 + 白热段 + 年轻火花）和远段（停在空中的老火花）交接处没有缝',
        'Cascade 里拼扇：同一套发射器复制几份、整套转不同角度（面片都是速度朝向，跟着转）']


def entry(eid, name, p, m, note, opinion, tags, replaces=None):
    e = dict(id=eid, date='2026-10-08', name=name, base='tailS', tags=tags, m=m, note=note, look=LOOK, opinion=opinion, **({'replaces': replaces} if replaces else {}))
    e['p'] = dict(copy.deepcopy(RT6S['p']), **p)
    return e


ENTRIES = [
    entry('FC2R', '扇形彗星 · 红彗星（单条，第 2 版）', RED2, RED_M,
          '对话框FanGold，10-08（用户 01:22 附图 1 左红圈）：RT6 分层的单条彗星。50 mm 粉红彗星，竖直打上去 90 m，≈ 2.2 s 烧完（不爆），'
          '星头大而亮、后面约 15 m 白粉火焰、再往下粉红火花尾；火粉和火花全进贴图（Ramp 粉红），没有 GPU 软圆点（只有黑体色）。'
          '第 2 版：第 1 版白热段 50 m 一整根白棒、近段过曝 → 火粉寿命 0.8 → 0.3 s、近段贴图曝光 0.55（引擎里补回）。原理 analysis/原理/扇形彗星.md。',
          '第 2 版，本机导出中。', '扇形 彗星 红 粉 单条 RT6 近段 远段 物理弹道', replaces=['FC1R']),
    entry('FC3O', '扇形彗星 · 橙扇（单条，第 3 版）', ORANGE3, ORANGE_M,
          '对话框FanGold，10-08（用户 01:22 附图 1 右红圈）：RT6 分层的单条辉星金尾彗星。竖直打上去 100 m，≈ 2.4 s 烧完（不爆），'
          '火粉密、白热段约 20 m，细 / 闪烁 / 粗火花按 RT6 GPU 预算（150 / 200 / 300），星头弱。'
          '第 3 版：第 1 版白热段太长 → 火粉寿命 0.7 → 0.35 s；近段过曝 → 近段贴图曝光 0.48（引擎里补回）；GPU 远看直径 1.0 m（1.5 m 像一串泡泡）。原理 analysis/原理/扇形彗星.md。',
          '第 3 版，本机导出中。', '扇形 彗星 橙 金尾 单条 RT6 近段 远段 GPU 物理弹道', replaces=['FC1O', 'FC2O']),
]
ENTRIES_OLD = [  # 被取代（FC2O、第 1 版）
    entry('FC2O', '扇形彗星 · 橙扇（单条，第 2 版）', ORANGE2, ORANGE_M,
          '对话框FanGold，10-08（用户 01:22 附图 1 右红圈）：RT6 分层的单条辉星金尾彗星。竖直打上去 100 m，≈ 2.4 s 烧完（不爆），'
          '火粉密、白热段约 20 m，细 / 闪烁 / 粗火花按 RT6 GPU 预算（150 / 200 / 300），星头弱。'
          '第 2 版：第 1 版白热段太长、近段过曝 → 火粉寿命 0.7 → 0.35 s、近段贴图曝光 0.55（引擎里补回）。原理 analysis/原理/扇形彗星.md。',
          '第 2 版，本机导出中。', '扇形 彗星 橙 金尾 单条 RT6 近段 远段 GPU 物理弹道', replaces=['FC1O']),

    entry('FC1R', '扇形彗星 · 红彗星（单条，第 1 版）', RED, RED_M,
          '对话框FanGold，10-08（用户 01:22 附图 1 左红圈）：RT6 分层的单条彗星。50 mm 粉红彗星，竖直打上去 90 m，≈ 2.4 s 烧完（不爆），'
          '星头大而亮；火粉和火花全进贴图（Ramp 粉红），没有 GPU 软圆点（只有黑体色）。原理 analysis/原理/扇形彗星.md。',
          '第 1 版，本机导出中。', '扇形 彗星 红 粉 单条 RT6 近段 远段 物理弹道'),
    entry('FC1O', '扇形彗星 · 橙扇（单条，第 1 版）', ORANGE, ORANGE_M,
          '对话框FanGold，10-08（用户 01:22 附图 1 右红圈）：RT6 分层的单条辉星金尾彗星。竖直打上去 100 m，≈ 2.8 s 烧完（不爆），'
          '火粉密、白热段长，细 / 闪烁 / 粗火花按 RT6 GPU 预算（150 / 200 / 300），星头弱。原理 analysis/原理/扇形彗星.md。',
          '第 1 版，本机导出中。', '扇形 彗星 橙 金尾 单条 RT6 近段 远段 GPU 物理弹道'),
]


# ======================= 第 2 套（用户 2026-10-08 07:43）：烘焙器里用「扇面 N 簇 + 簇依次出膛」拼好整排扇 =======================
# 用户原话：「先保留这一版，你没有做对；首先我让你给我在烘培器排拼好给我看（有个分簇功能，你做的），再者红彗星是亮肩明显，头粗尾细，
#   头部的星头有一层很大的玫红色光晕；橙扇是头尖尾粗，根据我的想法重新核对梳理再创建一版新的」
# 「其中一条」= 一排扇（一发）。和 FanGold FG7 同一套 aerial 模拟：一根筒一颗彗星（扇面 N 簇、锥角 0），星二次阻力冲上去、燃烧到时熄灭（不爆）。
# RT6 的分层在这里的对应：星头光晕 → 单独一层（同一模拟）；亮肩 / 白热 → 尾迹外形「亮肩」+ 自定义发射器 1（沿路短命大亮点）；
#   细火花 → 主火花；闪烁火花 → 自定义发射器 2。只用现有参数。
DATE2 = '2026-10-08'
FAN_COMMON = {
    'renderVer': 40, 'pattern': 'cluster', 'clusterLayout': 'fan', 'clusterCone': 0, 'clusterDirJit': 0.8, 'clusterStarsJit': 0, 'tilt': 0,
    'grav': 1, 'speedJit': 3, 'dirJit': 0.4, 'massLoss': 0, 'burnJit': 3, 'lastFlare': 0, 'crackle': 0, 'glitter': 0, 'x2On': 0,
}
# 红彗星：7 根筒、扇面 60°（±30°），一根筒一颗；50 mm 彗星 出膛 72 m/s、终端 38 m/s、2.2 s 燃尽（≈ 90 m）；逐筒 0.2 s 扫完
RED_STAR = dict(FAN_COMMON, seed=21, duration=4.0, stars=7, clusterN=7, clusterFan=60, clusterSweep=0.2,
                v0=72, vt=38, burn=2.2, fade=0.12, flash=0.08, flashR=1.0)
# 第 2 层 亮肩彗尾：白粉亮核 + 很亮很粗的一段亮肩 + 往下迅速变细变暗的粉红尾（头粗尾细）
RED_TAIL = dict(RED_STAR, headSize=0.6, headBright=2.2, headTear=0.25,
                sparkRate=650, sparkLife=0.75, sparkLifeJit=40, sparkSpread=0.35, sparkInherit=0.12, sparkDrag=3.0, sparkGrav=0.3,
                T0=2400, cooling=0.32, sparkSize=0.18, sparkBright=1.6, twinkle=0.1,
                tailShoulder=0.85, tailPinchHead=0, tailPinchTail=0.85, tailBellyAt=0.12, tailWidth=1.25,
                x1On=1, x1Event='trail', x1Kind='dot', x1Rate=120, x1V=2.0, x1VJit=40, x1Inh=0.2, x1Grav=0, x1Drag=6,
                x1Life=0.22, x1LifeJit=30, x1Size=0.5, x1SizeJit=30, x1Bright=2.0, x1BrightJit=20, x1BrightCurve='0:1, 1:0', x1Flick=0,
                exposure=1.0)
RED_TAIL_M = {'stages': [[0, '#ffffff']], 'xw': 0.08, 'ramp0': '#000000', 'ramp1': '#5a0820', 'ramp2': '#ff3a72', 'ramp3': '#ffe8f0', 'headInt': 1, 'tailInt': 1}
# 第 1 层 玫红光晕：同一模拟（同种子、同弹道），只画星头：一层很大的软光，玫红
RED_GLOW = dict(RED_STAR, headSize=4.0, headBright=1.2, headTear=0, sparkRate=0, x1On=0, tailShoulder=0, exposure=1.0)
RED_GLOW_M = {'stages': [[0, '#ffffff']], 'xw': 0.08, 'ramp0': '#000000', 'ramp1': '#4a0618', 'ramp2': '#e8205e', 'ramp3': '#ff7aa6', 'headInt': 1, 'tailInt': 1}

# 橙扇：13 根筒、扇面 70°（±35°）；出膛 73 m/s、终端 40 m/s、2.45 s 燃尽（≈ 100 m）；逐筒 0.25 s 扫完。一层。
# 头尖尾粗：星头小而尖（泪滴星头）、星头端收尖、最粗处靠尾端；火花几乎不跟星走、阻力小、横向散得开 → 越老散得越宽、往下垂
ORANGE_FAN = dict(FAN_COMMON, seed=31, duration=4.6, stars=13, clusterN=13, clusterFan=70, clusterSweep=0.25,
                  v0=73, vt=40, burn=2.45, fade=0.12, flash=0.12, flashR=1.2,
                  headSize=0.25, headBright=0.7, headTear=0.85,
                  sparkRate=900, sparkLife=1.4, sparkLifeJit=40, sparkSpread=1.6, sparkInherit=0.05, sparkDrag=1.2, sparkGrav=0.6,
                  T0=2300, cooling=0.25, sparkSize=0.14, sparkBright=1.4, twinkle=0.3, twinkleHz=8,
                  tailShoulder=-0.3, tailPinchHead=0.9, tailPinchTail=0, tailBellyAt=0.85,
                  x1On=1, x1Event='trail', x1Kind='dot', x1Rate=90, x1V=0.8, x1VJit=40, x1Inh=0.3, x1Grav=0, x1Drag=6,
                  x1Life=0.14, x1LifeJit=30, x1Size=0.2, x1SizeJit=30, x1Bright=1.6, x1BrightJit=20, x1BrightCurve='0:1, 1:0', x1Flick=0,
                  exposure=1.0)
ORANGE_FAN_M = {'stages': [[0, '#ffffff']], 'xw': 0.08, 'ramp0': '#000000', 'ramp1': '#7a2a06', 'ramp2': '#ffa040', 'ramp3': '#fff2dc', 'headInt': 1, 'tailInt': 1}

LOOK2 = ['烘焙器里就是整排扇：一根筒一条，逐筒很快扫过去', '一起快速冲上去（越往上越慢），燃尽熄灭不爆，尾巴停在空中暗掉、漂开', '引擎回放 + 游戏内大小']


def fan_entries(V):
    ents, combos = [], []
    lays = [('Glow', '玫红光晕', RED_GLOW, RED_GLOW_M), ('Comet', '亮肩彗尾', RED_TAIL, RED_TAIL_M)]
    for i, (en, cn, p, m) in enumerate(lays):
        ents.append({'id': f'{V}R-{i + 1}', 'date': DATE2, 'name': f'扇形彗星 · 红彗星扇 · {cn}', 'base': 'kamuro', 'hidden': True,
                     'tags': f'扇形彗星 红彗星 扇面 N 簇 {cn} {V}R-{i + 1}', 'p': dict(p), 'm': dict(m),
                     'note': f'红彗星扇第 {i + 1} 层「{cn}」：和另一层同一个模拟（同种子、同弹道），只是画的东西不同。'})
    combos.append({'id': f'{V}R', 'date': DATE2, 'name': '扇形彗星 · 红彗星扇（7 筒，第 2 套）', 'layers': [{'m': f'rep:{V}R-{i + 1}', 'scale': 1, 'delay': 0} for i in range(2)],
                   'layerNames': [x[1] for x in lays], 'tags': f'扇形彗星 红彗星 扇面 N 簇 依次出膛 亮肩 玫红光晕 {V}R', 'look': LOOK2,
                   'note': '用户 10-08 07:43：在烘焙器里用分簇（扇面 N 簇）拼好整排；红彗星亮肩明显、头粗尾细、星头一层很大的玫红光晕。'
                           '7 根筒扇面 60°、一根筒一颗 50 mm 彗星，逐筒 0.2 s 出膛；出膛 72 m/s、2.2 s 燃尽（约 90 m）不爆。'
                           '两层同一模拟：① 玫红光晕（只画星头，一团约 15 m 的玫红软光）② 亮肩彗尾（白粉亮核 + 亮肩 + 往下收细的粉红尾）。原理 analysis/原理/扇形彗星.md 第 0 节。'})
    ents.append({'id': f'{V}O', 'date': DATE2, 'name': '扇形彗星 · 橙扇（13 筒，第 2 套）', 'base': 'kamuro',
                 'tags': f'扇形彗星 橙扇 扇面 N 簇 依次出膛 头尖尾粗 {V}O', 'p': dict(ORANGE_FAN), 'm': dict(ORANGE_FAN_M), 'look': LOOK2,
                 'note': '用户 10-08 07:43：在烘焙器里用分簇（扇面 N 簇）拼好整排；橙扇头尖尾粗。13 根筒扇面 70°、一根筒一颗辉星金尾彗星，逐筒 0.25 s 出膛；'
                         '出膛 73 m/s、2.45 s 燃尽（约 100 m）不爆。星头小而尖、白热尖端，火花越老散得越开 → 尾端粗。一层。原理 analysis/原理/扇形彗星.md 第 0 节。'})
    return ents, combos


# FC4 本机看过（08:20，FCE-FC4R / FC4O、FCS4 ✅，实时 = 导出）：整排扇拼好了、逐筒扫对；
#   红：光晕是硬边的粉色圆片、不像光晕；亮肩只有星头后面很短一截 → 光晕层 光晕能量占比 0.7、半径 × 5、直径 5 m、亮度降；
#       亮肩：自定义发射器 1 更多 / 更大 / 更久（0.35 s、0.8 m）、亮肩 1.0、火花稍长稍散 → 头后一段粗亮、往下收细；
#   橙：太暗、太细、一粒一粒，尾端没粗起来 → 火花更密更亮更白、横向散 1.6 → 3.5 m/s、粗细 × 1.5、曝光 1.5。
RED_TAIL5 = dict(RED_TAIL, tailShoulder=1.0, sparkLife=0.9, sparkSpread=0.5, sparkSize=0.22,
                 x1Rate=220, x1V=2.5, x1Life=0.35, x1Size=0.8, x1Bright=2.4)
RED_GLOW5 = dict(RED_GLOW, headSize=5.0, headBright=0.9, haloFrac=0.7, haloR=5)
ORANGE_FAN5 = dict(ORANGE_FAN, sparkRate=1800, sparkBright=2.4, sparkSize=0.2, sparkLife=1.6, sparkSpread=3.5, T0=2450, cooling=0.2,
                   tailWidth=1.5, x1Size=0.3, x1Bright=2.0, exposure=1.5)
RED_TAIL, RED_GLOW, ORANGE_FAN = RED_TAIL5, RED_GLOW5, ORANGE_FAN5
# FC5 本机看过（08:55，回放检查全过、实时 = 导出）：红：亮肩粗亮、往下收细 = 头粗尾细 ✓；光晕仍是一个实心粉色圆片 + 很淡的大红雾，不像「一层很大的光晕」
#   → 光晕层核心 5 → 2.5 m、能量 85 % 给光晕、半径 × 3（软光直径约 15 m）、亮度 1.2。
#   橙：头尖尾粗 ✓，但横向散太大，下半截连成一整块实心楔形、3 s 后一大片雾 → 横向散 3.5 → 2.2 m/s、火花寿命 1.6 → 1.3 s（每条粗尾分得开）。
RED_GLOW = dict(RED_GLOW, headSize=2.5, headBright=1.2, haloFrac=0.85, haloR=3)
ORANGE_FAN = dict(ORANGE_FAN, sparkSpread=2.2, sparkLife=1.3)
FAN_ENTS, FAN_COMBOS = fan_entries('FC6')
FAN_COMBOS[0]['replaces'] = ['FC4R', 'FC5R']
next(e for e in FAN_ENTS if e['id'] == 'FC6O')['replaces'] = ['FC4O', 'FC5O']

if __name__ == '__main__':
    OUT.write_text(json.dumps({'说明': '扇形彗星（红彗星 / 橙扇），由 analysis/scripts/扇形彗星条目.py 生成，别手改。第 1 套 FC2R / FC3O = RT6 单条（用户 07:43「先保留这一版」）；第 2 套 FC4 = 烘焙器分簇拼好的整排扇。',
                               'entries': ENTRIES + FAN_ENTS, 'combos': FAN_COMBOS}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('写好', OUT, [e['id'] for e in ENTRIES + FAN_ENTS], [c['id'] for c in FAN_COMBOS])
