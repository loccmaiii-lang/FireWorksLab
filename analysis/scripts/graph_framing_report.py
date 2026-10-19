"""用真实两平台包生成固定世界比例与单格利用率对照，核对只改bounds。"""
from pathlib import Path
import json, sys, hashlib, zipfile, importlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont

R=Path(__file__).resolve().parents[2]
O=R/'analysis/results/GraphFraming'
B=R/'analysis/local/GraphFraming/pack'
sys.path.insert(0,str(R/'analysis/scripts'))
rc=importlib.import_module('回放检查')
before=json.loads((O/'原取景参数.json').read_text(encoding='utf-8'))
after=json.loads((O/'收紧取景参数.json').read_text(encoding='utf-8'))
names={'SGR1':'窜天猴尾焰','SGS1':'仙女棒','SGRS1':'柔光暗底'}
fontpath='C:/Windows/Fonts/msyh.ttc'
font=ImageFont.truetype(fontpath,22)
small=ImageFont.truetype(fontpath,17)

def save(p,d):
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def changes(a,b,key=''):
    if isinstance(a,dict) and isinstance(b,dict):
        return [x for k in sorted(set(a)|set(b)) for x in changes(a.get(k),b.get(k),key+'.'+k)]
    return [] if a==b else [key.lstrip('.')]

def pack(c,stage,pf):
    p=B/c['id']/stage
    return rc.Pack(str(p/('mobile' if pf=='手机' else '')))

def frame(p,t):
    u=t/p.life
    rgb=p.rgb(p.cell(p.frame_at(u)),u)
    # 与回放检查一致的材质信号，统一显示变换；不单独增亮柔层。
    rgb=np.power(np.maximum(rgb,0)/(1+np.maximum(rgb,0)),1/2.2)
    return Image.fromarray(np.uint8(np.clip(rgb,0,1)*255))

def world_image(p,t,w,h,rect):
    left,right,bottom,top=rect
    iw,ih=p.size(.5)/100
    cx,cy=np.asarray(p.offset(.5))/100
    im=Image.new('RGB',(w,h),(10,12,17))
    tile=frame(p,t).resize((max(1,round(iw/(right-left)*w)),max(1,round(ih/(top-bottom)*h))),Image.Resampling.BILINEAR)
    ox=round((cx-iw/2-left)/(right-left)*w)
    oy=round((top-cy-ih/2)/(top-bottom)*h)
    im.paste(tile,(ox,oy))
    d=ImageDraw.Draw(im)
    d.rectangle((ox,oy,ox+tile.width-1,oy+tile.height-1),outline=(87,125,144),width=1)
    nx=(0-left)/(right-left)*w
    ny=(top-0)/(top-bottom)*h
    d.line((nx-7,ny,nx+7,ny),fill=(66,231,211),width=1)
    d.line((nx,ny-7,nx,ny+7),fill=(66,231,211),width=1)
    return im

report={}
for old,new in zip(before,after):
    assert old['id']==new['id']
    diff=changes({'P':old['P'],'M':old['M']},{'P':new['P'],'M':new['M']})
    assert diff==['P.sparkGraph.bounds'],diff
    a,b=old['P']['sparkGraph']['bounds'],new['P']['sparkGraph']['bounds']
    ratio=(b[1]-b[0])*(b[3]-b[2])/((a[1]-a[0])*(a[3]-a[2]))
    rec={'changedKeys':diff,'oldBounds':a,'newBounds':b,'quadAreaReduction':1-ratio,'platforms':{}}
    for pf in ['PC','手机']:
        p,q=pack(old,'before',pf),pack(new,'candidate',pf)
        assert p.frames==q.frames==64
        assert (p.cw,p.chh)==(q.cw,q.chh)
        # 验证Cascade实际导出锚点重建，而非拿贴图中心代替喷口。
        expected=np.array([(b[0]+b[1])/2,(b[2]+b[3])/2])
        restored=np.asarray(q.offset(.5))/100
        error=np.max(np.abs(expected-restored))
        assert error<.001,(new['id'],pf,error)
        pivot=q.e['required'].get('pivot_offset',[-.5,-.5])
        rec['platforms'][pf]={'frames':q.frames,'cellPx':[q.cw,q.chh],'sizeM':(q.size(.5)/100).tolist(),'centerM':restored.tolist(),'pivotJSON':pivot,'pivotPanel':[round(x+.5,4) for x in pivot],'centerErrorM':float(error),'pass':json.loads((O/new['id']/'candidate'/(pf+'-回放.json')).read_text(encoding='utf-8'))['pass']}
        assert rec['platforms'][pf]['pass']
        # 每效果两种观察：同米制空间并排，以及相同格子的像素利用率。
        iw,ih=p.size(.5)/100
        cx,cy=np.asarray(p.offset(.5))/100
        rect=[cx-iw*.53,cx+iw*.53,cy-ih*.53,cy+ih*.53]
        out=Image.new('RGB',(1200,880),(19,23,31))
        d=ImageDraw.Draw(out)
        d.text((24,14),f"{names[new['id']]} · {pf} · 取景前 / 取景后",font=font,fill='white')
        d.text((24,48),f"面片面积减少 {(1-ratio)*100:.1f}% · 粒子运动/亮度不变 · 64帧 · 青色十字=同一喷口",font=small,fill=(172,190,204))
        for i,t in enumerate([.4,.89,1.73]):
            for j,pk in enumerate([p,q]):
                im=world_image(pk,t,188,350,rect)
                x=22+(i*2+j)*197
                out.paste(im,(x,113))
                d.text((x,88),f"{t:.2f}s · {'前' if j==0 else '后'}",font=small,fill='white')
        d.text((24,480),'下排：同一 .89 秒放满单格（仅用于观察像素利用率，不能当作相同物理大小）',font=small,fill=(172,190,204))
        for i,pk in enumerate([p,q]):
            im=frame(pk,.89).resize((320,320),Image.Resampling.NEAREST)
            out.paste(im,(155+i*550,520))
            d.text((155+i*550,848),f"{'原取景' if i==0 else '新取景'}：{a if i==0 else b}",font=small,fill='white')
        out.save(O/(new['id']+'-'+pf+'-前后对照.jpg'),quality=94)
    report[new['id']]=rec

# 用户原件只能读；哈希应对应修复前基线记录，留在交付证据中。
originals=[]
baseline=json.loads((O/'默认基线前.json').read_text(encoding='utf-8'))
frozen={c['source']:c['sourceSHA256'] for c in baseline['cases'] if 'source' in c}
for folder in ['my_fxmv96inysff36h','my_fxmv9h8webs6bnz','my_fxrockettailsoft20261018']:
    for p in (R/'analysis/我的配方'/folder).glob('*.json'):
        key=p.relative_to(R).as_posix()
        sha=hashlib.sha256(p.read_bytes()).hexdigest()
        assert key in frozen and frozen[key]==sha,('用户原件变化',key)
        originals.append({'file':key,'sha256':sha,'unchanged':True})
save(O/'候选参数与导出锚点核对.json',{'effects':report,'userOriginals':originals,'UE实播':False,'note':'面片面积减少不等于纹理内存减少或实测GPU收益；固定格子与帧数不变。'})
print(json.dumps(report,ensure_ascii=False,indent=2))
