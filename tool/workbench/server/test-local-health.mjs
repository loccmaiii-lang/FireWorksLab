import assert from 'node:assert/strict';
import {localHealthMiddleware, localHealthPlugin} from './local-health.mjs';

function request(overrides = {}) {
  const res = {headers: {}, statusCode: 200, setHeader(k,v) {this.headers[k]=v}, end(body) {this.body=body}};
  let next = false;
  localHealthMiddleware('F:/test/tool/workbench')({url:'/__fwl_health',method:'GET',headers:{host:'127.0.0.1:8025'},...overrides},res,()=>{next=true});
  return {res,next};
}
const ok=request().res;
assert.deepEqual(JSON.parse(ok.body),{format:'df.workbench-dev/1',root:'F:/test/tool/workbench'});
assert.equal(ok.headers['Cache-Control'],'no-store');
assert.equal(request({url:'/'}).next,true);
assert.equal(request({headers:{host:'other.example:8025'}}).res.statusCode,403);
assert.equal(request({headers:{host:'127.0.0.1:8025',origin:'http://other.example'}}).res.statusCode,403);
assert.equal(request({method:'POST'}).res.statusCode,405);
assert.equal(request({headers:{host:'localhost:8025'}}).res.statusCode,200);
let installed;
localHealthPlugin().configureServer({config:{root:'current-root'},middlewares:{use(fn){installed=fn}}});
assert.equal(typeof installed,'function');
console.log('local health: 8 checks passed');
