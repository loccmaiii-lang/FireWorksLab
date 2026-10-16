"""登记彩千轮3.0的组件和证据；不把独立组件冒充整条CPU事件回放。"""
import json
from pathlib import Path
from prism3_build import recipes

ROOT = Path(__file__).resolve().parents[2]
REL = 'analysis/results/PRISM3_20261016/'


def main():
    docs = [
        ['本轮范围与状态', [
            '用户明确手游没有彩千轮：本轮只做PC。CPU闪光＋三组CPU飞行星头＋三种小割，共7个发射器；不是必须7个的理论下限，而是避免自定义材质/随机选图的最简单实现。',
            '本页是可编辑的灰度小割组件。整体事件包仍为制作中；这里的单组件导出不等于整体事件包。旧ZW5保留为历史结构对照，不代表3.0。',
            '已生成真实贴图和候选cascade，组件回放检查通过；严格参考时间、统一查看器整体事件回放和UE实测尚未通过。']],
        ['ResourceFX原资产与事件方法', [
            '依据2026-10-16 04:06 ResourceFX表快照与04:27对象快照；本轮实时只读连接超时，不能称为当前UE实时读回。PC行：跨年烟花3.0_中型_C_彩千轮；资源P_EFX_FireWorks_PrismWheels。',
            '原Main：Rate10、Burst30、寿命0.12–0.16s、Sphere半径8000cm，生成Spawn/Main事件；Dark：Rate20、Burst40、同寿命/半径，生成Spawn/Dark。它们是分布于球内的短寿命触发点，不是同一批外飞星头。',
            'Main→Light_Groud：每事件1粒，事件位置，寿命2.6–3.5s；Dark→Dark_Groud：每事件1粒，事件位置，寿命2.2–3s。Sparks Cloud每Main事件50–200粒且UsePSysLocation=true，会回到系统原点。另有独立Light_Groud Rate60/Burst10。',
            'LOD.EventGenerator与Modules引用同一对象，不是两个生成器。新链每个Carrier只有一个Death事件；Receiver自主Rate/Burst均为0，SpawnCount=1，UsePSysLocation=false，保证设计上一头一朵、在结束位置接续。',
            '<a href="../'+REL+'现有粒子参数.json" target="_blank">完整原发射器参数与点灭星证据</a>']],
        ['点灭星随机方式与取舍', [
            '真实点灭星初始尺寸X=9500–10500cm，Y/Z=0；采用Square沿X取样±5%，避免独立XY随机拉扁。3.0小割沿各自烘焙尺寸乘0.95–1.05，不照搬100m绝对尺寸。',
            '随机组取真实点灭星RGB独立范围R=0.015148–1、G=0–0.42806、B=0–1；保留每颗小割一色。不能叠加ColorOverLife覆盖初始随机色；灰度序列和中性Ramp保留乘色能力。',
            '两组固定初始色暂选历史配方粉、绿（设计假设），随后按参考趋势转暖；随机组保留出生随机色并淡出，未强行统一金色。']],
        ['时间依据：实测与推断分开', [
            'A片30fps、105帧；A约0.40s已有橙点，约0.467s已有小花，3.40s仍有余光。B片30fps、99帧；首帧已有小花，末段混入下一发。历史“主爆0.35s、0.8s才小割、3.3s完全灭”不能作为严格验收依据。',
            '当前飞行寿命0.4–1.1s、燃烧参数2.15s只是候选。母版窗口2.98s，统一出口裁掉空尾后，各小割Lifetime以导出文件为准（A约2.667s，B/C约2.5s）；不能把母版窗口、实际序列寿命或视频长度混为一谈。总长=最晚小割出生＋该朵可见寿命。完整原片或缺失段处理答复仍待补。',
            'Ooki等2006测得其试样星体燃烧0.8–2.4s，时间随同类星体直径变化；仅支持秒量级的可行性，不证明本参考的具体药剂、直径或2.15s。参考片还含曝光/余辉，不能与化学燃烧结束直接画等号。',
            '<a href="https://www.jes.or.jp/mag/stem/Vol.67/No.1.09.html" target="_blank">燃烧时长原始研究摘要</a>']],
        ['候选文件与检查入口', [
            '<a href="../'+REL+'候选包/PrismWheels3/cascade.json" target="_blank">事件cascade候选（尚非正式）</a> · <a href="../'+REL+'事件链回放.html" target="_blank">整体参数诊断回放（非UE实测）</a>',
            '本次必须完成：原参数记录、三个小割、事件导入、严格时序核对、五步自审和正式包。可后做：UE实机校准（用户执行导入后）。暂不建议：新增烟层、声音、更多造型或手游版。']]
    ]
    entries=[]
    for r in recipes():
        entries.append(dict(id=r['id'],date='2026-10-16',name='彩千轮3.0 · '+r['name']+'（组件，制作中）',
                            base='botan',p=r['params'],m=r['materialDefaults'],
                            note='中性灰度小割，给CPU事件在星头结束位置生成；不是整个烟花。',
                            tags='彩千轮3.0 PC 小割 事件',doc=docs,
                            opinion='组件贴图自检通过；整体尚缺完整参考时间与统一事件回放，不是待验收。',
                            images=[[REL+'组件'+r['id'][-1]+'_回放.jpg','真实导出组件逐时刻回放']]))
    (ROOT/'analysis/原理/条目_彩千轮3.json').write_text(json.dumps({'entries':entries},ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
    sf=ROOT/'协作/状态清单.json';s=json.loads(sf.read_text(encoding='utf-8'))
    e=next(x for x in s['effects'] if x['key']=='wancai')
    e.update(负责='彩千轮3（Codex）',阶段='制作中',说明='2026-10-16用户恢复任务：PC彩千轮3.0，原ZW5保留对照；3个小割组件和CPU事件候选已生成，非正式交付。',
             下一步='等待完整参考主爆/熄灭段或缺失段处理答复；继续统一事件回放、严格时序、多视角五步审核与正式包。用户已允许补EventGenerator/EventReceiverSpawn导入；用户执行UE导入。',
             方案=[dict(id=r['id'],label=r['name']+'组件（制作中）',en=r['id'][-1]) for r in recipes()],
             进度={'计算':True,'AI自检':False,'素材导出':True,'用户验收':False},
             缺=['主爆零点/完全熄灭的完整参考证据','整体CPU事件统一查看器和全标准验收','UE4.24事件真实读回（用户导入后）'])
    sf.write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


if __name__=='__main__':main()
