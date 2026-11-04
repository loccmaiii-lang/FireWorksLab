const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let state={},proofs={},nativeCalls=0,passed=0;
const ctx={MAP:{naming:{},texture_examples:{flipbook:'/Template'},material_roles:{},dynamic_params:{defaults:[0,0,0,0],roles:{dissolve:2}}},
 selectionDependencies:()=>[],texturePolicy:p=>({maxSize:p.endsWith('_HD')?2048:1024}),guard:p=>{assert(p.startsWith('/Game/'));},
 loadLS:()=>JSON.parse(JSON.stringify(state)),saveLS:o=>{state=o;},selectedAssetEntries:it=>Object.entries(it.assets).filter(([k])=>!it.selectedAssetKeys||it.selectedAssetKeys.includes(k)),
 pyStr:JSON.stringify,objPath:p=>p+'.'+p.split('/').pop(),texturePolicyErrors:()=>[],props:async()=>({}),tagged:(lines,t)=>lines.find(x=>x.startsWith(t)).slice(t.length),
 py:async code=>{nativeCalls++;const pkg=JSON.parse(code.match(/^pkg = (.+)$/m)[1]);return ['FWLFINGERPRINT:'+JSON.stringify(proofs[pkg]||{pkg,exists:false,class:'',diskHash:''})];}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/fireworks-compat.js','utf8')+'\nthis.h={planTextureReuse,verifyTextureReuse,registerTextureFingerprints,collectPlannedTextures,textureReuseIdentity,writeAssetEntries};',ctx);
const clone=x=>JSON.parse(JSON.stringify(x));
const item=name=>({spec:{textures:{r:{class:'ramp',file:'r.png',hash:'0123456789abcdef12'}}},textureHashes:{r:'a'.repeat(64)},assets:{'tex:r':'/Game/T_'+name},selectedAssetKeys:['tex:r']});
const saved=pkg=>({pkg,exists:true,class:'Texture2D',dirty:false,diskHash:'b'.repeat(64)});
const check=async(n,f)=>{await f();console.log('PASS '+n);passed++;};
(async()=>{
 await check('登记仅在真实保存证据存在时成功',async()=>{const a=item('First');await assert.rejects(()=>ctx.h.registerTextureFingerprints(a,[['tex:r',a.assets['tex:r']]]),/登记/);assert.deepEqual(state,{});proofs[a.assets['tex:r']]=saved(a.assets['tex:r']);await ctx.h.registerTextureFingerprints(a,[['tex:r',a.assets['tex:r']]]);assert.equal(Object.keys(state.textureFingerprints).length,1);});
 await check('跨效果内容一致复用旧目标且不写入',async()=>{const b=item('Second');await ctx.h.planTextureReuse(b);assert.equal(b.assets['tex:r'],'/Game/T_First');assert.equal(ctx.h.writeAssetEntries(b).length,0);await ctx.h.verifyTextureReuse(b);});
 await check('复用后磁盘内容改变在执行前拒绝',async()=>{const b=item('Second');await ctx.h.planTextureReuse(b);proofs['/Game/T_First'].diskHash='c'.repeat(64);await assert.rejects(()=>ctx.h.verifyTextureReuse(b),/改变/);proofs['/Game/T_First']=saved('/Game/T_First');});
 await check('脏资产不作为复用来源',async()=>{proofs['/Game/T_First'].dirty=true;const b=item('Dirty');await ctx.h.planTextureReuse(b);assert.equal(b.assets['tex:r'],'/Game/T_Dirty');proofs['/Game/T_First'].dirty=false;});
 await check('已删除旧资产允许重新生成',async()=>{const old=proofs['/Game/T_First'];delete proofs['/Game/T_First'];const b=item('Missing');await ctx.h.planTextureReuse(b);assert.equal(b.assets['tex:r'],'/Game/T_Missing');proofs['/Game/T_First']=old;});
 await check('同短hash但SHA不同不得复用',async()=>{const b=item('Collision');b.textureHashes.r='c'.repeat(64);await ctx.h.planTextureReuse(b);assert.equal(b.assets['tex:r'],'/Game/T_Collision');});
 await check('HD/手游尺寸策略不同不得复用',async()=>{const b=item('Other_HD');await ctx.h.planTextureReuse(b);assert.equal(b.assets['tex:r'],'/Game/T_Other_HD');});
 await check('未勾选项不自动复用或写入',async()=>{const b=item('Unchecked');b.selectedAssetKeys=[];await ctx.h.planTextureReuse(b);assert.equal(Object.keys(b.textureReuse).length,0);assert.equal(ctx.h.writeAssetEntries(b).length,0);});
 await check('同批次先导入来源再复用，来源未保存则拒绝',async()=>{state={};proofs={};const planned=new Map(),a=item('Owner'),b=item('Borrower');await ctx.h.planTextureReuse(a,planned);ctx.h.collectPlannedTextures(a,planned,'rOwner');await ctx.h.planTextureReuse(b,planned);assert.equal(b.assets['tex:r'],'/Game/T_Owner');assert.equal(b.textureReuse['tex:r'].plannedOwner,'rOwner');await assert.rejects(()=>ctx.h.verifyTextureReuse(b),/丢失或改变/);proofs['/Game/T_Owner']=saved('/Game/T_Owner');await ctx.h.registerTextureFingerprints(a,[['tex:r','/Game/T_Owner']]);await ctx.h.verifyTextureReuse(b);});
 await check('同包多源键统一指向已保存复用目标',async()=>{const b=item('Multi');b.spec.textures.other=clone(b.spec.textures.r);b.textureHashes.other=b.textureHashes.r;b.assets['tex:other']=b.assets['tex:r'];b.selectedAssetKeys.push('tex:other');await ctx.h.planTextureReuse(b);assert.equal(b.assets['tex:r'],b.assets['tex:other']);assert.equal(ctx.h.writeAssetEntries(b).length,0);});
 console.log(passed+' texture reuse compatibility checks passed; native calls mocked '+nativeCalls);
})().catch(e=>{console.error(e);process.exitCode=1;});
