from pathlib import Path
import json, shutil, cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

LAB=Path(__file__).resolve().parents[1]
ROOT=LAB.parents[1]
OUT=LAB/'studies/motion'
REFS=json.loads((LAB/'studies/references.json').read_text('utf-8'))
FONT=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)

def crop(frame,box,size=400):
    x,y,w,h=box
    return cv2.warpAffine(frame,np.float32([[size/w,0,-x*size/w],[0,size/h,-y*size/h]]),(size,size),flags=cv2.INTER_AREA,borderMode=cv2.BORDER_CONSTANT)

def main():
    OUT.mkdir(exist_ok=True)
    for id in ['V14','V13']:
        manifest=json.loads((LAB/f'studies/{id}-study.json').read_text('utf-8'))
        before=OUT/f'before/{id}.json'
        if not before.exists():
            v=manifest['variants']['fine-4k']
            for l in v['layers']:
                for s in l['segments']:shutil.copy2(LAB/'studies'/s['file'],OUT/'before'/s['file'])
            before.write_text(json.dumps(v,ensure_ascii=False,indent=2),'utf-8')
        r=REFS[id];cap=cv2.VideoCapture(str(ROOT/r['path']));frames=[]
        while True:
            ok,f=cap.read()
            if not ok:break
            frames.append(f)
        cap.release();fps=r['fps'];t0=r['t0'];rows=[]
        box=(-40,-20,800,800) if id=='V14' else (-90,0,900,900)
        for start in [0,6]:
            sheet=Image.new('RGB',(1600,4*430),(9,13,21));d=ImageDraw.Draw(sheet)
            for j in range(16):
                dt=start+j*.4;ix=round((t0+dt)*fps)
                if ix>=len(frames):
                    d.text((j%4*400+20,j//4*430+90),'原片已结束',font=FONT,fill='#8391a7');continue
                im=Image.fromarray(cv2.cvtColor(crop(frames[ix],box),cv2.COLOR_BGR2RGB))
                x=j%4*400;y=j//4*430;sheet.paste(im,(x,y+30))
                d.text((x+8,y+3),f'{id} +{ix/fps-t0:.2f}s | video {ix/fps:.2f}s',font=FONT,fill='white')
            sheet.save(OUT/f'{id}-sequence-{start}.jpg',quality=95)
        # Keep every source frame, excluding text/ground. Radius is diagnostic, not a physical distance.
        yy,xx=np.mgrid[:frames[0].shape[0],:frames[0].shape[1]]
        cx,cy=(360,317) if id=='V14' else (350,365)
        rr=np.hypot(xx-cx,yy-cy)
        roi=(yy<760 if id=='V14' else yy<850)&(yy>30)&(xx>5)&(xx<715)
        for i,f in enumerate(frames):
            t=i/fps-t0
            g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
            hp=g-cv2.GaussianBlur(g,(0,0),7)
            mask=roi&(hp>18)&(g>70)
            rgb=cv2.cvtColor(f,cv2.COLOR_BGR2RGB).astype(np.float32)
            red=mask&(rgb[:,:,0]>rgb[:,:,1]*1.3)&(rgb[:,:,0]>rgb[:,:,2]*1.1)
            white=mask&(rgb.min(2)>140)&(rgb.max(2)-rgb.min(2)<70)
            upper=mask&(yy<cy)
            rows.append({'frame':i,'video_time':round(i/fps,4),'elapsed':round(t,4),'active_pixels':int(mask.sum()),'white_pixels':int(white.sum()),'red_pixels':int(red.sum()),'luma_sum':float(g[mask].sum()),'bounds_99':np.percentile(np.stack([xx[mask],yy[mask]]),[.5,99.5],axis=1).tolist() if mask.sum()>20 else None,'upper_r95':float(np.percentile(rr[upper],95)) if upper.sum()>20 else None})
        (OUT/f'{id}-per-frame.json').write_text(json.dumps(rows,separators=(',',':')),'utf-8')
        print(id,len(frames),'frames',flush=True)

if __name__=='__main__':main()
