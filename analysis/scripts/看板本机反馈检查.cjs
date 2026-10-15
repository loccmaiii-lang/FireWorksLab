// 纯Node隔离检查：不启动或控制浏览器，不连接线上。
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, '协作/看板本机反馈.js'), 'utf8');
const context = vm.createContext({ crypto: { randomUUID: () => 'test-client' } });
vm.runInContext(source, context);
const { Session, KEY } = context.FWBLocal;
const at = '2026-10-15T23:09:06+08:00';
const values = new Map();
const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
const view = { '导出时间': at, '本地视图': { '反馈已入Git': [] },
  items: { i01: { status: '没做', feedback: '' } }, resources: { r01: {} }, dialogs: { g01: {} } };
let session = new Session(storage, view);
session.write('items', 'i01', { status: '已做', doneAt: at }, at);
assert.equal(session.count(), 1);
const firstEvent = session.export(at).entries[0].eventId;
session = new Session(storage, view);
assert.equal(session.export(at).entries[0].eventId, firstEvent, '刷新不重复生成反馈事件');
const rows = { items: [{ _id: 'i01', status: '没做' }], resources: [], dialogs: [] };
session.apply(rows);
assert.equal(rows.items[0].status, '已做');
session.setDraft('fb:items:i01', '未失焦的意见');
assert.equal(new Session(storage, view).drafts()['fb:items:i01'], '未失焦的意见');
session.write('items', 'i01', { status: '没做', doneAt: '' }, at);
assert.equal(session.count(), 0, '撤销回原状态不发假变更');
session.write('resources', 'r01', { feedback: '资源意见', feedbackAt: at }, at);
session.write('dialogs', 'g01', { feedback: '对话意见', feedbackAt: at }, at);
assert.equal(session.count(), 2);
const pending = session.export(at);
const acknowledged = JSON.parse(JSON.stringify(view));
acknowledged['本地视图']['反馈已入Git'] = [pending.entries[0].eventId];
assert.equal(new Session(storage, acknowledged).count(), 1, '只移除已入Git的那个事件');
const before = storage.getItem(KEY);
const broken = new Session({ getItem: storage.getItem, setItem: () => { throw Error('quota'); } }, view);
assert.throws(() => broken.write('items', 'i01', { feedback: '存储失败' }, at), /quota/);
assert.equal(storage.getItem(KEY), before);
assert.throws(() => session.write('items', 'i01', { owner: '篡改负责人' }, at), /本机只保存/);
const aliasValues = new Map();
const aliasStorage = {getItem:k=>aliasValues.get(k)||null,setItem:(k,v)=>aliasValues.set(k,v)};
const beforeCloud = {'导出时间':at,items:{'local-P001':{feedback:''}},resources:{},dialogs:{}};
const beforeCloudSession=new Session(aliasStorage,beforeCloud);
beforeCloudSession.write('items','local-P001',{feedback:'建行前的意见'},at);
beforeCloudSession.setDraft('fb:items:local-P001','建行前未提交的草稿');
const afterCloud = {'导出时间':at,'本地视图':{'行映射':{'local-P001':'online-7'}},items:{'online-7':{feedback:''}},resources:{},dialogs:{}};
const aliasSession = new Session(aliasStorage,afterCloud);
assert.equal(aliasSession.drafts()['fb:items:online-7'],'建行前未提交的草稿');
aliasSession.setDraft('fb:items:online-7',null);
assert.equal(Object.keys(aliasSession.drafts()).length,0);
const aliasRows={items:[{_id:'online-7'}]};aliasSession.apply(aliasRows);
assert.equal(aliasRows.items[0].feedback,'建行前的意见');
aliasSession.write('items','online-7',{feedback:'云端建行后继续修改'},at);
assert.equal(aliasSession.count(),1);
assert.equal(aliasSession.export(at).entries[0].row,'online-7');
console.log('本机反馈：刷新、未失焦草稿、撤销、资源/对话反馈、导出事件稳定、入Git回执、保存失败保护通过');

