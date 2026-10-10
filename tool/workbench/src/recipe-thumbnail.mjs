import {previewSubTemplates} from './subtemplate-model.mjs';
import {drawRecipeEntry} from './recipe-renderer.mjs';

// Thumbnail framing is independent of metre-scaled stage/editor framing.
// Keep fixed native offsets/delays/scale; crop the flower, not the entire ascent.
export function drawRecipeThumbnail(canvas,template,recipe){
 const w=canvas.clientWidth||50,h=canvas.clientHeight||40,dpr=2;
 canvas.width=w*dpr;canvas.height=h*dpr;
 const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.fillStyle='#111c24';ctx.fillRect(0,0,w,h);
 const doc={templateLibrary:[{id:template.id,subTemplateRef:recipe.key}],subTemplateLibrary:[recipe]};
 const events=previewSubTemplates(doc,[{id:'thumb',templateId:template.id,effectiveLaunch:0}]).events;
 const bursts=events.filter(e=>e.role==='burst'),selected=bursts.length?bursts:events;
 const first=selected.reduce((a,b)=>a.effectiveLaunch<=b.effectiveLaunch?a:b);
 const time=first.effectiveLaunch+(bursts.length?Math.min(.8,first.preview.durationS*.45):first.preview.durationS*.76);
 const bounds=[];
 for(const e of selected){
  if(time<e.effectiveLaunch||time>e.effectiveEnd)continue;
  const n=e.nativeEntry,p=e.preview,x=n.PositionOffset.Y/100,z=n.PositionOffset.Z/100;
  if(e.role==='burst'){
   const r=p.diameterM*Math.max(n.EffectScale.X,n.EffectScale.Y,n.EffectScale.Z)/2,fall=4.1*(time-e.effectiveLaunch)**2;
   bounds.push([x-r,z-fall-r],[x+r,z+r]);
  }else{
   const a=n.RotationOffset.Roll*Math.PI/180,length=p.heightM*n.EffectScale.Z;
   bounds.push([x,z],[x-Math.sin(a)*length,z+Math.cos(a)*length]);
  }
 }
 if(!bounds.length)return {virtualSchematic:true,entryCount:events.length};
 const minX=Math.min(...bounds.map(p=>p[0])),maxX=Math.max(...bounds.map(p=>p[0])),minZ=Math.min(...bounds.map(p=>p[1])),maxZ=Math.max(...bounds.map(p=>p[1]));
 const unit=Math.min((w-10)/Math.max(1,maxX-minX),(h-10)/Math.max(1,maxZ-minZ));
 const origin=[w/2-(minX+maxX)/2*unit,h/2+(minZ+maxZ)/2*unit];
 events.forEach(e=>drawRecipeEntry(ctx,e,time,origin,unit));
 return {virtualSchematic:true,entryCount:events.length,time};
}
