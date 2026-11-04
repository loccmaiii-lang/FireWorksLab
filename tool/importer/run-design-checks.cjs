const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const folder=path.resolve(__dirname,process.argv[2]||'research/design-20261004');
fs.mkdirSync(folder,{recursive:true});
const scripts=['check-design-layout.cjs','check-design-ui.cjs','check.cjs','check-multi-textures.cjs','check-show.cjs','check-show-export.cjs','check-show-blank.cjs','check-show-fan.cjs','check-show-resource-ids.cjs','check-import-recovery.cjs','check-import-iteration.cjs','check-import-naming.cjs','check-import-calibration.cjs','check-import-name-confirmation.cjs','check-import-update-backend.cjs','check-import-preroll.cjs','check-native-persistence.cjs'];
const results=[];
for(const file of scripts){
  const args=file==='check-design-ui.cjs'?[file,folder]:file==='check-design-layout.cjs'?[file,path.join(folder,'layout-checks.json')]:[file];
  const r=spawnSync(process.execPath,args,{cwd:__dirname,encoding:'utf8',timeout:60000});
  const output=(r.stdout||'')+(r.stderr||'');
  fs.writeFileSync(path.join(folder,file+'.log'),output);
  const count=output.match(/(?:^|\n)\s*(\d+) [^\n]*checks passed/i);
  results.push({file,status:r.status===0?'passed':'failed',reportedGroups:count?Number(count[1]):null,log:file+'.log',error:r.error?.message});
  console.log((r.status===0?'PASS ':'FAIL ')+file+(count?' ('+count[1]+')':''));
  if(r.status!==0)console.log(output.slice(-3500));
}
const approval=path.join(__dirname,'research/calibration-20261002/native-authorization.json');
if(fs.existsSync(approval))results.push({file:'check-native-approval.cjs',status:'skipped',reason:'Existing real authorization; the missing-approval fixture explicitly refuses to erase it. No UE request was made.'});
else{
  const r=spawnSync(process.execPath,['check-native-approval.cjs'],{cwd:__dirname,encoding:'utf8',timeout:60000});
  fs.writeFileSync(path.join(folder,'check-native-approval.cjs.log'),(r.stdout||'')+(r.stderr||''));
  results.push({file:'check-native-approval.cjs',status:r.status===0?'passed':'failed',reportedGroups:null});
}
const report={date:new Date().toISOString(),scope:'Isolated DOM/VM/file fixtures only. All UE requests mocked, no browser rendering or real UE writes.',passedScripts:results.filter(r=>r.status==='passed').length,failedScripts:results.filter(r=>r.status==='failed').length,skippedScripts:results.filter(r=>r.status==='skipped').length,results};
fs.writeFileSync(path.join(folder,'regressions.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passedScripts,failed:report.failedScripts,skipped:report.skippedScripts}));
if(report.failedScripts)process.exitCode=1;
