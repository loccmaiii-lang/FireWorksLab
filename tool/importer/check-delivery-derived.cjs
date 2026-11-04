// 派生贴图复用与跨会话证明；所有原生调用均为隔离模拟。
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let state={},registry={},proofs={},reads=0;
const ctx={MAP:{dirs:{},naming:{},texture_examples:{flipbook:'/Template'},material_roles:{},dynamic_params:{defaults:[0,0,0,0],roles:{dissolve:2}}},MOD:{},
 makePlan:()=>({}),validate:()=>[],importEmitters:async()=>{},importOne:async()=>{},readPack:async()=>({}),
 selectionDependencies:()=>[],texturePolicy:p=>({maxSize:p.endsWith('_HD')?2048:1024}),guard:p=>assert(p.startsWith('/Game/')),
 loadLS:()=>JSON.parse(JSON.stringify(state)),saveLS:o=>{state=o;},selectedAssetEntries:it=>Object.entries(it.assets),
 pyStr:JSON.stringify,objPath:p=>p+'.'+p.split('/').pop(),texturePolicyErrors:()=>[],props:async()=>({}),
 tagged:(lines,t)=>lines.find(x=>x.startsWith(t)).slice(t.length),
 py:async code=>{
  reads++;
  if(code.includes('# FWL_DELIVERY_GATE'))return ['FWLDELIVERYGATE:'+JSON.stringify({ok:true,problems:[],registry:{ueProofs:registry}})];
  if(code.includes('# FWL_DERIVED_FIRST')){const entries=JSON.parse(code.match(/^entries = (.+)$/m)[1]);return ['FWLDERIVEDFIRST:'+JSON.stringify(entries.map(([key,pkg])=>({key,pkg,exists:!!proofs[pkg]?.exists,saved:!!proofs[pkg]?.diskHash,class:proofs[pkg]?.class||''})))];}
  const pkg=JSON.parse(code.match(/^pkg = (.+)$/m)[1]);return ['FWLFINGERPRINT:'+JSON.stringify(proofs[pkg]||{pkg,exists:false,class:'',diskHash:''})];
 }};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname+'/fireworks-compat.js','utf8')+'\n'+fs.readFileSync(__dirname+'/delivery-contract.js','utf8')+'\nthis.h={readPack,planTextureReuse,verifyTextureReuse,registerTextureFingerprints,writeAssetEntries};',ctx);
const pkg='/Game/Effects/Common/Texture/Fireworks/T_EFX_FireWorks_RiseTrail_L_Loop_16x1_01';
const item=derived=>({spec:{derived:derived?{from:'RiseTrail_L'}:undefined,textures:{seq:{class:'flipbook',file:'loop.png'}}},textureHashes:{seq:'a'.repeat(64)},assets:{'tex:seq':pkg}});
const saved=()=>({pkg,exists:true,class:'Texture2D',dirty:false,diskHash:'b'.repeat(64)});
(async()=>{
 const first=item(true);await ctx.h.planTextureReuse(first);assert.equal(ctx.h.writeAssetEntries(first).length,1);
 proofs[pkg]=saved();
 await assert.rejects(()=>ctx.h.planTextureReuse(item(true)),/目标已存在/);
 await ctx.h.registerTextureFingerprints(item(false),[['tex:seq',pkg]]);
 registry=state.textureFingerprints;state={};
 await ctx.h.readPack('D:/test/中文目录','cascade_mobile.json');
 const derived=item(true);await ctx.h.planTextureReuse(derived);assert.equal(ctx.h.writeAssetEntries(derived).length,0);await ctx.h.verifyTextureReuse(derived);
 proofs[pkg].diskHash='c'.repeat(64);await assert.rejects(()=>ctx.h.verifyTextureReuse(derived),/丢失或改变/);
 await assert.rejects(()=>ctx.h.planTextureReuse(item(true)),/目标已存在/);
 proofs[pkg]={...saved(),dirty:true};await assert.rejects(()=>ctx.h.planTextureReuse(item(true)),/目标已存在/);
 delete proofs[pkg];const recreated=item(true);await ctx.h.planTextureReuse(recreated);assert.equal(ctx.h.writeAssetEntries(recreated).length,1);
 console.log('派生复用检查通过：首次创建、未登记既有目标拦截、原序列登记、跨会话读回、零复用写入、磁盘改变/脏拒绝、真缺失可重建；模拟只读调用 '+reads+' 次。');
})().catch(e=>{console.error(e);process.exitCode=1;});
