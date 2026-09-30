import { UltraRenderer, THREE, target, POST_FS } from './renderer.js';
import { bake, AtlasPlayer, atlasLayout, fittedView } from './bake.js';
import { rawPNG, download, jsonBlob, flipRows, pfm } from './export.js';
import { G, defaultsFor, derive, TYPE_GROUPS, TYPE_NAMES, familyOf, measure } from './generated/core.js';

const $=s=>document.querySelector(s),canvas=$('#view'),engine=new UltraRenderer(canvas);
const presets=await (await fetch('presets.json')).json();
const state={recipe:null,t:.8,playing:true,speed:1,loading:true,busy:false,mode:'live',result:null,
  player:null,dirty:true,generation:0,error:null};
const status=text=>{$('#status').textContent=text;};
const settings=()=>({width:+$('#resolution').value,ss:+$('#ss').value,exposure:+$('#exposure').value,bloom:+$('#bloom').value,model:$('#model').value,
  view:state.recipe?fittedView(state.recipe.view,1,1):undefined});
const group=document.createElement('optgroup');group.label='熟悉的效果';
for(const recipe of presets){const o=new Option(recipe.name,recipe.id);group.append(o);}$('#preset').append(group);
for(const [name,types] of TYPE_GROUPS) {
  const group=document.createElement('optgroup');group.label='基础 · '+name;
  for(const type of types.filter(t=>!['trailS','trailM','trailL'].includes(t)))group.append(new Option(TYPE_NAMES[type],'base:'+type));
  $('#preset').append(group);
}
function controls(busy) {
  state.busy=busy;
  for(const id of ['preset','model','bake','bakeSize','frames','bakeSS','samples','separate','apply','reset','still','hdr','saveRecipe'])$('#'+id).disabled=busy||state.loading;
  $('#cancel').hidden=!busy;
}
function stale() {
  state.result=null;state.player?.dispose();state.player=null;state.mode='live';
  $('#savePNG').disabled=$('#saveMeta').disabled=$('#atlasMode').disabled=true;
  $('#liveMode').classList.add('active');$('#atlasMode').classList.remove('active');$('#modeName').textContent='实时模拟';
}
function budgetUI(){
  const w=+$('#resolution').value,track=engine.layers.reduce((n,l)=>n+(l.track?.bytes||0),0);
  for(const option of $('#ss').options)option.disabled=w*w*((+option.value)**2*16+4)+track>1400*1024**2||w*(+option.value)>engine.maxTextureSize;
  if($('#ss').selectedOptions[0].disabled){$('#ss').value='1';status('已按工作预算调整空间采样。');}
}
function updateAtlasInfo() {
  if(!state.recipe)return;
  const trail=state.recipe.layers.every(l=>l.P.form==='trail');
  const L=atlasLayout(+$('#bakeSize').value,+$('#frames').value,trail);
  $('#atlasInfo').textContent=L.cols+'×'+L.rows+' 格 · 单帧 '+L.cellW+'×'+L.cellH+' px · RGBA 全通道';
}
async function load(recipe) {
  const gen=++state.generation;state.loading=true;state.error=null;controls(false);stale();
  $('#loading').hidden=false;$('#loading').textContent='准备 '+recipe.name+'…';
  state.recipe=structuredClone(recipe);state.t=recipe.id.startsWith('TR2')?Math.min(2,recipe.stop*.5):Math.min(.8,recipe.duration*.3);
  $('#model').options[1].disabled=!recipe.layers.some(l=>l.P.filament>0);
  if($('#model').selectedOptions[0].disabled)$('#model').value='original';
  $('#effectName').textContent=recipe.name;
  $('#parameters').value=JSON.stringify(recipe,null,2);
  $('#layers').replaceChildren(...recipe.layers.map(l=>{const s=document.createElement('span');s.className='chip';s.textContent=l.name;return s;}));
  try {
    const ok=await engine.load(recipe,text=>$('#loading').textContent=text);
    if(!ok||gen!==state.generation)return false;
    if(legacyReady&&$('#compare').checked)await legacyLoad();
    state.loading=false;controls(false);$('#loading').hidden=true;state.dirty=true;budgetUI();updateAtlasInfo();status('效果已就绪');
    return true;
  } catch(e) {
    if(gen!==state.generation)return false;
    state.error=e.message;state.loading=false;controls(false);$('#loading').textContent=e.message;status(e.message);console.error(e);
    return false;
  }
}
async function select(id) {
  $('#preset').value=id;
  const stored=presets.find(r=>r.id===id);
  if(stored)return load(stored);
  const type=id.slice(5),{P,M}=defaultsFor(type);derive(P);P.engine='gpu';P.zoom='off';
  if(familyOf(type)==='ground') {
    const life=P.sparkLife*2.5,k=Math.max(.1,P.sparkDrag),flight=(1-Math.exp(-k*life))/k;
    const spread=(P.jetSpeed+P.sparkSpread*3)*flight;
    let x=Math.max(P.spacing*Math.max(1,P.nozzles)/2+spread,P.wheelR+spread);
    let y0=Math.min(-5,P.groundH-G*P.sparkGrav/k*(life-flight));
    let y1=P.groundH+spread;
    if(type==='fan'||type==='barrage'){x=P.shotSpeed*P.cometBurn*.8;y1=P.shotSpeed*P.cometBurn*.8;}
    if(type==='shikake'){x=P.spacing/2+spread;y1=P.groundH+P.spacing*.62+spread;}
    const half=Math.max(x,(y1-y0)/2)*1.05+3;
    return load({id,name:TYPE_NAMES[type],duration:P.loopT,view:[0,(y1+y0)/2,half,half],
      source:'Ultra looping emitter '+type,layers:[{id:type,name:TYPE_NAMES[type],P,M,expo:[.1,.1]}]});
  }
  const f=measure(P),half=Math.max(f.x1-f.x0,f.y1-f.y0)*.53+3;
  return load({id,name:TYPE_NAMES[type],duration:P.duration,view:[(f.x1+f.x0)/2,(f.y1+f.y0)/2,half,half],
    source:'Ultra default '+type,layers:[{id:type,name:TYPE_NAMES[type],P,M,expo:[.1,.1]}]});
}