// 只执行内存中的页面脚本和最小文档接口，验证接线；这不是浏览器或视觉验收。
async function checkPage() {
  const html = fs.readFileSync(path.join(root, '协作/全局看板.html'), 'utf8');
  const snapshot = html.match(/<script type="application\/json" id="snap">([\s\S]*?)<\/script>/)[1];
  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(match => !match[1].includes('application/json')).map(match => match[2]);
  const memory = new Map();
  let failing = false;
  let readUnavailable = false;
  const local = { getItem: k => { if (readUnavailable) throw Error('storage unavailable'); return memory.get(k) || null; }, setItem: (k,v) => { if (failing) throw Error('quota'); memory.set(k,v); } };
  function createContext(online) {
    const elements = new Map();
    function element(key) {
      if (!elements.has(key)) elements.set(key, { innerHTML:'', textContent:key === '#snap' ? snapshot : '', hidden:false,
        value:'', dataset:{}, events:{}, setAttribute(){}, addEventListener(name, fn){this.events[name] = fn;},
        focus(){}, click(){}, setSelectionRange(){} });
      return elements.get(key);
    }
    const document = { activeElement:null, querySelector: element, querySelectorAll: () => [],
      getElementById: id => element('#'+id), addEventListener(){}, contains:()=>false, createElement:()=>element('download') };
    const sandbox = { document, localStorage:local, location:{hash:'', protocol:'file:'}, history:{replaceState(){}},
      CSS:{escape:s=>s}, setInterval(){}, clearTimeout(){}, setTimeout(){}, console,
      Blob, URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}}, crypto:{randomUUID:()=> 'page-test-client'} };
    sandbox.window = sandbox;
    if (online) sandbox.claude = { use: async name => name === 'db' ? online : { can: async()=>true } };
    const ctx = vm.createContext(sandbox);
    for (let code of scripts) {
      if (code.includes('function renderFocus')) code = code.replace(/\}\)\(\);\s*$/, 'window.__boardCheck = {state,write,markDone,reopen,saveFb,renderItems,renderFocus,canManage};})();');
      vm.runInContext(code, ctx);
    }
    return {ctx, elements};
  }
  let page = createContext();
  await new Promise(setImmediate);
  let api = page.ctx.__boardCheck;
  assert.equal(api.state.offline, true);
  assert.equal(api.state.canWrite, true);
  assert.equal(api.canManage(), false);
  assert.ok(page.elements.get('#banner').innerHTML.includes('尚未应用到云端'));
  assert.ok(page.elements.get('#focus').innerHTML.includes('需要优先接续'));
  assert.ok(api.state.rows.items.some(row=>row._id==='local-P005'));
  const decision = api.state.rows.items.find(row=>row._id==='i09');
  await api.markDone(decision, {answer:'测试决定（只在隔离内存）'}, 'test');
  assert.equal(decision.status, '已做');
  await api.saveFb({ dataset:{fb:'resources:r01'},value:'测试资源反馈（只在隔离内存）' });
  api.state.local.setDraft('ans:items:i24', '未提交的决定');
  const exportBefore = JSON.stringify(api.state.local.export(at).entries);
  await page.elements.get('#exportLocalFeedback').events.click();
  await page.elements.get('#exportLocalFeedback').events.click();
  assert.equal(JSON.stringify(api.state.local.export(at).entries), exportBefore, '重复导出不制造新反馈事件');
  page = createContext();
  await new Promise(setImmediate);
  api = page.ctx.__boardCheck;
  assert.equal(api.state.rows.items.find(row=>row._id==='i09').answer, '测试决定（只在隔离内存）');
  assert.equal(api.state.rows.resources.find(row=>row._id==='r01').feedback, '测试资源反馈（只在隔离内存）');
  assert.equal(api.state.drafts['ans:items:i24'], '未提交的决定');
  const feedback = api.state.rows.resources.find(row=>row._id==='r01').feedback;
  failing = true;
  await assert.rejects(api.write('resources','r01',{feedback:'不应发布的失败值'}), /quota/);
  assert.equal(api.state.rows.resources.find(row=>row._id==='r01').feedback, feedback);
  readUnavailable = true;
  const readOnly = createContext();
  await new Promise(setImmediate);
  assert.equal(readOnly.ctx.__boardCheck.state.canWrite, false);
  failing = false; readUnavailable = false;
  const sent = [];
  const db = { collection: coll => ({ doc:id=>({update:async patch=>{sent.push([coll,id,patch]);}}),
    orderBy:()=>({onSnapshot:callback=>callback({docs:Object.entries(JSON.parse(snapshot)[coll]).map(([id,data])=>({id,data:()=>data}))})}) }) };
  const online = createContext(db);
  await new Promise(setImmediate);
  assert.equal(online.ctx.__boardCheck.state.offline, false);
  await online.ctx.__boardCheck.write('items','i09',{feedback:'test-online'});
  assert.equal(sent.length, 1, '在线路径仍写原数据库');
  console.log('整页隔离接线：本地优先区/原38条及增量投影、勾选作答/资源反馈、刷新草稿、重复导出、存储失败只读、在线写入路径通过；未做真实浏览器视觉验收');
}
checkPage().catch(error=>{console.error(error);process.exitCode=1;});
