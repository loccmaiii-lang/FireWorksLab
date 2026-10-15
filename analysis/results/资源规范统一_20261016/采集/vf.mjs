import fs from 'node:fs'; import { request } from './ue_ro.mjs';
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary'; const out={};
for (const p of ['/Game/Effects_HD/Common_HD/VField_HD/VF_EFX_SNoise_Random_01_HD.VF_EFX_SNoise_Random_01_HD','/Game/Effects_HD/Common_HD/VField_HD/VF_EFX_SNoise_01_HD.VF_EFX_SNoise_01_HD']){
 await request('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:p.split('.')[0]}});
 const o=await request('/object/get',{path:p,properties:['Intensity','Bounds','SizeX','SizeY','SizeZ','bAllowCPUAccess']}); out[p]=o.properties; }
fs.writeFileSync('vectorfields.json',JSON.stringify(out,null,1)); console.log(JSON.stringify(out));
