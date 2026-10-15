import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {engineRequest} from '../src/engine.mjs';
import {lightScript,lightScriptData,expandScriptData,parsePythonOutput,checkLightTarget,writeLightTarget,backupPackFiles,LIGHT_SCRIPT_HEADER,PY_LIBRARY} from '../src/light-engine.mjs';
import {buildLightDelivery} from '../src/light-curve-model.mjs';
import {LIGHT_RIG} from '../src/light-rig.mjs';

// 16.0.42 灯光和导演表一起交付：走同一个 GPUECli，灯光用 UE 的 ExecutePythonCommandEx 跑 light-engine 生成的脚本。
const v13=JSON.parse(fs.readFileSync(new URL('./fixtures/light-v13-slim.json',import.meta.url)));
const delivery=buildLightDelivery(v13,{});
const NAMES=LIGHT_RIG.lights.map(l=>l.light),CH=['I','R','G','B','A'];
// UE ExportText：((Output="..."),(Output="...")) 里 \ 和 " 转义
const ueLog=lines=>'('+lines.map(l=>'(Output="'+l.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'")').join(',')+')';
const chunks=(tag,obj,n=500)=>{const s=JSON.stringify(obj),parts=[];for(let i=0;i<s.length;i+=n)parts.push(s.slice(i,i+n));return parts.map((p,i)=>`FWLIGHT_${tag}:${i}/${parts.length}:${p}`)};
const modeOf=payload=>/^# fwlight-workbench\/1 (\w+)/m.exec(payload.args.PythonCommand.split('\n')[1])[1];
const full=expandScriptData(lightScriptData(delivery));
const counts=Object.fromEntries(NAMES.map(n=>[n,Object.fromEntries(CH.map(c=>[c,full[n][c][1].length]))]));
const oldKeys={tpf:800,pool:[[[0,0,'L'],[800,5.5,'L'],[1200,9,'A']],[]],lights:Object.fromEntries(NAMES.map(n=>[n,{I:[0,0],R:[1,0],G:[0.72,0],B:[0.25,0],A:[1,1]}]))};
function fakeUE({write={},check={},after={},failSave=false,timeoutWrite=false}={}){
 const calls=[];
 const request=async(route,payload)=>{calls.push({route,payload});
  if(route!=='/object/call')throw Error('unexpected '+route);
  if(payload.function==='SaveAsset'){if(failSave)return {return_value:'False'};return {return_value:'True'};}
  assert.equal(payload.path,PY_LIBRARY);const mode=modeOf(payload);
  if(mode==='write'&&timeoutWrite)throw Error('UE 请求超时或已取消；写入请求超时时请先读回核对，不要重复导入');
  const base={ok:true,mode,fps:[30,1],tick:[24000,1],end_s:240.4667,dirty:false,registry_loading:false,readonly:true,lights:NAMES.map(n=>({light:n,ok:true,keys:{I:1502,R:1058,G:1058,B:1058,A:0}}))};
  if(mode==='check'){const saved=calls.some(c=>c.payload.function==='SaveAsset');const r=saved?{...base,lights:NAMES.map(n=>({light:n,ok:true,keys:counts[n]})),...after}:{...base,...check};return {return_value:'True',out_LogOutput:ueLog(chunks('R',r))};}
  const r={...base,written:true,readback:Object.fromEntries(NAMES.map(n=>[n,Object.fromEntries(CH.map(c=>[c,0]))])),new_keys:counts,...write};
  return {return_value:'True',out_LogOutput:ueLog([...chunks('B',oldKeys),'other log line',...chunks('R',r)])};
 };
 return {request,calls};
}

test('引擎白名单：只放行带 fwlight 标记的 ExecuteFile 脚本，其他 Python 照样拒绝',async()=>{
 let hit=0;const fetch=async()=>{hit++;return {ok:true,json:async()=>({success:true,data:{return_value:'True'}})}};
 await engineRequest('/object/call',{path:PY_LIBRARY,function:'ExecutePythonCommandEx',args:{PythonCommand:lightScript('check'),ExecutionMode:'ExecuteFile',FileExecutionScope:'Private'}},{fetch});
 assert.equal(hit,1);
 await assert.rejects(engineRequest('/object/call',{path:PY_LIBRARY,function:'ExecutePythonCommandEx',args:{PythonCommand:'import unreal',ExecutionMode:'ExecuteFile'}},{fetch}),/不允许/);
 await assert.rejects(engineRequest('/object/call',{path:PY_LIBRARY,function:'ExecutePythonCommandEx',args:{PythonCommand:lightScript('check'),ExecutionMode:'ExecuteStatement'}},{fetch}),/不允许/);
 await assert.rejects(engineRequest('/object/call',{path:'/Script/Other.Default__X',function:'ExecutePythonCommandEx',args:{PythonCommand:lightScript('check'),ExecutionMode:'ExecuteFile'}},{fetch}),/不允许/);
 assert.equal(hit,1);
});

