// 由 analysis/scripts/review_to_baker.py 生成：迭代区（做完、等你看的东西）。不要手改。
var FW_REVIEW = [
{
"id": "YD3",
"task": "YD3",
"kind": "preset",
"date": "2026-09-30 08:46",
"name": "球形D · ③ 芯（橙金光点）",
"note": "原理解析（数值未拟合）：橙金光点，无尾，外层半径的 0.55，+1.5 开始变暗、+1.8 前后没了。（阻力下半径和初速不成正比：初速取外层的 0.35 倍，半径才是 0.55 倍）",
"look": [
"橙色芯在绿色外层里面",
"+1.8 前后消失"
],
"opinion": "之前 QD1–QD3 漏了这一层。",
"tags": "球形D 原理 芯 YD3",
"doc": [
[
"结构（三层）",
[
"外层尾巴（YD1）：金色木炭长尾 0–1.0 s",
"外层星头（YD2）：和 YD1 同一个模拟；金 → 柠黄（+0.9）→ 绿（+1.3）→ 银白（+2.6）；+3.0 起银色细短尾（新参数「火花从第几秒开始」）+ 横风 → 一根根短线",
"芯（YD3）：橙金光点，外层半径 0.55，+1.8 前后暗掉",
"全文：analysis/原理/球形D.md"
]
],
[
"请你核对",
[
"1. 橙色的芯 + 外层四段变色——对吗？",
"2. +0.9 s 星头柠黄、尾巴金（头尾异色）——对吗？",
"3. 末段短线是银色细火花短尾（做）还是相机拖影（不做）？",
"4. 通过后三层下拟合任务"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/球形D/云端起点对照.jpg",
"各层叠起来 vs 实拍（未拟合）"
],
[
"../analysis/原理/球形D/t4.60.jpg",
"+0.10 开花"
],
[
"../analysis/原理/球形D/t4.80.jpg",
"+0.30 金色放射尾，里面橙色芯"
],
[
"../analysis/原理/球形D/t5.20.jpg",
"+0.70 金色长尾菊"
],
[
"../analysis/原理/球形D/t5.40.jpg",
"+0.90 星头柠黄、尾巴金；芯橙"
],
[
"../analysis/原理/球形D/t5.80.jpg",
"+1.30 外层绿光点；芯橙金"
],
[
"../analysis/原理/球形D/t6.40.jpg",
"+1.90 芯已灭，外层绿"
],
[
"../analysis/原理/球形D/t7.20.jpg",
"+2.70 银白小光点"
],
[
"../analysis/原理/球形D/t8.00.jpg",
"+3.50 银色细短线"
],
[
"../analysis/原理/球形D/t9.50.jpg",
"+5.00 熄灭中"
]
],
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
"duration": 6.2,
"seed": 7,
"stars": 250,
"burstR0": 0,
"v0": 60.4,
"vt": 21.599999999999998,
"grav": 1.5625,
"speedJit": 3,
"dirJit": 1.5,
"burn": 1.8,
"burnJit": 6,
"fade": 0.15,
"lastFlare": 0.3,
"flash": 1,
"headSize": 0.6,
"headBright": 0.30106822770542724,
"flicker": 0.2,
"sparkRate": 0,
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
"#ffa030"
]
],
"xw": 0.25,
"ramp0": "#000000",
"ramp1": "#4a4a52",
"ramp2": "#c8c8d0",
"ramp3": "#ffffff",
"headInt": 2.0,
"tailInt": 1
},
"principle": true,
"thumbRef": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCACgAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDzBot69SKiiiZmxmpjJuTGOneoxuYccVKN2kStGUHAqMDnOKeOmDJSZycZoGxys2eOlSbQ3cZpqHC4NP8AkxlTUspDNpGKlUZ4oVgeCM07BJ44pNjSJI2KDgcVNHcYbJGKiCELyTik2nqBUNJlptGgtypWlMwxVJN3pUgbnDdKycDVTJWcnp0pnPWgFR0OaRm4NCQmxwOajlUUzeQeM0pOetXYVyCRKiK1ZyDUL4zmrRnJDAAKbxnpTu1NLdhVEEG8v6AVLEV5BOahjjLZ5FPjjXd3Bq2QrhKuGyo+WnqpxkHmpQERlVxkmo5j5bfIMCpuXa2ozDY5zj3qRBwMc0wN5hyxpQ5osJE6kd8CpUZc+tVkI64q1ECei8VEjSJNkEY2mk2N2I5qdIw4AHBp4hxwx4rJysaKNyFQ654zTZBvxkY9ateUVHfae9NZfbilzIfKypjb2zTGbLcCrmzcp45FQqmJFG3dz0FVcViuxYttUZNIVcDLcVtz28SjdGu3I7is69QvHwvTvUxqqRUqbSuUS47U0tmlIULxye9RuQBW6OdsceR7VFnHAHPrTlOetNk4qkSyJSQ2RUucryBn1qIHceOKUgA85PtVMhEjTKv3eW7Go8s5yeafsXg7do96kWJM9c/Sloi7NkaoTTxHk+tT7ABkAkUqKzsAqEsegAyTSchqNghj6DPBrZ0jRri+k2xFRjBO44O09x69P5VZ0PSS0S3N3ZSSxPIYhwRtbGefYgnnscH67sq2unSQ+Vv8sJmFg2SFPJXPcdx6GvOr4q3uQ3OmFPqVLDQ8FmkAOxpYpMnH8J2OPx4qZLFDpcRSJGZrKQvg5JYuNv49qtebJBqaW5ZJkuUJV1HDb06j6ECmW2Y5lt3Ko0cIU7Rn51fccfXH61xOdRq7fmb8qIriziGmrHEGLxIkUYPOZHYs34gDFIumQ3NtaLJkeRbjzNnUu5LAe5AB/SmwSBtPuLgyFZIZA6jH32cbR+Qyack7xaQsqH50k+U5x87jGffChfpzVXmtns/0FYy59KdoriaIhY7WNTMznA3nGUHqef0rIZ2hYODgg9cZrp7udYtIttNjYGSXLygHoCeM+5PP0wKh1TTInmstKstjSQRF7qcno7HJB+nAx/8AXraliHtP+kurIcOxU8yKSFWZxzzmoLiOJoCVdcHoar3KbD5SYfbx8vepJLDZCqyAscdB2rW0VZ3L5nJWsYsqBHMasGOeo71XmRgTk5q9cWr23zKNw9cdKp7XkZiW5rtg7rQ45qz1IwD1JApGc9sUrFdvv6UzCt7GtUZMRQFbkYqVVEhwWx6U6NGx85BpWTC4XNDYJEewh9rA/nUoUqQRwPYU6ML0YZIqUkjHIAqWy0h8RaRArHHp71u6BYW5kiumu1jlifce4T0DdCuezDj3BrKsIEkm3eXNMigl0iOGx69D0NdN9qtIoLcXFgtxFGu2OeOTBwR90sCfyz+ArixM5KPLHqdEI33L91KsUssUNyELrho24DEcrgjoR2Pb6E4z3kF1pQZ2BkjmbKZ+7nkgDtk5OOmckdxUCS2iRzQkPJbuQYWcDdF7f/XHHt3q9o9t51rM5SF0R1OB95jkce4PcfiK4VFUots3SuyaCBrqC1uLNdzRKNyjqrKeQB37H8TV77NDBdufN80ghw6jgDODxnPTFMjuRMBbRQbGxmIocDHKgk9vSmCU4ijRthT7xLgNHyRjPoQRke1c8pTfkaqAz7DBbxvbM0mJEMhBG1WZFO0A+hJz+lVb+BktoooXEscLMyEDG5u7Y+mBV13GUafnEZ+UZ/Dn3NNZPOEoyfMdjvdWxGoJz+VCnNWb1KUEcpb+ab1WjBaVm+vNdFbTxW4aSZXwnLMo+eVz6noo9+3Pc8Ols7W2gM1qWaQ8kthcLkgHHXnHaoGeW2CLdW4Xeu5RMuQqnjO31PqefTFdEpKsrL/gmbVkVrk2s/Pkl7uQ5SO2U7Y1ByfqfU/yqpe6pCsyBIy2evbFbH2z7VHGEtrm4t0G0RAeXE5H94jsPTJ/CsbU7e5a6Fzfptz8qYAC4HQDHGAK0o2b5ZfmZ8zjsM1JGaBvLVeRzn0rm5Qd2F6VsS6kyblABXpyKz7p+SyoMv29K76KcdGYVmpaopMo+9kCm8Hp1p4KciTIprBY+RyD0rqRzMYpkz90n8KtqWEQJGM1C7ndwv60+NpM8LnPqaTBEkbcbSoPvmpkxkjGabGkm7lVAPerCxL35PtWcmjWKZqeH52s2ebySExxIbXzBn0zkY/A1q3l2AM+UYrgHIbyNvOeoJww/UVX0J7qKELDcWoXcf3EkjK549V7fjVsT3MTFXQKsp58y5Yp9eTXBVtz3OmmrqxFa/a5buGWeBC0hwH2BBJnjnjafritGJnTZEkYSNlKBHGFyTnIx3yOPoO1VrdLwyxJK8sdoxyGGZIwPbPFXJBLiP7Sk8dsrYEjEs3fp3wDXFW1kkzohZIQO0hmhmx5okZvnjBOcd2HP44xxmhZI1hkQxqSzZVt2fLGf1/rx0qdLS5khWVzIJCw42jOB355z7ZqpK8koPmK4LFtj42555BA4PTpURcZaI0tYlKAI0kqswUgE52gjjjHXPP60kxld4LaS32uoPHTIPqPXvUMkBaXDk5yNhUYLgnrj8uOOlaPkzGxaSOaRWY7gEwvTI6jnoenvRNxjZsWrEhFru2wSytG45baN2QOdoxjPT09qyFBWYTXUgZnY4jK+ZIT67c/zrTSGOBpBNEsYABZ2dVZRgYwhOc5/P2qpqdyt9cqq3scihQA0hWP64GcU6d+exEnoQNcas84SAJEQcxCULlevOOefwqrrGn661ubrUhKYlJIeWQAH1IUkH8hU8KQCNRb6yLZs/MsjMmT/wABFVL/AExUG+XXdPlY8hUeR25/4D/WuyEUpqyS+RzyehzrKM4J4PIqNogzkg9B+dOumIfZggdxTCxKhlG0Hg9816Cuc7sVHU7iG5qKRlI+UED0qZm2t8vT1NQtyfmGQa2RiyaNkVsqu4j0HFTEMSSWwPSoU2IpDZLHnAqxA5YBmXC+lSyoj41LKV5Pp2q1ApGN7KnsKrJvVuWC+iqOTU8SgknPuTWcjWJvaeyTw+RcXWoFEHyR28Zdcd88jFWmSF3EEd5iNVzgxquPx4/nWRpc9vvK3Ku8R54J6+u0EZ/E1sPdWhtWWw09twJ3XDkH8gBgVwVbqR0Q2GW8ZExMKvO0RBEgkIVB/L9a05UcL5WwIQPMkSNQzAFuCKyrlGlRMyJg4wkMe1Qfr1Y/5zWnbP8AZYJLS9ZVPBO0fOPUZ/HOOa5qvdbm0WT+YY1dd8LSL9+RXLZ49e5+neopCpuI183YdoDFvmC8f5+lEbTRR3CL5YUt+8Ljjb0Xgevt61GxyqAAGWRtm1gT8uBggn/PIrKKinoaNskypZyoZjgqBkZA9ee2PpViG53RhZriRZI/kP8AsKO4zjP0PNQzK0d7HbofL+YxFlOT3BPrjB57VJHN5rg+X+885UWTaNpA9evJIB/PtTcYtBdkiROrSxWsltPtU4UruJBHJB4Iz+n4Vkahc20sksn2MxnIBeCXGfqpyO3tWmZvsTiPzSv7sqUliDGM5PLHuDk8jt2qhA8spDGPz4Q/DW5Akj9tp6jHY8e9VSTT5n/kZyKQtdJc+bNd3cZx3gVv5NVLUrfSo0L2mqyzsBlUa1Kgn+7u3cflV24vbITjzbITE5DxlfJZf9oMpwfxWsrWzppMZ037SM58yO4wdv0Yda7aTk5Lc5pmVcFnIGOT1qvIzxjbj73c9hU7j5iAcgd8VFKWkPOCO5rvRzyIXOE3ZyT1FQPIxXAGBUsmMNkAdhUDMMYHatUZSZYtxlt5Ax7+tSLMxcqvze9VY24xnr1qaNhvwoAXvSaHFlzazqu1sYHJHerMGwHg7jj5j6CqLScbCcL7VZQ7IuSFBH3R3+tYyRtF6lyKTMirCoYA5yeh9seldXZTzXdmI38kt91FUfd567eg61yFu2UUL8oY8e9aNvciF1AJLDgAk4Pscdq48TS542W50QZr3KyQusvnmR4/lEgOVU+i+uO5HFNaL7LcItw25lIaQKQffH+NTwqt3dW9tZ3HmSE7nldflGOThegHHT2yfZkQWW5jFpH5zPLw8vRu+T7Y+Y/hXGpNaM2uidLq4m88zZDsQ/mMemMgKB9WAqzte5u/LWfzTB83mt/HkjjHb6exrOt2e6vjK0iu8G3amOOMnJH4E/U060Zri5YwExldpU56YIHX16mp9mlrtYfMXBJHEsVy89sZtzMwJLZx90dPfH4UyW6tnlgWyhYTFcfMxGHORgdPXGfpVOKOCaCOV+UQRiY/3dxIJodftjK6sgkl+8VOApHGf0zR7NX1DmuIZrje08wLufnEuOV5xkjuM5DD+VPmtoLv95bhrW+i/eeUMhSOpKnt6j2+lOilukuI7hZFG+dgdwG0Snhlb2bH0PWpBJIsYguYQk8UpMDQg7ox/dGfQ8gdOo9Ktt8y5f6+RO5UutVgmRrTxBblpGAP2mBR5iH+9g8HjHTGa5ab55SxYuoPy5HLe+K1tTu0vJ0f7Okcmza4jb5SfUL/AA5z0HFZM24ZEY4PU+td9CPKtrXOeZBOGXjOc9arvnYAB054NSSu6Ny34AZqCXL89T7nFdkTnkQyfdyAahJPpxUxAXsM1C2PTFaIxkJnFSI+0cVFSiqJuWoDufLYOPWpzMrEMeQvH1qkp4wO9TRkKRnnFQ4msZGmkmxAcDLevap4jkZCFnPRiv6VmCdicgcmrEcsjYAYADj6VhKBvGZ0Frc+Q5GA4dNjjI+Ze4z798dsitLTJ5p7iabzVxCmxVXA3u5wAfbPJ9lxXLO5VshwBjrUsLZiO5iFPU5xxXLUoKS1NVUOt01oQl7LbuW+zwSNkoRu5Cjn36/8C9qdZRRWwZpQ2FR+VwQCAuf5NXP2dw6RSRwyOElG2RQcBh6Ed6sx6jJ5Bt1VcD+L0B3Ag+ud36VzSoSu7Pc0UrmrbxqlvEQQ0ckCtOg7gP0/I5qG2xDHK00RcIASqY+4Qeg9e/4Gqcd+0do8P3ieN2cbV4wP0quLycCRvM+R0CAf7PJwPzP5mhUpXZSkkjT822K3cazuIGK5APDZ5GAe4I/JvasvVbx7lNijcFOck8mqzMrkA4GRwM/yqs7hSoYYyMHnHFbwopMhzsrEcjODkAKPpmq0pmLZ8wfgMVK7bHIdiQehz1qu8ectFLx6EdK64owkxkjy4AZt5HT5hkVXk3EfMD+VOkL/AMQXPqKiLY/wraKMZMjdie+cfnULGpHbJ55qNq1Ri3qJmlptLTIHg1IGxjuahBp2allKRbQ4GW59FHepo5DkEkDnAC1SR8DrzU6DaQzHLdhUNGsZF9ZSX2RqCe7HtTiylvvZGcbj3+lVInLMcnPt0z7URMXlwp/3n7AegrNxNFI1YX4LZ2oOvrUqSjYCBhOv1rNkk3ARR5Cq2XNSTTkDaP4mwBWbiaKVi60qkH3Jz7mlnmxEoOM4wcdjiqUco+R+SEDEe/NRvNlV3HIPU+ueKnk1K5ieWQEKr5+UD5vQnrVdZXjYI+MEnGemc/1FNmc/OD1wCfftUMjnIzwrDr/dP+FaKJm5EodR8jfKPQ8j8KgfzI2yBkHt/h6012JXAGGXtTBKQB3Xuvp7itFEhyFaUSDB6+tQvnGM5FEhy2Sevf1phJ6VokZOQ1qaaXNNNWZtjaKQGloEOBpQaZSg0ASA81LuzzUANOU80mikyzuOzC/eanh/KUkf/rNQRscn1NDnzCAO1RY0uWrYnyufXdmleTLK2cAZx+VQK+MIOh4q5CkQhCytnqKiWmpcdRsbkwuPUcD0qN2BjC++Pw606X90PlOVPSqobtnvQlfUbdidpCyZI+bGKjZty7c98g1GXJjBzyDSO/II4zzVJEOQ4MSCOjCmbt4P96kc4fNRk85q0iGxxbimE0E96bVEXFzSE0lBoJZ//9k="
},
{
"id": "YD2",
"task": "YD2",
"kind": "preset",
"date": "2026-09-30 08:45",
"name": "球形D · ② 外层星头（金 → 柠黄 → 绿 → 银白 + 末段短尾）",
"note": "原理解析（数值未拟合）：只画星头；金 → 柠黄 → 绿 → 银白；+3.0 s 起出银色细短尾（新参数 sparkStart）+ 横风 → 偏左下的短线；+4.3 起变暗。",
"look": [
"颜色四段",
"后半段是一根根短线，不是圆点"
],
"opinion": "QD3 这段是圆点；这次用「火花从第几秒开始」做末段短尾。",
"tags": "球形D 原理 星头 变色 短尾 YD2",
"doc": [
[
"结构（三层）",
[
"外层尾巴（YD1）：金色木炭长尾 0–1.0 s",
"外层星头（YD2）：和 YD1 同一个模拟；金 → 柠黄（+0.9）→ 绿（+1.3）→ 银白（+2.6）；+3.0 起银色细短尾（新参数「火花从第几秒开始」）+ 横风 → 一根根短线",
"芯（YD3）：橙金光点，外层半径 0.55，+1.8 前后暗掉",
"全文：analysis/原理/球形D.md"
]
],
[
"请你核对",
[
"1. 橙色的芯 + 外层四段变色——对吗？",
"2. +0.9 s 星头柠黄、尾巴金（头尾异色）——对吗？",
"3. 末段短线是银色细火花短尾（做）还是相机拖影（不做）？",
"4. 通过后三层下拟合任务"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/球形D/云端起点对照.jpg",
"各层叠起来 vs 实拍（未拟合）"
],
[
"../analysis/原理/球形D/t4.60.jpg",
"+0.10 开花"
],
[
"../analysis/原理/球形D/t4.80.jpg",
"+0.30 金色放射尾，里面橙色芯"
],
[
"../analysis/原理/球形D/t5.20.jpg",
"+0.70 金色长尾菊"
],
[
"../analysis/原理/球形D/t5.40.jpg",
"+0.90 星头柠黄、尾巴金；芯橙"
],
[
"../analysis/原理/球形D/t5.80.jpg",
"+1.30 外层绿光点；芯橙金"
],
[
"../analysis/原理/球形D/t6.40.jpg",
"+1.90 芯已灭，外层绿"
],
[
"../analysis/原理/球形D/t7.20.jpg",
"+2.70 银白小光点"
],
[
"../analysis/原理/球形D/t8.00.jpg",
"+3.50 银色细短线"
],
[
"../analysis/原理/球形D/t9.50.jpg",
"+5.00 熄灭中"
]
],
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
"duration": 6.2,
"seed": 7,
"stars": 385,
"burstR0": 0,
"v0": 172.50000000000003,
"vt": 21.599999999999998,
"grav": 1.5625,
"speedJit": 3,
"dirJit": 1.5,
"burn": 5.0,
"burnJit": 5,
"fade": 0.25,
"lastFlare": 0.3,
"flash": 1,
"headSize": 0.5,
"headBright": 0.30106822770542724,
"flicker": 0.2,
"sparkRate": 300,
"sparkRateEnd": 1.2999999999999998,
"sparkLife": 0.2,
"sparkSize": 0.35,
"sparkSpread": 0.4,
"sparkInherit": 0.1,
"sparkDrag": 2.2,
"sparkGrav": 1,
"T0": 2050,
"cooling": 0.42,
"sparkBright": 0.8,
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
"wind": -2,
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
"autoGrid": 1,
"sparkStart": 3.0,
"sparkStop": 0
},
"m": {
"stages": [
[
0,
"#ffc040"
],
[
0.9,
"#f1ff93"
],
[
1.1,
"#d8ffc0"
],
[
1.3,
"#8dff9a"
],
[
2.6,
"#fff0d8"
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
"principle": true,
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "YD1",
"task": "YD1",
"kind": "preset",
"date": "2026-09-30 08:44",
"name": "球形D · ① 外层尾巴（金色木炭尾）",
"note": "原理解析（数值取自 QD3，星数按分析 385）：只画金色火花尾，0–1.0 s。和 YD2 同种子同参数。 尾巴层的星在火花停了以后就熄灭（burn 略长于火花时间），免得看不见的星头在单独曝光时被放大成亮点。",
"look": [
"金色放射长尾，1 s 内收掉"
],
"opinion": "",
"tags": "球形D 原理 尾巴 YD1",
"doc": [
[
"结构（三层）",
[
"外层尾巴（YD1）：金色木炭长尾 0–1.0 s",
"外层星头（YD2）：和 YD1 同一个模拟；金 → 柠黄（+0.9）→ 绿（+1.3）→ 银白（+2.6）；+3.0 起银色细短尾（新参数「火花从第几秒开始」）+ 横风 → 一根根短线",
"芯（YD3）：橙金光点，外层半径 0.55，+1.8 前后暗掉",
"全文：analysis/原理/球形D.md"
]
],
[
"请你核对",
[
"1. 橙色的芯 + 外层四段变色——对吗？",
"2. +0.9 s 星头柠黄、尾巴金（头尾异色）——对吗？",
"3. 末段短线是银色细火花短尾（做）还是相机拖影（不做）？",
"4. 通过后三层下拟合任务"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/球形D/云端起点对照.jpg",
"各层叠起来 vs 实拍（未拟合）"
],
[
"../analysis/原理/球形D/t4.60.jpg",
"+0.10 开花"
],
[
"../analysis/原理/球形D/t4.80.jpg",
"+0.30 金色放射尾，里面橙色芯"
],
[
"../analysis/原理/球形D/t5.20.jpg",
"+0.70 金色长尾菊"
],
[
"../analysis/原理/球形D/t5.40.jpg",
"+0.90 星头柠黄、尾巴金；芯橙"
],
[
"../analysis/原理/球形D/t5.80.jpg",
"+1.30 外层绿光点；芯橙金"
],
[
"../analysis/原理/球形D/t6.40.jpg",
"+1.90 芯已灭，外层绿"
],
[
"../analysis/原理/球形D/t7.20.jpg",
"+2.70 银白小光点"
],
[
"../analysis/原理/球形D/t8.00.jpg",
"+3.50 银色细短线"
],
[
"../analysis/原理/球形D/t9.50.jpg",
"+5.00 熄灭中"
]
],
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
"duration": 6.2,
"seed": 7,
"stars": 385,
"burstR0": 0,
"v0": 172.50000000000003,
"vt": 21.599999999999998,
"grav": 1.5625,
"speedJit": 3,
"dirJit": 1.5,
"burn": 1.2,
"burnJit": 5,
"fade": 0.25,
"lastFlare": 0.3,
"flash": 1,
"headSize": 0.5,
"headBright": 0.02,
"flicker": 0.2,
"sparkRate": 260,
"sparkRateEnd": 1.2999999999999998,
"sparkLife": 0.3,
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
"wind": -2,
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
"autoGrid": 1,
"sparkStop": 0.9
},
"m": {
"stages": [
[
0,
"#ffb040"
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
"principle": true,
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "YC2",
"task": "YC2",
"kind": "preset",
"date": "2026-09-30 08:43",
"name": "球形C · ② 外层（延时点火，银白 → 金 → 橙）",
"note": "原理解析（数值取自 QC3）：延时 0.4 s 点火；银白短尾 → 金（+1.4）→ 橙（+2.3），火花到 +2.3 停；燃烧离散约 25%，+2.4 起陆续熄灭。",
"look": [
"开花后 0.4 s 才出现",
"银白 → 金 → 橙",
"一颗颗陆续熄灭"
],
"opinion": "QC3 缺开头的银白段、也没有延时点火。",
"tags": "球形C 原理 外层 延时点火 YC2",
"doc": [
[
"结构（两层）",
[
"芯（YC1）：牡丹，最终半径约为外层 0.45；开头 0.2 s 橙红短尾 → 过亮 → 青柠绿，+2.2 前后暗掉",
"外层（YC2）：牡丹，开花时是暗的，+0.4 s 才点亮（延时点火）；银白短尾 → 金（+1.1）→ 橙（+1.7）→ 无尾橙色光点，+2.4 起陆续熄灭",
"全文：analysis/原理/球形C.md"
]
],
[
"请你核对",
[
"1. 青柠绿的芯 + 外层（银白 → 金 → 橙）——对吗？",
"2. 外层 +0.4 s 才点亮——对吗？",
"3. 开头橙红短放射算芯的点火（做）还是开花药（不做）？",
"4. 通过后两层下拟合任务"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/球形C/云端起点对照.jpg",
"各层叠起来 vs 实拍（未拟合）"
],
[
"../analysis/原理/球形C/t0.83.jpg",
"+0.10 芯点火：橙红短放射"
],
[
"../analysis/原理/球形C/t0.90.jpg",
"+0.17 橙红放射，中心发白"
],
[
"../analysis/原理/球形C/t1.03.jpg",
"+0.30 芯全亮、发白，外层还看不到"
],
[
"../analysis/原理/球形C/t1.30.jpg",
"+0.57 外层点亮：银白短尾；芯绿"
],
[
"../analysis/原理/球形C/t1.70.jpg",
"+0.97 外层转暖；芯绿"
],
[
"../analysis/原理/球形C/t2.10.jpg",
"+1.37 外层金色短尾"
],
[
"../analysis/原理/球形C/t2.50.jpg",
"+1.77 外层橙，尾变短"
],
[
"../analysis/原理/球形C/t2.90.jpg",
"+2.17 芯没了，外层橙色光点"
],
[
"../analysis/原理/球形C/t3.60.jpg",
"+2.87 陆续熄灭"
],
[
"../analysis/原理/球形C/t4.60.jpg",
"+3.87 零星几颗"
]
],
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
"duration": 5.2,
"seed": 7,
"stars": 380,
"burstR0": 0,
"v0": 262.35093749999993,
"vt": 31.103999999999996,
"grav": 0.5120000000000001,
"speedJit": 3,
"dirJit": 1.5,
"burn": 3.3,
"burnJit": 25,
"fade": 0.1,
"lastFlare": 0,
"flash": 1,
"headSize": 0.6,
"headBright": 0.6,
"flicker": 0.2,
"sparkRate": 220,
"sparkRateEnd": 1,
"sparkLife": 0.3,
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
"ignDelay": 0.4,
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
"autoGrid": 1,
"sparkStop": 1.9
},
"m": {
"stages": [
[
0,
"#f0eaff"
],
[
1.4,
"#ffd070"
],
[
2.3,
"#ff9a30"
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
"principle": true,
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "YC1",
"task": "YC1",
"kind": "preset",
"date": "2026-09-30 08:42",
"name": "球形C · ① 芯（橙红点火 → 青柠绿）",
"note": "原理解析（数值未拟合）：芯，外层半径的 0.45；开头 0.25 s 橙红短尾，然后整团过亮，+0.4 起青柠绿，+1.8 开始变暗。",
"look": [
"开头的橙红短放射",
"青柠绿、慢慢变暗"
],
"opinion": "之前 QC1–QC3 完全没有这一层。",
"tags": "球形C 原理 芯 青柠 YC1",
"doc": [
[
"结构（两层）",
[
"芯（YC1）：牡丹，最终半径约为外层 0.45；开头 0.2 s 橙红短尾 → 过亮 → 青柠绿，+2.2 前后暗掉",
"外层（YC2）：牡丹，开花时是暗的，+0.4 s 才点亮（延时点火）；银白短尾 → 金（+1.1）→ 橙（+1.7）→ 无尾橙色光点，+2.4 起陆续熄灭",
"全文：analysis/原理/球形C.md"
]
],
[
"请你核对",
[
"1. 青柠绿的芯 + 外层（银白 → 金 → 橙）——对吗？",
"2. 外层 +0.4 s 才点亮——对吗？",
"3. 开头橙红短放射算芯的点火（做）还是开花药（不做）？",
"4. 通过后两层下拟合任务"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/球形C/云端起点对照.jpg",
"各层叠起来 vs 实拍（未拟合）"
],
[
"../analysis/原理/球形C/t0.83.jpg",
"+0.10 芯点火：橙红短放射"
],
[
"../analysis/原理/球形C/t0.90.jpg",
"+0.17 橙红放射，中心发白"
],
[
"../analysis/原理/球形C/t1.03.jpg",
"+0.30 芯全亮、发白，外层还看不到"
],
[
"../analysis/原理/球形C/t1.30.jpg",
"+0.57 外层点亮：银白短尾；芯绿"
],
[
"../analysis/原理/球形C/t1.70.jpg",
"+0.97 外层转暖；芯绿"
],
[
"../analysis/原理/球形C/t2.10.jpg",
"+1.37 外层金色短尾"
],
[
"../analysis/原理/球形C/t2.50.jpg",
"+1.77 外层橙，尾变短"
],
[
"../analysis/原理/球形C/t2.90.jpg",
"+2.17 芯没了，外层橙色光点"
],
[
"../analysis/原理/球形C/t3.60.jpg",
"+2.87 陆续熄灭"
],
[
"../analysis/原理/球形C/t4.60.jpg",
"+3.87 零星几颗"
]
],
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
"duration": 3.0,
"seed": 7,
"stars": 160,
"burstR0": 0,
"v0": 118.1,
"vt": 31.103999999999996,
"grav": 0.5120000000000001,
"speedJit": 3,
"dirJit": 1.5,
"burn": 2.0,
"burnJit": 8,
"fade": 0.4,
"lastFlare": 0,
"flash": 1.5,
"headSize": 0.6,
"headBright": 0.6,
"flicker": 0.2,
"sparkRate": 300,
"sparkRateEnd": 1,
"sparkLife": 0.2,
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
"zoom": "on",
"engine": "gpu",
"form": "master",
"segAt": 0,
"unitElev": 0,
"unitFlip": 0,
"cellPad": 2,
"autoGrid": 1,
"sparkStop": 0.25
},
"m": {
"stages": [
[
0,
"#ff5a30"
],
[
0.25,
"#fffbe8"
],
[
0.42,
"#b8ff50"
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
"principle": true,
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "YA2",
"task": "YA2",
"kind": "preset",
"date": "2026-09-30 08:41",
"name": "球形A · ② 星头层（金 → 粉 → 银白）",
"note": "原理解析（数值未拟合，取自 QA4）：只画星头（无尾），橙红 → 金白 → 粉红（+1.75）→ 银白（+2.35），约 +3.3 熄灭。",
"look": [
"颜色时间线",
"和 YA1 叠起来：粉红星头挂在金色尾巴尖上"
],
"opinion": "引擎里这一层可以换成单帧光点图（手游）或后段 GPU 粒子（PC），见审阅卡。",
"tags": "球形A 原理 星头 变色 YA2",
"doc": [
[
"结构（两层，同一个模拟）",
[
"模板：菊。三层变色星：金色木炭尾 → 粉红 → 银白",
"变粉时只有星头粉、尾巴还是金色 → 拆成尾巴层（YA1）和星头层（YA2），同种子同参数，星的位置完全重合",
"全文：analysis/原理/球形A.md"
]
],
[
"时间线（开花 = 视频 0.30 s）",
[
"+0.07–0.25 橙红短尾（点火药）",
"+0.3–1.6 金色长尾菊",
"+1.8–2.3 星头粉红、尾巴仍金",
"约 +2.2 停止出火花，+2.4 星头转银白",
"+2.5–3.3 银白光点无尾，轻微飘落，+3.3 前后熄灭"
]
],
[
"请你核对",
[
"1. 三层变色菊、变粉时头尾异色——对吗？",
"2. 开头 0.2 s 橙红短尾要保留吗？",
"3. 引擎做法：序列 + 单帧（手游）/ 粒子 + 序列（PC），倾向哪种？",
"4. 通过后两层一起下拟合任务"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/球形A/云端起点对照.jpg",
"各层叠起来 vs 实拍（未拟合）"
],
[
"../analysis/原理/球形A/t0.40.jpg",
"+0.10 橙红短尾"
],
[
"../analysis/原理/球形A/t0.60.jpg",
"+0.30 金色放射尾"
],
[
"../analysis/原理/球形A/t1.30.jpg",
"+1.00 金色长尾菊"
],
[
"../analysis/原理/球形A/t2.10.jpg",
"+1.80 星头粉、尾巴金"
],
[
"../analysis/原理/球形A/t2.30.jpg",
"+2.00 同上，尾变淡"
],
[
"../analysis/原理/球形A/t2.60.jpg",
"+2.30 星头转银白"
],
[
"../analysis/原理/球形A/t2.80.jpg",
"+2.50 银白光点无尾"
],
[
"../analysis/原理/球形A/t3.30.jpg",
"+3.00 变暗飘落"
],
[
"../analysis/原理/球形A/t3.70.jpg",
"+3.40 熄灭中"
]
],
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
"duration": 4.0,
"seed": 7,
"stars": 360,
"burstR0": 0,
"v0": 262.35093749999993,
"vt": 15.0,
"grav": 0.5120000000000001,
"speedJit": 3,
"dirJit": 1.5,
"burn": 3.3,
"burnJit": 3,
"fade": 0,
"lastFlare": 0,
"flash": 1,
"headSize": 0.6,
"headBright": 0.4725,
"flicker": 0.25,
"sparkRate": 0,
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
"zoom": "on",
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
"#ff7a40"
],
[
0.28,
"#fff0c8"
],
[
1.75,
"#ff5aa0"
],
[
2.35,
"#ffe8b8"
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
"principle": true,
"thumbRef": "data:image/jpeg;base64,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"
},
{
"id": "YA1",
"task": "YA1",
"kind": "preset",
"date": "2026-09-30 08:40",
"name": "球形A · ① 尾巴层（金色木炭尾）",
"note": "原理解析（数值未拟合，取自 QA4）：只画金色火花尾（星头亮度压到几乎为 0），火花 0–2.2 s。和 YA2 同种子同参数，组合起来尾巴正好连到星头。 尾巴层的星在火花停了以后就熄灭（burn 略长于火花时间），免得看不见的星头在单独曝光时被放大成亮点。",
"look": [
"单独看：一根根金色长尾，没有星头",
"「组合」页「球形A（尾巴 + 星头）」和 YA2 叠起来看"
],
"opinion": "之前 QA4 整颗变粉，是因为一个图层只有一条颜色曲线。拆成两层后，星头可以粉、尾巴保持金。",
"tags": "球形A 原理 菊 尾巴 YA1",
"doc": [
[
"结构（两层，同一个模拟）",
[
"模板：菊。三层变色星：金色木炭尾 → 粉红 → 银白",
"变粉时只有星头粉、尾巴还是金色 → 拆成尾巴层（YA1）和星头层（YA2），同种子同参数，星的位置完全重合",
"全文：analysis/原理/球形A.md"
]
],
[
"时间线（开花 = 视频 0.30 s）",
[
"+0.07–0.25 橙红短尾（点火药）",
"+0.3–1.6 金色长尾菊",
"+1.8–2.3 星头粉红、尾巴仍金",
"约 +2.2 停止出火花，+2.4 星头转银白",
"+2.5–3.3 银白光点无尾，轻微飘落，+3.3 前后熄灭"
]
],
[
"请你核对",
[
"1. 三层变色菊、变粉时头尾异色——对吗？",
"2. 开头 0.2 s 橙红短尾要保留吗？",
"3. 引擎做法：序列 + 单帧（手游）/ 粒子 + 序列（PC），倾向哪种？",
"4. 通过后两层一起下拟合任务"
]
]
],
"imagesTitle": null,
"images": [
[
"../analysis/原理/球形A/云端起点对照.jpg",
"各层叠起来 vs 实拍（未拟合）"
],
[
"../analysis/原理/球形A/t0.40.jpg",
"+0.10 橙红短尾"
],
[
"../analysis/原理/球形A/t0.60.jpg",
"+0.30 金色放射尾"
],
[
"../analysis/原理/球形A/t1.30.jpg",
"+1.00 金色长尾菊"
],
[
"../analysis/原理/球形A/t2.10.jpg",
"+1.80 星头粉、尾巴金"
],
[
"../analysis/原理/球形A/t2.30.jpg",
"+2.00 同上，尾变淡"
],
[
"../analysis/原理/球形A/t2.60.jpg",
"+2.30 星头转银白"
],
[
"../analysis/原理/球形A/t2.80.jpg",
"+2.50 银白光点无尾"
],
[
"../analysis/原理/球形A/t3.30.jpg",
"+3.00 变暗飘落"
],
[
"../analysis/原理/球形A/t3.70.jpg",
"+3.40 熄灭中"
]
],
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
"duration": 4.0,
"seed": 7,
"stars": 360,
"burstR0": 0,
"v0": 262.35093749999993,
"vt": 15.0,
"grav": 0.5120000000000001,
"speedJit": 3,
"dirJit": 1.5,
"burn": 2.4,
"burnJit": 3,
"fade": 0,
"lastFlare": 0,
"flash": 1,
"headSize": 0.6,
"headBright": 0.02,
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
"zoom": "on",
"engine": "gpu",
"form": "master",
"segAt": 0,
"unitElev": 0,
"unitFlip": 0,
"cellPad": 2,
"autoGrid": 1,
"sparkStop": 2.2
},
"m": {
"stages": [
[
0,
"#ff7a40"
],
[
0.28,
"#ffc860"
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
"principle": true,
"thumbRef": "data:image/jpeg;base64,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"
},
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
"thumbRef": "data:image/jpeg;base64,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"
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
"id": "QB3",
"task": "QB3",
"kind": "preset",
"date": "2026-09-30",
"name": "球形B · 第 2 发（大红牡丹 → 银绿，第 3 轮）",
"note": "合并 YB2（原理）和 QB2（旧结果），开头不再有银白短尾。　差距 0.1184 → 0.108。",
"look": [
"开花就是红色星点（没有银白短尾）",
"约 1.05 s 转银绿白",
"1.65 s 一起熄灭"
],
"opinion": "差距 0.118 → 0.108。按核对后的原理（开花就是红色无尾牡丹 → 约 1.05 s 转银绿白 → 1.65 s 一起熄灭）结构、大小、节奏都对上了。\n10% 实拍更大、里面有银白点，是第 1 发叠在里面（第 1 发在迭代区 YB1 / YB1F 另做）。\n请你审：通过就进正式库；我再按这一版的初速、亮度换算第 1 发的两层。",
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
"speedJit": 2,
"dirJit": 1.5,
"burn": 1.65,
"burnJit": 3,
"fade": 0.05,
"lastFlare": 0.1,
"flash": 1,
"headSize": 0.47337278106508873,
"headBright": 1,
"flicker": 0.2,
"sparkRate": 0,
"sparkRateEnd": 1,
"sparkStop": 0,
"sparkLife": 0.55,
"sparkSize": 0.35,
"sparkSpread": 2.5,
"sparkInherit": 0.2,
"sparkDrag": 2.2,
"sparkGrav": 1,
"T0": 2050,
"cooling": 0.42,
"sparkBright": 1,
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
"trPhys": 0,
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
"qSS": 2,
"qHz": 300,
"qMaxSub": 16,
"qKernel": 0,
"qCore": 0,
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
"#ff3c64"
],
[
1.05,
"#e2f7ea"
]
],
"xw": 0.12,
"ramp0": "#000000",
"ramp1": "#4a4a52",
"ramp2": "#c8c8d0",
"ramp3": "#ffffff",
"headInt": 1.0000000000000002,
"tailInt": 1
},
"thumbRef": "data:image/jpeg;base64,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",
"thumbSim": "data:image/jpeg;base64,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"
},
{
"id": "QN5",
"task": "QN5",
"kind": "preset",
"date": "2026-09-30",
"name": "青柠星（第 5 轮，按核对后的原理）",
"note": "YQ1 原理样机 + QN4 的实测速度，按你核对的结构拟合亮度、大小、星数。　差距 0.4437 → 0.3524。",
"look": [
"0–0.5 s：一根根橙色放射尾（不是一团橙色）",
"0.5 s 起星头变青柠、尾巴收掉",
"3.1 s 前后一起熄灭；外圈星更密"
],
"opinion": "差距 0.44 → 0.35，分层星结构对了（橙色带尾 0.5 s → 青柠无尾，3.4 s 熄灭，实拍 3.3）。\n还不像：① 青柠太饱和、太暗——实拍星芯过曝，看起来是亮的淡黄绿；② 开头 0.5 s 橙色还是成团，实拍是一根根分开的放射尾。\n已直接出下一轮 QN6：青柠改 #f2ffa0，火花减密、收窄、拉长。",
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
},
"base": "botan",
"p": {
"duration": 5.119999999999999,
"seed": 7,
"stars": 450.0,
"burstR0": 0,
"v0": 140,
"vt": 18.6,
"grav": 0.78125,
"speedJit": 1.5,
"dirJit": 1.5,
"burn": 3.1,
"burnJit": 5,
"fade": 0.03,
"lastFlare": 0,
"flash": 1.3,
"headSize": 0.8,
"headBright": 2.2222222222222223,
"flicker": 0.15,
"sparkRate": 192.3076923076923,
"sparkRateEnd": 1,
"sparkStop": 0.5,
"sparkLife": 0.5,
"sparkSize": 0.3,
"sparkSpread": 0.6,
"sparkInherit": 0.2,
"sparkDrag": 2.2,
"sparkGrav": 1,
"T0": 2150,
"cooling": 0.35,
"sparkBright": 0.46153846153846145,
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
"trPhys": 0,
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
"qSS": 2,
"qHz": 300,
"qMaxSub": 16,
"qKernel": 0,
"qCore": 0,
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
"#ff6414"
],
[
0.6,
"#e6ff00"
]
],
"xw": 0.15,
"ramp0": "#000000",
"ramp1": "#4a4a52",
"ramp2": "#c8c8d0",
"ramp3": "#ffffff",
"headInt": 0.2097152000000001,
"tailInt": 1
},
"thumbRef": "data:image/jpeg;base64,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",
"thumbSim": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5Ojf/2wBDAQoKCg0MDRoPDxo3JR8lNzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzf/wAARCACgAKADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDxeiiiqEFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFLRQAlFLRQAlLRRQAUUUUAFFLRQAlFFFABRRRQAmKKWigBKKWigBKKWigAooooAKKKWgBKMUtAoAKUClAqza2rTzRxgqgdsBnOFH1NS5JK7ArBaXbWvBpsUWw35kiDgsjYG11APQ+ucVYENkWNtDaM1wW4LS7l2465HpWLrroOxgbTTStdDGmmyJeRpCxmyTEyhiAPp7c1CujxS2wmjuRwzAgryQO4HXFCxEftaBYw8UYq7e2E9m4SdNpYBgeoI9jVQitoyUldAMxRS0VQCUUtJQIKKKKACilooAKKKBQAtKBQBVyytJLgkpGzKmC+3qATiplJRV2BPptgJj5shTYhG6Nn2FwfQmrkjt/Y3kAMFEnmqGdcBc447k1YmuLebbp91beT9nysZZip+jemazIo0+yyo8EhmLDY54VB3z+lcd3N3kMsTFxe2/mPEHBBMbj90np+BqG4uP3iGJgXfLSNGu0/N1X3H+NSSOJ8xX90Q0C7Y9qhgfbPpUf2gSXlsYlaMJsQbcbuO+frTS8gJZ7poAJ4FlWSQ/LJIuCFHAAI6+9KyT2oggmBhMrb2YtwQeO3IGKY6iJma7ieWLeyrmTBBByen+eabGEjBEixBbjhWckmEZ60WVv6/rQC0JESC7txDvmcMFjKE+UoOeCT+NZ1xpssVrHcZVlcZIXnbnpmrEEsrsZZR5q264U5Axk8E56jNXYJri3Q/b5y1t80WyNwxjJHUD8am8qfwgc0wptXtQs5LSRVkx86B157HpmqRFdsZKSuhCUlLRVAJRS0UAFFFFABSigUtACrW9pzm102TzF+WX5ggOTIB0zjoAeaw0GTXRXETW1jbvYS7lkhYSLt5AP3j644/CubENO0e40U7mTz0Et67/aSoZHGCGHQA46fWpB9tuLdELMFdXd3aThh7+nSotllbXIBcXcTRHJVSu1iO2fQ02JRHBF5haETMQZQ2QV9Nv1rOytoARC1YoYnaKZACC+CpI6n+VJu/tC4eS6nWORuh2YBPvjp9aIA0t8PsVsHPaIjdnA6/1pSb26lkt0iYyM+9o0QDke1V1AitY4HeVbiYxgISrAZBbsPxqwsBaNLy9fchB2oxILgcAA4/zioryG7V4UuV24UBc4HHvipfLETpFd3RNo5PMLbhx3xQ3fVP8AryArQIsu6MRkySECM78AHPerVnJDHsX7PILiNj+8RuD2AIPAGe9Nt542UWkkZliDllKr8/4fXihHjn85EZbQtkvlztYDouPrSld3TQEmq2qC1+0TO63DOQqM4fKg44PtjvWGRW4DaJaSvbo0khQIRLg8nqVA9KxWFaUG7NMGMpKU0ldAgooooAKBRQKYC0opKWkA+M4INdFPHIttA26C3lmjO4FsZRjxgdun61zimt+xa3fTMvbyMwcK0m3dn0UHPFcuIWzGim12qOTawKmYfLcEbgT3Iz0oEbJYNKRE3mNsAJ+dMc5A96sOoglvEjR7ecthIjySp6r/ACqKcyQ3UNxchbhWUPyCAw6Y/pUproBFJEINqx7zMoy7IwIwfTHtT0i3X4VVnjX7xAyXC4z7ZpUN1HdSpbo0DSqQY/8AZPOOe2Kjuo5I28zz1kBYoHV+TgfniqWrtcBsoeTyYYpmm3chOeGPb6+9OjDzJ9mdipjJ8tAmSXJAxUiyQxyw/ZCAzR7JTMMgMepFRtDFBOyvchsLuV4uQW9KL9AJoEMxhit4WguIyS824gYHUn0xSKftNu0O1TLACyui5Ljvn+eTTJJpLtXYMkUcYyIw2BzjOPXNSxW8D3Ci2YyB4iQjEqwbHTI61L01YF6O6vreKVmkiNuIwzBAFBLDgA461zTnmtue7kh0vY7RiSZVQqQS5UHg5PSsNjV4eNruwMbSUtJXSISiiimAUUUUALRSUopAOBrR0y9eB1j8uKSNnBKSDgn69utZtOU4qZxUlZgbkUF3YvNdtGEIB8ty+Of9n14NVLd5IozLKGaCTKNgjJ749qtQXkF5aJb3bpEYgoR9mdwzzk/jUlwYLqe4TdH5cXzo8UWFIAAwe4H9a402m1JDKs01vcOjuJE2whcgDlh602CGFLsb2823DYL7SAePzqXf9qimitbdYY9wkPzkhcDHU+tNmBt7QRosgkSbmRJMxkgcY9/eqWnuoCWKOOJDC8tq/mk535BjOOuf0x60ywjRXJEsDJ5e6QSr05+6Pfp09aYYlCs9ykrysPm7BS3Kkn35p15Awmt4EghVlUAsjhg5J6k0vK+4EVu8cnmxzu0cGGkCoufmxwK0bEC5W1huIXdSNgkxs8sc4w3Q9+tNsin2p5YNyeYCjwRKDuOOQOwWql80UFokAlnNwG+dCfkTBPHv65pP33yoCDVpxLOqhNvlIIzznOOM+1Zxp7HNMrshHlVhCUUGiqASiiimAUtFFABRRRSAWgGkooAeGrRg1SZEWM7NoXZ9wZ28/wCNZlKDUSgpbgdNGbKVZLSxkPkhWkked9ofA4AwO361Alvcx2UMkQAcg4WNcllbIy3p6CsEN709ZnX7rsPoaw9g1sx3OiS0jtFjSTLwzyr8kmBuXHBDDjjPP4U0Ja6ZJdRTTpMuUDRrzuGckA+o4rnzM5UKXJUcgZ6U0sTSWHk92BffU5fsf2SMKkYkLgqMNzx1qgzZppNJXRGCjsICaKSirAKKKKACiiimAUUUUAFFFFABRRRQAUtIKWgAooopAFFFFABSUtJTAKKKKACiiigAooooAKKWigBKKWigBKKWigBKWiigAooooAKKKKACiiigBKKWigBKKWigBKKWigD/2Q=="
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
"thumbRef": "data:image/jpeg;base64,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",
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
"id": "QA5",
"task": "QA5",
"kind": "queued",
"date": "2026-09-30",
"name": "球形A 第 5 轮：三层变色菊，尾巴层 + 星头层（同一模拟）",
"note": "【先不跑：等原理核对：analysis/原理/球形A.md 的「请你核对」。你回复「原理 OK」后由云端去掉 hold 和 ready 放行】两层共用初速和星数（不分层拟合，保证星头挂在尾巴尖上），只调各层亮度、大小、尾长。",
"look": [
"金色长尾 → 星头变粉、尾巴仍金 → 银白光点",
"尾巴长度、粉色明显程度"
],
"opinion": "按核对后的原理（analysis/原理/球形A.md）分层拟合。",
"tags": "球形A 原理 QA5",
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
}
},
{
"id": "QC4",
"task": "QC4",
"kind": "queued",
"date": "2026-09-30",
"name": "球形C 第 4 轮：芯（青柠）+ 延时点火外层（银白 → 金 → 橙）",
"note": "【先不跑：等原理核对：analysis/原理/球形C.md 的「请你核对」。你回复「原理 OK」后由云端去掉 hold 和 ready 放行】两层各自拟合大小、星数、亮度。",
"look": [
"青柠绿的芯",
"外层 0.4 s 后才亮",
"橙色光点一颗颗熄灭"
],
"opinion": "按核对后的原理（analysis/原理/球形C.md）分层拟合。",
"tags": "球形C 原理 QC4",
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
}
},
{
"id": "QD4",
"task": "QD4",
"kind": "queued",
"date": "2026-09-30",
"name": "球形D 第 4 轮：橙芯 + 外层四段变色（尾巴层 + 星头层）+ 末段银色短尾",
"note": "【先不跑：等原理核对：analysis/原理/球形D.md 的「请你核对」。你回复「原理 OK」后由云端去掉 hold 和 ready 放行】外层尾巴 / 星头共用初速和星数；芯单独拟合大小、星数、亮度。",
"look": [
"橙色芯在绿色外层里",
"星头柠黄时尾巴还是金",
"后半段一根根银色短线"
],
"opinion": "按核对后的原理（analysis/原理/球形D.md）分层拟合。",
"tags": "球形D 原理 QD4",
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
}
},
{
"id": "QN6",
"task": "QN6",
"kind": "queued",
"date": "2026-09-30",
"name": "青柠星（第 6 轮，青柠改淡、放射尾更清楚）",
"note": "QN5 结构对（0.44 → 0.35），但青柠太饱和太暗（实拍是亮的淡黄绿，星芯过曝）、开头 0.5 s 橙色成团。改：青柠 #f2ffa0；火花减密（≤160/s）、散开收窄、寿命拉长 → 一根根放射尾；星头亮度上限放开。",
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
var FW_REVIEW_COMBOS = [{"name": "球形B（两发 + 光丝）", "layers": [{"m": "rep:YB1", "scale": 1}, {"m": "rep:YB1F", "scale": 1}, {"m": "rep:YB2", "scale": 1, "delay": 0.9}]}, {"name": "球形A（尾巴 + 星头）", "layers": [{"m": "rep:YA1", "scale": 1}, {"m": "rep:YA2", "scale": 1}]}, {"name": "球形C（芯 + 外层）", "layers": [{"m": "rep:YC1", "scale": 1}, {"m": "rep:YC2", "scale": 1}]}, {"name": "球形D（外层尾巴 + 外层星头 + 芯）", "layers": [{"m": "rep:YD1", "scale": 1}, {"m": "rep:YD2", "scale": 1}, {"m": "rep:YD3", "scale": 1}]}, {"name": "鸿巢四尺玉（原理样机：锦冠 + 红点灭）", "layers": [{"m": "rep:YK1", "scale": 1}, {"m": "rep:YK2", "scale": 1}]}, {"name": "永丰三重蕊（原理样机：外层 + 三层芯）", "layers": [{"m": "rep:YF1", "scale": 1}, {"m": "rep:YF2", "scale": 1}, {"m": "rep:YF3", "scale": 1}, {"m": "rep:YF4", "scale": 1}]}, {"name": "片贝四尺玉（原理样机：金菊 + 小割 + 垂帘）", "layers": [{"m": "rep:YP1", "scale": 1}, {"m": "rep:YP2", "scale": 1}, {"m": "rep:YP2", "scale": 1, "mirror": true, "stages": [[0, "#7a6cff"]]}, {"m": "rep:YP3", "scale": 1}]}];
