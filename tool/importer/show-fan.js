// Shared scale/endpoint model. A unit source length is an assumption until calibrated.
const ShowFan = (() => {
  const outlines={native:'按填写的大小计算长度',arc:'圆弧 · 等长',dome:'圆顶 · 两侧较短',level:'平顶 · 端点等高'};
  const bounded=(v,min,max,fallback)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback;
  function options(input={}){
    const calibration=Object.create(null);
    if(input.calibration&&typeof input.calibration==='object'&&!Array.isArray(input.calibration))for(const [id,value] of Object.entries(input.calibration).slice(0,512)){
      if(!['__proto__','constructor','prototype'].includes(id)&&Number.isFinite(Number(value))&&Number(value)>=.05&&Number(value)<=20)calibration[id]=Number(value);
    }
    return {outline:Object.hasOwn(outlines,input.outline)?input.outline:'native',sizeLayout:['native','uniform','custom','symmetric'].includes(input.sizeLayout)?input.sizeLayout:'uniform',edgeLength:bounded(input.edgeLength,.4,1.5,.85),lengthScale:bounded(input.lengthScale,.25,2,1),applyLengthScale:input.applyLengthScale===true,calibration,resourceId:typeof input.resourceId==='string'?input.resourceId.trim():'',angleRatios:typeof input.angleRatios==='string'?input.angleRatios:'',sizeRatios:typeof input.sizeRatios==='string'?input.sizeRatios:''};
  }
  function ratios(text,label,min,max,ascending=false){
    if(typeof text!=='string'||!text.trim())throw Error('请填写'+label+'。');
    if(text.length>4096)throw Error(label+'过长。');
    const values=text.trim().split(/[\s,，;；]+/).map(value=>/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)?Number(value):NaN);
    if(!values.length||values.length>256||values.some(v=>!Number.isFinite(v)||v<min||v>max))throw Error(label+'须为'+min+'–'+max+'的数字，用逗号或空格分隔，最多256项。');
    if(ascending&&(values.length<2||values.some((v,i)=>i>0&&v<=values[i-1])))throw Error(label+'至少填2项，并从左到右严格递增。');
    return values;
  }
  function sample(values,u){const p=u*(values.length-1),a=Math.floor(p),b=Math.min(a+1,values.length-1);return values[a]+(values[b]-values[a])*(p-a);}
  function size(profile,u,layout,text=''){if(layout==='uniform')return 1;const values=layout==='native'?profile.sizes:ratios(text,'大小配比',.01,10),original=sample(values,u);return layout==='symmetric'?(original+sample(values,1-u))/2:original;}
  function model(profile,event,index,count,settings={}){
    const s=options(settings),originals=profile.source.Entries,u=count===1?.5:index/(count-1),original=originals[Math.round(u*(originals.length-1))],source=profile.isBlank?{...original,FXResourceId:s.resourceId}:original;
    const reference=sample(originals.map(e=>e.EffectScale.X),u),factor=event.size/reference;
    const nativeScale=Object.fromEntries(['X','Y','Z'].map(axis=>[axis,sample(originals.map(e=>e.EffectScale[axis]),u)*factor]));
    const baseLength=s.calibration[source.FXResourceId]||1,nativeLength=nativeScale.Z*baseLength;
    const radians=event.angle*Math.PI/180,t=Math.min(1,Math.abs(event.angle)/Math.max(5,Number(settings.spread||100)/2));
    const shape=s.outline==='level'?1/Math.max(.05,Math.cos(radians)):s.outline==='dome'?1+(s.edgeLength-1)*t*t:1;
    const targetLength=(s.outline==='native'?nativeLength:(Number(settings.scale)||1)*shape)*s.lengthScale*event.height;
    const effectScale={...nativeScale,...(s.applyLengthScale?{Z:targetLength/baseLength}:{})};
    const requiresApplication=!s.applyLengthScale&&(s.outline!=='native'||Math.abs(s.lengthScale-1)>1e-8)&&Math.abs(targetLength-nativeLength)>1e-6;
    // Unapplied contour is a labelled target and cannot be silently exported.
    const previewLength=requiresApplication?targetLength:effectScale.Z*baseLength;
    return {source,nativeScale,effectScale,baseLength,nativeLength,targetLength,previewLength,requiresApplication,calibrated:Object.hasOwn(s.calibration,source.FXResourceId)};
  }
  function check(model){
    if(model.requiresApplication)throw Error('目标轮廓长度尚未应用，请勾选「输出 Z 长度缩放」；须确认资源支持纵向缩放。');
    if(Object.values(model.effectScale).some(v=>!Number.isFinite(v)||v<=0||v>100))throw Error('计算后的资源缩放须大于0且不超过100，请检查长度与素材校准。');
  }
  return {options,outlines,sample,size,model,check,ratios};
})();
