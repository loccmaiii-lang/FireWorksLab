import * as THREE from 'three';

const ivory = 0xfff4d9;
const silver = 0xd3d6c9;
const charcoal = 0x283739;
const vermilion = 0xc34429;
const gold = 0xd88831;
const white = new THREE.Color(1, 1, 1);
const axisY = new THREE.Vector3(0, 1, 0);
const plumage = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.78,
  metalness: 0,
});

// 将同一块骨骼上的羽片和细节一次提交给 GPU。
class Sculpture {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.colors = [];
    this.indices = [];
  }

  add(geometry, tint, colorAt) {
    const { position, normal } = geometry.attributes;
    const color = new THREE.Color(tint);
    const offset = this.positions.length / 3;
    for (let i = 0; i < position.count; i++) {
      this.positions.push(position.getX(i), position.getY(i), position.getZ(i));
      this.normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
      const c = colorAt ? colorAt(i, color) : color;
      this.colors.push(c.r, c.g, c.b);
    }
    if (geometry.index) {
      for (const i of geometry.index.array) this.indices.push(i + offset);
    } else {
      for (let i = 0; i < position.count; i++) this.indices.push(i + offset);
    }
    geometry.dispose();
  }

  oval(tint, center, scale, pitch = 0, resolution = 20) {
    const geom = new THREE.SphereGeometry(1, resolution, Math.max(8, resolution >> 1));
    geom
      .scale(...scale)
      .rotateZ(pitch)
      .translate(...center);
    this.add(geom, tint);
  }

  // 用椭圆截面沿样条放样，翼尖、下颌等非对称形状也有真实侧面。
  sweep(tint, stations, steps = 18, sides = 16, shade) {
    const path = new THREE.CatmullRomCurve3(
      stations.map((p) => new THREE.Vector3(...p.slice(0, 3))),
    );
    const radii = new THREE.CatmullRomCurve3(
      stations.map((p, i) => new THREE.Vector3(i, p[3], p[4])),
      false,
      'catmullrom',
      0.33,
    );
    const pos = [],
      idx = [],
      samples = [];
    const point = new THREE.Vector3(),
      tangent = new THREE.Vector3(),
      side = new THREE.Vector3();
    const upright = new THREE.Vector3(),
      cross = new THREE.Vector3(),
      radius = new THREE.Vector3();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      path.getPoint(t, point);
      path.getTangent(t, tangent);
      upright.set(-tangent.y, tangent.x, 0).normalize();
      side.crossVectors(tangent, upright).normalize();
      radii.getPoint(t, radius);
      for (let j = 0; j < sides; j++) {
        const angle = (Math.PI * 2 * j) / sides;
        cross
          .copy(point)
          .addScaledVector(upright, Math.max(0.00015, radius.y) * Math.cos(angle))
          .addScaledVector(side, Math.max(0.00015, radius.z) * Math.sin(angle));
        pos.push(cross.x, cross.y, cross.z);
        if (shade) samples.push(shade(t, Math.cos(angle), Math.sin(angle)));
        if (i < steps) {
          const a = i * sides + j,
            b = i * sides + ((j + 1) % sides);
          idx.push(a, b, a + sides, b, b + sides, a + sides);
        }
      }
    }
    for (let j = 1; j < sides - 1; j++) {
      idx.push(0, j + 1, j, steps * sides, steps * sides + j, steps * sides + j + 1);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geom.setIndex(idx);
    geom.computeVertexNormals();
    const color = new THREE.Color();
    this.add(geom, tint, shade ? (i, base) => color.copy(base).multiplyScalar(samples[i]) : null);
  }

  mesh(parent, name, shadow = true) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geom.setIndex(this.indices);
    geom.computeBoundingSphere();
    const mesh = new THREE.Mesh(geom, plumage);
    mesh.name = name;
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // 覆羽以真实曲面为底，沿羽轴隆起；羽缘浅埋入底面，随光线留下搭接阴影。
  featherRelief(feathers, sides = [-1, 1]) {
    const support = this.mesh(new THREE.Group(), '');
    const ray = new THREE.Raycaster();
    const cast = new THREE.Vector3(),
      normal = new THREE.Vector3();
    const hits = [];
    for (const side of sides) {
      ray.ray.direction.set(0, 0, -side);
      for (const [x0, y0, x1, y1, x2, y2, width, tint] of feathers) {
        const curve = new THREE.QuadraticBezierCurve(
          new THREE.Vector2(x0, y0),
          new THREE.Vector2(x1, y1),
          new THREE.Vector2(x2, y2),
        );
        const pos = [],
          idx = [];
        const across = 6,
          along = 13;
        for (let i = 0; i <= along; i++) {
          const t = i / along;
          const center = curve.getPoint(t),
            tangent = curve.getTangent(t);
          const arc = Math.sin(Math.PI * t);
          const halfWidth = width * (0.025 + Math.pow(arc, 0.68)) * (0.78 + 0.34 * t);
          for (let j = 0; j <= across; j++) {
            const u = (2 * j) / across - 1;
            cast.set(
              center.x - tangent.y * halfWidth * u,
              center.y + tangent.x * halfWidth * u,
              1.5 * side,
            );
            ray.ray.origin.copy(cast);
            hits.length = 0;
            ray.intersectObject(support, false, hits);
            if (hits.length) {
              // 中轴高、两侧薄，根部与羽尖平滑消失在底羽中。
              const relief = width * 0.44 * arc * (1 - u * u) - 0.002;
              normal.copy(hits[0].point).addScaledVector(hits[0].normal, relief);
              pos.push(normal.x, normal.y, normal.z);
            } else {
              pos.push(cast.x, cast.y, 0);
            }
            if (i < along && j < across) {
              const a = i * (across + 1) + j,
                b = a + across + 1;
              if (side === 1) idx.push(a, b, a + 1, a + 1, b, b + 1);
              else idx.push(a, a + 1, b, a + 1, b + 1, b);
            }
          }
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geom.setIndex(idx);
        geom.computeVertexNormals();
        this.add(geom, tint);
      }
    }
    support.geometry.dispose();
  }
}

