"""Build a NEW importer delivery entry, preserving both existing HTML entry files."""
from pathlib import Path
import hashlib
import argparse
import importlib.util
import json
import re
import build
import delivery_sc_offline

HERE=Path(__file__).resolve().parent
OUTPUT=HERE.parent/'df-fireworks-delivery_locmai.html'

def runtime_preparer(tool_root):
    path=tool_root/'local_delivery/prepare_local.py'
    spec=importlib.util.spec_from_file_location('fwl_private_runtime_prepare',path)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module.prepare

def sync_file_runtime(shared,output=OUTPUT,setup=None):
    """构建后同步烘焙器file入口使用的既有副本；不创建目录或切换来源。"""
    tool_root=Path(shared).parent
    setup=Path(setup) if setup else Path.home()/'.fireworkslab/delivery-launcher.json'
    if not setup.is_file():raise ValueError('交付源码已构建，但缺少本机配置，文件入口尚未同步')
    configured=json.loads(setup.read_text(encoding='utf-8')).get('importerPath')
    if not configured or Path(configured).resolve()!=Path(output).resolve():
        raise ValueError('本机配置使用了另一份导入器，未覆盖文件入口副本；请核对配置')
    runtime=tool_root/'local_delivery/runtime/importer.html'
    if not runtime.parent.is_dir():raise ValueError('文件入口副本目录不存在；禁止构建时创建新目录')
    if not runtime_preparer(tool_root)(tool_root,Path(output),setup):raise ValueError('文件入口副本未生成')
    source=Path(output).read_text(encoding='utf-8');actual=runtime.read_text(encoding='utf-8')
    gate=re.search(r'  async function deliveryGate\([\s\S]*?(?=  readPack=async)',source)
    if not gate or gate.group() not in actual or 'function deliveryRegistrationOnly' not in actual:
        raise ValueError('构建后的文件入口未包含当前登记代码，不能宣称部署完成')
    return runtime

