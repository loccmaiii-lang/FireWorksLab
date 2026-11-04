const fs=require('node:fs');
const vm=require('node:vm');
const {performance}=require('node:perf_hooks');

function loadBackend(api,log=()=>{},options={}){
  const html=fs.readFileSync(options.htmlFile||__dirname+'/../df-fx-workbench_v2_locmai.html','utf8');
  const start=html.indexOf('const FwImporter = (function(){');
  const exportLine=html.slice(start).match(/^  return\{(?:deliveryView,selectDeliveryPlatform,acceptDelivery,deliveryState,|acceptDelivery,deliveryState,)?init,preview,execute,finish,refresh,view,filter,selectAll,/m);
  const end=exportLine?start+exportLine.index:-1;
  if(start<0||end<0)throw Error('Workbench importer boundary changed');
  const source=html.slice(start,end)+`return{MAP,MOD,validate,makePlan,importOne,props,setp,cont,spawn,keep,py,collectPlannedTextures,
    texturePolicy:typeof texturePolicy==='function'?texturePolicy:undefined,
    assertImportDirectories:typeof assertImportDirectories==='function'?assertImportDirectories:undefined,
    applyTexturePolicy:typeof applyTexturePolicy==='function'?applyTexturePolicy:undefined,
    applyMaterialPolicy:typeof applyMaterialPolicy==='function'?applyMaterialPolicy:undefined,
    texturePolicyErrors:typeof texturePolicyErrors==='function'?texturePolicyErrors:undefined,
    materialPolicyErrors:typeof materialPolicyErrors==='function'?materialPolicyErrors:undefined,
    guard,
    applyDissolveMaterialPolicy:typeof applyDissolveMaterialPolicy==='function'?applyDissolveMaterialPolicy:undefined,
    planTextureReuse:typeof planTextureReuse==='function'?planTextureReuse:undefined,
    textureReuseIdentity:typeof textureReuseIdentity==='function'?textureReuseIdentity:undefined,
    deliveryFingerprintProofs:typeof deliveryFingerprintProofs==='function'?deliveryFingerprintProofs:undefined,
    deliveryMergedProofs:typeof deliveryMergedProofs==='function'?deliveryMergedProofs:undefined,
    readTextureProof:typeof readTextureProof==='function'?readTextureProof:undefined,
    verifyTextureReuse:typeof verifyTextureReuse==='function'?verifyTextureReuse:undefined,
    writeAssetEntries:typeof writeAssetEntries==='function'?writeAssetEntries:undefined,
    particleSystemPolicy:typeof particleSystemPolicy==='function'?particleSystemPolicy:undefined,
    gpuDrawLimits:typeof gpuDrawLimits==='function'?gpuDrawLimits:undefined,
    gpuEmitterKey:typeof gpuEmitterKey==='function'?gpuEmitterKey:undefined,
    verifyParticleSystemPolicy:typeof verifyParticleSystemPolicy==='function'?verifyParticleSystemPolicy:undefined,
    importEmitters:typeof importEmitters==='function'?importEmitters:undefined,
    saveCreatedAssets:typeof saveCreatedAssets==='function'?saveCreatedAssets:undefined,
    readPack:typeof readPack==='function'?readPack:undefined,
    readUpdateTargets:typeof readUpdateTargets==='function'?readUpdateTargets:undefined,
    validateUpdateTargets:typeof validateUpdateTargets==='function'?validateUpdateTargets:undefined,
    swapEmitters:typeof swapEmitters==='function'?swapEmitters:undefined};\n})();\nFwImporter;`;
  const memory=new Map();
  const context={api,log,performance,console,setTimeout,clearTimeout,Date,
    ASSET_LIB:'/Script/EditorScriptingUtilities.Default__EditorAssetLibrary',
    GAMEPLAY:'/Script/Engine.Default__GameplayStatics',
    localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)},
    document:{},Workbench:{busy:false},beginReadCache:()=>{},endReadCache:()=>{}};
  return vm.runInNewContext(source,context,{filename:'local-import-backend.js'});
}

module.exports={loadBackend};
