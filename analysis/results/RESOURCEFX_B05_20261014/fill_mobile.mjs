// 用户 10-15 00:13 授权：在用户签出的手游 ResourceFXTable 里填空行（不够按 PC 行名加行）。
// 只用 /datatable/row/add + /datatable/row/update（特效工作台 dt_writer 同一协议），不删行、不改其它行、不保存、不碰 P4。
import fs from 'node:fs';import http from 'node:http';
const TABLE='/Game/DataTables/Resource/ResourceFXTable',LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary',UASSET='E:/loc_ma5/DFMEditor/DFM/Content/DataTables/Resource/ResourceFXTable.uasset';
const ALLOW=new Set(['/datatable/rows','/datatable/row','/datatable/row/add','/datatable/row/update','/object/call']);
const log=[];
function req(route,payload,timeout=180000){if(!ALLOW.has(route))throw Error('不在白名单：'+route);if(route==='/object/call'&&payload.function!=='LoadAsset')throw Error('只许 LoadAsset');
 return new Promise((res,rej)=>{const b=Buffer.from(JSON.stringify(payload));const q=http.request('http://127.0.0.1:17780/gpcli'+route,{agent:false,method:'POST',headers:{'Content-Type':'text/plain','Content-Length':b.length}},r=>{let t='';r.setEncoding('utf8');r.on('data',c=>t+=c);r.on('end',()=>{let v;try{v=JSON.parse(t)}catch(e){return rej(Error(t.slice(0,300)))}
  if(route.startsWith('/datatable/row/'))log.push({route,payload,success:v.success,message:v.message});if(r.statusCode!==200||v.success===false)return rej(Error(route+' 失败：'+(v.message||t.slice(0,300))));res(v.data??v)})});q.on('error',rej);q.setTimeout(timeout,()=>q.destroy(Error('超时')));q.end(b)})}
