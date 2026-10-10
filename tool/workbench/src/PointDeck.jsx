import React from 'react';
import {Check} from '@phosphor-icons/react';
export function PointDeck({points,point,solo,onSingle,onDouble,onClear}){
 const button=p=><button key={p.id} className={'deck-point '+(p.zone==='front'?'front-point ':'')+(point===p.id?'selected ':'')+(point===p.id&&solo?'isolated':'')} aria-label={`点位 ${p.id}`} aria-pressed={point===p.id} title={`${p.id} · 单击选中/取消，双击独看/返回全场`} onClick={e=>onSingle(p.id,e)} onDoubleClick={()=>onDouble(p.id)} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();onClear()}if(e.key==='Enter'&&e.shiftKey){e.preventDefault();onDouble(p.id,{point,solo})}}}>{point===p.id?<Check size={13} weight="bold" aria-hidden="true"/>:<i aria-hidden="true"/>}{p.id}</button>;
 return <div className="point-deck" aria-label="舞台点位选择"><div className="point-deck-row dam-row">{points.filter(p=>p.zone!=='front').map(button)}</div><div className="point-deck-row front-row">{points.filter(p=>p.zone==='front').map(button)}</div></div>;
}
