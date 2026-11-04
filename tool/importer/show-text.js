// UE property text is data, never JavaScript. Numbers are emitted explicitly.
const ShowText = (() => {
  const vector=(X=0,Y=0,Z=0)=>({X,Y,Z}),rotator=(Pitch=0,Yaw=0,Roll=0)=>({Pitch,Yaw,Roll});
  const defaultFilter=()=>({...ShowBlueprintData.parentFilter});
  function name(value,label='名称'){
    if(typeof value!=='string'||!value.trim()||value.trim().toLowerCase()==='none'||/[\u0000-\u001f\u007f]/.test(value)||value.length>256)throw Error(label+'不能为空、None、含控制字符或超过256字。');
    return value.trim();
  }
  function number(value,fallback=0){if(value===undefined)return fallback;if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>1e9)throw Error('参数必须为有效有限数字。');return Number(value.toFixed(6));}
  function fields(value,keys,fallback){if(value===undefined)return {...fallback};if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).some(k=>k!=='_struct'&&!keys.includes(k)))throw Error('向量或旋转格式不正确。');return Object.fromEntries(keys.map(k=>[k,number(value[k],fallback[k])]));}
  function entry(value){
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('每个资源段必须是完整的属性元组。');
    const known=['_struct','FXResourceId','LocalTimeOffset','PositionOffset','RotationOffset','RandomPositionRange','RandomRotationRange','EffectScale','RandomScaleRatio','Filter'];const unknown=Object.keys(value).filter(k=>!known.includes(k));if(unknown.length)throw Error('资源段包含不支持的BP字段：'+unknown.join('、'));
    const out={FXResourceId:name(value.FXResourceId,'ResourceId'),LocalTimeOffset:number(value.LocalTimeOffset),PositionOffset:fields(value.PositionOffset,['X','Y','Z'],vector()),RotationOffset:fields(value.RotationOffset,['Pitch','Yaw','Roll'],rotator()),RandomPositionRange:fields(value.RandomPositionRange,['X','Y','Z'],vector()),RandomRotationRange:fields(value.RandomRotationRange,['Pitch','Yaw','Roll'],rotator()),EffectScale:fields(value.EffectScale,['X','Y','Z'],vector(1,1,1)),RandomScaleRatio:number(value.RandomScaleRatio),Filter:filter(value.Filter)};
    if(out.LocalTimeOffset<0||out.LocalTimeOffset>86400)throw Error('资源段出现时间须为0–86400秒。');
    if(Object.values(out.EffectScale).some(v=>v<=0||v>100))throw Error('资源缩放须大于0且不超过100。');
    if([...Object.values(out.RandomPositionRange),...Object.values(out.RandomRotationRange),out.RandomScaleRatio].some(v=>v<0))throw Error('随机范围不能为负数。');
    if(out.RandomScaleRatio>1)throw Error('随机缩放比不能超过1。');
    return out;
  }
  function filter(value){
    const f=value||defaultFilter(),flags=number(f.PlatformFlags,defaultFilter().PlatformFlags),quality=f.MinQualityLevel??defaultFilter().MinQualityLevel;
    if(!Number.isInteger(flags)||flags<0||flags>2147483647||typeof quality!=='string'||!/^\w+(?:::\w+)*$/.test(quality))throw Error('平台或画质 Filter 格式不正确。');
    return {PlatformFlags:flags,MinQualityLevel:quality};
  }
  function subtemplate(value){
    if(!value||typeof value!=='object'||Array.isArray(value)||!Array.isArray(value.Entries)||!value.Entries.length||value.Entries.length>256)throw Error('请粘贴包含 TemplateName 和1–256条 Entries 的单个子模板。');
    if(value.RequiredPointCount!==undefined||value.Entries.some(e=>e.EntryType!==undefined||e.SubTemplateName!==undefined))throw Error('这里只接收子模板的资源段；父模板引用请粘贴到 UE 的 EffectTemplate。');
    return {TemplateName:name(value.TemplateName,'子模板名'),Entries:value.Entries.map(entry)};
  }
  function parse(text){
    if(typeof text!=='string'||text.length>1000000)throw Error('参数文本为空或超过1MB。');
    text=text.trim().replace(/^[“”‘’]+|[“”‘’]+$/g,'').trim();let i=0,depth=0,nodes=0;
    const ws=()=>{while(/\s/.test(text[i]||'')&&i<text.length)i++;},fail=()=>{throw Error('参数格式不完整，请复制从 (TemplateName= 开始的整项。');};
    function token(){ws();const start=i;while(i<text.length&&!/[\s(),=]/.test(text[i]))i++;if(i===start)fail();return text.slice(start,i);}
    function quoted(){i++;let result='';while(i<text.length){const c=text[i++];if(c==='"')return result;if(c==='\\'){if(i>=text.length)fail();const n=text[i++];result+=({n:'\n',r:'\r',t:'\t','"':'"','\\':'\\'})[n]??n;}else result+=c;}fail();}
    function value(){
      ws();if(++nodes>30000||depth>24)throw Error('参数结构过深或项目过多。');
      if(text[i]==='"')return quoted();
      if(text[i]!=='('){const t=token();if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(t)){const n=Number(t);if(!Number.isFinite(n))fail();return n;}if(!/^[A-Za-z_][\w:]*$/.test(t))fail();return t;}
      i++;depth++;ws();if(text[i]===')'){i++;depth--;return [];}
      const start=i;let object=false;
      if(/[A-Za-z_]/.test(text[i])){token();ws();object=text[i]==='=';i=start;}
      const out=object?Object.create(null):[];
      while(true){
        if(object){const key=token();if(!/^[A-Za-z_]\w*$/.test(key)||['__proto__','prototype','constructor'].includes(key)||Object.hasOwn(out,key))throw Error('参数属性重复或名称无效。');ws();if(text[i++]!=='=')fail();out[key]=value();}
        else out.push(value());
        ws();if(text[i]===')'){i++;depth--;return out;}if(text[i++]!==',')fail();
      }
    }
    const result=value();ws();if(i!==text.length)fail();return result;
  }
  const quote=value=>'"'+String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
  const float=value=>{const n=number(value);return (Object.is(n,-0)?0:n).toFixed(6);};
  const v=value=>'(X='+float(value.X)+',Y='+float(value.Y)+',Z='+float(value.Z)+')';
  const r=value=>'(Pitch='+float(value.Pitch)+',Yaw='+float(value.Yaw)+',Roll='+float(value.Roll)+')';
  const f=value=>'(PlatformFlags='+value.PlatformFlags+',MinQualityLevel='+value.MinQualityLevel+')';
  function entryText(e,parent=false){return '('+(parent?'EntryType=SubTemplate,FXResourceId="None",SubTemplateName='+quote(e.SubTemplateName)+',':'FXResourceId='+quote(e.FXResourceId)+',')+'LocalTimeOffset='+float(e.LocalTimeOffset)+','+(parent?'SlotIndex=0,':'')+'PositionOffset='+v(e.PositionOffset)+',RotationOffset='+r(e.RotationOffset)+',RandomPositionRange='+v(e.RandomPositionRange)+',RandomRotationRange='+r(e.RandomRotationRange)+',EffectScale='+v(e.EffectScale)+',RandomScaleRatio='+float(e.RandomScaleRatio)+',Filter='+f(e.Filter)+')';}
  function stringify(record,parent=false){return '(TemplateName='+quote(name(record.TemplateName,'模板名'))+','+(parent?'RequiredPointCount=1,':'')+'Entries=('+record.Entries.map(e=>entryText(e,parent)).join(',')+')'+(parent?',Filter='+f(record.Filter):'')+')';}
  function generate({mode,settings,events,profile,name:templateName,allowOriginalHeight=false}){
    const parent=mode==='template',lengthApplied=!parent&&ShowFan.options(settings).applyLengthScale;
    if(!events?.length)throw Error(parent?'请先添加并选择一个完整子模板。':'请先填写 ResourceId，并应用有效配比后导出。');
    if(parent&&profile.isBlank)throw Error('请先添加并选择一个完整子模板。');
    if(settings.heightJitter>0&&!allowOriginalHeight&&!lengthApplied)throw Error('升空高度随机尚无原生字段：请勾选按素材原高度导出，或将该随机设为0；扇形可显式输出Z长度缩放。');
    const entries=events.map((event,index)=>{
      if(parent)return {SubTemplateName:profile.source.TemplateName,LocalTimeOffset:event.fire,PositionOffset:vector(),RotationOffset:rotator(0,0,event.angle),RandomPositionRange:vector(),RandomRotationRange:rotator(),EffectScale:vector(event.size,event.size,event.size),RandomScaleRatio:0,Filter:defaultFilter()};
      const model=ShowFan.model(profile,event,index,events.length,settings),source=model.source;ShowFan.check(model);
      return entry({...source,LocalTimeOffset:event.fire,PositionOffset:{...source.PositionOffset},RotationOffset:{...source.RotationOffset,Roll:event.angle},RandomPositionRange:vector(),RandomRotationRange:rotator(),EffectScale:{...model.effectScale},RandomScaleRatio:0,Filter:{...source.Filter}});
    });
    const record={TemplateName:name(templateName,'模板名'),...(parent?{RequiredPointCount:1}:{}),Entries:entries,...(parent?{Filter:defaultFilter()}: {})};
    return {text:stringify(record,parent),record,heightOmitted:settings.heightJitter>0&&!lengthApplied,lengthApplied};
  }
  return {parse,entry,subtemplate,stringify,generate,name,vector,rotator,number,filter};
})();
