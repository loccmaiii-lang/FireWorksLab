// 发布「云端最新编排」（用户 2026-10-11：每更新一次就是一个版本，拉取后刷新即最新编排）。
// 用法（tool/workbench 下）：npm run publish-show -- --programme <节目.dfshow> --name <编排名> [--note 一句说明] [--version 16.0.9] [--also <节目.dfshow>::<编排名> ...]
// --also：同一版本里一起存的对比版本（如 D1 / D3 密度），只存进 FXtools/节目/云端最新/ 和版本记录，刷新不自动载入，要在「节目 → 打开节目」里选。
// 不给 --version 就在「工具版本 WORKBENCH_VERSION 与上一份云端编排版本」里较大的那个上末位 +1。之后照常 npm run release（云端加 -- --no-deploy），源码、成品与编排一起提交。
// --data-only（16.0.19 起）：只换编排、不动工具源码（不改 WORKBENCH_VERSION），之后 python release.py --data-only（云端加 --no-deploy）。
//   云端装不了 npm 依赖时用；成品里只换内嵌的 cloud-latest，工具界面版本号不变，顶栏写「云端编排 <新号>」。
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {preflightProject} from '../src/program-project.mjs';
import {migrateNumbering} from '../src/point-numbering.mjs';
import {CLOUD_FORMAT,nextVersion,validateCloudLatest} from '../src/cloud-latest.mjs';

const here=path.dirname(fileURLToPath(import.meta.url)),source=path.resolve(here,'..'),root=path.resolve(source,'../..');
const args=process.argv.slice(2),flag=name=>{const i=args.indexOf('--'+name);return i<0?undefined:args[i+1]};
const also=args.flatMap((a,i)=>a==='--also'?[args[i+1]]:[]).map(v=>{const [file,label]=String(v).split('::');if(!file||!label?.trim()||/[\\/:*?"<>|]/.test(label))throw Error('--also 写成 <节目.dfshow>::<编排名>');return {file:path.resolve(file),label:label.trim()}});
const programmeArg=flag('programme'),name=flag('name')?.trim(),note=flag('note')?.trim()||'';
if(!programmeArg||!name)throw Error('需要 --programme <节目.dfshow> --name <编排名>');
if(/[\\/:*?"<>|]/.test(name))throw Error('编排名不能含文件名非法字符');
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
const connectionFile=path.join(source,'src/connection.mjs'),connection=await fs.readFile(connectionFile,'utf8');
const current=connection.match(/export const WORKBENCH_VERSION='([^']+)';/)?.[1];
if(!current)throw Error('找不到 WORKBENCH_VERSION');
const dataOnly=args.includes('--data-only'),cloudFile=path.join(source,'public/data/cloud-latest.json');
let previousCloud=null;try{previousCloud=JSON.parse(await fs.readFile(cloudFile,'utf8')).version}catch(e){if(e.code!=='ENOENT')throw e}
const key=v=>v.split('.').map(Number),cmp=(a,b)=>{const x=key(a),y=key(b);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]-y[i];return 0};
const newest=[current,previousCloud].filter(Boolean).reduce((a,b)=>cmp(a,b)>=0?a:b);
const version=flag('version')||nextVersion(newest);
nextVersion(version);
if(cmp(version,newest)<=0)throw Error(`版本号 ${version} 不比现有的 ${newest} 新（不复用、不回退）`);
const programmeFile=path.resolve(programmeArg),original=await fs.readFile(programmeFile,'utf8'),project=JSON.parse(original);
if(project.format!=='df.workbench-project/1')throw Error('需要完整节目文件（df.workbench-project/1）');
// 音乐不随每版编排上传：只留 sha256，播放时用仓库里的同一首或草稿里已导入的同一首。
const music=project.payload.audioRef,musicSha256=music?.sha256||project.payload.doc?.meta?.musicSourceSha256||null;
if(music&&music.kind!=='bundled')project.payload.audioRef={kind:'bundled'};
const seed=migrateNumbering(JSON.parse(await fs.readFile(path.join(source,'public/data/score24-v05.json'),'utf8')));
const state=preflightProject(JSON.stringify(project),seed);
const text=JSON.stringify(project),programmeSha256=sha(text);
const latest={format:CLOUD_FORMAT,version,name,note,publishedAt:new Date().toISOString(),
 source:path.relative(root,programmeFile).split(path.sep).join('/'),sourceSha256:sha(original),programmeSha256,
 musicSha256,musicTitle:state.doc.meta.musicTitle||music?.name||'',cues:state.doc.cues.length,events:state.doc.events.length,
 publishMode:dataOnly?'data-only':'with-app',appVersion:dataOnly?current:version,project};
validateCloudLatest(latest);
const archiveDir=path.join(root,'FXtools/节目/云端最新'),archive=`${version}-${name}.dfshow`;
await fs.mkdir(archiveDir,{recursive:true});
try{await fs.access(path.join(archiveDir,archive));throw Error(`版本 ${version} 已发布过，版本号不能复用`)}catch(e){if(e.code!=='ENOENT')throw e}
await fs.writeFile(path.join(archiveDir,archive),text);
const extras=[];
for(const x of also){
 const raw=await fs.readFile(x.file,'utf8'),p=JSON.parse(raw);if(p.format!=='df.workbench-project/1')throw Error('需要完整节目文件：'+x.file);
 if(p.payload.audioRef&&p.payload.audioRef.kind!=='bundled')p.payload.audioRef={kind:'bundled'};
 const st=preflightProject(JSON.stringify(p),seed),name2=`${version}-${x.label}.dfshow`;
 await fs.writeFile(path.join(archiveDir,name2),JSON.stringify(p));
 extras.push({label:x.label,archive:name2,cues:st.doc.cues.length,events:st.doc.events.length,source:path.relative(root,x.file).split(path.sep).join('/')});
}
await fs.writeFile(cloudFile,JSON.stringify(latest));
if(!dataOnly)await fs.writeFile(connectionFile,connection.replace(`export const WORKBENCH_VERSION='${current}';`,`export const WORKBENCH_VERSION='${version}';`));
const index=path.join(archiveDir,'版本记录.md');let log;try{log=await fs.readFile(index,'utf8')}catch{log='# 云端最新编排 · 版本记录\n\n拉取后刷新编排工作台会自动载入最新一行（载入前备份当前节目）。这里的文件不带音乐，音乐按 sha256 对应《汪洋与浩渺》。\n\n| 版本 | 编排 | 片段 / 播放 | 来源 | 说明 |\n| --- | --- | --- | --- | --- |\n'}
const mode=dataOnly?`（只换编排，工具 ${current}）`:'';
await fs.writeFile(index,log+`| ${version} | ${name} | ${latest.cues} / ${latest.events} | \`${latest.source}\` | ${(note+mode).replaceAll('|','｜')} |\n`+extras.map(x=>`| ${version} | ${x.label}（对比版，手动打开） | ${x.cues} / ${x.events} | \`${x.source}\` | 刷新不自动载入；节目 → 打开节目 → 选 \`${x.archive}\` |\n`).join(''));
console.log(JSON.stringify({version,name,archive:'FXtools/节目/云端最新/'+archive,extras,cues:latest.cues,events:latest.events,programmeSha256,bytes:Buffer.byteLength(text),appVersion:latest.appVersion,next:dataOnly?'python release.py --data-only'+(process.env.CI?' --no-deploy':''):'npm run release'+(process.env.CI?' -- --no-deploy':'')}));
