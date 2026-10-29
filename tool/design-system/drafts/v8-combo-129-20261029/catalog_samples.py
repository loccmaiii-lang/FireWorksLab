"""129离线项目组件组合；不读取存档，也不接入烘焙器业务。

build_catalog返回14族候选srcdoc与真实128/实验室共用规则。
build_lab保留v3样板DOM/控制器；combo-theme.css记录用户已选项目混合外观。
"""
from __future__ import annotations

import base64
import html
import json
import re
from pathlib import Path


_SECTIONS = {
    "C01": "buttons", "C02": "fields", "C03": "slider", "C04": "select",
    "C05": "checks", "C06": "radios", "C07": "switch", "C08": "segments",
    "C11": "feedback", "C12": "feedback",
}
_PROJECT = {"C09": "project-fold", "C16": "project-progress", "TREE": "project-tree", "COLOR": "project-color"}
_HOST = ':is(#main,#deliveryWorkspace,#picker,#updDlg,#undoToast,#storeErr,dialog,.top,[popover])'
_ROOT = 'body[data-ui="material-b"]'
_HERE = Path(__file__).resolve().parent


def _read(repo: Path, relative: str) -> str:
    return (repo / relative).read_text(encoding="utf-8")


def _asset(repo: Path, stem: str) -> str:
    path = repo / "tool/design-system/drafts/v2-structure/assets/node-icons" / (stem + ".svg")
    return "data:image/svg+xml;base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def _extract_catalog(source: str) -> tuple[str, str]:
    sections = re.findall(r'<section\b[^>]*class="catalog-section"[^>]*>.*?</section>', source, re.S)
    if len(sections) < 9:
        raise ValueError("v3 组件 DOM 不完整，不能构造对应样本")
    dialog = re.search(r'<dialog\b[^>]*id="sample-dialog".*?</dialog>', source, re.S)
    if not dialog:
        raise ValueError("v3 对话框样本缺失")
    return "\n".join(sections), dialog.group(0)


def _project_markup(repo: Path) -> str:
    def node(stem: str) -> str:
        return '<span class="sample-node-type" aria-hidden="true" style="--sample-node-icon:url(\'' + _asset(repo, stem) + '\')"></span>'

    rows = []
    for index, (depth, stem, name) in enumerate([
        (0, "sparkles", "金曜菊 · 组合"), (1, "stack-2", "金锦层"),
        (2, "circles", "星"), (1, "stack-2", "橙引线层"),
    ]):
        rows.append(f'<div class="sample-tree-row{" selected" if index == 1 else ""}" role="treeitem" aria-level="{depth + 1}" aria-selected="{"true" if index == 1 else "false"}" style="--depth:{depth}">'
                    f'<button type="button" class="sample-tree-name" data-sample-node>{node(stem)}<span>{name}</span></button>'
                    f'<button type="button" class="sample-tree-eye" aria-pressed="true" aria-label="样板中显示{name}" data-sample-eye><span data-fw-icon="preview"></span></button></div>')
    return '''
<section class="sample-extra" id="project-fold"><p class="sample-boundary">项目折叠组合：借用候选组件，不改变参数分类。</p>
<details class="u-details" open><summary class="u-summary">运动与亮度 · 示例</summary><div>
<label class="u-field"><span class="u-label">重力倍率 · 示例</span><input class="u-input" type="number" value="1" step="0.01"></label>
<p class="u-help">仅编辑样板数值；不运行模拟，不写入配方。</p></div></details>
<details class="u-details"><summary class="u-summary">输出与资源 · 尚未烘焙</summary><div><p class="u-help">这是折叠交互样本，没有素材包或检查结果。</p></div></details></section>
<section class="sample-extra" id="project-progress"><p class="sample-boundary">129原生progress项目组件；手动拨动只演示进行中反馈，没有执行真实任务。</p>
<label class="u-field"><span class="u-label">示意进度（手动拨动）</span><input class="u-slider" type="range" min="0" max="100" value="35" id="project-progress-input"></label>
<progress id="project-progress-value" value="35" max="100" aria-label="页面内示意进度"></progress>
<p class="u-help" id="project-progress-label">UI示意35%；没有执行真实任务。</p></section>
<section class="sample-extra" id="project-tree"><p class="sample-boundary">共用项目树组合；类型图标来自已有资产。只演示选择与眼睛，不接配方。</p>
<div class="sample-tree" role="tree" aria-label="项目层级示意">''' + "".join(rows) + '''</div>
<p class="u-help" id="project-tree-state">当前样板选择：金锦层。真实父子层级未连接。</p></section>
<section class="sample-extra" id="project-color"><p class="sample-boundary">共用项目颜色与曲线组合；不是两个品牌各自提供的编辑器。</p>
<div class="project-color-inputs"><label class="u-field"><span class="u-label">起点色 · 示例</span><input class="u-input" type="color" value="#ffb44c" id="project-color-a"></label>
<label class="u-field"><span class="u-label">终点色 · 示例</span><input class="u-input" type="color" value="#ffd998" id="project-color-b"></label></div>
<div class="project-ramp" id="project-ramp" role="img" aria-label="上述两色的页面内渐变示意"></div>
<label class="u-field"><span class="u-label">按寿命变化 · 只读示意</span><input class="u-input" value="0:1, 0.7:0.3, 1:0" readonly></label>
<div id="project-curve"></div><p class="u-help">曲线由原 inspectorCurveHTML 绘制；未接曲线编辑器或真实颜色输出。</p></section>'''


