// Historical data is explicit test input, never included by build.py.
const samples=require('./show-template-samples.json');
const keys={FanGold:'gold',FanSilver:'silver',FanComet:'comet',GoldSpark:'goldspark',GoldCrackle:'goldcrackle',GreenPeony:'greenpeony'};
const clone=value=>JSON.parse(JSON.stringify(value));
function state(patch){
 if(patch?.version===1)return clone(patch);
 const fan=samples.subtemplates.FanComet;
 const spread=Math.max(...fan.Entries.map(e=>Math.abs(e.RotationOffset.Roll)))*2;
 const resource={profile:'comet',count:5,spread:68,layout:'custom',angleRatios:fan.Entries.map(e=>e.RotationOffset.Roll/spread*2).join(', '),sizeLayout:'custom',sizeRatios:fan.Entries.map(e=>e.EffectScale.X).join(', '),order:'lr',interval:.08,start:0,scale:1,sizeJitter:3,heightJitter:4,angleJitter:1,seed:7341};
 const template={profile:'goldspark',count:8,spread:80,layout:'uniform',order:'out',interval:.18,start:0,scale:1,sizeJitter:3,heightJitter:4,angleJitter:1,seed:7341};
 const sequence={profile:'goldspark',category:'large',flight:8,maximumHeight:400,baseHeight:400,start:0,roll:0,scale:1,sizeJitter:3,angleJitter:1,heightJitter:0,seed:7341,applyHeightScale:false,stages:samples.subtemplates.GoldSpark.Entries.map((entry,i)=>({role:i===0?'launch':'burst',entry:{...clone(entry),RandomRotationRange:{Pitch:0,Yaw:0,Roll:0},RandomPositionRange:{X:0,Y:0,Z:0},RandomScaleRatio:0},extraDelay:0}))};
 return {version:2,mode:'resource',shape:'fan',sequence,catalog:Object.keys(keys).map(name=>({source:clone(samples.subtemplates[name]),localOnly:false})),exportNames:{},configs:{resource,template},view:{},...clone(patch||{})};
}
module.exports={samples,keys,state};
