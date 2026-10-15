"""G106已提交回包只读审看数据；不重新渲染、不读取本机私有素材包。"""
from pathlib import Path
import datetime
import hashlib
import json
import re
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
RESULTS = ROOT / 'analysis/results'
BASE_HEAD = 'c852fb110976677be9b724542d11122aacada7cd'


def read(p):
    return json.loads(Path(p).read_text(encoding='utf-8'))


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def canon_sha(obj):
    return hashlib.sha256(json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def contract(config, declared):
    checks = []
    for key, tex in config['textures'].items():
        checks.append({'check': key + ':完整资产名及大小写', 'pass': bool(re.fullmatch(r'T_EFX_FireWorks_[A-Za-z][A-Za-z0-9_]*', tex['asset'])) and Path(tex['file']).stem == tex['asset'], 'asset': tex['asset'], 'file': tex['file'], 'sha256DeclaredOnly': tex.get('sha256')})
        checks.append({'check': key + ':清单已列出', 'pass': tex['file'] in declared})
    for material in config['materials'].values():
        checks.append({'check': '材质贴图键引用可解', 'pass': all(v in config['textures'] for v in material.get('textures', {}).values())})
    for emitter in config['emitters']:
        checks.append({'check': '发射器材质引用可解', 'pass': emitter['material'] in config['materials']})
        if emitter['required'].get('cutout'):
            checks.append({'check': 'Cutout引用可解', 'pass': emitter['required']['cutout'] in config['textures']})
    return checks


def main():
    standard = read(RESULTS / 'NFS-SG-G106/标准检查.json')
    steps = read(RESULTS / 'NFR-SG-G106/步骤.json')
    audited = []
    inputs = {}
    for task, entry, name in [('NFE-SGR1-G106', 'SGR1', 'RocketTail_Graph'), ('NFE-SGS1-G106', 'SGS1', 'Sparkler_Graph')]:
        p = RESULTS / task
        files = {'pcMeta': p / (name + '.json'), 'mobileMeta': p / (name + '_Mobile.json'), 'pcCascade': p / (name + '_cascade.json'), 'mobileCascade': p / (name + '_cascade_mobile.json'), 'manifest': p / '导出清单.json', 'sample': p / '烘焙回放_采样.json', 'replay': p / '回放检查.json', 'fullReplay': RESULTS / 'NFR-SG-G106' / (name + '.json')}
        docs = {k: read(v) for k, v in files.items()}
        for v in files.values():
            inputs[str(v.relative_to(ROOT)).replace('\\', '/')] = sha(v)
        pc, mobile = docs['pcMeta'], docs['mobileMeta']
        pcm, mobm = docs['pcCascade'], docs['mobileCascade']
        manifest = docs['manifest']
        target_std = standard['items'][entry]
        declared = manifest['packages'][0]['files']
        deltas = {k: [pc['params'].get(k), mobile['params'].get(k)] for k in set(pc['params']) | set(mobile['params']) if pc['params'].get(k) != mobile['params'].get(k)}
        checks = contract(pcm, declared) + contract(mobm, declared)
        version_same = manifest['entry'] == entry and manifest['ver'] == docs['sample']['ver'] == target_std['ver']
        source_same = pcm['source'] == mobm['source'] and pcm['source']['tool'] == pc['tool'] == mobile['tool'] == '烟花母版烘焙器 4.9.106'
        # 这里检查仓库内能核的引用、元数据和已返回报告；原PNG/ZIP明确没有提交。
        assert version_same and source_same
        assert all(x['pass'] for x in checks)
        assert set(deltas) == {'texW', 'texH'}
        assert target_std['pass'] and all(c[1] for c in target_std['checks'])
        assert docs['replay']['pass'] and docs['fullReplay']['pass']
        assert docs['replay']['layers'] == docs['fullReplay']['layers']
        assert all(read(RESULTS / x / 'done.json')['ok'] for x in [task, 'NFR-SG-G106', 'NFS-SG-G106'])
        assert pcm['emitters'] == mobm['emitters'] and pcm['materials'] == mobm['materials']
        pictures = []
        for file in [p / '烘焙回放.jpg', p / '烘焙回放_原尺寸.jpg', p / '回放检查.jpg', RESULTS / 'NFR-SG-G106' / (name + '.jpg')]:
            with Image.open(file) as im:
                size = list(im.size)
            pictures.append({'file': str(file.relative_to(ROOT)).replace('\\', '/'), 'sha256': sha(file), 'dimensions': size, 'humanVisibleInspectionByAI': True, 'notesIn': '看法.md：静态图片观察表'})
        layer = docs['replay']['layers'][0]
        uploaded = []
        not_uploaded = []
        aliases = {'cascade.json': name + '_cascade.json', 'cascade_mobile.json': name + '_cascade_mobile.json'}
        for file in declared:
            fp = p / aliases.get(file, file)
            if fp.is_file():
                uploaded.append(file)
            else:
                not_uploaded.append(file)
        audited.append({'entry': entry, 'name': name, 'task': task, 'versionFingerprint': manifest['ver'], 'parameterSHA256Canonical': {'pc': canon_sha(pc['params']), 'mobile': canon_sha(mobile['params'])}, 'tool': pc['tool'], 'cascadePlanSig': pcm['source']['plan_sig'], 'versionFingerprintMatchesManifestSampleStandard': version_same, 'sourceMatchesPCMobile': source_same, 'parameterDifferences': deltas, 'textureGrid': {'pc': pc['texture'], 'mobile': mobile['texture']}, 'cascadeFormat': {'pc': pcm['format'], 'mobile': mobm['format']}, 'cascadeNames': {'pc': pcm['name'], 'mobile': mobm['name']}, 'emitterAndMaterialPCMobileSame': True, 'emittersPerPlatform': len(pcm['emitters']), 'cpuEmitters': sum(not e.get('gpu', False) for e in pcm['emitters']), 'durationS': pc['duration'], 'declaredFiles': declared, 'metadataActuallyCommitted': uploaded, 'filesNotCommitted': not_uploaded, 'namingAndReferences': checks, 'standardTarget': target_std, 'replay': {'pass': docs['replay']['pass'], 'fullReplayPass': docs['fullReplay']['pass'], 'sameLayerMetrics': True, 'sampleTimesS': docs['fullReplay']['sample_times_s'], 'shownFrac': layer['shown_frac'], 'edgeMax': layer['edge_max'], 'saturatedMax': layer['saturated_max'], 'emptyMid': layer['empty_mid'], 'emptyTail': layer['empty_tail'], 'backJumps': layer['back_jumps'], 'jitterApplies': layer['jitter_applies'], 'loopWraps': layer['loop_wraps'], 'loopSeamPx512': layer['loop_seam_px512']}, 'bakerSelfCheckDifferentDefinition': {'maxClip': pc['selfCheck']['maxClip'], 'clipFramesCount': len(pc['selfCheck']['clipFrames']), 'seamRatio': pc['selfCheck']['seam'], 'definition': '50_bake.js:312/320：>=253像素占非零采样像素；回放检查.py:203：>=250占整格像素，分母不同，不能直接混比'}, 'images': pictures})
    for task in ['NFE-SGR1-G106', 'NFE-SGS1-G106', 'NFR-SG-G106', 'NFS-SG-G106']:
        for file in ['done.json', 'env.json', 'log.txt']:
            fp = RESULTS / task / file
            inputs[str(fp.relative_to(ROOT)).replace('\\', '/')] = sha(fp)
    inputs['analysis/results/NFS-SG-G106/标准检查.json'] = sha(RESULTS / 'NFS-SG-G106/标准检查.json')
    result = {'format': 'df.g106-review/1', 'at': datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(timespec='seconds'), 'sourceHead': BASE_HEAD, 'conclusion': '两包已提交元数据的命名/PC手机契约一致，目标标准与回放记录通过；8张静态图片已审，无明显裁切/矩形边/贯穿条纹。原PNG实包、RocketDot、亲眼连续播放与UE缺证据，未替用户验收。', 'status': {'execution': '本条只读检查执行结束', 'AI': '在本报告限定证据范围内通过，未测项保留', 'userAcceptance': '未做'}, 'inputsSHA256': inputs, 'packages': audited, 'fullReplaySteps': steps, 'limitations': ['原PNG和_检查目录实体按导出日志留在本机analysis/local、没有进Git；无法复算声明贴图SHA256或证明物理包完整，不能把清单引用通过写成实物齐全。', '本批只有SGR1/SGS1预设，不含用户dc97b485血缘的RocketDot存档重新导出，未核其手机Ramp错误是否在用户实际路径消失。', 'NFR元数据没有独立参数指纹，任务后缀G106/22:32日志/同名层指标与NFE吻合，但不构成贴图原文件的独立密码学同版证明。', '回放记录是PC512格逐帧检查和7时刻接触表；手机256格有契约与标准记录，没有单独手机回放像素报告。', 'loop_wraps=0且loop_seam_px512=null，没有实测跨循环；烘焙器selfCheck.seam是另一种相邻帧缩略特征差比，不能充当循环播放验收。', '连续播放、UE跟随朝向/压缩/Bloom/世界尺度、0.98是否被导入器覆写和用户审美未测。']}
    (OUT / '核对.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'packages': [{'entry': r['entry'], 'version': r['versionFingerprint'], 'standard': r['standardTarget']['pass'], 'replay': r['replay']['pass'], 'contractChecks': len(r['namingAndReferences']), 'picturesSeen': len(r['images']), 'notCommitted': r['filesNotCommitted']} for r in audited], 'status': result['status']}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
