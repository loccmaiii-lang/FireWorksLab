// D1单变量非方形测试：M.TrailFar，无OrientationAxisLock，Rectangle vs FCP；RiseLoop等其它模块不动。
// 只在内存改一次Required.ScreenAlignment，finally恢复，绝不保存该测试朝向。
import fs from 'node:fs';
import {get,set,sleep,saveLog} from './ue_rw.mjs';
import {ue,pyJson,rebuild,SYS} from './ops.mjs';
const here=new URL('./',import.meta.url);const temp='F:/FireWorksLab/analysis/local/RSU26_tmp/D1';fs.mkdirSync(temp,{recursive:true});
const q=JSON.parse(fs.readFileSync(new URL('方向验证对象.json',here),'utf8')).find(x=>x.emitter==='TrailFar');
const sys=SYS.P_EFX_FireWorks_RiseTrail_M_HD.system;
const before=await get(q.required,['ScreenAlignment']);const results=[];
try{
 for(const align of ['PSA_Rectangle','PSA_FacingCameraPosition']){
  await set(q.required,{ScreenAlignment:align});await rebuild(sys);
  const cfg={res:'1280x720',actors:[{key:'d1',system:sys,loc:[0,0,200000],s:1}],runs:[{id:align,actors:['d1'],dur:7,shots:[1.5,3.5,5.5].map(t=>({t,dir:temp,cams:[{name:'front',loc:[0,-36000,212000],rot:[0,90,0]},{name:'low',loc:[0,-36000,185000],rot:[35,90,0]}]})),cam:[[0,-36000,212000],[0,90,0]],boxes:[]}]};
  await ue(`start(${pyJson(cfg)})`);
  let s;
  for(let i=0;i<100;i++){await sleep(1000);try{s=await ue('status()')}catch(e){if(!/ECONNRESET/.test(String(e)))throw e;s=await ue('status()')}if(s.error)throw Error(s.error);if(!s.running)break;}
  if(s.running)throw Error('D1 timeout');
  const f=temp+'/'+align+'.json';await ue(`dump(${JSON.stringify(f)})`);results.push({alignment:align,readback:await get(q.required,['ScreenAlignment']),result:JSON.parse(fs.readFileSync(f,'utf8'))});
  await ue('cleanup()');
 }
}finally{await ue('cleanup()');await set(q.required,before);await rebuild(sys);fs.writeFileSync(new URL('D1朝向原生对照.json',here),JSON.stringify({before,results,restored:await get(q.required,['ScreenAlignment'])},null,1));saveLog('log_orientation_probe.json');}
console.log('D1 completed and restored '+JSON.stringify(before));
