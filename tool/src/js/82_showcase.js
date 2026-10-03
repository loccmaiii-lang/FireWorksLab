// 云端配方预览（4.3：「3.7 / 4.0 对照橱窗」去掉了，清理清单 C3；这里只剩云端配好的多层配方，本机烘焙后看）。
// 名字里的 showcase 是旧橱窗留下的外壳（motion_plan_check.mjs 按文件名加载这个文件），只给云端配方用。
const showcase={active:false,id:0,target:null,loading:null,saved:null,key:'',recipe:null,layers:[],solo:-1};
function disposeShowcaseBakes(){ for(const l of showcase.layers)disposeBake(l.b);showcase.layers=[];showcase.recipe=null; }
async function loadShowcase(key=showcase.key) {
  if(!key||!key.startsWith('cloud:'))return;
  showcase.key=key;const id=++showcase.id;
  if(showcase.loading)await showcase.loading;
  if(id!==showcase.id || !showcase.active)return;
  const run=async()=>{
    while(state.baking)await nextTick();
    if(id!==showcase.id || !showcase.active)return;
    clearTimeout(bakeTimer);state.stillBusy=true;disposeShowcaseBakes();
    state.cloudPreview=true;$('#showcaseType').value=key;
    let layers=[];
    try{
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
    }catch(e){console.error(e);$('#showcaseNote').textContent='配方烘焙失败：'+e.message;}
    finally{ for(const l of layers)disposeBake(l.b); state.stillBusy=false;busy(false); }
  };
  showcase.loading=run();try{await showcase.loading;}finally{showcase.loading=null;}
}
async function openShowcase(key){
  if(typeof key!=='string'||!key.startsWith('cloud:'))key=showcase.key||'cloud:'+((CLOUD_RECIPES.find(r=>r.layers)||{}).id||'');
  if(showcase.active){await loadShowcase(key);return;}
  showcase.saved={tab:state.tab,view:state.view,t:state.t,playing:state.playing,refMode:state.ref.mode,disp:state.disp};
  showcase.active=true;state.showcase=true;state.view='export';state.tab='master';state.ref.mode=0;
  state.disp='game';
  $('#main').classList.add('showcase');
  $('#showcaseBar').hidden=false;
  await loadShowcase(key);
}
function closeShowcase(){
  showcase.active=false;state.showcase=false;state.cloudPreview=false;showcase.id++;
  $('#main').classList.remove('showcase');
  if(showcase.saved){Object.assign(state,{tab:showcase.saved.tab,view:showcase.saved.view,t:showcase.saved.t,playing:showcase.saved.playing,disp:showcase.saved.disp});state.ref.mode=showcase.saved.refMode;}
  disposeShowcaseBakes();showcase.target && showcase.target.dispose();showcase.target=null;
  $('#showcaseBar').hidden=true;
  if(state.dirty)scheduleBake();
}
function renderShowcase(){ return renderCloudPreview(); }
function initShowcase(){
  const cloud=document.createElement('optgroup');cloud.label='云端配方 · 结构预览';
  for(const r of CLOUD_RECIPES.filter(r=>r.layers))cloud.appendChild(new Option(r.name,'cloud:'+r.id));
  $('#showcaseType').appendChild(cloud);
  $('#cloudPending').innerHTML='<summary>仍待补能力的配方（'+CLOUD_RECIPES.filter(r=>r.missing).length+' 组）</summary><ul>'+CLOUD_RECIPES.filter(r=>r.missing).map(r=>'<li><b>'+r.name+'</b>：'+r.missing+'</li>').join('')+'</ul>';
  $('#cloudRecipesOpen').textContent='云端配方预览 · '+CLOUD_RECIPES.filter(r=>r.layers).length;
  $('#cloudRecipesOpen').addEventListener('click',()=>openShowcase('cloud:core1'));
  $('#cloudLayer').addEventListener('change',e=>{showcase.solo=+e.target.value;});
  $('#showcaseClose').addEventListener('click',closeShowcase);
  $('#showcaseType').addEventListener('change',e=>loadShowcase(e.target.value));
  $('#showcaseParams').addEventListener('click',()=>{
    if(showcase.recipe)download(new Blob([JSON.stringify({version:VERSION,...showcase.recipe},null,2)],{type:'application/json'}),'云端配方_'+showcase.recipe.id+'.json');
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
