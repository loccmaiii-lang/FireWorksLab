# 第2步修订盒：以UE每帧组件CPU动态盒作为保守底线，联合原模块模型（含GPU、半尺寸、Pivot、世界力）。
# 坐标：每个测量情形的世界盒8角 -> 组件本地（除缩放、逆转） -> 全情形联合，再10%余量/10cm向外取整。
# 不把动态盒当可见边界、不统一乘修正系数。矢量场两个模型近似系统暂不收小固定盒；他人锁定GoldKamuro不写。
import json,math,os,sys
HERE=os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0,os.path.join(os.path.dirname(HERE),'采集'))
from cascade_model import rot_matrix,world_to_local


def local_box(mn,mx,s,p,r):
    mat=rot_matrix(p,0,r)
    pts=[world_to_local(mat,(x/s,y/s,z/s)) for x in (mn[0],mx[0]) for y in (mn[1],mx[1]) for z in (mn[2],mx[2])]
    return [[min(v[i] for v in pts),max(v[i] for v in pts)] for i in range(3)]


def margin(box):
    final=[]
    for lo,hi in box:
        c=(lo+hi)/2;h=(hi-lo)/2*1.1
        final.append([math.floor((c-h)/10)*10,math.ceil((c+h)/10)*10])
    return final


def build():
    d=json.load(open(os.path.join(os.path.dirname(HERE),'干跑.json'),encoding='utf-8'))
    t=json.load(open(os.path.join(HERE,'targets.json'),encoding='utf-8'))
    measured=json.load(open(os.path.join(HERE,'原生范围_全体分组.json'),encoding='utf-8'))
    ms={s['name']:s for s in measured['systems']}
    ds={s['name']:s for s in d['systems']}
    checks=[]
    for s in t['systems']:
        name=s['name'];x=ds[name];skip=[]
        if name=='P_EFX_FireWorks_GoldKamuro_HD':skip.append('P4被他人迁出；不写整个粒子系统')
        if x['bounds']['approx'] or x['bounds']['unsupported']:skip.append('矢量场/未建模模块缺原生GPU粒子位置上界；保留原Bounds，不能标完整验收')
        record=ms.get(name)
        if record is None and not skip:raise RuntimeError('未原生实测 '+name)
        raw=[list(v) for v in x['bounds']['raw']]
        native=[]
        if record:
            expected=json.load(open(os.path.join(HERE,'measure_cases.json'),encoding='utf-8'))
            lods=json.load(open(os.path.join(HERE,'lod_cases.json'),encoding='utf-8'))
            expected_keys={(c['s'],c['pitch'],c['roll'],0) for c in expected if c['name']==name}
            expected_keys.update((c['s'],0,0,l) for c in expected if c['name']==name and not c['pitch'] and not c['roll'] for l in range(1,lods[name]))
            actual_keys={(c['s'],c['pitch'],c['roll'],c['lod']) for c in record['cases']}
            if expected_keys!=actual_keys or len(record['cases'])!=len(actual_keys):raise RuntimeError('测量情形不齐/重复 '+name)
            if record['notes']:raise RuntimeError('实测出现终止/LOD异常 '+name+str(record['notes']))
            for c in record['cases']:
                m=c['measured']
                if m['lastParticles']!=0 or not m['n'] or m['min'] is None:raise RuntimeError('粒子未耗尽或空测 '+name)
                bb=local_box(m['min'],m['max'],c['s'],c['pitch'],c['roll'])
                native.append({'s':c['s'],'pitch':c['pitch'],'roll':c['roll'],'lod':c['lod'],'box':bb,'maxParticles':m['maxParticles'],'samples':m['n']})
                raw=[[min(raw[i][0],bb[i][0]),max(raw[i][1],bb[i][1])] for i in range(3)]
        final=margin(raw)
        s['skipSystem']=name=='P_EFX_FireWorks_GoldKamuro_HD'
        s['writeBounds']=not bool(skip)
        s['boundsSkipReasons']=skip
        s['boundsOriginalPlan']=s['bounds']
        s['bounds']={'min':[b[0] for b in final],'max':[b[1] for b in final]}
        checks.append({'name':name,'writeBounds':s['writeBounds'],'skipSystem':s['skipSystem'],'reasons':skip,'unionBeforeMargin':raw,'final':final,'nativeCases':native})
    t['counts'].update({'actualSystemsToSave':sum(not s['skipSystem'] and (s['writeBounds'] or bool(s['emitters'])) for s in t['systems']),'boundsToSave':sum(s['writeBounds'] for s in t['systems']),'boundsPending':sum(not s['writeBounds'] for s in t['systems'])})
    t['note']='12:28第2步接续；修订盒=原模块包络并UE全寿命CPU动态盒，10%余量。矢量场两系统Bounds未改；GoldKamuro他人锁定。第三步不做。'
    json.dump(t,open(os.path.join(HERE,'final_targets.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
    json.dump(checks,open(os.path.join(HERE,'包围盒修订核对.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
    print('system writes',t['counts']['actualSystemsToSave'],'bounds writes',t['counts']['boundsToSave'],'materials',len(t['materials']))
    return t,checks


if __name__=='__main__':build()
