import {nativeEntry,saveSubTemplate} from './subtemplate-model.mjs';

export const deliveryBase='http://127.0.0.1:8034';
export function readResourceIndex(data){
  if(data?.format!=='df.firework-resource/1'||!Array.isArray(data.resources))throw Error('不支持此资源索引版本');
  const seen=new Set();
  for(const r of data.resources){
    if(r.status!=='complete'||!r.resourceId||!r.revisionId||seen.has(r.deliveryId)||!Array.isArray(r.packages)||!Array.isArray(r.files))throw Error('资源索引包含不完整或重复的修订');
    seen.add(r.deliveryId);
    if(r.thumbnail?.status==='ready'&&r.thumbnail.revisionId!==r.revisionId)throw Error('资源缩略图与产物修订不同');
  }
  return data.resources;
}
export function pinResource(doc,r,{engineId,zone='dam',role='burst'}={}){
  if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(engineId||''))throw Error('请填写已登记的 ResourceFX 行名（英文ID）；导入完成不等于已配表');
  readResourceIndex({format:'df.firework-resource/1',resources:[r]});
  const d=structuredClone(doc),ref={resourceId:r.resourceId,revisionId:r.revisionId,deliveryId:r.deliveryId,name:r.name,files:r.files.map(f=>({path:f.path,sha256:f.sha256})),thumbnail:r.thumbnail,platforms:r.packages.map(p=>p.platform),metadata:{artifactDuration:r.metadata?.artifactDuration||r.metadata?.duration,sizePlan:r.metadata?.sizePlan||null,boundsM:r.metadata?.boundsM||null,enginePlaybackVerified:false}};
  const id='FWL_'+r.resourceId+'_'+r.revisionId.slice(0,8);
  if(d.templateLibrary.some(t=>t.id===id))throw Error('本节目已有该固定修订；请在花型库选择它');
  const duration=r.metadata?.artifactDuration||r.metadata?.duration;
  if(!Number.isFinite(duration)||duration<=0)throw Error('资源未提供有效时长，请重新从烘焙器交付');
  const diameter=r.metadata?.sizePlan?.spec?.target||r.metadata?.boundsM?.width||0;
  d.templateLibrary.push({id,name:r.name+' · '+r.revisionId.slice(0,8),zone,kind:role==='trail'?'comet':role==='fan'?'fan':'small',shape:role==='fan'?'fan':'ball',diameter,color:'#83dfb1',workspaceResource:ref});
  const recipe={id:'ST_'+id,name:r.name,category:role==='trail'?'trail':role==='fan'?'fan':'ball',workspaceResource:ref,randomMode:'native-source',entries:[{id:'delivery',role,native:nativeEntry(engineId),preview:{heightM:0,diameterM:diameter,durationS:duration,color:'#83dfb1',verified:false},workspaceResource:ref}]};
  return {doc:saveSubTemplate(d,id,recipe),templateId:id};
}
