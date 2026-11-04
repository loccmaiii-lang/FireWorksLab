const ShowComposer = (() => {
  let controller=null;
  function init(){
    if(controller)return;
    controller=(()=>{

    const root=document.getElementById('df-pattern-study'),byId=id=>root.querySelector('#df-pattern-'+id);
    const scene=byId('scene'),timeline=byId('timeline'),ns='http://www.w3.org/2000/svg';
    const profiles=ShowPlan.profiles,defaults=ShowPlan.defaults,orders=ShowPlan.orders;
    const KEY='df.workbench.show.v1',LEGACY_KEY='df.workbench.show.legacy.v1';
    let mode='resource',shape='fan',sequence=ShowSequence.blank(),sequenceResult=null,sequencePaint=null,exportResult=null,copying=false,exportNames=Object.create(null),ratioDrafts={},saveEnabled=true,planErrors=[],configs={resource:{...defaults.resource},template:{...defaults.template}},events=[],time=0,duration=0,playing=false,frame=0,lastClock=null,marks=[],dots=[],cursor=null,speed=1,loop=false;
    const openStages=new Set(),stageSearches=new WeakMap();
    const remembered={advanced:false,numbers:false},clamp=(v,min,max,fallback)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback;
    const isSequence=()=>mode==='resource'&&shape==='sequence',current=()=>configs[mode],unit=()=>isSequence()?'段':mode==='resource'?'簇':'发',valid=(input,kind=mode)=>ShowPlan.valid(input,kind);
    const nameKey=()=>isSequence()?'sequence':mode+':'+current().profile;
    const suggestedName=()=>isSequence()||profiles[current().profile].isBlank?'':mode==='template'?'Show_'+profiles[current().profile].name+'_Custom':profiles[current().profile].name+'_Custom';
    const templateName=()=>Object.hasOwn(exportNames,nameKey())?exportNames[nameKey()]:suggestedName();
    function plan(){const result=isSequence()?ShowSequence.make(sequence,templateName()):ShowPlan.make(current(),mode);sequenceResult=isSequence()?result:null;events=result.events;duration=result.duration;planErrors=result.errors||[];}
    function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch{return null;}}
    function save(){
      if(!saveEnabled)return;
      try{localStorage.setItem(KEY,JSON.stringify({version:2,mode,shape,sequence,catalog:ShowCatalog.snapshot(),resourceIds:ShowResources.snapshot(),exportNames,ratioDrafts,configs:{resource:{...configs.resource},template:{...configs.template}},view:{time,advanced:byId('advanced').open,numbers:byId('numbers').open,speed,loop}}));}
      catch{byId('status').textContent='当前设置无法记住，仍可继续预览。';}
    }
    function elt(name,attrs,text,parent){
      const e=document.createElementNS(ns,name);for(const [key,value] of Object.entries(attrs||{}))e.setAttribute(key,String(value));if(text!==undefined)e.textContent=text;(parent||scene).appendChild(e);return e;
    }
    function draw(){
      if(isSequence()){sequencePaint=ShowSequenceScene.draw({scene,timeline,events,duration,byId,flight:sequence.flight,launchTime:sequenceResult.launchTime});paint();return;}
      sequencePaint=null;
      const s=current(),p=profiles[s.profile],width=Math.max(200,scene.getBoundingClientRect().width||400),height=Math.max(240,scene.getBoundingClientRect().height||350),ground=height-36,origin=width/2;
      scene.setAttribute('viewBox',`0 0 ${width} ${height}`);scene.replaceChildren();
      elt('title',{id:'df-pattern-scene-title'},'烟花展开方向与触发节奏');
      elt('desc',{id:'df-pattern-scene-desc'},`${s.count}${unit()}${p.name}，${orders[s.order]}，每步间隔${s.interval}秒。均从同一地面发射点升空。${mode==='template'?'每发保留升空至爆炸的内部时间。':''}简笔画示意，不代表真实粒子轨迹。`);
      elt('line',{x1:16,x2:width-16,y1:ground,y2:ground,class:'df-ground'});
      elt('text',{x:18,y:ground+23},'左');elt('text',{x:width-18,y:ground+23,'text-anchor':'end'},'右');elt('text',{x:origin,y:ground+23,'text-anchor':'middle'},'发射点');
      if(!events.length){marks=[];dots=[];cursor=null;timeline.replaceChildren();elt('text',{x:origin,y:height/2,'text-anchor':'middle'},mode==='template'?'添加并选择子模板后预览':'填写 ResourceId 后预览');paint();return;}
      const maxSize=Math.max(...events.map(e=>e.size)),radius=mode==='template'?14*maxSize:4*maxSize;
      const maxX=Math.max(.12,...events.map(e=>Math.abs(Math.sin(e.angle*Math.PI/180))*e.length));
      const maxY=Math.max(.12,...events.map(e=>Math.cos(e.angle*Math.PI/180)*e.length));
      const length=Math.max(1,Math.min((ground-38-radius)/maxY,(width/2-22-radius)/maxX));
      events.forEach(e=>{const theta=e.angle*Math.PI/180;e.x=origin+Math.sin(theta)*length*e.length;e.y=ground-Math.cos(theta)*length*e.length;e.ox=origin;e.oy=ground;e.radius=14*e.size;});
      if(mode==='resource'&&events.length>1)elt('polyline',{points:events.map(e=>e.x+','+e.y).join(' '),class:'df-envelope'});
      const indices=new Set(),boxes=[],stride=Math.ceil(s.count/10),priority=[0,s.count-1,...events.filter(e=>s.count<=10||e.index%stride===0).map(e=>e.index)];
      for(const i of new Set(priority)){
        const e=events[i],half=String(i+1).length*4+3,y=e.y-(mode==='template'?e.radius+9:10),box={l:e.x-half,r:e.x+half,t:y-13,b:y+3};
        if(box.l<4||box.r>width-4||box.t<3)continue;
        if(!boxes.some(b=>box.l<b.r&&box.r>b.l&&box.t<b.b&&box.b>b.t)){indices.add(i);boxes.push(box);}
      }
      marks=events.map(e=>{
        elt('line',{x1:origin,y1:ground,x2:e.x,y2:e.y,class:'df-guide','data-index':e.index+1});
        const trail=elt('line',{class:'df-trail','data-index':e.index+1});
        const head=elt('circle',{r:3*e.size,class:'df-head','data-index':e.index+1,'data-base-angle':e.baseAngle,'data-angle':e.angle,'data-size':e.size,'data-height':e.height,'data-fire':e.fire,'data-burst':e.burst??'','data-jitter-limit':e.jitterLimit,'data-origin-y':ground,'data-length':e.length,'data-scale-z':e.scaleZ??''});
        let burst=null;
        if(mode==='template'){
          burst=elt('g',{class:'df-burst','data-index':e.index+1,transform:`translate(${e.x} ${e.y})`});
          for(let k=0;k<8;k++){const a=k*Math.PI/4;elt('line',{x1:Math.cos(a)*e.radius*.22,y1:Math.sin(a)*e.radius*.22,x2:Math.cos(a)*e.radius,y2:Math.sin(a)*e.radius},undefined,burst);}
        }
        const number=indices.has(e.index)?elt('text',{x:e.x,y:e.y-(mode==='template'?e.radius+9:10),'text-anchor':'middle',class:'df-number'},String(e.index+1)):null;
        return {head,trail,burst,number};
      });
      const tw=Math.max(200,timeline.getBoundingClientRect().width||width),left=26,right=tw-26;
      timeline.setAttribute('viewBox',`0 0 ${tw} 70`);timeline.replaceChildren();
      elt('line',{x1:left,x2:right,y1:24,y2:24,class:'df-ground'},undefined,timeline);
      if(mode==='template')elt('line',{x1:left,x2:right,y1:42,y2:42,class:'df-ground'},undefined,timeline);
      const groups=new Map();events.forEach(e=>{const key=e.fire.toFixed(6);if(!groups.has(key))groups.set(key,{fire:e.fire,indices:[]});groups.get(key).indices.push(e.index+1);});
      const sorted=[...groups.values()].sort((a,b)=>a.fire-b.fire),labelIndices=new Set(),labelBoxes=[];dots=[];
      for(const i of new Set([0,sorted.length-1,...sorted.map((_,i)=>i)])){
        const g=sorted[i],text=g.indices.length>1?'×'+g.indices.length:String(g.indices[0]),x=left+(right-left)*g.fire/duration,half=text.length*4+3;
        if(!labelBoxes.some(b=>x-half<b.r&&x+half>b.l)){labelIndices.add(i);labelBoxes.push({l:x-half,r:x+half});}
      }
      sorted.forEach((g,i)=>{
        const x=left+(right-left)*g.fire/duration,dot=elt('circle',{cx:x,cy:24,r:3.5,class:'df-time-dot','data-fire':g.fire},undefined,timeline);
        elt('title',{},`${g.indices.join('、')}${unit()}，${g.fire.toFixed(2)}秒开始`,dot);dots.push({dot,fire:g.fire,kind:'start'});
        if(labelIndices.has(i))elt('text',{x,y:13,'text-anchor':'middle'},g.indices.length>1?'×'+g.indices.length:String(g.indices[0]),timeline);
        if(mode==='template'){
          const bt=g.fire+(p.burstOffset??p.lift),bx=left+(right-left)*bt/duration,b=elt('circle',{cx:bx,cy:42,r:3.5,class:'df-time-burst','data-fire':bt},undefined,timeline);
          elt('title',{},`${g.indices.join('、')}发，${bt.toFixed(2)}秒爆炸`,b);dots.push({dot:b,fire:bt,kind:'burst'});
        }
      });
      elt('text',{x:left,y:65},'0 s',timeline);elt('text',{x:right,y:65,'text-anchor':'end'},duration.toFixed(2)+' s',timeline);
      cursor=elt('line',{x1:left,x2:left,y1:18,y2:mode==='template'?49:37,class:'df-cursor'},undefined,timeline);cursor.dataset.width=tw;
      paint();
    }
    function paint(){
      if(isSequence()){sequencePaint?.(time);return;}
      const p=profiles[current().profile];
      events.forEach((e,i)=>{
        const age=time-e.fire,flight=p.flight??p.lift,launchAge=age-(p.launchOffset||0),phase=flight>0?Math.max(0,Math.min(1,launchAge/flight)):age>=0?1:0,q=Math.max(0,phase-.23),m=marks[i],visible=launchAge>=0&&launchAge<(mode==='template'?flight:p.life);
        m.head.setAttribute('cx',e.ox+(e.x-e.ox)*phase);m.head.setAttribute('cy',e.oy+(e.y-e.oy)*phase);m.head.setAttribute('visibility',visible?'visible':'hidden');
        m.trail.setAttribute('x1',e.ox+(e.x-e.ox)*q);m.trail.setAttribute('y1',e.oy+(e.y-e.oy)*q);m.trail.setAttribute('x2',e.ox+(e.x-e.ox)*phase);m.trail.setAttribute('y2',e.oy+(e.y-e.oy)*phase);m.trail.setAttribute('visibility',visible?'visible':'hidden');
        const alpha=mode==='template'?1:Math.min(1,Math.max(0,(p.life-age)/.35));m.head.setAttribute('opacity',alpha);m.trail.setAttribute('opacity',alpha);
        if(m.burst){const ba=age-(p.burstOffset??p.lift);m.burst.setAttribute('visibility',ba>=0&&ba<.9?'visible':'hidden');m.burst.setAttribute('opacity',Math.max(0,1-ba/.9));m.burst.setAttribute('transform',`translate(${e.x} ${e.y}) scale(${Math.max(.15,Math.min(1,.15+Math.max(0,ba)*3))})`);}
        if(m.number)m.number.setAttribute('class','df-number'+(age>=0?' df-fired':''));
      });
      dots.forEach(d=>d.dot.setAttribute('class',(d.kind==='burst'?'df-time-burst':'df-time-dot')+(time>=d.fire?' df-active':'')));
      if(cursor){const x=26+(Number(cursor.dataset.width)-52)*time/duration;cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);}
      byId('time').value=time;byId('time-value').value=time.toFixed(2)+' / '+duration.toFixed(2)+' s';
    }
    function renderRows(){
      byId('height-header').textContent=isSequence()?'爆炸Z / 轨迹':mode==='resource'?'线长估算 / Z缩放':'升空高度 ×';
      if(isSequence()){
        byId('burst-header').hidden=true;byId('numeric-note').textContent='资源段实际开始时间、Roll、尺度与爆炸位置；复制值保留6位小数。';byId('rows').replaceChildren();
        events.forEach(e=>{const row=document.createElement('tr'),values=[e.index+1,e.fire.toFixed(2),e.angle.toFixed(2),e.size.toFixed(3),e.role==='burst'?(e.position.Z/100).toFixed(2)+' m':'资源轨迹'];values.forEach(value=>{const td=document.createElement('td');td.textContent=value;row.appendChild(td);});byId('rows').appendChild(row);});return;
      }
      byId('numeric-note').textContent=mode==='resource'?'线长按导出Z缩放与素材校准估算；目标轮廓未应用时不能复制。':'逻辑编排数值 · 只读预览';
      byId('burst-header').hidden=mode!=='template';byId('rows').replaceChildren();
      events.forEach(e=>{const row=document.createElement('tr'),values=[e.index+1,e.fire.toFixed(2),e.angle.toFixed(2),e.size.toFixed(3),mode==='resource'?e.length.toFixed(3)+' / '+e.scaleZ.toFixed(3):e.height.toFixed(3)];if(mode==='template')values.push(e.burst.toFixed(2));values.forEach(value=>{const td=document.createElement('td');td.textContent=value;row.appendChild(td);});byId('rows').appendChild(row);});
    }
    function updateFanControls(){
      byId('fan-contour').hidden=mode!=='resource';if(mode!=='resource')return;
      const s=current(),p=profiles[s.profile];
      for(const id of ['sizeLayout','outline','edgeLength','lengthScale'])byId(id).value=s[id];byId('applyLengthScale').checked=s.applyLengthScale;
      byId('edgeLength-field').hidden=s.outline!=='dome';byId('edgeLength').disabled=s.outline!=='dome'||s.count===1;byId('edgeLength-value').value=s.edgeLength.toFixed(2)+' 倍';
      byId('lengthScale').disabled=!s.applyLengthScale&&s.outline==='native';byId('lengthScale-value').value=s.lengthScale.toFixed(2)+' 倍';
      const container=byId('fan-calibration');container.replaceChildren();
      for(const [index,id] of [...new Set(p.isBlank?[s.resourceId].filter(Boolean):p.source.Entries.map(e=>e.FXResourceId))].entries()){
        const label=document.createElement('label');label.className='df-field df-calibration';label.htmlFor='df-pattern-calibration-'+index;
        const text=document.createElement('span');text.className='df-label';text.textContent=id+' · 相对原长';
        const input=document.createElement('input');input.id=label.htmlFor;input.type='number';input.min='.05';input.max='20';input.step='.01';input.value=s.calibration[id]||1;
        input.addEventListener('change',()=>{if(!input.value||!input.checkValidity()){byId('error').textContent='素材相对原长需为0.05–20，当前轮廓保留上一组设置。';updateExport();return;}change('calibration',{...current().calibration,[id]:Number(input.value)});});
        label.append(text,input);container.append(label);
      }
      const scales=events.map(e=>e.scaleZ),pending=events.some(e=>e.requiresLengthApplication);
      byId('fan-length-note').textContent=(!scales.length?'等待填写有效资源与配比。':pending?'正在预览目标轮廓，复制前需应用 Z 长度缩放。':'当前导出 Z 缩放 '+Math.min(...scales).toFixed(3)+'–'+Math.max(...scales).toFixed(3)+'。')+'线长按缩放与素材校准估算，Cascade 内的轨迹、随机及视角仍会影响表现。';
    }
    function updateControls(rebuildStages=true){
      byId('shape-field').hidden=mode!=='resource';byId('shape').value=shape;byId('fan-fields').hidden=isSequence();byId('sequence-fields').hidden=!isSequence();byId('fan-contour').hidden=mode!=='resource'||isSequence();
      byId('library-title').textContent=`已保存的子模板 · ${Object.values(profiles).filter(p=>!p.isBlank).length} 个配方`;
      byId('resource-choice').hidden=mode!=='resource';refreshResourceOptions();
      byId('export-name').value=templateName();
      if(isSequence()){
        byId('resource-mode').setAttribute('aria-pressed','true');byId('template-mode').setAttribute('aria-pressed','false');byId('form-title').textContent='升空与爆炸';
        updateSequenceControls(rebuildStages);byId('time').max=duration;byId('play').textContent=time>=duration?'重播':'播放一遍';
        const bursts=events.filter(e=>e.role==='burst');byId('meta').textContent=`${events.length} 段资源 · 升空 ${sequence.flight.toFixed(2)} s${bursts.length?' · 首次爆炸 '+Math.min(...bursts.map(e=>e.fire)).toFixed(2)+' s':''}`;
        byId('generated').textContent=`已生成 ${events.length} 条资源段数值`;byId('preserved').textContent='大小与高度变化保持 Cascade 时长';byId('legend').replaceChildren();for(const text of ['● 升空资源','○ 爆炸资源','固定时长示意']){const span=document.createElement('span');span.textContent=text;byId('legend').appendChild(span);}
        byId('speed').value=String(speed);byId('loop').checked=loop;renderRows();updateExport();return;
      }
      const s=current(),p=profiles[s.profile];
      byId('resource-id-field').hidden=mode!=='resource'||!p.isBlank;byId('resource-id').value=s.resourceId;
      const draft=ratioDrafts[mode]||{};byId('angle-ratios').value=draft.angle??s.angleRatios;byId('size-ratios').value=draft.size??s.sizeRatios;byId('size-ratios').closest('label').hidden=mode!=='resource';
      if(s.layout==='custom'||['custom','symmetric'].includes(s.sizeLayout))byId('manual-ratios').open=true;
      byId('play').disabled=!events.length;byId('time').disabled=!events.length;
      updateFanControls();byId('height-label').textContent=mode==='resource'?'长度随机（需Z输出）':'升空高度随机';byId('height').disabled=mode==='resource'&&!s.applyLengthScale;
      byId('resource-mode').setAttribute('aria-pressed',mode==='resource');byId('template-mode').setAttribute('aria-pressed',mode==='template');
      byId('form-title').textContent=mode==='resource'?'单簇造型':'整发编排';byId('profile-label').textContent=mode==='resource'?'已保存的子模板配方':'完整子模板';byId('count-label').textContent=mode==='resource'?'簇数':'发数';
      byId('profile-field').hidden=mode==='resource'&&!Object.values(profiles).some(p=>!p.isBlank&&p.kind==='resource');
      byId('profile').replaceChildren();Object.entries(profiles).filter(([,p])=>p.kind===mode).forEach(([id,p])=>{const option=document.createElement('option');option.value=id;option.textContent=p.name+(p.isBlank&&mode==='resource'&&id!=='blank'?' · 空白':'');byId('profile').appendChild(option);});
      for(const [id,key] of [['profile','profile'],['count','count'],['spread','spread'],['layout','layout'],['order','order'],['interval','interval'],['start','start'],['scale','scale'],['size','sizeJitter'],['height','heightJitter'],['angle','angleJitter'],['seed','seed']])byId(id).value=s[key];
      byId('spread-value').value=s.spread+'°';byId('scale-value').value=s.scale.toFixed(2)+' 倍';byId('size-value').value='±'+s.sizeJitter+'%';byId('height-value').value='±'+s.heightJitter+'%';byId('angle-value').value='±'+s.angleJitter+'°';
      byId('spread').disabled=s.count===1;byId('layout').disabled=s.count===1;byId('angle').disabled=s.count===1;byId('interval').disabled=s.count===1||s.order==='together';byId('time').max=duration;byId('play').textContent=time>=duration?'重播':'播放一遍';
      byId('source-info').textContent=mode==='resource'?(p.isBlank?'ID只选资源 · 配比默认留空 · 1–256 簇':'已载入完整配方；改选ID将使用单一资源，保留当前设置。'):p.isBlank?'素材库为空，可先制作或手动添加子模板。':`每发：升空 ${(p.launchOffset||0).toFixed(2)} s → 爆炸 ${(p.burstOffset??p.lift).toFixed(2)} s${p.flight!==undefined?' · Cascade '+p.flight.toFixed(2)+' s':''}`;
      byId('meta').textContent=events.length?`${s.count} ${unit()} · ${s.count===1?'居中':s.spread+'°'} · ${orders[s.order]} · 末发开始 ${Math.max(...events.map(e=>e.fire)).toFixed(2)} s`:'空白模板 · '+(planErrors[0]||'请填写参数');
      byId('generated').textContent=events.length?(mode==='resource'?`已生成 ${s.count} 条单簇数值`:`已生成 ${s.count} 条整发编排数值 · 子模板复用`):'尚未生成参数';
      byId('preserved').textContent=mode==='resource'?'重播保留同一组变化':'保留每发的尾缀 → 爆炸关系';
      byId('legend').replaceChildren();const labels=mode==='resource'?['灰线：完整端点','绿线：当前时刻','运动示意 · 1.20 s']:['● 升空','○ 爆炸',`内部间隔 ${(p.burstOffset??p.lift).toFixed(2)} s`];labels.forEach(text=>{const span=document.createElement('span');span.textContent=text;byId('legend').appendChild(span);});
      byId('speed').value=String(speed);byId('loop').checked=loop;
      renderRows();
      updateExport();
    }
    function stop(){playing=false;cancelAnimationFrame(frame);lastClock=null;byId('play').textContent=time>=duration?'重播':'播放一遍';}
    function status(){byId('status').textContent=planErrors.length?planErrors.join(' '):`已生成 ${events.length} ${unit()} · 随机码 ${isSequence()?sequence.seed:current().seed}`;}
    function change(key,value){
      byId('error').textContent='';stop();let next={...current(),[key]:value};
      if(key==='profile'&&mode==='resource'){
        const p=profiles[value];if(p?.kind==='resource')next={...next,resourceId:'',angleRatios:p.isBlank?'':p.angles.map(a=>(a/p.span*2).toFixed(6)).join(', '),sizeRatios:p.isBlank?'':p.sizes.join(', '),layout:p.isBlank?'uniform':'custom',sizeLayout:p.isBlank?'uniform':'custom',calibration:{}};
        ratioDrafts[mode]={angle:next.angleRatios,size:next.sizeRatios};
      }
      configs[mode]=valid(next);plan();time=0;updateControls();draw();status();save();
    }
    function switchMode(kind){if(mode===kind)return;byId('error').textContent='';stop();mode=kind;plan();time=0;updateControls();draw();status();save();}
    byId('resource-mode').addEventListener('click',()=>switchMode('resource'));byId('template-mode').addEventListener('click',()=>switchMode('template'));
    for(const [id,key] of [['profile','profile'],['count','count'],['spread','spread'],['layout','layout'],['order','order'],['interval','interval'],['start','start'],['scale','scale'],['size','sizeJitter'],['height','heightJitter'],['angle','angleJitter'],['seed','seed']]){
      const control=byId(id);control.addEventListener(control.type==='number'?'change':'input',()=>{
        if(control.type==='number'&&(control.value===''||!control.checkValidity())){byId('error').textContent=`请输入 ${control.min}–${control.max} 范围内的有效数值；当前预览保留上一组设置。`;updateExport();return;}
        change(key,control.value);
      });
    }
    byId('reroll').addEventListener('click',()=>change('seed',current().seed>=2147483646?1:current().seed+1));
    function refreshResourceOptions(){
      const s=configs.resource,p=profiles[s.profile];
      ShowResources.fillSelect(byId('resource-preset'),p.isBlank?s.resourceId:'','fan',byId('resource-search').value);
      if(!p.isBlank){const option=document.createElement('option');option.value='__recipe__';option.textContent='当前完整配方：'+p.name;option.disabled=true;byId('resource-preset').appendChild(option);byId('resource-preset').value=option.value;}
      byId('resource-hint').textContent=p.isBlank?ShowResources.hint(s.resourceId):'当前使用完整子模板配方。选择ID可改为单一资源，保留正在调整的参数。';
      sequence.stages.forEach((stage,index)=>{const select=byId('stage-'+index+'-preset');if(!select)return;ShowResources.fillSelect(select,stage.entry.FXResourceId,stage.role,byId('stage-'+index+'-search').value);byId('stage-'+index+'-hint').textContent=ShowResources.hint(stage.entry.FXResourceId);});
      const snapshot=ShowResources.snapshot(),counts=Object.keys(ShowResources.groups).map(group=>ShowResources.groups[group]+' '+snapshot.records.filter(r=>r.group===group).length);
      byId('id-library-note').textContent=`共 ${snapshot.records.length} 个ID · ${counts.join(' / ')}。列表时间：${snapshot.updatedAt}。分组帮助查找，不限制用途；平台以资源表快照为准。更新读取ID或资源路径含FireWorks的资源；其它命名可手填。`;
    }
    function changeResourceId(id,fromPreset=false){
      const name=templateName();configs.resource=valid({...configs.resource,profile:'blank',resourceId:id},'resource');exportNames['resource:blank']=name;
      if(fromPreset)byId('resource-id').value=id;
      byId('resource-id-field').hidden=false;byId('profile').value='blank';byId('source-info').textContent='ID只选资源 · 配比默认留空 · 1–256 簇';
      byId('error').textContent='';stop();plan();time=0;updateFanControls();refreshResourceOptions();
      byId('play').disabled=!events.length;byId('time').disabled=!events.length;byId('time').max=duration;
      byId('meta').textContent=events.length?`${events.length} 簇 · ${current().spread}° · ${orders[current().order]}`:'空白模板 · '+(planErrors[0]||'请填写 ResourceId');
      byId('generated').textContent=events.length?`已生成 ${events.length} 条单簇数值`:'尚未生成参数';
      renderRows();draw();status();updateExport();save();
    }
    byId('resource-preset').addEventListener('change',()=>{const id=byId('resource-preset').value;if(id===''||ShowResources.get(id))changeResourceId(id,true);});
    byId('resource-search').addEventListener('input',refreshResourceOptions);
    byId('resource-id').addEventListener('input',()=>changeResourceId(byId('resource-id').value));
    for(const id of ['angle','size'])byId(id+'-ratios').addEventListener('input',()=>{ratioDrafts[mode]={angle:byId('angle-ratios').value,size:byId('size-ratios').value};byId('ratios-status').textContent='配比已编辑，点击「应用手填配比」更新预览与复制数据。';updateExport();save();});
    byId('ratios-apply').addEventListener('click',()=>{
      const angle=byId('angle-ratios').value,size=byId('size-ratios').value;
      try{if(angle.trim())ShowFan.ratios(angle,'角度配比',-1,1,true);if(mode==='resource'&&size.trim())ShowFan.ratios(size,'大小配比',.01,10);}
      catch(e){byId('ratios-status').textContent=e.message;updateExport();return;}
      ratioDrafts[mode]={angle,size};configs[mode]=valid({...current(),angleRatios:angle,sizeRatios:size,layout:angle.trim()?'custom':'uniform',sizeLayout:size.trim()?(current().sizeLayout==='symmetric'?'symmetric':'custom'):'uniform'});byId('error').textContent='';stop();plan();time=0;updateControls();draw();status();save();byId('ratios-status').textContent='已应用手填配比。空白项使用均匀角度或统一大小。';
    });
    byId('ratios-clear').addEventListener('click',()=>{ratioDrafts[mode]={angle:'',size:''};configs[mode]=valid({...current(),angleRatios:'',sizeRatios:'',layout:'uniform',sizeLayout:'uniform'});stop();plan();time=0;updateControls();draw();status();save();byId('ratios-status').textContent='配比已清空，使用均匀角度、统一大小。';});
    for(const id of ['sizeLayout','outline','edgeLength','lengthScale'])byId(id).addEventListener('input',()=>change(id,byId(id).value));
    byId('applyLengthScale').addEventListener('change',()=>change('applyLengthScale',byId('applyLengthScale').checked));
    byId('fan-clean').addEventListener('click',()=>{if(mode!=='resource'||isSequence())return;byId('error').textContent='';stop();configs.resource=valid({...current(),sizeLayout:'uniform',outline:'arc',layout:'uniform',order:'together',sizeJitter:0,heightJitter:0,angleJitter:0,lengthScale:1});plan();time=0;updateControls();draw();status();save();});
    for(const id of ['advanced','numbers'])byId(id).addEventListener('toggle',()=>{if(remembered[id]!==byId(id).open){remembered[id]=byId(id).open;save();}});
    byId('time').addEventListener('input',()=>{stop();time=clamp(byId('time').value,0,duration,0);paint();byId('status').textContent=`已开始 ${events.filter(e=>time>=e.fire).length} / ${events.length} ${unit()}`;save();});
    function tick(clock){
      if(!playing)return;
      if(lastClock!==null)time=Math.min(duration,time+(clock-lastClock)/1000*speed);
      lastClock=clock;
      if(time>=duration&&loop){time=0;}
      paint();
      if(time>=duration){stop();byId('status').textContent='播放完成 · 同一组变化';save();return;}
      frame=requestAnimationFrame(tick);
    }
    byId('speed').addEventListener('input',()=>{speed=[.5,1,2].includes(Number(byId('speed').value))?Number(byId('speed').value):1;save();});
    byId('loop').addEventListener('change',()=>{loop=byId('loop').checked;save();});
    byId('play').addEventListener('click',()=>{
      if(playing){stop();byId('status').textContent=`已暂停 · ${time.toFixed(2)} s`;save();return;}
      if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){time=duration;paint();stop();byId('status').textContent='已显示完整布局 · 减少动态，可拖时间查看';save();return;}
      if(time>=duration)time=0;playing=true;lastClock=null;byId('play').textContent='暂停';byId('status').textContent=isSequence()?`正在播放 · 固定升空 ${sequence.flight.toFixed(2)} s`:`正在播放 · ${orders[current().order]}`;frame=requestAnimationFrame(tick);save();
    });
    function refreshSequence(rebuild=false,preserveInputs=false){
      byId('error').textContent='';stop();plan();time=0;
      if(preserveInputs){refreshResourceOptions();updateStageReadouts();byId('time').max=duration;byId('meta').textContent=`${events.length} 段资源 · 升空 ${sequence.flight.toFixed(2)} s`;renderRows();updateExport();}
      else updateControls(rebuild);
      draw();status();save();
    }
    function makeControl(labelText,value,{id,type='number',min=-1000000,max=1000000,step=.01,onChange,wide=false}={}){
      const label=document.createElement('label');label.className='df-field'+(wide?' df-wide':'');const title=document.createElement('span');title.className='df-label';title.textContent=labelText;const input=document.createElement('input');input.type=type;input.value=value;input.id='df-pattern-'+id;
      if(type==='number'){input.min=min;input.max=max;input.step=step;input.required=true;}else {input.spellcheck=false;input.required=true;input.maxLength=256;input.autocomplete='off';}
      input.addEventListener(type==='text'?'input':'change',()=>{if(type==='number'&&(input.value===''||!input.checkValidity())){byId('error').textContent=labelText+'请输入有效范围内的数字。';updateExport();return;}onChange(type==='number'?Number(input.value):input.value);});label.append(title,input);return label;
    }
    function resourcePicker(stage,index){
      const holder=document.createElement('div');holder.className='df-resource-picker df-wide';
      const searchLabel=document.createElement('label');searchLabel.className='df-field';const searchText=document.createElement('span');searchText.className='df-label';searchText.textContent='搜索ID';
      const search=document.createElement('input');search.type='search';search.id='df-pattern-stage-'+index+'-search';search.placeholder='搜索名称或类型';search.value=stageSearches.get(stage)||'';searchLabel.append(searchText,search);
      const label=document.createElement('label');label.className='df-field';const title=document.createElement('span');title.className='df-label';title.textContent='ID预设';
      const select=document.createElement('select');select.id='df-pattern-stage-'+index+'-preset';label.append(title,select);
      const hint=document.createElement('p');hint.className='df-note';hint.id='df-pattern-stage-'+index+'-hint';
      ShowResources.fillSelect(select,stage.entry.FXResourceId,stage.role,search.value);hint.textContent=ShowResources.hint(stage.entry.FXResourceId);
      search.addEventListener('input',()=>{stageSearches.set(stage,search.value);ShowResources.fillSelect(select,stage.entry.FXResourceId,stage.role,search.value);});
      select.addEventListener('change',()=>{stage.entry.FXResourceId=select.value;byId('stage-'+index+'-resource').value=select.value;refreshSequence(false,true);});
      holder.append(searchLabel,label,hint);return holder;
    }
    function renderStages(){
      const holder=byId('sequence-stages');holder.replaceChildren();
      sequence.stages.forEach((stage,index)=>{
        const wrap=document.createElement('div');wrap.className='df-stage';wrap.dataset.stage=index;
        const heading=document.createElement('div');heading.className='df-stage-heading';const select=document.createElement('select');select.setAttribute('aria-label','第'+(index+1)+'段用途');select.id='df-pattern-stage-'+index+'-role';
        for(const [value,text] of [['launch','升空尾缀'],['burst','爆炸效果'],['other','其他资源']]){const option=document.createElement('option');option.value=value;option.textContent=(index+1)+'. '+text;select.appendChild(option);}select.value=stage.role;
        select.addEventListener('change',()=>{stage.role=select.value;refreshSequence(true);});const remove=document.createElement('button');remove.type='button';remove.className='df-button';remove.textContent='删除';remove.disabled=sequence.stages.length===1;remove.setAttribute('aria-label','删除第'+(index+1)+'段');remove.addEventListener('click',()=>{sequence.stages.splice(index,1);openStages.clear();refreshSequence(true);});heading.append(select,remove);wrap.appendChild(heading);
        const basic=document.createElement('div');basic.className='df-stage-fields';
        basic.appendChild(resourcePicker(stage,index));
        basic.appendChild(makeControl('ResourceId · 可手填',stage.entry.FXResourceId,{id:'stage-'+index+'-resource',type:'text',wide:true,onChange:value=>{stage.entry.FXResourceId=value;refreshSequence(false,true);}}));
        basic.appendChild(makeControl(stage.role==='burst'?'升空结束后再延迟（秒）':'出现时间（秒）',stage.role==='burst'?stage.extraDelay:stage.entry.LocalTimeOffset,{id:'stage-'+index+'-time',min:0,max:3600,onChange:value=>{if(stage.role==='burst')stage.extraDelay=value;else stage.entry.LocalTimeOffset=value;refreshSequence();}}));
        basic.appendChild(makeControl('等比大小（倍）',stage.entry.EffectScale.X,{id:'stage-'+index+'-scale',min:.01,max:100,onChange:value=>{stage.entry.EffectScale={X:value,Y:value,Z:value};refreshSequence(true);}}));wrap.appendChild(basic);
        const actual=document.createElement('div');actual.className='df-source-info';actual.id='df-pattern-stage-'+index+'-actual';wrap.appendChild(actual);
        const advanced=document.createElement('details'),summary=document.createElement('summary');summary.textContent='位置、角度与逐段随机';advanced.appendChild(summary);advanced.open=openStages.has(index);advanced.addEventListener('toggle',()=>{if(advanced.open)openStages.add(index);else openStages.delete(index);});
        const fields=document.createElement('div');fields.className='df-stage-fields';
        for(const [property,keys,label] of [['PositionOffset',['X','Y','Z'],'位置 cm'],['RotationOffset',['Pitch','Yaw','Roll'],'旋转 °'],['EffectScale',['X','Y','Z'],'轴向缩放 ×'],['RandomPositionRange',['X','Y','Z'],'位置随机 ±cm'],['RandomRotationRange',['Pitch','Yaw','Roll'],'旋转随机 ±°']])for(const axis of keys){
          if(stage.role==='burst'&&property==='PositionOffset'&&axis==='Z')continue;
          const random=property.startsWith('Random'),scaling=property==='EffectScale',limit=property.includes('Rotation')?360:1000000;
          fields.appendChild(makeControl(label+' '+axis,stage.entry[property][axis],{id:'stage-'+index+'-'+property+'-'+axis,min:scaling?.01:random?0:-limit,max:scaling?100:limit,step:scaling?.01:.1,onChange:value=>{stage.entry[property][axis]=value;refreshSequence();}}));
        }
        fields.appendChild(makeControl('逐段大小随机（±%）',stage.entry.RandomScaleRatio*100,{id:'stage-'+index+'-randomScale',min:0,max:99.9,step:.1,onChange:value=>{stage.entry.RandomScaleRatio=value/100;refreshSequence();}}));advanced.appendChild(fields);
        const hint=document.createElement('p');hint.className='df-note';hint.textContent=stage.role==='burst'?'Z 使用上方的最高爆炸高度；位置随机单独取样。':'位置Z是发射位置；资源实际升空高度由Cascade和缩放支持决定。';advanced.appendChild(hint);wrap.appendChild(advanced);holder.appendChild(wrap);
      });
    }
    function updateSequenceControls(rebuild=true){
      const select=byId('sequence-profile');select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='空白 / 自定义子模板';select.appendChild(empty);
      for(const [key,profile] of Object.entries(profiles).filter(([,p])=>!p.isBlank&&p.kind==='template')){const option=document.createElement('option');option.value=key;option.textContent=profile.name;select.appendChild(option);}select.value=sequence.profile||'';
      for(const key of ['category','flight','maximumHeight','heightJitter','start','roll','scale','sizeJitter','angleJitter','seed','baseHeight'])byId('sequence-'+key).value=sequence[key];byId('sequence-applyHeightScale').checked=sequence.applyHeightScale;
      if(rebuild)renderStages();
      updateStageReadouts();byId('sequence-add').disabled=sequence.stages.length>=256;
    }
    function updateStageReadouts(){events.forEach(e=>{const out=byId('stage-'+e.index+'-actual');if(out)out.textContent=`实际出现 ${e.fire.toFixed(2)} s${e.role==='burst'?' · 爆炸位置Z '+(e.position.Z/100).toFixed(2)+' m':''}`;});}
    byId('shape').addEventListener('input',()=>{shape=byId('shape').value==='sequence'?'sequence':'fan';refreshSequence(true);});
    byId('sequence-profile').addEventListener('input',()=>{const key=byId('sequence-profile').value;sequence=key?(profiles[key].sequenceConfig?ShowSequence.restore(profiles[key].sequenceConfig):ShowSequence.fromRecord(profiles[key].source,key)):ShowSequence.blank();sequence.profile=key;exportNames.sequence=key?profiles[key].name+'_Custom':'';openStages.clear();refreshSequence(true);});
    byId('sequence-new').addEventListener('click',()=>{sequence=ShowSequence.blank();exportNames.sequence='';openStages.clear();refreshSequence(true);byId('stage-0-resource').focus();});
    byId('sequence-add').addEventListener('click',()=>{if(sequence.stages.length>=256)return;sequence.stages.push({role:'other',entry:{FXResourceId:'',LocalTimeOffset:0,PositionOffset:ShowText.vector(),RotationOffset:ShowText.rotator(),RandomPositionRange:ShowText.vector(),RandomRotationRange:ShowText.rotator(),EffectScale:ShowText.vector(1,1,1),RandomScaleRatio:0,Filter:ShowText.filter()},extraDelay:0});refreshSequence(true);byId('stage-'+(sequence.stages.length-1)+'-resource').focus();});
    for(const key of ['flight','maximumHeight','heightJitter','start','roll','scale','sizeJitter','angleJitter','seed','baseHeight']){
      const control=byId('sequence-'+key);control.addEventListener('change',()=>{if(control.value===''||!control.checkValidity()){byId('error').textContent='请填写有效的'+control.closest('label').querySelector('span').textContent+'。';updateExport();return;}sequence[key]=Number(control.value);if(key==='flight')sequence.category='custom';refreshSequence();});
    }
    byId('sequence-category').addEventListener('input',()=>{sequence.category=byId('sequence-category').value;const tier=ShowSequence.sizes[sequence.category];if(tier){sequence.flight=tier.flight;sequence.maximumHeight=tier.height;sequence.baseHeight=tier.height;}refreshSequence();});
    byId('sequence-applyHeightScale').addEventListener('change',()=>{sequence.applyHeightScale=byId('sequence-applyHeightScale').checked;refreshSequence();});
    function hasInvalidInput(){const container=byId(isSequence()?'sequence-fields':'fan-fields');return [...container.querySelectorAll('input')].some(input=>input.type==='number'&&!input.disabled&&!input.checkValidity()&&(input.id!=='df-pattern-sequence-baseHeight'||sequence.applyHeightScale)&&(input.id!=='df-pattern-sequence-maximumHeight'||sequence.stages.some(s=>s.role==='burst')));}
    function updateExport(){
      const activeName=templateName();byId('export-height').hidden=isSequence()||current().heightJitter===0||(mode==='resource'&&current().applyLengthScale);byId('save-template').hidden=mode==='template';exportResult=null;
      byId('export-target').textContent=mode==='template'?'复制后粘贴到 BP 的 EffectTemplate（父模板）。':'复制后粘贴到 BP 的 EffectSubTemplates 中一个新增数组项。';
      const note=[];
      try{
        ShowText.name(activeName,'新模板名称');if(hasInvalidInput())throw Error('当前输入有未完成或超出范围的数字，请修正后导出。');
        if(!isSequence()){
          const draft=ratioDrafts[mode];if(draft&&(draft.angle!==current().angleRatios||draft.size!==current().sizeRatios))throw Error('手填配比尚未应用，请点击「应用手填配比」。');
          if(planErrors.length)throw Error(planErrors.join(' '));
        }
        if(isSequence()){
          sequenceResult=ShowSequence.make(sequence,activeName);if(sequenceResult.errors.length)throw Error(sequenceResult.errors.join(' '));
          exportResult={record:sequenceResult.record,text:ShowText.stringify(sequenceResult.record)};
          note.push(`Cascade 升空 ${sequence.flight.toFixed(2)} s；高度变化不改时间。固定当前组变化，UE运行时随机清零。`);
          note.push(sequence.applyHeightScale?'尾缀Z缩放比 '+sequenceResult.heightRatio.toFixed(4)+'：须确认Cascade支持纵向缩放；示意不代表实际尾缀已对齐。':'当前仅改变爆炸位置高度，尾缀按资源原轨迹播放。');
        }else{
          exportResult=ShowText.generate({mode,settings:current(),events,profile:profiles[current().profile],name:activeName,allowOriginalHeight:byId('export-original-height').checked});
          note.push('固定当前组时间、角度和大小；对应UE运行时随机清零，不再抽取第二次。');if(exportResult.heightOmitted)note.push('未导出升空高度随机，保留素材原高度。');
          if(mode==='resource')note.push(exportResult.lengthApplied?'已输出纵向EffectScale.Z，X/Y大小分别保留；须在UE校准素材是否支持长度缩放。':'预览按实际导出Z缩放估算线长，素材原长默认等同，必要时填写长度校准。');
          if(mode==='template'&&profiles[current().profile].localOnly)note.push('本地子模板须先粘贴进BP，父模板才能找到此引用。');
        }
        if(ShowCatalog.find(activeName))note.push('同名模板已在素材库中；粘贴到UE时请确认目标数组项。');
        if(mode!=='template'){
          const ids=[...new Set(exportResult.record.Entries.map(e=>e.FXResourceId))],unknown=ids.filter(id=>!ShowResources.get(id));
          note.push(unknown.length?`${unknown.length} 个自定义ID未在当前列表核实，请在资源表确认。`:'所选ID已在资源表快照中找到；实际加载以当前UE平台为准。');
        }
        byId('export-text').value=exportResult.text;byId('export-status').textContent='可导出 '+exportResult.record.Entries.length+' 条参数。';
      }catch(e){byId('export-text').value='';byId('export-status').textContent=e.message;}
      byId('export-note').textContent=note.join(' ');byId('copy').disabled=!exportResult||copying;byId('download').disabled=!exportResult;byId('save-template').disabled=!exportResult;
    }
    byId('export-name').addEventListener('input',()=>{exportNames[nameKey()]=byId('export-name').value;updateExport();save();});
    byId('export-original-height').addEventListener('change',updateExport);
    byId('copy').addEventListener('click',async()=>{
      updateExport();if(!exportResult)return;const result=exportResult;copying=true;byId('copy').disabled=true;byId('export-status').textContent='正在复制…';let copied=false;
      try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(result.text);copied=true;}}catch{}
      if(!copied){const temp=document.createElement('textarea');temp.value=result.text;temp.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';document.body.appendChild(temp);temp.focus();temp.select();try{copied=document.execCommand?.('copy')===true;}catch{}temp.remove();}
      copying=false;updateExport();
      if(copied){byId('copy').focus();byId('export-status').textContent='已复制 '+result.record.TemplateName+' · '+result.record.Entries.length+' 条参数'+(exportResult?.text!==result.text?'；当前参数已变化，可重新复制。':'。');}
      else {byId('export-details').open=true;byId('export-text').focus();byId('export-text').select();byId('export-status').textContent='浏览器未允许自动复制；已选中当前参数，按 Ctrl+C。';}
    });
    byId('download').addEventListener('click',()=>{updateExport();if(!exportResult)return;try{const blob=new Blob([exportResult.text+'\n'],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=exportResult.record.TemplateName.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_')+'.txt';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);byId('export-status').textContent='已生成TXT下载，内容与复制相同。';}catch{byId('export-status').textContent='下载未完成；可展开参数后手动复制。';}});
    byId('save-template').addEventListener('click',()=>{
      updateExport();if(!exportResult)return;try{const existing=ShowCatalog.find(exportResult.record.TemplateName);if(existing&&!profiles[existing].localOnly)throw Error('这个名称来自BP，请换一个新模板名称后保存。');const key=ShowCatalog.add(exportResult.record,{replace:!!existing});if(isSequence())ShowCatalog.setSequenceEditor(key,sequence);byId('library-status').textContent='已存入本地素材库；使用父模板引用前，先把子模板粘贴进BP。';updateControls(false);save();}catch(e){byId('export-status').textContent=e.message;}
    });
    function refreshCatalog(){configs={resource:valid(configs.resource,'resource'),template:valid(configs.template,'template')};stop();plan();time=0;updateControls();draw();status();save();}
    byId('library-add').addEventListener('click',()=>{
      try{const key=ShowCatalog.add(ShowText.parse(byId('library-text').value));byId('library-status').textContent='已添加 '+profiles[key].name+'，可在'+(profiles[key].kind==='resource'?'单簇素材':'完整子模板')+'中选择。';byId('library-text').value='';refreshCatalog();}
      catch(e){byId('library-status').textContent=e.message;}
    });
    byId('library-sync').addEventListener('click',async()=>{
      const button=byId('library-sync');if(button.disabled)return;button.disabled=true;button.textContent='正在读取…';byId('library-status').textContent='只读同步BP子模板，请保持UE和连接服务开启。';
      try{const reply=await rawApi('/object/get',{path:ShowBlueprintData.cdoPath,properties:['EffectSubTemplates']},15000);if(reply.success!==true)throw Error(reply.__error||reply.message||'未连接到UE');const result=ShowCatalog.sync(reply.data?.properties?.EffectSubTemplates);refreshCatalog();byId('library-status').textContent=`同步完成：新增 ${result.added}、更新 ${result.updated}、跳过 ${result.skipped}。没有改写BP。`;}
      catch(e){byId('library-status').textContent='同步未完成，本地素材库保留。'+e.message;}
      finally {button.disabled=false;button.textContent='读取完整子模板（含参数）';}
    });
    byId('id-refresh').addEventListener('click',async()=>{
      const button=byId('id-refresh');if(button.disabled)return;button.disabled=true;button.textContent='正在读取ID…';byId('id-status').textContent='正在读取PC和手机资源表，请保持UE和连接服务开启。';
      try{
        const requests=Object.entries(ShowResourceData.tables).flatMap(([platform,table])=>['ResourceId','FxSP'].map(field=>({platform,field,table})));
        const reads=await Promise.all(requests.map(async request=>({...request,reply:await rawApi('/datatable/search',{table:request.table,field:request.field,value:'FireWorks',limit:1000},15000)})));
        const next=ShowResources.fromReads(reads),updatedAt=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date())+' +08:00';
        ShowResources.replace(next,updatedAt);refreshResourceOptions();updateExport();save();byId('id-status').textContent=`已更新 ${next.length} 个ID；当前资源、参数与配比保持原样。`;
      }catch(e){byId('id-status').textContent='更新未完成，已有ID列表和草稿保留。'+e.message;}
      finally{button.disabled=false;button.textContent='更新 ID 列表';}
    });
    function restore(snapshot){
      if(snapshot&&snapshot.version!==2){
        const note=byId('migration-note');note.hidden=false;
        try{const text=JSON.stringify(snapshot),previous=localStorage.getItem(LEGACY_KEY);if(previous!==text)localStorage.setItem(previous?LEGACY_KEY+'.'+Date.now():LEGACY_KEY,text);note.textContent='旧编排草稿已单独保留，未自动载入。这一版从空白开始；需要旧内容时请手动添加。';}
        catch{saveEnabled=false;note.textContent='旧草稿暂时无法备份，本页从空白开始；当前修改不会覆盖旧记录。';}
        snapshot=null;
      }
      ShowCatalog.restore(snapshot?.catalog);shape=snapshot?.shape==='sequence'?'sequence':'fan';sequence=ShowSequence.restore(snapshot?.sequence);
      if(snapshot?.resourceIds){try{ShowResources.replace(snapshot.resourceIds.records,snapshot.resourceIds.updatedAt);}catch{byId('id-status').textContent='保存的ID列表无法读取，使用内置ID；当前草稿保留。';}}
      ratioDrafts={};if(snapshot?.ratioDrafts&&typeof snapshot.ratioDrafts==='object')for(const kind of ['resource','template']){const draft=snapshot.ratioDrafts[kind];if(draft&&typeof draft.angle==='string'&&typeof draft.size==='string')ratioDrafts[kind]={angle:draft.angle,size:draft.size};}
      exportNames=Object.create(null);if(snapshot?.exportNames&&typeof snapshot.exportNames==='object')for(const [key,value] of Object.entries(snapshot.exportNames)){if(typeof value==='string'&&value.length<=256&&key!=='__proto__')exportNames[key]=value;}
      const data=snapshot?.version===2&&snapshot?.configs?{mode:snapshot.mode,...snapshot.configs}:undefined;
      const oldProfile=data?.resource?.profile;
      if(typeof oldProfile==='string'&&!profiles[oldProfile]&&Object.hasOwn(exportNames,'resource:'+oldProfile))exportNames['resource:blank']=exportNames['resource:'+oldProfile];
      speed=[.5,1,2].includes(snapshot?.view?.speed)?snapshot.view.speed:1;loop=snapshot?.view?.loop===true;
      if(data){mode=data.mode==='template'?'template':'resource';configs={resource:valid(data.resource||{},'resource'),template:valid(data.template||{},'template')};}
      else {mode='resource';configs={resource:{...defaults.resource},template:{...defaults.template}};}
      stop();plan();time=clamp(snapshot?.view?.time,0,duration,0);updateControls();draw();
      for(const id of ['advanced','numbers']){remembered[id]=typeof snapshot?.view?.[id]==='boolean'?snapshot.view[id]:false;byId(id).open=remembered[id];}
      status();save();
    }
    restore(load());
    if(typeof ResizeObserver==='function')new ResizeObserver(draw).observe(scene);else window.addEventListener('resize',draw);
  
    function setActive(active){
      if(!active&&playing){stop();byId('status').textContent=`已暂停 · ${time.toFixed(2)} s`;save();}
      if(active)draw();
    }
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)setActive(false);});
    return {setActive};

    })();
  }
  function setActive(active){init();controller.setActive(active);}
  return {init,setActive};
})();
