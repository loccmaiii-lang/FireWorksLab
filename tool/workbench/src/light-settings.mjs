// 灯光交付设置（16.0.42）：天光峰值、导入导演表时是否一起写灯光。存这台电脑的浏览器（刷新、云端换编排后保留），
// 交付页「灯光」和「导演表 → 自动导入 UE」读同一份。
import {useCallback,useEffect,useState} from 'react';
import {buildLightDelivery} from './light-curve-model.mjs';
import {LIGHT_RIG} from './light-rig.mjs';
import {WORKBENCH_VERSION} from './connection.mjs';
import {zipStore} from './zip-store.mjs';

const SKY=LIGHT_RIG.lights.find(l=>l.light==='SkyLight');
export const SKY_DEFAULT=Math.round(LIGHT_RIG.model.i_peak*SKY.intensityScale*1e4)/1e4,SKY_MAX=SKY.maxIntensity;
const QA=typeof location!=='undefined'?new URLSearchParams(location.search).get('qa'):null;
const KEY='df-workbench-light-settings-v1'+(QA?'-qa-'+QA:'');
function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return {enabled:v?.enabled!==false,skyText:typeof v?.skyText==='string'?v.skyText:String(SKY_DEFAULT)}}catch{return {enabled:true,skyText:String(SKY_DEFAULT)}}}

export function parseSky(text){const v=Number(text);return String(text).trim()!==''&&Number.isFinite(v)&&v>0?v:null;}
export function useLightSettings(){
 const [state,setState]=useState(load);
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}},[state]);
 const setEnabled=useCallback(enabled=>setState(s=>({...s,enabled:!!enabled})),[]),setSkyText=useCallback(skyText=>setState(s=>({...s,skyText})),[]);
 const value=parseSky(state.skyText);
 return {enabled:state.enabled,setEnabled,skyText:state.skyText,setSkyText,skyValid:value!==null,skyPeak:value===null||value===SKY_DEFAULT?undefined:value,skyValue:value};
}

export function lightProgramme(doc){return {name:doc.meta.programName||doc.meta.name||'烟花节目',version:doc.meta.cloudVersion||null,cloudName:doc.meta.cloudName||null,compositionRevision:doc.meta.compositionRevision||null,programFileVersion:doc.meta.programFileVersion||null};}
// 交付页「灯光」和自动导入共用：失败时返回 {error}，不抛
export function workbenchLightDelivery(doc,settings){
 if(settings&&!settings.skyValid)return {error:'请填大于 0 的天光峰值'};
 try{return {delivery:buildLightDelivery(doc,{skyPeak:settings?.skyPeak,programme:lightProgramme(doc),generator:'烟花编排工作台 '+WORKBENCH_VERSION})}}catch(e){return {error:e.message}}
}
export function lightFingerprint(result){
 if(!result)return null;if(result.error)return 'error:'+result.error;
 const d=result.delivery;return JSON.stringify([d.manifest.sMax,d.rows.map(r=>[r.light,r.peak,r.intensityKeys,r.colorKeys,r.intensityScale]),d.curve.main.reduce((a,b)=>a+b,0)]);
}
export function stampNow(d=new Date()){const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`}
export function downloadZip(name,files){const folder=name.replace(/\.zip$/,''),bytes=zipStore(files,{folder});const url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));const a=document.createElement('a');a.href=url;a.download=folder+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
