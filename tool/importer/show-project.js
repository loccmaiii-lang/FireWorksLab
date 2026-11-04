// One editable project, deterministic schedules, no engine writes.
const ShowProject=(()=>{
  const SCHEMA='df.show-project/1',VERSION='1.0.0',lists=['resources','shots','formations','cues','segments','points'];
  const clone=x=>JSON.parse(JSON.stringify(x));
  const finite=(x,min=-1e6,max=1e6)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
  const round=x=>Number(x.toFixed(6));
  const uid=(prefix='item')=>prefix+'-'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10));
  const fanRank=(s,i)=>s.fanOrder==='rl'?s.fanCount-1-i:s.fanOrder==='out'?Math.floor(Math.abs(i-(s.fanCount-1)/2)):s.fanOrder==='in'?Math.floor((s.fanCount-1)/2)-Math.floor(Math.abs(i-(s.fanCount-1)/2)):s.fanOrder==='together'?0:i;
  function blank(){return {schema:SCHEMA,modelVersion:VERSION,projectId:uid('show'),name:'',revision:0,seed:7341,preRollS:0,site:{lengthsM:[150,150,200,150,150],mainHeightM:150,frontHeightM:50,cornerDeg:15,frontOffsetM:45,frontWidthM:200,yawDeg:0,estimated:true},resources:[],shots:[],formations:[],cues:[],segments:[],points:[]};}
  function stable(x){if(Array.isArray(x))return x.map(stable);if(x&&typeof x==='object')return Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));return x;}
  function fingerprint(value){const s=JSON.stringify(stable(value));let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return VERSION+':'+(h>>>0).toString(16)+':'+s.length;}
  function noise(seed,key,channel){const text=String(seed)+'|'+key+'|'+channel;let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return (h>>>0)/4294967295*2-1;}
  const calibrationSignature=r=>fingerprint([r.resourceId,r.sourceVersion,r.sourceFingerprint]);
  const calibrationValid=r=>!!r&&r.scaleVerified===true&&r.calibrationSignature===calibrationSignature(r)&&typeof r.scaleEvidence==='string'&&!!r.scaleEvidence.trim();
  function validate(doc){
    if(!doc||typeof doc!=='object'||Array.isArray(doc)||doc.schema!==SCHEMA)throw Error('不支持的工程格式或版本；原工程已保留。');
    const errors=[];
    if(JSON.stringify(doc).length>2e6)throw Error('工程超过2MB，不能载入。');
    if(typeof doc.projectId!=='string'||!doc.projectId||typeof doc.name!=='string'||doc.name.length>256)errors.push('工程名称或标识无效。');
    if(!finite(doc.seed,1,2147483646)||!Number.isInteger(doc.seed)||!finite(doc.preRollS,0,3600))errors.push('固定码或预卷时间无效。');
    for(const key of lists){
      if(!Array.isArray(doc[key])||doc[key].length>({resources:512,shots:512,formations:256,cues:2048,segments:128,points:256}[key])){errors.push(key+'列表格式无效或超过上限。');continue;}
      const ids=new Set(),names=new Set();for(const item of doc[key]){
        if(!item||typeof item!=='object'||Array.isArray(item)){errors.push(key+'条目格式无效。');continue;}
        if(typeof item.id!=='string'||!/^[A-Za-z0-9_.:-]{1,160}$/.test(item.id)||ids.has(item.id))errors.push(key+'存在重复或无效标识。');else ids.add(item.id);
        if(typeof item.name!=='string'||item.name.length>256)errors.push(key+'名称无效。');
        if(item.name){const n=item.name.toLowerCase();if(names.has(n))errors.push(key+'存在同名项：'+item.name);names.add(n);}
        if(['resources','shots','formations'].includes(key)&&(!Number.isInteger(item.version)||item.version<1))errors.push(item.name+'版本无效。');
        if(key==='formations'&&(!Array.isArray(item.members)||item.members.length>512||item.members.some(m=>!m||typeof m!=='object'||Array.isArray(m))))errors.push(item.name+'阵型成员格式无效或超过上限。');
      }
    }
    const site=doc.site;
    if(!site||!Array.isArray(site.lengthsM)||site.lengthsM.length!==5||site.lengthsM.some(x=>!finite(x,1,5000))||!finite(site.mainHeightM,0,10000)||!finite(site.frontHeightM,0,10000)||!finite(site.cornerDeg,0,60)||!finite(site.frontOffsetM,-5000,5000)||!finite(site.frontWidthM,1,5000)||!finite(site.yawDeg,-360,360))errors.push('五段场地参数无效。');
    return errors;
  }
  function pointLayout(site){
    const lengths=site.lengthsM,total=lengths.reduce((a,b)=>a+b,0),center=lengths[0]+lengths[1]+lengths[2]/2,angles=[-2*site.cornerDeg,-site.cornerDeg,0,site.cornerDeg,2*site.cornerDeg],rad=Math.PI/180;
    function at(d){let x=0,y=0,left=d,yaw=0;for(let i=0;i<5;i++){const n=Math.min(Math.max(left,0),lengths[i]);x+=n*Math.cos(angles[i]*rad);y+=n*Math.sin(angles[i]*rad);left-=n;if(left<=1e-7){yaw=-angles[i];if(Math.abs(n-lengths[i])<1e-7&&i<4)yaw=-(angles[i]+angles[i+1])/2;break;}}return {x,y,yaw};}
    const origin=at(center),a=site.yawDeg*rad,rot=(x,y)=>({xM:round(x*Math.cos(a)-y*Math.sin(a)),yM:round(x*Math.sin(a)+y*Math.cos(a))});
    const point=(id,name,d)=>{const p=at(d);return {id,name,...rot(p.x-origin.x,p.y-origin.y),zM:site.mainHeightM,yawDeg:round(p.yaw+site.yawDeg),arcM:d,group:id[0]==='P'?'主排':'点间'};};
    const points=[];for(let i=0;i<9;i++)points.push(point('P'+(i+1),'主排 '+(i+1),total*i/8));for(let i=0;i<8;i++)points.push(point('B'+(i+1),'点间 '+(i+1),total*(i+.5)/8));
    for(let i=0;i<3;i++)points.push({id:'F'+(i+1),name:'前台 '+(i+1),...rot((i-1)*site.frontWidthM*.375,site.frontOffsetM),zM:site.frontHeightM,yawDeg:site.yawDeg,group:'前台'});
    return points;
  }
  function resource(name='',role='burst'){return {id:uid('resource'),name,version:1,resourceId:'',role,sourceVersion:'',sourceFingerprint:'',baseDiameterM:null,baseRiseM:null,scaleVerified:false,calibrationSignature:'',scaleEvidence:'',notes:''};}
  function shot(name='',kind='burst'){return {id:uid('shot'),name,version:1,kind,burstRef:null,trailRef:null,fanRef:null,flightTier:'custom',sizeTier:'custom',flightS:0,riseM:0,diameterM:0,burstLifeS:4,trailLifeS:null,burstScale:1,trailScale:{X:1,Y:1,Z:1},scaleMode:'manual',heightMode:'original',color:'#d5e8eb',fanCount:10,fanSpreadDeg:100,fanOrder:'together',fanIntervalS:0,random:{sizePct:0,heightPct:0,angleDeg:0},source:null,burstAnchorConfirmed:false,notes:''};}
  function formation(name=''){return {id:uid('formation'),name,version:1,members:[]};}
  function cue(name=''){return {id:uid('cue'),name,formationId:'',formationVersion:1,segmentId:'',clock:'burst',timeS:0,strictBurst:false,timeJitterS:0,enabled:true};}
  function ref(item){return item?{id:item.id,version:item.version}:null;}
  function setResourceId(doc,id,value){const r=doc.resources.find(r=>r.id===id);if(!r)throw Error('资源已被移除。');r.resourceId=String(value).trim();r.version++;}
  function rebind(doc){for(const s of doc.shots)for(const k of ['burstRef','trailRef','fanRef'])if(s[k]){const r=doc.resources.find(r=>r.id===s[k].id);if(r)s[k].version=r.version;}for(const f of doc.formations)for(const m of f.members){const s=doc.shots.find(s=>s.id===m.shotId);if(s)m.shotVersion=s.version;}for(const c of doc.cues){const f=doc.formations.find(f=>f.id===c.formationId);if(f)c.formationVersion=f.version;}}
  function compile(doc){
    let errors=validate(doc);const warnings=[],shots=[],stages=[];const result={shots,stages,points:[],stats:{},errors,warnings,fingerprint:fingerprint(doc)};
    if(errors.length)return result;
    const points=doc.points.length?clone(doc.points):pointLayout(doc.site);result.points=points;
    const get=(arr,id)=>arr.find(x=>x.id===id),warn=text=>{if(!warnings.includes(text))warnings.push(text);},err=text=>{if(!errors.includes(text))errors.push(text);};
    let expectedShots=0,expectedStages=0;for(const c of doc.cues.filter(c=>c.enabled!==false)){const f=get(doc.formations,c.formationId);for(const m of f?.members||[]){const s=get(doc.shots,m.shotId);expectedShots++;expectedStages+=s?.kind==='fan'?Math.max(0,Math.min(256,Number(s.fanCount)||0)):s?.kind==='raw'?(s.source?.Entries?.length||0):s?.trailRef?2:1;}}
    if(expectedShots>8192||expectedStages>65536){err('生成总量超过预览上限（8192发 / 65536资源段），请拆分工程或减少事件。');return result;}
    if(doc.site.estimated)warn(doc.points.length?'当前自定义点位仍标为估值，请按关卡实测调整。':'场地'+doc.site.cornerDeg+'°转角/'+doc.site.frontOffsetM+'m前移为估值，请按关卡实测调整。');
    for(const p of points)if(!finite(p.xM)||!finite(p.yM)||!finite(p.zM,0,10000)||!finite(p.yawDeg,-360,360))err('发射点坐标无效：'+p.name);
    for(const seg of doc.segments)if(!finite(seg.startS,0,86400)||!finite(seg.endS,0,86400)||seg.endS<=seg.startS)err('段落起止时间无效：'+seg.name);
    const segs=[...doc.segments].sort((a,b)=>a.startS-b.startS);for(let i=1;i<segs.length;i++)if(segs[i].startS<segs[i-1].endS)err('段落时间重叠：'+segs[i-1].name+' / '+segs[i].name);
    const templates=new Set();for(const s of doc.shots){if(!s.name)err('完整单发尚未命名。');const name=s.name.toLowerCase();if(templates.has(name))err('子模板名重复：'+s.name);templates.add(name);}
    const checkResource=(binding,label,required)=>{
      if(!binding){if(required)err(label+'未选择资源。');return null;}
      const r=get(doc.resources,binding.id);if(!r){err(label+'引用的资源已删除。');return null;}
      if(binding.version!==r.version)err(label+'资源版本已变化，请核对后重新绑定。');
      if(!r.resourceId)err(label+'的 ResourceId 为空。');
      else {try{ShowText.name(r.resourceId,'ResourceId');}catch(e){err(label+'：'+e.message);}const known=typeof ShowResources!=='undefined'?ShowResources.get(r.resourceId):null;if(known&&!known.platforms.includes('pc'))err(label+'选了仅手机的ID；当前工程只输出PC。');if(!known)warn('自定义 ResourceId 尚未在当前PC表核对：'+r.resourceId);}
      return r;
    };
    const checked=new Map();
    function definition(s){
      if(checked.has(s.id))return checked.get(s.id);
      const required=s.kind==='burst',burst=checkResource(s.burstRef,s.name+'开花',required),trail=checkResource(s.trailRef,s.name+'尾缀',false),fan=checkResource(s.fanRef,s.name+'单簇',s.kind==='fan');
      if(!['burst','fan','raw'].includes(s.kind))err(s.name+'单发类型无效。');
      const numericFields=[['flightS',0,3600],['riseM',0,10000],['diameterM',0,5000],['burstLifeS',.01,3600],['burstScale',.001,100]];
      for(const [k,min,max] of numericFields)if(!finite(s[k],min,max))err(s.name+'的'+k+'尚未填写或无效。');
      if(s.trailLifeS!==null&&s.trailLifeS!==undefined&&!finite(s.trailLifeS,.01,3600))err(s.name+'尾缀可见时长无效。');
      for(const axis of ['X','Y','Z'])if(!finite(s.trailScale?.[axis],.001,100))err(s.name+'尾缀缩放无效。');
      for(const [k,max] of [['sizePct',50],['heightPct',50],['angleDeg',45]])if(!finite(s.random?.[k],0,max))err(s.name+'随机范围无效。');
      if(!/^#[0-9a-f]{6}$/i.test(s.color))err(s.name+'预览颜色无效。');
      if(s.kind==='fan'&&(!Number.isInteger(s.fanCount)||s.fanCount<1||s.fanCount>256||!finite(s.fanSpreadDeg,0,170)||!finite(s.fanIntervalS,0,10)||!['lr','rl','out','in','together'].includes(s.fanOrder)))err(s.name+'扇形数量、角度或顺序无效。');
      let sourceValid=true;if(s.kind==='raw'){try{ShowText.subtemplate(s.source);}catch(e){sourceValid=false;err(s.name+'完整配方无效：'+e.message);}warn('完整配方保留原资源段，概览飞行/花径用于时序与示意，请核对内部延迟：'+s.name);}
      if(s.scaleMode!=='manual'&&s.scaleMode!=='calibrated')err(s.name+'花径输出方式无效。');
      if(s.heightMode!=='original'&&s.heightMode!=='calibrated')err(s.name+'尾缀高度输出方式无效。');
      if(s.scaleMode==='calibrated'&&(!calibrationValid(burst)||!finite(burst.baseDiameterM,.001,5000)))err(s.name+'启用花径换算前，须填写原花径及标定记录，并确认当前ID与源版本的UE标定。');
      if(s.heightMode==='calibrated'&&(!calibrationValid(trail)||!finite(trail.baseRiseM,.001,10000)))err(s.name+'启用尾缀Z换算前，须填写原升高及标定记录，并确认当前ID与源版本的UE标定。');
      if(s.kind==='burst'&&(s.scaleMode!=='calibrated'||trail&&s.heightMode!=='calibrated'))warn('花径/尾缀升高含未标定目标；仅示意构图，输出保持手填组件倍率：'+s.name);
      if(s.kind==='fan')warn('扇形展开高度为构图目标，原生展开距离仍由素材和输出倍率决定：'+s.name);
      if(trail&&s.trailLifeS===null)warn('尾缀可见时长未实测，峰值统计暂按飞行时间估算：'+s.name);
      const numericValid=numericFields.every(([k,min,max])=>finite(s[k],min,max))&&['X','Y','Z'].every(k=>finite(s.trailScale?.[k],.001,100))&&[['sizePct',50],['heightPct',50],['angleDeg',45]].every(([k,max])=>finite(s.random?.[k],0,max))&&(s.trailLifeS==null||finite(s.trailLifeS,.01,3600))&&(s.kind!=='fan'||Number.isInteger(s.fanCount)&&finite(s.fanCount,1,256)&&finite(s.fanIntervalS,0,10)&&finite(s.fanSpreadDeg,0,170));
      const out={burst,trail,fan,drawable:numericValid&&sourceValid};checked.set(s.id,out);return out;
    }
    for(const s of doc.shots)definition(s);
    for(const formation of doc.formations){if(!Array.isArray(formation.members)||formation.members.length>512){err(formation.name+'阵型成员无效。');continue;}const memberIds=new Set();for(const m of formation.members){if(!m.id||memberIds.has(m.id))err(formation.name+'阵型成员标识重复。');memberIds.add(m.id);const p=get(points,m.pointId),s=get(doc.shots,m.shotId);if(!p)err(formation.name+'发射点缺失：'+m.pointId);if(!s)err(formation.name+'完整单发缺失：'+m.shotId);if(s&&m.shotVersion!==s.version)err(formation.name+'单发版本已变化，请核对后重新绑定。');if(!finite(m.offsetS,-3600,3600)||!finite(m.angleDeg,-180,180)||!finite(m.scale,.001,100)||(m.riseM!==null&&m.riseM!==undefined&&!finite(m.riseM,0,10000)))err(formation.name+'成员偏移、角度、高度或倍率无效。');}}
    for(const c of doc.cues){
      if(c.enabled===false)continue;const formation=get(doc.formations,c.formationId),segment=get(doc.segments,c.segmentId);
      if(!formation){err(c.name+'阵型未选择或已删除。');continue;}if(c.formationVersion!==formation.version)err(c.name+'阵型版本已变化，请核对后重新绑定。');
      if(!segment)err(c.name+'段落未选择或已删除。');
      if(!['burst','launch'].includes(c.clock)||!finite(c.timeS,0,86400)||!finite(c.timeJitterS,0,30)){err(c.name+'时间基准、目标时间或随机无效。');continue;}
      if(c.strictBurst&&(c.clock!=='burst'||c.timeJitterS!==0||formation.members.some(m=>m.offsetS!==0)))err(c.name+'严格齐爆要求以起爆计时、成员偏移及时间随机为0。');
      if(!formation.members.length)err(c.name+'阵型没有成员。');
      for(const m of formation.members){const s=get(doc.shots,m.shotId),p=get(points,m.pointId);if(!s||!p)continue;const defs=definition(s);if(!defs.drawable||!finite(m.offsetS,-3600,3600)||!finite(m.angleDeg,-180,180)||!finite(m.scale,.001,100)||(m.riseM!=null&&!finite(m.riseM,0,10000))||!finite(p.xM)||!finite(p.yM)||!finite(p.zM,0,10000)||!finite(p.yawDeg,-360,360))continue;
        if(s.kind==='raw'&&c.clock==='burst'&&s.burstAnchorConfirmed!==true){err(s.name+'完整资源段尚未确认起爆锚点；请核对内部延迟，或使用发射计时。');continue;}
        const key=c.id+'/'+m.id,flight=s.flightS,target=c.timeS+m.offsetS+noise(doc.seed,key,'time')*c.timeJitterS,launch=c.clock==='burst'?target-flight:target,burst=c.clock==='burst'?target:target+flight;
        if(launch+doc.preRollS<-1e-6)err(c.name+'发射早于整场0秒；需要至少'+round(-launch)+'秒预卷，不能截断。');
        const eventTime=c.clock==='burst'?burst:launch;if(segment&&(eventTime<segment.startS||eventTime>=segment.endS))warn('事件目标在所属段落之外：'+c.name+'，请核对段落归属。');
        const random=s.random||{},sizeFactor=(1+noise(doc.seed,key,'size')*(random.sizePct||0)/100)*m.scale,baseRise=m.riseM??s.riseM,rise=baseRise*(1+noise(doc.seed,key,'height')*(random.heightPct||0)/100),angle=m.angleDeg+noise(doc.seed,key,'angle')*(random.angleDeg||0),diameter=s.diameterM*sizeFactor;
        const burstScale=(s.scaleMode==='calibrated'&&defs.burst?.baseDiameterM>0?diameter/defs.burst.baseDiameterM:s.burstScale*sizeFactor),trailScale={...s.trailScale};if(s.heightMode==='calibrated'&&defs.trail?.baseRiseM>0)trailScale.Z=rise/defs.trail.baseRiseM;
        if(s.kind==='burst'&&(!finite(burstScale,.000001,100)||Object.values(trailScale).some(x=>!finite(x,.000001,100))))err(c.name+' / '+p.id+'输出倍率越界；叠乘或标定后须大于0且不超过100。');
        if(s.kind==='fan'&&!finite(sizeFactor,.000001,100))err(c.name+' / '+p.id+'单簇输出倍率越界。');
        const radius=radians=>({X:0,Y:Math.sin(radians)*rise*100,Z:Math.cos(radians)*rise*100}),localBurst=radius(angle*Math.PI/180),yaw=p.yawDeg*Math.PI/180;
        const worldBurst={X:round(p.xM*100-localBurst.Y*Math.sin(yaw)),Y:round(p.yM*100+localBurst.Y*Math.cos(yaw)),Z:round(p.zM*100+localBurst.Z)};
        const row={id:key,cueId:c.id,cueName:c.name,segmentId:c.segmentId,formationId:formation.id,memberId:m.id,shotId:s.id,shotName:s.name,kind:s.kind,pointId:p.id,point:clone(p),launchS:round(launch),burstS:round(burst),flightS:flight,riseM:round(rise),diameterM:round(diameter),sizeFactor:round(sizeFactor),angleDeg:round(angle),burstScale:round(burstScale),trailScale,worldBurst,localBurst,preFire:!!segment&&launch<segment.startS,calibrated:s.kind==='burst'&&s.scaleMode==='calibrated'&&(!defs.trail||s.heightMode==='calibrated'),endS:round(Math.max(burst+s.burstLifeS,launch+(defs.trail?(s.trailLifeS??flight):0))),color:s.color,sizeTier:s.sizeTier,flightTier:s.flightTier,hasTrail:!!defs.trail,fanCount:s.kind==='fan'?s.fanCount:0};shots.push(row);
        if(row.preFire)warn('存在跨段预发，发射属于上一时段、开花仍计入目标段。');
        if(defs.trail)stages.push({id:key+'/trail',rowId:key,kind:'trail',startS:launch,endS:launch+(s.trailLifeS??flight),resourceId:defs.trail.resourceId,systems:1});
        if(s.kind==='fan')for(let i=0;i<s.fanCount;i++){const rank=fanRank(s,i);stages.push({id:key+'/fan/'+i,rowId:key,kind:'fan',startS:launch+rank*s.fanIntervalS,endS:launch+rank*s.fanIntervalS+s.burstLifeS,resourceId:defs.fan?.resourceId||'',systems:1});}
        else if(s.kind==='raw'){for(const [i,e] of (s.source?.Entries||[]).entries())stages.push({id:key+'/raw/'+i,rowId:key,kind:'raw',startS:launch+e.LocalTimeOffset,endS:launch+e.LocalTimeOffset+s.burstLifeS,resourceId:e.FXResourceId,systems:1});}
        else stages.push({id:key+'/burst',rowId:key,kind:'burst',startS:burst,endS:burst+s.burstLifeS,resourceId:defs.burst?.resourceId||'',systems:1});
        row.endS=round(Math.max(row.endS,...stages.slice(-(s.kind==='fan'?s.fanCount:s.kind==='raw'?s.source.Entries.length:defs.trail?2:1)).map(x=>x.endS)));
      }
    }
    shots.sort((a,b)=>a.launchS-b.launchS||a.id.localeCompare(b.id));
    const edges=stages.flatMap(s=>[{t:s.startS,delta:s.systems},{t:s.endS,delta:-s.systems}]).sort((a,b)=>a.t-b.t||a.delta-b.delta);let active=0,peak=0,peakS=0;for(const e of edges){active+=e.delta;if(active>peak){peak=active;peakS=e.t;}}
    const count=fn=>shots.filter(fn).length;
    result.stats={totalShots:shots.length,bursts:count(s=>s.kind==='burst'),trails:count(s=>s.hasTrail),fanGroups:count(s=>s.kind==='fan'),fanMembers:shots.reduce((n,s)=>n+s.fanCount,0),wallShots:count(s=>s.segmentId==='white-wall'),small:count(s=>s.kind==='burst'&&s.sizeTier==='small'),medium:count(s=>s.kind==='burst'&&s.sizeTier==='medium'),large:count(s=>s.kind==='burst'&&s.sizeTier==='large'),peakSystems:peak,peakS:round(peakS),durationS:round(Math.max(0,...stages.map(x=>x.endS),...doc.segments.map(x=>x.endS))),preFire:count(s=>s.preFire),resourcesUsed:new Set(stages.map(s=>s.resourceId).filter(Boolean)).size};
    return result;
  }
  return {SCHEMA,VERSION,lists,blank,clone,uid,finite,round,stable,fingerprint,noise,fanRank,calibrationSignature,calibrationValid,validate,pointLayout,resource,shot,formation,cue,ref,setResourceId,rebind,compile};
})();
