"""Local data calibration; native units are centimetres and seconds."""
from __future__ import annotations
import copy
import hashlib
import json
import math
from pathlib import Path
import shutil
import sys

PRIVATE=Path(__file__).resolve().parent
REPORT=PRIVATE/'research'/'calibration-20261002'
DEST=Path(r'D:\ProjectTextures\FireWorksLab')
GRADES={
    'Small':{'rise_s':3.5,'height_m':190,'height_range_m':[180,200],'diameter_m':110,'diameter_range_m':[100,120]},
    'Medium':{'rise_s':5,'height_m':265,'height_range_m':[250,280],'diameter_m':190,'diameter_range_m':[180,200]},
    'Large':{'rise_s':8,'height_m':410,'height_range_m':[400,420],'diameter_m':290,'diameter_range_m':[280,300]},
}

def modules(emitter):
    return {m['m']:m for m in emitter['modules']}

def position_cm(emitter,t):
    m=modules(emitter)
    v=m['InitialVelocity']['StartVelocity']['const'][2]
    k=m['Drag']['DragCoefficientRaw']['const']
    a=m['ConstAcceleration']['Acceleration'][2]
    return (v-a/k)*(-math.expm1(-k*t))/k+a*t/k

def calibrate_trail(spec,name,duration,height_m):
    result=copy.deepcopy(spec)
    reference_rise=spec['emitters'][0]['required']['duration_s']
    source_fade=modules(spec['emitters'][1])['InitialLocation']['StartLocation']['const'][2]
    spatial=height_m*100/source_fade
    temporal=duration/reference_rise
    result['name']=name
    result['source']['calibration']={'reference':'TR2L_____V5','rise_s':duration,'height_m':height_m}
    for emitter in result['emitters']:
        req=emitter['required']
        req['local_space']=True  # Component scale then transforms the entire paired trajectory.
        req['duration_s']*=temporal
        req['delay_s']*=temporal
        for m in emitter['modules']:
            if m['m']=='Lifetime':m['Lifetime']['const']*=temporal
            elif m['m']=='InitialSize':
                m['StartSize']['const']=[x*spatial if i<2 else x for i,x in enumerate(m['StartSize']['const'])]
            elif m['m']=='InitialLocation':m['StartLocation']['const']=[x*spatial for x in m['StartLocation']['const']]
            elif m['m']=='InitialVelocity':m['StartVelocity']['const']=[x*spatial/temporal for x in m['StartVelocity']['const']]
            elif m['m']=='Drag':m['DragCoefficientRaw']['const']/=temporal
            elif m['m']=='ConstAcceleration':m['Acceleration']=[x*spatial/temporal**2 for x in m['Acceleration']]
    result['emitters'][0]['required']['duration_s']=duration
    modules(result['emitters'][0])['Lifetime']['Lifetime']['const']=duration
    result['emitters'][1]['required']['delay_s']=duration
    modules(result['emitters'][1])['InitialLocation']['StartLocation']['const'][2]=height_m*100
    result['system']['preview_distance_cm']=max(20000,round(height_m*100*1.5))
    report={'reference_rise_s':reference_rise,'reference_fade_height_m':source_fade/100,
        'reference_measured_height_m':600,'spatial_ratio':spatial,'temporal_ratio':temporal,
        'rise_s':duration,'fade_start_height_m':height_m,
        'predicted_rise_endpoint_m':position_cm(result['emitters'][0],duration)/100,
        'reference_model_endpoint_m':position_cm(spec['emitters'][0],reference_rise)/100,
        'native_playback_measurement':'not yet measured; user reference is approximately 600m',
        'local_space':True}
    return result,report

def vector(x=0,y=0,z=0):return {'X':x,'Y':y,'Z':z}

def paired_entries(trail_id,burst_id,rise_s,height_m,diameter_m,native_diameter_m,trail_height_m):
    def entry(resource,delay,position,scale):
        return {'FXResourceId':resource,'LocalTimeOffset':delay,'PositionOffset':position,
            'RotationOffset':{'Pitch':0,'Yaw':0,'Roll':0},'RandomPositionRange':vector(),
            'RandomRotationRange':{'Pitch':0,'Yaw':0,'Roll':0},'EffectScale':vector(scale,scale,scale),
            'RandomScaleRatio':0,'Filter':{'PlatformFlags':14,'MinQualityLevel':'EQuality_VeryLow'}}
    return [entry(trail_id,0,vector(),height_m/trail_height_m),
        entry(burst_id,rise_s,vector(z=height_m*100),diameter_m/native_diameter_m)]

