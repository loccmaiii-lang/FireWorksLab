import test from 'node:test';import assert from 'node:assert/strict';
import {baseCatalogue,staticBaseRecipe,baseComparisonSpecs} from '../src/basic-template-model.mjs';
import {nativeEntry} from '../src/subtemplate-model.mjs';
test('同资源的不同花型规格分别保留，只读当前固定版本，不拿历史和固有尺寸替代',()=>{
 const row=(key,d,z)=>({key,entries:[{role:'burst',native:{...nativeEntry('SHARED'),PositionOffset:{X:0,Y:0,Z:z*100}},preview:{heightM:0,diameterM:d,verified:false}}]});
 const doc={points:[{zone:'dam',z:150},{zone:'front',z:50}],templateLibrary:[{id:'A',name:'坝顶',zone:'dam',subTemplateRef:'A@2'},{id:'B',name:'前台',zone:'front',subTemplateRef:'B@1'}],subTemplateLibrary:[row('A@1',230,330),row('A@2',90,190),row('B@1',30,75)]},before=structuredClone(doc);
 const specs=baseComparisonSpecs(doc);assert.equal(specs.length,2);assert.deepEqual(specs.map(s=>s.diameterM),[90,30]);assert.deepEqual(specs.map(s=>s.z),[340,125]);assert(specs.every(s=>s.resourceIds.includes('SHARED')));assert.deepEqual(doc,before);
});
test('缺少尺寸的资源不虚构参照，扇形使用单束长度而非花径',()=>{
 const n=nativeEntry('FAN'),doc={templateLibrary:[{id:'F',name:'扇形',zone:'dam',subTemplateRef:'F@1'},{id:'U',subTemplateRef:'U@1'}],subTemplateLibrary:[{key:'F@1',entries:[{role:'fan',native:n,preview:{heightM:80,diameterM:999}}]},{key:'U@1',entries:[{role:'burst',native:n,preview:{}}]}]};
 const s=baseComparisonSpecs(doc);assert.equal(s.length,1);assert.equal(s[0].lengthM,80);assert.equal(s[0].diameterM,0);
});
test('节目新基础库覆盖旧目录，包含未使用资源且不从花型反推基础尺寸',()=>{
 const doc={baseResourceLibrary:[{id:'NEW',label:'新球花',role:'burst',sizeClass:'small',source:'ResourceFXTable',sourceRows:[{platform:'PC',particle:'/Game/New'}],preview:{diameterM:90,heightM:0,durationS:4,verified:false}},{id:'UNUSED',label:'未使用新尾缀',role:'trail',preview:{heightM:150,durationS:3}}],subTemplateLibrary:[{key:'FLOWER@1',entries:[{role:'burst',native:{...nativeEntry('NEW'),LocalTimeOffset:5},preview:{diameterM:230,heightM:0,durationS:6}}]}]};
 const before=structuredClone(doc),rows=baseCatalogue(doc,{rows:[{id:'NEW',role:'burst',sourceRows:[{platform:'PC',particle:'/Game/Old'}]},{id:'OLD',role:'burst'}]});
 assert.deepEqual(rows.map(r=>r.id),['NEW','UNUSED']);
 assert.equal(rows[0].sourceRows[0].particle,'/Game/New');
 assert.equal(rows[0].entry.preview.diameterM,90);
 assert.equal(rows[0].entry.native.LocalTimeOffset,0);
 assert.equal(rows[0].recipeKey,'FLOWER@1');
 assert.deepEqual(doc,before);
});
test('read-only table catalogue includes unused IDs and keeps unknown dimensions unknown; derived IDs are only programme additions',()=>{const doc={subTemplateLibrary:[{key:'OLD@1',entries:[{role:'burst',native:{...nativeEntry('ONE'),LocalTimeOffset:5,PositionOffset:{X:0,Y:0,Z:5000}},preview:{heightM:0,diameterM:90,durationS:3}}]}]};const rows={rows:[{id:'ONE',label:'球花',role:'burst',platforms:['PC'],sizeClass:'small'},{id:'UNUSED',label:'尾缀',role:'trail',platforms:['PC','手机'],sizeClass:'unknown'}]};const resources=baseCatalogue(doc,rows);assert.equal(resources.length,2);assert(resources.some(r=>r.id==='UNUSED'));const staticRecipe=staticBaseRecipe(resources[0]);assert.equal(staticRecipe.entries[0].native.LocalTimeOffset,0);assert.equal(staticRecipe.entries[0].native.PositionOffset.Z,0);assert.equal(resources[1].measured,false);assert.equal(staticBaseRecipe(resources[1]).entries.length,1);assert.equal(doc.subTemplateLibrary[0].entries[0].native.PositionOffset.Z,5000)});
