"""宪章遗漏 2（对话框21 排队，用户 10-06 09:40「按推荐」；方案 3.A、参数宪章第 1 条）：参数「三选一」进构建。
发射器表.json 每个参数行加两个字段：
  类别：物理量 / 引擎字段 / 预览设置（参数宪章第 1 条的三选一）；另外两种过渡用：旧（待删）= 参数表里要删、面板上标「旧」的；只读 = 面板上的结果行（info:*，不是参数）
  单位：物理量必须有（无量纲写 1、倍数写 ×、百分比写 %）
依据：协作/筛查/参数清单_分类结果.csv（398 行，用户 10-05 19:40「全按推荐」）的「类别（填）」「建议（填）」；不在那张表里的（4.5 以后加的）按下面的规则。
拟合旋钮按 Q1（物理给默认，每个值都能改）读成它要合并到的那个量：合并到物理量 → 物理量，合并到帧计划 / 快门 / 引擎发射器 → 引擎字段。
静态核对.py 构建时查：每行都有类别、类别在这五个里、物理量有单位、面板上标「旧」的（71_panel43.js LEGACY）类别是旧（待删）。
幂等：已经填过的不改（要改就直接改表里那一行）。--force 全部重算。
用法：python3 analysis/scripts/参数类别_4.9.5.py [--force]
"""
import csv, json, pathlib, re, sys, collections

ROOT = pathlib.Path(__file__).resolve().parents[2]
EMIT_J = ROOT / 'analysis' / '命名' / '发射器表.json'
NAMES_J = ROOT / 'analysis' / '命名' / '参数名称表.json'
CLS_CSV = ROOT / '协作' / '筛查' / '参数清单_分类结果.csv'
PANEL43 = ROOT / 'tool' / 'src' / 'js' / '71_panel43.js'
ALLOWED = ['物理量', '引擎字段', '预览设置', '旧（待删）', '只读']
ENGINE_TARGETS = {'framePlan', 'recipeSchemaVersion', 'shutter', 'shutterSeconds', 'cameraShutterSeconds', 'seed', 'renderQualityPreset', 'frameRate', 'rtGpuMax', 'gpuPointEmitter',
                  'launchGlowEmitter', 'engineHeadGlow', 'M.headInt', 'cutIn/cutOut', 'cols/rows', 'mobileTexW/mobileTexH', 'mobileParticleBudget', 'unitEmitterOrientation',
                  'exportRequest.include4K', 'asset.modules', 'asset.form', '模板选择'}
PREVIEW_TARGETS = {'曝光建议工具', '曝光编辑状态', 'cameraHalo', 'haloFrac/haloR'}
# 按键名定（不在分类表里的，或分类表的判断被后来的决定改过的）
KEY = {
    'shellNo': ('物理量', '号'), 'coreProfile': ('引擎字段', ''), 'frameBudget': ('引擎字段', ''), 'zoom': ('引擎字段', ''), 'frameMode': ('引擎字段', ''), 'engine': ('引擎字段', ''),
    'holdTicks': ('引擎字段', 'tick'), 'previewBloom': ('预览设置', ''), 'exposureTarget': ('预览设置', ''), 'exposureLock': ('预览设置', ''),
    'haloFrac': ('引擎字段', ''), 'haloR': ('引擎字段', '×'), 'exposure': ('引擎字段', '×'), 'cellPad': ('引擎字段', 'px'), 'outPC': ('引擎字段', ''), 'outMobile': ('引擎字段', ''),
    'dotSize': ('引擎字段', 'm'), 'dotBright': ('引擎字段', '×'), 'qSS': ('引擎字段', '×'), 'qHz': ('引擎字段', 'Hz'), 'qMaxSub': ('引擎字段', '次'), 'trimLead': ('旧（待删）', ''),
    '_trailTier': ('预览设置', ''), 'seed': ('引擎字段', ''), 'ignSeed': ('引擎字段', ''),
    # 升空尾缀 RT6 的近段 / 远段怎么分、远段面片怎么走：输出结构（写进 cascade.json / 贴图），不是物理
    'rtFar': ('引擎字段', ''), 'rtNearA0': ('引擎字段', 's'), 'rtNearA1': ('引擎字段', 's'), 'rtNearExpo': ('引擎字段', '×'), 'rtFarVz': ('引擎字段', 'm/s'),
}
ENGINE_KEYS_RX = re.compile(r'^(x[12](On|Event|Kind)|out|tex|cols|rows|chans|enc|rtGrid|rtMobile|rtFadeFps|rtDissolve|rtGpu|rtBurstD|trExport4K|unitElev|unitFlip|autoGrid|cutIn|cutOut|preFrom|visTo|duration|renderVer|form|mods)')


