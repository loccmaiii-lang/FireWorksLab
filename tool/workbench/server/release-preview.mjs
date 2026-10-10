import fs from 'node:fs/promises';

// 原字节返回最终产物，不经过 Vite 转换，因此可检查实际离线包。
export function releaseMiddleware(file){return async(req,res,next)=>{
 if(new URL(req.url,'http://127.0.0.1').pathname!=='/release/')return next();
 res.setHeader('Cache-Control','no-store');
 if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;res.setHeader('Allow','GET, HEAD');res.end();return}
 try{
  const bytes=await fs.readFile(file);res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Content-Length',bytes.length);res.setHeader('X-Content-Type-Options','nosniff');
  res.end(req.method==='HEAD'?undefined:bytes);
 }catch(error){res.statusCode=error.code==='ENOENT'?503:500;res.end('离线产物不可用，请先运行 npm run release。')}
};}
export function releasePreviewPlugin(){return {name:'df-offline-release-preview',configureServer(server){
 server.middlewares.use(releaseMiddleware(new URL('../../烟花编排工作台.html',import.meta.url)));
}};}
