// 用户 10-18 16:4x「PC手游主序列都改nomip吧」：ResourceFX 3.0 行用到、只被烟花引用的主序列（材质参数 MainTex / BaseTex），MipGenSettings → NoMipmaps，其余字段不动。
// 用法：node nomip_all.mjs targets | dry | backup | apply | verify
//   targets  由 stats.json + 10-18 预检生成目标清单（排除共享、已 NoMip、辅助贴图 / Ramp / Cutout）
//   apply    每批 5 张：别人没存的改动就跳过 → P4 迁出 → 改 → 读回 → 存；有异常整轮停；可重跑（已存的跳过）
// 护栏：路由只放 /object/get、/object/call（LoadAsset、ExecutePythonCommandEx）；Python 首行 # FWL_NOMIPALL，引号内 /Game 路径必须在清单里；写不重试。
import http from 'node:http'; import fs from 'node:fs'; import crypto from 'node:crypto';
const HERE = new URL('./', import.meta.url);
const CONTENT = 'E:/loc_ma5/DFMEditor/DFM/Content/', BACKUP = 'F:/FireWorksLab/analysis/local/输出/LOWQ_FIX_20261018_备份/全部主序列/';
const PYLIB = '/Script/PythonScriptPlugin.Default__PythonScriptLibrary', LIB = '/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const PROPS = ['MipGenSettings', 'NeverStream', 'LODGroup', 'AddressX', 'AddressY', 'Filter', 'MaxTextureSize', 'CompressionSettings', 'SRGB', 'MipLoadOptions', 'LODBias'];
const MAIN_PARAMS = ['MainTex', 'BaseTex'];
const file = p => CONTENT + p.slice(6) + '.uasset', sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const save = (n, v) => fs.writeFileSync(new URL(n, HERE), JSON.stringify(v, null, 1)), load = n => JSON.parse(fs.readFileSync(new URL(n, HERE), 'utf8'));
const mode = process.argv[2];
if (mode === 'targets') {
  const st = load('stats.json'), pre = JSON.parse(fs.readFileSync(new URL('../TEX_SPEC_20261018/preflight.json', HERE), 'utf8'));
  const main = st.rows.filter(r => r.role === 'main');
  const isMain = r => pre.textures[r.path].params.some(x => MAIN_PARAMS.includes(x));
  const targets = main.filter(r => isMain(r) && !r.shared && r.mip !== 'TMGS_NoMipmaps').map(r => ({ path: r.path, pc: r.hd, size: r.w + 'x' + r.h, mb: +r.mb.toFixed(2) }));
  const skipped = { shared: main.filter(r => r.shared).map(r => r.path), aux: main.filter(r => !isMain(r) && !r.shared).map(r => r.path + ' (' + pre.textures[r.path].params.join(',') + ')'), alreadyNoMip: main.filter(r => r.mip === 'TMGS_NoMipmaps').map(r => r.path) };
  save('nomip_targets.json', { at: new Date().toISOString(), rule: 'MainTex / BaseTex、非共享、尚未 NoMip', targets, skipped });
  console.log('目标', targets.length, '（PC', targets.filter(t => t.pc).length, '手游', targets.filter(t => !t.pc).length, '）常驻合计', targets.reduce((a, t) => a + t.mb, 0).toFixed(1), 'MB；跳过 共享', skipped.shared.length, '辅助', skipped.aux.length, '已 NoMip', skipped.alreadyNoMip.length);
  process.exit(0);
}
const TG = load('nomip_targets.json').targets, T = TG.map(t => t.path), PATHS = new Set(T);
function once(route, payload, timeout) {
  return new Promise((resolve, reject) => { const b = Buffer.from(JSON.stringify(payload));
    const q = http.request('http://127.0.0.1:17780/gpcli' + route, { agent: false, method: 'POST', headers: { 'Content-Type': 'text/plain', 'Content-Length': b.length } }, r => {
      let s = ''; r.setEncoding('utf8'); r.on('data', c => s += c); r.on('end', () => { try { const v = JSON.parse(s); if (r.statusCode !== 200 || v.success === false) throw Error(v.message || s.slice(0, 300)); resolve(v.data ?? v); } catch (e) { reject(e); } }); });
    q.on('error', reject); q.setTimeout(timeout, () => q.destroy(Error('UE 超时 ' + route))); q.end(b); });
}
async function request(route, payload, timeout = 120000) {
  if (!['/object/get', '/object/call'].includes(route)) throw Error('白名单外路由');
  if (route === '/object/call' && !['LoadAsset', 'ExecutePythonCommandEx'].includes(payload.function)) throw Error('白名单外函数');
  if (payload.function === 'ExecutePythonCommandEx') { const c = payload.args.PythonCommand; if (!c.startsWith('# FWL_NOMIPALL')) throw Error('不是本脚本的 Python');
    for (const m of c.matchAll(/'(\/Game\/[^']+)'/g)) if (!PATHS.has(m[1])) throw Error('Python 里有清单外的资产：' + m[1]); }
  const ro = route === '/object/get' || payload.function === 'LoadAsset';
  for (let i = 0; ; i++) { try { return await once(route, payload, timeout); } catch (e) { if (ro && i < 3 && /ECONNRESET|socket hang up/i.test(String(e.code || e.message))) { await new Promise(r => setTimeout(r, 1500)); continue; } throw e; } }
}
async function py(code, timeout = 900000) {
  const d = await request('/object/call', { path: PYLIB, function: 'ExecutePythonCommandEx', args: { PythonCommand: code, ExecutionMode: 'ExecuteFile', FileExecutionScope: 'Private' } }, timeout);
  const lines = [], re = /Output="((?:[^"\\]|\\.)*)"/g; let m; while ((m = re.exec(d.out_LogOutput || ''))) lines.push(m[1].replace(/\\(.)/g, (a, c) => c === 'n' ? '\n' : c));
  const l = lines.find(x => x.startsWith('FWLNA:')); if (!l) throw Error('Python 没回结果：' + String(d.out_CommandResult).slice(-800)); return JSON.parse(l.slice(6));
}
const readOne = async p => { await request('/object/call', { path: LIB, function: 'LoadAsset', args: { AssetPath: p } }); return (await request('/object/get', { path: p + '.' + p.split('/').pop(), properties: PROPS })).properties; };
const list = ps => '[' + ps.map(p => `'${p}'`).join(', ') + ']';
if (mode === 'dry') {
  const before = {}; for (const p of T) before[p] = await readOne(p);
  const p4 = [];
  for (let i = 0; i < T.length; i += 10) p4.push(...await py(`# FWL_NOMIPALL dry
import unreal, json
dirty = set(str(x.get_name()) for x in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages())
out = []
for p in ${list(T.slice(i, i + 10))}:
    s = unreal.SourceControl.query_file_state(p)
    out.append({'path': p, 'dirty': p in dirty, 'checkedOut': bool(s.is_checked_out), 'checkedOutOther': bool(s.is_checked_out_other), 'other': str(s.checked_out_other), 'current': bool(s.is_current), 'canCheckOut': bool(s.can_check_out)})
print('FWLNA:' + json.dumps(out))
`));
  const disk = Object.fromEntries(T.map(p => { const f = file(p), s = fs.statSync(f); return [p, { file: f, size: s.size, readonly: (s.mode & 0o200) === 0, sha256: sha(f) }]; }));
  save('nomip_dry.json', { at: new Date().toISOString(), before, p4, disk });
  const bad = p4.filter(x => x.dirty || x.checkedOutOther || !x.current || !x.canCheckOut && !x.checkedOut);
  console.log('核对', T.length, '张；mip 现值', [...new Set(Object.values(before).map(b => b.MipGenSettings))].join(','), '；NeverStream 勾着', Object.values(before).filter(b => b.NeverStream).length, '；不能直接写', bad.length, JSON.stringify(bad));
} else if (mode === 'backup') {
  const dry = load('nomip_dry.json'); fs.mkdirSync(BACKUP, { recursive: true }); const out = [];
  for (const p of T) { const dst = BACKUP + p.slice(6).replace(/\//g, '__') + '.uasset'; fs.copyFileSync(file(p), dst); const a = sha(dst); if (a !== dry.disk[p].sha256) throw Error('备份哈希不符 ' + p); out.push({ path: p, backup: dst, sha256: a }); }
  save('nomip_backup.json', out); console.log('备份', out.length, '张，哈希与改前一致 →', BACKUP);
} else if (mode === 'apply') {
  if (load('nomip_backup.json').length !== T.length) throw Error('先备份');
  const done = fs.existsSync(new URL('nomip_apply.json', HERE)) ? load('nomip_apply.json') : [], fin = new Set(done.filter(x => x.saved).map(x => x.path));
  const todo = T.filter(p => !fin.has(p)); console.log('待写', todo.length, '（已写', fin.size, '）');
  for (let i = 0; i < todo.length; i += 5) {
    const r = await py(`# FWL_NOMIPALL apply
import unreal, json
L = unreal.EditorAssetLibrary
dirty = set(str(x.get_name()) for x in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages())
out = []
for p in ${list(todo.slice(i, i + 5))}:
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
        rec['saved'] = bool(L.save_asset(p, only_if_is_dirty=False))
    except Exception as e:
        rec['error'] = str(e)
    out.append(rec)
print('FWLNA:' + json.dumps(out))
`);
    done.push(...r); save('nomip_apply.json', done);
    console.log(`${Math.min(i + 5, todo.length)}/${todo.length}`, r.map(x => (x.saved ? '✓' : x.skip ? '跳' : '✗') + x.path.split('/').pop()).join(' '));
    if (r.some(x => x.error)) { console.log('有异常，整轮停：', JSON.stringify(r.filter(x => x.error))); break; }
  }
} else if (mode === 'verify') {
  const dry = load('nomip_dry.json'), rows = [];
  for (const p of T) { const b = dry.before[p], n = await readOne(p), f = file(p), s = fs.statSync(f);
    const changed = PROPS.filter(k => JSON.stringify(n[k]) !== JSON.stringify(b[k]));
    rows.push({ path: p, ok: n.MipGenSettings === 'TMGS_NoMipmaps' && n.NeverStream === false && changed.join() === 'MipGenSettings', changed, diskChanged: sha(f) !== dry.disk[p].sha256, writable: (s.mode & 0o200) !== 0 }); }
  const bad = rows.filter(r => !r.ok || !r.diskChanged || !r.writable);
  save('nomip_verify.json', { at: new Date().toISOString(), total: rows.length, ok: rows.filter(r => r.ok).length, bad, rows });
  console.log('核对', rows.length, '张：只变 MipGenSettings 且为 NoMip', rows.filter(r => r.ok).length, '；磁盘已变', rows.filter(r => r.diskChanged).length, '；已迁出可写', rows.filter(r => r.writable).length, '；不对', bad.length);
  for (const b of bad) console.log(' ✗', b.path, b.changed.join(','), b.diskChanged, b.writable);
} else throw Error('mode?');
