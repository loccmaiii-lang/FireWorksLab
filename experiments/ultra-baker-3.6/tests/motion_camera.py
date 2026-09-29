import json, cv2, numpy as np
from motion_analysis import ROOT,OUT,REFS

for id in ['V14','V13']:
    ref=REFS[id];cap=cv2.VideoCapture(str(ROOT/ref['path']));frames=[];cum=[np.eye(3)];checks=[]
    while True:
        ok,f=cap.read()
        if not ok:break
        frames.append(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY))
    mask=np.zeros_like(frames[0]);mask[1100:1265,15:705]=255
    if id=='V13':mask[902:944,10:710]=255
    else:mask[1040:1265,15:705]=255
    for i in range(1,len(frames)):
        a,b=frames[i-1],frames[i]
        pts=cv2.goodFeaturesToTrack(a,maxCorners=200,qualityLevel=.015,minDistance=7,mask=mask)
        M=None;n=0;inliers=0;err=None
        if pts is not None and len(pts)>=6:
            nxt,st,_=cv2.calcOpticalFlowPyrLK(a,b,pts,None,winSize=(25,25),maxLevel=3)
            back,st2,_=cv2.calcOpticalFlowPyrLK(b,a,nxt,None,winSize=(25,25),maxLevel=3)
            valid=(st.ravel()>0)&(st2.ravel()>0)&(np.linalg.norm((pts-back).reshape(-1,2),axis=1)<1)
            pa=pts.reshape(-1,2)[valid];pb=nxt.reshape(-1,2)[valid];n=len(pa)
            if n>=6:
                M,ins=cv2.estimateAffinePartial2D(pa,pb,method=cv2.RANSAC,ransacReprojThreshold=1.2)
                if M is not None:
                    inliers=int(ins.sum());err=float(np.median(np.linalg.norm(pa@M[:,:2].T+M[:,2]-pb,axis=1)[ins.ravel()>0]))
                    # Avoid rotation/zoom extrapolation from a narrow row of distant windows.
                    delta=np.median(pb[ins.ravel()>0]-pa[ins.ravel()>0],axis=0)
                    M=np.float64([[1,0,delta[0]],[0,1,delta[1]]])
        if M is None or inliers<6:M=np.float64([[1,0,0],[0,1,0]])
        full=np.eye(3);full[:2]=M;cum.append(full@cum[-1]);checks.append({'frame':i,'features':n,'inliers':inliers,'median_error':err})
    t0=4.2 if id=='V14' else 5.7;ix=round(t0*30)
    transforms=[(cum[ix]@np.linalg.inv(c))[:2].tolist() for c in cum]
    f=frames[ix];roi=np.zeros_like(f);roi[220:490,270:445]=f[220:490,270:445]
    yy,xx=np.nonzero(roi>max(100,roi.max()*.75));center=[float(xx.mean()),float(yy.mean())]
    good=sum(c['inliers']>=6 for c in checks)
    doc={'method':'Translation-only median optical flow of ground/building features; captions and fireworks excluded. No zoom or time warp. Camera translation approximation, not full 3D stabilization.','t0':t0,'burst_frame':ix,'center':center,'frames':len(frames),'valid_pairs':good,'transforms':transforms,'checks':checks}
    (OUT/f'{id}-camera.json').write_text(json.dumps(doc,separators=(',',':')),'utf-8')
    dr=np.array(transforms)[:,:,2];print(id,'center',center,'valid',good,'of',len(checks),'correction range',dr.min(0),dr.max(0),flush=True)
