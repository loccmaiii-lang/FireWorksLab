"""派活 T12 的可复现离线检查；生产输入只读，不接 UE、GPU 或发布入口。"""
import collections
import copy
import datetime
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
BASE = ROOT / 'FXtools/节目/NewYearFireWorks_v01'
SOURCE_HEAD = 'c852fb110976677be9b724542d11122aacada7cd'
NAME = 'B08修订7-中配扇不多于B05'
QUALITIES = {'EQuality_VeryLow': 0, 'EQuality_Low': 1, 'EQuality_Medium': 2, 'EQuality_High': 3, 'EQuality_Epic': 4}
TIERS = [('高', 3, 'high'), ('中', 2, 'medium'), ('低', 0, 'low')]
PLATFORMS = [('PC', 12, 'pc'), ('手游', 2, 'mobile')]


def read(p):
    return json.loads(Path(p).read_text(encoding='utf-8'))


def write(p, value):
    Path(p).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def accepted(f, platform, tier):
    f = f or {}
    return (f.get('PlatformFlags') is None or bool(f['PlatformFlags'] & platform)) and QUALITIES.get(f.get('MinQualityLevel'), 0) <= tier


def expand(table, platform, tier):
    """展开每级过滤，连位置/缩放一起保存，三表比较不只比较计数。"""
    subs = {s['TemplateName']: s for s in table['EffectSubTemplates']}
    templates = {t['TemplateName']: t for t in table['EffectTemplates']}
    rows = []
    for gi, group in enumerate(table['EffectScheduleGroups']):
        if not accepted(group.get('Filter'), platform, tier):
            continue
        for si, slot in enumerate(group['Slots']):
            template = templates[slot['TemplateName']]
            if not all(accepted(x.get('Filter'), platform, tier) for x in (slot, template)):
                continue
            for ei, entry in enumerate(template['Entries']):
                if not accepted(entry.get('Filter'), platform, tier):
                    continue
                sub = subs.get(entry.get('SubTemplateName'))
                if sub is None:
                    raise AssertionError('未覆盖的父模板直接资源入口：' + repr(entry))
                if not accepted(sub.get('Filter'), platform, tier):
                    continue
                for xi, x in enumerate(sub['Entries']):
                    if not accepted(x.get('Filter'), platform, tier) or not x.get('FXResourceId'):
                        continue
                    rows.append({'resourceId': x['FXResourceId'], 'time': round(slot['StartTime'] + entry.get('LocalTimeOffset', 0) + x.get('LocalTimeOffset', 0), 6), 'group': group['GroupName'], 'point': entry.get('SlotIndex'), 'effectScale': [entry.get('EffectScale'), x.get('EffectScale')], 'position': [entry.get('PositionOffset'), x.get('PositionOffset')], 'rotation': [entry.get('RotationOffset'), x.get('RotationOffset')], '_fanEvent': [gi, si, ei]})
    return rows


def category(r):
    if 'Fan' in r or 'Comet_Layers' in r or 'Silver_Layers' in r:
        return '扇束'
    if 'Trail' in r:
        return '尾缀'
    if 'Little' in r:
        return '小平台花'
    return '坝顶球花'


def comparable(rows):
    def numbers(x):
        if isinstance(x, dict):
            return {k: numbers(v) for k, v in x.items()}
        if isinstance(x, list):
            return [numbers(v) for v in x]
        if isinstance(x, (int, float)) and not isinstance(x, bool):
            return round(float(x), 6)
        return x
    return collections.Counter(json.dumps(numbers({k: v for k, v in r.items() if k != '_fanEvent'}), sort_keys=True, ensure_ascii=False) for r in rows)


