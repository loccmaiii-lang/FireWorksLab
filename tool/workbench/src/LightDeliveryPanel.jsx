// 交付 → 灯光（16.0.40，本机同步 8，用户 10-15 23:22）：按当前编排算 UE 序列 Seq_NewYear_TestShowTemplate_2 的
// SpotLight2 / SpotLight / SpotLight3 / SkyLight 强度与颜色关键帧，下载交付包，由 tool/fwlight 的 apply-pack 写进 UE。
// 只读计算和下载，不连 UE、不进撤销；天光峰值超过上限（10）不让下载。
import React,{useMemo,useState} from 'react';
import {DownloadSimple} from '@phosphor-icons/react';
import {buildLightDelivery,lightPackFiles} from './light-curve-model.mjs';
import {LIGHT_RIG} from './light-rig.mjs';
import {zipStore} from './zip-store.mjs';
import {WORKBENCH_VERSION} from './connection.mjs';

const SKY=LIGHT_RIG.lights.find(l=>l.light==='SkyLight'),SKY_DEFAULT=Math.round(LIGHT_RIG.model.i_peak*SKY.intensityScale*1e4)/1e4,SKY_MAX=SKY.maxIntensity;
const fmt=(v,d=2)=>Number(v).toFixed(d).replace(/\.?0+$/,'');
function stamp(d){const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`}
function Curve({curve,scale,peak,max,duration}){
 const W=300,H=72,n=curve.main.length,fps=curve.fps,end=Math.min(n,Math.ceil((duration+2)*fps)),B=150,top=Math.max(max,peak)*1.05;
 const pts=[];for(let b=0;b<B;b++){const a=Math.floor(b*end/B),z=Math.max(a+1,Math.floor((b+1)*end/B));let m=0;for(let f=a;f<z;f++)if(curve.main[f]>m)m=curve.main[f];pts.push(`${(b/(B-1)*W).toFixed(1)},${(H-m*scale/top*H).toFixed(1)}`)}
 const capY=H-max/top*H;
 return <svg className="light-curve" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`天光强度曲线，峰值 ${fmt(peak)}，上限 ${max}`} preserveAspectRatio="none"><line x1="0" x2={W} y1={capY} y2={capY} className="light-curve-cap"/><polyline points={pts.join(' ')} className="light-curve-line"/></svg>;
}
export function LightDeliveryPanel({doc,notify}){
 const [skyText,setSkyText]=useState(String(SKY_DEFAULT));
 const skyValue=Number(skyText),skyValid=skyText.trim()!==''&&Number.isFinite(skyValue)&&skyValue>0;
 const programme=useMemo(()=>({name:doc.meta.programName||doc.meta.name||'烟花节目',version:doc.meta.cloudVersion||null,cloudName:doc.meta.cloudName||null,compositionRevision:doc.meta.compositionRevision||null,programFileVersion:doc.meta.programFileVersion||null}),[doc.meta]);
 const result=useMemo(()=>{if(!skyValid)return {error:'请填大于 0 的天光峰值'};try{return buildLightDelivery(doc,{skyPeak:skyValue===SKY_DEFAULT?undefined:skyValue,programme,generator:'烟花编排工作台 '+WORKBENCH_VERSION})}catch(e){return {error:e.message}}},[doc,skyValue,skyValid,programme]);
 const sky=result.rows?.find(r=>r.light==='SkyLight'),blocked=Boolean(result.error||result.errors?.length);
 function download(){const now=new Date(),folder=`fwlight-${programme.version||'v'+(programme.programFileVersion||0)}-${stamp(now)}`;const bytes=zipStore(lightPackFiles(result),{folder,now});const url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));const a=document.createElement('a');a.href=url;a.download=folder+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('灯光交付包已下载：解压后用 fwlight.py apply-pack 写进 UE')}
 return <><section className="inspector-section"><h3>来源</h3><div className="delivery-summary"><b>{result.manifest?.events??'—'}</b><span>次播放 · PC 高配<small>{programme.version?`云端编排 ${programme.version} · ${programme.cloudName||programme.name}`:programme.name}</small></span></div><p className="field-hint">去掉只上手游的替身；序列只有一份，PC / 手游、高中低共用这条灯光。坐标用关卡 MA5_FireworkOnDam_Night 的实测位置。</p></section>
 <section className="inspector-section"><h3>天光峰值</h3><label className="panel-field">SkyLight 最亮一帧<input aria-label="天光峰值" type="number" min="0.1" max={SKY_MAX} step="0.01" value={skyText} onChange={e=>setSkyText(e.target.value)}/></label>{sky&&<Curve curve={result.curve} scale={sky.intensityScale} peak={sky.peak} max={SKY_MAX} duration={doc.meta.duration}/>}<p className="field-hint">上限 {SKY_MAX}（虚线）。峰值 = 全场最亮一帧（{result.manifest?fmt(result.manifest.peakAtS,1)+' s':'—'}），编排疏密不改变它；改这里只缩放天光，三盏聚光灯不变。默认 {SKY_DEFAULT} = 现在 UE 里的比例。</p>{result.errors?.map(e=><p key={e} className="panel-warning" role="alert">{e}</p>)}</section>
 <section className="inspector-section"><h3>四盏灯 <span>Seq_NewYear_TestShowTemplate_2</span></h3>{result.error?<p className="panel-warning" role="alert">{result.error}</p>:<table className="light-table"><thead><tr><th>灯</th><th>峰值</th><th>强度键</th><th>颜色键</th></tr></thead><tbody>{result.rows.map(r=><tr key={r.light}><td>{r.light}{r.curveFrom&&<small>{r.light==='SkyLight'?` = ${r.curveFrom} × ${fmt(r.intensityScale,6)}`:` = ${r.curveFrom}`}</small>}</td><td>{fmt(r.peak)}</td><td>{r.intensityKeys}</td><td>{r.colorKeys}</td></tr>)}</tbody></table>}{result.warnings?.map(w=><p key={w} className="panel-warning">{w}</p>)}<p className="field-hint">下载的 ZIP 解压后在 tool/fwlight 运行 <code>python fwlight.py apply-pack &lt;目录&gt; --no-save</code> 先看，满意再 <code>save</code>；需要先在 P4 迁出序列。这里只计算和下载，不写 UE。</p></section>
 <button className="full primary-action" disabled={blocked} onClick={download}><DownloadSimple size={15}/>下载灯光交付包</button></>;
}
