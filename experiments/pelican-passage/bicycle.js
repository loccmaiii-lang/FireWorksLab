import * as THREE from 'three';

const TAU = Math.PI * 2;
const RADIUS = 0.62;
const RATIO = 40 / 16;
export const ROLL_PER_RAD = RADIUS * RATIO;

const frontX = 0.99;
const rearX = -1.04;
const bottom = [-0.1, 0.68, 0];
const zAxis = new THREE.Vector3(0, 0, 1);
const yAxis = new THREE.Vector3(0, 1, 0);
const vector = ([x, y, z]) => new THREE.Vector3(x, y, z);
const point = (a, b, t) => a.map((n, i) => THREE.MathUtils.lerp(n, b[i], t));

function finish(color, metalness = 0, roughness = 0.48) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

// 固定在同一个刚体上的部件按材质合并，细辐条、螺帽和车身装饰也能共用绘制调用。
function assembly() {
  const parts = new Map();
  function add(geometry, material) {
    if (!parts.has(material)) parts.set(material, { positions: [], normals: [], indices: [] });
    const { positions, normals, indices } = parts.get(material);
    const offset = positions.length / 3;
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    for (let i = 0; i < position.count; i++) {
      positions.push(position.getX(i), position.getY(i), position.getZ(i));
      normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
    }
    const index = geometry.index;
    const count = index ? index.count : position.count;
    for (let i = 0; i < count; i++) indices.push(offset + (index ? index.getX(i) : i));
    geometry.dispose();
  }
  return {
    add,
    rod(a, b, radius, material, endRadius = radius, segments = 12) {
      const direction = vector(b).sub(vector(a));
      const geometry = new THREE.CylinderGeometry(endRadius, radius, direction.length(), segments);
      geometry.applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(yAxis, direction.normalize()),
      );
      add(geometry.translate(...point(a, b, 0.5)), material);
    },
    ball(at, size, material) {
      add(new THREE.SphereGeometry(1, 18, 12).scale(...size).translate(...at), material);
    },
    tube(points, radius, material, segments = 30) {
      const curve = new THREE.CatmullRomCurve3(points.map(vector));
      add(new THREE.TubeGeometry(curve, segments, radius, 8, false), material);
    },
    ring(outerCenter, major, minor, material, count = 88) {
      add(new THREE.TorusGeometry(major, minor, 10, count).translate(...outerCenter), material);
    },
    build(name) {
      const group = new THREE.Group();
      group.name = name;
      for (const [material, data] of parts) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
        geometry.setIndex(data.indices);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }
      return group;
    },
  };
}

function wheel(paint) {
  const wheel = assembly();
  wheel.ring([0, 0, 0], 0.577, 0.043, paint.rubber);
  wheel.ring([0, 0, 0], 0.538, 0.017, paint.alloy);
  for (const side of [-1, 1]) {
    // 胎壁包住胎肩，最外圈保留深色胎面。车轮从斜后方看依然有真实厚度。
    const profile = [];
    for (let i = 0; i <= 12; i++) {
      const theta = THREE.MathUtils.lerp(0.93, 2.52, i / 12);
      profile.push(
        new THREE.Vector2(0.577 + 0.0435 * Math.cos(theta), side * 0.0435 * Math.sin(theta)),
      );
    }
    if (side === -1) profile.reverse();
    wheel.add(new THREE.LatheGeometry(profile, 96).rotateX(Math.PI / 2), paint.sidewall);
    wheel.ring([0, 0, side * 0.0355], 0.552, 0.0016, paint.ochre);
    wheel.ring([0, 0, side * 0.015], 0.535, 0.0038, paint.polish);
    wheel.rod([0, 0, side * 0.037], [0, 0, side * 0.048], 0.057, paint.alloy, 0.056, 24);
    for (let i = 0; i < 16; i++) {
      const rim = TAU * (i / 16 + (side === 1 ? 0 : 1 / 32));
      const hub = rim + (i % 2 ? 0.92 : -0.92);
      const a = [0.046 * Math.cos(hub), 0.046 * Math.sin(hub), side * 0.046];
      const b = [0.534 * Math.cos(rim), 0.534 * Math.sin(rim), side * 0.009];
      wheel.rod(a, b, 0.0037, paint.spoke, 0.0037, 5);
      wheel.rod(point(a, b, 0.947), b, 0.0061, paint.alloy, 0.0061, 6);
    }
  }
  wheel.rod([0, 0, -0.064], [0, 0, 0.064], 0.036, paint.polish, 0.036, 24);
  wheel.rod([0.17, 0.5, 0], [0.16, 0.466, 0], 0.007, paint.ochre, 0.007, 8);
  wheel.ball([0.16, 0.464, 0], [0.009, 0.008, 0.008], paint.rubber);
  return wheel.build('辐条轮');
}

