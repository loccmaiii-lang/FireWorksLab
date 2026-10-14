// 真实GPU核：燃尽前、亮头、早停发射、确定性、CPU/GPU受力和积分步长检查。
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'analysis/results/FG_Afterburn');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});try{
 const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.join(root,'tool/FireworkBaker.html')).href+'?fast');await p.waitForFunction(()=>window.__fw&&__fw.idle(),null,{timeout:180000});
 const result=await p.evaluate(async()=>{state.stillBusy=true;state.playing=false;clearTimeout(bakeTimer);
  const base={...replicaPM('FC6O').P,sparkLateWind:0,sparkTailAfterBurn:0,sparkBrightCurve:'',sparkSizeCurve:'',emberBrightCurve:'',emberSizeCurve:''};
  const trial={...base,sparkLateWind:.6,sparkLateScale:1.5,sparkLateFade:.4,sparkTailAfterBurn:1,sparkBrightCurve:'0:1, 0.6:0.9, 1:0.75',emberBrightCurve:'0:1, 0.6:1, 1:0.7',emberSizeCurve:'0:1, 1:0.85'};
  const target=new Target(256,256,gl.RGBA16F),view=[0,14,25,25];
  const shot=(r,t)=>{target.clear();target.bind();additive(true);r.draw(t,view,256/50,1,Math.floor(t*30));additive(false);const a=new Float32Array(256*256*4);gl.readPixels(0,0,256,256,gl.RGBA,gl.FLOAT,a);return a;};
  const diff=(a,b,ch)=>{let max=0,n=0;for(let i=ch;i<a.length;i+=4){let d=Math.abs(a[i]-b[i]);max=Math.max(max,d);if(d)n++;}return{max,pixels:n};};
  let r0=makeRenderer(base,'burst'),r1=makeRenderer(trial,'burst');
  const burn=Math.min(...r0.sim.all.map(s=>s.birth+(s.vis??s.burn))),samples=[];let headMax=0,tailPreMax=0,tailLatePixels=0;
  for(let tick=0;tick<=96;tick++){const t=tick/30,a=shot(r0,t),b=shot(r1,t),h=diff(a,b,0),tail=diff(a,b,1);headMax=Math.max(headMax,h.max);if(t<=burn)tailPreMax=Math.max(tailPreMax,tail.max);else tailLatePixels+=tail.pixels;samples.push({t,head:h,tail});}
  r0.dispose();r1.dispose();
  // sparkStop=.2不得把1.2秒燃尽提前；按所有母星燃尽前的0.8秒比较。
  const early={...base,stars:1,burn:1.2,burnJit:0,ignJit:0,clusterN:1,clusterSweep:0,sparkStop:.2,emberAll:0};
  r0=makeRenderer(early,'burst');r1=makeRenderer({...early,...Object.fromEntries(Object.entries(trial).filter(([k])=>k.startsWith('sparkLate')||k==='sparkTailAfterBurn'||k.endsWith('Curve')))},'burst');
  const stopDiff=diff(shot(r0,.8),shot(r1,.8),1);r0.dispose();r1.dispose();
  // 开关开但气流0且曲线空，整段必须相同。
  r0=makeRenderer(base,'burst');r1=makeRenderer({...base,sparkLateWind:0,sparkTailAfterBurn:1},'burst');let zeroMax=0;for(const t of [.1,.6,1,1.4,2,2.8]){const a=shot(r0,t),b=shot(r1,t);zeroMax=Math.max(zeroMax,diff(a,b,1).max);}r0.dispose();r1.dispose();target.dispose();
  // 直接使用生产GLSL受力函数作transform feedback，与JS的同一积分对比。
  const vs=VS_SPK_LATE.slice(0,VS_SPK_LATE.indexOf('void main(){'))+`out vec3 op,ov;uniform int testN;void main(){op=vec3(0.,3.,0.);ov=vec3(2.,1.,.2);for(int i=0;i<testN;i++)lateStep(op,ov,vec3(.1,0.,0.),vec3(0.,-2.4525,0.),5.5,.77,1.+float(i)/float(testN),1./float(testN),1.);gl_Position=vec4(0.);}`;
  const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const prog=gl.createProgram(),sv=shader(gl.VERTEX_SHADER,vs),sf=shader(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;out vec4 color;void main(){color=vec4(0.);}');gl.attachShader(prog,sv);gl.attachShader(prog,sf);gl.transformFeedbackVaryings(prog,['op','ov'],gl.INTERLEAVED_ATTRIBS);gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));gl.useProgram(prog);
  for(const [k,v]of Object.entries({uLateWind:.6,uLateScale:1.5,uLateFade:.4}))gl.uniform1f(gl.getUniformLocation(prog,k),v);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,buffer);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,24,gl.DYNAMIC_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);gl.bindVertexArray(emptyVAO);
  const gpu=N=>{gl.uniform1i(gl.getUniformLocation(prog,'testN'),N);gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,1);gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);let a=new Float32Array(6);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,a);return [...a];};
  const a=gpu(60),fine=gpu(120);let pos=[0,3,0],vel=[2,1,.2];for(let i=0;i<60;i++)[pos,vel]=sparkLateStep(trial,pos,vel,[.1,0,0],[0,-2.4525,0],5.5,.77,1+i/60,1/60,1);const cpu=[...pos,...vel];
  const mathMax=Math.max(...a.map((x,i)=>Math.abs(x-cpu[i]))),stepMax=Math.max(...a.map((x,i)=>Math.abs(x-fine[i])));
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.deleteBuffer(buffer);gl.deleteProgram(prog);gl.deleteShader(sv);gl.deleteShader(sf);
  return {headMax,tailPreMax,tailLatePixels,earliestBurn:burn,samples,earlyStop:stopDiff,zeroMax,mathMax,stepMax,cpu,gpu:a,gpuFine:fine};
 });
 assert.equal(result.headMax,0,'头部改变');assert.equal(result.tailPreMax,0,'燃尽前改变');assert.equal(result.earlyStop.max,0,'早停被当燃尽');assert.equal(result.zeroMax,0,'空设置改变旧图');assert.ok(result.tailLatePixels>0,'新控件无效');assert.ok(result.mathMax<.0001,'CPU/GPU受力不一致');assert.ok(result.stepMax<.003,'步长未收敛');assert.equal(errors.length,0);
 fs.writeFileSync(path.join(out,'内核检查.json'),JSON.stringify({pass:true,errors,...result},null,2));console.log('PASS',JSON.stringify({...result,samples:result.samples.length}));
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
