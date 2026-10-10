// 原导演验收助手：读取、备份和核对；不创建资产，不自动发起导入或播放。
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {readDirector,same} from '../../tool/workbench/src/engine.mjs';
import {DEFAULT_DIRECTOR} from '../../tool/workbench/src/connection.mjs';

export function request(route,payload){
 if(!['/object/get','/object/search'].includes(route))throw Error('验收助手仅允许读取');
 return new Promise((resolve,reject)=>{
  const body=Buffer.from(JSON.stringify(payload));
  const q=http.request('http://127.0.0.1:17780/gpcli'+route,{agent:false,method:'POST',headers:{'Content-Type':'text/plain','Content-Length':body.length}},r=>{
   let text='';r.setEncoding('utf8');r.on('data',c=>text+=c);r.on('end',()=>{try{const value=JSON.parse(text);if(r.statusCode!==200||value.success===false)throw Error(value.message||'UE读取失败');resolve(value.data??value)}catch(e){reject(e)}});
  });q.on('error',reject);q.setTimeout(15000,()=>q.destroy(Error('UE读取超时')));q.end(body);
 });
}
export async function snapshot(){
 const target=await readDirector(DEFAULT_DIRECTOR,{request});
 const refs=await request('/object/search',{class:'DFMShowDirector',limit:1000}),instances=[];
 for(const ref of refs.objects||[]){
  if(!ref.path?.startsWith('/Game/')||ref.path.includes('.Default__')||/^(REINST_|SKEL_)/.test(ref.name||ref.class||''))continue;
  const actor=await request('/object/get',{path:ref.path});
  if(actor.properties?.DirectorId===target.target.directorId)instances.push(actor);
 }
 return {format:'df.original-director-acceptance/1',time:new Date().toISOString(),...target,instances};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 const output=process.argv[2];if(!output)throw Error('需要指定新的备份文件路径');
 if(fs.existsSync(output))throw Error('备份已存在，不覆盖');
 const value=await snapshot();fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(value,null,2));
 const baseline=process.argv[3]?JSON.parse(fs.readFileSync(process.argv[3],'utf8')):null;
 const originalInstancesUnchanged=baseline?baseline.instances.every(a=>{const current=value.instances.find(b=>b.path===a.path);return current&&same(current.properties.DefaultConfig,a.properties.DefaultConfig)}):undefined;
 console.log(JSON.stringify({backup:output,target:value.target,active:value.active,points:value.points.length,instances:value.instances.map(a=>({path:a.path,active:a.properties.bShowActive,configMatchesBlueprint:same(a.properties.DefaultConfig,value.config)})),counts:Object.fromEntries(['EffectSubTemplates','EffectTemplates','EffectScheduleGroups'].map(k=>[k,value.config[k].length])),duration:value.config.TotalDuration,...(baseline?{originalConfigUnchanged:same(value.config,baseline.config),originalInstancesUnchanged}:{})},null,2));
}
