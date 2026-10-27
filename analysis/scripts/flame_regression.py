"""隔离HTTP测试页用固定旧成品替换主文档响应，逐像素检查全部当前旧候选/正式层。"""
from pathlib import Path
import asyncio,subprocess,json,hashlib,sys
from playwright.async_api import async_playwright
from browser_runtime import chromium_options,verify_renderer,verify_validation_source
R=Path(__file__).resolve().parents[2];O=R/'analysis/local/20261027_procedural-fire_实现'
BASE='7abc7397'
async def main():
 O.mkdir(parents=True,exist_ok=True)
 subprocess.run([sys.executable,'-X','utf8',str(R/'tool/local_http/preflight.py'),'--tool','baker','--start'],check=True)
 old=subprocess.check_output(['git','show',BASE+':tool/FireworkBaker.html'],cwd=R).decode('utf-8')
 url='http://127.0.0.1:8034/baker?fast';verify_validation_source(url,R/'tool/FireworkBaker.html')
 async with async_playwright() as p:
  b=await p.chromium.launch(channel='msedge',headless=True,**chromium_options());pages=[]
  for before in [True,False]:
   pg=await b.new_page();await pg.add_init_script('window.requestAnimationFrame=()=>0;')
   if before:await pg.route('**/baker?fast',lambda route:route.fulfill(status=200,content_type='text/html; charset=utf-8',body=old))
   await pg.goto(url);await pg.wait_for_function('window.__fw && typeof FW_EFFECTS!=="undefined"')
   await pg.evaluate('()=>{clearTimeout(bakeTimer);state.autoBake=false;state.playing=false;state.stillBusy=true;}');pages.append(pg)
  renderer=verify_renderer(await pages[1].evaluate("()=>{const e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL)}"))
  cases=await pages[0].evaluate('''()=>{const out=[],seen=new Set();
   for(const type of ['kiku','botan','kamuro','senrin','strobe','crackle','sgSparkler','sgRocket','sgBlank']){const{P,M}=defaultsFor(type);out.push({id:'template:'+type,P,M,times:[.12,.35,.7].map(f=>f*(P.sparkGraph?.period||P.duration))});}
   for(const ef of FW_EFFECTS.filter(x=>['待验收','已通过'].includes(x.阶段))){const e=entryById(ef.待验收版||ef.主条目);if(!e)throw Error('找不到当前效果 '+ef.key);const ids=e.formal?[e.formal.id]:e.kind==='combo'?e.layerIds:[e.id];
    for(const id of ids){if(id==='SGF1'||seen.has(id))continue;seen.add(id);if(!REPLICA_BY_ID[id])throw Error('找不到当前图层 '+id);const{P,M}=replicaPM(id);out.push({id:'entry:'+id,P,M,times:[.35*(P.sparkGraph?.period||P.duration)]});}}
   return out;}''')
  rows=[]
  for c in cases:
   got=[]
   for pg in pages:
    v=await pg.evaluate('''async c=>{const pl=displayPlan40(c.P),frames=await renderStills40(c.P,c.M,{px:c.P.sparkGraph?384:160,times:c.times,plan:pl});return{plan:JSON.stringify(pl),frames:frames.map(f=>f.png)};}''',c)
    got.append(v)
   row={'id':c['id'],'times':c['times'],'planSame':got[0]['plan']==got[1]['plan'],'pixelsSame':got[0]['frames']==got[1]['frames'],'sha':[hashlib.sha256(x.encode()).hexdigest() for x in got[1]['frames']]}
   rows.append(row);print(len(rows),'/',len(cases),row['id'],row['planSame'],row['pixelsSame'],flush=True)
   report={'baseline':BASE,'baselineHTMLSHA256':hashlib.sha256(old.encode()).hexdigest(),'currentHTMLSHA256':hashlib.sha256((R/'tool/FireworkBaker.html').read_bytes()).hexdigest(),'renderer':renderer,'scope':'九模板各三帧；全部现行待验收/已通过的旧效果及组合层各一帧，固定配方与实际GPU定帧；旧版由隔离HTTP页的主文档响应替换加载，不是生产HTTP版本。','complete':len(rows)==len(cases),'pass':all(x['planSame'] and x['pixelsSame'] for x in rows),'rows':rows}
   (O/'旧效果回归.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
   assert report['pass'],row
  await b.close()
if __name__=='__main__':asyncio.run(main())
