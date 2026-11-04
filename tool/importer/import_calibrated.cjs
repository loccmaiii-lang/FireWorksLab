const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {request}=require('./engine_api.cjs');
const {loadBackend}=require('./import-backend.cjs');
const {packageFile,verifyDiskSaved}=require('./native-persistence.cjs');
const ROOT=__dirname,REPORT=ROOT+'/research/calibration-20261002',BACKUP=ROOT+'/backups/calibration-20261002';
const TABLES={pc:'/Game/R13N/Common/PC/DataTables/Resource/ResourceFXTable',mobile:'/Game/DataTables/Resource/ResourceFXTable'};
const BP='/Game/BluePrints/ShowDirector/Template/FX/BP_FX_FireWorksShow_Template';
const CDO=BP+'.Default__BP_FX_FireWorksShow_Template_C';
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const save=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2));
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const obj=p=>p+'.'+p.split('/').pop();
const referenceId=item=>item.platform==='mobile'?(item.kind==='trail'?'P_EFX_FireWorks_Trail_01':'P_EFX_FireWorks_Small_Red'):
  (item.kind==='trail'?'P_EFX_FireWorks_NY_Trail_'+item.grade:'P_EFX_FireWorks_GoldSpark');
const exists=async p=>String((await request('/object/call',{path:LIB,function:'DoesAssetExist',args:{AssetPath:p}})).data.return_value)==='True';
const log=message=>{const line=new Date().toISOString()+' '+message;console.log(line);fs.appendFileSync(REPORT+'/native-import.log',line+'\n');};

function recordText(t){
  const number=n=>Number(n).toFixed(6);
  const vector=v=>'(X='+number(v.X)+',Y='+number(v.Y)+',Z='+number(v.Z)+')';
  const entry=e=>'(FXResourceId="'+e.FXResourceId+'",LocalTimeOffset='+number(e.LocalTimeOffset)+',PositionOffset='+vector(e.PositionOffset)+
    ',RotationOffset=(Pitch=0,Yaw=0,Roll=0),RandomPositionRange=(X=0,Y=0,Z=0),RandomRotationRange=(Pitch=0,Yaw=0,Roll=0),EffectScale='+vector(e.EffectScale)+
    ',RandomScaleRatio=0,Filter=(PlatformFlags=14,MinQualityLevel=EQuality_VeryLow))';
  return '(TemplateName="'+t.TemplateName+'",Entries=('+t.Entries.map(entry).join(',')+'))';
}

async function row(resource,platform='pc'){
  const matches=(await request('/datatable/search',{table:TABLES[platform],field:'ResourceId',value:resource,limit:100})).data.matches;
  const exact=matches.filter(r=>r.ResourceId===resource);
  if(exact.length>1)throw Error('Duplicate native ResourceId '+resource);
  return exact[0]||null;
}

