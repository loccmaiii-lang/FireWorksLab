import React,{useState,useMemo,useRef,useEffect} from 'react';
import {readDirector,prepareImport,executeImport,DEFAULT_ENGINE} from './engine.mjs';
import {compileDirector} from 'df-source/director-model.mjs';
import {ueText} from 'df-source/delivery-model.mjs';
import {downloadText} from 'df-source/workbench-data.mjs';
function remembered(){try{return JSON.parse(localStorage.getItem('df.offline.ue.v1')||'{}')}catch{return {}}}
export function EnginePanel({doc,events,tier,notify}){
 const preferences=useMemo(remembered,[]),[base,setBase]=useState(preferences.base||DEFAULT_ENGINE),[path,setPath]=useState(preferences.path||''),[busy,setBusy]=useState(false),[checked,setChecked]=useState(false),[plan,setPlan]=useState(null),[status,setStatus]=useState('仅在检查或导入时连接本机 UE；编辑、音乐和文件保存可以离线使用。'),[receipt,setReceipt]=useState(null);
 const output=useMemo(()=>compileDirector(doc,events),[doc,events]);
 const signature=JSON.stringify({base,path,tier,arrays:output.arrays,duration:doc.meta.duration});const current=useRef(signature);current.current=signature;
 const previousSignature=useRef(signature);
 useEffect(()=>{if(previousSignature.current!==signature){setStatus('节目、档位或连接目标已改变，请重新检查。');previousSignature.current=signature}setPlan(null);setChecked(false);setReceipt(null)},[signature]);
 useEffect(()=>{const block=e=>{if(globalThis.__DF_ENGINE_BUSY__&&!e.target.closest?.('.offline-engine-panel')){e.preventDefault();e.stopImmediatePropagation()}};const unload=e=>{if(globalThis.__DF_ENGINE_BUSY__){e.preventDefault();e.returnValue='UE 导入正在执行'}};document.addEventListener('click',block,true);document.addEventListener('keydown',block,true);window.addEventListener('beforeunload',unload);return()=>{document.removeEventListener('click',block,true);document.removeEventListener('keydown',block,true);window.removeEventListener('beforeunload',unload)}},[]);
 async function check(){const start=signature;setBusy(true);setPlan(null);setChecked(false);setReceipt(null);setStatus('正在只读核对导演和实际发射点…');try{const target=await readDirector(path,{base});if(current.current!==start)throw Error('节目或连接目标已改变，请重新检查');const result=compileDirector(doc,events,target);if(result.issues.length)throw Error(result.issues.join('；'));if(!events.length)throw Error('当前档位没有发射事件，请先编排');const next=prepareImport(target,result.arrays,doc.meta.duration);setPlan({...next,signature:start,summary:result.summary});try{localStorage.setItem('df.offline.ue.v1',JSON.stringify({base,path}))}catch{}setStatus(`检查通过 · ${target.points.length} 个现场点 · ${events.length} 次播放。将替换所选目标的三表和节目时长。`)}catch(e){setStatus('检查未通过：'+e.message);notify(e.message,'error')}finally{setBusy(false)}}
 async function execute(){if(!plan||!checked||plan.signature!==current.current)return;setBusy(true);globalThis.__DF_ENGINE_BUSY__=true;setStatus('正在重读基线、写入并核对…');try{
  // Preserve the exact prior configuration before the one user-authorized write.
  downloadText('导演导入前备份-'+Date.now()+'.json',JSON.stringify({format:'df.director-before-import/1',path:plan.path,assetPath:plan.assetPath,config:plan.before},null,2));
  const r=await executeImport(plan,{base,serialize:ueText});setReceipt(r);downloadText('导演导入回执-'+Date.now()+'.json',JSON.stringify(r,null,2));
  const message=r.saved?'UE 已写入、读回一致并保存所选 Blueprint。':r.needsLevelSave?'UE 已写入并读回一致；关卡 Actor 修改尚未保存，请在 UE 保存关卡。':'UE 已写入并读回一致，但保存失败：'+r.saveError;
  setStatus(message);notify(message,r.saved?'success':'info');setPlan(null);setChecked(false);
 }catch(e){setStatus('导入未完成：'+e.message+(e.rollbackVerified?'；已读回确认恢复导入前配置。':'；请核对 UE 和导入前备份。'));notify('导入未完成：'+e.message,'error');setPlan(null);setChecked(false)}finally{globalThis.__DF_ENGINE_BUSY__=false;setBusy(false)}}
 return <section className="inspector-section offline-engine-panel" aria-label="本机UE导入"><h3>连接本机 UE</h3><fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}>
 <label className="panel-field stacked">本机 UE 服务<input aria-label="本机UE服务" value={base} onChange={e=>setBase(e.target.value)}/></label>
 <label className="panel-field stacked">导演 Blueprint / Actor 路径<input aria-label="离线导演路径" value={path} placeholder="粘贴内容浏览器中的导演路径" onChange={e=>setPath(e.target.value)}/></label>
 <button className="full" disabled={!path.trim()||output.issues.length>0||!events.length} onClick={check}>{busy?'处理中…':'检查导演与发射点（只读）'}</button>
 {plan&&<><p className="field-hint">目标：{plan.path}<br/>{plan.summary.subTemplates} 个子模板 · {plan.summary.templates} 个模板 · {plan.summary.scheduleSlots} 个时序项。其他导演设置保留。</p>
 <label className="panel-check"><input type="checkbox" aria-label="确认替换导演三表" checked={checked} onChange={e=>setChecked(e.target.checked)}/>已核对目标，同意替换当前档位的三表及节目时长</label>
 <button className={'full'+(checked?' primary-action':'')} disabled={!checked} onClick={execute}>备份并导入 UE</button></>}
 </fieldset><p role="status" className="field-hint" style={{overflowWrap:'anywhere'}}>{status}</p>
 {receipt&&<p className="field-hint">实际写入/读回：{receipt.verified?'通过':'未通过'} · 保存：{receipt.saved?'通过':'未完成'} · UE 实播：未验证</p>}
 <p className="field-hint">接收方也需运行已有的 GPUECli 服务。无需8025开发服务或公网；更换文件位置/浏览器时请使用节目版本文件迁移。</p></section>;
}
