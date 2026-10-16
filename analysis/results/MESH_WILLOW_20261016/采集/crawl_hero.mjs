// 只读：P_EFX_FireWorks_Hero_HD（2.0 新年烟花_大金）整包子对象 + 外部引用的材质实例 / 网格属性。不写、不保存、不播放。
import fs from 'node:fs';
import { request, LOG } from '../../资源规范统一_20261016/采集/ue_ro.mjs';
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const ROOTS=['/Game/Effects_HD/Props_HD/FireWorks_HD/P_EFX_FireWorks_Hero_HD.P_EFX_FireWorks_Hero_HD'];
const objects={}, errors=[];
const refsIn=(v,acc=[])=>{if(Array.isArray(v))v.forEach(x=>refsIn(x,acc));else if(v&&typeof v==='object'){if(v._type==='object_ref'&&v.path)acc.push(v.path);Object.values(v).forEach(x=>refsIn(x,acc))}return acc};
async function get(p){if(p in objects)return objects[p];try{objects[p]=await request('/object/get',{path:p})}catch(e){errors.push({p,e:String(e.message||e)});objects[p]=null}return objects[p]}
async function load(p){try{await request('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:p.split('.')[0]}});return true}catch(e){errors.push({p,e:'load '+e.message});return false}}
async function crawl(root){const pkg=root.split('.')[0];await load(root);const todo=[root],ext=[];
 while(todo.length){const p=todo.pop();const o=await get(p);if(!o)continue;for(const q of refsIn(o.properties||{})){if(q.startsWith(pkg+'.')||q.startsWith(pkg+':')){if(!(q in objects))todo.push(q)}else if(!ext.includes(q))ext.push(q)}}
 return ext}
const ext={};
for(const r of ROOTS){ext[r]=await crawl(r);console.log(r,'objs',Object.keys(objects).length,'ext',ext[r].length)}
// 外部：材质实例（链到母材质，母材质图已在 26 的采集里）、静态网格、贴图
const wanted=[...new Set(Object.values(ext).flat())].filter(q=>/MaterialInstance|\/Mesh\/|Texture/.test(q));
for(const q of wanted){await load(q);const o=await get(q);let cur=o?.properties?.Parent?.path;let n=0;while(cur&&!(cur in objects)&&n++<6&&!/\/Parent\/M_|Special\/M_/.test(cur)){await load(cur);const oo=await get(cur);cur=oo?.properties?.Parent?.path}}
// 静态网格的子对象（BodySetup、AssetImportData 等）
for(const q of wanted.filter(q=>/\/Mesh\//.test(q))){const o=objects[q];for(const s of refsIn(o?.properties||{}))if(s.startsWith(q.split('.')[0])&&!(s in objects))await get(s)}
fs.writeFileSync('hero_raw.json',JSON.stringify({readAt:new Date().toISOString(),roots:ROOTS,ext,objects,errors},null,0));
fs.writeFileSync('hero_log.json',JSON.stringify(LOG));
console.log('done objects',Object.keys(objects).length,'errors',errors.length,'requests',LOG.length);
