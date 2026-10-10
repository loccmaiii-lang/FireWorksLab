import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesLibrarySearch} from '../src/library-model.mjs';

test('中文显示名的基础资源可用ResourceId查询，大小写及前后空格不影响',()=>{
 const rows=[['小青柠','Lime'],['爆裂星','Crackle'],['金蕊柠','GoldCoreLime']].map(([name,id])=>({name,a:{id:'P_EFX_FireWorks_'+id}}));
 assert.equal(rows.filter(i=>matchesLibrarySearch(i,' lime ')).length,2);
 assert.equal(rows.filter(i=>matchesLibrarySearch(i,'crackle')).length,1);
 assert.equal(rows.filter(i=>matchesLibrarySearch(i,'GOLDCORELIME')).length,1);
 assert.equal(rows.filter(i=>matchesLibrarySearch(i,'爆裂')).length,1);
 assert.equal(rows.filter(i=>matchesLibrarySearch(i,'Missing')).length,0);
 assert.equal(rows.filter(i=>matchesLibrarySearch(i,'')).length,3);
});
test('花型和编排仍可按所引用资源及固定版本查询',()=>{
 assert(matchesLibrarySearch({name:'花型',r:{entries:[{native:{FXResourceId:'P_Lime'}}]}},'lime'));
 assert(matchesLibrarySearch({name:'高潮',p:{calls:[{recipeRef:'ST_Crackle@2',label:'开花'}]}},'crackle@2'));
});
