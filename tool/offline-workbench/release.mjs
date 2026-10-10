import fs from 'node:fs/promises';import path from 'node:path';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
export function command(file,args,{cwd,env={}}={}){return new Promise((resolve,reject)=>{const child=spawn(file,args,{cwd,env:{...process.env,...env},stdio:'inherit',shell:false});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`检查或构建失败（${code}），保留上次成功HTML`)));});}
export async function release({source,programme,output,afterBuild=false},{run=command}={}){
 source=path.resolve(source);programme=path.resolve(programme);output=path.resolve(output);
 const tests=(await fs.readdir(path.join(source,'tests'))).filter(n=>n.endsWith('.test.mjs')&&n!=='sites-worker.test.mjs').map(n=>path.join('tests',n));
 await run(process.execPath,['--test',...tests],{cwd:source});
 if(!afterBuild){await run(process.execPath,[path.join(source,'node_modules/vite/bin/vite.js'),'build'],{cwd:source});await run(process.execPath,['scripts/prepare-sites-build.mjs'],{cwd:source});}
 await fs.mkdir(path.dirname(output),{recursive:true});const staged=output+'.candidate.html';
 try{
  await run(process.execPath,[path.join(here,'build.mjs'),'--source',source,'--programme',programme,'--output',staged],{cwd:here});
  const checks=(await fs.readdir(path.join(here,'tests'))).filter(n=>n.endsWith('.test.mjs')).map(n=>path.join(here,'tests',n));
  await run(process.execPath,['--test',...checks],{cwd:here,env:{DF_HTML_TEST_PATH:staged,DF_PROGRAMME_TEST_PATH:programme}});
  const manifest=JSON.parse(await fs.readFile(staged+'.build.json','utf8'));manifest.html=path.basename(output);
  await fs.writeFile(staged+'.build.json',JSON.stringify(manifest,null,2)+'\n');
  await fs.rename(staged,output);await fs.rename(staged+'.build.json',output+'.build.json');
  console.log('8025检查通过，已生成一次离线HTML：'+output);
 }catch(e){await fs.rm(staged,{force:true});await fs.rm(staged+'.build.json',{force:true});throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,s)=>i%2?a:[...a,[v.slice(2),s[i+1]]],[]));
 await release({source:args.source,programme:args.programme,output:args.output,afterBuild:args['after-build']==='true'});
}
