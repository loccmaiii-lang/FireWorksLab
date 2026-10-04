"""从当前烘焙器生成隔离交互稿，只替换界面层；生产源码不写入。"""
from pathlib import Path
import hashlib
import json

project = Path(__file__).resolve().parents[1]
repo = project.parents[1]
production = repo / 'tool/FireworkBaker.html'
html = production.read_text(encoding='utf-8')

def patch_file(name, edits):
    global html
    original = (repo / 'tool/src/js' / name).read_text(encoding='utf-8')
    edited = original
    for old, new in edits:
        assert edited.count(old) == 1, f'{name}: anchor not unique: {old[:80]}'
        edited = edited.replace(old, new, 1)
    assert html.count(original) == 1, f'{name} differs from generated production; rebuild production with tool/build.py first'
    html = html.replace(original, edited, 1)

patch_file('70_ui.js', [
    ("const qi = host.querySelector('.ptools input[type=search]')", "host.querySelector('.ptools').insertAdjacentHTML('beforeend', '<small class=\"pscope\">搜索当前层的参数；颜色与图层管理单独编辑</small>');\n  const qi = host.querySelector('.ptools input[type=search]')"),
    ("if (!row) { h.innerHTML = '<span class=\"ph-idle\">悬停或点一个参数看完整说明 · 双击参数名恢复默认</span>'; if (typeof curvesHot === 'function') curvesHot(null); return; }", "if (!row) { draftCloseHelp(); return; }"),
    ("if (row._lab != null) { row._it = it; const on = () => panelHelp(row); row.addEventListener('mouseenter', on); row.addEventListener('focusin', on); }", "if (row._lab != null) row = attachParameterHelp(row, it);"),
    ("if (!host._ph) { host._ph = true; host.addEventListener('mouseleave', () => panelHelp(null)); } panelHelp(null);", "panelHelp(null);"),
    ("syncTypeButton();\n}\nfunction refreshVisibility()", "syncTypeButton();\n  draftMaterialHelp(ms);\n}\nfunction refreshVisibility()"),
    ("x.title = '删除这一段';", "x.title = '删除这一段'; x.type = 'button'; x.setAttribute('aria-label', `删除第 ${i + 1} 段颜色`);"),
    ("d.open = pview.mopen['@' + g] !== false;", "d.open = true;"),
    ("d.addEventListener('toggle', () => { if (d._auto) return; pview.mopen['@' + g] = d.open; store.set('pModOpen', pview.mopen); });", "const heading = d.querySelector('summary'); heading.setAttribute('role', 'heading'); heading.setAttribute('aria-level', '2'); heading.tabIndex = -1; heading.addEventListener('click', e => e.preventDefault()); d.addEventListener('toggle', () => { if (!d.open) d.open = true; });"),
    ("m.querySelector('summary .mn').textContent = `更多 ${n} 项`;", "m._draftCount = n; draftMoreLabel(m);"),
    ("autoOpen(g, auto && !g.hidden, pview.mopen['@' + g.dataset.g] !== false);", "g.open = true;"),
    ("if (iw) row.title = '现在不起作用：' + iw; else row.removeAttribute('title');", "row.removeAttribute('title');"),
    ("const right = $('#right'), head = document.querySelector('.right-head');\n  right.scrollTop += target.getBoundingClientRect().top - right.getBoundingClientRect().top - head.offsetHeight - 8;", "const right = $('#rightContent');\n  right.scrollTop += target.getBoundingClientRect().top - right.getBoundingClientRect().top - 8;"),
])