def diameter(directory):
    sys.path.insert(0,r'F:\FireWorksLab\analysis\scripts')
    import importlib
    import numpy as np
    rc=importlib.import_module('回放检查')
    spec=json.loads((directory/'cascade.json').read_text('utf-8-sig'))
    measurements=[]
    for i in range(len(spec['emitters'])):
        pack=rc.Pack(str(directory),i)
        best=0
        # Every 30fps engine sample contributes, including SizeByLife if present.
        for j,frame in enumerate(pack.ticks()):
            u=min(1,(j+.5)/30/pack.life)
            cell=pack.cell(frame)
            ys,xs=np.where(cell>=.02)
            if xs.size:
                best=max(best,(xs.max()-xs.min()+1)/pack.cw*pack.size(u)[0]/100)
        measurements.append({'emitter':pack.e['name'],'visible_diameter_m':float(best)})
    result=max(m['visible_diameter_m'] for m in measurements)
    assert result>0
    return result,measurements

def save(path,data):
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')

def build():
    exports=json.loads((REPORT/'exports.json').read_text('utf-8'))
    source=json.loads((DEST/'TR2L_____V5'/'cascade.json').read_text('utf-8-sig'))
    sources={'QA19':'QiuXingA40','ZB5':'QiuXingB40','QC11':'QiuXingC40','QD13':'QiuXingD40',
        'QN11':'QingNing40','ZW5':'QianLun40','crossette-default40':'Crossette40'}
    output={'grades':GRADES,'trails':{},'bursts':[],
        'gold_reference':{'initial_size_range_cm':[2200,2400],'reference_scale':15,
            'average_quad_diameter_m':345,'measured_visual_diameter_m':300,
            'visible_fraction':300/345,'current_native_scale_readback':10,
            'method':'new packs use measured texture content extent; old gold asset remains unchanged'}}
    for grade,g in GRADES.items():
        name='TrailCal_'+grade+'_20261002'
        directory=DEST/name
        spec,report=calibrate_trail(source,name,g['rise_s'],g['height_m'])
        assert g['height_range_m'][0]<=report['predicted_rise_endpoint_m']<=g['height_range_m'][1]
        directory.mkdir(exist_ok=True)
        for texture in source['textures'].values():
            target=directory/texture['file']
            if not target.exists():shutil.copy2(DEST/'TR2L_____V5'/texture['file'],target)
        save(directory/'cascade.json',spec)
        mobile_source=DEST/'TR2L_____V5'/'cascade_mobile.json'
        if mobile_source.exists():
            mobile=json.loads(mobile_source.read_text('utf-8-sig'))
            calibrated_mobile,_=calibrate_trail(mobile,name+'_Mobile',g['rise_s'],g['height_m'])
            for texture in mobile['textures'].values():
                target=directory/texture['file']
                if not target.exists():shutil.copy2(mobile_source.parent/texture['file'],target)
            save(directory/'cascade_mobile.json',calibrated_mobile)
        output['trails'][grade]={'directory':str(directory),'as':'TrailCal'+grade+'_01',**report}
    for pack in exports['items']:
        directory=Path(pack['destination']); native,measurements=diameter(directory)
        base=sources[pack['entry']]
        output['bursts'].append({'entry':pack['entry'],'directory':str(directory),
            'as':base+'_01','base':base,'native_diameter_m':native,'measurements':measurements,
            'replay_pass':pack['replay_pass'],'replay_fails':pack['replay_fails'],
            'grade_scales':{k:g['diameter_m']/native for k,g in GRADES.items()}})
    save(REPORT/'calibration.json',output)
    print(json.dumps({'trails':{k:{n:t[n] for n in ['rise_s','fade_start_height_m','predicted_rise_endpoint_m']} for k,t in output['trails'].items()},
        'bursts':[{k:b[k] for k in ['entry','native_diameter_m','grade_scales']} for b in output['bursts']]},ensure_ascii=False,indent=2))

if __name__=='__main__':
    build()