def legacy_keys():
    s = PANEL43.read_text(encoding='utf-8'); blk = s[s.index('const LEGACY = {'):s.index('};', s.index('const LEGACY = {'))]
    ks = set(re.findall(r'\b([A-Za-z]\w*): \[', blk)); return ks


def unit_of(key, nm_unit, label=''):
    u = (nm_unit or '').strip()
    if u: return u
    if key.endswith('Curve'): return '×（随寿命）'
    if key.endswith('Jit') or 'Jit' in key: return '%'
    if '×' in label: return '×'
    return '1'


SEL = set(re.findall(r"sel: '(\w+)'", (ROOT / 'tool' / 'src' / 'js' / '10_types.js').read_text(encoding='utf-8')))     # 下拉选的：物理量的单位写「选项」


def main():
    force = '--force' in sys.argv
    eml = json.loads(EMIT_J.read_text(encoding='utf-8'))
    names = {(r['sec'], r['key']): r for r in json.loads(NAMES_J.read_text(encoding='utf-8'))}
    cls = {}
    for r in csv.DictReader(open(CLS_CSV, encoding='utf-8-sig')): cls.setdefault(r['key'], r)
    leg = legacy_keys(); why = collections.Counter(); rule_only = []
    for p in eml['参数']:
        if p.get('类别') and not force: continue
        k = p['key']; nm = names.get((p['sec'], k), {}); u0 = nm.get('unit', ''); lab = nm.get('old', '')
        c, u, src = None, '', ''
        if k.startswith('info:'): c, src = '只读', 'info'
        elif k in leg or k.startswith('ph') and k[2:3].isupper(): c, src = '旧（待删）', 'LEGACY'
        elif k in KEY: c, u = KEY[k]; src = 'KEY'
        elif k in cls:
            r = cls[k]; cc, sg = r['类别（填）'], r['建议（填）']; tgt = sg[3:].strip() if sg.startswith('合并到') else ''
            if cc == '死代码' or sg.startswith('删') or (cc.startswith('兼容开关') and sg.startswith('改成常量')): c = '旧（待删）'
            elif cc.startswith('物理量'): c = '物理量'
            elif cc.startswith('引擎字段'): c = '引擎字段'
            elif cc.startswith('预览设置'): c = '预览设置'
            elif tgt in ENGINE_TARGETS: c = '引擎字段'
            elif tgt in PREVIEW_TARGETS: c = '预览设置'
            else: c = '物理量'            # 拟合旋钮 → 它要合并到的物理量（Q1：值留着、能直接改）
            src = 'CSV'
        else:
            c = '引擎字段' if ENGINE_KEYS_RX.match(k) else '物理量'; src = 'rule'; rule_only.append(k)
        if c == '物理量': u = u or ('选项' if k in SEL and not u0 else unit_of(k, u0, lab))
        elif not u: u = (u0 or '').strip()
        p['类别'] = c; p['单位'] = u; why[(c, src)] += 1
    EMIT_J.write_text(json.dumps(eml, ensure_ascii=False, indent=1), encoding='utf-8')
    print('；'.join(f'{c}·{s} {n}' for (c, s), n in sorted(why.items())))
    if rule_only: print('按规则定的（不在分类表里）：', ' '.join(sorted(set(rule_only))))


main()