_FRAME_CSS = '''
html,body{margin:0;min-height:100%;height:auto;overflow:auto}body{padding:14px}
*{box-sizing:border-box}[hidden]{display:none!important}
.catalog-main{padding:0!important;overflow:visible}.catalog-section,.sample-extra{display:none;border:0;padding:0!important;max-width:none}
.catalog-section>header{display:none}.catalog-row{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:6px!important;padding:8px 0!important}
.catalog-row>h3{margin:0;font-size:12px}.catalog-row>.u-help{display:none}.sample-stack{gap:8px}
.catalog-samples{gap:8px}.sample-column{flex:1 1 150px}.u-input,.u-select{max-width:100%}
.catalog-feedback{margin-top:10px;padding:8px 0;border-top:1px solid var(--u-divider);font-size:12px;line-height:18px}
.sample-boundary{font-size:12px;line-height:19px;color:var(--u-muted);margin:0 0 12px}
.u-dialog{width:min(460px,calc(100vw - 24px))}.u-dialog p{margin:8px 0 12px}
.sample-tree{border:1px solid var(--u-divider);padding:5px;background:var(--u-low)}
.sample-tree-row{display:flex;position:relative;align-items:center;height:28px;padding-left:calc(var(--depth)*16px);gap:4px}
.sample-tree-row.selected{background:var(--u-primary-bg);box-shadow:inset 2px 0 var(--u-primary)}
.sample-tree-name{display:flex;align-items:center;gap:6px;flex:1;min-width:0;height:26px;padding:0 6px;border:0;background:none;color:var(--u-text);font:13px/20px var(--u-font);text-align:left;cursor:pointer}
.sample-tree-name span:last-child{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.sample-node-type{display:inline-block;flex:none;width:18px;height:18px;background:var(--u-muted);mask:var(--sample-node-icon) center/contain no-repeat;-webkit-mask:var(--sample-node-icon) center/contain no-repeat}
.sample-tree-eye{width:28px;height:26px;border:0;background:none;color:var(--u-primary-text);padding:4px;cursor:pointer}
.sample-tree-eye [data-fw-icon]{width:18px;height:18px;display:inline-block;background:currentColor;mask:var(--fw-icon-image) center/contain no-repeat;-webkit-mask:var(--fw-icon-image) center/contain no-repeat}
.project-color-inputs{display:grid;grid-template-columns:1fr 1fr;gap:10px}.project-color-inputs input{width:40px;height:32px;padding:2px}
.project-ramp{height:28px;border:1px solid var(--u-border);margin:12px 0}
.cv-plot{width:100%;height:116px;background:var(--u-low);border:1px solid var(--u-divider)}
.cv-grid{fill:none;stroke:var(--u-divider);stroke-width:1}.cv-line{fill:none;stroke:var(--u-primary);stroke-width:1.8}.cv-point{fill:var(--u-text)}.cv-plot text{fill:var(--u-muted);font:10px monospace}
#project-progress-value{width:100%;height:12px;accent-color:var(--u-primary)}
'''


_PROJECT_JS = r'''
(() => {
  const progress=document.getElementById('project-progress-input');
  progress.addEventListener('input',()=>{document.getElementById('project-progress-value').value=progress.value;document.getElementById('project-progress-label').textContent='UI示意'+progress.value+'%；没有执行真实任务。';});
  document.querySelectorAll('[data-sample-node]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('.sample-tree-row').forEach(row=>{const on=row===button.parentElement;row.classList.toggle('selected',on);row.setAttribute('aria-selected',String(on));});
    document.getElementById('project-tree-state').textContent='当前样板选择：'+button.textContent.trim()+'。不改变真实配方。';
  }));
  document.querySelectorAll('[data-sample-eye]').forEach(button=>button.addEventListener('click',()=>{
    const on=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(on));button.querySelector('[data-fw-icon]').dataset.fwIcon=on?'preview':'hidden';window.FWIcons.apply(button);
    document.getElementById('project-tree-state').textContent='已改变样板眼睛；未改变配方、烘焙或导出。';
  }));
  const ramp=()=>{document.getElementById('project-ramp').style.backgroundImage='linear-gradient(90deg,'+document.getElementById('project-color-a').value+','+document.getElementById('project-color-b').value+')';};
  document.getElementById('project-color-a').addEventListener('input',ramp);document.getElementById('project-color-b').addEventListener('input',ramp);ramp();
  document.getElementById('project-curve').innerHTML=inspectorCurveHTML([[0,1],[.7,.3],[1,0]]);
})();
'''


