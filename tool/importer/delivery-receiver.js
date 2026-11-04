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
