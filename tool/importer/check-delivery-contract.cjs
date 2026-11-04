// 隔离验证目标目录、原生模块契约和旧 PC 计划，绝不连接 UE。
const assert=require('node:assert/strict');
const {loadBackend}=require('./import-backend.cjs');
const backend=loadBackend(async()=>{throw Error('测试禁止引擎请求');},()=>{}, {htmlFile:__dirname+'/../df-fireworks-delivery_locmai.html'});
const texture=(asset,kind='flipbook')=>({asset,file:asset+'.png',class:kind,cols:16,rows:1,sha256:'a'.repeat(64)});
const mobile={format:'fwl.cascade/1',platform:'mobile',tier:'M',name:'RiseTrail_S_M',naming:{base:'RiseTrail_S',asset_names:'textures[].asset'},textures:{seq:texture('T_EFX_FireWorks_RiseTrail_S_Loop_16x1_01'),ramp:texture('T_EFX_FireWorks_RiseTrail_L_R','ramp')},materials:{loop:{role:'flipbook_rgba',textures:{main:'seq',ramp:'ramp'}}},emitters:[{name:'RiseLoop',material:'loop',gpu:false,max_alive:1,required:{duration_s:3},modules:[]}]};
const pc={...mobile,platform:'pc',name:'RiseTrail_S',textures:{...mobile.textures,seq:texture('T_EFX_FireWorks_RiseTrail_S_Loop_16x1_01_HD')},emitters:[{name:'TrailFar',material:'loop',required:{screen_alignment:'Rectangle',local_space:true},modules:[{m:'OrientationAxisLock',flags:'EPAL_ROTATE_Z'}]}]};
const failures=[];let passed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){failures.push(name+': '+e.message);console.log('FAIL '+name+': '+e.message);}}
check('手机粒子直接使用配置 name',()=>assert.equal(backend.makePlan(mobile,'RiseTrail_S_M_01').ps,'/Game/Effects/Props/FireWorks/P_EFX_FireWorks_RiseTrail_S_M'));
check('手机材质目录与 PC 去 HD 命名',()=>assert.equal(backend.makePlan(mobile,'RiseTrail_S_M_01')['mat:loop'],'/Game/Effects/Common/MaterialInstance/Fireworks/MI_EFX_FireWorks_RiseTrail_S_Loop_01'));
check('手机序列与 Ramp 目录',()=>{const p=backend.makePlan(mobile,'RiseTrail_S_M_01');assert.equal(p['tex:seq'],'/Game/Effects/Common/Texture/Fireworks/'+mobile.textures.seq.asset);assert.equal(p['tex:ramp'],'/Game/Effects/Common/Texture/Ramp/'+mobile.textures.ramp.asset);});
check('原 PC 粒子与材质计划保持',()=>{const p=backend.makePlan(pc,'RiseTrail_S_01');assert.equal(p.ps,'/Game/Effects_HD/Props_HD/FireWorks_HD/P_EFX_FireWorks_RiseTrail_S_01_HD');assert.equal(p['mat:loop'],'/Game/Effects_HD/Common_HD/MaterialInstance_HD/FireWorks_HD/MI_EFX_FireWorks_RiseTrail_S_Loop_01_HD');});
check('轴锁模块识别并校验枚举',()=>{assert.equal(backend.MOD.OrientationAxisLock,'ParticleModuleOrientationAxisLock');assert.equal(backend.validate(pc).length,0);});
check('错误轴锁枚举在写入前拦截',()=>assert(backend.validate({...pc,emitters:[{...pc.emitters[0],modules:[{m:'OrientationAxisLock',flags:'UNKNOWN'}]}]}).some(x=>x.includes('锁轴'))));
const item={spec:mobile,assets:backend.makePlan(mobile,'RiseTrail_S_M_01'),textureHashes:{seq:'a'.repeat(64),ramp:'b'.repeat(64)}};
check('原效果序列成功后也能登记 SHA256',()=>assert.equal(backend.textureReuseIdentity(item,'tex:seq'),'flipbook|sha256|'+'a'.repeat(64)+'|1024'));
check('派生包与原效果序列使用同一内容指纹',()=>assert.equal(backend.textureReuseIdentity({...item,spec:{...mobile,derived:{from:'RiseTrail_S'}}},'tex:seq'),backend.textureReuseIdentity(item,'tex:seq')));
check('共用 Ramp 不受旧参数摘要影响',()=>assert.equal(backend.textureReuseIdentity(item,'tex:ramp'),backend.textureReuseIdentity({...item,spec:{...mobile,textures:{...mobile.textures,ramp:{...mobile.textures.ramp,hash:'c'.repeat(20)}}}},'tex:ramp')));
check('旧浏览器证明保留且可用内容指纹读取',()=>{const legacy='ramp|'+'c'.repeat(20)+'|'+'b'.repeat(64)+'|1024',proof={pkg:'/Game/Effects/Common/Texture/Ramp/T_EFX_FireWorks_Shared_R',diskHash:'d'.repeat(64)},r=backend.deliveryFingerprintProofs({[legacy]:proof});assert.deepEqual(r[legacy],proof);assert.deepEqual(r['ramp|sha256|'+'b'.repeat(64)+'|1024'],proof);});
check('共享登记优先于浏览器旧证明',()=>{const canonical='ramp|sha256|'+'b'.repeat(64)+'|1024',legacy='ramp|'+'c'.repeat(20)+'|'+'b'.repeat(64)+'|1024',fresh={pkg:'/Game/Effects/Common/Texture/Ramp/Fresh',diskHash:'d'.repeat(64)};assert.deepEqual(backend.deliveryMergedProofs({[canonical]:{pkg:'/Game/Stale',diskHash:'a'.repeat(64)}},{[legacy]:fresh})[canonical],fresh);});
console.log(passed+' PASS / '+failures.length+' FAIL');if(failures.length)process.exitCode=1;