async function plan(){
  const data=read(REPORT+'/calibration.json'),backend=loadBackend(request,log),items=[];
  const mobileAudit=read(REPORT+'/mobile-export-checks.json');
  for(const [grade,t] of Object.entries(data.trails))items.push({...t,kind:'trail',grade,platform:'pc'});
  for(const b of data.bursts)items.push({...b,kind:'burst',platform:'pc'});
  for(const item of [...items])items.push({...item,platform:'mobile',as:item.as.replace(/_(\d{2})$/,'Mobile_$1'),pcAs:item.as});
  const occupied=new Set();
  for(const item of items){
    if(item.platform==='mobile'&&item.kind==='burst'){
      const check=mobileAudit.find(c=>c.entry===item.entry);
      if(!check)throw Error('Missing mobile QA report '+item.entry);
      if(!check.grade_diameters_in_requested_range)throw Error('Mobile diameter falls outside requested grade range '+item.entry);
      item.replay_pass=check.pass;item.replay_fails=check.fails;
      item.mobile_native_diameter_m=check.native_diameter_m;item.mobile_grade_diameters_m=check.grade_diameters_m;
    }
    item.specFile=item.platform==='mobile'?'cascade_mobile.json':'cascade.json';
    item.spec=read(item.directory+'/'+item.specFile);
    const errors=backend.validate(item.spec);if(errors.length)throw Error(errors.join('; '));
    for(const t of Object.values(item.spec.textures))if(!fs.existsSync(item.directory+'/'+t.file))throw Error('Missing texture '+t.file);
    item.textureHashes=Object.fromEntries(Object.values(item.spec.textures).map(t=>[t.file,hash(item.directory+'/'+t.file)]));
    item.assets=backend.makePlan(item.spec,item.as);
    item.resourceId=backend.makePlan(item.spec,item.pcAs||item.as).ps.split('/').pop().replace(/_HD$/,'');
    for(const p of Object.values(item.assets)){
      if(occupied.has(p.toLowerCase()))throw Error('Destination name collision '+p);
      occupied.add(p.toLowerCase());if(await exists(p))throw Error('Destination already exists '+p);
    }
    if(await row(item.resourceId,item.platform))throw Error('Resource already exists '+item.resourceId);
    item.referenceId=referenceId(item);
    item.referenceRow=await row(item.referenceId,item.platform);
    if(!item.referenceRow)throw Error('Reference row missing '+item.platform+' '+item.referenceId);
    for(const field of ['ResourceId','FxSP','EffectScale','DelayPlayTime','PlayLifeTime','RowDescription']){
      if(!(field in item.referenceRow))throw Error('Reference row schema missing '+field);
    }
    item.specHash=hash(item.directory+'/'+item.specFile);
  }
  const before=(await request('/object/get',{path:CDO,properties:['EffectSubTemplates']})).data.properties.EffectSubTemplates;
  const templates=[];
  for(const burst of items.filter(i=>i.kind==='burst'&&i.platform==='pc'))for(const [grade,g] of Object.entries(data.grades)){
    const trail=items.find(i=>i.kind==='trail'&&i.grade===grade&&i.platform==='pc');
    const entry=(resource,delay,z,scale)=>({FXResourceId:resource,LocalTimeOffset:delay,PositionOffset:{X:0,Y:0,Z:z},EffectScale:{X:scale,Y:scale,Z:scale}});
    const t={TemplateName:burst.base+'_'+grade,Entries:[entry(trail.resourceId,0,0,1),entry(burst.resourceId,g.rise_s,g.height_m*100,g.diameter_m/burst.native_diameter_m)]};
    if(before.some(x=>x.TemplateName===t.TemplateName))throw Error('Existing child template '+t.TemplateName);
    templates.push(t);
  }
  const result={created:new Date().toISOString(),status:'awaiting_user_frame_channel_decision',materialFrameChannel:0,repositoryRequiredFrameChannel:3,
    workbenchHash:hash(ROOT+'/../df-fx-workbench_v2_locmai.html'),backendHash:hash(ROOT+'/import-backend.cjs'),importerHash:hash(__filename),persistenceHash:hash(ROOT+'/native-persistence.cjs'),items,templates,before};
  save(REPORT+'/native-plan.json',result);
  save(BACKUP+'/bp-before-import.json',before);
  const tableFile='E:/loc_ma5/DFMEditor/DFM/Content/R13N/Common/PC/DataTables/Resource/ResourceFXTable.uasset';
  if(!fs.existsSync(BACKUP+'/ResourceFXTable-PC.uasset'))fs.copyFileSync(tableFile,BACKUP+'/ResourceFXTable-PC.uasset');
  if(!fs.existsSync(BACKUP+'/ResourceFXTable-Mobile.uasset'))fs.copyFileSync('E:/loc_ma5/DFMEditor/DFM/Content/DataTables/Resource/ResourceFXTable.uasset',BACKUP+'/ResourceFXTable-Mobile.uasset');
  console.log(JSON.stringify({packages:items.map(i=>({as:i.as,platform:i.platform,resourceId:i.resourceId,assets:Object.keys(i.assets).length})),templates:templates.map(t=>t.TemplateName)},null,2));
}