def _scene_overrides(item_id: str, side: str) -> str:
    """129项目混合规则：同族同时映射原128 DOM与实验室，不改值或业务含义。"""
    adobe = side == 'adobe'
    p = _ROOT
    h = f'{p} {_HOST}'
    lab = '#combo-lab'
    normal, muted, outline = '#e4edef', '#b4c5cb', '#8da3ac'
    active, selected, selected_ink = '#00d49b', '#173d39', '#a1ded0'
    enabled = ':not(:disabled):not([aria-disabled=true]):not(.inert *)'
    def group(*selectors):
        return ',\n'.join(selectors)
    if item_id == 'C01':
        button = group(f'{h} :is([data-mb-component=button],[data-mb-component=icon-button]):not([data-mb-structural=true]):not(.mb-value-reset,.mreset,.lk,.shelp,.v5-danger,.danger,.warn,.fw-button--danger):not(.ab-menu *,.v5-pop *,.mb-observe-menu *){enabled}', f'{lab} .u-button{enabled}')
        hover = group(*(selector + ':hover' for selector in button.split(',\n')))
        primary = group(f'{h} :is(.primary,.fw-button--primary)[data-mb-component=button]{enabled}', f'{lab} .u-button.u-primary{enabled}')
        return f'''{button}{{border-radius:4px;background-color:#1b2a2f;color:{normal};font-size:13px;font-weight:500;box-shadow:none}}
{hover}{{background-color:#24373d;border-color:{outline}}}
{primary}{{background-color:{active if adobe else selected};border-color:{active};color:{'#062a23' if adobe else selected_ink};font-weight:600}}
{lab} .u-button.u-quiet{enabled}{{border-color:transparent;background:transparent;color:{muted}}}
{lab} .u-button.u-danger{enabled}{{color:#e7735a;border-color:#e7735a;background:transparent}}'''
    if item_id == 'C02':
        field = group(f'{h} :is(input[data-mb-component=input],textarea[data-mb-component=textarea]){enabled}', f'{lab} .u-input:not([type=color]){enabled}')
        number = f'{p} #right :is(.mb-value-row,#params .mb-value-row)>.mb-value-number{enabled}'
        return f'''{field},{number}{{border-radius:4px;background-color:#121f24;font-size:{14 if adobe else 13}px;font-weight:400}}
{h} :is(input[data-mb-component=input],textarea[data-mb-component=textarea]){enabled}:not([aria-invalid=true]):not(.bad):not(.over *),
{lab} .u-input:not([type=color]){enabled}:not([aria-invalid=true]):not(.bad),
{number}:not([aria-invalid=true]):not(.over *){{color:{normal}}}
{h} :is(input[data-mb-component=input],textarea[data-mb-component=textarea]){enabled}:not([aria-invalid=true]):not(.bad):not(.is-modified):not(.over *),
{lab} .u-input:not([type=color]){enabled}:not([aria-invalid=true]):not(.bad):not(.is-modified),
{number}:not([aria-invalid=true]):not(.over *){{border-color:{outline}}}
{lab} .u-input[readonly],{h} input[data-mb-component=input][readonly]{enabled}{{border-style:{'solid' if adobe else 'dashed'};border-color:#39515a}}'''
    if item_id == 'C03':
        slider = group(f'{h} input[data-mb-component=slider]{enabled}', f'{lab} input.u-slider{enabled}')
        height, thumb = (2, 14) if adobe else (3, 12)
        margin = (height - thumb) / 2
        track = '#8da3ac' if adobe else '#39515a'
        fill = '#1b2a2f' if adobe else active
        web_track = group(f'{h} input[data-mb-component=slider]{enabled}::-webkit-slider-runnable-track', f'{lab} input.u-slider{enabled}::-webkit-slider-runnable-track')
        web_thumb = group(f'{h} input[data-mb-component=slider]{enabled}::-webkit-slider-thumb', f'{lab} input.u-slider{enabled}::-webkit-slider-thumb')
        moz_track = group(f'{h} input[data-mb-component=slider]{enabled}::-moz-range-track', f'{lab} input.u-slider{enabled}::-moz-range-track')
        moz_fill = group(f'{h} input[data-mb-component=slider]{enabled}::-moz-range-progress', f'{lab} input.u-slider{enabled}::-moz-range-progress')
        moz_thumb = group(f'{h} input[data-mb-component=slider]{enabled}::-moz-range-thumb', f'{lab} input.u-slider{enabled}::-moz-range-thumb')
        return f'''{slider}{{appearance:none;-webkit-appearance:none;background:transparent;accent-color:{active}}}
{web_track}{{height:{height}px;border:0;border-radius:0;background:linear-gradient(to right,{active} 0 var(--mb-fill,0%),{track} var(--mb-fill,0%) 100%)}}
{web_thumb}{{appearance:none;-webkit-appearance:none;width:{thumb}px;height:{thumb}px;margin-top:{margin:g}px;border:1px solid {active};background:{fill};border-radius:50%;box-shadow:none}}
{moz_track}{{height:{height}px;border:0;border-radius:0;background:{track}}}
{moz_fill}{{height:{height}px;background:{active}}}
{moz_thumb}{{width:{thumb}px;height:{thumb}px;border:1px solid {active};background:{fill};border-radius:50%;box-shadow:none}}'''
    if item_id == 'C04':
        select = group(f'{h} select[data-mb-component=select]{enabled}', f'{lab} select.u-select{enabled}')
        sized_select = group(f'{h} select[data-mb-component=select]', f'{lab} select.u-select')
        select_button = group(f'{h} select[data-mb-component=select]>button', f'{lab} select.u-select>button')
        option = group(f'{h} select[data-mb-component=select] option:is(:hover,:focus-visible,:checked):not(:disabled)', f'{lab} .u-select option:is(:hover,:focus-visible,:checked):not(:disabled)')
        valid_select = group(*(selector + ':not([aria-invalid=true])' for selector in select.split(',\n')))
        return f'''{sized_select}{{box-sizing:border-box;height:32px;min-height:32px;padding:5px 10px;line-height:20px}}
{select_button}{{box-sizing:border-box;display:flex;align-items:center;height:20px;min-height:20px;min-width:0;padding:0;border:0;background:transparent;color:inherit;font:inherit;line-height:20px;box-shadow:none}}
{select}{{border-radius:4px;background-color:#121f24;color:{normal};font-size:{14 if adobe else 13}px;font-weight:400}}
{valid_select}{{border-color:{outline}}}
@supports(appearance:base-select){{
{h} select[data-mb-component=select]::picker(select),{lab} .u-select::picker(select){{border-radius:4px;border-color:{outline};background:#1b2a2f;color:{normal}}}
{option}{{background:{selected};color:{selected_ink}}}
{h} select[data-mb-component=select] option::checkmark,{lab} .u-select option::checkmark{{color:{active}}}
}}'''
    if item_id in {'C05', 'C06'}:
        kind = 'checkbox' if item_id == 'C05' else 'radio'
        return f'{h} input[data-mb-component={kind}]{enabled},{lab} .u-{kind}{enabled}{{accent-color:{normal if adobe else active};width:18px;height:18px;min-height:0}}'
    if item_id == 'C07':
        switches = [f'{p} input.mb-toggle[data-mb-component=switch]', f'{p} #right #params .mb-choice-row>input.mb-toggle[data-mb-component=switch]', f'{lab} .u-switch']
        off = group(*(x + enabled for x in switches))
        on = group(*(x + ':checked' + enabled for x in switches))
        off_thumb = group(*(x + enabled + '::after' for x in switches))
        on_thumb = group(*(x + ':checked' + enabled + '::after' for x in switches))
        return f'''{off}{{appearance:none;-webkit-appearance:none;position:relative;width:36px;height:20px;min-height:0;padding:0;border:1px solid {outline};border-radius:2px;background:{'#121f24' if adobe else '#39515a'}}}
{off_thumb}{{content:'';position:absolute;top:3px;left:3px;width:12px;height:12px;border-radius:1px;background:{normal}}}
{on}{{background:{normal if adobe else selected};border-color:{normal if adobe else active}}}
{on_thumb}{{left:19px;background:{'#121f24' if adobe else active}}}'''
    if item_id == 'C08':
        groups = group(f'{p} :is(.mb-tabs,#mbInspectModes,.v5-seg)', f'{lab} .u-segments')
        buttons = group(f'{p} :is(.mb-tabs,#mbInspectModes)>button[data-mb-component]{enabled}', f'{p} #right #params .v5-seg>button{enabled}', f'{lab} .u-segment{enabled}')
        on = group(f'{p} :is(.mb-tabs,#mbInspectModes)>button[data-mb-component]:is([aria-selected=true],[aria-pressed=true]){enabled}', f'{p} #right #params .v5-seg>button[aria-checked=true]{enabled}', f'{lab} .u-segment:is([aria-checked=true],[aria-selected=true],[aria-pressed=true]){enabled}')
        return f'''{groups}{{gap:{0 if adobe else 4}px;border:{'1px solid #39515a' if adobe else '0'};border-radius:4px;background:{'#121f24' if adobe else 'transparent'}}}
{buttons}{{border:{'0' if adobe else '1px solid #39515a'};border-radius:{0 if adobe else 4}px;background:transparent;color:{muted};font-weight:500;box-shadow:none}}
{on}{{border-color:{outline if adobe else active};background:{'#24373d' if adobe else selected};color:{normal if adobe else selected_ink};box-shadow:{'inset 0 0 0 1px #8da3ac' if adobe else 'none'}}}'''
    if item_id == 'C09':
        return f'''{p} #right #params :is(details.mod,#lhPos,#lhOut,#lhLink)>summary,{lab} .u-summary{{color:{normal if adobe else selected_ink};font-size:14px;line-height:22px;font-weight:{600 if adobe else 650}}}
{lab} .u-details{{border-top:1px solid #2b4149}}
{lab} .u-summary{{min-height:28px;padding-block:4px}}'''
    if item_id == 'C11':
        menus = ':is(.ab-menu,.v5-pop,.mb-display-menu,.mb-display-pop,.mb-observe-menu)'
        hover = group(f'{h} :is(.ab-menu,.v5-pop) [data-mb-component=button]:is(:hover,:focus-visible,[aria-checked=true],[aria-selected=true]){enabled}:not(.v5-danger)', f'{p} .mb-display .pchg:is(:hover,:has(input:checked))', f'{p} .mb-observe-menu button:is(:hover,[aria-pressed=true]){enabled}', f'{lab} .u-menu-item:is(:hover,:focus-visible,[aria-checked=true],[aria-selected=true]){enabled}')
        return f'''{p} {menus},{lab} .u-menu-body{{border:1px solid {outline};border-radius:{4 if adobe else 7}px;background:#1b2a2f;color:{normal}}}
{p} :is(.ab-menu,.v5-pop) [data-mb-component=button],{lab} .u-menu-item{{height:auto;min-height:32px;padding:6px 10px;white-space:normal;overflow-wrap:anywhere;line-height:20px;border-radius:4px}}
{hover}{{background:{selected};color:{selected_ink}}}'''
    if item_id == 'C12':
        return f'''{p} :is(dialog,[role=dialog]),{lab}.u-scope,{lab} .u-dialog{{border-radius:4px;border-color:{outline};background:#1b2a2f;color:{normal};font-size:{14 if adobe else 13}px}}
{lab} .u-dialog::backdrop{{background:rgb(0 0 0 / .55)}}'''
    if item_id == 'C16':
        return f'''{p} #busy .bar{{height:3px;border-radius:1px;background:#39515a}}
{p} #busy .bar i,{p} #busyBar{{background:{active};transition:none}}
{p} #busyText{{color:{normal};font-size:13px;line-height:20px}}
{lab} progress{{appearance:none;-webkit-appearance:none;width:100%;height:3px;border:0;border-radius:1px;background:#39515a;accent-color:{active};overflow:hidden}}
{lab} progress::-webkit-progress-bar{{background:#39515a;border-radius:1px}}
{lab} progress::-webkit-progress-value{{background:{active};border-radius:1px}}
{lab} progress::-moz-progress-bar{{background:{active};border-radius:1px}}'''
    if item_id == 'TREE':
        return f'''{p} #right .v5-row,{lab} .sample-tree-row{{height:28px;min-height:28px;gap:2px;border-radius:2px}}
{p} #right .v5-row{{padding-left:calc(var(--lv)*16px)}}
{p} #right .v5-row.sel,{lab} .sample-tree-row.selected{{background:{selected};box-shadow:inset 2px 0 {active};outline:0}}
{p} #right .v5-row .v5-name,{p} #right .v5-row[data-mb-role=layer] .v5-name,{lab} .sample-tree-name{{color:{normal};font-size:13px;line-height:20px;font-weight:400}}
{lab} .sample-tree-name{{padding:0 6px 0 2px}}
{p} #right .v5-row[data-mb-role=effect] .v5-name,{lab} .sample-tree-row[aria-level="1"] .sample-tree-name{{font-weight:650}}
{p} #right .mb-node-type,{p} #right .v5-row[data-mb-on-path=true] .mb-node-type,{lab} .sample-node-type{{color:{muted};background-color:currentColor;width:18px;height:18px}}
{p} #right .v5-row .v5-eye[data-mb-component][aria-pressed=true],{lab} .sample-tree-eye[aria-pressed=true]{{color:{selected_ink}}}
{p} #right .v5-row .v5-eye[data-mb-component][aria-pressed=false],{lab} .sample-tree-eye[aria-pressed=false]{{color:{muted}}}
{p} #right .v5-eye .fw-icon,{lab} .sample-tree-eye [data-fw-icon]{{width:18px;height:18px}}
{lab} :is(.sample-tree-caret,.sample-tree-solo){{display:inline-flex;align-items:center;justify-content:center;width:28px;min-width:28px;height:26px;padding:0;border:0;border-radius:3px;background:none;color:{muted};font:13px/20px var(--u-font)}}
{lab} .sample-tree-caret{{width:18px;min-width:18px;height:24px}}
{lab} .sample-tree-solo:is(.on,[aria-pressed=true]){{color:{selected_ink}}}
{p} #right :is(.mb-tree-guide,.mb-tree-guide.is-active,.mb-tree-guide.is-branch.is-active,.mb-tree-guide.is-branch.is-active.active-turn),
{p} #right .mb-tree-guide.is-branch.continues.active-below::after,{p} #right .mb-tree-guide.is-active:not(.active-below)::after{{border-color:#39515a;opacity:1}}
{p} #right .v5-row.off .v5-name,{p} #right .v5-row.off .mb-node-type{{color:{outline}}}'''
    if item_id == 'COLOR':
        return f'''{p} #colorControls .stage-row :is(.stage-time,.stage-hex),{p} #right #params .curvef .cv-keys,{lab} #project-color input:not([type=color]){{border:1px solid {outline};border-radius:4px;background:#121f24;color:{normal};font-size:12px;line-height:20px}}
{p} #colorControls .stage-row :is(.stage-time,.stage-hex)[aria-invalid=true],{p} #right #params .curvef .cv-keys.bad{{border-color:#e7735a;color:#e7735a}}
{p} #colorControls .stage-row input[data-mb-component=color],{p} #matColors .ramp-stop input[data-mb-component=color],{lab} #project-color input[type=color]{{border:1px solid {outline};border-radius:4px;padding:2px}}
{p} #matColors .ramp-preview,{p} #right .cv-plot,{lab} #project-ramp,{lab} .cv-plot{{border:1px solid #39515a;border-radius:4px}}'''
    raise ValueError('未定义组件映射：' + item_id)