let legacyReady=false,legacyPromise=null;
async function setupLegacy() {
  if(legacyPromise)return legacyPromise;
  legacyPromise=new Promise((resolve,reject)=>{
    const iframe=$('#legacy');iframe.onload=()=>{
      const doc=iframe.contentDocument,script=doc.createElement('script');
      script.src=new URL('./legacy-bridge.js',import.meta.url).href;
      script.onload=()=>{legacyReady=true;resolve();};script.onerror=()=>reject(new Error('原 Ultra 对比加载失败'));
      doc.body.append(script);
    };
    iframe.src='../ultra-baker-3.6/tool/FireworkBaker.html?fast';
  });return legacyPromise;
}
async function legacyLoad() {
  await setupLegacy();
  const recipe=structuredClone(state.recipe);recipe.view=fittedView(recipe.view,1,1);
  $('#legacy').contentWindow.ultraCompare.load(recipe);
}
$('#compare').onchange=async()=>{
  $('#legacyPane').hidden=!$('#compare').checked;
  if($('#compare').checked) {
    const playing=state.playing;state.playing=false;status('加载原 Ultra 同参数对比…');
    try{await legacyLoad();status('两侧时间、取景、曝光同步；左侧可提高渲染像素。');}
    catch(e){status(e.message);$('#compare').checked=false;$('#legacyPane').hidden=true;}
    state.playing=playing;
  }else{if(legacyReady)$('#legacy').contentWindow.ultraCompare.dispose();status('已关闭对比，释放旧引擎轨迹。');}
  state.dirty=true;
};
$('#preset').onchange=()=>select($('#preset').value);
for(const id of ['resolution','ss','exposure','bloom'])$('#'+id).oninput=()=> {
  $('#exposureValue').textContent=(+$('#exposure').value).toFixed(2);
  $('#bloomValue').textContent=+$('#bloom').value?(+$('#bloom').value).toFixed(2):'关闭';
  budgetUI();state.dirty=true;
};
$('#model').onchange=()=>{stale();state.dirty=true;$('#note').textContent=$('#model').value==='embers'?
  '独立余烬：每颗火星分别出生、飞行、变暗和熄灭。改变了模型，不能据此判断 Three.js 的提升。':
  '原参数模式：物理与配方相同，用于比较绘制管线。关闭光晕可检查粒子边缘。';
  $('#threePane .pane-label').textContent=$('#model').value==='embers'?'THREE.JS · 独立余烬模型':'THREE.JS · 高精度';};
