/* 分层粒子图（窜天猴尾焰 / 仙女棒）在烘焙器里的入口。
 * 4.9.83–4.9.86 这里是一个独立面板（自己的数字框、浏览器键保存、完整参数 JSON、左栏顶上两个按钮）。
 * 4.9.87（导出（23），用户 10-14 10:29「仙女棒与尾焰，直接把我的参数系统给换了……修复与统一参数系统界面」）：
 *   参数并回统一右栏——每层一个发射器标签（46_graph_model.js secItems），改过 / ↺ / 撤销 / 保存 / 草稿 / 版本和别的效果同一套；
 *   打开走「待我验收」的 SGR1 / SGS1 条目；这里只留：实时模拟「独看」的那一层（graphSolo）、旧脚本用的 graphOpen、旧存档搬家。 */
let graphSelected = 0, graphPreset = 'rocket', graphSolo = null;
// 旧脚本（analysis/scripts/spark_graph_prepare.py 的快照页）还会调它：现在就是打开对应的待我验收条目
function graphOpen(key) {
  graphPreset = key === 'sparkler' ? 'sparkler' : 'rocket';
  const id = graphPreset === 'rocket' ? 'SGR1' : 'SGS1', e = typeof entryById === 'function' ? entryById(id) : null;
  if (e && typeof openReview === 'function') { openReview(e); return true; }
  flash(`找不到条目 ${id}`, true); return false;
}
// 旧面板「保存当前候选」存在浏览器的 fwl.sparkgraph.<rocket|sparkler>：一次性搬进那个条目资产栏的「版本」（和 4.3 组合编辑器存档搬家同一个做法），搬完删掉旧键
function graphMigrateSaves() {
  let n = 0;
  for (const [key, id] of [['rocket', 'SGR1'], ['sparkler', 'SGS1']]) {
    let raw = null; try { raw = localStorage.getItem('fwl.sparkgraph.' + key); } catch (e) { return; }
    if (!raw) continue;
    try {
      const v = JSON.parse(raw); SparkGraph.validate(v.P.sparkGraph);
      const e = typeof entryById === 'function' ? entryById(id) : null, ef = e && typeof effectOfEntry === 'function' ? effectOfEntry(e) : null, wk = ef ? 'ef:' + ef.key : 'rv:' + id;
      const all = store.get('mySaves', {}), list = all[wk] || (all[wk] = []);
      list.push({ id: 'g' + Date.now().toString(36) + n, name: '旧粒子图面板里存的（4.9.83–4.9.86）', at: wbNow(), base: id, baseVer: '', snap: { kind: 'single', P: { ...v.P, type: 'sparkgraph' }, M: v.M, repId: id } });
      if (!store.set('mySaves', all)) continue;
      localStorage.removeItem('fwl.sparkgraph.' + key); n++;
    } catch (err) { console.warn('旧粒子图存档读不了，原样留着：', err.message); }
  }
  try { if (n) localStorage.removeItem('fwl.sparkgraph.active'); } catch (e) { }
  if (n) setTimeout(() => flash(`粒子图的独立面板去掉了：你在里面存的 ${n} 个候选搬进了窜天猴 / 仙女棒资产栏的「版本」`), 1500);
}
