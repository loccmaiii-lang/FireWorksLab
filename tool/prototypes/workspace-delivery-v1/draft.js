'use strict';
const $ = id => document.getElementById(id);
const platforms = ['pc', 'mobile'];
const label = p => p === 'pc' ? 'PC' : '手机';
const state = {
  current: 'pc', packages: new Set(platforms), checked: true, confirmed: new Set(),
  completed: new Set(), chosen: new Set(['pc:particle','pc:material','pc:seq','mobile:particle','mobile:material','mobile:seq','cutout','ramp']),
  busy: false, stage: '', offline: false, conflict: false, failed: '', stop: false, stopped: false,
  failMobile: false, mapping: false, name: 'GoldChrysanthemum', mode: 'create',
  root: 'F:\\FireworkResources', logs: ['演示：2 包检查通过，等待用户核对名称。']
};
let toastTimer;
let revision = '3c9894a0';
const logView = { follow: true, unread: 0, rendered: 0, returnFocus: null };
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validName = () => /^[A-Za-z][A-Za-z0-9_]*$/.test(state.name);
const unfinished = () => [...state.packages].filter(p => !state.completed.has(p));

function assets(p) {
  const n = state.name, m = p === 'mobile';
  return [
    {key:p+':particle', type:'粒子系统', name:`P_EFX_FireWorks_${n}${m?'_Mobile':''}_HD`},
    {key:p+':material', type:'材质实例', name:`MI_EFX_FireWorks_${n}_01${m?'_Mobile':''}_HD`},
    {key:'cutout', type:'轮廓图', name:`T_EFX_FireWorks_${n}_4x4_01_C`, shared:true},
    {key:'ramp', type:'颜色 Ramp', name:`T_EFX_FireWorks_${n}_R`, shared:true},
    {key:p+':seq', type:'序列贴图', name:`T_EFX_FireWorks_${n}_4x4_01${m?'':'_HD'}`}
  ];
}
function selectedAssets() {
  return new Set([...state.packages].flatMap(p => assets(p).filter(a => state.chosen.has(a.key)).map(a => a.key))).size;
}
function packageHasAssets(p) { return assets(p).some(a => state.chosen.has(a.key)); }
function allConfirmed() { return state.packages.size > 0 && [...state.packages].every(p => state.confirmed.has(p)); }
function appendLogs() {
  while(logView.rendered < state.logs.length) {
    const i = logView.rendered++, row = document.createElement('li');
    row.innerHTML = `<span class="fw-helper">${String(i+1).padStart(2,'0')}</span><span>${esc(state.logs[i])}</span>`;
    $('logs').append(row);
  }
}
function updateLogFollow() {
  $('log-latest').hidden = logView.follow;
  $('log-latest').textContent = logView.unread ? `回到最新 · ${logView.unread} 条` : '回到最新';
}
function followLatest() {
  logView.follow = true; logView.unread = 0; updateLogFollow();
  requestAnimationFrame(() => { if(logView.follow) $('logs').scrollTop = $('logs').scrollHeight; });
}
function log(message) {
  const selection = window.getSelection();
  if(selection && !selection.isCollapsed && $('logs').contains(selection.anchorNode)) logView.follow = false;
  state.logs.push('演示：'+message);
  $('latest-log').textContent = state.logs.at(-1);
  appendLogs();
  if(!$('log-panel').hidden) {
    if(logView.follow) followLatest();
    else { logView.unread++; updateLogFollow(); }
  }
}
function toast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message; $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 5000);
}
function invalidate(reason) {
  state.checked = false; state.confirmed.clear(); state.mapping = false;
  if(state.completed.size) {
    log('旧方案的完成记录保留在日志；新方案需要重新检查与确认。');
    state.completed.clear();
  }
  state.failed = ''; state.conflict = false; state.stopped = false;
  log(reason+'；旧确认已失效，请重新检查。');
  render();
}
function render() {
  const activeKey = document.activeElement?.dataset.asset;
  const activePackage = document.activeElement?.dataset.package;
  const activeSelect = document.activeElement?.dataset.select;
  $('queue-count').textContent = state.packages.size+' 包';
  $('package-list').innerHTML = platforms.map(p => {
    let status = state.completed.has(p)?'已完成（演示）':state.failed===p?'执行失败':state.confirmed.has(p)?'已确认':!state.packages.has(p)?'未选入本次':!state.checked?'待检查':state.conflict?'需处理':'检查通过 · 待确认';
    if(state.busy && state.current===p) status = state.stage==='import'?'正在执行（演示）':'正在检查（演示）';
    return `<div class="package-row ${state.current===p?'current':''}"><input class="fw-check" type="checkbox" data-package="${p}" aria-label="本次导入${label(p)}包" ${state.packages.has(p)?'checked':''} ${state.busy||state.completed.has(p)?'disabled':''}><button class="package-select" data-select="${p}" aria-pressed="${state.current===p}" ${state.busy?'disabled':''}><strong>${label(p)} 资源包</strong><small>${p==='pc'?'cascade.json':'cascade_mobile.json'}</small><span class="package-state ${state.confirmed.has(p)?'confirmed':''} ${state.failed===p||state.conflict?'error':''}">${status}</span></button></div>`;
  }).join('');
  const p = state.current, rows = assets(p);
  document.querySelectorAll('[data-platform]').forEach(button => {
    button.setAttribute('aria-pressed',String(button.dataset.platform===p));
    button.disabled = state.busy;
  });
  $('current-package-title').textContent = label(p)+' · '+state.name;
  $('asset-count').textContent = `已选 ${rows.filter(a=>state.chosen.has(a.key)).length} / ${rows.length}`;
  $('assets').innerHTML = rows.map(a => {
    const chosen = state.chosen.has(a.key);
    const conflict = state.conflict && a.type==='材质实例';
    const plan = !chosen?'跳过':state.completed.has(p)?'已完成（演示）':conflict?'同名冲突':state.mode==='update'?(a.shared?'按指纹复核':'更新'):'新建';
    const desc = a.shared?'PC / 手机共用；同一目标去重':a.type==='粒子系统'&&state.mode==='update'?'将重建发射器；核对手改值':'';
    return `<tr><td><label class="fw-check-label"><input type="checkbox" class="fw-check" data-asset="${a.key}" aria-label="导入 ${esc(a.name)}" ${chosen?'checked':''} ${state.busy||state.completed.has(p)?'disabled':''}>${a.type}</label></td><td><code>${esc(a.name)}</code>${desc?`<small>${desc}</small>`:''}</td><td><span class="plan-kind">${plan}</span>${conflict?'<small>名称已被占用</small>':''}</td></tr>`;
  }).join('');
  $('name-error').hidden = validName();
  $('effect-name').setAttribute('aria-invalid',String(!validName()));
  $('mode-help').textContent = state.mode==='update'?'更新会重建粒子发射器；执行前核对覆盖范围与手改值。':'已存在同名资产时停下处理，不自动覆盖。';
  const status = $('package-status');
  status.textContent = state.completed.has(p)?'已完成（演示）':state.busy?'执行中（演示）':state.failed===p?'执行失败':state.conflict?'需处理':state.confirmed.has(p)?'已确认':state.checked?'待确认':'待检查';
  status.className = 'fw-status '+(state.failed===p||state.conflict?'fw-status--error':state.confirmed.has(p)?'fw-status--active':'fw-status--warning');
  $('current-package-help').textContent = state.completed.has(p)?'资产完成为模拟回执；真实 UE 保存、版本管理与实播分别验收。':state.confirmed.has(p)?'本包已确认；改变名称、配置或资产选择会使确认失效。':state.checked?'检查通过，核对以下名称与处理方式后确认此包。':'当前方案尚未检查，请先点击底部检查按钮。';
  const count = selectedAssets(), confirmed = [...state.packages].filter(x=>state.confirmed.has(x)).length;
  let title = `检查${state.checked?'通过':'未完成'} ${state.packages.size} 包 · 已确认 ${confirmed} / ${state.packages.size}`;
  let detail = `${count} 项资产；先核对 ${label(p)} 包，再确认另一平台包。`;
  if(!validName()) detail = '英文名无效，请在当前包设置中修改。';
  else if(!state.packages.size) detail = '请先选择本次要导入的平台包。';
  else if(!count) detail = '没有选择资产；请勾选需要导入的项。';
  else if(state.packages.has(p)&&!packageHasAssets(p)) detail = '当前包未选择资产；勾选所需资产，或将此包移出本次导入范围。';
  else if(state.offline) { title = '等待连接 UE'; detail = '制作和目录导出仍可用；连接后才能检查与导入。'; }
  else if(state.conflict) { title = '同名冲突 · 尚不能确认'; detail = '选择同名更新或修改英文名，然后重新检查。'; }
  else if(state.busy) { title = state.stage==='check'?'正在检查（演示）':`正在导入 ${label(p)} 包（演示）`; detail = state.stop?'已请求停止，将在当前包结束后停止。':'执行期间配置锁定；停止在包与包之间生效。'; }
  else if(state.failed) { title = '部分完成 · '+label(state.failed)+'包失败'; detail = 'PC 完成回执保留；重试仅处理未完成的平台包。'; }
  else if(state.stopped) { title = `已在包间停止 · 完成 ${state.completed.size} / ${state.packages.size} 包`; detail = '当前包已完成；继续时只执行剩余包，原完成记录保留。'; }
  else if(!unfinished().length && state.packages.size) { title = '所选包已完成（演示）'; detail = '下一步核对演出资源登记；UE 实播与版本管理尚未验证。'; }
  else if(allConfirmed()) detail = `${count} 项资产已核对；点击导入后才执行写入。当前草稿仅演示。`;
  else if(!state.checked) detail = '配置或选择已变，请重新检查；旧确认不可执行。';
  $('overall-title').textContent = title; $('overall-detail').textContent = detail;
  $('check').disabled = state.busy||state.offline||!validName()||!state.packages.size;
  $('check').textContent = state.checked?'重新检查':'检查所选包';
  $('confirm').textContent = state.confirmed.has(p)?label(p)+' 包已确认':'确认 '+label(p)+' 包';
  $('confirm').disabled = state.busy||!state.checked||state.offline||state.conflict||!validName()||!state.packages.has(p)||state.confirmed.has(p)||!packageHasAssets(p)||state.completed.has(p);
  const imp = $('import');
  imp.textContent = state.busy&&state.stage==='import'?(state.stop?'等待包间停止':'在包间停止'):state.failed?`重试未完成的 ${unfinished().length} 包`:!unfinished().length&&state.packages.size?'已完成（演示）':state.completed.size?`继续导入剩余 ${unfinished().length} 包`:`导入已确认的 ${state.packages.size} 包`;
  imp.disabled = state.busy?state.stage!=='import'||state.stop:!allConfirmed()||!state.checked||state.offline||state.conflict||!validName()||!count||!unfinished().length;
  ['mode','effect-name','directory','manual','refresh','scenarios','system-settings'].forEach(id => { $(id).disabled = state.busy; });
  $('connection').textContent = state.offline?'UE 未连接（演示）':'UE 连接演示';
  $('problem').hidden = !(state.conflict||state.failed);
  $('problem').textContent = state.conflict?'检测到同名材质。更改处理方式或名称后，重新检查并逐包确认。':state.failed?'手机包执行失败（演示）。已完成的 PC 包保持；重试不重新导入完成包。':'';
  $('mapping-status').textContent = state.mapping?'登记方案已准备（演示）':state.completed.size?'导入回执为演示 · 可预览登记方案':'尚未登记 · 导入后才能核对真实资产';
  renderFlow(); renderExecution();
  if(activeKey) document.querySelector(`[data-asset="${activeKey}"]`)?.focus({preventScroll:true});
  if(activePackage) document.querySelector(`[data-package="${activePackage}"]`)?.focus({preventScroll:true});
  if(activeSelect) document.querySelector(`[data-select="${activeSelect}"]`)?.focus({preventScroll:true});
}

