# WorkBuddy 画质复核：原生视口移动帧截图；不冻结、不 HighResShot、不保存任何东西。基于 Codex live.py，前缀改 WB17_。
import unreal,json,sys,types
KEY='wb17_session'
PREFIX='WB17_'
if KEY not in sys.modules:
 _m=types.ModuleType(KEY);_m.d={};sys.modules[KEY]=_m
def state():return sys.modules[KEY].d
def world():return unreal.EditorLevelLibrary.get_editor_world()
def cmd(s):unreal.SystemLibrary.execute_console_command(world(),s)
def resolve(p):return unreal.find_object(None,p)
def snapshot():
 d=state();r={k:d.get(k) for k in ['running','done','error','elapsed','actors','shots','cfg']};r['h']=str(d.get('h'));r['frames']=len(d.get('trace',[]));return r
def dump():
 d=state()
 if d.get('cfg'):
  with open(d['cfg']['folder']+'/trace.json','w') as f:json.dump(dict(snapshot(),trace=d.get('trace',[])),f,indent=1)
def clean_actors():
 d=state();d['running']=False
 if d.get('h') is not None:
  unreal.unregister_slate_post_tick_callback(d['h']);d['h']=None
 removed=[]
 for p in d.get('actors',[]):
  a=resolve(p)
  if a and a.get_actor_label().startswith(PREFIX):
   unreal.EditorLevelLibrary.destroy_actor(a);removed.append(p)
 d['actors']=[]
 return removed
def begin(cfg):
 d=state()
 assert d.get('h') is None and not d.get('running')
 assert not any(a.get_actor_label().startswith(PREFIX) for a in unreal.EditorLevelLibrary.get_all_level_actors())
 for item in cfg['items']:assert resolve(item['source']) is not None
 d.clear();d.update({'cfg':cfg,'actors':[],'shots':[],'trace':[],'running':False,'h':None,'done':False,'error':None,'elapsed':0.0,'index':0})
 try:
  v,r=cfg['camera'];unreal.EditorLevelLibrary.set_level_viewport_camera_info(unreal.Vector(*v),unreal.Rotator(pitch=r[0],yaw=r[1],roll=r[2]))
  for i,item in enumerate(cfg['items']):
   rot=item.get('rotation',[0,0,0]);a=unreal.EditorLevelLibrary.spawn_actor_from_class(unreal.Emitter,unreal.Vector(*item['location']),unreal.Rotator(pitch=rot[0],yaw=rot[1],roll=rot[2]))
   assert a is not None
   a.set_actor_label(PREFIX+cfg['name']+'_'+str(i));d['actors'].append(a.get_path_name());c=a.get_component_by_class(unreal.ParticleSystemComponent)
   c.set_auto_activate(False);c.set_template(resolve(item['source']))
   for slot,p in item.get('materials',[]):
    c.set_material(slot,resolve(p))
    assert c.get_material(slot) and c.get_material(slot).get_path_name()==p
   c.activate(True)
  unreal.EditorLevelLibrary.set_selected_level_actors([])
  d['last']=unreal.GameplayStatics.get_time_seconds(world());d['running']=True;d['h']=unreal.register_slate_post_tick_callback(tick)
  return {'started':cfg['name'],'actors':len(d['actors'])}
 except Exception as e:
  d['error']=repr(e);clean_actors();dump();raise
def tick(dt):
 d=state()
 if not d.get('running'):return
 try:
  now=unreal.GameplayStatics.get_time_seconds(world());delta=max(0.0,now-d['last']);d['last']=now;d['elapsed']+=delta
  counts=[]
  for p in d['actors']:
   a=resolve(p)
   if a:counts.append(list(a.get_component_by_class(unreal.ParticleSystemComponent).get_num_cpu_and_gpu_active_particles()))
  d['trace'].append([round(d['elapsed'],4),round(delta,4),counts])
  times=d['cfg']['times'];i=d['index']
  if i<len(times) and d['elapsed']>=times[i]:
   fn=d['cfg']['folder']+'/t%05d.png'%int(times[i]*1000)
   cmd('Shot filename='+fn);d['shots'].append({'worldAge':d['elapsed'],'target':times[i],'count':counts,'file':fn});d['index']+=1
  if d['elapsed']>=d['cfg']['end']:
   d['running']=False;d['done']=True;unreal.unregister_slate_post_tick_callback(d['h']);d['h']=None;dump()
 except Exception as e:
  d['error']=repr(e);clean_actors();dump()
def status():return snapshot()
def cleanup():
 removed=clean_actors()
 return {'removed':len(removed),'remaining':[a.get_actor_label() for a in unreal.EditorLevelLibrary.get_all_level_actors() if a.get_actor_label().startswith(PREFIX)],'h':str(state().get('h'))}
def apply_cmds(lines):
 for s in lines:cmd(s)
 return {'applied':len(lines)}
def set_camera(v,r):
 unreal.EditorLevelLibrary.set_level_viewport_camera_info(unreal.Vector(*v),unreal.Rotator(pitch=r[0],yaw=r[1],roll=r[2]));return True
def set_selected(paths):
 unreal.EditorLevelLibrary.set_selected_level_actors([resolve(p) for p in paths if resolve(p)]);return True
