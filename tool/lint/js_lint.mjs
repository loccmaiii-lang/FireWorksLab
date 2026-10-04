// 烘焙器脚本的静态检查（排查计划第 1 步，对话框15，2026-10-04）。
// 云端装不了 eslint（npm 源 403），用 Node 自带的 acorn（node --expose-internals）做同样的三条：
//   no-undef      用到了没有声明的名字（拼写错、删了函数还有人调）→ 错误，构建失败
//   no-redeclare  顶层同一个名字声明两次（后一个悄悄盖掉前一个）→ 错误，构建失败
//   no-unused     函数里声明了却从没读过的局部变量 → 只提示，不失败
// 另外：已经删掉的东西（列在 REMOVED）在代码里还出现 → 错误。
// 用法：node --expose-internals tool/lint/js_lint.mjs tool/FireworkBaker.html [--json]
// 检查的是拼好的整段脚本（和浏览器里跑的一样：PNAMES / PEMIT 这些 build.py 注入的也在里面）。
// 浏览器 / WebGL 的全局名字在 GLOBALS；tool/data/*.js 里定义的名字自动加进来。误报就把名字加进 GLOBALS。
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const acorn = require('internal/deps/acorn/acorn/dist/acorn');

const GLOBALS = new Set(`window self document navigator location console performance requestAnimationFrame cancelAnimationFrame
setTimeout clearTimeout setInterval clearInterval queueMicrotask structuredClone localStorage sessionStorage indexedDB fetch
Blob File FileReader URL URLSearchParams Image ImageData ImageBitmap createImageBitmap OffscreenCanvas HTMLCanvasElement
TextEncoder TextDecoder atob btoa alert confirm prompt Event CustomEvent MouseEvent PointerEvent KeyboardEvent WheelEvent
FocusEvent InputEvent DragEvent ResizeObserver MutationObserver IntersectionObserver getComputedStyle matchMedia crypto
Worker WebGL2RenderingContext WebGLRenderingContext CompressionStream DecompressionStream Response Request Headers
AbortController DOMParser XMLSerializer Node Element HTMLElement HTMLInputElement HTMLSelectElement HTMLDetailsElement
HTMLImageElement HTMLVideoElement Option Audio devicePixelRatio innerWidth innerHeight screen history showSaveFilePicker
showDirectoryPicker showOpenFilePicker caches ClipboardItem DocumentFragment NodeFilter getSelection scrollTo
FormData ReadableStream WritableStream TransformStream SharedArrayBuffer Atomics WebAssembly reportError FontFace
VideoFrame VideoEncoder VideoDecoder EncodedVideoChunk MediaRecorder MediaSource BroadcastChannel MessageChannel`.split(/\s+/));
// JavaScript 内置（取 Node 的 globalThis，去掉 Node 专有的）
for (const k of Object.getOwnPropertyNames(globalThis)) if (!['process', 'Buffer', 'global', 'require', 'module', 'exports', '__dirname', '__filename', 'setImmediate', 'clearImmediate'].includes(k)) GLOBALS.add(k);
['undefined', 'NaN', 'Infinity', 'globalThis', 'arguments'].forEach(k => GLOBALS.add(k));

// 已经删掉、不该再出现的名字（标识符、属性名或字符串里），删东西时往这里加
const REMOVED = [
  ['x-engine', '4.3.2 去掉了模拟内核下拉（只剩 GPU）'], ['paramNav', '4.4.0 去掉了分组定位下拉（发射器标签取代）'],
  ['P43_GROUPS', '4.4.0 面板改按发射器表排'], ['P43_MODULE_GROUP', '4.4.0'], ['pMoreOpen', '4.4.0 没有「更多」了'],
  ['focusParameterSection', '4.4.0'], ['syncParameterNav', '4.4.0'], ['parameterSections', '4.4.0'],
  ['expoMode', '4.3 去掉 3.7 曝光'], ['expoQ', '4.3'], ['qKernel', '4.3 只剩一个渲染核'], ['qCore', '4.3'], ['data-v43', '4.3 只有一个面板'],
];

const [, , file, ...flags] = process.argv;
const html = readFileSync(file, 'utf8');
const m = html.match(/<script>\n'use strict';\n([\s\S]*)<\/script>\s*<\/body>/);
if (!m) { console.error('找不到主脚本'); process.exit(2); }
const src = "'use strict';\n" + m[1], lineOff = html.slice(0, m.index).split('\n').length;   // 报行号时换算成 html 里的行