def main():
    args=argparse.ArgumentParser()
    args.add_argument("--design-system",default=Path("F:/FireWorksLab/tool/design-system"),type=Path)
    shared=args.parse_args().design_system
    assert (shared/"tokens.css").is_file() and (shared/"components.css").is_file()
    originals={p:hashlib.sha256(p.read_bytes()).hexdigest() for p in [build.SOURCE,build.OUTPUT]}
    build.OUTPUT=OUTPUT
    build.build()
    source=OUTPUT.read_text(encoding='utf-8')
    source=source.replace("const LS_KEY = 'fwimp.workbench.v2'", "const LS_KEY = 'fwimp.delivery.v1'")
    # 原生保存和跨会话登记是两个阶段；登记前不报告整项完成。
    old="${updating?'同名更新':'导入'}完成（${secs(s0)}）"
    assert source.count(old)==1
    source=source.replace(old,"${updating?'同名更新':'导入'}资产写入完成，待交付登记（${secs(s0)}）")
    old="r.errs=[e.message||String(e),plan.item.mode==='update'?"
    assert source.count(old)==1
    source=source.replace(old,"r.errs=[e.message||String(e),e.assetsCommitted?'所选资产已保存；未完成的是交付登记，不是粒子构建。请勿删除资产或改序号。':plan.item.mode==='update'?")
    old="failed=true;log(r.as+' 导入中止：'+r.errs[0],'err');"
    assert source.count(old)==1
    source=source.replace(old,"failed=true;inspected=r.id;log(r.as+(e.assetsCommitted?' 交付登记中止：':' 导入中止：')+r.errs[0],'err');")
    old="const statusLabel=r=>r.state==='done'"
    assert source.count(old)==1
    source=source.replace(old,"const statusLabel=r=>deliveryRegistrationOnly(r)?'已保存 · 登记待补齐':r.state==='done'")
    old="else if(chosen.length&&chosen.every(canRun)&&!nameReview)"
    assert source.count(old)==1
    source=source.replace(old,"else if(deliveryRegistrationOnly(r)){action='registration';text='补写交付登记（不重导资产）';}\n    "+old)
    old="if(action==='add')return edit('add');"
    assert source.count(old)==1
    source=source.replace(old,old+"\n    if(action==='registration')return retryDeliveryRegistration(r);")
    old="primary.textContent=phase==='executing'?"
    assert source.count(old)==1
    source=source.replace(old,"primary.textContent=phase==='registration'?'正在补写登记…':phase==='executing'?")
    old='<strong>需要处理后重新检查</strong><p>'
    assert source.count(old)==1
    source=source.replace(old,"<strong>'+(deliveryRegistrationOnly(r)?'资产已保存，需要补齐登记':'需要处理后重新检查')+'</strong><p>")
    old='const action=autoReuse?'
    assert source.count(old)==1
    source=source.replace(old,"const action=deliveryRegistrationOnly(r)?'已保存 · 待登记':autoReuse?")
    marker='  // Receive immutable local publication receipts;'
    assert source.count(marker)==1
    source=source.replace(marker,(HERE/'delivery-material-names.js').read_text(encoding='utf-8')+'\n'+(HERE/'delivery-contract.js').read_text(encoding='utf-8')+'\n'+marker)
    # 不完整/失败的检查没有可执行写入计划，不能再生成连带重名误报。
    old="for(const r of rows().filter(r=>r.selected&&!finished(r)))for(const [key,p]of rowWriteEntries(r)){"
    assert source.count(old)==1
    source=source.replace(old,"for(const r of rows().filter(r=>r.selected&&!finished(r)&&proposals.has(r.id)&&!proposals.get(r.id).errors.length))for(const [key,p]of rowWriteEntries(r)){")
    # 新修订按真实配置名接入；不恢复旧 _Mobile 默认名，不替用户确认。
    old="splitImportName(receipt.name+(p.platform==='mobile'?'_Mobile':''))"
    source=source.replace(old,"splitImportName(p.platform==='mobile'?p.name:receipt.name)")
    old="platform:p.platform});return r;"
    assert source.count(old)==1
    source=source.replace(old,"platform:p.platform});const previous=deliveryPreviousSettings(receipt,p);if(previous){Object.assign(r,previous);syncImportName(r);}else if(['RiseTrail_S','RiseTrail_M','RiseTrail_L'].includes(receipt.name))r.mode=p.platform==='pc'?'update':'create';deliveryApplyScope(r,receipt);return r;")
    marker='  // Current-package workspace.'
    assert source.count(marker)==1
    source=source.replace(marker,(HERE/'delivery-workspace-state.js').read_text(encoding='utf-8')+'\n'+marker)
    anchor="    $('queueSummary').textContent=chosen.length+' / '+rows().length+' 包已选';"
    assert source.count(anchor)==1
    source=source.replace(anchor,anchor+'\n    window.FwDeliveryPresentation?.sync(deliveryView());')
    anchor="policyOpen=previousPolicy?.dataset.policyRecord===r?.id&&previousPolicy?.open;"
    assert source.count(anchor)==1
    source=source.replace(anchor,"policyOpen=previousPolicy&&previousPolicy.dataset.policyRecord===r?.id?previousPolicy.open:window.FwDeliveryPresentation?.policyExpanded(r?.id);")
    anchor="    $('btnConfirmNames').disabled=locked()||!!editor||!storageOK||!reviewValid();"
    assert source.count(anchor)==1
    source=source.replace(anchor,anchor+'\n    window.FwDeliveryPresentation?.sync(deliveryView());')
    anchor='return{init,setPane,toast,errorField,decorateFields,syncPanes};'
    assert source.count(anchor)==1
    source=source.replace(anchor,'return{icon,init,setPane,toast,errorField,decorateFields,syncPanes};')
    anchor="phase='executing';stopRequested=false;let completed=0,failed=false;endReadCache();"
    assert source.count(anchor)==1
    source=source.replace(anchor,anchor+"window.FwDeliveryPresentation?.executionStart(chosen.map(r=>r.id));")
    anchor='return{acceptDelivery,deliveryState,init,'
    assert source.count(anchor)==1
    source=source.replace(anchor,'return{deliveryView,selectDeliveryPlatform,acceptDelivery,deliveryState,init,')
    source=source.replace('let following=true;', "let following=true, deliveryLogFrame=0, deliveryLogHeight='';",1)
    old="document.documentElement.style.setProperty('--wb-log-height',Math.ceil(height)+'px');"
    new="deliveryLogHeight=Math.ceil(height)+'px';if(!deliveryLogFrame)deliveryLogFrame=requestAnimationFrame(()=>{deliveryLogFrame=0;if(document.documentElement.style.getPropertyValue('--wb-log-height')!==deliveryLogHeight)document.documentElement.style.setProperty('--wb-log-height',deliveryLogHeight);});"
    assert source.count(old)==1
    source=source.replace(old,new,1)
    # 本机同步8（10-13）：版本管理离线 / 状态没取到时，本机已迁出（可写）的文件按迭代更新。
    source=delivery_sc_offline.apply(source)
    css='\n'.join((shared/name).read_text(encoding='utf-8') for name in ['tokens.css','components.css'])+'\n'+(HERE/'delivery-presentation.css').read_text(encoding='utf-8')
    source=source.replace('</style>',css+'\n</style>',1)
    source=source.replace('<title>DF 特效工作台 · v'+build.VERSION+'</title>','<title>烘焙器 · 资源交付</title>')
    bridge=(shared/'icons.js').read_text(encoding='utf-8')+'\n'+(HERE/'delivery-bridge.js').read_text(encoding='utf-8')+'\n'+(HERE/'delivery-presentation.js').read_text(encoding='utf-8')
    marker='checkConn();\n</script>'
    assert source.count(marker)==1
    source=source.replace(marker,'checkConn();\n'+bridge+'\n</script>')
    OUTPUT.write_text(source,encoding='utf-8')
    for path,expected in originals.items():assert hashlib.sha256(path.read_bytes()).hexdigest()==expected,str(path)+' changed'
    print('Independent delivery entry:',OUTPUT)
    print('Baker file-entry runtime:',sync_file_runtime(shared))

if __name__=='__main__':main()
