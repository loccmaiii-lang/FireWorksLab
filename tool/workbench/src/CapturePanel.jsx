import React,{useState} from 'react';
import {PanelHeader} from './DeliveryPanel.jsx';
import {RecipeField as Field} from './SubTemplateWorkspace.jsx';
import {captureChoreography} from './choreography-capture.mjs';
import {stamp} from './Timeline.jsx';
export function CapturePanel({state,selected,onSave,onBack}){
 const [name,setName]=useState(selected?.name||'我的编排'),[ids,setIds]=useState(selected?[selected.id]:[]),[search,setSearch]=useState(''),[error,setError]=useState('');
 return <><PanelHeader title="存为编排模板" onBack={onBack}/><div className="inspector-body"><Field label="新编排模板名称" type="text" value={name} onChange={setName}/><p className="field-hint">选择一条或多条片段，以最早发射为相对0点。保存固定版本、发射口、相对交叠和三档；原节目保持。</p><input aria-label="筛选待复用片段" value={search} placeholder="搜索片段" onChange={e=>setSearch(e.target.value)}/><div className="capture-cues">{state.doc.cues.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())).map(c=><label key={c.id}><input type="checkbox" aria-label={'保存为模板 '+c.name+' '+c.id} checked={ids.includes(c.id)} onChange={e=>setIds(v=>e.target.checked?[...v,c.id]:v.filter(id=>id!==c.id))}/><span>{c.name}<small>{stamp(c.start,true)} · {c.pointIds.join(' / ')}</small></span></label>)}</div>{error&&<p role="alert" className="panel-warning">{error}</p>}</div><div className="recipe-save"><button className="primary-action" disabled={!ids.length} onClick={()=>{try{onSave(captureChoreography(state,ids,{name}))}catch(e){setError(e.message)}}}>保存到编排模板 · {ids.length} 片段</button></div></>;
}
