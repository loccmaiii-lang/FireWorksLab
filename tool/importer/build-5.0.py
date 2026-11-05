"""烟花工坊 5.0：生成导入模块 dist/fwl-importer.js（一个 JS 文件，内含导入引擎，不依赖 8034 / local_http / Python）。

python -X utf8 -B tool/importer/build-5.0.py            # 生成 dist/fwl-importer.js
python -X utf8 -B tool/importer/build-5.0.py --engine-html <路径>   # 另存一份引擎 HTML 供排查（不进 Git）

步骤：
1. 用原 build.py + build-delivery.py 生成交付版 HTML（不部署、不同步本机副本），源码没变时应与 reference/ 逐字节一致。
2. 对交付版 HTML 只做下面 P1–P10 这些 5.0 改动；导入逻辑、贴图规范（fireworks-policy / resource-rules / system-policy）原样，构建时逐字核对。
3. 引擎 HTML 内联进 fwl50/host.js 的占位符，写出 dist/fwl-importer.js。
"""
from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import re
import sys
import tempfile

HERE = Path(__file__).resolve().parent
EXTERNAL = HERE / 'external/D/FXTools/DFWorkbench'
REFERENCE = HERE / 'reference/df-fireworks-delivery_locmai.html'
HOST = HERE / 'fwl50/host.js'
DIST = HERE / 'dist/fwl-importer.js'
MODULE_VERSION = '5.0.0'


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def build_delivery_html():
    """原 build-delivery 流程，输出到临时文件；不碰 external/、reference/ 和本机部署。"""
    sys.path.insert(0, str(HERE))
    build = load('build', HERE / 'build.py')
    delivery = load('fwl_build_delivery', HERE / 'build-delivery.py')
    build.SOURCE = EXTERNAL / 'df-fx-copier-suite_v1.0.1_locmai.html'
    build.OUTPUT = EXTERNAL / 'df-fx-workbench_v2_locmai.html'      # 只读来核对哈希；原流程随后改指向交付输出
    out = Path(tempfile.mkdtemp(prefix='fwl50-build-')) / 'df-fireworks-delivery.html'
    delivery.OUTPUT = out
    delivery.sync_file_runtime = lambda shared, *a, **k: '（5.0 构建不部署本机副本）'
    argv = sys.argv
    try:
        sys.argv = [argv[0]]
        delivery.main()
    finally:
        sys.argv = argv
    return out.read_text(encoding='utf-8')


def once(s, old, new, label):
    n = s.count(old)
    assert n == 1, f'{label}：锚点出现 {n} 次（源码变了，需要更新 build-5.0.py）'
    return s.replace(old, new, 1)


def cut_iife(s, head, label):
    """删掉顶层 `const X = (function(){ ... })();` 一整块（到它后面第一行单独的 `})();`）。"""
    start = s.index(head)
    end = s.index('\n})();\n', start) + len('\n})();\n')
    assert start > 0 and end > start, label
    return s[:start] + s[end:], end - start


STUBS = '''// 5.0：以下工具不在烟花工坊里（方案第 5 节）。只留空壳，让共用外壳的初始化照常跑；调用即报错，不会写 UE。
const fwl50Removed=name=>new Proxy({},{get(t,k){if(k in t)return t[k];if(k==='init'||k==='setActive')return()=>{};if(typeof k==='symbol')return undefined;return()=>{throw Error(name+' 不在烟花工坊 5.0 里');};},set(t,k,v){t[k]=v;return true;}});
'''


