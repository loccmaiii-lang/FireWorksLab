// 第2步原生范围采样。绝不存地图/资产，逐效果重新生成组件，采动态盒直到无粒子；不用冻结、不把Slate时间冒充粒子年龄。
// mode=diag（Crackle无冻结、两端缩放） | all（所有可迁出系统、两端缩放/倾斜、多LOD）
// GPU不把动态盒当粒子数据：模型GPU包络仍并入计划。GoldKamuro被他人锁定，整系统不改。
import fs from 'node:fs';
import {sleep,saveLog} from './ue_rw.mjs';
import {ue,pyJson,SYS,setDynamic,restoreBounds} from './ops.mjs';
const mode=process.argv[2];
const here=new URL('./',import.meta.url),temp='F:/FireWorksLab/analysis/local/RSU26_tmp';
const cases=JSON.parse(fs.readFileSync(new URL('measure_cases.json',here),'utf8'));
const dry=JSON.parse(fs.readFileSync(new URL('../干跑.json',here),'utf8'));
const file='原生范围_'+mode+'.json';
let output=fs.existsSync(new URL(file,here))?JSON.parse(fs.readFileSync(new URL(file,here),'utf8')):{format:'rsu26.native-range/1',at:new Date().toISOString(),cases:[],notes:[]};
const already=new Set(output.cases.map(c=>c.key));
let todos=cases.filter(c=>c.name!=='P_EFX_FireWorks_GoldKamuro_HD'&&(mode!=='diag'||c.name==='P_EFX_FireWorks_Crackle_HD'));
if(mode==='all'||mode==='batch'){
 const lods=JSON.parse(fs.readFileSync(new URL('lod_cases.json',here),'utf8'));
 todos=todos.map(x=>({...x,lod:0}));
 for(const x of cases.filter(c=>c.name!=='P_EFX_FireWorks_GoldKamuro_HD'&&!c.pitch&&!c.roll))for(let l=1;l<(lods[x.name]||1);l++)todos.push({...x,lod:l});
}
if(mode==='batch')todos=todos.filter(c=>!c.pitch&&!c.roll);
const store=()=>fs.writeFileSync(new URL(file,here),JSON.stringify(output,null,1));
let activeName=null;
try{
 for(const c of todos){
  const key=c.name+'_'+c.s+'_'+c.pitch+'_'+c.roll+'_lod'+(c.lod||0);if(already.has(key))continue;
  activeName=c.name;await setDynamic(c.name);
  const d=dry.systems.find(x=>x.name===c.name);const b=d.bounds.plan;
  const center=[0,0,200000];
  const maxh=Math.max(...b.min.map((x,i)=>(b.max[i]-x)*c.s/2));
  // 相机在整个范围外，避开剔除；超1200m的系统后续只以数据作采样。
  const camera=[0,-Math.min(90000,Math.max(12000,maxh*2.5)),200000];
  const dur=Math.max(3,c.life+2);
  const cfg={actors:[{key:'measure',system:c.system,loc:center,s:c.s,pitch:c.pitch,roll:c.roll,lod:c.lod||0}],runs:[{id:key,actors:['measure'],dur,maxdur:Math.max(30,dur*3),until_dead:true,cam:[camera,[0,90,0]],shots:[]}]};
  await ue(`start(${pyJson(cfg)})`);
  let end;
  for(let i=0;i<400;i++){
   await sleep(1100);
   try{end=await ue('status()');}catch(e){if(!/ECONNRESET|socket hang up/.test(String(e)))throw e;end=await ue('status()');}
   if(end.error)throw Error(end.error);
   if(!end.running)break;
  }
  if(end?.running)throw Error('measure timeout '+key);
  await ue(`dump(${JSON.stringify(temp+'/measure_result.json')})`);
  const result=JSON.parse(fs.readFileSync(temp+'/measure_result.json','utf8'));
  const m=result.meas.measure;
  output.cases.push({...c,key,measured:m,frames:result.frames,notes:result.notes});store();
  console.log(key+' frames='+result.frames+' live='+m.maxParticles+' last='+m.lastParticles+' box='+JSON.stringify([m.min,m.max]));
  await ue('cleanup()');await restoreBounds(c.name);
 }
}catch(e){output.notes.push(String(e));store();throw e;}
finally{try{await ue('cleanup()')}catch{}if(activeName)await restoreBounds(activeName);saveLog('log_measure_'+mode+'.json');}
console.log('DONE '+output.cases.length+' cases');
