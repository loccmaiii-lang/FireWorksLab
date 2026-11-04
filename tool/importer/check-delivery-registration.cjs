// 收尾重试只允许读取原保存资产和写交付登记；所有接口均为隔离桩。
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const text=fs.readFileSync(__dirname+'/delivery-contract.js','utf8');
const source=text.slice(text.indexOf('  function deliveryRegistrationOnly'),text.indexOf('  // 同一资源的新修订'));
const paths={ps:'/Game/Effects_HD/Props_HD/FireWorks_HD/P_EFX_FireWorks_Fixture_HD','mat:m':'/Game/Effects_HD/Common_HD/MaterialInstance_HD/FireWorks_HD/MI_Fixture','tex:seq':'/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD/T_Fixture_HD'};
const ordered=o=>Array.isArray(o)?o.map(ordered):o&&typeof o==='object'?Object.fromEntries(Object.keys(o).sort().map(k=>[k,ordered(o[k])])):o;
function fixture(options={}){
 const r={state:'failed',dir:'D:/Fixture',as:'Fixture_01',assets:{...paths},excludedAssetKeys:[],importProgress:{stage:options.old?'粒子系统':'交付登记',saved:Object.values(paths),added:Object.values(paths),edited:[]},errs:[options.old?'UE Python出错：WindowsError: [Error 87]':'资产已保存；交付登记失败']};
 const calls=[],id='flipbook|sha256|'+'a'.repeat(64)+'|2048',proof={pkg:paths['tex:seq'],diskHash:options.native?require('node:crypto').createHash('sha256').update('fixture').digest('hex'):'b'.repeat(64)},store={textureFingerprints:{[id]:proof}};
 const c=vm.createContext({Set,JSON,phase:'',editor:'',storageOK:true,locked:()=>false,guard:()=>{},MAP:{tag:'source'},objPath:p=>p+'.'+p.split('/').pop(),
  loadLS:()=>store,selectedAssetEntries:i=>Object.entries(i.assets).filter(([k])=>i.selectedAssetKeys.includes(k)),textureReuseIdentity:()=>id,pyStr:s=>'u'+JSON.stringify(s),
  py:async code=>{calls.push('verify');assert(!/save_asset|set_editor_property|import_asset_tasks|check_out|create_asset/.test(code));if(options.changed)throw Error('Saved texture changed');
   if(options.native){
    const prefix=`# -*- coding: utf-8 -*-
import sys,os,json,io,types,__builtin__
class Name(object):
 def __init__(self,name): self.name=name
 def get_name(self): return self.name
class Obj(object):
 def __init__(self,pkg): self.pkg=pkg
 def get_class(self): return Name('Texture2D' if '/Texture_HD/' in self.pkg else 'ParticleSystem' if '/Props_HD/' in self.pkg else 'MaterialInstanceConstant')
unreal=types.ModuleType('unreal')
unreal.load_asset=lambda pkg: None if ${options.missing?'True':'False'} else Obj(pkg)
unreal.EditorLoadingAndSavingUtils=type('U',(),{'get_dirty_content_packages':staticmethod(lambda: [Name('${paths.ps}')] if ${options.dirty?'True':'False'} else [])})
unreal.EditorAssetLibrary=type('A',(),{'get_metadata_tag':staticmethod(lambda obj,key:'other' if ${options.badTag?'True':'False'} else 'fwl.cascade/1 Fixture -> Fixture_01')})
unreal.Paths=type('P',(),{'project_content_dir':staticmethod(lambda:'/fixture/')})
os.path.isfile=lambda p:True
os.path.getsize=lambda p:7
__builtin__.open=lambda p,mode:io.BytesIO(b'fixture')
`;
    const result=spawnSync('E:/loc_ma5/DFMEditor/Engine/Binaries/ThirdParty/Python/Win64/python.exe',['-'],{input:prefix+code,encoding:'utf8',windowsHide:true});
    if(result.error)throw result.error;if(result.status!==0)throw Error(result.stderr);
    return result.stdout.split(/\r?\n/).filter(Boolean);
   }
   return['FWLDELIVERYSAVED:ok'];},
  tagged:(lines,tag)=>lines.find(x=>x.startsWith(tag)).slice(tag.length),
  Workbench:{run:async(name,fn)=>fn()},endReadCache:()=>{},refresh:()=>{},say:()=>{},log:()=>{},persist:()=>!options.storageFail,
  readPack:async()=>{calls.push('source');if(options.staleRemote)store.textureFingerprints[id]={pkg:proof.pkg,diskHash:'c'.repeat(64)};return{spec:{name:'Fixture',source:{plan_sig:'fixture'}},textureHashes:{seq:'a'.repeat(64)}};},
  resolveImportNaming:()=>({}),namingFields:()=>({}),makePlan:()=>options.namingChanged?{...paths,ps:paths.ps+'Changed'}:paths,stableValue:ordered,rowSelectedKeys:x=>Object.keys(x.assets),validate:()=>[],
  deliveryGate:async(dir,register,proofs)=>{assert(register);calls.push('register');assert.equal(proofs[id].diskHash,proof.diskHash);if(options.registerFail)throw Error('登记不可用');},
 });vm.runInContext(source,c);return{r,c,calls,run:()=>c.retryDeliveryRegistration(r)};
}
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
 await test('新收尾故障和全量已保存的旧Error87都提供登记恢复',async()=>{for(const old of [false,true]){const f=fixture({old});assert(f.c.deliveryRegistrationOnly(f.r));}});
 await test('部分保存、普通导入失败或没有保存回执不提供捷径',async()=>{const f=fixture({old:true});f.r.importProgress.saved.pop();assert(!f.c.deliveryRegistrationOnly(f.r));f.r.importProgress.saved=Object.values(paths);f.r.errs=['普通导入失败'];assert(!f.c.deliveryRegistrationOnly(f.r));delete f.r.importProgress;assert(!f.c.deliveryRegistrationOnly(f.r));});
 await test('恢复严格为源复核→资产只读复核→登记，没有原生写入',async()=>{const f=fixture();await f.run();assert.deepEqual(f.calls,['source','verify','register']);assert.equal(f.r.state,'done');assert.equal(f.r.selected,false);assert.equal(f.r.importProgress,undefined);});
 await test('旧Error87可恢复，保存数量不作为新导入重复执行',async()=>{const f=fixture({old:true});await f.run();assert.equal(f.r.state,'done');assert.deepEqual(f.calls,['source','verify','register']);});
 await test('来源目标变化、磁盘变化、缺失原证明均不登记',async()=>{for(const options of [{namingChanged:true},{changed:true}]){const f=fixture(options);await f.run();assert.equal(f.r.state,'failed');assert(!f.calls.includes('register'));}const f=fixture();f.c.loadLS().textureFingerprints={};await f.run();assert.equal(f.r.state,'failed');assert(!f.calls.includes('register'));});
 await test('预检读到旧共享证明不盖掉经磁盘复核的本次保存证明',async()=>{const f=fixture({staleRemote:true});await f.run();assert.equal(f.r.state,'done');});
 await test('再次登记故障或本地存储故障保留失败回执可重试',async()=>{for(const options of [{registerFail:true},{storageFail:true}]){const f=fixture(options);await f.run();assert.equal(f.r.state,'failed');assert(f.r.importProgress.saved.length);assert(f.c.deliveryRegistrationOnly(f.r));}});
 await test('实际生成的复核Python在引擎2.7执行，哈希和来源验证通过',async()=>{const f=fixture({native:true});await f.run();assert.equal(f.r.state,'done');assert(f.calls.includes('register'));});
 await test('实际生成的复核Python拒绝未保存改动、缺失资产和来源变更',async()=>{for(const bad of ['dirty','missing','badTag']){const f=fixture({native:true,[bad]:true});await f.run();assert.equal(f.r.state,'failed');assert(!f.calls.includes('register'));}});
 console.log(passed+' registration recovery checks passed; UE writes 0.');
})().catch(e=>{console.error(e);process.exitCode=1;});
