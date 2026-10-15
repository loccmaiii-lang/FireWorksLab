// 只读 GPUECli 请求（写法照 analysis/scripts/workbench_engine_acceptance.mjs 的 request()）。
// 路由白名单只含读取：/object/get、/object/search（不做 World 枚举）、/datatable/rows、/datatable/search；
// /object/call 只放行 EditorAssetLibrary.LoadAsset / DoesAssetExist（只读加载）。没有写入 / 保存 / 导入 / P4 / 开关 UE。
// 10-16 04:3x 实测：Python urllib 把请求头和请求体分两次发，服务端会中止连接（WinError 10053）；Node 一次写出，12/12 成功。
import http from 'node:http';
const ALLOW = new Set(['/object/get', '/object/search', '/datatable/rows', '/datatable/search', '/object/call']);
const CALL_ALLOW = new Set(['LoadAsset', 'DoesAssetExist', 'FindPackageReferencersForAsset']); // 第三个是资产注册表查询（谁引用了这个包），只读
export const LOG = [];
function once(route, payload, timeout) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(payload));
    const t0 = Date.now();
    const q = http.request('http://127.0.0.1:17780/gpcli' + route, { agent: false, method: 'POST', headers: { 'Content-Type': 'text/plain', 'Content-Length': body.length } }, r => {
      let text = ''; r.setEncoding('utf8'); r.on('data', c => text += c); r.on('end', () => {
        try {
          const value = JSON.parse(text);
          const ok = r.statusCode === 200 && value.success !== false;
          LOG.push({ route, payload, ms: Date.now() - t0, ok, bytes: text.length });
          if (!ok) throw Error(value.message || text.slice(0, 300));
          resolve(value.data ?? value);
        } catch (e) { reject(e); }
      });
    });
    q.on('error', e => { LOG.push({ route, payload, ms: Date.now() - t0, ok: false, error: String(e.message || e) }); reject(e); });
    q.setTimeout(timeout, () => q.destroy(Error('UE读取超时')));
    q.end(body);
  });
}
export async function request(route, payload, timeout = 60000, retry = 1) {
  if (!ALLOW.has(route)) throw Error('只读白名单外的路由：' + route);
  if (route === '/object/call' && !CALL_ALLOW.has(payload.function)) throw Error('只读白名单外的函数：' + payload.function);
  if (route === '/object/search' && String(payload.class || '').toLowerCase() === 'world') throw Error('不做 World 枚举');
  for (let i = 0; ; i++) {
    try { return await once(route, payload, timeout); }
    catch (e) {
      const transient = /ECONNRESET|ECONNABORTED|socket hang up|EPIPE/i.test(String(e.code || e.message));
      if (i < retry && transient) { await new Promise(r => setTimeout(r, 800)); continue; }
      throw e;
    }
  }
}
