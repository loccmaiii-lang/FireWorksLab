// 只读：在运行中的 UE 里跑灯光脚本 check / dry（dry 只取写入前曲线、校验数据，不改不存）。用法 node probe.mjs check|dry
import fs from 'node:fs';
const W='file:///F:/FireWorksLab/tool/workbench/src/';
const {engineRequest}=await import(W+'engine.mjs');
const {runLightScript,checkLightTarget,lightScriptData,backupPackFiles}=await import(W+'light-engine.mjs');
const {buildLightDelivery}=await import(W+'light-curve-model.mjs');
const request=(route,payload,opts={})=>engineRequest(route,payload,{...opts,timeout:45000});
const mode=process.argv[2]||'check',OUT='F:/FireWorksLab/analysis/results/WORKBENCH_LIGHT_UE/';
const t0=Date.now();
if(mode==='check'){const c=await checkLightTarget(request);fs.writeFileSync(OUT+'check.json',JSON.stringify(c,null,1));console.log(JSON.stringify({ok:c.ok,issues:c.issues,notes:c.notes,fps:c.info.fps,tick:c.info.tick,end:c.info.end_s,dirty:c.info.dirty,readonly:c.info.readonly,file:c.info.file,lights:c.info.lights},null,1));}
else{const raw=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));const d=buildLightDelivery(raw.payload?.doc??raw,{});
 const r=await runLightScript(request,'dry',{data:lightScriptData(d)});fs.writeFileSync(OUT+'dry.json',JSON.stringify({result:r.result,returned:r.returned},null,1));
 const pack=backupPackFiles(r.backup);fs.writeFileSync(OUT+'dry-backup-manifest.json',pack['manifest.json']);
 const sl2=JSON.parse(pack['keys_SpotLight2.json']);console.log(JSON.stringify({ok:r.result.ok,code:r.result.code,err:r.result.error,dry:r.result.dry_keys,ticks:r.result.dry_ticks_ok,backupLights:Object.keys(r.backup?.lights||{}),sl2:{interp:sl2.interp,I:sl2.intensity.keys.length,first:sl2.intensity.keys.slice(0,3),R:sl2.color.R.keys.length,def:sl2.color.R.default}},null,1));
 fs.writeFileSync(OUT+'dry-backup-SpotLight2.json',pack['keys_SpotLight2.json']);}
console.log('ms',Date.now()-t0);
