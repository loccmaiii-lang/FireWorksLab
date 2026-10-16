import { request } from '../../资源规范统一_20261016/采集/ue_ro.mjs';
import fs from 'node:fs';
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const out={};
for(const t of ['/Game/Effects/Common/Texture/Trail/T_EFX_ShellTrail_02','/Game/Effects/Common/Texture/Mask/T_EFX_Mask_62']){
 await request('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:t}});
 const p=(await request('/object/get',{path:t+'.'+t.split('/').pop()})).properties;
 const k=['AddressX','AddressY','SRGB','CompressionSettings','LODGroup','MaxTextureSize','Filter','MipGenSettings','ImportedSize','CompressionNoAlpha','bFlipGreenChannel'];
 out[t]=Object.fromEntries(k.filter(x=>x in p).map(x=>[x,p[x]]));
 console.log(t.split('/').pop(), JSON.stringify(out[t]));
}
fs.writeFileSync('tex_read.json',JSON.stringify(out,null,1));
