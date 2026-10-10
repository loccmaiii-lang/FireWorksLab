import test from 'node:test';
import assert from 'node:assert/strict';
import {pointerTime,musicSelection} from '../src/navigation.mjs';
import {cameraFrame} from '../src/stage-camera.mjs';
test('scrubbing uses plot coordinates, clamps outside capture, and respects zoomed ranges',()=>{
 assert.equal(pointerTime(350,{left:100,width:1000},[40,60]),45);
 assert.equal(pointerTime(-10,{left:100,width:1000},[40,60]),40);
 assert.equal(pointerTime(1500,{left:100,width:1000},[40,60]),60);
});
test('music selection seeks start and exits clip playback; local view follows the selected section',()=>{
 const section={id:'s2',start:20,end:35};
 assert.deepEqual(musicSelection(section,[0,220],220),{time:20,scope:'show',range:[0,220],zoom:'all'});
 assert.deepEqual(musicSelection(section,[50,60],220),{time:20,scope:'show',range:[20,35],zoom:'section'});
});
test('dam closeup is larger while keeping uniform scale and a centred ground reference',()=>{
 const points=[{xM:-375},{xM:375}],full=cameraFrame(1000,400,points,'full',1),dam=cameraFrame(1000,400,points,'dam',1);
 assert.ok(dam.unit>full.unit*2);assert.equal(dam.center,0);
 assert.equal(cameraFrame(1000,400,points,'dam',2).unit,dam.unit*2);
 assert.equal(cameraFrame(1000,400,points,'dam',10).unit,dam.unit*3);
});
