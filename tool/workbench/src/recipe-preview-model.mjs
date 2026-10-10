// Visual descriptors only: native timing, geometry and saved recipes are never changed.
export function previewMotion(row,time){
 const age=time-row.entry.native.LocalTimeOffset,duration=row.entry.preview.durationS;
 if(age<0||age>duration||!(duration>0))return null;
 const progress=Math.min(1,age/duration),head=1-(1-progress)**1.65;
 if(row.entry.role==='burst')return {kind:'ring',head:row.end,radius:row.radius*head,alpha:Math.min(1,(1-progress)*4)};
 const project=t=>row.start.map((v,i)=>v+(row.end[i]-v)*t);
 return {kind:'segment',head:project(head),tail:project(Math.max(0,head-.25)),alpha:Math.min(1,(1-progress)*8)};
}
export function previewScale(unit,width){
 const budget=Math.max(48,Math.min(140,width-100)),target=budget/unit,power=10**Math.floor(Math.log10(target));
 const metres=[1,2,5,10].map(v=>v*power).filter(v=>v<=target).at(-1)||power/2;
 return {metres,pixels:metres*unit};
}
export function heightTicks(geometry,height){
 const {metres:step}=previewScale(geometry.unit,240),ticks=[];
 const low=Math.ceil((geometry.baseline-height+48)/geometry.unit/step),high=Math.floor((geometry.baseline-32)/geometry.unit/step);
 for(let i=low;i<=high;i++)ticks.push({metres:i*step,y:geometry.baseline-i*step*geometry.unit});
 return ticks;
}
