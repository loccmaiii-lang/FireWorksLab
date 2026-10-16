"""彩千轮修订2：读取用户示例→四款环球配方→统一查看器真实导出。"""
import base64
import hashlib
import io
import json
from pathlib import Path
import sys
import subprocess
import zipfile

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'analysis/local/SparkGraph/runtime'))
from playwright.sync_api import sync_playwright
from browser_runtime import chromium_options,verify_renderer
OUT=ROOT/'analysis/results/PRISM3R2_20261016'
SOURCE=next((ROOT/'analysis/我的配方/my_fxmvaedg0go5a7u').glob('*.json'))


def recipes():
    user=json.loads(SOURCE.read_text(encoding='utf-8'));src=user['snap']['layers'][0]
    p=dict(src['P']);p.update(duration=2.65,cutOut=0,visTo=0,pattern='saturn',zoom='off',outMode='combined',
                              cols=4,rows=4,texW=2048,texH=2048,chans=4,pageTarget=1,autoGrid=0,frameMode='auto',frameBudget='motion',maxHold=2)
    # 继续使用用户的按米火花生成；每米=0时没有火花，不擅自把278误当实际生成率。
    cases=[('A','正环球芯',101,100,.68,12,18),('B','斜环密芯',237,116,.44,48,22),
           ('C','扁环疏芯',383,98,.74,66,32),('D','厚球偏环',509,108,.32,32,42)]
    return [dict(id='PRISM3-'+tag,name=name,params={**p,'seed':seed,'stars':n,'ringFrac':rf,'tilt':tilt,'speedJit':sj},
                 materialDefaults=src['M']) for tag,name,seed,n,rf,tilt,sj in cases]


