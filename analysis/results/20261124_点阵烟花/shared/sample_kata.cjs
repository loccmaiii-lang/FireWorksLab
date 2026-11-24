// 离线使用烘焙器的同一套花型库与物理模拟。标准输出只写采样结果。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = path.resolve(__dirname, '../../../../tool/src/js');
const context = vm.createContext({ structuredClone });
for (const name of ['00_util', '10_types', '19_spark_late', '20_sim']) {
  const filename = path.join(source, name + '.js');
  vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
}
const { defaultsFor, shapePoints, shapeCache, Sim, H_STEP } =
  vm.runInContext('({ defaultsFor, shapePoints, shapeCache, Sim, H_STEP })', context);
const recipe = defaultsFor('kata').P;
const { targetUV, origin, fps, lastFrame } = JSON.parse(fs.readFileSync(0, 'utf8'));
const seconds = lastFrame / fps;
// 兔形的可见寿命由后半段控制。所有点需要飞完整个开花段，包括用来校准初速的试射。
const dotLifetime = { burn: Math.max(recipe.burn, seconds + H_STEP), burnJit: 0 };
const dots = { ...recipe, ...dotLifetime };

function fromPoints(points, params = dots) {
  // 心形和文字共用 dirsFor 的同一条 planar 分支。只在本进程给形状入口提供点表。
  const key = '离线点表';
  shapeCache.set(key + '|' + points.length, points);
  return new Sim({ ...params, pattern: 'text', text: key, stars: points.length });
}

function checkHeart(fps, lastFrame) {
  const original = new Sim(recipe);
  const fromTable = fromPoints(shapePoints('heart', recipe.stars), recipe);
  let maxError = 0;
  for (let frame = 0; frame <= lastFrame; frame++) {
    while (original.t < frame / fps - 1e-9) {
      original.step(H_STEP);
      fromTable.step(H_STEP);
    }
    for (let i = 0; i < original.all.length; i++) {
      const a = original.all[i], b = fromTable.all[i];
      for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz']) {
        maxError = Math.max(maxError, Math.abs(a[key] - b[key]));
      }
      maxError = Math.max(maxError, Math.abs(original.headI(a) - fromTable.headI(b)));
    }
  }
  if (maxError !== 0) throw Error('心形点表与原模板的逐星对照不一致');
  return { stars: original.all.length, frames: lastFrame + 1, max_error: maxError };
}

function at(sim, seconds) {
  while (sim.t < seconds - 1e-9) sim.step(H_STEP);
  return sim.all.map(s => [s.x, s.y]);
}

function fitLaunch(points, targets, seconds) {
  // 校准的是点火前的一张形状表。每颗星独立飞行，可以在同一次试射中求出全部点的偏差。
  const delta = 0.0001;
  for (let pass = 0; pass < 9; pass++) {
    const pos = at(fromPoints(points), seconds);
    const residual = targets.map(([x, y], i) => [x - pos[i][0], y - pos[i][1]]);
    if (Math.max(...residual.map(([x, y]) => Math.hypot(x, y))) < 1e-8) return points;
    const shiftedX = at(fromPoints(points.map(([x, y]) => [x + delta, y])), seconds);
    const shiftedY = at(fromPoints(points.map(([x, y]) => [x, y + delta])), seconds);
    points = points.map(([x, y], i) => {
      const a = (shiftedX[i][0] - pos[i][0]) / delta, b = (shiftedY[i][0] - pos[i][0]) / delta;
      const c = (shiftedX[i][1] - pos[i][1]) / delta, d = (shiftedY[i][1] - pos[i][1]) / delta;
      const [dx, dy] = residual[i], det = a * d - b * c;
      return [x + (d * dx - b * dy) / det, y + (a * dy - c * dx) / det];
    });
  }
  throw Error('兔形发射点表未达到定形精度');
}

const offsets = targetUV.map(([u, v]) => [u - origin[0], origin[1] - v]);
const extent = Math.max(...offsets.flat().map(Math.abs));
const outline = offsets.map(([x, y]) => [x / extent, y / extent]);
const spanY = points => Math.max(...points.map(p => p[1])) - Math.min(...points.map(p => p[1]));
// 以兔形初次试射的花径标定一个固定镜头，后续采样共用这一个比例。
const uvPerMetre = spanY(targetUV) / spanY(at(fromPoints(outline), seconds));
const targets = offsets.map(([x, y]) => [x / uvPerMetre, y / uvPerMetre]);
const launch = fitLaunch(outline, targets, seconds);
const sim = fromPoints(launch), heart = new Sim(recipe);
const frames = [], heights = [], heartHeights = [];
for (let i = 0; i <= lastFrame; i++) {
  const xy = at(sim, i / fps);
  frames.push(xy);
  heights.push(spanY(xy));
  heartHeights.push(spanY(at(heart, i / fps)));
}
const settings = Object.fromEntries(['type', 'pattern', 'stars', 'v0', 'vt', 'grav', 'dirJit',
  'speedJit', 'tilt', 'seed', 'burstR0', 'wind', 'burn', 'burnJit', 'sparkRate'].map(key => [key, recipe[key]]));
if (sim.all.some(s => !s.alive)) throw Error('有图案点在定形前终止了运动');
process.stdout.write(JSON.stringify({
  settings, dotLifetime, step: H_STEP, heart_check: checkHeart(fps, Math.round(recipe.duration * fps)),
  launch, uvPerMetre, frames, flash: sim.flashes[0],
  relative_height: [0, 0.1, 0.2, 0.6, 1, seconds].map(t => ({
    seconds: t, heart: heartHeights[Math.round(t * fps)] / heartHeights[lastFrame],
    rabbit: heights[Math.round(t * fps)] / heights[lastFrame]
  }))
}));
