// 解析及插值与 20_sim.js 保持同规则；点编辑约束只用于隔离样板。
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function parseCurve(txt){
 if(Array.isArray(txt))return txt.length?txt:null;
 const ks=String(txt||'').split(/[,，;；\n]+/).map(x=>x.trim()).filter(Boolean).map(x=>x.split(/[:：\s]+/).map(Number)).filter(k=>k.length>=2&&isFinite(k[0])&&isFinite(k[1])).map(k=>[clamp(k[0],0,1),k[1]]);
 ks.sort((a,b)=>a[0]-b[0]);return ks.length?ks:null;
}
export function at(ks,x){
 if(!ks)return 1;if(x<=ks[0][0])return ks[0][1];const last=ks.at(-1);if(x>=last[0])return last[1];
 for(let i=1;i<ks.length;i++)if(x<=ks[i][0]){const a=ks[i-1],b=ks[i],f=(x-a[0])/Math.max(1e-9,b[0]-a[0]);return a[1]+(b[1]-a[1])*f;}
 return last[1];
}
export const serialize=points=>points.map(p=>p.join(':')).join(', ');
export function validatePoint(points,i,x,y){
 if(String(x).trim()===''||String(y).trim()===''||!Number.isFinite(+x)||!Number.isFinite(+y))return '请输入有效的时间与倍率。';
 if(+x<0||+x>1)return '寿命位置在 0–1 之间。';
 if((i>0&&+x<=points[i-1][0])||(i<points.length-1&&+x>=points[i+1][0]))return '点按时间排序；请避开相邻点的时刻。';
 return '';
}
export function movePoint(points,i,x,y){
 const next=points.map(p=>[...p]);const before=i?points[i-1][0]:0,after=i<points.length-1?points[i+1][0]:1;
 const margin=Math.min(.001,(after-before)/4),lo=i?before+margin:0,hi=i<points.length-1?after-margin:1;
 const clamped=clamp(x,lo,hi),rounded=Number(clamped.toFixed(6));
 next[i]=[(i&&rounded<=before)||(i<points.length-1&&rounded>=after)?clamped:rounded,Number(y.toFixed(3))];return next;
}
export function createHistory(initial){
 let current=structuredClone(initial),past=[],future=[];
 return {get state(){return structuredClone(current);},get depth(){return past.length;},get canUndo(){return !!past.length;},get canRedo(){return !!future.length;},
 commit(next){if(JSON.stringify(next)===JSON.stringify(current))return false;past.push(current);if(past.length>60)past.shift();current=structuredClone(next);future=[];return true;},
 undo(){if(!past.length)return false;future.push(current);current=past.pop();return true;},
 redo(){if(!future.length)return false;past.push(current);current=future.pop();return true;}
 };
}
