import React,{useState,useEffect} from 'react';
import {PanelHeader} from './DeliveryPanel.jsx';
import {RecipeField as Field} from './SubTemplateWorkspace.jsx';
export function SectionPanel({section,range,onAction,onBack}){
 const [name,setName]=useState(section?.name||'新编排段落'),[start,setStart]=useState(section?.start??range[0]),[end,setEnd]=useState(section?.end??range[1]),[moveTo,setMoveTo]=useState(section?.start??range[0]),[error,setError]=useState('');
 useEffect(()=>{if(section){setName(section.name);setStart(section.start);setEnd(section.end);setMoveTo(section.start)}},[section?.name,section?.start,section?.end]);
 function act(action,args){try{onAction(action,args);setError('')}catch(e){setError(e.message)}}
 return <><PanelHeader title="编排段落" onBack={onBack}/><div className="inspector-body"><h2>{section?'编辑段落':'建立段落'}</h2><p className="field-hint">段落是你定义的节目范围。名称与边界调整不会移动片段；烟花可跨过段落边界自然结束。</p><Field label="段落名称" type="text" value={name} onChange={setName}/><Field label="段落起点 s" min={0} step={.1} value={start} onChange={setStart}/><Field label="段落终点 s" min={0} step={.1} value={end} onChange={setEnd}/><button className="primary-action full" onClick={()=>act(section?'update':'create',{id:section?.id,name,start,end})}>{section?'保存段落设置':'创建编排段落'}</button>
 {section&&<section className="inspector-section"><h3>整段移动</h3><p className="field-hint">只移动明确归属本段落的片段，保持它们内部的相对时序。所有操作可撤销。</p><Field label="移动至节目时刻 s" min={0} step={.1} value={moveTo} onChange={setMoveTo}/><button className="full" onClick={()=>act('move',{id:section.id,start:moveTo})}>整段移动（含归属片段）</button><button className="danger-action full" onClick={()=>act('delete',{id:section.id})}>删除段落，保留片段</button></section>}{error&&<p role="alert" className="panel-warning">{error}</p>}</div></>;
}
