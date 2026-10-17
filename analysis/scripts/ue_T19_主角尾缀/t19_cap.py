# T19 补测：SceneCapture2D 侧视逐时刻抓帧，量尾缀星头到顶高度。
# 不保存任何资产/地图；只建 WB19_ 前缀 Actor 和 Transient RT；结束后全部销毁。
# 相机：水平（pitch 0）看向 +Y，目标竖直线在已知深度 D 上，像素→高度是精确线性关系（见 t19_measure.py）。
import unreal,json,sys,types
KEY='wb19_cap'
PREFIX='WB19_'
if KEY not in sys.modules:
 _m=types.ModuleType(KEY);_m.d={};sys.modules[KEY]=_m
def st():return sys.modules[KEY].d
def world():return unreal.EditorLevelLibrary.get_editor_world()
def resolve(p):return unreal.find_object(None,p)
def snap():
 d=st();return {'running':d.get('running'),'done':d.get('done'),'error':d.get('error'),'elapsed':d.get('elapsed'),'actors':len(d.get('actors',[])),'shots':d.get('shots',[]),'frames':len(d.get('trace',[])),'h':str(d.get('h'))}
def dump():
 d=st()
 if d.get('cfg'):
  with open(d['cfg']['folder']+'/trace.json','w') as f:json.dump(dict(snap(),cfg=d['cfg'],flags=d.get('flags'),trace=d.get('trace',[])),f,indent=1)
def clean():
 d=st();d['running']=False
 if d.get('h') is not None:
  unreal.unregister_slate_post_tick_callback(d['h']);d['h']=None
 n=0
 for a in unreal.EditorLevelLibrary.get_all_level_actors():
  if a.get_actor_label().startswith(PREFIX):
   unreal.EditorLevelLibrary.destroy_actor(a);n+=1
 d['actors']=[];d['cap']=None
 return n
def flags(c):
 out=[]
 for name in ['TemporalAA','AntiAliasing','MotionBlur','Bloom','EyeAdaptation','Fog','AtmosphericFog','VolumetricFog','LensFlares','DepthOfField']:
  s=unreal.EngineShowFlagsSetting();s.set_editor_property('show_flag_name',name);s.set_editor_property('enabled',False);out.append(s)
 c.set_editor_property('show_flag_settings',out)
 return [str(s.get_editor_property('show_flag_name')) for s in c.get_editor_property('show_flag_settings')]
def begin(cfg):
 d=st()
 assert d.get('h') is None and not d.get('running')
 assert not any(a.get_actor_label().startswith(PREFIX) for a in unreal.EditorLevelLibrary.get_all_level_actors())
 for it in cfg['items']:assert resolve(it['source']) is not None, it['source']
 d.clear();d.update({'cfg':cfg,'actors':[],'shots':[],'trace':[],'running':False,'h':None,'done':False,'error':None,'elapsed':0.0,'index':0})
 try:
  v,r=cfg['camera']
  cap=unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.SceneCapture2D,unreal.Vector(*v),unreal.Rotator(pitch=r[0],yaw=r[1],roll=r[2]))
  cap.set_actor_label(PREFIX+'Cap');d['actors'].append(cap.get_path_name())
  c=cap.get_editor_property('capture_component2d')
  rt=unreal.RenderingLibrary.create_render_target2d(world(),cfg['w'],cfg['h'],unreal.TextureRenderTargetFormat.RTF_RGBA8)
  d['rt']=rt
  c.set_editor_property('texture_target',rt)
  c.set_editor_property('capture_source',unreal.SceneCaptureSource.SCS_FINAL_COLOR_LDR)
  c.set_editor_property('capture_every_frame',False)
  c.set_editor_property('capture_on_movement',False)
  c.set_editor_property('always_persist_rendering_state',True)
  c.set_editor_property('fov_angle',cfg['fov'])
  d['flags']=flags(c)
  d['cap']=c
  for i,it in enumerate(cfg['items']):
   a=unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.Emitter,unreal.Vector(*it['location']),unreal.Rotator(pitch=0,yaw=0,roll=0))
   a.set_actor_label(PREFIX+cfg['name']+'_'+str(i));d['actors'].append(a.get_path_name());pc=a.get_component_by_class(unreal.ParticleSystemComponent)
   pc.set_auto_activate(False);pc.set_template(resolve(it['source']))
  d['warm']=cfg.get('warm',6)
  unreal.EditorLevelLibrary.set_selected_level_actors([])
  d['last']=unreal.GameplayStatics.get_time_seconds(world());d['running']=True;d['h']=unreal.register_slate_post_tick_callback(tick)
  cam=cap.get_actor_location();rot=cap.get_actor_rotation()
  return {'started':cfg['name'],'actors':len(d['actors']),'flags':d['flags'],'cam':[cam.x,cam.y,cam.z],'rot':[rot.pitch,rot.yaw,rot.roll],'fov':c.get_editor_property('fov_angle')}
 except Exception as e:
  d['error']=repr(e);clean();dump();raise
def shoot(fn):
 d=st();d['cap'].capture_scene();unreal.RenderingLibrary.export_render_target(world(),d['rt'],d['cfg']['folder'],fn)
def tick(dt):
 d=st()
 if not d.get('running'):return
 try:
  if d['warm']>0:
   d['cap'].capture_scene();d['warm']-=1
   if d['warm']==0:
    shoot('bg')
    for p in d['actors'][1:]:
     a=resolve(p)
     if a:a.get_component_by_class(unreal.ParticleSystemComponent).activate(True)
    d['last']=unreal.GameplayStatics.get_time_seconds(world())
   return
  now=unreal.GameplayStatics.get_time_seconds(world());delta=max(0.0,now-d['last']);d['last']=now;d['elapsed']+=delta
  counts=[]
  for p in d['actors'][1:]:
   a=resolve(p)
   if a:counts.append(list(a.get_component_by_class(unreal.ParticleSystemComponent).get_num_cpu_and_gpu_active_particles()))
  d['trace'].append([round(d['elapsed'],4),round(delta,4),counts])
  times=d['cfg']['times'];i=d['index']
  if i<len(times) and d['elapsed']>=times[i]:
   fn='t%05d'%int(round(times[i]*1000))
   shoot(fn)
   d['shots'].append({'age':round(d['elapsed'],4),'target':times[i],'count':counts,'file':fn});d['index']+=1
  if d['elapsed']>=d['cfg']['end']:
   d['running']=False;d['done']=True;unreal.unregister_slate_post_tick_callback(d['h']);d['h']=None;dump()
 except Exception as e:
  d['error']=repr(e);clean();dump()
def status():return snap()
def cleanup():
 n=clean();return {'removed':n,'remaining':[a.get_actor_label() for a in unreal.EditorLevelLibrary.get_all_level_actors() if a.get_actor_label().startswith(PREFIX)],'h':str(st().get('h'))}
