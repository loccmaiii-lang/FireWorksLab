// 只改导演三表标识及引用；固定配方、顺序和全部原生数值保持原样。
const token=value=>String(value||'').replace(/[^A-Za-z0-9]/g,'')||'Effect';
function family(id){
 const name=String(id||'').replace(/^P_EFX_FireWorks_/i,'').replace(/^P_/,'').replace(/_\d+$/,'');
 return token(name.replace(/^NY_Trail_/i,'Trail'));
}
const unique=values=>[...new Set(values)].sort();
function subRoot(sub){
 const entries=sub.Entries||[],main=entries.filter(e=>e.FXResourceId&&!/Trail/i.test(e.FXResourceId));
 const selected=main.length?main:entries,roots=unique(selected.filter(e=>e.FXResourceId&&e.FXResourceId!=='None').map(e=>family(e.FXResourceId)));
 let root=roots.join('And')||token(sub.TemplateName);
 if(roots.length===1&&/^Fan/i.test(root)&&selected.length>1){
  root+=selected.length;
  const sorted=[...selected].sort((a,b)=>(a.RotationOffset?.Roll||0)-(b.RotationOffset?.Roll||0));
  const times=sorted.map(e=>e.LocalTimeOffset||0);
  if(new Set(times).size>1){
   const increasing=times.every((t,i)=>i===0||t>=times[i-1]);
   const decreasing=times.every((t,i)=>i===0||t<=times[i-1]);
   const middle=Math.floor(times.length/2);
   const center=times[middle]===Math.min(...times)&&times.every((t,i)=>t===times[times.length-1-i]);
   root+=increasing?'Left':decreasing?'Right':center?'Center':'Pattern';
  }
 }
 return root;
}
function indexed(items,label){
 const map=new Map();
 for(const item of items){const key=String(item.TemplateName||'').toLowerCase();if(!key||map.has(key))throw Error(label+'名称缺失或重名：'+item.TemplateName);map.set(key,item)}
 return map;
}
export function nameDirectorArrays(input){
 const arrays=structuredClone(input),children=indexed(arrays.EffectSubTemplates,'子模板'),parents=indexed(arrays.EffectTemplates,'父模板');
 const childNames=new Map(),parentNames=new Map(),used=new Set(),areas=new Map();
 const audit={scheme:'effect_group_cue_variant/1',subTemplates:[],templates:[]};
 for(const sub of arrays.EffectSubTemplates){
  const root=subRoot(sub);let name=root,index=2;
  while(used.has(name.toLowerCase()))name=root+'V'+String(index++).padStart(2,'0');
  used.add(name.toLowerCase());childNames.set(sub.TemplateName.toLowerCase(),name);
  audit.subTemplates.push({from:sub.TemplateName,to:name});sub.TemplateName=name;
 }
 for(const group of arrays.EffectScheduleGroups)for(const slot of group.Slots){
  const key=String(slot.TemplateName).toLowerCase();if(!parents.has(key))throw Error('时序引用未知父模板：'+slot.TemplateName);
  if(!areas.has(key))areas.set(key,new Set());areas.get(key).add(token(group.GroupName));
 }
 const counts=new Map();
 for(const parent of arrays.EffectTemplates){
  const old=parent.TemplateName,key=old.toLowerCase(),roots=[];
  for(const entry of parent.Entries||[]){
   if(entry.SubTemplateName&&entry.SubTemplateName!=='None'){
    const childKey=entry.SubTemplateName.toLowerCase();if(!children.has(childKey))throw Error('父模板引用未知子模板：'+entry.SubTemplateName);
    entry.SubTemplateName=childNames.get(childKey);roots.push(entry.SubTemplateName);
   }else if(entry.FXResourceId&&entry.FXResourceId!=='None')roots.push(family(entry.FXResourceId));
  }
  const root=unique(roots).join('And')||'Effect',area=[...(areas.get(key)||['Library'])].sort().join('And');
  const cue=old.match(/(?:^|_)(C\d+)(?:_|$)/i)?.[1].toUpperCase()||'C'+String(audit.templates.length).padStart(3,'0');
  const stem=`${root}_${area}_${cue}`,index=(counts.get(stem.toLowerCase())||0)+1;
  counts.set(stem.toLowerCase(),index);const name=stem+'_'+String(index).padStart(2,'0');
  parentNames.set(key,name);audit.templates.push({from:old,to:name});parent.TemplateName=name;
 }
 for(const group of arrays.EffectScheduleGroups)for(const slot of group.Slots)slot.TemplateName=parentNames.get(slot.TemplateName.toLowerCase());
 return {arrays,audit};
}
