  // Keep the complete plan for reference resolution; project only the write scope.
  function selectedAssetEntries(it){
    const all=Object.entries(it.assets||{});
    if(it.selectedAssetKeys===undefined)return all;
    if(!Array.isArray(it.selectedAssetKeys)||new Set(it.selectedAssetKeys).size!==it.selectedAssetKeys.length||it.selectedAssetKeys.some(k=>!Object.prototype.hasOwnProperty.call(it.assets,k)))throw Error('资产选择已失效，请重新预览');
    return all.filter(([k])=>it.selectedAssetKeys.includes(k));
  }
  function assetSelected(it,key){return selectedAssetEntries(it).some(([k])=>k===key);}
  // Required-module cutouts are optional geometry trimming, unless also used by a material.
  function optionalCutout(it,key){
    return key.startsWith('tex:')&&it.spec.textures?.[key.slice(4)]?.class==='cutout'&&!Object.values(it.spec.materials||{}).some(m=>Object.values(m.textures||{}).includes(key.slice(4)));
  }
  function cutoutEnabled(it,key){return !optionalCutout(it,key)||assetSelected(it,key)||(it.optionalReuseAssetKeys||[]).includes(key);}
  function validateOptionalReuse(it){
    const keys=it.optionalReuseAssetKeys??[];
    if(!Array.isArray(keys)||new Set(keys).size!==keys.length||keys.some(k=>typeof k!=='string'||!it.assets[k]||!optionalCutout(it,k)||assetSelected(it,k)))throw Error('轮廓图复用选择已失效，请重新预览');
  }
  function selectionDependencies(it){
    const selected=new Set(selectedAssetEntries(it).map(([k])=>k)),required=new Map();
    const need=(key,owner)=>{if(!it.assets[key]||selected.has(key)||[...selected].some(k=>it.assets[k]===it.assets[key]))return;if(!required.has(key))required.set(key,[]);required.get(key).push(owner);};
    if(selected.has('ps'))for(const e of it.spec.emitters||[]){need('mat:'+e.material,'粒子系统 / '+e.name);if(e.required?.cutout&&cutoutEnabled(it,'tex:'+e.required.cutout))need('tex:'+e.required.cutout,'粒子系统 / '+e.name+' 轮廓图');}
    for(const [key]of selectedAssetEntries(it))if(key.startsWith('mat:'))for(const t of Object.values(it.spec.materials[key.slice(4)].textures||{}))need('tex:'+t,'材质 '+key.slice(4));
    return [...required].map(([key,owners])=>({key,pkg:it.assets[key],owners}));
  }
  async function validateAssetSelection(it){
    const entries=selectedAssetEntries(it),errors=[];validateOptionalReuse(it);
    if(!entries.length)return ['未选择任何资产，请勾选需要导入的贴图、材质或粒子系统。'];
    const deps=selectionDependencies(it);it.reusedDependencies=[];
    if(!deps.length)return errors;
    deps.forEach(d=>guard(d.pkg));
    const code=`# FWL_SELECTION_REUSE
entries = ${JSON.stringify(deps.map(d=>[d.key,d.pkg]))}
records = []
for key,pkg in entries:
 obj = unreal.load_asset(pkg)
 records.append({'key':key,'pkg':pkg,'exists':obj is not None,'class':obj.get_class().get_name() if obj else ''})
print('FWLREUSE:' + json.dumps(records))
`;
    const records=JSON.parse(tagged(await py(code),'FWLREUSE:'));
    if(records.length!==deps.length||deps.some((d,i)=>records[i]?.key!==d.key||records[i]?.pkg!==d.pkg))throw Error('未勾选依赖的检查结果不完整');
    for(const [i,d]of deps.entries()){
      const target=records[i],wanted=d.key.startsWith('tex:')?'Texture2D':'MaterialInstanceConstant';
      if(!target.exists)errors.push('依赖资产不存在：'+d.pkg+'（'+d.owners.join('、')+' 需要）。请勾选此资产，或先导入它。');
      else if(target.class!==wanted)errors.push('依赖资产类型不符：'+d.pkg+'（需要 '+wanted+'，实际 '+target.class+'）。');
      else it.reusedDependencies.push({...d,class:target.class});
    }
    return errors;
  }
  function selectedUpdateTargets(it,targets=it.targets||[]){
    const keys=new Set(writeAssetEntries(it).map(([k])=>k));return targets.filter(t=>keys.has(t.key));
  }
  function selectedTextureHashes(it,hashes){
    return selectedAssetEntries(it).filter(([k])=>k.startsWith('tex:')).map(([k])=>[k,hashes?.[k.slice(4)]??null]);
  }
