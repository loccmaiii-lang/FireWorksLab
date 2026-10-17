"""只整理本任务已通过检查的文件，记录实际ZIP和完整配方指纹。"""
from pathlib import Path
import hashlib,json,shutil,subprocess

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'analysis/results/GLITTER_TWINKLE_20261017'
DELIVER=Path('F:/FireWorksLab/outputs/金曜菊B闪烁试配_20261017')

def read(p):return json.loads(p.read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,j):p.write_text(json.dumps(j,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')

def main():
    man=read(OUT/'配方清单.json');checks=read(OUT/'素材检查汇总.json');review=read(OUT/'连续播放检查.json')
    assert checks['pcPass'] and checks['standardProbePass']
    assert len(review['reports'])==3 and not review['errors']
    assert sha(ROOT/man['source'])==man['sourceSha256']
    # 从原始只读快照取必要数值；不发布场景坐标、脏包/选择集等私有调试快照。
    ue=read(OUT/'UE_当前资产.json');scene=read(OUT/'UE_只读场景.json')
    rows=[]
    for r in ue['rows']:
        if r['name'] not in ['L1_Main','L2_Main','L3_Main']:continue
        d={m['class']:m for m in r['mods']}
        life=d['ParticleModuleLifetime']['distributions'][0]['props']['Constant']
        size=d['ParticleModuleSize']['distributions'][0]['props']['Constant']
        rows.append(dict(name=r['name'],enabled=r['enabled'],size_m={k:size[k]/100 for k in ['X','Y']},
                         lifetimeDistributionConstant_s=life,duration_s=r['required']['EmitterDuration'],delay_s=r['required']['EmitterDelay']))
    source_file=Path(ue['imports'][0]['files'][0]).parent/'cascade.json'
    source=read(source_file)
    write(OUT/'UE_尺寸节奏核实.json',dict(readOnly=True,asset=ue['asset'],importRevision='37c025c83c495be09511',
      importedSizeSpec=source.get('size_spec'),mainEmitters=rows,
      actorAndComponentScale=[dict(actorScale=x['actorScale'],componentScale=x['relativeScale']) for x in scene['instances']],
      distanceToEditorCamera_m=[x['distanceToEditorCamera_m'] for x in scene['instances']],gameCameraMeasured=False,
      timingDecision='用户明确选择烘焙器金曜菊-B原节奏，层rate=1.5；本轮未改UE',
      rawEvidenceSha256=dict(asset=sha(OUT/'UE_当前资产.json'),scene=sha(OUT/'UE_只读场景.json'),importedCascade=sha(source_file))))
    bundle=[]
    full=DELIVER/'完整我的效果';full.mkdir(exist_ok=True)
    for v in man['variants']:
        verified=read(OUT/(v['id']+'_验证.json'));z=DELIVER/(v['system']+'.zip')
        assert sha(z)==verified['zipSha256'] and verified['refreshSaved']
        # 沿用验证器的JS序列化；Python会把1.0与小指数写成不同文本，不能直接混算指纹。
        js="process.stdout.write(require('node:crypto').createHash('sha256').update(JSON.stringify(JSON.parse(require('node:fs').readFileSync(process.argv[1],'utf8')).snap)).digest('hex'))"
        expected=subprocess.check_output(['node','-e',js,str(ROOT/v['myRecipe'])],text=True).strip()
        assert expected==verified['recipeHash']
        assert any(x['id']==v['id'] and x['nativeFileImport'] and x['parametersIdentical'] for x in review['reports'])
        shutil.copy2(ROOT/v['myRecipe'],full/Path(v['myRecipe']).name)
        shutil.copy2(ROOT/v['file'],DELIVER/Path(v['file']).name)
        bundle.append(dict(id=v['id'],name=v['name'],myRecipe=v['myRecipe'],recipe=Path(v['file']).name,
          zip=z.name,zipBytes=z.stat().st_size,zipSha256=sha(z),recipeHash=expected,
          pcChecksPassed=True,mobileArtComplete=False,ueCandidatePlaybackVerified=False,userArtAccepted=False))
    write(OUT/'交付清单.json',dict(tool='4.9.112',sourceSha256=man['sourceSha256'],preferred='S1',items=bundle))
    # 与报告中的相对链接一致，复制检查摘要和最终审看图，不复制大贴图目录。
    files=['配方清单.json','交付清单.json','UE_尺寸节奏核实.json','标准检查.json','素材检查汇总.json','计算结果.json',
      '主星逐步一致.json','导出汇总.json','连续播放检查.json','运行环境.json',
      '四版同尺度_1.20秒.jpg','四版同尺度时序.jpg','参考与三配方.jpg','连续播放整体与局部.jpg','图4与稀簇辉闪.jpg']
    for v in man['variants']:files.extend(v['id']+suffix for suffix in ['_验证.json','_回放检查.json','_手机回放检查.json'])
    for name in files:shutil.copy2(OUT/name,DELIVER/name)
    shutil.copy2(OUT/'看法.md',DELIVER/'使用说明.md')
    print(json.dumps(bundle,ensure_ascii=False,indent=1))

if __name__=='__main__':main()
