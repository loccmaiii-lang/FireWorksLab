// 4.0 对照橱窗：实际烘焙贴图，同一时钟、同一游戏尺度，左右各完整一朵。
const SHOWCASE_CASES=[['kiku','菊'],['botan','牡丹'],['kamuro','锦冠'],['senrin','千轮'],['strobe','点灭'],
  ['JM4','金芒菊 JM4'],['TR2S','V5 小（兼容锁定）'],['TR2M','V5 中（兼容锁定）'],['TR2L','V5 大（兼容锁定）']];
// 橱窗的推荐固定曝光；不写回正式库，也不随帧或参数自动归一化。
const SHOWCASE_EXPOSURE={kiku:3,botan:3,kamuro:4,senrin:4,strobe:3,JM4:.2};
const showcase={active:false,id:0,left:null,right:null,M:null,target:null,loading:null,saved:null,key:'kiku'};
function disposeShowcaseBakes(){
  if(showcase.right && showcase.right!==showcase.left)disposeBake(showcase.right);
  if(showcase.left)disposeBake(showcase.left);showcase.left=showcase.right=null;
}
async function loadShowcase(key=showcase.key) {
  showcase.key=key;const id=++showcase.id;
  if(showcase.loading)await showcase.loading;
  if(id!==showcase.id || !showcase.active)return;
  const run=async()=>{
    while(state.baking)await nextTick();
    if(id!==showcase.id || !showcase.active)return;
    clearTimeout(bakeTimer);state.stillBusy=true;disposeShowcaseBakes();
    let left=null,right=null;
    try{
      const replica=!!REPLICA_BY_ID[key], d=replica?replicaPM(key):defaultsFor(key,37);
      const oldP={...d.P,renderVer:37}, locked=isTrail(oldP);
      const newP={...oldP,renderVer:40,cols:4,rows:4,texW:2048,texH:2048,exposure:SHOWCASE_EXPOSURE[key]||1,haloFrac:.22,haloR:3,previewBloom:0};
      busy(true,'橱窗：烘焙 3.7 原版…',0);
      left=await bake(oldP,1,p=>busy(true,'橱窗：烘焙 3.7 原版…',p*.45));
      if(id!==showcase.id || !showcase.active)return;
      right=locked?left:await bake(newP,1,p=>busy(true,'橱窗：烘焙 4.0 新核…',.45+p*.45));
      if(state.platform==='mobile'){
        left.mobile=await bakeMobileFor(left);if(right!==left)right.mobile=await bakeMobileFor(right);
      }
      if(id!==showcase.id || !showcase.active)return;
      showcase.left=left;showcase.right=right;showcase.M=d.M;left=right=null;
      state.t=.8;
      $('#showcaseNote').textContent=locked?'V5 仍锁定 3.7，左右检验原样保留。新核重调在最终迁移时另交验收。':`同秒、同尺度；右侧采用新光点与推荐固定曝光 ×${newP.exposure}。帧预算尚未重做，本轮只看光点、清晰度和亮度。`;
    }catch(e){console.error(e);$('#showcaseNote').textContent='橱窗烘焙失败：'+e.message;}
    finally{
      if(right && right!==left)disposeBake(right);if(left)disposeBake(left);
      state.stillBusy=false;busy(false);
    }
  };
  showcase.loading=run();try{await showcase.loading;}finally{showcase.loading=null;}
}
async function openShowcase(){
  if(showcase.active)return;
  showcase.saved={tab:state.tab,view:state.view,t:state.t,playing:state.playing,refMode:state.ref.mode};
  showcase.active=true;state.showcase=true;state.view='export';state.tab='master';state.ref.mode=0;
  $('#main').classList.add('showcase');
  $('#showcaseBar').hidden=false;$('#showcasePair').hidden=false;
  await loadShowcase();
}
function closeShowcase(){
  showcase.active=false;state.showcase=false;showcase.id++;
  $('#main').classList.remove('showcase');
  if(showcase.saved){Object.assign(state,{tab:showcase.saved.tab,view:showcase.saved.view,t:showcase.saved.t,playing:showcase.saved.playing});state.ref.mode=showcase.saved.refMode;}
  disposeShowcaseBakes();showcase.target && showcase.target.dispose();showcase.target=null;
  $('#showcaseBar').hidden=true;$('#showcasePair').hidden=true;
  if(state.dirty)scheduleBake();
}
function renderShowcase(){
  const a=previewBake(showcase.left),b=previewBake(showcase.right);
  if(!a||!b){hdrT.clear();post();hudText='正在准备同秒对照…';return;}
  const N=Math.floor(canvas.width/2), y=Math.floor((canvas.height-N)/2), original=hdrT;
  if(!showcase.target||showcase.target.w!==N){showcase.target&&showcase.target.dispose();gl.activeTexture(gl.TEXTURE0);showcase.target=new Target(N,N,gl.RGBA16F,true);}
  const fit=exportViewAny(a,liveSlot('showcaseCamera')).view;
  const diameter=gameDiameter(a,a.form==='trail'?a.meta.Wh:Math.max(a.meta.Ww,a.meta.Wh));
  const half=state.disp==='game'?N/(2*gamePixelsPerMeter(a.P,diameter,N)):state.disp==='px'?N*a.meta.Ww/(2*a.cw):Math.max(a.meta.Ww,a.meta.Wh)*.55;
  const view=[fit[0],fit[1],half,half];
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.035,.04,.055,1);gl.clear(gl.COLOR_BUFFER_BIT);
  try{
    hdrT=showcase.target;
    for(const [i,entry] of [a,b].entries()){
      hdrT.clear();hdrT.bind();additive(true);drawExportScene(entry,showcase.M,state.t,view,liveSlot('showcase'+i));additive(false);
      post(-1,entry.P,[i*N,y,N,N]);
    }
  }finally{hdrT=original;}
  $('#showcaseLeft').textContent=`3.7 原版 · ${a.cw}×${a.chh} 单格`;
  $('#showcaseRight').textContent=`${a===b?'兼容锁定 3.7':'4.0 新核'} · ${b.cw}×${b.chh} 单格`;
  hudText=`${SHOWCASE_CASES.find(x=>x[0]===showcase.key)[1]} · ${state.platform==='mobile'?'手机':'PC'} · ${engineTick(state.t).toFixed(2)} s · 30 fps · ${state.dist} m · F 键放大画布`;
  hudB='';
}
function initShowcase(){
  for(const [key,label] of SHOWCASE_CASES)$('#showcaseType').appendChild(new Option(label,key));
  $('#showcaseOpen').addEventListener('click',openShowcase);$('#showcaseClose').addEventListener('click',closeShowcase);
  $('#showcaseType').addEventListener('change',e=>loadShowcase(e.target.value));
  $('#showcaseParams').addEventListener('click',()=>{
    if(!showcase.left||!showcase.right)return;
    download(new Blob([JSON.stringify({version:VERSION,key:showcase.key,left:{params:showcase.left.P,materialDefaults:showcase.M},right:{params:showcase.right.P,materialDefaults:showcase.M}},null,2)],{type:'application/json'}),'对照_'+showcase.key+'.json');
  });
  for(const el of [$('#libBody'),$('#assetOpen2')])el.addEventListener('click',()=>{if(showcase.active)closeShowcase();},true);
}
