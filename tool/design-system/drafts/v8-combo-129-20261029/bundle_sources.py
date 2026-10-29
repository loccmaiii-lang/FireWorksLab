"""仅构建组件选型副本；不写旧稿、正式源码或用户存储。

实施顺序：读取真实 B 资产并逐项记 SHA256；在副本中内嵌 JSON/图片；
用会话内存与静态参考代替原 HTTP 渲染桥；最后包裹真实 128 DOM 快照。
返回两个可用于 sandbox="allow-scripts" 的离线 srcdoc 与来源清单。
原 B 仍拥有 40 项参数校验、事务、撤销、搜索与折叠；128 仅组件样本。
"""
from __future__ import annotations

import base64
import hashlib
import html
import importlib.util
import json
import mimetypes
from pathlib import Path
import re


CSP = ("default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; "
       "img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; "
       "media-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; "
       "form-action 'none'")

PRELUDE = r"""(() => {
  'use strict';
  const memory=()=>{const data=new Map();return Object.freeze({get length(){return data.size},key(i){return [...data.keys()][i]??null},getItem(k){return data.get(String(k))??null},setItem(k,v){data.set(String(k),String(v))},removeItem(k){data.delete(String(k))},clear(){data.clear()}})};
  const put=(o,k,v)=>{Object.defineProperty(o,k,{configurable:false,value:v});};
  // opaque sandbox 无法访问真实 localStorage；先装会话内存，再运行原稿。
  put(window,'localStorage',memory());put(window,'sessionStorage',memory());
  const deny=()=>{throw new DOMException('组件选型页禁用外部能力','SecurityError')};
  const reject=()=>Promise.reject(new DOMException('组件选型页禁用外部能力','SecurityError'));
  for(const k of ['indexedDB','caches','showDirectoryPicker','showOpenFilePicker','showSaveFilePicker','openDatabase'])put(window,k,undefined);
  put(window,'fetch',reject);for(const k of ['XMLHttpRequest','WebSocket','EventSource','Worker','SharedWorker'])put(window,k,deny);
  put(window,'open',()=>null);
  try{put(navigator,'clipboard',Object.freeze({read:reject,readText:reject,write:reject,writeText:reject}));}catch(_){}
  try{put(navigator,'sendBeacon',()=>false);}catch(_){}
  document.addEventListener('click',event=>{if(event.target.closest?.('a')){event.preventDefault();event.stopImmediatePropagation();}},true);
  document.addEventListener('submit',event=>event.preventDefault(),true);
  window.__PICKER_BOUNDARY=Object.freeze({storage:'memory-only',network:'disabled',preview:'original-static-reference',bakeCalls:0,productionSave:false,productionExport:false});
})();"""

BRIDGE_STATIC = r"""window.EngineBridge=Object.freeze({
  async start(host,onFrame,onStatus){onStatus?.({state:'static',phase:'static',message:'静态参考，此页仅组件选型',audit:window.__PICKER_BOUNDARY});return false},
  setParameters(){return false},seek(){return false},pause(){return false},inspect(){return false},async retry(){return false},async dispose(){}
});"""

B_STATIC_OBSERVATION = r"""function renderObservation(){reference=true;const c=sourceContext(observed);$('#observed-name').textContent='金曜菊-B · 原稿静态参考';$('.preview-wrap').dataset.mode='reference';$('#preview-kind').textContent='静态参考 · 不随参数改变';$('#observation-state').textContent='此页仅组件选型';$('#layer-rate').textContent=String(c.placement?.rate??1)+'×';$('#time').disabled=true;$('[data-action=play]').disabled=true;$('#observation').value='reference';$('#observation').disabled=true;$('#retry-preview').hidden=true;$('#retry-preview').disabled=true;$('#preview-caption').textContent='原B附带的整朵静态参考；此页仅组件选型，参数不会驱动烟花画面。';} """

