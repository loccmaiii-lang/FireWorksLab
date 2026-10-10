import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutPointLabels} from '../src/point-labels.mjs';
function points(unit){return [...Array.from({length:17},(_,i)=>({id:i%2?`B${(i+1)/2}`:`P${i/2+1}`,x:450+(i-8)*50*unit,y:230})),...Array.from({length:7},(_,i)=>({id:`F${i+1}`,x:450+(i-3)*23*unit,y:230+100*unit}))]}
test('dense front IDs have breathing room and no labels overlap across groups',()=>{
 const labels=layoutPointLabels(points(.8),900,400,'F4');assert.equal(labels.length,24);
 for(const a of labels)for(const b of labels)if(a.id!==b.id)assert.ok(Math.abs(a.x-b.x)>=32||Math.abs(a.y-b.y)>=24,`${a.id}/${b.id}`);
 const front=labels.filter(p=>p.id.startsWith('F'));assert.ok(front[1].x-front[0].x>=34);
});
test('zoomed-out or short canvases prioritize the selected ID instead of stacking illegible labels',()=>{
 assert.deepEqual(layoutPointLabels(points(.2),900,220,'P4').map(p=>p.id),['P4']);
 assert.deepEqual(layoutPointLabels(points(.8),900,140,'F4').map(p=>p.id),['F4']);
});
