import test from 'node:test';import assert from 'node:assert/strict';
import {ueText} from '../src/delivery-model.mjs';

// UE 4.24 实测（手游编排 2026-10-11）：DefaultConfig 里 LightTemplates=() 读回成 1 个默认元素；写空串才是空数组。
test('ueText writes empty arrays as empty text so UE does not create a default element',()=>{
 assert.equal(ueText([]),'');
 assert.equal(ueText({LightTemplates:[],TotalDuration:6}),'(LightTemplates=,TotalDuration=6)');
 assert.equal(ueText({Slots:[{StartTime:1,TemplateName:'A'}],Entries:[]}),'(Slots=((StartTime=1,TemplateName="A")),Entries=)');
});

test('ueText keeps non-empty arrays and nested structs unchanged',()=>{
 assert.equal(ueText([1,2]),'(1,2)');
 assert.equal(ueText({_struct:'Vector',X:0,Y:0,Z:3000}),'(X=0,Y=0,Z=3000)');
 assert.equal(ueText({Filter:{PlatformFlags:14,MinQualityLevel:'EQuality_VeryLow'}}),'(Filter=(PlatformFlags=14,MinQualityLevel="EQuality_VeryLow"))');
});
