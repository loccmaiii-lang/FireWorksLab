const {chromium}=require('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),{spawn,execFileSync}=require('child_process'),{once}=require('events');
const lab=path.resolve(__dirname,'..'),out=path.join(lab,process.argv.includes('--filaments')?'studies/filaments':'studies/motion');
const ffmpeg=execFileSync('python',['-c',`import sys;sys.path.insert(0,r'${path.join(lab,'.deps')}');import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())`],{encoding:'utf8'}).trim();
const args=process.argv.slice(2),only=args.find(s=>s.startsWith('--only='))?.split('=')[1];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--disable-background-timer-throttling']});
 const page=await browser.newPage();page.setDefaultTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:18766/experiments/ultra-baker-3.6/studies/'+(args.includes('--filaments')?'filaments':'motion')+'/render.html');
 for(const id of only?[only]:['V14','V13'])for(const version of ['before','fine-4k','fine-8k']){
  if(args.includes('--4k')&&version==='fine-8k')continue;
  const size=version==='fine-8k'?1024:720,duration=id==='V14'?10.4:12.5;
  await page.evaluate(({id,version,size})=>loadVariant(id,version,size),{id,version,size});
  const file=path.join(out,`${id}-${version}-playback.mp4`);
  const encoder=spawn(ffmpeg,['-y','-loglevel','error','-f','image2pipe','-framerate','30','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','15','-pix_fmt','yuv420p','-movflags','+faststart',file],{windowsHide:true});
  let log='';encoder.stderr.on('data',d=>log+=d);const done=once(encoder,'close');
  for(let first=0;first<Math.round(duration*30);first+=10){
   const frames=await page.evaluate(({first,total})=>Array.from({length:Math.min(10,total-first)},(_,j)=>getFrame((first+j)/30)),{first,total:Math.round(duration*30)});
   for(const png of frames){if(!encoder.stdin.write(Buffer.from(png.split(',')[1],'base64')))await once(encoder.stdin,'drain');}
   if(first%90===0)console.log(id,version,first+'/'+Math.round(duration*30));
  }
  encoder.stdin.end();const [code]=await done;if(code!==0)throw Error(log);
  if(await page.evaluate(()=>player.g.getError())!==0)throw Error('WebGL error');
  console.log('SAVED',file);
 }
 if(errors.length)throw Error(errors.join('\n'));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
