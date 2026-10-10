import {engineRequest,normalizePath,EFFECT_KEYS} from './engine.mjs';
export const WORKBENCH_VERSION='12';
export const DEFAULT_DIRECTOR='/Game/BluePrints/ShowDirector/Instance/Ma5_NewYearFireworks/BP_Failed_NewYearFireworks_ShowDirector_2.BP_Failed_NewYearFireworks_ShowDirector_2';
export async function probeConnection(options={}){
 const request=options.request||((route,payload)=>engineRequest(route,payload,options));
 async function target(value){const input=normalizePath(value);let r=await request('/object/get',{path:input}),assetPath=null;
  if(r.properties?.GeneratedClass?.path){const [pkg,name]=r.properties.GeneratedClass.path.split('.');assetPath=pkg;r=await request('/object/get',{path:pkg+'.Default__'+name});}
  if(r.properties?.DirectorId===undefined||!EFFECT_KEYS.slice(0,3).every(k=>Array.isArray(r.properties?.DefaultConfig?.[k])))throw Error('目标不是有效导演');
  return {path:assetPath?input:r.path||input,assetPath,directorId:r.properties.DirectorId,name:input.split('.').at(-1)};
 }
 try{return {connected:true,target:await target(options.preferred||DEFAULT_DIRECTOR)}}catch(e){if(/fetch|network|超时|取消/i.test(e.message))throw e;}
 const refs=await request('/object/search',{class:'DFMShowDirector',limit:100}),targets=[];
 for(const ref of refs.objects||[]){if(!ref.path?.startsWith('/Game/')||ref.path.includes('.Default__')||/^(REINST_|SKEL_)/.test(ref.name||ref.class||''))continue;try{targets.push(await target(ref.path))}catch(e){if(/fetch|network|超时|取消/i.test(e.message))throw e;}}
 if(targets.length===1)return {connected:true,target:targets[0]};
 return {connected:true,target:null,targets,message:targets.length?'发现多个导演，请选择交付目标':'UE已连接，当前工程没有可用导演'};
}
