import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import '../src/stage-renderer.js';
import {drawLaunchPoint} from '../src/stage-architecture.mjs';
const {doc}=JSON.parse(readFileSync(new URL('../public/data/score24-v05.json',import.meta.url),'utf8'));
function draw(event,time){
 const calls=[];const ctx=new Proxy({measureText:s=>({width:s.length*7}),canvas:{width:1200}}, {get:(o,k)=>k in o?o[k]:(...args)=>{calls.push([k,...args]);if(String(k).includes('Gradient'))return {addColorStop(){}}},set:(o,k,v)=>(o[k]=v,true)});
 const canvas={width:1200,height:600,getBoundingClientRect:()=>({width:1200,height:600}),getContext:()=>ctx};
 const result=globalThis.Stage17.render(canvas,{points:doc.points,stage:doc.stage,templates:doc.templateLibrary,events:[event],time,cameraMode:'full'});
 return {calls,result};
}
test('front comet reaches its 130m target after the full 1.8s ascent, then has visible afterglow',()=>{
 const e=doc.events.find(e=>e.templateId==='F_COMET');
 for(const delta of [1.8,2]){
  const {calls,result}=draw(e,e.effectiveLaunch+delta);
  const y=600-39-130*result.scale;
  assert.ok(calls.some(c=>c[0]==='createRadialGradient'&&Math.abs(c[2]-y)<4),'comet head still exists at planned height');
 }
});
test('launch triangle tip coincides with physical origin and its body stays below that plane',()=>{
 const ys=[];const ctx=new Proxy({}, {get:(_,k)=>(...a)=>{if(k==='moveTo'||k==='lineTo')ys.push(a[1])},set:()=>true});
 drawLaunchPoint(ctx,[200,100],{selected:false});
 assert.equal(Math.min(...ys),100);assert.ok(Math.max(...ys)>100);
});
test('fan vertical offset translates its entire flight once',()=>{
 const e=doc.events.find(e=>e.templateId==='G_GOLD'),a=draw(e,e.effectiveLaunch+.7),b=draw({...e,dz:20},e.effectiveLaunch+.7);
 const stars=x=>x.calls.filter(c=>c[0]==='createRadialGradient');
 const aa=stars(a),bb=stars(b);assert.ok(aa.length>0);assert.equal(aa.length,bb.length);
 aa.forEach((c,i)=>assert.ok(Math.abs((c[2]-bb[i][2])-20*a.result.scale)<1e-6));
});

test('fireworks draw after point ID plates, never underneath the markers',()=>{
 const e=doc.events.find(e=>e.templateId==='G_GOLD'),{calls}=draw(e,e.effectiveLaunch+.7);
 const lastId=calls.findLastIndex(c=>c[0]==='fillText'&&/^[PBF]\d+$/.test(c[1]));
 const firstParticle=calls.findIndex(c=>c[0]==='createRadialGradient');
 assert.ok(lastId>=0&&firstParticle>lastId);
});
test('all planned front effects stay below the 150m dam plane throughout playback',()=>{
 for(const t of doc.templateLibrary.filter(t=>t.zone==='front')){
  const e=doc.events.find(e=>e.templateId===t.id);if(!e)continue;
  for(let time=e.effectiveLaunch;time<=e.effectiveEnd;time+=.2){
   const {calls,result}=draw(e,time),crest=600-39-150*result.scale;
   for(const c of calls.filter(c=>c[0]==='createRadialGradient'))assert.ok(c[2]>=crest,`${t.id} at ${time} exceeds dam crest`);
  }
 }
});
