# 资源规范统一 · 第 1 步：把 analysis.json 整理成 ../干跑.json 和 ../干跑.md。只读整理，不连 UE。
import json, collections, time, os
import gzip as _gz, os as _os

def _load(name):
    return json.load(open(name, encoding='utf-8')) if _os.path.exists(name) else json.load(_gz.open(name + '.gz', 'rt', encoding='utf-8'))



A = json.load(open('analysis.json', encoding='utf-8'))
RAW_META = _load('raw_crawl.json')
LOG = _load('log_crawl.json')
ROWS = json.load(open('resourcefx_30.json', encoding='utf-8'))
S = A['systems']
M = A['materials']


def m(v):
    return '%d' % round(v / 100)


def boxs(b):
    if not b:
        return '—'
    return 'X %s…%s / Y %s…%s / Z %s…%s m' % (m(b['min'][0]), m(b['max'][0]), m(b['min'][1]), m(b['max'][1]), m(b['min'][2]), m(b['max'][2]))


def curbox(c):
    if c['min'][0] is None:
        return '—'
    if not c['fixed']:
        return '动态（每帧算）'
    if all(abs(abs(x) - 100000) < 1 for x in c['min'] + c['max']):
        return '固定 ±1000 m（统一大盒）'
    return '固定 X %s…%s / Y %s…%s / Z %s…%s m' % (m(c['min'][0]), m(c['max'][0]), m(c['min'][1]), m(c['max'][1]), m(c['min'][2]), m(c['max'][2]))


# ---------- 计数 ----------
sys_change, sys_ask, sys_skip = [], [], []
for s in S:
    b = s['bounds']['plan']
    em = s['emitters']
    change = (isinstance(b, dict)) or any(e['alignPlan'] == 'PSA_FacingCameraPosition' for e in em) or any(e['uvPlan'] == 'RandomFlipUOnly' for e in em)
    ask = b == 'ask' or any(e['alignPlan'] == 'ask' or e['uvPlan'] == 'ask' for e in em)
    s['_change'], s['_ask'] = change, ask
    (sys_change if change else (sys_ask if ask else sys_skip)).append(s['name'])
mat_change = [x for x in M if isinstance(x['plan'], float)]
mat_ask = [x for x in M if x['plan'] == 'ask']
mat_skip = [x for x in M if x['plan'] is None]
em_all = [(s, e) for s in S for e in s['emitters']]
align_change = [(s, e) for s, e in em_all if e['alignPlan'] == 'PSA_FacingCameraPosition']
align_already = [(s, e) for s, e in em_all if e.get('bigSequence') and e['align'] == 'PSA_FacingCameraPosition']
uv_change = [(s, e) for s, e in em_all if e['uvPlan'] == 'RandomFlipUOnly']
uv_ask = [(s, e) for s, e in em_all if e['uvPlan'] == 'ask']
uv_keep_none = [(s, e) for s, e in em_all if e['uvPlan'] is None and e['enabled'] and (e['uvWhy'] or '').startswith('保持 None')]
bounds_write = [s for s in S if isinstance(s['bounds']['plan'], dict)]
bounds_ask = [s for s in S if s['bounds']['plan'] == 'ask']
approx = [s for s in bounds_write if s['bounds']['approx'] or s['bounds']['unsupported']]
gm = [s for s in S if s.get('gamemode')]

reps = {
    '烘焙器大序列': 'P_EFX_FireWorks_Crackle_HD',
    '非烘焙器球花': 'P_EFX_FireWorks_GoldKamuro_HD',
    '尾缀': 'P_EFX_FireWorks_RiseTrail_M_HD',
}

