from pathlib import Path
import numpy as np
from PIL import Image
from radiometry_analysis import OUT
for raw in sorted(OUT.glob('*-linear-*.rgba32f')):
 id,t=raw.stem.split('-linear-');i=round(float(t)*30)
 a=np.asarray(Image.open(OUT/f'{id}-hdr-packed/{i:04d}.png')).reshape(1024,1024,8).copy().view('<f2').reshape(1024,1024,4)[...,:3].astype('f4')
 b=np.fromfile(raw,dtype='<f4').reshape(1024,1024,4)[::-1,:,:3];d=np.abs(a-b)
 print(raw.name,'max',float(d.max()),'mean',float(d.mean()),'count',int((d>0).sum()),'energy ratio',float(a.sum()/max(b.sum(),1e-12)),flush=True)
