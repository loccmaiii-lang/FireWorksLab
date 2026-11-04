const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.dirname(__dirname);
const html=fs.readFileSync(path.join(root,'df-fx-workbench_v2_locmai.html'),'utf8').replace(/\r\n/g,'\n');
const original=fs.readFileSync(path.join(root,'df-fx-copier-suite_v1.0.1_locmai.html'),'utf8').replace(/\r\n/g,'\n');
const packDir='D:/ProjectTextures/FireWorksLab/TR2L_____V5';
const spec=JSON.parse(fs.readFileSync(path.join(packDir,'cascade.json'),'utf8'));
const prefix=s=>s.slice(s.indexOf('const FwImporter'),s.indexOf('  async function readPack(',s.indexOf('const FwImporter')));
const planning=s=>vm.runInNewContext(prefix(s)+'return {validate,makePlan};})();FwImporter;');
const current=planning(html),legacy=planning(original);
const plain=x=>JSON.parse(JSON.stringify(x));
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS '+name);}
const plan=current.makePlan(spec,'FireWorks_Trail_High_01');
check('真实素材包的多张同类贴图通过校验',()=>assert.deepEqual(plain(current.validate(spec)),[]));
check('真实素材包生成 8 个不同目标且引用的 5 张贴图均存在',()=>{
 assert.equal(Object.keys(plan).length,8);
 assert.equal(new Set(Object.values(plan).map(p=>p.toLowerCase())).size,8);
 for(const t of Object.values(spec.textures))assert(fs.existsSync(path.join(packDir,t.file)),t.file);
 for(const [key,token]of [['loop','Loop'],['fade30','Fade30'],['cutoutLoop','CutoutLoop'],['cutoutFade30','CutoutFade30']])assert(plan['tex:'+key].includes('_'+token+'_'));
 assert.notEqual(plan['tex:loop'],plan['tex:fade30']);assert.notEqual(plan['tex:cutoutLoop'],plan['tex:cutoutFade30']);
});
check('单类单张保持旧版贴图和材质名称',()=>{
 const one=plain(spec);delete one.textures.fade30;delete one.textures.cutoutFade30;delete one.materials.fade30;one.emitters=one.emitters.slice(0,1);
 assert.deepEqual(plain(current.makePlan(one,'Legacy_03')),plain(legacy.makePlan(one,'Legacy_03')));
});
check('各贴图使用自身网格，轮廓图跟随其对应发射器的贴图',()=>{
 const mixed=plain(spec);mixed.textures.fade30.cols=8;mixed.textures.fade30.rows=2;
 const p=current.makePlan(mixed,'Mixed_04');assert(p['tex:loop'].includes('16x1'));assert(p['tex:fade30'].includes('8x2'));assert(p['tex:cutoutFade30'].includes('8x2'));
});
check('大小写和清洗后相同的标识仍生成稳定的不同名称',()=>{
 const tricky={format:'fwl.cascade/1',textures:{'foo-bar':{class:'ramp',file:'a.png'},foo_bar:{class:'ramp',file:'b.png'},Foo_Bar:{class:'ramp',file:'c.png'}},materials:{},emitters:[]};
 const a=current.makePlan(tricky,'Keys_01');assert.equal(new Set(Object.values(a).map(p=>p.toLowerCase())).size,4);
 const reordered={...tricky,textures:Object.fromEntries(Object.entries(tricky.textures).reverse())};const b=current.makePlan(reordered,'Keys_01');for(const key of Object.keys(a))assert.equal(a[key],b[key]);
 assert(Object.values(a).every(p=>/^[A-Za-z0-9_/]+$/.test(p)));
});
check('非法贴图类型和不存在的引用在检查阶段被拦截',()=>{
 const unknown=plain(spec);unknown.textures.loop.class='other';assert(current.validate(unknown).some(e=>e.includes('贴图类型')));
 const missing=plain(spec);missing.materials.loop.textures.main='missing';assert(current.validate(missing).some(e=>e.includes('missing')));
 const cutout=plain(spec);cutout.emitters[0].required.cutout='missingMask';assert(current.validate(cutout).some(e=>e.includes('missingMask')));
 const dims=plain(spec);dims.textures.loop.cols=0;assert(current.validate(dims).some(e=>e.includes('网格')));
});
check('文件清单与源配置未被规划器改写',()=>{
 const before=JSON.stringify(spec);current.makePlan(spec,'Another_07');current.validate(spec);assert.equal(JSON.stringify(spec),before);
});

