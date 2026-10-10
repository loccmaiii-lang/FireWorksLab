import test from 'node:test';
import assert from 'node:assert/strict';
import {drawRecipeEntry} from '../src/recipe-renderer.mjs';
import {drawRecipeThumbnail} from '../src/recipe-thumbnail.mjs';
import {makeShell} from '../src/subtemplate-model.mjs';

function recordingCanvas(width=100,height=80){
 const calls=[];
 const ctx=new Proxy({canvas:{width,height}}, {get:(o,k)=>k in o?o[k]:(...args)=>{calls.push([k,...args]);if(String(k).includes('Gradient'))return {addColorStop(){}}},set:(o,k,v)=>(o[k]=v,true)});
 return {calls,ctx,canvas:{width,height,clientWidth:width,clientHeight:height,getContext:()=>ctx}};
}
function event(role='burst'){
 return {id:'fixed-native-entry',role,effectiveLaunch:4,effectiveEnd:7,scale:1,dz:0,nativeEntry:{PositionOffset:{X:0,Y:0,Z:20000},RotationOffset:{Pitch:0,Yaw:0,Roll:0},EffectScale:{X:1,Y:1,Z:1}},preview:{heightM:100,diameterM:100,durationS:3,color:'#ffd276'}};
}
test('bloom has a filled round crown of stars and short tails, rather than a hollow ring',()=>{
 const e=event(),before=JSON.stringify(e),{ctx,calls}=recordingCanvas();
 drawRecipeEntry(ctx,e,4.8,[100,300],1);
 const stars=calls.filter(c=>c[0]==='arc');
 assert.ok(stars.length>70,'filled crown needs independently positioned stars');
 assert.ok(stars.filter(c=>Math.hypot(c[1]-100,c[2]-100)<30).length>8,'inner crown contains stars');
 assert.ok(calls.filter(c=>c[0]==='lineTo').length>70,'stars have short tails');
 assert.equal(JSON.stringify(e),before);
});
test('local delays and exact end still gate particles',()=>{
 const e=event(),{ctx,calls}=recordingCanvas();
 drawRecipeEntry(ctx,e,3.99,[0,0],1);drawRecipeEntry(ctx,e,7.01,[0,0],1);
 assert.equal(calls.length,0);
});
test('native entry vertical offset and parent height translate the entire bloom exactly once',()=>{
 const e=event(),a=recordingCanvas(),b=recordingCanvas();
 drawRecipeEntry(a.ctx,e,4.8,[100,300],1);drawRecipeEntry(b.ctx,{...e,dz:20},4.8,[100,300],1);
 const aa=a.calls.filter(c=>c[0]==='arc'),bb=b.calls.filter(c=>c[0]==='arc');
 assert.equal(aa.length,bb.length);assert.ok(aa.length>0);
 aa.forEach((c,i)=>{assert.equal(c[1],bb[i][1]);assert.ok(Math.abs(c[2]-bb[i][2]-20)<1e-8)});
});
test('one saved fan beam stays one beam and native Roll keeps its direction and height scale',()=>{
 const e=event('fan');e.nativeEntry.PositionOffset.Z=0;e.nativeEntry.RotationOffset.Roll=30;e.nativeEntry.EffectScale.Z=.5;
 const {ctx,calls}=recordingCanvas();drawRecipeEntry(ctx,e,5.5,[100,100],1);
 const heads=calls.filter(c=>c[0]==='arc'&&c[3]>=.8);
 assert.ok(heads.length>0);const head=heads.at(-1);
 assert.ok(head[1]<100&&head[2]<100);
 assert.ok(Math.abs((100-head[1])/Math.sin(Math.PI/6)-(100-head[2])/Math.cos(Math.PI/6))<1e-7);
 assert.ok(100-head[2]<=50*Math.cos(Math.PI/6));
});

test('a high small bloom fills its thumbnail while saved native geometry remains intact',()=>{
 const recipe={...makeShell({trailId:'Trail',burstId:'Ball',heightM:400,baseHeightM:400,diameterM:30}),key:'S@1'},template={id:'T'};
 const before=JSON.stringify(recipe),a=recordingCanvas(),b=recordingCanvas();
 drawRecipeThumbnail(a.canvas,template,recipe);drawRecipeThumbnail(b.canvas,template,recipe);
 const stars=a.calls.filter(c=>c[0]==='arc');assert.ok(stars.length>70);
 const xs=stars.map(c=>c[1]),ys=stars.map(c=>c[2]);
 assert.ok(Math.max(...xs)-Math.min(...xs)>35,'crop the bloom, not the 400m ascent');
 assert.ok(Math.min(...xs)>0&&Math.max(...xs)<100&&Math.min(...ys)>0&&Math.max(...ys)<80);
 assert.deepEqual(a.calls,b.calls);assert.equal(JSON.stringify(recipe),before);
});
test('a bloom with a short visible lifetime still has a thumbnail',()=>{
 const recipe={...makeShell({trailId:'Trail',burstId:'Ball',lifeS:.2}),key:'S@1'},a=recordingCanvas();
 drawRecipeThumbnail(a.canvas,{id:'T'},recipe);assert.ok(a.calls.some(c=>c[0]==='arc'));
});
test('large diagram framing keeps thin spark heads while magnifying the native fan path',()=>{const e=event('fan');e.nativeEntry.PositionOffset.Z=0;const a=recordingCanvas(),b=recordingCanvas();drawRecipeEntry(a.ctx,e,5,[0,0],1);drawRecipeEntry(b.ctx,e,5,[0,0],20);const small=a.calls.filter(c=>c[0]==='arc').at(-1),large=b.calls.filter(c=>c[0]==='arc').at(-1);assert(Math.abs(large[2]-small[2]*20)<1e-8);assert(large[3]<=1.2);assert(large[3]<small[3]*20)});
