// 同名交付的归属与序列分张回归，不连接浏览器或 UE。
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const root=__dirname+'/../src/js/';
const context=vm.createContext({TextDecoder,TextEncoder,Blob,DataView,Uint8Array,crypto:require('crypto').webcrypto,utf8:s=>new TextEncoder().encode(s),FW_TEX_PREFIX:'T_EFX_FireWorks_'});
vm.runInContext(fs.readFileSync(root+'63_gate.js','utf8'),context);
const png={'PC/T_Test.png':{sha256:'new'}},known=new Map([['T_Test.png',{sha256:'old',resource:'Existing_D150',sourceKey:'rv:old'}]]);
assert.equal(context.packGateClash(png,known,'my:new','Existing_D150').length,0,'同一交付资源另存为个人配方后可迭代');
assert.equal(context.packGateClash(png,known,'my:new','Other_D150').length,1,'其他交付资源同名不同内容仍拦截');
assert.equal(context.packGateClash(png,known,'my:new').length,1,'归属未知时不能放宽');
assert.equal(context.packGateClash(png,known,'').length,1,'当前编辑器ID缺失也不能放宽');
assert.equal(context.packGateClash(png,known,'rv:old').length,0,'原来源继续兼容');
const naming=vm.createContext({});
const plan=fs.readFileSync(root+'31_plan40.js','utf8');vm.runInContext(plan.match(/^function bakeParts.*$/m)[0]+'\n'+plan.match(/^function bakeSegmentName.*$/m)[0]+'\n'+fs.readFileSync(root+'61_naming.js','utf8'),naming);
const part={meta:{L:{cols:4,rows:4}}};
const before={form:'segments',meta:part.meta,next:part},after={form:'master',meta:part.meta};
assert.equal(naming.namingSheets(before).length,2);
assert.equal(naming.namingSheets(after).length,1,'最新烘焙只含一张时不沿用旧02');
assert(!naming.namingSheets(after).some(s=>s[3]===2));
// 实际组合配置生成器只消费当前图层，不读旧修订清单。
const combo=vm.createContext({FWL_FORMAT:'fwl.cascade/1',VERSION:'test',comboLayerName:(n,i)=>n+'_L'+(i+1),comboLayerM:()=>({}),fwlMaster:(n,b)=>({textures:{seq:{file:n+'.png'}},materials:{main:{textures:{main:'seq'}}},emitters:[{name:'Main',material:'main',required:{duration_s:1,delay_s:0},modules:[]}],system:{preview_distance_cm:30000},notes:[]}),fwlFinish:x=>x,fwlPlanSig:()=>'',r4:x=>x,r1:x=>x});
vm.runInContext(fs.readFileSync(root+'67_fwlcombo.js','utf8'),combo);
const layer=i=>({i,L:{scale:1,rate:1},b:{form:'master',P:{type:'kiku'}}});
assert.equal(combo.fwlCombo('Effect',[layer(0),layer(1)]).emitters.length,2);
const removed=combo.fwlCombo('Effect',[layer(0)]);
assert.equal(removed.emitters.length,1);assert(!Object.keys(removed.textures).some(k=>k.startsWith('L2_')));
(async()=>{
 const cfg={format:'fwl.cascade/1',name:'PersonalRecipe',naming:{base:'Base',system:'Existing_D150'},textures:{main:{file:'T_Test.png',class:'flipbook'}},emitters:[{name:'Spark'}]};
 const files=[['cascade.json',new TextEncoder().encode(JSON.stringify(cfg))],['T_Test.png',new Uint8Array([1,2,3])]];
 await context.packFinalize(files,{known,sourceKey:'my:new'});
 cfg.naming.system='Other_D150';files[0][1]=new TextEncoder().encode(JSON.stringify(cfg));
 await assert.rejects(()=>context.packFinalize(files,{known,sourceKey:'my:new'}),/归属不同/);
 console.log('13 交付归属、配置归属提取、减分张与删图层检查通过。');
})().catch(e=>{console.error(e);process.exitCode=1;});
