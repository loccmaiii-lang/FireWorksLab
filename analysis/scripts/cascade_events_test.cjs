// 通用事件合同回归：0频率来自原生资产，错误输入必须在UE写入前被拒绝。
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const sandbox={module:{exports:{}}};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../../tool/shared/cascade_events.js'),'utf8'),sandbox);
const {cascadeEventErrors,cascadeEventText}=sandbox;
const clone=x=>JSON.parse(JSON.stringify(x));
const s={emitters:[{name:'Carrier',gpu:false,modules:[{m:'EventGenerator',Events:[{Type:'EPET_Death',CustomName:'BloomA',Frequency:0,ParticleFrequency:0}]}]},
 {name:'Bloom',gpu:false,modules:[{m:'EventReceiverSpawn',EventGeneratorType:'EPET_Death',EventName:'BloomA',SpawnCount:{const:1},bUseParticleTime:false,bUsePSysLocation:false,bInheritVelocity:true,InheritVelocityScale:{const:[.35,.35,.35]}}]}]};
assert.equal(cascadeEventErrors(s).length,0);
assert(cascadeEventText(s.emitters[0].modules[0].Events).includes('Frequency=0'));
for(const mutate of [x=>x.emitters[0].gpu=true,
 x=>x.emitters[0].modules.push(clone(x.emitters[0].modules[0])),
 x=>x.emitters[1].modules[0].EventName='Absent',
 x=>x.emitters[1].modules[0].bUsePSysLocation='false',
 x=>x.emitters[1].modules[0].InheritVelocityScale={const:[1,2]},
 x=>x.emitters[0].modules[0].Events[0].CustomName='bad"name']){
 const bad=clone(s);mutate(bad);assert(cascadeEventErrors(bad).length);
}
console.log('PASS Cascade事件合同：原生0频率和6类非法输入');