def describe(rows, census, readouts):
    c = collections.Counter(category(r['resourceId']) for r in rows)
    c['扇发'] = len({tuple(r['_fanEvent']) for r in rows if category(r['resourceId']) == '扇束'})
    c['合计资源调用'] = len(rows)
    old_gpu, actual_gpu = collections.Counter(), collections.Counter()
    legacy_particles, read_particles = collections.Counter(), collections.Counter()
    missing = set()
    for row in rows:
        rid, t = row['resourceId'], row['time']
        resource = census.get(rid)
        if not resource or not resource.get('FxSP'):
            missing.add(rid)
            continue
        gpu = resource['FxSP'].get('gpu', 0)
        actual_gpu[int(t)] += gpu
        if 'Fan' not in rid:
            old_gpu[int(t)] += gpu
        if category(rid) == '扇束':
            silver = 'Silver' in rid
            life = 2.6 if silver else 3.7
            for k in range(int(t * 10), int((t + life) * 10)):
                legacy_particles[k] += 55 if silver else 45
            rr = readouts.get(rid)
            if rr:
                # 保守矩形占用：每束全部颗粒按系统最大寿命同时存在；不是实际活跃颗粒实测。
                for k in range(int(t * 10), int((t + rr['lifeMax']) * 10)):
                    read_particles[k] += rr['particles']
    def peak(counter, denominator=1):
        mx = max(counter.values(), default=0)
        return {'value': mx, 'at': sorted(round(k / denominator, 2) for k, v in counter.items() if v == mx) if mx else []}
    return {'counts': dict(c), 'gpuSameSecondFanZero': peak(old_gpu), 'gpuSameSecondCensus': peak(actual_gpu), 'fanParticleLegacyEstimate': peak(legacy_particles, 10), 'fanParticleReadoutRectangleUpperEstimate': peak(read_particles, 10), 'missingCensus': sorted(missing)}


