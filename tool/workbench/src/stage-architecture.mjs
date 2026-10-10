// Structural sketch from the user's yellow outline. Coordinates remain in metres.
// Architectural details are illustrative; launch coordinates come from the score.
const palette={edge:'#79848d',crest:'#929ca4',rib:'#606d77',detail:'#485761',fill:'#1b262e',front:'#87929b'};
function path(ctx,project,points,color=palette.edge,width=1,fill){
 ctx.beginPath();points.forEach(([x,z],i)=>{const p=project(x,z);i?ctx.lineTo(...p):ctx.moveTo(...p)});
 if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill()}
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
}
function unfoldedArc(stage={}){
 const vertices=stage.arcVertices||[{x:-374.79,y:113.82},{x:-244.89,y:38.82},{x:-100,y:0},{x:100,y:0},{x:244.89,y:38.82},{x:374.79,y:113.82}];
 // Saved plan vertices are rounded to centimetres; design segment dimensions are whole metres.
 const lengths=vertices.slice(1).map((p,i)=>Math.round(Math.hypot(p.x-vertices[i].x,p.y-vertices[i].y)));
 const total=lengths.reduce((a,b)=>a+b,0),columns=[-total/2];
 lengths.forEach(n=>columns.push(columns.at(-1)+n));
 return {vertices,columns};
}
export function unfoldPoint(point,stage={}){
 if(point.zone==='front')return {...point};
 const {vertices,columns}=unfoldedArc(stage),x=point.xM??point.x;
 let i=vertices.findIndex((p,j)=>j<vertices.length-1&&x<=vertices[j+1].x);if(i<0)i=vertices.length-2;
 const f=(x-vertices[i].x)/(vertices[i+1].x-vertices[i].x),displayX=columns[i]+f*(columns[i+1]-columns[i]);
 return 'xM' in point?{...point,xM:displayX}:{...point,x:displayX};
}
export function stageLayout(stage={},points=[]){
 const {columns}=unfoldedArc(stage);
 return {center:0,height:stage.damHeight??150,platformHeight:stage.platformHeight??50,platformWidth:stage.platformWidth??200,platformDepth:stage.platformDepth??50,columns,ribs:[]};
}
export function drawDamFront(ctx,project,unit,{front=true,width=ctx.canvas.width,stage={},points=[]}={}){
 ctx.save();
 const g=stageLayout(stage,points),c=g.center,h=g.height;
 const top=project(c,h)[1],ground=project(c,0)[1];
 ctx.fillStyle='#202b34';ctx.fillRect(0,top,width,ground-top);
 for(const z of [h,h-4,0,3])path(ctx,(x,y)=>[x,y],[[0,project(c,z)[1]],[width,project(c,z)[1]]],palette.edge,1.2);
 for(const x of g.columns){
  path(ctx,project,[[x-8,0],[x-8,h+5],[x+8,h+5],[x+8,0],[x-8,0]],palette.edge,1.4,'#202b34');
  path(ctx,project,[[x-8,h-4],[x+8,h-4]],palette.rib,.8);
 }
 if(front){
  const l=c-g.platformWidth/2,r=c+g.platformWidth/2;
  path(ctx,project,[[l,0],[l,g.platformHeight],[r,g.platformHeight],[r,0],[l,0]],palette.front,1.3,'#24313a');
  path(ctx,project,[[l+3,3],[l+3,g.platformHeight-3],[r-3,g.platformHeight-3],[r-3,3]],palette.rib,.85);
  const xy=project(r,g.platformHeight*.3);ctx.fillStyle='#9caab4';ctx.textAlign='left';ctx.font='11px "Segoe UI",sans-serif';if(unit>=.48)ctx.fillText(`前台 ${g.platformHeight} m`,Math.max(xy[0]+28,project(c,0)[0]+136),xy[1]);
 }
 // Explicit segment dimensions identify this view as an unfolded elevation.
 ctx.textAlign='center';ctx.font='11px "Segoe UI",sans-serif';ctx.fillStyle='#82919d';
 for(let i=1;unit>=.85&&i<g.columns.length;i++){
  const xy=project((g.columns[i-1]+g.columns[i])/2,h);
  ctx.fillText(`${g.columns[i]-g.columns[i-1]} m`,xy[0],xy[1]+78);
 }
 ctx.restore();
}
export function drawDamPlan(ctx,project,points,stage={}){
 ctx.save();
 const dam=points.filter(p=>p.zone!=='front').sort((a,b)=>a.xM-b.xM);
 if(dam.length){
  const edge=dam.map(p=>project({...p,yM:p.yM+12}));
  const back=dam.slice().reverse().map(p=>project({...p,yM:p.yM-12}));
  const pixel=(x,y)=>[x,y];
  path(ctx,pixel,[...edge,...back,edge[0]],palette.edge,1,'#18272d');
  for(const p of dam.filter(p=>p.id.startsWith('P')))path(ctx,pixel,[project({...p,yM:p.yM+12}),project({...p,yM:p.yM-12})],palette.detail,.8);
 }
 const front=points.filter(p=>p.zone==='front');
 if(front.length){const y=front.reduce((a,p)=>a+p.yM,0)/front.length;
  const g=stageLayout(stage,points),l=g.center-g.platformWidth/2,r=g.center+g.platformWidth/2;
  const pts=[[l,y+g.platformDepth*.3],[r,y+g.platformDepth*.3],[r,y-g.platformDepth*.7],[l,y-g.platformDepth*.7],[l,y+g.platformDepth*.3]].map(([xM,yM])=>project({xM,yM}));
  path(ctx,(x,y)=>[x,y],pts,palette.front,1,'#18272d');
 }
 ctx.restore();
}
export function drawLaunchPoint(ctx,xy,{selected,playing,front,fan}){
 const color=selected?'#a4f5d1':front?'#a9cfea':playing?'#eef3df':'#c3d5d5';
 const half=selected?7:6,tip=selected?13:11;
 ctx.save();ctx.lineWidth=1.2;ctx.strokeStyle=selected?'#dcffee':'#16262d';ctx.fillStyle=color;
 ctx.beginPath();ctx.moveTo(xy[0],xy[1]);ctx.lineTo(xy[0]+half,xy[1]+tip);ctx.lineTo(xy[0]-half,xy[1]+tip);ctx.closePath();ctx.fill();ctx.stroke();
 if(selected){ctx.strokeStyle='#8edbbb';ctx.beginPath();ctx.arc(xy[0],xy[1]+7,12,0,Math.PI*2);ctx.stroke()}
 ctx.restore();
}

export function drawPointLabel(ctx,id,x,y,selected,color='#b4c6c9'){
 ctx.save();ctx.font=`${selected?'600 ':''}${selected?14:13}px "Segoe UI",sans-serif`;ctx.textAlign='center';
 const width=ctx.measureText(id).width+6,box={left:x-width/2,top:y-14,width,height:20};
 ctx.fillStyle=selected?'#244f41':'#14212be8';ctx.fillRect(box.left,box.top,box.width,box.height);
 if(selected){ctx.fillStyle='#244f41';ctx.fillRect(box.left,box.top,box.width,box.height);ctx.strokeStyle='#91e3bf';ctx.lineWidth=1;ctx.strokeRect(box.left,box.top,box.width,box.height)}
 ctx.fillStyle=selected?'#e3fff2':color;ctx.fillText(id,x,y);ctx.restore();return box;
}
