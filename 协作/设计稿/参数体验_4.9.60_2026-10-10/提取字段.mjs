// 只读当前定义；不加载浏览器、模拟核、烘焙或写入生产数据。
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import extraFields from './补充字段.mjs';
const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const out = process.env.FWL_MAPPING_OUT ? path.resolve(process.env.FWL_MAPPING_OUT) : sourceDir;
const root = path.resolve(sourceDir, '../../..');
fs.mkdirSync(out, {recursive:true});
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const names = JSON.parse(read('analysis/命名/参数名称表.json'));
const emit = JSON.parse(read('analysis/命名/发射器表.json'));
const ui = read('tool/src/js/70_ui.js');
const ctx = vm.createContext({});
vm.runInContext(read('tool/src/js/10_types.js'),ctx,{timeout:2000});
vm.runInContext(read('tool/src/js/71_panel43.js'),ctx,{timeout:2000});
vm.runInContext(ui.slice(ui.indexOf('const AUTO_DEF ='),ui.indexOf('const autoLinked =')),ctx,{timeout:2000});
const {schema,base,version,rand,inert,auto,legacy} = vm.runInContext('({schema:SCHEMA,base:BASE,version:VERSION,rand:RAND_OF,inert:INERT,auto:AUTO_DEF,legacy:LEGACY})',ctx);
const canon = v => typeof v === 'function' ? v.toString().replace(/\s+/g,' ') : '';
const line = (p,s) => {const ix=read(p).indexOf(s);return ix<0?'未定位':read(p).slice(0,ix).split('\n').length;};
const ref = (p,s) => `${p}:${line(p,s)}`;
const keyOf = it => Array.isArray(it)?it[0]:it.sel||it.text||it.curve||(it.info?'info:'+it.info:'');
const refs = ['tool/src/js/10_types.js','tool/src/js/70_ui.js','tool/src/js/71_panel43.js','tool/src/js/79_workbench.js','tool/src/js/79_undo.js','tool/src/js/79_myfx.js','tool/src/js/75_iter.js','tool/src/js/90_events.js','tool/src/js/77_assets.js','tool/src/js/67_delivery.js','tool/src/js/67_fwlcombo.js','tool/src/body.html','analysis/命名/参数名称表.json','analysis/命名/发射器表.json'];
const rules = {
 P:'当前层 P；单层 wbSnap().P，多层 wbSnap().layers[i].P。保存/另存/切效果自动草稿及配方 JSON 保存完整快照。一次拖动/输入提交/选择为一步，全资产60步；输入框内快捷键留给文本撤销。切层/发射器不清历史，打开另一效果/版本重置。行/模块/发射器恢复到打开时与恢复模板默认不同。',
 M:'单层 M、多层选中 L（state.M=L），wbSnap 保留；材质/颜色修改通常不重烘灰度图，影响上色/导出。快照撤销60步，同效果切层不重置。',
 L:'多层 wbSnap().layers[i].L，保存/配方文件保留，逐操作快照撤销。层观察独看/静音另存在观察状态，不是导出关闭。',
 VIEW:'仅浏览器/运行时查看设置；不承诺被效果快照或 Ctrl+Z 保存/撤销。各项按事件源码注明实际持久化键。',
 READ:'只读结果/容器，无直接保存或撤销；受上游配方与成功烘焙影响。'
};
const linkKeys=vm.runInNewContext(ui.match(/const LINK_KEYS = (\[[\s\S]*?\]);/)[1]);
const wb=read('tool/src/js/79_workbench.js');
const phaseKey=vm.runInNewContext('('+wb.match(/const PHASE_KEY = (\{[^;]+\});/)[1]+')');
const timingKeys=[...Object.keys(phaseKey),'sparkLife','sparkLifeEnd','emberLife'];
const schemeKeys=vm.runInNewContext(read('tool/src/js/67_fwlcombo.js').match(/const SCHEME_KEYS = (\[[^;]+\]);/)[1]);
const BMODULE = {生成:'时序与数量',寿命:'时序与数量',火花:'时序与数量',形状:'空间与运动',初速:'空间与运动',受力:'空间与运动',大小:'外观与颜色',颜色:'外观与颜色',亮度:'外观与颜色',光晕:'外观与颜色',闪烁:'事件与特性',点灭:'事件与特性',辉星:'事件与特性',闪光:'事件与特性',飘落:'空间与运动',蜂:'空间与运动'};
function bGroup(e,m,k){
 if(k==='sparkBrightJit') return '外观与颜色';
 if(e==='效果') return ({规格:'规格与制作范围',环境:'环境与运动',玉体:'环境与运动',场景:'环境与运动',整体调整:'最终整体调整'})[m]||m;
 if(e==='输出') return m; // 输出已有任务组织，本轮保留
 if(/^rt|^ph|^tr/.test(k) && !BMODULE[m]) return `专属任务 · ${m}`;
 return BMODULE[m]||`专属任务 · ${m}`;
}
const rows=[]; let index=0;
for(const sec of schema) for(const it of sec.items){
 const a=Array.isArray(it), key=keyOf(it), raw=a?it[1]:it.label||key;
 const cand=names.filter(n=>n.sec===sec.sec&&n.key===key);
 const lab=typeof raw==='function'?canon(raw):raw;
 const n=cand.find(n=>n.old===lab)||cand.find(n=>typeof lab==='string'&&(lab.startsWith(n.old)||n.old.startsWith(lab.split('（')[0])))||cand[0];
 const e=n&&emit.参数.find(e=>e.id===n.id);
 const scope=it.info?'READ':'P'; const em=e?.发射器||'未登记'; const mod=e?.模块||sec.sec;
 const isCurve=!!it.curve; const conditions=inert.filter(x=>x[0].includes(key)).map(x=>({when:canon(x[1]),reason:x[2]}));
 const randomParent=rand[key]||(/Jit$/.test(key)?key.slice(0,-3):'');
 const siblingRandom=Object.entries(rand).filter(([,v])=>v===key).map(([k])=>k);
 const autoDef=auto[key]; const related=[...new Set((canon(sec.show)+' '+canon(a?it[6]:it.show)+' '+conditions.map(x=>x.when).join(' ')+' '+canon(autoDef?.[1])).match(/(?<=P\.)[A-Za-z_$][\w$]*/g)||[])];
 const dataPath=it.info?'derived:'+key:key==='_trailTier'?'P.type（打开另一档模板）':`P.${key}`;
 const row={occurrenceId:`SCHEMA-${String(++index).padStart(3,'0')}`,fieldId:n?.id||'',key,dataPath,scope,object:`当前效果 / 当前层 / ${em}`,kind:a?'number':isCurve?'curve':it.sel?'select':it.text?'text':'info',label:e?.名||n?.cn||lab,fullLabel:n?.cn||lab,category:e?.类别||'',meaning:n?.desc||'只读容器/结果，详见对应构建函数',unit:a?it[2]:e?.单位||n?.unit||'选项',storedUnit:key==='sparkSpread'?'m/s（面板换算为m）':a?it[2]:e?.单位||'',range:a?[it[3],it[4],it[5]]:null,options:it.options||null,default:base[key]??null,
 sourceSection:sec.sec,emitter:em,module:mod,sectionCondition:canon(sec.show)||'无节级条件',fieldCondition:canon(a?it[6]:it.show)||'无字段级条件',inertConditions:conditions,
 linkedDefault:autoDef?{source:autoDef[2],calculate:canon(autoDef[1]),sentinel:autoDef[3],linkedWhen:canon(autoDef[4])||`autoLinked(${key},v)`,behavior:'直接编辑断开；跟着算固定当前计算值；接回存哨兵，均进入快照撤销'}:null,
 relatedKeys:related,randomParent,siblingRandom,randomMeaning:n?.random||'',curve:isCurve?'0–1单粒寿命，文本提交 + 只读折线/表；空=×1；不支持拖点':(/Curve$/.test(key)?'看对应curve字段':'本字段无曲线控件'),
 displayConversion:a&&it[7]?{get:canon(it[7].get),set:canon(it[7].set)}:null,
 note:n?.note||'',updown:n?.updown||'',ue:n?.ue||'',legacy:legacy[key]?.[0]||(/^ph[A-Z]/.test(key)?'已归档物理尾缀参数':'')||'',
 oldPosition:`参数 / 当前层 / ${em} / ${mod} / ${e?.名||n?.cn||key}`,
 A:`参数 / 当前层 / ${em} / ${mod} / ${e?.名||n?.cn||key}`,
 B:`参数 / 当前层 / ${em} / ${bGroup(em,mod,key)} / ${e?.名||n?.cn||key}`,
 saveUndo:rules[scope],source:ref('tool/src/js/10_types.js',a?`'${key}'`:`${it.curve?'curve':it.sel?'sel':it.text?'text':'info'}: '${it.info||key}'`),meaningEvidence:'命名表说明（可能滞后）；当前条件/换算来自源码，冲突见覆盖报告',implementationEvidence:n?.check||'',saveSource:'tool/src/js/79_workbench.js:159; tool/src/js/79_undo.js:10'};
 // 当前代码优先于滞后说明，不改变命名表。
 if(key==='duration') row.meaning='从开花0s开始的制作/序列时间范围；不等于裁掉全黑帧后的产物时长。空中类自然熄灭，无统一最后0.3s淡出。';
 if(!row.unit)row.unit=e?.单位||'1（无量纲）';
 if(!row.storedUnit)row.storedUnit=row.unit;
 if(key==='tempo'){row.object='整个效果（空中层一起改写制作参数）';row.saveUndo+=' applyTempo同时改各空中层和开始时间；区别L.rate。';}
 if(key==='shellNo')row.saveUndo+=' 改号数一次改写多个数值，同批星联动组同步；锁定参数保留。';
 row.crossLayerLink=linkKeys.includes(key)?'同批星轨迹组：当前启用联动时同步组内层；我的效果显式建组/候选推断组。可暂时关闭；组本身不在参数撤销快照。':'本字段不在LINK_KEYS轨迹同步列表；其他条件/默认联动另见本行';
 row.timeCoupling=timingKeys.includes(key)?'setTimingParam→timingEdit：空中层依先后关系推移相关时间、时长/入点；可关followOff；同一时刻关联层可粘连（glueOff另控）；具体变动以提示为准。非空中仅直接改值。':'不走TIMING_KEYS通用时间联动';
 row.updatePath=schemeKeys.includes(key)?'onExportScheme：保存方案快照，主灰度贴图通常不重烘；unit变体数/随机例外使unit缓存失效。':'onParam：实时模拟更新，灰度烘焙按自动/手动模式处理';
 if(key==='_trailTier'){row.saveUndo='选择档位调用openType，打开另一档模板；不是修改当前配方字段，重新建立该效果撤销基线。';row.updatePath='openType：切对象，不是onParam';}
 if(it.info){row.updatePath='信息/规格容器；其中原有快捷动作见infoActions';row.infoActions=({endInfo:'用灭完时刻加长duration→setTimingParam',lowAtNow:'取当前engineTick时刻或恢复自动→P.lowAt/onExportScheme',outSummary:'试算页数用这个→P.pageTarget/onParam',specBox:'容器移动原贴图宽高/格子真实控件；见SPEC入口',specMore:'容器移动原贴图其它设置；见SPEC入口'})[it.info]||'无直接编辑动作';if(['endInfo','lowAtNow','outSummary'].includes(it.info))row.saveUndo='结果本身只读；内含原快捷动作改变对应P字段，按rules.P的完整快照保存/撤销，不另存信息行。';}
 if(key==='previewBloom'){row.scope='VIEW';row.object='画布预览';row.saveUndo='P.previewBloom仍在当前配方快照；OUT_SIG比较剔除previewBloom。只影响预览，不进贴图。';row.B=row.A=row.oldPosition='画布 / 预览设置 / 预览泛光（SCHEMA定义与画布入口同字段）';}
 rows.push(row);
}
// 随机字段在实际面板被移动到本体后面，不能把登记模块误当实际旧位置。
const byKey=new Map(rows.filter(r=>r.kind==='number').map(r=>[r.key,r]));
for(const r of rows){
 const parent=r.randomParent&&byKey.get(r.randomParent);
 r.registryPosition=r.oldPosition;
 if(parent&&r.kind==='number'){
  r.oldPosition=parent.registryPosition||parent.oldPosition;
  r.oldPosition=r.oldPosition.replace(/\/[^/]+$/,`/ ${parent.label} / 随机 / ${r.label}`);
  r.A=r.oldPosition;
  r.B=`参数 / 当前层 / ${r.emitter} / ${bGroup(parent.emitter,parent.module,parent.key)} / ${parent.label} / 随机 / ${r.label}`;
 }
 if(r.kind==='curve')r.saveUndo+=' 注意：rowChanged仅处理数值/select/text，现曲线不计行/模块“改过”、无独立行尾还原按钮；全资产撤销可恢复曲线文本。不伪称这些行级状态已实现。';
 const secStart=read('tool/src/js/10_types.js').indexOf(`sec: '${r.sourceSection}'`);
 const needle=r.kind==='number'?`['${r.key}',`:`${r.kind==='curve'?'curve':r.kind==='select'?'sel':r.kind==='text'?'text':'info'}: '${r.key.replace(/^info:/,'')}'`;
 const ix=read('tool/src/js/10_types.js').indexOf(needle,secStart);
 if(ix>=0)r.source='tool/src/js/10_types.js:'+read('tool/src/js/10_types.js').slice(0,ix).split('\n').length;
}
// 命名/归属表内不在当前SCHEMA呈现的定义保留登记，不伪称可调。
const used=new Set(rows.map(r=>r.fieldId));
const registryOnly=emit.参数.filter(e=>!used.has(e.id)).map(e=>({fieldId:e.id,key:e.key,emitter:e.发射器,module:e.模块,label:e.名,category:e.类别,unit:e.单位,oldPosition:`登记表 / ${e.发射器} / ${e.模块}`,A:`保留登记 / ${e.发射器} / ${e.模块}`,B:`保留登记 / ${e.发射器} / ${bGroup(e.发射器,e.模块,e.key)}`,status:'当前SCHEMA未呈现；不是新控件，不删表项'}));
const extras=structuredClone(extraFields);
const body=read('tool/src/body.html');
for(const x of extras){x.saveUndo=x.saveUndoOverride||rules[x.scope]||x.saveUndo;x.A=x.A||x.oldPosition;x.B=x.B||x.A;
 if(x.kind==='file')x.saveUndo='打开原始文件仅用于查看；不保存粒子参数，不属wbSnap撤销';
 if(x.dataPath==='P.previewBloom')x.saveUndo='配方快照包含P.previewBloom，但OUT_SIG对比剔除；预览事件不直接调用undoNote，不能保证独立一步撤销';
 const reg=registryOnly?.find(r=>r.key===x.key); if(reg){x.registryId=reg.fieldId;x.meaning=names.find(n=>n.id===reg.fieldId)?.desc||x.meaning;}
 x.storedUnit=x.unit;
 x.linkedDefault=x.linkedDefault||null;
 x.relatedKeys=x.relatedKeys||[];
 x.curve='本入口无独立曲线控件';
 if(x.dataPath.startsWith('P.')){x.default=base[x.key]??null;x.updatePath='原事件绑定；见source。P规格触发onParam；预览泛光例外仅wbSync。';}
 if(x.fieldId==='SPEC-form')x.relatedKeys=['type','texW','texH','cols','rows','chans','outMode','encGamma','frameMode','zoom'];
 if(['SPEC-cols','SPEC-rows','SPEC-texW','SPEC-texH'].includes(x.fieldId))x.relatedKeys=['form','texW','texH','cols','rows','outCell','autoGrid'];
 if(x.dataPath.startsWith('L.'))x.relatedKeys=['out.pc','out.mobile','delay','rate','scale'];
 if(x.scope==='M')x.relatedKeys=['stages','xw','headInt','tailInt','ramp0','ramp1','ramp2','ramp3'];
 if(x.fieldId==='UI-timeLink')x.source='tool/src/js/79_workbench.js:541; tool/src/js/79_workbench.js:658';
 x.source=x.source.replace(/(tool\/src\/js\/[\w_]+\.js):([A-Za-z][\w]*)/g,(_,p,f)=>ref(p,'function '+f+'('));
 if(x.domIds?.length){const dom=x.domIds[0];const p=x.source.startsWith('tool/src/js/77_assets.js')?'tool/src/js/77_assets.js':'tool/src/js/90_events.js';if(read(p).includes("$('#"+dom+"')"))x.bindingSource=ref(p,"$('#"+dom+"')");}
 if(x.fieldId.startsWith('SPEC-')){
  const dom=x.domIds[0],tag=body.match(new RegExp('<select[^>]*id="'+dom+'"[^>]*>([\\s\\S]*?)</select>'))?.[1];
  x.options=tag?[...tag.matchAll(/<option\b[^>]*value="([^"]+)"[^>]*>([^<]+)<\/option>/g)].map(m=>[m[1],m[2]]):null;
  x.fieldCondition=({form:'formOptions按family/type及旧形式；syncExport若不在选项中会重选第一项',texW:'当前层规格；512/1024/2048/4096及配方已有尺寸',texH:'同宽度；可独立选高',cols:'GRID_OPTS 1/2/4/8/16/32；母版/分段按单格≥512和outCell限制',rows:'同列数；autoGrid/outCell影响实际格子',unitFlip:'bakeKind unit或riseLoop才显示',autoGrid:'bakeKind非master/segments才显示',zoom:'bakeKind master/segments才可编辑，固定/Zoom两项',frameMode:'循环loop/riseLoop禁用；usesTickPlan40时仅tick30自动分段且禁用'})[x.key]||x.fieldCondition;
  if(x.key==='texW'||x.key==='texH')x.options=[512,1024,2048,4096,'原配方已有尺寸'];
  if(x.key==='cols'||x.key==='rows')x.options=[1,2,4,8,16,32];
 }
}
// 全部静态输入入口必须分派：业务参数/查看设置/文件操作。动态P字段由SCHEMA覆盖，M/L由extras覆盖。
const bodyControls=[...body.matchAll(/<(input|select)\b[^>]*\bid="([^"]+)"[^>]*>/g)].map(m=>({domId:m[2],element:m[1],source:ref('tool/src/body.html',m[0]),mapping:extras.find(x=>(x.domIds||[]).includes(m[2]))?.fieldId||(['abFile','abSrc','showcaseType','cloudLayer','libSearch'].includes(m[2])?'对象/文件导航（非效果参数）':m[2]==='importFile'?'参数文件操作':null)}));
const represented=new Set(rows.filter(r=>r.scope!=='READ').map(r=>r.key));
const internal=Object.entries(base).filter(([k])=>!represented.has(k)&&!extras.some(x=>x.dataPath===`P.${k}`)).map(([key,value])=>({key,dataPath:`P.${key}`,value,status:'BASE有值、SCHEMA无直接字段；内部/派生/兼容数据保留，不新建控件',references:fs.readdirSync(path.join(root,'tool/src/js')).filter(f=>f.endsWith('.js')).flatMap(f=>{const p='tool/src/js/'+f,s=read(p);return s.includes('P.'+key)?[ref(p,'P.'+key)]:[];})}));
const missing=rows.filter(r=>!r.fieldId||r.emitter==='未登记').map(r=>r.occurrenceId+':'+r.key);
const unmapped=bodyControls.filter(x=>!x.mapping);
const all=[...rows,...extras];
for(const r of all){for(const p of ['oldPosition','A','B'])r[p]+=` [${r.key}]`;if(r.registryPosition)r.registryPosition+=` [${r.key}]`;}
const supplementalRegistry=registryOnly.map(r=>({...r,status:extras.some(x=>x.registryId===r.fieldId)?'由真实规格框呈现，见extras对应registryId':'当前SCHEMA和补充入口未呈现；保留登记，不创建控件'}));
const ids=all.map(x=>x.occurrenceId||x.fieldId); const duplicateIds=ids.filter((x,i)=>ids.indexOf(x)!==i);
const layouts=Object.fromEntries(['A','B'].map(v=>[v,Object.values(Object.groupBy(all,r=>r[v].split('/').slice(0,-1).join('/'))).flat().map(r=>r.occurrenceId||r.fieldId).sort()]));
const incomplete=all.filter(r=>['fieldId','object','meaning','unit','fieldCondition','oldPosition','A','B','saveUndo','source'].some(k=>!r[k])).map(r=>r.occurrenceId||r.fieldId);
const summary={bakerVersion:version,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceHashes:Object.fromEntries(refs.map(p=>[p,crypto.createHash('sha256').update(read(p)).digest('hex')])),schemaSections:schema.length,schemaRows:rows.length,schemaEditable:rows.filter(x=>x.kind!=='info').length,schemaInfoRows:rows.filter(x=>x.kind==='info').length,uniqueSchemaKeys:new Set(rows.map(x=>x.key)).size,extraRows:extras.length,registryOnly:registryOnly.length,internalBaseKeys:internal.length,bodyControls:bodyControls.length,missingMappings:missing,unmappedBodyControls:unmapped,duplicateIds,incompleteRows:incomplete,A_B_equalFieldSets:JSON.stringify(layouts.A)===JSON.stringify(layouts.B)&&layouts.A.length===all.length};
fs.writeFileSync(path.join(out,'字段映射.json'),JSON.stringify({summary,saveRules:rules,rows,extras,registryOnly:supplementalRegistry,internal,bodyControls},null,2)+'\n');
const cols=['occurrenceId','fieldId','registryId','key','dataPath','scope','object','kind','label','meaning','meaningEvidence','category','unit','storedUnit','range','options','default','sectionCondition','fieldCondition','inertConditions','linkedDefault','relatedKeys','crossLayerLink','timeCoupling','updatePath','infoActions','randomParent','siblingRandom','randomMeaning','curve','displayConversion','registryPosition','oldPosition','A','B','saveUndo','source','bindingSource','saveSource','implementationEvidence','note'];
const csv=s=>'"'+String(typeof s==='object'&&s!==null?JSON.stringify(s):s??'').replaceAll('"','""')+'"';
fs.writeFileSync(path.join(out,'字段映射.csv'),'\ufeff'+[cols,...all.map(r=>cols.map(c=>r[c]))].map(row=>row.map(csv).join(',')).join('\n')+'\n');
console.log(JSON.stringify(summary,null,2));
if(missing.length||unmapped.length||duplicateIds.length||incomplete.length||!summary.A_B_equalFieldSets)process.exitCode=1;
