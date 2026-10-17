"""定点部署预览条目；先备份，保留F盘所有他方条目和工作区改动。"""
from pathlib import Path
import copy,hashlib,json,shutil,subprocess,sys
from datetime import datetime,timezone,timedelta
from register_preview import ROOT,OUT,KEY,ENTRY

LIVE=Path('F:/FireWorksLab')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def var(text,name):
    start=text.index('var '+name+' = ')+len('var '+name+' = ')
    value,length=json.JSONDecoder().raw_decode(text[start:])
    return value,(start,start+length)
def set_var(text,name,value):
    _,(a,b)=var(text,name);return text[:a]+json.dumps(value,ensure_ascii=False,indent=0)+text[b:]
def owned(x):return str(x.get('id','')).startswith('GLB-S')

def main():
    stamp=datetime.now(timezone(timedelta(hours=8))).strftime('%Y%m%d_%H%M%S')
    backup=LIVE/'outputs/金曜菊B闪烁试配_20261017/预览接入备份'/stamp;backup.mkdir(parents=True)
    files=[ENTRY,'协作/状态清单.json','协作/状态清单.md','spec/尺寸标定.json','tool/data/review.js','tool/data/size_spec.js']
    protected=['.gitignore','analysis/scripts/网格垂柳_UE/run.mjs','analysis/scripts/网格垂柳_生成.mjs',
               '对话记录/对话框网格垂柳.md','tool/FireworkBaker.html']
    protected+=['tool/src/js/'+p.name for p in (LIVE/'tool/src/js').glob('*.js')]
    hashes={x:sha(LIVE/x) for x in protected}
    for rel in files:
        p=LIVE/rel
        if p.is_file():q=backup/rel;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q)
    before_status=read(LIVE/'协作/状态清单.json');before_spec=read(LIVE/'spec/尺寸标定.json')
    old=(LIVE/'tool/data/review.js').read_text(encoding='utf-8')
    old_items,_=var(old,'FW_REVIEW');old_effects,_=var(old,'FW_EFFECTS')
    subprocess.run([sys.executable,'-X','utf8',str(ROOT/'analysis/scripts/金曜菊B闪烁试配/register_preview.py'),'--root',str(LIVE)],check=True)
    subprocess.run([sys.executable,'-X','utf8','analysis/scripts/review_to_baker.py'],cwd=LIVE,check=True)
    generated=(LIVE/'tool/data/review.js').read_text(encoding='utf-8')
    new_items,_=var(generated,'FW_REVIEW');new_effects,_=var(generated,'FW_EFFECTS')
    old_by={x['id']:x for x in old_items if not owned(x)};new_by={x['id']:x for x in new_items}
    changed=[k for k,v in old_by.items() if new_by.get(k)!=v]
    changed_effects=[x['key'] for x in old_effects if x['key']!=KEY and next((y for y in new_effects if y['key']==x['key']),None)!=x]
    overlay=bool(changed or changed_effects)
    if overlay:
        # 公共生成器可能顺带更新其他任务的磁盘状态；本次仅发布本任务的生成结果。
        # 其余记录原样保留，后续负责人仍可按自己源数据全量生成。
        ours=[x for x in new_items if owned(x)];our_effect=[x for x in new_effects if x['key']==KEY]
        assert len(ours)==12 and len(our_effect)==1
        final=set_var(old,'FW_REVIEW',ours+[x for x in old_items if not owned(x)])
        final=set_var(final,'FW_EFFECTS',our_effect+[x for x in old_effects if x['key']!=KEY])
        (LIVE/'tool/data/review.js').write_text(final,encoding='utf-8')
    after=(LIVE/'tool/data/review.js').read_text(encoding='utf-8');items,_=var(after,'FW_REVIEW');effects,_=var(after,'FW_EFFECTS')
    assert all(next((y for y in items if y['id']==x['id']),None)==x for x in old_items if not owned(x))
    assert all(next((y for y in effects if y['key']==x['key']),None)==x for x in old_effects if x['key']!=KEY)
    status=read(LIVE/'协作/状态清单.json');clean=copy.deepcopy(status);clean['effects']=[x for x in clean['effects'] if x['key']!=KEY]
    original=copy.deepcopy(before_status);original['effects']=[x for x in original['effects'] if x['key']!=KEY];assert clean==original
    spec=read(LIVE/'spec/尺寸标定.json');spec['map'].pop(KEY,None);before_spec['map'].pop(KEY,None);assert spec==before_spec
    assert all(sha(LIVE/x)==v for x,v in hashes.items()),'其他会话文件发生变化，先核实'
    # 条目中的审看图与说明也部署到同一路径，无需用户复制文件。
    for p in OUT.iterdir():
        if not p.is_file() or p.suffix.lower() not in ['.jpg','.json','.md']:continue
        if p.name in ['UE_当前资产.json','UE_只读场景.json']:continue
        dest=LIVE/'analysis/results/GLITTER_TWINKLE_20261017'/p.name;dest.parent.mkdir(parents=True,exist_ok=True)
        if dest.exists() and sha(dest)!=sha(p):
            b=backup/'analysis/results/GLITTER_TWINKLE_20261017'/p.name;b.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(dest,b)
        shutil.copy2(p,dest)
    report=dict(deployed=True,entry=ENTRY,effect=KEY,variants=['GLB-S1','GLB-S2','GLB-S3'],
      backup=str(backup),preservedPreviousEntries=len(old_items),preservedPreviousEffects=len(old_effects),
      protectedFiles=len(hashes),incrementalGeneratedOverlay=overlay,
      note='只发布本任务生成条目；未操作被策略阻止的file页面、用户浏览器存储或UE。')
    (OUT/'预览部署.json').write_text(json.dumps(report,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))

if __name__=='__main__':main()
