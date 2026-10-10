import React,{useMemo} from 'react';
import {ArrowSquareOut,ArrowClockwise} from '@phosphor-icons/react';
import {patternLink,patternUpdateReason} from './pattern-linkage.mjs';

export function PatternReference({state,cueId,onOpen,onUpdate}){
 const link=useMemo(()=>patternLink(state.doc,cueId),[state.doc,cueId]);
 const reason=useMemo(()=>link&&!link.missing&&link.latest.key!==link.pattern.key?patternUpdateReason(state,link.instanceId,link.latest.key):'',[state.doc,state.profiles,state.tier,link]);
 if(!link)return <p className="pattern-origin-note">独立片段 · 可存为编排模板后复用</p>;
 if(link.missing)return <p role="alert" className="panel-warning">引用版本 {link.key} 缺失，请导入包含模板库的节目备份。</p>;
 const newer=link.latest.key!==link.pattern.key;
 return <section className="pattern-reference" aria-label="片段引用的编排模板">
  <small>来源编排模板</small><b>{link.pattern.name}</b>
  <p>固定 v{link.pattern.version} · 此组 {link.cueIds.length} 个片段{newer&&' · 最新 v'+link.latest.version}</p>
  <button className="full" onClick={()=>onOpen(link)}><ArrowSquareOut size={16}/>查看引用模板 v{link.pattern.version}</button>
  {newer&&<><button className="full tonal-action" disabled={state.tier!=='high'||!!reason} aria-describedby={reason?'pattern-update-reason':undefined} onClick={()=>onUpdate(link)}><ArrowClockwise size={16}/>更新此组到 v{link.latest.version} · 可撤销</button><p id="pattern-update-reason" className="field-hint">{state.tier!=='high'?'切到高配后可更新引用版本。':reason||'仅更新此组；节目时刻和段落归属保留。'}</p></>}
 </section>;
}
