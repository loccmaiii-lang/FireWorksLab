// 隔离HTTP/GPU查真实Ramp PNG，不改烘焙器源码或用户页面。
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {chromium}=require('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../../..'), out=__dirname;
execFileSync('python',['-X','utf8','tool/local_http/preflight.py','--tool','baker'],{cwd:root,stdio:'inherit'});
const baked=JSON.parse(fs.readFileSync(path.join(root,'analysis/results/GLITTER_TWINKLE_20261017/S1_烘焙参数.json'),'utf8'));
const payload=JSON.parse(execFileSync('python',['-c',"import zipfile,json,base64;z=zipfile.ZipFile('outputs/金曜菊B闪烁试配_20261017/GlitterChry_S1.zip');j=json.loads(z.read('cascade.json'));b=lambda n:base64.b64encode(z.read(n)).decode();print(json.dumps({'atlas':b(j['textures']['L1_seq']['file']),'ramp':b(j['textures']['L1_ramp']['file']),'keys':next(x for x in j['emitters'][0]['modules'] if x['m']=='DynamicParameter')['params']['frame']['curve']}))"],{cwd:root,maxBuffer:12*1024*1024}).toString());
payload.soft=fs.readFileSync(path.join(out,'T_EFX_FireWorks_GlitterChry_S1_Lead_SoftToe_R.png')).toString('base64');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
 try{
  const page=await browser.newPage({viewport:{width:1350,height:1000}}), errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8034/baker?fast',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__fw);
  const result=await page.evaluate(async ({payload,layer})=>{
   state.stillBusy=true;state.playing=false;state.autoBake=false;clearTimeout(bakeTimer);
   state.P={...layer.P,previewBloom:0};state.expo=1;state.tab='combo';ensureTargets();
   async function texture(b64,srgb,flip=false){
    const bitmap=await createImageBitmap(await(await fetch('data:image/png;base64,'+b64)).blob(),{premultiplyAlpha:'none',colorSpaceConversion:'none',imageOrientation:flip?'flipY':'none'});
    const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,srgb?gl.SRGB8_ALPHA8:gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);bitmap.close();return t;
   }
   const main=await texture(payload.atlas,false,true), ramps={original:await texture(payload.ramp,true),soft:await texture(payload.soft,true)};
   // 四点Ramp函数无法表示这条窄过渡；诊断程序只将同一回放材质的Ramp函数换成真实PNG查表。
   const previous=PR.mat;
   PR.mat=compileNow(VS_RECT,FS_MAT.replace(RAMP_FN,'uniform sampler2D uSoftRamp; vec3 ramp(float v){return texture(uSoftRamp,vec2(clamp(v,0.,1.),.5)).rgb;}'));
   const m={...layer.meta,cy:0,keys:payload.keys,frameTiming:'tick-start'};
   const b={P:layer.P,form:'master',meta:m,head:{tex:main},cw:512,chh:512};
   const L={...layer.L,...layer.M}, half=Math.max(m.Ww,m.Wh)*.52,view=[0,0,half,half],shots={};
   try{
    for(const t of [0,.8])for(const [name,ramp] of Object.entries(ramps)){
     hdrT.clear();hdrT.bind();additive(true);
     gl.useProgram(PR.mat.p);gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,ramp);gl.uniform1i(PR.mat.u.uSoftRamp,3);
     drawLayer(b,L,t,view);additive(false);post();gl.finish();
     const err=gl.getError();if(err!==gl.NO_ERROR)throw Error('GPU错误 '+err);
     shots[name+'_'+t]=canvas.toDataURL('image/png');
    }
   }finally{PR.mat=previous;for(const x of [main,...Object.values(ramps)])gl.deleteTexture(x);}
   return {version:VERSION,gpu:document.querySelector('#gpu')?.title,shots,diagnosticRecenter:true,source:'旧S1实际主序列PNG+实际回放着色器，以sRGB纹理查真实Ramp；不代表UE/BC7验证'};
  },{payload,layer:baked.layers[0]});
  if(/software|swiftshader/i.test(result.gpu||''))throw Error('不是硬件GPU');
  if(result.shots.original_0===result.shots.soft_0)throw Error('闪光对照没有变化');
  for(const [key,data] of Object.entries(result.shots))fs.writeFileSync(path.join(out,'回放_'+key+'.png'),Buffer.from(data.split(',')[1],'base64'));
  delete result.shots;result.errors=errors;
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync(path.join(out,'GPU对照.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
