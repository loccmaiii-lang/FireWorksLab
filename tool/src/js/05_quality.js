// 画质：烘焙的空间超采样、快门子样本、光晕（光点一律按像素覆盖积分画，41_particles40.js；3.7 的高斯核 / 亮核开关 4.3 去掉了）
function qualityOf(P) {
  return { haloFrac: clamp(P.haloFrac == null ? .22 : +P.haloFrac, 0, .85), haloR: clamp(+P.haloR || 3, 1, 8),
    ss: clamp(Math.round(+P.qSS || 2), 1, 8), hz: clamp(+P.qHz || 300, 120, 1920), maxSub: clamp(Math.round(+P.qMaxSub || 16), 1, 128) };
}
let particleQuality = qualityOf({});
function setParticleProfile(P) { particleQuality = qualityOf(P || {}); }
function setParticleUniforms(pr, chan) {
  if (pr.u.uHaloFrac) gl.uniform1f(pr.u.uHaloFrac, particleQuality.haloFrac);
  if (pr.u.uHaloR) gl.uniform1f(pr.u.uHaloR, particleQuality.haloR);
}
