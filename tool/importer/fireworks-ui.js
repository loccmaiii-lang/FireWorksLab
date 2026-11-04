  // A fresh check and explicit confirmation of its exact naming plan are both required.
  let batches=[], active='', inspected='', currentFilter='all', editor='', phase='', stopRequested=false, storageOK=true;
  let nameReview=null;
  const verified=new Map(), proposals=new Map(), confirmations=new Map();
  const uid=()=> 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);
  const labels={unchecked:'待检查',checking:'检查中',ready:'可导入',error:'检查失败',conflict:'目标冲突',running:'导入中',failed:'导入未完成',done:'已完成',pending:'待 GPU 收尾'};
  const finished=r=>['done','pending'].includes(r.state);
  const problem=r=>['error','conflict','failed'].includes(r.state);
  const batch=()=>batches.find(b=>b.id===active);
  const rows=()=>batch()?.rows||[];
  const record=id=>rows().find(r=>r.id===id);
  const namingFields=r=>({baseName:r.baseName,assetIndex:r.assetIndex,particleNumbered:r.particleNumbered,assetNaming:r.assetNaming??'formal'});
  const signature=r=>JSON.stringify([r.dir,r.as,r.mode||'create',r.baseName,r.assetIndex,r.particleNumbered,r.assetNaming,r.configFile||'cascade.json',[...(r.excludedAssetKeys||[])].sort(),[...(r.optionalReuseAssetKeys||[])].sort(),stableValue(r.gpuMeasuredPeaks||{}),r.scope||'all']);
  // 替换范围（用户 10-18）：只换贴图 = 粒子系统、材质实例都不选，它们在 UE 里改过的参数原样保留
  const texturesOnly=r=>r.scope==='textures';
  // 同一目标粒子上次完整导入（含粒子系统）时的帧计划指纹（cascade source.plan_sig）
  function previousPlanSig(r){
    for(const b of batches.slice().reverse())for(const p of b.rows.slice().reverse())if(p!==r&&p.planSig&&p.completedAt&&p.assets?.ps&&p.assets.ps===r.assets?.ps)return p.planSig;
    return '';
  }
  const checked=r=>r.state==='ready'&&verified.get(r.id)?.signature===signature(r)&&JSON.stringify(r.assets)===JSON.stringify(verified.get(r.id).item.assets);
  const canRun=r=>checked(r)&&confirmations.get(r.id)===verified.get(r.id).fingerprint;
  const statusLabel=r=>r.state==='done'&&r.completedAssetKeys?.length<Object.keys(r.assets||{}).length?'所选 '+r.completedAssetKeys.length+' 项已完成 · 其余跳过':r.state==='ready'?(canRun(r)?(r.mode==='update'?'更新已确认 · 可执行':'名称已确认 · 可导入'):(r.mode==='update'?'待确认更新':'待确认名称')):(labels[r.state]||'待检查');
  const locked=()=>Workbench.busy||!!phase;
  const canCancelUpdate=r=>!!r.previousSuccess&&!r.importProgress;
  function say(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
  function feedback(message){$('feedback').textContent=message;if(typeof MaterialWorkbench!=='undefined')MaterialWorkbench.toast(message);}
  function persist(){
    try {const st=loadLS();saveLS({...st,version:2,batches,active});storageOK=true;return true;}
    catch(e){storageOK=false;say('无法保存本地记录，已暂停执行。请允许浏览器存储后重试。',true);log('本地记录保存失败：'+e.message,'err');return false;}
  }
  function syncImportName(r){r.as=r.baseName+'_'+r.assetIndex;}
  function restoreNaming(r){
    r.configFile=r.configFile||'cascade.json';
    r.gpuMeasuredPeaks=r.gpuMeasuredPeaks&&typeof r.gpuMeasuredPeaks==='object'&&!Array.isArray(r.gpuMeasuredPeaks)?r.gpuMeasuredPeaks:{};
    r.excludedAssetKeys=Array.isArray(r.excludedAssetKeys)?[...new Set(r.excludedAssetKeys.filter(k=>typeof k==='string'))]:[];
    r.optionalReuseAssetKeys=Array.isArray(r.optionalReuseAssetKeys)?[...new Set(r.optionalReuseAssetKeys.filter(k=>typeof k==='string'&&r.excludedAssetKeys.includes(k)))]:[];
    // Previously executed/partially executed targets must not silently migrate.
    if(!Object.prototype.hasOwnProperty.call(r,'assetNaming'))r.assetNaming=(finished(r)||r.state==='failed'||r.state==='running'||r.importProgress||r.mode==='update'||r.previousSuccess)?'legacy':'formal';
    if(!Object.prototype.hasOwnProperty.call(r,'baseName')){
      Object.assign(r,splitImportName(r.as));r.particleNumbered=true;
    }else{
      r.baseName=String(r.baseName??'');r.assetIndex=String(r.assetIndex??'');r.particleNumbered=r.particleNumbered===true;
    }
    syncImportName(r);
    if(r.previousSuccess)restoreNaming(r.previousSuccess);
  }
  function fresh(dir,naming){
    const r={id:uid(),dir,...naming,assetNaming:naming.assetNaming??'formal',mode:'create',selected:true,excludedAssetKeys:[],optionalReuseAssetKeys:[],state:'unchecked',errs:[],assets:{}};
    syncImportName(r);return r;
  }
  function parseLines(text){
    return text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).map((line,i)=>{
      const parts=line.split('|').map(x=>x.trim().replace(/^"|"$/g,''));
      if(parts.length<2||parts.length>4)throw Error('第 '+(i+1)+' 行需填写：素材包路径 | 基础名（可追加 | 贴图/材质编号 | 粒子编号规则）');
      const [d,n,index,particle]=parts;
      if(!d||!n)throw Error('第 '+(i+1)+' 行的路径或名称为空');
      if(parts.length===4&&!['带编号','不带编号'].includes(particle))throw Error('第 '+(i+1)+' 行粒子编号规则需为「带编号」或「不带编号」');
      const naming=parts.length===2?splitImportName(n):{baseName:n,assetIndex:index};
      const row={dir:d.replace(/\\/g,'/').replace(/\/+$/,''),...naming,particleNumbered:particle==='带编号',explicitParticleRule:parts.length===4};
      syncImportName(row);return row;
    });
  }
  function invalidateRecord(r){verified.delete(r.id);proposals.delete(r.id);confirmations.delete(r.id);closeNameReview();r.state='unchecked';r.errs=[];r.assets={};delete r.checkedAt;delete r.gpu;delete r.packDiagnostic;}
  function prepareUpdate(id){
    if(locked()||editor)return;const r=record(id);if(!r)return;
    if(finished(r))r.previousSuccess={state:r.state,assets:{...r.assets},gpuMeasuredPeaks:{...(r.gpuMeasuredPeaks||{})},excludedAssetKeys:[...(r.excludedAssetKeys||[])],optionalReuseAssetKeys:[...(r.optionalReuseAssetKeys||[])],completedAssetKeys:r.completedAssetKeys?[...r.completedAssetKeys]:undefined,as:r.as,...namingFields(r),dir:r.dir,mode:r.mode||'create',completedAt:r.completedAt};
    r.mode='update';invalidateRecord(r);delete r.importProgress;r.selected=true;inspected=r.id;persist();refresh();
    say('已准备同名更新，保留原名称、编号及资产命名规则。请重新检查，确认全部发射器重建及贴图、材质的替换清单。');
  }
  function cancelUpdate(id){
    if(locked()||editor)return;const r=record(id);if(!r||!canCancelUpdate(r))return;
    const previous=r.previousSuccess;invalidateRecord(r);Object.assign(r,previous,{selected:false});delete r.previousSuccess;persist();refresh();say('已取消尚未执行的更新，原资产保留。');
  }
  function chooseDirectory(r,dir){
    if(locked()||editor||finished(r))return;r.dir=dir.trim().replace(/\\/g,'/').replace(/\/+$/,'');invalidateRecord(r);persist();refresh();return preview([r.id]);
  }
  function button(text,action,cls='btn ghost btn-small'){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.onclick=action;return b;}
  function particleNamingHint(r){return(r.particleNumbered?'粒子系统使用当前编号，名称会随编号变化。':'粒子系统默认不带数字编号，仍保留 _HD。')+'修改规则只改变导入目标，不会重命名已有 UE 资产。';}
  function assetNamingHint(r){return r.assetNaming==='legacy'?'沿用旧命名：保留历史导入的目标名称。同名更新会继续使用这些路径；切换为包内正式名称会改变依赖目标，旧资产仍保留。':'包内正式名称优先：贴图使用导出包的 asset；材质采用对应主贴图的层名与分段号。基础名称用于粒子系统，贴图/材质编号仅用于无 asset 的旧格式回退。要改包内依赖名，请在烘焙器修改交付名后重新导出。';}
  function namingInputs(r,prefix='',disabled=false){
    const nameId=prefix?'editAs':'name',indexId=prefix?'editIndex':'index',particleId=prefix?'editParticleNumbered':'particleNumbered',ruleId=prefix?'editAssetNaming':'assetNaming',off=disabled?' disabled':'';
    return'<div class="fw-naming-fields"><div><label for="fwimp-'+nameId+'">基础名称</label><input type="text" id="fwimp-'+nameId+'" value="'+esc(r.baseName)+'" placeholder="例如 GoldSpark" spellcheck="false"'+off+'></div><div><label for="fwimp-'+indexId+'">贴图/材质编号</label><input type="text" id="fwimp-'+indexId+'" value="'+esc(r.assetIndex)+'" inputmode="numeric" pattern="[0-9]{2}" maxlength="2" placeholder="01" aria-describedby="fwimp-'+indexId+'Hint"'+off+'></div></div><p class="hint" id="fwimp-'+indexId+'Hint">基础名称不用填写末尾编号。两位编号默认 01；包内正式分段编号保持导出值，当前编号用于旧格式回退及可选粒子编号。</p><label for="fwimp-'+ruleId+'">资产命名</label><select id="fwimp-'+ruleId+'" aria-describedby="fwimp-'+ruleId+'Hint"'+off+'><option value="formal"'+(r.assetNaming!=='legacy'?' selected':'')+'>包内正式名称优先</option><option value="legacy"'+(r.assetNaming==='legacy'?' selected':'')+'>沿用旧命名（历史资源）</option></select><details class="fw-advanced-naming"><summary>更多命名设置</summary><p class="hint" id="fwimp-'+ruleId+'Hint">'+esc(assetNamingHint(r))+'</p><label class="fw-naming-option" for="fwimp-'+particleId+'"><input type="checkbox" id="fwimp-'+particleId+'" aria-describedby="fwimp-'+particleId+'Hint"'+(r.particleNumbered?' checked':'')+off+'>粒子系统也使用编号（兼容旧资源）</label><p class="hint" id="fwimp-'+particleId+'Hint">'+esc(particleNamingHint(r))+'</p></details>';
  }
  function namingChanged(r){
    syncImportName(r);invalidateRecord(r);const saved=persist();renderList();
    const hint=$('particleNumberedHint');if(hint)hint.textContent=particleNamingHint(r);
    const ruleHint=$('assetNamingHint');if(ruleHint)ruleHint.textContent=assetNamingHint(r);
    $('detailResult').innerHTML='<p class="hint">设置已修改，请点击底部检查。</p>';renderNameReview();
    if(saved)say('命名设置已修改，请重新检查并确认完整名称。');
  }
  function namingRows(r){
    const spec=proposals.get(r.id)?.item.spec;
    return Object.entries(r.assets||{}).sort(([a],[b])=>(a==='ps'?-1:a.startsWith('mat:')?0:1)-(b==='ps'?-1:b.startsWith('mat:')?0:1)).map(([key,path])=>{
      let type='粒子系统',source=(r.configFile||'cascade.json')+(spec?.name?' · '+spec.name:'');
      if(key.startsWith('tex:')){const t=spec?.textures?.[key.slice(4)];type={flipbook:'序列／单帧贴图',cutout:'轮廓图',ramp:'颜色 Ramp',dissolve:'溶解图（线性）'}[t?.class]||'贴图';source=t?.file||('贴图标识：'+key.slice(4));}
      else if(key.startsWith('mat:')){const k=key.slice(4),emitters=(spec?.emitters||[]).filter(e=>e.material===k).map(e=>e.name).filter(Boolean);type='材质实例';source='材质标识：'+k+(emitters.length?' · '+emitters.join(' / '):'');}
      const target=proposals.get(r.id)?.item.targets?.find(t=>t.key===key);
      const autoReuse=proposals.get(r.id)?.item.textureReuse?.[key];
      const action=autoReuse?(autoReuse.plannedOwner?'复用本批次贴图':'复用已保存贴图'):r.mode==='update'?(target?.exists?(key==='ps'?'全部重建发射器':'同名更新'):'新增'):'新增';
      const slash=path.lastIndexOf('/');return{key,optional:!!spec&&optionalCutout({spec},key),reuseRequested:(r.optionalReuseAssetKeys||[]).includes(key),selected:!(r.excludedAssetKeys||[]).includes(key),reused:!!autoReuse||proposals.get(r.id)?.item.reusedDependencies?.some(d=>d.key===key),type,source,name:path.slice(slash+1),directory:path.slice(0,slash),action,policy:key.startsWith('tex:')?texturePolicy(path):null};
    });
  }
  function rowWriteEntries(r){return writeAssetEntries({assets:r.assets,selectedAssetKeys:Object.keys(r.assets||{}).filter(k=>!(r.excludedAssetKeys||[]).includes(k)),textureReuse:proposals.get(r.id)?.item.textureReuse});}
  function rowSelectedKeys(r){return Object.keys(r.assets||{}).filter(k=>!(r.excludedAssetKeys||[]).includes(k));}
  async function checkSelectedPlan(r,plan,deferBatch=false){
    const item=plan.item;item.selectedAssetKeys=rowSelectedKeys(r);item.optionalReuseAssetKeys=[...(r.optionalReuseAssetKeys||[])];
    item.gpuMeasuredPeaks={...(r.gpuMeasuredPeaks||{})};
    const errors=[...plan.baseErrors,...particlePolicyErrors(item)];
    for(const [key]of selectedAssetEntries(item))if(key.startsWith('tex:')&&!plan.sourceExists?.[key.slice(4)])errors.push('缺少贴图：'+item.spec.textures[key.slice(4)].file);
    if(item.mode==='update')errors.push(...validateUpdateTargets(item));
    else for(const [key,path]of writeAssetEntries(item))if(plan.targetExists[key]!==false)errors.push(plan.targetExists[key]===true?'目标已存在：'+path+'。迭代原资源请切换「更新同名」，不需改序号。':'无法确认目标是否存在，请检查 UE 连接：'+path);
    if(texturesOnly(r)){
      if(item.mode!=='update')errors.push('只换贴图：请把「本次操作」设为「更新同名」');
      for(const [key,path]of selectedAssetEntries(item))if(key.startsWith('tex:')&&item.mode==='update'&&!(item.targets||[]).some(t=>t.key===key&&t.exists))errors.push('只换贴图：UE 里没有 '+path+'（贴图名或格子变了，只换贴图接不上），请改用「全部」');
      const prev=previousPlanSig(r),cur=item.spec?.source?.plan_sig||'';
      if(prev&&cur&&prev!==cur)errors.push('只换贴图：帧计划指纹变了（上次 '+prev+' → 这次 '+cur+'，帧数 / 时长 / 面片大小有改动），只换贴图会错帧，请改用「全部」');
    }
    errors.push(...await validateAssetSelection(item));
    plan.signature=signature(r);plan.fingerprint=JSON.stringify(item);plan.errors=errors;
    confirmations.delete(r.id);
    if(deferBatch){r.errs=[...errors];verified.delete(r.id);r.state=errors.length?(errors.some(e=>e.startsWith('目标已存在'))?'conflict':'error'):'ready';if(!errors.length)verified.set(r.id,plan);}
    else rebuildBatchChecks();
  }
  function rebuildBatchChecks(){
    for(const r of rows().filter(r=>!finished(r))){const plan=proposals.get(r.id);if(!plan||!['checking','ready','conflict','error'].includes(r.state)||plan.signature!==signature(r))continue;r.errs=[...(plan.errors||[])];verified.delete(r.id);if(!r.errs.length){r.state='ready';verified.set(r.id,plan);}else r.state=r.errs.some(e=>e.startsWith('目标已存在'))?'conflict':'error';}

        for(const r of rows().filter(r=>r.selected&&!finished(r))){
          const item=proposals.get(r.id)?.item;
          for(const entry of Object.values(item?.textureReuse||{}))if(entry.plannedOwner){
            const owner=record(entry.plannedOwner),ownerPlan=owner&&proposals.get(owner.id)?.item;
            if(!owner||(!finished(owner)&&(!owner.selected||!ownerPlan||!assetSelected(ownerPlan,entry.ownerKey)||!checked(owner)))){
              r.state='error';r.errs.push('批次复用的来源未勾选或未检查通过，请重新检查：'+entry.pkg);verified.delete(r.id);confirmations.delete(r.id);
            }
          }
        }
        const targets=new Map();
        for(const r of rows().filter(r=>r.selected&&!finished(r)))for(const [key,p]of rowWriteEntries(r)){
          const lower=p.toLowerCase();if(!targets.has(lower))targets.set(lower,{path:p,owners:new Map()});
          const target=targets.get(lower);if(!target.owners.has(r.id))target.owners.set(r.id,{record:r,keys:[]});target.owners.get(r.id).keys.push(key);
        }
        for(const {path,owners}of targets.values()){
          const entries=[...owners.values()],internal=entries.some(e=>e.keys.length>1);
          if(entries.length<2&&!internal)continue;
          for(const {record:r,keys}of entries){
            if(finished(r))continue;r.state='conflict';
            const particleConflict=entries.length>1&&entries.some(e=>e.keys.includes('ps')&&!e.record.particleNumbered);
            const formalConflict=entries.some(e=>e.record.assetNaming==='formal'&&e.keys.some(key=>{
              const spec=proposals.get(e.record.id)?.item.spec;return spec&&!!formalDependencyName(spec,key);
            }));
            const msg=particleConflict?'粒子系统目标重名。未启用粒子编号时，修改贴图/材质编号不能改变粒子名。请改基础名称、只勾选一项，或明确启用粒子编号后重新检查：'+path:formalConflict?'包内正式资产目标相同，修改基础名或编号不会改变包内依赖名。请只勾选一项，或在烘焙器修改交付名后重新导出：'+path:entries.length>1?'不同素材包生成同一目标，请修改基础名称或贴图/材质编号后重新检查：'+path:'素材包内目标重名（'+keys.join(' / ')+'），请重新检查素材包与贴图命名规则：'+path;
            if(!r.errs.includes(msg))r.errs.push(msg);verified.delete(r.id);confirmations.delete(r.id);
          }
        }
  }
  async function setAssetSelected(id,key,value,reuse){
    if(locked()||editor)return;const r=record(id),plan=proposals.get(id);
    if(!r||!plan||!(key in r.assets)||finished(r))return;
    const group=Object.keys(r.assets).filter(k=>r.assets[k]===r.assets[key]);
    if(value&&texturesOnly(r)&&!key.startsWith('tex:'))r.scope='all';     // 手动勾回材质 / 粒子 = 不再是只换贴图
    r.excludedAssetKeys=[...new Set(r.excludedAssetKeys||[])].filter(k=>!group.includes(k));if(!value)r.excludedAssetKeys.push(...group);
    r.optionalReuseAssetKeys=(r.optionalReuseAssetKeys||[]).filter(k=>k!==key);if(!value&&reuse===true&&optionalCutout(plan.item,key))r.optionalReuseAssetKeys.push(key);
    const reuseFocus=document.activeElement?.dataset.assetReuseKey===key;
    const restoreFocus=document.activeElement?.dataset.assetRecord===id&&(document.activeElement?.dataset.assetKey===key||reuseFocus);
    confirmations.delete(id);verified.delete(id);if(!persist()){refresh();return;}
    const result=await Workbench.run('检查资产选择',async()=>{
      phase='selection';refresh();
      try{endReadCache();await checkSelectedPlan(r,plan);const entry=nameReview?.entries.find(e=>e.id===id);if(entry){entry.signature=signature(r);entry.fingerprint=plan.fingerprint;}persist();}
      catch(error){r.state='error';r.errs=[error.message||String(error)];plan.errors=[...r.errs];verified.delete(id);log('资产选择检查失败：'+r.errs[0],'err');}
      finally{phase='';refresh();}
    });
    if(restoreFocus)Array.from($('reviewContent').querySelectorAll(reuseFocus?'[data-asset-reuse-key]':'[data-asset-key]')).find(input=>input.dataset.assetRecord===id&&(reuseFocus?input.dataset.assetReuseKey:input.dataset.assetKey)===key)?.focus({preventScroll:true});
    return result;
  }
  function setAssetReuse(id,key,value){
    const plan=proposals.get(id);if(!plan||!optionalCutout(plan.item,key)||!(record(id)?.excludedAssetKeys||[]).includes(key))return;
    return setAssetSelected(id,key,false,value===true);
  }
  async function setGpuMeasuredPeak(id,index,value,draft=false){
    if(locked()||editor)return;const r=record(id),plan=proposals.get(id),es=plan?.item.spec.emitters?.[index];
    if(!r||!plan||finished(r)||!es?.gpu||(r.excludedAssetKeys||[]).includes('ps'))return;
    const key=gpuEmitterKey(es,index),text=String(value).trim();
    r.gpuMeasuredPeaks={...(r.gpuMeasuredPeaks||{})};
    if(!text)delete r.gpuMeasuredPeaks[key];else r.gpuMeasuredPeaks[key]=/^\d+$/.test(text)&&Number.isSafeInteger(Number(text))?Number(text):text;
    confirmations.delete(id);verified.delete(id);if(!persist()){refresh();return;}
    if(draft){r.state='unchecked';r.errs=[];persist();renderList();$('btnConfirmNames').disabled=true;return;}
    return Workbench.run('检查GPU数量',async()=>{phase='selection';r.state='checking';refresh();try{await checkSelectedPlan(r,plan);const entry=nameReview?.entries.find(e=>e.id===id);if(entry){entry.signature=signature(r);entry.fingerprint=plan.fingerprint;}persist();}catch(e){r.state='error';r.errs=[e.message];verified.delete(id);}finally{phase='';refresh();}});
  }
  function reviewValid(){return !!nameReview&&nameReview.batch===active&&nameReview.entries.length>0&&nameReview.entries.every(entry=>{
    const r=record(entry.id);return r&&r.selected&&checked(r)&&entry.signature===signature(r)&&entry.fingerprint===verified.get(r.id).fingerprint;
  });}
  function renderNameReview(){renderWorkspaceAssets();}
  function reviewNames(ids){
    if(locked()||editor)return;
    const candidates=rows().filter(r=>!finished(r)&&r.selected&&(ids?ids.includes(r.id):checked(r)));
    if(!candidates.length){say('请先添加素材并检查，生成实际名称后再预览。',true);return;}
    nameReview={batch:active,entries:candidates.map(r=>({id:r.id,signature:signature(r),fingerprint:verified.get(r.id)?.fingerprint||null}))};
    inspected=candidates[0].id;if(currentFilter==='errors'&&!problem(candidates[0]))currentFilter='all';renderList();renderDetail();renderNameReview();renderSummary();$('reviewHeading').focus();
  }
  function closeNameReview(){nameReview=null;$('main').hidden=false;$('btnConfirmNames').disabled=true;renderNameReview();renderSummary();}
  function confirmNames(){
    if(locked()||editor||!reviewValid()){if(nameReview)say('名称计划已失效，请返回重新检查。',true);return;}
    if(!persist()){renderSummary();renderNameReview();return;}
    const count=nameReview.entries.length;for(const entry of nameReview.entries)confirmations.set(entry.id,entry.fingerprint);
    closeNameReview();refresh();const remaining=rows().filter(r=>r.selected&&checked(r)&&!canRun(r)).length;
    say('已确认 '+count+' 个素材包的名称与操作。'+(remaining?'所选项中还有 '+remaining+' 项待确认，请继续预览。':'核对勾选项后，点击「'+$('btnExec').textContent+'」执行。'));$(remaining?'btnReviewNames':'btnExec').focus();
  }
  function renderPending(){
    const pending=loadLS().pending||[];$('queueCount').textContent=pending.length;
    $('pending').innerHTML=pending.length?pending.map(p=>'<div class="fw-queue-item"><strong>'+esc(p.split('.').pop())+'</strong><p class="fw-path">'+esc(p)+'</p><span class="fw-tag pending">已导入 · 待重启后收尾</span></div>').join(''):'<div class="fw-empty">暂无 GPU 待办。需要收尾的素材导入后会自动出现在这里。</div>';
    $('btnFinish').disabled=locked()||!storageOK||!pending.length||!$('restarted').checked;
    $('restarted').disabled=locked()||!pending.length;
  }
  function renderList(){
    const all=rows(),visible=all.filter(r=>currentFilter!=='errors'||problem(r));
    $('allFilter').textContent='全部 '+all.length;$('errorFilter').textContent='需处理 '+all.filter(problem).length;
    $('allFilter').classList.toggle('active',currentFilter==='all');$('errorFilter').classList.toggle('active',currentFilter==='errors');
    $('list').innerHTML=visible.length?visible.map(r=>'<div class="fw-item '+(r.id===inspected?'inspect':'')+'" data-id="'+esc(r.id)+'"><label class="fw-package-choice"><input type="checkbox" aria-label="'+(finished(r)?'选择并准备同名更新 ':'选择 ')+esc(r.as)+'" '+(r.selected?'checked':'')+' '+(locked()||editor?'disabled':'')+'><span class="fw-sr">导入此包</span></label><button type="button" class="fw-item-name" aria-pressed="'+(r.id===inspected)+'"><strong>'+esc(r.baseName||'未命名')+'</strong><small>'+esc(r.assetNaming==='legacy'?'旧命名 · 贴图/材质 '+r.assetIndex:'包内名称优先 · 旧格式回退 '+r.assetIndex)+' · '+(r.particleNumbered?'粒子带编号':'粒子不带编号')+'</small><small>'+esc(r.dir)+(r.mode==='update'&&!finished(r)?' · 同名更新':'')+'</small></button><span class="fw-tag '+esc(r.state==='ready'&&!canRun(r)?'names':r.state)+'">'+esc(statusLabel(r))+'</span></div>').join(''):'<div class="fw-empty">'+(all.length?'当前没有需要处理的项。':'还没有素材包。点击「添加素材」，或一次粘贴多行路径。')+'</div>';
    $('list').querySelectorAll('.fw-item').forEach(el=>{const r=record(el.dataset.id);el.querySelector('button').onclick=()=>{if(locked()||editor)return;inspected=r.id;renderList();renderDetail();renderNameReview();renderSummary();if(typeof MaterialWorkbench!=='undefined')MaterialWorkbench.setPane('settings');};el.querySelector('input').onchange=e=>{if(locked()||editor)return;if(finished(r)&&e.target.checked){prepareUpdate(r.id);return;}r.selected=e.target.checked;rebuildBatchChecks();persist();renderSummary();$('list').querySelectorAll('.fw-item').forEach(item=>{const row=record(item.dataset.id),tag=item.querySelector('.fw-tag');tag.textContent=statusLabel(row);tag.className='fw-tag '+(row.state==='ready'&&!canRun(row)?'names':row.state);});renderNameReview();renderSummary();};});
    renderSummary();
  }
  function renderSummary(){
    const pending=rows().filter(r=>!finished(r)),chosen=pending.filter(r=>r.selected),blocked=chosen.filter(r=>!checked(r)),valid=chosen.filter(checked),unconfirmed=valid.filter(r=>!canRun(r)).length,count=valid.reduce((n,r)=>n+rowWriteEntries(r).length,0),updates=chosen.filter(r=>r.mode==='update').length;
    const targets=valid.flatMap(r=>rowWriteEntries(r).map(([,p])=>p.toLowerCase())),duplicate=new Set(targets).size!==targets.length;
    $('execSummary').textContent=chosen.length?'已选 '+chosen.length+' 项 · 新建 '+(chosen.length-updates)+' / 同名更新 '+updates+' · '+count+' 项资产':'尚未选择素材';
    $('execHint').textContent=phase==='executing'?'正在处理当前项。停止操作会在当前素材包完成后生效。':editor?'先保存或取消编辑，再执行检查。':blocked.length?blocked.length+' 个勾选项未检查通过，请修正或直接取消勾选。':duplicate?'勾选项包含相同目标，请只保留其中一项。':unconfirmed?unconfirmed+' 项待确认，请先核对名称与操作。':'可执行 '+valid.length+' 项 · 需处理 '+rows().filter(problem).length+' 项 · 已完成 '+rows().filter(r=>r.state==='done').length+' 项';
    $('btnExec').disabled=locked()||!!editor||!!nameReview||!storageOK||!chosen.length||!!blocked.length||duplicate||unconfirmed>0;
    $('btnExec').textContent=phase==='executing'?'正在执行…':chosen.length?(updates===chosen.length?'更新所选 ':updates?'执行所选 ':'导入所选 ')+chosen.length+' 项':'执行所选素材';
    $('selectAll').disabled=locked()||!!editor||!pending.length;$('selectAll').checked=!!pending.length&&chosen.length===pending.length;$('selectAll').indeterminate=chosen.length>0&&chosen.length<pending.length;
    $('clearSelection').disabled=locked()||!!editor||!rows().some(r=>r.selected);
    $('btnReviewNames').disabled=locked()||!!editor||!valid.length;$('actions').hidden=false;
    const stage=nameReview?2:blocked.length?1:unconfirmed?2:chosen.length?3:1;
    for(const [i,id]of ['stepInput','stepNames','stepExecute'].entries()){$(id).classList.toggle('active',i+1===stage);if(i+1===stage)$(id).setAttribute('aria-current','step');else $(id).removeAttribute('aria-current');}
    $('stop').hidden=phase!=='executing';$('stop').disabled=stopRequested;$('stop').textContent=stopRequested?'已请求停止':'当前项完成后停止';renderWorkspacePrimary();
  }
  function renderDetail(){
    const r=record(inspected),el=$('detail');
    if(!r){el.innerHTML='<h3>素材详情</h3><p class="hint">点击列表中的素材查看详情。勾选框决定执行哪些素材。</p>';return;}
    const disabled=locked()||finished(r)||!!editor;
    el.innerHTML='<h3>'+esc(r.baseName)+'</h3><label for="fwimp-dir">素材包目录</label><input type="text" id="fwimp-dir" value="'+esc(r.dir)+'" title="'+esc(r.dir)+'" '+(disabled?'disabled':'')+'><label for="fwimp-mode">本次操作</label><select id="fwimp-mode" '+(disabled?'disabled':'')+'><option value="create" '+(r.mode!=='update'?'selected':'')+'>新建资源</option><option value="update" '+(r.mode==='update'?'selected':'')+'>更新同名 · 补建缺少项</option></select><label for="fwimp-scope">替换范围</label><select id="fwimp-scope" '+(disabled?'disabled':'')+' title="只换贴图：粒子系统、材质实例都不动，它们在 UE 里改过的参数原样保留；贴图自己的采样设置（NoMip、Clamp 等）也保留，只换像素。帧数 / 时长 / 格子改了要用「全部」。只换 PC 或手机：上面「素材配置」选对应平台。"><option value="all" '+(texturesOnly(r)?'':'selected')+'>全部（贴图 + 材质 + 粒子）</option><option value="textures" '+(texturesOnly(r)?'selected':'')+'>只换贴图（材质、粒子不动）</option></select>'+namingInputs(r,'',disabled)+'<div id="fwimp-detailResult">'+(r.scopeNote?'<p class="hint">'+esc(r.scopeNote)+'</p>':'')+'<p class="hint">'+(finished(r)?esc(statusLabel(r)):'参数或范围变更后需重新检查与确认。')+'</p><div id="fwimp-directoryChoices"></div>'+(r.state==='pending'?'<p class="hint">旧版GPU待办需要重启后收尾。</p>':'')+(r.backup?'<details class="fw-advanced-naming"><summary>本次更新备份</summary><p class="fw-path">'+esc(r.backup)+'</p></details>':'')+'</div><div class="row" id="fwimp-detailActions"></div>';

    const fields=el.querySelector('.fw-naming-fields');el.querySelector('h3').after(fields);fields.after(el.querySelector('label[for="fwimp-mode"]'),$('mode'));
    const choices=$('directoryChoices');
    if(r.packDiagnostic?.candidates?.length){const hint=document.createElement('p');hint.className='hint';hint.textContent='检测到以下素材包，请选择本次要导入的一项：';choices.append(hint);for(const dir of r.packDiagnostic.candidates){const b=button(dir.replace(/\\/g,'/').split('/').pop(),()=>chooseDirectory(r,dir));b.dataset.action='use-directory';b.title=dir;b.disabled=disabled;choices.append(b);}}
    const configLabel=document.createElement('label');configLabel.htmlFor='fwimp-configFile';configLabel.textContent='素材配置';
    const configSelect=document.createElement('select');configSelect.id='fwimp-configFile';configSelect.disabled=disabled;configSelect.innerHTML='<option value="cascade.json">PC · cascade.json</option><option value="cascade_mobile.json">手机 · cascade_mobile.json</option>';configSelect.value=r.configFile||'cascade.json';$('dir').after(configLabel,configSelect);
    configSelect.onchange=e=>{if(disabled||locked())return;r.configFile=e.target.value;invalidateRecord(r);persist();refresh();say('素材配置已切换，请重新检查并确认。');};
    $('mode').onchange=e=>{if(disabled)return;r.mode=e.target.value;invalidateRecord(r);persist();refresh();say('操作方式已修改，请重新检查并确认。');};
    $('scope').onchange=e=>{if(disabled)return;r.scope=e.target.value==='textures'?'textures':'all';
      if(texturesOnly(r)){r.mode='update';r.excludedAssetKeys=[...new Set([...(r.excludedAssetKeys||[]),...Object.keys(r.assets||{}).filter(k=>!k.startsWith('tex:'))])];}
      else r.excludedAssetKeys=(r.excludedAssetKeys||[]).filter(k=>k.startsWith('tex:'));
      invalidateRecord(r);persist();refresh();say(texturesOnly(r)?'只换贴图：粒子系统和材质实例不动（保留 UE 里改过的参数），已切到「更新同名」。请重新检查并确认。':'替换范围改为全部，请重新检查并确认。');};
    $('name').oninput=e=>{if(disabled||locked()||finished(r)||editor)return;r.baseName=e.target.value.trim();namingChanged(r);};
    $('index').oninput=e=>{if(disabled||locked()||finished(r)||editor)return;r.assetIndex=e.target.value.trim();namingChanged(r);};
    $('particleNumbered').onchange=e=>{if(disabled||locked()||finished(r)||editor)return;r.particleNumbered=e.target.checked;namingChanged(r);};
    $('assetNaming').onchange=e=>{if(disabled||locked()||finished(r)||editor)return;r.assetNaming=e.target.value;namingChanged(r);};
    $('dir').oninput=e=>{if(disabled)return;r.dir=e.target.value.trim().replace(/\\/g,'/').replace(/\/+$/,'');invalidateRecord(r);persist();renderList();$('detailResult').innerHTML='<p class="hint">目录已修改，请点击底部检查。</p>';renderNameReview();};
    // Explicit fixed action owns checks; editing a directory does not launch one.
    const actions=$('detailActions');
    if(!finished(r)){/* Checking lives in the single fixed primary action. */}
    else{const update=button('更新同名资源',()=>prepareUpdate(r.id),'btn btn-small');update.dataset.action='update';update.disabled=locked()||!!editor;actions.append(update);}
    if(canCancelUpdate(r)&&!finished(r)){const cancel=button('取消本次更新',()=>cancelUpdate(r.id));cancel.disabled=locked()||!!editor;actions.append(cancel);}
    const del=button('从批次移除',()=>{if(locked()||editor)return;invalidateRecord(r);batch().rows=rows().filter(x=>x!==r);inspected=rows()[0]?.id||'';persist();refresh();say('已移除批次记录，UE 资产仍保留。');});del.dataset.action='remove';del.title='仅移除本地记录，不删除 UE 资产';del.disabled=locked()||!!editor;actions.append(del);
    if(Object.keys(r.assets||{}).length){const copy=button('复制目标路径',async()=>{if(!Object.keys(r.assets||{}).length)return;const text=Object.values(r.assets).join('\n');try{await navigator.clipboard.writeText(text);feedback('目标路径已复制。');}catch{const area=document.createElement('textarea');area.value=text;area.setAttribute('aria-label','可复制的目标路径');el.append(area);area.select();feedback('请按 Ctrl+C 复制已选中的路径。');}});actions.append(copy);}
  }
  function refresh(){
    $('batch').innerHTML=batches.map(b=>'<option value="'+esc(b.id)+'" '+(b.id===active?'selected':'')+'>'+esc(b.title)+' · '+b.rows.length+' 项</option>').join('');
    for(const id of ['batch','new','add','bulk'])$(id).disabled=locked()||!!editor;
    $('btnPreview').disabled=locked()||!!editor||!rows().some(r=>!finished(r)&&r.selected);$('btnPreview').textContent=phase==='checking'?'正在检查…':'检查所选并预览';
    renderList();renderDetail();renderPending();renderNameReview();
  }
  function view(name){$('work').hidden=name!=='work';$('queue').hidden=name!=='queue';$('workTab').classList.toggle('active',name==='work');$('queueTab').classList.toggle('active',name==='queue');renderPending();}
  function filter(name){currentFilter=name;renderList();}
  function selectAll(value){if(locked()||editor)return;rows().filter(r=>!value||!finished(r)).forEach(r=>r.selected=value);rebuildBatchChecks();persist();renderList();}
  function newBatch(){if(locked()||editor)return;closeNameReview();const b={id:uid(),title:'批次 '+(batches.length+1)+' · '+new Date().toLocaleDateString(),rows:[]};batches.push(b);active=b.id;inspected='';currentFilter='all';persist();refresh();say('新批次已创建，添加素材包开始。');}
  function selectBatch(id){if(locked()||editor||!batches.some(b=>b.id===id))return;closeNameReview();active=id;inspected=rows()[0]?.id||'';currentFilter='all';persist();refresh();say('已切换批次。执行前请检查并确认名称。');}
  function cancelEdit(){editor='';$('editor').hidden=true;$('editor').innerHTML='';refresh();}
  function edit(mode){
    if(locked()||editor)return;closeNameReview();editor=mode;const el=$('editor');el.hidden=false;
    el.innerHTML=mode==='bulk'?'<h3>批量编辑未完成项</h3><p class="hint">每行：路径 | 基础名，可追加 | 贴图/材质编号 | 带编号或不带编号。省略编号时默认 01，新增粒子默认不带编号。两列旧写法 GoldSpark_05 会拆成 GoldSpark 和 05；使用独立编号列时，基础名保持原样。已有任务省略粒子规则时保留原设置；已完成项保留。资产命名方式也会保留，可在单项详情修改。</p><label class="fw-sr" for="fwimp-editText">素材清单</label><textarea id="fwimp-editText" rows="6" spellcheck="false"></textarea>':'<h3>添加素材</h3><label for="fwimp-editDir">素材包目录</label><input id="fwimp-editDir" type="text" placeholder="粘贴包含 cascade.json 的目录">'+namingInputs({baseName:'',assetIndex:'01',particleNumbered:false,assetNaming:'formal'},'edit')+'<p class="hint">包内正式名称不再追加前缀或内部标识；下一步展示完整名称供你确认。</p>';
    if(mode==='bulk')$('editText').value=rows().filter(r=>!finished(r)).map(r=>r.dir+' | '+r.baseName+' | '+r.assetIndex+' | '+(r.particleNumbered?'带编号':'不带编号')).join('\n');
    if(mode!=='bulk'){$('editParticleNumbered').onchange=e=>{$('editParticleNumberedHint').textContent=particleNamingHint({particleNumbered:e.target.checked});};$('editAssetNaming').onchange=e=>{$('editAssetNamingHint').textContent=assetNamingHint({assetNaming:e.target.value});};const label=document.createElement('label');label.htmlFor='fwimp-editMode';label.textContent='本次操作';const select=document.createElement('select');select.id='fwimp-editMode';select.innerHTML='<option value="create">新建资源</option><option value="update">更新同名 · 补建缺少项</option>';el.append(label,select);}
    const acts=document.createElement('div');acts.className='row';acts.style.marginTop='12px';acts.append(button('生成名称预览',saveEdit,'btn'),button('取消',cancelEdit));el.append(acts);refresh();if(typeof MaterialWorkbench!=='undefined')MaterialWorkbench.setPane('settings');$(mode==='bulk'?'editText':'editDir').focus();
  }
  async function saveEdit(){
    if(locked()||!editor)return;
    try{
      const entries=editor==='bulk'?parseLines($('editText').value):[{dir:$('editDir').value.trim().replace(/\\/g,'/').replace(/\/+$/,''),baseName:$('editAs').value.trim(),assetIndex:$('editIndex').value.trim(),particleNumbered:$('editParticleNumbered').checked,assetNaming:$('editAssetNaming').value,explicitParticleRule:true}];
      if(editor==='add'&&(!entries[0].dir||!entries[0].baseName)){if(typeof MaterialWorkbench!=='undefined')MaterialWorkbench.errorField(!entries[0].dir?'fwimp-editDir':'fwimp-editAs',!entries[0].dir?'请填写素材包目录。':'请填写基础名称。');throw Error('请填写素材路径和基础名称');}
      const old=rows().filter(r=>!finished(r)),used=new Set(),changed=[];
      const next=entries.map(e=>{
        let r=old.find(x=>!used.has(x.id)&&x.dir===e.dir&&x.baseName===e.baseName&&x.assetIndex===e.assetIndex);
        if(!r&&editor==='bulk')r=old.find(x=>!used.has(x.id)&&x.dir===e.dir);
        if(r&&editor==='bulk'){
          used.add(r.id);const before=signature(r);r.baseName=e.baseName;r.assetIndex=e.assetIndex;
          if(e.explicitParticleRule)r.particleNumbered=e.particleNumbered;
          syncImportName(r);if(signature(r)!==before)invalidateRecord(r);changed.push(r.id);return r;
        }
        r=fresh(e.dir,namingFields(e));changed.push(r.id);return r;
      });
      if(editor==='bulk'){old.filter(r=>!used.has(r.id)).forEach(invalidateRecord);batch().rows=[...rows().filter(finished),...next];}else{next.forEach(r=>r.mode=$('editMode').value);batch().rows.push(...next);}
      inspected=next[0]?.id||rows()[0]?.id||'';persist();cancelEdit();await preview(changed);if(typeof MaterialWorkbench!=='undefined')MaterialWorkbench.setPane('preview');
    }catch(e){say(e.message||String(e),true);}
  }
  async function preview(ids){
    if(locked()||editor)return;
    const requested=rows().filter(r=>!finished(r)&&(ids?ids.includes(r.id):r.selected));if(!requested.length)return;
    // Shared textures are a batch plan. A one-package settings edit must rebuild its selected peers too.
    const candidates=rows().filter(r=>!finished(r)&&(r.selected||requested.includes(r)));
    const result=await Workbench.run('检查素材与名称',async()=>{
      phase='checking';endReadCache();
      const plannedTextures=new Map();
      const priorConfirmations=new Map(candidates.filter(r=>canRun(r)&&!requested.includes(r)).map(r=>[r.id,confirmations.get(r.id)]));
      // Old plans must not participate while rebuilding the selected batch.
      candidates.forEach(invalidateRecord);
      try{
        for(const r of candidates){
          invalidateRecord(r);r.state='checking';refresh();say('正在检查 '+r.as+'…');
          try{
            if(!r.dir||/[\r\n\u0000]/.test(r.dir))throw Error('素材包目录无效');
            const naming=resolveImportNaming(r.as,namingFields(r));
            const source=await readPack(r.dir,r.configFile||'cascade.json'),{spec,exists}=source;r.errs=validate(spec,r.configFile||'cascade.json');
            const baseErrors=[...r.errs];
            r.assets=makePlan(spec,r.as,naming);r.gpu=(spec.emitters||[]).some(e=>e.gpu)||JSON.stringify(spec).includes('"bake":true');
            const excluded=new Set(r.excludedAssetKeys||[]);
            for(const key of [...excluded])for(const alias of Object.keys(r.assets))if(r.assets[alias]===r.assets[key])excluded.add(alias);
            if(texturesOnly(r))for(const key of Object.keys(r.assets))if(!key.startsWith('tex:'))excluded.add(key);     // 只换贴图：粒子系统、材质实例不选
            r.excludedAssetKeys=[...excluded];
            const item={dir:r.dir,configFile:r.configFile||'cascade.json',as:r.as,naming,mode:r.mode||'create',spec,assets:{...r.assets},sourceHash:source.sourceHash,textureHashes:source.textureHashes};
            item.policyVersion=IMPORT_POLICY_VERSION;
            item.selectedAssetKeys=rowSelectedKeys(r);
            await planTextureReuse(item,plannedTextures);r.assets={...item.assets};
            await assertImportDirectories(item);
            const targetExists={};
            if(item.mode==='update')item.targets=await readUpdateTargets(item);
            else for(const [key,path]of Object.entries(r.assets))targetExists[key]=await doesAssetExist(path);
            const plan={signature:signature(r),item,baseErrors,sourceExists:exists,targetExists,errors:[]};proposals.set(r.id,plan);
            await checkSelectedPlan(r,plan,true);
            if(r.selected&&checked(r))collectPlannedTextures(item,plannedTextures,r.id);
          }catch(e){r.errs.push(e.message||String(e));const failedPlan=proposals.get(r.id);if(failedPlan)failedPlan.errors=[...r.errs];if(e.packDiagnostic)r.packDiagnostic=e.packDiagnostic;r.state='error';}
          r.checkedAt=Date.now();persist();renderList();
        }
        rebuildBatchChecks();
        // A recheck may retain explicit approval only for an identical, still valid plan.
        for(const r of candidates)if(checked(r)&&priorConfirmations.get(r.id)===proposals.get(r.id)?.fingerprint)confirmations.set(r.id,priorConfirmations.get(r.id));
        const valid=rows().filter(checked).length,errors=rows().filter(problem).length;persist();say('检查完成：'+valid+' 项检查通过，'+errors+' 项需处理。请在预览中核对并确认名称。',errors>0);log('素材检查完成：'+valid+' 项检查通过，'+errors+' 项需处理；导入前须确认名称。',errors?'warn':'ok');
      }finally{phase='';refresh();}
    });
    if(!locked())reviewNames(requested.map(r=>r.id));return result;
  }

  // Receive immutable local publication receipts; reuse the original read/check/confirm/execute flow.
  async function acceptDelivery(receipt){
    if(locked()||editor)return{queued:true};
    if(receipt?.format!=='df.firework-resource/1'||receipt.status!=='complete'||!Array.isArray(receipt.packages))throw Error('不是完整资源交付回执');
    const existing=batches.find(b=>b.deliveryId===receipt.deliveryId);
    if(existing){
      active=existing.id;inspected=existing.rows[0]?.id||'';let repaired=false;
      // Repair only pre-release receiver defaults that failed before any asset plan existed.
      for(const r of existing.rows){const p=receipt.packages.find(p=>p.configFile===r.configFile&&p.platform===r.platform);
        if(p&&r.state==='error'&&!Object.keys(r.assets||{}).length&&r.baseName===splitImportName(p.name).baseName&&r.errs.some(e=>e.includes('基础名需以英文字母'))){Object.assign(r,splitImportName(receipt.name+(p.platform==='mobile'?'_Mobile':'')));syncImportName(r);invalidateRecord(r);repaired=true;}
      }
      if(existing.deliveryNamingVersion!==1&&existing.rows.every(r=>!finished(r)&&!r.importProgress)){for(const r of existing.rows)invalidateRecord(r);existing.deliveryNamingVersion=1;repaired=true;}
      if(repaired||existing.rows.some(r=>!finished(r)&&!verified.has(r.id)&&!r.importProgress)){persist();await preview(existing.rows.filter(r=>!finished(r)&&!r.importProgress).map(r=>r.id));}refresh();return{queued:false,existing:true};
    }
    const incoming=receipt.packages.filter(p=>['cascade.json','cascade_mobile.json'].includes(p.configFile));
    if(!incoming.length)throw Error('当前导入器支持 PC / 手机配置；此修订没有可检查配置');
    const b={id:uid(),title:receipt.name+' · '+receipt.revisionId.slice(0,8),deliveryId:receipt.deliveryId,deliveryNamingVersion:1,rows:incoming.map(p=>{
      const r=fresh(p.directory.replace(/\\/g,'/'),{...splitImportName(receipt.name+(p.platform==='mobile'?'_Mobile':'')),particleNumbered:false,assetNaming:'formal'});
      Object.assign(r,{configFile:p.configFile,deliveryId:receipt.deliveryId,resourceId:receipt.resourceId,revisionId:receipt.revisionId,platform:p.platform});return r;
    })};
    batches.push(b);active=b.id;inspected=b.rows[0].id;
    if(!persist())throw Error('无法保存接收批次');
    refresh();await preview(b.rows.map(r=>r.id));return{queued:false};
  }
  function deliveryState(){
    const receipts={};
    for(const b of batches)for(const r of b.rows)if(r.deliveryId){
      (receipts[r.deliveryId]??={rows:[]}).rows.push({id:r.id,configFile:r.configFile,platform:r.platform,state:r.state,label:statusLabel(r),mode:r.mode,as:r.as,assets:r.assets,completedAssetKeys:r.completedAssetKeys||[],errs:r.errs||[],completedAt:r.completedAt||null,checkedAt:r.checkedAt||null,importProgress:r.importProgress||null});
    }
    return JSON.parse(JSON.stringify(receipts));
  }

  // ENGINE_IMPORT_ONE_SPLIT
  async function execute(){
    if(locked()||editor||!storageOK)return;
    const chosen=rows().filter(r=>r.selected&&!finished(r));if(!chosen.length)return;
    if(chosen.some(r=>!checked(r))){say('所选项中有未检查通过的素材，请修正或取消勾选后再执行。',true);renderSummary();return;}
    const targets=chosen.flatMap(r=>rowWriteEntries(r).map(([,p])=>p.toLowerCase()));
    if(new Set(targets).size!==targets.length){say('所选素材生成了相同目标，请只勾选其中一项。',true);return;}
    if(nameReview||chosen.some(r=>!canRun(r))){say('请先预览并确认全部所选素材的名称，再执行导入。',true);renderSummary();return;}
    return Workbench.run('导入素材',async()=>{
      phase='executing';stopRequested=false;let completed=0,failed=false;endReadCache();
      try{
        if(!persist())return;
        for(const r of chosen){
          if(stopRequested)break;
          const plan=verified.get(r.id);if(!plan||!canRun(r))throw Error('名称确认已失效，请重新检查并确认');
          r.state='running';if(!persist()){r.state='unchecked';break;}refresh();say('正在导入 '+r.as+' · '+(completed+1)+' / '+chosen.length);
          try{
            // Re-read the source and target state immediately before writing.
            const freshPack=await readPack(r.dir,r.configFile||'cascade.json');
            if(JSON.stringify(freshPack.spec)!==JSON.stringify(plan.item.spec)||freshPack.sourceHash!==plan.item.sourceHash||JSON.stringify(selectedTextureHashes(plan.item,freshPack.textureHashes))!==JSON.stringify(selectedTextureHashes(plan.item,plan.item.textureHashes)))throw Error('素材包内容或贴图在检查后发生变化，请重新检查');
            if(selectedAssetEntries(plan.item).some(([k])=>k.startsWith('tex:')&&!freshPack.exists?.[k.slice(4)]))throw Error('素材包贴图在检查后丢失，请重新检查');
            if(plan.item.mode==='update'){
              const current=await readUpdateTargets(plan.item);
              if(JSON.stringify(stableValue(selectedUpdateTargets(plan.item,current)))!==JSON.stringify(stableValue(selectedUpdateTargets(plan.item))))throw Error('同名目标在检查后发生变化，请重新检查并确认更新。');
            }else for(const [,p]of writeAssetEntries(plan.item))if(await doesAssetExist(p)!==false)throw Error('目标已存在或连接异常，已停止且不会覆盖：'+p);
            await verifyTextureReuse(plan.item);
            const selectionErrors=await validateAssetSelection(plan.item);if(selectionErrors.length)throw Error(selectionErrors.join('；'));
            await importOne(plan.item);r.completedAssetKeys=selectedAssetEntries(plan.item).map(([key])=>key);if(assetSelected(plan.item,'ps'))r.planSig=plan.item.spec?.source?.plan_sig||'';completed++;r.state=assetSelected(plan.item,'ps')&&(loadLS().pending||[]).includes(objPath(r.assets.ps))?'pending':'done';r.selected=false;r.errs=[];r.completedAt=Date.now();r.backup=(plan.item.backup?.manifest||plan.item.backup?.directory)||'';delete r.previousSuccess;delete r.importProgress;
            if(plan.item.mode==='update'&&assetSelected(plan.item,'ps'))for(const b of batches)for(const previous of b.rows)if(previous!==r&&previous.state==='pending'&&previous.assets?.ps===r.assets.ps){previous.state='done';previous.selected=false;}
            if(r.state==='pending')$('restarted').checked=false;
          }catch(e){r.state='failed';r.importProgress=e.importProgress||plan.item.importProgress||null;r.backup=(plan.item.backup?.manifest||plan.item.backup?.directory)||r.backup||'';r.errs=[e.message||String(e),plan.item.mode==='update'?'本次更新未全部完成，请核对操作记录与备份；检查后可以继续同名更新，不需改序号。':'本项未全部完成。已载入内存不等于已保存或已迁出；已有部分目标时选择「更新同名」，预览会更新已有项、补建缺少的材质和粒子，不需改序号。'];failed=true;log(r.as+' 导入中止：'+r.errs[0],'err');}
          verified.delete(r.id);confirmations.delete(r.id);if(!persist()){failed=true;break;}refresh();if(failed)break;
        }
        // Unstarted records retain their checkboxes but require a fresh check after any run.
        chosen.filter(r=>r.state==='ready').forEach(invalidateRecord);persist();
        say((failed?'导入已中止':stopRequested?'已停止后续导入':'本次导入完成')+'：完成 '+completed+' / '+chosen.length+' 项。'+((loadLS().pending||[]).length?'GPU 待办已保留，请在重启 UE 后处理。':''),failed);
      }catch(e){say(e.message||String(e),true);log('导入中止：'+(e.message||e),'err');}
      finally{phase='';stopRequested=false;refresh();}
    });
  }
  function stop(){if(phase==='executing'){stopRequested=true;renderSummary();}}
  async function finish(){
    if(locked()||!storageOK||!$('restarted').checked)return;
    const pending=[...(loadLS().pending||[])];if(!pending.length)return;
    return Workbench.run('GPU 收尾',async()=>{
      phase='finishing';refresh();
      try{
        if(!persist())return;
        if(!await checkConn())throw Error('UE 连接不可用，请打开编辑器并启用工具连接');
        const n=parseInt(tagged(await py("u = unreal.EditorLoadingAndSavingUtils\nprint('FWLN:%d' % (len(u.get_dirty_content_packages()) + len(u.get_dirty_map_packages())))\n"),'FWLN:'),10);
        if(!Number.isFinite(n))throw Error('无法读取 UE 的未保存状态，请稍后重试');
        if(n>0&&!confirm('编辑器里有 '+n+' 个未保存改动。建议先保存，以免引擎异常导致丢失。仍然继续收尾？'))return;
        for(const ps of pending){
          guard(ps);if(/[\r\n\u0000]/.test(ps))throw Error('待办路径无效');
          feedback('正在收尾：'+ps.split('.').pop());
          await py('o = unreal.load_object(None, '+pyStr(ps)+")\nassert o is not None, 'load failed'\nunreal.AssetToolsHelpers.get_asset_tools().open_editor_for_assets([o])\n");
          await sleep(3000);
          await py('unreal.AgentAssetScriptingLibrary.close_asset_editors('+pyStr(ps)+')\n');
          if(!await save(ps.split('.')[0]))throw Error('保存失败：'+ps);
          const st=loadLS();st.pending=(st.pending||[]).filter(p=>p!==ps);saveLS(st);
          for(const b of batches)for(const r of b.rows)if(r.state==='pending'&&r.assets?.ps&&objPath(r.assets.ps)===ps)r.state='done';
          if(!persist())throw Error('无法保存收尾记录');renderPending();log('GPU 收尾完成：'+ps.split('.').pop(),'ok');
        }
        feedback('GPU 收尾完成，资产已保存。');$('restarted').checked=false;
      }catch(e){feedback('收尾中止：'+(e.message||e)+'。未完成项仍保留在待办中。');log('GPU 收尾中止：'+(e.message||e),'err');}
      finally{phase='';refresh();}
    });
  }
  function init(){
    const st=loadLS();
    if(Array.isArray(st.batches))batches=st.batches.filter(b=>b&&Array.isArray(b.rows)&&typeof b.id==='string');
    if(!batches.length){const b={id:uid(),title:'批次 1 · '+new Date().toLocaleDateString(),rows:[]};try{if(st.src)b.rows=parseLines(st.src).map(r=>fresh(r.dir,{...namingFields(r),assetNaming:'legacy',particleNumbered:r.explicitParticleRule?r.particleNumbered:true}));}catch{feedback('旧版清单格式不完整，可通过批量编辑重新粘贴。');}batches.push(b);}
    for(const b of batches)for(const r of b.rows){restoreNaming(r);r.mode=r.mode==='update'?'update':'create';if(finished(r))r.selected=false;if(['running','checking'].includes(r.state)){r.state='failed';r.errs=['上次任务被中断。请核对目标目录并重新检查后继续。'];}else if(r.state==='ready')invalidateRecord(r);if(r.errs?.some(e=>e.includes('No such file or directory')&&e.includes('cascade.json')))r.errs=['该目录没有 cascade.json。请修改为包含该文件的具体效果文件夹，并重新检查。'];}
    active=batches.some(b=>b.id===st.active)?st.active:batches[0].id;inspected=rows().find(r=>r.selected&&!finished(r))?.id||rows()[0]?.id||'';persist();refresh();
    if(rows().length)say('已恢复批次记录。未完成项需重新检查并确认名称后才能导入。');
    document.addEventListener('workbench-busy',refresh);
    document.addEventListener('workbench-idle',refresh);
    Workbench.onLog(message=>{if(phase==='executing')feedback(message);});
  }
  return{acceptDelivery,deliveryState,init,preview,execute,finish,refresh,view,filter,selectAll,newBatch,selectBatch,edit,stop,reviewNames,confirmNames,closeNameReview,prepareUpdate,cancelUpdate,setAssetSelected,setAssetReuse,setGpuMeasuredPeak,workspacePrimary,confirmCurrent,cancelWorkspaceEdit,toggleWorkspacePaths};