def _selected_profile() -> dict:
    profile = json.loads((_HERE / 'appearance-profile.json').read_text(encoding='utf-8'))
    return {str(item['id']): item['selected'] for item in profile['record']['components']}


def _fixed_theme() -> str:
    selected = _selected_profile()
    return '/* 129项目混合组件；用户14族选型+三处主题绿。仅审阅副本，不是官方品牌整库。 */\n' + '\n\n'.join('/* ' + family + ' · ' + side + ' */\n' + _scene_overrides(family, side) for family, side in selected.items())


def build_combo_theme(repo: Path | None = None) -> str:
    """由同目录profile确定性生成固定组合；不再手工维护第二份组件规则。"""
    return _fixed_theme()


def _split_selectors(text: str) -> list[str]:
    parts, start, depth, quote = [], 0, 0, ''
    for i, char in enumerate(text):
        if quote:
            if char == quote and (i == 0 or text[i - 1] != '\\'):
                quote = ''
        elif char in '\"\'':
            quote = char
        elif char in '([':
            depth += 1
        elif char in ')]':
            depth -= 1
        elif char == ',' and depth == 0:
            parts.append(text[start:i].strip()); start = i + 1
    parts.append(text[start:].strip())
    return [part for part in parts if part]


def _scope_css(css: str, scope: str = '#combo-lab') -> str:
    """只处理仓库已有规则/媒体查询；将候选基础限制在lab，不污染真实工作区。"""
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    out, pos = [], 0
    while pos < len(css):
        brace = css.find('{', pos)
        if brace < 0:
            break
        head = css[pos:brace].strip()
        depth, end, quote = 1, brace + 1, ''
        while end < len(css) and depth:
            char = css[end]
            if quote:
                if char == quote and css[end - 1] != '\\':
                    quote = ''
            elif char in '\"\'':
                quote = char
            elif char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
            end += 1
        if depth:
            raise ValueError('CSS块不完整：' + head[:80])
        body = css[brace + 1:end - 1]
        if head.startswith(('@media', '@supports', '@container', '@layer')):
            out.append(head + '{' + _scope_css(body, scope) + '}')
        elif head.startswith('@'):
            raise ValueError('lab尚未支持此全局CSS规则：' + head)
        else:
            selectors = []
            for selector in _split_selectors(head):
                if selector.startswith(('.u-scope', '.fw-scope')):
                    selectors.append(scope + selector)
                elif selector in ('html', 'body', ':root'):
                    selectors.append(scope)
                else:
                    selectors.append(scope + ' ' + selector)
            out.append(','.join(selectors) + '{' + body + '}')
        pos = end
    return '\n'.join(out)


