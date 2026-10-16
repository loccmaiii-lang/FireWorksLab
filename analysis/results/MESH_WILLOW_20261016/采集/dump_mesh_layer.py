import json,sys
d=json.load(open('hero_raw.json',encoding='utf-8'))
O=d['objects']
root=d['roots'][0]
ps=O[root]['properties']
print('PS keys:', {k:ps.get(k) for k in ['UpdateTime_FPS','WarmupTime','LODDistances','bUseFixedRelativeBoundingBox','FixedRelativeBoundingBox','SystemUpdateMode','Delay','bOrientZAxisTowardCamera','LODMethod']})
def g(p): return (O.get(p) or {}).get('properties',{})
def dist(v,depth=0):
    # resolve distribution object refs into compact text
    if isinstance(v,dict) and v.get('_type')=='object_ref':
        o=O.get(v['path'])
        if not o: return 'REF '+v['path'].split(':')[-1]
        c=o['class'].split('.')[-1]; p=o['properties']
        keep={k:p[k] for k in p if k in('Constant','Min','Max','ConstantCurve','bUseExtremes','bLockAxes','LockedAxes','MinValue','MaxValue','ParameterName','bIsDirty')}
        return {c:keep}
    if isinstance(v,dict):
        return {k:dist(x,depth+1) for k,x in v.items() if k not in('_struct',)}
    if isinstance(v,list): return [dist(x,depth+1) for x in v]
    return v
emitters=ps['Emitters']
for ei,e in enumerate(emitters):
    ep=g(e['path'])
    lods=ep.get('LODLevels',[])
    l0=g(lods[0]['path']) if lods else {}
    td=l0.get('TypeDataModule')
    name=ep.get('EmitterName')
    if not td or 'Mesh' not in td.get('class',''):
        print(ei,name,'(skip)', td and td['class'].split('.')[-1]); continue
    print('\n==================== EMITTER',ei,name,'LODs',len(lods))
    print('Emitter props:', {k:ep.get(k) for k in ['SubUVDataSteps','EmitterRenderMode','bUseLegacySpawningBehavior','SignificanceLevel','bDisableWhenInsignficant','InitialAllocationCount','QualityLevelSpawnRateScale','DetailModeBitmask','bCollapsed','PeakActiveParticles']})
    print('TypeData:', json.dumps(dist(g(td['path'])),ensure_ascii=False)[:3000])
    req=g(l0['RequiredModule']['path'])
    print('Required:', json.dumps({k:dist(req[k]) for k in req if k not in('bEditable','LODValidity','bSupported3DDrawMode','bCurvesAsColor','ModuleEditorColor','b3DDrawMode','bSpawnModule','bUpdateModule','bFinalUpdateModule','bUpdateForGPUEmitter','bRequiresLoopingNotification')},ensure_ascii=False)[:3500])
    sp=l0.get('SpawnModule')
    if sp: print('Spawn:', json.dumps({k:dist(v) for k,v in g(sp['path']).items() if k in('Rate','RateScale','BurstList','BurstScale','ProcessSpawnRate','ProcessBurstList','ParticleBurstMethod')},ensure_ascii=False)[:2000])
    for m in l0.get('Modules',[]):
        mp=g(m['path'])
        c=m['class'].split('.')[-1].replace('ParticleModule','')
        keep={k:dist(v) for k,v in mp.items() if k not in('bEditable','LODValidity','bSupported3DDrawMode','bCurvesAsColor','ModuleEditorColor','b3DDrawMode','bSpawnModule','bUpdateModule','bFinalUpdateModule','bUpdateForGPUEmitter','bRequiresLoopingNotification','bSupportsRandomSeed','bRequiresLoopingNotification','RandomSeedInfo','Identifier','bCanTickInAnyThread')}
        print('  --',c,'enabled' if mp.get('bEnabled',True) else 'DISABLED', json.dumps(keep,ensure_ascii=False)[:2500])
    # other LODs differences summary
    for li,l in enumerate(lods[1:],1):
        ll=g(l['path']); print('  LOD',li,'enabled',ll.get('bEnabled'),'modules',len(ll.get('Modules',[])))
