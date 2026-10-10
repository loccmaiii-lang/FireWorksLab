// 源码全量映射与完整千轮子花快照；不加载生产应用或修改配方。
import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../../../..');
const data=JSON.parse(fs.readFileSync(path.join(dir,'字段映射.json'),'utf8'));
const old=JSON.parse(fs.readFileSync(path.join(dir,'../字段映射.json'),'utf8'));
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'tool/src/js/10_types.js'),'utf8'),ctx);
const P=vm.runInContext('({...BASE,...TYPES.senrin.p,type:"senrin"})',ctx);
const ui=fs.readFileSync(path.join(root,'tool/src/js/70_ui.js'),'utf8');vm.runInContext(ui.slice(ui.indexOf('const AUTO_DEF ='),ui.indexOf('const autoLinked =')),ctx);
const auto=vm.runInContext('AUTO_DEF',ctx);
const sampleRows=data.rows.filter(r=>r.emitter==='子花'&&r.sourceSection==='千轮 / 分裂');
if(sampleRows.length!==18)throw Error('千轮18字段变化，需要重新核对');
const sample=Object.fromEntries(sampleRows.map(r=>[r.key,P[r.key]]));sample.subSize=1.2;sample.subSizeCurve='0:1, 0.7:1, 1:0';
const links=Object.fromEntries(sampleRows.filter(r=>auto[r.key]).map(r=>[r.key,{sentinel:auto[r.key][3],source:auto[r.key][2],value:auto[r.key][1](P)}]));
// 只更正新快照的本机根目录路径；不改4.9.60基线。
const outputRoot=data.extras.find(r=>r.fieldId==='DELIVERY-root');outputRoot.dataPath='config.outputRoot / session.outputRoot';outputRoot.default='D:/ProjectTextures/FireWorksLab';outputRoot.meaning=outputRoot.meaning.split('；4.9.68可填写')[0]+'；4.9.68可填写/选择保存，忙时锁定，每次成功导出ZIP递增留档';
// 下载映射与浏览器数据使用同一个更正后的快照，避免界面和CSV版本走样。
fs.writeFileSync(path.join(dir,'字段映射.json'),JSON.stringify(data,null,2)+'\n');
const columns=fs.readFileSync(path.join(dir,'字段映射.csv'),'utf8').replace(/^\ufeff/,'').split('\n')[0].split(',').map(s=>s.replace(/^"|"$/g,''));
const csv=s=>'"'+String(typeof s==='object'&&s!==null?JSON.stringify(s):s??'').replaceAll('"','""')+'"';
fs.writeFileSync(path.join(dir,'字段映射.csv'),'\ufeff'+[columns,...[...data.rows,...data.extras].map(r=>columns.map(c=>r[c]))].map(row=>row.map(csv).join(',')).join('\n')+'\n');
const body=fs.readFileSync(path.join(root,'tool/src/body.html'),'utf8');
const buttons=[...body.matchAll(/<button\b([^>]*?)>([\s\S]*?)<\/button>/g)].map(m=>({id:m[1].match(/\bid="([^"]+)"/)?.[1]||'',label:m[2].replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim(),source:'tool/src/body.html:'+body.slice(0,m.index).split('\n').length}));
const actions=buttons.filter(r=>r.id&&/export|zip|bake|delivery|download|out|asset|name|size|capture|cut/i.test(r.id));
// 交付清单由运行时生成，其四个动作不能被静态body按钮盘点漏掉。
const workbench=fs.readFileSync(path.join(root,'tool/src/js/79_workbench.js'),'utf8');
for(const id of ['dvExport','dvBack','dvSaveNames','dvResetNames']){
 const match=workbench.match(new RegExp('<button\\b[^>]*id="'+id+'"[^>]*>([\\s\\S]*?)<\\/button>'));
 if(!match)throw Error('交付清单动作不存在：'+id);
 actions.push({id,label:match[1].replace(/<[^>]+>/g,'').trim(),source:'tool/src/js/79_workbench.js:'+workbench.slice(0,match.index).split('\n').length});
}
const identities=d=>[...d.rows,...d.extras].map(r=>r.occurrenceId||r.fieldId).sort();
const equal=JSON.stringify(identities(old))===JSON.stringify(identities(data));
const coverage={version:data.summary.bakerVersion,sourceCommit:data.summary.sourceCommit,total:identities(data).length,sourceSections:data.summary.schemaSections,objects:[...new Set(data.rows.map(r=>r.emitter))].length,A:identities(data),B:identities(data),oldEqual:equal,missing:[],actions:actions.length,registryAliases:data.registryOnly.length,internal:data.internal.length};
if(!equal)throw Error('与旧清单字段出现ID不一致，需处理增量');
fs.writeFileSync(path.join(dir,'sample-data.json'),JSON.stringify({...data,sample,links,actions,coverage},null,2)+'\n');
fs.writeFileSync(path.join(dir,'coverage.json'),JSON.stringify(coverage,null,2)+'\n');
console.log(JSON.stringify({version:coverage.version,total:coverage.total,sections:coverage.sourceSections,objects:coverage.objects,sample:sampleRows.length,actions:actions.length,oldEqual:equal}));
