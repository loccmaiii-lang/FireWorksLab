"""本机HTTP、隔离浏览器检查火焰参数与PC/手机真实导出；不接触个人资料或UE。"""
from pathlib import Path
import asyncio,base64,json,hashlib,subprocess,sys,time
from playwright.async_api import async_playwright
from browser_runtime import chromium_options,verify_renderer,verify_validation_source

R=Path(__file__).resolve().parents[2]
O=R/'analysis/local/20261027_procedural-fire_实现'
async def main():
 O.mkdir(parents=True,exist_ok=True)
 subprocess.run([sys.executable,'-X','utf8',str(R/'tool/local_http/preflight.py'),'--tool','baker','--start'],check=True)
 url='http://127.0.0.1:8034/baker?fast';verify_validation_source(url,R/'tool/FireworkBaker.html')
 report={'errors':[],'htmlSHA256':hashlib.sha256((R/'tool/FireworkBaker.html').read_bytes()).hexdigest()}
 async with async_playwright() as p:
  b=await p.chromium.launch(channel='msedge',headless=True,**chromium_options())
  page=await b.new_page(viewport={'width':1600,'height':1000})
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  await page.goto(url);await page.wait_for_function('window.__fw && REPLICA_BY_ID.SGF1')
  await page.evaluate('()=>{clearTimeout(bakeTimer);state.autoBake=false;state.playing=false;state.stillBusy=true;}')
  report['renderer']=verify_renderer(await page.evaluate("()=>{const x=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(x.UNMASKED_RENDERER_WEBGL)}"))
  impact=await page.evaluate('''async()=>{
    const {P,M}=replicaPM('SGF1'),snapshot=JSON.stringify(P),times=[0,.533,1.4,P.sparkGraph.period],base=await renderStills40(P,M,{px:384,times}),rows=[];
    if(M.ramp1!==defaultsFor('sgFlame').M.ramp1)throw Error('候选颜色与火焰模板不一致');
    const variants={flameDensity:2,flameDepth:.3,flameNoise:0,flameDetail:0,flameScale:.07,flameRise:0,flameWarp:0,flameTip:.65,flameFloor:.2,flameFloorEnabled:0,flameSteps:8,sourceScale:[.3,.6,0],sourceOffset:[.2,0,0],width:.16};
    for(const[k,v]of Object.entries(variants)){const q=structuredClone(P);q.sparkGraph.emitters[0][k]=v;const frames=await renderStills40(q,M,{px:384,times:[.533]});rows.push({key:k,value:v,changed:base[1].png!==frames[0].png});}
    for(const[k,v]of Object.entries({fieldEnabled:0,fieldWindX:1.2,fieldTurbulence:0})){const q=structuredClone(P);q.sparkGraph[k]=v;const[f]=await renderStills40(q,M,{px:384,times:[.533]});rows.push({key:k,value:v,changed:base[1].png!==f.png});}
    const q=structuredClone(P);q.sparkGraph.spaceScale=2;const a=graphPlan(P),z=graphPlan(q);const scale={width:z.Ww/a.Ww,height:z.Wh/a.Wh,timesEqual:JSON.stringify(z.times)===JSON.stringify(a.times)};
    if(JSON.stringify(P)!==snapshot)throw Error('原配方被拨参修改');return{rows,scale,periodPixelEqual:base[0].png===base[3].png,base};}''')
  for i,f in enumerate(impact.pop('base')):(O/f'candidate-{i}.png').write_bytes(base64.b64decode(f['png'].split(',')[1]))
  assert impact['periodPixelEqual'];assert all(r['changed'] for r in impact['rows']),impact
  assert impact['scale']=={'width':2,'height':2,'timesEqual':True};report['impact']=impact
  print('GPU拨参、周期和整体尺寸检查通过',flush=True)
  exported=await page.evaluate('''async()=>{const {P,M}=replicaPM('SGF1'),start=performance.now(),bytes=await __fw.exportFiles(P,M,'GroundFlame',{entry:'SGF1',size:'none'});let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return{base64:btoa(s),P,M,entry:'SGF1',ver:entryVer(entryById('SGF1')),version:VERSION,exportMs:performance.now()-start};}''')
  (O/'GroundFlame.zip').write_bytes(base64.b64decode(exported.pop('base64')))
  (O/'导出参数.json').write_text(json.dumps(exported,ensure_ascii=False,indent=2),encoding='utf-8');report['export']={k:v for k,v in exported.items() if k not in ('P','M')}
  print('PC/手机导出完成',exported['exportMs'],flush=True)
  await page.close()
  ui=await b.new_page(viewport={'width':1600,'height':1000});ui.on('pageerror',lambda e:report['errors'].append(str(e)))
  await ui.goto(url);await ui.wait_for_function('window.__fw && REPLICA_BY_ID.SGF1')
  # 实际模板按钮打开，后续走统一参数控件与保存对话框。
  await ui.evaluate("()=>{openType('sgFlame');state.playing=false;}")
  await ui.wait_for_function('wbIdle() && !!wb.sig && !!undo.last',timeout=120000)
  await ui.evaluate('()=>{state.autoBake=false;clearTimeout(bakeTimer);}')
  await ui.locator('summary:visible').filter(has_text='整体调整').evaluate('(e)=>e.parentElement.open=true')
  size=ui.get_by_role('spinbutton',name='整体尺寸（×） 数值',exact=True)
  await size.fill('1.5');await size.press('Tab');await ui.wait_for_timeout(200)
  assert await ui.evaluate('state.P.sparkGraph.spaceScale')==1.5
  await ui.evaluate('undoStep(-1)');assert await ui.evaluate("pGet(state.P,'sparkGraph.spaceScale')")==1
  await ui.evaluate('undoStep(1)');assert await ui.evaluate('state.P.sparkGraph.spaceScale')==1.5
  await ui.evaluate("selectEmitTab(sgTabOf('f01'))")
  await ui.locator('summary:visible').filter(has_text='形态').evaluate('(e)=>e.parentElement.open=true')
  density=ui.get_by_role('spinbutton',name='火焰密度（1/m） 数值',exact=True)
  await density.fill('5');await density.press('Tab');await ui.wait_for_timeout(200)
  assert await ui.evaluate('state.P.sparkGraph.emitters[0].flameDensity')==5
  await ui.evaluate('undoStep(-1)');assert await ui.evaluate('state.P.sparkGraph.emitters[0].flameDensity')==6
  await ui.screenshot(path=str(O/'UI-火焰参数.png'))
  await ui.locator('#abSave').click();await ui.locator('#saveNameInput').fill('火焰自动检查');await ui.locator('#saveNameSubmit').click()
  await ui.wait_for_function("lib.my&&lib.my.name==='火焰自动检查'");ident=await ui.evaluate('lib.my.id')
  await ui.reload();await ui.wait_for_function('window.__fw')
  await ui.evaluate('async id=>{await openMyEffect(id);state.playing=false;}',ident)
  await ui.wait_for_function('wbIdle()',timeout=120000);assert await ui.evaluate('state.P.sparkGraph.spaceScale')==1.5
  await ui.screenshot(path=str(O/'UI-保存刷新.png'))
  report['ui']={'edit':True,'flameDensityEdit':True,'undoRedo':True,'saveReload':True}
  await ui.evaluate("()=>{openReview(entryById('SGF1'));state.playing=false;}")
  await ui.wait_for_function('wbIdle()',timeout=120000)
  await ui.get_by_role('button',name='引擎回放',exact=True).click()
  await ui.get_by_role('button',name='适应窗口',exact=True).click()
  await ui.evaluate('()=>{state.t=0;state.playing=true;}')
  ticks=[]
  for i in range(3):
   await ui.wait_for_timeout(1550);ticks.append(await ui.evaluate('({time:state.t,view:state.view,playing:state.playing})'))
   await ui.locator('#gl').screenshot(path=str(O/f'引擎连续回放-{i}.png'))
  assert all(t['view']=='export' and t['playing'] for t in ticks)
  assert len(set(round(t['time'],2) for t in ticks))==3
  report['playback']=ticks
  report['inert']=await ui.evaluate("()=>{const P=structuredClone(state.P),k='sparkGraph.emitters[f01].';P.sparkGraph.emitters[0].flameFloorEnabled=0;const floor=inertWhy(k+'flameFloor',P);P.sparkGraph.emitters[0].flameDensity=0;const zero=inertWhy(k+'flameWarp',P);P.cameraMotion=1;let rejected=false;try{makeGraphRenderer(P)}catch(e){rejected=e.message.includes('不支持')}return{floor,zero,cameraRejected:rejected};}")
  assert all(report['inert'].values())
  assert not report['errors'],report['errors'];report['pass']=True
  (O/'检查.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
  await b.close();print('入口与导出检查通过',flush=True)

if __name__=='__main__':asyncio.run(main())
