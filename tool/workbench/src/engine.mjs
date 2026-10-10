export const DEFAULT_ENGINE='http://127.0.0.1:17780/gpcli';
export const EFFECT_KEYS=['EffectSubTemplates','EffectTemplates','EffectScheduleGroups','TotalDuration'];
const copy=v=>structuredClone(v);
export function clean(v){return Array.isArray(v)?v.map(clean):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>k!=='_struct').map(([k,x])=>[k,clean(x)])):v;}
export function same(a,b){a=clean(a);b=clean(b);if(typeof a==='number'&&typeof b==='number')return Math.abs(a-b)<=1e-6+Math.abs(a)*1e-7;if(Array.isArray(a))return Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>same(v,b[i]));if(a&&typeof a==='object')return b&&typeof b==='object'&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&same(a[k],b[k]));return a===b;}
export function normalizePath(value){let p=String(value||'').trim().replace(/^[A-Za-z0-9_]+['"]([^'"]+)['"]$/,'$1');if(!/^\/Game\/[A-Za-z0-9_/.:-]+$/.test(p)||p.length>1000)throw Error('请输入有效的导演 Blueprint 或关卡 Actor 路径');if(!p.includes('.'))p+='.'+p.split('/').at(-1);return p;}
function engineBase(value){const url=new URL(value||DEFAULT_ENGINE);if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash||url.pathname!=='/gpcli')throw Error('只能连接本机 GPUECli 服务（http://127.0.0.1:17780/gpcli）');return url.href.replace(/\/$/,'');}
export async function engineRequest(route,payload,{base=DEFAULT_ENGINE,fetch:fetcher=globalThis.fetch,signal,timeout}={}){
 const address=engineBase(base);if(!['/object/get','/object/search','/object/set','/object/call'].includes(route))throw Error('不允许的引擎端点');
 if(route==='/object/call'&&(payload.path!=='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary'||payload.function!=='SaveAsset'))throw Error('不允许的引擎函数');
 if(route==='/object/set'&&(Object.keys(payload.properties||{}).length!==1||!Object.hasOwn(payload.properties,'DefaultConfig')))throw Error('只允许写入导演三表配置');
 // UE更新大型默认配置/保存资产可能超过读取时限；超时仍按结果未知处理。
 const requestTimeout=timeout??(route==='/object/set'||route==='/object/call'?120000:15000);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),requestTimeout),cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 try{const response=await fetcher(address+route,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(payload),signal:controller.signal});const r=await response.json();if(!response.ok||r.success===false||r.__error)throw Error(r.message||r.__error||'UE 服务返回失败');return r.data??r;}catch(e){if(e.name==='AbortError')throw Error('UE 请求超时或已取消；写入请求超时时请先读回核对，不要重复导入');throw e;}finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
