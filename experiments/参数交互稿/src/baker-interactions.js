// 隔离交互稿只操作 DOM；所有参数事件仍由原烘焙器处理。
const draftRight=document.querySelector('#right');
const draftContent=document.createElement('div');draftContent.id='rightContent';draftRight.appendChild(draftContent);
for(const child of [...draftRight.children])if(child!==draftContent&&!child.classList.contains('right-head'))draftContent.appendChild(child);
const draftDock=document.createElement('section');draftDock.id='helpDock';draftDock.hidden=true;draftDock.setAttribute('aria-label','参数说明');
draftDock.innerHTML=`<div class="help-head"><b id="helpTitle"></b><button type="button" id="helpReset">恢复默认</button><button type="button" id="helpClose" aria-label="关闭说明">关闭</button></div><div id="pHelp" class="phelp"></div>`;draftRight.appendChild(draftDock);
let draftHelpRow=null,draftHelpTrigger=null,draftHelpAnchor=null;
function draftOpenHelp(title,trigger,row){
 draftHelpRow=row||null;draftHelpTrigger=trigger||null;draftHelpAnchor=row||trigger?.closest('summary');document.querySelector('#helpTitle').textContent=title;
 document.querySelector('#helpReset').hidden=!row?.querySelector('.k');draftDock.hidden=false;
 document.querySelectorAll('.param-help[aria-pressed=true],.shelp[aria-pressed=true]').forEach(b=>b.setAttribute('aria-pressed','false'));
 trigger?.setAttribute('aria-pressed','true');
 requestAnimationFrame(draftEnsureHelpVisible);
}
function draftEnsureHelpVisible(){
 if(draftDock.hidden||!draftHelpAnchor?.isConnected)return;
 const area=draftContent.getBoundingClientRect(),anchor=draftHelpAnchor.getBoundingClientRect();
 if(anchor.top<area.top+8)draftContent.scrollTop+=anchor.top-area.top-8;
 else if(anchor.bottom>area.bottom-8)draftContent.scrollTop+=anchor.bottom-area.bottom+8;
}
new ResizeObserver(draftEnsureHelpVisible).observe(draftContent);
function draftCloseHelp(returnFocus=false){
 draftDock.hidden=true;draftHelpTrigger?.setAttribute('aria-pressed','false');
 if(returnFocus&&draftHelpTrigger?.isConnected)draftHelpTrigger.focus({preventScroll:true});
 draftHelpRow=null;draftHelpAnchor=null;if(typeof curvesHot==='function')curvesHot(null);
}
function attachParameterHelp(row,it){
 row._it=it;let helpRow=row;const b=document.createElement('button');b.type='button';b.className='param-help';b.textContent='?';
 b.setAttribute('aria-label',`查看 ${row._lab} 说明`);b.setAttribute('aria-controls','helpDock');b.setAttribute('aria-pressed','false');
 b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();panelHelp(helpRow);draftOpenHelp(helpRow._lab,b,helpRow);});
 row.addEventListener('keydown',e=>{if(e.key==='F1'){e.preventDefault();b.click();}});row.appendChild(b);row.querySelector('.k,.fk')?.removeAttribute('title');
 if(row.classList.contains('field')){
  const wrap=document.createElement('div');wrap.className='field-with-help';row.before(wrap);wrap.append(row,b);
  for(const key of ['_it','_lab','_detail','_nm','_refresh'])wrap[key]=row[key];helpRow=wrap;return wrap;
 }
 return row;
}
function draftMaterialHelp(host){
 for(const row of host.querySelectorAll('.sl')){
  const label=row.querySelector('.k'),range=row.querySelector('input[type=range]');
  row._lab=label.childNodes[0].textContent;row._detail=document.querySelector('#colorControls .hint').textContent;
  attachParameterHelp(row,[range.id,row._lab,label.querySelector('small')?.textContent||'',+range.min,+range.max,+range.step]);
 }
}
function draftMoreLabel(m){
 const n=m._draftCount||0;m.querySelector('summary .mn').textContent=m.open?'收起更多参数':`展开更多参数（${n} 项）`;
 m.querySelector('summary').setAttribute('aria-expanded',String(m.open));
}
document.querySelector('#helpClose').addEventListener('click',()=>draftCloseHelp(true));
document.querySelector('#helpReset').addEventListener('click',()=>{const r=draftHelpRow;r?.querySelector('.k')?.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));if(r?.isConnected)panelHelp(r);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!draftDock.hidden){e.preventDefault();e.stopImmediatePropagation();draftCloseHelp(true);}},true);
document.querySelector('#ptabs').addEventListener('click',()=>draftCloseHelp());
document.querySelector('#paramNav').addEventListener('change',()=>draftCloseHelp());