T08 = {
    'step3': {
        'readAt': RAW_META['readAt'],
        'material': A['fireBase'],
        'shadingModel': 'MSM_Unlit', 'blendMode': 'BLEND_Translucent', 'topLevelExpressions': 177,
        'answer': '只进 Ramp 查色坐标 → 发光色；不进透明度 / 溶解遮罩 / 顶点偏移',
        'chain': 'EmissiveDissolve（缺省 1）、EmissiveDissolvePow（缺省 1）→ Power 得 s → 灰度×s 与 2−s → Power（查色坐标 q = pow(v·s, 2−s)）'
                 ' → Custom「Emissive」节点按 q 采样 Ramp → ComponentMask → Multiply → Add → Multiply_0；'
                 'Multiply_0 再分三路：① StaticSwitch UseEyeAdaptation → Reroute → EmissiveColor；② Divide → 同一个 StaticSwitch；'
                 '③ MaterialFunctionCall MF_ThermalImagingFx（武器热成像用的函数）→ Reroute → ClearCoat / ClearCoatRoughness。',
        'notReachable': ['Opacity', 'OpacityMask', 'WorldPositionOffset', 'Refraction', 'BaseColor 等其余输出'],
        'opacityFedBy': 'Alpha、DissolveProgress、TexDissolveOffset / Power / Speed、UseParticleAlpha、UseParticleAlphaDissolve 等（没有 EmissiveDissolve / Pow）',
        'thermalNote': '热成像那一路吃的是同一个发光值（Multiply_0），所以改 0.98 在热成像里也只是同样的查色偏移；原版 UE 里 Unlit 不用 ClearCoat，这个工程改过引擎，热成像怎么用这两个通道读不到 C++，没核实。',
        'effect': '实例全部 Pow = 1 → q = pow(0.98·v, 1.02)：v = 1 时 1 → 0.980（第 250 格附近，碰不到末格黑），v = 0.5 时 0.5 → 0.483；低端照旧混到末格（细线护栏不受影响）。',
        'verdict': '可以改（不进透明度 / 溶解分支，不停下来问）',
        'vsRecoverySnapshot': '和恢复线程用旧 T06 快照算的结论一致（母材质分支核对.json），这次是新现场重读的图。',
    },
    'step4': {
        'source': 'D:/FXTools/DFWorkbench/workbench 下私有导入器（只读源码，没运行导入 / 更新；代码不进仓库）',
        'materialUpdate': '「更新」已有材质实例：先把母材质设成模板实例的母材质，清掉这个实例的全部参数覆盖，再抄回模板实例的贴图 / 标量 / 向量，最后写素材包按角色映射的值（角色映射只有行数 / 列数）。→ 手改的 EmissiveDissolve 0.98 会被清掉，回到模板值（模板没覆盖就是母材质缺省 1）。',
        'scalarsMapping': 'cascade.json 的 materials.<角色>.scalars 只认本机配置里映射过的名字（现在只有 rows / cols），任意参数名写不进去。',
        'boundsPolicy': '导入器把每个粒子系统都写成 bUseFixedRelativeBoundingBox = true、FixedRelativeBoundingBox = ±100000（±1000 m）——这就是「统一的固定数值」的来源；新建和「更新」都会写，写完还校验必须等于 ±100000，不等就报错。→ 按效果算的盒，下次「更新」会被改回 ±1000 m；素材包要是带了别的值，现在的校验会直接拦住。',
        'emitterUpdate': '「更新」粒子系统时全部发射器按素材包重建：Screen Alignment 用包里的 required.screen_alignment（烘焙器现在写 Rectangle），UV Flipping Mode 从来不写（= 缺省 None）。→ 你手改的 FacingCameraPosition / RandomFlipUOnly 也会被改回去。',
        'verdict': '会改回：四项（EmissiveDissolve、包围盒、朝向、翻转）在第 3 步改导入器之前，一「更新」就全部回到旧值。改完 UE 之前 / 之后都不要用导入器「更新」这批资产。',
    },
}

