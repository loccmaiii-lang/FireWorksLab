// 资源规范统一（26）第 2 步的 GPUECli 客户端（写 UE）。用户 10-16 05:18「可以改」授权，限四项。
// 护栏：
//  - 路由白名单：/object/get、/object/set、/object/call；
//  - /object/set 只许写 targets.json 里的包（50 个粒子系统 + 67 个材质实例）里的对象；
//  - /object/call 只放行 LoadAsset、SaveAsset（AssetToSave 必须在 targets 里）、ExecutePythonCommandEx（代码由本目录脚本生成、人工审过）、
//    ExecuteConsoleCommand（只许 HighResShot / r.* 只读类截图命令）；
//  - 一次只发一个请求（GPUECli 同时只接一个），Node 一次写出（Python urllib 分两段发会 10053）。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const LIB = '/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
export const PYLIB = '/Script/PythonScriptPlugin.Default__PythonScriptLibrary';
export const KSL = '/Script/Engine.Default__KismetSystemLibrary';
const ALLOW = new Set(['/object/get', '/object/set', '/object/call']);
let TARGET_PKGS = null;
function targets() {
  if (!TARGET_PKGS) {
    const t = JSON.parse(fs.readFileSync(path.join(HERE, 'targets.json'), 'utf8'));
    TARGET_PKGS = new Set([...t.systems.map(s => s.system.split('.')[0]), ...t.materials.map(m => m.material.split('.')[0])]);
  }
  return TARGET_PKGS;
}
const pkgOf = p => String(p).split(/[.:]/)[0];
export const LOG = [];
let busy = false;
function once(route, payload, timeout) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(payload));
    const t0 = Date.now();
    const q = http.request('http://127.0.0.1:17780/gpcli' + route, { agent: false, method: 'POST', headers: { 'Content-Type': 'text/plain', 'Content-Length': body.length } }, r => {
      let text = ''; r.setEncoding('utf8'); r.on('data', c => text += c); r.on('end', () => {
        try {
          const value = JSON.parse(text);
          const ok = r.statusCode === 200 && value.success !== false;
          LOG.push({ t: new Date().toISOString(), route, path: payload.path, fn: payload.function, ms: Date.now() - t0, ok, bytes: text.length });
          if (!ok) throw Error(value.message || text.slice(0, 300));
          resolve(value.data ?? value);
        } catch (e) { reject(e); }
      });
    });
    q.on('error', e => { LOG.push({ t: new Date().toISOString(), route, path: payload.path, fn: payload.function, ms: Date.now() - t0, ok: false, error: String(e.message || e) }); reject(e); });
    q.setTimeout(timeout, () => q.destroy(Error('UE 请求超时 ' + route)));
    q.end(body);
  });
}
export async function request(route, payload, timeout = 60000) {
  if (!ALLOW.has(route)) throw Error('白名单外的路由：' + route);
  if (route === '/object/set' && !targets().has(pkgOf(payload.path))) throw Error('不在 targets 里的对象，不写：' + payload.path);
  if (route === '/object/call') {
    const fn = payload.function;
    if (fn === 'SaveAsset' && !targets().has(pkgOf(payload.args?.AssetToSave))) throw Error('不在 targets 里的包，不存：' + payload.args?.AssetToSave);
    if (fn === 'ExecuteConsoleCommand' && !/^(HighResShot |r\.)/.test(payload.args?.Command || '')) throw Error('白名单外的控制台命令：' + payload.args?.Command);
    if (!['LoadAsset', 'SaveAsset', 'ExecutePythonCommandEx', 'ExecuteConsoleCommand', 'DoesAssetExist'].includes(fn)) throw Error('白名单外的函数：' + fn);
  }
  if (busy) throw Error('上一个请求还没回来（GPUECli 同时只接一个）');
  busy = true;
  try {
    for (let i = 0; ; i++) {
      try { return await once(route, payload, timeout); }
      catch (e) {
        const transient = /ECONNRESET|ECONNABORTED|socket hang up|EPIPE/i.test(String(e.code || e.message));
        if (i < 1 && transient && route === '/object/get') { await new Promise(r => setTimeout(r, 800)); continue; }
        throw e;
      }
    }
  } finally { busy = false; }
}
export const get = async (p, properties) => (await request('/object/get', properties ? { path: p, properties } : { path: p })).properties;
export async function set(p, properties) {
  const r = await request('/object/set', { path: p, properties });
  if ((r.failed_properties || []).length) throw Error('写入失败 ' + p + ' ' + JSON.stringify(r.failed_properties));
  return r;
}
// 在 UE 里跑一段 Python；代码最后 print('FWL26:' + json.dumps(结果)) ，这里取回解析。
export async function py(code, timeout = 120000) {
  const r = await request('/object/call', { path: PYLIB, function: 'ExecutePythonCommandEx', args: { PythonCommand: code, ExecutionMode: 'ExecuteFile', FileExecutionScope: 'Private' } }, timeout);
  const d = r.data || r; const lines = []; const re = /Output="((?:[^"\\]|\\.)*)"/g; let m;
  while ((m = re.exec(d.out_LogOutput || ''))) lines.push(m[1].replace(/\\(.)/g, (a, c) => c === 'n' ? '\n' : c === 't' ? '\t' : c));
  const line = lines.find(l => l.startsWith('FWL26:'));
  if (!line) throw Error('Python 没有回结果：return=' + d.return_value + ' ' + String(d.out_CommandResult || '').slice(-1500) + ' | ' + lines.slice(-5).join(' | ').slice(-1500));
  return JSON.parse(line.slice(6));
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export function saveLog(name) { fs.writeFileSync(path.join(HERE, name), JSON.stringify(LOG, null, 0)); }
