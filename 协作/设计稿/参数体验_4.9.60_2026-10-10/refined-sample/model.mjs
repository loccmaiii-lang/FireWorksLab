// 三种布局共享同一模型；编辑只在内存，效果之间各自保留60步撤销。
import {createHistory} from '../full-sample/curve-model.mjs';
export const standardModules = ['生成','形状','初速','受力','寿命','大小','颜色','亮度','闪烁'];
export const layouts = {continuous:'连续索引',modules:'模块索引',tasks:'任务分页'};
export const emitterOrder = ['星','星头','火花','子花','彗星','喷口','发射口','爆裂','分叉火花','余烬','开花闪光','爆亮','烟带','细火花','中火花','粗火花','白热火花','金火花','橙色火花','丝状火花','落火','火花共用','自定义 1','自定义 2'];
const keyOf = it => Array.isArray(it) ? it[0] : it.sel || it.text || it.curve || 'info:' + it.info;
const clone = structuredClone;
export function taskOf(row, object) {
  if (object === '效果') {
    if (row.scope === 'M') return '本层颜色';
    if (row.scope === 'L') return '位置与时间';
    return ({规格:'规格',环境:'环境',整体调整:'整体调整',轨迹:'整体运动',倒影:'水面倒影'})[row.module] || row.module;
  }
  if (object === '输出') {
    if(/^low/.test(row.key)||row.key==='info:lowAtNow')return '单帧';
    if(['unitVariants','unitRandom'].includes(row.key))return '单束';
    if(['dotSize','dotBright'].includes(row.key))return '光点';
    if(['outPC','outMobile','form','info:schemeNote'].includes(row.key))return '产物';
    if (['取景','入点出点'].includes(row.module) || ['cutIn','cutOut','exportScale','exportScaleRise','zoom'].includes(row.key)) return '尺寸与取帧';
    if (/画质/.test(row.module)) return '画质';
    if (/帧|格子|贴图|算出来/.test(row.module) || row.sourceSection?.startsWith('输出：') || ['texW','texH','cols','rows','chans','outMode','encGamma','autoGrid','frameMode','cellPad'].includes(row.key)) return '帧数与贴图';
    if(row.sourceSection==='光点与曝光（4.0）')return '曝光与光晕';
    if (/曝光|光晕|光点/.test(row.module)) return '曝光与光晕';
    if (/手机/.test(row.module)) return '手机';
    return row.module;
  }
  if (['生成','寿命'].includes(row.module)) return '时序与数量';
  if (['形状','初速','受力'].includes(row.module)) return '空间与运动';
  if (['大小','颜色','亮度'].includes(row.module)) return '外观与颜色';
  return '事件与特性';
}
export function createModel(data, source, {singleLayer=false,normalize=P=>P}={}) {
  const sessions = new Map(), baseline = new Map(), placement = new Map();
  const meta = new Map();
  for (const row of data.rows) {
    const id = row.sourceSection + '|' + row.key;
    if (!meta.has(id)) meta.set(id, []);
    meta.get(id).push(row);
  }
  function session(type) {
    if (!sessions.has(type)) {
      const def = data.cases.find(c=>c.id===type);
      if (!def) throw Error('未知花型：'+type);
      const layers = (singleLayer?['主层']:['主层','对照层']).map((name,i)=>({id:String(i),name,P:clone(def.P),M:clone(def.M),L:{delay:0,scale:1,rate:1,mirror:false}}));
      const value = {layers}; baseline.set(type,clone(value)); sessions.set(type,createHistory(value));placement.set(type,!singleLayer);
    }
    return sessions.get(type);
  }
  function layer(type, index=0) { return session(type).state.layers[index]; }
  function schemaRows(P) {
    const result = [], seen = new Set();
    for (const section of source.schema) {
      if (section.show && !section.show(P)) continue;
      for (const it of section.items) {
        const show = Array.isArray(it) ? it[6] : it.show;
        if (show && !show(P)) continue;
        const key = keyOf(it), matches = meta.get(section.sec+'|'+key);
        if (!matches) throw Error('字段缺少映射：'+section.sec+'|'+key);
        const row = matches.find(r => r.fullLabel === (Array.isArray(it)?it[1]:it.label)) || matches[0];
        if (!source.blankHas(P,section.sec)) continue;
        const binding = row.scope + '.' + key;
        if (seen.has(binding)) continue;
        seen.add(binding);
        result.push({...row,scope:row.scope==='VIEW'&&key in P?'P':row.scope, options:it.options||row.options, view:Array.isArray(it)?it[7]||null:null});
      }
    }
    return result;
  }
  const layerFields = [
    {key:'delay',label:'开始时间',unit:'s',range:[0,10,.01]},
    {key:'scale',label:'缩放',unit:'×',range:[.1,6,.01]},
    {key:'rate',label:'时间倍率',unit:'×',range:[.3,2,.01]},
    {key:'mirror',label:'水平镜像',kind:'checkbox'}
  ].map(r=>({...r,fieldId:'LAYER-'+r.key,occurrenceId:'LAYER-'+r.key,scope:'L',kind:r.kind||'number',module:'位置与时间',emitter:'效果',fullLabel:r.label,randomParent:''}));
  const matFields = [
    {key:'xw',label:'变色过渡',unit:'s',range:[.01,.5,.01]},
    {key:'headInt',label:'显示强度',unit:'×',range:[0,20,.05]},
    {key:'tailInt',label:'尾迹显示强度',unit:'×',range:[0,20,.05]},
    ...['ramp0','ramp1','ramp2','ramp3'].map((key,i)=>({key,label:['渐变图暗端','渐变图中暗','渐变图中亮','渐变图亮端'][i],kind:'color'})),
    {key:'stages',label:'本层颜色',kind:'stages'}
  ].map(r=>({...r,fieldId:'MAT-'+r.key,occurrenceId:'MAT-'+r.key,scope:'M',kind:r.kind||'number',module:'本层颜色',emitter:'效果',fullLabel:r.label,randomParent:''}));
  const specFields = [
    {key:'form',label:'产物形式',kind:'select',options:[]},
    {key:'texW',label:'贴图宽',kind:'select',unit:'px',options:[512,1024,2048,4096].map(v=>[v,String(v)])},
    {key:'texH',label:'贴图高',kind:'select',unit:'px',options:[512,1024,2048,4096].map(v=>[v,String(v)])},
    {key:'cols',label:'列数',kind:'select',unit:'列',options:source.gridOptions.map(v=>[v,String(v)])},
    {key:'rows',label:'行数',kind:'select',unit:'行',options:source.gridOptions.map(v=>[v,String(v)])},
    {key:'chans',label:'通道',kind:'select',options:[[4,'RGBA 接力'],[1,'单通道']]},
    {key:'outMode',label:'输出拆分',kind:'select',options:[['combined','星头与火花合并'],['split','星头、火花分开']]},
    {key:'encGamma',label:'灰度编码',kind:'select',options:[[1,'线性灰度'],[2.2,'Gamma 2.2']]},
    {key:'frameMode',label:'取帧方式',kind:'select',options:[['tick30','30 fps（自动分段）'],['auto','自动（按运动快慢）'],['uniform','均匀']]},
    {key:'zoom',label:'取景方式',kind:'select',options:[['off','固定机位'],['on','随开花放大']]},
    {key:'unitFlip',label:'星头朝下',kind:'checkbox'},
    {key:'autoGrid',label:'自动格子',kind:'checkbox'}
  ].map(r=>({...r,fieldId:'SPEC-'+r.key,occurrenceId:'SPEC-'+r.key,scope:'P',kind:r.kind||'number',module:r.key==='form'?'产物':'帧数与贴图',emitter:'输出',fullLabel:r.label,randomParent:''}));
  function rows(type,index,object) {
    const current = layer(type,index), all = schemaRows(current.P);
    const actual = all.filter(r=>r.emitter===object);
    if (object==='效果') return [...actual, ...(placement.get(type)?layerFields:[]), ...matFields];
    if (object==='输出') {
      const existing = new Set(actual.map(r=>r.key));
      const kind=source.bakeKind(current.P);
      const extras = specFields.filter(r=>!existing.has(r.key) && r.key in current.P && (r.key!=='unitFlip'||['unit','riseLoop'].includes(kind)) && (r.key!=='autoGrid'||!['master','segments'].includes(kind))).map(r=>({...r}));
      // 当前家族的真实产物选项来自原函数，不开放源码不提供的形式。
      const form = extras.find(r=>r.key==='form');
      if (form) form.options=source.formOptions(current.P);
      const frame=extras.find(r=>r.key==='frameMode');
      if(frame){frame.readOnly=source.usesTickPlan40(current.P)||['loop','riseLoop'].includes(kind);if(source.usesTickPlan40(current.P))frame.displayValue='tick30';}
      const zoom=extras.find(r=>r.key==='zoom');if(zoom)zoom.readOnly=!['master','segments'].includes(kind);
      for(const row of extras.filter(r=>['cols','rows'].includes(r.key)))row.disabledOptions=['master','segments'].includes(current.P.form)&&!(+current.P.outCell>0)?row.options.filter(([v])=>v>Math.max(1,Math.floor(current.P[row.key==='cols'?'texW':'texH']/512))).map(([v])=>v):[];
      return [...extras,...actual];
    }
    return actual;
  }
  function objects(type,index) {
    const found = new Set(schemaRows(layer(type,index).P).map(r=>r.emitter));
    return ['效果',...emitterOrder.filter(o=>found.has(o)),'输出'];
  }
  function linked(type,index,row) {
    const P=layer(type,index).P, a=source.auto[row.key];
    if (!a) return null;
    const on=source.autoLinked(row.key,P[row.key]);
    let value=null;
    // 这两项需要烘焙回执，样板不伪造计算结果。
    if (!['holdTicks','pageTarget'].includes(row.key)) value=a[1](P);
    return {on,source:a[2],sentinel:a[3],value};
  }
  function value(type,index,row) {
    const l=layer(type,index), link=linked(type,index,row);
    if(row.key==='_trailTier')return l.P.type;
    const v=l[row.scope]?.[row.key];
    if (link?.on && link.value!==null) return link.value;
    if (row.key==='sparkSpread') return source.spread.get(l.P,v);
    return row.displayValue??v;
  }
  function commit(type,index,row,value) {
    const h=session(type), next=h.state, current=next.layers[index];
    if (!current[row.scope]) throw Error('不支持写入：'+row.scope);
    if (row.kind==='number' && !Number.isFinite(+value)) return false;
    if (row.key==='shellNo') source.applyShellNo(current.P,+value);
    else if (row.key==='tempo') {
      const k=+value/source.tempoOf(current.P);
      source.retimeP(current.P,k);source.retimeM(current.M,k);current.P.tempo=+value;
    } else if (row.key==='_trailTier') current.P=clone(data.cases.find(c=>c.id===value).P);
    else current[row.scope][row.key]=row.key==='sparkSpread' ? source.spread.set(current.P,+value) : clone(value);
    normalize(current.P);return h.commit(next);
  }
  function restore(type,index,rowsToRestore) {
    const h=session(type), next=h.state, base=baseline.get(type).layers[index];
    for(const r of rowsToRestore) if(base[r.scope]) {
      if(base[r.scope][r.key]===undefined) delete next.layers[index][r.scope][r.key];
      else next.layers[index][r.scope][r.key]=clone(base[r.scope][r.key]);
    }
    normalize(next.layers[index].P);return h.commit(next);
  }
  const changed=(type,index,row)=>JSON.stringify(layer(type,index)[row.scope]?.[row.key])!==JSON.stringify(baseline.get(type).layers[index][row.scope]?.[row.key]);
  // 完整页样板用实际烘焙器的图层快照；不再为单层模板制造第二层。
  function loadSnapshot(type,layers,{supportsPlacement=layers?.length>1}={}) {
    if(!data.cases.some(c=>c.id===type)||!layers?.length)throw Error('图层快照无效');
    const value={layers:clone(layers)};baseline.set(type,clone(value));sessions.set(type,createHistory(value));placement.set(type,supportsPlacement);
  }
  return {session,layer,rows,objects,linked,value,commit,restore,changed,source,data,baseline,loadSnapshot};
}
