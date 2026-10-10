import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {omitAudio} from './light-project.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const flags=Object.fromEntries(process.argv.slice(2).reduce((r,x,i,a)=>i%2?r:[...r,[x.replace(/^--/,''),a[i+1]]],[]));
if(!flags.source||!flags.programme||!flags.output)throw Error('需要 --source --programme --output');
const source=path.resolve(flags.source),out=path.resolve(flags.output),originalProgramme=await fs.readFile(flags.programme,'utf8'),originalProject=JSON.parse(originalProgramme);
if(originalProject.format!=='df.workbench-project/1')throw Error('需要完整的 dfshow');
const includeMusic=flags.music==='include',project=includeMusic?originalProject:omitAudio(originalProject),programme=JSON.stringify(project);
const request=createRequire(path.join(source,'package.json')),esbuild=request('esbuild'),json={};
for(const name of ['score24-v05','music-data','structure-data','subtemplate-source','size-spec','resource-catalogue'])json[name]=JSON.parse(await fs.readFile(path.join(source,'public','data',name+'.json'),'utf8'));
const fingerprintFiles=new Map();
for(const file of ['package.json','package-lock.json',...Object.keys(json).map(n=>'public/data/'+n+'.json')]){const full=path.join(source,file);fingerprintFiles.set(full,crypto.createHash('sha256').update(await fs.readFile(full,'utf8')).digest('hex'));}
const plugin={name:'offline-adapter',setup(build){
 build.onResolve({filter:/^df-source\//},args=>({path:path.join(source,'src',args.path.slice(10))}));
 build.onLoad({filter:/\.(jsx|mjs|js|css)$/},async args=>{
  let text=await fs.readFile(args.path,'utf8');if(args.path.startsWith(path.join(source,'src')+path.sep))fingerprintFiles.set(args.path,crypto.createHash('sha256').update(text).digest('hex'));
  if(args.path===path.join(source,'src','App.jsx')){
   text="import {preflightProject} from './program-project.mjs';\n"+text;
   const old='const seed=migrateNumbering(raw),initial=await loadSession(seed)';if(!text.includes(old))throw Error('App 初始化结构已变，不能盲目替换');
   text=text.replace(old,"const seed=migrateNumbering(raw),initial=await loadSession(preflightProject(globalThis.__DF_OFFLINE_PROJECT_TEXT__,seed))");
   text=text.replace('df-timeline-design-v2-draft','df-offline-workbench-v1-draft').replace('df-timeline-design-v2-height','df-offline-workbench-v1-height');
   text=text.replace('特效工作台','烟花编排工作台');
   text=text.replace("'./music.wav'","globalThis.__DF_OFFLINE_AUDIO__");
   text=text.replace("const audioSrc=", "globalThis.__DF_OFFLINE_AUDIO__=initial.audioRef?.dataUrl;\n const audioSrc=");
  }
  if(args.path===path.join(source,'src','draft-storage.mjs'))text=text.replace('df-director-workbench','df-offline-director-workbench');
  return {contents:text,loader:args.path.endsWith('.jsx')?'jsx':args.path.endsWith('.css')?'css':'js'};
 });
}};
const result=await esbuild.build({stdin:{contents:`import ${JSON.stringify(path.join(here,'bootstrap.js'))};import ${JSON.stringify(path.join(source,'src','main.jsx'))};`,resolveDir:here,sourcefile:'offline-entry.js'},bundle:true,minify:true,charset:'utf8',format:'iife',platform:'browser',target:['chrome110','edge110'],nodePaths:[path.join(source,'node_modules')],define:{'process.env.NODE_ENV':'"production"'},outfile:path.join(here,'bundle.js'),write:false,plugins:[plugin]});
const js=result.outputFiles.find(f=>f.path.endsWith('.js'))?.text,css=result.outputFiles.find(f=>f.path.endsWith('.css'))?.text||'';if(!js)throw Error('打包未生成脚本');
const encode=text=>text.replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>烟花编排工作台 · 离线版</title><style>${css.replace(/<\/style/gi,'<\\/style')}</style></head><body><div id="root"></div><script id="df-offline-data" type="application/json">${encode(JSON.stringify(json))}</script><script id="df-offline-project" type="application/json">${encode(programme)}</script><script id="df-offline-runtime">${js.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,html,'utf8');
for(const [file,hash] of fingerprintFiles){const actual=crypto.createHash('sha256').update(await fs.readFile(file,'utf8')).digest('hex');if(hash!==actual)throw Error('正式源码在打包期间已改变：'+file)}
const sha256=crypto.createHash('sha256').update(html).digest('hex');const report={format:'df.offline-build/1',time:new Date().toISOString(),html:path.basename(out),bytes:Buffer.byteLength(html),sha256,programmeSha256:crypto.createHash('sha256').update(programme).digest('hex'),originalProgrammeSha256:crypto.createHash('sha256').update(originalProgramme).digest('hex'),musicIncluded:includeMusic,cues:project.payload.doc.cues.length,events:project.payload.doc.events.length,embeddedMusicSha256:project.payload.audioRef?.sha256||null,referenceMusicSha256:originalProject.payload.audioRef?.sha256||originalProject.payload.doc.meta.musicSourceSha256||null,sourceRoot:"workbench",sourceFiles:Object.fromEntries([...fingerprintFiles].map(([file,hash])=>[path.relative(source,file).split(path.sep).join("/"),hash])),engineEndpoint:'http://127.0.0.1:17780/gpcli',sourceUntouched:true,buildEnvironment:{platform:process.platform,node:process.version,arch:process.arch}};
await fs.writeFile(out+'.build.json',JSON.stringify(report,null,2));console.log(JSON.stringify({html:out,bytes:report.bytes,sha256,cues:report.cues,events:report.events,sourceUntouched:true}));
