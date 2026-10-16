"""把冻结正式包的原始RGBA字节接入现有查看器，核对缓存差异并生成真实缩略图。"""
import base64,hashlib,io,json,sys
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'analysis/local/SparkGraph/runtime'))
from playwright.sync_api import sync_playwright
from browser_runtime import chromium_options
OUT=ROOT/'analysis/results/PRISM3R2_20261016';pack=OUT/'正式包/PrismWheels3'
spec=json.loads((pack/'cascade.json').read_text(encoding='utf-8'))
desc=json.loads((pack/'PRISM3_组合说明.json').read_text(encoding='utf-8'))
assert len(desc['recipe']['layers'])==4
assert [x['eventSpawn'] for x in desc['layers']]==spec['source']['event_instances']
with sync_playwright() as p:
 with p.chromium.launch(channel='msedge',headless=True,**chromium_options()) as b:
  pg=b.new_page(viewport={'width':1600,'height':1100});pg.goto((ROOT/'tool/FireworkBaker.html').as_uri()+'?fast')
  pg.wait_for_function('window.__fw');pg.evaluate("openReview(FW_REVIEW_LIST.find(e=>e.id==='PRISM3'))")
  pg.wait_for_function('state.layers.length===4&&wbIdle()',timeout=90000)
  pg.evaluate("state.playing=false;state.view='export';bakeNow({quiet:true})")
  pg.wait_for_function('wbIdle()&&!bakesPending()',timeout=90000)
  diffs=[]
  for i in range(4):
   tex=spec['textures'][f'L{i+1}_seq'];em=next(x for x in spec['emitters'] if x['name']==f'L{i+1}_Bloom')
   # 原始RGBA字节不经过Canvas预乘，A也是数据帧。
   rgba=np.flipud(np.array(Image.open(pack/tex['file']).convert('RGBA'))).copy()
   data=base64.b64encode(rgba.tobytes()).decode()
   diffs.append(pg.evaluate('''a=>{const L=state.layers[a.i],e=layerEntryOf(L),b=e.bake,raw=Uint8Array.from(atob(a.data),x=>x.charCodeAt(0)),was=readRGBA8(b.head);
     let max=0,changed=0;for(let j=0;j<raw.length;j++){max=Math.max(max,Math.abs(was[j]-raw[j]));if(was[j]!==raw[j])changed++;}
     const md=Object.fromEntries(a.em.modules.map(x=>[x.m,x]));
     const sz=md.InitialSize.StartSize.uniform,ww=(sz[0][0]+sz[1][0])/200;
     if(Math.abs(ww-b.meta.Ww)>.001)throw Error('正式包尺寸与当前配方不一致');
     gl.bindTexture(gl.TEXTURE_2D,b.head.tex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,b.N,b.NH,gl.RGBA,gl.UNSIGNED_BYTE,raw);
     b.meta.Ww=b.meta.Wh=ww;b.meta.cy=-(a.em.required.pivot_offset[1]+.5)*ww;
     b.meta.duration=md.Lifetime.Lifetime.const;b.meta.keys=md.DynamicParameter.params.frame.curve;
     return {layer:a.i+1,max_delta:max,changed,total:raw.length};}''',dict(i=i,data=data,em=em)))
  # 以上仅替换隔离检查页面，不修改烘焙器/原始配方/冻结包。
  screenshot=pg.evaluate("()=>{state.playing=false;state.t=1.4;state.disp='fit';ensureTargets();renderCombo();return canvas.toDataURL('image/png');}")
  (OUT/'正式包整体预览.png').write_bytes(base64.b64decode(screenshot.split(',')[1]))
  thumb=pg.evaluate('''async url=>{const im=new Image();im.src=url;await im.decode();return thCrop(im);}''',screenshot)
  assert thumb and thumb.get('img')
  (OUT/'缩略图.json').write_text(json.dumps({'src':thumb['img'],'ver':pg.evaluate("entryVer(entryById('PRISM3'))"),
    'at':'2026-10-16','job':'PRISM3R2_20261016','source':'正式包PNG原始RGBA＋正式尺寸/帧曲线→当前普通查看器，1.4s'},ensure_ascii=False,indent=2),encoding='utf-8')
  pg.evaluate('selectComboLayer(0)')
  disabled=pg.locator('#lhOut [data-out] option').evaluate_all('(xs)=>xs.map(x=>({platform:x.parentElement.dataset.out,value:x.value,disabled:x.disabled,title:x.title}))')
  assert all(x['disabled'] for x in disabled if x['platform']=='mobile' and x['value']!='off')
  assert all(x['disabled'] for x in disabled if x['platform']=='pc' and x['value'] not in ['seq','off'])
  report={'cascade_sha256':hashlib.sha256((pack/'cascade.json').read_bytes()).hexdigest(),'cache_vs_formal_rgba':diffs,
   'formal_pngs_loaded':True,'formal_size_curve_loaded':True,'export_description_full_recipe':True,'unsupported_options_disabled':disabled}
  (OUT/'正式包查看器校核.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
  print(json.dumps(report['cache_vs_formal_rgba'],ensure_ascii=False),flush=True)
