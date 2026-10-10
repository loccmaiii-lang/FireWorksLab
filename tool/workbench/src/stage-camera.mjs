// The former 120% framing is now the shared 100% baseline.
export const BASE_FRAME_SCALE=1.2;
export function cameraFrame(width,height,points,mode='dam',zoom=1){
 const xs=points.map(p=>p.xM??p.x),min=Math.min(-400,...xs),max=Math.max(400,...xs);
 const visibleHeight=mode==='full'?750:230;
 const unit=Math.max(.04,Math.min((width-76)/(max-min+150),(height-65)/visibleHeight))*BASE_FRAME_SCALE*Math.max(.5,Math.min(3,zoom));
 return {unit,center:(min+max)/2,baseY:height-39,maxZ:Math.max(230,(height-65)/unit)};
}
