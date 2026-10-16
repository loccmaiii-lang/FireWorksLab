# ASCII Python 2.7 compatible. Temporary actors and reversible console settings only.
import unreal,json,sys,types,math
PS='/Game/Effects_HD/_Sandbox/MW2_Verify_20261016/PS_FixedR'
PREFIX='MWQ17_'
KEYS=['r.SceneColorFormat','r.DetailLevel','r.EmitterSpawnRateScale','sg.EffectsQuality','sg.TextureQuality','sg.PostProcessQuality','sg.AntiAliasingQuality','sg.ShadowQuality','sg.ViewDistanceQuality','sg.FoliageQuality','sg.ResolutionQuality','r.MaterialQualityLevel','r.ParticleLODBias','r.DetailMode','r.BloomQuality','r.EyeAdaptationQuality','r.PostProcessAAQuality','r.Tonemapper.Quality','r.ScreenPercentage','r.SeparateTranslucency','r.RefractionQuality','r.MaxAnisotropy','r.Streaming.MipBias']
def st():
 m=sys.modules.get('mwq17')
 if m is None:m=types.ModuleType('mwq17');m.d={};sys.modules['mwq17']=m
 return m.d
def world():return unreal.EditorLevelLibrary.get_editor_world()
def cmd(s):unreal.SystemLibrary.execute_console_command(world(),s)
def flat(x):
 if isinstance(x,(list,tuple)):
  r=[]
  for y in x:r+=flat(y)
  return r
 return [x]
def cv():
 r={}
 for k in KEYS:
  getter=unreal.SystemLibrary.get_console_variable_float_value if k in ['r.Streaming.MipBias','r.ScreenPercentage','sg.ResolutionQuality','r.EmitterSpawnRateScale'] else unreal.SystemLibrary.get_console_variable_int_value
  r[k]=getter(k)
 return r
def camset(c):unreal.EditorLevelLibrary.set_level_viewport_camera_info(unreal.Vector(*c[0]),unreal.Rotator(pitch=c[1][0],yaw=c[1][1],roll=c[1][2]))
def capture(stage):
 d=st();c=d['comp'];p=d['out']+'/'+stage+'.png';cmd('HighResShot 1280x720 filename='+p)
 d['shots'].append({'stage':stage,'file':p,'t':d['t'],'n':c.get_num_active_particles(),'cvars':cv()})
def start(out,ps=None,series=False):
 d=st()
 if d.get('running'):raise RuntimeError('test running')
 if any(a.get_actor_label().startswith(PREFIX) for a in unreal.EditorLevelLibrary.get_all_level_actors()):raise RuntimeError('old test actors present')
 x=flat(unreal.EditorLevelLibrary.get_level_viewport_camera_info());v=next(i for i in x if isinstance(i,unreal.Vector));r=next(i for i in x if isinstance(i,unreal.Rotator))
 d.clear();d.update({'running':True,'error':None,'done':False,'out':out,'original':cv(),'camera':[[v.x,v.y,v.z],[r.pitch,r.yaw,r.roll]],'t':0.0,'frame':0,'samples':[],'shots':[],'phase':0,'wait':0,'series':series})
 a=unreal.EditorLevelLibrary.spawn_actor_from_object(unreal.load_asset(ps or PS),unreal.Vector(371600,-829500,38000),unreal.Rotator());a.set_actor_label(PREFIX+'quality');c=a.get_component_by_class(unreal.ParticleSystemComponent);d['actor']=a;d['comp']=c
 camset([[371600,-720000,38000],[0,-90,0]])
 if series:
  d['times']=[0.25,0.5,1,2,4,6,8,10,12,14,16,17,18,20,24,28,32,34]
  d['stage']='series'
 else:
  d['stage']='compare'
 c.activate(True);d['h']=unreal.register_slate_post_tick_callback(tick)
 return {'started':True,'original':d['original']}
def tick(dt):
 d=st()
 if not d.get('running'):return
 try:
  d['frame']+=1;c=d['comp']
  if d['series']:
   d['t']+=dt;d['samples'].append([round(d['t'],4),round(dt,5),c.get_num_active_particles()])
   if d['times'] and d['t']>=d['times'][0]:capture('t%05.2f'%d['times'].pop(0))
   if d['t']>=35:d['running']=False;d['done']=True;dump()
   return
  if d['phase']==0:
   d['t']+=dt
   if d['t']<4:return
   c.set_component_tick_enabled(False);d['phase']=1;d['wait']=20;return
  if d['wait']>0:d['wait']-=1;return
  actions=[('baseline',[]),('low_sampling',['r.MaxAnisotropy 0']),('high_sampling',['r.MaxAnisotropy 8']),('low_filter',['r.BloomQuality 0','r.EyeAdaptationQuality 0','r.PostProcessAAQuality 0','r.Tonemapper.Quality 0','r.MaxAnisotropy 0','r.SeparateTranslucency 0']),('high_filter',['r.BloomQuality 4','r.EyeAdaptationQuality 2','r.PostProcessAAQuality 4','r.Tonemapper.Quality 5','r.MaxAnisotropy 8','r.SeparateTranslucency 1'])]
  i=(d['phase']-1)//2
  if i>=len(actions):d['running']=False;d['done']=True;dump();return
  name,commands=actions[i]
  if d['phase']%2:
   for s in commands:cmd(s)
   d['wait']=30;d['phase']+=1
  else:capture(name);d['wait']=12;d['phase']+=1
 except Exception as e:d['error']=repr(e);d['running']=False;dump()
def dump():
 d=st();r={k:d.get(k) for k in ['running','error','done','original','camera','t','frame','samples','shots']}
 with open(d['out']+'/test.json','w') as f:json.dump(r,f)
 return r
def status():
 d=st();return {'running':d.get('running'),'done':d.get('done'),'error':d.get('error'),'t':d.get('t'),'shots':len(d.get('shots',[])),'frame':d.get('frame')}
def cleanup(restore=True):
 d=st()
 if d.get('h') is not None:unreal.unregister_slate_post_tick_callback(d['h']);d['h']=None
 d['running']=False
 for k in KEYS:
  if restore and k.startswith('sg.') and k in d.get('original',{}):cmd(k+' '+str(d['original'][k]))
 for k in KEYS:
  if restore and not k.startswith('sg.') and k in d.get('original',{}):cmd(k+' '+str(d['original'][k]))
 n=0
 for a in unreal.EditorLevelLibrary.get_all_level_actors():
  if a.get_actor_label().startswith(PREFIX):unreal.EditorLevelLibrary.destroy_actor(a);n+=1
 if d.get('camera'):camset(d['camera'])
 return {'removed':n,'remaining':len([a for a in unreal.EditorLevelLibrary.get_all_level_actors() if a.get_actor_label().startswith(PREFIX)]),'restored':cv()}
