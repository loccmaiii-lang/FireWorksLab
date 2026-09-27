import cv2, json, numpy as np, sys
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
m=json.load(open('analysis/map.json')); src='vidio/'
out={}
fig,axs=plt.subplots(7,2,figsize=(14,18))
for ax,(k,f) in zip(axs.flat,m.items()):
    cap=cv2.VideoCapture(src+f); fps=cap.get(cv2.CAP_PROP_FPS)
    E=[];A=[]
    while True:
        ok,fr=cap.read()
        if not ok: break
        h,w=fr.shape[:2]; sc=480/max(h,w); g=cv2.cvtColor(cv2.resize(fr,(int(w*sc),int(h*sc)),interpolation=cv2.INTER_AREA),cv2.COLOR_BGR2GRAY).astype(np.float32)
        E.append(float(np.clip(g-60,0,None).sum())); A.append(int((g>120).sum()))
    t=np.arange(len(E))/fps; out[k]={'fps':fps,'E':E,'A':A}
    ax.plot(t,np.array(E)/max(E),label='能量'); ax.plot(t,np.array(A)/max(max(A),1),label='亮像素'); ax.set_title(k); ax.set_xticks(np.arange(0,t[-1]+0.01,0.5),minor=True); ax.grid(which='both',alpha=.3)
plt.tight_layout(); plt.savefig('analysis/curves/scan.png',dpi=70)
json.dump(out,open('analysis/scan.json','w'))
