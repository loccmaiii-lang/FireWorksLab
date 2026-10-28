"""只生成隔离设计Demo；不构建或修改生产文件。"""
from pathlib import Path
import re
import hashlib
import json

HERE = Path(__file__).resolve().parent
OLD = HERE.parent / 'v1'
STRUCTURE = HERE.parent / 'v2-structure'
html = (OLD / 'demo.html').read_text(encoding='utf-8')
scripts = list(re.finditer(r'<script>(.*?)</script>', html, re.S))
main = scripts[-1]
js = main.group(1)
structure = (STRUCTURE / 'draft.js').read_text(encoding='utf-8')
start, end = '  function tree(page)', '  function selectedNode(page)'
new_tree = structure[structure.index(start):structure.index(end)]
new_tree = new_tree.replace('本稿不修改业务数据。', '只操作独立Demo数据。')
js = js[:js.index(start)] + new_tree + js[js.index(end):]
js = js.replace('fwl.ui-demo.v1', 'fwl.ui-demo.v3-unified')
js = js.replace('data-route="components"', 'data-u-open-catalog')
js = js.replace('组件样板</button>', '控件状态样板</button>')
js = js.replace("if(banner)banner.textContent=valid||demo.message;", "if(banner)banner.textContent=state.page==='importer'?(demo.importDone?'确认流程演示已结束，没有执行真实导入。':!demo.queue.length?'队列为空，请加载内置示例。':demo.importChecked?'示例检查已结束，请核对两项确认；未连接UE。':'请检查当前示例队列与设置，再逐项核对；未读取资产、未连接UE。'):valid||[demo.message,demoExportReason()].filter(Boolean).join(' ');")
js = js.replace("    demoRefresh();\n  }\n  function demoHandleAction", "    demoRefresh();\n    window.UnifiedWorkspace?.enhance(app);\n  }\n  function demoHandleAction")
restore_sequence = '    restoreScroll();\n    requestAnimationFrame(updateTimelineLabels);\n    demoEnhance();'
assert restore_sequence in js
js = js.replace(restore_sequence, '    demoEnhance();\n    restoreScroll();\n    requestAnimationFrame(updateTimelineLabels);')
# 确认绑定当前设置；更改设置立即作废，避免沿用旧确认。
needle = "if(el.dataset.demoField){demoBegin();"
assert needle in js
js = js.replace(needle, needle + "if(state.page==='importer'){demo.importChecked=false;demo.importDone=false;demo.importConfirmed=[false,false];const box=app.querySelector('.confirm-checks');if(box)box.querySelectorAll('input').forEach(c=>{c.checked=false;c.disabled=true;});const action=app.querySelector('[data-demo-action=import-confirm]');if(action)action.disabled=true;const checked=app.querySelector('[data-u-import-check-state]');if(checked)checked.textContent='设置已改变，原确认已失效，请重新检查示例。';demoNotify('设置已改变，原确认已失效。');}")
js = js.replace("${pair('检查',demo.importChecked?", "${pair('检查',demo.importChecked?")
js = js.replace('<div class="import-review-summary">', '<p class="helper" data-u-import-check-state role="status"></p><div class="import-review-summary">')
# 对话框实际入口可为顶栏或业务动作；取消后回到该入口。
old_close = "document.querySelector(`[data-demo-action=\"${d.dataset.returnAction||'help'}\"]`)?.focus();"
new_close = "(document.querySelector(`[data-demo-action=\"${d.dataset.returnAction}\"]`)||document.querySelector(`[data-demo-top-action=\"${d.dataset.returnAction||'help'}\"]`))?.focus();"
assert old_close in js
js = js.replace(old_close, new_close)
js = js.replace("d.showModal();", "window.UnifiedWorkspace?.enhance(d);d.showModal();")
js = js.replace("document.querySelector('#demo-dialog').addEventListener('cancel',()=>setTimeout(()=>document.querySelector('[data-demo-top-action=\"help\"]')?.focus(),0));", "document.querySelector('#demo-dialog').addEventListener('cancel',()=>setTimeout(()=>{const d=document.querySelector('#demo-dialog');(document.querySelector(`[data-demo-action=\"${d.dataset.returnAction}\"]`)||document.querySelector(`[data-demo-top-action=\"${d.dataset.returnAction||'help'}\"]`))?.focus();},0));")
html = html[:main.start(1)] + js + html[main.end(1):]
html = html.replace('class="fw-scope demo-shell"', 'class="fw-scope u-scope demo-shell"')
html = html.replace('<strong>组件交互 Demo</strong>', '<a class="u-review-home" href="index.html">统一候选 v3</a>')
html = html.replace('独立示例 · 不连接真实配方或UE', '规范适配 · 独立示例')
html = html.replace('<option value="components">组件样板</option>', '')
html = html.replace('</head>', '<link rel="stylesheet" href="candidate-tokens.css"><link rel="stylesheet" href="candidate-components.css"><link rel="stylesheet" href="../v2-structure/structure.css"><link rel="stylesheet" href="workspace.css"></head>')
marker = '<script>' + main.group(1)[:30]
# 新控制器在原Demo控制器之前注册薄适配，渲染后统一类由demoEnhance调用。
last_script = html.rfind('<script>')
imports = '<script src="../v2-structure/structure-tree.js"></script><script src="component-kit.js"></script><script src="workspace-adapter.js"></script>'
html = html[:last_script] + imports + html[last_script:]
(HERE / 'demo.html').write_text(html, encoding='utf-8')
local = HERE.parents[3] / 'analysis/local/20261029_组件规范统一'
local.mkdir(parents=True, exist_ok=True)
(local / 'generated-demo.js').write_text(js, encoding='utf-8')
written = (HERE / 'demo.html').read_bytes()
print(json.dumps({'bytes':len(written), 'sha256':hashlib.sha256(written).hexdigest(), 'storage':'fwl.ui-demo.v3-unified'}, ensure_ascii=False))
