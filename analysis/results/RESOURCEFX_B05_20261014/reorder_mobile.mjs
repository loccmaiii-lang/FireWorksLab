// 用户 10-15 00:38：手游表 3.0 行按 PC 表顺序重排、NewRow_* 改 PC 行名、加银星扇。
// GPUECli 没有改名 / 移动接口：先把 17 行全部字段存档 → 删掉这 17 行 → 按 PC 顺序逐行 add + update（只写和默认值不同的字段，字段原样搬）。
// 可续跑：状态存在 %TEMP%/reorder_state.json；只动这 17 行 + 新银星扇，别的行不碰；不碰 P4。
import fs from 'node:fs';import http from 'node:http';
const TABLE='/Game/DataTables/Resource/ResourceFXTable',PCT='/Game/R13N/Common/PC/DataTables/Resource/ResourceFXTable',LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const STATE=process.env.TEMP+'/reorder_state.json',SNAP='手游表_重排前17行.json';
const ALLOW=new Set(['/datatable/rows','/datatable/row','/datatable/row/add','/datatable/row/update','/datatable/row/remove','/object/call']);const log=[];
async function req(route,payload,timeout=180000){const READ=route==='/datatable/rows'||route==='/datatable/row'||route==='/object/call';for(let k=0;;k++){try{return await req1(route,payload,timeout)}catch(e){if(!READ||k>=3||!/ECONNRESET|超时|socket hang up/.test(e.message+e.code))throw e;await new Promise(r=>setTimeout(r,2000))}}}
function req1(route,payload,timeout){if(!ALLOW.has(route))throw Error('不在白名单：'+route);if(route==='/object/call'&&payload.function!=='LoadAsset')throw Error('只许 LoadAsset');
 return new Promise((res,rej)=>{const b=Buffer.from(JSON.stringify(payload));const q=http.request('http://127.0.0.1:17780/gpcli'+route,{agent:false,method:'POST',headers:{'Content-Type':'text/plain','Content-Length':b.length}},r=>{let t='';r.setEncoding('utf8');r.on('data',c=>t+=c);r.on('end',()=>{let v;try{v=JSON.parse(t)}catch(e){return rej(Error(t.slice(0,300)))}
  if(/\/row\//.test(route))log.push({at:new Date().toISOString(),route,row:payload.row_name,fields:payload.values?Object.keys(payload.values):undefined,success:v.success});if(r.statusCode!==200||v.success===false)return rej(Error(route+' 失败：'+(v.message||t.slice(0,300))));res(v.data??v)})});q.on('error',rej);q.setTimeout(timeout,()=>q.destroy(Error('超时')));q.end(b)})}
const rows=async t=>(await req('/datatable/rows',{table:t,limit:100000})).rows;
const OLD=['NewRow_771','NewRow_775','NewRow_776','NewRow_777','NewRow_778','NewRow_779','NewRow_780','NewRow_781','跨年烟花3.0_中型_尾缀','跨年烟花3.0_大型_尾缀','跨年烟花3.0_极小_尾缀','跨年烟花3.0_低位_尾缀','跨年烟花3.0_超大_尾缀','跨年烟花3.0_小型_B_红彗星','跨年烟花3.0_大型_A_金垂柳','跨年烟花3.0_小号_B_小银菊','跨年烟花3.0_小号_C_短爆裂'];
const NEW_SILVER={ResourceId:'P_EFX_FireWorks_FanSilver_01',FxSP:'/Game/Effects/Props/FireWorks/P_EFX_FireWorks_Silver3_Layers_S_M.P_EFX_FireWorks_Silver3_Layers_S_M'};
const dry=process.argv.includes('--dry');
let st=fs.existsSync(STATE)?JSON.parse(fs.readFileSync(STATE,'utf8')):{phase:'start'};const save=()=>fs.writeFileSync(STATE,JSON.stringify(st));
const pc=(await rows(PCT)).filter(r=>String(r._row_name).startsWith('跨年烟花3.0_'));
let snap;
if(st.phase==='start'){
 const cur=await rows(TABLE);const by=new Map(cur.map(r=>[r._row_name,r]));const problems=[];
 for(const n of OLD)if(!by.has(n))problems.push('缺 '+n);
 const old=OLD.map(n=>by.get(n)).filter(Boolean);
 for(const r of old)if(!/_M\.[^.]*_M$/.test(r.FxSP)||!pc.some(p=>p.ResourceId===r.ResourceId))problems.push(r._row_name+' 不像是我们填的行：'+r.ResourceId+' '+r.FxSP);
 if(cur.some(r=>r.ResourceId===NEW_SILVER.ResourceId))problems.push('手游表已有 FanSilver_01');
 const ids=old.map(r=>r.ResourceId).concat(NEW_SILVER.ResourceId);
 const order=pc.filter(p=>ids.includes(p.ResourceId));
 for(const p of order){const clash=cur.find(r=>r._row_name===p._row_name&&!OLD.includes(r._row_name));if(clash)problems.push('行名已被别的行占用：'+p._row_name)}
 const L=await req('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:NEW_SILVER.FxSP.split('.')[0]}});if(!L.return_value||L.return_value==='None')problems.push('Silver3_Layers_S_M 加载失败');
 snap={format:'df.datatable-rows-snapshot/1',at:new Date().toISOString(),table:TABLE,note:'重排前这 17 行的全部字段（删掉重加前的存档）',tableTotal:cur.length,
  otherRowsHash:cur.filter(r=>!OLD.includes(r._row_name)).length,rows:old,
  targetOrder:order.map(p=>({row:p._row_name,resourceId:p.ResourceId,from:old.find(r=>r.ResourceId===p.ResourceId)?._row_name||'新建'}))};
 if(problems.length){console.log('写前保护不过，停：',problems);process.exit(1)}
 fs.writeFileSync(SNAP,JSON.stringify(snap,null,1));fs.writeFileSync(process.env.TEMP+'/reorder_before_full.json',JSON.stringify(cur));
 console.log('目标顺序：');snap.targetOrder.forEach((t,i)=>console.log(i+1,t.row,t.resourceId.slice(16),'←',t.from));
 if(dry)process.exit(0);
 st={phase:'remove',done:[]};save();
}else snap=JSON.parse(fs.readFileSync(SNAP,'utf8'));
if(dry){console.log('有未完成状态',st);process.exit(0)}
if(st.phase==='remove'){for(const n of OLD){if(st.done.includes(n))continue;const r=await req('/datatable/row',{table:TABLE,row_name:n}).catch(()=>null);if(r)await req('/datatable/row/remove',{table:TABLE,row_name:n});st.done.push(n);save();console.log('删',n)}st={phase:'add',done:[]};save()}
if(st.phase==='add'){
 for(const t of snap.targetOrder){if(st.done.includes(t.row))continue;
  const exists=await req('/datatable/row',{table:TABLE,row_name:t.row}).catch(()=>null);
  if(!exists)await req('/datatable/row/add',{table:TABLE,row_name:t.row});
  const def=await req('/datatable/row',{table:TABLE,row_name:t.row});
  const src=snap.rows.find(r=>r.ResourceId===t.resourceId);
  let want;if(src){want=Object.fromEntries(Object.entries(src).filter(([k])=>k!=='_row_name'));want.RowDescription=t.row}
  else{const p=pc.find(x=>x.ResourceId===t.resourceId);want={ResourceId:t.resourceId,FxSP:NEW_SILVER.FxSP,FxSP_Low:NEW_SILVER.FxSP,FxSP_High:NEW_SILVER.FxSP,RowDescription:t.row,FXType:'SHOW',MaxInstanceNum:String(p.MaxInstanceNum)}}
  const values=Object.fromEntries(Object.entries(want).filter(([k,v])=>String(def[k])!==String(v)));
  if(Object.keys(values).length)await req('/datatable/row/update',{table:TABLE,row_name:t.row,values});
  st.done.push(t.row);save();console.log('加',t.row,Object.keys(values).join(','))}
 st={phase:'verify'};save()}
// 核对
const before=JSON.parse(fs.readFileSync(process.env.TEMP+'/reorder_before_full.json','utf8'));const after=await rows(TABLE);
const bOther=before.filter(r=>!OLD.includes(r._row_name)),aOther=after.filter(r=>!snap.targetOrder.some(t=>t.row===r._row_name));
const otherSame=bOther.length===aOther.length&&bOther.every((r,i)=>JSON.stringify(r)===JSON.stringify(aOther[i]));
const idx=snap.targetOrder.map(t=>after.findIndex(r=>r._row_name===t.row));
const res={format:'df.datatable-reorder-result/1',at:new Date().toISOString(),table:TABLE,before:before.length,after:after.length,otherRowsUnchangedAndSameOrder:otherSame,
 positions:idx.map(i=>i+1),contiguousInPcOrder:idx.every((v,i)=>v>=0&&(i===0||v===idx[i-1]+1)),atEnd:idx.at(-1)===after.length-1,rows:[],writes:log};
for(const t of snap.targetOrder){const r=after.find(x=>x._row_name===t.row);const src=snap.rows.find(x=>x.ResourceId===t.resourceId);
 const diff=src?Object.keys(src).filter(k=>!['_row_name','RowDescription'].includes(k)&&String(src[k])!==String(r[k])):[];
 const L=await req('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:r.FxSP.split('.')[0]}});
 res.rows.push({row:r._row_name,RowDescription:r.RowDescription,ResourceId:r.ResourceId,FxSP:r.FxSP,FxSP_Low:r.FxSP_Low,FxSP_High:r.FxSP_High,FXType:r.FXType,MaxInstanceNum:r.MaxInstanceNum,AudioResourceId:r.AudioResourceId,from:t.from,fieldsChangedVsSnapshot:diff,loads:!!L.return_value&&L.return_value!=='None'})}
res.pass=otherSame&&res.contiguousInPcOrder&&res.after===res.before+1&&res.rows.every(r=>!r.fieldsChangedVsSnapshot.length&&r.loads&&r.RowDescription===r.row&&[r.FxSP,r.FxSP_Low,r.FxSP_High].every(p=>/_M\.[^.]*_M$/.test(p)));
fs.writeFileSync('手游表_重排结果.json',JSON.stringify(res,null,1));fs.unlinkSync(STATE);
console.log(JSON.stringify({pass:res.pass,before:res.before,after:res.after,otherSame,positions:res.positions,contiguous:res.contiguousInPcOrder,atEnd:res.atEnd}));