def patch_engine(s):
    report = {}
    # P1 标题
    s = once(s, '<title>烘焙器 · 资源交付</title>', '<title>烟花工坊 · 导入引擎</title>', 'P1')

    # P10 宿主引导：引擎在模块自建的 iframe srcdoc 里跑，从父页按 iframe 名字取宿主对象。
    boot = ('<script>(function(){try{var h=parent.__FWL50_HOSTS&&parent.__FWL50_HOSTS[window.name];'
            'if(h){window.__FWL50_HOST=h;window.__FWL50_SANDBOX=h.sandbox||"";window.__FWL50_LS_KEY=h.lsKey||"";}}catch(e){}})();</script>\n<script>')
    s = once(s, '\n<script>\n', '\n' + boot + '\n', 'P10')

    # P2 独立存储键；第一次从旧交付页（fwimp.delivery.v1）只读带过来（沙盒不带）。
    s = once(s, "const LS_KEY = 'fwimp.delivery.v1';", "const LS_KEY = (typeof window !== 'undefined' && window.__FWL50_LS_KEY) || 'fwl50.importer.v1';", 'P2a')
    s = once(s, "function loadLS(){ try { return JSON.parse(localStorage.getItem(LS_KEY) || localStorage.getItem('fwimp.v1') || '{}'); } catch(e){ return {}; } }",
             "function loadLS(){ try { return JSON.parse(localStorage.getItem(LS_KEY) || (typeof window !== 'undefined' && window.__FWL50_SANDBOX ? null : localStorage.getItem('fwimp.delivery.v1')) || '{}'); } catch(e){ return {}; } }", 'P2b')

    # P3 沙盒：写入目录整体挪到沙盒根下（模板、引用的母材质仍读原路径，只读）。
    marker = '  const MOD = {Lifetime:'
    s = once(s, marker, "  const FWL50_HOST_WIN = typeof window !== 'undefined' ? window : {};\n  const FWL50_SANDBOX = FWL50_HOST_WIN.__FWL50_SANDBOX || '';\n"
             "  const fwl50Dir = p => FWL50_SANDBOX && /^\\/Game\\//.test(p) ? FWL50_SANDBOX + p.slice(5) : p;\n"
             "  for (const k of Object.keys(MAP.dirs)) MAP.dirs[k] = fwl50Dir(MAP.dirs[k]);\n" + marker, 'P3a')
    s = once(s, "const HD_TEXTURE_DIR = '/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD';",
             "const HD_TEXTURE_DIR = fwl50Dir('/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD');", 'P3b')
    s = once(s, "Object.assign(MAP.dirs,{mobile_ps:'/Game/Effects/Props/FireWorks',mobile_mi:'/Game/Effects/Common/MaterialInstance/Fireworks'});",
             "Object.assign(MAP.dirs,{mobile_ps:fwl50Dir('/Game/Effects/Props/FireWorks'),mobile_mi:fwl50Dir('/Game/Effects/Common/MaterialInstance/Fireworks')});", 'P3c')

    # P4 导入前拦截：原来经 UE 起本机 Python（写死 C:/、D:/）；5.0 交给宿主在网页里跑同一套规则（fx_gate 移植）。
    start = s.index('  async function deliveryGate(directory,register=false,proofs={}){')
    end = s.index('  readPack=async function(directory,configFile){', start)
    s = s[:start] + ('  async function deliveryGate(directory,register=false,proofs={}){\n'
                     "    if(!FWL50_HOST_WIN.__FWL50_HOST)throw Error('导入前拦截不可用：烟花工坊导入模块没有就绪');\n"
                     '    const result=await FWL50_HOST_WIN.__FWL50_HOST.gate(directory,register,proofs);\n'
                     "    if(!result.ok)throw Error('交付预检拦下：'+result.problems.join('；'));\n"
                     '    return result;\n  }\n') + s[end:]

    # P5 备份：先写 UE 系统临时目录（不在工程里），再由宿主读回、写进用户选的备份文件夹并核对哈希；写不成就停，不改资产。
    s = once(s, "root = ${pyStr('D:/FXTools/DFWorkbench/workbench/asset-backups')}\nassert os.path.isdir(root), 'Existing backup directory is missing; creation is forbidden: ' + root",
             "root = __import__('tempfile').gettempdir()\nif not isinstance(root, unicode): root = root.decode(sys.getfilesystemencoding() or 'mbcs')\n"
             "root = os.path.join(root, u'fwl50', u'backups')\nif not os.path.isdir(root): os.makedirs(root)", 'P5a')
    s = once(s, "    if(assetSelected(it,'ps')&&it.targets.some(t=>t.key==='ps'&&t.exists))await py(`unreal.AgentAssetScriptingLibrary.close_asset_editors(",
             "    if(!FWL50_HOST_WIN.__FWL50_HOST)throw Error('备份不可用：烟花工坊导入模块没有就绪');\n    await FWL50_HOST_WIN.__FWL50_HOST.saveBackup(it,backup);\n"
             "    if(assetSelected(it,'ps')&&it.targets.some(t=>t.key==='ps'&&t.exists))await py(`unreal.AgentAssetScriptingLibrary.close_asset_editors(", 'P5b')

    # P6 去掉不属于烟花导入的工具逻辑（方案第 5 节；ResourceFX 配表这一版先不带）。
    removed = {}
    for head, name in [('const ParentMapper = (function(){', '母材质映射'), ('const AssetCopier = (function(){', '特效资产复制'),
                       ('const MaterialCopier = (function(){', '材质实例复制'), ('const WeaponConfig = (function(){', '整枪配表'),
                       ('const ResourceFX = (function(){', 'ResourceFX 配表')]:
        s, n = cut_iife(s, head, name)
        var = head.split()[1]
        removed[name] = n
        anchor = '// ================= 共享基础设施 ================='
        s = once(s, anchor, anchor + '\n' + f"const {var}=fwl50Removed('{name}');", 'P6 ' + name)
    s = once(s, '// ================= 共享基础设施 =================', STUBS + '// ================= 共享基础设施 =================', 'P6 stubs')
    start = s.index('\nconst ShowText = (() => {')
    end = s.index('\nWorkbench.init();\n', start)
    removed['旧烟花编排'] = end - start
    s = s[:start] + "\nconst ShowComposer=fwl50Removed('旧烟花编排'),ShowProjectUI=fwl50Removed('旧烟花编排');" + s[end:]
    report['removedBytes'] = removed

    # P7 原交付桥（向 8034 页回报、隐藏侧栏）不要了；5.0 由宿主直接调引擎。
    start = s.index('// Independent delivery entry point. Existing engine functions and legacy entry remain unchanged.\nwindow.FwDeliveryBridge=(()=>{')
    end = s.index('\n})();\n', start) + len('\n})();\n')
    s = s[:start] + "switchPanel('fwimp');\n" + s[end:]

    # P8 给宿主的只读快照与几个控制入口（逻辑都走原函数，不另写判断）。
    api = '''  // ---- 烟花工坊 5.0 宿主入口（只读快照 + 原函数的组合，不另写导入判断）----
  function fwl50Action(t){if(!t.selected)return t.reused||t.reuseRequested?'复用':'不变';return /复用/.test(t.action)?'复用':/更新|重建/.test(t.action)?'覆盖':'新建';}
  function fwl50Snapshot(deliveryId){
    const b=batches.find(x=>x.deliveryId===deliveryId);if(!b)return null;
    return {batch:b.id,active:active===b.id,phase,busy:locked()||!!editor,pending:[...(loadLS().pending||[])],rows:b.rows.map(r=>({id:r.id,platform:r.platform,configFile:r.configFile,state:r.state,label:statusLabel(r),mode:r.mode,
      selected:!!r.selected,checked:checked(r),confirmed:canRun(r),finished:finished(r),errs:[...(r.errs||[])],as:r.as,fingerprint:verified.get(r.id)?.fingerprint||null,
      completedAssetKeys:[...(r.completedAssetKeys||[])],importProgress:r.importProgress||null,backup:r.backup||'',completedAt:r.completedAt||null,
      assets:namingRows(r).map(t=>({key:t.key,type:t.type,name:t.name,directory:t.directory,engineAction:t.action,selected:t.selected,action:fwl50Action(t)}))}))};
  }
  function fwl50Activate(deliveryId,platforms){
    if(locked()||editor)return false;const b=batches.find(x=>x.deliveryId===deliveryId);if(!b)return false;
    active=b.id;if(platforms)for(const r of b.rows)if(!finished(r)){const want=platforms.includes(r.platform);if(r.selected!==want){r.selected=want;invalidateRecord(r);}}
    inspected=b.rows.find(r=>r.selected)?.id||b.rows[0]?.id||'';persist();refresh();return true;
  }
  function fwl50ConfirmAll(deliveryId){
    if(locked()||editor||!storageOK)return 0;const b=batches.find(x=>x.deliveryId===deliveryId);if(!b||active!==b.id)return 0;
    let n=0;for(const r of b.rows){const plan=verified.get(r.id);if(r.selected&&!finished(r)&&checked(r)&&plan){confirmations.set(r.id,plan.fingerprint);n++;}}
    nameReview=null;if(!persist())return 0;refresh();return n;
  }
  function fwl50PlanPreview(spec,name){try{const r=fresh('',{...splitImportName(name),particleNumbered:false,assetNaming:'formal'});return makePlan(spec,r.as,resolveImportNaming(r.as,namingFields(r)));}catch(e){return {error:e.message||String(e)};}}
'''
    api += "  FWL50_HOST_WIN.__fwl50Api={fwl50Snapshot,fwl50Activate,fwl50ConfirmAll,fwl50PlanPreview};\n"
    anchor = '  return{deliveryView,selectDeliveryPlatform,acceptDelivery,deliveryState,init,'
    s = once(s, anchor, api + anchor, 'P8')

    # P9 收尾：把引擎对象交给宿主，操作记录同步给宿主。
    s = once(s, 'checkConn();\n// Generated offline subset', 'checkConn();\n'
             'window.__fwl50Engine={FwImporter:Object.assign(Object.create(FwImporter),window.__fwl50Api),Workbench,get log(){return log;}};\n'
             "{const original=log;log=function(m,k){original(m,k);try{window.__FWL50_HOST&&window.__FWL50_HOST.onLog(String(m),k||'');}catch(e){}};}\n"
             'try{window.__FWL50_HOST&&window.__FWL50_HOST.engineReady(window);}catch(e){}\n'
             '// Generated offline subset', 'P9')
    # P11 原交付页缩略图兜底会去 8034 取图；5.0 缩略图由外壳显示，引擎不取。
    s = once(s, "(receipt.thumbnailURL||(location.protocol==='file:'?'http://127.0.0.1:8034':location.origin)+'/api/deliveries/'+encodeURIComponent(receipt.deliveryId)+'/'+receipt.thumbnail.file.split('/').map(encodeURIComponent).join('/'))",
             "(receipt.thumbnailURL||'')", 'P11')
    # P12 原交付页向 8034 宿主页回报界面状态；5.0 引擎在 srcdoc 里，location.origin 是 'null'，postMessage 会抛错（真 UE 沙盒导入时实测），5.0 也没人收。
    s = once(s, "if(parent!==window)parent.postMessage({type:'workspace-view-state',busy:view.busy,current:view.current},location.origin);", '', 'P12')
    # P13 第一次复制材质实例会编译 shader：真 UE 沙盒导入实测超过原来的 120 秒，导入中止（UE 里其实还在复制）。只放宽这一个等待时间。
    s = once(s, "await call(ASSET_LIB, 'DuplicateAsset', { SourceAssetPath: role.template, DestinationAssetPath: pkg }, 120000);",
             "await call(ASSET_LIB, 'DuplicateAsset', { SourceAssetPath: role.template, DestinationAssetPath: pkg }, 600000);", 'P13')
    return s, report