def _sources(repo: Path) -> dict:
    base = 'tool/design-system/drafts/v3-unified/'
    sections, dialog = _extract_catalog(_read(repo, base + 'components.html'))
    sections = sections.replace('恢复全部观察，并保留当前编辑对象与参数位置', '恢复全部观察，并保留当前编辑对象、参数位置与已经展开的分组（仅页面内示例）')
    sections = sections.replace('虚线边框表示只读，值可选择与复制。', '只读值可选择与复制；禁用目标不可编辑。')
    sections = sections.replace('<span class="catalog-number">C11–C16</span>', '<span class="catalog-number">C11</span>').replace('id="feedback-title">菜单、对话框与状态反馈', 'id="feedback-title">命令菜单与参数显示菜单')
    curve = re.search(r'function inspectorCurveHTML\(keys\) \{.*?\n\}', _read(repo, 'tool/src/js/70_ui.js'), re.S)
    if not curve:
        raise ValueError('原只读曲线渲染函数缺失')
    kit = _read(repo, base + 'component-kit.js')
    start = 'const start = () => { previous = number.value; };'
    if kit.count(start) != 1:
        raise ValueError('滑杆起始值逻辑已变化，停止盲目替换')
    kit = kit.replace(start, "const start = () => { if (number.value !== '' && number.validity.valid) previous = number.value; };")
    return {'sections': sections, 'dialog': dialog,
            'baseCSS': '\n'.join(_read(repo, name) for name in ['tool/design-system/tokens.css', base + 'candidate-tokens.css', base + 'candidate-components.css', base + 'catalog.css']),
            'icons': _read(repo, 'tool/design-system/drafts/v1/assets/icons.js'),
            'kit': kit, 'actions': _read(repo, base + 'catalog.js'), 'curve': curve.group(0)}


