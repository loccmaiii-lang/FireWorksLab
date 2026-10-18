// 低画质方头 / 金芒菊对比（本机同步检测 10-18）：GPUECli 白名单客户端。
// 只许：/object/get（只读）；/object/set 只改自建的 /Engine/Transient.FWL18_MI_*；/object/call 只许本脚本生成的 Python（首行 # FWL18）和 GetCVarValue。
// 写请求不自动重试；只读请求偶发断连重试 3 次。
import http from 'node:http';
export const LOG = [];
function once(route, payload, timeout) {
  return new Promise((resolve, reject) => {
    const b = Buffer.from(JSON.stringify(payload)), t0 = Date.now();
    const q = http.request('http://127.0.0.1:17780/gpcli' + route, { agent: false, method: 'POST', headers: { 'Content-Type': 'text/plain', 'Content-Length': b.length } }, r => {
      let s = ''; r.setEncoding('utf8'); r.on('data', c => s += c);
      r.on('end', () => { try { const v = JSON.parse(s), ok = r.statusCode === 200 && v.success !== false; LOG.push({ route, fn: payload.function, path: payload.path, ms: Date.now() - t0, ok }); if (!ok) throw Error(v.message || s.slice(0, 500)); resolve(v.data ?? v); } catch (e) { reject(e); } });
    });
    q.on('error', reject); q.setTimeout(timeout, () => q.destroy(Error('UE 超时（写不重试，先查状态）' + route))); q.end(b);
  });
}
export async function request(route, payload, timeout = 120000) {
  if (!['/object/get', '/object/set', '/object/call'].includes(route)) throw Error('白名单外路由 ' + route);
  if (route === '/object/set' && !/^\/Engine\/Transient\.FWL18_MI_\w+$/.test(payload.path ?? '')) throw Error('只许改自建 FWL18_MI：' + payload.path);
  if (route === '/object/call') {
    const okPy = payload.path === '/Script/PythonScriptPlugin.Default__PythonScriptLibrary' && payload.function === 'ExecutePythonCommandEx' && payload.args.PythonCommand.startsWith('# FWL18');
    const okCv = payload.path === '/Script/ConsoleToolset.Default__ConsoleToolset' && payload.function === 'GetCVarValue';
    if (!okPy && !okCv) throw Error('白名单外调用');
  }
  const readOnly = route === '/object/get' || payload.function === 'GetCVarValue';
  for (let i = 0; ; i++) {
    try { return await once(route, payload, timeout); }
    catch (e) { if (readOnly && i < 3 && /ECONNRESET|socket hang up|EPIPE/i.test(String(e.code || e.message))) { await new Promise(r => setTimeout(r, 1500)); continue; } throw e; }
  }
}
const OUT_RE = /Output="((?:[^"\\]|\\.)*)"/g;
export async function py(code, timeout = 300000) {
  const d = await request('/object/call', { path: '/Script/PythonScriptPlugin.Default__PythonScriptLibrary', function: 'ExecutePythonCommandEx', args: { PythonCommand: '# FWL18\n# -*- coding: utf-8 -*-\n' + code, ExecutionMode: 'ExecuteFile', FileExecutionScope: 'Private' } }, timeout);
  const lines = []; let m; OUT_RE.lastIndex = 0;
  while ((m = OUT_RE.exec(d.out_LogOutput ?? ''))) lines.push(m[1].replace(/\\(.)/g, (_, c) => c === 'n' ? '\n' : c === 't' ? '\t' : c));
  const line = lines.find(s => s.startsWith('FWL18:'));
  if (!line) throw Error('UE Python 没回结果：' + String(d.out_CommandResult).slice(-1500) + ' | ' + lines.slice(-5).join(' | ').slice(-1200));
  return JSON.parse(line.slice(6));
}
export const get = async (p, properties) => (await request('/object/get', { path: p, ...(properties ? { properties } : {}) })).properties;
export const cvar = async n => (await request('/object/call', { path: '/Script/ConsoleToolset.Default__ConsoleToolset', function: 'GetCVarValue', args: { Name: n } })).return_value;
// GPUECli /object/set 的文本格式（同 WB17）
export function txt(v) { if (v === null) return 'None'; if (typeof v === 'boolean') return v ? 'True' : 'False'; if (typeof v === 'number') return String(v); if (typeof v === 'string') return JSON.stringify(v); if (Array.isArray(v)) return '(' + v.map(txt).join(',') + ')'; if (v._type === 'object_ref') return v.class + "'" + v.path + "'"; return '(' + Object.entries(v).filter(([k]) => !k.startsWith('_')).map(([k, x]) => k + '=' + txt(x)).join(',') + ')'; }
