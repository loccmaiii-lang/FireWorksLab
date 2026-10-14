// 第二遍：UE 的行表删掉后再加，新行会"后删先用"地填回空位，所以第一遍顺序是倒的（字段都对）。
// 这次按当前位置从后往前删这 18 行，再按 PC 顺序加回 → 依次落到从前往后的空位。字段全部原样搬；别的行不碰；可续跑。
import fs from 'node:fs';import http from 'node:http';
const TABLE='/Game/DataTables/Resource/ResourceFXTable',PCT='/Game/R13N/Common/PC/DataTables/Resource/ResourceFXTable',LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const STATE=process.env.TEMP+'/reorder_fix_state.json',SNAP='手游表_重排前18行.json';
const ALLOW=new Set(['/datatable/rows','/datatable/row','/datatable/row/add','/datatable/row/update','/datatable/row/remove','/object/call']);const log=[];
async function req(route,payload,timeout=180000){const READ=route==='/datatable/rows'||route==='/datatable/row'||route==='/object/call';for(let k=0;;k++){try{return await req1(route,payload,timeout)}catch(e){if(!READ||k>=3||!/ECONNRESET|超时|socket hang up/.test(e.message+e.code))throw e;await new Promise(r=>setTimeout(r,2000))}}}
function req1(route,payload,timeout){if(!ALLOW.has(route))throw Error('不在白名单：'+route);if(route==='/object/call'&&payload.function!=='LoadAsset')throw Error('只许 LoadAsset');
 return new Promise((res,rej)=>{const b=Buffer.from(JSON.stringify(payload));const q=http.request('http://127.0.0.1:17780/gpcli'+route,{agent:false,method:'POST',headers:{'Content-Type':'text/plain','Content-Length':b.length}},r=>{let t='';r.setEncoding('utf8');r.on('data',c=>t+=c);r.on('end',()=>{let v;try{v=JSON.parse(t)}catch(e){return rej(Error(t.slice(0,300)))}
  if(/\/row\//.test(route))log.push({at:new Date().toISOString(),route,row:payload.row_name,fields:payload.values?Object.keys(payload.values):undefined,success:v.success});if(r.statusCode!==200||v.success===false)return rej(Error(route+' 失败：'+(v.message||t.slice(0,300))));res(v.data??v)})});q.on('error',rej);q.setTimeout(timeout,()=>q.destroy(Error('超时')));q.end(b)})}
const rows=async t=>(await req('/datatable/rows',{table:t,limit:100000})).rows;
const dry=process.argv.includes('--dry');
let st=fs.existsSync(STATE)?JSON.parse(fs.readFileSync(STATE,'utf8')):{phase:'start'};const save=()=>fs.writeFileSync(STATE,JSON.stringify(st));
const pc=(await rows(PCT)).filter(r=>String(r._row_name).startsWith('跨年烟花3.0_'));let snap;
if(st.phase==='start'){
 const cur=await rows(TABLE);const mine=cur.map((r,i)=>({r,i})).filter(x=>String(x.r._row_name).startsWith('跨年烟花3.0_'));
 const problems=[];if(mine.length!==18)problems.push('3.0 行数不是 18：'+mine.length);
 for(const {r} of mine){const p=pc.find(x=>x._row_name===r._row_name);if(!p||p.ResourceId!==r.ResourceId)problems.push('行名/ID 和 PC 对不上：'+r._row_name);if(!/_M\.[^.]*_M$/.test(r.FxSP))problems.push('不是 _M：'+r._row_name)}
 const order=pc.filter(p=>mine.some(x=>x.r._row_name===p._row_name)).map(p=>p._row_name);
 snap={format:'df.datatable-rows-snapshot/1',at:new Date().toISOString(),table:TABLE,note:'第二遍重排前 18 行全部字段',positions:mine.map(x=>({row:x.r._row_name,pos:x.i+1})),rows:mine.map(x=>x.r),targetOrder:order,removeOrder:mine.slice().sort((a,b)=>b.i-a.i).map(x=>x.r._row_name)};
 if(problems.length){console.log('写前保护不过，停：',problems);process.exit(1)}
 fs.writeFileSync(SNAP,JSON.stringify(snap,null,1));fs.writeFileSync(process.env.TEMP+'/reorder_fix_before_full.json',JSON.stringify(cur));
 console.log('当前位置',snap.positions.map(p=>p.pos).join(','),'\n删的顺序',snap.removeOrder.join(' > '));
 if(dry)process.exit(0);st={phase:'remove',done:[]};save();
}else snap=JSON.parse(fs.readFileSync(SNAP,'utf8'));
if(dry){console.log('有未完成状态',st);process.exit(0)}
if(st.phase==='remove'){for(const n of snap.removeOrder){if(st.done.includes(n))continue;const r=await req('/datatable/row',{table:TABLE,row_name:n}).catch(()=>null);if(r)await req('/datatable/row/remove',{table:TABLE,row_name:n});st.done.push(n);save()}console.log('删完',snap.removeOrder.length);st={phase:'add',done:[]};save()}
if(st.phase==='add'){for(const n of snap.targetOrder){if(st.done.includes(n))continue;
  const exists=await req('/datatable/row',{table:TABLE,row_name:n}).catch(()=>null);if(!exists)await req('/datatable/row/add',{table:TABLE,row_name:n});
  const def=await req('/datatable/row',{table:TABLE,row_name:n});const src=snap.rows.find(r=>r._row_name===n);
  const values=Object.fromEntries(Object.entries(src).filter(([k,v])=>k!=='_row_name'&&String(def[k])!==String(v)));
  if(Object.keys(values).length)await req('/datatable/row/update',{table:TABLE,row_name:n,values});st.done.push(n);save()}
 console.log('加完',snap.targetOrder.length);st={phase:'verify'};save()}
const before=JSON.parse(fs.readFileSync(process.env.TEMP+'/reorder_fix_before_full.json','utf8'));const after=await rows(TABLE);
const isMine=r=>snap.targetOrder.includes(r._row_name);const bO=before.filter(r=>!isMine(r)),aO=after.filter(r=>!isMine(r));
const otherSame=bO.length===aO.length&&bO.every((r,i)=>JSON.stringify(r)===JSON.stringify(aO[i]));
const idx=snap.targetOrder.map(n=>after.findIndex(r=>r._row_name===n));
const res={format:'df.datatable-reorder-result/1',at:new Date().toISOString(),table:TABLE,before:before.length,after:after.length,otherRowsUnchangedAndSameOrder:otherSame,positions:idx.map(i=>i+1),
 inPcOrder:idx.every((v,i)=>v>=0&&(i===0||v===idx[i-1]+1)),rows:[],writes:log};
for(const n of snap.targetOrder){const r=after.find(x=>x._row_name===n),src=snap.rows.find(x=>x._row_name===n);const diff=Object.keys(src).filter(k=>String(src[k])!==String(r[k]));
 const L=await req('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:r.FxSP.split('.')[0]}});
 res.rows.push({pos:after.indexOf(r)+1,row:n,RowDescription:r.RowDescription,ResourceId:r.ResourceId,FxSP:r.FxSP,FxSP_Low:r.FxSP_Low,FxSP_High:r.FxSP_High,FXType:r.FXType,MaxInstanceNum:r.MaxInstanceNum,AudioResourceId:r.AudioResourceId,fieldsChanged:diff,loads:!!L.return_value&&L.return_value!=='None'})}
res.pass=otherSame&&res.inPcOrder&&res.after===res.before&&res.rows.every(r=>!r.fieldsChanged.length&&r.loads);
fs.writeFileSync('手游表_重排结果.json',JSON.stringify(res,null,1));fs.unlinkSync(STATE);
console.log(JSON.stringify({pass:res.pass,before:res.before,after:res.after,otherSame,positions:res.positions,inPcOrder:res.inPcOrder}));
