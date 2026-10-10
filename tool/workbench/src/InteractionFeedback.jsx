import React,{useEffect,useRef,useState} from 'react';
import {CheckCircle,WarningCircle,X} from '@phosphor-icons/react';
// State layers supplement native controls without changing their command handlers.
export function useMaterialFeedback(root){
 useEffect(()=>{const node=root.current;if(!node)return;const timers=new Set();
 const ink=(event)=>{const control=event.target.closest?.('button,summary');if(!control||!node.contains(control)||control.disabled)return;
 if(event.type==='click'&&event.detail!==0)return;
 const rect=control.getBoundingClientRect(),size=Math.hypot(rect.width,rect.height)*2;
 const layer=document.createElement('span');layer.className='material-ink';layer.setAttribute('aria-hidden','true');
 const x=event.type==='click'?rect.width/2:event.clientX-rect.left,y=event.type==='click'?rect.height/2:event.clientY-rect.top;
 layer.style.cssText=`width:${size}px;height:${size}px;left:${x-size/2}px;top:${y-size/2}px`;
 control.append(layer);const timer=setTimeout(()=>{layer.remove();timers.delete(timer)},550);timers.add(timer);
 };
 node.addEventListener('pointerdown',ink);node.addEventListener('click',ink);
 return()=>{node.removeEventListener('pointerdown',ink);node.removeEventListener('click',ink);timers.forEach(clearTimeout);node.querySelectorAll('.material-ink').forEach(n=>n.remove())};
 },[root]);
}
export function Snackbar({notice,onClose,onUndo}){
 const [paused,setPaused]=useState(false);const remaining=useRef(6500);
 useEffect(()=>{remaining.current=notice?.action?9000:6500;setPaused(false)},[notice?.id]);
 useEffect(()=>{if(!notice||paused||notice.kind==='error')return;const start=performance.now(),timer=setTimeout(onClose,remaining.current);return()=>{clearTimeout(timer);remaining.current=Math.max(0,remaining.current-(performance.now()-start))}},[notice?.id,paused,onClose]);
 if(!notice)return null;
 const Icon=notice.kind==='error'?WarningCircle:CheckCircle;
 return <div className={'snackbar '+(notice.kind==='error'?'snackbar-error':'')} onPointerEnter={()=>setPaused(true)} onPointerLeave={()=>setPaused(false)} onFocusCapture={()=>setPaused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setPaused(false)}}>
 <Icon size={22} weight="fill" aria-hidden="true"/><span role={notice.kind==='error'?'alert':'status'} aria-atomic="true">{notice.message}</span>
 {notice.action&&<button className="snackbar-action" onClick={onUndo}>撤销</button>}
 <button aria-label="关闭操作提示" className="icon-button" onClick={onClose}><X size={18}/></button></div>;
}

export function AsyncButton({onClick,children,pendingLabel='处理中…',disabled,...props}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const running=useRef(false);
 async function act(e){if(running.current)return;running.current=true;setBusy(true);setError('');try{await onClick(e)}catch(err){setError(err.message||'操作失败，请重试')}finally{running.current=false;setBusy(false)}}
 return <><button {...props} disabled={disabled||busy} aria-busy={busy} onClick={act}>{busy?pendingLabel:children}</button>{error&&<p className="panel-warning" role="alert">{error}</p>}</>;
}
