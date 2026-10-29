"""Material B 评审入口的树观察与贴图/交付工作区回归。

默认检查原有39项树观察/临时右栏与52项工作区断言。复用既有隔离
上下文、假烘焙和暂停RAF；不截图、不做视觉浏览、不真烘焙/导出/UE。
不适用于旧布局；只测试ui=material-b。未烘焙RT6列表由产品自行建立，
不得在检查中调用rtLayerBarSync补列表。W14仅在--with-w14时追加。

用法：
  python -X utf8 analysis/scripts/MaterialB评审检查.py --out analysis/local/MaterialB评审检查.json
  python -X utf8 analysis/scripts/MaterialB评审检查.py --expect-version <待测版本> --with-w14
"""
import argparse
import asyncio
import datetime
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'analysis/scripts'))
from browser_runtime import launch_async, validation_url, verify_validation_source

spec = importlib.util.spec_from_file_location('material_b_existing_checks', ROOT / 'analysis/scripts/界面状态检查.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

COMMON = r"""(() => {
  window.__treeChecks = [];
  window.__treeInfo = {};
  window.__treeCheck = (ok, name, data = null) => __treeChecks.push({pass: !!ok, name, data});
  window.__treeWait = () => new Promise(resolve => setTimeout(resolve, 90));
  const canonical = x => Array.isArray(x) ? x.map(canonical) : x && typeof x === 'object'
    ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canonical(x[k])])) : x;
  window.__treeModel = () => JSON.stringify(canonical({P: state.P, M: state.M, layers: state.layers,
    entries: (state.layers || []).map(L => { const e = layerEntryOf(L); return e ? {name: e.name, P: e.P, M: e.M} : null; })}));
  window.__treeAction = async (key, act = 'pick') => {
    const i = (v5.nodes || []).findIndex(n => n.key === key);
    const b = i >= 0 && document.querySelector(`#v5Tree [data-act="${act}"][data-n="${i}"]`);
    if (!b) return false;
    b.click(); await __treeWait(); return true;
  };
  window.__treeReset = async () => {
    const b = document.querySelector('#v5TreeBox .mb-observe-reset');
    if (!b) return false;
    b.click(); await __treeWait(); return true;
  };
  window.__treeState = () => MaterialBTreeReview.getState();
  window.__treeFinish = () => ({pass: __treeChecks.every(c => c.pass), checks: __treeChecks,
    info: __treeInfo, version: VERSION});
  return {version: VERSION, mode: document.body.dataset.ui, treeReview: !!window.MaterialBTreeReview};
})()"""

COMBO = r"""async () => {
  const check = __treeCheck, wait = __treeWait;
  check(!!window.MaterialBTreeReview, '新树控制器存在');
  if (!window.MaterialBTreeReview) return __treeFinish();
  await wait();
  const before = __treeModel(), start = __treeState();
  const layer = (v5.nodes || []).find(n => n.kind === 'layer' && n.solo?.can);
  __treeInfo.initial = {layers: state.layers.length, selected: state.comboSel, status: start.status,
    titleCount: document.querySelectorAll('#v5TreeBox .v5-r1 .v5-name').length};
  check(!!layer, '金曜菊树含可独看的真实层');
  if (layer) {
    check(await __treeAction(layer.key, 'solo'), '通过树只看按钮操作');
    check(state.layerView.solo === layer.i && __treeModel() === before,
      '金曜菊只看只改临时观察，不改 P/M/层输出', {solo: state.layerView.solo, layer: layer.i});
    check(__treeState().status.includes(layerName(layer.i)), '树状态显示正在只看的层', __treeState().status);
    check(await __treeReset(), '树内恢复全部入口存在');
    check(state.layerView.solo === -1 && !(state.layerView.mute || []).length && __treeModel() === before,
      '恢复全部清临时观察并保持配方');
    check(!__treeState().status && document.querySelector('.mb-observe-reset').disabled,
      '恢复后状态清空、恢复按钮禁用');
  }
  const eyeNode = (v5.nodes || []).find(n => n.kind === 'layer' && n.eye?.can && n.eye.on);
  if (!eyeNode) check(false, '有独立配方显示眼睛');
  else {
    check(await __treeAction(eyeNode.key, 'eye'), '配方眼睛通过原树按钮操作');
    check(layerOff(state.layers[eyeNode.i]) && __treeModel() !== before,
      '眼睛关闭确实改变配方/导出层，而不是临时只看');
    const offModel = __treeModel();
    await __treeReset();
    check(layerOff(state.layers[eyeNode.i]) && __treeModel() === offModel,
      '恢复观察不会重新打开配方眼睛');
    await __treeAction(eyeNode.key, 'eye');
    check(!layerOff(state.layers[eyeNode.i]) && __treeModel() === before,
      '再开眼睛回到原配方');
  }
  __treeInfo.final = {status: __treeState().status, solo: state.layerView.solo};
  return __treeFinish();
}"""

TRAIL = r"""async () => {
  const check = __treeCheck, wait = __treeWait;
  check(!!window.MaterialBTreeReview, 'RT6新树控制器存在');
  if (!window.MaterialBTreeReview) return __treeFinish();
  await wait();
  const before = __treeModel(), initial = __treeState(), keys = initial.items.map(x => x.k);
  __treeInfo.initial = {view: state.view, platform: state.platform, baked: !!state.bake,
    bakeCalls: __bakes.length, keys, note: initial.note};
  check(!state.bake && !__bakes.length, 'RT6列表检查从未烘焙状态开始', __treeInfo.initial);
  check(keys.includes('near') && keys.includes('far'), 'RT6未烘焙已有近段与远段列表', keys);
  check(new Set(keys).size === keys.length, '观察列表无重复键');
  check(__treeModel() === before, '初始元数据和建树不改变配方');
  const output = (v5.nodes || []).find(n => n.key === 't:输出');
  check(!!output, '原输出节点保留');
  if (output && output.tw === 'closed') await __treeAction(output.key, 'tw');
  await wait();
  const boxes = [...document.querySelectorAll('#v5Tree [data-mb-rt-observe]')];
  __treeInfo.checksVisible = boxes.map(x => ({key: x.dataset.mbRtObserve, checked: x.checked,
    visible: !!x.offsetParent && getComputedStyle(x).display !== 'none'}));
  check(boxes.some(x => x.dataset.mbRtObserve === 'near' && x.offsetParent)
    && boxes.some(x => x.dataset.mbRtObserve === 'far' && x.offsetParent),
    '近远段观察勾选位于展开输出树并可见', __treeInfo.checksVisible);
  const click = async key => {
    const b = document.querySelector(`#v5Tree [data-mb-rt-observe="${key}"]`);
    if (!b) return false;
    b.click(); await wait(); return true;
  };
  if (keys.includes('near') && keys.includes('far') && boxes.length) {
    await click('near');
    check(rtShow.off.has('near') && !rtShow.off.has('far') && __treeModel() === before,
      '取消近段只关近段观察，不改变配方/远段');
    await click('far');
    check(rtShow.off.has('near') && rtShow.off.has('far') && __treeModel() === before,
      '独立勾选允许多项暂不看，不被单选替代');
    await click('near');
    check(!rtShow.off.has('near') && rtShow.off.has('far') && __treeModel() === before,
      '重勾近段保留远段关闭状态');
    const index = (v5.nodes || []).findIndex(n => n.key === 'o:far');
    const name = document.querySelector(`#v5Tree .v5-name[data-n="${index}"]`);
    check(!!name, '远段树行可用于双击只看');
    if (name) {
      name.dispatchEvent(new MouseEvent('dblclick', {bubbles: true})); await wait();
      check(!rtShow.off.has('far') && keys.every(k => k === 'far' || rtShow.off.has(k)),
        '双击远段只看该输出，其他项全部暂不看', {off: [...rtShow.off], status: __treeState().status});
      check(__treeModel() === before, '双击只看仍不改配方');
    }
    await __treeReset();
    check(!rtShow.off.size && __treeState().items.every(x => x.observed) && __treeModel() === before,
      '恢复全部还原原多选集合，不改配方');
    check(!__treeState().status, '恢复后观察状态与树勾选一致');
  }
  const eye = (v5.nodes || []).find(n => n.kind === 'emit' && n.eye?.can && n.eye.on);
  check(!!eye, 'RT6原发射器的配方眼睛保留');
  if (eye) {
    await __treeAction(eye.key, 'eye');
    check(__treeModel() !== before && !rtShow.off.size, 'RT6配方眼睛与观察勾选互不冒充');
    const off = __treeModel(); await __treeReset();
    check(__treeModel() === off, '恢复观察保留RT6配方眼睛关闭');
    await __treeAction(eye.key, 'eye');
    check(__treeModel() === before, 'RT6眼睛再开恢复原配方');
  }
  __treeInfo.final = __treeState();
  return __treeFinish();
}"""

DELIVERY = r"""async () => {
  const check = __treeCheck, wait = __treeWait;
  const visible = () => !!document.getElementById('right').offsetParent
    && getComputedStyle(document.getElementById('right')).display !== 'none';
  const before = __treeModel(), saved = store.get('rightOn', true);
  setPanels({right: true}); await wait();
  const original = panels.right;
  toggleDeliv(true); await wait();
  check(stage2.deliv && !visible() && panels.right === original,
    '进入交付暂收编辑栏并保留原开关');
  document.getElementById('btnRight').click(); await wait();
  check(visible() && panels.right === original && document.getElementById('btnRight').getAttribute('aria-pressed') === 'true',
    '交付可主动打开编辑栏且不改原偏好');
  document.getElementById('rightClose').click(); await wait();
  check(!visible() && panels.right === original, '交付关闭按钮只收临时编辑栏');
  document.getElementById('btnRight').click(); await wait();
  document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); await wait();
  check(!visible() && panels.right === original, '交付Esc只收临时编辑栏');
  toggleDeliv(false); await wait();
  check(visible() && panels.right === original, '退出交付恢复原打开状态');
  setPanels({right: false}); await wait();
  toggleDeliv(true); await wait();
  document.getElementById('btnRight').click(); await wait();
  check(visible() && !panels.right, '原栏关闭时交付仍可临时打开');
  toggleDeliv(false); await wait();
  check(!visible() && !panels.right, '退出交付恢复原关闭状态');
  __treeInfo.preference = {before: saved, after: store.get('rightOn', true), fixture: 'setPanels为隔离上下文开/关两种原状态夹具'};
  check(__treeModel() === before, '交付临时栏操作不改变 P/M/层与输出方案');
  return __treeFinish();
}"""

WORKSPACE = r"""async (options) => {
  const checks=[],info={},check=(ok,name,data=null)=>checks.push({pass:!!ok,name,data});
  const wait=()=>new Promise(r=>setTimeout(r,120));
  const api=()=>MaterialBDeliveryReview.getState();
  const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'
    ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
  // 换查看层会切换当前state.P/M，完整配方以全部真实层及其条目P/M核对。
  const recipe=()=>canonical(state.tab==='combo'?{layers:state.layers,entries:state.layers.map(L=>{
    const e=layerEntryOf(L);return e?{name:e.name,P:e.P,M:e.M}:null;})}:{P:state.P,M:state.M});
  const diff=(a,b,path='')=>JSON.stringify(a)===JSON.stringify(b)?[]:a&&b&&typeof a==='object'&&typeof b==='object'
    ?[...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(k=>diff(a[k],b[k],path+'.'+k)).slice(0,12):[path];
  const visible=e=>!!e?.offsetParent&&getComputedStyle(e).display!=='none';
  check(!!window.MaterialBDeliveryReview,'96工作区控制器存在');
  if(!window.MaterialBDeliveryReview)return {pass:false,checks,info};
  check(!options.expectVersion||VERSION===options.expectVersion,'真实页面版本符合可选预期',VERSION);
  // 原眼睛关闭第1层，建立dv-off夹具；这一步明确改变测试配方，后续只读交互都必须保留它。
  const i=(v5.nodes||[]).findIndex(n=>n.kind==='layer'&&n.i===0),eye=i>=0&&document.querySelector(`#v5Tree [data-act="eye"][data-n="${i}"]`);
  check(!!eye,'dv-off夹具通过真实配方眼睛建立');
  eye?.click();await wait();
  check(layerOff(state.layers[0]),'第1层确已关闭配方显示');
  const before=recipe(),same=name=>{const after=recipe(),changes=diff(before,after);check(!changes.length,name,changes);};
  const frame=document.getElementById('viewFrame'),list=document.getElementById('delivView');
  setPanels({right:true});await wait();const right0=panels.right,pref0=store.get('rightOn',true);
  const flow=document.querySelector('#viewSeg [data-view="flow"]');
  check(!!flow&&flow.textContent==='贴图与交付','主入口使用贴图与交付');
  flow.click();await wait();
  check(stage2.deliv&&api().active&&state.view==='atlas'&&stage2.inspectFlow,'flow进入共享工作区的贴图流转子模式',api());
  check(document.getElementById('viewFrame')===frame&&document.getElementById('delivView')===list&&!list.hidden,'工作区复用原预览与交付清单节点');
  check(!visible(document.getElementById('right'))&&panels.right===right0&&store.get('rightOn',true)===pref0,'工作区临时收右栏而不改偏好');
  same('flow进入不改变完整P/M/层与输出');
  const modes=document.getElementById('mbInspectModes');
  check(visible(modes)&&modes.querySelectorAll('[data-mb-inspect]').length===2,'只有回放与贴图两个子模式');
  for(const mode of ['export','atlas']){
    modes.querySelector(`[data-mb-inspect="${mode}"]`).click();await wait();
    check(stage2.deliv&&api().active&&api().mode===mode&&state.view===mode&&stage2.inspectFlow===(mode==='atlas'),
      `${mode}子模式切换保留交付工作区`,api());
    check(document.querySelector('#viewSeg [data-view="flow"]').getAttribute('aria-pressed')==='true',`${mode}时主入口仍选中`);
    same(`${mode}切换不改变完整配方`);
  }
  const links=[...document.querySelectorAll('#delivView [data-mb-inspect-layer]')];
  info.layerLinks=links.map(b=>({index:b.dataset.mbInspectLayer,text:b.textContent,row:b.closest('tr').className}));
  check(links.length===state.layers.length&&new Set(links.map(b=>b.dataset.mbInspectLayer)).size===state.layers.length,'清单每层都保留唯一查看入口',info.layerLinks);
  check(links.every(b=>b.textContent.trim()),'层查看入口有真实可读名称');
  const off=document.querySelector('#delivView tr.dv-off [data-mb-inspect-layer]');
  check(!!off,'眼睛关闭的dv-off行也能查看');
  for(const index of [0,1,2].filter(i=>state.layers[i])){
    document.querySelector(`#delivView [data-mb-inspect-layer="${index}"]`)?.click();await wait();
    check(stage2.deliv&&state.comboSel===index&&comboAtlasLayer()===index&&state.view==='atlas',`清单层${index+1}切到原selectComboLayer且保留工作区`);
    check(document.querySelector(`#delivView [data-mb-inspect-layer="${index}"]`)?.getAttribute('aria-current')==='true',`清单层${index+1}当前态正确`);
    same(`查看层${index+1}不改变完整配方`);
  }
  check(layerOff(state.layers[0]),'查看关闭层不会打开其配方眼睛');
  showLowReplay();await wait();
  check(stage2.deliv&&api().mode==='export'&&state.view==='export'&&!stage2.inspectFlow,'原showLowReplay只切回放，不退出新工作区');
  same('原回放跳转不改变配方');
  // 清单收起只是工作区内的临时呈现，不调用旧toggleDeliv(false)。
  const mode0=api().mode;
  document.getElementById('dvBack')?.click();await wait();
  check(stage2.deliv&&api().collapsed&&!visible(list)&&visible(document.getElementById('mbDeliveryShow'))&&state.view===mode0,'收起清单保留工作区及当前预览模式');
  document.getElementById('mbDeliveryShow').click();await wait();
  check(stage2.deliv&&!api().collapsed&&visible(list),'显示清单恢复原工作区清单');
  same('清单收起/显示不改变配方');
  // 原分隔器处理键盘；用边界先建立可预测基准，再核对16px方向及偏好。
  const split=document.getElementById('mbDeliverySplit'),key=value=>split.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true}));
  check(visible(split)&&split.getAttribute('role')==='separator'&&split.getAttribute('aria-orientation')==='vertical','宽度分隔器可发现且有原生可访问语义');
  split.focus();key('Home');await wait();const min=+split.getAttribute('aria-valuemin'),home=+split.getAttribute('aria-valuenow');
  check(home===min&&api().width===home&&store.get('mbDeliveryWidth')===home,'Home到最小宽度并保存偏好',{min,home,width:api().width});
  key('ArrowLeft');await wait();const left=+split.getAttribute('aria-valuenow');
  check(left===home+16&&store.get('mbDeliveryWidth')===left,'左箭头扩大清单16px');
  key('ArrowRight');await wait();check(+split.getAttribute('aria-valuenow')===home,'右箭头缩小清单16px');
  key('End');await wait();const max=+split.getAttribute('aria-valuemax'),end=+split.getAttribute('aria-valuenow');
  check(end===max&&store.get('mbDeliveryWidth')===end,'End到最大宽度并保存偏好',{end,max});
  split.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));await wait();
  check(api().width===0&&store.get('mbDeliveryWidth')===0&&+split.getAttribute('aria-valuenow')>=min,'双击恢复自动宽度');
  key('Home');key('ArrowLeft');await wait();const kept=api().width;
  info.keptWidth=kept;
  same('宽度偏好不改变配方');
  document.querySelector('#viewSeg [data-view="live"]').click();await wait();
  check(!stage2.deliv&&!api().active&&state.view==='live'&&!stage2.inspectFlow,'主实时入口离开工作区');
  check(visible(document.getElementById('right'))&&panels.right===right0&&store.get('rightOn',true)===pref0,'离开恢复原右栏打开状态和偏好');
  flow.click();await wait();
  check(stage2.deliv&&api().mode==='export'&&state.view==='export','回到主入口记住上次回放子模式',api());
  check(api().width===kept&&+split.getAttribute('aria-valuenow')===kept,'回到主入口保留宽度偏好');
  document.querySelector('#viewSeg [data-view="live"]').click();await wait();
  toggleDeliv(true);await wait();
  check(stage2.deliv&&api().active&&document.querySelector('#viewSeg [data-view="flow"]').getAttribute('aria-pressed')==='true','原交付toggle入口进入同一个工作区');
  toggleDeliv(false);await wait();
  check(!stage2.deliv&&!stage2.inspectFlow,'原关闭命令仍可离开');
  setPanels({right:false});await wait();const offPref=store.get('rightOn',true);
  flow.click();await wait();document.getElementById('btnRight').click();await wait();
  check(visible(document.getElementById('right'))&&!panels.right,'原右栏关闭时仍能临时查看编辑');
  document.querySelector('#viewSeg [data-view="live"]').click();await wait();
  check(!visible(document.getElementById('right'))&&!panels.right&&store.get('rightOn',true)===offPref,'离开恢复原右栏关闭状态及偏好');
  same('工作区完整往返不改变完整P/M/层与输出');
  info.final={...api(),inspectFlow:stage2.inspectFlow,selectedLayer:state.comboSel,view:state.view,widthPreference:store.get('mbDeliveryWidth'),modePreference:store.get('mbInspectMode')};
  return {pass:checks.every(c=>c.pass),checks,info,version:VERSION};
}"""

async def verify_page(pg, expected_version=None):
    actual = await pg.evaluate('({version: VERSION, ui: document.body.dataset.ui})')
    if actual['ui'] != 'material-b':
        raise RuntimeError('本检查只适用于ui=material-b，停止旧入口测试')
    if expected_version and actual['version'] != expected_version:
        raise RuntimeError(f"页面版本 {actual['version']} 与预期 {expected_version} 不符，停止")
    return actual


async def run_tree_case(p, browser, kind, expected_version):
    ctx, pg, errors = await asyncio.wait_for(base.fresh(p, browser), timeout=45)
    try:
        await verify_page(pg, expected_version)
        await pg.evaluate('setAutoBake(false); state.playing=false; 0')
        entry = 'GLB-S1' if kind == '金曜菊' else 'RT6L' if kind == 'RT6未烘焙' else None
        if entry:
            await pg.evaluate('async id => {const e=entryById(id);if(!e)throw Error("缺真实条目"+id);await Promise.resolve(openReview(e));return 0;}', entry)
            await base.idle(pg)
            if kind == '金曜菊':
                await pg.evaluate('selectComboLayer(1); 0')
        else:
            await pg.evaluate('openType("kiku"); 0')
            await base.idle(pg)
        await pg.wait_for_timeout(180)
        await pg.evaluate(COMMON)
        result = await asyncio.wait_for(pg.evaluate({'金曜菊': COMBO, 'RT6未烘焙': TRAIL, '交付恢复': DELIVERY}[kind]), timeout=45)
        result['case'] = kind
        result['pageErrors'] = errors
        if errors:
            result['pass'] = False
        return result
    finally:
        await ctx.close()


async def run_workspace_case(p, browser, expected_version):
    ctx, pg, errors = await asyncio.wait_for(base.fresh(p, browser), timeout=45)
    try:
        await verify_page(pg, expected_version)
        await pg.set_viewport_size({'width': 1920, 'height': 1080})
        await pg.evaluate('setAutoBake(false);state.playing=false;0')
        await pg.evaluate("async()=>{await Promise.resolve(openReview(entryById('GLB-S1')));return 0;}")
        await base.idle(pg)
        await pg.evaluate('selectComboLayer(1);0')
        await pg.wait_for_timeout(200)
        result = await asyncio.wait_for(pg.evaluate(WORKSPACE, {'expectVersion': expected_version}), timeout=60)
        expected = result.get('info', {}).get('final', {})
        # 同一隔离来源刷新，核实两个布局偏好确实经原store持久化。
        await pg.reload(wait_until='load')
        await pg.wait_for_function('window.MaterialBDeliveryReview&&window.__fw')
        await verify_page(pg, expected_version)
        restored = await pg.evaluate('({version:VERSION,state:MaterialBDeliveryReview.getState(),width:store.get("mbDeliveryWidth"),mode:store.get("mbInspectMode")})')
        result['reload'] = restored
        result['checks'].append({'pass': restored['state']['mode'] == expected.get('modePreference')
            and restored['width'] == expected.get('widthPreference') and restored['state']['width'] == expected.get('widthPreference'),
            'name': '刷新后模式和宽度偏好通过原store恢复', 'data': restored})
        result['pageErrors'] = errors
        result['checks'].append({'pass': not errors, 'name': '无页面脚本错误', 'data': errors})
        result['case'] = '贴图与交付工作区'
        result['pass'] = all(check['pass'] for check in result['checks'])
        return result
    finally:
        await ctx.close()


def review_url(value):
    parts = urlsplit(validation_url(value, ROOT / 'tool/FireworkBaker.html'))
    query = parse_qsl(parts.query, keep_blank_values=True)
    if any(key == 'ui' and mode != 'material-b' for key, mode in query):
        raise ValueError('本检查仅适用于ui=material-b')
    # 固定关闭启动烘焙；所有测试场景仍通过原setAutoBake建立相同夹具。
    query = [(key, val) for key, val in query if key not in ('ui', 'autobake')]
    query.extend([('ui', 'material-b'), ('autobake', '0')])
    return urlunsplit(parts._replace(query=urlencode(query)))


def report_case(case):
    print(json.dumps({'case': case['case'], 'pass': case['pass'], 'checks': len(case.get('checks', [])),
        'failed': [check for check in case.get('checks', []) if not check['pass']],
        'exception': case.get('exception'), 'pageErrors': case.get('pageErrors', [])}, ensure_ascii=False), flush=True)


async def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--html', default='http://127.0.0.1:8034/baker?ui=material-b&autobake=0')
    ap.add_argument('--expect-version', default=None, help='可选；指定时页面版本必须完全相同')
    ap.add_argument('--with-w14', action='store_true', help='追加既有W14，不修改其门槛')
    ap.add_argument('--out', default=str(ROOT / 'analysis/local/MaterialB评审检查.json'))
    args = ap.parse_args()
    result = {'at': datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(),
        'boundary': '隔离Playwright上下文、既有假烘焙及暂停RAF；验证真实新ui的DOM/控制器/配方，不截图、不验证像素/GPU/真实素材包/UE。',
        'expectedVersion': args.expect_version, 'withW14': args.with_w14, 'cases': []}
    try:
        pre = subprocess.run([sys.executable, '-X', 'utf8', str(ROOT / 'tool/local_http/preflight.py'), '--tool', 'baker'],
            cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
        result['preflight'] = {'code': pre.returncode, 'stdout': pre.stdout.strip(), 'stderr': pre.stderr.strip()}
        if pre.returncode:
            raise RuntimeError('HTTP预检失败，停止浏览器测试')
        base.HTML = review_url(args.html)
        verify_validation_source(base.HTML, ROOT / 'tool/FireworkBaker.html')
        result['source'] = {'url': base.HTML, 'path': str(ROOT / 'tool/FireworkBaker.html'),
            'sha256': hashlib.sha256((ROOT / 'tool/FireworkBaker.html').read_bytes()).hexdigest(),
            'httpBytesVerified': urlsplit(base.HTML).scheme in ('http', 'https')}
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await launch_async(p)
            try:
                for kind in ['金曜菊', 'RT6未烘焙', '交付恢复', '贴图与交付工作区']:
                    try:
                        case = await (run_workspace_case(p, browser, args.expect_version) if kind == '贴图与交付工作区'
                            else run_tree_case(p, browser, kind, args.expect_version))
                    except Exception as error:
                        case = {'case': kind, 'pass': False, 'exception': str(error)}
                    result['cases'].append(case)
                    report_case(case)
                if args.with_w14:
                    try:
                        ok, why = await base.w14(p, browser)
                        case = {'case': 'W14', 'pass': bool(ok), 'why': why}
                    except Exception as error:
                        case = {'case': 'W14', 'pass': False, 'exception': str(error)}
                    result['cases'].append(case)
                    report_case(case)
            finally:
                await browser.close()
        result['pass'] = len(result['cases']) == 4 + int(args.with_w14) and all(case['pass'] for case in result['cases'])
    except Exception as error:
        result['pass'] = False
        result['exception'] = str(error)
    result['checks'] = sum(len(case.get('checks', [])) for case in result['cases'])
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'pass': result['pass'], 'checks': result['checks'], 'path': str(out),
        'exception': result.get('exception')}, ensure_ascii=False), flush=True)
    return 0 if result['pass'] else 1


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
