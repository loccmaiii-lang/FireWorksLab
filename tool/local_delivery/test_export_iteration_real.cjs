// 可选的真实历史包回归：只读取交付/存档/登记，内存改字节模拟新内容；不烘焙、不发布、不写 UE。
// node test_export_iteration_real.cjs <旧回执JSON> <我的配方JSON> <登记根目录>
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {webcrypto}=require('node:crypto');
const [receiptPath,recipePath,registryRoot]=process.argv.slice(2);
if(!receiptPath||!recipePath||!registryRoot){console.log('SKIP 真实包检查：需指定旧回执、配方和只读登记根目录');process.exit(0);}
const old=JSON.parse(fs.readFileSync(receiptPath,'utf8')),recipe=JSON.parse(fs.readFileSync(recipePath,'utf8'));
const dir=path.join(__dirname,'../src/js/'),system=recipe.ue.system||recipe.ue.base,prompts=[];
const files=old.files.map(f=>[f.path,new Uint8Array(fs.readFileSync(path.join(path.dirname(receiptPath),f.path)))]);
let changed=0;
for(const row of files){
 if(/cascade(_mobile)?\.json$/.test(row[0])){const j=JSON.parse(new TextDecoder().decode(row[1]));j.name=system+(/_mobile/.test(row[0])?'_'+j.tier:'');j.naming={...j.naming,system};row[1]=new TextEncoder().encode(JSON.stringify(j));}
 else if(/(?:_Main_|_Glitter_).*\.png$/.test(row[0])&&!/_R\.png$/.test(row[0])){const bytes=new Uint8Array(row[1].length+1);bytes.set(row[1]);bytes[bytes.length-1]=1;row[1]=bytes;changed++;}
}
const ctx=vm.createContext({resources:[old],TextDecoder,TextEncoder,Blob,DataView,Uint8Array,Uint32Array,structuredClone,crypto:webcrypto,
 FW_TEX_PREFIX:'T_EFX_FireWorks_',busyJob:{req:false},askConfirm:async(...a)=>{prompts.push(a);return true;}});
vm.runInContext(fs.readFileSync(dir+'60_export.js','utf8')+'\n'+fs.readFileSync(dir+'63_gate.js','utf8'),ctx);
const delivery=fs.readFileSync(dir+'67_delivery.js','utf8');
vm.runInContext(delivery.match(/^  function knownTextures.*$/m)[0],ctx);
ctx.DeliveryWorkspace={knownTextures:()=>ctx.knownTextures()};ctx.packTidy=async files=>({files,report:{}});
(async()=>{
 const job=Object.freeze({key:recipe.key,system,metadata:{recipe:recipe.snap}});
 await assert.rejects(()=>ctx.packFinalize(files,{sourceKey:job.key,resourceName:system}),/归属不同/);
 const blob=await ctx.makeZip(files,job);assert.equal(prompts.length,1);
 const proof=vm.runInContext('packIterationInfo',ctx).get(blob);assert(proof);assert(!proof.assets.some(a=>a.file.includes('FrameTest')));
 const payload={zip:Buffer.from(await blob.arrayBuffer()).toString('base64'),root:registryRoot,receipt:{name:system,metadata:{sourceKey:recipe.key,iterationOf:proof}}};
 const python=[
  'import sys,json,base64,io,zipfile,unittest.mock as mock',
  'sys.path.insert(0,sys.argv[1]); import fx_gate',
  'p=json.load(sys.stdin)',
  'z=zipfile.ZipFile(io.BytesIO(base64.b64decode(p["zip"])))',
  'files={f:z.read(f) for f in z.namelist()}',
  'files["workspace-resource.json"]=json.dumps(p["receipt"]).encode("utf-8")',
  'with mock.patch.object(fx_gate,"read_package",return_value=files): result=fx_gate.check("memory-fixture",p["root"])',
  'assert result["ok"],result["problems"]',
  'files.pop("workspace-resource.json")',
  'with mock.patch.object(fx_gate,"read_package",return_value=files): zipped=fx_gate.check("memory-fixture",p["root"])',
  'assert zipped["ok"],zipped["problems"]',
  'files.pop("workspace-export.json")',
  'p["receipt"]["metadata"].pop("iterationOf")',
  'files["workspace-resource.json"]=json.dumps(p["receipt"]).encode("utf-8")',
  'with mock.patch.object(fx_gate,"read_package",return_value=files): blocked=fx_gate.check("memory-fixture",p["root"])',
  'assert not blocked["ok"],"去掉确认后仍须拒绝"',
  'print(json.dumps({"ok":True,"configs":result["configs"],"textures":len(result["textures"]),"directZIPPassed":True,"withoutApprovalBlocked":True},ensure_ascii=False))'
 ].join('\n');
 const r=cp.spawnSync('python',['-B','-X','utf8','-c',python,__dirname],{input:JSON.stringify(payload),encoding:'utf8',maxBuffer:2*1024*1024});
 assert.equal(r.status,0,r.stderr||r.stdout);
 console.log(JSON.stringify({kind:'ownership-contract-fixture-only',oldResource:old.name,oldSource:old.metadata.sourceKey,newResource:system,newSource:recipe.key,modifiedPNG:changed,approvedAssets:proof.assets.length,check:JSON.parse(r.stdout)},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
