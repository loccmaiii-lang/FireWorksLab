"""修订2的真实查看器、CPU事件时间线和保存刷新走查；隔离浏览器。"""
import base64
import io
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'analysis/local/SparkGraph/runtime'))
from playwright.sync_api import sync_playwright
from browser_runtime import chromium_options,verify_renderer
from PIL import Image,ImageDraw,ImageFont

OUT=ROOT/'analysis/results/PRISM3R2_20261016'
FONT=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)

def sheet(images,path,cols=4,size=320):
    dst=Image.new('RGB',(cols*size,((len(images)+cols-1)//cols)*(size+32)),(16,23,28))
    d=ImageDraw.Draw(dst)
    for n,(name,im) in enumerate(images):
        x=n%cols*size;y=n//cols*(size+32)
        dst.paste(im.resize((size,size)),(x,y+32));d.text((x+5,y+4),name,font=FONT,fill='white')
    dst.save(path,quality=94)

def capture(pg,t,view='export',yaw=0,pitch=0,disp='fit',dist=1000):
    # 调用当前正式查看器；导出序列仍由原有bake生成，不另画效果。
    return Image.open(io.BytesIO(base64.b64decode(pg.evaluate('''x=>{
      state.playing=false;state.t=x.t;state.view=x.view;state.disp=x.disp;state.dist=x.dist;
      state.eventYaw=x.yaw;state.eventPitch=x.pitch;ensureTargets();renderEventInstances(x.view==='live');
      return canvas.toDataURL('image/png').split(',')[1];}''',dict(t=t,view=view,yaw=yaw,pitch=pitch,disp=disp,dist=dist)))))

with sync_playwright() as p:
  with p.chromium.launch(channel='msedge',headless=True,**chromium_options()) as b:
    pg=b.new_page(viewport={'width':1600,'height':1100},accept_downloads=True)
    errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
    pg.goto((ROOT/'tool/FireworkBaker.html').as_uri()+'?fast',wait_until='domcontentloaded')
    pg.wait_for_function('window.__fw')
    gpu=verify_renderer(pg.evaluate("()=>{const g=document.createElement('canvas').getContext('webgl2');return g.getParameter(g.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL)}"))
    pg.evaluate("openReview(FW_REVIEW_LIST.find(e=>e.id==='PRISM3'))")
    pg.wait_for_function("state.tab==='combo' && state.layers.length===4 && wbIdle()",timeout=90000)
    # 与点击“引擎回放”一致，等取景收紧完成后核对实际产物。
    pg.evaluate("state.view='export';bakeNow({quiet:true});")
    pg.wait_for_function('wbIdle() && !bakesPending()',timeout=90000)
    report=pg.evaluate('''()=>({version:VERSION,entry_ver:entryVer(FW_REVIEW_LIST.find(e=>e.id==='PRISM3')),
       layers:state.layers.map(L=>{const e=layerEntryOf(L),b=e.bake;return {title:L.title,config:EventInstances.config(L),
         start:EventInstances.start(b),meta:{Ww:b.meta.Ww,Wh:b.meta.Wh,t0:b.meta.t0,cy:b.meta.cy,pre:b.meta.pre},
         end:EventInstances.end(L,e.P,b),births:EventInstances.table(L).list.map(q=>({time:q.death,life:q.life,
           eventPos:q.eventPos,eventVel:q.eventVel,scale:q.childSize,rotation:q.rotation,color:q.color}))};})})''')
    report['gpu']=gpu
    same_age=[]
    ages=[.1,.23,.43,.73,1.03,1.43,1.83,2.13]
    for idx in range(4):
        for age in ages:
            data=pg.evaluate('''x=>{const e=layerEntryOf(state.layers[x.i]),m=e.bake.meta;
              ensureTargets();hdrT.clear();hdrT.bind();additive(true);
              drawLayer(e.bake,{...state.layers[x.i],scale:1,delay:0,rate:1,mirror:false,stages:[[0,'#ffffff']]},x.t,[0,-2.2,25,25]);
              additive(false);post();return canvas.toDataURL('image/png').split(',')[1];}''',dict(i=idx,t=age))
            same_age.append((f'{"ABCD"[idx]} {age:.2f}s',Image.open(io.BytesIO(base64.b64decode(data)))))
    sheet(same_age,OUT/'四造型同色同龄.jpg',cols=8,size=200)
    sheet([(f'回放 {t:.2f}s',capture(pg,t)) for t in [.1,.33,.47,.67,.87,1.1,1.4,1.8,2.1,2.5,2.8,3.1]],OUT/'整体回放时序.jpg')
    sheet([(f'{v} {t:.2f}s',capture(pg,t,v)) for t in [.47,.8,1.2,1.8] for v in ['live','export']],OUT/'实时与序列.jpg')
    sheet([(f'方位{y}° 仰角{e}°',capture(pg,1.4,yaw=y,pitch=e)) for y,e in [(0,0),(90,0),(35,35),(180,0)]],OUT/'整体多角度.jpg')
    sheet([(f'游戏内大小 {d}m',capture(pg,1.4,disp='game',dist=d)) for d in [800,1000,1200]],OUT/'整体游戏内大小.jpg',cols=3)
    # 连续播放采样相同真实viewer，保留30fps视频及GIF便于独立复核。
    frames=[capture(pg,k/30) for k in range(100)]
    frames[0].save(OUT/'整体回放.gif',save_all=True,append_images=frames[1:],duration=[33,33,34]*33+[33],loop=0)
    try:
        import cv2
        import numpy as np
        v=cv2.VideoWriter(str(OUT/'整体回放.mp4'),cv2.VideoWriter_fourcc(*'mp4v'),30,frames[0].size)
        for im in frames:v.write(cv2.cvtColor(np.array(im.convert('RGB')),cv2.COLOR_RGB2BGR))
        v.release()
    except ImportError:pass
    report['continuous_frames']=100
    # 使用新增控件修改数量，验证撤销/重做，保存后再刷新重新打开。
    pg.evaluate('state.comboSel=0;buildMasterPanel();buildLayerHead(0);')
    pg.locator('#eventInstancePanel').evaluate('(x)=>x.open=true')
    print(pg.locator('#eventInstancePanel input').evaluate_all('(xs)=>xs.map(x=>({id:x.id,type:x.type,value:x.value}))'),flush=True)
    control=pg.locator('#ev0-count')
    if not control.count():control=pg.locator('#x-ev0-count')
    control.evaluate("x=>{x.value=5;x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}));}")
    pg.wait_for_function('state.layers[0].eventSpawn.count===5')
    pg.wait_for_timeout(100)
    pg.locator('#abUndo').click();pg.wait_for_function('state.layers[0].eventSpawn.count===4')
    pg.locator('#abRedo').click();pg.wait_for_function('state.layers[0].eventSpawn.count===5')
    pg.locator('#abSave').click();pg.locator('#saveNameInput').fill('彩千轮R2事件流程检查（隔离）');pg.locator('#saveNameSubmit').click()
    pg.wait_for_function('lib.my && !wb.saving',timeout=30000);saved=pg.evaluate('lib.my.id')
    pg.reload(wait_until='domcontentloaded');pg.wait_for_function('window.__fw')
    pg.evaluate('(id)=>openMyEffect(id)',saved)
    pg.wait_for_function('state.layers.length===4 && wbIdle()',timeout=90000)
    saved_layers=pg.evaluate('state.layers.map(L=>({eventSpawn:L.eventSpawn,P:layerEntryOf(L).P}))')
    assert saved_layers[0]['eventSpawn']['count']==5
    assert [x['P']['ringFrac'] for x in saved_layers]==[.68,.44,.74,.32]
    pg.evaluate("document.querySelector('#deliveryDestination').value='zip'")
    with pg.expect_download(timeout=45000) as dl:pg.locator('#abExportPack').click()
    dl.value.save_as(OUT/'隔离保存刷新导出.zip')
    import zipfile
    with zipfile.ZipFile(OUT/'隔离保存刷新导出.zip') as z:
        j=json.loads(z.read(next(n for n in z.namelist() if n.endswith('/cascade.json'))))
    carrier=next(e for e in j['emitters'] if e['name']=='L1_Carrier')
    assert carrier['spawn']['bursts']==[[0,5]]
    assert len([e for e in j['emitters'] if 'Carrier' in e['name']])==4
    report['ui_flow']={'edit_count':5,'undo_count':4,'redo_count':5,'saved_id':saved,
       'refresh_preserved':True,'exported_carrier_count':5,'preserved_ringFrac':[x['P']['ringFrac'] for x in saved_layers]}
    pg.screenshot(path=str(OUT/'整体保存刷新走查.png'))
    report['page_errors']=errors;assert not errors,errors
    (OUT/'整体查看器走查.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print('整体查看器、事件随机、连续回放、保存刷新真实导出通过',flush=True)
