// Isolated navigation contract; never opens a browser, reads a file URL, or calls UE.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/js/67_delivery.js'), 'utf8');

function fixture({protocol = 'file:', hash = '', popup = true, opener = null, motion=false, reduced=false} = {}) {
  const nodes = new Map(), calls = [], child = {closed: false, focus: () => calls.push('child.focus')};
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {id, hidden: false, inert: false, value: 'original-value', dataset: {}, listeners: {},
      classList: {toggle() {}}, addEventListener(type, fn) {this.listeners[type] = fn;},
      setAttribute() {}, getAttribute() {return null;}, focus() {}, append() {}, replaceChildren() {},
      getBoundingClientRect() {return {height: 50};}, querySelector() {return node('summary');}});
    return nodes.get(id);
  }
  node('deliveryWorkspace').hidden = true;
  if(motion)for(const id of ['deliveryWorkspace','main'])node(id).animate=(frames,options)=>{calls.push({animation:id,duration:options.duration});return{cancel(){calls.push({cancel:id})}};};
  const context = vm.createContext({
    document: {getElementById: node, querySelector: node, createElement: node, addEventListener() {}, documentElement: {style: {setProperty() {}}}},
    location: {protocol, hash, origin: protocol === 'file:' ? 'null' : 'http://127.0.0.1:8034'},
    localStorage: new Proxy({}, {get() {throw Error('Original storage must not be read or migrated');}}),
    window: {opener, matchMedia(){return{matches:reduced}},addEventListener() {}, open(url, target) {calls.push({url, target}); return popup ? child : null;}, close() {calls.push('window.close');}},
    ResizeObserver: class {observe() {}},
    fetch: async (url, options) => {
      assert.equal(protocol, 'http:', 'File parent must not use HTTP APIs');
      assert.equal(options?.method, undefined, 'Navigation must not write or execute');
      calls.push({api: url});
      const data = url === '/api/session' ? {outputRoot: 'existing-root', importerAvailable: false} : url === '/api/resources' ? {resources: []} : assert.fail('Unexpected API');
      return {ok: true, json: async () => data};
    }
  });
  vm.runInContext(source, context);
  return {api: vm.runInContext('DeliveryWorkspace', context), node, calls, child};
}

(async () => {
  let f = fixture();
  await f.api.open();
  assert.deepEqual(f.calls, [{url: 'http://127.0.0.1:8034/baker#delivery-from-file', target: '_blank'}]);
  assert.equal(f.node('deliveryWorkspace').hidden, true);
  assert.equal(f.node('main').inert, false);
  assert.equal(f.node('main').value, 'original-value');
  console.log('PASS file parent opens local delivery without API/storage migration');

  await f.api.open();
  assert.equal(f.calls.length, 2); assert.equal(f.calls[1], 'child.focus');
  f.child.closed = true; await f.api.open();
  assert.equal(f.calls.length, 3); assert.equal(f.calls[2].target, '_blank');
  console.log('PASS reuse existing delivery window; reopen only after close');

  f = fixture({popup: false}); f.api.init(); await f.api.open();
  assert.equal(f.node('deliveryWorkspace').hidden, false);
  assert.equal(f.node('deliveryStatus').dataset.error, 'true');
  assert.match(f.node('deliveryStatus').textContent, /启动烘焙器.cmd/);
  f.node('deliveryMake').listeners.click();
  assert.equal(f.node('main').inert, false); assert.equal(f.node('main').value, 'original-value');
  console.log('PASS blocked popup has recoverable guidance and preserves parent values');

  f = fixture({protocol: 'http:', hash: '#delivery-from-file', opener: {postMessage() {},focus() {f.calls.push('opener.focus');}}});
  f.api.init(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.node('deliveryWorkspace').hidden, false);
  assert.deepEqual(f.calls, [{api: '/api/session'}, {api: '/api/resources'}]);
  f.node('deliveryMake').listeners.click();
  assert.deepEqual(f.calls.slice(-2), ['opener.focus', 'window.close']);
  console.log('PASS HTTP handoff auto-enters delivery and returns to its opener without writes');

  f = fixture({protocol: 'http:', hash: '#delivery'}); f.api.init();
  await new Promise(resolve => setImmediate(resolve)); f.node('deliveryMake').listeners.click();
  assert.equal(f.node('main').inert, false); assert.equal(f.node('deliveryWorkspace').hidden, true);
  assert.equal(f.node('main').value, 'original-value'); assert.equal(f.calls.includes('window.close'), false);
  console.log('PASS direct HTTP entry returns within the same maker page');
  f = fixture({protocol:'http:'}); f.api.init();
  await f.api.open(); f.node('deliveryMake').listeners.click(); await f.api.open();
  assert.equal(f.calls.filter(c=>c.api==='/api/resources').length,1,'Repeated view navigation must preserve the initialized importer and avoid duplicate checks');
  assert.equal(f.calls.filter(c=>c.api==='/api/session').length,1);
  console.log('PASS repeated view navigation reuses the prepared workspace without rechecking');
  f=fixture({protocol:'http:',motion:true});f.api.init();await f.api.open();
  const remembered={isConnected:true,disabled:false,focus(){f.calls.push('importer.focus')}};f.node('deliveryFrame').contentDocument={activeElement:remembered};
  f.node('deliveryMake').listeners.click();await f.api.open();
  assert.equal(f.calls.filter(c=>c.cancel).length,2);assert(f.calls.includes('importer.focus'));assert.equal(f.node('main').value,'original-value');
  console.log('PASS rapid return/re-entry cancels previous motion and restores importer focus without changing maker values');
  f=fixture({protocol:'http:',motion:true,reduced:true});f.api.init();await f.api.open();f.node('deliveryMake').listeners.click();
  assert.equal(f.calls.filter(c=>c.animation).length,0);assert.equal(f.node('main').inert,false);
  console.log('PASS reduced motion switches directly and preserves the same navigation state');
  console.log('8 isolated handoff contracts passed; file browser access and UE execution remain untested.');
})().catch(error => {console.error(error); process.exitCode = 1;});
