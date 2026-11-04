// Native read-only reflection. No material edits, shader rewrites or engine saves.
const fs=require('node:fs');
const {request}=require('./engine_api.cjs');
const root=__dirname+'/research/calibration-20261002';
const assets=JSON.parse(fs.readFileSync(root+'/material-channel-registry.json','utf8'));
const result={started:new Date().toISOString(),scope:'/Game/MaterialLib/Materials/FX',assets:[],candidates:[],errors:[]};
const checkpoint=()=>fs.writeFileSync(root+'/material-channel-scan.json',JSON.stringify(result,null,2));
const props=async(path,properties)=>(await request('/object/get',{path,properties})).data.properties;
let next=0,finished=0;
async function worker(){
  while(next<assets.length){
    const asset=assets[next++];
    try{
      const field=asset.class==='MaterialFunction'?'FunctionExpressions':'Expressions';
      const p=await props(asset.path,[field]);
      if(!Array.isArray(p[field]))throw Error('Missing '+field);
      const dynamic=[];
      for(const expression of p[field].filter(e=>e.class==='MaterialExpressionDynamicParameter')){
        const d=await props(expression.path,['ParamNames','ParameterIndex']);
        dynamic.push({path:expression.path,...d});
        d.ParamNames.forEach((name,index)=>{
          if(index>0&&/frame|phase|anim|pase|帧|序列/i.test(name))result.candidates.push({...asset,dynamic:expression.path,channelIndex:index,parameterIndex:d.ParameterIndex,name});
        });
      }
      result.assets.push({...asset,expressions:p[field].length,dynamic});
    }catch(error){result.errors.push({...asset,error:String(error)});}
    finished++;
    if(finished%50===0){checkpoint();console.log(JSON.stringify({finished,total:assets.length,candidates:result.candidates.length,errors:result.errors.length}));}
  }
}
(async()=>{
  await Promise.all([worker(),worker(),worker(),worker()]);
  result.finished=new Date().toISOString();checkpoint();
  console.log(JSON.stringify({finished,total:assets.length,candidates:result.candidates,errors:result.errors.length},null,2));
})().catch(error=>{checkpoint();console.error(error);process.exitCode=1;});
