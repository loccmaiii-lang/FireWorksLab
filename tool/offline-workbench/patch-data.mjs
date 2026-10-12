// 只换编排（16.0.19 起；云端没有 npm 依赖时用）：把成品 HTML 内嵌数据块里的 cloud-latest 换成 public/data/cloud-latest.json，
// 其余字节一个不动。由 tool/workbench/release.py --data-only 调用：它先用 Git 确认工具源码自成品以来没改，再跑本脚本、更新构建清单、跑打包检查、重打 ZIP。
// 用法：node patch-data.mjs --html <成品.html> --source <tool/workbench> --output <新.html>
import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath,pathToFileURL} from 'node:url';
const MARK='<script id="df-offline-data" type="application/json">',END='</script>';
// 必须与 build.mjs 的 encode 一致；下面的「原样重建」检查会拦住任何不一致。
export const encode=text=>text.replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
export function patchCloudLatest(html,cloud,baseData={}){
 const start=html.indexOf(MARK);if(start<0||html.indexOf(MARK,start+1)>=0)throw Error('成品里没有唯一的内嵌数据块');
 const from=start+MARK.length,to=html.indexOf(END,from);if(to<0)throw Error('内嵌数据块没有结尾');
 const block=html.slice(from,to),data=JSON.parse(block);
 if(encode(JSON.stringify(data))!==block)throw Error('内嵌数据块不能原样重建，这份成品不能只换编排，要完整构建');
 for(const [key,value] of Object.entries(baseData))if(JSON.stringify(data[key])!==JSON.stringify(value))throw Error('成品内嵌的 '+key+' 和源码不一致，要完整构建');
 const previous=data['cloud-latest']??null;data['cloud-latest']=cloud;
 const next=html.slice(0,from)+encode(JSON.stringify(data))+html.slice(to);
 if(!next.startsWith(html.slice(0,from))||!next.endsWith(html.slice(to)))throw Error('数据块以外的字节变了');
 const check=JSON.parse(next.slice(from,next.indexOf(END,from)));
 for(const key of Object.keys(data))if(key!=='cloud-latest'&&JSON.stringify(check[key])!==JSON.stringify(data[key]))throw Error('换编排时改动了 '+key);
 return {html:next,previous};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,s)=>i%2?a:[...a,[v.replace(/^--/,''),s[i+1]]],[]));
 if(!args.html||!args.source||!args.output)throw Error('需要 --html --source --output');
 const source=path.resolve(args.source),html=await fs.readFile(args.html,'utf8');
 const {validateCloudLatest}=await import(pathToFileURL(path.join(source,'src','cloud-latest.mjs')));
 const cloud=validateCloudLatest(JSON.parse(await fs.readFile(path.join(source,'public','data','cloud-latest.json'),'utf8')));
 const baseData={};for(const name of ['score24-v05','music-data','structure-data','subtemplate-source','size-spec','resource-catalogue'])baseData[name]=JSON.parse(await fs.readFile(path.join(source,'public','data',name+'.json'),'utf8'));
 const result=patchCloudLatest(html,cloud,baseData);
 await fs.writeFile(args.output,result.html,'utf8');
 const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
 console.log(JSON.stringify({sha256:sha(result.html),bytes:Buffer.byteLength(result.html),previousHtmlSha256:sha(html),
  previous:result.previous&&{version:result.previous.version,name:result.previous.name,programmeSha256:result.previous.programmeSha256},
  cloudLatest:{version:cloud.version,name:cloud.name,programmeSha256:cloud.programmeSha256,cues:cloud.cues,events:cloud.events}}));
}