def main():
    cloud_path = ROOT / 'tool/workbench/public/data/cloud-latest.json'
    archive = ROOT / f'FXtools/节目/云端最新/16.0.43-{NAME}.dfshow'
    source = BASE / f'NewYearFireWorks_v01-{NAME}.dfshow'
    table_path = BASE / f'导演表-{NAME}-一张表.json'
    base_path = BASE / '导演表-B05-ResourceFX新命名-手游6种-一张表.json'
    census_path = BASE / '资源发射器数.json'
    readout_path = ROOT / 'analysis/results/UE_READBACK_20261015/B08资源读数.json'
    cloud, project, table, baseline, census, readout = map(read, [cloud_path, archive, table_path, base_path, census_path, readout_path])
    assert cloud['version'] == '16.0.43'
    assert cloud['appVersion'] == '16.0.42'
    assert cloud['sourceSha256'] == cloud['programmeSha256'] == sha(source) == sha(archive)
    assert cloud['project'] == project == read(source)
    html = (ROOT / 'tool/烟花编排工作台.html').read_text(encoding='utf-8')
    embedded = json.loads(re.search(r'<script id="df-offline-data" type="application/json">(.*?)</script>', html, re.S).group(1))
    assert embedded['cloud-latest'] == cloud
    readouts = {r['resourceId']: r for r in readout['items']}
    historical_bytes = subprocess.check_output(['git', 'show', 'fb314e3d:FXtools/节目/NewYearFireWorks_v01/资源发射器数.json'], cwd=ROOT)
    historical = json.loads(historical_bytes)
    historical_gpu = {r['id']: (r.get('FxSP') or {}).get('gpu', 0) for r in historical['pc']}
    fingerprints = [cloud_path, archive, source, table_path, base_path, census_path, readout_path, ROOT / 'tool/workbench/src/light-curve-model.mjs', ROOT / 'tool/fwlight/lib/light_model.py', ROOT / 'tool/workbench/src/light-rig.mjs', ROOT / 'tool/fwlight/config.json']
    qty_path = ROOT / 'analysis/scripts/编排数量对比.py'
    spec = importlib.util.spec_from_file_location('existing_quantity', qty_path)
    quantity = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(quantity)
    six, ids = [], {}
    for pn, pf, ck in PLATFORMS:
        resource_map = {r['id']: r for r in census[ck]}
        nested_sets = []
        for tn, tier, suffix in TIERS:
            tier_path = BASE / f'三表-{NAME}-{suffix}.json'
            if tier_path not in fingerprints:
                fingerprints.append(tier_path)
            current = expand(table, pf, tier)
            old = expand(baseline, pf, tier)
            # 对照仓库已有数量入口，独立展开仍应同值。
            assert collections.Counter((r['resourceId'], r['time']) for r in current) == collections.Counter((rid, round(t, 6)) for rid, t in quantity.expand(table_path, pf, tier))
            separate = expand(read(tier_path), pf, 4)
            # 编译器444行明确：三表仅PC，不能把其PlatformFlags=14当手游表。
            equal = comparable(current) == comparable(separate) if pn == 'PC' else None
            nested_sets.append(comparable(current))
            new_stats, old_stats = describe(current, resource_map, readouts), describe(old, resource_map, readouts)
            ids[f'{pn}{tn}'] = sorted({r['resourceId'] for r in current})
            keys = sorted(set(new_stats['counts']) | set(old_stats['counts']))
            six.append({'platform': pn, 'tier': tn, 'threeTableSameExpandedData': equal, 'threeTableScope': 'PC-only；手游使用一张表按Filter展开', 'B05': old_stats, 'B08R7': new_stats, 'historicalFanZeroGpuUsingPCCensus': {'B05': quantity.stats(base_path, pf, tier, historical_gpu)['GPU 同秒峰值（扇按 0）'], 'B08R7': quantity.stats(table_path, pf, tier, historical_gpu)['GPU 同秒峰值（扇按 0）']}, 'delta': {k: new_stats['counts'].get(k, 0) - old_stats['counts'].get(k, 0) for k in keys}})
        if pn == 'PC':
            assert all(s['threeTableSameExpandedData'] for s in six if s['platform'] == pn)
        assert not (nested_sets[1] - nested_sets[0]) and not (nested_sets[2] - nested_sets[1]), pn
    # Python 模型的生产入口会探测 umap/写坐标缓存；在本任务内替换该函数，只读已提交 rig 数据。
    subprocess.run(['node', str(OUT / '灯光离线核对.mjs')], cwd=ROOT, check=True)
    js = read(OUT / '灯光_JS.json')
    rig = js['rig']
    sys.path.insert(0, str(ROOT / 'tool/fwlight'))
    from lib import common, light_model
    cfg = common.load_config(str(ROOT / 'tool/fwlight/config.json'))
    assert cfg['model'] == rig['model']
    cfg['show']['dfshow'] = str(archive)
    light_model.read_level_positions = lambda _: ('committed-light-rig-only', {k: tuple(v) for k, v in rig['points'].items()}, {k: tuple(v) for k, v in rig['actors'].items()})
    py_keys, lights = {}, []
    for li in rig['lights']:
        light = li['light']
        result, py = light_model.build_keys(cfg, light)
        target = js['files'][f'keys_{light}.json']
        channels_equal = py['intensity'] == target['intensity'] and py['color'] == target['color']
        actual = [v for f, v in target['intensity']['keys']] + [target['intensity']['default']]
        frames = [f for f, _ in target['intensity']['keys']]
        finite = all(math.isfinite(v) for v in actual) and all(math.isfinite(v) for ch in target['color'].values() for _, v in ch['keys'])
        lights.append({'light': light, 'JS_Python_intensityColorIdentical': channels_equal, 'finite': finite, 'intensityKeys': len(frames), 'colorKeys': len(target['color']['R']['keys']), 'peak': max(actual), 'firstFrame': min(frames), 'lastFrame': max(frames), 'fps': py['fps'], 'bindingSame': py['binding'] == target['binding'], 'componentSame': py['component'] == target['component']})
        # 只保留与本任务可重复性有关的模型结果，移除本机绝对路径和生成时间。
        py.pop('meta', None)
        py_keys[light] = py
    (OUT / '灯光_Python.json').write_text(json.dumps(py_keys, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    result = {'format': 'df.b08r7-offline-audit/1', 'at': datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(timespec='seconds'), 'sourceHead': SOURCE_HEAD, 'programmeVersion': cloud['version'], 'appVersion': cloud['appVersion'], 'sourceSha256': cloud['sourceSha256'], 'sourceReferenceVerified': True, 'offlineHTMLCloudPayloadSame': True, 'historicalCensus': {'commit': 'fb314e3d', 'sha256': hashlib.sha256(historical_bytes).hexdigest(), 'readAt': historical['readAt']}, 'fingerprints': {str(p.relative_to(ROOT)).replace('\\', '/'): sha(p) for p in fingerprints}, 'sixTiers': six, 'resourceIds': ids, 'resourceIdsUnionCount': len(set().union(*map(set, ids.values()))), 'nestingVerified': True, 'light': {'rows': lights, 'errors': js['manifest']['errors'], 'warnings': js['manifest']['warnings'], 'events': js['manifest']['events'], 'peakAtS': js['manifest']['peakAtS'], 'showLastEndS': max(e['effectiveEnd'] for e in project['payload']['doc']['events']), 'sequenceEndS': rig['sequence']['endS'], 'pythonPositionsSource': '仅内存使用已提交light-rig.mjs，未读取本机关卡、未写缓存', 'fourLightsValid': len(lights) == 4 and all(x['finite'] and x['JS_Python_intensityColorIdentical'] and x['bindingSame'] and x['componentSame'] for x in lights) and next(x['peak'] for x in lights if x['light'] == 'SkyLight') <= 10}, 'limitations': ['同秒GPU峰是按资源启用LOD0默认FxSP计算的启动发射器数量，不是同时存活GPU粒子数或毫秒；FxSP_Low/High选择和引擎实际调度未测。', '旧扇粒子峰采用55/45与2.6/3.7s模型；新矩形上界采用T09的54/25与系统最大寿命3.2/3.6s，均不是截图/运行计数。', 'T09的花径来自模块及贴图占比估算，T10真实花径和Translucency尚未纳入。', '灯光四灯纯CPU逐键一致不代表UE已写入；16.0.42旧灯光交付包及config默认修订6未改。', '用户验收未做；没有运行UE、GPUECli、GPU或发布。']}
    result['conclusion'] = '离线交付引用及六档一致性通过；银扇0GPU旧模型存在缺口，需T10实测，不能性能放行。'
    wanted = set(readout['ids'])
    phone_rows = {r['ResourceId'] for r in readout['resourcefxRows']['mobile'] if r['ResourceId'] in wanted}
    phone_census = {r['id'] for r in census['mobile'] if r['id'] in wanted and r.get('FxSP')}
    phone_systems = {r['resourceId'] for r in readout['raw'] if r.get('mobile') and r['mobile'].get('system') and r['mobile'].get('emitters')}
    phone_paths = {r['resourceId'] for r in readout['items'] if r.get('mobileParticle')}
    assert phone_rows == phone_census == phone_systems == phone_paths
    result['resourceMappingAudit'] = {'T09InputIds': len(wanted), 'mobileTableRowsAmong25': len(phone_rows), 'mobileCensusMappedAmong25': len(phone_census), 'mobileSystemsWithModuleReadout': len(phone_systems), 'mobileParticlePaths': len(phone_paths), 'mobileIds': sorted(phone_rows), 'missingMobileAmong25': sorted(wanted - phone_rows), 'note': 'T09 B08资源读数.md:9写13，但表行、census和系统原始读数都是16；不是两个不同统计口径。B08手游实际所需仅10个ID并均有行。'}
    write(OUT / '核对.json', result)
    print(json.dumps({'version': cloud['version'], 'sixTiers': [{'platform': x['platform'], 'tier': x['tier'], 'same': x['threeTableSameExpandedData'], 'B05': x['B05']['counts'], 'R7': x['B08R7']['counts'], 'oldGPU': x['B08R7']['gpuSameSecondFanZero'], 'actualGPU': x['B08R7']['gpuSameSecondCensus']} for x in six], 'light': lights}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
