"""离线组件选型样本；不读取存档，也不接入烘焙器业务。

build_catalog 返回按来源 JSON 的 id 索引的完整 srcdoc 和场景轻量皮肤。
左右使用同一份 v3 DOM、Component Kit 和交互，仅改变候选样式。
"""
from __future__ import annotations

import base64
import html
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
<section class="sample-extra" id="project-progress"><p class="sample-boundary">项目进度示意；原候选没有独立的品牌进度样板，两列不提供品牌差异。</p>
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
    """只投影外观；禁止碰 display/hidden、真实值、层级、进度或领域图形。"""
    adobe = side == "adobe"
    p = _ROOT
    h = f"{p} {_HOST}"
    normal = "#e4edef"
    selected = "#24373d" if adobe else "#173d39"
    selected_ink = normal if adobe else "#a1ded0"
    outline = "#8da3ac"
    if item_id == "C01":
        button = f'{h} :is([data-mb-component=button],[data-mb-component=icon-button]):not([data-mb-structural=true]):not(.mb-value-reset,.mreset,.lk,.shelp)'
        primary = "#00d49b" if adobe else "#173d39"
        primary_ink = "#062a23" if adobe else "#a1ded0"
        return f'''{button}:not(:disabled):not([aria-disabled=true]){{border-radius:4px;background-color:#1b2a2f;color:{normal};font-weight:500;box-shadow:none}}
{button}:hover:not(:disabled):not([aria-disabled=true]){{background-color:#24373d;border-color:{outline}}}
{button}:is(.primary,.fw-button--primary):not(:disabled):not([aria-disabled=true]){{background-color:{primary};border-color:#00d49b;color:{primary_ink};font-weight:600}}'''
    if item_id == "C02":
        field = f'{h} :is(input[data-mb-component=input],textarea[data-mb-component=textarea])'
        number = f'{p} #right :is(.mb-value-row,#params .mb-value-row)>.mb-value-number'
        return f'''{field}:not(:disabled):not([readonly]){{border-radius:4px;border-color:{outline};background-color:#121f24;color:{normal};font-size:{14 if adobe else 13}px;font-weight:400}}
{number}:not(:disabled):not([readonly]){{border-radius:4px;border-color:{outline};font-size:{14 if adobe else 13}px}}
{field}[readonly]:not(:disabled){{border-style:{'solid' if adobe else 'dashed'};border-color:#39515a}}'''
    if item_id == "C03":
        slider = f'{h} input[data-mb-component=slider]'
        if not adobe:
            return f'''{slider}:not(:disabled){{appearance:auto;-webkit-appearance:auto;accent-color:#00d49b;background:transparent}}
{slider}:not(:disabled)::-webkit-slider-runnable-track{{height:3px;background:#39515a}}
{slider}:not(:disabled)::-webkit-slider-thumb{{appearance:auto;-webkit-appearance:auto;width:12px;height:12px;margin-top:-4.5px;border:1px solid #00d49b;background:#00d49b}}'''
        return f'''{slider}:not(:disabled){{appearance:none;-webkit-appearance:none;background:transparent}}
{slider}:not(:disabled)::-webkit-slider-runnable-track{{height:2px;background:#8da3ac}}
{slider}:not(:disabled)::-webkit-slider-thumb{{appearance:none;-webkit-appearance:none;width:14px;height:14px;margin-top:-6px;border:1px solid #e4edef;background:#1b2a2f;border-radius:50%}}
{slider}:not(:disabled)::-moz-range-track{{height:2px;background:#8da3ac}}
{slider}:not(:disabled)::-moz-range-progress{{height:2px;background:#8da3ac}}
{slider}:not(:disabled)::-moz-range-thumb{{width:14px;height:14px;border:1px solid #e4edef;background:#1b2a2f}}'''
    if item_id == "C04":
        select = f'{h} select[data-mb-component=select]'
        return f'''{select}:not(:disabled){{border-radius:4px;border-color:{outline};background-color:#121f24;color:{normal};font-weight:400}}
@supports(appearance:base-select){{{select} option:is(:hover,:focus-visible,:checked):not(:disabled){{background:{selected};color:{selected_ink}}}}}'''
    if item_id in {"C05", "C06"}:
        kind = "checkbox" if item_id == "C05" else "radio"
        return f'{h} input[data-mb-component={kind}]:not(:disabled){{accent-color:{normal if adobe else "#00d49b"}}}'
    if item_id == "C07":
        switch = f'{p} input.mb-toggle[data-mb-component=switch]'
        field_switch = f'{p} #right #params .mb-choice-row>input.mb-toggle[data-mb-component=switch]'
        background = normal if adobe else "#173d39"
        ink = "#121f24" if adobe else "#00d49b"
        off = "#121f24" if adobe else "#39515a"
        return f'''{switch}:not(:disabled),{field_switch}:not(:disabled){{background:{off};border-color:{outline};border-radius:2px}}
{switch}:checked:not(:disabled),{field_switch}:checked:not(:disabled){{background:{background};border-color:{normal if adobe else '#00d49b'}}}
{switch}:checked:not(:disabled)::after{{background:{ink}}}'''
    if item_id == "C08":
        return f'''{p} :is(.mb-tabs,#mbInspectModes)>button[data-mb-component]:is([aria-selected=true],[aria-pressed=true]):not(:disabled),
{p} #right #params .v5-seg>button[aria-checked=true]:not(:disabled){{background:{selected};color:{selected_ink};box-shadow:inset 0 0 0 1px {outline if adobe else '#00d49b'}}}'''
    if item_id == "C09":
        return f'{p} #right #params :is(details.mod,#lhPos,#lhOut,#lhLink)>summary{{color:{normal if adobe else "#a1ded0"};font-weight:{600 if adobe else 500}}}'
    if item_id == "C11":
        return f'''{p} :is(.ab-menu,.v5-pop,.mb-display-menu,.mb-display-pop){{border-radius:{4 if adobe else 7}px;border-color:#39515a;background:#1b2a2f}}
{h} :is(.ab-menu,.v5-pop) [data-mb-component=button]:hover:not(:disabled):not(.v5-danger){{background:{selected};color:{selected_ink}}}'''
    if item_id == "C12":
        return f'{p} :is(dialog,[role=dialog]){{border-radius:4px;border-color:{outline};background:#1b2a2f;color:{normal};font-size:{14 if adobe else 13}px}}'
    return ""


