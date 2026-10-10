export function pointerTime(clientX,rect,range){
 const fraction=Math.max(0,Math.min(1,(clientX-rect.left)/Math.max(1,rect.width)));
 return range[0]+fraction*(range[1]-range[0]);
}
export function musicSelection(section,range,total){
 const full=range[1]-range[0]>=total-.1;
 return {time:section.start,scope:'show',range:full?[0,total]:[section.start,section.end],zoom:full?'all':'section'};
}
