const ShowCatalog = (() => {
  const profiles=Object.create(null),custom=new Map(),records=new Map(),initialKeys=Object.assign(Object.create(null),{FanGold:'gold',FanSilver:'silver',FanComet:'comet',GoldSpark:'goldspark',GoldCrackle:'goldcrackle',GreenPeony:'greenpeony'});
  function build(value,key,localOnly=false){
    const source=ShowText.subtemplate(value),entries=source.Entries;
    const samePosition=entries.every(e=>['X','Y','Z'].every(k=>Math.abs(e.PositionOffset[k]-entries[0].PositionOffset[k])<.00001));
    const sorted=[...entries].sort((a,b)=>a.RotationOffset.Roll-b.RotationOffset.Roll),distinct=sorted.every((e,i)=>i===0||e.RotationOffset.Roll-sorted[i-1].RotationOffset.Roll>.00001);
    const isFan=entries.every(e=>e.LocalTimeOffset===0)&&samePosition&&distinct;
    if(isFan){
      source.Entries=sorted;
      const angles=sorted.length===1?[-1,1]:sorted.map(e=>e.RotationOffset.Roll),sizes=sorted.length===1?[sorted[0].EffectScale.X,sorted[0].EffectScale.X]:sorted.map(e=>e.EffectScale.X);
      const span=sorted.length===1?2:Math.max(10,Math.abs(angles[0])*2,Math.abs(angles.at(-1))*2);
      return {key,name:source.TemplateName,kind:'resource',source,angles,sizes,span,lift:.85,life:1.2,localOnly};
    }
    const lift=Math.max(...entries.map(e=>e.LocalTimeOffset));
    return {key,name:source.TemplateName,kind:'template',source,angles:[-1,1],sizes:[1,1],span:2,lift,life:Math.max(1.2,lift+.9),localOnly};
  }
  function find(templateName){return Object.keys(profiles).find(key=>!profiles[key].isBlank&&profiles[key].name.toLowerCase()===templateName.toLowerCase());}
  function add(value,{localOnly=true,replace=false}={}){
    const n=ShowText.name(value?.TemplateName,'子模板名'),existing=find(n);
    if(existing&&!replace)throw Error('素材库已有同名模板，请先换一个 TemplateName。');
    const key=existing||initialKeys[n]||'bp:'+n.toLowerCase(),profile=build(value,key,localOnly);
    profiles[key]=profile;records.set(key,profile.source);custom.set(key,profile.source);return key;
  }
  // Empty drafts never contain samples from the user's old BP values.
  const emptyEntry=()=>({FXResourceId:'',LocalTimeOffset:0,PositionOffset:ShowText.vector(),RotationOffset:ShowText.rotator(),RandomPositionRange:ShowText.vector(),RandomRotationRange:ShowText.rotator(),EffectScale:ShowText.vector(1,1,1),RandomScaleRatio:0,Filter:ShowText.filter()});
  profiles.blank={key:'blank',name:'空白 / 自定义',kind:'resource',isBlank:true,source:{TemplateName:'',Entries:[emptyEntry()]},angles:[-1,1],sizes:[1,1],span:2,lift:.85,life:1.2,localOnly:true};
  profiles['blank-template']={key:'blank-template',name:'请选择已添加的子模板',kind:'template',isBlank:true,source:{TemplateName:'',Entries:[]},angles:[-1,1],sizes:[1,1],span:2,lift:0,life:1.2,localOnly:true};
  function sync(values){
    if(!Array.isArray(values)||values.length>512)throw Error('BP 未返回有效的子模板清单。');
    const prepared=values.map(v=>({value:v,name:ShowText.name(v?.TemplateName,'子模板名')}));
    if(new Set(prepared.map(x=>x.name.toLowerCase())).size!==prepared.length)throw Error('BP 包含同名子模板，请先在 UE 处理重名。');
    const changes=[],skipped=[];
    for(const {value,name} of prepared){try{const key=find(name)||initialKeys[name]||'bp:'+name.toLowerCase();changes.push([key,build(value,key,false)]);}catch{skipped.push(name);}}
    if(!changes.length)throw Error('没有可读取的资源模板，本地素材库已保留。');
    let added=0,updated=0;for(const [key,profile] of changes){if(Object.hasOwn(profiles,key)&&!profiles[key].isBlank)updated++;else added++;profiles[key]=profile;records.set(key,profile.source);custom.set(key,profile.source);}
    return {added,updated,skipped:skipped.length};
  }
  function setSequenceEditor(key,config){
    const profile=profiles[key];if(!profile||profile.kind!=='template')return;
    const editor=ShowSequence.restore(config),result=ShowSequence.make(editor,profile.name);if(result.errors.length)return;
    profile.sequenceConfig=editor;profile.flight=result.flight;profile.launchOffset=result.launchTime;profile.burstOffset=result.events.find(e=>e.role==='burst')?.fire??profile.lift;profile.life=Math.max(profile.life,result.duration);
  }
  function snapshot(){return [...custom].map(([key,source])=>({source,localOnly:profiles[key].localOnly,...(profiles[key].sequenceConfig?{editor:profiles[key].sequenceConfig}:{})}));}
  function restore(list){if(!Array.isArray(list))return;for(const item of list.slice(0,512)){try{const key=add(item.source,{replace:true,localOnly:item.localOnly!==false});if(item.editor)setSequenceEditor(key,item.editor);}catch{}}}
  function all(){return [...records.values()];}
  return {profiles,add,sync,snapshot,restore,all,find,setSequenceEditor};
})();
