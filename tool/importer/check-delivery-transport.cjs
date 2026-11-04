// 运行实际生成的 Python；UE 模块、资产和正式登记均不参与。
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const engine='E:/loc_ma5/DFMEditor/Engine/Binaries/ThirdParty/Python/Win64/python.exe';
const source=fs.readFileSync(__dirname+'/delivery-contract.js','utf8');
const pyStr=s=>'u"'+String(s).replace(/\\/g,'/').replace(/"/g,'\\"').replace(/[\u0080-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'))+'"';
function native(code,prefix){
  const r=spawnSync(engine,['-'],{input:'# -*- coding: utf-8 -*-\nimport sys,os,json,base64\n'+prefix+'\n'+code,encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});
  if(r.error)throw r.error;
  assert.equal(r.status,0,r.stderr);
  return r.stdout.split(/\r?\n/).filter(Boolean);
}
const capture=`import types
subprocess=types.ModuleType('subprocess')
subprocess.PIPE=-1
class Process(object):
 returncode=0
 def __init__(self,command,**kwargs):
  self.command=command;self.kwargs=kwargs
 def communicate(self,payload=None):
  print('CAPTURE:'+json.dumps({'command':self.command,'stdin':payload.decode('utf-8') if payload else '', 'piped':self.kwargs.get('stdin')==-1}))
  return ('{"ok":true}', '')
subprocess.Popen=Process
sys.modules['subprocess']=subprocess
`;
const gateSource=source.slice(source.indexOf('  function deliveryBase64'),source.indexOf('  readPack=async'));
function context(py){return vm.createContext({pyStr,py,JSON,unescape,encodeURIComponent,tagged:(lines,tag)=>lines.find(x=>x.startsWith(tag)).slice(tag.length)});}
let passed=0;
async function test(name,run){await run();passed++;console.log('PASS '+name);}
(async()=>{
 const proofs=Object.fromEntries(Array.from({length:2000},(_,i)=>['flipbook|sha256|'+i.toString(16).padStart(64,'0')+'|2048',{pkg:'/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD/Fixture_'+i,diskHash:'a'.repeat(64),note:'中文引号"反斜杠\\换行\n'}]));
 assert(JSON.stringify(proofs).length>32767);
 await test('旧式超长命令在真实Windows CreateProcess中复现87/206，子程序只做pass',async()=>{
  const asciiProofs=JSON.stringify(proofs).replace(/[^\x00-\x7f]/g,'x');
  const legacy=`import subprocess\ncommand=[u"C:/Users/locmai/AppData/Local/Programs/Python/Python312/python.exe",u"-c",u"pass",${pyStr(asciiProofs)}]\ntry:\n p=subprocess.Popen(command,stdout=subprocess.PIPE,stderr=subprocess.PIPE,creationflags=0x08000000)\n p.communicate()\n raise AssertionError('oversized command unexpectedly started')\nexcept WindowsError as error:\n print('WINDOWS_LIMIT:'+str(error.winerror))\n`;
  const lines=native(legacy,'');assert(lines.some(x=>/^WINDOWS_LIMIT:(87|206)$/.test(x)),lines.join('\n'));
 });
 let lastCode,actual;
 const c=context(async code=>{lastCode=code;const lines=native(code,capture);actual=JSON.parse(lines.find(x=>x.startsWith('CAPTURE:')).slice(8));return lines;});
 vm.runInContext(gateSource,c);
 await test('累计2000条证明不进入Windows命令行，stdin逐字节保留中文与转义',async()=>{
  await c.deliveryGate('D:/Fixture/中文 目录',true,proofs);
  assert(actual.command.includes('--proofs-stdin'),'缺少stdin协议，仍会超过Windows命令行上限');
  assert(!actual.command.includes('--proofs'));
  assert(actual.command.join(' ').length<1000);
  assert.equal(actual.piped,true);
  assert.equal(actual.stdin,JSON.stringify(proofs));
 });
 await test('预检不发送登记证明',async()=>{
  await c.deliveryGate('D:/Fixture/中文 目录');
  assert(!actual.command.includes('--register'));assert(!actual.command.includes('--proofs-stdin'));assert.equal(actual.stdin,'');
 });
 await test('引擎Python2.7实际启动Python3.12传入超长JSON',async()=>{
  const echo="import sys,json,hashlib; data=sys.stdin.buffer.read(); obj=json.loads(data); print(json.dumps({'ok':True,'count':len(obj),'hash':hashlib.sha256(data).hexdigest()}))";
  const prefix=`import subprocess\nreal_popen=subprocess.Popen\ndef bridge(command,**kwargs):\n return real_popen([command[0],'-c',${JSON.stringify(echo)}],**kwargs)\nsubprocess.Popen=bridge\n`;
  let output;
  const real=context(async code=>{output=native(code,prefix);return output;});vm.runInContext(gateSource,real);
  const result=await real.deliveryGate('D:/Fixture/中文 目录',true,proofs);
  assert.equal(result.count,2000);assert.equal(result.hash,require('node:crypto').createHash('sha256').update(JSON.stringify(proofs)).digest('hex'));
 });
 const wrapper=source.slice(source.indexOf('  const deliveryImportOriginal=importOne;'),source.indexOf('  // 同一资源的新修订'));
 function flow(failure){
  const calls=[],item={dir:'D:/Fixture',as:'Fixture_01',spec:{},assets:{},importProgress:{stage:'粒子系统',saved:['t','m','p'],added:['t','m','p'],edited:[]}};
  const ctx=vm.createContext({loadLS:()=>({textureFingerprints:{}}),log:(msg)=>calls.push(msg),deliveryFirstTextureTargets:async()=>[],readTextureProof:async()=>null,
   deliveryGate:async(dir,register)=>{calls.push(register?'register':'precheck');if(failure===(register?'register':'precheck'))throw Error('模拟故障');return{ok:true};},
   importOne:async()=>{calls.push('native');if(failure==='native')throw Error('原生保存失败');return{saved:3};}});
  vm.runInContext(wrapper,ctx);return{calls,item,run:()=>ctx.importOne(item)};
 }
 await test('预检失败时原生写入与登记均未开始',async()=>{const f=flow('precheck');await assert.rejects(f.run(),/模拟故障/);assert.deepEqual(f.calls,['precheck']);});
 await test('原生写入失败不会登记',async()=>{const f=flow('native');await assert.rejects(f.run(),/原生保存失败/);assert.deepEqual(f.calls,['precheck','native']);});
 await test('登记失败带真实保存计数与正确阶段，不重导或误报粒子未完成',async()=>{
  const f=flow('register');await assert.rejects(f.run(),e=>{assert.equal(e.importProgress?.stage,'交付登记');assert.equal(e.assetsCommitted,true);assert.equal(e.importProgress.saved.length,3);assert.match(e.message,/资产已保存/);return true;});
  assert.deepEqual(f.calls,['precheck','native','register']);
 });
 await test('登记成功后才报告交付完成',async()=>{const f=flow();await f.run();assert.deepEqual(f.calls.slice(0,3),['precheck','native','register']);assert(f.calls.at(-1).includes('交付登记完成'));});
 console.log(passed+' PASS / 0 FAIL');
})().catch(e=>{console.error(e);process.exitCode=1;});
