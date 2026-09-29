"""Measured video colours, official CIE data, and a Planck radiance LUT.
No elemental identification or real pyrotechnic formulation is inferred.
"""
from pathlib import Path
import json, hashlib, urllib.request, shutil
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont
LAB=Path(__file__).resolve().parents[1]; ROOT=LAB.parents[1]; OUT=LAB/'studies/radiometry'
FONT=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
def linear(x):
    x=np.asarray(x)/255.;return np.where(x<=.04045,x/12.92,((x+.055)/1.055)**2.4)
def display(x):
    x=np.clip(x,0,1);return np.where(x<=.0031308,12.92*x,1.055*x**(1/2.4)-.055)
def main():
    OUT.mkdir(exist_ok=True); (OUT/'science').mkdir(exist_ok=True)
    for name in ['CIE_xyz_1931_2deg.csv','CIE_xyz_1931_2deg.csv_metadata.json']:
        p=OUT/'science'/name
        if not p.exists():urllib.request.urlretrieve('https://files.cie.co.at/Publications-datasets/'+name,p)
    csv=OUT/'science/CIE_xyz_1931_2deg.csv'
    assert hashlib.md5(csv.read_bytes()).hexdigest()=='17cca777db64b17170f06f67ce9d3ab7'
    data=np.loadtxt(csv,delimiter=',');lam=data[:,0]*1e-9;cmf=data[:,1:]
    temps=np.arange(800,6001,10,dtype=float)
    B=2*6.62607015e-34*299792458**2/lam[None,:]**5/np.expm1(.014387768775039337/(lam[None,:]*temps[:,None]))
    xyz=B@cmf*1e-9
    # Linear sRGB, D65 primaries. Do not adapt each emitter to white.
    mat=np.array([[3.2406,-1.5372,-.4986],[-.9689,1.8758,.0415],[.0557,-.2040,1.0570]])
    rgb=xyz@mat.T
    norm=rgb[np.where(temps==3000)[0][0]].max()
    rgb=np.maximum(rgb,0)/norm
    lut={'minK':800,'stepK':10,'referenceK':3000,'normalization':'one shared maximum RGB radiance at 3000 K; no per-temperature normalization','rgb':np.round(rgb,9).tolist(),'xyz':(xyz/norm).tolist(),'source':'https://cie.co.at/datatable/cie-1931-colour-matching-functions-2-degree-observer','license':'CIE 2019, DOI 10.25039/CIE.DS.xvudnb9b, CC BY-SA 4.0; derived LUT under same license'}
    (OUT/'science/blackbody.json').write_text(json.dumps(lut,separators=(',',':')),'utf-8')
    refs=json.loads((LAB/'studies/references.json').read_text('utf-8')); allstats={}
    for id,times in [('V14',[.5,1.4,3.2,5.1,7,8.2,8.8,9.6]),('V13',[.5,1.9,3.4,4.1,5.2,6.5,8,10])]:
        ref=refs[id];cap=cv2.VideoCapture(str(ROOT/ref['path']));stats=[]
        sheet=Image.new('RGB',(1440,8*270),(10,13,20));d=ImageDraw.Draw(sheet)
        for j,t in enumerate(times):
            frame=round((t+ref['t0'])*30);cap.set(cv2.CAP_PROP_POS_FRAMES,frame);ok,bgr=cap.read();assert ok
            a=cv2.cvtColor(bgr,cv2.COLOR_BGR2RGB);v=a.max(2).astype(float)
            y,x=np.mgrid[:a.shape[0],:a.shape[1]];cx,cy=(363,328) if id=='V14' else (362,378)
            r=np.hypot(x-cx,y-cy)
            roi=(x>15)&(x<705)&(y>15)&(y<(735 if id=='V14' else 830))
            if id=='V13' and t<3.3:roi&=r<min(135,30+60*t)
            hp=v-cv2.GaussianBlur(v,(0,0),3)
            active=roi&(hp>12)&(v>65)
            clip=active&(v>=250)
            good=active&(v>=90)&(v<235)
            # Broad warm/cool classes describe appearance only, not compounds.
            rgb=a.astype(float);warm=good&(rgb[:,:,0]>rgb[:,:,2]*1.16)&(rgb[:,:,1]>rgb[:,:,2]*1.10)
            red=good&(rgb[:,:,0]>rgb[:,:,1]*1.55)&(rgb[:,:,0]>rgb[:,:,2]*1.08)
            blue=good&(rgb[:,:,2]>rgb[:,:,0]*1.15)
            green=good&(rgb[:,:,1]>rgb[:,:,0]*1.10)&(rgb[:,:,1]>rgb[:,:,2]*1.05)
            st={'t':t,'frame':frame,'active':int(active.sum()),'clipped_fraction':float(clip.sum()/max(1,active.sum())),'groups':{}}
            for key,m in [('warm',warm),('red',red),('blue',blue),('green',green),('all',good)]:
                pixels=a[m];lin=linear(pixels)
                # Median of per-pixel RGB chromaticities. Camera encoding is assumed sRGB.
                chroma=lin/np.maximum(lin.max(1,keepdims=True),1e-8)
                st['groups'][key]={'count':len(pixels),'median_srgb':np.median(pixels,axis=0).tolist() if len(pixels) else None,'median_linear_chroma':np.median(chroma,axis=0).tolist() if len(pixels) else None}
            stats.append(st)
            im=Image.fromarray(a[:850]);im.thumbnail((245,245));sheet.paste(im,(0,j*270+25))
            mask=a.copy();mask[~good]=0;im=Image.fromarray(mask[:850]);im.thumbnail((245,245));sheet.paste(im,(230,j*270+25))
            d.text((5,j*270+2),f'{id} +{t:.2f}s',font=FONT,fill='white')
            d.text((240,j*270+2),'非饱和细线像素',font=FONT,fill='white')
            d.text((470,j*270+20),f'活跃像素 {active.sum()}   饱和 {st["clipped_fraction"]:.1%}',font=FONT,fill='#c6cfdf')
            for k,key in enumerate(['warm','red','blue','green']):
                g=st['groups'][key];xx=470+k*240
                if g['count']:
                    color=tuple(int(z) for z in display(np.array(g['median_linear_chroma']))*220)
                    d.rectangle((xx,j*270+75,xx+205,j*270+135),fill=color)
                    d.text((xx,j*270+145),f'{key}: {g["count"]} px',font=FONT,fill='white')
                    d.text((xx,j*270+177),' / '.join(f'{z:.3f}' for z in g['median_linear_chroma']),font=FONT,fill='#adbaca')
            cv2.imwrite(str(OUT/f'{id}-source-{t:g}.png'),bgr)
        cap.release();allstats[id]=stats;sheet.save(OUT/f'{id}-colour-evidence.jpg',quality=95)
        print(id,[(s['t'],round(s['clipped_fraction'],3),s['groups']['warm']['median_linear_chroma'],s['groups']['red']['median_linear_chroma']) for s in stats])
    (OUT/'source-colours.json').write_text(json.dumps({'method':'Local contrast >12 code values against sigma 3 background; max channel 90..234; fixed exclusion regions. sRGB assumption; clipping >=250. Descriptive pixel statistics, NOT thermometry or element identification. Text, ground, and previous V13 shell excluded. Broad classes overlap and must not be added.','samples':allstats},ensure_ascii=False,indent=2),'utf-8')
    # Freeze the complete V3 runtime; V4 only adds its own renderer.
    engine=(LAB/'tool/FireworkBaker.html').read_text('utf-8').replace('<script src="data/review.js"></script>','')
    engine=engine.replace('</body>','<script src="renderer.js"></script></body>')
    (OUT/'engine.html').write_text(engine,'utf-8')
    (OUT/'science/LICENSE-CIE.txt').write_text('CIE 2019. Colour-matching functions of CIE 1931 standard colorimetric observer. DOI 10.25039/CIE.DS.xvudnb9b. https://creativecommons.org/licenses/by-sa/4.0/\nThe original CSV, metadata and derived blackbody.json LUT are shared under CC BY-SA 4.0. LUT derived by Planck integration, XYZ-to-linear-sRGB transformation and a single reference radiance normalization.\n','utf-8')
if __name__=='__main__':main()
