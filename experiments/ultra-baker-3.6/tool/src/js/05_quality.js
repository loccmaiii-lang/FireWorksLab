// Experimental quality controls. Source parameters travel with exported recipes.
const LAB = { previewScale: 2, previewCap: 4096, bloom: 0.06, raw: false, loupe: false, cancel: false, job: false, pointer: [0.5, 0.5] };
let GPU_WORK = 0;
const QUALITY_PRESETS = {
  legacy: { qSS: 2, qHz: 300, qMaxSub: 16, qKernel: 0, qCore: 0 },
  fine: { qSS: 4, qHz: 960, qMaxSub: 64, qKernel: 1, qCore: 0.25 },
  ultra: { qSS: 8, qHz: 1920, qMaxSub: 128, qKernel: 1, qCore: 0.25 }
};
function qualityOf(P) {
  return { ss: [2, 4, 8].includes(+P.qSS) ? +P.qSS : 4, hz: clamp(+P.qHz || 960, 300, 1920), maxSub: clamp(+P.qMaxSub || 64, 16, 128), kernel: P.qKernel === 0 ? 0 : 1, core: clamp(P.qCore == null ? 0.25 : +P.qCore, 0, 0.6) };
}
let particleQuality = qualityOf({});
function setParticleProfile(P) { particleQuality = qualityOf(P); }
function setParticleUniforms(pr, chan) {
  gl.uniform1f(pr.u.uKernel, particleQuality.kernel);
  gl.uniform1f(pr.u.uCore, chan[0] > 0 ? particleQuality.core : particleQuality.core * 0.35);
}
function qualityBudget(P, scale = 1) {
  const q = qualityOf(P), W = Math.round(P.texW * scale), H = Math.round(P.texH * scale), cw = W / P.cols, ch = H / P.rows;
  const bytes = W * H * (16 + (P.outMode === 'split' ? 8 : 4)) + cw * ch * q.ss * q.ss * 8;
  return { width: W, height: H, cell: [cw, ch], frames: P.cols * P.rows * P.chans, ss: q.ss, renderCell: [cw * q.ss, ch * q.ss], workingMiB: bytes / 1048576 };
}
function validateQuality(P, scale) {
  const b = qualityBudget(P, scale), max = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
  if ([b.width, b.height, ...b.renderCell].some(n => n > max)) throw new Error(`此设置超过显卡单张尺寸 ${max}。请降低超采样或母版尺寸。`);
  if (b.workingMiB > 1536) throw new Error(`烘焙临时缓冲约 ${Math.round(b.workingMiB)} MiB，超过本测试版 1536 MiB 预算。请降低超采样或母版尺寸。`);
  if (b.cell.some(n => !Number.isInteger(n))) throw new Error('贴图尺寸必须能整除列数与行数。');
  return b;
}