function assertConfig(config){if(!config||!EFFECT_KEYS.slice(0,3).every(k=>Array.isArray(config[k])))throw Error('目标没有有效的导演三表');}
export async function readDirector(value,options={}){
 const request=options.request||((route,payload)=>engineRequest(route,payload,options));const input=normalizePath(value);let r=await request('/object/get',{path:input});let assetPath=null,classPath=r.class;
 if(r.properties?.GeneratedClass?.path){classPath=r.properties.GeneratedClass.path;const [pkg,name]=classPath.split('.');assetPath=pkg;r=await request('/object/get',{path:pkg+'.Default__'+name});}
 const config=r.properties?.DefaultConfig;assertConfig(config);if(r.properties.DirectorId===undefined)throw Error('目标缺少 DirectorId');
 // 只关联引擎返回的精确所属类，不用场景显示名或DirectorId猜蓝图。
 const relatedTargets=[];
 const related=(object,asset)=>{assertConfig(object.properties?.DefaultConfig);if(object.properties.DirectorId!==r.properties.DirectorId)throw Error('所属蓝图与场景实例的DirectorId不一致');return {target:{path:object.path,assetPath:asset,directorId:object.properties.DirectorId},config:copy(object.properties.DefaultConfig),active:object.properties.bShowActive===true}};
 if(typeof classPath==='string'&&/^\/Game\/[A-Za-z0-9_/]+\.[A-Za-z0-9_]+_C$/.test(classPath)){
  if(assetPath){
   const directors=await request('/object/search',{class:'DFMShowDirector',limit:1000});
   for(const ref of directors.objects||[]){if(!ref.path?.startsWith('/Game/')||!ref.path.includes(':')||/^(REINST_|SKEL_)/.test(ref.name||'')||![classPath,classPath.split('.').at(-1)].includes(ref.class))continue;
    const object=await request('/object/get',{path:ref.path,properties:['DefaultConfig','DirectorId','bShowActive']});
    if(object.class===classPath&&object.properties?.DirectorId===r.properties.DirectorId)relatedTargets.push(related(object,null));
   }
   if(relatedTargets.length>1)throw Error('发现多个同类场景实例，请在选择导演中指定要同步的关卡实例');
  }else if((r.path||input).includes(':')){
   const [pkg,name]=classPath.split('.');relatedTargets.push(related(await request('/object/get',{path:pkg+'.Default__'+name,properties:['DefaultConfig','DirectorId','bShowActive']}),pkg));
  }
 }
 const points=[],refs=await request('/object/search',{class:'DFMShowEffectPoint',limit:1000});
 for(const ref of refs.objects||[]){if(!ref.path?.startsWith('/Game/')||ref.path.includes('.Default__')||/^(REINST_|SKEL_)/.test(ref.name||ref.class||''))continue;const p=await request('/object/get',{path:ref.path,properties:['PointId','DirectorId','Bindings']});if(p.properties?.DirectorId===r.properties.DirectorId)points.push({path:p.path||ref.path,pointId:p.properties.PointId,bindings:p.properties.Bindings||[]});}
 return {target:{path:r.path||input,assetPath,directorId:r.properties.DirectorId},config:copy(config),active:r.properties.bShowActive===true,points,relatedTargets,readOnly:true};
}
export function prepareImport(target,arrays,duration){assertConfig(target?.config);assertConfig(arrays);if(target.active)throw Error('导演正在播放，请先在 UE 停止');if(!Number.isFinite(duration)||duration<=0)throw Error('节目时长无效');
 const plan={format:'df.director-import-plan/1',path:target.target.path,assetPath:target.target.assetPath||null,before:copy(target.config),effects:copy({...Object.fromEntries(EFFECT_KEYS.slice(0,3).map(k=>[k,arrays[k]])),TotalDuration:duration})};
 if(target.relatedTargets?.length)plan.relatedPlans=target.relatedTargets.map(t=>prepareImport(t,arrays,duration));return plan;
}
async function executeSingleImport(plan,{request:provided,serialize,deferSave=false,...options}={}){
 if(!serialize)throw Error('缺少原生配置序列化器');const request=provided||((route,payload)=>engineRequest(route,payload,options));assertConfig(plan.before);assertConfig(plan.effects);
 const get=()=>request('/object/get',{path:plan.path,properties:['DefaultConfig','bShowActive']});const old=await get();if(old.properties?.bShowActive)throw Error('导演正在播放，请先停止');if(!same(old.properties?.DefaultConfig,plan.before))throw Error('UE 配置已改变，检查失效，请重新检查');
 const expected={...copy(plan.before),...copy(plan.effects)};let verified;
 try{const write=await request('/object/set',{path:plan.path,properties:{DefaultConfig:serialize(plan.effects)}});if(write.failed_properties?.length)throw Error('部分字段写入失败：'+write.failed_properties.join('、'));verified=await get();if(!same(verified.properties?.DefaultConfig,expected))throw Error('UE 读回与交付内容不一致');}
 catch(error){
  // Restore only known changes, never overwrite unrelated concurrent edits or
  // guess a result while a timed-out request may still be executing in UE.
  if(!/超时|取消|timeout|network|fetch/i.test(error.message))try{const actual=(await get()).properties?.DefaultConfig;const foreign=c=>Object.fromEntries(Object.entries(c||{}).filter(([k])=>!EFFECT_KEYS.includes(k)));if(same(foreign(actual),foreign(plan.before))&&EFFECT_KEYS.every(k=>same(actual?.[k],plan.before[k])||same(actual?.[k],plan.effects[k]))){if(!same(actual,plan.before)){const rollback=Object.fromEntries(EFFECT_KEYS.filter(k=>Object.hasOwn(plan.before,k)).map(k=>[k,plan.before[k]]));await request('/object/set',{path:plan.path,properties:{DefaultConfig:serialize(rollback)}});error.rollbackVerified=same((await get()).properties?.DefaultConfig,plan.before);}}}catch{}
  throw error;
 }
 const receipt={format:'df.director-import-receipt/1',path:plan.path,verified:true,saved:false,uePlaybackVerified:false,time:new Date().toISOString()};
 if(!plan.assetPath)return {...receipt,needsLevelSave:true};
 if(deferSave)return receipt;
 try{const saved=await request('/object/call',{path:'/Script/EditorScriptingUtilities.Default__EditorAssetLibrary',function:'SaveAsset',args:{AssetToSave:plan.assetPath,bOnlyIfIsDirty:false}});if(![true,'True','true'].includes(saved.return_value))throw Error('UE 未返回保存成功');if(!same((await get()).properties?.DefaultConfig,expected))throw Error('保存后配置已变化，须重新核对');return {...receipt,saved:true};}catch(e){return {...receipt,saveError:e.message};}
}

