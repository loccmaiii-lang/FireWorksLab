"""完整 Material B 入口的组件分类与真实 DOM 几何契约。

复用 browser_runtime、界面状态检查的隔离上下文/FAKE/暂停RAF；不截图、
不做视觉浏览、不修改用户浏览器档案、不真烘焙/导出/UE。没有组件API时
记录部分失败，继续量原控件；绝不在测试中添加组件class或补造树/观察数据。
iframe导入器是独立文档边界，仅量父页原资源外壳，不宣称其内部统一。
组合角色补充7项：库标题inline动作、Ramp方色井、原undoToast按钮/回调、
原busy函数的进度轨25%/75%。只经原DOM和控制器建立夹具，不注入样式。

用法：python -X utf8 analysis/scripts/MaterialB组件检查.py --expect-version <版本> --out analysis/local/MaterialB组件检查.json
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

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'analysis/scripts'))
from browser_runtime import launch_async, validation_url, verify_validation_source

spec = importlib.util.spec_from_file_location('component_existing_checks', ROOT / 'analysis/scripts/界面状态检查.py')
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

COMMON = r"""(() => {
  window.__cc = {checks: [], info: {regions: []}};
  window.__ccCheck = (ok, name, data = null) => __cc.checks.push({pass: !!ok, name, data});
  window.__ccWait = async () => { await new Promise(r => setTimeout(r, 100)); window.MaterialBComponents?.sync(); await new Promise(r => setTimeout(r, 40)); };
  window.__ccVisible = e => {
    if (!e || !e.getClientRects().length) return false;
    for (let p=e; p && p!==document.body; p=p.parentElement) {
      const s=getComputedStyle(p);
      if(p.hidden || s.display==='none' || s.visibility==='hidden') return false;
      if(p.tagName==='DETAILS' && !p.open && !p.querySelector(':scope>summary')?.contains(e)) return false;
    }
    const r=e.getBoundingClientRect();return r.width>0&&r.height>0;
  };
  window.__ccRect = e => {
    if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);
    return {id:e.id,tag:e.tagName,type:e.type||'',component:e.dataset.mbComponent||'',cls:e.className,
      x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,
      opacity:s.opacity,whiteSpace:s.whiteSpace,border:s.borderColor,font:s.fontSize,line:s.lineHeight,
      disabled:!!e.disabled,readonly:!!e.readOnly,role:e.getAttribute('role'),checked:e.checked};
  };
  window.__ccOpen = e => { for(let p=e;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true; };
  window.__ccExpected = e => {
    if(e.tagName==='BUTTON')return ['button','icon-button'];
    if(e.tagName==='SUMMARY')return ['summary'];if(e.tagName==='SELECT')return ['select'];
    if(e.tagName==='TEXTAREA')return ['textarea'];
    if(e.type==='range')return ['slider'];if(e.type==='color')return ['color'];
    if(e.type==='radio')return ['radio'];if(e.type==='checkbox')return [e.getAttribute('role')==='switch'?'switch':'checkbox'];
    return ['input'];
  };
  window.__ccRegion = (root, name) => {
    if(!root){__ccCheck(false,name+'原DOM存在');return;}
    const eligible=[...root.querySelectorAll('button,input:not([type=hidden]):not([type=file]),select,textarea,summary')].filter(__ccVisible);
    const missing=eligible.filter(e=>!__ccExpected(e).includes(e.dataset.mbComponent));
    const overflow=eligible.filter(e=>{const r=e.getBoundingClientRect();return r.x< -2||r.right>innerWidth+2;});
    __ccCheck(eligible.length>0,name+'有实际可见控件',eligible.length);
    __ccCheck(!missing.length,name+'基本控件按真实类型分类',missing.slice(0,15).map(__ccRect));
    __ccCheck(!overflow.length,name+'可见控件无视口横向裁切',overflow.slice(0,10).map(__ccRect));
    __cc.info.regions.push({name,count:eligible.length,missing:missing.length,geometry:eligible.slice(0,18).map(__ccRect)});
  };
  window.__ccSlots = (root,name) => {
    const rows=[...root.querySelectorAll('.sl')].filter(__ccVisible).filter(r=>r.querySelector(':scope>.num')&&r.querySelector(':scope>.punit'));
    const data=rows.map(row=>{
      const n=row.querySelector(':scope>.num'),u=row.querySelector(':scope>.punit'),r=row.querySelector(':scope>.rrst');
      const rr=row.getBoundingClientRect(),nr=n.getBoundingClientRect(),ur=u.getBoundingClientRect();
      return {label:row._lab||row.querySelector('.k')?.textContent,number:__ccRect(n),unit:__ccRect(u),reset:__ccRect(r),
        rowClass:row.className,offset:[+(rr.right-nr.right).toFixed(2),+(rr.right-ur.right).toFixed(2)],
        classes:row.classList.contains('mb-value-row')&&n.classList.contains('mb-value-number')&&u.classList.contains('mb-value-unit')&&!!r?.classList.contains('mb-value-reset')};
    });
    __ccCheck(rows.length>0,name+'有实际数字/单位行',rows.length);
    __ccCheck(data.every(x=>x.classes),name+'数字/单位/还原使用统一槽标记',data.filter(x=>!x.classes).slice(0,6));
    __ccCheck(data.every(x=>Math.abs(x.unit.width-40)<=1&&x.unit.whiteSpace==='nowrap'),name+'单位40px且不换行',data.filter(x=>Math.abs(x.unit.width-40)>1||x.unit.whiteSpace!=='nowrap').slice(0,8));
    const numOffsets=[...new Set(data.map(x=>Math.round(x.offset[0])))],unitOffsets=[...new Set(data.map(x=>Math.round(x.offset[1])))];
    __ccCheck(numOffsets.length<=1&&unitOffsets.length<=1,name+'数字和单位右侧固定槽同列',{numberOffsets:numOffsets,unitOffsets});
    __cc.info[name+'Slots']=data.slice(0,12);
  };
  window.__ccTree = () => {
    const rows=[...document.querySelectorAll('#v5Tree .v5-row')],badIcon=[],badDepth=[],badName=[],badGuides=[];
    for(const row of rows){
      const n=v5.nodes[+row.dataset.n];if(!n)continue;
      const type=row.querySelector('.mb-node-type[data-mb-type-icon]'),name=row.querySelector('.v5-name');
      if(!type||!__ccVisible(type)||!type.getAttribute('aria-hidden'))badIcon.push(n.key);
      if(+row.getAttribute('aria-level')!==n.lv+1||+row.dataset.mbDepth!==n.lv)badDepth.push({key:n.key,lv:n.lv,aria:row.getAttribute('aria-level'),data:row.dataset.mbDepth});
      if((name?.getAttribute('aria-label')||name?.textContent)!==n.name)badName.push(n.key);
      const guides=row.querySelector(':scope>.mb-tree-guides');
      if(!guides||guides.getAttribute('aria-hidden')!=='true'||n.lv>0&&!guides.querySelector('.mb-tree-guide.is-branch'))badGuides.push(n.key);
    }
    __ccCheck(rows.length>0,'树含真实节点',rows.length);
    __ccCheck(!badIcon.length,'每节点有独立类型图标且不污染可访问名称',badIcon);
    __ccCheck(!badDepth.length,'树真实深度与aria-level保持',badDepth);
    __ccCheck(!badName.length,'树按钮保留完整原aria-name',badName);
    __ccCheck(!badGuides.length,'父子导线来自真实层级且对读屏隐藏',badGuides);
  };
  window.__ccApi = () => {
    const api=window.MaterialBComponents;
    __ccCheck(!!api&&typeof api.sync==='function'&&typeof api.getState==='function','组件同步/覆盖API存在');
    if(!api)return;
    const s=api.getState();__cc.info.componentState=s;
    __ccCheck(!!s.counts&&typeof s.counts==='object','API报告实际分类counts',s.counts);
    const u=s.unclassified;__ccCheck(Array.isArray(u)?u.length===0:u===0,'API报告无未分类控件',u);
  };
  window.__ccFinish = () => ({pass:__cc.checks.every(c=>c.pass),checks:__cc.checks,info:__cc.info,version:VERSION});
  return 0;
})()"""

SCHEMA = r"""async () => {
  await __ccWait();__ccApi();selectEmitTab('全部');await __ccWait();
  const check=__ccCheck,row=panelRows.find(([,it])=>it.sel==='burstFlowOn')?.[0];
  check(!!row,'爆后扰动原Schema行存在');
  if(row){
    __ccOpen(row);await __ccWait();const sw=row.querySelector('input[type=checkbox]'),sel=row.querySelector('select');
    check(!!sw&&sw.type==='checkbox','爆后扰动仍为原checkbox增强');
    if(sw){const r=__ccRect(sw);check(Math.abs(r.width-36)<=1&&Math.abs(r.height-20)<=1&&r.role==='switch','Schema开关36×20',r);
      const p0=state.P.burstFlowOn,c0=sw.checked;sw.click();await __ccWait();check(sw.checked!==c0&&!!+state.P.burstFlowOn===sw.checked&&sel.value===String(state.P.burstFlowOn),'Schema开关沿用原checked/change写值');
      sw.click();await __ccWait();check(state.P.burstFlowOn===p0&&sw.checked===c0,'Schema开关二次操作可回原值');}
  }
  const record=panelRows.find(([,it])=>Array.isArray(it)&&it[0]==='stars'),lr=record?.[0];
  if(lr){__ccOpen(lr);await __ccWait();const lock=lr.querySelector('.lk'),num=lr.querySelector('.num');
    const v=+state.P.stars;lock.click();await __ccWait();const r=__ccRect(num),ro=+getComputedStyle(lr).opacity;
    check(state.locks.has('stars')&&!num.disabled&&!num.readOnly&&ro>=.99&&+r.opacity>=.99,'锁定仍可编辑，未套禁用opacity',{rowOpacity:ro,input:r});
    num.value=String(v+1);num.dispatchEvent(new Event('change',{bubbles:true}));await __ccWait();
    check(+state.P.stars===v+1,'锁定仍经过原数值监听可改参数');
    const reset=lr.querySelector('.rrst');check(!!reset&&!reset.hidden&&__ccVisible(reset),'改动后的还原真实可见',__ccRect(reset));
    if(reset&&!reset.hidden)reset.click();lock.click();await __ccWait();}
  // 展开既有模块只为了量真实控件，不添加任何组件class。
  document.querySelectorAll('#params details.mod').forEach(d=>d.open=true);await __ccWait();
  __ccRegion(document.getElementById('params'),'Schema全部');__ccSlots(document.getElementById('params'),'Schema全部');__ccTree();
  const scopes=[...document.querySelectorAll('#params .etabs [data-e]')].filter(b=>!b.hidden).map(b=>b.dataset.e);
  for(const scope of scopes){selectEmitTab(scope);await __ccWait();__ccRegion(document.getElementById('params'),'Schema/'+scope);}
  return __ccFinish();
}"""

LAYERS = r"""async () => {
  await __ccWait();__ccApi();selectEmitTab('全部');document.querySelectorAll('#params details').forEach(d=>d.open=true);await __ccWait();
  const L=state.layers[state.comboSel],mirror=[...document.querySelectorAll('#lhPos>.check input[type=checkbox]')].find(e=>e.parentElement.textContent.includes('水平镜像'));
  __ccCheck(!!mirror,'原层头水平镜像checkbox存在');
  if(mirror){const original=mirror,before=!!L.mirror,checked=mirror.checked;let changes=0;mirror.addEventListener('change',()=>changes++);
    window.MaterialBComponents?.sync();await __ccWait();
    const r=__ccRect(mirror);__ccCheck(mirror===original&&mirror.type==='checkbox'&&mirror.isConnected,'镜像保留原checkbox节点及checked模型');
    __ccCheck(r.component==='switch'&&r.role==='switch'&&Math.abs(r.width-36)<=1&&Math.abs(r.height-20)<=1,'镜像同样36×20开关',r);
    mirror.click();await __ccWait();__ccCheck(mirror.checked!==checked&&!!L.mirror===mirror.checked&&changes===1,'镜像change只执行一次并写原值');
    mirror.click();await __ccWait();__ccCheck(!!L.mirror===before&&changes===2,'镜像二次操作保留原事件');}
  const links=[...document.querySelectorAll('#lhLink [data-link]')];links.forEach(__ccOpen);await __ccWait();
  __ccCheck(links.length>0,'真实我的效果有同批星选择列表');
  __ccCheck(links.every(e=>e.type==='checkbox'&&e.getAttribute('role')!=='switch'&&e.dataset.mbComponent==='checkbox'&&Math.abs(e.getBoundingClientRect().width-18)<=1&&Math.abs(e.getBoundingClientRect().height-18)<=1),'选择型联动checkbox为18px，未误转开关',links.map(__ccRect));
  const enable=document.querySelector('#eventInstancePanel [data-event-enable]');
  __ccCheck(!!enable,'出生方式原启用控件存在');
  if(enable&&!enable.checked){enable.click();await __ccWait();}
  const birth=document.getElementById('eventInstancePanel');__ccOpen(birth);await __ccWait();
  __ccRegion(birth,'出生扩展');__ccSlots(birth,'出生扩展');
  __ccRegion(document.getElementById('lhPos'),'普通层头');__ccSlots(document.getElementById('lhPos'),'普通层头');
  __ccRegion(document.getElementById('lhLink'),'轨迹联动');
  selectEmitTab('输出');await __ccWait();__ccOpen(document.getElementById('lhOut'));await __ccWait();__ccRegion(document.getElementById('lhOut'),'层输出');
  __ccTree();return __ccFinish();
}"""

SPECIAL = r"""async (kind) => {
  await __ccWait();__ccApi();selectEmitTab('全部');document.querySelectorAll('#params details.mod').forEach(d=>d.open=true);await __ccWait();
  __ccRegion(document.getElementById('params'),kind+'实际参数');__ccSlots(document.getElementById('params'),kind+'实际参数');
  __ccOpen(document.getElementById('colorControls'));await __ccWait();
  __ccRegion(document.getElementById('colorControls'),kind+'颜色Ramp');
  __ccTree();return __ccFinish();
}"""

SURFACES = r"""async () => {
  await __ccWait();__ccApi();__ccRegion(document.getElementById('side'),'真实库');
  const headers=[...document.querySelectorAll('#libBody .lg-io')].filter(__ccVisible);
  __ccCheck(headers.length>0&&headers.every(e=>e.getBoundingClientRect().height<=28&&getComputedStyle(e).whiteSpace==='nowrap'),'库header原lg-io使用不超过28px的单行inline变体',headers.map(__ccRect));
  __ccRegion(document.querySelector('.viewbar'),'顶栏视图与动作');__ccRegion(document.querySelector('.preview-controls'),'预览控件');
  __ccRegion(document.querySelector('.timeline'),'Timeline');
  const more=document.getElementById('abMore');more.open=true;await __ccWait();__ccRegion(more,'原更多菜单');more.open=false;
  const preview=document.getElementById('previewSettings');preview.open=true;await __ccWait();__ccRegion(preview,'原预览菜单');preview.open=false;
  selectStageView('flow');await __ccWait();__ccRegion(document.getElementById('delivView'),'交付清单');
  __ccRegion(document.getElementById('mbInspectModes'),'贴图交付子模式');selectStageView('live');await __ccWait();
  // 保留真实askSaveName，不按保存；仅用取消关闭，不写任何效果。
  window.__componentNamePending=askSaveName('组件验收','仅检查原模态控件，取消关闭','组件验收','保存',{en:'ComponentReview'});
  await __ccWait();const dlg=document.getElementById('saveNameDlg');__ccRegion(dlg,'原保存对话框');
  const en=document.getElementById('saveNameEn');en.value='非法中文';en.dispatchEvent(new Event('input',{bubbles:true}));await __ccWait();
  __ccCheck(en.getAttribute('aria-invalid')==='true'&&!!document.getElementById('saveNameEnMsg').textContent,'原英文名校验与错误保留');
  __cc.info.saveError={input:__ccRect(en),message:__ccRect(document.getElementById('saveNameEnMsg'))};
  dlg.querySelector('button[value=cancel]').click();await __ccWait();__ccCheck(!dlg.open,'原保存取消关闭，没有实际保存');
  // 只展示父页原资源外壳，不调用DeliveryWorkspace.open，不连接/加载iframe或伪造子页成功。
  const main=document.getElementById('main'),resource=document.getElementById('deliveryWorkspace');
  main.hidden=true;resource.hidden=false;document.getElementById('deliveryOptions').open=true;await __ccWait();
  __ccRegion(resource,'资源交付原外壳');
  __cc.info.boundary={iframe:'#deliveryFrame为独立文档，未检查/宣称内部统一',fixture:'只改变原hidden/open呈现状态；无组件class注入，无RPC/真实导入/UE'};
  __ccCheck(!!document.getElementById('deliveryFrame'),'iframe外部边界明确存在');
  resource.hidden=true;main.hidden=false;
  __ccOpen(document.getElementById('matColors'));await __ccWait();
  const wells=[...document.querySelectorAll('#matColors .ramp-stop input[type=color]')].filter(__ccVisible);
  __ccCheck(wells.length>=4&&wells.every(e=>{const r=e.getBoundingClientRect();return e.dataset.mbComponent==='color'&&r.width>0&&Math.abs(r.width-r.height)<=1;}),'真实Ramp四个色井宽高相等',wells.map(__ccRect));
  // 通过原undoToast创建一个纯内存回调夹具；不删除效果或声称真实撤销任务成功。
  let undone=0;undoToast('组件测试夹具：仅撤销内存标记',()=>{undone++;});await __ccWait();
  const toast=document.querySelector('#undoToast .ut-item'),undo=toast?.querySelector('button');
  __ccCheck(!!undo&&__ccVisible(undo)&&undo.dataset.mbComponent==='button'&&Math.abs(undo.getBoundingClientRect().height-28)<=1,'原toast按钮继承28px组合角色合同',__ccRect(undo));
  undo?.click();await __ccWait();__ccCheck(undone===1&&!toast?.isConnected,'原toast回调仅执行一次并移除对应提示');
  // 原busy控制器负责写真实进度宽；测试不直接赋style或构造另一根进度条。
  const busyNode=document.getElementById('busy'),bar=document.getElementById('busyBar'),track=bar?.parentElement;
  __ccCheck(!!bar&&!!track&&bar.id==='busyBar'&&track.closest('#busy')===busyNode,'检查原busyBar与原轨道，不使用占位进度');
  for(const value of [.25,.75]){
    busy(true,'隔离组件进度夹具（非真实烘焙）',value);await __ccWait();
    const total=track?.getBoundingClientRect().width||0,actual=bar?.getBoundingClientRect().width||0;
    __ccCheck(__ccVisible(bar)&&total>0&&Math.abs(actual-total*value)<=1&&bar.style.width===Math.round(value*100)+'%',
      `原busy函数${value*100}%宽度不被组件规则覆盖`,{total,actual,inline:bar?.style.width,expected:total*value});
  }
  busy(false);return __ccFinish();
}"""


async def fresh_with_real_dialogs(browser):
    """只对保存模态场景不使用ask_stub；其余隔离/FAKE/停RAF与既有机制相同。"""
    ctx = await browser.new_context(viewport={'width': 1920, 'height': 1080})
    pg = await ctx.new_page()
    errors = []
    pg.on('pageerror', lambda error: errors.append(str(error)))
    await pg.add_init_script('window.requestAnimationFrame = () => 0;')
    await pg.goto(base.HTML, wait_until='load')
    await pg.wait_for_function('window.__fw && typeof EFFS === "function"')
    await pg.evaluate(base.FAKE)
    return ctx, pg, errors


async def run_case(p, browser, kind, expected):
    ctx, pg, errors = await (fresh_with_real_dialogs(browser) if kind == '跨区域外壳' else base.fresh(p, browser))
    try:
        actual = await pg.evaluate('({version:VERSION,ui:document.body.dataset.ui})')
        if actual['ui'] != 'material-b' or expected and actual['version'] != expected:
            raise RuntimeError('待测入口/版本不符：' + json.dumps(actual, ensure_ascii=False))
        await pg.set_viewport_size({'width': 1920, 'height': 1080})
        await pg.evaluate('setAutoBake(false);state.playing=false;0')
        if kind == '层头出生联动':
            await pg.evaluate("async()=>{await myCreate('kiku');await myAddLayerFrom('kiku');return 0;}")
        elif kind in ('RT6', 'SGR1', 'SGS1'):
            await pg.evaluate('async id=>{await Promise.resolve(openReview(entryById(id)));return 0;}', 'RT6L' if kind == 'RT6' else kind)
        else:
            await pg.evaluate('openType("kiku");0')
        await base.idle(pg)
        await pg.evaluate(COMMON)
        await pg.wait_for_timeout(150)
        expression = SCHEMA if kind == '普通Schema' else LAYERS if kind == '层头出生联动' else SURFACES if kind == '跨区域外壳' else SPECIAL
        result = await asyncio.wait_for(pg.evaluate(expression, kind), timeout=90)
        result['case'] = kind
        result['pageErrors'] = errors
        if errors:
            result['pass'] = False
        return result
    finally:
        await ctx.close()


async def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out', default=str(ROOT / 'analysis/local/MaterialB组件检查.json'))
    ap.add_argument('--expect-version', default=None)
    args = ap.parse_args()
    result = {'at': datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(),
              'boundary': '隔离上下文、既有FAKE/停RAF；真实原DOM分类与几何，无截图/视觉浏览/真实用户存档/UE；iframe内部明确未检。',
              'expectedVersion': args.expect_version, 'cases': []}
    try:
        pre = subprocess.run([sys.executable, '-X', 'utf8', str(ROOT / 'tool/local_http/preflight.py'), '--tool', 'baker'], cwd=ROOT,
                             capture_output=True, text=True, encoding='utf-8')
        result['preflight'] = {'code': pre.returncode, 'stdout': pre.stdout.strip(), 'stderr': pre.stderr.strip()}
        if pre.returncode:
            raise RuntimeError('HTTP预检失败，停止')
        base.HTML = validation_url('http://127.0.0.1:8034/baker?ui=material-b&autobake=0', ROOT / 'tool/FireworkBaker.html')
        verify_validation_source(base.HTML, ROOT / 'tool/FireworkBaker.html')
        result['source'] = {'url': base.HTML, 'sha256': hashlib.sha256((ROOT / 'tool/FireworkBaker.html').read_bytes()).hexdigest(), 'httpBytesVerified': True}
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await launch_async(p)
            try:
                for kind in ['普通Schema', '层头出生联动', 'RT6', 'SGR1', 'SGS1', '跨区域外壳']:
                    try:
                        case = await run_case(p, browser, kind, args.expect_version)
                    except Exception as error:
                        case = {'case': kind, 'pass': False, 'exception': str(error)}
                    result['cases'].append(case)
                    print(json.dumps({'case': kind, 'pass': case['pass'], 'checks': len(case.get('checks', [])),
                        'failedNames': [c['name'] for c in case.get('checks', []) if not c['pass']],
                        'exception': case.get('exception'), 'pageErrors': case.get('pageErrors', [])}, ensure_ascii=False), flush=True)
            finally:
                await browser.close()
        result['pass'] = len(result['cases']) == 6 and all(case['pass'] for case in result['cases'])
    except Exception as error:
        result['pass'] = False
        result['exception'] = str(error)
    result['checks'] = sum(len(case.get('checks', [])) for case in result['cases'])
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'pass': result['pass'], 'checks': result['checks'], 'path': str(out), 'exception': result.get('exception')}, ensure_ascii=False), flush=True)
    return 0 if result['pass'] else 1


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
