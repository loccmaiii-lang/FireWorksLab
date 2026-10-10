import {engineRequest,normalizePath,EFFECT_KEYS} from './engine.mjs';
export const WORKBENCH_VERSION='16';
export const DEFAULT_DIRECTOR='/Game/BluePrints/ShowDirector/Instance/Ma5_NewYearFireworks/BP_Failed_NewYearFireworks_ShowDirector_2.BP_Failed_NewYearFireworks_ShowDirector_2';
const network=e=>/fetch|network|超时|取消/i.test(e.message);
const reader=options=>options.request||((route,payload)=>engineRequest(route,payload,options));
export async function resolveDirector(value,options={}){
 const request=reader(options),input=normalizePath(value);
 let r=await request('/object/get',{path:input}),assetPath=null;
 if(r.properties?.GeneratedClass?.path){const [pkg,name]=r.properties.GeneratedClass.path.split('.');assetPath=pkg;r=await request('/object/get',{path:pkg+'.Default__'+name});}
 if(r.properties?.DirectorId===undefined||!EFFECT_KEYS.slice(0,3).every(k=>Array.isArray(r.properties?.DefaultConfig?.[k])))throw Error('目标不是有效导演：'+input);
 return {path:assetPath?input:r.path||input,assetPath,directorId:r.properties.DirectorId,name:input.split('.').at(-1)};
}
export async function listDirectors(options={}){
 const request=reader(options),refs=await request('/object/search',{class:'DFMShowDirector',limit:1000}),paths=new Set([DEFAULT_DIRECTOR,...(options.preferred?[options.preferred]:[])]),targets=[];
 for(const ref of refs.objects||[]){if(!ref.path?.startsWith('/Game/')||/^(REINST_|SKEL_)/.test(ref.name||ref.class||''))continue;
  if(ref.path.includes('.Default__')){const pkg=ref.path.split('.')[0];paths.add(pkg+'.'+pkg.split('/').at(-1));}else paths.add(ref.path);
 }
 for(const p of paths)try{const t=await resolveDirector(p,{...options,request});if(!targets.some(v=>v.path===t.path))targets.push(t)}catch(e){if(network(e))throw e;}
 return targets.sort((a,b)=>a.name.localeCompare(b.name));
}
export async function probeConnection(options={}){
 if(options.explicit)return {connected:true,target:await resolveDirector(options.preferred,options)};
 try{return {connected:true,target:await resolveDirector(options.preferred||DEFAULT_DIRECTOR,options)}}catch(e){if(network(e))throw e;}
 // Default discovery excludes CDOs and generated/transient objects, matching the existing fallback.
 const request=reader(options),refs=await request('/object/search',{class:'DFMShowDirector',limit:100}),targets=[];
 for(const ref of refs.objects||[]){if(!ref.path?.startsWith('/Game/')||ref.path.includes('.Default__')||/^(REINST_|SKEL_)/.test(ref.name||ref.class||''))continue;try{targets.push(await resolveDirector(ref.path,{...options,request}))}catch(e){if(network(e))throw e;}}
 if(targets.length===1)return {connected:true,target:targets[0]};
 return {connected:true,target:null,targets,message:targets.length?'发现多个导演，请选择交付目标':'UE已连接，当前工程没有可用导演'};
}
