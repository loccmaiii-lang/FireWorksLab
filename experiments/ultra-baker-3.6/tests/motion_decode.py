from pathlib import Path
import json,cv2,hashlib,sys
from motion_analysis import OUT
if "--filaments" in sys.argv:OUT=OUT.parent/"filaments"

results=[]
for id,n,source_n in [('V14',312,445),('V13',375,547)]:
    for kind,w,h,expected in [('comparison',2160,984,n),('comparison-half-speed',2160,984,n*2),('reference-breakdown',720,1520,source_n),('fine-8k-playback',1024,1024,n),('before-playback',720,720,n),('fine-4k-playback',720,720,n)]:
        path=OUT/f'{id}-{kind}.mp4';cap=cv2.VideoCapture(str(path))
        assert int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))==w
        assert int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))==h
        fps=cap.get(cv2.CAP_PROP_FPS);assert abs(fps-30)<.01
        declared=int(cap.get(cv2.CAP_PROP_FRAME_COUNT));count=0;fingerprints=set()
        while True:
            ok,f=cap.read()
            if not ok:break
            if count%15==0:fingerprints.add(hashlib.sha256(f.tobytes()).hexdigest())
            count+=1
        cap.release();assert count==declared==expected,(id,kind,count,declared,expected)
        assert len(fingerprints)>8,(id,kind,'frozen output')
        results.append({'file':path.name,'width':w,'height':h,'fps':fps,'decodedFrames':count,'duration':count/fps,'bytes':path.stat().st_size,'uniqueSampledFrames':len(fingerprints),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
        print(path.name,count,'frames verified',flush=True)
(OUT/'video-verification.json').write_text(json.dumps({'videos':results,'allDecoded':True},indent=2),'utf-8')
