  // Read-only presentation adapter plus the existing inspected-object selection.
  function deliveryTextureSheets(item){
    const spec=item?.spec,result={};if(!spec)return result;
    for(const [key,t]of Object.entries(spec.textures||{})){
      if(t.class!=='flipbook')continue;
      const index=/_([0-9]{2})(?:_HD)?$/.exec(t.asset||'')?.[1];if(!index)continue;
      const layers=[...new Set((spec.emitters||[]).filter(e=>Object.values(spec.materials?.[e.material]?.textures||{}).includes(key)).map(e=>e.layer).filter(Number.isInteger))];
      result['tex:'+key]={index,layers};
    }
    return result;
  }
  function deliveryView(){
    const r=record(inspected);
    const spec=r&&proposals.get(r.id)?.item.spec;
    const emitters=spec?.emitters||[];
    // A finite one-shot config can report its playback window; loop/GPU packages stay unknown.
    const timed=emitters.length&&emitters.every(e=>!e.gpu&&e.required?.loops===1&&Number.isFinite(e.required.duration_s)&&Number.isFinite(e.required.delay_s??0));
    return {phase,busy:locked()||!!editor,inspected,editing:!!editor,storageOK,
      historyCount:batches.filter(b=>b.id!==active&&b.rows.length).length,
      rows:rows().map(x=>({id:x.id,name:x.baseName,platform:x.configFile==='cascade_mobile.json'?'mobile':'pc',deliveryId:x.deliveryId||'',dir:x.dir,state:x.state,selected:x.selected,checked:checked(x),confirmed:canRun(x),label:statusLabel(x),assets:{...x.assets},textureSheets:deliveryTextureSheets(proposals.get(x.id)?.item)})),
      current:r?{name:r.baseName,id:r.id,deliveryId:r.deliveryId||'',dir:r.dir,platform:r.configFile==='cascade_mobile.json'?'mobile':'pc',state:r.state,confirmed:canRun(r),policyReady:!!spec,particleSkipped:(r.excludedAssetKeys||[]).includes('ps'),gpuCount:emitters.filter(e=>e.gpu).length,duration:timed?Math.max(...emitters.map(e=>(e.required.delay_s||0)+e.required.duration_s)):null}:null};
  }
  function selectDeliveryPlatform(platform){
    if(locked()||editor)return;
    const current=record(inspected);if(!current)return;
    const sibling=rows().find(x=>(current.deliveryId?x.deliveryId===current.deliveryId:x.dir===current.dir)&&(x.configFile==='cascade_mobile.json'?'mobile':'pc')===platform);
    if(!sibling)return;
    inspected=sibling.id;if(currentFilter==='errors'&&!problem(sibling))currentFilter='all';refresh();
    if(typeof MaterialWorkbench!=='undefined')MaterialWorkbench.setPane('settings');
    document.getElementById('delivery-platform-'+platform)?.focus({preventScroll:true});
  }
