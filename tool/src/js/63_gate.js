// =====================================================================
//  4.9.69 导出拦截 + 贴图 SHA256（用户 10-12 19:44「有一个导出和导入拦截，不符合规范就不要导入」；规范 spec/烟花特效资产规范.md v1 §2 / §3 / §6）
//  所有导出都经过 makeZip → 这里：① 每张 textures[k] 写 "sha256"（PNG 文件内容），导入拦截靠它跨会话去重；② 按规范查，任何一条不满足就抛错，不出包。
//  手机配置（cascade_mobile*.json）：
//    名字不带 _HD / _Mobile，档位 tier ∈ H / M、名字以 _<档位> 结尾；发射器 ≤ 3（_M）/ ≤ 6（_H，用户待定）；没有 GPU；每个发射器写 max_alive 且 ≤ 50；
//    同一时刻最多 1 张大序列（烟花中低配 1 张大序列帧、尾缀 1 层 overdraw）；引用的贴图名不带 _HD；所有贴图 ≤ 1024（用户 10-12 22:01「严格遵守，直接拦下」）。
//  所有配置：派生资源（j.derived）贴图名必须沿用原效果；和交付目录里已有资源撞名但内容不同、又不是同一个效果 → 拦。
//  手机配置一个发射器都没有（全部选「不出」）→ 去掉这份配置（交付服务不收空配置），不算违规。
// =====================================================================
const FWL_CFG_RE = /(^|\/)cascade(_mobile(_h)?|_low)?\.json$/;
const GATE_TIER = { M: { emitters: 3 }, H: { emitters: 6 } }, GATE_MAX_ALIVE = 50, GATE_MOBILE_TEX = 1024;
let packGateLast = null;
function pngSize(u8) {
  if (!u8 || u8.length < 24 || u8[0] !== 0x89 || u8[1] !== 0x50 || u8[2] !== 0x4E || u8[3] !== 0x47) return null;
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); return [dv.getUint32(16), dv.getUint32(20)];
}
async function sha256Hex(u8) { const h = await crypto.subtle.digest('SHA-256', u8); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
const gateBytes = async d => d instanceof Blob ? new Uint8Array(await d.arrayBuffer()) : d;
// 一份配置的问题（纯函数，给检查脚本直接调）。png：包内路径 → { sha256, size: [w, h] }；dir：配置所在目录前缀
function packGateConfig(f, j, dir, png) {
  const bad = [], mobile = /_mobile/.test(f) || j.platform === 'mobile', tag = f.replace(/^.*\//, '');
  const texs = Object.entries(j.textures || {}), ems = (j.emitters || []).filter(e => e.enabled !== false);
  const assetOf = t => t.asset || String(t.file || '').replace(/^.*\//, '').replace(/\.png$/i, '');
  if (j.derived && j.derived.from) {
    const stem = FW_TEX_PREFIX + j.derived.from, wrong = texs.filter(([, t]) => t && t.file && !assetOf(t).startsWith(stem)).map(([, t]) => assetOf(t));
    if (wrong.length) bad.push(`${tag}：派生资源开了新贴图名 ${wrong.join('、')}（应沿用 ${stem}_…，规范 §2）`);
  }
  // 4.9.89（导出排查 H1 / G1）：空壳发射器（出生率 0 又没有 Burst，引擎里什么都不出）不许导出——以前 PC「光点」对尾缀 / 星头不发光的层出这种东西，引擎回放里星头直接消失
  const shell = ems.filter(e => { if (!e.spawn) return false; const sp = e.spawn, rate = !sp.rate ? 0 : sp.rate.const != null ? +sp.rate.const : 1, n = (sp.bursts || []).reduce((a, q) => a + (+q[1] || 0), 0); return !(rate > 0) && !(n > 0); }).map(e => e.name);
  if (shell.length) bad.push(`${tag}：空壳发射器 ${shell.join('、')}（出生率 0 又没有 Burst，引擎里什么都不出；多半是这一层选了 GPU 光点、星头却不发光）`);
  if (!mobile) return bad;
  const nm = String(j.name || ''), tier = j.tier;
  if (/_HD(_|$)/i.test(nm) || /_Mobile(_|$)/i.test(nm)) bad.push(`${tag}：手机包名字「${nm}」带 _HD / _Mobile（规范 §2：<名>_H / _M）`);
  if (!GATE_TIER[tier]) bad.push(`${tag}：档位「${tier == null ? '没写' : tier}」不是 H / M（规范 §2，不做 _L）`);
  else if (!nm.endsWith('_' + tier)) bad.push(`${tag}：手机包名字「${nm}」不是以 _${tier} 结尾`);
  const lim = GATE_TIER[tier] || GATE_TIER.M;
  if (ems.length > lim.emitters) bad.push(`${tag}：发射器 ${ems.length} 个，超过 _${GATE_TIER[tier] ? tier : 'M'} 上限 ${lim.emitters}（规范 §6；交付清单产物表里把多余的层改成「不出」）`);
  const gpu = ems.filter(e => e.gpu).map(e => e.name); if (gpu.length) bad.push(`${tag}：有 GPU 发射器 ${gpu.join('、')}（手游不能有 GPU）`);
  const noAlive = ems.filter(e => e.max_alive == null).map(e => e.name), over = ems.filter(e => +e.max_alive > GATE_MAX_ALIVE).map(e => `${e.name} ${e.max_alive}`);
  if (noAlive.length) bad.push(`${tag}：发射器没写 max_alive：${noAlive.join('、')}`);
  if (over.length) bad.push(`${tag}：同时活着的粒子超过 ${GATE_MAX_ALIVE}：${over.join('、')}${ems.some(e => +e.max_alive > GATE_MAX_ALIVE && /Unit/.test(e.name)) ? '（手机单束每颗星一个粒子：这一层手机改序列 / 单帧 / 不出）' : ''}`);
  // 同一时刻的大序列（flipbook 贴图的发射器）不超过 1 张
  const flip = k => { const t = (j.textures || {})[k]; return t && t.class === 'flipbook'; }, mat = e => (j.materials || {})[e.material] || {};
  const seq = ems.filter(e => { const m = mat(e).textures || {}; return Object.values(m).some(flip); }).map(e => { const r = e.required || {}, d0 = +r.delay_s || 0; return [e.name, d0, d0 + (+r.duration_s || 0)]; });
  let most = 0, who = []; for (const [, a] of seq) { const live = seq.filter(([, b0, b1]) => b0 <= a + 1e-6 && b1 > a + 1e-6); if (live.length > most) { most = live.length; who = live.map(x => x[0]); } }
  // 4.9.80（导出排查 ①）：写清楚改哪一层（发射器名 L<n>_ 前缀 = 第 n 层）
  const lys = [...new Set(who.map(n => (/^L(\d+)_/.exec(n) || [])[1]).filter(Boolean))], tip = lys.length > 1 ? `：交付清单产物表把第 ${lys.slice(1).join('、')} 层的手机改成「自动」或「不出」` : who.length > 1 && /Tail$/.test(who[1]) ? '：手机不能星头、火花分开（要合成一张）' : '';
  if (most > 1) bad.push(`${tag}：同一时刻有 ${most} 张大序列（${who.join(' + ')}）；手游中低配只能 1 张（规范 §6）${tip}`);
  const hd = texs.filter(([, t]) => t && t.file && /_HD(_|$)/i.test(assetOf(t))).map(([, t]) => assetOf(t));
  if (hd.length) bad.push(`${tag}：手机材质引用了 _HD 贴图 ${hd.join('、')}（规范 §3）`);
  const big = texs.filter(([, t]) => t && t.file).map(([, t]) => [assetOf(t), (png[dir + t.file] || {}).size]).filter(([, s]) => s && Math.max(s[0], s[1]) > GATE_MOBILE_TEX).map(([a, s]) => `${a}（${s[0]}×${s[1]}）`);
  if (big.length) bad.push(`${tag}：手机贴图超过 ${GATE_MOBILE_TEX}：${big.join('、')}（手游严格不超 1024，用户 10-12 22:01：新出一张 1024，或复制 PC 那张到手游目录、最大尺寸设 1024）`);
  return bad;
}
// 撞名：交付目录里已有同名贴图、内容不同、来自别的效果（同一个效果重导 = 更新，照常）
function packGateClash(png, known, sourceKey, resourceName = '') {
  const bad = [];
  if (!known || !known.size) return bad;
  for (const [p, v] of Object.entries(png)) {
    const k = known.get(p.replace(/^.*\//, ''));
    // 保存为个人配方会改变编辑器ID；同一交付资源的归属保持稳定。
    const sameResource = resourceName && k?.resource && resourceName.toLowerCase() === k.resource.toLowerCase();
    const sameSource = k?.sourceKey && sourceKey && k.sourceKey === sourceKey;
    if (k && k.sha256 && k.sha256 !== v.sha256 && !sameSource && !sameResource) bad.push(`${p.replace(/^.*\//, '')}：和已有资源「${k.resource}」撞名但内容不同（归属不同或无法核验）`);
  }
  return bad;
}
async function packFinalize(files, o = {}) {
  const dec = new TextDecoder(), png = {};
  for (const [f, d] of files) if (/\.png$/i.test(f)) { const u = await gateBytes(d); png[f] = { sha256: await sha256Hex(u), size: pngSize(u) }; }
  const out = [], bad = [], resourceNames = new Set();
  for (const [f, d] of files) {
    if (!FWL_CFG_RE.test(f)) { out.push([f, d]); continue; }
    const j = JSON.parse(dec.decode(await gateBytes(d))), dir = f.includes('/') ? f.slice(0, f.lastIndexOf('/') + 1) : '';
    if (/_mobile/.test(f) && !(j.emitters || []).length) continue;     // 手机全部「不出」
    const resourceName = j.naming?.system || j.naming?.base || String(j.name || '').replace(/_(?:M|H)$/, '');
    if (resourceName) resourceNames.add(resourceName);
    for (const t of [...Object.values(j.textures || {}), ...Object.values(j.extras || {})]) if (t && t.file && png[dir + t.file]) t.sha256 = png[dir + t.file].sha256;
    bad.push(...packGateConfig(f, j, dir, png));
    out.push([f, utf8(JSON.stringify(j, null, 1))]);
  }
  let known = o.known, sk = o.sourceKey;
  try { if (known === undefined && typeof DeliveryWorkspace !== 'undefined' && DeliveryWorkspace.knownTextures) known = DeliveryWorkspace.knownTextures(); } catch (e) { known = null; }
  try { if (sk === undefined && typeof wbKey === 'function') sk = wbKey(); } catch (e) { sk = ''; }
  bad.push(...packGateClash(png, known, sk, o.resourceName || (resourceNames.size === 1 ? [...resourceNames][0] : '')));
  packGateLast = { at: Date.now(), bad };
  if (bad.length && !o.noThrow) { const e = new Error('导出拦截（不符合 spec/烟花特效资产规范.md v1，这次没有出包）：\n· ' + bad.join('\n· ')); e.gate = bad; throw e; }
  return out;
}
