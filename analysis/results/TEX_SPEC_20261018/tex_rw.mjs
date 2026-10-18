// 烟花贴图新规范（用户 10-18「每张图都必须关掉neverstream，贴图group组改成distantFX,nomip可以开，clamp可以做」，同意由本机同步检测执行）
// 用法：node tex_rw.mjs dry | apply | verify
//   dry    只读：Python 枚举名在不在、版本管理在不在线、目标有没有别人没存的改动（不改任何东西）
//   apply  每批 5 张：P4 迁出 → 改（只限下面几个字段）→ 读回 → 保存；任何异常整轮停
//   verify 只读：/object/get 重读每张 + 磁盘哈希 / 只读位，和 targets.json 的改前值比
// 护栏：路由只放 /object/get、/object/call（LoadAsset、ExecutePythonCommandEx）；Python 代码由本脚本生成，里面的资产路径必须全在 targets.json；
//       字段只限 never_stream、lod_group、address_x、address_y、mip_gen_settings；共享贴图（别的项目也引用）不在 targets 里，不碰。
import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';
const HERE = new URL('./', import.meta.url);
const PYLIB = '/Script/PythonScriptPlugin.Default__PythonScriptLibrary', LIB = '/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const T = JSON.parse(fs.readFileSync(new URL('targets.json', HERE), 'utf8')).targets, PATHS = new Set(T.map(t => t.path));
const LOG = []; const mode = process.argv[2];
function once(route, payload, timeout) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(payload)), t0 = Date.now();
    const q = http.request('http://127.0.0.1:17780/gpcli' + route, { agent: false, method: 'POST', headers: { 'Content-Type': 'text/plain', 'Content-Length': body.length } }, r => {
      let text = ''; r.setEncoding('utf8'); r.on('data', c => text += c); r.on('end', () => {
        try { const v = JSON.parse(text), ok = r.statusCode === 200 && v.success !== false; LOG.push({ t: new Date().toISOString(), route, fn: payload.function, path: payload.path, ms: Date.now() - t0, ok });
          if (!ok) throw Error(v.message || text.slice(0, 300)); resolve(v.data ?? v); } catch (e) { reject(e); } }); });
    q.on('error', reject); q.setTimeout(timeout, () => q.destroy(Error('UE 请求超时 ' + route))); q.end(body);
  });
}
async function request(route, payload, timeout = 120000) {
  if (!['/object/get', '/object/call'].includes(route)) throw Error('白名单外的路由：' + route);
  if (route === '/object/call' && !['LoadAsset', 'ExecutePythonCommandEx'].includes(payload.function)) throw Error('白名单外的函数：' + payload.function);
  if (payload.function === 'ExecutePythonCommandEx') {
    const code = payload.args.PythonCommand; if (!code.startsWith('# FWL_TEXSPEC')) throw Error('不是本脚本生成的 Python');
    for (const m of code.matchAll(/'(\/Game\/[^']+)'/g)) if (!PATHS.has(m[1])) throw Error('Python 里有 targets 外的资产：' + m[1]);
  }
  const readOnly = route === '/object/get' || payload.function === 'LoadAsset';
  for (let i = 0; ; i++) {
    try { return await once(route, payload, timeout); }
    catch (e) { if (readOnly && i < 3 && /ECONNRESET|socket hang up|EPIPE/i.test(String(e.code || e.message))) { await new Promise(r => setTimeout(r, 1500)); continue; } throw e; }     // 只读请求偶发断连就重试；写不重试
  }
}
async function py(code, timeout = 600000) {
  const r = await request('/object/call', { path: PYLIB, function: 'ExecutePythonCommandEx', args: { PythonCommand: code, ExecutionMode: 'ExecuteFile', FileExecutionScope: 'Private' } }, timeout);
  const d = r.data || r, lines = [], re = /Output="((?:[^"\\]|\\.)*)"/g; let m;
  while ((m = re.exec(d.out_LogOutput || ''))) lines.push(m[1].replace(/\\(.)/g, (a, c) => c === 'n' ? '\n' : c === 't' ? '\t' : c));
  const line = lines.find(l => l.startsWith('FWLTEX:')); if (!line) throw Error('Python 没有回结果：' + String(d.out_CommandResult || '').slice(-1200) + ' | ' + lines.slice(-4).join(' | ').slice(-800));
  return JSON.parse(line.slice(7));
}
const READ = `def rd(t):
    return {'NeverStream': bool(t.get_editor_property('never_stream')), 'LODGroup': str(t.get_editor_property('lod_group')), 'AddressX': str(t.get_editor_property('address_x')),
            'AddressY': str(t.get_editor_property('address_y')), 'MipGenSettings': str(t.get_editor_property('mip_gen_settings'))}
`;
const list = ts => '[' + ts.map(t => `('${t.path}', ${t.ramp ? 'True' : 'False'})`).join(', ') + ']';
const save = (name, v) => fs.writeFileSync(new URL(name, HERE), JSON.stringify(v, null, 1));