function renderFlow() {
  const total = state.packages.size, done = state.completed.size;
  const confirmed = [...state.packages].filter(p=>state.confirmed.has(p)).length;
  const checked = state.checked && !state.offline && !state.conflict && validName() && total>0;
  const ready = checked && allConfirmed();
  const complete = total>0 && !unfinished().length;
  const importing = state.busy && state.stage==='import';
  const checking = state.busy && state.stage==='check';
  const current = checking ? 1 : complete ? 3 : importing||done||state.failed||state.stopped ? 2 : 1;
  const stages = [
    ['step-export','completed','已导出'],
    ['step-check',ready?'completed':current===1?(state.conflict?'failed':'active'):'',
      state.offline?'等待连接':state.conflict?'名称冲突':state.busy&&state.stage==='check'?'检查中':!checked?'待检查':`${confirmed} / ${total} 包已确认`],
    ['step-import',complete?'completed':state.failed?'failed':current===2?'active':'',
      state.failed?'失败 · 可重试':state.stopped?'已停止 · 可继续':importing?(state.stop?'等待包间停止':`${label(state.current)} 包执行中`):complete?'完成（演示）':'等待确认'],
    ['step-register',current===3?'active':'',state.mapping?'方案已准备':'尚未登记']
  ];
  stages.forEach(([id,kind,caption],index)=>{
    const node = $(id); node.className = kind;
    node.querySelector('small').textContent = caption;
    node.setAttribute('aria-label',`${index+1}. ${node.querySelector('b').textContent}，${caption}`);
    if(index===current) node.setAttribute('aria-current','step'); else node.removeAttribute('aria-current');
  });
  $('flow-summary').textContent = checking?'正在检查名称与依赖':complete?'下一步：核对演出登记方案':state.failed?'保留已完成包，重试未完成包':state.stopped?'继续时仅执行剩余包':importing?'配置已锁定，支持包间停止':ready?'核对完成，可以导入':state.offline?'连接 UE 后继续核对':state.conflict?'处理冲突后重新检查':`先核对并确认 ${total} 个平台包`;
}

