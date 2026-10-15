// 交付 → 灯光（16.0.40 起，本机同步 8）：按当前编排算 UE 序列 Seq_NewYear_TestShowTemplate_2 的
// SpotLight2 / SpotLight / SpotLight3 / SkyLight 强度与颜色关键帧。16.0.42 起「导演表 → 自动导入 UE」勾上「同时写入灯光」就和导演表一起写进 UE；
// 这里看曲线、设天光峰值（和自动导入共用），也能下载交付包给 tool/fwlight 的 apply-pack 手动写。天光峰值超过上限（10）不让下载、不让导入。
import React,{useMemo} from 'react';
import {DownloadSimple} from '@phosphor-icons/react';
import {lightPackFiles} from './light-curve-model.mjs';
import {SKY_DEFAULT,SKY_MAX,lightProgramme,workbenchLightDelivery,stampNow,downloadZip} from './light-settings.mjs';

const fmt=(v,d=2)=>Number(v).toFixed(d).replace(/\.?0+$/,'');
function Curve({curve,scale,peak,max,duration}){
 const W=300,H=72,n=curve.main.length,fps=curve.fps,end=Math.min(n,Math.ceil((duration+2)*fps)),B=150,top=Math.max(max,peak)*1.05;
 const pts=[];for(let b=0;b<B;b++){const a=Math.floor(b*end/B),z=Math.max(a+1,Math.floor((b+1)*end/B));let m=0;for(let f=a;f<z;f++)if(curve.main[f]>m)m=curve.main[f];pts.push(`${(b/(B-1)*W).toFixed(1)},${(H-m*scale/top*H).toFixed(1)}`)}
 const capY=H-max/top*H;
 return <svg className="light-curve" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`天光强度曲线，峰值 ${fmt(peak)}，上限 ${max}`} preserveAspectRatio="none"><line x1="0" x2={W} y1={capY} y2={capY} className="light-curve-cap"/><polyline points={pts.join(' ')} className="light-curve-line"/></svg>;
}
export function LightDeliveryPanel({doc,notify,light}){
 const programme=useMemo(()=>lightProgramme(doc),[doc.meta]);
 const out=useMemo(()=>workbenchLightDelivery(doc,light),[doc,light.skyPeak,light.skyValid]);
 const result=out.delivery||{error:out.error};
 const sky=result.rows?.find(r=>r.light==='SkyLight'),blocked=Boolean(result.error||result.errors?.length);
 function download(){const name=`fwlight-${programme.version||'v'+(programme.programFileVersion||0)}-${stampNow().slice(0,13)}`;downloadZip(name,lightPackFiles(result));notify('灯光交付包已下载：解压后用 fwlight.py apply-pack 写进 UE')}
 return <><section className="inspector-section"><h3>来源</h3><div className="delivery-summary"><b>{result.manifest?.events??'—'}</b><span>次播放 · PC 高配<small>{programme.version?`云端编排 ${programme.version} · ${programme.cloudName||programme.name}`:programme.name}</small></span></div><p className="field-hint">去掉只上手游的替身；序列只有一份，PC / 手游、高中低共用这条灯光。坐标用关卡 MA5_FireworkOnDam_Night 的实测位置。编排一换，这里和自动导入都跟着重算。</p></section>
 <section className="inspector-section"><h3>天光峰值</h3><label className="panel-field">SkyLight 最亮一帧<input aria-label="天光峰值" type="number" min="0.1" max={SKY_MAX} step="0.01" value={light.skyText} onChange={e=>light.setSkyText(e.target.value)}/></label>{sky&&<Curve curve={result.curve} scale={sky.intensityScale} peak={sky.peak} max={SKY_MAX} duration={doc.meta.duration}/>}<p className="field-hint">上限 {SKY_MAX}（虚线）。峰值 = 全场最亮一帧（{result.manifest?fmt(result.manifest.peakAtS,1)+' s':'—'}），编排疏密不改变它；改这里只缩放天光，三盏聚光灯不变。默认 {SKY_DEFAULT} = 现在 UE 里的比例。这个值存在这台电脑，自动导入也用它。</p>{result.errors?.map(e=><p key={e} className="panel-warning" role="alert">{e}</p>)}</section>
 <section className="inspector-section"><h3>四盏灯 <span>Seq_NewYear_TestShowTemplate_2</span></h3>{result.error?<p className="panel-warning" role="alert">{result.error}</p>:<table className="light-table"><thead><tr><th>灯</th><th>峰值</th><th>强度键</th><th>颜色键</th></tr></thead><tbody>{result.rows.map(r=><tr key={r.light}><td>{r.light}{r.curveFrom&&<small>{r.light==='SkyLight'?` = ${r.curveFrom} × ${fmt(r.intensityScale,6)}`:` = ${r.curveFrom}`}</small>}</td><td>{fmt(r.peak)}</td><td>{r.intensityKeys}</td><td>{r.colorKeys}</td></tr>)}</tbody></table>}{result.warnings?.map(w=><p key={w} className="panel-warning">{w}</p>)}</section>
 <section className="inspector-section"><h3>写进 UE</h3><p className="field-hint">{light.enabled?'现在：「导演表 → 自动导入 UE」会一起写这四盏灯（同一个确认、同一次点击；写前自动下载 UE 里原来的灯光曲线备份）。':'现在：自动导入只写导演表，不写灯光（在「导演表 → 自动导入 UE」里勾「同时写入灯光」）。'}也可以下载交付包，用 tool/fwlight 的 <code>python fwlight.py apply-pack &lt;目录&gt;</code> 手动写。</p></section>
 <button className="full" disabled={blocked} onClick={download}><DownloadSimple size={15}/>下载灯光交付包</button></>;
}
