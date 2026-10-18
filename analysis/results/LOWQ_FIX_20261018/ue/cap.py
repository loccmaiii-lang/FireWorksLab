# 本机同步检测 10-18 低画质对比：SceneCapture2D 逐帧离屏渲染（同一渲染器、用户当前 PerfGear 低档 CVar 不动），到时刻导出 PNG。
# 只建 FWL18_ 前缀 Actor；视口机位挪到同一位置让流送按这个视角算（结束由 restore 恢复）。不保存任何资产 / 地图。
import unreal,json,sys,types
KEY='fwl18_cap'
PREFIX='FWL18_'
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
  with open(d['cfg']['folder']+'/trace.json','w') as f:json.dump(dict(snap(),cfg=d['cfg'],trace=d.get('trace',[])),f,indent=1)
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
def begin(cfg):
 d=st()
 assert d.get('h') is None and not d.get('running')
 assert not any(a.get_actor_label().startswith(PREFIX) for a in unreal.EditorLevelLibrary.get_all_level_actors())
 for it in cfg['items']:
  assert resolve(it['source']) is not None
  for slot,p in it.get('materials',[]):assert resolve(p) is not None
 rt=d.get('rt')
 d.clear();d.update({'cfg':cfg,'actors':[],'shots':[],'trace':[],'running':False,'h':None,'done':False,'error':None,'elapsed':0.0,'index':0,'rt':rt})
 try:
  v,r=cfg['camera'];rot=unreal.Rotator(pitch=r[0],yaw=r[1],roll=r[2])
  unreal.EditorLevelLibrary.set_level_viewport_camera_info(unreal.Vector(*v),rot)
  cap=unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.SceneCapture2D,unreal.Vector(*v),rot)
  cap.set_actor_label(PREFIX+'Cap');d['actors'].append(cap.get_path_name())
  c=cap.get_editor_property('capture_component2d')
  if rt is None:
   rt=unreal.RenderingLibrary.create_render_target2d(world(),cfg.get('w',1920),cfg.get('h',1080),unreal.TextureRenderTargetFormat.RTF_RGBA8)
   d['rt']=rt
  c.set_editor_property('texture_target',rt)
  c.set_editor_property('capture_source',unreal.SceneCaptureSource.SCS_FINAL_COLOR_LDR)
  c.set_editor_property('capture_every_frame',False)
  c.set_editor_property('capture_on_movement',False)
  c.set_editor_property('always_persist_rendering_state',True)
  c.set_editor_property('fov_angle',cfg.get('fov',90.0))
  d['cap']=c
  if not cfg.get('spawnLate'):spawn_items(cfg)     # spawnLate：预热结束才生成并立刻激活（同演出：生成即播放，流送没有提前量）
  d['warm']=cfg.get('warm',20)
  unreal.EditorLevelLibrary.set_selected_level_actors([])
  d['last']=unreal.GameplayStatics.get_time_seconds(world());d['running']=True;d['h']=unreal.register_slate_post_tick_callback(tick)
  return {'started':cfg['name'],'actors':len(d['actors'])}
 except Exception as e:
  d['error']=repr(e);clean();dump();raise
def spawn_items(cfg):
 d=st()
 for i,it in enumerate(cfg['items']):
  a=unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.Emitter,unreal.Vector(*it['location']),unreal.Rotator(0,0,0))
  a.set_actor_label(PREFIX+cfg['name']+'_'+str(i));d['actors'].append(a.get_path_name());pc=a.get_component_by_class(unreal.ParticleSystemComponent)
  pc.set_auto_activate(False);pc.set_template(resolve(it['source']))
  for slot,p in it.get('materials',[]):
   pc.set_material(slot,resolve(p))
   assert pc.get_material(slot) and pc.get_material(slot).get_path_name()==p
def tick(dt):
 d=st()
 if not d.get('running'):return
 try:
  c=d['cap'];c.capture_scene()
  if d['warm']>0:
   d['warm']-=1
   if d['warm']==0:
    if d['cfg'].get('spawnLate'):spawn_items(d['cfg'])
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
   fn='t%05d'%int(times[i]*1000)
   unreal.RenderingLibrary.export_render_target(world(),d['rt'],d['cfg']['folder'],fn)
   for n in d['cfg'].get('investigate',[]):     # 每张图的流送状态打进日志（只读诊断）
    unreal.SystemLibrary.execute_console_command(world(),'InvestigateTexture '+n)
   d['shots'].append({'age':round(d['elapsed'],4),'target':times[i],'count':counts,'file':fn});d['index']+=1
  if d['elapsed']>=d['cfg']['end']:
   d['running']=False;d['done']=True;unreal.unregister_slate_post_tick_callback(d['h']);d['h']=None;dump()
 except Exception as e:
  d['error']=repr(e);clean();dump()
def status():return snap()
def cleanup():
 n=clean();return {'removed':n,'remaining':[a.get_actor_label() for a in unreal.EditorLevelLibrary.get_all_level_actors() if a.get_actor_label().startswith(PREFIX)],'h':str(st().get('h'))}
def restore(v,r,sel):
 unreal.EditorLevelLibrary.set_level_viewport_camera_info(unreal.Vector(*v),unreal.Rotator(pitch=r[0],yaw=r[1],roll=r[2]))
 unreal.EditorLevelLibrary.set_selected_level_actors([resolve(p) for p in sel if resolve(p)])
 v2,r2=unreal.EditorLevelLibrary.get_level_viewport_camera_info()
 return {'camera':[[v2.x,v2.y,v2.z],[r2.pitch,r2.yaw,r2.roll]],'selected':len(unreal.EditorLevelLibrary.get_selected_level_actors())}
