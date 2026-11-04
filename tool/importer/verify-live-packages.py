"""只读验证正式烘焙器修订；复用上游预检及回放检查，不修改产物。"""
import hashlib
import importlib.util
import json
import shutil
import tempfile
from pathlib import Path
BASE=Path(__file__).parent/'backups/20261012-codex-4969-local/prepared'
ROOT=Path('D:/ProjectTextures/FireWorksLab')
def module(name,file):
    spec=importlib.util.spec_from_file_location(name,file)
    result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result
gate=module('gate','F:/FireWorksLab/tool/local_delivery/fx_gate.py')
replay=module('replay','F:/FireWorksLab/analysis/scripts/回放检查.py')
receipts=json.loads((BASE/'live-receipts.json').read_text(encoding='utf-8-sig'))
reports=[]
for receipt in receipts:
    directory=Path(receipt['directory'])
    result=gate.check(directory,ROOT)
    assert result['ok'],result['problems']
    item={'name':receipt['name'],'revisionId':receipt['revisionId'],'gate':result,'sequenceReplay':[]}
    for package in receipt['packages']:
        source=Path(package['directory'])
        config=json.loads((source/package['configFile']).read_text(encoding='utf-8'))
        if package['platform']=='mobile':
            assert config['name']==receipt['name']+'_M' and config['tier']=='M'
            assert len(config['emitters'])==1 and config['emitters'][0]['name']=='RiseLoop'
            assert config['emitters'][0]['max_alive']==1 and not config['emitters'][0].get('gpu')
        else:
            far=next(e for e in config['emitters'] if e['name']=='TrailFar')
            assert far['required']['screen_alignment']=='Rectangle' and far['required']['local_space'] is True
            assert any(m.get('m')=='OrientationAxisLock' and m.get('flags')=='EPAL_ROTATE_Z' for m in far['modules'])
        # 检查器固定读 cascade.json；临时副本只改文件入口，配置内容原样。
        with tempfile.TemporaryDirectory(prefix='fwl-sequence-') as temporary:
            view=Path(temporary);shutil.copyfile(source/package['configFile'],view/'cascade.json')
            for texture in config['textures'].values():
                shutil.copyfile(source/texture['file'],view/texture['file'])
                assert hashlib.sha256((view/texture['file']).read_bytes()).hexdigest()==texture['sha256']
            for index,emitter in enumerate(config['emitters']):
                material=config['materials'][emitter['material']]
                key=material.get('textures',{}).get('main')
                if not key or config['textures'][key].get('class')!='flipbook':continue
                pack=replay.Pack(str(view),index);pack.label=receipt['name']+' '+package['platform']+' '+emitter['name']
                output=BASE/(receipt['name']+'-'+package['platform']+'-'+emitter['name']+'.jpg')
                report=replay.check([pack],str(output),fps=30,px=220)
                item['sequenceReplay'].append({'platform':package['platform'],'emitter':emitter['name'],'pass':report['pass'],'report':str(output.with_suffix('.json')),'fails':report['layers'][0]['fails']})
    item['pass']=result['ok'] and all(r['pass'] for r in item['sequenceReplay'])
    reports.append(item)
    print(receipt['name']+' gate=0；'+str(len(item['sequenceReplay']))+' 段序列回放 '+('通过' if item['pass'] else '未通过'),flush=True)
(BASE/'artifact-preflight.json').write_text(json.dumps(reports,ensure_ascii=False,indent=1),encoding='utf-8')
raise SystemExit(0 if all(r['pass'] for r in reports) else 1)
