"""交付入口补丁（本机同步8，2026-10-13）：版本管理离线 / 状态没取到时，本机已迁出（可写）的文件按迭代更新。

用户 10-13 10:10：RiseTrail_L PC + 手机包检查报「目标不可写」，「我现在是本机迁出状态，应该是迭代处理」。
UE 日志：10:06 那次 8 项全是 sc=offline（DFPerforce 已启用但 is_available() 为假，原逻辑把「连不上」一律判成
不可写）；10:10 那次在线了，但 Loop 材质和粒子的状态没取到（is_valid 为假），同样判成不可写。10:15 只读复查：
这些文件都已迁出（checked out）、磁盘可写。

改法（只改交付入口，原工作台和源 HTML 不变）：
- 检查：版本管理给出有效状态时照旧（被别人锁 / 冲突 / 删除仍拦）；连不上或状态没取到时按磁盘判断——
  磁盘上没有（新建）或可写（本机已迁出 / 可写）就允许，只读（没迁出）才拦，提示写清原因。
- 迁出：连不上或状态没取到时不再硬要求在线，文件可写就跳过迁出、直接按迭代更新；只读仍报错停下。
- 保存后核对：连不上 / 状态没取到但文件可写，记作 offline-local（已存本机，回到在线后在 P4 核对），不再判失败。
Engine Python is 2.7: no f-strings; comments inside generated Python stay ASCII.
"""

# ── 1. 检查目标（readUpdateTargets 生成的 Python）────────────────────────
TARGET_OLD = """ if available:
  state = sc.query_file_state(pkg)
  blocked = bool(state.is_checked_out_other or state.is_conflicted or state.is_deleted)
  info['sc'] = 'added' if state.is_added else 'edited' if state.is_checked_out else 'tracked' if state.is_source_controlled else 'untracked'
  info['editable'] = bool(not blocked and ((not obj and not os.path.isfile(filename)) or (state.is_valid and (state.is_added or state.is_checked_out or state.can_check_out or not state.is_source_controlled))))
  if blocked: info['reason'] = 'Asset is locked by another user, deleted or conflicted'
  elif not info['editable']: info['reason'] = 'Source control does not allow editing this asset'
 records.append(info)
"""
TARGET_NEW = """ state = sc.query_file_state(pkg) if available else None
 if state is not None and state.is_valid:
  blocked = bool(state.is_checked_out_other or state.is_conflicted or state.is_deleted)
  info['sc'] = 'added' if state.is_added else 'edited' if state.is_checked_out else 'tracked' if state.is_source_controlled else 'untracked'
  info['editable'] = bool(not blocked and ((not obj and not os.path.isfile(filename)) or (state.is_added or state.is_checked_out or state.can_check_out or not state.is_source_controlled)))
  if blocked: info['reason'] = 'Asset is locked by another user, deleted or conflicted'
  elif not info['editable']: info['reason'] = 'Source control does not allow editing this asset'
 elif enabled:
  # FWL_SC_OFFLINE: source control offline or state unknown -> judge by disk.
  # Locally checked-out (writable) files are updated in place; read-only files are blocked.
  writable = (not os.path.isfile(filename)) or os.access(filename, os.W_OK)
  info['sc'] = 'offline-writable' if writable else 'offline-readonly'
  info['editable'] = bool(writable)
  info['reason'] = '' if writable else 'Source control unavailable and the local file is read-only (not checked out)'
 records.append(info)
"""

# ── 2. 迁出（prepareAssetUpdate 生成的 Python）────────────────────────────
CHECKOUT_OLD = """if sc and sc.is_enabled():
 assert sc.is_available(), 'Source control is unavailable'
 for key,pkg in entries:
  filename = os.path.abspath(os.path.join(unreal.Paths.project_content_dir(),pkg[6:] + '.uasset'))
  if not os.path.isfile(filename): continue
  state = sc.query_file_state(pkg)
  assert state.is_valid and not state.is_checked_out_other and not state.is_conflicted and not state.is_deleted, 'Asset is locked or conflicted: ' + pkg
  if not (state.is_added or state.is_checked_out):
   assert sc.check_out_or_add_file(pkg,True), sc.last_error_msg()
  state = sc.query_file_state(pkg)
  assert state.is_valid and (state.is_added or state.is_checked_out), 'Checkout verification failed: ' + pkg
`);"""
CHECKOUT_NEW = """if sc and sc.is_enabled():
 online = sc.is_available()
 for key,pkg in entries:
  filename = os.path.abspath(os.path.join(unreal.Paths.project_content_dir(),pkg[6:] + '.uasset'))
  if not os.path.isfile(filename): continue
  state = sc.query_file_state(pkg) if online else None
  if state is None or not state.is_valid:
   # FWL_SC_OFFLINE: offline or state unknown; a locally checked-out (writable) file is updated in place.
   assert os.access(filename, os.W_OK), 'Source control is unavailable and asset is read-only (not checked out): ' + pkg
   continue
  assert not state.is_checked_out_other and not state.is_conflicted and not state.is_deleted, 'Asset is locked or conflicted: ' + pkg
  if not (state.is_added or state.is_checked_out):
   assert sc.check_out_or_add_file(pkg,True), sc.last_error_msg()
   state = sc.query_file_state(pkg)
   assert (state.is_valid and (state.is_added or state.is_checked_out)) or os.access(filename, os.W_OK), 'Checkout verification failed: ' + pkg
`);"""

