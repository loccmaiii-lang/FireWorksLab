import os
os.environ['OPENCV_IO_ENABLE_OPENEXR']='1'
from pathlib import Path
import json,sys,subprocess,hashlib,zipfile
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFont
from radiometry_analysis import LAB,ROOT,OUT
sys.path.insert(0,str(LAB/'.deps'));import imageio_ffmpeg
FF=imageio_ffmpeg.get_ffmpeg_exe();FONT=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',24)
def cmd(args):subprocess.run([FF,'-y','-loglevel','error',*args],check=True)
def main():
 refs=json.loads((LAB/'studies/references.json').read_text('utf-8'));align=json.loads((OUT/'alignment.json').read_text('utf-8'));reports={}
 for id in ['V14','V13']:
  seq=json.loads((OUT/f'{id}-sequence.json').read_text('utf-8'));n=seq['frames'];N=seq['size'];hdrdir=OUT/f'{id}-EXR';hdrdir.mkdir(exist_ok=True)
  exrerr=[];peak=0.
  for i in range(n):
   p=OUT/f'{id}-hdr-packed/{i:04d}.png';b=np.asarray(Image.open(p)).copy();assert b.shape==(N,N*2,4)
   rgb=b.reshape(N,N,8).copy().view('<f2').reshape(N,N,4)[...,:3].astype(np.float32);assert np.isfinite(rgb).all();peak=max(peak,float(rgb.max()))
   path=hdrdir/f'{i:04d}.exr';assert cv2.imwrite(str(path),rgb[...,::-1],[cv2.IMWRITE_EXR_TYPE,cv2.IMWRITE_EXR_TYPE_HALF]);decoded=cv2.imread(str(path),cv2.IMREAD_UNCHANGED)[...,::-1]
   assert np.array_equal(decoded,rgb),'EXR must exactly preserve all GPU HALF values'
   raw=OUT/f'{id}-linear-{i/30:.3f}.rgba32f'
   if raw.exists():
    ref=np.fromfile(raw,dtype='<f4').reshape(N,N,4)[::-1,:,:3];diff=np.abs(rgb-ref);e=float(diff.max());ulp=np.abs(np.spacing(ref.astype(np.float16))).astype(np.float32)
    exrerr.append({'frame':i,'maxAbsoluteError':e,'differingChannelSamples':int((diff>0).sum()),'limit':'one HALF ULP between independent GPU replays; EXR round-trip itself must be bit-exact'});assert np.all(diff<=np.maximum(ulp,1e-7)*1.01)
  print(id,'EXR verified',n,'peak',peak,flush=True)
  # Full-colour RGB atlases: 64 RGB frames per 8K image, not four grey frames per cell.
  atlasmeta=[]
  for start in range(0,n,64):
   atlas=Image.new('RGB',(8192,8192));count=min(64,n-start)
   for j in range(count):
    with Image.open(OUT/f'{id}-frames/{start+j:04d}.png') as im:assert im.size==(1024,1024);atlas.paste(im.convert('RGB'),((j%8)*1024,(j//8)*1024))
   name=f'{id}-RGB8K-{start//64:02d}.png';atlas.save(OUT/name,compress_level=6);atlasmeta.append({'file':name,'firstFrame':start,'frameCount':count,'startSeconds':start/30})
  seq['atlases']=atlasmeta;seq['linearSequence']={'directory':id+'-EXR','format':'OpenEXR ZIP, RGB HALF 16-bit float, linear sRGB primaries, before camera transform','frames':n,'size':N,'maxLinearChannel':peak};(OUT/f'{id}-sequence.json').write_text(json.dumps(seq,ensure_ascii=False,indent=2),'utf-8')
  cmd(['-framerate','30','-i',str(OUT/f'{id}-frames/%04d.png'),'-frames:v',str(n),'-an','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/f'{id}-V4-1024.mp4')])
  r=refs[id];source=cv2.VideoCapture(str(ROOT/r['path']));source.set(cv2.CAP_PROP_POS_FRAMES,round(r['t0']*30));old=cv2.VideoCapture(str(LAB/f'studies/filaments/{id}-fine-4k-playback.mp4'))
  box=[-40,-20,800,800] if id=='V14' else [-90,0,900,900];a=align[id];M=np.float32([[a['scale'],0,a['tx']*720],[0,a['scale'],a['ty']*720]])
  olda=json.loads((LAB/f'studies/filaments/{id}-comparison-metrics.json').read_text('utf-8'))['alignment']['fine-4k'];OM=np.float32([[olda['scale'],0,olda['translation'][0]],[0,olda['scale'],olda['translation'][1]]])
  p=subprocess.Popen([FF,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s','2160x850','-r','30','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/f'{id}-comparison.mp4')],stdin=subprocess.PIPE,stderr=subprocess.PIPE)
  for i in range(n):
   ok,s=source.read();ok2,o=old.read();assert ok and ok2
   s=cv2.warpAffine(s,np.float32([[720/box[2],0,-box[0]*720/box[2]],[0,720/box[3],-box[1]*720/box[3]]]),(720,720),flags=cv2.INTER_AREA)
   o=cv2.warpAffine(o,OM,(720,720));new=cv2.resize(cv2.imread(str(OUT/f'{id}-frames/{i:04d}.png')),(720,720),interpolation=cv2.INTER_AREA);new=cv2.warpAffine(new,M,(720,720))
   im=Image.new('RGB',(2160,850),(9,13,20));d=ImageDraw.Draw(im)
   for j,(label,f) in enumerate([('实拍原片',s),('第三版 · 灰度 Ramp',o),('第四版 · 温度发光 / RGB',new)]):
    im.paste(Image.fromarray(cv2.cvtColor(f,cv2.COLOR_BGR2RGB)),(j*720,55));d.text((j*720+20,15),f'{id} +{i/30:.2f}s  |  {label}',font=FONT,fill='white')
   d.text((20,792),'固定取景与时间；未用原片像素合成。新版本仍缺少实拍中的烟体积与复杂碎屑。',font=FONT,fill='#c2ccda');p.stdin.write(np.asarray(im).tobytes())
  p.stdin.close();err=p.stderr.read();p.wait();assert p.returncode==0,err.decode();source.release();old.release()
  for kind in ['RGB','HDR']:
   files=list((OUT/f'{id}-frames').glob('*.png'))+[OUT/m['file'] for m in atlasmeta] if kind=='RGB' else list(hdrdir.glob('*.exr'))
   files += [OUT/f'{id}-config.json',OUT/f'{id}-sequence.json',OUT/'分析与复现说明.md']
   with zipfile.ZipFile(OUT/f'{id}-{kind}-1024.zip','w',compression=zipfile.ZIP_STORED) as z:
    for path in files:z.write(path,str(path.relative_to(OUT)))
   with zipfile.ZipFile(OUT/f'{id}-{kind}-1024.zip') as z:assert z.testzip() is None
  videos=[]
  for name in [f'{id}-comparison.mp4',f'{id}-V4-1024.mp4']:
   cap=cv2.VideoCapture(str(OUT/name));count=0
   while True:
    ok,f=cap.read()
    if not ok:break
    count+=1
   fps=cap.get(cv2.CAP_PROP_FPS);cap.release();assert count==n and fps==30;videos.append({'file':name,'frames':count,'fps':fps})
  reports[id]={'EXRframes':n,'HALFexactRoundTrip':True,'matchesFloatReadbacks':exrerr,'peakLinearRGB':peak,'RGBatlases':len(atlasmeta),'videos':videos}
  print(id,'DONE',flush=True)
 (OUT/'delivery-verification.json').write_text(json.dumps(reports,indent=2),'utf-8')
if __name__=='__main__':main()
