// Verify saved native objects against the exact reviewed import plan.
const fs=require('node:fs');
const crypto=require('node:crypto');
const {request}=require('./engine_api.cjs');
const {loadBackend}=require('./import-backend.cjs');
const ROOT=__dirname, REPORT=ROOT+'/research/calibration-20261002';
const BP='/Game/BluePrints/ShowDirector/Template/FX/BP_FX_FireWorksShow_Template';
const TABLES={pc:'/Game/R13N/Common/PC/DataTables/Resource/ResourceFXTable',mobile:'/Game/DataTables/Resource/ResourceFXTable'};
const plan=JSON.parse(fs.readFileSync(REPORT+'/native-plan.json','utf8'));
const backend=loadBackend(request);
const checks=[],errors=[],snapshots=[];
const objectPath=p=>p+'.'+p.split('/').pop();
const diskPath=p=>'E:/loc_ma5/DFMEditor/DFM/Content/'+p.slice('/Game/'.length)+'.uasset';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const get=async(path,properties)=>(await request('/object/get',{path,properties})).data.properties;
function check(value,context){checks.push({context,pass:!!value});if(!value)errors.push(context);}
function close(actual,expected){
  if(typeof expected==='number')return Number.isFinite(Number(actual))&&Math.abs(Number(actual)-expected)<=Math.max(0.0005,Math.abs(expected)*0.000002);
  if(Array.isArray(expected))return expected.every((n,i)=>close(actual?.[['X','Y','Z'][i]],n));
  return actual===expected;
}
async function distribution(raw,expected,context,gpu){
  check(!!raw?.Distribution?.path,context+' distribution reference');
  if(!raw?.Distribution?.path)return;
  const value=await get(raw.Distribution.path,['Constant','Min','Max','ConstantCurve','bCanBeBaked']);
  snapshots.push({path:raw.Distribution.path,properties:value});
  if('const' in expected)check(close(value.Constant,expected.const),context+' constant');
  if('uniform' in expected){check(close(value.Min,expected.uniform[0]),context+' uniform min');check(close(value.Max,expected.uniform[1]),context+' uniform max');}
  if('curve' in expected){
    const points=value.ConstantCurve?.Points;
    check(Array.isArray(points)&&points.length===expected.curve.length,context+' key count');
    if(Array.isArray(points))expected.curve.forEach(([t,v],i)=>{
      check(close(points[i]?.InVal,t)&&close(points[i]?.OutVal,v),context+' key '+i);
      check(points[i]?.InterpMode==='CIM_Linear',context+' linear key '+i);
    });
  }
  if(!(expected.bake!==undefined?expected.bake:gpu))check(value.bCanBeBaked===false,context+' CPU distribution unbaked');
}
async function verifyItem(item){
  const context=item.platform+' '+item.as;
  const files=[];
  for(const [key,path] of Object.entries(item.assets)){
    const file=diskPath(path),exists=fs.existsSync(file);
    check(exists,context+' disk '+key);
    if(exists){const stat=fs.statSync(file);check(stat.size>0,context+' nonempty '+key);files.push({key,path,file,bytes:stat.size,sha256:hash(file),modified:stat.mtime.toISOString()});}
  }
  const matches=(await request('/datatable/search',{table:TABLES[item.platform],field:'ResourceId',value:item.resourceId,limit:100})).data.matches.filter(r=>r.ResourceId===item.resourceId);
  check(matches.length===1,context+' unique resource row');
  check(matches[0]?.FxSP===objectPath(item.assets.ps),context+' resource targets native PS');
  const ps=await get(objectPath(item.assets.ps),['Emitters','LODDistances','LODSettings']);
  snapshots.push({path:objectPath(item.assets.ps),properties:ps});
  check(ps.Emitters?.length===item.spec.emitters.length,context+' complete emitter count');
  check(ps.LODDistances?.length>0&&ps.LODSettings?.length>0,context+' valid LOD arrays');
  for(const [index,expected] of item.spec.emitters.entries()){
    const emitterRef=ps.Emitters?.[index];if(!emitterRef){continue;}
    const emitter=await get(emitterRef.path,['EmitterName','LODLevels']);
    check(emitter.EmitterName===expected.name,context+' emitter '+index+' name');
    check(emitter.LODLevels?.length===1,context+' emitter '+index+' LOD count');
    if(!emitter.LODLevels?.[0])continue;
    const lod=await get(emitter.LODLevels[0].path,['RequiredModule','SpawnModule','Modules','TypeDataModule','bEnabled']);
    check(lod.bEnabled===true,context+' emitter '+index+' enabled');
    const required=await get(lod.RequiredModule.path,['EmitterDuration','EmitterDelay','EmitterLoops','bUseInLocalSpace','Material','CutoutTexture','ScreenAlignment']);
    snapshots.push({path:lod.RequiredModule.path,properties:required});
    const rq=expected.required||{};
    for(const [a,b] of [['duration_s','EmitterDuration'],['delay_s','EmitterDelay'],['loops','EmitterLoops'],['local_space','bUseInLocalSpace']])if(a in rq)check(close(required[b],rq[a]),context+' '+expected.name+' '+b);
    check(required.Material?.path===objectPath(item.assets['mat:'+expected.material])||required.Material?.path===backend.MAP.material_roles[item.spec.materials[expected.material].role]?.use,context+' '+expected.name+' material');
    if(rq.cutout)check(required.CutoutTexture?.path===objectPath(item.assets['tex:'+rq.cutout]),context+' '+expected.name+' cutout');
    check(lod.Modules?.length===expected.modules.length+(rq.pivot_offset?1:0),context+' '+expected.name+' module count');
    for(const [moduleIndex,md] of expected.modules.entries()){
      const ref=lod.Modules?.[moduleIndex];if(!ref){check(false,context+' missing module '+md.m);continue;}
      check(ref.class===backend.MOD[md.m],context+' '+expected.name+' '+md.m+' class');
      const properties=await get(ref.path,['LODValidity',...Object.keys(md).filter(k=>k!=='m'),'DynamicParams']);
      snapshots.push({path:ref.path,properties});
      check(properties.LODValidity===1,context+' '+expected.name+' '+md.m+' LOD validity');
      if(md.m==='DynamicParameter'){
        const dyn=backend.MAP.dynamic_params;
        check(properties.DynamicParams?.length===dyn.names.length,context+' '+expected.name+' dynamic channel count');
        for(let channel=0;channel<dyn.names.length;channel++){
          const role=Object.keys(dyn.roles).find(r=>dyn.roles[r]===channel),wanted=md.params?.[role]||{const:dyn.defaults[channel]},actual=properties.DynamicParams?.[channel];
          check(actual?.ParamName===dyn.names[channel],context+' '+expected.name+' channel '+channel+' name');
          await distribution(actual?.ParamValue,wanted,context+' '+expected.name+' dynamic '+channel,!!expected.gpu);
        }
      }else for(const [key,wanted] of Object.entries(md)){
        if(key==='m')continue;
        if(wanted&&typeof wanted==='object'&&!Array.isArray(wanted)&&['const','uniform','curve'].some(k=>k in wanted))await distribution(properties[key],wanted,context+' '+expected.name+' '+md.m+'.'+key,!!expected.gpu);
        else check(close(properties[key],wanted),context+' '+expected.name+' '+md.m+'.'+key);
      }
    }
    if(rq.pivot_offset){
      const pivot=lod.Modules?.[expected.modules.length];check(pivot?.class==='ParticleModulePivotOffset',context+' '+expected.name+' pivot module');
      if(pivot){const value=await get(pivot.path,['PivotOffset']);check(close(value.PivotOffset?.X,rq.pivot_offset[0])&&close(value.PivotOffset?.Y,rq.pivot_offset[1]),context+' '+expected.name+' pivot values');}
    }
  }
  for(const [key,texture] of Object.entries(item.spec.textures))if(item.platform==='mobile'){
    const value=await get(objectPath(item.assets['tex:'+key]),['bMobileResource','DownSampleAmountForMobile']);
    check(value.bMobileResource===true&&value.DownSampleAmountForMobile===0,context+' '+key+' mobile texture settings');
  }
  console.log(context+' verified');return {as:item.as,platform:item.platform,files,row:matches[0]};
}
async function main(){
  const items=[];
  for(const item of plan.items)items.push(await verifyItem(item));
  const actual=(await get(BP+'.Default__BP_FX_FireWorksShow_Template_C',['EffectSubTemplates'])).EffectSubTemplates;
  check(JSON.stringify(actual.slice(0,plan.before.length))===JSON.stringify(plan.before),'Existing BP templates preserved exactly');
  for(const expected of plan.templates){
    const matches=actual.filter(t=>t.TemplateName===expected.TemplateName);check(matches.length===1,expected.TemplateName+' appears once');
    const t=matches[0];check(t?.Entries?.length===2,expected.TemplateName+' paired entries');
    t?.Entries?.forEach((entry,index)=>{
      const e=expected.Entries[index];if(!e)return;
      check(entry.FXResourceId===e.FXResourceId&&close(entry.LocalTimeOffset,e.LocalTimeOffset),expected.TemplateName+' ID/time '+index);
      for(const field of ['PositionOffset','EffectScale'])for(const axis of ['X','Y','Z'])check(close(entry[field]?.[axis],e[field][axis]),expected.TemplateName+' '+index+' '+field+'.'+axis);
      check(entry.RandomScaleRatio===0&&Object.values(entry.RandomPositionRange).every(n=>n===0)&&Object.values(entry.RandomRotationRange).every(n=>n===0),expected.TemplateName+' paired zero independent randomness '+index);
    });
  }
  const packages=[BP,...Object.values(TABLES)].map(p=>{const file=diskPath(p);check(fs.existsSync(file),'Saved native package '+p);return {package:p,file,bytes:fs.statSync(file).size,sha256:hash(file)};});
  const report={finished:new Date().toISOString(),pass:errors.length===0,checks:checks.length,errors,items,packages,bpCount:actual.length,bpOriginalCount:plan.before.length,templates:plan.templates.map(t=>t.TemplateName),frameChannel:backend.MAP.dynamic_params.roles.frame,nativePlaybackMeasured:false,editorRestartVerified:false};
  fs.writeFileSync(REPORT+'/native-deep-verification.json',JSON.stringify(report,null,2));
  fs.writeFileSync(REPORT+'/native-module-snapshots.json',JSON.stringify(snapshots,null,2));
  console.log(JSON.stringify({pass:report.pass,checks:report.checks,errors:report.errors,bpCount:report.bpCount,assets:items.reduce((n,i)=>n+i.files.length,0)}));
  if(errors.length)process.exitCode=1;
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