POLICY_FILES = ['fireworks-policy.js', 'fireworks-resource-rules.js', 'fireworks-system-policy.js', 'fireworks-import.js',
                'fireworks-pack.js', 'fireworks-plan.js', 'fireworks-update.js', 'fireworks-selection.js', 'cascade-events.js', 'delivery-contract.js']
# 5.0 只许动这几行（沙盒目录、拦截与备份换宿主）；其余每一行都要和原交付版一样在引擎里。
ALLOWED_CHANGED = {
    'fireworks-policy.js': ["const HD_TEXTURE_DIR = '/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD';"],
    'delivery-contract.js': ["Object.assign(MAP.dirs,{mobile_ps:'/Game/Effects/Props/FireWorks',mobile_mi:'/Game/Effects/Common/MaterialInstance/Fireworks'});"],
    'fireworks-import.js': ["if(!exists)await call(ASSET_LIB, 'DuplicateAsset', { SourceAssetPath: role.template, DestinationAssetPath: pkg }, 120000);"],
}


def verify_engine(s, delivery):
    """贴图规范与导入逻辑原样：这些源文件里在原交付版出现的每一行，引擎里也要有（只许 ALLOWED_CHANGED 和整块换掉的拦截函数）。"""
    gate_start = delivery.index('  async function deliveryGate(directory,register=false,proofs={}){')
    gate = delivery[gate_start:delivery.index('  readPack=async function(directory,configFile){', gate_start)]
    backup_lines = {"root = ${pyStr('D:/FXTools/DFWorkbench/workbench/asset-backups')}",
                    "assert os.path.isdir(root), 'Existing backup directory is missing; creation is forbidden: ' + root"}
    for name in POLICY_FILES:
        lines = [l.strip() for l in (HERE / name).read_text(encoding='utf-8').splitlines() if len(l.strip()) > 12]
        lost = [l for l in lines if l in delivery and l not in s and l not in ALLOWED_CHANGED.get(name, [])
                and l not in gate and l not in backup_lines]
        assert not lost, f'{name} 有 {len(lost)} 行没原样进入引擎，例如：{lost[0][:120]}'
    drives = sorted(set(re.findall(r"['\"`]([A-Za-z]:[\\/][^'\"`\n]{0,60})", s)))
    assert not drives, '引擎里还有本机盘符路径：' + '；'.join(drives[:8])
    for gone in ['asset-backups', 'delivery-preflight.py', 'python.exe', '127.0.0.1:8034', "const AssetCopier = (function", "const ShowComposer = (() =>", 'workspace-import-state']:
        assert gone not in s, '引擎里还残留：' + gone


