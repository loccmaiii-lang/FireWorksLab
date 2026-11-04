const fs=require('node:fs');
const {fixture}=require('./check-import-update-backend.cjs');
const {request}=require('./engine_api.cjs');
const {loadBackend}=require('./import-backend.cjs');
(async()=>{
 const t=fixture();await t.run();
 const scripts=t.calls.map(c=>c.body.args?.PythonCommand||'').filter(c=>/FWL_POLICY|FWLBACKUP|ready-to-update/.test(c));
 const code='scripts = '+JSON.stringify(scripts)+'\nfor index,script in enumerate(scripts):\n compile(script,"policy-check-"+str(index),"exec")\nprint("FWLCOMPILE:"+str(len(scripts)))\n';
 // Execute only compile(), never the captured asset-changing scripts.
 const result=await loadBackend(request).py(code);
 console.log(result.join('\n'));
 fs.writeFileSync('./backups/20261006-policy-native-syntax.json',JSON.stringify({result,scriptCount:scripts.length,nativeAssetWrites:0,method:'compile-only, captured scripts never executed'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
