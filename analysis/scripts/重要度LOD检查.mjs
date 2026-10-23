// 只读：重要度与 LOD 检查（spec/烟花特效资产规范.md §6.1）。只用 /object/get、/object/search，不改 UE。
// 用法：node analysis/scripts/重要度LOD检查.mjs <粒子路径或资源ID>... | --all30 [--out <json>]
//   --all30：资源发射器数.json 里 3.0 的 PC 行 + 手游 3.0 行（FxSP / FxSP_High / FxSP_Low）。
// 判定：主体层 = 材质父链里有 M_EFX_FlipBookSuperPack_FireBase_Unlit；辅助层 = 名字像 Flash / Glow / Dot / Spark / Lens…；其余记「未分类」只列出。
// 退出码：有 ❌ 为 1。
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {request as engineRead} from './workbench_engine_acceptance.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const MAIN_PARENT='M_EFX_FlipBookSuperPack_FireBase_Unlit';
const AUX=/flash|glow|dot|spark|lens|light|igni|shadow|sphere|cloud|streak|smoke|star_[ab]|^qd\d/i;
const LEVEL={Low:0,Medium:1,High:2,Critical:3};
const lvl=s=>LEVEL[String(s||'').replace('EParticleSignificanceLevel::','')]??null;
const ref=v=>v&&v._type==='object_ref'?v.path:null;
const cache=new Map();
async function get(p){if(!p)return null;if(!cache.has(p))cache.set(p,engineRead('/object/get',{path:p}).then(r=>r?.properties?r:null).catch(()=>null));return cache.get(p);}
async function isMainMaterial(mat){
 for(let p=mat,i=0;p&&i<6;i++){if(p.split('.').at(-1)===MAIN_PARENT)return true;const o=await get(p);p=ref(o?.properties?.Parent);}
 return false;
}
function inputs(argv){
 const census=JSON.parse(fs.readFileSync(path.join(repo,'FXtools/节目/NewYearFireWorks_v01/资源发射器数.json'),'utf8'));
 if(!argv.includes('--all30'))return argv.filter((a,i)=>!a.startsWith('--')&&argv[i-1]!=='--out').map(a=>{
  if(a.startsWith('/Game/'))return {plat:/Effects_HD|_HD$/.test(a)?'PC':'手游',path:a.includes('.')?a:a+'.'+a.split('/').at(-1)};
  const r=census.pc.find(x=>x.id===a)||census.mobile.find(x=>x.id===a);if(!r)throw Error('资源发射器数.json 里没有 '+a+'，请传完整路径');
  return {plat:census.pc.includes(r)?'PC':'手游',path:r.FxSP.path};
 });
 const out=new Map();
 for(const r of census.pc)if(/^跨年烟花3\.0_/.test(r.rowName||''))out.set(r.FxSP?.path,{plat:'PC',path:r.FxSP?.path,row:r.rowName});
 for(const r of census.mobile)if(r.is30)for(const k of ['FxSP','FxSP_High','FxSP_Low'])if(r[k]?.path)out.set(r[k].path,{plat:'手游',path:r[k].path,row:r.rowName});
 return [...out.values()].filter(x=>x.path);
}
async function check(item){
 const res={...item,errors:[],warns:[],infos:[],emitters:[]};
 const sys=await get(item.path);if(!sys){res.errors.push('读不到粒子');return res;}
 const ps=sys.properties,name=item.path.split('.').at(-1);
 if(lvl(ps.MaxSignificanceLevel)!==3)res.errors.push(`系统 MaxSignificanceLevel = ${ps.MaxSignificanceLevel}（应为 Critical，否则主体层也会被压低）`);
 const dist=ps.LODDistances||[];let looping=false,anyCritical=false;
 const emitters=[];
 for(const e of ps.Emitters||[]){
  const eo=await get(ref(e));if(!eo)continue;const ep=eo.properties,lods=(ep.LODLevels||[]).map(ref);
  const l0=(await get(lods[0]))?.properties;if(!l0)continue;
  const rq=(await get(ref(l0.RequiredModule)))?.properties||{};
  if((rq.EmitterLoops??1)===0&&l0.bEnabled!==false)looping=true;
  // 各档可以有自己的模块副本（Cascade 的「复制到本档」），所以只比「个数 + 每个位置的模块类」
  const classes=async ms=>{const a=[];for(const m of ms||[])a.push(((await get(ref(m)))?.class||'?').split('.').at(-1));return a;};
  const cls0=await classes(l0.Modules);
  const lodInfo=[];
  for(let i=1;i<lods.length;i++){const li=(await get(lods[i]))?.properties;if(!li)continue;const ci=await classes(li.Modules);lodInfo.push({i,enabled:li.bEnabled,sameModules:JSON.stringify(ci)===JSON.stringify(cls0),count:[cls0.length,ci.length]});}
  if(l0.bEnabled===false){emitters.push({name:ep.EmitterName,enabled:false,lodInfo});continue;}
  const mat=ref(rq.Material),main=mat?await isMainMaterial(mat):false,aux=!main&&AUX.test(ep.EmitterName);
  const kind=main?'主体':aux?'辅助':'未分类',sig=lvl(ep.SignificanceLevel),sigName=String(ep.SignificanceLevel||'').replace('EParticleSignificanceLevel::','');
  if(sig===3)anyCritical=true;
  const em={name:ep.EmitterName,kind,sig:sigName,disable:!!ep.bDisableWhenInsignficant,material:(mat||'').split('.').at(-1),lods:lods.length,lodInfo};
  if(kind==='主体'&&sig!==3)res.errors.push(`${ep.EmitterName}：主体层是 ${sigName}（应为 Critical，否则会被省掉）`);
  if(kind==='辅助'&&sig===3)res.infos.push(`${ep.EmitterName}：辅助层是 Critical（永远不会被省掉；想省性能改 Medium）`);
  if(kind==='未分类'&&sig!==3)res.warns.push(`${ep.EmitterName}：未分类（材质 ${em.material}）是 ${sigName}${em.disable?' + 勾':''}，确认它是辅助层`);
  for(const x of lodInfo){
   if(!x.sameModules)res.errors.push(`${ep.EmitterName}：LOD${x.i} 的模块（${x.count[1]} 个）和 LOD0（${x.count[0]} 个）对不上（加 / 删模块没同步到每一档）`);
   if(x.enabled!==l0.bEnabled)res.infos.push(`${ep.EmitterName}：LOD${x.i} ${x.enabled?'开':'关'}（LOD0 ${l0.bEnabled?'开':'关'}）`);
  }
  emitters.push(em);
 }
 res.emitters=emitters;
 if(!anyCritical)res.errors.push('没有启用的 Critical 发射器（全部不重要时系统会按 InsignificantReaction 结束）');
 const nLod=Math.max(1,...emitters.map(e=>e.lods||1));
 if(item.plat==='手游'&&(nLod>1||dist.length>1))res.errors.push(`手游有 ${nLod} 档 LOD（规范 §6：不做 LOD）`);
 if(nLod>1){
  const inc=dist.length===nLod&&dist[0]===0&&dist.every((d,i)=>i===0||d>dist[i-1]);
  if(!inc)res.errors.push(`LODDistances ${JSON.stringify(dist)} 不是从 0 严格递增${dist.length>1&&dist.every(d=>d===0)?'（全 0 = 游戏里永远用最后一档，编辑器预览看不出来）':''}`);
  else if(dist[nLod-1]<20000)res.warns.push(`LODDistances ${JSON.stringify(dist)}：最后一档从 ${dist[nLod-1]/100} m 起，节目里多在 100 m 外看，基本都是最后一档`);
 }
 const method=String(ps.LODMethod||'').replace('PARTICLESYSTEMLODMETHOD_','');
 const want=looping?'Automatic':'ActivateAutomatic';
 if(method!==want)(nLod>1?res.warns:res.infos).push(`LODMethod = ${method}，${looping?'循环':'一次性'}特效建议 ${want}${nLod>1?'':'（只有 1 档 LOD，没有实际区别）'}`);
 res.summary={name,looping,lods:nLod,LODDistances:dist,LODMethod:method};
 return res;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){
 const argv=process.argv.slice(2),oi=argv.indexOf('--out'),items=inputs(argv);
 if(!items.length)throw Error('用法：node analysis/scripts/重要度LOD检查.mjs <粒子路径或资源ID>... | --all30 [--out <json>]');
 const report={format:'df.significance-lod-check/1',readAt:new Date().toLocaleString('sv-SE',{timeZone:'Asia/Hong_Kong'}).replace(' ','T')+'+08:00',source:'GPUECli 只读（/object/get）',rule:'spec/烟花特效资产规范.md §6.1',rows:[]};
 for(const it of items){const r=await check(it);report.rows.push(r);const mark=r.errors.length?'❌':r.warns.length?'⚠':'✅';console.log(mark,it.plat.padEnd(2),(r.summary?.name||it.path).padEnd(46),[...r.errors,...r.warns].join('；'));}
 const n=k=>report.rows.reduce((a,r)=>a+r[k].length,0);
 console.log(`共 ${report.rows.length} 个粒子：❌ ${n('errors')} 条，⚠ ${n('warns')} 条，提示 ${n('infos')} 条`);
 if(oi>=0)fs.writeFileSync(argv[oi+1],JSON.stringify(report,null,1));
 process.exitCode=n('errors')?1:0;
}
