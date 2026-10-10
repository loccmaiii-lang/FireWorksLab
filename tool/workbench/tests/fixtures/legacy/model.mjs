/** Pure editing model for the point17 visual prototype; never accesses UE. */
export const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const round = value => Math.round(value * 1e6) / 1e6;
const unique = values => [...new Set(values)];
const pointOf = event => event.pointId ?? event.point;
const templateOf = event => event.templateId ?? event.template;
const effective = (event, field) => round(Number(event[field]) + Number(event.dt ?? 0));
const requireNumber = (value, label) => {
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error(`${label}必须是有限数值`);
  return result;
};
const requireCue = (doc, id) => {
  const cue = doc.cues.find(item => item.id === id);
  if (!cue) throw new Error(`找不到编排片段 ${id}`);
  return cue;
};

export function cueEvents(doc, cueId) {
  return doc.events.filter(event => event.cueId === cueId);
}

export function cueBounds(doc, cueId) {
  const events = cueEvents(doc, cueId);
  if (!events.length) return { start: 0, burst: 0, end: 0, pointIds: [], count: 0 };
  return {
    start: Math.min(...events.map(event => effective(event, 'launch'))),
    burst: Math.min(...events.map(event => effective(event, 'burst'))),
    end: Math.max(...events.map(event => effective(event, 'end'))),
    pointIds: orderedPoints(doc, unique(events.map(pointOf))),
    count: events.length,
  };
}

function orderedPoints(doc, ids) {
  const index = new Map(doc.points.map((point, i) => [point.id, i]));
  return [...ids].sort((a, b) => (index.get(a) ?? Infinity) - (index.get(b) ?? Infinity));
}

function peak(events, startField = 'effectiveLaunch') {
  const boundaries = events.flatMap(event => [[event[startField], 1], [event.effectiveEnd, -1]])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let active = 0;
  let maximum = { count: 0, time: 0 };
  for (const [time, delta] of boundaries) {
    active += delta;
    if (active > maximum.count) maximum = { count: active, time };
  }
  return maximum;
}

