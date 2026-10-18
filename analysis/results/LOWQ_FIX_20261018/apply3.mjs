// 用户 10-18「同意迁入以上三张图修改」：3 张 _HD 主图 MipGenSettings → NoMipmaps（其余字段不动）。
// 用法：node apply3.mjs dry | backup | apply | verify
// 护栏：路由只放 /object/get、/object/call（LoadAsset、ExecutePythonCommandEx）；Python 由本脚本生成（首行 # FWL_NOMIP3），里面引号内的 /Game 路径必须是这 3 张；写不重试。
import http from 'node:http'; import fs from 'node:fs'; import crypto from 'node:crypto';
const HERE = new URL('./', import.meta.url);
const DIR = '/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD/';
const T = ['T_EFX_FireWorks_RiseTrail_L_Loop_16x1_01_HD', 'T_EFX_FireWorks_RiseTrail_M_Loop_16x1_01_HD', 'T_EFX_FireWorks_GoldRayChry_4x4_01_HD'].map(n => DIR + n), PATHS = new Set(T);
const CONTENT = 'E:/loc_ma5/DFMEditor/DFM/Content/', BACKUP = 'F:/FireWorksLab/analysis/local/输出/LOWQ_FIX_20261018_备份/';
const PYLIB = '/Script/PythonScriptPlugin.Default__PythonScriptLibrary', LIB = '/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const PROPS = ['MipGenSettings', 'NeverStream', 'LODGroup', 'AddressX', 'AddressY', 'Filter', 'MaxTextureSize', 'CompressionSettings', 'SRGB', 'MipLoadOptions', 'LODBias'];
const file = p => CONTENT + p.slice(6) + '.uasset', sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const save = (n, v) => fs.writeFileSync(new URL(n, HERE), JSON.stringify(v, null, 1)), load = n => JSON.parse(fs.readFileSync(new URL(n, HERE), 'utf8'));
function once(route, payload, timeout) {
  return new Promise((resolve, reject) => { const b = Buffer.from(JSON.stringify(payload));
    const q = http.request('http://127.0.0.1:17780/gpcli' + route, { agent: false, method: 'POST', headers: { 'Content-Type': 'text/plain', 'Content-Length': b.length } }, r => {
      let s = ''; r.setEncoding('utf8'); r.on('data', c => s += c); r.on('end', () => { try { const v = JSON.parse(s); if (r.statusCode !== 200 || v.success === false) throw Error(v.message || s.slice(0, 300)); resolve(v.data ?? v); } catch (e) { reject(e); } }); });
    q.on('error', reject); q.setTimeout(timeout, () => q.destroy(Error('UE 超时 ' + route))); q.end(b); });
}
async function request(route, payload, timeout = 120000) {
  if (!['/object/get', '/object/call'].includes(route)) throw Error('白名单外路由');
  if (route === '/object/call' && !['LoadAsset', 'ExecutePythonCommandEx'].includes(payload.function)) throw Error('白名单外函数');
  if (payload.function === 'ExecutePythonCommandEx') { const c = payload.args.PythonCommand; if (!c.startsWith('# FWL_NOMIP3')) throw Error('不是本脚本的 Python');
    for (const m of c.matchAll(/'(\/Game\/[^']+)'/g)) if (!PATHS.has(m[1])) throw Error('Python 里有 3 张以外的资产：' + m[1]); }
  const ro = route === '/object/get' || payload.function === 'LoadAsset';
  for (let i = 0; ; i++) { try { return await once(route, payload, timeout); } catch (e) { if (ro && i < 3 && /ECONNRESET|socket hang up/i.test(String(e.code || e.message))) { await new Promise(r => setTimeout(r, 1500)); continue; } throw e; } }
}
async function py(code) {
  const d = await request('/object/call', { path: PYLIB, function: 'ExecutePythonCommandEx', args: { PythonCommand: code, ExecutionMode: 'ExecuteFile', FileExecutionScope: 'Private' } }, 600000);
  const lines = [], re = /Output="((?:[^"\\]|\\.)*)"/g; let m; while ((m = re.exec(d.out_LogOutput || ''))) lines.push(m[1].replace(/\\(.)/g, (a, c) => c === 'n' ? '\n' : c));
  const l = lines.find(x => x.startsWith('FWLN3:')); if (!l) throw Error('Python 没回结果：' + String(d.out_CommandResult).slice(-800)); return JSON.parse(l.slice(6));
}
const read = async () => { const o = {}; for (const p of T) { await request('/object/call', { path: LIB, function: 'LoadAsset', args: { AssetPath: p } }); o[p] = (await request('/object/get', { path: p + '.' + p.split('/').pop(), properties: PROPS })).properties; } return o; };
const list = '[' + T.map(p => `'${p}'`).join(', ') + ']';
const mode = process.argv[2];
if (mode === 'dry') {
  const before = await read();
  const st = await py(`# FWL_NOMIP3 dry
import unreal, json
dirty = set(str(x.get_name()) for x in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages())
out = []
for p in ${list}:
    s = unreal.SourceControl.query_file_state(p)
    out.append({'path': p, 'dirty': p in dirty, 'checkedOut': bool(s.is_checked_out), 'checkedOutOther': bool(s.is_checked_out_other), 'other': str(s.checked_out_other), 'current': bool(s.is_current), 'canCheckOut': bool(s.can_check_out)})
print('FWLN3:' + json.dumps(out))
`);
  const disk = Object.fromEntries(T.map(p => { const f = file(p), s = fs.statSync(f); return [p, { file: f, size: s.size, readonly: (s.mode & 0o200) === 0, sha256: sha(f) }]; }));
  save('apply3-dry.json', { at: new Date().toISOString(), before, p4: st, disk }); console.log(JSON.stringify({ before: Object.fromEntries(T.map(p => [p.split('/').pop(), before[p].MipGenSettings + ' ' + before[p].NeverStream + ' ' + before[p].LODGroup])), p4: st, disk: Object.values(disk).map(d => d.readonly + ' ' + d.sha256.slice(0, 12)) }, null, 1));
} else if (mode === 'backup') {
  const dry = load('apply3-dry.json'); fs.mkdirSync(BACKUP, { recursive: true }); const out = [];
  for (const p of T) { const f = file(p), dst = BACKUP + p.split('/').pop() + '.uasset'; fs.copyFileSync(f, dst); const a = sha(dst); if (a !== dry.disk[p].sha256) throw Error('备份哈希不符 ' + p); out.push({ path: p, backup: dst, sha256: a }); }
  save('apply3-backup.json', out); console.log('备份', out.length, '张，哈希与改前一致');
} else if (mode === 'apply') {
  const bk = load('apply3-backup.json'); if (bk.length !== 3) throw Error('先备份');
  const r = await py(`# FWL_NOMIP3 apply
import unreal, json
L = unreal.EditorAssetLibrary
dirty = set(str(x.get_name()) for x in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages())
out = []
for p in ${list}:
    rec = {'path': p}
    try:
        if p in dirty:
            rec['skip'] = '改前已有没保存的改动，不碰'
            out.append(rec)
            continue
        rec['checkout'] = bool(L.checkout_asset(p))
        if not rec['checkout']:
            rec['skip'] = 'P4 迁出失败'
            out.append(rec)
            continue
        t = unreal.load_asset(p)
        rec['before'] = str(t.get_editor_property('mip_gen_settings'))
        t.set_editor_property('mip_gen_settings', unreal.TextureMipGenSettings.TMGS_NO_MIPMAPS)
        rec['after'] = str(t.get_editor_property('mip_gen_settings'))
        rec['size'] = [t.blueprint_get_size_x(), t.blueprint_get_size_y()]
        rec['saved'] = bool(L.save_asset(p, only_if_is_dirty=False))
    except Exception as e:
        rec['error'] = str(e)
    out.append(rec)
print('FWLN3:' + json.dumps(out))
`);
  save('apply3.json', r); console.log(JSON.stringify(r, null, 1));
} else if (mode === 'verify') {
  const dry = load('apply3-dry.json'), now = await read(), rows = [];
  for (const p of T) { const b = dry.before[p], n = now[p], f = file(p), s = fs.statSync(f);
    const changed = PROPS.filter(k => JSON.stringify(n[k]) !== JSON.stringify(b[k]));
    rows.push({ path: p, ok: n.MipGenSettings === 'TMGS_NoMipmaps' && n.NeverStream === false && n.LODGroup === 'TEXTUREGROUP_Project03' && changed.join() === 'MipGenSettings', changed, now: n, diskChanged: sha(f) !== dry.disk[p].sha256, writable: (s.mode & 0o200) !== 0 }); }
  save('apply3-verify.json', { at: new Date().toISOString(), rows }); for (const r of rows) console.log(r.ok ? '✓' : '✗', r.path.split('/').pop(), '变了的字段', r.changed.join(','), '磁盘已变', r.diskChanged, '已迁出可写', r.writable);
} else throw Error('mode?');