function bodySculpture() {
  const body = new Sculpture();
  // 尾部飞羽从扁长的尖端过渡到宽厚的背部，胸部则饱满向前。
  for (let i = -2; i <= 2; i++) {
    const spread = i * 0.084;
    body.sweep(
      Math.abs(i) === 2 ? 0x435051 : charcoal,
      [
        [-1.49 + Math.abs(i) * 0.07, 2.22 - Math.abs(i) * 0.024, spread * 1.45, 0.003, 0.003],
        [-1.33, 2.19, spread * 1.2, 0.053, 0.074],
        [-0.98, 2.16, spread, 0.075, 0.086],
        [-0.7, 2.13, spread * 0.8, 0.023, 0.035],
      ],
      13,
      12,
    );
  }
  body.sweep(
    ivory,
    [
      [-1.28, 2.23, 0, 0.015, 0.02],
      [-1.12, 2.2, 0, 0.15, 0.16],
      [-0.81, 2.13, 0, 0.34, 0.29],
      [-0.42, 2.09, 0, 0.458, 0.365],
      [-0.07, 2.17, 0, 0.429, 0.33],
      [0.16, 2.28, 0, 0.255, 0.23],
      [0.22, 2.33, 0, 0.025, 0.025],
    ],
    32,
    32,
    (_, up) => 0.93 + 0.07 * up,
  );
  // 交叠的初级飞羽形成深色后缘，覆羽覆盖根部。
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const y = i * 0.065;
      body.sweep(
        [0x314244, 0x425252, 0x586664, 0x788681][i],
        [
          [-1.46 + i * 0.065, 2.16 + y * 0.33, side * (0.16 + i * 0.015), 0.002, 0.003],
          [-1.21 + i * 0.04, 2.12 + y * 0.62, side * (0.236 + i * 0.011), 0.059, 0.032],
          [-0.82, 2.12 + y, side * (0.295 + i * 0.004), 0.087, 0.039],
          [-0.54, 2.19 + y, side * 0.278, 0.035, 0.025],
        ],
        16,
        12,
      );
    }
    for (let i = 0; i < 4; i++) {
      const y = i * 0.055;
      body.sweep(
        [0xbcc6bd, 0xcdd2c6, 0xe1e1d1, 0xf0ead7][i],
        [
          [-1.12 + i * 0.072, 2.105 + y, side * (0.267 + i * 0.006), 0.005, 0.006],
          [-0.9 + i * 0.06, 2.14 + y, side * 0.315, 0.062, 0.041],
          [-0.67 + i * 0.05, 2.19 + y, side * 0.329, 0.098, 0.044],
          [-0.4, 2.26 + y * 0.5, side * 0.282, 0.048, 0.032],
        ],
        14,
        12,
      );
    }
  }
  body.featherRelief([
    [-0.77, 2.405, -0.86, 2.365, -0.99, 2.27, 0.041, 0xe3e1cd],
    [-0.64, 2.427, -0.76, 2.38, -0.91, 2.28, 0.047, 0xede6d1],
    [-0.68, 1.92, -0.75, 1.93, -0.86, 2.0, 0.035, 0xe3d9c3],
    [-0.58, 1.87, -0.66, 1.89, -0.77, 1.96, 0.036, 0xece0ca],
  ]);
  return body;
}

