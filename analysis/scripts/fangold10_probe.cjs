const fs=require('fs'),path=require('path'),vm=require('vm');
const b=JSON.parse(fs.readFileSync('analysis/results/FC6O_FanGold10/测试基线.json','utf8'));
const c=vm.createContext({console,setTimeout,window:{},REFS:{},performance,TextEncoder,structuredClone,input:b.P});
for(const n of ['00_util','05_quality','10_types','20_sim'])vm.runInContext(fs.readFileSync('tool/src/js/'+n+'.js','utf8'),c);
const info=vm.runInContext(`(()=>{const P=input,s=new Sim({...P,engine:'gpu'});const ends=s.all.map(x=>x.birth+(x.vis??x.burn));return {onset:Math.max(...ends),first:Math.min(...ends),stars:s.all.length,k:P.sparkDrag,c:sparkCqOf(P),g:9.81*P.sparkGrav};})()`,c);
fs.writeFileSync('analysis/results/FC6O_FanGold10/阶段与阻力.json',JSON.stringify(info,null,2));console.log(info);
