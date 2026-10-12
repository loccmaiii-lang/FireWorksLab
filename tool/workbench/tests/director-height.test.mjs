import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {migrateNumbering} from '../src/point-numbering.mjs';
import {preflightProject} from '../src/program-project.mjs';
import {nestedQualityEvents,qualityEvents} from '../src/editing-model.mjs';
import {compileDirector} from '../src/director-model.mjs';
import {expandDirectorSchedule} from '../src/director-compact.mjs';

// 16.0.21：UE 实测（10-13，Night 导演 16.0.20）——导演不认父模板里 SubTemplate 条目的 PositionOffset，
// 只认子模板条目的偏移。所以 dz 必须烘进子模板高度版本，父条目 Z 恒为 0。
const seed=migrateNumbering(JSON.parse(fs.readFileSync(new URL('../public/data/score24-v05.json',import.meta.url))));
const file=new URL('../public/data/cloud-latest.json',import.meta.url);
const load=()=>{const cloud=JSON.parse(fs.readFileSync(file,'utf8'));return preflightProject(JSON.stringify(cloud.project),seed)};

function launches(arrays){
 // 按 UE 的实际行为展开：父条目只取时间 / 点位 / 子模板，子模板条目给高度。
 const subs=new Map(arrays.EffectSubTemplates.map(s=>[s.TemplateName,s])),parents=new Map(arrays.EffectTemplates.map(p=>[p.TemplateName,p])),out=[];
 for(const g of arrays.EffectScheduleGroups)for(const s of g.Slots)for(const e of parents.get(s.TemplateName).Entries){
  const sub=subs.get(e.SubTemplateName);assert(sub,'引用了不存在的子模板 '+e.SubTemplateName);
  out.push({point:g.GroupName+e.SlotIndex,t:+(s.StartTime+e.LocalTimeOffset).toFixed(3),parentZ:e.PositionOffset.Z,z:sub.Entries.map(x=>x.PositionOffset.Z)});
 }
 return out;
}

test('parent SubTemplate entries never carry a height: dz lives in the sub-template height versions',()=>{
 if(!fs.existsSync(file))return;
 const state=load(),nested=nestedQualityEvents(state.doc,state.profiles),events=nested.events,r=compileDirector(state.doc,events,undefined);
 assert.deepEqual(nested.issues,[]);assert.deepEqual(r.issues,[]);
 for(const p of r.arrays.EffectTemplates)for(const e of p.Entries)assert.equal(e.PositionOffset.Z,0,p.TemplateName+' 父条目还带着高度');
 const withDz=events.filter(e=>e.dz);assert(withDz.length>100,'云端编排应有大量高低错落');
 assert(r.summary.heightVariants>0);
 for(const s of r.arrays.EffectSubTemplates.filter(s=>/_[UD]\d/.test(s.TemplateName)))assert.match(s.TemplateName,/^[A-Za-z0-9]+_[UD]\d+(p\d+)?(V\d\d)?$/);
});

test('every launch ends up at sub-template height + dz (what UE actually plays)',()=>{
 if(!fs.existsSync(file))return;
 const state=load(),events=qualityEvents(state.doc,state.profiles,'high');
 const byKey=r=>{const m=new Map();for(const x of launches(r.arrays)){const k=x.point+'@'+x.t;m.set(k,[...(m.get(k)||[]),x])}return m};
 const now=byKey(compileDirector(state.doc,events,undefined)),zero=byKey(compileDirector(state.doc,events.map(e=>({...e,dz:0})),undefined));
 const want=new Map();for(const e of events){const k=e.pointId+'@'+(+e.effectiveLaunch.toFixed(3));want.set(k,[...(want.get(k)||[]),Math.round((e.dz||0)*100)])}
 assert.equal([...now.values()].flat().length,events.length);
 // 每一发：实际子模板 = 不带 dz 的子模板整体平移 dz（尾缀和花一起），且平移量正好是这一发的 dz。
 let moved=0;
 for(const [k,list] of now){const pool=[...(zero.get(k)||[])],dzs=[...(want.get(k)||[])];assert.equal(list.length,pool.length,k);
  for(const a of list){assert.equal(a.parentZ,0);const i=pool.findIndex(b=>b.z.length===a.z.length&&(()=>{const d=a.z.map((z,j)=>Math.round(z-b.z[j]));return d.every(x=>x===d[0])&&dzs.includes(d[0])})());
   assert(i>=0,k+' 找不到整体平移 dz 的对应发');const d=Math.round(a.z[0]-pool[i].z[0]);dzs.splice(dzs.indexOf(d),1);pool.splice(i,1);if(d)moved++}
  assert.equal(dzs.length,0,k)}
 assert(moved>100);
});

test('same base + same dz shares one height version; schedule otherwise identical to the dz=0 compile',()=>{
 if(!fs.existsSync(file))return;
 const state=load(),events=qualityEvents(state.doc,state.profiles,'high');
 const a=compileDirector(state.doc,events,undefined),b=compileDirector(state.doc,events.map(e=>({...e,dz:0})),undefined);
 const strip=x=>expandDirectorSchedule(x.arrays).map(r=>({group:r.group,slot:r.slot,entries:r.parent.Entries.map(({SubTemplateName,...rest})=>rest)}));
 assert.deepEqual(strip(a),strip(b),'只换了子模板引用，时间 / 点位 / 档位 / 平台都不变');
 const names=a.arrays.EffectSubTemplates.map(s=>s.TemplateName);assert.equal(new Set(names).size,names.length);
 const sigs=a.arrays.EffectSubTemplates.map(s=>JSON.stringify(s.Entries));assert.equal(new Set(sigs).size,sigs.length,'同一底模板 + 同一高度只建一个版本');
});