function gear(part, at, radius, teeth, material) {
  const shape = new THREE.Shape();
  for (let tooth = 0; tooth < teeth; tooth++) {
    for (const [step, depth] of [
      [0, 0.98],
      [0.19, 1.045],
      [0.48, 1.045],
      [0.69, 0.98],
    ]) {
      const angle = (TAU * (tooth + step)) / teeth;
      const x = radius * depth * Math.cos(angle);
      const y = radius * depth * Math.sin(angle);
      if (tooth === 0 && step === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, radius * 0.78, 0, TAU, true);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.008,
    bevelEnabled: false,
    curveSegments: 32,
  });
  part.add(geometry.translate(...at), material);
  for (let i = 0; i < 5; i++) {
    const angle = (i * TAU) / 5;
    const end = [
      at[0] + Math.cos(angle) * radius * 0.86,
      at[1] + Math.sin(angle) * radius * 0.86,
      at[2] + 0.004,
    ];
    part.rod([at[0], at[1], at[2] + 0.004], end, radius * 0.13, material, radius * 0.071, 8);
  }
}

function saddle(part, paint) {
  const shape = new THREE.Shape();
  // 从车尾向车头收成窄鼻，边缘压出皮革座垫的滚边。
  shape.moveTo(-0.19, 0);
  shape.bezierCurveTo(-0.2, 0.17, -0.11, 0.194, 0.0, 0.124);
  shape.bezierCurveTo(0.11, 0.039, 0.242, 0.074, 0.244, 0.012);
  shape.bezierCurveTo(0.247, -0.067, 0.12, -0.032, 0, -0.122);
  shape.bezierCurveTo(-0.12, -0.198, -0.2, -0.161, -0.19, 0);
  const body = new THREE.ExtrudeGeometry(shape, {
    depth: 0.041,
    bevelEnabled: true,
    bevelSize: 0.015,
    bevelThickness: 0.016,
    bevelSegments: 3,
    curveSegments: 12,
  });
  part.add(
    body
      .rotateX(-Math.PI / 2)
      .rotateZ(-0.037)
      .translate(-0.42, 1.638, 0),
    paint.leather,
  );
  for (const side of [-1, 1]) {
    part.tube(
      [
        [-0.56, 1.64, side * 0.11],
        [-0.51, 1.582, side * 0.053],
        [-0.4, 1.563, side * 0.047],
        [-0.24, 1.634, side * 0.035],
      ],
      0.0115,
      paint.alloy,
    );
    part.ball([-0.532, 1.699, side * 0.126], [0.012, 0.005, 0.01], paint.ochre);
  }
}

