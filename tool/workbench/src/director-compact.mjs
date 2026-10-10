const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).filter(k=>k!=='_struct').sort().map(k=>[k,stable(v[k])])):v;
// Structural equality only: never round values, change entry order or merge calls.
export function compactDirectorArrays(input){
 const arrays=structuredClone(input),seen=new Map(),names=new Map(),parents=[];
 for(const p of arrays.EffectTemplates){if(names.has(p.TemplateName))throw Error('Duplicate template '+p.TemplateName);const {TemplateName,...body}=p,key=JSON.stringify(stable(body));let name=seen.get(key);if(!name){name=TemplateName;seen.set(key,name);parents.push(p)}names.set(TemplateName,name)}
 for(const g of arrays.EffectScheduleGroups)for(const s of g.Slots){if(!names.has(s.TemplateName))throw Error('Unknown template '+s.TemplateName);s.TemplateName=names.get(s.TemplateName)}
 arrays.EffectTemplates=parents;
 return {arrays,stats:{originalTemplates:input.EffectTemplates.length,uniqueTemplates:parents.length,originalEntries:input.EffectTemplates.reduce((n,p)=>n+p.Entries.length,0),uniqueEntries:parents.reduce((n,p)=>n+p.Entries.length,0)}};
}
export function expandDirectorSchedule(arrays){const parents=new Map(arrays.EffectTemplates.map(p=>[p.TemplateName,p]));return arrays.EffectScheduleGroups.flatMap(g=>g.Slots.map(s=>{const p=parents.get(s.TemplateName);if(!p)throw Error('Unknown template '+s.TemplateName);const {TemplateName:pn,...parent}=p,{TemplateName:sn,...slot}=s;return stable({group:g.GroupName,slot,parent})}));}
