/* 仅组件选型状态；不接正式配方、烘焙、导入器或UE。 */
(() => {
  'use strict';
  const data=JSON.parse(document.getElementById('picker-data').textContent), items=data.catalog.items, samples=data.samples;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label={current:'保留128当前',material:'Material',adobe:'Adobe'};
  const storageKey='fwl.component-choice.20261029.v7', channel='fwl-style-picker/1';
  let choices=Object.fromEntries(items.map(x=>[x.id,{selected:'current',note:'',reviewed:false}])), active=items[0].id, view='workspace', expanded='', storageOkay=true, dirty=false;
  const loaded={left:'',right:''}, frames={left:$('#left-frame'),right:$('#right-frame')};
  function tell(text,error=false){$('#status').textContent=text;$('#status').dataset.error=String(error);}
  function current(){return items.find(x=>x.id===active);}
  function validate(record){
    if(!record||record.schema!=='fwl.component-choice/1'||!Array.isArray(record.components))throw Error('不是本选型台的 fwl.component-choice/1 文件。');
    if(record.components.length!==items.length)throw Error(`需要完整的 ${items.length} 类选择；当前文件有 ${record.components.length} 类。`);
    const seen=new Set(),next={};
    for(const row of record.components){
      if(!row||!items.some(x=>x.id===row.id)||seen.has(row.id))throw Error('组件编号未知或重复；原选择未改动。');
      if(!['current','material','adobe'].includes(row.selected))throw Error(`${row.id} 的选择只能是 current、material 或 adobe。`);
      if(row.note!==undefined&&(typeof row.note!=='string'||row.note.length>500))throw Error(`${row.id} 的备注须为500字以内文字。`);
      seen.add(row.id);next[row.id]={selected:row.selected,note:row.note||'',reviewed:row.reviewed===true};
    }
    return next;
  }
  function record(){return {schema:'fwl.component-choice/1',createdAt:new Date().toISOString(),sourceVersion:'4.9.128',status:'用户选型草稿；尚未应用正式项目',source:data.manifest,components:items.map(item=>{const pick=choices[item.id],sample=samples[item.id];return {id:item.id,name:item.name,...pick,current128:item.current,selectedLabel:label[pick.selected],implementationReady:pick.selected==='current'||!!sample?.sceneApplicable,note:pick.note,candidate:pick.selected==='current'?item.current:item[pick.selected]};})};}
  function remember(message){dirty=true;try{localStorage.setItem(storageKey,JSON.stringify(record()));storageOkay=true;}catch(_){storageOkay=false;}if(message)tell(message+(storageOkay?' · 已记住本机选择':' · 浏览器未允许记住，请下载HTML或JSON'));}
  function renderIndex(){
    $('#family-count').textContent=items.length;
    $('#families').innerHTML=items.map(x=>{const p=choices[x.id];return `<button data-family="${escape(x.id)}" aria-current="${x.id===active}"><b>${escape(x.name)}</b><span>${p.reviewed?escape(p.selected==='current'?'128':label[p.selected]):'未选'}</span></button>`;}).join('');
    const n=Object.values(choices).filter(x=>x.reviewed).length;$('#decision-count').textContent=`已决定 ${n} / ${items.length}`;
  }
  function sourceDetail(item){
    const lines=[['128 当前',item.current],['Material 候选',item.material],['Adobe 候选',item.adobe]];
    return lines.map(([title,x])=>`<div class="source-line"><strong>${title}</strong> ${escape((x.spec||[]).join(' '))}<br><code>${escape((x.sources||[]).join(' · '))}</code>${x.note?`<p>${escape(x.note)}</p>`:''}</div>`).join('');
  }
  function setDoc(side,html,key){if(loaded[side]===key)return;loaded[side]=key;frames[side].srcdoc=html;}
  function mixCss(){return items.map(x=>{const p=choices[x.id];return p.reviewed&&p.selected!=='current'?(samples[x.id]?.overrideCSS?.[p.selected]||''):'';}).join('\n');}
  function send(){
    for(const [side,frame] of Object.entries(frames)){
      frame.contentWindow?.postMessage({channel,type:'mode',mode:$('#scope').value},'*');
      frame.contentWindow?.postMessage({channel,type:'apply-choices',css:view==='mix'&&side==='right'?mixCss():''},'*');
    }
  }
  function render(){
    const item=current(),sample=samples[active],pick=choices[active],catalog=view==='catalog';
    renderIndex();$$('[data-view]').forEach(x=>{const on=x.dataset.view===view;x.setAttribute('aria-selected',String(on));x.tabIndex=on?0:-1;});
    $('.pair').dataset.expanded=expanded;$$('.expand-pane').forEach(x=>x.textContent=expanded===x.dataset.pane?'还原双栏':'放大');
    $('#scene-mode').hidden=catalog;
    $('#review-title').textContent=catalog?`${item.id} · ${item.name}`:view==='mix'?'我的组合 · 基于128样本':'分组聚焦 B / 128 当前';
    $('#review-subtitle').textContent=catalog?(item.supportsSwitch?'同一内容，分别使用既有Material与Adobe候选的真实样式。':'这一族没有完整独立双皮肤；可以指定方向，缺少的部分须后续设计。'):view==='mix'?'右侧试用已选择的可适配皮肤；左侧保持原B，正式文件不变。':'左边原分组聚焦B；右边128原DOM与原CSS的组件样本。';
    $('#current-note>p').textContent=`${item.name}：${item.current.note}`;
    $('#source-detail').innerHTML=sourceDetail(item);
    $('#left-choice').hidden=!catalog;$('#right-choice').hidden=!catalog;
    $('#left-title').textContent=catalog?item.material.label:'分组聚焦 B · 原 Material 候选';
    $('#right-title').textContent=catalog?item.adobe.label:view==='mix'?'128 副本 · 我的组合':'4.9.128 · 当前基线';
    $('#left-note').textContent=catalog?(sample?.sampleNote||'原样板控件，仅用于选型'):'原40字段交互 · 静态烟花参考';
    $('#right-note').textContent=catalog?(sample?.sampleNote||'参考方向，非官方框架原件'):view==='mix'?'只试组件外观，不写入128原文件':'原实页DOM · 基础控件交互，非完整业务';
    $('#left-choice button').textContent=item.supportsSwitch?'采用 Material':'指定 Material 方向（待细化）';
    $('#right-choice button').textContent=item.supportsSwitch?'采用 Adobe':'指定 Adobe 方向（待细化）';
    if(catalog){setDoc('left',sample.materialHtml,`catalog:${active}:material`);setDoc('right',sample.adobeHtml,`catalog:${active}:adobe`);}
    else{setDoc('left',data.workspaces.b,'workspace:b');setDoc('right',data.workspaces.mb128,'workspace:128');}
    $('#selected-choice').textContent=`${item.name}：${pick.reviewed?label[pick.selected]:'尚未决定'}`;
    $('#choice-note').value=pick.note;
    $$('[data-pick]').forEach(x=>x.setAttribute('aria-pressed',String(pick.reviewed&&x.dataset.pick===pick.selected)));
    send();
  }
  function choose(selected){
    choices[active]={...choices[active],selected,reviewed:true};
    const sample=samples[active],notApplied=selected!=='current'&&!sample.sceneApplicable;
    remember(`${current().name} → ${label[selected]}${notApplied?'；方向已记录，场景暂保留原样，尚未提供可直接替换的皮肤':''}`);render();
  }
  function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function exportJSON(){download(new Blob([JSON.stringify(record(),null,2)],{type:'application/json'}),'FWL-组件选择-128.json');tell('已导出组件选择JSON；这不是配方或素材包。');}
  function saveHTML(){
    const clone=document.documentElement.cloneNode(true),payload={...data,initialRecord:record()};
    clone.querySelector('#picker-data').textContent=JSON.stringify(payload).replace(/</g,'\\u003c');
    clone.querySelectorAll('iframe').forEach(e=>e.removeAttribute('srcdoc'));
    clone.querySelectorAll('dialog').forEach(e=>e.removeAttribute('open'));
    clone.querySelector('#import-file').removeAttribute('value');
    download(new Blob(['<!doctype html>\n'+clone.outerHTML],{type:'text/html;charset=utf-8'}),'FWL-B与128-我的组件选择.html');
    dirty=false;tell('已下载含选择的单HTML；换电脑也可载入这份选择。');
  }
  function openDialog(dialog){const opener=document.activeElement;dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus();},{once:true});dialog.showModal();}
  function decisions(){
    $('#decision-list').innerHTML=items.map(x=>{const p=choices[x.id];return `<div class="decision-row"><strong>${escape(x.name)}</strong><span>${p.reviewed?escape(label[p.selected]):'尚未决定'}</span><div><p>${escape(p.note||'无备注')}</p><small>128当前：${escape(x.current.note)}</small></div></div>`;}).join('');
    openDialog($('#decisions'));
  }
  $('#families').addEventListener('click',e=>{const b=e.target.closest('[data-family]');if(!b)return;active=b.dataset.family;view='catalog';expanded='';render();});
  $$('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;expanded='';render();}));
  $('.view-tabs').addEventListener('keydown',event=>{const tabs=$$('[data-view]'),at=tabs.indexOf(event.target);if(at<0)return;let to;if(['ArrowRight','ArrowDown'].includes(event.key))to=(at+1)%tabs.length;if(['ArrowLeft','ArrowUp'].includes(event.key))to=(at+tabs.length-1)%tabs.length;if(event.key==='Home')to=0;if(event.key==='End')to=tabs.length-1;if(to===undefined)return;event.preventDefault();view=tabs[to].dataset.view;expanded='';render();tabs[to].focus();});
  $$('[data-pick]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.pick)));
  $('#choice-note').addEventListener('input',e=>{choices[active].note=e.target.value;remember();});
  $('#scope').addEventListener('change',send);
  $$('.expand-pane').forEach(b=>b.addEventListener('click',()=>{expanded=expanded===b.dataset.pane?'':b.dataset.pane;render();}));
  $('#restore-current').addEventListener('click',()=>{items.forEach(x=>choices[x.id]={...choices[x.id],selected:'current',reviewed:true});remember('全部组件已设为保留128当前；原B和128文件没有改变');render();});
  $('#show-decisions').addEventListener('click',decisions);$('#boundaries').addEventListener('click',()=>openDialog($('#boundary-dialog')));
  $$('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  $('#export').addEventListener('click',exportJSON);$('#export-dialog').addEventListener('click',exportJSON);$('#save-html').addEventListener('click',saveHTML);
  $('#import').addEventListener('click',()=>$('#import-file').click());
  $('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw Error('选择JSON超过1MB，未载入。');const next=validate(JSON.parse(await file.text()));choices=next;remember('组件选择已完整导入，未应用到正式项目');render();}catch(error){tell('导入失败：'+error.message,true);}finally{e.target.value='';}});
  $('#copy').addEventListener('click',async()=>{const text=items.map(x=>`${x.id} ${x.name}：${choices[x.id].reviewed?label[choices[x.id].selected]:'未决定'}${choices[x.id].note?'；'+choices[x.id].note:''}\n128当前：${x.current.note}`).join('\n\n');try{await navigator.clipboard.writeText(text);tell('已复制组件选择文字。');}catch(_){tell('浏览器未允许复制；可用导出JSON或下载HTML。',true);}});
  Object.values(frames).forEach(f=>f.addEventListener('load',send));
  window.addEventListener('message',e=>{if(!Object.values(frames).some(f=>f.contentWindow===e.source)||e.data?.channel!==channel)return;if(e.data.type==='ready')send();});
  let loadedMessage='单文件已就绪；先点组件，再选择Material、Adobe或保留128。';
  try{const saved=data.initialRecord||JSON.parse(localStorage.getItem(storageKey)||'null');if(saved){choices=validate(saved);loadedMessage=data.initialRecord?'已载入HTML内保存的组件选择。':'已恢复本机上次的组件选择。';}}catch(_){storageOkay=false;loadedMessage='已打开；未读取旧选择。可下载HTML或JSON保存本次选择。';}
  render();tell(loadedMessage);
  // 供只读验证/交付追溯，不提供业务写入接口。
  window.ComponentPicker=Object.freeze({getState:()=>({active,view,choices:JSON.parse(JSON.stringify(choices)),storageOkay,dirty}),getRecord:record,getManifest:()=>data.manifest});
})();
