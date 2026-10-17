// T19 补测：GPUECli 只读 + 运行 Python（只建 WB19_ 临时 Actor / Transient RT，不提供保存/删除资产接口）。
import http from 'node:http';
export function request(route, payload, timeout = 60000) {
  if (!['/object/get', '/object/call'].includes(route)) throw Error('route not allowed');
  if (route === '/object/call') {
    const okPy = payload.path === '/Script/PythonScriptPlugin.Default__PythonScriptLibrary' && payload.function === 'ExecutePythonCommandEx';
    if (!okPy) throw Error('call not allowed');
    if (/save_|SaveAsset|save_package|checkout|delete_asset|import_asset|set_editor_property\('default_config/i.test(payload.args?.PythonCommand ?? '')) throw Error('forbidden op in python');
  }
  const b = Buffer.from(JSON.stringify(payload));
  return new Promise((resolve, reject) => {
    const q = http.request('http://127.0.0.1:17780/gpcli' + route, { agent: false, method: 'POST', headers: { 'Content-Type': 'text/plain', 'Content-Length': b.length } }, r => {
      let s = ''; r.setEncoding('utf8'); r.on('data', c => s += c);
      r.on('end', () => { try { const v = JSON.parse(s); if (r.statusCode !== 200 || v.success === false) throw Error(v.message || s.slice(0, 500)); resolve(v.data ?? v); } catch (e) { reject(e); } });
    });
    q.on('error', reject);
    q.setTimeout(timeout, () => q.destroy(Error('UE timeout; check state, no auto retry')));
    q.end(b);
  });
}
const OUT_RE = new RegExp('Output="((?:[^"\\\\]|\\\\.)*)"', 'g');
export async function py(code, timeout) {
  const d = await request('/object/call', { path: '/Script/PythonScriptPlugin.Default__PythonScriptLibrary', function: 'ExecutePythonCommandEx', args: { PythonCommand: '# -*- coding: utf-8 -*-\n' + code, ExecutionMode: 'ExecuteFile', FileExecutionScope: 'Private' } }, timeout);
  const lines = []; let m; OUT_RE.lastIndex = 0;
  while ((m = OUT_RE.exec(d.out_LogOutput ?? ''))) lines.push(m[1].replace(/\\(.)/g, (_, c) => c === 'n' ? '\n' : c === 't' ? '\t' : c));
  const line = lines.find(s => s.startsWith('WB:'));
  if (d.return_value !== 'True' || !line) throw Error('UE py failed: ' + d.out_CommandResult + ' ' + lines.slice(-4).join(' | '));
  return JSON.parse(line.slice(3));
}