def emit(engine, out_path):
    host = HOST.read_text(encoding='utf-8')
    literal = json.dumps(engine, ensure_ascii=False).replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
    version = (HERE / 'build.py').read_text(encoding='utf-8').split("VERSION = '", 1)[1].split("'", 1)[0]
    fingerprint = hashlib.sha256(engine.encode('utf-8')).hexdigest()[:12]
    host = once(host, "/*__ENGINE_HTML__*/''", literal, 'host engine')
    host = once(host, "/*__ENGINE_VERSION__*/''", json.dumps(f'导入器 v{version}（含 v2.30 / v2.31 贴图规范）· 引擎 {fingerprint}', ensure_ascii=False), 'host version')
    host = once(host, "/*__MODULE_VERSION__*/''", json.dumps(MODULE_VERSION), 'host module version')
    assert '</script' not in host.lower(), '模块里出现 </script，内联进单文件会截断'
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(host, encoding='utf-8', newline='\n')
    return fingerprint


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--engine-html', type=Path)
    ap.add_argument('--out', type=Path, default=DIST)
    a = ap.parse_args()
    delivery = build_delivery_html()
    same = delivery == REFERENCE.read_bytes().decode('utf-8').replace('\r\n', '\n')   # reference 是 CRLF 存的
    print('交付版 HTML（原流程）', len(delivery.encode('utf-8')), '字节；与 reference/ 一致' if same else '；与 reference/ 不同（源码已改过，属正常）')
    engine, report = patch_engine(delivery)
    verify_engine(engine, delivery)
    if a.engine_html:
        a.engine_html.write_text(engine, encoding='utf-8', newline='\n')
    fp = emit(engine, a.out)
    print('5.0 引擎', len(engine.encode('utf-8')), '字节，去掉', json.dumps(report['removedBytes'], ensure_ascii=False))
    print('写出', a.out, a.out.stat().st_size, '字节；引擎指纹', fp)


if __name__ == '__main__':
    main()
