// N23-03 deterministic CPU physics/config contracts. No GL/browser/UE.
const fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const dir=__dirname+'/../src/js/';
const ctx=vm.createContext({console,structuredClone,performance,setTimeout,window:{}});
for(const f of ['00_util.js','05_quality.js','10_types.js','12_tempo.js','20_sim.js','49_playback.js','50_bake.js','67_fwlcombo.js'])vm.runInContext(fs.readFileSync(dir+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx), tests=[];
const check=(name,fn)=>tests.push({name,fn});
function extract(src,name){const a=src.indexOf('function '+name+'(');assert(a>=0,name);let n=1,i=src.indexOf('{',a)+1;for(;n;i++){if(src[i]==='{')n++;else if(src[i]==='}')n--;}return (src.slice(a-6,a)==='async '?'async ':'')+src.slice(a,i);}
function oracle(P){
 ctx.oracleP=P;
 const script=function(){
  const P=fxP(oracleP),tau=Math.max((+P.sparkLife||0)*Math.max(1,+P.sparkLifeEnd||1),+P.emberFrac>0?(+P.emberLife||0):0),Du=unitDuration(P);
  const s=new Sim({...P,_unit:false,engine:'gpu',speedJit:0,burnJit:0,ignJit:0,sparkRate:0,crackle:0});s.ex=[];
  const roots=s.all.slice(0,P.stars),paths=roots.map(()=>[]);roots.forEach(q=>{q.vis=q.burn;q.burn=1e9});
  for(let i=0;i<=Math.ceil(Du/H_STEP);i++){if(i%8===0)roots.forEach((q,k)=>paths[k].push([s.t,q.x,q.y,q.z,q.vx,q.vy,q.vz]));s.step(H_STEP)}
  const ign=+P.ignDelay||0,tb=(+P.burn||0)+ign;let dev=0,wi=-1;
  paths.forEach((a,k)=>{for(let i=1;i<a.length;i++){const q=a[i],v=q.slice(4),vl=Math.hypot(...v);if(q[0]<ign||q[0]>tb||vl<1e-12)continue;
   for(let j=i-1;j>=0&&a[j][0]>=Math.max(ign,q[0]-tau);j--){const d=a[j].slice(1,4).map((x,k)=>x-q[k+1]),dot=d.reduce((sum,x,k)=>sum+x*v[k]/vl,0);
    const dist=Math.sqrt(Math.max(0,d.reduce((sum,x)=>sum+x*x,0)-dot*dot));if(dist>dev){dev=dist;wi=k}}}});
  return {px:dev*gamePixelsPerMeter(P,0,1080,800),directions:roots.length,star:wi};
 };
 return run('('+script.toString()+')()');
}
check('half is blocked before baking, cached unit reuse or Cascade output',async()=>{
 const P=run("({...defaultsFor('kiku').P,pattern:'half',form:'unit'})");ctx.halfP=P;
 assert.equal(run('unitAllowed(halfP)'),false,'public contract cannot express Y>=0 -> UE Z>=0');
 assert.throws(()=>run('bakeKind(halfP)'),/半球/);
 await assert.rejects(()=>run('bakeUnit(halfP,1,()=>{})'),/半球/);
 await assert.rejects(()=>run('layerUnitBake({P:halfP,unitBake:{sig:unitSig(halfP),b:{unsafe:true}}})'),/半球/);
 assert.throws(()=>run('fwlUnit("Half",{P:halfP},{},{})'),/半球/);
 ctx.state={P};await assert.rejects(()=>run('singleSchemeFiles("Half",{P:{...halfP,form:"master",outPC:"unit"}},{},()=>{},{})'),/半球/);
 vm.runInContext(extract(fs.readFileSync(dir+'80_render.js','utf8'),'drawUnitLayer'),ctx);
 assert.equal(run('drawUnitLayer({P:halfP},{},0,[])'),-1,'old half cache must not reach a GL draw');
});
check('existing sphere direction set matches independent full-history 3D maximum',()=>{
 for(const extra of [{},{wind:18,sparkLife:1.2,burn:3}]){
  const P=run("({...defaultsFor('kiku').P,stars:24})");Object.assign(P,extra);ctx.fitP=P;const before=JSON.stringify(P),expected=oracle(P),actual=run('unitFit(fitP)');
  assert(actual);assert(Math.abs(actual.px-expected.px)<.011,'all actual directions: '+JSON.stringify({expected,actual}));
  assert.equal(actual.directionCount,expected.directions,'all actual directions are measured');
  assert.equal(JSON.stringify(P),before,'fit does not mutate source parameters');console.log('FIT',JSON.stringify({actual,oracle:expected}));
 }
});
check('horizontal, oblique, vertical and depth-facing paths use the same conservative rule',()=>{
 const orig=run('dirsFor');
 ctx.dirsFor=()=>[[1,0,0,1],[Math.SQRT1_2,Math.SQRT1_2,0,1],[0,1,0,1],[0,0,1,1]];
 try{
  const P=run("({...defaultsFor('kiku').P,stars:4,seed:999,wind:22,sparkLife:1,burn:3})");ctx.fitP=P;
  const expected=oracle(P),actual=run('unitFit(fitP)');assert(Math.abs(actual.px-expected.px)<.011,JSON.stringify({expected,actual}));assert.equal(actual.directionCount,4);
 }finally{ctx.dirsFor=orig}
 assert.equal(run('UNIT_FIT_OK'),1.5);assert.equal(run('UNIT_FIT_BAD'),4);assert.equal(run('UNIT_IGN_BAD'),.1);
});
check('sphere config and shader source preserve the pre-task behavior',()=>{
 const old=cp.execFileSync('git',['show','80b04a69:tool/src/js/67_fwlcombo.js'],{cwd:__dirname+'/../..',encoding:'utf8'});
 Object.assign(ctx,{TN:(n,p,_l,k=1)=>n+(p?'_'+p:'')+(k>1?'_V'+k:''),r1:x=>+x.toFixed(1),r2:x=>+x.toFixed(2),r4:x=>+x.toFixed(4),evalKeys:(a,u)=>a[0][1],fwlFrameKeys:a=>a,fwlColor:()=>[[0,[1,1,1]],[1,[1,1,1]]]});
 const b={P:run("({...defaultsFor('kiku').P,pattern:'sphere',stars:24})"),meta:{fit:{v0:120,k:.4,a:6},duration:2,L:{cols:16,rows:2,chans:4,F:128},Ww:3,Wh:12,hb:.98,sizeKeysX:[[0,1],[1,.2]],sizeKeysY:[[0,1],[1,.1]],keys:[[0,0],[1,127.99]]}};
 ctx.fixtureB=b;ctx.fixtureM={};ctx.fixtureL={scale:1,rate:1,delay:0};
 const actual=JSON.stringify(run('fwlUnit("Sphere",fixtureB,fixtureM,fixtureL)'));
 const base=vm.createContext({...ctx,clamp:run('clamp'),intOr1:run('intOr1')});vm.runInContext(extract(old,'fwlUnit'),base);
 const expected=JSON.stringify(vm.runInContext('fwlUnit("Sphere",fixtureB,fixtureM,fixtureL)',base));assert.equal(actual,expected);
 const shader=fs.readFileSync(dir+'40_gl.js','utf8'),oldShader=cp.execFileSync('git',['show','80b04a69:tool/src/js/40_gl.js'],{cwd:__dirname+'/../..',encoding:'utf8'});
 assert.equal(crypto.createHash('sha256').update(shader.replace(/\r\n/g,'\n')).digest('hex'),crypto.createHash('sha256').update(oldShader).digest('hex'),'shader unchanged after normalizing checkout line endings');console.log('SPHERE_CONFIG_SHA256',crypto.createHash('sha256').update(actual).digest('hex'));
});
check('half direction axes and unsupported fan/cluster remain explicit',()=>{
 const P=run("({...defaultsFor('kiku').P,stars:64,pattern:'half'})");ctx.dirP=P;
 const dirs=run('dirsFor(dirP,new RNG(dirP.seed))');assert(dirs.length>0);for(const [x,y,z]of dirs){assert(y>=0);const ue=[x,z,y];assert(ue[2]>=0)}
 for(const pattern of ['cluster','fan','ring'])assert.equal(run('unitAllowed({...dirP,pattern:'+JSON.stringify(pattern)+'})'),false);
 for(const type of ['senrin','crossette','hachi'])assert.equal(run('unitAllowed({...dirP,pattern:"sphere",type:'+JSON.stringify(type)+'})'),false);
});
(async()=>{let bad=0;for(const t of tests){try{await t.fn();console.log('PASS',t.name)}catch(e){bad++;console.error('FAIL',t.name,e)}}if(bad)process.exitCode=1;else console.log('5 CPU physics/config groups passed; no GL or UE visual acceptance.');})();
