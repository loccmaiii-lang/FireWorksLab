import {parseCurve,serialize,movePoint,validatePoint,at,createHistory} from './curve-model.mjs';
const data=await fetch('sample-data.json').then(r=>{if(!r.ok)throw Error('字段数据不可用');return r.json();});
const all=[...data.rows,...data.extras],byId=new Map(all.map(r=>[r.occurrenceId||r.fieldId,r]));
const sampleRows=data.rows.filter(r=>r.emitter==='子花'&&r.sourceSection==='千轮 / 分裂');
const initial=data.sample,history=createHistory(initial),links=data.links;
const $=s=>document.querySelector(s),esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
let current='all',charts=[],contextMemory=new Map(),helpOrigin=null;
const idOf=r=>r.occurrenceId||r.fieldId;
const changed=r=>sampleRows.includes(r)&&JSON.stringify(history.state[r.key])!==JSON.stringify(initial[r.key]);
function linked(k,value){const a=links[k];return a&&(a.sentinel===0?!(+value>0):!(+value>=0));}
function linkedValue(k){const state=history.state,a=links[k];
 if(k==='subFlashR')return +Math.max(1,(+state.subSpeed||0)*.05).toFixed(2);
 if(k==='subKeep')return state.subPattern==='cross'?.25:.35;
 return a.value;
}
function display(k){return linked(k,history.state[k])?linkedValue(k):history.state[k];}
function setParam(k,value){const next=history.state;next[k]=value;if(history.commit(next)){sync();announce('已修改 '+sampleRows.find(r=>r.key===k).label);}}
function announce(s){$('#announce').textContent=s;}
const categories=[['all','全部字段与分支',all.length],['sample','千轮 · 子花操作样板',18],...Object.entries(Object.groupBy(data.rows,r=>r.emitter)).map(([name,rows])=>['emitter:'+name,name,rows.length]),['extra','颜色 / 层 / 预览 / 文件',data.extras.length],['output','输出 / 烘焙 / 导出',all.filter(isOutput).length],['actions','导出执行动作',data.actions.length],['coverage','版本与覆盖核对','']];
function isOutput(r){return r.emitter==='输出'||/SPEC-|LAYER-|NAME-|SIZE-|DELIVERY-/.test(r.fieldId);}
$('#version').textContent='当前源码 '+data.coverage.version;$('#total').textContent=`${data.coverage.total} 项 · ${data.coverage.objects} 类对象 · ${data.coverage.sourceSections} 个来源模块`;
$('#object-nav').innerHTML=categories.map(([id,name,n],i)=>`${i===2?'<span class="nav-label">制作作用对象 · 含各花型条件</span>':i===28?'<span class="nav-label">交付与全局入口</span>':''}<button type="button" data-context="${esc(id)}" aria-current="${id===current}"><span>${esc(name)}</span><small>${n}</small></button>`).join('');
$('#object-nav').addEventListener('click',e=>{const b=e.target.closest('[data-context]');if(b)selectContext(b.dataset.context);});
function remember(){contextMemory.set(current,{scrollA:$('#view-A').scrollTop,scrollB:$('#view-B').scrollTop,search:$('#search').value,changed:$('#only-changed').checked,open:[...document.querySelectorAll('.module')].map(el=>[el.dataset.group,el.open])});}
function selectContext(id){remember();current=id;$('#search').value=contextMemory.get(id)?.search||'';$('#only-changed').checked=!!contextMemory.get(id)?.changed;render();const m=contextMemory.get(id);if(m){for(const [key,open] of m.open){const el=[...document.querySelectorAll('.module')].find(el=>el.dataset.group===key);if(el)el.open=open;}}$('#view-A').scrollTop=m?.scrollA||0;$('#view-B').scrollTop=m?.scrollB||0;}
function getRows(){if(current==='all')return all;if(current==='sample')return sampleRows;if(current==='extra')return data.extras;if(current==='output')return all.filter(isOutput);return data.rows.filter(r=>r.emitter===current.slice(8));}
function groupOf(r,variant){
 const p=r[variant].replace(/ \[[\s\S]*\]$/,'').split('/').map(s=>s.trim());
 if(r.occurrenceId)return `${r.emitter} / ${p[3]||r.module}`;
 return `全局与层 / ${p.slice(0,-1).join(' / ')}`;
}
const orderA=['生成','形状','初速','受力','寿命','大小','颜色','亮度','闪烁','火花','闪光'];
const orderB=['时序与数量','空间与运动','外观与颜色','事件与特性'];
function orderGroups(groups,variant){const order=variant==='A'?orderA:orderB;return Object.entries(groups).sort(([a],[b])=>{const [ao,ag]=a.split(' / '),[bo,bg]=b.split(' / ');if(ao!==bo)return 0;const ai=order.indexOf(ag),bi=order.indexOf(bg);return (ai<0?99:ai)-(bi<0?99:bi);});}
function orderRows(rows){const result=[],seen=new Set(),add=r=>{if(!seen.has(idOf(r))){seen.add(idOf(r));result.push(r);}};for(const r of rows.filter(r=>!r.randomParent&&!r.key.endsWith('Curve'))){add(r);rows.filter(x=>x.randomParent===r.key).forEach(add);rows.filter(x=>x.key===r.key+'Curve').forEach(add);}rows.forEach(add);return result;}
function formatted(v){if(typeof v==='number')return Number.isInteger(v)?String(v):String(+v.toFixed(3));if(v==null)return '依当前上下文';if(typeof v==='object')return JSON.stringify(v);return String(v);}
function rowHTML(r,variant){const live=sampleRows.includes(r),id=idOf(r),key=r.key;
 const value=live?display(key):r.default;
 let control='';
 if(r.kind==='curve')control='<span class="unit">随单粒寿命 · 倍率 ×</span>';
 else if(live&&r.kind==='select')control=`<select data-edit="${esc(key)}" aria-label="${variant} ${esc(r.label)}">${r.options.map(([val,label])=>`<option value="${esc(val)}" ${String(val)===String(value)?'selected':''}>${esc(label)}</option>`).join('')}</select>`;
 else if(live&&r.kind==='number')control=`<input type="number" step="any" value="${esc(value)}" data-edit="${esc(key)}" aria-label="${variant} ${esc(r.label)}"><span class="unit">${esc(r.unit)}</span>`;
 else if(r.kind==='select')control=`<span class="readonly-value">${esc(r.options?.find(o=>String(o[0])===String(value))?.[1]||formatted(value))}</span><span class="unit">选项</span>`;
 else control=`<span class="readonly-value">${esc(formatted(value))}</span><span class="unit">${esc(r.unit)}</span>`;
 const condition=r.sectionCondition&&r.sectionCondition!=='无节级条件'||r.fieldCondition&&r.fieldCondition!=='无字段级条件';
 return `<div class="param ${r.randomParent||r.kind==='curve'?'child':''} ${changed(r)?'changed':''}" data-id="${esc(id)}" data-live="${live}" data-key="${esc(key)}"><div class="param-header"><button type="button" class="field-name" data-help="${esc(id)}">${esc(r.label)}</button><div class="value-line">${control}</div></div><div class="field-meta"><code>${esc(key)}</code><span>${esc(r.sourceSection||r.object)}</span>${condition&&!live?'<span class="condition">条件分支 · 点名称查看</span>':''}${r.randomParent?`<span>从属 ${esc(r.randomParent)}</span>`:''}${r.legacy?'<span class="condition">旧字段 · 保留</span>':''}</div>${live&&links[key]?`<div class="link-row"><button type="button" data-link="${esc(key)}" ${linked(key,history.state[key])?'disabled':''}>${linked(key,history.state[key])?'跟着算':'接回'}</button><span>${esc(links[key].source)}<b> · ${formatted(linkedValue(key))} ${esc(r.unit)}</b></span></div>`:''}${r.kind==='curve'?live?`<div class="curve" data-curve="${esc(key)}" data-variant="${variant}"></div>`:'<p class="help-inline">曲线子项保留；本分支仅核对结构。点字段名查看单位、规则与原保存路径。</p>':''}</div>`;
}
function render(){charts.forEach(c=>c.destroy());charts=[];
 for(const b of document.querySelectorAll('[data-context]'))b.setAttribute('aria-current',String(b.dataset.context===current));
 const name=categories.find(c=>c[0]===current)?.[1]||current;$('#object-title').textContent=name;
 $('#object-note').textContent=current==='sample'?'千轮 › 第1层 › 子花 · 18个适用字段全部呈现，含8项联动与2条寿命曲线。':'完整分类核对：各花型条件分支逐项保留；基准值与选项来自源码，不代表一朵花同时可用。';
 $('#only-changed').disabled=current!=='sample';if(current!=='sample')$('#only-changed').checked=false;
 if(current==='actions'||current==='coverage'){renderInventory();return;}
 const rows=getRows();
 for(const variant of ['A','B']){
  const grouped=Object.groupBy(rows,r=>groupOf(r,variant));
  $('#view-'+variant).innerHTML=orderGroups(grouped,variant).map(([name,list])=>`<details class="module" open data-group="${esc(variant+':'+name)}"><summary>${esc(name)}<small>${list.length} 项</small></summary>${orderRows(list).map(r=>rowHTML(r,variant)).join('')}</details>`).join('')+(current==='sample'?'<p class="inherited">颜色与闪烁随本层/主星。当前子花无独立字段，不补假开关。地面末端子花另3项在“子花21项”条件清单保留。</p>':'');
  $('#count-'+variant).textContent=`${rows.length} 项 · ${Object.keys(grouped).length} 组`;
 }
 for(const el of document.querySelectorAll('[data-curve]'))charts.push(new CurveEditor(el));
 bindInputs();filter();syncFooter();
}
function bindInputs(){for(const input of document.querySelectorAll('[data-edit]')){
 input.addEventListener('change',()=>{if(input.type==='number'){if(input.value===''||!Number.isFinite(+input.value)){input.setAttribute('aria-invalid','true');announce('请输入有效数值；原值保留。');return;}setParam(input.dataset.edit,+input.value);}else setParam(input.dataset.edit,input.value);});}
 for(const b of document.querySelectorAll('[data-link]'))b.addEventListener('click',()=>setParam(b.dataset.link,links[b.dataset.link].sentinel));
}
function filter(){const q=$('#search').value.trim().toLowerCase();let shown=0;
 for(const variant of ['A','B']){let count=0;for(const el of document.querySelectorAll(`#view-${variant} .param`)){const r=byId.get(el.dataset.id);el.hidden=(q&&!`${r.label} ${r.fullLabel} ${r.key} ${r.A} ${r.B} ${r.sourceSection||''}`.toLowerCase().includes(q))||($('#only-changed').checked&&!changed(r));if(!el.hidden)count++;}
  for(const mod of document.querySelectorAll(`#view-${variant} .module`)){mod.hidden=![...mod.querySelectorAll('.param')].some(r=>!r.hidden);if(q||$('#only-changed').checked)mod.open=true;}if(variant==='A')shown=count;
 }$('#shown').textContent=`两版各显示 ${shown} / ${getRows().length} 项`;
}
function sync(){for(const el of document.querySelectorAll('.param[data-live=true]')){
 const key=el.dataset.key,r=byId.get(el.dataset.id);el.classList.toggle('changed',changed(r));const input=el.querySelector('[data-edit]');if(input){input.value=String(display(key));input.removeAttribute('aria-invalid');}
 const btn=el.querySelector('[data-link]');if(btn){const isLinked=linked(key,history.state[key]);btn.textContent=isLinked?'跟着算':'接回';btn.disabled=isLinked;btn.parentElement.querySelector('b').textContent=` · ${formatted(linkedValue(key))} ${r.unit}`;}
 }charts.forEach(c=>c.update());syncFooter();filter();}