// tool/data/*.js（review.js / standard.js）定义的名字
for (const f of [...html.matchAll(/<script src="(data\/[^"]+)"><\/script>/g)].map(x => x[1])) {
  let s = ''; try { s = readFileSync(new URL('../' + f, import.meta.url), 'utf8'); } catch (e) { continue; }
  for (const x of s.matchAll(/(?:^|[;\n])\s*(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/g)) GLOBALS.add(x[1]);
  for (const x of s.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) GLOBALS.add(x[1]);
}

let ast;
try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowHashBang: true }); }
catch (e) { console.error(`语法错误：${e.message}（html 第 ${e.loc ? e.loc.line + lineOff : '?'} 行）`); process.exit(1); }

const errors = [], warns = [];
const at = n => n.loc.start.line + lineOff;
// ---- 作用域 ----
class Scope { constructor(parent, fn) { this.parent = parent; this.fn = fn; this.names = new Map(); } }
const declare = (scope, id, kind) => {
  const prev = scope.names.get(id.name);
  if (prev && scope.parent === null && (kind === 'function' || prev.kind === 'function' || (kind === 'var' && prev.kind === 'var')))
    errors.push(`no-redeclare：顶层「${id.name}」声明了两次（第 ${at(prev.node)} 行和第 ${at(id)} 行），后一个会盖掉前一个`);
  if (!prev) scope.names.set(id.name, { kind, node: id, reads: 0 });
};
const patIds = (p, out = []) => {
  if (!p) return out;
  switch (p.type) {
    case 'Identifier': out.push(p); break;
    case 'ObjectPattern': for (const q of p.properties) patIds(q.type === 'RestElement' ? q.argument : q.value, out); break;
    case 'ArrayPattern': for (const q of p.elements) patIds(q, out); break;
    case 'RestElement': patIds(p.argument, out); break;
    case 'AssignmentPattern': patIds(p.left, out); break;
  }
  return out;
};
const fnScopeOf = s => { while (!s.fn) s = s.parent; return s; };
// 先收集一个块 / 函数体里的声明（var 和函数声明提到函数作用域，let / const / class 留在块里）
function hoist(body, scope) {
  const visitVar = n => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(visitVar); return; }
    if (n.type === 'VariableDeclaration' && n.kind === 'var') for (const d of n.declarations) for (const id of patIds(d.id)) declare(fnScopeOf(scope), id, 'var');
    if (/Function/.test(n.type) || n.type === 'ClassBody') return;
    for (const k in n) if (k !== 'loc' && k !== 'start' && k !== 'end' && n[k] && typeof n[k] === 'object') visitVar(n[k]);
  };
  visitVar(body);
  for (const st of body) {
    if (st.type === 'FunctionDeclaration') declare(scope, st.id, 'function');
    else if (st.type === 'ClassDeclaration') declare(scope, st.id, 'class');
    else if (st.type === 'VariableDeclaration' && st.kind !== 'var') for (const d of st.declarations) for (const id of patIds(d.id)) declare(scope, id, st.kind);
  }
}
const lookup = (scope, name) => { for (let s = scope; s; s = s.parent) if (s.names.has(name)) return s.names.get(name); return null; };
const ref = (scope, id, typeofCtx = false) => {
  const d = lookup(scope, id.name);
  if (d) { d.reads++; return; }
  if (GLOBALS.has(id.name) || typeofCtx) return;
  errors.push(`no-undef：「${id.name}」没有定义（html 第 ${at(id)} 行）`);
};
function visit(n, scope) {
  if (!n || typeof n !== 'object') return;
  if (Array.isArray(n)) { n.forEach(x => visit(x, scope)); return; }
  switch (n.type) {
    case 'Program': { hoist(n.body, scope); visit(n.body, scope); return; }
    case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': {
      const fs = new Scope(scope, true);
      if (n.type === 'FunctionExpression' && n.id) declare(fs, n.id, 'fname');
      for (const p of n.params) for (const id of patIds(p)) { declare(fs, id, 'param'); }
      for (const p of n.params) visitPatternDefaults(p, fs);
      if (n.body.type === 'BlockStatement') { hoist(n.body.body, fs); visit(n.body.body, fs); } else visit(n.body, fs);
      unused(fs); return;
    }
    case 'BlockStatement': case 'StaticBlock': { const bs = new Scope(scope, false); hoist(n.body, bs); visit(n.body, bs); unused(bs); return; }
    case 'ForStatement': case 'ForInStatement': case 'ForOfStatement': {
      const ls = new Scope(scope, false);
      const init = n.type === 'ForStatement' ? n.init : n.left;
      if (init && init.type === 'VariableDeclaration' && init.kind !== 'var') for (const d of init.declarations) for (const id of patIds(d.id)) declare(ls, id, init.kind);
      for (const k of ['init', 'left', 'test', 'update', 'right', 'body']) if (n[k]) visit(n[k], ls);
      return;
    }
    case 'CatchClause': { const cs = new Scope(scope, false); for (const id of patIds(n.param)) declare(cs, id, 'param'); visit(n.body, cs); return; }
    case 'ClassDeclaration': case 'ClassExpression': {
      const cs = new Scope(scope, false); if (n.type === 'ClassExpression' && n.id) declare(cs, n.id, 'class');
      if (n.superClass) visit(n.superClass, scope);
      for (const el of n.body.body) { if (el.computed) visit(el.key, cs); if (el.value) visit(el.value, cs); if (el.type === 'StaticBlock') visit(el.body, cs); }
      return;
    }
    case 'VariableDeclaration': for (const d of n.declarations) { visitPatternDefaults(d.id, scope); if (d.init) visit(d.init, scope); } return;
    case 'Identifier': ref(scope, n); return;
    case 'MemberExpression': visit(n.object, scope); if (n.computed) visit(n.property, scope); return;
    case 'Property': if (n.computed) visit(n.key, scope); visit(n.value, scope); return;
    case 'PropertyDefinition': case 'MethodDefinition': if (n.computed) visit(n.key, scope); visit(n.value, scope); return;
    case 'LabeledStatement': visit(n.body, scope); return;
    case 'BreakStatement': case 'ContinueStatement': return;
    case 'UnaryExpression': if (n.operator === 'typeof' && n.argument.type === 'Identifier') { ref(scope, n.argument, true); return; } visit(n.argument, scope); return;
    case 'MetaProperty': return;
    case 'AssignmentExpression': visitPatternRefs(n.left, scope); visit(n.right, scope); return;
  }
  for (const k in n) if (k !== 'loc' && k !== 'start' && k !== 'end' && k !== 'type' && n[k] && typeof n[k] === 'object') visit(n[k], scope);
}
// 解构模式：声明里只看默认值和计算属性；赋值左边里的名字是引用
function visitPatternDefaults(p, scope) {
  if (!p) return;
  if (p.type === 'AssignmentPattern') { visitPatternDefaults(p.left, scope); visit(p.right, scope); }
  else if (p.type === 'ObjectPattern') for (const q of p.properties) { if (q.type === 'RestElement') visitPatternDefaults(q.argument, scope); else { if (q.computed) visit(q.key, scope); visitPatternDefaults(q.value, scope); } }
  else if (p.type === 'ArrayPattern') p.elements.forEach(q => visitPatternDefaults(q, scope));
  else if (p.type === 'RestElement') visitPatternDefaults(p.argument, scope);
}
function visitPatternRefs(p, scope) {
  if (!p) return;
  if (p.type === 'Identifier') { ref(scope, p); return; }
  if (p.type === 'MemberExpression') { visit(p, scope); return; }
  if (p.type === 'AssignmentPattern') { visitPatternRefs(p.left, scope); visit(p.right, scope); return; }
  if (p.type === 'ObjectPattern') { for (const q of p.properties) { if (q.type === 'RestElement') visitPatternRefs(q.argument, scope); else { if (q.computed) visit(q.key, scope); visitPatternRefs(q.value, scope); } } return; }
  if (p.type === 'ArrayPattern') { p.elements.forEach(q => visitPatternRefs(q, scope)); return; }
  if (p.type === 'RestElement') { visitPatternRefs(p.argument, scope); return; }
  visit(p, scope);
}
function unused(scope) {
  for (const [name, d] of scope.names) if (!d.reads && !['param', 'fname'].includes(d.kind) && !name.startsWith('_'))
    warns.push(`no-unused：「${name}」声明了没用到（html 第 ${at(d.node)} 行）`);
}