function normalizeInPlace(doc) {
  const templates = new Map(doc.templateLibrary.map(template => [template.id, template]));
  for (const event of doc.events) {
    event.pointId = event.point = pointOf(event);
    event.templateId = event.template = templateOf(event);
    event.groupId = event.templateId;
    for (const field of ['launch', 'burst', 'end']) event[`effective${field[0].toUpperCase()}${field.slice(1)}`] = effective(event, field);
    const sectionIndex = doc.sections.findIndex((section, index) => event.burst >= section.start && (event.burst < section.end || index === doc.sections.length - 1 && event.burst === section.end));
    event.sectionId = sectionIndex >= 0 ? doc.sections[sectionIndex].id : null;
    event.phase = sectionIndex;
  }
  for (const cue of doc.cues) {
    const events = cueEvents(doc, cue.id);
    cue.eventIds = events.map(event => event.id);
    cue.pointIds = orderedPoints(doc, unique(events.map(pointOf)));
    cue.eventCount = events.length;
    cue.start = events.length ? Math.min(...events.map(event => event.launch)) : 0;
    cue.burstStart = events.length ? Math.min(...events.map(event => event.burst)) : 0;
    cue.lastLaunch = events.length ? Math.max(...events.map(event => event.launch)) : 0;
    cue.end = events.length ? Math.max(...events.map(event => event.end)) : 0;
    cue.effectiveEnd = events.length ? Math.max(...events.map(event => event.effectiveEnd)) : 0;
    cue.sectionIds = unique(events.map(event => event.sectionId).filter(Boolean));
    cue.templateId = events[0]?.templateId ?? cue.templateId;
    cue.groupId = cue.templateId;
  }
  const oldGroups = new Map((doc.groups ?? []).map(group => [group.id, group]));
  doc.groups = doc.templateLibrary.map(template => {
    const events = doc.events.filter(event => event.templateId === template.id);
    return {
      ...oldGroups.get(template.id), id: template.id, templateId: template.id,
      name: oldGroups.get(template.id)?.name ?? template.name.replace(/^坝顶[·・]/, ''),
      color: template.color, kind: template.kind, enabled: oldGroups.get(template.id)?.enabled ?? true,
      eventIds: events.map(event => event.id), cueIds: unique(events.map(event => event.cueId)),
      pointIds: orderedPoints(doc, unique(events.map(pointOf))), eventCount: events.length,
      start: events.length ? Math.min(...events.map(event => event.launch)) : 0,
      end: events.length ? Math.max(...events.map(event => event.end)) : 0,
      effectiveEnd: events.length ? Math.max(...events.map(event => event.effectiveEnd)) : 0,
    };
  });
  for (const section of doc.sections) {
    const events = doc.events.filter(event => event.sectionId === section.id);
    section.eventCount = events.length;
    section.fanCount = events.filter(event => templates.get(event.templateId)?.shape === 'fan').length;
    section.ballCount = events.length - section.fanCount;
  }
  const byTemplate = Object.fromEntries(doc.templateLibrary.map(template => [template.id, 0]));
  const byPoint = Object.fromEntries(doc.points.map(point => [point.id, 0]));
  for (const event of doc.events) {
    byTemplate[event.templateId] = (byTemplate[event.templateId] ?? 0) + 1;
    byPoint[event.pointId] = (byPoint[event.pointId] ?? 0) + 1;
  }
  const fanCount = doc.events.filter(event => templates.get(event.templateId)?.shape === 'fan').length;
  doc.statistics = {
    ...doc.statistics, pointCount: doc.points.length, templateCount: doc.templateLibrary.length,
    eventCount: doc.events.length, cueCount: doc.cues.length, fanCount, ballCount: doc.events.length - fanCount,
    byTemplate, byPoint, firstLaunch: doc.events.length ? Math.min(...doc.events.map(event => event.launch)) : 0,
    lastLaunch: doc.events.length ? Math.max(...doc.events.map(event => event.launch)) : 0,
    firstEffectiveLaunch: doc.events.length ? Math.min(...doc.events.map(event => event.effectiveLaunch)) : 0,
    nominalEnd: doc.events.length ? Math.max(...doc.events.map(event => event.end)) : 0,
    effectiveEnd: doc.events.length ? Math.max(...doc.events.map(event => event.effectiveEnd)) : 0,
    activeInstancePeak: peak(doc.events),
    visibleBloomPeak: peak(doc.events.filter(event => templates.get(event.templateId)?.shape !== 'fan'), 'effectiveBurst'),
    perPointPeak: Object.fromEntries(doc.points.map(point => [point.id, peak(doc.events.filter(event => event.pointId === point.id))])),
  };
  return doc;
}

export function normalize(doc) { return normalizeInPlace(clone(doc)); }

function pointStartRanks(doc, ids, order) {
  const ordered = orderedPoints(doc, ids);
  if (order === 'together') return new Map(ordered.map(id => [id, 0]));
  if (order === 'right') ordered.reverse();
  if (order === 'left' || order === 'right' || order === 'source') return new Map(ordered.map((id, index) => [id, index]));
  const xById = new Map(doc.points.map((point, index) => [point.id, Number(point.x ?? point.position?.x ?? index - (doc.points.length - 1) / 2)]));
  const distances = unique(ordered.map(id => round(Math.abs(xById.get(id))))).sort((a, b) => a - b);
  if (order === 'outside-in') distances.reverse();
  return new Map(ordered.map(id => [id, distances.indexOf(round(Math.abs(xById.get(id))))]));
}

function freshId(base, used) {
  let result = base;
  let suffix = 2;
  while (used.has(result)) result = `${base}_${suffix++}`;
  used.add(result);
  return result;
}

