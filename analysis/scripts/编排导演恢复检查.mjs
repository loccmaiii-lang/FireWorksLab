// 有状态离线替身：模拟设置与可见属性分开，绝不连接真实 UE。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {EventEmitter} from 'node:events';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'b09-preview-regression-'));
const realRequest=http.request,argv=[...process.argv];
const target='/Game/Test.Test:PersistentLevel.Director';
const results=[];
try{
 for(const test of [
  {name:'normal'},
  {name:'preview-error',previewError:true},
  {name:'restore-log-missing',missingLog:true},
  {name:'unknown-platform',unknown:true},
 ]){
  const out=path.join(root,test.name);fs.mkdirSync(out);
  const logFile=path.join(out,'engine.log');fs.writeFileSync(logFile,'');
  const before={DefaultConfig:{TotalDuration:2,EffectSubTemplates:[],EffectTemplates:[],EffectScheduleGroups:[],LightTemplates:['保留灯光']},DebugPlatform:test.unknown?'None':'PC',DebugQualityLevel:'EQuality_VeryHigh',DebugPreviewStartTime:0,bShowActive:false,RandomSeed:17};
  let props=structuredClone(before),actualPlatform='PC',actualQuality='EQuality_VeryHigh',previews=0,mutations=0,previewing=false;
  const config={out,label:test.name,platform:'Mobile',quality:'EQuality_Medium',start:0,moments:[0],logFile};
  const cfg=path.join(out,'config.json');fs.writeFileSync(cfg,JSON.stringify(config));
  http.request=(url,options,callback)=>{
   assert.ok(String(url).startsWith('http://127.0.0.1:17780/gpcli/'),'替身只处理固定入口');
   const q=new EventEmitter();q.setTimeout=()=>q;q.destroy=e=>q.emit('error',e);
   q.end=body=>queueMicrotask(()=>{
    const p=JSON.parse(body),route=String(url).split('/gpcli')[1];
    let data={},error=null;
    if(route==='/object/search')data={objects:[{path:target}]};
    else if(route==='/object/get')data={properties:structuredClone(props)};
    else if(route==='/object/set'){mutations++;Object.assign(props,p.properties);}
    else if(route==='/object/call'){
     if(p.function==='GetLevelViewportCameraInfo')data={out_CameraLocation:'(X=1,Y=2,Z=3)',out_CameraRotation:'(Pitch=4,Yaw=5,Roll=0)',called:true};
     else if(p.function==='GetGameTimeInSeconds')data={return_value:'10'};
     else if(p.function.startsWith('GetConsoleVariable'))data={return_value:'3'};
     else if(p.function==='DebugPreviewShow'){
      mutations++;previews++;previewing=true;
      if(props.DebugPlatform!=='None')actualPlatform=props.DebugPlatform;
      actualQuality=props.DebugQualityLevel;
      if(!(test.missingLog&&previews===2)){
       const platform={Mobile:1,PC:2,Gamepad:3}[props.DebugPlatform];
       const quality={EQuality_VeryLow:0,EQuality_Low:1,EQuality_Medium:2,EQuality_High:3,EQuality_VeryHigh:4}[props.DebugQualityLevel];
       fs.appendFileSync(logFile,`ShowDirectorTool: 模拟平台已设置: ${platform}\nShowDirectorTool: 模拟画质已设置: ${quality}\n`);
      }
      fs.appendFileSync(logFile,'ShowDirectorTool: 编辑器预览已开始\n');
      if(test.previewError&&previews===1)error='模拟预览已生效后返回失败';
      data={called:true};
     }else if(p.function==='DebugStopShow'){mutations++;previewing=false;data={called:true};}
     else if(p.function==='ExecuteConsoleCommand'){
      const file=p.args.Command.split('filename=')[1];fs.writeFileSync(file,'offline-shot');data={called:true};
     }else throw Error('替身不允许的调用 '+p.function);
    }else throw Error('替身不允许的路由 '+route);
    const response=new EventEmitter();response.statusCode=200;response.setEncoding=()=>{};
    callback(response);response.emit('data',JSON.stringify(error?{success:false,message:error}:{success:true,data}));response.emit('end');
   });return q;
  };
  process.argv[2]=cfg;process.exitCode=0;
  await import(new URL('./编排导演实放.mjs?case='+test.name,import.meta.url));
  const report=JSON.parse(fs.readFileSync(path.join(out,test.name+'.json'),'utf8'));
  try{
   if(test.unknown){assert.match(report.error||'',/None/);assert.equal(mutations,0);assert.equal(previews,0);}
   else{
    assert.equal(actualPlatform,'PC','属性恢复不能代替实际平台恢复');
    assert.equal(actualQuality,'EQuality_VeryHigh','恢复原极高模拟画质');
    assert.deepEqual(props,before,'三个调试字段和配置恢复');
    assert.equal(previewing,false,'恢复用短预览必须停止');
    if(test.missingLog){assert.ok(report.restoreError,'恢复缺少实际回执必须报错');assert.equal(process.exitCode,1);}
    else{assert.equal(report.restored.simulation,true);assert.equal(process.exitCode,test.previewError?1:0);}
   }
   results.push({case:test.name,pass:true});
  }catch(e){results.push({case:test.name,pass:false,error:e.message});}
 }
}finally{
 http.request=realRequest;process.argv.splice(0,process.argv.length,...argv);
 // 只删除 mkdtemp 返回且父目录/前缀都核对过的本检查临时目录。
 if(path.dirname(path.resolve(root))!==path.resolve(os.tmpdir())||!path.basename(root).startsWith('b09-preview-regression-'))throw Error('临时目录边界异常');
 fs.rmSync(root,{recursive:true});
}
console.log(JSON.stringify({check:'导演预览模拟状态恢复',results},null,2));
process.exitCode=results.length===4&&results.every(r=>r.pass)?0:1;
