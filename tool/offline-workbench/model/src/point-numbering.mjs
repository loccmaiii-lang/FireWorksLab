import {normalize} from './editing-model.mjs';
// Event/cue identities remain opaque and unchanged, including deterministic seeds.
export function migrateNumbering(state){
 const next=structuredClone(state),doc=next.doc;
 if(!doc?.points)throw Error('草稿缺少点位编号');
 const zero=doc.meta?.pointNumbering===0;
 const expected=[...Array.from({length:9},(_,i)=>'P'+(i+(zero?0:1))),...Array.from({length:8},(_,i)=>'B'+(i+(zero?0:1))),...Array.from({length:7},(_,i)=>'F'+(i+(zero?0:1)))];
 if(doc.points.length!==24||new Set(doc.points.map(p=>p.id)).size!==24||expected.some(id=>!doc.points.some(p=>p.id===id)))throw Error('点位编号混合或不完整，已保留原草稿');
 if(zero)return next;
 const map=Object.fromEntries(expected.map(id=>[id,id[0]+(Number(id.slice(1))-1)]));
 const translate=id=>{if(!Object.hasOwn(map,id))throw Error('未知点位编号：'+id);return map[id]};
 for(const p of doc.points){const old=p.id;p.id=translate(old);if(p.name===old)p.name=p.id;}
 for(const e of doc.events){e.pointId=translate(e.pointId??e.point);e.point=e.pointId;}
 for(const c of doc.cues)c.pointIds=c.pointIds.map(translate);
 for(const g of doc.groups||[])if(g.pointIds)g.pointIds=g.pointIds.map(translate);
 for(const profile of Object.values(next.profiles||{}))for(const [cue,ids] of Object.entries(profile))profile[cue]=ids.map(translate);
 for(const key of ['point','selectedPoint','pointId'])if(next[key]&&map[next[key]])next[key]=translate(next[key]);
 doc.meta={...doc.meta,pointNumbering:0};next.doc=normalize(doc);
 return next;
}
