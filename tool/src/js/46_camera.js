/* 镜头与模拟分离：秒、米；正交取景的有限光圈散焦近似。 */
const CameraImaging=(()=>{
 const defaults={cameraMotion:0,cameraShutter:1/30,cameraPhase:'end',cameraQuality:'high',cameraDof:0,cameraDistance:1,cameraFocus:1,cameraAperture:.012,cameraBlades:0};
 const settings=P=>({...defaults,...P});
 function validate(P){const c=settings(P);for(const k of ['cameraMotion','cameraDof'])if(![0,1,false,true].includes(c[k]))throw Error('镜头开关无效');
  for(const [k,min,max]of [['cameraShutter',.0001,1],['cameraDistance',.001,10000],['cameraFocus',.001,10000],['cameraAperture',0,100]])if(!Number.isFinite(c[k])||c[k]<min||c[k]>max)throw Error(k+'超出有效范围');
  if(!['start','center','end'].includes(c.cameraPhase)||!['fast','high','reference'].includes(c.cameraQuality)||![0,6].includes(+c.cameraBlades))throw Error('镜头选项无效');return c;
 }
 function window(P,t){const c=settings(P),w=c.cameraMotion?c.cameraShutter:0,offset=c.cameraPhase==='start'?0:c.cameraPhase==='center'?-.5:-1;return[t+offset*w,t+(offset+1)*w];}
 // 正交中心投影不改变构图。有限光圈射线会聚到焦平面，离焦距离线性决定散焦半径。
 function coc(P,depth){if(!P.cameraDof)return 0;const focus=P.cameraFocus??defaults.cameraFocus;return (P.cameraAperture??defaults.cameraAperture)*.5*Math.abs(((P.cameraDistance??defaults.cameraDistance)+depth-focus)/focus);}
 const quality=P=>P.cameraQuality==='fast'?{step:1.2,hz:240}:P.cameraQuality==='reference'?{step:.175,hz:1920}:{step:.35,hz:960};
 return{defaults,settings,validate,window,coc,quality};
})();