function pointFanTilt(doc, pointId, templateId) {
  const exact = doc.events.find(event => pointOf(event) === pointId && templateOf(event) === templateId && Number.isFinite(event.tilt));
  const otherFan = doc.events.find(event => pointOf(event) === pointId && Number.isFinite(event.tilt));
  return Number(exact?.tilt ?? otherFan?.tilt ?? 0);
}

function setTemplateTiming(event, template) {
  event.templateId = event.template = template.id;
  event.zone = template.zone ?? 'dam';
  event.burst = round(event.launch + Number(template.rise ?? 0));
  if (template.shape === 'fan') {
    const allowed = Array.isArray(template.beams) ? template.beams : [Number(template.beams ?? 1)];
    event.beams = allowed.includes(event.beams) ? event.beams : allowed[Math.floor((allowed.length - 1) / 2)];
    event.beamGap = Number(template.beamGap ?? template.gap ?? 0);
    event.dir = event.dir ?? 'L';
    event.tilt = Number(event.tilt ?? 0);
    event.end = round(event.burst + Number(template.life ?? 0) + Math.max(0, event.beams - 1) * event.beamGap);
  } else {
    delete event.beams; delete event.beamGap; delete event.dir; delete event.tilt;
    event.end = round(event.burst + Number(template.life ?? 0));
  }
}

const orderLabels = { left: '左→右', right: '右→左', 'center-out': '中心外扩', 'outside-in': '两端内收', together: '各点同启', source: '原始节奏' };

export function applyCue(doc, cueId, patch = {}) {
  const next = clone(doc);
  const cue = requireCue(next, cueId);
  const originalEvents = cueEvents(next, cueId);
  if (!originalEvents.length) throw new Error(`片段 ${cueId} 没有逐发内容`);
  const originalStart = Math.min(...originalEvents.map(event => event.launch));
  const start = patch.start === undefined ? originalStart : requireNumber(patch.start, '开始时间');
  const templateId = patch.templateId ?? cue.templateId;
  const template = next.templateLibrary.find(item => item.id === templateId);
  if (!template) throw new Error(`找不到子模板 ${templateId}`);
  const ids = unique(patch.pointIds ?? cue.pointIds);
  if (!ids.length) throw new Error('片段至少需要一个发射点；删除整句请使用删除片段');
  const knownPoints = new Set(next.points.map(point => point.id));
  if (ids.some(id => !knownPoints.has(id))) throw new Error('发射点引用无效');
  const order = patch.order ?? cue.order ?? 'source';
  if (!Object.hasOwn(orderLabels, order)) throw new Error(`不支持的点位顺序 ${order}`);
  const gap = requireNumber(patch.gap ?? cue.gap ?? cue.sourceArgs?.step ?? 0, '点间间隔');
  if (gap < 0) throw new Error('点间间隔不能为负');
  const sizeScale = requireNumber(patch.sizeScale ?? cue.sizeScale ?? 1, '尺寸倍率');
  if (sizeScale < 0.5 || sizeScale > 1.8) throw new Error('尺寸倍率范围为 0.5–1.8');
  const previousScale = Number(cue.sizeScale ?? 1);
  const baseline = typeof cue.designScale === 'object' && cue.designScale ? { ...cue.designScale } : {};
  for (const event of originalEvents) if (!Object.hasOwn(baseline, event.id)) baseline[event.id] = Number(event.scale ?? 1) / previousScale;
  const byPoint = new Map(unique(originalEvents.map(pointOf)).map(id => [id, originalEvents.filter(event => pointOf(event) === id).sort((a, b) => a.launch - b.launch)]));
  const representative = [...byPoint.values()].sort((a, b) => b.length - a.length)[0];
  const ranks = pointStartRanks(next, ids, order);
  const used = new Set(next.events.map(event => event.id));
  const rewritten = [];
  for (const pointId of ids) {
    const existing = byPoint.get(pointId);
    const source = existing ?? representative;
    const first = Math.min(...source.map(event => event.launch));
    const firstOffset = order === 'source' ? (existing ? first - originalStart : 0) : ranks.get(pointId) * gap;
    for (let index = 0; index < source.length; index++) {
      const previous = source[index];
      const event = clone(previous);
      if (!existing) {
        event.id = freshId(`${cueId}_${pointId}_${index + 1}`, used);
        event.dt = 0; event.dz = 0;
        if (template.shape === 'fan') event.tilt = pointFanTilt(next, pointId, templateId);
        baseline[event.id] = 1;
      }
      event.pointId = event.point = pointId;
      const launch = round(start + firstOffset + previous.launch - first);
      const delta = launch - previous.launch;
      event.launch = launch;
      event.burst = round(previous.burst + delta);
      event.end = round(previous.end + delta);
      if (templateId !== templateOf(previous)) setTemplateTiming(event, template);
      event.scale = round(baseline[event.id] * sizeScale);
      rewritten.push(event);
    }
  }
  const insertion = next.events.findIndex(event => event.cueId === cueId);
  next.events = next.events.filter(event => event.cueId !== cueId);
  next.events.splice(insertion, 0, ...rewritten);
  cue.order = order; cue.gap = gap; cue.sizeScale = sizeScale; cue.designScale = Object.fromEntries(rewritten.map(event => [event.id, baseline[event.id]]));
  cue.templateId = templateId; cue.preserveRepeatedEvents = true; cue.edited = true;
  cue.warnings = [];
  if (order === 'together' && rewritten.some(event => Number(event.dt) !== 0)) cue.warnings.push('各点名义首发同时；原有逐发错落 dt 仍保留，实际可见时刻可能不同。');
  if (order === 'source' && patch.gap !== undefined) cue.warnings.push('原始节奏保持不变；要应用新的点间间隔，请选择一个排列方向。');
  if (rewritten.length > ids.length) cue.warnings.push('片段包含多排；调整只改变各点首发，点内排次数与相对节奏保留。');
  if (patch.templateId !== undefined || patch.order !== undefined || patch.pointIds !== undefined) {
    cue.pattern = `${ids.length}点 · ${orderLabels[order]}${rewritten.length > ids.length ? ' · 多排' : ''}`;
    cue.name = `${template.name.replace(/^坝顶[·・]/, '')} · ${cue.pattern}`;
  }
  return normalizeInPlace(next);
}

