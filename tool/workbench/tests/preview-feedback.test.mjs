import test from 'node:test';
import assert from 'node:assert/strict';
import {recipeGeometry} from '../src/recipe-geometry.mjs';
import {previewMotion,previewScale,heightTicks} from '../src/recipe-preview-model.mjs';
import {drawRecipeStructure} from '../src/recipe-preview-renderer.mjs';
const entry=(role='fan')=>({role,native:{LocalTimeOffset:.37,PositionOffset:{X:0,Y:0,Z:0},RotationOffset:{Roll:30},EffectScale:{X:1,Y:1,Z:1}},preview:{heightM:100,diameterM:20,durationS:2}});
test('moving stroke honours original delay, advances along the full guide and expires',()=>{
 const recipe={category:'fan',entries:[entry()]},original=structuredClone(recipe),r=recipeGeometry(recipe,700,450).rows[0];
 assert.equal(previewMotion(r,.36),null);
 const a=previewMotion(r,.77),b=previewMotion(r,1.17);
 assert.equal(a.kind,'segment');assert.ok(b.head[1]<a.head[1]);
 assert.ok(Math.hypot(...a.head.map((v,i)=>v-a.tail[i]))>0);
 assert.ok(a.tail[1]<=r.start[1]&&a.tail[1]>a.head[1]);
 assert.equal(previewMotion(r,2.38),null);
 assert.deepEqual(previewMotion(r,.77),a);assert.deepEqual(recipe,original);
});
test('ball grows within its native diameter and delay, with no invented launch time',()=>{
 const r=recipeGeometry({entries:[entry('burst')]},700,450).rows[0];
 assert.equal(previewMotion(r,.36),null);
 const a=previewMotion(r,.87),b=previewMotion(r,1.87);
 assert.equal(a.kind,'ring');assert.ok(a.radius>0&&b.radius>a.radius&&b.radius<=r.radius);
 assert.deepEqual(a.head,r.end);assert.equal(previewMotion(r,2.38),null);
});
test('ruler and height ticks follow the actual projection at all viewport scales',()=>{
 for(const width of [240,700,1500])for(const unit of [.02,.3,3,40]){
  const s=previewScale(unit,width);assert.equal(s.pixels,s.metres*unit);assert.ok(s.pixels>0&&s.pixels<=Math.max(48,Math.min(140,width-100)));
  const g={unit,baseline:360};for(const t of heightTicks(g,420))assert.equal(t.y,g.baseline-t.metres*unit);
 }
});
test('active fan draws a coloured segment as well as its gray guide and numbered target',()=>{
 const strokes=[],ctx={beginPath(){this.path=[]},moveTo(...p){this.path.push(p)},lineTo(...p){this.path.push(p)},stroke(){strokes.push({color:this.strokeStyle,path:this.path})},arc(){},fill(){},fillText(){},setLineDash(){},save(){},restore(){}};
 const recipe={category:'fan',entries:[entry()]},g=recipeGeometry(recipe,700,450);
 const hits=drawRecipeStructure(ctx,g,recipe,.87,0);
 assert.equal(hits.length,1);assert.ok(strokes.some(s=>s.color==='#36cfa7'&&s.path.length===2&&s.path[0][1]!==s.path[1][1]));
 assert.ok(strokes.some(s=>s.color==='#85958f'));
});
