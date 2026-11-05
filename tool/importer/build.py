from pathlib import Path
import re, hashlib, json, importlib.util

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / 'df-fx-copier-suite_v1.0.1_locmai.html'
OUTPUT = HERE.parent / 'df-fx-workbench_v2_locmai.html'
VERSION = '2.29'

def replace_once(text, old, new):
    assert text.count(old) == 1, 'Anchor changed: ' + old[:90]
    return text.replace(old, new, 1)

def build():
    original = SOURCE.read_bytes()
    s = original.decode('utf-8').replace('\r\n','\n')
    s = replace_once(s, '<title>DF特效工具集</title>', '<title>DF 特效工作台 · v'+VERSION+'</title>')
    s = replace_once(s, '</style>', '\n' + (HERE/'workbench.css').read_text(encoding='utf-8') + '\n' + (HERE/'show.css').read_text(encoding='utf-8') + '\n</style>')
    s = replace_once(s, '</style>', '\n' + (HERE/'presentation.css').read_text(encoding='utf-8') + '\n' + (HERE/'show-project.css').read_text(encoding='utf-8') + '\n' + (HERE/'workbench-log.css').read_text(encoding='utf-8') + '\n' + (HERE/'workbench-scroll.css').read_text(encoding='utf-8') + '\n' + (HERE/'fireworks-workspace.css').read_text(encoding='utf-8') + '\n' + (HERE/'material.css').read_text(encoding='utf-8') + '\n</style>')
    # Missing/unknown replies are not evidence that an asset is absent.
    s = replace_once(s, "return v === true || v === 'True';", "return v === true || v === 'True' ? true : v === false || v === 'False' ? false : null;")
    start=s.index('  <div class="topbar">'); end=s.index('    <main class="content">',start)
    s=s[:start]+(HERE/'shell.html').read_text(encoding='utf-8').replace('{{VERSION}}',VERSION)+s[end:]
    s=replace_once(s,'    <main class="content">','    <main class="content"><header class="page-heading"><div><div id="wb-breadcrumb">资产处理</div><h1 id="wb-title">烟花素材导入</h1><p id="wb-description"></p></div><span id="wb-task" role="status">就绪</span></header>')
    start=s.index('      <section id="panel-fwimp"'); end=s.index('      </section>',start)+len('      </section>')
    s=s[:start]+(HERE/'fireworks.html').read_text(encoding='utf-8')+s[end:]
    show=(HERE/'show.html').read_text(encoding='utf-8')
    show=replace_once(show,'<fieldset class="show-fieldset">','<fieldset class="show-fieldset">\n'+(HERE/'show-project.html').read_text(encoding='utf-8'))
    s=replace_once(s,'    </main>',show+'\n    </main>')
    s=replace_once(s,'<h2>日志（操作反馈，第一时间看这里）</h2>','<button type="button" class="log-toggle" id="wb-log-toggle" aria-expanded="true" onclick="Workbench.toggleLog()">操作记录</button><span id="wb-last-log" role="status"></span>')
    # Preserve the original engine, inject new presentation/state functions into its closure.
    marker='// ================= 烟花素材导入（locmai，FireWorksLab）================='
    icons = {key:value['data'] for key,value in json.loads((HERE/'material-icons.json').read_text(encoding='utf-8')).items()}
    material = (HERE/'material.js').read_text(encoding='utf-8').replace('/* MATERIAL_ICON_DATA */{}',json.dumps(icons))
    s=replace_once(s,marker,(HERE/'workbench-log.js').read_text(encoding='utf-8')+'\n'+(HERE/'shell.js').read_text(encoding='utf-8')+'\n'+(HERE/'presentation.js').read_text(encoding='utf-8')+'\n'+(HERE/'workbench-scroll.js').read_text(encoding='utf-8')+'\n'+material+'\n'+marker)
    s=replace_once(s,'//   3) GPU 发射器必须烘（GPU 粒子的颜色/尺寸/寿命从查找表采样），且要重启编辑器后「收尾」一次；',
        '//   3) GPU 分布保留烘查找表；新建和重建后显式同步 SoloTracking 并读回。独立 CPU/GPU 测试已在同一会话打开 Cascade；旧版待办继续兼容收尾；')
    s=replace_once(s,"const LS_KEY = 'fwimp.v1';","const LS_KEY = 'fwimp.workbench.v2';")
    s=replace_once(s,"function loadLS(){ try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch(e){ return {}; } }", "function loadLS(){ try { return JSON.parse(localStorage.getItem(LS_KEY) || localStorage.getItem('fwimp.v1') || '{}'); } catch(e){ return {}; } }")
    s=replace_once(s,"function saveLS(o){ try { localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch(e){} }", "function saveLS(o){ localStorage.setItem(LS_KEY, JSON.stringify(o)); }")
    # Keep reference binding by source key; the reviewed importer is injected below.
    s=replace_once(s,"InitialVelocity:'ParticleModuleVelocity',",
        "InitialVelocity:'ParticleModuleVelocity', VelocityOverLife:'ParticleModuleVelocityOverLifetime',")
    s=replace_once(s, "InitialColor:'ParticleModuleColor',", "InitialColor:'ParticleModuleColor', EventGenerator:'ParticleModuleEventGenerator', EventReceiverSpawn:'ParticleModuleEventReceiverSpawn',")
    s=replace_once(s, '  const TEX_KEYS =', (HERE/'cascade-events.js').read_text(encoding='utf-8')+'\n  const TEX_KEYS =')
    s=replace_once(s, '  const TEX_KEYS =', (HERE/'fireworks-policy.js').read_text(encoding='utf-8')+'\n'+(HERE/'fireworks-resource-rules.js').read_text(encoding='utf-8')+'\n'+(HERE/'fireworks-system-policy.js').read_text(encoding='utf-8')+'\n'+(HERE/'fireworks-compat.js').read_text(encoding='utf-8')+'\n  const TEX_KEYS =')
    s=replace_once(s, "const allowed = p => Object.values(MAP.dirs).some(d => p.startsWith(d + '/'));", "const allowed = p => directAssetPath(p);")
    start=s.index('  function validate(spec){',s.index('const FwImporter'))
    end=s.index('  async function readPack(dir){',start)
    s=s[:start]+(HERE/'fireworks-plan.js').read_text(encoding='utf-8')+'\n'+s[end:]
    start=s.index('  async function readPack(dir){',s.index('const FwImporter'))
    end=s.index('  async function preview(){',start)
    s=s[:start]+(HERE/'fireworks-pack.js').read_text(encoding='utf-8')+'\n'+(HERE/'fireworks-update.js').read_text(encoding='utf-8')+'\n'+s[end:]
    ui=(HERE/'fireworks-ui.js').read_text(encoding='utf-8')
    pre,post=ui.split('// ENGINE_IMPORT_ONE_SPLIT')
    pre += '\n' + (HERE/'fireworks-workspace.js').read_text(encoding='utf-8')
    start=s.index('  async function preview(){',s.index('const FwImporter'))
    end=s.index('  async function importOne(it){',start)
    s=s[:start]+(HERE/'fireworks-selection.js').read_text(encoding='utf-8')+'\n'+pre+'\n'+s[end:]
    start=s.index('  async function execute(){',s.index('const FwImporter'))
    end=s.index('\n})();',start)
    s=s[:start]+post+s[end:]
    start=s.index('  async function importOne(it){',s.index('const FwImporter'))
    end=s.index('  async function execute(){',start)
    s=s[:start]+(HERE/'fireworks-import.js').read_text(encoding='utf-8')+'\n'+s[end:]
    # Auto-preview must share the same single-flight gate as explicit previews.
    s=replace_once(s,'doParse(null, /*silent*/true);','AssetCopier.doParse(null, /*silent*/true);') if s.count('doParse(null, /*silent*/true);') == 1 else s
    s=s.replace('        doParse(null, /*silent*/true);','        AssetCopier.doParse(null, /*silent*/true);')
    s=s.replace('if (valid > 0) doParse(null, /*silent*/true);','if (valid > 0) MaterialCopier.doParse(null, /*silent*/true);')
    # The standalone workbench owns navigation even when opened with a fragment.
    start=s.index('// 嵌入模式：'); end=s.index('const Workbench',start)
    s=s[:start]+s[end:]
    preview='\n'.join((HERE/name).read_text(encoding='utf-8') for name in ['show-bp-data.js','show-text.js','show-resource-data.js','show-resources.js','show-catalog.js','show-fan.js','show-plan.js','show-sequence.js','show-sequence-scene.js','show-ui.js','show-project.js','show-project-sample.js','show-project-import.js','show-project-store.js','show-project-export.js','show-project-scene.js','show-project-ui.js'])
    s=replace_once(s,'checkConn();\n</script>',preview+'\nWorkbench.init();\nWorkbenchPresentation.init();\nWorkbenchScroll.init();\nMaterialWorkbench.init();\ncheckConn();\n</script>')
    # 颜色和烘焙器/编排器同源；只注入颜色，不改变本构建器的功能或布局。
    theme_path=Path(__file__).resolve().parents[1]/'design-system'/'sync_importer_colors.py'   # 仓库内 tool/design-system（5.0 起不写死 F 盘）
    spec=importlib.util.spec_from_file_location('df_importer_colors',theme_path)
    theme=importlib.util.module_from_spec(spec);spec.loader.exec_module(theme)
    s=theme.apply_theme(s)
    OUTPUT.write_text(s,encoding='utf-8')
    assert SOURCE.read_bytes()==original, 'Source changed'
    print(str(OUTPUT)); print('Source SHA256:',hashlib.sha256(original).hexdigest())
    return OUTPUT

if __name__=='__main__': build()
