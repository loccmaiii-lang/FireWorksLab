# 资源引用排查：Day调试版-NPC试放

> 表：`FXtools/节目/NewYearFireWorks_Day/导演表-Day调试版-NPC试放-一张表.json`；行名：用户 10-14 截图转录 `协作/ResourceFX_3.0_行名_2026-10-14.json`；粒子指向：读回 2026-10-17T05:01:10.940Z（`analysis/results/资源规范统一_20261016/复核_20261017/现状_202610170501Z.json`）。

- 组别错用（小平台用了非小号 / 坝顶用了小号）：**0** 处
- 表里没有的 ResourceId：**0** 个；手游用了但手游表里没有：**0** 个
- 两行指向同一个粒子：2 组；名字和实际放的花对不上：12 条

## P 组

| 编号 | 行名 | ResourceId | 次数 | PC 粒子 | 手游粒子 |
|---|---|---|---|---|---|
| 2814 | 跨年烟花3.0_小型_F_银冠菊 | `SilverChry` | 20 | P_EFX_FireWorks_SilverChry_HD | P_EFX_FireWorks_SilverChry_M |
| 2815 | 跨年烟花3.0_小型_G_爆裂星 | `Crackle` | 4 | P_EFX_FireWorks_Crackle_HD | P_EFX_FireWorks_Crackle_M |
| 2817 | 跨年烟花3.0_小型_I__橙辉星 | `Glitter` | 8 | P_EFX_FireWorks_Glitter_HD | P_EFX_FireWorks_Glitter_M |
| 2818 | 跨年烟花3.0_小型_J_点灭星 | `Strobe` | 27 | P_EFX_FireWorks_Strobe_HD | P_EFX_FireWorks_Strobe_M |
| 2824 | 跨年烟花3.0_中型_B_金芒菊 | `GoldRayChry` | 1 | P_EFX_FireWorks_GoldRayChry_HD | P_EFX_FireWorks_GoldRayChry_M |
| 2832 | 跨年烟花3.0_中型_尾缀 | `NY_Trail_Medium` | 2 | P_EFX_FireWorks_RiseTrail_M_HD | P_EFX_FireWorks_RiseTrail_M_M |
| 2833 | 跨年烟花3.0_小型_尾缀 | `NY_Trail_Small` | 58 | P_EFX_FireWorks_RiseTrail_S_HD | P_EFX_FireWorks_RiseTrail_S_M |

## B 组

| 编号 | 行名 | ResourceId | 次数 | PC 粒子 | 手游粒子 |
|---|---|---|---|---|---|
| 2810 | 跨年烟花3.0_小形_B_红彗星 | `FanComet_01` | 19 | P_EFX_FireWorks_Comet_Layers_HD | P_EFX_FireWorks_Comet_Layers_M |
| 2811 | 跨年烟花3.0_小型_C_银星扇 | `FanSilver_01` | 65 | P_EFX_FireWorks_FanSilver_01_HD | P_EFX_FireWorks_Silver3_Layers_S_M |

## F 组

| 编号 | 行名 | ResourceId | 次数 | PC 粒子 | 手游粒子 |
|---|---|---|---|---|---|
| 2801 | 跨年烟花3.0_小号_B_小银菊 | `LittleSilver` | 3 | P_EFX_FireWorks_LittleSilver_HD | P_EFX_FireWorks_LittleSilver_M |
| 2803 | 跨年烟花3.0_小号_D_小分裂 | `LittleCombo` | 3 | P_EFX_FireWorks_LittleCombo_HD | P_EFX_FireWorks_LittleCombo_M |
| 2835 | 跨年烟花3.0_极小_尾缀 | `RiseTrail_Tiny` | 18 | P_EFX_FireWorks_RiseTrail_Tiny_HD | P_EFX_FireWorks_RiseTrail_Tiny_M |

## 组别错用

- 无

## 表里没有

- 无

## 手游表里没有

- 无

## 两行同一个粒子

- {"side": "pc", "particle": "P_EFX_FireWorks_GoldCoreLime_HD", "ids": ["P_EFX_FireWorks_GoldCoreLime", "P_EFX_FireWorks_GoldCoreLime_L"], "rows": ["跨年烟花3.0_中型_E_金蕊柠", "跨年烟花3.0_大型_C_金蕊柠"]}
- {"side": "pc", "particle": "P_EFX_FireWorks_LimeCoreDelay_HD", "ids": ["P_EFX_FireWorks_MultiLayerChry", "P_EFX_FireWorks_MultiLayerChry_L"], "rows": ["跨年烟花3.0_中型_F_多重菊", "跨年烟花3.0_大型_D_多重菊"]}

## 名字对不上

- {"kind": "父模板", "name": "R03 · 小银菊 · 90m", "plays": ["银冠菊"], "ids": ["P_EFX_FireWorks_SilverChry"], "used": true}
- {"kind": "父模板", "name": "R03 · 小银菊 · 90m·略小×0.92", "plays": ["银冠菊"], "ids": ["P_EFX_FireWorks_SilverChry"], "used": true}
- {"kind": "父模板", "name": "R03 · 小银菊 · 90m·略大×1.08", "plays": ["银冠菊"], "ids": ["P_EFX_FireWorks_SilverChry"], "used": true}
- {"kind": "父模板", "name": "小平台 · 单束银尾 · 小银菊 26m（甲）", "plays": ["银冠菊"], "ids": ["P_EFX_FireWorks_SilverChry"], "used": false}
- {"kind": "父模板", "name": "小平台 · 单束银尾 · 小银菊 26m（乙）", "plays": ["银冠菊"], "ids": ["P_EFX_FireWorks_SilverChry"], "used": false}
- {"kind": "父模板", "name": "小平台 · 三束银尾 · 小金花簇 28m（甲）", "plays": ["金锦菊"], "ids": ["P_EFX_FireWorks_GoldSpark", "P_EFX_FireWorks_GoldSpark", "P_EFX_FireWorks_GoldSpark"], "used": false}
- {"kind": "父模板", "name": "小平台 · 三束银尾 · 小金花簇 28m（乙）", "plays": ["金锦菊"], "ids": ["P_EFX_FireWorks_GoldSpark", "P_EFX_FireWorks_GoldSpark", "P_EFX_FireWorks_GoldSpark"], "used": false}
- {"kind": "父模板", "name": "小平台 · 双束红彗 · 短爆裂 22m（甲）", "plays": ["爆裂星"], "ids": ["P_EFX_FireWorks_Crackle", "P_EFX_FireWorks_Crackle"], "used": false}
- {"kind": "父模板", "name": "小平台 · 双束红彗 · 短爆裂 22m（乙）", "plays": ["爆裂星"], "ids": ["P_EFX_FireWorks_Crackle", "P_EFX_FireWorks_Crackle"], "used": false}
- {"kind": "片段", "name": "中间一发偏大偏高", "plays": ["银冠菊"], "count": 1}
- {"kind": "片段", "name": "中间一声", "plays": ["爆裂星"], "count": 1}
- {"kind": "片段", "name": "中间两把银扇", "plays": ["银星扇"], "count": 1}
