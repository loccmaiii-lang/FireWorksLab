
(() => {
'use strict';
const IMG = {"kiku": "{{ASSET:9f3df4af8b.jpg}}", "kiku_late": "{{ASSET:40a1b73a14.jpg}}", "film_kiku": ["{{ASSET:efde206a4f.jpg}}", "{{ASSET:925d7561ca.jpg}}", "{{ASSET:7a4810ad14.jpg}}", "{{ASSET:8d893e6625.jpg}}", "{{ASSET:f99c8b8218.jpg}}", "{{ASSET:8d16422f04.jpg}}", "{{ASSET:b30f1756d6.jpg}}", "{{ASSET:d7210fe989.jpg}}", "{{ASSET:c0d789d02f.jpg}}", "{{ASSET:c8a3af3e58.jpg}}", "{{ASSET:1a2bc6bd69.jpg}}", "{{ASSET:01e6fff2f7.jpg}}", "{{ASSET:103578537f.jpg}}", "{{ASSET:d02fe75f9c.jpg}}", "{{ASSET:bbc05c4cfc.jpg}}", "{{ASSET:4d1abaaec1.jpg}}", "{{ASSET:534280876e.jpg}}", "{{ASSET:a12a56d032.jpg}}", "{{ASSET:afaeb31d5d.jpg}}", "{{ASSET:bee4816961.jpg}}", "{{ASSET:a554fe9a7f.jpg}}", "{{ASSET:e922cd3399.jpg}}", "{{ASSET:c30d6e8991.jpg}}", "{{ASSET:193e57374d.jpg}}", "{{ASSET:fafa765762.jpg}}"], "atlas": "{{ASSET:ff40d660be.jpg}}", "spk": ["{{ASSET:b41bc73c6d.jpg}}", "{{ASSET:39cce85bf0.jpg}}", "{{ASSET:bc3f93615b.jpg}}", "{{ASSET:16287a41b1.jpg}}", "{{ASSET:8e88905294.jpg}}", "{{ASSET:dbd239798b.jpg}}", "{{ASSET:aeb0e39947.jpg}}"], "film_spk": ["{{ASSET:1c309aa6a6.jpg}}", "{{ASSET:acb1e4d95a.jpg}}", "{{ASSET:c0a459f406.jpg}}", "{{ASSET:e8d4cf340a.jpg}}", "{{ASSET:ed19317b85.jpg}}", "{{ASSET:80457d618b.jpg}}", "{{ASSET:9c379521c8.jpg}}", "{{ASSET:c834db8e02.jpg}}", "{{ASSET:5541c663f9.jpg}}", "{{ASSET:2f89318dcc.jpg}}", "{{ASSET:f174424487.jpg}}", "{{ASSET:4d99978568.jpg}}", "{{ASSET:707ac11634.jpg}}", "{{ASSET:5ab6703e12.jpg}}", "{{ASSET:2c70db6281.jpg}}", "{{ASSET:70aded220f.jpg}}"], "t_spk": "{{ASSET:fbd3d4ab36.jpg}}", "t_kiku": "{{ASSET:24bbb5cc30.jpg}}", "t_copy": "{{ASSET:a7ec9faf4f.jpg}}", "t_comet": "{{ASSET:fab2f9c5ba.jpg}}", "t_silver": "{{ASSET:64282bc97f.jpg}}", "t_rise": "{{ASSET:3fd496c8e2.jpg}}", "t_mang": "{{ASSET:77467fae37.jpg}}", "t_fan": "{{ASSET:32a637478a.jpg}}", "tier_s": "{{ASSET:4fa0dc178c.jpg}}", "tier_m": "{{ASSET:fa19b2ca8f.jpg}}", "tier_l": "{{ASSET:32bab10f92.jpg}}", "tpl": ["{{ASSET:24d8d9c6fc.jpg}}", "{{ASSET:4fb77ba30d.jpg}}", "{{ASSET:fbe10d070f.jpg}}", "{{ASSET:63896a8892.jpg}}", "{{ASSET:5555ebdde6.jpg}}", "{{ASSET:6d6a20ec5d.jpg}}", "{{ASSET:ab32e383a2.jpg}}", "{{ASSET:cf29e9d80c.jpg}}", "{{ASSET:9fcb6e9b8f.jpg}}", "{{ASSET:3ff5adc109.jpg}}", "{{ASSET:7f8384406e.jpg}}", "{{ASSET:c459e098a6.jpg}}"], "tpl_big": ["{{ASSET:3ea96207b5.jpg}}", "{{ASSET:6e2a70e3e6.jpg}}", "{{ASSET:75fe26a902.jpg}}", "{{ASSET:a98a664fc2.jpg}}", "{{ASSET:11ef9444f3.jpg}}", "{{ASSET:1cb807cc6d.jpg}}", "{{ASSET:1bcb363729.jpg}}", "{{ASSET:3162c86457.jpg}}"]}, EMIT = {"星": [{"t": "生成", "rows": [{"lab": "星数", "unit": "颗", "min": 4, "max": 3000, "step": 1, "v": 293, "rnd": ""}, {"lab": "点火延迟", "unit": "s", "min": 0, "max": 10, "step": 0.01, "v": 1.28, "rnd": "随机▸±11%"}, {"lab": "点火随机种子", "unit": "", "min": 0, "max": 999, "step": 1, "v": 91, "rnd": ""}, {"lab": "发光星比例", "unit": "×", "min": 0.02, "max": 1, "step": 0.01, "v": 1, "rnd": ""}]}, {"t": "形状", "rows": [{"lab": "起始半径", "unit": "m", "min": 0, "max": 300, "step": 1, "v": 0, "rnd": ""}]}, {"t": "初速", "rows": [{"lab": "初速", "unit": "m/s", "min": 20, "max": 600, "step": 1, "v": 250, "rnd": "随机▸±8%±1.5°"}]}, {"t": "受力", "rows": [{"lab": "终端速度", "unit": "m/s", "min": 4, "max": 80, "step": 0.5, "v": 20, "rnd": ""}, {"lab": "重力倍率", "unit": "×", "min": 0, "max": 3, "step": 0.05, "v": 0.15, "rnd": ""}, {"lab": "燃烧减质量", "unit": "", "min": 0, "max": 0.9, "step": 0.01, "v": 0, "rnd": ""}]}, {"t": "寿命", "rows": [{"lab": "燃烧时间", "unit": "s", "min": 0.2, "max": 10, "step": 0.05, "v": 3.8, "rnd": "随机▸±10%"}, {"lab": "第二段燃烧时间", "unit": "s", "min": 0, "max": 8, "step": 0.05, "v": 0, "rnd": "随机▸±15%"}]}, {"t": "大小", "rows": [{"lab": "大小", "unit": "m", "min": 0.15, "max": 6, "step": 0.05, "v": 0.6, "rnd": "随机▸"}, {"lab": "拉长", "unit": "", "min": 0, "max": 3, "step": 0.01, "v": 0, "rnd": "随机▸"}, {"lab": "边缘起伏", "unit": "", "min": 0, "max": 1, "step": 0.01, "v": 0, "rnd": ""}, {"lab": "双核", "unit": "", "min": 0, "max": 1, "step": 0.01, "v": 0, "rnd": ""}, {"lab": "六边形", "unit": "", "min": 0, "max": 1, "step": 0.01, "v": 0, "rnd": ""}]}, {"t": "亮度", "rows": [{"lab": "亮度", "unit": "×", "min": 0, "max": 3, "step": 0.05, "v": 0, "rnd": ""}, {"lab": "闪烁", "unit": "", "min": 0, "max": 1, "step": 0.01, "v": 0, "rnd": ""}, {"lab": "前段亮度", "unit": "×", "min": 0, "max": 1, "step": 0.01, "v": 1, "rnd": ""}, {"lab": "前段结束", "unit": "s", "min": 0, "max": 6, "step": 0.05, "v": 0, "rnd": ""}, {"lab": "渐隐比例", "unit": "", "min": 0, "max": 0.9, "step": 0.01, "v": 0.2, "rnd": ""}, {"lab": "熄灭前闪亮", "unit": "", "min": 0, "max": 1.5, "step": 0.05, "v": 0, "rnd": ""}]}, {"t": "点灭", "rows": [{"lab": "频率", "unit": "Hz", "min": 0, "max": 30, "step": 0.1, "v": 0, "rnd": "随机▸±15%"}]}, {"t": "飘落", "rows": [{"lab": "摆动", "unit": "m/s", "min": 0, "max": 10, "step": 0.1, "v": 0, "rnd": ""}]}], "火花": [{"t": "生成", "rows": [{"lab": "生成率", "unit": "个/秒", "min": 0, "max": 3000, "step": 1, "v": 300, "rnd": ""}, {"lab": "开始时刻", "unit": "s", "min": 0, "max": 6, "step": 0.01, "v": 0, "rnd": ""}, {"lab": "停止时刻", "unit": "s", "min": 0, "max": 3, "step": 0.01, "v": 0, "rnd": ""}, {"lab": "起势", "unit": "s", "min": 0, "max": 2, "step": 0.01, "v": 0, "rnd": "随机▸±30%"}, {"lab": "末段生成率", "unit": "×", "min": 0, "max": 2, "step": 0.01, "v": 0.8, "rnd": ""}]}, {"t": "形状", "rows": [{"lab": "起始半径", "unit": "m", "min": 0, "max": 30, "step": 0.01, "v": 0, "rnd": ""}, {"lab": "跟星头大小", "unit": "×", "min": 0, "max": 3, "step": 0.01, "v": 0, "rnd": ""}]}, {"t": "初速", "rows": [{"lab": "继承速度", "unit": "", "min": 0, "max": 1, "step": 0.01, "v": 0.05, "rnd": "随机▸±70%"}, {"lab": "向后喷速度", "unit": "m/s", "min": 0, "max": 200, "step": 0.5, "v": 0, "rnd": ""}]}, {"t": "受力", "rows": [{"lab": "阻力", "unit": "1/s", "min": 0, "max": 8, "step": 0.05, "v": 4, "rnd": ""}, {"lab": "平方阻力", "unit": "1/m", "min": 0, "max": 2, "step": 0.01, "v": 0, "rnd": ""}, {"lab": "重力倍率", "unit": "×", "min": 0, "max": 3, "step": 0.05, "v": 0.05, "rnd": ""}, {"lab": "扩散", "unit": "m/s", "min": 0, "max": 4, "step": 0.05, "v": 0, "rnd": ""}, {"lab": "燃尽后气流", "unit": "m/s", "min": 0, "max": 2, "step": 0.05, "v": 0, "rnd": ""}]}, {"t": "寿命", "rows": [{"lab": "寿命", "unit": "s", "min": 0.05, "max": 4, "step": 0.01, "v": 2.8, "rnd": "随机▸±30%"}, {"lab": "末段寿命", "unit": "×", "min": 0.05, "max": 2, "step": 0.01, "v": 1, "rnd": ""}]}, {"t": "大小", "rows": [{"lab": "线条宽度", "unit": "m", "min": 0, "max": 8, "step": 0.01, "v": 0.4, "rnd": ""}, {"lab": "颗粒大小", "unit": "m", "min": 0.05, "max": 2, "step": 0.01, "v": 0.45, "rnd": ""}, {"lab": "拉长", "unit": "", "min": 0, "max": 3, "step": 0.01, "v": 0, "rnd": "随机▸"}, {"lab": "大小随机", "unit": "", "min": 0, "max": 1, "step": 0.01, "v": 0, "rnd": ""}, {"lab": "星头端收尖", "unit": "", "min": 0, "max": 1, "step": 0.01, "v": 0, "rnd": ""}, {"lab": "尾端收尖", "unit": "", "min": 0, "max": 1, "step": 0.01, "v": 0, "rnd": ""}]}, {"t": "颜色", "rows": [{"lab": "温度", "unit": "K", "min": 1500, "max": 2800, "step": 10, "v": 2250, "rnd": "随机▸±120K"}, {"lab": "冷却", "unit": "", "min": 0, "max": 0.8, "step": 0.01, "v": 0.25, "rnd": ""}]}, {"t": "亮度", "rows": [{"lab": "亮度", "unit": "×", "min": 0, "max": 3, "step": 0.05, "v": 1, "rnd": "随机▸±0.4"}, {"lab": "烧旺时间", "unit": "s", "min": 0, "max": 1, "step": 0.01, "v": 0, "rnd": ""}, {"lab": "线间底光", "unit": "", "min": 0, "max": 0.2, "step": 0.001, "v": 0, "rnd": ""}]}, {"t": "辉星", "rows": [{"lab": "强度", "unit": "", "min": 0, "max": 1, "step": 0.01, "v": 0, "rnd": ""}]}]}, SPK = {"name": "仙女棒 · 快慢火星与轻气流", "period": 2.1333333333333333, "bounds": [-0.47, 0.46, -0.5, 0.29], "bursts": [[0.24, 0.025], [0.89, 0.035], [1.73, 0.022]], "emitters": [{"id": "e01", "name": "01｜燃烧核心", "parent": null, "seed": 501937, "enabled": true, "count": 14933, "speed": [0.02, 0.18, 1.4], "life": [0.015, 0.065, 1.4], "size": [0.3, 1.8, 1.5], "power": [0.2, 2.5, 1.4], "width": 0.00022000000171829015, "gain": 43.2, "drag": 1.7000000476837158, "gravity": [0, 0, -0.18400000035762787], "directionMode": "sphere", "direction": [0, 1, 0], "cone": 30, "shape": "line", "history": 0.03333333333333333, "taper": 0.15000000596046448, "aspect": 1, "spin": 0, "twist": 0, "extent": 0.013000000268220901, "clusterSize": 128, "clusterProbability": 0.75, "clusterWidth": 0.014999999664723873, "clusterDirection": 0.15000000596046448, "children": 1, "event": 0.5, "delay": 0, "inherit": 1, "probability": 1, "noise": 0, "noiseHz": 30, "sizeCurve": [[0, 0.699999988079071], [0.20000000298023224, 1], [0.6000000238418579, 0.7200000286102295], [1, 0.07999999821186066]], "brightCurve": [[0, 0.5], [0.20000000298023224, 1], [0.6499999761581421, 0.6000000238418579], [1, 0]], "burstShare": 0.17, "fieldCoupling": 0}, {"id": "e02", "name": "02｜细长暗丝", "parent": null, "seed": 503244, "enabled": true, "count": 12800, "speed": [0.2, 3.6399999999999997, 2.3], "life": [0.05, 0.19, 1.4], "size": [0.35, 1.3, 1.6], "power": [0.06, 3, 2], "width": 7.500000356230885e-05, "gain": 3072, "drag": 8, "gravity": [0, 0, -2.5], "directionMode": "sphere", "direction": [0, 1, 0], "cone": 30, "shape": "line", "history": 0.03333333333333333, "taper": 0.15000000596046448, "aspect": 1, "spin": 0, "twist": 0, "extent": 0.004999999888241291, "clusterSize": 34, "clusterProbability": 0.44999998807907104, "clusterWidth": 0.014999999664723873, "clusterDirection": 0.15000000596046448, "children": 1, "event": 0.5, "delay": 0, "inherit": 1, "probability": 1, "noise": 0.00044999999227002263, "noiseHz": 17, "sizeCurve": [[0, 0.3499999940395355], [0.07999999821186066, 1], [0.5, 0.800000011920929], [0.800000011920929, 0.46000000834465027], [1, 0.10000000149011612]], "brightCurve": [[0, 0.25], [0.15000000596046448, 1], [0.5, 0.8500000238418579], [0.800000011920929, 0.30000001192092896], [1, 0]], "burstShare": 0.17, "fieldCoupling": 1}, {"id": "e03", "name": "03｜中等金丝", "parent": null, "seed": 504551, "enabled": true, "count": 960, "speed": [0.45, 2.8600000000000003, 1.6], "life": [0.07, 0.23, 1.4], "size": [0.45, 1.5, 1.6], "power": [0.12, 2.5, 1.7], "width": 0.00016999999934341758, "gain": 1920, "drag": 5, "gravity": [0, 0, -2.5], "directionMode": "sphere", "direction": [0, 1, 0], "cone": 30, "shape": "line", "history": 0.03333333333333333, "taper": 0.15000000596046448, "aspect": 1, "spin": 0, "twist": 0, "extent": 0.004999999888241291, "clusterSize": 14, "clusterProbability": 0.3499999940395355, "clusterWidth": 0.014999999664723873, "clusterDirection": 0.15000000596046448, "children": 1, "event": 0.5, "delay": 0, "inherit": 1, "probability": 1, "noise": 0.0008999999845400453, "noiseHz": 12, "sizeCurve": [[0, 0.3499999940395355], [0.07999999821186066, 1], [0.5, 0.800000011920929], [0.800000011920929, 0.46000000834465027], [1, 0.10000000149011612]], "brightCurve": [[0, 0.25], [0.15000000596046448, 1], [0.5, 0.8500000238418579], [0.800000011920929, 0.30000001192092896], [1, 0]], "burstShare": 0.17, "fieldCoupling": 1}, {"id": "e04", "name": "04｜粗亮短火星", "parent": null, "seed": 505858, "enabled": true, "count": 149, "speed": [0.65, 1.8, 1.2], "life": [0.12, 0.28, 1.4], "size": [0.5, 1.8, 1.7], "power": [0.12, 3, 1.8], "width": 0.002199999988079071, "gain": 72, "drag": 2.4, "gravity": [0, 0, -2.5], "directionMode": "sphere", "direction": [0, 1, 0], "cone": 30, "shape": "line", "history": 0.03333333333333333, "taper": 0.15000000596046448, "aspect": 1, "spin": 0, "twist": 0, "extent": 0.0006500000017695129, "clusterSize": 4, "clusterProbability": 0.20000000298023224, "clusterWidth": 0.014999999664723873, "clusterDirection": 0.15000000596046448, "children": 1, "event": 0.5, "delay": 0, "inherit": 1, "probability": 1, "noise": 0, "noiseHz": 30, "sizeCurve": [[0, 0.3499999940395355], [0.07999999821186066, 1], [0.5, 0.800000011920929], [0.800000011920929, 0.46000000834465027], [1, 0.10000000149011612]], "brightCurve": [[0, 0], [0.30000001192092896, 1], [0.6499999761581421, 0.6499999761581421], [1, 0]], "burstShare": 0.17, "fieldCoupling": 0.2}, {"id": "e05", "name": "05｜分裂母粒", "parent": null, "seed": 507165, "enabled": true, "count": 907, "speed": [0.45, 2.9899999999999998, 1.8], "life": [0.08, 0.28, 1.2], "size": [0.6, 2.2, 1.5], "power": [0.35, 2, 1.6], "width": 0.00011999999696854502, "gain": 1920, "drag": 4, "gravity": [0, 0, -2.5], "directionMode": "sphere", "direction": [0, 1, 0], "cone": 30, "shape": "line", "history": 0.03333333333333333, "taper": 0.15000000596046448, "aspect": 1, "spin": 0, "twist": 0, "extent": 0.004999999888241291, "clusterSize": 11, "clusterProbability": 0.25, "clusterWidth": 0.014999999664723873, "clusterDirection": 0.15000000596046448, "children": 1, "event": 0.5, "delay": 0, "inherit": 1, "probability": 1, "noise": 0.0005000000237487257, "noiseHz": 13, "sizeCurve": [[0, 0.3499999940395355], [0.07999999821186066, 1], [0.5, 0.800000011920929], [0.800000011920929, 0.46000000834465027], [1, 0.10000000149011612]], "brightCurve": [[0, 0.25], [0.15000000596046448, 1], [0.5, 0.8500000238418579], [0.800000011920929, 0.30000001192092896], [1, 0]], "burstShare": 0.17, "fieldCoupling": 1}, {"id": "e06", "name": "06｜一级分叉", "parent": "e05", "seed": 508472, "enabled": true, "count": 0, "speed": [0.12, 2.08, 2.2], "life": [0.024, 0.08, 1.2], "size": [0.3, 1.65, 1.7], "power": [0.3, 3, 1.7], "width": 7.999999797903001e-05, "gain": 8063.999999999998, "drag": 11, "gravity": [0, 0, -2.5], "directionMode": "sphere", "direction": [0, 1, 0], "cone": 30, "shape": "line", "history": 0.03333333333333333, "taper": 0.15000000596046448, "aspect": 1, "spin": 0, "twist": 0, "extent": 0.0006500000017695129, "clusterSize": 1, "clusterProbability": 0.75, "clusterWidth": 0.014999999664723873, "clusterDirection": 0.15000000596046448, "children": 16, "event": 0.6499999761581421, "delay": 0, "inherit": 0.2, "probability": 1, "noise": 0, "noiseHz": 30, "sizeCurve": [[0, 0.25], [0.15000000596046448, 0.8999999761581421], [0.5, 0.6000000238418579], [0.800000011920929, 0.25], [1, 0.019999999552965164]], "brightCurve": [[0, 0.8999999761581421], [0.18000000715255737, 1], [0.550000011920929, 0.6499999761581421], [0.800000011920929, 0.20000000298023224], [1, 0]], "burstShare": 0, "fieldCoupling": 1}, {"id": "e07", "name": "07｜延迟分叉", "parent": "e05", "seed": 509779, "enabled": true, "count": 0, "speed": [0.15, 1.9500000000000002, 1.8], "life": [0.02, 0.065, 1.2], "size": [0.3, 1.65, 1.7], "power": [0.3, 3, 1.7], "width": 7.500000356230885e-05, "gain": 7200, "drag": 13, "gravity": [0, 0, -2.5], "directionMode": "sphere", "direction": [0, 1, 0], "cone": 30, "shape": "line", "history": 0.03333333333333333, "taper": 0.15000000596046448, "aspect": 1, "spin": 0, "twist": 0, "extent": 0.0006500000017695129, "clusterSize": 1, "clusterProbability": 0.75, "clusterWidth": 0.014999999664723873, "clusterDirection": 0.15000000596046448, "children": 9, "event": 0.8999999761581421, "delay": 0, "inherit": 0.2, "probability": 0.3400000035762787, "noise": 0, "noiseHz": 30, "sizeCurve": [[0, 0.25], [0.15000000596046448, 0.8999999761581421], [0.5, 0.6000000238418579], [0.800000011920929, 0.25], [1, 0.019999999552965164]], "brightCurve": [[0, 0.8999999761581421], [0.18000000715255737, 1], [0.550000011920929, 0.6499999761581421], [0.800000011920929, 0.20000000298023224], [1, 0]], "burstShare": 0, "fieldCoupling": 1}, {"id": "e08", "name": "08｜二级碎火星", "parent": "e06", "seed": 511086, "enabled": true, "count": 0, "speed": [0.05, 0.65, 1.8], "life": [0.012, 0.032, 1.2], "size": [0.3, 1.65, 1.7], "power": [0.08, 3, 1.7], "width": 7.000000186963007e-05, "gain": 5760, "drag": 20, "gravity": [0, 0, -2.5], "directionMode": "sphere", "direction": [0, 1, 0], "cone": 30, "shape": "line", "history": 0.03333333333333333, "taper": 0.15000000596046448, "aspect": 1, "spin": 0, "twist": 0, "extent": 0.0006500000017695129, "clusterSize": 1, "clusterProbability": 0.75, "clusterWidth": 0.014999999664723873, "clusterDirection": 0.15000000596046448, "children": 1, "event": 0.7799999713897705, "delay": 0, "inherit": 0.35, "probability": 0.25, "noise": 0, "noiseHz": 30, "sizeCurve": [[0, 0.25], [0.15000000596046448, 0.8999999761581421], [0.5, 0.6000000238418579], [0.800000011920929, 0.25], [1, 0.019999999552965164]], "brightCurve": [[0, 0.8999999761581421], [0.18000000715255737, 1], [0.550000011920929, 0.6499999761581421], [0.800000011920929, 0.20000000298023224], [1, 0]], "burstShare": 0, "fieldCoupling": 1}, {"id": "e09", "name": "09｜不规则粗碎片", "parent": null, "seed": 512393, "enabled": true, "count": 213, "speed": [0.55, 1.6, 1.2], "life": [0.12, 0.3, 1.2], "size": [0.5, 1.7, 1.8], "power": [0.1, 2.5, 1.8], "width": 0.002400000113993883, "gain": 4.800000000000001, "drag": 2.2, "gravity": [0, 0, -2.5], "directionMode": "sphere", "direction": [0, 1, 0], "cone": 30, "shape": "fragment", "history": 0, "taper": 0.15000000596046448, "aspect": 6, "spin": 25, "twist": 80, "extent": 0.00016500000492669642, "clusterSize": 2, "clusterProbability": 0.75, "clusterWidth": 0.014999999664723873, "clusterDirection": 0.15000000596046448, "children": 1, "event": 0.5, "delay": 0, "inherit": 1, "probability": 1, "noise": 0, "noiseHz": 30, "sizeCurve": [[0, 0.3499999940395355], [0.07999999821186066, 1], [0.5, 0.800000011920929], [0.800000011920929, 0.46000000834465027], [1, 0.10000000149011612]], "brightCurve": [[0, 0], [0.30000001192092896, 1], [0.699999988079071, 0.6499999761581421], [1, 0]], "burstShare": 0.17, "fieldCoupling": 0.2}, {"id": "e10", "name": "10｜暗红余烬", "parent": null, "seed": 513700, "enabled": true, "count": 555, "speed": [0.025, 0.55, 1.8], "life": [0.03, 0.12, 1.2], "size": [0.4, 1.7, 1.5], "power": [0.15, 1.2, 1.6], "width": 0.0002300000051036477, "gain": 36, "drag": 6, "gravity": [0, 0, -2.5], "directionMode": "sphere", "direction": [0, 1, 0], "cone": 30, "shape": "line", "history": 0.03333333333333333, "taper": 0.15000000596046448, "aspect": 1, "spin": 0, "twist": 0, "extent": 0.0006500000017695129, "clusterSize": 8, "clusterProbability": 0.75, "clusterWidth": 0.014999999664723873, "clusterDirection": 0.15000000596046448, "children": 1, "event": 0.5, "delay": 0, "inherit": 1, "probability": 1, "noise": 0, "noiseHz": 30, "sizeCurve": [[0, 0.3499999940395355], [0.07999999821186066, 1], [0.5, 0.800000011920929], [0.800000011920929, 0.46000000834465027], [1, 0.10000000149011612]], "brightCurve": [[0, 0.6000000238418579], [0.07999999821186066, 1], [0.2800000011920929, 0.3799999952316284], [0.5, 0.09000000357627869], [0.699999988079071, 0.017999999225139618], [0.8799999952316284, 0.0010000000474974513], [1, 0]], "burstShare": 0.17, "fieldCoupling": 1}, {"id": "e11", "name": "11｜圆形余烬", "parent": null, "seed": 602303, "enabled": true, "count": 139, "speed": [0.4, 1.3, 1.2], "life": [0.18, 0.36, 1.2], "size": [0.5, 1.5, 1.8], "power": [0.1, 2.5, 1.8], "width": 0.007000000216066837, "gain": 2, "drag": 3.2, "gravity": [0, 0, -2.5], "directionMode": "cone", "direction": [0, -1, 0], "cone": 70, "shape": "point", "history": 0, "taper": 0.15000000596046448, "aspect": 1, "spin": 90, "twist": 60, "extent": 0.0010000000474974513, "clusterSize": 3, "clusterProbability": 0.20000000298023224, "clusterWidth": 0.014999999664723873, "clusterDirection": 0.15000000596046448, "children": 1, "event": 0.5, "delay": 0, "inherit": 1, "probability": 1, "noise": 0, "noiseHz": 30, "sizeCurve": [[0, 0.3499999940395355], [0.07999999821186066, 1], [0.5, 0.800000011920929], [0.800000011920929, 0.46000000834465027], [1, 0.10000000149011612]], "brightCurve": [[0, 0], [0.3499999940395355, 0.6000000238418579], [0.699999988079071, 1], [1, 0]], "burstShare": 0.17, "fieldCoupling": 0.2}, {"id": "e12", "name": "12｜近远景粗火星", "parent": null, "seed": 602273, "enabled": true, "count": 299, "speed": [0.6, 2.4, 1.8], "life": [0.12, 0.3, 1.2], "size": [0.5, 1.8, 2], "power": [0.1, 2.5, 1.8], "width": 0.003800000064074993, "gain": 43.2, "drag": 2.8, "gravity": [0, 0, -2.5], "directionMode": "cone", "direction": [0, -1, 0], "cone": 70, "shape": "line", "history": 0.01600000075995922, "taper": 0.25, "aspect": 1, "spin": 0, "twist": 0, "extent": 0.0010000000474974513, "clusterSize": 3, "clusterProbability": 0.20000000298023224, "clusterWidth": 0.014999999664723873, "clusterDirection": 0.15000000596046448, "children": 1, "event": 0.5, "delay": 0, "inherit": 1, "probability": 1, "noise": 0, "noiseHz": 30, "sizeCurve": [[0, 0.3499999940395355], [0.07999999821186066, 1], [0.5, 0.800000011920929], [0.800000011920929, 0.46000000834465027], [1, 0.10000000149011612]], "brightCurve": [[0, 0], [0.30000001192092896, 1], [0.6499999761581421, 0.75], [1, 0]], "burstShare": 0.17, "fieldCoupling": 0.2}, {"id": "e13", "name": "13｜燃烧头炽热点", "parent": null, "seed": 731529, "enabled": true, "count": 5333, "speed": [0.01, 0.12, 1.4], "life": [0.04, 0.1, 1.2], "size": [0.35, 2.2, 1.6], "power": [0.2, 2.5, 1.4], "width": 0.0031999999191612005, "gain": 1.4000000000000001, "drag": 1.7000000476837158, "gravity": [0, 0, -0.18400000035762787], "directionMode": "cone", "direction": [0, 0, 1], "cone": 0, "shape": "fragment", "history": 0, "taper": 0.15000000596046448, "aspect": 1.7999999523162842, "spin": 10, "twist": 20, "extent": 0.023000000044703484, "clusterSize": 24, "clusterProbability": 0.800000011920929, "clusterWidth": 0.014999999664723873, "clusterDirection": 0.15000000596046448, "children": 1, "event": 0.5, "delay": 0, "inherit": 1, "probability": 1, "noise": 0, "noiseHz": 30, "sizeCurve": [[0, 0.699999988079071], [0.20000000298023224, 1], [0.6000000238418579, 0.7200000286102295], [1, 0.07999999821186066]], "brightCurve": [[0, 0.5], [0.20000000298023224, 1], [0.6499999761581421, 0.6000000238418579], [1, 0]], "burstShare": 0.17, "fieldCoupling": 0}], "presetKey": "sparkler", "fieldEnabled": 1, "fieldResponse": 12, "fieldStart": 0.002, "fieldRamp": 0.025, "fieldAxisX": 0, "fieldAxisY": 0, "fieldAxisZ": 1, "fieldWindX": 0.04, "fieldWindY": 0, "fieldWindZ": 0.3, "fieldConverge": 0, "fieldTurbulence": 0.3, "fieldScale": 0.16, "fieldCycles": 1, "fieldSeed": 29, "scaleCone": 1, "scaleCount": 1, "scaleWidth": 1, "scaleLife": 1, "scaleGain": 1, "scaleSpeed": 1, "scaleGravity": 1, "branchLife": 1, "branchAngle": 1, "branchCount": 1, "branchWidth": 1, "branchSpeed": 1, "branchGravity": 1};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ico = (id, cls = '') => `<svg class="i${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const dec = step => step >= 1 ? 0 : Math.min((String(step).split('.')[1] || '').length, 3);
const fmt = (v, step) => Number(v).toFixed(dec(step));
const clone = v => v === undefined || typeof v === 'function' ? undefined : JSON.parse(JSON.stringify(v));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const pc = (v, a, b) => (clamp((v - a) / (b - a), 0, 1) * 100).toFixed(2) + '%';

/* ---------- 参数说明 ---------- */
const HELP = {
  '时间与缩放|开始时间': '本层起始时刻，与导出入点无关', '气流|开始时间': '气流开始作用的时刻',
  '星数': '一次开花的星数', '点火延迟': '开花到星点燃的延迟', '点火随机种子': '点火延迟的随机种子', '发光星比例': '发光星占全部星的比例',
  '起始半径': '星生成处到中心的距离', '初速': '星的初始速度', '终端速度': '受阻力后稳定的下落速度', '重力倍率': '相对标准重力的倍数', '燃烧减质量': '燃烧中质量减少的比例',
  '燃烧时间': '星的燃烧时长', '第二段燃烧时间': '第二燃烧段的时长', '拉长': '沿速度方向的拉伸倍数', '边缘起伏': '星头轮廓的起伏程度', '双核': '星头双核结构的强度',
  '六边形': '星头六边形化的程度', '闪烁': '亮度闪烁幅度', '前段亮度': '燃烧前段的亮度倍数', '前段结束': '前段亮度的结束时刻', '渐隐比例': '末段渐隐占寿命的比例',
  '熄灭前闪亮': '熄灭前的亮度提升倍数', '频率': '点灭的频率', '摆动': '飘落时的横向摆动幅度',
  '生成率': '每秒生成的火花数', '开始时刻': '火花开始生成的时刻，相对点火', '停止时刻': '停止生成的时刻，0 为到熄灭', '起势': '生成率升到设定值的时长',
  '末段生成率': '燃烧末段的生成率倍数', '跟星头大小': '起始半径随星头大小的倍数', '向后喷速度': '逆星运动方向的初速', '阻力': '线性空气阻力系数',
  '平方阻力': '与速度平方成正比的阻力', '扩散': '火花速度的随机扩散量', '燃尽后气流': '星燃尽后火花受的上升气流', '末段寿命': '燃烧末段火花的寿命倍数',
  '线条宽度': '拖尾线条的宽度', '颗粒大小': '火花颗粒的直径', '大小随机': '颗粒大小的随机比例', '星头端收尖': '拖尾近星头端的收窄程度', '尾端收尖': '拖尾末端的收窄程度',
  '温度': '火花颜色对应的色温', '冷却': '火花寿命内的降温比例', '烧旺时间': '生成后达到最亮的时长', '线间底光': '拖尾线条间的底光强度', '强度': '辉星强度，0 为关闭',
  '开始时间': '本层在整朵中的起始时刻', '缩放': '本层相对整朵的大小倍数', '时间倍率': '本层的播放速度倍数', '序列时长': '导出序列的总时长', '风速': '水平风速', '湍流强度': '空气湍流的速度幅度',
  '湍流尺度': '湍流涡旋的尺寸', '扰动开始时间': '爆后扰动的开始时刻', '扰动渐入时间': '扰动升到设定强度的时长', '扰动气流速度': '扰动气流的速度', '扰动尺度': '扰动涡旋的尺寸', '分出比例': '火花分出余烬的比例',
  '序列方式': '单次播一遍，循环用于常亮效果', '水平镜像': '左右翻转本层', '号数': '按礼花弹号数套用规格', '爆后扰动': '开花后加一段扰动气流',
  '色温': '本层颜色的色温', '饱和度': '本层颜色的饱和度', '发射器共用': '本层发射器共用一条颜色', '曝光': '预览与烘焙的曝光倍数',
  '整体缩放': '整朵相对原始尺寸的倍数', '整体亮度': '整朵的亮度倍数', '总时长': '首层开始到末层结束的时长',
  '触发时刻': '父粒走完寿命此比例时触发', '触发概率': '每个父粒的触发概率', '每次生成': '每次触发生成的粒子数', '继承速度': '继承父粒速度的比例', '父发射器': '触发本发射器的上一级',
  '速度': '初速的随机区间', '重力': '竖直加速度，负值向下', '方向': '初速方向的分布方式', '锥角': '锥形发射的张角',
  '大小': '粒子大小的随机区间', '亮度': '亮度倍数的随机区间', '亮度增益': '渲染时的亮度放大倍数', '大小曲线': '大小随寿命的变化', '亮度曲线': '亮度随寿命的变化',
  '形状': '粒子的绘制形状', '线宽': '线条粒子的宽度', '收尖': '线条两端的收窄程度', '拖尾时长': '线条拖尾对应的时长', '长宽比': '碎片的长宽比', '旋转': '碎片的旋转速度', '扭转': '碎片的扭转角度',
  '跟随气流': '受整体气流影响的程度', '噪波': '位置随机抖动的幅度', '噪波频率': '抖动的频率',
  '每簇数量': '每簇的粒子数', '成簇概率': '粒子成簇生成的概率', '簇宽': '一簇粒子的散开宽度', '簇方向': '簇内方向的一致程度',
  '数量': '每周期生成的粒子数', '爆发占比': '爆发时刻集中生成的比例', '发射范围': '生成位置的随机范围', '随机种子': '随机分布的种子',
  '周期': '循环一次的时长', '爆发': '周期内集中喷发的时刻', '启用气流': '关闭后跟随气流不起作用', '响应': '粒子跟上气流的快慢', '渐入时间': '气流升到设定值的时长',
  '水平风': '水平风速', '上升气流': '竖直向上的气流速度', '湍流': '气流的紊乱程度',
  '单格': '贴图每一格的边长', '帧率': '导出序列的帧率', '帧数': '导出序列的帧数', '每张': '每张贴图的帧数', '张数': '导出的贴图张数',
  'PC': '导出 PC 贴图', '手机': '导出手机贴图', '手机单格': '手机贴图每一格的边长', '手机帧率': '手机序列的帧率', '联动的层': '与本层共用星轨迹的层'
};
HELP['寿命'] = '粒子的存续时间';

/* ---------- 场景数据 ---------- */
let UID = 0;
const N = o => Object.assign({id: 'n' + (++UID), show: true, solo: false, open: false, kids: []}, o);

function mkKiku(key = 'kiku') {
  const em = (icon, name, tl) => N({type: 'emitter', icon, name, data: name, tl});
  const out = tl => N({type: 'output', icon: 'out', name: '输出', tl});
  const L1 = N({type: 'layer', icon: 'layer', no: 1, name: '橙引线层', tl: {in: 0, out: 1.55, keys: [0, .75, 2.2], hatch: 2.45}});
  L1.kids = [em('star', '星', {in: 0, out: 1.55}), em('spark', '火花', {in: .1, out: 1.55}), out({in: 0, out: 1.55, cells: 3, per: 16})];
  const L2 = N({type: 'layer', icon: 'layer', no: 2, name: '金锦层', open: true, tl: {in: .35, out: 3.70, keys: [.35, 1.7, 2.0]}});
  L2.kids = [em('star', '星', {in: .35, out: 3.7}), em('spark', '火花', {in: .45, out: 3.7}), em('ember', '余烬', {in: .9, out: 3.7}), out({in: .35, out: 2.85, cells: 5, per: 15})];
  const L3 = N({type: 'layer', icon: 'layer', no: 3, name: '点灭星', tl: {in: .6, out: 4.5, keys: [.1, .6, 3.9]}});
  L3.kids = [em('star', '星', {in: .6, out: 4.5}), out({in: .6, out: 4.5, cells: 2, per: 64, cell: '512 px'})];
  const root = N({type: 'group', icon: 'group', name: '整体', open: true, kids: [L1, L2, L3], tl: {in: 0, out: 5.24}});
  return {key, lib: 'kiku', name: '金曜菊-B 稀簇辉闪', short: '金曜菊-B', T: 5.24, fps: 30, frames: 75, baked: 45, t: 2.0, root, sel: L2.id, focusL: L2.id,
    film: IMG.film_kiku, initStale: new Set([L2.id]), savedAt: '20:31', H: {u: [], r: []},
    /* 导出相关的示例数据：修订号；上次导出时与现在不同的值（用来写「为什么需重新导出」） */
    bake: {in: .35, out: 2.85}, bakeL: L2.id,   /* 烘焙过的是金锦层（导出范围 0.35–2.85 s，75 帧，烘焙了 45 帧） */
    rev: 'r13', exp0: {'金锦层|时间与缩放|缩放': 1}, initWhy: {[L2.id]: '打开前已改'}, pend: {},
    marks: [['开花', .3], ['展开', 2.0], ['衰减', 3.7]],
    tech: s => [['PC'], ['单格', '1024', 'px'], ['75', '', '帧'], ['5', '', '张']],
    count: s => `${s.root.kids.filter(n => n.type === 'layer').length} 层`};
}

function mkSpk() {
  const P = SPK.period, nodes = {};
  const icon = e => e.shape === 'line' ? 'spark' : e.shape === 'point' ? 'ember' : 'frag';
  SPK.emitters.forEach(e => {
    const [no, name] = e.name.split('｜');
    nodes[e.id] = N({type: 'emitter', icon: e.parent ? 'sub' : icon(e), no, name, e});   /* 由父发射器触发的：子发射器图标 */
  });
  const root = N({type: 'group', icon: 'group', name: '整体', open: true, tl: {in: 0, out: P, keys: SPK.bursts.map(b => b[0])}});
  SPK.emitters.forEach(e => (e.parent ? nodes[e.parent].kids : root.kids).push(nodes[e.id]));
  const start = e => e.parent ? start(SPK.emitters.find(x => x.id === e.parent)) + SPK.emitters.find(x => x.id === e.parent).life[0] * e.event : 0;
  SPK.emitters.forEach(e => {
    const s = +start(e).toFixed(2);
    nodes[e.id].tl = {in: s, out: P, keys: e.burstShare ? SPK.bursts.map(b => b[0]) : []};
  });
  nodes.e05.open = nodes.e06.open = true;
  root.kids.push(N({type: 'output', icon: 'out', name: '输出', tl: {in: 0, out: P, cells: 4, per: 16, cell: '512 px'}}));
  return {key: 'spk', lib: 'spk', name: '仙女棒 快慢火星与轻气流', short: '仙女棒', T: P, fps: 30, frames: 64, baked: 40, t: 0.89, root, sel: nodes.e08.id,
    film: IMG.film_spk, initStale: new Set([root.id]), savedAt: '19:58', H: {u: [], r: []},
    bake: {in: 0, out: P}, bakeL: root.id,
    rev: 'r6', exp0: {}, initWhy: {[root.id]: '08 二级碎火星 寿命：打开前已改'}, pend: {},
    marks: SPK.bursts.map((b, i) => ['第 ' + (i + 1) + ' 次爆发', b[0]]),
    tech: s => [['PC'], ['单格', '512', 'px'], ['64', '', '帧'], ['4', '', '张']],
    count: s => `${SPK.emitters.length} 个`};   /* 树里写「13 个」：上下文已是发射器 */
}

/* 全表用：多层花型模板 5 层 × 4–6 个发射器（展开 30 行以上） */
function mkTpl5() {
  const kinds = [['star', '星'], ['spark', '火花'], ['ember', '余烬'], ['trail', '拖尾'], ['star', '变色星'], ['ember', '点灭']];
  const L = [['芯', 4], ['内环', 5], ['中环', 6], ['外环', 5], ['冠', 6]].map(([nm, k], i) => {
    const l = N({type: 'layer', icon: 'layer', no: i + 1, name: nm, open: true, tl: {in: .2 * i, out: 3 + .3 * i}});
    l.kids = kinds.slice(0, k).map(([ic, n]) => N({type: 'emitter', icon: ic, name: n, tl: {in: .2 * i, out: 3 + .3 * i}}));
    l.kids.push(N({type: 'output', icon: 'out', name: '输出', tl: {in: .2 * i, out: 3 + .3 * i, cells: 3}}));
    return l;
  });
  const root = N({type: 'group', icon: 'group', name: '整体', open: true, kids: L, tl: {in: 0, out: 4.5}});
  return {key: 'tpl5', name: '芯入菊 五层', short: '芯入菊', T: 4.5, root, sel: L[2].kids[1].id, H: {u: [], r: []}, initStale: new Set(), count: s => '5 层'};
}

const SC = {kiku: mkKiku(), spk: mkSpk(), tpl5: mkTpl5(), kiku2: mkKiku('kiku2')};
const UI = {view: 'main', scene: 'kiku', size: 1920, mode: '引擎回放', compact: false, left: true, right: true,
  treeClosed: false, libClosed: false, treeH: {}, libTab: '效果', libSub: '花型模板', chip: '全部', q: '', scope: '全部效果',
  pq: '', onlyChg: false, playing: false, speed: 1, loop: true, grid: false, view3: '适应', plat: 'PC', dview: '贴图', sheetPage: 2, frameNo: 20,
  treeQ: '', optFollow: true, optSync: true, checked: {}, alsoWB: {}, expPlat: {}, tlRows: {}};
const cur = () => SC[UI.scene];

function rowsOf(sc) {
  const out = [], q = (sc.key === UI.scene && UI.treeQ.trim()) || '';
  const hit = n => (n.no ? n.no + ' ' : '') + n.name;
  const has = n => n.type !== 'output' && (hit(n).includes(q) || n.kids.some(has));
  const walk = (n, lv, parent) => {
    if (n.type === 'output') return;   /* 输出在层的检查器里（「输出」模块），不占结构树的行 */
    if (q && n !== sc.root && !has(n)) return;
    out.push({n, lv, parent});
    if (n.open || (q && n.kids.some(has))) n.kids.forEach(k => walk(k, lv + 1, n));
  };
  walk(sc.root, 0, null);
  return out;
}
/* 层：金曜菊-B 的三层；仙女棒没有层，整体算一层 */
const layersOf = sc => { const l = sc.root.kids.filter(n => n.type === 'layer'); return l.length ? l : [sc.root]; };
const layerOf = (sc, id) => { const a = ancestors(sc, id); return a.find(n => n.type === 'layer') || (layersOf(sc)[0] === sc.root ? sc.root : null); };
const hiddenBy = (sc, id) => ancestors(sc, id).find(n => n.show === false);
function find(sc, id) {
  let r = null;
  const walk = (n, parent, arr, i) => { if (n.id === id) r = {n, parent, arr, i}; n.kids.forEach((k, j) => walk(k, n, n.kids, j)); };
  walk(sc.root, null, null, 0);
  return r;
}
function ancestors(sc, id) {
  const chain = [];
  let f = find(sc, id);
  while (f) { chain.unshift(f.n); f = f.parent ? find(sc, f.parent.id) : null; }
  return chain;
}
/* 只看：亮着的行 = 只看的节点 + 它们的祖先与后代 */
function litSet(sc) {
  const solos = [];
  const walk = n => { if (n.solo) solos.push(n); n.kids.forEach(walk); };
  walk(sc.root);
  if (!solos.length) return null;
  const s = new Set();
  solos.forEach(n => {
    ancestors(sc, n.id).forEach(a => s.add(a.id));
    const down = m => { s.add(m.id); m.kids.forEach(down); };
    down(n);
  });
  return s;
}
const label = (sc, n) => n.type === 'group' ? sc.short : (sc.key === 'spk' && n.no ? n.no + ' ' + n.name : n.name);

/* ---------- 效果库数据 ---------- */
const LIB = [
  {id: 'kiku', name: '金曜菊-B 稀簇辉闪', sub: ['KYB', '3 层'], st: '制作中', cat: '球花', img: 't_kiku', mine: true},
  {id: 'spk', name: '仙女棒 快慢火星与轻气流', sub: ['SP01', '1 层'], st: '待验收', cat: '', img: 't_spk'},
  {id: 'rt6', name: '升空尾缀 RT6', sub: ['RT6', '1 层'], st: '新', cat: '尾缀', img: 't_rise', tiers: ['小', '中', '大']},
  {id: 'cs3c', name: 'Comet 3.0 红头金尾', sub: ['CS3C', '2 层'], st: '已通过', cat: '尾缀', img: 't_comet'},
  {id: 'cs3s', name: 'Silver 3.0 银白长尾', sub: ['CS3S', '1 层'], st: '已通过', cat: '尾缀', img: 't_silver'},
  {id: 'mang', name: '金芒菊 规格', sub: ['KM06', '2 层'], st: '制作中', cat: '球花', img: 't_mang'},
  {id: 'fan5', name: '扇形 五连发', sub: ['FN05', '2 层'], st: '制作中', cat: '扇形', img: 't_fan'},
  {id: 'senrin', name: '千轮 小花', sub: ['SR03', '3 层'], st: '已通过', cat: '球花', img: 'tpl:6'},
  {id: 'yanagi', name: '柳 金色长垂', sub: ['YN01', '2 层'], st: '新', cat: '尾缀', img: 'tpl:11'},
  {id: 'mange', name: '万华镜 变色', sub: ['MK08', '5 层'], st: '制作中', cat: '球花', img: 'tpl:7'}
];
const libImg = k => k.startsWith('tpl:') ? IMG.tpl[+k.slice(4)] : IMG[k];
const TPL_NAMES = ['芯入菊', '芯入牡丹', '八重芯', '八重芯变化', '三重芯', '银冠', '千轮', '万华镜', '引先菊', '椰子', '冠菊', '柳'];
const TPL_CAT = ['球花', '球花', '球花', '球花', '球花', '尾缀', '球花', '球花', '球花', '扇形', '球花', '尾缀'];
const TPL_LAYERS = [2, 2, 3, 3, 4, 2, 3, 5, 2, 2, 3, 2];

/* ---------- 参数定义（真实数据：金锦层、金锦层的星 / 火花、仙女棒 13 个发射器） ---------- */
const LAYER_V = {'橙引线层': [0, 1, 1], '金锦层': [.2, 1.1, 1.5], '点灭星': [.6, 1, 1]};
const BAND = ['#fff1d6', '#ffd99a', '#ffbb5c', '#f2913a', '#d8642a', '#a8401f', '#6d2a18'];
const bandHTML = () => `<span class="band" aria-label="颜色">${BAND.map(c => `<i style="background:${c}"></i>`).join('')}</span>`;
function layerMods(sc, n) {
  const [t0, s, tr] = LAYER_V[n.name] || [0, 1, 1];
  const others = sc.root.kids.filter(l => l.type === 'layer' && l !== n);
  const dist = P => P.get('爆后扰动');
  return [
    {t: '时间与缩放', rows: [
      {lab: '开始时间', unit: 's', min: 0, max: 5, step: .01, v: t0},
      {lab: '缩放', unit: '倍', min: .1, max: 3, step: .01, v: s, def: 1},
      {lab: '时间倍率', unit: '倍', min: .25, max: 4, step: .01, v: tr}]},
    {t: '出生方式', rows: [
      {k: 'seg', lab: '序列方式', opts: ['单次', '循环'], v: '单次'},
      {k: 'sw', lab: '水平镜像', v: false}]},
    {t: '轨迹联动', closed: true, rows: [
      {k: 'chk', lab: '联动的层', opts: others.map(l => `${l.no} ${l.name}`), v: others.map(l => n.name === '金锦层' && l.name === '点灭星')}],
      sum: P => (P.get('联动的层') || []).map((on, i) => on && others[i] ? `第 ${others[i].no} 层` : '').filter(Boolean).join('  ') || '未联动'},
    {t: '规格', closed: true, rows: [
      {k: 'sel', lab: '号数', opts: ['手动', '3 号', '4 号', '5 号', '尺玉'], v: '手动', affects: true},
      {lab: '序列时长', unit: 's', min: 1, max: 15, step: .01, v: 7.56, dis: P => P.get('号数') !== '手动' ? '号数不是「手动」时无效' : null, disS: '号数非手动时无效'}]},
    {t: '环境', rows: [
      {lab: '风速', unit: 'm/s', min: 0, max: 20, step: .1, v: 0},
      {lab: '湍流强度', unit: 'm/s', min: 0, max: 10, step: .1, v: 0, affects: true},
      {lab: '湍流尺度', unit: 'm', min: 1, max: 200, step: 1, v: 60, dis: P => +P.get('湍流强度') === 0 ? '湍流强度为 0 时无效' : null, disS: '强度为 0 时无效'},
      {k: 'sw', lab: '爆后扰动', v: false, affects: true},
      {lab: '扰动开始时间', unit: 's', min: 0, max: 3, step: .01, v: .4, if: dist, dep: '爆后扰动'},
      {lab: '扰动渐入时间', unit: 's', min: 0, max: 3, step: .01, v: .3, if: dist, dep: '爆后扰动'},
      {lab: '扰动气流速度', unit: 'm/s', min: 0, max: 5, step: .1, v: 1.2, if: dist, dep: '爆后扰动'},
      {lab: '扰动尺度', unit: 'm', min: 1, max: 50, step: .1, v: 8, if: dist, dep: '爆后扰动'}]},
    /* §9：只有一个参数的「曝光」不做成模块，放进相近的「颜色」 */
    /* v3.3 第 5 条：折叠后的摘要也落在五列网格里——色带在控件列（和滑杆同一个起点），曝光的数值在数值列、单位在单位列 */
    {t: '颜色', sumParts: P => ({band: P.get('发射器共用') ? bandHTML() : '', lead: P.get('发射器共用') ? '曝光' : '分开设置　曝光', v: fmt(P.get('曝光'), .01), u: '倍'}), rows: [
      {lab: '曝光', unit: '倍', min: .1, max: 4, step: .01, v: 1, sug: {act: 'suggestExp', tip: '按最亮时刻设曝光', v: '0.85 倍'}},
      {k: 'sw', lab: '发射器共用', v: true, affects: true},
      {lab: '色温', unit: 'K', min: 1500, max: 6500, step: 10, v: 2400, if: P => P.get('发射器共用'), dep: '发射器共用'},
      {lab: '饱和度', unit: '', min: 0, max: 1, step: .01, v: .85, if: P => P.get('发射器共用'), dep: '发射器共用'}]}
  ];
}
function kikuEmitMods(n) {
  if (n.data === '余烬') return [{t: '生成', rows: [{lab: '分出比例', unit: '倍', min: 0, max: 1, step: .01, v: .3}]}];
  const src = EMIT[n.data] || EMIT['火花'];
  return src.map(m => ({t: m.t, closed: !['生成', '寿命', '大小'].includes(m.t), rows: m.rows.map(r => ({
    lab: r.lab, unit: r.unit === '×' ? '倍' : r.unit, min: r.min, max: r.max, step: r.step, v: r.v, rnd: r.rnd || ''}))}));
}
function outMods(sc, n) {
  const frames = Math.round((n.tl.out - n.tl.in) * (sc.fps || 30)), mob = P => P.get('手机');
  return [
    {t: '贴图', rows: [
      {k: 'sel', lab: '单格', opts: ['256 px', '512 px', '1024 px', '2048 px'], v: n.tl.cell || '1024 px'},
      {k: 'seg', lab: '帧率', opts: ['24 fps', '30 fps', '60 fps'], v: '30 fps'},
      {k: 'ro', lab: '帧数', unit: '帧', v: () => frames, note: () => '导出范围 × 帧率'},
      {lab: '每张', unit: '帧', min: 1, max: 64, step: 1, v: n.tl.per || 16, affects: true},
      {k: 'ro', lab: '张数', unit: '张', v: P => Math.ceil(frames / P.get('每张')), note: P => `${frames} 帧，每张 ${P.get('每张')} 帧`}]},
    {t: '平台', rows: [
      {k: 'sw', lab: 'PC', v: true},
      {k: 'sw', lab: '手机', v: true, affects: true},
      {k: 'sel', lab: '手机单格', opts: ['256 px', '512 px'], v: Math.min(512, parseInt(n.tl.cell || '1024') / 2) + ' px', if: mob, dep: '手机'},
      {k: 'seg', lab: '手机帧率', opts: ['15 fps', '30 fps'], v: '15 fps', if: mob, dep: '手机'}]}
  ];
}
function kikuRootMods() {
  return [
    {t: '整体', rows: [
      {k: 'ro', lab: '总时长', unit: 's', v: () => '5.24', note: () => '由最晚结束的层决定'},
      {lab: '整体缩放', unit: '倍', min: .1, max: 3, step: .01, v: 1},
      {lab: '整体亮度', unit: '倍', min: 0, max: 3, step: .01, v: 1}]}
  ];
}
function spkRootMods() {
  const S = SPK, dep = P => P.get('启用气流');
  const ones = (labs) => labs.map(l => ({lab: l, unit: '倍', min: 0, max: 3, step: .01, v: 1}));
  const f = (lab, unit, min, max, step, v) => ({lab, unit, min, max, step, v, if: dep, dep: '启用气流'});
  return [
    {t: '时间', rows: [
      {lab: '周期', unit: 's', min: .5, max: 5, step: .01, v: +S.period.toFixed(2)},
      {k: 'ro', lab: '爆发', unit: '次', v: () => S.bursts.length, note: () => S.bursts.map(b => b[0].toFixed(2) + ' s').join('  ')}]},
    {t: '气流', rows: [
      {k: 'sw', lab: '启用气流', v: !!S.fieldEnabled, affects: true},
      f('响应', '', 0, 30, .1, S.fieldResponse), f('开始时间', 's', 0, .5, .001, S.fieldStart), f('渐入时间', 's', 0, .5, .001, S.fieldRamp),
      f('水平风', 'm/s', -1, 1, .01, S.fieldWindX), f('上升气流', 'm/s', -1, 1, .01, S.fieldWindZ), f('湍流', '', 0, 1, .01, S.fieldTurbulence),
      f('湍流尺度', 'm', .01, 1, .01, S.fieldScale), f('随机种子', '', 0, 999, 1, S.fieldSeed)]},
    {t: '整体倍率', closed: true, sumParts: () => ({lead: '全部', v: '1.00', u: '倍'}), rows: ones(['锥角', '数量', '线宽', '寿命', '亮度', '速度', '重力'])},
    {t: '分叉倍率', closed: true, sumParts: () => ({lead: '全部', v: '1.00', u: '倍'}), rows: ones(['寿命', '角度', '数量', '线宽', '速度', '重力'])}
  ];
}
function spkEmitMods(sc, n) {
  const e = n.e, par = e.parent && SPK.emitters.find(x => x.id === e.parent);
  const R = (lab, a, min, max, step, unit, log) => ({k: 'range', lab, unit, min, max, step, v: [a[0], a[1]], ex: a[2], log});
  const mods = [];
  if (par) mods.push({t: '触发', rows: [
    {k: 'ro', lab: '父发射器', unit: '', v: () => par.name.replace('｜', ' '), note: () => '', text: true},
    {lab: '触发时刻', unit: '', min: 0, max: 1, step: .01, v: +e.event.toFixed(2)},
    {lab: '触发概率', unit: '', min: 0, max: 1, step: .01, v: +e.probability.toFixed(2)},
    {lab: '每次生成', unit: '个', min: 1, max: 32, step: 1, v: e.children},
    {lab: '继承速度', unit: '倍', min: 0, max: 1, step: .01, v: e.inherit}]});
  else mods.push({t: '生成', rows: [
    {lab: '数量', unit: '个', min: 0, max: 20000, step: 1, v: e.count},
    {lab: '爆发占比', unit: '', min: 0, max: 1, step: .01, v: e.burstShare},
    {lab: '发射范围', unit: 'mm', min: 0, max: 50, step: .01, v: +(e.extent * 1000).toFixed(2)},
    {lab: '随机种子', unit: '', min: 0, max: 999999, step: 1, v: e.seed}]});
  /* §9：只有一个参数的「寿命」不做成模块，放进「运动」 */
  mods.push({t: '运动', rows: [
    R('寿命', e.life, .005, .5, .001, 's', true),
    R('速度', e.speed, .01, 5, .01, 'm/s', true),
    {lab: '阻力', unit: '1/s', min: 0, max: 30, step: .1, v: +e.drag.toFixed(1)},
    {lab: '重力', unit: 'm/s²', min: -10, max: 10, step: .01, v: +e.gravity[2].toFixed(2)},
    {k: 'seg', lab: '方向', opts: ['球面', '锥形'], v: e.directionMode === 'sphere' ? '球面' : '锥形', affects: true},
    {lab: '锥角', unit: '°', min: 0, max: 180, step: 1, v: e.cone, if: P => P.get('方向') === '锥形', dep: '方向', depWhy: '方向不是「锥形」时无效', depWhyS: '方向非锥形时无效'}]});
  mods.push({t: '大小与亮度', rows: [
    R('大小', e.size, 0, 3, .01, '倍'),
    R('亮度', e.power, 0, 4, .01, '倍'),
    {lab: '亮度增益', unit: '', min: 0, max: 10000, step: 1, v: Math.round(e.gain)},
    {k: 'curve', lab: '大小曲线', v: e.sizeCurve.map(p => [+p[0].toFixed(2), +p[1].toFixed(2)])},
    {k: 'curve', lab: '亮度曲线', v: e.brightCurve.map(p => [+p[0].toFixed(2), +p[1].toFixed(3)])}]});
  const shp = {line: '线条', point: '点', fragment: '碎片'}[e.shape];
  const frag = P => P.get('形状') === '碎片', fw = '形状不是「碎片」时无效', fs = '形状非碎片时无效';
  mods.push({t: '外形', rows: [
    {k: 'seg', lab: '形状', opts: ['线条', '点', '碎片'], v: shp, affects: true},
    {lab: '长宽比', unit: '', min: 1, max: 10, step: .1, v: +e.aspect.toFixed(1), if: frag, dep: '形状', depWhy: fw, depWhyS: fs},
    {lab: '旋转', unit: '°/s', min: 0, max: 360, step: 1, v: e.spin, if: frag, dep: '形状', depWhy: fw, depWhyS: fs},
    {lab: '扭转', unit: '°', min: 0, max: 180, step: 1, v: e.twist, if: frag, dep: '形状', depWhy: fw, depWhyS: fs},
    {lab: '线宽', unit: 'mm', min: 0, max: 10, step: .01, v: +(e.width * 1000).toFixed(2)},
    {lab: '收尖', unit: '', min: 0, max: 1, step: .01, v: +e.taper.toFixed(2)},
    {lab: '拖尾时长', unit: 's', min: 0, max: .1, step: .001, v: +e.history.toFixed(3)}]});
  mods.push({t: '气流', closed: true, rows: [
    {lab: '跟随气流', unit: '', min: 0, max: 1, step: .01, v: e.fieldCoupling},
    {lab: '噪波', unit: 'mm', min: 0, max: 2, step: .01, v: +(e.noise * 1000).toFixed(2)},
    {lab: '噪波频率', unit: 'Hz', min: 0, max: 60, step: 1, v: e.noiseHz}]});
  mods.push({t: '成簇', closed: true, rows: [
    {lab: '每簇数量', unit: '个', min: 1, max: 256, step: 1, v: e.clusterSize},
    {lab: '成簇概率', unit: '', min: 0, max: 1, step: .01, v: +e.clusterProbability.toFixed(2)},
    {lab: '簇宽', unit: 'mm', min: 0, max: 50, step: .1, v: +(e.clusterWidth * 1000).toFixed(1)},
    {lab: '簇方向', unit: '', min: 0, max: 1, step: .01, v: +e.clusterDirection.toFixed(2)}]});
  return mods;
}
/* 每层（仙女棒是整体）的输出设置：检查器里最后一个模块「输出」 */
function outModule(sc, n) {
  const o = n.kids.find(k => k.type === 'output'); if (!o) return [];
  const rows = outMods(sc, o).flatMap(m => m.rows);
  return [{t: '输出', closed: true, rows, sumParts: P => ({lead: P.get('单格'), v: String(Math.ceil(Math.round((o.tl.out - o.tl.in) * (sc.fps || 30)) / P.get('每张'))), u: '张'})}];
}
/* §9：只有一个参数的模块不做成模块，并进前面那个模块（第一个就并进后面那个）；整个对象只有一个模块时照旧 */
function mergeSingles(mods) {
  if (mods.length < 2) return mods;
  const out = mods.map(m => ({...m, rows: [...m.rows]}));
  for (let i = 0; i < out.length; i++) {
    if (out.length < 2 || out[i].rows.length !== 1 || !['num', 'range', undefined].includes(out[i].rows[0].k)) continue;   /* 轨迹联动（勾选列表）保留成模块：评审把它当成了功能缺失 */
    const host = out[i - 1] || out[i + 1];
    if (out[i - 1]) host.rows.push(out[i].rows[0]); else host.rows.unshift(out[i].rows[0]);
    out.splice(i, 1); i--;
  }
  return out;
}
function paramsFor(sc, n) { return mergeSingles(paramsFor0(sc, n)); }
function paramsFor0(sc, n) {
  if (n.type === 'output') return outMods(sc, n);
  if (sc.key === 'spk') return n.type === 'group' ? spkRootMods().concat(outModule(sc, n)) : spkEmitMods(sc, n);
  if (n.type === 'group') return kikuRootMods();
  if (n.type === 'layer') return layerMods(sc, n).concat(outModule(sc, n));
  if (n.custom) return kikuEmitMods({data: '火花'});
  return kikuEmitMods(n);
}

/* ---------- 参数状态：默认值、打开时、上次保存、上次导出 四个基准 ---------- */
const PS = {};      // key -> state
const MO = {};      // 模块展开、依赖组「查看」状态
const MOG = {};     // 1366：按模块名记住的展开状态
/* 各类对象最常用的模块（1366 下默认展开它） */
function mainMod(P) {
  const [sk, id] = P.prefix.split('|'), sc = SC[sk], f = sc && find(sc, id); if (!f) return '';
  const n = f.n;
  if (n.type === 'layer') return '时间与缩放';
  if (n.type === 'group') return sk === 'spk' ? '时间' : '整体';
  return sk === 'spk' ? '大小与亮度' : '生成';
}
function parseRnd(t) {
  const m = (t || '').replace(/^随机▸?/, '').match(/^±([0-9.]+)([^±]*)(.*)$/);
  return m ? {rndV: +m[1], rndU: m[2], rndRest: m[3]} : {rndV: 0, rndU: '%', rndRest: ''};
}
const rndTxt = s => s.rndV || s.rndRest ? `随机 ±${s.rndV}${s.rndU}${s.rndRest ? ' ' + s.rndRest : ''}` : '随机';
const rndMax = s => s.rndU === '%' ? 100 : s.rndU === '°' ? 180 : s.rndU === 'K' ? 1000 : +(s.max - s.min).toFixed(3);
const valOf = s => [s.v, s.rnd ? s.rndV : null, s.ex !== undefined ? s.ex : null];
function st(k, r, ui) {
  if (!PS[k]) {
    const s = {v: clone(r.v), def: clone(r.def !== undefined ? r.def : r.v), lab: r.lab, kind: r.k || 'num', log: !!r.log,
      min: r.min, max: r.max, step: r.step, unit: r.unit || '', lock: false, ui: !!ui, sub: false, ci: 1,
      rnd: r.rnd !== undefined && r.rnd !== '', ex: r.ex, sug: r.sug || null, ...(r.rnd ? parseRnd(r.rnd) : {}),
      ifFn: r.if || null, disFn: r.dis || null, ctx: k.split('|').slice(0, 2).join('|')};
    const now = valOf(s);
    s.defV = [s.def, s.rnd ? s.rndV : null, s.ex !== undefined ? s.ex : null];
    s.openV = clone(now); s.baseV = clone(now); s.expV = clone(now);
    /* 上次导出时的值和现在不同（示例数据）：这一项会列进「为什么需重新导出」 */
    const [sk, id, mod] = k.split('|'), sc0 = SC[sk], f0 = sc0 && sc0.exp0 && find(sc0, id);
    if (f0 && sc0.exp0[`${f0.n.name}|${mod}|${s.lab}`] !== undefined) s.expV = [sc0.exp0[`${f0.n.name}|${mod}|${s.lab}`], s.expV[1], s.expV[2]];
    PS[k] = s;
  }
  return PS[k];
}
const posPc = (s, v) => s.log ? (clamp(Math.log(v / s.min) / Math.log(s.max / s.min), 0, 1) * 100).toFixed(2) + '%' : pc(v, s.min, s.max);
const isND = s => !['ro'].includes(s.kind) && !same(valOf(s), s.defV);       // 非默认
const isEd = s => !['ro'].includes(s.kind) && !same(valOf(s), s.openV);      // 本次改过（和打开时比）
const isChg = s => isND(s) || isEd(s);
const isDirty = s => !s.ui && !same(valOf(s), s.baseV);                     // 未保存
const isStaleP = s => !s.ui && !same(valOf(s), s.expV) && isLive(s);         // 导出后又改过（不进导出的项不算）
const fmtS = (s, v) => v === undefined || v === null ? '' : Array.isArray(v) ? (Array.isArray(v[0]) ? '曲线' : typeof v[0] === 'boolean' ? v.map(x => x ? '开' : '关').join('、') : v.map(x => fmt(x, s.step)).join('–')) : typeof v === 'boolean' ? (v ? '开' : '关') : typeof v === 'number' ? fmt(v, s.step) : String(v);
const fmtU = (s, v) => fmtS(s, v) + (s.unit && typeof v !== 'boolean' && !(Array.isArray(v) && Array.isArray(v[0])) ? ' ' + s.unit : '');

function ctxOf(prefix, mods) {
  const keys = {};
  mods.forEach(m => m.rows.forEach(r => { const k = `${prefix}|${m.t}|${r.lab}`; if (!keys[r.lab]) keys[r.lab] = k; st(k, r, prefix.startsWith('view')); }));
  return (CTX[prefix] = {prefix, keys, get: lab => keys[lab] ? PS[keys[lab]].v : undefined});
}
const CTX = {};
/* 这一项现在进不进导出：被开关收起（if）或因别的参数失效（dis）时不进 */
const isLive = s => { const P = CTX[s.ctx]; if (!P) return true; try { return !(s.ifFn && !s.ifFn(P)) && !(s.disFn && s.disFn(P)); } catch (_) { return true; } };

/* ---------- 撤销栈：每步带说明与位置，用于撤销反馈 ---------- */
function histOf(k) {
  if (k.startsWith('sheet') || k.startsWith('view')) return SHEET_H;
  return (SC[k.split('|')[0]] || cur()).H;
}
const SHEET_H = {u: [], r: []};
function pushH(entry, k) { const H = histOf(k); H.u.push(entry); H.r.length = 0; if (H.u.length > 200) H.u.shift(); onHist(); }
function setField(k, f, v) { const s = PS[k]; if (!s) return; s[f] = clone(v); syncRow(k); }
function change(k, f, v, push = true) {
  const s = PS[k]; if (!s) return;
  if (f === 'v' && s.kind === 'num') v = roundV(s, v);
  const old = clone(s[f]); if (same(old, v)) return;
  if (push) pushH({k, f, old, v: clone(v)}, k);
  setField(k, f, v);
  onParamChange(k);
}
function roundV(s, v) { v = clamp(Number(v), s.min, s.max); return Number(v.toFixed(Math.min(dec(s.step) + 1, 4))); }
const PEND = {};
function begin(k, f = 'v') { const id = k + '#' + f; if (!(id in PEND) && PS[k]) PEND[id] = clone(PS[k][f]); }
function commit(k, f = 'v') {
  const id = k + '#' + f; if (!(id in PEND)) return;
  const old = PEND[id]; delete PEND[id];
  if (PS[k] && !same(PS[k][f], old)) { pushH({k, f, old, v: clone(PS[k][f])}, k); afterCommit(k); if (UI.view === 'main' && !k.startsWith('view|') && !k.startsWith('sheet')) { renderStatus(); refreshStaleMarks(); } }   /* 提交后状态栏马上更新 */
}
function cancelPend(k, f = 'v') { const id = k + '#' + f; if (!(id in PEND)) return false; setField(k, f, PEND[id]); delete PEND[id]; onParamChange(k); return true; }
function descOf(e, back) {
  if (e.fn) return e.desc || '';
  const s = PS[e.k]; if (!s) return '';
  const name = e.f === 'rndV' ? s.lab + ' 随机幅度' : e.f === 'ex' ? s.lab + ' 分布' : s.lab;
  const a = back ? e.v : e.old, b = back ? e.old : e.v;
  if (s.kind === 'curve' && e.f === 'v') return `${name} ${curveDiff(s, a, b)}`;
  const F = v => e.f === 'v' ? fmtU(s, v) : e.f === 'ex' ? fmt(v, .01) : String(v);
  return `${name} ${F(a)} → ${F(b)}`;
}
function applyHist(e, back) {
  if (e.fn) { back ? e.undo() : e.redo(); return; }
  setField(e.k, e.f, back ? e.old : e.v);
  onParamChange(e.k); afterCommit(e.k, true);
}
function undo(sc) { const H = sc ? sc.H : (UI.view === 'sheet' ? SHEET_H : cur().H); const e = H.u.pop(); if (!e) return false; applyHist(e, true); H.r.push(e); onHist(); if (OV.toast && OV.toast._entry === e) closeToast(); undoFeedback(e, true); return true; }
function redo(sc) { const H = sc ? sc.H : (UI.view === 'sheet' ? SHEET_H : cur().H); const e = H.r.pop(); if (!e) return false; applyHist(e, false); H.u.push(e); onHist(); undoFeedback(e, false); return true; }

/* ---------- 参数行 HTML（§2 五列、§9） ---------- */
/* v3.1 第 16 条：一行最多一个改动标记——本次改过在左侧槽位画竖条；不是默认值只靠操作列常显的恢复按钮 */
const markHTML = '<span class="mk" aria-hidden="true"></span>';
const rstHTML = lab => `<button class="btn btn-icon rst" aria-haspopup="menu" aria-label="恢复 ${lab}" data-tip="恢复到打开时或默认">${ico('reset')}</button>`;
const lkHTML = (s, lab) => `<button class="lk" aria-pressed="${s.lock}" aria-label="锁定 ${lab}" data-tip="${s.lock ? '取消锁定' : '锁定，随机与套用模板时不改'}">${ico('lock')}</button>`;
/* 展开箭头：数值格右边；点开在下一行出分布（区间）或随机幅度的滑杆 */
const exnTip = (s, part) => part === 'ex' ? `分布 ${fmt(s.ex, .1)}` : rndTxt(s);
const exnHTML = (s, part) => `<button class="exn" data-sub="${part}" aria-expanded="${s.sub}" aria-label="${part === 'ex' ? '分布' : '随机幅度'}" data-tip="${exnTip(s, part)}">${ico('cd')}</button>`;
const stCls = s => `${isND(s) ? ' is-nd' : ''}${isEd(s) ? ' is-ed' : ''}`;
function rowHTML(P, m, r, o = {}) {
  const k = `${P.prefix}|${m.t}|${r.lab}`, s = PS[k], kind = r.k || 'num';
  const lab = esc(r.lab);
  const why = o.inert || (r.dis ? r.dis(P) : null), whyS = why ? (o.inertS || (r.disS && r.dis(P) ? r.disS : why)) : '';
  const dep = (o.dep ? ' is-dep' : '') + (o.depIn ? ' dep-in' : '');
  const dkA = o.depIn ? ` data-dk="${esc(o.depIn)}" data-dep="${esc(r.dep)}"` : '';
  const pl = `<span class="pl" data-help="${k}"><span class="plt">${lab}</span></span>`;
  const base = `prm${stCls(s)}${dep}${why ? ' is-dis' : ''}`;
  /* 停用：整行降透明度，悬停写原因（原因不塞进控件列） */
  const tipAttr = (why ? ` data-tip="${esc(why)}" aria-description="${esc(why)}"` : '') + dkA;
  if (kind === 'num') {
    const band = s.rnd && s.rndV && s.rndU === '%' ? `--ra:${pc(s.v * (1 - s.rndV / 100), s.min, s.max)};--rz:${pc(s.v * (1 + s.rndV / 100), s.min, s.max)}` : '';
    const sug = r.sug ? `<button class="btn btn-icon sug" data-act="${r.sug.act}" aria-label="${esc(r.sug.tip)}" data-tip="${esc(r.sug.tip)}">${ico('auto')}</button>` : '';
    const num = `<input class="num" type="text" inputmode="decimal" value="${fmt(s.v, s.step)}" aria-label="${lab} 数值"${why ? ' disabled' : ''}>`;
    return `<div class="${base}${s.rnd ? ' has-sub' : ''}${sug ? ' has-sug' : ''}" data-k="${k}" data-lab="${lab}" data-kind="num"${tipAttr}>
      ${markHTML}<div class="plw"><span class="nl">${pl}${lkHTML(s, lab)}</span></div>
      <div class="ctl1"><div class="sl${why ? ' is-disabled' : ''}" role="slider" tabindex="${why ? -1 : 0}" aria-label="${lab}" aria-valuemin="${s.min}" aria-valuemax="${s.max}" aria-valuenow="${s.v}" style="--v:${pc(s.v, s.min, s.max)};--d:${pc(s.def, s.min, s.max)};${band}">${band ? '<i class="sl-rb"></i>' : ''}<i class="sl-f"></i>${!same(s.v, s.def) ? '<i class="sl-d"></i>' : ''}<i class="sl-k"></i></div></div>
      <div class="vu">${why ? `<span class="dis-why">${esc(whyS)}</span>` : s.rnd ? `${num}<span class="u">${esc(s.unit)}</span>${exnHTML(s, 'rnd')}` : `${num}<span class="u">${esc(s.unit)}</span>`}</div>
      ${sug ? `<span class="actc">${rstHTML(lab)}${sug}</span>` : rstHTML(lab)}</div>${s.sub && s.rnd && !why ? subHTML(k, s, 'rnd') : ''}`;
  }
  if (kind === 'range') {
    /* 区间：数值格写「0.30–1.65」；「分布」改成数值格右边的展开箭头 */
    return `<div class="${base} range" data-k="${k}" data-lab="${lab}" data-kind="range"${tipAttr}>
      ${markHTML}<div class="plw"><span class="nl">${pl}${lkHTML(s, lab)}</span></div>
      <div class="ctl1"><div class="sl range" role="group" aria-label="${lab} 区间" style="--lo:${posPc(s, s.v[0])};--hi:${posPc(s, s.v[1])}"><i class="sl-f"></i><i class="sl-k lo" role="slider" tabindex="0" aria-label="${lab} 下限"></i><i class="sl-k hi" role="slider" tabindex="0" aria-label="${lab} 上限"></i></div></div>
      <div class="vu"><span class="vv"><input class="num lo" data-part="lo" type="text" value="${fmt(s.v[0], s.step)}" aria-label="${lab} 下限"><span class="dash">–</span><input class="num" data-part="hi" type="text" value="${fmt(s.v[1], s.step)}" aria-label="${lab} 上限"></span><span class="u">${esc(s.unit)}</span>${exnHTML(s, 'ex')}</div>
      ${rstHTML(lab)}</div>${s.sub ? subHTML(k, s, 'ex') : ''}`;
  }
  const crow = (inner, cls = '') => `<div class="${base} crow${cls}" data-k="${k}" data-lab="${lab}" data-kind="${kind}"${tipAttr}>${markHTML}<div class="plw"><span class="nl">${pl}</span></div><div class="ctl">${inner}</div>${rstHTML(lab)}</div>`;
  if (kind === 'seg') return crow(`<div class="seg sm" role="group" aria-label="${lab}">${r.opts.map(o2 => `<button data-v="${esc(o2)}" aria-pressed="${s.v === o2}" ${why ? 'disabled' : ''}>${esc(o2)}</button>`).join('')}</div>`);
  if (kind === 'sw') return crow(`<input class="sw" type="checkbox" role="switch" aria-label="${lab}" ${s.v ? 'checked' : ''} ${why ? 'disabled' : ''}>`);
  if (kind === 'sel') return crow(`<select class="sel boxed" aria-label="${lab}" ${why ? 'disabled' : ''}>${r.opts.map(o2 => `<option${s.v === o2 ? ' selected' : ''}>${esc(o2)}</option>`).join('')}</select>`);
  if (kind === 'chk') return crow(`<div class="clist">${r.opts.map((o2, i) => `<label class="ckl"><input class="chk" type="checkbox" data-i="${i}" ${s.v[i] ? 'checked' : ''}>${esc(o2)}</label>`).join('')}</div>`, ' top');
  if (kind === 'ro') {
    const v = r.v(P), note = r.note ? r.note(P) : '';
    return `<div class="prm ro" data-k="${k}" data-lab="${lab}" data-kind="ro"><div class="plw"><span class="nl">${pl}</span></div>${r.text ? `<span class="ro-t">${esc(v)}</span>` : `<span class="ro-n">${esc(note)}</span><div class="vu"><span class="num is-ro">${esc(v)}</span><span class="u">${esc(r.unit || '')}</span></div>`}</div>`;
  }
  if (kind === 'curve') return curveRowHTML(k, s, r);
  return '';
}
function subHTML(k, s, part) {
  if (part === 'rnd') {
    const mx = rndMax(s), stp = ['%', '°', 'K'].includes(s.rndU) ? 1 : s.step;
    return `<div class="prm sub" data-k="${k}" data-part="rnd" data-kind="sub"><div class="plw"><span class="pl"><span class="plt">随机幅度</span></span></div>
      <div class="ctl1"><div class="sl" role="slider" tabindex="0" aria-label="随机幅度" data-min="0" data-max="${mx}" data-step="${stp}" style="--v:${pc(s.rndV, 0, mx)}"><i class="sl-f"></i><i class="sl-k"></i></div></div>
      <div class="vu"><input class="num" type="text" value="${s.rndV}" aria-label="随机幅度数值"><span class="u">${esc(s.rndU || '')}</span></div></div>`;
  }
  return `<div class="prm sub" data-k="${k}" data-part="ex" data-kind="sub"><div class="plw"><span class="pl" data-tip="大于 1 时取值偏向下限"><span class="plt">分布</span></span></div>
    <div class="ctl1"><div class="sl" role="slider" tabindex="0" aria-label="分布" data-min="0.5" data-max="3" data-step="0.01" style="--v:${pc(s.ex, .5, 3)}"><i class="sl-f"></i><i class="sl-k"></i></div></div>
    <div class="vu"><input class="num" type="text" value="${fmt(s.ex, .01)}" aria-label="分布数值"><span class="u"></span></div></div>`;
}
const crvY = s => s.lab.replace('曲线', '');      /* 大小曲线 → 大小 */
const crvMax = s => Math.max(1, ...s.v.map(p => p[1]));
/* 曲线：横跨「控件 + 数值 + 单位」三列，高 96；纵轴刻度 0 和最大值。
   v3.2 第 8 条：横轴说明不再写在图里，读数一行「关键点 2/5　寿命 15 %　大小 0.90 倍」（「寿命」就是横轴，悬停写 0–100 %） */
function curveRowHTML(k, s, r) {
  const ci = clamp(s.ci, 0, s.v.length - 1), p = s.v[ci], y = crvY(s);
  return `<div class="prm curve${stCls(s)}" data-k="${k}" data-lab="${esc(r.lab)}" data-kind="curve">
    ${markHTML}<div class="plw"><span class="nl"><span class="pl" data-help="${k}"><span class="plt">${esc(r.lab)}</span></span></span></div>
    <div class="crv-w"><div class="crv-yl" aria-hidden="true"><span>${fmt(crvMax(s), .1)}</span><span>0</span></div><div class="crv" data-tip="拖动关键点，双击空白处加点" data-key="Delete 删点">${curveInner(s)}</div></div>
    ${rstHTML(esc(r.lab))}
    <div class="cx"><span class="cp">关键点 ${ci + 1}/${s.v.length}</span><span class="cg"><span class="lbl" data-tip="横轴：寿命 0–100 %">寿命</span><input class="num cf" data-f="0" value="${fmt(p[0] * 100, 1)}" aria-label="关键点在寿命中的位置"><span class="u">%</span></span><span class="cg"><span class="lbl">${esc(y)}</span><input class="num cf" data-f="1" value="${fmt(p[1], .01)}" aria-label="关键点${esc(y)}倍数"><span class="u">倍</span></span></div></div>`;
}
/* 曲线改动写成「关键点 3 大小 0.60 → 0.80」 */
function curveDiff(s, a, b) {
  const y = crvY(s);
  if (!Array.isArray(a) || !Array.isArray(b)) return '';
  if (a.length !== b.length) return `关键点 ${a.length} → ${b.length} 个`;
  const ch = a.map((p, i) => i).filter(i => !same(a[i], b[i]));
  if (!ch.length) return '';
  if (ch.length > 1) return `关键点 ${ch.map(i => i + 1).join('、')} 已改`;
  const i = ch[0], parts = [];
  if (a[i][0] !== b[i][0]) parts.push(`寿命 ${Math.round(a[i][0] * 100)} % → ${Math.round(b[i][0] * 100)} %`);
  if (a[i][1] !== b[i][1]) parts.push(`${y} ${fmt(a[i][1], .01)} → ${fmt(b[i][1], .01)}`);
  return `关键点 ${i + 1} ${parts.join('、')}`;
}
function curveInner(s) {
  const M = crvMax(s), Y = v => ((1 - v / M) * 100).toFixed(2);
  const pts = s.v.map(p => `${(p[0] * 100).toFixed(2)},${Y(p[1])}`).join(' ');
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path class="gl" d="M25 0V100M50 0V100M75 0V100M0 50H100M0 0H100"/><path class="ax" d="M0 0V100H100"/><polyline class="ln" points="${pts}"/></svg>`
    + s.v.map((p, i) => `<button class="crv-p${i === s.ci ? ' is-sel' : ''}" data-i="${i}" style="left:${(p[0] * 100).toFixed(2)}%;top:${Y(p[1])}%" aria-label="关键点 ${i + 1}"></button>`).join('');
}
/* 摘要（v3.3 第 5 条）：拆成三段落进五列网格——前面的字在控件列（右对齐，色带靠左），最后一个数值在数值列（和上下行的小数点对齐），单位在单位列。
   最后一项不是数值（「单次」「第 3 层」）时，整句右对齐到数值列末端 */
function modSummaryParts(P, m) {
  if (m.sumParts) return m.sumParts(P);
  if (m.sum) return {lead: m.sum(P)};
  const items = m.rows.filter(r => !r.if || r.if(P)).slice(0, UI.size === 1366 && !P.prefix.startsWith('sheet') ? 1 : 2).map(r => {
    const s = PS[`${P.prefix}|${m.t}|${r.lab}`]; if (!s || s.kind === 'ro' || s.kind === 'curve' || s.kind === 'chk') return null;
    return {lab: r.lab, v: fmtS(s, s.v), u: s.unit && typeof s.v !== 'boolean' ? s.unit : ''};
  }).filter(Boolean);
  if (!items.length) return {lead: ''};
  const last = items[items.length - 1], num = NUMRE.test(last.v) || /^-?\d+(\.\d+)?–-?\d+(\.\d+)?$/.test(last.v);
  const head = items.slice(0, -1).map(i => `${i.lab} ${i.v}${i.u ? ' ' + i.u : ''}`).join('　');
  return num ? {lead: (head ? head + '　' : '') + last.lab, v: last.v, u: last.u} : {lead: (head ? head + '　' : '') + `${last.lab} ${last.v}${last.u ? ' ' + last.u : ''}`};
}
function modSummary(P, m) {
  const S = modSummaryParts(P, m), wide = S.v === undefined || S.v === null;
  return `<span class="ms ms-l${wide ? ' wide' : ''}">${S.band || ''}<span class="mst">${esc(S.lead || '')}</span></span>`
    + (wide ? '' : `<span class="ms ms-v"><span class="num is-ro">${esc(S.v)}</span></span><span class="ms ms-u">${esc(S.u || '')}</span>`);
}
function modKeys(P, m) { return m.rows.map(r => `${P.prefix}|${m.t}|${r.lab}`).filter(k => PS[k] && PS[k].kind !== 'ro'); }
function modHTML(P, m, idx) {
  const mk = P.prefix + '|' + m.t, ks = modKeys(P, m), n = ks.filter(k => isChg(PS[k])).length;
  /* 1366：默认只展开当前对象最常用的那个模块和有改动的模块，其余折叠；展开 / 折叠按模块名记住，换一个对象照样有效。
     1920（v3.3 第 13 条）：没记过的模块先画成展开，renderInsp 量过高度以后按「运动 → 颜色 → 寿命 → 其余」展开到放满 */
  if (!(mk in MO) && !(idx !== undefined && UI.size !== 1366)) MO[mk] = idx === undefined ? !m.closed : (m.t in MOG ? MOG[m.t] : m.t === mainMod(P) || n > 0);
  const open = mk in MO ? MO[mk] : true, auto = !(mk in MO);
  let body = '', i = 0, hid = 0, hch = 0; const dks = [];
  while (i < m.rows.length) {
    const r = m.rows[i];
    if (r.dep) {
      const grp = []; while (i < m.rows.length && m.rows[i].dep === r.dep) grp.push(m.rows[i++]);
      if (grp[0].if(P)) { body += grp.map(x => rowHTML(P, m, x, {dep: true})).join(''); continue; }
      const gk = grp.map(x => `${P.prefix}|${m.t}|${x.lab}`), dk = mk + '|dep|' + r.dep, show = !!MO[dk];
      const why = r.depWhy || `「${r.dep}」关闭时无效`, whyS = r.depWhyS || `${r.dep}已关`;
      hid += grp.length; hch += gk.filter(k => isChg(PS[k])).length; dks.push(dk);
      /* v3.3 第 8 条：不再单独占一行「N 项已隐藏　查看」，改成标题行右侧的「+N」；收起的行照样画出来（隐藏），「仅已改」和搜索时可以露出已改的那几项 */
      body += grp.map(x => { const h = rowHTML(P, m, x, {dep: true, inert: why, inertS: whyS, depIn: dk}); return show ? h : h.replace('<div ', '<div hidden '); }).join('');
      continue;
    }
    if (!r.if || r.if(P)) body += rowHTML(P, m, r);
    i++;
  }
  const shown = dks.length && dks.every(dk => MO[dk]);
  const depTip = shown ? `收起这 ${hid} 个参数` : `${hid} 个参数已隐藏${hch ? `，${hch} 个已改` : ''}，点开显示`;
  const depBtn = hid ? `<button class="btn dep-n" data-act="depShow" data-dks="${esc(dks.join(','))}" aria-pressed="${shown}" aria-label="${esc(depTip)}" data-tip="${esc(depTip)}">+${hid}</button>` : '';
  return `<section class="mod${open ? '' : ' is-closed'}" data-mod="${esc(m.t)}" data-mk="${esc(mk)}"${auto ? ` data-auto="${m.closed ? 'closed' : 'open'}"` : ''}>
    <div class="mod-h" role="button" tabindex="0" aria-expanded="${open}">${ico('cr', 'chev')}<span class="mt">${esc(m.t)}</span>${modSummary(P, m)}${depBtn}<button class="btn btn-icon mrst" ${n ? '' : 'hidden'} aria-haspopup="menu" data-tip="恢复本模块的 ${n} 项" aria-label="恢复本模块">${ico('reset')}</button></div>
    <div class="mod-b">${body}</div></section>`;
}

/* 行内同步（拖动中不重绘整行） */
function syncRow(k) {
  const s = PS[k];
  $$(`.prm[data-k="${CSS.escape(k)}"]`).forEach(row => {
    const part = row.dataset.part;
    if (part === 'rnd' || part === 'ex') {
      const val = part === 'rnd' ? s.rndV : s.ex, sl = $('.sl', row), num = $('.num', row);
      sl.style.setProperty('--v', pc(val, +sl.dataset.min, +sl.dataset.max));
      if (document.activeElement !== num) num.value = part === 'ex' ? fmt(val, .01) : val;
      const head = row.previousElementSibling, b = head && $(`.exn[data-sub="${part}"]`, head);
      if (b) b.dataset.tip = exnTip(s, part);
      if (head) { head.classList.toggle('is-nd', isND(s)); head.classList.toggle('is-ed', isEd(s)); }
      return;
    }
    row.classList.toggle('is-nd', isND(s)); row.classList.toggle('is-ed', isEd(s));
    const kind = row.dataset.kind;
    if (kind === 'num') {
      const sl = $('.sl', row), num = $('.num', row);
      if (sl) {
        sl.style.setProperty('--v', pc(s.v, s.min, s.max)); sl.setAttribute('aria-valuenow', s.v);
        let d = $('.sl-d', sl); const show = !same(s.v, s.def);
        if (show && !d) { d = document.createElement('i'); d.className = 'sl-d'; sl.insertBefore(d, $('.sl-k', sl)); }
        if (!show && d) d.remove();
        if (s.rnd && s.rndV && s.rndU === '%') { sl.style.setProperty('--ra', pc(s.v * (1 - s.rndV / 100), s.min, s.max)); sl.style.setProperty('--rz', pc(s.v * (1 + s.rndV / 100), s.min, s.max)); }
      }
      if (document.activeElement !== num) { num.value = fmt(s.v, s.step); num.classList.remove('is-error'); }
    } else if (kind === 'range') {
      const sl = $('.sl', row);
      sl.style.setProperty('--lo', posPc(s, s.v[0])); sl.style.setProperty('--hi', posPc(s, s.v[1]));
      $$('.num', row).forEach(n => { if (document.activeElement !== n) { n.value = fmt(s.v[n.dataset.part === 'lo' ? 0 : 1], s.step); n.classList.remove('is-error'); } });
    } else if (kind === 'seg') $$('.seg button', row).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === s.v)));
    else if (kind === 'sw') $('.sw', row).checked = !!s.v;
    else if (kind === 'sel') $('select', row).value = s.v;
    else if (kind === 'chk') $$('.chk', row).forEach(c => { c.checked = !!s.v[+c.dataset.i]; });
    else if (kind === 'curve') {
      $('.crv', row).innerHTML = curveInner(s);
      const ci = clamp(s.ci, 0, s.v.length - 1), p = s.v[ci];
      $('.cp', row).textContent = `关键点 ${ci + 1}/${s.v.length}`;
      $$('.cf', row).forEach(c => { if (document.activeElement !== c) c.value = c.dataset.f === '0' ? fmt(p[0] * 100, 1) : fmt(p[1], .01); });
    }
  });
}
/* 恢复菜单：恢复到打开时 / 恢复默认 */
function restoreTo(k, which) {
  const s = PS[k], tgt = which === 'open' ? s.openV : s.defV, cur0 = valOf(s);
  if (same(cur0, tgt)) return;
  const apply = vals => { s.v = clone(vals[0]); if (s.rnd) s.rndV = vals[1]; if (s.ex !== undefined) s.ex = vals[2]; syncRow(k); onParamChange(k); afterCommit(k, true); };
  apply(tgt);
  pushH({fn: true, desc: s.kind === 'curve' ? `${s.lab} ${curveDiff(s, cur0[0], tgt[0])}` : `${s.lab} ${fmtU(s, cur0[0])} → ${fmtU(s, tgt[0])}`, k, undo: () => apply(cur0), redo: () => apply(tgt)}, k);
}
function restoreMenu(btn, keys, label) {
  const ks = keys.filter(k => PS[k]), ed = ks.filter(k => isEd(PS[k])), nd = ks.filter(k => isND(PS[k]));
  const one = ks.length === 1 ? PS[ks[0]] : null;
  const many = (which, list) => {
    const before = list.map(k => [k, valOf(PS[k])]), tgtOf = k => which === 'open' ? PS[k].openV : PS[k].defV;
    const apply = back => { before.forEach(([k, v0]) => { const s = PS[k], vals = back ? v0 : tgtOf(k); s.v = clone(vals[0]); if (s.rnd) s.rndV = vals[1]; if (s.ex !== undefined) s.ex = vals[2]; syncRow(k); onParamChange(k); }); afterCommit(list[0], true); };
    apply(false); pushH({fn: true, desc: `${label} ${list.length} 项恢复到${which === 'open' ? '打开时' : '默认'}`, k: list[0], undo: () => apply(true), redo: () => apply(false)}, list[0]);
  };
  openMenu(btn, [
    {head: `恢复 ${label}`},
    {t: '打开时', k: one ? (one.kind === 'curve' ? `${one.openV[0].length} 个点` : fmtU(one, one.openV[0])) : `${ed.length} 项`, dis: !ed.length, act: () => one ? restoreTo(ks[0], 'open') : many('open', ed)},
    {t: '默认', k: one ? (one.kind === 'curve' ? `${one.defV[0].length} 个点` : fmtU(one, one.defV[0])) : `${nd.length} 项`, dis: !nd.length, act: () => one ? restoreTo(ks[0], 'def') : many('def', nd)},
    ...(one && one.sug ? ['-', {t: '建议曝光', k: one.sug.v, act: () => suggestExp()}] : [])
  ], {align: 'right'});
}

/* ---------- 数值模型：一个数值框 / 滑杆对应的取值 ---------- */
function modelOf(el, idx) {
  const row = el.closest('.prm[data-k]'); if (!row) return null;
  const k = row.dataset.k, s = PS[k]; if (!s) return null;
  const part = row.dataset.part || el.dataset.part;
  if (part === 'rnd' || part === 'ex') {
    const sl = $('.sl', row), f = part === 'rnd' ? 'rndV' : 'ex';
    return {k, f, min: +sl.dataset.min, max: +sl.dataset.max, step: +sl.dataset.step, get: () => s[f],
      set: (v, push) => change(k, f, Number(clamp(v, +sl.dataset.min, +sl.dataset.max).toFixed(dec(+sl.dataset.step))), push), show: v => part === 'ex' ? fmt(v, .01) : String(v)};
  }
  if (s.kind === 'range') {
    const i = idx !== undefined ? idx : (part === 'lo' || el.classList.contains('lo')) ? 0 : 1;
    return {k, f: 'v', i, min: i ? s.v[0] : s.min, max: i ? s.max : s.v[1], step: s.step, get: () => s.v[i],
      set: (v, push) => { const a = clone(s.v); a[i] = Number(clamp(v, i ? s.v[0] : s.min, i ? s.max : s.v[1]).toFixed(dec(s.step))); change(k, 'v', a, push); }, show: v => fmt(v, s.step), absMin: s.min, absMax: s.max, log: s.log};
  }
  if (s.kind === 'curve') {
    /* 横轴读数按寿命百分比显示（0–100 %），纵轴是倍数 */
    const f = +el.dataset.f, ci = s.ci, pts = s.v, lo = f === 0 ? (ci === 0 ? 0 : ci === pts.length - 1 ? 1 : pts[ci - 1][0]) : 0;
    const hi = f === 0 ? (ci === 0 ? 0 : ci === pts.length - 1 ? 1 : pts[ci + 1][0]) : 1, sc = f === 0 ? 100 : 1;
    return {k, f: 'v', min: lo * sc, max: hi * sc, step: f === 0 ? 1 : .01, get: () => +(s.v[s.ci][f] * sc).toFixed(2),
      set: (v, push) => { const a = clone(s.v); a[s.ci][f] = Number(clamp(v / sc, lo, hi).toFixed(2)); change(k, 'v', a, push); }, show: v => f === 0 ? fmt(v, 1) : fmt(v, .01)};
  }
  return {k, f: 'v', min: s.min, max: s.max, step: s.step, get: () => s.v, set: (v, push) => change(k, 'v', v, push), show: v => fmt(v, s.step)};
}

/* 滑杆：一次拖动只记一步撤销；区间滑杆按离鼠标近的一端拖，两端重叠时看第一下往哪边拖 */
let DRAG = null;
const xFrac = (sl, e) => { const r = sl.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1); };
document.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  const t = e.target;
  const sl = t.closest('.prm .sl:not(.is-disabled)');
  if (sl) {
    e.preventDefault();
    let idx, pend = false;
    if (sl.classList.contains('range')) {
      const s = PS[sl.closest('.prm').dataset.k], x = xFrac(sl, e), w = sl.getBoundingClientRect().width;
      const lo = parseFloat(posPc(s, s.v[0])) / 100, hi = parseFloat(posPc(s, s.v[1])) / 100;
      const dl = Math.abs(x - lo) * w, dh = Math.abs(x - hi) * w;
      if (Math.abs(dl - dh) < 3 && Math.abs(lo - hi) * w < 8) pend = true;
      idx = dl < dh ? 0 : 1;
    }
    const knob = idx !== undefined ? $(idx ? '.sl-k.hi' : '.sl-k.lo', sl) : null;
    const M = modelOf(knob || sl, idx); if (!M) return;
    begin(M.k, M.f); sl.classList.add('is-active'); (knob || sl).focus({preventScroll: true});
    DRAG = {type: 'sl', sl, idx, M, pend, x0: e.clientX, id: e.pointerId};
    sl.setPointerCapture(e.pointerId); if (!pend) slMove(e); return;
  }
  const num = t.closest('.num:not(.is-ro):not(:disabled)');
  if (num && document.activeElement !== num && num.closest('.prm[data-k], [data-numdemo]')) {
    e.preventDefault();
    const M = num.closest('[data-numdemo]') ? demoModel(num) : modelOf(num); if (!M) return;
    DRAG = {type: 'num', num, M, x0: e.clientX, v0: M.get(), moved: false, id: e.pointerId, shift: e.shiftKey};
    num.setPointerCapture(e.pointerId); return;
  }
  const cp = t.closest('.crv-p');
  if (cp) {
    e.preventDefault();
    const row = cp.closest('.prm'), k = row.dataset.k, s = PS[k];
    s.ci = +cp.dataset.i; begin(k); syncRow(k);
    const np = $(`.crv-p[data-i="${s.ci}"]`, row); if (np) np.focus({preventScroll: true});
    DRAG = {type: 'crv', row, k, id: e.pointerId, crv: $('.crv', row), x0: e.clientX, px: s.v[s.ci][0]};
    DRAG.crv.setPointerCapture(e.pointerId); return;
  }
}, true);
/* 平时滑块跟着鼠标走；按住 Shift 时以当前值为新起点、每 4 px 走一步（精调）；松开 Shift 后从当前值按正常比例接着走，不跳 */
function slMove(e) {
  const d = DRAG, {sl, M} = d, x = xFrac(sl, e), w = sl.getBoundingClientRect().width || 1;
  const a = M.absMin !== undefined ? M.absMin : M.min, b = M.absMax !== undefined ? M.absMax : M.max;
  if (e.shiftKey && !d.fine) { d.fine = true; d.ax = e.clientX; d.av = M.get(); }
  else if (!e.shiftKey && d.fine) { d.fine = false; d.rel = true; d.ax = e.clientX; d.av = M.get(); }
  let v;
  if (d.fine) v = d.av + Math.round((e.clientX - d.ax) / 4) * M.step;
  else if (d.rel) v = M.log ? d.av * Math.pow(b / a, (e.clientX - d.ax) / w) : d.av + (e.clientX - d.ax) / w * (b - a);
  else v = M.log ? a * Math.pow(b / a, x) : a + x * (b - a);
  v = Math.round(v / M.step) * M.step;
  M.set(v, false);
}
document.addEventListener('pointermove', e => {
  if (!DRAG || e.pointerId !== DRAG.id) return;
  if (DRAG.type === 'sl') {
    if (DRAG.pend) { if (Math.abs(e.clientX - DRAG.x0) < 2) return; DRAG.pend = false; DRAG.idx = e.clientX < DRAG.x0 ? 0 : 1; }
    DRAG.M = modelOf(DRAG.idx !== undefined ? $(DRAG.idx ? '.sl-k.hi' : '.sl-k.lo', DRAG.sl) : DRAG.sl, DRAG.idx); slMove(e); return;
  }
  if (DRAG.type === 'num') {
    const d = DRAG, dx = e.clientX - d.x0;
    if (!d.moved && Math.abs(dx) < 3) return;
    if (!d.moved) { d.moved = true; if (d.M.k) begin(d.M.k, d.M.f); document.body.style.cursor = 'ew-resize'; d.num.classList.add('is-active'); }
    if (d.shift !== e.shiftKey) { d.shift = e.shiftKey; d.x0 = e.clientX; d.v0 = d.M.get(); }   /* 中途按下 / 松开 Shift：以当前值为新起点，不往回跳 */
    const range = (d.M.absMax ?? d.M.max) - (d.M.absMin ?? d.M.min);
    const per = e.shiftKey ? d.M.step : Math.max(d.M.step, range / 300);
    d.M.set(d.v0 + Math.round((e.clientX - d.x0) / (e.shiftKey ? 6 : 2)) * per, false);
    if (d.num.closest('[data-numdemo]')) d.num.value = d.M.show(d.M.get());
    return;
  }
  if (DRAG.type === 'crv') {
    const {crv, k} = DRAG, s = PS[k], r = crv.getBoundingClientRect(), i = s.ci, a = clone(s.v);
    let x = clamp((e.clientX - r.left) / r.width, 0, 1), y = clamp(1 - (e.clientY - r.top) / r.height, 0, 1);
    if (i === 0) x = 0; else if (i === a.length - 1) x = 1; else if (Math.abs(e.clientX - DRAG.x0) < 3) x = DRAG.px; else x = clamp(x, a[i - 1][0] + .01, a[i + 1][0] - .01);   /* 竖着拖不改横向位置 */
    a[i] = [+x.toFixed(2), +y.toFixed(2)];
    change(k, 'v', a, false);
  }
});
function endDrag(e) {
  if (!DRAG || e.pointerId !== DRAG.id) return;
  const d = DRAG; DRAG = null; document.body.style.cursor = '';
  if (d.type === 'sl') { d.sl.classList.remove('is-active'); commit(d.M.k, d.M.f); }
  else if (d.type === 'num') {
    d.num.classList.remove('is-active');
    if (d.moved) { if (d.M.k) commit(d.M.k, d.M.f); } else { d.num.focus(); d.num.select(); }
  } else if (d.type === 'crv') { commit(d.k); const p = $(`.crv-p[data-i="${PS[d.k].ci}"]`, d.row); if (p) p.focus({preventScroll: true}); }
}
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);
/* 拖动中按 Esc：回到拖动前，不记撤销 */
function cancelDrag() {
  if (!DRAG) return false;
  const d = DRAG; DRAG = null; document.body.style.cursor = '';
  if (d.type === 'sl') { d.sl.classList.remove('is-active'); cancelPend(d.M.k, d.M.f); }
  else if (d.type === 'num') { d.num.classList.remove('is-active'); if (d.M.k) cancelPend(d.M.k, d.M.f); else d.M.set(d.v0); }
  else if (d.type === 'crv') cancelPend(d.k);
  const at = d.type === 'sl' ? d.sl.closest('.prm:not(.vrow)') || d.sl : d.type === 'num' ? d.num.closest('.prm:not(.vrow)') || d.num : d.row;
  flashHint(at, '已取消');
  return true;
}

/* 数值框：单击输入，越界变红，离开后恢复 */
/* 整串必须是一个合法数字（「15」越界、「1.1*1.2」「2.5x」格式不对都不收），不按能解析的开头部分提交 */
const NUM_RE = /^\s*[-+]?(\d+(\.\d*)?|\.\d+)\s*$/;
function numCheck(t, M) {
  const s = t.value, v = Number(s), fmtBad = !NUM_RE.test(s), out = !fmtBad && (v < M.min - 1e-9 || v > M.max + 1e-9);
  t.classList.toggle('is-error', fmtBad || out);
  if (fmtBad) showTip(t, '<b>格式不对</b>只能输入数字', 'err');
  else if (out) showTip(t, `<b>超出范围</b>有效范围 ${M.show(M.min)}–${M.show(M.max)}`, 'err');
  else if (OV.tip && OV.tip.classList.contains('err')) hideTip();
  return fmtBad || out ? null : v;
}
document.addEventListener('input', e => {
  const t = e.target;
  if (!t.classList.contains('num') || t.classList.contains('is-ro') || t.classList.contains('tnum')) return;
  const M = t.closest('[data-numdemo]') ? demoModel(t) : modelOf(t); if (!M) return;
  numCheck(t, M);   /* 输入过程中只检查、不写入 */
});
document.addEventListener('focusout', e => {
  const t = e.target;
  if (!t.classList || !t.classList.contains('num') || t.classList.contains('is-ro') || t.classList.contains('tnum')) return;
  const M = t.closest('[data-numdemo]') ? demoModel(t) : modelOf(t); if (!M) return;
  if (t.dataset.esc) { delete t.dataset.esc; t.value = M.show(M.get()); t.classList.remove('is-error'); hideTip(); return; }
  const shown = M.show(M.get());
  if (t.value.trim() !== shown) {
    const v = numCheck(t, M);
    if (v === null) { t.value = shown; t.classList.remove('is-error'); hideTip(); flashHint(t, '输入无效，已恢复'); return; }
    if (M.k) begin(M.k, M.f); M.set(v, false);
  }
  t.value = M.show(M.get()); t.classList.remove('is-error'); hideTip();
  if (M.k) commit(M.k, M.f);
});
document.addEventListener('keydown', e => {
  const t = e.target;
  if (e.key === 'Escape' && (DRAG || TDRAG_ACTIVE())) { e.preventDefault(); e.stopPropagation(); cancelDrag() || cancelTlDrag(); return; }
  if (t.classList && t.classList.contains('num') && !t.classList.contains('is-ro')) {
    const M = t.closest('[data-numdemo]') ? demoModel(t) : modelOf(t); if (!M) return;
    if (e.key === 'Enter') { e.preventDefault(); if (t.value.trim() !== M.show(M.get()) && numCheck(t, M) === null) return; t.blur(); }   /* 不合法：留在框里、保留原值 */
    if (e.key === 'Escape') { if (M.k) cancelPend(M.k, M.f); t.dataset.esc = 1; t.blur(); e.stopPropagation(); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); M.set(M.get() + (e.key === 'ArrowUp' ? 1 : -1) * M.step * (e.shiftKey ? 10 : 1), true); t.value = M.show(M.get()); if (M.k) afterCommit(M.k); }
    return;
  }
  const sl = t.closest && (t.closest('.prm .sl-k[role=slider]') || (t.matches('.prm .sl[role=slider]') ? t : null));
  if (sl && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
    e.preventDefault(); e.stopPropagation();
    const M = modelOf(sl); if (!M) return;
    const st = M.step * (e.shiftKey ? 10 : 1);
    const v = e.key === 'Home' ? (M.absMin ?? M.min) : e.key === 'End' ? (M.absMax ?? M.max) : M.get() + (['ArrowRight', 'ArrowUp'].includes(e.key) ? st : -st);
    M.set(v, true); afterCommit(M.k);
    return;
  }
  if (t.classList && t.classList.contains('crv-p') && (e.key === 'Delete' || e.key === 'Backspace')) {
    const row = t.closest('.prm'), k = row.dataset.k, s = PS[k], i = +t.dataset.i;
    if (i > 0 && i < s.v.length - 1) { const a = clone(s.v); a.splice(i, 1); s.ci = i - 1; change(k, 'v', a, true); afterCommit(k); }
    e.preventDefault(); e.stopPropagation();
  }
}, true);

/* 双击参数名恢复默认；双击曲线空白处加点 */
document.addEventListener('dblclick', e => {
  const pl = e.target.closest('.prm:not(.sub) .pl[data-help]');
  if (pl) {
    const k = pl.closest('.prm').dataset.k, s = PS[k]; if (!s || s.kind === 'ro') return;
    restoreTo(k, 'def'); hideTip(); return;
  }
  const crv = e.target.closest('.crv');
  if (crv && !e.target.closest('.crv-p')) {
    const row = crv.closest('.prm'), k = row.dataset.k, s = PS[k], r = crv.getBoundingClientRect();
    const x = +clamp((e.clientX - r.left) / r.width, .01, .99).toFixed(2), y = +clamp(1 - (e.clientY - r.top) / r.height, 0, 1).toFixed(2);
    const a = clone(s.v); let i = a.findIndex(p => p[0] > x); if (i < 0) i = a.length - 1;
    a.splice(i, 0, [x, y]); s.ci = i; change(k, 'v', a, true); afterCommit(k);
  }
  if (e.target.closest('#splitter')) { delete UI.treeH[UI.scene + UI.size]; layoutLeft(); }
});

/* ---------- 浮层：菜单、提示、确认弹窗、撤销提示条、快捷键表；比面板高一级 ---------- */
const OV = {menu: null, anchor: null, tip: null, tipT: 0, dlg: null, toast: null, toastT: 0, keys: null, hint: null, hintT: 0};
const ovlFor = el => (el && el.closest && el.closest('#kitSheet')) ? $('#ovlSheet') : $('#ovlApp');
const hostRect = el => (el && el.closest && el.closest('#kitSheet')) ? {left: 0, top: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight} : $('#app').getBoundingClientRect();
/* §12 提示框：离触发点 8 px，带 6 px 小三角；检查器里的提示出在检查器左侧（画面上方），不盖住同一组的参数。菜单离触发点 4 px，不带三角 */
function placeNear(el, anchor, align = 'left') {
  const a = anchor.getBoundingClientRect(), H = hostRect(anchor), w = el.offsetWidth, h = el.offsetHeight;
  const tip = el.classList.contains('tip'), gap = tip ? 8 : 4;
  el.classList.remove('at-below', 'at-above', 'at-left', 'at-right');
  const insp = UI.view === 'main' && anchor.closest && anchor.closest('#insp');
  if (tip && insp && align !== 'right' && align !== 'below') {
    const I = insp.getBoundingClientRect(), top = clamp(a.top + a.height / 2 - h / 2, H.top + 8, H.bottom - h - 8);
    el.style.left = Math.max(H.left + 8, I.left - w - gap) + 'px'; el.style.top = top + 'px';
    el.classList.add('at-left'); el.style.setProperty('--ay', clamp(a.top + a.height / 2 - top - 4, 6, h - 14) + 'px');
    return;
  }
  let x = align === 'right' ? a.right - w : tip ? a.left + a.width / 2 - Math.min(w / 2, 20) : a.left;
  x = clamp(x, H.left + 8, H.right - w - 8);
  let y = a.bottom + gap, side = 'below';
  if (y + h > H.bottom - 8) { y = a.top - h - gap; side = 'above'; }
  y = Math.max(H.top + 8, y);
  el.style.left = x + 'px'; el.style.top = y + 'px';
  if (tip) { el.classList.add('at-' + side); el.style.setProperty('--ax', clamp(a.left + a.width / 2 - x - 4, 6, w - 14) + 'px'); }
}
function closeMenu(refocus) {
  if (!OV.menu) return;
  OV.menu.remove(); OV.menu = null;
  if (OV.anchor) { OV.anchor.classList.remove('is-open'); OV.anchor.setAttribute('aria-expanded', 'false'); if (refocus) OV.anchor.focus(); }
  OV.anchor = null;
}
function openMenu(anchor, items, opt = {}) {
  closeMenu(); hideTip();
  const m = document.createElement('div');
  m.className = 'menu' + (opt.cls ? ' ' + opt.cls : ''); m.setAttribute('role', 'menu');
  m.innerHTML = (opt.headHTML || '') + items.map((it, i) => it === '-' ? '<hr>' : it.head ? `<div class="mh">${esc(it.head)}</div>` : it.html0 ? it.html0 :
    `<button class="mi${it.sub ? ' two' : ''}"${it.exp ? ` data-exp="${it.exp}"` : ''} role="${it.chk !== undefined ? 'menuitemcheckbox' : 'menuitem'}" data-i="${i}" ${it.chk !== undefined ? `aria-checked="${it.chk}"` : ''} ${it.dis ? 'disabled' : ''}>${it.chk !== undefined || opt.checks ? `<span class="ck">${it.chk ? ico('check') : ''}</span>` : ''}<span class="mt2"><span>${it.html || esc(it.t)}</span>${it.sub ? `<span class="ms2">${esc(it.sub)}</span>` : ''}</span>${it.k ? `<span class="k">${esc(it.k)}</span>` : ''}${it.btn ? `<span class="mb">${esc(it.btn)}</span>` : ''}</button>`).join('');
  ovlFor(anchor).appendChild(m);
  placeNear(m, anchor, opt.align || 'below');
  m.addEventListener('click', ev => {
    const b = ev.target.closest('.mi'); if (!b || b.disabled) return;
    const it = items[+b.dataset.i];
    if (it.keep) { it.act && it.act(b); return; }
    closeMenu(); it.act && it.act();
  });
  OV.menu = m; OV.anchor = anchor; anchor.classList.add('is-open'); anchor.setAttribute('aria-expanded', 'true');
  if (!opt.noFocus) { const f = $('.mi:not(:disabled)', m); if (f) f.focus(); }
  return m;
}
function showTip(anchor, html, cls = '', align) {
  hideTip();
  const t = document.createElement('div');
  t.className = 'tip ' + cls; t.setAttribute('role', 'tooltip'); t.innerHTML = html;
  ovlFor(anchor).appendChild(t); placeNear(t, anchor, align);
  OV.tip = t; return t;
}
function hideTip() { clearTimeout(OV.tipT); if (OV.tip) { OV.tip.remove(); OV.tip = null; } }
function helpHTML(k) {
  const s = PS[k]; if (!s) return '';
  const meta = [];
  if (s.kind === 'num' || s.kind === 'range') meta.push(`默认 ${fmtU(s, s.def)}`, `范围 ${fmt(s.min, s.step)}–${fmt(s.max, s.step)}`);
  if (s.kind === 'range') meta.push(`分布 ${fmt(s.ex, .01)}`);
  if (s.kind === 'seg' || s.kind === 'sel') meta.push(`默认 ${s.def}`);
  const ed = isEd(s) ? `<div class="meta"><span>打开时 ${esc(fmtU(s, s.openV[0]))}</span><span>现在 ${esc(fmtU(s, s.v))}</span></div>` : '';
  return `<b>${esc(s.lab)}</b>${esc(HELP[`${k.split('|')[2]}|${s.lab}`] || HELP[s.lab] || '')}${meta.length ? `<div class="meta">${meta.map(x => `<span>${x}</span>`).join('')}</div>` : ''}${ed}${['num', 'range', 'curve'].includes(s.kind) ? '<div class="meta"><span>双击名称恢复默认</span></div>' : ''}`;
}
let tipFor = null;
document.addEventListener('pointerover', e => {
  if (DRAG) return;
  const el = e.target.closest('[data-tip], [data-why], .pl[data-help], .tpl[data-big], .prm.is-ed .vu .num');
  if (el === tipFor) return;
  tipFor = el; clearTimeout(OV.tipT);
  if (OV.tip && !OV.tip.classList.contains('err') && !OV.tip.classList.contains('pin')) hideTip();
  if (!el || OV.menu && OV.menu.contains(el)) return;
  OV.tipT = setTimeout(() => {
    if (el.matches('.pl[data-help]')) showTip(el, helpHTML(el.dataset.help));
    else if (el.dataset.why !== undefined) showTip(el, staleWhyHTML(el.dataset.why), 'why');
    else if (el.matches('.num')) { const s = PS[el.closest('.prm').dataset.k]; if (s && document.activeElement !== el) showTip(el, `打开时 ${esc(fmtU(s, s.openV[0]))} → 现在 ${esc(fmtU(s, s.v))}`, 'sm'); }
    else if (el.dataset.big !== undefined) showTip(el, `<img src="${IMG.tpl_big[+el.dataset.big % 8]}" alt=""><span>${esc(el.dataset.name)}</span>`, 'big');
    else if (el.matches('.film-c')) { const im = $('img', el); showTip(el, `<img src="${im.src}" alt="" style="filter:${im.style.filter || 'none'}"><span>${esc(el.dataset.tip)}</span>`, 'film'); }   /* 胶片格悬停放大 */
    else showTip(el, `${esc(el.dataset.tip)}${el.dataset.key ? `<span class="k">${esc(el.dataset.key)}</span>` : ''}`, 'sm');   /* 快捷键用 data-key，不和参数键 data-k 混用 */
  }, el.matches('.pl[data-help]') ? 450 : 500);
});
/* 撤销 / 重做反馈：操作处短提示 + 短暂高亮 */
function flashHint(el, text) {
  clearTimeout(OV.hintT); if (OV.hint) { OV.hint.remove(); OV.hint = null; }
  if (el) { el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash'); setTimeout(() => el.classList.remove('is-flash'), 1000); }
  const anchor = el || $('#app'), t = document.createElement('div');
  t.className = 'tip sm hint'; t.setAttribute('role', 'status'); t.textContent = text;
  ovlFor(anchor).appendChild(t); placeNear(t, anchor);
  OV.hint = t; OV.hintT = setTimeout(() => { if (OV.hint) { OV.hint.remove(); OV.hint = null; } }, 1800);
}
/* 只用于不能撤销的操作 */
function openDialog(o, anchor) {
  closeMenu(); hideTip(); closeDialog();
  const host = anchor || $('#app'), H = hostRect(host), ov = ovlFor(host);
  const sc = document.createElement('div'); sc.className = 'scrim';
  Object.assign(sc.style, {left: H.left + 'px', top: H.top + 'px', width: H.width + 'px', height: H.height + 'px'});
  const d = document.createElement('div'); d.className = 'dialog'; d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'dlgT');
  /* 按钮：默认「取消 / 确定」两个；o.buttons 可给出多个（按显示顺序），o.on(r) 收到被按的那个 */
  const btns = o.buttons || [{t: '取消', r: '0', cls: 'btn-2'}, {t: o.ok, r: '1', cls: o.danger ? 'btn-danger' : 'btn-1'}];
  d.innerHTML = `<h2 id="dlgT">${esc(o.title)}</h2><p>${o.body}</p><div class="acts">${btns.map(b => `<button class="btn ${b.cls}" data-r="${b.r}">${esc(b.t)}</button>`).join('')}</div>`;
  ov.appendChild(sc); ov.appendChild(d);
  d.style.left = (H.left + (H.width - d.offsetWidth) / 2) + 'px'; d.style.top = (H.top + H.height * .32) + 'px';
  const back = document.activeElement;
  const done = r => { closeDialog(); if (back && back.isConnected) back.focus(); if (o.on) o.on(r); else if (r === '1') o.onOk(); };
  d.addEventListener('click', ev => { const b = ev.target.closest('[data-r]'); if (b) done(b.dataset.r); });
  d.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { ev.stopPropagation(); done('0'); }
    if (ev.key === 'Tab') { const bs = $$('button', d); const i = bs.indexOf(document.activeElement); ev.preventDefault(); bs[(i + (ev.shiftKey ? bs.length - 1 : 1)) % bs.length].focus(); }
  });
  sc.addEventListener('click', () => done('0'));
  OV.dlg = [sc, d]; $(`[data-r="${o.focus || '0'}"]`, d).focus();
}
function closeDialog() { if (OV.dlg) { OV.dlg.forEach(x => x.remove()); OV.dlg = null; } }
/* 提示条（§12）：统一出在外壳提示区——外壳顶栏下方、当前页面主区（画面）顶部居中；显示 12 秒，鼠标悬停时不消失。全表里出在全表底部 */
function toast(text, o = {}) {
  closeToast();
  if (typeof o === 'function') o = {undo: o};
  /* 外壳提供 window.shellToast：所有提示条进同一个提示区（一次一条）；「撤销」作为提示条上的命令 */
  if (typeof window.shellToast === 'function') {
    const t = window.shellToast(text, {ms: o.ms, near: o.near, action: o.undo ? {label: '撤销', fn: o.undo} : o.action});
    if (t) { t._entry = o.entry || null; OV.toast = t; }
    return t;
  }
  const near = UI.view === 'sheet' ? (o.near && o.near.closest && o.near.closest('#kitSheet') ? o.near : $('#kitSheet')) : $('#mid');
  const t = document.createElement('div');
  t.className = 'toast'; t.setAttribute('role', 'status'); t._entry = o.entry || null;
  t.innerHTML = `<span>${esc(text)}</span>${o.undo ? '<button class="btn btn-text sm" data-r="undo">撤销</button>' : ''}${o.action ? `<button class="btn btn-text sm" data-r="act">${esc(o.action.label)}</button>` : ''}<button class="btn btn-icon sm" data-r="x" aria-label="关闭">${ico('x')}</button>`;
  ovlFor(near).appendChild(t);
  const R = near.id === 'kitSheet' ? hostRect(near) : near.getBoundingClientRect(), H = hostRect(near);
  t.style.maxWidth = Math.min(560, Math.max(220, R.width - 16)) + 'px';
  t.style.left = clamp(R.left + (R.width - t.offsetWidth) / 2, H.left + 8, H.right - t.offsetWidth - 8) + 'px';
  if (near.id === 'kitSheet') t.style.top = (R.bottom - t.offsetHeight - 12) + 'px';
  else { const sh = $('#shell'), top = Math.max(R.top, H.top + (sh ? sh.offsetHeight : 0)); t.style.top = (top + 8) + 'px'; }
  t.addEventListener('click', ev => { const b = ev.target.closest('[data-r]'); if (!b) return; if (b.dataset.r === 'undo' && o.undo) o.undo(); if (b.dataset.r === 'act' && o.action) o.action.fn(); closeToast(); });
  const arm = () => { clearTimeout(OV.toastT); OV.toastT = setTimeout(closeToast, o.ms || 12000); };
  t.addEventListener('mouseenter', () => clearTimeout(OV.toastT));
  t.addEventListener('mouseleave', arm);
  OV.toast = t; arm();
  return t;
}
function closeToast() { clearTimeout(OV.toastT); if (OV.toast) { OV.toast.remove(); OV.toast = null; } }
const KEYS = [['空格', '播放 / 暂停'], ['R', '重播'], [', .', '上一帧 / 下一帧'], ['← →', '逐帧；结构树中收起展开'], ['Shift ← →', '走 10 帧'], ['[ ]', '导出范围入点 / 出点'], ['Esc', '取消拖动；退出只看'],
  ['S', '加入 / 移出只看'], ['Alt 单击', '只看此项'], ['H', '隐藏 / 显示'], ['F', '精简布局'], ['L', '显示 / 隐藏左栏'], ['P', '显示 / 隐藏右栏'],
  ['Ctrl S', '保存'], ['Ctrl Z', '撤销'], ['Ctrl Y', '重做'], ['↑ ↓', '上一行 / 下一行'], ['F2', '改名'], ['Delete', '删除选中的层或发射器'], ['Shift', '拖动时精调'], ['?', '快捷键表']];
const keysHTML = () => `<h2>快捷键<span class="sp"></span><button class="btn btn-icon sm" data-r="x" aria-label="关闭">${ico('x')}</button></h2><dl>${KEYS.map(([k, d]) => `<dt>${k.split(' ').map(x => `<kbd>${x}</kbd>`).join('')}</dt><dd>${d}</dd>`).join('')}</dl>`;
function openKeys(anchor) {
  if (OV.keys) { closeKeys(); return; }
  const host = anchor || $('#app'), H = hostRect(host), k = document.createElement('div');
  k.className = 'keys'; k.setAttribute('role', 'dialog'); k.setAttribute('aria-label', '快捷键'); k.innerHTML = keysHTML();
  ovlFor(host).appendChild(k);
  k.style.left = (H.left + (H.width - k.offsetWidth) / 2) + 'px'; k.style.top = (H.top + Math.max(16, (H.height - k.offsetHeight) / 2)) + 'px';
  k.addEventListener('click', ev => { if (ev.target.closest('[data-r]')) closeKeys(); });
  OV.keys = k; $('[data-r]', k).focus();
}
function closeKeys() { if (OV.keys) { OV.keys.remove(); OV.keys = null; } }
document.addEventListener('pointerdown', e => {
  if (OV.menu && !OV.menu.contains(e.target) && !(OV.anchor && OV.anchor.contains(e.target))) closeMenu();
  if (OV.keys && !OV.keys.contains(e.target)) closeKeys();
  if (OV.tip && OV.tip.classList.contains('pin') && !e.target.closest('.pl')) hideTip();
});
document.addEventListener('keydown', e => {
  if (!OV.menu || !OV.menu.contains(e.target)) return;
  const bs = $$('.mi:not(:disabled), .mopt input', OV.menu), i = bs.indexOf(document.activeElement);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); bs[(i + (e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length].focus(); }
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(true); }
  if (e.key === 'Tab') closeMenu();
}, true);

/* ---------- 主屏：结构树 ---------- */
function treeHTML(sc, withAdd = true) {
  const lit = litSet(sc), stale = sc.key === UI.scene ? staleLayers(sc) : new Set();
  const rows = rowsOf(sc);
  let h = rows.map(({n, lv}) => {
    const has = n.kids.length > 0, sel = n.id === sc.sel, dim = lit && !lit.has(n.id);
    const no = n.no != null ? `<span class="no">${esc(n.no)}</span>` : '';
    const cnt = '';   /* v2.3：树根不写「3 层」，下面已经列出来了 */
    const nmT = n.type === 'group' ? sc.name : n.name;   /* 第一行就是效果本身：写效果名，选中它就是整体参数 */
    const stl = stale.has(n.id) ? `<svg class="i stl" aria-label="需重新导出" data-why="${n.id}"><use href="#i-stale"/></svg>` : '';
    const vis = (n.type === 'layer' || n.type === 'emitter')
      ? `<button class="btn btn-icon eye" aria-pressed="${n.show}" aria-label="显示" data-tip="${n.show ? '隐藏' : '显示'}" data-key="H">${ico(n.show ? 'eye' : 'eyeoff')}</button><button class="btn btn-icon solo" aria-pressed="${n.solo}" aria-label="只看" data-tip="${n.solo ? '移出只看' : '加入只看'}；Alt+单击只看此项" data-key="S">${ico(n.solo ? 'soloon' : 'solo')}</button>`
      : '<span class="ph2"></span>';
    return `<div class="trow t-${n.type}${sel ? ' is-sel' : ''}${n.show ? '' : ' is-off'}${dim ? ' is-dim' : ''}" role="treeitem" tabindex="${sel ? 0 : -1}" data-id="${n.id}" aria-level="${lv + 1}" aria-selected="${sel}"${has ? ` aria-expanded="${n.open}"` : ''} style="--lv:${lv}">`
      + `<span class="chev${has ? '' : ' none'}" aria-hidden="true">${ico('cr')}</span>${n.type === 'layer' ? '' : ico(n.icon, 'ty')}<span class="nm">${no}<span class="tx" title="${esc(nmT)}">${esc(nmT)}</span>${cnt}${stl}</span>`
      + `<span class="acts">${vis}<button class="btn btn-icon more" aria-label="更多操作" aria-haspopup="menu" data-tip="更多操作">${ico('more')}</button></span></div>`;
  }).join('');
  if (UI.treeQ.trim() && sc.key === UI.scene && rows.length === 1) h += `<div class="none-hit">没有匹配「${esc(UI.treeQ.trim())}」的层或发射器</div>`;
  if (!withAdd) return h;
  return h + `<div class="trow t-add" role="none"><button class="btn tbtn" data-act="addLayer" aria-haspopup="menu">${ico('plus')}加层${ico('cd', 'dd')}</button><button class="btn tbtn" data-act="addEmit">${ico('plus')}加发射器</button></div>`;
}
function renderTree(sc = cur(), el = $('#tree'), focus = false) {
  const top = el.scrollTop;
  el.dataset.scene = sc.key; el.innerHTML = treeHTML(sc, el.id !== 'tree'); el.scrollTop = top;
  if (el.id === 'tree') {
    /* 按效果的总行数（全部展开时）判断，不看当前可见行数：折叠以后筛选框也还在 */
    let total = 0; const w = n => { if (n.type === 'output') return; total++; n.kids.forEach(w); }; w(sc.root);
    const q = $('#treeQ'); q.hidden = total <= 12 && !UI.treeQ;
  }
  if (focus) { const r = $('.trow.is-sel', el); if (r) r.focus({preventScroll: true}); }
}

/* ---------- 主屏：时间轴（§8；行与结构树展开的行一一对应） ---------- */
const X = (sc, t) => (t / sc.T * 100).toFixed(3) + '%';
/* 层的「开始时间」（检查器参数）：没打开过检查器时用文件里的值 */
function layerStart(sc, n) { const k = `${sc.key}|${n.id}|时间与缩放|开始时间`; return PS[k] ? PS[k].v : ((LAYER_V[n.name] || [0])[0]); }
const outOf = n => n.kids.find(k => k.type === 'output') || null;
/* 一行所在层的导出范围（仙女棒没有层，用整个效果的输出） */
function rangeOfRow(sc, n) { const L = n.type === 'layer' || n.type === 'group' ? n : (layerOf(sc, n.id) || sc.root), o = L && outOf(L); return o ? o.tl : null; }
/* 轨道（§8）：层行 6 px 实心条，发射器行 2 px 细条；超出导出范围的那一段降到 40 %；关键帧只画在当前行 */
function trackHTML(sc, n) {
  const tl = n.tl; if (!tl) return '';
  const span = `${tl.in.toFixed(2)}–${tl.out.toFixed(2)} s`, em = n.type === 'emitter', R = rangeOfRow(sc, n), len = tl.out - tl.in || 1;
  const pcIn = v => (clamp((v - tl.in) / len, 0, 1) * 100).toFixed(3) + '%';
  let xo = '';
  if (R) {
    if (R.in > tl.in) xo += `<i class="xo" style="left:0;width:${pcIn(R.in)}"></i>`;
    if (R.out < tl.out) xo += `<i class="xo" style="left:${pcIn(R.out)};right:0"></i>`;
  }
  /* 发射器的两端可拖（发射时段）；平时不画，悬停时亮一条细线 */
  const ends = em ? `<i class="bh in" data-drag="in" data-tip="发射时段入点 ${tl.in.toFixed(2)} s"></i><i class="bh out" data-drag="out" data-tip="发射时段出点 ${tl.out.toFixed(2)} s"></i>` : '';
  let h = `<div class="bar-e" data-drag="move" style="left:${X(sc, tl.in)};width:${X(sc, tl.out - tl.in)}" data-tip="${em ? '发射时段' : '时段'} ${span}，拖动平移">${xo}${ends}</div>`;
  (tl.keys || []).forEach(t => { h += `<i class="kf" style="left:${X(sc, t)}"></i>`; });
  return h;
}
function tlRowsHTML(sc) {
  const lit = litSet(sc);
  /* 效果名只在结构树第一行（§7）：时间轴从层（仙女棒从发射器）写起，缩进和结构树同一套（每级 16 px） */
  return rowsOf(sc).filter(r => r.n.type !== 'group').map(({n, lv}) => `<div class="tlrow t-${n.type}${n.id === sc.sel ? ' is-sel' : ''}${lit && !lit.has(n.id) ? ' is-dim' : ''}${n.show ? '' : ' is-off'}" data-id="${n.id}" style="--lv:${lv - 1}">`
    + `<div class="lab">${n.no != null ? `<span class="no">${esc(n.no)}</span>` : ''}${esc(n.name)}</div><div class="trk">${trackHTML(sc, n)}</div></div>`).join('');
}
function scaleHTML(sc) {
  let h = '';
  const n = Math.round(sc.T * 10), lab = sc.T <= 3 ? 5 : 10;
  for (let i = 0; i <= n; i++) {
    const s = i % 10 === 0, hh = i % 5 === 0;
    h += `<i class="tick${s ? ' s' : hh ? ' h' : ''}" style="left:${X(sc, i / 10)}"></i>`;
    if (i % lab === 0 && i / 10 < sc.T - .15) h += `<span class="tlab" style="left:${X(sc, i / 10)}">${+(i / 10).toFixed(1)} s</span>`;
  }
  return h;
}
/* 刻度尺上的导出范围：作用于当前选中对象所在层的输出（仙女棒是整个效果的输出） */
function rangeOut(sc) { const f = find(sc, sc.sel); if (!f) return null; const L = f.n.type === 'layer' || f.n.type === 'group' ? f.n : (layerOf(sc, f.n.id) || sc.root); return L ? {o: outOf(L), L} : null; }
const rangeName = (sc, r) => r.L.type === 'group' ? sc.short : r.L.name;
/* 烘焙：导出范围那一段的帧数、当前帧；样板里只有金锦层（仙女棒是整个效果）烘焙过 */
function bakeOf(sc) {
  const r = rangeOut(sc); if (!r || !r.o) return null;
  const o = r.o.tl, frames = Math.max(1, Math.round((o.out - o.in) * sc.fps)), hit = sc.bakeL === r.L.id;
  return {r, o, frames, baked: hit ? Math.min(frames, sc.baked) : 0, imgs: hit ? sc.film : []};
}
const frameNo = sc => { const B = bakeOf(sc); if (!B) return '—'; return sc.t < B.o.in - 1e-6 || sc.t >= B.o.out ? '—' : Math.min(B.frames, Math.floor((sc.t - B.o.in) * sc.fps + 1e-6) + 1); };
/* 胶片条（§8）：28 px 一行，紧贴刻度尺上面，只覆盖导出范围；已烘焙的格子显示缩略图（按最亮的一帧提亮）。
   v3.2 第 7 条：没烘焙的部分画成一条平的暗轨，不分格子 */
function filmHTML(sc) {
  const B = bakeOf(sc); if (!B) return '';
  const nC = (sc.film || []).length || 15, fpc = B.frames / nC, dt = (B.o.out - B.o.in) / nC, nb = B.imgs.length ? Math.floor(B.baked / fpc) : 0;
  const cells = Array.from({length: nb}, (_, i) => {
    const f0 = Math.round(i * fpc) + 1, f1 = Math.round((i + 1) * fpc), pos = `left:calc(${X(sc, B.o.in + i * dt)} + 1px);width:calc(${(dt / sc.T * 100).toFixed(3)}% - 1px)`;
    return `<div class="film-c" style="${pos}" data-tip="第 ${f0}–${f1} 帧"><img src="${B.imgs[i % B.imgs.length]}" alt=""></div>`;
  }).join('');
  if (nb >= nC) return cells;
  const u0 = Math.round(nb * fpc) + 1, a = B.o.in + nb * dt;
  return cells + `<div class="film-u" style="left:calc(${X(sc, a)} + 1px);width:calc(${((B.o.out - a) / sc.T * 100).toFixed(3)}% - 1px)" data-tip="第 ${u0}–${B.frames} 帧未烘焙"></div>`;
}
/* 导出范围（§8）：刻度尺上一段浅底，两端是可拖的把手；范围上方写「0.35–2.85 s」，单击可以输入 */
const tBox = (cls, v, lab, tip) => `<input class="num tnum ${cls}" type="text" inputmode="decimal" value="${v}" aria-label="${lab}" data-tip="${tip}"${cls === 'now' ? ' id="tNow"' : ''}>`;
function rangeHTML(sc) {
  const r = rangeOut(sc); if (!r || !r.o) return '';
  const o = r.o.tl, nm = rangeName(sc, r);
  return `<div class="xrange" data-node="${r.o.id}" style="left:${X(sc, o.in)};width:${X(sc, o.out - o.in)}" data-ctx="range" data-tip="${esc(nm)} 导出范围 ${o.in.toFixed(2)}–${o.out.toFixed(2)} s，右键设入点、出点"><i class="xh in" data-drag="in" data-node="${r.o.id}" data-row="${r.L.id}" data-tip="${esc(nm)} 导出范围入点 ${o.in.toFixed(2)} s"></i><i class="xh out" data-drag="out" data-node="${r.o.id}" data-row="${r.L.id}" data-tip="${esc(nm)} 导出范围出点 ${o.out.toFixed(2)} s"></i></div>`;
}
/* 「导出范围」那一行的行名格（v3.1 第 1、12 条）：「0.35–2.85 s」可单击输入，右边三个图标命令：设为入点、设为出点、恢复 */
function xioHTML(sc) {
  const r = rangeOut(sc); if (!r || !r.o) return '';
  const o = r.o.tl, nm = rangeName(sc, r);
  return `<span class="xv" data-tip="${esc(nm)} 导出范围">${tBox('in', o.in.toFixed(2), '导出范围入点', `${nm} 导出范围入点，单击输入`)}<span class="dash">–</span>${tBox('out', o.out.toFixed(2), '导出范围出点', `${nm} 导出范围出点，单击输入`)}<span class="u">s</span></span>`
    + `<span class="sp"></span><button class="btn btn-icon sm" data-act="setIn" aria-label="设为入点" data-tip="${esc(nm)} 导出范围：入点设到播放头" data-key="[">${ico('in')}</button><button class="btn btn-icon sm" data-act="setOut" aria-label="设为出点" data-tip="${esc(nm)} 导出范围：出点设到播放头" data-key="]">${ico('outp')}</button><button class="btn btn-icon sm" data-act="clearIO" aria-label="恢复导出范围" data-tip="${esc(nm)} 导出范围：恢复到打开时">${ico('reset')}</button>`;
}
/* 导出范围、胶片、轨道就地更新：不重建刻度尺上的入点 / 出点框（Tab 从入点跳到出点时焦点不丢，走查 P7） */
function syncRange(sc = cur(), wrap = $('#tlw')) {
  const sc_ = $('.rrow .scale', wrap); if (!sc_) return;
  const r = rangeOut(sc), xr = $('.xrange', sc_), xl = $('.rrow .xio', wrap);
  if (r && r.o && xr && xl && xr.dataset.node === r.o.id) {
    const o = r.o.tl, nm = rangeName(sc, r);
    xr.style.left = X(sc, o.in); xr.style.width = X(sc, o.out - o.in); xl.style.left = X(sc, (o.in + o.out) / 2);
    xr.dataset.tip = `${nm} 导出范围 ${o.in.toFixed(2)}–${o.out.toFixed(2)} s，右键设入点、出点`;
    $('.xh.in', xr).dataset.tip = `${nm} 导出范围入点 ${o.in.toFixed(2)} s`; $('.xh.out', xr).dataset.tip = `${nm} 导出范围出点 ${o.out.toFixed(2)} s`;
    $$('.tnum', xl).forEach(i => { if (document.activeElement !== i) { i.value = (i.classList.contains('in') ? o.in : o.out).toFixed(2); i.classList.remove('is-error'); } });
  } else { $$('.xrange', sc_).forEach(x => x.remove()); sc_.insertAdjacentHTML('beforeend', rangeHTML(sc)); const xi = $('.rrow .xio', wrap); if (xi) xi.innerHTML = xioHTML(sc); }
  const fr = $('.frow .fr', wrap); if (fr) { fr.innerHTML = filmHTML(sc); filmBoost(wrap); }
  $$('.tlrow[data-id] .trk', wrap).forEach(t => { const f = find(sc, t.parentElement.dataset.id); if (f) t.innerHTML = trackHTML(sc, f.n); });
  placePH(sc, wrap);
}
function tlHTML(sc) {
  return `<div class="tl" data-scene="${sc.key}"><div class="fixed">
      <div class="frow"><div class="lab">烘焙</div><div class="fr" data-scrub>${filmHTML(sc)}</div></div>
      <div class="rrow"><div class="lab xio">${xioHTML(sc)}</div><div class="fr" data-scrub><div class="scale">${scaleHTML(sc)}${rangeHTML(sc)}</div></div></div></div>
    <div class="tl-edge up"><button class="tl-more" data-act="tlUp" hidden></button></div><div class="tl-rows">${tlRowsHTML(sc)}</div><div class="tl-edge dn"><button class="tl-more" data-act="tlDn" hidden></button></div></div><div class="ph"><i data-scrub-ph></i></div>`;
}
/* 默认行数：1920 下至少 6 行、1366 下至少 4 行（行少时按实际行数）；拖过分隔条的按拖的算 */
const tlDefRows = (sc, wrap) => { const n = rowsOf(sc).filter(r => r.n.type !== 'group').length; return wrap.id === 'tlw' ? Math.min(n, UI.tlRows[UI.size] || Math.max(+getComputedStyle($('#app')).getPropertyValue('--tl-min'), tlFitRows())) : Math.min(n, 8); };
/* v3.3 第 4 条：行数定下来以后，放不下就在下面留 20 px 给「下面还有 N 行」（滚到底时这 20 px 在上面，给「上面还有 N 行」） */
function applyTlRows(wrap = $('#tlw')) {
  const tl = $('.tl', wrap); if (!tl) return;
  const sc = SC[wrap.dataset.scene] || cur(), n = tlDefRows(sc, wrap), all = $$('.tlrow[data-id]', tl).length;
  tl.style.setProperty('--tl-n', n); tl.classList.toggle('has-more', all > n);
}
/* 时间轴最多能放几行：播放条 + 胶片 + 刻度尺 + 行，合起来最多占中栏的 1/3 */
function tlFitRows() {
  const app = $('#app'), cs = getComputedStyle(app), rh = parseFloat(cs.getPropertyValue('--h-row')) || 28;
  const mid = $('#mid'), H = mid && mid.clientHeight ? mid.clientHeight : (UI.size === 1366 ? 676 : 980);
  const fixed = parseFloat(cs.getPropertyValue('--h-tp')) + parseFloat(cs.getPropertyValue('--h-film')) + parseFloat(cs.getPropertyValue('--h-ruler')) + 20;   /* 20：放不下时「下面还有 N 行」那一条 */
  return Math.max(1, Math.floor((H / 3 - fixed) / rh));   /* v3.2 第 1 条：按内容定高，最多占中栏的 1/3（v3.1 是一半 / 40 %） */
}
function renderTL(sc = cur(), wrap = $('#tlw')) {
  const old = $('.tl', wrap), top = old ? old.scrollTop : 0;
  wrap.dataset.scene = sc.key; wrap.innerHTML = tlHTML(sc);
  const tl = $('.tl', wrap);
  applyTlRows(wrap);
  tl.scrollTop = top;
  /* 行名一列和结构树同宽（放得下最长的名字） */
  wrap.style.removeProperty('--w-tlab');
  const labs = $$('.tlrow[data-id] .lab', tl); let wmax = 0;
  labs.forEach(l => { const w = [...l.childNodes].reduce((a, c) => a + (c.nodeType === 3 ? (() => { const r = document.createRange(); r.selectNodeContents(c); return r.getBoundingClientRect().width; })() : c.getBoundingClientRect().width + 6), 0) + parseFloat(getComputedStyle(l).paddingLeft) + 12; wmax = Math.max(wmax, w); });
  /* 至少放得下「导出范围」行名格：「0.35–2.85 s」+ 三个图标命令 */
  if (wmax) wrap.style.setProperty('--w-tlab', Math.ceil(Math.max(wmax, UI.size === 1366 ? 168 : 196)) + 'px');
  tl.addEventListener('scroll', () => tlMoreHint(wrap));
  placePH(sc, wrap); tlMoreHint(wrap); filmBoost(wrap);
}
/* 胶片格、效果库缩略图按最亮的像素自动提亮（缩略图本身很暗，原样放在小格子里看不清；v3.2 第 10 条效果库也用） */
const FILM_K = new Map();
function filmBoost(wrap, sel = '.film-c img') {
  $$(sel, wrap).forEach(img => {
    const k0 = FILM_K.get(img.src); if (k0) { img.style.filter = `brightness(${k0})`; return; }
    const go = () => { try { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 32, 32); const d = x.getImageData(0, 0, 32, 32).data; let m = 0; for (let i = 0; i < d.length; i += 4) m = Math.max(m, .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]); const k = +clamp(235 / Math.max(m, 10), 1, 5).toFixed(2); FILM_K.set(img.src, k); img.style.filter = `brightness(${k})`; } catch (_) { /* 读不到像素就不提亮 */ } };
    if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, {once: true});
  });
}
/* v3.3 第 4 条：行放不下时不悄悄藏行——上下边缘各一条「上面还有 N 行」「下面还有 N 行」，点一下滚过去。
   N = 中线落在可见区外（或被这条提示盖住）的行数；提示条占满一行宽、不透明，盖住的只是半行 */
function tlMoreHint(wrap) {
  const tl = $('.tl', wrap); if (!tl) return;
  const up = $('.tl-edge.up .tl-more', tl), dn = $('.tl-edge.dn .tl-more', tl); if (!up || !dn) return;
  const T = tl.getBoundingClientRect(), top = $('.fixed', tl).getBoundingClientRect().bottom, bot = T.bottom, E = 20;
  const max = tl.scrollHeight - tl.clientHeight, rows = $$('.tlrow[data-id]', tl).map(r => { const b = r.getBoundingClientRect(); return (b.top + b.bottom) / 2; });
  const nUp = tl.scrollTop > 0.5 ? rows.filter(c => c < top + E).length : 0;
  const nDn = tl.scrollTop < max - 0.5 ? rows.filter(c => c > bot - E).length : 0;
  const set = (b, n, word, icon) => { b.hidden = !n; if (n) { b.innerHTML = `${ico(icon)}${word}还有 ${n} 行`; b.dataset.tip = word === '上面' ? '滚到最上面' : '滚到最下面'; b.setAttribute('aria-label', `${word}还有 ${n} 行，点击滚过去`); } };
  set(up, nUp, '上面', 'cu'); set(dn, nDn, '下面', 'cd');
}
/* 播放头（§8）：薄荷；头部画在刻度尺上，线穿过轨道 */
function placePH(sc, wrap) {
  const tl = $('.tl', wrap); if (!tl) return;
  const trk = $('.rrow .fr', tl), w = wrap.getBoundingClientRect(), r = trk.getBoundingClientRect(), ph = $('.ph', wrap);
  const rows = $('.tl-rows', tl), rb = rows.offsetHeight && getComputedStyle(rows).display !== 'none' ? Math.min(rows.getBoundingClientRect().bottom, tl.getBoundingClientRect().bottom) : r.bottom;
  ph.style.left = Math.round(r.left - w.left + sc.t / sc.T * r.width) + 'px';
  /* v3.1 第 12 条：头部画在刻度数字上方（刻度尺上沿），不盖住数字；播放头经过的刻度数字让位 */
  ph.style.top = (r.top - w.top) + 'px';
  ph.style.height = Math.max(r.height, rb - r.top) + 'px';
  const px = sc.t / sc.T * r.width;
  $$('.rrow .tlab', tl).forEach(l => { const a = l.offsetLeft, b = a + l.offsetWidth; l.classList.toggle('is-hid', px > a - 7 && px < b + 7); });
  if (wrap.id === 'tlw') {   /* v3.3 第 9 条：播放条和画面读数用同一个函数算帧号 */
    const fno = $('#transport .fno'), cf = $('#ciBL .cfno'), f = frameNo(sc);
    if (fno) { const B = bakeOf(sc); fno.textContent = `${f} / ${B ? B.frames : sc.frames}`; }
    if (cf) cf.textContent = f;
  }
}

/* ---------- 主屏：检查器（只放参数） ---------- */
const pathChain = (sc, n) => ancestors(sc, n.id);   /* v3.1 第 2 条：面包屑从效果写起「金曜菊-B › 金锦层」 */
const pathLab = (sc, a) => label(sc, a);
function pathHTML(sc, n) {
  const chain = pathChain(sc, n);
  return chain.map((a, i) => i === chain.length - 1
    ? `<span class="cur">${esc(pathLab(sc, a))}</span>`
    : `<button data-sel="${a.id}">${esc(pathLab(sc, a))}</button><span class="sep">›</span>`).join('');
}
function fitPath(sc, n) {
  const p = $('#path'); p.innerHTML = pathHTML(sc, n);
  if (p.scrollWidth <= p.clientWidth + 1) return;
  const chain = pathChain(sc, n);
  if (chain.length < 3) return;
  const hidden = chain.slice(1, chain.length - 2), keep = [chain[0], chain[chain.length - 2]];
  p.innerHTML = `<button data-sel="${chain[0].id}">${esc(label(sc, chain[0]))}</button><span class="sep">›</span><button data-act="pathMore" aria-haspopup="menu" data-tip="${esc(hidden.map(a => label(sc, a)).join(' › '))}">…</button><span class="sep">›</span><button data-sel="${keep[1].id}">${esc(label(sc, keep[1]))}</button><span class="sep">›</span><span class="cur">${esc(label(sc, n))}</span>`;
  p.dataset.hidden = hidden.map(a => a.id).join(',');
}
let INSP = null;
function renderInsp(keepScroll = true) {
  const sc = cur(), f = find(sc, sc.sel); if (!f) return;
  const n = f.n, pb = $('#pbody'), top = pb.scrollTop;
  fitPath(sc, n);
  const hb = hiddenBy(sc, n.id), note = $('#hidNote');
  note.hidden = !hb;
  if (hb) note.innerHTML = `${ico('eyeoff')}<span>${hb === n ? (n.type === 'layer' ? '本层已隐藏' : '此发射器已隐藏') : `「${esc(hb.name)}」已隐藏`}，画面中不可见</span><button class="btn btn-text sm" data-act="unhide" data-id="${hb.id}">显示</button>`;
  const mods = paramsFor(sc, n), P = ctxOf(`${sc.key}|${n.id}`, mods);
  INSP = {sc, n, mods, P};
  pb.innerHTML = mods.map((m, i) => modHTML(P, m, i)).join('');
  alignNums(pb);
  if (!(UI.pq.trim() || UI.onlyChg)) autoFit(pb);
  applyFilter();
  pb.scrollTop = keepScroll ? top : 0;
}
/* v3.3 第 13 条：1920 下检查器不留一大块空——没记过展开状态的模块，按「运动 → 颜色 → 寿命 → 这类对象最常用的模块 → 其余常用模块 → 平时折叠的模块」
   依次展开，放得下就展开，放不下就折叠；用户手动折叠 / 展开过的（MO 里有记录）按用户的来。
   「最常用的模块」排在「其余」前面：仙女棒的发射器只按原顺序排时，带两条曲线的「大小与亮度」差 26 px 放不下，反倒展开了「外形」「气流」 */
const FIT_ORDER = ['运动', '颜色', '寿命'];
function autoFit(pb) {
  const auto = $$('.mod[data-auto]', pb); if (!auto.length) return;
  const H = pb.clientHeight - parseFloat(getComputedStyle(pb).paddingBottom || 0);
  const hOpen = new Map(auto.map(m => [m, m.offsetHeight]));
  auto.forEach(m => m.classList.add('is-closed'));
  const hClosed = new Map(auto.map(m => [m, m.offsetHeight])), dOf = m => hOpen.get(m) - hClosed.get(m);
  let used = $$('.mod', pb).reduce((a, m) => a + m.offsetHeight, 0);
  const main = INSP && pb.id === 'pbody' ? mainMod(INSP.P) : '';
  const rank = m => { const i = FIT_ORDER.indexOf(m.dataset.mod); return i >= 0 ? i : m.dataset.mod === main ? 3 : (m.dataset.auto === 'closed' ? 100 : 10) + auto.indexOf(m); };
  const order = [...auto].sort((a, b) => rank(a) - rank(b)), open = new Set();
  /* 常用的几级按顺序放，放得下就展开 */
  order.filter(m => rank(m) < 100).forEach(m => { if (used + dOf(m) <= H) { used += dOf(m); open.add(m); } });
  /* 平时折叠的模块：挑一组刚好放得最满的（模块很少，逐个组合试；一样满时先挑排在前面的） */
  const rest = order.filter(m => rank(m) >= 100), room = H - used; let best = 0, bestSet = 0;
  for (let k = 1; k < (1 << rest.length); k++) { let h = 0; rest.forEach((m, i) => { if (k & (1 << i)) h += dOf(m); }); if (h <= room && h > best + 0.5) { best = h; bestSet = k; } }
  rest.forEach((m, i) => { if (bestSet & (1 << i)) open.add(m); });
  auto.forEach(m => { const on = open.has(m); MO[m.dataset.mk] = on; m.classList.toggle('is-closed', !on); $('.mod-h', m).setAttribute('aria-expanded', String(on)); delete m.dataset.auto; });
}

/* ---------- v3.3 第 1、5 条：数字竖向对齐 ----------
   数值格右对齐，同一列的小数点对齐：按这一屏参数里最多的小数位 D 定一个「小数点位置」，小数位少的数在右边补空（用 margin，悬停的框贴着数字）；
   区间的下限、上限各自对齐（各占一个等宽的槽）；单位放在数值后面一个固定宽度的单位列。
   数值列、单位列的宽度按这一屏所有参数的取值范围（最小值、最大值、当前值）和单位算，所以拖到最大值也不会挤出格子；滑杆仍在同一条线结束。
   宽度用等宽数字的实测字宽算（tabular-nums 下「1」和「8」一样宽），不依赖量取被折叠起来的行 */
const NUMRE = /^-?\d+(\.\d+)?$/;
const decOf = t => { const i = t.indexOf('.'); return i < 0 ? 0 : t.length - i - 1; };
const NUMM = {};
function fontProbe(el) {
  const cs = getComputedStyle(el), key = [cs.fontSize, cs.fontFamily, cs.fontWeight].join('|');
  if (NUMM[key]) return NUMM[key];
  const pr = document.createElement('span');
  pr.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;font-family:${cs.fontFamily};font-size:${cs.fontSize};font-weight:${cs.fontWeight};font-variant-numeric:tabular-nums`;
  document.body.appendChild(pr);
  const w = t => { pr.textContent = t; return pr.getBoundingClientRect().width; };
  const M = {d: w('0123456789') / 10, p: w('.'), minus: w('-'), dash: w('–'), w: t => { pr.textContent = t; const x = pr.getBoundingClientRect().width; return x; }, pr};
  M.d1 = w('1'); M.d8 = w('8');
  return (NUMM[key] = M);
}
const textW = (M, t) => [...t].reduce((a, c) => a + (c === '.' ? M.p : c === '-' ? M.minus : M.d), 0);
function alignNums(root) {
  if (!root) return;
  const els = $$('.prm .vu > .num, .prm .vv > .num, .mod-h .ms-v > .num', root); if (!els.length) return;
  const C = fontProbe(els.find(e => !e.closest('.mod-h')) || els[0]);   /* 这一列的字（13 px）：小数点位置按它算 */
  const shown = e => (e.value !== undefined ? e.value : e.textContent).trim();
  const D = Math.min(3, Math.max(0, ...els.map(shown).filter(t => NUMRE.test(t)).map(decOf)));
  const T = D ? C.p + D * C.d : 0;   /* 小数点（含）右边的宽度 */
  const R = 4;   /* 数字右缘到数值列右缘：1 px 框线 + 3 px 内边距（区间的输入框没有内边距，用 margin 补齐） */
  const box = new Map(), cs = e => box.get(e) || (box.set(e, getComputedStyle(e)), box.get(e));
  const insR = e => parseFloat(cs(e).borderRightWidth) + parseFloat(cs(e).paddingRight), insL = e => parseFloat(cs(e).borderLeftWidth) + parseFloat(cs(e).paddingLeft);
  const rp = (M, t) => decOf(t) ? M.p + decOf(t) * M.d : 0;
  /* 取值范围：拖到最大、最小值时也放得下 */
  const cands = e => {
    const t = shown(e), row = e.closest('.prm[data-k]'), s = row && PS[row.dataset.k];
    if (!s || e.classList.contains('is-ro') || e.closest('.mod-h')) return [t];
    const part = row.dataset.part;
    if (part === 'rnd' || part === 'ex') { const sl = $('.sl', row); return [t, part === 'ex' ? fmt(+sl.dataset.max, .01) : String(+sl.dataset.max)]; }
    return [t, fmt(s.min, s.step), fmt(s.max, s.step)];
  };
  /* 每个数：右边补多少（margin-right），从框左缘到列右缘要多宽 */
  const span = e => { const M = fontProbe(e); return Math.max(...cands(e).map(t => NUMRE.test(t) ? insL(e) + textW(M, t) - rp(M, t) + T + R : insL(e) + M.w(t) + R)); };
  els.forEach(e => { const M = fontProbe(e), t = shown(e); e.style.marginRight = (NUMRE.test(t) ? T - rp(M, t) + R - insR(e) : R - insR(e)).toFixed(2) + 'px'; });
  const lo = els.filter(e => e.matches('.vv > .num.lo')), hi = els.filter(e => e.matches('.vv > .num:not(.lo)'));
  let wVal = 0;
  if (lo.length) {
    const ls = Math.max(...lo.map(span)), hs = Math.max(...hi.map(span));
    root.style.setProperty('--lo-slot', ls.toFixed(2) + 'px'); root.style.setProperty('--hi-slot', hs.toFixed(2) + 'px');
    const dash = $('.vv .dash', root), dw = dash ? fontProbe(dash).w('–') + 2 : C.dash + 2;
    wVal = ls + dw + hs;
  }
  els.filter(e => !e.closest('.vv')).forEach(e => { wVal = Math.max(wVal, span(e)); });
  /* 单位列：最长的单位 + 展开箭头（分布、随机幅度） */
  let wUnit = 12;
  $$('.prm .vu', root).forEach(v => { const u = $(':scope > .u', v), x = $(':scope > .exn', v); const uw = u && u.textContent ? fontProbe(u).w(u.textContent) : 0; wUnit = Math.max(wUnit, uw + (x ? 2 + 12 : 0)); });
  $$('.mod-h .ms-u', root).forEach(u => { if (u.textContent) wUnit = Math.max(wUnit, fontProbe(u).w(u.textContent)); });
  wUnit += 2;
  /* 停用原因写在数值列 + 单位列里，放不下就加宽数值列 */
  $$('.prm .vu > .dis-why', root).forEach(e => { wVal = Math.max(wVal, fontProbe(e).w(e.textContent) + 2 - wUnit); });
  root.style.setProperty('--w-val', Math.ceil(wVal) + 'px'); root.style.setProperty('--w-unit', Math.ceil(wUnit) + 'px');
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { Object.keys(NUMM).forEach(k => { NUMM[k].pr.remove(); delete NUMM[k]; }); if (UI.view === 'main') alignNums($('#pbody')); $$('.ks-panel').forEach(alignNums); });
function applyFilter() {
  const pb = $('#pbody'), q = UI.pq.trim(), only = UI.onlyChg, F = !!(q || only);
  $('.empty', pb)?.remove();
  const vo = $('#viewOpt'); vo.classList.toggle('is-on', only); vo.firstChild.textContent = only ? '仅已改' : '筛选';
  let any = false;
  $$('.mod', pb).forEach(m => {
    $$('.prm:not(.sub)', m).forEach(r => {
      const lab = r.dataset.lab || '';
      const okQ = !q || lab.includes(q), okC = !only || r.classList.contains('is-nd') || r.classList.contains('is-ed');
      r.hidden = F ? !(okQ && okC) : (r.classList.contains('dep-in') ? !MO[r.dataset.dk] : false);
      r.classList.toggle('hit', !!q && okQ);
      const t = $('.plt', r); if (t) t.innerHTML = q && okQ ? esc(lab).replace(esc(q), `<mark>${esc(q)}</mark>`) : esc(lab);
    });
    /* 收起的依赖行：筛选时只要露出一项，就同时露出控制它的开关行（开关的关闭状态照样看得到） */
    if (F) $$('.prm.dep-in', m).filter(r => !r.hidden).forEach(r => { const sw = $$('.prm:not(.dep-in):not(.sub)', m).find(x => x.dataset.lab === r.dataset.dep); if (sw) sw.hidden = false; });
    $$('.prm.sub', m).forEach(r => { r.hidden = F && !!r.previousElementSibling?.hidden; });
    const hits = $$('.prm:not(.sub)', m).filter(r => !r.hidden).length;
    m.hidden = F && !hits;
    if (F && hits) m.classList.remove('is-closed');
    else if (!F && !m.classList.contains('mod-one')) m.classList.toggle('is-closed', !(MO[m.dataset.mk] ?? true));
    if (!m.hidden) any = true;
  });
  if (!any) {
    const e = document.createElement('div'); e.className = 'empty';
    e.innerHTML = q ? `<b>没有匹配「${esc(q)}」的参数</b><button class="btn btn-2" data-act="clearPq">清除搜索</button>`
      : `<b>没有已改的参数</b><button class="btn btn-2" data-act="showAll">显示全部</button>`;
    pb.appendChild(e);
  }
  const fa = $('#foldAll'); if (fa) { const open = $$('.mod:not(.mod-one)', pb).some(m => !m.hidden && !m.classList.contains('is-closed')); fa.textContent = open ? '全部折叠' : '全部展开'; fa.dataset.tip = open ? '折叠所有模块' : '展开所有模块'; }
}

/* ---------- 状态栏、导出按钮：同一份改动算出 ---------- */
function renderStatus() {
  if (UI.view !== 'main') return;
  const sc = cur(), n = changesOf(sc).length, b = $('#saveSt');
  b.classList.toggle('dirty', !!n);
  b.innerHTML = n ? `未保存 ${n} 项${ico('cd', 'dd')}` : `已保存 ${sc.savedAt}`;
  b.dataset.tip = n ? '查看改动，可逐项恢复' : '';
  $('#bRevert').disabled = !n;
  /* 「保存」不填底色；有没保存的改动时，标签后面加一个小圆点（§4） */
  const sv = $('#bSave'); if (sv) { sv.innerHTML = n ? '保存<span class="dot" aria-hidden="true"></span>' : '保存'; sv.setAttribute('aria-label', n ? `保存，有 ${n} 项没保存` : '保存'); }
  renderExport();
}
function renderExport() {
  const sc = cur(), st = staleLayers(sc), b = $('#expBtn');
  if (b.querySelector('.is-loading')) return;
  const need = st.size > 0, multi = layersOf(sc).length > 1;
  /* §5：导出按钮左边的琥珀计数「⚠ 1」；悬停写「金锦层需重新导出：缩放 1.10 → 1.30」，点开导出菜单 */
  const es = $('#expSt');
  es.className = 'exp-st ' + (need ? 'st-warn' : 'st-ok'); es.hidden = !need;
  es.innerHTML = need ? `${ico('stale')}<span>${st.size} 层</span>` : '';
  es.setAttribute('aria-label', need ? `${st.size} 层需重新导出` : '已导出');
  if (need) es.dataset.why = 'all'; else delete es.dataset.why;
  /* 主操作：薄荷实底，全屏只有这一个 */
  b.innerHTML = `<button class="btn btn-1" data-act="export" data-tip="${need ? '导出需重新导出的层' : '全部已导出'}">导出</button><button class="btn btn-1" data-act="exportMenu" aria-haspopup="menu" aria-label="导出选项" data-tip="导出选项">${ico('cd')}</button>`;
}
function onHist() {
  if (UI.view !== 'main') return;
  const H = cur().H; $('#bUndo').disabled = !H.u.length; $('#bRedo').disabled = !H.r.length;
}
function onParamChange(k) {
  const s = PS[k]; if (!s) return;
  if (k.startsWith('view|')) applyView();
  if (UI.view === 'main' && UI.mode === '贴图与交付' && k.split('|')[2] === '输出') renderDeliv();   /* 输出设置和交付表同一份数据 */
  const sc = SC[k.split('|')[0]];
  if (sc && s.lab === '开始时间' && k.split('|')[2] === '时间与缩放' && UI.view === 'main' && sc === cur()) { const id = k.split('|')[1], f = find(sc, id), tr = $(`#tlw .tlrow[data-id="${id}"] .trk`); if (f && tr) tr.innerHTML = trackHTML(sc, f.n); }
  if (UI.view === 'main' && sc === cur()) {
    const mod = k.split('|')[2], m = $(`#pbody .mod[data-mod="${CSS.escape(mod)}"]`);
    if (m && INSP) {
      const def = INSP.mods.find(x => x.t === mod);
      if (def) {
        const h = $('.mod-h', m); if (h) { $$('.ms', h).forEach(e => e.remove()); $('.mt', h).insertAdjacentHTML('afterend', modSummary(INSP.P, def)); alignNums($('#pbody')); }
        const cnt = modKeys(INSP.P, def).filter(x => isChg(PS[x])).length, mr = $('.mrst', m);
        if (mr) { mr.hidden = !cnt; mr.dataset.tip = `恢复本模块的 ${cnt} 项`; }
      }
    }
    statusSoon();
  }
}
let stT = 0;
function statusSoon() { cancelAnimationFrame(stT); stT = requestAnimationFrame(() => { renderStatus(); refreshStaleMarks(); }); }
function refreshStaleMarks() {
  const sc = cur(), st = staleLayers(sc);
  $$('#tree .trow[data-id]').forEach(r => {
    const has = st.has(r.dataset.id), el = $('.stl', r);
    if (has && !el) $('.nm', r).insertAdjacentHTML('beforeend', `<svg class="i stl" aria-label="需重新导出" data-why="${r.dataset.id}"><use href="#i-stale"/></svg>`);
    if (!has && el) el.remove();
  });
  if (UI.mode === '贴图与交付') renderDeliv();
}
function afterCommit(k, fromHist) {
  const s = PS[k], parts = k.split('|');
  if (UI.view === 'main' && INSP && k.startsWith(INSP.P.prefix + '|')) {
    const def = INSP.mods.find(m => m.t === parts[2]), r = def && def.rows.find(x => x.lab === s.lab);
    if ((r && r.affects) || fromHist || UI.onlyChg) renderInsp();
  } else if (k.startsWith('sheet|') && typeof rerenderSheetParams === 'function') rerenderSheetParams(k);
}

/* ---------- 主屏：效果库 ---------- */
const hl = (s, q) => q && s.includes(q) ? esc(s).replace(esc(q), `<mark>${esc(q)}</mark>`) : esc(s);
function renderLib() {
  const sc = cur(), list = $('#libList'), q = UI.q.trim();
  $$('#libTabs .tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.v === UI.libTab)));
  $('#libSub').hidden = UI.libTab !== '模板';
  $$('#libSub .tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.v === UI.libSub)));
  $$('#libChips button').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.v === UI.chip)));
  $('#libQ').classList.toggle('has-val', !!q);
  let html = '', count = 0;
  const catOk = c => UI.chip === '全部' || c === UI.chip;
  if (UI.libTab === '效果') {
    const items = LIB.filter(it => catOk(it.cat) && (!q || [it.name, ...it.sub, it.cat].some(x => x.includes(q))));
    count = items.length;
    html = items.map(it => `<div class="lib-item${it.id === sc.lib ? ' is-sel' : ''}" role="option" aria-selected="${it.id === sc.lib}" tabindex="${it.id === sc.lib ? 0 : -1}" data-lib="${it.id}">
      <div class="th"><img src="${libImg(it.img)}" alt=""></div><div class="li-t"><div class="li-n">${hl(it.name, q)}</div>
      <div class="li-s">${it.sub.map(s => `<span>${hl(s, q)}</span>`).join('')}<span class="st${it.st === '待验收' ? ' st-due' : ''}">${it.st}</span></div></div></div>`).join('');   /* v3.2 第 10 条：「待验收」琥珀（要你处理），其余弱色 */
  } else {
    const mine = UI.libSub === '我的模板', multi = UI.libSub === '多层花型模板';
    const items = mine ? [] : TPL_NAMES.map((nm, i) => ({nm, i, cat: TPL_CAT[i], ly: TPL_LAYERS[i]}))
      .filter(t => (!multi || t.ly >= 3) && catOk(t.cat) && (!q || t.nm.includes(q) || t.cat.includes(q)));
    count = mine ? 0 : (q || UI.chip !== '全部' ? items.length : 31);
    html = items.length ? `<div class="tpl-grid">${items.map(t => `<div class="tpl" tabindex="0" data-big="${t.i}" data-name="${esc(t.nm)}"><div class="th"><img src="${IMG.tpl[t.i]}" alt=""></div><span>${hl(t.nm, q)}${multi ? `<em>${t.ly} 层</em>` : ''}</span></div>`).join('')}</div>` : '';
    if (mine && !q) html = `<div class="empty"><b>还没有我的模板</b><button class="btn btn-2" data-act="saveTpl">存为模板</button></div>`;
  }
  if (!html) {
    html = q ? `<div class="empty"><b>没有匹配「${esc(q)}」的${UI.libTab}</b><button class="btn btn-2" data-act="clearLibQ">清除搜索</button></div>`
      : `<div class="empty"><b>没有「${esc(UI.chip)}」${UI.libTab === '效果' ? '效果' : '模板'}</b><button class="btn btn-2" data-act="chipAll">显示全部</button></div>`;
  }
  list.innerHTML = html; filmBoost(list, '.th img');
  $('#libCount').textContent = `${count} 个`;
}

/* ---------- 主屏：画面（四角技术信息、只看提示）、播放条、视图条、交付 ---------- */
function kikuLook(t, T) {
  if (t < .3) return {a: 1, s: (3 + t * 10) / 25, b: 1.4, l: 0};
  if (t <= 2.05) { const u = (t - .3) / 1.75; return {a: 1, s: (6 + 19 * (1 - (1 - u) ** 2)) / 25, b: 1.25 - .25 * u, l: 0}; }
  const u = Math.min(1, (t - 2.05) / (T - 2.05)); return {a: 0, s: 1, l: 1, ls: (27 + 6 * u) / 27, b: 1.15 - .7 * u, dy: 2.2 * u};
}
function renderStage() {
  const sc = cur(), A = $('#imA'), B = $('#imB'), zoom = UI.view3 === '1:1' ? 1.35 : UI.view3 === '游戏内' ? .55 : 1;
  const dist = PS['view|视图|距离'] ? PS['view|视图|距离'].v : 1000, dz = 1000 / dist, Z = zoom * Math.pow(dz, .5);
  const expo = PS['view|视图|预览曝光'] ? PS['view|视图|预览曝光'].v : 1;
  if (sc.key === 'kiku') {
    const L = kikuLook(sc.t, sc.T), k = .74 / 326 * Z;
    if (A.dataset.src !== 'kiku') { A.src = IMG.kiku; B.src = IMG.kiku_late; A.dataset.src = 'kiku'; }
    const kk = k * L.s;
    Object.assign(A.style, {width: (512 * kk * 100) + '%', left: (50 - 253 * kk * 100) + '%', top: (50 - 224 * kk * 100) + '%', opacity: L.a, filter: `brightness(${(L.b * expo).toFixed(2)})`});
    const kl = .74 * 27 / 25 / 430 * Z * (L.ls || 1);
    Object.assign(B.style, {width: (512 * kl * 100) + '%', left: (50 - 253 * kl * 100) + '%', top: (50 - 243 * kl * 100 + (L.dy || 0)) + '%', opacity: L.l, filter: `brightness(${(L.b * expo).toFixed(2)})`});
  } else {
    const i = Math.floor(sc.t * 9) % IMG.spk.length;
    if (A.dataset.src !== 'spk' + i) { A.src = IMG.spk[i]; A.dataset.src = 'spk' + i; }
    const w = 118 * Z;
    Object.assign(A.style, {width: w + '%', left: (50 - w / 2) + '%', top: (50 - w * .42) + '%', opacity: 1, filter: `brightness(${expo.toFixed(2)})`});
    B.style.opacity = 0;
  }
  $('#cgrid').hidden = !UI.grid;
  /* §7 画面读数：左下一行「平台　fps　帧」；单格、张数、帧数只在检查器「输出」里。
     v3.3 第 9 条：帧号一律从 1 数、只有一个词「帧」——和播放条同一个数（导出范围里的第几帧，范围外写「—」） */
  $('#ciBL').innerHTML = `<span class="cg">${UI.plat === '手机' ? '手机' : 'PC'}</span><span class="cg"><b>${sc.fps}</b><span>fps</span></span><span class="cg"><span>帧</span><b class="cfno">${frameNo(sc)}</b></span>`;   /* v3.2 第 6 条：每组「标签 数值 单位」紧贴，组和组之间留空 */
  renderViewMarks();
  renderSoloBadge();
  $('#vp').hidden = UI.mode === '贴图与交付'; $('#deliv').hidden = UI.mode !== '贴图与交付';
  if (UI.mode === '贴图与交付') renderDeliv();
}
function soloList(sc) { const out = []; const w = n => { if (n.solo) out.push(n); n.kids.forEach(w); }; w(sc.root); return out; }
function renderSoloBadge() {
  const sc = cur(), s = soloList(sc), b = $('#soloBadge');
  b.hidden = !s.length || UI.mode === '贴图与交付';
  if (s.length) b.innerHTML = `${ico('soloon')}<span>${s.length <= 2 ? '只看：' + s.map(n => esc(label(sc, n))).join('、') : `只看 ${s.length} 项`}</span><span class="k"><kbd>Esc</kbd> 退出</span>`;
  b.dataset.tip = '退出只看';
}
function renderTime() {
  const sc = cur(), now = $('#tNow'); if (now && document.activeElement !== now) { now.value = sc.t.toFixed(2); now.classList.remove('is-error'); }
  placePH(sc, $('#tlw'));
  if (UI.mode !== '贴图与交付') renderStage();
}
function curTarget(sc) { const f = find(sc, sc.sel); if (!f) return null; const n = f.n; if (n.type === 'layer' || n.type === 'group') return outOf(n); return n.tl && n.type !== 'output' ? n : null; }
const tgtWhat = sc => { const f = find(sc, sc.sel); return f && (f.n.type === 'layer' || f.n.type === 'group') ? '导出范围' : '发射时段'; };
/* 时间读数是数值框：单击输入，回车生效，Esc 取消，越界就地报错 */
/* 播放条（§8）：一行三组，组间 20 px —— ▶ ⏮ 1× 循环 ｜「2.00 / 5.24 s」（15 px 等宽数字）和「烘焙 50 / 75」｜「选项 ▾」和缩略图。
   不写层名（结构树、面包屑、时间轴当前行已经写了）；入点 / 出点在刻度尺上 */
function renderTransport() {
  const sc = cur(), B = bakeOf(sc), t = sc.t.toFixed(2);
  $('#transport').innerHTML = `<div class="tpg" role="group" aria-label="播放"><button class="btn btn-icon play" data-act="play" aria-label="${UI.playing ? '暂停' : '播放'}" data-tip="${UI.playing ? '暂停' : '播放'}" data-key="空格">${ico(UI.playing ? 'pause' : 'play')}</button>
    <button class="btn btn-icon" data-act="restart" aria-label="重播" data-tip="回到开头并播放" data-key="R">${ico('restart')}</button>
    <select class="sel" id="speed" aria-label="播放速度" data-tip="播放速度">${[.25, .5, 1, 2].map(v => `<option value="${v}"${v === UI.speed ? ' selected' : ''}>${v}×</option>`).join('')}</select>
    <button class="btn btn-icon" data-act="loop" aria-pressed="${UI.loop}" aria-label="循环" data-tip="循环播放">${ico('loop')}</button></div>
    <div class="tpg time" role="group" aria-label="时间">${tBox('now', t, '当前时间', '当前时间，单击输入')}<span class="tot">/ ${sc.T.toFixed(2)}</span><span class="u">s</span>
      <span class="fbk" data-tip="${B ? `${esc(rangeName(sc, B.r))}：当前帧 / 导出范围帧数，已烘焙 ${B.baked} 帧` : ''}"><span class="lbl">帧</span><span class="fno">${frameNo(sc)} / ${B ? B.frames : sc.frames}</span></span>
      <button class="btn btn-icon" data-act="timeTools" aria-haspopup="menu" aria-label="时间工具" data-tip="逐帧、跳到标记">${ico('timer')}</button></div>
    <div class="tpg" role="group" aria-label="选项"><button class="btn tbtn" data-act="tlOpts" aria-haspopup="menu">选项${ico('cd', 'dd')}</button>
      <button class="btn tbtn" data-act="thumb" data-tip="当前帧作缩略图">${ico('camera')}<span class="thumb-t">缩略图</span></button></div>`;
  syncRange(sc);
}
function syncIOBoxes() { syncRange(cur()); }
const VIEW_TIP = {'距离': '「游戏内」按此距离换算大小', '预览曝光': '只改预览亮度，不进导出'};
const VIEW_R = {'距离': {lab: '距离', unit: 'm', min: 100, max: 3000, step: 10, v: 1000}, '预览曝光': {lab: '预览曝光', unit: '倍', min: .25, max: 4, step: .05, v: 1}};
const viewS = lab => st(`view|视图|${lab}`, VIEW_R[lab], true);
/* 距离、预览曝光：在「预览设置」浮层里，和参数数值框同一套交互（拖动、Shift 精调、单击输入、越界报错、撤销） */
function viewIn(lab) {
  const k = `view|视图|${lab}`, s = viewS(lab);
  return `<div class="prm vrow" data-k="${k}" data-kind="num" data-lab="${lab}"><span class="lbl" data-tip="${VIEW_TIP[lab]}">${lab}</span><input class="num" value="${fmt(s.v, s.step)}" aria-label="${lab}"><span class="u">${s.unit}</span></div>`;
}
/* v3.1 第 3 条：右下常驻「距离 1000 m　预览曝光 1.00 倍」，弱色；和参数数值框同一套交互（拖动、单击输入、越界报错、Esc） */
function renderViewMarks() {
  const el = $('#ciView'); if (!el || el.children.length) return;
  el.innerHTML = ['距离', '预览曝光'].map(lab => { const s = viewS(lab), k = `view|视图|${lab}`; return `<span class="prm vrow vi" data-k="${k}" data-kind="num" data-lab="${lab}"><span class="lbl" data-tip="${VIEW_TIP[lab]}">${lab}</span><input class="num" value="${fmt(s.v, s.step)}" aria-label="${lab}"><span class="u">${s.unit}</span></span>`; }).join('');
}
/* 标题行中段：工作模式后面的视图控件（贴图与交付时换成平台、预览方式、网格、缩放比例） */
function renderViewbar() {
  const vb = $('#viewbar');
  if (UI.mode === '贴图与交付') {
    const DT = {PC: 'PC 产物', '手机': '手机产物：单格、帧数减半', '贴图': '整张查看', '逐帧': '单帧放大'};
    vb.innerHTML = `<div class="seg sm" data-ui="plat" role="group" aria-label="平台">${['PC', '手机'].map(v => `<button data-v="${v}" aria-pressed="${UI.plat === v}" data-tip="${DT[v]}">${v}</button>`).join('')}</div>
      <div class="seg sm" data-ui="dview" role="group" aria-label="预览方式">${['贴图', '逐帧'].map(v => `<button data-v="${v}" aria-pressed="${UI.dview === v}" data-tip="${DT[v]}">${v}</button>`).join('')}</div>
      <button class="btn btn-icon" data-act="atlasGrid" aria-pressed="${!!UI.atlasGrid}" aria-label="格子线" data-tip="${UI.dview === '逐帧' ? '逐帧时没有格子线' : UI.atlasGrid ? '隐藏格子线' : '显示格子线'}"${UI.dview === '逐帧' ? ' disabled' : ''}>${ico('grid')}</button>
      <span class="lbl" id="delivZoom"></span>
      <span class="sp"></span><button class="btn tbtn" data-act="openFolder" data-tip="打开导出文件夹">${ico('folder')}文件夹</button>`;
    return;
  }
  const VT = {'适应': '整朵放进画面', '1:1': '按贴图像素 1:1 显示', '游戏内': '按距离换算游戏内大小'};
  vb.innerHTML = `<div class="seg sm" data-ui="view3" role="group" aria-label="画面大小">${['适应', '1:1', '游戏内'].map(v => `<button data-v="${v}" aria-pressed="${UI.view3 === v}" data-tip="${VT[v]}">${v}</button>`).join('')}</div>
    <span class="sp"></span><div class="tgrp" role="group" aria-label="画面叠加">
    <button class="btn btn-icon" data-act="grid" aria-pressed="${UI.grid}" aria-label="构图网格" data-tip="构图网格">${ico('grid')}</button>
    <button class="btn btn-icon" data-act="note" aria-label="批注" data-tip="当前画面写进意见">${ico('note')}</button></div>
    <div class="tgrp" role="group" aria-label="面板">
    <button class="btn btn-icon" data-act="compact" aria-pressed="${UI.compact}" aria-label="精简布局" data-tip="精简布局，收起左右栏" data-key="F">${ico('compact')}</button>
    <button class="btn btn-icon" data-act="toggleL" aria-label="${UI.left ? '隐藏左栏' : '显示左栏'}" data-tip="${UI.left ? '隐藏左栏' : '显示左栏'}" data-key="L">${ico('pl')}</button>
    <button class="btn btn-icon" data-act="toggleR" aria-label="${UI.right ? '隐藏右栏' : '显示右栏'}" data-tip="${UI.right ? '隐藏右栏' : '显示右栏'}" data-key="P">${ico('pr')}</button></div>
    <button class="btn tbtn" data-act="preview" aria-haspopup="menu" data-tip="背景、安全框">预览设置</button>`;
}
function applyView() { if (UI.view === 'main' && UI.mode !== '贴图与交付') renderStage(); }
/* 每层输出的设置：检查器「输出」模块里改过就用改过的值，没打开过就用文件里的值 */
function outSet(sc, L, o) {
  const k = lab => PS[`${sc.key}|${L.id}|输出|${lab}`], g = (lab, d) => k(lab) ? k(lab).v : d;
  const cell = parseInt(g('单格', (o && o.tl.cell) || (L === sc.root && sc.key === 'spk' ? '512 px' : '1024 px')));
  return {cell, per: +g('每张', (o && o.tl.per) || 16), pc: g('PC', true) !== false, mb: g('手机', true) !== false, mcell: parseInt(g('手机单格', Math.min(512, cell / 2) + ' px'))};
}
function delivRows(sc) {
  const Ls = sc.key === 'spk' ? [sc.root] : sc.root.kids.filter(l => l.type === 'layer');
  return Ls.map(l => { const o = l.kids.find(k => k.type === 'output'); if (!o) return null; const S = outSet(sc, l, o); return {n: l, no: l === sc.root ? null : l.no, name: l === sc.root ? sc.short : l.name, o, ...S}; }).filter(Boolean);
}
const outCount = (sc, r) => { const f = Math.round((r.o.tl.out - r.o.tl.in) * sc.fps), mf = Math.ceil(f / 2); return {f, sh: Math.ceil(f / r.per), mf, ms: Math.ceil(mf / r.per)}; };
function checkedOf(sc) { if (!UI.checked[sc.key]) UI.checked[sc.key] = new Set(staleLayers(sc)); return UI.checked[sc.key]; }
function delivTableHTML(sc, selLayer, model = sc) {
  const rows = delivRows(sc), stale = staleLayers(model), chk = checkedOf(model); let tot = [0, 0, 0, 0];
  const body = rows.map(r => {
    const c = outCount(sc, r), D = '<span class="mute">—</span>';
    tot = [tot[0] + (r.pc ? c.f : 0), tot[1] + (r.pc ? c.sh : 0), tot[2] + (r.mb ? c.mf : 0), tot[3] + (r.mb ? c.ms : 0)];
    /* §7：「需重新导出」只在结构树层行和导出按钮旁，交付表不再重复一列状态；勾选默认就是需重新导出的层 */
    const px = v => `${v}<span class="u">px</span>`;
    return `<tr data-sel="${r.n.id}" class="${r.n === selLayer ? 'is-sel' : ''}"><td><input class="chk" type="checkbox" data-dchk="${r.n.id}" ${chk.has(r.n.id) ? 'checked' : ''} aria-label="导出 ${esc(r.name)}"></td><td>${r.no ? `<span class="no">${r.no}</span>` : ''}${esc(r.name)}</td>${r.pc ? `<td>${px(r.cell)}</td><td>${c.f}</td><td>${c.sh}</td>` : `<td data-tip="PC 已关">${D}</td><td>${D}</td><td>${D}</td>`}${r.mb ? `<td>${px(r.mcell)}</td><td>${c.mf}</td><td>${c.ms}</td>` : `<td data-tip="手机已关">${D}</td><td>${D}</td><td>${D}</td>`}</tr>`;
  }).join('');
  return `<table class="dtable"><thead><tr><th rowspan="2"></th><th rowspan="2" style="vertical-align:bottom">层</th><th class="grp" colspan="3">PC</th><th class="grp" colspan="3">手机</th></tr>
      <tr><th>单格</th><th>帧数</th><th>张数</th><th>单格</th><th>帧数</th><th>张数</th></tr></thead><tbody>${body}</tbody>
      ${rows.length > 1 ? `<tfoot><tr><td></td><td>合计</td><td></td><td>${tot[0]}</td><td>${tot[1]}</td><td></td><td>${tot[2]}</td><td>${tot[3]}</td></tr></tfoot>` : ''}</table>`;
}
/* 翻页器、单格按当前平台算，和交付表同一个数据源（delivRows + outCount） */
function delivView(sc) {
  const rows = delivRows(sc), selLayer = layerOf(sc, sc.sel) || sc.root, r = rows.find(x => x.n === selLayer) || rows[0], c = outCount(sc, r), mob = UI.plat === '手机';
  return {r, mob, frames: mob ? c.mf : c.f, pages: mob ? c.ms : c.sh, cell: mob ? r.mcell : r.cell, per: r.per, name: r.n === sc.root ? sc.short : r.n.name};
}
function renderDeliv() {
  const sc = cur(), rows = delivRows(sc); if (!rows.length) { $('#deliv').innerHTML = ''; return; }
  const selLayer = layerOf(sc, sc.sel) || sc.root, V = delivView(sc), g = Math.ceil(Math.sqrt(V.per)), nChk = checkedOf(sc).size;
  const pgBtn = (d, dis, lab) => `<button class="btn btn-icon sm" data-act="pg" data-d="${d}" aria-label="${lab}" ${dis ? 'disabled' : ''}>${ico(d < 0 ? 'cl' : 'cr')}</button>`;
  let view, pager, px;
  if (UI.dview === '逐帧') {
    /* 逐帧：一次看一帧，放大；手机的第 i 帧对应 PC 的第 2i−1 帧 */
    UI.frameNo = clamp(UI.frameNo || 1, 1, V.frames);
    const src = V.mob ? 2 * UI.frameNo - 1 : UI.frameNo;
    if (sc.key === 'kiku') { const ci = (src - 1) % 15, col = ci % 4, row = Math.floor(ci / 4); view = `<div class="sheet one" style="background-image:url(${IMG.atlas});background-size:400% 400%;background-position:${(col / 3 * 100).toFixed(2)}% ${(row / 3 * 100).toFixed(2)}%" role="img" aria-label="第 ${UI.frameNo} 帧"></div>`; }
    else view = `<div class="sheet one"><img src="${IMG.spk[(src - 1) % IMG.spk.length]}" alt="第 ${UI.frameNo} 帧"></div>`;
    pager = `${pgBtn(-1, UI.frameNo <= 1, '上一帧')}<span class="pg-t"><span class="lbl">${esc(V.name)}</span><b>${UI.frameNo}</b><span class="lbl">/ ${V.frames} 帧</span></span>${pgBtn(1, UI.frameNo >= V.frames, '下一帧')}`;
    px = V.cell;
  } else {
    /* 贴图：无缝的一整张；格子线是可开关的叠加层；这一张没用到的格子留空、不画框 */
    UI.sheetPage = clamp(UI.sheetPage, 1, V.pages);
    const k = Math.min(V.per, V.frames - (UI.sheetPage - 1) * V.per), first = (UI.sheetPage - 1) * V.per;
    const cell = i => { if (i >= k) return '<i class="emp"></i>'; const f = (V.mob ? 2 * (first + i) : first + i) % 15; return sc.key === 'kiku' ? `<i style="background-position:${((f % 4) / 3 * 100).toFixed(2)}% ${(Math.floor(f / 4) / 3 * 100).toFixed(2)}%"></i>` : '<i></i>'; };
    view = `<div class="sheet grid ${sc.key}" style="--g:${g};--atlas:url(${sc.key === 'kiku' ? IMG.atlas : IMG.spk[2]})" role="img" aria-label="第 ${UI.sheetPage} 张贴图，${k} 帧">${Array.from({length: g * g}, (_, i) => cell(i)).join('')}${UI.atlasGrid ? '<b class="glines"></b>' : ''}</div>`;
    pager = `${pgBtn(-1, UI.sheetPage <= 1, '上一张')}<span class="pg-t"><span class="lbl">${esc(V.name)}</span><b>${UI.sheetPage}</b><span class="lbl">/ ${V.pages}</span></span>${pgBtn(1, UI.sheetPage >= V.pages, '下一张')}`;
    px = V.cell * g;
  }
  $('#deliv').innerHTML = `<div class="atlas">${view}<div class="pager">${pager}</div></div>
    <div class="dwrap"><div class="dh"><span class="lbl">勾选 ${nChk} 层</span><span class="sp"></span><button class="btn tbtn" data-act="exportChecked" ${nChk ? '' : 'disabled data-tip="未勾选层"'}>导出勾选</button></div>${delivTableHTML(sc, selLayer)}</div>`;
  /* 缩放比例：屏幕上显示的宽度 ÷ 实际像素 */
  const z = $('#delivZoom'), sh = $('#deliv .sheet');
  if (z && sh) requestAnimationFrame(() => { z.textContent = `显示 ${Math.max(1, Math.round(sh.clientWidth / px * 100))} %`; z.dataset.tip = `${UI.dview === '逐帧' ? '单格' : '整张'} ${px} px 显示成 ${sh.clientWidth} px`; });
}

/* ---------- 布局 ---------- */
function applyLayout() {
  const app = $('#app');
  app.classList.toggle('s1366', UI.size === 1366);
  app.classList.toggle('compact', UI.compact);
  app.classList.toggle('no-left', !UI.left || UI.compact);
  app.classList.toggle('no-right', !UI.right || UI.compact);
  layoutLeft();
}
function layoutLeft() {
  const L = $('#left'), sc = cur();
  L.classList.toggle('tree-closed', UI.treeClosed); L.classList.toggle('lib-closed', UI.libClosed);
  $('#libToggle').setAttribute('aria-expanded', String(!UI.libClosed));
  const cs = getComputedStyle($('#app')), rowH = parseFloat(cs.getPropertyValue('--h-row')), barH = parseFloat(cs.getPropertyValue('--h-bar'));
  const colH = L.clientHeight || (UI.size === 1366 ? 676 : 974);
  /* 结构的标题在工具行里，结构树这一格只有行 */
  const want = (rowsOf(sc).length + 1) * rowH + 10;
  const h = UI.treeH[UI.scene + UI.size] || Math.min(want, Math.round(colH * .55));
  L.style.setProperty('--tree-h', Math.round(clamp(h, rowH * 2, colH - barH - 8)) + 'px');
}
function renderAll(toTop = false) {
  applyLayout();
  $('#effName').textContent = cur().name;
  $('#treeQ input').value = UI.treeQ; $('#treeQ').classList.toggle('has-val', !!UI.treeQ);
  $$('#modeTabs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === UI.mode)));
  renderViewbar(); renderTree(); renderTransport(); renderTL(); renderInsp(false); renderLib(); renderStage(); renderStatus(); onHist();
  /* v3.3 第 4 条：打开效果、换屏幕尺寸时结构树和时间轴都滚到顶（第一行看得见）；放不下的行由上下边缘的提示写出来 */
  if (toTop) { const tl = $('#tlw .tl'); lockSync = true; if (tl) tl.scrollTop = 0; $('#tree').scrollTop = 0; requestAnimationFrame(() => { lockSync = false; placePH(cur(), $('#tlw')); tlMoreHint($('#tlw')); }); }
}
/* 选中一行（结构树、键盘、面包屑、时间轴）时：那一行在时间轴里看不见才滚，滚到刚好露出来（不压在上下边缘的提示条下面） */
function ensureVisible() {
  const sc = cur(), tl = $('#tlw .tl'), row = tl && $(`.tlrow[data-id="${sc.sel}"]`, tl); if (!row) return;
  const hd = $('.fixed', tl).offsetHeight, E = 20, y = row.offsetTop, h = row.offsetHeight, max = tl.scrollHeight - tl.clientHeight;
  let top = tl.scrollTop;
  if (y < top + hd + (top > 0 ? E : 0)) top = y - hd - E;
  else if (y + h > top + tl.clientHeight - (top < max ? E : 0)) top = y + h - tl.clientHeight + E;
  top = Math.round(clamp(top, 0, max)); if (top === tl.scrollTop) return;
  lockSync = true; tl.scrollTop = top; $('#tree').scrollTop = top;
  requestAnimationFrame(() => { lockSync = false; placePH(sc, $('#tlw')); tlMoreHint($('#tlw')); });
}
/* 结构树与时间轴各自滚动、滚动同步。v3.3：两边能滚的距离不一样（结构树多一行效果名和「加层」），
   程序设过去的值会再触发一次对方的滚动事件，用 _echo 认出这一次回声，不再反过来改回去 */
let lockSync = false;
function bindSync() {
  const tl = $('#tlw .tl'), tr = $('#tree');
  if (!tl || tl.dataset.sync) return; tl.dataset.sync = 1;
  tl.addEventListener('scroll', () => { if (lockSync || Math.abs(tl.scrollTop - (tl._echo ?? -1)) < 1) return; tr.scrollTop = tl.scrollTop; tr._echo = tr.scrollTop; });
}
$('#tree').addEventListener('scroll', () => { const tl = $('#tlw .tl'), tr = $('#tree'); if (lockSync || !tl || Math.abs(tr.scrollTop - (tr._echo ?? -1)) < 1) return; tl.scrollTop = tr.scrollTop; tl._echo = tl.scrollTop; tlMoreHint($('#tlw')); });
new MutationObserver(bindSync).observe($('#tlw'), {childList: true});

/* v3.2 第 1 条：只展开当前编辑的层及其上级，其余层折成一行。手动点开的层照常展开，换到别的层时再收起 */
function focusOpen(sc, id) {
  const chain = ancestors(sc, id), L = chain.find(n => n.type === 'layer');
  let ch = false;
  const set = (n, v) => { if (n.kids.length && n.open !== v) { n.open = v; ch = true; } };
  if (L && L.id !== sc.focusL) { layersOf(sc).forEach(l => { if (l !== L) set(l, false); }); sc.focusL = L.id; }
  chain.forEach(n => { if (n !== chain[chain.length - 1] || n.type === 'layer') set(n, true); });
  return ch;
}
function select(id, focusTree = false) {
  const sc = cur(); if (!find(sc, id)) return;
  sc.sel = id;
  const re = focusOpen(sc, id);
  renderTree(sc, $('#tree'), focusTree);
  if (re) { renderTL(); layoutLeft(); }
  $$('#tlw .tlrow').forEach(r => r.classList.toggle('is-sel', r.dataset.id === id));
  renderInsp(false); renderTransport(); placePH(sc, $('#tlw'));
  if (UI.mode === '贴图与交付') renderDeliv();
  ensureVisible();
}
function restructure(focus) { const sc = cur(); renderTree(sc, $('#tree'), focus); renderTL(); layoutLeft(); renderInsp(); renderTransport(); renderStage(); if (UI.mode === '贴图与交付') renderDeliv(); placePH(sc, $('#tlw')); renderStatus(); }

/* ---------- 统一的改动模型：打开时 / 上次保存 / 上次导出 ---------- */
function snapStruct(sc) {
  const m = new Map();
  const w = (n, p, i) => { m.set(n.id, {node: n, parentId: p ? p.id : null, index: i, name: n.name, tl: clone(n.tl), kids: n.kids.map(k => k.id)}); n.kids.forEach((k, j) => w(k, n, j)); };
  w(sc.root, null, 0); return m;
}
function applySnap(sc, snap) {
  snap.forEach(e => { e.node.name = e.name; e.node.tl = clone(e.tl); e.node.kids = e.kids.map(id => snap.get(id).node); });
  renumber(sc); if (!find(sc, sc.sel)) sc.sel = layersOf(sc)[0].id;
}
const sigOf = n => JSON.stringify({n: n.name, t: n.tl, k: n.kids.map(sigOf)});
function initModel(sc) { sc.saveSnap = snapStruct(sc); sc.expSnap = snapStruct(sc); sc.expSig = {}; layersOf(sc).forEach(l => { sc.expSig[l.id] = sigOf(l); }); }
['kiku', 'spk'].forEach(k => initModel(SC[k]));
const keysOf = sc => Object.keys(PS).filter(k => k.startsWith(sc.key + '|'));
function staleLayers(sc, noPend) {
  const out = new Set(), Ls = layersOf(sc);
  if (!sc.expSig) return out;
  sc.initStale.forEach(id => { if (Ls.some(l => l.id === id)) out.add(id); });
  keysOf(sc).forEach(k => {
    if (!isStaleP(PS[k])) return;
    const f = find(sc, k.split('|')[1]); if (!f) return;
    if (f.n === sc.root) Ls.forEach(l => out.add(l.id)); else { const l = layerOf(sc, f.n.id); if (l) out.add(l.id); }
  });
  Ls.forEach(l => { if (sc.expSig[l.id] !== sigOf(l)) out.add(l.id); if (!noPend && sc.pend[l.id] && sc.pend[l.id].size) out.add(l.id); });
  return out;
}
/* 为什么需重新导出：自上次导出以来的改动，按层列出（格式同未保存清单） */
function staleWhy(sc) {
  const st = staleLayers(sc), Ls = layersOf(sc), why = new Map(), E = sc.expSnap, add = (l, t) => { if (!why.has(l.id)) why.set(l.id, []); why.get(l.id).push(t); };
  const lname = l => l === sc.root ? sc.short : l.name;
  keysOf(sc).forEach(k => {
    const s = PS[k]; if (!isStaleP(s)) return;
    const f = find(sc, k.split('|')[1]); if (!f) return;
    const what = s.kind === 'curve' ? `${s.lab} ${curveDiff(s, s.expV[0], s.v)}` : !same(s.expV[0], s.v) ? `${s.lab} ${fmtU(s, s.expV[0])} → ${fmtU(s, s.v)}` : s.rnd && s.expV[1] !== s.rndV ? `${s.lab} 随机 ±${s.expV[1]} → ±${s.rndV}${s.rndU}` : `${s.lab} 分布 ${fmt(s.expV[2], .01)} → ${fmt(s.ex, .01)}`;
    const L = f.n === sc.root ? Ls : [layerOf(sc, f.n.id)].filter(Boolean);
    L.forEach(l => add(l, (f.n === l ? '' : label(sc, f.n) + ' ') + what));
  });
  Ls.forEach(l => {
    if (sc.expSig[l.id] !== sigOf(l) && E) {
      const now = new Set(); const w = n => { now.add(n.id); n.kids.forEach(w); }; w(l);
      const walk = n => {
        const e = E.get(n.id);
        if (!e) { add(l, `新加「${n.name}」`); return; }
        if (e.name !== n.name) add(l, `改名 ${e.name} → ${n.name}`);
        if (!same(e.tl, n.tl) && n.tl) add(l, `${n.type === 'output' ? '导出范围' : n.name + ' 时段'} ${e.tl.in.toFixed(2)}–${e.tl.out.toFixed(2)} → ${n.tl.in.toFixed(2)}–${n.tl.out.toFixed(2)} s`);
        e.kids.filter(id => !now.has(id) && E.get(id)).forEach(id => add(l, `删除「${E.get(id).name}」`));
        const keep = n.kids.map(k => k.id).filter(id => E.has(id)), was = e.kids.filter(id => now.has(id));
        if (!same(keep, was)) add(l, `${n.name} 顺序已改`);
        n.kids.forEach(walk);
      };
      const c0 = (why.get(l.id) || []).length; walk(l);
      if ((why.get(l.id) || []).length === c0) add(l, '结构已改');
    }
    if (sc.pend[l.id] && sc.pend[l.id].size) add(l, `${[...sc.pend[l.id]].map(p => p === 'pc' ? 'PC' : '手机').join('、')}贴图未导出`);
    if (st.has(l.id) && !why.has(l.id) && sc.initStale.has(l.id)) add(l, sc.initWhy[l.id] || '打开前已改');
  });
  return [...why].filter(([id]) => st.has(id)).map(([id, list]) => ({l: find(sc, id).n, name: lname(find(sc, id).n), list}));
}
function staleWhyHTML(which) {
  const sc = cur(), all = staleWhy(sc), rows = which === 'all' ? all : all.filter(x => x.l.id === which);
  if (!rows.length) return '已导出，之后没有改动';
  /* 一层一行：「金锦层需重新导出：缩放 1.10 → 1.30」 */
  const lines = rows.map(r => `<span>${esc(r.name)}需重新导出：${esc(r.list.slice(0, 3).join('；'))}${r.list.length > 3 ? ` 等 ${r.list.length} 项` : ''}</span>`);
  return `<span class="why">${lines.join('')}</span>${which === 'all' ? '<span class="hint2">点击打开导出选项</span>' : ''}`;
}
function changesOf(sc) {
  const out = [];
  if (!sc.saveSnap) return out;
  keysOf(sc).forEach(k => {
    const s = PS[k]; if (!isDirty(s)) return;
    const f = find(sc, k.split('|')[1]); if (!f) return;
    const cv = s.kind === 'curve';   /* 曲线写清改了哪个关键点 */
    out.push({where: label(sc, f.n), what: cv ? `${s.lab} ${curveDiff(s, s.baseV[0], s.v)}` : s.lab, from: cv ? '' : fmtU(s, s.baseV[0]), to: cv ? '' : fmtU(s, s.v), restore: () => {
      const before = valOf(s), tgt = s.baseV;
      const apply = vals => { s.v = clone(vals[0]); if (s.rnd) s.rndV = vals[1]; if (s.ex !== undefined) s.ex = vals[2]; syncRow(k); onParamChange(k); afterCommit(k, true); };
      apply(tgt); pushH({fn: true, k, desc: cv ? `${s.lab} ${curveDiff(s, before[0], tgt[0])}` : `${s.lab} ${fmtU(s, before[0])} → ${fmtU(s, tgt[0])}`, undo: () => apply(before), redo: () => apply(tgt)}, sc.key);
    }});
  });
  const nowSnap = snapStruct(sc), S = sc.saveSnap;
  S.forEach((e, id) => {
    const n = nowSnap.get(id);
    if (!n) { if (!nowSnap.has(e.parentId) && e.parentId) return; out.push({where: e.name, what: '删除', from: '', to: '', restore: () => structRestore(sc, `恢复「${e.name}」`)}); return; }
    if (n.name !== e.name) out.push({where: e.name, what: '改名', from: e.name, to: n.name, restore: () => nodeRestore(sc, e, 'name')});
    if (!same(n.tl, e.tl)) { const isO = e.node.type === 'output', pn = isO && S.get(e.parentId), wn = isO ? (pn && pn.node === sc.root ? sc.short : pn ? pn.name : '') : n.name;
      out.push({where: wn, what: isO ? '导出范围' : '时段', from: `${e.tl.in.toFixed(2)}–${e.tl.out.toFixed(2)} s`, to: `${n.tl.in.toFixed(2)}–${n.tl.out.toFixed(2)} s`, restore: () => nodeRestore(sc, e, 'tl')}); }
    const keep = n.kids.filter(x => S.has(x)), was = e.kids.filter(x => nowSnap.has(x));
    if (!same(keep, was)) out.push({where: n.name, what: '顺序', from: '', to: '', restore: () => structRestore(sc, `恢复「${n.name}」下的顺序`)});
  });
  nowSnap.forEach((e, id) => { if (!S.has(id) && S.has(e.parentId)) out.push({where: e.name, what: '新加', from: '', to: '', restore: () => structRestore(sc, `去掉「${e.name}」`)}); });
  return out;
}
/* 结构恢复：只恢复结构与名称、区间（参数另算），一步撤销 */
function structRestore(sc, desc) {
  const before = snapStruct(sc), target = sc.saveSnap;
  const go = s => { applySnap(sc, s); restructure(); };
  go(target); pushH({fn: true, desc, target: () => $('#tree'), undo: () => go(before), redo: () => go(target)}, sc.key);
}
function nodeRestore(sc, e, f) {
  const n = e.node, old = f === 'name' ? n.name : clone(n.tl), v = f === 'name' ? e.name : clone(e.tl);
  const set = x => { if (f === 'name') n.name = x; else n.tl = clone(x); restructure(); };
  set(v); pushH({fn: true, desc: f === 'name' ? `改名 ${old} → ${v}` : `${n.name} 时段恢复`, node: n.id, undo: () => set(old), redo: () => set(v)}, sc.key);
}
function changesMenu(btn) {
  const sc = cur(), list = changesOf(sc);
  if (!list.length) { openMenu(btn, [{head: `已保存 ${sc.savedAt}`}, {t: '无未保存改动', dis: true}]); return; }
  const items = [{head: `未保存 ${list.length} 项`}];
  list.forEach(c => items.push({html: `<span class="cw">${esc(c.where)}</span>　${esc(c.what)}${c.from || c.to ? `　${esc(c.from)} → ${esc(c.to)}` : ''}`, btn: '恢复', keep: true, act: () => { c.restore(); closeMenu(); changesMenu(btn); }}));
  items.push('-', {t: '还原', k: '上次保存', act: doRevert}, {t: '保存', k: 'Ctrl+S', act: doSave});
  openMenu(btn, items, {align: 'below'});
}
function hhmm() { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function doSave() {
  const sc = cur();
  keysOf(sc).forEach(k => { PS[k].baseV = clone(valOf(PS[k])); });
  sc.saveSnap = snapStruct(sc); sc.savedAt = hhmm(); renderStatus();
  flashHint($('#saveSt'), `已保存 ${sc.savedAt}`);
}
function doRevert() {
  const sc = cur(), keys = keysOf(sc).filter(k => isDirty(PS[k])), structBefore = snapStruct(sc), target = sc.saveSnap;
  const before = keys.map(k => [k, valOf(PS[k])]);
  if (!changesOf(sc).length) return;
  const apply = back => {
    before.forEach(([k, v0]) => { const s = PS[k], vals = back ? v0 : s.baseV; s.v = clone(vals[0]); if (s.rnd) s.rndV = vals[1]; if (s.ex !== undefined) s.ex = vals[2]; });
    applySnap(sc, back ? structBefore : target); restructure();
  };
  const n = changesOf(sc).length;
  apply(false); pushH({fn: true, desc: `还原 ${n} 项`, undo: () => apply(true), redo: () => apply(false)}, sc.key);
  toast(`已还原 ${n} 项`, {undo: () => undo(sc), near: $('#insp')});
}

/* 结构树里层行的「需重新导出」标记：跳到这一层的「输出」模块 */
function jumpToOutput(n) {
  const sc = cur(); select(n.id);
  if (!INSP) return; MO[INSP.P.prefix + '|输出'] = true; renderInsp(false);
  const m = $('#pbody .mod[data-mod="输出"]'); if (!m) return;
  m.scrollIntoView({block: 'start'}); flashHint($('.mod-h', m), `输出：${staleWhy(sc).filter(x => x.l === n || (n === sc.root && x.l === sc.root)).flatMap(x => x.list).slice(0, 1)[0] || '需重新导出'}`);
}

/* 切换效果时选「不保存」：回到上次保存的状态，这个效果的撤销记录清空（相当于关掉文件） */
function dropChanges(sc) {
  keysOf(sc).filter(k => isDirty(PS[k])).forEach(k => { const s = PS[k], v = s.baseV; s.v = clone(v[0]); if (s.rnd) s.rndV = v[1]; if (s.ex !== undefined) s.ex = v[2]; });
  applySnap(sc, sc.saveSnap); sc.H.u.length = 0; sc.H.r.length = 0;
}

/* ---------- 结构树操作：能撤销的直接执行，不弹确认 ---------- */
function nodeMenu(btn, n) {
  const sc = cur(), f = find(sc, n.id);
  if (n.type === 'group') return openMenu(btn, [{head: sc.name}, {t: '改名', act: () => toast('样板中不改效果名')}, {t: '存为模板', act: () => toast('已存为我的模板')}, {t: '导出配方', act: () => toast('已导出配方文件')}, {t: '复制意见', act: () => toast('已复制意见')}, '-', {t: '删除效果…', act: () => askDeleteEffect(btn)}]);
  if (n.type === 'output') return openMenu(btn, [{head: label(sc, f.parent) + ' 输出'}, {t: '导出本层', act: () => doExport('current')}, {t: '打开文件夹', act: () => toast('已打开导出文件夹')}]);
  const sib = f.arr.filter(x => x.type !== 'output'), i = sib.indexOf(n);
  openMenu(btn, [{head: `${n.no ? n.no + ' ' : ''}${n.name}`},
    {t: '上移', dis: i <= 0, act: () => moveNode(n, -1)}, {t: '下移', dis: i >= sib.length - 1, act: () => moveNode(n, 1)},
    {t: '改名', k: 'F2', act: () => rename(n)}, {t: '复制', act: () => dupNode(n)},
    {t: '加发射器', act: () => addEmitter(n)},
    {t: n.show ? '隐藏' : '显示', k: 'H', act: () => toggleShow(n)}, {t: n.solo ? '移出只看' : '加入只看', k: 'S', act: () => soloToggle(n)}, '-',
    {t: '删除', k: 'Delete', act: () => doDelete(n)}]);
}
function askDeleteEffect(anchor) {
  const sc = cur();
  openDialog({title: `删除效果「${sc.name}」`, danger: true, ok: '删除', body: '效果文件、版本记录和导出记录将一并删除。此操作不能撤销。', onOk: () => toast('样板中不删除效果')}, anchor);
}
function moveNode(n, d) {
  const sc = cur(), f = find(sc, n.id), a = f.arr, i = f.i, j = i + d;
  if (j < 0 || j >= a.length || a[j].type === 'output') return;
  const sw = () => { const x = a.indexOf(n), y = x + d; [a[x], a[y]] = [a[y], a[x]]; renumber(sc); restructure(true); };
  const back = () => { const x = a.indexOf(n), y = x - d; [a[x], a[y]] = [a[y], a[x]]; renumber(sc); restructure(true); };
  sw(); pushH({fn: true, desc: `${n.name} ${d < 0 ? '上移' : '下移'}`, node: n.id, undo: back, redo: sw}, sc.key);
}
function renumber(sc) { if (sc.key !== 'spk') sc.root.kids.filter(l => l.type === 'layer').forEach((l, i) => { l.no = i + 1; }); }
function dupNode(n) {
  const sc = cur(), f = find(sc, n.id);
  const c = JSON.parse(JSON.stringify(n, (k, v) => k === 'e' ? undefined : v));
  const re = (m, o) => { m.id = 'n' + (++UID); if (o.e) m.e = o.e; m.kids.forEach((k, i) => re(k, o.kids[i])); }; re(c, n);
  c.name += ' 副本'; c.solo = false;
  const add = () => { f.arr.splice(f.arr.indexOf(n) + 1, 0, c); renumber(sc); sc.sel = c.id; restructure(true); };
  const rm = () => { f.arr.splice(f.arr.indexOf(c), 1); renumber(sc); sc.sel = n.id; restructure(true); };
  add(); pushH({fn: true, desc: `复制「${n.name}」`, node: n.id, undo: rm, redo: add}, sc.key);
}
function addEmitter(target) {
  const sc = cur(); let p = target;
  if (!p) { const f = find(sc, sc.sel); p = f.n.type === 'layer' || (sc.key === 'spk' && f.n.type === 'emitter') ? f.n : (f.parent && f.parent.type !== 'group' ? f.parent : (sc.key === 'spk' ? sc.root : sc.root.kids[0])); if (p.type === 'output') p = find(sc, p.id).parent; }
  const T = sc.T, n = N({type: 'emitter', icon: 'spark', name: '新发射器', custom: true, tl: {in: (p.tl ? p.tl.in : 0), out: (p.tl ? Math.min(p.tl.out, T) : T)}});
  if (sc.key === 'spk') { n.e = Object.assign({}, SPK.emitters[2], {parent: p.type === 'group' ? null : p.e.id}); n.no = String(SPK.emitters.length + 1); }
  const at = p.kids.findIndex(k => k.type === 'output'), idx = at < 0 ? p.kids.length : at;
  const add = () => { p.kids.splice(idx, 0, n); p.open = true; sc.sel = n.id; restructure(true); };
  const rm = () => { p.kids.splice(p.kids.indexOf(n), 1); sc.sel = p.id; restructure(true); };
  add(); pushH({fn: true, desc: `加发射器「${n.name}」`, node: p.id, undo: rm, redo: add}, sc.key);
  rename(n);
}
function addLayer(how) {
  const sc = cur(), no = sc.root.kids.filter(l => l.type === 'layer').length + 1;
  const L = N({type: 'layer', icon: 'layer', no, name: how === 'tpl' ? '芯入菊' : '新层', open: true, tl: {in: 0, out: Math.min(3, sc.T)}});
  L.kids = [N({type: 'emitter', icon: 'star', name: '星', data: '星', tl: {in: 0, out: Math.min(3, sc.T)}}), N({type: 'output', icon: 'out', name: '输出', tl: {in: 0, out: Math.min(3, sc.T), cells: 3, per: 16}})];
  const at = sc.root.kids.findIndex(k => k.type === 'output'), idx = at < 0 ? sc.root.kids.length : at;
  const add = () => { sc.root.kids.splice(idx, 0, L); renumber(sc); sc.sel = L.id; restructure(true); };
  const rm = () => { sc.root.kids.splice(sc.root.kids.indexOf(L), 1); renumber(sc); sc.sel = sc.root.kids[0].id; restructure(true); };
  add(); pushH({fn: true, desc: `加层「${L.name}」`, node: L.id, undo: rm, redo: add}, sc.key);
  if (how !== 'tpl') rename(L);
}
function rename(n) {
  const sc = cur(), row = $(`#tree .trow[data-id="${n.id}"]`); if (!row) return;
  const tx = $('.tx', row); const inp = document.createElement('input');
  inp.className = 'ren'; inp.value = n.name; inp.setAttribute('aria-label', '名称');
  tx.replaceWith(inp); inp.focus(); inp.select();
  let done = false;
  /* 同级不能重名（层与层、同一父级下的发射器）；名称不能为空。就地报错，不提交 */
  const sib = n.type === 'layer' ? sc.root.kids.filter(x => x.type === 'layer') : (find(sc, n.id).parent || sc.root).kids;
  const bad = v => !v ? '名称不能为空' : sib.some(x => x !== n && x.name === v) ? (n.type === 'layer' ? '已有同名层' : '已有同名发射器') : null;
  const fin = ok => {
    if (done) return;
    const v = inp.value.trim(), old = n.name;
    if (ok && v !== old && bad(v)) { inp.classList.add('is-error'); showTip(inp, `<b>${bad(v)}</b>换一个名称，或按 Esc 取消`, 'err'); inp.focus(); return false; }
    done = true; hideTip();
    if (ok && v && v !== old) { const set = x => { n.name = x; restructure(true); }; set(v); pushH({fn: true, desc: `改名 ${old} → ${v}`, node: n.id, undo: () => set(old), redo: () => set(v)}, sc.key); }
    else restructure(true);
    return true;
  };
  inp.addEventListener('input', () => { const b = bad(inp.value.trim()); inp.classList.toggle('is-error', !!b && inp.value.trim() !== n.name); if (!b && OV.tip && OV.tip.classList.contains('err')) hideTip(); });
  inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); fin(true); } if (ev.key === 'Escape') fin(false); });
  /* 点到别处：名称不合法就不改名，并在行上说明 */
  inp.addEventListener('blur', () => { if (done) return; const b = bad(inp.value.trim()); if (b && inp.value.trim() !== n.name) { done = true; hideTip(); restructure(true); flashHint($(`#tree .trow[data-id="${n.id}"]`) || $('#tree'), `${b}，未改名`); return; } fin(true); });
}
function doDelete(n) {
  const sc = cur(), f = n && find(sc, n.id); if (!f) return;
  if (n.type === 'group' || n.type === 'output') { flashHint($(`#tree .trow[data-id="${n.id}"]`) || $('#tree'), n.type === 'group' ? '删除效果在本行 ⋯ 菜单中' : '输出随层存在，不能单独删除'); return; }
  if (n.type === 'layer' && sc.root.kids.filter(l => l.type === 'layer').length === 1) { toast('至少保留一层', {near: $('#left')}); return; }
  const arr = f.arr, at = f.i, wasSel = sc.sel;
  /* 别的层的「轨迹联动」按层的顺序记勾选：删掉一层时把它那一格拿掉，撤销时放回去 */
  const links = n.type !== 'layer' ? [] : sc.root.kids.filter(L => L.type === 'layer' && L !== n).map(L => {
    const k = `${sc.key}|${L.id}|轨迹联动|联动的层`, others = sc.root.kids.filter(x => x.type === 'layer' && x !== L), i = others.indexOf(n);
    const v = PS[k] ? PS[k].v : (layerMods(sc, L).find(m => m.t === '轨迹联动') || {rows: [{v: []}]}).rows[0].v;
    return {L, k, i, v: clone(v), on: i >= 0 && !!v[i]};
  });
  const F = ['openV', 'baseV', 'expV', 'defV'];
  links.forEach(x => { if (x.i < 0) return; const s0 = st(x.k, {k: 'chk', lab: '联动的层', v: x.v}); x.orig = {v: clone(s0.v)}; F.forEach(f => { x.orig[f] = clone(s0[f]); }); });
  const drop = (a, i) => Array.isArray(a) ? a.filter((_, j) => j !== i) : a;
  const relink = back => links.forEach(x => { if (x.i < 0) return; const s0 = PS[x.k]; s0.v = back ? clone(x.orig.v) : drop(x.orig.v, x.i); F.forEach(f => { s0[f] = back ? clone(x.orig[f]) : [drop(x.orig[f][0], x.i), x.orig[f][1], x.orig[f][2]]; }); });
  const broken = links.filter(x => x.on).map(x => `「${x.L.name}」`);
  const rm = () => { arr.splice(arr.indexOf(n), 1); relink(false); renumber(sc); if (!find(sc, sc.sel)) sc.sel = (arr[Math.min(at, arr.length - 1)] || f.parent).id; restructure(true); };
  const add = () => { arr.splice(at, 0, n); relink(true); renumber(sc); sc.sel = wasSel; restructure(true); };
  rm(); const e = {fn: true, desc: `删除「${n.name}」`, node: n.id, undo: add, redo: rm}; pushH(e, sc.key);
  toast(`已删除「${n.name}」${broken.length ? `，${broken.join('')}的轨迹联动已断开` : ''}`, {near: $('#left'), entry: e, undo: () => { const H = sc.H, i = H.u.indexOf(e); if (i >= 0) { H.u.splice(i, 1); add(); H.r.push(e); onHist(); undoFeedback(e, true); } }});
}
function toggleOpen(n, v) { n.open = v === undefined ? !n.open : v; renderTree(cur(), $('#tree'), true); renderTL(); layoutLeft(); ensureVisible(); }
/* 显示 / 只看：视图状态，不进撤销；只看可叠加 */
function toggleShow(n) { if (!n || n.type === 'group' || n.type === 'output') return; n.show = !n.show; renderTree(); renderTL(); renderInsp(); flashHint($(`#tree .trow[data-id="${n.id}"]`), n.show ? `已显示「${n.name}」` : `已隐藏「${n.name}」`); }
function soloOnly(n) {
  const sc = cur(); if (!n || n.type === 'group' || n.type === 'output') return;
  const only = soloList(sc).length === 1 && n.solo;
  const w = m => { m.solo = false; m.kids.forEach(w); }; w(sc.root);
  n.solo = !only; soloRender();
}
function soloToggle(n) { if (!n || n.type === 'group' || n.type === 'output') return; n.solo = !n.solo; soloRender(); }
function soloClear() { const sc = cur(); if (!soloList(sc).length) return false; const w = m => { m.solo = false; m.kids.forEach(w); }; w(sc.root); soloRender(); return true; }
function soloRender() { renderTree(); renderTL(); renderSoloBadge(); }

/* ---------- 导出：默认只导出需重新导出的层；平台可勾选；摘要写清位置与文件名 ---------- */
function exportScope(sc, scope) {
  const Ls = layersOf(sc), st = staleLayers(sc);
  if (scope === 'all') return Ls;
  if (scope === 'current') { const l = layerOf(sc, sc.sel) || sc.root; return Ls.filter(x => x === l); }
  if (scope === 'checked') { const c = checkedOf(sc); return Ls.filter(x => c.has(x.id)); }
  return Ls.filter(l => st.has(l.id));
}
const platsOf = sc => UI.expPlat[sc.key] || (UI.expPlat[sc.key] = {pc: true, mb: true});
const expFolder = () => (typeof window.shellExportFolderName === 'function' && window.shellExportFolderName()) || 'FWL_Export';
function exportSummary(sc, Ls) {
  /* 平台：导出面板的勾选 × 每层「输出」里的 PC / 手机开关 */
  const rows = delivRows(sc).filter(r => Ls.includes(r.n)), pc = rows.reduce((a, r) => a + (r.pc ? outCount(sc, r).sh : 0), 0), mb = rows.reduce((a, r) => a + (r.mb ? outCount(sc, r).ms : 0), 0);
  const off = rows.flatMap(r => [!r.pc ? `${r.name}：PC 已关` : '', !r.mb ? `${r.name}：手机已关` : '']).filter(Boolean);
  const two = n => String(n).padStart(2, '0');
  const files = plat => {
    const fs = rows.filter(r => plat === 'pc' ? r.pc : r.mb).map(r => { const n = plat === 'pc' ? outCount(sc, r).sh : outCount(sc, r).ms, base = `T_${sc.short}_${r.n === sc.root ? '整体' : r.n.name}${plat === 'pc' ? '' : '_Mobile'}`; return n > 1 ? `${base}_01–${two(n)}.png` : `${base}_01.png`; });
    return !fs.length ? '无' : fs.length > 2 ? `${fs[0]} 等 ${fs.length} 层，共 ${plat === 'pc' ? pc : mb} 张` : fs.join('、');
  };
  /* 隐藏的层（或发射器）照样导出：在摘要里写出来 */
  const hidLayers = Ls.filter(l => l !== sc.root && !l.show).length;
  let hidEm = 0; if (Ls.includes(sc.root) && sc.key === 'spk') { const w = n => { if (n !== sc.root && n.type === 'emitter' && !n.show) hidEm++; n.kids.forEach(w); }; w(sc.root); }
  return {names: Ls.map(l => l === sc.root ? sc.short : l.name), pc, mb, off, filesPC: files('pc'), filesMB: files('mb'), hidden: hidLayers ? `含 ${hidLayers} 个隐藏层，照常导出` : hidEm ? `含 ${hidEm} 个隐藏发射器，照常导出` : '',
    path: `导出文件夹 ${expFolder()} / ${sc.short} / 修订 ${sc.rev}`};
}
function doExport(scope = 'stale') {
  const sc = cur(), Ls = exportScope(sc, scope), P = platsOf(sc);
  if (!P.pc && !P.mb) { toast('未选平台'); return; }
  if (!Ls.length) { toast(scope === 'checked' ? '未勾选层' : '没有需重新导出的层', scope === 'checked' ? {} : {action: {label: '导出全部', fn: () => doExport('all')}}); return; }
  const S = exportSummary(sc, Ls), b = $('#expBtn .btn'), wasStale = staleLayers(sc, true);   /* 不算「另一平台还没导出」：那只是待补 */
  b.classList.add('is-loading'); b.innerHTML = '<span class="spin"></span>导出中';
  $('#expBtn .btn + .btn').disabled = true;
  setTimeout(() => {
    const all = Ls.length === layersOf(sc).length;
    keysOf(sc).forEach(k => {
      const f = find(sc, k.split('|')[1]); if (!f) return;
      const l = f.n === sc.root ? (all ? null : undefined) : layerOf(sc, f.n.id);
      if (l === null || (l && Ls.includes(l))) PS[k].expV = clone(valOf(PS[k]));
    });
    const snap = snapStruct(sc);
    Ls.forEach(l => {
      sc.expSig[l.id] = sigOf(l); sc.initStale.delete(l.id);
      const w = n => { sc.expSnap.set(n.id, snap.get(n.id)); n.kids.forEach(w); }; w(l);
      /* 只导了一个平台：如果这一层本来就需要重新导出，另一个平台记为还没导出 */
      const pend = sc.pend[l.id] || new Set();
      const r = delivRows(sc).find(x => x.n === l), lp = {pc: !r || r.pc, mb: !r || r.mb};
      if (wasStale.has(l.id)) ['pc', 'mb'].forEach(p => { if (!P[p] && lp[p]) pend.add(p); });
      ['pc', 'mb'].forEach(p => { if (!lp[p]) pend.delete(p); });
      ['pc', 'mb'].forEach(p => { if (P[p]) pend.delete(p); });
      sc.pend[l.id] = pend;
    });
    b.classList.remove('is-loading'); delete UI.checked[sc.key];
    renderStatus(); refreshStaleMarks();
    const what = [P.pc && S.pc ? `PC ${S.pc} 张` : '', P.mb && S.mb ? `手机 ${S.mb} 张` : ''].filter(Boolean).join('、') || '无贴图';
    toast(`已导出 ${S.names.join('、')}：${what}`, {action: {label: '打开文件夹', fn: () => toast('已打开导出文件夹')}, near: $('#mid')});
    /* 外壳接口：导出完成后由外壳决定是否生成编排预览、切到导入 */
    if (typeof window.shellAfterExport === 'function') window.shellAfterExport({name: sc.short, pc: P.pc ? S.pc : 0, mobile: P.mb ? S.mb : 0, alsoWB: !!UI.alsoWB[sc.key], layers: S.names});
  }, 900);
}
/* 导出 ▾（§12）分三段：
   1 一行摘要「1 层需重新导出　PC + 手机　导出文件夹 FWL_Export」，「详情」点开才出文件清单；
   2 操作：重新导出（右侧写 1）、导出全部（3）、导出本层、导出勾选（data-exp 不变，外壳按它拦截）；
   3 选项：平台（分段 S）、「同时放进编排」勾选 */
const platTxt = P => P.pc && P.mb ? 'PC + 手机' : P.pc ? 'PC' : P.mb ? '手机' : '未选平台';
function exportMenu(btn, focusSel) {
  const sc = cur(), st = exportScope(sc, 'stale'), all = layersOf(sc), curL = exportScope(sc, 'current'), chk = exportScope(sc, 'checked'), P = platsOf(sc), none = !P.pc && !P.mb;
  const S = exportSummary(sc, st.length ? st : all), nm = L => L.map(l => l === sc.root ? sc.short : l.name).join('、'), det = !!UI.expDetail;
  const head = `<div class="msum"><div class="mline"><b>${st.length ? `${st.length} 层需重新导出` : '全部已导出'}</b><button class="btn tbtn mdet" data-r="det" type="button" aria-expanded="${det}">详情${ico('cd', 'dd')}</button></div>
      <div class="mdetail"${det ? '' : ' hidden'}><dl>
      <dt>${st.length ? '需重新导出' : '层'}</dt><dd>${esc(nm(st.length ? st : all))}</dd>
      <dt>平台</dt><dd>${platTxt(P)}</dd>
      <dt>位置</dt><dd class="mloc"><span>${esc(S.path)}</span></dd>
      <dt></dt><dd class="mloc"><button class="btn lnk" data-r="open" type="button">打开</button><button class="btn lnk" data-r="folder" type="button">换文件夹</button></dd>
      <dt>PC</dt><dd class="mfile${P.pc ? '' : ' off'}">${esc(S.filesPC)}</dd>
      <dt>手机</dt><dd class="mfile${P.mb ? '' : ' off'}">${esc(S.filesMB)}</dd>
      <dt>格式</dt><dd>灰度 PNG 序列 + cascade.json</dd></dl>${S.hidden ? `<p class="mnote">${esc(S.hidden)}</p>` : ''}${S.off.length ? `<p class="mnote">${esc(S.off.join('；'))}</p>` : ''}</div></div><hr>`;
  const opts = `<hr><div class="mrow" role="group" aria-label="平台"><span class="lbl">平台</span><div class="seg sm" id="expPlat">${[['PC + 手机', 1, 1], ['PC', 1, 0], ['手机', 0, 1]].map(([t, a, b]) => `<button type="button" data-v="${t}" data-pc="${a}" data-mb="${b}" aria-pressed="${!!P.pc === !!a && !!P.mb === !!b}">${t}</button>`).join('')}</div></div>
    <label class="mopt"><input class="chk" type="checkbox" id="expAlsoWB"${UI.alsoWB[sc.key] ? ' checked' : ''}><span class="mt2"><span>同时放进编排</span></span></label>`;
  const items = [
    {t: '重新导出', k: String(st.length), exp: 'stale', dis: none || !st.length, act: () => doExport('stale')},
    {t: '导出全部', k: String(all.length), exp: 'all', dis: none, act: () => doExport('all')},
    {t: `导出本层（${nm(curL)}）`, k: String(curL.length), exp: 'current', dis: none, act: () => doExport('current')},
    {t: '导出勾选', k: String(chk.length), exp: 'checked', dis: none || !chk.length, act: () => doExport('checked')},
    {html0: opts}];
  const m = openMenu(btn, items, {align: 'right', headHTML: head, cls: 'wide exp'});
  /* v3.2 第 5 条：右对齐挂在下拉箭头下面；宽度不超过「箭头右缘 − 参数名一列的右缘 − 8」，参数名不被盖住、也不切半截；
     面包屑短时也不切它（菜单至少留 220 放得下操作和平台分段，面包屑太长时只保参数名） */
  const I = $('#insp'), plw = $('#pbody .prm .plw'), crumb = $('#path');
  if (I && I.offsetParent && plw && UI.view === 'main') {
    const a = btn.getBoundingClientRect(), cr = crumb ? Math.max(...[...crumb.children].map(c => c.getBoundingClientRect().right)) : 0;
    const lim = a.right - Math.max(plw.getBoundingClientRect().right, a.right - cr - 8 >= 220 ? cr : 0) - 8, w = Math.min(m.offsetWidth, Math.floor(lim));
    m.style.width = w + 'px'; m.style.minWidth = '0'; m.style.left = (a.right - w) + 'px';
  }
  $('#expAlsoWB', m).addEventListener('change', e => { UI.alsoWB[sc.key] = e.target.checked; });
  $$('#expPlat button', m).forEach(c => c.addEventListener('click', e => { P.pc = !!+e.currentTarget.dataset.pc; P.mb = !!+e.currentTarget.dataset.mb; exportMenu(btn, `#expPlat button[data-v="${e.currentTarget.dataset.v}"]`); }));
  $('[data-r="det"]', m).addEventListener('click', e => { UI.expDetail = !UI.expDetail; $('.mdetail', m).hidden = !UI.expDetail; e.currentTarget.setAttribute('aria-expanded', String(UI.expDetail)); });
  $('[data-r="open"]', m).addEventListener('click', () => { closeMenu(); toast('已打开导出文件夹'); });
  $('[data-r="folder"]', m).addEventListener('click', () => {
    closeMenu();
    if (typeof window.shellPickExportFolder === 'function') window.shellPickExportFolder();
    else toast('样板中不换文件夹');
  });
  if (focusSel) { const f = $(focusSel, m); if (f) f.focus(); }
}

/* ---------- 撤销 / 重做反馈 ---------- */
function undoFeedback(e, back) {
  if (UI.view !== 'main') { const k = e.k; const row = k && $(`.prm[data-k="${CSS.escape(k)}"]`); flashHint(row, `${back ? '撤销' : '重做'}：${descOf(e, back)}`); return; }
  const sc = cur();
  let el = null;
  if (e.k && e.k.startsWith(sc.key + '|')) {
    const id = e.k.split('|')[1];
    if (sc.sel !== id && find(sc, id)) select(id);
    el = $(`#pbody .prm[data-k="${CSS.escape(e.k)}"]`);
    if (el) { const m = el.closest('.mod'); if (m && m.classList.contains('is-closed')) { MO[m.dataset.mk] = true; m.classList.remove('is-closed'); } el.scrollIntoView({block: 'nearest'}); }
  } else if (e.node && find(sc, e.node)) el = $(`#tree .trow[data-id="${e.node}"]`) || $(`#tlw .tlrow[data-id="${e.node}"]`);
  else if (e.target) el = e.target();
  if (e.tlNode) el = $(`#tlw .tlrow[data-id="${e.tlNode}"]`) || el;
  flashHint(el || $('#tree'), `${back ? '撤销' : '重做'}：${descOf(e, back)}`);
}

/* ---------- 播放 ---------- */
let rafT = 0;
function setTime(t) { const sc = cur(); sc.t = clamp(t, 0, sc.T); renderTime(); }
function play(on) {
  UI.playing = on === undefined ? !UI.playing : on; renderTransport();
  if (UI.playing) { const sc = cur(); if (sc.t >= sc.T - 1e-3) sc.t = 0; rafT = performance.now(); requestAnimationFrame(tick); }
}
function tick(now) {
  if (!UI.playing || UI.view !== 'main') return;
  const sc = cur(), dt = (now - rafT) / 1000; rafT = now;
  let t = sc.t + dt * UI.speed;
  if (t >= sc.T) { if (UI.loop) t = t % sc.T; else { t = sc.T; setTime(t); play(false); return; } }
  setTime(t); requestAnimationFrame(tick);
}
const stepTick = d => { const sc = cur(); setTime((Math.round(sc.t * sc.fps) + d) / sc.fps); };

/* ---------- 时间轴拖动：播放头、区间条、入点 / 出点；拖动中按 Esc 取消 ---------- */
let TDRAG = null;
function TDRAG_ACTIVE() { return !!TDRAG; }
const scOfWrap = w => SC[w.dataset.scene];
function tlSelect(w, id) { if (w.id === 'tlw') select(id); else { const sc = scOfWrap(w); sc.sel = id; $$('.tlrow', w).forEach(r => r.classList.toggle('is-sel', r.dataset.id === id)); } }
document.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  const w = e.target.closest('.tlw'); if (!w || e.target.closest('.tl-edge, .xio')) return;   /* 「导出范围」行名格里的输入框和命令 */
  const sc = scOfWrap(w), t = e.target;
  const h = t.closest('[data-drag]');
  const scrub = !h && t.closest('[data-scrub], [data-scrub-ph]');
  if (scrub) { e.preventDefault(); TDRAG = {type: 'ph', w, sc, t0: sc.t, trk: $('.fr', w), id: e.pointerId}; w.setPointerCapture(e.pointerId); tlMove(e); return; }
  if (h && h.dataset.drag && h.closest('.xrange')) {
    /* 刻度尺上的导出范围两端：拖的是这一层的输出 */
    const rn = find(sc, h.dataset.row).n, n = find(sc, h.dataset.node).n;
    e.preventDefault();
    TDRAG = {type: h.dataset.drag, w, sc, n, rn, o: null, x0: e.clientX, tl0: clone(n.tl), o0: null, id: e.pointerId, moved: false, ruler: true, trk: $('.fr', w)};
    h.classList.add('is-active'); w.setPointerCapture(e.pointerId); return;
  }
  if (h && h.dataset.drag) {
    /* rn = 这一行的对象；n = 被拖的对象（层的两端是它的输出 = 导出范围）；拖层的整条时导出范围跟着走 */
    const row = h.closest('.tlrow'), rn = find(sc, row.dataset.id).n, n = h.dataset.node ? find(sc, h.dataset.node).n : rn;
    const o = h.dataset.drag === 'move' && (rn.type === 'layer' || rn.type === 'group') ? rn.kids.find(k => k.type === 'output') : null;
    e.preventDefault(); tlSelect(w, rn.id);
    TDRAG = {type: h.dataset.drag, w, sc, n, rn, o, x0: e.clientX, tl0: clone(n.tl), o0: o ? clone(o.tl) : null, id: e.pointerId, moved: false};
    TDRAG.trk = row.querySelector('.trk');
    w.setPointerCapture(e.pointerId); return;
  }
  const row = t.closest('.tlrow[data-id]');
  if (row) tlSelect(w, row.dataset.id);
});
function setT(w, sc, v) { if (w.id === 'tlw') setTime(v); else { sc.t = v; placePH(sc, w); } }
function tlMove(e) {
  const d = TDRAG, sc = d.sc, r = d.trk.getBoundingClientRect(), fps = sc.fps || 30, snap = v => Math.round(v * fps) / fps;
  if (d.type === 'ph') { setT(d.w, sc, snap(clamp((e.clientX - r.left) / r.width, 0, 1) * sc.T)); return; }
  const dt = (e.clientX - d.x0) / r.width * sc.T; if (Math.abs(e.clientX - d.x0) > 2) d.moved = true;
  const tl = d.n.tl, o = d.tl0, len = o.out - o.in;
  if (d.type === 'move') {
    const a = snap(clamp(o.in + dt, 0, sc.T - len)); tl.in = a; tl.out = +(a + len).toFixed(3); if (o.hatch) tl.hatch = +(o.hatch + (a - o.in)).toFixed(3);
    if (d.o) { const sh = a - o.in, ol = d.o0.out - d.o0.in, oi = clamp(+(d.o0.in + sh).toFixed(3), 0, sc.T - ol); d.o.tl.in = oi; d.o.tl.out = +(oi + ol).toFixed(3); }
  }
  if (d.type === 'in') tl.in = snap(clamp(o.in + dt, 0, o.out - 1 / fps));
  if (d.type === 'out') { tl.out = snap(clamp(o.out + dt, o.in + 1 / fps, sc.T)); if (o.hatch) tl.hatch = Math.max(tl.out, o.hatch); }
  if (d.ruler) syncRange(sc, d.w);
  else d.trk.innerHTML = trackHTML(sc, d.rn);
}
document.addEventListener('pointermove', e => { if (TDRAG && e.pointerId === TDRAG.id) tlMove(e); });
function cancelTlDrag() {
  if (!TDRAG) return false; const d = TDRAG; TDRAG = null;
  if (d.type === 'ph') { setT(d.w, d.sc, d.t0); flashHint($('.fr', d.w), '已取消'); }
  else { d.n.tl = clone(d.tl0); if (d.o) d.o.tl = clone(d.o0); renderTL(d.sc, d.w); flashHint(d.ruler ? $('.rrow .fr', d.w) : $(`.tlrow[data-id="${d.rn.id}"]`, d.w), '已取消'); }
  return true;
}
const tlEnd = e => {
  if (!TDRAG || e.pointerId !== TDRAG.id) return; const d = TDRAG; TDRAG = null;
  if (d.type !== 'ph' && d.moved && !same(d.n.tl, d.tl0)) {
    const sc = d.sc, a = clone(d.tl0), b = clone(d.n.tl), oa = d.o ? clone(d.o0) : null, ob = d.o ? clone(d.o.tl) : null, main = d.w.id === 'tlw';
    const set = (v, ov) => { d.n.tl = clone(v); if (d.o) d.o.tl = clone(ov); renderTL(sc, d.w); if (main) { renderTransport(); renderStatus(); refreshStaleMarks(); } };
    const what = d.ruler || d.n !== d.rn ? '导出范围' : d.rn.type === 'emitter' ? '发射时段' : '时段';
    pushH({fn: true, desc: `${d.rn.type === 'group' ? sc.short : d.rn.name} ${what} ${a.in.toFixed(2)}–${a.out.toFixed(2)} → ${b.in.toFixed(2)}–${b.out.toFixed(2)} s`, tlNode: d.rn.id, node: d.rn.id, undo: () => set(a, oa), redo: () => set(b, ob)}, main ? sc.key : 'sheet');
    if (main) { renderStatus(); refreshStaleMarks(); }
  }
};
document.addEventListener('pointerup', tlEnd); document.addEventListener('pointercancel', tlEnd);
/* 设入点 / 出点：默认作用于当前对象（层 = 导出范围，发射器 = 发射时段）；刻度尺上的框和右键菜单作用于导出范围 */
function setIO(kind, at, node) {
  const sc = cur(), n = node || curTarget(sc); if (!n) { toast('未选中层或发射器'); return false; }
  const a = clone(n.tl), b = clone(n.tl), t = Math.round((at === undefined ? sc.t : at) * sc.fps) / sc.fps;
  if (kind === 'in') { if (t >= b.out) { toast('入点须早于出点'); return false; } b.in = t; }
  if (kind === 'out') { if (t <= b.in) { toast('出点须晚于入点'); return false; } b.out = t; }
  if (kind === 'clear') { const e = sc.saveSnap && sc.saveSnap.get(n.id); Object.assign(b, e ? e.tl : a); }
  const isOut = n.type === 'output', L = isOut ? rangeOut(sc) : null, rowId = isOut && L ? L.L.id : sc.sel;
  const nm = isOut && L ? rangeName(sc, L) : label(sc, find(sc, sc.sel).n), what = isOut ? '导出范围' : '发射时段';
  const at0 = () => isOut ? ($('#tlw .rrow .xv') || $('#tlw .rrow .fr')) : $(`#tlw .tlrow[data-id="${rowId}"]`);
  if (same(a, b)) { flashHint(at0(), '无变化'); return true; }
  const set = v => { n.tl = clone(v); syncRange(sc); renderStatus(); refreshStaleMarks(); };
  set(b); pushH({fn: true, desc: `${nm} ${what} ${a.in.toFixed(2)}–${a.out.toFixed(2)} → ${b.in.toFixed(2)}–${b.out.toFixed(2)} s`, tlNode: rowId, node: rowId, undo: () => set(a), redo: () => set(b)}, sc.key);
  flashHint(at0(), `${nm} ${what}：${kind === 'in' ? `入点设为 ${b.in.toFixed(2)} s` : kind === 'out' ? `出点设为 ${b.out.toFixed(2)} s` : '入点、出点已恢复'}`);
  return true;
}

/* 刻度尺上导出范围的右键菜单（§8）：设为入点 / 设为出点 / 恢复 */
document.addEventListener('contextmenu', e => {
  const x = e.target.closest && e.target.closest('#tlw .rrow');
  if (!x) return;
  e.preventDefault();
  const sc = cur(), r = rangeOut(sc); if (!r || !r.o) return;
  const at = Math.round(clamp((e.clientX - $('#tlw .rrow .fr').getBoundingClientRect().left) / $('#tlw .rrow .fr').getBoundingClientRect().width, 0, 1) * sc.T * sc.fps) / sc.fps;
  openMenu(e.target.closest('.xrange, .xlab, .fr') || x, [{head: `${rangeName(sc, r)} 导出范围`}, {t: '设为入点', k: '[', act: () => setIO('in', undefined, r.o)}, {t: '设为出点', k: ']', act: () => setIO('out', undefined, r.o)}, {t: '恢复', act: () => setIO('clear', undefined, r.o)}, '-', {t: `入点设在 ${at.toFixed(2)} s`, act: () => setIO('in', at, r.o)}, {t: `出点设在 ${at.toFixed(2)} s`, act: () => setIO('out', at, r.o)}]);
});

/* ---------- 时间、入点、出点读数：单击输入，回车生效，Esc 取消，越界就地报错 ---------- */
const tnTarget = el => { const sc = cur(); if (el.closest('.xio')) { const r = rangeOut(sc); return r && r.o; } return curTarget(sc); };
const rangeNode = () => { const r = rangeOut(cur()); return r && r.o; };
function tnumRange(el) {
  const sc = cur(), n = tnTarget(el), f = 1 / sc.fps;
  if (el.classList.contains('now') || !n) return [0, sc.T];
  if (el.classList.contains('in')) return [0, +(n.tl.out - f).toFixed(2)];
  return [+(n.tl.in + f).toFixed(2), sc.T];
}
function tnumVal(el) { const sc = cur(), n = tnTarget(el); return el.classList.contains('now') ? sc.t : n ? (el.classList.contains('in') ? n.tl.in : n.tl.out) : 0; }
function tnumCheck(el) {
  const v = Number(el.value), [lo, hi] = tnumRange(el), bad = el.value.trim() === '' || !Number.isFinite(v) || v < lo - 1e-9 || v > hi + 1e-9;
  el.classList.toggle('is-error', bad);
  if (bad) showTip(el, `<b>超出范围</b>有效范围 ${lo.toFixed(2)}–${hi.toFixed(2)} s`, 'err');
  else if (OV.tip && OV.tip.classList.contains('err')) hideTip();
  return bad ? null : v;
}
function tnumCommit(el) {
  const v = tnumCheck(el); if (v === null) return false;
  const sc = cur();
  if (el.classList.contains('now')) { play(false); setTime(Math.round(v * sc.fps) / sc.fps); el.value = sc.t.toFixed(2); return true; }
  if (Math.abs(v - tnumVal(el)) < 1e-9) { el.value = tnumVal(el).toFixed(2); return true; }
  const ok = setIO(el.classList.contains('in') ? 'in' : 'out', v, tnTarget(el)) !== false;
  if (ok) el.value = tnumVal(el).toFixed(2);   /* 提交后按两位小数写回（刻度尺不重建，焦点留在原处） */
  return ok;
}
function tnumCancel(el) { el.value = tnumVal(el).toFixed(2); el.classList.remove('is-error'); hideTip(); }
document.addEventListener('pointerdown', e => { const t = e.target.closest && e.target.closest('.tnum:not(.static)'); if (t && document.activeElement !== t && e.button === 0) { e.preventDefault(); hideTip(); t.focus(); t.select(); } });
document.addEventListener('input', e => { if (e.target.matches && e.target.matches('.tnum:not(.static)')) tnumCheck(e.target); });
document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('.tnum:not(.static)')) e.target.select(); });   /* Tab 进来时全选，直接输入 */
document.addEventListener('keydown', e => {
  const t = e.target; if (!t.matches || !t.matches('.tnum:not(.static)')) return;
  if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); if (tnumCommit(t)) { t.dataset.done = 1; t.blur(); } }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); t.dataset.done = 1; tnumCancel(t); t.blur(); }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const [lo, hi] = tnumRange(t); t.value = clamp((Number(t.value) || 0) + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1) / cur().fps, lo, hi).toFixed(2); tnumCheck(t); }
});
document.addEventListener('focusout', e => {
  const t = e.target; if (!t.matches || !t.matches('.tnum:not(.static)')) return;
  if (t.dataset.done) { delete t.dataset.done; return; }
  if (!t.isConnected) return;
  if (tnumCheck(t) !== null) tnumCommit(t); else tnumCancel(t);
});

/* ---------- 画面与时间轴之间的分隔条 ---------- */
function setTlRows(n) {
  const tl = $('#tlw .tl'); if (!tl) return;
  if (n === null) delete UI.tlRows[UI.size]; else UI.tlRows[UI.size] = n;
  applyTlRows();
  requestAnimationFrame(() => { placePH(cur(), $('#tlw')); tlMoreHint($('#tlw')); });
}
/* 「上面还有 N 行」「下面还有 N 行」：点一下滚到那一头（结构树跟着滚） */
function tlScrollEnd(down) {
  const tl = $('#tlw .tl'); if (!tl) return;
  tl.scrollTop = down ? tl.scrollHeight - tl.clientHeight : 0;
  requestAnimationFrame(() => { placePH(cur(), $('#tlw')); tlMoreHint($('#tlw')); });
}
(() => {
  const v = $('#vsplit'); let y0 = 0, n0 = 0, rh = 28, maxN = 8;
  const curN = () => +($('#tlw .tl').style.getPropertyValue('--tl-n')) || 3;
  const limits = () => { rh = parseFloat(getComputedStyle($('#app')).getPropertyValue('--h-row')); maxN = Math.max(1, Math.min($$('#tlw .tlrow[data-id]').length, curN() + Math.floor(($('#stage').clientHeight - 140) / rh))); };
  v.addEventListener('pointerdown', e => { if (e.button !== 0) return; e.preventDefault(); y0 = e.clientY; n0 = curN(); limits(); v.classList.add('is-active'); v.setPointerCapture(e.pointerId); });
  v.addEventListener('pointermove', e => { if (!v.classList.contains('is-active')) return; const n = clamp(Math.round(n0 + (y0 - e.clientY) / rh), 1, maxN); if (n !== curN()) setTlRows(n); });
  const end = () => v.classList.remove('is-active');
  v.addEventListener('pointerup', end); v.addEventListener('pointercancel', end);
  v.addEventListener('dblclick', () => setTlRows(null));
  v.addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); limits(); setTlRows(clamp(curN() + (e.key === 'ArrowUp' ? 1 : -1), 1, maxN)); } });
})();

/* ---------- 分隔条 ---------- */
(() => {
  const sp = $('#splitter'); let y0, h0;
  sp.addEventListener('pointerdown', e => { y0 = e.clientY; h0 = $('#treePane').offsetHeight; sp.classList.add('is-active'); sp.setPointerCapture(e.pointerId); });
  sp.addEventListener('pointermove', e => { if (!sp.classList.contains('is-active')) return; UI.treeH[UI.scene + UI.size] = h0 + (e.clientY - y0); layoutLeft(); });
  sp.addEventListener('pointerup', () => sp.classList.remove('is-active'));
  sp.addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); UI.treeH[UI.scene + UI.size] = $('#treePane').offsetHeight + (e.key === 'ArrowDown' ? 28 : -28); layoutLeft(); } });
})();

/* ---------- 点击（主屏与全表共用的参数部分 + 主屏专用） ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  /* 参数行（主屏与全表通用） */
  const prm = t.closest('.prm[data-k]');
  if (prm && !prm.classList.contains('sub')) {
    const k = prm.dataset.k, s = PS[k];
    if (t.closest('.lk')) { s.lock = !s.lock; const b = t.closest('.lk'); b.setAttribute('aria-pressed', String(s.lock)); b.dataset.tip = s.lock ? '取消锁定' : '锁定，随机与套用模板时不改'; hideTip(); return; }
    if (t.closest('.rst')) { restoreMenu(t.closest('.rst'), [k], s.lab); return; }
    if (t.closest('[data-sub]')) { s.sub = !s.sub; hideTip(); rerenderFor(k); return; }
    const sb = t.closest('.seg button');
    if (sb && prm.dataset.kind === 'seg') { change(k, 'v', sb.dataset.v); afterCommit(k); return; }
    const pl = t.closest('.pl[data-help]');
    if (pl && e.detail === 1) { clearTimeout(OV.tipT); setTimeout(() => { if (!OV.tip) showTip(pl, helpHTML(k)).classList.add('pin'); }, 220); return; }
  }
  const dep = t.closest('.mod-h [data-act="depShow"]');
  if (dep) { const dks = dep.dataset.dks.split(','), on = !dks.every(dk => MO[dk]); dks.forEach(dk => { MO[dk] = on; }); hideTip(); rerenderFor(dks[0]); return; }
  const mh = t.closest('.mod-h');
  if (mh) {
    const mod = mh.closest('.mod');
    if (t.closest('.mrst')) {
      const ks = $$('.prm[data-k]', mod).map(r => r.dataset.k).filter((k, i, a) => a.indexOf(k) === i && PS[k] && isChg(PS[k]));
      restoreMenu(t.closest('.mrst'), ks, mod.dataset.mod);
      return;
    }
    MO[mod.dataset.mk] = mod.classList.contains('is-closed'); if (UI.size === 1366) MOG[mod.dataset.mod] = MO[mod.dataset.mk];
    mod.classList.toggle('is-closed'); mh.setAttribute('aria-expanded', String(MO[mod.dataset.mk])); return;
  }
  if (t.closest('.field .clr')) { const f = t.closest('.field'), i = $('input', f); i.value = ''; i.dispatchEvent(new Event('input', {bubbles: true})); i.focus(); return; }

  /* 样板控制条 */
  if (t.closest('#kitTog')) { kitOpen(!$('#sampleBar').classList.contains('is-open')); return; }
  const kb = t.closest('.kit-bar .seg button');
  if (kb) { const g = kb.parentElement.dataset.kit; kitSet(g, kb.dataset.v); return; }

  if (!t.closest('#app')) return;
  const sc = cur();
  const sel = t.closest('[data-sel]');
  if (sel && !t.closest('[data-dchk]')) { select(sel.dataset.sel); return; }
  /* 结构树 */
  const row = t.closest('#tree .trow[data-id]');
  if (row) {
    const n = find(sc, row.dataset.id).n;
    if (t.closest('.eye')) { toggleShow(n); return; }
    if (t.closest('.solo')) { e.altKey ? soloOnly(n) : soloToggle(n); return; }   /* 单击叠加（AE 习惯）；Alt+单击只看这一项 */
    if (t.closest('.stl')) { jumpToOutput(n); return; }
    if (t.closest('.more')) { nodeMenu(t.closest('.more'), n); return; }
    if (t.closest('.chev') && n.kids.length) { toggleOpen(n); return; }
    if (t.closest('.ren')) return;
    select(n.id, true); return;
  }
  const a = t.closest('[data-act]'); const act = a && a.dataset.act;
  const lib = t.closest('.lib-item[data-lib]');
  if (lib && !a) { openLib(lib.dataset.lib); return; }
  const tab = t.closest('.tab');
  if (tab) {
    const g = tab.parentElement.id;
    if (g === 'libTabs') { UI.libTab = tab.dataset.v; UI.chip = '全部'; renderLib(); }
    if (g === 'libSub') { UI.libSub = tab.dataset.v; renderLib(); }
    return;
  }
  const modeB = t.closest('#modeTabs button');
  if (modeB) { setMode(modeB.dataset.v); return; }
  const chip = t.closest('#libChips button');
  if (chip) { UI.chip = chip.dataset.v; renderLib(); return; }
  const segb = t.closest('.seg[data-ui] button');
  if (segb) { UI[segb.parentElement.dataset.ui] = segb.dataset.v; if (segb.parentElement.dataset.ui === 'view3') { renderViewbar(); renderStage(); } else { renderViewbar(); renderDeliv(); } return; }
  if (t.closest('.tpl')) { toast('样板中不新建效果', {near: $('#left')}); return; }
  if (t.closest('#libToggle')) { UI.libClosed = !UI.libClosed; layoutLeft(); return; }
  if (!act) return;
  const A = {
    undo: () => undo(), redo: () => redo(), revert: doRevert, save: doSave, changes: () => changesMenu(a),
    saveAs: () => { if (typeof window.openSaveDialog === 'function') { window.openSaveDialog(); return; } toast(`已另存为「${sc.short} 副本」`); },
    versions: () => openMenu(a, [{head: '版本记录'}, {t: `今天 ${sc.savedAt}`, k: '保存　当前'}, {t: '今天 19:46', k: '导出'}, {t: '今天 18:23', k: '保存'}, '-', {t: '全部版本', act: () => toast('样板中不打开版本列表')}], {align: 'right'}),
    export: () => doExport('stale'), exportMenu: () => exportMenu(a), exportChecked: () => doExport('checked'),
    expStMenu: () => { const b = $('#expBtn .btn + .btn'); if (b && !b.disabled) exportMenu(b); },
    play: () => play(), restart: () => { setTime(0); play(true); }, loop: () => { UI.loop = !UI.loop; renderTransport(); },
    timeTools: () => openMenu(a, [{t: '上一帧', k: '←', act: () => stepTick(-1)}, {t: '下一帧', k: '→', act: () => stepTick(1)}, '-', ...sc.marks.map(([nm, v]) => ({t: `跳到${nm}`, k: v.toFixed(2) + ' s', act: () => setTime(v)}))]),
    tlOpts: () => openMenu(a, [
      {head: '导出范围'},
      {t: '设为入点', k: '[', act: () => setIO('in', undefined, rangeNode())}, {t: '设为出点', k: ']', act: () => setIO('out', undefined, rangeNode())}, {t: '恢复', act: () => setIO('clear', undefined, rangeNode())}, '-',
      ...(tgtWhat(sc) === '发射时段' ? [{head: '发射时段'}, {t: '设为入点', act: () => setIO('in')}, {t: '设为出点', act: () => setIO('out')}, {t: '恢复', act: () => setIO('clear')}, '-'] : []),
      {t: '一并移动', sub: '拖层入点时发射器同移', chk: UI.optFollow, keep: true, act: b => { UI.optFollow = !UI.optFollow; b.setAttribute('aria-checked', UI.optFollow); $('.ck', b).innerHTML = UI.optFollow ? ico('check') : ''; }},
      {t: '同刻联动', sub: '同一时刻的关键点同移', chk: UI.optSync, keep: true, act: b => { UI.optSync = !UI.optSync; b.setAttribute('aria-checked', UI.optSync); $('.ck', b).innerHTML = UI.optSync ? ico('check') : ''; }}], {checks: true}),
    thumb: () => { a.classList.add('is-loading'); a.innerHTML = '<span class="spin"></span><span class="thumb-t">生成中</span>'; setTimeout(() => { renderTransport(); toast(`缩略图已更新，取 ${sc.t.toFixed(2)} s`); }, 900); },
    setIn: () => setIO('in', undefined, rangeNode()), setOut: () => setIO('out', undefined, rangeNode()), clearIO: () => setIO('clear', undefined, rangeNode()),
    grid: () => { UI.grid = !UI.grid; renderViewbar(); renderStage(); },
    atlasGrid: () => { UI.atlasGrid = !UI.atlasGrid; renderViewbar(); renderDeliv(); }, note: () => toast(`已写进意见，${sc.t.toFixed(2)} s`),
    compact: () => { UI.compact = !UI.compact; renderAll(); }, toggleL: () => { UI.left = !UI.left; UI.compact = false; renderAll(); }, toggleR: () => { UI.right = !UI.right; UI.compact = false; renderAll(); },
    keys: () => openKeys(), changelog: () => openMenu(a, [{head: 'v4.9.129 新内容 2 条'}, {t: '效果库改为标签式', sub: '同编排工作台'}, {t: '结构树移到左栏', sub: '层多不占时间轴'}], {align: 'right'}),
    deliverAll: () => setMode('贴图与交付'),
    /* 预览设置：背景、安全框（距离、预览曝光常驻画面右下） */
    preview: () => openMenu(a, [{head: '背景'}, {t: '夜空', chk: true, keep: true}, {t: '纯黑', chk: false, keep: true}, '-', {t: '安全框', chk: false, keep: true, act: b => { const on = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', on); $('.ck', b).innerHTML = on ? ico('check') : ''; }}],
      {align: 'right', checks: true}),
    viewOpt: () => openMenu(a, [{t: '仅已改', sub: '非默认或本次改过', chk: UI.onlyChg, act: () => { UI.onlyChg = !UI.onlyChg; applyFilter(); }}, '-', {t: '全部展开', act: () => foldAll(true)}, {t: '全部折叠', act: () => foldAll(false)}, '-',
      {html0: `<div class="mlegend" role="note"><span><i class="bar"></i>本次改过</span><span><i class="rs">${ico('reset')}</i>非默认</span></div>`}], {align: 'right', checks: true}),
    foldAll: () => foldAll(!$$('#pbody .mod:not(.mod-one)').some(m => !m.hidden && !m.classList.contains('is-closed'))),
    clearPq: () => { UI.pq = ''; $('#pq input').value = ''; $('#pq').classList.remove('has-val'); applyFilter(); },
    showAll: () => { UI.onlyChg = false; applyFilter(); },
    pathMore: () => openMenu(a, $('#path').dataset.hidden.split(',').map(id => ({t: label(sc, find(sc, id).n), act: () => select(id)}))),
    suggestExp: () => suggestExp(),
    addLayer: () => openMenu(a, [{t: '空白层', act: () => addLayer('blank')}, {t: '从模板…', act: () => addLayer('tpl')}, {t: '复制本层', dis: find(sc, sc.sel).n.type !== 'layer', act: () => dupNode(find(sc, sc.sel).n)}]),
    addEmit: () => addEmitter(), libNew: () => toast(UI.libTab === '效果' ? '样板中不新建效果' : '样板中不新建模板', {near: $('#left')}),
    copyNotes: () => toast('已复制意见', {near: $('#left')}), saveTpl: () => toast('已存为我的模板', {near: $('#left')}),
    clearLibQ: () => { UI.q = ''; $('#libQ input').value = ''; renderLib(); }, chipAll: () => { UI.chip = '全部'; renderLib(); },
    openFolder: () => toast('已打开导出文件夹'), pg: () => { if (UI.dview === '逐帧') UI.frameNo = (UI.frameNo || 1) + +a.dataset.d; else UI.sheetPage += +a.dataset.d; renderDeliv(); },
    unhide: () => { const f = find(sc, a.dataset.id); if (f) toggleShow(f.n); },
    soloExit: () => soloClear(),
    tlUp: () => tlScrollEnd(false), tlDn: () => tlScrollEnd(true)
  };
  if (A[act]) A[act]();
});
function suggestExp() { const k = `${INSP.P.prefix}|颜色|曝光`; change(k, 'v', .85); afterCommit(k); flashHint($(`#pbody .prm[data-k="${CSS.escape(k)}"]`), '曝光 1.00 → 0.85'); }
function foldAll(open) { if (!INSP) return; INSP.mods.forEach(m => { MO[INSP.P.prefix + '|' + m.t] = open; }); renderInsp(); }
function rerenderFor(k) { if (k.startsWith('sheet|')) rerenderSheetParams(k); else renderInsp(); }
function openLib(id) {
  const it = LIB.find(x => x.id === id);
  if (id === 'kiku' || id === 'spk') {
    if (id === UI.scene) return;
    const sc = cur(), to = SC[id], n = changesOf(sc).length;
    if (!n) { kitSet('scene', id); return; }
    /* 有未保存时切换效果：先问 */
    openDialog({title: `「${sc.short}」有 ${n} 项未保存`, body: `切换到「${esc(to.short)}」前，保存或放弃这些改动。`,
      buttons: [{t: '保存', r: 'save', cls: 'btn-1'}, {t: '不保存', r: 'drop', cls: 'btn-2'}, {t: '取消', r: '0', cls: 'btn-2'}], focus: 'save',
      on: r => {
        if (r === 'save') { doSave(); kitSet('scene', id); toast(`已保存「${sc.short}」`, {near: $('#left')}); }
        if (r === 'drop') { dropChanges(sc); kitSet('scene', id); toast(`已放弃 ${n} 项改动`, {near: $('#left')}); }
      }});
    return;
  }
  toast('样板中只能打开两个效果', {near: $('#left')});
}
function setMode(m) { UI.mode = m; $$('#modeTabs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === m))); renderViewbar(); renderStage(); }

/* 输入：搜索、筛选、开关、下拉、勾选 */
document.addEventListener('input', e => {
  const t = e.target;
  if (t.closest('#libQ')) { UI.q = t.value; renderLib(); return; }
  if (t.closest('#pq')) { UI.pq = t.value; $('#pq').classList.toggle('has-val', !!t.value); applyFilter(); return; }
  if (t.closest('#treeQ')) { UI.treeQ = t.value; $('#treeQ').classList.toggle('has-val', !!t.value); renderTree(); renderTL(); ensureVisible(); return; }
  const f = t.closest('.field'); if (f && t.matches('input[type=search],input[type=text]:not(.num)')) f.classList.toggle('has-val', !!t.value);
});
document.addEventListener('change', e => {
  const t = e.target, prm = t.closest('.prm[data-k]');
  if (prm) {
    const k = prm.dataset.k, kind = prm.dataset.kind;
    if (kind === 'sw') { change(k, 'v', t.checked); afterCommit(k); }
    if (kind === 'sel') { change(k, 'v', t.value); afterCommit(k); }
    if (kind === 'chk') { const a = clone(PS[k].v); a[+t.dataset.i] = t.checked; change(k, 'v', a); afterCommit(k); }
    return;
  }
  if (t.dataset.dchk && t.closest('#app')) { const c = checkedOf(cur()); t.checked ? c.add(t.dataset.dchk) : c.delete(t.dataset.dchk); renderDeliv(); return; }
  if (t.id === 'speed') { UI.speed = +t.value; return; }
});

/* ---------- 键盘 ---------- */
document.addEventListener('keydown', e => {
  const t = e.target;
  if (e.key === 'Escape') {
    if (OV.keys) { closeKeys(); return; }
    if (OV.menu) { closeMenu(true); return; }
    if (OV.tip && (OV.tip.classList.contains('pin') || OV.tip.classList.contains('err'))) { hideTip(); return; }
    hideTip();   /* 悬停提示不吞掉 Esc：继续退出只看 */
    if (t.closest && t.closest('#treeQ') && UI.treeQ) { t.value = ''; t.dispatchEvent(new Event('input', {bubbles: true})); return; }
    if (UI.view === 'main' && soloClear()) { flashHint($('#stage'), '已退出只看'); return; }
    return;
  }
  if (OV.dlg) return;
  const typing = t.matches && t.matches('textarea, input:not([type=checkbox]):not([type=radio]):not([type=range]), select, .ren');
  const textField = t.matches && t.matches('textarea, input[type=search], .ren, .field input');
  if ((e.ctrlKey || e.metaKey) && !textField) {
    const kk = e.key.toLowerCase();
    if (kk === 'z' && !e.shiftKey) { e.preventDefault(); if (t.classList && t.classList.contains('num')) t.blur(); undo(); return; }
    if (kk === 'y' || (kk === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
    if (kk === 's' && UI.view === 'main') { e.preventDefault(); if (t.classList && t.classList.contains('num')) t.blur(); doSave(); return; }
  }
  if (UI.view !== 'main') return;
  /* 结构树：方向键、展开折叠、F2、Delete */
  if (t.classList && t.classList.contains('trow') && t.closest('#tree')) {
    const rows = $$('#tree .trow[data-id]'), i = rows.indexOf(t), sc = cur(), f = find(sc, t.dataset.id), n = f.n;
    const go = r => { if (r) { e.preventDefault(); select(r.dataset.id, true); } };
    if (e.key === 'ArrowDown') return go(rows[i + 1]);
    if (e.key === 'ArrowUp') return go(rows[i - 1]);
    if (e.key === 'Home') return go(rows[0]);
    if (e.key === 'End') return go(rows[rows.length - 1]);
    if (e.key === 'ArrowRight') { e.preventDefault(); if (n.kids.length && !n.open) toggleOpen(n, true); else if (n.open && n.kids.length) select(n.kids[0].id, true); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); if (n.open && n.kids.length) toggleOpen(n, false); else if (f.parent) select(f.parent.id, true); return; }
    if (e.key === 'Enter' && n.kids.length) { e.preventDefault(); toggleOpen(n); return; }
    if (e.key === 'F2') { e.preventDefault(); rename(n); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); doDelete(n); return; }
  }
  if (t.classList && t.classList.contains('tab') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    const ts = $$('.tab:not(:disabled)', t.parentElement), j = ts.indexOf(t), nx = ts[(j + (e.key === 'ArrowRight' ? 1 : ts.length - 1)) % ts.length];
    e.preventDefault(); nx.click(); nx.focus(); return;
  }
  if (t.closest && t.closest('#libList') && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    const its = $$('#libList .lib-item, #libList .tpl'), j = its.indexOf(t.closest('.lib-item, .tpl'));
    const nx = its[clamp(j + (e.key === 'ArrowDown' ? 1 : -1), 0, its.length - 1)]; if (nx) { e.preventDefault(); nx.focus(); } return;
  }
  if (t.closest && t.closest('.lib-item') && e.key === 'Enter') { openLib(t.closest('.lib-item').dataset.lib); return; }
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key, sc = cur(), selN = find(sc, sc.sel) && find(sc, sc.sel).n;
  if (k === ' ') { e.preventDefault(); play(); return; }
  if (k === 'r' || k === 'R') { setTime(0); play(true); return; }
  if ((k === 'ArrowLeft' || k === 'ArrowRight') && !(t.closest && t.closest('.seg, .menu, .sl, .tabs'))) { e.preventDefault(); play(false); stepTick((k === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 10 : 1)); return; }
  /* 逐帧：, . 不管焦点在哪（输入框除外）都走帧 */
  if (k === ',' || k === '.' || k === '<' || k === '>') { e.preventDefault(); play(false); stepTick((k === '.' || k === '>' ? 1 : -1) * (e.shiftKey ? 10 : 1)); return; }
  /* 快捷键作用于「选中」的对象：时间轴、画面里选中后按 Delete / F2 与结构树里一样 */
  if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); doDelete(selN); return; }
  if (k === 'F2') { e.preventDefault(); if (selN && selN.type !== 'group' && selN.type !== 'output') rename(selN); return; }
  if (k === '[' || k === ']') { e.preventDefault(); setIO(k === '[' ? 'in' : 'out', undefined, rangeNode()); return; }
  if (k === 's' || k === 'S') { soloToggle(selN); return; }
  if (k === 'h' || k === 'H') { toggleShow(selN); return; }
  if (k === 'f' || k === 'F') { UI.compact = !UI.compact; renderAll(); return; }
  if (k === 'l' || k === 'L') { UI.left = !UI.left; UI.compact = false; renderAll(); return; }
  if (k === 'p' || k === 'P') { UI.right = !UI.right; UI.compact = false; renderAll(); return; }
  if (k === '?') { openKeys(); return; }
});

/* ---------- 样板控制条 ---------- */
function kitOpen(on) {
  const b = $('#sampleBar'), tg = $('#kitTog'); b.classList.toggle('is-open', on); tg.setAttribute('aria-expanded', String(on));
  tg.firstChild.textContent = on ? '收起' : '样板控制';
  try { localStorage.setItem('fwl.e21.kitOpen', on ? '1' : '0'); } catch (_) { /* 无痕窗口等：不记 */ }
}
(() => { let on = false; try { on = localStorage.getItem('fwl.e21.kitOpen') === '1'; } catch (_) { on = false; } kitOpen(on); })();
function kitSet(g, v) {
  closeMenu(); hideTip(); closeDialog(); closeToast(); closeKeys();
  if (g === 'view') UI.view = v;
  if (g === 'scene') { UI.scene = v; UI.pq = ''; UI.treeQ = ''; $('#pq input').value = ''; $('#pq').classList.remove('has-val'); UI.onlyChg = false; play(false); }
  if (g === 'size') { if (UI.size !== +v) Object.keys(MO).forEach(k => { if (!k.includes('|dep|')) delete MO[k]; }); UI.size = +v; }   /* 换屏幕尺寸：模块展开状态按这个尺寸的默认重来 */
  $$('.kit-bar .seg').forEach(s => $$('button', s).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String({view: UI.view, scene: UI.scene, size: UI.size}[s.dataset.kit])))));
  $('#kitMain').hidden = UI.view !== 'main'; $('#kitSheet').hidden = UI.view !== 'sheet';
  if (UI.view === 'sheet') { if (!$('#sheetBody').children.length) buildSheet(); }
  else renderAll(g === 'scene' || g === 'size' || g === 'view');
}
window.addEventListener('resize', () => { if (UI.view === 'main') placePH(cur(), $('#tlw')); });
/* 画面变小时（窄屏、时间轴拉高），左下读数和右下读数一左一右放不下，就上下错开一行，不叠在一起 */
const fitCI = () => {
  const c = $('#cell'), bl = c && $('.c-bl', c), br = c && $('.c-br', c); if (!bl || !br) return;
  c.classList.toggle('ci-stack', bl.offsetWidth + br.offsetWidth + 60 > c.clientWidth);
};
if (window.ResizeObserver) { const ro = new ResizeObserver(fitCI); ['#cell', '#cell .c-bl', '#cell .c-br'].forEach(s => $(s) && ro.observe($(s))); }

/* 截图与走查脚本用的入口 */
window.KIT = {
  set: kitSet, select: name => { const sc = cur(), [p, c] = name.split('/'), L = c && sc.root.kids.find(x => x.name === p); const r = L ? {n: L.kids.find(x => x.name === c)} : rowsOf(sc).find(x => label(sc, x.n) === name || x.n.name === name); if (r && r.n) select(r.n.id); },   /* 「金锦层/星」指定哪一层下的发射器 */
  selectOutputOf: name => { const sc = cur(); const l = sc.root.kids.find(x => x.name === name); if (l) jumpToOutput(l); },
  mode: setMode, openExport: () => $('#expBtn .btn + .btn').click(),
  tip: lab => { const pl = $$('#pbody .pl[data-help]').find(p => PS[p.dataset.help].lab === lab); if (pl) showTip(pl, helpHTML(pl.dataset.help)).classList.add('pin'); },
  del: name => { const sc = cur(); const r = rowsOf(sc).find(x => x.n.name === name); if (r) doDelete(r.n); },
  askDeleteEffect: () => askDeleteEffect(), confirm: () => $('.ovl .dialog [data-r="1"]').click(), tree: () => rowsOf(cur()).length, t: () => cur().t,
  changes: () => changesOf(cur()).length, stale: () => [...staleLayers(cur())].map(id => find(cur(), id).n.name), sel: () => label(cur(), find(cur(), cur().sel).n),
  solo: () => soloList(cur()).map(n => n.name), undoN: () => cur().H.u.length, val: k => PS[k] && PS[k].v,
  /* 文案自查用：参数说明、快捷键表、专有名词（效果名、层名、发射器名、模板名、花型库名） */
  strings: () => ({help: HELP, keys: KEYS, view: VIEW_TIP,
    names: [...new Set([...Object.values(SC).flatMap(sc => [sc.name, sc.short, ...rowsOf(sc).map(r => r.n.name)]), ...LIB.map(x => x.name), ...TPL_NAMES])].filter(Boolean)})
};

/* =====================================================================
   组件全表：每格都是真组件（同一份样式）；状态用强制类名画出，最后一列可操作
   ===================================================================== */
const NA = '<span class="na">—</span>';
const tbl = (cols, rows, widths) => `<table class="ks-t">${widths ? `<colgroup><col style="width:150px">${widths.map(w => `<col${w ? ` style="width:${w}"` : ''}>`).join('')}</colgroup>` : ''}<thead><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(([lab, cells]) => `<tr><th scope="row">${lab}</th>${cells.map((c, i) => `<td${i === cells.length - 1 ? ' class="live"' : ''}>${c == null ? NA : c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const btn = (cls, txt, st = '', attr = '') => `<button class="btn ${cls}${st ? ' ' + st : ''}"${st.includes('is-disabled') ? ' disabled' : ''} ${attr}>${txt}</button>`;
const DEMO = {};
function demoModel(inp) {
  const w = inp.closest('[data-numdemo]'), id = w.dataset.numdemo;
  if (!DEMO[id]) DEMO[id] = {v: +w.dataset.v, min: +w.dataset.min, max: +w.dataset.max, step: +w.dataset.step};
  const d = DEMO[id];
  return {min: d.min, max: d.max, step: d.step, get: () => d.v, set: v => { d.v = roundV(d, v); $$(`[data-numdemo="${id}"] .num`).forEach(n => { if (document.activeElement !== n) n.value = fmt(d.v, d.step); }); }, show: v => fmt(v, d.step)};
}
const numDemo = (id, v, unit, st = '', attr = '') => `<span data-numdemo="${id}" data-v="${v}" data-min="0.1" data-max="3" data-step="0.01" style="display:inline-flex;align-items:center;gap:4px;width:96px"><input class="num ${st}" value="${st.includes('is-error') ? '9.80' : fmt(v, .01)}" aria-label="缩放" ${attr}>${unit ? `<span class="u">${unit}</span>` : ''}</span>`;
const slDemo = (st = '', style = '--v:40%', extra = '') => `<div class="sl ${st}" style="width:150px;${style}" role="slider" tabindex="-1" aria-label="示例">${extra}<i class="sl-f"></i><i class="sl-k"></i></div>`;
const fieldT = (st = '', val = '', ph = '', attr = '') => `<label class="field ${st}${val ? ' has-val' : ''}" style="width:170px"><input type="text" value="${val}" placeholder="${ph}" aria-label="文本" ${st.includes('is-disabled') ? 'disabled' : ''} ${st.includes('is-readonly') ? 'readonly' : ''} ${attr}></label>`;
const fieldS = (st = '', val = '') => `<label class="field search ${st}${val ? ' has-val' : ''}" style="width:170px">${ico('search')}<input type="search" value="${val}" placeholder="参数名" aria-label="搜索" ${st.includes('is-disabled') ? 'disabled' : ''} ${st.includes('is-readonly') ? 'readonly' : ''}><button class="clr" type="button" aria-label="清除">${ico('x')}</button></label>`;
const fieldA = (st = '', val = '') => `<label class="field area ${st}" style="width:170px"><textarea rows="2" placeholder="写意见" aria-label="多行" ${st.includes('is-disabled') ? 'disabled' : ''} ${st.includes('is-readonly') ? 'readonly' : ''}>${val}</textarea></label>`;
const fieldF = (st = '', fn = '') => `<div class="field file ${st}" style="width:170px"><button class="btn btn-2 sm" ${st.includes('is-disabled') || st.includes('is-readonly') ? 'disabled' : ''}>选择文件</button><span class="fn${fn ? '' : ' none'}">${fn || '未选择'}</span></div>`;
const err = m => `<div class="f-msg">${m}</div>`;
const menuStatic = (items, w = 180) => `<div class="menu static" style="min-width:${w}px">${items.map(it => it === '-' ? '<hr>' : it.head ? `<div class="mh">${it.head}</div>` : `<div class="mi${it.h ? ' is-hover' : ''}"${it.dis ? ' style="color:var(--tDis)"' : ''}>${it.ck !== undefined ? `<span class="ck">${it.ck ? ico('check') : ''}</span>` : ''}<span>${it.t}</span>${it.k ? `<span class="k">${it.k}</span>` : ''}</div>`).join('')}</div>`;
const segH = (opts, on, st = {}, cls = 'sm') => `<div class="seg ${cls}" data-free role="group">${opts.map((o, i) => `<button aria-pressed="${i === on}" data-v="${o}" class="${st[i] || ''}" ${(st[i] || '').includes('dis') ? 'disabled' : ''}>${o}</button>`).join('')}</div>`;
const modeH = (opts, on, st = {}) => segH(opts, on, st).replace('class="seg ', 'class="modeseg ');
const tabsH = (opts, on, st = {}, cls = '', w = '') => `<div class="tabs ${cls}" data-free role="tablist" ${w ? `style="width:${w}"` : ''}>${opts.map((o, i) => `<button class="tab ${st[i] || ''}" role="tab" data-t="${o}" aria-selected="${i === on}" ${(st[i] || '').includes('dis') ? 'disabled' : ''}>${o}</button>`).join('')}</div>`;

function contrast(a, b) {
  const L = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const x = L(a), y = L(b); return ((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toFixed(1);
}
function sheetTokens() {
  const css = getComputedStyle(document.documentElement), v = n => css.getPropertyValue(n).trim();
  const sw = (names, roles) => `<div class="ks-sw">${names.map((n, i) => `<div><i style="background:var(${n})"></i><b>${n.slice(2)} ${v(n)}</b>${roles[i] || ''}</div>`).join('')}</div>`;
  return `<h2>基础 token</h2><p class="lead">规范 v3 第 1–3、5 节。颜色、字号、间距从第一个 &lt;style&gt; 的 :root 取；1366 × 768 用 .s1366 改写字号与栏宽。</p>
  <h3>中性色 10 档<span>面四级：画面 g0 ＜ 面板 g1 ＜ 栏头 g2 ＜ 浮层 g4；线只有一种 g5；选中 / 开着填 g5</span></h3>${sw(['--g0', '--g1', '--g2', '--g3', '--g4', '--g5', '--g6', '--g7', '--g8', '--g9'], ['画面', '面板', '栏头（外壳顶栏、工具行）', '行悬停', '浮层、命令悬停', '线、选中 / 开着', '开关细框', '弱文字', '次文字', '主文字'])}
  <h3>主色<span>薄荷只用在五处：导出按钮、播放头、结构树当前行细框、当前页标签下划线、UE 已连接的圆点</span></h3>${sw(['--p1', '--p3', '--p4', '--p5', '--pInk'], ['主操作文字', '主操作按下', '主色', '主操作悬停', ''])}
  <h3>琥珀 / 红<span>琥珀只给「需重新导出」和挡住操作的设置；红色只用在错误</span></h3>${sw(['--w2', '--w3', '--e1', '--e3'], ['', '需重新导出', '错误底', '错误'])}
  <h3>对比度<span>正文 ≥ 4.5 : 1；停用 ≥ 3 : 1；线和面板 ≥ 1.3 : 1</span></h3><div class="ks-row">${[['--g9', '--g1', '主文字'], ['--g8', '--g1', '次文字'], ['--g7', '--g1', '弱文字'], ['--g7', '--g2', '弱文字在栏头上'], ['--p1', '--p4', '主操作'], ['--g5', '--g1', '线和面板'], ['--g5', '--g2', '线和栏头']].map(([a, b2, t]) => `<div style="display:flex;flex-direction:column;gap:4px;width:120px"><div style="height:40px;display:grid;place-items:center;background:var(${b2});color:var(${a});box-shadow:0 0 0 1px var(--g5)">${contrast(v(a), v(b2))} : 1</div><span class="ks-cap" style="margin:0">${t}</span></div>`).join('')}
    <div style="display:flex;flex-direction:column;gap:4px;width:120px"><div style="height:40px;display:grid;place-items:center;background:var(--g1);color:var(--tDis);box-shadow:0 0 0 1px var(--g5)">3.4 : 1</div><span class="ks-cap" style="margin:0">停用（次文字 50 %）</span></div></div>
  <div class="ks-cols" style="--c:2;margin-top:8px"><div class="ks-blk"><h3>字号与字重<span>三级：小 12 / 正文 13 / 大 15（1366：11 / 12 / 14）；字重只有 400 和 600；数值一律等宽数字</span></h3><div class="ks-type">
    <span>15 / 600</span><span style="font-size:15px;font-weight:600;color:var(--t1)">金锦层　当前位置（面包屑末项）</span>
    <span>15 / 400</span><span style="font-size:15px;color:var(--t1)">2.00 <span style="color:var(--t3)">/ 5.24</span> <span class="u">s</span>　当前时间码</span>
    <span>15 / 400</span><span style="font-size:15px;color:var(--t1)">效果　模板　效果库大号标签（当前项只靠下划线）</span>
    <span>13 / 600</span><span style="font-size:13px;font-weight:600;color:var(--t1)">时间与缩放　模块标题</span>
    <span>13 / 400</span><span style="font-size:13px;color:var(--t2)">开始时间　保存　设为入点　<span style="color:var(--t1)">1.10　0.05–0.65</span></span>
    <span>12 / 400</span><span style="font-size:12px;color:var(--t3)">倍　m/s　KYB　3 层　6 个　已保存 20:31</span></div>
    <p class="ks-cap" style="margin-top:8px">600 只用在：面包屑末项、结构树当前行、检查器模块标题、产品名。选中的分段、标签不加粗，只靠底色或下划线。</p></div>
    <div class="ks-blk"><h3>网格与间距<span>基本单位 4；行高 28；控件高 24；可点区域 ≥ 28；面板内边距 12；组内 8，组间 20；圆角 0–2 px</span></h3><div class="ks-sp">${[4, 8, 12, 16, 20, 24, 28].map(x => `<div><i style="width:${x}px;height:${x}px"></i>${x}</div>`).join('')}
    <span class="gap"></span>${[0, 1, 2].map(r => `<div><i style="width:40px;height:28px;border-radius:${r}px;background:var(--g4)"></i>${r} px</div>`).join('')}</div>
    <p class="ks-cap" style="margin-top:8px">栏宽：1920 下左栏 300、右栏 460；1366 下 260、380。检查器五列：参数名 112 ｜ 控件 ｜ 数值 72 ｜ 单位 28 ｜ 操作 24（1366 下参数名 96）。</p></div></div>`;
}
/* 图标总表（§6）：16 px 画布，1.5 px 线宽，方头，只画线框；一种形状只有一个意思 */
const ICONS = [['layer', '层'], ['star', '星'], ['spark', '火花'], ['ember', '余烬'], ['tail', '尾'], ['trail', '拖尾'], ['sub', '子发射器'], ['frag', '碎片'],
  ['group', '效果'], ['out', '输出'], ['eye', '显示'], ['eyeoff', '已隐藏'], ['solo', '只看'], ['soloon', '只看（开）'], ['more', '更多'], ['lock', '锁定'],
  ['undo', '撤销'], ['redo', '重做'], ['history', '版本记录'], ['reset', '恢复默认'], ['stale', '需重新导出'], ['check', '已完成'], ['alert', '警告'], ['info', '说明'],
  ['play', '播放'], ['pause', '暂停'], ['restart', '回到开头'], ['loop', '循环'], ['camera', '缩略图'], ['timer', '时间工具'], ['grid', '网格叠加'], ['note', '批注'],
  ['compact', '精简布局'], ['pl', '左栏'], ['pr', '右栏'], ['folder', '文件夹'], ['settings', '设置'], ['search', '搜索'], ['filter', '筛选'], ['auto', '自动曝光'],
  ['cd', '展开'], ['cu', '收起'], ['cr', '向右'], ['cl', '向左'], ['back', '返回'], ['in', '设为入点'], ['outp', '设为出点'], ['plus', '新建'], ['x', '关闭'], ['keys', '快捷键'], ['file', '文件']];
function sheetIcons() {
  return `<h2>图标</h2><p class="lead">规范 v3 第 6 节。专门画的一套，symbol 定义在 body_main.html 开头（外壳共用）。圆箭头只表示「恢复默认」；「循环」是首尾相接的矩形环；「版本记录」是叠在一起的三张纸；「需重新导出」是琥珀色三角加感叹号。</p>
    <div class="ks-icons">${ICONS.map(([id, t]) => `<div><svg class="i${id === 'stale' ? ' amber' : ''}" aria-hidden="true"><use href="#i-${id}"/></svg><span>${t}<code>i-${id}</code></span></div>`).join('')}</div>`;
}

function sheetBasic() {
  const S = ['默认', '悬停', '焦点', '按下', '选中 / 开启', '停用', '加载中', '错误 / 失败', '可操作'];
  const b1 = st => btn('btn-1', '导出', st), bt = st => btn('tbtn', '另存', st), bs = st => btn('tbtn', '保存<span class="dot" aria-hidden="true"></span>', st);
  const bi = (st, id = 'undo', p = '') => `<button class="btn btn-icon ${st}" ${p} ${st.includes('is-disabled') ? 'disabled' : ''} aria-label="撤销">${ico(id)}</button>`;
  const sp = (st1, st2 = '', c = 'btn-1') => `<div class="split"><button class="btn ${c} ${st1}">导出</button><button class="btn ${c} ${st2}" aria-label="导出选项">${ico('cd')}</button></div>`;
  const as = st => `<button class="btn btn-text ${st}">${ico('camera')}缩略图</button>`;
  const buttons = tbl(S, [
    ['主按钮：实心，一屏一个', [b1(''), b1('is-hover'), b1('is-focus'), b1('is-active'), null, b1('is-disabled'), `<button class="btn btn-1 is-loading"><span class="spin"></span>导出中</button>`, null, btn('btn-1', '导出', '', 'data-demo="toast" data-msg="已导出"')]],
    ['命令：静止无底', [bt(''), bt('is-hover'), bt('is-focus'), bt('is-active'), null, bt('is-disabled'), null, null, btn('tbtn', '另存', '', 'data-demo="toast" data-msg="已另存"')]],
    ['命令：有没保存的改动', [bs(''), bs('is-hover'), bs('is-focus'), bs('is-active'), null, null, null, null, btn('tbtn', '保存<span class="dot" aria-hidden="true"></span>', '', 'data-demo="toast" data-msg="已保存"')]],
    ['图标命令 / 图标开关', [bi(''), bi('is-hover'), bi('is-focus'), bi('is-active'), bi('', 'loop', 'aria-pressed="true"'), bi('is-disabled'), null, null, `<button class="btn btn-icon" data-tip="撤销" data-key="Ctrl+Z" aria-label="撤销">${ico('undo')}</button><button class="btn btn-icon" data-demo="press" aria-pressed="false" data-tip="循环" aria-label="循环">${ico('loop')}</button>`]],
    ['分裂按钮：导出 ▾', [sp(''), sp('', 'is-hover'), sp('', 'is-focus'), sp('is-active'), sp('', 'is-open'), `<div class="split"><button class="btn btn-1" disabled>导出</button><button class="btn btn-1" disabled>${ico('cd')}</button></div>`, null, null, `<div class="split"><button class="btn btn-1" data-demo="toast" data-msg="已导出">导出</button><button class="btn btn-1" data-demo="expMenu" aria-haspopup="menu" aria-label="导出选项">${ico('cd')}</button></div>`]],
    ['异步按钮', [as(''), as('is-hover'), as('is-focus'), as('is-active'), null, as('is-disabled'), `<button class="btn btn-text is-loading"><span class="spin"></span>生成中</button>`, `<button class="btn btn-text is-failed" data-tip="生成失败">${ico('alert')}重试</button>`, `<button class="btn btn-text" data-demo="async">${ico('camera')}缩略图</button>`]]
  ]);
  const IS = ['空', '有内容', '悬停', '焦点', '停用', '错误', '只读', '可操作'];
  const inputs = tbl(IS, [
    ['文本', [fieldT('', '', '层名称'), fieldT('', '金锦层'), fieldT('is-hover', '金锦层'), fieldT('is-focus', '金锦层'), fieldT('is-disabled', '金锦层'), fieldT('is-error', '') + err('名称不能为空'), fieldT('is-readonly', 'FW-20261104'), `<div data-demo="nameField">${fieldT('', '金锦层', '层名称', 'data-validate')}</div>`]],
    ['搜索：含清除', [fieldS(''), fieldS('', '寿命'), fieldS('is-hover', '寿命'), fieldS('is-focus', '寿命'), fieldS('is-disabled'), fieldS('is-error', '寿命'), fieldS('is-readonly', '寿命'), fieldS('')]],
    ['多行', [fieldA(''), fieldA('', '火花尾巴偏短'), fieldA('is-hover', '火花尾巴偏短'), fieldA('is-focus', '火花尾巴偏短'), fieldA('is-disabled', '火花尾巴偏短'), fieldA('is-error', '') + err('意见为空'), fieldA('is-readonly', '火花尾巴偏短'), fieldA('')]],
    ['文件选择', [fieldF(''), fieldF('', 'sparkler_graph.json'), fieldF('is-hover', 'sparkler_graph.json'), fieldF('is-focus', 'sparkler_graph.json'), fieldF('is-disabled'), fieldF('is-error', 'notes.txt') + err('只能导入 .json'), fieldF('is-readonly', 'sparkler_graph.json'), `<div class="field file" style="width:170px"><button class="btn btn-2 sm" data-demo="file">选择文件</button><span class="fn none">未选择</span><input type="file" accept=".json" hidden aria-label="选择文件"></div>`]]
  ], [null, null, null, null, null, null, null, '200px']);
  const NS = ['默认', '悬停', '拖动中', '输入中', '越界', '停用', '只读结果', '可操作'];
  const nums = tbl(NS, [
    ['数值：拖动改值', [numDemo('a1', 1.1, ''), numDemo('a2', 1.1, '', 'is-hover'), numDemo('a3', 1.25, '', 'is-active'), numDemo('a4', 1.1, '', 'is-focus'), numDemo('a5', 1.1, '', 'is-error'), numDemo('a6', 1.1, '', '', 'disabled'), null, numDemo('live1', 1.1, '')]],
    ['数值 + 单位', [numDemo('b1', 1.1, '倍'), numDemo('b2', 1.1, '倍', 'is-hover'), numDemo('b3', 1.25, '倍', 'is-active'), numDemo('b4', 1.1, '倍', 'is-focus'), numDemo('b5', 1.1, '倍', 'is-error'), numDemo('b6', 1.1, '倍', '', 'disabled'), null, numDemo('live2', 1.1, '倍')]],
    ['只读结果', [null, null, null, null, null, null, `<span style="display:inline-flex;gap:4px;align-items:center;width:96px"><span class="num is-ro">75</span><span class="u">帧</span></span>`, `<span class="ks-cap" style="margin:0">见参数行「帧数」</span>`]]
  ]);
  const sheetNote = '<p class="ks-cap" style="margin-top:6px">可操作：左右拖动改值，按住 Shift 精调；单击后输入，越界变红并提示范围，离开后恢复；↑ ↓ 键逐步改。</p>';
  const SS = ['默认', '悬停', '焦点', '拖动中', '停用', '可操作'];
  const band = '<i class="sl-rb"></i>', dtick = '<i class="sl-d"></i>';
  const rng = (st = '') => `<div class="sl range ${st}" style="width:150px;--lo:12%;--hi:62%"><i class="sl-f"></i><i class="sl-k lo"></i><i class="sl-k hi"></i></div>`;
  const sliders = tbl(SS, [
    ['填充', [slDemo(''), slDemo('is-hover'), slDemo('is-focus'), slDemo('is-active'), slDemo('is-disabled'), liveRow('sl', '风速')]],
    ['默认值刻度：已改', [slDemo('', '--v:52%;--d:33%', dtick), slDemo('is-hover', '--v:52%;--d:33%', dtick), slDemo('is-focus', '--v:52%;--d:33%', dtick), slDemo('is-active', '--v:55%;--d:33%', dtick), slDemo('is-disabled', '--v:52%;--d:33%', dtick), liveRow('sl', '缩放')]],
    ['随机幅度 ±30%', [slDemo('', '--v:50%;--ra:35%;--rz:65%', band), slDemo('is-hover', '--v:50%;--ra:35%;--rz:65%', band), slDemo('is-focus', '--v:50%;--ra:35%;--rz:65%', band), slDemo('is-active', '--v:50%;--ra:35%;--rz:65%', band), slDemo('is-disabled', '--v:50%;--ra:35%;--rz:65%', band), liveRow('sl', '寿命')]],
    ['随机区间：两端', [rng(), rng('is-hover'), rng('is-focus'), rng('is-active'), rng('is-disabled'), liveRow('sl', '速度')]]
  ], [null, null, null, null, null, '480px']);
  const DS = ['默认', '悬停', '焦点', '展开', '停用', '可操作'];
  const nsel = (st = '', opts = ['0.25×', '0.5×', '1×', '2×'], v = '1×', cls = '') => `<select class="sel ${cls} ${st}" aria-label="下拉" ${st.includes('dis') ? 'disabled' : ''}>${opts.map(o => `<option${o === v ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
  const pick = (opts, v) => `<div style="margin-top:4px">${menuStatic(opts.map(o => ({t: o, ck: o === v, h: o === '2×' || o === '1024 px'})), 120)}</div>`;
  const more = st => `<button class="btn btn-icon ${st}" aria-label="更多操作">${ico('more')}</button>`;
  const addl = st => `<button class="btn btn-text sm ${st}">${ico('plus')}加层${ico('cd', 'dd')}</button>`;
  const layerMenu = menuStatic([{head: '2 金锦层'}, {t: '上移'}, {t: '下移', h: true}, {t: '改名', k: 'F2'}, '-', {t: '删除', k: 'Delete'}], 170);
  const drops = tbl(DS, [
    ['原生下拉：速度', [nsel(), nsel('is-hover'), nsel('is-focus'), nsel('is-open') + pick(['0.25×', '0.5×', '1×', '2×'], '1×'), nsel('is-disabled'), nsel()]],
    ['原生下拉：参数行内', [nsel('', ['512 px', '1024 px', '2048 px'], '1024 px', 'boxed'), nsel('is-hover', ['1024 px'], '1024 px', 'boxed'), nsel('is-focus', ['1024 px'], '1024 px', 'boxed'), nsel('is-open', ['1024 px'], '1024 px', 'boxed') + pick(['512 px', '1024 px', '2048 px'], '1024 px'), nsel('is-disabled', ['1024 px'], '1024 px', 'boxed'), nsel('', ['256 px', '512 px', '1024 px', '2048 px'], '1024 px', 'boxed')]],
    ['自定义菜单：⋯', [more(''), more('is-hover'), more('is-focus'), `<div>${more('is-active')}<div style="margin-top:4px">${layerMenu}</div></div>`, `<button class="btn btn-icon" disabled aria-label="更多操作">${ico('more')}</button>`, `<button class="btn btn-icon" data-demo="layerMenu" aria-haspopup="menu" aria-label="更多操作" data-tip="更多操作">${ico('more')}</button>`]],
    ['自定义菜单：导出 ▾', [sp(''), sp('', 'is-hover'), sp('', 'is-focus'), `<div>${sp('', 'is-open')}<div style="margin-top:4px">${menuStatic([{head: '1 层需重新导出'}, {t: '重新导出', k: '1', h: true}, {t: '导出全部', k: '3'}, {t: '导出本层（金锦层）', k: '1'}, {t: '导出勾选', k: '1'}], 200)}</div></div>`, `<div class="split"><button class="btn btn-1" disabled>导出</button><button class="btn btn-1" disabled>${ico('cd')}</button></div>`, `<div class="split"><button class="btn btn-1" data-demo="toast" data-msg="已导出">导出</button><button class="btn btn-1" data-demo="expMenu" aria-haspopup="menu" aria-label="导出选项">${ico('cd')}</button></div>`]],
    ['自定义菜单：加层 ▾', [addl(''), addl('is-hover'), addl('is-focus'), `<div>${addl('is-active')}<div style="margin-top:4px">${menuStatic([{t: '空白层', h: true}, {t: '从模板…'}, {t: '复制本层'}], 150)}</div></div>`, `<button class="btn btn-text sm" disabled>${ico('plus')}加层${ico('cd', 'dd')}</button>`, `<button class="btn btn-text sm" data-demo="addMenu" aria-haspopup="menu">${ico('plus')}加层${ico('cd', 'dd')}</button>`]]
  ]);
  const WS = ['关', '开', '悬停', '焦点', '停用 关', '停用 开', '部分选中', '可操作'];
  const ip = (cls, type, st = '', chk = false, extra = '') => `<input class="${cls} ${st}" type="${type}" ${chk ? 'checked' : ''} ${extra} aria-label="示例" tabindex="-1">`;
  const sws = tbl(WS, [
    ['开关：即时生效', [ip('sw', 'checkbox'), ip('sw', 'checkbox', '', true), ip('sw', 'checkbox', 'is-hover', true), ip('sw', 'checkbox', 'is-focus', true), ip('sw', 'checkbox', '', false, 'disabled'), ip('sw', 'checkbox', '', true, 'disabled'), null, `<label class="ckl"><input class="sw" type="checkbox" role="switch" checked>爆后扰动</label>`]],
    ['勾选：多选', [ip('chk', 'checkbox'), ip('chk', 'checkbox', '', true), ip('chk', 'checkbox', 'is-hover'), ip('chk', 'checkbox', 'is-focus'), ip('chk', 'checkbox', '', false, 'disabled'), ip('chk', 'checkbox', '', true, 'disabled'), `<input class="chk" type="checkbox" data-ind aria-label="部分选中" tabindex="-1">`, `<label class="ckl"><input class="chk" type="checkbox" checked>第 1 层</label><label class="ckl"><input class="chk" type="checkbox">第 3 层</label>`]],
    ['单选', [ip('rad', 'radio', '', false, 'name="r1"'), ip('rad', 'radio', '', true, 'name="r2"'), ip('rad', 'radio', 'is-hover', false, 'name="r3"'), ip('rad', 'radio', 'is-focus', true, 'name="r4"'), ip('rad', 'radio', '', false, 'disabled name="r5"'), ip('rad', 'radio', '', true, 'disabled name="r6"'), null, `<label class="ckl"><input class="rad" type="radio" name="rl" checked>全部</label><label class="ckl"><input class="rad" type="radio" name="rl">选中的</label>`]]
  ]);
  const GS = ['默认', '悬停', '焦点', '停用一项', '整体停用', '可操作'];
  const m3w = ['实时模拟', '引擎回放', '贴图与交付'];
  const segs = tbl(GS, [
    ['S：2 项', [segH(['单次', '循环'], 0), segH(['单次', '循环'], 0, {1: 'is-hover'}), segH(['单次', '循环'], 0, {1: 'is-focus'}), segH(['单次', '循环'], 0, {1: 'dis'}), segH(['单次', '循环'], 0, {0: 'dis', 1: 'dis'}), segH(['单次', '循环'], 0)]],
    ['S：3 项', [segH(['适应', '1:1', '游戏内'], 0), segH(['适应', '1:1', '游戏内'], 0, {2: 'is-hover'}), segH(['适应', '1:1', '游戏内'], 0, {1: 'is-focus'}), segH(['适应', '1:1', '游戏内'], 0, {2: 'dis'}), segH(['适应', '1:1', '游戏内'], 0, {0: 'dis', 1: 'dis', 2: 'dis'}), segH(['适应', '1:1', '游戏内'], 0)]],
    ['S：4 项', [segH(['3 号', '5 号', '尺玉', '2 尺'], 2), segH(['3 号', '5 号', '尺玉', '2 尺'], 2, {0: 'is-hover'}), segH(['3 号', '5 号', '尺玉', '2 尺'], 2, {3: 'is-focus'}), segH(['3 号', '5 号', '尺玉', '2 尺'], 2, {3: 'dis'}), segH(['3 号', '5 号', '尺玉', '2 尺'], 2, {0: 'dis', 1: 'dis', 2: 'dis', 3: 'dis'}), segH(['3 号', '5 号', '尺玉', '2 尺'], 2)]],
    ['M：工作模式', [segH(m3w, 1, {}, 'm'), segH(m3w, 1, {2: 'is-hover'}, 'm'), segH(m3w, 1, {0: 'is-focus'}, 'm'), segH(m3w, 1, {0: 'dis'}, 'm'), segH(m3w, 1, {0: 'dis', 1: 'dis', 2: 'dis'}, 'm'), segH(m3w, 1, {}, 'm')]]
  ]);
  const TS = ['默认', '悬停', '焦点', '停用一项', '可操作'];
  const m3 = ['实时模拟', '引擎回放', '贴图与交付'];
  const tabsT = tbl(TS, [
    ['效果库：大号', [tabsH(['效果', '模板'], 0, {}, 'tabs-lg', '220px'), tabsH(['效果', '模板'], 0, {1: 'is-hover'}, 'tabs-lg', '220px'), tabsH(['效果', '模板'], 0, {1: 'is-focus'}, 'tabs-lg', '220px'), tabsH(['效果', '模板'], 0, {1: 'dis'}, 'tabs-lg', '220px'), tabsH(['效果', '模板'], 0, {}, 'tabs-lg', '220px')]],
    ['二级标签', [tabsH(['花型', '多层花型'], 0, {}, 'tabs-sub', '220px'), tabsH(['花型', '多层花型'], 0, {1: 'is-hover'}, 'tabs-sub', '220px'), tabsH(['花型', '多层花型'], 0, {1: 'is-focus'}, 'tabs-sub', '220px'), tabsH(['花型', '多层花型'], 0, {1: 'dis'}, 'tabs-sub', '220px'), tabsH(['花型', '多层花型'], 0, {}, 'tabs-sub', '220px')]]
  ]);
  return `<h2>基础控件</h2><p class="lead">规范 v3 第 4 节：一种意思只有一种样子。状态：默认、悬停、焦点、按下、选中 / 开着、停用、加载中、失败；「—」表示没有这一状态。最后一列有浅底，可以真点。</p>
    <h3>按钮<span>主操作薄荷实底，全屏只有一个（导出 ▾）；命令静止没有底，悬停出浮层底色，按下更深；图标命令 16 px 图标放在 28 px 方框里；图标开关开着时填选中底色；停用一律降透明度</span></h3>${buttons}
    <h3>输入框<span>文本、搜索含清除、多行、文件选择</span></h3>${inputs}
    <h3>数值框<span>平时不加框，悬停出现细框</span></h3>${nums}${sheetNote}
    <h3>滑杆<span>滑块为竖条，配合直角；已改时出现默认值刻度；随机幅度画成浅带；随机区间拖离鼠标近的一端；最后一列是真参数行</span></h3>${sliders}
    <h3>下拉<span>原生下拉用于选项少的固定值，如速度、单格；带动作的用自定义菜单；两种展开后外观一致</span></h3>${drops}
    <p class="ks-cap" style="margin-top:6px">原生下拉在 Chrome / Edge 135 以上用 appearance: base-select，展开列表在页面内绘制，与自定义菜单同色同字号；更早的浏览器仍是系统弹出层，样式不受控。「展开」一格用同款菜单静态示意。</p>
    <h3>开关与勾选<span>开关轨道 28×16：关只画 1 px 框、方块在左；开填选中底色、方块在右；停用降透明度、悬停写原因。勾选 14 px 方框</span></h3>${sws}
    <h3>分段控件<span>只有这一种「选一个」：外面 1 px 框，选中段填选中底色并用 600。M：工作模式；S：缩放、单次 / 循环、筛选块、PC / 手机、贴图 / 逐帧</span></h3>${segs}
    <h3>页面标签<span>文字 + 2 px 下划线；当前项薄荷下划线、600；效果库「效果 / 模板」和外壳「资源交付」「资源编排」</span></h3>${tabsT}`;
}

/* ---------- 全表：可操作的参数（与主屏同一套引擎，键前缀 sheet） ---------- */
const E08 = SPK.emitters.find(e => e.id === 'e08');
const SHEET_MODS = {
  sl: [{t: '滑杆', rows: [
    {lab: '风速', unit: 'm/s', min: 0, max: 20, step: .1, v: 4.2},
    {lab: '缩放', unit: '倍', min: .1, max: 3, step: .01, v: 1.1, def: 1},
    {lab: '寿命', unit: 's', min: .05, max: 4, step: .01, v: 2.8, rnd: '随机▸±30%'},
    {k: 'range', lab: '速度', unit: 'm/s', min: .01, max: 5, step: .01, v: [.05, .65], ex: 1.8, log: true}]}],
  prm: [{t: '参数行', rows: [
    {lab: '开始时间', unit: 's', min: 0, max: 5, step: .01, v: .2},
    {lab: '时间倍率', unit: '倍', min: .25, max: 4, step: .01, v: 1.5},
    {lab: '颗粒大小', unit: 'm', min: .05, max: 2, step: .01, v: .45},
    {lab: '缩放', unit: '倍', min: .1, max: 3, step: .01, v: 1.1, def: 1},
    {lab: '寿命', unit: 's', min: .05, max: 4, step: .01, v: 2.8, rnd: '随机▸±30%'},
    {lab: '初速', unit: 'm/s', min: 20, max: 600, step: 1, v: 250, rnd: '随机▸±8%±1.5°'},
    {lab: '湍流强度', unit: 'm/s', min: 0, max: 10, step: .1, v: 0, affects: true},
    {lab: '湍流尺度', unit: 'm', min: 1, max: 200, step: 1, v: 60, dis: P => +P.get('湍流强度') === 0 ? '湍流强度为 0 时无效' : null},
    {k: 'ro', lab: '张数', unit: '张', v: () => 5, note: () => '75 帧，每张 15 帧'},
    {k: 'range', lab: '速度', unit: 'm/s', min: .01, max: 5, step: .01, v: [.05, .65], ex: 1.8, log: true},
    {k: 'seg', lab: '方向', opts: ['球面', '锥形'], v: '球面', affects: true},
    {lab: '锥角', unit: '°', min: 0, max: 180, step: 1, v: 30, if: P => P.get('方向') === '锥形', dep: '方向', depWhy: '方向不是「锥形」时无效'},
    {k: 'sw', lab: '爆后扰动', v: false, affects: true},
    {lab: '扰动开始时间', unit: 's', min: 0, max: 3, step: .01, v: .4, if: P => P.get('爆后扰动'), dep: '爆后扰动'},
    {lab: '扰动气流速度', unit: 'm/s', min: 0, max: 5, step: .1, v: 1.2, if: P => P.get('爆后扰动'), dep: '爆后扰动'},
    {lab: '扰动尺度', unit: 'm', min: 1, max: 50, step: .1, v: 8, if: P => P.get('爆后扰动'), dep: '爆后扰动'},
    {k: 'sel', lab: '单格', opts: ['512 px', '1024 px', '2048 px'], v: '1024 px'}]}],
  mod: [
    {t: '时间与缩放', rows: [{lab: '开始时间', unit: 's', min: 0, max: 5, step: .01, v: .2}, {lab: '缩放', unit: '倍', min: .1, max: 3, step: .01, v: 1.1, def: 1}, {lab: '时间倍率', unit: '倍', min: .25, max: 4, step: .01, v: 1.5}]},
    {t: '规格', closed: true, rows: [{k: 'sel', lab: '号数', opts: ['手动', '3 号', '尺玉'], v: '手动'}, {lab: '序列时长', unit: 's', min: 1, max: 15, step: .01, v: 7.56}]},
    {t: '环境', closed: true, rows: [{lab: '风速', unit: 'm/s', min: 0, max: 20, step: .1, v: 2.4, def: 0}, {lab: '湍流强度', unit: 'm/s', min: 0, max: 10, step: .1, v: 1.5, def: 0}]}],
  crv: [{t: '曲线', rows: [{k: 'curve', lab: '大小曲线', v: E08.sizeCurve.map(p => [+p[0].toFixed(2), +p[1].toFixed(2)])}, {k: 'curve', lab: '亮度曲线', v: E08.brightCurve.map(p => [+p[0].toFixed(2), +p[1].toFixed(3)])}]}]
};
function liveRow(g, lab) {
  const mods = SHEET_MODS[g], P = ctxOf('sheet|' + g, mods), m = mods.find(x => x.rows.some(r => r.lab === lab));
  return `<div class="ks-panel" style="--pw:460px" data-sheetp="${g}" data-lab="${lab}">${rowHTML(P, m, m.rows.find(r => r.lab === lab))}</div>`;
}
function liveMods(g, w = 480) { const mods = SHEET_MODS[g], P = ctxOf('sheet|' + g, mods); return `<div class="ks-panel" style="--pw:${w}px" data-sheetp="${g}">${mods.map(m => modHTML(P, m)).join('')}</div>`; }
function rerenderSheetParams(k) {
  const g = k.split('|')[1], mods = SHEET_MODS[g]; if (!mods) return;
  const P = ctxOf('sheet|' + g, mods);
  $$(`[data-sheetp="${g}"]`).forEach(c => {
    if (c.dataset.lab) { const m = mods.find(x => x.rows.some(r => r.lab === c.dataset.lab)); c.innerHTML = rowHTML(P, m, m.rows.find(r => r.lab === c.dataset.lab)); }
    else c.innerHTML = mods.map(m => modHTML(P, m)).join('');
    alignNums(c);
    if (g === 'prm') markPrmStates();
  });
}
function markPrmStates() {
  const p = $('[data-sheetp="prm"]'); if (!p) return;
  const r = lab => $(`.prm[data-lab="${lab}"]:not(.sub)`, p);
  r('时间倍率')?.classList.add('is-hover');
  const lk = $('.lk', r('颗粒大小') || document.body); if (lk && !PS['sheet|prm|参数行|颗粒大小'].lock) { PS['sheet|prm|参数行|颗粒大小'].lock = true; lk.setAttribute('aria-pressed', 'true'); }
}
const tagFor = {开始时间: '普通', 时间倍率: '本次改过：竖条；悬停出现锁', 颗粒大小: '已锁定', 缩放: '非默认：恢复按钮常显、默认值刻度', 寿命: '随机幅度：数值格右边的展开箭头', 初速: '随机幅度展开后可调', 湍流尺度: '停用：滑杆变暗，数值列弱色小字写原因', 张数: '只读结果与说明', 速度: '随机区间一行，名称后写「分布 1.8」', 方向: '控制锥角；球面时收成一行', 爆后扰动: '关闭时下面 3 项收成一行', 单格: '原生下拉'};

/* ---------- 全表：组合部件（清单第 3 节） ---------- */
function staticTree() {
  const r = (lv, cls, ty, nm, opt = {}) => `<div class="trow ${cls}" style="--lv:${lv}" ${opt.exp !== undefined ? `aria-expanded="${opt.exp}"` : ''}><span class="chev${opt.exp === undefined ? ' none' : ''}">${ico('cr')}</span>${ty === 'layer' || ty === 'group' ? '' : ico(ty, 'ty')}<span class="nm">${opt.no ? `<span class="no">${opt.no}</span>` : ''}${opt.ren ? `<input class="ren" value="${nm}" aria-label="名称">` : `<span class="tx">${nm}</span>`}${opt.cnt ? `<span class="cnt">${opt.cnt}</span>` : ''}${opt.stl ? `<svg class="i stl"><use href="#i-stale"/></svg>` : ''}</span><span class="acts">${opt.noVis ? '<span class="ph2"></span>' : `<button class="btn btn-icon eye" aria-pressed="${!cls.includes('is-off')}" tabindex="-1">${ico(cls.includes('is-off') ? 'eyeoff' : 'eye')}</button><button class="btn btn-icon solo" aria-pressed="${!!opt.solo}" tabindex="-1">${ico(opt.solo ? 'soloon' : 'solo')}</button>`}<button class="btn btn-icon more" tabindex="-1">${ico('more')}</button></span></div>`;
  const cap = t => `<div class="ks-cap" style="margin:8px 0 2px 6px">${t}</div>`;
  return `<div class="ks-frame" style="--pw:300px"><div class="tree" style="overflow:visible">
    ${cap('效果、层、发射器；折叠与展开')}
    ${r(0, 't-group', 'group', '金曜菊-B 稀簇辉闪', {exp: true, noVis: true})}${r(1, 't-layer', 'layer', '橙引线层', {exp: false, no: 1})}${r(1, 't-layer is-sel', 'layer', '金锦层', {exp: true, no: 2, stl: true})}${r(2, 't-emitter', 'star', '星')}
    ${cap('悬停出现显示、只看、⋯；隐藏；改名中')}
    ${r(2, 't-emitter is-hover', 'spark', '火花')}${r(2, 't-emitter is-off', 'ember', '余烬')}${r(1, 't-layer', 'layer', '点灭星', {exp: false, no: 3, ren: true})}
    ${cap('只看可叠加：其他行变暗，只看图标实心常亮')}
    ${r(1, 't-layer is-dim', 'layer', '橙引线层', {exp: false, no: 1})}${r(1, 't-layer', 'layer', '金锦层', {exp: false, no: 2, solo: true})}${r(1, 't-layer is-dim', 'layer', '点灭星', {exp: false, no: 3})}
    ${cap('嵌套 3 级：仙女棒')}
    ${r(1, 't-emitter', 'spark', '分裂母粒', {exp: true, no: '05'})}${r(2, 't-emitter', 'spark', '一级分叉', {exp: true, no: '06'})}${r(3, 't-emitter is-sel', 'spark', '二级碎火星', {no: '08'})}${r(2, 't-emitter', 'spark', '延迟分叉', {no: '07'})}
    <div class="trow t-add"><button class="btn btn-text sm" tabindex="-1">${ico('plus')}加层${ico('cd', 'dd')}</button><button class="btn btn-text sm" tabindex="-1">${ico('plus')}加发射器</button></div></div></div>`;
}
function libItem(it, cls = '', q = '') {
  return `<div class="lib-item ${cls}" tabindex="-1"><div class="th"><img src="${libImg(it.img)}" alt=""></div><div class="li-t"><div class="li-n">${hl(it.name, q)}</div><div class="li-s">${it.sub.map(s => `<span>${s}</span>`).join('')}<span class="st${it.st === '待验收' ? ' st-due' : ''}">${it.st}</span></div></div></div>`;
}
function emptyBox(b, s, a) { return `<div class="ks-frame" style="--pw:300px"><div class="empty" style="padding:16px 12px"><b>${b}</b>${s ? `<span>${s}</span>` : ''}<button class="btn btn-2">${a}</button></div></div>`; }
function pgraph() {
  const em = SPK.emitters, col = {e05: 0, e06: 1, e07: 1, e08: 2}, rowOf = {e05: 0, e06: 0, e08: 0, e07: 1};
  const top = em.filter(e => !e.parent && e.id !== 'e05');
  const W = 196, H = 54;
  const node = (e, x, y, sel) => `<div class="pg-n${sel ? ' is-sel' : ''}" style="left:${x}px;top:${y}px" data-pg="${e.id}"><b>${e.name.replace('｜', ' ')}</b><span>${e.parent ? `触发 ${e.event.toFixed(2)}　概率 ${e.probability.toFixed(2)}　×${e.children}` : `${e.count} 个　${e.shape === 'line' ? '线条' : e.shape === 'point' ? '点' : '碎片'}`}</span></div>`;
  let h = '', paths = '';
  ['e05', 'e06', 'e08', 'e07'].forEach(id => { const e = em.find(x => x.id === id); h += node(e, col[id] * (W + 40), rowOf[id] * H + 0, id === 'e08'); });
  const mid = (c, r) => [c * (W + 40), r * H + 22];
  [['e05', 'e06'], ['e06', 'e08'], ['e05', 'e07']].forEach(([a, b]) => { const [x1, y1] = mid(col[a], rowOf[a]), [x2, y2] = mid(col[b], rowOf[b]); paths += `<path d="M${x1 + W} ${y1} H${x1 + W + 20} V${y2} H${x2}"/>`; });
  top.forEach((e, i) => { h += node(e, (i % 3) * (W + 40), 2 * H + 20 + Math.floor(i / 3) * H, false); });
  const rows = 2 + Math.ceil(top.length / 3);
  return `<div class="pg" style="width:${3 * (W + 40)}px;height:${rows * H + 20}px"><svg>${paths}</svg>${h}</div>`;
}
function sheetCombo() {
  const sc = SC.kiku, it = LIB;
  const header = (pathParts, tier) => `<div class="insp-h" style="width:480px;background:var(--bg)"><nav class="path">${pathParts.map((p, i) => i === pathParts.length - 1 ? `<span class="cur">${p}</span>` : `<button>${p}</button><span class="sep">›</span>`).join('')}</nav>${tier}</div>`;
  /* 工具行、状态栏：照主屏现有的 DOM 复制一份静态的（去掉 id 与动作），保证和主屏一致 */
  const strip = h => h.replace(/\s(id|data-act|data-ui|data-why|data-tip|data-key)="[^"]*"/g, '');
  const toolbarStatic = `<div class="topbar ks-tool" style="display:flex;height:38px;width:1440px;background:var(--bg)"><div class="tcol tcol-m" style="flex:1">${strip($('#toolRow .tcol-m').innerHTML)}</div><div class="tcol tcol-r" style="flex:none">${strip($('#toolRow .tcol-r').innerHTML)}</div></div>`;
  const transportStatic = `<div class="transport" style="height:36px;width:1440px;background:var(--bg)">${strip($('#transport').innerHTML).replace(/class="num tnum /g, 'readonly tabindex="-1" class="num tnum static ')}</div>`;
  const statusStatic = `<div style="display:flex;flex-direction:column;gap:8px;width:1100px"><div class="status" style="height:28px"><div class="st-l"><button class="btn btn-text tbtn sm">复制意见</button></div><div class="st-r"><button class="btn btn-text tbtn sm">已保存 20:31</button><button class="btn btn-text tbtn sm">快捷键<kbd>?</kbd></button></div></div><div class="status" style="height:28px"><div class="st-l"><button class="btn btn-text tbtn sm">复制意见</button></div><div class="st-r"><button class="btn btn-text tbtn sm" style="color:var(--t1)">未保存 3 项${ico('cd', 'dd')}</button><button class="btn btn-text tbtn sm">快捷键<kbd>?</kbd></button></div></div></div>`;
  return `<h2>组合部件</h2><p class="lead">规范 v3 第 7–10 节。都由上面的基础控件拼成；当前编辑对象只在结构树里用 1 px 薄荷细框；时间轴当前行底色亮一级，效果库、交付表的当前项填选中底色。显示 / 只看图标只在悬停、选中或非默认时出现。</p>
  <div class="ks-cols" style="--c:2">
   <div class="ks-blk"><h3>结构树行<span>效果 / 层 / 发射器；展开折叠；显示、只看、⋯；隐藏；只看时其他行变暗；改名；嵌套 3 级</span></h3>
     <div class="ks-row">${staticTree()}<div><span class="ks-cap">可操作：多层花型模板 5 层，展开 ${rowsOf(SC.tpl5).length} 行，可滚动；方向键上下、左右收起展开</span><div class="ks-frame" style="--pw:300px;--ph:420px"><div class="tree" id="sheetTree" data-scene="tpl5" role="tree" aria-label="结构树示例" style="flex:1;min-height:0"></div></div></div></div></div>
   <div class="ks-blk"><h3>参数行<span>五列网格；左侧槽位竖条为本次改过；不是默认值时操作列的恢复按钮常显；停用行在数值列写原因；锁定悬停出现；依赖行缩进，关闭时收成一行</span></h3>
     <div class="ks-row"><div id="prmTags" style="display:flex;flex-direction:column;width:200px;padding-top:0"></div>${liveMods('prm', 460)}</div>
     <p class="ks-cap" style="margin-top:6px">都可操作：拖动、单击输入、双击名称恢复默认；悬停数值看「打开时 → 现在」；把湍流强度调到 0 以上解除失效；切「方向」为锥形出现锥角；点「查看」看收起的依赖行。</p></div>
  </div>
  <div class="ks-cols" style="--c:3">
   <div class="ks-blk"><h3>参数模块<span>标题 600、展开箭头在左、摘要右对齐到数值列；模块之间 1 px 线</span></h3>${liveMods('mod', 460)}</div>
   <div class="ks-blk"><h3>曲线编辑<span>仙女棒 08 二级碎火星的真实曲线；拖动关键点，双击空白加点，Delete 删点，下方可输入</span></h3>${liveMods('crv', 460)}</div>
   <div class="ks-blk"><h3>档位切换<span>多档效果打开后，在检查器标题旁</span></h3>
     <span class="ks-cap">3 档：分段选择</span>${header(['升空尾缀', '尾焰'], `<span class="tier">${segH(['小', '中', '大'], 1, {}, 'sm')}</span>`)}
     <span class="ks-cap" style="margin-top:12px">6 档：原生下拉</span>${header(['金芒菊', '外环'], `<span class="tier"><select class="sel boxed" aria-label="档位">${['3 号', '5 号', '尺玉', '2 尺', '3 尺', '4 尺'].map(o => `<option${o === '尺玉' ? ' selected' : ''}>${o}</option>`).join('')}</select></span>`)}
     <h3>只读结果<span>计算出的值 + 一行说明，不可拖</span></h3><div class="ks-panel" style="--pw:460px">${rowHTML(ctxOf('sheet|prm', SHEET_MODS.prm), SHEET_MODS.prm[0], SHEET_MODS.prm[0].rows.find(r => r.lab === '张数'))}</div></div>
  </div>
  <div class="ks-cols" style="--c:3">
   <div class="ks-blk"><h3>效果库条目<span>缩略图 40、名称、副信息「代号　N 层」、状态词；当前效果填选中底色</span></h3>
     <div class="ks-frame" style="--pw:300px;padding:6px">${libItem(it[0], 'is-sel')}${libItem(it[2], 'is-hover')}${libItem(it[1])}${libItem(it[3])}${libItem(it[5])}</div>
     <span class="ks-cap" style="margin-top:8px">状态只用文字：待验收、新用主文字色，制作中、已通过用次要灰。从上到下：当前、悬停、默认。</span></div>
   <div class="ks-blk"><h3>效果库<span>三个工具同一模式：大标签、二级标签、搜索、筛选块、数量与新建、列表</span></h3>
     <div class="ks-frame" style="--pw:300px">${tabsH(['效果', '模板'], 1, {}, 'tabs-lg')}${tabsH(['花型', '多层花型', '我的'], 0, {}, 'tabs-sub')}
      <div class="lib-tools"><label class="field search">${ico('search')}<input type="search" placeholder="名称、任务号、花型" aria-label="搜索"><button class="clr" type="button" aria-label="清除">${ico('x')}</button></label>
      <div class="lib-meta"><div class="seg sm" data-free><button aria-pressed="true">全部</button><button class="is-hover" aria-pressed="false">球花</button><button aria-pressed="false">尾缀</button><button aria-pressed="false" disabled>扇形</button></div><span class="sp"></span><span class="cnt">31 个</span><button class="btn btn-text sm">${ico('plus')}新建</button></div></div>
      <div class="tpl-grid" style="height:248px;overflow:auto">${TPL_NAMES.map((n, i) => `<div class="tpl" tabindex="0" data-big="${i}" data-name="${n}"><div class="th"><img src="${IMG.tpl[i]}" alt=""></div><span>${n}</span></div>`).join('')}</div></div>
     <span class="ks-cap" style="margin-top:8px">模板网格可滚动，悬停放大。筛选块即分段选择：全部为选中，球花为悬停，扇形为停用。</span></div>
   <div class="ks-blk"><h3>空状态<span>一句说明和一个操作</span></h3>
     ${emptyBox('还没有我的模板', '', '存为模板')}<div style="height:12px"></div>
     ${emptyBox('没有匹配「银柳」的效果', '', '清除搜索')}<div style="height:12px"></div>
     <div class="ks-panel" style="--pw:300px;box-shadow:0 0 0 1px var(--g3)"><div class="empty" style="padding:16px 12px"><b>没有已改的参数</b><button class="btn btn-2">显示全部</button></div></div></div>
  </div>
  <h3>胶片条 + 刻度 + 时间轴轨道<span>胶片 28 px 只覆盖导出范围，没烘焙的是 40 % 空框；刻度尺上的浅底是导出范围，两端可拖，上方可输入；层 6 px、发射器 2 px，超出范围 40 %；当前行亮一级</span></h3>
  <div class="ks-frame" style="--pw:1100px;padding:4px 0"><div class="tlw" id="sheetTL" style="padding-bottom:4px"></div></div>
  <h3>制作区工具行 / 时间轴头部 / 状态栏<span>工具行中段对齐画面，右段对齐检查器；组间 20 px、组内 8 px；「⚠ 1」在导出左侧；播放条三组：▶ ⏮ 1× 循环 ｜ 时间和烘焙 ｜ 选项和缩略图，组间 20 px</span></h3><div style="display:flex;flex-direction:column;gap:12px">${toolbarStatic}${transportStatic}${statusStatic}</div>
  <div class="ks-cols" style="--c:2">
   <div class="ks-blk"><h3>交付产物表<span>每层 PC / 手机出什么；每行可勾选；选中行填选中底色，与结构树同步</span></h3><div class="ks-panel" style="--pw:720px">${delivTableHTML(sc, sc.root.kids[1])}</div></div>
   <div class="ks-blk"><h3>粒子图结构<span>仙女棒：05 分裂母粒 › 06 一级分叉 › 08 二级碎火星，05 › 07 延迟分叉；其余为顶层发射器</span></h3>${pgraph()}</div>
  </div>
  <div class="ks-cols" style="--c:3">
   <div class="ks-blk"><h3>编排专用：资源库<span>同一模式：标签、搜索、筛选、列表、动作</span></h3>
     <div class="ks-frame" style="--pw:300px"><div class="pane-h" style="padding-left:12px"><span class="pane-t" style="padding:0">编排资源</span><span class="sp"></span><span class="pane-sub">497 片段</span></div>${tabsH(['编排片段', '交付资源', '模板库'], 2, {}, 'tabs-lg')}${tabsH(['基础模板', '花型模板', '编排模板'], 1, {}, 'tabs-sub')}
      <div class="lib-tools"><label class="field search">${ico('search')}<input type="search" placeholder="名称、模板" aria-label="搜索"></label><div class="lib-meta"><div class="seg sm" data-free><button aria-pressed="true">全部</button><button aria-pressed="false">尾缀</button><button aria-pressed="false">球花</button><button aria-pressed="false">扇形</button></div><span class="sp"></span><span class="cnt">90 个</span><button class="btn btn-text sm">${ico('plus')}新建</button></div></div>
      <div class="lib-list" style="max-height:130px">${libItem({img: 't_kiku', name: 'R03 金裂星 90m', sub: ['坝顶', '2 层', 'v2'], st: '待标定'}, 'is-sel').replace('</div></div></div>', `</div></div><span class="li-acts"><button class="btn btn-icon sm" aria-label="更多">${ico('more')}</button></span></div>`)}${libItem({img: 't_copy', name: 'R03 小银菊 90m', sub: ['坝顶', '2 层', 'v2'], st: '已标定'}, 'is-hover').replace('</div></div></div>', `</div></div><span class="li-acts"><button class="btn btn-text sm" data-tip="加入时间轴">${ico('plus')}加入</button></span></div>`)}</div></div></div>
   <div class="ks-blk"><h3>编排专用：点位选择组<span>多选；已选有底色和下边线；不可用的点位停用</span></h3>
     <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:6px"><span class="ks-cap" style="margin:0">坝顶</span><span class="sp"></span><span class="ks-cap" style="margin:0" id="ptsN">已选 3 个</span><button class="btn btn-text sm" data-demo="ptsAll">全选</button><button class="btn btn-text sm" data-demo="ptsNone">清空</button></div>
     <div class="pts" id="pts">${Array.from({length: 16}, (_, i) => `<button aria-pressed="${[2, 3, 4].includes(i)}" ${i === 13 ? 'disabled data-tip="维修中，不可用"' : ''}>P${String(i + 1).padStart(2, '0')}</button>`).join('')}</div>
     <h3>编排专用：时间轴网格<span>小节与拍；片段块可选中</span></h3>
     <div class="bgrid" style="width:100%">${Array.from({length: 33}, (_, i) => `<i class="bl${i % 4 === 0 ? ' m' : ''}" style="left:${(i / 32 * 100).toFixed(2)}%"></i>${i % 4 === 0 && i < 32 ? `<span class="bn" style="left:${(i / 32 * 100).toFixed(2)}%">${i / 4 + 1}</span>` : ''}`).join('')}
       <div class="cue is-sel" style="left:12.5%;width:22%;top:26px">R03 金裂星</div><div class="cue" style="left:40.6%;width:15%;top:26px">R03 小银菊</div><div class="cue" style="left:25%;width:30%;top:58px">尾缀 RT6</div><div class="cue" style="left:62.5%;width:25%;top:88px">千轮</div></div></div>
   <div class="ks-blk"><h3>编排专用：输入建议列表<span>输入时出现；↑ ↓ 选择，Enter 采用</span></h3>
     <label class="field search" id="sugField" style="width:280px">${ico('search')}<input type="search" placeholder="片段名称" aria-label="输入片段名" autocomplete="off" data-suggest><button class="clr" type="button" aria-label="清除">${ico('x')}</button></label>
     <div style="margin-top:4px">${menuStatic([{t: '<b>R03</b> 金裂星 90m', k: '坝顶', h: true}, {t: '<b>R03</b> 小银菊 90m', k: '坝顶'}, {t: '<b>R03</b> 千轮 120m', k: '水面'}], 280).replace('class="menu static"', 'class="menu static suggest"')}</div>
     <h3>导入器专用：导入范围</h3><div class="scope"><label class="ckl"><input class="rad" type="radio" name="scope" checked>全部 13 个</label><label class="ckl"><input class="rad" type="radio" name="scope">选中 3 个</label><label class="ckl"><input class="rad" type="radio" name="scope">时段 <span data-numdemo="s0" data-v="0" data-min="0" data-max="2.13" data-step="0.01" style="display:inline-flex"><input class="num" value="0.00" aria-label="开始"></span>–<span data-numdemo="s1" data-v="2.13" data-min="0" data-max="2.13" data-step="0.01" style="display:inline-flex"><input class="num" value="2.13" aria-label="结束"></span> s</label></div>
     <h3>导入器专用：操作反馈</h3><div style="display:flex;flex-direction:column;gap:6px;width:380px"><div class="fb ok">${ico('check')}已导入 13 个发射器<button class="btn btn-text sm">查看</button></div><div class="fb warn">${ico('alert')}2 个参数超出范围，已截断<button class="btn btn-text sm">查看</button></div><div class="fb err">${ico('alert')}文件里没有 emitters<button class="btn btn-text sm">重新选择</button></div></div>
     <h3>导入器专用：连接状态标签<span>形状 + 文字，不单靠颜色</span></h3><div class="ks-row"><span class="conn on">已连接</span><span class="conn wait"><span class="spin"></span>连接中</span><span class="conn off">未连接</span><span class="conn err">连接出错</span></div></div>
  </div>`;
}

/* ---------- 全表：浮层（清单第 4 节） ---------- */
function expMenuStatic() {
  const mi = (t, k, h) => `<div class="mi${h ? ' is-hover' : ''}"><span class="mt2"><span>${t}</span></span><span class="k">${k}</span></div>`;
  return `<div class="menu static wide exp" style="min-width:300px"><div class="msum"><div class="mline"><b>1 层需重新导出</b><button class="btn tbtn mdet" type="button" aria-expanded="false">详情${ico('cd', 'dd')}</button></div></div><hr>
    ${mi('重新导出', '1', true)}${mi('导出全部', '3')}${mi('导出本层（金锦层）', '1')}${mi('导出勾选', '1')}<hr>
    <div class="mrow"><span class="lbl">平台</span>${segH(['PC + 手机', 'PC', '手机'], 0)}</div>
    <label class="mopt"><input class="chk" type="checkbox"><span class="mt2"><span>同时放进编排</span></span></label></div>`;
}
function sheetOverlays() {
  const live = (act, t) => `<button class="btn btn-2 sm" data-demo="${act}" data-tip="${t}" style="margin-top:8px">试用</button>`;
  const blk = (h, sub, body, act) => `<div class="ks-blk"><h3>${h}<span>${sub}</span></h3>${body}<div>${act || ''}</div></div>`;
  return `<h2>浮层</h2><p class="lead">清单第 4 节。静态画出每种浮层；下面的按钮在本页真打开它。</p>
  <div class="ks-cols" style="--c:4">
   ${blk('原生下拉展开', 'base-select；外观同自定义菜单', menuStatic([{t: '0.25×', ck: false}, {t: '0.5×', ck: false}, {t: '1×', ck: true}, {t: '2×', ck: false, h: true}], 140), `<select class="sel" style="margin-top:8px" aria-label="速度"><option>0.5×</option><option selected>1×</option><option>2×</option></select>`)}
   ${blk('⋯ 菜单', '层的操作；删除直接执行，可撤销', menuStatic([{head: '2 金锦层'}, {t: '上移'}, {t: '下移', h: true}, {t: '改名', k: 'F2'}, {t: '复制'}, {t: '加发射器'}, {t: '隐藏', k: 'H'}, {t: '加入只看', k: 'S'}, '-', {t: '删除', k: 'Delete'}], 180), live('layerMenu', '打开 ⋯ 菜单'))}
   ${blk('导出 ▾', '三段：一行摘要（详情点开才出文件清单）；操作右侧写层数；平台、同时放进编排', expMenuStatic(), live('expMenu', '打开导出菜单'))}
   ${blk('勾选菜单', '筛选 ▾', menuStatic([{t: '仅已改', ck: true, h: true}, '-', {t: '全部展开', ck: false}, {t: '全部折叠', ck: false}], 160), live('viewMenu', '打开筛选菜单'))}
  </div>
  <div class="ks-cols" style="--c:4">
   ${blk('悬停提示', '图标按钮；带快捷键', `<div class="tip static sm">撤销<span class="k">Ctrl+Z</span></div>`, `<button class="btn btn-icon" data-tip="撤销" data-key="Ctrl+Z" aria-label="撤销" style="margin-top:8px">${ico('undo')}</button>`)}
   ${blk('参数说明提示', '浮层面色、6 px 小三角、离触发点 8 px、最宽 260；出在检查器左侧，不挡同组参数', `<div class="tip static" style="max-width:260px"><b>缩放</b>本层相对整朵的大小倍数<div class="meta"><span>默认 1.00 倍</span><span>范围 0.10–3.00</span></div><div class="meta"><span>打开时 1.10 倍</span><span>现在 1.30 倍</span></div><div class="meta"><span>双击名称恢复默认</span></div></div>`, '')}
   ${blk('撤销提示条', '显示 12 秒，悬停不消失；出在外壳顶栏下方、画面顶部居中', `<div class="toast static"><span>已删除「点灭星」</span><button class="btn btn-text sm">撤销</button><button class="btn btn-icon sm" aria-label="关闭">${ico('x')}</button></div>`, live('toast', '显示撤销提示条'))}
   ${blk('输入建议列表', '见上方编排专用', menuStatic([{t: '<b>金</b>裂星', h: true}, {t: '<b>金</b>曜菊-B'}], 200).replace('class="menu static"', 'class="menu static suggest"'), '')}
  </div>
  <div class="ks-cols" style="--c:2">
   ${blk('确认弹窗：只用于不能撤销的操作', '能撤销的操作不弹窗，直接执行并给撤销提示条；默认焦点在「取消」，Esc 关闭', `<div class="dialog static"><h2>删除效果「金曜菊-B 稀簇辉闪」</h2><p>效果文件、版本记录和导出记录将一并删除。此操作不能撤销。</p><div class="acts"><button class="btn tbtn">取消</button><button class="btn btn-danger">删除</button></div></div>`, live('confirm', '打开确认弹窗'))}
   ${blk('快捷键表', '按 ? 打开', `<div class="keys static">${keysHTML()}</div>`, live('keys', '打开快捷键表'))}
  </div>`;
}

/* ---------- 全表：交互（清单第 5 节）在哪里试 ---------- */
function sheetInteract() {
  const I = [
    ['数值拖动、Shift 精调', '在数值或滑杆上拖；按住 Shift 变慢，中途按下以当前值为起点；拖动中 Esc 取消', '主屏检查器；全表「数值框」「参数行」'],
    ['单击输入、越界报错', '单击数值输入；越界变红并给出有效范围，离开后复原', '同上'],
    ['双击恢复默认、恢复菜单', '双击参数名；或点行尾恢复按钮，选「打开时」或「默认」', '主屏「缩放」；全表参数行'],
    ['和打开时比', '竖条为本次改过，恢复按钮常显为非默认；悬停数值显示「打开时 → 现在」', '主屏检查器；全表参数行'],
    ['滑杆一次撤销一步', '拖滑杆后 Ctrl+Z，整次拖动一步退回；没有变化不记撤销', '主屏检查器；全表「滑杆」'],
    ['撤销反馈', '撤销、重做后在操作处显示「撤销：缩放 1.30 → 1.10」并短暂高亮', '主屏参数、时间轴、结构'],
    ['未保存与保存', '状态栏右侧「未保存 N 项」可展开，逐项恢复；Ctrl+S 后显示「已保存 时间」', '主屏状态栏'],
    ['播放与逐帧', '空格播放，R 重播；, . 逐帧，← → 逐帧，Shift 走 10 帧；胶片条帧号同步', '主屏'],
    ['时间、导出范围输入', '单击当前时间或「导出范围」行名格里的「0.35–2.85 s」输入秒数，回车生效，Esc 取消，越界就地报错；Tab 从入点跳到出点', '主屏播放条、时间轴'],
    ['[ ] 设入点、出点', '导出范围行名格里三个图标命令：设为入点、设为出点、恢复；也在「选项 ▾」、刻度尺右键菜单和快捷键 [ ] 里；发射时段在「选项 ▾」里', '主屏时间轴'],
    ['胶片悬停放大', '悬停胶片格放大显示这几帧；胶片按最亮帧自动提亮', '主屏时间轴'],
    ['F 精简布局、L / P 左右栏', '或点工具行中段右侧图标', '主屏'],
    ['结构树方向键', '↑ ↓ 选择，← → 收起展开或到上下级，Enter 展开，F2 改名，Delete 删除', '主屏结构树；全表 37 行结构树'],
    ['只看可叠加', '单击「只看」加入或移出；Alt+单击只看此项；S 同单击；Esc 全部退出', '主屏结构树与画面'],
    ['显示与隐藏', '行上的眼睛或 H；编辑隐藏的层时检查器顶部提示', '主屏结构树、检查器'],
    ['删除与撤销', '⋯ 菜单或 Delete 直接删除，提示条 12 秒可撤销；Ctrl+Z 同样撤销，提示条一起收起', '主屏结构树、时间轴'],
    ['不能撤销才确认', '效果行 ⋯ →「删除效果…」', '主屏结构树；全表「确认弹窗」'],
    ['加层、加发射器', '结构树底部两个按钮；加层为菜单', '主屏结构树'],
    ['结构树筛选', '总行数超过 12 行时树底部出现筛选框，时间轴随之筛选', '仙女棒'],
    ['切换效果', '有未保存时切换，先选「保存 / 不保存 / 取消」', '主屏效果库'],
    ['选中联动', '结构树、时间轴行、路径、交付表行四处同步', '主屏'],
    ['分隔条', '左栏分隔条与画面、时间轴之间的分隔条可拖，双击复位', '主屏'],
    ['效果库', '效果 / 模板，二级标签，筛选块，搜索名称、任务号、花型', '主屏左栏'],
    ['档位切换', '分段选择或下拉', '全表「档位切换」'],
    ['拖播放头、拖时段、拖导出范围', '在胶片刻度条上拖播放头；拖时段条平移，发射器可拖两端；拖刻度尺上浅底的两端改导出范围，右键设入点、出点；拖动中 Esc 取消', '主屏时间轴；全表时间轴'],
    ['参数搜索、仅已改', '检查器搜索框；「筛选 ▾」勾「仅已改」，收起的已改项连同开关一起列出；「全部折叠」', '主屏检查器'],
    ['锁定、随机、依赖参数', '悬停参数行出现锁；点数值格右边的展开箭头，下一行出随机幅度或分布滑杆；关「爆后扰动」收成「4 项已隐藏」，点「查看」', '主屏检查器；全表参数行'],
    ['曲线编辑', '横轴寿命 0–100 %，纵轴倍数；拖关键点，双击加点，Delete 删点，下方可输入', '仙女棒 08；全表「曲线编辑」'],
    ['导出', '导出按钮导出需重新导出的层；悬停左侧的「⚠ 1」看原因；菜单三段：摘要、操作、选项', '工具行、贴图与交付'],
    ['距离、预览曝光', '画面右下常驻，拖动或单击输入；背景、安全框在「预览设置」里', '画面右下、工具行中段'],
    ['层的输出', '层参数末尾的「输出」模块；点层行的需重新导出标记跳到这里', '主屏结构树、检查器']
  ];
  return `<h2>交互</h2><p class="lead">清单第 5 节。每项交互的试用位置。</p><table class="ks-it"><thead><tr><th style="width:260px">交互</th><th>怎么操作</th><th style="width:520px">位置</th></tr></thead><tbody>${I.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function buildSheet() {
  ctxOf('sheet|prm', SHEET_MODS.prm); PS['sheet|prm|参数行|初速'].sub = true;
  PS['sheet|prm|参数行|时间倍率'].v = 1.8; PS['sheet|prm|参数行|扰动尺度'].v = 10; ctxOf('sheet|mod', SHEET_MODS.mod); PS['sheet|mod|时间与缩放|开始时间'].v = .45;
  $('#sheetBody').innerHTML = `<h1>组件全表</h1><p class="lead">E 样板 v3，按《E 设计规范 v3》整体重画。烘焙器、编排工作台、导入器共用同一份样式和图标；主屏只用本表里的组件拼成。</p>`
    + sheetTokens() + sheetIcons() + sheetBasic() + sheetCombo() + sheetOverlays() + sheetInteract();
  $$('#kitSheet [data-ind]').forEach(c => { c.indeterminate = true; });
  renderTree(SC.tpl5, $('#sheetTree'));
  SC.kiku2.t = 2.0; renderTL(SC.kiku2, $('#sheetTL'));
  $$('#kitSheet .ks-panel').forEach(alignNums);   /* v3.3 第 1 条：全表里的参数面板也按小数点对齐 */
  markPrmStates();
  const tags = $('#prmTags'), p = $('[data-sheetp="prm"]');
  if (tags && p) {
    const top0 = p.getBoundingClientRect().top;
    tags.style.position = 'relative'; tags.style.height = p.offsetHeight + 'px';
    $$('.prm:not(.sub)', p).forEach(r => { const t = tagFor[r.dataset.lab]; if (!t) return; const s = document.createElement('span'); s.className = 'ks-cap'; s.textContent = t; s.style.cssText = `position:absolute;right:12px;top:${r.getBoundingClientRect().top - top0 + (r.offsetHeight - 16) / 2}px;margin:0;text-align:right;white-space:nowrap`; tags.appendChild(s); });
  }
}

/* 全表专用的点击与键盘 */
document.addEventListener('click', e => {
  if (!e.target.closest('#kitSheet')) return;
  const t = e.target;
  const fs = t.closest('[data-free] button'); if (fs) {
    const g = fs.parentElement;
    if (g.classList.contains('tabs')) $$('.tab', g).forEach(b => b.setAttribute('aria-selected', String(b === fs)));
    else $$('button', g).forEach(b => b.setAttribute('aria-pressed', String(b === fs)));
  }
  const pt = t.closest('#pts button'); if (pt) { pt.setAttribute('aria-pressed', String(pt.getAttribute('aria-pressed') !== 'true')); ptsCount(); }
  const row = t.closest('#sheetTree .trow[data-id]');
  if (row) {
    const sc = SC.tpl5, n = find(sc, row.dataset.id).n;
    if (t.closest('.eye')) n.show = !n.show;
    else if (t.closest('.solo')) { if (e.ctrlKey || e.metaKey) n.solo = !n.solo; else { const on = !(n.solo && soloList(sc).length === 1); const w = m => { m.solo = false; m.kids.forEach(w); }; w(sc.root); n.solo = on; } }
    else if (t.closest('.more')) { openMenu(t.closest('.more'), [{head: n.name}, {t: '上移'}, {t: '下移'}, {t: '改名', k: 'F2'}, '-', {t: '删除', k: 'Delete', act: () => toast(`已删除「${n.name}」`, {undo: () => {}, near: $('#kitSheet')})}]); return; }
    else if (t.closest('.chev') && n.kids.length) n.open = !n.open;
    else sc.sel = n.id;
    renderTree(sc, $('#sheetTree'), true); return;
  }
  const pg = t.closest('.pg-n'); if (pg) { $$('.pg-n').forEach(x => x.classList.toggle('is-sel', x === pg)); return; }
  const dtr = t.closest('#kitSheet .dtable tbody tr'); if (dtr) { $$('tr', dtr.parentElement).forEach(x => x.classList.toggle('is-sel', x === dtr)); return; }
  const d = t.closest('[data-demo]'); if (!d) return;
  const A = {
    toast: () => toast(d.dataset.msg || '已删除「点灭星」', d.dataset.msg ? {near: $('#kitSheet')} : {undo: () => toast('已撤销删除「点灭星」', {near: $('#kitSheet'), ms: 3000}), near: $('#kitSheet')}),
    confirm: () => openDialog({title: '删除效果「金曜菊-B 稀簇辉闪」', body: '效果文件、版本记录和导出记录将一并删除。此操作不能撤销。', ok: '删除', danger: true, onOk: () => toast('样板中不删除效果', {near: $('#kitSheet')})}, $('#kitSheet')),
    press: () => d.setAttribute('aria-pressed', String(d.getAttribute('aria-pressed') !== 'true')),
    expMenu: () => openMenu(d, [{head: '1 层需重新导出'}, {t: '重新导出', k: '1'}, {t: '导出全部', k: '3'}, {t: '导出本层（金锦层）', k: '1'}, {t: '导出勾选', k: '1'}], {align: 'right'}),
    layerMenu: () => openMenu(d, [{head: '2 金锦层'}, {t: '上移'}, {t: '下移'}, {t: '改名', k: 'F2'}, {t: '复制'}, {t: '加发射器'}, {t: '隐藏', k: 'H'}, {t: '加入只看', k: 'S'}, '-', {t: '删除', k: 'Delete', act: () => A.toast()}]),
    addMenu: () => openMenu(d, [{t: '空白层'}, {t: '从模板…'}, {t: '复制本层'}]),
    viewMenu: () => { let on = true; openMenu(d, [{t: '仅已改', chk: on, keep: true, act: b => { on = !on; b.setAttribute('aria-checked', on); $('.ck', b).innerHTML = on ? ico('check') : ''; }}, '-', {t: '全部展开'}, {t: '全部折叠'}], {checks: true}); },
    keys: () => openKeys($('#kitSheet')),
    async: () => { const ok = !d.dataset.n; d.classList.add('is-loading'); d.innerHTML = '<span class="spin"></span>生成中'; setTimeout(() => { d.classList.remove('is-loading'); if (ok) { d.dataset.n = 1; d.classList.add('is-failed'); d.innerHTML = `${ico('alert')}重试`; d.dataset.tip = '生成失败'; } else { delete d.dataset.n; d.classList.remove('is-failed'); d.innerHTML = `${ico('camera')}缩略图`; toast('缩略图已更新', {near: $('#kitSheet')}); } }, 900); },
    file: () => { const f = d.parentElement, inp = $('input[type=file]', f); inp.onchange = () => { const n = inp.files[0]; $('.fn', f).textContent = n ? n.name : '未选择'; $('.fn', f).classList.toggle('none', !n); }; inp.click(); },
    ptsAll: () => { $$('#pts button:not(:disabled)').forEach(b => b.setAttribute('aria-pressed', 'true')); ptsCount(); },
    ptsNone: () => { $$('#pts button').forEach(b => b.setAttribute('aria-pressed', 'false')); ptsCount(); }
  };
  if (A[d.dataset.demo]) A[d.dataset.demo]();
});
function ptsCount() { $('#ptsN').textContent = `已选 ${$$('#pts button[aria-pressed="true"]').length} 个`; }
document.addEventListener('input', e => {
  const t = e.target;
  if (t.matches('[data-validate]')) { const f = t.closest('.field'), ok = !!t.value.trim(); f.classList.toggle('is-error', !ok); let m = f.nextElementSibling; if (!ok && !m) { f.insertAdjacentHTML('afterend', err('名称不能为空')); } else if (ok && m) m.remove(); }
  if (t.matches('[data-suggest]')) {
    const q = t.value.trim(), all = ['R03 金裂星 90m', 'R03 小银菊 90m', 'R03 千轮 120m', '尾缀 RT6', '金曜菊-B 稀簇辉闪', '仙女棒 快慢火星与轻气流'];
    const hits = all.filter(x => q && x.includes(q));
    if (!hits.length) { closeMenu(); return; }
    openMenu(t.closest('.field'), hits.map(h => ({html: esc(h).replace(esc(q), `<b>${esc(q)}</b>`), act: () => { t.value = h; t.closest('.field').classList.add('has-val'); }})), {cls: 'suggest', noFocus: true});
  }
});
document.addEventListener('keydown', e => {
  const t = e.target;
  if (t.matches && t.matches('[data-suggest]') && OV.menu && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); const f = $('.mi', OV.menu); if (f) f.focus(); return; }
  if (UI.view !== 'sheet' || !t.classList || !t.classList.contains('trow') || !t.closest('#sheetTree')) return;
  const sc = SC.tpl5, rows = $$('#sheetTree .trow[data-id]'), i = rows.indexOf(t), f = find(sc, t.dataset.id), n = f.n;
  const go = r => { if (r) { e.preventDefault(); sc.sel = r.dataset.id; renderTree(sc, $('#sheetTree'), true); $('#sheetTree .trow.is-sel').scrollIntoView({block: 'nearest'}); } };
  if (e.key === 'ArrowDown') go(rows[i + 1]);
  if (e.key === 'ArrowUp') go(rows[i - 1]);
  if (e.key === 'ArrowRight') { e.preventDefault(); if (n.kids.length && !n.open) n.open = true; else if (n.kids.length) sc.sel = n.kids[0].id; renderTree(sc, $('#sheetTree'), true); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); if (n.open && n.kids.length) n.open = false; else if (f.parent) sc.sel = f.parent.id; renderTree(sc, $('#sheetTree'), true); }
});

/* ---------- 启动 ---------- */
document.title = 'E 样板 v3';
renderAll(true);

})();
