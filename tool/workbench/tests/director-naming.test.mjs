import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nameDirectorArrays} from '../src/director-naming.mjs';

// 去掉标识名字，把两级引用展开成真实播放配置后比较，避免只验证名字相等。
function resolveCalls(a){
 const children=new Map(a.EffectSubTemplates.map(s=>[s.TemplateName,s.Entries]));
 const parents=new Map(a.EffectTemplates.map(p=>[p.TemplateName,p]));
 return a.EffectScheduleGroups.map(g=>({...g,Slots:g.Slots.map(slot=>{
  const {TemplateName,...s}=slot,{TemplateName:pn,...p}=parents.get(TemplateName);
  return {...s,parent:{...p,Entries:p.Entries.map(entry=>{const {SubTemplateName,...e}=entry;return {...e,child:SubTemplateName?children.get(SubTemplateName):undefined}})}};
 })}));
}
const load=tier=>{
 const data=JSON.parse(fs.readFileSync(new URL(`../../../FXtools/节目/NewYearFireWorks_v01/三表-R03-${tier}.json`,import.meta.url),'utf8'));
 // 正式三表更新后仍以改名前名字驱动回归，不能退化成只测试已命名的输入。
 if(data.templateNaming){
  const children=new Map(data.templateNaming.subTemplates.map(x=>[x.to,x.from])),parents=new Map(data.templateNaming.templates.map(x=>[x.to,x.from]));
  for(const s of data.EffectSubTemplates)s.TemplateName=children.get(s.TemplateName)||s.TemplateName;
  for(const p of data.EffectTemplates){p.TemplateName=parents.get(p.TemplateName)||p.TemplateName;for(const e of p.Entries)e.SubTemplateName=children.get(e.SubTemplateName)||e.SubTemplateName;}
  for(const g of data.EffectScheduleGroups)for(const s of g.Slots)s.TemplateName=parents.get(s.TemplateName)||s.TemplateName;
 }
 return data;
};
test('R03三档名称可搜且全部原生播放数据完全保留',()=>{
 for(const tier of ['high','medium','low']){
  const input=load(tier),before=structuredClone(input),{arrays,audit}=nameDirectorArrays(input);
  assert.deepEqual(input,before);
  assert.deepEqual(resolveCalls(arrays),resolveCalls(before));
  for(const root of ['Lime','Crackle','GoldCoreLime','GoldChry']){
   assert(arrays.EffectSubTemplates.some(s=>s.TemplateName===root));
   assert(arrays.EffectScheduleGroups.flatMap(g=>g.Slots).some(s=>s.TemplateName.startsWith(root+'_')));
  }
  assert(arrays.EffectTemplates.every(p=>/^[A-Za-z0-9]+_[A-Za-z0-9]+_C\d+_\d{2,}$/.test(p.TemplateName)));
  assert.equal(audit.subTemplates.length,22);
  assert.equal(audit.templates.length,before.EffectTemplates.length);
  assert.equal(new Set(arrays.EffectSubTemplates.map(s=>s.TemplateName.toLowerCase())).size,22);
  assert.deepEqual(nameDirectorArrays(arrays).arrays,arrays);
 }
});
test('扇形不同束数方向和同花型不同固定版本不会被合并',()=>{
 const base=load('high'),{arrays}=nameDirectorArrays(base);
 for(const n of ['FanComet','FanComet5','FanComet9Left','FanComet9Right','FanSilver5','FanSilver9Center','FanSilver13'])assert(arrays.EffectSubTemplates.some(s=>s.TemplateName===n));
 const lime=base.EffectSubTemplates.find(s=>s.Entries.some(e=>e.FXResourceId==='P_EFX_FireWorks_Lime'));
 base.EffectSubTemplates.push({...structuredClone(lime),TemplateName:'other_Lime_v2'});
 base.EffectSubTemplates.at(-1).Entries[0].LocalTimeOffset=12;
 base.EffectTemplates.push({TemplateName:'WB_C999_P',Entries:[{SubTemplateName:'other_Lime_v2',SlotIndex:0}]});
 base.EffectScheduleGroups[0].Slots.push({TemplateName:'WB_C999_P',StartTime:99});
 const next=nameDirectorArrays(base).arrays;
 assert(next.EffectSubTemplates.some(s=>s.TemplateName==='LimeV02'));
 assert.deepEqual(resolveCalls(next),resolveCalls(base));
});
test('混合父模板包含全部花型名，直接资源条目不丢失，大小写重名拒绝',()=>{
 const base=load('high'),lime=base.EffectSubTemplates.find(s=>s.Entries.some(e=>e.FXResourceId==='P_EFX_FireWorks_Lime'));
 const gold=base.EffectSubTemplates.find(s=>s.Entries.some(e=>e.FXResourceId==='P_EFX_FireWorks_GoldChry'));
 base.EffectTemplates.push({TemplateName:'WB_C999_P',Entries:[{SubTemplateName:lime.TemplateName},{SubTemplateName:gold.TemplateName},{EntryType:'Resource',FXResourceId:'P_EFX_FireWorks_Crackle'}]});
 base.EffectScheduleGroups[0].Slots.push({TemplateName:'WB_C999_P',StartTime:99});
 const {arrays}=nameDirectorArrays(base),name=arrays.EffectTemplates.at(-1).TemplateName;
 for(const root of ['Lime','GoldChry','Crackle'])assert(name.includes(root));
 assert.deepEqual(resolveCalls(arrays),resolveCalls(base));
 base.EffectSubTemplates.push({...lime,TemplateName:lime.TemplateName.toUpperCase()});
 assert.throws(()=>nameDirectorArrays(base),/重名/);
});
