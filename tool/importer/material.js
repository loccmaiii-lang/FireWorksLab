// Presentation-only controls. Domain state, confirmation and writes remain owned by their original controllers.
const MaterialWorkbench=(()=>{
 const ICONS=/* MATERIAL_ICON_DATA */{};
 const panes=['queue','settings','preview'];
 const paneSelectors={queue:'.fw-queue-pane',settings:'.fw-settings-pane',preview:'.fw-name-review'};
 let pane='settings',initialized=false,toastTimer=null;
 const icon=(name)=>{const n=document.createElement('span');n.className='md-icon';n.setAttribute('aria-hidden','true');n.style.setProperty('--md-icon',`url("${ICONS[name]}")`);return n;};
 function addIcon(el,name){if(el&&!el.querySelector(':scope>.md-icon'))el.prepend(icon(name));}
 function toast(message){
  const n=document.getElementById('md-toast');if(!n)return;
  clearTimeout(toastTimer);n.querySelector('span').textContent=message;n.hidden=false;
  toastTimer=setTimeout(()=>{if(!n.matches(':focus-within'))n.hidden=true;},5000);
 }
 function errorField(id,message){
  const input=document.getElementById(id);if(!input)return;
  const hintId=id+'-md-error';let hint=document.getElementById(hintId);
  if(!hint){hint=document.createElement('p');hint.id=hintId;hint.className='md-field-error';input.after(hint);}
  hint.textContent=message;input.setAttribute('aria-invalid','true');
  if(!input.hasAttribute('aria-invalid')||!('mdDescription' in input.dataset))input.dataset.mdDescription=input.getAttribute('aria-describedby')||'';
  input.setAttribute('aria-describedby',hintId);
  setPane('settings');input.focus({preventScroll:true});input.scrollIntoView?.({block:'nearest'});
 }
 function clearField(input){
  if(!input.hasAttribute('aria-invalid'))return;
  document.getElementById(input.id+'-md-error')?.remove();input.removeAttribute('aria-invalid');
  if(input.dataset.mdDescription)input.setAttribute('aria-describedby',input.dataset.mdDescription);else input.removeAttribute('aria-describedby');
  delete input.dataset.mdDescription;
 }
 function syncPanes(){
  if(!initialized)return;
  const narrow=window.innerWidth<=1100,tabs=document.querySelector('.md-pane-tabs');tabs.hidden=!narrow;
  for(const name of panes){
   const panel=document.querySelector(paneSelectors[name]),tab=document.getElementById('md-pane-'+name);
   panel.hidden=narrow&&name!==pane;panel.setAttribute('role',narrow?'tabpanel':'region');panel.setAttribute('aria-labelledby',tab.id);tab.setAttribute('aria-selected',String(name===pane));tab.tabIndex=name===pane?0:-1;
  }
 }
 function setPane(name){if(!panes.includes(name))return;pane=name;syncPanes();}
 function pulse(target,event){
  if(!target||target.disabled||target.getAttribute('aria-disabled')==='true')return;
  const box=target.getBoundingClientRect(),ripple=document.createElement('span');ripple.className='md-ripple';
  ripple.style.left=((event?.clientX?event.clientX-box.left:box.width/2)||0)+'px';ripple.style.top=((event?.clientY?event.clientY-box.top:box.height/2)||0)+'px';
  target.classList.add('md-has-ripple');target.append(ripple);setTimeout(()=>ripple.remove(),350);
 }
 function segmentMode(select){
  if(select.dataset.mdSegmented)return;
  select.dataset.mdSegmented='true';select.classList.add('md-native-hidden');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  const group=document.createElement('div');group.className='md-segmented';group.setAttribute('role','radiogroup');group.setAttribute('aria-label','导入模式');
  for(const [value,title] of [['create','新建资源'],['update','同名更新']]){
   const b=document.createElement('button');b.type='button';b.textContent=title;b.dataset.mdMode=value;b.setAttribute('role','radio');
   b.setAttribute('aria-checked',String(select.value===value));b.tabIndex=select.value===value?0:-1;b.disabled=select.disabled;
   b.onclick=()=>{if(b.disabled||select.value===value)return;select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));
    queueMicrotask(()=>document.getElementById(select.id)?.nextElementSibling?.querySelector(`[data-md-mode="${value}"]`)?.focus({preventScroll:true}));};
   b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const target=group.querySelector('[data-md-mode="'+(e.key==='Home'?'create':e.key==='End'?'update':value==='create'?'update':'create')+'"]');target.focus();target.click();};
   group.append(b);
  }
  select.after(group);select.addEventListener('change',()=>{for(const b of group.children){b.setAttribute('aria-checked',String(select.value===b.dataset.mdMode));b.tabIndex=select.value===b.dataset.mdMode?0:-1;}});
 }
 function decorateFields(){
  document.querySelectorAll('#fwimp-detail input,#fwimp-detail select,#fwimp-editor input,#fwimp-editor textarea,#fwimp-editor select').forEach(input=>{
   if(input.id&&!input.labels?.length&&!input.hasAttribute('aria-label'))input.setAttribute('aria-label',input.placeholder||'设置');
  });
  for(const id of ['fwimp-mode','fwimp-editMode']){const select=document.getElementById(id);if(select)segmentMode(select);}
 }
 function syncBusy(){
  const busy=Workbench.busy;document.querySelector('.content').setAttribute('aria-busy',String(busy));
  for(const name of ['settings','preview'])document.querySelector(paneSelectors[name]).setAttribute('aria-busy',String(busy));
  document.querySelectorAll('.md-pane-tabs button').forEach(b=>b.disabled=busy);
 }
 function init(){
  if(initialized)return;initialized=true;document.body.dataset.designSystem='material3';
  const navIcons={asset:'content_copy',material:'texture',fwimp:'file_upload',weapon:'table_view',resfx:'tune',show:'celebration'};
  document.querySelectorAll('.sidebar .tab').forEach(b=>addIcon(b,navIcons[b.dataset.panel]));
  document.querySelectorAll('.nav-group>summary').forEach(n=>n.append(icon('expand_more')));
  const toolsToggle=document.getElementById('wb-tools-toggle');toolsToggle.textContent='';toolsToggle.setAttribute('aria-label','工具菜单');toolsToggle.title='工具菜单';addIcon(toolsToggle,'menu');addIcon(document.getElementById('wb-log-toggle'),'expand_more');
  addIcon(document.querySelector('.wb-log-link'),'help');for(const [id,name,label]of [['fwimp-add','add','添加素材'],['fwimp-bulk','table_view','批量编辑'],['fwimp-new','add','新建批次']]){const b=document.getElementById(id);b.textContent='';b.classList.add('fw-icon-action');b.setAttribute('aria-label',label);b.title=label;addIcon(b,name);}
  for(const id of ['fwimp-primary','fwimp-btnFinish','asset-btnExec','mat-btnExec','weapon-btnExec','resfx-btnExec','df-pattern-copy'])document.getElementById(id)?.setAttribute('data-md-primary','true');
  const tabs=document.createElement('div');tabs.className='md-pane-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','导入工作区视图');
  for(const [i,name] of panes.entries()){
   const panel=document.querySelector(paneSelectors[name]);panel.id ||= 'md-panel-'+name;
   const b=document.createElement('button');b.type='button';b.id='md-pane-'+name;b.textContent=['素材队列','导入设置','资产预览'][i];
   b.setAttribute('role','tab');b.setAttribute('aria-controls',panel.id);b.onclick=()=>setPane(name);
   b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
    const index=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;setPane(panes[index]);document.getElementById('md-pane-'+panes[index]).focus();};
   tabs.append(b);
  }
  document.querySelector('.fw-workspace-head').after(tabs);
  const result=document.createElement('div');result.id='md-toast';result.className='md-toast';result.hidden=true;result.setAttribute('role','status');result.setAttribute('aria-live','polite');result.setAttribute('aria-atomic','true');
  const message=document.createElement('span'),dismiss=document.createElement('button');dismiss.type='button';dismiss.setAttribute('aria-label','关闭结果提示');dismiss.append(icon('close'));dismiss.onclick=()=>{result.hidden=true;};result.append(message,dismiss);document.body.append(result);
  document.addEventListener('pointerdown',e=>{const target=e.target.closest('button,summary');if(target)pulse(target,e);});
  document.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&!e.repeat)pulse(e.target.closest('button,summary'));});
  document.addEventListener('input',e=>{if(e.target.matches('input,select,textarea'))clearField(e.target);});
  document.addEventListener('workbench-busy',syncBusy);document.addEventListener('workbench-idle',syncBusy);
  window.addEventListener('resize',()=>{
   const focused=document.activeElement;syncPanes();
   if(focused?.closest('.fw-workspace>section[hidden]'))document.getElementById('md-pane-'+pane).focus({preventScroll:true});
  });
  const observer=new MutationObserver(decorateFields);for(const id of ['fwimp-detail','fwimp-editor'])observer.observe(document.getElementById(id),{childList:true});
  document.getElementById('fwimp-primary').setAttribute('aria-describedby','fwimp-execHint fwimp-status');
  document.getElementById('fwimp-actions').setAttribute('aria-label','下一步与导入状态');
  for(const id of ['fwimp-status','fwimp-feedback','wb-task'])document.getElementById(id).setAttribute('aria-live','polite');
  decorateFields();syncPanes();syncBusy();
 }
 return{init,setPane,toast,errorField,decorateFields,syncPanes};
})();