def register():
    OUT.mkdir(exist_ok=True)
    (OUT/'用户基线.json').write_text(json.dumps({'path':str(SOURCE.relative_to(ROOT)),'sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
          'recipe':json.loads(SOURCE.read_text(encoding='utf-8'))},ensure_ascii=False,indent=2),encoding='utf-8')
    rs=recipes();entries=[]
    docs=[['修订2 · 用户示例与参考',[
        '以11:34保存的“万彩千轮 · 小割示例”为基线，保留1.85s燃烧、重力0.5、点火延迟0.1s、星头尺寸随机0.15和拉长1.43。现有环＋球分布做四款；原用户存档保留。',
        'A正环球芯、B斜环密芯、C扁环疏芯、D厚球偏环：环占比68/44/74/32%，倾角12/48/66/32度，星数100/116/98/108，径向离散18/22/32/42%。不是仅换种子。',
        '重新逐帧审看vidio/2.0的A/B：小割陆续展开、圆/椭圆混排，约两秒后明显稀疏淡出。按可观察的小割出生帧对齐，主爆缺失段不冒称实测。']],
       ['随机性与事件链',[
        '整发16颗星头，每颗飞行结束只开一种造型；CPU闪光＋4组CPU星头＋4组序列接收器。小割尺寸±5%、朝向0–1圈，飞行时长0.22–1.12s/初速200–280m/s随机；源序列内部还有点火、燃烧、星头大小与速度离散。',
        'A粉色、B绿色为两组固定色曲线；C/D为同一随机色族的两个造型，沿真实点灭星RGB范围。颜色不烘死在灰度贴图里。随机色生效时固定颜色曲线变灰。',
        '“四个”按四种小割素材理解，整发不是只开四朵。具体比例与色值是本轮设计候选；不把建议记成用户已确认。']],
       ['验收与导出',[
        '单独打开本组件可调原始星体参数；整体“彩千轮3.0 · 环球四造型”可调每组星头/小割/随机性、正常保存/刷新/导出事件包。',
        '<a href="../analysis/results/PRISM3R2_20261016/制作计划.md" target="_blank">制作依据</a> · <a href="../analysis/results/PRISM3R2_20261016/交付说明.md" target="_blank">本轮检查与正式包说明</a>',
        '只交PC，用户执行UE导入。浏览器回放与离线导入不等于UE实播，实际材质/Bloom/事件tick仍待引擎校准。']],
       ['原项目事件和点灭星依据',[
        'ResourceFX行“跨年烟花3.0_中型_C_彩千轮”对应原PC资产P_EFX_FireWork_PrismWheels_HD。使用2026-10-16 04:27本机对象快照，非本轮实时读回。',
        '原Main：Rate10、Burst30、Lifetime0.12–0.16s、Sphere半径8000cm，产生Spawn Main；Dark：Rate20、Burst40，同寿命/半径，产生Spawn Dark。LightGround/DarkGround各接对应Spawn、Count1、使用事件位置；SparksCloud接Main、Count50–200，但UsePSysLocation=true会回系统原点。原资产是Spawn逻辑，不能照抄成飞行末端。',
        '新结构改为飞行源的Death事件，每种造型独立事件名，接收Count1、UsePSysLocation=false、继承速度0.35。LOD专用EventGenerator引用与Modules里的同对象不是两个生成器。',
        '真实点灭星是InitialColor_Seeded：线性RGB独立范围R0.015148–1、G0–0.42806、B0–1；InitialSize X9500–10500、YZ0，Square取X，等于基准±5%。本次沿用范围和尺寸比例，未冒称复刻Seeded运行序列。',
        '<a href="../analysis/results/PRISM3_20261016/现有粒子参数.json" target="_blank">原发射器/事件/点灭星完整参数记录</a> · <a href="https://dev.epicgames.com/documentation/en-us/unreal-engine/event-modules?application_version=4.27" target="_blank">Epic事件模块文档</a>']]]
    for r in rs:
        entries.append(dict(id=r['id'],date='2026-10-16 23:00',name='彩千轮3.0 · '+r['name']+'（修订2）',base='botan',p=r['params'],m=r['materialDefaults'],
          note='环形＋球形小割，沿用户示例迭代；整体中带随机尺寸与朝向。',tags='彩千轮 环球 小割 修订2',doc=docs,
          video='vidio/2.0/万彩千轮A.mp4',vmeta={'v':7,'t0':23/30,'cx':2040/2560,'cy':565/1440,'half':75/1440,'aspect':2560/1440},
          opinion='待完成同候选检查；未用户验收。'))
    colors=[[[0,'#ff78b0'],[1.05,'#ff78b0'],[1.6,'#ff8660'],[2.3,'#ffb96a']],
            [[0,'#97ff76'],[1.1,'#97ff76'],[1.75,'#d9e76f'],[2.3,'#ffba65']]]
    layers=[]
    for i,r in enumerate(rs):
        event=dict(count=4,seed=1101+i*971,flight=[.22,1.12],speed=[200,280],drag=4,gravity=1,
                   inherit=.35,childDrag=1.6,childGravity=.2,sizeJit=.05,rotation=1,
                   color='fixed' if i<2 else 'random',colorMin=[.015148,0,0],colorMax=[1,.42806,1],
                   headSize=[.95,1.05],headColor='#ffb060',flash=i==0,flashLife=.12,flashSize=10,flashAlpha=.5)
        layers.append(dict(m='rep:'+r['id'],title=r['name'],scale=1,rate=1,delay=0,eventSpawn=event,
           stages=colors[i] if i<2 else [[0,'#ffffff']],out={'pc':'seq','mobile':'off','mobileManual':True}))
    combo=dict(id='PRISM3',date='2026-10-16 23:00',name='彩千轮3.0 · 环球四造型（修订2）',layers=layers,
               layerNames=[r['name'] for r in rs],doc=docs,note='CPU闪光→飞行星头→Death事件小割；4种序列、16朵，正常入口同参导出。',
               video='vidio/2.0/万彩千轮A.mp4',vmeta={'v':7,'t0':0,'cx':.7328,'cy':.3201,'half':.2067,'aspect':2560/1440},
               tags='彩千轮3.0 CPU 事件 环形 球形 修订2',opinion='制作中，检查通过后才更新待验收。')
    (ROOT/'analysis/原理/条目_彩千轮3.json').write_text(json.dumps({'entries':entries,'combos':[combo]},ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
    (OUT/'四造型配方.json').write_text(json.dumps({'entries':entries,'combo':combo},ensure_ascii=False,indent=2),encoding='utf-8')
    sp=ROOT/'协作/状态清单.json';s=json.loads(sp.read_text(encoding='utf-8'));e=next(x for x in s['effects'] if x['key']=='wancai')
    e.update(主条目='PRISM3',工作版='PRISM3',阶段='制作中',英文名='PrismWheels3',层英文名=['RingCore','TiltCore','FlatCore','SphereRing'],
       方案=[dict(id=r['id'],label=r['name']+'（修订2）',en=r['id'][-1]) for r in rs],
       下一步='修订2：按用户环形示例完成环球四造型、整体事件入口、同候选检查与独立复核后更新待验收；参考直接使用vidio/2.0 A/B，不再要求用户找文件。',
       说明='用户11:34环形小割存档为基线，PRISM3整体＋A/B/C/D四造型；PC专用。旧ZW5参数保留在历史数据。',
       缺=['修订2自检和独立复核','UE实播（用户执行导入）'])
    sp.write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    subprocess.run([sys.executable,str(ROOT/'analysis/scripts/review_to_baker.py')],cwd=ROOT,check=True)
    print('已在原PRISM3候选登记四造型和整体')


def export():
    with sync_playwright() as p:
        with p.chromium.launch(channel='msedge',headless=True,**chromium_options()) as b:
            pg=b.new_page(viewport={'width':1600,'height':1100},accept_downloads=True)
            pg.on('console',lambda msg:print('浏览器',msg.text[:600],flush=True) if msg.type=='error' else None)
            pg.on('pageerror',lambda e:print('页面错误',str(e),flush=True))
            pg.goto((ROOT/'tool/FireworkBaker.html').as_uri()+'?fast',wait_until='domcontentloaded');pg.wait_for_function('window.__fw')
            gpu=verify_renderer(pg.evaluate("()=>{const g=document.createElement('canvas').getContext('webgl2');return g.getParameter(g.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL)}"))
            expanded=[]
            for r in recipes():
                expanded.append(pg.evaluate('(id)=>({id,...replicaPM(id),entry_ver:entryVer(FW_REVIEW_LIST.find(e=>e.id===id))})',r['id']))
                data=pg.evaluate('''async id=>{const x=replicaPM(id);const a=await __fw.exportFiles(x.P,x.M,'PrismWheels3_'+id.slice(-1),{size:'none'});
                  let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s)}''',r['id'])
                target=OUT/'组件'/r['id'];target.mkdir(parents=True,exist_ok=True)
                zipfile.ZipFile(io.BytesIO(base64.b64decode(data))).extractall(target)
                print('组件',r['id'],'已真实导出',flush=True)
            (OUT/'已展开配方.json').write_text(json.dumps(expanded,ensure_ascii=False,indent=2),encoding='utf-8')
            pg.evaluate("()=>{document.querySelector('#deliveryDestination').value='zip';openReview(FW_REVIEW_LIST.find(e=>e.id==='PRISM3'));}")
            pg.wait_for_function("state.tab==='combo' && state.layers.length===4 && wbIdle()",timeout=60000)
            expected=json.loads((ROOT/'analysis/原理/条目_彩千轮3.json').read_text(encoding='utf-8'))['combos'][0]['layers']
            assert pg.evaluate('state.layers.map(L=>L.eventSpawn)')==[L['eventSpawn'] for L in expected], '烘焙器审阅数据还未重新生成，禁止导出旧配置'
            errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
            with pg.expect_download(timeout=45000) as dl:
                pg.locator('#abExportPack').click()
                pg.wait_for_timeout(1500)
                pg.screenshot(path=str(OUT/'导出入口检查.png'))
            z=dl.value;z.save_as(OUT/'PrismWheels3_R2.zip')
            with zipfile.ZipFile(OUT/'PrismWheels3_R2.zip') as pack:pack.extractall(OUT/'正式包')
            (OUT/'导出环境.json').write_text(json.dumps({'version':pg.evaluate('VERSION'),'gpu':gpu,'errors':errs,
               'entry_ver':pg.evaluate('entryVer(FW_REVIEW_LIST.find(e=>e.id==="PRISM3"))'),'name':z.suggested_filename},ensure_ascii=False,indent=2),encoding='utf-8')
            print('正常按钮已导出整发事件包',z.suggested_filename,flush=True)


if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='export':export()
    else:register()
