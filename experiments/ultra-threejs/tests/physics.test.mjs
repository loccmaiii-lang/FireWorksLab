import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack, sparkLifetime, sparkBirth, sparkMotion } from '../src/tracks.js';
import { defaultsFor, Sim, H_STEP, derive } from '../src/generated/core.js';

test('same-seed trajectories preserve Ultra 480 Hz integration',()=>{
  const P={...defaultsFor('kiku').P,stars:12,duration:.5,seed:42,engine:'gpu'};
  const a=buildTrack(P),b=buildTrack(P);
  assert.deepEqual(a.positions,b.positions);assert.equal(a.dt,1/240);
  const sim=new Sim(P);for(let i=0;i<120;i++)sim.step(H_STEP);
  const offset=60*4;assert.ok(Math.abs(a.positions[offset]-sim.all[0].x)<1e-5);
  assert.ok(Math.abs(a.positions[offset+1]-sim.all[0].y)<1e-5);
  assert.equal(a.info[2],sim.all[0].rate);
});
test('delayed subflowers retain independent birth times and histories',()=>{
  const P={...defaultsFor('senrin').P,stars:4,subStars:6,subDelay:.3,subJit:0,duration:1,engine:'gpu'};
  const a=buildTrack(P);
  assert.ok(a.nStars>P.stars);
  const births=Array.from({length:a.nStars},(_,i)=>a.info[i*4]);
  assert.ok(births.slice(P.stars).every(t=>t>=.29&&t<.4));
  assert.ok(Array.from(a.positions).every(Number.isFinite));
});
test('tail particles die individually, independently of parent star end',()=>{
  const lives=Array.from({length:100},(_,id)=>sparkLifetime(id,141,2));
  assert.ok(new Set(lives).size>90);
  const times=[1,1.5,2,2.5,3],alive=times.map(t=>lives.filter(l=>l>t).length);
  assert.ok(alive.every((n,i)=>i===0||n<=alive[i-1]));
  assert.ok(alive.every(n=>n>0&&n<100));
  const born=sparkBirth(150,[0,3,100,-10]);
  assert.ok(born>1.5&&born<3);
  assert.ok(lives.some(life=>born+life>3),'old sparks may remain after parent emission ends');
});
test('zero drag limit is ballistic, not division by zero',()=>{
  assert.deepEqual(sparkMotion([0,0],[2,3],1,0,0),[2,3]);
  const p=sparkMotion([0,0],[2,3],1,2,1);
  assert.ok(p.every(Number.isFinite));assert.ok(p[0]<2&&p[1]<3);
});
test('V5 derived timeline preserves the rise and 3.2 second fade interval',()=>{
  const P=defaultsFor('trailS').P;derive(P);
  assert.ok(P.duration>3.2);assert.equal(P.form,'trail');
});
