// 仅平移完整花型；固定子模板内部延迟不参与编排时间量化。
export function validateLaunchJitter(config,legacy=false){
 if(config===undefined)return;
 if(!config||typeof config.maxS!=='number'||!Number.isFinite(config.maxS)||config.maxS<0||config.maxS>60||!Number.isSafeInteger(config.seed)||config.seed<0)throw Error('随机错开须为0–60秒，种子须为非负整数');
 if(!legacy&&Math.abs(config.maxS*10-Math.round(config.maxS*10))>1e-8)throw Error('随机错开必须是0.1秒的整数倍');
}
function unit(config,key){
 let hash=2166136261;for(const c of config.seed+':'+key)hash=Math.imul(hash^c.charCodeAt(0),16777619);
 hash=Math.imul(hash^(hash>>>16),0x45d9f3b);hash=Math.imul(hash^(hash>>>16),0x45d9f3b);
 return ((hash^(hash>>>16))>>>0)/4294967296;
}
export function launchDelay(config,key){
 validateLaunchJitter(config);if(!config?.maxS)return 0;
 return Math.floor(unit(config,key)*(Math.round(config.maxS*10)+1))/10;
}
// 仅用于读取旧备份：先核实旧派生值，禁止把损坏文件当成升级修好。
export function migrateLegacyJitter(doc){
 const configs=new Map(doc.cues.map(c=>{validateLaunchJitter(c.launchJitter,true);return [c.id,c.launchJitter]}));
 const calls=(doc.choreographyLibrary||[]).flatMap(p=>p.calls||[]);
 for(const c of calls)validateLaunchJitter(c.launchJitter,true);
 if(![...configs.values(),...calls.map(c=>c.launchJitter)].some(c=>c?.maxS))return doc;
 const r=x=>Math.round(x*1e6)/1e6;
 for(const e of doc.events){const config=configs.get(e.cueId);if(!config?.maxS)continue;
  const expected=r(unit(config,e.jitterKey??e.id)*config.maxS);
  if(typeof e.launchJitterS!=='number'||!Number.isFinite(e.launchJitterS)||Math.abs(e.launchJitterS-expected)>1e-6)throw Error('旧节目随机错开与保存的配置不一致，未迁移');
  for(const field of ['launch','burst','end']){const key='effective'+field[0].toUpperCase()+field.slice(1);if(!Number.isFinite(e[field])||(e[key]!==undefined&&(!Number.isFinite(e[key])||Math.abs(e[key]-r(e[field]+Number(e.dt||0)+expected))>1e-6)))throw Error('旧节目随机错开缓存不一致，未迁移')}
 }
 const next=structuredClone(doc);
 for(const c of [...next.cues,...(next.choreographyLibrary||[]).flatMap(p=>p.calls||[])])if(c.launchJitter)c.launchJitter.maxS=Math.floor(c.launchJitter.maxS*10+1e-8)/10;
 const byCue=new Map(next.cues.map(c=>[c.id,c.launchJitter]));
 for(const e of next.events){const config=byCue.get(e.cueId);if(config?.maxS)e.launchJitterS=launchDelay(config,e.jitterKey??e.id);else delete e.launchJitterS;for(const f of ['launch','burst','end'])e['effective'+f[0].toUpperCase()+f.slice(1)]=r(e[f]+Number(e.dt||0)+eventLaunchDelay(e))}
 next.notices=[...(next.notices||[]),'旧版随机错开已迁移为0.1秒刻度；上限向下取整，固定子模板保持原值。原节目文件未改写。'];
 return next;
}
export const eventLaunchDelay=event=>Number(event.launchJitterS||0);
