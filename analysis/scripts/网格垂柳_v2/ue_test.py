# Python 2.7 compatible. Temporary test only. Never save level/assets.
import unreal,json,sys,types,math
SB='/Game/Effects_HD/_Sandbox/MW2_Verify_20261016'
PREFIX='MW2V_'

def state():
 m=sys.modules.get('mw2v_state')
 if m is None:
  m=types.ModuleType('mw2v_state');m.d={};sys.modules['mw2v_state']=m
 return m.d

def flat(x):
 if isinstance(x,(tuple,list)):
  out=[]
  for y in x:out+=flat(y)
  return out
 return [x]

def console(c):unreal.SystemLibrary.execute_console_command(unreal.EditorLevelLibrary.get_editor_world(),c)
def vec(x):return unreal.Vector(float(x[0]),float(x[1]),float(x[2]))
def rot(x):return unreal.Rotator(pitch=float(x[0]),yaw=float(x[1]),roll=float(x[2]))
def camera(loc,r):unreal.EditorLevelLibrary.set_level_viewport_camera_info(vec(loc),rot(r))

def start(outdir):
 st=state()
 if st.get('running'):raise RuntimeError('Already running')
 if any(a.get_actor_label().startswith(PREFIX) for a in unreal.EditorLevelLibrary.get_all_level_actors()):raise RuntimeError('Temporary actors already exist')
 cam=flat(unreal.EditorLevelLibrary.get_level_viewport_camera_info());v=[x for x in cam if isinstance(x,unreal.Vector)][0];r=[x for x in cam if isinstance(x,unreal.Rotator)][0]
 st.clear();st.update({'running':False,'done':False,'error':None,'outdir':outdir,'camera0':[[v.x,v.y,v.z],[r.pitch,r.yaw,r.roll]],'actors':{},'i':0,'t':0.0,'frame':0,'frozen':False,'wait':0,'queue':[],'shots':[],'samples':[]})
 for n in ['PS_CrossR','PS_GrainR','PS_LockR','PS_MobileR','PS_FixedR']:
  a=unreal.EditorLevelLibrary.spawn_actor_from_object(unreal.load_asset(SB+'/'+n),unreal.Vector(0,0,200000),unreal.Rotator())
  a.set_actor_label(PREFIX+n);c=a.get_component_by_class(unreal.ParticleSystemComponent);c.deactivate();st['actors'][n]=[a,c]
 # All effects at (0,0,200000). Neutral elevated empty test location, not performance baseline.
 cams={'front':[[-110000,0,200000],[0,0,0]],'side90':[[0,-110000,200000],[0,90,0]],'move50':[[-110000,5000,200000],[0,-2.603,0]],'below':[[-700,0,100000],[89.6,0,0]],'game':[[-100000,0,160000],[21.801,0,0]]}
 st['cams']=cams
 st['runs']=[
 {'name':'PS_CrossR','dur':8.5,'times':[[2,['game']],[4,['front','side90','move50','below','game']],[6,['game']],[7.5,['game']]]},
 {'name':'PS_GrainR','dur':5,'times':[[4,['front','game']]]},
 {'name':'PS_LockR','dur':5,'times':[[4,['front','side90','move50','below','game']]]},
 {'name':'PS_MobileR','dur':5,'times':[[4,['front','game']]]},
 {'name':'PS_FixedR','dur':6,'times':[[0.5,['game']],[1,['game']],[2,['game']],[4,['game']]]}
 ]
 for x in st['runs']:x['started']=False
 console('FX.FreezeParticleSimulation 0');st['handle']=unreal.register_slate_post_tick_callback(tick);st['running']=True
 return {'started':True,'runs':len(st['runs']),'camera0':st['camera0']}

def tick(dt):
 st=state()
 if not st.get('running'):return
 try:step(dt)
 except Exception as e:
  st['error']=repr(e);st['running']=False
  try:console('FX.FreezeParticleSimulation 0')
  except Exception:pass

def step(dt):
 st=state();st['frame']+=1
 if st['frozen']:
  st['wait']-=1
  if st['wait']>0:return
  if st['queue']:
   action=st['queue'].pop(0)
   if action[0]=='cam':camera(*st['cams'][action[1]]);st['wait']=5
   else:
    f=st['outdir']+'/'+st['runs'][st['i']]['name']+'_t%04.1f_'%st['t']+action[1]+'.png'
    console('HighResShot 1280x720 filename='+f);st['shots'].append({'file':f,'t':round(st['t'],4),'camera':action[1],'run':st['runs'][st['i']]['name'],'particles':st['actors'][st['runs'][st['i']]['name']][1].get_num_active_particles()});st['wait']=8
   return
  st['actors'][st['runs'][st['i']]['name']][1].set_component_tick_enabled(True)
  console('FX.FreezeParticleSimulation 0');st['frozen']=False;return
 if st['i']>=len(st['runs']):st['running']=False;st['done']=True;return
 run=st['runs'][st['i']];comp=st['actors'][run['name']][1]
 if not run['started']:
  camera(*st['cams']['game']);comp.activate(True);run['started']=True;st['t']=0;return
 st['t']+=dt
 n=comp.get_num_active_particles()
 st['samples'].append({'run':run['name'],'t':round(st['t'],4),'dt':round(dt,5),'particles':n})
 if run['times'] and st['t']>=run['times'][0][0]:
  sh=run['times'].pop(0);comp.set_component_tick_enabled(False);console('FX.FreezeParticleSimulation 1');st['frozen']=True;st['wait']=3
  for c in sh[1]:st['queue']+=[['cam',c],['shot',c]]
  return
 if st['t']>=run['dur']:comp.deactivate();st['i']+=1

def status():
 st=state();r={k:st.get(k) for k in ['running','done','error','i','t','frame','shots','samples']}
 if not st.get('running') and st.get('outdir'):
  with open(st['outdir']+'/test_final.json','w') as f:json.dump(r,f)
 return r

def cleanup():
 st=state();h=st.get('handle')
 if h is not None:unreal.unregister_slate_post_tick_callback(h);st['handle']=None
 st['running']=False;console('FX.FreezeParticleSimulation 0');n=0
 for a in unreal.EditorLevelLibrary.get_all_level_actors():
  if a.get_actor_label().startswith(PREFIX):unreal.EditorLevelLibrary.destroy_actor(a);n+=1
 if st.get('camera0'):camera(*st['camera0'])
 return {'removed':n,'cameraRestored':bool(st.get('camera0')),'remaining':len([a for a in unreal.EditorLevelLibrary.get_all_level_actors() if a.get_actor_label().startswith(PREFIX)])}
