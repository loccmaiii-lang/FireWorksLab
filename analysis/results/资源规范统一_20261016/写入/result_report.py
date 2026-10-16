# 第2步报告，直接从终检/读回/事务生成，未完成不宣称成功。
import json,os,hashlib,shutil
from pathlib import Path
H=Path(__file__).resolve().parent;R=H.parent
load=lambda p:json.loads(p.read_text(encoding='utf-8'))
a=load(R/'改后读回.json');f=load(H/'第2步终检.json');p=load(H/'final_targets.json');n=load(H/'原生范围_全体分组.json')
assert not a['errors'] and not f['diffs'] and not f['env']['temporary_actors']
assert len(a['materials'])==67 and len(a['systems'])==48
journal=load(H/'写盘事务.json')
assert all(journal[x['path']]['phase']=='verified' for x in a['materials']+a['systems'])
# 独立磁盘hash复核。不reload UE已加载对象，不把内存读回宣称从磁盘重新加载。
root=Path('E:/loc_ma5/DFMEditor/DFM/Content')
hashes=[]
for x in a['systems']+a['materials']:
    path=root/(x['path'].split('.')[0][6:]+'.uasset');h=hashlib.sha256(path.read_bytes()).hexdigest()
    assert h==x['save']['afterSHA256'],x['name']
    hashes.append({'name':x['name'],'hash':h,'matchesSaved':True})
