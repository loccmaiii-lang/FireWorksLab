// Independent delivery entry: move native controls, never clone domain state or handlers.
window.FwDeliveryPresentation=(()=>{
  let executionIds=[],lastView='',returnFocus=null,context=null,pendingView=null,queued=false,lastObject='',animations=[];
  const settingsOpen=new Map(),gpuPolicies=new Map(),byId=id=>document.getElementById(id),native=id=>byId('fwimp-'+id);
  function policyExpanded(id){return gpuPolicies.get(id)?.open;}
  const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  function setContext(receipt){context=receipt;const image=byId('delivery-resource-thumbnail');if(image)delete image.dataset.failedSrc;sync(FwImporter.deliveryView());}
  function executionStart(ids){executionIds=[...ids];returnFocus=document.activeElement;sync(FwImporter.deliveryView());WorkbenchLog.setOpen(true);byId('delivery-log-title').focus({preventScroll:true});}
  function sync(view){
    if(!byId('delivery-platforms'))return;
    for(const platform of ['pc','mobile']){
      const button=byId('delivery-platform-'+platform),current=view.current;
      button.disabled=view.busy||!current||!view.rows.some(r=>(current.deliveryId?r.deliveryId===current.deliveryId:r.dir===current.dir)&&r.platform===platform);
      button.setAttribute('aria-pressed',String(current?.platform===platform));
    }
    const progress=byId('delivery-log-progress'),completed=view.rows.filter(r=>executionIds.includes(r.id)&&r.state==='done').length;
    progress.max=Math.max(1,executionIds.length);progress.value=completed;progress.hidden=!executionIds.length;
    progress.setAttribute('aria-valuetext',`本次 ${executionIds.length} 包中完成 ${completed} 包`);
    const track=byId('delivery-log-progress-track');track.hidden=progress.hidden;track.style.setProperty('--delivery-progress',`${executionIds.length?100*completed/executionIds.length:0}%`);
    const snapshot=JSON.stringify({busy:view.busy,current:view.current});if(lastView!==snapshot){lastView=snapshot;if(parent!==window)parent.postMessage({type:'workspace-view-state',busy:view.busy,current:view.current},location.origin);}
    pendingView=view;if(!queued){queued=true;queueMicrotask(()=>{queued=false;decorate(pendingView);});}
  }
  function flow(view){
    const selected=view.rows.filter(r=>r.selected),confirmed=selected.filter(r=>r.confirmed).length;
    const finished=selected.length&&selected.every(r=>['done','pending'].includes(r.state));
    const stage=finished?3:view.phase==='executing'||(selected.length&&selected.every(r=>r.confirmed))?2:selected.some(r=>r.checked)||view.phase==='checking'?1:0;
    const labels=[view.current?.deliveryId?'已导出':view.rows.length?'手动接入':'待导出',view.phase==='checking'?'正在检查':`${confirmed} / ${selected.length} 包已确认`,view.phase==='executing'?'执行中':finished?'导入已报告完成':selected.some(r=>r.state==='failed')?'失败，查看日志':'待执行','尚未登记'];
    ['export','check','import','register'].forEach((key,i)=>{const n=byId('delivery-flow-'+key);n.classList.toggle('active',i===stage);n.classList.toggle('completed',i<stage);if(i===stage)n.setAttribute('aria-current','step');else n.removeAttribute('aria-current');n.querySelector('small').textContent=labels[i];});
    byId('delivery-flow-hint').textContent=finished?'下一步：核对演出登记方案':selected.length?'核对当前平台包后确认':'选择资源，检查后确认导入';
  }
  function decorateDetail(view){
    const current=view.current,detail=native('detail');if(!current||view.editing)return;
    let complete=byId('delivery-full-settings');
    if(!detail.querySelector('.delivery-main-settings')){
      const mode=native('mode'),name=native('name');if(!mode||!name)return;
      const main=make('div','delivery-main-settings'),modeLabel=detail.querySelector('label[for="fwimp-mode"]'),nameField=name.parentElement;
      // Retain the actual select instead of installing a second mode control.
      mode.dataset.mdSegmented='true';mode.classList.remove('md-native-hidden');mode.removeAttribute('aria-hidden');mode.tabIndex=0;
      detail.querySelector('.md-segmented')?.remove();modeLabel.textContent='处理方式';nameField.querySelector('label').textContent='效果英文名';
      main.append(modeLabel,mode,make('p','hint','新建阻止同名覆盖；同名更新按检查清单处理。'),nameField,make('p','hint','PC / 手机分别核对；平台后缀由原导入器处理。'));
      complete=make('details','delivery-full-settings');complete.id='delivery-full-settings';complete.open=!!settingsOpen.get(current.id);
      complete.append(make('summary','','查看完整设置'));const body=make('div','delivery-full-settings-body');
      for(const n of [...detail.childNodes])body.append(n);complete.append(body);complete.addEventListener('toggle',()=>settingsOpen.set(current.id,complete.open));detail.append(main);
      const system=make('section','delivery-setting-group');system.append(make('h4','','粒子系统设置'));
      const values=current.policyReady?(current.particleSkipped?[['本次粒子','跳过']]:[['时间步长','固定 10 FPS'],['剔除距离','1,200 m'],['GPU 发射器',`本包 ${current.gpuCount} 个`]]):[['配置状态','待检查']];
      const dl=make('dl');for(const [label,value]of values)dl.append(make('dt','',label),make('dd','',value));system.append(dl);
      const inspect=make('button','btn ghost delivery-setting-link','查看完整设置');inspect.type='button';inspect.onclick=()=>{complete.open=true;complete.scrollIntoView?.({block:'nearest'});complete.querySelector('summary').focus({preventScroll:true});};system.append(inspect);detail.append(system);
      const time=make('section','delivery-setting-group');time.append(make('h4','','产物时间'),make('div','delivery-duration',current.duration===null?'待核验':`${Number(current.duration.toFixed(3))} s`),make('p','hint','当前平台配置播放时长'));
      const explain=make('details');explain.append(make('summary','','时长说明'),make('p','hint','按已检查配置的发射延迟与单次播放时长计算。循环、GPU 与实际播放另行核验；制作时长和裁帧后的资源时长可能不同。'));time.append(explain);detail.append(time);
      const register=make('section','delivery-setting-group');register.append(make('h4','','演出资源登记'),make('p','hint','尚未登记；导入成功后核对资产与登记方案。'));detail.append(register,complete);
    }
    const values=current.policyReady?(current.particleSkipped?[['本次粒子','跳过']]:[['时间步长','固定 10 FPS'],['剔除距离','1,200 m'],['GPU 发射器',`本包 ${current.gpuCount} 个`]]):[['配置状态','待检查']];
    const dl=detail.querySelector('.delivery-setting-group dl');dl.replaceChildren();for(const [label,value]of values)dl.append(make('dt','',label),make('dd','',value));
    detail.querySelector('.delivery-duration').textContent=current.duration===null?'待核验':`${Number(current.duration.toFixed(3))} s`;
    const policy=native('reviewContent').querySelector('.fw-gpu-policy');if(policy&&complete){const old=complete.querySelector('.fw-gpu-policy');old?.remove();complete.querySelector('.delivery-full-settings-body').append(policy);gpuPolicies.set(current.id,policy);}
  }
  function decoratePreview(view){
    native('reviewHeading').textContent='资产清单';native('paths').textContent=native('paths').getAttribute('aria-expanded')==='true'?'收起目标目录':'目标目录';
    const current=view.current,identity=native('reviewContent').querySelector('.fw-preview-identity');if(identity&&current){
      identity.querySelector('strong').textContent=(current.platform==='mobile'?'手机':'PC')+' · '+current.name;
      if(!identity.querySelector('.delivery-review-help'))identity.append(make('p','delivery-review-help',current.state==='done'?'导入器已报告完成；保存及实际播放另行验收。':current.confirmed?'本包已确认；改变设置或范围后需要重新检查确认。':'核对以下名称与处理方式后确认此包。'));
    }
    const table=native('reviewContent').querySelector('table');if(table){
      const heads=table.querySelectorAll('thead th');heads[0].textContent='导入 / 类型';heads[2].textContent='最终资产名称';heads[3].textContent='处理计划';
      for(const row of table.querySelectorAll('tbody tr')){
        const type=row.querySelector('.fw-asset-choice>span');type?.classList.remove('fw-sr');
        const key=row.querySelector('[data-asset-key]')?.dataset.assetKey,path=current&&view.rows.find(r=>r.id===current.id)?.assets[key];
        const shared=path&&view.rows.some(r=>r.id!==current.id&&r.platform!==current.platform&&r.assets[key]===path);
        if(shared&&!row.querySelector('.delivery-shared-note'))row.children[2].append(make('small','delivery-shared-note','PC / 手机共用；同一目标去重'));
        const sheet=current&&view.rows.find(r=>r.id===current.id)?.textureSheets?.[key];
        if(sheet&&!row.querySelector('.delivery-sheet-note'))row.children[2].append(make('small','delivery-shared-note delivery-sheet-note',(sheet.layers.length===1?'第 '+sheet.layers[0]+' 编辑图层 · ':'')+'序列第 '+Number(sheet.index)+' 张（'+sheet.index+'）'));
      }
      if(!native('reviewContent').querySelector('.delivery-dependency-note'))table.parentElement.after(make('p','delivery-dependency-note','粒子依赖材质与贴图；取消必需依赖后重新检查范围。共用目标由原导入器去重。'));
    }
  }
  function decorate(view){
    flow(view);const current=view.current,receipt=current?.deliveryId===context?.deliveryId?context:null;
    byId('delivery-resource-name').textContent=receipt?.metadata?.recipe?.name||receipt?.name||current?.name||'尚无交付资源';
    byId('delivery-resource-name').title=byId('delivery-resource-name').textContent;
    byId('delivery-resource-revision').textContent=receipt?'修订 '+receipt.revisionId.slice(0,8):current?.deliveryId?'当前交付修订':'手动素材';
    byId('delivery-resource-state').textContent=current?.state==='done'?'导入已报告完成':current?.deliveryId?'已导出 · 待核对 UE':'检查后确认导入';
    const image=byId('delivery-resource-thumbnail'),fallback=byId('delivery-thumbnail-fallback');
    const src=receipt?.thumbnail?.status==='ready'?(receipt.thumbnailURL||(location.protocol==='file:'?'http://127.0.0.1:8034':location.origin)+'/api/deliveries/'+encodeURIComponent(receipt.deliveryId)+'/'+receipt.thumbnail.file.split('/').map(encodeURIComponent).join('/')):'';
    image.hidden=!src||image.dataset.failedSrc===src;fallback.hidden=!image.hidden;fallback.textContent=src?'缩略图暂不可用':'暂无缩略图';
    if(src&&image.getAttribute('src')!==src)image.src=src;
    byId('delivery-queue-count').textContent=view.rows.length+' 包';byId('delivery-history-title').textContent='历史与批次 · '+view.historyCount;
    byId('delivery-queue-check').disabled=native('btnPreview').disabled;
    for(const row of view.rows){const n=native('list').querySelector(`[data-id="${row.id}"]`);if(!n)continue;const button=n.querySelector('.fw-item-name');button.title=row.name+'\n'+row.dir;
      if(row.deliveryId){button.querySelector('strong').textContent=row.platform==='mobile'?'手机资源包':'PC 资源包';if(!button.querySelector('.delivery-package-file'))button.append(make('small','delivery-package-file',row.platform==='mobile'?'cascade_mobile.json':'cascade.json'));}
    }
    decoratePreview(view);decorateDetail(view);
    const selected=view.rows.filter(r=>r.selected&&!['done','pending'].includes(r.state)),primary=native('primary'),execute=native('btnExec');
    if(selected.length&&!view.editing)native('execSummary').textContent='检查通过 '+selected.filter(r=>r.checked).length+' 包 · 已确认 '+selected.filter(r=>r.confirmed).length+' / '+selected.length;
    const moveConfirmFocus=document.activeElement===primary;
    native('btnPreview').textContent='重新检查';primary.hidden=primary.dataset.action==='execute';primary.classList.toggle('ghost',!view.editing);primary.removeAttribute('data-md-primary');
    if(primary.dataset.action==='confirm')primary.textContent='确认 '+(current?.platform==='mobile'?'手机':'PC')+' 包';
    execute.hidden=view.editing;execute.textContent=view.phase==='executing'?'正在导入…':view.rows.length&&view.rows.every(r=>['done','pending'].includes(r.state))?'本次导入已完成':'导入已确认的 '+selected.length+' 包';
    if(primary.hidden&&moveConfirmFocus&&!execute.disabled)execute.focus({preventScroll:true});
    if(current?.id!==lastObject){for(const animation of animations)animation.cancel();animations=[];lastObject=current?.id||'';
      if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)for(const n of [native('detail'),native('reviewContent')])if(n.animate)animations.push(n.animate([{opacity:.5,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:140,easing:'cubic-bezier(.2,0,0,1)'}));
    }
  }
  function init(){
    document.documentElement.classList.add('delivery-embedded','fw-scope');document.body.classList.add('fw-scope');
    const connection=make('div','delivery-connection');connection.setAttribute('aria-label','UE 连接');
    const badge=byId('conn');badge.setAttribute('role','status');badge.setAttribute('aria-live','polite');connection.append(badge,byId('wb-reconnect'));
    document.querySelector('.fw-workspace-head').append(connection);
    const title=document.querySelector('.fw-settings-pane>.fw-pane-title');title.textContent='当前包设置';
    const platforms=make('div','fw-segments');platforms.id='delivery-platforms';platforms.setAttribute('role','group');platforms.setAttribute('aria-label','查看平台包');
    for(const [key,label]of [['pc','PC'],['mobile','手机']]){const b=make('button','',label);b.type='button';b.id='delivery-platform-'+key;b.onclick=()=>FwImporter.selectDeliveryPlatform(key);platforms.append(b);}title.append(platforms);
    document.querySelector('.fw-steps').hidden=true;const flow=make('ol','delivery-flow');flow.id='delivery-flow';flow.setAttribute('aria-label','制作与交付步骤');
    ['目录导出','核对清单','导入资源','演出登记'].forEach((label,i)=>{const li=make('li');li.id='delivery-flow-'+['export','check','import','register'][i];const text=make('div');text.append(make('b','',label),make('small'));li.append(make('span','delivery-step-number',String(i+1)),text);flow.append(li);});
    const hint=make('small');hint.id='delivery-flow-hint';document.querySelector('.fw-workspace-head').append(flow,hint);
    const pane=document.querySelector('.fw-queue-pane'),head=pane.querySelector('.fw-queue-head'),summary=native('queueSummary');summary.hidden=true;head.querySelector('h3').replaceChildren('资源与队列');
    const refresh=make('button','btn ghost');refresh.id='delivery-queue-check';refresh.type='button';refresh.setAttribute('aria-label','重新检查所选资源');const refreshIcon=make('span','fw-icon');refreshIcon.dataset.fwIcon='refresh';refresh.append(refreshIcon);FWIcons.apply(refresh);refresh.onclick=()=>FwImporter.preview();
    const body=make('div','delivery-queue-body'),resource=make('div','delivery-resource-summary'),image=make('img');image.id='delivery-resource-thumbnail';image.alt='当前交付资源缩略图';image.hidden=true;const info=make('div');for(const [tag,id]of [['b','name'],['small','revision'],['small','state']]){const n=make(tag);n.id='delivery-resource-'+id;info.append(n);}const fallback=make('span','delivery-thumbnail-fallback','暂无缩略图');fallback.id='delivery-thumbnail-fallback';fallback.hidden=true;
    image.addEventListener('error',()=>{image.dataset.failedSrc=image.src;image.hidden=true;fallback.hidden=false;fallback.textContent='缩略图暂不可用';});
    image.addEventListener('load',()=>{if(image.naturalWidth){delete image.dataset.failedSrc;image.hidden=false;fallback.hidden=true;}});resource.append(image,fallback,info);
    const group=make('div','delivery-queue-group','本次导入'),count=make('span');count.id='delivery-queue-count';group.append(count,summary);
    const history=make('details','delivery-history'),historyTitle=make('summary');historyTitle.id='delivery-history-title';history.append(historyTitle,pane.querySelector('.fw-toolbar'));
    const management=make('details','delivery-management');management.append(make('summary','','筛选与批量操作'),pane.querySelector('.fw-list-head'),pane.querySelector('.fw-selection-row'),native('bulk'));history.append(management);
    const bottom=make('div','delivery-queue-bottom'),add=native('add');add.classList.remove('fw-icon-action');add.textContent='手动接入其他资源';add.setAttribute('aria-label','手动接入其他资源');bottom.append(add,native('queueTab'));
    body.append(resource,group,native('list'),make('p','delivery-queue-note','PC 与手机分别确认；共用贴图只执行一次。'),history,bottom);pane.append(body);
    const actions=native('actions').querySelector('.row');native('btnPreview').classList.remove('fw-legacy-action');actions.prepend(native('btnPreview'));native('btnExec').classList.remove('fw-legacy-action');native('btnExec').setAttribute('data-md-primary','true');actions.append(native('btnExec'));
    head.replaceChildren(head.querySelector('h3'),refresh);
    const log=document.querySelector('.logcard'),logHead=log.querySelector('.head');native('actions').before(log);
    const heading=make('h2','','操作日志');heading.id='delivery-log-title';heading.tabIndex=-1;logHead.prepend(heading);
    byId('wb-last-log').hidden=true;byId('wb-last-log').setAttribute('aria-live','off');byId('wb-log-toggle').textContent='展开';
    const progress=make('progress','fw-progress');progress.id='delivery-log-progress';progress.setAttribute('aria-label','已完成的平台包');progress.hidden=true;
    const track=make('div','delivery-progress-track');track.id='delivery-log-progress-track';track.hidden=true;const fill=make('span','delivery-progress-fill');fill.setAttribute('aria-hidden','true');track.append(progress,fill);logHead.after(track);
    const placeLog=open=>{const anchor=native(open?'actions':'status');if(open?log.nextElementSibling===anchor:anchor.nextElementSibling===log)return;const focus=document.activeElement;if(open)anchor.before(log);else anchor.after(log);if(focus?.isConnected)focus.focus({preventScroll:true});};
    const originalOpen=WorkbenchLog.setOpen;WorkbenchLog.setOpen=open=>{placeLog(open);originalOpen(open);byId('wb-log-toggle').textContent=open?'收起':'展开';};
    new MutationObserver(()=>{const open=!log.classList.contains('is-folded');placeLog(open);byId('wb-log-toggle').textContent=open?'收起':'展开';}).observe(log,{attributes:true,attributeFilter:['class']});
    const logs=byId('log');if(logs.firstChild?.nodeType===3&&/^\s*日志区/.test(logs.firstChild.textContent))logs.firstChild.remove();
    log.setAttribute('aria-label','操作日志');logs.setAttribute('role','log');logs.setAttribute('aria-live','polite');
    log.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();WorkbenchLog.setOpen(false);(returnFocus?.isConnected&&!returnFocus.disabled?returnFocus:byId('wb-log-toggle')).focus({preventScroll:true});}});
    document.addEventListener('workbench-idle',()=>sync(FwImporter.deliveryView()));sync(FwImporter.deliveryView());WorkbenchLog.setOpen(false);
  }
  init();return{sync,executionStart,setContext,policyExpanded};
})();
