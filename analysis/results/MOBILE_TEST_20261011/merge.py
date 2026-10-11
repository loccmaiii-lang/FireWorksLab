import json,collections,copy
D='F:/FireWorksLab/FXtools/节目/NewYearFireWorks_v01/'
T={t:json.load(open(D+f'三表-R03-{t}.json',encoding='utf-8')) for t in ['high','medium','low']}
def occ(t):
    tp={p['TemplateName']:p for p in t['EffectTemplates']};S=collections.Counter()
    for g in t['EffectScheduleGroups']:
        for s in g['Slots']:
            for e in tp[s['TemplateName']]['Entries']:
                S[(g['GroupName'],round(s['StartTime']+e['LocalTimeOffset'],3),e['SlotIndex'],e['SubTemplateName'])]+=1
    return S
M,L=occ(T['medium']),occ(T['low'])
H=T['high'];tp={p['TemplateName']:p for p in H['EffectTemplates']}
F=lambda q:{'PlatformFlags':14,'MinQualityLevel':q}
parents={};sched=collections.defaultdict(list)
for g in H['EffectScheduleGroups']:
    for s in g['Slots']:
        p=copy.deepcopy(tp[s['TemplateName']]);st=round(s['StartTime'],3)
        for e in p['Entries']:
            k=(g['GroupName'],round(s['StartTime']+e['LocalTimeOffset'],3),e['SlotIndex'],e['SubTemplateName'])
            e['Filter']=F('EQuality_VeryLow' if L[k] else 'EQuality_Medium' if M[k] else 'EQuality_High')
        sig=json.dumps(p['Entries'],sort_keys=True)
        name=parents.setdefault(sig,(p['TemplateName'] if p['TemplateName'] not in [v[0] for v in parents.values()] else p['TemplateName'][:-2]+f'{len(parents):02d}',p))[0]
        sched[g['GroupName']].append({'StartTime':s['StartTime'],'TemplateName':name,'Filter':F('EQuality_VeryLow')})
merged={'format':'df.director-delivery/merged-test','note':'R03三档合一：低配条目VeryLow、中配追加Medium、高配追加High；仅测试候选，未进工作台',
 'EffectSubTemplates':H['EffectSubTemplates'],
 'EffectTemplates':[dict(v[1],TemplateName=v[0]) for v in parents.values()],
 'EffectScheduleGroups':[{'GroupName':g,'Slots':sl} for g,sl in sched.items()]}
# verify
order=['EQuality_VeryLow','EQuality_Low','EQuality_Medium','EQuality_High','EQuality_VeryHigh']
def occq(t,q):
    tp={p['TemplateName']:p for p in t['EffectTemplates']};S=collections.Counter()
    for g in t['EffectScheduleGroups']:
        for s in g['Slots']:
            for e in tp[s['TemplateName']]['Entries']:
                if order.index(e['Filter']['MinQualityLevel'])<=order.index(q):
                    S[(g['GroupName'],round(s['StartTime']+e['LocalTimeOffset'],3),e['SlotIndex'],e['SubTemplateName'])]+=1
    return S
chk={'VeryLow==low':occq(merged,'EQuality_VeryLow')==L,'Low==low':occq(merged,'EQuality_Low')==L,'Medium==medium':occq(merged,'EQuality_Medium')==M,'High==high':occq(merged,'EQuality_High')==occ(H),'VeryHigh==high':occq(merged,'EQuality_VeryHigh')==occ(H)}
cnt=collections.Counter(e['Filter']['MinQualityLevel'] for p in merged['EffectTemplates'] for e in p['Entries'])
merged['check']={**chk,'subTemplates':len(merged['EffectSubTemplates']),'templates':len(merged['EffectTemplates']),'slots':sum(len(g['Slots']) for g in merged['EffectScheduleGroups']),'entryFilters':dict(cnt),'tierTemplates':{t:len(T[t]['EffectTemplates']) for t in T}}
json.dump(merged,open('三表-R03-单表嵌套-测试.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print(json.dumps(merged['check'],ensure_ascii=False))