function neckAndHead() {
  const head = new Sculpture();
  head.sweep(
    ivory,
    [
      [-0.18, 2.15, 0, 0.23, 0.23],
      [0.018, 2.33, 0, 0.27, 0.249],
      [0.12, 2.55, 0, 0.23, 0.196],
      [0.126, 2.76, 0, 0.173, 0.158],
      [0.21, 2.94, 0, 0.166, 0.145],
      [0.344, 3.095, 0, 0.17, 0.16],
      [0.4, 3.16, 0, 0.13, 0.14],
    ],
    37,
    28,
    (_, up) => 0.955 + 0.045 * up,
  );
  // 后颈的细长冠羽与眉弓保留水鸟的轮廓。
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const z = side * (0.052 + i * 0.043);
      head.sweep(
        [0xd4d3bc, 0xe4dfc7, ivory][i],
        [
          [-0.065 + i * 0.024, 2.91 - i * 0.033, z, 0.003, 0.003],
          [0.068, 3.035, z * 1.03, 0.034, 0.029],
          [0.21, 3.175, z, 0.069, 0.055],
          [0.39, 3.229, z * 0.7, 0.04, 0.035],
        ],
        12,
        12,
      );
    }
  }
  head.oval(ivory, [0.378, 3.13, 0], [0.293, 0.24, 0.203], 0.075, 32);
  // 喉囊最低处靠近根部，喙尖则窄、薄且下钩。
  head.sweep(
    0xf3a537,
    [
      [0.376, 3.035, 0, 0.025, 0.06],
      [0.51, 2.981, 0, 0.135, 0.176],
      [0.715, 2.929, 0, 0.187, 0.171],
      [0.913, 2.927, 0, 0.157, 0.139],
      [1.173, 2.941, 0, 0.098, 0.102],
      [1.407, 2.96, 0, 0.048, 0.053],
      [1.535, 2.962, 0, 0.006, 0.011],
    ],
    34,
    28,
    (t, up) => 0.84 + 0.12 * up + 0.065 * t,
  );
  head.sweep(
    0xd37229,
    [
      [0.485, 3.1, 0, 0.036, 0.144],
      [0.63, 3.112, 0, 0.025, 0.185],
      [0.845, 3.086, 0, 0.02, 0.166],
      [1.19, 3.027, 0, 0.016, 0.102],
      [1.46, 2.982, 0, 0.014, 0.053],
      [1.544, 2.967, 0, 0.006, 0.008],
    ],
    28,
    18,
  );
  head.sweep(
    0xffc35b,
    [
      [0.473, 3.141, 0, 0.058, 0.141],
      [0.62, 3.16, 0, 0.064, 0.182],
      [0.842, 3.128, 0, 0.053, 0.158],
      [1.17, 3.067, 0, 0.042, 0.107],
      [1.41, 3.02, 0, 0.032, 0.063],
      [1.521, 2.986, 0, 0.026, 0.033],
      [1.554, 2.95, 0, 0.01, 0.014],
      [1.545, 2.936, 0, 0.001, 0.002],
    ],
    35,
    24,
    (_, up) => 0.945 + 0.055 * up,
  );
  for (const side of [-1, 1]) {
    head.oval(0xeac379, [0.512, 3.17, side * 0.159], [0.112, 0.081, 0.039], -0.12);
    head.oval(0xa66d3e, [0.474, 3.18, side * 0.188], [0.046, 0.048, 0.017]);
    head.oval(0x232e2b, [0.48, 3.184, side * 0.2], [0.033, 0.036, 0.015]);
    head.oval(white, [0.494, 3.196, side * 0.211], [0.009, 0.01, 0.006], 0, 10);
    head.sweep(
      0xf8eaca,
      [
        [0.359, 3.213, side * 0.187, 0.004, 0.006],
        [0.436, 3.238, side * 0.186, 0.019, 0.013],
        [0.526, 3.233, side * 0.164, 0.016, 0.014],
        [0.57, 3.222, side * 0.149, 0.002, 0.004],
      ],
      12,
      10,
    );
    head.oval(0xb57b45, [0.671, 3.181, side * 0.152], [0.026, 0.006, 0.008], -0.21, 12);
  }
  head.featherRelief([
    [0.33, 3.2, 0.21, 3.16, 0.133, 3.067, 0.023, 0xe3dcc6],
    [0.324, 3.144, 0.229, 3.105, 0.161, 3.013, 0.025, 0xe9e0c7],
    [0.3, 3.092, 0.224, 3.042, 0.178, 2.963, 0.023, 0xf0e5cd],
  ]);
  // 复古短帽檐和一条米色缎带，帽身色与翼尖相呼应。
  head.oval(0x284b49, [0.349, 3.346, 0], [0.238, 0.117, 0.201], -0.075, 28);
  head.oval(0x28504d, [0.526, 3.345, 0], [0.185, 0.028, 0.167], -0.12, 26);
  head.sweep(
    0xe1d2a9,
    [
      [0.12, 3.367, 0, 0.003, 0.017],
      [0.202, 3.436, 0, 0.005, 0.019],
      [0.337, 3.463, 0, 0.005, 0.02],
      [0.49, 3.429, 0, 0.005, 0.019],
      [0.568, 3.371, 0, 0.005, 0.017],
    ],
    17,
    10,
  );
  return head;
}

