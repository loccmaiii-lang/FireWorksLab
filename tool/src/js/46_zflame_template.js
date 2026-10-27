/* 一个可直接使用的持续燃烧起点；所有形态参数均由通用模型消费。 */
{
 const e=structuredClone(GRAPH_TEMPLATES.sgBlank.graph.emitters[0]);
 Object.assign(e,{id:'f01',name:'01｜燃烧火舌',seed:43729,count:75,shape:'flame',
   extent:.3,sourceScale:[1,.6,0],sourceOffset:[0,0,0],
   directionMode:'cone',direction:[0,0,1],cone:12,speed:[.6,1.4,1.2],life:[.45,1.15,1.1],
   width:.34,size:[.65,1.4,1.3],power:[.6,1.3,1],gain:.9,drag:.6,gravity:[0,0,1.2],
   clusterProbability:0,burstShare:0,noise:0,fieldCoupling:1,
   sizeCurve:[[0,.75],[.2,1],[.7,.8],[1,.25]],brightCurve:[[0,.3],[.15,1],[.65,.7],[1,0]],
   ...Object.fromEntries(Object.entries(FlameVolume.defaults).filter(([k])=>k.startsWith('flame'))),flameWarp:.16,flameScale:.2,flameTip:.12,flameDensity:6,flameSteps:48});
 const graph={...structuredClone(GRAPH_TEMPLATES.sgBlank.graph),name:'地面循环火焰',presetKey:'flame',
   period:64/30,spaceScale:1,bounds:[-.8,.8,-.12,1.6],bursts:[],followAxis:false,emitters:[e],
   fieldEnabled:1,fieldResponse:8,fieldStart:0,fieldRamp:.12,fieldAxisX:0,fieldAxisY:0,fieldAxisZ:1,
   fieldWindX:.12,fieldWindY:0,fieldWindZ:1.1,fieldConverge:0,fieldTurbulence:1.4,fieldScale:.8,fieldCycles:1,fieldSeed:73};
 const p={...GRAPH_TYPE_P,cameraMotion:0,cameraDof:0,qSS:1,shutter:0,exposure:1},
   m={...GRAPH_TYPE_M,ramp0:'#170000',ramp1:'#e63302',ramp2:'#ffb82b',ramp3:'#fff5c6'};
 GRAPH_TEMPLATES.sgFlame={p,m,graph};
 TYPES.sgFlame={p:{...TYPES.sparkgraph.p,...p,sparkGraph:graph,loopT:graph.period,duration:graph.period},m:{...TYPES.sparkgraph.m,...m}};
}
