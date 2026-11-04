  // Current-package workspace. Validation and writing remain in the importer.
  let workspacePaths=false;
  function cancelWorkspaceEdit(){if(!locked())cancelEdit();}
  function nextWorkspacePackage(){
    if(locked()||editor)return;
    const chosen=rows().filter(r=>r.selected&&!finished(r));
    const pending=chosen.filter(r=>!canRun(r)),current=pending.findIndex(r=>r.id===inspected);
    const next=pending[(current+1)%pending.length]||chosen[0];
    if(next){inspected=next.id;if(currentFilter==='errors'&&!problem(next))currentFilter='all';refresh();if(typeof MaterialWorkbench!=='undefined')MaterialWorkbench.setPane('preview');$('reviewHeading').focus({preventScroll:true});}
  }
  function confirmCurrent(){
    if(locked()||editor||!storageOK)return;
    const r=record(inspected),plan=r&&verified.get(r.id);
    if(!r||!r.selected||!checked(r)||!plan){say('请先勾选并检查当前素材包。',true);return;}
    if(!persist()){refresh();return;}
    confirmations.set(r.id,plan.fingerprint);
    // Confirmation never writes. Inspection may advance only to selected work.
    nameReview=null;
    const remaining=rows().filter(x=>x.selected&&!finished(x)&&!canRun(x));
    if(remaining.length){inspected=remaining[0].id;if(currentFilter==='errors'&&!problem(remaining[0]))currentFilter='all';}
    refresh();say(remaining.length?'当前包已确认，继续核对下一包。':'全部所选包已确认。点击「执行导入」开始写入。');
    $('primary').focus({preventScroll:true});
  }
  function renderWorkspacePrimary(){
    const r=record(inspected),chosen=rows().filter(x=>x.selected&&!finished(x));
    const primary=$('primary'),cancel=$('cancelEditor');
    cancel.hidden=!editor;cancel.disabled=locked();
    $('detail').hidden=!!editor;
    let action='add',text='添加素材';
    if(editor){action='save';text=editor==='bulk'?'保存清单并检查':'添加并检查此包';}
    else if(chosen.length&&chosen.every(canRun)&&!nameReview){action='execute';text='执行导入 · '+chosen.length+' 个包';}
    else if(r&&!finished(r)&&r.selected){
      if(checked(r)&&(!canRun(r)||nameReview)){action='confirm';text='确认此包并查看下一个';}
      else if(!canRun(r)){action='check';text='检查并生成资产预览';}
      else{action='next';text='查看下一个待确认包';}
    }else if(chosen.length){action='next';text='查看所选待处理包';}
    else if(r&&!finished(r)){action='select';text='将此包选入本次导入';}
    else if(r&&finished(r)){action='update';text='准备此包同名更新';}
    primary.dataset.action=action;
    primary.textContent=phase==='executing'?'正在执行导入…':phase==='checking'?'正在检查…':phase==='selection'?'正在核对依赖…':text;
    primary.disabled=locked()||!storageOK||(action==='execute'&&$('btnExec').disabled);
    if(chosen.length&&!editor){const confirmed=chosen.filter(canRun).length;$('execSummary').textContent='已确认 '+confirmed+' / '+chosen.length+' 包 · 已选 '+chosen.length+' 包 · '+chosen.reduce((n,x)=>n+rowWriteEntries(x).length,0)+' 项资产';}
    $('queueSummary').textContent=chosen.length+' / '+rows().length+' 包已选';
    $('actions').hidden=false;
  }
  async function workspacePrimary(){
    if(locked()||!storageOK)return;
    const action=$('primary').dataset.action,r=record(inspected);
    if(action==='save')return saveEdit();
    if(editor)return;
    if(action==='add')return edit('add');
    if(action==='execute')return execute();
    if(action==='confirm')return confirmCurrent();
    if(action==='next')return nextWorkspacePackage();
    if(action==='check'&&r?.selected&&!finished(r)){await preview([r.id]);if(typeof MaterialWorkbench!=='undefined')MaterialWorkbench.setPane('preview');return;}
    if(action==='update'&&r)return prepareUpdate(r.id);
    if(action==='select'&&r&&!finished(r)){r.selected=true;rebuildBatchChecks();persist();refresh();}
  }
  function toggleWorkspacePaths(){workspacePaths=!workspacePaths;renderNameReview();}
  function renderGpuPolicy(r,spec,off){
    if(!spec)return '';
    const skipped=(r.excludedAssetKeys||[]).includes('ps');
    let limits=[];try{limits=gpuDrawLimits({spec,gpuMeasuredPeaks:r.gpuMeasuredPeaks});}catch(_){}
    const content=(spec.emitters||[]).map((es,index)=>{
      if(!es.gpu)return '';const key=gpuEmitterKey(es,index),v=limits.find(l=>l.index===index),id='fw-gpu-peak-'+r.id+'-'+index;
      return '<div class="fw-gpu-limit"><label for="'+id+'">'+esc(es.name)+' · '+(v?.calculated!=null?'计算上限 '+v.calculated:'计算数据不足')+'</label><input id="'+id+'" type="text" inputmode="numeric" data-gpu-record="'+esc(r.id)+'" data-gpu-index="'+index+'" value="'+esc(String(r.gpuMeasuredPeaks?.[key]??''))+'" placeholder="实机峰值（留空自动）" aria-label="'+esc(es.name)+' 实机峰值" '+(skipped?'disabled':off)+'><small>'+(skipped?'粒子已跳过，不写入':v?'将写入 '+v.limit+' · '+(v.source==='measured'?'实机峰值':'计算保守上限'):'请检查生成、寿命或实机峰值')+'</small></div>';
    }).join('');
    return '<details class="fw-preview-rules fw-gpu-policy" data-policy-record="'+esc(r.id)+'"><summary>粒子系统设置 · '+(skipped?'本次跳过':'固定10 FPS · 剔除1200m')+'</summary><p>固定包围盒：各轴 −1000m 至 +1000m。预热/非活动等待为0；缩略图预热1s；LOD检查1s；VRS 2×2。</p><p>GPU按速率、最大寿命、Burst与循环重叠计算上限，并留1个固定tick余量。填实机峰值后覆盖，清空恢复计算；改动后须重新确认。</p>'+content+'</details>';
  }
  function renderWorkspaceAssets(){
    const r=record(inspected),targets=r?namingRows(r):[];
    const previousPolicy=$('reviewContent').querySelector('.fw-gpu-policy'),policyOpen=previousPolicy?.dataset.policyRecord===r?.id&&previousPolicy?.open;
    $('nameReview').hidden=false;$('main').hidden=false;if(typeof MaterialWorkbench!=='undefined')MaterialWorkbench.syncPanes();
    $('reviewHeading').textContent='资产预览';
    $('paths').textContent=workspacePaths?'收起目标目录':'查看目标目录';
    $('paths').setAttribute('aria-expanded',String(workspacePaths));
    $('scopeSummary').textContent=targets.length?'已选 '+targets.filter(t=>t.selected).length+' / '+targets.length+' 项':'';
    $('reviewContent').classList.toggle('fw-show-paths',workspacePaths);
    if(!r){$('reviewContent').innerHTML='<div class="fw-empty">添加素材包后，在这里核对实际资产名称和导入范围。</div>';$('btnConfirmNames').disabled=true;return;}
    const spec=proposals.get(r.id)?.item.spec;
    const oldCount=proposals.get(r.id)?.item.targets?.find(t=>t.key==='ps')?.emitterCount||0;
    const error=r.errs?.length?'<div class="fw-workspace-error" role="alert"><strong>需要处理后重新检查</strong><p>'+esc(r.errs[0].slice(0,180))+(r.errs[0].length>180?'…':'')+'</p><details><summary>查看完整错误 · '+r.errs.length+' 条</summary><p>'+r.errs.map(esc).join('<br>')+'</p></details><button type="button" class="btn ghost" data-open-log>查看操作记录</button></div>':'';
    const off=locked()||!!editor||finished(r)?'disabled':'';
    const rowsHtml=targets.map(t=>{
      const operation=t.selected?t.action:t.optional?(t.reuseRequested?'复用现有轮廓图':'跳过'):t.reused?'复用现有依赖':'跳过';
      const role=!t.selected?(t.reuseRequested||t.reused?'reuse':'skip'):/更新/.test(t.action)?'update':/复用/.test(t.action)?'reuse':'create';
      return '<tr class="'+(t.selected?'':'fw-asset-skipped')+'"><td><label class="fw-asset-choice"><input type="checkbox" data-asset-record="'+esc(r.id)+'" data-asset-key="'+esc(t.key)+'" aria-label="导入 '+esc(t.name)+'" '+(t.selected?'checked ':'')+off+'><span class="fw-sr">'+esc(t.type)+'</span></label></td><td>'+esc(t.type)+'</td><td><code class="fw-final-name" tabindex="0" title="'+esc(t.name)+'">'+esc(t.name)+'</code><div class="fw-target-path">'+esc(t.directory)+'</div><details class="fw-asset-source"><summary>来源与设置</summary><p class="fw-path">'+esc(t.source)+'</p>'+(t.policy?'<p>'+esc(t.policy.platform)+' · 最大 '+t.policy.maxSize+' · 三个平台 ASTC 6×6</p>':'')+'</details>'+(t.optional&&!t.selected?'<label class="fw-asset-choice fw-reuse-choice"><input type="checkbox" data-asset-record="'+esc(r.id)+'" data-asset-reuse-key="'+esc(t.key)+'" aria-label="复用现有轮廓图 '+esc(t.name)+'" '+(t.reuseRequested?'checked ':'')+off+'>复用现有轮廓图（不导入）</label>':'')+'</td><td><span class="fw-operation" data-action-role="'+role+'">'+esc(operation)+'</span></td></tr>';
    }).join('');
    $('reviewContent').innerHTML='<article class="fw-review-pack"><div class="fw-preview-identity"><strong>'+esc(r.baseName)+'</strong><span class="fw-tag '+(canRun(r)?'done':checked(r)?'names':r.state)+'">'+esc(statusLabel(r))+'</span></div>'+error+(targets.length?'<div class="fw-name-table"><table><caption class="fw-sr">'+esc(r.as)+' 的资产名称对应</caption><thead><tr><th scope="col"><span class="fw-sr">导入</span></th><th scope="col">类型</th><th scope="col">最终资产名</th><th scope="col">处理</th></tr></thead><tbody>'+rowsHtml+'</tbody></table></div>':'<div class="fw-empty">'+(finished(r)?'历史任务没有完整资产清单。':'填写中栏设置，点击底部「检查并生成资产预览」。')+'</div>')+'<details class="fw-preview-rules"><summary>命名与导入规则</summary><p>基础名 <code>'+esc(r.baseName)+'</code> · 贴图/材质编号 <code>'+esc(r.assetIndex)+'</code> · '+esc(r.particleNumbered?'粒子带编号（兼容旧资源）':'粒子不带数字编号')+'</p><p>素材包：'+esc(r.dir)+'</p><p>'+esc(assetNamingHint(r))+'</p><p>HD 2048 · 手游 1024 · 三个平台 ASTC 6×6；仅写入现有目录。材质实例单面显示；普通素材关闭溶解，仅显式标记的1×1单帧开启。</p><p>勾选＝导入/更新；取消＝跳过写入，不删除现有资产。可选轮廓图取消后，本次重建的粒子不使用轮廓图，使用默认四边形，可能增加 overdraw。主贴图、Ramp、材质等必需依赖仍须导入或已存在。未勾选的粒子与材质保持原状。</p>'+(r.mode==='update'?'<p>同名更新 · 勾选粒子时全部重建发射器：'+oldCount+' → '+(spec?.emitters?.length||0)+' 个；替换人工调整。执行前保存并备份已有目标，失败查看阶段和备份。</p>':'<p>新建资源：同名目标阻止写入。取消必需依赖时须已存在且类型正确。</p>')+'</details></article>';
    $('reviewContent').querySelector('[data-open-log]')?.addEventListener('click',()=>{WorkbenchLog.setOpen(true);document.getElementById('log').focus({preventScroll:true});});
    $('reviewContent').querySelectorAll('[data-asset-key]').forEach(input=>{input.onchange=()=>setAssetSelected(input.dataset.assetRecord,input.dataset.assetKey,input.checked);});
    $('reviewContent').querySelectorAll('[data-asset-reuse-key]').forEach(input=>{input.onchange=()=>setAssetReuse(input.dataset.assetRecord,input.dataset.assetReuseKey,input.checked);});
    const skippedCutouts=targets.filter(t=>t.optional&&!t.selected&&!t.reuseRequested).length;if(skippedCutouts)$('reviewContent').insertAdjacentHTML('beforeend','<div class="fw-asset-warning" role="note">已跳过 '+skippedCutouts+' 张轮廓图；本次重建粒子使用默认四边形，可能增加 overdraw。</div>');
    $('reviewContent').insertAdjacentHTML('beforeend',renderGpuPolicy(r,spec,off));
    const policyDetails=$('reviewContent').querySelector('.fw-gpu-policy');if(policyDetails)policyDetails.open=!!policyOpen;
    $('reviewContent').querySelectorAll('[data-gpu-index]').forEach(input=>{input.oninput=()=>setGpuMeasuredPeak(input.dataset.gpuRecord,Number(input.dataset.gpuIndex),input.value,true);input.onchange=()=>setGpuMeasuredPeak(input.dataset.gpuRecord,Number(input.dataset.gpuIndex),input.value);});
    $('reviewHint').textContent=checked(r)?'核对完整名称和范围后确认。确认不会执行导入。':'先处理提示，再重新检查。';
    $('btnConfirmNames').textContent=phase==='selection'?'检查中…':'确认名称无误';
    $('btnConfirmNames').disabled=locked()||!!editor||!storageOK||!reviewValid();
  }
