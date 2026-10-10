// Commit navigation immediately; only the new content surface animates.
// Snapshot transitions suppressed pointer input during rapid library navigation.
export function createWorkspaceTransition(document,commit,reducedMotion){
 let animations=[],generation=0;
 const cancel=()=>{generation++;animations.forEach(a=>a.cancel());animations=[]};
 const navigate=update=>{
  cancel();commit(update);
  if(reducedMotion()||!document.defaultView?.requestAnimationFrame)return;
  const request=generation;
  document.defaultView.requestAnimationFrame(()=>{
   if(request!==generation)return;
   animations=[...document.querySelectorAll('.workspace > .stage-panel,.workspace > .inspector')]
    .filter(node=>node.offsetParent!==null&&node.animate)
    .map(node=>node.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'cubic-bezier(.2,0,0,1)'}));
  });
 };
 navigate.cancel=cancel;return navigate;
}