def _lab_scripts(source: dict) -> str:
    actions = source['actions'].replace('document.querySelectorAll(', 'lab.querySelectorAll(').replace('document.querySelector(', 'lab.querySelector(').replace('kit.enhance(document)', 'kit.enhance(lab)')
    project = _PROJECT_JS.replace('document.querySelectorAll(', 'lab.querySelectorAll(').replace('document.getElementById(', 'lab.querySelector("#" + ')
    # getElementById('x') -> querySelector('#' + 'x')，原ID与控制器关系保留。
    extra = r'''
  const refreshFill = input => {
    const min=Number(input.min || 0),max=Number(input.max || 100),value=Number(input.value);
    input.style.setProperty('--mb-fill',(max>min?Math.max(0,Math.min(100,(value-min)/(max-min)*100)):0)+'%');
  };
  lab.querySelectorAll('input[type=range]').forEach(input=>{refreshFill(input);input.addEventListener('input',()=>refreshFill(input));});
  lab.addEventListener('input',()=>lab.querySelectorAll('input[type=range]').forEach(refreshFill));
'''
    return ('if(!window.FWIcons){\n' + source['icons'] + '\n}\n' + source['kit'] + '\n(() => {\nconst lab=document.getElementById("combo-lab");if(!lab)return;\n' + source['curve'] + '\n' + actions + '\n' + project + '\n' + extra + '\n})();')


