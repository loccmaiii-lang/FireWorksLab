// 只读：两个导演的场景实例 + 蓝图默认值的 DefaultConfig，存快照并统计属性树规模
import fs from 'node:fs';import {request} from '../MOBILE_TEST_20261011/ue.mjs';
const NIGHT='/Game/Maps/Dam_Iris_Long3/DynamicRequest/Event/MA5_FireworkOnDam/MA5_FireworkOnDam_Night.MA5_FireworkOnDam_Night:PersistentLevel.BP_NewYearFireworks_ShowDirector_Night_2';
const FAILED='/Game/Maps/Dam_Iris_Long3/DynamicRequest/Event/MA5_FireworkOnDam/MA5_FailedFireworkOnDam_.MA5_FailedFireworkOnDam_:PersistentLevel.BP_Failed_NewYearFireworks_ShowDirector_7';
const out={};
for(const [n,p] of [['night',NIGHT],['failed',FAILED]]){
 const a=(await request('/object/get',{path:p,properties:['DefaultConfig','bShowActive','DirectorId']},180000)).properties;
 const cls=(await request('/object/get',{path:p},60000));out[n]={path:p,active:a.bShowActive,id:a.DirectorId,cfg:a.DefaultConfig,class:cls.class||cls.data?.class};
 fs.writeFileSync(`${n}-instance.json`,JSON.stringify(a,null,1));
}
fs.writeFileSync('read-all.json',JSON.stringify(Object.fromEntries(Object.entries(out).map(([k,v])=>[k,{path:v.path,active:v.active,id:v.id,class:v.class}])),null,1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(out).map(([k,v])=>[k,{active:v.active,id:v.id,class:v.class,subs:v.cfg.EffectSubTemplates.length,tpls:v.cfg.EffectTemplates.length}]))));