function renderExecution() {
  const total = state.packages.size, done = state.completed.size;
  let title = '等待导入', detail = '检查与确认不会执行导入。', status = 'waiting';
  if(state.busy&&state.stage==='import') {
    title = state.stop?'等待当前包结束':`正在导入 ${label(state.current)} 包（演示）`;
    detail = state.stop?'已请求包间停止，当前包仍在执行。':'可以收起日志或请求包间停止；收起不会停止执行。';
    status = 'running';
  } else if(state.busy&&state.stage==='check') {
    title = '正在检查（演示）'; detail = '核对名称、所选包与资产依赖。';
  } else if(state.failed) {
    title = `${label(state.failed)} 包失败（演示）`; detail = '已完成包保留；底部重试只执行未完成包。'; status = 'failed';
  } else if(state.stopped) {
    title = '已在包间停止（演示）'; detail = '原确认和完成记录保留；底部继续只执行剩余包。'; status = 'stopped';
  } else if(total>0&&!unfinished().length) {
    title = '所选包执行完成（演示）'; detail = '仅模拟回执。下一步核对演出登记；真实 UE 未写入。'; status = 'complete';
  }
  $('execution-title').textContent = title; $('execution-detail').textContent = detail;
  $('execution-count').textContent = `已完成 ${done} / ${total} 包`;
  $('execution-progress').max = Math.max(1,total); $('execution-progress').value = done;
  $('execution-progress').setAttribute('aria-valuetext',`${total} 个平台包中完成 ${done} 个，状态演示`);
  document.querySelector('.execution-summary').dataset.status = status;
}

