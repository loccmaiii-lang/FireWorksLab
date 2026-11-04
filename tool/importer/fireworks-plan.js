  // All references continue to use source keys. Tokens affect only destination names.
  function nameTokens(keys){
    const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,'0');};
    const tokens=new Map(),groups=new Map();
    for(const key of keys){
      let token=key.replace(/[^A-Za-z0-9_]+/g,'_').replace(/^_+|_+$/g,'');
      if(!token)token='Tex_'+hash(key);
      token=token[0].toUpperCase()+token.slice(1);
      tokens.set(key,token);const lower=token.toLowerCase();
      if(!groups.has(lower))groups.set(lower,[]);groups.get(lower).push(key);
    }
    for(const keys of groups.values())if(keys.length>1)for(const key of keys)tokens.set(key,tokens.get(key)+'_'+hash(key));
    return tokens;
  }
  function textureGrid(spec,key,t){
    const positive=n=>Number.isInteger(n)&&n>0;
    if('cols' in t||'rows' in t){
      if(!positive(t.cols)||!positive(t.rows))throw Error('贴图 '+key+' 的网格 cols / rows 必须是正整数');
      return{cols:t.cols,rows:t.rows};
    }
    if(t.class==='flipbook')throw Error('贴图 '+key+' 缺少网格 cols / rows');
    // A cutout takes its naming grid from the flipbook of the emitter using it.
    const grids=[];
    if(t.class==='cutout')for(const em of spec.emitters||[]){
      if(em.required?.cutout!==key)continue;
      const mainKey=spec.materials?.[em.material]?.textures?.main,main=spec.textures?.[mainKey];
      if(main?.class==='flipbook'&&positive(main.cols)&&positive(main.rows))grids.push({cols:main.cols,rows:main.rows});
    }
    const distinct=new Map(grids.map(g=>[g.cols+'x'+g.rows,g]));
    if(distinct.size===1)return distinct.values().next().value;
    const flipbooks=Object.values(spec.textures||{}).filter(x=>x?.class==='flipbook');
    if(flipbooks.length===1&&positive(flipbooks[0].cols)&&positive(flipbooks[0].rows))return{cols:flipbooks[0].cols,rows:flipbooks[0].rows};
    return{cols:1,rows:1};
  }
  // Public asset names and dependency keys serve different purposes. Never
  // sanitize an explicit asset name into a different destination silently.
  function publicAssetName(value,label,required=false){
    if(!Object.prototype.hasOwnProperty.call(value,'asset')){
      if(required)throw Error(label+' 缺少正式 asset 名称，请重新导出素材包。');
      return'';
    }
    if(typeof value.asset!=='string'||!/^[A-Za-z][A-Za-z0-9_]*$/.test(value.asset))throw Error(label+' 的 asset 必须为完整资产名（仅英文、数字和下划线，不含扩展名或路径）。');
    return value.asset;
  }
  function formalMaterialName(spec,key,m){
    const explicit=publicAssetName(m,'材质 '+key);if(explicit)return explicit;
    const main=spec.textures?.[m.textures?.main];if(!main)return'';
    const name=publicAssetName(main,'材质 '+key+' 的主贴图');if(!name)return'';
    // Main_4x4_01_HD -> Main_01_HD; segment/layer/platform semantics remain.
    // The current private material templates target PC, hence the final _HD.
    return (name.startsWith('T_')?'MI_'+name.slice(2):'MI_'+name)
      .replace(/_\d+x\d+(?=_\d+(?:_HD)?$)/,'').replace(/_HD$/,'')+'_HD';
  }
  function formalDependencyName(spec,key){
    if(key.startsWith('tex:')){
      const t=spec.textures?.[key.slice(4)];
      return t?publicAssetName(t,'贴图 '+key.slice(4),spec.naming?.asset_names==='textures[].asset'):'';
    }
    if(key.startsWith('mat:')){
      const m=spec.materials?.[key.slice(4)];return m?formalMaterialName(spec,key.slice(4),m):'';
    }
    return'';
  }
  function validateLifeVector(md,prop,emitter){
    const errors=[],label='发射器 '+emitter+'：'+md.m+'.'+prop;
    const dist=md[prop],vec=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
    if(!dist||typeof dist!=='object'||Array.isArray(dist))return[label+' 必须为三维向量分布'];
    const forms=['const','uniform','curve'].filter(k=>Object.prototype.hasOwnProperty.call(dist,k));
    if(forms.length!==1)return[label+' 只能指定一种分布：const / uniform / curve'];
    if('bake' in dist&&typeof dist.bake!=='boolean')errors.push(label+' 的 bake 必须为布尔值');
    const kind=forms[0],v=dist[kind];
    if(kind==='const'&&!vec(v))errors.push(label+' 的 const 必须为三个有限数字');
    if(kind==='uniform'){
      if(!Array.isArray(v)||v.length!==2||!v.every(vec))errors.push(label+' 的 uniform 必须为两个三维向量');
      else if(v[0].some((n,i)=>n>v[1][i]))errors.push(label+' 的 uniform 最小值不能大于最大值');
    }
    if(kind==='curve'){
      if(!Array.isArray(v)||!v.length)errors.push(label+' 的 curve 不能为空');
      else{
        let previous=-Infinity;
        for(const key of v){
          if(!Array.isArray(key)||key.length!==2||!Number.isFinite(key[0])||key[0]<0||key[0]>1||key[0]<previous||!vec(key[1])){
            errors.push(label+' 的 curve 需按相对寿命 0–1 排序，每点为 [时间, 三维向量]');break;
          }
          previous=key[0];
        }
      }
    }
    return errors;
  }
  function validateLifeScalar(md,prop,emitter){
    const label='发射器 '+emitter+'：'+md.m+'.'+prop,dist=md[prop],errors=[];
    if(!dist||typeof dist!=='object'||Array.isArray(dist))return[label+' 必须为浮点分布'];
    const forms=['const','uniform','curve'].filter(k=>Object.prototype.hasOwnProperty.call(dist,k));
    if(forms.length!==1)return[label+' 只能指定一种分布：const / uniform / curve'];
    if('bake' in dist&&typeof dist.bake!=='boolean')errors.push(label+' 的 bake 必须为布尔值');
    const kind=forms[0],v=dist[kind];
    if(kind==='const'&&!Number.isFinite(v))errors.push(label+' 的 const 必须为有限数字');
    if(kind==='uniform'&&(!Array.isArray(v)||v.length!==2||!v.every(Number.isFinite)||v[0]>v[1]))errors.push(label+' 的 uniform 必须为从小到大的两个有限数字');
    if(kind==='curve'){
      if(!Array.isArray(v)||!v.length)errors.push(label+' 的 curve 不能为空');
      else{
        let previous=-Infinity;
        for(const key of v){
          if(!Array.isArray(key)||key.length!==2||!Number.isFinite(key[0])||key[0]<0||key[0]>1||key[0]<previous||!Number.isFinite(key[1])){
            errors.push(label+' 的 curve 需按相对寿命 0–1 排序，每点为 [时间, 有限数字]');break;
          }
          previous=key[0];
        }
      }
    }
    return errors;
  }
  function validate(spec,configFile='cascade.json'){
    const errs=[];
    if(!spec||typeof spec!=='object'||Array.isArray(spec))return['cascade.json 必须是素材配置对象'];
    errs.push(...dissolveValidationErrors(spec));
    errs.push(...cascadeEventErrors(spec));
    errs.push(...resourceRulesErrors(spec));     // v2.28 资源规范四项字段
    if(configFile==='cascade_mobile.json'&&(spec.emitters||[]).some(e=>e.gpu))errs.push('手游配置不支持 GPU 发射器');
    if(spec.format!=='fwl.cascade/1')errs.push('format 不是 fwl.cascade/1');
    const tex=spec.textures||{},mats=spec.materials||{};
    for(const [key,t]of Object.entries(tex)){
      if(!t||typeof t!=='object'){errs.push('贴图 '+key+' 的配置无效');continue;}
      if(typeof MAP.naming[t.class]!=='string'||!MAP.texture_examples[t.class])errs.push('贴图类型不支持：'+key+' → '+t.class);
      if(typeof t.file!=='string'||!t.file.trim())errs.push('贴图 '+key+' 缺少 file');
      try{textureGrid(spec,key,t);}catch(e){errs.push(e.message);}
      try{publicAssetName(t,'贴图 '+key,spec.naming?.asset_names==='textures[].asset');}catch(e){errs.push(e.message);}
    }
    for(const [key,m]of Object.entries(mats)){
      const role=MAP.material_roles[m?.role];
      if(!role){errs.push('材质 '+key+' 的角色 '+m?.role+' 本工具没配置');continue;}
      if(role.template)try{publicAssetName(m,'材质 '+key);}catch(e){errs.push(e.message);}
      for(const [param,ref]of Object.entries(m.textures||{})){
        if(!Object.prototype.hasOwnProperty.call(tex,ref))errs.push('材质 '+key+' 引用的贴图不存在：'+ref);
        if(role.template&&!role.textures?.[param])errs.push('材质 '+key+' 不支持贴图参数：'+param);
      }
      for(const param of Object.keys(m.scalars||{}))if(role.template&&!role.scalars?.[param])errs.push('材质 '+key+' 不支持数值参数：'+param);
    }
    for(const em of spec.emitters||[]){
      if(!mats[em.material])errs.push('发射器 '+em.name+' 的材质 '+em.material+' 没定义');
      const rq=em.required||{};
      if(rq.screen_alignment&&!ALIGN[rq.screen_alignment])errs.push('发射器 '+em.name+' 的朝向类型不支持：'+rq.screen_alignment);
      if('local_space' in rq&&typeof rq.local_space!=='boolean')errs.push('发射器 '+em.name+' 的 local_space 必须为布尔值');
      if('pivot_offset' in rq&&(!Array.isArray(rq.pivot_offset)||rq.pivot_offset.length!==2||!rq.pivot_offset.every(Number.isFinite)))errs.push('发射器 '+em.name+' 的 pivot_offset 必须为两个有限数字');
      const cutout=em.required?.cutout;
      if(cutout&&!Object.prototype.hasOwnProperty.call(tex,cutout))errs.push('发射器 '+em.name+' 引用的轮廓图不存在：'+cutout);
      else if(cutout&&tex[cutout]?.class!=='cutout')errs.push('发射器 '+em.name+' 的轮廓图 '+cutout+' 需为 cutout 类型');
      for(const md of em.modules||[]){
        if(!MOD[md.m])errs.push('发射器 '+em.name+'：不认识的模块 '+md.m);
        if(md.m==='VelocityOverLife'){
          errs.push(...validateLifeVector(md,'VelOverLife',em.name));
          if('Absolute' in md&&typeof md.Absolute!=='boolean')errs.push('发射器 '+em.name+'：VelocityOverLife.Absolute 必须为布尔值');
        }
        if(md.m==='SizeByLife'){
          if('LifeMultiplier' in md)errs.push(...validateLifeVector(md,'LifeMultiplier',em.name));
          for(const field of ['MultiplyX','MultiplyY','MultiplyZ'])if(field in md&&typeof md[field]!=='boolean')errs.push('发射器 '+em.name+'：SizeByLife.'+field+' 必须为布尔值');
        }
        if(md.m==='ColorScaleOverLife'){
          errs.push(...validateLifeVector(md,'ColorScaleOverLife',em.name),...validateLifeScalar(md,'AlphaScaleOverLife',em.name));
          for(const prop of ['ColorScaleOverLife','AlphaScaleOverLife']){
            const dist=md[prop];
            if(dist&&typeof dist==='object')for(const field of Object.keys(dist))if(!['const','uniform','curve','bake'].includes(field))errs.push('发射器 '+em.name+'：ColorScaleOverLife.'+prop+' 分布含未知字段 '+field);
          }
        }
        if('preRoll' in md){
          if(md.m!=='SizeByLife')errs.push('发射器 '+em.name+'：preRoll 只支持 SizeByLife 模块');
          if(typeof md.preRoll!=='boolean')errs.push('发射器 '+em.name+'：preRoll 必须为布尔值');
        }
      }
    }
    return errs;
  }
  // Two-column legacy input is split once; explicit fields preserve literal base names.
  function splitImportName(text,fallbackIndex='01'){
    const value=String(text??'').trim(),match=/^(.*)_(\d{2})$/.exec(value);
    return{baseName:match?match[1]:value,assetIndex:match?match[2]:fallbackIndex};
  }
  function resolveImportNaming(asName,options){
    const implicit=splitImportName(asName),fields=options||implicit;
    const baseName=String(fields.baseName??implicit.baseName).trim(),assetIndex=String(fields.assetIndex??implicit.assetIndex).trim();
    if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(baseName))throw Error('基础名需以英文字母开头，只使用英文、数字和下划线，例如 GoldSpark；不用填写末尾编号。');
    if(!/^\d{2}$/.test(assetIndex))throw Error('贴图/材质编号需为两位数字，例如 01 或 05。');
    // Direct historical base_index callers keep the old particle path. The UI always
    // passes its stored rule explicitly, so new rows never infer PS numbering.
    const particleNumbered=options?options.particleNumbered===true:/_\d{2}$/.test(String(asName));
    const assetNaming=fields.assetNaming??'formal';
    if(!['formal','legacy'].includes(assetNaming))throw Error('资产命名规则无效，请重新选择命名方式。');
    return{baseName,assetIndex,particleNumbered,assetNaming};
  }
  function makePlan(spec,asName,options){
    const naming=resolveImportNaming(asName,options),base=naming.baseName,idx=naming.assetIndex,tex=spec.textures||{},mats=spec.materials||{},assets={};
    const tokens=nameTokens(Object.keys(tex)),counts=new Map();
    for(const t of Object.values(tex))counts.set(t.class,(counts.get(t.class)||0)+1);
    const fmt=(pattern,namedBase,grid,mat='')=>pattern.replace('{base}',namedBase).replace('{idx}',idx).replace('{cols}',grid.cols).replace('{rows}',grid.rows).replace('{mat}',mat);
    for(const [key,t]of Object.entries(tex)){
      const pattern=MAP.naming[t.class];
      if(typeof pattern!=='string'||!MAP.texture_examples[t.class])throw Error('贴图类型不支持：'+key+' → '+t.class);
      const namedBase=counts.get(t.class)>1?base+'_'+tokens.get(key):base;
      const formal=naming.assetNaming==='formal'?formalDependencyName(spec,'tex:'+key):'';
      const name=formal||fmt(pattern,namedBase,textureGrid(spec,key,t));
      assets['tex:'+key]=texturePolicy(name,t.class).directory+'/'+name;
    }
    const matTokens=nameTokens(Object.keys(mats));
    for(const [key,m]of Object.entries(mats)){
      const role=MAP.material_roles[m.role];if(!role)throw Error('材质 '+key+' 的角色未配置：'+m.role);
      if(role.template){
        const mat=/^[A-Za-z0-9_]+$/.test(key)?key:matTokens.get(key);
        const formal=naming.assetNaming==='formal'?formalDependencyName(spec,'mat:'+key):'';
        assets['mat:'+key]=MAP.dirs.mi+'/'+(formal||fmt(Object.keys(mats).length===1?MAP.naming.mi_single:MAP.naming.mi,base,{cols:1,rows:1},mat));
      }
    }
    const particlePattern=naming.particleNumbered?MAP.naming.ps:MAP.naming.ps.replace('_{idx}','');
    assets.ps=MAP.dirs.ps+'/'+fmt(particlePattern,base,{cols:1,rows:1});
    const canonical=canonicalTexturePlan(spec,assets);Object.assign(assets,canonical);
    const seen=new Map();
    for(const [key,p]of Object.entries(assets)){
      guard(p);const lower=p.toLowerCase();
      if(seen.has(lower)&&!(key.startsWith('tex:')&&seen.get(lower).startsWith('tex:')&&['ramp','cutout'].includes(tex[key.slice(4)]?.class)&&tex[key.slice(4)]?.class===tex[seen.get(lower).slice(4)]?.class&&tex[key.slice(4)]?.file===tex[seen.get(lower).slice(4)]?.file))throw Error('素材包内目标重名（'+seen.get(lower)+' / '+key+'），请检查正式 asset 名称或旧命名规则：'+p);
      seen.set(lower,key);
    }
    return assets;
  }
