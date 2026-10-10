// Programme timing only: shift a complete saved flower without altering its layers.
export function validateLaunchJitter(config){
 if(config===undefined)return;
 if(!config||typeof config.maxS!=='number'||!Number.isFinite(config.maxS)||config.maxS<0||config.maxS>60||!Number.isSafeInteger(config.seed)||config.seed<0)throw Error('随机错开须为0–60秒，种子须为非负整数');
}
export function launchDelay(config,key){
 validateLaunchJitter(config);if(!config?.maxS)return 0;
 let hash=2166136261;for(const c of config.seed+':'+key)hash=Math.imul(hash^c.charCodeAt(0),16777619);
 hash=Math.imul(hash^(hash>>>16),0x45d9f3b);hash=Math.imul(hash^(hash>>>16),0x45d9f3b);
 return Math.round(((hash^(hash>>>16))>>>0)/4294967296*config.maxS*1e6)/1e6;
}
export const eventLaunchDelay=event=>Number(event.launchJitterS||0);
