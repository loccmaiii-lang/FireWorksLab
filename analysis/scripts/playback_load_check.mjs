// Offline diagnostics: real simulation/sampling and real playback/ref clock.
// No browser, no GPU, no recipe writes. --check exits nonzero on regressions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = n => fs.readFileSync(path.join(root, 'tool/src/js', n + '.js'), 'utf8');
const load = (ctx, n) => vm.runInContext(source(n), ctx, { filename: n });
const run = (ctx, code) => vm.runInContext(code, ctx);
const data = (ctx, code) => JSON.parse(run(ctx, 'JSON.stringify(' + code + ')'));

const recipe = JSON.parse(fs.readFileSync(path.join(root, 'analysis/迭代/条目.json'), 'utf8'));
const layer = recipe.entries.find(e => e.id === 'HK10-1');
assert.ok(layer, 'HK10-1 must exist');
// Existing delivered package: sampling cadence is not browser rendering FPS.
const artifactPath = 'analysis/results/HK10E2/Hongchao40_cascade.json';
const artifact = JSON.parse(fs.readFileSync(path.join(root, artifactPath), 'utf8'));
const exportCadence = artifact.emitters.map(e => {
  const D = e.required.duration_s, delay = e.required.delay_s || 0;
  const keys = e.modules.find(m => m.m === 'DynamicParameter').params.frame.curve;
  return { emitter: e.name, segments: keys.slice(1).map((b, i) => {
    const a = keys[i];
    return { start: +(delay + a[0] * D).toFixed(3), end: +(delay + b[0] * D).toFixed(3),
      imagesPerSecond: +((b[1] - a[1]) / ((b[0] - a[0]) * D)).toFixed(2),
      holdsLastImage: Math.floor(a[1]) === Math.floor(b[1]) };
  }) };
});
if (process.argv.includes('--cadence-only')) {
  console.log(JSON.stringify({ artifactPath, source: artifact.source.tool, exportCadence,
    limits: 'Curve cadence only; this does not measure actual browser FPS.' }, null, 2));
  process.exit(0);
}
const counts = { steps: 0, sims: 0, draws: 0 };
const ctx = vm.createContext({ console, window: {}, REFS: {}, performance, structuredClone, TextEncoder,
  setTimeout, PPMY: 0, counts, bufH: new Float32Array(4 * 30000), bufT: new Float32Array(4 * 450000),
  buildTrack: () => ({ total: 0 }), disposeTrack: () => {},
  drawPoints: () => {}, drawSparksGPU: () => { counts.draws++; } });
for (const n of ['00_util', '05_quality', '10_types', '20_sim', '30_plan', '31_plan40', '48_render40', '50_bake']) load(ctx, n);
ctx.input = layer;
run(ctx, `const P = {...defaultsFor(input.base, 40).P, ...input.p, type: input.base};
  const measured = measure(P), playbackPlan = plan(P, measured);
  const OriginalSim = Sim;
  Sim = class extends OriginalSim {
    constructor(p) { super(p); counts.sims++; }
    step(h) { counts.steps++; return super.step(h); }
  };`);
const samples = [];
for (const time of [1, 4, 8]) {
  ctx.startTime = time;
  run(ctx, `globalThis.testRenderer = makeRenderer(P, 'burst');
    drawFrameSamples40(P, playbackPlan, testRenderer, startTime, [0, 0, 600, 600], 1);`);
  counts.steps = counts.sims = counts.draws = 0;
  run(ctx, `for (let i = 1; i <= 3; i++)
    drawFrameSamples40(P, playbackPlan, testRenderer, startTime + i / 60, [0, 0, 600, 600], 1);`);
  const window = data(ctx, 'shutterWindow(P, playbackPlan, startTime)');
  samples.push({ time, frames: 3, shutterMs: +(1000 * (window[1] - window[0])).toFixed(2), ...counts });
  run(ctx, 'testRenderer.dispose();');
}

// Replace rendering/DOM with counters. Run the production loop and refSync;
// the media mock advances at real time and completes seek immediately.
function clockTrace(mode, fps, reference) {
  let current = 4.433, seeks = 0, backwards = 0, renders = 0;
  const video = { duration: 30, readyState: 4, paused: false, seeking: false, playbackRate: 1,
    get currentTime() { return current; },
    set currentTime(t) { seeks++; if (t < current) backwards++; current = t; },
    play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; } };
  const elements = new Map();
  const $ = selector => {
    if (selector === '#refVid') return video;
    if (!elements.has(selector)) elements.set(selector, {
      hidden: selector === '#refBox' && !reference, dataset: {}, style: {},
      classList: { toggle() {} }, value: '', textContent: '' });
    return elements.get(selector);
  };
  const c = vm.createContext({ console, $, performance: { now: () => 0 }, window: {},
    store: { get: (_key, fallback) => fallback }, setInterval: () => 0, requestAnimationFrame: () => 0,
    pendingThumb: null,
    state: { tab: 'combo', view: mode, P: { type: 'kamuro' }, t: 0, playing: true, loopPlay: false,
      speed: 1, expo: 1, disp: 'game', layers: [], lib: [], layerView: { solo: -1, mute: [] } },
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    familyOf: () => 'aerial', renderVersion: () => 40, isPhys: () => false,
    ensureTargets: () => {}, stageTick: () => {}, perfTick: () => {} });
  load(c, '79_library'); load(c, '80_render');
  c.countRender = () => { renders++; };
  run(c, `ref2.entry = {vmeta: {t0: 4.433}};
    curDuration = () => 12; ensureTargets = () => {};
    renderCombo = countRender; updateLabels = () => {};`);
  for (let i = 1; i <= fps * 4; i++) {
    current += 1 / fps * video.playbackRate;
    c.frameNow = i * 1000 / fps;
    run(c, 'loop(frameNow);');
  }
  return { mode, fps, reference, wallSeconds: 4, timelineSeconds: c.state.t, seeks, backwards, renders };
}
const clocks = ['live', 'export'].flatMap(mode => [
  clockTrace(mode, 60, true), clockTrace(mode, 10, true), clockTrace(mode, 10, false) ]);
const findings = [];
// Counting CPU steps avoids claiming these are GPU frame-time measurements.
const late = samples.find(s => s.time === 8);
findings.push({ name: 'forward overlapping shutters avoid replaying the full 8-second simulation',
  pass: late.steps <= 480, observedSteps: late.steps, upperBound: 480 });
for (const clock of clocks.filter(c => c.reference && c.fps === 10)) findings.push({
  name: clock.mode + ': playback clock keeps real time at 10 fps',
  pass: Math.abs(clock.timelineSeconds - clock.wallSeconds) < 1 / 30,
  timelineSeconds: clock.timelineSeconds, wallSeconds: clock.wallSeconds, backwardsSeeks: clock.backwards });
const regressionPass = findings.every(f => f.pass);
const report = { recipe: layer.id, bakerVersion: data(ctx, 'VERSION'), regressionPass, samples, clocks,
  findings, artifactPath, exportCadence,
  limits: 'CPU scheduling and controller mock only; no real browser FPS, video decoder cost, GPU timing or pixels measured.' };
const outIndex = process.argv.indexOf('--out');
if (outIndex >= 0) fs.writeFileSync(path.resolve(process.argv[outIndex + 1]), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes('--check') && !regressionPass) process.exitCode = 1;