// Exercise the actual texture/material portion of importOne with isolated UE adapters.
// The particle construction and saving portions are deliberately not executed here.
const start=html.indexOf('  async function importOne(it){');
const textureMaterialBody=html.slice(start,html.indexOf('    // 3) 粒子系统',start)).replace('    try {\n','')+'return matObj;\n  }\n';
const python=[],calls=[],nodes=new Map();
const matPaths=new Map(Object.keys(spec.materials).map(k=>[plan['mat:'+k]+'.'+plan['mat:'+k].split('/').pop(),k]));
const sandbox={performance,api:async(route,body)=>{if(route==='/object/set'&&require('./mock-import-policy.cjs').simulateTexturePolicyWrite(body,nodes))return {data:{failed_properties:[]}};return {data:{properties:{ForcePlatformSettings:[],...(nodes.get(body.path)||{})}}};},ASSET_LIB:'/test/AssetLibrary',log:()=>{},__py:async code=>{python.push(code);if(require('./mock-import-policy.cjs').simulatePolicy(code,nodes))return[];return code.includes('import_asset_tasks')?['FWLJSON:'+JSON.stringify(Object.keys(spec.textures).map(k=>{const pkg=plan['tex:'+k];return [pkg+'.'+pkg.split('/').pop()];}))]:[];},__props:async p=>{
 if(nodes.has(p))return nodes.get(p);
 const key=matPaths.get(p);if(!key)return{};const m=spec.materials[key];
 return{TextureParameterValues:Object.entries(m.textures).map(([tk,tv])=>({ParameterInfo:{Name:tk==='main'?'MainTex':'EmissiveRampTex'},ParameterValue:{path:plan['tex:'+tv]+'.'+plan['tex:'+tv].split('/').pop()}})),ScalarParameterValues:Object.entries(m.scalars).map(([sk,v])=>({ParameterInfo:{Name:sk==='rows'?'Rows':'Cols'},ParameterValue:v}))};
},__call:async(...args)=>{calls.push(args);if(args[1]==='DuplicateAsset'){const p=args[2].DestinationAssetPath+'.'+args[2].DestinationAssetPath.split('/').pop();nodes.set(p,await sandbox.__props(p));}return{success:true};}};
const engine=vm.runInNewContext(prefix(html)+fs.readFileSync(__dirname+'/fireworks-selection.js','utf8')+'async function saveCreatedAssets(){}\n'+textureMaterialBody+'py=__py;props=__props;call=__call;return {importOne};})();FwImporter;',sandbox);
(async()=>{
 await engine.importOne({dir:packDir,as:'FireWorks_Trail_High_01',spec,assets:plan});
 check('实际贴图导入代码为 5 个文件使用各自独立目标',()=>{const importCode=python.find(s=>s.includes('import_asset_tasks'));for(const [k,t]of Object.entries(spec.textures)){assert(importCode.includes(t.file));assert(importCode.includes("destination_name', '"+plan['tex:'+k].split('/').pop()+"'"));}assert.equal((importCode.match(/unreal.AssetImportTask\(\)/g)||[]).length,5);});
 check('实际材质写入代码分别绑定 Loop 与 Fade30，并共用 Ramp',()=>{const materialCode=python.filter(s=>s.includes('set_material_instance_texture_parameter_value'));assert.equal(materialCode.length,2);for(const [i,k]of Object.keys(spec.materials).entries()){assert(materialCode[i].includes(plan['tex:'+spec.materials[k].textures.main]));assert(materialCode[i].includes(plan['tex:ramp']));}assert.equal(calls.filter(c=>c[1]==='DuplicateAsset').length,2);});
 console.log('\n'+passed+' multi-texture checks passed; UE operations were mocked.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
