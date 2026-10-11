import {preflightProject} from './program-project.mjs';
import {makeBackup} from './workbench-data.mjs';
// 云端最新编排（用户 2026-10-11）：拉取后刷新即载入同版本发布的编排。
// 同一份编排只自动载入一次；载入前把当前浏览器节目留成可恢复备份。
export const CLOUD_FORMAT='df.workbench-cloud-latest/1';
export const CLOUD_MARK='-cloud-latest';
const VERSION=/^\d+\.\d+\.\d+$/,SHA=/^[a-f0-9]{64}$/;
export function nextVersion(version){
 if(!VERSION.test(version||''))throw Error('版本号格式应为 16.0.9');
 const [a,b,c]=version.split('.').map(Number);return `${a}.${b}.${c+1}`;
}
export function validateCloudLatest(data){
 if(data?.format!==CLOUD_FORMAT)throw Error('云端编排格式不对');
 if(!VERSION.test(data.version||''))throw Error('云端编排版本号无效');
 if(!data.name?.trim())throw Error('云端编排缺少名称');
 if(!SHA.test(data.programmeSha256||''))throw Error('云端编排缺少指纹');
 if(data.project?.format!=='df.workbench-project/1')throw Error('云端编排不是完整节目文件');
 return data;
}
export function shouldLoadCloud(cloud,mark){return !!cloud&&mark?.programmeSha256!==cloud.programmeSha256;}
// 云端编排不内嵌音乐；当前草稿里同一首（sha256 相同）已导入时直接沿用。
export function applyCloudProgramme(state,previous,cloud){
 const next={...state,doc:{...state.doc,meta:{...state.doc.meta,cloudVersion:cloud.version,cloudName:cloud.name}}};
 const audio=previous?.audioRef,same=audio?.kind==='embedded'&&!!cloud.musicSha256&&audio.sha256===cloud.musicSha256;
 if(same)next.audioRef=audio;
 return {state:next,musicReused:same};
}
export function cloudNoticeText(cloud,state,{backedUp,musicReused,offline}){
 return `已载入云端编排 ${cloud.version} · ${cloud.name}（${state.doc.cues.length} 片段 / ${state.doc.events.length} 次播放）。`
  +(backedUp?'原节目已备份，可在「节目 → 备份与恢复 → 恢复切换前节目」找回。':'')
  +(!musicReused&&offline?'离线页没有带音乐，请在「节目」里导入《'+(cloud.musicTitle||'原音乐')+'》。':'');
}
// read / writeBatch / fetcher 由调用方注入，便于在 Node 里检查。
export async function loadCloudLatest({seed,state,raw,draftKey,read,writeBatch,fetcher,offline=false,now=()=>new Date().toISOString()}){
 let cloud;
 try{const response=await fetcher('./data/cloud-latest.json');if(!response.ok)return state;cloud=await response.json()}catch{return state}
 try{validateCloudLatest(cloud)}catch(e){return {...state,cloudNotice:{kind:'error',message:'云端编排读取失败，保留当前节目：'+e.message}}}
 let mark=null;try{const value=await read(draftKey+CLOUD_MARK);mark=value?JSON.parse(value):null}catch{}
 if(!shouldLoadCloud(cloud,mark))return state;
 let applied;
 try{applied=applyCloudProgramme(preflightProject(JSON.stringify(cloud.project),seed),raw?state:null,cloud)}
 catch(e){return {...state,cloudNotice:{kind:'error',message:`云端编排 ${cloud.version} 未通过校验，保留当前节目：`+e.message}}}
 const next=applied.state,text=JSON.stringify(makeBackup(next,seed)),entries=[];
 if(raw)entries.push([draftKey+'-recovery',raw],[draftKey+'-before-cloud-'+cloud.version,raw]);
 entries.push([draftKey,text],[draftKey+'-program-'+(next.doc.meta.programId||'ORIGINAL'),text],
  [draftKey+CLOUD_MARK,JSON.stringify({version:cloud.version,name:cloud.name,programmeSha256:cloud.programmeSha256,loadedAt:now()})]);
 try{await writeBatch(entries)}
 catch(e){return {...next,cloudNotice:{kind:'error',message:`已显示云端编排 ${cloud.version}，但浏览器没保存成功，刷新会再载入一次：`+e.message}}}
 return {...next,cloudNotice:{kind:'info',persist:true,message:cloudNoticeText(cloud,next,{backedUp:!!raw,musicReused:applied.musicReused,offline})}};
}
