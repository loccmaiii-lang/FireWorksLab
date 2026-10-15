"""N23 reduced GPU diagnostics; no production publication or engine writes."""
import asyncio, base64, datetime, hashlib, json, os, pathlib, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw
ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'analysis/scripts'))
from browser_runtime import launch_async, verify_renderer
OUT = pathlib.Path(__file__).resolve().parent / '小图实烘'
REF = '3205cba7'
SCALE = 0.125
CASES = [(k, {'type': k}) for k in ['kiku','botan','kamuro','senrin','strobe','crackle']]
CASES += [('JM4-40', {'id':'JM4-40'}), ('sphere-unit', {'type':'kiku','unit':True})]
JS = r"""async a => {
  const source=a.id?replicaPM(a.id):defaultsFor(a.type,40);
  const M=structuredClone(source.M),original=derive(structuredClone(source.P));
  original.texW=2048; original.texH=2048;
  let P=a.unit?unitP(original):original,job=null;
  if(a.snapshot){
    state.tab='live'; state.P=structuredClone(P); state.M=structuredClone(M);
    job=captureExportJob();
    if(!Object.isFrozen(job.P)||!Object.isFrozen(job.M))throw Error('snapshot_not_frozen');
    state.P.seed+=999;state.P.pattern='half';state.M.ramp0='#00ff00';
    await new Promise(r=>setTimeout(r,0)); P=exportBakeParams(job.P,job.M);
  }
  const b=await bake(P,a.scale,null),textures=[];
  try{
    const capture=async(s,part)=>{
      for(const key of ['head','tail']){
        if(!s[key])continue;
        const raw=readRGBA8(s[key]);let binary='';
        for(let i=0;i<raw.length;i+=32768)binary+=String.fromCharCode(...raw.subarray(i,i+32768));
        const png=new Uint8Array(await(await encodePNG(raw,s.N,s.NH)).arrayBuffer());let encoded='';
        for(let i=0;i<png.length;i+=32768)encoded+=String.fromCharCode(...png.subarray(i,i+32768));
        textures.push({part:part+'/'+key,width:s.N,height:s.NH,raw:btoa(binary),png:btoa(encoded)});
      }
    };
    for(let s=b,i=0;s;s=s.next,i++)await capture(s,'segment'+i);
    for(const f of b.fades||[])await capture(f,'fade'+f.fps);
    const m=b.meta,plan={form:b.form,L:m.L,times:m.times,keys:m.keys,duration:m.duration,Ww:m.Ww,Wh:m.Wh};
    return{version:VERSION,plan,textures,ramp:Array.from(rampPixels(job?job.M:M)),snapshot:job?{capturedSeed:job.P.seed,currentSeed:state.P.seed,capturedPattern:job.P.pattern,currentPattern:state.P.pattern,frozen:true}:null};
  }finally{disposeBake(b);}
}"""
async def page_for(browser,html):
    ctx=await browser.new_context(viewport={'width':1200,'height':800})
    page=await ctx.new_page()
    await page.add_init_script('window.requestAnimationFrame = () => 0;')
    await page.goto(html.resolve().as_uri()+'?fast',wait_until='load',timeout=90000)
    await page.wait_for_function('window.__fw && typeof EFFS === "function"',timeout=90000)
    await page.wait_for_function('window.__fw.idle()',timeout=120000)
    await page.evaluate('state.stillBusy=true;clearTimeout(bakeTimer);state.dirty=false;scheduleBake=()=>{};scheduleRefine=()=>{};')
    renderer=await page.evaluate('document.querySelector("#gpu").title')
    verify_renderer(renderer)
    return ctx,page,renderer

def save(label,name,r):
    values={}
    for t in r['textures']:
        raw=base64.b64decode(t.pop('raw'));png=base64.b64decode(t.pop('png'))
        key=t['part'];stem=name+'_'+key.replace('/','_')
        (OUT/(label+'_'+stem+'.png')).write_bytes(png)
        pixels=np.frombuffer(raw,dtype=np.uint8).reshape(t['height'],t['width'],4).copy()
        values[key]=pixels;t['sha256']=hashlib.sha256(raw).hexdigest();t['nonzero']=int(np.count_nonzero(pixels))
    assert values and any(np.any(v) for v in values.values()),name+': blank actual GPU bake'
    return values