(H/'保存后磁盘哈希核对.json').write_text(json.dumps(hashes,ensure_ascii=False,indent=1),encoding='utf-8')
lines=['# 资源规范统一（26）· 第2步本轮执行结果','',
'第2步已落盘可安全执行部分；**尚未完整完成**。第三步按用户12:28要求未开始。','',
'## 结果汇总','',
'| 项目 | 已保存并读回 | 剩余／跳过 |','|---|---:|---|',
'| EmissiveDissolve | 67 个材质实例，0.98 | 3 个跨范围共用实例保持1；24个无参数／非实例跳过 |',
'| BoundsBox | 47 个系统各自计算固定盒，+10% | 金垂柳被他人迁出；银星扇、彩千轮矢量场范围未闭环 |',
'| Screen Alignment | 12 个大序列发射器，FacingCameraPosition | 非方形仍Rectangle，轴锁／Velocity／Ribbon／Mesh不动 |',
'| UV Flipping Mode | 28 个发射器，RandomFlipUOnly（含金裂星） | 14个已手设U翻转保留；需对齐层保持None |','',
'实际保存 **115个包 = 48个粒子系统 + 67个材质实例**。47是改Bounds的系统数；彩千轮另只改一个发射器的UV，故实际保存系统是48。',
'116个目标资产迁出成功，金垂柳系统被他人锁定未迁出；其中银星扇未写盘。**未提交P4**。','',
'## 包围盒复核与安全边界','',
'- 原模拟计算不再当作充分验证。新盒联合：逐帧UE CPU组件动态盒（保守底线） + 原模块运动/尺寸/Pivot包络；每个缩放与旋转情形逆变换到组件本地后求并，半边长再加10%、10cm向外取整。',
'- 实测49个系统、218个情形，包括0.8/1.6（Tiny 0.65）缩放、允许倾斜及已有LOD。每组记录所有Slate采样步，结束粒子数量均为0；不是只有开始/末帧截图。',
'- 动态组件盒不是可见图形的最小盒，也不能反推原生粒子中心：本轮将它用作保守底线，不再把超出模型归结为运动低估。新盒可能明显偏大，但不使用统一固定常数。',
'- 爆裂星原生测到缩放0.8下约±178.62m、1.6下±288.53m；可见范围与CPU盒不同。本轮以原生大盒为底线，避免在尚未闭环时用原较小值缩盒。',
'- **银星扇、彩千轮原Bounds保留**：GPU矢量场粒子范围没有可靠完整上界。CPU组件采样不冒充GPU粒子位置验证。',
'- 金垂柳系统原Bounds保持不变：他人已迁出；没有去只读、没有强制解锁。它的6个可迁出材质实例已改0.98。',
'- 不承诺适用域以外：更小/更大缩放、更大倾斜、重新启用禁用发射器、移动组件产生的世界拖尾都需重新测算。窜天猴sku 6个系统整族跳过。','',
'## 朝向与视觉检查','',
'- 非方形对照改用M尾缀的TrailFar（无OrientationAxisLock）：同面片同机位Rectangle vs FacingCameraPosition。后者远段被压短、正常长尾不再保留；已还原Rectangle并核对，测试朝向未保存。',
'- 本轮修订后代表实播：Crackle_HD、GoldKamuro_HD、RiseTrail_M_HD，30张正面/低角度截图；肉眼看花型、朝向、接力、尾柱未发现本次四项导致的新变形。金垂柳系统锁定，所以没有验新固定盒，仅看改后材质。',
'- 49系统全寿命原生数据采样不等于49系统全部逐画面美术验收；其余效果未逐个放大审看，手机包只在PC编辑器模拟，没有真机验收。没有编排整场实播。','',
'## 保护、核对与回滚','',
'- 写前117份本机备份哈希一致；备份路径 `analysis/local/输出/资源规范统一_20261016_备份/`（gitignore，未上传uasset）。',
'- 逐资产写盘日志 `写入/写盘事务.json`：所有115个写盘资产已验证，无未收口事务。保存后哈希再次核对115/115一致。',
'- 67个MI对照Parent、贴图、向量、其它标量、StaticParameters/BasePropertyOverrides，除EmissiveDissolve外未变；不改任何母材质。',
'- 粒子系统仅改固定盒/所列Required朝向与UV；必要时原值回写ThumbnailWarmup触发已有重建路径（数值不变，未改生命周期、速度、颜色等效果参数）。',
'- 保存返回成功后读回UE已加载对象，另核对磁盘哈希已改变且与保存日志一致；**未关闭UE或卸载重载全部资产，不把内存读回称为独立磁盘重加载验证**。',
'- RSU26临时发射器0；测试冻结关闭、测试机位已还原，不保存Login地图、不清网格沙盒、不提交P4。','',
'## 需要后续处理','',
'1. 金垂柳系统归还迁出后补Bounds；银星扇和彩千轮需GPU矢量场范围闭环后补Bounds。',
'2. 用户在UE实播验收后自行提交P4。本轮会保留本机迁出文件。',
'3. **第三步未做**：烘焙器、私有导入器和spec字段未改；导入器“更新”仍可能覆盖这四项，不要用旧导入器更新本批。','',
'| 栏 | 状态 |','|---|---|','| 执行结束 | 本轮可执行部分已保存115包；第2步整体剩3个Bounds，未完整结束 |','| AI自检 | 写盘读回/磁盘哈希/MI其它参数/临时清理均通过；全GPU范围与逐效果画面未完整验收 |','| 用户通过 | 未验收 |','',
'## 逐系统结果','',
'单位cm，组件本地；固定盒随组件变换。','',
'| 粒子系统 | Bounds | Min | Max | 朝向/UV Required数 |','|---|---|---|---|---|']
for x in a['systems']:
    b=x['after']['FixedRelativeBoundingBox'];mn=b['Min'];mx=b['Max'];lines.append('| %s | %s | %s | %s | %d |'%(x['name'],'已更新' if x['boundsWritten'] else '原值保留',','.join(str(mn[k]) for k in 'XYZ'),','.join(str(mx[k]) for k in 'XYZ'),len(x['emitters'])))
lines+=['','## 文件索引','','- `改后读回.json`：115包逐项保存及读回结果。','- `写入/第2步终检.json`、`保存后磁盘哈希核对.json`：再次核对与磁盘证据。','- `写入/包围盒修订核对.json`、`原生范围_全体分组.json`：47个修订盒与全部采样。','- `写入/D1朝向原生对照.json`、`代表测试/修订后实播.json`：单变量朝向和三代表画面。']
(R/'说明.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('report written',len(a['systems']),len(a['materials']))
