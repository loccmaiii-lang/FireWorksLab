import {createModel,standardModules,layouts,taskOf} from './model.mjs';
import {CurveEditor} from './curve-editor.mjs';
const $=selector=>document.querySelector(selector),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data=await (await fetch('./data.json')).json(),model=createModel(data,window.ParameterSource);
let type='senrin',layerIndex=0,object='子花',layout=new URL(location).searchParams.get('layout')||'continuous';if(!layouts[layout])layout='continuous';
const memories=new Map(),curves=new Map();let editors=[],lastFocus=null,platform='pc';
const memoryKey=()=>[layout,type,layerIndex,object].join('|');
const memory=()=>{const k=memoryKey();if(!memories.has(k))memories.set(k,{scroll:0,q:'',changed:false,english:false,active:'',open:{},random:{},groupScroll:{},focus:null});return memories.get(k);};
const announce=s=>{$('#announce').textContent=s;};
const icon=name=>`<span class="fw-icon" data-fw-icon="${name}"></span>`;
function remember(){const m=memory();m.scroll=$('#scroll').scrollTop;m.q=$('#search').value;m.changed=$('#changed').checked;m.english=$('#english').checked;const focused=document.activeElement?.dataset?.binding;if(focused)m.focus=focused;}
$('#fields').addEventListener('focusin',e=>{const binding=e.target.dataset?.binding;if(binding)memory().focus=binding;});
function switchContext(action){remember();action();lastFocus=null;render(true);}
const featured=['senrin','kiku','crackle','crossette','tailM','fountain','fan'];
$('#template').innerHTML=data.cases.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
$('#featured').innerHTML=featured.map(id=>`<button type="button" data-type="${id}">${esc(data.cases.find(c=>c.id===id).name.split(' · ')[0].replace('升空尾缀','尾缀'))}</button>`).join('');
function changeType(next){switchContext(()=>{type=next;layerIndex=0;const objects=model.objects(type,0);object=objects.includes('子花')?'子花':objects.includes('星')?'星':objects.includes('星头')?'星头':'效果';});}
$('#template').onchange=e=>changeType(e.target.value);
$('#featured').onclick=e=>{const b=e.target.closest('[data-type]');if(b)changeType(b.dataset.type);};
$('.layout-picker').onclick=e=>{const b=e.target.closest('[data-layout]');if(!b)return;switchContext(()=>{layout=b.dataset.layout;const url=new URL(location);url.searchParams.set('layout',layout);history.replaceState(null,'',url);});};
$('#layers').onclick=e=>{const b=e.target.closest('[data-layer]');if(b)switchContext(()=>{layerIndex=+b.dataset.layer;const objects=model.objects(type,layerIndex);if(!objects.includes(object))object='效果';});};
$('#objects').onclick=e=>{const b=e.target.closest('[data-object]');if(b)switchContext(()=>object=b.dataset.object);};
$('#search').oninput=()=>{memory().q=$('#search').value;renderFields();};
$('#changed').onchange=()=>{memory().changed=$('#changed').checked;renderFields();};
$('#english').onchange=()=>{memory().english=$('#english').checked;renderFields();};
$('#undo').onclick=()=>{if(model.session(type).undo()){refreshValues();announce('已撤销');}};
$('#redo').onclick=()=>{if(model.session(type).redo()){refreshValues();announce('已重做');}};
$('#restore').onclick=()=>{model.restore(type,layerIndex,model.rows(type,layerIndex,object).filter(r=>['P','M','L'].includes(r.scope)));refreshValues();announce('已恢复当前对象到打开时');};
$('#help-close').onclick=()=>$('#help-dialog').close();
$('#help').onclick=()=>help(object,object==='效果'?'当前图层的规格、位置、环境与颜色。颜色由本层发射器共用。':object==='输出'?'当前层的产物与导出参数。PC 和手机使用各自的产物选择。':'当前图层的'+object+'发射器。随机项属于母参数，曲线按单颗粒子的寿命变化。');
function help(title,body,row){$('#help-title').textContent=title;$('#help-content').innerHTML=`<p>${esc(body)}</p>${row?`<p>${esc(row.updown||'')}</p><p>${esc(row.note||'')}</p><p><code>${esc(row.dataPath||row.scope+'.'+row.key)}</code> · ${esc(row.unit||'无单位')}</p><p>${esc(row.linkedDefault?.source||'')}</p>`:''}`;$('#help-dialog').showModal();$('#help-close').focus();}
function bindTabs(root,selector){root.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;const buttons=[...root.querySelectorAll(selector)].filter(b=>!b.disabled),i=buttons.indexOf(document.activeElement);if(i<0)return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)+buttons.length)%buttons.length;buttons[next].focus();buttons[next].click();};}
bindTabs($('.layout-picker'),'button');bindTabs($('#index'),'button');
function render(restoreScroll=false){
  document.body.classList.remove('layout-continuous','layout-modules','layout-tasks');document.body.classList.add('layout-'+layout);
  document.title=layouts[layout]+' · 烟花参数样板';
  $('.layout-picker').querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.layout===layout));
  $('#template').value=type;$('#featured').querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.type===type));
  const l=model.layer(type,layerIndex),name=data.cases.find(c=>c.id===type).name;
  $('#layers').innerHTML=model.session(type).state.layers.map((l,i)=>`<button type="button" data-layer="${i}" aria-current="${i===layerIndex}"><span>${l.name}</span><small>${i+1}</small></button>`).join('');
  $('#objects').innerHTML=model.objects(type,layerIndex).map(o=>`<button type="button" data-object="${esc(o)}" aria-current="${o===object}">${esc(o)}</button>`).join('');
  $('#effect-name').textContent=name+' · '+layouts[layout];$('#identity').textContent=name+' › '+l.name+' › '+object;
  const m=memory();$('#search').value=m.q;$('#changed').checked=m.changed;$('#english').checked=m.english;
  renderFields();if(restoreScroll){requestAnimationFrame(()=>{$('#scroll').scrollTop=m.scroll;const field=m.focus&&document.querySelector(`[data-binding="${CSS.escape(m.focus)}"]`);field?.focus({preventScroll:true});});}
}
function groups(rows){
  const result=new Map();
  for(const r of rows){const name=layout==='modules'?r.module:taskOf(r,object);if(!result.has(name))result.set(name,[]);result.get(name).push(r);}
  if(layout==='modules'&&!['效果','输出'].includes(object))return new Map([...standardModules,...[...result.keys()].filter(g=>!standardModules.includes(g))].map(g=>[g,result.get(g)||[]]));
  const order=object==='效果'?['规格','位置与时间','环境','整体调整','本层颜色','整体运动','水面倒影']:object==='输出'?['产物','尺寸与取帧','帧数与贴图','单束','单帧','光点','曝光与光晕','画质','手机','消散']:['时序与数量','空间与运动','外观与颜色','事件与特性'];
  return new Map([...order.filter(n=>result.has(n)),...[...result.keys()].filter(n=>!order.includes(n))].map(n=>[n,result.get(n)]));
}
function defaultOpen(module){return ['生成','寿命','大小','亮度','规格','位置与时间','本层颜色','产物','导出方案','帧数与贴图','取景','算出来的','直接调'].includes(module);}
function renderFields(){
  editors.forEach(e=>e.destroy());editors=[];
  const m=memory(),all=model.rows(type,layerIndex,object),q=m.q.trim().toLowerCase();
  const filtered=all.filter(r=>(!q||[r.label,r.fullLabel,r.key,r.module,r.meaning].join(' ').toLowerCase().includes(q))&&(!m.changed||model.changed(type,layerIndex,r)));
  const groupMap=groups(all),matches=groups(filtered),available=[...groupMap].filter(([n,rs])=>rs.length&&(!q&&!m.changed||matches.get(n)?.length)),names=available.map(([n])=>n);
  if(!m.active||!names.includes(m.active))m.active=names[0]||'';
  const index=$('#index');index.innerHTML=[...groupMap].map(([name,rs])=>{const activeRows=q||m.changed?matches.get(name)||[]:rs;return `<button type="button" data-group="${esc(name)}" aria-current="${m.active===name}" ${activeRows.length?'':'disabled'}><span>${esc(name)}</span><span class="index-count">${activeRows.filter(r=>r.kind!=='info').length||''}</span></button>`;}).join('');
  index.setAttribute('role',layout==='tasks'?'tablist':'navigation');
  if(layout==='tasks')index.querySelectorAll('button').forEach(b=>{b.setAttribute('role','tab');b.setAttribute('aria-selected',b.dataset.group===m.active);b.tabIndex=b.dataset.group===m.active?0:-1;});
  index.onclick=e=>{const b=e.target.closest('[data-group]');if(!b||b.disabled)return;remember();m.groupScroll[m.active]=$('#scroll').scrollTop;m.active=b.dataset.group;if(layout==='continuous'){index.querySelectorAll('button').forEach(n=>n.setAttribute('aria-current',n===b));const section=[...document.querySelectorAll('.task-section')].find(s=>s.dataset.group===m.active);section?.scrollIntoView({block:'start',behavior:'auto'});section?.querySelector('summary,button,input,select')?.focus({preventScroll:true});}else{renderFields();$('#scroll').scrollTop=m.groupScroll[m.active]||0;$('#index').querySelector(`[data-group="${CSS.escape(m.active)}"]`)?.focus();}};
  const fields=$('#fields');fields.replaceChildren();
  if(object==='输出'){
    const p=document.createElement('div');p.className='output-context';p.innerHTML='<span>当前平台</span><div class="platform-picker" aria-label="输出平台"><button data-platform="pc">PC</button><button data-platform="mobile">手机</button></div>';p.querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',platform===b.dataset.platform);b.onclick=()=>{platform=b.dataset.platform;renderFields();};});fields.append(p);
  }
  let displayGroups=groups(filtered);
  if(layout!=='continuous')displayGroups=new Map([...displayGroups].filter(([n])=>n===m.active));
  let count=0;
  for(const [groupName,groupRows] of displayGroups){
    if(!groupRows.length)continue;
    const section=document.createElement('section');section.className='task-section';section.dataset.group=groupName;
    if(layout==='tasks'){section.setAttribute('role','tabpanel');section.setAttribute('aria-label',groupName);}
    const heading=document.createElement('h2');heading.className='task-heading';heading.textContent=groupName;section.append(heading);
    const mods=new Map();for(const r of groupRows){if(object==='输出'&&r.key===(platform==='pc'?'outMobile':'outPC'))continue;if(!mods.has(r.module))mods.set(r.module,[]);mods.get(r.module).push(r);}
    for(const [module,rs] of mods){
      const det=document.createElement('details');det.className='module';det.dataset.module=module;const openKey=groupName+'|'+module;
      det.open=q||m.changed||layout==='modules'||(m.open[openKey]??defaultOpen(module));
      const summary=document.createElement('summary');const labels=rs.filter(r=>!r.randomParent&&r.kind!=='info').slice(0,3).map(r=>r.label).join(' / ');summary.innerHTML=icon('expand')+`<span>${esc(module)}</span><span class="summary-value">${esc(labels)}</span>`;det.append(summary);
      det.ontoggle=()=>{m.open[openKey]=det.open;};
      const body=document.createElement('div');body.className='module-body';det.append(body);
      const present=new Set(rs.map(r=>r.key));const rendered=new Set();
      const inactiveLegacy=[];
      for(const row of rs){
        if(rendered.has(row.key)||row.randomParent&&present.has(row.randomParent))continue;
        if(model.source.legacyOf(row.key)&&!model.source.legacyInUse(row.key,model.layer(type,layerIndex).P)&&!q&&!m.changed){inactiveLegacy.push(row);continue;}
        appendRow(body,row);rendered.add(row.key);count++;
        const children=rs.filter(r=>r.randomParent===row.key);
        if(children.length){
          const random=document.createElement('details');random.className='random-details';const randomKey=row.scope+'.'+row.key;random.open=m.random[randomKey]??false;
          random.innerHTML=`<summary>${icon('expand')}<span>随机</span><span>${children.map(r=>esc(model.value(type,layerIndex,r))+esc(r.unit||'')).join(' · ')}</span></summary>`;
          random.ontoggle=()=>m.random[randomKey]=random.open;
          children.forEach(r=>{appendRow(random,r);rendered.add(r.key);count++;});body.append(random);
        }
      }
      // 旧字段仍可搜索、编辑；统一在对象末尾列出，避免每个模块再套“更多”。
      if(inactiveLegacy.length){for(const r of inactiveLegacy){section._legacy??=[];section._legacy.push(r);}}
      section.append(det);
    }
    fields.append(section);
  }
  const legacy=[...fields.querySelectorAll('.task-section')].flatMap(s=>s._legacy||[]);
  if(legacy.length){const det=document.createElement('details');det.className='module legacy';det.innerHTML=`<summary>${icon('expand')}旧（待删） · ${legacy.length}</summary><div class="module-body"></div>`;legacy.forEach(r=>appendRow(det.lastElementChild,r));fields.append(det);}
  if(!count){const e=document.createElement('p');e.className='empty';e.textContent=q||m.changed?'没有匹配的参数':'当前模块没有独立参数';fields.append(e);}
  updateFooter();window.FWIcons.apply();
}
function binding(row){return row.scope+'.'+row.key;}
function apply(row,value){const before=model.objects(type,layerIndex);if(model.commit(type,layerIndex,row,value)){lastFocus=binding(row);const after=model.objects(type,layerIndex);if(JSON.stringify(before)!==JSON.stringify(after))render();else refreshValues();announce('已修改'+row.label);}}
function refreshValues(){const top=$('#scroll').scrollTop,focused=document.activeElement?.dataset?.binding||lastFocus;renderFields();$('#scroll').scrollTop=top;if(focused)document.querySelector(`[data-binding="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});lastFocus=null;}
function updateFooter(){const rows=model.rows(type,layerIndex,object),changed=rows.filter(r=>model.changed(type,layerIndex,r)).length;$('#change-count').textContent=changed?'已改 '+changed+' 项':'和打开时一致';const h=model.session(type);$('#undo').disabled=!h.canUndo;$('#redo').disabled=!h.canRedo;$('#restore').disabled=!changed;}
function appendRow(host,row){
  const rowEl=document.createElement('div');rowEl.dataset.key=row.key;rowEl.dataset.scope=row.scope;
  const label=memory().english?row.key:row.label;
  if(row.kind==='curve'){
    rowEl.className='curve-field';rowEl.dataset.binding=binding(row);const stateKey=[type,layerIndex,row.key].join('|');if(!curves.has(stateKey))curves.set(stateKey,{});
    const widget=document.createElement('div');rowEl.append(widget);host.append(rowEl);const editor=new CurveEditor(widget,{read:()=>model.value(type,layerIndex,row),commit:v=>apply(row,v),label:row.module,state:curves.get(stateKey),announce,onHelp:()=>help(row.fullLabel,row.meaning,row)});editors.push(editor);return;
  }
  if(row.kind==='info'){
    if(['info:specBox','info:specMore'].includes(row.key))return;
    rowEl.className='info-row';rowEl.innerHTML=`<button type="button" class="param-label">${esc(label)}</button><span>—</span>`;rowEl.querySelector('button').onclick=()=>help(label,'此结果来自实际烘焙；参数样板没有烘焙回执。',row);host.append(rowEl);return;
  }
  if(row.kind==='stages'){renderStages(host,row);return;}
  rowEl.className='param-row';if(model.changed(type,layerIndex,row))rowEl.classList.add('changed');
  const inert=model.source.inertWhy(row.key,model.layer(type,layerIndex).P);if(inert){rowEl.classList.add('inert');rowEl.title=inert;}
  const labelButton=document.createElement('button');labelButton.type='button';labelButton.className='param-label';labelButton.textContent=label;labelButton.onclick=()=>help(row.fullLabel||label,[row.meaning,inert].filter(Boolean).join('。'),row);rowEl.append(labelButton);
  const val=model.value(type,layerIndex,row),link=model.linked(type,layerIndex,row),range=Array.isArray(row.range)?row.range:row.range?[row.range.min,row.range.max,row.range.step]:null;
  const control=document.createElement(row.kind==='select'?'select':'input');control.dataset.binding=binding(row);control.setAttribute('aria-label',row.label);control.id='f-'+row.scope+'-'+row.key;
  let slider;
  if(row.kind==='select'){
    control.innerHTML=(row.options||[]).map(([value,text])=>`<option value="${esc(value)}" ${row.disabledOptions?.includes(value)?'disabled':''}>${esc(String(text).replace(/（[^）]{20,}）/g,''))}</option>`).join('');control.value=String(val??'');
    if(![...control.options].some(o=>o.value===String(val))&&val!=null){control.add(new Option(String(val),val));control.value=String(val);}
    control.disabled=!!row.readOnly;if(row.readOnly)control.title='由当前产物和帧计划确定';control.onchange=()=>{const value=control.value,option=row.options?.find(([v])=>String(v)===value);if(row.key==='_trailTier'){changeType(value);return;}apply(row,typeof option?.[0]==='number'?+value:value);};
  }else if(row.kind==='checkbox'){
    control.type='checkbox';control.checked=!!val;control.onchange=()=>apply(row,control.checked);control.style.gridColumn='3';
  }else if(row.kind==='color'){
    control.type='color';control.value=val||'#ffffff';control.onchange=()=>apply(row,control.value);control.style.gridColumn='3';
  }else {
    control.type=row.kind==='number'?'number':'text';control.value=link?.on&&link.value===null?'':val??'';control.step='any';if(row.kind==='text'&&row.scope==='P')control.maxLength=6;if(link?.on&&link.value===null){control.placeholder='自动';control.title='计算结果需实际烘焙回执；输入数值使用手动值';}
    if(range&&row.kind==='number'){
      slider=document.createElement('input');slider.type='range';slider.min=range[0];slider.max=range[1];slider.step=range[2]||'any';slider.value=val;slider.setAttribute('aria-label',row.label+'滑杆');
      let start=slider.value;slider.onpointerdown=()=>start=String(model.value(type,layerIndex,row));slider.oninput=()=>{control.value=slider.value;};slider.onchange=()=>apply(row,+slider.value);slider.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();slider.value=start;control.value=start;}};rowEl.append(slider);
    } else {const blank=document.createElement('span');rowEl.append(blank);}
    const error=document.createElement('p');error.className='error';error.hidden=true;error.id='error-'+control.id;error.setAttribute('role','alert');control.setAttribute('aria-describedby',error.id);
    const clearError=()=>{error.textContent='';error.hidden=true;control.removeAttribute('aria-invalid');};
    const save=()=>{if(row.kind==='number'&&(control.value.trim()===''||!Number.isFinite(+control.value))){error.textContent='请输入有效数值';error.hidden=false;control.setAttribute('aria-invalid','true');return;}clearError();apply(row,row.kind==='number'?+control.value:control.value);};
    control.onchange=save;control.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();save();}else if(e.key==='Escape'){e.preventDefault();control.value=val??'';clearError();}};
    rowEl.append(error);
  }
  rowEl.append(control);const unit=document.createElement('span');unit.className='unit';unit.textContent=row.unit||'';rowEl.append(unit);
  if(link){const button=document.createElement('button');button.type='button';button.className='link-button';button.textContent=link.on?'跟随':'接回联动';button.setAttribute('aria-pressed',link.on);button.setAttribute('aria-label',row.label+(link.on?'：断开联动':'：接回联动'));button.title=link.source;button.disabled=link.on&&link.value===null;button.onclick=()=>apply(row,link.on?link.value:link.sentinel);rowEl.append(button);}
  const reset=document.createElement('button');reset.type='button';reset.className='row-reset';reset.setAttribute('aria-label','恢复'+row.label+'到打开时');reset.innerHTML=icon('refresh');reset.onclick=()=>{model.restore(type,layerIndex,[row]);refreshValues();};rowEl.append(reset);
  if(range&&typeof val==='number'&&(val<range[0]||val>range[1])&&!link?.on){const p=document.createElement('span');p.className='range-note';p.textContent='超出常用范围 '+range[0]+'–'+range[1]+'，数值已保留';rowEl.append(p);}
  host.append(rowEl);
}
function renderStages(host,row){
  const container=document.createElement('div');container.className='color-stages';const stages=model.value(type,layerIndex,row)||[];
  stages.forEach(([time,color],i)=>{const r=document.createElement('div');r.className='stage-row';r.innerHTML=`<label>第 ${i+1} 段<input type="number" step="any" value="${time}" aria-label="第${i+1}段颜色时刻">s</label><input type="color" value="${esc(color)}" aria-label="第${i+1}段颜色"><input type="text" value="${esc(color)}" aria-label="第${i+1}段颜色色值">`;
    r.querySelectorAll('input').forEach(input=>input.onchange=()=>{const next=structuredClone(stages);const t=r.querySelector('input[type=number]').value,c=input.type==='color'?input.value:r.querySelector('input[type=text]').value;if(!Number.isFinite(+t)||+t<0||!/^#[\da-f]{6}$/i.test(c)){input.setAttribute('aria-invalid','true');return;}next[i]=[+t,c];next.sort((a,b)=>a[0]-b[0]);apply(row,next);});container.append(r);});
  const actions=document.createElement('div');actions.className='stage-actions';actions.innerHTML='<button type="button" class="add-stage">增加颜色段</button><button type="button" class="remove-stage">删除最后一段</button>';actions.querySelector('.add-stage').disabled=stages.length>=5;actions.querySelector('.remove-stage').disabled=stages.length<=1;actions.querySelector('.add-stage').onclick=()=>apply(row,[...stages,[Math.min(model.layer(type,layerIndex).P.duration,+(stages.at(-1)?.[0]||0)+.5),stages.at(-1)?.[1]||'#ffffff']]);actions.querySelector('.remove-stage').onclick=()=>apply(row,stages.slice(0,-1));container.append(actions);host.append(container);
}
$('#scroll').onscroll=()=>{const m=memory(),scroll=$('#scroll');m.scroll=scroll.scrollTop;if(layout==='continuous'){const top=scroll.getBoundingClientRect().top+16;const section=[...scroll.querySelectorAll('.task-section')].find(s=>s.getBoundingClientRect().bottom>top);if(section){m.active=section.dataset.group;$('#index').querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',b.dataset.group===m.active));}}};
document.addEventListener('keydown',e=>{if($('#help-dialog').open)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();if(e.shiftKey)$('#redo').click();else $('#undo').click();}});
render();
