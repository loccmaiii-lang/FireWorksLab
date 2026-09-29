// 画质：烘焙的空间超采样、快门子样本、光点像素覆盖积分、亮核（移植自 Codex 的 Ultra 实验，origin/ultra 04fce8f）
// 默认值 = 3.7 原来的做法（2×2 超采样、300 Hz 快门、高斯中心取样），所以正式库、V5 尾缀等已认可的东西不变；
// 新条目按需把参数调到「精细」档（4×4、960 Hz、覆盖积分、亮核 25%）。参数跟着配方 / 导出 JSON 走。
const QUALITY_PRESETS = {
  legacy: { qSS: 2, qHz: 300, qMaxSub: 16, qKernel: 0, qCore: 0 },
  fine: { qSS: 4, qHz: 960, qMaxSub: 64, qKernel: 1, qCore: 0.25 }
};
function qualityOf(P) {
  return { ss: clamp(Math.round(+P.qSS || 2), 1, 8), hz: clamp(+P.qHz || 300, 120, 1920), maxSub: clamp(Math.round(+P.qMaxSub || 16), 1, 128),
    kernel: +P.qKernel > 0.5 ? 1 : 0, core: clamp(+P.qCore || 0, 0, 0.6) };
}
let particleQuality = qualityOf({});
function setParticleProfile(P) { particleQuality = qualityOf(P || {}); }
// 星头通道用完整亮核，火花通道用 35%（火花本来就细，窄核太多会变成一串亮点）
function setParticleUniforms(pr, chan) {
  if (pr.u.uKernel) gl.uniform1f(pr.u.uKernel, particleQuality.kernel);
  if (pr.u.uCore) gl.uniform1f(pr.u.uCore, chan && chan[0] > 0 ? particleQuality.core : particleQuality.core * 0.35);
}
