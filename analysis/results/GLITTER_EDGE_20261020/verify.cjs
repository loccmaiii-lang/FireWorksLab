// 只读诊断：复用已导出的PNG与实际GPU回放着色器，只在隔离页面比较Ramp暗端。
const fs = require('node:fs'), path = require('node:path'), {execFileSync} = require('node:child_process');
const {chromium} = require('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '../../..');
execFileSync('python',['-X','utf8','tool/local_http/preflight.py','--tool','baker'],{cwd:root,stdio:'inherit'});
const baked = JSON.parse(fs.readFileSync(path.join(root, 'analysis/results/GLITTER_TWINKLE_20261017/S1_烘焙参数.json'), 'utf8'));
const png = execFileSync('python', ['-c', "import zipfile,json,base64;z=zipfile.ZipFile('outputs/金曜菊B闪烁试配_20261017/GlitterChry_S1.zip');j=json.loads(z.read('cascade.json'));print(base64.b64encode(z.read(j['textures']['L1_seq']['file'])).decode())"], {cwd:root,maxBuffer:8*1024*1024}).toString().trim();
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
  try {
    const page=await browser.newPage({viewport:{width:1350,height:1000}});
    await page.goto('http://127.0.0.1:8034/baker?fast',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.__fw);
    const result=await page.evaluate(async ({png,layer})=>{
      state.stillBusy=true;state.playing=false;state.autoBake=false;clearTimeout(bakeTimer);
      state.P={...layer.P,previewBloom:0};state.expo=1;state.tab='combo';ensureTargets();
      const bitmap=await createImageBitmap(await(await fetch('data:image/png;base64,'+png)).blob(),{premultiplyAlpha:'none',colorSpaceConversion:'none',imageOrientation:'flipY'});
      const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);bitmap.close();
      // 存档审计meta未含cy；诊断视图将面片居中，只比较同一PNG的着色，不重建游戏位移。
      const m={...layer.meta,cy:0,keys:[[0,.01],[1,.01]],frameTiming:'tick-start'};
      const b={P:layer.P,form:'master',meta:m,head:{tex},cw:512,chh:512};
      const L={...layer.L,...layer.M}, half=Math.max(m.Ww,m.Wh)*.52,view=[0,0,half,half];
      const render=col=>{hdrT.clear();hdrT.bind();additive(true);drawLayer(b,col,0,view);additive(false);post();gl.finish();return canvas.toDataURL('image/png');};
      const before=render(L),after=render({...L,ramp0:'#000000'});
      gl.deleteTexture(tex);
      return {version:VERSION,gpu:document.querySelector('#gpu')?.title,before,after,sourceUnchanged:true,diagnosticRecenter:true,changedInIsolatedPageOnly:{ramp0:[L.ramp0,'#000000']}};
    },{png,layer:baked.layers[0]});
    if(result.before===result.after)throw Error('对照未发生变化，不能作为有效画面证据');
    for(const [k,file] of [['before','原暗端.png'],['after','黑暗端试算.png']]){
      fs.writeFileSync(path.join(__dirname,file),Buffer.from(result[k].split(',')[1],'base64'));delete result[k];
    }
    result.note='真实8034成品的GPU回放着色器，复用原导出PNG；只比较暗端颜色，未重新烘包、未改当前用户页面或存档、未经UE实测。';
    fs.writeFileSync(path.join(__dirname,'GPU对照.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
