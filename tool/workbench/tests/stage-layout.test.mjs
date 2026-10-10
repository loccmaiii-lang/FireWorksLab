import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stageLayout,unfoldPoint} from '../src/stage-architecture.mjs';
const {doc}=JSON.parse(readFileSync(new URL('../public/data/score24-v05.json',import.meta.url),'utf8'));
test('stage elevation preserves saved dimensions and mirrors structural bays about launch centre',()=>{
 const before=JSON.stringify(doc),g=stageLayout(doc.stage,doc.points);
 assert.equal(g.center,0);assert.equal(g.height/g.platformHeight,3);assert.equal(g.platformWidth,200);
 assert.deepEqual(g.columns,[-400,-250,-100,100,250,400]);
 for(const values of [g.columns,g.ribs])for(const x of values)assert.ok(values.some(y=>Math.abs(x+y-2*g.center)<1e-8));
 for(const p of doc.points)assert.ok(doc.points.some(q=>q.zone===p.zone&&Math.abs(p.x+q.x)<1e-8&&p.y===q.y&&p.z===q.z));
 assert.equal(JSON.stringify(doc),before);
});
test('unfolded dam shows five true lengths and 50 metre launch intervals without altering plan coordinates',()=>{
 const before=JSON.stringify(doc),g=stageLayout(doc.stage,doc.points);
 assert.deepEqual(g.columns.slice(1).map((x,i)=>x-g.columns[i]),[150,150,200,150,150]);
 const unfolded=doc.points.map(p=>unfoldPoint(p,doc.stage));
 const dam=unfolded.filter(p=>p.zone==='dam');
 dam.forEach((p,i)=>assert.ok(Math.abs(p.x-(-400+i*50))<.02));
 assert.deepEqual(unfolded.filter(p=>p.zone==='front'),doc.points.filter(p=>p.zone==='front'));
 assert.equal(JSON.stringify(doc),before);
});