test('脚本：三种模式都带标记、只含 ASCII；相同曲线只传一份（四盏灯约 100 KB 以内）',()=>{
 for(const m of ['check','dry','write']){const s=lightScript(m,{data:m==='check'?null:lightScriptData(delivery)});assert(s.startsWith(LIGHT_SCRIPT_HEADER+' '+m));assert(!/[^\x00-\x7f]/.test(s));assert(s.includes(LIGHT_RIG.sequence.asset))}
 const data=lightScriptData(delivery);
 assert.equal(data.pool.length,6,'SpotLight2 强度 + 天光强度 + R/G/B + 空 A');
 assert.deepEqual(expandScriptData(data).SkyLight.R,[delivery.files['keys_SpotLight2.json'].color.R.default,delivery.files['keys_SpotLight2.json'].color.R.keys]);
 assert(Buffer.byteLength(lightScript('write',{data}))<120000);
 assert.throws(()=>lightScript('write'),/缺少灯光数据/);
});

test('解析 UE 输出：分块拼回、转义还原、缺块报错',()=>{
 const obj={a:'x"y\\z',n:[1,2,3],s:'很长'.repeat(1)};
 const p=parsePythonOutput({return_value:'True',out_LogOutput:ueLog(chunks('R',obj,7))});
 assert.deepEqual(p.result,obj);assert.equal(p.returned,true);
 const lines=chunks('R',obj,7);lines.splice(1,1);
 assert.throws(()=>parsePythonOutput({out_LogOutput:ueLog(lines)}),/不完整/);
});

test('只读检查：通过时给出只读提示；未保存修改、缺轨道、帧率不对都拦下',async()=>{
 let ue=fakeUE();let r=await checkLightTarget(ue.request);
 assert.equal(r.ok,true);assert.match(r.notes.join(),/只读/);assert.equal(ue.calls.length,1);
 ue=fakeUE({check:{dirty:true}});r=await checkLightTarget(ue.request);assert.equal(r.ok,false);assert.match(r.issues.join(),/未保存的修改/);
 ue=fakeUE({check:{lights:[{light:'SkyLight',ok:false,code:'NO_TRACK'}]}});r=await checkLightTarget(ue.request);assert.match(r.issues.join(),/SkyLight：缺少 Intensity 或 LightColor/);
 ue=fakeUE({check:{fps:[24,1]}});r=await checkLightTarget(ue.request);assert.match(r.issues.join(),/帧率/);
});

test('写入：先拿到写入前曲线 → 读回一致 → SaveAsset 序列 → 保存后核对键数',async()=>{
 const ue=fakeUE();let backup;
 const receipt=await writeLightTarget(ue.request,delivery,{onBackup:b=>{backup=b}});
 assert.equal(receipt.verified,true);assert.equal(receipt.saved,true);assert.equal(receipt.saveError,undefined);assert.deepEqual(receipt.afterSave,{dirty:false,keysMatch:true});
 const save=ue.calls.find(c=>c.payload.function==='SaveAsset');assert.equal(save.payload.args.AssetToSave,LIGHT_RIG.sequence.asset);
 assert.deepEqual(ue.calls.map(c=>c.payload.function==='SaveAsset'?'save':modeOf(c.payload)),['write','save','check']);
 const pack=backupPackFiles(backup),man=JSON.parse(pack['manifest.json']),sl2=JSON.parse(pack['keys_SpotLight2.json']);
 assert.equal(man.format,'fwlight.pack/1');assert.deepEqual(man.lights.map(l=>l.light),NAMES);
 assert.deepEqual(sl2.intensity.keys,[[0,0],[1,5.5],[1,9,0.5]],'tick → 帧 + 子帧');assert.equal(sl2.interp,'auto','有非 Linear 键就按 auto');
 assert.equal(sl2.light,'SpotLight2');assert.equal(sl2.format,'fwlight.keys/2');
});

test('写入失败的三种情况：读回不一致不保存；保存失败如实写回执；超时结果未知且不重试',async()=>{
 let ue=fakeUE({write:{ok:false,code:'READBACK',bad:['SkyLight.I']}});
 await assert.rejects(writeLightTarget(ue.request,delivery),e=>/读回不一致/.test(e.message)&&e.written===true);
 assert(!ue.calls.some(c=>c.payload.function==='SaveAsset'));
 ue=fakeUE({failSave:true});const r=await writeLightTarget(ue.request,delivery);
 assert.equal(r.saved,false);assert.match(r.saveError,/未返回保存成功/);
 ue=fakeUE({timeoutWrite:true});
 await assert.rejects(writeLightTarget(ue.request,delivery),e=>e.unknownResult===true);
 assert.equal(ue.calls.length,1,'写入超时不重试');
 const over=buildLightDelivery(v13,{skyPeak:12});
 await assert.rejects(writeLightTarget(fakeUE().request,over),/超过上限 10/);
});