export async function executeImport(plan,options={}){
 if(!plan.relatedPlans?.length)return executeSingleImport(plan,options);
 const {serialize}=options;if(!serialize)throw Error('缺少原生配置序列化器');
 const request=options.request||((route,payload)=>engineRequest(route,payload,options));
 const plans=[plan,...plan.relatedPlans].sort((a,b)=>Number(!!b.assetPath)-Number(!!a.assetPath));
 if(plans.length!==2||new Set(plans.map(p=>p.path)).size!==2)throw Error('关联导入目标无效，请重新检查');
 const get=p=>request('/object/get',{path:p.path,properties:['DefaultConfig','bShowActive']});
 const expected=p=>({...copy(p.before),...copy(p.effects)});
 const targets=[];
 // 任一目标变化或播放中，整次导入零写入。
 for(const p of plans){assertConfig(p.before);assertConfig(p.effects);const r=await get(p);if(r.properties?.bShowActive)throw Error('导演正在播放，请先停止');if(!same(r.properties?.DefaultConfig,p.before))throw Error('UE 配置已改变，检查失效，请重新检查');}
 try{
  for(const p of plans){const r=await get(p);if(r.properties?.bShowActive)throw Error('导演正在播放，请先停止');
   if(same(r.properties?.DefaultConfig,expected(p)))targets.push({path:p.path,assetPath:p.assetPath,verified:true,saved:false,skipped:true,needsLevelSave:!p.assetPath});
   else{if(!same(r.properties?.DefaultConfig,p.before))throw Error('UE 配置已改变，检查失效，请重新检查');targets.push({...await executeSingleImport(p,{...options,request,deferSave:true}),assetPath:p.assetPath,skipped:false});}
  }
  for(const p of plans)if(!same((await get(p)).properties?.DefaultConfig,expected(p)))throw Error('蓝图与场景实例读回不一致');
 }catch(error){
  // 超时结果未知，不猜测执行结果；明确失败只恢复已知本次变更。
  if(!/超时|取消|timeout|network|fetch/i.test(error.message))try{
   for(const p of [...plans].reverse()){const r=await get(p),actual=r.properties?.DefaultConfig,foreign=c=>Object.fromEntries(Object.entries(c||{}).filter(([k])=>!EFFECT_KEYS.includes(k)));
    if(!r.properties?.bShowActive&&same(foreign(actual),foreign(p.before))&&EFFECT_KEYS.every(k=>same(actual?.[k],p.before[k])||same(actual?.[k],p.effects[k]))&&!same(actual,p.before))await request('/object/set',{path:p.path,properties:{DefaultConfig:serialize(Object.fromEntries(EFFECT_KEYS.filter(k=>Object.hasOwn(p.before,k)).map(k=>[k,p.before[k]])))}});
   }
   error.rollbackVerified=(await Promise.all(plans.map(get))).every((r,i)=>same(r.properties?.DefaultConfig,plans[i].before));
  }catch{}throw error;
 }
 const saveErrors=[];
 for(const target of targets.filter(t=>t.assetPath))try{const r=await request('/object/call',{path:'/Script/EditorScriptingUtilities.Default__EditorAssetLibrary',function:'SaveAsset',args:{AssetToSave:target.assetPath,bOnlyIfIsDirty:false}});if(![true,'True','true'].includes(r.return_value))throw Error('UE 未返回保存成功');target.saved=true;}catch(e){target.saveError=e.message;saveErrors.push(e.message);}
 for(const p of plans)if(!same((await get(p)).properties?.DefaultConfig,expected(p)))throw Error('保存后蓝图或场景实例配置变化，请重新核对');
 return {format:'df.director-import-receipt/1',path:plan.path,verified:true,saved:targets.filter(t=>t.assetPath).every(t=>t.saved),needsLevelSave:targets.some(t=>!t.assetPath),targets,paired:true,uePlaybackVerified:false,time:new Date().toISOString(),...(saveErrors.length?{saveError:saveErrors.join('；')}:{})};
}