$('#play').onclick=()=>{state.playing=!state.playing;$('#play').textContent=state.playing?'暂停':'播放';};
$('#scrub').oninput=()=>{state.t=+$('#scrub').value/1000*state.recipe.duration;state.playing=false;$('#play').textContent='播放';state.dirty=true;};
$('#speed').onchange=()=>state.speed=+$('#speed').value;
for(const id of ['bakeSize','frames'])$('#'+id).onchange=updateAtlasInfo;

let abort=null;
$('#bake').onclick=async()=> {
  const wasPlaying=state.playing;state.playing=false;controls(true);abort=new AbortController();$('#progress').hidden=false;
  status('在线性光中烘焙…');
  try {
    const result=await bake(engine,{size:+$('#bakeSize').value,frames:+$('#frames').value,
      ss:+$('#bakeSS').value,samples:+$('#samples').value,shutter:.5,separate:$('#separate').checked,
      model:$('#model').value},p=>{$('#progress').value=p.progress;status('烘焙 '+(p.layer+1)+'/'+engine.layers.length+' 层 · '+p.frame+'/'+p.frames+' 帧');},abort.signal);
    state.player?.dispose();state.result=result;state.player=new AtlasPlayer(engine,result);
    $('#savePNG').disabled=$('#saveMeta').disabled=$('#atlasMode').disabled=false;
    state.mode='atlas';$('#modeName').textContent='实际贴图回放';$('#atlasMode').classList.add('active');$('#liveMode').classList.remove('active');
    status('烘焙完成 · '+result.outputs.length+' 张实际贴图');
  }catch(e){status(e.name==='AbortError'?'已取消烘焙':e.message);if(e.name!=='AbortError')console.error(e);}
  finally{controls(false);$('#progress').hidden=true;state.playing=wasPlaying;state.dirty=true;abort=null;}
};
$('#cancel').onclick=()=>abort?.abort();
$('#liveMode').onclick=()=>{state.mode='live';$('#modeName').textContent='实时模拟';$('#liveMode').classList.add('active');$('#atlasMode').classList.remove('active');state.dirty=true;};
$('#atlasMode').onclick=()=>{if(!state.player)return;state.mode='atlas';$('#modeName').textContent='实际贴图回放';$('#atlasMode').classList.add('active');$('#liveMode').classList.remove('active');state.dirty=true;};
$('#savePNG').onclick=async()=>{
  if(!state.result)return;
  status('编码原始 RGBA PNG…');
  for(const o of state.result.outputs){const L=state.result.metadata.layout;download(await rawPNG(L.size,L.size,o.pixels),
    'T_EFX_FireWorks_'+state.recipe.id+'_'+o.id+'_'+o.part+'_'+L.cols+'x'+L.rows+'_01.png');await new Promise(r=>setTimeout(r,300));}
  status('贴图已下载，Alpha 保留为第 4 组帧。');
};
$('#saveMeta').onclick=()=>{const out={...state.result.metadata,layers:state.result.outputs.map(({pixels,...rest})=>rest)};
  download(jsonBlob(out),state.recipe.id+'_three-bake.json');};
$('#saveRecipe').onclick=()=>download(jsonBlob(state.recipe),state.recipe.id+'_three-recipe.json');
$('#apply').onclick=async()=>{
  try {
    const recipe=JSON.parse($('#parameters').value);
    if(!Array.isArray(recipe.layers)||!recipe.layers.length||recipe.layers.length>8)throw new Error('配方需要 1–8 层。');
    if(!Array.isArray(recipe.view)||recipe.view.length!==4||!recipe.view.every(Number.isFinite)||recipe.view[2]<=0||recipe.view[3]<=0)throw new Error('取景需要四个有效数值。');
    if(!(recipe.duration>0&&recipe.duration<=60))throw new Error('时长需要在 0–60 秒内。');
    for(const l of recipe.layers) {
      if(Object.values(l.P).some(v=>typeof v==='number'&&!Number.isFinite(v)))throw new Error('参数含非有限数值。');
      if(!(l.P.stars>=1&&l.P.stars<=10000&&l.P.vt>0&&l.P.burn>0&&l.P.duration>0&&l.P.duration<=60))throw new Error('星数、终端速度或时长超出安全范围。');
      if(!(l.P.subStars>=1&&l.P.subStars<=120))throw new Error('子花星数需在 1–120。');
    }
    await load(recipe);
  }catch(e){status('参数无效：'+e.message);}
};
$('#reset').onclick=()=>select($('#preset').value);

