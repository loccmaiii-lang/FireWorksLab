"""由真实烘焙组件组装彩千轮事件候选；不连接UE、不伪造实测。"""
from pathlib import Path
import copy
import hashlib
import json
import shutil

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'analysis/results/PRISM3_20261016'


def lin(h):
    a=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    return [round(x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4,6) for x in a]


def constant(m,key,v):return {'m':m,key:{'const':v}}


def main():
    dest=OUT/'候选包/PrismWheels3';dest.mkdir(parents=True,exist_ok=True)
    d={'format':'fwl.cascade/1','name':'PrismWheels3','platform':'pc',
       'source':{'tool':'烟花母版烘焙器 4.9.110 + prism3_assemble.py','type':'senrin','form':'cpu_event_chain',
                 'status':'制作中：主爆时刻未实测，未经UE验证'},
       'textures':{},'materials':{'dot':{'role':'soft_dot'},'flash':{'role':'glow'}},
       'system':{'preview_distance_cm':100000,'preview_warmup_s':0},'emitters':[],
       'notes':['PC专用；用户明确手游没有彩千轮。',
                '三个独立Death事件，各只生成一颗小割；自主Rate/Burst为零。',
                '飞行时间暂估0.4–1.1秒；原剪辑不能确认主爆零点，未标待验收。',
                'Size随机沿点灭星±5%；Square仅采X，避免Rectangle独立抽XY变形。',
                '随机色沿实际点灭星RGB范围，ColorScaleOverLife乘色，不用ColorOverLife覆盖。']}
    d['emitters'].append({'name':'Flash','material':'flash','gpu':False,
      'required':{'screen_alignment':'Square','duration_s':.12,'loops':1,'delay_s':0,'local_space':False,'max_draw_count':1},
      'spawn':{'rate':{'const':0},'bursts':[[0,1]]},'modules':[
        constant('Lifetime','Lifetime',.12),constant('InitialSize','StartSize',[1000,1000,1]),
        {'m':'ColorOverLife','ColorOverLife':{'const':lin('#ffb060')},'AlphaOverLife':{'curve':[[0,.5],[.25,.18],[1,0]]}}]})
    for tag,n,h in [('A',6,'#ff78b0'),('B',5,'#97ff76'),('C',5,None)]:
        name='Bloom'+tag
        d['emitters'].append({'name':'Carrier'+tag,'material':'dot','gpu':False,
          'required':{'screen_alignment':'Square','duration_s':1.2,'loops':1,'delay_s':0,'local_space':False,'max_draw_count':n},
          'spawn':{'rate':{'const':0},'bursts':[[0,n]]},'modules':[
            {'m':'Lifetime','Lifetime':{'uniform':[.4,1.1]}},
            {'m':'SphereLocation','StartRadius':{'const':1},'SurfaceOnly':True,'Velocity':True,'VelocityScale':{'uniform':[14500,21500]}},
            constant('Drag','DragCoefficientRaw',4),{'m':'ConstAcceleration','Acceleration':[0,0,-981]},
            {'m':'InitialSize','StartSize':{'uniform':[[95,0,0],[105,0,0]]}},
            {'m':'ColorOverLife','ColorOverLife':{'const':lin('#ffb060')},'AlphaOverLife':{'curve':[[0,1],[.85,1],[1,.85]]}},
            {'m':'EventGenerator','Events':[{'Type':'EPET_Death','CustomName':name,'Frequency':1,'ParticleFrequency':1}]}]})
        src=OUT/'组件'/('PRISM3-'+tag)
        unit=json.loads((src/'cascade.json').read_text(encoding='utf-8'))
        for key,t in unit['textures'].items():
            d['textures'][tag+'_'+key]=copy.deepcopy(t);shutil.copy2(src/t['file'],dest/t['file'])
        for key,m in unit['materials'].items():
            q=copy.deepcopy(m);q['textures']={k:tag+'_'+v for k,v in q.get('textures',{}).items()};d['materials'][tag+'_'+key]=q
        assert len(unit['emitters'])==1,'小割必须只有一段，不能丢掉其他分段'
        e=copy.deepcopy(unit['emitters'][0]);e['name']=name;e['material']=tag+'_'+e['material']
        e['required'].update(screen_alignment='Square',duration_s=1.2,delay_s=0,loops=1,local_space=False,max_draw_count=n)
        if e['required'].get('cutout'):e['required']['cutout']=tag+'_'+e['required']['cutout']
        e['spawn']={'rate':{'const':0},'bursts':[]}
        e['modules']=[x for x in e['modules'] if x['m'] not in ['InitialLocation','ColorOverLife','ColorScaleOverLife']]
        for m in e['modules']:
            if m['m']=='InitialSize':
                size=m['StartSize']['const'][0];m['StartSize']={'uniform':[[round(size*.95,2),0,0],[round(size*1.05,2),0,0]]}
        e['modules'].extend([
          {'m':'EventReceiverSpawn','EventGeneratorType':'EPET_Death','EventName':name,'SpawnCount':{'const':1},
           'bUseParticleTime':False,'bUsePSysLocation':False,'bInheritVelocity':True,'InheritVelocityScale':{'const':[.35,.35,.35]}},
          constant('Drag','DragCoefficientRaw',1.6),{'m':'ConstAcceleration','Acceleration':[0,0,-200]},
          {'m':'InitialRotation','StartRotation':{'uniform':[0,1]}}])
        if h:
            e['modules'].append({'m':'ColorOverLife','ColorOverLife':{'curve':[[0,lin(h)],[.35,lin(h)],[.60,lin('#ffd278')],[1,lin('#ff9a46')]]},'AlphaOverLife':{'const':1}})
        else:
            e['modules'].append({'m':'InitialColor','StartColor':{'uniform':[[.015148,0,0],[1,.42806,1]]},'StartAlpha':{'const':1}})
        e['modules'].append({'m':'ColorScaleOverLife','ColorScaleOverLife':{'const':[1,1,1]},'AlphaScaleOverLife':{'const':1}})
        d['emitters'].append(e)
    d['source']['components_sha256']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in dest.glob('*.png')}
    (dest/'cascade.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
    print(dest)


if __name__=='__main__':main()
