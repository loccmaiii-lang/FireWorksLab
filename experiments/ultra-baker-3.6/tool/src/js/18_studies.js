// Independent reference studies. These are NOT accepted production-library entries.
const STUDY_RECIPES = {
  V14: {
    name: '鸿巢四尺玉 · V14', duration: 10.4, split: 5.2,
    note: '连续尾丝第三版：独立白亮段与暖色长尾，按运动历史生成曲线；待视觉验收。',
    layers: [
      {id:'shell',name:'白金长尾主花',base:'kiku',p:{seed:141,stars:660,duration:10.4,v0:262,vt:35.3,grav:.65,burn:8.05,burnJit:4,fade:.12,flash:.35,headSize:.7,headBright:.08,lastFlare:.08,flicker:.08,filament:1,filamentLife:4.2,filamentHot:.78,filamentBody:.16,filamentWidth:.72,filamentJitter:.28,sparkRate:620,sparkRateEnd:.72,sparkLife:.92,sparkSize:1.15,sparkSpread:.22,sparkInherit:.04,sparkDrag:2.5,sparkGrav:.35,T0:2700,cooling:.2,sparkBright:1.45,twinkle:.08,dirJit:5.5,speedJit:6},m:{stages:[[0,'#ffffff'],[7.7,'#ffe0b5'],[8.7,'#945025'],[9.6,'#30120a']],xw:.9,ramp1:'#805139',ramp2:'#fff7ef',ramp3:'#ffffff',headInt:5}},
      {id:'embers',start:7.4,name:'同轨迹红色闪点',base:'strobe',p:{seed:141,stars:660,duration:10.4,v0:262,vt:35.3,grav:.65,burn:3.8,burnJit:7,ignDelay:8.3,ignJit:5,ignitionSeed:14193,visibleEvery:4,strobeStart:0,strobeHz:2.3,strobeDuty:.3,headSize:3.5,headBright:1,flash:0,fade:.2,dirJit:5.5,speedJit:6,sparkRate:0},m:{stages:[[0,'#ff83ad']],ramp0:'#000000',ramp1:'#ffffff',ramp2:'#ffffff',ramp3:'#ffffff',headInt:5}},
      {id:'core',name:'短促金芯',base:'kiku',p:{seed:142,stars:85,duration:2.0,v0:50,vt:12,grav:.5,burn:1.15,burnJit:8,headSize:.3,headBright:.25,flash:.2,sparkRate:55,sparkLife:.3,sparkSize:.16,sparkSpread:.3,sparkGrav:.25,fade:.5},m:{stages:[[0,'#ffd274']],headInt:.7}}
    ]
  },
  V13: {
    name:'片贝四尺玉 · V13',duration:12.5,split:6.25,
    note:'视频校准第二版：小金芯 → 延迟彩芯 → 暗载体分批开金花 → 细密花雨。',
    layers:[
      {id:'flowers',name:'外圈金色子花',base:'senrin',p:{seed:133,stars:72,duration:12.5,v0:150,vt:37,grav:.6,subDelay:4.8,subJit:8,subStars:58,subSpeed:49,subBurn:5.7,subTail:175,carrierTail:0,carrierHead:0,subKeep:.55,subVt:25,subGrav:1.05,subScaleJit:18,subFlash:.06,burnJit:12,fade:.7,lastFlare:0,flash:0,headSize:.35,headBright:.15,filament:1,filamentLife:3.8,filamentHot:.62,filamentBody:.55,filamentWidth:.42,filamentJitter:.3,sparkLife:1.65,sparkRateEnd:.05,sparkSize:.38,sparkSpread:.36,sparkInherit:.06,sparkDrag:1.65,sparkGrav:.6,T0:2250,cooling:.45,sparkBright:1.3,dirJit:2,speedJit:9},m:{stages:[[0,'#fff3de'],[7,'#ffcf8c'],[10.5,'#f28e40']],xw:2,ramp1:'#ff9b19',ramp2:'#ffd641',ramp3:'#fff7c0',headInt:8}},
      {id:'core',name:'先行金色菊芯',base:'kiku',p:{seed:134,stars:125,duration:6.5,v0:105,vt:31,grav:.60,burn:4.7,burnJit:8,fade:.4,flash:.1,headSize:.35,headBright:.12,filament:1,filamentLife:3.5,filamentHot:.7,filamentBody:.24,filamentWidth:.32,filamentJitter:.25,sparkRate:250,sparkLife:1.5,sparkSize:.32,sparkSpread:.25,sparkInherit:.04,sparkGrav:.3,T0:2250,cooling:.3,lastFlare:0},m:{stages:[[0,'#fff4bf'],[1.8,'#ffcd93']],xw:1.2,ramp1:'#9b330d',ramp2:'#ffc376',ramp3:'#fff3c2',headInt:3.8}},
      ...[['pink','#ff389c',137],['blue','#777bff',139],['green','#85ffb3',140]].map(([id,color,seed])=>({id,name:'彩色小芯 · '+id,base:'senrin',p:{seed,stars:9,duration:6.2,v0:58,vt:23,grav:.6,subDelay:3.65,subJit:5,subStars:48,subSpeed:11,subBurn:1.65,subTail:0,carrierTail:0,carrierHead:0,subFlash:.05,subVt:14,subKeep:.6,flash:0,headSize:.72,headBright:1,fade:.55,lastFlare:0,burnJit:12,strobeHz:5,strobeDuty:.5,strobeStart:.7},m:{stages:[[0,color]],ramp1:'#ffffff',ramp2:'#ffffff',ramp3:'#ffffff',headInt:3}}))
    ]
  }
};
// Two actual atlas layers keep age/color independent. A one-channel grey ramp
// cannot distinguish a dim white edge pixel from an equally dim orange ember.
{
  const shell=STUDY_RECIPES.V14.layers[0];
  Object.assign(shell.p,{filamentBody:0,filamentWidth:1.55,filamentHotGrowth:.55});
  Object.assign(shell.m,{ramp1:'#ffffff',ramp2:'#ffffff',ramp3:'#ffffff',headInt:4});
  STUDY_RECIPES.V14.layers.splice(1,0,{id:'afterglow',name:'同轨迹暖色细长尾丝',base:'kiku',p:{...shell.p,filamentHotGain:0,filamentLife:8,filamentFollowBurn:1,filamentBody:1,filamentWidth:.8,headBright:0,flash:0,sparkBright:.55},m:{stages:[[0,'#ffe3c7'],[8,'#d9986b'],[10.3,'#743616']],xw:1.2,ramp1:'#ba9474',ramp2:'#cdb394',ramp3:'#f2dfc6',headInt:2.5}});
}
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
