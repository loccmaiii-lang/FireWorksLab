import {shell,rgb,line,dot,glow,random} from './firework-painter.mjs';

// Current saved entries determine origins, nominal sizes, launch times and lifetime.
// Only the star/short-tail appearance comes from the previous Stage17 preview.
export function drawRecipeEntry(ctx,e,time,origin,unit,opacity=1){
 const n=e.nativeEntry,p=e.preview,age=time-e.effectiveLaunch;
 if(age<0||time>e.effectiveEnd||age>p.durationS)return;
 const scale=e.scale??1,color=rgb(p.color),position={
  xM:n.PositionOffset.Y/100*scale,
  zM:n.PositionOffset.Z/100*scale+(e.dz||0)
 };
 const project=(x,z)=>[origin[0]+x*unit,origin[1]-z*unit];
 ctx.save();ctx.globalCompositeOperation='lighter';
 if(e.role==='burst'){
  const golden=color[0]>color[2]+30,silver=Math.max(...color)-Math.min(...color)<45;
  shell(ctx,{
   id:e.id,p:position,t:{color,diameter:p.diameterM,golden,silver},
   start:e.effectiveLaunch,burst:e.effectiveLaunch,flight:0,rise:0,angle:0,
   size:Math.max(n.EffectScale.X,n.EffectScale.Y,n.EffectScale.Z)*scale,life:p.durationS
  },time,project,unit,opacity);
 }else{
  // One expanded native entry is one beam. No template fan count or parent delay is added again.
  const a=n.RotationOffset.Roll*Math.PI/180,height=p.heightM*n.EffectScale.Z*scale*unit;
  const base=project(position.xM,position.zM),fade=Math.pow(Math.max(0,1-age/p.durationS),.57)*opacity;
  // Frame magnification changes the trajectory, not the screen width of a spark.
  const inkUnit=Math.min(unit,1.2);
  const at=t=>{const progress=1-Math.pow(1-Math.max(0,Math.min(1,t/p.durationS)),1.65);return [base[0]-Math.sin(a)*height*progress,base[1]-Math.cos(a)*height*progress]};
  const tailAge=Math.max(0,age-(e.role==='fan'?.65:.28)),coords=Array.from({length:8},(_,i)=>at(tailAge+(age-tailAge)*i/7));
  if(e.role==='fan')line(ctx,coords,color,fade*.21,Math.max(1.8,inkUnit*4));
  line(ctx,coords,color,fade*.78,Math.max(.7,inkUnit*1.4));
  for(let i=0;i<12;i++){
   const offset=random(e.id,i),sample=at(Math.max(0,age-offset*.45));
   dot(ctx,sample[0]+(random(e.id,i+90)-.5)*inkUnit*3*offset,sample[1]+offset*offset*inkUnit*5,.45+random(e.id,i+40)*.3,color,fade*(1-offset)*.65);
  }
  const head=at(age);glow(ctx,head[0],head[1],Math.max(2,inkUnit*2),color,fade*.25);
  dot(ctx,head[0],head[1],Math.max(.8,inkUnit),color,fade);
 }
 ctx.restore();
}
