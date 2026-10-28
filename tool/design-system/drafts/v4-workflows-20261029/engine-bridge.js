(function(global){
  'use strict';
  // 仅在独立草稿里以原P/M调用真实核；不改生产文件与配方。
  const SOURCE_PATH='/baker',SOURCE_ORIGIN='http://127.0.0.1:8034',CHANNEL='fwl-demo-real-kernel/1';
  const BARRIER="if (!/[?&]fast/.test(location.search)) runPreviewBake(); else state.dirty = false;";
  const INTERNAL_SIZE=540;
  let session=null,retryState=null,starting=0;
  function status(s,value){if(session!==s||s.disposed)return;value.phase=value.state;value.internalResolution=INTERNAL_SIZE;s.onStatus?.(value);}
  function prelude(nonce){return '('+function(token,channel,size){
    'use strict';
    const audit=window.__DEMO_AUDIT={storage:'memory-only',origin:location.origin,network:'CSP + API disabled',bakeCalls:0,errors:[],internalResolution:size,renderFrames:0};
    let stopped=false,failed=false,loopCallback=null,loopId=0,demand=true;
    const nativeRAF=window.requestAnimationFrame.bind(window),nativeCancel=window.cancelAnimationFrame.bind(window),ids=new Set();
    const post=(type,payload)=>parent.postMessage({channel,nonce:token,type,...payload},'*');
    const set=(obj,key,value)=>{try{Object.defineProperty(obj,key,{configurable:false,value});}catch(_){}};
    const memory=()=>{const m=new Map();return{get length(){return m.size},key(i){return [...m.keys()][i]??null},getItem(k){return m.has(String(k))?m.get(String(k)):null},setItem(k,v){m.set(String(k),String(v))},removeItem(k){m.delete(String(k))},clear(){m.clear()}}};
    const blocked=()=>{throw new DOMException('交互草稿禁用外部能力','SecurityError')},blockedAsync=()=>Promise.reject(new DOMException('交互草稿禁用外部接口','SecurityError'));
    set(window,'localStorage',memory());set(window,'sessionStorage',memory());set(window,'devicePixelRatio',1);
    ['indexedDB','caches','showDirectoryPicker','showOpenFilePicker','showSaveFilePicker','openDatabase'].forEach(k=>set(window,k,undefined));
    set(navigator,'storage',undefined);set(navigator,'serviceWorker',undefined);set(navigator,'sendBeacon',()=>false);
    set(navigator,'clipboard',Object.freeze({read:blockedAsync,readText:blockedAsync,write:blockedAsync,writeText:blockedAsync}));
    set(window,'fetch',blockedAsync);['XMLHttpRequest','WebSocket','EventSource','Worker','SharedWorker'].forEach(k=>set(window,k,blocked));set(window,'open',()=>null);
    document.addEventListener('click',e=>{if(e.target.closest?.('a')){e.preventDefault();e.stopImmediatePropagation();}},true);
    function enqueueLoop(){if(stopped||failed||loopId||!loopCallback||!demand)return;demand=false;let id;id=nativeRAF(now=>{ids.delete(id);loopId=0;if(stopped||failed)return;audit.renderFrames++;loopCallback(now)});loopId=id;ids.add(id);}
    // 原loop照常绘制，仅将其连续调度换为按需；其它初始化RAF仍用原生调度。
    set(window,'requestAnimationFrame',callback=>{if(stopped)return 0;if(callback.name==='loop'){loopCallback=callback;enqueueLoop();return loopId;}let id;id=nativeRAF(now=>{ids.delete(id);if(!stopped)callback(now)});ids.add(id);return id;});
    set(window,'cancelAnimationFrame',id=>{ids.delete(id);if(id===loopId)loopId=0;nativeCancel(id)});
    window.__DEMO_REQUEST_FRAME=()=>{demand=true;enqueueLoop()};
    window.__DEMO_STOP=()=>{if(stopped)return;stopped=true;for(const id of ids)nativeCancel(id);ids.clear();loopId=0;try{const c=document.querySelector('#gl'),g=c?.getContext('webgl2');g?.getExtension('WEBGL_lose_context')?.loseContext();audit.contextReleased=!!g;}catch(_){} };
    window.__DEMO_FAIL=(message,code='render-error')=>{if(stopped||failed)return;failed=true;audit.errors.push(String(message).slice(0,500));post('error',{message:String(message),code,audit});for(const id of ids)nativeCancel(id);ids.clear();loopId=0;};
    addEventListener('error',e=>window.__DEMO_FAIL(e.message||'真实渲染核发生错误','child-error'));
    addEventListener('unhandledrejection',e=>window.__DEMO_FAIL(e.reason?.message||String(e.reason),'child-rejection'));
    document.addEventListener('webglcontextlost',()=>window.__DEMO_FAIL('真实预览的WebGL上下文已丢失，请手动重试。','context-lost'),true);
    addEventListener('pagehide',()=>window.__DEMO_STOP());addEventListener('beforeunload',()=>window.__DEMO_STOP());
    window.__DEMO_TOKEN=token;window.__DEMO_CHANNEL=channel;
  }.toString()+')('+JSON.stringify(nonce)+','+JSON.stringify(CHANNEL)+','+INTERNAL_SIZE+');';}

  function runtime(nonce){return '('+function(token,channel,size){
    'use strict';
    const send=(type,payload)=>parent.postMessage({channel,nonce:token,type,...payload},'*');
    const fw=window.__fw;
    if(!fw?.state||typeof fw.importParams!=='function'||typeof fw.thumbNow!=='function'){window.__DEMO_FAIL('真实渲染入口不完整；可能未取得WebGL2上下文。','missing-api');return;}
    const captured={state:fw.state,importParams:fw.importParams.bind(fw),thumbNow:fw.thumbNow.bind(fw),resolve:fw.resolve.bind(fw)};window.__fw=Object.freeze(captured);
    const state=captured.state;state.tab='master';state.view='live';state.disp='fit';state.exportResolution=false;state.playing=false;state.t=1.2;
    let loaded=false,rendering=false,queued=null,captureTimer=0,deadline=0,lastCapture=0,signature='',visible=true,disposed=false;
    function failure(message,code){clearTimeout(captureTimer);clearTimeout(deadline);queued=null;loaded=false;window.__DEMO_FAIL(message,code);}
    function cleanup(){if(disposed)return;disposed=true;loaded=false;state.playing=false;clearTimeout(captureTimer);clearTimeout(deadline);queued=null;window.__DEMO_STOP();}
    async function draw(requestId){
      if(!loaded||disposed||!visible)return;if(rendering){queued=requestId;return;}
      const wait=250-(performance.now()-lastCapture);if(wait>0){queued=requestId;if(!captureTimer)captureTimer=setTimeout(()=>{captureTimer=0;const q=queued;queued=null;draw(q)},wait);return;}
      lastCapture=performance.now();rendering=true;
      try{
        const next=captured.thumbNow();window.__DEMO_REQUEST_FRAME();
        const image=await Promise.race([next,new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Error('真实画布10秒内未完成取帧；请手动重试。')),10000)})]);
        clearTimeout(deadline);deadline=0;if(disposed)return;
        const canvas=document.querySelector('#gl');
        if(state.glLost||canvas?.getContext('webgl2')?.isContextLost())throw Error('真实预览的WebGL上下文已丢失。');
        const hud=document.querySelector('#hud')?.textContent||'';if(hud.startsWith('渲染出错'))throw Error(hud);
        window.__DEMO_AUDIT.canvas=[canvas.width,canvas.height];window.__DEMO_AUDIT.viewport=[innerWidth,innerHeight,devicePixelRatio];
        if(!/^data:image\/png;base64,/.test(image))throw Error('真实画布没有返回有效PNG。');
        if(canvas.width!==size||canvas.height!==size)throw Error('真实画布内部解析度异常：'+canvas.width+'×'+canvas.height+'，预期'+size+'×'+size+'。');
        send('frame',{image,requestId,time:state.t,scope:'selected-layer',width:canvas.width,height:canvas.height,internalResolution:size,renderFrames:window.__DEMO_AUDIT.renderFrames});
      }catch(e){if(!disposed)failure(e.message,'frame-error');}
      finally{rendering=false;if(queued!==null&&!disposed){const q=queued;queued=null;draw(q)}}
    }
    addEventListener('pagehide',cleanup);addEventListener('beforeunload',cleanup);
    addEventListener('message',e=>{
      const m=e.data;if(e.origin!=='http://127.0.0.1:8034'||e.source!==parent||!m||m.channel!==channel||m.nonce!==token)return;
      if(m.type==='dispose'){cleanup();send('disposed',{audit:window.__DEMO_AUDIT});return;}if(disposed)return;
      try{
        if(m.type==='params'){
          if(!m.params||typeof m.params!=='object'||Array.isArray(m.params))throw Error('缺少选层原始参数');
          const sig=JSON.stringify([m.params,m.material||{}]);
          if(sig!==signature){const resolved=captured.resolve({params:m.params,materialDefaults:m.material||{},name:'GLB-S1 · 选层实时预览'},'demo');captured.importParams({params:resolved.P,materialDefaults:resolved.M,name:'GLB-S1 · 选层实时预览'},'demo');signature=sig;}
          state.tab='master';state.view='live';state.disp='fit';state.playing=false;state.t=Number.isFinite(m.time)?m.time:Math.min(1.2,+state.P.duration||1.2);loaded=true;window.__DEMO_REQUEST_FRAME();draw(m.requestId);
        }else if(m.type==='seek'&&Number.isFinite(m.time)){state.t=m.time;state.playing=false;if(visible)window.__DEMO_REQUEST_FRAME();draw(m.requestId);}
        else if(m.type==='visibility'){visible=!!m.visible;if(!visible){clearTimeout(deadline);deadline=0;}else if(loaded){window.__DEMO_REQUEST_FRAME();draw(m.requestId);}}
        else if(m.type==='pause')state.playing=false;
        else if(m.type==='audit')send('audit',{audit:{...window.__DEMO_AUDIT,baking:state.baking,view:state.view,type:state.P.type,visible,canvas:[document.querySelector('#gl').width,document.querySelector('#gl').height],devicePixelRatio,previewDistance:state.dist},requestId:m.requestId});
      }catch(e){failure(e.message,'parameter-error')}
    });
    send('ready',{scope:'selected-layer',internalResolution:size,audit:window.__DEMO_AUDIT});
  }.toString()+')('+JSON.stringify(nonce)+','+JSON.stringify(CHANNEL)+','+INTERNAL_SIZE+');';}

  function isolateHTML(html,nonce){
    if(!html.includes(BARRIER))throw Error('本机烘焙器版本与隔离锚点不符，预览已停止');
    const guard=`\nconst __demoNoBake=()=>{window.__DEMO_AUDIT.bakeCalls++;throw new Error('交互草稿禁用烘焙/导出');};\nrunPreviewBake=async()=>{};scheduleBake=()=>{};queueLayerBake=()=>{};\nbakeNow=__demoNoBake;bakeFinal=__demoNoBake;bake=__demoNoBake;exportMaster=__demoNoBake;exportCombo=__demoNoBake;\nbakeMode.auto=false;bakeMode.demand=false;state.dirty=false;liveCtl.auto=true;\nconst __demoEnsureTargets=ensureTargets;ensureTargets=()=>{boxRect={width:540,height:540};boxRectAt=performance.now();__demoEnsureTargets();};\n`;
    html=html.replace(BARRIER,guard).replace(/<script\b[^>]*\bsrc=["'][^"']*["'][^>]*>\s*<\/script>/gi,'');
    const csp=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' data:; img-src data: blob:; connect-src 'none'; media-src 'none'; worker-src 'none'; frame-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">`;
    const layout=`<style>html,body{margin:0!important;width:${INTERNAL_SIZE}px!important;height:${INTERNAL_SIZE}px!important;overflow:hidden!important}#box{position:fixed!important;inset:0!important;width:${INTERNAL_SIZE}px!important;height:${INTERNAL_SIZE}px!important;min-height:0!important;max-height:none!important;z-index:999999!important;background:#050708!important}#gl{position:absolute!important;inset:0!important;width:${INTERNAL_SIZE}px!important;height:${INTERNAL_SIZE}px!important;transform:none!important}#box>*:not(#gl){display:none!important}</style>`;
    html=html.replace(/<head[^>]*>/i,m=>m+csp+'<script>'+prelude(nonce)+'</scr'+'ipt>');return html.replace(/<\/body>/i,layout+'<script>'+runtime(nonce)+'</scr'+'ipt></body>');
  }
  function send(s,type,payload={}){if(session!==s||!s.ready||s.failed||s.disposed)return false;s.iframe.contentWindow?.postMessage({channel:CHANNEL,nonce:s.nonce,type,requestId:++s.requestId,...payload},'*');return true;}
  function fail(s,message,code='unavailable'){if(session!==s||s.failed||s.disposed)return;s.failed=true;s.ready=false;clearTimeout(s.timeout);s.iframe.style.visibility='hidden';status(s,{state:'error',message,code,retryable:true});}
  const bridge={
    capabilities:Object.freeze({realKernel:true,scope:'selected-layer',internalResolution:INTERNAL_SIZE,baking:false,export:false,enginePlayback:false,composite:false}),
    async start(host,onFrame,onStatus){
      const startId=++starting;await bridge.dispose();if(startId!==starting)return false;
      if(location.origin!==SOURCE_ORIGIN){onStatus?.({state:'unavailable',phase:'unavailable',message:'真实预览仅在已预检的本机8034草稿入口可用'});return false;}
      const nonce=Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16)).join('-'),iframe=document.createElement('iframe');
      iframe.title='隔离真实渲染核（选层实时参考540×540）';iframe.sandbox='allow-scripts';iframe.tabIndex=-1;iframe.setAttribute('aria-hidden','true');iframe.width=String(INTERNAL_SIZE);iframe.height=String(INTERNAL_SIZE);
      iframe.style.cssText=`position:absolute;left:50%;top:50%;width:${INTERNAL_SIZE}px;height:${INTERNAL_SIZE}px;border:0;pointer-events:none;background:#050708;transform-origin:center;`;
      const s=session={iframe,nonce,host:host||document.body,onFrame,onStatus,ready:false,requestId:0,pending:null,time:1.2,disposed:false,failed:false,visible:true};
      retryState={host:s.host,onFrame,onStatus,pending:null,time:1.2};
      const fit=()=>{if(session!==s)return;const r=s.host.getBoundingClientRect(),side=Math.min(r.width,r.height);iframe.style.transform=`translate(-50%,-50%) scale(${Math.max(0,side)/INTERNAL_SIZE})`;const visible=side>1;if(s.visible!==visible){s.visible=visible;send(s,'visibility',{visible})}};
      s.observer=new ResizeObserver(fit);s.observer.observe(s.host);fit();
      s.listener=e=>{const m=e.data;if(session!==s||e.origin!=='null'||e.source!==iframe.contentWindow||!m||m.channel!==CHANNEL||m.nonce!==nonce)return;
        if(m.type==='error'){fail(s,m.message||'真实渲染失败',m.code);return;}if(s.failed)return;
        if(m.type==='ready'){s.ready=true;clearTimeout(s.timeout);status(s,{state:'ready',message:'选层实时参考 · 真实核 · 内部540×540，非烘焙像素',audit:m.audit});send(s,'visibility',{visible:s.visible});if(s.pending)bridge.setParameters(s.pending);}
        else if(m.type==='frame'&&typeof m.image==='string'&&/^data:image\/png;base64,/.test(m.image)){s.hasFrame=true;onFrame?.(m.image,m);status(s,{state:'frame',message:'选层实时参考 · 真实核 · 内部540×540，非烘焙像素',time:m.time});}
        else if(m.type==='audit')status(s,{state:'audit',audit:m.audit});
      };
      global.addEventListener('message',s.listener);status(s,{state:'loading',message:'正在加载固定解析度的隔离真实预览…'});
      try{const response=await fetch(SOURCE_PATH+'?fast&autobake=0',{credentials:'omit',cache:'no-store'});if(!response.ok)throw Error('本机烘焙器读取失败：'+response.status);const html=await response.text();if(session!==s)return false;iframe.srcdoc=isolateHTML(html,nonce);s.host.appendChild(iframe);fit();s.timeout=setTimeout(()=>fail(s,'真实渲染核15秒内未就绪；请手动重试。','startup-timeout'),15000);return true;}catch(e){fail(s,e.message,'source-error');return false;}
    },
    setParameters(rawParams,materialDefaults){const s=session;if(!s)return false;const input=rawParams?.P?{params:rawParams.P,material:rawParams.M||{},name:rawParams.name,contextId:rawParams.contextId}:rawParams?.params?rawParams:{params:rawParams,material:materialDefaults};s.pending=input;if(retryState)retryState.pending=input;if(!input.params||typeof input.params!=='object')return false;return send(s,'params',{params:input.params,material:input.material||input.materialDefaults||{},time:s.time});},
    seek(seconds){const s=session;if(!s||!Number.isFinite(+seconds))return false;s.time=+seconds;if(retryState)retryState.time=s.time;return send(s,'seek',{time:s.time});},
    pause(){return session?send(session,'pause'):false},inspect(){return session?send(session,'audit'):false},
    async retry(){const previous=retryState;if(!previous)return false;const started=await bridge.start(previous.host,previous.onFrame,previous.onStatus);if(started){session.time=previous.time;retryState.time=previous.time;if(previous.pending)bridge.setParameters(previous.pending);}return started;},
    dispose(){const s=session;if(!s)return Promise.resolve();session=null;s.disposed=true;clearTimeout(s.timeout);s.observer?.disconnect();global.removeEventListener('message',s.listener);
      return new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);global.removeEventListener('message',ack);s.iframe.remove();resolve()};const ack=e=>{if(e.source===s.iframe.contentWindow&&e.origin==='null'&&e.data?.channel===CHANNEL&&e.data.nonce===s.nonce&&e.data.type==='disposed')finish()};global.addEventListener('message',ack);const timer=setTimeout(finish,250);try{s.iframe.contentWindow?.postMessage({channel:CHANNEL,nonce:s.nonce,type:'dispose'},'*')}catch(_){finish()}});
    }
  };global.EngineBridge=Object.freeze(bridge);
})(window);
