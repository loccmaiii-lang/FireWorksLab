import re,collections,json,sys
from datetime import datetime
L='E:/loc_ma5/DFMEditor/DFM/Saved/Logs/DeltaForce.log'
since=sys.argv[1]
lines=[l for l in open(L,encoding='utf-8',errors='replace').read().splitlines() if l[1:20]>=since]
P=lambda s:datetime.strptime(s,'%Y.%m.%d-%H.%M.%S:%f')
runs=[];cur=None;pend=[]
for l in lines:
    m=re.match(r'\[(\S+?)\]\[\s*\d+\](.*)',l)
    if not m: continue
    ts,msg=m.groups()
    if '模拟平台已设置' in msg or '模拟画质已设置' in msg: pend.append(msg.replace('ShowDirectorTool: ',''));continue
    if '编辑器预览已开始' in msg: cur={'start':ts,'set':pend,'act':collections.Counter(),'trunc':0};pend=[];runs.append(cur);continue
    if cur is None: continue
    if '预览已停止' in msg: cur['stop']=ts;cur=None;continue
    a=re.search(r'ActivationChange resource id: (\S+), HandleIndex: \d+, bActived: 1',msg)
    if a: cur['act'][a.group(1)]+=1
    if 'Failed to allocate tiles' in msg: cur['trunc']+=1
D='F:/FireWorksLab/FXtools/节目/NewYearFireWorks_v01/'
def expected(tier,t0,t1):
    t=json.load(open(D+f'三表-R03-{tier}.json',encoding='utf-8'));subs={s['TemplateName']:s['Entries'] for s in t['EffectSubTemplates']};tp={p['TemplateName']:p for p in t['EffectTemplates']};c=collections.Counter()
    for g in t['EffectScheduleGroups']:
        for s in g['Slots']:
            for e in tp[s['TemplateName']]['Entries']:
                base=s['StartTime']+e['LocalTimeOffset']
                if base<t0: continue
                for se in subs[e['SubTemplateName']]:
                    if t0<=base+se['LocalTimeOffset']<t1:c[se['FXResourceId']]+=1
    return c
res=[]
for r in runs:
    if 'stop' not in r: continue
    dur=(P(r['stop'])-P(r['start'])).total_seconds()
    ex={t:expected(t,113,113+dur) for t in ['high','medium','low']}
    act=r['act'];best=min(ex,key=lambda t:sum(abs(act[k]-ex[t][k]) for k in set(act)|set(ex[t])))
    print(r['start'][11:],r['set'],'时长',round(dur,1),'实际',sum(act.values()),'| 预计 高',sum(ex['high'].values()),'中',sum(ex['medium'].values()),'低',sum(ex['low'].values()),'| 最接近',best,'| GPU截断告警',r['trunc'])
    res.append({'start':r['start'],'settings':r['set'],'durationS':dur,'actual':dict(act),'expected':{t:dict(v) for t,v in ex.items()},'closest':best,'gpuTruncWarnings':r['trunc']})
json.dump(res,open('merged-log-compare.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
