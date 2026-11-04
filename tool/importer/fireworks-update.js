  function stableValue(value){
    if(Array.isArray(value))return value.map(stableValue);
    if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stableValue(value[key])]));
    return value;
  }
  function structureHash(value){
    const text=JSON.stringify(stableValue(value));let hash=2166136261;
    for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
    return (hash>>>0).toString(16)+':'+text.length;
  }
  async function assetStructure(pkg){
    const root=objPath(pkg),queue=[root],seen=new Set(),objects={};
    while(queue.length){
      const paths=queue.splice(0,8).filter(path=>!seen.has(path));paths.forEach(path=>seen.add(path));
      const results=await Promise.all(paths.map(async path=>[path,await props(path)]));
      for(const [path,properties]of results){
        objects[path]=properties;
        const refs=value=>{if(!value||typeof value!=='object')return;if(typeof value.path==='string'&&value.path.startsWith(root+':')&&!seen.has(value.path)&&!queue.includes(value.path))queue.push(value.path);for(const child of Object.values(value))refs(child);};
        refs(properties);
      }
      if(seen.size>5000)throw Error('资产对象数量异常，停止读取更新计划');
    }
    return {fingerprint:structureHash(objects),root:objects[root]||{},objects};
  }
  async function readUpdateTargets(it){
    const entries=Object.entries(it.assets);entries.forEach(([,pkg])=>guard(pkg));
    const code=`entries = ${JSON.stringify(entries)}
import hashlib
sc = getattr(unreal,'SourceControl',None)
enabled = bool(sc and sc.is_enabled())
available = bool(enabled and sc.is_available())
dirty = set(x.get_name() for x in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages())
records = []
for key,pkg in entries:
 obj = unreal.load_asset(pkg)
 filename = os.path.abspath(os.path.join(unreal.Paths.project_content_dir(),pkg[6:] + '.uasset'))
 info = {'key':key,'pkg':pkg,'exists':obj is not None,'class':obj.get_class().get_name() if obj else '', 'tag':unreal.EditorAssetLibrary.get_metadata_tag(obj,${pyStr(MAP.tag)}) if obj else '', 'diskHash':'','dirty':pkg in dirty,'sc':'disabled' if not enabled else 'offline','editable':not enabled,'reason':''}
 if os.path.isfile(filename):
  h = hashlib.sha256()
  with open(filename,'rb') as saved:
   while True:
    part = saved.read(1024*1024)
    if not part: break
    h.update(part)
  info['diskHash'] = h.hexdigest()
 if available:
  state = sc.query_file_state(pkg)
  blocked = bool(state.is_checked_out_other or state.is_conflicted or state.is_deleted)
  info['sc'] = 'added' if state.is_added else 'edited' if state.is_checked_out else 'tracked' if state.is_source_controlled else 'untracked'
  info['editable'] = bool(not blocked and ((not obj and not os.path.isfile(filename)) or (state.is_valid and (state.is_added or state.is_checked_out or state.can_check_out or not state.is_source_controlled))))
  if blocked: info['reason'] = 'Asset is locked by another user, deleted or conflicted'
  elif not info['editable']: info['reason'] = 'Source control does not allow editing this asset'
 records.append(info)
print('FWLTARGETS:' + json.dumps(records))
`;
    const targets=JSON.parse(tagged(await py(code,60000),'FWLTARGETS:'));
    if(targets.length!==entries.length||entries.some(([key,pkg],i)=>targets[i]?.key!==key||targets[i]?.pkg!==pkg))throw Error('更新目标检查结果不完整');
    for(const target of targets)if(target.exists){
      const structure=await assetStructure(target.pkg);target.structureHash=structure.fingerprint;
      if(target.key==='ps'){
        target.emitterCount=(structure.root.Emitters||[]).length;
        target.emitterPaths=(structure.root.Emitters||[]).map(e=>e.path);
        target.lodCounts=target.emitterPaths.map(path=>(structure.objects[path]?.LODLevels||[]).length);
      }
    }
    return targets;
  }
  function validateUpdateTargets(it){
    const errors=[];
    const scope=selectedUpdateTargets(it),ps=scope.find(t=>t.key==='ps');
    if(!scope.some(t=>t.exists)&&!scope.some(t=>t.diskHash))errors.push('所选目标均未创建，请选择「新建资源」。部分导入可用「更新同名」更新已有项并补建缺少项，不需改序号。');
    for(const target of scope){
      if(!target.exists&&target.diskHash)errors.push('目标文件存在但 UE 无法加载，请先核对该文件：'+target.pkg);
      if(target.exists){
        const wanted=target.key==='ps'?'ParticleSystem':target.key.startsWith('tex:')?'Texture2D':'MaterialInstanceConstant';
        if(target.class!==wanted)errors.push('同名目标类型不符，不能更新：'+target.pkg+'（'+target.class+'）');
        // Unnumbered PS and explicitly named dependencies keep their identity
        // when only the fallback index changes. Legacy dependencies stay strict.
        const tagName=target.tag?.match(/ -> ([A-Za-z][A-Za-z0-9_]*)$/)?.[1];
        const sameBase=tagName&&it.naming&&(tagName===it.naming.baseName||splitImportName(tagName).baseName===it.naming.baseName);
        const sameParticleBase=target.key==='ps'&&it.naming?.particleNumbered===false&&sameBase;
        const sameFormalDependency=sameBase&&(it.naming?.assetNaming??'formal')==='formal'&&
          target.pkg===it.assets?.[target.key]&&target.pkg.endsWith('/'+formalDependencyName(it.spec,target.key));
        if(target.tag&&(!target.tag.startsWith('fwl.cascade/1 ')||(!target.tag.endsWith(' -> '+it.as)&&!sameParticleBase&&!sameFormalDependency)))errors.push('目标来源标识与本次名称不同，请核对：'+target.pkg);
      }
      if(!target.editable)errors.push('目标不可写：'+target.pkg+'。请检查版本管理连接、迁出权限或他人锁定。');
    }
    if(assetSelected(it,'ps')&&!it.spec.emitters?.length)errors.push('更新包没有发射器，不能将现有粒子系统替换为空。');
    if(ps?.lodCounts?.some(count=>count!==1))errors.push('现有粒子系统含多级或缺失 LOD，请先核对；当前更新仅支持完整的单级 LOD。');
    return errors;
  }
  async function prepareAssetUpdate(it){
    const errors=validateUpdateTargets(it);if(errors.length)throw Error(errors.join('\n'));
    it.importProgress.stage='备份与迁出';
    const existing=selectedUpdateTargets(it).filter(t=>t.exists),entries=existing.map(t=>[t.key,t.pkg]);
    const code=`entries = ${JSON.stringify(entries)}
import shutil,uuid,datetime
root = ${pyStr('D:/FXTools/DFWorkbench/workbench/asset-backups')}
assert os.path.isdir(root), 'Existing backup directory is missing; creation is forbidden: ' + root
backup = root
prefix = ${pyStr(it.as)} + '_' + datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ') + '_' + uuid.uuid4().hex[:8]
manifest_path = os.path.join(root,prefix + '_manifest.json')
assert not os.path.exists(manifest_path)
content = os.path.abspath(unreal.Paths.project_content_dir())
records = []
for index,(key,pkg) in enumerate(entries):
 assert pkg.startswith('/Game/') and '..' not in pkg
 filename = os.path.abspath(os.path.join(content,pkg[6:] + '.uasset'))
 assert filename.startswith(content + os.sep)
 original = os.path.join(root,prefix + '_original_' + str(index) + '_' + os.path.basename(filename))
 before_update = os.path.join(root,prefix + '_before-update_' + str(index) + '_' + os.path.basename(filename))
 assert not os.path.exists(original) and not os.path.exists(before_update)
 if os.path.isfile(filename): shutil.copy2(filename,original)
 records.append({'key':key,'pkg':pkg,'filename':filename,'original':original if os.path.isfile(original) else '', 'before_update':before_update})
with io.open(manifest_path,'w',encoding='utf-8') as manifest: manifest.write(unicode(json.dumps({'phase':'before-edit','assets':records},ensure_ascii=False)))
print('FWLBACKUP:' + json.dumps({'manifest':manifest_path,'directory':backup.replace('\\\\','/'),'assets':records}))
`;
    const backup=JSON.parse(tagged(await py(code),'FWLBACKUP:'));it.backup=backup;it.importProgress.backup=backup.manifest||backup.directory;
    log('更新前备份：'+(backup.manifest||backup.directory),'ok');
    // Check out all existing destinations before writing any asset content.
    await py(`entries = ${JSON.stringify(entries)}
sc = getattr(unreal,'SourceControl',None)
if sc and sc.is_enabled():
 assert sc.is_available(), 'Source control is unavailable'
 for key,pkg in entries:
  filename = os.path.abspath(os.path.join(unreal.Paths.project_content_dir(),pkg[6:] + '.uasset'))
  if not os.path.isfile(filename): continue
  state = sc.query_file_state(pkg)
  assert state.is_valid and not state.is_checked_out_other and not state.is_conflicted and not state.is_deleted, 'Asset is locked or conflicted: ' + pkg
  if not (state.is_added or state.is_checked_out):
   assert sc.check_out_or_add_file(pkg,True), sc.last_error_msg()
  state = sc.query_file_state(pkg)
  assert state.is_valid and (state.is_added or state.is_checked_out), 'Checkout verification failed: ' + pkg
`);
    // Include current in-memory changes in a second backup before rebuilding.
    for(const [,pkg]of entries)if(!await save(pkg))throw Error('更新前保存现有资产失败：'+pkg);
    await py(`backup = ${pyStr(backup.directory)}
manifest_path = ${pyStr(backup.manifest)}
assert os.path.isdir(backup), 'Existing backup directory is missing'
import shutil
records = ${JSON.stringify(backup.assets)}
for row in records:
 dest = row['before_update']
 assert os.path.dirname(os.path.abspath(dest)) == os.path.abspath(backup)
 assert not os.path.exists(dest), 'Backup file already exists: ' + dest
 assert os.path.isfile(row['filename']), 'Original asset was not saved: ' + row['pkg']
 shutil.copy2(row['filename'],dest)
 row['before_update'] = dest
with io.open(manifest_path,'w',encoding='utf-8') as manifest: manifest.write(unicode(json.dumps({'phase':'ready-to-update','assets':records},ensure_ascii=False)))
`);
    if(assetSelected(it,'ps')&&it.targets.some(t=>t.key==='ps'&&t.exists))await py(`unreal.AgentAssetScriptingLibrary.close_asset_editors(${pyStr(objPath(it.assets.ps))})\n`);
    return backup;
  }
  async function emitterEditorCache(paths){
    const rows=[];
    for(const path of paths){
      guard(path);const emitter=await props(path),lods=emitter.LODLevels||[];
      if(!lods.length)throw Error('新发射器缺少 LOD，旧发射器未替换');
      const enabled=[];
      for(const level of lods){
        const lod=await props(level.path);
        if(!lod.RequiredModule?.path||!lod.SpawnModule?.path)throw Error('新发射器缺少必要模块，旧发射器未替换');
        if(typeof lod.bEnabled!=='boolean')throw Error('不能核对发射器启用状态，停止替换');
        enabled.push(lod.bEnabled?1:0);
      }
      rows.push(enabled);
    }
    return rows;
  }
  async function readEmitterEditorCache(PS){
    // SoloTracking is hidden from the default property listing in UE 4.24.
    // Cascade indexes one entry per emitter and one setting per LOD when opening.
    const response=await api('/object/get',{path:PS,properties:['SoloTracking']});
    if(response?.__error)throw Error(response.__error);
    const actual=response?.data?.properties?.SoloTracking;
    if(!Array.isArray(actual))throw Error('不能读取粒子编辑器状态缓存，暂勿打开 Cascade');
    return actual.map(row=>row.SoloEnableSetting);
  }
  async function verifyEmitterEditorCache(PS,rows,prefix=false){
    const actual=await readEmitterEditorCache(PS);
    if(JSON.stringify(prefix?actual.slice(0,rows.length):actual)!==JSON.stringify(rows))throw Error('粒子编辑器状态缓存核对失败，暂勿打开 Cascade');
  }
  async function removeEditorCacheItem(PS,path,index){
    const result=await api('/object/container',{path:PS,container_path:path,op:'array_remove',index});
    if(result?.data?.ok!==true)throw Error('编辑器状态缓存调整失败：'+(result?.__error||result?.data?.error||path));
  }
  async function prepareEmitterEditorCache(PS,rows){
    const oldPaths=((await props(PS)).Emitters||[]).map(e=>e.path);
    const oldRows=await emitterEditorCache(oldPaths),current=await readEmitterEditorCache(PS);
    const required=Array.from({length:Math.max(rows.length,oldRows.length)},(_,i)=>rows[i]||oldRows[i]);
    // Extend before switching emitters. Existing live indices always remain valid.
    // Text import cannot populate the transient SoloEnableSetting field in 4.24.
    while(current.length<required.length){await cont(PS,'SoloTracking','array_append','()');current.push([]);}
    for(let i=0;i<required.length;i++){
      const previous=current[i];if(!Array.isArray(previous))throw Error('独奏缓存格式异常，停止替换');
      if(JSON.stringify(previous)===JSON.stringify(required[i]))continue;
      const path='SoloTracking['+i+'].SoloEnableSetting';
      // Append before removing old settings so the array is never emptied.
      for(const enabled of required[i])await cont(PS,path,'array_append',enabled);
      for(let j=0;j<previous.length;j++)await removeEditorCacheItem(PS,path,0);
    }
    await verifyEmitterEditorCache(PS,required,true);
  }
  async function finishEmitterEditorCache(PS,rows){
    const current=await readEmitterEditorCache(PS);
    for(let i=current.length-1;i>=rows.length;i--)await removeEditorCacheItem(PS,'SoloTracking',i);
    await verifyEmitterEditorCache(PS,rows);
  }
  async function syncEmitterEditorCache(PS){
    guard(PS);const paths=((await props(PS)).Emitters||[]).map(e=>e.path);
    const rows=await emitterEditorCache(paths);
    await prepareEmitterEditorCache(PS,rows);
    await finishEmitterEditorCache(PS,rows);
  }
  async function swapEmitters(PS, paths){
    guard(PS);if(!paths.length)throw Error('不能将粒子系统更新为空发射器列表');
    const rows=await emitterEditorCache(paths);
    if(rows.some(row=>row.length!==1))throw Error('更新仅支持一个 LOD 的发射器，停止替换');
    await prepareEmitterEditorCache(PS,rows);
    const values='('+paths.map(path=>"ParticleSpriteEmitter'"+path+"'").join(',')+')';
    await setp(PS,{Emitters:values,LODDistances:'(0.000000)',LODSettings:'(())'});
    const actual=await props(PS);
    if(JSON.stringify((actual.Emitters||[]).map(e=>e.path))!==JSON.stringify(paths)||(actual.LODDistances||[]).length!==1||(actual.LODSettings||[]).length!==1)throw Error('发射器替换读回不一致，停止保存');
    await finishEmitterEditorCache(PS,rows);
  }