B_LAYOUT = r"""
body[data-picker-mode=panel] .app{grid-template-rows:64px minmax(0,1fr) 28px}
body[data-picker-mode=panel] :is(.review-bar,.mobile-nav){display:none!important}
body[data-picker-mode=panel] .app-header{grid-row:1}
body[data-picker-mode=panel] .workspace{grid-row:2;grid-template-columns:minmax(0,1fr)!important}
body[data-picker-mode=panel] .status-footer{grid-row:3}
body[data-picker-mode=panel] .workspace>:is(.library,.preview-pane,.delivery-pane){display:none!important}
body[data-picker-mode=panel] .workspace>.inspector{display:grid!important;grid-template-rows:170px 7px minmax(0,1fr);height:auto!important}
body[data-picker-mode=panel] .inspector>.structure{display:block!important;height:auto!important}
body[data-picker-mode=panel] .inspector>.splitter{display:block!important}
body[data-picker-mode=panel] .parameter-pane{display:flex!important;height:auto!important;min-height:0}
body[data-picker-mode=panel] :is(.brand,.header-divider){display:none}
body[data-picker-mode=panel] .app-header{gap:8px;padding:5px 10px}
body[data-picker-mode=panel] .document-name{min-width:0}
body[data-picker-mode=panel] .document-name h1{font-size:14px}
body[data-picker-mode=panel] .status-footer{font-size:11px;gap:6px;padding-inline:8px}
body[data-picker-mode=panel] .status-footer>span:last-child{display:none}
[data-action=download],[data-action=delivery]{display:none!important}
body .transport input:disabled{opacity:.5}
"""

COMMON_ADAPTER = r"""(() => {
  'use strict';
  const style=document.getElementById('picker-choice-style');
  window.addEventListener('message',event=>{
    const m=event.data;
    if(event.source!==parent||!m||m.channel!=='fwl-style-picker/1')return;
    if(m.type==='apply-choices'&&typeof m.css==='string'&&m.css.length<=400000){
      style.textContent=m.css;document.body.dataset.comboActive=m.css?'true':'false';
      window.Combo129?.applyMessage(m);
    }
    if(m.type==='mode'&&['panel','workspace'].includes(m.mode))document.body.dataset.pickerMode=m.mode;
  });
  document.addEventListener('input',event=>{
    const e=event.target;if(e.matches('input[type=range]')){
      const lo=Number(e.min)||0,hi=Number(e.max)||100;
      e.style.setProperty('--mb-fill',(hi>lo?Math.max(0,Math.min(100,(Number(e.value)-lo)/(hi-lo)*100)):0)+'%');
    }
  });
  parent.postMessage({channel:'fwl-style-picker/1',type:'ready',pane:document.body.dataset.pickerPane,version:'129',labReady:window.Combo129?.getState().labReady||false},'*');
})();"""

B_ADAPTER = r"""(() => {
  document.body.dataset.pickerMode='panel';
  const refresh=()=>{
    const save=document.querySelector('[data-action=save]');if(save&&save.textContent!=='记住本页状态')save.textContent='记住本页状态';
    const footer=document.querySelector('.status-footer>span:last-child');if(footer&&footer.textContent!=='仅本页会话 · 静态参考 · 未烘焙/导出')footer.textContent='仅本页会话 · 静态参考 · 未烘焙/导出';
    document.querySelectorAll('.library-links a,.review-bar a').forEach(a=>{a.title='完整入口由外层比较页提供；离线样本不跳转';a.setAttribute('aria-disabled','true')});
  };
  new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length))refresh()}).observe(document.getElementById('app'),{childList:true,subtree:true});
  refresh();
})();"""

