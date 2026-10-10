import React from 'react';
import {NumberField} from './EditorControls.jsx';
import {validateLaunchJitter} from './launch-jitter.mjs';
export function LaunchJitterControls({value,onChange,disabled=false}){
 const config=value||{maxS:0,seed:1};
 function change(maxS,seed=config.seed){const next={maxS:Number(maxS),seed};validateLaunchJitter(next);onChange(next)}
 return <div className="launch-jitter-controls"><NumberField label="随机错开" step={.1} value={config.maxS} disabled={disabled} onCommit={change}/><div className="jitter-actions"><small>{config.maxS?`每次完整花型延迟 0–${config.maxS} s · 第 ${config.seed} 组`:'0 秒关闭 · 可与同时发射一起使用'}</small><button disabled={disabled||!config.maxS} onClick={()=>change(config.maxS,config.seed+1)}>换一组</button></div><p className="field-hint">按0.1秒错开完整花型；球花与尾缀一起移动，播放和三档共用这组时序。</p></div>;
}