_LAB_LAYOUT = '''
#combo-lab{box-sizing:border-box;width:min(760px,calc(100vw - 32px));max-width:calc(100vw - 32px);max-height:calc(100dvh - 32px);min-height:0;height:auto;margin:auto;padding:16px 20px;overflow:auto;border:1px solid #8da3ac;border-radius:4px;background:#1b2a2f;color:#e4edef}
#combo-lab::backdrop{background:rgb(0 0 0 / .6)}
#combo-lab .combo-lab-head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:10px 12px;position:sticky;top:0;z-index:30;padding-bottom:12px;border-bottom:1px solid #2b4149;background:#1b2a2f}
#combo-lab .combo-lab-head>div{grid-column:1;grid-row:1;min-width:0}
#combo-lab .combo-lab-head>[data-combo-lab-close]{grid-column:2;grid-row:1}
#combo-lab .combo-lab-head .combo-family-label{grid-column:1/-1;display:flex;align-items:center;gap:8px;width:100%;min-width:0;margin:0;font-size:12px}
#combo-lab .combo-lab-head .combo-family-label select{flex:1 1 0;width:100%;min-width:0;max-width:none}
#combo-lab .combo-lab-head h2{margin:0;font-size:16px;line-height:24px;font-weight:600}
#combo-lab .combo-lab-head p{margin:3px 0 0;font-size:12px;color:#b4c5cb}
#combo-lab .catalog-main{display:block;width:100%;min-width:0;height:auto;padding:0!important}
#combo-lab [data-combo-family]{display:block;width:100%;min-width:0;padding:14px 0!important;border-bottom:1px solid #2b4149}
#combo-lab [data-combo-family][hidden]{display:none!important}
#combo-lab .catalog-section>header{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}
#combo-lab .catalog-section>header h2{margin:0;font-size:14px;line-height:22px}
#combo-lab .catalog-row{overflow:visible}
#combo-lab .catalog-feedback{position:static;margin-top:14px}
#combo-lab .sample-tree{background:#121f24}
#combo-lab .sample-extra>h3{margin:0 0 10px;font-size:14px;line-height:22px}
#combo-lab .u-menu-body{max-height:min(360px,calc(100dvh - 120px));overflow:auto}
#combo-lab #project-progress-value{height:3px}
@media(max-width:600px){#combo-lab{padding:12px}#combo-lab .project-color-inputs{grid-template-columns:1fr}#combo-lab .u-slider-row{grid-template-columns:minmax(56px,1fr) 64px auto}}
'''