function selectPackage(p) {
  state.current = p; render();
  $('assets').closest('.panel-body').scrollTop = 0;
}
function changeAsset(key, checked) {
  const donePlatform = platforms.some(p=>state.completed.has(p)&&assets(p).some(a=>a.key===key));
  if(donePlatform) { toast('该共用资产已由完成包引用；请保留其回执，另建新方案处理。'); render(); return; }
  if(checked) state.chosen.add(key); else state.chosen.delete(key);
  if(key.endsWith(':particle')&&checked) assets(key.split(':')[0]).forEach(a=>state.chosen.add(a.key));
  if(!checked) {
    const affected = key.includes(':')?[key.split(':')[0]]:platforms;
    affected.forEach(p=>{ if(!key.endsWith(':particle'))state.chosen.delete(p+':particle'); });
  }
  invalidate('资产选择已改变');
}
function check() {
  if($('check').disabled) return;
  state.busy = true; state.stage = 'check'; state.confirmed.clear(); render();
  log('开始核对所选包、命名与依赖。');
  setTimeout(() => {
    state.busy = false; state.stage = ''; state.checked = !state.offline&&validName();
    if(state.conflict&&state.mode==='update')state.conflict = false;
    log(state.conflict?'发现同名冲突，请处理后重新检查。':`${state.packages.size} 包检查通过；尚未确认、尚未导入。`);
    render();
  },700);
}
function confirm() {
  if($('confirm').disabled) return;
  state.confirmed.add(state.current); log(label(state.current)+'包名称、选择与操作已确认。');
  const next = [...state.packages].find(p=>!state.confirmed.has(p));
  if(next) state.current = next;
  render();
  if(allConfirmed())$('import').focus();
}
function runImport() {
  if(state.busy) { if(state.stage==='import') {state.stop=true;log('已请求包间停止，不中断正在执行的包。');render();} return; }
  if($('import').disabled)return;
  state.busy=true; state.stage='import'; state.failed=''; state.stop=false; state.stopped=false;
  if($('log-panel').hidden)followLatest();
  setLogs(true,{focus:true});
  const todo = unfinished();
  function runNext() {
    const p = todo.shift();
    if(!p) { state.busy=false;state.stage='';log('所选包执行完成（模拟），真实 UE 未写入。');render();return; }
    state.current=p;log('开始执行 '+label(p)+' 包（模拟）。');render();
    setTimeout(() => {
      if(p==='mobile'&&state.failMobile) {
        state.failMobile=false; state.failed=p; state.busy=false;state.stage='';
        log('手机包失败（模拟）；PC 完成结果保留。');render();
        setLogs(true);return;
      }
      state.completed.add(p);log(label(p)+'包完成（模拟），不是 UE 写入回执。');
      if(state.stop) {state.busy=false;state.stage='';state.stop=false;state.stopped=true;log('已在包间停止；其余包保留原确认。');render();return;}
      runNext();
    },1600);
  }
  runNext();
}
function detail(title, content) {
  $('detail-title').textContent = title; $('detail-content').innerHTML = content;
  $('detail-dialog').showModal();
}
function timing() {
  detail('时长统一：保留制作设定，编排引用最终产物', `<table class="fw-table"><thead><tr><th>口径</th><th>当前金芒菊</th><th>用途</th></tr></thead><tbody><tr><td>制作设定</td><td>5.500 s</td><td>调参和制作时间轴范围</td></tr><tr><td>PC 最终产物</td><td>0 → 4.8333 s</td><td>母版 duration 与 Cascade 寿命；delay=0</td></tr><tr><td>手机最终产物</td><td>0 → 4.8333 s</td><td>独立读取手机版配置</td></tr><tr><td>开花锚点</td><td>待 UE 核对</td><td>对齐音乐或演出节奏</td></tr></tbody></table><p>当前配方开启尾部全黑帧裁除。最后约 0.667 秒不进入贴图，烟花没有被加速。</p><p>“收口”要让资源索引记录制作时长、各平台实际起止、裁帧偏移、层延迟与倍率，并记录开花锚点。多层、循环和 GPU 粒子须按各自输出规则计算，不能只拿一个发射器 Duration 相加。</p><p class="dialog-tip">旧修订索引仍只写 5.5 秒，当前编排适配会回退读取这个值。这里展示的是核对后的方案；生产索引和编排尚未完成时长修复。当前包 PC/手机配置相同不代表所有效果相同。</p>`);
}
function mapping() {
  const pc = assets('pc')[0].name, mobile = assets('mobile')[0].name;
  detail('演出资源登记：让编排找到这朵烟花', `<p>配表就是建立一条资源记录：演出使用稳定资源 ID，通过这条记录找到 PC / 手机粒子资产。导入创建资产，登记建立引用，两步分别核对。</p><label class="fw-field"><span class="fw-label">演出资源名（草稿）</span><input class="fw-input" id="mapping-name" value="金芒菊"></label><dl class="compact-dl"><div><dt>固定修订</dt><dd>${revision}</dd></div><div><dt>PC 粒子</dt><dd><code>${esc(pc)}</code></dd></div><div><dt>手机粒子</dt><dd><code>${esc(mobile)}</code></dd></div><div><dt>平台产物时间</dt><dd>PC / 手机 4.8333 s</dd></div><div><dt>制作尺寸标定目标</dt><dd>150 m · UE 未实测</dd></div></dl><details class="review-details"><summary>技术信息：ResourceFX</summary><p>候选新 ID <code>FWL_GoldChrysanthemum</code> 仅为演示。现有目录的行名与路径需读回核对；不能把“新年烟花2.0_小_Yellow”等现有记录直接当作这包资源的映射。正式写表须先核对蓝图字段和平台规则。</p></details><p class="dialog-tip">建议导入成功后自动准备登记方案，再由用户确认。当前草稿只预览方案，不改 ResourceFX 表，也不证明已经能在演出中播放。</p><div class="fw-dialog-actions"><button class="fw-button fw-button--primary" id="prepare-mapping">准备登记方案（演示）</button></div>`);
  $('prepare-mapping').addEventListener('click',()=>{
    state.mapping=true; log('已准备资源登记方案（演示），未写表、未实播。');
    $('detail-dialog').close();render();toast('登记方案已准备（演示）；正式接线时仍需读取真实导入资产。');
  });
}
function scenario(value) {
  setLogs(false);
  state.packages=new Set(platforms);state.current='pc';state.confirmed.clear();state.completed.clear();
  state.checked=value!=='unchecked'&&value!=='offline';state.offline=value==='offline';state.conflict=value==='conflict';
  state.failed=value==='partial'?'mobile':'';state.failMobile=value==='failed-run';state.stop=false;state.stopped=false;state.mapping=false;
  state.name='GoldChrysanthemum';state.mode='create';revision='3c9894a0';$('revision').textContent=revision;
  $('mode').value=state.mode;$('effect-name').value=state.name;
  state.chosen=new Set(['pc:particle','pc:material','pc:seq','mobile:particle','mobile:material','mobile:seq','cutout','ramp']);
  if(value==='partial'){state.completed.add('pc');state.confirmed=new Set(platforms);state.current='mobile';}
  log('载入状态：'+$('scenario').selectedOptions[0].textContent);render();
}

