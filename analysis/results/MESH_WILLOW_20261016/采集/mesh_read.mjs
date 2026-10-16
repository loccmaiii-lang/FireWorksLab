// 归档副本：原在 analysis/local/MESH_WILLOW_READ_20261016/（本机），输出文件写在当前目录。只读。
// 只读：两份 2.0 垂柳网格的属性 / 顶点数 / 包围盒 / 源文件路径。只用读取类函数。
import http from 'node:http';
import fs from 'node:fs';
const READ_FUNCS=new Set(['LoadAsset','DoesAssetExist','GetNumberVerts','GetLodCount','GetNumberMaterials','GetBoundingBox','GetBounds','GetNumSections','GetNumLODs','GetMaterial']);
function req(route,payload,timeout=60000){if(route==='/object/call'&&!READ_FUNCS.has(payload.function))throw Error('非只读函数 '+payload.function);if(!['/object/get','/object/call'].includes(route))throw Error('非只读路由');
 return new Promise((res,rej)=>{const body=Buffer.from(JSON.stringify(payload));const q=http.request('http://127.0.0.1:17780/gpcli'+route,{agent:false,method:'POST',headers:{'Content-Type':'text/plain','Content-Length':body.length}},r=>{let t='';r.setEncoding('utf8');r.on('data',c=>t+=c);r.on('end',()=>{try{const v=JSON.parse(t);if(v.success===false)return rej(Error(v.message||t.slice(0,300)));res(v.data??v)}catch(e){rej(Error('非JSON '+t.slice(0,200)))}})});q.on('error',rej);q.setTimeout(timeout,()=>q.destroy(Error('超时')));q.end(body)})}
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const SML='/Script/EditorScriptingUtilities.Default__EditorStaticMeshLibrary';
const meshes=(process.argv[2]||'').split(',');
const out={};
for(const m of meshes){const o={};const full=m+'.'+m.split('/').pop();
 try{await req('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:m}})}catch(e){o.loadErr=e.message}
 try{o.props=(await req('/object/get',{path:full})).properties}catch(e){o.propsErr=e.message}
 for(const f of ['GetLodCount','GetNumberMaterials']){try{o[f]=(await req('/object/call',{path:SML,function:f,args:{StaticMesh:full}})).return_value}catch(e){o[f]='ERR '+e.message.slice(0,120)}}
 try{o.verts0=(await req('/object/call',{path:SML,function:'GetNumberVerts',args:{StaticMesh:full,LODIndex:0}})).return_value}catch(e){o.verts0='ERR '+e.message.slice(0,120)}
 for(const f of ['GetBoundingBox','GetBounds','GetNumSections']){try{o[f]=(await req('/object/call',{path:full,function:f,args:f==='GetNumSections'?{InLOD:0}:{}})).return_value}catch(e){o[f]='ERR '+e.message.slice(0,160)}}
 // 子对象：AssetImportData
 const aid=o.props?.AssetImportData?.path; if(aid){try{o.importData=(await req('/object/get',{path:aid})).properties}catch(e){o.importData='ERR '+e.message}}
 out[m]=o; console.log(m.split('/').pop(), 'verts',o.verts0,'lods',o.GetLodCount,'mats',o.GetNumberMaterials,'bbox',JSON.stringify(o.GetBoundingBox),'sections',o.GetNumSections);
}
fs.writeFileSync(process.argv[3]||'mesh_read.json',JSON.stringify(out,null,1));
