// 检查视觉注解与原控制器边界；不是浏览器、布局或交互验收。
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('./', import.meta.url));
const read = name => readFileSync(new URL(name, import.meta.url),'utf8').replace(/\r\n/g,'\n');
const source = read('draft.js');
const baseline = execFileSync('git',['show','3034f812:tool/design-system/drafts/v1/draft.js'],{cwd:root,encoding:'utf8'}).replace(/\r\n/g,'\n');
const stripTree = text => text.slice(0,text.indexOf('  function tree(page) {')) + text.slice(text.indexOf('  function selectedNode(page)'));
assert.equal(stripTree(source),stripTree(baseline),'原控制器只允许改tree呈现函数');
const sandbox = {window:{}};
vm.createContext(sandbox);
vm.runInContext(read('structure-tree.js'),sandbox);
const {decorate,guidesMarkup} = sandbox.window.StructureTree;
const nodesStart = source.indexOf('  function nodesFor(page) {');
const nodesEnd = source.indexOf('  function visibleNodes(page)');
vm.runInContext(source.slice(nodesStart,nodesEnd),sandbox);
const kindIcons = new Set();
let states = 0;
for (const page of ['editor','rt6','particle']) {
  const nodes = vm.runInContext(`nodesFor('${page}')`,sandbox);
  const frozen = JSON.stringify(nodes);
  for (const node of nodes) {
    const rows = decorate(nodes,node.id);
    assert.equal(JSON.stringify(nodes),frozen,'不得修改原节点');
    assert.equal(rows.length,nodes.length);
    const expected = [];
    for (const current of nodes) {
      expected.length = current.level;
      expected[current.level] = current.id;
      if (current.id===node.id) break;
    }
    assert.deepEqual(Array.from(rows.filter(row=>row.onPath),row=>row.node.id),expected,'仅选中真实祖先路径');
    for (const row of rows) {
      kindIcons.add(row.icon);
      for (const guide of row.guides) {
        if (guide.activeTurn) assert.ok(expected.includes(row.node.id),'转折不能高亮无关兄弟节点');
        assert.ok(guide.level>0 && guide.level<=row.node.level);
      }
    }
    // 每个展开父节点的折叠结果仍保持真实层级，不产生悬空祖先。
    if (node.branch) {
      const at=nodes.indexOf(node);
      let end=at+1;
      while(end<nodes.length && nodes[end].level>node.level) end++;
      const visible=[...nodes.slice(0,at+1),...nodes.slice(end)];
      const collapsed=decorate(visible,node.id);
      assert.deepEqual(Array.from(collapsed,row=>row.node.id),visible.map(item=>item.id));
      assert.ok(collapsed.every(row=>row.ancestors.length===row.node.level));
    }
    states++;
  }
  // 使用真实treeActions呈现：图标和导线不能新增按钮、权限或动作。
  const setup = `const state={selected:'core',hidden:new Set(),solo:null,collapsed:new Set(),treeView:'expanded'};const icon=n=>'<i>'+n+'</i>';const soloIcon='target';`;
  const functions = text => text.slice(nodesStart,text.indexOf('  function selectedNode(page)'));
  const contexts = [baseline,source].map(text=>{
    const context={window:sandbox.window};vm.createContext(context);
    vm.runInContext(setup+functions(text),context);return context;
  });
  const attrs = html => [...html.matchAll(/\b(data-(?:collapse|select-node|eye|solo|tree-view)="[^"]*"|aria-(?:level|selected|expanded|pressed|label)="[^"]*"|tabindex="[^"]*")/g)].map(match=>match[1]);
  for (const node of nodes) {
    for (const context of contexts) vm.runInContext(`state.selected=${JSON.stringify(node.id)};state.hidden=new Set([${JSON.stringify(node.id)}]);state.solo=${JSON.stringify(node.id)};`,context);
    const html=contexts.map(context=>vm.runInContext(`tree('${page}')`,context));
    assert.deepEqual(attrs(html[1]),attrs(html[0]),'节点操作、ARIA和焦点顺序必须与基准相同');
  }
}
assert.ok(guidesMarkup([{level:1,branch:true,continues:false,active:false}]).includes('aria-hidden="true"'));
const provenance=JSON.parse(read('assets/node-icons/sources.json'));
for (const icon of kindIcons) {
  const entry=provenance.icons[icon];assert.ok(entry,'必须来自登记的官方图标');
  const bytes=readFileSync(new URL('assets/node-icons/'+entry.file,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,'图标不得手改路径');
}
for (const file of ['index.html','screen.html','structure.css','draft.css']) {
  for (const match of read(file).matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"|url\(['"]?([^'"\)]+)['"]?\)/g)) {
    const ref=match[1]||match[2];if(/^(https?:|data:)/.test(ref))continue;
    assert.ok(existsSync(new URL(ref,new URL(file,import.meta.url))),'文件引用必须可达：'+ref);
  }
}
console.log(JSON.stringify({status:'passed',pages:3,selectionCases:states,officialIconTypes:kindIcons.size,controllerOutsideTree:'unchanged',treeActionsAndAria:'same as baseline',browserValidation:'blocked: Work settings disabled'},null,2));