export function shiftCue(doc, cueId, delta) {
  requireCue(doc, cueId);
  const events = cueEvents(doc, cueId);
  return applyCue(doc, cueId, { start: Math.min(...events.map(event => event.launch)) + requireNumber(delta, '平移量') });
}

export function duplicateCue(doc, cueId, delta = 4) {
  const next = clone(doc);
  const original = requireCue(next, cueId);
  const newId = freshId(`${cueId}_copy`, new Set(next.cues.map(cue => cue.id)));
  const cue = { ...clone(original), id: newId, name: `${original.name} · 副本`, sourceCueId: cueId, edited: true, designScale: {} };
  const used = new Set(next.events.map(event => event.id));
  const events = cueEvents(next, cueId).map((previous, index) => {
    const event = clone(previous);
    event.id = freshId(`${newId}_${pointOf(event)}_${index + 1}`, used);
    event.cueId = newId;
    for (const field of ['launch', 'burst', 'end']) event[field] = round(event[field] + requireNumber(delta, '复制偏移'));
    cue.designScale[event.id] = original.designScale?.[previous.id] ?? Number(previous.scale ?? 1) / Number(original.sizeScale ?? 1);
    return event;
  });
  next.cues.splice(next.cues.findIndex(item => item.id === cueId) + 1, 0, cue);
  next.events.push(...events);
  return normalizeInPlace(next);
}

export function removeCue(doc, cueId) {
  requireCue(doc, cueId);
  const next = clone(doc);
  next.cues = next.cues.filter(cue => cue.id !== cueId);
  next.events = next.events.filter(event => event.cueId !== cueId);
  return normalizeInPlace(next);
}

