// 第2步写盘：备份已完成，逐资产本机可写检查 -> 限四项 -> 保存 -> 逐项读回 -> 验证其它材质参数没动。
// 只执行已通过代表审看后运行。本脚本不迁出、不P4提交、不写工具源码、不保存地图。
import fs from 'node:fs';
import crypto from 'node:crypto';
import {request,get,set,py,LIB,saveLog} from './ue_rw.mjs';
import {T,setMI,rebuild} from './ops.mjs';
const root='E:/loc_ma5/DFMEditor/DFM/Content/';
const plan=JSON.parse(fs.readFileSync(new URL('./final_targets.json',import.meta.url),'utf8'));
const mode=process.argv[2];
const names=process.argv.slice(3);
const outPath=new URL('../改后读回.json',import.meta.url);
const out=fs.existsSync(outPath)?JSON.parse(fs.readFileSync(outPath,'utf8')):{format:'rsu26.after-readback/1',at:new Date().toISOString(),systems:[],materials:[],errors:[]};
const persist=()=>fs.writeFileSync(outPath,JSON.stringify(out,null,1));
const saved=new Set([...out.systems,...out.materials].map(x=>x.name));
const fileOf=p=>root+p.split('.')[0].slice(6)+'.uasset';
const boxTxt=(mn,mx)=>`(Min=(X=${mn[0]},Y=${mn[1]},Z=${mn[2]}),Max=(X=${mx[0]},Y=${mx[1]},Z=${mx[2]}),IsValid=1)`;
const close=(a,b)=>typeof a==='number'&&Number.isFinite(a)&&Math.abs(a-b)<=1e-4;
const clone=x=>JSON.parse(JSON.stringify(x));
const backups=JSON.parse(fs.readFileSync(new URL('./备份清单.json',import.meta.url),'utf8')).files;
const journalURL=new URL('./写盘事务.json',import.meta.url);
const journal=fs.existsSync(journalURL)?JSON.parse(fs.readFileSync(journalURL,'utf8')):{};
const journalSave=()=>fs.writeFileSync(journalURL,JSON.stringify(journal,null,1));
function begin(p,baseline){
 const f=fileOf(p);const rel=p.split('.')[0].slice(6)+'.uasset';const expected=backups.find(x=>x.file===rel)?.sha256;
 const now=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
 if(!expected||expected!==now)throw Error('备份之后磁盘变化，停止 '+p);
 if(journal[p]&&journal[p].phase!=='verified')throw Error('旧写盘事务尚未收口 '+p);
 journal[p]={at:new Date().toISOString(),phase:'begin',baseline,expectedSHA256:expected};journalSave();
}
const requireFields=(p,fields,name)=>{for(const k of fields)if(!(k in p))throw Error('读取缺字段 '+name+' '+k)};
async function saveAsset(p){
 const f=fileOf(p);fs.accessSync(f,fs.constants.W_OK);const before=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
 const r=await request('/object/call',{path:LIB,function:'SaveAsset',args:{AssetToSave:p.split('.')[0],bOnlyIfIsDirty:false}},120000);
 if(r.return_value!==true&&r.return_value!=='True')throw Error('保存未成功 '+p+' '+JSON.stringify(r));
 const after=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
 return {ok:true,beforeSHA256:before,afterSHA256:after,bytes:fs.statSync(f).size};
}
try{
 if(mode==='materials')for(const m of plan.materials){
  if(saved.has(m.name)||(names.length&&!names.includes(m.name)))continue;
  fs.accessSync(fileOf(m.material),fs.constants.W_OK);
  const fields=['Parent','ScalarParameterValues','VectorParameterValues','TextureParameterValues','StaticParameters','BasePropertyOverrides'];
  const before=await get(m.material,fields);requireFields(before,fields,m.name);begin(m.material,before);
  const wr=await setMI([m.name],0.98);
  if(!close(wr[0][3],0.98))throw Error('MI写值不一致 '+m.name);
  const after=await get(m.material,fields);requireFields(after,fields,m.name);
  const filtered=a=>({...a,ScalarParameterValues:(a.ScalarParameterValues||[]).filter(x=>x.ParameterInfo?.Name!=='EmissiveDissolve')});
  if(JSON.stringify(filtered(before))!==JSON.stringify(filtered(after)))throw Error('其它材质参数变化 '+m.name);
  const sv=await saveAsset(m.material);journal[m.material].phase='saved';journal[m.material].save=sv;journalSave();
  const readback=await get(m.material,fields);
  const vals=readback.ScalarParameterValues.filter(x=>x.ParameterInfo?.Name==='EmissiveDissolve');
  if(vals.length!==1||!close(vals[0].ParameterValue,0.98))throw Error('保存后MI读回失败 '+m.name);
  if(JSON.stringify(filtered(before))!==JSON.stringify(filtered(readback)))throw Error('保存后其它MI参数变化 '+m.name);
  out.materials.push({name:m.name,path:m.material,value:vals[0].ParameterValue,otherParametersUnchanged:true,save:sv});journal[m.material].phase='verified';journalSave();persist();console.log('MI saved '+m.name);
 }
 else if(mode==='systems')for(const s of plan.systems){
  if(saved.has(s.name)||(names.length&&!names.includes(s.name)))continue;
  if(s.skipSystem||(!s.writeBounds&&!s.emitters.length))continue;
  fs.accessSync(fileOf(s.system),fs.constants.W_OK);
  const before=await get(s.system,['bUseFixedRelativeBoundingBox','FixedRelativeBoundingBox']);requireFields(before,['bUseFixedRelativeBoundingBox','FixedRelativeBoundingBox'],s.name);
  const requiredBefore=[];for(const e of s.emitters)for(const l of e.lods){const q=await get(l.required,['ScreenAlignment','UVFlippingMode']);requireFields(q,['ScreenAlignment','UVFlippingMode'],s.name);requiredBefore.push({path:l.required,before:q});}
  begin(s.system,{system:before,required:requiredBefore});
  const vals=[];
  for(const e of s.emitters)for(const l of e.lods){await set(l.required,e.set);vals.push({emitter:e.emitter,lod:l.lod,path:l.required,want:e.set});}
  if(s.writeBounds)await set(s.system,{bUseFixedRelativeBoundingBox:true,FixedRelativeBoundingBox:boxTxt(s.bounds.min,s.bounds.max)});
  if(s.emitters.length)await rebuild(s.system);
  for(const v of vals){const q=await get(v.path,['ScreenAlignment','UVFlippingMode']);for(const [k,w] of Object.entries(v.want))if(q[k]!==w)throw Error('保存前Required核对失败 '+s.name);}
  const sv=await saveAsset(s.system);journal[s.system].phase='saved';journal[s.system].save=sv;journalSave();
  const after=await get(s.system,['bUseFixedRelativeBoundingBox','FixedRelativeBoundingBox']);
  if(s.writeBounds){const b=after.FixedRelativeBoundingBox;
   if(!after.bUseFixedRelativeBoundingBox||[b.Min.X,b.Min.Y,b.Min.Z].some((v,i)=>!close(v,s.bounds.min[i]))||[b.Max.X,b.Max.Y,b.Max.Z].some((v,i)=>!close(v,s.bounds.max[i])))throw Error('Bounds保存后读回失败 '+s.name);
  }
  for(const v of vals){v.readback=await get(v.path,['ScreenAlignment','UVFlippingMode']);for(const [k,w] of Object.entries(v.want))if(v.readback[k]!==w)throw Error('Required读回失败 '+s.name+' '+v.emitter+' '+k);}
  out.systems.push({name:s.name,path:s.system,boundsWritten:s.writeBounds,before,after,emitters:vals,save:sv});journal[s.system].phase='verified';journalSave();persist();console.log('PS saved '+s.name);
 }
 else throw Error('mode must be materials/systems');
}catch(e){out.errors.push({at:new Date().toISOString(),error:String(e)});persist();throw e;}
finally{saveLog('log_apply_'+mode+'.json');}
console.log('SAVED total systems='+out.systems.length+' MI='+out.materials.length);
