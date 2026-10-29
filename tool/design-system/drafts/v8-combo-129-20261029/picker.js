/* 129应用本页组件样式；自由备注只存文本，不接生产存档或烘焙。 */
(() => {
  'use strict';
  const data=JSON.parse(document.getElementById('picker-data').textContent),items=data.catalog.items,samples=data.samples;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label={current:'保留128当前',material:'Material',adobe:'Adobe'},channel='fwl-style-picker/1',storageKey='fwl.component-choice.20261029.v8.129';
  const frames={left:$('#left-frame'),right:$('#right-frame')},loaded={left:'',right:''};
  let choices={},active='TREE',view='mix',expanded='',dirty=false,storageOkay=true,rightReady=false,inspectPending=null,appliedIds=[];
  function tell(text,error=false){$('#status').textContent=text;$('#status').dataset.error=String(error);}
  function current(){return items.find(x=>x.id===active);}
  function validate(record){
    if(!record||record.schema!=='fwl.component-choice/1'||!Array.isArray(record.components))throw Error('需要fwl.component-choice/1选择文件。');
    if(record.components.length!==items.length)throw Error(`需要完整的${items.length}类选择。`);
    const seen=new Set(),next={};
    for(const row of record.components){
      if(!row||!items.some(x=>x.id===row.id)||seen.has(row.id))throw Error('组件编号未知或重复，原选择未改。');
      if(!['current','material','adobe'].includes(row.selected))throw Error(`${row.id}的选择不合法。`);
      if(row.note!==undefined&&(typeof row.note!=='string'||row.note.length>500))throw Error(`${row.id}备注须为500字以内。`);
      seen.add(row.id);next[row.id]={selected:row.selected,note:row.note||'',reviewed:row.reviewed===true};
    }
    return next;
  }
  function chosenIds(){return items.filter(x=>choices[x.id]?.reviewed&&choices[x.id].selected!=='current').map(x=>x.id);}
  function greenNote(id){return data.profile.accentOverrides[id]==='theme'&&choices[id]?.selected==='adobe';}
  function record(){return {schema:'fwl.component-choice/1',comboVersion:'129',sourceVersion:'4.9.128',createdAt:new Date().toISOString(),status:'129组件组合Demo；未应用生产',source:data.manifest,components:items.map(item=>{const pick=choices[item.id];return {id:item.id,name:item.name,...pick,current128:item.current,selectedLabel:label[pick.selected],preview:{mapped:pick.selected==='current'||!!samples[item.id]?.overrideCSS?.[pick.selected],loaded:appliedIds.includes(item.id),themeGreen:greenNote(item.id),productionApplied:false},candidate:pick.selected==='current'?item.current:item[pick.selected]};})};}
  function remember(message){dirty=true;try{localStorage.setItem(storageKey,JSON.stringify(record()));storageOkay=true;}catch(_){storageOkay=false;}if(message)tell(message+(storageOkay?' · 本机已记住':' · 请下载HTML或JSON保存'));}
  function applicationState(){
    $('#application-state').hidden=view!=='mix';
    if(view==='mix')$('#application-state').textContent=rightReady?`组合样式已载入 ${appliedIds.length} / ${chosenIds().length} 类`:'正在载入组合样式…';
  }
  function renderIndex(){
    $('#family-count').textContent=items.length;
    $('#families').innerHTML=items.map(x=>{const p=choices[x.id];return `<button data-family="${escape(x.id)}" aria-current="${x.id===active}"><b>${escape(x.name)}</b><span>${p.reviewed?escape(p.selected==='current'?'128':label[p.selected]):'未选'}</span></button>`;}).join('');
    $('#decision-count').textContent=`已选择 ${Object.values(choices).filter(x=>x.reviewed).length} / ${items.length}`;
  }
  function sourceDetail(item){
    return `<div class="source-line"><strong>129组合映射</strong> ${escape((item.implementation_sources||[]).join(' · '))}${greenNote(item.id)?'<p>已应用主题绿定制；自由备注不会被执行为代码。</p>':''}</div>`+
      [['128来源',item.current],['Material方向',item.material],['Adobe方向',item.adobe]].map(([title,x])=>`<div class="source-line"><strong>${title}</strong> ${escape((x.spec||[]).join(' '))}<br><code>${escape((x.sources||[]).join(' · '))}</code>${x.note?`<p>${escape(x.note)}</p>`:''}</div>`).join('');
  }
  function setDoc(side,html,key){if(loaded[side]===key)return;loaded[side]=key;if(side==='right'){rightReady=false;appliedIds=[];}frames[side].srcdoc=html;}
  function mixCss(){return items.map(x=>{const p=choices[x.id];return p.reviewed&&p.selected!=='current'?(samples[x.id]?.overrideCSS?.[p.selected]||''):'';}).join('\n');}
  function send(){
    for(const [side,frame] of Object.entries(frames)){
      frame.contentWindow?.postMessage({channel,type:'mode',mode:$('#scope').value},'*');
      const on=view==='mix'&&side==='right';
      frame.contentWindow?.postMessage({channel,type:'apply-choices',version:'129',css:on?mixCss():'',familyIds:on?chosenIds():[]},'*');
    }
    applicationState();
  }
  function inspect(){if(view!=='mix'){view='mix';expanded='';render();}inspectPending=active;if(rightReady){frames.right.contentWindow?.postMessage({channel,type:'inspect-family',family:inspectPending},'*');inspectPending=null;}}
  function render(){
    const item=current(),sample=samples[active],pick=choices[active],catalog=view==='catalog';
    renderIndex();$$('[data-view]').forEach(x=>{const on=x.dataset.view===view;x.setAttribute('aria-selected',String(on));x.tabIndex=on?0:-1;});
    $('.pair').dataset.expanded=expanded;$$('.expand-pane').forEach(x=>x.textContent=expanded===x.dataset.pane?'还原双栏':'放大');
    $('#scene-mode').hidden=catalog;$('#inspect-combo').hidden=view!=='mix';
    $('#review-title').textContent=catalog?`${item.id} · ${item.name}`:view==='mix'?'我的组合 129':'原 B / 128 · 比较基线';
    $('#review-subtitle').textContent=catalog?'同内容控件对照；129的Adobe滑杆、下拉、菜单已加入主题绿。':view==='mix'?'左侧原B；右侧按你的选择应用14类组件，保留128真实物理层级。':'原稿保留供比较；此页不启用129组合覆盖。';
    $('#current-note>strong').textContent=view==='mix'?'129 当前应用':'128 来源备注';
    $('#current-note>p').textContent=view==='mix'?`${item.name}：${label[pick.selected]}${greenNote(active)?' · 主题绿定制':''}${pick.note?' · '+pick.note:''}`:`${item.name}：${item.current.note}`;
    $('#source-detail').innerHTML=sourceDetail(item);
    $('#left-choice').hidden=!catalog;$('#right-choice').hidden=!catalog;
    $('#left-title').textContent=catalog?item.material.label:'分组聚焦 B · 原稿保留';
    $('#right-title').textContent=catalog?item.adobe.label:view==='mix'?'我的组合129 · 14类实际映射':'4.9.128 · 原组件样本';
    $('#left-note').textContent=catalog?(sample.sampleNote||'组件状态样板'):'原40字段交互 · 静态烟花参考';
    $('#right-note').textContent=catalog?(sample.sampleNote||'129项目组件'):view==='mix'?'含长菜单、弹层、进度、树与颜色的操作检查':'原DOM与原CSS · 业务为样本';
    $('#left-choice button').textContent='试用 Material';$('#right-choice button').textContent='试用 Adobe';
    if(catalog){setDoc('left',sample.materialHtml,`catalog:${active}:material`);setDoc('right',sample.adobeHtml,`catalog:${active}:adobe`);}
    else{setDoc('left',data.workspaces.b,'workspace:b');setDoc('right',data.workspaces.mb128,'workspace:128');}
    $('#selected-choice').textContent=`${item.name}：${pick.reviewed?label[pick.selected]:'尚未决定'}`;$('#choice-note').value=pick.note;
    $$('[data-pick]').forEach(x=>x.setAttribute('aria-pressed',String(pick.reviewed&&x.dataset.pick===pick.selected)));
    send();
  }
  function choose(selected){choices[active]={...choices[active],selected,reviewed:true};remember(`${current().name} → ${label[selected]}；129映射已更新`);render();}
  function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function exportJSON(){download(new Blob([JSON.stringify(record(),null,2)],{type:'application/json'}),'FWL-组件选择-129.json');tell('已导出129选择与组件应用记录；不包含真实配方。');}
  function saveHTML(){
    const clone=document.documentElement.cloneNode(true),payload={...data,initialRecord:record(),preferEmbeddedRecord:true};
    clone.querySelector('#picker-data').textContent=JSON.stringify(payload).replace(/</g,'\\u003c');
    clone.querySelectorAll('iframe').forEach(e=>e.removeAttribute('srcdoc'));clone.querySelectorAll('dialog').forEach(e=>e.removeAttribute('open'));clone.querySelector('#import-file').removeAttribute('value');
    download(new Blob(['<!doctype html>\n'+clone.outerHTML],{type:'text/html;charset=utf-8'}),'FWL-我的组合-129.html');dirty=false;tell('已下载129单HTML，包含你的选择、绿色定制和全部组件样本。');
  }
  function openDialog(dialog){const opener=document.activeElement;dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus();},{once:true});dialog.showModal();}
  function decisions(){
    $('#decision-list').innerHTML=items.map(x=>{const p=choices[x.id];return `<div class="decision-row"><strong>${escape(x.name)}</strong><span>${p.reviewed?escape(label[p.selected]):'尚未决定'}${greenNote(x.id)?' · 主题绿':''}<br><small>129映射：${p.selected==='current'?'保留128':samples[x.id]?.sceneApplicable?'已实现':'缺失'}</small></span><div><p>${escape(p.note||'无额外备注')}</p><small>实例：我的组合 → 检查当前组件；不表示生产已应用。</small></div></div>`;}).join('');openDialog($('#decisions'));
  }
  $('#families').addEventListener('click',e=>{const b=e.target.closest('[data-family]');if(!b)return;active=b.dataset.family;expanded='';if(view==='mix'){render();inspect();}else{view='catalog';render();}});
  $$('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;expanded='';inspectPending=null;render();}));
  $('.view-tabs').addEventListener('keydown',event=>{const tabs=$$('[data-view]'),at=tabs.indexOf(event.target);if(at<0)return;let to;if(['ArrowRight','ArrowDown'].includes(event.key))to=(at+1)%tabs.length;if(['ArrowLeft','ArrowUp'].includes(event.key))to=(at+tabs.length-1)%tabs.length;if(event.key==='Home')to=0;if(event.key==='End')to=tabs.length-1;if(to===undefined)return;event.preventDefault();view=tabs[to].dataset.view;expanded='';render();tabs[to].focus();});
  $$('[data-pick]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.pick)));
  $('#choice-note').addEventListener('input',e=>{choices[active].note=e.target.value;remember();});
  $('#scope').addEventListener('change',send);$('#inspect-combo').addEventListener('click',inspect);
  $$('.expand-pane').forEach(b=>b.addEventListener('click',()=>{expanded=expanded===b.dataset.pane?'':b.dataset.pane;render();}));
  $('#restore-current').addEventListener('click',()=>{choices=validate(data.profile.record);remember('已恢复你的14类已确认选择和三条绿色备注');render();});
  $('#show-decisions').addEventListener('click',decisions);$('#boundaries').addEventListener('click',()=>openDialog($('#boundary-dialog')));$$('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  $('#export').addEventListener('click',exportJSON);$('#export-dialog').addEventListener('click',exportJSON);$('#save-html').addEventListener('click',saveHTML);
  $('#import').addEventListener('click',()=>$('#import-file').click());
  $('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw Error('文件超过1MB。');const next=validate(JSON.parse(await file.text()));choices=next;remember('选择已导入；129内置主题绿规则保持');render();}catch(error){tell('导入失败：'+error.message,true);}finally{e.target.value='';}});
  $('#copy').addEventListener('click',async()=>{const text=items.map(x=>`${x.id} ${x.name}：${label[choices[x.id].selected]}${greenNote(x.id)?' · 主题绿':''}${choices[x.id].note?'；'+choices[x.id].note:''}`).join('\n');try{await navigator.clipboard.writeText(text);tell('已复制129选择文字。');}catch(_){tell('浏览器未允许复制，可导出JSON或HTML。',true);}});
  Object.values(frames).forEach(f=>f.addEventListener('load',send));
  window.addEventListener('message',e=>{
    if(!Object.values(frames).some(f=>f.contentWindow===e.source)||e.data?.channel!==channel)return;
    if(e.data.type==='ready'){if(e.source===frames.right.contentWindow)rightReady=true;send();if(inspectPending&&e.source===frames.right.contentWindow){frames.right.contentWindow.postMessage({channel,type:'inspect-family',family:inspectPending},'*');inspectPending=null;}}
    if(e.data.type==='combo-applied'&&e.source===frames.right.contentWindow){appliedIds=Array.isArray(e.data.familyIds)?e.data.familyIds.filter(id=>items.some(x=>x.id===id)):[];applicationState();}
    if(e.data.type==='combo-inspector-closed'&&e.source===frames.right.contentWindow&&view==='mix')$('#inspect-combo').focus();
    if(e.data.type==='family-inspected'&&e.source===frames.right.contentWindow&&view==='mix'&&items.some(x=>x.id===e.data.family)&&active!==e.data.family){active=e.data.family;render();}
  });
  let loadedMessage='129已载入你的14类选择；组合组件可直接操作检查。';
  choices=validate(data.profile.record);
  try{const saved=data.preferEmbeddedRecord?data.initialRecord:JSON.parse(localStorage.getItem(storageKey)||'null')||data.initialRecord;if(saved){choices=validate(saved);loadedMessage=data.preferEmbeddedRecord?'已恢复HTML内的129组合选择。':'已载入129组合；使用独立存档，不影响旧稿。';}}catch(_){storageOkay=false;loadedMessage='129已使用已确认原始选择；保存请用下载HTML或JSON。';}
  render();tell(loadedMessage);
  window.ComponentPicker=Object.freeze({getState:()=>({active,view,choices:JSON.parse(JSON.stringify(choices)),storageOkay,dirty,appliedIds:[...appliedIds],comboVersion:'129'}),getRecord:record,getManifest:()=>data.manifest});
})();