async function execute(){
  const p=read(REPORT+'/native-plan.json');
  const approvalFile=REPORT+'/native-authorization.json';
  if(!fs.existsSync(approvalFile))throw Error('Awaiting explicit user approval to use existing frame channel 0; no native writes performed');
  const approval=read(approvalFile);
  if(approval.frameChannel!==0||approval.source!=='direct_user_confirmation'||!approval.userText)throw Error('Missing explicit user frame-channel confirmation');
  if(p.workbenchHash!==hash(ROOT+'/../df-fx-workbench_v2_locmai.html'))throw Error('Workbench changed after name preview');
  if(p.backendHash!==hash(ROOT+'/import-backend.cjs')||p.importerHash!==hash(__filename))throw Error('Importer changed after name preview');
  if(p.persistenceHash!==hash(ROOT+'/native-persistence.cjs'))throw Error('Persistence verification changed after name preview');
  const backend=loadBackend(request,log);
  const evidenceFile=REPORT+'/native-imports.json';
  const evidence=fs.existsSync(evidenceFile)?read(evidenceFile):{started:new Date().toISOString(),items:[]};
  // Files must be locally writable before any further native mutations.
  for(const pkg of [BP,...Object.values(TABLES)])fs.accessSync(packageFile(pkg),fs.constants.W_OK);
  // Repair the known earlier row whose API/readback succeeded but disk save failed.
  for(const item of evidence.items){
    if(item.tableDisk)continue;
    const table=TABLES[item.platform],file=packageFile(table),before=hash(file);
    const saved=await request('/object/call',{path:LIB,function:'SaveAsset',args:{AssetToSave:table,bOnlyIfIsDirty:false}},120000);
    if(String(saved.data.return_value)!=='True')throw Error('Existing progress table save failed '+item.resourceId);
    item.tableDisk=verifyDiskSaved(file,item.resourceId,before);save(evidenceFile,evidence);
    log('DISK VERIFIED '+item.resourceId);
  }
  for(const item of p.items){
    if(evidence.items.some(e=>e.resourceId===item.resourceId&&e.platform===item.platform))continue;
    if(item.specHash!==hash(item.directory+'/'+item.specFile))throw Error('Source changed after name preview');
    for(const [file,expected] of Object.entries(item.textureHashes))if(hash(item.directory+'/'+file)!==expected)throw Error('Texture changed after name preview '+file);
    const base=await row(item.referenceId,item.platform);
    if(!base||JSON.stringify(base)!==JSON.stringify(item.referenceRow))throw Error('Reference row changed after preview');
    if(await row(item.resourceId,item.platform))throw Error('Resource ID occupied after preview');
    for(const target of Object.values(item.assets))if(await exists(target))throw Error('Target occupied after preview '+target);
    log('IMPORT '+item.as);
    await backend.importOne({dir:item.directory,as:item.as,spec:item.spec,assets:item.assets});
    if(item.platform==='mobile')for(const [key,texture] of Object.entries(item.spec.textures)){
      const texturePath=item.assets['tex:'+key];
      const changed=await request('/object/set',{path:obj(texturePath),properties:{bMobileResource:true,DownSampleAmountForMobile:0}});
      if(changed.data?.failed_properties?.length)throw Error('Mobile texture settings rejected');
      const saved=await request('/object/call',{path:LIB,function:'SaveAsset',args:{AssetToSave:texturePath,bOnlyIfIsDirty:false}});
      if(String(saved.data.return_value)!=='True')throw Error('Mobile texture save failed');
    }
    for(const target of Object.values(item.assets))if(!await exists(target))throw Error('Imported asset missing '+target);
    const values={...base};delete values._row_name;
    values.ResourceId=item.resourceId;values.FxSP=obj(item.assets.ps);values.FxSP_Low='None';values.FxSP_High='None';
    values.EffectScale='(X=1.000000,Y=1.000000,Z=1.000000)';values.DelayPlayTime='0.000000';values.PlayLifeTime='0.000000';
    values.CommonSpawnDistance='1500.000000';values.RowDescription='FXTools calibration 20261002 '+item.as+(item.replay_pass===false?' - current recipe QA warnings':'');
    const tableFile=packageFile(TABLES[item.platform]),tableBefore=hash(tableFile);
    const added=await request('/datatable/row/add',{table:TABLES[item.platform],row_name:'FXToolsCal20261002_'+item.as,values,save:true,source_control:false});
    if(added.data?.saved===false)throw Error('Resource row was not saved '+JSON.stringify(added));
    const tableDisk=verifyDiskSaved(tableFile,item.resourceId,tableBefore);
    const actual=await row(item.resourceId,item.platform);if(!actual||actual.FxSP!==obj(item.assets.ps))throw Error('Resource row readback differs');
    evidence.items.push({resourceId:item.resourceId,platform:item.platform,ps:item.assets.ps,row:actual,tableDisk,finished:new Date().toISOString()});save(evidenceFile,evidence);
    log('SAVED '+item.resourceId);
  }
  // Append native child structs individually to preserve concurrent edits to existing entries.
  const appended=[];
  for(const t of p.templates){
    const current=(await request('/object/get',{path:CDO,properties:['EffectSubTemplates']})).data.properties.EffectSubTemplates;
    if(current.some(x=>x.TemplateName===t.TemplateName))throw Error('Template appeared after preview '+t.TemplateName);
    const r=await request('/object/container',{path:CDO,container_path:'EffectSubTemplates',op:'array_append',value:recordText(t)});
    if(!r.data?.ok)throw Error('Child template append failed '+JSON.stringify(r));
    appended.push(t.TemplateName);save(REPORT+'/bp-appended.json',appended);
  }
  const bpBefore=hash(packageFile(BP));
  const saved=await request('/object/call',{path:LIB,function:'SaveAsset',args:{AssetToSave:BP,bOnlyIfIsDirty:false}},120000);
  if(String(saved.data.return_value)!=='True')throw Error('Blueprint save failed');
  const bpDisk=verifyDiskSaved(packageFile(BP),p.templates[0].TemplateName,bpBefore);
  for(const t of p.templates)verifyDiskSaved(packageFile(BP),t.TemplateName);
  const actual=(await request('/object/get',{path:CDO,properties:['EffectSubTemplates']})).data.properties.EffectSubTemplates;
  for(const expected of p.templates){
    const t=actual.find(x=>x.TemplateName===expected.TemplateName);
    if(!t||t.Entries.length!==2)throw Error('Saved child template missing');
    t.Entries.forEach((e,i)=>{
      const wanted=expected.Entries[i];
      for(const k of ['FXResourceId','LocalTimeOffset'])if(typeof wanted[k]==='number'?Math.abs(e[k]-wanted[k])>1e-5:e[k]!==wanted[k])throw Error('Readback mismatch '+k);
      for(const k of ['PositionOffset','EffectScale'])for(const axis of ['X','Y','Z'])if(Math.abs(e[k][axis]-wanted[k][axis])>1e-3)throw Error('Readback mismatch '+k+'.'+axis);
      if(e.RandomScaleRatio!==0)throw Error('Unexpected independent random scale');
    });
  }
  save(REPORT+'/bp-after-import.json',actual);
  save(REPORT+'/native-verification.json',{finished:new Date().toISOString(),resources:evidence.items.map(i=>i.resourceId),templates:p.templates.map(t=>t.TemplateName),bpSaved:true,
    bpFileHash:bpDisk.sha256,bpDisk,nativePlaybackMeasured:false});
  log('Blueprint saved and 21 child templates read back');
}

module.exports={recordText,plan,execute};
if(require.main===module)(process.argv.includes('--execute')?execute():plan()).catch(error=>{log('ERROR '+error.stack);process.exitCode=1;});