module_help = """function addModHelp(d, text) {
  let p = d.querySelector(':scope > p.hint');
  if (!p) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'shelp'; b.textContent = '?';
    b.setAttribute('aria-label', '查看 ' + d._mod + ' 模块说明'); b.setAttribute('aria-controls', 'helpDock'); b.setAttribute('aria-pressed', 'false');
    d.querySelector('summary').appendChild(b);
    p = document.createElement('p'); p.className = 'hint'; p.hidden = true; d.querySelector('summary').after(p);
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); $('#pHelp').innerHTML = p.innerHTML; draftOpenHelp(d._mod, b); });
  }
  p.insertAdjacentHTML('beforeend', `<span class="hsec">${text}</span>`);
}
"""
panel43 = (repo / 'tool/src/js/71_panel43.js').read_text(encoding='utf-8')
module_original = panel43[panel43.index('function addModHelp('):panel43.index('// 随机折叠：')]
patch_file('71_panel43.js', [
    (module_original, module_help),
    ("m.addEventListener('toggle', () => { if (m._auto) return;", "m.addEventListener('toggle', () => { draftMoreLabel(m); if (m._auto) return;"),
    ("row._rndb.textContent = (open ? '随机 ▾' : '随机 ▸')", "row._rndb.setAttribute('aria-expanded', String(open)); row._rndb.textContent = (open ? '收起随机' : '展开随机')"),
])
patch_file('75_iter.js', [
    ("localStorage.getItem('fwb.' + k)", "localStorage.getItem('fwb.draftUI1.' + k)"),
    ("localStorage.setItem('fwb.' + k, JSON.stringify(v))", "localStorage.setItem('fwb.draftUI1.' + k, JSON.stringify(v))"),
])
patch_file('79_workbench.js', [
    ("box.hidden = !on; if (!on) { box.innerHTML = ''; return; }\n  const v = state.layerView;", "box.hidden = !on; if (!on) { box.innerHTML = ''; return; }\n  if (!box._draftInitialized) { box._draftInitialized = true; box.open = store.get('draftLayerOpen', true); box.addEventListener('toggle', () => store.set('draftLayerOpen', box.open)); }\n  const v = state.layerView;"),
    ("if (ev.key === 'Enter') go(ev);", "if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(ev); }"),
    ("$('#right').scrollTop = 0;", "$('#rightContent').scrollTop = 0;"),
    ("wb.sig = wbSig(); wbSync(); if", "wb.sig = wbSig(); wbSync(); refreshVisibility(); if"),
])

ui = (project / 'src/baker-interactions.js').read_text(encoding='utf-8')
html = html.replace('<head>', '<head>\n<base href="/tool/">', 1)
html = html.replace('</style>', '\n' + (project / 'src/baker-panel.css').read_text(encoding='utf-8') + '</style>', 1)
html = html.replace('<!-- 迭代区数据', '<script>\n' + ui + '</script>\n<!-- 迭代区数据', 1)
html = html.replace('</body>', '<script>document.querySelector("#verLabel").textContent += " · 交互稿";</script>\n</body>', 1)

# 非界面文件逐段完全相同；命名表只读。生产文件从未写入。
ui_files = {'70_ui.js', '71_panel43.js', '75_iter.js', '79_workbench.js'}
checks = []
for file in sorted((repo / 'tool/src/js').glob('*.js')):
    if file.name in ui_files:
        continue
    code = file.read_text(encoding='utf-8')
    assert code in html, f'core changed: {file.name}'
    checks.append({'file': file.name, 'sha256': hashlib.sha256(code.encode()).hexdigest(), 'unchanged': True})
names = {str(f.relative_to(repo)): hashlib.sha256(f.read_bytes()).hexdigest() for f in [repo/'analysis/命名/参数名称表.json', repo/'analysis/命名/模块表.json']}
proof = {'source':'tool/FireworkBaker.html', 'sourceSha256':hashlib.sha256(production.read_bytes()).hexdigest(), 'coreFiles':checks, 'nameFiles':names, 'storageNamespace':'fwb.draftUI1.', 'modifiedUiOnly':sorted(ui_files)}
(project / 'public').mkdir(exist_ok=True)
(project / 'public/baker.html').write_text(html, encoding='utf-8')
(project / 'public/source-integrity.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'交互稿生成完成；{len(checks)} 个非界面文件原样保留，命名表未修改。')
