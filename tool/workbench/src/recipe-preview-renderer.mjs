import {previewMotion,previewScale,heightTicks} from './recipe-preview-model.mjs';
const number=v=>Number(v.toPrecision(4)).toString();
export function drawRecipeReference(ctx,g,w,h){
 ctx.save();ctx.lineWidth=1;ctx.font='11px Microsoft YaHei';ctx.textAlign='left';
 for(const tick of heightTicks(g,h)){
  ctx.strokeStyle=tick.metres===0?'#50605e':'#253637';ctx.beginPath();ctx.moveTo(48,tick.y);ctx.lineTo(w-24,tick.y);ctx.stroke();
  ctx.fillStyle='#a6b6b1';ctx.fillText(number(tick.metres)+' m',8,tick.y-5);
 }
 ctx.strokeStyle='#50605e';ctx.beginPath();ctx.moveTo(24,g.baseline);ctx.lineTo(w-24,g.baseline);ctx.stroke();
 ctx.fillStyle='#a6b6b1';ctx.font='12px Microsoft YaHei';ctx.textAlign='center';ctx.fillText('发射原点 · 0 m',g.origin[0],g.baseline+25);
 ctx.fillStyle='#a7d9c8';ctx.beginPath();ctx.arc(...g.origin,4,0,Math.PI*2);ctx.fill();
 const scale=previewScale(g.unit,w),x=24,y=h-19;
 ctx.strokeStyle='#a6b6b1';ctx.beginPath();ctx.moveTo(x,y-4);ctx.lineTo(x,y);ctx.lineTo(x+scale.pixels,y);ctx.lineTo(x+scale.pixels,y-4);ctx.stroke();
 ctx.textAlign='left';ctx.font='11px Microsoft YaHei';ctx.fillStyle='#a6b6b1';ctx.fillText(number(scale.metres)+' m',x,y+14);
 ctx.textAlign='right';ctx.fillText('名义尺度 · 局部坐标',w-16,h-12);ctx.restore();return scale;
}
export function drawRecipeStructure(ctx,g,recipe,time,row){
 const hits=[];ctx.save();ctx.textAlign='center';
 if(recipe.category==='fan'){
  ctx.strokeStyle='#526f63';ctx.lineWidth=1;ctx.setLineDash([4,5]);ctx.beginPath();
  [...g.rows].sort((a,b)=>a.end[0]-b.end[0]).forEach((r,i)=>i?ctx.lineTo(...r.end):ctx.moveTo(...r.end));ctx.stroke();ctx.setLineDash([]);
 }
 for(const r of g.rows){
  const selected=r.index===row;ctx.strokeStyle=selected?'#85958f':'#65736f';ctx.globalAlpha=selected?1:.7;ctx.lineWidth=selected?1.5:1;
  ctx.beginPath();
  if(r.entry.role==='burst'){
   ctx.arc(...r.end,Math.max(2,r.radius),0,Math.PI*2);ctx.stroke();ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(...g.origin);ctx.lineTo(...r.end);ctx.stroke();ctx.setLineDash([]);
  }else{ctx.moveTo(...r.start);ctx.lineTo(...r.end);ctx.stroke()}
  ctx.globalAlpha=1;ctx.fillStyle=selected?'#87d9bb':'#748e83';ctx.beginPath();ctx.arc(...r.end,selected?4:2.5,0,Math.PI*2);ctx.fill();
  const label=[r.end[0],r.end[1]-12-(r.index%2)*10];ctx.fillStyle=selected?'#87d9bb':'#c0ccc6';ctx.font=selected?'bold 13px Microsoft YaHei':'12px Microsoft YaHei';
  if(recipe.entries.length<=24||selected||r.index%Math.ceil(recipe.entries.length/20)===0)ctx.fillText(r.index+1,...label);
  hits.push({i:r.index,x:r.end[0],y:r.end[1],label});
  const motion=previewMotion(r,time);if(!motion)continue;
  ctx.strokeStyle='#36cfa7';ctx.fillStyle='#36cfa7';ctx.lineWidth=selected?3:2.5;ctx.globalAlpha=motion.alpha;ctx.lineCap='round';ctx.beginPath();
  if(motion.kind==='ring'){ctx.arc(...motion.head,Math.max(.5,motion.radius),0,Math.PI*2);ctx.stroke()}
  else{ctx.moveTo(...motion.tail);ctx.lineTo(...motion.head);ctx.stroke();ctx.beginPath();ctx.arc(...motion.head,selected?4:3,0,Math.PI*2);ctx.fill()}
  ctx.globalAlpha=1;
 }
 ctx.restore();return hits;
}
