import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {migrateSubTemplates} from '../src/subtemplate-model.mjs';
import {compileDirector} from '../src/director-model.mjs';import {migrateNumbering} from '../src/point-numbering.mjs';import {qualityEvents,nestedQualityEvents,markMobileOnly,cuePlatformFlags} from '../src/editing-model.mjs';

// 一张导演表：低配条目 VeryLow、中配追加 Medium、高配追加 High；UE 按「当前画质 ≥ 最低画质」播放（手游编排 2026-10-11 UE 实测）。
const seed=migrateNumbering(JSON.parse(fs.readFileSync(new URL('../public/data/score24-v05.json',import.meta.url))));
const source=JSON.parse(fs.readFileSync(new URL('../public/data/subtemplate-source.json',import.meta.url)));
const doc=migrateSubTemplates(seed.doc,source.catalog);
// 嵌套的档位：中配去掉每段最后一个点，低配只留第一个点
const profiles={medium:{},low:{}};
for(const c of doc.cues){profiles.medium[c.id]=c.pointIds.length>1?c.pointIds.slice(0,-1):[...c.pointIds];profiles.low[c.id]=c.pointIds.slice(0,1);}
const LEVEL={EQuality_VeryLow:0,EQuality_Low:1,EQuality_Medium:2,EQuality_High:3,EQuality_VeryHigh:4};
function expand(arrays,level=99){const out=[];const subs=new Map(arrays.EffectSubTemplates.map(s=>[s.TemplateName,s])),parents=new Map(arrays.EffectTemplates.map(p=>[p.TemplateName,p]));
 for(const g of arrays.EffectScheduleGroups)for(const slot of g.Slots)for(const e of parents.get(slot.TemplateName).Entries){if(LEVEL[e.Filter.MinQualityLevel]>level)continue;for(const n of subs.get(e.SubTemplateName).Entries)out.push(JSON.stringify([g.GroupName+e.SlotIndex,Math.round((slot.StartTime+e.LocalTimeOffset+n.LocalTimeOffset)*1e5)/1e5,n.FXResourceId,n.RotationOffset,n.PositionOffset]));}
 return out.sort();}

test('one nested table plays exactly what each separate tier table plays',()=>{
 const nested=nestedQualityEvents(doc,profiles);assert.deepEqual(nested.issues,[]);
 const one=compileDirector(doc,nested.events);assert.deepEqual(one.issues,[]);assert.equal(one.manifest.qualityMode,'nested');
 for(const [tier,level] of [['low',0],['low',1],['medium',2],['high',3],['high',4]]){const sep=compileDirector(doc,qualityEvents(doc,profiles,tier));assert.deepEqual(sep.issues,[]);assert.deepEqual(expand(one.arrays,level),expand(sep.arrays),tier+' @'+level);}
 const counts={};for(const p of one.arrays.EffectTemplates)for(const e of p.Entries)counts[e.Filter.MinQualityLevel]=(counts[e.Filter.MinQualityLevel]||0)+1;
 assert(counts.EQuality_VeryLow>0&&counts.EQuality_Medium>0&&counts.EQuality_High>0);
 for(const g of one.arrays.EffectScheduleGroups)for(const s of g.Slots)assert.equal(s.Filter.MinQualityLevel,'EQuality_VeryLow');
});

test('a low point that is not in medium blocks the single table',()=>{
 const c=doc.cues.find(c=>c.pointIds.length>2),bad=structuredClone(profiles);bad.medium[c.id]=[c.pointIds[1]];bad.low[c.id]=[c.pointIds[0]];
 const r=nestedQualityEvents(doc,bad);assert.equal(r.issues.length,1);assert.match(r.issues[0],/低配.*中配/);
});

test('cues marked mobile:false are written PC + Gamepad only (12); others stay 14',()=>{
 const d=structuredClone(doc),c=d.cues[0];c.mobile=false;
 const one=compileDirector(d,nestedQualityEvents(d,profiles).events);assert.deepEqual(one.issues,[]);
 const flags=new Set(one.arrays.EffectTemplates.flatMap(p=>p.Entries.map(e=>e.Filter.PlatformFlags)));assert(flags.has(12)&&flags.has(14));
});

test('separate tier export is unchanged: every entry stays 14 / VeryLow',()=>{
 const r=compileDirector(doc,qualityEvents(doc,profiles,'medium'));assert.equal(r.manifest.qualityMode,'tier');
 for(const p of r.arrays.EffectTemplates)for(const e of p.Entries)assert.deepEqual({PlatformFlags:e.Filter.PlatformFlags,MinQualityLevel:e.Filter.MinQualityLevel},{PlatformFlags:14,MinQualityLevel:'EQuality_VeryLow'});
});

test('mobile-only cues (mobile:\'only\', 手游替身) are written Mobile only (2) in the single table and in a tier export',()=>{
 assert.deepEqual([cuePlatformFlags({}),cuePlatformFlags({mobile:true}),cuePlatformFlags({mobile:false}),cuePlatformFlags({mobile:'only'})],[14,14,12,2]);
 const d=structuredClone(doc),[a,b]=d.cues;a.mobile='only';b.mobile=false;
 const nested=nestedQualityEvents(d,profiles);assert.deepEqual(nested.issues,[]);
 const byCue=new Map(nested.events.map(e=>[e.cueId,e.platformFlags]));assert.equal(byCue.get(a.id),2);assert.equal(byCue.get(b.id),12);
 const one=compileDirector(d,nested.events);assert.deepEqual(one.issues,[]);
 const flags=new Set(one.arrays.EffectTemplates.flatMap(p=>p.Entries.map(e=>e.Filter.PlatformFlags)));assert(flags.has(2)&&flags.has(12)&&flags.has(14));
 const tier=markMobileOnly(d,qualityEvents(d,profiles,'medium'));assert(tier.filter(e=>e.cueId===a.id).every(e=>e.platformFlags===2));assert(tier.filter(e=>e.cueId!==a.id).every(e=>e.platformFlags===undefined));
 const sep=compileDirector(d,tier);assert.deepEqual(sep.issues,[]);
 const sf=new Set(sep.arrays.EffectTemplates.flatMap(p=>p.Entries.map(e=>e.Filter.PlatformFlags)));assert(sf.has(2)&&sf.has(14)&&!sf.has(12));
 const plain=qualityEvents(doc,profiles,'low');assert.equal(markMobileOnly(doc,plain),plain);
});