def compare(name,o,n,ov,nv):
    rows=[]
    for key in sorted(set(ov)|set(nv)):
        a,b=ov.get(key),nv.get(key);same_shape=a is not None and b is not None and a.shape==b.shape
        if same_shape:
            d=np.abs(a.astype(np.int16)-b.astype(np.int16));maxd=int(d.max());changed=int(np.count_nonzero(np.any(d,axis=2)))
            left=Image.fromarray(a.max(axis=2),'L').convert('RGB');right=Image.fromarray(b.max(axis=2),'L').convert('RGB')
            diff=Image.fromarray(np.clip(d.max(axis=2)*8,0,255).astype(np.uint8),'L').convert('RGB')
            panel=Image.new('RGB',(left.width*3,left.height+22));panel.paste(left,(0,22));panel.paste(right,(left.width,22));panel.paste(diff,(left.width*2,22))
            ImageDraw.Draw(panel).text((4,4),name+' / old | new | diff x8',fill='white')
            panel.save(OUT/('compare_'+name+'_'+key.replace('/','_')+'.png'))
        else:maxd=None;changed=None
        rows.append({'part':key,'shapeSame':same_shape,'maxDelta':maxd,'changedPixels':changed,'pass':same_shape and maxd==0})
    same=o['plan']==n['plan'];ramp=o['ramp']==n['ramp']
    return{'case':name,'planSame':same,'rampSame':ramp,'textures':rows,'pass':same and ramp and all(x['pass'] for x in rows)}

async def run(ref):
    from playwright.async_api import async_playwright
    report={'format':'df.n23-small-gpu-check/1','readAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'reference':REF,'scale':SCALE,'scope':'Reduced diagnostic atlases; no production export, full-size quality, native importer, UE playback, or user acceptance.','renderers':{},'comparisons':[],'atlasEvidence':{}}
    runs={}
    async with async_playwright() as p:
        browser=await launch_async(p)
        try:
            for label,html in [('old',ref),('new',ROOT/'tool/FireworkBaker.html')]:
                ctx,page,renderer=await page_for(browser,html);report['renderers'][label]=renderer;runs[label]={};report['atlasEvidence'][label]={}
                try:
                    for name,args in CASES:
                        r=await page.evaluate(JS,{**args,'scale':SCALE});v=save(label,name,r);runs[label][name]=(r,v);report['atlasEvidence'][label][name]=r['textures']
                        print(label,name,'real textures',len(v),flush=True)
                    if label=='new':
                        r=await page.evaluate(JS,{'type':'kiku','scale':SCALE,'snapshot':True});v=save('snapshot','kiku',r)
                        a,av=runs['new']['kiku'];probe=compare('snapshot-kiku',a,r,av,v);probe['context']=r['snapshot'];report['snapshotHelperGPU']=probe
                        half=await page.evaluate("async()=>{const P=derive({...defaultsFor('kiku',40).P,pattern:'half'});let blocked=false,message='';try{const b=await bakeUnit(P,.125,null);disposeBake(b);}catch(e){blocked=true;message=e.message;}return{blocked,message,implemented:false};}")
                        report['halfSafetyBlock']=half
                finally:await ctx.close()
            for name,_ in CASES:
                o,ov=runs['old'][name];n,nv=runs['new'][name];row=compare(name,o,n,ov,nv);report['comparisons'].append(row)
                print('PASS' if row['pass'] else 'FAIL',name,flush=True)
            report['versions']={k:runs[k]['kiku'][0]['version'] for k in runs}
            report['pass']=all(x['pass'] for x in report['comparisons']) and report['snapshotHelperGPU']['pass'] and report['halfSafetyBlock']['blocked']
            return report
        finally:await browser.close()

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    fd,name=tempfile.mkstemp(prefix='_ref_atlas_N23_',suffix='.html',dir=ROOT/'tool');os.close(fd);ref=pathlib.Path(name)
    try:
        ref.write_bytes(subprocess.check_output(['git','show',REF+':tool/FireworkBaker.html'],cwd=ROOT))
        report=asyncio.run(asyncio.wait_for(run(ref),1200));(OUT/'小图实烘.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print('small_gpu_pass',report['pass'],flush=True)
        return 0 if report['pass'] else 1
    finally:
        assert ref.resolve().parent==(ROOT/'tool').resolve();ref.unlink(missing_ok=True)
if __name__=='__main__':sys.exit(main())