// 实际导出入口的同名迭代回归；只用内存文件，不连接浏览器、交付服务或 UE。
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const dir=__dirname+'/../src/js/';
const text=s=>new TextEncoder().encode(JSON.stringify(s));
const png=n=>{const u=new Uint8Array(25);u.set([137,80,78,71]);new DataView(u.buffer).setUint32(16,4);new DataView(u.buffer).setUint32(20,4);u[24]=n;return u;};
const file='T_EFX_FireWorks_GlitterChry_Main_4x4_01_HD.png';
async function unzip(blob){const u=new Uint8Array(await blob.arrayBuffer()),dv=new DataView(u.buffer),files={};let i=0;while(dv.getUint32(i,true)===0x04034b50){assert.equal(dv.getUint16(i+8,true),0,'实际ZIP路径使用store');const n=dv.getUint16(i+26,true),x=dv.getUint16(i+28,true),len=dv.getUint32(i+18,true),name=new TextDecoder().decode(u.slice(i+30,i+30+n)),start=i+30+n+x;files[name]=u.slice(start,start+len);i=start+len;}return files;}
const cfg=()=>({format:'fwl.cascade/1',name:'GlitterChry',naming:{base:'GlitterChry',system:'GlitterChry'},textures:{seq:{file,class:'flipbook'}},emitters:[{name:'Main'}]});
function fixture({answer=true,standard=false,changed=false}={}){
 const prompts=[],published=[];let source='my:goldB';
 const owner={sha256:'old-sha',resource:'GlitterChry_D150',sourceKey:'rv:QA20'};
 const known=new Map([[file,owner]]);
 const ctx=vm.createContext({TextDecoder,TextEncoder,Blob,DataView,Uint8Array,Uint32Array,crypto:webcrypto,structuredClone,FW_TEX_PREFIX:'T_EFX_FireWorks_',
  DeliveryWorkspace:{knownTextures:()=>known,publish:async(blob,name,metadata)=>published.push({blob,name,metadata})},
  wbKey:()=>source,busyJob:{req:false},askConfirm:async(...args)=>{prompts.push(args);source='my:other';if(changed)owner.sha256='changed-during-dialog';return answer;}});
 vm.runInContext(fs.readFileSync(dir+'60_export.js','utf8')+'\n'+fs.readFileSync(dir+'63_gate.js','utf8'),ctx);
 ctx.packTidy=async files=>({files,report:{}});
 const delivery=fs.readFileSync(dir+'67_delivery.js','utf8'),start=delivery.indexOf('async function deliverResource(');vm.runInContext(delivery.slice(start,delivery.indexOf('\n}',start)+2),ctx);
 const j=cfg();if(standard)j.textures.seq.asset='invalid-name';
 const files=[['cascade.json',text(j)],[file,png(1)]];
 const job=Object.freeze({key:'my:goldB',system:'GlitterChry',metadata:{sourceKey:'my:goldB',recipe:{name:'金曜菊-B'}}});
 return{ctx,files,job,prompts,published,known,owner};
}
(async()=>{
 {
  const f=fixture();await assert.rejects(()=>f.ctx.packFinalize(f.files,{known:f.known,sourceKey:f.job.key}),/归属不同/);
  const z=await f.ctx.makeZip(f.files,f.job);assert.equal(f.prompts.length,1,'真正的跨来源同名冲突要有可执行的迭代入口');
  const zipFiles=await unzip(z),zipMeta=JSON.parse(new TextDecoder().decode(zipFiles['workspace-export.json']));
  assert.equal(zipMeta.sourceKey,'my:goldB');assert.equal(zipMeta.iterationOf.assets[0].file,file,'直接下载ZIP也带同一证据');
  assert.match(f.prompts[0].join('\n'),/GlitterChry_D150/);assert.match(f.prompts[0].join('\n'),/GlitterChry/);assert.match(f.prompts[0].join('\n'),/UE/);
  await f.ctx.deliverResource(z,'GlitterChry.zip',{sourceKey:f.job.key},'directory');
  const m=f.published[0].metadata;assert.equal(m.sourceKey,'my:goldB');assert.equal(m.iterationOf.sourceKey,'my:goldB','切换界面不转移授权');
  assert.equal(m.iterationOf.resourceName,'GlitterChry');assert.equal(m.iterationOf.assets[0].file,file);
  assert.equal(m.iterationOf.assets[0].before,'old-sha');assert.equal(m.iterationOf.assets[0].sourceKey,'rv:QA20');
  assert.equal(m.iterationOf.assets[0].resource,'GlitterChry_D150');assert.match(m.iterationOf.assets[0].after,/^[a-f0-9]{64}$/);
  assert(!Object.hasOwn(f.job,'iterationOf'),'不修改冻结的导出快照');
  await assert.rejects(()=>f.ctx.packFinalize(f.files,{known:f.known,sourceKey:f.job.key}),/归属不同/,'授权不跨导出复用');
  // 只有发布成功的回执才提供延续证据：连续导出、还没导入 UE 时，也能核对旧登记。
  f.known.set(file,{sha256:m.iterationOf.assets[0].after,resource:'GlitterChry',sourceKey:f.job.key,iterationOf:m.iterationOf});
  f.files[1][1]=png(3);const z2=await f.ctx.makeZip(f.files,f.job);assert.equal(f.prompts.length,1,'已发布同源迭代不重复询问');
  await f.ctx.deliverResource(z2,'GlitterChry.zip',{sourceKey:f.job.key},'directory');
  const second=f.published[1].metadata.iterationOf.assets[0];assert.equal(second.before,'old-sha');assert.equal(second.sourceKey,'rv:QA20');
  assert.notEqual(second.after,m.iterationOf.assets[0].after,'旧UE登记的确认链随新内容推进');
  assert.equal(f.published[1].metadata.iterationOf.deliveryName,'GlitterChry');
  f.known.set(file,{sha256:second.after,resource:'GlitterChry',sourceKey:f.job.key,iterationOf:f.published[1].metadata.iterationOf});
  const copy=Object.freeze({...f.job,key:'my:copy'});f.files[1][1]=png(4);
  const z3=await f.ctx.makeZip(f.files,copy);await f.ctx.deliverResource(z3,'GlitterChry_V1-V3.zip',{sourceKey:copy.key},'directory');
  const third=f.published[2].metadata.iterationOf;assert.equal(f.prompts.length,2,'另存为仍须明确确认，不按名字猜');
  assert(third.assets.some(a=>a.sourceKey==='rv:QA20'&&a.before==='old-sha'),'连续另存为仍保留最早UE登记的确认链');
  assert.equal(third.deliveryName,'GlitterChry_V1-V3','交付容器名与粒子名分别记录');
 }
 {
  const f=fixture({answer:false});await assert.rejects(()=>f.ctx.makeZip(f.files,f.job),/取消/);assert.equal(f.published.length,0);
 }
 {
  const f=fixture({standard:true});await assert.rejects(()=>f.ctx.makeZip(f.files,f.job),/不合命名规范/);assert.equal(f.prompts.length,0,'规范错误不能被同名迭代确认绕过');
 }
 {
  const f=fixture({changed:true});await assert.rejects(()=>f.ctx.makeZip(f.files,f.job),/归属不同/);assert.equal(f.prompts.length,1,'旧资源变化后拒绝，不循环追问或自动放宽');
 }
 {
  const f=fixture();f.owner.sourceKey=f.job.key;const z=await f.ctx.makeZip(f.files,f.job);assert.equal(f.prompts.length,0,'同一来源正常重导不额外询问');
  const meta=JSON.parse(new TextDecoder().decode((await unzip(z))['workspace-export.json']));assert.equal(meta.sourceKey,f.job.key);assert(!meta.iterationOf);
 }
 {
  const f=fixture();f.owner.resource='GlitterChry';await assert.rejects(()=>f.ctx.packFinalize(f.files,{known:f.known,sourceKey:f.job.key}),/归属不同/,'名称相同不能代替来源或迭代证据');
 }
 {
  const f=fixture();const debug='_检查/T_EFX_FireWorks_GlitterChry_Main_4x4_01_FrameTest.png';
  f.owner.sourceKey=f.job.key;f.known.set(debug.split('/').at(-1),{...f.owner,sourceKey:'rv:unrelated'});
  await f.ctx.makeZip([...f.files,[debug,png(2)]],f.job);assert.equal(f.prompts.length,0,'未被 Cascade 引用的检查图不是 UE 资产冲突');
 }
 console.log('PASS 同名迭代：明确确认、取消、规范硬拦、指纹失效、快照绑定、无跨任务授权、同源重导与检查图范围');
})().catch(e=>{console.error(e);process.exitCode=1;});
