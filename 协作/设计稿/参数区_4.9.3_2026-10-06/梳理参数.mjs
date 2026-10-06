// 只读生产定义，输出本轮设计覆盖表；不启动浏览器或执行渲染。
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = process.cwd();
const out = path.dirname(fileURLToPath(import.meta.url));
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const names = JSON.parse(read('analysis/命名/参数名称表.json'));
const emit = JSON.parse(read('analysis/命名/发射器表.json'));
const ctx = vm.createContext({});
vm.runInContext(read('tool/src/js/10_types.js'), ctx);
const schema = vm.runInContext('SCHEMA',ctx);
const canon = f => typeof f === 'function' ? f.toString().replace(/\s+/g,' ') : '';
const rows = [];
for (const sec of schema) for (const it of sec.items) {
  const a=Array.isArray(it), key=a?it[0]:it.sel||it.text||it.curve||(it.info?'info:'+it.info:'');
  const raw=a?it[1]:it.label||key, label=typeof raw==='function'?raw.toString():raw;
  const cand=names.filter(n=>n.sec===sec.sec&&n.key===key);
  const n=cand.find(n=>n.old===label)||cand.find(n=>typeof label==='string'&&(label.startsWith(n.old)||n.old.startsWith(label.split('（')[0])))||cand[0];
  const e=n&&emit.参数.find(e=>e.id===n.id);
  const target=key==='previewBloom'?'画布 / 预览设置':e?.发射器==='效果'?'参数 / 当前层 / 层设置':e?.发射器==='输出'?'参数 / 当前层 / 烘焙输出':'参数 / 当前层 / 发射器 / '+(e?.发射器||'待核对');
  rows.push({id:n?.id||'',key,sourceSection:sec.sec,kind:a?'number':it.curve?'curve':it.sel?'select':it.text?'text':'info',label:n?.cn||label,short:e?.名||'',emitter:e?.发射器||'',module:e?.模块||'',unit:a?it[2]:'',sectionCondition:canon(sec.show),fieldCondition:canon(a?it[6]:it.show),options:it.options||null,target,source:'tool/src/js/10_types.js',range:a?[it[3],it[4],it[5]]:null});
}
const summary={version:vm.runInContext('VERSION',ctx),sections:schema.length,schemaRows:rows.length,uniqueKeys:new Set(rows.map(r=>r.key)).size,missingMapping:rows.filter(r=>!r.id||!r.emitter).map(r=>r.key),emitters:emit.发射器.map(e=>({name:e.名,modules:e.模块,count:rows.filter(r=>r.emitter===e.名).length}))};
fs.writeFileSync(path.join(out,'参数逐项映射.json'),JSON.stringify({summary,rows},null,2)+'\n');
const cols=['id','key','sourceSection','kind','label','short','emitter','module','unit','sectionCondition','fieldCondition','target'];
const csv=s=>'"'+String(s??'').replaceAll('"','""')+'"';
fs.writeFileSync(path.join(out,'参数逐项映射.csv'),'\ufeff'+[cols,...rows.map(r=>cols.map(c=>r[c]))].map(row=>row.map(csv).join(',')).join('\n')+'\n');
console.log(JSON.stringify(summary,null,2));
