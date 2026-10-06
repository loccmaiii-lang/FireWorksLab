// 4.9.12 离线呈现回归。只执行纯函数，不启动浏览器，不作实机/画质验收结论。
// node --expose-internals tool/lint/inspector_reference_check.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const acorn = require('internal/deps/acorn/acorn/dist/acorn');
const root = new URL('../../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
// 最小元素替身仅用于提交事件与数据验证，不测 CSS、布局或浏览器控件行为。
class Control {
  constructor(tag) { this.tagName = tag; this.children = []; this.events = {}; this.attrs = {}; this.style = {}; this.className = ''; this.classList = { add: n => { this.className += ' ' + n; } }; }
  set innerHTML(value) { assert.equal(value, ''); this.children = []; }
  append(...nodes) { this.children.push(...nodes); }
  appendChild(node) { this.children.push(node); return node; }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(k, fn) { (this.events[k] ||= []).push(fn); }
  send(k) { for (const fn of this.events[k] || []) fn(); }
}
const context = vm.createContext({ clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)), document: { createElement: tag => new Control(tag) }, state: { activeStage: 0, P: { burn: 2 } }, IGNITE_ORANGE: '#ff6600' });
for (const [path, names] of [
  ['tool/src/js/20_sim.js', ['parseCurve', 'lifeCurveAt']],
  ['tool/src/js/70_ui.js', ['inspectorNavItems', 'inspectorCurveHTML', 'stageEditor', 'colorPair']]
]) {
  const src = read(path), nodes = acorn.parse(src, { ecmaVersion: 'latest' }).body;
  for (const name of names) {
    const node = nodes.find(n => n.type === 'FunctionDeclaration' && n.id.name === name);
    assert.ok(node, name); vm.runInContext(src.slice(node.start, node.end), context);
  }
}
const plain = x => JSON.parse(JSON.stringify(x));
const emitters = JSON.parse(read('analysis/命名/发射器表.json'))['发射器'].map(e => e['名']);
let checks = 0;
const subsets = [[], ['星'], ['星', '火花', '输出', '全部'], emitters, emitters.slice().reverse(), ['自定义 1', '自定义 2', ...emitters, '全部']];
for (const names0 of subsets) {
  const names = [...new Set(names0)];
  for (const current of [...names, '', '不存在']) {
    const nav = plain(context.inspectorNavItems(names, current));
    assert.equal(nav.shown.length, Math.min(names.length, 4));
    assert.equal(new Set([...nav.shown, ...nav.more]).size, names.length);
    assert.deepEqual([...nav.shown, ...nav.more].sort(), [...names].sort());
    if (names.includes(current)) assert.ok(nav.shown.includes(current), `当前项被藏掉：${current}`);
    assert.ok(nav.more.every(n => !nav.shown.includes(n)));
    checks++;
  }
}
for (const text of ['', '0:1, .3:2, 1:.6', '.2:.5,.8:1.5', '0:-2,1:-1', '1:3,0:1', '0:0,.5:1,.5:2,1:0', '.4:7']) {
  const keys = context.parseCurve(text), html = context.inspectorCurveHTML(keys);
  assert.ok(html.includes('role="img"') && !/NaN|Infinity/.test(html));
  const points = /<polyline[^>]*points="([^"]+)"/.exec(html)[1].split(' ').map(p => p.split(',').map(Number));
  const ks = plain(keys) || [[0, 1], [1, 1]], lo = Math.min(0, ...ks.map(k => k[1])), hi = Math.max(1, ...ks.map(k => k[1]));
  assert.equal(points[0][0], 30); assert.equal(points.at(-1)[0], 246);
  // 图中各非重复时刻应与实际引擎取曲线值一致，防止只画一个装饰性形状。
  for (const t of [0, .13, .41, .77, 1]) {
    const px = 30 + 216 * t;
    const j = points.findIndex(p => p[0] >= px);
    const a = points[Math.max(0, j - 1)], b = points[j];
    const y = b[0] === a[0] ? b[1] : a[1] + (b[1] - a[1]) * (px - a[0]) / (b[0] - a[0]);
    const value = lo + (82 - y) / 68 * (hi - lo);
    assert.ok(Math.abs(value - context.lifeCurveAt(keys, t)) < .001, `曲线 ${text} @${t}`);
  }
  checks++;
}
const host = new Control('div'), material = { stages: [[0, '#112233'], [2, '#445566'], [3, '#778899']] };
let commits = 0;
context.stageEditor(host, material, 4.2, () => commits++, null);
assert.equal(host.children[0].children[2].disabled, true);
assert.equal(host.children[0].children.at(-1).disabled, true);
const second = host.children[1].children[2]; second.valueAsNumber = 12; second.send('change');
assert.deepEqual(material.stages.map(s => s[0]), [0, 3, 4.2]); assert.equal(commits, 1);
const invalid = host.children[1].children[2]; invalid.valueAsNumber = NaN; invalid.send('change');
assert.equal(material.stages[1][0], 3); assert.equal(invalid.value, '3.00'); assert.equal(commits, 1);
const negative = host.children[1].children[2]; negative.valueAsNumber = -2; negative.send('change');
assert.deepEqual(material.stages.map(s => s[0]), [0, 0, 4.2]); assert.equal(commits, 2);
context.stageEditor(host, material, 4.2, null, 'layer-1');
assert.equal(host.children[1].children[2].type, 'range', '组合里的紧凑编辑器保留原滑杆');
const ramp = new Control('div'); ramp.id = 'matColors';
const colors = { a: '#112233', b: '#445566' };
context.colorPair(ramp, '渐变图', [['a', '暗'], ['b', '亮']], colors, null);
assert.equal(ramp.children[1].style.background, 'linear-gradient(90deg,#112233,#445566)');
const swatch = ramp.children[2].children[0]; swatch.children[1].value = '#abcdef'; swatch.children[1].send('input');
assert.equal(colors.a, '#abcdef'); assert.equal(swatch.children[2].textContent, '#ABCDEF');
assert.equal(ramp.children[1].style.background, 'linear-gradient(90deg,#abcdef,#445566)');
checks += 7;
console.log(`检查器离线回归：${checks} 个场景通过（导航、曲线一致性、颜色时间提交及色带同步）。不含实机审阅。`);