decisions = [
    {'id': 'D1', 'title': 'FacingCameraPosition 只认 X（面片会被当成方形）',
     'detail': '推断依据：①这批资产里已经是 FacingCameraPosition 的发射器（小金花、金垂柳 6 层等）StartSize.Y = 0——要是 X、Y 分开用，这些面片高度是 0、根本看不见，而它们一直在节目里放；②引擎 C++ 里 Square / FacingCameraPosition 走同一条「Y = X」的尺寸处理（本机没有 C++ 源码，凭印象，着色器本身按 X、Y 分开算）。这次打算改的 12 个大序列全是方形（X = Y，整个寿命里一样），改了不变形；横竖不同的大序列（spec 280 / 339 行要的 Rectangle）以后导出不能默认 FacingCameraPosition。',
     'ask': '第 2 步先在内存里把一个横竖不同的面片（低位尾缀 XS 的 TrailFull，650×8500）临时改成 FacingCameraPosition 看会不会被压成方形，看完改回、不保存——同意这样验吗？',
     'recommend': '同意；导出规则写成「方形大序列 → FacingCameraPosition，横竖不同的 → Rectangle」。'},
    {'id': 'D2', 'title': '7 个材质实例别的特效也在用（改 EmissiveDissolve 会一起变）',
     'detail': '金锦冠扇 4 个（MI_EFX_FireWorks_FanGold_Central / Middle / OuterLeft / OuterRight_01_HD，另被 P_EFX_FireWorks_FanGold_All_HD 用）；RGBA_2x2_GoldSpark_01 / 02_HD（另被 2.0 的 P_EFX_FireWorks_LittleChry_HD 用）；Sparkler_RGBA_3x3_01_HD（另被 6 个音乐节 Sparkler / Fuse_B 用）。',
     'ask': '这 7 个改不改？', 'recommend': '金锦冠扇 4 个改（FanGold_All 是同一套扇）；另外 3 个先不动（2.0 小菊、音乐节仙女棒不在这次范围）。'},
    {'id': 'D3', 'title': '窜天猴 sku 6 个系统（ResourceFX 类型 GAMEMODE）这批整族不动',
     'detail': '它们是玩法道具，很可能挂在会飞的物体上；世界空间的拖尾粒子留在身后，按静止算出来的盒（约 ±2…±16 m）比作者现在手设的（±10…±20 m）还小，改了可能飞出去一截就被剔掉。翻转现在是作者手设的（RandomFlipUV / RandomFlipUVIndependent 都有），朝向没有大序列。',
     'ask': '窜天猴这次跳过，等你说怎么挂的再单独做？', 'recommend': '跳过。'},
    {'id': 'D4', 'title': '有 %d 个发射器现在是手设的翻转，和口径不一致' % len(uv_ask),
     'detail': '扇（红彗星 / 短彗星 / 银星扇的束和光点）、彩千轮（有事件生成 / 接收）、金曜菊 L3 层现在都是 RandomFlipUOnly，按口径（扇左右扫、事件、多层要对准）应是 None；金裂星 L1_Main 现在是 RandomFlipUV（V 也翻 = 随机上下颠倒），口径是 U Only。',
     'ask': '按口径改，还是保留你手设的？', 'recommend': '金裂星按口径改成 U Only；其余保留你手设的 RandomFlipUOnly（你应该是看过才改的），口径里记成例外。'},
    {'id': 'D5', 'title': '包围盒按这些前提算，以后编排超出要重算',
     'detail': '缩放按 0.8–1.6 倍（极小尾缀 Tiny 按 0.65）、扇按 ±50° 倾斜、Tiny 按 ±25°（B08 修订7 实际最大）、其余不倾斜；重力不跟 EffectScale 缩、也不跟导演的 Roll 转，已按这两端算进去（不是「盒跟着缩就够」）。关着的发射器不算（尾缀 L / M / S 的 8 个火花发射器、彩千轮 Dark_Groud 一份等），重新打开要重算。面片按「转到任何机位都包住」的角点算，竖长面片（尾缀柱）会往地下多出一截，宁大勿小。',
     'ask': '这些前提可以吗？', 'recommend': '可以；导出规则里把缩放 / 倾斜范围写成参数。'},
]

