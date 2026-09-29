// Independent reference studies. These are NOT accepted production-library entries.
const STUDY_RECIPES = {
  V14: {
    name: '鸿巢四尺玉 · V14', duration: 10.4, split: 5.2,
    note: '白金主花 → 下垂长尾 → 红色余烬；首轮复刻，待对照。',
    layers: [
      {id:'shell',name:'白金长尾主花',base:'kiku',p:{seed:141,stars:780,duration:10.4,v0:310,vt:34,grav:.65,burn:7.7,burnJit:7,fade:.22,flash:.35,headSize:1.15,headBright:.34,lastFlare:.08,flicker:.08,sparkRate:320,sparkRateEnd:.75,sparkLife:1.15,sparkSize:.50,sparkSpread:.20,sparkInherit:.04,sparkDrag:2.5,sparkGrav:.35,T0:2520,cooling:.24,sparkBright:1.45,twinkle:.2,dirJit:.35,speedJit:2},m:{stages:[[0,'#fff4dc']],ramp1:'#c2a783',ramp2:'#fff0db',ramp3:'#fffef8',headInt:1.8}},
      {id:'embers',start:6.8,name:'末段红色闪点',base:'strobe',p:{seed:141,stars:150,duration:10.4,v0:310,vt:34,grav:.65,burn:2.25,burnJit:20,ignDelay:7.6,ignJit:5,strobeStart:0,strobeHz:3.2,strobeDuty:.16,headSize:.45,headBright:1,flash:0,fade:.4,dirJit:.35,speedJit:2,sparkRate:0},m:{stages:[[0,'#ff7093']],ramp0:'#000000',ramp1:'#ffffff',ramp2:'#ffffff',ramp3:'#ffffff',headInt:1.2}},
      {id:'core',name:'短促金芯',base:'kiku',p:{seed:142,stars:85,duration:2.0,v0:50,vt:12,grav:.5,burn:1.15,burnJit:8,headSize:.3,headBright:.25,flash:.2,sparkRate:55,sparkLife:.3,sparkSize:.16,sparkSpread:.3,sparkGrav:.25,fade:.5},m:{stages:[[0,'#ffd274']],headInt:.7}}
    ]
  },
  V13: {
    name:'片贝四尺玉 · V13',duration:11.8,split:5.9,
    note:'前段金色载体 + 彩芯 → 外圈金色子花 → 下垂花雨；首轮结构复刻，待对照。',
    layers:[
      {id:'flowers',name:'外圈金色子花',base:'senrin',p:{seed:133,stars:66,duration:11.8,v0:155,vt:40,grav:.62,subDelay:4.35,subJit:12,subStars:42,subSpeed:28,subBurn:4.7,subTail:90,carrierTail:38,burnJit:12,fade:.48,lastFlare:0,flash:.15,headSize:1.25,headBright:.4,sparkLife:1.25,sparkRateEnd:.7,sparkSize:.65,sparkSpread:.30,sparkInherit:.07,sparkDrag:1.8,sparkGrav:.55,T0:2060,cooling:.32,sparkBright:1.3,dirJit:1,speedJit:4},m:{stages:[[0,'#fff1dd']],ramp1:'#9d440d',ramp2:'#ffc365',ramp3:'#fff1bd',headInt:4.5}},
      {id:'core',name:'先行金色菊芯',base:'kiku',p:{seed:134,stars:105,duration:6.5,v0:92,vt:23,grav:.60,burn:4.8,burnJit:8,fade:.45,flash:.1,headSize:.35,headBright:.2,sparkRate:95,sparkLife:.65,sparkSize:.18,sparkSpread:.25,sparkInherit:.04,sparkGrav:.3,T0:2100,cooling:.33,lastFlare:0},m:{stages:[[0,'#ffd087']],ramp1:'#9b330d',ramp2:'#ffc376',ramp3:'#fff3c2',headInt:1}},
      ...[['pink','#ff447f',137],['blue','#687cff',139],['green','#80ffba',140]].map(([id,color,seed])=>({id,name:'彩色小芯 · '+id,base:'senrin',p:{seed,stars:8,duration:6.2,v0:63,vt:28,grav:.6,subDelay:2.6,subJit:14,subStars:32,subSpeed:15,subBurn:2.25,subTail:0,carrierTail:0,flash:0,headSize:.55,headBright:1,fade:.45,lastFlare:0,burnJit:20,strobeHz:4,strobeDuty:.45,strobeStart:.65},m:{stages:[[0,color]],ramp1:'#ffffff',ramp2:'#ffffff',ramp3:'#ffffff',headInt:1.4}}))
    ]
  }
};
function studyLayerParams(id, index, size = 4096) {
  const spec=STUDY_RECIPES[id].layers[index], d=defaultsFor(spec.base);
  return {P:derive({...d.P,...spec.p,...QUALITY_PRESETS.fine,texW:size,texH:size,cols:8,rows:8,chans:4,zoom:'off',frameMode:'uniform',form:'master',outMode:'combined',autoGrid:0,cellPad:2}),M:normalizeM({...d.M,...spec.m},spec.base)};
}
function studyView(id) {
  let h=0,y0=0,y1=0;
  STUDY_RECIPES[id].layers.forEach((l,i)=>{const f=measure(studyLayerParams(id,i).P);h=Math.max(h,-f.x0,f.x1);y0=Math.min(y0,f.y0);y1=Math.max(y1,f.y1);});
  const half=Math.max(h,(y1-y0)/2)*1.055+3;
  return [0,(y1+y0)/2,half,half];
}
function studyPlan(P, view, ta=0,tb=P.duration) {
  const pl=plan(P,measure(P),ta,tb);
  Object.assign(pl,{HX:view[2],HY:view[3],Ww:2*view[2],Wh:2*view[3],cy:view[1],ppm:pl.L.cellW/(2*view[2]),px:.5,py:(view[1]+view[3])/(2*view[3])});
  return pl;
}
