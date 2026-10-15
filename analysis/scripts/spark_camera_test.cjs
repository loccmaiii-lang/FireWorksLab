// 镜头数学与事件边界：独立于预设外观，避免以截图通过冒充正确性。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),read=n=>fs.readFileSync(path.join(root,'tool/src/js',n),'utf8');
const ctx=vm.createContext({});vm.runInContext(read('45_spark_flow.js')+read('46_camera.js')+read('46_graph_model.js').split('// =====================================================================')[0]+';this.C=CameraImaging;this.G=SparkGraph',ctx);
const {C,G}=ctx,P={cameraMotion:1,cameraShutter:.04,cameraPhase:'end',cameraQuality:'high',cameraDof:1,cameraDistance:1,cameraFocus:1,cameraAperture:.02,cameraBlades:0};
assert.deepEqual(Array.from(C.window(P,.1)),[.060000000000000005,.1]);assert.equal(C.coc(P,0),0);assert.equal(C.coc(P,.5),.005);assert.equal(C.coc({...P,cameraAperture:.04},.5),.01);
assert.throws(()=>C.validate({...P,cameraFocus:0}));assert.throws(()=>C.validate({...P,cameraShutter:NaN}));
const r=JSON.parse(fs.readFileSync(path.join(root,'experiments/spark-graph/presets.json'))).sparkler;
const e={...r.emitters[1],id:'one',parent:null,count:1,drag:0,gravity:[0,0,0],noise:0,brightCurve:[],sizeCurve:[]};
const q={e,birth:0,life:.2,width:.002,p:[0,0,0],v:[1,0,0],power:1,phase:0};
const g={recipe:{period:1},all:[q]},opt={...P,cameraDof:0};
const geo=(time,options=opt)=>G.cameraGeometry(g,time,options,1000);
let a=geo(.1);assert(a.data.length>11);assert.equal(a.data.length%12,0);
let sum=0,lo=Infinity,hi=-Infinity;for(let i=0;i<a.data.length;i+=12){sum+=a.data[i+6];lo=Math.min(lo,a.data[i]);hi=Math.max(hi,a.data[i]);assert.equal(a.data[i+6],a.data[i+7]);}
assert(Math.abs(sum-1)<1e-6);assert(hi-lo>.039&&hi-lo<.041,'运动拉伸必须覆盖曝光路径');
q.v=[2,0,0];let b=geo(.1);let range=d=>{let x=[];for(let i=0;i<d.length;i+=12)x.push(d[i]);return Math.max(...x)-Math.min(...x);};assert(Math.abs(range(b.data)/range(a.data)-2)<.05);
q.life=.08;assert(geo(.1).data.length>0,'本帧前已死亡但窗口内发光必须保留');assert.equal(geo(.13).data.length,0);
q.birth=.11;assert.equal(geo(.1).data.length,0,'未出生的分叉不可出现');
q.birth=0;q.life=.2;q.v=[0,0,0];a=geo(.1);assert.equal(range(a.data),0);
console.log('镜头数学、积分权重、速度拉伸、死亡/出生边界通过');