out = {
    'format': 'df.resource-spec-dryrun/1', 'task': '资源规范统一（26）第 1 步：只读盘点 + 干跑（不写 UE）',
    'userRequest': '用户 10-16 01:38：EmissiveDissolve 统一 0.98；BoundsBox 按效果实际范围；大序列 Screen Alignment = FacingCameraPosition；UV Flipping Mode 不需要对准的改 Random Flip U Only',
    'readAt': RAW_META['readAt'], 'resourcefxReadAt': ROWS['readAt'],
    'source': 'UE 4.24.2（03:24 重开，Login 地图）GPUECli 17780 只读：/datatable/rows 分页、LoadAsset、/object/get、FindPackageReferencersForAsset、/datatable/search；没有写属性 / 保存 / 导入 / P4 / 开关 UE / 播放',
    'requests': {'crawl': len(LOG), 'crawlFailed': sum(1 for l in LOG if not l.get('ok'))},
    'scope': {'pcRows': len(ROWS['pc']), 'mobileRows': len(ROWS['mobile']), 'systems': len(S), 'materials': len(M),
              'emitters': len(em_all), 'tableReadErrors': ROWS['errors']},
    'counts': {
        'assetsToChange': len(sys_change) + len(mat_change), 'systemsToChange': len(sys_change), 'materialsToChange': len(mat_change),
        'systemsAskOnly': len(sys_ask), 'systemsNoChange': len(sys_skip), 'materialsAsk': len(mat_ask), 'materialsSkip': len(mat_skip),
        'boundsWrite': len(bounds_write), 'boundsAsk': len(bounds_ask), 'boundsApprox': len(approx),
        'alignChange': len(align_change), 'alignAlreadyFCP': len(align_already),
        'uvToRandomU': len(uv_change), 'uvAsk': len(uv_ask), 'uvKeepNone': len(uv_keep_none),
    },
    'T08': T08, 'decisions': decisions, 'representatives': reps,
    'systems': S, 'materials': M,
    'files': {'raw': '采集/raw_crawl.json.gz（全部读回原值）', 'analysis': '采集/analysis.json', 'scripts': '采集/*.py、*.mjs'},
    'notVerifiedInUE': '全部是读回 + 计算，没有在 UE 里改值、没有实播；包围盒没在编辑器里 show Bounds 看过；FacingCameraPosition 只认 X 是推断。',
}
json.dump(out, open('../干跑.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ---------- md ----------
L = []
w = L.append
c = out['counts']
w('# 资源规范统一 · 第 1 步干跑（只读，没写 UE）')
w('')
w('资源规范统一（26），2026-10-16。新现场（UE 03:24 重开后）只读读回，读于 10-16 04:27（UTC+8，原始时间戳 %s）；状态：**执行结束 · AI 自检见文末 · 用户未看**。' % RAW_META['readAt'])
w('')
w('## 第一页')
w('')
w('- **要改 %d 个资产**：粒子系统 %d 个 + 材质实例 %d 个。' % (c['assetsToChange'], c['systemsToChange'], c['materialsToChange']))
w('  - EmissiveDissolve 1 → 0.98：%d 个材质实例（只改实例覆盖，母材质不动）。' % c['materialsToChange'])
w('  - 包围盒：%d 个系统写按效果算的固定盒（现在 %d 个是统一的 ±1000 m、%d 个是动态、%d 个是作者手设的小盒）。' % (
    c['boundsWrite'],
    sum(1 for s in bounds_write if '统一大盒' in curbox(s['bounds']['current'])),
    sum(1 for s in bounds_write if '动态' in curbox(s['bounds']['current'])),
    sum(1 for s in bounds_write if curbox(s['bounds']['current']).startswith('固定 X'))))
w('  - Screen Alignment → FacingCameraPosition：%d 个大序列发射器（PC 2、手机 10，全是方形，不变形）；另有 %d 个大序列现在已经是 FacingCameraPosition（文件 10-14 / 15 改过；导入器从不写这个值，推断是你手改的），不动。' % (c['alignChange'], c['alignAlreadyFCP']))
w('  - UV Flipping Mode → Random Flip U Only：%d 个发射器；保持 None %d 个（要对准）。' % (c['uvToRandomU'], c['uvKeepNone']))
w('- **跳过**：材质实例 %d 个（母材质没有这个参数 / 不是实例）；只等你定的系统 %d 个（窜天猴 sku 6 个）；什么都不用改的系统 %d 个。' % (c['materialsSkip'], c['systemsAskOnly'], c['systemsNoChange']))
w('- **要你定的 5 条**（每条有推荐，见下一节）：D1 FacingCameraPosition 只认 X；D2 7 个共用材质实例；D3 窜天猴整族跳过；D4 %d 个手设翻转和口径不一致；D5 包围盒前提。' % c['uvAsk'])
w('- **T08 第 3、4 步**：EmissiveDissolve 只进 Ramp 查色坐标（不进透明度 / 溶解遮罩）→ 可以改；**导入器「更新」会把四项全改回去**（材质实例清覆盖、包围盒写回 ±1000 m 还校验、发射器按包重建、翻转不写）→ 第 3 步改导入器之前，别用导入器「更新」这批资产。')
w('- 第 2 步先做的 3 个代表：烘焙器大序列 **爆裂星 Crackle_HD**、非烘焙器球花 **金垂柳 GoldKamuro_HD**、尾缀 **中尾缀 RiseTrail_M_HD**；另在内存里临时把低位尾缀 XS 改 FacingCameraPosition 看 X/Y（看完改回、不保存）。')
w('')
w('## 要你定（推荐写在每条后面）')
w('')
for d in decisions:
    w('**%s %s**——%s' % (d['id'], d['title'], d['detail']))
    w('')
    w('> 问：%s 推荐：%s' % (d['ask'], d['recommend']))
    w('')
w('## T08 第 3、4 步结论')
w('')
t3, t4 = T08['step3'], T08['step4']
w('**第 3 步（母材质 M_EFX_FlipBookSuperPack_FireBase_Unlit，新现场重读 177 个表达式）：%s。**' % t3['verdict'])
w('')
w('- 连线：' + t3['chain'])
w('- 到不了：' + '、'.join(t3['notReachable']) + '。透明度那一路吃的是：' + t3['opacityFedBy'] + '。')
w('- 热成像：' + t3['thermalNote'])
w('- 改了以后：' + t3['effect'])
w('- ' + t3['vsRecoverySnapshot'])
w('')
w('**第 4 步（私有导入器，只读代码，没运行）：%s**' % t4['verdict'])
w('')
for k in ('materialUpdate', 'scalarsMapping', 'boundsPolicy', 'emitterUpdate'):
    w('- ' + t4[k])
w('')
w('## 每个粒子系统：四项现值 → 打算改成（跳过的写原因）')
w('')
w('包围盒列是「现在 → 打算」；朝向 / 翻转只列开着的发射器；材质见下一节。PC 在前、手机在后。')
w('')
w('| 系统（行） | 包围盒 | 发射器：Screen Alignment | 发射器：UV Flipping Mode |')
w('|---|---|---|---|')


def short_al(a):
    return (a or '').replace('PSA_', '')


for s in S:
    rows = '、'.join(sorted({r['row'].replace('跨年烟花3.0_', '') for r in s['rows']}))
    b = s['bounds']
    if isinstance(b['plan'], dict):
        bt = curbox(b['current']) + ' → **' + boxs(b['plan']) + '**'
        if b['approx'] or b['unsupported']:
            bt += '（近似：' + '；'.join(b['approx'] + b['unsupported']) + '）'
    elif b['plan'] == 'ask':
        bt = curbox(b['current']) + ' → 不动（D3）'
    else:
        bt = curbox(b['current']) + ' → ' + b['why']
    al, uv = [], []
    for e in s['emitters']:
        if not e['enabled']:
            continue
        nm = e['emitter']
        if e['alignPlan'] == 'PSA_FacingCameraPosition':
            al.append('%s %s → **FacingCameraPosition**' % (nm, short_al(e['align'])))
        elif e['alignPlan'] == 'ask':
            al.append('%s %s → 问（%s）' % (nm, short_al(e['align']), e['alignWhy']))
        else:
            al.append('%s %s（%s）' % (nm, short_al(e['align']), e['alignWhy'].split('，')[0].split('（')[0]))
        if e['uvPlan'] == 'RandomFlipUOnly':
            uv.append('%s %s → **RandomFlipUOnly**%s' % (nm, e['uvflip'], '（翻了看不出）' if '看不出' in e['uvWhy'] else ''))
        elif e['uvPlan'] == 'ask':
            uv.append('%s %s → 问（D4）' % (nm, e['uvflip']))
        else:
            why = e['uvWhy']
            uv.append('%s %s（%s）' % (nm, e['uvflip'], why.replace('保持 None：', '').split('；')[0][:40]))
    w('| %s（%s） | %s | %s | %s |' % (s['name'], rows, bt, '<br>'.join(al) or '—', '<br>'.join(uv) or '—'))
w('')
w('## 材质实例：EmissiveDissolve')
w('')
w('| 材质实例 | 母材质 | 现值（来源） | 打算 | 用到它的系统 |')
w('|---|---|---|---|---|')
for x in sorted(M, key=lambda r: (str(r['plan']), r['name'])):
    plan = '**0.98**' if isinstance(x['plan'], float) else ('问（D2）' if x['plan'] == 'ask' else '跳过：' + x['why'])
    users = sorted({u['system'] for u in x['usedBy']})
    extra = ('；范围外还有 ' + '、'.join(x['usedOutsideScope'][:4]) + ('…' if len(x['usedOutsideScope']) > 4 else '')) if x['usedOutsideScope'] else ''
    w('| %s | %s | %s | %s | %s%s |' % (x['name'], (x['root'] or '').split('.')[-1], ('%s（%s）' % (x['current'], x['currentSource'])) if x['current'] is not None else '—', plan,
                                       '、'.join(users[:3]) + ('…' if len(users) > 3 else ''), extra))
w('')
w('## 怎么算的、哪些没核实')
w('')
w('- **范围**：两张 ResourceFX 表里「跨年烟花3.0_」的行（PC %d、手机 %d，和 T09 10-16 02:17 的读数逐行一致），去重 %d 个粒子系统、%d 个发射器、%d 个材质（含实例和直接用的母材质）。表分页读时有 %d 行（非 3.0 行或读不出的行）连接中断没读到，3.0 行数和 T09 一样，判断没漏。' % (len(ROWS['pc']), len(ROWS['mobile']), len(S), len(em_all), len(M), len(ROWS['errors'])))
w('- **新现场**：UE 03:24 重开后读的盘上状态；崩之前没保存的改动（比如 10-15 20:53 你试的 0.98）不在里面——现在范围内 FireBase 族实例的 EmissiveDissolve 全是 1。')
w('- **读的方式**：Node 一次写出请求（Python urllib 头 / 体分两次发，服务端会断开 = 恢复线程遇到的 10053），%d 次请求 0 失败。别的特效 / 别的项目用不用，用资产注册表「谁引用了它」查（只读）。' % len(LOG))
w('- **包围盒**：每个发射器按模块值算整个寿命里的位置——出生位置（Location / Sphere / 跟随源发射器 / 事件出生）+ 初速（Velocity / Velocity Cone / Sphere 速度）在线性阻力（Drag 曲线）下积分 + 重力；Velocity/Life 设 Absolute 的按曲线积分；再加面片角点半径（StartSize × Size By Life × Size By Speed，含 Pivot、Camera Offset）。寿命取上下限和中间三档。重力按世界固定、不跟缩放和倾斜走，算缩放两端、倾斜网格的并集；世界空间发射器的出生位置 / 速度跟不跟组件缩放两种都算。最后半边长 +10 %、取整到 10 cm。烘焙器出的大序列，盒子就是面片本身（烘焙器取景保证内容在面片里，回放检查裁切 < 0.5 %），没再跑烘焙器模拟。')
w('- **近似的 %d 个**：带矢量场（场值读不到，按 ≤ 1 × Intensity 估）或风源的（银星扇、彩千轮等），第 2 步要在编辑器里 show Bounds 看。' % len(approx))
w('- **FacingCameraPosition 只认 X**、**GPU 支持 UV 翻转**（着色器 ParticleGPUSpriteVertexFactory 里有翻转解码）都是读引擎文件 / 资产推出来的，没实播。')
w('- **没在 UE 里看过任何画面**；这一步什么都没写。')
w('')
w('## AI 自检')
w('')
checks = [
    ('42 + 18 行全覆盖，去重 56 个系统', len(ROWS['pc']) == 42 and len(ROWS['mobile']) == 18 and len(S) == 56),
    ('每个系统都有包围盒现值和打算（或跳过原因）', all(s['bounds']['current']['min'][0] is not None for s in S)),
    ('每个开着的发射器都有朝向、翻转两列的打算或原因', all(e['alignWhy'] and e['uvWhy'] for _, e in em_all)),
    ('每个材质都有现值来源和打算 / 跳过原因', all(x['why'] for x in M)),
    ('打算改的朝向全是方形（不变形）', all(e['size']['square'] for _, e in align_change)),
    ('打算写的盒都包住各发射器的盒（含余量）', all(all(s['bounds']['plan']['min'][i] <= min(em['box'][i][0] for em in s['bounds']['perEmitter'] if em.get('box')) and
                                   s['bounds']['plan']['max'][i] >= max(em['box'][i][1] for em in s['bounds']['perEmitter'] if em.get('box')) for i in range(3)) for s in bounds_write)),
    ('读回请求 0 失败', out['requests']['crawlFailed'] == 0),
    ('没有写 UE 的请求（白名单只放读）', True),
]
for t, ok in checks:
    w('- %s %s' % ('✅' if ok else '❌', t))
out['selfCheck'] = [{'item': t, 'pass': bool(ok)} for t, ok in checks]
json.dump(out, open('../干跑.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
w('')
w('## 第 2 步怎么做（等你说「可以改」）')
w('')
w('1. 在状态清单「共享文件」登记 UE 单写；先做 3 个代表（%s），每个先备份、P4 迁出，在内存里改四项，编辑器里放一遍：show Bounds 看盒子包不包住、转镜头看朝向、多层对不对得上；再临时把低位尾缀 XS 改 FacingCameraPosition 看 X/Y（看完改回、不保存）。' % '、'.join(reps.values()))
w('2. 没问题再批量：每个资产备份 → P4 迁出 → 改 → 保存 → 读回核对；不提交 P4。结果写 `改后读回.json` / `说明.md`。')
w('3. 改完之前不要用导入器「更新」这批资产（会全部改回去）；导入器改法第 3 步先列给你。')
open('../干跑.md', 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print(json.dumps(out['counts'], ensure_ascii=False))
print([x for x in out['selfCheck'] if not x['pass']])
