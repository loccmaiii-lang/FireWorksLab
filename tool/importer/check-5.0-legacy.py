"""5.0 回归：原导入器的交付检查，分别跑「原交付版 HTML」和「5.0 引擎」，逐项比较结果（应全部「=」）。
python -X utf8 -B tool/importer/check-5.0-legacy.py <装了 jsdom 的 node_modules> [输出 json]
只在系统临时目录复原原布局；不连 UE（检查脚本自带模拟）、不写 D 盘。
"""
import json, os, shutil, subprocess, sys, tempfile, time
from pathlib import Path

SRC = Path(__file__).resolve().parent
NODE_PATH = sys.argv[1]
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(tempfile.gettempdir()) / 'fwl50-legacy-result.json'
CHECKS = ['check-delivery-contract.cjs', 'check-delivery-derived-ui.cjs', 'check-delivery-guards.cjs', 'check-delivery-migration.cjs',
          'check-delivery-native.cjs', 'check-delivery-presentation.cjs', 'check-delivery-receiver.cjs', 'check-import-resource-rules.cjs',
          'check-import-shared-recheck.cjs', 'check-import-system-policy.cjs', 'check-delivery-sc-offline.py']

# 测试专用：5.0 的拦截改由宿主做；这里让宿主照旧发 '# FWL_DELIVERY_GATE' 那段请求，原检查里的模拟 UE 就能照常应答。
SHIM = r"""<script>window.__FWL50_HOSTS={'':{lsKey:'fwimp.delivery.v1',sandbox:'',onLog(){},engineReady(){},saveBackup:async()=>{},
gate:async(directory,register,proofs)=>{const r=await fetch('http://127.0.0.1:17780/gpcli/object/call',{method:'POST',headers:{'Content-Type':'text/plain'},
body:JSON.stringify({path:'/Script/PythonScriptPlugin.Default__PythonScriptLibrary',function:'ExecutePythonCommandEx',args:{PythonCommand:'# FWL_DELIVERY_GATE\ncommand = ['+(register?'u"--register", ':'')+'u"'+directory+'"]\n',ExecutionMode:'ExecuteFile',FileExecutionScope:'Private'}})});
const j=await r.json(),d=(j&&j.data)||{};if(d.return_value!=='True')throw Error('UE Python 出错：'+String(d.out_CommandResult||'').slice(-600));
const m=/Output="((?:[^"\\]|\\.)*)"/.exec(d.out_LogOutput||'');const line=m?m[1].replace(/\\(.)/g,(a,c)=>c==='n'?'\n':c):'';
if(!line.startsWith('FWLDELIVERYGATE:'))throw Error('没拿到输出 FWLDELIVERYGATE:');return JSON.parse(line.slice(16));}}};</script>
"""


VM_SHIM = r"""// 测试专用：原检查把引擎放进没有 window 的 VM；这里给它一个宿主，拦截照旧走 '# FWL_DELIVERY_GATE' 请求，由各检查自带的模拟 UE 应答。
module.exports=api=>({__FWL50_HOST:{saveBackup:async()=>{},onLog(){},gate:async(directory,register)=>{
  const r=await api('/object/call',{path:'/Script/PythonScriptPlugin.Default__PythonScriptLibrary',function:'ExecutePythonCommandEx',args:{PythonCommand:'# FWL_DELIVERY_GATE\ncommand = ['+(register?'u"--register", ':'')+'u"'+directory+'"]\n',ExecutionMode:'ExecuteFile',FileExecutionScope:'Private'}},120000);
  const d=(r&&r.data)||{};if(d.return_value!=='True')throw Error('UE Python 出错：'+String(d.out_CommandResult||'').slice(-600));
  const m=/Output="((?:[^"\\]|\\.)*)"/.exec(d.out_LogOutput||'');const line=m?m[1].replace(/\\(.)/g,(a,c)=>c==='n'?'\n':c):'';
  if(!line.startsWith('FWLDELIVERYGATE:'))throw Error('没拿到输出 FWLDELIVERYGATE:');return JSON.parse(line.slice(16));}}});
"""


def layout(engine_html, shim=False):
    case = Path(tempfile.mkdtemp(prefix='fwl50-legacy-'))
    work = case / 'workbench'
    shutil.copytree(SRC, work, ignore=shutil.ignore_patterns('external', 'reference', 'node_modules', '__pycache__', 'dist'))
    for name in ['df-fx-copier-suite_v1.0.1_locmai.html', 'df-fx-workbench_v2_locmai.html']:
        shutil.copyfile(SRC / 'external/D/FXTools/DFWorkbench' / name, case / name)
    (case / 'df-fireworks-delivery_locmai.html').write_text(engine_html, encoding='utf-8', newline='\n')
    (work / 'research/design-20261005').mkdir(parents=True, exist_ok=True)
    if shim:
        (work / 'fwl50-legacy-shim.cjs').write_text(VM_SHIM, encoding='utf-8')
        loader = (work / 'import-backend.cjs').read_text(encoding='utf-8')
        assert loader.count('const context={api,log,') == 1
        (work / 'import-backend.cjs').write_text(loader.replace('const context={api,log,', "const context={window:require('./fwl50-legacy-shim.cjs')(api),api,log,"), encoding='utf-8')
    return case, work


def run(work, name):
    env = {**os.environ, 'NODE_PATH': NODE_PATH, 'PYTHONDONTWRITEBYTECODE': '1'}
    cmd = ['node', name] if name.endswith('.cjs') else [sys.executable, '-X', 'utf8', '-B', name]
    t0 = time.time()
    try:
        p = subprocess.run(cmd, cwd=work, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=120)
        code, out = p.returncode, (p.stdout + p.stderr)
    except subprocess.TimeoutExpired as e:
        code, out = 'timeout', ((e.stdout or '') + (e.stderr or '')) if isinstance(e.stdout, str) else 'timeout'
    return {'exit': code, 'sec': round(time.time() - t0, 1), 'tail': out.strip().splitlines()[-3:] if isinstance(out, str) else []}


def main():
    ref = (SRC / 'reference/df-fireworks-delivery_locmai.html').read_bytes().decode('utf-8').replace('\r\n', '\n')
    eng_path = Path(tempfile.mkdtemp(prefix='fwl50-eng-')) / 'engine.html'
    subprocess.run([sys.executable, '-X', 'utf8', '-B', str(SRC / 'build-5.0.py'), '--engine-html', str(eng_path), '--out', str(eng_path.with_name('dist.js'))], check=True, capture_output=True)
    eng = eng_path.read_text(encoding='utf-8')
    i = eng.index('\n<script>')
    eng = eng[:i] + '\n' + SHIM + eng[i + 1:]
    results = {}
    for label, html, shim in [('原交付版', ref, False), ('5.0 引擎', eng, True)]:
        case, work = layout(html, shim)
        results[label] = {name: run(work, name) for name in CHECKS}
        shutil.rmtree(case, ignore_errors=True)
    OUT.write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding='utf-8')
    bad = False
    for name in CHECKS:
        a, b = results['原交付版'][name], results['5.0 引擎'][name]
        same = (a['exit'] == 0) == (b['exit'] == 0)
        bad = bad or not same
        print(('=' if same else '≠'), name.ljust(36), '原', str(a['exit']).ljust(7), '5.0', str(b['exit']).ljust(7), '|', (b['tail'][-1] if b['tail'] else '')[:110])


    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