MB_ADAPTER = r"""(() => {
  'use strict';
  document.body.dataset.pickerMode='panel';
  const initial=new WeakMap();
  document.querySelectorAll('input,select,textarea').forEach(e=>initial.set(e,{value:e.value,checked:e.checked}));
  const rows=[...document.querySelectorAll('#right .sl,#right .field')];
  function changed(row){return [...row.querySelectorAll('input,select,textarea')].some(e=>{const v=initial.get(e);if(!v)return false;if(e.type==='checkbox'||e.type==='radio')return e.checked!==v.checked;if(e.type==='range'||e.type==='number')return Number(e.value)!==Number(v.value);return e.value!==v.value})}
  function refresh(row){const on=changed(row);row.classList.toggle('chg',on);const reset=row.querySelector(':scope>.rrst');if(reset)reset.hidden=!on;const n=rows.filter(changed).length,foot=document.querySelector('#pFoot');if(foot){const state=foot.querySelector('.pf-chg'),all=foot.querySelector('.pf-reset');if(state)state.textContent=n?'样本已改 '+n+' 行':'样本值未改';if(all){all.textContent='恢复样本初始值';all.title='只还原此HTML里的控件样本';all.disabled=!n}}}
  function resetRow(row){row.querySelectorAll('input,select,textarea').forEach(e=>{const v=initial.get(e);if(v){e.value=v.value;if(e.type==='checkbox'||e.type==='radio')e.checked=v.checked;e.dispatchEvent(new Event('input',{bubbles:true}))}});refresh(row)}
  const note=document.createElement('p');note.id='picker-sample-status';note.setAttribute('role','status');note.textContent='128真实界面组件样本；不运行烘焙、生产保存或资源导入。';
  document.body.append(note);
  const report=text=>{note.textContent=text};
  document.addEventListener('input',event=>{
    if(event.target.closest('#combo-lab,#sample-dialog,.combo-inspect-tools'))return;
    const e=event.target,row=e.closest('.sl,.mb-value-row');if(!row)return;
    if(e.matches('input[type=range]')){const n=row.querySelector('.num');if(n)n.value=e.value}
    else if(e.matches('.num')){const r=row.querySelector('input[type=range]');if(r&&Number.isFinite(Number(e.value))){r.value=e.value;const lo=Number(r.min),hi=Number(r.max);r.style.setProperty('--mb-fill',(hi>lo?Math.max(0,Math.min(100,(Number(r.value)-lo)/(hi-lo)*100)):0)+'%')}}
    refresh(row);
    report('仅调整本页组件样本值；未计算烟花，也未写入配方。');
  });
  document.addEventListener('click',event=>{
    if(event.target.closest('#combo-lab,#sample-dialog,.combo-inspect-tools'))return;
    const button=event.target.closest('button,[role=button]');if(!button)return;
    if(button.matches('.rrst,.mreset')){
      const row=button.closest('.sl,.field,.mb-value-row');if(row){resetRow(row);report('已恢复本行样本的初始值；未调用生产还原。');return}
    }
    if(button.matches('.pf-reset')){rows.filter(changed).forEach(resetRow);report('已恢复本页样本初始值，未调用生产还原。');return}
    if(button.matches('.lk')){const pressed=button.getAttribute('aria-pressed')==='true';button.setAttribute('aria-pressed',String(!pressed));button.closest('.sl')?.classList.toggle('locked',!pressed);const icon=button.querySelector('.mb-action-icon'),asset=window.FWTypeIconAssets?.[pressed?'lock-open':'lock'];if(icon&&asset)icon.style.setProperty('--mb-type-icon','url("'+asset+'")');report('锁定图标的样本状态已切换；不限制手动编辑，随机流程未接通。');return}
    if(button.matches('[role=tab]')){
      const list=button.closest('[role=tablist]');if(list){list.querySelectorAll('[role=tab]').forEach(b=>{b.setAttribute('aria-selected',String(b===button));b.tabIndex=b===button?0:-1});report('仅切换页签组件选中态；样本未加载新的业务参数。');return}
    }
    report('此业务动作未接通；请从外层入口打开完整烘焙器测试。');
  });
  document.addEventListener('change',event=>{if(event.target.closest('#combo-lab,#sample-dialog,.combo-inspect-tools'))return;if(event.target.matches('input,select,textarea')){const row=event.target.closest('.sl,.field');if(row)refresh(row);report('已改变组件样本状态；未写入真实配方。')}});
  if(rows[0])refresh(rows[0]);
})();"""


