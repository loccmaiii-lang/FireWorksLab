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
    entry('FC2O', '扇形彗星 · 橙扇（单条，第 2 版）', ORANGE2, ORANGE_M,
          '对话框FanGold，10-08（用户 01:22 附图 1 右红圈）：RT6 分层的单条辉星金尾彗星。竖直打上去 100 m，≈ 2.4 s 烧完（不爆），'
          '火粉密、白热段约 20 m，细 / 闪烁 / 粗火花按 RT6 GPU 预算（150 / 200 / 300），星头弱。'
          '第 2 版：第 1 版白热段太长、近段过曝 → 火粉寿命 0.7 → 0.35 s、近段贴图曝光 0.55（引擎里补回）。原理 analysis/原理/扇形彗星.md。',
          '第 2 版，本机导出中。', '扇形 彗星 橙 金尾 单条 RT6 近段 远段 GPU 物理弹道', replaces=['FC1O']),
]
ENTRIES_V1 = [
    entry('FC1R', '扇形彗星 · 红彗星（单条，第 1 版）', RED, RED_M,
          '对话框FanGold，10-08（用户 01:22 附图 1 左红圈）：RT6 分层的单条彗星。50 mm 粉红彗星，竖直打上去 90 m，≈ 2.4 s 烧完（不爆），'
          '星头大而亮；火粉和火花全进贴图（Ramp 粉红），没有 GPU 软圆点（只有黑体色）。原理 analysis/原理/扇形彗星.md。',
          '第 1 版，本机导出中。', '扇形 彗星 红 粉 单条 RT6 近段 远段 物理弹道'),
    entry('FC1O', '扇形彗星 · 橙扇（单条，第 1 版）', ORANGE, ORANGE_M,
          '对话框FanGold，10-08（用户 01:22 附图 1 右红圈）：RT6 分层的单条辉星金尾彗星。竖直打上去 100 m，≈ 2.8 s 烧完（不爆），'
          '火粉密、白热段长，细 / 闪烁 / 粗火花按 RT6 GPU 预算（150 / 200 / 300），星头弱。原理 analysis/原理/扇形彗星.md。',
          '第 1 版，本机导出中。', '扇形 彗星 橙 金尾 单条 RT6 近段 远段 GPU 物理弹道'),
]

if __name__ == '__main__':
    OUT.write_text(json.dumps({'说明': '扇形彗星（红彗星 / 橙扇）单条母版，由 analysis/scripts/扇形彗星条目.py 生成，别手改。', 'entries': ENTRIES},
                              ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('写好', OUT, [e['id'] for e in ENTRIES])