if (mode === 'dry') {
  const code = `# FWL_TEXSPEC dry
import unreal, json
L = unreal.EditorAssetLibrary
${READ}sc = unreal.SourceControl
dirty = set(str(x.get_name()) for x in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages())
res = {'enums': [str(unreal.TextureGroup.TEXTUREGROUP_PROJECT03), str(unreal.TextureAddress.TA_CLAMP), str(unreal.TextureMipGenSettings.TMGS_NO_MIPMAPS)],
       'sc': {'enabled': bool(sc.is_enabled()), 'available': bool(sc.is_available())}, 'dirty': sorted(dirty), 'sample': {}}
t = unreal.load_asset('${T[0].path}')
res['sample'] = rd(t)
print('FWLTEX:' + json.dumps(res))
`;
  const r = await py(code, 300000); r.dirtyTargets = (r.dirty || []).filter(p => PATHS.has(p)); save('dry.json', r);
  console.log(JSON.stringify({ ...r, dirty: (r.dirty || []).length + ' 个没保存的包' }, null, 1));
} else if (mode === 'apply') {
  const done = fs.existsSync(new URL('apply.json', HERE)) ? JSON.parse(fs.readFileSync(new URL('apply.json', HERE), 'utf8')) : [];
  const finished = new Set(done.filter(x => x.saved).map(x => x.path)), todo = T.filter(t => !finished.has(t.path)).slice(0, +process.env.LIMIT || Infinity);     // LIMIT=5 先试一批
  console.log('待写', todo.length, '（已写过', finished.size, '）');
  for (let i = 0; i < todo.length; i += 5) {
    const batch = todo.slice(i, i + 5);
    const code = `# FWL_TEXSPEC apply
import unreal, json
L = unreal.EditorAssetLibrary
${READ}dirty = set(str(x.get_name()) for x in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages())
out = []
for p, ramp in ${list(batch)}:
    rec = {'path': p, 'ramp': ramp}
    try:
        if p in dirty:
            rec['skip'] = '改前已有没保存的改动（别人的），不碰'
            out.append(rec)
            continue
        rec['checkout'] = bool(L.checkout_asset(p))
        if not rec['checkout']:
            rec['skip'] = 'P4 迁出失败（可能被别人迁出）'
            out.append(rec)
            continue
        t = unreal.load_asset(p)
        rec['before'] = rd(t)
        t.set_editor_property('never_stream', False)
        t.set_editor_property('lod_group', unreal.TextureGroup.TEXTUREGROUP_PROJECT03)
        if ramp:
            t.set_editor_property('address_x', unreal.TextureAddress.TA_CLAMP)
            t.set_editor_property('address_y', unreal.TextureAddress.TA_CLAMP)
            t.set_editor_property('mip_gen_settings', unreal.TextureMipGenSettings.TMGS_NO_MIPMAPS)
        rec['after'] = rd(t)
        rec['saved'] = bool(L.save_asset(p, only_if_is_dirty=False))
    except Exception as e:
        rec['error'] = str(e)
    out.append(rec)
print('FWLTEX:' + json.dumps(out))
`;
    const r = await py(code, 900000); done.push(...r); save('apply.json', done);
    const bad = r.filter(x => x.error || !x.saved);
    console.log(`${Math.min(i + 5, todo.length)}/${todo.length}`, r.map(x => (x.saved ? '✓' : x.skip ? '跳' : '✗') + x.path.split('/').pop()).join(' '));
    if (r.some(x => x.error)) { console.log('有异常，整轮停：', JSON.stringify(bad)); break; }
  }
  fs.writeFileSync(new URL('log_apply.json', HERE), JSON.stringify(LOG));
} else if (mode === 'verify') {
  const rows = [];
  for (const t of T) {
    const k = t.path, o = k + '.' + k.split('/').pop();
    await request('/object/call', { path: LIB, function: 'LoadAsset', args: { AssetPath: k } });
    const p = (await request('/object/get', { path: o, properties: ['NeverStream', 'LODGroup', 'AddressX', 'AddressY', 'MipGenSettings', 'Filter', 'MaxTextureSize', 'CompressionSettings', 'SRGB'] })).properties;
    const f = t.disk.file, st = fs.statSync(f), sha = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
    const want = { NeverStream: false, LODGroup: 'TEXTUREGROUP_Project03', ...(t.ramp ? { AddressX: 'TA_Clamp', AddressY: 'TA_Clamp', MipGenSettings: 'TMGS_NoMipmaps' } : { AddressX: t.before.AddressX, AddressY: t.before.AddressY, MipGenSettings: t.before.MipGenSettings }) };
    const keep = ['Filter', 'MaxTextureSize', 'CompressionSettings', 'SRGB'].filter(x => p[x] !== t.before[x]);
    rows.push({ path: k, ramp: t.ramp, ok: Object.entries(want).every(([x, v]) => p[x] === v) && !keep.length, now: p, changedOther: keep, diskChanged: sha !== t.disk.sha256, writable: (st.mode & 0o200) !== 0 });
  }
  const bad = rows.filter(r => !r.ok || !r.diskChanged);
  save('verify.json', { at: new Date().toISOString(), total: rows.length, ok: rows.filter(r => r.ok).length, diskChanged: rows.filter(r => r.diskChanged).length, bad, rows });
  console.log('核对', rows.length, '张：字段对', rows.filter(r => r.ok).length, '磁盘已变', rows.filter(r => r.diskChanged).length, '已迁出可写', rows.filter(r => r.writable).length, '不对', bad.length);
  for (const b of bad.slice(0, 10)) console.log(' ✗', b.path, JSON.stringify(b.now), b.changedOther.join(','), 'disk', b.diskChanged);
} else if (mode === 'p4state') {     // 只读：迁出失败的那几张在 P4 里是什么状态
  const skipped = JSON.parse(fs.readFileSync(new URL('apply.json', HERE), 'utf8')).filter(x => x.skip && x.skip.startsWith('P4')).map(x => x.path);
  const code = `# FWL_TEXSPEC p4state
import unreal, json
out = []
for p in ${'[' + skipped.map(p => `'${p}'`).join(', ') + ']'}:
    s = unreal.SourceControl.query_file_state(p)
    out.append({'path': p, 'valid': bool(s.is_valid), 'checkedOut': bool(s.is_checked_out), 'checkedOutOther': bool(s.is_checked_out_other), 'other': str(s.checked_out_other), 'current': bool(s.is_current), 'sourceControlled': bool(s.is_source_controlled), 'canCheckOut': bool(s.can_check_out), 'added': bool(s.is_added)})
print('FWLTEX:' + json.dumps(out))
`;
  const r = await py(code, 120000); save('p4state.json', r); console.log(JSON.stringify(r, null, 1));
} else throw Error('mode? dry | apply | verify | p4state');
