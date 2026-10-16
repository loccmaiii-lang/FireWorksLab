# 把只读读回整理成一份小摘要（进仓库）；原始 hero_raw.json 留在本机
import json
d = json.load(open('hero_raw.json', encoding='utf-8')); O = d['objects']; root = d['roots'][0]
g = lambda p: (O.get(p) or {}).get('properties', {})
ps = g(root); e = ps['Emitters'][5]; ep = g(e['path']); l0 = g(ep['LODLevels'][0]['path'])


def dist(v):
    if isinstance(v, dict) and v.get('_type') == 'object_ref':
        o = O.get(v['path'])
        if not o:
            return v['path']
        p = o['properties']; c = o['class'].split('.')[-1]
        r = {'class': c}
        for k in ('Constant', 'Min', 'Max', 'LockedAxes'):
            if k in p:
                r[k] = p[k]
        if 'ConstantCurve' in p:
            r['points'] = [{'t': round(x['InVal'], 4), 'v': x['OutVal'], 'mode': x['InterpMode']} for x in p['ConstantCurve']['Points']]
        return r
    if isinstance(v, dict):
        return {k: dist(x) for k, x in v.items() if k not in ('_struct', 'Table')}
    if isinstance(v, list):
        return [dist(x) for x in v]
    return v


mods = []
for m in l0['Modules']:
    mp = g(m['path']); c = m['class'].split('.')[-1].replace('ParticleModule', '')
    keep = {k: dist(v) for k, v in mp.items() if k in ('Lifetime', 'StartColor', 'StartAlpha', 'StartSize', 'LifeMultiplier', 'StartRotation', 'ColorScaleOverLife', 'AlphaScaleOverLife')}
    if 'DynamicParams' in mp:
        keep['DynamicParams'] = [{'name': x['ParamName'], 'method': x['ValueMethod'], 'emitterTime': x['bUseEmitterTime'], 'value': dist(x['ParamValue'].get('Distribution'))} for x in mp['DynamicParams']]
    for k in list(keep):
        if isinstance(keep[k], dict) and 'Distribution' in keep[k]:
            keep[k] = keep[k]['Distribution']
    mods.append({'module': c, 'enabled': mp.get('bEnabled', True), **keep})
td = g(l0['TypeDataModule']['path'])
mi = g('/Game/Effects/Common/MaterialInstance/Fireworks/MI_EFX_FireWork_Trail_01.MI_EFX_FireWork_Trail_01')


def par(lst):
    r = {}
    for it in lst or []:
        nm = (it.get('ParameterInfo') or {}).get('Name'); v = it.get('ParameterValue')
        if isinstance(v, dict) and v.get('_type') == 'object_ref':
            v = v['path'].split('.')[0]
        if isinstance(v, dict):
            v = {k: v[k] for k in ('R', 'G', 'B', 'A') if k in v}
        r[nm] = v
    return r


