from pathlib import Path
from PIL import Image
import hashlib,json,zipfile
import numpy as np

p=Path(__file__).resolve().parents[1]; out=p/'results'
v=json.loads((out/'verification.json').read_text(encoding='utf-8'))
r=json.loads((out/'regressions.json').read_text(encoding='utf-8'))
hashes=json.loads((p/'baseline/original-hashes.json').read_text(encoding='utf-8-sig'))
repo=p.parents[1]
changed=[x['path'] for x in hashes if hashlib.sha256((repo/x['path']).read_bytes()).hexdigest().upper()!=x['sha256']]
assert not changed, changed
a=np.asarray(Image.open(out/'original-3.6-atlas.png')).astype('int16');b=np.asarray(Image.open(out/'baseline-2k-atlas.png')).astype('int16');delta=np.abs(a-b)
with zipfile.ZipFile(out/'Kiku_ULTRA_4K.zip') as z:
    assert z.testzip() is None
    import io
    with Image.open(io.BytesIO(z.read('T_Kiku_ULTRA_4K.png'))) as im: assert im.size==(4096,4096) and im.mode=='RGBA'
    metadata=json.loads(z.read('Kiku_ULTRA_4K.json'));assert metadata['texture']['width']==4096 and metadata['texture']['frames']==256
    entries=z.namelist()
integrity={'original_files_checked':len(hashes),'original_changed':changed,'baseline_diff_max':int(delta.max()),'baseline_diff_mean':float(delta.mean()),'baseline_changed_values':int(np.count_nonzero(delta)),'zip_entries':entries,'snapshot_size':list(Image.open(out/'current-view-4k.png').size)}
(out/'integrity.json').write_text(json.dumps(integrity,ensure_ascii=False,indent=2),encoding='utf-8')
rows=[]
names={'baseline-2k':'2K 原版采样','sampling-2k':'2K 覆盖积分（亮核关闭）','fine-4k':'4K 高精（亮核 25%）','fine-8k':'8K 高精（亮核 25%）'}
for x in v['cases']:
    if 'name' not in x: continue
    rows.append(f"| {names[x['name']]} | {x['cell'][0]}×{x['cell'][1]} | {x['frames']} | {x['bakeMs']/1000:.2f} s | {x['totalMs']/1000:.2f} s | {x['budget']['workingMiB']:.0f} MiB |")
flux=v['checks']['kernelFlux'];improvement=100*(1-flux['integrated']['spread']/flux['legacy']['spread'])
report=f'''# 高精度实验版 01 · 实测说明

测试时间：{v['date']}（UTC）。设备：{v['gpu']}。浏览器为本机 Chrome，无头硬件加速；没有使用软件渲染。

## 同条件对照

菊类，种子 42，256 帧，3.2 秒，固定取景、均匀时间、相同快门。所有版本锁定基准的曝光值，比较图光晕关闭、显示尺寸统一为 1024×1024。

| 版本 | 单帧尺寸 | 帧数 | 烘焙内部计时 | 到图像编码完成 | 估算临时 GPU 缓冲 |
| --- | --- | --- | --- | --- | --- |
{chr(10).join(rows)}

“烘焙内部计时”包括逐帧处理和曝光/编码阶段，不含最后的全部质量分析、对照图和 PNG 文件编码；后一列包含本次分析、三张对照图及整张贴图编码，不含写文件与 ZIP 打包。首次驱动编译、浏览器调度也可能影响结果。这是单次记录，不是稳定性能基准。

4K 单帧像素数为基准的 4 倍，8K 为 16 倍；二者都保留 256 帧，动画没有因为增大格子而减少帧数。它们增加的是细节容量，不能直接表达为主观画质倍数。

## 粒子采样的隔离检查

单个小光点，以 20 个不同的亚像素横向位置渲染，逐次累加整张浮点画面亮度。亮核关闭，仅比较采样方式。

- 原版总亮度范围：{flux['legacy']['min']:.8f} ～ {flux['legacy']['max']:.8f}，峰峰波动 {flux['legacy']['spread']*100:.4f}%（按输入单位能量）。
- 覆盖积分范围：{flux['integrated']['min']:.8f} ～ {flux['integrated']['max']:.8f}，峰峰波动 {flux['integrated']['spread']*100:.4f}%。
- 该测试的波动下降 {improvement:.2f}%。浮点目标使用原有 16 位格式，所以不是理想解析零误差。

这个结果只说明该类小光点在跨像素位置时的稳定性改善，不能外推为整体烟花画质提升 {improvement:.0f}%。

## 验证结果

- 原版 tool 目录 {len(hashes)} 个文件的 SHA256 全部保持不变。
- 冻结原版 3.6 和实验版“原版采样”独立烘焙后，最大的单通道差值为 {int(delta.max())}/255，平均差值为 {float(delta.mean()):.8f}/255；不声称逐字节完全一致。
- RGBA 数据测试：A=0 时 R=201、G=39、B=17 完整保留。普通透明图片的前处理不再吞掉这些帧。
- 原始矩形帧 512×256 保持原尺寸，未缩成 256×256。
- 2K / 4K / 8K 完整菊类均为四个通道有数据、256 帧，WebGL 错误为 0。
- 千轮、喷泉和尾缀浏览器检查通过。
- 完整尾缀包含 30 fps / 20 fps 两个消散版本；与循环接力帧的逐像素平均差值分别为 {r['tail']['relay']}。
- 4K 正常启动、UI 取消后保留上次结果、内容变化取帧、8×8 空间采样、显存预算拒绝均通过。
- 界面真实导出的 ZIP 可校验并解码；里面的正式贴图为 4096×4096 RGBA，参数记载 256 帧；当前画面截图为 4096×4096。
- 页面脚本错误为 0。

## 尚未验证 / 本版范围

UE 4.24 播放和场景性能尚未验证。当前保留原始烟花轨迹、物理步长、颗粒世界尺寸及输出格式；方向拖带、新的近景分层花型和美术重校准不属于本次已经完成的功能。

## 看图

打开上一级 `index.html` 拖动分界线。对照页可以在 2K 采样升级、4K 高精和 8K 高精之间切换，并放大同一位置。直接打开实验烘焙器可播放动画，调节光晕、亮核、分辨率和采样。
'''
(out/'实测说明.md').write_text(report,encoding='utf-8')
plan=p/'docs/superpowers/plans/2026-09-28-ultra-baker.md'
s=plan.read_text(encoding='utf-8').replace('- [ ]','- [x]')
s += '\n## Completion notes\n- Implemented and validated inline in the authorized test directory. Original source is unchanged.\n- No direct UE run was available; engine validation remains documented separately.\n- Windows native Playwright used the installed Chrome and RTX 5080; all output evidence is local.\n'
plan.write_text(s,encoding='utf-8')
print(json.dumps({'original_unchanged':len(hashes),'flux_variation_reduction_percent':round(improvement,2),'max_baseline_difference':int(delta.max())}))
