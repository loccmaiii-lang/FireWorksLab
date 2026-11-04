// Produce private example/data artifacts. No browser automation or native calls.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.join(__dirname,'research/show-link-20261006'),ctx=vm.createContext({console});
for(const name of ['show-bp-data.js','show-text.js','show-resource-data.js','show-resources.js','show-project.js','show-project-sample.js','show-project-export.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),ctx,{filename:name});
const get=code=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',ctx));
vm.runInContext('var sample=ShowProjectSample.create();var compiled=ShowProject.compile(sample);',ctx);
const sample=get('sample'),compiled=get('compiled');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'开场白墙小样_未绑定ID.json'),JSON.stringify(sample,null,2));
const columns=['事件','点位','单发','发射s','起爆s','相对升高m','世界炸高m','目标花径m'];
const preview=['开场＋白墙 · 计划目标预览','缺少实际ID；此文本不是原生可粘贴参数，补齐后请从当前工程输出。',...compiled.errors.map(x=>'待填写：'+x),...compiled.warnings.map(x=>'待核对：'+x),'',columns.join('\t'),...compiled.shots.map(r=>[r.cueName,r.pointId,r.shotName,r.launchS,r.burstS,r.riseM,r.worldBurst.Z/100,r.diameterM].join('\t'))];
fs.writeFileSync(path.join(dir,'开场白墙小样_时间位置预览.txt'),preview.join('\n'));
fs.writeFileSync(path.join(dir,'sample-computation.json'),JSON.stringify(compiled,null,2));
vm.runInContext('var fixture=ShowProject.clone(sample);for(const r of fixture.resources)r.resourceId="Fixture_"+r.id.replace(/-/g,"_");ShowProject.rebind(fixture);var nativeFixture=ShowProjectExport.make(fixture,ShowProject.compile(fixture));',ctx);
fs.writeFileSync(path.join(dir,'原生文本_隔离测试夹具.txt'),'仅用于离线元组检查：所有 Fixture_ 开头的ID都是假数据，不能当成项目资源粘贴到UE。\n\n'+get('nativeFixture.allText'));
console.log(JSON.stringify({rows:compiled.shots.length,wall:compiled.stats.wallShots,missingBindings:compiled.errors.length,nativeDataIsFixtureOnly:true}));
