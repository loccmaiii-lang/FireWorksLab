const t0=Date.now();
const r=await fetch('http://127.0.0.1:17780/gpcli/object/call',{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({path:'/Script/PythonScriptPlugin.Default__PythonScriptLibrary',function:'ExecutePythonCommandEx',args:{PythonCommand:"import unreal\nprint('FWLPING:%s' % unreal.SystemLibrary.get_engine_version())",ExecutionMode:'ExecuteFile',FileExecutionScope:'Private'}}),signal:AbortSignal.timeout(30000)}).then(r=>r.json()).catch(e=>({err:e.message}));
console.log(Date.now()-t0,'ms',JSON.stringify(r).slice(0,600));
