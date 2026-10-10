const assert=require('node:assert/strict');const {fixture}=require('./test_baker_handoff.cjs');
(async()=>{
  let f=fixture();const receipt=await f.api.publish(new Blob(['ZIP']),'Test',{recipe:{name:'Test'}});
  assert.equal(receipt.deliveryId,'known');assert.equal(f.node('deliveryWorkspace').hidden,false);assert.equal(f.node('main').inert,true);assert.equal(f.calls.filter(x=>x.command==='publish').length,1);assert(f.calls.some(x=>x.command==='accept'&&x.payload.deliveryId==='known'));console.log('PASS file export automatically reaches the same-page actual checklist');
  f.node('deliveryMake').listeners.click();await f.api.open();assert.equal(f.calls.filter(x=>x.command==='accept').length,1);console.log('PASS export return and re-entry do not reset confirmation or recheck');
  f=fixture();await f.api.open();f.state({busy:true,current:null});await f.api.publish(new Blob(['ZIP']),'Test',{});assert.equal(f.node('deliveryMake').disabled,false);console.log('PASS export receipt does not disable return during native work');
  f=fixture({queued:true});await f.api.open();f.state({busy:true,current:{deliveryId:'older',name:'Running',platform:'pc'}});await f.api.publish(new Blob(['ZIP']),'Test',{});assert.equal(f.node('deliveryTitle').textContent,'Running');f.state({busy:false,current:{deliveryId:'known',name:'Test',platform:'pc'}});assert.equal(f.node('deliveryTitle').textContent,'Test');console.log('PASS queued export keeps running identity until the native importer adopts it');
  assert(!/window\.(open|opener|close)|reserveExportWindow|relayExport/.test(require('node:fs').readFileSync(require('node:path').join(__dirname,'../src/js/67_delivery.js'),'utf8')));console.log('PASS popup, opener relay and page closing removed from production controller');
  console.log('5 embedded export contracts passed; real file browser and UE write acceptance remain separate.');
})().catch(e=>{console.error(e);process.exitCode=1});
