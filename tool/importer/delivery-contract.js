  // 只注入独立交付入口；保留原工作台、原 PC 计划和用户最终确认。
  Object.assign(MAP.dirs,{mobile_ps:'/Game/Effects/Props/FireWorks',mobile_mi:'/Game/Effects/Common/MaterialInstance/Fireworks'});
  MOD.OrientationAxisLock='ParticleModuleOrientationAxisLock';
  const deliveryPlanOriginal=makePlan,deliveryValidateOriginal=validate;
  makePlan=function(spec,asName,options){
    const assets=deliveryPlanOriginal(spec,asName,options);
    if(spec.platform==='mobile'){
      if(!['H','M'].includes(spec.tier)||!new RegExp('^[A-Za-z][A-Za-z0-9_]*_'+spec.tier+'$').test(spec.name||'')||/_HD|_Mobile/i.test(spec.name))throw Error('手游名称必须使用配置中的 <名>_H / _M，请重新导出');
      assets.ps=MAP.dirs.mobile_ps+'/P_EFX_FireWorks_'+spec.name;
      for(const key of Object.keys(assets))if(key.startsWith('mat:'))assets[key]=MAP.dirs.mobile_mi+'/'+assets[key].split('/').pop().replace(/_HD$/,'');
    }
    for(const target of Object.values(assets))guard(target);
    return assets;
  };
  validate=function(spec,configFile){
    const errors=deliveryValidateOriginal(spec,configFile);
    const flags=['EPAL_NONE','EPAL_X','EPAL_Y','EPAL_Z','EPAL_NEGATIVE_X','EPAL_NEGATIVE_Y','EPAL_NEGATIVE_Z','EPAL_ROTATE_X','EPAL_ROTATE_Y','EPAL_ROTATE_Z'];
    for(const emitter of spec?.emitters||[])for(const module of emitter.modules||[])if(module.m==='OrientationAxisLock'&&!flags.includes(module.flags))errors.push('发射器 '+emitter.name+' 的锁轴枚举无效：'+module.flags);
    return errors;
  };
  // 原生 Required 实读是 bUseInLocalSpace；flags 不能直接作为 UE 属性写入。
  const deliveryEmitterOriginal=importEmitters;
  importEmitters=async function(item,...args){
    const before=item.spec;
    item.spec={...before,emitters:before.emitters.map(e=>({...e,modules:(e.modules||[]).map(m=>m.m==='OrientationAxisLock'?{m:m.m,LockAxisFlags:m.flags}:m)}))};
    try{return await deliveryEmitterOriginal(item,...args);}finally{item.spec=before;}
  };
  const deliveryReadPackOriginal=readPack;
  function deliveryFingerprintProofs(proofs){
    const result={...(proofs||{})};
    // 保留旧登记；同时按实际 PNG 内容建立别名，跨参数摘要也能复用。
    for(const [key,proof]of Object.entries(result)){
      const parts=key.split('|');
      if(parts.length===4&&/^[a-f0-9]{64}$/.test(parts[2])){
        const identity=[parts[0],'sha256',parts[2],parts[3]].join('|');
        if(!result[identity])result[identity]=proof;
      }
    }
    return result;
  }
  function deliveryMergedProofs(local,shared){
    return {...deliveryFingerprintProofs(local),...deliveryFingerprintProofs(shared)};
  }
  function deliveryBase64(text){
    const raw=unescape(encodeURIComponent(text)),alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';
    for(let i=0;i<raw.length;i+=3){const a=raw.charCodeAt(i),b=raw.charCodeAt(i+1),c=raw.charCodeAt(i+2),v=(a<<16)|((b||0)<<8)|(c||0);out+=alphabet[(v>>>18)&63]+alphabet[(v>>>12)&63]+(i+1<raw.length?alphabet[(v>>>6)&63]:'=')+(i+2<raw.length?alphabet[v&63]:'=');}return out;
  }
  async function deliveryGate(directory,register=false,proofs={}){
    const command=['C:/Users/locmai/AppData/Local/Programs/Python/Python312/python.exe','-X','utf8','-B','D:/FXTools/DFWorkbench/workbench/delivery-preflight.py','--directory-base64',deliveryBase64(directory)];
    // 历史证明持续增长，不能放进有32767字符上限的Windows命令行。
    if(register)command.push('--register','--proofs-stdin');
    const payload=register?deliveryBase64(JSON.stringify(proofs)):'';
    const code=`# FWL_DELIVERY_GATE\nimport subprocess, base64\ncommand = [${command.map(pyStr).join(',')}]\npayload = base64.b64decode(${pyStr(payload)})\nprocess = subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,creationflags=0x08000000)\nstdout,stderr = process.communicate(payload)\nif process.returncode not in (0,1): raise RuntimeError(stderr.decode('utf-8','replace'))\nresult = json.loads(stdout.decode('utf-8'))\nprint('FWLDELIVERYGATE:' + json.dumps(result))\n`;
    const result=JSON.parse(tagged(await py(code,120000),'FWLDELIVERYGATE:'));
    if(!result.ok)throw Error('交付预检拦下：'+result.problems.join('；'));
    return result;
  }
  readPack=async function(directory,configFile){
    const gate=await deliveryGate(directory);
    const state=loadLS();state.textureFingerprints=deliveryMergedProofs(state.textureFingerprints,gate.registry?.ueProofs);saveLS(state);
    const result=await deliveryReadPackOriginal(directory,configFile);result.deliveryGate=gate;return result;
  };
  const deliveryReuseIdentityOriginal=textureReuseIdentity;
  textureReuseIdentity=function(item,key){
    const t=item.spec.textures?.[key.slice(4)],sha=item.textureHashes?.[key.slice(4)];
    if(key.startsWith('tex:')&&t?.class&&/^[a-f0-9]{64}$/.test(sha||''))return[t.class,'sha256',sha,texturePolicy(item.assets[key],t.class).maxSize].join('|');
    return deliveryReuseIdentityOriginal(item,key);
  };
  const deliveryReuseOriginal=planTextureReuse;
  async function deliveryFirstTextureTargets(entries){
    if(!entries.length)return [];
    entries.forEach(([,pkg])=>guard(pkg));
    const code=`# FWL_DERIVED_FIRST\nentries = ${JSON.stringify(entries)}
records = []
for key,pkg in entries:
 obj = unreal.load_asset(pkg)
 filename = os.path.abspath(os.path.join(unreal.Paths.project_content_dir(),pkg[6:] + '.uasset'))
 records.append({'key':key,'pkg':pkg,'exists':obj is not None,'saved':os.path.exists(filename),'class':obj.get_class().get_name() if obj else ''})
print('FWLDERIVEDFIRST:' + json.dumps(records))
`;
    const targets=JSON.parse(tagged(await py(code,60000),'FWLDERIVEDFIRST:'));
    if(!Array.isArray(targets)||targets.length!==entries.length||entries.some(([key,pkg],i)=>targets[i]?.key!==key||targets[i]?.pkg!==pkg||typeof targets[i]?.exists!=='boolean'||typeof targets[i]?.saved!=='boolean'))throw Error('共享贴图首次创建检查结果不完整，请重新检查');
    return targets;
  }
  function deliveryExistingTextureError(target){
    return '派生共享贴图目标已存在，但缺少内容一致且已保存的复用证明，不能覆盖：'+target.pkg+'。请核验原贴图的内容、保存状态与平台设置后重新检查；无需改序号。';
  }
  async function deliverySavedUpdateProof(item,key,pkg){
    if(item.mode!=='update'||!assetSelected(item,key))return null;
    const kind=item.spec.textures[key.slice(4)].class,limit=texturePolicy(pkg,kind).maxSize;
    const candidates=Object.entries(loadLS().textureFingerprints||{}).filter(([id,proof])=>id.startsWith(kind+'|')&&id.endsWith('|'+limit)&&proof.pkg===pkg);
    if(!candidates.length)return null;
    const proof=await readTextureProof(pkg);
    return proof&&candidates.some(([,old])=>old.diskHash===proof.diskHash)?{pkg,diskHash:proof.diskHash}:null;
  }
  planTextureReuse=async function(item,planned){
    item.deliveryFirstTextures=[];
    item.deliveryTextureUpdates={};
    if(!item.spec.derived)return deliveryReuseOriginal(item,planned);
    const selected=item.selectedAssetKeys;
    const selectedKeys=new Set(selectedAssetEntries(item).map(([key])=>key));
    const required=new Set([...selectedKeys,...selectionDependencies(item).map(d=>d.key)]);
    // 未勾选但仍被引用的贴图也须核验内容；扩大读取范围不扩大写入范围。
    item.selectedAssetKeys=[...required];
    try{await deliveryReuseOriginal(item,planned);}finally{item.selectedAssetKeys=selected;}
    const missing=[...required].filter(key=>key.startsWith('tex:')&&!item.textureReuse?.[key]).map(key=>[key,item.assets[key]]);
    for(const [key]of missing)if(!/^[a-f0-9]{64}$/.test(item.textureHashes?.[key.slice(4)]||''))throw Error('共享贴图源文件未核验，请重新检查：'+key);
    for(const target of await deliveryFirstTextureTargets(missing)){
      if(target.exists||target.saved){
        const proof=await deliverySavedUpdateProof(item,target.key,target.pkg);
        if(!proof)throw Error(deliveryExistingTextureError(target));
        item.deliveryTextureUpdates[target.key]=proof;continue;
      }
      if(!selectedKeys.has(target.key))throw Error('首次创建的共享贴图尚未勾选，但被本包引用：'+target.pkg+'。请勾选该依赖后重新检查。');
      item.deliveryFirstTextures.push([target.key,target.pkg]);
    }
  };
  const deliveryImportOriginal=importOne;
  importOne=async function(item){
    await deliveryGate(item.dir);
    for(const [key,expected]of Object.entries(item.deliveryTextureUpdates||{})){
      if(item.mode!=='update'||item.assets[key]!==expected.pkg||!assetSelected(item,key)||item.textureReuse?.[key])throw Error('共享贴图更新范围发生变化，请重新检查并确认');
      const proof=await readTextureProof(expected.pkg);
      if(!proof||proof.diskHash!==expected.diskHash)throw Error('共享贴图在检查后发生变化，请重新检查并确认：'+expected.pkg);
    }
    const first=item.deliveryFirstTextures||[];
    if(first.some(([key,pkg])=>item.assets[key]!==pkg||!assetSelected(item,key)||item.textureReuse?.[key]))throw Error('共享贴图首次创建范围发生变化，请重新检查并确认');
    // 检查后可能有别的任务建立同名资产；执行前仍不得覆盖。
    for(const target of await deliveryFirstTextureTargets(first))if(target.exists||target.saved)throw Error(deliveryExistingTextureError(target));
    const result=await deliveryImportOriginal(item);
    if(item.importProgress)item.importProgress.stage='交付登记';
    try{await deliveryGate(item.dir,true,loadLS().textureFingerprints||{});}
    catch(error){
      error.assetsCommitted=true;error.importProgress=item.importProgress;
      error.message='资产已保存；交付登记失败：'+error.message+'。请查看登记阶段日志；不要删除已保存资产或修改编号。';
      throw error;
    }
    log('==== '+item.as+' 交付登记完成','ok');
    return result;
  };
  // 仅恢复已明确保存的登记故障；兼容本轮旧版Error 87，不把部分写入当成完成。
  function deliveryRegistrationOnly(r){
    if(r?.state!=='failed')return false;
    const p=r.importProgress,saved=new Set(p?.saved||[]),excluded=new Set(r.excludedAssetKeys||[]);
    const entries=Object.entries(r.assets||{}).filter(([key])=>!excluded.has(key));
    return !!entries.length&&entries.every(([,pkg])=>saved.has(pkg))&&
      (p.stage==='交付登记'||(r.errs||[]).some(e=>/WindowsError[\s\S]*Error\s*87/.test(e)));
  }
  async function verifyDeliverySaved(item,registry=loadLS().textureFingerprints||{}){
    const entries=selectedAssetEntries(item),expected={},verifiedProofs={};
    for(const [key,pkg]of entries){
      guard(pkg);
      if(key.startsWith('tex:')){
        const proof=registry[textureReuseIdentity(item,key)];
        if(proof?.pkg!==pkg||!/^[a-f0-9]{64}$/.test(proof.diskHash||''))throw Error('缺少原保存证明，不能只补登记：'+pkg);
        expected[pkg]=proof.diskHash;
        verifiedProofs[textureReuseIdentity(item,key)]=proof;
      }
    }
    const code=`# FWL_DELIVERY_REGISTER_VERIFY
entries = ${JSON.stringify(entries)}
expected = ${JSON.stringify(expected)}
tag = ${pyStr('fwl.cascade/1 '+item.spec.name+' -> '+item.as)}
dirty = set(unicode(x.get_name()) for x in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages())
import hashlib
for key,pkg in entries:
 obj = unreal.load_asset(pkg)
 wanted = 'ParticleSystem' if key == 'ps' else 'Texture2D' if key.startswith('tex:') else 'MaterialInstanceConstant'
 assert obj is not None and obj.get_class().get_name() == wanted, 'Saved asset missing or wrong type: ' + pkg
 assert pkg not in dirty, 'Saved asset has unsaved changes: ' + pkg
 assert unicode(unreal.EditorAssetLibrary.get_metadata_tag(obj,${pyStr(MAP.tag)})) == tag, 'Saved asset source changed: ' + pkg
 filename = os.path.abspath(os.path.join(unreal.Paths.project_content_dir(),pkg[6:] + '.uasset'))
 assert os.path.isfile(filename) and os.path.getsize(filename) > 0, 'Saved asset file missing: ' + pkg
 if pkg in expected:
  with open(filename,'rb') as saved: digest = hashlib.sha256(saved.read()).hexdigest()
  assert digest == expected[pkg], 'Saved texture changed: ' + pkg
print('FWLDELIVERYSAVED:ok')
`;
    if(tagged(await py(code,60000),'FWLDELIVERYSAVED:')!=='ok')throw Error('保存回执复核未完成，未补写登记');
    return verifiedProofs;
  }
  async function retryDeliveryRegistration(r){
    if(locked()||editor||!storageOK||!deliveryRegistrationOnly(r))return;
    return Workbench.run('补写交付登记',async()=>{
      phase='registration';endReadCache();refresh();say('正在复核已保存资产并补写登记，不重新导入…');
      try{
        const originalProofs={...(loadLS().textureFingerprints||{})};
        const source=await readPack(r.dir,r.configFile||'cascade.json');
        const naming=resolveImportNaming(r.as,namingFields(r));
        const assets=makePlan(source.spec,r.as,naming),keys=rowSelectedKeys(r);
        if(JSON.stringify(stableValue(assets))!==JSON.stringify(stableValue(r.assets)))throw Error('当前名称或目标与原保存记录不同，不能只补登记');
        const errors=validate(source.spec,r.configFile||'cascade.json');if(errors.length)throw Error(errors.join('；'));
        const item={dir:r.dir,as:r.as,spec:source.spec,assets:r.assets,textureHashes:source.textureHashes,selectedAssetKeys:keys};
        const savedProofs=await verifyDeliverySaved(item,originalProofs);
        await deliveryGate(r.dir,true,{...(loadLS().textureFingerprints||{}),...savedProofs});
        r.state=keys.includes('ps')&&(loadLS().pending||[]).includes(objPath(r.assets.ps))?'pending':'done';
        r.completedAssetKeys=keys;r.completedAt=Date.now();r.selected=false;r.errs=[];
        if(keys.includes('ps'))r.planSig=source.spec?.source?.plan_sig||'';
        const progress=r.importProgress,previous=r.previousSuccess;delete r.importProgress;delete r.previousSuccess;
        if(!persist()){r.importProgress=progress;if(previous)r.previousSuccess=previous;throw Error('交付登记已写入，但浏览器记录保存失败，请恢复存储后重试');}
        say('交付登记已补齐；没有重新导入、保存或迁出UE资产。');log(r.as+' 交付登记已补齐；UE资产未重导','ok');
      }catch(error){
        r.state='failed';if(r.importProgress)r.importProgress.stage='交付登记';
        r.errs=['只补登记未完成：'+(error.message||String(error)),'未重新导入或保存任何UE资产，请核对上面的原因。'];persist();say(r.errs[0],true);log(r.as+' '+r.errs[0],'err');
      }finally{phase='';refresh();}
    });
  }
  // 同一资源的新修订保留用户命名/范围；不继承完成状态、资产表或确认。
  // 烘焙器 4.9.115 交付清单「导入范围」→ 回执 metadata.importScope：只换贴图预设到这一行；没选的平台这一行不勾（不执行）。回执里写了就以它为准（盖过上一修订沿用的范围）
  function deliveryApplyScope(r,receipt){
    const s=receipt&&receipt.metadata&&receipt.metadata.importScope;if(!s||typeof s!=='object')return;
    if(s.kind==='textures'){r.scope='textures';r.mode='update';}else if(s.kind==='all')r.scope='all';
    if(Array.isArray(s.platforms)&&s.platforms.length&&!s.platforms.includes(r.platform)){r.selected=false;r.scopeNote='交付清单选了只换'+(s.platforms.includes('pc')?' PC':'手机')+'，这一行不导入';}
  }
  function deliveryPreviousSettings(receipt,p){
    const previous=batches.slice().reverse().filter(b=>b.deliveryId!==receipt.deliveryId).flatMap(b=>b.rows.slice().reverse()).find(r=>r.resourceId===receipt.resourceId&&(r.platform===p.platform||r.configFile===p.configFile));
    if(!previous)return null;
    return {...namingFields(previous),mode:previous.completedAt?'update':previous.mode||'create',scope:previous.scope==='textures'?'textures':'all',excludedAssetKeys:[...(previous.excludedAssetKeys||[])],optionalReuseAssetKeys:[...(previous.optionalReuseAssetKeys||[])]};
  }
