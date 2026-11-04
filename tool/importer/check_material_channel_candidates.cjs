const fs=require('node:fs');
const {request}=require('./engine_api.cjs');
const root=__dirname+'/research/calibration-20261002';
const scan=JSON.parse(fs.readFileSync(root+'/material-channel-scan.json','utf8'));
const get=async(path,properties)=>(await request('/object/get',{path,properties})).data.properties;
(async()=>{
  const result=[];
  for(const path of [...new Set(scan.candidates.map(c=>c.path))]){
    const p=await get(path,['Expressions','BlendMode','ShadingModel']);
    const nodes=[];
    for(const expression of p.Expressions){
      if(!/Texture.*Parameter|ScalarParameter|MaterialFunctionCall|DynamicParameter|Floor|Custom$/.test(expression.class))continue;
      const properties=await get(expression.path);
      nodes.push({...expression,properties});
    }
    result.push({path,properties:p,nodes});
    console.log(JSON.stringify({path,blend:p.BlendMode,shading:p.ShadingModel,
      textureParameters:nodes.filter(n=>/Texture.*Parameter/.test(n.class)).map(n=>n.properties.ParameterName),
      scalarParameters:nodes.filter(n=>n.class==='MaterialExpressionScalarParameter').map(n=>n.properties.ParameterName),
      functions:nodes.filter(n=>n.class==='MaterialExpressionMaterialFunctionCall').map(n=>n.properties.MaterialFunction?.path),
      dynamic:nodes.filter(n=>n.class==='MaterialExpressionDynamicParameter').map(n=>n.properties.ParamNames)}));
  }
  fs.writeFileSync(root+'/material-channel-candidate-graphs.json',JSON.stringify(result,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
