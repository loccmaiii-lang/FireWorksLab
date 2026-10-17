"""从完整源快照产生独立试配；禁止修改父星或原件。"""
from pathlib import Path
import copy, hashlib, json

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'analysis/results/GLITTER_TWINKLE_20261017'
SOURCE = ROOT / 'analysis/我的配方/my_fxmv7lp8ci/金曜菊-B__fxmv7lp8ci.json'
VARIANTS = [
    ('S1', '疏点游闪（首选）', 3.0, dict(sparkPerM=1.0, sparkLife=1.35, sparkLifeJit=40,
      sparkSize=.75, twinkle=.95, twinkleHz=1.6)),
    ('S2', '保尾细闪', 4.5, dict(sparkPerM=1.8, sparkLife=1.75, sparkLifeJit=35,
      sparkSize=.60, twinkle=.9, twinkleHz=1.25)),
    ('S3', '稀簇辉闪', 2.0, dict(sparkPerM=.65, sparkLife=1.55, sparkLifeJit=45,
      sparkSize=1.1, twinkle=.8, twinkleHz=1.4, glitter=.8, glitterDelay=.38,
      glitterDelayJit=70, glitterW=.12, glitterPeak=2.2, glitterDim=.94)),
]
ALLOWED = {'sparkPerM','sparkLife','sparkLifeJit','sparkSize','twinkle','twinkleHz',
           'glitter','glitterDelay','glitterDelayJit','glitterW','glitterPeak','glitterDim',
           'frameBudget','holdTicks','autoGrid','zoom','cols','rows'}

def write(path, doc):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=1)+'\n', encoding='utf-8')

def main():
    original = SOURCE.read_bytes()
    source = json.loads(original)
    manifest = {'source':str(SOURCE.relative_to(ROOT)).replace('\\','/'),
                'sourceSha256':hashlib.sha256(original).hexdigest(),
                'baselineOverrides':{'sizePick':'cls:d:front:32'},
                'sizeEvidence':'UE实际导入37c025c83c495be09511/cascade.json：size_spec.target_m=32；用户确认保留烘焙器节奏',
                'variants':[]}
    for code, label, orange, gold in VARIANTS:
        doc = copy.deepcopy(source)
        ident = 'fxglitterb_' + code.lower()
        doc.update(id=ident, key='my:'+ident, name='金曜菊-B · '+label, at='2026-10-17',
                   base='金曜菊-B闪烁试配',tool='4.9.112',sizePick='cls:d:front:32')
        doc['snap']['name'] = doc['name']
        doc['ue'] = dict(base='GlitterChry_'+code, system='GlitterChry_'+code,
                         layers=['Lead','Gold','Head'], tiered=False, custom=True)
        doc['snap']['layers'][0]['P']['sparkPerM'] = orange
        doc['snap']['layers'][1]['P'].update(gold)
        # 原时间倍率1.5保持；源15fps在组合中为22.5fps，不产生45fps后漏帧。
        # 固定机位只更换采样取景，不更改主星/子火花轨迹和时间。
        for layer in doc['snap']['layers']:
            layer['P'].update(frameBudget='fixed', holdTicks=2,
                              autoGrid=0, zoom='off',cols=2,rows=2)
        # 引线面片较小，保留512单格且整段一张，消除极短尾分页；关键闪烁层用1024。
        doc['snap']['layers'][0]['P'].update(cols=4,rows=4)
        changes = []
        for i,(before,after) in enumerate(zip(source['snap']['layers'],doc['snap']['layers'])):
            assert before['L'] == after['L'] and before['M'] == after['M']
            keys={k for k in before['P'].keys()|after['P'].keys() if before['P'].get(k)!=after['P'].get(k)}
            assert keys <= ALLOWED, (code,keys-ALLOWED)
            changes.append({k:[before['P'].get(k),after['P'].get(k)] for k in sorted(keys)})
        recipe = {**doc, 'format':'fwl.recipe/1', 'baker':doc['tool'], 'changes':changes}
        recipepath = OUT / (code+'_'+label+'.json')
        write(recipepath, recipe)
        # 我的配方使用独立身份；原件和正式名不覆盖。
        mypath=ROOT / 'analysis/我的配方' / ('my_'+ident) / (doc['name'].replace(' · ','_')+'__'+ident+'.json')
        write(mypath, doc)
        manifest['variants'].append({'id':code,'name':doc['name'],'file':str(recipepath.relative_to(ROOT)).replace('\\','/'),
            'myRecipe':str(mypath.relative_to(ROOT)).replace('\\','/'),'system':doc['ue']['system'],'changes':changes})
    assert SOURCE.read_bytes() == original
    write(OUT/'配方清单.json',manifest)
    print(json.dumps(manifest,ensure_ascii=False,indent=1))

if __name__ == '__main__': main()
