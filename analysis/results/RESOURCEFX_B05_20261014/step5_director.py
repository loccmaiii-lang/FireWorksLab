# 第 5 步：判断 Night 导演是哪一版（离线比对已读回的 导演读回_原始.json 与各版一张表；只读）
import json,glob,os
n=json.load(open('analysis/results/RESOURCEFX_B05_20261014/导演读回_原始.json',encoding='utf8'))
c=n['config']
def norm(x):
    if isinstance(x,float): return round(x,3)
    if isinstance(x,dict): return {k:norm(v) for k,v in x.items() if k!='_struct'}
    if isinstance(x,list): return [norm(v) for v in x]
    return x
def close(a,b):  # 浮点按 UE float32 容差（绝对 1e-3 或相对 1e-5），忽略读回带的 _struct
    if isinstance(b,dict): return isinstance(a,dict) and all(close(a.get(k),v) for k,v in b.items())
    if isinstance(b,list): return isinstance(a,list) and len(a)==len(b) and all(close(x,y) for x,y in zip(a,b))
    if isinstance(b,(int,float)) and isinstance(a,(int,float)) and not isinstance(b,bool): return abs(a-b)<=max(1e-3,abs(b)*1e-5)
    return a==b
def stats(d):
    return {'subTemplates':len(d['EffectSubTemplates']),'templates':len(d['EffectTemplates']),'groups':len(d['EffectScheduleGroups']),
     'slots':sum(len(g['Slots']) for g in d['EffectScheduleGroups']),'subEntries':sum(len(s['Entries']) for s in d['EffectSubTemplates'])}
def diff(a,b):
    out=[]
    for key,name,lst in [('EffectSubTemplates','TemplateName','Entries'),('EffectTemplates','TemplateName','Entries'),('EffectScheduleGroups','GroupName','Slots')]:
        A={x[name]:x for x in a[key]};B={x[name]:x for x in b[key]}
        for k in sorted(set(A)|set(B)):
            if k not in A or k not in B: out.append((key,k,'只在'+('B' if k not in A else 'Night')));continue
            if not close(A[k][lst],B[k][lst]): out.append((key,k,'内容不同'))
    return out
res={'format':'df.director-version-check/1','readAt':n['time'],'target':n['target'],'night':stats(c),'duration':c.get('TotalDuration'),
 'nightResourceIds':sorted({e['FXResourceId'] for s in c['EffectSubTemplates'] for e in s['Entries']}),'candidates':[]}
for f in sorted(glob.glob('FXtools/节目/NewYearFireWorks_v01/导演表-*一张表.json')):
    d=json.load(open(f,encoding='utf8'));s=stats(d);df=diff(c,d)
    res['candidates'].append({'file':os.path.basename(f),**s,'differences':len(df),'sample':df[:5]})
best=min(res['candidates'],key=lambda x:x['differences'])
res['verdict']={'matches':best['file'] if best['differences']==0 else None,'closest':best['file'],'closestDifferences':best['differences'],'isB05':'B05' in best['file'] and best['differences']==0}
pcIds=set(r['ResourceId'] for r in json.load(open('analysis/results/RESOURCEFX_B05_20261014/读回.json',encoding='utf8'))['pc'])
res['nightIdsMissingInPc']=[i for i in res['nightResourceIds'] if i not in pcIds]
json.dump(res,open('analysis/results/RESOURCEFX_B05_20261014/导演核对.json','w',encoding='utf8'),ensure_ascii=False,indent=1)
for x in res['candidates']:print(x['file'][:50],x['subTemplates'],x['templates'],x['slots'],'diff',x['differences'])
print(res['verdict'],res['night'],'missingInPc',res['nightIdsMissingInPc'])
