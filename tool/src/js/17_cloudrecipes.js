// 云端 4.0-g 配方的可运行结构预览。来源：协作/花型配方总表.md。
// 只描述配方，不在模拟核按效果名称分支；missing 项不生成替代画面。
const CLOUD_SILVER={ramp0:'#000000',ramp1:'#626d86',ramp2:'#d8e5ff',ramp3:'#ffffff'};
const cloudLayer=(name,type,p={},color='#ffffff',silver=false,delay=0,origin=[0,0])=>({name,type,p,m:{stages:[[0,color]],...(silver?CLOUD_SILVER:{})},delay,origin});
function cloudCoreLayers(n){
  const outer=cloudLayer('亲星 · 金尾菊','kiku',{stars:150,burn:2.7,duration:3.5,seed:41},'#ffd398');
  const R=reachOf(defaultsFor('kiku').P.v0,defaultsFor('kiku').P.vt,2.7);
  const colors=['#70aaff','#e6ff3a','#ff71cf','#ffffff'];
  return [outer,...Array.from({length:n},(_,i)=>cloudLayer('芯 '+(i+1),'botan',{
    stars:Math.max(24,85-i*17),v0:v0For(R*Math.pow(.57,i+1),22,2.7),vt:22,burn:2.7,duration:3.5,
    burnJit:4,headSize:1.1,flash:0,exposure:1.4,seed:52+i},colors[i],true))];
}
function cloudFourColors(type='botan'){
  return ['#ff65c5','#63ff9f','#749dff','#ffda64'].map((c,i)=>cloudLayer(['粉','绿','蓝','金'][i]+(type==='senrin'?'小玉组':'星组'),type,
    type==='senrin'?{stars:5,seed:60+i,subStars:36,subTail:0,subFlash:0,carrierTail:0,carrierHead:.2,subKeep:.15,subScaleJit:.2,flash:i?0:1.2}:
    {stars:45,seed:60+i,burn:2.6,duration:3.2,headSize:1.3,flash:i?0:1.2},c,true));
}
const CLOUD_RECIPES=[
  ...[1,2,3,4].map((n,i)=>({id:'core'+n,name:['芯入菊','八重芯','三重芯','四重芯'][i],note:'亲星 + '+n+' 层芯，同一爆点同时开花；芯半径逐层收至约 57%。',layers:()=>cloudCoreLayers(n)})),
  {id:'lime_core',name:'金蕊青柠星',note:'外层橙色短尾转青柠，金色芯；这是云端结构起点，尚未按参考精调。',layers:()=>[
    {...cloudLayer('青柠外层','kiku',{stars:150,burn:3.1,duration:3.6,sparkStop:.6,headDim:.22,headDimUntil:.6,seed:72},'#e6ff3a'),m:{stages:[[0,'#ff9a47'],[.6,'#e6ff3a']],xw:.12}},
    cloudLayer('金芯','kiku',{stars:70,v0:45,vt:18,burn:2.8,duration:3.6,sparkLife:.3,flash:0,seed:73},'#ffd179')]},
  {id:'silver_crown',name:'银冠',note:'冷白长火花与余烬下垂成冠。',layers:()=>[cloudLayer('银冠','kamuro',{T0:2800,cooling:.28,sparkLife:1.3,emberFrac:.4,emberLife:3,emberBright:.22,exposure:4},'#e8ecff',true)]},
  {id:'gold_crown',name:'金冠',note:'锦冠的金色配方，保留长火花和下垂。',layers:()=>[cloudLayer('金冠','kamuro',{exposure:4,emberFrac:.35,emberLife:3,emberBright:.2},'#ffcb83')]},
  {id:'gold_willow',name:'金柳',note:'金色长火花展开后缓慢下垂。',layers:()=>[cloudLayer('金柳','yanagi',{v0:150,vt:17,massLoss:.2,sparkLife:1.6,exposure:3},'#ffd797')]},
  {id:'silver_willow',name:'银柳',note:'柳形轨迹与冷白细尾，展开后缓慢下垂。',layers:()=>[cloudLayer('银柳','yanagi',{v0:150,vt:17,massLoss:.2,sparkLife:1.6,T0:2800,cooling:.25,exposure:.7},'#eef2ff',true)]},
  {id:'four_colors',name:'四色牡丹 · 混合',note:'同一爆点四组独立色星，每色一层。当前是混合分布；实拍的扇区分色尚未实现。',layers:()=>cloudFourColors()},
  {id:'crackle_core',name:'霹雳芯',note:'金色亲星包围中心爆裂星；这里只预览光效，不包含声音。',layers:()=>[
    cloudCoreLayers(0)[0],cloudLayer('霹雳芯','crackle',{stars:35,v0:36,vt:16,flash:0,crackleDelay:.55,headSize:1,exposure:3,seed:87},'#ffd499')]},
  {id:'sea',name:'海上自爆',note:'贴水面上半球与倒影；采用现有水中花火能力。',layers:()=>[cloudLayer('水面半球','water',{stars:170,headSize:1.2,sparkLife:.45,exposure:3},'#b1f4cf')]},
  {id:'colored_senrin',name:'彩色千轮',note:'四组小玉陆续开花，合计 20 朵；每组独立配色。本条为单发，不含速射节目。',layers:()=>cloudFourColors('senrin')},
  {id:'hikisaki_red',name:'引先菊 · 红',note:'先见金尾，约 1.9 秒星端转亮红，尾停止。',layers:()=>[cloudLayer('金尾红先','kiku',{burn:3.2,duration:3.8,headDim:.05,headDimUntil:1.9,sparkStop:1.9,headSize:1.5},'#ff5262')]},
  {id:'hikisaki_blue',name:'引先菊 · 蓝',note:'先见金尾，约 1.9 秒星端转亮蓝，尾停止。',layers:()=>[cloudLayer('金尾蓝先','kiku',{burn:3.2,duration:3.8,headDim:.05,headDimUntil:1.9,sparkStop:1.9,headSize:1.5},'#779eff')]},
  {id:'silver_afterglow',name:'银菊 → 残光',note:'银尾停发后剩低频闪点；频闪暂用 2 Hz，待帧预算完成后再定。',layers:()=>[cloudLayer('银尾残光','kiku',{burn:5.2,duration:6,sparkStop:2.5,sparkLife:.65,T0:2800,cooling:.3,strobeHz:2,strobeStart:.52,strobeDuty:.45,fade:.4,exposure:3},'#e5edff',true)]},
  {id:'starfield',name:'满天星',note:'大量细闪点慢慢飘落，暂用低频闪烁，尚未做最终节奏标定。',layers:()=>[cloudLayer('满天星','strobe',{stars:380,v0:140,vt:10,burn:4.8,duration:5.5,headSize:.7,strobeHz:2,strobeDuty:.45,strobeStart:.1,exposure:6},'#ffe3ae',true)]},
  {id:'three_breaks',name:'多节礼花弹 · 三节',note:'三次开花有独立延迟和爆点；当前先预览开花编排，节间弹体飞行未表现。',layers:()=>[
    cloudLayer('第一节 · 牡丹','botan',{seed:101},'#ff72ba',true),
    cloudLayer('第二节 · 菊','kiku',{v0:90,stars:95,seed:102},'#a4edff',false,.9,[25,30]),
    cloudLayer('第三节 · 金冠','kamuro',{stars:65,v0:110,seed:103},'#ffd099',false,1.8,[-20,65])]},
  {id:'compound',name:'四色牡丹霹雳蕊',note:'四色亲星加霹雳芯；交叉环能力待补，本条名称不包含环。',layers:()=>[
    ...cloudFourColors(),cloudLayer('霹雳芯','crackle',{stars:30,v0:30,vt:16,flash:0,crackleDelay:.55,seed:98},'#ffdfb1')]},
  ...[['magenta','洋红','#ff3cc8'],['teal','青绿','#30ffd8'],['lemon','柠檬','#e6ff3a']].map(([id,name,color])=>({id,name:name+'牡丹',note:'云端新增焰色的无尾牡丹预览。',layers:()=>[cloudLayer(name,'botan',{},color,true)]})),
  {id:'changing_crown',name:'变色转冠',missing:'后段启用冠尾的分层时间线，需同一模拟拆头尾；不以整朵换色代替。'},
  {id:'cross_rings',name:'交叉环',missing:'多环独立方位和倾角；现有单环不能表达交叉结构。'},
  {id:'flying',name:'飞游星 / 尖叫星',missing:'确定性的推进/螺旋轨迹与声音节点。'},
  {id:'butterfly',name:'蝶',missing:'动态蝶的名称与成对旋转轨迹待核实。'},
  {id:'thunder',name:'雷 / 段雷',missing:'受光烟层与声音节点，不能只放一团白光。'},
  {id:'tiger',name:'虎之尾',missing:'名称与目标形态待核实，不能冒用 V5。'},
  {id:'parachute',name:'降落伞 / 吊灯',missing:'开伞后的缓降和摆动模型。'},
  {id:'iron',name:'打铁花',missing:'击打节奏、花棚/地面碰撞反弹及铁滴分叉。'},
  {id:'sync_flash',name:'白闪蕊 / 齐闪',missing:'统一闪烁相位与防混叠；现有点灭各星不同相。'},
  {id:'program',name:'速射 / 地面组合 / 大礼花节目',missing:'节目编排、地面与空中尺度统一、受光烟层。'},
  {id:'dew',name:'光露',missing:'名称待核实；可先看「银菊 → 残光」的明确结构。'}
];
function cloudRecipe(id){
  const r=CLOUD_RECIPES.find(r=>r.id===id);if(!r||!r.layers)throw new Error(r?r.missing:'未知配方');
  return {id:r.id,name:r.name,note:r.note,source:'协作/花型配方总表.md',layers:r.layers().map(l=>{
    const d=defaultsFor(l.type),P=derive({...d.P,renderVer:40,exposure:3,cols:4,rows:4,texW:2048,texH:2048,form:'master',outMode:'split',autoGrid:0,frameMode:'uniform',...l.p});
    const M=normalizeM({...d.M,...l.m},l.type);
    return {name:l.name,P,M,delay:l.delay||0,origin:[...l.origin]};
  })};
}