def build_lab(repo: Path) -> dict:
    """可注入128副本的native dialog；14族使用原样板控制器，所有业务均为UI示意。"""
    repo = Path(repo)
    source = _sources(repo)
    parts = re.findall(r'<section\b[^>]*>.*?</section>', source['sections'], re.S)
    family_map, body_parts = {}, []
    reverse = {section: family for family, section in _SECTIONS.items() if family != 'C12'}
    dialog_trigger = ''
    for section in parts:
        section_id = re.search(r'\bid="([^"]+)"', section).group(1)
        if section_id not in reverse:
            continue
        family = reverse[section_id]
        if family == 'C11':
            trigger = re.search(r'<button\b[^>]*id="dialog-open".*?</button>', section, re.S)
            if not trigger:
                raise ValueError('原对话框入口缺失')
            dialog_trigger = trigger.group(0)
            section = section.replace(dialog_trigger, '')
        section = section.replace('<section ', f'<section data-combo-family="{family}" ', 1)
        family_map[family] = [section_id]
        body_parts.append(section)
    body_parts.append('<section class="sample-extra" id="project-dialog" data-combo-family="C12"><h3>C12 · 对话框与表单弹层</h3><p class="sample-boundary">原生模态示例；确认只更新页面提示，不保存文件。</p>' + dialog_trigger + source['dialog'] + '</section>')
    family_map['C12'] = ['project-dialog']
    project = _project_markup(repo).replace('项目进度示意；原候选没有独立的品牌进度样板，两列不提供品牌差异。', '129原生progress项目组件；手动拨动只演示进行中反馈，没有执行真实任务。').replace('两列不提供品牌差异', '不是官方品牌整库')
    for family, section_id in _PROJECT.items():
        section = re.search(r'<section\b[^>]*id="' + re.escape(section_id) + r'".*?</section>', project, re.S)
        if not section:
            raise ValueError('项目样例缺失：' + family)
        body_parts.append(section.group(0).replace('<section ', f'<section data-combo-family="{family}" ', 1))
        family_map[family] = [section_id]
    if len(family_map) != 14:
        raise ValueError('lab族数不是14')
    body = '<dialog id="combo-lab" class="fw-scope u-scope" data-density="compact" aria-labelledby="combo-lab-title"><header class="combo-lab-head"><div><h2 id="combo-lab-title">129 · 组件操作检查</h2><p>项目混合组件 · 全部为页面内示意，不接配方、保存、烘焙或UE。</p></div><button type="button" class="u-button u-quiet" data-combo-lab-close>关闭</button></header><main class="catalog-main">' + '\n'.join(body_parts) + '</main><output id="catalog-feedback" class="catalog-feedback" role="status" aria-live="polite">可操作样例；不代表真实业务校验通过。</output></dialog>'
    css = _scope_css(source['baseCSS'] + '\n' + _FRAME_CSS) + '\n' + _LAB_LAYOUT
    # 固定主题独立返回给装配器，防止它在lab插入时重复注入。
    return {'body': body, 'css': css, 'scripts': _lab_scripts(source), 'familyMap': family_map,
            'sources': ['tool/design-system/tokens.css', 'tool/design-system/drafts/v3-unified/components.html',
                        'tool/design-system/drafts/v3-unified/candidate-tokens.css', 'tool/design-system/drafts/v3-unified/candidate-components.css',
                        'tool/design-system/drafts/v3-unified/catalog.css', 'tool/design-system/drafts/v3-unified/component-kit.js',
                        'tool/design-system/drafts/v3-unified/catalog.js', 'tool/design-system/drafts/v1/assets/icons.js',
                        'tool/src/js/70_ui.js']}


def build_catalog(repo: Path, items: list) -> dict:
    """14族均具有实际128+lab映射；候选是129项目组合外观，不声称官方品牌整库。"""
    repo = Path(repo)
    source = _sources(repo)
    project = _project_markup(repo)
    result = {}
    fixed = _fixed_theme()
    for item in items:
        family = str(item['id'])
        if family not in _SECTIONS and family not in _PROJECT:
            raise ValueError('组件目录存在未接样本id：' + family)
        visible = _SECTIONS.get(family, _PROJECT.get(family))
        visible_css = f'#{visible}{{display:block}}'
        if family in {'C11', 'C12'}:
            visible_css += '.catalog-row:has(.sample-error){display:none!important}.catalog-row>h3{display:none}'
            visible_css += '#dialog-open{display:none}' if family == 'C11' else '.u-menu{display:none}'
        variants = {}
        for side in ('material', 'adobe'):
            css = source['baseCSS'] + '\n' + _FRAME_CSS + '\n' + fixed + '\n' + _scene_overrides(family, side) + '\n' + visible_css
            script = '\n'.join([source['icons'], source['kit'], source['actions'], source['curve'], _PROJECT_JS, "document.querySelectorAll('input[type=range]').forEach(x=>{const f=()=>x.style.setProperty('--mb-fill',((Number(x.value)-Number(x.min||0))/(Number(x.max||100)-Number(x.min||0))*100)+'%');f();x.addEventListener('input',f);});"]).replace('</script', '<\\/script')
            title = html.escape(str(item.get('name', family)) + ' · 129项目组件示例')
            variants[side] = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>' + title + '</title><style>' + css + '</style></head><body id="combo-lab" class="fw-scope u-scope sample-root" data-density="compact"><main class="catalog-main">' + source['sections'] + project + '</main><output id="catalog-feedback" class="catalog-feedback" role="status" aria-live="polite">129项目混合组件；仅页面内示意，不接烘焙、配方、素材包或UE。</output>' + source['dialog'] + '<script>' + script + '</script></body></html>'
        result[family] = {'materialHtml': variants['material'], 'adobeHtml': variants['adobe'],
                          'overrideCSS': {side: _scene_overrides(family, side) for side in ('material', 'adobe')},
                          'sceneApplicable': True, 'sampleKind': 'project-composition' if family in _PROJECT else 'existing-candidate',
                          'sampleNote': '129项目混合组件；沿用原DOM/控制器并映射真实128。C03/C04/C11保留用户要求的主题绿；不是官方Adobe或Material整库。' + (' 树/颜色/进度为项目领域组合，不制造官方双版本。' if family in {'TREE', 'COLOR', 'C16'} else ''),
                          'sampleHeight': 440 if family in {'C02', 'C11', 'C12', 'COLOR'} else 340}
    return result