function steeringWing(side) {
  const wing = new Sculpture();
  const feather = (tint, samples, steps = 20) =>
    wing.sweep(
      tint,
      samples.map(([x, y, z, h, w]) => [x, y, z * side, h, w]),
      steps,
      16,
    );
  feather(0xe3e4d7, [
    [-0.68, 2.27, 0.27, 0.037, 0.03],
    [-0.48, 2.29, 0.322, 0.159, 0.079],
    [-0.23, 2.2, 0.366, 0.184, 0.091],
    [0.013, 2.057, 0.383, 0.133, 0.074],
    [0.2, 1.979, 0.369, 0.078, 0.06],
    [0.28, 1.962, 0.355, 0.03, 0.038],
  ]);
  for (let i = 0; i < 3; i++) {
    const offset = i * 0.041;
    feather([0x7d8e8a, 0xacb7ac, 0xd6d9cb][i], [
      [0.008, 2.029 + offset, 0.351, 0.041, 0.027],
      [0.225, 1.943 + offset * 0.67, 0.355 + offset * 0.14, 0.063, 0.042],
      [0.473, 1.909 + offset * 0.48, 0.321 + offset * 0.13, 0.05, 0.033],
      [0.692 + offset * 0.4, 1.891 + offset * 0.13, 0.269 + offset * 0.12, 0.035, 0.027],
      [0.78 + offset * 0.35, 1.846 - offset * 0.2, 0.249 + offset * 0.29, 0.01, 0.015],
    ]);
  }
  // 大覆羽收成长片，小覆羽层层压住根部；翼腕至握把保留修长的初级飞羽。
  wing.featherRelief(
    [
      [-0.49, 2.27, -0.28, 2.115, -0.034, 1.985, 0.052, 0xb6beb2],
      [-0.41, 2.3, -0.17, 2.12, 0.066, 1.976, 0.052, 0xc6ccbe],
      [-0.31, 2.28, -0.08, 2.1, 0.167, 1.97, 0.05, 0xd0d4c6],
      [-0.58, 2.31, -0.465, 2.264, -0.34, 2.14, 0.058, 0xd3d7c8],
      [-0.48, 2.34, -0.352, 2.268, -0.225, 2.132, 0.058, 0xe4e4d6],
      [-0.375, 2.319, -0.236, 2.223, -0.119, 2.098, 0.054, 0xd9ddcf],
      [-0.257, 2.277, -0.112, 2.172, 0.005, 2.065, 0.045, 0xe8e7d9],
    ],
    [side],
  );
  return wing;
}

