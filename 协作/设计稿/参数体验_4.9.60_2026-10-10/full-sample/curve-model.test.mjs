import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCurve,serialize,at,movePoint,validatePoint,createHistory} from './curve-model.mjs';
test('与生产曲线解析/插值兼容，空=1、时间夹0–1、倍率不限定非负',()=>{
 assert.equal(parseCurve(''),null);assert.equal(at(null,.3),1);
 assert.deepEqual(parseCurve('1:0，0:1;.7:1'),[[0,1],[.7,1],[1,0]]);
 assert.deepEqual(parseCurve('-1:-2,2:3'),[[0,-2],[1,3]]);
 assert.equal(at([[.2,2],[.8,0]],0),2);assert.ok(Math.abs(at([[.2,2],[.8,0]],.5)-1)<1e-12);
});
test('中点精确编辑与拖拽不改曲线点次序，端点可编辑',()=>{
 const p=[[0,1],[.7,1],[1,0]];
 assert.equal(serialize(movePoint(p,1,.6,1.4)),'0:1, 0.6:1.4, 1:0');
 assert.equal(movePoint(p,1,1.4,-2)[1][0],.999);
 assert.equal(movePoint(p,0,.1,-1)[0][0],.1);assert.deepEqual(p,[[0,1],[.7,1],[1,0]]);
});
test('数字草稿不可空、不可非有限、时间不可越界或重合；倍率无伪上限',()=>{
 const p=[[0,1],[.7,1],[1,0]];
 for(const [x,y] of [['',1],[.6,''],['abc',1],[.6,'Infinity'],[-.1,1],[1.1,1],[0,2]])assert.ok(validatePoint(p,1,x,y));
 assert.equal(validatePoint(p,1,.6,-20),'');assert.equal(validatePoint(p,1,.6,120),'');
 assert.equal(serialize([[0,1],[.1234567,1.234567],[1,0]]),'0:1, 0.1234567:1.234567, 1:0');
 const dense=movePoint([[.7,1],[.70001,2],[.70002,1]],1,0,2);assert.ok(dense[1][0]>.7&&dense[1][0]<.70002);
});
test('拖动预览不新增撤销，最后提交一步，撤销/重做精确回滚',()=>{
 const h=createHistory({curve:'0:1, 0.7:1, 1:0'});
 const next={curve:'0:1, 0.6:1.4, 1:0'};
 h.commit(next);assert.equal(h.state.curve,next.curve);h.undo();assert.equal(h.state.curve,'0:1, 0.7:1, 1:0');h.redo();assert.equal(h.state.curve,next.curve);
 h.commit(next);assert.equal(h.depth,1);
 h.undo();h.commit({curve:''});assert.equal(h.canRedo,false);
});
