/* 用认领提交中的旧模拟核和旧着色器核对默认关闭：当前六模板及所有现行空中层。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{chromium}=require(process.env.FW_PLAYWRIGHT||'playwright');
const R=path.resolve(__dirname,'../..'),O=path.join(R,'analysis/results/GoldRayBurst');
const read=f=>execFileSync('git',['show','98686170:'+f],{cwd:R,encoding:'utf8',maxBuffer:8e6});
const legacy={sim:read('tool/src/js/20_sim.js'),late:read('tool/src/js/19_spark_late.js'),shader:read('tool/src/js/40_gl.js').match(/const VS_SPK = (`[\s\S]*?`);/)[1]};
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});try{const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript('window.requestAnimationFrame=()=>0');await p.goto('http://127.0.0.1:8034/baker?fast');await p.waitForFunction(()=>window.__fw);
 const result=await p.evaluate(async old=>{state.autoBake=false;clearTimeout(bakeTimer);state.playing=false;state.stillBusy=true;
  const LegacySim=eval('(function(){'+old.sim+';return Sim;})()'),oldLate=eval('(function(){'+old.late+';return sparkLateSource;})()'),oldShader=eval(old.shader),current=Sim;
  if(oldShader!==VS_SPK||oldLate(oldShader)!==VS_SPK_LATE)throw Error('默认普通/燃尽后着色器变化');
  const cases=new Map();for(const type of ['kiku','botan','kamuro','senrin','strobe','crackle']){const q=defaultsFor(type,40);cases.set('type:'+type,{P:derive({...q.P,type}),M:q.M});}
  for(const ef of FW_EFFECTS.filter(e=>['待验收','已通过'].includes(e.阶段))){const e=entryById(ef.待验收版||ef.主条目);if(!e)continue;for(const id of e.layerIds||[e.id]){if(!REPLICA_BY_ID[id])continue;const q=__fw.replicaPM(id);if(familyOf(q.P.type)==='aerial'&&!q.P.sparkGraph&&!burstFlowActive(q.P))cases.set(id,q);}}
  const rows=[];let pixels=0;
  for(const [id,{P,M}]of cases){const a=new LegacySim(P),b=new current(P);for(let i=0;i<480;i++){a.step(1/240);b.step(1/240);}if(JSON.stringify(a.all)!==JSON.stringify(b.all)||JSON.stringify(a.sp)!==JSON.stringify(b.sp))throw Error('旧轨迹变化：'+id);
   let before,after;try{Sim=LegacySim;before=measureRun(P);Sim=current;after=measureRun(P);}finally{Sim=current;}
   if(JSON.stringify(before)!==JSON.stringify(after))throw Error('默认取景测量变化：'+id);
   if(id.startsWith('type:')){let x,y;try{Sim=LegacySim;x=await renderStills40(P,M,{px:256,times:[P.duration*.12,P.duration*.35,P.duration*.7]});Sim=current;y=await renderStills40(P,M,{px:256,times:[P.duration*.12,P.duration*.35,P.duration*.7]});}finally{Sim=current;}
    if(x.some((v,i)=>v.png!==y[i].png))throw Error('默认像素变化：'+id);pixels+=x.length;}
   rows.push({id,trajectorySame:true,boundsSame:true});
  }return{pass:true,version:VERSION,baseline:'98686170',sameDefaultShaders:true,pixelFrames:pixels,cases:rows};
 },legacy);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(O,'关闭默认回归.json'),JSON.stringify({...result,errors},null,2));console.log('默认关闭回归通过：'+result.cases.length+'层，六模板'+result.pixelFrames+'帧逐像素相同；普通及燃尽后着色器源码不变');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
