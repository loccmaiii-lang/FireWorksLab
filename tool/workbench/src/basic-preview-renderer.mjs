import {staticBaseRecipe} from './basic-template-model.mjs';
import {recipeGeometry} from './recipe-geometry.mjs';
import {drawRecipeReference} from './recipe-preview-renderer.mjs';
export const comparisonLabel=s=>s.role==='burst'?`Ø${s.diameterM.toFixed(0)}m · 中心${s.z.toFixed(1)}m`:`单束长${s.lengthM.toFixed(1)}m · 起点${s.baseZ}m`;

export function drawBasicPreview(ctx,w,h,{resource,specs,selectedId,view,points=[]}){
 ctx.fillStyle='#101a1b';ctx.fillRect(0,0,w,h);if(w<100||h<110)return;
 ctx.font='12px Microsoft YaHei';ctx.textAlign='left';
 if(view==='raw'){
  if(resource.role==='unknown'){ctx.fillStyle='#bac6c5';ctx.fillText('资源类型待确认，不生成推测造型',24,40);return;}
  const g=recipeGeometry(staticBaseRecipe(resource),w,h);drawRecipeReference(ctx,g,w,h);
  const row=g.rows[0];ctx.strokeStyle='#86e0c5';ctx.lineWidth=2;ctx.beginPath();
  if(resource.role==='burst')ctx.arc(...row.end,Math.max(0,row.radius),0,Math.PI*2);else{ctx.moveTo(...row.start);ctx.lineTo(...row.end);}ctx.stroke();
  ctx.fillStyle='#bac6c5';ctx.fillText(resource.role==='burst'?'原地球花 · 无升空位移':'单束垂直向上 · 无扫射编排',24,28);return;
 }
 const selected=specs.find(s=>s.id===selectedId);
 // 相近尺度共用轮廓；选中用途用精确高度绘制，保留整体轻微随机数据。
 const rows=[];for(const s of specs){let group=rows.find(g=>g.spec.zone===s.zone&&g.spec.role===s.role&&Math.abs(g.spec.diameterM-s.diameterM)<.01&&Math.abs(g.spec.lengthM-s.lengthM)<.01&&Math.abs(g.spec.z-s.z)<10);if(!group){group={spec:s,ids:[]};rows.push(group);}group.ids.push(s.id);}
 for(const group of rows){const active=specs.find(s=>s.id===selectedId&&group.ids.includes(s.id));if(active)group.spec=active;}
 const balls=rows.filter(g=>g.spec.role==='burst'&&g.spec.zone!=='front'),front=rows.filter(g=>g.spec.zone==='front'),strands=rows.filter(g=>g.spec.role!=='burst'&&g.spec.zone!=='front');
 const maxZ=Math.max(675,...specs.map(s=>s.z+s.diameterM/2+35)),unit=Math.min((w-64)/1200,(h-100)/maxZ),ox=w/2,oy=(h-60+maxZ*unit)/2+18,x=v=>ox+v*unit,y=v=>oy-v*unit;
 ctx.lineWidth=1;for(let z=0;z<=maxZ-30;z+=150){ctx.strokeStyle='#263d42';ctx.beginPath();ctx.moveTo(24,y(z));ctx.lineTo(w-24,y(z));ctx.stroke();ctx.fillStyle='#8fa7aa';ctx.fillText(z+'m',5,y(z)-4);}
 ctx.fillStyle='#1e3036';ctx.strokeStyle='#829297';ctx.lineWidth=1.5;ctx.fillRect(x(-400),y(150),800*unit,150*unit);ctx.strokeRect(x(-400),y(150),800*unit,150*unit);
 for(const p of [-250,-100,100,250]){ctx.beginPath();ctx.moveTo(x(p),y(150));ctx.lineTo(x(p),y(0));ctx.stroke();}
 ctx.strokeRect(x(-100),y(50),200*unit,50*unit);ctx.fillStyle='#a1b5b9';ctx.fillText('坝顶150m',x(400)+8,y(150)+16);ctx.fillText('前台50m',x(100)+8,y(50)+15);
 for(const p of points){ctx.fillStyle=p.zone==='front'?'#a4d2e8':'#b6c7cb';ctx.beginPath();ctx.moveTo(x(p.x),y(p.z)-6);ctx.lineTo(x(p.x)-3,y(p.z));ctx.lineTo(x(p.x)+3,y(p.z));ctx.closePath();ctx.fill();}
 const position=(group,list,min,max)=>list.length===1?(min+max)/2:min+list.indexOf(group)/(list.length-1)*(max-min);
 for(const group of rows){const s=group.spec,sel=group.ids.includes(selectedId),px=s.zone==='front'?position(group,front,-75,75):s.role==='burst'?position(group,balls,-420,250):position(group,strands,310,500);
  ctx.strokeStyle=sel?'#83dfc0':'#5a727b';ctx.fillStyle=sel?'#83dfc023':'#5a727b0e';ctx.lineWidth=sel?2.5:1.2;
  if(s.role==='burst'){ctx.beginPath();ctx.arc(x(px),y(s.z),s.diameterM/2*unit,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#526367';ctx.beginPath();ctx.moveTo(x(px),y(s.baseZ));ctx.lineTo(x(px),y(s.z));ctx.stroke();}
  else {ctx.beginPath();ctx.moveTo(x(px),y(s.baseZ));ctx.lineTo(x(px),y(s.baseZ+s.lengthM));ctx.stroke();}
  if(s.role==='burst'||sel){ctx.fillStyle=sel?'#83dfc0':'#9eb6bc';ctx.textAlign='center';ctx.font='11px Microsoft YaHei';const top=y(s.z+s.diameterM/2);ctx.fillText(s.role==='burst'?`Ø${s.diameterM.toFixed(0)}m`:`${s.lengthM.toFixed(0)}m单束`,x(px),top-24);ctx.fillText(`中心${s.z.toFixed(1)}m`,x(px),top-9);}
 }
 ctx.textAlign='left';ctx.fillStyle='#83dfc0';ctx.font='12px Microsoft YaHei';ctx.fillText(selected?'选中：'+selected.name:'当前资源尚无关联花型规格',24,26,w-48);
 ctx.strokeStyle='#a7b5b7';ctx.beginPath();ctx.moveTo(24,h-22);ctx.lineTo(24+100*unit,h-22);ctx.stroke();ctx.fillStyle='#a7b5b7';ctx.fillText('100m',24,h-29);ctx.textAlign='right';ctx.fillText('大坝宽800m · 同一米尺 · 设计参照',w-24,h-17);
}