function addScarf(body) {
  const collar = new Sculpture();
  const band = new THREE.TorusGeometry(0.2, 0.064, 12, 36);
  band
    .rotateX(Math.PI / 2)
    .scale(1.13, 0.98, 0.98)
    .rotateZ(0.19)
    .translate(0.1, 2.62, 0);
  collar.add(band, vermilion);
  collar.oval(0xa93424, [-0.099, 2.627, 0.118], [0.095, 0.073, 0.07], -0.18);
  collar.mesh(body, '朱红色颈巾');
  const ends = [];
  for (let i = 0; i < 2; i++) {
    const fabric = new Sculpture(),
      shorter = i * 0.155;
    const pts = [
      [0, 0, 0, 0.042, 0.024],
      [-0.18, 0.011 - i * 0.052, 0.017 + i * 0.017, 0.064, 0.028],
      [-0.39 + shorter * 0.35, 0.1 - i * 0.085, 0.039, 0.057, 0.023],
      [-0.59 + shorter, 0.079 - i * 0.099, 0.019, 0.044, 0.018],
      [-0.77 + shorter, 0.155 - i * 0.145, -0.022 + i * 0.044, 0.002, 0.004],
    ];
    fabric.sweep(i ? 0xae3827 : vermilion, pts, 20, 12);
    const tip = fabric.mesh(body, '随风摆动的巾尾');
    tip.position.set(-0.12, 2.64, 0.11);
    ends.push(tip);
  }
  return ends;
}

function legSegment(upper) {
  const shape = new Sculpture();
  if (upper) {
    shape.sweep(
      0xd69850,
      [
        [0, 0, 0, 0.052, 0.052],
        [0, 0.23, 0, 0.05, 0.046],
        [0.013, 0.72, 0, 0.034, 0.031],
        [0, 1, 0, 0.038, 0.034],
      ],
      12,
      14,
    );
    shape.sweep(
      0xe9dfbf,
      [
        [0, -0.03, 0, 0.068, 0.064],
        [0.003, 0.135, 0, 0.08, 0.073],
        [0.005, 0.28, 0, 0.061, 0.054],
        [0.008, 0.39, 0, 0.033, 0.03],
      ],
      12,
      16,
    );
  } else {
    shape.sweep(
      gold,
      [
        [0, 0, 0, 0.046, 0.04],
        [0, 0.11, 0, 0.047, 0.041],
        [-0.008, 0.42, 0, 0.032, 0.028],
        [0, 0.83, 0, 0.029, 0.027],
        [0, 1.0, 0, 0.035, 0.031],
      ],
      12,
      14,
    );
    for (let i = 0; i < 4; i++) {
      const y = 0.19 + i * 0.135;
      const radius = 0.039 - i * 0.0023;
      shape.oval(0xc7813c, [-0.005, y, 0], [radius, 0.012, radius * 0.88], 0, 12);
    }
  }
  return shape;
}

function webbedFoot() {
  const foot = new Sculpture();
  const pos = [],
    idx = [];
  const rim = [
    [-0.105, 0.02, 0],
    [-0.05, 0.034, -0.035],
    [0.105, 0.004, -0.111],
    [0.107, 0.016, -0.064],
    [0.183, 0.002, -0.012],
    [0.119, 0.016, 0.038],
    [0.151, 0.002, 0.082],
    [0.03, 0.026, 0.06],
    [-0.054, 0.028, 0.034],
  ];
  pos.push(0.025, 0.049, 0);
  for (const [x, y, z] of rim) pos.push(x, y + 0.009, z);
  // 掌球压在距踏心 30 毫米的横纹上，趾尖自然探出踏板。
  pos.push(0.03, 0, 0);
  for (const p of rim) pos.push(...p);
  const lower = rim.length + 1;
  for (let i = 0; i < rim.length; i++) {
    const a = i + 1,
      b = ((i + 1) % rim.length) + 1;
    idx.push(0, b, a, lower, lower + a, lower + b, a, b, lower + b, a, lower + b, lower + a);
  }
  const membrane = new THREE.BufferGeometry();
  membrane.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  membrane.setIndex(idx);
  membrane.computeVertexNormals();
  foot.add(membrane, 0xee9b3d);
  foot.oval(gold, [-0.071, 0.077, 0], [0.043, 0.057, 0.043], 0.27);
  for (const [x, z] of [
    [0.105, -0.111],
    [0.183, -0.012],
    [0.151, 0.082],
  ]) {
    foot.sweep(
      0xe39035,
      [
        [-0.071, 0.079, 0, 0.029, 0.021],
        [0.009, 0.054, z * 0.21, 0.024, 0.019],
        [x * 0.69, 0.033, z * 0.77, 0.013, 0.013],
        [x, 0.008, z, 0.004, 0.004],
      ],
      10,
      9,
    );
  }
  return foot;
}