async function capture(hdr=false) {
  const playing=state.playing;state.playing=false;controls(true);status(hdr?'读取线性 HDR…':'渲染真实 4096 像素静帧…');
  let rt;
  try {
    if(hdr) {
      rt=target(4096,4096,THREE.FloatType);
      engine.render(state.t,{...settings(),width:4096,height:4096,ss:1,output:rt,linear:true});
      const data=new Float32Array(4096*4096*4);engine.renderer.readRenderTargetPixels(rt,0,0,4096,4096,data);
      download(pfm(4096,4096,data),state.recipe.id+'_linear_4K.pfm');
    }else {
      engine.render(state.t,{...settings(),width:4096,height:4096,ss:1,output:'bytes'});
      download(await rawPNG(4096,4096,flipRows(engine.readOutput(),4096,4096)),state.recipe.id+'_three_4K.png');
    }status(hdr?'已下载线性浮点 PFM。':'已下载 4K 静帧。');
  }catch(e){status(e.message);console.error(e);}
  finally{rt?.dispose();controls(false);state.playing=playing;state.dirty=true;}
}
$('#still').onclick=()=>capture(false);$('#hdr').onclick=()=>capture(true);

let pointer=[.5,.5];
canvas.onpointermove=e=>{const r=canvas.getBoundingClientRect(),side=Math.min(r.width,r.height),ox=(r.width-side)/2,oy=(r.height-side)/2;
  pointer=[Math.max(0,Math.min(1,(e.clientX-r.left-ox)/side)),Math.max(0,Math.min(1,(e.clientY-r.top-oy)/side))];state.dirty=true;};
$('#loupe').onchange=()=>{ $('#magnifier').hidden=!$('#loupe').checked;state.dirty=true;};
function magnify(){
  if(!$('#loupe').checked)return;
  const c=$('#magnifier').getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#000';c.fillRect(0,0,256,256);
  c.drawImage(canvas,pointer[0]*canvas.width-32,pointer[1]*canvas.height-32,64,64,0,0,256,256);
}
let previous=performance.now(),frames=0,fps=0,fpsStart=previous;
function tick(now) {
  const dt=Math.min(.1,(now-previous)/1000);previous=now;
  if(!state.loading&&!state.busy&&state.recipe) {
    if(state.playing){state.t+=dt*state.speed;if(state.t>state.recipe.duration)state.t=0;state.dirty=true;}
    if(state.dirty) {
      const opts=settings(),start=performance.now();
      try {
        if(state.mode==='atlas'&&state.player)state.player.render(state.t,opts);
        else engine.render(state.t,opts);
        if($('#compare').checked&&legacyReady)$('#legacy').contentWindow.ultraCompare.render(state.t,opts.width,opts.exposure,opts.bloom);
        magnify();state.dirty=false;
        const count=engine.layers.reduce((s,l)=>s+(l.track?.total||l.emitter?.total||l.pops?.reduce((s,p)=>s+p.Mw,0)||0),0);
        $('#stats').textContent=opts.width+'×'+opts.width+' px · '+(opts.width*opts.ss)+' px 内部 · '+count.toLocaleString()+' 火花槽位 · '+(performance.now()-start).toFixed(1)+' ms';
      }catch(e){state.error=e.message;status(e.message);state.playing=false;state.dirty=false;console.error(e);}
    }
    $('#scrub').value=Math.round(state.t/state.recipe.duration*1000);$('#time').textContent=state.t.toFixed(2)+' / '+state.recipe.duration.toFixed(2)+' s';
  }
  frames++;if(now-fpsStart>1000){fps=frames*1000/(now-fpsStart);frames=0;fpsStart=now;}
  requestAnimationFrame(tick);
}

// Exposed diagnostics are also used by tests and local batch exports.
window.THREE_LAB={engine,state,presets,load,select,bake,AtlasPlayer,rawPNG,settings,capture,comparisonPostShader:POST_FS,
  renderAt(t,options={}){state.t=t;state.playing=false;engine.render(t,{...settings(),...options});state.dirty=false;return engine.size;},
  async enableComparison(){ $('#compare').checked=true;$('#legacyPane').hidden=false;await legacyLoad();state.dirty=true;},
  legacy(){return $('#legacy').contentWindow.ultraCompare;},get fps(){return fps;}};
requestAnimationFrame(tick);
await select(new URLSearchParams(location.search).get('effect')||'JM');
