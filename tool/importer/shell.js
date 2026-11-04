const Workbench = (() => {
  let busy=false, listen=null;
  const names={asset:['资产处理','特效资产复制','选择复制目标与优化规则，检查资产后执行。'],material:['资产处理','材质实例复制','选择转换方向，确认母材质与目标路径。'],weapon:['数据配表','整枪配表','生成七张表的计划，确认号段与字段后写入。'],resfx:['数据配表','ResourceFX 配表','检查资源路径、行名与中文描述，再写入数据表。'],fwimp:['资产处理','烟花素材导入','选择新建或同名更新，预览并确认操作清单，再执行。'],show:['编排设计','烟花编排','按数量、配比与顺序生成节奏，在右侧预览动作和数值。']};
  function settings(){try{return JSON.parse(localStorage.getItem('df.workbench.shell')||'{}');}catch{return{};}}
  function store(v){try{localStorage.setItem('df.workbench.shell',JSON.stringify({...settings(),...v}));}catch{}}
  async function run(label,fn){if(busy){log('已有任务运行，请等待当前任务结束。','warn');return;}busy=true;document.querySelectorAll('.tool-fieldset').forEach(f=>f.disabled=true);document.querySelectorAll('.sidebar .tab').forEach(b=>b.disabled=true);$('wb-reconnect').disabled=true;$('wb-task').textContent=label+'…';document.dispatchEvent(new Event('workbench-busy'));try{return await fn();}catch(e){log(label+'失败：'+(e.message||e),'err');}finally{busy=false;document.querySelectorAll('.tool-fieldset').forEach(f=>f.disabled=false);document.querySelectorAll('.sidebar .tab').forEach(b=>b.disabled=false);$('wb-reconnect').disabled=false;$('wb-task').textContent='就绪';document.dispatchEvent(new Event('workbench-idle'));}}
  function openLog(){WorkbenchLog.setOpen(true);store({logsOpen:true});}
  function toggleLog(){const open=document.querySelector('.logcard').classList.contains('is-folded');WorkbenchLog.setOpen(open);store({logsOpen:open});}
  function init(){
    for(const name of ['asset','material','weapon','resfx']){const panel=$('panel-'+name);const field=document.createElement('fieldset');field.className='tool-fieldset';while(panel.firstChild)field.append(panel.firstChild);panel.append(field);const cards=[...field.children].filter(x=>x.classList.contains('card'));const previewId={asset:'asset-previewTable',material:'mat-previewTable',weapon:'weapon-plan',resfx:'resfx-plan'}[name];const layout=document.createElement('div');layout.className='tool-layout';const input=document.createElement('div'),output=document.createElement('div');input.className='tool-input';output.className='tool-output';let reached=false;for(const card of cards){if(card.contains($(previewId)))reached=true;(reached?output:input).append(card);if(card.querySelector('[id$="btnExec"]'))card.classList.add('execution-card');}layout.append(input,output);field.append(layout);}
    for(const [obj,list]of [[AssetCopier,['doParse','doRefreshPreview','doExec']],[MaterialCopier,['doParse','doRefreshPreview','doExec']],[WeaponConfig,['doDryRun','doExec']],[ResourceFX,['doParse','doExec']]])for(const name of list){const original=obj[name];obj[name]=function(...args){return run(name==='doExec'?'执行任务':'检查与预览',()=>original.apply(this,args));};}
    const originalSwitch=switchPanel;switchPanel=function(name){if(busy)return;if(!names[name])name='fwimp';originalSwitch(name);const [group,title,description]=names[name];$('wb-breadcrumb').textContent=group;$('wb-title').textContent=title;$('wb-description').textContent=description;document.querySelectorAll('.sidebar .tab').forEach(b=>{if(b.dataset.panel===name){b.setAttribute('aria-current','page');b.closest('details').open=true;}else b.removeAttribute('aria-current');});ShowComposer.setActive(name==='show');ShowProjectUI.setActive(name==='show');store({panel:name});};
    WorkbenchLog.init(settings().logsOpen===true);
    const originalLog=log;log=function(message,kind){const position=WorkbenchLog.beforeAppend();originalLog(message,kind);WorkbenchLog.afterAppend(message,kind,position);if(listen)listen(message,kind);};
    const originalClear=clearLog;clearLog=function(){originalClear();WorkbenchLog.clear();};
    const originalReconnect=recheckConn;recheckConn=()=>run('检测连接',originalReconnect);
    ShowComposer.init();ShowProjectUI.init();
    const p=settings();
    const hash=location.hash.slice(1);switchPanel(hash==='mat'?'material':names[hash]?hash:(p.panel||'fwimp'));
    document.querySelectorAll('textarea,input[type=text],select').forEach(el=>{if(!el.getAttribute('aria-label')&&!el.labels?.length)el.setAttribute('aria-label',el.placeholder||el.id||'设置');});
    FwImporter.init();
  }
  window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='任务正在运行，请保持页面打开。';}});
  return{init,run,toggleLog,openLog,get busy(){return busy;},onLog(fn){listen=fn;}};
})();
