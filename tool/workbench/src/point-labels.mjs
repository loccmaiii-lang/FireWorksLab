export function layoutPointLabels(points,width,height,selected){
 const dam=points.filter(p=>p.id.startsWith('P')),xs=dam.map(p=>p.x);
 const compact=height<190||width<340||Math.max(...xs)-Math.min(...xs)<270;
 if(compact)return points.filter(p=>p.id===selected).map(p=>({...p,x:Math.max(26,Math.min(width-26,p.x)),y:Math.min(height-22,p.y+32)}));
 const damY=dam[0]?.y||100,mainY=damY+32,front=points.filter(p=>p.id.startsWith('F'));
 const frontY=(front[0]?.y||damY)+25;
 const frontFits=frontY<=height-42;
 const rows={P:mainY,B:mainY+26,F:frontFits?frontY:mainY-56};
 return ['P','B','F'].flatMap(group=>{
  const items=points.filter(p=>p.id.startsWith(group)&&(group!=='F'||frontFits||p.id===selected)).sort((a,b)=>a.x-b.x);
  if(!items.length)return [];
  const span=Math.max(items.at(-1).x-items[0].x,(items.length-1)*34);
  const center=Math.max(26+span/2,Math.min(width-26-span/2,(items[0].x+items.at(-1).x)/2));
  return items.map((p,i)=>({...p,x:items.length===1?center:center-span/2+i*span/(items.length-1),y:Math.max(24,rows[group])}));
 });
}
