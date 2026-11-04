// 离线复用已验证的烘焙像素，调用当前烘焙器纯配置编译函数；不访问浏览器或 UE。
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),acorn={parse:source=>require('F:/FireWorksLab/tool/workbench/node_modules/@babel/parser').parse(source).program};
const root='D:/ProjectTextures/FireWorksLab',output=__dirname+'/backups/20261012-codex-4969-local/prepared';fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync('F:/FireWorksLab/tool/src/js/47_risetail.js','utf8'),tree=acorn.parse(source,{ecmaVersion:'latest'});
const functions=['rtMobilePick','rtMobileEmitters'];
const context=vm.createContext({console});
vm.runInContext('const RT_MOBILE_MAX_ALIVE=50,RT_MOBILE_MAX_EMITTERS=3,RT_MOBILE_PARTICLES=false;'+functions.map(name=>{const n=tree.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);return source.slice(n.start,n.end);}).join('\n'),context);
const compiler=fs.readFileSync('F:/FireWorksLab/tool/src/js/66_fwlcascade.js','utf8'),ctree=acorn.parse(compiler,{ecmaVersion:'latest'}),sig=ctree.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='fwlPlanSig');vm.runInContext(compiler.slice(sig.start,sig.end),context);
let axis;
function walk(n){if(!n||typeof n!=='object')return;if(n.type==='ObjectExpression'&&n.properties.some(p=>p.key?.name==='m'&&p.value?.value==='OrientationAxisLock'))axis=vm.runInContext('('+source.slice(n.start,n.end)+')',context);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}
walk(tree);if(!axis)throw Error('当前编译器缺少锁轴定义');
const index=JSON.parse(fs.readFileSync(root+'/workspace-resources.json','utf8')),manifest=[];
for(const size of ['S','M','L']){
 const name='RiseTrail_'+size,entry=index.resources.find(r=>r.name===name),base=path.join(root,entry.relativeDirectory),descriptor=JSON.parse(fs.readFileSync(base+'/workspace-resource.json','utf8'));
 const pc=JSON.parse(fs.readFileSync(base+'/PC/cascade.json','utf8')),mobile=JSON.parse(fs.readFileSync(base+'/手机/cascade_mobile.json','utf8'));
 const before=JSON.parse(JSON.stringify(pc.emitters)),far=pc.emitters.find(e=>e.name==='TrailFar');far.required.screen_alignment='Rectangle';far.required.local_space=true;far.modules.push(axis);
 pc.name=name;pc.naming.base=name;pc.source.plan_sig=context.fwlPlanSig(pc.emitters);pc.source.delivery_contract='4.9.69';
 const picked=context.rtMobileEmitters(mobile.emitters.filter(e=>['RiseLoop','TrailFar'].includes(e.name)),{emitters:mobile.emitters.filter(e=>!['RiseLoop','TrailFar'].includes(e.name))},0,0);
 mobile.emitters=JSON.parse(JSON.stringify(picked.emitters));mobile.name=name+'_M';mobile.tier='M';mobile.naming.base=name;mobile.materials=Object.fromEntries(Object.entries(mobile.materials).filter(([k])=>picked.materials.has(k)));mobile.textures=Object.fromEntries(Object.entries(mobile.textures).filter(([k])=>picked.textures.has(k)));mobile.notes=[picked.note];mobile.source.plan_sig=context.fwlPlanSig(mobile.emitters);mobile.source.delivery_contract='4.9.69';
 const restored=JSON.parse(JSON.stringify(pc.emitters));const rf=restored.find(e=>e.name==='TrailFar');rf.required.screen_alignment=before.find(e=>e.name==='TrailFar').required.screen_alignment;delete rf.required.local_space;rf.modules=rf.modules.filter(m=>m.m!=='OrientationAxisLock');if(JSON.stringify(restored)!==JSON.stringify(before))throw Error('PC 非授权数值变化');
 const directory=path.join(output,name);fs.mkdirSync(directory,{recursive:true});const files=new Map();
 for(const [platform,config]of [['PC',pc],['手机',mobile]])for(const t of Object.values(config.textures)){
   const data=fs.readFileSync(path.join(base,platform,t.file));t.sha256=crypto.createHash('sha256').update(data).digest('hex');
   if(files.has(t.file)&&!files.get(t.file).equals(data))throw Error('平台同名文件内容不同');files.set(t.file,data);
 }
 for(const [file,data]of files)fs.writeFileSync(path.join(directory,file),data);
 fs.writeFileSync(directory+'/cascade.json',JSON.stringify(pc,null,1));fs.writeFileSync(directory+'/cascade_mobile.json',JSON.stringify(mobile,null,1));
 const metadata={...descriptor.metadata,bakerVersion:'4.9.70',pixelBakerVersion:descriptor.metadata.bakerVersion,deliveryContract:'4.9.69',reusedPixelRevision:entry.revisionId,preparation:'已有实烘PNG原字节复用，当前纯函数编译手机配置与轴锁；未重新烘焙',name,displayName:name};
 fs.writeFileSync(directory+'/metadata.json',JSON.stringify(metadata,null,1));manifest.push({name,directory,sourceRevision:entry.revisionId});
 console.log(name+'：PC 仅远段三处变化；手机 '+mobile.emitters.length+' 个发射器；全部 PNG 原字节保留');
}
fs.writeFileSync(output+'/manifest.json',JSON.stringify(manifest,null,2));
