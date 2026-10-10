import fs from 'node:fs';
// 开发入口复用已上传的原测试曲；离线包仍不包含音乐。
export function demoMusicPlugin(){return {name:'df-demo-music',configureServer(server){server.middlewares.use((req,res,next)=>{
 if(new URL(req.url,'http://127.0.0.1').pathname!=='/music.wav')return next();
 if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;res.end();return}
 const actual=new URL('../../../协作/编排工作台资料/2026-10-10/music/music.wav',import.meta.url);
 fs.stat(actual,(error,stat)=>{
  if(error){res.statusCode=404;res.end('测试曲未下载，可在节目中导入自己的音乐。');return}
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);let start=0,end=stat.size-1;
  if(req.headers.range&&!range){res.statusCode=416;res.setHeader('Content-Range',`bytes */${stat.size}`);res.end();return}
  if(range){start=Number(range[1]);end=range[2]?Math.min(Number(range[2]),end):end;
   if(start>end){res.statusCode=416;res.setHeader('Content-Range',`bytes */${stat.size}`);res.end();return}
   res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${stat.size}`);
  }
  res.setHeader('Content-Type','audio/wav');res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Length',end-start+1);
  if(req.method==='HEAD'){res.end();return}
  const stream=fs.createReadStream(actual,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
 });
});}};}