function orientBone(bone, start, end, direction) {
  direction.subVectors(end, start);
  bone.position.copy(start);
  bone.scale.y = direction.length();
  bone.quaternion.setFromUnitVectors(axisY, direction.normalize());
}

export function createPelican() {
  const group = new THREE.Group();
  group.name = '鹈鹕骑手';
  const body = new THREE.Group();
  group.add(body);
  bodySculpture().mesh(body, '躯干、覆羽及初级飞羽');
  const pivot = new THREE.Group();
  pivot.position.set(0.105, 2.59, 0);
  body.add(pivot);
  const head = neckAndHead().mesh(pivot, '长颈、喙及骑行帽');
  head.position.copy(pivot.position).multiplyScalar(-1);
  const scarf = addScarf(body);

  const legs = [],
    wings = [],
    direction = new THREE.Vector3();
  for (const side of [1, -1]) {
    const grip = new THREE.Group();
    grip.position.set(0.78, 1.84, side * 0.25);
    group.add(grip);
    const wing = steeringWing(side).mesh(grip, '伸向把手的翅膀');
    wing.position.copy(grip.position).multiplyScalar(-1);
    wings.push(grip);

    const feathers = new Sculpture();
    feathers.sweep(
      ivory,
      [
        [-0.37, 1.94, side * 0.183, 0.091, 0.11],
        [-0.284, 1.78, side * 0.21, 0.124, 0.122],
        [-0.199, 1.652, side * 0.232, 0.096, 0.088],
        [-0.157, 1.561, side * 0.235, 0.054, 0.056],
      ],
      15,
      16,
    );
    feathers.mesh(body, '大腿覆羽');
    const foot = webbedFoot().mesh(group, '蹼足');
    const upper = legSegment(true).mesh(group, '胫跗骨');
    const lower = legSegment(false).mesh(group, '跗跖骨');
    legs.push({
      side,
      foot,
      upper,
      lower,
      knee: new THREE.Vector3(),
      hock: new THREE.Vector3(),
      ankle: new THREE.Vector3(),
    });
  }

  function update(phase) {
    const sway = Math.cos(phase),
      bounce = Math.cos(2 * phase - 0.4);
    body.position.set(0.009 * Math.sin(phase * 2), 0.021 * bounce, 0.017 * sway);
    body.rotation.x = 0.007 * sway;
    pivot.rotation.z = 0.018 * Math.sin(phase * 2 - 0.38);
    pivot.rotation.y = 0.014 * Math.sin(phase);
    for (let i = 0; i < 2; i++) {
      const { side, foot, upper, lower, knee, hock, ankle } = legs[i];
      const limbPhase = phase + i * Math.PI;
      scarf[i].rotation.z = 0.043 * Math.sin(phase * 2 - i * 0.75);
      scarf[i].rotation.y = 0.024 * Math.cos(phase * 2 - i);
      // 翅膀的转轴在握把，肩部随身体起伏，翼尖始终在车把上。
      wings[i].rotation.z = -body.position.y / 1.25;
      wings[i].rotation.y = body.position.z / 1.25;
      // 两侧曲柄相差半圈，蹼的掌面保持水平。鸟的跗关节向后折。
      foot.position.set(
        -0.1 + 0.24 * Math.cos(limbPhase),
        0.725 - 0.24 * Math.sin(limbPhase),
        side * 0.235,
      );
      ankle.copy(foot.position);
      ankle.x -= 0.071;
      ankle.y += 0.077;
      knee.set(
        -0.157 + body.position.x,
        1.561 + body.position.y,
        side * 0.235 + body.position.z + side * 0.002,
      );
      const dx = ankle.x - knee.x,
        dy = ankle.y - knee.y,
        dz = ankle.z - knee.z;
      const distance = Math.hypot(dx, dy, dz);
      const proximal = 0.581,
        distal = 0.565;
      const reach = (proximal ** 2 - distal ** 2 + distance ** 2) / (2 * distance);
      const bend = Math.sqrt(Math.max(0, proximal ** 2 - reach ** 2));
      const sagittal = Math.hypot(dx, dy);
      hock.set(
        knee.x + (dx * reach) / distance + (dy * bend) / sagittal,
        knee.y + (dy * reach) / distance - (dx * bend) / sagittal,
        knee.z + (dz * reach) / distance,
      );
      orientBone(upper, knee, hock, direction);
      orientBone(lower, hock, ankle, direction);
    }
  }
  update(0);
  return { group, update };
}
