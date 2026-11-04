// Bounded JSON import with a review receipt tied to the unchanged project.
const ShowProjectImport=(()=>{
  function parse(text){if(typeof text!=='string'||text.length>2e6)throw Error('工程文件为空或超过2MB。');return JSON.parse(text,(key,value)=>{if(['__proto__','prototype','constructor'].includes(key))throw Error('工程包含无效属性。');return value;});}
  function preview(current,incoming,mode='merge'){
    const errors=ShowProject.validate(incoming);if(errors.length)throw Error(errors.join('\n'));
    if(!['merge','replace'].includes(mode))throw Error('请选择合并或替换工程。');
    const next=mode==='replace'?ShowProject.clone(incoming):ShowProject.clone(current),rows=[],maps={},conflicting=new Set();let conflicts=0;
    for(const list of ShowProject.lists){
      maps[list]=new Map();const existing=current[list],reserved=new Set((mode==='merge'?existing:[]).map(x=>x.id)),names=new Set((mode==='merge'?existing:[]).map(x=>x.name.toLowerCase()));
      for(const item of incoming[list]){
        const same=existing.find(x=>x.id===item.id),byName=existing.find(x=>x.name&&item.name&&x.name.toLowerCase()===item.name.toLowerCase()),equal=same&&ShowProject.fingerprint(same)===ShowProject.fingerprint(item),clash=!equal&&(same||byName);
        if(clash){conflicts++;conflicting.add(list+'/'+item.id);}
        let id=item.id,name=item.name;
        if(mode==='merge'&&!equal){let i=2;while(reserved.has(id))id=item.id+'-import'+i++;i=2;while(name&&names.has(name.toLowerCase()))name=item.name+'_Import'+i++;}
        maps[list].set(item.id,id);reserved.add(id);names.add(name.toLowerCase());rows.push({list,id:item.id,name:item.name,action:mode==='replace'?(clash?'替换冲突':'导入'):equal?'保留相同项':clash?'以新名称导入':'新增',nextId:id,nextName:name,conflict:!!clash});
      }
    }
    if(mode==='merge'){
      for(const list of ShowProject.lists)for(const item of incoming[list]){
        const row=rows.find(r=>r.list===list&&r.id===item.id);if(row.action==='保留相同项')continue;
        const copy=ShowProject.clone(item);copy.id=row.nextId;copy.name=row.nextName;
        if(list==='shots')for(const k of ['burstRef','trailRef','fanRef'])if(copy[k])copy[k].id=maps.resources.get(copy[k].id)||copy[k].id;
        if(list==='formations')for(const m of copy.members||[]){m.shotId=maps.shots.get(m.shotId)||m.shotId;m.pointId=maps.points.get(m.pointId)||m.pointId;}
        if(list==='cues'){copy.formationId=maps.formations.get(copy.formationId)||copy.formationId;copy.segmentId=maps.segments.get(copy.segmentId)||copy.segmentId;}
        next[list].push(copy);
      }
      if(current.points.length===0&&incoming.points.length===0&&ShowProject.fingerprint(current.site)!==ShowProject.fingerprint(incoming.site))throw Error('两份工程的自动场地不同；请选择替换工程，或先统一场地再合并。');
      if(!current.name)next.name=incoming.name;
    }
    // An identical parent may reference a changed colliding child. Import that
    // parent as a distinct record as well, propagating to dependent cues.
    if(mode==='merge'){
      for(const list of ['shots','formations','cues'])for(const item of incoming[list]){
        const row=rows.find(r=>r.list===list&&r.id===item.id);if(row.action!=='保留相同项')continue;
        const changed=list==='shots'?['burstRef','trailRef','fanRef'].some(k=>item[k]&&maps.resources.get(item[k].id)!==item[k].id):list==='formations'?(item.members||[]).some(m=>maps.shots.get(m.shotId)!==m.shotId||maps.points.has(m.pointId)&&maps.points.get(m.pointId)!==m.pointId):maps.formations.get(item.formationId)!==item.formationId||maps.segments.get(item.segmentId)!==item.segmentId;
        if(!changed)continue;
        let i=2,id=item.id+'-import'+i,name=item.name+'_Import'+i;while(next[list].some(x=>x.id===id||x.name.toLowerCase()===name.toLowerCase())){i++;id=item.id+'-import'+i;name=item.name+'_Import'+i;}
        row.action='引用变化 · 以新名称导入';row.nextId=id;row.nextName=name;row.conflict=true;conflicts++;maps[list].set(item.id,id);const copy=ShowProject.clone(item);copy.id=id;copy.name=name;
        next[list].push(copy);
      }
      // Rewrite every imported record after the propagation has completed.
      for(const row of rows.filter(r=>r.action!=='保留相同项')){
        const copy=next[row.list].find(x=>x.id===row.nextId),source=incoming[row.list].find(x=>x.id===row.id);if(!copy)continue;
        if(row.list==='shots')for(const k of ['burstRef','trailRef','fanRef'])if(source[k]){copy[k]=ShowProject.clone(source[k]);copy[k].id=maps.resources.get(source[k].id)||source[k].id;}
        if(row.list==='formations')copy.members=(source.members||[]).map(m=>({...ShowProject.clone(m),shotId:maps.shots.get(m.shotId)||m.shotId,pointId:maps.points.get(m.pointId)||m.pointId}));
        if(row.list==='cues'){copy.formationId=maps.formations.get(source.formationId)||source.formationId;copy.segmentId=maps.segments.get(source.segmentId)||source.segmentId;}
      }
    }
    const nextErrors=ShowProject.validate(next);if(nextErrors.length)throw Error(nextErrors.join('\n'));
    // Missing IDs in a draft are legal; dangling project references are not.
    const refs=ShowProject.compile(next).errors.filter(e=>/已删除|缺失|段落未选择|引用.*删除/.test(e));if(refs.length)throw Error(refs.join('\n'));
    return {baseFingerprint:ShowProject.fingerprint(current),next,rows,conflicts,mode,warnings:ShowProject.compile(next).warnings,errors:ShowProject.compile(next).errors};
  }
  function apply(current,receipt){if(!receipt||ShowProject.fingerprint(current)!==receipt.baseFingerprint)throw Error('工程已改变，导入预览失效，请重新预览。');return ShowProject.clone(receipt.next);}
  return {parse,preview,apply};
})();