mesh = json.load(open('mesh_read.json', encoding='utf-8'))
planes = json.load(open('mesh_read_planes.json', encoding='utf-8'))
tex = json.load(open('tex_read.json', encoding='utf-8'))
req = g(l0['RequiredModule']['path'])
out = {
    'format': 'df.ue-readback-summary/1', 'readAt': d['readAt'],
    '说明': '只读读回（GPUECli /object/get、LoadAsset、EditorStaticMeshLibrary 读取函数），没写、没保存、没播放。原始 454 个对象在本机 analysis/local/MESH_WILLOW_READ_20261016/hero_raw.json（不进仓库）。',
    'ResourceFX': {'行': '新年烟花2.0_大金', 'ResourceId': 'P_EFX_FireWorks_Hero', 'FxSP': '/Game/Effects_HD/Props_HD/FireWorks_HD/P_EFX_FireWorks_Hero_HD', 'EffectScale': 1,
                   '另有': '新年烟花2.0_道具_大金 = P_EFX_FireWorks_Props_Hero_HD；手游 Hero_H / Props_Hero_H 用 SM_EFX_Plane_FireWork_Hero（与 PC 的 SM_EFX_Plane_FireWork_01_HD 顶点数、包围盒完全相同）'},
    '系统': {k: ps.get(k) for k in ('SystemUpdateMode', 'UpdateTime_FPS', 'LODDistances', 'bUseFixedRelativeBoundingBox', 'FixedRelativeBoundingBox', 'WarmupTime')},
    '发射器数': len(ps['Emitters']),
    '网格层': {
        'emitter': ep.get('EmitterName'), 'index': 5, 'LOD数': len(ep['LODLevels']),
        'TypeDataMesh': {k: (td[k]['path'] if isinstance(td.get(k), dict) and td[k].get('path') else td.get(k)) for k in ('Mesh', 'MeshAlignment', 'bOverrideMaterial', 'bCameraFacing', 'AxisLockOption', 'CameraFacingOption', 'bFaceCameraDirectionRatherThanPosition', 'bApplyParticleRotationAsSpin', 'bUseStaticMeshLODs', 'CastShadows')},
        'Required': {k: req.get(k) for k in ('ScreenAlignment', 'bUseInLocalSpace', 'SortMode', 'EmitterDuration', 'EmitterLoops', 'UVFlippingMode', 'bUseMaxDrawCount', 'MaxDrawCount')},
        'Spawn': {'Rate': 0, 'Burst': [{'count': 1, 'time': 0}]},
        'Modules': mods,
    },
    '材质实例': {'path': '/Game/Effects/Common/MaterialInstance/Fireworks/MI_EFX_FireWork_Trail_01', 'parent': '/Game/MaterialLib/Materials/FX/Parent/M_EFX_DissolveOutline_Soft',
                 'Scalar': par(mi.get('ScalarParameterValues')), 'Vector': par(mi.get('VectorParameterValues')), 'Texture': par(mi.get('TextureParameterValues')),
                 'StaticSwitch': {'UseDynamicUVIncrement': True}, 'TwoSided覆盖': True},
    '母材质要点': {'BlendMode': 'BLEND_Translucent', 'ShadingModel': 'MSM_Unlit', 'bUsedWithMeshParticles': True,
                   'DynamicParameter': ['0 UVIncrement → 乘 UVIncrementChannel 后加到 MainTex UV 上 = UV 流动（MI 里 Channel = G → 只动 V）',
                                        '1 Param2 → 溶解阈值（与 NoiseMap、Progress、hardness 做 SmoothStep）→ 不透明度与描边自发光',
                                        '2 DistortIntensity → UV 扭曲（UseDistortUV 关时无效）', '3 AlphaMaskUVScale → AlphaMask 缩放（UseAlphaMask 关时无效）'],
                   '颜色': 'MainTex 的 RGB（Desaturation = 0 时保留颜色）× MultiColor × 粒子颜色 → 自发光；透明度 = AlphaChannel 指定通道 × 粒子 Alpha × DepthFade',
                   '来源': 'analysis/results/资源规范统一_20261016/采集/raw_crawl.json.gz 里该母材质的表达式图（26 已采）'},
    '网格': {m.split('/')[-1]: {'verts_LOD0': v.get('verts0'), 'LOD数': v.get('GetLodCount'), '包围盒': v.get('GetBoundingBox'), 'Bounds': v.get('GetBounds'),
                                '导入源文件': (v.get('importData') or {}).get('SourceFilePath'), '自动碰撞': (v.get('importData') or {}).get('bAutoGenerateCollision'),
                                '生成光照UV': (v.get('importData') or {}).get('bGenerateLightmapUVs')} for m, v in mesh.items()},
    '对照面片': {m.split('/')[-1]: {'verts_LOD0': v.get('verts0'), '包围盒': v.get('GetBoundingBox')} for m, v in planes.items()},
    '贴图': tex,
}
json.dump(out, open('F:/FireWorksLab/analysis/results/MESH_WILLOW_20261016/2.0大金网格层_读回摘要.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok', len(mods), 'modules')
