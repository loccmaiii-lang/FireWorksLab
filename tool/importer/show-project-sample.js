// Explicit proposal import only. No preset numeric recipe is loaded on new.
const ShowProjectSample=(()=>{
  function create(){
    const d=ShowProject.blank();d.projectId='proposal-opening-wall-v1';d.name='跨年秀 · 开场三层＋四波白墙';
    d.segments=[{id:'opening',name:'开场三层',startS:0,endS:15},{id:'middle',name:'中段占位 · 本版未排',startS:15,endS:188},{id:'white-wall',name:'四波白墙',startS:188,endS:200},{id:'ending',name:'余韵',startS:200,endS:210}];
    function res(id,name,role,resourceId=''){const r=ShowProject.resource(name,role);r.id=id;r.resourceId=resourceId;r.notes=resourceId?'已知ID快照候选，需核对当前PC资源。':'计划名称尚未映射到实际ResourceId，请自行绑定。';d.resources.push(r);return r;}
    const exact=id=>ShowResources.get(id)?.platforms.includes('pc')?id:'';
    const tail=res('tail-medium','中档尾缀 · 需确认当前RT6 ID','trail','');
    const silver=res('silver-ray','金芒菊银白 · 中/大花径','burst','');
    const gold=res('gold-ray','金芒菊金色','burst',exact('P_EFX_FireWorks_GoldSpark'));
    const small=res('silver-small','低层小银菊','burst','');
    const fans=['Central_01','Middle_01','OuterLeft','OuterRight'].map((suffix,i)=>res('fan-'+i,['金锦冠中心','金锦冠中间','金锦冠外左','金锦冠外右'][i],'fan',exact('P_EFX_FireWorks_FanGold_'+suffix)));
    function single(id,name,burst,rise,diameter,flight,sizeTier){const s=ShowProject.shot(name);Object.assign(s,{id,burstRef:ShowProject.ref(burst),trailRef:flight===5?ShowProject.ref(tail):null,flightTier:flight===5?'medium':'custom',sizeTier,flightS:flight,riseM:rise,diameterM:diameter,burstLifeS:4,color:burst===gold?'#efd48b':'#e5f5ff'});d.shots.push(s);return s;}
    const silverLow=single('open-silver-low','OpenSilver_210',silver,210,150,5,'medium'),silverHigh=single('open-silver-high','OpenSilver_240',silver,240,150,5,'medium');
    const goldLow=single('open-gold-low','OpenGold_210',gold,210,150,5,'medium'),goldHigh=single('open-gold-high','OpenGold_240',gold,240,150,5,'medium');
    const low=single('open-small','OpenSmall_80',small,80,90,3.5,'small');
    const wall=single('wall','WhiteWall_MFlight_LDiameter',silver,210,230,5,'large');wall.burstLifeS=8;
    const fanShots=fans.map((r,i)=>{const s=ShowProject.shot(['FanGold_Centre_Custom','FanGold_Middle_Custom','FanGold_Left_Custom','FanGold_Right_Custom'][i],'fan');Object.assign(s,{id:'fan-shot-'+i,fanRef:ShowProject.ref(r),flightS:1,riseM:45,diameterM:80,burstLifeS:3,fanCount:10,fanSpreadDeg:100,color:'#e4c97e'});d.shots.push(s);return s;});
    function member(id,pointId,shot,offsetS=0){return {id,pointId,shotId:shot.id,shotVersion:shot.version,offsetS,angleDeg:0,scale:1,riseM:null};}
    function opening(id,name,lo,hi){const f=ShowProject.formation(name);f.id=id;for(let i=0;i<9;i++){f.members.push(member('mid-'+i,'P'+(i+1),i%2===0?lo:hi));f.members.push(member('small-'+i,'P'+(i+1),low));}
      const layout=ShowProject.pointLayout(d.site).filter(p=>p.group!=='前台');for(const p of layout){const role=p.id==='P5'?0:p.yawDeg>=22?2:p.yawDeg<=-22?3:1;f.members.push(member('fan-'+p.id,p.id,fanShots[role]));}d.formations.push(f);return f;}
    const openSilver=opening('open-silver-form','Opening_Silver_ThreeLayers',silverLow,silverHigh),openGold=opening('open-gold-form','Opening_Gold_ThreeLayers',goldLow,goldHigh);
    const white=ShowProject.formation('WhiteWall_NinePoints');white.id='white-form';for(let i=0;i<9;i++)white.members.push(member('wall-'+i,'P'+(i+1),wall));d.formations.push(white);
    function event(id,name,f,timeS,segmentId,strictBurst=false){d.cues.push({...ShowProject.cue(name),id,formationId:f.id,formationVersion:f.version,timeS,segmentId,strictBurst});}
    event('open-silver','开场银白 · 5秒齐亮',openSilver,5,'opening');event('open-gold','开场金色 · 10秒齐亮',openGold,10,'opening');
    for(let i=0;i<4;i++)event('white-'+(i+1),'白墙第'+(i+1)+'波',white,190+i*2,'white-wall',true);
    return d;
  }
  return {create};
})();
