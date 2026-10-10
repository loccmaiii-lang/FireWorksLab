import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {probeConnection,WORKBENCH_VERSION} from './connection.mjs';
const Context=createContext(null),KEY='df.workbench.ue.target.v2';
export function ConnectionProvider({children}){
 const [state,setState]=useState({status:'checking',generation:0,target:null}),[writing,setWriting]=useState(false),sequence=useRef(0),abort=useRef();
 async function reconnect(preferred,explicit=false){if(writing)return;const wasConnected=state.status==='connected',seq=++sequence.current;abort.current?.abort();abort.current=new AbortController();setState(s=>({...s,status:'checking',target:null}));
  try{if(!preferred)try{preferred=localStorage.getItem(KEY)||undefined;explicit=!!preferred}catch{}const result=await probeConnection({preferred,explicit,signal:abort.current.signal});if(seq!==sequence.current)return;
   setState({...result,status:'connected',generation:seq});if(result.target)try{localStorage.setItem(KEY,result.target.path)}catch{}return result;
  }catch(e){if(seq===sequence.current)setState({status:/fetch|network|超时|取消/i.test(e.message)?'offline':wasConnected?'connected':'offline',target:null,generation:seq,message:'目标检查失败：'+e.message});}
 }
 useEffect(()=>{reconnect();return()=>{sequence.current++;abort.current?.abort()}},[]);
 return <Context.Provider value={{state,reconnect,chooseTarget:path=>reconnect(path,true),writing,setWriting}}>{children}</Context.Provider>;
}
export function useEngineConnection(){const value=useContext(Context);if(!value)throw Error('连接上下文未安装');return value;}
export function ConnectionStatus(){const {state,reconnect,writing}=useEngineConnection();return <div className="ue-connection"><span className={'ue-badge '+state.status} role="status" title={state.message||state.target?.path}>{state.status==='connected'?'已连接 UE':state.status==='checking'?'连接中…':'未连接 UE'}</span><button className="quiet-btn" disabled={state.status==='checking'||writing} onClick={()=>reconnect()} aria-label="重新连接UE">重新连接</button><small>工作台 v{WORKBENCH_VERSION} · locmai</small></div>;}
