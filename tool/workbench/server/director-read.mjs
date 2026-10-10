import {SOURCE_BP,sourceAlias} from '../src/director-source-map.mjs';
import http from 'node:http';import fs from 'node:fs';import crypto from 'node:crypto';
const endpoint='http://127.0.0.1:17780/gpcli';
function read(route,payload){if(!['/object/get','/object/search'].includes(route))throw Error('只读接口');return new Promise((resolve,reject)=>{const body=Buffer.from(JSON.stringify(payload));const req=http.request(endpoint+route,{method:'POST',headers:{'Content-Type':'text/plain','Content-Length':body.length}},res=>{let text='';res.setEncoding('utf8');res.on('data',c=>text+=c);res.on('end',()=>{try{const r=JSON.parse(text);if(r.success===false)throw Error(r.message||'引擎读取失败');resolve(r.data)}catch(e){reject(e)}})});req.setTimeout(15000,()=>req.destroy(Error('引擎读取超时')));req.on('error',reject);req.end(body)});}
export function normalizeBlueprintPath(value){let p=String(value||'').trim();const m=p.match(/^Blueprint'([^']+)'$/);if(m)p=m[1];if(!/^\/Game\/[A-Za-z0-9_/.]+$/.test(p)||p.length>1000)throw Error('请输入有效的Blueprint资产路径');return p.includes('.')?p:p+'.'+p.split('/').pop();}
export async function readDirector(value,sourceValue=SOURCE_BP){
 const path=normalizeBlueprintPath(value);let target=await read('/object/get',{path});
 if(target.properties?.GeneratedClass?.path){const c=target.properties.GeneratedClass.path,[pkg,name]=c.split('.');target=await read('/object/get',{path:pkg+'.Default__'+name});}
 const config=target.properties?.DefaultConfig;if(!Array.isArray(config?.EffectScheduleGroups)||!Array.isArray(config?.EffectTemplates)||!Array.isArray(config?.EffectSubTemplates))throw Error('此资产不是可识别的三表导演');
 const points=[],catalog=[];const sourcePath=normalizeBlueprintPath(sourceValue);let source=await read('/object/get',{path:sourcePath});
 if(source.properties?.GeneratedClass?.path){const [pkg,name]=source.properties.GeneratedClass.path.split('.');source=await read('/object/get',{path:pkg+'.Default__'+name,properties:['EffectSubTemplates']});}
 const subs=source.properties?.EffectSubTemplates;if(!subs?.length)throw Error('指定来源没有特效子模板');
 const sourceFingerprint=crypto.createHash('sha256').update(JSON.stringify(subs)).digest('hex');
 subs.forEach((sub,sourceIndex)=>{const key=crypto.createHash('sha256').update(JSON.stringify({sourcePath,sourceIndex,sub})).digest('hex').slice(0,16);catalog.push({key,sub,source:sourcePath.split('.').pop(),sourcePath,sourceIndex,exportName:sourceAlias(sourceIndex,sub.TemplateName)});});
 const sourceLibrary={path:sourcePath,fingerprint:sourceFingerprint,count:subs.length};
 const refs=await read('/object/search',{class:'DFMShowEffectPoint',limit:1000});for(const ref of refs.objects||[]){if(!ref.path.startsWith('/Game/')||ref.path.includes('.Default__')||/^(REINST_|SKEL_)/.test(ref.class||'')||/^(REINST_|SKEL_)/.test(ref.name||''))continue;const p=await read('/object/get',{path:ref.path,properties:['PointId','DirectorId','Bindings']});if(p.properties.DirectorId===target.properties.DirectorId)points.push({path:p.path,pointId:p.properties.PointId,bindings:p.properties.Bindings||[]});}
 const warnings=[];
 const directors=await read('/object/search',{class:'DFMShowDirector',limit:100});const instances=[];for(const ref of directors.objects||[]){if(!ref.path.startsWith('/Game/')||ref.path.includes('.Default__')||/^(REINST_|SKEL_)/.test(ref.class||'')||/^(REINST_|SKEL_)/.test(ref.name||''))continue;const p=await read('/object/get',{path:ref.path,properties:['DirectorId','DefaultConfig']});if(p.properties.DirectorId===target.properties.DirectorId)instances.push({...ref,matchesNewDefaults:JSON.stringify(p.properties.DefaultConfig)===JSON.stringify(config)});}
 let receipt=null;const receiptFile=new URL('../../director-repair-20261008/import-receipt.json',import.meta.url);const verifiedFile=new URL('../../director-repair-20261008/native-readback.json',import.meta.url);if(fs.existsSync(receiptFile)&&fs.existsSync(verifiedFile)){const r=JSON.parse(fs.readFileSync(receiptFile)),verified=JSON.parse(fs.readFileSync(verifiedFile));if(r.sourceFingerprint===sourceFingerprint&&r.target.path===target.path&&JSON.stringify(verified.DefaultConfig)===JSON.stringify(config))receipt=r;}
 return {receipt,sourceLibrary,target:{path:target.path,directorId:target.properties.DirectorId},config,points,catalog,instances,warnings,readOnly:true};
}
export function directorReadPlugin(){return {name:'private-director-read',configureServer(server){server.middlewares.use(async(req,res,next)=>{
 const url=new URL(req.url,'http://127.0.0.1');if(url.pathname!=='/api/director')return next();
 if(req.method!=='GET'||!/^127\.0\.0\.1:\d+$/.test(req.headers.host||'')||(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host)||req.headers['sec-fetch-site']==='cross-site'){res.statusCode=403;res.end('Forbidden');return}
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');try{res.end(JSON.stringify(await readDirector(url.searchParams.get('path'),url.searchParams.get('source')||SOURCE_BP)))}catch(e){res.statusCode=503;res.end(JSON.stringify({error:e.message}))}
 });}};}