export function addCue(doc, { templateId, pointIds, start = 0, order = 'together', gap = 0 }) {
  const next = clone(doc);
  const template = next.templateLibrary.find(item => item.id === templateId);
  if (!template) throw new Error(`找不到子模板 ${templateId}`);
  const ids = unique(pointIds ?? []);
  if (!ids.length || ids.some(id => !next.points.some(point => point.id === id))) throw new Error('请选择有效发射点');
  const id = freshId('Q_NEW', new Set(next.cues.map(cue => cue.id)));
  const used = new Set(next.events.map(event => event.id));
  const events = ids.map(pointId => {
    const event = { id: freshId(`${id}_${pointId}_1`, used), pointId, point: pointId, templateId, template: templateId, cueId: id, launch: requireNumber(start, '开始时间'), dt: 0, dz: 0, scale: 1 };
    setTemplateTiming(event, template);
    if (template.shape === 'fan') event.tilt = pointFanTilt(next, pointId, templateId);
    return event;
  });
  next.cues.push({ id, name: template.name, templateId, pointIds: ids, enabled: true, sourceMethod: 'visual_editor', groupingSource: 'visual_editor', eventIds: events.map(event => event.id), start: Number(start) });
  next.events.push(...events);
  return applyCue(next, id, { start, templateId, pointIds: ids, order, gap });
}

export function validateDoc(doc) {
  const errors = [];
  if (!doc || !Array.isArray(doc.points) || !Array.isArray(doc.events) || !Array.isArray(doc.cues) || !Array.isArray(doc.templateLibrary)) return ['草稿缺少点位、逐发、片段或模板数组'];
  const pointIds = doc.points.map(point => point.id);
  const expected=[...Array.from({length:9},(_,i)=>'P'+(i+1)),...Array.from({length:8},(_,i)=>'B'+(i+1)),...(pointIds.length===24?Array.from({length:7},(_,i)=>'F'+(i+1)):[])];
  if (![17,24].includes(pointIds.length)||new Set(pointIds).size!==pointIds.length||expected.some(id=>!pointIds.includes(id))) errors.push('点位应为17坝顶，或17坝顶加7小平台');
  const templates = new Set(doc.templateLibrary.map(template => template.id));
  if (templates.size !== doc.templateLibrary.length) errors.push('子模板 ID 重复');
  const cues = new Map(doc.cues.map(cue => [cue.id, cue]));
  if (cues.size !== doc.cues.length) errors.push('编排片段 ID 重复');
  const ids = new Set();
  for (const event of doc.events) {
    if (!event.id || ids.has(event.id)) errors.push(`逐发 ID 重复或缺失：${event.id ?? '空'}`);
    ids.add(event.id);
    if (!pointIds.includes(pointOf(event))) errors.push(`${event.id} 引用了无效点位`);
    if (!templates.has(templateOf(event))) errors.push(`${event.id} 引用了无效子模板`);
    if (!cues.has(event.cueId)) errors.push(`${event.id} 引用了无效片段`);
    const nominal = ['launch', 'burst', 'end'].map(field => Number(event[field]));
    const times = ['launch', 'burst', 'end'].map(field => effective(event, field));
    if (nominal.some(time => !Number.isFinite(time)) || times.some(time => !Number.isFinite(time))) { errors.push(`${event.id} 时间不是有限数值`); continue; }
    if (nominal[0] < 0 || times[0] < 0) errors.push(`${event.id} 发射时间早于 0 秒`);
    if (nominal[2] > (doc.meta?.duration||210) + 1e-6 || times[2] > (doc.meta?.duration||210) + 1e-6) errors.push(`${event.id} 熄灭时间超过 ${doc.meta?.duration||210} 秒`);
    const t=doc.templateLibrary.find(t=>t.id===templateOf(event)),p=doc.points.find(p=>p.id===pointOf(event));
    if(t&&p&&t.zone!==p.zone) errors.push(`${event.id} 小平台与坝顶必须使用各自专用模板`);
    if (nominal[1] < nominal[0] || nominal[2] < nominal[1] || times[1] < times[0] || times[2] < times[1]) errors.push(`${event.id} 时间顺序应为发射 ≤ 开花 ≤ 熄灭`);
    for (const field of ['launch', 'burst', 'end']) {
      const key = `effective${field[0].toUpperCase()}${field.slice(1)}`;
      if (event[key] !== undefined && Math.abs(event[key] - effective(event, field)) > 1e-6) errors.push(`${event.id} ${key} 与 dt 不一致`);
    }
  }
  for (const cue of doc.cues) {
    if (!templates.has(cue.templateId)) errors.push(`${cue.id} 子模板引用无效`);
    const actual = cueEvents(doc, cue.id).map(event => event.id);
    if (!actual.length) errors.push(`${cue.id} 是空片段`);
    if (new Set(cue.eventIds ?? []).size !== actual.length || actual.some(id => !cue.eventIds?.includes(id))) errors.push(`${cue.id} 逐发索引不一致`);
    if ((cue.pointIds ?? []).some(id => !pointIds.includes(id))) errors.push(`${cue.id} 点位引用无效`);
  }
  return unique(errors);
}

