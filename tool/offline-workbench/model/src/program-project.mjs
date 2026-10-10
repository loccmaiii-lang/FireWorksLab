import {normalize,validateDoc,validateProfiles} from './editing-model.mjs';
import {makeBackup,parseBackup} from './workbench-data.mjs';
const clone=x=>structuredClone(x);
export function newProgram(seed,{name,id='PROGRAM_'+Date.now(),duration=120}={}){
 if(!name?.trim()||!Number.isFinite(duration)||duration<10||duration>3600)throw Error('请输入节目名称，时长为10–3600秒');
 const s=clone(seed);
 s.doc=normalize({...s.doc,cues:[],events:[],sections:[],notices:[],meta:{...s.doc.meta,name:name.trim(),programName:name.trim(),programId:id,programFileVersion:0,duration,musicOffset:0,musicStatus:'none',musicDuration:0,musicTitle:'',musicSourceSha256:null,sectionsMode:'user',compositionSource:'user-authored'}});
 return {...s,profiles:{medium:{},low:{}},musicMarkers:[],tier:'high',time:0,selectedCue:null,audioRef:null,musicData:null,structureData:null};
}
export function clearArrangementKeepMusic(state){
 const d=normalize({...clone(state.doc),cues:[],events:[],notices:[]});
 return {...clone(state),doc:d,profiles:{medium:{},low:{}},time:0,selectedCue:null};
}
export function changeMusicOffset(state,value){
 const offset=Number(value);if(!Number.isFinite(offset)||offset<0||offset>=state.doc.meta.duration)throw Error('音乐起播时刻必须在节目范围内');
 const s=clone(state),delta=offset-(s.doc.meta.musicOffset??10),bound=new Set(s.doc.cues.filter(c=>c.musicBinding).map(c=>c.id));
 for(const e of s.doc.events)if(bound.has(e.cueId))for(const k of ['launch','burst','end'])e[k]=+(e[k]+delta).toFixed(6);
 s.doc.meta.musicOffset=offset;s.doc=normalize(s.doc);s.musicMarkers=(s.musicMarkers||[]).map(m=>({...m,time:+(m.time+delta).toFixed(6)}));
 const errors=validateDoc(s.doc);if(errors.length)throw Error(errors[0]);if(s.musicMarkers.some(m=>m.time<0||m.time>s.doc.meta.duration))throw Error('移动后音乐标记超出节目范围');return s;
}
export function packProject(state,seed,{version=(state.doc.meta.programFileVersion||0)+1}={}){
 if(!Number.isInteger(version)||version<1)throw Error('节目文件版本无效');
 const errors=[...validateDoc(state.doc),...validateProfiles(state.doc,state.profiles)];if(errors.length)throw Error(errors[0]);
 const project={id:state.doc.meta.programId||'ORIGINAL',name:state.doc.meta.programName||state.doc.meta.name||'烟花节目',version};
 return {format:'df.workbench-project/1',project,payload:makeBackup(state,seed)};
}
export function preflightProject(raw,seed){
 let parsed;try{parsed=JSON.parse(raw)}catch{throw Error('文件不是有效JSON，当前节目未改变')}
 if(parsed.format&&parsed.format!=='df.workbench-project/1')throw Error('请选择节目版本文件或完整工作台备份');
 if(!parsed.format)return parseBackup(raw,seed);
 if(!parsed.project?.name?.trim()||!parsed.project?.id||!Number.isInteger(parsed.project.version)||parsed.project.version<1)throw Error('节目名称或版本无效');
 const s=parseBackup(JSON.stringify(parsed.payload),seed);
 if(s.doc.meta.programId&&s.doc.meta.programId!==parsed.project.id)throw Error('节目身份与文件内容不一致');
 s.doc.meta={...s.doc.meta,programId:parsed.project.id,programName:parsed.project.name,programFileVersion:parsed.project.version};
 return s;
}
export function validateMedia(state){
 const a=state.audioRef;if(a!==undefined&&a!==null){
  if(a.kind==='bundled')return;
  if(a.kind!=='embedded'||!a.name||!Number.isFinite(a.duration)||a.duration<=0||!/^data:audio\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/]+=*$/i.test(a.dataUrl||'')||!/^[a-f0-9]{64}$/.test(a.sha256||''))throw Error('节目音频信息不完整');
 }
 if(state.doc.meta.musicStatus==='none'&&(state.audioRef||state.musicMarkers?.length))throw Error('无音乐节目不能含旧音频或音乐标记');
 for(const data of [state.musicData?.waveform,state.structureData?.energy])if(data!==undefined&&data!==null&&(!Array.isArray(data)||data.some(v=>!Number.isFinite(v)||v<0||v>1)))throw Error('音乐波形数据无效');
}
export async function readMusicFile(file){
 if(file.size>64*1024*1024)throw Error('音乐文件不能超过64MB');
 const bytes=await file.arrayBuffer(),ctx=new AudioContext();let decoded;
 try{decoded=await ctx.decodeAudioData(bytes.slice(0))}catch{throw Error('音乐不能解码，请选择WAV、MP3或浏览器支持的音频')}finally{await ctx.close()}
 const duration=decoded.duration,waveform=[],energy=[];let max=0;
 const channels=Array.from({length:decoded.numberOfChannels},(_,i)=>decoded.getChannelData(i)),count=1000;
 for(let i=0;i<count;i++){let peak=0;const lo=Math.floor(i/count*decoded.length),hi=Math.floor((i+1)/count*decoded.length),stride=Math.max(1,Math.floor((hi-lo)/400));for(let j=lo;j<hi;j+=stride)for(const ch of channels)peak=Math.max(peak,Math.abs(ch[j]));waveform.push(peak);max=Math.max(max,peak)}
 for(let i=0;i<count;i++)energy.push(waveform[i]/(max||1));
 const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
 const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('音乐读取失败'));reader.readAsDataURL(new Blob([bytes],{type:file.type.startsWith('audio/')?file.type:'audio/wav'}))});
 return {audioRef:{kind:'embedded',name:file.name,sha256,duration,dataUrl},musicData:{title:file.name,duration,waveform},structureData:{energy,energyStep:duration/count},musicMarkers:[]};
}
