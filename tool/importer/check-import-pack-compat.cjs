const assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {loadBackend}=require('./import-backend.cjs');
const harness=String.raw`import sys,json,io,posixpath,types,contextlib
data=json.load(sys.stdin)
files={k:bytes.fromhex(v) for k,v in data['files'].items()}
dirs={'/pack','/pack/child'}
path=types.SimpleNamespace(abspath=posixpath.abspath,realpath=posixpath.abspath,join=posixpath.join,isabs=posixpath.isabs,isdir=lambda p:p in dirs,isfile=lambda p:p in files)
os=types.SimpleNamespace(path=path,sep='/',listdir=lambda p:sorted(set(k[len(p)+1:].split('/')[0] for k in files if k.startswith(p+'/'))))
def open_file(p,mode='r',encoding=None):
 if p not in files:raise IOError('File not found')
 return io.BytesIO(files[p]) if 'b' in mode else io.StringIO(files[p].decode(encoding or 'utf-8'))
env={'os':os,'io':types.SimpleNamespace(open=open_file),'json':json,'basestring':str,'open':open_file}
out=io.StringIO()
code=data['code'].replace('import unreal, sys, io, os, json\n','')
with contextlib.redirect_stdout(out):exec(code,env)
print(json.dumps(out.getvalue().strip()))
`;
let files={},calls=0;
const b=loadBackend(async(route,payload)=>{
 assert.equal(route,'/object/call');assert.equal(payload.function,'ExecutePythonCommandEx');calls++;
 const p=spawnSync('python',['-c',harness],{input:JSON.stringify({code:payload.args.PythonCommand,files:Object.fromEntries(Object.entries(files).map(([k,v])=>[k,Buffer.from(v).toString('hex')]))}),encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);const line=JSON.parse(p.stdout.trim());return {data:{return_value:'True',out_LogOutput:'Output='+JSON.stringify(line)}};
});
const crc32=buf=>{let c=0xffffffff;for(const x of buf){c^=x;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
const fingerprint=buf=>{let fnv=2166136261;for(const x of buf)fnv=Math.imul(fnv^x,16777619)>>>0;return crc32(buf).toString(16).padStart(8,'0')+fnv.toString(16).padStart(8,'0')+buf.length.toString(16);};
const image=Buffer.from([137,80,78,71,0,255,128,1,23,45]),spec={format:'fwl.cascade/1',textures:{r:{class:'ramp',file:'r.png',hash:fingerprint(image)}}};
const reset=()=>files={'/pack/cascade.json':JSON.stringify(spec),'/pack/cascade_mobile.json':JSON.stringify({...spec,platform:'mobile'}),'/pack/r.png':image};
let passed=0;const check=async(name,fn)=>{reset();await fn();passed++;console.log('PASS '+name);};
(async()=>{
 await check('实际Python读取并核验导出指纹和SHA',async()=>{const r=await b.readPack('/pack');assert.equal(r.textureHashes.r,crypto.createHash('sha256').update(image).digest('hex'));assert.equal(r.configFile,'cascade.json');});
 await check('手机读取指定主包',async()=>{const r=await b.readPack('/pack','cascade_mobile.json');assert.equal(r.spec.platform,'mobile');assert.equal(r.configFile,'cascade_mobile.json');});
 await check('未选配置不会作为回退',async()=>{delete files['/pack/cascade_mobile.json'];await assert.rejects(b.readPack('/pack','cascade_mobile.json'),/cascade_mobile\.json/);});
 await check('配置子目录候选遵循选定文件',async()=>{delete files['/pack/cascade_mobile.json'];files['/pack/child/cascade_mobile.json']='{}';try{await b.readPack('/pack','cascade_mobile.json');assert.fail();}catch(e){assert.deepEqual(Array.from(e.packDiagnostic.candidates),['/pack/child']);}});
 await check('extras不要求图片存在',async()=>{files['/pack/cascade.json']=JSON.stringify({...spec,extras:{color:{file:'missing.png'}}});assert.equal((await b.readPack('/pack')).exists.r,true);});
 await check('同弱指纹但修改内容拒绝',async()=>{files['/pack/r.png']=Buffer.from('changed');await assert.rejects(b.readPack('/pack'),/fingerprint mismatch/);});
 await check('没有旧版hash仍记录强SHA',async()=>{const s=JSON.parse(JSON.stringify(spec));delete s.textures.r.hash;files['/pack/cascade.json']=JSON.stringify(s);assert.equal((await b.readPack('/pack')).textureHashes.r.length,64);});
 for(const file of ['../outside.png','/outside.png','C:/outside.png','bad\u0000.png'])await check('非法文件路径拒绝 '+JSON.stringify(file),async()=>{files['/pack/cascade.json']=JSON.stringify({textures:{r:{class:'ramp',file}}});await assert.rejects(b.readPack('/pack'),/path|escapes package directory/i);});
 await check('缺少素材交给预览明确检查',async()=>{delete files['/pack/r.png'];assert.equal((await b.readPack('/pack')).exists.r,false);});
 await check('旧低端包在引擎调用之前拒绝',async()=>{const n=calls;await assert.rejects(b.readPack('/pack','cascade_low.json'),/仅支持/);assert.equal(calls,n);});
 console.log(passed+' actual Python pack checks passed; zero disk writes or native calls');
})().catch(e=>{console.error(e);process.exitCode=1;});
