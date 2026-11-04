// Re-run native importer regression suites against the delivery entry without
// rewriting their fixtures, baseline backups, or either HTML file.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const suites=[
 'check-import-pack-compat.cjs','check-import-reuse-compat.cjs',
 'check-import-compat.cjs','check-import-compat-ui.cjs',
 'check-import-selection.cjs','check-import-cutout-selection.cjs',
 'check-import-naming.cjs','check-import-public-names.cjs',
 'check-import-update-backend.cjs','check-import-recovery.cjs',
 'check-import-source-control.cjs','check-import-interrupted.cjs',
 'check-import-policy.cjs','check-import-system-policy.cjs','check-import-system-ui.cjs',
 'check-import-preroll.cjs','check-import-life-modules.cjs','check-import-color-scale.cjs',
 'check-import-name-confirmation.cjs','check-import-workspace.cjs',
 'check-import-shared-recheck.cjs','check-native-persistence.cjs'
];
if(process.argv[2]==='--case'){
 const suite=process.argv[3];process.argv=[process.execPath,path.join(__dirname,suite)];
 const original=path.resolve(__dirname,'../df-fx-workbench_v2_locmai.html');
 const delivery=path.resolve(__dirname,'../df-fireworks-delivery_locmai.html');
 const read=fs.readFileSync;
 fs.readFileSync=function(file,options){
  const resolved=typeof file==='string'?path.resolve(file):'';
  const content=read.call(this,resolved===original?delivery:file,options);
  return typeof content==='string'&&resolved.endsWith('.cjs')
   ?content.replaceAll('fwimp.workbench.v2','fwimp.delivery.v1'):content;
 };
 const jsdom=require('jsdom'),BaseJSDOM=jsdom.JSDOM;
 jsdom.JSDOM=class extends BaseJSDOM{
  constructor(html,options){super(html,{...options,beforeParse(w){
   options.beforeParse?.(w);
   // Browsers discard document microtasks on teardown; emulate that in JSDOM.
   const enqueue=w.queueMicrotask.bind(w),doc=w.document;
   w.queueMicrotask=fn=>enqueue(()=>{if(w.document===doc)fn();});
  }});}
 };
 require(path.join(__dirname,suite));
}else{
 const selected=process.argv.slice(2);
 const results=suites.filter(suite=>!selected.length||selected.includes(suite)).map(suite=>{
  console.log('RUN '+suite);
  const r=spawnSync(process.execPath,[__filename,'--case',suite],{encoding:'utf8',timeout:45000});
  return{suite,status:r.status,error:r.error?.message||'',stdout:r.stdout,stderr:r.stderr};
 });
 const dest=path.join(__dirname,'backups/20261010-import-audit-4967/'+(selected.length?'migration-subset-'+Date.now()+'.json':'migration-results.json'));
 fs.writeFileSync(dest,JSON.stringify(results,null,2));
 for(const r of results){
  console.log((r.status===0?'PASS ':'FAIL ')+r.suite+' '+(r.stdout.match(/PASS /g)||[]).length+' assertions');
  if(r.status!==0)console.log(r.stderr.slice(-2500)||r.error||r.stdout.slice(-1500));
 }
 console.log('Delivery migration suites: '+results.filter(r=>r.status===0).length+'/'+results.length+'; '+dest);
 process.exitCode=results.some(r=>r.status!==0)?1:0;
}
