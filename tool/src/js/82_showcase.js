// 4.0 对照橱窗：实际烘焙贴图，同一时钟、同一游戏尺度，左右各完整一朵。
const SHOWCASE_CASES=[['kiku','菊'],['botan','牡丹'],['kamuro','锦冠'],['senrin','千轮'],['strobe','点灭'],
  ['JM4','金芒菊 JM4'],['TR2S','V5 小（兼容锁定）'],['TR2M','V5 中（兼容锁定）'],['TR2L','V5 大（兼容锁定）']];
// 橱窗的推荐固定曝光；不写回正式库，也不随帧或参数自动归一化。
const SHOWCASE_EXPOSURE={JM4:.2};   // 复刻条目的 4.0 曝光；花型库模板用 EXPOSURE40（10_types.js）
const showcase={active:false,id:0,left:null,right:null,M:null,target:null,loading:null,saved:null,key:'kiku',recipe:null,layers:[],solo:-1};
function disposeShowcaseBakes(){
  for(const l of showcase.layers)disposeBake(l.b);showcase.layers=[];showcase.recipe=null;
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
    const cloud=key.startsWith('cloud:');state.cloudPreview=cloud;
    $('#showcaseType').value=key;$('#showcasePair').hidden=cloud;$('#cloudLayer').hidden=!cloud;
    $('#cloudPending').hidden=!cloud;$('#showcaseTitle').textContent=cloud?'4.0 云端配方预览':'3.7 / 4.0 同秒对照';
    $('#showcaseParams').textContent=cloud?'保存完整配方':'保存对照配方';
    let left=null,right=null,layers=[];
    try{
      if(cloud){
        const recipe=cloudRecipe(key.slice(6));
        for(const l of recipe.layers){
          const b=await bake(l.P,1,p=>busy(true,'配方：'+recipe.name+' · '+l.name,(layers.length+p)/recipe.layers.length));
          layers.push({...l,b});
          if(state.platform==='mobile')b.mobile=await bakeMobileFor(b);
          if(id!==showcase.id||!showcase.active)return;
        }
        showcase.recipe=recipe;showcase.layers=layers;layers=[];showcase.solo=-1;state.t=.8;
        showcase.bounds=cloudPreviewBounds(showcase.layers);
        $('#cloudLayer').replaceChildren(new Option('整体 · '+recipe.layers.length+' 层','-1'));
        recipe.layers.forEach((l,i)=>$('#cloudLayer').appendChild(new Option(l.name,String(i))));
        $('#showcaseNote').textContent=recipe.note+' 30 fps 分段回放；配方仍待精调和 UE 验证。';
        return;
      }
      const replica=!!REPLICA_BY_ID[key], d=replica?replicaPM(key):defaultsFor(key,37);
      const oldP={...d.P,renderVer:37}, locked=isTrail(oldP);
      // 右边：花型库模板 = 4.0 新建模板（含 TEMPLATE40 改动和 EXPOSURE40 曝光，和用户新建时看到的一样）；复刻条目 = 同参数换 4.0 渲染
      const newP=replica?{...oldP,renderVer:40,cols:4,rows:4,texW:2048,texH:2048,exposure:SHOWCASE_EXPOSURE[key]||1,haloFrac:.22,haloR:3,previewBloom:0}:{...defaultsFor(key,40).P};
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
      $('#showcaseNote').textContent=locked?'V5 仍锁定 3.7，左右检验原样保留。新核重调在最终迁移时另交验收。':`同秒、同尺度；右侧采用新光点与推荐固定曝光 ×${newP.exposure}，按 30 fps 烘焙并自动分段。连续播放与 UE 画质仍需验证。`;
    }catch(e){console.error(e);$('#showcaseNote').textContent='橱窗烘焙失败：'+e.message;}
    finally{
      for(const l of layers)disposeBake(l.b);
      if(right && right!==left)disposeBake(right);if(left)disposeBake(left);
      state.stillBusy=false;busy(false);
    }
  };
  showcase.loading=run();try{await showcase.loading;}finally{showcase.loading=null;}
}
async function openShowcase(key){
  if(typeof key!=='string')key=showcase.key;
  if(showcase.active){await loadShowcase(key);return;}
  showcase.saved={tab:state.tab,view:state.view,t:state.t,playing:state.playing,refMode:state.ref.mode,disp:state.disp};
  showcase.active=true;state.showcase=true;state.view='export';state.tab='master';state.ref.mode=0;
  state.disp='game';
  $('#main').classList.add('showcase');
  $('#showcaseBar').hidden=false;$('#showcasePair').hidden=false;
  await loadShowcase(key);
}
function closeShowcase(){
  showcase.active=false;state.showcase=false;state.cloudPreview=false;showcase.id++;
  $('#main').classList.remove('showcase');
  if(showcase.saved){Object.assign(state,{tab:showcase.saved.tab,view:showcase.saved.view,t:showcase.saved.t,playing:showcase.saved.playing,disp:showcase.saved.disp});state.ref.mode=showcase.saved.refMode;}
  disposeShowcaseBakes();showcase.target && showcase.target.dispose();showcase.target=null;
  $('#showcaseBar').hidden=true;$('#showcasePair').hidden=true;
  if(state.dirty)scheduleBake();
}
function renderShowcase(){
  if(state.cloudPreview)return renderCloudPreview();
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
  const base=document.createElement('optgroup');base.label='基准 · 新旧对照';
  for(const [key,label] of SHOWCASE_CASES)base.appendChild(new Option(label,key));
  $('#showcaseType').appendChild(base);
  const cloud=document.createElement('optgroup');cloud.label='云端新增 · 配方结构预览';
  for(const r of CLOUD_RECIPES.filter(r=>r.layers))cloud.appendChild(new Option(r.name,'cloud:'+r.id));
  $('#showcaseType').appendChild(cloud);
  $('#cloudPending').innerHTML='<summary>仍待补能力的配方（'+CLOUD_RECIPES.filter(r=>r.missing).length+' 组）</summary><ul>'+CLOUD_RECIPES.filter(r=>r.missing).map(r=>'<li><b>'+r.name+'</b>：'+r.missing+'</li>').join('')+'</ul>';
  $('#cloudRecipesOpen').textContent='云端配方预览 · '+CLOUD_RECIPES.filter(r=>r.layers).length;
  $('#cloudRecipesOpen').addEventListener('click',()=>openShowcase('cloud:core1'));
  $('#cloudLayer').addEventListener('change',e=>{showcase.solo=+e.target.value;});
  $('#showcaseOpen').addEventListener('click',openShowcase);$('#showcaseClose').addEventListener('click',closeShowcase);
  $('#showcaseType').addEventListener('change',e=>loadShowcase(e.target.value));
  $('#showcaseParams').addEventListener('click',()=>{
    if(showcase.recipe){download(new Blob([JSON.stringify({version:VERSION,...showcase.recipe},null,2)],{type:'application/json'}),'云端配方_'+showcase.recipe.id+'.json');return;}
    if(!showcase.left||!showcase.right)return;
    download(new Blob([JSON.stringify({version:VERSION,key:showcase.key,left:{params:showcase.left.P,materialDefaults:showcase.M},right:{params:showcase.right.P,materialDefaults:showcase.M}},null,2)],{type:'application/json'}),'对照_'+showcase.key+'.json');
  });
  for(const el of [$('#libBody'),$('#assetOpen2')])el.addEventListener('click',()=>{if(showcase.active)closeShowcase();},true);
}
function cloudPreviewBounds(layers){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity,diameter=0;
  for(const l of layers){
    diameter=Math.max(diameter,gameDiameter(l.b,Math.max(l.b.meta.Ww,l.b.meta.Wh)));
    for(const part of bakeParts(l.b))for(let i=0;i<=24;i++){
      const r=layerRectAt(part.meta,{scale:1,mirror:false},i*part.meta.duration/24);
      x0=Math.min(x0,r[0]+l.origin[0]);x1=Math.max(x1,r[2]+l.origin[0]);y0=Math.min(y0,r[1]+l.origin[1]);y1=Math.max(y1,r[3]+l.origin[1]);
    }
  }
  return {cx:(x0+x1)/2,cy:(y0+y1)/2,half:Math.max(x1-x0,y1-y0)*.53,diameter};
}
function renderCloudPreview(){
  hdrT.clear();const {recipe,layers,bounds}=showcase;
  if(!recipe||!layers.length){post();hudText='正在烘焙云端配方…';return;}
  const P=recipe.layers[0].P,N=canvas.height;
  const selected=showcase.solo<0?layers:layers.filter((_,i)=>i===showcase.solo);
  const first=previewBake(selected[0].b);
  if(!first){post(-1,P);hudText='正在准备独立手机版…';return;}
  const half=state.disp==='game'?N/(2*gamePixelsPerMeter(P,bounds.diameter,N)):state.disp==='px'?N*first.meta.Ww/(2*first.cw):bounds.half;
  const view=[bounds.cx,bounds.cy,half,half];hdrT.bind();additive(true);
  try{for(const l of selected){const b=previewBake(l.b);if(b)drawLayer(b,{...l.M,scale:1,delay:l.delay,rate:1,mirror:false},state.t,view,l.origin);}}
  finally{additive(false);}
  post(-1,P);hudText=recipe.name+' · '+(showcase.solo<0?'整体 '+layers.length+' 层':selected[0].name)+' · '+(state.platform==='mobile'?'手机':'PC')+' · '+first.cw+' 单格 · '+engineTick(state.t).toFixed(2)+' s · 30 fps · '+state.dist+' m';hudB='';
}
