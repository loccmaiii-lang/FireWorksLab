const http=require('node:http');

// Explicit length and a single end(buffer) match the local server's request parser.
function request(route,payload,timeout=120000){
  if(!route.startsWith('/'))throw Error('Invalid engine route');
  const body=Buffer.from(JSON.stringify(payload));
  return new Promise((resolve,reject)=>{
    const req=http.request({hostname:'127.0.0.1',port:17780,path:'/gpcli'+route,method:'POST',agent:false,
      headers:{'Content-Type':'text/plain','Content-Length':body.length,'Connection':'close'}},res=>{
      const chunks=[];res.on('data',part=>chunks.push(part));res.on('end',()=>{
        try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if(res.statusCode!==200||value.success===false)throw Error(JSON.stringify(value));
          resolve(value);
        }catch(error){reject(error);}
      });res.on('error',reject);
    });
    req.setTimeout(timeout,()=>req.destroy(Error('Engine request timeout')));
    req.on('error',reject);req.end(body);
  });
}

module.exports={request};

if(require.main===module){
  const fs=require('node:fs');
  const root=__dirname+'/backups/calibration-20261002/';
  (async()=>{
    const gold=JSON.parse(fs.readFileSync(root+'goldspark.json','utf8')).data.properties;
    const get=async(path,properties)=>(await request('/object/get',{path,properties})).data.properties;
    const records=[];
    for(const emitter of gold.Emitters){
      const e=await get(emitter.path,['EmitterName','LODLevels']);
      for(const level of e.LODLevels.slice(0,1)){
        const lod=await get(level.path,['Modules']);
        for(const module of lod.Modules){
          if(!['ParticleModuleSize','ParticleModuleSizeMultiplyLife'].includes(module.class))continue;
          const properties=await get(module.path,['StartSize','LifeMultiplier']);
          const record={class:module.class,path:module.path,properties,distributions:[]};
          for(const value of Object.values(properties))if(value?.Distribution?.path){
            record.distributions.push(await get(value.Distribution.path,['Min','Max','Constant','ConstantCurve']));
          }
          records.push(record);
          console.log(module.class,JSON.stringify(record.distributions).slice(0,1100));
        }
      }
    }
    fs.writeFileSync(root+'goldspark-size-modules.json',JSON.stringify(records,null,2));
  })().catch(error=>{console.error(error);process.exitCode=1;});
}