function mudguard(frame, x, first, last, paint) {
  const positions = [];
  const indices = [];
  const slices = 52;
  const radius = RADIUS + 0.044;
  for (let i = 0; i <= slices; i++) {
    const angle = (THREE.MathUtils.lerp(first, last, i / slices) * Math.PI) / 180;
    for (let j = 0; j < 7; j++) {
      const cross = (j - 3) / 3;
      const r = radius - cross * cross * 0.025;
      positions.push(x + Math.cos(angle) * r, RADIUS + Math.sin(angle) * r, cross * 0.061);
      if (j < 6 && i < slices) {
        const v = i * 7 + j;
        indices.push(v, v + 7, v + 1, v + 1, v + 7, v + 8);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  frame.add(geo, paint.guard);
  const angle = ((x < 0 ? 152 : 40) * Math.PI) / 180;
  for (const side of [-1, 1]) {
    frame.rod(
      [x, RADIUS, side * 0.068],
      [
        x + Math.cos(angle) * (radius - 0.012),
        RADIUS + Math.sin(angle) * (radius - 0.012),
        side * 0.044,
      ],
      0.0065,
      paint.alloy,
      0.0065,
      8,
    );
  }
}

function createFrame(paint) {
  const frame = assembly();
  const seatJoint = [-0.35, 1.415, 0];
  const headTop = [0.627, 1.48, 0];
  const headBase = [0.714, 1.24, 0];
  const mainTube = (a, b, r) => {
    frame.rod(a, b, r, paint.enamel, r * 0.95, 22);
    for (const t of [0.07, 0.095, 0.905, 0.93]) {
      frame.rod(point(a, b, t), point(a, b, t + 0.009), r * 1.048, paint.ochre, r * 1.048, 20);
    }
  };
  mainTube(bottom, seatJoint, 0.041);
  mainTube(seatJoint, headTop, 0.035);
  mainTube(bottom, headBase, 0.048);
  frame.rod(headBase, headTop, 0.061, paint.enamel, 0.056, 24);
  frame.rod(
    point(headBase, headTop, 0.275),
    point(headBase, headTop, 0.77),
    0.06,
    paint.guard,
    0.058,
    24,
  );
  frame.ball([0.706, 1.355, 0.026], [0.018, 0.029, 0.012], paint.ochre);
  frame.rod(seatJoint, [-0.415, 1.585, 0], 0.027, paint.polish, 0.027, 16);
  frame.rod(point(bottom, seatJoint, 0.965), seatJoint, 0.05, paint.alloy, 0.05, 18);
  saddle(frame, paint);
  for (const side of [-1, 1]) {
    const rear = [rearX, RADIUS, side * 0.091];
    frame.rod(rear, [-0.11, 0.68, side * 0.068], 0.0225, paint.enamel, 0.029, 14);
    frame.rod(rear, [seatJoint[0], seatJoint[1], side * 0.025], 0.018, paint.enamel, 0.023, 14);
    frame.ball(rear, [0.043, 0.047, 0.014], paint.alloy);
    frame.rod(
      [rearX, RADIUS, side * 0.101],
      [rearX, RADIUS, side * 0.122],
      0.027,
      paint.polish,
      0.026,
      6,
    );
    const fork = [
      [0.716, 1.23, side * 0.037],
      [0.759, 1.137, side * 0.063],
      [0.849, 0.84, side * 0.072],
      [0.91, 0.695, side * 0.075],
      [frontX, RADIUS, side * 0.077],
    ];
    frame.tube(fork, 0.027, paint.enamel);
    frame.tube(fork.slice(0, 2), 0.03, paint.polish, 10);
    frame.ball([frontX, RADIUS, side * 0.079], [0.041, 0.041, 0.016], paint.alloy);
    frame.rod(
      [frontX, RADIUS, side * 0.09],
      [frontX, RADIUS, side * 0.105],
      0.024,
      paint.polish,
      0.025,
      6,
    );
  }
  frame.rod([-0.1, 0.68, -0.089], [-0.1, 0.68, 0.087], 0.068, paint.enamel, 0.068, 24);
  frame.rod([0.622, 1.487, 0], [0.601, 1.542, 0], 0.049, paint.polish, 0.05, 20);
  frame.tube(
    [
      [0.607, 1.523, 0],
      [0.57, 1.64, 0],
      [0.582, 1.699, 0],
      [0.693, 1.726, 0],
    ],
    0.028,
    paint.alloy,
  );
  for (const side of [-1, 1]) {
    frame.tube(
      [
        [0.68, 1.725, 0],
        [0.69, 1.728, side * 0.13],
        [0.747, 1.765, side * 0.217],
        [0.783, 1.837, side * 0.249],
      ],
      0.022,
      paint.polish,
    );
    const a = [0.831, 1.841, side * 0.248],
      b = [0.688, 1.834, side * 0.266];
    frame.rod(a, b, 0.033, paint.leather, 0.035, 16);
    for (let i = 1; i < 6; i++) {
      frame.rod(point(a, b, i / 6), point(a, b, i / 6 + 0.031), 0.035, paint.seam, 0.035, 14);
    }
    frame.tube(
      [
        [0.817, 1.821, side * 0.249],
        [0.861, 1.807, side * 0.255],
        [0.845, 1.779, side * 0.26],
        [0.752, 1.761, side * 0.273],
      ],
      0.009,
      paint.alloy,
      18,
    );
  }
  frame.tube(
    [
      [0.832, 1.8, 0.235],
      [0.911, 1.66, 0.185],
      [0.878, 1.512, 0.093],
      [0.763, 1.302, 0.04],
    ],
    0.006,
    paint.rubber,
  );
  frame.tube(
    [
      [0.822, 1.8, -0.235],
      [0.874, 1.63, -0.187],
      [0.701, 1.495, -0.078],
      [0.48, 1.455, -0.03],
      [-0.31, 1.395, -0.029],
      [-0.515, 1.281, -0.043],
    ],
    0.005,
    paint.rubber,
  );
  mudguard(frame, frontX, 39, 153, paint);
  mudguard(frame, rearX, 21, 178, paint);
  frame.rod([0.721, 1.285, 0], [0.882, 1.39, 0], 0.012, paint.alloy);
  frame.ball([0.896, 1.41, 0], [0.095, 0.06, 0.061], paint.polish);
  frame.ball([0.97, 1.416, 0], [0.022, 0.048, 0.05], paint.lens);
  return frame.build('搪瓷旅行车架');
}

function chain(paint) {
  const frontRadius = 0.164,
    rearRadius = frontRadius / RATIO;
  const front = [bottom[0], bottom[1]],
    rear = [rearX, RADIUS];
  const dx = front[0] - rear[0],
    dy = front[1] - rear[1];
  const centerDistance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const halfArc = Math.acos((rearRadius - frontRadius) / centerDistance);
  const high = angle + halfArc,
    low = angle - halfArc;
  const upper = [Math.cos(high), Math.sin(high)];
  const lower = [Math.cos(low), Math.sin(low)];
  const tangent = Math.sqrt(centerDistance ** 2 - (frontRadius - rearRadius) ** 2);
  const frontArc = frontRadius * halfArc * 2;
  const length = tangent * 2 + frontArc + rearRadius * (TAU - halfArc * 2);
  function onPath(distance, out) {
    let d = THREE.MathUtils.euclideanModulo(distance, length);
    if (d < tangent) {
      const t = d / tangent;
      out.set(
        rear[0] + rearRadius * upper[0] + t * (dx + (frontRadius - rearRadius) * upper[0]),
        rear[1] + rearRadius * upper[1] + t * (dy + (frontRadius - rearRadius) * upper[1]),
        0,
      );
    } else if ((d -= tangent) < frontArc) {
      const a = high - d / frontRadius;
      out.set(front[0] + frontRadius * Math.cos(a), front[1] + frontRadius * Math.sin(a), 0);
    } else if ((d -= frontArc) < tangent) {
      const t = d / tangent;
      out.set(
        front[0] + frontRadius * lower[0] - t * (dx + (frontRadius - rearRadius) * lower[0]),
        front[1] + frontRadius * lower[1] - t * (dy + (frontRadius - rearRadius) * lower[1]),
        0,
      );
    } else {
      const a = low - (d - tangent) / rearRadius;
      out.set(rear[0] + rearRadius * Math.cos(a), rear[1] + rearRadius * Math.sin(a), 0);
    }
    out.z = 0.134;
    return out;
  }
  const part = assembly();
  const positions = [],
    p = new THREE.Vector3();
  for (let i = 0; i <= 180; i++) positions.push(onPath((length * i) / 180, p).toArray());
  part.tube(positions, 0.0073, paint.chain, 180);
  const group = part.build('闭合链条');
  const total = Math.round(length / ((TAU * frontRadius) / 40));
  const geometry = new THREE.CylinderGeometry(0.0053, 0.0053, 0.018, 7).rotateX(Math.PI / 2);
  const pins = new THREE.InstancedMesh(geometry, paint.alloy, total);
  pins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(pins);
  const matrix = new THREE.Matrix4();
  return {
    group,
    update(phase) {
      for (let i = 0; i < total; i++) {
        onPath((i / total) * length + phase * frontRadius, p);
        pins.setMatrixAt(i, matrix.makeTranslation(p.x, p.y, p.z));
      }
      pins.instanceMatrix.needsUpdate = true;
    },
  };
}

export function createBicycle() {
  const paint = {
    enamel: finish(0xcb422e, 0.27, 0.28),
    rubber: finish(0x242b2d, 0.02, 0.85),
    sidewall: finish(0xe6c797, 0, 0.75),
    guard: finish(0xe6d3a8, 0.28, 0.37),
    leather: finish(0x86492f, 0.04, 0.48),
    seam: finish(0x633a2a, 0.08, 0.5),
    alloy: finish(0x899391, 0.48, 0.34),
    polish: finish(0xc8ccc6, 0.6, 0.26),
    spoke: finish(0xa5aeac, 0.36, 0.45),
    ochre: finish(0xdbad60, 0.48, 0.32),
    chain: finish(0x454641, 0.42, 0.45),
    lens: finish(0xffe6ad, 0.22, 0.2),
  };
  paint.guard.side = THREE.DoubleSide;
  const group = new THREE.Group();
  group.name = '海岸旅行自行车';
  const forkWheel = wheel(paint);
  const rearWheel = forkWheel.clone();
  forkWheel.position.set(frontX, RADIUS, 0);
  rearWheel.position.set(rearX, RADIUS, 0);
  const sprocket = assembly();
  gear(sprocket, [0, 0, 0.129], 0.164 / RATIO, 16, paint.chain);
  rearWheel.add(sprocket.build('后飞轮'));
  const rotor = assembly();
  gear(rotor, [0, 0, 0.129], 0.164, 40, paint.alloy);
  for (const side of [-1, 1]) {
    rotor.rod([0, 0, side * 0.083], [0, 0, side * 0.165], 0.033, paint.polish, 0.031);
    rotor.rod([0, 0, side * 0.16], [side * 0.24, 0, side * 0.177], 0.027, paint.polish, 0.02, 14);
    rotor.rod([side * 0.24, 0, side * 0.17], [side * 0.24, 0, side * 0.25], 0.014, paint.alloy);
    rotor.ball([0, 0, side * 0.168], [0.022, 0.022, 0.008], paint.ochre);
  }
  const crank = rotor.build('曲柄与牙盘');
  crank.position.set(...bottom);
  const platform = assembly();
  platform.add(new THREE.BoxGeometry(0.158, 0.048, 0.112), paint.rubber);
  for (const side of [-1, 1]) {
    platform.add(
      new THREE.BoxGeometry(0.172, 0.024, 0.018).translate(0, 0, side * 0.052),
      paint.polish,
    );
    platform.add(
      new THREE.BoxGeometry(0.015, 0.02, 0.081).translate(side * 0.081, 0, 0),
      paint.ochre,
    );
  }
  for (let i = -2; i <= 2; i++) {
    platform.add(
      new THREE.BoxGeometry(0.012, 0.026, 0.106).translate(i * 0.03, 0.032, 0),
      paint.rubber,
    );
  }
  const right = platform.build('右踏板');
  const left = right.clone();
  left.name = '左踏板';
  const drive = chain(paint);
  group.add(createFrame(paint), forkWheel, rearWheel, crank, right, left, drive.group);
  function update(phase) {
    crank.rotation.z = -phase;
    const rotation = -phase * RATIO;
    forkWheel.quaternion.setFromAxisAngle(zAxis, rotation);
    rearWheel.quaternion.copy(forkWheel.quaternion);
    const dx = 0.24 * Math.cos(phase),
      dy = -0.24 * Math.sin(phase);
    right.position.set(bottom[0] + dx, bottom[1] + dy, 0.235);
    left.position.set(bottom[0] - dx, bottom[1] - dy, -0.235);
    drive.update(phase);
  }
  update(0);
  return { group, update };
}
