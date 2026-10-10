import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {releaseMiddleware} from '../server/release-preview.mjs';
test('离线检查入口返回原字节、即时更新、无缓存且拒绝写入',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'df-preview-')),file=path.join(dir,'workbench.html');
 const handle=releaseMiddleware(file),server=http.createServer((req,res)=>handle(req,res,()=>{res.statusCode=404;res.end()}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.equal((await fetch(url+'/release/')).status,503);
  for(const contents of ['<!doctype html><title>旧版</title>','<!doctype html><title>新版本 · 中文</title>']){
   await fs.writeFile(file,contents);const response=await fetch(url+'/release/?qa=isolated');
   assert.equal(await response.text(),contents);assert.equal(response.headers.get('cache-control'),'no-store');
  }
  assert.equal((await fetch(url+'/release/',{method:'POST'})).status,405);
  assert.equal((await fetch(url+'/release/other')).status,404);
 }finally{await new Promise(resolve=>server.close(resolve));await fs.rm(dir,{recursive:true,force:true})}
});
