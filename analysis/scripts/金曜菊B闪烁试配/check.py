"""复用正式标准/回放检查，制作从真实导出贴图取得的同尺度对照。"""
from pathlib import Path
import importlib.util, json, math, sys, zipfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'analysis/results/GLITTER_TWINKLE_20261017'
DELIVER=Path('F:/FireWorksLab/outputs/金曜菊B闪烁试配_20261017')
sys.path.insert(0,str(ROOT/'analysis/scripts'))

def load(name, filename):
    sp=importlib.util.spec_from_file_location(name,ROOT/'analysis/scripts'/filename)
    m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m);return m

rc=load('twinkle_replay','回放检查.py')
std=load('twinkle_standard','标准检查.py')
probe=std.probe
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',19)

def write(path,doc):path.write_text(json.dumps(doc,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

def packs_for(d,filename='cascade.json'):
    cj=json.loads((d/filename).read_text(encoding='utf-8'))
    # Pack从cascade.json读取。手机包放独立目录，保持原包内容。
    return [rc.Pack(str(d),i) for i,e in enumerate(cj['emitters']) if 'main' in cj['materials'][e['material']].get('textures',{})]

def render(packs,t,world,px=560):
    # 与回放检查.check完全相同的贴图取帧、Ramp、位置及色调映射；固定所有方案的world。
    acc=np.zeros((px,px,3),np.float32)
    for p in packs:
        age=math.floor(t*30+1e-8)/30-p.delay
        if age<0 or age>=p.life:continue
        u=age/p.life;v=p.cell(p.frame_at(u));w,h=np.maximum(2,np.round(p.size(u)/world*px)).astype(int)
        im=np.array(Image.fromarray(np.uint8(v*255)).resize((int(w),int(h)),Image.Resampling.BILINEAR),np.float32)/255
        ox,oz=p.offset(u);col=p.rgb(im,u);x0=(px-w)//2+int(round(ox/world*px));y0=(px-h)//2-int(round(oz/world*px))
        xa,ya,xb,yb=max(0,x0),max(0,y0),min(px,x0+w),min(px,y0+h)
        if xb>xa and yb>ya:acc[ya:yb,xa:xb]+=col[ya-y0:yb-y0,xa-x0:xb-x0]
    return Image.fromarray(np.uint8(np.clip(1-np.exp(-acc),0,1)**(1/2.2)*255))

def contacts():
    doc=json.loads((OUT/'连续播放检查.json').read_text(encoding='utf-8'))
    sheet=Image.new('RGB',(1440,6*285+50),(12,13,18));dr=ImageDraw.Draw(sheet)
    dr.text((12,10),'真实播放连续采样：上行为整体，下行为右上局部；采样图宽480px，局部未再缩放',font=font,fill=(245,219,165))
    for ri,row in enumerate(doc['reports']):
        for ci,t in enumerate([1,1+1/12,1+2/12,1+3/12,1+4/12,1+5/12]):
            frame=min(row['frames'],key=lambda x:abs(x['t']-t))
            im=Image.open(OUT/frame['file']).convert('RGB')
            thumb=im.resize((240,240),Image.Resampling.LANCZOS)
            for part,tile in enumerate([thumb,im.crop((im.width//2,0,im.width//2+240,240))]):
                y=50+(ri*2+part)*285
                dr.text((ci*240+8,y),f"{row['id']} {frame['t']:.3f}s"+(' 局部1:1' if part else ''),font=font,fill=(245,219,165))
                sheet.paste(tile,(ci*240,y+35))
    sheet.save(OUT/'连续播放整体与局部.jpg',quality=94)
    ref=Image.open('C:/Users/locmai/AppData/Local/Temp/codex-clipboard-b109ad09-cd0b-4384-904d-517dedaf12da.png').convert('RGB')
    ref=ref.crop((0,0,ref.width,int(ref.width*1.02)));ref.thumbnail((590,610),Image.Resampling.LANCZOS)
    s3=Image.open(OUT/'S3_1.20.png').convert('RGB');s3.thumbnail((590,610),Image.Resampling.LANCZOS)
    comp=Image.new('RGB',(1200,750),(12,13,18));d=ImageDraw.Draw(comp)
    for i,(im,title) in enumerate([(ref,'图4：静态照片，裁去下方空白'),(s3,'S3：真实回放1.20秒，原色原曝光')]):
        d.text((i*600+12,10),title,font=font,fill=(245,219,165));comp.paste(im,(i*600+(600-im.width)//2,65))
    d.text((12,700),'图4的钩形可能含快门/机震；只借鉴粒状亮结，未擅自加入螺旋、摆动或改变主星轨迹。',font=font,fill=(235,225,200))
    comp.save(OUT/'图4与稀簇辉闪.jpg',quality=92)
    for n in ['连续播放整体与局部.jpg','图4与稀簇辉闪.jpg','连续播放检查.json']:
        import shutil
        shutil.copy2(OUT/n,DELIVER/n)

def main():
    reports=[];allpacks={};probe_results=[]
    if (OUT/'标准探针.json').exists():
        for m in json.loads((OUT/'标准探针.json').read_text(encoding='utf-8')):
            verdict=probe.verdict(m,std.STD)
            probe_results.append(dict(id=m['id'],checks=verdict,passed=all(verdict.values())))
        write(OUT/'标准检查.json',{'std':std.STD,'items':probe_results,
              'features':std.features(dict(kind='combo',form='master',video=False)),
              'pass':all(x['passed'] for x in probe_results),
              'note':'原标准探针逐层检查；素材包实际组合倍率与手机完整性另查，不用单层标准替代组合结果。静态参考另在本任务对照图，未冒充有同秒视频。'})
    for code in ['ORIGINAL','S1','S2','S3']:
        zi=DELIVER/('GlitterChry_Baseline.zip' if code=='ORIGINAL' else 'GlitterChry_'+code+'.zip')
        dest=OUT/'素材包'/code;dest.mkdir(parents=True,exist_ok=True)
        with zipfile.ZipFile(zi) as z:
            for n in z.namelist():
                target=(dest/n).resolve()
                if not target.is_relative_to(dest.resolve()):raise ValueError('ZIP路径越界')
            z.extractall(dest)
        packs=packs_for(dest);allpacks[code]=packs
        rep=rc.check(packs,str(OUT/(code+'_回放检查.jpg')),times_s=[.45,.8,1.2,1.7,2.2,2.8,3.4],px=280)
        cj=json.loads((dest/'cascade.json').read_text(encoding='utf-8'))
        mob=json.loads((dest/'cascade_mobile.json').read_text(encoding='utf-8'))
        md=dest/'mobile-check';md.mkdir(exist_ok=True)
        (md/'cascade.json').write_text(json.dumps(mob,ensure_ascii=False),encoding='utf-8')
        # 手机与PC可能共享Ramp；只复制引用贴图，不改配置、不增加层。
        import shutil
        for tx in mob['textures'].values():
            if 'file' in tx and (dest/tx['file']).is_file():shutil.copy2(dest/tx['file'],md/tx['file'])
        mobilepacks=packs_for(md)
        mrep=rc.check(mobilepacks,str(OUT/(code+'_手机回放检查.jpg')),px=220)
        count10=[dict(layer=p.e['name'],frames=p.frames,shown=len(set(p.ticks(10))),ratio=len(set(p.ticks(10)))/p.frames) for p in packs]
        row=dict(id=code,pcReplayPass=rep['pass'],mobileReplayPass=mrep['pass'],pcSeqEmitters=len(packs),
                 mobileSeqEmitters=len(mobilepacks),mobilePreservesAllLayers={p.e['name'].split('_')[0] for p in mobilepacks}=={p.e['name'].split('_')[0] for p in packs},
                 diagnosticFps10=count10,pcSpriteMeters=[max(p.size(u).max() for u in np.linspace(0,1,61))/100 for p in packs],
                 pcShown=[dict(layer=x['pack'],shown=x.get('shown'),frames=x.get('frames'),pass_=x['pass'],fails=x['fails']) for x in rep['layers']],
                 source=cj.get('source'),format=cj.get('format'))
        reports.append(row)
        print(code,'PC',rep['pass'],'mobile',mrep['pass'],'seq',len(packs),len(mobilepacks),flush=True)
    # 固定世界范围，不能逐方案各自放大。最大面片取原版与所有试配的并集。
    world=max(p.size(u).max()+2*max(map(abs,p.offset(u))) for ps in allpacks.values() for p in ps for u in np.linspace(0,1,25))*1.06
    times=[.8,1.2,1.7,2.2,2.8]
    sheet=Image.new('RGB',(560*4,560*len(times)+80),(12,13,18));draw=ImageDraw.Draw(sheet)
    labels=['原版','S1 疏点游闪（首选）','S2 保尾细闪','S3 稀簇辉闪']
    for i,label in enumerate(labels):draw.text((i*560+14,10),label,font=font,fill=(245,219,165))
    for j,t in enumerate(times):
        for i,code in enumerate(allpacks):
            im=render(allpacks[code],t,world);sheet.paste(im,(i*560,80+j*560))
            draw.text((i*560+12,80+j*560+12),f'{t:.2f}秒',font=font,fill=(235,225,200))
    sheet.save(OUT/'四版同尺度时序.jpg',quality=92)
    hero=Image.new('RGB',(560*4,615),(12,13,18));hd=ImageDraw.Draw(hero)
    for i,(code,label) in enumerate(zip(allpacks,labels)):
        hd.text((i*560+14,10),label,font=font,fill=(245,219,165));hero.paste(render(allpacks[code],1.2,world),(i*560,55))
    hero.save(OUT/'四版同尺度_1.20秒.jpg',quality=94)
    # 用源照片做形态对照；不假称同一时刻，不锐化、不增加曝光。
    ref1=Image.open('C:/Users/locmai/AppData/Local/Temp/codex-clipboard-495e975b-495c-4dd8-9109-762aa899e94b.png').convert('RGB')
    ref5=Image.open('C:/Users/locmai/AppData/Local/Temp/codex-clipboard-a9449139-4f7d-44c7-8810-073cb71e32f0.png').convert('RGB')
    ref1=ref1.crop((0,0,ref1.width*822//1584,ref1.height))
    ref5=ref5.crop((25,190,711,830))
    comp=Image.new('RGB',(560*4,1300),(12,13,18));dr=ImageDraw.Draw(comp)
    dr.text((14,8),'静态形态对照：照片时间与曝光未知；仅比较亮点、暗隙和尾迹形态',font=font,fill=(245,219,165))
    for i,(label,im) in enumerate([('图1左（实拍）',ref1),('图5（实拍）',ref5),('原版 1.20秒',render(allpacks['ORIGINAL'],1.2,world)),('S1 1.20秒',render(allpacks['S1'],1.2,world))]):
        dr.text((i*560+14,45),label,font=font,fill=(245,219,165));im.thumbnail((550,550),Image.Resampling.LANCZOS);comp.paste(im,(i*560+(560-im.width)//2,100+(550-im.height)//2))
    dr.text((14,675),'三套试配与原版：同一世界范围、同一导出时间、同一渲染公式',font=font,fill=(245,219,165))
    for i,code in enumerate(allpacks):comp.paste(render(allpacks[code],1.7,world),(i*560,720))
    comp.save(OUT/'参考与三配方.jpg',quality=92)
    write(OUT/'素材检查汇总.json',{'items':reports,'standardProbePass':all(x['passed'] for x in probe_results),
      'pcPass':all(x['pcReplayPass'] for x in reports if x['id']!='ORIGINAL'),
      'mobileArtComplete':all(x['mobilePreservesAllLayers'] for x in reports),
      'note':'手机沿用原存档自动方案，只出第一层，原本就缺金锦尾和点灭星头；不作为本轮闪烁目标已通过。10fps是额外低帧率敏感性检查，不代表UE FixedTime@10的真实显示帧率。未修改母材质/UE资产，也未新增手机表现方案。'})
    for n in ['四版同尺度时序.jpg','四版同尺度_1.20秒.jpg','参考与三配方.jpg','素材检查汇总.json','计算结果.json','主星逐步一致.json']:
        shutil.copy2(OUT/n,DELIVER/n)

if __name__=='__main__':
    if '--contacts' in sys.argv:contacts()
    else:main()
