import React,{useEffect,useRef,useState,useId} from 'react';
import {fitHeight} from './editor-state.mjs';
export function NumberField({label,value,onCommit,step=.01,disabled=false}){
 const [draft,setDraft]=useState(String(value)),[error,setError]=useState('');
 const messageId=useId();
 const cancel=useRef(false),dirty=useRef(false);
 useEffect(()=>{setDraft(String(Math.round(value*1e6)/1e6));setError('');dirty.current=false},[value]);
 function commit(){if(cancel.current){cancel.current=false;return}if(!dirty.current)return;if(draft!==''&&Number(draft)===value){setError('');dirty.current=false;return}try{onCommit(draft);setError('');dirty.current=false}catch(e){setError(e.message)}}
 return <div className="field-row"><label>{label}<span><input aria-label={label} disabled={disabled} type="number" step={step} value={draft} aria-invalid={!!error} aria-describedby={error?messageId:undefined} title={disabled?'时间与节奏三档共用，请切到高配编辑':undefined} onChange={e=>{dirty.current=true;setDraft(e.target.value);setError('')}} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){cancel.current=true;dirty.current=false;setDraft(String(value));setError('');e.currentTarget.blur()}}}/><em>s</em></span></label>{error&&<p id={messageId} role="alert">{error}</p>}</div>;
}
export function Splitter({height,setHeight}){
 const drag=useRef();
 const limit=fitHeight(1e6,window.innerHeight);
 return <div className="workspace-splitter" role="separator" aria-label="调整画布与时间轴高度" aria-orientation="horizontal" aria-valuemin={240} aria-valuemax={limit} aria-valuenow={height} tabIndex={0}
 onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);drag.current={y:e.clientY,height};e.preventDefault()}}
 onPointerMove={e=>{if(drag.current)setHeight(fitHeight(drag.current.height+e.clientY-drag.current.y,window.innerHeight))}}
 onPointerUp={()=>drag.current=null} onLostPointerCapture={()=>drag.current=null}
 onDoubleClick={()=>setHeight(fitHeight(window.innerHeight*.46,window.innerHeight))}
 onKeyDown={e=>{if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();setHeight(e.key==='Home'?240:e.key==='End'?limit:fitHeight(height+(e.key==='ArrowDown'?20:-20),window.innerHeight))}}}
 title="上下拖动调整画布和时间轴；方向键微调，双击恢复默认"/>;
}
