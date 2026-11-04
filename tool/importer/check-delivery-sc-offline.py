"""交付入口离线迁出补丁检查（本机同步8，2026-10-13）。

从成品 df-fireworks-delivery_locmai.html 里取出导入器实际发给 UE 的三段 Python（检查目标 / 迁出 / 保存后核对），
在模拟的 unreal.SourceControl 下逐场景执行；不连 UE、不写任何资产。
"""
import contextlib, io, json, os, re, stat, sys, tempfile, types
from pathlib import Path

HERE = Path(__file__).resolve().parent
HTML = (HERE.parent / 'df-fireworks-delivery_locmai.html').read_text(encoding='utf-8')
sys.path.insert(0, str(HERE))
import delivery_sc_offline as patch

PREFIX = '# -*- coding: utf-8 -*-\nimport unreal, sys, io, os, json\n'
results = []


def check(name, cond, detail=''):
    results.append((name, bool(cond)))
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  ' + str(detail)))


def block(start, end='`'):
    i = HTML.index(start)
    j = HTML.index(end, i + len(start))
    code = HTML[i:j]
    assert '\\' not in code, '模板里有转义，测试需要先按 JS 规则还原'
    return code


TARGETS = block("entries = ${JSON.stringify(entries)}\nimport hashlib\nsc = getattr(unreal,'SourceControl',None)")
CHECKOUT = block("entries = ${JSON.stringify(entries)}\nsc = getattr(unreal,'SourceControl',None)\nif sc and sc.is_enabled():\n online")
SAVE = block("entries = ${JSON.stringify(entries)}\nrecords = []\nsc = getattr(unreal, 'SourceControl', None)")


class State(object):
    def __init__(self, valid=True, sc=True, co=False, other=False, added=False, can=True, conflicted=False, deleted=False):
        self.is_valid, self.is_source_controlled, self.is_checked_out = valid, sc, co
        self.is_checked_out_other, self.is_added, self.can_check_out = other, added, can
        self.is_conflicted, self.is_deleted = conflicted, deleted


class SC(object):
    def __init__(self, enabled=True, available=True, states=None, checkout_ok=True):
        self.enabled, self.available, self.states, self.checkout_ok = enabled, available, states or {}, checkout_ok
        self.checkouts = []

    def is_enabled(self): return self.enabled
    def is_available(self): return self.available
    def last_error_msg(self): return 'fixture error'

    def query_file_state(self, pkg):
        return self.states.get(pkg, State(valid=False))

    def check_out_or_add_file(self, pkg, silent):
        self.checkouts.append(pkg)
        if self.checkout_ok:
            self.states[pkg] = State(co=True)
        return self.checkout_ok


class Obj(object):
    def __init__(self, cls): self.cls = cls
    def get_class(self):
        return types.SimpleNamespace(get_name=lambda: self.cls)


def run(code, sc, content, entries, loaded=()):
    fake = types.ModuleType('unreal')
    fake.SourceControl = sc
    fake.Paths = types.SimpleNamespace(project_content_dir=lambda: content + '/')
    fake.load_asset = lambda pkg: Obj('MaterialInstanceConstant') if pkg in loaded else None
    fake.EditorLoadingAndSavingUtils = types.SimpleNamespace(get_dirty_content_packages=lambda: [])
    fake.EditorAssetLibrary = types.SimpleNamespace(get_metadata_tag=lambda obj, tag: '')
    sys.modules['unreal'] = fake
    text = code.replace('${JSON.stringify(entries)}', json.dumps(entries)).replace('${pyStr(MAP.tag)}', "'fwl.tag'")
    assert '${' not in text
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        exec(compile(PREFIX + text, 'fixture', 'exec'), {'__name__': 'fixture'})
    return out.getvalue()


def tagged(text, tag):
    line = next(l for l in text.splitlines() if l.startswith(tag))
    return json.loads(line[len(tag):])