$('package-list').addEventListener('click',event=>{const button=event.target.closest('[data-select]');if(button&&!state.busy)selectPackage(button.dataset.select);});
document.querySelector('.platform-switch').addEventListener('click',event=>{
  const button=event.target.closest('[data-platform]');
  if(button&&!state.busy)selectPackage(button.dataset.platform);
});
document.querySelector('.platform-switch').addEventListener('keydown',event=>{
  if(state.busy||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const buttons=[...document.querySelectorAll('[data-platform]')];
  const index=buttons.indexOf(event.target); if(index<0)return;
  event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
  selectPackage(buttons[next].dataset.platform); buttons[next].focus({preventScroll:true});
});
$('package-list').addEventListener('change',event=>{
  const p=event.target.dataset.package;if(!p)return;
  if(event.target.checked)state.packages.add(p);else state.packages.delete(p);
  invalidate('导入平台范围已改变');
});
$('assets').addEventListener('change',event=>{if(event.target.dataset.asset)changeAsset(event.target.dataset.asset,event.target.checked);});
$('mode').addEventListener('change',event=>{state.mode=event.target.value;invalidate('处理方式已改变');});
$('effect-name').addEventListener('input',event=>{state.name=event.target.value;invalidate('英文名已改变');});
$('check').addEventListener('click',check);$('refresh').addEventListener('click',check);$('confirm').addEventListener('click',confirm);$('import').addEventListener('click',runImport);
$('timing').addEventListener('click',timing);$('context-timing').addEventListener('click',timing);$('mapping').addEventListener('click',mapping);
$('directory').addEventListener('click',()=>{
  detail('资源目录与固定修订',`<p>目录只需指定一次。导出完成后自动发现完整新修订，进入队列并检查；无需下载、解压或复制路径。</p><label class="fw-field"><span class="fw-label">演示资源根目录</span><input class="fw-input" id="draft-root" value="${esc(state.root)}"></label><p>本修订：<code>${esc(state.root)}\\GoldChrysanthemum\\revisions\\3c9894a05bfe46574643</code></p><p>目录选择与导出按钮在正式制作工作区共用这项设置。此处仅示意，当前草稿不会创建目录或导出文件。</p><div class="fw-dialog-actions"><button class="fw-button fw-button--primary" id="root-save">应用到草稿</button></div>`);
  $('root-save').addEventListener('click',()=>{state.root=$('draft-root').value;$('detail-dialog').close();toast('草稿目录已更新；没有创建或移动任何文件。');});
});
$('target-paths').addEventListener('click',()=>detail('目标目录（示例）',`<p>正式页面从导入器配置读取目标，不要求重复填写。以下目录仅用于草稿展示。</p><dl><dt>粒子 / 材质 / 贴图</dt><dd><code>/Game/Effects_HD/Props_HD/FireWorks_HD/</code></dd><dt>当前资源</dt><dd><code>${esc(assets(state.current)[0].name)}</code></dd></dl><p>复用指向已有资产，不把已有资源搬到新位置；实际执行前复核类型、名称、指纹与依赖。</p>`));
$('system-settings').addEventListener('click',()=>{
  detail('粒子系统与 GPU 设置',`<p>完整字段沿用原导入器，设置在当前包内生效。此处展示布局和确认失效规则。</p><label class="fw-field"><span class="fw-label">固定时间步长</span><input class="fw-input" id="fps" type="number" min="1" max="240" value="10"></label><label class="fw-field"><span class="fw-label">剔除距离（m）</span><input class="fw-input" id="cull" type="number" min="1" value="1200"></label><p>当前包没有 GPU 发射器。适用包在这里展示计算上限、实机峰值输入和待办；修改数值会使旧确认失效。</p><div class="fw-dialog-actions"><button class="fw-button fw-button--primary" id="system-apply">演示设置改变</button></div>`);
  $('system-apply').addEventListener('click',()=>{$('detail-dialog').close();invalidate('粒子系统设置已改变（演示）');});
});
$('manual').addEventListener('click',()=>detail('手动接入保留为补充入口',`<p>烘焙器的完整目录发布是主流程；已有外部素材包仍可使用原导入器的目录接入、命名与平台选择。</p><p>草稿暂不读取其他目录。生产翻新将复用现有接入器，而不是另写一套导入规则。</p>`));
$('gpu').addEventListener('click',()=>detail('GPU 待办',`<p>当前金芒菊 PC / 手机包均没有 GPU 发射器，因此没有待办。适用包保留原 GPU 上限、实测与回填入口。</p>`));
$('old-revision').addEventListener('click',()=>detail('历史修订 b059f930',`<p>旧修订保留，已有演出仍指向原版本；最新资源不会静默替换它。</p><p>生产页面在选择旧修订时独立重查、确认和导入。这版草稿只展示当前修订的核心流程。</p>`));
$('make').addEventListener('click',()=>detail('效果制作工作区',`<p>本版评审交付与导入布局。制作参数先评审分类、展开策略和连续调参样板，确认后制作可点击原型，再分区实装；库、画布/时间轴和完整字段保留。</p><p><a class="fw-link" href="http://127.0.0.1:8034/baker" target="_blank" rel="noopener">打开当前正式烘焙器</a></p>`));
$('help').addEventListener('click',()=>detail('草稿 v1 · 核对与导入一屏完成',`<p>左边选资源与平台包，中间改当前包设置，右边核对资产；底部操作始终常驻。队列、设置和资产各自局部滚动。</p><p>名称和平台包是已核对金芒菊的示例；缩略图来自固定修订。检查、连接、执行、失败和登记状态全部为演示，无 UE 调用、无文件/表格写入、无生产存储修改。</p><p>正式翻新需把该布局接到原导入器的真实命令与回执，保留更新、复用、跳过、依赖、GPU、停止及恢复。</p>`));
$('detail-close').addEventListener('click',()=>$('detail-dialog').close());
$('scenarios').addEventListener('click',()=>$('scenario-dialog').showModal());
$('scenario-close').addEventListener('click',()=>$('scenario-dialog').close());
$('scenario-apply').addEventListener('click',()=>{scenario($('scenario').value);$('scenario-dialog').close();});
function setLogs(open,{focus=false}={}) {
  const wasOpen=!$('log-panel').hidden;
  if(open&&!wasOpen) logView.returnFocus=document.activeElement;
  $('log-panel').hidden=!open; $('log-toggle').setAttribute('aria-expanded',String(open));
  $('logs').setAttribute('aria-live',open?'polite':'off');
  $('latest-log').setAttribute('aria-live',open?'off':'polite');
  if(open) {
    appendLogs(); renderExecution();
    if(logView.follow)followLatest();
    if(focus&&!wasOpen)$('log-title').focus({preventScroll:true});
  }
}
function closeLogs() {
  setLogs(false);
  const target=logView.returnFocus;
  (target?.isConnected&&!target.disabled?target:$('log-toggle')).focus({preventScroll:true});
}
$('log-toggle').addEventListener('click',()=>{
  if($('log-panel').hidden)setLogs(true,{focus:true}); else closeLogs();
});
$('log-close').addEventListener('click',closeLogs);
$('log-latest').addEventListener('click',()=>{followLatest();$('logs').focus({preventScroll:true});});
$('logs').addEventListener('scroll',()=>{
  const node=$('logs'), selected=window.getSelection();
  logView.follow=node.scrollHeight-node.scrollTop-node.clientHeight<=8 && !(selected&&!selected.isCollapsed&&node.contains(selected.anchorNode));
  if(logView.follow)logView.unread=0;
  updateLogFollow();
});
$('log-panel').addEventListener('keydown',event=>{
  if(event.key==='Escape') {event.preventDefault();closeLogs();}
});
document.querySelectorAll('[data-pane]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelector('.panels').dataset.activePane=button.dataset.pane;
  document.querySelectorAll('[data-pane]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
}));
const resizeActions = new ResizeObserver(()=>{
  const offset=document.querySelector('.action-bar').getBoundingClientRect().height+document.querySelector('.log-strip').getBoundingClientRect().height;
  document.body.style.setProperty('--draft-action-offset',offset+'px');
});
resizeActions.observe(document.querySelector('.action-bar'));resizeActions.observe(document.querySelector('.log-strip'));
appendLogs();render();FWIcons.apply();
