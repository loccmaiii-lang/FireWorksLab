// 真实导出门禁：事件接收器可以自主Rate/Burst=0，失配源/空壳仍必须拦截。
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),ctx={console,Blob,crypto:require('node:crypto').webcrypto,TextEncoder,TextDecoder};vm.createContext(ctx);
for(const f of ['tool/shared/cascade_events.js','tool/src/js/63_gate.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const src={name:'Carrier',gpu:false,required:{},spawn:{rate:{const:0},bursts:[[0,4]]},modules:[{m:'EventGenerator',Events:[{Type:'EPET_Death',CustomName:'Bloom',Frequency:1,ParticleFrequency:1}]}]};
const recv={name:'Bloom',gpu:false,required:{},spawn:{rate:{const:0},bursts:[]},modules:[{m:'EventReceiverSpawn',EventGeneratorType:'EPET_Death',EventName:'Bloom',SpawnCount:{const:1},bUseParticleTime:false,bUsePSysLocation:false,bInheritVelocity:true,InheritVelocityScale:{const:[.35,.35,.35]}}]};
const spec={name:'Prism',platform:'pc',textures:{},materials:{},emitters:[src,recv]};
const check=s=>ctx.packGateConfig('cascade.json',s,'',{});
assert.equal(check(spec).length,0,'合法Death接收器不应被当成空壳');
for(const change of [x=>x.emitters[0].spawn.bursts=[],x=>x.emitters[0].enabled=false,x=>x.emitters[1].modules[0].EventName='Absent',x=>x.emitters[1].gpu=true]){
 const d=structuredClone(spec);change(d);assert(check(d).length>0,'非法/无源接收器必须拦截');
}
assert(check({platform:'pc',emitters:[{name:'Empty',spawn:{rate:{const:0},bursts:[]},modules:[]}]}).length>0);
console.log('PASS 事件接收器导出门禁及5种不应放行的情况');
// 正常ZIP里的组合说明也要保留事件与完整配方，不能还写“每层一张原点面片”。
const exportSrc=fs.readFileSync(path.join(root,'tool/src/js/60_export.js'),'utf8');
const description=exportSrc.slice(exportSrc.indexOf('function comboExportDescription('),exportSrc.indexOf('// 4.4.2 单层效果'));
ctx.EventInstances={on:L=>!!L.eventSpawn,config:L=>L.eventSpawn};ctx.VERSION='test';ctx.colorKeys=()=>[[0,[1,1,1]]];
vm.runInContext(description,ctx);
const layer={lib:'Bloom',scale:1,delay:0,rate:1,mirror:false,eventSpawn:{color:'random',count:4}},snap={kind:'combo',layers:[{P:{pattern:'saturn'},L:layer}]};
const desc=ctx.comboExportDescription({comboName:'Test',layers:[layer],entries:[{type:'botan'}],metadata:{recipe:snap}},[{b:{meta:{duration:2,Ww:40,Wh:40}}}]);
assert.equal(desc.recipe,snap,'ZIP组合说明必须带完整配方');
assert.equal(desc.layers[0].eventSpawn.count,4);
assert.equal(desc.layers[0].colorOverLife,null,'随机初色不能在说明中伪装成固定ColorOverLife');
console.log('PASS 事件ZIP组合说明保留完整配方及有效随机色口径');