# ── 3. 保存后核对（saveCreatedAssets 生成的 Python + 判定）────────────────
SAVE_OFFLINE_OLD = """  elif not sc.is_available():
   info['sc'] = 'offline'
   info['reason'] = sc_error_text()
"""
SAVE_OFFLINE_NEW = """  elif not sc.is_available():
   # FWL_SC_OFFLINE: saved to a writable local file while offline -> keep it, reconcile in P4 later.
   info['sc'] = 'offline-local' if os.access(filename, os.W_OK) else 'offline'
   info['reason'] = '' if info['sc'] == 'offline-local' else sc_error_text()
"""
SAVE_FAILED_OLD = "    if info['sc'] == 'failed': info['reason'] = sc_error_text()\n"
SAVE_FAILED_NEW = ("    if info['sc'] == 'failed' and not state.is_valid and os.access(filename, os.W_OK): info['sc'] = 'offline-local'\n"
                   "    if info['sc'] == 'failed': info['reason'] = sc_error_text()\n")
SAVE_ACCEPT_OLD = "const failed = records.filter(r => !['added','edited','disabled'].includes(r.sc));"
SAVE_ACCEPT_NEW = "const failed = records.filter(r => !['added','edited','disabled','offline-local'].includes(r.sc));"
SAVE_LOG_OLD = "\n    return records;\n  }\n\n  async function importEmitters("
SAVE_LOG_NEW = ("\n    const offlineLocal = records.filter(r => r.sc === 'offline-local');\n"
                "    if (offlineLocal.length) log(stage + '：版本管理连不上，' + offlineLocal.length + ' 项按本机已迁出 / 可写文件保存在本机；回到在线后在 P4 里核对（新建的要加入）', 'warn');\n"
                "    return records;\n  }\n\n  async function importEmitters(")

# ── 4. 报错与提示文字（JS）──────────────────────────────────────────────
MESSAGE_OLD = "if(!target.editable)errors.push('目标不可写：'+target.pkg+'。请检查版本管理连接、迁出权限或他人锁定。');"
MESSAGE_NEW = ("if(!target.editable)errors.push('目标不可写：'+target.pkg+'。'+(target.sc==='offline-readonly'"
               "?'版本管理现在连不上，这个文件又是只读的（没迁出）：在 P4 里迁出，或等版本管理连上后重新检查。'"
               ":/locked/.test(target.reason||'')?'它被别人迁出 / 锁定、已删除或有冲突，请在 P4 里核对。'"
               ":'版本管理不允许编辑：请检查迁出权限，或在 P4 里迁出后重新检查。'));")
PREPARE_OLD = "    const errors=validateUpdateTargets(it);if(errors.length)throw Error(errors.join('\\n'));\n    it.importProgress.stage='备份与迁出';"
PREPARE_NEW = ("    const errors=validateUpdateTargets(it);if(errors.length)throw Error(errors.join('\\n'));\n"
               "    const offlineTargets=selectedUpdateTargets(it).filter(t=>t.exists&&t.sc==='offline-writable');"
               "if(offlineTargets.length)log('版本管理暂时连不上：'+offlineTargets.length+' 个本机已迁出（可写）的文件直接按迭代更新，不再迁出；回到在线后在 P4 里核对一次','warn');\n"
               "    it.importProgress.stage='备份与迁出';")

PATCHES = [
    ('检查目标', TARGET_OLD, TARGET_NEW),
    ('迁出', CHECKOUT_OLD, CHECKOUT_NEW),
    ('保存后离线', SAVE_OFFLINE_OLD, SAVE_OFFLINE_NEW),
    ('保存后状态没取到', SAVE_FAILED_OLD, SAVE_FAILED_NEW),
    ('保存判定', SAVE_ACCEPT_OLD, SAVE_ACCEPT_NEW),
    ('保存提示', SAVE_LOG_OLD, SAVE_LOG_NEW),
    ('报错文字', MESSAGE_OLD, MESSAGE_NEW),
    ('准备提示', PREPARE_OLD, PREPARE_NEW),
]


def apply(source):
    for label, old, new in PATCHES:
        if source.count(old) != 1:
            raise AssertionError('离线迁出补丁锚点变了（' + label + '）：' + str(source.count(old)) + ' 处')
        source = source.replace(old, new, 1)
    return source