def build_catalog(repo: Path, items: list) -> dict:
    """构建14族候选对照；返回的 HTML 可直接用于 iframe.srcdoc。"""
    repo = Path(repo)
    base = "tool/design-system/drafts/v3-unified/"
    spectrum = "tool/design-system/drafts/v5-spectrum-20261029/"
    sections, dialog = _extract_catalog(_read(repo, base + "components.html"))
    common_css = "\n".join(_read(repo, name) for name in [
        "tool/design-system/tokens.css", base + "candidate-tokens.css",
        base + "candidate-components.css", base + "catalog.css",
    ])
    adobe_css = _read(repo, spectrum + "spectrum-tokens.css") + "\n" + _read(repo, spectrum + "spectrum-components.css")
    icons = _read(repo, "tool/design-system/drafts/v1/assets/icons.js")
    kit = _read(repo, base + "component-kit.js")
    actions = _read(repo, base + "catalog.js")
    source = _read(repo, "tool/src/js/70_ui.js")
    curve = re.search(r"function inspectorCurveHTML\(keys\) \{.*?\n\}", source, re.S)
    if not curve:
        raise ValueError("原只读曲线渲染函数缺失")
    project = _project_markup(repo)
    result = {}
    for item in items:
        item_id = str(item["id"])
        if item_id not in _SECTIONS and item_id not in _PROJECT:
            raise ValueError("组件目录存在未接样本 id：" + item_id)
        visible = _SECTIONS.get(item_id, _PROJECT.get(item_id))
        visible_css = f'#{visible}{{display:block}}'
        if item_id in {"C11", "C12"}:
            visible_css += '.catalog-row:has(.sample-error){display:none!important}.catalog-row>h3{display:none}'
            visible_css += '#dialog-open{display:none}' if item_id == "C11" else '.u-menu{display:none}'
        variants = {}
        for side in ("material", "adobe"):
            # 无独立对等样板的三族展示相同项目组合，不能靠令牌差异伪造品牌版本。
            shared_project = item_id in {"TREE", "COLOR", "C16"}
            spectrum_skin = side == "adobe" or shared_project
            css = common_css + ("\n" + adobe_css if spectrum_skin else "") + "\n" + _FRAME_CSS + "\n" + visible_css
            script = "\n".join([icons, kit, actions, curve.group(0), _PROJECT_JS]).replace("</script", "<\\/script")
            title = html.escape(str(item.get("name", item_id)) + " · 页面内组件示例")
            design = ' data-design="spectrum"' if spectrum_skin else ''
            variants[side] = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>' + title + '</title><style>' + css + '</style></head><body class="fw-scope u-scope sample-root" data-density="compact"' + design + '><main class="catalog-main">' + sections + project + '</main><output id="catalog-feedback" class="catalog-feedback" role="status" aria-live="polite">仅页面内示意，不接烘焙、配方、素材包或UE。</output>' + dialog + '<script>' + script + '</script></body></html>'
        supported = bool(item.get("supportsSwitch", True)) and item_id in {"C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08", "C09"}
        composition = item_id in _PROJECT
        note = "沿用原候选的相同DOM与Component Kit，仅比较样式；样板校验不改变128参数的允许范围。"
        if item_id in {"TREE", "COLOR", "C16"}:
            note = "共用项目组合，未提供独立且对等的Adobe/Material编辑器或进度组件；两列仅供检查，不应用场景换皮。"
        elif item_id == "C09":
            note = "项目折叠组合：使用已有u-details/u-summary与候选令牌，不声称为官方品牌编辑器；场景只换标题外观。"
        elif item_id in {"C11", "C12"}:
            note += " 菜单/模态可在本样板操作；当前场景没有适合展示的打开状态，未注入场景替换。"
        result[item_id] = {
            "materialHtml": variants["material"], "adobeHtml": variants["adobe"],
            "overrideCSS": {side: _scene_overrides(item_id, side).replace(":not(:disabled)", ":not(:disabled):not(.inert *)") if supported else "" for side in ("material", "adobe")},
            "sceneApplicable": supported, "sampleKind": "project-composition" if composition else "existing-candidate",
            "sampleNote": note, "sampleHeight": 440 if item_id in {"C02", "C11", "C12", "COLOR"} else 340,
        }
    return result
