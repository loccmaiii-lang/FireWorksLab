// 第 1 步：只读读回 PC + 手游 ResourceFXTable（/datatable/rows 全表 + /datatable/search 复核），并对比 T05。
import fs from 'node:fs';import {request} from './ue_ro.mjs';
const T={pc:'/Game/R13N/Common/PC/DataTables/Resource/ResourceFXTable',mobile:'/Game/DataTables/Resource/ResourceFXTable'};
const B05=JSON.parse(fs.readFileSync('../../../FXtools/节目/NewYearFireWorks_v01/导演表-B05-ResourceFX新命名-手游6种-一张表.json','utf8'));
const b05Ids=[...new Set(B05.EffectSubTemplates.flatMap(s=>s.Entries.map(e=>e.FXResourceId)))].sort();
const T05=JSON.parse(fs.readFileSync('../RESOURCEFX_20261014/读回.json','utf8'));
const out={format:'df.resourcefx-readback/1',task:'用户 10-14 23:14 B05 核对 + 配手游表 · 第 1 步',readAt:new Date().toISOString(),timeZone:'Asia/Hong_Kong',
 source:'UE GPUECli 只读：/datatable/rows 全表 + /datatable/search（ResourceId/RowDescription）复核；无保存/改表/导入/P4/开关UE',tables:T,b05ResourceIds:b05Ids,requests:[],errors:[]};
const is30=r=>String(r._row_name||'').startsWith('跨年烟花3.0_')||String(r.RowDescription||'').startsWith('跨年烟花3.0_');
const KEEP=['_row_name','RowDescription','ResourceId','FxSP','FxSP_Low','FxSP_High','EffectScale','FXType'];
const full={};
for(const [side,table] of Object.entries(T)){
 const r=await request('/datatable/rows',{table,limit:100000},180000);
 out.requests.push({side,route:'/datatable/rows',payload:{table,limit:100000},total:r.total,returned:r.rows.length});
 full[side]=r.rows;
 for(const [field,value] of [['RowDescription','跨年烟花3.0_'],['ResourceId','P_EFX_FireWorks_']]){
  const s=await request('/datatable/search',{table,field,value,limit:1000});
  out.requests.push({side,route:'/datatable/search',payload:{table,field,value,limit:1000},match_count:s.match_count,rowNames:(s.matches||[]).map(m=>m._row_name)});
 }
}
// 手游整表备份（第 4 步写前备份；本步只读）
fs.writeFileSync('手游表_备份_写前.json',JSON.stringify({format:'df.datatable-backup/1',table:T.mobile,readAt:out.readAt,total:full.mobile.length,rows:full.mobile}));
for(const side of ['pc','mobile']){
 const rows=full[side];
 out[side+'Total']=rows.length;
 out[side]=rows.filter(is30).map(r=>Object.fromEntries(KEEP.map(k=>[k,r[k]])));
 out[side+'B05']=b05Ids.map(id=>{const m=rows.filter(r=>r.ResourceId===id);return {resourceId:id,rows:m.map(r=>Object.fromEntries(KEEP.map(k=>[k,r[k]])))}});
 out[side+'FireWorksOld']=rows.filter(r=>/FireWorks/i.test(r.ResourceId||'')&&!is30(r)).map(r=>Object.fromEntries(KEEP.map(k=>[k,r[k]])));
 out[side+'FullRowsFor30']=rows.filter(r=>is30(r)||b05Ids.includes(r.ResourceId)); // 全字段
}
// 与 T05 对比（按 ResourceId）
const key=r=>r.ResourceId;
const diff=(side)=>{const a=new Map((T05[side]||[]).map(r=>[key(r),r])),b=new Map(out[side].map(r=>[key(r),r]));const ch=[];
 for(const [id,r] of b){const o=a.get(id);if(!o){ch.push({resourceId:id,type:'新增',now:r});continue}
  for(const k of KEEP){const ov=o[k]??null,nv=r[k]??null;if(String(ov)!==String(nv))ch.push({resourceId:id,type:'改',field:k,T05:ov,now:nv})}}
 for(const [id,o] of a)if(!b.has(id))ch.push({resourceId:id,type:'不见了',T05:{_row_name:o._row_name,FxSP:o.FxSP}});return ch};
out.vsT05={T05readAt:T05.readAt,T05pcRows:(T05.pc||[]).length,T05mobileRows:(T05.mobile||[]).length,pcRows:out.pc.length,mobileRows:out.mobile.length,pc:diff('pc'),mobile:diff('mobile')};
out.status='read';
fs.writeFileSync('读回.json',JSON.stringify(out,null,1));
console.log('pc total',out.pcTotal,'3.0',out.pc.length,'| mobile total',out.mobileTotal,'3.0',out.mobile.length,'old FireWorks mobile',out.mobileFireWorksOld.length);
console.log('B05 ids',b05Ids.length,'pc missing',out.pcB05.filter(x=>!x.rows.length).map(x=>x.resourceId),'pc dup',out.pcB05.filter(x=>x.rows.length>1).map(x=>x.resourceId));
console.log('mobile B05 present',out.mobileB05.filter(x=>x.rows.length).map(x=>x.resourceId));
console.log('vsT05 pc changes',JSON.stringify(out.vsT05.pc,null,0).slice(0,4000));
console.log('vsT05 mobile changes',JSON.stringify(out.vsT05.mobile).slice(0,1500));
for(const q of out.requests)if(q.route==='/datatable/search')console.log(q.side,q.payload.field,q.match_count);