class Sources:
    def __init__(self, repo: Path):
        self.repo = repo.resolve()
        self.files: dict[str, dict] = {}
        self.warnings: list[str] = []

    def read(self, path: Path) -> bytes:
        path = path.resolve()
        data = path.read_bytes()
        try:
            name = path.relative_to(self.repo).as_posix()
        except ValueError:
            name = str(path)
        self.files[name] = {'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
        return data

    def text(self, path: Path) -> str:
        return self.read(path).decode('utf-8-sig')

    def uri(self, path: Path) -> str:
        data = self.read(path)
        mime = mimetypes.guess_type(str(path))[0] or 'application/octet-stream'
        return 'data:' + mime + ';base64,' + base64.b64encode(data).decode('ascii')


def _script(text: str) -> str:
    return '<script>' + re.sub(r'</script', r'<\\/script', text, flags=re.I) + '</script>'


def _style(text: str) -> str:
    if re.search(r'</style', text, flags=re.I):
        raise ValueError('来源CSS包含style结束标签，拒绝不安全拼接')
    return '<style>' + text + '</style>'


def _document(title: str, css: list[str], body: str, scripts: list[str], attrs: str) -> str:
    return ('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<meta http-equiv="Content-Security-Policy" content="{html.escape(CSP, quote=True)}">'
            f'<title>{html.escape(title)}</title>' + ''.join(_style(c) for c in css)
            + '<style id="picker-choice-style"></style></head><body ' + attrs + '>'
            + _script(PRELUDE) + body + ''.join(_script(s) for s in scripts) + '</body></html>')


def _replace_once(text: str, before: str, after: str, label: str) -> str:
    if text.count(before) != 1:
        raise ValueError(f'{label}来源锚点不唯一；停止生成，不猜测替换')
    return text.replace(before, after, 1)


def _line_function(text: str, name: str, replacement: str) -> str:
    text, n = re.subn(r'^function ' + re.escape(name) + r'\([^\n]*$', lambda _: replacement,
                      text, flags=re.M)
    if n != 1:
        raise ValueError(f'{name}来源函数不唯一；停止生成')
    return text


def _b_workspace(s: Sources) -> str:
    tool = s.repo / 'tool'
    folder = tool / 'design-system/drafts/v4-workflows-20261029'
    s.text(folder / 'b.html')
    s.text(folder / 'engine-bridge.js')  # 清单保留被静态适配取代的桥接来源。
    css_paths = ['design-system/tokens.css', 'design-system/drafts/v3-unified/candidate-tokens.css',
                 'design-system/drafts/v3-unified/candidate-components.css',
                 'design-system/drafts/v4-workflows-20261029/studio.css',
                 'design-system/drafts/v4-workflows-20261029/focus-panel.css']
    css = [s.text(tool / p) for p in css_paths] + [B_LAYOUT]
    studio = s.text(folder / 'studio.js')
    studio = _replace_once(studio, "data=await(await fetch('parameters.json',{cache:'no-store'})).json()",
                           "data=JSON.parse(document.getElementById('bundle-b-parameters').textContent)", 'B参数JSON')
    studio = _line_function(studio, 'renderObservation', B_STATIC_OBSERVATION)
    studio = _line_function(studio, 'syncPreview', 'function syncPreview(){renderObservation();}')
    studio = studio.replace('已保存此方案的 Demo；未写入正式配方。', '已记住本页会话状态；关闭页面后丢弃，未写入真实配方。')
    studio = studio.replace('本层实时预览使用隔离的原渲染核。', '本页仅保留原稿静态参考；不运行渲染核。')
    studio = studio.replace('保存、撤销、搜索、折叠、锁定、对照、观察、形式检查与草稿下载可操作。', '会话状态、撤销、搜索、折叠与参数控件可操作。')
    studio = studio.replace('当前草稿仍在内存中。', '当前草稿仍在本页会话内存中。')
    for ref, path in [('../v1/assets/preview-gold.png', tool / 'design-system/drafts/v1/assets/preview-gold.png'),
                      *[(f'../v2-structure/assets/node-icons/{name}.svg', tool / f'design-system/drafts/v2-structure/assets/node-icons/{name}.svg') for name in ['stack-2', 'sparkles', 'circles']]]:
        studio = studio.replace(ref, s.uri(path))
    # 原树使用模板字符串插值，替换成内嵌真实图标映射而非补画图标。
    icon_map = {name: s.uri(tool / f'design-system/drafts/v2-structure/assets/node-icons/{name}.svg')
                for name in ['stack-2', 'sparkles', 'circles']}
    studio = studio.replace('src="../v2-structure/assets/node-icons/${n}.svg"', 'src="${window.__B_TREE_ICONS[n]}"')
    data = json.loads(s.text(folder / 'parameters.json'))
    if len(data.get('parameters', [])) != 40:
        raise ValueError('原B参数项数已变化，请更新边界说明后再生成')
    payload = json.dumps(data, ensure_ascii=False).replace('<', '\\u003c')
    body = '<script type="application/json" id="bundle-b-parameters">' + payload + '</script><div id="app"></div>'
    scripts = [s.text(tool / 'design-system/drafts/v1/assets/icons.js'),
               'window.__B_TREE_ICONS=' + json.dumps(icon_map) + ';', BRIDGE_STATIC,
               s.text(folder / 'focus-panel.js'), studio, B_ADAPTER, COMMON_ADAPTER]
    return _document('原B · 40项参数 · 组件选型副本', css, body, scripts,
                     'class="fw-scope u-scope" data-concept="focus" data-picker-pane="b" data-picker-mode="panel"')


def _snapshot_body(s: Sources, snapshot: Path) -> tuple[str, str]:
    raw = s.text(snapshot)
    match = re.search(r'<body\b([^>]*)>([\s\S]*?)</body\s*>', raw, flags=re.I)
    attrs, body = (match.group(1), match.group(2)) if match else ('', raw)
    body = re.sub(r'<script\b[^>]*>[\s\S]*?</script\s*>', '', body, flags=re.I)
    body = re.sub(r'<(?:iframe|object|embed)\b[^>]*>[\s\S]*?</(?:iframe|object|embed)\s*>', '', body, flags=re.I)
    body = re.sub(r'<(?:iframe|object|embed|base|link|meta)\b[^>]*>', '', body, flags=re.I)
    # 快照由自己的受控运行时导出；仍去掉一切行内事件，不携带业务代码。
    strip_handlers = lambda v: re.sub(r'\s+on[\w-]+\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+)', '', v, flags=re.I)
    body, attrs = strip_handlers(body), strip_handlers(attrs)
    attrs = re.sub(r'\s*data-ui\s*=\s*(["\']).*?\1', '', attrs, flags=re.I)
    attrs = re.sub(r'\s*data-picker-[\w-]+\s*=\s*(["\']).*?\1', '', attrs, flags=re.I)
    attrs += ' data-ui="material-b" data-picker-pane="mb128" data-picker-mode="panel"'

    def resource(m: re.Match) -> str:
        prefix, quote, ref = m.group(1), m.group(2), html.unescape(m.group(3))
        if ref.startswith('data:'):
            return m.group(0)
        path = ref.split('?', 1)[0].split('#', 1)[0]
        if re.match(r'https?://', path):
            from urllib.parse import urlsplit
            parsed = urlsplit(path)
            if parsed.hostname not in ('localhost', '127.0.0.1'):
                s.warnings.append('未内嵌外部快照资源：' + ref)
                return prefix + quote + quote
            path = parsed.path
        guesses = [s.repo / 'tool' / path.lstrip('/'), snapshot.parent / path]
        found = next((p.resolve() for p in guesses if p.is_file() and p.resolve().is_relative_to(s.repo)), None)
        if found:
            return prefix + quote + s.uri(found) + quote
        s.warnings.append('未找到快照资源，未伪造替代图片：' + ref)
        return prefix + quote + quote

    body = re.sub(r'(\bsrc\s*=\s*)(["\'])(.*?)\2', resource, body, flags=re.I)
    return attrs, body


def _mb_workspace(s: Sources, snapshot: Path) -> str:
    tool = s.repo / 'tool'
    own = Path(__file__).resolve().parent
    # 精确载入本轮模块，避免同进程中已导入的v7同名模块串版。
    module_spec = importlib.util.spec_from_file_location('combo129_lab_sources', own / 'catalog_samples.py')
    module = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(module)
    lab = module.build_lab(s.repo)
    if set(lab.get('familyMap', {})) != {'C01','C02','C03','C04','C05','C06','C07','C08','C09','C11','C12','C16','TREE','COLOR'}:
        raise ValueError('129实验室14族映射不完整，停止生成')
    if not re.search(r'<dialog\b[^>]*\bid=["\']combo-lab["\']', lab['body']):
        raise ValueError('129实验室必须提供原生dialog #combo-lab')
    css = [s.text(tool / p) for p in ['design-system/tokens.css', 'design-system/components.css',
                                      'src/style.css', 'src/material-b.css', 'src/material-b-components.css']]
    css.append(lab['css'])
    s.text(own / 'combo-theme.css')  # 只记录来源；主题唯一由父页apply-choices消息注入。
    s.text(own / 'catalog_samples.py')
    # lab复用的控制器/样式与曲线来源纳入同一精确来源清单。
    for relative in ['tool/design-system/drafts/v3-unified/components.html',
                     'tool/design-system/drafts/v3-unified/candidate-tokens.css',
                     'tool/design-system/drafts/v3-unified/candidate-components.css',
                     'tool/design-system/drafts/v3-unified/catalog.css',
                     'tool/design-system/drafts/v3-unified/component-kit.js',
                     'tool/design-system/drafts/v3-unified/catalog.js',
                     'tool/design-system/drafts/v5-spectrum-20261029/spectrum-tokens.css',
                     'tool/design-system/drafts/v5-spectrum-20261029/spectrum-components.css',
                     'tool/src/js/70_ui.js']:
        s.read(s.repo / relative)
    for relative in lab.get('sources', []):
        s.read(s.repo / relative)
    attrs, body = _snapshot_body(s, snapshot)
    # 保留 .app / #main 上下文，原组件选择器仍由原CSS匹配；只适配iframe容器。
    body = '<div class="app picker-sample-app"><main id="main" class="picker-sample-main">' + body + '</main></div>' + lab['body']
    css.append('''body .picker-sample-app{display:block;height:calc(100dvh - 30px)}
body #main.picker-sample-main{display:block;height:100%}
body #main.picker-sample-main>#right{width:100%;height:100%;min-height:0;overflow:hidden;display:flex;grid-column:auto;grid-row:auto}
body #main.picker-sample-main>#right>#rScroll{display:flex;flex-direction:column;flex:1 1 0;min-height:0;overflow:hidden}
body #main.picker-sample-main #pMaster{display:flex;flex-direction:column;flex:1 1 0;min-height:0;overflow-y:auto;overflow-x:hidden}
body #main.picker-sample-main #pMaster>*,body #main.picker-sample-main #pMaster #params>*{flex:none}
body #main.picker-sample-main #pFoot{position:sticky;bottom:0;flex:none}
#combo-inspect-tools{display:none!important}
#combo-inspect-tools label{display:flex;align-items:center;gap:5px;min-width:0;font-size:12px}
#combo-inspect-tools select{max-width:250px;min-width:0}
#combo-inspect-tools .combo-mode-note{font-size:11px;color:var(--dim)}
#combo-lab{width:min(900px,calc(100vw - 24px));max-height:calc(100dvh - 24px);margin:auto;overflow:auto}
#combo-lab::backdrop{background:#0009}
#combo-lab>header{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
#combo-lab .combo-family-label{display:flex;gap:6px;align-items:center;margin-left:auto;font-size:12px}
#combo-lab .combo-family-label select{max-width:320px;min-width:0}
#combo-lab-status{margin:8px 0 12px;overflow-wrap:anywhere}
#combo-lab .combo-tree-sample-tools{display:flex;justify-content:flex-end;margin-block:4px}
#combo-lab :is(.sample-tree-caret,.sample-tree-solo){flex:none;min-width:24px;min-height:24px;padding:0;border:0;background:transparent;color:inherit}
#combo-lab .sample-tree-caret .fw-icon{transform:rotate(0deg);transition:none}
#combo-lab .sample-tree-row[aria-expanded=false] .sample-tree-caret .fw-icon{transform:rotate(-90deg)}
#combo-lab .sample-tree-solo svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;flex:none}
#picker-sample-status{position:fixed;z-index:99999;left:0;right:0;bottom:0;margin:0;padding:5px 10px;border-top:1px solid var(--line);background:var(--panel);color:var(--dim);font:12px/18px var(--sans);pointer-events:none}
''')
    icons = {}
    for folder in [tool / 'design-system/drafts/v2-structure/assets/node-icons', tool / 'src/material-b-icons']:
        for path in sorted(folder.glob('*.svg')):
            icons[path.stem] = s.uri(path)
    scripts = ['window.FWTypeIconAssets=' + json.dumps(icons) + ';',
               s.text(tool / 'design-system/icons.js'), 'window.FWIcons.apply();',
               'window.__COMBO_LAB_MAP=' + json.dumps(lab['familyMap']) + ';',
               lab['scripts'], MB_ADAPTER, s.text(own / 'combo-adapter.js'), COMMON_ADAPTER]
    return _document('129 · 用户组合 · 真实DOM与14族组件检查', css, body, scripts, attrs)


def build_workspaces(repo: Path, snapshot: Path) -> dict:
    """不写文件；root 将两个完整文档编码为主HTML内的 iframe.srcdoc。"""
    source = Sources(Path(repo))
    b = _b_workspace(source)
    mb = _mb_workspace(source, Path(snapshot))
    return {'b': b, 'mb128': mb, 'manifest': {
        'format': 'fwl-style-picker-sources/1', 'files': list(source.files.values()),
        'warnings': source.warnings,
        'adaptations': {
            'b': ['原v4 B的40项参数与原控制器', '静态参考适配；无HTTP/渲染核/自动烘焙',
                  '独立会话内存；不读取原localStorage', '隐藏素材交付/下载入口；不提供生产保存或导出'],
            'mb128': ['真实128运行时DOM快照与原5份CSS', '129组合主题仅在mix消息启用；空CSS还原基线',
                      '14族原组件样板的原生dialog检查入口；复用原Kit/控制器/领域图形',
                      '真实树DOM仅样本选择/折叠/眼睛/只看/恢复，参数不随选择加载',
                      '不包含完整baker控制器；未接通业务动作就地提示'],
        },
        'protocol': {'channel': 'fwl-style-picker/1', 'apply-choices': {'css': 'string <=400000'},
                     'mode': ['panel', 'workspace'], 'inspect-family': '固定14族ID',
                     'combo-applied': 'CSS启用且检查样本实际存在的familyIds/actualPresence；非业务验收',
                     'receive': 'event.source === parent'},
        'boundary': {'sandbox': 'allow-scripts', 'sameOrigin': False, 'storage': 'memory-only',
                     'network': 'none', 'productionSave': False, 'productionExport': False,
                     'realTimePreview': False, 'automaticBake': False},
    }}
