import test from 'node:test';import assert from 'node:assert/strict';
import {createWorkspaceTransition} from '../src/workspace-transition.mjs';
test('all navigation commits immediately, including unsupported browsers and reduced motion',()=>{
 let value=0;createWorkspaceTransition({},fn=>fn(),()=>false)(()=>value++);assert.equal(value,1);
 createWorkspaceTransition({defaultView:{requestAnimationFrame(){throw Error('must not animate')}}},fn=>fn(),()=>true)(()=>value++);assert.equal(value,2);
});
test('rapid navigation cancels old motion without delaying or restoring an earlier page',()=>{
 const frames=[],cancelled=[];let value='show',animated=0;
 const node={offsetParent:{},animate(){animated++;return {cancel(){cancelled.push(animated)}}}};
 const doc={defaultView:{requestAnimationFrame(fn){frames.push(fn)}},querySelectorAll(){return [node]}};
 const navigate=createWorkspaceTransition(doc,fn=>fn(),()=>false);
 navigate(()=>value='flower');assert.equal(value,'flower');navigate(()=>value='pattern');assert.equal(value,'pattern');
 frames[0]();assert.equal(animated,0);frames[1]();assert.equal(animated,1);
 navigate.cancel();assert.equal(value,'pattern');assert.equal(cancelled.length,1);
});
