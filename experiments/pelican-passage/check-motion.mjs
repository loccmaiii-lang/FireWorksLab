import assert from 'node:assert/strict';
import { Vector3, Raycaster } from 'three';
import { createBicycle, ROLL_PER_RAD } from './bicycle.js';
import { createPelican } from './pelican.js';

const bicycle = createBicycle();
const rider = createPelican();
const crank = bicycle.group.getObjectByName('曲柄与牙盘');
const wheels = bicycle.group.getObjectsByProperty('name', '辐条轮');
const torso = rider.group.getObjectByName('躯干、覆羽及初级飞羽');
const up = new Vector3(0, 1, 0),
  down = new Vector3(0, -1, 0);
const local = (object, x = 0, y = 0, z = 0) => object.localToWorld(new Vector3(x, y, z));
const legs = [1, -1].map((side) => {
  const find = (name) =>
    rider.group
      .getObjectsByProperty('name', name)
      .find((obj) => Math.sign(obj.position.z) === side);
  return {
    side,
    label: side === 1 ? '右' : '左',
    foot: find('蹼足'),
    upper: find('胫跗骨'),
    lower: find('跗跖骨'),
    pedal: bicycle.group.getObjectByName(side === 1 ? '右踏板' : '左踏板'),
  };
});
assert.equal(wheels.length, 2, '必须有两个独立轮组');
assert.ok(
  crank && torso && legs.every((l) => l.foot && l.upper && l.lower && l.pedal),
  '缺少参与骑行联动的模型部件',
);
assert.equal(ROLL_PER_RAD, (0.62 * 40) / 16, '路程换算应对应 40:16 齿比及 0.62 米轮胎半径');

// 对踏面五条防滑棱取样，从下往上找脚掌、从上往下找踏面，直接测模型表面间距。
function soleGap(foot, pedal) {
  const ray = new Raycaster();
  let closest = Infinity;
  for (const dx of [-0.06, -0.03, 0, 0.03, 0.06]) {
    for (const dz of [-0.04, -0.02, 0, 0.02, 0.04]) {
      ray.set(local(pedal, dx, 0.2, dz), down);
      const tread = ray.intersectObject(pedal)[0];
      ray.set(local(pedal, dx, -0.12, dz), up);
      const sole = ray.intersectObject(foot)[0];
      if (tread && sole) closest = Math.min(closest, sole.point.y - tread.point.y);
    }
  }
  return closest;
}

let torsoMin = Infinity,
  torsoMax = -Infinity;
for (let degree = 0; degree <= 360; degree++) {
  const phase = (degree * Math.PI) / 180;
  bicycle.update(phase);
  rider.update(phase);
  bicycle.group.updateMatrixWorld(true);
  rider.group.updateMatrixWorld(true);
  const near = (error, label, tolerance = 1e-6) =>
    assert.ok(
      Math.abs(error) <= tolerance,
      `${degree}° · ${label}，误差 ${error}，允许 ±${tolerance}`,
    );
  const height = local(torso).y;
  torsoMin = Math.min(torsoMin, height);
  torsoMax = Math.max(torsoMax, height);

  for (const leg of legs) {
    const { side, label, foot, pedal, upper, lower } = leg;
    const axis = local(crank, side * 0.24, 0, side * 0.235);
    near(axis.distanceTo(local(pedal)), label + '曲柄与踏板轴心脱离');
    const expected = new Vector3(
      -0.1 + side * 0.24 * Math.cos(phase),
      0.68 - side * 0.24 * Math.sin(phase),
      side * 0.235,
    );
    near(expected.distanceTo(axis), label + '曲柄行程或左右相位');
    near(local(foot).distanceTo(local(pedal, 0, 0.045, 0)), label + '脚掌偏离踏板');
    near(local(pedal, 0, 1).sub(local(pedal)).distanceTo(up), label + '踏板倾斜');
    near(local(foot, 0, 1).sub(local(foot)).distanceTo(up), label + '脚掌倾斜');
    const knee = local(upper),
      hock = local(lower),
      ankle = local(lower, 0, 1);
    near(local(upper, 0, 1).distanceTo(hock), label + '跗关节连接');
    near(ankle.distanceTo(local(foot, -0.071, 0.077)), label + '踝关节连接');
    near(knee.distanceTo(hock) - 0.581, label + '胫跗骨长度');
    near(hock.distanceTo(ankle) - 0.565, label + '跗跖骨长度');
    if (degree % 90 === 0) near(soleGap(foot, pedal), label + '实际足底与踏面间距', 0.001);
  }
  for (const wheel of wheels) {
    const angle = (phase * ROLL_PER_RAD) / 0.62;
    const direction = local(wheel, 1).sub(local(wheel));
    near(
      direction.distanceTo(new Vector3(Math.cos(angle), -Math.sin(angle), 0)),
      (wheel.position.x > 0 ? '前' : '后') + '轮周位移与曲柄传动比',
    );
  }
}
assert.ok(torsoMax - torsoMin > 0.005 && torsoMax - torsoMin < 0.09, '身体应随踩踏小幅起伏');
console.log('通过：完整 361 个相位的曲柄、双轮、脚踏、腿骨和身体联动，四个象限的实际足底接触。');
