import React,{useState,useMemo,useRef,useEffect} from 'react';
import {readDirector,prepareImport,executeImport,DEFAULT_ENGINE,EFFECT_KEYS,same} from './engine.mjs';
import {compileDirector} from './director-model.mjs';
import {ueText} from './delivery-model.mjs';
import {downloadText} from './workbench-data.mjs';
import {useEngineConnection} from './ConnectionProvider.jsx';
import {DirectorTargetPicker} from './DirectorTargetPicker.jsx';
export function EnginePanel({doc,events,tier,notify}){
 const {state:connection,reconnect,writing,setWriting}=useEngineConnection(),base=DEFAULT_ENGINE,path=connection.target?.path||'';
 const [busy,setBusy]=useState(false),[checked,setChecked]=useState(false),[plan,setPlan]=useState(null),[status,setStatus]=useState('正在等待本机 UE 连接'),[receipt,setReceipt]=useState(null);
 const sequence=useRef(0),abort=useRef();
 const [targetEditing,setTargetEditing]=useState(false);
 useEffect(()=>()=>{sequence.current++;abort.current?.abort()},[]);
 const output=useMemo(()=>compileDirector(doc,events),[doc,events]);
 const signature=JSON.stringify({base,path,tier,targetEditing,arrays:output.arrays,duration:doc.meta.duration});const current=useRef(signature);current.current=signature;
 const previousSignature=useRef(signature);
 useEffect(()=>{if(previousSignature.current!==signature){setStatus('节目、档位或连接目标已改变，请重新检查。');previousSignature.current=signature}setPlan(null);setChecked(false);setReceipt(null)},[signature]);
 useEffect(()=>{const block=e=>{if(globalThis.__DF_ENGINE_BUSY__&&!e.target.closest?.('.offline-engine-panel')){e.preventDefault();e.stopImmediatePropagation()}};const unload=e=>{if(globalThis.__DF_ENGINE_BUSY__){e.preventDefault();e.returnValue='UE 导入正在执行'}};document.addEventListener('click',block,true);document.addEventListener('keydown',block,true);window.addEventListener('beforeunload',unload);return()=>{document.removeEventListener('click',block,true);document.removeEventListener('keydown',block,true);window.removeEventListener('beforeunload',unload)}},[]);
 async function check(){if(!path)return;const seq=++sequence.current;abort.current?.abort();abort.current=new AbortController();const start=signature;setBusy(true);setPlan(null);setChecked(false);setReceipt(null);setStatus('正在只读核对导演和实际发射点…');try{const target=await readDirector(path,{base,signal:abort.current.signal});if(seq!==sequence.current)return;if(current.current!==start)throw Error('节目或连接目标已改变，请重新检查');const result=compileDirector(doc,events,target);if(result.issues.length)throw Error(result.issues.join('；'));if(!events.length)throw Error('当前档位没有发射事件，请先编排');const next=prepareImport(target,result.arrays,doc.meta.duration);setPlan({...next,signature:start,summary:result.summary});setStatus(`检查通过 · ${target.points.length} 个现场点 · ${events.length} 次播放。将替换所选目标的三表和节目时长。${target.relatedTargets?.length?'将同时核对并同步导演蓝图默认值与这个场景实例（2个对象）；当前两端'+(EFFECT_KEYS.every(k=>same(target.config[k],target.relatedTargets[0].config[k]))?'一致。':'不一致。'):'当前仅有一个可写目标；未找到可关联的正式场景实例。'}`)}catch(e){if(seq===sequence.current){setStatus('检查未通过：'+e.message);}}finally{if(seq===sequence.current)setBusy(false)}}
 useEffect(()=>{if(!targetEditing&&connection.status==='connected'&&path&&events.length&&!output.issues.length)check();else {sequence.current++;abort.current?.abort();setBusy(false);setStatus(targetEditing?'请选择并核对导演，原导入确认已清除。':connection.message||(!events.length?'当前档位没有发射事件，请先编排':output.issues.join('；')||'正在等待本机 UE 连接'));}return()=>{sequence.current++;abort.current?.abort()}},[signature,connection.status,connection.generation]);
 async function execute(){if(!plan||!checked||plan.signature!==current.current)return;setBusy(true);setWriting(true);globalThis.__DF_ENGINE_BUSY__=true;setStatus('正在重读基线、写入并核对…');try{
  // Preserve the exact prior configuration before the one user-authorized write.
  downloadText('导演导入前备份-'+Date.now()+'.json',JSON.stringify({format:'df.director-before-import/1',path:plan.path,assetPath:plan.assetPath,config:plan.before,relatedTargets:(plan.relatedPlans||[]).map(p=>({path:p.path,assetPath:p.assetPath,config:p.before}))},null,2));
  const r=await executeImport(plan,{base,serialize:ueText});setReceipt(r);downloadText('导演导入回执-'+Date.now()+'.json',JSON.stringify(r,null,2));
  const message=r.paired?(r.saved?'导演蓝图与场景实例三表读回一致；蓝图已保存，请在UE保存该实例所属子关卡。':'两端已读回一致，蓝图保存失败：'+r.saveError):r.saved?'UE 已写入、读回一致并保存所选 Blueprint；未找到可关联场景实例。':r.needsLevelSave?'UE 已写入并读回一致；关卡 Actor 修改尚未保存，请在 UE 保存关卡。':'UE 已写入并读回一致，但保存失败：'+r.saveError;
  setStatus(message);notify(message,r.saved?'success':'info');setPlan(null);setChecked(false);
 }catch(e){setStatus('导入未完成：'+e.message+(e.rollbackVerified?'；已读回确认恢复导入前配置。':'；请核对 UE 和导入前备份。'));notify('导入未完成：'+e.message,'error');setPlan(null);setChecked(false)}finally{globalThis.__DF_ENGINE_BUSY__=false;setWriting(false);setBusy(false)}}
 return <section className="inspector-section offline-engine-panel" aria-label="本机UE导入"><h3>自动导入 UE</h3>
 <DirectorTargetPicker onEditing={setTargetEditing}/>
 <button className="full primary-action" aria-busy={writing} disabled={!plan||!checked||busy||writing} onClick={execute}>{writing?'正在导入并核对…':'自动导入 UE'}</button>
 <label className="panel-check"><input type="checkbox" aria-label="确认替换导演三表" disabled={!plan||busy} checked={checked} onChange={e=>setChecked(e.target.checked)}/>{plan?.relatedPlans?.length?'确认替换导演蓝图与此场景实例的三表及节目时长':'确认替换当前档位三表与节目时长'}</label>
 <p role="status" className="field-hint" style={{overflowWrap:'anywhere'}}>{status}</p>
 <button className="quiet-btn full" disabled={!path||busy||writing} onClick={check}>{busy&&!writing?'正在检查…':'重新检查导演与发射点'}</button>
 {plan&&<p className="field-hint">{plan.summary.subTemplates} 个子模板 · {plan.summary.templates} 个模板 · {plan.summary.scheduleSlots} 个时序项。导入前自动备份{plan.relatedPlans?.length?'两个对象':'所选对象'}，其他导演设置保留。</p>}
 {receipt&&<p className="field-hint">实际写入/读回：{receipt.verified?'通过':'未通过'} · 保存：{receipt.saved?'通过':'未完成'} · UE 实播：未验证</p>}
 <details><summary>连接与目标详情</summary><p className="field-hint" style={{overflowWrap:'anywhere'}}>固定本机接口：{DEFAULT_ENGINE}<br/>导演：{path||'未识别'}<br/>接收方需打开对应UE工程及已有GPUECli服务。检查不写入；导入范围以检查结果为准；关联只来自精确所属蓝图类。</p></details></section>;
}
