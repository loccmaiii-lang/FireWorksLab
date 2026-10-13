// RT6 PC完整序列入口回归：旧默认、PC合并、手机独立选择、发射器配置。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '../..');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.join(root,'tool/FireworkBaker.html')).href);
    await page.waitForFunction(() => window.__fw && __fw.idle(), null, {timeout:180000});
    const result = await page.evaluate(async () => {
      const P = {...defaultsFor('tailS',40,true).P, form:'emitset', rtFar:1};
      if (typeof rtPcFull !== 'function') throw Error('PC合并入口缺失：rtPcFull');
      const old = bakeEmitSet, full = bakeRiseTailFull;
      try {
        bakeEmitSet = async () => ({route:'separate'});
        bakeRiseTailFull = async (p,s,cb,mobile=true) => ({route:'full',mobile});
        return {version:VERSION,
          legacy:await bake({...P,outPC:'seq'},1),
          pc:await bake({...P,outPC:'full'},1),
          mobileLoop:await bakeMobileFor({form:'emitset',P:{...P,outPC:'full',outMobile:'seq',texW:2048,texH:2048}},null),
          mobileFull:await bakeMobileFor({form:'emitset',P:{...P,outPC:'seq',outMobile:'full',texW:2048,texH:2048}},null),
          oldTail:rtPcFull({...P,rtFar:0,outPC:'full'})};
      } finally {bakeEmitSet=old;bakeRiseTailFull=full;}
    });
    assert.equal(result.legacy.route,'separate');
    assert.equal(result.pc.route,'full'); assert.equal(result.pc.mobile,false);
    assert.equal(result.mobileLoop.route,'separate');
    assert.equal(result.mobileFull.route,'full'); assert.equal(result.mobileFull.mobile,true);
    assert.equal(result.oldTail,false);
    result.real = await page.evaluate(async () => {
      const d=defaultsFor('tailS',40,true), P={...d.P,form:'emitset',rtFar:1,rtH:30,rtVb:10,texW:512,texH:512,qSS:1,rtGpuF:0.4,rtGpuM:0.2,outPC:'full',outMobile:'seq'};
      state.P=P;state.M=d.M;state.stillBusy=true;clearTimeout(bakeTimer);
      const b=await bake(P,1,null);
      try {
        if(b.P.rtGpuF!==P.rtGpuF||b.P.rtGpuM!==P.rtGpuM)throw Error('PC合并改坏原GPU分配');
        let files=[...await texFiles(b,'Route'),[TN('Route','Ramp')+'.png',await encodePNG(rampPixels(d.M),256,8)],...await platformFiles('Route',b,d.M)];
        files=applyPackNaming(files,'Route',[{ln:'Route',mn:'Route_Mobile',b,layer:''}]);
        const names=new Set(files.map(([f])=>f)),cfg=JSON.parse(new TextDecoder().decode(files.find(([f])=>f==='cascade_mobile.json')[1]));
        for(const t of Object.values(cfg.textures))if(!names.has(t.file))throw Error('手机近段命名引用缺文件：'+t.file);
        if(cfg.emitters.some(e=>e.name==='TrailFull'))throw Error('手机选近段却出了完整序列');
        return {originalGpuPreserved:true,mobileLoopNamesValid:true,emitters:cfg.emitters.map(e=>e.name),mobileGrid:b.mobNaming.meta.L};
      }finally{disposeBake(b);}
    });
    const out=path.join(root,'analysis/results/CS3_RT6/入口检查.json'); fs.mkdirSync(path.dirname(out),{recursive:true});
    fs.writeFileSync(out,JSON.stringify({pass:true,...result},null,2));
    console.log('PASS',JSON.stringify(result));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