const top = new Scope(null, true);
visit(ast, top);
// 已删掉的东西：标识符 / 属性名 / 字符串里出现
for (const tok of acorn.tokenizer(src, { ecmaVersion: 'latest', locations: true })) {
  const v = tok.type.label === 'name' || tok.type.label === 'string' || tok.type.label === 'template' ? String(tok.value) : '';
  if (!v) continue;
  for (const [w, why] of REMOVED) if (v === w || (tok.type.label !== 'name' && v.includes(w))) errors.push(`已删掉的「${w}」还在（html 第 ${at(tok)} 行；${why}）`);
}
// html 里的部分（不在脚本里）也查一下
const htmlOnly = html.slice(0, m.index);
for (const [w, why] of REMOVED) if (htmlOnly.includes(w)) errors.push(`已删掉的「${w}」还在 html / css 里（${why}）`);

const uniq = a => [...new Set(a)];
const E = uniq(errors), W = uniq(warns);
if (flags.includes('--json')) { console.log(JSON.stringify({ errors: E, warnings: W }, null, 1)); process.exit(E.length ? 1 : 0); }
for (const e of E) console.log('❌ ' + e);
if (flags.includes('--warn')) for (const w of W) console.log('⚠ ' + w);
console.log(`脚本静态检查：${E.length} 个错误、${W.length} 个提示${W.length && !flags.includes('--warn') ? '（--warn 看提示）' : ''}`);
process.exit(E.length ? 1 : 0);