const M=n=>`/Game/Effects/Props/FireWorks/${n}.${n}`;
const RB=JSON.parse(fs.readFileSync('读回.json','utf8'));const pcRow=id=>RB.pc.find(r=>r.ResourceId==='P_EFX_FireWorks_'+id);
// [目标行名, ResourceId 后缀, 手游粒子, 方式]
const PLAN=[
 ['NewRow_771','LittleGold','P_EFX_FireWorks_LittleGold_M','update'],
 ['NewRow_775','GoldRayChry','P_EFX_FireWorks_GoldRayChry_M','update'],
 ['NewRow_776','SilverChry','P_EFX_FireWorks_SilverChry_M','update'],
 ['NewRow_777','Glitter','P_EFX_FireWorks_Glitter_M','update'],
 ['NewRow_778','Crackle','P_EFX_FireWorks_Crackle_M','update'],
 ['NewRow_779','Strobe','P_EFX_FireWorks_Strobe_M','update'],
 ['NewRow_780','LittleCombo','P_EFX_FireWorks_LittleCombo_M','update'],
 ['NewRow_781','NY_Trail_Small','P_EFX_FireWorks_RiseTrail_S_M','update'],
 [null,'NY_Trail_Medium','P_EFX_FireWorks_RiseTrail_M_M','add'],
 [null,'NY_Trail_Large','P_EFX_FireWorks_RiseTrail_L_M','add'],
 [null,'RiseTrail_Tiny','P_EFX_FireWorks_RiseTrail_Tiny_M','add'],
 [null,'RiseTrail_XS','P_EFX_FireWorks_RiseTrail_XS_M','add'],
 [null,'RiseTrail_Hero','P_EFX_FireWorks_RiseTrail_L_M','add'],
 [null,'FanComet_01','P_EFX_FireWorks_Comet_Layers_M','add'],
 [null,'GoldKamuro','P_EFX_FireWorks_YonshakuKamuro_M','add'],
 [null,'LittleSilver','P_EFX_FireWorks_LittleSilver_M','add'],
 [null,'LittleCrackle','P_EFX_FireWorks_LittleCrackle_M','add'],
].map(([row,id,ps,how])=>{const pc=pcRow(id);if(!pc)throw Error('PC 没有 '+id);return {row:row??pc._row_name,how,resourceId:pc.ResourceId,values:{ResourceId:pc.ResourceId,FxSP:M(ps),FxSP_Low:M(ps),FxSP_High:M(ps),RowDescription:pc._row_name,FXType:'SHOW',MaxInstanceNum:String(RB.pcFullRowsFor30.find(r=>r.ResourceId===pc.ResourceId).MaxInstanceNum)}}});
const dry=process.argv.includes('--dry');
const before=(await req('/datatable/rows',{table:TABLE,limit:100000})).rows;console.log('读表',before.length);const byName=new Map(before.map(r=>[r._row_name,r]));
fs.writeFileSync(process.env.TEMP+'/mobile_fx_before_fill.json',JSON.stringify(before));
const mtime0=fs.statSync(UASSET).mtimeMs;
// 写前保护
const problems=[];const done=p=>{const c=byName.get(p.row);return !!c&&Object.entries(p.values).every(([k,v])=>String(c[k])===String(v))};
for(const p of PLAN){const cur=byName.get(p.row);p.alreadyDone=done(p);if(p.alreadyDone){console.log('已填过，跳过',p.row);continue}
 if(p.how==='update'){if(!cur)problems.push(p.row+' 不存在');else if(!((cur.ResourceId==='None'&&cur.FxSP==='None')||(p.row==='NewRow_771'&&cur.ResourceId==='P_EFX_FireWorks_LittleGold')))problems.push(p.row+' 不是空行：'+cur.ResourceId)}
 else if(cur)problems.push(p.row+' 已存在');
 const dup=before.filter(r=>r.ResourceId===p.resourceId&&r._row_name!==p.row);if(dup.length)problems.push(p.resourceId+' 已在别的行：'+dup.map(r=>r._row_name));
 const L=await req('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:p.values.FxSP.split('.')[0]}});if(!L.return_value||L.return_value==='None')problems.push(p.values.FxSP+' 加载失败');}
const preview={format:'df.datatable-write-preview/1',at:new Date().toISOString(),table:TABLE,authorizedBy:'用户 10-15 00:13（签出、给空行、FXType 全 SHOW、音效不动、SP 都填 _M、金垂柳用 YonshakuKamuro_M）',
 untouched:'音效（AudioResourceId / bSOLAudioAlone / AudioResourceId_SOL / NoneLoopAudioStopType）和其它字段不写；空行默认值与 2.0 旧行、PC 3.0 行一致（只差音效、MaxInstanceNum、FXType）',
 rows:PLAN.map(p=>({...p,before:byName.get(p.row)?Object.fromEntries(Object.keys(p.values).map(k=>[k,byName.get(p.row)[k]])):null})),problems};
fs.writeFileSync('手游表_填表_预览.json',JSON.stringify(preview,null,1));
if(problems.length){console.log('写前保护不过，停：',problems);process.exit(1)}
if(dry){console.log('dry ok',PLAN.length);process.exit(0)}
for(const p of PLAN){if(p.alreadyDone)continue;console.log('写',p.how,p.row,p.resourceId);if(p.how==='add')await req('/datatable/row/add',{table:TABLE,row_name:p.row});await req('/datatable/row/update',{table:TABLE,row_name:p.row,values:p.values});console.log('  ok');}
// 重读核对
const result={format:'df.datatable-write-result/1',at:new Date().toISOString(),table:TABLE,writes:log,rows:[]};
for(const p of PLAN){const got=await req('/datatable/row',{table:TABLE,row_name:p.row});const mism=Object.entries(p.values).filter(([k,v])=>String(got[k])!==String(v)).map(([k,v])=>({field:k,expected:v,actual:got[k]}));
 const L=await req('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:got.FxSP.split('.')[0]}});
 result.rows.push({row:p.row,how:p.how,resourceId:p.resourceId,FxSP:got.FxSP,FxSP_Low:got.FxSP_Low,FxSP_High:got.FxSP_High,FXType:got.FXType,MaxInstanceNum:got.MaxInstanceNum,AudioResourceId:got.AudioResourceId,mismatches:mism,fxspLoads:!!L.return_value&&L.return_value!=='None'})}
const after=(await req('/datatable/rows',{table:TABLE,limit:100000})).rows;const aMap=new Map(after.map(r=>[r._row_name,r]));const targets=new Set(PLAN.map(p=>p.row));
result.resumed=PLAN.filter(p=>p.alreadyDone).map(p=>p.row);
result.tableCheck={before:before.length,after:after.length,added:after.filter(r=>!byName.has(r._row_name)).map(r=>r._row_name),removed:before.filter(r=>!aMap.has(r._row_name)).map(r=>r._row_name),
 changedOutsideTargets:after.filter(r=>byName.has(r._row_name)&&!targets.has(r._row_name)&&JSON.stringify(r)!==JSON.stringify(byName.get(r._row_name))).map(r=>r._row_name),
 targetFieldsChangedBeyondPlan:PLAN.filter(p=>p.how==='update').map(p=>({row:p.row,fields:Object.keys(aMap.get(p.row)).filter(k=>String(aMap.get(p.row)[k])!==String(byName.get(p.row)[k])&&!(k in p.values))})).filter(x=>x.fields.length)};
result.uassetMtimeChanged=fs.statSync(UASSET).mtimeMs!==mtime0;
result.pass=result.rows.every(r=>!r.mismatches.length&&r.fxspLoads)&&!result.tableCheck.removed.length&&!result.tableCheck.changedOutsideTargets.length&&!result.tableCheck.targetFieldsChangedBeyondPlan.length&&result.tableCheck.added.length===PLAN.filter(p=>p.how==='add'&&!p.alreadyDone).length;
fs.writeFileSync('手游表_填表结果.json',JSON.stringify(result,null,1));
console.log(JSON.stringify({pass:result.pass,tableCheck:result.tableCheck,uassetMtimeChanged:result.uassetMtimeChanged},null,1));
for(const r of result.rows)console.log(r.row,'|',r.resourceId,'|',r.FxSP.split('.').pop(),'|',r.FXType,r.MaxInstanceNum,'| 音效',r.AudioResourceId,'| 不一致',r.mismatches.length,'| 加载',r.fxspLoads);
