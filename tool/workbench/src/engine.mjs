export const DEFAULT_ENGINE='http://127.0.0.1:17780/gpcli';
export const EFFECT_KEYS=['EffectSubTemplates','EffectTemplates','EffectScheduleGroups','TotalDuration'];
const copy=v=>structuredClone(v);
export function clean(v){return Array.isArray(v)?v.map(clean):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>k!=='_struct').map(([k,x])=>[k,clean(x)])):v;}
export function same(a,b){a=clean(a);b=clean(b);if(typeof a==='number'&&typeof b==='number')return Math.abs(a-b)<=1e-6+Math.abs(a)*1e-7;if(Array.isArray(a))return Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>same(v,b[i]));if(a&&typeof a==='object')return b&&typeof b==='object'&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&same(a[k],b[k]));return a===b;}
export function normalizePath(value){let p=String(value||'').trim().replace(/^[A-Za-z0-9_]+['"]([^'"]+)['"]$/,'$1');if(!/^\/Game\/[A-Za-z0-9_/.:-]+$/.test(p)||p.length>1000)throw Error('请输入有效的导演 Blueprint 或关卡 Actor 路径');if(!p.includes('.'))p+='.'+p.split('/').at(-1);return p;}
function engineBase(value){const url=new URL(value||DEFAULT_ENGINE);if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash||url.pathname!=='/gpcli')throw Error('只能连接本机 GPUECli 服务（http://127.0.0.1:17780/gpcli）');return url.href.replace(/\/$/,'');}
export async function engineRequest(route,payload,{base=DEFAULT_ENGINE,fetch:fetcher=globalThis.fetch,signal,timeout=15000}={}){
 const address=engineBase(base);if(!['/object/get','/object/search','/object/set','/object/call'].includes(route))throw Error('不允许的引擎端点');
 if(route==='/object/call'&&(payload.path!=='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary'||payload.function!=='SaveAsset'))throw Error('不允许的引擎函数');
 if(route==='/object/set'&&(Object.keys(payload.properties||{}).length!==1||!Object.hasOwn(payload.properties,'DefaultConfig')))throw Error('只允许写入导演三表配置');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout),cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 try{const response=await fetcher(address+route,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(payload),signal:controller.signal});const r=await response.json();if(!response.ok||r.success===false||r.__error)throw Error(r.message||r.__error||'UE 服务返回失败');return r.data??r;}catch(e){if(e.name==='AbortError')throw Error('UE 请求超时或已取消；写入请求超时时请先读回核对，不要重复导入');throw e;}finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
function assertConfig(config){if(!config||!EFFECT_KEYS.slice(0,3).every(k=>Array.isArray(config[k])))throw Error('目标没有有效的导演三表');}
export async function readDirector(value,options={}){
 const request=options.request||((route,payload)=>engineRequest(route,payload,options));const input=normalizePath(value);let r=await request('/object/get',{path:input});let assetPath=null;
 if(r.properties?.GeneratedClass?.path){const [pkg,name]=r.properties.GeneratedClass.path.split('.');assetPath=pkg;r=await request('/object/get',{path:pkg+'.Default__'+name});}
 const config=r.properties?.DefaultConfig;assertConfig(config);if(r.properties.DirectorId===undefined)throw Error('目标缺少 DirectorId');
 const points=[],refs=await request('/object/search',{class:'DFMShowEffectPoint',limit:1000});
 for(const ref of refs.objects||[]){if(!ref.path?.startsWith('/Game/')||ref.path.includes('.Default__')||/^(REINST_|SKEL_)/.test(ref.name||ref.class||''))continue;const p=await request('/object/get',{path:ref.path,properties:['PointId','DirectorId','Bindings']});if(p.properties?.DirectorId===r.properties.DirectorId)points.push({path:p.path||ref.path,pointId:p.properties.PointId,bindings:p.properties.Bindings||[]});}
 return {target:{path:r.path||input,assetPath,directorId:r.properties.DirectorId},config:copy(config),active:r.properties.bShowActive===true,points,readOnly:true};
}
export function prepareImport(target,arrays,duration){assertConfig(target?.config);assertConfig(arrays);if(target.active)throw Error('导演正在播放，请先在 UE 停止');if(!Number.isFinite(duration)||duration<=0)throw Error('节目时长无效');
 return {format:'df.director-import-plan/1',path:target.target.path,assetPath:target.target.assetPath||null,before:copy(target.config),effects:copy({...Object.fromEntries(EFFECT_KEYS.slice(0,3).map(k=>[k,arrays[k]])),TotalDuration:duration})};
}
export async function executeImport(plan,{request:provided,serialize,...options}={}){
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
 try{const saved=await request('/object/call',{path:'/Script/EditorScriptingUtilities.Default__EditorAssetLibrary',function:'SaveAsset',args:{AssetToSave:plan.assetPath,bOnlyIfIsDirty:false}});if(![true,'True','true'].includes(saved.return_value))throw Error('UE 未返回保存成功');if(!same((await get()).properties?.DefaultConfig,expected))throw Error('保存后配置已变化，须重新核对');return {...receipt,saved:true};}catch(e){return {...receipt,saveError:e.message};}
}
