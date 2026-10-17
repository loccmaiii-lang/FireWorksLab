"""把已验证的三份配方登记到现有效果列表；不修改配方或烘焙器源码。"""
from pathlib import Path
import argparse,copy,json

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'analysis/results/GLITTER_TWINKLE_20261017'
KEY='glitterb_twinkle_trial'
ENTRY='analysis/原理/条目_金曜菊B闪烁试配.json'

def read(p):return json.loads(p.read_text(encoding='utf-8'))
def add_map(path,key,value):
    # 只添加这一个映射，不改既有标定数字和其他会话内容。
    text=path.read_text(encoding='utf-8');doc=json.loads(text)
    if key in doc['map']:
        assert doc['map'][key]==value;return
    needle='"map": {';assert needle in text
    text=text.replace(needle,needle+'\n    '+json.dumps(key)+': '+json.dumps(value)+',',1)
    assert json.loads(text)['map'][key]==value
    path.write_text(text,encoding='utf-8')

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=ROOT);args=ap.parse_args();target=args.root.resolve()
    man=read(OUT/'配方清单.json');entries=[];combos=[];variants=[]
    for v in man['variants']:
        doc=read(ROOT/v['myRecipe']);cid='GLB-'+v['id'];layers=[];names=[]
        for i,layer in enumerate(doc['snap']['layers']):
            lid=cid+'-L'+str(i+1);title=layer['L']['title'];names.append(title)
            entries.append(dict(id=lid,date='2026-10-17',name=v['name']+' · '+title,base=layer['type'],
                                p=copy.deepcopy(layer['P']),m=copy.deepcopy(layer['M']),tags='金曜菊 闪烁 PC试配'))
            # src优先走原生独立参数入口，避免replicaPM延长旧存档duration的自动规则。
            runtime={k:copy.deepcopy(x) for k,x in layer['L'].items() if k!='lib'}
            runtime.update(m='rep:'+lid,src=dict(type=layer['type'],P=copy.deepcopy(layer['P']),M=copy.deepcopy(layer['M'])))
            layers.append(runtime)
        combos.append(dict(id=cid,task='GLITTER_TWINKLE_20261017',date='2026-10-17',name=v['name'],layers=layers,layerNames=names,
          note='32m花径，原倍率1.5；PC试配可预览，手机自动方案缺金锦尾与星头，未正式验收。',
          look=['在引擎回放中比较0.8–2.2秒的亮点、暗隙与尾部持续时间。','保持原版展开、下垂和整体速度。'],
          doc=[['本次预览',['32m花径，保持金曜菊-B原主星动态和层倍率1.5。','PC标准及回放已通过；手机完整表现与UE实播尚未完成。']]],
          images=[['analysis/results/GLITTER_TWINKLE_20261017/四版同尺度_1.20秒.jpg','原版与三套同尺度'],
                  ['analysis/results/GLITTER_TWINKLE_20261017/连续播放整体与局部.jpg','连续播放整体与局部']]))
        variants.append(dict(id=cid,label=v['name'].split(' · ')[-1],en=v['id']))
    dest=target/ENTRY;dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(dict(说明='由register_preview.py从已验证完整快照生成；通过既有条目链进入制作中，不代表用户通过。',entries=entries,combos=combos),ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
    status=target/'协作/状态清单.json';text=status.read_text(encoding='utf-8');state=json.loads(text)
    ef=dict(key=KEY,名='金曜菊-B · 闪烁三方案',英文名='GlitterChry',层英文名=['Lead','Gold','Head'],负责='金曜菊闪烁（Codex）',阶段='制作中',主条目='GLB-S1',工作版='GLB-S1',方案=variants,
      进度={'计算':True,'AI自检':True,'素材导出':True,'用户验收':False},
      说明='PC试配预览：S1疏点游闪（首选）、S2保尾细闪、S3稀簇辉闪；32m花径与原节奏。PC标准/素材回放已过；手机缺两关键层、UE实播及用户艺术验收未完成。',
      下一步='展开制作中，点击本条目下的三方案切换，在引擎回放中预览；原金曜菊-B不覆盖。',
      缺=['手机完整闪烁方案','新配方UE实播','用户艺术验收'])
    existing=next((x for x in state['effects'] if x['key']==KEY),None)
    if existing:assert existing==ef,'本条目已有不同修改，不覆盖'
    else:
        needle='"effects": [';assert needle in text
        block='\n'.join('    '+line for line in json.dumps(ef,ensure_ascii=False,indent=2).splitlines())
        text=text.replace(needle,needle+'\n'+block+',',1);status.write_text(text,encoding='utf-8')
    spec=target/'spec/尺寸标定.json';assert read(spec)['specs']['F_SILVER']['diameter_m']==32
    add_map(spec,KEY,'F_SILVER')
    print('已登记',KEY,'GLB-S1/S2/S3；复用F_SILVER=32m，不改既有标定。')

if __name__=='__main__':main()
