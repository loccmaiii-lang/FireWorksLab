// Run the existing naming/confirmation suite against the NEW delivery entry and storage key.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
let source=fs.readFileSync(path.join(__dirname,'check-import-name-confirmation.cjs'),'utf8');
source=source.replaceAll('df-fx-workbench_v2_locmai.html','df-fireworks-delivery_locmai.html').replaceAll('fwimp.workbench.v2','fwimp.delivery.v1');
// Drain presentation postMessage callbacks before destroying a jsdom window.
source=source.replace('close:()=>dom.window.close()', 'close:()=>dom.window.setTimeout(()=>dom.window.close(),0)');
const m=new Module(path.join(__dirname,'delivery-confirmation-fixture.cjs'),module);
m.filename=path.join(__dirname,'delivery-confirmation-fixture.cjs');m.paths=module.paths;
m._compile(source,m.filename);
