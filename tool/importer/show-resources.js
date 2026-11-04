// ID library and shared native selection; no resource parameters are imported.
const ShowResources=(()=>{
  const groups={trail:'尾缀 · 升空',fan:'单簇 · 扇形',burst:'爆炸效果',other:'其它烟花资源'};
  function category(id){if(/Fan/i.test(id))return 'fan';if(/Trail|Fuse|Shoot/i.test(id))return 'trail';if(/Explosion|Boom|Chry|Crackle|Kamuro|Spark|Peony|Prism|Large_|Medium_|Small_|Merge_/i.test(id))return 'burst';return 'other';}
  function normalize(items){
    if(!Array.isArray(items)||items.length>4096)throw Error('ID列表格式无效或过大。');
    const map=new Map();
    for(const item of items){
      const id=ShowText.name(item?.id,'ResourceId'),key=id.toLowerCase();
      if(!Array.isArray(item.platforms)||item.platforms.some(p=>!['pc','mobile'].includes(p)))throw Error('ID平台信息无效。');
      if(!map.has(key))map.set(key,{id,group:Object.hasOwn(groups,item.group)?item.group:category(id),platforms:[]});
      const record=map.get(key);for(const p of item.platforms)if(!record.platforms.includes(p))record.platforms.push(p);
    }
    return [...map.values()].map(r=>({...r,platforms:r.platforms.sort()})).sort((a,b)=>a.id.localeCompare(b.id));
  }
  let records=normalize(ShowResourceData.records),updatedAt=ShowResourceData.updatedAt;
  const all=()=>records.map(r=>({...r,platforms:[...r.platforms]}));
  const get=id=>records.find(r=>r.id.toLowerCase()===String(id||'').trim().toLowerCase());
  function replace(items,time){const next=normalize(items);records=next;if(typeof time==='string')updatedAt=time;}
  function fromReads(reads){
    if(!Array.isArray(reads)||reads.length!==4)throw Error('PC与手机的四路ID读取尚未全部完成。');
    const items=[],seen=new Set();
    for(const {platform,field,reply} of reads){
      const key=platform+':'+field;
      if(!['pc','mobile'].includes(platform)||!['ResourceId','FxSP'].includes(field)||seen.has(key)||reply?.success!==true||!Array.isArray(reply.data?.matches))throw Error('读取ID失败，已有ID列表和草稿保留。');
      seen.add(key);
      if(reply.data.matches.length>=1000||Number(reply.data.match_count)>reply.data.matches.length)throw Error('单次ID匹配过多，已有列表保留。');
      for(const row of reply.data.matches){const id=ShowText.name(row.ResourceId,'表中ResourceId');items.push({id,group:category(id),platforms:[platform]});}
    }
    if(!items.length)throw Error('没有读到烟花ID，已有列表保留。');
    return normalize(items);
  }
  const platforms=r=>r.platforms.map(p=>p==='pc'?'PC':'手机').join(' / ')||'自定义';
  const short=id=>id.replace(/^P_EFX_FireWorks?_/, '').replace(/^P_EFX_/,'').replace(/^P_/, '');
  function fillSelect(select,id='',role='fan',query=''){
    const doc=select.ownerDocument;select.replaceChildren();const empty=doc.createElement('option');empty.value='';empty.textContent='空白 / 自定义';select.appendChild(empty);
    const q=String(query).trim().toLowerCase(),matches=records.filter(r=>!q||(r.id+' '+groups[r.group]+' '+platforms(r)).toLowerCase().includes(q));
    const order=role==='launch'?['trail','fan','burst','other']:role==='burst'?['burst','trail','fan','other']:['fan','trail','burst','other'];
    for(const group of order){const list=matches.filter(r=>r.group===group);if(!list.length)continue;const holder=doc.createElement('optgroup');holder.label=groups[group];
      for(const record of list){const option=doc.createElement('option');option.value=record.id;option.textContent=short(record.id)+' · '+platforms(record);option.title=record.id;holder.appendChild(option);}select.appendChild(holder);
    }
    const current=get(id);
    if(current&&!matches.some(r=>r.id===current.id)){const option=doc.createElement('option');option.value=current.id;option.textContent='当前选择：'+short(current.id);select.appendChild(option);}
    if(q&&!matches.length){const option=doc.createElement('option');option.disabled=true;option.textContent='没有匹配的ID，可修改搜索或手填';select.appendChild(option);}
    select.value=current?.id||'';
  }
  function hint(id){const record=get(id);return !String(id||'').trim()?'选择一个ID，或在下方填写自定义ID。':record?'表中ID · '+groups[record.group]+' · '+platforms(record)+'；选择只改ID，不带入时间、高度或缩放。':'自定义ID · 请核对资源表是否存在；不会改动当前参数。';}
  function snapshot(){return {records:all(),updatedAt};}
  return {groups,category,normalize,fromReads,replace,all,get,fillSelect,hint,snapshot};
})();