with tempfile.TemporaryDirectory() as root:
    content = os.path.join(root, 'Content')
    pkgs = {name: '/Game/FX/' + name for name in ['ps', 'far', 'loop', 'locked', 'readonly', 'new']}

    def path(pkg): return os.path.join(content, pkg[6:] + '.uasset')

    for name, pkg in pkgs.items():
        if name == 'new':
            continue
        os.makedirs(os.path.dirname(path(pkg)), exist_ok=True)
        Path(path(pkg)).write_bytes(b'uasset')
    os.chmod(path(pkgs['readonly']), stat.S_IREAD)
    entries = [[k, v] for k, v in pkgs.items()]
    loaded = [v for k, v in pkgs.items() if k != 'new']

    # 1. 静态：补丁都在、旧逻辑都不在
    for label, old, new in patch.PATCHES:
        check('补丁已进成品：' + label, HTML.count(new) == 1 and HTML.count(old) == (1 if old in new else 0), (HTML.count(new), HTML.count(old)))

    # 2. 检查目标
    rows = {r['key']: r for r in tagged(run(TARGETS, SC(available=False), content, entries, loaded), 'FWLTARGETS:')}
    check('离线：本机已迁出（可写）的文件按可写', all(rows[k]['editable'] and rows[k]['sc'] == 'offline-writable' for k in ['ps', 'far', 'loop']), rows)
    check('离线：只读（没迁出）的文件仍拦，写明原因', not rows['readonly']['editable'] and rows['readonly']['sc'] == 'offline-readonly' and 'read-only' in rows['readonly']['reason'], rows['readonly'])
    check('离线：新建（磁盘上没有）可写', rows['new']['editable'], rows['new'])

    states = {pkgs['ps']: State(valid=False), pkgs['far']: State(co=True), pkgs['loop']: State(can=True),
              pkgs['locked']: State(other=True), pkgs['readonly']: State(valid=False)}
    rows = {r['key']: r for r in tagged(run(TARGETS, SC(states=dict(states)), content, entries, loaded), 'FWLTARGETS:')}
    check('在线但状态没取到、文件可写：按可写（10:10 那次）', rows['ps']['editable'] and rows['ps']['sc'] == 'offline-writable', rows['ps'])
    check('在线已迁出：edited 可写', rows['far']['editable'] and rows['far']['sc'] == 'edited', rows['far'])
    check('在线未迁出但能迁出：可写', rows['loop']['editable'] and rows['loop']['sc'] == 'tracked', rows['loop'])
    check('在线被别人迁出：仍拦', not rows['locked']['editable'] and 'locked' in rows['locked']['reason'], rows['locked'])
    check('在线状态没取到且只读：仍拦', not rows['readonly']['editable'], rows['readonly'])
    rows = {r['key']: r for r in tagged(run(TARGETS, SC(enabled=False), content, entries, loaded), 'FWLTARGETS:')}
    check('版本管理没启用：照旧全可写', all(r['editable'] and r['sc'] == 'disabled' for r in rows.values()), rows)

    # 3. 迁出
    ok_entries = [[k, pkgs[k]] for k in ['ps', 'far', 'loop']]
    sc = SC(available=False)
    run(CHECKOUT, sc, content, ok_entries)
    check('离线 + 已迁出可写：不迁出、直接继续', sc.checkouts == [])
    try:
        run(CHECKOUT, SC(available=False), content, ok_entries + [['readonly', pkgs['readonly']]])
        check('离线 + 只读：停下', False, '没拦住')
    except AssertionError as error:
        check('离线 + 只读：停下', 'read-only' in str(error), error)
    sc = SC(states={pkgs['ps']: State(valid=False), pkgs['far']: State(co=True), pkgs['loop']: State(can=True)})
    run(CHECKOUT, sc, content, ok_entries)
    check('在线：只迁出还没迁出的那个，已迁出 / 状态没取到但可写的不动', sc.checkouts == [pkgs['loop']], sc.checkouts)
    try:
        run(CHECKOUT, SC(states={pkgs['locked']: State(other=True)}), content, [['locked', pkgs['locked']]])
        check('在线被别人迁出：停下', False, '没拦住')
    except AssertionError as error:
        check('在线被别人迁出：停下', 'locked' in str(error), error)

    # 4. 保存后核对
    save_entries = [[k, pkgs[k]] for k in ['ps', 'far']]
    rows = tagged(run(SAVE, SC(available=False), content, save_entries), 'FWLSAVE:')
    check('离线保存到可写文件：offline-local，不判失败', all(r['sc'] == 'offline-local' and r['reason'] == '' for r in rows), rows)
    rows = tagged(run(SAVE, SC(states={pkgs['ps']: State(co=True), pkgs['far']: State(valid=False)}, checkout_ok=False), content, save_entries), 'FWLSAVE:')
    check('在线：已迁出记 edited；状态没取到但可写记 offline-local', rows[0]['sc'] == 'edited' and rows[1]['sc'] == 'offline-local', rows)
    rows = tagged(run(SAVE, SC(states={pkgs['ps']: State(can=False)}, checkout_ok=False), content, [['ps', pkgs['ps']]]), 'FWLSAVE:')
    check('在线状态有效但迁出失败：仍判失败', rows[0]['sc'] == 'failed', rows)
    check('保存判定接受 offline-local', "['added','edited','disabled','offline-local'].includes(r.sc)" in HTML)
    os.chmod(path(pkgs['readonly']), stat.S_IWRITE | stat.S_IREAD)

failed = [n for n, ok in results if not ok]
print(str(len(results) - len(failed)) + ' PASS / ' + str(len(failed)) + ' FAIL')
sys.exit(1 if failed else 0)
