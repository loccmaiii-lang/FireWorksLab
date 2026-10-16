// 修订后3代表在内存审看。被他人锁定GoldKamuro不写系统，仅其已迁出MI改0.98查看。结束所有临时场景对象自动清。
import fs from 'node:fs';
import {set,get,sleep,saveLog} from './ue_rw.mjs';
import {ue,pyJson,SYS,setEmitters,setMI,misOf} from './ops.mjs';
const plan=JSON.parse(fs.readFileSync(new URL('./final_targets.json',import.meta.url),'utf8'));
const dir='F:/FireWorksLab/analysis/local/RSU26_tmp/C';fs.mkdirSync(dir,{recursive:true});
const names=['P_EFX_FireWorks_Crackle_HD','P_EFX_FireWorks_GoldKamuro_HD','P_EFX_FireWorks_RiseTrail_M_HD'];
const s=1.0,origin=[0,0,200000];
const systemSnapshots=[];
const boxTxt=b=>`(Min=(X=${b.min[0]},Y=${b.min[1]},Z=${b.min[2]}),Max=(X=${b.max[0]},Y=${b.max[1]},Z=${b.max[2]}),IsValid=1)`;
const log={};
try{
 for(const n of names){const p=plan.systems.find(x=>x.name===n);if(!p.skipSystem){systemSnapshots.push([p.system,await get(p.system,['bUseFixedRelativeBoundingBox','FixedRelativeBoundingBox'])]);await set(p.system,{bUseFixedRelativeBoundingBox:true,FixedRelativeBoundingBox:boxTxt(p.bounds)});await setEmitters(n);}}
 log.materials=await setMI([...new Set(names.flatMap(misOf))],.98);
 const runs=names.map((n,i)=>{
  const p=plan.systems.find(x=>x.name===n),b=p.bounds;const h=b.min.map((v,j)=>(b.max[j]-v)*s/2);const c=b.min.map((v,j)=>origin[j]+s*(b.max[j]+v)/2);const distance=Math.max(14000,Math.max(...h)*1.45);
  const front={name:'front',loc:[c[0],c[1]-distance,c[2]],rot:[0,90,0]};const low={name:'low',loc:[c[0],c[1]-distance*.8,c[2]-h[2]],rot:[Math.atan2(h[2],distance*.8)*180/Math.PI,90,0]};
  const times=i===0?[.5,1.5,2.5,3.5,4.5]:i===1?[2,3.6,3.9,6.6,6.9,9]:[1.5,3.5,5.5,6.5];
  return{id:n,actors:['rep'+i],dur:i===0?7:i===1?12:10,cam:[front.loc,front.rot],boxes:p.skipSystem?[]:[{center:c,extent:h,color:[0,1,0,1],thickness:30}],shots:times.map(t=>({t,dir,cams:[front,low]}))};
 });
 const cfg={res:'1280x720',actors:names.map((n,i)=>({key:'rep'+i,system:SYS[n].system,loc:origin,s})),runs};
 await ue(`start(${pyJson(cfg)})`);
 let status;
 for(let i=0;i<150;i++){await sleep(1000);try{status=await ue('status()')}catch(e){if(!/ECONNRESET/.test(String(e)))throw e;status=await ue('status()')}if(status.error)throw Error(status.error);if(!status.running)break;}
 if(status.running)throw Error('representatives timeout');
 const f=dir+'/result.json';await ue(`dump(${JSON.stringify(f)})`);log.result=JSON.parse(fs.readFileSync(f,'utf8'));
}finally{log.cleanup=await ue('cleanup()');fs.writeFileSync(new URL('./代表测试/修订后实播.json',import.meta.url),JSON.stringify(log,null,1));saveLog('log_representatives_final.json');}
console.log('3 representatives sampled '+log.result?.shots+' shots');