function syncFooter(){const n=sampleRows.filter(changed).length;$('#change-status').textContent=`千轮子花操作样板：改过 ${n} / 18 项 · 曲线计入统计 · 仅内存草稿`;$('#undo').disabled=!history.canUndo;$('#redo').disabled=!history.canRedo;$('#restore').disabled=!n;}
$('#undo').addEventListener('click',()=>{if(history.undo()){sync();announce('已撤销上一步。');}});$('#redo').addEventListener('click',()=>{if(history.redo()){sync();announce('已重做。');}});$('#restore').addEventListener('click',()=>{if(history.commit(initial)){sync();announce('已恢复样板打开时。');}});
$('#search').addEventListener('input',filter);$('#only-changed').addEventListener('change',filter);$('#open-all').addEventListener('click',()=>{for(const d of document.querySelectorAll('.module'))d.open=true;});
for(const b of document.querySelectorAll('[data-shape]'))b.addEventListener('click',()=>{document.body.dataset.shape=b.dataset.shape;for(const x of document.querySelectorAll('[data-shape]'))x.setAttribute('aria-pressed',String(x===b));});
document.addEventListener('click',e=>{const b=e.target.closest('[data-help]');if(b){helpOrigin=b;const r=byId.get(b.dataset.help);$('#help-title').textContent=r.label;$('#help-content').innerHTML=`<dl>${[['字段 / 出现ID',`${r.fieldId} / ${idOf(r)}`],['作用对象 / 数据路径',`${r.object} / ${r.dataPath}`],['含义与单位',`${r.meaning}；${r.unit}`],['调大 / 调小',r.updown],['生效条件',`${r.sectionCondition||'补充入口'}；${r.fieldCondition}`],['联动 / 随机 / 曲线',JSON.stringify(r.linkedDefault||r.randomMeaning||r.curve)],['原位置',r.oldPosition],['A位置',r.A],['B位置',r.B],['保存与撤销',r.saveUndo],['源码',r.source],['备注',r.note]].filter(([,v])=>v).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;$('#field-help').showModal();}});
$('#help-close').addEventListener('click',()=>$('#field-help').close());$('#field-help').addEventListener('close',()=>helpOrigin?.focus());
function renderInventory(){for(const v of ['A','B']){$('#count-'+v).textContent=current==='actions'?data.actions.length+' 动作':'626 / 626 对齐';$('#view-'+v).innerHTML=current==='actions'?`<p class="help-inline">真实执行动作单列，与参数数量分开。这是现有生产入口清单，不在样板执行烘焙、写文件或UE导入。</p><table class="coverage-table"><thead><tr><th>生产动作</th><th>入口ID</th><th>来源</th></tr></thead><tbody>${data.actions.map(r=>`<tr><td>${esc(r.label)}</td><td><code>${esc(r.id)}</code></td><td>${esc(r.source)}</td></tr>`).join('')}</tbody></table>`:`<table class="coverage-table"><tbody>${[['生产版本',data.coverage.version],['来源提交',data.coverage.sourceCommit.slice(0,8)],['SCHEMA定义',data.rows.length],['来源模块',data.coverage.sourceSections],['作用对象类型',data.coverage.objects],['补充真实入口',data.extras.length],['A/B出现ID',`${data.coverage.total} / ${data.coverage.total}`],['相对旧版清单',data.coverage.oldEqual?'完整保留':'有增量'],['别名登记（非新增控件）',data.registryOnly.length],['内部/派生键（不补控件）',data.internal.length],['执行动作另列',data.actions.length]].map(([k,n])=>`<tr><th>${esc(k)}</th><td>${esc(n)}</td></tr>`).join('')}</tbody></table><h3>登记别名与内部键</h3><p class="help-inline">${data.registryOnly.map(r=>esc(r.key)).join(' / ')}</p><p class="help-inline">${data.internal.map(r=>esc(r.key)).join(' / ')}</p><h3>26类对象完整数目</h3><table class="coverage-table">${Object.entries(Object.groupBy(data.rows,r=>r.emitter)).map(([name,rows])=>`<tr><th>${esc(name)}</th><td>${rows.length}</td></tr>`).join('')}</table>`;}$('#shown').textContent='两版内容逐项相同';syncFooter();}
class CurveEditor{
 constructor(el){this.el=el;this.key=el.dataset.curve;this.variant=el.dataset.variant;this.selected=-1;this.drag=null;this.preview=null;this.suppressClick=false;
 el.innerHTML='<div class="graph"><canvas aria-hidden="true"></canvas><div class="points"></div></div><div class="point-editor"></div><div class="curve-helper"><span>点选精确输入 · 拖动调形 · 方向键微调</span><button type="button" class="constant">改为恒定 ×1</button></div>';
 this.graph=el.querySelector('.graph');this.canvas=el.querySelector('canvas');this.points=el.querySelector('.points');this.editor=el.querySelector('.point-editor');
 el.querySelector('.constant').onclick=()=>{this.selected=-1;setParam(this.key,'');};
 this.resize=new ResizeObserver(()=>this.draw());this.resize.observe(this.graph);this.update();
 }
 values(){return this.preview||parseCurve(history.state[this.key]);}
 axis(p){const ys=(p||[[0,1],[1,1]]).map(x=>x[1]);let lo=Math.min(0,...ys),hi=Math.max(1.25,...ys);const gap=Math.max(.25,(hi-lo)*.2);return {lo:lo<0?lo-gap:0,hi:hi+gap};}
 update(){this.preview=null;if(this.selected<0)this.editor.replaceChildren();this.draw();if(this.selected>=0){const p=this.values();if(!p||this.selected>=p.length){this.selected=-1;this.editor.innerHTML='';}else this.showEditor(false);}}
 draw(){const p=this.values();const r=this.graph.getBoundingClientRect();if(!r.width||!r.height)return;this.w=r.width;this.h=r.height;this.axes=this.drag?.axes||this.axis(p);const ratio=window.devicePixelRatio||1;this.canvas.width=Math.round(r.width*ratio);this.canvas.height=Math.round(r.height*ratio);const c=this.canvas.getContext('2d');c.scale(ratio,ratio);const style=getComputedStyle(document.body),color=name=>style.getPropertyValue('--fw-color-'+name).trim();
 const X=x=>34+x*(r.width-54),Y=y=>14+(this.axes.hi-y)/(this.axes.hi-this.axes.lo)*(r.height-44);this.X=X;this.Y=Y;
 c.strokeStyle=color('divider');c.lineWidth=1;c.fillStyle=color('on-surface-muted');c.font='11px Segoe UI';
 for(const x of [0,.5,1]){c.beginPath();c.moveTo(X(x),14);c.lineTo(X(x),r.height-30);c.stroke();c.fillText(String(x),X(x)-3,r.height-12);}
 const mids=[this.axes.lo,(this.axes.lo+this.axes.hi)/2,this.axes.hi];for(const y of mids){c.beginPath();c.moveTo(34,Y(y));c.lineTo(r.width-20,Y(y));c.stroke();c.fillText('×'+Number(y.toFixed(1)),3,Y(y)+4);}
 c.strokeStyle=color('primary');c.lineWidth=2;c.beginPath();const plot=p||[[0,1],[1,1]];c.moveTo(X(0),Y(plot[0][1]));for(const [x,y] of plot)c.lineTo(X(x),Y(y));c.lineTo(X(1),Y(plot.at(-1)[1]));c.stroke();
 if(this.points.children.length!==(p?.length||0)){this.points.replaceChildren();p?.forEach((point,i)=>{const b=document.createElement('button');b.type='button';b.className='point';b.dataset.point=i;
 b.addEventListener('click',()=>{if(this.suppressClick){this.suppressClick=false;return;}this.select(i);});
 b.addEventListener('pointerdown',e=>this.start(e,i,b));b.addEventListener('pointermove',e=>this.move(e,i));b.addEventListener('pointerup',e=>this.end(e,b));b.addEventListener('pointercancel',()=>this.cancel());b.addEventListener('lostpointercapture',()=>{if(this.drag)this.cancel();});
 b.addEventListener('keydown',e=>this.keyDown(e,i));this.points.append(b);});}
 if(p)p.forEach(([x,y],i)=>{const b=this.points.children[i];b.style.left=X(x)+'px';b.style.top=Y(y)+'px';b.setAttribute('aria-label',`${this.variant} ${this.key==='subSizeCurve'?'大小':'亮度'}曲线第${i+1}点，寿命${x}，倍率${y}`);b.setAttribute('aria-pressed',String(this.selected===i));});
 const helper=this.el.querySelector('.curve-helper span');helper.textContent=p?'点选精确输入 · 拖动调形 · 方向键微调':'未设置曲线 · 全寿命倍率恒为 1';
 if(!p){this.editor.innerHTML='<button type="button" class="begin">编辑曲线</button>';this.editor.querySelector('button').onclick=()=>{setParam(this.key,'0:1, 1:1');this.select(0);};}
 }
 select(i){this.selected=i;this.draw();this.showEditor(false);this.editor.scrollIntoView({block:'nearest'});}
 showEditor(focus){const p=this.values();if(!p||this.selected<0)return;const [x,y]=p[this.selected];
 this.editor.innerHTML=`<form class="point-edit"><label>寿命位置 0–1<input type="text" inputmode="decimal" name="x" value="${x}" aria-label="${this.variant} 选中点寿命位置" aria-describedby="err-${this.variant}-${this.key}"></label><label>倍率 ×<input type="text" inputmode="decimal" name="y" value="${y}" aria-label="${this.variant} 选中点倍率" aria-describedby="err-${this.variant}-${this.key}"></label><button type="submit">应用点值</button><button type="button" class="close-point">收起</button><p class="error" id="err-${this.variant}-${this.key}" aria-live="polite" hidden></p></form>`;
 const form=this.editor.querySelector('form');form.onsubmit=e=>{e.preventDefault();const error=validatePoint(p,this.selected,form.elements.x.value,form.elements.y.value);const message=form.querySelector('.error');message.textContent=error;message.hidden=!error;for(const input of form.querySelectorAll('input'))input.setAttribute('aria-invalid',String(!!error));if(error)return;const next=p.map(q=>[...q]);next[this.selected]=[+form.elements.x.value,+form.elements.y.value];setParam(this.key,serialize(next));this.points.children[this.selected]?.focus();};
 form.querySelector('.close-point').onclick=()=>{this.selected=-1;this.editor.innerHTML='';this.draw();};
 form.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();this.editor.innerHTML='';this.points.children[this.selected]?.focus();this.selected=-1;this.draw();}});if(focus)form.elements.x.focus();
 }
 start(e,i,b){if(e.button!==0)return;e.preventDefault();b.focus();this.selected=i;this.drag={id:e.pointerId,before:history.state[this.key],points:this.values().map(p=>[...p]),axes:this.axes,start:[e.clientX,e.clientY],moved:false};b.setPointerCapture(e.pointerId);this.draw();this.showEditor(false);}
 move(e,i){if(!this.drag||e.pointerId!==this.drag.id)return;if(Math.hypot(e.clientX-this.drag.start[0],e.clientY-this.drag.start[1])<3&&!this.drag.moved)return;this.drag.moved=true;const r=this.graph.getBoundingClientRect(),x=(e.clientX-r.left-34)/(this.w-54),y=this.axes.hi-(e.clientY-r.top-14)/(this.h-44)*(this.axes.hi-this.axes.lo);this.preview=movePoint(this.drag.points,i,x,Math.max(this.axes.lo,Math.min(this.axes.hi,y)));this.draw();this.showEditor(false);}
 end(e,b){if(!this.drag||e.pointerId!==this.drag.id)return;const didMove=this.drag.moved,value=this.preview;this.drag=null;this.preview=null;if(b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId);if(didMove&&value){this.suppressClick=true;setParam(this.key,serialize(value));}else this.select(this.selected);}
 cancel(){if(!this.drag)return;this.drag=null;this.preview=null;this.draw();this.showEditor(false);announce('已取消拖动，保留原曲线。');}
 keyDown(e,i){if(e.key==='Escape'){e.preventDefault();this.cancel();this.selected=-1;this.editor.innerHTML='';this.draw();return;}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(e.key))return;e.preventDefault();if(e.key==='Enter'||e.key===' '){this.select(i);this.showEditor(true);return;}const p=this.values(),[x,y]=p[i],step=e.shiftKey?.1:.01;setParam(this.key,serialize(movePoint(p,i,x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),y+(e.key==='ArrowUp'?step:e.key==='ArrowDown'?-step:0))));this.selected=i;this.draw();this.showEditor(false);}
 destroy(){this.resize.disconnect();}
}
render();
