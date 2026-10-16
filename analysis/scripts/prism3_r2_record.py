"""从本轮真实导出、查看器与原片生成交付血缘和参考校核记录。"""
from pathlib import Path
import hashlib,json,datetime

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'analysis/results/PRISM3R2_20261016'
load=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
pack=OUT/'正式包/PrismWheels3';s=load(pack/'cascade.json');ui=load(OUT/'整体查看器走查.json');env=load(OUT/'导出环境.json')
recipe=load(ROOT/'analysis/原理/条目_彩千轮3.json')
assert env['entry_ver']==ui['entry_ver']
assert s['source']['event_instances']==[x['config'] for x in ui['layers']]
texture_checks={k:sha(pack/t['file'])==t['sha256'] for k,t in s['textures'].items()}
assert all(texture_checks.values())
source=load(OUT/'用户基线.json');assert sha(ROOT/source['path'])==source['sha256']
components=[]
for n,e in enumerate(recipe['entries']):
    r=load(OUT/f'组件{"ABCD"[n]}_回放.json');q=next(x for x in s['emitters'] if x['name']==f'L{n+1}_Bloom')
    life=next(x['Lifetime']['const'] for x in q['modules'] if x['m']=='Lifetime')
    assert abs(life-r['total_s'])<.001
    b=ui['layers'][n]['births'];components.append(dict(id=e['id'],pattern=e['p']['pattern'],ringFrac=e['p']['ringFrac'],tilt=e['p']['tilt'],
      stars=e['p']['stars'],speedJit=e['p']['speedJit'],burn=e['p']['burn'],lifetime_s=life,
      sampled_birth_s=[min(x['time'] for x in b),max(x['time'] for x in b)],sampled_end_s=max(x['time'] for x in b)+life,
      frames=s['textures'][f'L{n+1}_seq']['frames'],sequence=s['textures'][f'L{n+1}_seq']['file']))
now=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(timespec='seconds')
ref={'version':ui['entry_ver'],'reference':[{'path':f'vidio/2.0/万彩千轮{k}.mp4','sha256':sha(ROOT/f'vidio/2.0/万彩千轮{k}.mp4'),'fps':30,'frames':n} for k,n in [('A',105),('B',99)]],
 'method':'原片按帧号检查。单朵M以23帧首次红色云团为观察零点，26帧出现清楚分离的亮星；整体t0=视频A剪辑0，只作同剪辑相对时刻比较，不能证明主爆零点。',
 'anchors_A':[
  {'phase':'首朵E由亮橙点变为展开的红色星团','before_frame':13,'after_frame':14,'interval_s':[13/30,14/30],'roi':[1688,233,1828,373]},
  {'phase':'单朵M首次可辨红色云团','frame':23,'time_s':23/30,'roi':[1965,490,2115,640]},
  {'phase':'M出现清楚分离亮星','before_frame':25,'after_frame':26,'interval_s':[25/30,26/30]},
  {'phase':'末批L由橙点变为红色星团','before_frame':28,'after_frame':29,'interval_s':[28/30,29/30],'roi':[1860,610,2000,750]},
  {'phase':'多数小割仍完整且持续变色','interval_s':[1.2,1.8]},
  {'phase':'整团明显稀疏、向余火过渡','interval_s':[2.1,2.7]},
  {'phase':'只剩零散余火，片尾仍有弱点','interval_s':[3,104/30],'right_censored':True}],
 'B_crosscheck':'B片首帧已处在小割阶段，不能当主爆起点；中段再次可见不同圆/椭圆小割与后段稀疏，末段出现下一发，不能用片长确认当前发燃尽。',
 'simulation':{'components':components,'ignition_delay_s':.1,'burn_mean_s':1.85,'burn_jitter_percent':8,
  'birth_distribution_s':[.22,1.12],'sampled_births_s':[min(q['time'] for x in ui['layers'] for q in x['births']),max(q['time'] for x in ui['layers'] for q in x['births'])],
  'first_resolved_stars_approx_s':.5,'comparison_precision':'仅比较可观察阶段；特征与主爆零点不一致，不能给出精确拟合tick误差',
  'notes':'原片红色云团、序列初闪和首批亮星不是同一观测特征。当前首批亮星约0.50s，A首团约0.467s；末批Death0.967s加本地0.1s点火约1.067s。仅比较陆续展开时段，不声称精确拟合误差或逐颗位置与真实烟花一一对应。'},
 'burning_evidence':{'source':'https://www.jes.or.jp/mag/stem/Vol.67/No.1.09.html','title':'Ooki et al. (2006), Burning and air resistance of fireworks stars, 67(1),43–47',
  'measured_sample_burning_s':[.8,2.4],'mean_relative_sd':.051,
  'interpretation':'1.85s均值处于论文实测量级；8%随机是沿用用户候选，不是论文5.1%的复制。视频M约0.767s出生，至1.8s仍可辨，之后漂移/邻朵重叠使精确单朵归属和燃尽不确定。序列2.27–2.37s含点火与淡出，不能当燃烧均值。没有目标星体直径/药剂资料，不能反推或证明具体化学配方。'},
 'limits':['源片不能确证主闪光零点；CPU主闪光寿命/大小为保守设计值。','固定ROI后段有邻朵重叠，精确单朵燃尽被遮挡；只对观察下限和量级交叉校核。','原片没有物理标尺，厘米数沿原项目尺度与用户示例，不由视频像素反推出真实米数。']}
(OUT/'参考校核.json').write_text(json.dumps(ref,ensure_ascii=False,indent=2),encoding='utf-8')
lineage={'time':now,'candidate':'PRISM3 修订2','tool':env['version'],'entry_ver':env['entry_ver'],'plan_sig':s['source']['plan_sig'],
 'actual_export':'正常打开PRISM3→导出素材包→ZIP；见导出入口检查.png','source_unchanged':source['sha256'],
 'cascade_sha256':sha(pack/'cascade.json'),'zip_sha256':sha(OUT/'PrismWheels3_R2.zip'),
 'recipe_sha256':sha(ROOT/'analysis/原理/条目_彩千轮3.json'),'components':components,'texture_sha256_checks':texture_checks,
 'files':{str(p.relative_to(pack)).replace('\\','/'):sha(p) for p in pack.iterdir() if p.is_file()},
 'ui_flow':ui['ui_flow'],'page_errors':ui['page_errors'],'ue_execution':False}
(OUT/'导出血缘.json').write_text(json.dumps(lineage,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'entry_ver':env['entry_ver'],'components':components,'source_unchanged':True},ensure_ascii=False,indent=1))
