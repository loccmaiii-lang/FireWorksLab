// 每效果一次：多缩放/多倾斜/LOD同时生成独立组件，直到全组无粒子。固定盒只临时关闭，finally必恢复，不存任何资产/地图。
import fs from 'node:fs';
import {sleep,saveLog} from './ue_rw.mjs';
import {ue,pyJson,setDynamic,restoreBounds} from './ops.mjs';
const here=new URL('./',import.meta.url),temp='F:/FireWorksLab/analysis/local/RSU26_tmp';
const cases=JSON.parse(fs.readFileSync(new URL('measure_cases.json',here),'utf8'));
const lods=JSON.parse(fs.readFileSync(new URL('lod_cases.json',here),'utf8'));
const dry=JSON.parse(fs.readFileSync(new URL('../干跑.json',here),'utf8'));
const file='原生范围_全体分组.json';
const out=fs.existsSync(new URL(file,here))?JSON.parse(fs.readFileSync(new URL(file,here),'utf8')):{format:'rsu26.native-range/2',at:new Date().toISOString(),systems:[],errors:[]};
const done=new Set(out.systems.map(s=>s.name));let active=null;
const store=()=>fs.writeFileSync(new URL(file,here),JSON.stringify(out,null,1));
const callRead=async(c)=>{try{return await ue(c)}catch(e){if(!/ECONNRESET|socket hang up/.test(String(e)))throw e;return ue(c)}};
try{
 for(const d of dry.systems.filter(x=>x._change&&x.name!=='P_EFX_FireWorks_GoldKamuro_HD')){
  if(done.has(d.name))continue;
  const base=cases.filter(x=>x.name===d.name);const cs=base.map(x=>({...x,lod:0}));
  for(const x of base.filter(x=>!x.pitch&&!x.roll))for(let l=1;l<(lods[d.name]||1);l++)cs.push({...x,lod:l});
  active=d.name;await setDynamic(d.name);
  const dur=Math.max(5,...cs.map(x=>x.life+3));
  const cfg={actors:cs.map((c,i)=>({key:'g'+i,system:c.system,loc:[0,0,200000],s:c.s,pitch:c.pitch,roll:c.roll,lod:c.lod})),runs:[{id:d.name,actors:cs.map((c,i)=>'g'+i),dur,maxdur:Math.max(45,dur*3),until_dead:true,cam:[[0,-50000,200000],[0,90,0]],shots:[]}]};
  await ue(`start(${pyJson(cfg)})`);
  let end;
  for(let i=0;i<400;i++){await sleep(1000);end=await callRead('status()');if(end.error)throw Error(end.error);if(!end.running)break;}
  if(end.running)throw Error('native grouped timeout '+d.name);
  await ue(`dump(${JSON.stringify(temp+'/group_result.json')})`);
  const result=JSON.parse(fs.readFileSync(temp+'/group_result.json','utf8'));
  const rec={name:d.name,frames:result.frames,notes:result.notes,cases:cs.map((c,i)=>({...c,measured:result.meas['g'+i]}))};
  out.systems.push(rec);store();console.log(d.name+' cases='+cs.length+' frames='+rec.frames+' maxParticles='+Math.max(...rec.cases.map(c=>c.measured.maxParticles))+' notes='+JSON.stringify(rec.notes));
  await ue('cleanup()');await restoreBounds(d.name);active=null;
 }
}catch(e){out.errors.push(String(e));store();throw e;}
finally{try{await ue('cleanup()')}catch{}if(active)await restoreBounds(active);saveLog('log_measure_group.json');}
console.log('DONE '+out.systems.length+' systems');