// Quality profiles only filter whole point programs inside a cue; timing stays shared.
export function qualityPoints(doc,profiles,tier,cueId){
 const cue=doc.cues.find(c=>c.id===cueId); if(!cue)return [];
 const allowed=profiles?.[tier]?.[cueId];
 return [...cue.pointIds].filter(id=>tier==='high'||!Array.isArray(allowed)||allowed.includes(id));
}
export function qualityEvents(doc,profiles,tier){
 const keep=new Map(doc.cues.map(c=>[c.id,new Set(qualityPoints(doc,profiles,tier,c.id))]));
 return doc.events.filter(e=>keep.get(e.cueId)?.has(e.pointId));
}
export function setQualityPoints(doc,profiles,tier,cueId,ids){
 if(!['medium','low'].includes(tier))throw new Error('高配点位请在共同编排中修改');
 const c=doc.cues.find(c=>c.id===cueId);
 if(!c||!Array.isArray(ids)||ids.some(id=>!c.pointIds.includes(id)))throw new Error('此档只能保留高配已有的参与点位');
 const next=clone(profiles||{medium:{},low:{}});next[tier]??={};next[tier][cueId]=[...new Set(ids)];return next;
}
export function alternateQuality(doc,profiles,tier){
 if(!['medium','low'].includes(tier))throw new Error('请先选择中配或低配');
 const next=clone(profiles||{medium:{},low:{}});next[tier]={};const phases=new Map();
 for(const c of [...doc.cues].sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id))){
  const phase=phases.get(c.templateId)||0;phases.set(c.templateId,phase+1);
  const ids=doc.points.filter(p=>c.pointIds.includes(p.id)).map(p=>p.id);
  const keep=ids.filter((_,i)=>tier==='low'?(i+phase)%2===0:(i+phase)%3!==2);
  next[tier][c.id]=keep.length?keep:ids.slice(0,1);
 }
 return next;
}
export function validateProfiles(doc,profiles){
 const errors=[];
 if(!profiles||typeof profiles!=='object'||Array.isArray(profiles))return ['档位数据无效'];
 for(const tier of ['medium','low']){
  const map=profiles[tier];if(map===undefined)continue;
  if(!map||typeof map!=='object'||Array.isArray(map)){errors.push('档位点集无效');continue;}
  for(const [cueId,ids] of Object.entries(map)){
   // Removed source cues can retain dormant overrides for undo/history.
   if(!Array.isArray(ids)||ids.some(id=>!doc.points.some(p=>p.id===id))||new Set(ids).size!==ids.length)errors.push(`${tier}/${cueId} 点集无效`);
  }
 }
 return errors;
}
